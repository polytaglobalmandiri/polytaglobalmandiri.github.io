const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ console });
[
  'BE-Input-SPK.js', 'BE-Database-V2.js', 'BE-Database-V2-Mapping.js',
  'BE-Database-V2-Writer.js',
  'BE-Database-V2-Repository.js', 'BE-Dashboard.js', 'BE-SPK-Approval.js', 'BE-Serah-Terima.js'
].forEach(name => vm.runInContext(fs.readFileSync('gas-deploy/' + name, 'utf8'), context));
context.SpreadsheetApp = { openById: () => ({}) };
context.readDashboardSourceRevision_ = () => '10';
context.buildDashboardRevision_ = revision => 'b6:' + revision;
context.readDashboardCache_ = () => null;
context.writeDashboardCache_ = value => { context.cachedDashboard = value; };
context.readDatabaseV2Table_ = name => ({ records: ({
  master: [{
    SPK: 'A26.001', Tanggal: '2026-09-05', 'Jenis Order': 'Baru', Marketing: 'TEAM',
    Customer: 'CUSTOMER', Artikel: 'ITEM', 'Ukuran Blow': '50 X 0.03',
    'Ukuran Jadi': '10 X 20 X 0.03', Material: 'HDPE', 'Jumlah Order': 1000,
    'UOM Order': 'PCS', 'PCS/KG': 100, 'Keluar Bahan': 12, 'UOM KB': 'KG',
    'Total BS': 0.02, Release: 'Tidak', Tracking: 'BL'
  }],
  routing: [{ SPK: 'A26.001', Urutan: 1, 'Kode Proses': 'cutting', 'Payload JSON': '{"values":{"finishing":"BOTTOM SEAL"}}' }],
  tracking: [{ SPK: 'A26.001', 'Kode Status': 'PR' }]
})[name] || [] });
const result = context.getDashboardData(true);
assert.equal(result.totalSPK, 1);
assert.equal(result.tableData[0][11], 0);
assert.equal(result.tableData[0][12], 'PR');
assert.equal(result.volumeKgBySpk['A26.001'], 10);
assert.deepEqual(Array.from(result.dashboardRecapBySpk['A26.001'].routing), ['Bottom Seal']);
assert.equal(result.performance.source, 'database-v2');
const tracking = context.getDashboardTrackingData();
assert.equal(tracking.trackingBySpk['A26.001'], 'PR');
assert.equal(tracking.trackingColumn, 0);
context.readDatabaseV2Spk_ = () => ({
  master: { Customer: 'CUSTOMER', Artikel: 'ITEM', Tanggal: '2026-09-05' },
  routing: [{ 'Kode Proses': 'BLOWING' }, { 'Kode Proses': 'PRINTING' }]
});
const approvalDetails = context.getApprovalSpkDetails_({ 'A26.001': true });
assert.deepEqual(Array.from(approvalDetails['A26.001'].routing), ['blowing', 'printing']);
context.ensureHandoverSheet_ = () => ({});
context.readHandoverHistory_ = () => [];
context.buildHandedSpkRouteMap_ = () => ({});
context.getDatabaseV2SpkDirectory_ = () => ({ spks: ['A26.001', 'B26.001'] });
assert.equal(context.getHandoverOverview().data.summary.tersedia, 2);
const materialList = context.getKeluarBahanManagerData(true);
assert.equal(materialList.status, 'success');
assert.equal(materialList.data[0].rowNumber, 0);
assert.equal(materialList.data[0].complete, true);
assert.equal(materialList.performance.source, 'database-v2');
console.log('PASS: dashboard reads master, routing, tracking, status, and KG volume from native V2');
