# Otomasi SPK

Antarmuka Otomasi SPK diterbitkan melalui GitHub Pages pada `/apps/spk-automation/`, sedangkan logika bisnis dan akses lembar kerja tetap berjalan pada Google Apps Script.

## Arsitektur

- Frontend: halaman-halaman statis SPK, termasuk Serah Terima, di folder ini.
- Transport: `assets/js/gas-rpc.js` menyesuaikan pemanggilan `google.script.run` melalui JSONP untuk pembacaan publik serta POST JSON tanpa iframe untuk operasi lainnya; respons dashboard dapat dikompresi.
- Backend: project GAS `1X4f-lJts_2H_rQBP6Q7G61FVeAPOuO5O0SLw_HvWUlP2UE9ePputw156`, deployment Versi 8 (16 September 2026).
- Endpoint: https://script.google.com/macros/s/AKfycbwgMIuKAdI8PpXyrTgXaNbbpoCi6JXlxCTxuScwEShcv2fCkIjv8NhmVio1tikASSYg/exec.
- Database: `1bvyTfFQ1vvzw5ZVj-QUn-XGiyWifjK0lG-GPd0FO9Aw`.

Portal utama dapat dibuka tanpa login. Login diperlukan pada halaman Persetujuan dan saat menjalankan proses cetak yang memerlukan sesi. Token sesi disimpan pada `localStorage` ketika pengguna memilih **Ingat saya**, atau `sessionStorage` untuk sesi sementara. Sesi kedaluwarsa meminta login kembali pada alur terkait.

Backend hanya menerima nama fungsi yang dicantumkan dalam allowlist `SPK_RPC_METHODS_` pada `BE-Api.js`. Fungsi lain ditolak.

POST mengirim JSON dengan `Content-Type: text/plain;charset=UTF-8` agar tidak memerlukan
preflight. Password dan token tetap berada dalam badan POST, bukan URL. Operasi simpan
tidak dicoba ulang otomatis: jika respons terputus, periksa hasil transaksi sebelum
mengirim ulang. Halaman diagnostik menguji transport POST yang sama.

Kegagalan pemuatan tidak diganti dengan data contoh pada dashboard/cetak atau salinan
bahan bawaan yang lama. Bahan & Tinta menampilkan pesan gagal dan menyediakan tombol
segarkan. Kecepatan respons tetap bergantung pada backend Apps Script dan jaringan.

## Pengujian lokal

Dari akar repositori, gunakan Node.js 22 atau lebih baru:

```sh
node --test tools/test-*.cjs
```

Tes ini mencakup logika backend dengan layanan Google yang disimulasikan, transport,
login cetak, integritas JavaScript/tautan HTML lokal, serta wrapper desktop dan Android. Tidak ada
transaksi produksi yang dijalankan.

Pengujian Chrome memerlukan server lokal, Chrome terpasang, dan Playwright. Contoh
di Linux, jalankan server di terminal pertama:

```sh
python3 -m http.server 5517 --bind 127.0.0.1
```

Di terminal kedua:

```sh
npm install --prefix .cache/browser-tools --no-audit --no-fund playwright
NODE_PATH="$PWD/.cache/browser-tools/node_modules" node tools/browser-smoke.cjs
```

`CHROME_PATH` dapat diisi dengan lokasi Chrome selain `/usr/bin/google-chrome`.
`TEST_BASE_URL` hanya menerima server localhost. Skrip memblokir layanan eksternal
dan mensimulasikan seluruh RPC, termasuk simpan bahan, serah terima, login, dan
penandaan cetak. Kelulusan simulasi tidak menggantikan UAT dengan akun berizin.

## Memperbarui frontend dari GAS

Setelah kode frontend pada GAS ditarik menggunakan `clasp clone`, jalankan:

```powershell
node .\tools\build-spk-frontend.mjs "C:\lokasi\hasil-clone-gas"
```

Proses tersebut memperluas partial HTML, mengganti navigasi GAS menjadi rute GitHub Pages, memasang transport RPC, menyisipkan aset statis bersama (`responsive.css`, `status.css`, `status.js`, `responsive-header.js`, `modal-scroll-lock.js`, `footer-reveal.js`, serta modul routing untuk halaman berwizard), dan membentuk ulang lima halaman: `index.html`, `create-spk/`, `material-issue/`, `data-retrieval/`, dan `print-spk/`.

Halaman `handover/` tidak dibangun dari GAS. Halaman itu hanya ada sebagai berkas statis di repositori ini, jadi jangan menghapusnya saat menyegarkan halaman lain.

## Serah Terima per routing

Halaman `handover/` memindai QR yang berisi nomor SPK, mengambil rincian SPK melalui `getHandoverSpkDetails`, lalu mengelompokkan SPK ke Mixer, Blowing, Printing, Folding, Slitting, Gusset, dan Cutting. Routing yang sama dari beberapa SPK digabung dalam satu kelompok.

Nama penerima dan bukti disimpan terpisah untuk setiap routing melalui `saveHandoverByRouting`. Satu baris pada sheet `Serah Terima SPK` mewakili satu routing/divisi dan dapat berisi beberapa nomor SPK. Kolom `KODE ROUTING` dan `NAMA DIVISI` dipakai untuk mencegah routing SPK yang sama diserahkan dua kali. Implementasi backend berada pada `BE-Serah-Terima.js` di project GAS.

### Periksa selisihnya sebelum menimpa

Bawaannya hasil build ditulis ke `tools/.build-spk/`, **bukan** ke folder yang terbit. Bandingkan dulu:

```powershell
git diff --no-index apps/spk-automation tools/.build-spk
```

Jika hasilnya sudah benar, jalankan ulang dengan `--timpa` untuk menulis ke folder aplikasi. Argumen kedua juga boleh diisi direktori lain bila ingin menyimpan hasilnya di tempat sendiri.

> **Perhatian.** Per 12 Agustus 2026 sumber GAS tertinggal dari halaman yang terbit: sebagian pengembangan dikerjakan langsung pada berkas statis di sini dan belum dikembalikan ke GAS. Membangun ulang sekarang akan menghapus pengalih bahasa pada Penarikan Data, tombol Portal PPIC pada semua halaman, serta penyeragaman istilah Indonesia. Kembalikan dulu perubahan itu ke berkas `FE-*.html` di project GAS sebelum memakai `--timpa`.

Versi aset lokal terdaftar pada `assetVersions` di dalam skrip. Naikkan nilainya setiap berkas aset diubah supaya browser tidak memakai salinan lama.

## Tampilan saat jaringan putus atau terjadi galat

Seluruh keadaan tidak normal memakai satu lapisan bersama:

- `assets/css/status.css` — bentuk baku pita luring dan panel galat.
- `assets/js/status.js` — pemantau jaringan, panel galat, dan pengganti dialog.
- `offline.html` — halaman berdiri sendiri tanpa satu pun permintaan ke luar.

Lapisan ini sengaja tidak memakai pustaka apa pun. Pita luring yang lama digambar oleh Alpine yang diunduh dari CDN, sehingga justru tidak pernah muncul pada saat jaringan benar-benar putus. Berkas pengganti ini juga memasang dua penyelamat: elemen bertanda `x-cloak` dilepas sendiri bila Alpine tidak sampai, dan `Swal.fire` digantikan panel baku bila SweetAlert2 tidak sampai.

Halaman dapat memanggilnya sendiri ketika tahu dirinya gagal:

```js
PolytaStatus.loadFailed('Data SPK belum dapat dimuat.', pesanTeknis, function () {
  muatUlangData();
});
```

Versi Apps Script tidak dapat memuat berkas terpisah, jadi salinan sebarisnya dibangkitkan dari sumber yang sama:

```powershell
node .\tools\build-status-partial.mjs "C:\lokasi\proyek-gas"
```

Perintah itu menulis ulang `FE-Polyta-Status.html`. Jalankan `clasp push` sesudahnya. Jangan menyunting partial tersebut langsung — isinya akan tertimpa.

Aplikasi desktop memakai bentuk yang sama: `desktop/installer/DesktopApp.cs` menggambar halaman status di dalam jendela lewat `NavigateToString`, bukan kotak pesan Windows. Kotak pesan hanya tersisa untuk keadaan WebView2 Runtime belum terpasang, karena pada keadaan itu tidak ada yang bisa menggambar halaman. Perubahan pada berkas itu baru berlaku setelah installer dibangun ulang dengan `desktop/installer/build-installer.ps1`.
