# Struktur Database SPK Native V2

Spreadsheet produksi `MASTER DATA PPIC` memakai delapan tabel V2 sebagai satu-satunya sumber transaksi aplikasi. Sheet `Database SPK` dan `SPK Runtime V2` telah dihapus pada 5 September 2026 setelah audit dependensi, pengujian salinan, dan smoke test produksi lulus.

## Tabel aktif

| Sheet | Fungsi | Kunci |
| --- | --- | --- |
| `SPK Master` | Identitas, order, spesifikasi, dan ringkasan SPK | `SPK` |
| `SPK Routing` | Urutan proses dan parameter produksi | `Routing ID` |
| `SPK Bahan` | Komposisi dan kebutuhan bahan | `Bahan ID` |
| `SPK Warna` | Warna dan pemakaian tinta | `Warna ID` |
| `SPK Pengiriman` | Jadwal pengiriman | `Pengiriman ID` |
| `SPK ETA` | Jadwal kedatangan bahan | `ETA ID` |
| `SPK Aksesoris` | Aksesoris per SPK/routing | `Aksesoris ID` |
| `SPK Tracking` | Riwayat status produksi | `Tracking ID` |

Semua tabel detail memakai `SPK` sebagai foreign key. Aksesoris dan tracking dapat memakai `Routing ID`. ID detail dibuat deterministik agar retry tidak menghasilkan duplikasi.

## Alur data

- Input SPK dan Penarikan Data membentuk record sesuai jenis tabelnya, lalu melakukan commit native V2.
- Edit, Release, Keluar Bahan, ETA, dan backfill memakai mutasi agregat SPK di dalam lock.
- Writer memeriksa konflik sebelum menulis dan membaca kembali setiap perubahan sebelum transaksi dinyatakan berhasil.
- Repeat Order, Cetak, Dashboard, Approval, dan Serah Terima membaca agregat V2 berdasarkan ID bisnis, bukan nomor baris.
- Record baru bertanda sumber `APLIKASI NATIVE V2`.
- Riwayat commit native dicatat pada sheet `Native Write SPK V2`; sheet itu merupakan audit, bukan sumber data aplikasi.

## Aturan pengembangan

- Jangan membuat kembali `Database SPK`, `SPK Runtime V2`, atau tabel transaksi 150 kolom.
- Gunakan repository V2 untuk membaca dan writer V2 untuk menulis.
- Jangan memakai nomor baris sebagai identitas bisnis.
- Jalur tulis baru harus memvalidasi foreign key, memakai lock, dan melakukan verifikasi baca-balik.
- Jalankan seluruh tes `tools/test-database-v2-*.cjs`, validator, readiness, dan audit setelah perubahan schema.

## Backup

Backup sebelum penghapusan database lama:

- Nama: `MASTER DATA PPIC - Backup sebelum hapus database lama - 2026-09-05`
- ID: `16UWDhxVf-5mktKzQIJg1J0wVMYj7NEXlDhl5mIDlCoM`

Backup hanya untuk pemulihan darurat dan tidak boleh dijadikan sumber aplikasi.
