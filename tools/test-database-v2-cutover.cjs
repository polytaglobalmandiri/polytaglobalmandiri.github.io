const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, '../gas-deploy/BE-Database-V2-Cutover.js'), 'utf8');
const context = vm.createContext({ console, Date, DB_SPREADSHEET_ID: 'test' });
vm.runInContext(code, context);

[
  'adminCreateDatabaseV2RuntimeSheet',
  'adminStartDatabaseV2CutoverReconcile',
  'continueDatabaseV2CutoverReconcile',
  'adminPrepareDatabaseV2MasterForCutover',
  'adminVerifyDatabaseV2RuntimeParity',
  'adminFinalizeDatabaseV2Cutover'
].forEach(name => assert.equal(typeof context[name], 'undefined'));

context.adminAuditDatabaseV2Cutover = () => ({
  spreadsheetChecksPassed: true,
  checkedAt: '2026-09-05T00:00:00.000Z',
  blockers: [],
  databaseV2: { errors: 0 },
  nativeWrite: { queuedRepairs: 0 },
  spreadsheetDependencies: { formulas: [], namedRanges: [], charts: [] },
  compatibilitySheetsRemaining: []
});
const audit = context.getDatabaseV2CutoverAudit();
assert.equal(audit.status, 'success');
assert.equal(audit.queuedRepairs, 0);
assert.deepEqual(Array.from(audit.compatibilitySheetsRemaining), []);

context.adminSmokeTestDatabaseV2ApplicationFlows = () => ({
  passed: true,
  sampleSpk: 'A26.001',
  checks: { dashboard: true, nativeWriterQueueClear: true },
  failures: [],
  dashboardRows: 9090,
  validation: { errors: 0 },
  validationWarnings: ['SPK Tracking: belum memiliki baris data'],
  nativeWrite: { queuedRepairs: 0 }
});
const readiness = context.getDatabaseV2Readiness();
assert.equal(readiness.status, 'success');
assert.equal(readiness.ready, true);
assert.equal(readiness.dashboardRows, 9090);
assert.deepEqual(Array.from(readiness.validationWarnings), ['SPK Tracking: belum memiliki baris data']);

const formulas = [['=SUM(A1:A2)', "='Database SPK'!A1"], ["='SPK Runtime V2'!B2", '']];
const dependencies = context.findDatabaseV2LegacyFormulaDependencies_({
  getSheets: () => [{
    getName: () => 'Item Queue',
    getDataRange: () => ({
      getFormulas: () => formulas,
      getCell: (row, column) => ({ getA1Notation: () => String.fromCharCode(64 + column) + row })
    })
  }]
});
assert.equal(dependencies.length, 2);
assert.equal(dependencies[0].cell, 'B1');
assert.equal(dependencies[1].cell, 'A2');

console.log('PASS: obsolete cutover controls removed; audit, readiness, and dependency checks remain');
