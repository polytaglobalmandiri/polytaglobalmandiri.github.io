// ==========================================
// LOGIN & PERSETUJUAN SPK
// ==========================================
// Password tidak pernah disimpan sebagai teks asli. Database Users hanya
// menyimpan hash + salt; pepper disimpan terpisah di Script Properties.

var APPROVAL_USERS_SHEET_ = 'Database Users';
var APPROVAL_LOG_SHEET_ = 'Persetujuan SPK';
var APPROVAL_SESSION_PREFIX_ = 'spk-auth-v1-';
var APPROVAL_SESSION_SECONDS_ = 21600;
var APPROVAL_REMEMBER_SECONDS_ = 2592000;
var APPROVAL_BOOTSTRAP_CODE_PROPERTY_ = 'APPROVAL_BOOTSTRAP_CODE';

var APPROVAL_USER_HEADERS_ = [
  'User ID', 'Email', 'Password Hash', 'Password Salt',
  'Nama Lengkap', 'Role Key', 'Jabatan', 'Departemen', 'Aktif',
  'Signature File ID', 'Signature URL', 'Dibuat', 'Diperbarui',
  'Login Terakhir', 'Token Version'
];

var APPROVAL_LOG_HEADERS_ = [
  'SPK', 'Role Key', 'Jabatan', 'Departemen', 'Status',
  'Signer User ID', 'Signer Name', 'Signer Email', 'Signed At',
  'Signature File ID', 'Signature URL', 'Created At', 'Updated At',
  'Creator User ID', 'Database Row'
];

var APPROVAL_ROLES_ = {
  admin_ppic: { label: 'Admin PPIC / Pembuat', department: 'PPIC' },
  head_blowing: { label: 'Kepala Blowing', department: 'Blowing' },
  head_printing: { label: 'Kepala Printing', department: 'Printing' },
  head_slitting: { label: 'Kepala Slitting', department: 'Slitting' },
  head_folding: { label: 'Kepala Folding', department: 'Folding' },
  head_gusset: { label: 'Kepala Gusset', department: 'Gusset' },
  head_finishing: { label: 'Kepala Finishing', department: 'Finishing' },
  asmen_ppic: { label: 'Asmen PPIC', department: 'PPIC' },
  manager_ppic: { label: 'Manager PPIC', department: 'PPIC' },
  manager_qc: { label: 'Manager QC/QA', department: 'QC/QA' },
  senior_manager: { label: 'Senior Manager', department: 'Management' },
  general_manager: { label: 'General Manager', department: 'Management' }
};

function getApprovalBootstrapStatus() {
  var sheets = ensureApprovalSheets_();
  return {
    status: 'success',
    needsBootstrap: sheets.users.getLastRow() < 2,
    roles: getApprovalRoleOptions_()
  };
}

function bootstrapApprovalAdmin(setupCode, payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheets = ensureApprovalSheets_();
    if (sheets.users.getLastRow() >= 2) {
      return { status: 'error', message: 'Admin awal sudah dibuat. Silakan login.' };
    }
    var bootstrapCode = PropertiesService.getScriptProperties()
      .getProperty(APPROVAL_BOOTSTRAP_CODE_PROPERTY_);
    if (!bootstrapCode || String(setupCode || '').trim() !== String(bootstrapCode).trim()) {
      return { status: 'error', message: 'Kode aktivasi awal tidak valid.' };
    }
    var data = payload || {};
    data.roleKey = 'admin_ppic';
    data.active = true;
    var user = createOrUpdateApprovalUser_(sheets.users, null, data);
    return {
      status: 'success',
      message: 'Akun Admin PPIC pertama berhasil dibuat.',
      user: sanitizeApprovalUser_(user)
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  } finally {
    lock.releaseLock();
  }
}

function loginApprovalUser(email, password, rememberMe) {
  try {
    var normalizedEmail = normalizeApprovalEmail_(email);
    if (!normalizedEmail || !password) {
      return { status: 'error', message: 'Email dan password wajib diisi.' };
    }
    // Sheet approval sudah disiapkan saat bootstrap. Login tidak perlu
    // memeriksa/membaca header dua sheet pada setiap percobaan karena itu
    // menambah beberapa perjalanan jaringan ke Spreadsheet dan mudah lambat
    // ketika Apps Script baru bangun.
    var userSheet = getApprovalUsersSheetForLogin_();
    var user = findApprovalUserByEmail_(userSheet, normalizedEmail);
    if (!user || !user.active ||
        !approvalConstantTimeEqual_(user.passwordHash, hashApprovalPassword_(password, user.passwordSalt))) {
      return { status: 'error', message: 'Email atau password tidak sesuai.' };
    }

    var token = createApprovalToken_();
    var persistent = Boolean(rememberMe);
    var session = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      roleKey: user.roleKey,
      roleLabel: user.roleLabel,
      department: user.department,
      tokenVersion: user.tokenVersion,
      persistent: persistent,
      expiresAt: Date.now() + ((persistent ? APPROVAL_REMEMBER_SECONDS_ : APPROVAL_SESSION_SECONDS_) * 1000)
    };
    var sessionKey = approvalSessionKey_(token);
    CacheService.getScriptCache().put(
      sessionKey,
      JSON.stringify(session),
      APPROVAL_SESSION_SECONDS_
    );
    if (persistent) {
      PropertiesService.getScriptProperties().setProperty(sessionKey, JSON.stringify(session));
    }
    userSheet.getRange(user.rowNumber, 14).setValue(new Date());
    return { status: 'success', token: token, user: session };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function getApprovalUsersSheetForLogin_() {
  var ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  var users = ss.getSheetByName(APPROVAL_USERS_SHEET_);
  return users || ensureApprovalSheets_().users;
}

function getApprovalSession(token) {
  try {
    var session = requireApprovalSession_(token);
    return { status: 'success', authenticated: true, user: session };
  } catch (error) {
    return { status: 'error', authenticated: false, message: error.message };
  }
}

function logoutApprovalUser(token) {
  var sessionKey = approvalSessionKey_(token);
  try { CacheService.getScriptCache().remove(sessionKey); } catch (ignore) {}
  try { PropertiesService.getScriptProperties().deleteProperty(sessionKey); } catch (ignore) {}
  return { status: 'success' };
}

function listApprovalUsers(token) {
  try {
    requireApprovalSession_(token, ['admin_ppic']);
    var sheet = ensureApprovalSheets_().users;
    var users = readApprovalUsers_(sheet).map(sanitizeApprovalUser_);
    return { status: 'success', users: users, roles: getApprovalRoleOptions_() };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function saveApprovalUser(token, payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    requireApprovalSession_(token, ['admin_ppic']);
    var sheet = ensureApprovalSheets_().users;
    var user = createOrUpdateApprovalUser_(sheet, payload && payload.userId, payload || {});
    return {
      status: 'success',
      message: 'Data pengguna berhasil disimpan.',
      user: sanitizeApprovalUser_(user)
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  } finally {
    lock.releaseLock();
  }
}

function getApprovalQueue(token) {
  try {
    var session = requireApprovalSession_(token);
    var logSheet = ensureApprovalSheets_().approvals;
    var rows = readApprovalRows_(logSheet).filter(function(item) {
      return item.roleKey === session.roleKey;
    });
    var spkKeys = {};
    rows.forEach(function(item) { spkKeys[item.spk] = true; });
    var dbDetails = getApprovalSpkDetails_(spkKeys);
    var summaryCache = {};
    var items = rows.map(function(item) {
      if (!summaryCache[item.spk]) summaryCache[item.spk] = getSpkApprovalSummary_(item.spk, false);
      var detail = dbDetails[item.spk] || {};
      return {
        spk: item.spk,
        status: item.status,
        roleKey: item.roleKey,
        roleLabel: item.roleLabel,
        department: item.department,
        signedAt: approvalDateText_(item.signedAt),
        customer: detail.customer || '',
        article: detail.article || '',
        orderDate: detail.orderDate || '',
        routing: detail.routing || [],
        progress: summaryCache[item.spk].progress,
        approvalStatus: summaryCache[item.spk].status
      };
    });
    items.sort(function(a, b) {
      if (a.status !== b.status) return a.status === 'MENUNGGU' ? -1 : 1;
      return String(b.spk).localeCompare(String(a.spk));
    });
    var signatureReady = Boolean(getApprovalUserById_(session.userId).signatureFileId);
    return {
      status: 'success',
      user: session,
      signatureReady: signatureReady,
      items: items,
      counts: {
        pending: items.filter(function(item) { return item.status === 'MENUNGGU'; }).length,
        approved: items.filter(function(item) { return item.status === 'DISETUJUI'; }).length
      }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function approveSpk(token, spk) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var session = requireApprovalSession_(token);
    var user = getApprovalUserById_(session.userId);
    if (!user.signatureFileId) {
      return { status: 'error', message: 'Gambar tanda tangan akun belum diisi oleh Admin PPIC.' };
    }
    var key = normalizeSpk_(spk);
    var sheet = ensureApprovalSheets_().approvals;
    var rows = readApprovalRows_(sheet);
    var target = rows.find(function(item) {
      return item.spk === key && item.roleKey === session.roleKey;
    });
    if (!target) return { status: 'error', message: 'SPK ini bukan antrean persetujuan jabatan Anda.' };
    if (target.status === 'DISETUJUI') {
      return { status: 'success', message: 'SPK ini sudah Anda setujui.', summary: getSpkApprovalSummary_(key, false) };
    }
    var now = new Date();
    sheet.getRange(target.rowNumber, 5, 1, 8).setValues([[
      'DISETUJUI', user.userId, user.name, user.email, now,
      user.signatureFileId, user.signatureUrl, target.createdAt || now
    ]]);
    sheet.getRange(target.rowNumber, 13).setValue(now);
    return {
      status: 'success',
      message: "SPK '" + key + "' berhasil disetujui dan diparaf.",
      summary: getSpkApprovalSummary_(key, false)
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  } finally {
    lock.releaseLock();
  }
}

function getSpkApprovalStatus(token, spk) {
  try {
    requireApprovalSession_(token);
    return { status: 'success', summary: getSpkApprovalSummary_(normalizeSpk_(spk), false) };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Data lembar utama dikirim lebih dulu agar pratinjau segera dapat dibaca.
// Gambar tanda tangan yang lebih berat diambil lewat panggilan kedua ini dan
// dipasang ke lembar setelah semua file Drive siap.
function getSpkApprovalSignatures(token, spk) {
  try {
    requireApprovalSession_(token);
    var summary = getSpkApprovalSummary_(normalizeSpk_(spk), true);
    return {
      status: 'success',
      spk: summary.spk,
      approvals: summary.approvals
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function initializeSpkApprovals_(spk, rowNumber, payload, creatorSession) {
  var sheets = ensureApprovalSheets_();
  var existing = readApprovalRows_(sheets.approvals).some(function(item) {
    return item.spk === normalizeSpk_(spk);
  });
  if (existing) return;

  var creator = getApprovalUserById_(creatorSession.userId);
  if (!creator || creator.roleKey !== 'admin_ppic' || !creator.signatureFileId) {
    throw new Error('Akun pembuat wajib berjabatan Admin PPIC dan memiliki gambar tanda tangan.');
  }
  var roleKeys = requiredApprovalRolesForRouting_(payload && payload.routingSteps);
  var now = new Date();
  var values = roleKeys.map(function(roleKey) {
    var role = APPROVAL_ROLES_[roleKey];
    var isCreator = roleKey === 'admin_ppic';
    return [
      normalizeSpk_(spk), roleKey, role.label, role.department,
      isCreator ? 'DISETUJUI' : 'MENUNGGU',
      isCreator ? creator.userId : '',
      isCreator ? creator.name : '',
      isCreator ? creator.email : '',
      isCreator ? now : '',
      isCreator ? creator.signatureFileId : '',
      isCreator ? creator.signatureUrl : '',
      now, now, creator.userId, Number(rowNumber) || ''
    ];
  });
  if (values.length) {
    sheets.approvals.getRange(sheets.approvals.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
  }
}

function getSpkApprovalSummary_(spk, includeSignatureData) {
  var key = normalizeSpk_(spk);
  var rows = readApprovalRowsForSpk_(ensureApprovalSheets_().approvals, key);
  var signatureDataByFileId = includeSignatureData
    ? getApprovalSignatureDataMap_(rows.map(function(item) {
        return item.status === 'DISETUJUI' ? item.signatureFileId : '';
      }))
    : {};
  var approved = rows.filter(function(item) { return item.status === 'DISETUJUI'; }).length;
  var complete = rows.length > 0 && approved === rows.length;
  return {
    spk: key,
    status: rows.length === 0 ? 'BELUM_DIAJUKAN' : (complete ? 'SIAP_RELEASE' : 'MENUNGGU_TTD'),
    complete: complete,
    progress: { approved: approved, required: rows.length },
    approvals: rows.map(function(item) {
      var signatureData = signatureDataByFileId[item.signatureFileId] || '';
      return {
        roleKey: item.roleKey,
        roleLabel: item.roleLabel,
        department: item.department,
        status: item.status,
        signerName: item.signerName,
        signerEmail: item.signerEmail,
        signedAt: approvalDateText_(item.signedAt),
        signatureData: signatureData
      };
    })
  };
}

function requireCreatorApprovalSession_(token) {
  var session = requireApprovalSession_(token, ['admin_ppic']);
  var user = getApprovalUserById_(session.userId);
  if (!user || !user.signatureFileId) {
    throw new Error('Gambar tanda tangan Admin PPIC/pembuat belum tersimpan. Hubungi administrator.');
  }
  return session;
}

function requireApprovalSession_(token, allowedRoles) {
  var cleanToken = String(token || '').trim();
  if (!cleanToken) throw new Error('Silakan login dengan email terlebih dahulu.');
  var sessionKey = approvalSessionKey_(cleanToken);
  var raw = CacheService.getScriptCache().get(sessionKey);
  if (!raw) raw = PropertiesService.getScriptProperties().getProperty(sessionKey);
  if (!raw) throw new Error('Sesi login berakhir. Silakan login kembali.');
  var session = JSON.parse(raw);
  if (!session || Number(session.expiresAt) <= Date.now()) {
    try { CacheService.getScriptCache().remove(sessionKey); } catch (ignore) {}
    try { PropertiesService.getScriptProperties().deleteProperty(sessionKey); } catch (ignore) {}
    throw new Error('Sesi login berakhir. Silakan login kembali.');
  }
  if (session.persistent) {
    CacheService.getScriptCache().put(sessionKey, raw, APPROVAL_SESSION_SECONDS_);
  }
  var user = getApprovalUserById_(session.userId);
  if (!user || !user.active || Number(user.tokenVersion) !== Number(session.tokenVersion)) {
    throw new Error('Akun tidak aktif atau sesi sudah dicabut.');
  }
  if (allowedRoles && allowedRoles.indexOf(user.roleKey) === -1) {
    throw new Error('Jabatan akun tidak memiliki izin untuk tindakan ini.');
  }
  return session;
}

function requiredApprovalRolesForRouting_(routingSteps) {
  var roles = ['admin_ppic'];
  var map = {
    mixer: 'head_blowing', blowing: 'head_blowing', printing: 'head_printing',
    slitting: 'head_slitting', folding: 'head_folding', gusset: 'head_gusset',
    cutting: 'head_finishing', tshirt: 'head_finishing', bottomSeal: 'head_finishing',
    sideSeal: 'head_finishing'
  };
  (Array.isArray(routingSteps) ? routingSteps : []).forEach(function(step) {
    var role = map[String(step && step.key || '')];
    if (role && roles.indexOf(role) === -1) roles.push(role);
  });
  ['asmen_ppic', 'manager_ppic', 'manager_qc', 'senior_manager', 'general_manager'].forEach(function(role) {
    if (roles.indexOf(role) === -1) roles.push(role);
  });
  return roles;
}

function ensureApprovalSheets_() {
  var ss = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  var users = ss.getSheetByName(APPROVAL_USERS_SHEET_) || ss.insertSheet(APPROVAL_USERS_SHEET_);
  var approvals = ss.getSheetByName(APPROVAL_LOG_SHEET_) || ss.insertSheet(APPROVAL_LOG_SHEET_);
  // Migrasi satu kali dari rancangan awal. Login memang memakai email saja,
  // sehingga kolom Username lama dihapus beserta nilainya tanpa memengaruhi
  // password hash dan data pengguna lain yang bergeser ke kiri.
  if (String(users.getRange(1, 3).getDisplayValue() || '').trim() === 'Username') {
    users.deleteColumn(3);
  }
  ensureApprovalHeader_(users, APPROVAL_USER_HEADERS_);
  ensureApprovalHeader_(approvals, APPROVAL_LOG_HEADERS_);
  return { users: users, approvals: approvals };
}

function ensureApprovalHeader_(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  var current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  var mismatch = headers.some(function(header, index) { return current[index] !== header; });
  if (mismatch) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#202020').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

function createOrUpdateApprovalUser_(sheet, userId, payload) {
  var data = payload || {};
  var email = normalizeApprovalEmail_(data.email);
  var name = String(data.name || '').trim();
  var roleKey = String(data.roleKey || '').trim();
  var role = APPROVAL_ROLES_[roleKey];
  if (!email || email.indexOf('@') < 1) throw new Error('Email pengguna tidak valid.');
  if (!name) throw new Error('Nama lengkap wajib diisi.');
  if (!role) throw new Error('Jabatan pengguna tidak valid.');

  var existingUsers = readApprovalUsers_(sheet);
  var current = userId ? existingUsers.find(function(item) { return item.userId === userId; }) : null;
  var duplicate = existingUsers.find(function(item) { return item.email === email && (!current || item.userId !== current.userId); });
  if (duplicate) throw new Error('Email sudah dipakai oleh akun lain.');

  var password = String(data.password || '');
  if (!current && password.length < 8) throw new Error('Password baru minimal 8 karakter.');
  if (password && password.length < 8) throw new Error('Password minimal 8 karakter.');
  var salt = password ? createApprovalToken_() : current.passwordSalt;
  var hash = password ? hashApprovalPassword_(password, salt) : current.passwordHash;
  var signature = saveApprovalSignature_(data.signatureData, data.signatureName, current);
  var now = new Date();
  var tokenVersion = current ? Number(current.tokenVersion || 1) : 1;
  if (current && (password || current.roleKey !== roleKey || Boolean(current.active) !== Boolean(data.active))) tokenVersion += 1;
  var row = [
    current ? current.userId : Utilities.getUuid(), email, hash, salt, name,
    roleKey, role.label, role.department, data.active === false ? 'TIDAK' : 'YA',
    signature.fileId, signature.url,
    current ? current.createdAt : now, now,
    current ? current.lastLogin : '', tokenVersion
  ];
  var rowNumber = current ? current.rowNumber : sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  return parseApprovalUserRow_(row, rowNumber);
}

function saveApprovalSignature_(dataUrl, fileName, current) {
  if (!dataUrl) return { fileId: current ? current.signatureFileId : '', url: current ? current.signatureUrl : '' };
  var match = String(dataUrl).match(/^data:(image\/(?:png|jpeg|jpg));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('Tanda tangan harus berupa gambar PNG atau JPG.');
  var bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 1000000) throw new Error('Ukuran gambar tanda tangan maksimal 1 MB.');
  var mime = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  var extension = mime === 'image/png' ? '.png' : '.jpg';
  var folder = getApprovalSignatureFolder_();
  var safeName = String(fileName || 'signature').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 60);
  var file = folder.createFile(Utilities.newBlob(bytes, mime, safeName + '-' + Date.now() + extension));
  if (current && current.signatureFileId) {
    try { DriveApp.getFileById(current.signatureFileId).setTrashed(true); } catch (ignore) {}
  }
  return { fileId: file.getId(), url: file.getUrl() };
}

function getApprovalSignatureFolder_() {
  var properties = PropertiesService.getScriptProperties();
  var id = properties.getProperty('SPK_APPROVAL_SIGNATURE_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (ignore) {}
  }
  var folder = DriveApp.createFolder('SPK Approval Signatures');
  properties.setProperty('SPK_APPROVAL_SIGNATURE_FOLDER_ID', folder.getId());
  return folder;
}

function getApprovalSignatureDataUri_(fileId) {
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (error) { return ''; }
}

// Membaca DriveApp satu per satu membuat pratinjau dengan banyak persetujuan
// menunggu setiap file secara berurutan. Drive API diambil paralel lewat
// fetchAll; tanda tangan kecil juga disimpan sementara agar pembukaan berikutnya
// tidak perlu menghubungi Drive lagi.
function getApprovalSignatureDataMap_(fileIds) {
  var ids = [];
  (Array.isArray(fileIds) ? fileIds : []).forEach(function(fileId) {
    var cleanId = String(fileId || '').trim();
    if (cleanId && ids.indexOf(cleanId) === -1) ids.push(cleanId);
  });
  if (!ids.length) return {};

  var result = {};
  var cache = CacheService.getScriptCache();
  var cacheKeys = ids.map(function(fileId) { return 'spk-signature-v2-' + fileId; });
  try {
    var cached = cache.getAll(cacheKeys);
    ids.forEach(function(fileId, index) {
      if (cached[cacheKeys[index]]) result[fileId] = cached[cacheKeys[index]];
    });
  } catch (ignore) {}

  var missing = ids.filter(function(fileId) { return !result[fileId]; });
  if (!missing.length) return result;

  try {
    var token = ScriptApp.getOAuthToken();
    var responses = UrlFetchApp.fetchAll(missing.map(function(fileId) {
      return {
        url: 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media',
        method: 'get',
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true,
        followRedirects: true
      };
    }));

    responses.forEach(function(response, index) {
      var fileId = missing[index];
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return;
      var blob = response.getBlob();
      var mime = blob.getContentType() || 'image/png';
      var dataUri = 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());
      result[fileId] = dataUri;
      // CacheService membatasi satu nilai sekitar 100 KB. File yang lebih
      // besar tetap dikembalikan dengan benar, hanya tidak disimpan.
      if (dataUri.length < 95000) {
        try { cache.put('spk-signature-v2-' + fileId, dataUri, 21600); } catch (ignore) {}
      }
    });
  } catch (ignore) {}

  // Jaga kompatibilitas bila Drive API sementara gagal atau izin token belum
  // diperbarui: hanya file yang belum berhasil yang memakai jalur lama.
  missing.forEach(function(fileId) {
    if (!result[fileId]) result[fileId] = getApprovalSignatureDataUri_(fileId);
  });
  return result;
}

function readApprovalUsers_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, APPROVAL_USER_HEADERS_.length).getValues().map(function(row, index) {
    return parseApprovalUserRow_(row, index + 2);
  }).filter(function(user) { return Boolean(user.userId); });
}

function parseApprovalUserRow_(row, rowNumber) {
  return {
    rowNumber: rowNumber, userId: String(row[0] || ''), email: normalizeApprovalEmail_(row[1]),
    passwordHash: String(row[2] || ''), passwordSalt: String(row[3] || ''),
    name: String(row[4] || ''), roleKey: String(row[5] || ''), roleLabel: String(row[6] || ''),
    department: String(row[7] || ''), active: String(row[8] || '').toUpperCase() === 'YA',
    signatureFileId: String(row[9] || ''), signatureUrl: String(row[10] || ''),
    createdAt: row[11], updatedAt: row[12], lastLogin: row[13], tokenVersion: Number(row[14] || 1)
  };
}

function sanitizeApprovalUser_(user) {
  return {
    userId: user.userId, email: user.email, name: user.name,
    roleKey: user.roleKey, roleLabel: user.roleLabel, department: user.department,
    active: user.active, signatureReady: Boolean(user.signatureFileId),
    signatureUrl: user.signatureUrl, lastLogin: approvalDateText_(user.lastLogin)
  };
}

function findApprovalUserByEmail_(sheet, email) {
  return readApprovalUsers_(sheet).find(function(user) { return user.email === email; }) || null;
}

function getApprovalUserById_(userId) {
  return readApprovalUsers_(ensureApprovalSheets_().users).find(function(user) { return user.userId === userId; }) || null;
}

function readApprovalRows_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, APPROVAL_LOG_HEADERS_.length).getValues().map(function(row, index) {
    return parseApprovalRow_(row, index + 2);
  }).filter(function(item) { return Boolean(item.spk); });
}

function readApprovalRowsForSpk_(sheet, spk) {
  var key = normalizeSpk_(spk);
  var lastRow = sheet.getLastRow();
  if (!key || lastRow < 2) return [];

  var matches = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(key)
    .matchEntireCell(true)
    .matchCase(false)
    .useRegularExpression(false)
    .findAll();
  if (!matches.length) return [];

  var rowNumbers = matches.map(function(match) { return match.getRow(); });
  var firstRow = Math.min.apply(null, rowNumbers);
  var finalRow = Math.max.apply(null, rowNumbers);
  return sheet
    .getRange(firstRow, 1, finalRow - firstRow + 1, APPROVAL_LOG_HEADERS_.length)
    .getValues()
    .map(function(row, index) { return parseApprovalRow_(row, firstRow + index); })
    .filter(function(item) { return item.spk === key; });
}

function parseApprovalRow_(row, rowNumber) {
  return {
    rowNumber: rowNumber, spk: normalizeSpk_(row[0]), roleKey: String(row[1] || ''),
    roleLabel: String(row[2] || ''), department: String(row[3] || ''), status: String(row[4] || 'MENUNGGU'),
    signerUserId: String(row[5] || ''), signerName: String(row[6] || ''), signerEmail: String(row[7] || ''),
    signedAt: row[8], signatureFileId: String(row[9] || ''), signatureUrl: String(row[10] || ''),
    createdAt: row[11], updatedAt: row[12], creatorUserId: String(row[13] || ''), dbRow: Number(row[14] || 0)
  };
}

function getApprovalSpkDetails_(spkKeys) {
  var keys = Object.keys(spkKeys || {});
  if (!keys.length) return {};
  var result = {};
  keys.forEach(function(key) {
    var aggregate = readDatabaseV2Spk_(key);
    if (!aggregate) return;
    result[key] = {
      customer: valueOrEmpty_(aggregate.master.Customer),
      article: valueOrEmpty_(aggregate.master.Artikel),
      orderDate: dateToInput_(aggregate.master.Tanggal),
      routing: aggregate.routing.map(function(route) {
        return String(route['Kode Proses'] || '').trim().toLowerCase();
      }).filter(Boolean)
    };
  });
  return result;
}

function getApprovalRoleOptions_() {
  return Object.keys(APPROVAL_ROLES_).map(function(key) {
    return { key: key, label: APPROVAL_ROLES_[key].label, department: APPROVAL_ROLES_[key].department };
  });
}

function normalizeApprovalEmail_(email) { return String(email || '').trim().toLowerCase(); }

function getApprovalPepper_() {
  var properties = PropertiesService.getScriptProperties();
  var pepper = properties.getProperty('SPK_APPROVAL_PASSWORD_PEPPER');
  if (!pepper) {
    pepper = createApprovalToken_() + createApprovalToken_();
    properties.setProperty('SPK_APPROVAL_PASSWORD_PEPPER', pepper);
  }
  return pepper;
}

function hashApprovalPassword_(password, salt) {
  var bytes = Utilities.computeHmacSha256Signature(String(password) + ':' + String(salt), getApprovalPepper_());
  return Utilities.base64EncodeWebSafe(bytes);
}

function approvalConstantTimeEqual_(a, b) {
  var left = String(a || ''), right = String(b || '');
  var diff = left.length ^ right.length;
  var length = Math.max(left.length, right.length);
  for (var index = 0; index < length; index += 1) diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return diff === 0;
}

function createApprovalToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }

function approvalSessionKey_(token) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token || ''));
  return APPROVAL_SESSION_PREFIX_ + Utilities.base64EncodeWebSafe(digest).slice(0, 40);
}

function approvalDateText_(value) {
  if (!value) return '';
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
