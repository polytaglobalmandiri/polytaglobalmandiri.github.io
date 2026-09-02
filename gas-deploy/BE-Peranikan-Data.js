const ROOT_FOLDER_ID = '1VTEPgxnBbPX0AfUyKUprtqrNtXQfC5gA';

// doGet function has been moved to BE-Dashboard.js to handle routing centrally

function getFolderData(targetId) {
  try {
    const idToFetch = targetId || ROOT_FOLDER_ID;
    const folder = DriveApp.getFolderById(idToFetch);
    const subFolders = [];
    const foldersIterator = folder.getFolders();

    while (foldersIterator.hasNext()) {
      const sub = foldersIterator.next();
      subFolders.push({
        id: sub.getId(),
        name: sub.getName()
      });
    }

    subFolders.sort((a, b) => a.name.localeCompare(b.name));
    const listedSourceFiles = listExtractionSourceFiles_(folder);
    let existingSpks = new Set();
    let databaseStatus = {
      available: true,
      message: ''
    };

    if (listedSourceFiles.length > 0) {
      try {
        existingSpks = getExistingExtractionSpkSet_();
      } catch (databaseError) {
        databaseStatus = {
          available: false,
          message: databaseError.message
        };
      }
    }

    const sourceFiles = listedSourceFiles.map(function(file) {
      const hasSpkHint = file.spkHint !== '';

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        spk: file.spkHint,
        inDatabase: databaseStatus.available && hasSpkHint
          ? existingSpks.has(file.spkHint)
          : null
      };
    });

    return {
      status: 'success',
      id: folder.getId(),
      name: folder.getName(),
      subFolders: subFolders,
      sourceFiles: sourceFiles,
      databaseStatus: databaseStatus
    };
  } catch (e) {
    return {
      status: 'error',
      message: e.message
    };
  }
}

// ==========================================
// HELPER UMUM
// ==========================================
function normalizeKey(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getExistingExtractionSpkSet_() {
  const sheet = findDatabaseSheet_(SpreadsheetApp.openById(DB_SPREADSHEET_ID));

  if (!sheet) {
    throw new Error(databaseSheetNotFoundMessage_());
  }

  const lastRow = sheet.getLastRow();
  const existingSpks = new Set();

  if (lastRow < DB_DATA_START_ROW) return existingSpks;

  const values = sheet
    .getRange(
      DB_DATA_START_ROW,
      DB_COL.SPK,
      lastRow - DB_DATA_START_ROW + 1,
      1
    )
    .getDisplayValues();

  values.forEach(function(row) {
    const spk = normalizeSourceSpk_(row[0]) || normalizeSpk_(row[0]);
    if (spk !== '') existingSpks.add(spk);
  });

  return existingSpks;
}

function isSpreadsheetErrorValue(value) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  return /^#(?:REF!|N\/A|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!)$/i.test(text);
}

function isChecked(val) {
  if (val === true) return true;
  if (typeof val === 'string' && val.trim() === '√') return true;
  return false;
}

function angkaAtauNol(val) {
  return (val === null || val === undefined || val === '') ? 0 : val;
}

let extractionSheetReadCache_ = {};

function resetExtractionSheetReadCache_() {
  extractionSheetReadCache_ = {};
}

function getExtractionSheetData_(sheet) {
  const cacheKey = String(sheet.getSheetId());
  if (extractionSheetReadCache_[cacheKey]) {
    return extractionSheetReadCache_[cacheKey];
  }

  const range = sheet.getDataRange();
  const snapshot = {
    values: range.getValues(),
    displayValues: range.getDisplayValues()
  };

  extractionSheetReadCache_[cacheKey] = snapshot;
  return snapshot;
}

function parseIndoNumber(str) {
  const cleaned = String(str)
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function getMainSheet(allSheets) {
  for (const sheet of allSheets) {
    if (normalizeKey(sheet.getName()) === 'POPRODUKSI') {
      return sheet;
    }
  }
  return allSheets[0];
}

// ==========================================
// HELPER LABEL DINAMIS
// ==========================================
function findLabelValue(sheet, labelText) {
  const sheetData = getExtractionSheetData_(sheet);
  const data = sheetData.values;
  const displayData = sheetData.displayValues;
  const wanted = normalizeKey(labelText);

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const cellKey = normalizeKey(data[r][c]);

      if (cellKey !== wanted && cellKey.indexOf(wanted) !== 0) continue;

      for (let cc = c + 1; cc < Math.min(c + 13, data[r].length); cc++) {
        const raw = data[r][cc];
        const display = displayData[r][cc];
        const rawText = String(raw === null || raw === undefined ? '' : raw).trim();
        const displayText = String(display === null || display === undefined ? '' : display).trim();

        if (
          (rawText === '' && displayText === '') ||
          rawText === ':' ||
          rawText === '=' ||
          isSpreadsheetErrorValue(raw) ||
          isSpreadsheetErrorValue(display)
        ) {
          continue;
        }

        return rawText !== '' ? raw : display;
      }
    }
  }

  return null;
}

function getCuttingFieldValue(allSheets, labelText, fallbackIndex) {
  let candidateSheets = allSheets.filter(sheet => {
    const name = normalizeKey(sheet.getName());
    return name === 'CUTTING' || name.indexOf('CUTTING') === 0;
  });

  // Salinan sheet CUTTING lama sering disembunyikan; prioritaskan yang
  // terlihat agar nilai Mesin/Model Kantong usang tidak ikut terbaca.
  const visibleCandidates = candidateSheets.filter(sheet => !sheet.isSheetHidden());
  if (visibleCandidates.length > 0) candidateSheets = visibleCandidates;

  if (candidateSheets.length === 0 && allSheets.length > fallbackIndex) {
    candidateSheets = [allSheets[fallbackIndex]];
  }

  for (const sheet of candidateSheets) {
    const value = findLabelValue(sheet, labelText);

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '' &&
      !isSpreadsheetErrorValue(value)
    ) {
      return String(value).trim();
    }
  }

  return null;
}

// ==========================================
// HELPER BS PERCENT
// ==========================================
function getBSPercentValues(sheetUtama) {
  const data = getExtractionSheetData_(sheetUtama).values;
  const anchorCandidates = [];

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (normalizeKey(data[r][c]) === 'TOTALBS') {
        anchorCandidates.push(r);
        break;
      }
    }
  }

  if (anchorCandidates.length === 0) anchorCandidates.push(-1);

  const labelSets = [
    ['BLOW'],
    ['PRINT'],
    ['SLITT'],
    ['FOLD'],
    ['GUSS'],
    ['SHEETBLOW', 'SHEET'],
    ['POND', 'PON'],
    ['TSHIRT'],
    ['BTS'],
    ['SS'],
    ['HANDLEMANUAL', 'HANDLE'],
    ['SHEETSLIT']
  ];

  function cariDalamWindow(labelVariants, startRow, endRow, requireNumeric) {
    for (let r = startRow; r < endRow; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const cellKey = normalizeKey(data[r][c]);

        if (labelVariants.indexOf(cellKey) === -1) continue;

        for (let cc = c + 1; cc < Math.min(c + 7, data[r].length); cc++) {
          const raw = data[r][cc];
          const text = String(raw === null || raw === undefined ? '' : raw).trim();

          if (
            text === '' ||
            text === ':' ||
            text === '=' ||
            isSpreadsheetErrorValue(raw)
          ) {
            continue;
          }

          if (requireNumeric && typeof raw !== 'number') break;
          return raw;
        }
      }
    }

    return null;
  }

  let bestValues = new Array(12).fill(0);
  let bestCuttingGeneric = 0;
  let bestTotalBS = 0;
  let bestScore = -1;

  for (const anchorRow of anchorCandidates) {
    const startRow = anchorRow > -1 ? Math.max(0, anchorRow - 20) : 0;
    const endRow = anchorRow > -1 ? Math.min(data.length, anchorRow + 10) : data.length;

    const candidateValues = labelSets.map(variants =>
      cariDalamWindow(variants, startRow, endRow, true)
    );

    const score = candidateValues.filter(value => value !== null).length;

    if (score > bestScore) {
      bestScore = score;
      bestValues = candidateValues.map(angkaAtauNol);
      bestCuttingGeneric = angkaAtauNol(
        cariDalamWindow(['CUTTING', 'CUTT'], startRow, endRow, true)
      );
      bestTotalBS = angkaAtauNol(
        cariDalamWindow(['TOTALBS'], startRow, endRow, true)
      );
    }
  }

  return {
    values: bestValues,
    cuttingGeneric: bestCuttingGeneric,
    totalBS: bestTotalBS
  };
}

// ==========================================
// HELPER WARNA & PEMAKAIAN TINTA (PRINTING)
// ==========================================
function findSheetsByNamePrefix_(allSheets, keyword) {
  const matched = allSheets.filter(function(sheet) {
    const name = normalizeKey(sheet.getName());
    return name === keyword || name.indexOf(keyword) === 0;
  });

  // File sumber kadang menyimpan salinan sheet lama dalam keadaan hidden;
  // prioritaskan sheet yang terlihat agar data usang tidak ikut terbaca.
  const visible = matched.filter(function(sheet) {
    return !sheet.isSheetHidden();
  });

  return visible.length ? visible : matched;
}

function extractPrintingInkUsage_(allSheets) {
  const sheets = findSheetsByNamePrefix_(allSheets, 'PRINTING');

  for (const sheet of sheets) {
    const rows = readInkUsageFromSheet_(sheet);
    if (rows.length) return rows;
  }

  return [];
}

// Tabel tinta di sheet Printing memakai baris berlabel "Tinta 1", "Tinta 2",
// dst; nilai warna dan KG diambil dari sel-sel di kanannya sehingga tahan
// terhadap pergeseran posisi tabel.
function readInkUsageFromSheet_(sheet) {
  const data = getExtractionSheetData_(sheet).values;
  const found = [];

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const match = /^TINTA(\d{1,2})$/.exec(normalizeKey(data[r][c]));
      if (!match) continue;

      let warna = '';
      let pemakaian = '';

      for (let cc = c + 1; cc < Math.min(c + 8, data[r].length); cc++) {
        const raw = data[r][cc];
        const text = String(raw === null || raw === undefined ? '' : raw).trim();
        if (text === '' || text === ':' || isSpreadsheetErrorValue(raw)) continue;

        if (typeof raw === 'number') {
          if (warna !== '') {
            pemakaian = raw;
            break;
          }
          continue;
        }

        if (warna === '') {
          // Tanda "-" berarti slot tinta sengaja dikosongkan.
          if (text === '-') break;
          warna = text;
          continue;
        }
        break;
      }

      if (warna !== '') {
        found.push({ slot: Number(match[1]), nama: warna, pemakaian: pemakaian });
      }
    }
  }

  found.sort(function(a, b) { return a.slot - b.slot; });
  return found.slice(0, DB_MAX_WARNA).map(function(item) {
    return { nama: item.nama, pemakaian: item.pemakaian };
  });
}

// ==========================================
// HELPER KETERANGAN ARTIKEL (PO PRODUKSI)
// ==========================================
// Keterangan artikel tidak memiliki label. Admin mengetiknya bebas di bawah
// isi "JENIS BAHAN" pada blok kiri PO Produksi (contoh: material di G22,
// keterangan di G24). Teks diambil dari 1-4 baris di bawah baris label,
// terbatas pada kolom blok kiri, dan berhenti saat bertemu baris
// "PO Sebelumnya" atau blok komposisi.
function extractKeteranganArtikel_(sheetUtama) {
  const snapshot = getExtractionSheetData_(sheetUtama);
  const data = snapshot.values;
  const display = snapshot.displayValues;

  let anchor = null;
  for (let r = 0; r < data.length && !anchor; r++) {
    // Label "JENIS BAHAN" milik blok kiri selalu berada di kolom awal (A:H);
    // label serupa milik tabel komposisi dan blok rekap berada lebih ke kanan.
    for (let c = 0; c < Math.min(data[r].length, 8); c++) {
      if (normalizeKey(data[r][c]) === 'JENISBAHAN') {
        anchor = { row: r, col: c };
        break;
      }
    }
  }

  if (!anchor) return '';

  const stopKeys = { POSEBELUMNYA: true, TOTAL: true, KOMPOSISIBAHAN: true };
  const texts = [];

  for (let r = anchor.row + 1; r < Math.min(data.length, anchor.row + 5); r++) {
    let stopScan = false;
    let rowText = '';

    for (let c = anchor.col; c < Math.min(display[r].length, anchor.col + 9); c++) {
      const text = String(
        display[r][c] === null || display[r][c] === undefined ? '' : display[r][c]
      ).trim();
      if (text === '' || text === ':' || text === '=' || text === '-') continue;
      if (isSpreadsheetErrorValue(text)) continue;
      if (stopKeys[normalizeKey(text)]) {
        stopScan = true;
        break;
      }
      if (/^[\d.,%\/\s]+$/.test(text)) continue;
      rowText += (rowText === '' ? '' : ' ') + text;
    }

    if (stopScan) break;
    if (rowText !== '') texts.push(rowText);
  }

  return texts.join(' ').slice(0, 300);
}

// ==========================================
// HELPER KODE ITEM (KET. PLASTIK)
// ==========================================
// Admin menulis kode item pada baris berlabel "Ket. Plastik". Label yang sama
// muncul di PO PRODUKSI maupun di tiap sheet divisi dengan isi yang sama,
// sehingga sheet divisi dipakai sebagai cadangan bila blok utama kosong.
const KODE_ITEM_SHEET_ORDER = [
  'BLOWING', 'PRINTING', 'SLITTING', 'FOLDING', 'GUSSET', 'CUTTING', 'MIXER'
];

function cleanKodeItemValue_(value) {
  if (value === null || value === undefined) return '';
  if (isSpreadsheetErrorValue(value)) return '';

  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text === '') return '';

  // Placeholder yang dipakai admin saat kode item belum ada.
  if (/^[-–—_.:\/]+$/.test(text)) return '';
  if (normalizeKey(text) === '') return '';
  if (['NA', 'NIHIL', 'TIDAKADA', 'BELUMADA'].indexOf(normalizeKey(text)) > -1) {
    return '';
  }

  return text.slice(0, 100);
}

function extractKodeItem_(allSheets, sheetUtama) {
  const candidates = [];
  if (sheetUtama) candidates.push(sheetUtama);

  // Salinan sheet lama sering disembunyikan; dahulukan sheet yang terlihat
  // agar kode item usang tidak ikut terbaca.
  KODE_ITEM_SHEET_ORDER.forEach(function(keyword) {
    findSheetsByNamePrefix_(allSheets, keyword).forEach(function(sheet) {
      if (candidates.indexOf(sheet) === -1) candidates.push(sheet);
    });
  });

  for (let index = 0; index < candidates.length; index++) {
    const kodeItem = cleanKodeItemValue_(
      findLabelValue(candidates[index], 'KET PLASTIK')
    );
    if (kodeItem !== '') return kodeItem;
  }

  return '';
}

// ==========================================
// HELPER KETERANGAN WARNA
// ==========================================
// Admin menulis jumlah warna pada baris berlabel "WARNA" di PO PRODUKSI
// (kolom label dan kolom nilai dipisah sel ':'), dengan isi yang beragam:
// "1+0", "2 + 2", "1 + 0 (INLINE ORANGE)", "1 WARNA", "2 warna", "NONE".
//
// Pencocokan label harus persis "WARNA", bukan sekadar mengandung atau
// diawali, karena kata itu juga muncul di dalam nama produk pada blok
// artikel — misalnya "HDPE WARNA SIZE 100X90X0.02 GREEN".
//
// Pencarian berbasis label, bukan berbasis pola angka+angka, karena pola
// tersebut juga dipakai kolom ukuran: "39 (34 + 3LDH + 3.5GB) X 27 X 0.05",
// "31.5 + 5LIDAH X 0.045", dan sejenisnya.
function parseKeteranganWarnaValue_(value) {
  if (value === null || value === undefined) return '';
  if (isSpreadsheetErrorValue(value)) return '';

  const text = String(value).replace(/\s+/g, ' ').trim().toUpperCase();
  if (text === '') return '';

  // Bentuk baku: depan + belakang. Catatan ikutan seperti "(INLINE ORANGE)"
  // sengaja diabaikan karena kolom Database hanya menampung angkanya.
  const pair = text.match(/(\d{1,2})\s*\+\s*(\d{1,2})/);
  if (pair) return pair[1] + '+' + pair[2];

  // Bentuk "1 WARNA" hanya menyebut jumlah, tanpa keterangan sisi, jadi
  // disalin apa adanya tanpa mengarang angka sisi belakang.
  const counted = text.match(/(\d{1,2})\s*WARNA/);
  if (counted) return counted[1];

  const single = text.match(/^(\d{1,2})$/);
  if (single) return single[1];

  // "NONE", "-", dan sejenisnya berarti tidak ada cetakan.
  return '';
}

function extractKeteranganWarna_(sheetUtama) {
  if (!sheetUtama) return '';

  const snapshot = getExtractionSheetData_(sheetUtama);
  const data = snapshot.values;
  const display = snapshot.displayValues;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (normalizeKey(data[r][c]) !== 'WARNA') continue;

      for (let cc = c + 1; cc < Math.min(c + 13, data[r].length); cc++) {
        const raw = data[r][cc];
        const shown = display[r][cc];
        const rawText = String(raw === null || raw === undefined ? '' : raw).trim();
        const shownText = String(shown === null || shown === undefined ? '' : shown).trim();

        if (
          (rawText === '' && shownText === '') ||
          rawText === ':' ||
          rawText === '=' ||
          shownText === ':' ||
          shownText === '='
        ) {
          continue;
        }

        const parsed = parseKeteranganWarnaValue_(shownText !== '' ? shownText : rawText);
        // Label "WARNA" muncul dua kali: blok utama dan blok rekap di kanan.
        // Bila yang pertama tidak menghasilkan angka, pencarian diteruskan
        // ke kemunculan berikutnya alih-alih berhenti dengan hasil kosong.
        if (parsed !== '') return parsed;
        break;
      }
    }
  }

  return '';
}

// ==========================================
// HELPER KETERANGAN PRODUK PER DIVISI
// ==========================================
// Urutan indeks mengikuti kolom CS:DA di Database:
// mixer, blowing, printing, slitting, folding, gusset, bts, ss, tshirt.
const EXTRACTION_NOTE_SHEET_MAP = [
  { keys: ['MIXER'], noteIndex: 0 },
  { keys: ['BLOWING', 'BLOW'], noteIndex: 1 },
  { keys: ['PRINTING'], noteIndex: 2 },
  { keys: ['SLITTING', 'SLIT'], noteIndex: 3 },
  { keys: ['FOLDING', 'LIPAT'], noteIndex: 4 },
  { keys: ['GUSSET'], noteIndex: 5 }
];

function extractDivisionNotes_(allSheets, finishingType) {
  const notes = new Array(9).fill('');

  allSheets.forEach(function(sheet) {
    if (sheet.isSheetHidden()) return;

    const name = normalizeKey(sheet.getName());
    let noteIndex = -1;

    for (const entry of EXTRACTION_NOTE_SHEET_MAP) {
      const matched = entry.keys.some(function(key) {
        return name === key || name.indexOf(key) === 0;
      });
      if (matched) {
        noteIndex = entry.noteIndex;
        break;
      }
    }

    if (noteIndex === -1 && name.indexOf('CUTTING') === 0) {
      if (finishingType === 'BOTTOM SEAL') noteIndex = 6;
      else if (finishingType === 'SIDE SEAL') noteIndex = 7;
      else if (finishingType === 'TSHIRT') noteIndex = 8;
    }

    if (noteIndex === -1 || notes[noteIndex] !== '') return;
    notes[noteIndex] = readProductNoteFromSheet_(sheet);
  });

  return notes;
}

// Setiap sheet divisi memiliki label "Keterangan Produk"; isinya berada pada
// baris-baris di bawah label (mulai kolom label ke kanan). Grid checklist
// proses yang berdampingan di kiri/bawah label harus diabaikan.
const EXTRACTION_NOTE_JUNK_KEYS = {
  MIXER: true, BLOWING: true, PRINTING: true, SLITTING: true,
  FOLDING: true, LIPAT: true, GUSSET: true, CUTTING: true
};

function readProductNoteFromSheet_(sheet) {
  const snapshot = getExtractionSheetData_(sheet);
  const data = snapshot.values;
  const display = snapshot.displayValues;

  let anchor = null;
  for (let r = 0; r < data.length && !anchor; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (normalizeKey(data[r][c]).indexOf('KETERANGANPRODUK') === 0) {
        anchor = { row: r, col: c };
        break;
      }
    }
  }

  if (!anchor) return '';

  const lines = [];
  for (let r = anchor.row + 1; r < Math.min(data.length, anchor.row + 7); r++) {
    let rowText = '';
    for (let c = anchor.col; c < Math.min(display[r].length, anchor.col + 7); c++) {
      const text = String(
        display[r][c] === null || display[r][c] === undefined ? '' : display[r][c]
      ).trim();
      if (text === '' || text === ':' || text === '=' || text === '-' || text === '√') continue;
      if (isSpreadsheetErrorValue(text)) continue;
      if (/^[\d.,%\/\s]+$/.test(text)) continue;
      if (EXTRACTION_NOTE_JUNK_KEYS[normalizeKey(text)]) continue;
      rowText += (rowText === '' ? '' : ' ') + text;
    }
    if (rowText !== '') lines.push(rowText);
  }

  return lines.join(' ').slice(0, 300);
}

// ==========================================
// HELPER URUTAN PROSES
// ==========================================
function findProcessChecklist(sheet) {
  const result = {
    MIXER: false,
    BLOWING: false,
    PRINTING: false,
    SLITTING: false,
    FOLDING: false,
    GUSSET: false,
    CUTTING: false
  };

  const labelMap = {
    MIXER: 'MIXER',
    BLOWING: 'BLOWING',
    BLOW: 'BLOWING',
    PRINTING: 'PRINTING',
    SLITTING: 'SLITTING',
    LIPAT: 'FOLDING',
    FOLDING: 'FOLDING',
    GUSSET: 'GUSSET',
    CUTTING: 'CUTTING'
  };

  const data = getExtractionSheetData_(sheet).values;
  let anchorRow = -1;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const text = String(data[r][c])
        .trim()
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')
        .trim();

      if (text.indexOf('URUTAN PROSES') === 0) {
        anchorRow = r;
        break;
      }
    }

    if (anchorRow > -1) break;
  }

  const startRow = anchorRow > -1 ? anchorRow : 0;
  const endRow = Math.min(data.length, startRow + 10);

  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const rawKey = normalizeKey(data[r][c]);
      const mappedKey = labelMap[rawKey];

      if (!mappedKey) continue;

      for (let cc = c - 1; cc >= Math.max(0, c - 3); cc--) {
        const leftValue = data[r][cc];

        if (isChecked(leftValue)) {
          result[mappedKey] = true;
          break;
        }

        if (
          leftValue === '-' ||
          leftValue === false ||
          String(leftValue).trim() === '-'
        ) {
          break;
        }
      }
    }
  }

  return result;
}

// ==========================================
// HELPER ORDER + UOM
// ==========================================
function findOrderQtyUOM(sheet) {
  const data = getExtractionSheetData_(sheet).values;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      if (normalizeKey(data[r][c]) !== 'ORDER') continue;

      for (let cc = c + 1; cc < Math.min(c + 7, data[r].length); cc++) {
        const cell = data[r][cc];
        const text = String(cell === null || cell === undefined ? '' : cell).trim();

        if (text === '' || text === ':') continue;

        if (typeof cell === 'number' && !isNaN(cell)) {
          let uom = '';

          for (let ucc = cc + 1; ucc < Math.min(cc + 7, data[r].length); ucc++) {
            const uCell = data[r][ucc];
            const uText = String(uCell === null || uCell === undefined ? '' : uCell).trim();

            if (uText !== '' && uText !== ':' && uText !== '=') {
              uom = uText.toUpperCase();
              break;
            }
          }

          return {
            qty: cell,
            uom: uom
          };
        }

        const match = text.match(/^([\d.,]+)\s*([A-Za-z]+)/);

        if (match) {
          const qty = parseIndoNumber(match[1]);
          const uom = match[2].toUpperCase();

          if (qty !== null) {
            return {
              qty: qty,
              uom: uom
            };
          }
        }

        break;
      }
    }
  }

  return {
    qty: 0,
    uom: ''
  };
}

// ==========================================
// HELPER TOLERANSI
// ==========================================
function getToleransi(sheetUtama) {
  const data = getExtractionSheetData_(sheetUtama).values;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const label = String(data[r][c])
        .trim()
        .toUpperCase()
        .replace(/:+\s*$/, '')
        .trim();

      if (label !== 'TOLERANSI') continue;

      for (let cc = c + 1; cc < Math.min(c + 7, data[r].length); cc++) {
        const raw = data[r][cc];
        const text = String(raw === null || raw === undefined ? '' : raw).trim();

        if (
          text !== '' &&
          text !== ':' &&
          text !== '=' &&
          !isSpreadsheetErrorValue(raw)
        ) {
          return raw;
        }
      }
    }
  }

  return '-';
}

// ==========================================
// HELPER FINISHING DAN HANDLE
// ==========================================
function detectFinishingType(text) {
  const normalized = String(text || '').toUpperCase();

  if (/\bBOTTOM[\s\-]*SEAL\b/.test(normalized)) return 'BOTTOM SEAL';
  if (/\bSIDE[\s\-]*SEAL\b/.test(normalized)) return 'SIDE SEAL';
  if (/\bT[\s\-]*SHIRT\b/.test(normalized)) return 'TSHIRT';
  if (/\bBTS\b/.test(normalized)) return 'BOTTOM SEAL';
  if (/\bSS\b/.test(normalized)) return 'SIDE SEAL';
  if (/\bTS\b/.test(normalized)) return 'TSHIRT';

  return null;
}

function detectHandleOrPon(text) {
  const normalized = String(text || '').toUpperCase();

  if (/\bPON[\s\-]*MANUAL\b/.test(normalized)) return 'PON';
  if (/SOFT[\s\-]*HANDLE/.test(normalized)) return 'HANDLE';
  if (/PUNCH[\s\-]*HANDLE/.test(normalized)) return 'HANDLE';
  if (/\bHANDLE\b/.test(normalized)) return 'HANDLE';
  if (/\bHDL\b/.test(normalized)) return 'HANDLE';
  if (/\bPM\b/.test(normalized)) return 'PON';
  if (/\bPON\b/.test(normalized)) return 'PON';

  return null;
}

function mapCuttingBS(bsValues, jenisFinal, modelKantong, cuttingGeneric) {
  const result = bsValues.slice();
  const isFilled = function(value) { return value !== 0 && value !== ''; };
  const mentionsTshirt = function() {
    // detectFinishingType sudah menormalkan spasi/strip campur-campur, jadi
    // "T - SHIRT BAG", "Tshirt", "T-shirt", "TS" semua terdeteksi sebagai TSHIRT.
    return detectFinishingType(modelKantong) === 'TSHIRT';
  };

  let cuttingBS = 0;
  let targetSlot = null;

  // 1) Kalau BS sesuai Finishing yang terdeteksi sudah ada isinya, pakai itu.
  if (jenisFinal === 'TSHIRT' && isFilled(result[7])) {
    cuttingBS = result[7];
    targetSlot = 'TSHIRT';
  } else if (jenisFinal === 'BOTTOM SEAL' && isFilled(result[8])) {
    cuttingBS = result[8];
    targetSlot = 'BOTTOM SEAL';
  } else if (jenisFinal === 'SIDE SEAL' && isFilled(result[9])) {
    cuttingBS = result[9];
    targetSlot = 'SIDE SEAL';
  } else if (jenisFinal === 'BOTTOM SEAL' && isFilled(result[7]) && mentionsTshirt()) {
    // Alur Bottom Seal tapi BS Bottom Seal kosong; Model Kantong menyebut
    // T-Shirt/TS, jadi pakai nilai BS T-Shirt sebagai gantinya (tetap di slot
    // Bottom Seal supaya cocok dengan Finishing yang tampil).
    cuttingBS = result[7];
    targetSlot = 'BOTTOM SEAL';
  } else if (isFilled(result[7])) {
    // 2) Fallback bertingkat saat Finishing tidak cocok langsung:
    //    cek BS T-Shirt dulu...
    cuttingBS = result[7];
    targetSlot = 'TSHIRT';
  } else if (isFilled(result[8])) {
    //    ...lalu BS Bottom Seal...
    cuttingBS = result[8];
    targetSlot = 'BOTTOM SEAL';
  } else if (isFilled(cuttingGeneric)) {
    // 3) Template lama hanya punya satu baris BS "Cutt" generik tanpa
    //    rincian jenis. Tempatkan pada slot sesuai Finishing yang terdeteksi
    //    (atau slot T-Shirt bila Model Kantong menyebut T-Shirt).
    cuttingBS = cuttingGeneric;
    if (jenisFinal === 'TSHIRT') targetSlot = 'TSHIRT';
    else if (jenisFinal === 'BOTTOM SEAL') targetSlot = 'BOTTOM SEAL';
    else if (jenisFinal === 'SIDE SEAL') targetSlot = 'SIDE SEAL';
    else if (mentionsTshirt()) targetSlot = 'TSHIRT';
    else targetSlot = null;
  } else if (mentionsTshirt()) {
    //    ...lalu deteksi kata T-Shirt/T-shirt/TS di Model Kantong. Kalau BS
    //    T-Shirt sumbernya memang kosong, nilai tetap 0 (bukan menebak angka).
    targetSlot = 'TSHIRT';
  }

  result[7] = 0;
  result[8] = 0;
  result[9] = 0;

  if (targetSlot === 'TSHIRT') result[7] = cuttingBS;
  if (targetSlot === 'BOTTOM SEAL') result[8] = cuttingBS;
  if (targetSlot === 'SIDE SEAL') result[9] = cuttingBS;

  return result;
}

// ==========================================
// HELPER TANGGAL KIRIM
// ==========================================
function createSafeDate(year, month, day) {
  let y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (y < 100) y += 2000;

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }

  const result = new Date(y, m - 1, d, 12, 0, 0);

  if (
    result.getFullYear() !== y ||
    result.getMonth() !== m - 1 ||
    result.getDate() !== d
  ) {
    return null;
  }

  return result;
}

function parseFlexibleDateText(text) {
  const value = String(text === null || text === undefined ? '' : text)
    .trim()
    .replace(/\s+/g, ' ');

  if (value === '' || value === '-' || isSpreadsheetErrorValue(value)) {
    return null;
  }

  let match = value.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if (match) return createSafeDate(match[1], match[2], match[3]);

  match = value.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (match) return createSafeDate(match[3], match[2], match[1]);

  const upper = value
    .toUpperCase()
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  match = upper.match(
    /\b(\d{1,2})\s+(JAN(?:UARI)?|FEB(?:RUARI)?|MAR(?:ET)?|APR(?:IL)?|MEI|JUN(?:I)?|JUL(?:I)?|AGU(?:STUS)?|SEP(?:TEMBER)?|OKT(?:OBER)?|NOV(?:EMBER)?|DES(?:EMBER)?)\s+(\d{2,4})\b/
  );

  if (!match) return null;

  const monthMap = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MEI: 5,
    JUN: 6,
    JUL: 7,
    AGU: 8,
    SEP: 9,
    OKT: 10,
    NOV: 11,
    DES: 12
  };

  const month = monthMap[match[2].substring(0, 3)];
  return month ? createSafeDate(match[3], month, match[1]) : null;
}

function looksLikeEstimatedDateText(text) {
  const value = String(text || '').trim().toUpperCase();

  if (value === '') return false;

  return /(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES|AKHIR|AWAL|TENGAH|MINGGU|HARI|SEGERA|TENTATIVE|MENUNGGU)/.test(value);
}

function getTanggalCandidate(raw, displayValue) {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return {
      value: raw,
      quality: 100
    };
  }

  if (isSpreadsheetErrorValue(raw) || isSpreadsheetErrorValue(displayValue)) {
    return null;
  }

  const displayText = String(displayValue === null || displayValue === undefined ? '' : displayValue).trim();
  const parsedDisplay = parseFlexibleDateText(displayText);

  if (parsedDisplay) {
    return {
      value: parsedDisplay,
      quality: 90
    };
  }

  const rawText = String(raw === null || raw === undefined ? '' : raw).trim();
  const parsedRaw = parseFlexibleDateText(rawText);

  if (parsedRaw) {
    return {
      value: parsedRaw,
      quality: 85
    };
  }

  if (rawText === '-') {
    return {
      value: '-',
      quality: 10
    };
  }

  if (typeof raw === 'number' || typeof raw === 'boolean') return null;

  if (looksLikeEstimatedDateText(rawText)) {
    return {
      value: rawText,
      quality: 30
    };
  }

  return null;
}

function findTanggalKirim(sheet) {
  const sheetData = getExtractionSheetData_(sheet);
  const data = sheetData.values;
  const displayData = sheetData.displayValues;

  const acceptedLabels = {
    TANGGALKIRIM: true,
    TGLKIRIM: true,
    ESTIMASIKIRIM: true,
    ESTKIRIM: true,
    ESTIMASIPENGIRIMAN: true
  };

  const candidates = [];

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const labelKey = normalizeKey(data[r][c]);
      if (!acceptedLabels[labelKey]) continue;

      for (let cc = c + 1; cc < Math.min(c + 13, data[r].length); cc++) {
        const raw = data[r][cc];
        const displayValue = displayData[r][cc];
        const rawText = String(raw === null || raw === undefined ? '' : raw).trim();
        const displayText = String(displayValue === null || displayValue === undefined ? '' : displayValue).trim();

        if (
          (rawText === '' && displayText === '') ||
          rawText === ':' ||
          rawText === '='
        ) {
          continue;
        }

        const candidate = getTanggalCandidate(raw, displayValue);
        if (!candidate) continue;

        let score = candidate.quality;
        if (r >= 10 && r <= 23) score += 15;
        if (c >= 8 && c <= 20) score += 5;
        score -= (cc - c);

        candidates.push({
          value: candidate.value,
          score: score,
          row: r,
          col: c
        });
      }
    }
  }

  if (candidates.length === 0) return '-';

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  return candidates[0].value;
}

// ==========================================
// HELPER KELUAR BAHAN + UOM
// ==========================================
function cleanUOM(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function isLikelyUOM(value) {
  const key = normalizeKey(value);

  const accepted = {
    KG: true,
    KGS: true,
    KILOGRAM: true,
    KILOGRAMS: true,
    PCS: true,
    PC: true,
    PIECE: true,
    PIECES: true,
    ROLL: true,
    ROLLS: true,
    ROL: true,
    MTR: true,
    METER: true,
    METRE: true,
    LEMBAR: true,
    LBR: true,
    PACK: true,
    PACKING: true,
    BALL: true,
    BAL: true,
    UNIT: true,
    TON: true,
    SET: true
  };

  return !!accepted[key];
}

function hasNearbySectionLabel(data, rowIndex, labelText, maxDistance) {
  const target = normalizeKey(labelText);
  const startRow = Math.max(0, rowIndex - maxDistance);

  for (let r = startRow; r <= rowIndex; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const key = normalizeKey(data[r][c]);
      if (key === target || key.indexOf(target) === 0) return true;
    }
  }

  return false;
}

function parseQtyUOMFromRow(rawRow, displayRow, startCol, endCol) {
  let qty = null;
  let qtyCol = -1;
  let uom = '';
  let combined = false;

  for (let c = startCol; c < endCol; c++) {
    const raw = rawRow[c];
    const displayValue = displayRow[c];

    if (isSpreadsheetErrorValue(raw) || isSpreadsheetErrorValue(displayValue)) {
      continue;
    }

    const text = String(
      displayValue !== null &&
      displayValue !== undefined &&
      String(displayValue).trim() !== ''
        ? displayValue
        : raw
    ).trim();

    if (text === '' || text === ':' || text === '=' || text === '-') continue;

    if (qty === null) {
      const combinedMatch = text.match(
        /^([+-]?\d[\d.,]*)\s*([A-Za-z][A-Za-z0-9./\-\s]*)$/
      );

      if (combinedMatch && isLikelyUOM(combinedMatch[2])) {
        const parsedQty = parseIndoNumber(combinedMatch[1]);

        if (parsedQty !== null) {
          qty = parsedQty;
          uom = cleanUOM(combinedMatch[2]);
          qtyCol = c;
          combined = true;
          break;
        }
      }
    }

    if (qty === null && typeof raw === 'number' && !isNaN(raw)) {
      qty = raw;
      qtyCol = c;
      continue;
    }

    if (qty === null && /^[+-]?\d[\d.,]*$/.test(text)) {
      const parsedQty = parseIndoNumber(text);

      if (parsedQty !== null) {
        qty = parsedQty;
        qtyCol = c;
        continue;
      }
    }

    if (qty !== null && c > qtyCol && isLikelyUOM(text)) {
      uom = cleanUOM(text);
      break;
    }
  }

  if (qty === null) return null;

  return {
    qty: qty,
    uom: uom,
    combined: combined
  };
}

function findKeluarBahanUOM(sheet) {
  const sheetData = getExtractionSheetData_(sheet);
  const data = sheetData.values;
  const displayData = sheetData.displayValues;

  const acceptedLabels = {
    KELUARBAHAN: true,
    JUMLAHKELUARBAHAN: true,
    QTYKELUARBAHAN: true,
    BAHANKELUAR: true
  };

  const candidates = [];

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const labelKey = normalizeKey(data[r][c]);
      if (!acceptedLabels[labelKey]) continue;

      const parsed = parseQtyUOMFromRow(
        data[r],
        displayData[r],
        c + 1,
        Math.min(c + 13, data[r].length)
      );

      if (!parsed) continue;

      let score = 0;
      if (parsed.uom !== '') score += 100;
      if (c <= 10) score += 30;
      if (hasNearbySectionLabel(data, r, 'BLOWING', 6)) score += 35;
      if (r >= 14 && r <= 31) score += 15;
      if (parsed.combined) score += 5;

      score -= (r / 10000);
      score -= (c / 1000);

      candidates.push({
        qty: parsed.qty,
        uom: parsed.uom,
        score: score,
        row: r,
        col: c
      });
    }
  }

  if (candidates.length === 0) {
    return {
      qty: 0,
      uom: ''
    };
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  return {
    qty: angkaAtauNol(candidates[0].qty),
    uom: candidates[0].uom
  };
}

// ==========================================
// HELPER KOMPOSISI BAHAN BAKU
// ==========================================
function isKomposisiMaterialHeader(key) {
  return [
    'JENISBAHAN',
    'JENISBAHANBAKU',
    'JENISMATERIAL',
    'MATERIAL',
    'BAHAN'
  ].indexOf(key) > -1;
}

function isKomposisiQtyHeader(key) {
  return (
    key === 'QTY' ||
    key === 'QTYKG' ||
    key === 'JUMLAHKG' ||
    key === 'BERATKG' ||
    key === 'KG' ||
    (key.indexOf('QTY') === 0 && key.indexOf('KG') > -1)
  );
}

function isKomposisiPercentHeader(key) {
  return (
    key === 'PERCENT' ||
    key === 'PERCENTAGE' ||
    key === 'PERSEN' ||
    key === 'PERSENTASE' ||
    key.indexOf('PERCENT') === 0 ||
    key.indexOf('PERSEN') === 0
  );
}

function parseKomposisiNumber(raw, displayValue, isPercent) {
  if (isSpreadsheetErrorValue(raw) || isSpreadsheetErrorValue(displayValue)) {
    return null;
  }

  let numberValue = null;

  if (typeof raw === 'number' && !isNaN(raw) && isFinite(raw)) {
    numberValue = raw;
  } else {
    let text = String(
      displayValue !== null &&
      displayValue !== undefined &&
      String(displayValue).trim() !== ''
        ? displayValue
        : raw
    ).trim();

    if (text === '' || text === '-' || text === ':' || text === '=') {
      return null;
    }

    const containsPercent = text.indexOf('%') > -1;

    text = text
      .replace(/\s+/g, '')
      .replace(/%/g, '');

    numberValue = parseIndoNumber(text);
    if (numberValue === null) return null;

    if (isPercent && containsPercent) {
      numberValue = numberValue / 100;
    }
  }

  if (isPercent) {
    if (numberValue > 1 && numberValue <= 100) {
      numberValue = numberValue / 100;
    }

    if (numberValue < 0 || numberValue > 1) return null;
  }

  return numberValue;
}

function getKomposisiNumberNear(rawRow, displayRow, targetColumn, isPercent) {
  const offsets = [0, 1, -1];

  for (const offset of offsets) {
    const column = targetColumn + offset;
    if (column < 0 || column >= rawRow.length) continue;

    const parsed = parseKomposisiNumber(
      rawRow[column],
      displayRow[column],
      isPercent
    );

    if (parsed !== null) return parsed;
  }

  return null;
}

function getKomposisiMaterialNear(row, targetColumn) {
  const mainKey = normalizeKey(row[targetColumn]);

  if (mainKey === 'TOTAL') {
    return {
      material: '',
      isTotal: true
    };
  }

  const offsets = [0, 1, -1];

  for (const offset of offsets) {
    const column = targetColumn + offset;
    if (column < 0 || column >= row.length) continue;

    const raw = row[column];

    if (
      raw === null ||
      raw === undefined ||
      typeof raw === 'number' ||
      typeof raw === 'boolean' ||
      isSpreadsheetErrorValue(raw)
    ) {
      continue;
    }

    const text = String(raw).replace(/\s+/g, ' ').trim();
    const key = normalizeKey(text);

    if (
      key === '' ||
      key === '0' ||
      key === 'TOTAL' ||
      key === 'JENISBAHAN' ||
      key === 'JENISBAHANBAKU' ||
      key === 'QTY' ||
      key === 'QTYKG' ||
      key === 'PERCENT' ||
      key === 'PERSEN' ||
      text === '-' ||
      text === ':' ||
      text === '='
    ) {
      continue;
    }

    return {
      material: text,
      isTotal: false
    };
  }

  return null;
}

function getKomposisiAnchorDistance(anchors, headerRow, headerColumn) {
  if (anchors.length === 0) return null;

  let shortestDistance = null;

  for (const anchor of anchors) {
    const distance =
      Math.abs(anchor.row - headerRow) +
      Math.abs(anchor.col - headerColumn);

    if (shortestDistance === null || distance < shortestDistance) {
      shortestDistance = distance;
    }
  }

  return shortestDistance;
}

function extractKomposisiCandidatesFromSheet(sheet, sourcePriority) {
  const sheetData = getExtractionSheetData_(sheet);
  const data = sheetData.values;
  const displayData = sheetData.displayValues;
  const anchors = [];

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const key = normalizeKey(data[r][c]);

      if (key === 'KOMPOSISIBAHAN' || key === 'KOMPOSISIBAHANBAKU') {
        anchors.push({
          row: r,
          col: c
        });
      }
    }
  }

  const candidates = [];

  for (let headerRow = 0; headerRow < data.length; headerRow++) {
    const materialColumns = [];
    const qtyColumns = [];
    const percentColumns = [];

    for (let column = 0; column < data[headerRow].length; column++) {
      const key = normalizeKey(data[headerRow][column]);

      if (isKomposisiMaterialHeader(key)) materialColumns.push(column);
      if (isKomposisiQtyHeader(key)) qtyColumns.push(column);
      if (isKomposisiPercentHeader(key)) percentColumns.push(column);
    }

    if (
      materialColumns.length === 0 ||
      qtyColumns.length === 0 ||
      percentColumns.length === 0
    ) {
      continue;
    }

    for (const materialColumn of materialColumns) {
      for (const qtyColumn of qtyColumns) {
        for (const percentColumn of percentColumns) {
          const minimumColumn = Math.min(materialColumn, qtyColumn, percentColumn);
          const maximumColumn = Math.max(materialColumn, qtyColumn, percentColumn);

          if ((maximumColumn - minimumColumn) > 18) continue;

          const anchorDistance = getKomposisiAnchorDistance(
            anchors,
            headerRow,
            minimumColumn
          );

          const items = [];
          let emptyRowCount = 0;
          const lastDataRow = Math.min(data.length, headerRow + 16);

          for (let rowIndex = headerRow + 1; rowIndex < lastDataRow; rowIndex++) {
            const materialData = getKomposisiMaterialNear(
              data[rowIndex],
              materialColumn
            );

            if (materialData && materialData.isTotal) break;

            if (!materialData) {
              emptyRowCount++;

              if (items.length > 0 && emptyRowCount >= 3) break;
              continue;
            }

            emptyRowCount = 0;

            const qty = getKomposisiNumberNear(
              data[rowIndex],
              displayData[rowIndex],
              qtyColumn,
              false
            );

            const percent = getKomposisiNumberNear(
              data[rowIndex],
              displayData[rowIndex],
              percentColumn,
              true
            );

            // Baris material tanpa KG dan tanpa persen tidak dianggap komposisi valid.
            if (qty === null && percent === null) continue;

            items.push({
              material: materialData.material,
              qty: qty,
              percent: percent,
              sourceRow: rowIndex
            });
          }

          if (items.length === 0) continue;

          let score = sourcePriority;
          let completeItemCount = 0;
          let totalPercent = 0;
          let percentItemCount = 0;

          for (const item of items) {
            score += 100;

            if (item.qty !== null) score += 20;

            if (item.percent !== null) {
              score += 20;
              totalPercent += item.percent;
              percentItemCount++;
            }

            if (item.qty !== null && item.percent !== null) {
              completeItemCount++;
            }
          }

          score += completeItemCount * 20;

          if (anchorDistance !== null) {
            if (anchorDistance <= 4) score += 60;
            else if (anchorDistance <= 10) score += 30;
          }

          if (percentItemCount > 0) {
            const difference = Math.abs(1 - totalPercent);

            if (difference <= 0.001) score += 60;
            else if (difference <= 0.02) score += 40;
            else if (difference <= 0.1) score += 15;
          }

          score -= (maximumColumn - minimumColumn);

          candidates.push({
            sheetName: sheet.getName(),
            items: items,
            score: score,
            headerRow: headerRow
          });
        }
      }
    }
  }

  return candidates;
}

function getKomposisiBahanBaku(allSheets, sheetUtama) {
  const sheetCandidates = [];
  const usedSheetIds = {};

  function addCandidateSheet(sheet, priority) {
    if (!sheet) return;

    const sheetId = sheet.getSheetId();
    if (usedSheetIds[sheetId]) return;

    usedSheetIds[sheetId] = true;
    sheetCandidates.push({
      sheet: sheet,
      priority: priority
    });
  }

  addCandidateSheet(sheetUtama, 50);

  for (const sheet of allSheets) {
    const sheetName = normalizeKey(sheet.getName());
    if (sheetName === 'POPRODUKSI') addCandidateSheet(sheet, 50);
  }

  for (const sheet of allSheets) {
    const sheetName = normalizeKey(sheet.getName());

    if (sheetName === 'MIXER' || sheetName.indexOf('MIXER') === 0) {
      addCandidateSheet(sheet, 40);
    }
  }

  let allCandidates = [];

  for (const candidateSheet of sheetCandidates) {
    allCandidates = allCandidates.concat(
      extractKomposisiCandidatesFromSheet(
        candidateSheet.sheet,
        candidateSheet.priority
      )
    );
  }

  if (allCandidates.length === 0) {
    return {
      items: [],
      sourceSheet: '',
      totalFound: 0,
      overflow: false
    };
  }

  allCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.headerRow - b.headerRow;
  });

  const bestCandidate = allCandidates[0];

  bestCandidate.items.sort((a, b) => a.sourceRow - b.sourceRow);

  return {
    items: bestCandidate.items.slice(0, 8),
    sourceSheet: bestCandidate.sheetName,
    totalFound: bestCandidate.items.length,
    overflow: bestCandidate.items.length > 8
  };
}

function buildKomposisiColumns(items) {
  const result = new Array(22).fill('');
  const maximum = Math.min(items.length, 8);

  for (let index = 0; index < maximum; index++) {
    const item = items[index];

    if (index === 7) {
      result[21] = item.material;
      continue;
    }

    const startIndex = index * 3;
    result[startIndex] = item.material;
    result[startIndex + 1] = item.qty === null ? '' : item.qty;
    result[startIndex + 2] = item.percent === null ? '' : item.percent;
  }

  return result;
}

// ==========================================
// EKSTRAKSI UTAMA
// ==========================================
const EXTRACTION_WRITE_BATCH_SIZE = 50;
const EXTRACTION_PROGRESS_TTL_SECONDS = 600;
const EXTRACTION_PROGRESS_PREFIX = 'spk-extraction:';
const EXTRACTION_ACTIVE_JOB_PROPERTY = 'spk-active-extraction-job';
const EXTRACTION_ACTIVE_JOB_STALE_MS = 5 * 60 * 1000;
const EXTRACTION_CHUNK_BUDGET_MS = 180 * 1000;
const EXTRACTION_FINISHED_JOB_RETENTION_MS = 15 * 60 * 1000;
const EXTRACTION_MAX_REPORT_ITEMS = 60;
const EXTRACTION_MAX_PERSISTED_REPORT_ITEMS = 5;
const EXTRACTION_REPORT_FILE_LIMIT = 160;
const EXTRACTION_REPORT_REASON_LIMIT = 260;

function cleanExtractionReportText_(value, maximumLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength);
}

function classifyExtractionIssue_(message) {
  const normalized = String(message || '').toLowerCase();

  if (normalized.indexOf('lebih dari satu file sumber') > -1) {
    return 'Duplikat SPK';
  }

  if (normalized.indexOf('berbeda dengan f7') > -1) {
    return 'SPK tidak cocok';
  }

  if (normalized.indexOf('f7 kosong') > -1) {
    return 'SPK kosong';
  }

  if (normalized.indexOf('format spk') > -1) {
    return 'Format SPK';
  }

  if (normalized.indexOf('bahan') > -1) {
    return 'Komposisi bahan';
  }

  if (normalized.indexOf('sheet') > -1) {
    return 'Struktur sheet';
  }

  return 'Gagal memproses';
}

function createExtractionIssue_(fileName, spk, reason, category) {
  const safeReason = cleanExtractionReportText_(
    reason,
    EXTRACTION_REPORT_REASON_LIMIT
  );

  return {
    file: cleanExtractionReportText_(
      fileName || 'File tanpa nama',
      EXTRACTION_REPORT_FILE_LIMIT
    ),
    spk: cleanExtractionReportText_(spk, 40),
    category: cleanExtractionReportText_(
      category || classifyExtractionIssue_(safeReason),
      60
    ),
    reason: safeReason || 'Penyebab tidak diketahui.'
  };
}

function appendExtractionIssue_(target, issue) {
  if (target.length >= EXTRACTION_MAX_REPORT_ITEMS) return false;
  target.push(issue);
  return true;
}

function normalizeExtractionIssueList_(items) {
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, EXTRACTION_MAX_REPORT_ITEMS)
    .map(function(item) {
      const source = item && typeof item === 'object' ? item : {};
      return createExtractionIssue_(
        source.file,
        source.spk,
        source.reason,
        source.category
      );
    });
}

function compactExtractionIssueList_(items, omittedCount) {
  const source = Array.isArray(items) ? items : [];
  const visible = source.slice(0, EXTRACTION_MAX_PERSISTED_REPORT_ITEMS);

  return {
    items: visible,
    omitted: (
      Math.max(0, Number(omittedCount) || 0) +
      Math.max(0, source.length - visible.length)
    )
  };
}

function compactExtractionStatsForPersistence_(stats) {
  if (!stats || typeof stats !== 'object') return null;

  const compactErrors = compactExtractionIssueList_(
    stats.errorDetails,
    stats.omittedErrorDetails
  );
  const compactWarnings = compactExtractionIssueList_(
    stats.warningDetails,
    stats.omittedWarningDetails
  );

  return Object.assign({}, stats, {
    errorDetails: compactErrors.items,
    warningDetails: compactWarnings.items,
    omittedErrorDetails: compactErrors.omitted,
    omittedWarningDetails: compactWarnings.omitted
  });
}

function compactExtractionResultForPersistence_(result) {
  if (!result || typeof result !== 'object') return result;

  const report = result.report && typeof result.report === 'object'
    ? result.report
    : {};
  const compactErrors = compactExtractionIssueList_(
    report.errors,
    report.omittedErrors
  );
  const compactWarnings = compactExtractionIssueList_(
    report.warnings,
    report.omittedWarnings
  );

  return Object.assign({}, result, {
    resumeStats: null,
    report: {
      errors: compactErrors.items,
      warnings: compactWarnings.items,
      omittedErrors: compactErrors.omitted,
      omittedWarnings: compactWarnings.omitted
    }
  });
}

function readActiveExtractionJob_() {
  const rawValue = PropertiesService
    .getScriptProperties()
    .getProperty(EXTRACTION_ACTIVE_JOB_PROPERTY);

  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    PropertiesService
      .getScriptProperties()
      .deleteProperty(EXTRACTION_ACTIVE_JOB_PROPERTY);
    return null;
  }
}

function saveActiveExtractionJob_(job) {
  const payload = Object.assign({}, job, {
    updatedAt: new Date().toISOString()
  });

  PropertiesService
    .getScriptProperties()
    .setProperty(EXTRACTION_ACTIVE_JOB_PROPERTY, JSON.stringify(payload));

  return payload;
}

function updateActiveExtractionJob_(jobId, patch) {
  const safeJobId = normalizeExtractionJobId_(jobId);
  if (safeJobId === '') return null;

  const current = readActiveExtractionJob_();
  if (!current || current.jobId !== safeJobId) return null;

  return saveActiveExtractionJob_(Object.assign({}, current, patch));
}

function deleteActiveExtractionJob_(jobId) {
  const safeJobId = normalizeExtractionJobId_(jobId);
  const current = readActiveExtractionJob_();

  if (!current) return;
  if (safeJobId && current.jobId !== safeJobId) return;

  PropertiesService
    .getScriptProperties()
    .deleteProperty(EXTRACTION_ACTIVE_JOB_PROPERTY);
}

function isExtractionJobTerminal_(status) {
  return status === 'done' || status === 'error' || status === 'cancelled';
}

function extractionCancelCacheKey_(jobId) {
  return 'extraction-cancel-' + normalizeExtractionJobId_(jobId);
}

function isExtractionCancelRequested_(jobId) {
  try {
    return CacheService
      .getScriptCache()
      .get(extractionCancelCacheKey_(jobId)) === '1';
  } catch (error) {
    return false;
  }
}

function cancelExtractionJob(jobId) {
  try {
    const safeJobId = normalizeExtractionJobId_(jobId);
    if (safeJobId === '') {
      return { status: 'error', message: 'ID proses penarikan tidak valid.' };
    }

    try {
      CacheService
        .getScriptCache()
        .put(extractionCancelCacheKey_(safeJobId), '1', 21600);
    } catch (cacheError) {
      // Penanda di job record tetap menghentikan proses pada batch berikutnya.
    }

    updateActiveExtractionJob_(safeJobId, { status: 'cancelled', result: null });

    const currentProgress = getExtractionProgress(safeJobId) || {};
    updateExtractionProgress_(safeJobId, Object.assign({}, currentProgress, {
      status: 'cancelled',
      message: 'Penarikan data dibatalkan. Menunggu batch aktif berhenti...'
    }));

    return { status: 'success', message: 'Permintaan pembatalan diterima.' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function buildActiveExtractionJobResponse_(job, progress) {
  return {
    status: 'success',
    active: true,
    job: Object.assign({}, job, {
      progress: progress || getExtractionProgress(job.jobId)
    })
  };
}

function getActiveExtractionJob() {
  try {
    let job = readActiveExtractionJob_();
    if (!job || !job.jobId || !job.folderId) {
      return {
        status: 'idle',
        active: false
      };
    }

    let progress = getExtractionProgress(job.jobId);
    const progressHasTimestamp = Boolean(progress && progress.updatedAt);
    const effectiveStatus = progressHasTimestamp
      ? progress.status
      : job.status;
    const latestTimestamp = progressHasTimestamp
      ? progress.updatedAt
      : job.updatedAt;
    const latestTime = Date.parse(latestTimestamp || job.startedAt || '');
    const ageMs = Number.isFinite(latestTime)
      ? Date.now() - latestTime
      : Number.POSITIVE_INFINITY;

    if (
      isExtractionJobTerminal_(effectiveStatus) &&
      ageMs > EXTRACTION_FINISHED_JOB_RETENTION_MS
    ) {
      deleteActiveExtractionJob_(job.jobId);
      return {
        status: 'idle',
        active: false
      };
    }

    if (
      (effectiveStatus === 'running' || effectiveStatus === 'preparing') &&
      ageMs > EXTRACTION_ACTIVE_JOB_STALE_MS
    ) {
      job = saveActiveExtractionJob_(Object.assign({}, job, {
        status: 'paused',
        message: 'Proses sebelumnya terputus dan siap dilanjutkan.',
        result: null
      }));

      progress = updateExtractionProgress_(job.jobId, Object.assign({}, progress || {}, {
        status: 'paused',
        message: 'Proses sebelumnya terputus dan siap dilanjutkan.',
        nextIndex: Number(progress && progress.nextIndex) || Number(job.nextIndex) || 0,
        resumeStats: progress && progress.resumeStats
          ? progress.resumeStats
          : (job.resumeStats || null)
      }));
    } else if (effectiveStatus && effectiveStatus !== job.status) {
      job.status = effectiveStatus;
    }

    return buildActiveExtractionJobResponse_(job, progress);
  } catch (error) {
    return {
      status: 'error',
      active: false,
      message: error.message
    };
  }
}

function beginExtractionJob(targetFolderId, requestedJobId, targetFileId, extractionMode) {
  let registrationLock = null;

  try {
    const folderId = String(targetFolderId || '').trim();
    const jobId = normalizeExtractionJobId_(requestedJobId);
    const fileId = String(targetFileId || '').trim();
    const mode = String(extractionMode || '').trim() === 'backfill' ? 'backfill' : 'sync';

    if (folderId === '') throw new Error('ID Folder tidak ditemukan.');
    if (jobId === '') throw new Error('ID proses penarikan tidak valid.');

    const existingResponse = getActiveExtractionJob();
    if (
      existingResponse.active &&
      existingResponse.job &&
      !isExtractionJobTerminal_(existingResponse.job.status)
    ) {
      existingResponse.started = false;
      return existingResponse;
    }

    // Kunci ini juga dipakai penyimpanan Input SPK. Tenggangnya dilebihkan
    // agar penarikan tidak langsung ditolak hanya karena ada satu SPK yang
    // kebetulan sedang disimpan.
    registrationLock = LockService.getScriptLock();
    if (!registrationLock.tryLock(20000)) {
      const runningResponse = getActiveExtractionJob();
      if (runningResponse.active) {
        runningResponse.started = false;
        return runningResponse;
      }

      throw new Error('Database sedang dipakai proses lain (penyimpanan SPK atau penarikan lain). Coba lagi beberapa saat.');
    }

    const recheckedResponse = getActiveExtractionJob();
    if (
      recheckedResponse.active &&
      recheckedResponse.job &&
      !isExtractionJobTerminal_(recheckedResponse.job.status)
    ) {
      recheckedResponse.started = false;
      return recheckedResponse;
    }

    const folder = DriveApp.getFolderById(folderId);
    const selectedSources = selectExtractionSourceFiles_(folder, fileId);
    const selectedFile = fileId === '' ? null : selectedSources[0];
    const nowIso = new Date().toISOString();
    const job = saveActiveExtractionJob_({
      jobId: jobId,
      folderId: folderId,
      folderName: folder.getName(),
      sourceMode: selectedFile ? 'file' : 'folder',
      extractionMode: mode,
      fileId: selectedFile ? selectedFile.id : '',
      fileName: selectedFile ? selectedFile.name : '',
      status: 'preparing',
      nextIndex: 0,
      resumeStats: null,
      result: null,
      startedAt: nowIso
    });

    const initialProgress = {
      status: 'preparing',
      percent: 0,
      processed: 0,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      pending: 0,
      currentFile: selectedFile ? selectedFile.name : '',
      message: selectedFile
        ? 'Menyiapkan file ' + selectedFile.name + '...'
        : 'Memindai file sumber...'
    };

    updateExtractionProgress_(jobId, initialProgress);

    const response = buildActiveExtractionJobResponse_(job, Object.assign(
      { updatedAt: nowIso },
      initialProgress
    ));
    response.started = true;
    return response;
  } catch (error) {
    return {
      status: 'error',
      active: false,
      message: error.message
    };
  } finally {
    if (registrationLock && registrationLock.hasLock()) {
      registrationLock.releaseLock();
    }
  }
}

function acknowledgeExtractionJob(jobId) {
  try {
    const safeJobId = normalizeExtractionJobId_(jobId);
    const current = readActiveExtractionJob_();

    if (
      current &&
      current.jobId === safeJobId &&
      isExtractionJobTerminal_(current.status)
    ) {
      deleteActiveExtractionJob_(safeJobId);
    }

    return {
      status: 'success'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

function getExtractionProgress(jobId) {
  try {
    const safeJobId = normalizeExtractionJobId_(jobId);
    if (safeJobId === '') {
      return {
        status: 'idle',
        percent: 0,
        message: 'Menunggu proses penarikan.'
      };
    }

    const cached = CacheService
      .getScriptCache()
      .get(EXTRACTION_PROGRESS_PREFIX + safeJobId);

    if (!cached) {
      return {
        status: 'preparing',
        percent: 0,
        message: 'Menyiapkan proses penarikan data.'
      };
    }

    return JSON.parse(cached);
  } catch (error) {
    return {
      status: 'error',
      percent: 0,
      message: error.message
    };
  }
}

function normalizeExtractionJobId_(jobId) {
  return String(jobId || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 80);
}

function updateExtractionProgress_(jobId, progress) {
  const safeJobId = normalizeExtractionJobId_(jobId);
  if (safeJobId === '') return null;

  const payload = Object.assign({}, progress, {
    updatedAt: new Date().toISOString()
  });

  CacheService
    .getScriptCache()
    .put(
      EXTRACTION_PROGRESS_PREFIX + safeJobId,
      JSON.stringify(payload),
      EXTRACTION_PROGRESS_TTL_SECONDS
    );

  return payload;
}

function isSupportedExtractionMimeType_(mimeType) {
  return (
    mimeType === MimeType.GOOGLE_SHEETS ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  );
}

function listExtractionSourceFiles_(folder) {
  const iterator = folder.getFiles();
  const sourceFiles = [];

  while (iterator.hasNext()) {
    const file = iterator.next();
    let fileId = file.getId();
    let mimeType = file.getMimeType();

    if (mimeType === MimeType.SHORTCUT) {
      fileId = file.getTargetId();
      mimeType = file.getTargetMimeType();
    }

    if (!isSupportedExtractionMimeType_(mimeType)) continue;

    sourceFiles.push({
      id: fileId,
      mimeType: mimeType,
      name: file.getName(),
      spkHint: normalizeSourceSpk_(file.getName())
    });
  }

  sourceFiles.sort(function(a, b) {
    if (a.spkHint && b.spkHint) {
      const keyComparison = buildSpkSortKey_(a.spkHint, 0)
        .localeCompare(buildSpkSortKey_(b.spkHint, 0));
      if (keyComparison !== 0) return keyComparison;
    } else if (a.spkHint) {
      return -1;
    } else if (b.spkHint) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });

  return sourceFiles;
}

function selectExtractionSourceFiles_(folder, targetFileId) {
  const sourceFiles = listExtractionSourceFiles_(folder);
  const safeFileId = String(targetFileId || '').trim();

  if (safeFileId === '') return sourceFiles;

  const selectedFile = sourceFiles.find(function(file) {
    return file.id === safeFileId;
  });

  if (!selectedFile) {
    throw new Error(
      'File sumber tidak ditemukan di folder ini atau formatnya tidak didukung.'
    );
  }

  return [selectedFile];
}

function findDuplicateSourceSpks_(sourceFiles) {
  const counts = new Map();
  const duplicates = new Set();

  sourceFiles.forEach(function(file) {
    if (!file.spkHint) return;
    const nextCount = (counts.get(file.spkHint) || 0) + 1;
    counts.set(file.spkHint, nextCount);
    if (nextCount > 1) duplicates.add(file.spkHint);
  });

  return duplicates;
}

function extractPreviousSpkFromSourceRange_(values, displayValues) {
  const sourceRows = Array.isArray(values) ? values : [];
  const displayRows = Array.isArray(displayValues) ? displayValues : [];
  const rawRow = sourceRows[26] || [];
  const displayRow = displayRows[26] || [];
  const candidates = [];

  // Template SPK menempatkan "SPK Sebelumnya" pada area C27:F27.
  // Baca nilai mentah dan nilai tampil agar sel formula maupun merge tetap terbaca.
  for (let columnIndex = 2; columnIndex <= 5; columnIndex++) {
    const raw = rawRow[columnIndex];
    const display = displayRow[columnIndex];
    const rawText = String(raw === null || raw === undefined ? '' : raw).trim();
    const displayText = String(
      display === null || display === undefined ? '' : display
    ).trim();

    if (rawText !== '' && !isSpreadsheetErrorValue(raw)) {
      candidates.push(rawText);
    }
    if (
      displayText !== '' &&
      displayText !== rawText &&
      !isSpreadsheetErrorValue(display)
    ) {
      candidates.push(displayText);
    }
  }

  const combined = candidates.join(' | ');
  if (combined !== '') candidates.push(combined);

  const matches = candidates
    .map(function(candidate) {
      return normalizeSourceSpk_(candidate);
    })
    .filter(Boolean);
  const uniqueMatches = Array.from(new Set(matches));

  return uniqueMatches.length === 1 ? uniqueMatches[0] : '';
}

function readMainSheetSnapshot_(sheet) {
  // Gunakan snapshot data yang sama dengan helper lain agar satu sheet
  // tidak dibaca berulang kali selama ekstraksi.
  const sheetData = getExtractionSheetData_(sheet);
  const values = sheetData.values;
  const displayValues = sheetData.displayValues;

  function cell(row, column) {
    const sourceRow = values[row - 1] || [];
    return sourceRow[column - 1];
  }

  function rowSlice(row, startColumn, endColumn) {
    const sourceRow = values[row - 1] || [];
    return sourceRow.slice(startColumn - 1, endColumn);
  }

  return {
    spk: cell(7, 6),
    tanggal: cell(3, 15),
    repeatChecked: cell(7, 12),
    newChecked: cell(8, 12),
    repeatOrderType: cell(7, 13),
    newOrderType: cell(8, 13),
    marketing: cell(16, 6),
    nomorPo: cell(5, 16),
    artikel: cell(9, 6),
    customer: cell(8, 6),
    film: cell(19, 10),
    ukuranBlow: rowSlice(19, 7, 9),
    ukuranJadi: rowSlice(10, 6, 10),
    material: rowSlice(22, 5, 10),
    spkSebelumnya: extractPreviousSpkFromSourceRange_(
      values,
      displayValues
    )
  };
}

function buildExistingSpkIndex_(sheet) {
  const rowMap = new Map();
  const duplicates = new Set();
  const lastRow = getDatabaseDataLastRow_(sheet);
  if (lastRow < DB_DATA_START_ROW) {
    return {
      rowMap: rowMap,
      duplicates: duplicates
    };
  }

  const values = sheet
    .getRange(
      DB_DATA_START_ROW,
      DB_COL.SPK,
      lastRow - DB_DATA_START_ROW + 1,
      1
    )
    .getValues();

  values.forEach(function(row, index) {
    const spk = normalizeSourceSpk_(row[0]) || normalizeSpk_(row[0]);
    if (spk === '') return;

    if (rowMap.has(spk)) {
      duplicates.add(spk);
    } else {
      rowMap.set(spk, DB_DATA_START_ROW + index);
    }
  });

  return {
    rowMap: rowMap,
    duplicates: duplicates
  };
}

function applyExtractionRowFormatting_(sheet, startRow, rowCount) {
  if (rowCount < 1) return;

  const endRow = startRow + rowCount - 1;

  sheet.getRange(startRow, DB_COL.TANGGAL, rowCount, 1).setNumberFormat('dd/MM/yyyy');
  sheet.getRange(startRow, DB_COL.ETD, rowCount, 1).setNumberFormat('dd/MM/yyyy');
  sheet
    .getRange(startRow, DB_COL.BS_START, rowCount, DB_COL.TOTAL_BS - DB_COL.BS_START + 1)
    .setNumberFormat('0.##%');

  sheet.getRangeList([
    'AY' + startRow + ':AY' + endRow,
    'BB' + startRow + ':BB' + endRow,
    'BE' + startRow + ':BE' + endRow,
    'BH' + startRow + ':BH' + endRow,
    'BK' + startRow + ':BK' + endRow,
    'BN' + startRow + ':BN' + endRow,
    'BQ' + startRow + ':BQ' + endRow
  ]).setNumberFormat('0.###');

  sheet.getRangeList([
    'AZ' + startRow + ':AZ' + endRow,
    'BC' + startRow + ':BC' + endRow,
    'BF' + startRow + ':BF' + endRow,
    'BI' + startRow + ':BI' + endRow,
    'BL' + startRow + ':BL' + endRow,
    'BO' + startRow + ':BO' + endRow,
    'BR' + startRow + ':BR' + endRow
  ]).setNumberFormat('0.##%');
}

function setExtractionTotalFormulas_(sheet, startRow, rowCount) {
  const formulas = [];

  for (let row = startRow; row < startRow + rowCount; row++) {
    formulas.push([
      '=SUM(AY' + row + '+BB' + row + '+BE' + row + '+BH' + row +
        '+BK' + row + '+BN' + row + '+BQ' + row + ')',
      '=SUM(AZ' + row + '+BC' + row + '+BF' + row + '+BI' + row +
        '+BL' + row + '+BO' + row + '+BR' + row + ')'
    ]);
  }

  sheet
    .getRange(startRow, DB_COL.TOTAL_KOMPOSISI_KG, rowCount, 2)
    .setFormulas(formulas);
}

// Mengisi kolom baru (BV:CO warna tinta, CR keterangan artikel, CS:DA
// keterangan divisi, DR kode item) pada baris SPK yang sudah ada. Sel yang
// sudah terisi tidak pernah ditimpa agar hasil edit manual tetap aman.
function backfillExtractionRow_(
  sheet,
  rowNumber,
  warnaTinta,
  keteranganArtikel,
  processNotes,
  kodeItem,
  keteranganWarna
) {
  if (!rowNumber) return false;

  let changed = false;
  const isBlank = function(value) {
    return String(value === null || value === undefined ? '' : value).trim() === '';
  };

  const warnaColumns = buildWarnaColumns_(warnaTinta || []);
  if (warnaColumns.some(function(value) { return !isBlank(value); })) {
    const width = DB_MAX_WARNA * 2;
    const warnaRange = sheet.getRange(rowNumber, DB_COL.WARNA_START, 1, width);
    const currentWarna = warnaRange.getValues()[0];
    if (currentWarna.every(isBlank)) {
      warnaRange.setValues([warnaColumns]);
      changed = true;
    }
  }

  if (!isBlank(keteranganArtikel)) {
    const artikelCell = sheet.getRange(rowNumber, DB_COL.KETERANGAN_ARTIKEL);
    if (isBlank(artikelCell.getValue())) {
      artikelCell.setValue(keteranganArtikel);
      changed = true;
    }
  }

  const notes = processNotes || [];
  if (notes.some(function(value) { return !isBlank(value); })) {
    const notesRange = sheet.getRange(rowNumber, DB_COL.KET_PROSES_START, 1, 9);
    const currentNotes = notesRange.getValues()[0];
    let notesChanged = false;
    const mergedNotes = currentNotes.map(function(value, index) {
      if (isBlank(value) && !isBlank(notes[index])) {
        notesChanged = true;
        return notes[index];
      }
      return value;
    });

    if (notesChanged) {
      notesRange.setValues([mergedNotes]);
      changed = true;
    }
  }

  if (!isBlank(kodeItem) && sheet.getMaxColumns() >= DB_COL.KODE_ITEM) {
    const kodeItemCell = sheet.getRange(rowNumber, DB_COL.KODE_ITEM);
    if (isBlank(kodeItemCell.getValue())) {
      kodeItemCell.setValue(kodeItem);
      changed = true;
    }
  }

  if (
    !isBlank(keteranganWarna) &&
    sheet.getMaxColumns() >= DB_COL.KETERANGAN_WARNA
  ) {
    const keteranganWarnaCell = sheet.getRange(rowNumber, DB_COL.KETERANGAN_WARNA);
    if (isBlank(keteranganWarnaCell.getValue())) {
      keteranganWarnaCell.setValue(keteranganWarna);
      changed = true;
    }
  }

  return changed;
}

function writeExtractionGroup_(sheet, startRow, records, setDefaultRelease) {
  if (!records.length) return;

  const rowCount = records.length;

  // Hanya kolom yang dikendalikan file sumber yang ditimpa.
  sheet
    .getRange(startRow, DB_COL.SPK, rowCount, 12)
    .setValues(records.map(function(record) { return record.core; }));

  // T:AN. M:S serta AO:AQ tetap dikelola oleh rumus di Spreadsheet/aplikasi.
  sheet
    .getRange(startRow, DB_COL.PROSES_MIXER, rowCount, 21)
    .setValues(records.map(function(record) { return record.production; }));

  // AR:BS.
  sheet
    .getRange(startRow, DB_COL.JUMLAH_ORDER, rowCount, 28)
    .setValues(records.map(function(record) { return record.orderComposition; }));

  // BV:CO — warna & pemakaian tinta Printing dari file sumber.
  sheet
    .getRange(startRow, DB_COL.WARNA_START, rowCount, DB_MAX_WARNA * 2)
    .setValues(records.map(function(record) {
      return record.warnaColumns || new Array(DB_MAX_WARNA * 2).fill('');
    }));

  // CP: SPK Sebelumnya yang dibaca dari C27:F27 pada file sumber.
  sheet
    .getRange(startRow, DB_COL.SPK_REFERENSI, rowCount, 1)
    .setValues(records.map(function(record) {
      return [record.spkSebelumnya || ''];
    }));

  // CR: keterangan artikel dari blok keterangan PO Produksi.
  sheet
    .getRange(startRow, DB_COL.KETERANGAN_ARTIKEL, rowCount, 1)
    .setValues(records.map(function(record) {
      return [record.keteranganArtikel || ''];
    }));

  // CS:DA — keterangan produk per divisi.
  sheet
    .getRange(startRow, DB_COL.KET_PROSES_START, rowCount, 9)
    .setValues(records.map(function(record) {
      return record.processNotes || new Array(9).fill('');
    }));

  // DR — kode item dari baris "Ket. Plastik" pada file sumber.
  if (sheet.getMaxColumns() >= DB_COL.KODE_ITEM) {
    sheet
      .getRange(startRow, DB_COL.KODE_ITEM, rowCount, 1)
      .setValues(records.map(function(record) {
        return [record.kodeItem || ''];
      }));
  }

  // EA — keterangan warna dari baris "WARNA" pada file sumber.
  if (sheet.getMaxColumns() >= DB_COL.KETERANGAN_WARNA) {
    sheet
      .getRange(startRow, DB_COL.KETERANGAN_WARNA, rowCount, 1)
      .setValues(records.map(function(record) {
        return [record.keteranganWarna || ''];
      }));
  }

  if (setDefaultRelease) {
    sheet
      .getRange(startRow, DB_COL.RELEASE, rowCount, 1)
      .setValues(records.map(function() { return ['Tidak']; }));
  }

  setConversionFormulas_(sheet, startRow, rowCount);
  setExtractionTotalFormulas_(sheet, startRow, rowCount);
  applyExtractionRowFormatting_(sheet, startRow, rowCount);
}

// Penarikan data dulu memegang kunci skrip selama seluruh proses berjalan:
// membuka Drive, membaca tiap file, sampai menulis hasilnya. Padahal bagian
// paling lama justru pembacaan file, yang sama sekali tidak menyentuh
// Database. Akibatnya Input SPK yang dijalankan bersamaan selalu gagal dengan
// pesan "Sistem sedang sibuk" karena menunggu kunci yang tidak pernah lepas.
//
// Sekarang kunci hanya diambil sesaat, tepat saat menulis ke sheet, lalu
// segera dilepas. Penarikan dan Input SPK dapat berjalan berbarengan tanpa
// saling menunggu, sementara penulisannya tetap tidak mungkin bertabrakan.
function withDatabaseLock_(action) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(45000)) {
    throw new Error(
      'Database sedang dipakai proses lain lebih dari 45 detik. ' +
      'Penarikan dihentikan sementara; jalankan lagi setelah penyimpanan SPK selesai.'
    );
  }

  try {
    return action();
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function flushExtractionRecords_(sheet, records, existingRowMap) {
  const newRecords = [];
  let skipped = 0;

  records.forEach(function(record) {
    if (existingRowMap.has(record.spk)) {
      skipped++;
      return;
    }

    newRecords.push(record);
  });

  if (!newRecords.length) {
    return { created: 0, updated: 0, skipped: skipped };
  }

  // Peta SPK dibangun sekali di awal penarikan, jadi bisa tertinggal bila ada
  // SPK baru disimpan lewat Input SPK sementara penarikan sedang membaca file.
  // Karena itu keberadaannya diperiksa ulang di dalam kunci.
  return withDatabaseLock_(function() {
    const terbaru = getDatabaseSpkRowMap_(sheet);
    const layakTulis = [];

    newRecords.forEach(function(record) {
      const barisAda = terbaru[record.spk];
      if (barisAda) {
        existingRowMap.set(record.spk, barisAda);
        skipped++;
        return;
      }
      layakTulis.push(record);
    });

    if (!layakTulis.length) {
      return { created: 0, updated: 0, skipped: skipped };
    }

    const startRow = getNextDatabaseDataRow_(sheet);
    writeExtractionGroup_(sheet, startRow, layakTulis, true);
    SpreadsheetApp.flush();
    syncDatabaseV2RowsAfterLegacyWrite_(
      sheet,
      layakTulis.map(function(record, index) { return startRow + index; }),
      'EXTRACTION_IMPORT'
    );

    layakTulis.forEach(function(record, index) {
      existingRowMap.set(record.spk, startRow + index);
    });

    return { created: layakTulis.length, updated: 0, skipped: skipped };
  });
}

function extractData(targetFolderId, jobId, resumeIndex, resumeStats, targetFileId) {
  const safeJobId = normalizeExtractionJobId_(jobId);
  const requestedFileId = String(targetFileId || '').trim();
  let effectiveFileId = requestedFileId;
  const startIndex = Math.max(0, Math.floor(Number(resumeIndex) || 0));
  const previousStats = resumeStats && typeof resumeStats === 'object'
    ? resumeStats
    : {};

  try {
    if (!targetFolderId) throw new Error('ID Folder tidak ditemukan.');
    if (safeJobId === '') throw new Error('ID proses penarikan tidak valid.');
    if (typeof Drive === 'undefined') {
      throw new Error('Layanan Drive API belum aktif.');
    }

    const registeredJob = readActiveExtractionJob_();
    if (
      registeredJob &&
      registeredJob.jobId !== safeJobId &&
      !isExtractionJobTerminal_(registeredJob.status)
    ) {
      const activeResponse = getActiveExtractionJob();
      return {
        status: 'running',
        running: true,
        message: 'Penarikan data yang sudah berjalan sedang dipantau kembali.',
        activeJob: activeResponse.active ? activeResponse.job : null
      };
    }

    let effectiveMode = 'sync';
    if (registeredJob && registeredJob.jobId === safeJobId) {
      const registeredFileId = String(registeredJob.fileId || '').trim();

      if (requestedFileId !== '' && registeredFileId !== requestedFileId) {
        throw new Error('Scope file pada proses penarikan tidak dapat diubah.');
      }

      effectiveFileId = registeredFileId;
      effectiveMode = String(registeredJob.extractionMode || '') === 'backfill'
        ? 'backfill'
        : 'sync';
    }

    if (!registeredJob || registeredJob.jobId !== safeJobId) {
      saveActiveExtractionJob_({
        jobId: safeJobId,
        folderId: String(targetFolderId),
        folderName: '',
        sourceMode: effectiveFileId ? 'file' : 'folder',
        extractionMode: effectiveMode,
        fileId: effectiveFileId,
        fileName: '',
        status: 'preparing',
        nextIndex: startIndex,
        resumeStats: compactExtractionStatsForPersistence_(previousStats),
        result: null,
        startedAt: new Date().toISOString()
      });
    }

    const folder = DriveApp.getFolderById(targetFolderId);
    const sourceFiles = selectExtractionSourceFiles_(folder, effectiveFileId);
    const selectedFile = effectiveFileId === '' ? null : sourceFiles[0];
    updateActiveExtractionJob_(safeJobId, {
      folderId: String(targetFolderId),
      folderName: folder.getName(),
      sourceMode: selectedFile ? 'file' : 'folder',
      fileId: selectedFile ? selectedFile.id : '',
      fileName: selectedFile ? selectedFile.name : '',
      status: 'running',
      nextIndex: startIndex,
      resumeStats: compactExtractionStatsForPersistence_(previousStats),
      result: null
    });

    updateExtractionProgress_(safeJobId, {
      status: 'preparing',
      percent: Number(previousStats.total) > 0
        ? Math.floor((startIndex / Number(previousStats.total)) * 100)
        : 0,
      processed: startIndex,
      total: Number(previousStats.total) || 0,
      created: Number(previousStats.created) || 0,
      updated: Number(previousStats.updated) || 0,
      skipped: Number(previousStats.skipped) || 0,
      errors: Number(previousStats.errors) || 0,
      pending: 0,
      currentFile: selectedFile ? selectedFile.name : '',
      message: startIndex > 0
        ? 'Melanjutkan sinkronisasi data...'
        : (
          selectedFile
            ? 'Menyiapkan file ' + selectedFile.name + '...'
            : 'Memindai file sumber...'
        )
    });

    const duplicateSourceSpks = findDuplicateSourceSpks_(sourceFiles);
    const dbSheet = getDbSheet_();

    if (!dbSheet) {
      throw new Error(databaseSheetNotFoundMessage_());
    }

    // Pastikan Database siap sampai kolom terakhir schema aktif.
    ensureDbColumnCapacity_(dbSheet);
    ensureReferenceColumnHeader_(dbSheet);

    const layoutBeforeSync = getDatabaseSpkLayout_(dbSheet);
    const repairedRowLayout = layoutBeforeSync.hasGaps;
    if (repairedRowLayout) {
      compactDatabaseSpkRowsIfNeeded_(dbSheet);
    }

    const existingSpkRowMap = buildExistingSpkIndex_(dbSheet).rowMap;
    const pendingRecordsBySpk = new Map();

    let countSuccess = Number(previousStats.success) || 0;
    let countCreated = Number(previousStats.created) || 0;
    let countUpdated = Number(previousStats.updated) || 0;
    let countSkipped = Number(previousStats.skipped) || 0;
    let countError = Number(previousStats.errors) || 0;
    let countWarning = Number(previousStats.warnings) || 0;
    let detailError = String(previousStats.detailError || '');
    let detailWarning = String(previousStats.detailWarning || '');
    const errorDetails = normalizeExtractionIssueList_(
      previousStats.errorDetails
    );
    const warningDetails = normalizeExtractionIssueList_(
      previousStats.warningDetails
    );
    let omittedErrorDetails = Math.max(
      0,
      Number(previousStats.omittedErrorDetails) || 0
    );
    let omittedWarningDetails = Math.max(
      0,
      Number(previousStats.omittedWarningDetails) || 0
    );
    let processedFiles = Math.min(startIndex, sourceFiles.length);

    const startTime = Date.now();

    updateExtractionProgress_(safeJobId, {
      status: 'running',
      percent: sourceFiles.length
        ? Math.min(99, Math.floor((processedFiles / sourceFiles.length) * 100))
        : 100,
      processed: processedFiles,
      total: sourceFiles.length,
      created: countCreated,
      updated: countUpdated,
      skipped: countSkipped,
      errors: countError,
      pending: 0,
      message: sourceFiles.length
        ? (
          startIndex > 0
            ? 'Melanjutkan dari file ' + (processedFiles + 1) + ' dari ' + sourceFiles.length + '.'
            : 'Siap menyinkronkan ' + sourceFiles.length + ' file.'
        )
        : 'Tidak ada file spreadsheet yang dapat diproses.'
    });

    let cancelledByUser = false;

    for (let fileIndex = processedFiles; fileIndex < sourceFiles.length; fileIndex++) {
      if (Date.now() - startTime > EXTRACTION_CHUNK_BUDGET_MS) break;
      if (isExtractionCancelRequested_(safeJobId)) {
        cancelledByUser = true;
        break;
      }

      const sourceFile = sourceFiles[fileIndex];
      const fileId = sourceFile.id;
      const mimeType = sourceFile.mimeType;
      const fileName = sourceFile.name;

      const isGoogleSheet = mimeType === MimeType.GOOGLE_SHEETS;
      const isExcel = !isGoogleSheet;

      let idToOpen = fileId;
      let needToDelete = false;

      updateExtractionProgress_(safeJobId, {
        status: 'running',
        percent: sourceFiles.length
          ? Math.min(99, Math.floor((processedFiles / sourceFiles.length) * 100))
          : 100,
        processed: processedFiles,
        total: sourceFiles.length,
        created: countCreated,
        updated: countUpdated,
        skipped: countSkipped,
        errors: countError,
        pending: pendingRecordsBySpk.size,
        currentFile: fileName,
        message: 'Membaca ' + fileName
      });

      try {
        resetExtractionSheetReadCache_();

        // Jalur cepat berdasarkan SPK pada nama file, sebelum membuka atau
        // mengonversi file sumber. Mode sinkron melewati SPK yang sudah ada;
        // mode lengkapi justru melewati SPK yang TIDAK ada di Database.
        if (sourceFile.spkHint) {
          const hintExists = existingSpkRowMap.has(sourceFile.spkHint);
          if (effectiveMode === 'backfill' ? !hintExists : hintExists) {
            countSkipped++;
            continue;
          }
        }

        if (sourceFile.spkHint && duplicateSourceSpks.has(sourceFile.spkHint)) {
          throw new Error(
            "Ada lebih dari satu file sumber untuk SPK '" +
            sourceFile.spkHint + "'. Sisakan satu file yang paling baru."
          );
        }

        if (isExcel) {
          const excelFile = DriveApp.getFileById(fileId);
          const blob = excelFile.getBlob();
          const fileMetadata = {
            name: fileName + ' _TEMP',
            mimeType: MimeType.GOOGLE_SHEETS
          };

          const tempFile = Drive.Files.create(fileMetadata, blob, {
            convert: true
          });

          idToOpen = tempFile.id;
          needToDelete = true;
        }

        const ss = SpreadsheetApp.openById(idToOpen);
        const allSheets = ss.getSheets();
        const sheetUtama = getMainSheet(allSheets);
        const snapshot = readMainSheetSnapshot_(sheetUtama);

        const spk = snapshot.spk;
        const tgl = snapshot.tanggal;

        if (!spk) {
          throw new Error('Nomor SPK pada F7 kosong.');
        }

        const spkStr = normalizeSourceSpk_(spk);
        if (spkStr === '') {
          throw new Error(
            "Format SPK pada F7 tidak valid. Gunakan format seperti 'G26.001'."
          );
        }

        // Jika nama file tidak memberikan petunjuk yang dapat dipakai,
        // F7 menjadi pemeriksaan kedua sebelum ekstraksi detail dilakukan.
        if (effectiveMode === 'backfill') {
          if (!existingSpkRowMap.has(spkStr)) {
            countSkipped++;
            continue;
          }
        } else if (existingSpkRowMap.has(spkStr) || pendingRecordsBySpk.has(spkStr)) {
          countSkipped++;
          continue;
        }

        if (sourceFile.spkHint && sourceFile.spkHint !== spkStr) {
          throw new Error(
            "SPK pada nama file ('" + sourceFile.spkHint +
            "') berbeda dengan F7 ('" + spkStr + "')."
          );
        }

        const spkSebelumnya = snapshot.spkSebelumnya === spkStr
          ? ''
          : snapshot.spkSebelumnya;

        let jenisOrder = '';
        const checkRepeat = snapshot.repeatChecked;
        const checkNew = snapshot.newChecked;

        if (isChecked(checkRepeat)) {
          jenisOrder = snapshot.repeatOrderType;
        } else if (isChecked(checkNew)) {
          jenisOrder = snapshot.newOrderType;
        }

        const marketing = snapshot.marketing;
        const po = snapshot.nomorPo;
        const artikel = snapshot.artikel;

        const rawCustomer = snapshot.customer;
        const customer = String(rawCustomer)
          .replace(/\b(PT\.?|CV\.?)\s*/gi, '')
          .trim();

        const rawFilm = snapshot.film;
        const film = String(rawFilm).replace(/[()]/g, '').trim();

        const valsK = snapshot.ukuranBlow;
        let dataK = valsK.join(' ').replace(/\s+/g, ' ').trim();

        if (dataK !== '') {
          dataK = dataK
            .replace(/:/g, '')
            .replace(/,/g, '.')
            .replace(/x/g, 'X')
            .replace(/^[\-\s]+/, '')
            .trim();
        }

        const valsL = snapshot.ukuranJadi;
        let dataL = valsL.join(' ').replace(/\s+/g, ' ').trim();

        if (dataL !== '') {
          dataL = dataL
            .replace(/:/g, '')
            .replace(/,/g, '.')
            .replace(/x/g, 'X')
            .replace(/^[\-\s]+/, '')
            .trim();
        }

        const matValues = snapshot.material;
        let material = '';
        const regexPlastik = /\b(HDPE|LLDPE|HD|OPP|CPP|PP|PE)\b/i;
        let fallbackText = '';

        for (let i = 0; i < matValues.length; i++) {
          const value = String(matValues[i]).trim();
          const isOnlySymbols = /^[^a-zA-Z0-9]+$/.test(value);
          const lowerValue = value.toLowerCase();
          const isLabel = (
            lowerValue === 'material' ||
            lowerValue === 'jenis material'
          );

          if (value !== '' && !isOnlySymbols && !isLabel) {
            if (regexPlastik.test(value)) {
              material = value;
              break;
            }

            if (fallbackText === '') fallbackText = value;
          }
        }

        if (material === '' && fallbackText !== '') material = fallbackText;

        const modelKantong = getCuttingFieldValue(
          allSheets,
          'MODEL KANTONG',
          7
        ) || '';

        const checklist = findProcessChecklist(sheetUtama);
        const mixerFinal = checklist.MIXER || checklist.BLOWING;
        const blowingFinal = checklist.MIXER || checklist.BLOWING;

        const mixerCheck = mixerFinal ? 'MIXER' : '-';
        const blowingCheck = blowingFinal ? 'BLOWING' : '-';
        const printingCheck = checklist.PRINTING ? 'PRINTING' : '-';
        const slittingCheck = checklist.SLITTING ? 'SLITTING' : '-';
        const foldingCheck = checklist.FOLDING ? 'FOLDING' : '-';
        const gussetCheck = checklist.GUSSET ? 'GUSSET' : '-';
        const cuttingChecked = checklist.CUTTING;

        let mesinRaw = '';

        if (cuttingChecked) {
          mesinRaw = getCuttingFieldValue(allSheets, 'MESIN', 7) || '';
        }

        const teksGabunganFinishing = (mesinRaw + ' ' + modelKantong).trim();
        const finishingType = detectFinishingType(teksGabunganFinishing);
        const kolomY = cuttingChecked
          ? (finishingType || mesinRaw || '-')
          : '-';

        const teksGabunganHandlePon = (modelKantong + ' ' + mesinRaw).trim();
        const kolomZ = detectHandleOrPon(teksGabunganHandlePon) || '-';

        // Mode lengkapi: hanya isi kolom baru (warna tinta, keterangan
        // artikel, keterangan divisi, kode item, keterangan warna) pada
        // baris SPK yang sudah ada, tanpa menyentuh kolom lain dan tanpa
        // menimpa isi yang sudah terisi.
        if (effectiveMode === 'backfill') {
          const inkUsage = checklist.PRINTING ? extractPrintingInkUsage_(allSheets) : [];
          const keteranganArtikel = extractKeteranganArtikel_(sheetUtama);
          const divisionNotes = extractDivisionNotes_(allSheets, finishingType);
          const kodeItem = extractKodeItem_(allSheets, sheetUtama);
          const keteranganWarna = extractKeteranganWarna_(sheetUtama);

          // Pembacaan di atas tidak menyentuh Database; hanya penulisannya
          // yang perlu dikunci. Nomor barisnya dicari ulang di dalam kunci,
          // sebab baris dapat bergeser bila ada penyimpanan SPK lain yang
          // sempat merapikan Database selagi file ini dibaca.
          const backfillChanged = withDatabaseLock_(function() {
            const barisSekarang = getDatabaseSpkRowMap_(dbSheet)[spkStr];
            if (!barisSekarang) return false;

            existingSpkRowMap.set(spkStr, barisSekarang);
            const changed = backfillExtractionRow_(
              dbSheet,
              barisSekarang,
              inkUsage,
              keteranganArtikel,
              divisionNotes,
              kodeItem,
              keteranganWarna
            );
            if (changed) {
              syncDatabaseV2RowsAfterLegacyWrite_(dbSheet, [barisSekarang], 'EXTRACTION_BACKFILL');
            }
            return changed;
          });

          if (backfillChanged) countUpdated++;
          else countSkipped++;
          countSuccess++;
          continue;
        }

        const bsData = getBSPercentValues(sheetUtama);
        const bsPercentValues = mapCuttingBS(
          bsData.values,
          kolomY,
          modelKantong,
          bsData.cuttingGeneric
        );

        const orderData = findOrderQtyUOM(sheetUtama);
        const jumlahOrder = orderData.qty;
        const uomOrder = orderData.uom;

        const toleransi = getToleransi(sheetUtama);
        const tanggalKirim = findTanggalKirim(sheetUtama);

        const keluarBahanData = findKeluarBahanUOM(sheetUtama);
        const jumlahKeluarBahan = keluarBahanData.qty;
        const uomKeluarBahan = keluarBahanData.uom;

        const komposisiData = getKomposisiBahanBaku(allSheets, sheetUtama);
        const komposisiColumns = buildKomposisiColumns(komposisiData.items);

        const warnaTinta = checklist.PRINTING
          ? extractPrintingInkUsage_(allSheets)
          : [];
        const keteranganArtikel = extractKeteranganArtikel_(sheetUtama);
        const kodeItem = extractKodeItem_(allSheets, sheetUtama);
        const keteranganWarna = extractKeteranganWarna_(sheetUtama);
        const processNotes = extractDivisionNotes_(allSheets, finishingType);

        if (komposisiData.overflow) {
          countWarning++;
          const warningReason =
            'Ditemukan ' + komposisiData.totalFound +
            ' bahan. Database AX-BS hanya menyimpan sampai Bahan 8.';

          if (detailWarning === '') {
            detailWarning = "File '" + fileName + "' => " + warningReason;
          }

          if (!appendExtractionIssue_(
            warningDetails,
            createExtractionIssue_(
              fileName,
              spkStr,
              warningReason,
              'Komposisi bahan'
            )
          )) {
            omittedWarningDetails++;
          }
        }

        pendingRecordsBySpk.set(spkStr, {
          spk: spkStr,
          spkSebelumnya: spkSebelumnya,
          core: [
            spkStr,
            tgl,
            jenisOrder,
            marketing,
            po,
            customer,
            material,
            film,
            artikel,
            modelKantong,
            dataK,
            dataL
          ],
          // T:AN. AO:AQ sengaja dilewati.
          production: [
            mixerCheck,
            blowingCheck,
            printingCheck,
            slittingCheck,
            foldingCheck,
            gussetCheck,
            kolomY,
            kolomZ,
            ...bsPercentValues,
            bsData.totalBS
          ],
          // AR:BS.
          orderComposition: [
            jumlahOrder,
            uomOrder,
            jumlahKeluarBahan,
            uomKeluarBahan,
            toleransi,
            tanggalKirim,
            ...komposisiColumns
          ],
          // BV:CO — warna & pemakaian tinta Printing.
          warnaColumns: buildWarnaColumns_(warnaTinta),
          // CR — keterangan artikel.
          keteranganArtikel: keteranganArtikel,
          // CS:DA — keterangan produk per divisi.
          processNotes: processNotes,
          // DR — kode item dari baris "Ket. Plastik".
          kodeItem: kodeItem,
          // EA — keterangan warna dari baris "WARNA" pada PO PRODUKSI.
          keteranganWarna: keteranganWarna
        });

        countSuccess++;

        if (pendingRecordsBySpk.size >= EXTRACTION_WRITE_BATCH_SIZE) {
          const flushResult = flushExtractionRecords_(
            dbSheet,
            Array.from(pendingRecordsBySpk.values()),
            existingSpkRowMap
          );

          countCreated += flushResult.created;
          countSkipped += flushResult.skipped;
          pendingRecordsBySpk.clear();
        }
      } catch (e) {
        countError++;
        const errorReason = e && e.message
          ? e.message
          : 'Penyebab tidak diketahui.';

        if (detailError === '') {
          detailError = "File '" + fileName + "' => " + errorReason;
        }

        if (!appendExtractionIssue_(
          errorDetails,
          createExtractionIssue_(
            fileName,
            sourceFile.spkHint,
            errorReason,
            classifyExtractionIssue_(errorReason)
          )
        )) {
          omittedErrorDetails++;
        }
      } finally {
        resetExtractionSheetReadCache_();

        if (needToDelete && idToOpen) {
          try {
            DriveApp.getFileById(idToOpen).setTrashed(true);
          } catch (cleanupError) {
            // Abaikan error cleanup agar proses file lain tetap berjalan.
          }
        }

        processedFiles++;
        updateExtractionProgress_(safeJobId, {
          status: 'running',
          percent: sourceFiles.length
            ? Math.min(99, Math.floor((processedFiles / sourceFiles.length) * 100))
            : 100,
          processed: processedFiles,
          total: sourceFiles.length,
          created: countCreated,
          updated: 0,
          skipped: countSkipped,
          errors: countError,
          pending: pendingRecordsBySpk.size,
          currentFile: fileName,
          message: 'Diproses ' + processedFiles + ' dari ' + sourceFiles.length + ' file.'
        });
      }
    }

    if (pendingRecordsBySpk.size > 0) {
      const finalFlushResult = flushExtractionRecords_(
        dbSheet,
        Array.from(pendingRecordsBySpk.values()),
        existingSpkRowMap
      );

      countCreated += finalFlushResult.created;
      countSkipped += finalFlushResult.skipped;
      pendingRecordsBySpk.clear();
    }

    if (countCreated > 0) {
      clearSpkExistenceCache_();
      clearDashboardCache_();
      clearKeluarBahanCache_();
    }

    const paused = !cancelledByUser && processedFiles < sourceFiles.length;

    if (countCreated > 0 && !paused) {
      sortDatabaseBySpk_(dbSheet);
      SpreadsheetApp.flush();
    }

    let statusType = 'success';
    if (countError > 0) statusType = 'warning';
    else if (countWarning > 0) statusType = 'warning';

    let message;
    if (effectiveMode === 'backfill') {
      message = countUpdated > 0
        ? (
          'Pelengkapan selesai: ' + countUpdated +
          ' SPK lama dilengkapi (warna tinta, keterangan artikel, keterangan divisi). ' +
          countSkipped + ' file dilewati karena tidak ada di Database atau datanya sudah terisi. ' +
          'Kolom lain dan hasil edit manual tidak disentuh.'
        )
        : (
          'Pelengkapan selesai: tidak ada SPK yang perlu dilengkapi. ' +
          countSkipped + ' file dilewati.'
        );
    } else {
      message = countCreated > 0
        ? (
          'Penarikan selesai: ' + countCreated + ' SPK baru ditambahkan dan ' +
          countSkipped + ' file dilewati karena SPK sudah ada. ' +
          'Database diurutkan dari SPK terkecil ke terbesar.'
        )
        : (
          'Penarikan selesai: tidak ada SPK baru. ' +
          countSkipped + ' file dilewati karena SPK sudah ada; data lama tidak diubah.'
        );
    }

    if (repairedRowLayout) {
      message += ' Baris kosong akibat rumus telah dirapikan.';
    }

    if (countWarning > 0) {
      message +=
        '\nPERINGATAN ' + countWarning +
        ' file memerlukan perhatian. Lihat rincian pada laporan.';
    }

    if (countError > 0) {
      message +=
        '\nGAGAL ' + countError +
        ' file tidak dapat diproses. Lihat penyebab per file pada laporan.';
    }

    if (cancelledByUser) {
      const ringkasanBatal = effectiveMode === 'backfill'
        ? countUpdated + ' SPK sempat dilengkapi'
        : countCreated + ' SPK baru sempat ditambahkan';
      message = 'Penarikan dibatalkan oleh pengguna. ' + ringkasanBatal +
        ' dan ' + countSkipped + ' file dilewati sebelum pembatalan. ' +
        'File yang belum diproses tidak diubah.';
    }

    if (paused) {
      message += '\n\nProses dilanjutkan otomatis pada batch berikutnya.';
    }

    const finalResumeStats = {
      success: countSuccess,
      created: countCreated,
      updated: countUpdated,
      skipped: countSkipped,
      errors: countError,
      warnings: countWarning,
      detailError: detailError,
      detailWarning: detailWarning,
      errorDetails: errorDetails,
      warningDetails: warningDetails,
      omittedErrorDetails: omittedErrorDetails,
      omittedWarningDetails: omittedWarningDetails,
      total: sourceFiles.length
    };
    const result = {
      status: statusType,
      message: message,
      created: countCreated,
      updated: countUpdated,
      skipped: countSkipped,
      errors: countError,
      warnings: countWarning,
      processed: processedFiles,
      total: sourceFiles.length,
      paused: paused,
      nextIndex: processedFiles,
      resumeStats: paused ? finalResumeStats : null,
      report: paused
        ? null
        : {
          errors: errorDetails,
          warnings: warningDetails,
          omittedErrors: omittedErrorDetails,
          omittedWarnings: omittedWarningDetails
        }
    };

    updateExtractionProgress_(safeJobId, {
      status: cancelledByUser ? 'cancelled' : (paused ? 'paused' : 'done'),
      percent: (paused || cancelledByUser) && sourceFiles.length
        ? Math.floor((processedFiles / sourceFiles.length) * 100)
        : 100,
      processed: processedFiles,
      total: sourceFiles.length,
      created: countCreated,
      updated: countUpdated,
      skipped: countSkipped,
      errors: countError,
      pending: 0,
      message: cancelledByUser
        ? 'Penarikan dibatalkan pada ' + processedFiles + ' dari ' + sourceFiles.length + ' file.'
        : paused
          ? 'Proses dijeda pada ' + processedFiles + ' dari ' + sourceFiles.length + ' file.'
          : (
            countCreated > 0
              ? 'SPK baru berhasil ditambahkan dan Database sudah diurutkan.'
              : 'Tidak ada SPK baru; data yang sudah ada dilewati tanpa perubahan.'
          ),
      nextIndex: processedFiles,
      resumeStats: paused ? finalResumeStats : null,
      result: paused ? null : result
    });

    updateActiveExtractionJob_(safeJobId, {
      status: cancelledByUser ? 'cancelled' : (paused ? 'paused' : 'done'),
      nextIndex: processedFiles,
      resumeStats: paused
        ? compactExtractionStatsForPersistence_(finalResumeStats)
        : null,
      result: paused
        ? null
        : compactExtractionResultForPersistence_(result)
    });

    return result;
  } catch (error) {
    const errorResult = {
      status: 'error',
      message: error.message
    };

    updateExtractionProgress_(safeJobId, {
      status: 'error',
      percent: 0,
      message: error.message,
      result: errorResult
    });

    updateActiveExtractionJob_(safeJobId, {
      status: 'error',
      result: errorResult
    });

    return errorResult;
  }
}
