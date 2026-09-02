// ==========================================
// DATABASE SPK V2 - KONTRAK SKEMA & VALIDATOR
// ==========================================
// Modul ini mendefinisikan kontrak nama kolom dan validator integritas.
// Migrasi serta dual-write berada pada modul terpisah dan memakai kontrak ini
// sebelum sumber baca aplikasi dialihkan ke struktur V2.

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
      ['Toleransi Produksi']
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

// Pemetaan blok sumber lama. Rentang bersifat 1-indexed dan mengikuti DB_COL.
// Ini menjadi acuan migrator/dual-write pada tahap berikutnya.
const DB_V2_LEGACY_MAPPING = [
  { target: 'SPK Master', source: 'A:S', columns: '1-19', purpose: 'identitas, spesifikasi, dan konversi' },
  { target: 'SPK Master', source: 'AR:AW', columns: '44-49', purpose: 'jumlah order, UOM, toleransi, dan ETD' },
  { target: 'SPK Master', source: 'CP:CR', columns: '94-96', purpose: 'referensi, release, dan keterangan artikel' },
  { target: 'SPK Routing', source: 'T:AN', columns: '20-40', purpose: 'proses aktif dan target BS lama' },
  { target: 'SPK Routing', source: 'DS:DZ', columns: '123-130', purpose: 'detail proses lama' },
  { target: 'SPK Routing', source: 'ED', columns: '134', purpose: 'urutan routing JSON sebagai sumber utama' },
  { target: 'SPK Bahan', source: 'G', columns: '7', purpose: 'bahan utama' },
  { target: 'SPK Bahan', source: 'AX:BU', columns: '50-73', purpose: 'slot komposisi dan total' },
  { target: 'SPK Bahan', source: 'EB', columns: '132', purpose: 'keterangan bahan' },
  { target: 'SPK Warna', source: 'BV:CO', columns: '74-93', purpose: 'slot warna dan pemakaian' },
  { target: 'SPK Warna', source: 'DU', columns: '125', purpose: 'kode silinder' },
  { target: 'SPK Warna', source: 'EA', columns: '131', purpose: 'keterangan warna' },
  { target: 'SPK Pengiriman', source: 'AW', columns: '49', purpose: 'ETD utama' },
  { target: 'SPK Pengiriman', source: 'EL', columns: '142', purpose: 'jadwal pengiriman parsial' },
  { target: 'SPK ETA', source: 'DB:DQ', columns: '106-121', purpose: 'slot ETA pembelian dan keterangan' },
  { target: 'SPK Aksesoris', source: 'EQ:ES', columns: '147-149', purpose: 'ringkasan kebutuhan aksesoris' },
  { target: 'SPK Aksesoris', source: 'ED', columns: '134', purpose: 'detail aksesoris per langkah routing' },
  { target: 'SPK Tracking', source: 'ET', columns: '150', purpose: 'status tracking kompatibilitas' },
  { target: 'SPK Tracking', source: 'ED', columns: '134', purpose: 'posisi dan urutan routing' }
];

function getDatabaseV2Schema() {
  return JSON.parse(JSON.stringify({
    version: DB_V2_SCHEMA_VERSION,
    sheets: DB_V2_SCHEMA,
    legacyMapping: DB_V2_LEGACY_MAPPING
  }));
}

function validateDatabaseV2(options) {
  const settings = options && typeof options === 'object' ? options : {};
  const maxRows = Math.max(1, Math.min(
    Number(settings.maxRows) || DB_V2_DEFAULT_MAX_ROWS,
    100000
  ));
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const legacySheet = findDatabaseSheet_(spreadsheet);
  const legacyKeys = readDatabaseV2LegacyKeys_(legacySheet, maxRows);
  const report = {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    spreadsheetId: DB_SPREADSHEET_ID,
    checkedAt: new Date().toISOString(),
    mode: 'READ_ONLY',
    maxRows: maxRows,
    legacy: {
      sheet: legacySheet ? legacySheet.getName() : '',
      rows: legacyKeys.rows,
      uniqueSpk: legacyKeys.keys.size,
      duplicateSpk: legacyKeys.duplicates,
      truncated: legacyKeys.truncated
    },
    sheets: [],
    errors: [],
    warnings: []
  };

  if (!legacySheet) {
    report.errors.push('Sheet Database SPK lama tidak ditemukan.');
  }
  if (legacyKeys.duplicates.length) {
    report.errors.push('Database SPK lama memiliki SPK duplikat.');
  }
  if (legacyKeys.truncated) {
    report.warnings.push('Pemeriksaan Database SPK dibatasi sampai ' + maxRows + ' baris.');
  }

  Object.keys(DB_V2_SCHEMA).forEach(function(schemaKey) {
    const schema = DB_V2_SCHEMA[schemaKey];
    const sheetReport = validateDatabaseV2Sheet_(
      spreadsheet,
      schemaKey,
      schema,
      legacyKeys.keys,
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
    readyForDualWrite: report.errors.length === 0
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

function validateDatabaseV2Sheet_(spreadsheet, schemaKey, schema, legacyKeys, maxRows) {
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
    result.warnings.push('belum memiliki baris data');
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
    if (spk && legacyKeys.size && !legacyKeys.has(spk)) result.orphanSpk.push(spk);
  }

  result.duplicateKeys = uniqueDatabaseV2Values_(result.duplicateKeys);
  result.blankKeys = uniqueDatabaseV2Values_(result.blankKeys);
  result.orphanSpk = uniqueDatabaseV2Values_(result.orphanSpk);
  if (result.duplicateKeys.length) result.errors.push('ID/kunci duplikat ditemukan');
  if (result.blankKeys.length) result.errors.push('ID atau SPK kosong ditemukan');
  if (result.orphanSpk.length) result.errors.push('SPK tanpa induk ditemukan');
  return result;
}

function readDatabaseV2LegacyKeys_(sheet, maxRows) {
  const result = { rows: 0, keys: new Set(), duplicates: [], truncated: false };
  if (!sheet) return result;
  const physicalRows = Math.max(0, sheet.getLastRow() - DB_DATA_START_ROW + 1);
  const rowsToRead = Math.min(physicalRows, maxRows);
  result.rows = physicalRows;
  result.truncated = physicalRows > rowsToRead;
  if (!rowsToRead) return result;
  const values = sheet.getRange(DB_DATA_START_ROW, DB_COL.SPK, rowsToRead, 1).getDisplayValues();
  values.forEach(function(row) {
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
