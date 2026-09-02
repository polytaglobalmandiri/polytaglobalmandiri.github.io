// ==========================================
// DATABASE SPK V2 - PRATINJAU MIGRASI
// ==========================================
// Tidak ada fungsi pada file ini yang menulis ke Spreadsheet. Hasilnya adalah
// rencana insert/update/unchanged untuk ditinjau sebelum migrasi batch dibuat.

const DB_V2_PREVIEW_DEFAULT_ROWS = 500;
const DB_V2_PREVIEW_MAX_ROWS = 5000;
const DB_V2_PREVIEW_SAMPLE_LIMIT = 10;
const DB_V2_MIGRATION_SOURCE = 'MIGRASI DATABASE SPK';
const DB_V2_COVERAGE_CHUNK_ROWS = 500;
const DB_V2_COVERAGE_WARNING_SAMPLE_LIMIT = 50;

function previewDatabaseV2Migration(options) {
  const settings = options && typeof options === 'object' ? options : {};
  const maxRows = Math.max(1, Math.min(
    Number(settings.maxRows) || DB_V2_PREVIEW_DEFAULT_ROWS,
    DB_V2_PREVIEW_MAX_ROWS
  ));
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sourceSheet = getDbSheetReadOnly_();
  const physicalRows = Math.max(0, sourceSheet.getLastRow() - DB_DATA_START_ROW + 1);
  const rowsToRead = Math.min(physicalRows, maxRows);
  const columnCount = Math.min(
    sourceSheet.getMaxColumns(),
    Math.max(DB_COL.UOM_AKSESORIS, 150)
  );
  const sourceRows = rowsToRead
    ? sourceSheet.getRange(DB_DATA_START_ROW, 1, rowsToRead, columnCount).getValues()
    : [];
  const candidates = createDatabaseV2CandidateBuckets_();
  const sourceWarnings = [];

  sourceRows.forEach(function(sourceRow, index) {
    while (sourceRow.length < 150) sourceRow.push('');
    const rowNumber = DB_DATA_START_ROW + index;
    const spk = normalizeDatabaseV2Key_(sourceRow[DB_COL.SPK - 1]);
    if (!spk) {
      if (sourceRow.some(function(value) { return String(value || '').trim() !== ''; })) {
        sourceWarnings.push('Baris ' + rowNumber + ' memiliki data tetapi SPK kosong.');
      }
      return;
    }
    buildDatabaseV2CandidatesForRow_(sourceRow, rowNumber, spk, candidates, sourceWarnings);
  });

  const report = {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    mode: 'PREVIEW_READ_ONLY',
    checkedAt: new Date().toISOString(),
    spreadsheetId: DB_SPREADSHEET_ID,
    source: {
      sheet: sourceSheet.getName(),
      physicalRows: physicalRows,
      rowsChecked: rowsToRead,
      truncated: physicalRows > rowsToRead,
      firstDataRow: DB_DATA_START_ROW
    },
    targets: [],
    warnings: sourceWarnings
  };

  Object.keys(DB_V2_SCHEMA).forEach(function(schemaKey) {
    const schema = DB_V2_SCHEMA[schemaKey];
    const targetSheet = spreadsheet.getSheetByName(schema.sheet);
    const targetReport = compareDatabaseV2Candidates_(
      targetSheet,
      schema,
      candidates[schemaKey],
      maxRows
    );
    report.targets.push(targetReport);
    targetReport.warnings.forEach(function(message) {
      report.warnings.push(schema.sheet + ': ' + message);
    });
  });

  report.summary = report.targets.reduce(function(summary, target) {
    summary.candidateRows += target.candidateRows;
    summary.insert += target.insert;
    summary.update += target.update;
    summary.unchanged += target.unchanged;
    summary.preservedExisting += target.preservedExisting;
    summary.duplicateCandidateKeys += target.duplicateCandidateKeys.length;
    return summary;
  }, {
    candidateRows: 0,
    insert: 0,
    update: 0,
    unchanged: 0,
    preservedExisting: 0,
    duplicateCandidateKeys: 0,
    writesPerformed: 0,
    readyForReview: true
  });
  report.summary.readyForReview = report.summary.duplicateCandidateKeys === 0;
  if (report.source.truncated) {
    report.warnings.push('Pratinjau hanya memeriksa ' + rowsToRead + ' dari ' + physicalRows + ' baris sumber.');
  }
  if (report.summary.duplicateCandidateKeys) {
    report.summary.readyForReview = false;
  }
  return report;
}

function logDatabaseV2MigrationPreview() {
  const report = previewDatabaseV2Migration();
  console.log(JSON.stringify(report, null, 2));
  return report;
}

// Memindai seluruh sumber dalam potongan kecil tanpa menyimpan seluruh calon
// baris di memori. Fungsi ini baca-saja dan dipakai sebagai gerbang sebelum
// migrasi skala besar dijalankan.
function analyzeDatabaseV2MigrationCoverage() {
  const sourceSheet = getDbSheetReadOnly_();
  const firstRow = DB_DATA_START_ROW;
  const lastRow = sourceSheet.getLastRow();
  const width = Math.min(sourceSheet.getMaxColumns(), Math.max(DB_COL.UOM_AKSESORIS, 150));
  const totals = createDatabaseV2CoverageTotals_();
  const samples = { eta: [], accessory: [] };
  const sourceSignals = {
    routingJsonRows: 0,
    accessorySummaryRows: 0,
    accessorySummarySamples: []
  };
  const warningSamples = [];
  let warningCount = 0;
  let blockingWarningCount = 0;
  let spkRows = 0;

  for (let chunkStart = firstRow; chunkStart <= lastRow; chunkStart += DB_V2_COVERAGE_CHUNK_ROWS) {
    const chunkEnd = Math.min(lastRow, chunkStart + DB_V2_COVERAGE_CHUNK_ROWS - 1);
    const rows = sourceSheet.getRange(chunkStart, 1, chunkEnd - chunkStart + 1, width).getValues();
    rows.forEach(function(row, index) {
      while (row.length < 150) row.push('');
      const rowNumber = chunkStart + index;
      const spk = normalizeDatabaseV2Key_(row[DB_COL.SPK - 1]);
      if (!spk) {
        if (row.some(function(value) { return String(value || '').trim() !== ''; })) {
          warningCount++;
          blockingWarningCount++;
          if (warningSamples.length < DB_V2_COVERAGE_WARNING_SAMPLE_LIMIT) {
            warningSamples.push('Baris ' + rowNumber + ' memiliki data tetapi SPK kosong.');
          }
        }
        return;
      }

      spkRows++;
      const rowCandidates = createDatabaseV2CandidateBuckets_();
      const rowWarnings = [];
      buildDatabaseV2CandidatesForRow_(row, rowNumber, spk, rowCandidates, rowWarnings);
      if (valueOrEmpty_(row[DB_COL.ROUTING_STEPS - 1]) !== '') sourceSignals.routingJsonRows++;
      const accessorySummary = [
        valueOrEmpty_(row[DB_COL.AKSESORIS_ROUTING - 1]),
        valueOrEmpty_(row[DB_COL.KEBUTUHAN_AKSESORIS - 1]),
        valueOrEmpty_(row[DB_COL.UOM_AKSESORIS - 1])
      ];
      if (accessorySummary.some(function(value) { return value !== ''; })) {
        sourceSignals.accessorySummaryRows++;
        if (sourceSignals.accessorySummarySamples.length < DB_V2_PREVIEW_SAMPLE_LIMIT) {
          sourceSignals.accessorySummarySamples.push({
            sourceRow: rowNumber,
            spk: spk,
            routing: accessorySummary[0],
            requirement: accessorySummary[1],
            uom: accessorySummary[2]
          });
        }
      }
      Object.keys(totals).forEach(function(schemaKey) {
        totals[schemaKey] += rowCandidates[schemaKey].length;
      });
      collectDatabaseV2CoverageSamples_(samples.eta, rowCandidates.eta, rowNumber, spk);
      collectDatabaseV2CoverageSamples_(samples.accessory, rowCandidates.accessory, rowNumber, spk);
      warningCount += rowWarnings.length;
      rowWarnings.forEach(function(message) {
        if (isDatabaseV2BlockingSourceWarning_(message)) blockingWarningCount++;
        if (warningSamples.length < DB_V2_COVERAGE_WARNING_SAMPLE_LIMIT) warningSamples.push(message);
      });
    });
  }

  return {
    schemaVersion: DB_V2_SCHEMA_VERSION,
    mode: 'FULL_COVERAGE_READ_ONLY',
    checkedAt: new Date().toISOString(),
    sourceSheet: sourceSheet.getName(),
    firstSourceRow: firstRow,
    lastSourceRow: lastRow,
    physicalRowsChecked: Math.max(0, lastRow - firstRow + 1),
    spkRows: spkRows,
    candidates: totals,
    sourceSignals: sourceSignals,
    samples: samples,
    warnings: {
      count: warningCount,
      blockingCount: blockingWarningCount,
      advisoryCount: warningCount - blockingWarningCount,
      samples: warningSamples
    },
    writesPerformed: 0,
    readyForLargeBatch: blockingWarningCount === 0
  };
}

function logDatabaseV2FullCoverage() {
  const report = analyzeDatabaseV2MigrationCoverage();
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function createDatabaseV2CoverageTotals_() {
  return {
    master: 0,
    routing: 0,
    material: 0,
    color: 0,
    delivery: 0,
    eta: 0,
    accessory: 0,
    tracking: 0
  };
}

function collectDatabaseV2CoverageSamples_(target, records, rowNumber, spk) {
  if (target.length >= DB_V2_PREVIEW_SAMPLE_LIMIT || !records.length) return;
  records.slice(0, DB_V2_PREVIEW_SAMPLE_LIMIT - target.length).forEach(function(record) {
    target.push({ sourceRow: rowNumber, spk: spk, record: record });
  });
}

function isDatabaseV2BlockingSourceWarning_(message) {
  return /^Baris \d+ .*SPK kosong/i.test(String(message || ''));
}

function createDatabaseV2CandidateBuckets_() {
  return {
    master: [],
    routing: [],
    material: [],
    color: [],
    delivery: [],
    eta: [],
    accessory: [],
    tracking: []
  };
}

function buildDatabaseV2CandidatesForRow_(row, rowNumber, spk, candidates, warnings) {
  candidates.master.push(buildDatabaseV2MasterCandidate_(row, spk));

  const routingSteps = getDatabaseV2RoutingSteps_(row);
  routingSteps.forEach(function(step, stepIndex) {
    candidates.routing.push(buildDatabaseV2RoutingCandidate_(row, spk, step, stepIndex));
  });

  getDatabaseV2MaterialItems_(row).forEach(function(item, index) {
    candidates.material.push({
      'Bahan ID': databaseV2DetailId_(spk, 'B', index + 1),
      'SPK': spk,
      'Urutan': index + 1,
      'Kode Bahan': '',
      'Nama Bahan': item.material,
      'KG': item.kg,
      'Persentase': databaseV2PercentFraction_(item.percent),
      'Jenis': 'KOMPOSISI',
      'Sumber': DB_V2_MIGRATION_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  getWarnaFromRow_(row).filter(function(item) {
    return item.nama !== '' || item.pemakaian !== '';
  }).forEach(function(item, index) {
    candidates.color.push({
      'Warna ID': databaseV2DetailId_(spk, 'W', index + 1),
      'SPK': spk,
      'Urutan': index + 1,
      'Nama Warna': item.nama,
      'Pemakaian': item.pemakaian,
      'UOM': '',
      'Kode Silinder': valueOrEmpty_(row[DB_COL.PRINTING_KODE_SILINDER - 1]),
      'Sumber': DB_V2_MIGRATION_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  const partialDeliveries = parsePengirimanParsialCell_(row[DB_COL.PENGIRIMAN_PARSIAL - 1]);
  const deliveries = partialDeliveries.length ? partialDeliveries : getDatabaseV2MainDelivery_(row);
  deliveries.forEach(function(item, index) {
    candidates.delivery.push({
      'Pengiriman ID': databaseV2DetailId_(spk, 'P', index + 1),
      'SPK': spk,
      'Urutan': index + 1,
      'Tanggal Kirim': item.tanggal,
      'Qty': item.jumlah,
      'UOM': item.uom,
      'Status': item.mode === 'FULL' ? 'RENCANA PENUH' : 'RENCANA PARSIAL',
      'Keterangan': '',
      'Sumber': DB_V2_MIGRATION_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  const etaNote = valueOrEmpty_(row[DB_COL.ETA_BELI_KETERANGAN - 1]);
  getEtaBeliBahanFromRow_(row).filter(function(item) {
    return item.eta !== '' || item.qty !== '' || item.uom !== '';
  }).forEach(function(item, index) {
    candidates.eta.push({
      'ETA ID': databaseV2DetailId_(spk, 'E', item.index || index + 1),
      'SPK': spk,
      'Urutan': item.index || index + 1,
      'Tanggal ETA': item.eta,
      'Qty': item.qty,
      'UOM': item.uom,
      'Status': 'RENCANA',
      'Keterangan': etaNote,
      'Sumber': DB_V2_MIGRATION_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  routingSteps.forEach(function(step, stepIndex) {
    const values = step.values && typeof step.values === 'object' ? step.values : {};
    const accessories = parseRoutingAccessoryEntries_(values['aksesorisData-' + step.key]);
    accessories.forEach(function(item, accessoryIndex) {
      candidates.accessory.push({
        'Aksesoris ID': databaseV2NestedDetailId_(spk, 'A', stepIndex + 1, accessoryIndex + 1),
        'SPK': spk,
        'Routing ID': databaseV2DetailId_(spk, 'R', stepIndex + 1),
        'Urutan': accessoryIndex + 1,
        'Nama Aksesoris': item.nama,
        'Kebutuhan': item.kebutuhan,
        'UOM': item.uom,
        'Status': 'AKTIF',
        'Sumber': DB_V2_MIGRATION_SOURCE,
        'Dibuat': '',
        'Diperbarui': ''
      });
    });
  });

  const tracking = valueOrEmpty_(row[149]);
  if (tracking !== '') {
    candidates.tracking.push({
      'Tracking ID': databaseV2DetailId_(spk, 'T', 1),
      'SPK': spk,
      'Kode Status': normalizeDatabaseV2Key_(tracking),
      'Nama Status': tracking,
      'Routing ID': '',
      'Urutan Routing': '',
      'Waktu': '',
      'Operator': '',
      'Sumber': DB_V2_MIGRATION_SOURCE,
      'Keterangan': 'Migrasi status terakhir dari kolom ET'
    });
  }

  if (!routingSteps.length) warnings.push('SPK ' + spk + ' tidak mempunyai routing yang dapat dimigrasikan.');
}

function buildDatabaseV2MasterCandidate_(row, spk) {
  return {
    'SPK': spk,
    'Tanggal': dateToInput_(row[DB_COL.TANGGAL - 1]),
    'Jenis Order': valueOrEmpty_(row[DB_COL.JENIS_ORDER - 1]),
    'Marketing': valueOrEmpty_(row[DB_COL.MARKETING - 1]),
    'Nomor PO': valueOrEmpty_(row[DB_COL.NOMOR_PO - 1]),
    'Customer': valueOrEmpty_(row[DB_COL.CUSTOMER - 1]),
    'Artikel': valueOrEmpty_(row[DB_COL.ARTIKEL - 1]),
    'Kode Item': valueOrEmpty_(row[DB_COL.KODE_ITEM - 1]),
    'Material': valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
    'Film': valueOrEmpty_(row[DB_COL.FILM - 1]),
    'Model Kantong': valueOrEmpty_(row[DB_COL.MODEL_KANTONG - 1]),
    'Ukuran Blow': valueOrEmpty_(row[DB_COL.UKURAN_BLOW - 1]),
    'Ukuran Jadi': valueOrEmpty_(row[DB_COL.UKURAN_JADI - 1]),
    'Jumlah Order': numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
    'UOM Order': valueOrEmpty_(row[DB_COL.UOM_ORDER - 1]),
    'Keluar Bahan': numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
    'UOM KB': valueOrEmpty_(row[DB_COL.UOM_KB - 1]),
    'Toleransi Order': percentToInput_(row[DB_COL.TOLERANSI - 1]),
    'ETD': dateToInput_(row[DB_COL.ETD - 1]),
    'SPK Referensi': valueOrEmpty_(row[DB_COL.SPK_REFERENSI - 1]),
    'Release': valueOrEmpty_(row[DB_COL.RELEASE - 1]),
    'Tracking': valueOrEmpty_(row[149]),
    'Keterangan Artikel': valueOrEmpty_(row[DB_COL.KETERANGAN_ARTIKEL - 1]),
    'Keterangan Warna': valueOrEmpty_(row[DB_COL.KETERANGAN_WARNA - 1]),
    'Keterangan Bahan': valueOrEmpty_(row[DB_COL.KETERANGAN_BAHAN - 1]),
    'Meter/Roll': numberOrEmptyForClient_(row[DB_COL.METER_ROLL - 1]),
    'Mode PCS/KG': valueOrEmpty_(row[DB_COL.PCS_KG_MODE - 1]),
    'Jenis Potongan': valueOrEmpty_(row[DB_COL.JENIS_POTONGAN - 1]),
    'Tanggal PO Masuk': dateToInput_(row[DB_COL.PO_MASUK - 1]),
    'Stok': numberOrEmptyForClient_(row[DB_COL.STOK - 1]),
    'OTS': numberOrEmptyForClient_(row[DB_COL.OTS - 1]),
    'WIP': numberOrEmptyForClient_(row[DB_COL.WIP - 1]),
    'Toleransi Produksi': percentToInput_(row[DB_COL.TOLERANSI_PRODUKSI - 1])
  };
}

function getDatabaseV2RoutingSteps_(row) {
  const parsed = parseRoutingStepsCell_(row[DB_COL.ROUTING_STEPS - 1]);
  if (parsed.length) return parsed;
  return PROSES_KEYS.map(function(key, index) {
    return isProcessActive_(row[DB_COL.PROSES_MIXER - 1 + index])
      ? { key: key, values: {} }
      : null;
  }).filter(Boolean);
}

function buildDatabaseV2RoutingCandidate_(row, spk, step, stepIndex) {
  const values = step.values && typeof step.values === 'object' ? step.values : {};
  const machine = findDatabaseV2MigrationValue_(values, ['mesin', 'machine']);
  const parameters = {};
  Object.keys(values).sort().forEach(function(key) {
    if (key.indexOf('aksesorisData-') === 0) return;
    if (/mesin|machine/i.test(key)) return;
    parameters[key] = values[key];
  });
  const bsIndex = BS_KEYS.indexOf(step.key);
  const processNotes = getProcessNotesFromRow_(row);
  return {
    'Routing ID': databaseV2DetailId_(spk, 'R', stepIndex + 1),
    'SPK': spk,
    'Urutan': stepIndex + 1,
    'Kode Proses': step.key,
    'Nama Proses': PROSES_LABELS[step.key] || String(step.key || '').toUpperCase(),
    'Mesin': machine,
    'Ukuran / Parameter': Object.keys(parameters).length ? JSON.stringify(parameters) : '',
    'Target BS %': bsIndex > -1
      ? databaseV2PercentFraction_(percentToInput_(row[DB_COL.BS_START - 1 + bsIndex]))
      : '',
    'Keterangan': valueOrEmpty_(processNotes[step.key]),
    'Status': 'AKTIF',
    'Mulai': '',
    'Selesai': '',
    'Operator': '',
    'Payload JSON': JSON.stringify(step),
    'Sumber': DB_V2_MIGRATION_SOURCE,
    'Dibuat': '',
    'Diperbarui': ''
  };
}

function getDatabaseV2MaterialItems_(row) {
  const result = [];
  for (let index = 0; index < DB_MAX_BAHAN; index++) {
    const start = DB_COL.KOMPOSISI_START - 1 + (index * 3);
    const item = index === DB_MAX_BAHAN - 1
      ? { material: valueOrEmpty_(row[start]), kg: '', percent: '' }
      : {
          material: valueOrEmpty_(row[start]),
          kg: numberOrEmptyForClient_(row[start + 1]),
          percent: percentToInput_(row[start + 2])
        };
    if (item.material !== '' || item.kg !== '' || item.percent !== '') result.push(item);
  }
  if (!result.length && valueOrEmpty_(row[DB_COL.MATERIAL - 1]) !== '') {
    result.push({
      material: valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
      kg: numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
      percent: ''
    });
  }
  return result;
}

function getDatabaseV2MainDelivery_(row) {
  const date = dateToInput_(row[DB_COL.ETD - 1]);
  if (!date) return [];
  return [{
    tanggal: date,
    jumlah: numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
    uom: valueOrEmpty_(row[DB_COL.UOM_ORDER - 1]),
    mode: 'FULL'
  }];
}

function compareDatabaseV2Candidates_(sheet, schema, candidates, maxRows) {
  const existing = readDatabaseV2ExistingRows_(sheet, schema, maxRows);
  const candidateIndex = {};
  const duplicateCandidateKeys = [];
  const keyName = schema.key;
  candidates.forEach(function(record) {
    const key = normalizeDatabaseV2Key_(record[keyName]);
    if (!key) return;
    if (candidateIndex[key]) duplicateCandidateKeys.push(key);
    candidateIndex[key] = record;
  });
  const sample = [];
  let insert = 0;
  let update = 0;
  let unchanged = 0;

  Object.keys(candidateIndex).forEach(function(key) {
    const candidate = candidateIndex[key];
    const current = existing.index[key];
    if (!current) {
      insert++;
      addDatabaseV2MigrationSample_(sample, { key: key, action: 'INSERT' });
      return;
    }
    const changedFields = diffDatabaseV2Records_(schema, current, candidate);
    if (changedFields.length) {
      update++;
      addDatabaseV2MigrationSample_(sample, {
        key: key,
        action: 'UPDATE',
        changedFields: changedFields
      });
    } else {
      unchanged++;
    }
  });

  const preservedExisting = Object.keys(existing.index).filter(function(key) {
    return !candidateIndex[key];
  }).length;
  const warnings = existing.warnings.slice();
  const duplicates = uniqueDatabaseV2Values_(duplicateCandidateKeys);
  if (duplicates.length) warnings.push('kunci kandidat duplikat: ' + duplicates.slice(0, 10).join(', '));
  if (!sheet) warnings.push('sheet target belum tersedia; seluruh kandidat dihitung sebagai insert');

  return {
    sheet: schema.sheet,
    exists: Boolean(sheet),
    candidateRows: candidates.length,
    uniqueCandidateRows: Object.keys(candidateIndex).length,
    existingRowsChecked: existing.rowsChecked,
    insert: insert,
    update: update,
    unchanged: unchanged,
    preservedExisting: preservedExisting,
    deletesPlanned: 0,
    writesPerformed: 0,
    duplicateCandidateKeys: duplicates,
    sample: sample,
    warnings: warnings
  };
}

function readDatabaseV2ExistingRows_(sheet, schema, maxRows) {
  const result = { index: {}, rowsChecked: 0, warnings: [] };
  if (!sheet) return result;
  const header = findDatabaseV2Header_(sheet, schema.fields);
  if (!header.row) {
    result.warnings.push('header tidak dikenali');
    return result;
  }
  const missing = schema.fields.filter(function(field) {
    return !findDatabaseV2HeaderIndex_(header.index, field);
  });
  if (missing.length) {
    result.warnings.push('header belum lengkap sehingga perbandingan dilewati');
    return result;
  }
  const physicalRows = Math.max(0, sheet.getLastRow() - header.row);
  const rowsToRead = Math.min(physicalRows, maxRows);
  result.rowsChecked = rowsToRead;
  if (!rowsToRead) return result;
  const width = sheet.getLastColumn();
  const values = sheet.getRange(header.row + 1, 1, rowsToRead, width).getValues();
  const keyField = schema.fields.filter(function(field) {
    return normalizeDatabaseV2Header_(field[0]) === normalizeDatabaseV2Header_(schema.key);
  })[0] || [schema.key];
  const keyColumn = findDatabaseV2HeaderIndex_(header.index, keyField);
  values.forEach(function(row) {
    const key = normalizeDatabaseV2Key_(row[keyColumn - 1]);
    if (!key) return;
    const record = {};
    schema.fields.forEach(function(field) {
      const column = findDatabaseV2HeaderIndex_(header.index, field);
      record[field[0]] = row[column - 1];
    });
    if (!result.index[key]) result.index[key] = record;
  });
  if (physicalRows > rowsToRead) {
    result.warnings.push('perbandingan target dibatasi sampai ' + rowsToRead + ' baris');
  }
  return result;
}

function diffDatabaseV2Records_(schema, current, candidate) {
  // Nilai operasional dipertahankan. Migrasi historis hanya mengisi struktur
  // sumber dan tidak boleh mengosongkan waktu/status realisasi yang sudah ada.
  const ignored = [
    'Dibuat', 'Diperbarui', 'Dibuat Pada', 'Diperbarui Pada',
    'Mulai', 'Selesai', 'Waktu Mulai', 'Waktu Selesai',
    'Waktu'
  ];
  return schema.fields.map(function(field) { return field[0]; }).filter(function(fieldName) {
    if (ignored.indexOf(fieldName) > -1) return false;
    return normalizeDatabaseV2Comparable_(current[fieldName]) !==
      normalizeDatabaseV2Comparable_(candidate[fieldName]);
  });
}

function normalizeDatabaseV2Comparable_(value) {
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

function databaseV2PercentFraction_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value);
  return isFinite(number) ? number / 100 : '';
}

function findDatabaseV2MigrationValue_(values, patterns) {
  const keys = Object.keys(values || {});
  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
    const pattern = String(patterns[patternIndex]).toLowerCase();
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      if (keys[keyIndex].toLowerCase().indexOf(pattern) > -1) {
        return valueOrEmpty_(values[keys[keyIndex]]);
      }
    }
  }
  return '';
}

function databaseV2DetailId_(spk, type, sequence) {
  return spk + ':' + type + ':' + String(sequence).padStart(2, '0');
}

function databaseV2NestedDetailId_(spk, type, parentSequence, sequence) {
  return spk + ':' + type + ':' + String(parentSequence).padStart(2, '0') + ':' +
    String(sequence).padStart(2, '0');
}

function addDatabaseV2MigrationSample_(sample, entry) {
  if (sample.length < DB_V2_PREVIEW_SAMPLE_LIMIT) sample.push(entry);
}
