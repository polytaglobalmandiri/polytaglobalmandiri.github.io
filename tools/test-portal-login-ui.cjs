const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../login/login.js'), 'utf8');
const key = 'pgm:spk-auth-v1';

function harness(search) {
  const nodes = {};
  for (const id of ['loginForm', 'email', 'password', 'submit', 'submitLabel', 'message', 'togglePassword', 'capsHint', 'remember']) {
    nodes[id] = {
      value: '', textContent: '', type: id === 'password' ? 'password' : '',
      attributes: {}, listeners: {},
      classList: { toggle() {} },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      focus() {}
    };
  }
  const makeStorage = () => {
    const entries = new Map();
    return {
      getItem(name) { return entries.get(name) || null; },
      setItem(name, value) { entries.set(name, value); },
      removeItem(name) { entries.delete(name); }
    };
  };
  const sessionStorage = makeStorage();
  const localStorage = makeStorage();
  const redirects = [];
  const calls = [];
  let response = { status: 'error', message: 'Email atau password tidak sesuai.' };
  const runner = {
    withSuccessHandler(callback) { this.success = callback; return this; },
    withFailureHandler(callback) { this.failure = callback; return this; },
    loginApprovalUser(...args) { calls.push(args); queueMicrotask(() => this.success(response)); }
  };
  vm.runInNewContext(source, {
    URLSearchParams,
    document: { getElementById(id) { return nodes[id]; } },
    location: { search, replace(url) { redirects.push(url); } },
    google: { script: { run: runner } },
    sessionStorage, localStorage
  });
  return { nodes, sessionStorage, localStorage, redirects, calls, respond(value) { response = value; } };
}

(async function () {
  const app = harness('?next=%2Fpages%2Fppic%2F');
  app.nodes.togglePassword.listeners.click();
  assert.equal(app.nodes.password.type, 'text');
  assert.equal(app.nodes.togglePassword.attributes['aria-pressed'], 'true');
  app.nodes.togglePassword.listeners.click();
  assert.equal(app.nodes.password.type, 'password');

  app.nodes.email.value = 'test@example.invalid';
  app.nodes.password.value = 'wrong';
  await app.nodes.loginForm.listeners.submit({ preventDefault() {} });
  assert.equal(app.nodes.message.textContent, 'Email atau password tidak sesuai.');
  assert.equal(app.nodes.submit.disabled, false);
  assert.equal(app.nodes.password.attributes['aria-invalid'], 'true');
  assert.deepEqual(app.redirects, []);

  app.respond({ status: 'success', token: 'test-token', user: { roleKey: 'admin_ppic' } });
  app.nodes.password.value = 'correct';
  app.nodes.remember.checked = true;
  await app.nodes.loginForm.listeners.submit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(app.localStorage.getItem(key)), {
    token: 'test-token', user: { roleKey: 'admin_ppic' }, remember: true
  });
  assert.equal(app.nodes.password.value, '');
  assert.deepEqual(app.redirects, ['/pages/ppic/']);

  const unsafe = harness('?next=%2F%2Fevil.example');
  unsafe.nodes.email.value = 'test@example.invalid';
  unsafe.nodes.password.value = 'correct';
  unsafe.respond({ status: 'success', token: 'another-token', user: {} });
  await unsafe.nodes.loginForm.listeners.submit({ preventDefault() {} });
  assert.deepEqual(unsafe.redirects, ['/']);
  console.log('PASS: login design keeps password toggle, failure recovery, session storage, remember, and safe redirect');
})().catch(error => { console.error(error); process.exitCode = 1; });
