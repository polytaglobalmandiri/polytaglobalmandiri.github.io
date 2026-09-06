// ==========================================
// DATABASE SPK V2 - NATIVE WRITER DAN AUDIT
// ==========================================
// Writer native memakai planner bersama untuk menambah/memperbarui delapan
// tabel, membaca balik hasil, dan mencatat audit transaksi.

const DB_V2_NATIVE_WRITE_SOURCE = 'APLIKASI NATIVE V2';
const DB_V2_WRITE_SOURCE = DB_V2_NATIVE_WRITE_SOURCE;
const DB_V2_HISTORICAL_RUNTIME_SOURCE = 'SPK RUNTIME V2';
const DB_V2_HISTORICAL_MIGRATION_SOURCE = 'MIGRASI DATABASE SPK';
const DB_V2_HISTORICAL_DUAL_WRITE_SOURCE = 'DUAL-WRITE DATABASE SPK';
const DB_V2_WRITE_AUDIT_SHEET = 'Native Write SPK V2';

function getDatabaseV2NativeWriteStatus() {
  return {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    mode: 'NATIVE_V2',
    helpersAvailable: typeof groupDatabaseV2RowsForRead_ === 'function' &&
      typeof appendDatabaseV2Plan_ === 'function' &&
      typeof databaseV2BatchStorageValue_ === 'function',
    enabled: false,
    queuedRepairs: 0,
    queue: [],
    checkedAt: new Date().toISOString()
  };
}

function groupDatabaseV2RowsForRead_(rows) {
  const runs = [];
  rows.forEach(function(rowNumber) {
    const current = runs[runs.length - 1];
    if (current && current.startRow + current.count === rowNumber) current.count++;
    else runs.push({ startRow: rowNumber, count: 1 });
  });
  return runs;
}

function planDatabaseV2NativeWriteTarget_(spreadsheet, schemaKey, schema, candidates, managedSpks) {
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
  fields.forEach(function(fieldName, index) {
    const column = findDatabaseV2HeaderIndex_(header.index, schema.fields[index]);
    if (column !== index + 1) {
      conflicts.push('urutan kolom tidak sesuai kontrak tulis pada ' + fieldName);
    }
  });
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
  const sourceTag = DB_V2_WRITE_SOURCE;
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
      inserts.push(databaseV2NativeWriteRow_(fields, record));
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
    const changed = diffDatabaseV2NativeRecords_(schema, match.record, record);
    if (!changed.length) {
      unchanged++;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(record, 'Diperbarui')) record.Diperbarui = now;
    updates.push({
      rowNumber: match.rowNumber,
      values: databaseV2NativeWriteRow_(fields, record),
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

function databaseV2NativeWriteRow_(fields, record) {
  return fields.map(function(fieldName) {
    return databaseV2BatchStorageValue_(fieldName, record[fieldName]);
  });
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

function applyDatabaseV2NativeWritePlan_(plan) {
  const expectedByRow = {};
  const updatesByRow = {};
  plan.updates.forEach(function(update) {
    updatesByRow[update.rowNumber] = update.values;
    expectedByRow[update.rowNumber] = update.values;
  });
  groupDatabaseV2RowsForRead_(Object.keys(updatesByRow).map(Number).sort(function(a, b) {
    return a - b;
  })).forEach(function(run) {
    const values = [];
    for (let rowNumber = run.startRow; rowNumber < run.startRow + run.count; rowNumber++) {
      values.push(updatesByRow[rowNumber]);
    }
    plan.sheetObject.getRange(run.startRow, 1, run.count, plan.fields.length).setValues(values);
  });
  if (plan.inserts.length) {
    const startRow = Math.max(plan.headerRow + 1, plan.sheetObject.getLastRow() + 1);
    appendDatabaseV2Plan_({
      sheetObject: plan.sheetObject,
      headerRow: plan.headerRow,
      fields: plan.fields,
      inserts: plan.inserts
    });
    plan.inserts.forEach(function(values, index) {
      expectedByRow[startRow + index] = values;
    });
  }
  verifyDatabaseV2NativeWriteRows_(plan, expectedByRow);
  const deletedKeys = plan.deletes.map(function(rowNumber) {
    return normalizeDatabaseV2Key_(plan.sheetObject.getRange(rowNumber, 1).getDisplayValue());
  }).filter(Boolean);
  plan.deletes.forEach(function(rowNumber) {
    plan.sheetObject.deleteRow(rowNumber);
  });
  if (deletedKeys.length) {
    const remaining = plan.sheetObject.getLastRow() > plan.headerRow
      ? plan.sheetObject
          .getRange(plan.headerRow + 1, 1, plan.sheetObject.getLastRow() - plan.headerRow, 1)
          .getDisplayValues()
          .reduce(function(index, row) {
            const key = normalizeDatabaseV2Key_(row[0]);
            if (key) index[key] = true;
            return index;
          }, {})
      : {};
    const undeleted = deletedKeys.filter(function(key) { return remaining[key]; });
    if (undeleted.length) {
      throw new Error('Verifikasi hapus gagal pada ' + plan.sheet + ': ' + undeleted.slice(0, 10).join(', '));
    }
  }
  plan.verifiedWrites = Object.keys(expectedByRow).length + deletedKeys.length;
}

function normalizeDatabaseV2WriteComparable_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0')
    ].join('-');
  }
  if (typeof value === 'number') return String(Math.round(value * 1000000000) / 1000000000);
  return String(value === null || value === undefined ? '' : value).trim();
}

function diffDatabaseV2NativeRecords_(schema, current, candidate) {
  const ignored = {
    'Dibuat': true,
    'Diperbarui': true,
    'Dibuat Pada': true,
    'Diperbarui Pada': true,
    'Mulai': true,
    'Selesai': true,
    'Waktu Mulai': true,
    'Waktu Selesai': true,
    'Waktu': true
  };
  return schema.fields.map(function(field) { return field[0]; }).filter(function(fieldName) {
    if (ignored[fieldName]) return false;
    return normalizeDatabaseV2WriteComparable_(current[fieldName]) !==
      normalizeDatabaseV2WriteComparable_(candidate[fieldName]);
  });
}

function verifyDatabaseV2NativeWriteRows_(plan, expectedByRow) {
  const rowNumbers = Object.keys(expectedByRow).map(Number).sort(function(a, b) { return a - b; });
  if (!rowNumbers.length) return;
  const ignored = {
    'Dibuat': true,
    'Diperbarui': true,
    'Dibuat Pada': true,
    'Diperbarui Pada': true,
    'Mulai': true,
    'Selesai': true,
    'Waktu Mulai': true,
    'Waktu Selesai': true,
    'Waktu': true
  };
  groupDatabaseV2RowsForRead_(rowNumbers).forEach(function(run) {
    const actualRows = plan.sheetObject
      .getRange(run.startRow, 1, run.count, plan.fields.length)
      .getValues();
    actualRows.forEach(function(actual, index) {
      const rowNumber = run.startRow + index;
      const expected = expectedByRow[rowNumber];
      plan.fields.forEach(function(fieldName, fieldIndex) {
        if (ignored[fieldName]) return;
        if (
          normalizeDatabaseV2WriteComparable_(actual[fieldIndex]) !==
          normalizeDatabaseV2WriteComparable_(expected[fieldIndex])
        ) {
          throw new Error(
            'Verifikasi tulis gagal pada ' + plan.sheet +
            ' baris ' + rowNumber + ', kolom ' + fieldName + '.'
          );
        }
      });
    });
  });
}

function isDatabaseV2ManagedSource_(value) {
  const source = String(value || '').trim();
  return source.indexOf(DB_V2_HISTORICAL_MIGRATION_SOURCE) === 0 ||
    source.indexOf(DB_V2_WRITE_SOURCE) === 0 ||
    source.indexOf(DB_V2_HISTORICAL_RUNTIME_SOURCE) === 0 ||
    source.indexOf(DB_V2_HISTORICAL_DUAL_WRITE_SOURCE) === 0;
}

function appendDatabaseV2WriteAudit_(report, status) {
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(DB_V2_WRITE_AUDIT_SHEET);
  const headers = ['Waktu', 'SPK', 'Alasan', 'Status', 'Insert', 'Update', 'Delete', 'Unchanged', 'Peringatan'];
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DB_V2_WRITE_AUDIT_SHEET);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    formatDatabaseV2WriteAudit_(sheet);
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

function formatDatabaseV2WriteAudit_(sheet) {
  [155, 110, 180, 110, 85, 85, 85, 95, 260].forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}
