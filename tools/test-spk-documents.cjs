const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let nextId = 0;
let creates = 0;
let reads = 0;
let lockHeld = false;
const filesById = new Map();
function iterator(values) {
  let index = 0;
  return { hasNext: () => index < values.length, next: () => values[index++] };
}
class Folder {
  constructor(name) { this.name = name; this.id = `folder-${++nextId}`; this.folders = []; this.files = []; }
  getId() { return this.id; }
  isTrashed() { return false; }
  getFoldersByName(name) { return iterator(this.folders.filter(folder => folder.name === name)); }
  createFolder(name) { assert.equal(lockHeld, true); const folder = new Folder(name); this.folders.push(folder); return folder; }
  getFiles() { return iterator(this.files); }
}
const root = new Folder('Documents');
function findFolder(folder, id) {
  if (folder.id === id) return folder;
  for (const child of folder.folders) { const match = findFolder(child, id); if (match) return match; }
}
const context = {
  console,
  requireSpkRpcAccess_({ authToken }, method) {
    if (authToken === 'ppic' || authToken === 'owner') return;
    if (authToken === 'manager' && method === 'getSpkDocuments') return;
    throw new Error('Akses ditolak');
  },
  requireApprovalSession_: () => ({ name: 'Test PPIC', userId: 'user-1' }),
  normalizeSpk_: value => String(value || '').trim().toUpperCase(),
  readDatabaseV2Spk_: spk => { reads++; return spk === 'A26.001' ? {} : null; },
  Utilities: {
    base64Decode: data => Array.from(Buffer.from(data, 'base64')),
    base64Encode: data => Buffer.from(data).toString('base64'),
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: (_, data) => crypto.createHash('sha256').update(Buffer.from(data)).digest(),
    newBlob: (bytes, mime, name) => ({ bytes, mime, name })
  },
  LockService: { getScriptLock: () => ({
    waitLock() { assert.equal(lockHeld, false); lockHeld = true; },
    releaseLock() { lockHeld = false; }
  }) },
  DriveApp: {
    getFolderById(id) { assert.equal(id, '1uRVimiSIL990zmofshKCZ2rwjpKa8fmq'); return root; },
    getFileById: id => filesById.get(id)
  },
  Drive: { Files: { create(resource, blob) {
    assert.equal(lockHeld, true);
    creates++;
    const id = `file-${++nextId}`;
    const file = {
      getId: () => id, getName: () => resource.name, getDescription: () => resource.description,
      getSize: () => blob.bytes.length, getMimeType: () => blob.mime, isTrashed: () => false,
      getDateCreated: () => new Date('2026-10-05T12:00:00Z'),
      getUrl: () => `https://drive.google.com/file/d/${id}/view`
    };
    findFolder(root, resource.parents[0]).files.push(file);
    filesById.set(id, file);
    return { id };
  } } }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'gas-deploy', 'BE-Spk-Documents.js'), 'utf8'), context);
const headers = {
  pdf: [37, 80, 68, 70, 45], jpg: [255, 216, 255], jpeg: [255, 216, 255],
  png: [137, 80, 78, 71, 13, 10, 26, 10],
  doc: [208, 207, 17, 224, 161, 177, 26, 225], xls: [208, 207, 17, 224, 161, 177, 26, 225],
  docx: [80, 75, 3, 4], xlsx: [80, 75, 3, 4]
};
function payload(extension = 'pdf', overrides = {}) {
  return { type: 'PO', name: `document.${extension}`, uploadId: crypto.randomUUID(),
    base64: Buffer.from(headers[extension] || [1]).toString('base64'), ...overrides };
}
assert.throws(() => context.getSpkDocuments('', 'A26.001'), /Akses ditolak/);
assert.equal(reads, 0, 'Unauthorized users cannot inspect SPK or Drive');
assert.throws(() => context.saveSpkDocument('manager', 'A26.001', payload()), /Akses ditolak/);
assert.throws(() => context.getSpkDocuments('ppic', 'missing'), /tidak ditemukan/);
assert.throws(() => context.getSpkDocuments('ppic', '../A26.001'), /tidak valid/);
assert.equal(context.getSpkDocuments('ppic', 'A26.001').documents.length, 0);
assert.equal(root.folders.length, 0, 'Reading an empty SPK never creates folders');
for (const extension of Object.keys(headers)) {
  const data = payload(extension);
  const result = context.saveSpkDocument('ppic', ' a26.001 ', data);
  assert.equal(result.status, 'success');
  assert.equal(result.document.type, 'PO');
  assert.equal(result.document.uploadedBy, 'Test PPIC');
  const before = creates;
  assert.equal(context.saveSpkDocument('ppic', 'A26.001', data).document.fileId, result.document.fileId);
  assert.equal(creates, before, 'Retry must not duplicate the same file');
  assert.throws(() => context.saveSpkDocument('ppic', 'A26.001', { ...data, name: `changed.${extension}` }), /berbeda/);
}
assert.equal(lockHeld, false);
for (const type of ['PHJ', 'TDS']) {
  context.saveSpkDocument('ppic', 'A26.001', payload('pdf', { type }));
  context.saveSpkDocument('ppic', 'A26.001', payload('pdf', { type }));
}
const list = context.getSpkDocuments('manager', 'A26.001').documents;
assert.equal(list.length, 12);
assert.equal(list.filter(file => file.type === 'TDS').length, 2);
assert.equal(root.folders.length, 1, 'SPK subfolder is reused');
assert.equal(root.folders[0].folders.length, 3);
for (const invalid of [
  payload('exe'), payload('pdf', { type: 'OTHER' }), payload('pdf', { name: '../bad.pdf' }),
  payload('pdf', { base64: '' }), payload('pdf', { base64: 'invalid data' }),
  payload('pdf', { base64: Buffer.from('not a pdf').toString('base64') }),
  payload('pdf', { uploadId: 'short' })
]) assert.throws(() => context.decodeSpkDocument_(invalid));
const exact = Buffer.alloc(10 * 1024 * 1024);
Buffer.from(headers.pdf).copy(exact);
assert.equal(context.decodeSpkDocument_(payload('pdf', { base64: exact.toString('base64') })).size, exact.length);
const oversized = Buffer.concat([exact, Buffer.from([0])]);
assert.throws(() => context.decodeSpkDocument_(payload('pdf', { base64: oversized.toString('base64') })), /10 MB/);
const create = context.Drive.Files.create;
context.Drive.Files.create = () => { throw new Error('Drive unavailable'); };
assert.throws(() => context.saveSpkDocument('ppic', 'A26.001', payload()), /Drive unavailable/);
assert.equal(lockHeld, false, 'Lock releases on Drive errors');
context.Drive.Files.create = create;
const html = fs.readFileSync(path.join(__dirname, '..', 'apps', 'spk-automation', 'index.html'), 'utf8');
const gas = fs.readFileSync(path.join(__dirname, '..', 'gas-deploy', 'FE-Dashboard.html'), 'utf8');
for (const source of [html, gas]) {
  assert.match(source, /spk-documents\.js\?v=/);
  assert.match(source, /spk-documents\.css\?v=/);
  assert.match(source, /id="manageDocumentsButton" class="manage-choice manage-choice-documents"/);
  assert.match(source, /getElementById\('manageDocumentsButton'\)\.dataset\.spk = spk/);
  const renderer = source.slice(source.indexOf('function renderManageButton('), source.indexOf('function getEtdStatus('));
  assert.doesNotMatch(renderer, /spk-documents-button|manageDocumentsButton/);
  assert.match(renderer, /<span>Kelola<\/span>/);
}
const documentUi = fs.readFileSync(path.join(__dirname, '..', 'apps', 'spk-automation', 'spk-documents.js'), 'utf8');
const documentCss = fs.readFileSync(path.join(__dirname, '..', 'apps', 'spk-automation', 'spk-documents.css'), 'utf8');
assert.match(documentCss, /#manageRelease \.release-indicator \{ display: inline-flex; align-items: center; justify-content: center; \}/);
assert.doesNotMatch(documentUi, /returnToManage|Kembali ke Kelola SPK/);
assert.doesNotMatch(documentUi, /getOrCreateInstance\(manageElement\)\.show\(\)/);
assert.match(documentUi, /data-bs-dismiss="modal">Tutup<\/button>/);
assert.match(documentUi, /if \(busy\) \{ event\.preventDefault\(\); return; \}/);
assert.match(documentUi, /aria-labelledby="spkDocUploadTitle"/);
assert.match(documentUi, /aria-describedby="spkDocFormats"/);
assert.match(documentUi, /copy\.append\(link, meta, uploader\)/);
assert.match(documentUi, /heading\.appendChild\(count\)/);
assert.match(documentUi, /queue = queue\.concat\(newItems\)/);
assert.match(documentUi, /item\.file\.lastModified === addition\.file\.lastModified/);
assert.doesNotMatch(documentUi, /spkDocType'\)\.addEventListener\('change', selectFiles/);
for (const type of ['PO', 'PHJ', 'TDS']) assert.match(documentUi, new RegExp('id="spkDocAdd' + type + '"'));
assert.match(documentUi, /URL\.revokeObjectURL\(previewUrl\)/);
assert.match(documentUi, /showPreview\(newItems\[newItems\.length - 1\]\)/);
assert.match(documentUi, /id="spkDocPreviewIdentity"/);
assert.match(documentUi, /id="spkDocPreviewPosition"/);
assert.match(documentUi, /id="spkDocPrevious"/);
assert.match(documentUi, /id="spkDocNext"/);
assert.match(documentUi, /id="spkDocDelete"/);
assert.match(documentUi, /movePreview\(distance < 0 \? 1 : -1\)/);
assert.doesNotMatch(documentUi, /spkDocQueue|spk-doc-queue|spkDocPreviewClose/);
assert.doesNotMatch(documentUi, /download\.download|Buka di Perangkat|Unduh/);
assert.match(documentUi, /<button id="spkDocSave" type="button" class="button button-primary"/);
assert.match(documentUi, /class="modal-footer"[\s\S]*id="spkDocSave"/);
assert.match(documentCss, /\.spk-doc-preview-navigation \{ display: flex;/);
assert.match(documentCss, /\.spk-doc-preview-category \{ width: fit-content;/);
assert.match(documentCss, /#spkDocPreviewContent iframe \{ width: 100%; height: min\(28vh, 220px\)/);
assert.doesNotMatch(documentCss, /spk-doc-queue/);
assert.match(documentCss, /#spkDocList \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
console.log('PASS: SPK document authorization, formats, exact 10 MiB boundary, multi-file categories, metadata, idempotent retry, error propagation, both page integrations, and close without reopening management');
