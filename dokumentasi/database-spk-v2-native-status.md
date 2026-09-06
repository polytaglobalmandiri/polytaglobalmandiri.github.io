# Status Cutover Native V2

Cutover Database SPK V2 telah selesai. Seluruh alur operasional utama menggunakan tabel V2 dan deployment produksi telah diverifikasi.

## Alur native aktif

- Cek keberadaan SPK dan opsi Input.
- Input SPK baru dan Repeat Order.
- Penarikan Data normal serta backfill.
- Edit SPK dari Dashboard.
- Cetak dan Release SPK.
- Dashboard dan polling Tracking.
- Approval dan Serah Terima.
- Keluar Bahan dan ETA Pembelian.

## Pembersihan yang sudah selesai

- Menghapus sheet `Database SPK` dan `SPK Runtime V2` dari produksi.
- Menghapus migrator batch, checkpoint, rollback, dan kontrol dual-write.
- Menghapus fungsi rekonsiliasi/finalisasi cutover yang sudah selesai.
- Menghapus accessor sheet kompatibilitas dan helper nomor baris lama.
- Menghapus penulis/formatter ekstraksi menuju tabel lama.
- Mengganti modul menjadi `BE-Database-V2-Mapping.js` dan `BE-Database-V2-Writer.js`.
- Mengganti lembar audit tulis menjadi `Native Write SPK V2` tanpa mengubah riwayatnya.
- Menghapus lembar log `Migrasi SPK V2` yang tidak lagi dipakai alur aplikasi; salinannya tetap ada di backup cutover.
- Menambahkan audit call graph agar RPC aktif tidak dapat kembali bergantung pada sheet lama.

## Verifikasi wajib

Setiap perubahan backend harus melewati:

1. Pemeriksaan sintaks seluruh file Apps Script.
2. Semua tes `tools/test-database-v2-*.cjs`.
3. `git diff --check`.
4. Deployment versi tetap.
5. `getDatabaseV2Readiness` pada deployment produksi.
6. `getDatabaseV2CutoverAudit` untuk perubahan yang memengaruhi schema atau dependensi spreadsheet.

Backup terpisah tetap dipertahankan untuk pemulihan darurat, bukan untuk pembacaan aplikasi.
