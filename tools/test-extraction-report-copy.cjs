const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const relativePath of [
  'apps/spk-automation/data-retrieval/index.html',
  'gas-deploy/FE-Penarikan-Data.html'
]) {
  const html = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const start = html.indexOf('    function getReadableExtractionMessage_(value) {');
  const end = html.indexOf('    function handleExtractionResponse(res) {', start);
  assert.ok(start > -1 && end > start, `${relativePath}: report helpers missing`);
  const context = vm.createContext({
    isBackfillMode_: () => false,
    escapeReportHtml_: value => String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  });
  vm.runInContext(html.slice(start, end), context, { filename: relativePath });

  const alreadySaved = {
    status: 'success', mode: 'sync', created: 0, skipped: 1,
    errors: 0, warnings: 0, processed: 1, total: 1
  };
  const savedHtml = context.buildExtractionReportHtml_(alreadySaved);
  assert.equal(context.getExtractionReportTitle_(alreadySaved), 'Tidak ada data baru');
  assert.match(savedHtml, /1 berkas sudah tersimpan di database/);
  assert.doesNotMatch(savedHtml, /extraction-report-stats|Semua berkas|A26\.098B|V2|>0<|1 dari 1/);

  assert.equal(context.getExtractionReportTitle_({ status: 'success', total: 1 }), 'Tidak ada perubahan');
  assert.equal(context.getExtractionReportTitle_({ status: 'success', total: 0 }), 'Tidak ada berkas SPK');

  const newSpk = {
    status: 'success', mode: 'sync', created: 1, skipped: 0,
    errors: 0, warnings: 0, processed: 1, total: 1
  };
  assert.equal(context.getExtractionReportTitle_(newSpk), 'SPK berhasil disimpan');
  assert.doesNotMatch(context.buildExtractionReportHtml_(newSpk), /extraction-report-stats|>0</);

  const mixedHtml = context.buildExtractionReportHtml_({
    status: 'success', mode: 'sync', created: 2, skipped: 1,
    errors: 0, warnings: 0, processed: 3, total: 3
  });
  assert.match(mixedHtml, /extraction-report-stats/);
  assert.match(mixedHtml, /Sudah tersimpan/);
  assert.doesNotMatch(mixedHtml, /<span class="extraction-report-stat-label">Gagal<\/span>|>0</);

  const warning = {
    status: 'warning', mode: 'sync', created: 1, skipped: 0,
    errors: 0, warnings: 1, processed: 2, total: 2,
    report: { warnings: [{ file: 'SPK.xlsx', reason: 'Database V2 perlu diperiksa.' }] }
  };
  const warningHtml = context.buildExtractionReportHtml_(warning);
  assert.equal(context.getExtractionReportTitle_(warning), 'Penarikan selesai dengan catatan');
  assert.match(warningHtml, /SPK.xlsx/);
  assert.doesNotMatch(warningHtml, /V2/);

  const backfill = {
    status: 'success', mode: 'backfill', created: 0, updated: 1,
    skipped: 0, errors: 0, warnings: 0, processed: 1, total: 1
  };
  assert.equal(context.getExtractionReportTitle_(backfill), 'Data SPK berhasil dilengkapi');
  assert.doesNotMatch(context.buildExtractionReportHtml_(backfill), /SPK baru|extraction-report-stats/);

  const mixedBackfill = { ...backfill, updated: 1, skipped: 2, processed: 3, total: 3 };
  assert.equal(context.getExtractionReportTitle_(mixedBackfill), 'Pelengkapan data selesai');
  assert.match(context.buildExtractionReportHtml_(mixedBackfill), /Dilengkapi|Tidak diubah/);

  const fatal = {
    status: 'error', mode: 'sync',
    message: 'Database V2 sedang dipakai transaksi lain.'
  };
  assert.equal(context.getExtractionReportTitle_(fatal), 'Penarikan belum berhasil');
  assert.match(context.buildExtractionReportHtml_(fatal), /Database sedang digunakan/);
  assert.doesNotMatch(context.buildExtractionReportHtml_(fatal), /V2/);
  assert.match(context.getReadableExtractionMessage_('Layanan Drive API belum aktif.'), /Akses Google Drive belum tersedia/);

  const cancelled = { status: 'success', mode: 'sync', cancelled: true, processed: 1, total: 5 };
  assert.equal(context.getExtractionReportTitle_(cancelled), 'Penarikan dibatalkan');
  assert.match(context.buildExtractionReportHtml_(cancelled), /1 dari 5 berkas sempat diperiksa/);
}

console.log('PASS: concise extraction reports for saved, new, mixed, warning, backfill, error, and cancelled cases');
