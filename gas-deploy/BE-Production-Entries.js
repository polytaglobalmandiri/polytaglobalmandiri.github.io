// Hasil produksi adalah entri berulang. Satu penyimpanan tidak menutup routing SPK.
var PRODUCTION_ENTRY_SHEET_ = 'Hasil Produksi';
var PRODUCTION_ENTRY_HEADERS_ = [
  'Entry ID', 'Request ID', 'Schedule ID', 'SPK', 'Routing ID', 'Proses',
  'Tanggal', 'Shift', 'Mesin', 'Operator', 'Mulai Aktual', 'Selesai Aktual',
  'Hasil Baik', 'BS', 'UOM', 'Pemakaian Bahan JSON', 'Downtime JSON',
  'Alasan Lebih Target', 'Catatan', 'Status', 'Dikirim Oleh', 'Dikirim',
  'Diverifikasi Oleh', 'Diverifikasi', 'Versi', 'Alasan Status'
];
var PRODUCTION_ENTRY_INPUT_ROLES_ = [
  'admin_produksi', 'operator_produksi', 'admin_ppic', 'asmen_ppic', 'manager_ppic'
];
var PRODUCTION_ENTRY_VERIFY_ROLES_ = [
  'head_mixer', 'head_blowing', 'head_printing', 'head_slitting',
  'head_folding', 'head_gusset', 'head_finishing', 'asmen_ppic', 'manager_ppic'
];

function productionEntrySheet_(book, create) {
  var sheet = book.getSheetByName(PRODUCTION_ENTRY_SHEET_);
  if (!sheet && !create) return null;
  if (!sheet) {
    sheet = book.insertSheet(PRODUCTION_ENTRY_SHEET_);
    sheet.getRange(1, 1, 1, PRODUCTION_ENTRY_HEADERS_.length).setValues([PRODUCTION_ENTRY_HEADERS_]);
    sheet.setFrozenRows(1);
  }
  var headers = sheet.getRange(1, 1, 1, PRODUCTION_ENTRY_HEADERS_.length).getValues()[0];
  if (headers.some(function(value, index) {
    return String(value).trim() !== PRODUCTION_ENTRY_HEADERS_[index];
  })) throw new Error('Kolom Hasil Produksi tidak sesuai kontrak.');
  return sheet;
}

function readProductionEntryRows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, PRODUCTION_ENTRY_HEADERS_.length)
    .getValues().map(function(values, index) {
      var item = { rowNumber: index + 2 };
      PRODUCTION_ENTRY_HEADERS_.forEach(function(key, i) { item[key] = values[i]; });
      return item;
    }).filter(function(item) { return String(item['Entry ID']).trim() !== ''; });
}

function productionEntryPublic_(item) {
  var materials = [], downtime = [];
  try { materials = JSON.parse(String(item['Pemakaian Bahan JSON'] || '[]')); } catch (error) {}
  try { downtime = JSON.parse(String(item['Downtime JSON'] || '[]')); } catch (error) {}
  return {
    entryId: String(item['Entry ID']), scheduleId: String(item['Schedule ID']),
    spk: String(item.SPK), routingId: String(item['Routing ID']), proses: String(item.Proses),
    tanggal: String(item.Tanggal), shift: String(item.Shift), mesin: String(item.Mesin),
    operator: String(item.Operator), mulai: String(item['Mulai Aktual']),
    selesai: String(item['Selesai Aktual']), hasilBaik: Number(item['Hasil Baik']) || 0,
    bs: Number(item.BS) || 0, uom: String(item.UOM), materials: materials,
    downtime: downtime, alasanLebihTarget: String(item['Alasan Lebih Target']),
    catatan: String(item.Catatan), status: String(item.Status),
    dikirimOleh: String(item['Dikirim Oleh']), diverifikasiOleh: String(item['Diverifikasi Oleh']),
    versi: Number(item.Versi) || 1, alasanStatus: String(item['Alasan Status'] || '')
  };
}

function productionEntryNonNegative_(value, label) {
  var number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(label + ' harus angka nol atau lebih.');
  return number;
}

function validateProductionEntryPayload_(payload) {
  var data = payload || {};
  var result = {
    requestId: String(data.requestId || '').trim(),
    scheduleId: String(data.scheduleId || '').trim(),
    tanggal: String(data.tanggal || '').trim(),
    shift: String(data.shift || '').trim(),
    operator: String(data.operator || '').trim(),
    mulai: productionScheduleIso_(data.mulai),
    selesai: productionScheduleIso_(data.selesai),
    hasilBaik: productionEntryNonNegative_(data.hasilBaik, 'Hasil baik'),
    bs: productionEntryNonNegative_(data.bs, 'BS'),
    materials: Array.isArray(data.materials) ? data.materials : [],
    downtime: Array.isArray(data.downtime) ? data.downtime : [],
    alasanLebihTarget: String(data.alasanLebihTarget || '').trim(),
    catatan: String(data.catatan || '').trim()
  };
  if (!result.requestId || !result.scheduleId || !result.operator || !result.shift) {
    throw new Error('Schedule, request ID, shift, dan operator wajib diisi.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.tanggal) ||
      result.tanggal !== result.mulai.slice(0, 10)) {
    throw new Error('Tanggal hasil harus sama dengan tanggal mulai aktual.');
  }
  if (result.selesai <= result.mulai) throw new Error('Selesai aktual harus setelah mulai aktual.');
  if (result.hasilBaik === 0 && result.bs === 0 && !result.downtime.length) {
    throw new Error('Isi hasil, BS, atau downtime untuk pekerjaan ini.');
  }
  if (result.materials.length > 100 || result.downtime.length > 100) {
    throw new Error('Terlalu banyak baris bahan atau downtime.');
  }
  result.materials = result.materials.map(function(item) {
    var row = {
      nama: String(item && item.nama || '').trim(),
      resin: String(item && item.resin || '').trim(),
      kode: String(item && item.kode || '').trim(),
      kg: productionEntryNonNegative_(item && item.kg, 'Pemakaian bahan')
    };
    if (!row.nama || row.kg <= 0) throw new Error('Nama dan KG pemakaian bahan wajib diisi.');
    return row;
  });
  result.downtime = result.downtime.map(function(item) {
    var row = {
      mulai: productionScheduleIso_(item && item.mulai),
      selesai: productionScheduleIso_(item && item.selesai),
      alasan: String(item && item.alasan || '').trim()
    };
    if (row.selesai <= row.mulai || !row.alasan) {
      throw new Error('Waktu dan alasan downtime wajib diisi.');
    }
    if (row.mulai < result.mulai || row.selesai > result.selesai) {
      throw new Error('Downtime harus berada di dalam waktu kerja aktual.');
    }
    return row;
  });
  if (result.catatan.length > 1000 || result.alasanLebihTarget.length > 500) {
    throw new Error('Catatan atau alasan melebihi batas.');
  }
  return result;
}

function getProductionWorkData(token) {
  try {
    requireApprovalSession_(token, PRODUCTION_ENTRY_INPUT_ROLES_.concat(PRODUCTION_ENTRY_VERIFY_ROLES_));
    var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    var schedules = readProductionScheduleRows_(productionScheduleSheet_(book, false))
      .filter(function(item) { return ['RELEASED', 'IN_PROGRESS', 'COMPLETED'].indexOf(String(item.Status)) !== -1; })
      .map(productionSchedulePublic_);
    var entries = readProductionEntryRows_(productionEntrySheet_(book, false)).map(productionEntryPublic_);
    return { status: 'success', schedules: schedules, entries: entries };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function saveProductionEntry(token, payload) {
  try {
    var session = requireApprovalSession_(token, PRODUCTION_ENTRY_INPUT_ROLES_);
    var data = validateProductionEntryPayload_(payload);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) throw new Error('Hasil produksi sedang diperbarui pengguna lain.');
    try {
      var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      var schedule = readProductionScheduleRows_(productionScheduleSheet_(book, false))
        .find(function(item) { return String(item['Schedule ID']) === data.scheduleId; });
      if (!schedule || ['RELEASED', 'IN_PROGRESS'].indexOf(String(schedule.Status)) === -1) {
        throw new Error('Pekerjaan belum dirilis atau sudah ditutup.');
      }
      if (!/MIX/.test(String(schedule.Proses).toUpperCase()) || String(schedule['UOM Target']) !== 'KG') {
        throw new Error('Form hasil saat ini hanya tersedia untuk Mixer dengan target KG.');
      }
      productionScheduleRouting_(book, String(schedule.SPK), String(schedule['Routing ID']));
      var sheet = productionEntrySheet_(book, true);
      var rows = readProductionEntryRows_(sheet);
      var existing = rows.find(function(item) { return String(item['Request ID']) === data.requestId; });
      if (existing) return { status: 'success', data: productionEntryPublic_(existing) };
      var total = rows.filter(function(item) {
        return String(item['Schedule ID']) === data.scheduleId && String(item.Status) !== 'VOIDED';
      }).reduce(function(sum, item) {
        return sum + (String(item.Status) === 'REJECTED' ? 0 : (Number(item['Hasil Baik']) || 0));
      }, 0);
      if (total + data.hasilBaik > Number(schedule.Target) && !data.alasanLebihTarget) {
        throw new Error('Hasil melebihi target slot. Isi alasan kelebihan hasil.');
      }
      var id = Utilities.getUuid();
      var values = [
        id, data.requestId, data.scheduleId, String(schedule.SPK),
        String(schedule['Routing ID']), String(schedule.Proses), data.tanggal,
        data.shift, String(schedule.Mesin), data.operator, data.mulai, data.selesai,
        data.hasilBaik, data.bs, String(schedule['UOM Target']),
        JSON.stringify(data.materials), JSON.stringify(data.downtime),
        data.alasanLebihTarget, data.catatan, 'SUBMITTED', session.email,
        new Date().toISOString(), '', '', 1, ''
      ];
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
      SpreadsheetApp.flush();
      var check = readProductionEntryRows_(sheet).find(function(item) {
        return String(item['Entry ID']) === id;
      });
      if (!check || String(check['Schedule ID']) !== data.scheduleId) {
        throw new Error('Verifikasi baca balik hasil produksi gagal.');
      }
      return { status: 'success', data: productionEntryPublic_(check) };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function rejectProductionEntry(token, entryId, version, reason) {
  try {
    var session = requireApprovalSession_(token, PRODUCTION_ENTRY_VERIFY_ROLES_);
    var id = String(entryId || '').trim();
    var note = String(reason || '').trim();
    if (!id || !note || note.length > 500) throw new Error('Entri dan alasan pengembalian (maks. 500 karakter) wajib diisi.');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) throw new Error('Hasil produksi sedang diperbarui pengguna lain.');
    try {
      var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      var sheet = productionEntrySheet_(book, false);
      var item = readProductionEntryRows_(sheet).find(function(row) { return String(row['Entry ID']) === id; });
      if (!item || String(item.Status) !== 'SUBMITTED' || Number(item.Versi) !== Number(version)) {
        throw new Error('Entri tidak ditemukan atau sudah berubah. Muat ulang daftar.');
      }
      if (!productionEntryCanVerify_(session.roleKey, item.Proses)) throw new Error('Akun leader tidak sesuai proses produksi ini.');
      sheet.getRange(item.rowNumber, 20).setValue('REJECTED');
      sheet.getRange(item.rowNumber, 23, 1, 4).setValues([[session.email, new Date().toISOString(), Number(item.Versi) + 1, note]]);
      SpreadsheetApp.flush();
      var check = readProductionEntryRows_(sheet).find(function(row) { return String(row['Entry ID']) === id; });
      if (!check || String(check.Status) !== 'REJECTED' || String(check['Alasan Status']) !== note) {
        throw new Error('Verifikasi pengembalian hasil gagal.');
      }
      return { status: 'success', data: productionEntryPublic_(check) };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function productionEntryCanVerify_(role, processValue) {
  var process = String(processValue || '').toUpperCase();
  return role === 'asmen_ppic' || role === 'manager_ppic' ||
    (role === 'head_mixer' && /MIX/.test(process)) ||
    (role === 'head_blowing' && /BLOW/.test(process)) ||
    (role === 'head_printing' && /PRINT|CETAK/.test(process)) ||
    (role === 'head_slitting' && /SLIT/.test(process)) ||
    (role === 'head_folding' && /FOLD/.test(process)) ||
    (role === 'head_gusset' && /GUSS|GUSSET/.test(process)) ||
    (role === 'head_finishing' && /SEAL|CUT|FINISH|TSHIRT|T-SHIRT/.test(process));
}

function verifyProductionEntry(token, entryId, version) {
  try {
    var session = requireApprovalSession_(token, PRODUCTION_ENTRY_VERIFY_ROLES_);
    var id = String(entryId || '').trim();
    if (!id) throw new Error('Entry ID wajib diisi.');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(45000)) throw new Error('Hasil produksi sedang diperbarui pengguna lain.');
    try {
      var book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
      var sheet = productionEntrySheet_(book, false);
      var item = readProductionEntryRows_(sheet).find(function(row) {
        return String(row['Entry ID']) === id;
      });
      if (!item || String(item.Status) !== 'SUBMITTED' || Number(item.Versi) !== Number(version)) {
        throw new Error('Entri tidak ditemukan atau sudah berubah. Muat ulang daftar.');
      }
      if (!productionEntryCanVerify_(session.roleKey, item.Proses)) {
        throw new Error('Akun leader tidak sesuai proses produksi ini.');
      }
      sheet.getRange(item.rowNumber, 20).setValue('VERIFIED');
      sheet.getRange(item.rowNumber, 23, 1, 3)
        .setValues([[session.email, new Date().toISOString(), Number(item.Versi) + 1]]);
      SpreadsheetApp.flush();
      var check = readProductionEntryRows_(sheet).find(function(row) {
        return String(row['Entry ID']) === id;
      });
      if (!check || String(check.Status) !== 'VERIFIED') throw new Error('Verifikasi baca balik gagal.');
      return { status: 'success', data: productionEntryPublic_(check) };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
