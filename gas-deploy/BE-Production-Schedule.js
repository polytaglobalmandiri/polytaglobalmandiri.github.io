// Schedule Produksi. Sheet dibuat hanya pada mutasi pertama oleh akun PPIC berizin.
// ID jadwal adalah identitas bisnis; nomor baris tidak dipakai lintas permintaan.
var PRODUCTION_SCHEDULE_SHEET_ = 'Schedule Produksi';
var PRODUCTION_SCHEDULE_HEADERS_ = [
  'Schedule ID', 'Request ID', 'SPK', 'Routing ID', 'Proses', 'Mesin',
  'Mulai Rencana', 'Selesai Rencana', 'Urutan', 'Target', 'UOM Target',
  'Status', 'Catatan', 'Dibuat Oleh', 'Dibuat', 'Diperbarui Oleh',
  'Diperbarui', 'Versi', 'Alasan Status'
];
var PRODUCTION_SCHEDULE_ROLES_ = ['admin_ppic', 'asmen_ppic', 'manager_ppic'];

function productionScheduleSheet_(book, create) {
  var sheet = book.getSheetByName(PRODUCTION_SCHEDULE_SHEET_);
  if (!sheet && !create) return null;
  if (!sheet) {
    sheet = book.insertSheet(PRODUCTION_SCHEDULE_SHEET_);
    sheet.getRange(1, 1, 1, PRODUCTION_SCHEDULE_HEADERS_.length)
      .setValues([PRODUCTION_SCHEDULE_HEADERS_]);
    sheet.setFrozenRows(1);
  }
  var headers = sheet.getRange(1, 1, 1, PRODUCTION_SCHEDULE_HEADERS_.length).getValues()[0];
  if (headers.some(function(value, index) {
    return String(value).trim() !== PRODUCTION_SCHEDULE_HEADERS_[index];
  })) throw new Error('Kolom Schedule Produksi tidak sesuai kontrak. Periksa sheet sebelum melanjutkan.');
  return sheet;
}

function readProductionScheduleRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, PRODUCTION_SCHEDULE_HEADERS_.length)
    .getValues().map(function(values, index) {
      var item = { rowNumber: index + 2 };
      PRODUCTION_SCHEDULE_HEADERS_.forEach(function(key, i) { item[key] = values[i]; });
      return item;
    }).filter(function(item) { return String(item['Schedule ID']).trim() !== ''; });
}

function productionSchedulePublic_(item) {
  return {
    scheduleId: String(item['Schedule ID']), spk: String(item.SPK),
    routingId: String(item['Routing ID']), proses: String(item.Proses),
    mesin: String(item.Mesin), mulai: String(item['Mulai Rencana']),
    selesai: String(item['Selesai Rencana']), urutan: Number(item.Urutan),
    target: Number(item.Target), uomTarget: String(item['UOM Target']),
    status: String(item.Status), catatan: String(item.Catatan), alasanStatus: String(item['Alasan Status'] || ''),
    versi: Number(item.Versi) || 1
  };
}

function productionScheduleIso_(value) {
  var text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    throw new Error('Waktu jadwal wajib berformat YYYY-MM-DDTHH:mm.');
  }
  var date = new Date(text + ':00+07:00');
  if (!Number.isFinite(date.getTime()) ||
      Utilities.formatDate(date, 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm") !== text) {
    throw new Error('Tanggal atau jam jadwal tidak valid.');
  }
  return text;
}

function validateProductionSchedulePayload_(payload) {
  var data = payload || {};
  var result = {
    scheduleId: String(data.scheduleId || '').trim(),
    requestId: String(data.requestId || '').trim(),
    spk: normalizeDatabaseV2Key_(data.spk),
    routingId: String(data.routingId || '').trim(),
    mesin: String(data.mesin || '').trim().toUpperCase(),
    mulai: productionScheduleIso_(data.mulai),
    selesai: productionScheduleIso_(data.selesai),
    urutan: Number(data.urutan),
    target: Number(data.target),
    uomTarget: String(data.uomTarget || '').trim().toUpperCase(),
    catatan: String(data.catatan || '').trim(),
    versi: Number(data.versi) || 0
  };
  if (!result.spk || !result.routingId || !result.mesin) {
    throw new Error('SPK, routing, dan mesin wajib diisi.');
  }
  if (result.selesai <= result.mulai) throw new Error('Selesai rencana harus setelah mulai rencana.');
  if (!Number.isInteger(result.urutan) || result.urutan < 1) {
    throw new Error('Urutan mesin harus bilangan bulat positif.');
  }
  if (!Number.isFinite(result.target) || result.target <= 0) {
    throw new Error('Target harus lebih besar dari nol.');
  }
  if (['KG', 'PCS', 'ROLL', 'METER'].indexOf(result.uomTarget) === -1) {
    throw new Error('Satuan target harus KG, PCS, ROLL, atau METER.');
  }
  if (result.catatan.length > 1000) throw new Error('Catatan terlalu panjang.');
  if (!result.scheduleId && !result.requestId) throw new Error('Request ID wajib untuk jadwal baru.');
  return result;
}

function productionScheduleRouting_(book, spk, routingId) {
  var master = readDatabaseV2Spk_(spk, book);
  if (!master) throw new Error('SPK tidak ditemukan.');
  if (String(master.master.Tracking || '').trim().toUpperCase() !== 'Q') {
    throw new Error('SPK belum aktif untuk dijadwalkan.');
  }
  var routing = master.routing.find(function(item) {
    return String(item['Routing ID']).trim() === routingId;
  });
  if (!routing) throw new Error('Routing tidak ditemukan pada SPK ini.');
  if (String(routing.Status || '').trim().toUpperCase() === 'SELESAI') {
    throw new Error('Routing yang selesai tidak dapat dijadwalkan lagi.');
  }
  return routing;
}

function assertProductionScheduleConflictFree_(rows, candidate) {
  rows.forEach(function(item) {
    if (String(item['Schedule ID']) === String(candidate['Schedule ID'])) return;
    if (String(item.Status) !== 'RELEASED' && String(item.Status) !== 'IN_PROGRESS') return;
    if (String(item.Mesin).toUpperCase() !== String(candidate.Mesin).toUpperCase()) return;
    if (String(candidate['Mulai Rencana']) < String(item['Selesai Rencana']) &&
        String(item['Mulai Rencana']) < String(candidate['Selesai Rencana'])) {
      throw new Error('Mesin sudah mempunyai jadwal lain pada waktu tersebut.');
    }
  });
}

function getProductionScheduleData(token) {
  try {
    requireApprovalSession_(token, PRODUCTION_SCHEDULE_ROLES_);
    var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    var schedules = readProductionScheduleRows_(productionScheduleSheet_(book, false))
      .map(productionSchedulePublic_);
    var entries = readProductionEntryRows_(productionEntrySheet_(book, false));
    var actual = {};
    entries.forEach(function(item) {
      if (String(item.Status) !== 'VERIFIED') return;
      var key = String(item['Schedule ID']);
      actual[key] = (actual[key] || 0) + (Number(item['Hasil Baik']) || 0);
    });
    schedules.forEach(function(item) { item.hasilTerverifikasi = actual[item.scheduleId] || 0; });
    var masters = {};
    readDatabaseV2Table_('master', book).records.forEach(function(item) {
      if (String(item.Tracking || '').trim().toUpperCase() === 'Q') {
        masters[normalizeDatabaseV2Key_(item.SPK)] = item;
      }
    });
    var candidates = readDatabaseV2Table_('routing', book).records
      .filter(function(item) {
        var spk = normalizeDatabaseV2Key_(item.SPK);
        return masters[spk] && String(item.Status || '').trim().toUpperCase() !== 'SELESAI';
      }).map(function(item) {
        var spk = normalizeDatabaseV2Key_(item.SPK);
        var master = masters[spk];
        return {
          spk: spk, routingId: String(item['Routing ID'] || ''),
          proses: String(item['Nama Proses'] || item['Kode Proses'] || ''),
          urutanProses: Number(item.Urutan) || 0,
          mesinSpk: String(item.Mesin || ''),
          customer: String(master.Customer || ''), artikel: String(master.Artikel || ''),
          jumlahOrder: Number(master['Jumlah Order']) || 0,
          uomOrder: String(master['UOM Order'] || '')
        };
      });
    return { status: 'success', candidates: candidates, schedules: schedules };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function saveProductionSchedule(token, payload) {
  try {
    var session = requireApprovalSession_(token, PRODUCTION_SCHEDULE_ROLES_);
    var data = validateProductionSchedulePayload_(payload);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) throw new Error('Jadwal sedang diperbarui pengguna lain.');
    try {
      var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      var routing = productionScheduleRouting_(book, data.spk, data.routingId);
      var sheet = productionScheduleSheet_(book, true);
      var rows = readProductionScheduleRows_(sheet);
      var existing = data.scheduleId
        ? rows.find(function(item) { return String(item['Schedule ID']) === data.scheduleId; })
        : rows.find(function(item) { return String(item['Request ID']) === data.requestId; });
      if (!data.scheduleId && existing) return { status: 'success', data: productionSchedulePublic_(existing) };
      if (data.scheduleId && !existing) throw new Error('Jadwal tidak ditemukan. Muat ulang daftar.');
      if (existing && (String(existing.SPK) !== data.spk || String(existing['Routing ID']) !== data.routingId)) {
        throw new Error('SPK dan routing jadwal yang ada tidak dapat diganti.');
      }
      if (existing && String(existing.Status) !== 'DRAFT') {
        throw new Error('Hanya jadwal draf yang dapat diubah.');
      }
      if (existing && Number(existing.Versi) !== data.versi) {
        throw new Error('Jadwal sudah berubah. Muat ulang sebelum menyimpan.');
      }
      var id = existing ? data.scheduleId : Utilities.getUuid();
      var now = new Date().toISOString();
      var values = [
        id, existing ? existing['Request ID'] : data.requestId, data.spk,
        data.routingId, String(routing['Nama Proses'] || routing['Kode Proses'] || ''),
        data.mesin, data.mulai, data.selesai, data.urutan, data.target,
        data.uomTarget, 'DRAFT', data.catatan,
        existing ? existing['Dibuat Oleh'] : session.email,
        existing ? existing.Dibuat : now, session.email, now,
        existing ? data.versi + 1 : 1, existing ? existing['Alasan Status'] : ''
      ];
      var row = existing ? existing.rowNumber : sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
      SpreadsheetApp.flush();
      var check = readProductionScheduleRows_(sheet).find(function(item) {
        return String(item['Schedule ID']) === id;
      });
      if (!check || String(check['Routing ID']) !== data.routingId || Number(check.Versi) !== values[17]) {
        throw new Error('Verifikasi baca balik jadwal gagal.');
      }
      return { status: 'success', data: productionSchedulePublic_(check) };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function cancelProductionSchedule(token, scheduleId, version, reason) {
  try {
    var session = requireApprovalSession_(token, PRODUCTION_SCHEDULE_ROLES_);
    var id = String(scheduleId || '').trim();
    var note = String(reason || '').trim();
    if (!id || !note || note.length > 500) throw new Error('Jadwal dan alasan pembatalan (maks. 500 karakter) wajib diisi.');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) throw new Error('Jadwal sedang diperbarui pengguna lain.');
    try {
      var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      var sheet = productionScheduleSheet_(book, false);
      var item = readProductionScheduleRows_(sheet).find(function(row) { return String(row['Schedule ID']) === id; });
      if (!item || ['DRAFT', 'RELEASED'].indexOf(String(item.Status)) === -1 || Number(item.Versi) !== Number(version)) {
        throw new Error('Jadwal tidak ditemukan atau sudah berubah. Muat ulang daftar.');
      }
      var hasEntry = readProductionEntryRows_(productionEntrySheet_(book, false)).some(function(row) {
        return String(row['Schedule ID']) === id;
      });
      if (hasEntry) throw new Error('Jadwal yang sudah memiliki hasil tidak dapat dibatalkan.');
      sheet.getRange(item.rowNumber, 12).setValue('CANCELLED');
      sheet.getRange(item.rowNumber, 16, 1, 4).setValues([[session.email, new Date().toISOString(), Number(item.Versi) + 1, note]]);
      SpreadsheetApp.flush();
      var check = readProductionScheduleRows_(sheet).find(function(row) { return String(row['Schedule ID']) === id; });
      if (!check || String(check.Status) !== 'CANCELLED' || String(check['Alasan Status']) !== note) {
        throw new Error('Verifikasi pembatalan jadwal gagal.');
      }
      return { status: 'success', data: productionSchedulePublic_(check) };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function releaseProductionSchedule(token, scheduleId, version) {
  try {
    var session = requireApprovalSession_(token, PRODUCTION_SCHEDULE_ROLES_);
    var id = String(scheduleId || '').trim();
    if (!id) throw new Error('Schedule ID wajib diisi.');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) throw new Error('Jadwal sedang diperbarui pengguna lain.');
    try {
      var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      var sheet = productionScheduleSheet_(book, false);
      var rows = readProductionScheduleRows_(sheet);
      var item = rows.find(function(row) { return String(row['Schedule ID']) === id; });
      if (!item) throw new Error('Jadwal tidak ditemukan.');
      if (String(item.Status) !== 'DRAFT' || Number(item.Versi) !== Number(version)) {
        throw new Error('Jadwal sudah berubah. Muat ulang sebelum merilis.');
      }
      productionScheduleRouting_(book, String(item.SPK), String(item['Routing ID']));
      assertProductionScheduleConflictFree_(rows, item);
      sheet.getRange(item.rowNumber, 12).setValue('RELEASED');
      sheet.getRange(item.rowNumber, 16, 1, 3)
        .setValues([[session.email, new Date().toISOString(), Number(item.Versi) + 1]]);
      SpreadsheetApp.flush();
      var check = readProductionScheduleRows_(sheet).find(function(row) {
        return String(row['Schedule ID']) === id;
      });
      if (!check || String(check.Status) !== 'RELEASED') {
        throw new Error('Verifikasi rilis jadwal gagal.');
      }
      return { status: 'success', data: productionSchedulePublic_(check) };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
