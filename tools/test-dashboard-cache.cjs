const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({
  console,
  Date,
  DB_SPREADSHEET_ID: 'test-db'
});

// Mock CacheService and PropertiesService
const memoryCache = new Map();
context.CacheService = {
  getScriptCache: () => ({
    get: key => memoryCache.get(key) || null,
    getAll: keys => {
      const res = {};
      keys.forEach(k => { if (memoryCache.has(k)) res[k] = memoryCache.get(k); });
      return res;
    },
    put: (key, val, ttl) => memoryCache.set(key, String(val)),
    putAll: (map, ttl) => {
      Object.keys(map).forEach(k => memoryCache.set(k, String(map[k])));
    },
    remove: key => memoryCache.delete(key),
    removeAll: keys => keys.forEach(k => memoryCache.delete(k))
  })
};

const memoryProperties = new Map();
context.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: key => memoryProperties.get(key) || null,
    setProperty: (key, val) => memoryProperties.set(key, String(val))
  })
};

[
  'BE-Input-SPK.js',
  'BE-Database-V2.js',
  'BE-Database-V2-Mapping.js',
  'BE-Database-V2-Writer.js',
  'BE-Database-V2-Repository.js',
  'BE-Dashboard.js',
  'BE-SPK-Approval.js',
  'BE-Serah-Terima.js'
].forEach(name => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas-deploy', name), 'utf8'), context);
});

context.SpreadsheetApp = { openById: () => ({}) };
context.readDatabaseV2Table_ = name => ({
  records: ({
    master: [{
      SPK: 'A26.001', Tanggal: '2026-09-05', 'Jenis Order': 'Baru', Marketing: 'TEAM',
      Customer: 'CUSTOMER', Artikel: 'ITEM', 'Ukuran Blow': '50 X 0.03',
      'Ukuran Jadi': '10 X 20 X 0.03', Material: 'HDPE', 'Jumlah Order': 1000,
      'UOM Order': 'PCS', 'PCS/KG': 100, 'Keluar Bahan': 12, 'UOM KB': 'KG',
      'Total BS': 0.02, Release: 'Tidak', Tracking: 'BL'
    }],
    routing: [{ SPK: 'A26.001', Urutan: 1, 'Kode Proses': 'cutting', 'Payload JSON': '{"values":{"finishing":"BOTTOM SEAL"}}' }],
    tracking: [{ SPK: 'A26.001', 'Kode Status': 'PR' }]
  })[name] || []
});

context.Drive = { Files: { get: () => ({ version: '1', modifiedTime: '2026-09-13' }) } };
// Test 1: Same verified source revision is stable
const rev1 = context.readDashboardSourceRevision_();
const rev2 = context.readDashboardSourceRevision_();
assert.equal(rev1, rev2, 'sourceRevision must be deterministic between repeated reads');

// Test 2: Initial fetch (cold)
const initial = context.getDashboardData(false);
assert.equal(initial.totalSPK, 1);
assert.equal(initial.performance.source, 'database-v2');

// Test 3: Subsequent fetch (warm cache hit)
const cached = context.getDashboardData(false);
assert.equal(cached.totalSPK, 1);
assert.equal(cached.performance.source, 'cache-v2');

// Test 4: Force refresh bypasses cache
const forced = context.getDashboardData(true);
assert.equal(forced.performance.source, 'database-v2');

// Test 5: Cache clear bumps revision and clears cache
context.clearDashboardCache_();
const afterClear = context.getDashboardData(false);
assert.equal(afterClear.performance.source, 'database-v2');

console.log('PASS: dashboard chunked caching, deterministic revision, and invalidation verified');

context.Drive.Files.get = () => { throw new Error('metadata unavailable'); };
assert.equal(context.getDashboardData(false).performance.source, 'database-v2');
assert.equal(context.getDashboardData(false).performance.source, 'database-v2');
console.log('PASS: failed metadata checks never authorize a stale cache');
