const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stylesheet = fs.readFileSync(path.join(root, 'assets/vendor/fontawesome/css/all.min.css'), 'utf8');
const files = [
  'apps/spk-automation/admin/index.html', 'apps/spk-automation/admin/admin.js'
];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const icons = new Set(source.match(/fa-[a-z][a-z-]+/g) || []);
  icons.delete('fa-solid');
  for (const icon of icons) {
    assert.ok(stylesheet.includes(`.${icon}:before`), `${file}: ikon ${icon} tidak tersedia pada Font Awesome lokal`);
  }
}
const portal = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const portalScript = fs.readFileSync(path.join(root, 'assets/js/portal-home.js'), 'utf8');
const symbols = new Set([...portal.matchAll(/<symbol\s+id="icon-([a-z-]+)"/g)].map((match) => match[1]));
const staticIcons = [...portal.matchAll(/<use\s+href="#icon-([a-z-]+)"/g)].map((match) => match[1]);
const moduleIcons = [...portalScript.matchAll(/icon:'([a-z-]+)'/g)].map((match) => match[1]);
assert.equal(moduleIcons.length, 9, 'sembilan modul portal memiliki ikon');
for (const icon of [...staticIcons, ...moduleIcons, 'chevron']) {
  assert.ok(symbols.has(icon), `ikon SVG portal ${icon} belum didefinisikan`);
}
assert.ok(!portal.includes('fontawesome/css/all.min.css'), 'halaman utama tidak perlu memuat font ikon');
console.log('PASS: seluruh ikon SVG halaman utama dan ikon Kelola Akses tersedia secara lokal');
