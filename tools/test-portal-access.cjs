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
    const role = { ppic: 'admin_ppic', mixer: 'head_mixer', marketing: 'marketing', owner: 'marketing', blocked: 'admin_ppic', granted: 'marketing' }[token];
    if (!role || (roles && !roles.includes(role))) throw new Error('Akses ditolak');
    return { userId: token, roleKey: role, isOwner: token === 'owner', permissions: { methods: token === 'blocked' ? { getDashboardData: false } : token === 'granted' ? { getDashboardData: true } : {} } };
  },
  getApprovalUserById_(id) { return { roleKey: { ppic: 'admin_ppic', mixer: 'head_mixer', marketing: 'marketing', owner: 'marketing', blocked: 'admin_ppic', granted: 'marketing' }[id], id }; },
  isPortalOwner_(user) { return user.id === 'owner'; },
  portalMethodOverride_(user, method) { return user.userId === 'blocked' && method === 'getDashboardData' ? false : user.userId === 'granted' && method === 'getDashboardData' ? true : null; }
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
assert.equal(post('getDashboardData', 'owner').ok, true, 'master dapat membaca semua data');
assert.equal(post('getDashboardData', 'blocked').ok, false, 'master dapat mencabut izin bawaan jabatan');
assert.equal(post('getDashboardData', 'granted').ok, true, 'master dapat memberi izin lintas jabatan');
assert.equal(post('saveApprovalUser', 'ppic').ok, false, 'hanya master dapat mengatur pengguna');
assert.equal(post('saveProductionMixerEntry', 'marketing').ok, false, 'legacy produksi tetap dibatasi');
assert.equal(post('saveProductionMixerEntry', 'mixer').ok, true);
assert.equal(post('saveProductionSchedule', 'mixer').ok, false);
assert.equal(post('saveProductionSchedule', 'ppic').ok, true);
assert.equal(calls.length, 6, 'fungsi bisnis hanya dipanggil setelah otorisasi');
console.log('PASS: semua metode RPC mempunyai aturan akses, sesi wajib, dan peran dipisahkan');
