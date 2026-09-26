# Persiapan Uji Schedule dan Produksi

Status 26 September 2026: pengguna memilih memakai spreadsheet operasional secara langsung. Apps Script versi 42 dan halaman GitHub Pages sudah terbit; pemeriksaan baca awal lulus, transaksi nyata belum diuji. Pengujian harus memakai SPK nyata yang memang siap dijadwalkan; jangan membuat transaksi contoh yang menyerupai produksi. Deployment web app versi 41 adalah titik kembali bila rilis baru bermasalah.

## Pemeriksaan sumber aktif

- Akun `clasp --user zulfi` terhubung sebagai `zulfi.polyta@gmail.com` ke project Apps Script yang tercatat pada `gas-deploy/.clasp.json`.
- Deployment web app yang dipakai `assets/js/gas-rpc.js` memakai versi Apps Script 41. Isi versi 41 sama dengan HEAD remote pada pemeriksaan ini (35 berkas).
- Setelah normalisasi akhir baris, perbedaan lokal terhadap remote terbatas pada `BE-Api.js`, `BE-Api-Jsonp.js`, `BE-SPK-Approval.js`, dan dua modul baru `BE-Production-Schedule.js` serta `BE-Production-Entries.js`. Berkas `BE-Input-SPK.js` lokal disamakan dengan versi aktif agar fungsi Mixer, Blowing, dan Printing lama tidak hilang saat deploy.
- Endpoint produksi lama tetap di allowlist sampai seluruh klien lama diinventarisasi dan migrasi per proses selesai. Halaman pilot memakai endpoint baru yang memerlukan sesi dan peran.

## Data yang dipakai

Spreadsheet operasional: `1bvyTfFQ1vvzw5ZVj-QUn-XGiyWifjK0lG-GPd0FO9Aw` (`MASTER-SPK`), pemilik `zulfi.polyta@gmail.com`. Akses metadata terverifikasi melalui akun `clasp --user zulfi`. Pengguna memilih tidak membuat salinan; jangan menggunakan konektor Drive dari akun lain. Sheet `Schedule Produksi` dan `Hasil Produksi` dibuat oleh backend hanya pada mutasi pertama pengguna berizin.

## Skenario penerimaan

1. PPIC masuk, melihat SPK/routing aktif, membuat dua slot pada satu routing, mengubah draf, merilis satu slot, dan melihat slot dirilis pada antrean produksi.
2. PPIC mencoba merilis slot kedua pada mesin dan waktu yang sama; sistem menolak benturan. PPIC dapat membatalkan draf dengan alasan, dan alasan tetap terlihat.
3. Admin produksi memasukkan dua hasil Mixer pada satu slot dalam shift berbeda; jumlah hasil tercatat dan terverifikasi dipisahkan. Pengiriman ulang dengan request ID sama tidak menggandakan entri.
4. Leader Mixer memverifikasi satu entri dan mengembalikan satu entri dengan alasan. Hasil yang dikembalikan tidak masuk total, dan admin dapat membuat entri koreksi baru.
5. PPIC melihat target versus hasil terverifikasi. Pembatalan jadwal yang sudah memiliki entri ditolak. Akun tanpa peran terkait ditolak oleh backend.
6. Periksa baris baru, waktu Asia/Jakarta, nama pengguna, versi, dan alasan pada kedua sheet. Bandingkan hasil di halaman dengan nilai spreadsheet.

## Gerbang rilis

1. Jalankan tes kode lokal, bandingkan source dengan Apps Script aktif, dan catat deployment versi 41 untuk pemulihan.
2. Apps Script dan frontend sudah diperbarui. Pemeriksaan baca saja terhadap endpoint baru lulus; pengguna berizin perlu menguji transaksi pertama pada pekerjaan nyata.
3. Uji pengguna PPIC, admin produksi, dan leader Mixer memakai pekerjaan nyata. Catat hasil setiap skenario; hentikan perluasan proses bila ada kegagalan.
4. Tinjau fungsi produksi lama yang masih dipakai. Tetapkan waktu migrasi dan jalur kembali ke versi 41.

Perluasan ke Blowing, Printing, Slitting/Gusset/Cutting, Bottom Seal/T-Shirt, dan proses lain dilakukan setelah alur dasar lulus uji. Formulir dan satuan tiap proses harus mengikuti kebutuhan kerja dan validasi prosesnya, bukan tata letak Excel lama.
