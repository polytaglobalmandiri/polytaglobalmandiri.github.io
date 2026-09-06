# Kontrak Database SPK V2

Kontrak schema berada di `gas-deploy/BE-Database-V2.js`. Pemetaan payload Input SPK dan Penarikan Data berada di `gas-deploy/BE-Database-V2-Mapping.js`; penulisan terverifikasi berada di `gas-deploy/BE-Database-V2-Writer.js`; akses berbasis nama field dan ID bisnis berada di `gas-deploy/BE-Database-V2-Repository.js`.

## Relasi

`SPK Master` adalah induk dengan satu baris per SPK. Tujuh tabel detail dapat memiliki banyak record untuk satu SPK.

| Tabel | Primary key | Foreign key |
| --- | --- | --- |
| `SPK Master` | `SPK` | — |
| `SPK Routing` | `Routing ID` | `SPK` |
| `SPK Bahan` | `Bahan ID` | `SPK` |
| `SPK Warna` | `Warna ID` | `SPK` |
| `SPK Pengiriman` | `Pengiriman ID` | `SPK` |
| `SPK ETA` | `ETA ID` | `SPK` |
| `SPK Aksesoris` | `Aksesoris ID` | `SPK`, opsional `Routing ID` |
| `SPK Tracking` | `Tracking ID` | `SPK`, opsional `Routing ID` |

## ID deterministik

- Routing: `<SPK>:R:<urutan>`
- Bahan: `<SPK>:B:<urutan>`
- Warna: `<SPK>:W:<urutan>`
- Pengiriman: `<SPK>:P:<urutan>`
- ETA: `<SPK>:E:<urutan>`
- Aksesoris: `<SPK>:A:<urutan-routing>:<urutan-aksesoris>`
- Tracking: `<SPK>:T:<urutan>`

## Validator

`validateDatabaseV2({ maxRows: 100000 })` memeriksa:

1. Delapan sheet dan seluruh header wajib.
2. Primary key kosong atau duplikat.
3. Foreign key `SPK` tanpa induk pada `SPK Master`.
4. Batas pemindaian data.

Ringkasan sukses memberikan `readyForNativeWrite: true` dan `readyForNativeCutover: true`. Tabel detail kosong adalah kondisi valid; contohnya `SPK Aksesoris` boleh kosong selama belum ada SPK yang membutuhkan aksesoris.

## Writer native

Writer menerima delapan bucket sebagai satu transaksi, menolak record di luar SPK transaksi, memeriksa konflik, lalu melakukan insert/update/delete terkelola. Setelah menulis, nilai dibaca kembali dan dibandingkan per kolom. Field waktu operasional seperti `Mulai`, `Selesai`, dan `Waktu` tidak dianggap perubahan mapping.

Sumber historis dari proses migrasi tetap dikenali agar record lama dapat diperbarui, tetapi tidak ada lagi migrator batch, antrean dual-write, accessor database lama, atau fallback runtime.

## Status produksi

Pada verifikasi 5 September 2026:

- `SPK Master`: 9.090 SPK.
- Delapan dari delapan tabel tersedia.
- Error validator: 0.
- Antrean perbaikan writer: 0.
- Dependensi formula, named range, dan chart ke sheet lama: 0.
- Sheet kompatibilitas lama yang tersisa: 0.

Deployment tetap harus diuji melalui `getDatabaseV2Readiness` dan `getDatabaseV2CutoverAudit` setelah setiap perubahan backend.
