const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stylesheet = fs.readFileSync(path.join(root, 'assets/vendor/fontawesome/css/all.min.css'), 'utf8');
const files = [
  'index.html', 'assets/js/portal-home.js',
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
console.log('PASS: seluruh ikon portal dan Kelola Akses tersedia secara lokal');
