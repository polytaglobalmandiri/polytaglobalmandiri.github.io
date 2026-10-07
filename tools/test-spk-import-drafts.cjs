const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let nextId = 0;
let locked = false;
let copies = 0;
let failCopyAfter = -1;
const byId = new Map();
const props = new Map();
function iterator(values) {
  let i = 0;
  return { hasNext: () => i < values.length, next: () => values[i++] };
}
function blob(bytes, mime, name) {
  const content = Buffer.from(bytes);
  return { getBytes: () => Array.from(content), getDataAsString: () => content.toString(),
    bytes: content, mime, name };
}
class Folder {
  constructor(name) { this.id = `folder-${++nextId}`; this.name = name; this.folders = []; this.files = []; byId.set(this.id, this); }
  getId() { return this.id; }
  getName() { return this.name; }
  isTrashed() { return false; }
  getFolders() { return iterator(this.folders); }
  getFoldersByName(name) { return iterator(this.folders.filter(f => f.name === name)); }
  createFolder(name) { assert(locked); const f = new Folder(name); this.folders.push(f); return f; }
  getFiles() { return iterator(this.files); }
  getFilesByName(name) { return iterator(this.files.filter(f => f.getName() === name)); }
}
const driveRoot = new Folder('My Drive');
const documents = new Folder('SPK Documents');
function createFile(resource, content) {
  assert(locked);
  if (resource.description && JSON.parse(resource.description).schema === 'spk-document-v1') {
    if (failCopyAfter === 0) { failCopyAfter = -1; throw new Error('Drive copy failed'); }
    if (failCopyAfter > 0) failCopyAfter--;
    copies++;
  }
  const parent = byId.get(resource.parents[0]);
  const id = `file-${++nextId}`;
  let data = content;
  const file = {
    getId: () => id, getName: () => resource.name, getDescription: () => resource.description || '',
    getBlob: () => data, getMimeType: () => data.mime,
    isTrashed: () => false, setContent: text => { assert(locked); data = blob(text, 'application/json', resource.name); }
  };
  parent.files.push(file); byId.set(id, file);
  return { id };
}
const context = {
  console,
  PropertiesService: { getScriptProperties: () => ({
    getProperty: key => props.get(key), setProperty: (key, value) => { assert(locked); props.set(key, value); }
  }) },
  DriveApp: { getRootFolder: () => driveRoot, getFolderById: id => byId.get(id),
    getFileById: id => byId.get(id) },
  Drive: { Files: { create: createFile } },
  LockService: { getScriptLock: () => ({
    waitLock: () => { assert(!locked); locked = true; },
    releaseLock: () => { assert(locked); locked = false; }
  }) },
  Utilities: {
    newBlob: blob, base64Decode: text => Array.from(Buffer.from(text, 'base64')),
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: (_, bytes) => Array.from(crypto.createHash('sha256').update(
      typeof bytes === 'string' ? bytes : Buffer.from(bytes)).digest())
  },
  requireApprovalSession_: (token, roles) => {
    assert.deepEqual(Array.from(roles), ['admin_ppic']);
    if (!['alice', 'bob'].includes(token)) throw new Error('Akses ditolak');
    return { userId: token, name: token };
  },
  normalizeSpk_: value => String(value || '').trim().toUpperCase(),
  readDatabaseV2Spk_: spk => ['A26.001', 'B26.001'].includes(spk) ? {} : null,
};
vm.createContext(context);
for (const file of ['BE-Spk-Documents.js', 'BE-SPK-Import-Drafts.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'gas-deploy', file), 'utf8'), context);
}
context.SPK_DOCUMENT_FOLDER_ID_ = documents.id;
const batchId = crypto.randomUUID();
const pdf = Buffer.from('%PDF-1.7\nhello');
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1]);
function descriptor(index, name, types, bytes) {
  return { index, name, types, size: bytes.length, hash: crypto.createHash('sha256').update(bytes).digest('base64') };
}
function field(id, value, overrides = {}) {
  return { id, label: id, value, source: 'PO', page: 'po.pdf · halaman 1',
    conflict: false, needsReview: false, preferredSource: 'PO', alternatives: [], ...overrides };
}
const spec = { batchId, items: [
  { code: 'item-1', name: 'First PO', fields: [field('customer', 'ACME'), field('quantity', '2', {
    conflict: true, alternatives: [{ value: '3', source: 'TDS', page: 'sample.png · halaman 1' }]
  })], issues: ['Periksa kuantitas PO.'] },
  { code: 'item-2', name: 'Second PO', fields: [field('customer', 'Other')] }
], files: [descriptor(0, 'po.pdf', ['PO', 'PHJ'], pdf),
  descriptor(1, 'sample.png', ['TDS'], png)] };
function upload(index, bytes, overrides = {}) {
  return { index, name: spec.files[index].name, types: spec.files[index].types,
    uploadId: crypto.randomUUID(), base64: bytes.toString('base64'), ...overrides };
}
assert.throws(() => context.createSpkImportDraft('guest', spec), /Akses ditolak/);
assert.equal(driveRoot.folders.length, 0);
assert.deepEqual(Object.keys(context.createSpkImportDraft('alice', spec)).sort(), ['batch', 'status']);
assert.equal(context.createSpkImportDraft('alice', spec).batch.items.length, 2);
assert.equal(driveRoot.folders.length, 1);
assert.equal(driveRoot.folders[0].folders.length, 1);
assert.throws(() => context.createSpkImportDraft('bob', spec), /pembuatnya/);
assert.throws(() => context.createSpkImportDraft('alice', { ...spec, items: [{ ...spec.items[0], name: 'Changed' }] }), /berbeda/);
assert.throws(() => context.createSpkImportDraft('alice', {
  ...spec, items: [{ ...spec.items[0], issues: ['Changed warning'] }, spec.items[1]]
}), /berbeda/);
assert.throws(() => context.getSpkImportDraft('bob', batchId), /pembuatnya/);
assert.equal(context.listSpkImportDrafts('bob').batches.length, 0);
assert.equal(context.listSpkImportDrafts('alice').batches[0].files[0].saved, false);
assert.equal(context.listSpkImportDrafts('alice').batches[0].items[0].spk, '');
assert.deepEqual(JSON.parse(JSON.stringify(context.listSpkImportDrafts('alice').batches[0].items[0].issues)),
  ['Periksa kuantitas PO.']);
assert.throws(() => context.updateSpkImportDraftItem('guest', batchId, 'item-1', []), /Akses ditolak/);
assert.throws(() => context.updateSpkImportDraftItem('bob', batchId, 'item-1', []), /pembuatnya/);
assert.throws(() => context.updateSpkImportDraftItem('alice', batchId, 'missing', []), /tidak ditemukan/);
assert.throws(() => context.updateSpkImportDraftItem('alice', batchId, 'item-1',
  [field('bad/key', 'x')]), /ID kolom/);
assert.throws(() => context.updateSpkImportDraftItem('alice', batchId, 'item-1',
  [field('customer', 'x'), field('customer', 'y')]), /berulang/);
assert.throws(() => context.updateSpkImportDraftItem('alice', batchId, 'item-1',
  [field('notes', 'x'.repeat(1001))]), /panjang/);
const edited = [field('customer', 'Corrected'), field('quantity', '5')];
const updated = context.updateSpkImportDraftItem('alice', batchId, 'item-1', edited);
assert.equal(updated.status, 'success');
assert.deepEqual(JSON.parse(JSON.stringify(updated.batch.items[0].fields)), edited);
assert.deepEqual(Object.keys(updated.batch).sort(), ['batchId', 'files', 'items']);
assert.deepEqual(Object.keys(updated.batch.items[0]).sort(), ['code', 'fields', 'issues', 'name', 'spk', 'status']);
assert.deepEqual(Object.keys(updated.batch.files[0]).sort(), ['hash', 'index', 'name', 'saved', 'size', 'types']);
assert.deepEqual(JSON.parse(JSON.stringify(context.getSpkImportDraft('alice', batchId).batch.items[0].fields)), edited);
assert.deepEqual(JSON.parse(JSON.stringify(context.getSpkImportDraft('alice', batchId).batch.items[0].issues)),
  ['Periksa kuantitas PO.']);
assert.deepEqual(JSON.parse(JSON.stringify(context.listSpkImportDrafts('alice').batches[0].items[0].fields)), edited);
assert.deepEqual(JSON.parse(JSON.stringify(context.createSpkImportDraft('alice', spec).batch.items[0].fields)), edited,
  'Retrying initial creation must preserve subsequent corrections');
assert.throws(() => context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'A26.001'), /Unggah semua/);
assert.equal(context.getSpkImportDraft('alice', batchId).batch.items[0].spk, '');
for (const invalid of [
  { ...spec, batchId: '../escape' },   { ...spec, files: [descriptor(0, '../evil.pdf', ['PO'], pdf)] },
  { ...spec, files: [descriptor(0, 'po.doc', ['PO'], pdf)] },
  { ...spec, files: [{ ...spec.files[0], size: 0 }] },
  { ...spec, files: [{ ...spec.files[0], size: 10 * 1024 * 1024 + 1 }] },
  { ...spec, files: [{ ...spec.files[0], hash: 'not-a-hash' }] },
  { ...spec, items: [{ code: '../x', name: 'x', fields: [] }] },
  { ...spec, items: [{ code: 'x', name: 'x', fields: [field('key', 'a'.repeat(1001))] }] },
  { ...spec, items: [{ code: 'x', name: 'x', fields: [], issues: ['x'.repeat(501)] }] },
  { ...spec, items: [{ code: 'x', name: 'x', fields: [], issues: Array(51).fill('x') }] },
  { ...spec, items: Array.from({ length: 31 }, (_, i) => ({ code: `item-${i}`, name: 'x', fields: [] })) },
  { ...spec, files: Array.from({ length: 6 }, (_, index) => descriptor(index, 'x.pdf', ['PO'], pdf)) }
]) assert.throws(() => context.createSpkImportDraft('alice', invalid));
const first = upload(0, pdf);
assert.throws(() => context.saveSpkImportDraftFile('bob', batchId, first), /pembuatnya/);
assert.throws(() => context.saveSpkImportDraftFile('alice', batchId, { ...first, base64: Buffer.from('invalid').toString('base64') }), /format PDF/);
assert.throws(() => context.saveSpkImportDraftFile('alice', batchId, {
  ...first, base64: Buffer.concat([pdf, Buffer.alloc(10 * 1024 * 1024)]).toString('base64')
}), /10 MB/);
assert.throws(() => context.saveSpkImportDraftFile('alice', batchId, { ...first, types: ['TDS'] }), /deskripsi/);
assert.throws(() => context.saveSpkImportDraftFile('alice', batchId, {
  ...first, base64: Buffer.from('%PDF-1.7\nother').toString('base64')
}), /SHA-256/);
assert.throws(() => context.saveSpkImportDraftFile('alice', batchId, {
  ...first, base64: Buffer.from('%PDF-1.7\nhello!').toString('base64')
}), /ukuran/);
assert.equal(context.saveSpkImportDraftFile('alice', batchId, first).batch.files[0].saved, true);
const storedBefore = driveRoot.folders[0].folders[0].files.length;
context.saveSpkImportDraftFile('alice', batchId, first);
assert.equal(driveRoot.folders[0].folders[0].files.length, storedBefore);
assert.throws(() => context.saveSpkImportDraftFile('alice', batchId, { ...first, uploadId: crypto.randomUUID() }), /berbeda/);
assert.throws(() => context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'A26.001'), /Unggah semua/);
assert.throws(() => context.getSpkImportDraftFile('bob', batchId, 0), /pembuatnya/);
assert.deepEqual(JSON.parse(JSON.stringify(context.getSpkImportDraftFile('alice', batchId, 0))), {
  status: 'success', name: 'po.pdf', mimeType: 'application/pdf', base64: first.base64
});
assert.throws(() => context.getSpkImportDraftFile('alice', batchId, 1), /belum/);
context.saveSpkImportDraftFile('alice', batchId, upload(1, png));
assert.equal(context.listSpkImportDrafts('alice').batches[0].files.every(file => file.saved), true);
assert.deepEqual(Object.keys(context.listSpkImportDrafts('alice')).sort(), ['batches', 'status']);
assert.throws(() => context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'MISSING'), /tidak ditemukan/);
failCopyAfter = 1;
assert.throws(() => context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'A26.001'), /Drive copy failed/);
assert.equal(context.getSpkImportDraft('alice', batchId).batch.items[0].status, 'attaching');
assert.equal(context.getSpkImportDraft('alice', batchId).batch.items[0].spk, 'A26.001');
assert.equal(context.listSpkImportDrafts('alice').batches[0].items[0].status, 'attaching');
assert.equal(context.listSpkImportDrafts('alice').batches[0].items[0].spk, 'A26.001');
assert.equal(copies, 1, 'One document was copied before interruption');
assert.throws(() => context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'B26.001'), /berbeda/);
assert.throws(() => context.updateSpkImportDraftItem('alice', batchId, 'item-1', edited), /tidak dapat diubah/);
assert.equal(context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'A26.001').batch.items[0].status, 'completed');
assert.throws(() => context.updateSpkImportDraftItem('alice', batchId, 'item-1',
  [field('customer', 'late')]), /selesai/);
assert.equal(context.getSpkImportDraft('alice', batchId).batch.items[0].fields[0].value, 'Corrected');
assert.equal(context.getSpkImportDraft('alice', batchId).batch.items[0].spk, 'A26.001');
assert.equal(copies, 3);
context.completeSpkImportDraftItem('alice', batchId, 'item-1', 'A26.001');
assert.equal(copies, 3);
assert.throws(() => context.completeSpkImportDraftItem('alice', batchId, 'item-2', 'A26.001'), /item lain/);
context.completeSpkImportDraftItem('alice', batchId, 'item-2', 'B26.001');
assert.equal(copies, 6);
assert.equal(context.listSpkImportDrafts('alice').batches[0].items[1].status, 'completed');
const skuBatch = { batchId: crypto.randomUUID(), files: [], items: [
  { code: 'SKU/26.001', name: 'Polybag / SB', fields: [], issues: [] }
] };
assert.equal(context.createSpkImportDraft('alice', skuBatch).batch.items[0].code, 'SKU/26.001');
const alternatePdf = Buffer.from('%PDF-1.7\nother');
const sameNameBatch = { batchId: crypto.randomUUID(),
  items: [{ code: 'same-name', name: 'Same name files', fields: [] }],
  files: [descriptor(0, 'po.pdf', ['PO'], pdf),
    descriptor(1, 'po.pdf', ['TDS'], alternatePdf)] };
context.createSpkImportDraft('alice', sameNameBatch);
assert.throws(() => context.saveSpkImportDraftFile('alice', sameNameBatch.batchId, {
  index: 0, name: 'po.pdf', types: ['PO'], uploadId: crypto.randomUUID(),
  base64: alternatePdf.toString('base64')
}), /SHA-256/);
context.saveSpkImportDraftFile('alice', sameNameBatch.batchId, {
  index: 0, name: 'po.pdf', types: ['PO'], uploadId: crypto.randomUUID(),
  base64: pdf.toString('base64')
});
context.saveSpkImportDraftFile('alice', sameNameBatch.batchId, {
  index: 1, name: 'po.pdf', types: ['TDS'], uploadId: crypto.randomUUID(),
  base64: alternatePdf.toString('base64')
});
assert.equal(context.getSpkImportDraftFile('alice', sameNameBatch.batchId, 1).base64, alternatePdf.toString('base64'));
assert.equal(locked, false);
const api = fs.readFileSync(path.join(__dirname, '..', 'gas-deploy', 'BE-Api.js'), 'utf8');
for (const method of ['createSpkImportDraft', 'saveSpkImportDraftFile', 'listSpkImportDrafts',
  'getSpkImportDraft', 'getSpkImportDraftFile', 'updateSpkImportDraftItem', 'completeSpkImportDraftItem']) {
  assert.match(api, new RegExp(`${method}: ${method}`));
  assert.match(api, new RegExp(`'${method}'`));
}
console.log('SPK import draft backend tests passed');
