(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.POLYTA_SPK_IMPORT = api;
  if (root && root.document) api.install(root);
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  var MAX_FILE_BYTES = 20 * 1024 * 1024;
  var MAX_FILES = 5;
  var MAX_PAGES_PER_FILE = 30;
  var PDFJS_VERSION = '3.11.174';
  var ASSET_VERSION = '20261007-5';
  var OCR_MAX_PAGES_PER_IMPORT = 30;
  var FIELDS = [
    { id: 'customer', label: 'Pelanggan', priority: ['PO', 'PHJ', 'TDS'] },
    { id: 'nomorPO', label: 'Nomor PO', priority: ['PO'] },
    { id: 'poMasukDisplay', label: 'Tanggal PO Masuk', priority: ['PO'] },
    { id: 'etd', label: 'Tanggal Kirim (ETD)', priority: ['PO', 'PHJ'] },
    { id: 'artikel', label: 'Artikel / Brand', priority: ['TDS', 'PHJ', 'PO'] },
    { id: 'kodeItem', label: 'Kode Item', priority: ['TDS', 'PO'] },
    { id: 'ukuranJadi', label: 'Ukuran Jadi', priority: ['TDS', 'PHJ', 'PO'] },
    { id: 'modelKantong', label: 'Model Kantong', priority: ['TDS', 'PHJ', 'PO'] },
    { id: 'keteranganWarna', label: 'Keterangan Warna / Printing', priority: ['TDS', 'PHJ', 'PO'] },
    { id: 'material', label: 'Jenis Bahan', priority: ['TDS', 'PHJ', 'PO'] },
    { id: 'jumlahOrder', label: 'Jumlah Pesanan', priority: ['PO', 'PHJ', 'TDS'] },
    { id: 'uomOrder', label: 'Satuan Pesanan', priority: ['PO', 'PHJ', 'TDS'] },
    { id: 'toleransi', label: 'Toleransi Kirim (%)', priority: ['PHJ', 'TDS', 'PO'] }
  ];
  var SCRIPT_URL = '';
  var installed = false;
  var ocrWorkerPromise = null;
  var ocrTaskLabel = '';
  var stagedDocuments = [];
  var savedSpk = '';
  var savingDocuments = false;
  var documentsDialog = null;
  var previewUrl = '';
  var documentTypes = ['PO', 'PHJ', 'TDS'];
  var SAVE_MAX_BYTES = 10 * 1024 * 1024;

  function updateReadingStatus(label, percent) {
    if (!window.Swal) return;
    var popup = window.Swal.getPopup();
    if (!popup || !popup.classList.contains('spk-import-progress-popup')) return;
    var detail = popup.querySelector('.spk-import-progress-detail');
    var fill = popup.querySelector('.spk-import-progress-fill');
    var progress = popup.querySelector('.spk-import-progress-track');
    if (detail) detail.textContent = label;
    if (fill) {
      fill.style.width = percent == null ? '34%' : percent + '%';
      fill.classList.toggle('is-scanning', percent == null);
    }
    if (progress) {
      if (percent == null) progress.removeAttribute('aria-valuenow');
      else progress.setAttribute('aria-valuenow', String(percent));
    }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function normalizeComparable(value) {
    return normalizeText(value).toLocaleUpperCase('id-ID').replace(/[\s.,:;()[\]-]/g, '');
  }

  function classifyPage(text) {
    var value = normalizeText(text).toLocaleUpperCase('id-ID');
    if (/PERHITUNGAN\s+HARGA\s+JUAL/.test(value)) return 'PHJ';
    if (/TEHNIKAL\s+DATA\s+SHEET|TECHNICAL\s+DATA\s+SHEET|\bTDS\b/.test(value)) return 'TDS';
    if (/PURCHASE\s+ORDER|PO\s+(?:DATE|NUMBER)|NOMOR\s+PO|NO\.?\s*PO\s*:/.test(value)) return 'PO';
    return 'UNKNOWN';
  }

  function extractNumberAndUnit(value) {
    var match = normalizeText(value).match(/(\d[\d.,]*)\s*(PCS|P\.?C\.?S?\.?|KG|KGS|ROLLS?|LEMBAR)\b/i);
    if (!match) return null;
    var numberText = match[1];
    var number;
    if (/[,.]/.test(numberText)) {
      var lastSeparator = Math.max(numberText.lastIndexOf(','), numberText.lastIndexOf('.'));
      var decimals = numberText.length - lastSeparator - 1;
      number = decimals === 3
        ? Number(numberText.replace(/[,.]/g, ''))
        : Number(numberText.replace(/\./g, '').replace(',', '.'));
    } else {
      number = Number(numberText);
    }
    if (!Number.isFinite(number) || number <= 0) return null;
    var unit = match[2].toUpperCase();
    if (unit.indexOf('PC') === 0 || unit === 'LEMBAR') unit = 'PCS';
    else if (unit.indexOf('KG') === 0) unit = 'KG';
    else unit = 'ROLL';
    return { quantity: String(number), unit: unit };
  }

  function extractPurchaseOrderNumber(text) {
    var explicit = text.match(/(?:PO\s*(?:NUMBER|NO\.?|#)|NOMOR\s*PO|NO\.?\s*PO|NOMOR)\s*[:#]?\s*([A-Z0-9][A-Z0-9./-]{3,})/i);
    if (explicit) return explicit[1].replace(/[.,;]+$/, '');
    return '';
  }

  function extractCompany(lines) {
    var candidates = [];
    for (var i = 0; i < Math.min(lines.length, 35); i++) {
      var line = normalizeText(lines[i]);
      var match = line.match(/^(PT\.?|CV\.?)\s*(.+)$/i);
      if (!match) continue;
      var name = normalizeText(match[1] + ' ' + match[2])
        .replace(/\s+(?:PURCHASE ORDER|PO DATE|PO NUMBER|SHIP TO|VENDOR|TERMS)\b.*$/i, '')
        .trim();
      var following = normalizeText(lines[i + 1]);
      if (following && /^[A-Z][A-Z .&'-]{2,}$/.test(following) &&
          !/^(PURCHASE ORDER|PO DATE|PO NUMBER|SHIP TO|VENDOR|TERMS|PHONE|FAX)$/.test(following)) {
        name += ' ' + following;
      } else if (following && /^(?:PO DATE|PO NUMBER|SHIP TO|VENDOR|TERMS)\b/i.test(following)) {
        var wrapped = normalizeText(lines[i + 2]);
        if (wrapped && /^[A-Z][A-Z .&'-]{2,}$/.test(wrapped) &&
            !/^(PURCHASE ORDER|PO DATE|PO NUMBER|SHIP TO|VENDOR|TERMS|PHONE|FAX)$/.test(wrapped)) name += ' ' + wrapped;
      }
      if (!/POLYTA\s+GLOBAL\s+MANDIRI/i.test(name)) candidates.push(name);
    }
    return candidates[0] || '';
  }

  function extractPONumberRows(lines) {
    return lines.filter(function (line) {
      return /^\d+\s+(?:\[[^\]]+\]|[A-Z0-9][A-Z0-9._/-]{3,})\s/i.test(normalizeText(line)) &&
        /\b(?:PCS|P\.?C\.?S?\.?|KG|KGS|ROLLS?)\b/i.test(line);
    }).map(function (line) {
      return extractNumberAndUnit(line);
    }).filter(Boolean);
  }

  function findLabeledValue(text, labelPattern, followingPattern) {
    var expression = new RegExp(labelPattern + '\\s*:?\\s*([\\s\\S]*?)(?=\\s+(?:' +
      followingPattern + ')\\s*:?|\\n|$)', 'i');
    var match = text.match(expression);
    return match ? normalizeText(match[1]) : '';
  }

  function findLabeledDate(lines, labelPattern) {
    var datePattern = '(\\d{1,2}\\s+[A-ZÀ-Ü][A-ZÀ-Ü]+\\s+\\d{4}|\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4})';
    var expression = new RegExp('(?:^|\\b)(?:' + labelPattern + ')\\s*:?\\s*' + datePattern, 'i');
    for (var i = 0; i < lines.length; i++) {
      var match = normalizeText(lines[i]).match(expression);
      if (match) return normalizeText(match[1]);
    }
    return '';
  }

  function findTdsLabelValue(lines, labelPattern) {
    var nextLabel = /^(?:NO\.?\s*ARTIKEL|ARTIKEL|CUSTOMER|UKURAN\s+JADI|URUTAN\s+PROSES|BLOWING|BENTUK|LEBAR|TEBAL)\b/i;
    for (var i = 0; i < lines.length; i++) {
      var match = lines[i].match(new RegExp('^' + labelPattern + '\\s*:?\\s*(.*)$', 'i'));
      if (!match) continue;
      var value = normalizeText(match[1]);
      if (!value) {
        for (var j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          var candidate = normalizeText(lines[j]);
          if (!candidate || /^\d+\.?\s*$/.test(candidate) || /^\d+\.\s*\d+\.?$/.test(candidate)) continue;
          if (nextLabel.test(candidate)) break;
          value = candidate;
          break;
        }
      } else if (new RegExp('^' + labelPattern + '$', 'i').test('UKURAN JADI') &&
          i + 1 < lines.length && /^x\s/i.test(lines[i + 1])) {
        value += ' ' + normalizeText(lines[i + 1]);
      }
      if (value && !nextLabel.test(value)) return value;
      return '';
    }
    return '';
  }

  function parsePage(page, addCandidate, issues) {
    var type = page.type;
    var text = String(page.text || '').replace(/\r/g, '\n');
    var lines = (page.lines && page.lines.length ? page.lines : text.split('\n'))
      .map(normalizeText).filter(Boolean);
    var flat = lines.join('\n');

    if (type === 'UNKNOWN') {
      issues.push(page.source + (flat
        ? ': teks terbaca tetapi jenis dokumen belum dikenali; periksa hasil OCR secara manual.'
        : ': tidak ada teks yang dapat dibaca. Periksa kualitas scan atau foto.'));
      return;
    }

    if (type === 'PO') {
      if (/KATEGORI\s+PO\s*:?\s*RAW\s+MATERIAL\s+PURCHASE/i.test(flat)) {
        issues.push(page.source + ': ini Purchase Order bahan baku, bukan PO pesanan pelanggan; tidak dipakai untuk mengisi draft SPK.');
        return;
      }
      var poNumber = extractPurchaseOrderNumber(flat);
      if (poNumber) addCandidate('nomorPO', poNumber, page);
      var poDate = findLabeledDate(lines, 'PO\\s*DATE|TANGGAL');
      if (!poDate) {
        for (var dateIndex = 0; dateIndex < lines.length; dateIndex++) {
          var cityDate = lines[dateIndex].match(/\b[A-Z][A-Z .'-]{2,},\s*(\d{1,2}\s+[A-Z]+\s+\d{4})/i);
          if (cityDate) { poDate = cityDate[1]; break; }
        }
      }
      if (poDate) addCandidate('poMasukDisplay', poDate, page);
      var deliveryDate = findLabeledDate(lines, 'TGL\\s*DELIVERY|DELIVERY\\s*DATE|DELIVERY|ETD');
      if (deliveryDate) addCandidate('etd', deliveryDate, page);
      var company = extractCompany(lines);
      if (company) addCandidate('customer', company, page);
      var orderRows = extractPONumberRows(lines);
      if (orderRows.length === 1) {
        addCandidate('jumlahOrder', orderRows[0].quantity, page);
        addCandidate('uomOrder', orderRows[0].unit, page);
      } else if (orderRows.length > 1) {
        issues.push(page.source + ': ditemukan ' + orderRows.length +
          ' baris pesanan. Pilih satu item per SPK; jumlah tidak diisi otomatis.');
      } else {
        var quantities = lines.filter(function (line) {
          return !/^\s*(?:TOTAL|GRAND\s+TOTAL|SUB\s*TOTAL|TERBILANG)\b/i.test(line);
        }).map(extractNumberAndUnit).filter(Boolean);
        if (quantities.length === 1) {
          addCandidate('jumlahOrder', quantities[0].quantity, page);
          addCandidate('uomOrder', quantities[0].unit, page);
        } else if (quantities.length > 1) {
          issues.push(page.source + ': jumlah pesanan ambigu; perlu ditinjau manual.');
        }
      }
      return;
    }

    if (type === 'PHJ') {
      var codeRow = lines.find(function (line) { return /^NO\s+CODE\b/i.test(line); });
      var codeCount = codeRow ? (codeRow.match(/\b[A-Z]\d{2}\.\d{3}\b|\b[A-Z]{2,}[A-Z0-9-]{3,}\b/gi) || []).length : 0;
      if (codeCount > 1) {
        issues.push(page.source + ': PHJ memuat beberapa kode item; nilai spesifikasi perlu dipilih per item.');
        return;
      }
      var phjFields = [
        ['customer', 'NAMA\\s+CUSTOMER', 'NAMA\\s+ITEM|BAHAN|UKURAN|MODEL\\s+KANTONG'],
        ['artikel', 'NAMA\\s+ITEM', 'BAHAN|UKURAN|MODEL\\s+KANTONG|PRINTING'],
        ['ukuranJadi', 'UKURAN', 'MODEL\\s+KANTONG|PRINTING|JUMLAH\\s+ORDER'],
        ['keteranganWarna', 'PRINTING', 'JUMLAH\\s+ORDER|FRANCO|TOLERANSI'],
        ['material', 'BAHAN', 'UKURAN|MODEL\\s+KANTONG|PRINTING']
      ];
      phjFields.forEach(function (entry) {
        var value = findLabeledValue(flat, entry[1], entry[2]);
        if (value) addCandidate(entry[0], value, page);
      });
      var modelIndex = lines.findIndex(function (line) { return /^MODEL\s+KANTONG\b/i.test(line); });
      var model = findLabeledValue(flat, 'MODEL\\s+KANTONG', 'PRINTING|JUMLAH\\s+ORDER|FRANCO');
      if (modelIndex > 0) {
        var preceding = normalizeText(lines[modelIndex - 1]);
        if (preceding && !/^(?:UKURAN|PRINTING|JUMLAH\s+ORDER|FRANCO|TOLERANSI|BAHAN|NAMA\s+)/i.test(preceding)) {
          model = preceding + ' ' + model;
        }
      }
      if (model) addCandidate('modelKantong', model, page);
      var phjOrder = findLabeledValue(flat, 'JUMLAH\\s+ORDER', ['FRANCO', 'TOLERANSI', 'PPN', 'PROFIT', 'DELIVERY']);
      var parsedOrder = extractNumberAndUnit(phjOrder);
      if (parsedOrder) {
        addCandidate('jumlahOrder', parsedOrder.quantity, page);
        addCandidate('uomOrder', parsedOrder.unit, page);
      }
      var tolerance = findLabeledValue(flat, 'TOLERANSI\\s+KIRIM', ['PPN', 'PROFIT', 'DELIVERY']);
      var toleranceMatch = tolerance.match(/(?:\+\/-|±)\s*(\d+(?:[.,]\d+)?)\s*%/);
      if (toleranceMatch) addCandidate('toleransi', toleranceMatch[1].replace(',', '.'), page);
      var phjDelivery = findLabeledDate(lines, 'DELIVERY\\s+DATE');
      if (phjDelivery) addCandidate('etd', phjDelivery, page);
      return;
    }

    if (type === 'TDS') {
      var tdsArticleCode = findTdsLabelValue(lines, 'NO\\s*\\.\\s*ARTIKEL');
      if (tdsArticleCode) addCandidate('kodeItem', tdsArticleCode, page);
      var tdsArticle = findTdsLabelValue(lines, 'ARTIKEL');
      if (tdsArticle) addCandidate('artikel', tdsArticle, page);
      var tdsCustomer = findTdsLabelValue(lines, 'CUSTOMER');
      if (tdsCustomer) addCandidate('customer', tdsCustomer, page);
      var tdsSize = findTdsLabelValue(lines, 'UKURAN\\s+JADI');
      var tdsThickness = findTdsLabelValue(lines, 'TEBAL');
      var thicknessMatch = tdsThickness.match(/^(\d+(?:[.,]\d+)?)\s*(mic|mm|mil)\b/i);
      if (tdsSize && thicknessMatch && !/\b(?:mic|mil)\b/i.test(tdsSize)) {
        tdsSize += ' x ' + thicknessMatch[1] + ' ' + thicknessMatch[2];
      }
      if (tdsSize) addCandidate('ukuranJadi', tdsSize, page);
      var tdsModel = findTdsLabelValue(lines, 'MODEL\\s+KANTONG');
      if (tdsModel) addCandidate('modelKantong', tdsModel, page);
    }
  }

  function extractDraft(pages) {
    var candidates = Object.create(null);
    var issues = [];
    var classifiedPages = (pages || []).map(function (page, index) {
      var text = page.text || (page.lines || []).join('\n');
      return {
        source: page.source || ('Dokumen · halaman ' + (page.page || index + 1)),
        fileIndex: page.fileIndex,
        type: page.type || classifyPage(text),
        text: text,
        lines: page.lines || null,
        ocr: Boolean(page.ocr)
      };
    });
    function addCandidate(field, value, page) {
      var normalized = normalizeText(value);
      if (!normalized) return;
      if (field === 'material') {
        var supportedMaterial = normalized.match(/\b(HDPE|LLDPE|SHRINK|PP|OPP|CPP)\b/i);
        if (!supportedMaterial) return;
        normalized = supportedMaterial[1].toUpperCase();
      }
      (candidates[field] || (candidates[field] = [])).push({
        value: normalized,
        source: page.type,
        page: page.source
      });
    }
    var hasMultiItemOrder = false;
    classifiedPages.forEach(function (page) {
      if (page.type === 'PO') {
        var lineItems = extractPONumberRows((page.lines || String(page.text || '').split('\n')).map(normalizeText));
        if (lineItems.length > 1) hasMultiItemOrder = true;
      }
      parsePage(page, addCandidate, issues);
    });
    if (hasMultiItemOrder) {
      delete candidates.jumlahOrder;
      delete candidates.uomOrder;
    }
    var fields = FIELDS.map(function (definition) {
      var values = candidates[definition.id] || [];
      if (!values.length) return null;
      values.sort(function (a, b) {
        return definition.priority.indexOf(a.source) - definition.priority.indexOf(b.source);
      });
      var selected = values[0];
      var distinct = [];
      values.forEach(function (candidate) {
        if (!distinct.some(function (item) { return normalizeComparable(item.value) === normalizeComparable(candidate.value); })) {
          distinct.push(candidate);
        }
      });
      return {
        id: definition.id,
        label: definition.label,
        value: selected.value,
        source: selected.source,
        page: selected.page,
        conflict: distinct.length > 1,
        preferredSource: definition.priority[0],
        needsReview: selected.source !== definition.priority[0],
        alternatives: distinct.slice(1)
      };
    }).filter(Boolean);
    return {
      fields: fields,
      issues: Array.from(new Set(issues)),
      pages: classifiedPages.map(function (page) {
        return {
          source: page.source,
          fileIndex: page.fileIndex,
          type: page.type,
          hasText: Boolean(normalizeText(page.text || (page.lines || []).join(' '))),
          ocr: page.ocr
        };
      })
    };
  }

  function groupTextLines(items) {
    var rows = [];
    items.forEach(function (item) {
      if (!item.str || !item.str.trim()) return;
      var y = Number(item.transform && item.transform[5]) || 0;
      var row = rows.find(function (candidate) { return Math.abs(candidate.y - y) <= 2.5; });
      if (!row) {
        row = { y: y, items: [] };
        rows.push(row);
      }
      row.items.push({ x: Number(item.transform && item.transform[4]) || 0, text: item.str });
    });
    return rows.sort(function (a, b) { return b.y - a.y; }).map(function (row) {
      return row.items.sort(function (a, b) { return a.x - b.x; })
        .map(function (item) { return item.text; }).join(' ').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }

  function loadScript(src, failureMessage) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error(failureMessage)); };
      document.head.appendChild(script);
    });
  }

  async function ensurePdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    if (!SCRIPT_URL) throw new Error('Lokasi pembaca PDF tidak tersedia.');
    var libraryUrl = new URL('../../assets/vendor/pdfjs/pdf-' + PDFJS_VERSION + '.min.js', SCRIPT_URL).href;
    await loadScript(libraryUrl, 'PDF.js gagal dimuat. Periksa koneksi lalu coba kembali.');
    if (!window.pdfjsLib) throw new Error('Pembaca PDF tidak berhasil dimulai.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL('../../assets/vendor/pdfjs/pdf.worker-' + PDFJS_VERSION + '.min.js', SCRIPT_URL).href;
    return window.pdfjsLib;
  }

  async function ensureOcrWorker() {
    if (ocrWorkerPromise) return ocrWorkerPromise;
    if (!SCRIPT_URL) throw new Error('Lokasi OCR lokal tidak tersedia.');
    ocrWorkerPromise = (async function () {
      var libraryUrl = new URL('../../assets/vendor/tesseract/tesseract.min.js?v=' + ASSET_VERSION, SCRIPT_URL).href;
      await loadScript(libraryUrl, 'Mesin OCR lokal gagal dimuat. Periksa koneksi lalu coba kembali.');
      if (!window.Tesseract || typeof window.Tesseract.createWorker !== 'function') {
        throw new Error('Mesin OCR lokal tidak tersedia.');
      }
      var base = new URL('../../assets/vendor/tesseract/', SCRIPT_URL);
      var corePath = new URL('core/', base).href;
      var langPath = new URL('lang/', base).href;
      var workerPath = new URL('worker.min.js', base).href;
      return window.Tesseract.createWorker('eng+ind', 1, {
        workerPath: workerPath,
        corePath: corePath,
        langPath: langPath,
        gzip: true,
        cacheMethod: 'write',
        workerBlobURL: true,
        logger: function (message) {
          if (message.status === 'recognizing text' && window.Swal && ocrTaskLabel) {
            var percent = Math.max(0, Math.min(100, Math.round((message.progress || 0) * 100)));
            updateReadingStatus(ocrTaskLabel + ' · OCR lokal ' + percent + '%', percent);
          }
        }
      });
    })().catch(function (error) {
      ocrWorkerPromise = null;
      throw error;
    });
    return ocrWorkerPromise;
  }

  async function recognizeImage(file, worker) {
    var result = await worker.recognize(file);
    return String(result && result.data && result.data.text || '').trim();
  }

  async function renderPageForOcr(page) {
    var baseViewport = page.getViewport({ scale: 1 });
    var scale = Math.min(2.4, 2200 / baseViewport.width, 2800 / baseViewport.height);
    var viewport = page.getViewport({ scale: Math.max(1.25, scale) });
    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    var context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas lokal tidak tersedia untuk OCR.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas;
  }

  async function readPdf(file, getWorker, progress) {
    if (!file || file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || '')) {
      throw new Error('Pilih file PDF: ' + (file && file.name || 'file tidak dikenal'));
    }
    if (!file.size || file.size > MAX_FILE_BYTES) throw new Error(file.name + ' harus berisi data dan maksimal 20 MB.');
    var pdfjs = await ensurePdfJs();
    var documentProxy;
    try {
      documentProxy = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      if (documentProxy.numPages > MAX_PAGES_PER_FILE) {
        throw new Error(file.name + ' memiliki ' + documentProxy.numPages + ' halaman; batas prototipe ' + MAX_PAGES_PER_FILE + ' halaman.');
      }
      var pages = [];
      for (var pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber++) {
        var page = await documentProxy.getPage(pageNumber);
        var content = await page.getTextContent();
        var lines = groupTextLines(content.items);
        var text = lines.join('\n');
        var usedOcr = false;
        if (normalizeText(text).length < 24) {
          progress(file.name + ' · halaman ' + pageNumber + '/' + documentProxy.numPages);
          var canvas = await renderPageForOcr(page);
          try {
            ocrTaskLabel = file.name + ' · halaman ' + pageNumber + '/' + documentProxy.numPages;
            text = await recognizeImage(canvas, await getWorker());
            lines = text.split(/\r?\n/).map(normalizeText).filter(Boolean);
            usedOcr = true;
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
        pages.push({
          source: file.name + ' · halaman ' + pageNumber,
          page: pageNumber,
          lines: lines,
          text: text,
          ocr: usedOcr
        });
        page.cleanup();
      }
      return pages;
    } catch (error) {
      if (error && error.message) throw error;
      throw new Error(file.name + ' tidak dapat dibaca sebagai PDF. Pastikan file tidak rusak atau terkunci.');
    } finally {
      if (documentProxy) await documentProxy.destroy();
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }

  function getTargetValue(id) {
    var target = document.getElementById(id);
    return target ? String(target.value || '').trim() : '';
  }

  function buildReviewHtml(result, files) {
    var summary = result.pages.map(function (page) {
      var typeLabel = page.type === 'UNKNOWN' ? (page.hasText ? 'belum dikenali' : 'tanpa teks / scan') : page.type;
      return '<span class="spk-import-file-chip">' + escapeHtml(page.source) + ' · ' + escapeHtml(typeLabel) +
        (page.ocr ? ' · OCR lokal' : '') + '</span>';
    }).join('');
    var rows = result.fields.map(function (field) {
      var targetValue = getTargetValue(field.id);
      var defaultChecked = !targetValue && !field.conflict;
      defaultChecked = defaultChecked && !field.needsReview;
      var conflict = field.conflict
        ? '<span class="spk-import-warning">Perbedaan ditemukan: ' + field.alternatives.map(function (item) {
          return escapeHtml(item.value + ' (' + item.source + ')');
        }).join(' · ') + '</span>'
        : '';
      var fallback = field.needsReview
        ? '<span class="spk-import-warning">Sumber utama ' + escapeHtml(field.preferredSource) +
          ' tidak terbaca untuk field ini; nilai berasal dari ' + escapeHtml(field.source) + '. Periksa sebelum memilih.</span>'
        : '';
      return '<div class="spk-import-field' + (field.conflict || field.needsReview ? ' has-conflict' : '') + '">' +
        '<label class="spk-import-field-select"><input type="checkbox" data-import-selected="' + escapeHtml(field.id) + '"' + (defaultChecked ? ' checked' : '') + '>' +
        '<span class="spk-import-field-copy"><strong>' + escapeHtml(field.label) + '</strong>' +
        '<small>Sumber utama: ' + escapeHtml(field.source) + ' · ' + escapeHtml(field.page) + '</small>' +
        conflict + fallback + '</span></label><input class="spk-import-value" type="text" data-import-value="' + escapeHtml(field.id) +
        '" value="' + escapeHtml(field.value) + '" aria-label="Nilai ' + escapeHtml(field.label) + '"></div>';
    }).join('');
    var issues = result.issues.length
      ? '<div class="spk-import-issues"><strong>Perlu diperiksa</strong><ul>' +
        result.issues.map(function (issue) { return '<li>' + escapeHtml(issue) + '</li>'; }).join('') + '</ul></div>'
      : '';
    var attachments = files && files.length ? '<div class="spk-import-section-label">Simpan bersama SPK</div>' +
      '<p class="spk-import-footnote">File tersimpan setelah SPK berhasil dibuat. Pilih kategori yang sesuai; PDF gabungan boleh masuk lebih dari satu kategori.</p>' +
      '<div class="spk-import-attachments">' + files.map(function (file, index) {
        var detected = result.pages.filter(function (page) { return page.fileIndex === index; })
          .map(function (page) { return page.type; });
        return '<div class="spk-import-attachment"><strong>' + escapeHtml(file.name) + '</strong>' +
          '<span>' + documentTypes.map(function (type) {
            return '<label><input type="checkbox" data-import-file="' + index + '" data-import-type="' + type + '"' +
              (detected.indexOf(type) !== -1 ? ' checked' : '') + '> ' + type + '</label>';
          }).join('') + '</span></div>';
      }).join('') + '</div>' : '';
    return '<div class="spk-import-review"><div class="spk-import-review-intro"><span class="spk-import-eyebrow">HASIL PEMBACAAN</span>' +
      '<strong>' + result.pages.length + ' halaman diperiksa · ' + result.fields.length + ' field ditemukan</strong>' +
      '<p>Bandingkan dengan dokumen asli. Centang data yang ingin dipindahkan dan koreksi nilainya bila perlu.</p></div>' +
      '<div class="spk-import-privacy"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>' +
      '<span>OCR diproses di browser. File yang dipilih akan disimpan ke Google Drive setelah SPK berhasil dibuat.</span></div>' +
      '<div class="spk-import-section-label">Dokumen terbaca</div><div class="spk-import-sources">' + summary + '</div>' + issues + attachments +
      (rows ? '<div class="spk-import-section-heading"><span class="spk-import-section-label">Data untuk form</span>' +
        '<span class="spk-import-selected-count" aria-live="polite"></span></div><div class="spk-import-fields">' + rows + '</div>' :
        '<div class="spk-import-empty">Belum ada field yang bisa dipetakan dari dokumen. Pastikan halaman terbaca dan tinjau teks hasil OCR.</div>') +
      '<p class="spk-import-footnote">Nilai hanya diterapkan ke kolom form yang Anda centang. Konflik tidak dicentang otomatis.</p></div>';
  }

  function updateSelectionCount(popup) {
    var count = popup.querySelector('.spk-import-selected-count');
    if (count) count.textContent = popup.querySelectorAll('[data-import-selected]:checked').length + ' dipilih';
  }

  function collectAttachments(popup, files) {
    return files.map(function (file, index) {
      var types = documentTypes.filter(function (type) {
        return Boolean(popup.querySelector('[data-import-file="' + index + '"][data-import-type="' + type + '"]:checked'));
      });
      if (!types.length) throw new Error('Pilih minimal satu kategori PO, PHJ, atau TDS untuk ' + file.name + '.');
      return { file: file, types: types };
    });
  }

  function updateDocumentButtons() {
    var buttons = document.querySelectorAll('.spk-import-document-buttons');
    buttons.forEach(function (container) {
      container.replaceChildren();
      documentTypes.forEach(function (type) {
        var count = stagedDocuments.filter(function (item) { return item.type === type; }).length;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'spk-import-category';
        button.dataset.importCategory = type;
        button.textContent = type + (count ? ' · ' + count : '');
        button.disabled = !count || savingDocuments;
        button.title = count ? 'Lihat dokumen ' + type : 'Belum ada dokumen ' + type;
        container.appendChild(button);
      });
    });
  }

  function fileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
      reader.onerror = function () { reject(new Error('File gagal dibaca: ' + file.name)); };
      reader.onabort = function () { reject(new Error('Pembacaan file dibatalkan: ' + file.name)); };
      reader.readAsDataURL(file);
    });
  }

  function documentToken() {
    var auth = window.POLYTA_PORTAL_AUTH && window.POLYTA_PORTAL_AUTH.stored();
    if (!auth || !auth.token) {
      var stored = window.sessionStorage.getItem('pgm:spk-auth-v1') ||
        window.localStorage.getItem('pgm:spk-auth-v1');
      if (stored) auth = JSON.parse(stored);
    }
    if (!auth || !auth.token) throw new Error('Sesi login tidak tersedia. Masuk kembali untuk menyimpan dokumen.');
    return auth.token;
  }

  function saveDocumentRpc(authToken, spk, payload) {
    return new Promise(function (resolve, reject) {
      if (!window.google || !window.google.script || !window.google.script.run) {
        reject(new Error('Layanan dokumen tidak tersedia. Buka halaman melalui portal.'));
        return;
      }
      window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)
        .saveSpkDocument(authToken, spk, payload);
    });
  }

  function updateSaveStatus(message, kind) {
    var status = document.querySelector('.spk-import-save-status');
    if (!status) return;
    status.textContent = message;
    status.className = 'spk-import-save-status' + (kind ? ' is-' + kind : '');
  }

  function updateRetryButton() {
    var button = document.querySelector('.spk-import-retry');
    if (button) button.hidden = savingDocuments || !stagedDocuments.some(function (item) { return !item.saved; });
  }

  async function saveStagedDocuments() {
    if (savingDocuments || !savedSpk || !stagedDocuments.some(function (item) { return !item.saved; })) return;
    savingDocuments = true;
    updateDocumentButtons();
    updateRetryButton();
    var overlay = document.getElementById('saveSuccessOverlay');
    var actions = overlay ? overlay.querySelectorAll('#saveSuccessCloseBtn, #printSpkLink') : [];
    actions.forEach(function (action) { action.style.pointerEvents = 'none'; action.setAttribute('aria-disabled', 'true'); });
    var authToken;
    try { authToken = documentToken(); }
    catch (error) {
      stagedDocuments.forEach(function (item) { if (!item.saved) item.error = error.message; });
    }
    if (authToken) {
      for (var index = 0; index < stagedDocuments.length; index++) {
        var item = stagedDocuments[index];
        if (item.saved) continue;
        try {
          updateSaveStatus('Menyimpan ' + (index + 1) + '/' + stagedDocuments.length + ': ' + item.type + ' · ' + item.file.name);
          var response = await saveDocumentRpc(authToken, savedSpk, {
            type: item.type, name: item.file.name, uploadId: item.uploadId,
            base64: await fileAsBase64(item.file)
          });
          if (!response || response.status !== 'success' || !response.document) {
            throw new Error(response && response.message || 'Penyimpanan dokumen belum terkonfirmasi.');
          }
          item.document = response.document;
          item.saved = true;
          item.error = '';
        } catch (error) {
          item.error = error && error.message || 'Penyimpanan dokumen gagal.';
          console.error('Dokumen SPK gagal disimpan', error);
        }
      }
    }
    savingDocuments = false;
    actions.forEach(function (action) { action.style.pointerEvents = ''; action.removeAttribute('aria-disabled'); });
    var pending = stagedDocuments.filter(function (item) { return !item.saved; });
    var saved = stagedDocuments.length - pending.length;
    updateSaveStatus(pending.length
      ? saved + ' dokumen tersimpan, ' + pending.length + ' belum berhasil: ' +
        pending.map(function (item) { return item.type + ' · ' + item.file.name + ' (' + item.error + ')'; }).join('; ') +
        '. Klik Coba lagi atau buka Kelola SPK untuk mengunggah ulang.'
      : saved + ' dokumen berhasil disimpan pada SPK ' + savedSpk + '.', pending.length ? 'error' : 'success');
    updateDocumentButtons();
    updateRetryButton();
  }

  function ensureSaveControls() {
    var overlay = document.getElementById('saveSuccessOverlay');
    if (!overlay || overlay.querySelector('.spk-import-save-controls')) return;
    var controls = document.createElement('div');
    controls.className = 'spk-import-save-controls';
    controls.innerHTML = '<p class="spk-import-save-status" role="status" aria-live="polite"></p>' +
      '<div class="spk-import-document-buttons" role="group" aria-label="Lihat dokumen yang disimpan"></div>' +
      '<button class="spk-import-retry" type="button" hidden>Coba lagi simpan dokumen</button>';
    overlay.querySelector('.save-success-reference').after(controls);
    updateDocumentButtons();
  }

  function closeDocumentDialog() {
    if (!documentsDialog) return;
    documentsDialog.close();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }

  function showDocument(type) {
    if (savingDocuments) return;
    var documents = stagedDocuments.filter(function (item) { return item.type === type; });
    if (!documents.length) return;
    if (!documentsDialog) {
      documentsDialog = document.createElement('dialog');
      documentsDialog.className = 'spk-import-document-dialog';
      documentsDialog.setAttribute('aria-label', 'Dokumen SPK');
      documentsDialog.innerHTML = '<div class="spk-import-document-head"><strong></strong>' +
        '<button type="button" class="spk-import-document-close" aria-label="Tutup dokumen">Tutup</button></div>' +
        '<div class="spk-import-document-tabs"></div><div class="spk-import-document-content"></div>' +
        '<p class="spk-import-document-state"></p><button type="button" class="spk-import-document-remove">Hapus dari pilihan</button>';
      documentsDialog.querySelector('.spk-import-document-close').addEventListener('click', closeDocumentDialog);
      documentsDialog.addEventListener('close', function () {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = '';
      });
      document.body.appendChild(documentsDialog);
    }
    documentsDialog.querySelector('.spk-import-document-head strong').textContent = 'Dokumen ' + type;
    var tabs = documentsDialog.querySelector('.spk-import-document-tabs');
    tabs.replaceChildren();
    function select(item, tab) {
      tabs.querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-pressed', String(button === tab)); });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      var content = documentsDialog.querySelector('.spk-import-document-content');
      content.replaceChildren();
      var isPdf = /\.pdf$/i.test(item.file.name);
      var isImage = /\.(?:png|jpe?g)$/i.test(item.file.name);
      if (item.saved && item.document && item.document.fileId) {
        var frame = document.createElement('iframe');
        frame.title = 'Preview ' + item.file.name;
        frame.src = 'https://drive.google.com/file/d/' + encodeURIComponent(item.document.fileId) + '/preview';
        content.appendChild(frame);
        var link = document.createElement('a');
        link.href = item.document.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Buka di Google Drive jika preview tidak tampil';
        if (!/^https:\/\/drive\.google\.com\//.test(link.href)) throw new Error('Tautan dokumen tidak valid.');
        content.appendChild(link);
      } else if (isPdf || isImage) {
        previewUrl = URL.createObjectURL(item.file);
        var preview = document.createElement(isPdf ? 'iframe' : 'img');
        if (isPdf) preview.title = 'Preview ' + item.file.name;
        else preview.alt = item.file.name;
        preview.src = previewUrl;
        content.appendChild(preview);
      }
      documentsDialog.querySelector('.spk-import-document-state').textContent =
        item.file.name + ' · ' + (item.saved ? 'Tersimpan di Google Drive' :
          item.error ? 'Belum tersimpan: ' + item.error : 'Preview lokal · belum disimpan');
      var remove = documentsDialog.querySelector('.spk-import-document-remove');
      remove.hidden = item.saved;
      remove.onclick = function () {
        if (item.saved) return;
        stagedDocuments.splice(stagedDocuments.indexOf(item), 1);
        updateDocumentButtons();
        closeDocumentDialog();
        if (stagedDocuments.some(function (entry) { return entry.type === type; })) showDocument(type);
      };
    }
    documents.forEach(function (item, index) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.textContent = item.file.name;
      tab.addEventListener('click', function () { select(item, tab); });
      tabs.appendChild(tab);
      if (!index) select(item, tab);
    });
    documentsDialog.showModal();
  }

  function applySelection(popup, result) {
    var fields = result.fields;
    var applied = [];
    var skipped = [];
    fields.forEach(function (field) {
      var checkbox = popup.querySelector('[data-import-selected="' + field.id + '"]');
      if (!checkbox || !checkbox.checked) return;
      var valueInput = popup.querySelector('[data-import-value="' + field.id + '"]');
      var target = document.getElementById(field.id);
      if (!target || !valueInput) {
        skipped.push(field.label);
        return;
      }
      var value = valueInput.value.trim();
      if (!value) {
        skipped.push(field.label + ' (kosong)');
        return;
      }
      if (field.id === 'poMasukDisplay' && typeof window.parseEtdQuickValue_ === 'function' &&
          !window.parseEtdQuickValue_(value)) {
        skipped.push(field.label + ' (format tanggal tidak dikenali)');
        return;
      }
      if (field.id === 'etd') {
        if (typeof window.parseEtdQuickValue_ !== 'function' ||
            typeof window.setEtdValue_ !== 'function' ||
            !window.parseEtdQuickValue_(value)) {
          skipped.push(field.label + ' (format tanggal tidak dikenali)');
          return;
        }
        window.setEtdValue_(value);
        applied.push(field.label);
        return;
      }
      if (target.tagName === 'SELECT' && !Array.from(target.options).some(function (option) {
        return option.value.toLocaleUpperCase('id-ID') === value.toLocaleUpperCase('id-ID');
      })) {
        skipped.push(field.label + ' (nilai tidak tersedia pada pilihan form)');
        return;
      }
      var previousValue = target.value;
      target.value = value;
      if (field.id === 'poMasukDisplay' && typeof window.commitPoMasukDisplay_ === 'function' &&
          !window.commitPoMasukDisplay_()) {
        target.value = previousValue;
        skipped.push(field.label + ' (format tanggal tidak dikenali)');
        return;
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      applied.push(field.label);
    });
    return { applied: applied, skipped: skipped };
  }

  async function importFiles(files) {
    if (!files.length || files.length > MAX_FILES) {
      throw new Error('Pilih 1 sampai ' + MAX_FILES + ' file dokumen dalam satu proses.');
    }
    var totalBytes = files.reduce(function (total, file) { return total + file.size; }, 0);
    if (totalBytes > MAX_FILES * MAX_FILE_BYTES) throw new Error('Total ukuran dokumen maksimal 100 MB per proses.');
    var allPages = [];
    var ocrPages = 0;
    var getWorker = function () {
      if (ocrPages >= OCR_MAX_PAGES_PER_IMPORT) {
        throw new Error('Batas OCR lokal ' + OCR_MAX_PAGES_PER_IMPORT + ' halaman per proses tercapai.');
      }
      ocrPages++;
      return ensureOcrWorker();
    };
    try {
      for (var index = 0; index < files.length; index++) {
        var file = files[index];
        updateReadingStatus('Dokumen ' + (index + 1) + '/' + files.length + ' · ' + file.name);
        if (!file.size || file.size > MAX_FILE_BYTES) {
          throw new Error(file.name + ' harus berisi data dan maksimal 20 MB.');
        }
        if (/\.pdf$/i.test(file.name || '') || file.type === 'application/pdf') {
          var pdfPages = await readPdf(file, getWorker, function (label) {
            ocrTaskLabel = label;
            updateReadingStatus(label + ' · menyiapkan OCR lokal…');
          });
          pdfPages.forEach(function (page) { page.fileIndex = index; });
          allPages = allPages.concat(pdfPages);
        } else if (/^image\/(?:png|jpeg)$/i.test(file.type || '') || /\.(?:png|jpe?g)$/i.test(file.name || '')) {
          var imageWorker = await getWorker();
          ocrTaskLabel = file.name;
          updateReadingStatus(file.name + ' · menyiapkan OCR lokal…');
          var imageText = await recognizeImage(file, imageWorker);
          allPages.push({
            source: file.name,
            fileIndex: index,
            type: classifyPage(imageText),
            text: imageText,
            lines: imageText.split(/\r?\n/).map(normalizeText).filter(Boolean),
            ocr: true
          });
        } else {
          throw new Error('Format belum didukung untuk ekstraksi lokal: ' + file.name + '. Pilih PDF, PNG, atau JPEG.');
        }
      }
      return extractDraft(allPages);
    } finally {
      var workerPromise = ocrWorkerPromise;
      ocrWorkerPromise = null;
      ocrTaskLabel = '';
      if (workerPromise) {
        var worker = await workerPromise;
        await worker.terminate();
      }
    }
  }

  async function chooseDocuments() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
    input.multiple = true;
    input.hidden = true;
    document.body.appendChild(input);
    input.addEventListener('change', async function () {
      var files = Array.from(input.files || []);
      input.remove();
      if (!files.length) return;
      if (!window.Swal) {
        throw new Error('Dialog tinjau tidak tersedia. Muat ulang halaman lalu coba kembali.');
      }
      var oversize = files.find(function (file) { return file.size > SAVE_MAX_BYTES; });
      if (oversize) {
        window.Swal.fire({ icon: 'warning', title: 'File terlalu besar',
          text: oversize.name + ' melebihi batas penyimpanan 10 MB per file. Pilih file yang lebih kecil.' });
        return;
      }
      window.Swal.fire({
        title: 'Membaca dokumen',
        html: '<div class="spk-import-progress"><div class="spk-import-progress-visual" aria-hidden="true">' +
          '<i class="fa-solid fa-file-lines"></i><span></span><i class="fa-solid fa-wand-magic-sparkles"></i></div>' +
          '<p class="spk-import-progress-lead">Mengambil data dari PO, PHJ, dan TDS</p>' +
          '<p class="spk-import-progress-detail" role="status" aria-live="polite">Menyiapkan ' + files.length + ' dokumen…</p>' +
          '<div class="spk-import-progress-track" role="progressbar" aria-label="Kemajuan OCR" aria-valuemin="0" aria-valuemax="100">' +
          '<span class="spk-import-progress-fill is-scanning"></span></div>' +
          '<small>OCR berlangsung di perangkat ini. File baru diunggah setelah SPK berhasil dibuat.</small></div>',
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: { popup: 'spk-import-progress-popup' }
      });
      try {
        var result = await importFiles(files);
        var review = await window.Swal.fire({
          title: 'Tinjau draft SPK',
          html: buildReviewHtml(result, files),
          width: 860,
          showCancelButton: true,
          confirmButtonText: 'Terapkan pilihan ke form',
          cancelButtonText: 'Kembali ke form',
          focusConfirm: false,
          customClass: { popup: 'spk-import-review-popup', confirmButton: 'spk-import-confirm' },
          didOpen: function (popup) {
            updateSelectionCount(popup);
            popup.addEventListener('change', function (event) {
              if (event.target.matches('[data-import-selected]')) updateSelectionCount(popup);
            });
          },
          preConfirm: function () {
            var popup = window.Swal.getPopup();
            var attachments;
            try { attachments = collectAttachments(popup, files); }
            catch (error) {
              window.Swal.showValidationMessage(error.message);
              return false;
            }
            return { fields: applySelection(popup, result), attachments: attachments };
          }
        });
        if (review.isConfirmed) {
          var summary = review.value.fields;
          var additions = review.value.attachments.flatMap(function (attachment) {
            return attachment.types.map(function (type) {
              return { file: attachment.file, type: type, uploadId: crypto.randomUUID(), saved: false, error: '', document: null };
            });
          });
          additions.forEach(function (item) {
            if (!stagedDocuments.some(function (existing) {
              return existing.type === item.type && existing.file.name === item.file.name &&
                existing.file.size === item.file.size && existing.file.lastModified === item.file.lastModified;
            })) stagedDocuments.push(item);
          });
          updateDocumentButtons();
          await window.Swal.fire({
            icon: summary.skipped.length ? 'warning' : summary.applied.length ? 'success' : 'info',
            title: summary.skipped.length ? 'Sebagian data perlu diperiksa' :
              summary.applied.length ? 'Draft siap diperiksa' : 'Belum ada data yang diterapkan',
            text: summary.applied.length
              ? summary.applied.length + ' field diisi; ' + stagedDocuments.length + ' dokumen siap disimpan bersama SPK. Periksa kembali form sebelum menyimpan.' +
                (summary.skipped.length ? ' Tidak diterapkan: ' + summary.skipped.join(', ') + '.' : '')
              : summary.skipped.length
                ? 'Tidak diterapkan: ' + summary.skipped.join(', ') + '. Periksa nilai lalu coba kembali.'
                : stagedDocuments.length + ' dokumen siap disimpan bersama SPK. Form belum berubah.',
            confirmButtonText: 'Mengerti',
            customClass: { popup: 'spk-import-notice-popup' }
          });
        }
      } catch (error) {
        window.Swal.fire({
          icon: 'error',
          title: 'Dokumen belum dapat dibaca',
          text: error.message || 'Terjadi kesalahan saat membaca dokumen.',
          footer: 'Periksa format, ukuran, dan kualitas file, lalu coba lagi.',
          confirmButtonText: 'Mengerti',
          customClass: { popup: 'spk-import-notice-popup' }
        });
      }
    });
    input.click();
  }

  function addLauncher() {
    var root = document.getElementById('spkInputRoot');
    var fields = document.getElementById('dataUtamaFields');
    if (!root || !fields || root.querySelector('.spk-import-launcher')) return;
    var launcher = document.createElement('section');
    launcher.className = 'spk-import-launcher';
    launcher.innerHTML = '<div class="spk-import-launcher-icon" aria-hidden="true"><i class="fa-solid fa-file-lines"></i></div>' +
      '<div class="spk-import-launcher-copy"><span class="spk-import-eyebrow">ASISTEN DOKUMEN · OCR LOKAL</span>' +
      '<strong>Buat draft SPK dari dokumen</strong><p>Baca PO, PHJ, dan TDS dari PDF atau gambar. Tinjau hasil sebelum mengisi form.</p>' +
      '<span class="spk-import-launcher-meta"><i class="fa-solid fa-lock" aria-hidden="true"></i> OCR lokal · File disimpan hanya setelah SPK dibuat</span>' +
      '<div class="spk-import-document-buttons" role="group" aria-label="Lihat dokumen SPK"></div></div>' +
      '<button type="button" class="spk-import-open"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Baca Dokumen <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>';
    fields.parentNode.insertBefore(launcher, fields);
    updateDocumentButtons();
  }

  function install(browserWindow) {
    if (installed || !browserWindow || !browserWindow.document) return;
    installed = true;
    var doc = browserWindow.document;
    var script = doc.currentScript || doc.querySelector('script[src*="spk-document-import.js"]');
    SCRIPT_URL = script && script.src || '';
    var stylesheet = doc.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('spk-document-import.css?v=' + ASSET_VERSION, SCRIPT_URL || browserWindow.location.href).href;
    doc.head.appendChild(stylesheet);
    doc.addEventListener('click', function (event) {
      var category = event.target.closest('[data-import-category]');
      if (category) {
        showDocument(category.dataset.importCategory);
        return;
      }
      if (event.target.closest('.spk-import-retry')) {
        saveStagedDocuments();
        return;
      }
      var button = event.target.closest('.spk-import-open');
      if (!button) return;
      chooseDocuments().catch(function (error) {
        if (window.Swal) window.Swal.fire({ icon: 'error', title: 'Tidak dapat membuka dokumen', text: error.message });
        else console.error('Pembacaan dokumen gagal', error);
      });
      doc.addEventListener('click', function (event) {
        if (savingDocuments && event.target.closest('#saveSuccessCloseBtn, #printSpkLink')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
      doc.addEventListener('spk:input-saved', function (event) {
        savedSpk = String(event.detail && event.detail.spk || '').trim();
        if (!stagedDocuments.length) return;
        ensureSaveControls();
        updateSaveStatus('Menyiapkan penyimpanan ' + stagedDocuments.length + ' dokumen…');
        saveStagedDocuments();
      });
      doc.addEventListener('spk:input-reset', function () {
        if (savingDocuments) return;
        stagedDocuments = [];
        savedSpk = '';
        if (documentsDialog && documentsDialog.open) closeDocumentDialog();
        updateDocumentButtons();
      });
      browserWindow.addEventListener('beforeunload', function (event) {
        if (savingDocuments) { event.preventDefault(); event.returnValue = ''; }
      });
    });
    function observeRoot() {
      addLauncher();
      var observer = new browserWindow.MutationObserver(addLauncher);
      observer.observe(doc.body, { childList: true, subtree: true });
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', observeRoot, { once: true });
    else observeRoot();
  }

  return {
    buildReviewHtml: buildReviewHtml,
    classifyPage: classifyPage,
    collectAttachments: collectAttachments,
    extractDraft: extractDraft,
    groupTextLines: groupTextLines,
    install: install,
    importFiles: importFiles,
    readPdf: readPdf
  };
});
