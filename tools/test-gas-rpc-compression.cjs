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

async function run(supportsCompression, oldServer = false, failures = 0, serverError = false) {
  const calls = [];
  const window = { setTimeout, clearTimeout, atob, localStorage: { getItem: () => null },
    DecompressionStream: supportsCompression ? DecompressionStream : undefined };
  const document = {
    createElement(tag) {
      assert.equal(tag, 'script', 'Public read must not create an iframe or form');
      return { addEventListener(name, callback) { this[name] = callback; } };
    },
    head: { appendChild(script) {
      const url = new URL(script.src);
      const request = JSON.parse(url.searchParams.get('payload'));
      calls.push(request);
      if (failures-- > 0) {
        queueMicrotask(() => script.error());
        return;
      }
      const callback = url.searchParams.get('callback').split('.').pop();
      queueMicrotask(() => window.__polytaGasJsonp[callback]({ ok: !serverError, error: { message: 'business error' }, result:
        request.method === 'getDashboardData' && supportsCompression && !oldServer ? packed : expected }));
    } }
  };
  const context = vm.createContext({ window, document, console, Blob, Response, Uint8Array });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/gas-rpc.js'), 'utf8'), context);
  if (failures >= 2) {
    await assert.rejects(new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getDashboardData(false)), /Jalur cadangan/);
    assert.equal(calls.length, 2, 'Stop after two failed reads without falling back to a frame');
  }
  if (serverError) {
    await assert.rejects(new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getDashboardData(false)), /business error/);
    assert.equal(calls.length, 1, 'Application errors must not be retried');
    return;
  }
  for (const method of ['getDashboardData', 'getSpkData', 'getSpkYearPreference', 'getInputSpkOptionsFast']) {
    const result = await new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method](method === 'getSpkData' ? 'A26.100' : false));
    assert.deepEqual(JSON.parse(JSON.stringify(result)), expected);
  }
  assert.deepEqual(calls[0].args, supportsCompression ? [false, 'gzip-base64'] : [false]);
  assert.deepEqual(calls.find(call => call.method === 'getSpkData').args, ['A26.100']);
}
(async () => {
  await run(true);
  await run(false);
  await run(true, true);
  await run(true, false, 1);
  await run(true, false, 2);
  await run(true, false, 0, true);
  console.log('PASS: gzip round trip, Unicode, numeric zero, direct public reads, old browser and old server compatibility, recovery after script failure without iframe, no retry for application errors');
})().catch(error => { console.error(error); process.exitCode = 1; });
