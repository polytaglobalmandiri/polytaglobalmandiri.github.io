const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync('gas-deploy/BE-Peranikan-Data.js', 'utf8'), context);

const files = [
  { id: 'one', name: 'A26.001.xlsx', mime: 'application/vnd.ms-excel' },
  { id: 'two', name: 'A26.002.xlsx', mime: 'application/vnd.ms-excel' },
  { id: 'three', name: 'A26.003.xlsx', mime: 'application/vnd.ms-excel' }
];
context.MimeType = { GOOGLE_SHEETS: 'sheet', SHORTCUT: 'shortcut' };
context.normalizeSourceSpk_ = name => name.slice(0, 7);
context.buildSpkSortKey_ = spk => spk;
const folder = {
  getFiles: () => {
    let index = 0;
    return {
      hasNext: () => index < files.length,
      next: () => {
        const file = files[index++];
        return {
          getId: () => file.id,
          getName: () => file.name,
          getMimeType: () => file.mime
        };
      }
    };
  }
};
assert.deepEqual(
  Array.from(context.selectExtractionSourceFiles_(folder, ['three', 'one']), file => file.id),
  ['one', 'three']
);
assert.deepEqual(
  Array.from(context.selectExtractionSourceFiles_(folder, 'two'), file => file.id),
  ['two']
);
assert.throws(() => context.selectExtractionSourceFiles_(folder, ['missing']), /tidak ada/);
assert.throws(() => context.normalizeExtractionSelection_([]), /setidaknya satu/);
assert.throws(() => context.normalizeExtractionSelection_(['one', 'one']), /berbeda/);

const saved = new Map();
context.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: key => saved.get(key) || null,
    setProperty: (key, value) => saved.set(key, value),
    setProperties: values => Object.entries(values).forEach(([key, value]) => saved.set(key, value)),
    deleteProperty: key => saved.delete(key)
  })
};
const ids = Array.from({ length: 600 }, (_, index) => 'file-id-' + String(index).padStart(5, '0'));
const chunks = context.saveExtractionSelection_('job-selection', ids);
assert.ok(chunks > 1, 'large selections must be stored in several properties');
assert.deepEqual(Array.from(context.readExtractionSelection_({
  jobId: 'job-selection', selectionChunks: chunks
})), ids);
context.saveActiveExtractionJob_({ jobId: 'job-selection', selectionChunks: chunks });
context.deleteActiveExtractionJob_('job-selection');
assert.equal(saved.size, 0, 'acknowledged jobs must remove their selection');

for (const path of [
  'apps/spk-automation/data-retrieval/index.html',
  'gas-deploy/FE-Penarikan-Data.html'
]) {
  const html = fs.readFileSync(path, 'utf8');
  assert.match(html, /Pilih semua/);
  assert.match(html, /selectedExtractionFileIds\.size/);
  assert.match(html, /selectedIds \|\| safeFileId \|\| null/);
}
console.log('PASS: selected files, large selections, job cleanup, and both interfaces');
