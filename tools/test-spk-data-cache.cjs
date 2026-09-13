const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({
  console,
  Date,
  DB_SPREADSHEET_ID: 'test-db'
});

let revision = '1';
context.Drive = { Files: { get: () => ({ version: revision, modifiedTime: '2026-09-13' }) } };

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

let dataReads = 0;
let searches = 0;
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
          getValues: () => { dataReads++; return getValues(); },
          getDisplayValues: () => getValues().map(line => line.map(String))
        };
        range.createTextFinder = needle => {
          const finder = {
            matchEntireCell: () => finder,
            matchCase: () => finder,
            useRegularExpression: () => finder,
            findAll: () => {
              searches++;
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

assert.equal(dataReads, 3, 'One block each for master, routing, material');
assert.equal(searches, 3, 'One search per non-empty table');
const firstReads = dataReads;
const firstSearches = searches;
// Test 2: Second fetch must hit cache
const res2 = context.getSpkData('A26.100');
assert.equal(res2.status, 'success');
assert.equal(res2.found, true);
assert.equal(res2.performance.source, 'cache');
assert.equal(res2.data.spk, 'A26.100');
assert.equal(dataReads, firstReads, 'Warm detail does not read spreadsheet rows');
assert.equal(searches, firstSearches, 'Warm detail does not search tables');

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

// Direct spreadsheet edits must invalidate detail cache too.
const masterGrid = grids[schema.master.sheet];
masterGrid[1][masterGrid[0].indexOf('Customer')] = 'UPDATED CUSTOMER';
revision = '2';
const updated = context.getSpkData('A26.100');
assert.equal(updated.performance.source, 'database-v2');
assert.equal(updated.data.customer, 'UPDATED CUSTOMER');
assert.equal(context.getSpkData('A26.100').performance.source, 'cache');
console.log('PASS: direct spreadsheet edits invalidate detail cache');

// The Sheets API path batches all eight tables, preserving dates and zero values.
let batchCalls = 0;
context.Session = { getScriptTimeZone: () => 'Asia/Jakarta' };
context.Utilities = {
  parseDate: (text, zone) => { assert.equal(zone, 'Etc/UTC'); return new Date(text.replace(' ', 'T') + 'Z'); },
  formatDate: (date, zone) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
};
context.Sheets = { Spreadsheets: { get: () => ({ properties: { timeZone: 'Etc/UTC' } }), Values: { batchGet(id, options) {
  assert.equal(id, vm.runInContext('DB_SPREADSHEET_ID', context));
  batchCalls++;
  return { valueRanges: options.ranges.map(range => {
    const [, sheetName, a1] = range.match(/^'([^']+)'!(.*)$/);
    const grid = grids[sheetName];
    const colIndex = text => [...text].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
    let rows;
    if (a1 === '1:10') rows = grid.slice(0, 10).map(row => [...row]);
    else {
      const [, startCol, startRow, endCol, endRow] = a1.match(/^([A-Z]+)(\d+):([A-Z]+)(\d*)$/);
      rows = grid.slice(Number(startRow) - 1, endRow ? Number(endRow) : grid.length)
        .map(row => row.slice(colIndex(startCol), colIndex(endCol) + 1));
      if (options.valueRenderOption === 'UNFORMATTED_VALUE') {
        rows = rows.map(row => row.map(value => value === '2026-09-10' ? (Date.UTC(2026, 8, 10) - Date.UTC(1899, 11, 30)) / 86400000 : value));
      }
    }
    return { values: rows };
  }) };
} } } };
const nativeData = JSON.parse(JSON.stringify(context.getSpkData('A26.100').data));
context.clearSpkDataCache_('A26.100');
const fast = context.getSpkData('A26.100');
assert.equal(fast.status, 'success');
assert.equal(batchCalls, 3);
assert.deepEqual(JSON.parse(JSON.stringify(fast.data)), nativeData);
assert.equal(context.readDatabaseV2InputSpkBatch_('MISSING'), null);
// Reorder physical rows, ensuring no row-position cache can return another SPK.
const materialGrid = grids[schema.material.sheet];
materialGrid.splice(2, 0, materialGrid[1].map((value, i) => materialGrid[0][i] === 'SPK' ? 'B26.999' : value));
const reordered = context.readDatabaseV2InputSpkBatch_('A26.100');
assert.equal(reordered.material.length, 2);
assert.ok(reordered.material.every(row => row.SPK === 'A26.100'));
const originalBatchGet = context.Sheets.Spreadsheets.Values.batchGet;
context.Sheets.Spreadsheets.Values.batchGet = () => { throw new Error('API temporarily unavailable'); };
context.clearSpkDataCache_('A26.100');
assert.equal(context.getSpkData('A26.100').status, 'success');
context.Sheets.Spreadsheets.Values.batchGet = originalBatchGet;
console.log('PASS: three batch reads, date serials, missing SPK, moved rows, and native fallback');

// Fractions must retain the time of day before conversion into application time.
const serialWithTime = (Date.UTC(2026, 8, 10, 20) - Date.UTC(1899, 11, 30)) / 86400000;
masterGrid[1][masterGrid[0].indexOf('Tanggal')] = serialWithTime;
const timezoneAggregate = context.readDatabaseV2InputSpkBatch_('A26.100');
assert.equal(context.dateToInput_(timezoneAggregate.master.Tanggal), '2026-09-11');
console.log('PASS: spreadsheet date/time converts to the application timezone without losing fractional days');
