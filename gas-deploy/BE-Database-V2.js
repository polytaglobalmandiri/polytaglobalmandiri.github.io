// ==========================================
// DATABASE SPK V2 - KONTRAK SKEMA & VALIDATOR
// ==========================================
// Modul ini mendefinisikan kontrak nama kolom dan validator integritas native.

const DB_V2_SCHEMA_VERSION = '2.0.0';
const DB_V2_DEFAULT_MAX_ROWS = 20000;

const DB_V2_SCHEMA = {
  master: {
    sheet: 'SPK Master',
    key: 'SPK',
    fields: [
      ['SPK'],
      ['Tanggal', 'Tanggal SPK'],
      ['Jenis Order'],
      ['Marketing'],
      ['Nomor PO', 'No PO', 'PO'],
      ['Customer', 'Pelanggan'],
      ['Artikel', 'Item'],
      ['Kode Item'],
      ['Material', 'Bahan Utama'],
      ['Film'],
      ['Model Kantong', 'Model'],
      ['Ukuran Blow'],
      ['Ukuran Jadi'],
      ['Jumlah Order', 'Qty Order'],
      ['UOM Order', 'Satuan Order'],
      ['Keluar Bahan'],
      ['UOM KB'],
      ['Toleransi Order', 'Toleransi'],
      ['ETD'],
      ['SPK Referensi', 'SPK Sebelumnya'],
      ['Release'],
      ['Tracking', 'Status Tracking'],
      ['Keterangan Artikel'],
      ['Keterangan Warna'],
      ['Keterangan Bahan'],
      ['Meter/Roll', 'Meter Roll'],
      ['Mode PCS/KG'],
      ['Jenis Potongan'],
      ['Tanggal PO Masuk', 'PO Masuk'],
      ['Stok'],
      ['OTS'],
      ['WIP'],
      ['Toleransi Produksi'],
      ['Lebar Jadi'],
      ['Panjang Jadi'],
      ['Tebal'],
      ['Lebar Bahan'],
      ['Density'],
      ['PCS/KG', 'PCS Per KG'],
      ['Meter/KG', 'Meter Per KG'],
      ['Total BS'],
      ['Total Komposisi KG'],
      ['Total Komposisi %'],
      ['Bahan Lebar'],
      ['Bahan Panjang'],
      ['Bahan Tebal'],
      ['Bahan Density'],
      ['Finishing'],
      ['Handle/Pon', 'Handle Pon']
    ]
  },
  routing: {
    sheet: 'SPK Routing',
    key: 'Routing ID',
    fields: [
      ['Routing ID', 'ID Routing', 'ID'],
      ['SPK'],
      ['Urutan', 'Sequence'],
      ['Kode Proses'],
      ['Nama Proses', 'Proses', 'Routing'],
      ['Mesin'],
      ['Ukuran / Parameter', 'Parameter', 'Detail'],
      ['Target BS %', 'Target BS', 'BS'],
      ['Keterangan', 'Catatan'],
      ['Status'],
      ['Mulai', 'Waktu Mulai'],
      ['Selesai', 'Waktu Selesai'],
      ['Operator'],
      ['Payload JSON'],
      ['Sumber', 'Sumber Data'],
      ['Dibuat', 'Dibuat Pada', 'Created At'],
      ['Diperbarui', 'Diperbarui Pada', 'Updated At']
    ]
  },
  material: {
    sheet: 'SPK Bahan',
    key: 'Bahan ID',
    fields: [
      ['Bahan ID', 'ID Bahan', 'ID'],
      ['SPK'],
      ['Urutan', 'Sequence'],
      ['Kode Bahan'],
      ['Nama Bahan', 'Bahan', 'Material'],
      ['KG', 'Kebutuhan KG', 'Jumlah KG'],
      ['Persentase', 'Komposisi Persen', 'Persen', 'Komposisi %'],
      ['Jenis'],
      ['Sumber', 'Sumber Data'],
      ['Dibuat', 'Dibuat Pada', 'Created At'],
      ['Diperbarui', 'Diperbarui Pada', 'Updated At']
    ]
  },
  color: {
    sheet: 'SPK Warna',
    key: 'Warna ID',
    fields: [
      ['Warna ID', 'ID Warna', 'ID'],
      ['SPK'],
      ['Urutan', 'Sequence'],
      ['Nama Warna', 'Warna'],
      ['Pemakaian'],
      ['UOM', 'Satuan'],
      ['Kode Silinder', 'Silinder'],
      ['Sumber', 'Sumber Data'],
      ['Dibuat', 'Dibuat Pada', 'Created At'],
      ['Diperbarui', 'Diperbarui Pada', 'Updated At']
    ]
  },
  delivery: {
    sheet: 'SPK Pengiriman',
    key: 'Pengiriman ID',
    fields: [
      ['Pengiriman ID', 'ID Pengiriman', 'ID'],
      ['SPK'],
      ['Urutan', 'Sequence'],
      ['Tanggal Kirim', 'Tanggal Rencana', 'Rencana', 'ETD'],
      ['Qty', 'Jumlah Rencana', 'Qty Rencana'],
      ['UOM', 'Satuan'],
      ['Status'],
      ['Keterangan', 'Catatan'],
      ['Sumber', 'Sumber Data'],
      ['Dibuat', 'Dibuat Pada', 'Created At'],
      ['Diperbarui', 'Diperbarui Pada', 'Updated At']
    ]
  },
  eta: {
    sheet: 'SPK ETA',
    key: 'ETA ID',
    fields: [
      ['ETA ID', 'ID ETA', 'ID'],
      ['SPK'],
      ['Urutan', 'Sequence'],
      ['Tanggal ETA', 'ETA'],
      ['Qty', 'Jumlah'],
      ['UOM', 'Satuan'],
      ['Status'],
      ['Keterangan', 'Catatan'],
      ['Sumber', 'Sumber Data'],
      ['Dibuat', 'Dibuat Pada', 'Created At'],
      ['Diperbarui', 'Diperbarui Pada', 'Updated At']
    ]
  },
  accessory: {
    sheet: 'SPK Aksesoris',
    key: 'Aksesoris ID',
    fields: [
      ['Aksesoris ID', 'ID Aksesoris', 'ID'],
      ['SPK'],
      ['Routing ID', 'ID Routing'],
      ['Urutan', 'Sequence'],
      ['Nama Aksesoris', 'Aksesoris'],
      ['Kebutuhan', 'Jumlah'],
      ['UOM', 'Satuan'],
      ['Status'],
      ['Sumber', 'Sumber Data'],
      ['Dibuat', 'Dibuat Pada', 'Created At'],
      ['Diperbarui', 'Diperbarui Pada', 'Updated At']
    ]
  },
  tracking: {
    sheet: 'SPK Tracking',
    key: 'Tracking ID',
    fields: [
      ['Tracking ID', 'ID Tracking', 'ID'],
      ['SPK'],
      ['Kode Status'],
      ['Nama Status', 'Status'],
      ['Routing ID', 'ID Routing'],
      ['Urutan Routing', 'Urutan', 'Sequence'],
      ['Waktu', 'Waktu Status', 'Tanggal Status', 'Timestamp'],
      ['Operator'],
      ['Sumber', 'Sumber Data'],
      ['Keterangan', 'Catatan']
    ]
  }
};

function getDatabaseV2Schema() {
  return JSON.parse(JSON.stringify({
    version: DB_V2_SCHEMA_VERSION,
    sheets: DB_V2_SCHEMA
  }));
}

function validateDatabaseV2(options) {
  const settings = options && typeof options === 'object' ? options : {};
  const maxRows = Math.max(1, Math.min(
    Number(settings.maxRows) || DB_V2_DEFAULT_MAX_ROWS,
    100000
  ));
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sourceSheet = spreadsheet.getSheetByName(DB_V2_SCHEMA.master.sheet);
  const sourceKeys = readDatabaseV2MasterKeys_(sourceSheet, maxRows);
  const report = {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    spreadsheetId: DB_SPREADSHEET_ID,
    checkedAt: new Date().toISOString(),
    mode: 'READ_ONLY',
    maxRows: maxRows,
    source: {
      sheet: sourceSheet ? sourceSheet.getName() : '',
      rows: sourceKeys.rows,
      uniqueSpk: sourceKeys.keys.size,
      duplicateSpk: sourceKeys.duplicates,
      truncated: sourceKeys.truncated
    },
    sheets: [],
    errors: [],
    warnings: []
  };

  if (!sourceSheet) {
    report.errors.push('SPK Master sebagai induk Database V2 tidak ditemukan.');
  }
  if (sourceKeys.duplicates.length) {
    report.errors.push('SPK Master memiliki SPK duplikat.');
  }
  if (sourceKeys.truncated) {
    report.warnings.push('Pemeriksaan SPK Master dibatasi sampai ' + maxRows + ' baris.');
  }

  Object.keys(DB_V2_SCHEMA).forEach(function(schemaKey) {
    const schema = DB_V2_SCHEMA[schemaKey];
    const sheetReport = validateDatabaseV2Sheet_(
      spreadsheet,
      schemaKey,
      schema,
      sourceKeys.keys,
      maxRows
    );
    report.sheets.push(sheetReport);
    sheetReport.errors.forEach(function(message) {
      report.errors.push(schema.sheet + ': ' + message);
    });
    sheetReport.warnings.forEach(function(message) {
      report.warnings.push(schema.sheet + ': ' + message);
    });
  });

  report.summary = {
    sheetsExpected: Object.keys(DB_V2_SCHEMA).length,
    sheetsFound: report.sheets.filter(function(item) { return item.exists; }).length,
    errors: report.errors.length,
    warnings: report.warnings.length,
    readyForNativeWrite: report.errors.length === 0,
    readyForNativeCutover: report.errors.length === 0,
    sourceAuthority: DB_V2_SCHEMA.master.sheet
  };
  return report;
}

function logDatabaseV2Validation() {
  const report = validateDatabaseV2();
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function logDatabaseV2FullValidation() {
  const report = validateDatabaseV2({ maxRows: 100000 });
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function validateDatabaseV2Sheet_(spreadsheet, schemaKey, schema, masterKeys, maxRows) {
  const sheet = spreadsheet.getSheetByName(schema.sheet);
  const result = {
    schemaKey: schemaKey,
    sheet: schema.sheet,
    exists: Boolean(sheet),
    headerRow: 0,
    rows: 0,
    rowsChecked: 0,
    truncated: false,
    missingHeaders: [],
    duplicateHeaders: [],
    duplicateKeys: [],
    blankKeys: [],
    orphanSpk: [],
    errors: [],
    warnings: []
  };
  if (!sheet) {
    result.errors.push('sheet tidak ditemukan');
    return result;
  }

  const header = findDatabaseV2Header_(sheet, schema.fields);
  result.headerRow = header.row;
  result.duplicateHeaders = header.duplicates;
  schema.fields.forEach(function(field) {
    if (!findDatabaseV2HeaderIndex_(header.index, field)) {
      result.missingHeaders.push(field[0]);
    }
  });
  if (!header.row) result.errors.push('baris header tidak dikenali');
  if (result.missingHeaders.length) {
    result.errors.push('header wajib belum lengkap: ' + result.missingHeaders.join(', '));
  }
  if (result.duplicateHeaders.length) {
    result.errors.push('header duplikat: ' + result.duplicateHeaders.join(', '));
  }
  if (!header.row || result.missingHeaders.length) return result;

  const physicalRows = Math.max(0, sheet.getLastRow() - header.row);
  const rowsToRead = Math.min(physicalRows, maxRows);
  result.rows = physicalRows;
  result.rowsChecked = rowsToRead;
  result.truncated = physicalRows > rowsToRead;
  if (result.truncated) {
    result.warnings.push('pemeriksaan dibatasi sampai ' + maxRows + ' baris');
  }
  if (!rowsToRead) {
    return result;
  }

  const keyField = schema.fields.filter(function(field) {
    return normalizeDatabaseV2Header_(field[0]) === normalizeDatabaseV2Header_(schema.key);
  })[0] || [schema.key];
  const keyColumn = findDatabaseV2HeaderIndex_(header.index, keyField);
  const spkColumn = findDatabaseV2HeaderIndex_(header.index, ['SPK']);
  const keyValues = sheet.getRange(header.row + 1, keyColumn, rowsToRead, 1).getDisplayValues();
  const spkValues = keyColumn === spkColumn
    ? keyValues
    : sheet.getRange(header.row + 1, spkColumn, rowsToRead, 1).getDisplayValues();
  const seenKeys = new Set();

  for (let index = 0; index < rowsToRead; index++) {
    const rowNumber = header.row + 1 + index;
    const key = normalizeDatabaseV2Key_(keyValues[index][0]);
    const spk = normalizeDatabaseV2Key_(spkValues[index][0]);
    if (!key && !spk) continue;
    if (!key) result.blankKeys.push(rowNumber);
    if (key && seenKeys.has(key)) result.duplicateKeys.push(key);
    if (key) seenKeys.add(key);
    if (!spk) result.blankKeys.push(rowNumber);
    if (spk && masterKeys.size && !masterKeys.has(spk)) result.orphanSpk.push(spk);
  }

  result.duplicateKeys = uniqueDatabaseV2Values_(result.duplicateKeys);
  result.blankKeys = uniqueDatabaseV2Values_(result.blankKeys);
  result.orphanSpk = uniqueDatabaseV2Values_(result.orphanSpk);
  if (result.duplicateKeys.length) result.errors.push('ID/kunci duplikat ditemukan');
  if (result.blankKeys.length) result.errors.push('ID atau SPK kosong ditemukan');
  if (result.orphanSpk.length) result.errors.push('SPK tanpa induk ditemukan');
  return result;
}

function readDatabaseV2MasterKeys_(sheet, maxRows) {
  const result = { rows: 0, keys: new Set(), duplicates: [], truncated: false };
  if (!sheet) return result;
  const header = findDatabaseV2Header_(sheet, DB_V2_SCHEMA.master.fields);
  const spkColumn = findDatabaseV2HeaderIndex_(header.index, ['SPK']);
  if (!header.row || !spkColumn) return result;
  const physicalRows = Math.max(0, sheet.getLastRow() - header.row);
  const rowsToRead = Math.min(physicalRows, maxRows);
  result.rows = physicalRows;
  result.truncated = physicalRows > rowsToRead;
  if (!rowsToRead) return result;
  sheet.getRange(header.row + 1, spkColumn, rowsToRead, 1).getDisplayValues().forEach(function(row) {
    const key = normalizeDatabaseV2Key_(row[0]);
    if (!key) return;
    if (result.keys.has(key)) result.duplicates.push(key);
    result.keys.add(key);
  });
  result.duplicates = uniqueDatabaseV2Values_(result.duplicates);
  return result;
}

function findDatabaseV2Header_(sheet, fields) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const rowsToCheck = Math.min(10, Math.max(1, sheet.getLastRow()));
  const rows = sheet.getRange(1, 1, rowsToCheck, lastColumn).getDisplayValues();
  let best = { row: 0, score: 0, index: {}, duplicates: [] };
  rows.forEach(function(values, rowIndex) {
    const index = {};
    const duplicates = [];
    values.forEach(function(value, columnIndex) {
      const normalized = normalizeDatabaseV2Header_(value);
      if (!normalized) return;
      if (index[normalized]) duplicates.push(String(value).trim());
      else index[normalized] = columnIndex + 1;
    });
    let score = 0;
    fields.forEach(function(field) {
      if (findDatabaseV2HeaderIndex_(index, field)) score++;
    });
    if (score > best.score) {
      best = { row: rowIndex + 1, score: score, index: index, duplicates: duplicates };
    }
  });
  return best;
}

function findDatabaseV2HeaderIndex_(headerIndex, aliases) {
  for (let index = 0; index < aliases.length; index++) {
    const found = headerIndex[normalizeDatabaseV2Header_(aliases[index])];
    if (found) return found;
  }
  return 0;
}

function normalizeDatabaseV2Header_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toUpperCase()
    .replace(/[%]/g, ' PERSEN ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDatabaseV2Key_(value) {
  return String(value == null ? '' : value).trim().toUpperCase();
}

function uniqueDatabaseV2Values_(values) {
  return Array.from(new Set(values));
}
