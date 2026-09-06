// ==========================================
// DATABASE SPK V2 - AUDIT & READINESS
// ==========================================
// Pemeriksaan baca-saja setelah cutover native V2 selesai.

const DB_V2_LEGACY_SHEET_NAME = 'Database SPK';
const DB_V2_RUNTIME_SHEET_NAME = 'SPK Runtime V2';

function adminAuditDatabaseV2Cutover() {
  const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const legacy = spreadsheet.getSheetByName(DB_V2_LEGACY_SHEET_NAME);
  const runtime = spreadsheet.getSheetByName(DB_V2_RUNTIME_SHEET_NAME);
  const validation = validateDatabaseV2({ maxRows: 100000 });
  const nativeWrite = getDatabaseV2NativeWriteStatus();
  const formulaDependencies = findDatabaseV2LegacyFormulaDependencies_(spreadsheet);
  const namedRangeDependencies = spreadsheet.getNamedRanges().map(function(namedRange) {
    const range = namedRange.getRange();
    return [DB_V2_LEGACY_SHEET_NAME, DB_V2_RUNTIME_SHEET_NAME].indexOf(range.getSheet().getName()) > -1
      ? { name: namedRange.getName(), range: range.getA1Notation() }
      : null;
  }).filter(Boolean);
  const chartDependencies = [];
  spreadsheet.getSheets().forEach(function(sheet) {
    sheet.getCharts().forEach(function(chart) {
      const legacyRanges = chart.getRanges().filter(function(range) {
        return [DB_V2_LEGACY_SHEET_NAME, DB_V2_RUNTIME_SHEET_NAME].indexOf(range.getSheet().getName()) > -1;
      }).map(function(range) { return range.getA1Notation(); });
      if (legacyRanges.length) {
        chartDependencies.push({ sheet: sheet.getName(), ranges: legacyRanges });
      }
    });
  });

  const blockers = [];
  if (!validation.summary.readyForNativeCutover) blockers.push('Validator native Database V2 belum lulus.');
  if (nativeWrite.queuedRepairs) blockers.push('Masih ada antrean perbaikan writer native.');
  if (formulaDependencies.length) blockers.push('Masih ada formula yang merujuk Database SPK lama.');
  if (namedRangeDependencies.length) blockers.push('Masih ada named range pada Database SPK lama.');
  if (chartDependencies.length) blockers.push('Masih ada chart yang memakai Database SPK lama.');

  const report = {
    checkedAt: new Date().toISOString(),
    legacy: legacy ? {
      sheetId: legacy.getSheetId(),
      rows: Math.max(0, legacy.getLastRow() - DB_DATA_START_ROW + 1),
      columns: legacy.getLastColumn()
    } : null,
    runtime: runtime ? {
      sheetId: runtime.getSheetId(),
      rows: Math.max(0, runtime.getLastRow() - DB_DATA_START_ROW + 1),
      columns: runtime.getLastColumn(),
      hidden: runtime.isSheetHidden()
    } : null,
    databaseV2: validation.summary,
    nativeWrite: nativeWrite,
    spreadsheetDependencies: {
      formulas: formulaDependencies,
      namedRanges: namedRangeDependencies,
      charts: chartDependencies
    },
    blockers: blockers,
    spreadsheetChecksPassed: blockers.length === 0,
    readyToRemoveLegacySheet: false,
    deploymentVerificationRequired: true,
    legacySheetRemoved: !legacy,
    nativeAuthority: DB_V2_SCHEMA.master.sheet,
    compatibilitySheetsRemaining: [legacy, runtime].filter(Boolean).map(function(sheet) {
      return sheet.getName();
    })
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

// Endpoint diagnostik baca-saja. Sengaja memeriksa dua sheet kompatibilitas
// untuk menemukan referensi yang harus dilepas sebelum keduanya dihapus.
function getDatabaseV2CutoverAudit() {
  const report = adminAuditDatabaseV2Cutover();
  return {
    status: report.spreadsheetChecksPassed ? 'success' : 'blocked',
    checkedAt: report.checkedAt,
    spreadsheetChecksPassed: report.spreadsheetChecksPassed,
    blockers: report.blockers,
    databaseV2: report.databaseV2,
    queuedRepairs: report.nativeWrite ? report.nativeWrite.queuedRepairs : null,
    dependencies: report.spreadsheetDependencies,
    compatibilitySheetsRemaining: report.compatibilitySheetsRemaining
  };
}

function adminSmokeTestDatabaseV2ApplicationFlows() {
  const firstSpk = getDatabaseV2SpkDirectory_().spks[0] || '';
  if (!firstSpk) throw new Error('Tidak ada SPK sampel pada SPK Master.');
  const repeatOrder = getSpkData(firstSpk);
  const edit = getSpkEditData(firstSpk, 0);
  const print = getSpkPrintData(firstSpk, 0, '', false);
  const manager = getKeluarBahanManagerDetail(firstSpk, 0);
  // Cache Dashboard sudah memiliki shape-version native V2 dan selalu
  // dibersihkan oleh mutasi. Jangan paksa regenerasi 9.000+ baris pada setiap
  // readiness check karena dapat melewati batas waktu web app.
  const dashboard = getDashboardData(false);
  const approval = getApprovalSpkDetails_((function() {
    const keys = {}; keys[firstSpk] = true; return keys;
  })());
  const validation = validateDatabaseV2({ maxRows: 100000 });
  const nativeWrite = getDatabaseV2NativeWriteStatus();
  const checks = {
    repeatOrder: repeatOrder && repeatOrder.status === 'success' && repeatOrder.found,
    edit: edit && edit.status === 'success' && edit.found,
    print: print && print.status === 'success' && print.found,
    manager: manager && manager.status === 'success',
    dashboard: dashboard && !dashboard.error && dashboard.totalSPK > 0,
    approval: Boolean(approval && approval[firstSpk]),
    validator: validation.summary.errors === 0,
    nativeWriterQueueClear: nativeWrite.queuedRepairs === 0
  };
  const failures = Object.keys(checks).filter(function(key) { return !checks[key]; });
  const result = {
    passed: failures.length === 0,
    sampleSpk: firstSpk,
    checks: checks,
    failures: failures,
    dashboardRows: dashboard && dashboard.tableData ? dashboard.tableData.length : 0,
    validation: validation.summary,
    validationWarnings: validation.warnings.slice(),
    nativeWrite: nativeWrite
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

// Pemeriksaan baca-saja yang dapat dipanggil deployment untuk membuktikan
// alur publik benar-benar memakai data V2. Tidak menjalankan perubahan data
// atau penghapusan sheet kompatibilitas.
function getDatabaseV2Readiness() {
  const result = adminSmokeTestDatabaseV2ApplicationFlows();
  return {
    status: result.passed ? 'success' : 'error',
    ready: result.passed,
    checkedAt: new Date().toISOString(),
    sampleSpk: result.sampleSpk,
    checks: result.checks,
    failures: result.failures,
    dashboardRows: result.dashboardRows,
    validation: result.validation,
    queuedRepairs: result.nativeWrite ? result.nativeWrite.queuedRepairs : null,
    validationWarnings: result.validationWarnings
  };
}

function findDatabaseV2LegacyFormulaDependencies_(spreadsheet) {
  const dependencies = [];
  spreadsheet.getSheets().forEach(function(sheet) {
    if ([DB_V2_LEGACY_SHEET_NAME, DB_V2_RUNTIME_SHEET_NAME].indexOf(sheet.getName()) > -1) return;
    const range = sheet.getDataRange();
    const formulas = range.getFormulas();
    formulas.forEach(function(row, rowIndex) {
      row.forEach(function(formula, columnIndex) {
        const normalized = String(formula || '').toLowerCase();
        if (normalized.indexOf('database spk') === -1 && normalized.indexOf('spk runtime v2') === -1) return;
        dependencies.push({
          sheet: sheet.getName(),
          cell: range.getCell(rowIndex + 1, columnIndex + 1).getA1Notation(),
          formula: String(formula).slice(0, 500)
        });
      });
    });
  });
  return dependencies;
}
