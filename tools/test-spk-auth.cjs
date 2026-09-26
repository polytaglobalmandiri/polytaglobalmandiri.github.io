const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cache = new Map();
const properties = new Map([['SPK_APPROVAL_PASSWORD_PEPPER', 'test-pepper']]);
const context = vm.createContext({
  CacheService: { getScriptCache: () => ({
    get: key => cache.get(key), put: (key, value) => cache.set(key, value), remove: key => cache.delete(key)
  }) },
  PropertiesService: { getScriptProperties: () => ({
    getProperty: key => properties.get(key),
    setProperty: (key, value) => properties.set(key, value),
    deleteProperty: key => properties.delete(key)
  }) },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    computeHmacSha256Signature: (data, key) => crypto.createHmac('sha256', key).update(data).digest(),
    computeDigest: (_, value) => crypto.createHash('sha256').update(value).digest(),
    base64EncodeWebSafe: value => Buffer.from(value).toString('base64url'),
    DigestAlgorithm: { SHA_256: 'sha256' }
  }
});
for (const file of ['BE-SPK-Approval.js', 'BE-Input-SPK.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas-deploy', file), 'utf8'), context);
}
const cachedUserLookup = context.getApprovalUserById_;
const user = { userId: 'test-user', email: 'test@example.invalid', name: 'Test', roleKey: 'admin_ppic',
  active: true, tokenVersion: 1, rowNumber: 2, passwordSalt: 'test-salt' };
user.passwordHash = context.hashApprovalPassword_('correct-password', user.passwordSalt);
let writes = 0;
context.getApprovalUsersSheetForLogin_ = () => ({ getRange: () => ({ setValue: () => { writes++; } }) });
context.findApprovalUserByEmail_ = (_, email) => email === user.email ? user : null;
context.getApprovalUserById_ = id => id === user.userId ? user : null;
assert.equal(context.loginApprovalUser('', '').status, 'error');
assert.equal(context.loginApprovalUser(user.email, 'wrong-password').status, 'error');
assert.equal(writes, 0);
const temporary = context.loginApprovalUser(' TEST@EXAMPLE.INVALID ', 'correct-password', false);
assert.equal(temporary.status, 'success');
assert.equal(writes, 1);
assert.equal(context.getApprovalSession(temporary.token).authenticated, true);
assert.equal(properties.has(context.approvalSessionKey_(temporary.token)), false);
const remembered = context.loginApprovalUser(user.email, 'correct-password', true);
const key = context.approvalSessionKey_(remembered.token);
assert.equal(properties.has(key), true);
cache.delete(key);
assert.equal(context.getApprovalSession(remembered.token).authenticated, true);
assert.equal(cache.has(key), true, 'Remembered session is restored from persistent storage');
assert.equal(context.isPortalOwner_({ email: 'ZULFI.POLYTA@GMAIL.COM', active: true }), true);
assert.equal(context.isPortalOwner_({ email: 'zulfi.polyta@gmail.com', active: false }), false);
const overrides = context.normalizePortalPermissions_({ pages: { '/pages/ppic/': false }, menus: { 'ppic:Dashboard': true }, methods: { getDashboardData: false } });
assert.equal(overrides.pages['/pages/ppic/'], false);
assert.equal(overrides.menus['ppic:Dashboard'], true);
assert.equal(overrides.methods.getDashboardData, false);

user.active = false;
assert.match(context.getApprovalSession(temporary.token).message, /tidak aktif/);
user.active = true;
user.tokenVersion = 2;
assert.match(context.getApprovalSession(temporary.token).message, /dicabut/);
user.tokenVersion = 1;
user.roleKey = 'head_printing';
let mutations = 0;
const aggregate = { master: { Release: 'Tidak' } };
context.getSpkApprovalSummary_ = () => ({ complete: true });
context.mutateDatabaseV2Spk_ = (_, action, update) => {
  assert.equal(action, 'RELEASE_PRINT_NATIVE');
  if (update(aggregate)) mutations++;
  return { status: 'UPDATED' };
};
context.clearDashboardCache_ = () => {};
assert.match(context.markSpkReleasedForPrint('TEST.001', 0, temporary.token).message, /tidak memiliki izin/);
assert.equal(mutations, 0);
user.roleKey = 'admin_ppic';
assert.equal(context.markSpkReleasedForPrint('TEST.001', 0, temporary.token).status, 'success');
assert.equal(aggregate.master.Release, 'YA');
assert.equal(context.markSpkReleasedForPrint('TEST.001', 0, temporary.token).status, 'success');
assert.equal(mutations, 1, 'Repeated release leaves the same state');
const expired = JSON.parse(properties.get(key));
expired.expiresAt = Date.now() - 1;
properties.set(key, JSON.stringify(expired));
cache.delete(key);
assert.match(context.getApprovalSession(remembered.token).message, /Sesi login berakhir/);
assert.equal(properties.has(key), false);
context.logoutApprovalUser(temporary.token);
assert.equal(context.getApprovalSession(temporary.token).authenticated, false);
context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
context.requirePortalOwner_ = () => ({ userId: 'owner-user' });
context.ensureApprovalSheets_ = () => ({ users: {} });
context.getApprovalUserById_ = () => ({ userId: 'owner-user', email: 'zulfi.polyta@gmail.com', active: true });
let userWrites = 0;
context.createOrUpdateApprovalUser_ = (_, id, payload) => { userWrites++; return { userId: id, email: payload.email, active: payload.active !== false }; };
context.sanitizeApprovalUser_ = value => value;
assert.equal(context.saveApprovalUser('token', { userId: 'owner-user', email: 'other@example.com', active: true }).status, 'error');
assert.equal(context.saveApprovalUser('token', { userId: 'owner-user', email: 'zulfi.polyta@gmail.com', active: false }).status, 'error');
assert.equal(userWrites, 0, 'akun master tidak bisa diturunkan atau dinonaktifkan');
const cacheRow = ['cache-user', 'cached@example.invalid', '', '', 'Cached User', 'admin_ppic', 'Admin PPIC', 'PPIC', 'YA', '', '', '', '', '', 1, '{}'];
let sheetReads = 0;
context.getApprovalUsersSheetForLogin_ = () => ({
  getLastRow: () => 2,
  getRange: (_, column, __, width) => width === 1 ? {
    createTextFinder: () => ({ matchEntireCell() { return this; }, matchCase() { return this; }, findNext: () => ({ getRow: () => 2 }) })
  } : { getValues: () => { sheetReads++; return [cacheRow]; } }
});
assert.equal(cachedUserLookup('cache-user').roleKey, 'admin_ppic');
cacheRow[5] = 'marketing';
assert.equal(cachedUserLookup('cache-user').roleKey, 'admin_ppic');
assert.equal(sheetReads, 1, 'pemeriksaan sesi berikutnya memakai cache pengguna');
context.invalidateApprovalUserCache_('cache-user');
assert.equal(cachedUserLookup('cache-user').roleKey, 'marketing');
assert.equal(sheetReads, 2, 'perubahan izin mencabut cache pengguna');
console.log('PASS: real login/session logic with simulated storage, remember, logout, expiration, role/revocation checks, and idempotent print release');
