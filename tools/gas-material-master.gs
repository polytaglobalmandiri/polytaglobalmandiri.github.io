/** Backend master bahan untuk tab "Database Bahan baku & Tinta". */
var MATERIAL_MASTER_SHEET_ = 'Database Bahan baku & Tinta';
var MATERIAL_MASTER_HEADERS_ = ['ID Bahan','Kode Bahan','Nama Bahan','Kategori','Subkategori','Warna/Varian','Kode Supplier','Supplier','UOM','Berat/Kemasan (KG)','Stok Referensi (KG)','Tanggal Acuan','Status','Sumber Data','Catatan','Urutan','Kata Kunci'];

function getMaterialMasterData(forceRefresh) {
  var cache = CacheService.getScriptCache();
  var key = 'material-master-v1';
  if (!forceRefresh) {
    var cached = cache.get(key);
    if (cached) return JSON.parse(cached);
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MATERIAL_MASTER_SHEET_);
  if (!sheet) throw new Error('Sheet Database Bahan baku & Tinta tidak ditemukan.');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], updatedAt: new Date().toISOString() };
  var values = sheet.getRange(2, 1, lastRow - 1, MATERIAL_MASTER_HEADERS_.length).getDisplayValues();
  var rows = values.filter(function(row) { return row[0] || row[1] || row[2]; }).map(function(row, index) {
    return {
      rowNumber: index + 2,
      idBahan: row[0], kodeBahan: row[1], namaBahan: row[2], kategori: row[3],
      subkategori: row[4], warnaVarian: row[5], kodeSupplier: row[6], supplier: row[7],
      uom: row[8] || 'KG', beratKemasanKg: parseMaterialNumber_(row[9]),
      stokReferensiKg: parseMaterialNumber_(row[10]), tanggalAcuan: normalizeMaterialDate_(row[11]),
      status: row[12] || 'AKTIF', sumberData: row[13], catatan: row[14], urutan: parseMaterialNumber_(row[15])
    };
  });
  var result = { rows: rows, updatedAt: new Date().toISOString() };
  var serialized = JSON.stringify(result);
  if (serialized.length < 95000) cache.put(key, serialized, 300);
  return result;
}

function saveMaterialMaster(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Data bahan tidak valid.');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MATERIAL_MASTER_SHEET_);
  if (!sheet) throw new Error('Sheet Database Bahan baku & Tinta tidak ditemukan.');
  var code = cleanMaterialText_(payload.kodeBahan, 50).toUpperCase();
  var name = cleanMaterialText_(payload.namaBahan, 180);
  var category = cleanMaterialText_(payload.kategori, 100).toUpperCase();
  var uom = cleanMaterialText_(payload.uom || 'KG', 20).toUpperCase();
  var status = cleanMaterialText_(payload.status || 'AKTIF', 20).toUpperCase();
  if (!code || !name || !category) throw new Error('Kode, nama, dan kategori bahan wajib diisi.');
  if (['KG','PCS','ROLL','LITER'].indexOf(uom) < 0) throw new Error('UOM bahan tidak valid.');
  if (['AKTIF','NONAKTIF'].indexOf(status) < 0) throw new Error('Status bahan tidak valid.');
  var rowNumber = Number(payload.rowNumber) || 0;
  var lastRow = sheet.getLastRow();
  var codes = lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues() : [];
  for (var i = 0; i < codes.length; i++) {
    if (String(codes[i][0]).trim().toUpperCase() === code && i + 2 !== rowNumber) throw new Error('Kode bahan '+code+' sudah digunakan.');
  }
  var isNew = rowNumber < 2 || rowNumber > lastRow;
  if (isNew) rowNumber = lastRow + 1;
  var id = cleanMaterialText_(payload.idBahan, 30);
  if (!id) id = 'MAT-' + Utilities.formatString('%04d', nextMaterialSequence_(sheet));
  var order = isNew ? nextMaterialSequence_(sheet) : (Number(sheet.getRange(rowNumber, 16).getValue()) || nextMaterialSequence_(sheet));
  var date = payload.tanggalAcuan ? new Date(payload.tanggalAcuan + 'T00:00:00') : new Date();
  var supplier = cleanMaterialText_(payload.supplier, 180);
  var variant = cleanMaterialText_(payload.warnaVarian, 100);
  var keywords = [code,name,category,cleanMaterialText_(payload.subkategori,100),variant,supplier].filter(String).join(' | ');
  var existingSource = !isNew ? sheet.getRange(rowNumber, 14).getDisplayValue() : '';
  var row = [id,code,name,category,cleanMaterialText_(payload.subkategori,100),variant,cleanMaterialText_(payload.kodeSupplier,50).toUpperCase(),supplier,uom,materialNumberOrBlank_(payload.beratKemasanKg),materialNumberOrBlank_(payload.stokReferensiKg),date,status,existingSource || 'Manajemen Bahan PPIC',cleanMaterialText_(payload.catatan,500),order,keywords];
  sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  CacheService.getScriptCache().remove('material-master-v1');
  SpreadsheetApp.flush();
  return { ok: true, rowNumber: rowNumber, idBahan: id, message: isNew ? 'Bahan baru berhasil ditambahkan.' : 'Data bahan berhasil diperbarui.' };
}

function nextMaterialSequence_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  return Math.max.apply(null, sheet.getRange(2, 16, lastRow - 1, 1).getValues().map(function(row) { return Number(row[0]) || 0; })) + 1;
}
function cleanMaterialText_(value, max) { return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max); }
function parseMaterialNumber_(value) { var n = Number(String(value || '').replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
function materialNumberOrBlank_(value) { if (value === '' || value == null) return ''; var n = Number(value); return isFinite(n) ? n : ''; }
function normalizeMaterialDate_(value) { if (!value) return ''; var date = new Date(value); return isNaN(date.getTime()) ? String(value) : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
