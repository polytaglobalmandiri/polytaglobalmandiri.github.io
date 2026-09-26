# Project Handoff — Halaman Produksi

> Pembaruan alur: SPK masuk ke Schedule Produksi sebelum pekerjaan muncul pada halaman Produksi. Rancangan sistem yang menjadi acuan pengembangan berikutnya ada di `dokumentasi/sistem-produksi.md`. Contoh Excel adalah referensi kerja lapangan, bukan format database aplikasi. Prototipe Mixer di bawah belum siap dipakai untuk transaksi operasional karena satu kali simpan langsung menutup routing.

> Pilot lokal baru telah ditambahkan di `apps/spk-automation/schedule/` dan halaman `apps/spk-automation/production/` telah diganti dengan pencatatan hasil berulang. Backend baru ada di `gas-deploy/BE-Production-Schedule.js` dan `BE-Production-Entries.js`. Belum ada deployment atau perubahan spreadsheet produksi.

Dokumen ini menjadi titik mulai untuk pengembangan berikutnya pada project POLYTA GLOBAL MANDIRI.

## Tujuan berikutnya

Membangun halaman Produksi yang dimulai dari routing Mixer, kemudian dilanjutkan ke Blowing, Printing, Slitting, Bottom Seal, dan Side Seal.

## Status terakhir

Halaman Produksi Mixer sudah memiliki prototipe lokal di:

`apps/spk-automation/production/index.html`

Fungsi yang sudah tersedia:

- Menampilkan antrean SPK aktif dengan routing Mixer.
- Mengambil data dari database melalui `getProductionMixerData`.
- Filter pencarian dan status.
- Modal input hasil produksi.
- Input hasil produksi, mesin, shift, operator, pemakaian bahan, dan keterangan.
- Menyimpan hasil produksi melalui `saveProductionMixerEntry`.
- Routing yang sudah selesai dikunci dan tidak dapat disimpan ulang.
- Data contoh tetap digunakan saat halaman dibuka tanpa koneksi Apps Script.

## Backend yang sudah tersedia

File utama:

- `gas-deploy/BE-Input-SPK.js`
- `gas-deploy/BE-Api.js`

Endpoint yang tersedia:

- `getProductionMixerData(forceRefresh)`
- `saveProductionMixerEntry(payload)`

Data produksi sementara disimpan pada `Payload JSON` di sheet `SPK Routing`. Belum dibuat sheet baru untuk hasil produksi.

## Navigasi

Menu Produksi sudah ditempatkan pada Portal PPIC melalui:

- `assets/js/data.js`

URL halaman:

`/apps/spk-automation/production/`

## Referensi laporan

Contoh laporan produksi tersimpan di folder:

`sample-lhp/`

File yang tersedia:

- `LH MIXER 17092026.xlsx`
- `HASIL BLOWING TGL 16 SEPTEMBER 2026.xlsx`
- `LAPORAN PRINTING TGL 17 SEPTEMBER 2026 P.xlsx`
- `LHP SLITTING 17 SEPTEMBER 2026.xlsx`
- `LAPORAN BOTTOM SEAL 060726.xlsx`
- `PRODUKSI SIDESEAL 060726.xlsx`

## Pekerjaan berikutnya

1. Uji halaman Mixer dengan data database nyata.
2. Pastikan satu SPK dapat memiliki beberapa routing Mixer tanpa duplikasi tampilan.
3. Ubah pemakaian bahan dari textarea bebas menjadi daftar bahan terstruktur:
   - Nama bahan
   - Jenis resin
   - Jumlah KG
   - Kode bahan
4. Tambahkan hasil sebelumnya, hasil hari ini, sisa order, dan persentase pencapaian.
5. Tambahkan validasi agar hasil produksi tidak melebihi aturan order tanpa konfirmasi.
6. Tambahkan riwayat perubahan produksi.
7. Setelah Mixer stabil, lanjutkan pemetaan dan halaman Blowing.
8. Tambahkan hak akses operator, leader, dan PPIC.
9. Pertimbangkan pemindahan data produksi dari `Payload JSON` ke tabel khusus setelah struktur bisnis disepakati.

## Catatan penting

- Jangan membuat mode bangun ulang database.
- Jangan menghapus atau mengosongkan data spreadsheet tanpa salinan terlebih dahulu.
- Nama yang tampil kepada pengguna tidak perlu mencantumkan tulisan versi internal.
- Status SPK yang digunakan untuk antrean produksi saat ini adalah `Q`.
- File `gas-deploy/.clasp.json` adalah konfigurasi lokal dan tidak boleh di-commit.

## Deployment terakhir

- Apps Script deployment terakhir: `@30`
- Commit terakhir sebelum dokumen ini: `b434da4`
- Commit navigasi Portal PPIC: `a2e6e8c`

