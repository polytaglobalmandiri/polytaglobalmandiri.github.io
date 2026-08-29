# Struktur Database SPK

Dokumen ini mencatat perubahan struktur visual pada sheet `Database SPK` di
spreadsheet `DATABASE PO & SPK`. Perubahan pada 30 Agustus 2026 tidak mengubah
nilai, formula, urutan, ataupun alamat kolom yang dipakai aplikasi.

## Backup

Sebelum perapian dibuat salinan penuh bernama:

`BACKUP DATABASE PO & SPK - sebelum perapian struktur 2026-08-30`

ID file backup: `1igPsVWNcAvEMytvsRoB0Meqtgextrh_PNlsPKLDDZpw`

## Perapian tahap pertama

- Tiga baris teratas dibekukan. Baris 1-2 tetap menjadi header dan data tetap
  dimulai pada baris 4.
- Kolom `K:AQ` dikelompokkan sebagai spesifikasi, proses produksi, target BS,
  dan perhitungan mesin.
- Kolom `AX:CO` dikelompokkan sebagai komposisi bahan dan warna tinta.
- Kolom `CS:ES` dikelompokkan sebagai keterangan proses, ETA, detail routing,
  pengiriman, ukuran manual, dan aksesoris.
- Ketiga kelompok dibuat terlipat secara default dan dapat dibuka dengan
  tombol `+` pada header kolom.
- Kolom inti, filter, formula, serta kolom `Tracking` di `ET` tetap pada posisi
  semula.

## Kompatibilitas

Backend masih menggunakan posisi kolom tetap melalui `DB_COL`. Karena itu
kolom tidak boleh dihapus, dipindahkan, atau diganti namanya sebelum lapisan
kompatibilitas dan migrasi database versi berikutnya selesai diuji.

Pengelompokan dan pembekuan baris hanya mengubah tampilan Google Sheets dan
tidak mengubah pembacaan oleh Input SPK, Penarikan Data, Dashboard, Approval,
Cetak SPK, Repeat Order, maupun Serah Terima.

## Rollback tampilan

Jika tampilan perlu dikembalikan, buka ketiga kelompok kolom atau hapus
dimension group tanpa menghapus kolomnya. File backup di atas digunakan hanya
untuk pemulihan darurat dan tidak menjadi sumber data aplikasi.
