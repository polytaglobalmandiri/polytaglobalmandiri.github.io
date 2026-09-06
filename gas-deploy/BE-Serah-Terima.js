// Pencatatan penurunan SPK dari PPIC kepada penerima di setiap divisi.
// Satu baris mewakili satu routing/divisi dan dapat memuat beberapa nomor SPK.
var HANDOVER_SHEET_NAME_ = 'Serah Terima SPK';
var HANDOVER_FOLDER_NAME_ = 'Bukti Serah Terima SPK';
var HANDOVER_FOLDER_PROPERTY_ = 'ppic-handover-proof-folder-id';
var HANDOVER_HEADERS_ = [
  'ID SERAH TERIMA',
  'WAKTU SERAH TERIMA',
  'NAMA PENERIMA',
  'DAFTAR SPK',
  'JUMLAH SPK',
  'CATATAN',
  'ID FOTO',
  'TAUTAN FOTO',
  'ID TANDA TANGAN',
  'TAUTAN TANDA TANGAN',
  'DIBUAT OLEH',
  'KODE ROUTING',
  'NAMA DIVISI'
];
var HANDOVER_HISTORY_LIMIT_ = 30;
var HANDOVER_MAX_SPK_ = 50;
var HANDOVER_MAX_GROUPS_ = 7;
var HANDOVER_ROUTE_ORDER_ = [
  'mixer', 'blowing', 'printing', 'folding', 'slitting', 'gusset', 'cutting'
];
var HANDOVER_ROUTE_LABELS_ = {
  mixer: 'Mixer',
  blowing: 'Blowing',
  printing: 'Printing',
  folding: 'Folding',
  slitting: 'Slitting',
  gusset: 'Gusset',
  cutting: 'Cutting'
};

// Ringkasan ringan untuk halaman Serah Terima. Daftar ribuan SPK tidak lagi
// dikirim saat halaman dibuka; rincian satu SPK baru diambil setelah dipindai.
function getHandoverOverview() {
  var sheet = ensureHandoverSheet_();
  var allHistory = readHandoverHistory_(sheet, 0);
  var routeMap = buildHandedSpkRouteMap_(sheet);
  var totalSpks = 0;
  try {
    totalSpks = getDatabaseV2SpkDirectory_().spks.length;
  } catch (error) {}

  return {
    status: 'success',
    data: {
      history: allHistory.slice(0, HANDOVER_HISTORY_LIMIT_),
      summary: {
        tersedia: totalSpks,
        sudahDiserahkan: Object.keys(routeMap).filter(function(key) {
          return key.slice(-2) !== '|*';
        }).length,
        transaksi: allHistory.length
      }
    }
  };
}

function getHandoverSpkDetails(spk) {
  var result = getSpkData(spk);
  if (!result || result.status !== 'success' || !result.found || !result.data) {
    return {
      status: result && result.status ? result.status : 'not_found',
      found: false,
      message: result && result.message ? result.message : 'SPK tidak ditemukan.'
    };
  }

  var data = result.data;
  var normalizedSpk = normalizeHandoverSpk_(data.spk);
  var handed = buildHandedSpkRouteMap_(ensureHandoverSheet_());
  var wildcardKey = makeHandoverRouteKey_(normalizedSpk, '*');
  var routings = extractHandoverRouting_(data).map(function(route) {
    var routeKey = makeHandoverRouteKey_(normalizedSpk, route.key);
    var handoverId = handed[routeKey] || handed[wildcardKey] || '';
    return {
      key: route.key,
      label: route.label,
      sudahDiserahkan: Boolean(handoverId),
      idSerahTerima: handoverId
    };
  });

  return {
    status: 'success',
    found: true,
    data: {
      spk: normalizedSpk,
      tanggal: String(data.tanggal || ''),
      pelanggan: String(data.customer || ''),
      artikel: String(data.artikel || ''),
      bahan: String(data.material || ''),
      jumlah: data.jumlahOrder === null || data.jumlahOrder === undefined
        ? ''
        : String(data.jumlahOrder),
      uom: String(data.uomOrder || ''),
      routings: routings
    }
  };
}

function getHandoverPageData() {
  var dashboard = getDashboardData(false);
  if (!dashboard || dashboard.error) {
    return {
      status: 'error',
      message: dashboard && dashboard.error
        ? String(dashboard.error)
        : 'Data SPK belum dapat dimuat.'
    };
  }

  var sheet = ensureHandoverSheet_();
  var allHistory = readHandoverHistory_(sheet, 0);
  var handedSpks = {};
  allHistory.forEach(function(record) {
    record.spks.forEach(function(spk) {
      handedSpks[normalizeHandoverSpk_(spk)] = record.id;
    });
  });

  var rows = Array.isArray(dashboard.tableData) ? dashboard.tableData : [];
  var spks = rows.map(function(row) {
    var normalized = normalizeHandoverSpk_(row[0]);
    return {
      spk: String(row[0] || '').trim(),
      tanggal: String(row[1] || '').trim(),
      jenisPesanan: String(row[2] || '').trim(),
      pemasaran: String(row[3] || '').trim(),
      pelanggan: String(row[4] || '').trim(),
      artikel: String(row[5] || '').trim(),
      ukuran: String(row[6] || '').trim(),
      bahan: String(row[7] || '').trim(),
      jumlah: row[8] === null || row[8] === undefined ? '' : String(row[8]),
      uom: String(row[9] || '').trim(),
      keadaan: String(row[10] || '').trim(),
      sudahDiserahkan: Boolean(handedSpks[normalized]),
      idSerahTerima: handedSpks[normalized] || ''
    };
  }).filter(function(item) {
    return Boolean(item.spk);
  });

  return {
    status: 'success',
    data: {
      spks: spks,
      history: allHistory.slice(0, HANDOVER_HISTORY_LIMIT_),
      summary: {
        tersedia: spks.filter(function(item) { return !item.sudahDiserahkan; }).length,
        sudahDiserahkan: Object.keys(handedSpks).length,
        transaksi: allHistory.length
      }
    }
  };
}

function saveHandover(payload) {
  var safe = validateHandoverPayload_(payload);
  var dashboard = getDashboardData(false);
  if (!dashboard || dashboard.error) {
    throw new Error('Basis data SPK belum dapat diperiksa. Silakan coba kembali.');
  }

  var existingSpks = {};
  (dashboard.tableData || []).forEach(function(row) {
    existingSpks[normalizeHandoverSpk_(row[0])] = true;
  });
  var missing = safe.spks.filter(function(spk) { return !existingSpks[spk]; });
  if (missing.length) {
    throw new Error('SPK tidak ditemukan dalam basis data: ' + missing.join(', '));
  }

  var photoProof = decodeHandoverImage_(safe.photo, 'foto', 2500000);
  var signatureProof = decodeHandoverImage_(safe.signature, 'tanda tangan', 900000);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  var photoFile = null;
  var signatureFile = null;
  try {
    var sheet = ensureHandoverSheet_();
    var handed = buildHandedSpkMap_(sheet);
    var duplicate = safe.spks.filter(function(spk) { return Boolean(handed[spk]); });
    if (duplicate.length) {
      throw new Error('SPK sudah pernah diserahterimakan: ' + duplicate.join(', '));
    }

    var now = new Date();
    var id = createHandoverId_(now);
    var folder = getHandoverProofFolder_();
    photoFile = folder.createFile(photoProof.blob.setName(id + '-foto.' + photoProof.extension));
    signatureFile = folder.createFile(signatureProof.blob.setName(id + '-ttd.' + signatureProof.extension));

    var actor = '';
    try {
      actor = Session.getEffectiveUser().getEmail() || '';
    } catch (error) {}

    sheet.appendRow([
      id,
      now,
      safe.recipient,
      safe.spks.join('\n'),
      safe.spks.length,
      safe.notes,
      photoFile.getId(),
      photoFile.getUrl(),
      signatureFile.getId(),
      signatureFile.getUrl(),
      actor,
      '',
      ''
    ]);
    sheet.getRange(sheet.getLastRow(), 2).setNumberFormat('dd-mmm-yyyy hh:mm:ss');
    SpreadsheetApp.flush();

    return {
      status: 'success',
      message: safe.spks.length + ' SPK berhasil diserahterimakan.',
      record: {
        id: id,
        waktu: Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm'),
        penerima: safe.recipient,
        spks: safe.spks,
        jumlahSpk: safe.spks.length,
        catatan: safe.notes,
        fotoUrl: photoFile.getUrl(),
        tandaTanganUrl: signatureFile.getUrl()
      }
    };
  } catch (error) {
    if (photoFile) {
      try { photoFile.setTrashed(true); } catch (ignoredPhotoError) {}
    }
    if (signatureFile) {
      try { signatureFile.setTrashed(true); } catch (ignoredSignatureError) {}
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function saveHandoverByRouting(payload) {
  var groups = validateHandoverRoutingPayload_(payload);
  var spkDetails = {};

  groups.forEach(function(group) {
    group.spks.forEach(function(spk) {
      if (spkDetails[spk]) return;
      var result = getSpkData(spk);
      if (!result || result.status !== 'success' || !result.found || !result.data) {
        throw new Error('SPK tidak ditemukan dalam basis data: ' + spk);
      }
      spkDetails[spk] = result.data;
    });
  });

  groups.forEach(function(group) {
    var invalid = group.spks.filter(function(spk) {
      return !extractHandoverRouting_(spkDetails[spk]).some(function(route) {
        return route.key === group.routing;
      });
    });
    if (invalid.length) {
      throw new Error(
        'Routing ' + group.routingLabel + ' tidak tercatat pada SPK: ' + invalid.join(', ')
      );
    }
  });

  var proofs = groups.map(function(group) {
    return {
      photo: group.photo ? decodeHandoverImage_(group.photo, 'foto ' + group.routingLabel, 2500000) : null,
      signature: group.signature
        ? decodeHandoverImage_(group.signature, 'tanda tangan ' + group.routingLabel, 900000)
        : null
    };
  });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var createdFiles = [];
  try {
    var sheet = ensureHandoverSheet_();
    var handed = buildHandedSpkRouteMap_(sheet);
    var duplicate = [];
    groups.forEach(function(group) {
      group.spks.forEach(function(spk) {
        if (handed[makeHandoverRouteKey_(spk, group.routing)] ||
            handed[makeHandoverRouteKey_(spk, '*')]) {
          duplicate.push(spk + ' (' + group.routingLabel + ')');
        }
      });
    });
    if (duplicate.length) {
      throw new Error('Routing SPK sudah pernah diserahterimakan: ' + duplicate.join(', '));
    }

    var folder = getHandoverProofFolder_();
    var actor = '';
    try {
      actor = Session.getEffectiveUser().getEmail() || '';
    } catch (error) {}

    var records = [];
    var rows = groups.map(function(group, index) {
      var now = new Date();
      var id = createHandoverId_(now);
      var proof = proofs[index];
      var photoFile = proof.photo
        ? folder.createFile(proof.photo.blob.setName(
          id + '-' + group.routing + '-foto.' + proof.photo.extension
        ))
        : null;
      var signatureFile = proof.signature
        ? folder.createFile(proof.signature.blob.setName(
          id + '-' + group.routing + '-ttd.' + proof.signature.extension
        ))
        : null;
      if (photoFile) createdFiles.push(photoFile);
      if (signatureFile) createdFiles.push(signatureFile);

      var record = {
        id: id,
        waktu: Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm'),
        penerima: group.recipient,
        spks: group.spks,
        jumlahSpk: group.spks.length,
        catatan: group.notes,
        fotoUrl: photoFile ? photoFile.getUrl() : '',
        tandaTanganUrl: signatureFile ? signatureFile.getUrl() : '',
        routing: group.routing,
        routingLabel: group.routingLabel
      };
      records.push(record);
      return [
        id,
        now,
        group.recipient,
        group.spks.join('\n'),
        group.spks.length,
        group.notes,
        photoFile ? photoFile.getId() : '',
        photoFile ? photoFile.getUrl() : '',
        signatureFile ? signatureFile.getId() : '',
        signatureFile ? signatureFile.getUrl() : '',
        actor,
        group.routing,
        group.routingLabel
      ];
    });

    var firstRow = sheet.getLastRow() + 1;
    sheet.getRange(firstRow, 1, rows.length, HANDOVER_HEADERS_.length).setValues(rows);
    sheet.getRange(firstRow, 2, rows.length, 1).setNumberFormat('dd-mmm-yyyy hh:mm:ss');
    SpreadsheetApp.flush();

    return {
      status: 'success',
      message: groups.length + ' routing berhasil diserahterimakan.',
      records: records
    };
  } catch (error) {
    createdFiles.forEach(function(file) {
      try { file.setTrashed(true); } catch (ignoredFileError) {}
    });
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function adminPastikanDatabaseSerahTerima() {
  var sheet = ensureHandoverSheet_();
  return {
    status: 'success',
    sheet: sheet.getName(),
    columns: HANDOVER_HEADERS_.length,
    headers: HANDOVER_HEADERS_.slice()
  };
}

function ensureHandoverSheet_() {
  var spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(HANDOVER_SHEET_NAME_);
  if (!sheet) {
    try {
      sheet = spreadsheet.insertSheet(HANDOVER_SHEET_NAME_);
    } catch (error) {
      sheet = spreadsheet.getSheetByName(HANDOVER_SHEET_NAME_);
      if (!sheet) throw error;
    }
  }

  if (sheet.getMaxColumns() < HANDOVER_HEADERS_.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      HANDOVER_HEADERS_.length - sheet.getMaxColumns()
    );
  }

  var current = sheet.getRange(1, 1, 1, HANDOVER_HEADERS_.length).getDisplayValues()[0];
  var needsHeader = HANDOVER_HEADERS_.some(function(header, index) {
    return String(current[index] || '').trim() !== header;
  });
  if (needsHeader) {
    sheet.getRange(1, 1, 1, HANDOVER_HEADERS_.length).setValues([HANDOVER_HEADERS_]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HANDOVER_HEADERS_.length)
      .setFontWeight('bold')
      .setBackground('#202327')
      .setFontColor('#ffffff');
    sheet.autoResizeColumns(1, HANDOVER_HEADERS_.length);
  }
  return sheet;
}

function readHandoverHistory_(sheet, limit) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var count = lastRow - 1;
  var rows = sheet.getRange(2, 1, count, HANDOVER_HEADERS_.length).getValues();
  var timeZone = Session.getScriptTimeZone();
  var records = rows.map(function(row) {
    var timestamp = row[1];
    return {
      id: String(row[0] || ''),
      waktu: timestamp instanceof Date
        ? Utilities.formatDate(timestamp, timeZone, 'dd-MM-yyyy HH:mm')
        : String(timestamp || ''),
      penerima: String(row[2] || ''),
      spks: parseHandoverSpkCell_(row[3]),
      jumlahSpk: Number(row[4]) || 0,
      catatan: String(row[5] || ''),
      fotoUrl: String(row[7] || ''),
      tandaTanganUrl: String(row[9] || ''),
      routing: normalizeHandoverRoute_(row[11]),
      routingLabel: String(row[12] || '')
    };
  }).filter(function(record) {
    return Boolean(record.id);
  }).reverse();

  return limit > 0 ? records.slice(0, limit) : records;
}

function buildHandedSpkMap_(sheet) {
  var map = {};
  readHandoverHistory_(sheet, 0).forEach(function(record) {
    record.spks.forEach(function(spk) {
      map[normalizeHandoverSpk_(spk)] = record.id;
    });
  });
  return map;
}

function buildHandedSpkRouteMap_(sheet) {
  var map = {};
  readHandoverHistory_(sheet, 0).forEach(function(record) {
    var route = normalizeHandoverRoute_(record.routing) || '*';
    record.spks.forEach(function(spk) {
      map[makeHandoverRouteKey_(spk, route)] = record.id;
    });
  });
  return map;
}

function makeHandoverRouteKey_(spk, routing) {
  return normalizeHandoverSpk_(spk) + '|' + (normalizeHandoverRoute_(routing) || '*');
}

function normalizeHandoverRoute_(value) {
  var key = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(HANDOVER_ROUTE_LABELS_, key) ? key : '';
}

function extractHandoverRouting_(data) {
  var found = {};
  var result = [];
  var add = function(value) {
    var key = normalizeHandoverRoute_(value);
    if (!key || found[key]) return;
    found[key] = true;
    result.push({ key: key, label: HANDOVER_ROUTE_LABELS_[key] });
  };

  var steps = data && Array.isArray(data.routingSteps) ? data.routingSteps : [];
  steps.forEach(function(step) {
    add(step && step.key);
  });
  if (result.length) return result;

  var process = data && data.proses && typeof data.proses === 'object' ? data.proses : {};
  HANDOVER_ROUTE_ORDER_.forEach(function(key) {
    if (key !== 'cutting' && process[key]) add(key);
  });
  var finishing = String(data && data.finishing || '').trim().toUpperCase();
  var handle = String(data && data.handlePm || '').trim().toUpperCase();
  if (process.cutting || process.bottomSeal || process.sideSeal || process.tshirt ||
      (finishing && finishing !== '-') || (handle && handle !== '-')) {
    add('cutting');
  }
  return result;
}

function parseHandoverSpkCell_(value) {
  return String(value || '').split(/[\n,;]+/).map(normalizeHandoverSpk_).filter(Boolean);
}

function normalizeHandoverSpk_(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function validateHandoverPayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Data serah terima tidak valid.');
  }
  var recipient = String(payload.recipient || '').trim().replace(/\s+/g, ' ');
  if (recipient.length < 2 || recipient.length > 100) {
    throw new Error('Nama penerima harus terdiri dari 2 sampai 100 karakter.');
  }

  var seen = {};
  var spks = (Array.isArray(payload.spks) ? payload.spks : [])
    .map(normalizeHandoverSpk_)
    .filter(function(spk) {
      if (!spk || seen[spk]) return false;
      seen[spk] = true;
      return true;
    });
  if (!spks.length) throw new Error('Pilih setidaknya satu SPK.');
  if (spks.length > HANDOVER_MAX_SPK_) {
    throw new Error('Maksimal ' + HANDOVER_MAX_SPK_ + ' SPK dalam satu transaksi.');
  }

  var notes = String(payload.notes || '').trim();
  if (notes.length > 500) throw new Error('Catatan maksimal 500 karakter.');
  return {
    recipient: recipient,
    spks: spks,
    notes: notes,
    photo: String(payload.photo || ''),
    signature: String(payload.signature || '')
  };
}

function validateHandoverRoutingPayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Data serah terima per routing tidak valid.');
  }
  var sourceGroups = Array.isArray(payload.groups) ? payload.groups : [];
  if (!sourceGroups.length) throw new Error('Belum ada routing yang akan diserahterimakan.');
  if (sourceGroups.length > HANDOVER_MAX_GROUPS_) {
    throw new Error('Maksimal ' + HANDOVER_MAX_GROUPS_ + ' routing dalam satu transaksi.');
  }

  var seenRoutes = {};
  return sourceGroups.map(function(source) {
    var routing = normalizeHandoverRoute_(source && source.routing);
    if (!routing || seenRoutes[routing]) {
      throw new Error('Daftar routing tidak valid atau berulang.');
    }
    seenRoutes[routing] = true;

    var recipient = String(source.recipient || '').trim().replace(/\s+/g, ' ');
    if (recipient.length < 2 || recipient.length > 100) {
      throw new Error('Nama penerima ' + HANDOVER_ROUTE_LABELS_[routing] +
        ' harus terdiri dari 2 sampai 100 karakter.');
    }

    var seenSpks = {};
    var spks = (Array.isArray(source.spks) ? source.spks : [])
      .map(normalizeHandoverSpk_)
      .filter(function(spk) {
        if (!spk || seenSpks[spk]) return false;
        seenSpks[spk] = true;
        return true;
      });
    if (!spks.length) {
      throw new Error('Routing ' + HANDOVER_ROUTE_LABELS_[routing] + ' belum memiliki SPK.');
    }
    if (spks.length > HANDOVER_MAX_SPK_) {
      throw new Error('Maksimal ' + HANDOVER_MAX_SPK_ + ' SPK pada satu routing.');
    }

    var notes = String(source.notes || '').trim();
    if (notes.length > 500) throw new Error('Catatan maksimal 500 karakter.');
    var photo = String(source.photo || '');
    var signature = String(source.signature || '');
    if (!photo && !signature) {
      throw new Error('Isi foto atau tanda tangan untuk routing ' + HANDOVER_ROUTE_LABELS_[routing] + '.');
    }
    return {
      routing: routing,
      routingLabel: HANDOVER_ROUTE_LABELS_[routing],
      recipient: recipient,
      spks: spks,
      notes: notes,
      photo: photo,
      signature: signature
    };
  });
}

function decodeHandoverImage_(dataUrl, label, maxBytes) {
  var match = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Bukti ' + label + ' belum diisi atau formatnya tidak didukung.');
  var bytes = Utilities.base64Decode(match[2]);
  if (!bytes.length || bytes.length > maxBytes) {
    throw new Error('Ukuran bukti ' + label + ' terlalu besar. Ambil gambar ulang.');
  }
  var extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
  return {
    extension: extension,
    blob: Utilities.newBlob(bytes, match[1])
  };
}

function getHandoverProofFolder_() {
  var properties = PropertiesService.getScriptProperties();
  var folderId = properties.getProperty(HANDOVER_FOLDER_PROPERTY_);
  if (folderId) {
    try {
      var existing = DriveApp.getFolderById(folderId);
      if (!existing.isTrashed()) return existing;
    } catch (error) {}
  }

  var folders = DriveApp.getFoldersByName(HANDOVER_FOLDER_NAME_);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(HANDOVER_FOLDER_NAME_);
  properties.setProperty(HANDOVER_FOLDER_PROPERTY_, folder.getId());
  return folder;
}

function createHandoverId_(date) {
  return 'ST-' + Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyyMMdd-HHmmss'
  ) + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
}
