// Jalur cadangan JSONP untuk frontend statis di GitHub Pages.
//
// doPost membalas lewat HtmlService, dan HtmlService menaruh jawaban itu di
// dalam iframe *.googleusercontent.com yang bersarang dua tingkat. Peramban
// yang memblokir penyimpanan pihak ketiga - juga penyaring jaringan yang
// menutup googleusercontent.com - menahan frame tersebut, sehingga jawaban
// yang sudah selesai dihitung tidak pernah sampai ke halaman. Dari sisi
// pengguna itu terlihat persis seperti server yang tidak merespons, padahal
// servernya menjawab dalam dua detik.
//
// Muatan <script> tidak lewat frame dan tidak menyentuh cookie pihak ketiga,
// jadi tetap sampai dalam keadaan itu. Sekalian lebih murah: satu perjalanan
// bolak-balik, bukan dua.
//
// Daftar putihnya sengaja tetap SPK_RPC_METHODS_ milik doPost. Menyalinnya ke
// sini hanya akan melahirkan dua daftar yang lambat laun berbeda isi, dan
// selisih pada daftar kewenangan adalah selisih yang berbahaya.
function serveSpkRpcJsonp_(e) {
  var callback = e && e.parameter && e.parameter.callback
    ? String(e.parameter.callback)
    : '';
  // Nama callback ditulis apa adanya ke badan respons, jadi bentuknya dikunci
  // pada apa yang dibangkitkan gas-rpc.js dan tidak lebih dari itu.
  if (!callback || !/^__polytaGasJsonp\.[A-Za-z0-9_]{1,40}$/.test(callback)) {
    return null;
  }

  var payload;
  try {
    var request = parseSpkRpcRequest_(e);
    var method = String(request.method || '');
    var action = SPK_RPC_METHODS_[method];

    if (typeof action !== 'function') {
      throw new Error('Fungsi API tidak diizinkan: ' + method);
    }

    var args = Array.isArray(request.args) ? request.args : [];
    payload = { ok: true, result: action.apply(null, args) };
  } catch (error) {
    console.error('SPK RPC JSONP gagal', error);
    payload = {
      ok: false,
      error: {
        message: error && error.message ? error.message : String(error)
      }
    };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
