const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const importer = require('../apps/spk-automation/spk-document-import.js');

const ocrAssets = [
  'assets/vendor/tesseract/tesseract.min.js',
  'assets/vendor/tesseract/worker.min.js',
  'assets/vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js',
  'assets/vendor/tesseract/core/tesseract-core-lstm.wasm.js',
  'assets/vendor/tesseract/lang/eng.traineddata.gz',
  'assets/vendor/tesseract/lang/ind.traineddata.gz',
  'assets/vendor/tesseract/LICENSES.txt'
];
ocrAssets.forEach(file => assert.ok(fs.statSync(path.join(__dirname, '..', file)).size > 100, `${file} is present`));
const importSource = fs.readFileSync(path.join(__dirname, '..', 'apps', 'spk-automation', 'spk-document-import.js'), 'utf8');
assert.match(importSource, /workerPath:\s*workerPath/);
assert.match(importSource, /langPath:\s*langPath/);
assert.match(importSource, /worker\.recognize\(file\)/);
assert.doesNotMatch(importSource, /cdn\.jsdelivr\.net|generativelanguage|documentai\.googleapis/);

assert.equal(importer.classifyPage('PURCHASE ORDER\nPO Number: PO-12345'), 'PO');
assert.equal(importer.classifyPage('PERHITUNGAN HARGA JUAL'), 'PHJ');
assert.equal(importer.classifyPage('TEHNIKAL DATA SHEET (TDS)'), 'TDS');

const draft = importer.extractDraft([
  {
    source: 'customer-po.pdf · halaman 1',
    lines: [
      'PURCHASE ORDER',
      'PT. CONTOH CUSTOMER',
      'PO Date : 06/10/2026',
      'PO Number : PO-2026-001',
      'Delivery : 14 Oktober 2026',
      '1 [ITEM-1] Plastik Contoh 12 x 20 cm 30.000 Pcs'
    ]
  },
  {
    source: 'customer-phj.pdf · halaman 2',
    lines: [
      'PERHITUNGAN HARGA JUAL',
      'NAMA CUSTOMER PT. CONTOH CUSTOMER',
      'NAMA ITEM Plastik Contoh',
      'BAHAN OPP POLOS',
      'UKURAN 12 X 20 X 0.03',
      'MODEL KANTONG SIDE SEAL',
      'PRINTING 2 WARNA',
      'JUMLAH ORDER 30.000 Pcs',
      'TOLERANSI KIRIM +/-10%',
      'DELIVERY DATE 14 Oktober 2026'
    ]
  },
  {
    source: 'tds.pdf · halaman 3',
    lines: [
      'TEHNIKAL DATA SHEET (TDS)',
      'No.Artikel : ITEM-1',
      'Artikel :',
      'Plastik Contoh',
      'Customer :',
      'PT. CONTOH CUSTOMER',
      'Ukuran Jadi : 12 X 20 X 0.03',
      'x 0.030 mic'
    ]
  }
]);

function field(id) {
  return draft.fields.find(item => item.id === id);
}

assert.equal(field('customer').value, 'PT. CONTOH CUSTOMER');
assert.equal(field('nomorPO').value, 'PO-2026-001');
assert.equal(field('poMasukDisplay').value, '06/10/2026');
assert.equal(field('etd').value, '14 Oktober 2026');
assert.equal(field('artikel').value, 'Plastik Contoh');
assert.equal(field('kodeItem').value, 'ITEM-1');
assert.equal(field('ukuranJadi').value, '12 X 20 X 0.03 x 0.030 mic');
assert.equal(field('jumlahOrder').value, '30000');
assert.equal(field('uomOrder').value, 'PCS');
assert.equal(field('material').value, 'OPP');
assert.equal(field('modelKantong').value, 'SIDE SEAL');
assert.equal(field('keteranganWarna').value, '2 WARNA');
assert.equal(field('toleransi').value, '10');
assert.equal(field('jumlahOrder').needsReview, false);
assert.equal(draft.fields.some(item => item.id === 'tanggalKirim'), false);
assert.equal(draft.issues.length, 0);

const conflict = importer.extractDraft([
  { source: 'po.pdf · halaman 1', lines: ['PURCHASE ORDER', 'PT. CUSTOMER A', 'Nomor : PO-1'] },
  { source: 'tds.pdf · halaman 1', lines: ['TEHNIKAL DATA SHEET', 'Customer :', 'PT. CUSTOMER B'] }
]);
assert.equal(fieldFrom(conflict, 'customer').value, 'PT. CUSTOMER A');
assert.equal(fieldFrom(conflict, 'customer').source, 'PO');
assert.equal(fieldFrom(conflict, 'customer').conflict, true);
assert.equal(fieldFrom(conflict, 'customer').alternatives[0].value, 'PT. CUSTOMER B');

const multiItem = importer.extractDraft([
  {
    source: 'multi-po.pdf · halaman 1',
    lines: [
      'PURCHASE ORDER',
      'PT. CUSTOMER A',
      'PO Number : PO-2',
      '1 [ITEM-1] Plastik Satu 300 Kg (100 Pcs)',
      '2 [ITEM-2] Plastik Dua 400 Kg (80 Pcs)'
    ]
  },
  { source: 'phj.pdf · halaman 1', lines: ['PERHITUNGAN HARGA JUAL', 'JUMLAH ORDER 300 KG'] }
]);
assert.equal(fieldFrom(multiItem, 'jumlahOrder'), undefined);
assert.equal(fieldFrom(multiItem, 'uomOrder'), undefined);
assert.match(multiItem.issues.join(' '), /Pilih satu item per SPK/);

const scanned = importer.extractDraft([
  { source: 'scan.pdf · halaman 1', type: 'UNKNOWN', text: '' }
]);
assert.match(scanned.issues.join(' '), /kualitas scan/);

const ocrPo = importer.extractDraft([
  {
    source: 'xava-scan.pdf · halaman 1',
    text: [
      'CV.XAVAINDO',
      'Surabaya, 30 September 2026',
      'No. PO : XAVA039/PLMR/09/26',
      'DELIVERY : 12 Oktober 2026',
      'PLASTIK OPP + TP 30 MIC 24X355+3 128.000 PCS Rp 250,00',
      'TOTAL 128.000 PCS INCLUDE PPN Rp 32.000.000,00'
    ].join('\n'),
    ocr: true
  }
]);
assert.equal(fieldFrom(ocrPo, 'customer').value, 'CV. XAVAINDO');
assert.equal(fieldFrom(ocrPo, 'nomorPO').value, 'XAVA039/PLMR/09/26');
assert.equal(fieldFrom(ocrPo, 'poMasukDisplay').value, '30 September 2026');
assert.equal(fieldFrom(ocrPo, 'etd').value, '12 Oktober 2026');
assert.equal(fieldFrom(ocrPo, 'jumlahOrder').value, '128000');
assert.equal(fieldFrom(ocrPo, 'jumlahOrder').source, 'PO');

const rawMaterialPo = importer.extractDraft([
  {
    source: 'raw-material-po.pdf · halaman 1',
    lines: [
      'PURCHASE ORDER',
      'PT. MAHA NAGARI NUSANTARA',
      'Order From : PT. POLYTA GLOBAL MANDIRI',
      'Kategori PO : Raw Material Purchase',
      'Nomor : PUR-ORD-2026-02166'
    ]
  }
]);
assert.equal(fieldFrom(rawMaterialPo, 'customer'), undefined);
assert.equal(fieldFrom(rawMaterialPo, 'nomorPO'), undefined);
assert.match(rawMaterialPo.issues.join(' '), /bukan PO pesanan pelanggan/);

const imagePage = importer.extractDraft([
  { source: 'scan.png', text: 'PURCHASE ORDER\nPO Number: IMG-001', ocr: true }
]);
assert.equal(imagePage.pages[0].type, 'PO');
assert.equal(imagePage.pages[0].ocr, true);

const fallback = importer.extractDraft([
  { source: 'phj-only.pdf · halaman 1', lines: ['PERHITUNGAN HARGA JUAL', 'JUMLAH ORDER 128.000 Pcs'] }
]);
assert.equal(fieldFrom(fallback, 'jumlahOrder').source, 'PHJ');
assert.equal(fieldFrom(fallback, 'jumlahOrder').needsReview, true);

function fieldFrom(result, id) {
  return result.fields.find(item => item.id === id);
}

console.log('PASS: local PDF page classification, PO/PHJ/TDS source priority, field extraction, conflict flags, multi-item safeguards, and scanned-page warnings');
