const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5517';
assert.match(base, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/, 'Only a local test server is allowed');
const user = { name: 'Pengguna Uji', roleKey: 'head_printing', roleLabel: 'Kepala Printing', department: 'Printing' };
const material = { rowNumber: 2, idBahan: 'TEST-MAT', kodeBahan: 'TEST', namaBahan: 'Bahan Uji', kategori: 'RESIN', stokReferensiKg: 25, status: 'AKTIF', uom: 'KG' };
const printData = { spk: 'TEST.001', tanggal: '2026-09-14', customer: 'Customer Uji', artikel: 'Artikel Uji', material: 'Bahan Uji', jumlahOrder: 100, uomOrder: 'KG', release: 'Tidak', canPrint: false, proses: { blowing: true }, komposisi: [] };
const fixtures = {
  getDashboardData: { totalSPK: 0, tableData: [], volumeKgBySpk: {}, dashboardRecapBySpk: {}, revision: 'test-1' },
  getDashboardDataRevision: { status: 'success', revision: 'test-1' },
  getDashboardTrackingData: { revision: 'test-1', trackingBySpk: {} },
  getSpkYearPreference: { status: 'success', year: 2026 },
  getInputSpkOptionsFast: { status: 'success', marketingOptions: ['Marketing Uji'], customerOptions: ['Customer Uji'], machineOptions: {} },
  getSpkExistenceSnapshot: { status: 'success', spks: [], marketingOptions: [], customerOptions: [], machineOptions: {} },
  getMasterFormOptions: { status: 'success', customers: [], brands: [] },
  getApprovalBootstrapStatus: { status: 'success', needsBootstrap: false, roles: [] },
  getApprovalSession: { status: 'error', authenticated: false, message: 'Sesi login berakhir. Silakan login kembali.' },
  getApprovalQueue: { status: 'success', items: [], summary: {} },
  logoutApprovalUser: { status: 'success' },
  getMaterialMasterData: { rows: [material] },
  getKeluarBahanManagerData: { status: 'success', data: [], summary: {} },
  getHandoverOverview: { status: 'success', data: { history: [], summary: { tersedia: 1 } } },
  getHandoverSpkDetails: { status: 'success', found: true, data: { spk: 'TEST.001', pelanggan: 'Customer Uji', routings: [{ key: 'blowing', label: 'Blowing', sudahDiserahkan: false }] } },
  getFolderData: { status: 'success', id: 'test-folder', name: 'Folder Uji', subFolders: [], sourceFiles: [] },
  getActiveExtractionJob: { status: 'success', job: null },
  getSpkPrintData: { status: 'success', found: true, data: printData },
  getSpkData: { status: 'success', found: true, data: printData }
};
const failures = [];
let browser;

async function scenario(label, test, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const calls = [];
  const issues = [];
  const overrides = {};
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === base) {
      if (url.pathname === '/assets/data/materials.json') issues.push('Unexpected bundled material fallback');
      return route.continue();
    }
    if (url.origin !== 'https://script.google.com') return route.abort();
    if (request.method() === 'GET' && !url.searchParams.has('payload')) return route.fulfill({ status: 200, body: '' });
    const payload = request.method() === 'POST'
      ? JSON.parse(request.postData())
      : JSON.parse(url.searchParams.get('payload'));
    calls.push({ ...payload, verb: request.method(), url: request.url() });
    const override = overrides[payload.method];
    let result = typeof override === 'function' ? await override(payload.args) : override;
    if (result === undefined) result = fixtures[payload.method];
    if (result === undefined) {
      issues.push(`Unmocked RPC: ${payload.method}`);
      return route.abort();
    }
    if (result === 'NETWORK_ERROR') return route.abort();
    const body = result instanceof Error ? { ok: false, error: { message: result.message } } : { ok: true, result };
    const callback = url.searchParams.get('callback');
    return route.fulfill({
      status: 200,
      contentType: callback ? 'application/javascript' : 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: callback ? `${callback}(${JSON.stringify(body)});` : JSON.stringify(body)
    });
  });
  const page = await context.newPage();
  page.on('pageerror', error => issues.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(base + '/') && response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  try {
    await test({ page, calls, overrides });
    assert.deepEqual(issues, []);
    console.log(`PASS: ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`FAIL: ${label}\n${error.stack}\n${issues.join('\n')}`);
  } finally {
    await context.close();
  }
}

async function visible(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible', timeout: 10000 });
}

(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true });
  const routes = ['/', '/pages/marketing/', '/pages/ppic/', '/pages/purchasing/', '/pages/production/', '/pages/finance/', '/pages/support/', '/pages/admin/', '/dokumentasi/', '/apps/spk-automation/', '/apps/spk-automation/create-spk/', '/apps/spk-automation/dashboard/', '/apps/spk-automation/material-issue/', '/apps/spk-automation/data-retrieval/', '/apps/spk-automation/approval/', '/apps/spk-automation/handover/', '/apps/spk-automation/material-management/'];
  for (const width of [1440, 390]) {
    for (const route of routes) {
      await scenario(`page ${route} at ${width}px`, async ({ page }) => {
        const response = await page.goto(base + route, { waitUntil: 'load' });
        assert.equal(response.status(), 200);
        await page.waitForTimeout(800);
        assert.ok((await page.locator('body').innerText()).trim());
        assert.ok(await page.title());
      }, { width, height: 1000 });
    }
    await scenario(`portal search, theme persistence, and pins at ${width}px`, async ({ page }) => {
      await page.goto(base + '/pages/ppic/');
      await page.keyboard.press('/');
      assert.equal(await page.locator('#q').evaluate(element => element === document.activeElement), true);
      await page.locator('#q').fill('no-matching-link-9381');
      assert.match(await page.locator('#qcount').innerText(), /^0 \//);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#q').inputValue(), '');
      await page.locator('[aria-label="Ganti mode terang / gelap"]').click();
      const theme = await page.locator('html').getAttribute('data-theme');
      await page.locator('.tile__pin').first().click();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pgm:pins')).length), 1);
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      await page.goto(base + '/');
      await visible(page, '[data-pinned-section]');
    }, { width, height: 1000 });
    await scenario(`standalone SPK creator login cancellation, role restriction, and token wiring at ${width}px`, async ({ page, calls, overrides }) => {
      overrides.loginApprovalUser = { status: 'success', token: 'test-token', user };
      await page.goto(base + '/apps/spk-automation/create-spk/');
      await page.evaluate(() => { void ensureCreatorApprovalLogin_().then(auth => { window.creatorTestAuth = auth; }); });
      await visible(page, '#approvalLoginEmail');
      await page.locator('.swal2-cancel').click();
      await page.waitForFunction(() => window.creatorTestAuth === null);
      assert.equal(calls.filter(call => call.method === 'submitDatabase').length, 0);
      await page.evaluate(() => { void ensureCreatorApprovalLogin_().then(auth => { window.creatorTestAuth = auth; }); });
      await visible(page, '#approvalLoginEmail');
      await page.locator('#approvalLoginEmail').fill('test@example.invalid');
      await page.locator('#approvalLoginPassword').fill('test-password');
      await page.locator('.swal2-confirm').click();
      await visible(page, '.swal2-validation-message');
      assert.match(await page.locator('.swal2-validation-message').innerText(), /Hanya akun Admin PPIC/);
      overrides.loginApprovalUser = { status: 'success', token: 'creator-test-token', user: { ...user, roleKey: 'admin_ppic' } };
      await page.locator('.swal2-confirm').click();
      await page.waitForFunction(() => window.creatorTestAuth && window.creatorTestAuth.token);
      overrides.getApprovalSession = { status: 'success', user: { ...user, roleKey: 'admin_ppic' } };
      overrides.submitDatabase = { status: 'error', message: 'Simulasi validasi server: data formulir belum lengkap.' };
      await page.evaluate(() => {
        // Isolate authentication/payload wiring; full wizard validation is a separate concern.
        validateAllSteps_ = () => true;
        getActiveTargetSpkState_ = () => ({ duplicate: false, state: 'available' });
        getActiveSpkValue_ = () => 'TEST.001';
        void submitDatabase_();
      });
      await page.waitForFunction(() => document.querySelector('.swal2-title')?.textContent === 'Gagal Menyimpan');
      const submits = calls.filter(call => call.method === 'submitDatabase');
      assert.equal(submits.length, 1);
      assert.equal(submits[0].args[0].authToken, 'creator-test-token');
      assert.equal(submits[0].verb, 'POST');
    }, { width, height: 1000 });
    await scenario(`approval login rejection, password toggle, session restore, and logout at ${width}px`, async ({ page, calls, overrides }) => {
      overrides.loginApprovalUser = { status: 'error', message: 'Email atau password tidak sesuai.' };
      await page.goto(base + '/apps/spk-automation/approval/');
      await visible(page, '#loginView');
      await page.locator('#loginEmail').fill('test@example.invalid');
      await page.locator('#loginPassword').fill('wrong-password');
      await page.locator('#toggleLoginPassword').click();
      assert.equal(await page.locator('#loginPassword').getAttribute('type'), 'text');
      await page.locator('#loginButton').click();
      await visible(page, '.swal2-confirm');
      assert.equal(await page.locator('#loginButton').isEnabled(), true);
      assert.equal(await page.locator('#loginPassword').inputValue(), '');
      await page.locator('.swal2-confirm').click();
      overrides.loginApprovalUser = { status: 'success', token: 'test-token', user };
      await page.locator('#rememberMe').uncheck();
      await page.locator('#loginPassword').fill('correct-password');
      await page.locator('#loginButton').click();
      await visible(page, '#appView');
      assert.equal(await page.locator('#adminPanel').isHidden(), true);
      assert.ok(await page.evaluate(() => sessionStorage.getItem('pgm:spk-auth-v1')));
      assert.equal(await page.evaluate(() => localStorage.getItem('pgm:spk-auth-v1')), null);
      overrides.getApprovalSession = { status: 'success', user };
      await page.reload();
      await visible(page, '#appView');
      await page.locator('#logoutButton').click();
      await visible(page, '#loginView');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('pgm:spk-auth-v1')), null);
      assert.equal(calls.filter(call => call.method === 'loginApprovalUser').length, 2);
      assert.ok(calls.every(call => !call.url.includes('test-token') && !call.url.includes('password')));
    }, { width, height: 1000 });
  }
  await scenario('materials load, filter, detail, simulated save, and explicit connection failure', async ({ page, calls, overrides }) => {
    await page.goto(base + '/apps/spk-automation/material-management/');
    await visible(page, '[data-detail="2"]');
    assert.equal(await page.locator('#totalCount').innerText(), '1');
    await page.locator('#searchInput').fill('Tidak ditemukan');
    await visible(page, '#emptyState');
    await page.locator('#searchInput').fill('');
    await page.locator('[data-detail="2"]').click();
    await visible(page, '#detailMaterialModal');
    await page.locator('#detailEditButton').click();
    overrides.saveMaterialMaster = { ok: true, message: 'Simulasi simpan berhasil.' };
    await page.locator('#saveButton').click();
    await page.waitForFunction(() => document.getElementById('materialModal').hidden);
    assert.equal(calls.filter(call => call.method === 'saveMaterialMaster').length, 1);
    overrides.getMaterialMasterData = 'NETWORK_ERROR';
    await page.locator('#refreshButton').click();
    await page.waitForFunction(() => document.getElementById('resultCaption').textContent.includes('Data terbaru tidak dapat dimuat'));
    assert.equal(await page.locator('#totalCount').innerText(), '0');
    assert.equal(await page.locator('.material-row').count(), 0);
    assert.equal(await page.locator('#refreshButton').isEnabled(), true);
  });
  await scenario('handover POST read, lookup, duplicate prevention, and recovery after network failure', async ({ page, calls, overrides }) => {
    await page.goto(base + '/apps/spk-automation/handover/');
    await visible(page, '#handoverForm');
    await page.locator('#manualSpkInput').fill('TEST.001');
    await page.locator('#addSpkButton').click();
    await page.waitForFunction(() => document.getElementById('scannedCount').textContent.includes('1'));
    await page.locator('#manualSpkInput').fill('TEST.001');
    await page.locator('#addSpkButton').click();
    assert.equal(calls.filter(call => call.method === 'getHandoverSpkDetails').length, 1);
    await page.locator('#recipient-blowing').fill('Penerima Uji');
    const canvas = page.locator('canvas[data-signature-canvas]');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 40, { steps: 8 });
    await page.mouse.up();
    overrides.saveHandoverByRouting = 'NETWORK_ERROR';
    await page.locator('#submitButton').click();
    await visible(page, '#formAlert');
    assert.match(await page.locator('#formAlert').innerText(), /Periksa hasil transaksi sebelum mengirim ulang/);
    assert.equal(calls.filter(call => call.method === 'saveHandoverByRouting').length, 1);
    assert.equal(await page.locator('#submitButton').isEnabled(), true);
    overrides.saveHandoverByRouting = { status: 'success', message: 'Simulasi berhasil.' };
    await page.locator('#submitButton').click();
    await page.waitForFunction(() => document.getElementById('scannedCount').textContent.includes('0'));
    overrides.getHandoverOverview = 'NETWORK_ERROR';
    await page.locator('#refreshButton').click();
    await visible(page, '#errorState');
    overrides.getHandoverOverview = fixtures.getHandoverOverview;
    await page.locator('#retryButton').click();
    await visible(page, '#handoverForm');
    assert.ok(calls.every(call => call.verb === 'POST'));
    assert.equal(await page.locator('iframe').count(), 0);
  });
  await scenario('print without SPK shows error instead of loading forever', async ({ page, calls }) => {
    await page.goto(base + '/apps/spk-automation/print-spk/');
    await visible(page, '#printRoot .error-card');
    assert.match(await page.locator('#printRoot').innerText(), /Nomor SPK tidak tersedia/);
    assert.equal(calls.length, 0);
    assert.equal(await page.locator('#printButton').isDisabled(), true);
  });
  await scenario('expired print session: login close/reopen, remember, and failed data reload', async ({ page, calls, overrides }) => {
    overrides.getSpkPrintData = { status: 'error', message: 'Sesi login berakhir. Silakan login kembali.' };
    overrides.loginApprovalUser = { status: 'success', token: 'test-token', user };
    await page.goto(base + '/apps/spk-automation/print-spk/?spk=TEST.001');
    await visible(page, '#printLoginView');
    await page.locator('#printLoginPassword').fill('discarded');
    await page.locator('#printLoginClose').click();
    assert.equal(await page.locator('#printLoginPassword').inputValue(), '');
    await page.evaluate(() => { void ensurePrintLogin_(); });
    await visible(page, '#printLoginView');
    await page.locator('#printLoginEmail').fill('test@example.invalid');
    await page.locator('#printLoginPassword').fill('test-password');
    await page.locator('#printLoginRemember').check();
    overrides.getSpkPrintData = 'NETWORK_ERROR';
    await page.evaluate(() => { void ensurePrintLogin_().then(ok => { if (ok) return reloadPrintDataForSession_(); }); });
    await page.locator('#printLoginButton').click();
    await page.waitForFunction(() => document.getElementById('printLoginView').hidden);
    await page.waitForFunction(() => document.getElementById('printRoot').textContent.includes('Balasan server tidak dapat diterima'));
    assert.equal(calls.filter(call => call.method === 'loginApprovalUser').length, 1);
    assert.ok(await page.evaluate(() => localStorage.getItem('pgm:spk-auth-v1')));
    assert.equal(await page.evaluate(() => sessionStorage.getItem('pgm:spk-auth-v1')), null);
  });
  await scenario('print permission denial never sends a release mutation', async ({ page, calls, overrides }) => {
    overrides.getApprovalSession = { status: 'success', user };
    await page.addInitScript(() => sessionStorage.setItem('pgm:spk-auth-v1', JSON.stringify({ token: 'test-token' })));
    await page.goto(base + '/apps/spk-automation/print-spk/?spk=TEST.001');
    await page.waitForFunction(() => !document.getElementById('printButton').disabled);
    await page.locator('#printButton').click();
    await page.waitForFunction(() => document.getElementById('toolbarStatusText').textContent.includes('Cetak ditolak'));
    assert.equal(calls.filter(call => call.method === 'markSpkReleasedForPrint').length, 0);
  });
  await scenario('simulated print release failure and success only print after confirmation', async ({ page, calls, overrides }) => {
    overrides.getApprovalSession = { status: 'success', user: { ...user, roleKey: 'admin_ppic' } };
    overrides.getSpkPrintData = { status: 'success', found: true, data: { ...printData, canPrint: true, canRelease: true } };
    overrides.markSpkReleasedForPrint = 'NETWORK_ERROR';
    await page.addInitScript(() => {
      sessionStorage.setItem('pgm:spk-auth-v1', JSON.stringify({ token: 'test-token' }));
      window.printCalls = 0;
      window.print = () => { window.printCalls++; };
    });
    await page.goto(base + '/apps/spk-automation/print-spk/?spk=TEST.001');
    await page.waitForFunction(() => !document.getElementById('printButton').disabled);
    await page.locator('#printButton').click();
    await page.waitForFunction(() => document.getElementById('toolbarStatusText').textContent.includes('Periksa hasil transaksi'));
    assert.equal(await page.evaluate(() => window.printCalls), 0);
    assert.equal(calls.filter(call => call.method === 'markSpkReleasedForPrint').length, 1);
    overrides.markSpkReleasedForPrint = { status: 'success', release: 'YA', message: 'Simulasi berhasil.' };
    await page.locator('#printButton').click();
    await page.waitForFunction(() => window.printCalls === 1);
    assert.equal(calls.filter(call => call.method === 'markSpkReleasedForPrint').length, 2);
  });
  await scenario('diagnostics uses current POST transport without frames', async ({ page, calls }) => {
    await page.goto(base + '/apps/spk-automation/approval/diagnostik/');
    await page.locator('#runTransport').click();
    await page.waitForFunction(() => document.getElementById('out').textContent.includes('KESIMPULAN: POST JSON berhasil'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].verb, 'POST');
    assert.equal(await page.locator('iframe').count(), 0);
  });
  assert.deepEqual(failures, [], 'Browser scenarios failed');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
