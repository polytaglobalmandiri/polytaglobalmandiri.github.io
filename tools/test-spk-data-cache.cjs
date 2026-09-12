const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({
  console,
  Date,
  DB_SPREADSHEET_ID: 'test-db'
});

// Mock CacheService
const memoryCache = new Map();
context.CacheService = {
  getScriptCache: () => ({
    get: key => memoryCache.get(key) || null,
    put: (key, val, ttl) => memoryCache.set(key, String(val)),
    remove: key => memoryCache.delete(key),
    removeAll: keys => keys.forEach(k => memoryCache.delete(k))
  })
};

// Load dependencies
[
  'BE-Database-V2.js',
  'BE-Database-V2-Mapping.js',
  'BE-Database-V2-Writer.js',
  'BE-Database-V2-Repository.js',
  'BE-Dashboard.js',
  'BE-SPK-Approval.js',
  'BE-Serah-Terima.js',
  'BE-Input-SPK.js'
].forEach(name => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas-deploy', name), 'utf8'), context);
});

const schema = vm.runInContext("DB_V2_SCHEMA", context);
const grids = {};
for (const entry of Object.values(schema)) {
  grids[entry.sheet] = [entry.fields.map(field => field[0])];
}

function addRow(table, record) {
  const sheetName = schema[table].sheet;
  const header = grids[sheetName][0];
  const row = header.map(col => record[col] ?? '');
  grids[sheetName].push(row);
}

const book = {
  getSheetByName(name) {
    const grid = grids[name];
    if (!grid) throw new Error('Sheet not found: ' + name);
    return {
      getName: () => name,
      getLastRow: () => grid.length,
      getLastColumn: () => grid[0].length,
      getRange(row, col, height, width) {
        const getValues = () => grid.slice(row - 1, row - 1 + height).map(line => line.slice(col - 1, col - 1 + width));
        const range = {
          getValues,
          getDisplayValues: () => getValues().map(line => line.map(String))
        };
        range.createTextFinder = needle => {
          const finder = {
            matchEntireCell: () => finder,
            matchCase: () => finder,
            useRegularExpression: () => finder,
            findAll: () => {
              const rows = getValues();
              const matches = [];
              rows.forEach((line, idx) => {
                if (String(line[0]).toUpperCase() === String(needle).toUpperCase()) {
                  matches.push({ getRow: () => row + idx });
                }
              });
              return matches;
            }
          };
          return finder;
        };
        return range;
      }
    };
  }
};

context.SpreadsheetApp = { openById: () => book };

// Populate sample SPK A26.100 with contiguous routing and material
addRow('master', {
  SPK: 'A26.100',
  Tanggal: '2026-09-10',
  'Jenis Order': 'New Order',
  Marketing: 'ALEX',
  Customer: 'PT SAMPLE',
  Artikel: 'BAG PACK',
  'Ukuran Blow': '40 X 0.05',
  'Ukuran Jadi': '40 X 60 X 0.05',
  Material: 'LLDPE',
  'Jumlah Order': 500,
  'UOM Order': 'KG',
  Release: 'YA',
  Tracking: 'MX'
});

addRow('routing', { 'Routing ID': 'R101', SPK: 'A26.100', Urutan: 1, 'Kode Proses': 'mixer', 'Nama Proses': 'Mixer' });
addRow('routing', { 'Routing ID': 'R102', SPK: 'A26.100', Urutan: 2, 'Kode Proses': 'blowing', 'Nama Proses': 'Blowing' });
addRow('routing', { 'Routing ID': 'R103', SPK: 'A26.100', Urutan: 3, 'Kode Proses': 'cutting', 'Nama Proses': 'Cutting' });

addRow('material', { 'Bahan ID': 'M101', SPK: 'A26.100', Urutan: 1, 'Nama Bahan': 'LLDPE ORI', KG: 450 });
addRow('material', { 'Bahan ID': 'M102', SPK: 'A26.100', Urutan: 2, 'Nama Bahan': 'PIGMEN WHITE', KG: 50 });

// Test 1: First fetch from database-v2
const res1 = context.getSpkData('A26.100');
assert.equal(res1.status, 'success');
assert.equal(res1.found, true);
assert.equal(res1.data.spk, 'A26.100');
assert.equal(res1.data.customer, 'PT SAMPLE');
assert.equal(res1.data.routingSteps.length, 3);
assert.equal(res1.data.komposisi.length, 2);
assert.equal(res1.performance.source, 'database-v2');

// Test 2: Second fetch must hit cache
const res2 = context.getSpkData('A26.100');
assert.equal(res2.status, 'success');
assert.equal(res2.found, true);
assert.equal(res2.performance.source, 'cache');
assert.equal(res2.data.spk, 'A26.100');

// Test 3: getSpkEditData hits cache
const editRes = context.getSpkEditData('A26.100');
assert.equal(editRes.status, 'success');
assert.equal(editRes.found, true);
assert.equal(editRes.performance.source, 'cache');

// Test 4: Invalidate cache
context.clearSpkDataCache_('A26.100');
const res3 = context.getSpkData('A26.100');
assert.equal(res3.status, 'success');
assert.equal(res3.performance.source, 'database-v2');

console.log('PASS: getSpkData contiguous batch reading, cache hit/miss, and invalidation verified');
