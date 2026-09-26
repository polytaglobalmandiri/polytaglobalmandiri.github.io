const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/gas-rpc.js'), 'utf8');

function client(entry, token, storedToken = token) {
  const store = new Map([['dashboard-data-v8:' + storedToken, entry]]);
  const database = {
    transaction() {
      const transaction = {
        objectStore() {
          return {
            get(key) {
              const request = { result: store.get(key) };
              queueMicrotask(() => {
                request.onsuccess();
                if (transaction.oncomplete) transaction.oncomplete();
              });
              return request;
            }
          };
        }
      };
      return transaction;
    },
    close() {}
  };
  const indexedDB = {
    open() {
      const request = { result: database };
      queueMicrotask(() => request.onsuccess());
      return request;
    }
  };
  const window = {
    indexedDB,
    sessionStorage: { getItem() { return JSON.stringify({ token }); } },
    localStorage: { getItem() { return null; } }
  };
  vm.runInNewContext(source, { window, document: {}, console });
  return window.POLYTA_READ_DASHBOARD_CACHE;
}

(async function () {
  const payload = { revision: 'rev-1', tableData: [['A26.001']], totalSPK: 1 };
  assert.equal((await client({ savedAt: Date.now(), value: payload }, 'one')()).revision, 'rev-1');
  assert.equal(await client({ savedAt: Date.now() - 7 * 60 * 60 * 1000, value: payload }, 'one')(), null);
  assert.equal(await client({ savedAt: Date.now(), value: { error: 'failed' } }, 'one')(), null);
  assert.equal(await client({ savedAt: Date.now(), value: payload }, 'other', 'one')(), null,
    'one account cannot read another session snapshot');
  console.log('PASS: dashboard snapshot cache accepts valid data, rejects stale/error data, and scopes entries by session');
})().catch(error => { console.error(error); process.exitCode = 1; });
