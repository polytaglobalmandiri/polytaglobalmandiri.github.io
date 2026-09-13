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
const expected = { totalSPK: 2, tableData: [['A26.100', 'CUSTOMER 日本', 0], ['B26.002', 'PT POLYTA', 100]], dashboardRecapBySpk: { 'A26.100': { routing: ['Blowing'], tracking: 'BL' } } };
backend.getDashboardDataPayload_ = force => { assert.equal(force, false); return expected; };
assert.equal(backend.getDashboardData(false), expected);
const packed = backend.getDashboardData(false, 'gzip-base64');
assert.equal(packed.encoding, 'gzip-base64');
assert.deepEqual(JSON.parse(zlib.gunzipSync(Buffer.from(packed.payload, 'base64'))), expected);

async function run(supportsCompression, oldServer = false) {
  const calls = [];
  const window = { setTimeout, clearTimeout, atob, localStorage: { getItem: () => null },
    DecompressionStream: supportsCompression ? DecompressionStream : undefined };
  const document = {
    createElement(tag) {
      assert.equal(tag, 'script', 'Public read must not create an iframe or form');
      return { addEventListener() {} };
    },
    head: { appendChild(script) {
      const url = new URL(script.src);
      const request = JSON.parse(url.searchParams.get('payload'));
      calls.push(request);
      const callback = url.searchParams.get('callback').split('.').pop();
      queueMicrotask(() => window.__polytaGasJsonp[callback]({ ok: true, result:
        request.method === 'getDashboardData' && supportsCompression && !oldServer ? packed : expected }));
    } }
  };
  const context = vm.createContext({ window, document, console, Blob, Response, Uint8Array });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/gas-rpc.js'), 'utf8'), context);
  for (const method of ['getDashboardData', 'getSpkData']) {
    const result = await new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](method === 'getSpkData' ? 'A26.100' : false));
    assert.deepEqual(JSON.parse(JSON.stringify(result)), expected);
  }
  assert.deepEqual(calls[0].args, supportsCompression ? [false, 'gzip-base64'] : [false]);
  assert.deepEqual(calls[1].args, ['A26.100']);
}
(async () => {
  await run(true);
  await run(false);
  await run(true, true);
  console.log('PASS: gzip round trip, Unicode, numeric zero, direct public reads, old browser and old server compatibility');
})().catch(error => { console.error(error); process.exitCode = 1; });
