const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'desktop/electron/main.js'), 'utf8');
const origin = 'https://polytaglobalmandiri.github.io';

async function launch({ name = 'Polyta Portal', argv = [], platform = 'linux', script = source } = {}) {
  const windows = [];
  const external = [];
  const events = {};
  const app = {
    getName: () => name,
    setAppUserModelId: id => { app.id = id; },
    requestSingleInstanceLock: () => true,
    quit: () => { app.quitCalled = true; },
    whenReady: () => Promise.resolve(),
    on: (event, handler) => { events[event] = handler; }
  };
  class BrowserWindow {
    static getAllWindows() { return windows; }
    constructor(options) {
      this.options = options;
      this.loaded = [];
      this.events = {};
      this.webEvents = {};
      this.webContents = {
        setWindowOpenHandler: handler => { this.open = handler; },
        on: (event, handler) => { this.webEvents[event] = handler; }
      };
      windows.push(this);
    }
    once(event, handler) { this.events[event] = handler; }
    loadURL(url) { this.loaded.push(url); }
    show() { this.shown = true; }
    isMinimized() { return true; }
    restore() { this.restored = true; }
    focus() { this.focused = true; }
  }
  vm.runInNewContext(script, {
    require: module => {
      if (module === 'path') return path;
      assert.equal(module, 'electron');
      return { app, BrowserWindow, Menu: { setApplicationMenu() {} },
        shell: { openExternal: url => external.push(url) } };
    },
    process: { argv, platform },
    URL,
    __dirname: path.join(root, 'desktop/electron')
  });
  await Promise.resolve();
  return { app, window: windows[0], external, events };
}

test('portal and both administrator entry points retain their URL and identity', async () => {
  for (const [options, suffix, id] of [
    [{}, '/', 'portal'],
    [{ argv: ['--admin'] }, '/pages/admin/', 'admin'],
    [{ name: 'Polyta Administrator' }, '/pages/admin/', 'admin']
  ]) {
    const { app, window } = await launch(options);
    assert.equal(window.loaded[0], origin + suffix);
    assert.equal(app.id, `com.polytaglobalmandiri.${id}`);
  }
});

test('remote pages run without Node integration or developer tools', async () => {
  const { window } = await launch();
  const options = window.options.webPreferences;
  assert.equal(options.contextIsolation, true);
  assert.equal(options.nodeIntegration, false);
  assert.equal(options.sandbox, true);
  assert.equal(options.devTools, false);
  assert.equal(window.options.show, false);
  window.events['ready-to-show']();
  assert.equal(window.shown, true);
});

test('trusted popup navigation stays in the application', async () => {
  const { window, external } = await launch();
  assert.equal(window.open({ url: origin + '/unduh/' }).action, 'deny');
  assert.equal(window.loaded.at(-1), origin + '/unduh/');
  assert.equal(external.length, 0);
});

test('external HTTP navigation is delegated, never loaded in the application', async () => {
  const { window, external } = await launch();
  for (const url of ['https://example.com/', 'http://example.com/', origin + '.example.com/']) {
    assert.equal(window.open({ url }).action, 'deny');
    let prevented = false;
    window.webEvents['will-navigate']({ preventDefault() { prevented = true; } }, url);
    assert.equal(prevented, true);
  }
  assert.equal(external.length, 6);
  assert.equal(window.loaded.length, 1);
});

test('non-HTTP URLs are blocked without launching external applications', async () => {
  const { window, external } = await launch();
  for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'mailto:test@example.com', 'invalid']) {
    assert.equal(window.open({ url }).action, 'deny');
    let prevented = false;
    window.webEvents['will-navigate']({ preventDefault() { prevented = true; } }, url);
    assert.equal(prevented, true);
  }
  assert.equal(external.length, 0);
  assert.equal(window.loaded.length, 1);
});

test('same-origin navigation is not prevented', async () => {
  const { window } = await launch();
  window.webEvents['will-navigate']({
    preventDefault() { assert.fail('trusted navigation was blocked'); }
  }, origin + '/dokumentasi/');
});

test('aborted loads are ignored and failed loads provide a safe retry page', async () => {
  const { window } = await launch({ argv: ['--admin'] });
  window.webEvents['did-fail-load']({}, -3, 'ERR_ABORTED');
  assert.equal(window.loaded.length, 1);
  window.webEvents['did-fail-load']({}, -105, '<script>alert("x")</script>');
  const html = decodeURIComponent(window.loaded.at(-1).split(',').slice(1).join(','));
  assert.match(html, /Portal belum dapat dibuka/);
  assert.ok(html.includes(origin + '/pages/admin/'));
  assert.ok(!html.includes('<script>'));
});

test('a second instance restores and focuses the existing window', async () => {
  const { window, events } = await launch();
  events['second-instance']();
  assert.equal(window.restored, true);
  assert.equal(window.focused, true);
});

test('closing the last window quits on Linux but retains macOS lifecycle', async () => {
  for (const platform of ['linux', 'darwin']) {
    const { app, events } = await launch({ platform });
    events['window-all-closed']();
    assert.equal(Boolean(app.quitCalled), platform !== 'darwin');
  }
});

test('download release versions and packaged local fallback files are consistent', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'desktop/electron/package.json')));
  const html = fs.readFileSync(path.join(root, 'unduh/index.html'), 'utf8');
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  const released = links.filter(url => url.includes('/releases/download/'));
  assert.equal(released.length, 10);
  assert.equal(new Set(released).size, 10);
  for (const url of released) {
    assert.ok(url.includes(`/desktop-v${manifest.version}/`), url);
    assert.ok(url.includes(`-${manifest.version}-`), url);
  }
  for (const url of links.filter(url => url.startsWith('../desktop/release/'))) {
    const binary = fs.readFileSync(path.resolve(root, 'unduh', url));
    assert.equal(binary.subarray(0, 2).toString(), 'MZ');
    assert.ok(binary.length > 1024);
  }
});

const products = [
  { variant: 'portal', name: 'polyta-portal', productName: 'Polyta Portal', suffix: '/', appId: 'portal' },
  { variant: 'admin', name: 'polyta-administrator', productName: 'Polyta Administrator', suffix: '/pages/admin/', appId: 'admin' }
];

function readDebianFile(deb, entry) {
  return execFileSync('bash', [
    '-o', 'pipefail', '-c', 'dpkg-deb --fsys-tarfile "$1" | tar -xOf - "$2"',
    'test-desktop', deb, entry
  ]);
}

for (const product of products) {
  test(`${product.variant} configuration embeds a distinct identity and disables builder publishing`, async () => {
    const config = fs.readFileSync(path.join(root, `desktop/electron/electron-builder.${product.variant}.yml`), 'utf8');
    const block = config.match(/^extraMetadata:\r?\n((?:[ \t]+[^\n]*\n)+)/m)?.[1] || '';
    const metadata = Object.fromEntries(
      [...block.matchAll(/^  (name|productName): (.+)\r?$/gm)].map(match => [match[1], match[2].trim()])
    );
    assert.deepEqual(metadata, { name: product.name, productName: product.productName });
    assert.match(config, /^publish: null\r?$/m);
    const { app, window } = await launch({ name: metadata.productName || metadata.name });
    assert.equal(app.id, `com.polytaglobalmandiri.${product.appId}`);
    assert.equal(window.loaded[0], origin + product.suffix);
  });

  test(`${product.variant} Linux packages preserve identity, route, and launcher`, {
    skip: !process.env.PGM_DESKTOP_ARTIFACTS && 'Set PGM_DESKTOP_ARTIFACTS to the built release directory'
  }, async () => {
    const asar = require(path.join(root, 'desktop/electron/node_modules/@electron/asar'));
    const directory = path.resolve(root, process.env.PGM_DESKTOP_ARTIFACTS, product.variant);
    const archive = path.join(directory, 'linux-unpacked/resources/app.asar');
    const metadata = JSON.parse(asar.extractFile(archive, 'package.json'));
    assert.equal(metadata.name, product.name);
    assert.equal(metadata.productName, product.productName);
    const script = asar.extractFile(archive, 'main.js').toString();
    assert.equal(script, source);
    const { app, window } = await launch({ name: metadata.productName || metadata.name, script });
    assert.equal(app.id, `com.polytaglobalmandiri.${product.appId}`);
    assert.equal(window.loaded[0], origin + product.suffix);

    const version = JSON.parse(fs.readFileSync(path.join(root, 'desktop/electron/package.json'))).version;
    const stem = `${product.productName.replaceAll(' ', '-')}-${version}-linux-`;
    const deb = path.join(directory, `${stem}amd64.deb`);
    assert.equal(execFileSync('dpkg-deb', ['--field', deb, 'Package'], { encoding: 'utf8' }).trim(), product.name);
    assert.equal(execFileSync('dpkg-deb', ['--field', deb, 'Version'], { encoding: 'utf8' }).trim(), version);
    assert.equal(execFileSync('dpkg-deb', ['--field', deb, 'Architecture'], { encoding: 'utf8' }).trim(), 'amd64');
    assert.deepEqual(
      readDebianFile(deb, `./opt/${product.productName}/resources/app.asar`),
      fs.readFileSync(archive)
    );
    const launcher = readDebianFile(deb, `./usr/share/applications/${product.name}.desktop`).toString();
    assert.ok(launcher.includes(`Name=${product.productName}\n`));
    assert.ok(launcher.includes(`Exec="/opt/${product.productName}/${product.name}" %U\n`));
    assert.ok(launcher.includes(`Icon=${product.name}\n`));
    const appImage = path.join(directory, `${stem}x86_64.AppImage`);
    const descriptor = fs.openSync(appImage, 'r');
    try {
      const magic = Buffer.alloc(4);
      assert.equal(fs.readSync(descriptor, magic, 0, magic.length, 0), 4);
      assert.deepEqual(magic, Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
    } finally {
      fs.closeSync(descriptor);
    }
  });
}
