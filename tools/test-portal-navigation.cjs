const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/portal-auth.js'), 'utf8');
const sessionStorage = { getItem() { return JSON.stringify({ token: 'test-token' }); }, removeItem() {}, setItem() {} };
const localStorage = { getItem() { return null; }, removeItem() {}, setItem() {} };
const document = {
  head: { appendChild() {} }, documentElement: { classList: { add() {}, remove() {} } },
  readyState: 'loading', createElement() { return { style: {} }; }, addEventListener() {}
};
const window = {};
const location = { pathname: '/', search: '', hash: '', replace() {} };
vm.runInNewContext(source, { sessionStorage, localStorage, document, window, location });
const { allowed } = window.POLYTA_PORTAL_AUTH;
assert.equal(allowed('/pages/ppic/', 'marketing'), false);
assert.equal(allowed('/pages/ppic/', 'marketing', { pages: { '/pages/ppic/': true } }), true);
assert.equal(allowed('/pages/ppic/', 'admin_ppic', { pages: { '/pages/ppic/': false } }), false);
assert.equal(allowed('/pages/ppic/', 'marketing', { pages: { '/pages/ppic/': false } }, true), true);
assert.equal(allowed('/pages/admin/', 'admin_ppic'), false);
assert.equal(allowed('/pages/admin/', 'admin_ppic', { pages: { '/pages/admin/': true } }), true);
assert.equal(allowed('/apps/spk-automation/admin/', 'admin_ppic'), false);
assert.equal(allowed('/apps/spk-automation/admin/', 'admin_ppic', {}, true), true);
assert.equal(source.includes("accessLink.href = '/apps/spk-automation/admin/'"), true);
console.log('PASS: izin halaman bawaan, override per pengguna, dan akses akun master');
