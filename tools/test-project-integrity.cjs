const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root })
  .toString().split('\0').filter(file => file && fs.existsSync(path.join(root, file)));
let scripts = 0;
let links = 0;
for (const file of files) {
  if (file.startsWith('assets/vendor/') || file.startsWith('desktop/')) continue;
  const fullPath = path.join(root, file);
  if (/\.(?:js|cjs|mjs)$/.test(file)) {
    execFileSync(process.execPath, ['--check', fullPath], { stdio: 'pipe' });
    scripts++;
  }
  if (!file.endsWith('.html')) continue;
  const html = fs.readFileSync(fullPath, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=|\btype\s*=\s*["'](?:application\/ld\+json|application\/json|module)["']/i.test(match[1])) continue;
    const source = match[2].replace(/<\?[\s\S]*?\?>/g, '');
    if (!source.trim()) continue;
    new vm.Script(source, { filename: file });
    scripts++;
  }
  if (file.startsWith('gas-deploy/')) continue;
  for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(?:[a-z][\w+.-]*:|\/\/)/i.test(reference) || /[<>${}]/.test(reference)) continue;
    const target = reference.startsWith('/')
      ? path.join(root, decodeURIComponent(reference))
      : path.resolve(path.dirname(fullPath), decodeURIComponent(reference));
    assert.ok(fs.existsSync(target), `${file}: missing local reference ${reference}`);
    links++;
  }
}
const wizardSource = fs.readFileSync(path.join(root, 'gas-deploy/FE-SPK-Wizard-Script.html'), 'utf8');
const standalone = fs.readFileSync(path.join(root, 'apps/spk-automation/create-spk/index.html'), 'utf8');
const creatorAuth = html => html.slice(html.indexOf("    const SPK_AUTH_STORAGE_KEY_"), html.indexOf('    async function submitDatabase_()'));
assert.ok(creatorAuth(wizardSource).includes('ensureCreatorApprovalLogin_'));
assert.equal(creatorAuth(standalone), creatorAuth(wizardSource), 'Standalone creator authentication must match the GAS wizard source');
assert.match(standalone, /authToken: creatorAuth\.token/);
console.log(`PASS: ${scripts} JavaScript files/inline blocks parse; ${links} static HTML asset/page references exist`);
