// ==========================================
// KONFIGURASI
// ==========================================
const DB_SPREADSHEET_ID = '1bvyTfFQ1vvzw5ZVj-QUn-XGiyWifjK0lG-GPd0FO9Aw';
// Baris 1 header, baris 2 tipe data, baris 3 sengaja dikosongkan sebagai
// pemisah. Seluruh pembacaan, penulisan, pengurutan, dan pengindeksan
// bertumpu pada konstanta ini, sehingga baris 3 tidak pernah tersentuh.
const DB_DATA_START_ROW = 4;
const DB_MAX_BAHAN = 8;
const DB_MAX_WARNA = 10;

// Peta kolom (1-indexed) sesuai layout sheet Database
const DB_COL = {
  SPK: 1, TANGGAL: 2, JENIS_ORDER: 3, MARKETING: 4, NOMOR_PO: 5,
  CUSTOMER: 6, MATERIAL: 7, FILM: 8, ARTIKEL: 9, MODEL_KANTONG: 10,
  UKURAN_BLOW: 11, UKURAN_JADI: 12,
  LEBAR_JADI: 13, PANJANG_JADI: 14, TEBAL: 15, LEBAR_BAHAN: 16,
  DENSITY: 17, PCS_PER_KG: 18, METER_PER_KG: 19,
  // 13-19 (M-S) = dimensi dan konversi yang dihitung Spreadsheet/aplikasi.
  PROSES_MIXER: 20, PROSES_BLOWING: 21, PROSES_PRINTING: 22,
  PROSES_SLITTING: 23, PROSES_FOLDING: 24, PROSES_GUSSET: 25,
  FINISHING: 26, HANDLE_PON: 27,
  BS_START: 28, BS_END: 39,
  TOTAL_BS: 40,
  // 41-43 (AO-AQ) = rumus dikelola langsung di Spreadsheet; aplikasi tidak menulis.
  JUMLAH_ORDER: 44, UOM_ORDER: 45, KELUAR_BAHAN: 46, UOM_KB: 47,
  TOLERANSI: 48, ETD: 49,
  KOMPOSISI_START: 50,
  TOTAL_KOMPOSISI_KG: 72,
  TOTAL_KOMPOSISI_PERCENT: 73,
  WARNA_START: 74, // BV, 10 slot Warna + Pemakaian (Printing)
  WARNA_END: 93, // CO
  SPK_REFERENSI: 94, // CP, jejak SPK sumber untuk Repeat Order
  RELEASE: 95, // CQ, status dokumen SPK sudah dipilih untuk dicetak
  KETERANGAN_ARTIKEL: 96, // CR, catatan/deskripsi artikel
  KET_PROSES_START: 97, // CS
  KET_MIX: 97,
  KET_BLOW: 98,
  KET_PRINT: 99,
  KET_SLIT: 100,
  KET_FLD: 101,
  KET_GST: 102,
  KET_BTS: 103,
  KET_SS: 104,
  KET_TSHIRT: 105, // DA
  ETA_BELI_START: 106, // DB
  ETA_BELI_END: 120, // DP
  ETA_BELI_KETERANGAN: 121, // DQ
  KODE_ITEM: 122, // DR, kode item/SKU artikel
  BLOWING_THREAT: 123, // DS
  BLOWING_MODE_CETAK: 124, // DT
  PRINTING_KODE_SILINDER: 125, // DU
  UKURAN_FOLDING: 126, // DV
  UKURAN_SLITTING: 127, // DW
  UKURAN_GUSSET: 128, // DX
  JENIS_PACKING: 129, // DY
  PACKING: 130, // DZ
  KETERANGAN_WARNA: 131, // EA, catatan warna pada Data Utama
  KETERANGAN_BAHAN: 132, // EB, catatan bahan pada Data Utama
  METER_ROLL: 133, // EC, panjang meter untuk setiap roll
  // Kolom 134-149 mengikuti struktur native V2 yang sudah ditetapkan.
  // Urutan alur produksi sebagai JSON. Satu langkah = satu entri, sehingga
  // proses yang sama boleh muncul lebih dari sekali dengan detail dan target
  // BS-nya masing-masing. Kolom proses T:Y, %BS AB:AM, dan kolom detail
  // DS:DZ tetap ditulis seperti sebelumnya sebagai ringkasan, agar Dashboard,
  // Keluar Bahan, dan rumus Spreadsheet tidak perlu ikut berubah.
  ROUTING_STEPS: 134, // ED
  // Tambahan hasil rapat: mode konversi PCS/KG, jenis potongan, tanggal PO
  // masuk, penyesuaian stok/OTS/WIP, toleransi produksi, dan jadwal kirim
  // bertahap.
  PCS_KG_MODE: 135, // EE
  JENIS_POTONGAN: 136, // EF
  PO_MASUK: 137, // EG
  STOK: 138, // EH
  OTS: 139, // EI
  WIP: 140, // EJ
  TOLERANSI_PRODUKSI: 141, // EK
  PENGIRIMAN_PARSIAL: 142, // EL
  // Ukuran bahan yang diketik manual pada form. Kolom M:Q tetap memakai rumus
  // Spreadsheet dan tidak disentuh; keempat kolom ini menyimpan angka versi
  // operator, yang dipakai aplikasi untuk menghitung PCS/KG dan Keluar Bahan.
  BAHAN_LEBAR: 143, // EM
  BAHAN_PANJANG: 144, // EN
  BAHAN_TEBAL: 145, // EO
  BAHAN_DENSITY: 146, // EP
  // Ringkasan aksesoris per langkah. Rincian lengkap tetap berada dalam
  // Urutan Routing agar proses yang sama dapat dipakai berulang kali.
  AKSESORIS_ROUTING: 147, // EQ
  KEBUTUHAN_AKSESORIS: 148, // ER
  UOM_AKSESORIS: 149 // ES
};

// Payload routing JSON dibatasi agar aman disimpan dan diteruskan ke tabel V2.
const ROUTING_STEPS_MAX_LENGTH = 45000;

const PCS_KG_MODE_OPTIONS = ['', 'LEMBARAN', 'KANTONG'];
const JENIS_POTONGAN_OPTIONS = ['', 'BC', 'BB', 'BLL', 'SK', 'SS', 'SB', 'SSL'];
const JENIS_BAHAN_OPTIONS = ['HDPE', 'LLDPE', 'SHRINK', 'PP', 'OPP', 'CPP'];
const FILM_OPTIONS = ['SHEET', 'TUBE'];
const MARKETING_OPTIONS = [
  'Sri Yamtinah', 'Siti Juheriah', 'Mutiara', 'Adel',
  'Welis', 'Lutfi', 'Puput', 'Ersa', 'Michelle'
];


const MACHINE_SHEET_NAME = 'Database Mesin';
const MACHINE_DATA_START_ROW = 2;
const MACHINE_HEADERS = [
  'Kode Mesin', 'Nama Mesin', 'Divisi', 'Jenis Proses', 'Status', 'Urutan'
];
const MACHINE_OPTIONS_CACHE_KEY = 'spk-machine-options-v1';

function appendMachineSeedRange_(rows, codePrefix, namePrefix, count, division, processType, pad) {
  for (let index = 1; index <= count; index++) {
    const number = String(index).padStart(pad === undefined ? 2 : pad, '0');
    rows.push([
      codePrefix + number,
      namePrefix + number,
      division,
      processType || '',
      'AKTIF',
      index
    ]);
  }
}

function defaultMachineRows_() {
  const rows = [];
  appendMachineSeedRange_(rows, 'MX-HD-', 'MIXER HD', 6, 'MIXER', 'HD');
  appendMachineSeedRange_(rows, 'MX-PE-', 'MIXER PE', 11, 'MIXER', 'PE');
  appendMachineSeedRange_(rows, 'MX-PP-', 'MIXER PP', 1, 'MIXER', 'PP');
  appendMachineSeedRange_(rows, 'BL-HD-', 'BLOWING HD', 6, 'BLOWING', 'HD');
  appendMachineSeedRange_(rows, 'BL-PE-', 'BLOWING PE', 11, 'BLOWING', 'PE');
  appendMachineSeedRange_(rows, 'BL-PP-', 'BLOWING PP', 4, 'BLOWING', 'PP');

  ['1A', '1B', '2A', '2B', '3A', '3B'].forEach(function(number, index) {
    rows.push(['PR-' + number, 'PRINTING ' + number, 'PRINTING', '', 'AKTIF', index + 1]);
  });

  appendMachineSeedRange_(rows, 'FL-', 'FOLDING', 4, 'FOLDING', '');
  appendMachineSeedRange_(rows, 'SL-', 'SLITTING', 5, 'SLITTING', '');
  appendMachineSeedRange_(rows, 'GS-', 'GUSSET', 3, 'GUSSET', '');
  appendMachineSeedRange_(rows, 'CT-BS-', 'BOTTOM SEAL ', 23, 'CUTTING', 'BOTTOM SEAL');
  appendMachineSeedRange_(rows, 'CT-SS-', 'SIDE SEAL ', 19, 'CUTTING', 'SIDE SEAL');
  appendMachineSeedRange_(rows, 'CT-TS-', 'TSHIRT', 3, 'CUTTING', 'TSHIRT');
  return rows;
}

function emptyMachineOptions_() {
  return {
    mixer: [], blowing: [], printing: [], folding: [], slitting: [], gusset: [],
    cutting: { 'BOTTOM SEAL': [], 'SIDE SEAL': [], 'TSHIRT': [] }
  };
}

function defaultMachineOptions_() {
  return buildMachineOptionsFromRows_(defaultMachineRows_());
}

function buildMachineOptionsFromRows_(rows) {
  const result = emptyMachineOptions_();
  const seen = Object.create(null);

  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    const name = String(row[1] || '').trim().replace(/\s+/g, ' ');
    const division = String(row[2] || '').trim().toUpperCase();
    const processType = String(row[3] || '').trim().toUpperCase();
    const status = String(row[4] || 'AKTIF').trim().toUpperCase();
    if (!name || status === 'NONAKTIF' || status === 'TIDAK AKTIF') return;

    let target;
    let groupKey;
    if (division === 'CUTTING') {
      if (!Object.prototype.hasOwnProperty.call(result.cutting, processType)) return;
      target = result.cutting[processType];
      groupKey = 'CUTTING|' + processType;
    } else {
      const key = division.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(result, key) || key === 'cutting') return;
      target = result[key];
      groupKey = division;
    }

    const uniqueKey = groupKey + '|' + name.toUpperCase();
    if (seen[uniqueKey]) return;
    seen[uniqueKey] = true;
    target.push(name);
  });

  return result;
}

function readCachedMachineOptions_() {
  try {
    const serialized = CacheService.getScriptCache().get(MACHINE_OPTIONS_CACHE_KEY);
    if (!serialized) return null;
    const values = JSON.parse(serialized);
    return values && typeof values === 'object' ? values : null;
  } catch (error) {
    return null;
  }
}

function writeCachedMachineOptions_(values) {
  try {
    CacheService.getScriptCache().put(
      MACHINE_OPTIONS_CACHE_KEY,
      JSON.stringify(values || emptyMachineOptions_()),
      INPUT_OPTIONS_CACHE_SECONDS
    );
  } catch (error) {
    // Cache hanya akselerator; daftar tetap dapat dibaca dari Spreadsheet.
  }
}

function clearMachineOptionsCache_() {
  try {
    CacheService.getScriptCache().remove(MACHINE_OPTIONS_CACHE_KEY);
  } catch (error) {
    // Cache hanya akselerator; kegagalan menghapus tidak membatalkan pembaruan.
  }
}

function getMachineOptionsFromMaster_(spreadsheet) {
  const cached = readCachedMachineOptions_();
  if (cached) return cached;

  const ss = spreadsheet || SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MACHINE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < MACHINE_DATA_START_ROW) {
    adminSetupDatabaseMesin();
    sheet = ss.getSheetByName(MACHINE_SHEET_NAME);
  }
  if (!sheet || sheet.getLastRow() < MACHINE_DATA_START_ROW) {
    const defaults = defaultMachineOptions_();
    writeCachedMachineOptions_(defaults);
    return defaults;
  }

  const rows = sheet
    .getRange(MACHINE_DATA_START_ROW, 1, sheet.getLastRow() - MACHINE_DATA_START_ROW + 1, MACHINE_HEADERS.length)
    .getDisplayValues();
  const options = buildMachineOptionsFromRows_(rows);
  writeCachedMachineOptions_(options);
  return options;
}

// Jalankan sekali setelah kode disimpan. Fungsi aman dijalankan ulang:
// data mesin buatan pengguna dipertahankan dan hanya mesin awal yang belum ada
// yang akan ditambahkan.
function adminSetupDatabaseMesin() {
  const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MACHINE_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(MACHINE_SHEET_NAME);

  if (sheet.getMaxColumns() < MACHINE_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), MACHINE_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, MACHINE_HEADERS.length).setValues([MACHINE_HEADERS]);
  sheet.setFrozenRows(1);

  const existingNames = Object.create(null);
  if (sheet.getLastRow() >= MACHINE_DATA_START_ROW) {
    sheet
      .getRange(MACHINE_DATA_START_ROW, 2, sheet.getLastRow() - MACHINE_DATA_START_ROW + 1, 1)
      .getDisplayValues()
      .forEach(function(row) {
        const key = String(row[0] || '').trim().replace(/\s+/g, ' ').toUpperCase();
        if (key) existingNames[key] = true;
      });
  }

  const missingRows = defaultMachineRows_().filter(function(row) {
    return !existingNames[String(row[1] || '').toUpperCase()];
  });
  if (missingRows.length) {
    sheet
      .getRange(Math.max(MACHINE_DATA_START_ROW, sheet.getLastRow() + 1), 1, missingRows.length, MACHINE_HEADERS.length)
      .setValues(missingRows);
  }

  const lastRow = Math.max(1, sheet.getLastRow());
  sheet.getRange(1, 1, lastRow, MACHINE_HEADERS.length).setVerticalAlignment('middle');
  sheet.getRange(1, 1, 1, MACHINE_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#202327')
    .setFontColor('#ffffff');
  if (lastRow >= MACHINE_DATA_START_ROW) {
    const statusRange = sheet.getRange(MACHINE_DATA_START_ROW, 5, lastRow - MACHINE_DATA_START_ROW + 1, 1);
    statusRange.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(['AKTIF', 'NONAKTIF'], true)
        .setAllowInvalid(false)
        .build()
    );
  }
  sheet.autoResizeColumns(1, MACHINE_HEADERS.length);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 130);
  SpreadsheetApp.flush();
  clearMachineOptionsCache_();

  return {
    status: 'success',
    sheet: MACHINE_SHEET_NAME,
    totalMesin: Math.max(0, sheet.getLastRow() - 1),
    mesinDitambahkan: missingRows.length
  };
}

// Kolom sederhana yang cukup ditulis apa adanya. Judul dan tipe dibuat sekali
// bila selnya masih kosong, mengikuti pola ensure* yang sudah dipakai.
// Dibentuk sebagai fungsi, bukan konstanta, karena nomor kolomnya ikut
// menyesuaikan tata letak sheet yang sedang dibuka.
const ROUTING_DETAIL_COLUMNS = [
  { key: 'blowingThreat', column: DB_COL.BLOWING_THREAT, header: 'Blowing Threat' },
  { key: 'blowingModeCetak', column: DB_COL.BLOWING_MODE_CETAK, header: 'Blowing Mode Cetak' },
  { key: 'printingKodeSilinder', column: DB_COL.PRINTING_KODE_SILINDER, header: 'Kode Silinder' },
  { key: 'ukuranFolding', column: DB_COL.UKURAN_FOLDING, header: 'Ukuran Folding' },
  { key: 'ukuranSlitting', column: DB_COL.UKURAN_SLITTING, header: 'Ukuran Slitting' },
  { key: 'ukuranGusset', column: DB_COL.UKURAN_GUSSET, header: 'Ukuran Gusset' },
  { key: 'jenisPacking', column: DB_COL.JENIS_PACKING, header: 'Jenis Packing' },
  { key: 'packing', column: DB_COL.PACKING, header: 'Packing' }
];

const ETA_BELI_COLUMNS = [
  { eta: DB_COL.ETA_BELI_START, qty: DB_COL.ETA_BELI_START + 1, uom: DB_COL.ETA_BELI_START + 2 },
  { eta: DB_COL.ETA_BELI_START + 3, qty: DB_COL.ETA_BELI_START + 4, uom: DB_COL.ETA_BELI_START + 5 },
  { eta: DB_COL.ETA_BELI_START + 6, qty: DB_COL.ETA_BELI_START + 7, uom: DB_COL.ETA_BELI_START + 8 },
  { eta: DB_COL.ETA_BELI_START + 9, qty: DB_COL.ETA_BELI_START + 10, uom: DB_COL.ETA_BELI_START + 11 },
  { eta: DB_COL.ETA_BELI_START + 12, qty: DB_COL.ETA_BELI_START + 13, uom: DB_COL.ETA_BELI_END }
];

const PROSES_KEYS = ['mixer', 'blowing', 'printing', 'slitting', 'folding', 'gusset'];
const PROSES_LABELS = {
  mixer: 'MIXER', blowing: 'BLOWING', printing: 'PRINTING',
  slitting: 'SLITTING', folding: 'FOLDING', gusset: 'GUSSET'
};

const PROCESS_NOTE_KEYS = [
  'mixer', 'blowing', 'printing', 'slitting', 'folding',
  'gusset', 'bottomSeal', 'sideSeal', 'tshirt'
];
const BS_KEYS = [
  'blowing', 'printing', 'slitting', 'folding', 'gusset', 'sheet',
  'pon', 'tshirt', 'bottomSeal', 'sideSeal', 'handle', 'sheetSlitting'
];
const BS_LABELS = {
  blowing: 'Blowing',
  printing: 'Printing',
  slitting: 'Slitting',
  folding: 'Folding',
  gusset: 'Gusset',
  sheet: 'Sheet',
  pon: 'Pon',
  tshirt: 'T-Shirt',
  bottomSeal: 'Bottom Seal',
  sideSeal: 'Side Seal',
  handle: 'Handle',
  sheetSlitting: 'Sheet Slitting'
};

const FINISHING_OPTIONS = ['-', 'BOTTOM SEAL', 'SIDE SEAL', 'TSHIRT'];
const HANDLE_PON_OPTIONS = ['-', 'HANDLE', 'PON'];

// ==========================================
// WEB APP ENTRY POINT
// ==========================================
// doGet function has been moved to BE-Dashboard.js to handle routing centrally

// Digunakan oleh pencarian sheet master yang menerima variasi spasi/huruf.
function normalizeSheetName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// ==========================================
// CEK DUPLIKAT SPK
// ==========================================
// Pilihan form disimpan singkat; keberadaan SPK selalu diperiksa langsung
// terhadap direktori SPK Master V2 agar tidak bergantung pada nomor baris.
const INPUT_OPTIONS_CACHE_SECONDS = 1800;
const MARKETING_OPTIONS_CACHE_KEY = 'spk-marketing-options-v3-native-v2-normalized';
const CUSTOMER_OPTIONS_CACHE_KEY = 'spk-customer-options-v1';

function readCachedMarketingOptions_() {
  try {
    const serialized = CacheService.getScriptCache().get(MARKETING_OPTIONS_CACHE_KEY);
    if (!serialized) return null;
    const values = JSON.parse(serialized);
    return Array.isArray(values) ? values : null;
  } catch (error) {
    return null;
  }
}

function writeCachedMarketingOptions_(values) {
  try {
    CacheService.getScriptCache().put(
      MARKETING_OPTIONS_CACHE_KEY,
      JSON.stringify(values || []),
      INPUT_OPTIONS_CACHE_SECONDS
    );
  } catch (error) {
    // Cache hanya akselerator; daftar tetap dapat dibaca dari Spreadsheet.
  }
}

function clearMarketingOptionsCache_() {
  try {
    CacheService.getScriptCache().remove(MARKETING_OPTIONS_CACHE_KEY);
  } catch (error) {
    // Cache hanya akselerator; kegagalan menghapus tidak membatalkan mutasi.
  }
}

function readCachedCustomerOptions_() {
  try {
    const serialized = CacheService.getScriptCache().get(CUSTOMER_OPTIONS_CACHE_KEY);
    if (!serialized) return null;
    const values = JSON.parse(serialized);
    return Array.isArray(values) ? values : null;
  } catch (error) {
    return null;
  }
}

function writeCachedCustomerOptions_(values) {
  try {
    CacheService.getScriptCache().put(
      CUSTOMER_OPTIONS_CACHE_KEY,
      JSON.stringify(values || []),
      INPUT_OPTIONS_CACHE_SECONDS
    );
  } catch (error) {
    // Cache hanya akselerator; daftar tetap dapat dibaca dari Spreadsheet.
  }
}

function clearCustomerOptionsCache_() {
  try {
    CacheService.getScriptCache().remove(CUSTOMER_OPTIONS_CACHE_KEY);
  } catch (error) {
    // Cache hanya akselerator; kegagalan menghapus tidak membatalkan mutasi.
  }
}

// Jalur ringan untuk Input SPK. Hanya kolom Marketing yang dibaca, tanpa
// membangun indeks ribuan nomor SPK terlebih dahulu.
function getCustomerOptionsFromMaster_(spreadsheet) {
  const cached = readCachedCustomerOptions_();
  if (cached) return cached;

  const ss = spreadsheet || SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sheet = findCustomersSheet_(ss);
  if (!sheet || sheet.getLastRow() < MASTER_DATA_START_ROW) {
    writeCachedCustomerOptions_([]);
    return [];
  }

  const nameColumn = masterColumnIndex_(CUSTOMER_COLUMNS, 'Nama Customer');
  if (!nameColumn) return [];

  const values = sheet
    .getRange(
      MASTER_DATA_START_ROW,
      nameColumn,
      sheet.getLastRow() - MASTER_DATA_START_ROW + 1,
      1
    )
    .getDisplayValues();
  const seen = Object.create(null);
  const options = [];

  values.forEach(function(row) {
    const value = String(row[0] || '').trim().replace(/\s+/g, ' ');
    const key = value.toUpperCase();
    if (value === '' || value === '-' || seen[key]) return;
    seen[key] = true;
    options.push(value);
  });

  options.sort(function(left, right) {
    return left.toUpperCase().localeCompare(right.toUpperCase());
  });
  writeCachedCustomerOptions_(options);
  return options;
}

function getInputSpkOptionsFast() {
  const startedAt = Date.now();
  try {
    const cachedMarketing = readCachedMarketingOptions_();
    const cachedCustomers = readCachedCustomerOptions_();
    const cachedMachines = readCachedMachineOptions_();
    let spreadsheet = null;

    if (!cachedCustomers || !cachedMachines) {
      spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    }

    let marketingOptions = cachedMarketing;
    if (!marketingOptions) {
      marketingOptions = getDatabaseV2SpkDirectory_().marketingOptions;
      writeCachedMarketingOptions_(marketingOptions);
    }
    const customerOptions = cachedCustomers || getCustomerOptionsFromMaster_(spreadsheet);
    const machineOptions = cachedMachines || getMachineOptionsFromMaster_(spreadsheet);
    return {
      status: 'success',
      marketingOptions: marketingOptions,
      customerOptions: customerOptions,
      machineOptions: machineOptions,
      performance: {
        source: cachedMarketing && cachedCustomers && cachedMachines ? 'cache' : 'database-v2',
        durationMs: Date.now() - startedAt
      }
    };
  } catch (error) {
    return { status: 'error', message: error && error.message ? error.message : String(error) };
  }
}

function checkSpkExists(spk) {
  const startedAt = Date.now();
  try {
    const key = normalizeSpk_(spk);
    if (key === '') return { status: 'success', exists: false };

    const directory = getDatabaseV2SpkDirectory_();
    return {
      status: 'success',
      exists: directory.spks.indexOf(key) !== -1,
      performance: {
        source: directory.source,
        durationMs: Date.now() - startedAt
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// Dipanggil saat form dibuka. Selain menghangatkan cache server, daftar ini
// membuat pengecekan berikutnya dapat diselesaikan langsung di browser.
function getSpkExistenceSnapshot() {
  const startedAt = Date.now();
  try {
    const cachedCustomers = readCachedCustomerOptions_();
    const directory = getDatabaseV2SpkDirectory_();
    const marketingOptions = directory.marketingOptions;
    const customerOptions = cachedCustomers || getCustomerOptionsFromMaster_();
    const machineOptions = readCachedMachineOptions_() || getMachineOptionsFromMaster_();
    return {
      status: 'success',
      spks: directory.spks,
      marketingOptions: marketingOptions,
      customerOptions: customerOptions,
      machineOptions: machineOptions,
      performance: {
        source: directory.source,
        durationMs: Date.now() - startedAt
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function normalizeSpk_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toUpperCase();
}

// Peta nomor SPK ke nomor barisnya, dibaca segar dari sheet. Dipakai penarikan
// data untuk memeriksa ulang keberadaan SPK tepat sebelum menulis, karena peta
// yang dibangun di awal proses bisa tertinggal bila ada SPK baru disimpan
// lewat Input SPK sementara penarikan berjalan.
function normalizeSourceSpk_(value) {
  const normalized = normalizeSpk_(value);
  const matches = normalized.match(/[A-Z]\d{2}\.\d{3}/g) || [];
  const uniqueMatches = Array.from(new Set(matches));

  return uniqueMatches.length === 1 ? uniqueMatches[0] : '';
}

function numericSpkSortPart_(value) {
  const digits = String(value || '').replace(/^0+(?=\d)/, '');
  return String(digits.length).padStart(4, '0') + ':' + digits.padStart(20, '0');
}

function naturalSpkSuffixKey_(value) {
  const parts = String(value || '')
    .toUpperCase()
    .match(/\d+|\D+/g) || [];

  return parts
    .map(function(part) {
      return /^\d+$/.test(part)
        ? '1' + numericSpkSortPart_(part)
        : '0' + part.replace(/\s+/g, ' ').trim();
    })
    .join('|');
}

function buildSpkSortKey_(value, originalIndex) {
  const normalized = normalizeSpk_(value).replace(/\s+/g, '');
  const stableIndex = String(originalIndex || 0).padStart(12, '0');

  if (normalized === '') return '9|EMPTY|' + stableIndex;

  // Format SPK: huruf = bulan (A=Januari ... L=Desember), angka pertama =
  // tahun, angka kedua = nomor urut. Urutan kronologis menuntut tahun
  // dibandingkan lebih dulu, baru bulan, baru nomor urut; jika huruf bulan
  // didahulukan, A26 (Jan 2026) akan naik ke atas B25 (Feb 2025).
  const standard = normalized.match(/^([A-Z]+)(\d+)[.\-/](\d+)(.*)$/);
  if (standard) {
    return [
      '0',
      numericSpkSortPart_(standard[2]),
      standard[1],
      numericSpkSortPart_(standard[3]),
      naturalSpkSuffixKey_(standard[4]),
      normalized,
      stableIndex
    ].join('|');
  }

  return '8|' + naturalSpkSuffixKey_(normalized) + '|' + normalized + '|' + stableIndex;
}

// Kode item ditulis apa adanya (huruf besar/kecil dipertahankan), hanya
// dirapikan dari spasi berlebih dan dibatasi panjangnya.
function normalizeKodeItem_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

// Penulisan kolom DR dilewati bila kolomnya belum dibuat di Spreadsheet,
// sehingga simpan/edit tetap berhasil dan data lain tidak ikut gagal.
// Membaca satu baris penuh A:EC. Bila kolom tambahan belum dibuat di
// Spreadsheet, lebar bacanya dipersempit lalu hasilnya dipad agar seluruh
// indeks DB_COL tetap aman dipakai tanpa memicu error range.
// Dapat dijalankan sekali dari editor Apps Script setelah pembaruan. Proses
// simpan SPK juga memanggil pemeriksaan yang sama, jadi fungsi ini aman bila
// dijalankan lebih dari sekali dan tidak mengubah data yang sudah ada.
function normalizeEnumValue_(value, options, fallback) {
  const text = String(value === null || value === undefined ? '' : value).trim().toUpperCase();
  const match = options.find(function(option) {
    return String(option).toUpperCase() === text;
  });
  return match === undefined ? (fallback === undefined ? '' : fallback) : match;
}

// Satu baris jadwal kirim: tanggal, jumlah, dan satuannya. Disimpan sebagai
// JSON di satu kolom supaya jumlah barisnya tidak dibatasi lebar sheet.
function parsePengirimanParsialCell_(cellValue) {
  const raw = String(cellValue === null || cellValue === undefined ? '' : cellValue).trim();
  if (raw === '') return [];

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(function(entry) {
      if (!entry || typeof entry !== 'object') return null;
      const tanggal = String(entry.tanggal || '').trim().slice(0, 10);
      const jumlah = parseCalculationNumber_(entry.jumlah);
      const uom = normalizeEnumValue_(entry.uom, ['PCS', 'KG', 'ROLL'], '');
      // Full berarti tahap itu mengambil sisa order; nilainya tetap ikut
      // disimpan sebagai angka agar pembacanya tidak perlu menghitung ulang.
      const mode = normalizeEnumValue_(entry.mode, ['FULL', 'CUSTOM'], 'FULL');
      if (tanggal === '' && jumlah === null) return null;
      return {
        tanggal: tanggal,
        mode: mode,
        jumlah: jumlah === null ? '' : jumlah,
        uom: uom
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function serializePengirimanParsial_(entries) {
  const clean = parsePengirimanParsialCell_(JSON.stringify(entries || []));
  return clean.length ? JSON.stringify(clean) : '';
}

const ROUTING_ACCESSORY_UOMS = ['PCS', 'KG', 'ROLL', 'METER', 'LITER', 'SET', 'UNIT', 'PACK'];
function parseRoutingAccessoryEntries_(raw) {
  let parsed = [];
  try {
    parsed = JSON.parse(String(raw || '[]'));
  } catch (error) {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 12).map(function(entry) {
    const kebutuhan = parseCalculationNumber_(entry && entry.kebutuhan);
    const uom = normalizeEnumValue_(entry && entry.uom, ROUTING_ACCESSORY_UOMS, '');
    return {
      nama: String(entry && entry.nama || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      kebutuhan: kebutuhan === null ? '' : kebutuhan,
      uom: uom
    };
  }).filter(function(entry) {
    return entry.nama !== '' && entry.kebutuhan > 0 && entry.uom !== '';
  });
}

function validateRoutingAccessoryPayload_(routingSteps) {
  if (!Array.isArray(routingSteps)) return null;
  for (let stepIndex = 0; stepIndex < routingSteps.length; stepIndex += 1) {
    const step = routingSteps[stepIndex];
    if (!step || step.key === 'mixer') continue;
    const values = step.values && typeof step.values === 'object' ? step.values : {};
    const raw = String(values['aksesorisData-' + step.key] || '').trim();
    if (raw === '') continue;

    let entries;
    try {
      entries = JSON.parse(raw);
    } catch (error) {
      return 'Data aksesoris pada langkah ' + (stepIndex + 1) + ' tidak valid.';
    }
    if (!Array.isArray(entries) || entries.length > 12) {
      return 'Maksimal 12 aksesoris pada setiap langkah routing.';
    }
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index] || {};
      const nama = String(entry.nama || '').trim();
      const kebutuhan = parseCalculationNumber_(entry.kebutuhan);
      const uom = normalizeEnumValue_(entry.uom, ROUTING_ACCESSORY_UOMS, '');
      if (nama === '' || !(kebutuhan > 0) || uom === '') {
        return 'Lengkapi nama, kebutuhan, dan UOM aksesoris pada langkah ' + (stepIndex + 1) + '.';
      }
    }
  }
  return null;
}

// Ditulis sebagai satu rentang berurutan, lima belas kolom mulai dari Mode
// PCS/KG. Posisi awalnya mengikuti tata letak sheet yang sedang dibuka.
// Judul dan tipe diisi per kolom, bukan sebagai satu rentang, dan hanya bila
// selnya masih kosong, supaya judul yang sudah diubah manual tidak tertimpa.
// Bentuk yang disimpan: [{ key, values: { idInput: nilai } }]. Baris lama yang
// selnya masih kosong menghasilkan daftar kosong, dan pemanggilnya jatuh balik
// ke kolom proses T:Y seperti perilaku sebelumnya.
function parseRoutingStepsCell_(cellValue) {
  const raw = String(cellValue === null || cellValue === undefined ? '' : cellValue).trim();
  if (raw === '') return [];

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map(function(step) {
      if (!step || typeof step !== 'object') return null;
      const key = String(step.key || '').trim();
      if (PROSES_KEYS.indexOf(key) === -1 && key !== 'cutting') return null;

      const values = {};
      const source = step.values && typeof step.values === 'object' ? step.values : {};
      Object.keys(source).forEach(function(fieldId) {
        const value = source[fieldId];
        if (value === null || value === undefined) return;
        const maxLength = fieldId.indexOf('aksesorisData-') === 0 ? 6000 : 400;
        values[fieldId] = String(value).slice(0, maxLength);
      });
      return { key: key, values: values };
    })
    .filter(Boolean);
}

function serializeRoutingSteps_(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  const clean = parseRoutingStepsCell_(JSON.stringify(steps));
  if (!clean.length) return '';

  const encoded = JSON.stringify(clean);
  // Sel Spreadsheet menampung 50.000 karakter. Bila terlampaui, urutan
  // disimpan tanpa detail supaya minimal alurnya tidak hilang.
  if (encoded.length <= ROUTING_STEPS_MAX_LENGTH) return encoded;
  return JSON.stringify(clean.map(function(step) {
    return { key: step.key, values: {} };
  }));
}

// Hanya mengisi teks header/tipe bila selnya masih kosong. Kolom DR tidak
// pernah disisipkan dari kode; kolomnya dibuat manual di Spreadsheet.
function getProcessNotesFromRow_(row) {
  const result = {};
  PROCESS_NOTE_KEYS.forEach(function(keyName, index) {
    result[keyName] = valueOrEmpty_(
      row[DB_COL.KET_PROSES_START - 1 + index]
    );
  });
  return result;
}

function normalizeProcessNote_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .slice(0, 300);
}

// Dulu isinya dipaksa berbentuk angka atau angka+angka. Di lapangan ada juga
// yang menulisnya sebagai teks seperti "1 Warna", jadi isinya kini bebas dan
// hanya dirapikan spasinya.
function normalizeKeteranganWarna_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function normalizeKeteranganBahan_(value) {
  var normalized = String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (normalized === 'BAHAN INTERNAL' || normalized === 'INTERNAL') return 'BAHAN INTERNAL';
  if (
    normalized === 'BAHAN DARI LUAR' ||
    normalized === 'BAHAN LUAR' ||
    normalized === 'DARI LUAR' ||
    normalized === 'LUAR' ||
    normalized === 'EKSTERNAL' ||
    normalized === 'EXTERNAL'
  ) return 'BAHAN DARI LUAR';
  return '';
}

// ==========================================
// CACHE DATA SPK DETAIL (REPEAT ORDER & EDIT)
// ==========================================
var SPK_DATA_CACHE_PREFIX = 'pgm:spk:data:v1:';
var SPK_DATA_CACHE_SECONDS = 21600; // 6 jam

function readCachedSpkData_(key) {
  try {
    if (typeof CacheService === 'undefined') return null;
    var cache = CacheService.getScriptCache();
    if (!cache) return null;
    var serialized = cache.get(SPK_DATA_CACHE_PREFIX + key);
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    return null;
  }
}

function writeCachedSpkData_(key, data) {
  try {
    if (typeof CacheService === 'undefined') return;
    var cache = CacheService.getScriptCache();
    if (!cache) return;
    var serialized = JSON.stringify(data);
    if (serialized.length < 95000) {
      cache.put(
        SPK_DATA_CACHE_PREFIX + key,
        serialized,
        SPK_DATA_CACHE_SECONDS
      );
    }
  } catch (error) {}
}

function clearSpkDataCache_(spk) {
  try {
    var key = normalizeSpk_(spk);
    if (!key || typeof CacheService === 'undefined') return;
    var cache = CacheService.getScriptCache();
    if (cache) cache.remove(SPK_DATA_CACHE_PREFIX + key);
  } catch (error) {}
}

// ==========================================
// AMBIL DATA SPK UNTUK REPEAT ORDER
// ==========================================
function getSpkData(spk) {
  var startedAt = Date.now();
  try {
    var key = normalizeSpk_(spk);
    if (!key) return { status: 'not_found', found: false, message: 'Nomor SPK sebelumnya wajib diisi.' };

    var cached = readCachedSpkData_(key);
    if (cached) {
      return {
        status: 'success',
        found: true,
        data: cached,
        performance: { source: 'cache', durationMs: Date.now() - startedAt }
      };
    }

    var aggregate = readDatabaseV2Spk_(key);
    if (!aggregate) {
      return { status: 'not_found', found: false, message: "Nomor SPK '" + key + "' tidak ditemukan di Database V2." };
    }
    var data = buildDatabaseV2InputData_(aggregate);
    writeCachedSpkData_(key, data);
    return {
      status: 'success',
      found: true,
      data: data,
      performance: { source: 'database-v2', durationMs: Date.now() - startedAt }
    };
  } catch (error) {
    return { status: 'error', found: false, message: error.message };
  }
}

// Jalur ringan khusus modal Edit di halaman PPIC.
function getSpkEditData(spk, preferredRowNumber) {
  var startedAt = Date.now();
  try {
    var key = normalizeSpk_(spk);
    if (!key) return { status: 'not_found', found: false, message: 'Nomor SPK yang akan diedit wajib diisi.' };

    var data = readCachedSpkData_(key);
    var source = 'cache';
    if (!data) {
      var aggregate = readDatabaseV2Spk_(key);
      if (!aggregate) {
        return { status: 'not_found', found: false, message: "Nomor SPK '" + key + "' tidak ditemukan di Database V2." };
      }
      data = buildDatabaseV2InputData_(aggregate);
      writeCachedSpkData_(key, data);
      source = 'database-v2';
    } else {
      data = JSON.parse(JSON.stringify(data));
    }
    data.rowNumber = 0;
    if (data.uomOrder !== 'ROLL') data.meterRoll = '';
    return {
      status: 'success',
      found: true,
      data: data,
      performance: { source: source, durationMs: Date.now() - startedAt }
    };
  } catch (error) {
    return { status: 'error', found: false, message: error.message };
  }
}

// ==========================================
// DATA & STATUS CETAK SPK
// ==========================================
function getSpkPrintData(spk, preferredRowNumber, authToken, includeSignatureData) {
  Logger.log('getSpkPrintData invoked for SPK=' + spk);
  try {
    let printSession = null;
    if (authToken) printSession = requireApprovalSession_(authToken);
    const key = normalizeSpk_(spk);
    if (!key) {
      Logger.log('normalizeSpk_ returned falsy for input: ' + spk);
      return { status: 'not_found', found: false, message: 'Nomor SPK untuk dicetak tidak ditemukan.' };
    }
    const aggregate = readDatabaseV2Spk_(key);
    if (!aggregate) {
      Logger.log('readDatabaseV2Spk_ returned null for key: ' + key);
      return { status: 'not_found', found: false, message: "Nomor SPK '" + key + "' tidak ditemukan di Database V2." };
    }
    const data = buildDatabaseV2InputData_(aggregate);
    const master = aggregate.master;
    const parsedDimensions = parseCalculationDimensions_(master['Ukuran Blow'], master['Ukuran Jadi']);
    const releaseValue = String(master.Release || '').trim().toUpperCase() === 'YA' ? 'YA' : 'Tidak';
    const shouldIncludeSignatures = Boolean(printSession) && includeSignatureData !== false;
    const approvalSummary = getSpkApprovalSummary_(key, shouldIncludeSignatures);
    Object.assign(data, {
      rowNumber: 0,
      ukuranKomponen: {
        lebar: numberOrEmptyForClient_(master['Lebar Jadi']),
        panjang: numberOrEmptyForClient_(master['Panjang Jadi']),
        tebal: numberOrEmptyForClient_(master.Tebal),
        lebarBahan: numberOrEmptyForClient_(master['Lebar Bahan']),
        tebalBlow: numberOrEmptyForClient_(parsedDimensions.tebalBlow)
      },
      density: numberOrEmptyForClient_(master.Density),
      pcsPerKg: numberOrEmptyForClient_(master['PCS/KG']),
      meterPerKg: numberOrEmptyForClient_(master['Meter/KG']),
      totalBs: percentToInput_(master['Total BS']),
      totalKomposisiKg: numberOrEmptyForClient_(master['Total Komposisi KG']),
      totalKomposisiPercent: percentToInput_(master['Total Komposisi %']),
      release: releaseValue,
      approvalStatus: approvalSummary.status,
      approvalProgress: approvalSummary.progress,
      approvals: approvalSummary.approvals,
      signaturesLoaded: !Boolean(printSession) || shouldIncludeSignatures,
      canPrint: Boolean(printSession && (releaseValue === 'YA' || approvalSummary.complete)),
      canRelease: Boolean(printSession && printSession.roleKey === 'admin_ppic' && approvalSummary.complete)
    });
    Logger.log('getSpkPrintData succeeded for SPK=' + spk);
    return { status: 'success', found: true, data: data };
  } catch (error) {
    Logger.log('getSpkPrintData error: ' + error);
    return { status: 'error', found: false, message: error.message };
  }
}

// Penulisan satu sel dengan nilai tetap 'YA' bersifat idempoten: dua pencetak
// pada SPK berbeda menyentuh baris berbeda, dan pada SPK yang sama hasilnya
// identik. Karena itu tidak ada LockService di sini, sehingga antrean cetak
// tidak saling menunggu.
function markSpkReleasedForPrint(spk, preferredRowNumber, authToken) {
  try {
    requireApprovalSession_(authToken, ['admin_ppic']);
    const key = normalizeSpk_(spk);
    if (!key) return { status: 'error', message: 'Nomor SPK untuk dicetak kosong.' };
    const approvalSummary = getSpkApprovalSummary_(key, false);
    if (!approvalSummary.complete) {
      return {
        status: 'approval_required',
        message: 'SPK belum dapat diterbitkan. Persetujuan baru ' + approvalSummary.progress.approved +
          ' dari ' + approvalSummary.progress.required + ' lengkap.',
        approvalStatus: approvalSummary.status,
        progress: approvalSummary.progress
      };
    }
    const result = mutateDatabaseV2Spk_(key, 'RELEASE_PRINT_NATIVE', function(aggregate) {
      if (String(aggregate.master.Release || '').trim().toUpperCase() === 'YA') return false;
      aggregate.master.Release = 'YA';
      return true;
    });
    if (result.status === 'NOT_FOUND') {
      return { status: 'not_found', message: "Nomor SPK '" + key + "' tidak ditemukan di Database V2." };
    }
    clearDashboardCache_();
    return {
      status: 'success', release: 'YA', rowNumber: 0, databaseV2: result,
      message: "SPK '" + key + "' ditandai Release = YA dan siap dicetak."
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function isProcessActive_(value) {
  const normalized = String(value === null || value === undefined ? '' : value).trim().toUpperCase();
  return normalized !== '' && normalized !== '-' && normalized !== 'FALSE';
}

function valueOrEmpty_(value) {
  return value === null || value === undefined ? '' : String(value);
}

function numberOrEmptyForClient_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value);
  return isNaN(number) ? '' : number;
}

function enumForClient_(value, options, fallback) {
  const normalized = String(value === null || value === undefined ? '' : value).trim().toUpperCase();
  return options.indexOf(normalized) > -1 ? normalized : fallback;
}

function percentToInput_(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (String(value).trim().toUpperCase() === 'PASS') return 'PASS';
  const number = Number(value);
  return isNaN(number) ? '' : number * 100;
}

function dateToInput_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];
  return '';
}

function isValidDateInput_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getEtaBeliBahanFromRow_(row) {
  return ETA_BELI_COLUMNS.map(function(columns, index) {
    return {
      index: index + 1,
      eta: dateToInput_(row[columns.eta - 1]),
      qty: columns.qty
        ? numberOrEmptyForClient_(row[columns.qty - 1])
        : '',
      uom: columns.uom
        ? enumForClient_(row[columns.uom - 1], ['KG', 'ROLL'], '')
        : '',
      hasQuantity: Boolean(columns.qty && columns.uom)
    };
  });
}

var KELUAR_BAHAN_CACHE_META_KEY = 'keluar-bahan-v4-native-v2-meta';
var KELUAR_BAHAN_CACHE_CHUNK_PREFIX = 'keluar-bahan-v4-native-v2-part-';
// Umur panjang aman karena setiap mutasi memanggil clearKeluarBahanCache_().
var KELUAR_BAHAN_CACHE_SECONDS = 21600;
var KELUAR_BAHAN_CACHE_CHUNK_SIZE = 75000;
var KELUAR_BAHAN_CACHE_MAX_SIZE = 7000000;

function readKeluarBahanCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const metaText = cache.get(KELUAR_BAHAN_CACHE_META_KEY);
    if (!metaText) return null;

    const meta = JSON.parse(metaText);
    const chunkCount = Number(meta && meta.chunkCount) || 0;
    if (chunkCount < 1 || chunkCount > 100) return null;

    const keys = [];
    for (let index = 0; index < chunkCount; index++) {
      keys.push(KELUAR_BAHAN_CACHE_CHUNK_PREFIX + index);
    }

    const chunks = cache.getAll(keys);
    let serialized = '';
    for (let index = 0; index < keys.length; index++) {
      if (!chunks[keys[index]]) return null;
      serialized += chunks[keys[index]];
    }
    return JSON.parse(serialized);
  } catch (error) {
    return null;
  }
}

function writeKeluarBahanCache_(response) {
  try {
    const cachePayload = {
      status: 'success',
      data: Array.isArray(response && response.data) ? response.data : [],
      summary: response && response.summary
        ? response.summary
        : { total: 0, pending: 0, complete: 0 }
    };
    const serialized = JSON.stringify(cachePayload);
    if (serialized.length > KELUAR_BAHAN_CACHE_MAX_SIZE) return;

    const chunks = {};
    const chunkCount = Math.ceil(
      serialized.length / KELUAR_BAHAN_CACHE_CHUNK_SIZE
    );
    for (let index = 0; index < chunkCount; index++) {
      chunks[KELUAR_BAHAN_CACHE_CHUNK_PREFIX + index] = serialized.slice(
        index * KELUAR_BAHAN_CACHE_CHUNK_SIZE,
        (index + 1) * KELUAR_BAHAN_CACHE_CHUNK_SIZE
      );
    }

    const cache = CacheService.getScriptCache();
    cache.putAll(chunks, KELUAR_BAHAN_CACHE_SECONDS);
    cache.put(
      KELUAR_BAHAN_CACHE_META_KEY,
      JSON.stringify({ chunkCount: chunkCount }),
      KELUAR_BAHAN_CACHE_SECONDS
    );
  } catch (error) {
    // Cache hanya akselerator; data tetap dibaca langsung bila cache gagal.
  }
}

function clearKeluarBahanCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const metaText = cache.get(KELUAR_BAHAN_CACHE_META_KEY);
    const keys = [KELUAR_BAHAN_CACHE_META_KEY];

    if (metaText) {
      const meta = JSON.parse(metaText);
      const chunkCount = Math.min(
        Math.max(Number(meta.chunkCount) || 0, 0),
        100
      );
      for (let index = 0; index < chunkCount; index++) {
        keys.push(KELUAR_BAHAN_CACHE_CHUNK_PREFIX + index);
      }
    }

    cache.removeAll(keys);
  } catch (error) {
    // Pembacaan berikutnya tetap dapat langsung menuju Sheet.
  }
}

// ==========================================
// SUBMIT DATA FORM -> SHEET DATABASE
// ==========================================
function getDatabaseV2EtaEntries_(aggregate) {
  const byIndex = {};
  aggregate.eta.forEach(function(item) { byIndex[Number(item.Urutan) || 0] = item; });
  return [1, 2, 3, 4, 5].map(function(index) {
    const item = byIndex[index];
    if (!item) return { index: index, eta: '', qty: '', uom: '', hasQuantity: true };
    return {
      index: index,
      eta: dateToInput_(item['Tanggal ETA']),
      qty: numberOrEmptyForClient_(item.Qty),
      uom: enumForClient_(item.UOM, ['KG', 'ROLL'], ''),
      hasQuantity: true
    };
  });
}

function buildKeluarBahanManagerDetailV2_(aggregate) {
  const data = buildDatabaseV2InputData_(aggregate);
  const master = aggregate.master;
  const bsItems = BS_KEYS.map(function(key) {
    const percent = data.bsPercent[key];
    return { key: key, label: BS_LABELS[key] || key, percent: percent === '' ? 0 : percent };
  });
  const calculationPayload = {
    jumlahOrder: data.jumlahOrder, uomOrder: data.uomOrder,
    material: data.material, customer: data.customer,
    ukuranBlow: data.ukuranBlow, ukuranJadi: data.ukuranJadi,
    film: data.film, meterRoll: data.meterRoll, bsPercent: data.bsPercent
  };
  const parsed = parseCalculationDimensions_(data.ukuranBlow, data.ukuranJadi);
  return {
    rowNumber: 0, spk: data.spk, tanggal: data.tanggal, jenisOrder: data.jenisOrder,
    marketing: data.marketing, nomorPO: data.nomorPO, customer: data.customer,
    artikel: data.artikel, material: data.material, film: data.film,
    modelKantong: data.modelKantong, ukuranBlow: data.ukuranBlow, ukuranJadi: data.ukuranJadi,
    jumlahOrder: data.jumlahOrder, uomOrder: data.uomOrder,
    keluarBahan: data.keluarBahan, uomKB: data.uomKB, meterRoll: data.meterRoll,
    etd: data.etd, spkReferensi: data.spkReferensi,
    bs: { items: bsItems, total: getCalculationBsTotal_(data.bsPercent), totalTersimpan: percentToInput_(master['Total BS']) },
    dimensions: {
      lebarJadi: numberOrEmptyForClient_(parsed.lebar), panjangJadi: numberOrEmptyForClient_(parsed.panjang),
      tebalJadi: numberOrEmptyForClient_(parsed.tebal), lebarBahan: numberOrEmptyForClient_(parsed.lebarBahan),
      tebalBlow: numberOrEmptyForClient_(parsed.tebalBlow),
      lebarJadiTersimpan: numberOrEmptyForClient_(master['Lebar Jadi']),
      panjangJadiTersimpan: numberOrEmptyForClient_(master['Panjang Jadi']),
      tebalTersimpan: numberOrEmptyForClient_(master.Tebal),
      lebarBahanTersimpan: numberOrEmptyForClient_(master['Lebar Bahan']),
      densityTersimpan: numberOrEmptyForClient_(master.Density),
      pcsPerKgTersimpan: numberOrEmptyForClient_(master['PCS/KG']),
      meterPerKgTersimpan: numberOrEmptyForClient_(master['Meter/KG'])
    },
    calculation: calculateRawMaterialPayload_(calculationPayload)
  };
}

function getKeluarBahanManagerData(forceRefresh) {
  try {
    const startedAt = Date.now();
    if (!forceRefresh) {
      const cached = readKeluarBahanCache_();
      if (cached) return Object.assign(cached, { performance: { source: 'cache-v2', durationMs: Date.now() - startedAt, rowCount: cached.data.length } });
    }
    const book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const masters = readDatabaseV2Table_('master', book).records;
    const etaBySpk = {};
    readDatabaseV2Table_('eta', book).records.forEach(function(item) {
      const spk = normalizeDatabaseV2Key_(item.SPK);
      if (!etaBySpk[spk]) etaBySpk[spk] = [];
      etaBySpk[spk].push(item);
    });
    let pending = 0;
    let complete = 0;
    const data = masters.map(function(master) {
      const spk = normalizeDatabaseV2Key_(master.SPK);
      const keluar = numberOrEmptyForClient_(master['Keluar Bahan']);
      const uom = enumForClient_(master['UOM KB'], ['KG', 'ROLL'], '');
      const done = keluar !== '' && Number(keluar) > 0 && uom !== '';
      if (done) complete++; else pending++;
      const etaAggregate = { eta: etaBySpk[spk] || [] };
      const etaEntries = getDatabaseV2EtaEntries_(etaAggregate);
      return {
        rowNumber: 0, spk: spk, tanggal: dateToInput_(master.Tanggal),
        customer: valueOrEmpty_(master.Customer), artikel: valueOrEmpty_(master.Artikel),
        material: valueOrEmpty_(master.Material), jumlahOrder: numberOrEmptyForClient_(master['Jumlah Order']),
        uomOrder: valueOrEmpty_(master['UOM Order']), keluarBahan: keluar, uomKB: uom,
        etaBeliBahan: etaEntries,
        etaBeliKeterangan: etaBySpk[spk] && etaBySpk[spk].length
          ? valueOrEmpty_(etaBySpk[spk][0].Keterangan)
          : '',
        complete: done
      };
    });
    data.sort(function(a, b) {
      if (a.complete !== b.complete) return a.complete ? 1 : -1;
      return buildSpkSortKey_(a.spk, 0).localeCompare(buildSpkSortKey_(b.spk, 0));
    });
    const response = {
      status: 'success', data: data, summary: { total: data.length, pending: pending, complete: complete },
      performance: { source: 'database-v2', durationMs: Date.now() - startedAt, rowCount: data.length }
    };
    writeKeluarBahanCache_(response);
    return response;
  } catch (error) {
    return { status: 'error', data: [], summary: { total: 0, pending: 0, complete: 0 }, message: error.message };
  }
}

function getKeluarBahanManagerDetail(spk, preferredRowNumber) {
  try {
    const startedAt = Date.now();
    const key = normalizeSpk_(spk);
    if (!key) return { status: 'not_found', found: false, message: 'Nomor SPK untuk dilihat tidak valid.' };
    const aggregate = readDatabaseV2Spk_(key);
    if (!aggregate) return { status: 'not_found', found: false, message: "Nomor SPK '" + key + "' tidak ditemukan di Database V2." };
    return { status: 'success', found: true, data: buildKeluarBahanManagerDetailV2_(aggregate), performance: { durationMs: Date.now() - startedAt, source: 'database-v2' } };
  } catch (error) {
    return { status: 'error', found: false, message: error.message };
  }
}

function getKeluarBahanManagerDetailBatch(requests) {
  const startedAt = Date.now();
  try {
    const details = {};
    const missing = [];
    const seen = {};
    (Array.isArray(requests) ? requests : []).slice(0, 10).forEach(function(request) {
      const key = normalizeSpk_(request && request.spk);
      if (!key || seen[key]) return;
      seen[key] = true;
      const aggregate = readDatabaseV2Spk_(key);
      if (!aggregate) missing.push(key);
      else details[key] = buildKeluarBahanManagerDetailV2_(aggregate);
    });
    return { status: 'success', data: details, missing: missing, performance: { durationMs: Date.now() - startedAt, rowCount: Object.keys(details).length, source: 'database-v2' } };
  } catch (error) {
    return { status: 'error', data: {}, missing: [], message: error.message };
  }
}

function normalizeDatabaseV2EtaSchedule_(payload) {
  const entries = Array.isArray(payload && payload.entries) ? payload.entries : [];
  if (entries.length !== 5) throw new Error('Jadwal ETA harus memuat ETA 1 sampai ETA 5.');
  const keterangan = String(payload && payload.keterangan || '').trim();
  if (keterangan.length > 1000) throw new Error('Keterangan ETA maksimal 1.000 karakter.');
  let gap = false;
  let previous = '';
  return {
    keterangan: keterangan,
    entries: entries.map(function(source, index) {
      const eta = String(source && source.eta || '').trim();
      const qtyText = String(source && source.qty != null ? source.qty : '').trim();
      const uom = String(source && source.uom || '').trim().toUpperCase();
      if (!eta) {
        if (qtyText || uom) throw new Error('Tanggal ETA ' + (index + 1) + ' wajib diisi sebelum QTY dan UOM.');
        gap = true;
        return null;
      }
      if (!isValidDateInput_(eta)) throw new Error('Tanggal ETA ' + (index + 1) + ' tidak valid.');
      if (gap) throw new Error('ETA ' + (index + 1) + ' tidak boleh melompati ETA sebelumnya.');
      if (previous && eta < previous) throw new Error('Tanggal ETA ' + (index + 1) + ' tidak boleh lebih awal dari ETA sebelumnya.');
      const qty = parseCalculationNumber_(qtyText);
      if (!(qty > 0)) throw new Error('QTY ETA ' + (index + 1) + ' wajib berupa angka lebih dari 0.');
      if (['KG', 'ROLL'].indexOf(uom) === -1) throw new Error('UOM ETA ' + (index + 1) + ' harus KG atau ROLL.');
      previous = eta;
      return { index: index + 1, eta: eta, qty: qty, uom: uom, hasQuantity: true };
    }).filter(Boolean)
  };
}

function databaseV2EtaRecord_(spk, entry, keterangan) {
  return {
    'ETA ID': databaseV2DetailId_(spk, 'E', entry.index), 'SPK': spk, 'Urutan': entry.index,
    'Tanggal ETA': databaseV2DateInput_(entry.eta), 'Qty': entry.qty, 'UOM': entry.uom,
    'Status': 'RENCANA', 'Keterangan': keterangan || '', 'Sumber': DB_V2_NATIVE_WRITE_SOURCE,
    'Dibuat': '', 'Diperbarui': ''
  };
}

function saveEtaBeliBahanScheduleByManager(payload) {
  try {
    const spk = normalizeSpk_(payload && payload.spk);
    if (!spk) return { status: 'error', message: 'Nomor SPK tidak valid.' };
    const normalized = normalizeDatabaseV2EtaSchedule_(payload);
    const result = mutateDatabaseV2Spk_(spk, 'ETA_SCHEDULE_NATIVE', function(aggregate) {
      aggregate.eta = normalized.entries.map(function(entry) {
        return databaseV2EtaRecord_(spk, entry, normalized.keterangan);
      });
      return true;
    });
    if (result.status === 'NOT_FOUND') return { status: 'not_found', message: "SPK '" + spk + "' tidak ditemukan di Database V2." };
    clearKeluarBahanCache_();
    return {
      status: 'success',
      message: normalized.entries.length
        ? "Jadwal ETA beli bahan SPK '" + spk + "' berhasil disimpan."
        : "Jadwal ETA beli bahan SPK '" + spk + "' berhasil dikosongkan.",
      data: { rowNumber: 0, spk: spk, entries: normalized.entries, keterangan: normalized.keterangan, filledCount: normalized.entries.length, databaseV2: result }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function updateEtaBeliBahanByManager(payload) {
  try {
    const spk = normalizeSpk_(payload && payload.spk);
    const index = Number(payload && payload.etaIndex);
    const eta = String(payload && payload.eta || '').trim();
    const qtyText = String(payload && payload.qty != null ? payload.qty : '').trim();
    const uom = String(payload && payload.uom || '').trim().toUpperCase();
    if (!spk) return { status: 'error', message: 'Nomor SPK tidak valid.' };
    if (!(index >= 1 && index <= 5)) return { status: 'error', message: 'Urutan ETA harus antara ETA 1 sampai ETA 5.' };
    let entry = null;
    if (eta || qtyText || uom) {
      if (!eta || !isValidDateInput_(eta)) return { status: 'error', message: 'Tanggal ETA ' + index + ' tidak valid.' };
      const qty = parseCalculationNumber_(qtyText);
      if (!(qty > 0)) return { status: 'error', message: 'QTY ETA ' + index + ' wajib berupa angka lebih dari 0.' };
      if (['KG', 'ROLL'].indexOf(uom) === -1) return { status: 'error', message: 'UOM ETA ' + index + ' harus KG atau ROLL.' };
      entry = { index: index, eta: eta, qty: qty, uom: uom, hasQuantity: true };
    }
    const result = mutateDatabaseV2Spk_(spk, 'ETA_SINGLE_NATIVE', function(aggregate) {
      const existing = aggregate.eta.find(function(item) { return Number(item.Urutan) === index; });
      const note = existing ? valueOrEmpty_(existing.Keterangan) : '';
      aggregate.eta = aggregate.eta.filter(function(item) { return Number(item.Urutan) !== index; });
      if (entry) aggregate.eta.push(databaseV2EtaRecord_(spk, entry, note));
      aggregate.eta.sort(function(a, b) { return Number(a.Urutan) - Number(b.Urutan); });
      return true;
    });
    if (result.status === 'NOT_FOUND') return { status: 'not_found', message: "SPK '" + spk + "' tidak ditemukan di Database V2." };
    clearKeluarBahanCache_();
    return {
      status: 'success',
      message: entry ? "ETA " + index + " SPK '" + spk + "' berhasil disimpan." : "ETA " + index + " SPK '" + spk + "' berhasil dikosongkan.",
      data: { rowNumber: 0, spk: spk, etaIndex: index, entry: entry || { index: index, eta: '', qty: '', uom: '', hasQuantity: true }, databaseV2: result }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function updateKeluarBahanByManager(payload) {
  try {
    const spk = normalizeSpk_(payload && payload.spk);
    const keluarBahan = parseCalculationNumber_(payload && payload.keluarBahan);
    const uomKB = String(payload && payload.uomKB || '').trim().toUpperCase();
    if (!spk) return { status: 'error', message: 'Nomor SPK tidak valid.' };
    if (!(keluarBahan > 0)) return { status: 'error', message: 'Keluar Bahan wajib berupa angka lebih dari 0.' };
    if (['KG', 'ROLL'].indexOf(uomKB) === -1) return { status: 'error', message: 'UOM Keluar Bahan harus KG atau ROLL.' };
    const result = mutateDatabaseV2Spk_(spk, 'KELUAR_BAHAN_NATIVE', function(aggregate) {
      aggregate.master['Keluar Bahan'] = keluarBahan;
      aggregate.master['UOM KB'] = uomKB;
      if (aggregate.material.length === 1 && !aggregate.material[0].KG) aggregate.material[0].KG = keluarBahan;
      return true;
    });
    if (result.status === 'NOT_FOUND') return { status: 'not_found', message: "SPK '" + spk + "' tidak ditemukan di Database V2." };
    clearDashboardCache_();
    clearKeluarBahanCache_();
    return {
      status: 'success', message: "Keluar Bahan SPK '" + spk + "' berhasil diperbarui di Database V2.",
      data: { rowNumber: 0, spk: spk, keluarBahan: keluarBahan, uomKB: uomKB, complete: true, databaseV2: result }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

/**
 * Memperbarui data utama SPK dari halaman PPIC.
 * Nomor SPK, status Release, proses produksi, BS, komposisi, dan ETA pembelian
 * sengaja tidak diubah agar relasi dan progres operasional tetap aman.
 */
function updateSpkFromDashboard(payload) {
  try {
    const input = payload || {};
    const spkKey = normalizeSpk_(input.spk);
    if (!spkKey) return { status: 'error', message: 'Nomor SPK tidak valid.' };
    const current = readDatabaseV2Spk_(spkKey);
    if (!current) return { status: 'not_found', message: "SPK '" + spkKey + "' tidak ditemukan di Database V2." };
    const currentData = buildDatabaseV2InputData_(current);
    const jenisOrder = normalizeOrderType_(input.jenisOrder);
    const spkReferensi = jenisOrder === 'Repeat Order' ? normalizeSpk_(input.spkReferensi) : '';
    const editPayload = {
      spk: spkKey, tanggal: input.tanggal, jenisOrder: jenisOrder,
      marketing: String(input.marketing || '').trim(), nomorPO: String(input.nomorPO || '').trim(),
      customer: String(input.customer || '').trim(), material: String(input.material || '').trim(),
      film: String(input.film || '').trim(), artikel: String(input.artikel || '').trim(),
      kodeItem: normalizeKodeItem_(input.kodeItem),
      keteranganArtikel: normalizeProcessNote_(input.keteranganArtikel),
      keteranganWarna: normalizeKeteranganWarna_(input.keteranganWarna),
      keteranganBahan: normalizeKeteranganBahan_(input.keteranganBahan),
      modelKantong: String(input.modelKantong || '').trim(),
      ukuranBlow: String(input.ukuranBlow || '').trim(), ukuranJadi: String(input.ukuranJadi || '').trim(),
      jumlahOrder: input.jumlahOrder, uomOrder: String(input.uomOrder || '').trim().toUpperCase(),
      keluarBahan: input.keluarBahan, uomKB: String(input.uomKB || '').trim().toUpperCase(),
      meterRoll: input.meterRoll, toleransi: input.toleransi, etd: input.etd,
      spkReferensi: spkReferensi, bsPercent: currentData.bsPercent
    };
    const validationMessage = validatePayload_(editPayload);
    if (validationMessage) return { status: 'error', message: validationMessage };
    if (spkReferensi) {
      if (spkReferensi === spkKey) return { status: 'error', message: 'SPK repeat tidak boleh merujuk dirinya sendiri.' };
      if (getDatabaseV2SpkDirectory_().spks.indexOf(spkReferensi) === -1) {
        return { status: 'error', message: "SPK referensi '" + spkReferensi + "' tidak ditemukan di Database V2." };
      }
    }
    const jumlahOrder = parseCalculationNumber_(editPayload.jumlahOrder);
    const keluarBahan = parseCalculationNumber_(editPayload.keluarBahan);
    const meterRoll = editPayload.uomOrder === 'ROLL'
      ? parseCalculationNumber_(editPayload.meterRoll)
      : null;
    const result = mutateDatabaseV2Spk_(spkKey, 'DASHBOARD_EDIT_NATIVE', function(aggregate) {
      const master = aggregate.master;
      Object.assign(master, {
        'Tanggal': databaseV2DateInput_(editPayload.tanggal),
        'Jenis Order': jenisOrder,
        'Marketing': editPayload.marketing,
        'Nomor PO': editPayload.nomorPO,
        'Customer': editPayload.customer,
        'Material': editPayload.material,
        'Film': editPayload.film,
        'Artikel': editPayload.artikel,
        'Kode Item': editPayload.kodeItem,
        'Keterangan Artikel': editPayload.keteranganArtikel,
        'Keterangan Warna': editPayload.keteranganWarna,
        'Keterangan Bahan': editPayload.keteranganBahan,
        'Model Kantong': editPayload.modelKantong,
        'Ukuran Blow': editPayload.ukuranBlow,
        'Ukuran Jadi': editPayload.ukuranJadi,
        'Jumlah Order': jumlahOrder,
        'UOM Order': editPayload.uomOrder,
        'Keluar Bahan': keluarBahan === null ? '' : keluarBahan,
        'UOM KB': keluarBahan === null ? '' : editPayload.uomKB,
        'Meter/Roll': meterRoll === null ? '' : meterRoll,
        'Toleransi Order': toToleranceStorageValue_(editPayload.toleransi),
        'ETD': databaseV2DateInput_(editPayload.etd),
        'SPK Referensi': spkReferensi
      });
      const dimensions = parseCalculationDimensions_(editPayload.ukuranBlow, editPayload.ukuranJadi);
      const density = getCalculationDensity_(editPayload.material);
      master['Lebar Jadi'] = dimensions.lebar || '';
      master['Panjang Jadi'] = dimensions.panjang || '';
      master.Tebal = dimensions.tebal || '';
      master['Lebar Bahan'] = dimensions.lebarBahan || '';
      master.Density = density || '';
      master['PCS/KG'] = dimensions.lebar && dimensions.panjang && dimensions.tebal
        ? 5444 / dimensions.panjang / dimensions.tebal / dimensions.lebar
        : '';
      master['Meter/KG'] = calculateMeterPerKg_(
        dimensions.lebar, dimensions.tebal, density, getFilmLayerFactor_(editPayload.film)
      ) || '';
      if (aggregate.material.length === 1 && current.master.Material === aggregate.material[0]['Nama Bahan']) {
        aggregate.material[0]['Nama Bahan'] = editPayload.material;
        aggregate.material[0].KG = keluarBahan === null ? '' : keluarBahan;
      }
      aggregate.delivery = aggregate.delivery.filter(function(item) {
        return String(item.Status || '').toUpperCase().indexOf('PARSIAL') > -1;
      });
      if (master.ETD && !aggregate.delivery.length) {
        aggregate.delivery.unshift({
          'Pengiriman ID': databaseV2DetailId_(spkKey, 'P', 1), 'SPK': spkKey, 'Urutan': 1,
          'Tanggal Kirim': master.ETD, 'Qty': jumlahOrder, 'UOM': editPayload.uomOrder,
          'Status': 'RENCANA PENUH', 'Keterangan': '', 'Sumber': DB_V2_NATIVE_WRITE_SOURCE,
          'Dibuat': '', 'Diperbarui': ''
        });
      }
      return true;
    });
    clearDashboardCache_();
    clearKeluarBahanCache_();
    clearSpkDataCache_(spkKey);
    return {
      status: 'success',
      message: "Data SPK '" + spkKey + "' berhasil diperbarui di Database V2.",
      data: { spk: spkKey, release: current.master.Release || 'Tidak', databaseV2: result }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function buildDatabaseV2CandidatesFromInput_(payload) {
  const spk = normalizeSpk_(payload.spk);
  const row = new Array(150).fill('');
  const jenisOrder = normalizeOrderType_(payload.jenisOrder);
  const spkReferensi = jenisOrder === 'Repeat Order' ? normalizeSpk_(payload.spkReferensi) : '';
  [
    spk, databaseV2DateInput_(payload.tanggal), jenisOrder, String(payload.marketing || '').trim(),
    String(payload.nomorPO || '').trim(), String(payload.customer || '').trim(),
    String(payload.material || '').trim(), String(payload.film || '').trim(),
    String(payload.artikel || '').trim(), String(payload.modelKantong || '').trim(),
    String(payload.ukuranBlow || '').trim(), String(payload.ukuranJadi || '').trim()
  ].forEach(function(value, index) { row[index] = value; });
  const dimensions = parseCalculationDimensions_(payload.ukuranBlow, payload.ukuranJadi);
  const density = getCalculationDensity_(payload.material);
  row[DB_COL.LEBAR_JADI - 1] = dimensions.lebar || '';
  row[DB_COL.PANJANG_JADI - 1] = dimensions.panjang || '';
  row[DB_COL.TEBAL - 1] = dimensions.tebal || '';
  row[DB_COL.LEBAR_BAHAN - 1] = dimensions.lebarBahan || '';
  row[DB_COL.DENSITY - 1] = density || '';
  row[DB_COL.PCS_PER_KG - 1] = dimensions.lebar && dimensions.panjang && dimensions.tebal
    ? 5444 / dimensions.panjang / dimensions.tebal / dimensions.lebar
    : '';
  row[DB_COL.METER_PER_KG - 1] = calculateMeterPerKg_(
    dimensions.lebar, dimensions.tebal, density, getFilmLayerFactor_(payload.film)
  ) || '';
  PROSES_KEYS.forEach(function(key, index) {
    row[DB_COL.PROSES_MIXER - 1 + index] = payload.proses && payload.proses[key]
      ? PROSES_LABELS[key]
      : '-';
  });
  row[DB_COL.FINISHING - 1] = FINISHING_OPTIONS.indexOf(payload.finishing) > -1 ? payload.finishing : '-';
  row[DB_COL.HANDLE_PON - 1] = HANDLE_PON_OPTIONS.indexOf(payload.handlePm) > -1 ? payload.handlePm : '-';
  BS_KEYS.forEach(function(key, index) {
    row[DB_COL.BS_START - 1 + index] = toDecimalPercent_(payload.bsPercent && payload.bsPercent[key]);
  });
  row[DB_COL.TOTAL_BS - 1] = BS_KEYS.reduce(function(total, key) {
    return total + (Number(toDecimalPercent_(payload.bsPercent && payload.bsPercent[key])) || 0);
  }, 0);
  const jumlahOrder = parseCalculationNumber_(payload.jumlahOrder);
  const uomOrder = String(payload.uomOrder || '').trim().toUpperCase();
  const keluarBahan = parseCalculationNumber_(payload.keluarBahan);
  row[DB_COL.JUMLAH_ORDER - 1] = jumlahOrder;
  row[DB_COL.UOM_ORDER - 1] = uomOrder;
  row[DB_COL.KELUAR_BAHAN - 1] = keluarBahan === null ? '' : keluarBahan;
  row[DB_COL.UOM_KB - 1] = keluarBahan === null ? '' : String(payload.uomKB || '').trim().toUpperCase();
  row[DB_COL.TOLERANSI - 1] = toToleranceStorageValue_(payload.toleransi);
  row[DB_COL.ETD - 1] = databaseV2DateInput_(payload.etd);
  buildKomposisiColumns_(payload.komposisi || [], keluarBahan).forEach(function(value, index) {
    row[DB_COL.KOMPOSISI_START - 1 + index] = value;
  });
  let totalKg = 0;
  let totalPercent = 0;
  for (let slot = 0; slot < 7; slot++) {
    totalKg += Number(row[DB_COL.KOMPOSISI_START + (slot * 3)]) || 0;
    totalPercent += Number(row[DB_COL.KOMPOSISI_START + (slot * 3) + 1]) || 0;
  }
  row[DB_COL.TOTAL_KOMPOSISI_KG - 1] = totalKg;
  row[DB_COL.TOTAL_KOMPOSISI_PERCENT - 1] = totalPercent;
  buildWarnaColumns_(payload.warna || []).forEach(function(value, index) {
    row[DB_COL.WARNA_START - 1 + index] = value;
  });
  row[DB_COL.SPK_REFERENSI - 1] = spkReferensi;
  row[DB_COL.RELEASE - 1] = 'Tidak';
  row[DB_COL.KETERANGAN_ARTIKEL - 1] = normalizeProcessNote_(payload.keteranganArtikel);
  PROCESS_NOTE_KEYS.forEach(function(key, index) {
    row[DB_COL.KET_PROSES_START - 1 + index] = normalizeProcessNote_(payload.keteranganProses && payload.keteranganProses[key]);
  });
  row[DB_COL.KODE_ITEM - 1] = normalizeKodeItem_(payload.kodeItem);
  ROUTING_DETAIL_COLUMNS.forEach(function(item) { row[item.column - 1] = valueOrEmpty_(payload[item.key]); });
  row[DB_COL.KETERANGAN_WARNA - 1] = normalizeKeteranganWarna_(payload.keteranganWarna);
  row[DB_COL.KETERANGAN_BAHAN - 1] = normalizeKeteranganBahan_(payload.keteranganBahan);
  row[DB_COL.METER_ROLL - 1] = uomOrder === 'ROLL' ? (parseCalculationNumber_(payload.meterRoll) || '') : '';
  row[DB_COL.ROUTING_STEPS - 1] = serializeRoutingSteps_(payload.routingSteps || []);
  row[DB_COL.PCS_KG_MODE - 1] = normalizeEnumValue_(payload.pcsKgMode, PCS_KG_MODE_OPTIONS, '');
  row[DB_COL.JENIS_POTONGAN - 1] = normalizeEnumValue_(payload.jenisPotongan, JENIS_POTONGAN_OPTIONS, '');
  row[DB_COL.PO_MASUK - 1] = databaseV2DateInput_(payload.poMasuk);
  ['stok', 'ots', 'wip'].forEach(function(key, index) {
    const value = parseCalculationNumber_(payload[key]);
    row[DB_COL.STOK - 1 + index] = value === null ? '' : value;
  });
  row[DB_COL.TOLERANSI_PRODUKSI - 1] = toDecimalPercent_(payload.toleransiProduksi);
  row[DB_COL.PENGIRIMAN_PARSIAL - 1] = serializePengirimanParsial_(payload.pengirimanParsial || []);
  ['bahanLebar', 'bahanPanjang', 'bahanTebal', 'bahanDensity'].forEach(function(key, index) {
    const value = parseCalculationNumber_(payload[key]);
    row[DB_COL.BAHAN_LEBAR - 1 + index] = value === null ? '' : value;
  });
  const candidates = createDatabaseV2CandidateBuckets_();
  const warnings = [];
  buildDatabaseV2CandidatesForRow_(row, 0, spk, candidates, warnings);
  return { spk: spk, spkReferensi: spkReferensi, jenisOrder: jenisOrder, candidates: candidates, warnings: warnings };
}

function submitDatabase(payload) {
  const startedAt = Date.now();
  let creatorSession;
  try {
    creatorSession = requireCreatorApprovalSession_(payload && payload.authToken);
    const validasi = validatePayload_(payload);
    if (validasi) return { status: 'error', message: validasi };
    const built = buildDatabaseV2CandidatesFromInput_(payload);
    const directory = getDatabaseV2SpkDirectory_();
    if (directory.spks.indexOf(built.spk) > -1) {
      return { status: 'duplicate', message: "Nomor SPK '" + built.spk + "' sudah ada di Database V2. Data tidak disimpan." };
    }
    if (built.spkReferensi) {
      if (built.spkReferensi === built.spk) return { status: 'error', message: 'SPK repeat baru tidak boleh sama dengan referensinya.' };
      if (directory.spks.indexOf(built.spkReferensi) === -1) {
        return { status: 'error', message: "SPK referensi '" + built.spkReferensi + "' tidak ditemukan di Database V2." };
      }
    }
    const committed = commitDatabaseV2Candidates_(
      built.candidates, [built.spk], 'SUBMIT_DATABASE_NATIVE', { createOnly: true }
    );
    committed.warnings = built.warnings;
    initializeSpkApprovals_(built.spk, 0, payload, creatorSession);
    clearMarketingOptionsCache_();
    clearDashboardCache_();
    clearKeluarBahanCache_();
    clearSpkDataCache_(built.spk);
    return {
      status: 'success',
      message: built.jenisOrder === 'Repeat Order'
        ? "Repeat Order SPK '" + built.spk + "' berhasil disimpan ke Database V2."
        : "Data SPK '" + built.spk + "' berhasil disimpan ke Database V2.",
      data: { spk: built.spk, rowNumber: 0, databaseV2: committed },
      performance: { durationMs: Date.now() - startedAt, writeMode: 'native-v2' }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// ==========================================
// VALIDASI
// ==========================================
function validatePayload_(payload) {
  if (!payload) return 'Data form kosong.';
  if (!payload.spk || String(payload.spk).trim() === '') return 'Nomor SPK baru wajib diisi.';
  if (!payload.tanggal) return 'Tanggal wajib diisi.';
  if (!payload.customer || String(payload.customer).trim() === '') return 'Customer wajib diisi.';
  if (!payload.material || String(payload.material).trim() === '') return 'Material wajib diisi.';
  if (!payload.ukuranJadi || String(payload.ukuranJadi).trim() === '') return 'Ukuran Jadi wajib diisi.';
  const rawKeteranganBahan = String(payload.keteranganBahan || '').trim();
  const keteranganBahan = normalizeKeteranganBahan_(rawKeteranganBahan);
  if (rawKeteranganBahan !== '' && keteranganBahan === '') {
    return 'Keterangan Bahan harus Bahan Internal atau Bahan dari Luar.';
  }
  if (!(parseCalculationNumber_(payload.jumlahOrder) > 0)) return 'Jumlah Order wajib lebih dari 0.';
  if (['PCS', 'KG', 'ROLL'].indexOf(String(payload.uomOrder || '').trim().toUpperCase()) === -1) {
    return 'UOM Order harus PCS, KG, atau ROLL.';
  }
  if (
    String(payload.uomOrder || '').trim().toUpperCase() === 'ROLL' &&
    !(parseCalculationNumber_(payload.meterRoll) > 0)
  ) {
    return 'Meter/Roll wajib diisi lebih dari 0 untuk order ROLL.';
  }
  const keluarBahanText = String(
    payload.keluarBahan === null || payload.keluarBahan === undefined
      ? ''
      : payload.keluarBahan
  ).trim();
  if (keluarBahanText !== '') {
    if (!(parseCalculationNumber_(payload.keluarBahan) > 0)) {
      return 'Keluar Bahan, jika diisi, wajib lebih dari 0.';
    }
    if (['KG', 'ROLL'].indexOf(String(payload.uomKB || '').trim().toUpperCase()) === -1) {
      return 'UOM Keluar Bahan harus KG atau ROLL.';
    }
  }
  if (!payload.etd) return 'ETD (Tanggal Kirim) wajib diisi.';

  const proses = payload.proses || {};
  if (proses.blowing) {
    const threat = String(payload.blowingThreat || '').trim().toUpperCase();
    const modeCetak = String(payload.blowingModeCetak || '').trim().toUpperCase();
    if (threat !== '' && ['NON THREAT', 'THREAT 1 SISI', 'THREAT 2 SISI', 'THREAT POTONG'].indexOf(threat) === -1) {
      return 'Pilihan Threat Blowing tidak valid.';
    }
    if (modeCetak !== '' && ['NON PRINT', 'INLINE'].indexOf(modeCetak) === -1) {
      return 'Pilihan Mode Cetak Blowing tidak valid.';
    }
  }

  const jenisOrder = normalizeOrderType_(payload.jenisOrder);
  if (jenisOrder === 'Repeat Order') {
    if (!payload.spkReferensi || String(payload.spkReferensi).trim() === '') {
      return 'SPK item sebelumnya wajib diisi untuk Repeat Order.';
    }
    if (normalizeSpk_(payload.spkReferensi) === normalizeSpk_(payload.spk)) {
      return 'SPK repeat baru tidak boleh sama dengan SPK item sebelumnya.';
    }
  }

  const toleransiText = String(
    payload.toleransi === null || payload.toleransi === undefined
      ? ''
      : payload.toleransi
  ).trim();
  if (
    toleransiText !== '' &&
    toleransiText.toUpperCase() !== 'PASS'
  ) {
    const toleransiNumber = parseCalculationNumber_(payload.toleransi);
    if (
      toleransiNumber === null ||
      !Number.isFinite(toleransiNumber) ||
      toleransiNumber < 0
    ) {
      return 'Toleransi harus berupa angka 0 atau lebih, atau dikosongkan untuk PASS.';
    }
  }

  const toleransiProduksiText = String(
    payload.toleransiProduksi === null || payload.toleransiProduksi === undefined
      ? ''
      : payload.toleransiProduksi
  ).trim();
  if (toleransiProduksiText !== '') {
    const toleransiProduksi = parseCalculationNumber_(payload.toleransiProduksi);
    if (
      toleransiProduksi === null ||
      !Number.isFinite(toleransiProduksi) ||
      toleransiProduksi < 0
    ) {
      return 'Toleransi Produksi harus berupa angka 0 atau lebih.';
    }
  }

  // Stok, OTS, dan WIP boleh kosong, tetapi bila diisi harus angka wajar.
  const penyesuaianTidakValid = ['stok', 'ots', 'wip'].find(function(key) {
    const text = String(
      payload[key] === null || payload[key] === undefined ? '' : payload[key]
    ).trim();
    if (text === '') return false;
    const value = parseCalculationNumber_(payload[key]);
    return value === null || !Number.isFinite(value) || value < 0;
  });
  if (penyesuaianTidakValid) {
    return penyesuaianTidakValid.toUpperCase() + ' harus berupa angka 0 atau lebih.';
  }

  // Ukuran bahan diketik manual, jadi nilainya harus lebih dari 0 bila diisi.
  // Nol tidak diterima karena akan membuat pembagian pada PCS/KG dan Keluar
  // Bahan menghasilkan angka yang tidak masuk akal.
  const ukuranBahanLabel = {
    bahanLebar: 'Lebar bahan',
    bahanPanjang: 'Panjang bahan',
    bahanTebal: 'Tebal bahan',
    bahanDensity: 'Density'
  };
  const ukuranBahanTidakValid = Object.keys(ukuranBahanLabel).find(function(key) {
    const text = String(
      payload[key] === null || payload[key] === undefined ? '' : payload[key]
    ).trim();
    if (text === '') return false;
    const value = parseCalculationNumber_(payload[key]);
    return value === null || !Number.isFinite(value) || value <= 0;
  });
  if (ukuranBahanTidakValid) {
    return ukuranBahanLabel[ukuranBahanTidakValid] + ' harus berupa angka lebih dari 0.';
  }

  const accessoryValidation = validateRoutingAccessoryPayload_(payload.routingSteps);
  if (accessoryValidation) return accessoryValidation;

  return null;
}

function parseCalculationNumber_(value) {
  if (value === '' || value === null || value === undefined) return null;

  let text = String(value).trim().replace(/\s+/g, '');
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

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function extractFirstCalculationNumber_(value) {
  const match = String(value === null || value === undefined ? '' : value)
    .match(/-?\d+(?:[.,]\d+)?/);
  return match ? parseCalculationNumber_(match[0]) : null;
}

function parseCalculationDimensions_(ukuranBlow, ukuranJadi) {
  const jadiParts = String(ukuranJadi || '').split(/\s*[xX]\s*/);
  const blowParts = String(ukuranBlow || '').split(/\s*[xX]\s*/);
  const firstJadiPart = String(jadiParts[0] || '').replace(/[(/]/g, ' ');
  const firstBlowPart = String(blowParts[0] || '').replace(/[(/]/g, ' ');

  return {
    lebar: extractFirstCalculationNumber_(firstJadiPart),
    panjang: jadiParts.length > 1
      ? extractFirstCalculationNumber_(jadiParts[1])
      : null,
    tebal: jadiParts.length > 2
      ? extractFirstCalculationNumber_(jadiParts[jadiParts.length - 1])
      : null,
    lebarBahan: extractFirstCalculationNumber_(firstBlowPart),
    upTertulis: extractWrittenUp_(ukuranBlow),
    tebalBlow: blowParts.length > 1
      ? extractFirstCalculationNumber_(blowParts[blowParts.length - 1])
      : null
  };
}

// Admin menuliskan jumlah lajur langsung pada Ukuran Blowing, misalnya
// "47 X 0.032 (10 UP)". Angka itu yang paling dipercaya karena ditentukan
// orang yang tahu kondisi mesin, sedangkan floor(lebar bahan / lebar jadi)
// hanya perkiraan dari teks ukuran yang formatnya bisa berbeda antar jenis
// order. Digit wajib menempel sebelum kata UP agar kata lain yang kebetulan
// memuat "up" tidak ikut tertangkap.
function extractWrittenUp_(ukuranBlow) {
  const match = String(ukuranBlow || '').match(/(\d+)\s*UP\b/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getCalculationMeter_(tebal, material) {
  if (!(tebal > 0)) return null;
  if (String(material || '').toUpperCase().indexOf('CPP') > -1) return 6000;
  if (tebal >= 0.029) return 3000;
  if (tebal >= 0.020) return 4000;
  return 6000;
}

function getCalculationDensity_(material) {
  const text = String(material || '').trim().toUpperCase();
  if (text.indexOf('HD') > -1) return 0.94;
  if (text.indexOf('PE') > -1) return 0.92;
  if (
    text.indexOf('CPP') > -1 ||
    text.indexOf('OPP') > -1 ||
    text.indexOf('PP') > -1
  ) {
    return 0.91;
  }
  return null;
}

function getFilmLayerFactor_(film) {
  const text = String(film || '').trim().toUpperCase();
  if (text === '') return null;
  return text.indexOf('TUBE') > -1 ? 2 : 1;
}

function calculateMeterPerKg_(lebar, tebal, density, filmLayerFactor) {
  if (
    !(lebar > 0) ||
    !(tebal > 0) ||
    !(density > 0) ||
    !(filmLayerFactor > 0)
  ) {
    return null;
  }

  return 1 /
    (
      density *
      ((lebar / 100) * (tebal * 1000) * filmLayerFactor) /
      1000
    );
}

function getCalculationBsTotal_(bsPercent) {
  return BS_KEYS.reduce(function(total, key) {
    const raw = bsPercent ? bsPercent[key] : 0;
    const number = parseCalculationNumber_(raw);
    return total + (number === null ? 0 : number);
  }, 0);
}

function classifyRawMaterial_(material, uomOrder, customer) {
  const materialText = String(material || '').trim().toUpperCase();
  const customerText = String(customer || '').trim().toUpperCase();
  const uom = String(uomOrder || '').trim().toUpperCase();
  const isCpp = materialText.indexOf('CPP') > -1;
  const isOpp = materialText.indexOf('OPP') > -1;
  // PP memakai jalur rumus yang sama dengan HD/PE. Batas token menjaga
  // agar PP di dalam CPP/OPP tidak ikut terbaca sebagai material PP.
  const isHdPePp =
    /(^|[^A-Z])(HDPE|HD|LLDPE|LDPE|PE|PP)([^A-Z]|$)/.test(materialText);

  if (uom === 'ROLL') {
    return {
      code: 'F',
      label: 'F · Order ROLL',
      sheetTitle: 'Logika Perhitungan Kirim ROLL',
      resultUom: 'ROLL'
    };
  }

  if (isCpp && isOpp && uom === 'PCS') {
    return {
      error: 'Material memuat CPP dan OPP sekaligus. Pilih salah satu agar kategori PCS dapat ditentukan.'
    };
  }

  if (uom === 'PCS' && isCpp) {
    if (customerText.indexOf('MUSTIKA') > -1) {
      return {
        code: 'A-MUSTIKA',
        label: 'A · CPP PCS Mustika',
        sheetTitle: 'Logika Perhitungan CPP PCS Mustika',
        resultUom: 'ROLL'
      };
    }
    return {
      code: 'A',
      label: 'A · CPP + PCS',
      sheetTitle: 'Logika Perhitungan CPP PCS',
      resultUom: 'KG'
    };
  }

  if (uom === 'PCS' && isOpp) {
    return {
      code: 'B',
      label: 'B · OPP + PCS',
      sheetTitle: 'Logika Perhitungan OPP PCS',
      resultUom: 'ROLL'
    };
  }

  if (uom === 'KG' && (isCpp || isOpp)) {
    return {
      code: 'C',
      label: 'C · CPP/OPP + KG',
      sheetTitle: 'Logika Perhitungan CPP/OPP KG',
      resultUom: 'ROLL'
    };
  }

  if (uom === 'PCS' && isHdPePp) {
    return {
      code: 'D',
      label: 'D · HD/PE/PP + PCS',
      sheetTitle: 'Logika Perhitungan HD/PE/PP PCS',
      resultUom: 'KG'
    };
  }

  if (uom === 'KG' && isHdPePp) {
    return {
      code: 'E',
      label: 'E · HD/PE/PP + KG',
      sheetTitle: 'Logika Perhitungan HD/PE/PP KG',
      resultUom: 'KG'
    };
  }

  return {
    error: "Kombinasi Material dan UOM Order belum masuk kategori A-F. Gunakan CPP, OPP, HD/PE/PP dengan UOM PCS, KG, atau ROLL."
  };
}

function calculateRawMaterialPayload_(payload) {
  const data = payload || {};
  const jumlahOrder = parseCalculationNumber_(data.jumlahOrder);
  const uomOrder = String(data.uomOrder || '').trim().toUpperCase();

  if (!(jumlahOrder > 0)) {
    return { ok: false, message: 'Jumlah Order wajib lebih dari 0.' };
  }
  if (['PCS', 'KG', 'ROLL'].indexOf(uomOrder) === -1) {
    return { ok: false, message: 'UOM Order harus PCS, KG, atau ROLL.' };
  }

  const category = classifyRawMaterial_(data.material, uomOrder, data.customer);
  if (category.error) return { ok: false, message: category.error };

  const dimensions = parseCalculationDimensions_(data.ukuranBlow, data.ukuranJadi);
  const meter = getCalculationMeter_(dimensions.tebal, data.material);
  const density = getCalculationDensity_(data.material);
  const filmLayerFactor = getFilmLayerFactor_(data.film);
  const meterPerKg = calculateMeterPerKg_(
    dimensions.lebar,
    dimensions.tebal,
    density,
    filmLayerFactor
  );
  const totalBs = getCalculationBsTotal_(data.bsPercent);
  const orderAfterBs = jumlahOrder * (1 + (totalBs / 100));
  const submittedMeterRoll = parseCalculationNumber_(data.meterRoll);
  const meterRoll = uomOrder === 'ROLL'
    ? submittedMeterRoll
    : null;

  let pcsPerKg = null;
  // PCS/KG memakai lebar jadi (angka pertama Ukuran Jadi), bukan
  // lebar bahan/blowing (angka pertama Ukuran Blow).
  if (
    dimensions.panjang > 0 &&
    dimensions.tebal > 0 &&
    dimensions.lebar > 0
  ) {
    pcsPerKg = 5444 /
      dimensions.panjang /
      dimensions.tebal /
      dimensions.lebar;
  }

  // Angka UP yang ditulis pada Ukuran Blowing didahulukan; hitungan dari
  // lebar hanya dipakai bila tidak ditulis.
  let up = dimensions.upTertulis;
  if (!(up > 0) && dimensions.lebar > 0 && dimensions.lebarBahan > 0) {
    up = Math.floor(dimensions.lebarBahan / dimensions.lebar);
  }

  let keluarBahan = null;
  if (category.code === 'A' || category.code === 'D') {
    if (!(pcsPerKg > 0)) {
      return {
        ok: false,
        message: 'Ukuran Jadi belum menghasilkan Panjang, Tebal, dan Lebar Jadi yang valid.'
      };
    }
    keluarBahan = orderAfterBs / pcsPerKg;
  } else if (category.code === 'B' || category.code === 'A-MUSTIKA') {
    if (!(dimensions.panjang > 0) || !(meter > 0)) {
      return {
        ok: false,
        message: 'Ukuran Jadi belum menghasilkan Panjang dan Tebal yang valid.'
      };
    }
    keluarBahan = orderAfterBs * dimensions.panjang / 100 / meter;
  } else if (category.code === 'C') {
    if (!(dimensions.panjang > 0) || !(pcsPerKg > 0) || !(meter > 0)) {
      return {
        ok: false,
        message: 'Dimensi belum lengkap untuk menghitung kategori C.'
      };
    }
    keluarBahan = orderAfterBs * dimensions.panjang * pcsPerKg / 100 / meter;
  } else if (category.code === 'E') {
    keluarBahan = orderAfterBs;
  } else if (category.code === 'F') {
    if (!(meter > 0)) {
      return {
        ok: false,
        message: 'Tebal/Mikron pada Ukuran Jadi belum valid untuk menentukan Meter.'
      };
    }
    if (!(up >= 1)) {
      return {
        ok: false,
        message: 'UP tidak valid. Lebar Bahan harus minimal sama dengan Lebar Jadi.'
      };
    }
    if (!(meterRoll > 0)) {
      return {
        ok: false,
        message: 'Meter/Roll wajib diisi untuk order ROLL.'
      };
    }
    keluarBahan = orderAfterBs * meterRoll / meter / up;
  }

  // UP yang ditulis pada Ukuran Blowing, misalnya "47 X 0.032 (10 UP)",
  // berlaku untuk seluruh kategori. Kategori F dikecualikan karena rumusnya
  // sudah membagi dengan UP di atas. Pembagian hanya dilakukan bila angkanya
  // benar-benar ditulis; UP hasil hitungan lebar tidak ikut dipakai di sini
  // agar SPK lama yang Ukuran Blowing-nya tanpa keterangan UP tidak berubah.
  if (
    category.code !== 'F' &&
    dimensions.upTertulis > 0 &&
    keluarBahan !== null
  ) {
    keluarBahan = keluarBahan / dimensions.upTertulis;
  }

  if (!(keluarBahan >= 0) || !Number.isFinite(keluarBahan)) {
    return {
      ok: false,
      message: 'Hasil Keluar Bahan tidak valid. Periksa kembali dimensi dan jumlah order.'
    };
  }

  return {
    ok: true,
    category: category.code,
    categoryLabel: category.label,
    categoryTitle: category.sheetTitle,
    jumlahOrder: jumlahOrder,
    uomOrder: uomOrder,
    totalBs: totalBs,
    orderAfterBs: orderAfterBs,
    lebar: dimensions.lebar,
    panjang: dimensions.panjang,
    tebal: dimensions.tebal,
    lebarBahan: dimensions.lebarBahan,
    pcsPerKg: pcsPerKg,
    density: density,
    filmLayerFactor: filmLayerFactor,
    meterPerKg: meterPerKg,
    meter: meter,
    up: up,
    upTertulis: dimensions.upTertulis,
    meterRoll: meterRoll,
    keluarBahan: keluarBahan,
    uomKB: category.resultUom
  };
}

function normalizeOrderType_(value) {
  return String(value).trim() === 'Repeat Order' ? 'Repeat Order' : 'New Order';
}

// ==========================================
// HELPER
// ==========================================
function parseTanggal_(value) {
  if (!value) return '';
  if (value instanceof Date) return value;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0
    );
  }

  return value;
}

function toNumberOrEmpty_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value);
  return isNaN(number) ? '' : number;
}

function toDecimalPercent_(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const number = Number(value);
  if (isNaN(number)) return 0;
  return number / 100;
}

function toToleranceStorageValue_(value) {
  const text = String(
    value === null || value === undefined ? '' : value
  ).trim();
  if (text === '' || text.toUpperCase() === 'PASS') return 'PASS';

  const number = parseCalculationNumber_(value);
  return number === null || !Number.isFinite(number)
    ? 'PASS'
    : number / 100;
}

function buildKomposisiColumns_(items, keluarBahan) {
  // 7 slot penuh (nama, KG, %) + slot ke-8 (nama saja) = 22 kolom AX:BS.
  const result = new Array(22).fill('');
  const maximum = Math.min(items.length, DB_MAX_BAHAN);
  const keluarBahanNumber = parseCalculationNumber_(keluarBahan);

  for (let index = 0; index < maximum; index++) {
    const item = items[index] || {};
    const nama = item.material || item.nama || '';

    if (index === 7) {
      result[21] = nama;
      continue;
    }

    const percentInput = parseCalculationNumber_(item.percent);
    const calculatedKg = keluarBahanNumber > 0 && percentInput !== null && percentInput >= 0
      ? Math.round(((percentInput / 100) * keluarBahanNumber) * 1000000) / 1000000
      : null;
    const kg = calculatedKg === null ? toNumberOrEmpty_(item.kg) : calculatedKg;
    const percent = toDecimalPercent_(item.percent);
    const startIndex = index * 3;

    result[startIndex] = nama;
    result[startIndex + 1] = kg;
    result[startIndex + 2] = percent;
  }

  return result;
}

function buildWarnaColumns_(items) {
  // 10 slot (Warna, Pemakaian) = 20 kolom BV:CO.
  const totalColumns = DB_MAX_WARNA * 2;
  const result = new Array(totalColumns).fill('');
  const maximum = Math.min((items || []).length, DB_MAX_WARNA);

  for (let index = 0; index < maximum; index++) {
    const item = items[index] || {};
    const nama = item.nama || item.warna || '';
    const pemakaian = toNumberOrEmpty_(item.pemakaian);
    const startIndex = index * 2;

    result[startIndex] = nama;
    result[startIndex + 1] = pemakaian;
  }

  return result;
}

function getWarnaFromRow_(row) {
  const warna = [];
  for (let index = 0; index < DB_MAX_WARNA; index++) {
    const start = DB_COL.WARNA_START - 1 + (index * 2);
    warna.push({
      nama: valueOrEmpty_(row[start]),
      pemakaian: numberOrEmptyForClient_(row[start + 1])
    });
  }
  while (warna.length > 2) {
    const last = warna[warna.length - 1];
    if (last.nama !== '' || last.pemakaian !== '') break;
    warna.pop();
  }
  return warna;
}
