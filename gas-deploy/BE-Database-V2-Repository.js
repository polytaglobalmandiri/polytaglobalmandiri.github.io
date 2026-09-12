// Akses native V2: nama field dan ID bisnis, tanpa DB_COL atau tabel runtime.
// Fungsi privat (_) tidak dapat dipanggil langsung dari google.script.run.
function openDatabaseV2Table_(tableKey, spreadsheet) {
  const schema = DB_V2_SCHEMA[tableKey];
  if (!schema) throw new Error('Tabel V2 tidak dikenal: ' + tableKey);
  const book = spreadsheet || SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const sheet = book.getSheetByName(schema.sheet);
  if (!sheet) throw new Error('Tabel V2 tidak tersedia: ' + schema.sheet);
  const header = findDatabaseV2Header_(sheet, schema.fields);
  if (!header.row || header.duplicates.length) {
    throw new Error('Header V2 tidak valid: ' + schema.sheet);
  }
  const columns = Object.create(null);
  schema.fields.forEach(function(aliases) {
    const column = findDatabaseV2HeaderIndex_(header.index, aliases);
    if (!column) throw new Error('Field V2 tidak tersedia: ' + schema.sheet + '.' + aliases[0]);
    columns[aliases[0]] = column;
  });
  return { sheet: sheet, schema: schema, headerRow: header.row, columns: columns };
}

function readDatabaseV2Table_(tableKey, spreadsheet) {
  const table = openDatabaseV2Table_(tableKey, spreadsheet);
  const count = table.sheet.getLastRow() - table.headerRow;
  const records = [];
  const keys = Object.create(null);
  if (count > 0) {
    const rows = table.sheet.getRange(table.headerRow + 1, 1, count, table.sheet.getLastColumn()).getValues();
    rows.forEach(function(values, offset) {
      if (values.every(function(value) { return value === '' || value == null; })) return;
      const record = Object.create(null);
      Object.keys(table.columns).forEach(function(field) {
        record[field] = values[table.columns[field] - 1];
      });
      const key = normalizeDatabaseV2Key_(record[table.schema.key]);
      if (!key || Object.prototype.hasOwnProperty.call(keys, key)) {
        throw new Error('ID V2 kosong atau duplikat: ' + table.schema.sheet + ' baris ' + (table.headerRow + 1 + offset));
      }
      keys[key] = { record: record, row: table.headerRow + 1 + offset };
      records.push(record);
    });
  }
  return { table: table, records: records, byKey: keys };
}

function readDatabaseV2Spk_(spk, spreadsheet) {
  const key = normalizeDatabaseV2Key_(spk);
  if (!key) throw new Error('Nomor SPK wajib diisi.');
  const book = spreadsheet || SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const masterRows = readDatabaseV2RecordsForSpk_('master', key, book);
  if (!masterRows.length) return null;
  if (masterRows.length > 1) throw new Error('SPK Master duplikat: ' + key);
  const result = { master: masterRows[0] };
  Object.keys(DB_V2_SCHEMA).filter(function(name) { return name !== 'master'; }).forEach(function(name) {
    result[name] = readDatabaseV2RecordsForSpk_(name, key, book).sort(function(left, right) {
      return (Number(left.Urutan) || 0) - (Number(right.Urutan) || 0);
    });
  });
  return result;
}

function readDatabaseV2RecordsForSpk_(tableKey, spk, spreadsheet) {
  const table = openDatabaseV2Table_(tableKey, spreadsheet);
  const key = normalizeDatabaseV2Key_(spk);
  const spkColumn = table.columns.SPK;
  const rowCount = Math.max(0, table.sheet.getLastRow() - table.headerRow);
  if (!rowCount) return [];

  // Try to get row numbers from per-table row map cache first
  const MAP_CACHE_PREFIX = 'pgm:spk:rowmap:';
  let rowNumbers = null;
  if (typeof CacheService !== 'undefined') {
    try {
      const cache = CacheService.getScriptCache();
      const serializedMap = cache.get(MAP_CACHE_PREFIX + tableKey);
      const rowMap = serializedMap ? JSON.parse(serializedMap) : null;
      if (rowMap && rowMap[key]) {
        rowNumbers = rowMap[key];
      }
    } catch (e) {}
  }

  if (!rowNumbers) {
    // Cache each SPK's row numbers separately to avoid large map serialization
    const CACHE_PREFIX = 'pgm:spk:rows:';
    if (typeof CacheService !== 'undefined') {
      try {
        const cache = CacheService.getScriptCache();
        const serialized = cache.get(CACHE_PREFIX + tableKey + ':' + key);
        rowNumbers = serialized ? JSON.parse(serialized) : null;
      } catch (e) {
        rowNumbers = null;
      }
    }

    if (!rowNumbers) {
      // Fallback: use TextFinder then cache the result
      const matches = table.sheet
        .getRange(table.headerRow + 1, spkColumn, rowCount, 1)
        .createTextFinder(key)
        .matchEntireCell(true)
        .matchCase(false)
        .useRegularExpression(false)
        .findAll();
      if (!matches || !matches.length) {
        rowNumbers = [];
      } else {
        rowNumbers = matches.map(function (cell) { return cell.getRow(); }).sort(function (a, b) { return a - b; });
      }
      // Store per-SPK cache
      if (typeof CacheService !== 'undefined') {
        try {
          const cache = CacheService.getScriptCache();
          const serialized = JSON.stringify(rowNumbers);
          if (serialized.length < 95000) {
            cache.put(CACHE_PREFIX + tableKey + ':' + key, serialized, 21600);
          }
        } catch (e) {}
      }
      // Update per-table row map cache
      if (typeof CacheService !== 'undefined') {
        try {
          const cache = CacheService.getScriptCache();
          // Merge into existing map or create new
          const newMap = rowMap || {};
          newMap[key] = rowNumbers;
          const mapSerialized = JSON.stringify(newMap);
          if (mapSerialized.length < 95000) {
            cache.put(MAP_CACHE_PREFIX + tableKey, mapSerialized, 21600);
          }
        } catch (e) {}
      }
    }
  }
    // Fallback: use TextFinder then cache the result
    const matches = table.sheet
      .getRange(table.headerRow + 1, spkColumn, rowCount, 1)
      .createTextFinder(key)
      .matchEntireCell(true)
      .matchCase(false)
      .useRegularExpression(false)
      .findAll();
    if (!matches || !matches.length) {
      rowNumbers = [];
    } else {
      rowNumbers = matches.map(function (cell) { return cell.getRow(); }).sort(function (a, b) { return a - b; });
    }
    if (typeof CacheService !== 'undefined') {
      try {
        const cache = CacheService.getScriptCache();
        const serialized = JSON.stringify(rowNumbers);
        if (serialized.length < 95000) {
          cache.put(CACHE_PREFIX + tableKey + ':' + key, serialized, 21600);
        }
      } catch (e) {}
    }
  }

  if (!rowNumbers || !rowNumbers.length) return [];

  const lastColumn = table.sheet.getLastColumn();
  const ranges = [];
  let currentStart = rowNumbers[0];
  let currentLength = 1;

  for (let i = 1; i < rowNumbers.length; i++) {
    if (rowNumbers[i] === currentStart + currentLength) {
      currentLength++;
    } else {
      ranges.push({ start: currentStart, length: currentLength });
      currentStart = rowNumbers[i];
      currentLength = 1;
    }
  }
  ranges.push({ start: currentStart, length: currentLength });

  const records = [];
  ranges.forEach(function (range) {
    const chunkValues = table.sheet.getRange(range.start, 1, range.length, lastColumn).getValues();
    chunkValues.forEach(function (values) {
      const record = Object.create(null);
      Object.keys(table.columns).forEach(function (field) {
        record[field] = values[table.columns[field] - 1];
      });
      records.push(record);
    });
  });
  return records;
}


function getDatabaseV2SpkDirectory_() {
  const master = openDatabaseV2Table_('master');
  const count = Math.max(0, master.sheet.getLastRow() - master.headerRow);
  const spkValues = count
    ? master.sheet.getRange(master.headerRow + 1, master.columns.SPK, count, 1).getDisplayValues()
    : [];
  const marketingValues = count
    ? master.sheet.getRange(master.headerRow + 1, master.columns.Marketing, count, 1).getDisplayValues()
    : [];
  const spks = [];
  const seen = Object.create(null);
  const marketing = [];
  const seenMarketing = Object.create(null);
  spkValues.forEach(function(row, index) {
    const spk = normalizeDatabaseV2Key_(row[0]);
    if (!spk) return;
    if (seen[spk]) throw new Error('SPK Master duplikat: ' + spk);
    seen[spk] = true;
    spks.push(spk);
    const value = String(marketingValues[index][0] || '').trim().replace(/\s+/g, ' ');
    const marketingKey = value.toUpperCase();
    if (value && value !== '-' && !seenMarketing[marketingKey]) {
      seenMarketing[marketingKey] = true;
      marketing.push(value);
    }
  });
  return {
    spks: spks,
    marketingOptions: marketing.sort(function(left, right) {
      return left.toUpperCase().localeCompare(right.toUpperCase());
    }),
    source: 'SPK Master'
  };
}

function commitDatabaseV2Candidates_(candidates, managedSpks, reason, options) {
  const settings = options && typeof options === 'object' ? options : {};
  const buckets = candidates && typeof candidates === 'object' ? candidates : {};
  const spks = uniqueDatabaseV2Values_((managedSpks || []).map(normalizeDatabaseV2Key_).filter(Boolean));
  if (!spks.length) throw new Error('Commit native V2 membutuhkan minimal satu SPK.');
  Object.keys(DB_V2_SCHEMA).forEach(function(name) {
    if (!Array.isArray(buckets[name])) throw new Error('Bucket V2 tidak lengkap: ' + name);
  });
  const candidateSpks = [];
  Object.keys(DB_V2_SCHEMA).forEach(function(name) {
    buckets[name].forEach(function(record) {
      const recordSpk = normalizeDatabaseV2Key_(record && record.SPK);
      if (!recordSpk || spks.indexOf(recordSpk) === -1) {
        throw new Error('Kandidat ' + name + ' berada di luar transaksi SPK.');
      }
      candidateSpks.push(recordSpk);
    });
  });
  spks.forEach(function(spk) {
    if (candidateSpks.indexOf(spk) === -1) throw new Error('Transaksi tidak mempunyai kandidat untuk SPK ' + spk + '.');
  });

  const lock = LockService.getScriptLock();
  const ownsLock = !settings.lockHeld;
  if (ownsLock && !lock.tryLock(45000)) throw new Error('Database V2 sedang dipakai transaksi lain.');
  if (!ownsLock && !lock.hasLock()) throw new Error('Commit internal V2 membutuhkan lock aktif.');
  const transactionId = Utilities.getUuid();
  try {
    const spreadsheet = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
    const plans = Object.keys(DB_V2_SCHEMA).map(function(name) {
      return planDatabaseV2NativeWriteTarget_(spreadsheet, name, DB_V2_SCHEMA[name], buckets[name], spks);
    });
    const conflicts = plans.reduce(function(all, plan) {
      return all.concat(plan.conflicts.map(function(item) { return plan.sheet + ': ' + item; }));
    }, []);
    if (settings.createOnly && plans[0].inserts.length !== spks.length) {
      conflicts.push('SPK sudah dibuat transaksi lain; mode create-only membatalkan penimpaan.');
    }
    if (conflicts.length) throw new Error('Konflik commit native V2: ' + conflicts.join(' | '));
    plans.forEach(applyDatabaseV2NativeWritePlan_);
    SpreadsheetApp.flush();
    const result = {
      status: 'COMMITTED',
      transactionId: transactionId,
      reason: String(reason || 'NATIVE_WRITE'),
      spks: spks,
      warnings: [],
      targets: plans.map(function(plan) {
        return {
          sheet: plan.sheet,
          inserts: plan.inserts.length,
          updates: plan.updates.length,
          deletes: plan.deletes.length,
          unchanged: plan.unchanged,
          verifiedWrites: plan.verifiedWrites || 0
        };
      }),
      completedAt: new Date().toISOString()
    };
    appendDatabaseV2WriteAudit_(result, 'NATIVE_COMMITTED');
    return result;
  } catch (error) {
    appendDatabaseV2WriteAudit_({
      transactionId: transactionId,
      reason: String(reason || 'NATIVE_WRITE'),
      spks: spks,
      targets: [],
      warnings: [error && error.message ? error.message : String(error)],
      error: error && error.message ? error.message : String(error)
    }, 'NATIVE_RETRY_REQUIRED');
    throw error;
  } finally {
    if (ownsLock && lock.hasLock()) lock.releaseLock();
  }
}

function databaseV2AggregateToCandidates_(aggregate) {
  return {
    master: [aggregate.master],
    routing: aggregate.routing.slice(),
    material: aggregate.material.slice(),
    color: aggregate.color.slice(),
    delivery: aggregate.delivery.slice(),
    eta: aggregate.eta.slice(),
    accessory: aggregate.accessory.slice(),
    tracking: aggregate.tracking.slice()
  };
}

function buildDatabaseV2InputData_(aggregate) {
  const master = aggregate.master;
  const proses = {};
  PROSES_KEYS.forEach(function(key) { proses[key] = false; });
  const notes = {};
  const bsPercent = {};
  BS_KEYS.forEach(function(key) { bsPercent[key] = ''; });
  const details = {};
  ROUTING_DETAIL_COLUMNS.forEach(function(item) { details[item.key] = ''; });
  const accessoriesByRouting = {};
  aggregate.accessory.forEach(function(item) {
    const routingId = normalizeDatabaseV2Key_(item['Routing ID']);
    if (!accessoriesByRouting[routingId]) accessoriesByRouting[routingId] = [];
    accessoriesByRouting[routingId].push({
      nama: valueOrEmpty_(item['Nama Aksesoris']),
      kebutuhan: numberOrEmptyForClient_(item.Kebutuhan),
      uom: valueOrEmpty_(item.UOM)
    });
  });
  const routingSteps = aggregate.routing.map(function(routing) {
    const key = String(routing['Kode Proses'] || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(proses, key)) proses[key] = true;
    let payload = {};
    try { payload = JSON.parse(String(routing['Payload JSON'] || '{}')); } catch (error) {}
    const values = payload && payload.values && typeof payload.values === 'object'
      ? Object.assign({}, payload.values)
      : {};
    if (routing.Mesin && !values.mesin) values.mesin = routing.Mesin;
    const processNotes = values.processNotes && typeof values.processNotes === 'object'
      ? values.processNotes
      : {};
    Object.keys(processNotes).forEach(function(noteKey) {
      if (!notes[noteKey]) notes[noteKey] = processNotes[noteKey];
    });
    if (routing.Keterangan && !notes[key]) notes[key] = routing.Keterangan;
    const targetBs = values.targetBs && typeof values.targetBs === 'object' ? values.targetBs : {};
    Object.keys(targetBs).forEach(function(bsKey) { bsPercent[bsKey] = percentToInput_(targetBs[bsKey]); });
    if (!Object.keys(targetBs).length && BS_KEYS.indexOf(key) > -1) {
      bsPercent[key] = percentToInput_(routing['Target BS %']);
    }
    ROUTING_DETAIL_COLUMNS.forEach(function(item) {
      if (!details[item.key] && values[item.key] != null) details[item.key] = values[item.key];
    });
    const accessories = accessoriesByRouting[normalizeDatabaseV2Key_(routing['Routing ID'])] || [];
    if (accessories.length) values['aksesorisData-' + key] = JSON.stringify(accessories);
    delete values.processNotes;
    return { key: key, values: values };
  }).filter(function(step) { return step.key; });
  const processNotes = PROCESS_NOTE_KEYS.reduce(function(result, key) {
    result[key] = notes[key] || '';
    return result;
  }, {});
  const partialDeliveries = aggregate.delivery.filter(function(item) {
    return String(item.Status || '').toUpperCase().indexOf('PARSIAL') > -1;
  }).map(function(item) {
    return {
      tanggal: dateToInput_(item['Tanggal Kirim']),
      jumlah: numberOrEmptyForClient_(item.Qty),
      uom: valueOrEmpty_(item.UOM),
      mode: 'PARSIAL'
    };
  });
  return Object.assign(details, {
    spk: normalizeDatabaseV2Key_(master.SPK),
    tanggal: dateToInput_(master.Tanggal),
    jenisOrder: valueOrEmpty_(master['Jenis Order']),
    marketing: valueOrEmpty_(master.Marketing),
    nomorPO: valueOrEmpty_(master['Nomor PO']),
    customer: valueOrEmpty_(master.Customer),
    material: valueOrEmpty_(master.Material),
    film: valueOrEmpty_(master.Film),
    artikel: valueOrEmpty_(master.Artikel),
    kodeItem: valueOrEmpty_(master['Kode Item']),
    keteranganArtikel: valueOrEmpty_(master['Keterangan Artikel']),
    keteranganWarna: valueOrEmpty_(master['Keterangan Warna']),
    keteranganBahan: valueOrEmpty_(master['Keterangan Bahan']),
    modelKantong: valueOrEmpty_(master['Model Kantong']),
    ukuranBlow: valueOrEmpty_(master['Ukuran Blow']),
    ukuranJadi: valueOrEmpty_(master['Ukuran Jadi']),
    routingSteps: routingSteps,
    proses: proses,
    keteranganProses: processNotes,
    finishing: enumForClient_(master.Finishing, FINISHING_OPTIONS, '-'),
    handlePm: enumForClient_(master['Handle/Pon'], HANDLE_PON_OPTIONS, '-'),
    bsPercent: bsPercent,
    jumlahOrder: numberOrEmptyForClient_(master['Jumlah Order']),
    uomOrder: enumForClient_(master['UOM Order'], ['PCS', 'KG', 'ROLL'], 'PCS'),
    keluarBahan: numberOrEmptyForClient_(master['Keluar Bahan']),
    uomKB: enumForClient_(master['UOM KB'], ['KG', 'ROLL'], ''),
    meterRoll: numberOrEmptyForClient_(master['Meter/Roll']),
    toleransi: percentToInput_(master['Toleransi Order']),
    etd: dateToInput_(master.ETD),
    komposisi: aggregate.material.map(function(item) {
      return {
        material: valueOrEmpty_(item['Nama Bahan']),
        kg: numberOrEmptyForClient_(item.KG),
        percent: percentToInput_(item.Persentase)
      };
    }),
    warna: aggregate.color.map(function(item) {
      return { nama: valueOrEmpty_(item['Nama Warna']), pemakaian: numberOrEmptyForClient_(item.Pemakaian) };
    }),
    spkReferensi: valueOrEmpty_(master['SPK Referensi']),
    pcsKgMode: valueOrEmpty_(master['Mode PCS/KG']),
    jenisPotongan: valueOrEmpty_(master['Jenis Potongan']),
    poMasuk: dateToInput_(master['Tanggal PO Masuk']),
    stok: numberOrEmptyForClient_(master.Stok),
    ots: numberOrEmptyForClient_(master.OTS),
    wip: numberOrEmptyForClient_(master.WIP),
    toleransiProduksi: percentToInput_(master['Toleransi Produksi']),
    pengirimanParsial: partialDeliveries,
    bahanLebar: numberOrEmptyForClient_(master['Bahan Lebar']),
    bahanPanjang: numberOrEmptyForClient_(master['Bahan Panjang']),
    bahanTebal: numberOrEmptyForClient_(master['Bahan Tebal']),
    bahanDensity: numberOrEmptyForClient_(master['Bahan Density'])
  });
}

function mutateDatabaseV2Spk_(spk, reason, mutator) {
  const key = normalizeDatabaseV2Key_(spk);
  if (!key) throw new Error('Nomor SPK wajib diisi.');
  if (typeof mutator !== 'function') throw new Error('Mutator native V2 wajib berupa fungsi.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(45000)) throw new Error('Database V2 sedang dipakai transaksi lain.');
  try {
    const aggregate = readDatabaseV2Spk_(key);
    if (!aggregate) return { status: 'NOT_FOUND', spk: key, changed: false };
    const changed = mutator(aggregate) === true;
    if (!changed) return { status: 'UNCHANGED', spk: key, changed: false };
    const result = commitDatabaseV2Candidates_(
      databaseV2AggregateToCandidates_(aggregate),
      [key],
      reason,
      { lockHeld: true }
    );
    result.changed = true;
    return result;
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// Validasi referensi native, tidak menganggap runtime sebagai sumber kebenaran.
function validateDatabaseV2Native_() {
  const book = SpreadsheetApp.openById(DB_SPREADSHEET_ID);
  const master = readDatabaseV2Table_('master', book);
  const errors = [];
  const counts = { master: master.records.length };
  const tables = { master: master };
  if (!master.records.length) errors.push({ table: 'master', reason: 'EMPTY_MASTER' });
  Object.keys(DB_V2_SCHEMA).filter(function(name) { return name !== 'master'; }).forEach(function(name) {
    const table = readDatabaseV2Table_(name, book);
    tables[name] = table;
    counts[name] = table.records.length;
    table.records.forEach(function(record) {
      if (!Object.prototype.hasOwnProperty.call(master.byKey, normalizeDatabaseV2Key_(record.SPK))) {
        errors.push({ table: name, id: record[table.table.schema.key], reason: 'ORPHAN_SPK' });
      }
    });
  });
  ['accessory', 'tracking'].forEach(function(name) {
    tables[name].records.forEach(function(record) {
      const routingId = normalizeDatabaseV2Key_(record['Routing ID']);
      if (!routingId) return;
      const routing = tables.routing.byKey[routingId];
      if (!routing || normalizeDatabaseV2Key_(routing.record.SPK) !== normalizeDatabaseV2Key_(record.SPK)) {
        errors.push({ table: name, id: record[tables[name].table.schema.key], reason: 'INVALID_ROUTING_REFERENCE' });
      }
    });
  });
  return { passed: errors.length === 0, counts: counts, errors: errors, source: 'SPK Master' };
}

function adminValidateDatabaseV2Native() {
  const result = validateDatabaseV2Native_();
  console.log(JSON.stringify(result, null, 2));
  return result;
}
