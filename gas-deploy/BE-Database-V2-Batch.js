// ==========================================
// DATABASE SPK V2 - MIGRASI BATCH AMAN
// ==========================================
// Migrasi bersifat append-only. ID yang sudah ada harus identik; bila berbeda,
// seluruh batch dibatalkan sebelum penulisan. Rollback hanya menghapus baris
// bertanda sumber milik batch terakhir.

const DB_V2_BATCH_SIZE = 25;
const DB_V2_BATCH_MAX_SIZE = 100;
const DB_V2_BATCH_CONFIRM = 'MIGRATE_DATABASE_V2';
const DB_V2_ROLLBACK_CONFIRM = 'ROLLBACK_DATABASE_V2_LAST_BATCH';
const DB_V2_CHECKPOINT_PROPERTY = 'database-spk-v2-migration-checkpoint';
const DB_V2_AUDIT_SHEET = 'Migrasi SPK V2';
const DB_V2_DETAIL_SCHEMA_KEYS = [
  'routing', 'material', 'color', 'delivery', 'eta', 'accessory', 'tracking'
];

function previewDatabaseV2NextBatch() {
  const report = runDatabaseV2Batch_({ dryRun: true, batchSize: DB_V2_BATCH_SIZE });
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function migrateDatabaseV2Batch(options) {
  const settings = options && typeof options === 'object' ? options : {};
  if (settings.confirm !== DB_V2_BATCH_CONFIRM) {
    throw new Error('Konfirmasi migrasi tidak valid. Jalankan pratinjau lebih dulu.');
  }
  settings.dryRun = false;
  return runDatabaseV2Batch_(settings);
}

// Pemilihan fungsi ini secara manual di editor Apps Script merupakan tindakan
// konfirmasi. Satu eksekusi hanya memproses maksimal 25 baris sumber.
function adminMigrateDatabaseV2NextBatch() {
  const report = migrateDatabaseV2Batch({
    confirm: DB_V2_BATCH_CONFIRM,
    batchSize: DB_V2_BATCH_SIZE
  });
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function getDatabaseV2MigrationStatus() {
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sourceSheet = getDbSheetReadOnly_();
  const checkpoint = readDatabaseV2Checkpoint_();
  const lastSourceRow = sourceSheet.getLastRow();
  return {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    sourceSheet: sourceSheet.getName(),
    firstDataRow: DB_DATA_START_ROW,
    lastSourceRow: lastSourceRow,
    nextSourceRow: checkpoint.nextSourceRow,
    remainingRows: Math.max(0, lastSourceRow - checkpoint.nextSourceRow + 1),
    batchesCompleted: checkpoint.batchesCompleted,
    complete: checkpoint.nextSourceRow > lastSourceRow,
    lastBatch: checkpoint.lastBatch,
    auditSheetExists: Boolean(spreadsheet.getSheetByName(DB_V2_AUDIT_SHEET)),
    writesPerformed: 0
  };
}

function runDatabaseV2Batch_(options) {
  const settings = options && typeof options === 'object' ? options : {};
  const dryRun = settings.dryRun !== false;
  const batchSize = Math.max(1, Math.min(
    Number(settings.batchSize) || DB_V2_BATCH_SIZE,
    DB_V2_BATCH_MAX_SIZE
  ));
  const lock = dryRun ? null : LockService.getScriptLock();
  if (lock && !lock.tryLock(30000)) throw new Error('Migrasi lain sedang berjalan.');

  try {
    const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const sourceSheet = getDbSheetReadOnly_();
    const checkpoint = readDatabaseV2Checkpoint_();
    const requestedStart = Number(settings.startRow) || checkpoint.nextSourceRow;
    if (!dryRun && requestedStart !== checkpoint.nextSourceRow) {
      throw new Error('Migrasi tulis harus dimulai dari checkpoint baris ' + checkpoint.nextSourceRow + '.');
    }
    const startRow = Math.max(DB_DATA_START_ROW, requestedStart);
    const lastSourceRow = sourceSheet.getLastRow();
    if (startRow > lastSourceRow) {
      return {
        mode: dryRun ? 'PREVIEW_READ_ONLY' : 'COMMIT_APPEND_ONLY',
        complete: true,
        sourceStartRow: startRow,
        sourceEndRow: lastSourceRow,
        writesPerformed: 0,
        message: 'Seluruh baris sumber sudah diproses.'
      };
    }

    const endRow = Math.min(lastSourceRow, startRow + batchSize - 1);
    const batchId = databaseV2BatchId_(startRow, endRow);
    const sourceTag = DB_V2_MIGRATION_SOURCE + '|' + batchId;
    const width = Math.min(sourceSheet.getMaxColumns(), Math.max(DB_COL.UOM_AKSESORIS, 150));
    const sourceRows = sourceSheet.getRange(startRow, 1, endRow - startRow + 1, width).getValues();
    const candidates = createDatabaseV2CandidateBuckets_();
    const warnings = [];
    let sourceSpkRows = 0;

    sourceRows.forEach(function(row, index) {
      while (row.length < 150) row.push('');
      const spk = normalizeDatabaseV2Key_(row[DB_COL.SPK - 1]);
      if (!spk) {
        if (row.some(function(value) { return String(value || '').trim() !== ''; })) {
          warnings.push('Baris ' + (startRow + index) + ' dilewati karena SPK kosong.');
        }
        return;
      }
      sourceSpkRows++;
      buildDatabaseV2CandidatesForRow_(row, startRow + index, spk, candidates, warnings);
    });

    const plans = DB_V2_DETAIL_SCHEMA_KEYS.map(function(schemaKey) {
      return planDatabaseV2Append_(
        spreadsheet,
        DB_V2_SCHEMA[schemaKey],
        candidates[schemaKey],
        sourceTag
      );
    });
    const conflicts = plans.reduce(function(all, plan) {
      return all.concat(plan.conflicts.map(function(conflict) {
        return plan.sheet + ': ' + conflict;
      }));
    }, []);
    const report = {
      schemaVersion: DB_V2_SCHEMA_VERSION,
      mode: dryRun ? 'PREVIEW_READ_ONLY' : 'COMMIT_APPEND_ONLY',
      batchId: batchId,
      sourceTag: sourceTag,
      sourceSheet: sourceSheet.getName(),
      sourceStartRow: startRow,
      sourceEndRow: endRow,
      sourceRowsChecked: sourceRows.length,
      sourceSpkRows: sourceSpkRows,
      targets: plans.map(function(plan) {
        return {
          sheet: plan.sheet,
          candidates: plan.candidates,
          inserts: plan.inserts.length,
          unchanged: plan.unchanged,
          conflicts: plan.conflicts
        };
      }),
      conflicts: conflicts,
      warnings: warnings,
      writesPerformed: 0,
      complete: false
    };
    report.summary = report.targets.reduce(function(summary, target) {
      summary.candidates += target.candidates;
      summary.inserts += target.inserts;
      summary.unchanged += target.unchanged;
      summary.conflicts += target.conflicts.length;
      return summary;
    }, { candidates: 0, inserts: 0, unchanged: 0, conflicts: 0 });

    if (conflicts.length) {
      report.readyToCommit = false;
      if (!dryRun) throw new Error('Batch dibatalkan karena konflik:\n' + conflicts.slice(0, 20).join('\n'));
      return report;
    }
    report.readyToCommit = true;
    if (dryRun) return report;

    plans.forEach(appendDatabaseV2Plan_);
    SpreadsheetApp.flush();
    const previousNextRow = checkpoint.nextSourceRow;
    const finishedAt = new Date().toISOString();
    const nextCheckpoint = {
      version: DB_V2_SCHEMA_VERSION,
      nextSourceRow: endRow + 1,
      batchesCompleted: checkpoint.batchesCompleted + 1,
      updatedAt: finishedAt,
      lastBatch: {
        id: batchId,
        sourceTag: sourceTag,
        sourceStartRow: startRow,
        sourceEndRow: endRow,
        previousNextRow: previousNextRow,
        insertedRows: report.summary.inserts,
        finishedAt: finishedAt
      }
    };
    writeDatabaseV2Checkpoint_(nextCheckpoint);
    appendDatabaseV2Audit_(spreadsheet, report, 'COMMITTED', 'Batch append-only berhasil.');
    report.writesPerformed = report.summary.inserts;
    report.nextSourceRow = nextCheckpoint.nextSourceRow;
    report.complete = nextCheckpoint.nextSourceRow > lastSourceRow;
    return report;
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function planDatabaseV2Append_(spreadsheet, schema, records, sourceTag) {
  const sheet = spreadsheet.getSheetByName(schema.sheet);
  if (!sheet) throw new Error('Sheet target tidak ditemukan: ' + schema.sheet);
  const header = findDatabaseV2Header_(sheet, schema.fields);
  if (!header.row) throw new Error('Header tidak dikenali pada ' + schema.sheet + '.');
  const missing = schema.fields.filter(function(field) {
    return !findDatabaseV2HeaderIndex_(header.index, field);
  });
  if (missing.length) {
    throw new Error('Header ' + schema.sheet + ' belum lengkap: ' +
      missing.map(function(field) { return field[0]; }).join(', '));
  }

  const fields = schema.fields.map(function(field) { return field[0]; });
  const keyField = schema.key;
  const keyColumn = findDatabaseV2HeaderIndex_(header.index, [keyField]);
  const physicalRows = Math.max(0, sheet.getLastRow() - header.row);
  const existingValues = physicalRows
    ? sheet.getRange(header.row + 1, 1, physicalRows, sheet.getLastColumn()).getValues()
    : [];
  const existing = {};
  existingValues.forEach(function(row) {
    const key = normalizeDatabaseV2Key_(row[keyColumn - 1]);
    if (!key || existing[key]) return;
    const record = {};
    schema.fields.forEach(function(field) {
      const column = findDatabaseV2HeaderIndex_(header.index, field);
      record[field[0]] = row[column - 1];
    });
    existing[key] = record;
  });

  const seen = {};
  const inserts = [];
  const conflicts = [];
  let unchanged = 0;
  records.forEach(function(sourceRecord) {
    const record = Object.assign({}, sourceRecord);
    if (Object.prototype.hasOwnProperty.call(record, 'Sumber')) record.Sumber = sourceTag;
    const key = normalizeDatabaseV2Key_(record[keyField]);
    if (!key) {
      conflicts.push('kandidat tanpa ' + keyField);
      return;
    }
    if (seen[key]) {
      conflicts.push('kunci kandidat duplikat ' + key);
      return;
    }
    seen[key] = true;
    if (existing[key]) {
      const changed = diffDatabaseV2Records_(schema, existing[key], record);
      if (changed.length) conflicts.push(key + ' berbeda pada ' + changed.join(', '));
      else unchanged++;
      return;
    }
    inserts.push(fields.map(function(fieldName) {
      return databaseV2BatchStorageValue_(fieldName, record[fieldName]);
    }));
  });
  return {
    sheet: schema.sheet,
    sheetObject: sheet,
    headerRow: header.row,
    fields: fields,
    candidates: records.length,
    inserts: inserts,
    unchanged: unchanged,
    conflicts: uniqueDatabaseV2Values_(conflicts)
  };
}

function appendDatabaseV2Plan_(plan) {
  if (!plan.inserts.length) return;
  const startRow = Math.max(plan.headerRow + 1, plan.sheetObject.getLastRow() + 1);
  const requiredLastRow = startRow + plan.inserts.length - 1;
  if (requiredLastRow > plan.sheetObject.getMaxRows()) {
    plan.sheetObject.insertRowsAfter(
      plan.sheetObject.getMaxRows(),
      requiredLastRow - plan.sheetObject.getMaxRows()
    );
  }
  const range = plan.sheetObject.getRange(startRow, 1, plan.inserts.length, plan.fields.length);
  range.setValues(plan.inserts);
  plan.fields.forEach(function(fieldName, index) {
    if (/TANGGAL|MULAI|SELESAI|WAKTU|DIBUAT|DIPERBARUI/i.test(fieldName)) {
      plan.sheetObject.getRange(startRow, index + 1, plan.inserts.length, 1)
        .setNumberFormat('dd/MM/yyyy');
    }
  });
}

function databaseV2BatchStorageValue_(fieldName, value) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (/TANGGAL|MULAI|SELESAI|WAKTU/i.test(fieldName) && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parts = text.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return value === null || value === undefined ? '' : value;
}

function previewDatabaseV2LastBatchRollback() {
  const report = planDatabaseV2LastBatchRollback_();
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function rollbackDatabaseV2LastBatch(options) {
  const settings = options && typeof options === 'object' ? options : {};
  if (settings.confirm !== DB_V2_ROLLBACK_CONFIRM) {
    throw new Error('Konfirmasi rollback tidak valid.');
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Migrasi lain sedang berjalan.');
  try {
    const report = planDatabaseV2LastBatchRollback_();
    if (!report.readyToRollback) throw new Error(report.message || 'Tidak ada batch yang dapat di-rollback.');
    report.targets.forEach(function(target) {
      const sheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID).getSheetByName(target.sheet);
      target.runsDescending.forEach(function(run) {
        sheet.deleteRows(run.startRow, run.count);
      });
    });
    SpreadsheetApp.flush();
    const checkpoint = readDatabaseV2Checkpoint_();
    const rolledBack = checkpoint.lastBatch;
    checkpoint.nextSourceRow = rolledBack.previousNextRow;
    checkpoint.batchesCompleted = Math.max(0, checkpoint.batchesCompleted - 1);
    checkpoint.updatedAt = new Date().toISOString();
    checkpoint.lastBatch = null;
    writeDatabaseV2Checkpoint_(checkpoint);
    const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    appendDatabaseV2Audit_(spreadsheet, report, 'ROLLED_BACK', 'Rollback batch terakhir berhasil.');
    report.mode = 'ROLLBACK_COMMITTED';
    report.rowsDeleted = report.summary.rowsMatched;
    report.writesPerformed = report.summary.rowsMatched;
    return report;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function adminRollbackDatabaseV2LastBatch() {
  const report = rollbackDatabaseV2LastBatch({ confirm: DB_V2_ROLLBACK_CONFIRM });
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function planDatabaseV2LastBatchRollback_() {
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const checkpoint = readDatabaseV2Checkpoint_();
  const lastBatch = checkpoint.lastBatch;
  if (!lastBatch || !lastBatch.sourceTag) {
    return {
      mode: 'ROLLBACK_PREVIEW_READ_ONLY',
      readyToRollback: false,
      writesPerformed: 0,
      message: 'Belum ada batch terakhir pada checkpoint.'
    };
  }
  const targets = DB_V2_DETAIL_SCHEMA_KEYS.map(function(schemaKey) {
    const schema = DB_V2_SCHEMA[schemaKey];
    const sheet = spreadsheet.getSheetByName(schema.sheet);
    const header = findDatabaseV2Header_(sheet, schema.fields);
    const sourceColumn = findDatabaseV2HeaderIndex_(header.index, ['Sumber']);
    const physicalRows = Math.max(0, sheet.getLastRow() - header.row);
    const rows = physicalRows
      ? sheet.getRange(header.row + 1, sourceColumn, physicalRows, 1).getDisplayValues()
      : [];
    const matchedRows = [];
    rows.forEach(function(row, index) {
      if (String(row[0] || '').trim() === lastBatch.sourceTag) {
        matchedRows.push(header.row + 1 + index);
      }
    });
    return {
      sheet: schema.sheet,
      rowsMatched: matchedRows.length,
      runsDescending: groupDatabaseV2RowsForDelete_(matchedRows)
    };
  });
  const rowsMatched = targets.reduce(function(sum, target) { return sum + target.rowsMatched; }, 0);
  return {
    mode: 'ROLLBACK_PREVIEW_READ_ONLY',
    readyToRollback: rowsMatched > 0,
    batchId: lastBatch.id,
    sourceTag: lastBatch.sourceTag,
    sourceStartRow: lastBatch.sourceStartRow,
    sourceEndRow: lastBatch.sourceEndRow,
    targets: targets,
    summary: { rowsMatched: rowsMatched },
    writesPerformed: 0,
    message: rowsMatched ? '' : 'Tidak ada baris dengan tag batch terakhir.'
  };
}

function groupDatabaseV2RowsForDelete_(rows) {
  const sorted = rows.slice().sort(function(a, b) { return a - b; });
  const runs = [];
  sorted.forEach(function(rowNumber) {
    const current = runs[runs.length - 1];
    if (current && current.startRow + current.count === rowNumber) current.count++;
    else runs.push({ startRow: rowNumber, count: 1 });
  });
  return runs.reverse();
}

function readDatabaseV2Checkpoint_() {
  const raw = PropertiesService.getScriptProperties().getProperty(DB_V2_CHECKPOINT_PROPERTY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Number(parsed.nextSourceRow) >= DB_DATA_START_ROW) {
        return {
          version: parsed.version || DB_V2_SCHEMA_VERSION,
          nextSourceRow: Number(parsed.nextSourceRow),
          batchesCompleted: Number(parsed.batchesCompleted) || 0,
          updatedAt: parsed.updatedAt || '',
          lastBatch: parsed.lastBatch || null
        };
      }
    } catch (error) {
      throw new Error('Checkpoint migrasi rusak: ' + error.message);
    }
  }
  return {
    version: DB_V2_SCHEMA_VERSION,
    nextSourceRow: DB_DATA_START_ROW,
    batchesCompleted: 0,
    updatedAt: '',
    lastBatch: null
  };
}

function writeDatabaseV2Checkpoint_(checkpoint) {
  PropertiesService.getScriptProperties().setProperty(
    DB_V2_CHECKPOINT_PROPERTY,
    JSON.stringify(checkpoint)
  );
}

function databaseV2BatchId_(startRow, endRow) {
  return 'V2-' + String(startRow).padStart(6, '0') + '-' + String(endRow).padStart(6, '0');
}

function appendDatabaseV2Audit_(spreadsheet, report, status, note) {
  let sheet = spreadsheet.getSheetByName(DB_V2_AUDIT_SHEET);
  const headers = [
    'Batch ID', 'Waktu', 'Baris Sumber Awal', 'Baris Sumber Akhir',
    'SPK Diproses', 'Kandidat', 'Insert', 'Unchanged', 'Konflik',
    'Status', 'Catatan'
  ];
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DB_V2_AUDIT_SHEET);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  const summary = report.summary || {};
  sheet.appendRow([
    report.batchId || '',
    new Date(),
    report.sourceStartRow || '',
    report.sourceEndRow || '',
    report.sourceSpkRows || '',
    summary.candidates || '',
    summary.inserts || summary.rowsMatched || '',
    summary.unchanged || '',
    summary.conflicts || '',
    status,
    note || ''
  ]);
  sheet.getRange(sheet.getLastRow(), 2).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}
