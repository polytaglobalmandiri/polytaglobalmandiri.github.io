# Audit proyek — 14 September 2026

Basis pemeriksaan: commit `92a4ef9`. Audit awal pada branch
`codex/audit-cleanup-20260914` dipulihkan ke branch `polytapgm-project-testing`
untuk melanjutkan pekerjaan yang terhenti. Checkout sumber tidak diubah.

## Perubahan

- Menghapus empat berkas yang tidak digunakan: modul logout duplikat, lapisan cache eksperimen, dan dua contoh backend lama. Backend aktif tetap memiliki implementasi cache, JSONP, dan master bahan sendiri.
- Menghapus fungsi login cetak yang tidak dipanggil serta pemuatan RPC pada beranda yang tidak memakainya.
- Memperbaiki login cetak: pembukaan ulang tidak menumpuk handler submit, tombol kembali aktif ketika sesi berakhir, dan penutupan dialog membersihkan kata sandi.
- Menghapus data SPK contoh pada fallback dashboard. Koneksi yang tidak tersedia kini menampilkan pesan gagal, bukan data contoh.
- Memperbarui dokumentasi transport/login serta tautan panduan. Mengabaikan dua salinan repositori lokal dari pelacakan Git; salinannya tetap disimpan.
- Mengganti transport operasi nonpublik dengan POST JSON tanpa iframe. Kredensial
  tetap berada di badan POST. Simpan yang responsnya terputus tidak dicoba ulang
  otomatis; pengguna diminta memeriksa hasil transaksi.
- Menyesuaikan halaman diagnostik dengan transport yang benar-benar dipakai;
  token hasil login tidak dicantumkan pada hasil diagnostik.
- Menghapus fallback salinan bahan bawaan yang lama; kegagalan koneksi sekarang
  mengosongkan tabel/ringkasan dan menampilkan pesan yang menetap serta tombol segarkan.
- Menangani tautan cetak tanpa nomor SPK sebelum pemeriksaan cache, kegagalan muat
  data setelah login, dan penutupan login sebelum/saat permintaan berjalan.
- Status cetak tidak lagi berubah menjadi terbit secara lokal ketika koneksi aplikasi
  tidak tersedia; dialog cetak hanya dibuka setelah konfirmasi yang sesuai.
- Menyelaraskan autentikasi halaman Input SPK mandiri dengan helper pada sumber
  wizard GAS. Sebelumnya halaman statis lama tidak meminta login pembuat atau
  mengirim `authToken`, sehingga penyimpanan selalu ditolak backend.

## Validasi lokal

Audit awal menjalankan sembilan skrip. Pengujian lanjutan menambahkan kontrak POST
backend, autentikasi dan hak cetak dengan penyimpanan simulasi, integritas proyek,
serta regresi wrapper desktop. Audit RPC mencakup 50 RPC operasional,
27 panggilan HTML langsung, dan 323 fungsi terjangkau.

Hasil akhir: 13 skrip lokal dengan 24 tes lulus dan dua tes artefak desktop
bersyarat dilewati setelah pembersihan hasil build. Kedua tes artefak tersebut
sudah lulus pada pemeriksaan paket Linux (14/14 tes desktop saat artefak tersedia).
Sebanyak 90 berkas/blok JavaScript lulus pemeriksaan sintaks dan 232 referensi
HTML lokal tersedia.

Pemeriksaan sintaks mencakup JavaScript aplikasi dan blok inline HTML, termasuk
template GAS setelah placeholder disisihkan untuk pemeriksaan sintaks. Referensi
aset/halaman lokal HTML statis diperiksa; tautan template GAS, pustaka vendor,
dan paket desktop tidak dimasukkan dalam hitungan integritas portal.
Build lima halaman dari sumber GAS berhasil ke folder terpisah, tanpa menimpa
halaman statis yang memiliki pengembangan tambahan.

`tools/browser-smoke.cjs` mencakup 47 skenario Chrome: 17 halaman pada lebar
1440 dan 390 piksel, pencarian/tema/pin portal, login pembuat SPK dan Persetujuan,
serta alur bahan, serah terima, cetak, dan diagnostik. Semua RPC dicegat dan disimulasikan; tidak
ada transaksi produksi. Pengujian meliputi tombol kembali aktif setelah gagal,
login salah, remember/session-only, logout, hak cetak, tanda tangan serah terima,
simulasi simpan, kegagalan jaringan, dan pencegahan pengiriman ulang otomatis.
Halaman dicek terhadap galat JavaScript dan aset lokal yang gagal dimuat.
Skenario pengiriman Input SPK mengisolasi autentikasi dan penyertaan token dengan
validasi wizard yang disimulasikan; bukan uji semua isian/aturan formulir.

Cara menjalankan ulang tersedia pada [panduan SPK](../apps/spk-automation/README.md#pengujian-lokal).

## Paket desktop

Ditemukan dan diperbaiki masalah konfigurasi kemasan: varian Administrator
sebelumnya membawa identitas Portal, kedua paket Debian memakai identitas/launcher
yang sama, dan pembuatan metadata pembaruan menyebabkan build Linux gagal.
Konfigurasi sekarang membedakan identitas kedua aplikasi dan menonaktifkan
penerbitan otomatis electron-builder; unggahan rilis tetap melalui workflow tag.

Kedua perintah build Linux selesai dengan exit code 0 dan menghasilkan AppImage
serta Debian. Pemeriksaan ASAR memastikan metadata produk memilih rute yang tepat;
nama paket dan launcher Debian juga terpisah. Delapan URL unduhan lama merespons
HTTP 200. Paket/cache hasil pengujian sudah dibersihkan, tanpa mengubah versi
aplikasi atau mengganti berkas rilis yang sudah diterbitkan.

Perbaikan konfigurasi berlaku untuk build berikutnya. **Installer desktop yang
sudah diterbitkan belum diganti** dan perlu rilis baru untuk memuat perbaikan ini.
Instalasi/GUI native Linux serta build/eksekusi Windows dan macOS tidak dilakukan
dalam lanjutan audit ini.

## Pengukuran endpoint aktif pada audit awal

Pengukuran satu kali per operasi, kecuali opsi formulir yang diulang setelah timeout. Durasi mencakup jaringan dan server; ini bukan benchmark atau jaminan waktu respons.

| Operasi | Hasil | Durasi |
| --- | --- | --- |
| Detail satu SPK | Ditemukan | 15,3 detik |
| Master bahan | Respons berhasil | 5,5 detik |
| Dashboard | Respons berhasil, 9.092 SPK, sekitar 2,68 MB | 38,8 detik |
| Opsi formulir | Percobaan pertama timeout; pengulangan berhasil, 19 marketing dan 417 customer | >90 detik; lalu 12,1 detik |

Hasil awal menunjukkan latensi tinggi dan tidak konsisten.

## Pengukuran ulang melalui Chrome

Pengukuran berikut memakai frontend lokal yang diperbaiki dan endpoint produksi
yang sama, satu kali per operasi. Pengujian tidak memasukkan password maupun token
akun nyata, dan tidak menjalankan fungsi transaksi.

| Operasi | Hasil | Durasi |
| --- | --- | --- |
| Pemeriksaan sesi dengan token kosong, POST | Ditolak sebagaimana mestinya; JSON diterima tanpa frame | 3,6 detik |
| Master bahan, POST | 672 baris diterima | 10,4 detik |
| Revisi dashboard, JSONP | Respons revisi berhasil | 2,9 detik |
| Dashboard, JSONP + kompresi | 9.092 SPK diterima | 4,2 detik |

Transport POST/JSONP berhasil di Chrome pada lingkungan ini. Angka tersebut bukan
benchmark sebelum/sesudah yang terkendali: cache dan jaringan dapat berbeda.
Pemuatan bahan masih terasa lambat, dan cold start Apps Script tetap dapat
memperlambat respons. Tidak ada klaim semua operasi selalu cepat.

## Batas pemeriksaan

Tidak menjalankan transaksi simpan/edit/hapus SPK, persetujuan, cetak berotorisasi,
atau serah terima terhadap data produksi. Alur transaksi browser memakai simulasi;
fungsi login, sesi, dan hak release backend diuji dengan penyimpanan simulasi.
Getter opsi mesin dapat melakukan inisialisasi otomatis bila tabel kosong; karena
itu pengukuran ulang tidak memanggil getter ini atau fungsi bootstrap.

Tidak menguji printer fisik, kamera/perizinan Android nyata, semua browser,
atau seluruh kombinasi formulir SPK. UAT dengan akun dan data uji yang disetujui
tetap diperlukan untuk memvalidasi kondisi operasional perusahaan.

Penerbitan frontend melalui GitHub Pages tidak memperbarui deployment Apps Script.
Endpoint produksi sudah mendukung POST JSON yang digunakan, sehingga perubahan
transport tidak membutuhkan deployment backend baru. Perubahan template GAS dan
penghapusan modul tidak mengubah source/deployment GAS yang sedang berjalan.
