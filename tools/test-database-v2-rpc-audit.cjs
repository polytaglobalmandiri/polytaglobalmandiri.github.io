const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gasDirectory = path.join(__dirname, '../gas-deploy');
const sources = fs.readdirSync(gasDirectory)
  .filter(name => name.endsWith('.js'))
  .map(name => ({ name, code: fs.readFileSync(path.join(gasDirectory, name), 'utf8') }));

function findClosingBrace(code, opening, label) {
  let depth = 0;
  let state = 'code';
  let regexClass = false;
  let previousSignificant = '{';
  for (let index = opening; index < code.length; index++) {
    const character = code[index];
    const next = code[index + 1];
    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && next === '/') { state = 'code'; index++; }
      continue;
    }
    if (state === 'regex') {
      if (character === '\\') { index++; continue; }
      if (character === '[') regexClass = true;
      if (character === ']') regexClass = false;
      if (character === '/' && !regexClass) state = 'code';
      continue;
    }
    if (state !== 'code') {
      if (character === '\\') { index++; continue; }
      if (character === state) state = 'code';
      continue;
    }
    if (character === '/' && next === '/') { state = 'line-comment'; index++; continue; }
    if (character === '/' && next === '*') { state = 'block-comment'; index++; continue; }
    if (character === '/' && /[({[=,:;!?&|]/.test(previousSignificant)) {
      state = 'regex';
      regexClass = false;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') { state = character; continue; }
    if (character === '{') depth++;
    if (character === '}' && --depth === 0) return index;
    if (!/\s/.test(character)) previousSignificant = character;
  }
  throw new Error(`Kurung fungsi tidak seimbang: ${label}`);
}

const functions = new Map();
sources.forEach(source => {
  const declaration = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = declaration.exec(source.code))) {
    const opening = source.code.indexOf('{', match.index);
    const closing = findClosingBrace(source.code, opening, `${match[1]} (${source.name})`);
    assert(!functions.has(match[1]), `Fungsi global duplikat: ${match[1]}`);
    functions.set(match[1], {
      file: source.name,
      body: source.code.slice(opening + 1, closing)
    });
    declaration.lastIndex = closing + 1;
  }
});

const api = sources.find(source => source.name === 'BE-Api.js').code;
const allowlist = api.match(/var SPK_RPC_METHODS_\s*=\s*\{([\s\S]*?)\n\};/);
assert(allowlist, 'Allowlist RPC tidak ditemukan.');
const roots = Array.from(allowlist[1].matchAll(/^\s*[A-Za-z_$][\w$]*\s*:\s*([A-Za-z_$][\w$]*)\s*,?\s*$/gm), match => match[1]);
assert(roots.length > 0, 'Allowlist RPC kosong.');
const rpcRoots = new Set(roots);
const directHtmlRoots = new Set();
fs.readdirSync(gasDirectory).filter(name => name.endsWith('.html')).forEach(name => {
  const html = fs.readFileSync(path.join(gasDirectory, name), 'utf8');
  for (const match of html.matchAll(/^\s*\.([A-Za-z_$][\w$]*)\s*\(/gm)) {
    if (functions.has(match[1])) directHtmlRoots.add(match[1]);
  }
});
const directOnly = Array.from(directHtmlRoots).filter(name => !rpcRoots.has(name));
assert.deepEqual(directOnly, [], `Panggilan HTML langsung belum diaudit RPC: ${directOnly.join(', ')}`);

// Diagnostik cutover memang harus membaca keberadaan/referensi sheet lama.
// Ia bukan jalur operasional aplikasi dan tidak dipanggil halaman HTML.
const diagnosticRoots = new Set(['getDatabaseV2CutoverAudit']);
const operationalRoots = roots.filter(name => !diagnosticRoots.has(name));
const reachable = new Set();
const queue = operationalRoots.slice();
while (queue.length) {
  const name = queue.shift();
  if (reachable.has(name)) continue;
  reachable.add(name);
  const declaration = functions.get(name);
  assert(declaration, `Implementasi RPC/helper tidak ditemukan: ${name}`);
  const calls = declaration.body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g);
  for (const call of calls) {
    const target = call[1];
    if (functions.has(target) && !reachable.has(target)) queue.push(target);
  }
}

const forbidden = /\b(?:getDbSheet_|getDbSheetReadOnly_|findDatabaseSheet_)\s*\(|['"](?:Database SPK|SPK Runtime V2)['"]/;
const violations = [];
reachable.forEach(name => {
  const declaration = functions.get(name);
  if (forbidden.test(declaration.body)) violations.push(`${name} (${declaration.file})`);
});

assert.deepEqual(
  violations,
  [],
  `Jalur RPC masih bergantung pada database kompatibilitas lama:\n${violations.join('\n')}`
);
if (process.env.LIST_UNREACHABLE_GAS === '1') {
  const candidates = Array.from(functions.entries())
    .filter(([name, declaration]) =>
      !reachable.has(name) &&
      ['BE-Input-SPK.js', 'BE-Peranikan-Data.js'].includes(declaration.file)
    )
    .map(([name, declaration]) => `${declaration.file}\t${name}`)
    .sort();
  console.log('UNREACHABLE_BEGIN');
  console.log(candidates.join('\n'));
  console.log('UNREACHABLE_END');
}
console.log(`PASS: ${operationalRoots.length} RPC operasional, ${directHtmlRoots.size} panggilan HTML langsung, dan ${reachable.size} fungsi terjangkau bebas dari database lama`);
