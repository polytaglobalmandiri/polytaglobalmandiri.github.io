/**
 * Jalur cadangan JSONP untuk assets/js/gas-rpc.js
 * ==============================================
 *
 * KENAPA INI ADA
 *
 * Transport bawaan gas-rpc.js mengirim form POST ke /exec. Apps Script
 * membalasnya dengan halaman shell di script.google.com, dan shell itu
 * menyisipkan iframe kedua dari *.googleusercontent.com. Iframe kedua itulah
 * yang menjalankan window.parent.parent.postMessage berisi hasilnya.
 *
 * Artinya setiap panggilan bergantung pada sebuah frame pihak ketiga yang
 * bersarang dua lapis. Chrome versi baru memblokir penyimpanan pihak ketiga
 * secara bawaan, dan ekstensi pemblokir iklan maupun penyaring jaringan kantor
 * kerap menutup googleusercontent.com. Ketika frame itu tidak jalan, jawabannya
 * sudah ada di server tetapi tidak pernah sampai ke halaman - dan dari sisi
 * pengguna terlihat seperti "server tidak merespons", padahal server menjawab
 * dalam dua detik.
 *
 * Muatan <script> tidak punya masalah itu. Tidak ada frame, tidak ada cookie
 * pihak ketiga, dan hanya satu perjalanan bolak-balik - bukan dua. Jadi jalur
 * ini sekaligus lebih cepat daripada transport iframe.
 *
 * gas-rpc.js sudah siap memakainya: jalur ini baru dicoba setelah transport
 * iframe terbukti gagal di perangkat tersebut, dan berhenti dicoba begitu
 * server menolaknya. Jadi memasang berkas ini tidak mengubah apa pun bagi
 * pengguna yang selama ini lancar.
 *
 * CATATAN JUJUR: ContentService juga dilayani lewat googleusercontent.com.
 * Bila yang memblokir adalah penyaring DNS tingkat jaringan, jalur ini ikut
 * mati dan yang harus dilakukan adalah membuka domain itu di sisi IT. Jalur ini
 * menolong untuk penyebab yang jauh lebih umum: pemblokiran cookie/frame pihak
 * ketiga di peramban.
 *
 *
 * CARA PASANG
 *
 * 1. Buka proyek Apps Script SPK, buat berkas baru bernama JsonpEndpoint.gs,
 *    lalu tempelkan seluruh isi berkas ini.
 *
 * 2. Cari fungsi doGet(e) yang sudah ada, dan sisipkan dua baris ini sebagai
 *    baris pertama di dalamnya:
 *
 *        function doGet(e) {
 *          var jsonp = serveRpcJsonp_(e);
 *          if (jsonp) return jsonp;
 *          ...isi doGet yang lama, biarkan apa adanya...
 *        }
 *
 * 3. Deploy > Kelola deployment > pilih deployment yang sedang dipakai >
 *    ikon pensil > Versi: Versi baru > Deploy.
 *
 *    PENTING: perbarui deployment yang SUDAH ADA, jangan buat deployment baru.
 *    Deployment baru menghasilkan URL /exec yang berbeda, dan API_URL di
 *    assets/js/gas-rpc.js harus ikut diganti bila itu terjadi.
 *
 * 4. Uji tanpa membuka situs sama sekali - tempel di bilah alamat:
 *
 *    https://script.google.com/macros/s/<ID_DEPLOYMENT>/exec?callback=__polytaGasJsonp.uji&payload=%7B%22method%22%3A%22getApprovalBootstrapStatus%22%2C%22args%22%3A%5B%5D%7D
 *
 *    Berhasil bila yang muncul teks diawali __polytaGasJsonp.uji({"ok":true,...
 *    Bila yang muncul halaman aplikasi PPIC, berarti langkah 2 belum kena.
 */

/**
 * Hanya metode di daftar ini yang boleh dipanggil lewat JSONP.
 *
 * Daftar putih, bukan daftar hitam: doGet dapat dipanggil siapa saja tanpa
 * kredensial, jadi permukaan yang terbuka harus disebut satu per satu. Setiap
 * metode di sini tetap memeriksa tokennya sendiri seperti biasa - yang berubah
 * hanya jalan masuknya, bukan aturan kewenangannya.
 */
var RPC_JSONP_ALLOWED = {
  getApprovalBootstrapStatus: true,
  getApprovalSession: true,
  loginApprovalUser: true,
  logoutApprovalUser: true,
  bootstrapApprovalAdmin: true,
  getApprovalQueue: true,
  approveSpk: true,
  getSpkApprovalStatus: true,
  getSpkApprovalSignatures: true,
  listApprovalUsers: true
};

/**
 * Membalas permintaan JSONP, atau null bila ini bukan permintaan JSONP.
 *
 * Mengembalikan null penting: doGet yang sama tetap harus melayani halaman
 * aplikasi seperti sebelumnya untuk semua permintaan biasa.
 */
function serveRpcJsonp_(e) {
  var callback = e && e.parameter ? e.parameter.callback : '';
  // Nama callback masuk mentah-mentah ke badan respons, jadi bentuknya dikunci
  // ketat. Hanya nama yang dibangkitkan gas-rpc.js yang lolos.
  if (!callback || !/^__polytaGasJsonp\.[A-Za-z0-9_]{1,40}$/.test(callback)) return null;

  var body;
  try {
    body = { ok: true, result: runRpcJsonpMethod_(e.parameter.payload) };
  } catch (error) {
    body = { ok: false, error: { message: (error && error.message) || String(error) } };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(body) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function runRpcJsonpMethod_(rawPayload) {
  var payload;
  try {
    payload = JSON.parse(rawPayload || '{}');
  } catch (error) {
    throw new Error('Muatan permintaan tidak terbaca.');
  }

  var method = payload && payload.method;
  if (typeof method !== 'string' || !method) throw new Error('Metode tidak disebutkan.');
  if (RPC_JSONP_ALLOWED[method] !== true) throw new Error('Metode tidak diizinkan: ' + method);

  var target = globalThis[method];
  if (typeof target !== 'function') throw new Error('Metode tidak ditemukan: ' + method);

  var args = payload.args;
  return target.apply(null, Object.prototype.toString.call(args) === '[object Array]' ? args : []);
}
