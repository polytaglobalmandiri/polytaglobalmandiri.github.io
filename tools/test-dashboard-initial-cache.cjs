const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../apps/spk-automation/index.html'), 'utf8');
const match = html.match(/function mayReadCachedDashboard_\(user\)[\s\S]*?(?=\/\/ Dijalankan berbarengan)/);
assert.ok(match, 'initial dashboard cache flow exists');

async function scenario(snapshot, revision, user) {
  const events = [];
  const label = { textContent: '' };
  const runner = {
    withSuccessHandler(handler) { this.success = handler; return this; },
    withFailureHandler(handler) { this.failure = handler; return this; },
    getDashboardDataRevision() { events.push('revision'); queueMicrotask(() => this.success({ status: 'success', revision })); }
  };
  const context = {
    window: {
      POLYTA_READ_DASHBOARD_CACHE: () => Promise.resolve(snapshot),
      POLYTA_PORTAL_AUTH: { ready: Promise.resolve(user) }
    },
    google: { script: { run: runner } },
    document: { getElementById: () => label },
    loadData: () => events.push('full'),
    renderData: () => { events.push('render'); return true; },
    setRealtimeStatus_: () => events.push('live'),
    scheduleDashboardRevisionCheck_: () => events.push('schedule'),
    REALTIME_CHECK_INTERVAL_MS: 10000,
    dashboardRevision: ''
  };
  vm.createContext(context);
  vm.runInContext(match[0], context);
  context.loadInitialDashboardData_();
  await new Promise(resolve => setImmediate(resolve));
  return { events, label: label.textContent, dashboardRevision: context.dashboardRevision };
}

(async function () {
  const user = { roleKey: 'admin_ppic', permissions: { methods: {} } };
  const snapshot = { revision: 'rev-1', tableData: [['A26.001']] };
  const valid = await scenario(snapshot, 'rev-1', user);
  assert.deepEqual(valid.events, ['revision', 'render', 'live']);
  assert.equal(valid.dashboardRevision, 'rev-1');
  assert.match(valid.label, /cocok dengan server/);
  assert.deepEqual((await scenario(snapshot, 'rev-2', user)).events, ['revision', 'full']);
  assert.deepEqual((await scenario(null, 'rev-1', user)).events, ['full']);
  assert.deepEqual((await scenario(snapshot, 'rev-1', {
    ...user, permissions: { methods: { getDashboardData: false } }
  })).events, ['revision', 'full']);
  assert.deepEqual((await scenario(snapshot, 'rev-1', null)).events, ['revision']);
  console.log('PASS: verified dashboard cache skips full load only for matching revision and authorized user');
})().catch(error => { console.error(error); process.exitCode = 1; });
