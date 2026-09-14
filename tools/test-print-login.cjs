const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../apps/spk-automation/print-spk/index.html'), 'utf8');
const begin = source.indexOf('    async function ensurePrintLogin_()');
const end = source.indexOf('    // Memuat ulang halaman ini', begin);
assert.ok(begin >= 0 && end > begin);
const fields = Object.fromEntries(['printLoginView','printLoginForm','printLoginButton','printLoginError','printLoginClose','printLoginPassword','printLoginEmail','printLoginRemember'].map(id => [id, { value: '', hidden: true, disabled: false, focus() {} }]));
const memory = new Map();
const storage = { removeItem: key => memory.delete(key), setItem: (key,value) => memory.set(key,value) };
let loginCalls = 0;
let failLogin = true;
const context = vm.createContext({
  EMBED_MODE: false, printAuthReady_: false, printLoginPromise_: null,
  PRINT_AUTH_STORAGE_KEY_: 'auth', getPrintAuthToken_: () => '',
  document: { getElementById: id => fields[id] },
  localStorage: storage, sessionStorage: storage,
  window: { POLYTA_PRIME_GAS_ACCESS: () => Promise.resolve() },
  printRpc_: async method => {
    assert.equal(method, 'loginApprovalUser');
    loginCalls++;
    return failLogin ? { status:'error',message:'Login ditolak' } : { status:'success',token:'test-token',user:{name:'Test'} };
  }
});
vm.runInContext(source.slice(begin, end), context);
(async () => {
  const first = context.ensurePrintLogin_();
  await fields.printLoginForm.onsubmit({ preventDefault() {} });
  assert.equal(loginCalls, 1);
  assert.equal(fields.printLoginButton.disabled, false);
  assert.match(fields.printLoginError.textContent, /Login ditolak/);
  fields.printLoginPassword.value = 'temporary';
  fields.printLoginClose.onclick();
  assert.equal(await first, false);
  assert.equal(fields.printLoginForm.onsubmit, null);
  assert.equal(fields.printLoginPassword.value, '');
  failLogin = false;
  const second = context.ensurePrintLogin_();
  await fields.printLoginForm.onsubmit({ preventDefault() {} });
  assert.equal(await second, true);
  assert.equal(loginCalls, 2, 'Reopening must not retain the old submit listener');
  assert.equal(fields.printLoginView.hidden, true);
  assert.equal(fields.printLoginForm.onsubmit, null);
  // A later expired session must present an enabled login button again.
  context.printAuthReady_ = false;
  const third = context.ensurePrintLogin_();
  assert.equal(fields.printLoginButton.disabled, false);
  fields.printLoginClose.onclick();
  assert.equal(await third, false);
  let finishLogin;
  context.printRpc_ = () => new Promise(resolve => { finishLogin = resolve; });
  const fourth = context.ensurePrintLogin_();
  const submitting = fields.printLoginForm.onsubmit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  fields.printLoginClose.onclick();
  assert.equal(await fourth, false);
  memory.clear();
  finishLogin({ status: 'success', token: 'late-token', user: {} });
  await submitting;
  assert.equal(memory.size, 0, 'Closing during login must ignore the late response');
  assert.equal(context.printAuthReady_, false);

  let finishPriming;
  context.window.POLYTA_PRIME_GAS_ACCESS = () => new Promise(resolve => { finishPriming = resolve; });
  context.printRpc_ = () => { throw new Error('A closed dialog must not send credentials'); };
  const fifth = context.ensurePrintLogin_();
  const priming = fields.printLoginForm.onsubmit({ preventDefault() {} });
  fields.printLoginClose.onclick();
  finishPriming();
  await priming;
  assert.equal(await fifth, false);
  console.log('PASS: rejected login, close/reopen, expired session, handler cleanup, and closing before/during a request');
})().catch(error => { console.error(error); process.exitCode = 1; });
