// ==========================================
// DATABASE SPK V2 - DUAL-WRITE TERKENDALI
// ==========================================
// Database SPK lama tetap menjadi sumber transaksi. Setelah penulisan lama
// selesai, seluruh turunan V2 untuk SPK tersebut dibangun ulang memakai ID
// deterministik. Kegagalan V2 tidak membatalkan simpan lama; SPK dimasukkan ke
// antrean perbaikan agar pengguna tidak terdorong mengirim transaksi ulang.

const DB_V2_DUAL_WRITE_ENABLED_PROPERTY = 'database-spk-v2-dual-write-enabled';
const DB_V2_DUAL_WRITE_QUEUE_PROPERTY = 'database-spk-v2-dual-write-repair-queue';
const DB_V2_DUAL_WRITE_SOURCE = 'DUAL-WRITE DATABASE SPK';
const DB_V2_DUAL_WRITE_AUDIT_SHEET = 'Dual Write SPK V2';
const DB_V2_DUAL_WRITE_QUEUE_LIMIT = 100;
const DB_V2_DUAL_WRITE_REPAIR_LIMIT = 10;

function getDatabaseV2DualWriteStatus() {
  const properties = PropertiesService.getScriptProperties();
  const queue = readDatabaseV2DualWriteQueue_();
  return {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    enabled: properties.getProperty(DB_V2_DUAL_WRITE_ENABLED_PROPERTY) === 'true',
    queuedRepairs: queue.length,
    queue: queue.slice(0, 20),
    checkedAt: new Date().toISOString()
  };
}

function adminPreviewDatabaseV2DualWriteLastSpk() {
  const sheet = getDbSheetReadOnly_();
  const rowNumber = getDatabaseLastSpkRowFast_(sheet);
  if (rowNumber < DB_DATA_START_ROW) throw new Error('Belum ada SPK untuk canary dual-write.');
  const report = syncDatabaseV2SourceRows_(sheet, [rowNumber], 'CANARY_PREVIEW', true);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function adminSyncDatabaseV2DualWriteLastSpk() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Database sedang dipakai proses lain.');
  try {
    const sheet = getDbSheetReadOnly_();
    const rowNumber = getDatabaseLastSpkRowFast_(sheet);
    if (rowNumber < DB_DATA_START_ROW) throw new Error('Belum ada SPK untuk canary dual-write.');
    const report = syncDatabaseV2SourceRows_(sheet, [rowNumber], 'CANARY_COMMIT', false);
    appendDatabaseV2DualWriteAudit_(report, 'COMMITTED');
    console.log(JSON.stringify(report, null, 2));
    return report;
  } finally {
    lock.releaseLock();
  }
}

function adminEnableDatabaseV2DualWrite() {
  const validation = validateDatabaseV2({ maxRows: 100000 });
  const migration = getDatabaseV2MigrationStatus();
  const queue = readDatabaseV2DualWriteQueue_();
  if (!validation.summary.readyForDualWrite) {
    throw new Error('Validator V2 belum lulus: ' + validation.errors.join(' | '));
  }
  if (!migration.complete) throw new Error('Migrasi penuh belum selesai.');
  if (queue.length) throw new Error('Masih ada ' + queue.length + ' antrean perbaikan dual-write.');
  PropertiesService.getScriptProperties().setProperty(DB_V2_DUAL_WRITE_ENABLED_PROPERTY, 'true');
  const status = getDatabaseV2DualWriteStatus();
  console.log(JSON.stringify(status, null, 2));
  return status;
}

function adminDisableDatabaseV2DualWrite() {
  PropertiesService.getScriptProperties().deleteProperty(DB_V2_DUAL_WRITE_ENABLED_PROPERTY);
  const status = getDatabaseV2DualWriteStatus();
  console.log(JSON.stringify(status, null, 2));
  return status;
}

function adminRepairDatabaseV2DualWriteQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Database sedang dipakai proses lain.');
  try {
    const queue = readDatabaseV2DualWriteQueue_();
    const pending = queue.slice(0, DB_V2_DUAL_WRITE_REPAIR_LIMIT);
    const remaining = queue.slice(pending.length);
    const sheet = getDbSheetReadOnly_();
    const repaired = [];
    const failed = [];

    pending.forEach(function(item) {
      try {
        let rowNumber = Number(item.rowNumber) || 0;
        if (!rowNumber || normalizeSpk_(sheet.getRange(rowNumber, DB_COL.SPK).getDisplayValue()) !== item.spk) {
          rowNumber = findSpkRowFast_(sheet, item.spk, 0);
        }
        if (!rowNumber) throw new Error('SPK tidak ditemukan pada Database lama.');
        const report = syncDatabaseV2SourceRows_(sheet, [rowNumber], 'REPAIR_QUEUE', false);
        appendDatabaseV2DualWriteAudit_(report, 'REPAIRED');
        repaired.push(item.spk);
      } catch (error) {
        item.attempts = (Number(item.attempts) || 0) + 1;
        item.lastError = String(error && error.message || error).slice(0, 500);
        item.lastAttemptAt = new Date().toISOString();
        failed.push(item);
      }
    });

    writeDatabaseV2DualWriteQueue_(failed.concat(remaining));
    const result = {
      mode: 'DUAL_WRITE_REPAIR',
      repaired: repaired,
      failed: failed.map(function(item) { return { spk: item.spk, error: item.lastError }; }),
      remaining: failed.length + remaining.length
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function syncDatabaseV2AfterLegacyWrite_(sheet, rowNumber, reason) {
  if (!isDatabaseV2DualWriteEnabled_()) return { enabled: false, status: 'DISABLED' };
  return syncDatabaseV2RowsAfterLegacyWrite_(sheet, [rowNumber], reason);
}

function syncDatabaseV2RowsAfterLegacyWrite_(sheet, rowNumbers, reason) {
  if (!isDatabaseV2DualWriteEnabled_()) return { enabled: false, status: 'DISABLED' };
  const lock = LockService.getScriptLock();
  let acquiredHere = false;
  try {
    if (!lock.hasLock()) {
      acquiredHere = lock.tryLock(30000);
      if (!acquiredHere) throw new Error('Dual-write menunggu transaksi Database terlalu lama.');
    }
    const report = syncDatabaseV2SourceRows_(sheet, rowNumbers, reason, false);
    removeDatabaseV2DualWriteQueueItems_(report.spks);
    appendDatabaseV2DualWriteAudit_(report, 'COMMITTED');
    return { enabled: true, status: 'COMMITTED', report: report };
  } catch (error) {
    const queued = queueDatabaseV2DualWriteRepair_(sheet, rowNumbers, reason, error);
    console.error('Dual-write V2 masuk antrean perbaikan: ' + String(error && error.stack || error));
    return {
      enabled: true,
      status: 'QUEUED_FOR_REPAIR',
      queuedSpks: queued,
      error: String(error && error.message || error)
    };
  } finally {
    if (acquiredHere && lock.hasLock()) lock.releaseLock();
  }
}

function isDatabaseV2DualWriteEnabled_() {
  return PropertiesService.getScriptProperties()
    .getProperty(DB_V2_DUAL_WRITE_ENABLED_PROPERTY) === 'true';
}

function syncDatabaseV2SourceRows_(sourceSheet, rowNumbers, reason, dryRun) {
  const numbers = uniqueDatabaseV2Values_((rowNumbers || []).map(Number).filter(function(value) {
    return value >= DB_DATA_START_ROW && value <= sourceSheet.getLastRow();
  })).sort(function(a, b) { return a - b; });
  if (!numbers.length) throw new Error('Tidak ada baris sumber yang valid untuk dual-write.');

  const width = Math.min(sourceSheet.getMaxColumns(), Math.max(DB_COL.UOM_AKSESORIS, 150));
  const candidates = createDatabaseV2CandidateBuckets_();
  const warnings = [];
  const spks = [];
  groupDatabaseV2RowsForRead_(numbers).forEach(function(run) {
    const rows = sourceSheet.getRange(run.startRow, 1, run.count, width).getValues();
    rows.forEach(function(row, index) {
      while (row.length < 150) row.push('');
      const spk = normalizeDatabaseV2Key_(row[DB_COL.SPK - 1]);
      if (!spk) return;
      spks.push(spk);
      buildDatabaseV2CandidatesForRow_(row, run.startRow + index, spk, candidates, warnings);
    });
  });
  const uniqueSpks = uniqueDatabaseV2Values_(spks);
  if (!uniqueSpks.length) throw new Error('Baris sumber tidak mempunyai SPK.');

  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const plans = Object.keys(DB_V2_SCHEMA).map(function(schemaKey) {
    return planDatabaseV2DualWriteTarget_(
      spreadsheet,
      schemaKey,
      DB_V2_SCHEMA[schemaKey],
      candidates[schemaKey],
      uniqueSpks
    );
  });
  const conflicts = plans.reduce(function(all, plan) {
    return all.concat(plan.conflicts.map(function(message) { return plan.sheet + ': ' + message; }));
  }, []);
  if (conflicts.length) throw new Error('Konflik dual-write: ' + conflicts.join(' | '));

  if (!dryRun) {
    plans.forEach(applyDatabaseV2DualWritePlan_);
    SpreadsheetApp.flush();
  }

  return {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    mode: dryRun ? 'DUAL_WRITE_PREVIEW' : 'DUAL_WRITE_COMMIT',
    reason: String(reason || 'LEGACY_WRITE'),
    spks: uniqueSpks,
    sourceRows: numbers,
    targets: plans.map(function(plan) {
      return {
        sheet: plan.sheet,
        inserts: plan.inserts.length,
        updates: plan.updates.length,
        deletes: plan.deletes.length,
        unchanged: plan.unchanged,
        preservedExternal: plan.preservedExternal,
        updateFields: uniqueDatabaseV2Values_(plan.updates.reduce(function(all, update) {
          return all.concat(update.changedFields || []);
        }, [])),
        conflicts: plan.conflicts
      };
    }),
    warnings: warnings,
    writesPerformed: dryRun ? 0 : plans.reduce(function(total, plan) {
      return total + plan.inserts.length + plan.updates.length + plan.deletes.length;
    }, 0),
    completedAt: new Date().toISOString()
  };
}

function planDatabaseV2DualWriteTarget_(spreadsheet, schemaKey, schema, candidates, managedSpks) {
  const sheet = spreadsheet.getSheetByName(schema.sheet);
  if (!sheet) throw new Error('Sheet target tidak ditemukan: ' + schema.sheet);
  const header = findDatabaseV2Header_(sheet, schema.fields);
  if (!header.row) throw new Error('Header tidak dikenali pada ' + schema.sheet + '.');
  const fields = schema.fields.map(function(field) { return field[0]; });
  const keyColumn = findDatabaseV2HeaderIndex_(header.index, [schema.key]);
  const spkColumn = findDatabaseV2HeaderIndex_(header.index, ['SPK']);
  const sourceColumn = findDatabaseV2HeaderIndex_(header.index, ['Sumber', 'Sumber Data']);
  const physicalRows = Math.max(0, sheet.getLastRow() - header.row);
  const spkSet = {};
  managedSpks.forEach(function(spk) { spkSet[spk] = true; });
  const candidateMap = {};
  const conflicts = [];
  candidates.forEach(function(record) {
    const key = normalizeDatabaseV2Key_(record[schema.key]);
    if (!key) conflicts.push('kandidat tanpa kunci');
    else if (candidateMap[key]) conflicts.push('kunci kandidat duplikat ' + key);
    else candidateMap[key] = Object.assign({}, record);
  });

  const rowMeta = [];
  const rowsToRead = [];
  const useTargetedLookup = physicalRows && managedSpks.length <= 5;
  if (useTargetedLookup) {
    const foundRows = {};
    const spkRange = sheet.getRange(header.row + 1, spkColumn, physicalRows, 1);
    managedSpks.forEach(function(spk) {
      spkRange.createTextFinder(spk)
        .matchEntireCell(true)
        .matchCase(false)
        .useRegularExpression(false)
        .findAll()
        .forEach(function(cell) { foundRows[cell.getRow()] = true; });
    });
    Object.keys(foundRows).map(Number).sort(function(a, b) { return a - b; }).forEach(function(rowNumber) {
      rowsToRead.push(rowNumber);
    });
  } else if (physicalRows) {
    const keys = sheet.getRange(header.row + 1, keyColumn, physicalRows, 1).getDisplayValues();
    const spkValues = keyColumn === spkColumn
      ? keys
      : sheet.getRange(header.row + 1, spkColumn, physicalRows, 1).getDisplayValues();
    const sourceValues = sourceColumn
      ? sheet.getRange(header.row + 1, sourceColumn, physicalRows, 1).getDisplayValues()
      : [];
    keys.forEach(function(row, index) {
      const key = normalizeDatabaseV2Key_(row[0]);
      const spk = normalizeDatabaseV2Key_(spkValues[index] && spkValues[index][0]);
      const source = sourceColumn ? String(sourceValues[index] && sourceValues[index][0] || '') : '';
      const rowNumber = header.row + 1 + index;
      const relevant = Boolean(spkSet[spk] || candidateMap[key]);
      rowMeta.push({ rowNumber: rowNumber, key: key, spk: spk, source: source, relevant: relevant });
      if (relevant) rowsToRead.push(rowNumber);
    });
  }

  const existing = {};
  groupDatabaseV2RowsForRead_(rowsToRead).forEach(function(run) {
    const rows = sheet.getRange(run.startRow, 1, run.count, sheet.getLastColumn()).getValues();
    rows.forEach(function(row, index) {
      const rowNumber = run.startRow + index;
      const key = normalizeDatabaseV2Key_(row[keyColumn - 1]);
      if (!key) return;
      if (useTargetedLookup) {
        rowMeta.push({
          rowNumber: rowNumber,
          key: key,
          spk: normalizeDatabaseV2Key_(row[spkColumn - 1]),
          source: sourceColumn ? String(row[sourceColumn - 1] || '') : '',
          relevant: true
        });
      }
      if (existing[key]) {
        conflicts.push('kunci target duplikat ' + key);
        return;
      }
      const record = {};
      schema.fields.forEach(function(field) {
        const column = findDatabaseV2HeaderIndex_(header.index, field);
        record[field[0]] = row[column - 1];
      });
      existing[key] = { rowNumber: rowNumber, record: record };
    });
  });

  const now = new Date();
  const sourceTag = DB_V2_DUAL_WRITE_SOURCE;
  const inserts = [];
  const updates = [];
  let unchanged = 0;
  Object.keys(candidateMap).forEach(function(key) {
    const record = candidateMap[key];
    if (Object.prototype.hasOwnProperty.call(record, 'Sumber')) record.Sumber = sourceTag;
    const match = existing[key];
    if (!match) {
      if (Object.prototype.hasOwnProperty.call(record, 'Dibuat')) record.Dibuat = now;
      if (Object.prototype.hasOwnProperty.call(record, 'Diperbarui')) record.Diperbarui = now;
      inserts.push(databaseV2DualWriteRow_(fields, record));
      return;
    }
    if (normalizeDatabaseV2Key_(match.record.SPK) !== normalizeDatabaseV2Key_(record.SPK)) {
      conflicts.push('kunci ' + key + ' dimiliki SPK lain');
      return;
    }
    if (sourceColumn && !isDatabaseV2ManagedSource_(match.record.Sumber)) {
      conflicts.push('kunci ' + key + ' dikelola sumber eksternal');
      return;
    }
    if (Object.prototype.hasOwnProperty.call(record, 'Dibuat')) record.Dibuat = match.record.Dibuat || '';
    if (Object.prototype.hasOwnProperty.call(record, 'Diperbarui')) record.Diperbarui = match.record.Diperbarui || '';
    const changed = diffDatabaseV2Records_(schema, match.record, record);
    if (!changed.length) {
      unchanged++;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(record, 'Diperbarui')) record.Diperbarui = now;
    updates.push({
      rowNumber: match.rowNumber,
      values: databaseV2DualWriteRow_(fields, record),
      changedFields: changed
    });
  });

  const deletes = [];
  let preservedExternal = 0;
  rowMeta.forEach(function(meta) {
    if (!spkSet[meta.spk] || candidateMap[meta.key]) return;
    if (schemaKey === 'master' || isDatabaseV2ManagedSource_(meta.source)) deletes.push(meta.rowNumber);
    else preservedExternal++;
  });

  return {
    sheet: schema.sheet,
    sheetObject: sheet,
    headerRow: header.row,
    fields: fields,
    inserts: inserts,
    updates: updates,
    deletes: uniqueDatabaseV2Values_(deletes).sort(function(a, b) { return b - a; }),
    unchanged: unchanged,
    preservedExternal: preservedExternal,
    conflicts: uniqueDatabaseV2Values_(conflicts)
  };
}

function databaseV2DualWriteRow_(fields, record) {
  return fields.map(function(fieldName) {
    return databaseV2BatchStorageValue_(fieldName, record[fieldName]);
  });
}

function applyDatabaseV2DualWritePlan_(plan) {
  plan.updates.forEach(function(update) {
    plan.sheetObject.getRange(update.rowNumber, 1, 1, plan.fields.length).setValues([update.values]);
  });
  if (plan.inserts.length) {
    appendDatabaseV2Plan_({
      sheetObject: plan.sheetObject,
      headerRow: plan.headerRow,
      fields: plan.fields,
      inserts: plan.inserts
    });
  }
  plan.deletes.forEach(function(rowNumber) {
    plan.sheetObject.deleteRow(rowNumber);
  });
}

function isDatabaseV2ManagedSource_(value) {
  const source = String(value || '').trim();
  return source.indexOf(DB_V2_MIGRATION_SOURCE) === 0 || source.indexOf(DB_V2_DUAL_WRITE_SOURCE) === 0;
}

function readDatabaseV2DualWriteQueue_() {
  const raw = PropertiesService.getScriptProperties().getProperty(DB_V2_DUAL_WRITE_QUEUE_PROPERTY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeDatabaseV2DualWriteQueue_(items) {
  const properties = PropertiesService.getScriptProperties();
  const safe = (items || []).slice(0, DB_V2_DUAL_WRITE_QUEUE_LIMIT);
  if (!safe.length) properties.deleteProperty(DB_V2_DUAL_WRITE_QUEUE_PROPERTY);
  else properties.setProperty(DB_V2_DUAL_WRITE_QUEUE_PROPERTY, JSON.stringify(safe));
}

function queueDatabaseV2DualWriteRepair_(sheet, rowNumbers, reason, error) {
  const queue = readDatabaseV2DualWriteQueue_();
  const bySpk = {};
  queue.forEach(function(item) { if (item && item.spk) bySpk[item.spk] = item; });
  const queued = [];
  (rowNumbers || []).forEach(function(rowNumber) {
    const row = Number(rowNumber) || 0;
    if (row < DB_DATA_START_ROW || row > sheet.getLastRow()) return;
    const spk = normalizeSpk_(sheet.getRange(row, DB_COL.SPK).getDisplayValue());
    if (!spk) return;
    const current = bySpk[spk] || { spk: spk, queuedAt: new Date().toISOString(), attempts: 0 };
    current.rowNumber = row;
    current.reason = String(reason || 'LEGACY_WRITE');
    current.lastError = String(error && error.message || error).slice(0, 500);
    current.lastAttemptAt = new Date().toISOString();
    bySpk[spk] = current;
    queued.push(spk);
  });
  writeDatabaseV2DualWriteQueue_(Object.keys(bySpk).map(function(spk) { return bySpk[spk]; }));
  return queued;
}

function removeDatabaseV2DualWriteQueueItems_(spks) {
  const remove = {};
  (spks || []).forEach(function(spk) { remove[spk] = true; });
  writeDatabaseV2DualWriteQueue_(readDatabaseV2DualWriteQueue_().filter(function(item) {
    return !remove[item.spk];
  }));
}

function appendDatabaseV2DualWriteAudit_(report, status) {
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(DB_V2_DUAL_WRITE_AUDIT_SHEET);
  const headers = ['Waktu', 'SPK', 'Alasan', 'Status', 'Insert', 'Update', 'Delete', 'Unchanged', 'Peringatan'];
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DB_V2_DUAL_WRITE_AUDIT_SHEET);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    formatDatabaseV2DualWriteAudit_(sheet);
    sheet.setFrozenRows(1);
  }
  const totals = report.targets.reduce(function(result, target) {
    result.insert += target.inserts;
    result.update += target.updates;
    result.remove += target.deletes;
    result.unchanged += target.unchanged;
    return result;
  }, { insert: 0, update: 0, remove: 0, unchanged: 0 });
  sheet.appendRow([
    new Date(),
    report.spks.join(', '),
    report.reason,
    status,
    totals.insert,
    totals.update,
    totals.remove,
    totals.unchanged,
    report.warnings.join(' | ')
  ]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

function formatDatabaseV2DualWriteAudit_(sheet) {
  [155, 110, 180, 110, 85, 85, 85, 95, 260].forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}
