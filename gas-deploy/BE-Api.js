// Endpoint RPC untuk frontend statis yang di-host di GitHub Pages.
// Hanya fungsi yang tercantum di bawah yang boleh dipanggil dari browser.
var SPK_RPC_METHODS_ = {
  getDashboardData: getDashboardData,
  getDashboardDataChunk: getDashboardDataChunk,
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
  getProductionMixerData: getProductionMixerData,
  saveProductionMixerEntry: saveProductionMixerEntry,
  getProductionBlowingData: getProductionBlowingData,
  saveProductionBlowingEntry: saveProductionBlowingEntry,
  getProductionPrintingData: getProductionPrintingData,
  saveProductionPrintingEntry: saveProductionPrintingEntry,
  getProductionScheduleData: getProductionScheduleData,
  saveProductionSchedule: saveProductionSchedule,
  releaseProductionSchedule: releaseProductionSchedule,
  cancelProductionSchedule: cancelProductionSchedule,
  getProductionWorkData: getProductionWorkData,
  saveProductionEntry: saveProductionEntry,
  verifyProductionEntry: verifyProductionEntry,
  rejectProductionEntry: rejectProductionEntry,
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

var SPK_RPC_PUBLIC_ = ['getApprovalBootstrapStatus', 'bootstrapApprovalAdmin', 'loginApprovalUser', 'getApprovalSession', 'logoutApprovalUser'];
var SPK_CURRENT_RPC_METHOD_ = '';
var PORTAL_PAGE_CATALOG_ = [
  ['/', 'Beranda'], ['/pages/ppic/', 'PPIC'], ['/pages/production/', 'Produksi'],
  ['/pages/marketing/', 'Marketing'], ['/pages/purchasing/', 'Purchasing'],
  ['/pages/finance/', 'Finance'], ['/pages/admin/', 'Administrasi'],
  ['/pages/support/', 'Support'], ['/apps/spk-automation/', 'SPK'],
  ['/apps/spk-automation/dashboard/', 'Dashboard SPK'],
  ['/apps/spk-automation/create-spk/', 'Buat SPK'],
  ['/apps/spk-automation/print-spk/', 'Cetak SPK'],
  ['/apps/spk-automation/approval/', 'Persetujuan SPK'],
  ['/apps/spk-automation/schedule/', 'Jadwal Produksi'],
  ['/apps/spk-automation/production/', 'Hasil Produksi'],
  ['/apps/spk-automation/material-management/', 'Master Bahan'],
  ['/apps/spk-automation/material-issue/', 'Keluar Bahan'],
  ['/apps/spk-automation/handover/', 'Serah Terima'],
  ['/apps/spk-automation/data-retrieval/', 'Penarikan Data']
];
function getPortalAccessCatalog_() {
  return {
    pages: PORTAL_PAGE_CATALOG_.map(function(item) { return { key: item[0], label: item[1] }; }),
    methods: Object.keys(SPK_RPC_METHODS_).filter(function(method) {
      return SPK_RPC_PUBLIC_.indexOf(method) === -1 && method !== 'listApprovalUsers' && method !== 'saveApprovalUser';
    }).map(function(method) { return { key: method, label: method }; })
  };
}
var SPK_RPC_PPIC_ = ['admin_ppic', 'asmen_ppic', 'manager_ppic'];
var SPK_RPC_PRODUCTION_ = ['admin_produksi', 'operator_produksi', 'head_mixer', 'head_blowing', 'head_printing', 'head_slitting', 'head_folding', 'head_gusset', 'head_finishing'];
var SPK_RPC_MANAGEMENT_ = ['senior_manager', 'general_manager'];
var SPK_RPC_ROLE_MAP_ = {};
function assignSpkRpcRoles_(methods, roles) {
  methods.forEach(function (method) { SPK_RPC_ROLE_MAP_[method] = roles; });
}
assignSpkRpcRoles_([
  'getDashboardData', 'getDashboardDataChunk', 'getDashboardDataRevision',
  'getDashboardTrackingData', 'getOtdDashboardData', 'getSpkYearPreference',
  'getSpkApprovalStatus', 'getSpkApprovalSignatures'
], SPK_RPC_PPIC_.concat(SPK_RPC_MANAGEMENT_));
assignSpkRpcRoles_([
  'getDatabaseV2Readiness', 'getDatabaseV2CutoverAudit', 'saveSpkYearPreference',
  'getSpkEditData', 'updateSpkFromDashboard', 'getMasterFormOptions',
  'saveCustomerMaster', 'saveBrandMaster', 'getMaterialMasterData',
  'saveMaterialMaster', 'getInputSpkOptionsFast', 'getSpkExistenceSnapshot',
  'checkSpkExists', 'getSpkData', 'submitDatabase', 'getFolderData',
  'getActiveExtractionJob', 'getExtractionProgress', 'beginExtractionJob',
  'extractData', 'acknowledgeExtractionJob', 'cancelExtractionJob'
], SPK_RPC_PPIC_);
assignSpkRpcRoles_(['getSpkPrintData'], SPK_RPC_PPIC_);
assignSpkRpcRoles_(['markSpkReleasedForPrint', 'listApprovalUsers', 'saveApprovalUser'], ['admin_ppic']);
assignSpkRpcRoles_(['getApprovalQueue', 'approveSpk'], null);
assignSpkRpcRoles_([
  'getKeluarBahanManagerData', 'getKeluarBahanManagerDetail',
  'getKeluarBahanManagerDetailBatch', 'saveEtaBeliBahanScheduleByManager',
  'updateEtaBeliBahanByManager', 'updateKeluarBahanByManager'
], ['asmen_ppic', 'manager_ppic']);
assignSpkRpcRoles_([
  'getProductionMixerData', 'saveProductionMixerEntry',
  'getProductionBlowingData', 'saveProductionBlowingEntry',
  'getProductionPrintingData', 'saveProductionPrintingEntry',
  'getProductionWorkData', 'saveProductionEntry', 'verifyProductionEntry',
  'rejectProductionEntry'
], SPK_RPC_PRODUCTION_.concat(SPK_RPC_PPIC_));
assignSpkRpcRoles_([
  'getProductionScheduleData', 'saveProductionSchedule',
  'releaseProductionSchedule', 'cancelProductionSchedule'
], SPK_RPC_PPIC_);
assignSpkRpcRoles_([
  'getHandoverPageData', 'getHandoverOverview', 'getHandoverSpkDetails',
  'saveHandover', 'saveHandoverByRouting'
], SPK_RPC_PPIC_.concat(SPK_RPC_PRODUCTION_));

function requireSpkRpcAccess_(request, method) {
  if (SPK_RPC_PUBLIC_.indexOf(method) !== -1) return;
  if (!Object.prototype.hasOwnProperty.call(SPK_RPC_ROLE_MAP_, method)) {
    throw new Error('Aturan akses API belum ditetapkan: ' + method);
  }
  var session = requireApprovalSession_(request && request.authToken);
  if (session.isOwner) return;
  if (method === 'listApprovalUsers' || method === 'saveApprovalUser') {
    throw new Error('Hanya akun master yang boleh mengatur pengguna dan izin.');
  }
  var override = portalMethodOverride_(session, method);
  if (override === false) throw new Error('Izin tindakan ini dinonaktifkan oleh akun master.');
  if (override === true) return;
  var roles = SPK_RPC_ROLE_MAP_[method];
  if (roles && roles.indexOf(session.roleKey) === -1) {
    throw new Error('Jabatan akun tidak memiliki izin untuk tindakan ini.');
  }
}

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

    requireSpkRpcAccess_(request, method);

    var args = Array.isArray(request.args) ? request.args : [];
    SPK_CURRENT_RPC_METHOD_ = method;
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
  } finally {
    SPK_CURRENT_RPC_METHOD_ = '';
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
