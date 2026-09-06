// ==========================================
// DATABASE SPK V2 - PEMETAAN RECORD NATIVE
// ==========================================
// Mengubah payload Input SPK dan Penarikan Data menjadi record tabel V2.

// Semua record baru berasal dari alur aplikasi native V2.
const DB_V2_NATIVE_RECORD_SOURCE = 'APLIKASI NATIVE V2';

// Setiap bucket berkorespondensi langsung dengan satu tabel V2.
function createDatabaseV2CandidateBuckets_() {
  return {
    master: [],
    routing: [],
    material: [],
    color: [],
    delivery: [],
    eta: [],
    accessory: [],
    tracking: []
  };
}

function buildDatabaseV2CandidatesForRow_(row, rowNumber, spk, candidates, warnings) {
  candidates.master.push(buildDatabaseV2MasterCandidate_(row, spk));

  const routingSteps = getDatabaseV2RoutingSteps_(row);
  routingSteps.forEach(function(step, stepIndex) {
    candidates.routing.push(buildDatabaseV2RoutingCandidate_(row, spk, step, stepIndex));
  });

  getDatabaseV2MaterialItems_(row).forEach(function(item, index) {
    candidates.material.push({
      'Bahan ID': databaseV2DetailId_(spk, 'B', index + 1),
      'SPK': spk,
      'Urutan': index + 1,
      'Kode Bahan': '',
      'Nama Bahan': item.material,
      'KG': item.kg,
      'Persentase': databaseV2PercentFraction_(item.percent),
      'Jenis': 'KOMPOSISI',
      'Sumber': DB_V2_NATIVE_RECORD_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  getWarnaFromRow_(row).filter(function(item) {
    return item.nama !== '' || item.pemakaian !== '';
  }).forEach(function(item, index) {
    candidates.color.push({
      'Warna ID': databaseV2DetailId_(spk, 'W', index + 1),
      'SPK': spk,
      'Urutan': index + 1,
      'Nama Warna': item.nama,
      'Pemakaian': item.pemakaian,
      'UOM': '',
      'Kode Silinder': valueOrEmpty_(row[DB_COL.PRINTING_KODE_SILINDER - 1]),
      'Sumber': DB_V2_NATIVE_RECORD_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  const partialDeliveries = parsePengirimanParsialCell_(row[DB_COL.PENGIRIMAN_PARSIAL - 1]);
  const deliveries = partialDeliveries.length ? partialDeliveries : getDatabaseV2MainDelivery_(row);
  deliveries.forEach(function(item, index) {
    candidates.delivery.push({
      'Pengiriman ID': databaseV2DetailId_(spk, 'P', index + 1),
      'SPK': spk,
      'Urutan': index + 1,
      'Tanggal Kirim': databaseV2DateInput_(item.tanggal),
      'Qty': item.jumlah,
      'UOM': item.uom,
      'Status': item.mode === 'FULL' ? 'RENCANA PENUH' : 'RENCANA PARSIAL',
      'Keterangan': '',
      'Sumber': DB_V2_NATIVE_RECORD_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  const etaNote = valueOrEmpty_(row[DB_COL.ETA_BELI_KETERANGAN - 1]);
  getEtaBeliBahanFromRow_(row).filter(function(item) {
    return item.eta !== '' || item.qty !== '' || item.uom !== '';
  }).forEach(function(item, index) {
    candidates.eta.push({
      'ETA ID': databaseV2DetailId_(spk, 'E', item.index || index + 1),
      'SPK': spk,
      'Urutan': item.index || index + 1,
      'Tanggal ETA': databaseV2DateInput_(item.eta),
      'Qty': item.qty,
      'UOM': item.uom,
      'Status': 'RENCANA',
      'Keterangan': etaNote,
      'Sumber': DB_V2_NATIVE_RECORD_SOURCE,
      'Dibuat': '',
      'Diperbarui': ''
    });
  });

  routingSteps.forEach(function(step, stepIndex) {
    const values = step.values && typeof step.values === 'object' ? step.values : {};
    const accessories = parseRoutingAccessoryEntries_(values['aksesorisData-' + step.key]);
    accessories.forEach(function(item, accessoryIndex) {
      candidates.accessory.push({
        'Aksesoris ID': databaseV2NestedDetailId_(spk, 'A', stepIndex + 1, accessoryIndex + 1),
        'SPK': spk,
        'Routing ID': databaseV2DetailId_(spk, 'R', stepIndex + 1),
        'Urutan': accessoryIndex + 1,
        'Nama Aksesoris': item.nama,
        'Kebutuhan': item.kebutuhan,
        'UOM': item.uom,
        'Status': 'AKTIF',
        'Sumber': DB_V2_NATIVE_RECORD_SOURCE,
        'Dibuat': '',
        'Diperbarui': ''
      });
    });
  });

  if (!routingSteps.length) warnings.push('SPK ' + spk + ' tidak mempunyai routing yang dapat dipetakan.');
}

function buildDatabaseV2MasterCandidate_(row, spk) {
  return {
    'SPK': spk,
    'Tanggal': databaseV2DateInput_(row[DB_COL.TANGGAL - 1]),
    'Jenis Order': valueOrEmpty_(row[DB_COL.JENIS_ORDER - 1]),
    'Marketing': valueOrEmpty_(row[DB_COL.MARKETING - 1]),
    'Nomor PO': valueOrEmpty_(row[DB_COL.NOMOR_PO - 1]),
    'Customer': valueOrEmpty_(row[DB_COL.CUSTOMER - 1]),
    'Artikel': valueOrEmpty_(row[DB_COL.ARTIKEL - 1]),
    'Kode Item': valueOrEmpty_(row[DB_COL.KODE_ITEM - 1]),
    'Material': valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
    'Film': valueOrEmpty_(row[DB_COL.FILM - 1]),
    'Model Kantong': valueOrEmpty_(row[DB_COL.MODEL_KANTONG - 1]),
    'Ukuran Blow': valueOrEmpty_(row[DB_COL.UKURAN_BLOW - 1]),
    'Ukuran Jadi': valueOrEmpty_(row[DB_COL.UKURAN_JADI - 1]),
    'Jumlah Order': numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
    'UOM Order': valueOrEmpty_(row[DB_COL.UOM_ORDER - 1]),
    'Keluar Bahan': numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
    'UOM KB': valueOrEmpty_(row[DB_COL.UOM_KB - 1]),
    'Toleransi Order': databaseV2PercentFraction_(percentToInput_(row[DB_COL.TOLERANSI - 1])),
    'ETD': databaseV2DateInput_(row[DB_COL.ETD - 1]),
    'SPK Referensi': valueOrEmpty_(row[DB_COL.SPK_REFERENSI - 1]),
    'Release': valueOrEmpty_(row[DB_COL.RELEASE - 1]),
    'Tracking': '',
    'Keterangan Artikel': valueOrEmpty_(row[DB_COL.KETERANGAN_ARTIKEL - 1]),
    'Keterangan Warna': valueOrEmpty_(row[DB_COL.KETERANGAN_WARNA - 1]),
    'Keterangan Bahan': valueOrEmpty_(row[DB_COL.KETERANGAN_BAHAN - 1]),
    'Meter/Roll': numberOrEmptyForClient_(row[DB_COL.METER_ROLL - 1]),
    'Mode PCS/KG': valueOrEmpty_(row[DB_COL.PCS_KG_MODE - 1]),
    'Jenis Potongan': valueOrEmpty_(row[DB_COL.JENIS_POTONGAN - 1]),
    'Tanggal PO Masuk': databaseV2DateInput_(row[DB_COL.PO_MASUK - 1]),
    'Stok': numberOrEmptyForClient_(row[DB_COL.STOK - 1]),
    'OTS': numberOrEmptyForClient_(row[DB_COL.OTS - 1]),
    'WIP': numberOrEmptyForClient_(row[DB_COL.WIP - 1]),
    'Toleransi Produksi': databaseV2PercentFraction_(
      percentToInput_(row[DB_COL.TOLERANSI_PRODUKSI - 1])
    ),
    'Lebar Jadi': numberOrEmptyForClient_(row[DB_COL.LEBAR_JADI - 1]),
    'Panjang Jadi': numberOrEmptyForClient_(row[DB_COL.PANJANG_JADI - 1]),
    'Tebal': numberOrEmptyForClient_(row[DB_COL.TEBAL - 1]),
    'Lebar Bahan': numberOrEmptyForClient_(row[DB_COL.LEBAR_BAHAN - 1]),
    'Density': numberOrEmptyForClient_(row[DB_COL.DENSITY - 1]),
    'PCS/KG': numberOrEmptyForClient_(row[DB_COL.PCS_PER_KG - 1]),
    'Meter/KG': numberOrEmptyForClient_(row[DB_COL.METER_PER_KG - 1]),
    'Total BS': databaseV2PercentFraction_(percentToInput_(row[DB_COL.TOTAL_BS - 1])),
    'Total Komposisi KG': numberOrEmptyForClient_(row[DB_COL.TOTAL_KOMPOSISI_KG - 1]),
    'Total Komposisi %': databaseV2PercentFraction_(
      percentToInput_(row[DB_COL.TOTAL_KOMPOSISI_PERCENT - 1])
    ),
    'Bahan Lebar': numberOrEmptyForClient_(row[DB_COL.BAHAN_LEBAR - 1]),
    'Bahan Panjang': numberOrEmptyForClient_(row[DB_COL.BAHAN_PANJANG - 1]),
    'Bahan Tebal': numberOrEmptyForClient_(row[DB_COL.BAHAN_TEBAL - 1]),
    'Bahan Density': numberOrEmptyForClient_(row[DB_COL.BAHAN_DENSITY - 1]),
    'Finishing': valueOrEmpty_(row[DB_COL.FINISHING - 1]),
    'Handle/Pon': valueOrEmpty_(row[DB_COL.HANDLE_PON - 1])
  };
}

function databaseV2DateInput_(value) {
  let normalized = '';
  if (typeof value === 'number' && isFinite(value) && value > 20000 && value < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000));
    normalized = [
      utc.getUTCFullYear(),
      String(utc.getUTCMonth() + 1).padStart(2, '0'),
      String(utc.getUTCDate()).padStart(2, '0')
    ].join('-');
  } else {
    normalized = dateToInput_(value);
  }
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const year = Number(match[1]);
  return year >= 2000 && year <= 2100 ? normalized : '';
}

function getDatabaseV2RoutingSteps_(row) {
  const parsed = parseRoutingStepsCell_(row[DB_COL.ROUTING_STEPS - 1]);
  const steps = parsed.slice();
  const represented = {};
  steps.forEach(function(step) { represented[step.key] = true; });
  PROSES_KEYS.map(function(key, index) {
    return isProcessActive_(row[DB_COL.PROSES_MIXER - 1 + index])
      ? { key: key, values: {} }
      : null;
  }).filter(Boolean).forEach(function(step) {
    if (!represented[step.key]) {
      represented[step.key] = true;
      steps.push(step);
    }
  });
  const finishing = valueOrEmpty_(row[DB_COL.FINISHING - 1]);
  if (finishing && finishing !== '-' && !represented.cutting) {
    steps.push({ key: 'cutting', values: { finishing: finishing } });
  }
  return steps;
}

function buildDatabaseV2RoutingCandidate_(row, spk, step, stepIndex) {
  const values = Object.assign(
    {},
    getDatabaseV2FallbackRoutingParameters_(row, step.key),
    step.values && typeof step.values === 'object' ? step.values : {}
  );
  const machine = findDatabaseV2PayloadValue_(values, ['mesin', 'machine']);
  const parameters = {};
  Object.keys(values).sort().forEach(function(key) {
    if (key.indexOf('aksesorisData-') === 0) return;
    if (/mesin|machine/i.test(key)) return;
    parameters[key] = values[key];
  });
  const bsIndex = BS_KEYS.indexOf(step.key);
  const targetBs = values.targetBs && typeof values.targetBs === 'object'
    ? values.targetBs
    : {};
  const primaryBsKey = Object.keys(targetBs).filter(function(key) {
    return targetBs[key] !== '' && targetBs[key] !== null && targetBs[key] !== undefined;
  })[0] || '';
  const primaryBsIndex = primaryBsKey ? BS_KEYS.indexOf(primaryBsKey) : bsIndex;
  const processNotes = getProcessNotesFromRow_(row);
  return {
    'Routing ID': databaseV2DetailId_(spk, 'R', stepIndex + 1),
    'SPK': spk,
    'Urutan': stepIndex + 1,
    'Kode Proses': step.key,
    'Nama Proses': PROSES_LABELS[step.key] || String(step.key || '').toUpperCase(),
    'Mesin': machine,
    'Ukuran / Parameter': Object.keys(parameters).length ? JSON.stringify(parameters) : '',
    'Target BS %': primaryBsIndex > -1
      ? databaseV2PercentFraction_(percentToInput_(row[DB_COL.BS_START - 1 + primaryBsIndex]))
      : '',
    'Keterangan': valueOrEmpty_(processNotes[step.key]),
    'Status': 'AKTIF',
    'Mulai': '',
    'Selesai': '',
    'Operator': '',
    'Payload JSON': JSON.stringify({ key: step.key, values: values }),
    'Sumber': DB_V2_NATIVE_RECORD_SOURCE,
    'Dibuat': '',
    'Diperbarui': ''
  };
}

function getDatabaseV2FallbackRoutingParameters_(row, processKey) {
  const parameters = {};
  const add = function(key, column) {
    const value = valueOrEmpty_(row[column - 1]);
    if (value !== '') parameters[key] = value;
  };
  if (processKey === 'blowing') {
    add('blowingThreat', DB_COL.BLOWING_THREAT);
    add('blowingModeCetak', DB_COL.BLOWING_MODE_CETAK);
  } else if (processKey === 'printing') {
    add('printingKodeSilinder', DB_COL.PRINTING_KODE_SILINDER);
  } else if (processKey === 'folding') {
    add('ukuranFolding', DB_COL.UKURAN_FOLDING);
  } else if (processKey === 'slitting') {
    add('ukuranSlitting', DB_COL.UKURAN_SLITTING);
  } else if (processKey === 'gusset') {
    add('ukuranGusset', DB_COL.UKURAN_GUSSET);
  } else if (processKey === 'cutting') {
    add('finishing', DB_COL.FINISHING);
    add('handlePon', DB_COL.HANDLE_PON);
    add('jenisPacking', DB_COL.JENIS_PACKING);
    add('packing', DB_COL.PACKING);
  }
  const targetBs = {};
  getDatabaseV2RoutingBsKeys_(processKey).forEach(function(key) {
    const index = BS_KEYS.indexOf(key);
    const value = index > -1 ? percentToInput_(row[DB_COL.BS_START - 1 + index]) : '';
    if (value !== '') targetBs[key] = value;
  });
  if (Object.keys(targetBs).length) parameters.targetBs = targetBs;
  return parameters;
}

function getDatabaseV2RoutingBsKeys_(processKey) {
  if (processKey === 'slitting') return ['slitting', 'sheet', 'sheetSlitting'];
  if (processKey === 'cutting') return ['pon', 'tshirt', 'bottomSeal', 'sideSeal', 'handle'];
  return BS_KEYS.indexOf(processKey) > -1 ? [processKey] : [];
}

function getDatabaseV2MaterialItems_(row) {
  const result = [];
  for (let index = 0; index < DB_MAX_BAHAN; index++) {
    const start = DB_COL.KOMPOSISI_START - 1 + (index * 3);
    const item = index === DB_MAX_BAHAN - 1
      ? { material: valueOrEmpty_(row[start]), kg: '', percent: '' }
      : {
          material: valueOrEmpty_(row[start]),
          kg: numberOrEmptyForClient_(row[start + 1]),
          percent: percentToInput_(row[start + 2])
        };
    if (item.material !== '' || item.kg !== '' || item.percent !== '') result.push(item);
  }
  if (!result.length && valueOrEmpty_(row[DB_COL.MATERIAL - 1]) !== '') {
    result.push({
      material: valueOrEmpty_(row[DB_COL.MATERIAL - 1]),
      kg: numberOrEmptyForClient_(row[DB_COL.KELUAR_BAHAN - 1]),
      percent: ''
    });
  }
  return result;
}

function getDatabaseV2MainDelivery_(row) {
  const date = databaseV2DateInput_(row[DB_COL.ETD - 1]);
  if (!date) return [];
  return [{
    tanggal: date,
    jumlah: numberOrEmptyForClient_(row[DB_COL.JUMLAH_ORDER - 1]),
    uom: valueOrEmpty_(row[DB_COL.UOM_ORDER - 1]),
    mode: 'FULL'
  }];
}

function databaseV2PercentFraction_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value);
  return isFinite(number) ? number / 100 : '';
}

function findDatabaseV2PayloadValue_(values, patterns) {
  const keys = Object.keys(values || {});
  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
    const pattern = String(patterns[patternIndex]).toLowerCase();
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      if (keys[keyIndex].toLowerCase().indexOf(pattern) > -1) {
        return valueOrEmpty_(values[keys[keyIndex]]);
      }
    }
  }
  return '';
}

function databaseV2DetailId_(spk, type, sequence) {
  return spk + ':' + type + ':' + String(sequence).padStart(2, '0');
}

function databaseV2NestedDetailId_(spk, type, parentSequence, sequence) {
  return spk + ':' + type + ':' + String(parentSequence).padStart(2, '0') + ':' +
    String(sequence).padStart(2, '0');
}
