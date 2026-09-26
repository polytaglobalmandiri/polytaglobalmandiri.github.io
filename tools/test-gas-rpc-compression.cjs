const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const zlib = require('node:zlib');
const path = require('node:path');

const backend = vm.createContext({ Utilities: {
  newBlob: text => Buffer.from(text),
  gzip: blob => ({ getBytes: () => zlib.gzipSync(blob) }),
  base64Encode: bytes => Buffer.from(bytes).toString('base64')
} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas-deploy/BE-Dashboard.js'), 'utf8'), backend);
const expected = { totalSPK: 2, tableData: [['A26.100', 'CUSTOMER 日本', 0], ['B26.002', 'PT POLYTA', 100]] };
backend.getDashboardDataPayload_ = () => expected;
const packed = backend.getDashboardData(false, 'gzip-base64');
assert.equal(packed.encoding, 'gzip-base64');
assert.deepEqual(JSON.parse(zlib.gunzipSync(Buffer.from(packed.payload, 'base64'))), expected);

async function run(supportsCompression, oldServer = false) {
  const calls = [];
  const window = {
    setTimeout, clearTimeout, atob, AbortController,
    sessionStorage: { getItem: () => JSON.stringify({ token: 'test-token' }) },
    localStorage: { getItem: () => null },
    DecompressionStream: supportsCompression ? DecompressionStream : undefined,
    fetch: async (_, options) => {
      const request = JSON.parse(options.body);
      calls.push(request);
      return { ok: true, json: async () => ({ ok: true, result: request.method === 'getDashboardData' && supportsCompression && !oldServer ? packed : expected }) };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/gas-rpc.js'), 'utf8'), { window, console, Blob, Response, Uint8Array });
  const rpc = (method, ...args) => new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](...args));
  const result = await rpc('getDashboardData', false);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), expected);
  assert.deepEqual(calls[0].args, supportsCompression ? [false, 'gzip-base64'] : [false]);
  assert.equal(calls[0].authToken, 'test-token');
  assert.equal((await rpc('getSpkData', 'A26.100')).totalSPK, 2);
  assert.deepEqual(calls[1].args, ['A26.100']);
}
(async () => {
  await run(true);
  await run(false);
  await run(true, true);
  console.log('PASS: kompresi dashboard, Unicode, angka nol, kompatibilitas respons lama, dan token dalam POST');
})().catch(error => { console.error(error); process.exitCode = 1; });
