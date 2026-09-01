# Pemetaan Database SPK V2

Dokumen ini adalah kontrak migrasi dari `Database SPK` yang masih berbentuk
satu tabel lebar ke struktur relasional SPK versi 2. Kontrak yang dapat dibaca
aplikasi berada di `gas-deploy/BE-Database-V2.js`.

## Tujuan tahap ini

- Menetapkan nama sheet dan header kanonis.
- Mendokumentasikan asal data pada struktur lama.
- Memeriksa integritas kunci tanpa menulis atau mengubah data.
- Menjadi pagar pengaman sebelum dual-write dan migrasi isi diaktifkan.

Tahap ini **belum** memindahkan data, mengubah formula, atau mengganti sumber
baca aplikasi.

## Relasi

`SPK Master` memiliki satu baris per SPK. Semua tabel detail memakai `SPK`
sebagai foreign key dan ID detail unik sebagai primary key.

| Sheet | Primary key | Hubungan tambahan |
| --- | --- | --- |
| `SPK Master` | `SPK` | — |
| `SPK Routing` | `Routing ID` | `SPK` |
| `SPK Bahan` | `Bahan ID` | `SPK` |
| `SPK Warna` | `Warna ID` | `SPK` |
| `SPK Pengiriman` | `Pengiriman ID` | `SPK` |
| `SPK ETA` | `ETA ID` | `SPK` |
| `SPK Aksesoris` | `Aksesoris ID` | `SPK`, opsional `Routing ID` |
| `SPK Tracking` | `Tracking ID` | `SPK`, opsional `Routing ID` |

## Pemetaan sumber lama

| Target V2 | Sumber `Database SPK` | Isi |
| --- | --- | --- |
| `SPK Master` | `A:S`, `AR:AW`, `CP:CR` | Identitas, spesifikasi, konversi, order, ETD, referensi, dan release |
| `SPK Routing` | `T:AN`, `DS:DZ`, `ED` | Proses, target BS, detail proses, dan routing JSON |
| `SPK Bahan` | `G`, `AX:BU`, `EB` | Bahan utama, komposisi, total, dan keterangan bahan |
| `SPK Warna` | `BV:CO`, `DU`, `EA` | Warna, pemakaian, kode silinder, dan keterangan warna |
| `SPK Pengiriman` | `AW`, `EL` | ETD utama dan pengiriman parsial |
| `SPK ETA` | `DB:DQ` | Riwayat ETA pembelian dan keterangannya |
| `SPK Aksesoris` | `ED`, `EQ:ES` | Detail per routing dan ringkasan kebutuhan aksesoris |
| `SPK Tracking` | `ED`, `ET` | Posisi routing dan status tracking kompatibilitas |

Jika nilai terstruktur tersedia di kolom JSON seperti `ED`, nilai itu menjadi
sumber detail utama. Kolom lama yang tersebar tetap dipakai untuk pembanding
dan kompatibilitas sampai hasil migrasi tervalidasi.

## Validator baca-saja

Jalankan fungsi `logDatabaseV2Validation` dari editor Apps Script. Fungsi ini:

1. Memastikan delapan sheet V2 tersedia.
2. Mencari header pada sepuluh baris pertama dan menerima beberapa alias nama.
3. Memeriksa header wajib, duplikasi header, ID kosong, dan ID duplikat.
4. Memastikan setiap `SPK` detail mempunyai induk di `Database SPK`.
5. Memberikan `summary.readyForDualWrite` tanpa menulis ke Spreadsheet.

Hasil lengkap dicetak sebagai JSON pada execution log. Secara default maksimal
20.000 baris per sheet diperiksa untuk menjaga kuota Apps Script. Batas dapat
diubah secara terprogram melalui `validateDatabaseV2({ maxRows: 50000 })`.

## Gerbang menuju dual-write

Dual-write baru boleh dibuat setelah:

- `summary.readyForDualWrite` bernilai `true`;
- seluruh primary key unik dan seluruh foreign key `SPK` valid;
- pemetaan JSON routing, pengiriman parsial, ETA, dan aksesoris mempunyai contoh
  uji yang disepakati;
- perbandingan jumlah baris dan nilai agregat lama-versus-V2 lulus;
- rollback tetap dapat dilakukan hanya dengan menonaktifkan dual-write.

Tahap berikutnya adalah migrator pratinjau yang menghasilkan rencana perubahan
dan selisih data tanpa melakukan penulisan. Penulisan batch serta dual-write
ditambahkan setelah hasil pratinjau disetujui.

## Migrator pratinjau

Migrator pratinjau tersedia di
`gas-deploy/BE-Database-V2-Migration.js`. Jalankan
`logDatabaseV2MigrationPreview` dari editor Apps Script untuk memeriksa 500
baris pertama. Batas dapat dinaikkan sampai 5.000 baris melalui
`previewDatabaseV2Migration({ maxRows: 5000 })`.

Pratinjau menggunakan ID deterministik agar eksekusi berulang tidak membuat
baris ganda:

- routing: `<SPK>:R:<urutan>`;
- bahan: `<SPK>:B:<urutan>`;
- warna: `<SPK>:W:<urutan>`;
- pengiriman: `<SPK>:P:<urutan>`;
- ETA: `<SPK>:E:<urutan>`;
- aksesoris: `<SPK>:A:<urutan-routing>:<urutan-aksesoris>`;
- tracking: `<SPK>:T:<urutan>`.

Ringkasan menampilkan jumlah `insert`, `update`, `unchanged`, dan baris target
yang akan dipertahankan. Nilai `writesPerformed` dan `deletesPlanned` selalu
`0`; fungsi ini tidak memiliki jalur tulis.

## Baseline validasi 1 September 2026

Pemeriksaan baca-saja terhadap spreadsheet `MASTER DATA PPIC` menghasilkan:

- `Database SPK`: 9.090 SPK, seluruhnya unik;
- `SPK Master`: 9.090 SPK, cocok penuh dengan `Database SPK`;
- SPK hilang, SPK tambahan, dan kunci duplikat: 0;
- tujuh sheet detail masih kosong dan siap menerima hasil migrasi bertahap.

Pratinjau terhadap 500 SPK pertama menghasilkan 5.698 calon baris detail:

| Target | Calon baris |
| --- | ---: |
| `SPK Routing` | 3.000 |
| `SPK Bahan` | 1.197 |
| `SPK Warna` | 501 |
| `SPK Pengiriman` | 500 |
| `SPK ETA` | 0 |
| `SPK Aksesoris` | 0 |
| `SPK Tracking` | 500 |

Pada sampel tersebut tidak ditemukan JSON routing rusak atau SPK tanpa
routing. Pemeriksaan ini tidak melakukan penulisan (`writesPerformed: 0`).

## Migrasi batch

Migrasi batch aman berada di `gas-deploy/BE-Database-V2-Batch.js` dan memakai
ukuran default 25 baris sumber per eksekusi.

Urutan penggunaan dari editor Apps Script:

1. Jalankan `previewDatabaseV2NextBatch` dan pastikan `readyToCommit: true`.
2. Jalankan `adminMigrateDatabaseV2NextBatch` untuk menulis satu batch.
3. Jalankan `getDatabaseV2MigrationStatus` untuk memeriksa checkpoint.
4. Jika batch terakhir harus dibatalkan, jalankan
   `previewDatabaseV2LastBatchRollback`, lalu
   `adminRollbackDatabaseV2LastBatch`.

Migrator hanya menambahkan baris. Jika ID sudah ada dengan nilai berbeda,
seluruh batch berhenti sebelum penulisan. ID identik dengan nilai identik
dilewati sebagai `unchanged`, sehingga eksekusi ulang setelah gangguan aman.
Setiap baris baru diberi tag batch pada kolom `Sumber`, checkpoint disimpan di
Script Properties, dan hasil commit/rollback dicatat di sheet `Migrasi SPK V2`.
Rollback hanya berlaku untuk batch terakhir dan hanya menghapus baris dengan
tag sumber batch tersebut.

## Hasil migrasi awal 1 September 2026

Lima batch pertama telah melalui pratinjau dan commit. Batch awal serta sampel
batch terbaru juga melalui pembacaan ulang dan pemeriksaan visual. Sebanyak 125
SPK sumber (baris 4-128) menghasilkan 1.017 baris detail tanpa konflik:

| Batch | Baris sumber | SPK | Routing | Bahan | Warna | Pengiriman | ETA | Aksesoris | Tracking | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `V2-000004-000028` | 4-28 | 25 | 74 | 68 | 22 | 17 | 0 | 0 | 25 | 206 |
| `V2-000029-000053` | 29-53 | 25 | 66 | 67 | 17 | 16 | 0 | 0 | 25 | 191 |
| `V2-000054-000078` | 54-78 | 25 | 71 | 54 | 58 | 22 | 0 | 0 | 25 | 230 |
| `V2-000079-000103` | 79-103 | 25 | 75 | 83 | 21 | 16 | 0 | 0 | 25 | 220 |
| `V2-000104-000128` | 104-128 | 25 | 56 | 48 | 20 | 21 | 0 | 0 | 25 | 170 |

Batch pertama menemukan bahwa nilai persen sumber perlu dikonversi menjadi
pecahan sebelum ditulis ke sel berformat persen. Sebanyak 117 nilai pada batch
pertama dikoreksi dan dicatat sebagai `CORRECTED` pada sheet audit. Migrator
kemudian diperbaiki; batch kedua menulis nilai persen dengan benar sejak awal.

Checkpoint berikutnya berada pada baris sumber 129. Masih ada 8.965 SPK yang
belum diproses. Lanjutkan migrasi hanya melalui urutan pratinjau, commit, dan
verifikasi di atas agar setiap batch tetap dapat diaudit dan dibatalkan.
