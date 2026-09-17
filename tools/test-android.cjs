const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'desktop/electron/package.json'))).version;

const flavors = [
  { flavor: 'portal', appName: 'Polyta Portal', startPath: '/', file: 'Polyta-Portal' },
  { flavor: 'admin', appName: 'Polyta Administrator', startPath: '/pages/admin/', file: 'Polyta-Administrator' }
];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

test('the Android module derives its version from the desktop manifest', () => {
  const script = read('android/app/build.gradle.kts');
  assert.match(script, /desktop\/electron\/package\.json/);
  assert.match(script, /namespace = "com\.polytaglobalmandiri\.portal"/);
  assert.match(script, /minSdk = 24/);
});

for (const item of flavors) {
  test(`the ${item.flavor} flavor keeps its identity and start route`, () => {
    const strings = read(`android/app/src/${item.flavor}/res/values/strings.xml`);
    assert.match(strings, new RegExp(`<string name="app_name">${item.appName}</string>`));
    assert.match(strings, new RegExp(`<string name="start_path"[^>]*>${item.startPath}</string>`));
    const script = read('android/app/build.gradle.kts');
    const applicationId = item.flavor === 'portal'
      ? 'com.polytaglobalmandiri.portal'
      : 'com.polytaglobalmandiri.admin';
    assert.ok(script.includes(`applicationId = "${applicationId}"`), applicationId);
  });

  test(`the download page links directly to the ${item.flavor} APK`, () => {
    const html = read('unduh/index.html');
    const url = 'https://github.com/polytaglobalmandiri/polytaglobalmandiri.github.io/releases/download/'
      + `desktop-v${version}/${item.file}-${version}-android.apk`;
    assert.ok(html.includes(`href="${url}"`), url);
  });
}

test('the Android app only keeps portal navigation inside the WebView', () => {
  const source = read('android/app/src/main/java/com/polytaglobalmandiri/portal/MainActivity.java');
  assert.match(source, /shouldOverrideUrlLoading/);
  assert.match(source, /openExternally/);
  assert.match(source, /setAllowFileAccess\(false\)/);
  assert.match(source, /MIXED_CONTENT_NEVER_ALLOW/);
});

test('the workflow builds both flavors and publishes them on desktop tags', () => {
  const workflow = read('.github/workflows/build-android.yml');
  assert.match(workflow, /assemblePortalRelease assembleAdminRelease/);
  assert.match(workflow, /refs\/tags\/desktop-v/);
  assert.match(workflow, /Polyta-Portal-\$\{version\}-android\.apk/);
  assert.match(workflow, /Polyta-Administrator-\$\{version\}-android\.apk/);
});
