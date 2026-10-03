const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicOrigin = 'https://polytaglobalmandiri.github.io';
const cdnHosts = /^(?:cdn\.jsdelivr\.net|cdn\.datatables\.net|cdnjs\.cloudflare\.com|code\.jquery\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com)$/i;

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.name.endsWith('.html') ? [file] : [];
  });
}

const files = [path.join(root, 'index.html'), ...htmlFiles(path.join(root, 'apps')), ...htmlFiles(path.join(root, 'gas-deploy'))];
let checked = 0;
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["'](https?:\/\/[^"']+)["']/gi)) {
    const url = new URL(match[1]);
    assert.ok(!cdnHosts.test(url.hostname), `${path.relative(root, file)} masih memakai CDN: ${url.hostname}`);
    if (url.origin !== publicOrigin || !url.pathname.startsWith('/assets/vendor/')) continue;
    assert.ok(fs.existsSync(path.join(root, url.pathname.slice(1))), `Aset publik tidak ada: ${url.pathname}`);
    checked += 1;
  }
}
assert.ok(checked > 0, 'Aset publik template Apps Script tidak ditemukan');
console.log(`PASS: ${checked} referensi vendor publik ada di repositori; halaman tidak memuat aset CDN`);
