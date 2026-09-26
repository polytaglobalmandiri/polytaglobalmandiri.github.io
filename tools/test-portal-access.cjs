const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../gas-deploy/BE-Api.js'), 'utf8');
const calls = [];
const context = {
  console: { error() {} },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput(value) { return { setMimeType() { return JSON.parse(value); } }; } },
  requireApprovalSession_(token, roles) {
    const role = { ppic: 'admin_ppic', mixer: 'head_mixer', marketing: 'marketing' }[token];
    if (!role || (roles && !roles.includes(role))) throw new Error('Akses ditolak');
    return { roleKey: role };
  }
};
for (const match of source.matchAll(/^\s*\w+\s*:\s*(\w+)\s*,?\s*$/gm)) {
  context[match[1]] = (...args) => { calls.push({ name: match[1], args }); return { status: 'success' }; };
}
vm.createContext(context);
vm.runInContext(source, context);
for (const name of Object.keys(context.SPK_RPC_METHODS_)) {
  assert.ok(context.SPK_RPC_PUBLIC_.includes(name) || Object.hasOwn(context.SPK_RPC_ROLE_MAP_, name), `Perlu aturan akses: ${name}`);
}
function post(method, authToken = '', args = []) {
  return context.doPost({ postData: { contents: JSON.stringify({ method, authToken, args }) } });
}
assert.equal(post('loginApprovalUser').ok, true);
assert.equal(post('getDashboardData').ok, false, 'data tidak dapat dibaca tanpa sesi');
assert.equal(post('getDashboardData', 'marketing').ok, false, 'peran lain tidak dapat membaca PPIC');
assert.equal(post('getDashboardData', 'ppic').ok, true);
assert.equal(post('saveProductionMixerEntry', 'marketing').ok, false, 'legacy produksi tetap dibatasi');
assert.equal(post('saveProductionMixerEntry', 'mixer').ok, true);
assert.equal(post('saveProductionSchedule', 'mixer').ok, false);
assert.equal(post('saveProductionSchedule', 'ppic').ok, true);
assert.equal(calls.length, 4, 'fungsi bisnis hanya dipanggil setelah otorisasi');
console.log('PASS: semua metode RPC mempunyai aturan akses, sesi wajib, dan peran dipisahkan');
