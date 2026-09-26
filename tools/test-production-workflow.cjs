const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sheets = new Map();
let idSequence = 0;

function makeSheet() {
  const rows = [];
  return {
    rows,
    getLastRow() { return rows.length; },
    setFrozenRows() {},
    getRange(startRow, startCol, rowCount = 1, colCount = 1) {
      return {
        getValues() {
          return Array.from({ length: rowCount }, (_, row) =>
            Array.from({ length: colCount }, (_, col) => rows[startRow + row - 1]?.[startCol + col - 1] ?? ''));
        },
        setValues(values) {
          for (let row = 0; row < rowCount; row++) {
            const target = rows[startRow + row - 1] ||= [];
            for (let col = 0; col < colCount; col++) target[startCol + col - 1] = values[row][col];
          }
          return this;
        },
        setValue(value) { return this.setValues([[value]]); }
      };
    }
  };
}

const book = {
  getSheetByName(name) { return sheets.get(name) || null; },
  insertSheet(name) { const sheet = makeSheet(); sheets.set(name, sheet); return sheet; }
};
const context = {
  console, Date, JSON, Number, String, Array, Object, Math,
  DB_SPREADSHEET_ID: 'test',
  SpreadsheetApp: { openById() { return book; }, flush() {} },
  LockService: { getScriptLock() { let locked = false; return {
    tryLock() { locked = true; return true; },
    hasLock() { return locked; },
    releaseLock() { locked = false; }
  }; } },
  Utilities: {
    getUuid() { return `id-${++idSequence}`; },
    formatDate(date) { return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16); }
  },
  normalizeDatabaseV2Key_(value) { return String(value || '').trim().toUpperCase(); },
  readDatabaseV2Spk_(spk) {
    if (spk !== 'I26.001') return null;
    return { master: { SPK: spk, Tracking: 'Q' }, routing: [
      { 'Routing ID': 'I26.001:R:1', SPK: spk, 'Nama Proses': 'Mixer', Status: '' }
    ] };
  },
  readDatabaseV2Table_(key) {
    if (key === 'master') return { records: [{ SPK: 'I26.001', Tracking: 'Q', Customer: 'Contoh', Artikel: 'Kantong', 'Jumlah Order': 100, 'UOM Order': 'KG' }] };
    if (key === 'routing') return { records: [{ SPK: 'I26.001', 'Routing ID': 'I26.001:R:1', 'Nama Proses': 'Mixer', Mesin: 'PE01', Urutan: 1 }] };
    throw new Error(key);
  },
  requireApprovalSession_(token, allowed) {
    const role = { ppic: 'admin_ppic', admin: 'admin_produksi', leader: 'head_mixer' }[token];
    if (!role || !allowed.includes(role)) throw new Error('Tidak berizin');
    return { roleKey: role, email: `${role}@example.test` };
  }
};
vm.createContext(context);
for (const file of ['BE-Production-Schedule.js', 'BE-Production-Entries.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'gas-deploy', file), 'utf8'), context, { filename: file });
}

const first = {
  requestId: 'schedule-1', spk: 'I26.001', routingId: 'I26.001:R:1', mesin: 'PE01',
  mulai: '2026-09-26T08:00', selesai: '2026-09-26T16:00', urutan: 1,
  target: 100, uomTarget: 'KG'
};
const saved = context.saveProductionSchedule('ppic', first);
assert.equal(saved.status, 'success');
assert.equal(saved.data.status, 'DRAFT');
assert.equal(context.saveProductionSchedule('ppic', first).data.scheduleId, saved.data.scheduleId);
assert.equal(sheets.get('Schedule Produksi').getLastRow(), 2, 'retry tidak membuat jadwal ganda');
assert.equal(context.releaseProductionSchedule('ppic', saved.data.scheduleId, 1).data.status, 'RELEASED');
assert.equal(context.releaseProductionSchedule('ppic', saved.data.scheduleId, 1).status, 'error');

const second = context.saveProductionSchedule('ppic', { ...first, requestId: 'schedule-2', urutan: 2 });
assert.equal(second.status, 'success');
assert.match(context.releaseProductionSchedule('ppic', second.data.scheduleId, 1).message, /Mesin sudah/);
assert.equal(context.cancelProductionSchedule('ppic', second.data.scheduleId, 1, '').status, 'error', 'pembatalan perlu alasan');
assert.equal(context.cancelProductionSchedule('ppic', second.data.scheduleId, 1, 'Jadwal bentrok').data.status, 'CANCELLED');
assert.equal(context.getProductionScheduleData('admin').status, 'error', 'hanya PPIC membaca perencanaan');

const entry = {
  requestId: 'entry-1', scheduleId: saved.data.scheduleId,
  tanggal: '2026-09-26', shift: '1', operator: 'Operator Contoh',
  mulai: '2026-09-26T08:00', selesai: '2026-09-26T12:00',
  hasilBaik: 40, bs: 2, materials: [{ nama: 'Resin', resin: 'PE', kode: 'R1', kg: 43 }],
  downtime: [{ mulai: '2026-09-26T10:00', selesai: '2026-09-26T10:15', alasan: 'Setting mesin' }]
};
const result = context.saveProductionEntry('admin', entry);
assert.equal(result.status, 'success');
assert.equal(result.data.status, 'SUBMITTED');
assert.equal(context.saveProductionEntry('admin', entry).data.entryId, result.data.entryId);
assert.equal(sheets.get('Hasil Produksi').getLastRow(), 2, 'retry tidak menggandakan hasil');
assert.equal(context.saveProductionEntry('admin', { ...entry, requestId: 'entry-2', hasilBaik: 70 }).status, 'error', 'kelebihan target perlu alasan');
const secondEntry = context.saveProductionEntry('admin', { ...entry, requestId: 'entry-3', hasilBaik: 30, mulai: '2026-09-26T12:00', selesai: '2026-09-26T16:00', materials: [], downtime: [] });
assert.equal(secondEntry.status, 'success', 'satu jadwal menerima lebih dari satu entri hasil');
assert.equal(sheets.get('Hasil Produksi').getLastRow(), 3);
assert.equal(context.verifyProductionEntry('admin', result.data.entryId, 1).status, 'error', 'admin tidak dapat memverifikasi');
assert.equal(context.verifyProductionEntry('leader', result.data.entryId, 1).data.status, 'VERIFIED');
assert.equal(context.rejectProductionEntry('leader', secondEntry.data.entryId, 1, '').status, 'error', 'pengembalian perlu alasan');
assert.equal(context.rejectProductionEntry('leader', secondEntry.data.entryId, 1, 'Timbang ulang').data.status, 'REJECTED');
assert.equal(context.cancelProductionSchedule('ppic', saved.data.scheduleId, 2, 'Perubahan rencana').status, 'error', 'jadwal dengan hasil tidak boleh dibatalkan');
const correction = context.saveProductionEntry('admin', { ...entry, requestId: 'entry-4', hasilBaik: 35, mulai: '2026-09-26T12:00', selesai: '2026-09-26T16:00', materials: [], downtime: [] });
assert.equal(correction.status, 'success', 'hasil yang dikembalikan bisa diganti entri baru');
assert.equal(context.getProductionScheduleData('ppic').schedules.find(row=>row.scheduleId===saved.data.scheduleId).hasilTerverifikasi, 40);
assert.equal(context.getProductionWorkData('admin').entries.length, 3);
console.log('PASS: jadwal draf/rilis/batal, benturan mesin, idempotensi, hasil berulang, target, verifikasi, pengembalian, dan rekap PPIC');
