const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../apps/spk-automation/print-spk/index.html'), 'utf8');
const begin = source.indexOf('    async function ensurePrintLogin_()');
const end = source.indexOf('    // Memuat ulang halaman ini', begin);
assert.ok(begin >= 0 && end > begin);
assert.ok(!source.includes('id="printLoginForm"'), 'form login lama di halaman cetak harus dihapus');
let token = '';
let redirect = '';
let session = { status: 'success', user: { roleKey: 'admin_ppic' } };
const storage = { removeItem() {} };
const context = vm.createContext({
  EMBED_MODE: false, printAuthReady_: false,
  PRINT_AUTH_STORAGE_KEY_: 'auth', getPrintAuthToken_: () => token,
  localStorage: storage, sessionStorage: storage,
  window: { location: { pathname: '/apps/spk-automation/print-spk/', search: '?spk=A26.001', assign(value) { redirect = value; } } },
  printRpc_: async method => { assert.equal(method, 'getApprovalSession'); return session; },
  encodeURIComponent
});
vm.runInContext(source.slice(begin, end), context);
(async () => {
  assert.equal(await context.ensurePrintLogin_(), false);
  assert.match(redirect, /^\/login\/\?next=/);
  token = 'test-token'; redirect = '';
  assert.equal(await context.ensurePrintLogin_(), true);
  assert.equal(context.printAuthReady_, true);
  context.printAuthReady_ = false;
  session = { status: 'error' };
  assert.equal(await context.ensurePrintLogin_(), false);
  assert.match(redirect, /^\/login\/\?next=/);
  console.log('PASS: halaman cetak memakai sesi pusat dan mengarahkan sesi hilang ke login pusat');
})().catch(error => { console.error(error); process.exitCode = 1; });
