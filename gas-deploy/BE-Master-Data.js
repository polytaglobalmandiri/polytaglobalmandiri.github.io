// ==========================================
// MASTER DATA
//
// Sheet master dipisah dari data transaksi, tetapi tetap berada di file
// Spreadsheet yang sama dengan tabel native SPK Master. Satu file berarti satu kali
// openById per permintaan, dan rumus antar-sheet seperti VLOOKUP maupun Data
// Validation bisa menunjuk langsung tanpa IMPORTRANGE.
//
// Susunan barisnya:
//   Baris 1  label kolom, disediakan untuk diisi sendiri; tidak pernah
//            ditulis maupun dibaca oleh kode
//   Baris 2  judul kolom
//   Baris 3  baris filter, dikosongkan untuk diisi kata kunci pencarian
//   Baris 4  awal data
//
// Tabel transaksi V2 memiliki schema sendiri. Master ini memakai susunan
// sederhana di atas dan tidak memerlukan baris tipe data.
// ==========================================

const MASTER_LABEL_ROW = 1;
const MASTER_HEADER_ROW = 2;
const MASTER_FILTER_ROW = 3;
const MASTER_DATA_START_ROW = 4;

// Nama pertama adalah nama yang berlaku; sisanya alias historis yang masih
// diterima khusus untuk sheet master.
const CUSTOMERS_SHEET_NAMES = ['Database Customers'];
const BRANDS_SHEET_NAMES = ['Database Brands', 'Database Items'];

// Susunan kolom master customer. Urutannya sengaja dikelompokkan: identitas,
// alamat, kontak, lalu ketentuan dagang, dan diakhiri status serta catatan.
const CUSTOMER_COLUMNS = [
  { header: 'Kode Customer', width: 110 },
  { header: 'Nama Customer', width: 220 },
  { header: 'Nama Alias', width: 150 },
  { header: 'NPWP', width: 150 },
  { header: 'Alamat', width: 260 },
  { header: 'Kota', width: 120 },
  { header: 'Provinsi', width: 130 },
  { header: 'Kode Pos', width: 80 },
  { header: 'Telepon', width: 130 },
  { header: 'Email', width: 180 },
  { header: 'Narahubung', width: 150 },
  { header: 'Telepon Narahubung', width: 140 },
  { header: 'Marketing', width: 130 },
  { header: 'Termin (hari)', width: 100 },
  { header: 'Limit Kredit', width: 130 },
  { header: 'Alamat Kirim', width: 260 },
  { header: 'Status', width: 100 },
  { header: 'Tanggal Terdaftar', width: 130 },
  { header: 'Catatan', width: 260 }
];

const CUSTOMER_STATUS_OPTIONS = ['Aktif', 'Non-aktif'];

// Susunan kolom master brand. Satu baris mewakili satu merek beserta
// spesifikasi barangnya, yaitu bidang-bidang yang selama ini diketik ulang di
// Data Utama setiap kali SPK dibuat. Kode Customer menghubungkannya ke master
// customer.
const BRAND_COLUMNS = [
  { header: 'Kode Brand', width: 110 },
  { header: 'Nama Brand', width: 200 },
  { header: 'Kode Customer', width: 110 },
  { header: 'Nama Customer', width: 200 },
  { header: 'Kode Item', width: 130 },
  { header: 'Artikel', width: 220 },
  { header: 'Model Kantong', width: 220 },
  { header: 'Ukuran Blow', width: 130 },
  { header: 'Ukuran Jadi', width: 130 },
  { header: 'Jenis Bahan', width: 120 },
  { header: 'Film', width: 90 },
  { header: 'Jenis Potongan', width: 120 },
  { header: 'Keterangan Warna', width: 140 },
  { header: 'Kode Silinder', width: 140 },
  { header: 'Jenis Packing', width: 120 },
  { header: 'Packing', width: 240 },
  { header: 'Status', width: 100 },
  { header: 'Tanggal Terdaftar', width: 130 },
  { header: 'Catatan', width: 260 }
];

const BRAND_STATUS_OPTIONS = ['Aktif', 'Non-aktif'];
const BRAND_JENIS_PACKING_OPTIONS = ['KARUNG', 'DUS', 'INNER'];

// ==========================================
// PEMBANTU UMUM MASTER
// ==========================================

// Nama persis dicoba lebih dulu, lalu perbandingan yang mengabaikan huruf
// besar-kecil dan spasi berlebih.
function findMasterSheet_(ss, acceptedNames) {
  for (let index = 0; index < acceptedNames.length; index++) {
    const sheet = ss.getSheetByName(acceptedNames[index]);
    if (sheet) return sheet;
  }

  const dicari = acceptedNames.map(normalizeSheetName_);
  const sheets = ss.getSheets();
  for (let index = 0; index < sheets.length; index++) {
    if (dicari.indexOf(normalizeSheetName_(sheets[index].getName())) > -1) {
      return sheets[index];
    }
  }
  return null;
}

function findCustomersSheet_(ss) {
  return findMasterSheet_(ss, CUSTOMERS_SHEET_NAMES);
}

// Menyiapkan kerangka satu sheet master: membuatnya bila belum ada, menulis
// judul hanya pada sel yang masih kosong, lalu merapikan tampilannya.
//
// Aman dijalankan berulang. Baris label (1), baris filter (3), dan baris data
// (4 ke bawah) tidak pernah disentuh isinya, begitu pula judul yang sudah
// diubah manual.
function setupMasterSheet_(ss, acceptedNames, columns) {
  let sheet = findMasterSheet_(ss, acceptedNames);
  const dibuatBaru = !sheet;

  if (dibuatBaru) {
    sheet = ss.insertSheet(acceptedNames[0]);
    // Sheet baru datang dengan 26 kolom bawaan; sisanya dibuang supaya lebar
    // sheet persis sebanyak kolom yang dipakai.
    if (sheet.getMaxColumns() > columns.length) {
      sheet.deleteColumns(columns.length + 1, sheet.getMaxColumns() - columns.length);
    }
  }

  if (sheet.getMaxColumns() < columns.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), columns.length - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < MASTER_DATA_START_ROW) {
    sheet.insertRowsAfter(sheet.getMaxRows(), MASTER_DATA_START_ROW - sheet.getMaxRows());
  }

  const judulSekarang = sheet
    .getRange(MASTER_HEADER_ROW, 1, 1, columns.length)
    .getDisplayValues()[0];

  const judulBaru = [];
  const diisi = [];

  columns.forEach(function(column, index) {
    const judulAda = String(judulSekarang[index] || '').trim();
    if (judulAda === '') diisi.push(column.header);
    judulBaru.push(judulAda === '' ? column.header : judulAda);
  });

  sheet.getRange(MASTER_HEADER_ROW, 1, 1, columns.length).setValues([judulBaru]);

  return { sheet: sheet, dibuatBaru: dibuatBaru, judulDitambahkan: diisi };
}

// Ketiga baris kepala dibedakan tampilannya supaya sekali lihat jelas mana
// baris label milik pengguna, mana judul kolom, dan mana baris filter yang
// boleh diketik.
function formatMasterHeaderRows_(sheet, columns) {
  const lebar = columns.length;

  // Baris label hanya diberi warna dasar; isinya sepenuhnya milik pengguna.
  sheet.getRange(MASTER_LABEL_ROW, 1, 1, lebar)
    .setBackground('#f1f3ef')
    .setFontColor('#4f5357')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.getRange(MASTER_HEADER_ROW, 1, 1, lebar)
    .setBackground('#8d1515')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  sheet.getRange(MASTER_FILTER_ROW, 1, 1, lebar)
    .setBackground('#fbf6e6')
    .setFontColor('#5c5433')
    .setFontWeight('bold')
    .setHorizontalAlignment('left');

  sheet.getRange(MASTER_LABEL_ROW, 1, MASTER_FILTER_ROW, lebar)
    .setBorder(true, true, true, true, true, true, '#b9bcbc', SpreadsheetApp.BorderStyle.SOLID);

  sheet.setRowHeight(MASTER_HEADER_ROW, 34);
  sheet.setFrozenRows(MASTER_FILTER_ROW);

  columns.forEach(function(column, index) {
    sheet.setColumnWidth(index + 1, column.width);
  });
}

function masterColumnIndex_(columns, header) {
  for (let index = 0; index < columns.length; index++) {
    if (columns[index].header === header) return index + 1;
  }
  return 0;
}

// Baris data yang tersedia untuk dipasangi aturan isian dan format angka.
function masterDataRowCount_(sheet) {
  return Math.max(0, sheet.getMaxRows() - MASTER_DATA_START_ROW + 1);
}

function applyMasterListValidation_(sheet, column, options, rowCount) {
  if (!column || rowCount <= 0) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(MASTER_DATA_START_ROW, column, rowCount, 1).setDataValidation(rule);
}

// Dropdown yang isinya diambil dari kolom sheet lain. Nilai di luar daftar
// hanya diperingatkan, tidak ditolak, karena sumbernya bisa saja belum diisi
// saat brand pertama dimasukkan.
function applyMasterRangeValidation_(sheet, column, sourceRange, rowCount) {
  if (!column || !sourceRange || rowCount <= 0) return;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sourceRange, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(MASTER_DATA_START_ROW, column, rowCount, 1).setDataValidation(rule);
}

function applyMasterNumberFormat_(sheet, column, format, rowCount) {
  if (!column || rowCount <= 0) return;
  sheet.getRange(MASTER_DATA_START_ROW, column, rowCount, 1).setNumberFormat(format);
}

// Catatan sel di pojok baris filter, dipakai kedua master.
function setMasterFilterNote_(sheet) {
  sheet.getRange(MASTER_FILTER_ROW, 1).setNote(
    'Baris filter. Ketik kata kunci di bawah judul kolom yang ingin disaring. ' +
    'Baris ini tidak pernah dibaca sebagai data; data dimulai dari baris ' +
    MASTER_DATA_START_ROW + '.'
  );
}

// Membaca isi satu sheet master sebagai daftar objek berkunci judul kolom.
// Baris yang kosong pada seluruh kolom penanda dilewati, sehingga baris kosong
// di tengah tidak ikut terbawa.
function readMasterRows_(acceptedNames, columns, keyColumnCount) {
  const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sheet = findMasterSheet_(ss, acceptedNames);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < MASTER_DATA_START_ROW) return [];

  const values = sheet
    .getRange(MASTER_DATA_START_ROW, 1, lastRow - MASTER_DATA_START_ROW + 1, columns.length)
    .getDisplayValues();

  const penanda = Math.max(1, keyColumnCount || 1);
  const rows = [];

  values.forEach(function(row) {
    const adaIsi = row.slice(0, penanda).some(function(cell) {
      return String(cell === null || cell === undefined ? '' : cell).trim() !== '';
    });
    if (!adaIsi) return;

    const entry = {};
    columns.forEach(function(column, index) {
      entry[column.header] = String(
        row[index] === null || row[index] === undefined ? '' : row[index]
      ).trim();
    });
    rows.push(entry);
  });

  return rows;
}

// ==========================================
// DATABASE CUSTOMERS
// ==========================================

// Jalankan dari editor Apps Script untuk menyiapkan sheet 'Database Customers'.
// Membuat sheetnya bila belum ada, mengisi judul kolom dan tipe data, lalu
// merapikan tampilan tiga baris kepalanya.
//
// Aman dijalankan berulang: isi baris 4 ke bawah tidak pernah disentuh, dan
// judul kolom yang sudah Anda ubah sendiri dibiarkan apa adanya.
function adminBuatSheetDatabaseCustomers() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      status: 'error',
      message: 'Spreadsheet sedang dipakai proses lain. Coba lagi beberapa saat.'
    };
  }

  try {
    const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const hasil = setupMasterSheet_(ss, CUSTOMERS_SHEET_NAMES, CUSTOMER_COLUMNS);
    const sheet = hasil.sheet;

    formatMasterHeaderRows_(sheet, CUSTOMER_COLUMNS);

    const rowCount = masterDataRowCount_(sheet);

    // Marketing memakai daftar nama yang sama dengan form Input SPK, supaya
    // penulisannya tidak bercabang antara master dan transaksi.
    applyMasterListValidation_(
      sheet,
      masterColumnIndex_(CUSTOMER_COLUMNS, 'Marketing'),
      MARKETING_OPTIONS,
      rowCount
    );
    applyMasterListValidation_(
      sheet,
      masterColumnIndex_(CUSTOMER_COLUMNS, 'Status'),
      CUSTOMER_STATUS_OPTIONS,
      rowCount
    );

    applyMasterNumberFormat_(sheet, masterColumnIndex_(CUSTOMER_COLUMNS, 'Tanggal Terdaftar'), 'dd/MM/yyyy', rowCount);
    applyMasterNumberFormat_(sheet, masterColumnIndex_(CUSTOMER_COLUMNS, 'Limit Kredit'), '#,##0', rowCount);
    applyMasterNumberFormat_(sheet, masterColumnIndex_(CUSTOMER_COLUMNS, 'Termin (hari)'), '0', rowCount);

    // Keterangan singkat ditempel sebagai catatan sel, bukan sebagai isi,
    // supaya baris filternya tetap kosong dan siap dipakai rumus.
    setMasterFilterNote_(sheet);

    SpreadsheetApp.flush();

    return {
      status: 'success',
      sheet: sheet.getName(),
      dibuatBaru: hasil.dibuatBaru,
      jumlahKolom: CUSTOMER_COLUMNS.length,
      judulDitambahkan: hasil.judulDitambahkan,
      barisLabel: MASTER_LABEL_ROW,
      barisJudul: MASTER_HEADER_ROW,
      barisFilter: MASTER_FILTER_ROW,
      barisDataMulai: MASTER_DATA_START_ROW,
      message: hasil.dibuatBaru
        ? "Sheet 'Database Customers' dibuat dengan " + CUSTOMER_COLUMNS.length + ' kolom.'
        : "Sheet 'Database Customers' sudah ada; judul yang kosong dilengkapi dan tampilannya dirapikan."
    };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Membaca isi master customer sebagai daftar objek. Belum dipakai form mana
// pun; disediakan sebagai pintu masuk saat master ini nanti disambungkan ke
// Input SPK.
function readCustomersMaster_() {
  return readMasterRows_(CUSTOMERS_SHEET_NAMES, CUSTOMER_COLUMNS, 2);
}

// ==========================================
// DATABASE BRANDS
// ==========================================

function findBrandsSheet_(ss) {
  return findMasterSheet_(ss, BRANDS_SHEET_NAMES);
}

// Jalankan dari editor Apps Script untuk menyiapkan sheet 'Database Brands'.
// Susunan barisnya sama persis dengan Database Customers: baris 1 label milik
// Anda, baris 2 judul kolom, baris 3 filter, baris 4 awal data.
//
// Aman dijalankan berulang, dan mengenali sheet lama bernama 'Database Items'
// bila tabnya sudah terlanjur dibuat dengan nama itu.
function adminBuatSheetDatabaseBrands() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return {
      status: 'error',
      message: 'Spreadsheet sedang dipakai proses lain. Coba lagi beberapa saat.'
    };
  }

  try {
    const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const hasil = setupMasterSheet_(ss, BRANDS_SHEET_NAMES, BRAND_COLUMNS);
    const sheet = hasil.sheet;

    formatMasterHeaderRows_(sheet, BRAND_COLUMNS);

    const rowCount = masterDataRowCount_(sheet);

    // Daftar pilihannya diambil dari konstanta yang sama dengan form Input SPK,
    // sehingga penulisan nilainya tidak bercabang antara master dan transaksi.
    applyMasterListValidation_(sheet, masterColumnIndex_(BRAND_COLUMNS, 'Jenis Bahan'), JENIS_BAHAN_OPTIONS, rowCount);
    applyMasterListValidation_(sheet, masterColumnIndex_(BRAND_COLUMNS, 'Film'), FILM_OPTIONS, rowCount);
    applyMasterListValidation_(
      sheet,
      masterColumnIndex_(BRAND_COLUMNS, 'Jenis Potongan'),
      JENIS_POTONGAN_OPTIONS.filter(function(nilai) { return nilai !== ''; }),
      rowCount
    );
    applyMasterListValidation_(sheet, masterColumnIndex_(BRAND_COLUMNS, 'Jenis Packing'), BRAND_JENIS_PACKING_OPTIONS, rowCount);
    applyMasterListValidation_(sheet, masterColumnIndex_(BRAND_COLUMNS, 'Status'), BRAND_STATUS_OPTIONS, rowCount);

    // Kode Customer memakai daftar dari master customer, jadi penghubung antar
    // kedua master tidak perlu diketik ulang dan kecil kemungkinan salah tulis.
    const sheetCustomers = findCustomersSheet_(ss);
    let sumberKodeCustomer = '(sheet Database Customers belum ada)';
    if (sheetCustomers) {
      const barisCustomer = masterDataRowCount_(sheetCustomers);
      if (barisCustomer > 0) {
        applyMasterRangeValidation_(
          sheet,
          masterColumnIndex_(BRAND_COLUMNS, 'Kode Customer'),
          sheetCustomers.getRange(MASTER_DATA_START_ROW, 1, barisCustomer, 1),
          rowCount
        );
        sumberKodeCustomer = sheetCustomers.getName() + ' kolom A';
      }
    }

    applyMasterNumberFormat_(sheet, masterColumnIndex_(BRAND_COLUMNS, 'Tanggal Terdaftar'), 'dd/MM/yyyy', rowCount);

    setMasterFilterNote_(sheet);

    SpreadsheetApp.flush();

    return {
      status: 'success',
      sheet: sheet.getName(),
      dibuatBaru: hasil.dibuatBaru,
      jumlahKolom: BRAND_COLUMNS.length,
      judulDitambahkan: hasil.judulDitambahkan,
      sumberDropdownKodeCustomer: sumberKodeCustomer,
      barisLabel: MASTER_LABEL_ROW,
      barisJudul: MASTER_HEADER_ROW,
      barisFilter: MASTER_FILTER_ROW,
      barisDataMulai: MASTER_DATA_START_ROW,
      message: hasil.dibuatBaru
        ? "Sheet '" + sheet.getName() + "' dibuat dengan " + BRAND_COLUMNS.length + ' kolom.'
        : "Sheet '" + sheet.getName() + "' sudah ada; judul yang kosong dilengkapi dan tampilannya dirapikan."
    };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Membaca isi master brand sebagai daftar objek. Sama seperti pembacaan
// customer, belum tersambung ke form mana pun.
function readBrandsMaster_() {
  return readMasterRows_(BRANDS_SHEET_NAMES, BRAND_COLUMNS, 2);
}

// Menyiapkan kedua master sekaligus. Customers dijalankan lebih dulu supaya
// dropdown Kode Customer di sheet Brands langsung mendapat sumbernya.
function adminBuatSemuaSheetMaster() {
  return {
    customers: adminBuatSheetDatabaseCustomers(),
    brands: adminBuatSheetDatabaseBrands()
  };
}

// ==========================================
// PENYIMPANAN DARI FORM DASHBOARD
// ==========================================

// Kunci pembanding dibuat longgar terhadap spasi dan huruf besar-kecil, supaya
// 'C-001' dan 'c 001' tidak terdaftar sebagai dua customer berbeda.
function normalizeMasterKey_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

function cleanMasterCell_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

// Mengambil sheet master yang siap pakai. Bila tabnya belum ada, dibuat lebih
// dulu lengkap dengan judul dan tampilannya, sehingga pengguna tidak perlu
// menjalankan fungsi admin terpisah sebelum bisa menyimpan.
function ensureMasterSheetReady_(ss, acceptedNames, columns) {
  const sheet = findMasterSheet_(ss, acceptedNames);
  if (sheet) return sheet;

  const hasil = setupMasterSheet_(ss, acceptedNames, columns);
  formatMasterHeaderRows_(hasil.sheet, columns);
  setMasterFilterNote_(hasil.sheet);
  return hasil.sheet;
}

// Menambahkan satu baris ke sheet master. Kolom kunci wajib diisi dan tidak
// boleh sama dengan baris yang sudah ada.
function saveMasterRow_(acceptedNames, columns, payload, opsi) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { status: 'error', message: 'Sistem sedang sibuk. Coba simpan lagi beberapa saat.' };
  }

  try {
    const input = payload || {};
    const kolomKunci = masterColumnIndex_(columns, opsi.keyHeader);
    const kolomNama = masterColumnIndex_(columns, opsi.nameHeader);

    const kunci = cleanMasterCell_(input[opsi.keyHeader]);
    const nama = cleanMasterCell_(input[opsi.nameHeader]);

    if (kunci === '') {
      return { status: 'error', message: opsi.keyHeader + ' wajib diisi.' };
    }
    if (nama === '') {
      return { status: 'error', message: opsi.nameHeader + ' wajib diisi.' };
    }

    const ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const sheet = ensureMasterSheetReady_(ss, acceptedNames, columns);
    const lastRow = sheet.getLastRow();

    if (lastRow >= MASTER_DATA_START_ROW) {
      const terdaftar = sheet
        .getRange(MASTER_DATA_START_ROW, kolomKunci, lastRow - MASTER_DATA_START_ROW + 1, 1)
        .getDisplayValues();
      const dicari = normalizeMasterKey_(kunci);

      for (let index = 0; index < terdaftar.length; index++) {
        if (normalizeMasterKey_(terdaftar[index][0]) === dicari) {
          return {
            status: 'duplicate',
            message: opsi.keyHeader + " '" + kunci + "' sudah terdaftar di baris " +
              (MASTER_DATA_START_ROW + index) + '. Data tidak disimpan.'
          };
        }
      }
    }

    const nilai = columns.map(function(column) {
      if (column.header === opsi.dateHeader) {
        const teks = cleanMasterCell_(input[column.header]);
        // Kosong berarti tanggal hari ini, supaya kolomnya tidak terlewat.
        return teks === '' ? new Date() : parseTanggal_(teks);
      }
      return cleanMasterCell_(input[column.header]);
    });

    const targetRow = Math.max(lastRow + 1, MASTER_DATA_START_ROW);
    sheet.getRange(targetRow, 1, 1, columns.length).setValues([nilai]);
    SpreadsheetApp.flush();

    return {
      status: 'success',
      sheet: sheet.getName(),
      row: targetRow,
      kunci: kunci,
      nama: nama,
      message: nama + ' tersimpan di ' + sheet.getName() + ' baris ' + targetRow + '.'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Gagal menyimpan: ' + (error && error.message ? error.message : error)
    };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function saveCustomerMaster(payload) {
  const result = saveMasterRow_(CUSTOMERS_SHEET_NAMES, CUSTOMER_COLUMNS, payload, {
    keyHeader: 'Kode Customer',
    nameHeader: 'Nama Customer',
    dateHeader: 'Tanggal Terdaftar'
  });
  if (result && result.status === 'success') clearCustomerOptionsCache_();
  return result;
}

function saveBrandMaster(payload) {
  return saveMasterRow_(BRANDS_SHEET_NAMES, BRAND_COLUMNS, payload, {
    keyHeader: 'Kode Brand',
    nameHeader: 'Nama Brand',
    dateHeader: 'Tanggal Terdaftar'
  });
}

// Daftar pilihan untuk kedua form di Dashboard. Diambil dari konstanta yang
// sama dengan Input SPK, ditambah daftar customer yang sudah terdaftar untuk
// mengisi dropdown Kode Customer pada form brand.
function getMasterFormOptions() {
  try {
    const customers = readMasterRows_(CUSTOMERS_SHEET_NAMES, CUSTOMER_COLUMNS, 2)
      .map(function(row) {
        return { kode: row['Kode Customer'], nama: row['Nama Customer'] };
      })
      .filter(function(row) { return row.kode !== '' || row.nama !== ''; });

    return {
      status: 'success',
      marketing: MARKETING_OPTIONS,
      statusCustomer: CUSTOMER_STATUS_OPTIONS,
      statusBrand: BRAND_STATUS_OPTIONS,
      jenisBahan: JENIS_BAHAN_OPTIONS,
      film: FILM_OPTIONS,
      jenisPotongan: JENIS_POTONGAN_OPTIONS.filter(function(nilai) { return nilai !== ''; }),
      jenisPacking: BRAND_JENIS_PACKING_OPTIONS,
      customers: customers,
      kolomCustomer: CUSTOMER_COLUMNS.map(function(column) { return column.header; }),
      kolomBrand: BRAND_COLUMNS.map(function(column) { return column.header; })
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Gagal memuat daftar pilihan: ' + (error && error.message ? error.message : error),
      marketing: [], statusCustomer: [], statusBrand: [], jenisBahan: [],
      film: [], jenisPotongan: [], jenisPacking: [], customers: [],
      kolomCustomer: [], kolomBrand: []
    };
  }
}
