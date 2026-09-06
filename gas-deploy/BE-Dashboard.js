// Menyisipkan berkas partial ke dalam halaman pemanggil. Wizard Input SPK
// dipecah menjadi tiga partial (style, body, script) agar halaman Input SPK
// dan modal Input SPK di Dashboard memakai sumber yang sama persis.
function includePartial(fileName, appUrl) {
  var partial = HtmlService.createTemplateFromFile(fileName);
  partial.appUrl = appUrl || '';
  return partial.evaluate().getContent();
}

function doGet(e) {
  // Permintaan JSONP dari frontend statis dijawab lebih dulu. Sisanya jatuh
  // melewati blok ini dan tetap melayani halaman seperti sebelumnya.
  var jsonp = serveSpkRpcJsonp_(e);
  if (jsonp) return jsonp;

  var page = e && e.parameter && e.parameter.page ? e.parameter.page : '';
  var fileName = 'FE-Dashboard';
  var pageTitle = 'PPIC | Polyta Global Mandiri';

  if (page === 'Dashboard-PPIC') {
    fileName = 'FE-PPIC-Dashboard';
    pageTitle = 'Dashboard PPIC | Polyta Global Mandiri';
  } else if (page === 'Input-SPK') {
    fileName = 'FE-Input-SPK';
    pageTitle = 'Input SPK | Polyta Global Mandiri';
  } else if (page === 'Penarikan-Data') {
    fileName = 'FE-Penarikan-Data';
    pageTitle = 'Penarikan Data | Polyta Global Mandiri';
  } else if (page === 'Keluar-Bahan') {
    fileName = 'FE-Keluar-Bahan';
    pageTitle = 'Keluar Bahan | Manager PPIC';
  } else if (page === 'Cetak-SPK') {
    fileName = 'FE-Cetak-SPK';
    pageTitle = 'Cetak Surat Perintah Kerja';
  }

  var template = HtmlService.createTemplateFromFile(fileName);
  template.appUrl = ScriptApp.getService().getUrl() || '';
  template.spkNumber = '';
  // Nomor baris Database dari halaman pemanggil. Hanya petunjuk pencarian;
  // nilainya selalu diverifikasi ulang di server sebelum dipakai.
  template.dbRow = '';
  if (page === 'Cetak-SPK' && e && e.parameter && e.parameter.spk) {
    template.spkNumber = String(e.parameter.spk)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9._\/-]/g, '');
    template.dbRow = String(
      Math.max(0, Math.floor(Number(e.parameter.row) || 0))
    );
  }
  template.printMode = page === 'Cetak-SPK' && e && e.parameter && e.parameter.mode === 'view'
    ? 'view'
    : 'release';

  return template
    .evaluate()
    .setTitle(pageTitle)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Naik ke v13: pembacaan nilai Dashboard kini memakai satu batch Sheets API.
// Nomor versi pada kunci inilah satu-satunya cara menggugurkan cache ketika
// yang berubah adalah kodenya, bukan datanya.
var DASHBOARD_CACHE_META_KEY = 'ppic-dashboard-v14-meta';
var DASHBOARD_CACHE_CHUNK_PREFIX = 'ppic-dashboard-v14-part-';
// Umur panjang aman karena setiap mutasi memanggil clearDashboardCache_(),
// yang menghapus cache sekaligus menaikkan token revisi yang dipantau klien.
// Perhatikan: pembersihan itu hanya terpicu oleh mutasi data. Perubahan kode
// yang mengubah bentuk muatan wajib disertai kenaikan nomor versi di atas.
var DASHBOARD_CACHE_SECONDS = 21600;
var DASHBOARD_CACHE_CHUNK_SIZE = 75000;
// Pembacaan menerima hingga 100 potongan, jadi batas ini dinaikkan mendekati
// kapasitas itu agar cache tetap terpakai saat Database sudah besar. Di atas
// batas, penyimpanan cache dilewati dan pembacaan kembali langsung ke Sheet.
var DASHBOARD_CACHE_MAX_SIZE = 7000000;
// Angka revisi hanya naik ketika Database bermutasi, sehingga perubahan kode
// yang mengubah BENTUK muatan tidak menggugurkan simpanan apa pun di sisi
// klien. Versi bentuk di bawah ini dilipat ke dalam token revisi supaya
// perubahan kode ikut terdeteksi. Naikkan setiap kali bentuk muatan berubah.
var DASHBOARD_SHAPE_VERSION = 'b6-native-v2';
var DASHBOARD_REVISION_PROPERTY_KEY = 'ppic-dashboard-v1-revision';
var DASHBOARD_REVISION_CACHE_KEY = 'ppic-dashboard-v1-revision-cache';
var DASHBOARD_REVISION_CACHE_SECONDS = 21600;
var DASHBOARD_FALLBACK_TRACKING_COLUMN_ = 150; // ET, fallback tampilan saat payload belum memuat tracking

function calculateDashboardOrderKgFromV2_(master) {
  var quantity = parseDashboardNumber_(master['Jumlah Order']);
  var uom = normalizeDashboardUom_(master['UOM Order']);
  if (!(quantity >= 0)) return null;
  if (uom === 'KG') return quantity;
  if (uom === 'PCS') {
    var pcsPerKg = parseDashboardNumber_(master['PCS/KG']);
    if (pcsPerKg > 0) return quantity / pcsPerKg;
  } else if (uom === 'ROLL') {
    var meterPerKg = parseDashboardNumber_(master['Meter/KG']);
    var meterRoll = parseDashboardNumber_(master['Meter/Roll']);
    if (meterPerKg > 0 && meterRoll > 0) return quantity * meterRoll / meterPerKg;
  }
  var keluar = parseDashboardNumber_(master['Keluar Bahan']);
  if (!(keluar >= 0) || normalizeDashboardUom_(master['UOM KB']) !== 'KG') return null;
  var multiplier = 1 + (dashboardPercentToNumber_(master['Total BS']) / 100);
  return multiplier > 0 ? keluar / multiplier : null;
}

function dashboardRoutingLabelFromV2_(routing) {
  var key = String(routing['Kode Proses'] || '').trim().toLowerCase();
  if (key === 'cutting') {
    var payload = {};
    try { payload = JSON.parse(String(routing['Payload JSON'] || '{}')); } catch (error) {}
    return normalizeDashboardFinishingLabel_(
      payload && payload.values ? payload.values.finishing : ''
    );
  }
  var labels = {
    mixer: 'Mixer', blowing: 'Blowing', printing: 'Printing', slitting: 'Slitting',
    folding: 'Folding', gusset: 'Gusset'
  };
  return labels[key] || valueOrEmpty_(routing['Nama Proses']);
}

function buildDashboardV2Indexes_(spreadsheet) {
  var routingBySpk = {};
  readDatabaseV2Table_('routing', spreadsheet).records.forEach(function(record) {
    var spk = normalizeDatabaseV2Key_(record.SPK);
    if (!routingBySpk[spk]) routingBySpk[spk] = [];
    routingBySpk[spk].push(record);
  });
  Object.keys(routingBySpk).forEach(function(spk) {
    routingBySpk[spk].sort(function(a, b) { return (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0); });
  });
  var trackingBySpk = {};
  readDatabaseV2Table_('tracking', spreadsheet).records.forEach(function(record) {
    var spk = normalizeDatabaseV2Key_(record.SPK);
    var status = normalizeDashboardTracking_(record['Kode Status'] || record['Nama Status']);
    if (spk && status) trackingBySpk[spk] = status;
  });
  return { routingBySpk: routingBySpk, trackingBySpk: trackingBySpk };
}

function getDashboardData(forceRefresh) {
  var startedAt = Date.now();
  var sourceRevision = readDashboardSourceRevision_();
  if (!forceRefresh) {
    var cached = readDashboardCache_();
    if (cached && cached.sourceRevision === sourceRevision) {
      cached.revision = buildDashboardRevision_(sourceRevision);
      cached.performance = { source: 'cache-v2', durationMs: Date.now() - startedAt, rowCount: cached.tableData.length };
      return cached;
    }
  }
  try {
    var spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    var masters = readDatabaseV2Table_('master', spreadsheet).records;
    var indexes = buildDashboardV2Indexes_(spreadsheet);
    var tableData = [];
    var volumeKgBySpk = {};
    var dashboardRecapBySpk = {};
    masters.forEach(function(master) {
      var spk = normalizeDatabaseV2Key_(master.SPK);
      if (!spk) return;
      var date = dateToInput_(master.Tanggal);
      var displayDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date.slice(8, 10) + '-' + date.slice(5, 7) + '-' + date.slice(0, 4)
        : valueOrEmpty_(master.Tanggal);
      var release = String(master.Release || '').trim().toUpperCase() === 'YA' ? 'YA' : 'Tidak';
      var tracking = indexes.trackingBySpk[spk] || normalizeDashboardTracking_(master.Tracking);
      var routing = (indexes.routingBySpk[spk] || []).map(dashboardRoutingLabelFromV2_).filter(Boolean);
      volumeKgBySpk[spk] = calculateDashboardOrderKgFromV2_(master);
      dashboardRecapBySpk[spk] = { routing: routing, tracking: tracking };
      tableData.push([
        spk, displayDate, master['Jenis Order'] || 'Tidak Diketahui',
        master.Marketing || 'Tidak Diketahui', master.Customer, master.Artikel,
        formatDashboardSize_(master['Ukuran Blow'], master['Ukuran Jadi']), master.Material,
        master['Jumlah Order'], normalizeDashboardUom_(master['UOM Order']),
        isDashboardValueEmpty_(master['Keluar Bahan']) ? 'KB' : release,
        0, tracking
      ]);
    });
    tableData.sort(function(a, b) { return buildSpkSortKey_(a[0], 0).localeCompare(buildSpkSortKey_(b[0], 0)); });
    var result = {
      totalSPK: tableData.length, tableData: tableData, volumeKgBySpk: volumeKgBySpk,
      dashboardRecapBySpk: dashboardRecapBySpk, trackingColumn: 0,
      sourceRevision: sourceRevision, revision: buildDashboardRevision_(sourceRevision),
      performance: { source: 'database-v2', durationMs: Date.now() - startedAt, rowCount: tableData.length }
    };
    writeDashboardCache_(result);
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

function getDashboardTrackingData() {
  try {
    var spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    var masters = readDatabaseV2Table_('master', spreadsheet).records;
    var indexes = buildDashboardV2Indexes_(spreadsheet);
    var trackingBySpk = {};
    masters.forEach(function(master) {
      var spk = normalizeDatabaseV2Key_(master.SPK);
      if (spk) trackingBySpk[spk] = indexes.trackingBySpk[spk] || normalizeDashboardTracking_(master.Tracking);
    });
    return { trackingBySpk: trackingBySpk, trackingColumn: 0, revision: readDashboardRevision_() };
  } catch (error) {
    return { error: error.message };
  }
}

// Mengembalikan matriks dengan jumlah baris dan kolom yang selalu tetap.
// Sheets API memangkas sel kosong di kanan/bawah, sehingga normalisasi ini
// menjaga indeks kolom lama tetap aman.
function normalizeDashboardMatrix_(values, rowCount, width) {
  var rows = [];
  values = Array.isArray(values) ? values : [];
  for (var rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    var source = Array.isArray(values[rowIndex]) ? values[rowIndex] : [];
    var row = [];
    for (var columnIndex = 0; columnIndex < width; columnIndex++) {
      row.push(columnIndex < source.length ? source[columnIndex] : '');
    }
    rows.push(row);
  }
  return rows;
}

function dashboardColumnLetter_(column) {
  var value = Number(column) || 0;
  var letter = '';
  while (value > 0) {
    var remainder = (value - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    value = Math.floor((value - 1) / 26);
  }
  return letter;
}

function dashboardA1Range_(sheetName, startColumn, width, lastRow) {
  var quotedName = "'" + String(sheetName).replace(/'/g, "''") + "'";
  var first = dashboardColumnLetter_(startColumn);
  var last = dashboardColumnLetter_(startColumn + width - 1);
  return quotedName + '!' + first + DB_DATA_START_ROW + ':' + last + lastRow;
}

function blankDashboardMatrix_(rowCount, width) {
  return normalizeDashboardMatrix_([], rowCount, width);
}

function readDashboardValueBlocks_(sheet, rowCount, trackingColumn, trackingOnly) {
  var maxColumns = sheet.getMaxColumns();
  var specs = trackingOnly
    ? [
        { key: 'main', column: DB_COL.SPK, width: 1 },
        { key: 'tracking', column: trackingColumn, width: 1 }
      ]
    : [
        { key: 'main', column: DB_COL.SPK, width: 12 },
        { key: 'order', column: DB_COL.JUMLAH_ORDER, width: 4 },
        { key: 'conversion', column: DB_COL.PCS_PER_KG, width: 2 },
        { key: 'totalBs', column: DB_COL.TOTAL_BS, width: 1 },
        { key: 'meterRoll', column: DB_COL.METER_ROLL, width: 1 },
        { key: 'release', column: DB_COL.RELEASE, width: 1 },
        { key: 'process', column: DB_COL.PROSES_MIXER, width: 7 },
        { key: 'routing', column: DB_COL.ROUTING_STEPS, width: 1 },
        { key: 'tracking', column: trackingColumn, width: 1 }
      ];
  var usableSpecs = specs.filter(function(spec) {
    return spec.column > 0 && spec.column + spec.width - 1 <= maxColumns;
  });
  var result = { source: 'sheet-ranges' };

  try {
    if (typeof Sheets === 'undefined' || !Sheets.Spreadsheets || !Sheets.Spreadsheets.Values) {
      throw new Error('Advanced Sheets service tidak tersedia.');
    }
    var lastRow = DB_DATA_START_ROW + rowCount - 1;
    var ranges = usableSpecs.map(function(spec) {
      return dashboardA1Range_(sheet.getName(), spec.column, spec.width, lastRow);
    });
    var response = Sheets.Spreadsheets.Values.batchGet(DB_SPREADSHEET_ID, {
      ranges: ranges,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });
    var valueRanges = response && response.valueRanges || [];
    usableSpecs.forEach(function(spec, index) {
      result[spec.key] = normalizeDashboardMatrix_(
        valueRanges[index] && valueRanges[index].values,
        rowCount,
        spec.width
      );
    });
    result.source = 'sheets-batch';
  } catch (error) {
    // Tetap sediakan jalur SpreadsheetApp bila Advanced Sheets belum aktif.
    usableSpecs.forEach(function(spec) {
      result[spec.key] = sheet
        .getRange(DB_DATA_START_ROW, spec.column, rowCount, spec.width)
        .getValues();
    });
  }

  specs.forEach(function(spec) {
    if (!result[spec.key]) result[spec.key] = blankDashboardMatrix_(rowCount, spec.width);
  });
  return result;
}

function getDashboardLastDataRow_(sheet) {
  var physicalLastRow = sheet.getLastRow();
  if (physicalLastRow < DB_DATA_START_ROW) return DB_DATA_START_ROW - 1;

  // Hindari getNextDataCell(UP): pada Database besar operasi tersebut dapat
  // gagal dengan "Argumen tidak valid" dan memutus seluruh rekapan Dashboard.
  // Potongan dibaca dari bawah supaya pemakaian memori tetap terkendali.
  var chunkSize = 5000;
  for (var endRow = physicalLastRow; endRow >= DB_DATA_START_ROW; endRow -= chunkSize) {
    var startRow = Math.max(DB_DATA_START_ROW, endRow - chunkSize + 1);
    var values = sheet
      .getRange(startRow, DB_COL.SPK, endRow - startRow + 1, 1)
      .getDisplayValues();

    for (var index = values.length - 1; index >= 0; index--) {
      if (!isDashboardValueEmpty_(values[index][0])) return startRow + index;
    }
  }

  return DB_DATA_START_ROW - 1;
}

function readDashboardCache_() {
  try {
    var cache = CacheService.getScriptCache();
    var metaText = cache.get(DASHBOARD_CACHE_META_KEY);
    if (!metaText) return null;

    var meta = JSON.parse(metaText);
    var chunkCount = Number(meta && meta.chunkCount) || 0;
    if (chunkCount < 1 || chunkCount > 100) return null;

    var keys = [];
    for (var index = 0; index < chunkCount; index++) {
      keys.push(DASHBOARD_CACHE_CHUNK_PREFIX + index);
    }

    var cachedChunks = cache.getAll(keys);
    var serialized = '';
    for (var chunkIndex = 0; chunkIndex < keys.length; chunkIndex++) {
      if (!cachedChunks[keys[chunkIndex]]) return null;
      serialized += cachedChunks[keys[chunkIndex]];
    }

    return JSON.parse(serialized);
  } catch (error) {
    return null;
  }
}

function writeDashboardCache_(data) {
  try {
    var cache = CacheService.getScriptCache();
    var cachePayload = {
      totalSPK: Number(data && data.totalSPK) || 0,
      tableData: data && Array.isArray(data.tableData) ? data.tableData : [],
      volumeKgBySpk: data && data.volumeKgBySpk && typeof data.volumeKgBySpk === 'object'
        ? data.volumeKgBySpk
        : {},
      dashboardRecapBySpk: data && data.dashboardRecapBySpk && typeof data.dashboardRecapBySpk === 'object'
        ? data.dashboardRecapBySpk
        : {},
      trackingColumn: Number(data && data.trackingColumn) || 0,
      sourceRevision: String(data && data.sourceRevision || '')
    };
    var serialized = JSON.stringify(cachePayload);
    if (serialized.length > DASHBOARD_CACHE_MAX_SIZE) return;

    var chunks = {};
    var chunkCount = Math.ceil(serialized.length / DASHBOARD_CACHE_CHUNK_SIZE);
    for (var index = 0; index < chunkCount; index++) {
      chunks[DASHBOARD_CACHE_CHUNK_PREFIX + index] = serialized.slice(
        index * DASHBOARD_CACHE_CHUNK_SIZE,
        (index + 1) * DASHBOARD_CACHE_CHUNK_SIZE
      );
    }

    cache.putAll(chunks, DASHBOARD_CACHE_SECONDS);
    cache.put(
      DASHBOARD_CACHE_META_KEY,
      JSON.stringify({ chunkCount: chunkCount }),
      DASHBOARD_CACHE_SECONDS
    );
  } catch (error) {
    // Cache adalah akselerator; kegagalan cache tidak boleh menggagalkan load.
  }
}

function clearDashboardCache_() {
  try {
    var cache = CacheService.getScriptCache();
    var metaText = cache.get(DASHBOARD_CACHE_META_KEY);
    var keys = [DASHBOARD_CACHE_META_KEY];

    if (metaText) {
      var meta = JSON.parse(metaText);
      var chunkCount = Math.min(Math.max(Number(meta.chunkCount) || 0, 0), 100);
      for (var index = 0; index < chunkCount; index++) {
        keys.push(DASHBOARD_CACHE_CHUNK_PREFIX + index);
      }
    }

    cache.removeAll(keys);
  } catch (error) {
    // Data tetap benar karena pembacaan berikutnya dapat langsung ke Sheet.
  }

  // Setiap mutasi database yang membersihkan cache juga mengubah token ini.
  // Dashboard cukup memeriksa token kecil tersebut tanpa menarik seluruh tabel.
  bumpDashboardRevision_();
}

function getDashboardDataRevision() {
  return {
    status: 'success',
    revision: readDashboardRevision_()
  };
}

function readDashboardRevision_() {
  return buildDashboardRevision_(readDashboardSourceRevision_());
}

function buildDashboardRevision_(sourceRevision) {
  return DASHBOARD_SHAPE_VERSION + '-' + String(sourceRevision || 'unknown') + '-' +
    readDashboardRevisionRaw_();
}

// `version` milik Drive bertambah setiap kali file Spreadsheet berubah.
// Ini menangkap edit manual, formula/proses eksternal, dan penulisan dari
// aplikasi lain tanpa bergantung pada semua penulis memanggil fungsi cache.
function readDashboardSourceRevision_() {
  try {
    var file = Drive.Files.get(DB_SPREADSHEET_ID, {
      fields: 'version,modifiedTime'
    });
    return String(file.version || '') + '@' + String(file.modifiedTime || '');
  } catch (error) {
    // Token waktu membuat kegagalan pemeriksaan tidak pernah melegalkan cache
    // lama. Pembacaan berikutnya akan mencoba Drive lagi.
    return 'unverified@' + String(Date.now());
  }
}

function readDashboardRevisionRaw_() {
  try {
    var cache = CacheService.getScriptCache();
    var cachedRevision = cache.get(DASHBOARD_REVISION_CACHE_KEY);
    if (cachedRevision) return cachedRevision;

    var revision = PropertiesService
      .getScriptProperties()
      .getProperty(DASHBOARD_REVISION_PROPERTY_KEY) || '0';
    cache.put(
      DASHBOARD_REVISION_CACHE_KEY,
      revision,
      DASHBOARD_REVISION_CACHE_SECONDS
    );
    return revision;
  } catch (error) {
    return '0';
  }
}

function bumpDashboardRevision_() {
  var revision = String(Date.now());

  try {
    PropertiesService
      .getScriptProperties()
      .setProperty(DASHBOARD_REVISION_PROPERTY_KEY, revision);
  } catch (error) {
    // Cache revision tetap dapat memberi sinyal pada sesi aktif.
  }

  try {
    CacheService
      .getScriptCache()
      .put(
        DASHBOARD_REVISION_CACHE_KEY,
        revision,
        DASHBOARD_REVISION_CACHE_SECONDS
      );
  } catch (error) {
    // Properties menjadi sumber cadangan saat cache tidak tersedia.
  }

  return revision;
}

function normalizeDashboardUom_(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .toUpperCase();
}

function parseDashboardNumber_(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  var text = String(value).trim().replace(/\s+/g, '');
  if (text === '') return null;
  if (text.indexOf(',') > -1 && text.indexOf('.') > -1) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (text.indexOf(',') > -1) {
    text = text.replace(',', '.');
  }

  var number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function dashboardPercentToNumber_(value) {
  var number = parseDashboardNumber_(value);
  if (number === null) return 0;
  return Math.abs(number) <= 1 ? number * 100 : number;
}

function readDashboardMeterRollNote_(note) {
  var match = String(note || '').match(/(?:^|\n)APP_METER_ROLL=([^\n]+)/);
  var value = match ? parseDashboardNumber_(match[1]) : null;
  return value > 0 ? value : null;
}

function deriveDashboardPcsPerKg_(main) {
  var dimensions = parseCalculationDimensions_(
    main[DB_COL.UKURAN_BLOW - DB_COL.SPK],
    main[DB_COL.UKURAN_JADI - DB_COL.SPK]
  );
  if (!(dimensions.lebar > 0) || !(dimensions.panjang > 0) || !(dimensions.tebal > 0)) {
    return null;
  }
  return 5444 / dimensions.panjang / dimensions.tebal / dimensions.lebar;
}

function deriveDashboardMeterPerKg_(main) {
  var dimensions = parseCalculationDimensions_(
    main[DB_COL.UKURAN_BLOW - DB_COL.SPK],
    main[DB_COL.UKURAN_JADI - DB_COL.SPK]
  );
  return calculateMeterPerKg_(
    dimensions.lebar,
    dimensions.tebal,
    getCalculationDensity_(main[DB_COL.MATERIAL - DB_COL.SPK]),
    getFilmLayerFactor_(main[DB_COL.FILM - DB_COL.SPK])
  );
}
function fallbackDashboardOrderKgFromKeluar_(order, totalBsValue) {
  var keluarBahan = parseDashboardNumber_(
    order[DB_COL.KELUAR_BAHAN - DB_COL.JUMLAH_ORDER]
  );
  var uomKeluarBahan = normalizeDashboardUom_(
    order[DB_COL.UOM_KB - DB_COL.JUMLAH_ORDER]
  );
  if (!(keluarBahan >= 0) || uomKeluarBahan !== 'KG') return null;

  var multiplier = 1 + (dashboardPercentToNumber_(totalBsValue) / 100);
  return multiplier > 0 ? keluarBahan / multiplier : null;
}

function calculateDashboardOrderKg_(main, order, conversion, meterRollStored, meterRollNote, totalBsValue) {
  var jumlahOrder = parseDashboardNumber_(
    order[DB_COL.JUMLAH_ORDER - DB_COL.JUMLAH_ORDER]
  );
  var uomOrder = normalizeDashboardUom_(
    order[DB_COL.UOM_ORDER - DB_COL.JUMLAH_ORDER]
  );
  if (!(jumlahOrder >= 0)) return null;
  if (uomOrder === 'KG') return jumlahOrder;

  var factors = Array.isArray(conversion) ? conversion : [];
  if (uomOrder === 'PCS') {
    var pcsPerKg = parseDashboardNumber_(factors[0]);
    if (!(pcsPerKg > 0)) pcsPerKg = deriveDashboardPcsPerKg_(main);
    if (pcsPerKg > 0) return jumlahOrder / pcsPerKg;
    return fallbackDashboardOrderKgFromKeluar_(order, totalBsValue);
  }

  if (uomOrder === 'ROLL') {
    var meterPerKg = parseDashboardNumber_(factors[1]);
    if (!(meterPerKg > 0)) meterPerKg = deriveDashboardMeterPerKg_(main);

    // Meter/Roll hanya berasal dari kolom EC yang diisi manual, atau catatan
    // lama sebagai peninggalan. Tidak ada lagi penurunan dari ukuran dan
    // keluar bahan; bila kosong, volume dihitung lewat jalur keluar bahan.
    var meterRoll = parseDashboardNumber_(meterRollStored);
    if (!(meterRoll > 0)) {
      meterRoll = readDashboardMeterRollNote_(meterRollNote);
    }
    if (meterPerKg > 0 && meterRoll > 0) {
      return jumlahOrder * meterRoll / meterPerKg;
    }
    return fallbackDashboardOrderKgFromKeluar_(order, totalBsValue);
  }

  return null;
}

function getDashboardRouting_(routingCell, processRow) {
  var labels = {
    mixer: 'Mixer',
    blowing: 'Blowing',
    printing: 'Printing',
    slitting: 'Slitting',
    folding: 'Folding',
    gusset: 'Gusset',
    cutting: 'Cutting'
  };
  // Cutting bukan satu proses tunggal: pekerjaannya terbagi menjadi Bottom
  // Seal, Side Seal, dan T-Shirt, dan ketiganya dikerjakan mesin yang berbeda.
  // Dashboard menampilkan jenisnya, bukan kata Cutting, supaya volume tiap
  // jenis terbaca sendiri-sendiri.
  var steps = parseRoutingStepsCell_(routingCell);
  if (steps.length) {
    return steps.map(function(step) {
      if (step.key === 'cutting') {
        // Finishing '-' berarti tidak ada jenis yang dipilih, jadi langkahnya
        // memang bukan pekerjaan cutting mana pun dan tidak ikut dihitung.
        // Nilai kosong diperlakukan sama: keduanya sama-sama tidak menyebut
        // jenis, dan menampilkannya sebagai Cutting akan memunculkan kembali
        // angka gabungan yang justru hendak dihilangkan.
        return normalizeDashboardFinishingLabel_(
          step.values && step.values.finishing ? step.values.finishing : ''
        );
      }
      return labels[step.key] || step.key;
    }).filter(Boolean);
  }

  var fallbackKeys = ['mixer', 'blowing', 'printing', 'slitting', 'folding', 'gusset'];
  var routing = fallbackKeys.filter(function(key, index) {
    return String(processRow && processRow[index] || '').trim() !== '' &&
      String(processRow[index]).trim() !== '-';
  }).map(function(key) {
    return labels[key];
  });

  // Pada data lama ROUTING_STEPS masih kosong. Jenis pekerjaan cutting tetap
  // tersimpan di FINISHING (kolom Z, indeks 6 relatif dari PROSES_MIXER/T).
  // Tanpa fallback ini seluruh TSHIRT lama—serta Bottom/Side Seal lama—hilang
  // dari rekapan dashboard.
  var finishingLabel = normalizeDashboardFinishingLabel_(
    processRow && processRow.length > 6 ? processRow[6] : ''
  );
  if (finishingLabel) routing.push(finishingLabel);
  return routing;
}

function normalizeDashboardFinishingLabel_(value) {
  var normalized = String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  var labels = {
    BOTTOMSEAL: 'Bottom Seal',
    // Ada 13 baris lama di database dengan salah ketik "BOTTM SEAL".
    BOTTMSEAL: 'Bottom Seal',
    SIDESEAL: 'Side Seal',
    TSHIRT: 'T-Shirt'
  };
  return labels[normalized] || '';
}

function normalizeDashboardTracking_(value) {
  var tracking = String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase();
  return ['Q', 'MX', 'BL', 'PR', 'FL', 'GS', 'CT', 'F'].indexOf(tracking) > -1
    ? tracking
    : '';
}

function getDashboardTrackingColumn_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return 0;
  var headerRows = Math.min(DB_DATA_START_ROW, sheet.getMaxRows());
  var headers = sheet.getRange(1, 1, headerRows, lastColumn).getDisplayValues();
  for (var rowIndex = 0; rowIndex < headers.length; rowIndex++) {
    for (var index = 0; index < headers[rowIndex].length; index++) {
      var header = String(headers[rowIndex][index] || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (header === 'TRACKING') return index + 1;
    }
  }
  return sheet.getMaxColumns() >= DASHBOARD_FALLBACK_TRACKING_COLUMN_ ? DASHBOARD_FALLBACK_TRACKING_COLUMN_ : 0;
}

function isDashboardValueEmpty_(value) {
  return value === null ||
    value === undefined ||
    String(value).trim() === "";
}

function formatDashboardSize_(ukuranBlow, ukuranJadi) {
  var blow = String(ukuranBlow === null || ukuranBlow === undefined ? "" : ukuranBlow).trim();
  var jadi = String(ukuranJadi === null || ukuranJadi === undefined ? "" : ukuranJadi).trim();

  if (jadi && blow && jadi !== blow) return "Jadi: " + jadi + " | Blow: " + blow;
  if (jadi) return "Jadi: " + jadi;
  if (blow) return "Blow: " + blow;
  return "";
}

// ==========================================
// PILIHAN TAHUN SPK PER PENGGUNA
//
// Disimpan di UserProperties, bukan di peramban. Alasannya, alamat iframe
// Apps Script berganti setiap halaman dimuat, sehingga localStorage maupun
// sessionStorage selalu kosong pada muat berikutnya.
//
// Nilai 'ALL' mewakili pilihan Semua Tahun. Properti yang belum pernah ada
// berarti pengguna memang belum pernah memilih, dan Dashboard jatuh ke tahun
// data SPK terbaru.
// ==========================================
var SPK_YEAR_PREFERENCE_KEY = 'DASHBOARD_SPK_YEAR';

function getSpkYearPreference() {
  try {
    var tersimpan = PropertiesService.getUserProperties()
      .getProperty(SPK_YEAR_PREFERENCE_KEY);

    if (tersimpan === null || tersimpan === undefined || tersimpan === '') {
      return { status: 'success', tersimpan: false, tahun: '' };
    }
    if (tersimpan === 'ALL') {
      return { status: 'success', tersimpan: true, tahun: '' };
    }
    if (/^\d{4}$/.test(tersimpan)) {
      return { status: 'success', tersimpan: true, tahun: tersimpan };
    }

    // Nilai tak dikenal diperlakukan seperti belum pernah memilih.
    return { status: 'success', tersimpan: false, tahun: '' };
  } catch (error) {
    return {
      status: 'error',
      tersimpan: false,
      tahun: '',
      message: 'Gagal membaca pilihan tahun: ' + (error && error.message ? error.message : error)
    };
  }
}

function saveSpkYearPreference(value) {
  try {
    var teks = String(value === null || value === undefined ? '' : value).trim();

    if (teks !== '' && !/^\d{4}$/.test(teks)) {
      return { status: 'error', message: 'Tahun SPK tidak dikenali: ' + teks };
    }

    PropertiesService.getUserProperties()
      .setProperty(SPK_YEAR_PREFERENCE_KEY, teks === '' ? 'ALL' : teks);

    return { status: 'success', tahun: teks };
  } catch (error) {
    return {
      status: 'error',
      message: 'Gagal menyimpan pilihan tahun: ' + (error && error.message ? error.message : error)
    };
  }
}
