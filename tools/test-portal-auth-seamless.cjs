const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/portal-auth.js'), 'utf8');
const key = 'pgm:spk-auth-v1';

function harness(user) {
  const values = new Map([[key, JSON.stringify({ token: 'test-token', user, remember: false })]]);
  const storage = {
    getItem(name) { return values.get(name) || null; },
    setItem(name, value) { values.set(name, value); },
    removeItem(name) { values.delete(name); }
  };
  const emptyStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const classes = new Set();
  const children = [];
  const body = {
    appendChild(element) { children.push(element); return element; },
    set textContent(_) { children.length = 0; }
  };
  const document = {
    body,
    head: { appendChild() {} },
    documentElement: { classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); } } },
    readyState: 'complete',
    querySelector(selector) { return children.find(element => selector === '.pgm-auth-bar' && element.className === 'pgm-auth-bar') || null; },
    createElement() {
      return {
        style: {}, children: [],
        appendChild(element) { this.children.push(element); },
        insertBefore(element) { this.children.unshift(element); },
        remove() { const index = children.indexOf(this); if (index !== -1) children.splice(index, 1); }
      };
    },
    addEventListener() {}
  };
  const location = { pathname: '/pages/ppic/', search: '', hash: '', redirects: [], replace(url) { this.redirects.push(url); } };
  const handlers = {};
  const runner = {
    withSuccessHandler(callback) { handlers.success = callback; return this; },
    withFailureHandler(callback) { handlers.failure = callback; return this; },
    getApprovalSession(token) { assert.equal(token, 'test-token'); }
  };
  const window = { google: { script: { run: runner } } };
  vm.runInNewContext(source, { window, google: window.google, document, location, sessionStorage: storage, localStorage: emptyStorage });
  return {
    auth: window.POLYTA_PORTAL_AUTH,
    pending: () => classes.has('pgm-auth-pending'),
    bars: () => children.filter(element => element.className === 'pgm-auth-bar').length,
    denied: () => children.some(element => element.innerHTML && element.innerHTML.includes('Akses dibatasi')),
    redirects: location.redirects,
    stored: () => values.get(key),
    success: result => handlers.success(result),
    failure: error => handlers.failure(error)
  };
}

(async function () {
  const user = { name: 'PPIC', roleKey: 'admin_ppic', expiresAt: Date.now() + 60_000 };
  const allowed = harness(user);
  assert.equal(allowed.pending(), false, 'sesi tersimpan menampilkan halaman tanpa menunggu RPC');
  assert.equal(allowed.bars(), 1);
  allowed.success({ status: 'success', user });
  assert.equal((await allowed.auth.ready).name, 'PPIC');
  assert.equal(allowed.bars(), 1, 'verifikasi tidak menggandakan bilah akun');

  const revoked = harness(user);
  revoked.success({ status: 'error', message: 'Sesi dicabut' });
  assert.equal(await revoked.auth.ready, null);
  assert.equal(revoked.pending(), true);
  assert.equal(revoked.stored(), undefined);
  assert.equal(revoked.redirects.length, 1);

  const denied = harness(user);
  denied.success({ status: 'success', user: { ...user, roleKey: 'marketing' } });
  assert.equal(await denied.auth.ready, null);
  assert.equal(denied.denied(), true);
  assert.equal(denied.bars(), 1);

  const offline = harness(user);
  offline.failure(new Error('network unavailable'));
  assert.equal((await offline.auth.ready).name, 'PPIC');
  assert.equal(offline.pending(), false);
  assert.equal(offline.redirects.length, 0);

  const expired = harness({ ...user, expiresAt: Date.now() - 1 });
  assert.equal(expired.pending(), true, 'sesi kedaluwarsa tetap menunggu server');
  expired.success({ status: 'error' });
  assert.equal(await expired.auth.ready, null);
  console.log('PASS: cached portal session renders immediately; verification, revocation, denial, and offline fallback work');
})().catch(error => { console.error(error); process.exitCode = 1; });
