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
  var ASSET_VERSION = '20261007-7';
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
  var draftBatches = [];
  var activeDraft = null;
  var activeDraftFields = null;
  var savingDraft = false;

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
      number = decimals === 3 && /^\d{1,3}(?:[.,]\d{3})+$/.test(numberText)
        ? Number(numberText.replace(/[,.]/g, ''))
        : Number(numberText.slice(0, lastSeparator).replace(/[,.]/g, '') + '.' +
          numberText.slice(lastSeparator + 1));
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

  function extractPoItems(lines, source) {
    return lines.map(function (line) {
      var match = normalizeText(line).match(/^(\d+)\s+(?:\[([^\]]+)\]|([A-Z0-9][A-Z0-9._/-]{3,}))\s+(.+?)\s+(\d[\d.,]*\s*(?:PCS|P\.?C\.?S?\.?|KG|KGS|ROLLS?))\b/i);
      if (!match) return null;
      var amount = extractNumberAndUnit(match[5]);
      if (!amount) return null;
      return {
        code: normalizeText(match[2] || match[3]),
        name: normalizeText(match[4]),
        quantity: amount.quantity,
        unit: amount.unit,
        source: source,
        type: 'PO'
      };
    }).filter(Boolean);
  }

  function phjCodes(lines) {
    var row = lines.find(function (line) { return /^NO\s+(?:CODE|KODE)\b/i.test(line); });
    return row ? (normalizeText(row).replace(/^NO\s+(?:CODE|KODE)\s*:?\s*/i, '')
      .match(/\b[A-Z0-9][A-Z0-9._/-]{3,}\b/gi) || []) : [];
  }

  function phjColumns(page, codes) {
    if (!Array.isArray(page.layout) || page.layout.length === 0) return [];
    var codeCells = page.layout.filter(function (cell) {
      return codes.some(function (code) { return normalizeComparable(cell.text) === normalizeComparable(code); });
    }).sort(function (a, b) { return a.x - b.x; });
    if (codeCells.length !== codes.length) return [];
    var rows = [];
    page.layout.forEach(function (cell) {
      var row = rows.find(function (entry) { return Math.abs(entry.y - cell.y) <= 2.5; });
      if (!row) { row = { y: cell.y, cells: [] }; rows.push(row); }
      row.cells.push(cell);
    });
    return codeCells.map(function (codeCell, index) {
      var extracted = ['PERHITUNGAN HARGA JUAL'];
      rows.sort(function (a, b) { return b.y - a.y; }).forEach(function (row) {
        var cells = row.cells.sort(function (a, b) { return a.x - b.x; });
        var label = cells.find(function (cell) { return cell.x < codeCells[0].x - 40; });
        if (!label || !/^(?:NO\s+(?:CODE|KODE)|NAMA\s+CUSTOMER|NAMA\s+ITEM|BAHAN|UKURAN|MODEL\s+KANTONG|PRINTING|JUMLAH\s+ORDER|TOLERANSI\s+KIRIM|DELIVERY\s+DATE)\b/i.test(label.text)) return;
        var values = cells.filter(function (cell) {
          if (cell === label || cell.x < codeCells[0].x - 40) return false;
          var nearest = codeCells.reduce(function (best, candidate, candidateIndex) {
            return Math.abs(cell.x - candidate.x) < Math.abs(cell.x - codeCells[best].x) ? candidateIndex : best;
          }, 0);
          return nearest === index;
        }).map(function (cell) { return cell.text; });
        if (values.length) extracted.push(label.text + ' ' + values.join(' '));
      });
      return { code: normalizeText(codeCell.text), lines: extracted, source: page.source };
    });
  }

  function tdsSections(page) {
    var lines = (page.lines || page.text.split('\n')).map(normalizeText);
    var starts = [];
    lines.forEach(function (line, index) {
      if (/^NO\s*\.?\s*ARTIKEL\b/i.test(line)) starts.push(index);
    });
    if (starts.length <= 1) return [page];
    return starts.map(function (start, index) {
      var section = ['TEHNIKAL DATA SHEET (TDS)'].concat(lines.slice(start, starts[index + 1] || lines.length));
      return Object.assign({}, page, { source: page.source + ' · item ' + (index + 1),
        lines: section, text: section.join('\n') });
    });
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
      var orderRows = extractPoItems(lines, page.source);
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
      var codeCount = phjCodes(lines).length;
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

  function extractDraft(pages, selectedCode) {
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
        layout: page.layout || null,
        ocr: Boolean(page.ocr)
      };
    });
    var itemsByType = { PO: [], PHJ: [], TDS: [] };
    function addItem(item) {
      var group = itemsByType[item.type];
      var existing = group.find(function (candidate) {
        return normalizeComparable(candidate.code) === normalizeComparable(item.code);
      });
      if (!existing) group.push(item);
    }
    classifiedPages.forEach(function (page) {
      var lines = (page.lines || page.text.split('\n')).map(normalizeText);
      if (page.type === 'PO' && !/KATEGORI\s+PO\s*:?\s*RAW\s+MATERIAL\s+PURCHASE/i.test(page.text)) {
        extractPoItems(lines, page.source).forEach(addItem);
      } else if (page.type === 'PHJ') {
        var codes = phjCodes(lines);
        if (codes.length > 1) {
          var columns = phjColumns(page, codes);
          codes.forEach(function (code) {
            var column = columns.find(function (entry) {
              return normalizeComparable(entry.code) === normalizeComparable(code);
            });
            addItem({ code: code, name: column &&
              findLabeledValue(column.lines.join('\n'), 'NAMA\\s+ITEM', 'BAHAN|UKURAN') || code,
              source: page.source, type: 'PHJ' });
          });
        } else if (codes.length === 1) {
          addItem({ code: codes[0], name: findLabeledValue(lines.join('\n'), 'NAMA\\s+ITEM', 'BAHAN|UKURAN') || codes[0],
            source: page.source, type: 'PHJ' });
        }
      } else if (page.type === 'TDS') {
        tdsSections(page).forEach(function (section) {
          var sectionLines = section.lines || lines;
          var tdsCode = findTdsLabelValue(sectionLines, 'NO\\s*\\.\\s*ARTIKEL');
          if (tdsCode) addItem({ code: tdsCode, name: findTdsLabelValue(sectionLines, 'ARTIKEL') || tdsCode,
            source: section.source, type: 'TDS' });
        });
      }
    });
    var items = itemsByType.PO.length > 1 ? itemsByType.PO :
      itemsByType.PHJ.length > 1 ? itemsByType.PHJ :
      itemsByType.TDS.length > 1 ? itemsByType.TDS :
      itemsByType.PO.length ? itemsByType.PO :
      itemsByType.PHJ.length ? itemsByType.PHJ : itemsByType.TDS;
    var multiItem = items.length > 1;
    var selected = multiItem && selectedCode ? items.find(function (item) {
      return normalizeComparable(item.code) === normalizeComparable(selectedCode);
    }) : null;
    if (multiItem && selectedCode && !selected) throw new Error('Item yang dipilih tidak ditemukan di dokumen.');
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
        var lineItems = extractPoItems((page.lines || String(page.text || '').split('\n')).map(normalizeText), page.source);
        if (lineItems.length > 1) hasMultiItemOrder = true;
        if (multiItem && selected) {
          var chosen = lineItems.find(function (item) {
            return normalizeComparable(item.code) === normalizeComparable(selected.code);
          });
          var sharedLines = (page.lines || page.text.split('\n')).filter(function (line) {
            return !/^\d+\s+(?:\[[^\]]+\]|[A-Z0-9][A-Z0-9._/-]{3,})\s/i.test(normalizeText(line));
          });
          parsePage(Object.assign({}, page, { lines: sharedLines, text: sharedLines.join('\n') }), addCandidate, issues);
          if (chosen) {
            addCandidate('kodeItem', chosen.code, page);
            addCandidate('artikel', chosen.name, page);
            addCandidate('jumlahOrder', chosen.quantity, page);
            addCandidate('uomOrder', chosen.unit, page);
          }
          return;
        }
      }
      if (multiItem && page.type === 'PHJ') {
        var codes = phjCodes((page.lines || page.text.split('\n')).map(normalizeText));
        if (selected && !codes.length) {
          issues.push(page.source + ': kode item PHJ tidak terbaca; spesifikasi PHJ tidak dipakai. Periksa secara manual.');
          return;
        }
        if (!selected || !codes.some(function (code) {
          return normalizeComparable(code) === normalizeComparable(selected.code);
        })) return;
        if (codes.length > 1) {
          var column = phjColumns(page, codes).find(function (item) {
            return normalizeComparable(item.code) === normalizeComparable(selected.code);
          });
          if (!column) {
            issues.push(page.source + ': kolom PHJ tidak dapat dipasangkan dengan ' + selected.code + '; isi spesifikasi secara manual.');
            return;
          }
          parsePage(Object.assign({}, page, { lines: column.lines, text: column.lines.join('\n') }), addCandidate, issues);
          return;
        }
      }
      if (multiItem && page.type === 'TDS') {
        if (!selected) return;
        if (!tdsSections(page).some(function (entry) {
          return findTdsLabelValue(entry.lines || entry.text.split('\n'), 'NO\\s*\\.\\s*ARTIKEL');
        })) {
          issues.push(page.source + ': kode item TDS tidak terbaca; spesifikasi TDS tidak dipakai. Periksa secara manual.');
          return;
        }
        var section = tdsSections(page).find(function (entry) {
          return normalizeComparable(findTdsLabelValue(entry.lines || entry.text.split('\n'),
            'NO\\s*\\.\\s*ARTIKEL')) === normalizeComparable(selected.code);
        });
        if (section) parsePage(section, addCandidate, issues);
        return;
      }
      parsePage(page, addCandidate, issues);
    });
    if (multiItem && !selected) {
      Object.keys(candidates).forEach(function (id) {
        if (['customer', 'nomorPO', 'poMasukDisplay', 'etd'].indexOf(id) === -1) delete candidates[id];
      });
      issues.push('Dokumen memuat beberapa item. Pilih satu item sebelum menerapkan data ke SPK.');
    } else if (hasMultiItemOrder && !selected) {
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
      items: items,
      selectedItem: selected ? selected.code : '',
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
          layout: content.items.map(function (item) {
            return { x: Number(item.transform && item.transform[4]) || 0,
              y: Number(item.transform && item.transform[5]) || 0, text: String(item.str || '') };
          }).filter(function (item) { return item.text.trim(); }),
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
      defaultChecked = defaultChecked && (!field.needsReview || Boolean(result.selectedItem));
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
      '<p>' + (result.selectedItem ? 'Item ' + escapeHtml(result.selectedItem) + ' · ' : '') +
      'Bandingkan dengan dokumen asli. Centang data yang ingin dipindahkan dan koreksi nilainya bila perlu.</p></div>' +
      '<div class="spk-import-privacy"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>' +
      '<span>' + (result.fromSavedDraft
        ? 'Dokumen sumber draft telah tersimpan privat; setelah SPK dibuat dokumen dipasangkan ke SPK ini.'
        : 'OCR diproses di browser. File yang dipilih akan disimpan ke Google Drive setelah SPK berhasil dibuat.') +
      '</span></div>' +
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

  function draftRpc(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      if (!window.google || !window.google.script || !window.google.script.run) {
        reject(new Error('Layanan draft tidak tersedia. Buka halaman melalui portal.'));
        return;
      }
      var runner = window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      runner[method].apply(runner, args);
    });
  }

  function requireDraftResponse(response, property) {
    if (!response || response.status !== 'success' || (property && !response[property])) {
      throw new Error(response && response.message || 'Respons penyimpanan draft tidak dapat dikonfirmasi.');
    }
    return response;
  }

  function makeDraftItems(result) {
    if (!result.items || result.items.length < 2 || !result.sourcePages) {
      throw new Error('Tidak ada beberapa item yang dapat dibuat menjadi draft.');
    }
    if (result.items.length > 30) throw new Error('Maksimal 30 item per kelompok draft. Pisahkan dokumen menjadi beberapa kelompok.');
    return result.items.map(function (item) {
      var draft = extractDraft(result.sourcePages, item.code);
      return {
        code: item.code,
        name: item.name,
        fields: draft.fields.map(function (field) {
          return { id: field.id, label: field.label, value: field.value, source: field.source,
            page: field.page, conflict: field.conflict, needsReview: field.needsReview,
            preferredSource: field.preferredSource, alternatives: field.alternatives };
        }),
        issues: draft.issues
      };
    });
  }

  function draftFileDescriptors(result, files) {
    return files.map(function (file, index) {
      var types = documentTypes.filter(function (type) {
        return result.pages.some(function (page) { return page.fileIndex === index && page.type === type; });
      });
      return { index: index, name: file.name, types: types };
    });
  }

  function updateDraftButton() {
    document.querySelectorAll('.spk-import-drafts-open').forEach(function (button) {
      var pending = draftBatches.reduce(function (count, batch) {
        return count + batch.items.filter(function (item) { return item.status !== 'completed'; }).length;
      }, 0);
      button.textContent = 'Draft Saya' + (pending ? ' · ' + pending : '');
    });
  }

  async function refreshDraftBatches() {
    var response = requireDraftResponse(await draftRpc('listSpkImportDrafts', documentToken()), 'batches');
    if (!Array.isArray(response.batches)) throw new Error('Daftar draft tidak valid.');
    draftBatches = response.batches;
    updateDraftButton();
    return draftBatches;
  }

  async function saveMultiDraft(result, files) {
    var items = makeDraftItems(result);
    var descriptors = await Promise.all(draftFileDescriptors(result, files).map(async function (entry) {
      var file = files[entry.index];
      var digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
      return Object.assign({}, entry, { size: file.size,
        hash: btoa(String.fromCharCode.apply(null, digest)) });
    }));
    var confirmation = await window.Swal.fire({
      title: 'Simpan semua item sebagai draft?',
      html: '<div class="spk-import-draft-summary"><p>' + items.length +
        ' draft SPK terpisah akan disimpan untuk akun Anda. Dokumen sumber diunggah ke penyimpanan privat agar tersedia setelah login ulang.</p>' +
        items.map(function (item) {
          return '<div><strong>' + escapeHtml(item.code) + '</strong> · ' + escapeHtml(item.name) +
            ' · ' + item.fields.length + ' field terbaca' +
            (item.issues.length ? ' · ' + item.issues.length + ' perlu diperiksa' : '') + '</div>';
        }).join('') + '<p>Satu item dapat ditinjau dan disimpan sebagai SPK secara terpisah. Belum ada SPK yang dibuat.</p>' +
        '<strong>Kategori dokumen sumber</strong>' + descriptors.map(function (file) {
          return '<div class="spk-import-draft-file"><span>' + escapeHtml(file.name) + '</span>' +
            documentTypes.map(function (type) {
              return '<label><input type="checkbox" data-draft-file="' + file.index +
                '" data-draft-type="' + type + '"' + (file.types.indexOf(type) !== -1 ? ' checked' : '') +
                '> ' + type + '</label>';
            }).join('') + '</div>';
        }).join('') + '</div>',
      showCancelButton: true,
      confirmButtonText: 'Simpan semua draft',
      cancelButtonText: 'Batal',
      customClass: { popup: 'spk-import-review-popup' },
      preConfirm: function () {
        var popup = window.Swal.getPopup();
        var chosen = descriptors.map(function (file) {
          var types = documentTypes.filter(function (type) {
            return Boolean(popup.querySelector('[data-draft-file="' + file.index +
              '"][data-draft-type="' + type + '"]:checked'));
          });
          return Object.assign({}, file, { types: types });
        });
        var missing = chosen.find(function (file) { return !file.types.length; });
        if (missing) {
          window.Swal.showValidationMessage('Pilih minimal satu kategori untuk ' + missing.name + '.');
          return false;
        }
        return chosen;
      }
    });
    if (!confirmation.isConfirmed) return;
    var selectedDescriptors = confirmation.value;
    var batchId = crypto.randomUUID();
    savingDraft = true;
    try {
      window.Swal.fire({ title: 'Menyimpan draft', text: 'Menyiapkan draft dan mengunggah dokumen sumber…',
        allowEscapeKey: false, allowOutsideClick: false, showConfirmButton: false,
        didOpen: function () { window.Swal.showLoading(); } });
      requireDraftResponse(await draftRpc('createSpkImportDraft', documentToken(),
        { batchId: batchId, items: items, files: selectedDescriptors }), 'batch');
      await uploadPendingDraftFiles({ batchId: batchId, files: files, descriptors: selectedDescriptors });
      await refreshDraftBatches();
      await window.Swal.fire({ icon: 'success', title: 'Semua item menjadi draft',
        text: items.length + ' draft disimpan. Buka Draft Saya untuk meninjau setiap item dan membuat SPK.',
        confirmButtonText: 'Lihat draft', customClass: { popup: 'spk-import-notice-popup' } });
      savingDraft = false;
      await openDraftList();
    } catch (error) {
      console.error('Draft SPK gagal disimpan', error);
      await window.Swal.fire({ icon: 'error', title: 'Draft belum lengkap',
        text: error.message + ' Draft yang berhasil dibuat tetap tersimpan. Buka Draft Saya untuk melengkapi file yang belum terunggah.',
        customClass: { popup: 'spk-import-notice-popup' } });
      await refreshDraftBatches().catch(function (refreshError) {
        console.error('Daftar draft tidak dapat dimuat setelah kegagalan penyimpanan', refreshError);
      });
    } finally {
      savingDraft = false;
    }
  }

  async function uploadPendingDraftFiles(pending) {
    for (var index = 0; index < pending.descriptors.length; index++) {
      var descriptor = pending.descriptors[index];
      var file = pending.files[descriptor.index];
      if (!file || file.name !== descriptor.name) throw new Error('File ' + descriptor.name + ' perlu dipilih ulang.');
      if (window.Swal && window.Swal.getPopup()) {
        window.Swal.update({ text: 'Mengunggah dokumen ' + (index + 1) + '/' + pending.descriptors.length + ': ' + file.name });
      }
      requireDraftResponse(await draftRpc('saveSpkImportDraftFile', documentToken(), pending.batchId, {
        index: descriptor.index, name: descriptor.name, types: descriptor.types,
        uploadId: pending.batchId + '-' + descriptor.index,
        base64: await fileAsBase64(file)
      }), 'batch');
    }
  }

  async function openDraftList() {
    var batches = await refreshDraftBatches();
    var rows = batches.map(function (batch) {
      return '<section class="spk-import-draft-batch"><strong>' + escapeHtml(batch.items.length + ' item · ' + batch.batchId) +
        '</strong>' + batch.items.map(function (item) {
          return '<button type="button" class="spk-import-draft-item" data-draft-batch="' +
            escapeHtml(batch.batchId) + '" data-draft-code="' + escapeHtml(item.code) + '">' +
            escapeHtml(item.code) + ' · ' + escapeHtml(item.name) +
            ' <small>' + (item.status === 'completed' ? 'SPK ' + escapeHtml(item.spk || '') :
              item.spk ? 'Lanjutkan lampiran SPK ' + escapeHtml(item.spk) :
              batch.files.some(function (file) { return !file.saved; }) ? 'Dokumen belum lengkap' : 'Siap ditinjau') +
            '</small></button>';
        }).join('') + '</section>';
    }).join('');
    await window.Swal.fire({
      title: 'Draft SPK Saya',
      html: '<div class="spk-import-draft-list">' + (rows || '<p>Belum ada draft tersimpan.</p>') + '</div>',
      width: 750,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: 'spk-import-review-popup' },
      didOpen: function (popup) {
        popup.querySelectorAll('[data-draft-batch]').forEach(function (button) {
          button.addEventListener('click', function () {
            var batchId = button.dataset.draftBatch;
            var code = button.dataset.draftCode;
            window.Swal.close();
            openDraftItem(batchId, code).catch(function (error) {
              console.error('Draft SPK gagal dibuka', error);
              window.Swal.fire({ icon: 'error', title: 'Draft belum dapat dibuka', text: error.message });
            });
          });
        });
      }
    });
  }

  async function chooseMissingDraftFiles(batch) {
    var missing = batch.files.filter(function (file) { return !file.saved; });
    var chosen = await window.Swal.fire({
      title: 'Lengkapi dokumen draft',
      text: 'Pilih ulang ' + missing.length + ' file yang belum terunggah. Nama harus sesuai dengan file sumber.',
      input: 'file',
      inputAttributes: { accept: '.pdf,.png,.jpg,.jpeg', multiple: true },
      showCancelButton: true,
      confirmButtonText: 'Unggah dokumen',
      cancelButtonText: 'Batal',
      customClass: { popup: 'spk-import-notice-popup' },
      inputValidator: function (value) {
        if (!value) return 'Pilih file yang belum terunggah.';
        var files = value instanceof File ? [value] : Array.from(value);
        if (!files.length) return 'Pilih file yang belum terunggah.';
        return missing.every(function (item) { return files.some(function (file) { return file.name === item.name; }); })
          ? null : 'Nama file tidak sesuai dengan dokumen draft yang belum lengkap.';
      }
    });
    if (!chosen.isConfirmed) return;
    var files = chosen.value instanceof File ? [chosen.value] : Array.from(chosen.value);
    if (files.some(function (file) { return !file.size || file.size > SAVE_MAX_BYTES; })) {
      throw new Error('Setiap file harus berisi data dan berukuran maksimal 10 MB.');
    }
    var restored = { batchId: batch.batchId, descriptors: missing,
      files: [] };
    missing.forEach(function (item) {
      restored.files[item.index] = files.find(function (file) { return file.name === item.name; });
    });
    for (var descriptor of missing) {
      var restoredFile = restored.files[descriptor.index];
      if (restoredFile.size !== descriptor.size) throw new Error(descriptor.name + ' memiliki ukuran yang berbeda dari dokumen draft.');
      var digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await restoredFile.arrayBuffer()));
      if (btoa(String.fromCharCode.apply(null, digest)) !== descriptor.hash) {
        throw new Error(descriptor.name + ' bukan file yang sama dengan dokumen sumber draft.');
      }
    }
    window.Swal.fire({ title: 'Melengkapi draft', text: 'Mengunggah dokumen…',
      allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false,
      didOpen: function () { window.Swal.showLoading(); } });
    await uploadPendingDraftFiles(restored);
    await refreshDraftBatches();
    await window.Swal.fire({ icon: 'success', title: 'Dokumen draft lengkap', text: 'Draft siap ditinjau dan diterapkan.' });
  }

  async function openDraftItem(batchId, code) {
    var batch = requireDraftResponse(await draftRpc('getSpkImportDraft', documentToken(), batchId), 'batch').batch;
    var item = batch.items.find(function (entry) { return entry.code === code; });
    if (!item) throw new Error('Item draft tidak ditemukan.');
    if (item.status === 'completed') {
      await window.Swal.fire({ icon: 'info', title: 'Item sudah menjadi SPK',
        text: item.code + ' tersimpan sebagai SPK ' + item.spk + '. Buka Kelola SPK untuk melihat dokumen.' });
      return;
    }
    if (item.spk) {
      window.Swal.fire({ title: 'Melengkapi dokumen SPK', text: 'Mencoba melanjutkan pemasangan dokumen…',
        showConfirmButton: false, allowOutsideClick: false,
        didOpen: function () { window.Swal.showLoading(); } });
      requireDraftResponse(await draftRpc('completeSpkImportDraftItem', documentToken(),
        batchId, code, item.spk), 'batch');
      await refreshDraftBatches();
      await window.Swal.fire({ icon: 'success', title: 'Dokumen selesai dipasangkan',
        text: item.code + ' tersedia di SPK ' + item.spk + '.' });
      return;
    }
    if (batch.files.some(function (file) { return !file.saved; })) {
      await chooseMissingDraftFiles(batch);
      return;
    }
    var result = { pages: batch.files.map(function (file) {
      return { source: file.name, type: file.types.join('/'), hasText: true };
    }), fields: item.fields, issues: item.issues || [], selectedItem: item.code, fromSavedDraft: true };
    await window.Swal.fire({
      title: 'Tinjau draft · ' + item.code,
      html: buildReviewHtml(result),
      width: 860,
      showCancelButton: true,
      confirmButtonText: 'Terapkan item ke form',
      cancelButtonText: 'Batal',
      showLoaderOnConfirm: true,
      allowOutsideClick: function () { return !window.Swal.isLoading(); },
      focusConfirm: false,
      customClass: { popup: 'spk-import-review-popup' },
      didOpen: function (popup) {
        updateSelectionCount(popup);
        popup.addEventListener('change', function (event) {
          if (event.target.matches('[data-import-selected]')) updateSelectionCount(popup);
        });
      },
      preConfirm: async function () {
        var popup = window.Swal.getPopup();
        try {
          var corrected = item.fields.map(function (field) {
            var input = popup.querySelector('[data-import-value="' + field.id + '"]');
            if (!input) throw new Error('Kolom ' + field.label + ' tidak tersedia untuk ditinjau.');
            return Object.assign({}, field, { value: input.value.trim() });
          });
          requireDraftResponse(await draftRpc('updateSpkImportDraftItem', documentToken(),
            batchId, code, corrected), 'batch');
          activeDraft = { batchId: batchId, code: code };
          activeDraftFields = corrected;
          stagedDocuments = batch.files.flatMap(function (file) {
            return file.types.map(function (type) {
              return { type: type, file: { name: file.name }, fileIndex: file.index,
                draftBatchId: batchId, saved: false, error: '' };
            });
          });
          updateDocumentButtons();
          return applySelection(popup, result);
        } catch (error) {
          window.Swal.showValidationMessage(error.message);
          return false;
        }
      }
    });
  }

  async function saveCurrentDraft() {
    if (!activeDraft || !activeDraftFields) {
      await window.Swal.fire({ icon: 'info', title: 'Belum ada item draft aktif',
        text: 'Baca dokumen multi-item untuk membuat draft, lalu buka satu item dari Draft Saya sebelum menyimpan perubahan form.' });
      return;
    }
    if (savingDraft || savingDocuments) {
      await window.Swal.fire({ icon: 'info', title: 'Penyimpanan sedang berjalan',
        text: 'Tunggu proses sebelumnya selesai, lalu coba kembali.' });
      return;
    }
    savingDraft = true;
    try {
      var fields = activeDraftFields.map(function (field) {
        var target = document.getElementById(field.id);
        return Object.assign({}, field, { value: target ? String(target.value || '').trim() : field.value });
      });
      requireDraftResponse(await draftRpc('updateSpkImportDraftItem', documentToken(),
        activeDraft.batchId, activeDraft.code, fields), 'batch');
      activeDraftFields = fields;
      await window.Swal.fire({ icon: 'success', title: 'Perubahan draft tersimpan',
        text: activeDraft.code + ' dapat dilanjutkan dari Draft Saya setelah login ulang.' });
    } catch (error) {
      console.error('Perubahan draft gagal disimpan', error);
      await window.Swal.fire({ icon: 'error', title: 'Draft belum tersimpan', text: error.message });
    } finally {
      savingDraft = false;
    }
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
    if (activeDraft) {
      try {
        updateSaveStatus('Memasangkan dokumen draft ' + activeDraft.code + ' ke SPK ' + savedSpk + '…');
        requireDraftResponse(await draftRpc('completeSpkImportDraftItem', documentToken(),
          activeDraft.batchId, activeDraft.code, savedSpk), 'batch');
        stagedDocuments.forEach(function (item) { item.saved = true; item.error = ''; });
        updateSaveStatus('Dokumen draft ' + activeDraft.code + ' berhasil dipasangkan ke SPK ' + savedSpk + '.', 'success');
        try { await refreshDraftBatches(); }
        catch (error) { console.error('Daftar draft gagal diperbarui setelah SPK tersimpan', error); }
      } catch (error) {
        console.error('Dokumen draft gagal dipasangkan ke SPK', error);
        stagedDocuments.forEach(function (item) { item.error = error.message; });
        updateSaveStatus('SPK ' + savedSpk + ' sudah dibuat, tetapi dokumennya belum lengkap: ' +
          error.message + '. Klik Coba lagi di sini atau buka Draft Saya untuk melanjutkan.', 'error');
      } finally {
        savingDocuments = false;
        actions.forEach(function (action) { action.style.pointerEvents = ''; action.removeAttribute('aria-disabled'); });
        updateDocumentButtons();
        updateRetryButton();
      }
      return;
    }
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
    async function select(item, tab) {
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
        if (item.draftBatchId) {
          content.textContent = 'Memuat preview privat…';
          try {
            var response = requireDraftResponse(await draftRpc('getSpkImportDraftFile',
              documentToken(), item.draftBatchId, item.fileIndex), 'base64');
            if (!documentsDialog.open || tab.getAttribute('aria-pressed') !== 'true') return;
            var binary = atob(response.base64);
            var bytes = new Uint8Array(binary.length);
            for (var byteIndex = 0; byteIndex < binary.length; byteIndex++) bytes[byteIndex] = binary.charCodeAt(byteIndex);
            previewUrl = URL.createObjectURL(new Blob([bytes], { type: response.mimeType }));
            content.replaceChildren();
          } catch (error) {
            console.error('Preview draft tidak dapat dimuat', error);
            content.textContent = 'Preview tidak tersedia: ' + error.message;
            return;
          }
        } else {
          previewUrl = URL.createObjectURL(item.file);
        }
        var preview = document.createElement(isPdf ? 'iframe' : 'img');
        if (isPdf) preview.title = 'Preview ' + item.file.name;
        else preview.alt = item.file.name;
        preview.src = previewUrl;
        content.appendChild(preview);
      }
      documentsDialog.querySelector('.spk-import-document-state').textContent =
        item.file.name + ' · ' + (item.draftBatchId ? 'Draft privat tersimpan' : item.saved ? 'Tersimpan di Google Drive' :
          item.error ? 'Belum tersimpan: ' + item.error : 'Preview lokal · belum disimpan');
      var remove = documentsDialog.querySelector('.spk-import-document-remove');
      remove.hidden = item.saved || Boolean(item.draftBatchId);
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
      var draft = extractDraft(allPages);
      draft.sourcePages = allPages;
      return draft;
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
        if (result.items.length > 1) {
          await saveMultiDraft(result, files);
          return;
        }
        var sourcePages = result.sourcePages;
        var review;
        while (true) {
          if (result.items.length > 1) {
            var choices = {};
            result.items.forEach(function (item) {
              choices[item.code] = item.code + ' · ' + item.name +
                (item.quantity ? ' · ' + item.quantity + ' ' + item.unit : '');
            });
            var chosen = await window.Swal.fire({
              title: 'Pilih satu item untuk SPK ini',
              text: result.items.length + ' item ditemukan. Satu SPK hanya untuk satu item; dokumen yang sama dapat dibaca lagi untuk SPK berikutnya.',
              input: 'select',
              inputOptions: choices,
              inputPlaceholder: 'Pilih kode item',
              inputValidator: function (value) { return value ? null : 'Pilih satu item terlebih dahulu.'; },
              showCancelButton: true,
              confirmButtonText: 'Tinjau item',
              cancelButtonText: 'Batal',
              customClass: { popup: 'spk-import-notice-popup' }
            });
            if (!chosen.isConfirmed) return;
            result = extractDraft(sourcePages, chosen.value);
            result.sourcePages = sourcePages;
          }
          review = await window.Swal.fire({
            title: 'Tinjau draft SPK',
            html: buildReviewHtml(result, files),
            width: 860,
            showCancelButton: true,
            showDenyButton: result.items.length > 1,
            denyButtonText: 'Pilih item lain',
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
          if (!review.isDenied) break;
          result = extractDraft(sourcePages);
          result.sourcePages = sourcePages;
        }
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
      '<strong>Buat draft SPK dari dokumen</strong><p>Baca PO, PHJ, dan TDS dari PDF atau gambar. Setiap item dapat menjadi draft SPK terpisah.</p>' +
      '<span class="spk-import-launcher-meta"><i class="fa-solid fa-lock" aria-hidden="true"></i> OCR lokal · Draft multi-item disimpan privat pada akun Anda</span>' +
      '<div class="spk-import-document-buttons" role="group" aria-label="Lihat dokumen SPK"></div></div>' +
      '<button type="button" class="spk-import-drafts-open">Draft Saya</button>' +
      '<button type="button" class="spk-import-open"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Baca Dokumen <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>';
    fields.parentNode.insertBefore(launcher, fields);
    updateDocumentButtons();
    updateDraftButton();
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
      if (event.target.closest('.spk-import-drafts-open')) {
        openDraftList().catch(function (error) {
          console.error('Daftar draft SPK gagal dimuat', error);
          if (window.Swal) window.Swal.fire({ icon: 'error', title: 'Draft belum dapat dimuat', text: error.message });
        });
        return;
      }
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
      activeDraft = null;
      activeDraftFields = null;
      if (documentsDialog && documentsDialog.open) closeDocumentDialog();
      updateDocumentButtons();
    });
    browserWindow.addEventListener('beforeunload', function (event) {
      if (savingDocuments || savingDraft) { event.preventDefault(); event.returnValue = ''; }
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
    draftFileDescriptors: draftFileDescriptors,
    extractDraft: extractDraft,
    groupTextLines: groupTextLines,
    install: install,
    importFiles: importFiles,
    makeDraftItems: makeDraftItems,
    openDraftList: openDraftList,
    saveCurrentDraft: saveCurrentDraft,
    readPdf: readPdf
  };
});
