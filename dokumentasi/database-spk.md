# Struktur Database SPK

Dokumen ini mencatat perubahan struktur visual pada sheet `Database SPK` di
spreadsheet `MASTER DATA PPIC` (sebelumnya `DATABASE SPK TERPADU` dan
`DATABASE PO & SPK`). Perubahan pada 30 Agustus 2026 tidak mengubah
nilai, formula, urutan, ataupun alamat kolom yang dipakai aplikasi.

Nama file diselaraskan setelah struktur versi 2 dibuat. ID spreadsheet tetap
`1GldWp316hXRGKOa-ANJ4Eugdz0HFZSxvFQGy-dcex48`, sehingga tautan, izin akses,
dan integrasi aplikasi berbasis ID tetap berlaku.

## Backup

Sebelum perapian dibuat salinan penuh bernama:

`BACKUP DATABASE PO & SPK - sebelum perapian struktur 2026-08-30`

ID file backup: `1igPsVWNcAvEMytvsRoB0Meqtgextrh_PNlsPKLDDZpw`

Sebelum pembuatan struktur SPK versi 2 dibuat salinan penuh kedua bernama:

`BACKUP DATABASE PO & SPK - sebelum struktur SPK V2 2026-08-30`

ID file backup: `12LA3X6aFk4TrllSRE6EpbSUGMSf8JQHJ17UePfAKn0I`

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

## Struktur SPK versi 2

Struktur baru ditempatkan di file spreadsheet yang sama agar pengelolaan,
otoritas akses, dan pencarian data tetap sederhana. `Database SPK` tetap
menjadi sumber aktif aplikasi selama masa transisi.

### SPK Master

`SPK Master` adalah tampilan inti otomatis dari `Database SPK`. Sheet ini
memilih 33 kolom utama dari 150 kolom lama menggunakan satu formula array,
sehingga SPK baru ikut muncul tanpa input ulang.

- Kolom identitas, PO, customer, artikel, jumlah, ETD, release, dan tracking
  ditampilkan sebagai data utama.
- Kolom spesifikasi `H:M` dan informasi tambahan `W:AG` dikelompokkan serta
  dilipat secara default, tetapi tetap dapat dibuka saat diperlukan.
- Baris header dan kolom SPK dibekukan; filter dan format tanggal/angka telah
  disiapkan.
- Sheet ini merupakan tampilan terkelola. Input dan perubahan operasional
  tetap dilakukan melalui aplikasi atau `Database SPK` selama masa transisi.

### Sheet detail

Sheet berikut disiapkan sebagai tabel terpisah agar satu SPK dapat memiliki
banyak detail tanpa terus menambah kolom ke kanan:

- `SPK Routing`: urutan proses, mesin, parameter, target BS, status, dan waktu.
- `SPK Bahan`: komposisi serta kebutuhan bahan per SPK.
- `SPK Warna`: warna, pemakaian, UOM, dan kode silinder.
- `SPK Pengiriman`: jadwal dan realisasi kuantitas pengiriman.
- `SPK ETA`: riwayat estimasi tanggal serta kuantitas.
- `SPK Aksesoris`: kebutuhan aksesoris yang dapat dihubungkan ke routing.
- `SPK Tracking`: histori status dan posisi routing.

Setiap sheet detail memiliki ID baris, kolom `SPK` sebagai penghubung, urutan,
sumber data, serta waktu pembuatan/pembaruan bila relevan. Header, filter,
format, kolom beku, dan lebar kolom sudah distandarkan.

Sheet detail sengaja belum dijadikan sumber tulis aplikasi. Migrasi isi lama
dan mekanisme dual-write harus dilakukan setelah pemetaan setiap blok kolom
lama ke baris detail selesai diuji. Tahapan ini mencegah kehilangan informasi
atau perubahan hasil Penarikan Data, Input SPK, Approval, dan Cetak SPK.

## Aturan pengembangan berikutnya

- Jangan menghapus atau memindahkan kolom `Database SPK` sebelum seluruh
  pembacaan `DB_COL` dipindahkan ke lapisan data versi 2.
- Gunakan kontrak skema dan pemetaan pada
  [`database-spk-v2-mapping.md`](database-spk-v2-mapping.md). Jalankan validator
  baca-saja sebelum mengembangkan migrator atau dual-write.
- Gunakan `SPK` sebagai kunci relasi; gunakan ID detail unik untuk setiap
  routing, bahan, warna, pengiriman, ETA, aksesoris, dan tracking.
- Terapkan dual-write dan uji perbandingan data sebelum satu per satu fitur
  dialihkan dari struktur lama.
- Setelah semua pembacaan dan penulisan tervalidasi, `Database SPK` dapat
  dipertahankan sebagai arsip kompatibilitas atau dihentikan secara terencana.

## Rollback tampilan

Jika tampilan perlu dikembalikan, buka ketiga kelompok kolom atau hapus
dimension group tanpa menghapus kolomnya. File backup di atas digunakan hanya
untuk pemulihan darurat dan tidak menjadi sumber data aplikasi.
