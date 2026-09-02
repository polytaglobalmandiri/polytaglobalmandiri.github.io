// ==========================================
// KONFIGURASI
// ==========================================
const DB_SPREADSHEET_ID = '1GldWp316hXRGKOa-ANJ4Eugdz0HFZSxvFQGy-dcex48';
// Nama sheet tempat data SPK disimpan. Nama pertama adalah nama yang berlaku
// sekarang; sisanya nama lama yang tetap diterima. Dengan begitu penggantian
// nama tab di Spreadsheet boleh dilakukan kapan saja — sebelum maupun sesudah
// kode ini dipasang — tanpa ada jeda waktu yang membuat aplikasi gagal.
const DB_SHEET_NAMES = ['Database SPK', 'Database'];
const DB_SHEET_NAME = DB_SHEET_NAMES[0];
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
  // ---------------------------------------------------------------------
  // Sembilan kolom terakhir. Nomornya di bawah ini adalah tata letak BARU,
  // yaitu setelah enam kolom Ukuran Sebelum/Sesudah (dulu ED:EI) dihapus.
  // Bila sheet masih memakai tata letak lama, nomor-nomor ini diselaraskan
  // otomatis oleh syncDatabaseTailColumns_ setiap kali sheet dibuka, jadi
  // aplikasi tetap benar sebelum maupun sesudah migrasi dijalankan. Karena
  // itu jangan membaca nilainya sebelum sheet-nya diambil lewat getDbSheet_
  // atau getDbSheetReadOnly_.
  // ---------------------------------------------------------------------
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

// Kolom-kolom di atas selalu berurutan; hanya titik awalnya yang berbeda
// antara tata letak lama dan baru.
const DB_TAIL_KEYS = [
  'ROUTING_STEPS', 'PCS_KG_MODE', 'JENIS_POTONGAN', 'PO_MASUK',
  'STOK', 'OTS', 'WIP', 'TOLERANSI_PRODUKSI', 'PENGIRIMAN_PARSIAL',
  'BAHAN_LEBAR', 'BAHAN_PANJANG', 'BAHAN_TEBAL', 'BAHAN_DENSITY',
  'AKSESORIS_ROUTING', 'KEBUTUHAN_AKSESORIS', 'UOM_AKSESORIS'
];
const DB_TAIL_START_BARU = 134; // ED, setelah kolom lama dihapus
const DB_TAIL_START_LAMA = 140; // EJ, saat ED:EI masih ada

// Enam kolom yang dihapus, beserta judul aslinya. Judul inilah yang dipakai
// untuk mengenali sheet yang belum dimigrasikan.
const LEGACY_UKURAN_COLUMN_START = 134;
const LEGACY_UKURAN_HEADERS = [
  'Ukuran Folding Sebelum', 'Ukuran Folding Sesudah',
  'Ukuran Slitting Sebelum', 'Ukuran Slitting Sesudah',
  'Ukuran Gusset Sebelum', 'Ukuran Gusset Sesudah'
];

// Kolom terakhir yang dipakai aplikasi. Dulu berupa konstanta 148; kini
// mengikuti tata letak sheet yang sedang dibuka.
function databaseTotalColumns_() {
  return DB_COL.UOM_AKSESORIS;
}

// Ditulis dan dibaca terpisah dari ROUTING_DETAIL_COLUMNS karena isinya JSON
// panjang, sedangkan kolom detail biasa dipangkas 200 karakter.
const ROUTING_STEPS_HEADER = 'Urutan Routing';
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
function extraInputColumns_() {
  return [
    { key: 'pcsKgMode', column: DB_COL.PCS_KG_MODE, header: 'Mode PCS/KG', type: 'str' },
    { key: 'jenisPotongan', column: DB_COL.JENIS_POTONGAN, header: 'Jenis Potongan', type: 'str' },
    { key: 'poMasuk', column: DB_COL.PO_MASUK, header: 'Tanggal PO Masuk', type: 'date' },
    { key: 'stok', column: DB_COL.STOK, header: 'Stok', type: 'num' },
    { key: 'ots', column: DB_COL.OTS, header: 'OTS', type: 'num' },
    { key: 'wip', column: DB_COL.WIP, header: 'WIP', type: 'num' },
    { key: 'toleransiProduksi', column: DB_COL.TOLERANSI_PRODUKSI, header: 'Toleransi Produksi', type: 'num' },
    { key: 'pengirimanParsial', column: DB_COL.PENGIRIMAN_PARSIAL, header: 'Pengiriman Parsial', type: 'str' },
    { key: 'bahanLebar', column: DB_COL.BAHAN_LEBAR, header: 'Lebar Bahan Manual (cm)', type: 'num' },
    { key: 'bahanPanjang', column: DB_COL.BAHAN_PANJANG, header: 'Panjang Bahan Manual (cm)', type: 'num' },
    { key: 'bahanTebal', column: DB_COL.BAHAN_TEBAL, header: 'Tebal Bahan Manual (mm)', type: 'num' },
    { key: 'bahanDensity', column: DB_COL.BAHAN_DENSITY, header: 'Density Manual', type: 'num' },
    { key: 'aksesorisRouting', column: DB_COL.AKSESORIS_ROUTING, header: 'Aksesoris Routing', type: 'str' },
    { key: 'kebutuhanAksesoris', column: DB_COL.KEBUTUHAN_AKSESORIS, header: 'Kebutuhan Aksesoris', type: 'str' },
    { key: 'uomAksesoris', column: DB_COL.UOM_AKSESORIS, header: 'UOM Aksesoris', type: 'str' }
  ];
}

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

const METER_ROLL_NOTE_PREFIX = 'APP_METER_ROLL=';

const PROSES_KEYS = ['mixer', 'blowing', 'printing', 'slitting', 'folding', 'gusset'];
const PROSES_LABELS = {
  mixer: 'MIXER', blowing: 'BLOWING', printing: 'PRINTING',
  slitting: 'SLITTING', folding: 'FOLDING', gusset: 'GUSSET'
};

const PROCESS_NOTE_KEYS = [
  'mixer', 'blowing', 'printing', 'slitting', 'folding',
  'gusset', 'bottomSeal', 'sideSeal', 'tshirt'
];
const PROCESS_NOTE_HEADERS = [
  'Ket Mix', 'Ket Blow', 'ket Print', 'Ket Slit', 'Ket Fld',
  'Ket Gst', 'Ket Bts', 'Ket SS', 'Ket BTS'
];
const LEGACY_PROCESS_NOTE_HEADERS = [
  'Ket Blow', 'ket Print', 'Ket Slit', 'Ket Fld',
  'Ket Gst', 'Ket Bts', 'Ket SS', 'Ket BTS'
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

// Jalankan manual dari editor Apps Script untuk memverifikasi posisi header
// kunci sesuai peta DB_COL di kode. TIDAK menyisipkan atau menambah kolom
// apa pun (fungsi migrasi otomatis sudah dihapus dari alur normal aplikasi).
function adminVerifyDatabaseHeaders() {
  const sheet = getDbSheetReadOnly_();
  return {
    maxColumns: sheet.getMaxColumns(),
    totalColumnsExpected: databaseTotalColumns_(),
    headerWarna1: sheet.getRange(1, DB_COL.WARNA_START).getDisplayValue(),
    headerPemakaian1: sheet.getRange(1, DB_COL.WARNA_START + 1).getDisplayValue(),
    headerWarna10: sheet.getRange(1, DB_COL.WARNA_END - 1).getDisplayValue(),
    headerPemakaian10: sheet.getRange(1, DB_COL.WARNA_END).getDisplayValue(),
    headerSpkReferensi: sheet.getRange(1, DB_COL.SPK_REFERENSI).getDisplayValue(),
    headerRelease: sheet.getRange(1, DB_COL.RELEASE).getDisplayValue(),
    headerKeteranganArtikel: sheet.getRange(1, DB_COL.KETERANGAN_ARTIKEL).getDisplayValue(),
    headerKetMix: sheet.getRange(1, DB_COL.KET_PROSES_START).getDisplayValue(),
    headerEtaBeliKeterangan: sheet.getRange(1, DB_COL.ETA_BELI_KETERANGAN).getDisplayValue(),
    headerKodeItem: sheet.getMaxColumns() >= DB_COL.KODE_ITEM
      ? sheet.getRange(1, DB_COL.KODE_ITEM).getDisplayValue()
      : '(kolom DR belum dibuat di Spreadsheet)',
    headerRoutingTerakhir: sheet.getMaxColumns() >= DB_COL.PACKING
      ? sheet.getRange(1, DB_COL.PACKING).getDisplayValue()
      : '(kolom routing DS:DZ belum dibuat di Spreadsheet)',
    headerKeteranganWarna: sheet.getMaxColumns() >= DB_COL.KETERANGAN_WARNA
      ? sheet.getRange(1, DB_COL.KETERANGAN_WARNA).getDisplayValue()
      : '(kolom EA belum dibuat di Spreadsheet)',
    headerKeteranganBahan: sheet.getMaxColumns() >= DB_COL.KETERANGAN_BAHAN
      ? sheet.getRange(1, DB_COL.KETERANGAN_BAHAN).getDisplayValue()
      : '(kolom EB belum dibuat di Spreadsheet)',
    headerMeterRoll: sheet.getMaxColumns() >= DB_COL.METER_ROLL
      ? sheet.getRange(1, DB_COL.METER_ROLL).getDisplayValue()
      : '(kolom EC belum dibuat di Spreadsheet)',
    // Tata letak sembilan kolom terakhir, hasil pembacaan baris judul.
    tataLetakEkor: DB_COL.ROUTING_STEPS === DB_TAIL_START_BARU
      ? 'baru (kolom Ukuran Sebelum/Sesudah sudah dihapus)'
      : 'lama (kolom Ukuran Sebelum/Sesudah masih ada, jalankan adminHapusKolomUkuranSebelumSesudah)',
    rentangEkor: columnNumberToLetter_(DB_COL.ROUTING_STEPS) + ':' +
      columnNumberToLetter_(DB_COL.PENGIRIMAN_PARSIAL),
    headerUrutanRouting: sheet.getMaxColumns() >= DB_COL.ROUTING_STEPS
      ? sheet.getRange(1, DB_COL.ROUTING_STEPS).getDisplayValue()
      : '(kolom Urutan Routing belum dibuat di Spreadsheet)'
  };
}

// Menambahkan kolom EA tanpa menggeser struktur lama A:DZ. Fungsi publik ini
// aman dijalankan berulang kali untuk migrasi schema satu kali.
function adminEnsureKeteranganWarnaColumn() {
  const sheet = getDbSheetReadOnly_();
  ensureKeteranganWarnaColumn_(sheet);
  SpreadsheetApp.flush();
  return {
    status: 'success',
    column: columnNumberToLetter_(DB_COL.KETERANGAN_WARNA),
    header: sheet.getRange(1, DB_COL.KETERANGAN_WARNA).getDisplayValue(),
    type: sheet.getRange(2, DB_COL.KETERANGAN_WARNA).getDisplayValue(),
    maxColumns: sheet.getMaxColumns()
  };
}

function adminEnsureKeteranganBahanColumn() {
  const sheet = getDbSheetReadOnly_();
  ensureKeteranganBahanColumn_(sheet);
  SpreadsheetApp.flush();
  return {
    status: 'success',
    column: columnNumberToLetter_(DB_COL.KETERANGAN_BAHAN),
    header: sheet.getRange(1, DB_COL.KETERANGAN_BAHAN).getDisplayValue(),
    type: sheet.getRange(2, DB_COL.KETERANGAN_BAHAN).getDisplayValue(),
    maxColumns: sheet.getMaxColumns()
  };
}

// Membuat kolom EC untuk Meter/Roll dan memindahkan nilai lama yang masih
// tersimpan sebagai catatan internal pada sel UOM Order.
function adminEnsureMeterRollColumn() {
  const sheet = getDbSheetReadOnly_();
  ensureMeterRollColumn_(sheet);
  const migratedRows = migrateLegacyMeterRollNotes_(sheet);
  SpreadsheetApp.flush();
  clearDashboardCache_();
  clearKeluarBahanCache_();
  return {
    status: 'success',
    column: columnNumberToLetter_(DB_COL.METER_ROLL),
    header: sheet.getRange(1, DB_COL.METER_ROLL).getDisplayValue(),
    type: sheet.getRange(2, DB_COL.METER_ROLL).getDisplayValue(),
    migratedRows: migratedRows,
    maxColumns: sheet.getMaxColumns()
  };
}

// Jalankan manual sekali dari editor Apps Script untuk menata ulang seluruh
// baris Database ke urutan kronologis (tahun, bulan, nomor urut) sehingga SPK
// terbaru berada di paling bawah. Hanya urutan baris yang berubah; isi tiap
// baris tetap utuh dan bergerak sebagai satu kesatuan.
function adminSortDatabaseBySpk() {
  const sheet = getDbSheetReadOnly_();
  const lastRow = getDatabaseDataLastRow_(sheet);

  if (lastRow < DB_DATA_START_ROW) {
    return { status: 'success', rowsSorted: 0, message: 'Database masih kosong.' };
  }

  const readSpk = function(rowNumber) {
    return sheet.getRange(rowNumber, DB_COL.SPK).getDisplayValue();
  };
  const before = { first: readSpk(DB_DATA_START_ROW), last: readSpk(lastRow) };

  sortDatabaseBySpk_(sheet);
  SpreadsheetApp.flush();
  clearDashboardCache_();
  clearKeluarBahanCache_();

  return {
    status: 'success',
    rowsSorted: lastRow - DB_DATA_START_ROW + 1,
    sebelum: before,
    sesudah: { first: readSpk(DB_DATA_START_ROW), last: readSpk(lastRow) },
    message: 'Baris teratas kini SPK terlama dan baris terbawah SPK terbaru.'
  };
}

// Jalankan sekali setelah DB_DATA_START_ROW dinaikkan dari 3 ke 4. Data lama
// masih menempati baris 3, dan baris itu kini berada di luar jangkauan seluruh
// pembacaan aplikasi. Fungsi ini menyisipkan baris kosong pada posisi 3
// sehingga isi lama bergeser turun ke baris 4 dan kembali terbaca.
//
// Aman dijalankan berulang: bila baris 3 sudah kosong, tidak ada yang diubah.
function adminReserveBlankFirstRow() {
  const sheet = getDbSheet_();
  const spkOnRowThree = normalizeSpk_(
    sheet.getRange(3, DB_COL.SPK).getDisplayValue()
  );

  if (spkOnRowThree === '') {
    return {
      status: 'success',
      changed: false,
      message: 'Baris 3 sudah kosong. Tidak ada yang perlu digeser.'
    };
  }

  sheet.insertRowBefore(3);
  SpreadsheetApp.flush();

  // Cache dashboard dan indeks keberadaan SPK menyimpan nomor baris, jadi
  // keduanya dibuang setelah pergeseran. Cache baris per SPK tidak perlu
  // dibersihkan karena findSpkRowFast_ selalu memverifikasi ulang isinya.
  clearDashboardCache_();
  clearKeluarBahanCache_();
  clearSpkExistenceCache_();

  return {
    status: 'success',
    changed: true,
    spkDipindah: spkOnRowThree,
    message: 'Baris 3 dikosongkan. SPK ' + spkOnRowThree +
      ' beserta seluruh data di bawahnya bergeser turun satu baris.'
  };
}

// Jalankan sekali dari editor Apps Script untuk menghapus enam kolom
// Ukuran Sebelum/Sesudah (Folding, Slitting, Gusset) dari sheet Database.
// Kolom isiannya sudah tidak ada di form, jadi isinya tidak lagi terpakai.
//
// Aman dijalankan kapan saja, sebelum maupun sesudah kode baru dipasang:
// aplikasi mengenali sendiri tata letak sheet lewat syncDatabaseTailColumns_.
// Aman pula dijalankan berulang; panggilan kedua tidak mengubah apa pun.
//
// Fungsi ini menolak bekerja bila susunan judulnya tidak persis seperti yang
// diharapkan, supaya kolom orang lain tidak ikut terhapus.
function adminHapusKolomUkuranSebelumSesudah() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(45000)) {
    return {
      status: 'error',
      message: 'Database sedang dipakai proses lain. Tunggu sampai penyimpanan ' +
        'SPK atau penarikan data selesai, lalu jalankan lagi.'
    };
  }

  try {
    const sheet = getDbSheetReadOnly_();
    const maxColumns = sheet.getMaxColumns();
    const jumlah = LEGACY_UKURAN_HEADERS.length;

    if (maxColumns < LEGACY_UKURAN_COLUMN_START + jumlah - 1) {
      return {
        status: 'success',
        changed: false,
        message: 'Sheet hanya punya ' + maxColumns + ' kolom, jadi kolom ' +
          'Ukuran Sebelum/Sesudah memang belum pernah ada.'
      };
    }

    const header = sheet.getRange(1, 1, 1, maxColumns).getDisplayValues()[0];
    const judul = function(column) {
      const value = column <= header.length ? header[column - 1] : '';
      return String(value === null || value === undefined ? '' : value).trim();
    };

    if (judul(DB_TAIL_START_BARU) === ROUTING_STEPS_HEADER) {
      return {
        status: 'success',
        changed: false,
        message: 'Kolom Ukuran Sebelum/Sesudah sudah tidak ada. Tidak ada yang diubah.'
      };
    }

    // Setiap dari enam kolom itu harus bernama persis seperti aslinya atau
    // kosong sama sekali. Satu saja yang berisi nama lain berarti susunannya
    // sudah bukan yang kita kenal, dan lebih baik dihentikan.
    const terbaca = [];
    for (let index = 0; index < jumlah; index++) {
      const column = LEGACY_UKURAN_COLUMN_START + index;
      const nama = judul(column);
      const cocok = nama === '' ||
        nama.toUpperCase() === LEGACY_UKURAN_HEADERS[index].toUpperCase();
      if (!cocok) {
        return {
          status: 'error',
          changed: false,
          message: 'Dihentikan demi keamanan. Kolom ' + columnNumberToLetter_(column) +
            " diharapkan bernama '" + LEGACY_UKURAN_HEADERS[index] + "' atau kosong, " +
            "tetapi isinya '" + nama + "'. Periksa dulu susunan Database."
        };
      }
      terbaca.push(columnNumberToLetter_(column) + ' = ' + (nama === '' ? '(kosong)' : nama));
    }

    // Kolom tepat setelahnya harus Urutan Routing. Ini penjaga terakhir bahwa
    // yang terhapus benar-benar enam kolom itu, bukan kolom lain yang bergeser.
    const kolomSesudah = LEGACY_UKURAN_COLUMN_START + jumlah;
    const judulSesudah = judul(kolomSesudah);
    if (judulSesudah !== '' && judulSesudah !== ROUTING_STEPS_HEADER) {
      return {
        status: 'error',
        changed: false,
        message: 'Dihentikan demi keamanan. Kolom ' + columnNumberToLetter_(kolomSesudah) +
          " seharusnya '" + ROUTING_STEPS_HEADER + "', tetapi isinya '" + judulSesudah + "'."
      };
    }

    // Sekalian dilaporkan berapa sel yang benar-benar berisi, supaya jelas apa
    // yang hilang. Kolom ini sudah lama tidak diisi, jadi umumnya nol.
    const lastRow = sheet.getLastRow();
    let selBerisi = 0;
    if (lastRow >= DB_DATA_START_ROW) {
      sheet
        .getRange(DB_DATA_START_ROW, LEGACY_UKURAN_COLUMN_START, lastRow - DB_DATA_START_ROW + 1, jumlah)
        .getDisplayValues()
        .forEach(function(row) {
          row.forEach(function(cell) {
            if (String(cell === null || cell === undefined ? '' : cell).trim() !== '') selBerisi++;
          });
        });
    }

    sheet.deleteColumns(LEGACY_UKURAN_COLUMN_START, jumlah);
    SpreadsheetApp.flush();

    // Peta kolom di memori ikut disegarkan agar eksekusi ini tidak melanjutkan
    // dengan nomor kolom yang sudah usang.
    syncDatabaseTailColumns_(sheet);

    clearDashboardCache_();
    clearKeluarBahanCache_();

    return {
      status: 'success',
      changed: true,
      kolomDihapus: terbaca,
      selBerisiTerhapus: selBerisi,
      kolomTerakhirSekarang: columnNumberToLetter_(databaseTotalColumns_()),
      message: 'Enam kolom Ukuran Sebelum/Sesudah dihapus. Kolom Urutan Routing ' +
        'sampai Pengiriman Parsial bergeser ke ' +
        columnNumberToLetter_(DB_COL.ROUTING_STEPS) + ':' +
        columnNumberToLetter_(DB_COL.PENGIRIMAN_PARSIAL) + '.'
    };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Jalankan manual dari editor Apps Script untuk melihat isi baris header (1)
// dan baris tipe (2) apa adanya, TANPA memicu migrasi apa pun. Hasilnya bisa
// disalin untuk dicocokkan dengan peta kolom di kode.
function adminDumpAllHeaders() {
  const sheet = getDbSheetReadOnly_();
  const maxColumns = sheet.getMaxColumns();
  const headers = sheet.getRange(1, 1, 1, maxColumns).getDisplayValues()[0];
  const types = sheet.getRange(2, 1, 1, maxColumns).getDisplayValues()[0];
  const lines = [];
  for (let index = 0; index < maxColumns; index++) {
    const header = String(headers[index] || '').trim();
    const type = String(types[index] || '').trim();
    if (header === '' && type === '') continue;
    lines.push(columnNumberToLetter_(index + 1) + ' (' + (index + 1) + '): ' + header + ' | type=' + type);
  }
  return lines.join('\n');
}

// Perbedaan huruf besar-kecil dan spasi ganda diabaikan, karena nama tab
// diketik manusia dan selisih semacam itu bukan maksud pengguna.
function normalizeSheetName_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function findDatabaseSheet_(ss) {
  for (let index = 0; index < DB_SHEET_NAMES.length; index++) {
    const sheet = ss.getSheetByName(DB_SHEET_NAMES[index]);
    if (sheet) return sheet;
  }

  // Jalur cadangan, hanya ditempuh bila pencarian nama persis gagal.
  const dicari = DB_SHEET_NAMES.map(normalizeSheetName_);
  const sheets = ss.getSheets();
  for (let index = 0; index < sheets.length; index++) {
    if (dicari.indexOf(normalizeSheetName_(sheets[index].getName())) > -1) {
      return sheets[index];
    }
  }
  return null;
}

function databaseSheetNotFoundMessage_() {
  return 'Sheet data SPK tidak ditemukan. Nama tab yang diterima: ' +
    DB_SHEET_NAMES.map(function(nama) { return "'" + nama + "'"; }).join(' atau ') + '.';
}

function columnNumberToLetter_(column) {
  let letter = '';
  let n = column;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// ==========================================
// TATA LETAK SEMBILAN KOLOM TERAKHIR
//
// Kolom Ukuran Sebelum/Sesudah Folding, Slitting, dan Gusset (dulu ED:EI)
// dihapus dari Database. Penghapusannya menggeser sembilan kolom di kanannya
// enam langkah ke kiri, sehingga kode dan sheet harus sepakat soal posisinya.
//
// Daripada memaksa keduanya berubah pada detik yang sama, posisi kolom dibaca
// dari baris judul setiap kali sheet dibuka. Aplikasi karena itu berjalan
// benar pada kedua tata letak: sebelum migrasi dijalankan maupun sesudahnya.
// Kalau migrasi tidak pernah dijalankan sekalipun, tidak ada yang rusak.
// ==========================================
function detectDatabaseTailStart_(sheet) {
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < DB_TAIL_START_BARU) return DB_TAIL_START_BARU;

  const header = sheet.getRange(1, 1, 1, maxColumns).getDisplayValues()[0];
  const judul = function(column) {
    const value = column <= header.length ? header[column - 1] : '';
    return String(value === null || value === undefined ? '' : value).trim();
  };

  // Petunjuk paling tegas: di mana judul 'Urutan Routing' berada.
  if (judul(DB_TAIL_START_BARU) === ROUTING_STEPS_HEADER) return DB_TAIL_START_BARU;
  if (judul(DB_TAIL_START_LAMA) === ROUTING_STEPS_HEADER) return DB_TAIL_START_LAMA;

  // Judul itu bisa saja belum sempat terisi. Kalau enam judul kolom lama masih
  // ada, sheet-nya pasti belum dimigrasikan.
  const masihAdaKolomLama = LEGACY_UKURAN_HEADERS.some(function(nama, index) {
    return judul(LEGACY_UKURAN_COLUMN_START + index).toUpperCase() === nama.toUpperCase();
  });
  return masihAdaKolomLama ? DB_TAIL_START_LAMA : DB_TAIL_START_BARU;
}

function syncDatabaseTailColumns_(sheet) {
  const start = detectDatabaseTailStart_(sheet);
  if (DB_COL[DB_TAIL_KEYS[0]] === start) return start;

  DB_TAIL_KEYS.forEach(function(key, index) {
    DB_COL[key] = start + index;
  });
  return start;
}

function getDbSheet_() {
  const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sheet = findDatabaseSheet_(ss);
  if (!sheet) throw new Error(databaseSheetNotFoundMessage_());
  assertMeterPerKgSchema_(sheet);
  syncDatabaseTailColumns_(sheet);
  ensureDbColumnCapacity_(sheet);
  return sheet;
}

function getDbSheetReadOnly_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() ||
    SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sheet = findDatabaseSheet_(ss);
  if (!sheet) throw new Error(databaseSheetNotFoundMessage_());
  // Jalur ini tidak mengubah struktur sheet, tetapi tetap perlu tahu di kolom
  // mana sembilan kolom terakhir berada agar yang terbaca bukan kolom sebelah.
  syncDatabaseTailColumns_(sheet);
  return sheet;
}

function assertMeterPerKgSchema_(sheet) {
  const header = normalizeHeader_(sheet.getRange(1, DB_COL.METER_PER_KG).getDisplayValue());
  const processSubheader = normalizeHeader_(
    sheet.getRange(2, DB_COL.PROSES_MIXER).getDisplayValue()
  );
  if (header !== 'METER/KG' || processSubheader !== 'P1') {
    throw new Error(
      "Struktur Database tidak sesuai: kolom S harus bernama 'METER/KG' " +
      "dan kolom T harus diawali subheader 'P1'. Perbaiki judul kolomnya " +
      'langsung di Spreadsheet.'
    );
  }
}



// ==========================================
// CEK DUPLIKAT SPK
// ==========================================
// Indeks ini menghindari pembukaan Spreadsheet dan pembacaan kolom A untuk
// setiap ketikan. Cache berumur pendek supaya perubahan manual di Spreadsheet
// tetap cepat ikut terbaca, sedangkan proses simpan/import memperbarui atau
// membersihkannya secara eksplisit.
const SPK_EXISTENCE_CACHE_KEY = 'spk-existence-v1';
const SPK_EXISTENCE_CACHE_SECONDS = 300;
const SPK_EXISTENCE_CACHE_MAX_CHARS = 90000;
const INPUT_OPTIONS_CACHE_SECONDS = 1800;
const MARKETING_OPTIONS_CACHE_KEY = 'spk-marketing-options-v1';
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

function readCachedSpkExistenceIndex_() {
  try {
    const serialized = CacheService
      .getScriptCache()
      .get(SPK_EXISTENCE_CACHE_KEY);
    if (!serialized) return null;

    const index = JSON.parse(serialized);
    if (!index || typeof index !== 'object' || Array.isArray(index)) return null;
    return index;
  } catch (error) {
    return null;
  }
}

function writeCachedSpkExistenceIndex_(index) {
  try {
    const serialized = JSON.stringify(index || {});
    if (serialized.length > SPK_EXISTENCE_CACHE_MAX_CHARS) {
      clearSpkExistenceCache_();
      return;
    }

    CacheService
      .getScriptCache()
      .put(
        SPK_EXISTENCE_CACHE_KEY,
        serialized,
        SPK_EXISTENCE_CACHE_SECONDS
      );
  } catch (error) {
    // Cache hanya akselerator; pengecekan tetap dapat membaca Spreadsheet.
  }
}

function clearSpkExistenceCache_() {
  try {
    CacheService.getScriptCache().remove(SPK_EXISTENCE_CACHE_KEY);
    CacheService.getScriptCache().remove(MARKETING_OPTIONS_CACHE_KEY);
  } catch (error) {
    // Cache hanya akselerator; kegagalan menghapus tidak membatalkan mutasi.
  }
}

function buildSpkExistenceIndex_(sheet) {
  const index = Object.create(null);
  const lastDataRow = getDatabaseLastSpkRowFast_(sheet);

  if (lastDataRow >= DB_DATA_START_ROW) {
    const values = sheet
      .getRange(
        DB_DATA_START_ROW,
        DB_COL.SPK,
        lastDataRow - DB_DATA_START_ROW + 1,
        1
      )
      .getDisplayValues();

    values.forEach(function(row, offset) {
      const key = normalizeSpk_(row[0]);
      if (key !== '' && !index[key]) index[key] = DB_DATA_START_ROW + offset;
    });
  }

  writeCachedSpkExistenceIndex_(index);
  return index;
}

function getSpkExistenceIndex_(sheet) {
  const cached = readCachedSpkExistenceIndex_();
  if (cached) return { index: cached, source: 'cache' };

  const sourceSheet = sheet || getDbSheetReadOnly_();
  return { index: buildSpkExistenceIndex_(sourceSheet), source: 'sheet' };
}

function getMarketingOptionsFromDatabase_(sheet, spkIndex) {
  const cached = readCachedMarketingOptions_();
  if (cached) return cached;

  const validRows = Object.create(null);
  let lastDataRow = DB_DATA_START_ROW - 1;

  Object.keys(spkIndex || {}).forEach(function(spk) {
    const rowNumber = Number(spkIndex[spk]) || 0;
    if (rowNumber < DB_DATA_START_ROW) return;
    validRows[rowNumber] = true;
    if (rowNumber > lastDataRow) lastDataRow = rowNumber;
  });

  // Indeks SPK disimpan selama lima menit. Bila baris Spreadsheet dihapus
  // atau dipadatkan secara manual dalam rentang itu, nomor baris cache dapat
  // lebih besar daripada ukuran sheet dan membuat getRange menolak argumen.
  lastDataRow = Math.min(lastDataRow, sheet.getLastRow(), sheet.getMaxRows());
  if (lastDataRow < DB_DATA_START_ROW) return [];

  const values = sheet
    .getRange(
      DB_DATA_START_ROW,
      DB_COL.MARKETING,
      lastDataRow - DB_DATA_START_ROW + 1,
      1
    )
    .getDisplayValues();
  const seen = Object.create(null);
  const options = [];

  values.forEach(function(row, offset) {
    const rowNumber = DB_DATA_START_ROW + offset;
    if (!validRows[rowNumber]) return;

    const value = String(row[0] || '').trim().replace(/\s+/g, ' ');
    const key = value.toUpperCase();
    if (value === '' || value === '-' || seen[key]) return;
    seen[key] = true;
    options.push(value);
  });

  options.sort(function(left, right) {
    return left.toUpperCase().localeCompare(right.toUpperCase());
  });
  writeCachedMarketingOptions_(options);
  return options;
}

// Jalur ringan untuk Input SPK. Hanya kolom Marketing yang dibaca, tanpa
// membangun indeks ribuan nomor SPK terlebih dahulu.
function getMarketingOptionsFast_(sheet) {
  const cached = readCachedMarketingOptions_();
  if (cached) return cached;

  const sourceSheet = sheet || getDbSheetReadOnly_();
  const lastDataRow = getDatabaseLastSpkRowFast_(sourceSheet);
  if (lastDataRow < DB_DATA_START_ROW) {
    writeCachedMarketingOptions_([]);
    return [];
  }

  const values = sourceSheet
    .getRange(
      DB_DATA_START_ROW,
      DB_COL.MARKETING,
      lastDataRow - DB_DATA_START_ROW + 1,
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
  writeCachedMarketingOptions_(options);
  return options;
}

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

function addMarketingToOptionsCache_(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (normalized === '' || normalized === '-') return;

  const options = readCachedMarketingOptions_();
  if (!options) return;
  const key = normalized.toUpperCase();
  const exists = options.some(function(option) {
    return String(option || '').trim().toUpperCase() === key;
  });
  if (exists) return;

  options.push(normalized);
  options.sort(function(left, right) {
    return left.toUpperCase().localeCompare(right.toUpperCase());
  });
  writeCachedMarketingOptions_(options);
}

function getInputSpkOptionsFast() {
  const startedAt = Date.now();
  try {
    const cachedMarketing = readCachedMarketingOptions_();
    const cachedCustomers = readCachedCustomerOptions_();
    const cachedMachines = readCachedMachineOptions_();
    let databaseSheet = null;
    let spreadsheet = null;

    if (!cachedMarketing) {
      databaseSheet = getDbSheetReadOnly_();
      spreadsheet = databaseSheet.getParent();
    } else if (!cachedCustomers || !cachedMachines) {
      spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    }

    const marketingOptions = cachedMarketing || getMarketingOptionsFast_(databaseSheet);
    const customerOptions = cachedCustomers || getCustomerOptionsFromMaster_(spreadsheet);
    const machineOptions = cachedMachines || getMachineOptionsFromMaster_(spreadsheet);
    return {
      status: 'success',
      marketingOptions: marketingOptions,
      customerOptions: customerOptions,
      machineOptions: machineOptions,
      performance: {
        source: cachedMarketing && cachedCustomers && cachedMachines ? 'cache' : 'sheet',
        durationMs: Date.now() - startedAt
      }
    };
  } catch (error) {
    return { status: 'error', message: error && error.message ? error.message : String(error) };
  }
}

function addSpkToExistenceCache_(spk, rowNumber) {
  const key = normalizeSpk_(spk);
  if (key === '') return;

  const index = readCachedSpkExistenceIndex_();
  if (!index) return;
  index[key] = Math.max(DB_DATA_START_ROW, Math.floor(Number(rowNumber) || 0));
  writeCachedSpkExistenceIndex_(index);
}

function checkSpkExists(spk) {
  const startedAt = Date.now();
  try {
    const key = normalizeSpk_(spk);
    if (key === '') return { status: 'success', exists: false };

    const lookup = getSpkExistenceIndex_();
    return {
      status: 'success',
      exists: Object.prototype.hasOwnProperty.call(lookup.index, key),
      performance: {
        source: lookup.source,
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
    const cachedIndex = readCachedSpkExistenceIndex_();
    const cachedMarketing = readCachedMarketingOptions_();
    const cachedCustomers = readCachedCustomerOptions_();
    const sheet = cachedIndex && cachedMarketing ? null : getDbSheetReadOnly_();
    const lookup = cachedIndex
      ? { index: cachedIndex, source: 'cache' }
      : { index: buildSpkExistenceIndex_(sheet), source: 'sheet' };
    const marketingOptions = cachedMarketing ||
      getMarketingOptionsFromDatabase_(sheet, lookup.index);
    const customerOptions = cachedCustomers || getCustomerOptionsFromMaster_();
    const machineOptions = readCachedMachineOptions_() || getMachineOptionsFromMaster_();
    return {
      status: 'success',
      spks: Object.keys(lookup.index),
      marketingOptions: marketingOptions,
      customerOptions: customerOptions,
      machineOptions: machineOptions,
      performance: {
        source: lookup.source,
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

function getDatabaseSpkLayout_(sheet) {
  const physicalLastRow = sheet.getLastRow();
  if (physicalLastRow < DB_DATA_START_ROW) {
    return {
      dataCount: 0,
      lastDataRow: DB_DATA_START_ROW - 1,
      nextDataRow: DB_DATA_START_ROW,
      hasGaps: false
    };
  }

  const spkValues = sheet
    .getRange(
      DB_DATA_START_ROW,
      DB_COL.SPK,
      physicalLastRow - DB_DATA_START_ROW + 1,
      1
    )
    .getDisplayValues();

  let dataCount = 0;
  let lastDataRow = DB_DATA_START_ROW - 1;
  let hasGaps = false;

  spkValues.forEach(function(row, index) {
    if (normalizeSpk_(row[0]) === '') return;

    const actualRow = DB_DATA_START_ROW + index;
    const expectedRow = DB_DATA_START_ROW + dataCount;
    if (actualRow !== expectedRow) hasGaps = true;

    dataCount++;
    lastDataRow = actualRow;
  });

  return {
    dataCount: dataCount,
    lastDataRow: lastDataRow,
    nextDataRow: DB_DATA_START_ROW + dataCount,
    hasGaps: hasGaps
  };
}

function getDatabaseDataLastRow_(sheet) {
  return getDatabaseSpkLayout_(sheet).lastDataRow;
}

function getNextDatabaseDataRow_(sheet) {
  let layout = getDatabaseSpkLayout_(sheet);
  if (layout.hasGaps) {
    layout = compactDatabaseSpkRowsIfNeeded_(sheet);
  }

  return Math.max(DB_DATA_START_ROW, layout.lastDataRow + 1);
}

// Peta nomor SPK ke nomor barisnya, dibaca segar dari sheet. Dipakai penarikan
// data untuk memeriksa ulang keberadaan SPK tepat sebelum menulis, karena peta
// yang dibangun di awal proses bisa tertinggal bila ada SPK baru disimpan
// lewat Input SPK sementara penarikan berjalan.
function getDatabaseSpkRowMap_(sheet) {
  return getDatabaseSaveContext_(sheet).rowBySpk;
}

function getDatabaseSaveContext_(sheet) {
  const lastDataRow = getDatabaseLastSpkRowFast_(sheet);
  if (lastDataRow < DB_DATA_START_ROW) {
    return {
      rowBySpk: {},
      targetRow: DB_DATA_START_ROW,
      formatSourceRow: 0
    };
  }

  const spkValues = sheet
    .getRange(
      DB_DATA_START_ROW,
      DB_COL.SPK,
      lastDataRow - DB_DATA_START_ROW + 1,
      1
    )
    .getDisplayValues();
  const rowBySpk = {};

  spkValues.forEach(function(row, index) {
    const actualRow = DB_DATA_START_ROW + index;
    const spk = normalizeSpk_(row[0]);
    if (spk === '') return;
    if (!rowBySpk[spk]) rowBySpk[spk] = actualRow;
  });

  return {
    rowBySpk: rowBySpk,
    targetRow: lastDataRow + 1,
    formatSourceRow: lastDataRow
  };
}

function compactDatabaseSpkRowsIfNeeded_(sheet) {
  const layout = getDatabaseSpkLayout_(sheet);
  if (!layout.hasGaps) return layout;

  sortDatabaseBySpk_(sheet);
  SpreadsheetApp.flush();
  return getDatabaseSpkLayout_(sheet);
}

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

function sortDatabaseBySpk_(sheet) {
  const lastRow = getDatabaseDataLastRow_(sheet);
  if (lastRow < DB_DATA_START_ROW) return;

  const rowCount = lastRow - DB_DATA_START_ROW + 1;
  const originalMaxColumns = sheet.getMaxColumns();
  const helperColumn = originalMaxColumns + 1;

  sheet.insertColumnAfter(originalMaxColumns);

  try {
    const spkValues = sheet
      .getRange(DB_DATA_START_ROW, DB_COL.SPK, rowCount, 1)
      .getValues();
    const sortKeys = spkValues.map(function(row, index) {
      return [buildSpkSortKey_(row[0], index)];
    });

    sheet
      .getRange(DB_DATA_START_ROW, helperColumn, rowCount, 1)
      .setValues(sortKeys);

    sheet
      .getRange(DB_DATA_START_ROW, 1, rowCount, helperColumn)
      .sort({ column: helperColumn, ascending: true });
  } finally {
    sheet.deleteColumn(helperColumn);
  }
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
function setKodeItemValue_(sheet, rowNumber, kodeItem) {
  if (sheet.getMaxColumns() < DB_COL.KODE_ITEM) return;
  sheet.getRange(rowNumber, DB_COL.KODE_ITEM).setValue(kodeItem);
}

function ensureKeteranganWarnaColumn_(sheet) {
  const missingColumns = DB_COL.KETERANGAN_WARNA - sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumns);
  }

  const headerCell = sheet.getRange(1, DB_COL.KETERANGAN_WARNA);
  const typeCell = sheet.getRange(2, DB_COL.KETERANGAN_WARNA);
  if (String(headerCell.getValue()).trim() === '') {
    headerCell.setValue('Keterangan Warna');
  }
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');
}

function setKeteranganWarnaValue_(sheet, rowNumber, value) {
  ensureKeteranganWarnaColumn_(sheet);
  sheet
    .getRange(rowNumber, DB_COL.KETERANGAN_WARNA)
    .setValue(normalizeKeteranganWarna_(value));
}

function ensureKeteranganBahanColumn_(sheet) {
  const missingColumns = DB_COL.KETERANGAN_BAHAN - sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumns);
  }

  const headerCell = sheet.getRange(1, DB_COL.KETERANGAN_BAHAN);
  const typeCell = sheet.getRange(2, DB_COL.KETERANGAN_BAHAN);
  if (String(headerCell.getValue()).trim() === '') {
    headerCell.setValue('Keterangan Bahan');
  }
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');
}

function setKeteranganBahanValue_(sheet, rowNumber, value) {
  ensureKeteranganBahanColumn_(sheet);
  sheet
    .getRange(rowNumber, DB_COL.KETERANGAN_BAHAN)
    .setValue(normalizeKeteranganBahan_(value));
}

function ensureMeterRollColumn_(sheet) {
  const missingColumns = DB_COL.METER_ROLL - sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumns);
  }

  const headerCell = sheet.getRange(1, DB_COL.METER_ROLL);
  const typeCell = sheet.getRange(2, DB_COL.METER_ROLL);
  if (String(headerCell.getValue()).trim() === '') {
    headerCell.setValue('Meter/Roll');
  }
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('num');
}

// Membaca satu baris penuh A:EC. Bila kolom tambahan belum dibuat di
// Spreadsheet, lebar bacanya dipersempit lalu hasilnya dipad agar seluruh
// indeks DB_COL tetap aman dipakai tanpa memicu error range.
function readDatabaseRowValues_(sheet, rowNumber) {
  const total = databaseTotalColumns_();
  const width = Math.min(total, sheet.getMaxColumns());
  const values = sheet.getRange(rowNumber, 1, 1, width).getValues()[0];
  while (values.length < total) values.push('');
  return values;
}

function ensureDbColumnCapacity_(sheet) {
  ensureReleaseColumn_(sheet);
  ensureKeteranganArtikelColumn_(sheet);
  ensureWarnaColumns_(sheet);
  ensureProcessNoteColumns_(sheet);
  ensureCalculationInputColumns_(sheet);
  ensureEtaBeliBahanColumns_(sheet);
  ensureKodeItemColumn_(sheet);
  ensureRoutingDetailColumns_(sheet);
  ensureKeteranganWarnaColumn_(sheet);
  ensureKeteranganBahanColumn_(sheet);
  ensureMeterRollColumn_(sheet);
  ensureExtraInputColumns_(sheet);
}

function ensureExtraInputColumns_(sheet) {
  const columns = extraInputColumns_();
  const lastColumn = columns.reduce(function(maximum, item) {
    return Math.max(maximum, item.column);
  }, 0);
  const missingColumns = lastColumn - sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumns);
  }

  columns.forEach(function(item) {
    const headerCell = sheet.getRange(1, item.column);
    const typeCell = sheet.getRange(2, item.column);
    if (String(headerCell.getValue()).trim() === '') headerCell.setValue(item.header);
    if (String(typeCell.getValue()).trim() === '') typeCell.setValue(item.type);
  });
}

// Dapat dijalankan sekali dari editor Apps Script setelah pembaruan. Proses
// simpan SPK juga memanggil pemeriksaan yang sama, jadi fungsi ini aman bila
// dijalankan lebih dari sekali dan tidak mengubah data yang sudah ada.
function adminPastikanKolomAksesorisRouting() {
  const sheet = getDbSheet_();
  ensureExtraInputColumns_(sheet);
  SpreadsheetApp.flush();
  return {
    status: 'success',
    sheet: sheet.getName(),
    columns: [
      columnNumberToLetter_(DB_COL.AKSESORIS_ROUTING),
      columnNumberToLetter_(DB_COL.KEBUTUHAN_AKSESORIS),
      columnNumberToLetter_(DB_COL.UOM_AKSESORIS)
    ],
    headers: [
      sheet.getRange(1, DB_COL.AKSESORIS_ROUTING).getDisplayValue(),
      sheet.getRange(1, DB_COL.KEBUTUHAN_AKSESORIS).getDisplayValue(),
      sheet.getRange(1, DB_COL.UOM_AKSESORIS).getDisplayValue()
    ]
  };
}

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

function getExtraInputsFromRow_(row) {
  return {
    pcsKgMode: normalizeEnumValue_(row[DB_COL.PCS_KG_MODE - 1], PCS_KG_MODE_OPTIONS, ''),
    jenisPotongan: normalizeEnumValue_(row[DB_COL.JENIS_POTONGAN - 1], JENIS_POTONGAN_OPTIONS, ''),
    poMasuk: dateToInput_(row[DB_COL.PO_MASUK - 1]),
    stok: numberOrEmptyForClient_(row[DB_COL.STOK - 1]),
    ots: numberOrEmptyForClient_(row[DB_COL.OTS - 1]),
    wip: numberOrEmptyForClient_(row[DB_COL.WIP - 1]),
    toleransiProduksi: percentToInput_(row[DB_COL.TOLERANSI_PRODUKSI - 1]),
    pengirimanParsial: parsePengirimanParsialCell_(row[DB_COL.PENGIRIMAN_PARSIAL - 1]),
    bahanLebar: numberOrEmptyForClient_(row[DB_COL.BAHAN_LEBAR - 1]),
    bahanPanjang: numberOrEmptyForClient_(row[DB_COL.BAHAN_PANJANG - 1]),
    bahanTebal: numberOrEmptyForClient_(row[DB_COL.BAHAN_TEBAL - 1]),
    bahanDensity: numberOrEmptyForClient_(row[DB_COL.BAHAN_DENSITY - 1]),
    aksesorisRouting: valueOrEmpty_(row[DB_COL.AKSESORIS_ROUTING - 1]),
    kebutuhanAksesoris: valueOrEmpty_(row[DB_COL.KEBUTUHAN_AKSESORIS - 1]),
    uomAksesoris: valueOrEmpty_(row[DB_COL.UOM_AKSESORIS - 1])
  };
}

const ROUTING_ACCESSORY_UOMS = ['PCS', 'KG', 'ROLL', 'METER', 'LITER', 'SET', 'UNIT', 'PACK'];
const ROUTING_ACCESSORY_LABELS = {
  blowing: 'Blowing', printing: 'Printing', folding: 'Folding',
  slitting: 'Slitting', gusset: 'Gusset', cutting: 'Cutting'
};

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

function buildRoutingAccessoryColumns_(routingSteps) {
  const names = [];
  const needs = [];
  const uoms = [];
  (Array.isArray(routingSteps) ? routingSteps : []).forEach(function(step, index) {
    if (!step || step.key === 'mixer') return;
    const values = step.values && typeof step.values === 'object' ? step.values : {};
    const entries = parseRoutingAccessoryEntries_(values['aksesorisData-' + step.key]);
    const route = (index + 1) + '. ' + (ROUTING_ACCESSORY_LABELS[step.key] || step.key);
    entries.forEach(function(entry) {
      names.push(route + ': ' + entry.nama);
      needs.push(route + ': ' + entry.kebutuhan);
      uoms.push(route + ': ' + entry.uom);
    });
  });
  return {
    names: names.join('\n').slice(0, 45000),
    needs: needs.join('\n').slice(0, 45000),
    uoms: uoms.join('\n').slice(0, 45000)
  };
}

// Ditulis sebagai satu rentang berurutan, lima belas kolom mulai dari Mode
// PCS/KG. Posisi awalnya mengikuti tata letak sheet yang sedang dibuka.
function setExtraInputsForRow_(sheet, rowNumber, payload) {
  ensureExtraInputColumns_(sheet);
  const input = payload || {};
  const angka = function(nilai) {
    const hasil = parseCalculationNumber_(nilai);
    return hasil === null ? '' : hasil;
  };

  const accessories = buildRoutingAccessoryColumns_(input.routingSteps);
  sheet.getRange(rowNumber, DB_COL.PCS_KG_MODE, 1, 15).setValues([[
    normalizeEnumValue_(input.pcsKgMode, PCS_KG_MODE_OPTIONS, ''),
    normalizeEnumValue_(input.jenisPotongan, JENIS_POTONGAN_OPTIONS, ''),
    parseTanggal_(input.poMasuk),
    angka(input.stok),
    angka(input.ots),
    angka(input.wip),
    toDecimalPercent_(input.toleransiProduksi),
    serializePengirimanParsial_(input.pengirimanParsial),
    angka(input.bahanLebar),
    angka(input.bahanPanjang),
    angka(input.bahanTebal),
    angka(input.bahanDensity),
    accessories.names,
    accessories.needs,
    accessories.uoms
  ]]);
}

// Judul dan tipe diisi per kolom, bukan sebagai satu rentang, dan hanya bila
// selnya masih kosong, supaya judul yang sudah diubah manual tidak tertimpa.
function ensureRoutingDetailColumns_(sheet) {
  const lastColumn = ROUTING_DETAIL_COLUMNS.reduce(function(maximum, item) {
    return Math.max(maximum, item.column);
  }, DB_COL.ROUTING_STEPS);
  const missingColumns = lastColumn - sheet.getMaxColumns();
  if (missingColumns > 0) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), missingColumns);
  }

  ROUTING_DETAIL_COLUMNS.forEach(function(item) {
    const headerCell = sheet.getRange(1, item.column);
    const typeCell = sheet.getRange(2, item.column);
    if (String(headerCell.getValue()).trim() === '') {
      headerCell.setValue(item.header);
    }
    if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');
  });

  const stepsHeader = sheet.getRange(1, DB_COL.ROUTING_STEPS);
  const stepsType = sheet.getRange(2, DB_COL.ROUTING_STEPS);
  if (String(stepsHeader.getValue()).trim() === '') {
    stepsHeader.setValue(ROUTING_STEPS_HEADER);
  }
  if (String(stepsType.getValue()).trim() === '') stepsType.setValue('str');
}

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

function getRoutingDetailsFromRow_(row) {
  const details = {};
  ROUTING_DETAIL_COLUMNS.forEach(function(item) {
    details[item.key] = valueOrEmpty_(row[item.column - 1]);
  });
  details.routingSteps = parseRoutingStepsCell_(row[DB_COL.ROUTING_STEPS - 1]);
  details.blowingThreat = enumForClient_(
    details.blowingThreat,
    ['NON THREAT', 'THREAT 1 SISI', 'THREAT 2 SISI', 'THREAT POTONG'],
    'NON THREAT'
  );
  details.blowingModeCetak = enumForClient_(
    details.blowingModeCetak,
    ['NON PRINT', 'INLINE'],
    'NON PRINT'
  );
  return details;
}

function setRoutingDetailsForRow_(sheet, rowNumber, payload) {
  ensureRoutingDetailColumns_(sheet);
  const input = payload || {};

  // Penulisan dikelompokkan per rentang kolom yang berurutan. Saat ini seluruh
  // kolom detail berada di DS:DZ sehingga hanya menghasilkan satu rentang,
  // namun pengelompokannya dipertahankan agar penambahan kolom di ujung sheet
  // nanti tidak menimpa kolom lain di antaranya.
  const entries = ROUTING_DETAIL_COLUMNS
    .map(function(item) {
      return {
        column: item.column,
        value: String(input[item.key] === null || input[item.key] === undefined
          ? ''
          : input[item.key]).replace(/\s+/g, ' ').trim().slice(0, 200)
      };
    })
    .sort(function(a, b) { return a.column - b.column; });

  let runStart = 0;
  for (let index = 1; index <= entries.length; index++) {
    const isBreak = index === entries.length ||
      entries[index].column !== entries[index - 1].column + 1;
    if (!isBreak) continue;

    const run = entries.slice(runStart, index);
    sheet
      .getRange(rowNumber, run[0].column, 1, run.length)
      .setValues([run.map(function(entry) { return entry.value; })]);
    runStart = index;
  }

  // Urutan langkah ditulis apa adanya, di luar pengelompokan di atas, karena
  // isinya JSON yang tidak boleh dipangkas maupun dirapatkan spasinya.
  sheet
    .getRange(rowNumber, DB_COL.ROUTING_STEPS)
    .setValue(serializeRoutingSteps_(input.routingSteps));
}

function ensureWarnaColumns_(sheet) {
  const totalColumns = (DB_COL.WARNA_END - DB_COL.WARNA_START + 1);
  const headerRange = sheet.getRange(1, DB_COL.WARNA_START, 1, totalColumns);
  const typeRange = sheet.getRange(2, DB_COL.WARNA_START, 1, totalColumns);
  const headers = headerRange.getValues()[0];
  const types = typeRange.getValues()[0];
  const expectedHeaders = [];
  const expectedTypes = [];
  for (let index = 1; index <= DB_MAX_WARNA; index++) {
    expectedHeaders.push('Warna ' + index, 'Pemakaian ' + index);
    expectedTypes.push('str', 'num');
  }

  const normalizedHeaders = expectedHeaders.map(function(header, index) {
    return String(headers[index] || '').trim() === '' ? header : headers[index];
  });
  const normalizedTypes = expectedTypes.map(function(type, index) {
    return String(types[index] || '').trim() === '' ? type : types[index];
  });

  if (normalizedHeaders.some(function(header, index) { return header !== headers[index]; })) {
    headerRange.setValues([normalizedHeaders]);
  }
  if (normalizedTypes.some(function(type, index) { return type !== types[index]; })) {
    typeRange.setValues([normalizedTypes]);
  }
}

function ensureKeteranganArtikelColumn_(sheet) {
  const headerCell = sheet.getRange(1, DB_COL.KETERANGAN_ARTIKEL);
  const typeCell = sheet.getRange(2, DB_COL.KETERANGAN_ARTIKEL);
  if (String(headerCell.getValue()).trim() === '') headerCell.setValue('Keterangan Artikel');
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');
}

// Hanya mengisi teks header/tipe bila selnya masih kosong. Kolom DR tidak
// pernah disisipkan dari kode; kolomnya dibuat manual di Spreadsheet.
function ensureKodeItemColumn_(sheet) {
  if (sheet.getMaxColumns() < DB_COL.KODE_ITEM) return;

  const headerCell = sheet.getRange(1, DB_COL.KODE_ITEM);
  const typeCell = sheet.getRange(2, DB_COL.KODE_ITEM);
  if (String(headerCell.getValue()).trim() === '') headerCell.setValue('Kode Item');
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');
}

function ensureEtaBeliBahanColumns_(sheet) {
  const headerRange = sheet.getRange(1, DB_COL.ETA_BELI_START, 1, 16);
  const typeRange = sheet.getRange(2, DB_COL.ETA_BELI_START, 1, 16);
  const headers = headerRange.getValues()[0];
  const types = typeRange.getValues()[0];
  const expectedHeaders = [
    'ETA 1', 'QTY', 'UOM',
    'ETA 2', 'QTY', 'UOM',
    'ETA 3', 'QTY', 'UOM',
    'ETA 4', 'QTY', 'UOM',
    'ETA 5', 'QTY', 'UOM',
    'Keterangan'
  ];
  const expectedTypes = [
    'date', 'num', 'str',
    'date', 'num', 'str',
    'date', 'num', 'str',
    'date', 'num', 'str',
    'date', 'num', 'str',
    'str'
  ];
  const normalizedHeaders = expectedHeaders.map(function(header, index) {
    return String(headers[index] || '').trim() === ''
      ? header
      : headers[index];
  });
  const normalizedTypes = expectedTypes.map(function(type, index) {
    return String(types[index] || '').trim() === ''
      ? type
      : types[index];
  });

  if (normalizedHeaders.some(function(header, index) {
    return header !== headers[index];
  })) {
    headerRange.setValues([normalizedHeaders]);
  }
  if (normalizedTypes.some(function(type, index) {
    return type !== types[index];
  })) {
    typeRange.setValues([normalizedTypes]);
  }
}

function ensureCalculationInputColumns_(sheet) {
  const meterPerKgHeader = sheet.getRange(1, DB_COL.METER_PER_KG);
  const meterPerKgType = sheet.getRange(2, DB_COL.METER_PER_KG);
  if (normalizeHeader_(meterPerKgHeader.getValue()) !== 'METER/KG') {
    meterPerKgHeader.setValue('METER/KG');
  }
  if (String(meterPerKgType.getValue()).trim() === '') meterPerKgType.setValue('num');
}

function ensureProcessNoteColumns_(sheet) {
  migrateLegacyProcessNoteColumns_(sheet);

  const headerRange = sheet.getRange(
    1,
    DB_COL.KET_PROSES_START,
    1,
    PROCESS_NOTE_HEADERS.length
  );
  const typeRange = sheet.getRange(
    2,
    DB_COL.KET_PROSES_START,
    1,
    PROCESS_NOTE_HEADERS.length
  );
  const headers = headerRange.getValues()[0];
  const types = typeRange.getValues()[0];
  const normalizedHeaders = PROCESS_NOTE_HEADERS.map(function(header, index) {
    return String(headers[index] || '').trim() === header
      ? headers[index]
      : header;
  });
  const normalizedTypes = types.map(function(type) {
    return String(type || '').trim() === '' ? 'str' : type;
  });

  const headersChanged = normalizedHeaders.some(function(header, index) {
    return header !== headers[index];
  });
  const typesChanged = normalizedTypes.some(function(type, index) {
    return type !== types[index];
  });

  if (headersChanged) headerRange.setValues([normalizedHeaders]);
  if (typesChanged) typeRange.setValues([normalizedTypes]);
}

function migrateLegacyProcessNoteColumns_(sheet) {
  const legacyHeaderRange = sheet.getRange(
    1,
    DB_COL.KET_PROSES_START,
    1,
    PROCESS_NOTE_HEADERS.length
  );
  const headers = legacyHeaderRange.getValues()[0];
  const hasLegacyLayout = LEGACY_PROCESS_NOTE_HEADERS.every(function(header, index) {
    return normalizeHeader_(headers[index]) === normalizeHeader_(header);
  }) && String(headers[PROCESS_NOTE_HEADERS.length - 1] || '').trim() === '';

  if (!hasLegacyLayout) return;

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const legacyValues = sheet
    .getRange(1, DB_COL.KET_PROSES_START, lastRow, LEGACY_PROCESS_NOTE_HEADERS.length)
    .getValues();

  sheet
    .getRange(1, DB_COL.KET_PROSES_START + 1, lastRow, LEGACY_PROCESS_NOTE_HEADERS.length)
    .setValues(legacyValues);
  sheet.getRange(1, DB_COL.KET_PROSES_START, lastRow, 1).clearContent();
}

function normalizeHeader_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase();
}

function ensureReleaseColumn_(sheet) {
  const headerCell = sheet.getRange(1, DB_COL.RELEASE);
  const typeCell = sheet.getRange(2, DB_COL.RELEASE);
  const headerWasBlank = String(headerCell.getValue()).trim() === '';

  if (headerWasBlank) headerCell.setValue('Release');
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');

  // Migrasi satu kali untuk data lama saat kolom Release pertama kali dibuat.
  if (!headerWasBlank) return;

  const lastRow = getDatabaseDataLastRow_(sheet);
  if (lastRow < DB_DATA_START_ROW) return;

  const rowCount = lastRow - DB_DATA_START_ROW + 1;
  const spkValues = sheet
    .getRange(DB_DATA_START_ROW, DB_COL.SPK, rowCount, 1)
    .getValues();
  const releaseRange = sheet.getRange(DB_DATA_START_ROW, DB_COL.RELEASE, rowCount, 1);
  const releaseValues = releaseRange.getValues();
  let changed = false;

  for (let index = 0; index < rowCount; index++) {
    if (
      normalizeSpk_(spkValues[index][0]) !== '' &&
      String(releaseValues[index][0] || '').trim() === ''
    ) {
      releaseValues[index][0] = 'Tidak';
      changed = true;
    }
  }

  if (changed) releaseRange.setValues(releaseValues);
}

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

function getStoredMeterRoll_(sheet, rowNumber, row) {
  const storedValue = parseCalculationNumber_(
    Array.isArray(row) ? row[DB_COL.METER_ROLL - 1] : null
  );
  if (storedValue > 0) return storedValue;

  // Fallback untuk data lama sebelum kolom EC dibuat.
  const note = String(
    sheet.getRange(rowNumber, DB_COL.UOM_ORDER).getNote() || ''
  );
  const match = note.match(
    new RegExp('(?:^|\\n)' + METER_ROLL_NOTE_PREFIX + '([^\\n]+)')
  );
  const noteValue = match ? parseCalculationNumber_(match[1]) : null;
  if (noteValue > 0) return noteValue;

  // Meter/Roll sepenuhnya ditentukan operator lewat kolom Meter / Roll pada
  // wizard. Nilainya tidak lagi diturunkan dari ukuran dan keluar bahan,
  // karena penguraian Ukuran Jadi order roll (lebar x tebal x panjang roll)
  // berbeda dari order kantong (lebar x panjang x tebal) sehingga angka
  // tebalnya tertukar dengan panjang roll dan hasilnya tidak dapat dipercaya.
  return '';
}

function setStoredMeterRoll_(sheet, rowNumber, value) {
  ensureMeterRollColumn_(sheet);
  const meterRoll = parseCalculationNumber_(value);
  sheet
    .getRange(rowNumber, DB_COL.METER_ROLL)
    .setValue(meterRoll > 0 ? meterRoll : '')
    .setNumberFormat('0.############');

  // Bersihkan format penyimpanan lama tanpa menghapus catatan lain.
  const uomCell = sheet.getRange(rowNumber, DB_COL.UOM_ORDER);
  const currentNote = String(uomCell.getNote() || '');
  const retainedLines = currentNote
    .split(/\r?\n/)
    .filter(function(line) {
      return line.indexOf(METER_ROLL_NOTE_PREFIX) !== 0;
    })
    .filter(function(line) {
      return line.trim() !== '';
    });
  uomCell.setNote(retainedLines.join('\n'));
}

function setStoredMeterRollForNewRow_(sheet, rowNumber, value) {
  setStoredMeterRoll_(sheet, rowNumber, value);
}

function migrateLegacyMeterRollNotes_(sheet) {
  ensureMeterRollColumn_(sheet);
  const lastRow = getDatabaseDataLastRow_(sheet);
  if (lastRow < DB_DATA_START_ROW) return 0;

  const rowCount = lastRow - DB_DATA_START_ROW + 1;
  const meterRange = sheet.getRange(
    DB_DATA_START_ROW,
    DB_COL.METER_ROLL,
    rowCount,
    1
  );
  const meterValues = meterRange.getValues();
  const uomRange = sheet.getRange(
    DB_DATA_START_ROW,
    DB_COL.UOM_ORDER,
    rowCount,
    1
  );
  const notes = uomRange.getNotes();
  let migratedRows = 0;

  meterValues.forEach(function(rowValue, index) {
    if (parseCalculationNumber_(rowValue[0]) > 0) return;
    const match = String(notes[index][0] || '').match(
      new RegExp('(?:^|\\n)' + METER_ROLL_NOTE_PREFIX + '([^\\n]+)')
    );
    const legacyValue = match ? parseCalculationNumber_(match[1]) : null;
    if (!(legacyValue > 0)) return;
    rowValue[0] = legacyValue;
    migratedRows += 1;
  });

  if (migratedRows > 0) {
    meterRange.setValues(meterValues).setNumberFormat('0.############');
  }
  return migratedRows;
}
// ==========================================
// AMBIL DATA SPK UNTUK REPEAT ORDER
// ==========================================
function getSpkData(spk) {
  try {
    const key = normalizeSpk_(spk);
    if (key === '') {
      return { status: 'not_found', found: false, message: 'Nomor SPK sebelumnya wajib diisi.' };
    }

    // Jalur baca murni: tanpa pemeriksaan schema dan tanpa pemindaian penuh
    // kolom SPK agar tetap cepat pada database berukuran besar.
    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(sheet, key, 0);
    if (!rowNumber) {
      return {
        status: 'not_found',
        found: false,
        message: "Nomor SPK '" + key + "' tidak ditemukan di Database."
      };
    }

    const row = readDatabaseRowValues_(sheet, rowNumber);
    const proses = {};
    PROSES_KEYS.forEach(function(keyName, index) {
      proses[keyName] = isProcessActive_(row[DB_COL.PROSES_MIXER - 1 + index]);
    });
    const keteranganProses = getProcessNotesFromRow_(row);

    const bsPercent = {};
    BS_KEYS.forEach(function(keyName, index) {
      bsPercent[keyName] = percentToInput_(row[DB_COL.BS_START - 1 + index]);
    });

    const komposisi = [];
    for (let index = 0; index < 7; index++) {
      const start = DB_COL.KOMPOSISI_START - 1 + (index * 3);
      komposisi.push({
        material: valueOrEmpty_(row[start]),
        kg: numberOrEmptyForClient_(row[start + 1]),
        percent: percentToInput_(row[start + 2])
      });
    }

    // Slot 8 hanya nama bahan di kolom BR. Posisi slot tetap dipertahankan.
    komposisi.push({
      material: valueOrEmpty_(
        row[DB_COL.KOMPOSISI_START - 1 + ((DB_MAX_BAHAN - 1) * 3)]
      ),
      kg: '',
      percent: ''
    });
    while (komposisi.length > 2) {
      const last = komposisi[komposisi.length - 1];
      if (last.material !== '' || last.kg !== '' || last.percent !== '') break;
      komposisi.pop();
    }

    return {
      status: 'success',
      found: true,
      data: {
        spk: normalizeSpk_(row[DB_COL.SPK - 1]),
        tanggal: dateToInput_(row[DB_COL.TANGGAL - 1]),
        jenisOrder: valueOrEmpty_(row[DB_COL.JENIS_ORDER - 1]),
        marketing: valueOrEmpty_(row[DB_COL.MARKETING - 1]),
        nomorPO: valueOrEmpty_(row[DB_COL.NOMOR_PO - 1]),
        customer: valueOrEmpty_(row[DB_COL.CUSTOMER - 1]),
        material: valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
        film: valueOrEmpty_(row[DB_COL.FILM - 1]),
        artikel: valueOrEmpty_(row[DB_COL.ARTIKEL - 1]),
        kodeItem: valueOrEmpty_(row[DB_COL.KODE_ITEM - 1]),
        keteranganArtikel: valueOrEmpty_(row[DB_COL.KETERANGAN_ARTIKEL - 1]),
        keteranganWarna: valueOrEmpty_(row[DB_COL.KETERANGAN_WARNA - 1]),
        keteranganBahan: valueOrEmpty_(row[DB_COL.KETERANGAN_BAHAN - 1]),
        modelKantong: valueOrEmpty_(row[DB_COL.MODEL_KANTONG - 1]),
        ukuranBlow: valueOrEmpty_(row[DB_COL.UKURAN_BLOW - 1]),
        ukuranJadi: valueOrEmpty_(row[DB_COL.UKURAN_JADI - 1]),
        ...getRoutingDetailsFromRow_(row),
        ...getExtraInputsFromRow_(row),
        proses: proses,
        keteranganProses: keteranganProses,
        finishing: enumForClient_(row[DB_COL.FINISHING - 1], FINISHING_OPTIONS, '-'),
        handlePm: enumForClient_(row[DB_COL.HANDLE_PON - 1], HANDLE_PON_OPTIONS, '-'),
        bsPercent: bsPercent,
        jumlahOrder: numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
        uomOrder: enumForClient_(row[DB_COL.UOM_ORDER - 1], ['PCS', 'KG', 'ROLL'], 'PCS'),
        keluarBahan: numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
        uomKB: enumForClient_(row[DB_COL.UOM_KB - 1], ['KG', 'ROLL'], ''),
        meterRoll: numberOrEmptyForClient_(
          getStoredMeterRoll_(sheet, rowNumber, row)
        ),
        toleransi: percentToInput_(row[DB_COL.TOLERANSI - 1]),
        etd: dateToInput_(row[DB_COL.ETD - 1]),
        komposisi: komposisi,
        warna: getWarnaFromRow_(row),
        spkReferensi: valueOrEmpty_(row[DB_COL.SPK_REFERENSI - 1])
      }
    };
  } catch (e) {
    return { status: 'error', found: false, message: e.message };
  }
}

// Jalur ringan khusus modal Edit di halaman PPIC.
function getSpkEditData(spk, preferredRowNumber) {
  try {
    const key = normalizeSpk_(spk);
    if (key === '') {
      return {
        status: 'not_found',
        found: false,
        message: 'Nomor SPK yang akan diedit wajib diisi.'
      };
    }

    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(sheet, key, preferredRowNumber);
    if (!rowNumber) {
      return {
        status: 'not_found',
        found: false,
        message: "Nomor SPK '" + key + "' tidak ditemukan di Database."
      };
    }

    // Satu pembacaan baris untuk seluruh kolom yang dipakai modal edit,
    // termasuk Kode Item di kolom terakhir. Tidak ada migrasi schema,
    // flush, atau pemindaian seluruh kolom SPK.
    const row = readDatabaseRowValues_(sheet, rowNumber);
    const uomOrder = enumForClient_(
      row[DB_COL.UOM_ORDER - 1],
      ['PCS', 'KG', 'ROLL'],
      'PCS'
    );

    return {
      status: 'success',
      found: true,
      data: {
        rowNumber: rowNumber,
        spk: normalizeSpk_(row[DB_COL.SPK - 1]),
        tanggal: dateToInput_(row[DB_COL.TANGGAL - 1]),
        jenisOrder: valueOrEmpty_(row[DB_COL.JENIS_ORDER - 1]),
        marketing: valueOrEmpty_(row[DB_COL.MARKETING - 1]),
        nomorPO: valueOrEmpty_(row[DB_COL.NOMOR_PO - 1]),
        customer: valueOrEmpty_(row[DB_COL.CUSTOMER - 1]),
        material: valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
        film: valueOrEmpty_(row[DB_COL.FILM - 1]),
        artikel: valueOrEmpty_(row[DB_COL.ARTIKEL - 1]),
        kodeItem: valueOrEmpty_(row[DB_COL.KODE_ITEM - 1]),
        keteranganArtikel: valueOrEmpty_(row[DB_COL.KETERANGAN_ARTIKEL - 1]),
        keteranganWarna: valueOrEmpty_(row[DB_COL.KETERANGAN_WARNA - 1]),
        keteranganBahan: valueOrEmpty_(row[DB_COL.KETERANGAN_BAHAN - 1]),
        modelKantong: valueOrEmpty_(row[DB_COL.MODEL_KANTONG - 1]),
        ukuranBlow: valueOrEmpty_(row[DB_COL.UKURAN_BLOW - 1]),
        ukuranJadi: valueOrEmpty_(row[DB_COL.UKURAN_JADI - 1]),
        ...getRoutingDetailsFromRow_(row),
        ...getExtraInputsFromRow_(row),
        jumlahOrder: numberOrEmptyForClient_(
          row[DB_COL.JUMLAH_ORDER - 1]
        ),
        uomOrder: uomOrder,
        keluarBahan: numberOrEmptyForClient_(
          row[DB_COL.KELUAR_BAHAN - 1]
        ),
        uomKB: enumForClient_(
          row[DB_COL.UOM_KB - 1],
          ['KG', 'ROLL'],
          ''
        ),
        meterRoll: uomOrder === 'ROLL'
          ? numberOrEmptyForClient_(
              getStoredMeterRoll_(sheet, rowNumber, row)
            )
          : '',
        toleransi: percentToInput_(row[DB_COL.TOLERANSI - 1]),
        etd: dateToInput_(row[DB_COL.ETD - 1]),
        spkReferensi: valueOrEmpty_(
          row[DB_COL.SPK_REFERENSI - 1]
        )
      }
    };
  } catch (e) {
    return {
      status: 'error',
      found: false,
      message: e.message
    };
  }
}

// ==========================================
// DATA & STATUS CETAK SPK
// ==========================================
function getSpkPrintData(spk, preferredRowNumber, authToken, includeSignatureData) {
  try {
    var printSession = null;
    if (authToken) printSession = requireApprovalSession_(authToken);
    const key = normalizeSpk_(spk);
    if (key === '') {
      return { status: 'not_found', found: false, message: 'Nomor SPK untuk dicetak tidak ditemukan.' };
    }

    // Jalur baca murni; rowNumber dari halaman pemanggil (bila ada) membuat
    // pencarian baris menjadi satu pembacaan sel saja.
    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(sheet, key, preferredRowNumber);
    if (!rowNumber) {
      return {
        status: 'not_found',
        found: false,
        message: "Nomor SPK '" + key + "' tidak ditemukan di Database."
      };
    }

    const row = readDatabaseRowValues_(sheet, rowNumber);
    const proses = {};
    PROSES_KEYS.forEach(function(keyName, index) {
      proses[keyName] = isProcessActive_(row[DB_COL.PROSES_MIXER - 1 + index]);
    });
    const keteranganProses = getProcessNotesFromRow_(row);

    const bsPercent = {};
    BS_KEYS.forEach(function(keyName, index) {
      bsPercent[keyName] = percentToInput_(row[DB_COL.BS_START - 1 + index]);
    });

    const komposisi = [];
    for (let index = 0; index < DB_MAX_BAHAN; index++) {
      if (index === 7) {
        const slotDelapan = valueOrEmpty_(
          row[DB_COL.KOMPOSISI_START - 1 + ((DB_MAX_BAHAN - 1) * 3)]
        );
        if (slotDelapan !== '') komposisi.push({ material: slotDelapan, kg: '', percent: '' });
        continue;
      }

      const start = DB_COL.KOMPOSISI_START - 1 + (index * 3);
      const item = {
        material: valueOrEmpty_(row[start]),
        kg: numberOrEmptyForClient_(row[start + 1]),
        percent: percentToInput_(row[start + 2])
      };

      if (item.material !== '' || item.kg !== '' || item.percent !== '') {
        komposisi.push(item);
      }
    }

    const releaseValue = String(row[DB_COL.RELEASE - 1] || '').trim().toUpperCase() === 'YA'
      ? 'YA'
      : 'Tidak';
    const parsedDimensions = parseCalculationDimensions_(
      row[DB_COL.UKURAN_BLOW - 1],
      row[DB_COL.UKURAN_JADI - 1]
    );

    // Pemanggil lama tetap menerima paket lengkap. Pratinjau sematan secara
    // eksplisit mengirim false agar lembar utama tidak menunggu file Drive.
    const shouldIncludeSignatures = Boolean(printSession) && includeSignatureData !== false;
    const approvalSummary = getSpkApprovalSummary_(key, shouldIncludeSignatures);
    const mayPrintReleasedLegacy = Boolean(printSession && releaseValue === 'YA');
    return {
      status: 'success',
      found: true,
      data: {
        rowNumber: rowNumber,
        spk: normalizeSpk_(row[DB_COL.SPK - 1]),
        tanggal: dateToInput_(row[DB_COL.TANGGAL - 1]),
        jenisOrder: valueOrEmpty_(row[DB_COL.JENIS_ORDER - 1]),
        marketing: valueOrEmpty_(row[DB_COL.MARKETING - 1]),
        nomorPO: valueOrEmpty_(row[DB_COL.NOMOR_PO - 1]),
        customer: valueOrEmpty_(row[DB_COL.CUSTOMER - 1]),
        material: valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
        film: valueOrEmpty_(row[DB_COL.FILM - 1]),
        artikel: valueOrEmpty_(row[DB_COL.ARTIKEL - 1]),
        kodeItem: valueOrEmpty_(row[DB_COL.KODE_ITEM - 1]),
        keteranganArtikel: valueOrEmpty_(row[DB_COL.KETERANGAN_ARTIKEL - 1]),
        keteranganWarna: valueOrEmpty_(row[DB_COL.KETERANGAN_WARNA - 1]),
        keteranganBahan: valueOrEmpty_(row[DB_COL.KETERANGAN_BAHAN - 1]),
        modelKantong: valueOrEmpty_(row[DB_COL.MODEL_KANTONG - 1]),
        ukuranBlow: valueOrEmpty_(row[DB_COL.UKURAN_BLOW - 1]),
        ukuranJadi: valueOrEmpty_(row[DB_COL.UKURAN_JADI - 1]),
        ...getRoutingDetailsFromRow_(row),
        ...getExtraInputsFromRow_(row),
        ukuranKomponen: {
          lebar: valueOrEmpty_(row[DB_COL.LEBAR_JADI - 1]),
          panjang: valueOrEmpty_(row[DB_COL.PANJANG_JADI - 1]),
          tebal: valueOrEmpty_(row[DB_COL.TEBAL - 1]),
          lebarBahan: valueOrEmpty_(row[DB_COL.LEBAR_BAHAN - 1]),
          tebalBlow: numberOrEmptyForClient_(parsedDimensions.tebalBlow)
        },
        density: numberOrEmptyForClient_(row[DB_COL.DENSITY - 1]),
        pcsPerKg: numberOrEmptyForClient_(row[DB_COL.PCS_PER_KG - 1]),
        meterPerKg: numberOrEmptyForClient_(row[DB_COL.METER_PER_KG - 1]),
        proses: proses,
        keteranganProses: keteranganProses,
        finishing: valueOrEmpty_(row[DB_COL.FINISHING - 1]) || '-',
        handlePm: valueOrEmpty_(row[DB_COL.HANDLE_PON - 1]) || '-',
        bsPercent: bsPercent,
        totalBs: percentToInput_(row[DB_COL.TOTAL_BS - 1]),
        jumlahOrder: numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
        uomOrder: valueOrEmpty_(row[DB_COL.UOM_ORDER - 1]),
        keluarBahan: numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
        uomKB: valueOrEmpty_(row[DB_COL.UOM_KB - 1]),
        meterRoll: numberOrEmptyForClient_(
          getStoredMeterRoll_(sheet, rowNumber, row)
        ),
        toleransi: percentToInput_(row[DB_COL.TOLERANSI - 1]),
        etd: dateToInput_(row[DB_COL.ETD - 1]),
        komposisi: komposisi,
        totalKomposisiKg: numberOrEmptyForClient_(row[DB_COL.TOTAL_KOMPOSISI_KG - 1]),
        totalKomposisiPercent: percentToInput_(row[DB_COL.TOTAL_KOMPOSISI_PERCENT - 1]),
        warna: getWarnaFromRow_(row),
        spkReferensi: valueOrEmpty_(row[DB_COL.SPK_REFERENSI - 1]),
        release: releaseValue,
        approvalStatus: approvalSummary.status,
        approvalProgress: approvalSummary.progress,
        approvals: approvalSummary.approvals,
        signaturesLoaded: !Boolean(printSession) || shouldIncludeSignatures,
        canPrint: Boolean(printSession && (mayPrintReleasedLegacy || approvalSummary.complete)),
        canRelease: Boolean(printSession && printSession.roleKey === 'admin_ppic' && approvalSummary.complete)
      }
    };
  } catch (e) {
    return { status: 'error', found: false, message: e.message };
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
    if (key === '') return { status: 'error', message: 'Nomor SPK untuk dicetak kosong.' };

    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(sheet, key, preferredRowNumber);
    if (!rowNumber) {
      return { status: 'not_found', message: "Nomor SPK '" + key + "' tidak ditemukan di Database." };
    }

    const approvalSummary = getSpkApprovalSummary_(key, false);
    if (!approvalSummary.complete) {
      return {
        status: 'approval_required',
        message: 'SPK belum dapat diterbitkan. Persetujuan baru ' +
          approvalSummary.progress.approved + ' dari ' + approvalSummary.progress.required + ' lengkap.',
        approvalStatus: approvalSummary.status,
        progress: approvalSummary.progress
      };
    }

    sheet.getRange(rowNumber, DB_COL.RELEASE).setValue('YA');
    const dualWrite = syncDatabaseV2AfterLegacyWrite_(sheet, rowNumber, 'RELEASE_PRINT');
    clearDashboardCache_();

    return {
      status: 'success',
      release: 'YA',
      rowNumber: rowNumber,
      dualWrite: dualWrite,
      message: "SPK '" + key + "' ditandai Release = YA dan siap dicetak."
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// Indeks baris per SPK. Nomor baris hanya berubah saat Database disortir atau
// dirapikan, dan kedua operasi itu membersihkan cache ini. Setiap nilai yang
// dipakai tetap diverifikasi ulang lewat satu pembacaan sel, sehingga entri
// basi tidak pernah menghasilkan baris yang salah.
const SPK_ROW_CACHE_PREFIX = 'spk-row-v1-';
const SPK_ROW_CACHE_SECONDS = 21600;

function readCachedSpkRow_(key) {
  try {
    const cached = CacheService
      .getScriptCache()
      .get(SPK_ROW_CACHE_PREFIX + key);
    const rowNumber = Math.floor(Number(cached) || 0);
    return rowNumber >= DB_DATA_START_ROW ? rowNumber : 0;
  } catch (error) {
    return 0;
  }
}

function writeCachedSpkRow_(key, rowNumber) {
  try {
    CacheService
      .getScriptCache()
      .put(
        SPK_ROW_CACHE_PREFIX + key,
        String(rowNumber),
        SPK_ROW_CACHE_SECONDS
      );
  } catch (error) {
    // Cache hanya akselerator; kegagalan tidak boleh menggagalkan pencarian.
  }
}

function findSpkRowFast_(sheet, spk, preferredRowNumber) {
  const key = normalizeSpk_(spk);
  if (key === '') return 0;

  const maxRows = sheet.getMaxRows();
  const candidates = [
    Math.floor(Number(preferredRowNumber) || 0),
    readCachedSpkRow_(key)
  ];

  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (candidate < DB_DATA_START_ROW || candidate > maxRows) continue;

    const candidateSpk = sheet
      .getRange(candidate, DB_COL.SPK)
      .getDisplayValue();
    if (normalizeSpk_(candidateSpk) === key) {
      writeCachedSpkRow_(key, candidate);
      return candidate;
    }
  }

  // Jangan meminta TextFinder memindai seluruh kapasitas sheet. Banyak sheet
  // mempunyai puluhan ribu baris kosong hasil penambahan kapasitas; pemindaian
  // itu dapat menahan antrean Apps Script lama, terutama saat kunci tidak ada.
  const finalUsedRow = sheet.getLastRow();
  const searchRowCount = finalUsedRow - DB_DATA_START_ROW + 1;
  if (searchRowCount < 1) return 0;

  const match = sheet
    .getRange(DB_DATA_START_ROW, DB_COL.SPK, searchRowCount, 1)
    .createTextFinder(key)
    .matchEntireCell(true)
    .matchCase(false)
    .useRegularExpression(false)
    .findNext();

  if (!match) return 0;

  const foundRow = match.getRow();
  writeCachedSpkRow_(key, foundRow);
  return foundRow;
}

function getDatabaseLastSpkRowFast_(sheet) {
  const physicalLastRow = sheet.getLastRow();
  if (physicalLastRow < DB_DATA_START_ROW) return DB_DATA_START_ROW - 1;

  // getNextDataCell(UP) dapat melempar "Argumen tidak valid" pada sheet
  // Database yang besar. Baca kolom SPK per potongan dari bawah agar hasilnya
  // tetap tepat tanpa menarik seluruh kolom ke memori sekaligus.
  const chunkSize = 5000;
  for (let endRow = physicalLastRow; endRow >= DB_DATA_START_ROW; endRow -= chunkSize) {
    const startRow = Math.max(DB_DATA_START_ROW, endRow - chunkSize + 1);
    const values = sheet
      .getRange(startRow, DB_COL.SPK, endRow - startRow + 1, 1)
      .getDisplayValues();

    for (let index = values.length - 1; index >= 0; index--) {
      if (normalizeSpk_(values[index][0]) !== '') return startRow + index;
    }
  }

  return DB_DATA_START_ROW - 1;
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

var KELUAR_BAHAN_CACHE_META_KEY = 'keluar-bahan-v3-meta';
var KELUAR_BAHAN_CACHE_CHUNK_PREFIX = 'keluar-bahan-v3-part-';
// Umur panjang aman karena setiap mutasi memanggil clearKeluarBahanCache_().
var KELUAR_BAHAN_CACHE_SECONDS = 21600;
var KELUAR_BAHAN_CACHE_CHUNK_SIZE = 75000;
var KELUAR_BAHAN_CACHE_MAX_SIZE = 7000000;

function getEtaBeliBahanFromBlock_(row) {
  const source = Array.isArray(row) ? row : [];
  return ETA_BELI_COLUMNS.map(function(columns, index) {
    return {
      index: index + 1,
      eta: dateToInput_(
        source[columns.eta - DB_COL.ETA_BELI_START]
      ),
      qty: columns.qty
        ? numberOrEmptyForClient_(
            source[columns.qty - DB_COL.ETA_BELI_START]
          )
        : '',
      uom: columns.uom
        ? enumForClient_(
            source[columns.uom - DB_COL.ETA_BELI_START],
            ['KG', 'ROLL'],
            ''
          )
        : '',
      hasQuantity: Boolean(columns.qty && columns.uom)
    };
  });
}

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
function getKeluarBahanManagerData(forceRefresh) {
  try {
    const startedAt = Date.now();
    if (!forceRefresh) {
      const cached = readKeluarBahanCache_();
      if (cached) {
        cached.performance = {
          source: 'cache',
          durationMs: Date.now() - startedAt,
          rowCount: Array.isArray(cached.data) ? cached.data.length : 0
        };
        return cached;
      }
    }

    const sheet = getDbSheetReadOnly_();
    const lastDataRow = getDatabaseLastSpkRowFast_(sheet);
    if (lastDataRow < DB_DATA_START_ROW) {
      const emptyResponse = {
        status: 'success',
        data: [],
        summary: { total: 0, pending: 0, complete: 0 },
        performance: {
          source: 'sheet',
          durationMs: Date.now() - startedAt,
          rowCount: 0
        }
      };
      writeKeluarBahanCache_(emptyResponse);
      return emptyResponse;
    }

    const rowCount = lastDataRow - DB_DATA_START_ROW + 1;

    // Daftar memakai pembacaan massal terarah (47 kolom), bukan A:CV
    // yang berjumlah 100 kolom. A:L, AB:AM, AR:AW, dan BV juga cukup
    // untuk menyiapkan detail halaman pertama tanpa RPC Sheet tambahan.
    const mainRows = sheet
      .getRange(DB_DATA_START_ROW, DB_COL.SPK, rowCount, DB_COL.UKURAN_JADI)
      .getValues();
    const bsRows = sheet
      .getRange(
        DB_DATA_START_ROW,
        DB_COL.BS_START,
        rowCount,
        DB_COL.BS_END - DB_COL.BS_START + 1
      )
      .getValues();
    const orderRows = sheet
      .getRange(
        DB_DATA_START_ROW,
        DB_COL.JUMLAH_ORDER,
        rowCount,
        DB_COL.ETD - DB_COL.JUMLAH_ORDER + 1
      )
      .getValues();
    const referenceRows = sheet
      .getRange(DB_DATA_START_ROW, DB_COL.SPK_REFERENSI, rowCount, 1)
      .getValues();
    const etaRows = sheet
      .getRange(
        DB_DATA_START_ROW,
        DB_COL.ETA_BELI_START,
        rowCount,
        DB_COL.ETA_BELI_KETERANGAN - DB_COL.ETA_BELI_START + 1
      )
      .getValues();
    const data = [];
    const detailBlocksByRow = {};
    let pending = 0;
    let complete = 0;

    mainRows.forEach(function(mainRow, index) {
      const rowNumber = DB_DATA_START_ROW + index;
      const bsRow = bsRows[index];
      const orderRow = orderRows[index];
      const etaRow = etaRows[index];
      const spk = normalizeSpk_(mainRow[DB_COL.SPK - 1]);
      if (spk === '') return;

      const keluarBahan = numberOrEmptyForClient_(
        orderRow[DB_COL.KELUAR_BAHAN - DB_COL.JUMLAH_ORDER]
      );
      const uomKB = enumForClient_(
        orderRow[DB_COL.UOM_KB - DB_COL.JUMLAH_ORDER],
        ['KG', 'ROLL'],
        ''
      );
      const isComplete = keluarBahan !== '' && Number(keluarBahan) > 0 && uomKB !== '';
      if (isComplete) {
        complete++;
      } else {
        pending++;
      }

      data.push({
        rowNumber: rowNumber,
        spk: spk,
        tanggal: dateToInput_(mainRow[DB_COL.TANGGAL - 1]),
        customer: valueOrEmpty_(mainRow[DB_COL.CUSTOMER - 1]),
        artikel: valueOrEmpty_(mainRow[DB_COL.ARTIKEL - 1]),
        material: valueOrEmpty_(mainRow[DB_COL.MATERIAL - 1]),
        jumlahOrder: numberOrEmptyForClient_(
          orderRow[DB_COL.JUMLAH_ORDER - DB_COL.JUMLAH_ORDER]
        ),
        uomOrder: valueOrEmpty_(
          orderRow[DB_COL.UOM_ORDER - DB_COL.JUMLAH_ORDER]
        ),
        keluarBahan: keluarBahan,
        uomKB: uomKB,
        etaBeliBahan: getEtaBeliBahanFromBlock_(etaRow),
        etaBeliKeterangan: valueOrEmpty_(
          etaRow[DB_COL.ETA_BELI_KETERANGAN - DB_COL.ETA_BELI_START]
        ),
        complete: isComplete
      });
      detailBlocksByRow[rowNumber] = {
        main: mainRow,
        bs: bsRow,
        order: orderRow,
        reference: referenceRows[index][0]
      };
    });

    data.sort(function(a, b) {
      if (a.complete !== b.complete) return a.complete ? 1 : -1;
      return buildSpkSortKey_(a.spk, 0).localeCompare(
        buildSpkSortKey_(b.spk, 0)
      );
    });

    // Detail lengkap hanya dibundel untuk halaman pertama tiap status.
    // Ini membuat klik utama instan tanpa memperbesar seluruh payload
    // ribuan SPK atau menjalankan prefetch massal setelah halaman terbuka.
    const detailTargets = data
      .filter(function(item) { return !item.complete; })
      .slice(0, 50)
      .concat(
        data
          .filter(function(item) { return item.complete; })
          .slice(0, 50)
      );
    detailTargets.forEach(function(item) {
      const blocks = detailBlocksByRow[item.rowNumber];
      if (!blocks) return;

      const detailRow = new Array(DB_COL.SPK_REFERENSI).fill('');
      blocks.main.forEach(function(value, index) {
        detailRow[index] = value;
      });
      blocks.bs.forEach(function(value, index) {
        detailRow[DB_COL.BS_START - 1 + index] = value;
      });
      blocks.order.forEach(function(value, index) {
        detailRow[DB_COL.JUMLAH_ORDER - 1 + index] = value;
      });
      detailRow[DB_COL.SPK_REFERENSI - 1] = blocks.reference;
      item.detail = buildKeluarBahanManagerDetail_(
        sheet,
        item.rowNumber,
        detailRow
      );
    });

    const response = {
      status: 'success',
      data: data,
      summary: {
        total: data.length,
        pending: pending,
        complete: complete
      },
      performance: {
        source: 'sheet',
        durationMs: Date.now() - startedAt,
        rowCount: data.length
      }
    };
    writeKeluarBahanCache_(response);
    return response;
  } catch (e) {
    return {
      status: 'error',
      data: [],
      summary: { total: 0, pending: 0, complete: 0 },
      message: e.message
    };
  }
}

function readKeluarBahanDetailRow_(
  sheet,
  spk,
  preferredRowNumber,
  knownMaxRows
) {
  const key = normalizeSpk_(spk);
  const preferredRow = Math.floor(Number(preferredRowNumber) || 0);
  const maxRows = Number(knownMaxRows) || sheet.getMaxRows();

  // Saat rowNumber berasal dari daftar manager, baca seluruh detail sekali
  // sekaligus dan verifikasi SPK dari hasil yang sama. Ini menghilangkan
  // pembacaan sel SPK terpisah sebelum pembacaan A:BV.
  if (
    preferredRow >= DB_DATA_START_ROW &&
    preferredRow <= maxRows
  ) {
    const preferredValues = sheet
      .getRange(preferredRow, 1, 1, DB_COL.SPK_REFERENSI)
      .getValues()[0];
    if (normalizeSpk_(preferredValues[DB_COL.SPK - 1]) === key) {
      return {
        rowNumber: preferredRow,
        values: preferredValues
      };
    }
  }

  const rowNumber = findSpkRowFast_(sheet, key, 0);
  if (!rowNumber) return null;

  return {
    rowNumber: rowNumber,
    values: sheet
      .getRange(rowNumber, 1, 1, DB_COL.SPK_REFERENSI)
      .getValues()[0]
  };
}

function buildKeluarBahanManagerDetail_(sheet, rowNumber, row) {
  const bsPercent = {};
  const bsItems = BS_KEYS.map(function(keyName, index) {
    const percent = percentToInput_(row[DB_COL.BS_START - 1 + index]);
    bsPercent[keyName] = percent;
    return {
      key: keyName,
      label: BS_LABELS[keyName] || keyName,
      percent: percent === '' ? 0 : percent
    };
  });

  const detailUomOrder = valueOrEmpty_(
    row[DB_COL.UOM_ORDER - 1]
  ).trim().toUpperCase();
  const calculationPayload = {
    jumlahOrder: numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
    uomOrder: detailUomOrder,
    material: valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
    customer: valueOrEmpty_(row[DB_COL.CUSTOMER - 1]),
    ukuranBlow: valueOrEmpty_(row[DB_COL.UKURAN_BLOW - 1]),
    ukuranJadi: valueOrEmpty_(row[DB_COL.UKURAN_JADI - 1]),
    film: valueOrEmpty_(row[DB_COL.FILM - 1]),
    meterRoll: detailUomOrder === 'ROLL'
      ? numberOrEmptyForClient_(
          getStoredMeterRoll_(sheet, rowNumber, row)
        )
      : '',
    bsPercent: bsPercent
  };
  const calculation = calculateRawMaterialPayload_(calculationPayload);
  const parsedDimensions = parseCalculationDimensions_(
    calculationPayload.ukuranBlow,
    calculationPayload.ukuranJadi
  );

  return {
    rowNumber: rowNumber,
    spk: normalizeSpk_(row[DB_COL.SPK - 1]),
    tanggal: dateToInput_(row[DB_COL.TANGGAL - 1]),
    jenisOrder: valueOrEmpty_(row[DB_COL.JENIS_ORDER - 1]),
    marketing: valueOrEmpty_(row[DB_COL.MARKETING - 1]),
    nomorPO: valueOrEmpty_(row[DB_COL.NOMOR_PO - 1]),
    customer: calculationPayload.customer,
    artikel: valueOrEmpty_(row[DB_COL.ARTIKEL - 1]),
    material: calculationPayload.material,
    film: calculationPayload.film,
    modelKantong: valueOrEmpty_(row[DB_COL.MODEL_KANTONG - 1]),
    ukuranBlow: calculationPayload.ukuranBlow,
    ukuranJadi: calculationPayload.ukuranJadi,
    jumlahOrder: calculationPayload.jumlahOrder,
    uomOrder: calculationPayload.uomOrder,
    keluarBahan: numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
    uomKB: enumForClient_(row[DB_COL.UOM_KB - 1], ['KG', 'ROLL'], ''),
    meterRoll: calculationPayload.meterRoll,
    etd: dateToInput_(row[DB_COL.ETD - 1]),
    spkReferensi: valueOrEmpty_(row[DB_COL.SPK_REFERENSI - 1]),
    bs: {
      items: bsItems,
      total: getCalculationBsTotal_(bsPercent),
      totalTersimpan: percentToInput_(row[DB_COL.TOTAL_BS - 1])
    },
    dimensions: {
      lebarJadi: numberOrEmptyForClient_(parsedDimensions.lebar),
      panjangJadi: numberOrEmptyForClient_(parsedDimensions.panjang),
      tebalJadi: numberOrEmptyForClient_(parsedDimensions.tebal),
      lebarBahan: numberOrEmptyForClient_(parsedDimensions.lebarBahan),
      tebalBlow: numberOrEmptyForClient_(parsedDimensions.tebalBlow),
      lebarJadiTersimpan: numberOrEmptyForClient_(row[DB_COL.LEBAR_JADI - 1]),
      panjangJadiTersimpan: numberOrEmptyForClient_(row[DB_COL.PANJANG_JADI - 1]),
      tebalTersimpan: numberOrEmptyForClient_(row[DB_COL.TEBAL - 1]),
      lebarBahanTersimpan: numberOrEmptyForClient_(row[DB_COL.LEBAR_BAHAN - 1]),
      densityTersimpan: numberOrEmptyForClient_(row[DB_COL.DENSITY - 1]),
      pcsPerKgTersimpan: numberOrEmptyForClient_(row[DB_COL.PCS_PER_KG - 1]),
      meterPerKgTersimpan: numberOrEmptyForClient_(row[DB_COL.METER_PER_KG - 1])
    },
    calculation: calculation
  };
}

function getKeluarBahanManagerDetail(spk, preferredRowNumber) {
  try {
    const startedAt = Date.now();
    const key = normalizeSpk_(spk);
    if (key === '') {
      return {
        status: 'not_found',
        found: false,
        message: 'Nomor SPK untuk dilihat tidak valid.'
      };
    }

    const sheet = getDbSheetReadOnly_();
    const detailRow = readKeluarBahanDetailRow_(
      sheet,
      key,
      preferredRowNumber
    );
    if (!detailRow) {
      return {
        status: 'not_found',
        found: false,
        message: "Nomor SPK '" + key + "' tidak ditemukan di Database."
      };
    }

    return {
      status: 'success',
      found: true,
      data: buildKeluarBahanManagerDetail_(
        sheet,
        detailRow.rowNumber,
        detailRow.values
      ),
      performance: {
        durationMs: Date.now() - startedAt
      }
    };
  } catch (e) {
    return {
      status: 'error',
      found: false,
      message: e.message
    };
  }
}

function getKeluarBahanManagerDetailBatch(requests) {
  try {
    const startedAt = Date.now();
    const source = Array.isArray(requests) ? requests : [];
    const uniqueRequests = [];
    const seenSpk = {};

    source.slice(0, 10).forEach(function(request) {
      const key = normalizeSpk_(request && request.spk);
      if (key === '' || seenSpk[key]) return;
      seenSpk[key] = true;
      uniqueRequests.push({
        spk: key,
        rowNumber: Number(request && request.rowNumber) || 0
      });
    });

    if (!uniqueRequests.length) {
      return {
        status: 'success',
        data: {},
        missing: [],
        performance: { durationMs: Date.now() - startedAt, rowCount: 0 }
      };
    }

    const sheet = getDbSheetReadOnly_();
    const maxRows = sheet.getMaxRows();
    const details = {};
    const missing = [];
    uniqueRequests.forEach(function(request) {
      const detailRow = readKeluarBahanDetailRow_(
        sheet,
        request.spk,
        request.rowNumber,
        maxRows
      );
      if (!detailRow) {
        missing.push(request.spk);
        return;
      }
      details[request.spk] = buildKeluarBahanManagerDetail_(
        sheet,
        detailRow.rowNumber,
        detailRow.values
      );
    });

    return {
      status: 'success',
      data: details,
      missing: missing,
      performance: {
        durationMs: Date.now() - startedAt,
        rowCount: Object.keys(details).length
      }
    };
  } catch (e) {
    return {
      status: 'error',
      data: {},
      missing: [],
      message: e.message
    };
  }
}

function saveEtaBeliBahanScheduleByManager(payload) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);

  if (!gotLock) {
    return {
      status: 'error',
      message: 'Sistem sedang sibuk. Coba simpan jadwal ETA kembali beberapa saat lagi.'
    };
  }

  try {
    const spk = normalizeSpk_(payload && payload.spk);
    const sourceEntries = Array.isArray(payload && payload.entries)
      ? payload.entries
      : [];
    const keterangan = String(payload && payload.keterangan || '').trim();

    if (spk === '') {
      return { status: 'error', message: 'Nomor SPK tidak valid.' };
    }
    if (sourceEntries.length !== ETA_BELI_COLUMNS.length) {
      return {
        status: 'error',
        message: 'Jadwal ETA harus memuat ETA 1 sampai ETA 5.'
      };
    }
    if (keterangan.length > 1000) {
      return {
        status: 'error',
        message: 'Keterangan ETA maksimal 1.000 karakter.'
      };
    }

    const entries = [];
    const rowValues = [];
    let previousDate = '';
    let foundGap = false;
    let filledCount = 0;

    ETA_BELI_COLUMNS.forEach(function(columns, index) {
      const source = sourceEntries[index] || {};
      const etaText = String(source.eta || '').trim();
      const qtyText = String(
        source.qty !== null && source.qty !== undefined ? source.qty : ''
      ).trim();
      const uomText = String(source.uom || '').trim().toUpperCase();
      const hasQuantity = Boolean(columns.qty && columns.uom);

      if (etaText !== '' && !isValidDateInput_(etaText)) {
        throw new Error('Tanggal ETA ' + (index + 1) + ' tidak valid.');
      }
      if (etaText === '') {
        if (hasQuantity && (qtyText !== '' || uomText !== '')) {
          throw new Error(
            'Tanggal ETA ' + (index + 1) + ' wajib diisi sebelum QTY dan UOM.'
          );
        }
        foundGap = true;
        rowValues.push('');
        if (hasQuantity) rowValues.push('', '');
        entries.push({
          index: index + 1,
          eta: '',
          qty: '',
          uom: '',
          hasQuantity: hasQuantity
        });
        return;
      }

      if (foundGap) {
        throw new Error(
          'ETA ' + (index + 1) + ' tidak boleh diisi sebelum ETA sebelumnya lengkap.'
        );
      }
      if (previousDate !== '' && etaText < previousDate) {
        throw new Error(
          'Tanggal ETA ' + (index + 1) + ' tidak boleh lebih awal dari ETA sebelumnya.'
        );
      }

      let qty = '';
      let uom = '';
      if (hasQuantity) {
        qty = parseCalculationNumber_(qtyText);
        if (!(qty > 0)) {
          throw new Error(
            'QTY ETA ' + (index + 1) + ' wajib berupa angka lebih dari 0.'
          );
        }
        if (['KG', 'ROLL'].indexOf(uomText) === -1) {
          throw new Error('UOM ETA ' + (index + 1) + ' harus KG atau ROLL.');
        }
        uom = uomText;
      }

      previousDate = etaText;
      filledCount++;
      rowValues.push(parseTanggal_(etaText));
      if (hasQuantity) rowValues.push(qty, uom);
      entries.push({
        index: index + 1,
        eta: etaText,
        qty: qty,
        uom: uom,
        hasQuantity: hasQuantity
      });
    });

    rowValues.push(keterangan);
    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(
      sheet,
      spk,
      payload && payload.rowNumber
    );
    if (!rowNumber) {
      return {
        status: 'not_found',
        message: "SPK '" + spk + "' tidak ditemukan di Database."
      };
    }

    sheet
      .getRange(
        rowNumber,
        DB_COL.ETA_BELI_START,
        1,
        DB_COL.ETA_BELI_KETERANGAN - DB_COL.ETA_BELI_START + 1
      )
      .setValues([rowValues]);
    ETA_BELI_COLUMNS.forEach(function(columns) {
      sheet.getRange(rowNumber, columns.eta).setNumberFormat('dd/MM/yyyy');
      if (columns.qty) {
        sheet.getRange(rowNumber, columns.qty).setNumberFormat('0.##');
      }
    });
    SpreadsheetApp.flush();
    const dualWrite = syncDatabaseV2AfterLegacyWrite_(sheet, rowNumber, 'ETA_SCHEDULE');
    clearKeluarBahanCache_();

    return {
      status: 'success',
      message: filledCount > 0
        ? "Jadwal ETA beli bahan SPK '" + spk + "' berhasil disimpan."
        : "Jadwal ETA beli bahan SPK '" + spk + "' berhasil dikosongkan.",
      data: {
        rowNumber: rowNumber,
        spk: spk,
        entries: entries,
        keterangan: keterangan,
        filledCount: filledCount,
        dualWrite: dualWrite
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function updateEtaBeliBahanByManager(payload) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);

  if (!gotLock) {
    return {
      status: 'error',
      message: 'Sistem sedang sibuk. Coba simpan ETA kembali beberapa saat lagi.'
    };
  }

  try {
    const spk = normalizeSpk_(payload && payload.spk);
    const etaIndex = Number(payload && payload.etaIndex);
    const etaText = String(payload && payload.eta || '').trim();
    const qtyText = String(
      payload && payload.qty !== null && payload.qty !== undefined
        ? payload.qty
        : ''
    ).trim();
    const uom = String(payload && payload.uom || '').trim().toUpperCase();
    const columns = ETA_BELI_COLUMNS[etaIndex - 1];

    if (spk === '') {
      return { status: 'error', message: 'Nomor SPK tidak valid.' };
    }
    if (!columns) {
      return { status: 'error', message: 'Urutan ETA harus antara ETA 1 sampai ETA 5.' };
    }
    if (etaText !== '' && !isValidDateInput_(etaText)) {
      return { status: 'error', message: 'Tanggal ETA tidak valid.' };
    }

    let qty = '';
    let normalizedUom = '';
    if (columns.qty && columns.uom) {
      const hasAnyValue = etaText !== '' || qtyText !== '' || uom !== '';
      if (hasAnyValue) {
        qty = parseCalculationNumber_(qtyText);
        if (etaText === '') {
          return { status: 'error', message: 'Tanggal ETA ' + etaIndex + ' wajib diisi.' };
        }
        if (!(qty > 0)) {
          return {
            status: 'error',
            message: 'QTY ETA ' + etaIndex + ' wajib berupa angka lebih dari 0.'
          };
        }
        if (['KG', 'ROLL'].indexOf(uom) === -1) {
          return {
            status: 'error',
            message: 'UOM ETA ' + etaIndex + ' harus KG atau ROLL.'
          };
        }
        normalizedUom = uom;
      }
    }

    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(
      sheet,
      spk,
      payload && payload.rowNumber
    );
    if (!rowNumber) {
      return {
        status: 'not_found',
        message: "SPK '" + spk + "' tidak ditemukan di Database."
      };
    }

    const values = [etaText === '' ? '' : parseTanggal_(etaText)];
    if (columns.qty && columns.uom) {
      values.push(qty, normalizedUom);
    }

    sheet
      .getRange(rowNumber, columns.eta, 1, values.length)
      .setValues([values]);
    sheet
      .getRange(rowNumber, columns.eta)
      .setNumberFormat('dd/MM/yyyy');
    if (columns.qty) {
      sheet
        .getRange(rowNumber, columns.qty)
        .setNumberFormat('0.##');
    }
    SpreadsheetApp.flush();
    const dualWrite = syncDatabaseV2AfterLegacyWrite_(sheet, rowNumber, 'ETA_SINGLE');
    clearKeluarBahanCache_();

    const entry = {
      index: etaIndex,
      eta: etaText,
      qty: columns.qty ? qty : '',
      uom: columns.uom ? normalizedUom : '',
      hasQuantity: Boolean(columns.qty && columns.uom)
    };
    const cleared = etaText === '' && qty === '' && normalizedUom === '';

    return {
      status: 'success',
      message: cleared
        ? "ETA " + etaIndex + " SPK '" + spk + "' berhasil dikosongkan."
        : "ETA " + etaIndex + " SPK '" + spk + "' berhasil disimpan.",
      data: {
        rowNumber: rowNumber,
        spk: spk,
        etaIndex: etaIndex,
        entry: entry,
        dualWrite: dualWrite
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function updateKeluarBahanByManager(payload) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);

  if (!gotLock) {
    return {
      status: 'error',
      message: 'Sistem sedang sibuk. Coba simpan kembali beberapa saat lagi.'
    };
  }

  try {
    const spk = normalizeSpk_(payload && payload.spk);
    const keluarBahan = parseCalculationNumber_(payload && payload.keluarBahan);
    const uomKB = String(payload && payload.uomKB || '').trim().toUpperCase();

    if (spk === '') {
      return { status: 'error', message: 'Nomor SPK tidak valid.' };
    }
    if (!(keluarBahan > 0)) {
      return {
        status: 'error',
        message: 'Keluar Bahan wajib berupa angka lebih dari 0.'
      };
    }
    if (['KG', 'ROLL'].indexOf(uomKB) === -1) {
      return {
        status: 'error',
        message: 'UOM Keluar Bahan harus KG atau ROLL.'
      };
    }

    const sheet = getDbSheetReadOnly_();
    const rowNumber = findSpkRowFast_(
      sheet,
      spk,
      payload && payload.rowNumber
    );
    if (!rowNumber) {
      return {
        status: 'not_found',
        message: "SPK '" + spk + "' tidak ditemukan di Database."
      };
    }

    sheet
      .getRange(rowNumber, DB_COL.KELUAR_BAHAN, 1, 2)
      .setValues([[keluarBahan, uomKB]]);
    sheet
      .getRange(rowNumber, DB_COL.KELUAR_BAHAN)
      .setNumberFormat('0.############');
    SpreadsheetApp.flush();
    const dualWrite = syncDatabaseV2AfterLegacyWrite_(sheet, rowNumber, 'KELUAR_BAHAN');
    clearDashboardCache_();
    clearKeluarBahanCache_();

    return {
      status: 'success',
      message: "Keluar Bahan SPK '" + spk + "' berhasil diperbarui.",
      data: {
        rowNumber: rowNumber,
        spk: spk,
        keluarBahan: keluarBahan,
        uomKB: uomKB,
        complete: true,
        dualWrite: dualWrite
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Memperbarui data utama SPK dari halaman PPIC.
 * Nomor SPK, status Release, proses produksi, BS, komposisi, dan ETA pembelian
 * sengaja tidak diubah agar relasi dan progres operasional tetap aman.
 */
function updateSpkFromDashboard(payload) {
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);

  if (!gotLock) {
    return {
      status: 'error',
      message: 'Sistem sedang sibuk. Coba simpan kembali beberapa saat lagi.'
    };
  }

  try {
    const input = payload || {};
    const spkKey = normalizeSpk_(input.spk);
    if (spkKey === '') {
      return { status: 'error', message: 'Nomor SPK tidak valid.' };
    }

    const sheet = getDbSheetReadOnly_();
    ensureKeteranganWarnaColumn_(sheet);
    ensureKeteranganBahanColumn_(sheet);
    ensureMeterRollColumn_(sheet);
    const rowNumber = findSpkRowFast_(
      sheet,
      spkKey,
      input.rowNumber
    );
    if (!rowNumber) {
      return {
        status: 'not_found',
        message: "SPK '" + spkKey + "' tidak ditemukan di Database."
      };
    }

    const currentRow = sheet
      .getRange(rowNumber, 1, 1, DB_COL.RELEASE)
      .getValues()[0];
    const currentBsPercent = {};
    BS_KEYS.forEach(function(keyName, index) {
      currentBsPercent[keyName] = percentToInput_(
        currentRow[DB_COL.BS_START - 1 + index]
      );
    });

    const jenisOrder = normalizeOrderType_(input.jenisOrder);
    const spkReferensi = jenisOrder === 'Repeat Order'
      ? normalizeSpk_(input.spkReferensi)
      : '';
    const editPayload = {
      spk: spkKey,
      tanggal: input.tanggal,
      jenisOrder: jenisOrder,
      marketing: String(input.marketing || '').trim(),
      nomorPO: String(input.nomorPO || '').trim(),
      customer: String(input.customer || '').trim(),
      material: String(input.material || '').trim(),
      film: String(input.film || '').trim(),
      artikel: String(input.artikel || '').trim(),
      kodeItem: normalizeKodeItem_(input.kodeItem),
      keteranganArtikel: normalizeProcessNote_(input.keteranganArtikel),
      keteranganWarna: normalizeKeteranganWarna_(input.keteranganWarna),
      keteranganBahan: normalizeKeteranganBahan_(input.keteranganBahan),
      modelKantong: String(input.modelKantong || '').trim(),
      ukuranBlow: String(input.ukuranBlow || '').trim(),
      ukuranJadi: String(input.ukuranJadi || '').trim(),
      jumlahOrder: input.jumlahOrder,
      uomOrder: String(input.uomOrder || '').trim().toUpperCase(),
      keluarBahan: input.keluarBahan,
      uomKB: String(input.uomKB || '').trim().toUpperCase(),
      meterRoll: input.meterRoll,
      toleransi: input.toleransi,
      etd: input.etd,
      spkReferensi: spkReferensi,
      bsPercent: currentBsPercent
    };

    const validationMessage = validatePayload_(editPayload);
    if (validationMessage) {
      return { status: 'error', message: validationMessage };
    }

    if (
      jenisOrder === 'Repeat Order' &&
      !findSpkRowFast_(sheet, spkReferensi, 0)
    ) {
      return {
        status: 'error',
        message: "SPK referensi '" + spkReferensi + "' tidak ditemukan di Database."
      };
    }

    const jumlahOrder = parseCalculationNumber_(editPayload.jumlahOrder);
    const uomOrder = String(editPayload.uomOrder || '').trim().toUpperCase();
    const meterRoll = uomOrder === 'ROLL'
      ? parseCalculationNumber_(editPayload.meterRoll)
      : null;

    // A:L — data utama. Nomor SPK tetap memakai nilai yang sudah tersimpan.
    sheet.getRange(rowNumber, DB_COL.SPK, 1, 12).setValues([[
      spkKey,
      parseTanggal_(editPayload.tanggal),
      jenisOrder,
      editPayload.marketing,
      editPayload.nomorPO,
      editPayload.customer,
      editPayload.material,
      editPayload.film,
      editPayload.artikel,
      editPayload.modelKantong,
      editPayload.ukuranBlow,
      editPayload.ukuranJadi
    ]]);

    const keluarBahan = parseCalculationNumber_(editPayload.keluarBahan);
    const uomKeluarBahan = keluarBahan === null ? '' : editPayload.uomKB;

    // AR:AW — jumlah order, kebutuhan bahan, toleransi, dan jadwal kirim.
    sheet.getRange(rowNumber, DB_COL.JUMLAH_ORDER, 1, 6).setValues([[
      jumlahOrder,
      uomOrder,
      keluarBahan === null ? '' : keluarBahan,
      uomKeluarBahan,
      toToleranceStorageValue_(editPayload.toleransi),
      parseTanggal_(editPayload.etd)
    ]]);

    ensureReferenceColumnHeader_(sheet);
    sheet.getRange(rowNumber, DB_COL.SPK_REFERENSI).setValue(spkReferensi);
    sheet.getRange(rowNumber, DB_COL.KETERANGAN_ARTIKEL).setValue(editPayload.keteranganArtikel);
    setKodeItemValue_(sheet, rowNumber, editPayload.kodeItem);
    setKeteranganWarnaValue_(sheet, rowNumber, editPayload.keteranganWarna);
    setKeteranganBahanValue_(sheet, rowNumber, editPayload.keteranganBahan);
    setStoredMeterRoll_(sheet, rowNumber, meterRoll);
    setConversionFormulas_(sheet, rowNumber, 1);
    terapkanFormatBaris_(sheet, rowNumber);
    SpreadsheetApp.flush();
    const dualWrite = syncDatabaseV2AfterLegacyWrite_(sheet, rowNumber, 'DASHBOARD_EDIT');
    clearDashboardCache_();
    clearKeluarBahanCache_();

    return {
      status: 'success',
      message: "Data SPK '" + spkKey + "' berhasil diperbarui.",
      data: {
        spk: spkKey,
        release: String(currentRow[DB_COL.RELEASE - 1] || '').trim() || 'Tidak',
        dualWrite: dualWrite
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function submitDatabase(payload) {
  const startedAt = Date.now();
  var creatorSession;
  try {
    creatorSession = requireCreatorApprovalSession_(payload && payload.authToken);
  } catch (authError) {
    return { status: 'auth_required', message: authError.message };
  }
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(30000);

  if (!gotLock) {
    return {
      status: 'error',
      message: 'Sistem sedang sibuk (ada input lain yang sedang berjalan). Coba lagi beberapa saat.'
    };
  }

  try {
    const validasi = validatePayload_(payload);
    if (validasi) return { status: 'error', message: validasi };

    const jumlahOrder = parseCalculationNumber_(payload.jumlahOrder);
    const uomOrder = String(payload.uomOrder || '').trim().toUpperCase();
    const submittedMeterRoll = parseCalculationNumber_(payload.meterRoll);
    const meterRoll = uomOrder === 'ROLL'
      ? submittedMeterRoll
      : null;

    const sheet = getDbSheetReadOnly_();
    ensureKeteranganWarnaColumn_(sheet);
    ensureKeteranganBahanColumn_(sheet);
    ensureRoutingDetailColumns_(sheet);
    ensureMeterRollColumn_(sheet);
    const spkKey = normalizeSpk_(payload.spk);
    const jenisOrder = normalizeOrderType_(payload.jenisOrder);
    const spkReferensi = jenisOrder === 'Repeat Order' ? normalizeSpk_(payload.spkReferensi) : '';
    const saveContext = getDatabaseSaveContext_(sheet);

    // Satu indeks SPK dipakai untuk cek duplikat, validasi referensi,
    // dan menentukan baris tujuan tanpa pemindaian kolom A berulang.
    if (saveContext.rowBySpk[spkKey]) {
      return {
        status: 'duplicate',
        message: "Nomor SPK '" + payload.spk + "' sudah ada di Database. Data tidak disimpan."
      };
    }

    // Repeat Order wajib mempunyai sumber yang masih valid saat transaksi disimpan.
    if (jenisOrder === 'Repeat Order') {
      if (spkReferensi === spkKey) {
        return { status: 'error', message: 'SPK repeat baru tidak boleh sama dengan SPK item sebelumnya.' };
      }
      if (!saveContext.rowBySpk[spkReferensi]) {
        return {
          status: 'error',
          message: "SPK referensi '" + spkReferensi + "' tidak ditemukan. Muat ulang data repeat order."
        };
      }
    }

    const targetRow = saveContext.targetRow;
    const maxRows = sheet.getMaxRows();
    if (targetRow > maxRows) {
      sheet.insertRowsAfter(maxRows, targetRow - maxRows);
    }

    // --- A:L (Data Utama) ---
    sheet.getRange(targetRow, DB_COL.SPK, 1, 12).setValues([[
      spkKey,
      parseTanggal_(payload.tanggal),
      jenisOrder,
      payload.marketing || '',
      payload.nomorPO || '',
      payload.customer || '',
      payload.material || '',
      payload.film || '',
      payload.artikel || '',
      payload.modelKantong || '',
      payload.ukuranBlow || '',
      payload.ukuranJadi || ''
    ]]);

    // --- T:AN (Proses, Finishing, Handle/Pon, %BS, Total BS) ---
    const prosesValues = PROSES_KEYS.map(key =>
      payload.proses && payload.proses[key] ? PROSES_LABELS[key] : '-'
    );
    const finishing = FINISHING_OPTIONS.indexOf(payload.finishing) > -1 ? payload.finishing : '-';
    const handlePm = HANDLE_PON_OPTIONS.indexOf(payload.handlePm) > -1 ? payload.handlePm : '-';
    const bsValues = BS_KEYS.map(key =>
      toDecimalPercent_(payload.bsPercent ? payload.bsPercent[key] : 0)
    );
    const totalBs = bsValues.reduce((sum, value) => sum + (Number(value) || 0), 0);

    sheet.getRange(targetRow, DB_COL.PROSES_MIXER, 1, 21).setValues([[
      ...prosesValues,
      finishing,
      handlePm,
      ...bsValues,
      totalBs
    ]]);

    const keluarBahan = parseCalculationNumber_(payload.keluarBahan);
    const uomKeluarBahan = keluarBahan === null
      ? ''
      : String(payload.uomKB || '').trim().toUpperCase();

    // AR:CF ditulis sebagai satu blok: order, komposisi, referensi,
    // release, dan seluruh keterangan proses.
    const komposisiColumns = buildKomposisiColumns_(payload.komposisi || [], keluarBahan);
    const warnaColumns = buildWarnaColumns_(payload.warna || []);
    const processNotePayload = payload.keteranganProses || {};
    const processNoteValues = PROCESS_NOTE_KEYS.map(function(key) {
      return normalizeProcessNote_(processNotePayload[key]);
    });
    const deliveryToNotes = new Array(
      DB_COL.KET_TSHIRT - DB_COL.JUMLAH_ORDER + 1
    ).fill('');
    const setDeliveryValue = function(column, value) {
      deliveryToNotes[column - DB_COL.JUMLAH_ORDER] = value;
    };

    setDeliveryValue(DB_COL.JUMLAH_ORDER, jumlahOrder);
    setDeliveryValue(DB_COL.UOM_ORDER, uomOrder);
    setDeliveryValue(
      DB_COL.KELUAR_BAHAN,
      keluarBahan === null ? '' : keluarBahan
    );
    setDeliveryValue(DB_COL.UOM_KB, uomKeluarBahan);
    setDeliveryValue(
      DB_COL.TOLERANSI,
      toToleranceStorageValue_(payload.toleransi)
    );
    setDeliveryValue(DB_COL.ETD, parseTanggal_(payload.etd));
    komposisiColumns.forEach(function(value, index) {
      setDeliveryValue(DB_COL.KOMPOSISI_START + index, value);
    });
    warnaColumns.forEach(function(value, index) {
      setDeliveryValue(DB_COL.WARNA_START + index, value);
    });
    setDeliveryValue(DB_COL.SPK_REFERENSI, spkReferensi);
    setDeliveryValue(DB_COL.RELEASE, 'Tidak');
    setDeliveryValue(DB_COL.KETERANGAN_ARTIKEL, normalizeProcessNote_(payload.keteranganArtikel));
    const kodeItem = normalizeKodeItem_(payload.kodeItem);
    processNoteValues.forEach(function(value, index) {
      setDeliveryValue(DB_COL.KET_PROSES_START + index, value);
    });

    sheet
      .getRange(
        targetRow,
        DB_COL.JUMLAH_ORDER,
        1,
        deliveryToNotes.length
      )
      .setValues([deliveryToNotes]);

    // DR:EC berada di luar blok AR:DA sehingga ditulis terpisah.
    setKodeItemValue_(sheet, targetRow, kodeItem);
    setRoutingDetailsForRow_(sheet, targetRow, payload);
    setExtraInputsForRow_(sheet, targetRow, payload);
    setKeteranganWarnaValue_(sheet, targetRow, payload.keteranganWarna);
    setKeteranganBahanValue_(sheet, targetRow, payload.keteranganBahan);

    // Meter/Roll mempunyai kolom mandiri EC agar tidak bergantung pada
    // panjang Ukuran Jadi maupun catatan tersembunyi pada UOM Order.
    setStoredMeterRollForNewRow_(
      sheet,
      targetRow,
      meterRoll
    );

    // --- R:S adalah konversi KG/PCS dan Meter/KG; BT:BU total komposisi. ---
    setConversionFormulas_(sheet, targetRow, 1);
    tanamFormulaTotalKomposisi_(sheet, targetRow);

    // Salin format dari baris data terdekat dalam satu operasi.
    applyNewDatabaseRowFormatting_(
      sheet,
      targetRow,
      saveContext.formatSourceRow
    );

    SpreadsheetApp.flush();
    const dualWrite = syncDatabaseV2AfterLegacyWrite_(sheet, targetRow, 'SUBMIT_DATABASE');

    writeCachedSpkRow_(spkKey, targetRow);
    addSpkToExistenceCache_(spkKey, targetRow);
    addMarketingToOptionsCache_(payload.marketing);
    initializeSpkApprovals_(spkKey, targetRow, payload, creatorSession);
    clearDashboardCache_();
    clearKeluarBahanCache_();

    return {
      status: 'success',
      message: jenisOrder === 'Repeat Order'
        ? "Repeat Order SPK '" + spkKey + "' berhasil disimpan dari referensi '" + spkReferensi + "'."
        : "Data SPK '" + spkKey + "' berhasil disimpan ke Database.",
      data: {
        spk: spkKey,
        rowNumber: targetRow,
        dualWrite: dualWrite
      },
      performance: {
        durationMs: Date.now() - startedAt,
        writeMode: 'fast-append'
      }
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
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

function ensureReferenceColumnHeader_(sheet) {
  const headerCell = sheet.getRange(1, DB_COL.SPK_REFERENSI);
  const typeCell = sheet.getRange(2, DB_COL.SPK_REFERENSI);
  if (String(headerCell.getValue()).trim() === '') headerCell.setValue('SPK REFERENSI');
  if (String(typeCell.getValue()).trim() === '') typeCell.setValue('str');
}

function buildPcsPerKgFormula_(row) {
  return '=IFERROR(5444/N' + row + '/O' + row + '/M' + row + ', "")';
}

function buildMeterPerKgFormula_(row) {
  const filmFactor =
    'IF(REGEXMATCH(UPPER(H' + row + '), "TUBE"), 2, 1)';
  return (
    '=IF(OR(M' + row + '="",O' + row + '="",Q' + row + '="",H' + row + '=""),"",' +
    'IFERROR(1/(Q' + row + '*((M' + row + '/100)*(O' + row + '*1000)*' +
    filmFactor + ')/1000),""))'
  );
}

function setConversionFormulas_(sheet, startRow, rowCount) {
  if (!(rowCount > 0)) return;

  const formulas = [];
  for (let row = startRow; row < startRow + rowCount; row++) {
    formulas.push([
      buildPcsPerKgFormula_(row),
      buildMeterPerKgFormula_(row)
    ]);
  }

  sheet
    .getRange(startRow, DB_COL.PCS_PER_KG, rowCount, 2)
    .setFormulas(formulas)
    .setNumberFormat('0.######');
}

function tanamFormulaTotalKomposisi_(sheet, r) {
  sheet
    .getRange(r, DB_COL.TOTAL_KOMPOSISI_KG, 1, 2)
    .setFormulas([[
      '=SUM(AY' + r + '+BB' + r + '+BE' + r + '+BH' + r + '+BK' + r + '+BN' + r + '+BQ' + r + ')',
      '=SUM(AZ' + r + '+BC' + r + '+BF' + r + '+BI' + r + '+BL' + r + '+BO' + r + '+BR' + r + ')'
    ]]);
}

function applyNewDatabaseRowFormatting_(sheet, targetRow, sourceRow) {
  if (sourceRow >= DB_DATA_START_ROW && sourceRow !== targetRow) {
    const width = Math.min(databaseTotalColumns_(), sheet.getMaxColumns());
    sheet
      .getRange(sourceRow, 1, 1, width)
      .copyTo(
        sheet.getRange(targetRow, 1, 1, width),
        SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
        false
      );
    return;
  }

  terapkanFormatBaris_(sheet, targetRow);
}

function terapkanFormatBaris_(sheet, r) {
  sheet.getRange('B' + r).setNumberFormat('mm-dd-yy');
  sheet.getRange('AW' + r).setNumberFormat('dd/MM/yyyy');
  sheet.getRange('AV' + r).setNumberFormat('0.00%');
  sheet.getRange(r, DB_COL.KELUAR_BAHAN).setNumberFormat('0.############');

  sheet
    .getRange(r, DB_COL.BS_START, 1, DB_COL.TOTAL_BS - DB_COL.BS_START + 1)
    .setNumberFormat('0.##%');

  for (let slot = 0; slot < DB_MAX_BAHAN - 1; slot++) {
    const kgColumn = DB_COL.KOMPOSISI_START + (slot * 3) + 1;
    const percentColumn = kgColumn + 1;
    sheet.getRange(r, kgColumn).setNumberFormat('0.###');
    sheet.getRange(r, percentColumn).setNumberFormat('0.##%');
  }
}
