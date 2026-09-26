const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/gas-rpc.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '../gas-deploy/BE-Api.js'), 'utf8');
const backendCalls = [];
const backend = {
  console: { error() {} },
  requireApprovalSession_(token, roles) { if (token !== 'test-token') throw new Error('Sesi wajib'); return { userId: 'test-user', roleKey: 'admin_ppic' }; },
  getApprovalUserById_() { return { roleKey: 'admin_ppic' }; },
  isPortalOwner_() { return false; },
  portalMethodOverride_() { return null; },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput(text) { return { setMimeType(type) { return { type, payload: JSON.parse(text) }; } }; }
  },
  HtmlService: { createHtmlOutput() { throw new Error('Raw JSON POST must never generate an iframe response'); } }
};
for (const match of apiSource.matchAll(/^\s*\w+\s*:\s*(\w+)\s*,?\s*$/gm)) {
  backend[match[1]] = (...args) => { backendCalls.push({ method: match[1], args }); return { status: 'success' }; };
}
vm.runInNewContext(apiSource, backend);
const response = backend.doPost({ postData: { contents: JSON.stringify({ method: 'loginApprovalUser', args: ['test@example.invalid', 'test-password', true] }) } });
assert.equal(response.type, 'application/json');
assert.equal(response.payload.ok, true);
assert.equal(backendCalls.length, 1);
assert.equal(backendCalls[0].method, 'loginApprovalUser');
assert.deepEqual(JSON.parse(JSON.stringify(backendCalls[0].args)), ['test@example.invalid', 'test-password', true]);
assert.equal(backend.doPost({ postData: { contents: JSON.stringify({ method: 'getDashboardData', args: [] }) } }).payload.ok, false);
assert.equal(backend.doPost({ postData: { contents: JSON.stringify({ method: 'getDashboardData', args: [], authToken: 'test-token' }) } }).payload.ok, true);
assert.equal(backend.doPost({ postData: { contents: '{bad json' } }).payload.ok, false);
assert.equal(backend.doPost({ postData: { contents: '{"method":"notAllowed","args":[]}' } }).payload.ok, false);
assert.equal(backendCalls.length, 2, 'Malformed or unknown requests must not invoke application functions');
function client(fetch) {
  const calls = [];
  const window = {
    AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => { calls.push({ url, options }); return fetch(url, options); }
  };
  const document = { createElement() { throw new Error('POST must not use an iframe, form, or JSONP'); } };
  vm.runInNewContext(source, { window, document, console });
  const rpc = (method, ...args) => new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args));
  return { window, calls, rpc };
}
(async () => {
  const successful = client(async () => ({ ok: true, json: async () => ({ ok: true, result: { status: 'success' } }) }));
  for (const [method, args] of [
    ['loginApprovalUser', ['test@example.invalid', 'test-password', false]],
    ['getApprovalQueue', ['test-token']],
    ['getSpkPrintData', ['TEST.001', 0, 'test-token', true]],
    ['submitDatabase', [{ authToken: 'test-token', spk: 'TEST.001' }]],
    ['saveHandoverByRouting', [{ groups: [] }]],
    ['getMaterialMasterData', [false]]
  ]) {
    assert.equal((await successful.rpc(method, ...args)).status, 'success');
    const { url, options } = successful.calls.at(-1);
    assert.equal(new URL(url).search, '', 'Credentials must never enter the URL');
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'omit');
    assert.match(options.headers['Content-Type'], /^text\/plain/);
    assert.deepEqual(JSON.parse(options.body), { method, args, authToken: '' });
  }
  assert.equal(successful.calls.length, 6);
  assert.equal(successful.window.POLYTA_GAS_TRANSPORT().post, 'sehat');
  const appError = client(async () => ({ ok: true, json: async () => ({ ok: false, error: { message: 'Izin ditolak' } }) }));
  await assert.rejects(appError.rpc('approveSpk', 'test-token', 'TEST.001'), /Izin ditolak/);
  assert.equal(appError.calls.length, 1);
  for (const failure of [
    async () => { throw new TypeError('Network failed'); },
    async () => ({ ok: false, status: 503 }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('HTML instead of JSON'); } }),
    async () => { const error = new Error('Timed out'); error.name = 'AbortError'; throw error; }
  ]) {
    const broken = client(failure);
    await assert.rejects(broken.rpc('submitDatabase', { spk: 'TEST.001' }), /Periksa hasil transaksi sebelum mengirim ulang/);
    assert.equal(broken.calls.length, 1, 'An uncertain mutation must never be retried');
    const readOnly = client(failure);
    await assert.rejects(readOnly.rpc('getApprovalQueue', 'test-token'), /Balasan server|Waktu tunggu/);
    assert.equal(readOnly.calls.length, 2, 'A read must get one extra attempt when the transport fails');
  }
  let firstReadAttempt = true;
  const flaky = client(async () => {
    if (firstReadAttempt) { firstReadAttempt = false; return { ok: false, status: 404 }; }
    return { ok: true, json: async () => ({ ok: true, result: { status: 'success' } }) };
  });
  assert.equal((await flaky.rpc('getApprovalSession', 'test-token')).status, 'success');
  assert.equal(flaky.calls.length, 2, 'A retried read must recover from the Apps Script 404 hop');
  const rejectedRead = client(async () => ({ ok: true, json: async () => ({ ok: false, error: { message: 'Sesi berakhir' } }) }));
  await assert.rejects(rejectedRead.rpc('getApprovalQueue', 'test-token'), /Sesi berakhir/);
  assert.equal(rejectedRead.calls.length, 1, 'Application errors must not be retried');
  console.log('PASS: backend raw POST contract, credentialed POST without frames/URL secrets, reads and writes, application/network/HTTP/JSON/timeout errors, no mutation retries, one retry for reads');
})().catch(error => { console.error(error); process.exitCode = 1; });
