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
console.log('PASS: real login/session logic with simulated storage, remember, logout, expiration, role/revocation checks, and idempotent print release');
