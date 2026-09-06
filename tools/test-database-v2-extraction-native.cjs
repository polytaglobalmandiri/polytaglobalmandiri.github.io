const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ console });
[
  'BE-Input-SPK.js',
  'BE-Database-V2.js',
  'BE-Database-V2-Mapping.js',
  'BE-Database-V2-Writer.js',
  'BE-Database-V2-Repository.js',
  'BE-Peranikan-Data.js'
].forEach(name => vm.runInContext(fs.readFileSync('gas-deploy/' + name, 'utf8'), context));

const orderComposition = new Array(28).fill('');
orderComposition.splice(0, 6, 1000, 'PCS', 25, 'KG', 5, '2026-09-30');
// AX:AZ = material, kg, percent; BA:BC = material, kg, percent.
orderComposition.splice(6, 6, 'HDPE', 10, 0.4, 'LLDPE', 15, 0.6);
const production = new Array(21).fill('');
production[1] = true;
production[8] = 0.02;
production[20] = 0.02;
const extractionRecord = {
  spk: 'A26.9001',
  spkSebelumnya: 'A26.8001',
  core: ['A26.9001', '2026-09-05', 'BARU', 'TEAM A', 'PO-1', 'CUSTOMER', 'HDPE', 'TUBE', 'ITEM', 'PLAIN', '50 X 0.03', '10 X 20 X 0.03'],
  production,
  orderComposition,
  warnaColumns: ['MERAH', 2],
  keteranganArtikel: 'CATATAN',
  processNotes: new Array(9).fill(''),
  kodeItem: 'SKU-1',
  keteranganWarna: 'MERAH KHUSUS'
};
const built = context.buildDatabaseV2CandidatesFromExtraction_(extractionRecord);
assert.equal(typeof context.groupDatabaseV2RowsForRead_, 'function');
assert.equal(typeof context.appendDatabaseV2Plan_, 'function');
assert.equal(typeof context.databaseV2BatchStorageValue_, 'function');
assert.deepEqual(
  JSON.parse(JSON.stringify(context.groupDatabaseV2RowsForRead_([2, 3, 5, 8, 9]))),
  [
    { startRow: 2, count: 2 },
    { startRow: 5, count: 1 },
    { startRow: 8, count: 2 }
  ]
);
const storedDate = context.databaseV2BatchStorageValue_('Tanggal', '2026-09-06');
assert.equal(Object.prototype.toString.call(storedDate), '[object Date]');
assert.equal(storedDate.getFullYear(), 2026);
assert.equal(storedDate.getMonth(), 8);
assert.equal(storedDate.getDate(), 6);
assert.equal(context.databaseV2BatchStorageValue_('Catatan', null), '');
const appendedRanges = [];
let insertedRows = null;
const appendSheet = {
  getLastRow: () => 1,
  getMaxRows: () => 2,
  insertRowsAfter: (after, count) => { insertedRows = { after, count }; },
  getRange: (row, column, rowCount, columnCount) => ({
    setValues: values => { appendedRanges.push({ row, column, rowCount, columnCount, values }); },
    setNumberFormat: format => { appendedRanges.push({ row, column, rowCount, columnCount, format }); }
  })
};
context.appendDatabaseV2Plan_({
  headerRow: 1,
  sheetObject: appendSheet,
  fields: ['SPK', 'Tanggal'],
  inserts: [['A26.9001', storedDate], ['A26.9002', storedDate]]
});
assert.deepEqual(insertedRows, { after: 2, count: 1 });
assert.deepEqual(appendedRanges[0], {
  row: 2,
  column: 1,
  rowCount: 2,
  columnCount: 2,
  values: [['A26.9001', storedDate], ['A26.9002', storedDate]]
});
assert.equal(appendedRanges[1].column, 2);
assert.equal(appendedRanges[1].format, 'dd/MM/yyyy');
assert.equal(built.candidates.master.length, 1);
assert.equal(built.candidates.master[0]['Total Komposisi KG'], 25);
assert.equal(built.candidates.master[0]['Total Komposisi %'], 1);
assert.equal(built.candidates.master[0]['Lebar Jadi'], 10);
assert.equal(built.candidates.master[0]['Density'], 0.94);
assert.equal(built.candidates.material.length, 2);
assert.equal(built.candidates.color.length, 1);
assert.equal(built.candidates.delivery[0]['Tanggal Kirim'], '2026-09-30');
assert.equal(built.candidates.routing[0]['Kode Proses'], 'blowing');
const sourceBearingRecords = Object.values(built.candidates).flat().filter(record =>
  Object.prototype.hasOwnProperty.call(record, 'Sumber')
);
assert.ok(sourceBearingRecords.length > 0);
sourceBearingRecords.forEach(record => {
  assert.equal(record.Sumber, 'APLIKASI NATIVE V2');
});
assert.deepEqual(
  Array.from(context.diffDatabaseV2NativeRecords_(
    { fields: [['SPK'], ['Marketing'], ['Diperbarui']] },
    { SPK: 'A26.9001', Marketing: 'TEAM A', Diperbarui: 'lama' },
    { SPK: 'A26.9001', Marketing: 'TEAM B', Diperbarui: 'baru' }
  )),
  ['Marketing']
);
let committedExtraction;
context.getDatabaseV2SpkDirectory_ = () => ({ spks: [] });
context.commitDatabaseV2Candidates_ = (candidates, spks, reason, options) => {
  committedExtraction = { candidates, spks, reason, options };
  return { status: 'COMMITTED', targets: [{ verifiedWrites: 6 }] };
};
const extractionIndex = new Map();
const flushed = context.flushExtractionRecords_([extractionRecord], extractionIndex);
assert.equal(context.flushExtractionRecords_.length, 2);
assert.equal(flushed.created, 1);
assert.equal(flushed.databaseV2.accuracyStatus, 'VERIFIED');
assert.equal(committedExtraction.reason, 'EXTRACTION_IMPORT_NATIVE');
assert.equal(committedExtraction.options.createOnly, true);
assert.equal(extractionIndex.get('A26.9001'), true);
let mutated;
context.mutateDatabaseV2Spk_ = (spk, reason, fn) => {
  mutated = {
    master: { 'Keterangan Artikel': '', 'Kode Item': 'MANUAL', 'Keterangan Warna': '' },
    routing: [{ 'Kode Proses': 'cutting', Keterangan: '', 'Payload JSON': '{"values":{}}' }],
    material: [], color: [], delivery: [], eta: [], accessory: [], tracking: []
  };
  return { status: 'COMMITTED', changed: fn(mutated), targets: [] };
};
const backfill = context.backfillDatabaseV2FromExtraction_(
  'A26.9001',
  [{ nama: 'BIRU', pemakaian: 3 }],
  'ARTIKEL BARU',
  ['', '', '', '', '', '', 'BOTTOM NOTE', '', 'TSHIRT NOTE'],
  'JANGAN TIMPA',
  'WARNA BARU'
);
assert.equal(backfill.changed, true);
assert.equal(mutated.master['Kode Item'], 'MANUAL');
assert.equal(mutated.master['Keterangan Artikel'], 'ARTIKEL BARU');
assert.equal(mutated.color[0]['Nama Warna'], 'BIRU');
assert.equal(mutated.routing[0].Keterangan, 'BOTTOM NOTE | TSHIRT NOTE');
assert.equal(JSON.parse(mutated.routing[0]['Payload JSON']).values.processNotes.tshirt, 'TSHIRT NOTE');
const inputData = context.buildDatabaseV2InputData_({
  master: Object.assign({}, built.candidates.master[0], { Finishing: '-', 'Handle/Pon': '-' }),
  routing: built.candidates.routing,
  material: built.candidates.material,
  color: built.candidates.color,
  delivery: built.candidates.delivery,
  eta: [], accessory: [], tracking: []
});
assert.equal(inputData.spk, 'A26.9001');
assert.equal(inputData.proses.blowing, true);
assert.equal(inputData.komposisi.length, 2);
assert.equal(inputData.warna[0].nama, 'MERAH');
assert.equal(inputData.etd, '2026-09-30');
assert.equal(inputData.keteranganProses.blowing, '');
const editAggregate = {
  master: Object.assign({}, built.candidates.master[0], { Release: 'Tidak' }),
  routing: built.candidates.routing.slice(), material: built.candidates.material.slice(),
  color: built.candidates.color.slice(), delivery: built.candidates.delivery.slice(),
  eta: [], accessory: [], tracking: []
};
context.readDatabaseV2Spk_ = () => editAggregate;
context.validatePayload_ = () => '';
context.getDatabaseV2SpkDirectory_ = () => ({ spks: ['A26.9001', 'A26.8001'] });
context.mutateDatabaseV2Spk_ = (spk, reason, fn) => ({ status: 'COMMITTED', changed: fn(editAggregate) });
context.clearDashboardCache_ = () => {};
context.clearKeluarBahanCache_ = () => {};
const edited = context.updateSpkFromDashboard({
  spk: 'A26.9001', tanggal: '2026-09-06', jenisOrder: 'Repeat Order', spkReferensi: 'A26.8001',
  marketing: 'TEAM B', nomorPO: 'PO-2', customer: 'CUSTOMER', material: 'LLDPE', film: 'SHEET',
  artikel: 'ITEM EDIT', kodeItem: 'SKU-2', ukuranBlow: '60 X 0.04', ukuranJadi: '12 X 25 X 0.04',
  jumlahOrder: '2000', uomOrder: 'PCS', keluarBahan: '50', uomKB: 'KG', toleransi: '5', etd: '2026-10-01'
});
assert.equal(edited.status, 'success');
assert.equal(editAggregate.master.Marketing, 'TEAM B');
assert.equal(editAggregate.master['Jumlah Order'], 2000);
assert.equal(editAggregate.master['SPK Referensi'], 'A26.8001');
assert.equal(editAggregate.master['Lebar Jadi'], 12);
assert.equal(editAggregate.delivery[0]['Tanggal Kirim'], '2026-10-01');
const inputBuilt = context.buildDatabaseV2CandidatesFromInput_({
  spk: 'B26.0001', tanggal: '2026-09-05', jenisOrder: 'Baru', marketing: 'TEAM A',
  customer: 'CUSTOMER', material: 'HDPE', film: 'TUBE', artikel: 'ITEM', modelKantong: 'PLAIN',
  ukuranBlow: '50 X 0.03', ukuranJadi: '10 X 20 X 0.03', jumlahOrder: 1000, uomOrder: 'PCS',
  keluarBahan: 25, uomKB: 'KG', toleransi: 5, etd: '2026-09-30',
  proses: { blowing: true }, bsPercent: { blowing: 2 },
  komposisi: [{ material: 'HDPE', kg: 25, percent: 100 }],
  warna: [], keteranganProses: { blowing: 'NOTE' }, stok: 0, ots: 0, wip: 0
});
assert.equal(inputBuilt.candidates.master[0].SPK, 'B26.0001');
assert.equal(inputBuilt.candidates.master[0].Stok, 0);
assert.equal(inputBuilt.candidates.material[0].KG, 25);
assert.equal(inputBuilt.candidates.routing[0].Keterangan, 'NOTE');
Object.values(inputBuilt.candidates).flat()
  .filter(record => Object.prototype.hasOwnProperty.call(record, 'Sumber'))
  .forEach(record => {
  assert.equal(record.Sumber, 'APLIKASI NATIVE V2');
});
context.requireApprovalSession_ = () => ({ roleKey: 'admin_ppic' });
context.getSpkApprovalSummary_ = () => ({
  complete: true, status: 'SIAP_RELEASE', progress: { approved: 2, required: 2 }, approvals: []
});
const printResult = context.getSpkPrintData('A26.9001', 999, 'token', false);
assert.equal(printResult.status, 'success');
assert.equal(printResult.data.rowNumber, 0);
assert.equal(printResult.data.canRelease, true);
const releaseResult = context.markSpkReleasedForPrint('A26.9001', 999, 'token');
assert.equal(releaseResult.status, 'success');
assert.equal(releaseResult.rowNumber, 0);
const etaDisplay = context.getDatabaseV2EtaEntries_({ eta: [{
  Urutan: 2, 'Tanggal ETA': '2026-10-02', Qty: 20, UOM: 'KG'
}] });
assert.equal(etaDisplay.length, 5);
assert.equal(etaDisplay[0].eta, '');
assert.equal(etaDisplay[1].qty, 20);
const normalizedEta = context.normalizeDatabaseV2EtaSchedule_({
  entries: [
    { eta: '2026-10-01', qty: 10, uom: 'KG' },
    { eta: '2026-10-02', qty: 20, uom: 'ROLL' },
    {}, {}, {}
  ],
  keterangan: 'Bertahap'
});
assert.equal(normalizedEta.entries.length, 2);
assert.throws(() => context.normalizeDatabaseV2EtaSchedule_({
  entries: [{}, { eta: '2026-10-02', qty: 1, uom: 'KG' }, {}, {}, {}]
}), /melompati/);
context.mutateDatabaseV2Spk_ = (spk, reason, fn) => ({ status: 'COMMITTED', changed: fn(editAggregate) });
const materialUpdate = context.updateKeluarBahanByManager({ spk: 'A26.9001', keluarBahan: 75, uomKB: 'KG' });
assert.equal(materialUpdate.status, 'success');
assert.equal(editAggregate.master['Keluar Bahan'], 75);
assert.equal(materialUpdate.data.rowNumber, 0);
console.log('PASS: extraction maps directly to native master, routing, material, color, and delivery records');
