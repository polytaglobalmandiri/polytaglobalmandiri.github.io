const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ console });
for (const name of ['BE-Database-V2.js', 'BE-Database-V2-Repository.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas-deploy', name), 'utf8'), context);
}
const schema = vm.runInContext('DB_V2_SCHEMA', context);
const grids = {};
for (const entry of Object.values(schema)) {
  // Reverse headers to prove independence from physical column positions.
  grids[entry.sheet] = [entry.fields.map(field => field[0]).reverse()];
}
function add(table, record) {
  const rows = grids[schema[table].sheet];
  rows.push(rows[0].map(name => record[name] ?? ''));
}
const book = { getSheetByName(name) {
  assert.ok(grids[name], 'Must never access runtime/legacy: ' + name);
  const grid = grids[name];
  return {
    getName: () => name,
    getLastRow: () => grid.length,
    getLastColumn: () => grid[0].length,
    getRange(row, col, height, width) {
      const values = () => grid.slice(row - 1, row - 1 + height).map(line => line.slice(col - 1, col - 1 + width));
      const range = { getValues: values, getDisplayValues: () => values().map(line => line.map(String)) };
      range.createTextFinder = needle => {
        const finder = {
          matchEntireCell: () => finder,
          matchCase: () => finder,
          useRegularExpression: () => finder,
          findAll: () => values().map((line, index) => ({ line, index }))
            .filter(item => String(item.line[0]).toUpperCase() === String(needle).toUpperCase())
            .map(item => ({ getRow: () => row + item.index }))
        };
        return finder;
      };
      return range;
    }
  };
} };
context.SpreadsheetApp = { openById: () => book };
context.DB_SPREADSHEET_ID = 'test';
add('master', { SPK: 'A26.001', Marketing: 'Team A', 'Jumlah Order': 0 });
add('master', { SPK: 'B26.001', Marketing: ' team  a ' });
add('master', { SPK: 'C26.001', Marketing: '-' });
add('routing', { 'Routing ID': 'R2', SPK: 'A26.001', Urutan: 2 });
add('routing', { 'Routing ID': 'R1', SPK: 'A26.001', Urutan: 1 });
const record = context.readDatabaseV2Spk_(' a26.001 ', book);
assert.equal(record.master['Jumlah Order'], 0);
assert.equal(record.routing[0]['Routing ID'], 'R1');
assert.equal(context.readDatabaseV2Spk_('missing', book), null);
assert.equal(context.getDatabaseV2SpkDirectory_().spks[0], 'A26.001');
assert.deepEqual(Array.from(context.getDatabaseV2SpkDirectory_().marketingOptions), ['Team A']);
assert.equal(context.validateDatabaseV2Native_().passed, true);
const validation = context.validateDatabaseV2();
assert.equal(validation.source.sheet, 'SPK Master');
assert.equal(validation.source.uniqueSpk, 3);
assert.equal(validation.summary.sourceAuthority, 'SPK Master');
assert.equal(validation.summary.readyForNativeCutover, true);
assert.equal(validation.summary.readyForNativeWrite, true);
assert.equal(validation.summary.warnings, 0);
add('accessory', { 'Aksesoris ID': 'X1', SPK: 'A26.001', 'Routing ID': 'MISSING' });
assert.equal(context.validateDatabaseV2Native_().errors[0].reason, 'INVALID_ROUTING_REFERENCE');
grids['SPK Aksesoris'].pop();
add('eta', { 'ETA ID': 'E1', SPK: 'MISSING' });
assert.equal(context.validateDatabaseV2Native_().errors[0].reason, 'ORPHAN_SPK');
add('master', { SPK: 'a26.001' });
assert.throws(() => context.readDatabaseV2Table_('master', book), /duplikat/);
grids['SPK Master'].pop();
grids['SPK Master'][0][0] = 'Missing required field';
assert.throws(() => context.readDatabaseV2Table_('master', book), /Field V2 tidak tersedia/);
const completeBuckets = Object.fromEntries(Object.keys(schema).map(name => [name, []]));
completeBuckets.master.push({ SPK: 'A26.001' });
assert.throws(
  () => context.commitDatabaseV2Candidates_({ master: [{ SPK: 'A26.001' }] }, ['A26.001']),
  /Bucket V2 tidak lengkap/
);
completeBuckets.routing.push({ SPK: 'B26.001' });
assert.throws(
  () => context.commitDatabaseV2Candidates_(completeBuckets, ['A26.001']),
  /di luar transaksi SPK/
);
console.log('PASS: reordered headers, zero values, normalized IDs, routing order, native validation authority, missing SPK, references, duplicates, required fields');
