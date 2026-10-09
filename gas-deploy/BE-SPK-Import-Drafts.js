var SPK_IMPORT_DRAFT_ROOT_KEY_ = 'SPK_IMPORT_DRAFT_ROOT_FOLDER_ID';
var SPK_IMPORT_DRAFT_MANIFEST_ = 'batch.json';

function spkImportDraftSession_(token) {
  var session = requireApprovalSession_(token, ['admin_ppic']);
  if (!session.userId) throw new Error('Identitas pembuat draft tidak tersedia.');
  return session;
}

function spkImportDraftId_(batchId) {
  var id = String(batchId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('ID batch harus UUID yang valid.');
  }
  return id.toLowerCase();
}

function spkImportDraftCode_(code) {
  var value = String(code || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(value) ||
      /\.\.|\/\//.test(value) || /\/$/.test(value)) throw new Error('Kode item tidak valid.');
  return value;
}

function spkImportDraftName_(name) {
  var value = String(name || '').trim();
  if (!value || value.length > 180 || value === '.' || value === '..' ||
      /[\u0000-\u001f\u007f\\/:]/.test(value) || /\.\./.test(value)) {
    throw new Error('Nama file atau item tidak valid.');
  }
  return value;
}

function spkImportDraftItemName_(name) {
  var value = String(name || '').trim();
  if (!value || value.length > 180 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('Nama item draft tidak valid.');
  }
  return value;
}

function spkImportDraftDescriptor_(file) {
  if (!file || !Number.isInteger(file.index) || file.index < 0 || file.index > 4 ||
      !Array.isArray(file.types) || !file.types.length || file.types.length > 3) {
    throw new Error('Deskripsi file draft tidak valid.');
  }
  var types = file.types.slice();
  if (types.some(function(type, i) {
    return SPK_DOCUMENT_TYPES_.indexOf(type) === -1 || types.indexOf(type) !== i;
  })) throw new Error('Kategori file draft tidak valid.');
  var name = spkImportDraftName_(file.name);
  if (!/^(pdf|png|jpe?g)$/i.test(name.split('.').pop())) {
    throw new Error('File draft harus PDF, PNG, atau JPEG.');
  }
  if (!Number.isInteger(file.size) || file.size < 1 || file.size > SPK_DOCUMENT_MAX_BYTES_) {
    throw new Error('Ukuran file draft harus 1 byte sampai 10 MB.');
  }
  var hash = String(file.hash || '');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(hash) ||
      Utilities.base64Encode(Utilities.base64Decode(hash)) !== hash) {
    throw new Error('SHA-256 file draft tidak valid.');
  }
  return { index: file.index, name: name, types: types, size: file.size, hash: hash, uploaded: false };
}

function spkImportDraftFields_(fields) {
  if (!Array.isArray(fields) || fields.length > 40) throw new Error('Kolom item draft harus berupa array (maksimal 40).');
  var ids = {};
  var copy = fields.map(function(field) {
    if (!field || Array.isArray(field) || typeof field !== 'object' ||
        typeof field.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(field.id) ||
        ids[field.id]) throw new Error('ID kolom draft tidak valid atau berulang.');
    ids[field.id] = true;
    function text(value, label, limit) {
      if (typeof value !== 'string' || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
        throw new Error(label + ' draft tidak valid atau terlalu panjang.');
      }
      return value;
    }
    function source(value) {
      if (SPK_DOCUMENT_TYPES_.indexOf(value) === -1) throw new Error('Sumber kolom draft tidak valid.');
      return value;
    }
    if (typeof field.conflict !== 'boolean' || typeof field.needsReview !== 'boolean' ||
        !Array.isArray(field.alternatives) || field.alternatives.length > 20) {
      throw new Error('Status peninjauan kolom draft tidak valid.');
    }
    return {
      id: field.id,
      label: text(field.label, 'Label kolom', 160),
      value: text(field.value, 'Nilai kolom', 1000),
      source: source(field.source),
      page: text(field.page, 'Halaman kolom', 300),
      conflict: field.conflict,
      needsReview: field.needsReview,
      preferredSource: source(field.preferredSource),
      alternatives: field.alternatives.map(function(alternative) {
        if (!alternative || typeof alternative !== 'object' || Array.isArray(alternative)) {
          throw new Error('Alternatif kolom draft tidak valid.');
        }
        return { value: text(alternative.value, 'Nilai alternatif', 1000),
          source: source(alternative.source), page: text(alternative.page, 'Halaman alternatif', 300) };
      })
    };
  });
  if (JSON.stringify(copy).length > 60000) throw new Error('Data item draft terlalu besar.');
  return copy;
}

function spkImportDraftIssues_(issues) {
  if (issues === undefined) return [];
  if (!Array.isArray(issues) || issues.length > 50) throw new Error('Peringatan OCR draft tidak valid.');
  return issues.map(function(issue) {
    if (typeof issue !== 'string' || issue.length > 500 || /[\u0000-\u001f\u007f]/.test(issue)) {
      throw new Error('Peringatan OCR draft tidak valid atau terlalu panjang.');
    }
    return issue;
  });
}

function spkImportDraftRoot_(create) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(SPK_IMPORT_DRAFT_ROOT_KEY_);
  if (!id && !create) return null;
  if (!id) {
    var folder = DriveApp.getRootFolder().createFolder('SPK Import Drafts - Private');
    props.setProperty(SPK_IMPORT_DRAFT_ROOT_KEY_, folder.getId());
    return folder;
  }
  var root = DriveApp.getFolderById(id);
  if (root.isTrashed()) throw new Error('Folder draft SPK sudah dihapus.');
  return root;
}

function spkImportDraftFolder_(root, id, create) {
  var folders = root.getFoldersByName(id);
  while (folders.hasNext()) {
    var folder = folders.next();
    if (!folder.isTrashed()) return folder;
  }
  return create ? root.createFolder(id) : null;
}

function spkImportDraftLoad_(folder, session) {
  var files = folder.getFilesByName(SPK_IMPORT_DRAFT_MANIFEST_);
  if (!files.hasNext()) throw new Error('Metadata batch draft tidak tersedia.');
  var file = files.next();
  var data = JSON.parse(file.getBlob().getDataAsString());
  if (data.schema !== 'spk-import-draft-v1' || data.batchId !== folder.getName()) {
    throw new Error('Metadata batch draft tidak valid.');
  }
  if (session && data.userId !== String(session.userId)) throw new Error('Draft hanya dapat diakses pembuatnya.');
  return { data: data, file: file, folder: folder };
}

function spkImportDraftOwned_(session, id) {
  var root = spkImportDraftRoot_(false);
  var folder = root && spkImportDraftFolder_(root, id, false);
  if (!folder) throw new Error('Batch draft tidak ditemukan.');
  return spkImportDraftLoad_(folder, session);
}

function spkImportDraftSave_(batch, summaryChanged) {
  batch.data.updatedAt = new Date().toISOString();
  batch.file.setContent(JSON.stringify(batch.data));
  if (summaryChanged) spkImportDraftSyncIndex_(batch.data);
}

function spkImportDraftResult_(data) {
  return { status: 'success', batch: {
    batchId: data.batchId,
    items: data.items.map(function(item) {
      return { code: item.code, name: item.name, fields: JSON.parse(JSON.stringify(item.fields)),
        issues: (item.issues || []).slice(), status: item.status, spk: item.spk || '' };
    }),
    files: data.files.map(function(file) {
      return { index: file.index, name: file.name, types: file.types.slice(),
        size: file.size, hash: file.hash, saved: Boolean(file.uploaded) };
    })
  } };
}

function spkImportDraftSummary_(data) {
  return {
    batchId: data.batchId,
    createdAt: data.createdAt,
    items: data.items.map(function(item) {
      return { code: item.code, name: item.name, status: item.status, spk: item.spk || '' };
    }),
    files: data.files.map(function(file) {
      return { index: file.index, name: file.name, types: file.types.slice(), saved: Boolean(file.uploaded) };
    })
  };
}

function spkImportDraftSummaryResponse_(data) {
  return { status: 'success', batch: spkImportDraftSummary_(data) };
}

function spkImportDraftIndexName_(userId) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(userId));
  return 'owner-index-' + digest.map(function(byte) {
    return ('0' + (byte & 255).toString(16)).slice(-2);
  }).join('') + '.json';
}

function spkImportDraftIndexFile_(root, userId) {
  var files = root.getFilesByName(spkImportDraftIndexName_(userId));
  return files.hasNext() ? files.next() : null;
}

function spkImportDraftIndexData_(file, userId) {
  var index = JSON.parse(file.getBlob().getDataAsString());
  if (index.schema !== 'spk-import-owner-index-v1' || index.userId !== String(userId) ||
      !Array.isArray(index.batches)) throw new Error('Indeks draft pembuat tidak valid.');
  return index;
}

function spkImportDraftSyncIndex_(data) {
  var root = spkImportDraftRoot_(false);
  var file = root && spkImportDraftIndexFile_(root, data.userId);
  if (!file) return;
  var index = spkImportDraftIndexData_(file, data.userId);
  var summary = spkImportDraftSummary_(data);
  var position = index.batches.findIndex(function(batch) { return batch.batchId === data.batchId; });
  if (position < 0) index.batches.push(summary);
  else index.batches[position] = summary;
  file.setContent(JSON.stringify(index));
}

function spkImportDraftCreationHash_(items, files) {
  var input = JSON.stringify({
    items: items.map(function(item) {
      return { code: item.code, name: item.name, fields: item.fields, issues: item.issues || [] };
    }),
    files: files.map(function(file) {
      return { index: file.index, name: file.name, types: file.types, size: file.size, hash: file.hash };
    })
  });
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input));
}

function createSpkImportDraft(authToken, payload) {
  var session = spkImportDraftSession_(authToken);
  var id = spkImportDraftId_(payload && payload.batchId);
  if (!payload || !Array.isArray(payload.items) || !payload.items.length || payload.items.length > 30 ||
      !Array.isArray(payload.files) || payload.files.length > 5) {
    throw new Error('Batch draft harus berisi 1-30 item dan maksimal 5 file.');
  }
  var codes = {};
  var items = payload.items.map(function(item) {
    var code = spkImportDraftCode_(item && item.code);
    if (codes[code]) throw new Error('Kode item draft harus unik.');
    codes[code] = true;
    return { code: code, name: spkImportDraftItemName_(item.name),
      fields: spkImportDraftFields_(item.fields), issues: spkImportDraftIssues_(item.issues),
      status: 'pending' };
  });
  var indexes = {};
  var files = payload.files.map(function(file) {
    var descriptor = spkImportDraftDescriptor_(file);
    if (indexes[descriptor.index]) throw new Error('Indeks file draft harus unik.');
    indexes[descriptor.index] = true;
    return descriptor;
  });
  var creationHash = spkImportDraftCreationHash_(items, files);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var root = spkImportDraftRoot_(true);
    var folder = spkImportDraftFolder_(root, id, true);
    var manifests = folder.getFilesByName(SPK_IMPORT_DRAFT_MANIFEST_);
    if (manifests.hasNext()) {
      var existing = spkImportDraftLoad_(folder, session);
      if ((existing.data.creationHash ||
          spkImportDraftCreationHash_(existing.data.items, existing.data.files)) !== creationHash) {
        throw new Error('ID batch sudah digunakan untuk data berbeda.');
      }
      spkImportDraftSyncIndex_(existing.data);
      return spkImportDraftResult_(existing.data);
    }
    var now = new Date().toISOString();
    var data = { schema: 'spk-import-draft-v1', batchId: id, userId: String(session.userId),
      creationHash: creationHash,
      createdAt: now, updatedAt: now, items: items, files: files };
    Drive.Files.create({ name: SPK_IMPORT_DRAFT_MANIFEST_, parents: [folder.getId()] },
      Utilities.newBlob(JSON.stringify(data), 'application/json', SPK_IMPORT_DRAFT_MANIFEST_), { fields: 'id' });
    spkImportDraftSyncIndex_(data);
    return spkImportDraftResult_(data);
  } finally {
    lock.releaseLock();
  }
}

function listSpkImportDrafts(authToken) {
  var session = spkImportDraftSession_(authToken);
  var root = spkImportDraftRoot_(false);
  if (!root) return { status: 'success', batches: [] };
  var indexFile = spkImportDraftIndexFile_(root, session.userId);
  if (!indexFile) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      indexFile = spkImportDraftIndexFile_(root, session.userId);
      if (!indexFile) {
        var drafts = [];
        var folders = root.getFolders();
        while (folders.hasNext()) {
          var folder = folders.next();
          if (folder.isTrashed()) continue;
          if (!folder.getFilesByName(SPK_IMPORT_DRAFT_MANIFEST_).hasNext()) continue;
          var batch = spkImportDraftLoad_(folder);
          if (batch.data.userId === String(session.userId)) drafts.push(batch.data);
        }
        drafts.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
        var data = { schema: 'spk-import-owner-index-v1', userId: String(session.userId),
          batches: drafts.map(spkImportDraftSummary_) };
        var created = Drive.Files.create({ name: spkImportDraftIndexName_(session.userId),
          parents: [root.getId()] },
          Utilities.newBlob(JSON.stringify(data), 'application/json', 'draft-index.json'), { fields: 'id' });
        indexFile = DriveApp.getFileById(created.id);
      }
    } finally {
      lock.releaseLock();
    }
  }
  var index = spkImportDraftIndexData_(indexFile, session.userId);
  index.batches.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
  return { status: 'success', batches: index.batches };
}

function getSpkImportDraft(authToken, batchId, code) {
  var batch = spkImportDraftOwned_(spkImportDraftSession_(authToken), spkImportDraftId_(batchId));
  if (code === undefined) return spkImportDraftResult_(batch.data);
  var itemCode = spkImportDraftCode_(code);
  var item = batch.data.items.find(function(entry) { return entry.code === itemCode; });
  if (!item) throw new Error('Item draft tidak ditemukan.');
  return spkImportDraftResult_({
    batchId: batch.data.batchId, items: [item], files: batch.data.files
  });
}

function updateSpkImportDraftItem(authToken, batchId, code, fields) {
  var session = spkImportDraftSession_(authToken);
  var id = spkImportDraftId_(batchId);
  var itemCode = spkImportDraftCode_(code);
  var validated = spkImportDraftFields_(fields);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var batch = spkImportDraftOwned_(session, id);
    var item = batch.data.items.filter(function(entry) { return entry.code === itemCode; })[0];
    if (!item) throw new Error('Item draft tidak ditemukan.');
    if (item.status !== 'pending') throw new Error('Item draft sedang dilampirkan atau sudah selesai; tidak dapat diubah.');
    if (!batch.data.creationHash) {
      batch.data.creationHash = spkImportDraftCreationHash_(batch.data.items, batch.data.files);
    }
    item.fields = validated;
    spkImportDraftSave_(batch);
    return spkImportDraftResult_({
      batchId: batch.data.batchId, items: [item], files: batch.data.files
    });
  } finally {
    lock.releaseLock();
  }
}

function spkImportDraftStoredFile_(folder, index) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.isTrashed() || file.getName() === SPK_IMPORT_DRAFT_MANIFEST_) continue;
    var description = file.getDescription();
    if (!description) throw new Error('Metadata file draft tidak tersedia.');
    var meta = JSON.parse(description);
    if (meta.schema === 'spk-import-file-v1' && meta.index === index) return { file: file, meta: meta };
  }
  return null;
}

function saveSpkImportDraftFile(authToken, batchId, payload) {
  var session = spkImportDraftSession_(authToken);
  var id = spkImportDraftId_(batchId);
  if (!payload || !Number.isInteger(payload.index)) throw new Error('Indeks file draft tidak valid.');
  var name = spkImportDraftName_(payload.name);
  if (!Array.isArray(payload.types)) throw new Error('Kategori file draft tidak valid.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var batch = spkImportDraftOwned_(session, id);
    var descriptor = batch.data.files.filter(function(file) { return file.index === payload.index; })[0];
    if (!descriptor || name !== descriptor.name ||
        JSON.stringify(payload.types) !== JSON.stringify(descriptor.types)) {
      throw new Error('File tidak sesuai deskripsi batch.');
    }
    var decoded = decodeSpkDocument_({ type: descriptor.types[0], name: name,
      uploadId: payload.uploadId, base64: payload.base64 });
    var extension = name.split('.').pop().toLowerCase();
    if (!/^(pdf|png|jpe?g)$/.test(extension)) throw new Error('File draft harus PDF, PNG, atau JPEG.');
    if (decoded.size !== descriptor.size || decoded.hash !== descriptor.hash) {
      throw new Error('Isi file draft berbeda dari ukuran atau SHA-256 batch.');
    }
    var stored = spkImportDraftStoredFile_(batch.folder, descriptor.index);
    if (stored) {
      if (stored.meta.hash !== decoded.hash || stored.meta.uploadId !== decoded.uploadId ||
          stored.file.getName() !== name) throw new Error('File draft sudah diunggah dengan isi berbeda.');
    } else {
      var meta = { schema: 'spk-import-file-v1', index: descriptor.index,
        uploadId: decoded.uploadId, hash: decoded.hash };
      var created = Drive.Files.create({ name: name, parents: [batch.folder.getId()],
        description: JSON.stringify(meta) }, decoded.blob, { fields: 'id' });
      stored = { file: DriveApp.getFileById(created.id), meta: meta };
    }
    if (!descriptor.uploaded || descriptor.fileId !== stored.file.getId()) {
      descriptor.uploaded = true;
      descriptor.fileId = stored.file.getId();
      descriptor.size = decoded.size;
      descriptor.uploadId = decoded.uploadId;
      spkImportDraftSave_(batch, true);
    } else spkImportDraftSyncIndex_(batch.data);
    return spkImportDraftSummaryResponse_(batch.data);
  } finally {
    lock.releaseLock();
  }
}

function getSpkImportDraftFile(authToken, batchId, index) {
  var batch = spkImportDraftOwned_(spkImportDraftSession_(authToken), spkImportDraftId_(batchId));
  if (!Number.isInteger(index)) throw new Error('Indeks file draft tidak valid.');
  var descriptor = batch.data.files.filter(function(file) { return file.index === index; })[0];
  if (!descriptor || !descriptor.uploaded) throw new Error('File draft belum diunggah.');
  var stored = spkImportDraftStoredFile_(batch.folder, index);
  if (!stored || stored.file.getId() !== descriptor.fileId) throw new Error('File draft tidak tersedia.');
  return { status: 'success', name: descriptor.name,
    mimeType: stored.file.getMimeType(), base64: Utilities.base64Encode(stored.file.getBlob().getBytes()) };
}

function spkImportDraftUploadId_(batchId, code, index, type) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    batchId + ':' + code + ':' + index + ':' + type);
  return 'draft-' + digest.map(function(byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function completeSpkImportDraftItem(authToken, batchId, code, spk) {
  var session = spkImportDraftSession_(authToken);
  var id = spkImportDraftId_(batchId);
  var itemCode = spkImportDraftCode_(code);
  var key = normalizeSpk_(spk);
  if (!key || key.length > 100 || /[\u0000-\u001f\\/]/.test(key)) throw new Error('Nomor SPK tidak valid.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var batch = spkImportDraftOwned_(session, id);
    var item = batch.data.items.filter(function(entry) { return entry.code === itemCode; })[0];
    if (!item) throw new Error('Item draft tidak ditemukan.');
    if (item.spk && item.spk !== key) throw new Error('Item sudah dikaitkan dengan SPK berbeda.');
    if (batch.data.items.some(function(entry) { return entry !== item && entry.spk === key; })) {
      throw new Error('Nomor SPK sudah digunakan oleh item lain dalam kelompok draft ini.');
    }
    if (!readDatabaseV2Spk_(key)) throw new Error('SPK tidak ditemukan di Database V2.');
    if (item.status === 'completed') {
      spkImportDraftSyncIndex_(batch.data);
      return spkImportDraftSummaryResponse_(batch.data);
    }
    if (batch.data.files.some(function(file) { return !file.uploaded; })) {
      throw new Error('Unggah semua file draft sebelum menyelesaikan item.');
    }
    if (item.status !== 'attaching' || item.spk !== key) {
      item.spk = key;
      item.status = 'attaching';
      spkImportDraftSave_(batch, true);
    }
    var root = DriveApp.getFolderById(SPK_DOCUMENT_FOLDER_ID_);
    if (root.isTrashed()) throw new Error('Folder dokumen SPK sudah dihapus.');
    var folder = getSpkDocumentFolder_(root, key, true);
    batch.data.files.forEach(function(descriptor) {
      var source = spkImportDraftStoredFile_(batch.folder, descriptor.index);
      if (!source || source.file.getId() !== descriptor.fileId) throw new Error('File draft tidak tersedia.');
      descriptor.types.forEach(function(type) {
        var category = getSpkDocumentFolder_(folder, type, true);
        var uploadId = spkImportDraftUploadId_(id, itemCode, descriptor.index, type);
        var files = category.getFiles();
        while (files.hasNext()) {
          var existing = files.next();
          if (existing.isTrashed()) continue;
          var metadata = spkDocumentMetadata_(existing);
          if (metadata.uploadId !== uploadId) continue;
          if (metadata.hash !== source.meta.hash || existing.getName() !== descriptor.name) {
            throw new Error('ID upload dokumen sudah digunakan untuk file berbeda.');
          }
          return;
        }
        Drive.Files.create({ name: descriptor.name, parents: [category.getId()],
          description: JSON.stringify({ schema: 'spk-document-v1', uploadId: uploadId,
            hash: source.meta.hash, uploadedBy: String(session.name || session.email || session.userId) }) },
          source.file.getBlob(), { fields: 'id' });
      });
    });
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
    spkImportDraftSave_(batch, true);
    return spkImportDraftSummaryResponse_(batch.data);
  } finally {
    lock.releaseLock();
  }
}
