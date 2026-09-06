var OTD_SOURCE_FILE_ID_ = "1pbxEmI25G-zwb7HE28drXm0UqtbtNXnr";
var OTD_SOURCE_SHEET_ = "OTD";

function getOtdDashboardData() {
  var source = Drive.Files.get(OTD_SOURCE_FILE_ID_);
  var revision = String(source.modifiedDate || source.modifiedTime || "");
  var cache = CacheService.getScriptCache();
  var cacheKey = "otd-live-" + Utilities.base64EncodeWebSafe(revision).slice(0, 40);
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var temporary = Drive.Files.insert(
    { title: "TEMP OTD Dashboard " + new Date().getTime(), mimeType: MimeType.GOOGLE_SHEETS },
    DriveApp.getFileById(OTD_SOURCE_FILE_ID_).getBlob(),
    { convert: true }
  );

  try {
    var spreadsheet = SpreadsheetApp.openById(temporary.id);
    var sheet = spreadsheet.getSheetByName(OTD_SOURCE_SHEET_);
    if (!sheet) throw new Error("Sheet OTD tidak ditemukan pada file sumber.");

    var values = sheet.getDataRange().getValues();
    var headerRow = -1;
    for (var i = 0; i < Math.min(values.length, 10); i++) {
      var normalized = values[i].map(normalizeOtdHeader_);
      if (normalized.indexOf("SPK") !== -1 && normalized.indexOf("CUSTOMER") !== -1) {
        headerRow = i;
        break;
      }
    }
    if (headerRow < 0) throw new Error("Header data OTD tidak ditemukan.");

    var headers = values[headerRow].map(normalizeOtdHeader_);
    var columns = {
      spk: headers.indexOf("SPK"),
      customer: headers.indexOf("CUSTOMER"),
      brand: headers.indexOf("BRAND"),
      material: headers.indexOf("JENIS BAHAN"),
      pcsPerKg: headers.indexOf("KG/PCS"),
      tanggalPo: headers.indexOf("TGL PO"),
      marketing: headers.indexOf("MKT"),
      order: headers.indexOf("ORDER"),
      uom: headers.indexOf("UOM"),
      hasil: headers.indexOf("HASIL"),
      outstanding: headers.indexOf("+/-"),
      aging: headers.indexOf("AGING PO"),
      targetKirim: headers.indexOf("BLN KIRIM"),
      proses: headers.indexOf("PROSES"),
      p1: headers.indexOf("P1")
    };

    var rows = values.slice(headerRow + 1).filter(function (row) {
      return String(row[columns.spk] || "").trim() !== "";
    }).map(function (row) {
      var routing = [];
      for (var r = 0; r < 7; r++) {
        var route = String(row[columns.p1 + r] || "").trim();
        if (route && routing.indexOf(route) === -1) routing.push(route);
      }
      return {
        spk: String(row[columns.spk] || "").trim(),
        customer: String(row[columns.customer] || "").trim(),
        brand: String(row[columns.brand] || "").trim(),
        material: String(row[columns.material] || "").trim(),
        order: numberOtd_(row[columns.order]),
        uom: String(row[columns.uom] || "").trim().toUpperCase(),
        pcsPerKg: numberOtd_(row[columns.pcsPerKg]),
        hasil: numberOtd_(row[columns.hasil]),
        outstanding: numberOtd_(row[columns.outstanding]),
        aging: numberOtd_(row[columns.aging]),
        tanggalPo: dateOtd_(row[columns.tanggalPo]),
        targetKirim: dateOtd_(row[columns.targetKirim]),
        marketing: String(row[columns.marketing] || "").trim(),
        proses: String(row[columns.proses] || "").trim(),
        routing: routing
      };
    });

    var result = {
      source: "live",
      sourceFileId: OTD_SOURCE_FILE_ID_,
      sheet: OTD_SOURCE_SHEET_,
      sourceModifiedAt: revision,
      snapshotAt: new Date().toISOString(),
      rows: rows
    };
    var serialized = JSON.stringify(result);
    if (serialized.length < 95000) cache.put(cacheKey, serialized, 300);
    return result;
  } finally {
    Drive.Files.trash(temporary.id);
  }
}

function normalizeOtdHeader_(value) {
  return String(value == null ? "" : value).trim().toUpperCase().replace(/\s+/g, " ");
}

function numberOtd_(value) {
  if (typeof value === "number") return isFinite(value) ? value : 0;
  var cleaned = String(value == null ? "" : value).replace(/\s/g, "").replace(/,/g, ".");
  var parsed = Number(cleaned);
  return isFinite(parsed) ? parsed : 0;
}

function dateOtd_(value) {
  if (!value) return "";
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return Utilities.formatDate(date, Session.getScriptTimeZone() || "Asia/Jakarta", "yyyy-MM-dd");
}