// Endpoint RPC untuk frontend statis yang di-host di GitHub Pages.
// Hanya fungsi yang tercantum di bawah yang boleh dipanggil dari browser.
var SPK_RPC_METHODS_ = {
  getDashboardData: getDashboardData,
  getDashboardDataRevision: getDashboardDataRevision,
  getDashboardTrackingData: getDashboardTrackingData,
  getDatabaseV2Readiness: getDatabaseV2Readiness,
  getDatabaseV2CutoverAudit: getDatabaseV2CutoverAudit,
    getOtdDashboardData: getOtdDashboardData,
  getSpkYearPreference: getSpkYearPreference,
  saveSpkYearPreference: saveSpkYearPreference,
  getSpkPrintData: getSpkPrintData,
  markSpkReleasedForPrint: markSpkReleasedForPrint,
  getApprovalBootstrapStatus: getApprovalBootstrapStatus,
  bootstrapApprovalAdmin: bootstrapApprovalAdmin,
  loginApprovalUser: loginApprovalUser,
  getApprovalSession: getApprovalSession,
  logoutApprovalUser: logoutApprovalUser,
  listApprovalUsers: listApprovalUsers,
  saveApprovalUser: saveApprovalUser,
  getApprovalQueue: getApprovalQueue,
  approveSpk: approveSpk,
  getSpkApprovalStatus: getSpkApprovalStatus,
  getSpkApprovalSignatures: getSpkApprovalSignatures,
  getSpkEditData: getSpkEditData,
  updateSpkFromDashboard: updateSpkFromDashboard,
  getMasterFormOptions: getMasterFormOptions,
  saveCustomerMaster: saveCustomerMaster,
  saveBrandMaster: saveBrandMaster,
  getMaterialMasterData: getMaterialMasterData,
  saveMaterialMaster: saveMaterialMaster,
  getInputSpkOptionsFast: getInputSpkOptionsFast,
  getSpkExistenceSnapshot: getSpkExistenceSnapshot,
  checkSpkExists: checkSpkExists,
  getSpkData: getSpkData,
  submitDatabase: submitDatabase,
  getKeluarBahanManagerData: getKeluarBahanManagerData,
  getKeluarBahanManagerDetail: getKeluarBahanManagerDetail,
  getKeluarBahanManagerDetailBatch: getKeluarBahanManagerDetailBatch,
  saveEtaBeliBahanScheduleByManager: saveEtaBeliBahanScheduleByManager,
  updateEtaBeliBahanByManager: updateEtaBeliBahanByManager,
  updateKeluarBahanByManager: updateKeluarBahanByManager,
  getHandoverPageData: getHandoverPageData,
  getHandoverOverview: getHandoverOverview,
  getHandoverSpkDetails: getHandoverSpkDetails,
  saveHandover: saveHandover,
  saveHandoverByRouting: saveHandoverByRouting,
  getFolderData: getFolderData,
  getActiveExtractionJob: getActiveExtractionJob,
  getExtractionProgress: getExtractionProgress,
  beginExtractionJob: beginExtractionJob,
  extractData: extractData,
  acknowledgeExtractionJob: acknowledgeExtractionJob,
  cancelExtractionJob: cancelExtractionJob
};

function doPost(e) {
  var requestId = '';
  try {
    var request = parseSpkRpcRequest_(e);
    requestId = String(request.requestId || '');
    var method = String(request.method || '');
    var action = SPK_RPC_METHODS_[method];

    if (typeof action !== 'function') {
      throw new Error('Fungsi API tidak diizinkan: ' + method);
    }

    var args = Array.isArray(request.args) ? request.args : [];
    var result = action.apply(null, args);
    return createSpkRpcResponse_({ ok: true, result: result, requestId: requestId }, e);
  } catch (error) {
    console.error('SPK RPC gagal', error);
    return createSpkRpcResponse_({
      ok: false,
      error: {
        message: error && error.message ? error.message : String(error)
      },
      requestId: requestId
    }, e);
  }
}

function parseSpkRpcRequest_(e) {
  var contents = e && e.parameter && e.parameter.payload
    ? String(e.parameter.payload)
    : (e && e.postData && e.postData.contents ? String(e.postData.contents) : '');
  if (!contents) throw new Error('Payload API kosong.');

  var request = JSON.parse(contents);
  if (!request || typeof request !== 'object') {
    throw new Error('Format payload API tidak valid.');
  }
  return request;
}

function createSpkRpcResponse_(payload, e) {
  // Browser GitHub Pages mengirim lewat form ke iframe tersembunyi. Respons
  // dikembalikan melalui postMessage agar tidak bergantung pada redirect CORS
  // ContentService milik Apps Script.
  if (e && e.parameter && e.parameter.payload) {
    var message = {
      source: 'polyta-spk-gas-rpc',
      requestId: String(payload.requestId || ''),
      payload: payload
    };
    var serialized = JSON.stringify(message).replace(/</g, '\\u003c');
    return HtmlService
      .createHtmlOutput(
        '<!doctype html><meta charset="utf-8">' +
        // HtmlService menaruh userHtml di sandboxFrame di dalam iframe target
        // form. Dua tingkat ke atas adalah halaman yang membuat transport.
        // window.top salah saat halaman cetak disematkan (ia menunjuk portal),
        // sedangkan window.parent hanya menunjuk pembungkus HtmlService.
        '<script>window.parent.parent.postMessage(' + serialized + ', "*");<\/script>'
      )
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
