const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ console });
for (const name of ['BE-Input-SPK.js', 'BE-Database-V2.js', 'BE-Database-V2-Mapping.js', 'BE-Database-V2-Repository.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas-deploy', name), 'utf8'), context);
}
const plain = value => JSON.parse(JSON.stringify(value));
const keys = Array.from(vm.runInContext('BS_KEYS', context));
function build(steps, bsPercent = {}) {
  const built = context.buildDatabaseV2CandidatesFromInput_({
    spk: 'TEST.BS', jenisOrder: 'New Order', routingSteps: steps, bsPercent,
    proses: Object.fromEntries(steps.map(step => [step.key, true]))
  }).candidates;
  return { ...plain(built), master: plain(built.master[0]) };
}
function list(key, entries) {
  return { key, values: { ['bsDaftar-' + key]: JSON.stringify(entries) } };
}
const modern = build([
  list('blowing', [{ key: 'blowing', value: '2' }, { key: 'printing', value: '3' }, { key: 'handle', value: '0' }]),
  list('blowing', [{ key: 'blowing', value: '1.25' }])
], { blowing: 3.25, printing: 3, handle: 0 });
let restored = context.buildDatabaseV2InputData_(modern);
assert.equal(restored.bsPercent.blowing, 3.25, 'Repeated routing BS must be summed, not overwritten or multiplied by 100');
assert.equal(restored.bsPercent.printing, 3, 'BS types are not restricted to the routing process name');
assert.equal(restored.bsPercent.handle, 0);
assert.equal(modern.routing[0]['Target BS %'], 0.05, 'Spreadsheet percentage column stores the route total as a fraction');
assert.equal(modern.routing[1]['Target BS %'], 0.0125);
assert.equal(modern.master['Total BS'], 0.0625);
assert.deepEqual(JSON.parse(restored.routingSteps[0].values['bsDaftar-blowing']), [
  { key: 'blowing', value: 2 }, { key: 'printing', value: 3 }, { key: 'handle', value: 0 }
]);
const repeated = build(plain(restored.routingSteps), plain(restored.bsPercent));
assert.deepEqual(plain(context.buildDatabaseV2InputData_(repeated).bsPercent), plain(restored.bsPercent), 'Read/repeat/write must not inflate or erase BS');

const legacy = {
  ...build([], {}),
  master: { SPK: 'OLD.BS', 'Total BS': 0.07 },
  routing: [
    { 'Kode Proses': 'blowing', 'Target BS %': 0.02, 'Payload JSON': '{"values":{"targetBs":{"blowing":2}}}' },
    { 'Kode Proses': 'blowing', 'Target BS %': 0.02, 'Payload JSON': '{"values":{"targetBs":{"blowing":2}}}' },
    { 'Kode Proses': 'cutting', 'Target BS %': 0.05, 'Payload JSON': '{"values":{"targetBs":{"bottomSeal":4,"handle":1,"pon":0}}}' }
  ]
};
restored = context.buildDatabaseV2InputData_(legacy);
assert.equal(restored.bsPercent.blowing, 2, 'Legacy targetBs is already in percentage points and is a shared SPK summary');
assert.equal(restored.bsPercent.bottomSeal, 4);
assert.equal(restored.bsPercent.handle, 1);
assert.equal(restored.bsPercent.pon, 0);
assert.deepEqual(JSON.parse(restored.routingSteps[1].values['bsDaftar-blowing']), []);
assert.equal(restored.routingSteps[2].values['bs-bottomSeal'], '4', 'Legacy wizard controls receive restored BS');
const frontend = vm.createContext({
  window: {},
  BS_LIST: keys.map(key => ({ key })),
  stepValue_: (step, key) => step.values[key],
  stepBsKeys_: () => { throw new Error('Restored BS must use its explicit list, not legacy process guesses'); }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps/spk-automation/routing-bs.js'), 'utf8'), frontend);
const frontendTotals = {};
for (const step of plain(restored.routingSteps)) {
  frontend.window.normalizeRoutingBsValues_(step.key, step.values, { preserveExplicitEmpty: true });
  for (const entry of frontend.window.getStepBsEntries_(step)) {
    frontendTotals[entry.key] = (frontendTotals[entry.key] || 0) + entry.value;
  }
}
assert.deepEqual(frontendTotals, { blowing: 2, bottomSeal: 4, handle: 1, pon: 0 });

const columnOnly = { ...legacy, routing: [{ 'Kode Proses': 'printing', 'Target BS %': 0.0175, 'Payload JSON': '{}' }] };
assert.ok(Math.abs(context.buildDatabaseV2InputData_(columnOnly).bsPercent.printing - 1.75) < 1e-10);
const zero = build([list('printing', [{ key: 'printing', value: '0' }])], { printing: 0 });
assert.equal(context.buildDatabaseV2InputData_(zero).bsPercent.printing, 0);
const cleared = build([list('printing', [])], { printing: 0 });
assert.equal(context.buildDatabaseV2InputData_(cleared).bsPercent.printing, '');

const allEntries = keys.map((key, index) => ({ key, value: String(index + 0.123456789012345) }));
assert.ok(JSON.stringify(allEntries).length > 400, 'Fixture must exceed the old truncation limit');
const allValues = Object.fromEntries(allEntries.map(entry => [entry.key, Number(entry.value)]));
const full = build([list('cutting', allEntries)], allValues);
restored = context.buildDatabaseV2InputData_(full);
for (const entry of allEntries) assert.equal(restored.bsPercent[entry.key], Number(entry.value));
assert.equal(JSON.parse(restored.routingSteps[0].values['bsDaftar-cutting']).length, keys.length);

const oldFields = build([{ key: 'folding', values: { 'bs-folding': '1.5', 'bs-sheet': '0.5' } }], { folding: 1.5, sheet: 0.5 });
assert.equal(context.buildDatabaseV2InputData_(oldFields).bsPercent.sheet, 0.5);
const single = build([{ key: 'printing', values: { 'bsJenis-printing': 'handle', 'bsNilai-printing': '1.25' } }], { handle: 1.25 });
assert.equal(context.buildDatabaseV2InputData_(single).bsPercent.handle, 1.25);
const fallback = build([{ key: 'folding', values: {} }, { key: 'slitting', values: {} }, { key: 'cutting', values: {} }],
  { folding: 2, slitting: 1, sheet: 0.5, sheetSlitting: 0.75, bottomSeal: 3 });
restored = context.buildDatabaseV2InputData_(fallback);
assert.equal(restored.bsPercent.sheet, 0.5);
assert.equal(restored.bsPercent.sheetSlitting, 0.75);
assert.equal(restored.bsPercent.bottomSeal, 3);
const derivedTotal = build([list('printing', [{ key: 'printing', value: '2' }, { key: 'handle', value: '1' }])]);
assert.equal(derivedTotal.master['Total BS'], 0.03, 'Master total is derived from persisted routing details');
assert.throws(() => build([list('printing', [])], { printing: 2 }), /tidak sesuai rincian routing/);
assert.throws(() => build([{ key: 'blowing', values: {} }], { printing: 3 }), /tidak sesuai rincian routing/);

assert.throws(() => build([{ key: 'blowing', values: { 'bsDaftar-blowing': '[{"key":"blowing"' } }]), /rusak atau terpotong/);
assert.throws(() => context.buildDatabaseV2InputData_({
  ...legacy, routing: [{ 'Kode Proses': 'blowing', 'Payload JSON': '{invalid', 'Target BS %': 0.02 }]
}), /Payload routing blowing rusak/);
assert.throws(() => build([list('blowing', [{ key: 'unknown', value: '2' }])]), /tidak valid/);
assert.throws(() => build([list('blowing', [{ key: 'blowing', value: '-2' }])]), /tidak valid/);
assert.throws(() => build([list('blowing', [{ key: 'blowing', value: '' }])]), /tidak valid/);
assert.throws(() => build([{ key: 'blowing', values: { 'bsDaftar-blowing': 'x'.repeat(6001) } }]), /terlalu panjang/);
const excessive = Array.from({ length: 200 }, () => ({ key: 'blowing', values: { 'aksesorisData-blowing': 'x'.repeat(6000) } }));
assert.throws(() => context.serializeRoutingSteps_(excessive), /melebihi kapasitas/);
console.log('PASS: modern/legacy BS, all 12 types, zero/decimals, repeated routing and save round trip, complete JSON lists, explicit corrupt/oversize rejection');
