var SPK_DOCUMENT_FOLDER_ID_ = '1uRVimiSIL990zmofshKCZ2rwjpKa8fmq';
var SPK_DOCUMENT_MAX_BYTES_ = 10 * 1024 * 1024;
var SPK_DOCUMENT_TYPES_ = ['PO', 'PHJ', 'TDS'];
var SPK_DOCUMENT_FORMATS_ = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function requireSpkDocumentAccess_(authToken, method, spk) {
  requireSpkRpcAccess_({ authToken: authToken }, method);
  var key = normalizeSpk_(spk);
  if (!key || key.length > 100 || /[\u0000-\u001f\\/]/.test(key)) {
    throw new Error('Nomor SPK tidak valid.');
  }
  if (!readDatabaseV2Spk_(key)) throw new Error('SPK tidak ditemukan di Database V2.');
  return key;
}

function getSpkDocumentFolder_(parent, name, create) {
  var folders = parent.getFoldersByName(name);
  while (folders.hasNext()) {
    var folder = folders.next();
    if (!folder.isTrashed()) return folder;
  }
  return create ? parent.createFolder(name) : null;
}

function spkDocumentMetadata_(file) {
  var description = file.getDescription();
  if (!description) throw new Error('Metadata dokumen tidak tersedia: ' + file.getName());
  var metadata = JSON.parse(description);
  if (metadata.schema !== 'spk-document-v1') {
    throw new Error('Metadata dokumen tidak dikenali: ' + file.getName());
  }
  return metadata;
}

function spkDocumentResult_(file, type, metadata) {
  return {
    fileId: file.getId(),
    type: type,
    name: file.getName(),
    size: file.getSize(),
    mimeType: file.getMimeType(),
    url: file.getUrl(),
    uploadedAt: file.getDateCreated().toISOString(),
    uploadedBy: metadata.uploadedBy
  };
}

function getSpkDocuments(authToken, spk) {
  var key = requireSpkDocumentAccess_(authToken, 'getSpkDocuments', spk);
  var root = DriveApp.getFolderById(SPK_DOCUMENT_FOLDER_ID_);
  var folder = getSpkDocumentFolder_(root, key, false);
  var documents = [];
  if (folder) {
    SPK_DOCUMENT_TYPES_.forEach(function(type) {
      var category = getSpkDocumentFolder_(folder, type, false);
      if (!category) return;
      var files = category.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (!file.isTrashed()) documents.push(spkDocumentResult_(file, type, spkDocumentMetadata_(file)));
      }
    });
  }
  documents.sort(function(a, b) { return b.uploadedAt.localeCompare(a.uploadedAt); });
  return { status: 'success', spk: key, documents: documents };
}

function decodeSpkDocument_(payload) {
  if (!payload || SPK_DOCUMENT_TYPES_.indexOf(payload.type) === -1) {
    throw new Error('Pilih jenis dokumen PO, PHJ, atau TDS.');
  }
  var name = String(payload.name || '').trim();
  if (!name || name.length > 180 || /[\u0000-\u001f\\/]/.test(name)) {
    throw new Error('Nama file tidak valid atau melebihi 180 karakter.');
  }
  var extension = name.split('.').pop().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SPK_DOCUMENT_FORMATS_, extension)) {
    throw new Error('Format file harus PDF, JPG/PNG, Word (DOC/DOCX), atau Excel (XLS/XLSX).');
  }
  var uploadId = String(payload.uploadId || '');
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(uploadId)) throw new Error('ID upload tidak valid.');
  var encoded = String(payload.base64 || '');
  if (!encoded || encoded.length % 4 !== 0 ||
      encoded.length > 4 * Math.ceil(SPK_DOCUMENT_MAX_BYTES_ / 3) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new Error('Isi file tidak valid atau melebihi 10 MB.');
  }
  var bytes = Utilities.base64Decode(encoded);
  if (!bytes.length || bytes.length > SPK_DOCUMENT_MAX_BYTES_) {
    throw new Error('File harus berisi data dan maksimal 10 MB.');
  }
  var signatures = {
    pdf: [37, 80, 68, 70, 45],
    jpg: [255, 216, 255],
    jpeg: [255, 216, 255],
    png: [137, 80, 78, 71, 13, 10, 26, 10],
    doc: [208, 207, 17, 224, 161, 177, 26, 225],
    xls: [208, 207, 17, 224, 161, 177, 26, 225],
    docx: [80, 75, 3, 4],
    xlsx: [80, 75, 3, 4]
  };
  if (!signatures[extension].every(function(value, index) { return (bytes[index] & 255) === value; })) {
    throw new Error('Isi file tidak sesuai dengan format ' + extension.toUpperCase() + '.');
  }
  return {
    name: name,
    type: payload.type,
    uploadId: uploadId,
    size: bytes.length,
    hash: Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)),
    blob: Utilities.newBlob(bytes, SPK_DOCUMENT_FORMATS_[extension], name)
  };
}

function saveSpkDocument(authToken, spk, payload) {
  var key = requireSpkDocumentAccess_(authToken, 'saveSpkDocument', spk);
  var session = requireApprovalSession_(authToken);
  var document = decodeSpkDocument_(payload);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var root = DriveApp.getFolderById(SPK_DOCUMENT_FOLDER_ID_);
    if (root.isTrashed()) throw new Error('Folder penyimpanan dokumen sudah dihapus.');
    var folder = getSpkDocumentFolder_(root, key, true);
    var category = getSpkDocumentFolder_(folder, document.type, true);
    var files = category.getFiles();
    while (files.hasNext()) {
      var existing = files.next();
      if (existing.isTrashed()) continue;
      var metadata = spkDocumentMetadata_(existing);
      if (metadata.uploadId !== document.uploadId) continue;
      if (metadata.hash !== document.hash || existing.getName() !== document.name) {
        throw new Error('ID upload sudah digunakan untuk file yang berbeda.');
      }
      return { status: 'success', document: spkDocumentResult_(existing, document.type, metadata) };
    }
    var description = {
      schema: 'spk-document-v1',
      uploadId: document.uploadId,
      hash: document.hash,
      uploadedBy: String(session.name || session.email || session.userId)
    };
    // Metadata dan isi dibuat atomik agar retry setelah respons terputus tidak menggandakan file.
    var created = Drive.Files.create({
      name: document.name,
      parents: [category.getId()],
      description: JSON.stringify(description)
    }, document.blob, { fields: 'id' });
    return {
      status: 'success',
      document: spkDocumentResult_(DriveApp.getFileById(created.id), document.type, description)
    };
  } finally {
    lock.releaseLock();
  }
}
