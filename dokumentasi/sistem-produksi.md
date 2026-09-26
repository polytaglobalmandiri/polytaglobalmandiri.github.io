# Rancangan Sistem Schedule dan Produksi

Status 26 September 2026: pilot Schedule Produksi dan hasil Mixer telah diterbitkan ke Apps Script versi 42 dan GitHub Pages. Endpoint baru telah lulus pemeriksaan baca dengan sesi kosong; transaksi pengguna pada pekerjaan nyata belum diuji. Spreadsheet SPK V2 tetap menjadi sumber SPK aktif. Contoh Excel hanya dipakai untuk mengenali pekerjaan dan istilah di lapangan; tata letak serta rumusnya tidak menjadi kontrak aplikasi.

## Pilot yang sudah dibuat

- `apps/spk-automation/schedule/`: PPIC melihat routing aktif, menyimpan draf jadwal, merilis atau membatalkannya dengan alasan, dan melihat target dibanding hasil terverifikasi. Backend memeriksa sesi PPIC, referensi SPK/routing, format waktu, target, dan benturan mesin. Jadwal yang sudah memiliki entri hasil tidak dapat dibatalkan.
- `apps/spk-automation/production/`: daftar pekerjaan Mixer yang telah dirilis, hasil berulang per shift, pemakaian bahan, downtime, verifikasi atau pengembalian hasil oleh leader. Hasil yang dikembalikan tetap tercatat bersama alasan; admin membuat entri baru untuk koreksi.
- `gas-deploy/BE-Production-Schedule.js` dan `BE-Production-Entries.js`: dua tabel baru (`Schedule Produksi`, `Hasil Produksi`) hanya dibuat saat mutasi pertama oleh pengguna berizin; penerbitan dan pemeriksaan baca awal belum menulis tabel produksi.
- Endpoint Mixer, Blowing, dan Printing lama dipertahankan sementara karena masih ada di Apps Script aktif. Halaman pilot baru tidak memakainya. Penonaktifan endpoint lama menunggu inventaris klien produksi dan migrasi proses terkait.

Pilot belum memiliki penjadwalan ulang setelah rilis, revisi entri di tempat, penutupan routing, ekspor laporan, pencocokan kemampuan mesin dengan proses, atau dukungan formulir khusus selain Mixer dengan target KG. Status `IN_PROGRESS` dan `COMPLETED` telah disiapkan dalam pembacaan data, tetapi perpindahannya belum diterapkan. Pembatalan hanya berlaku sebelum ada entri hasil. Pengembalian hasil menyimpan alasan dan tidak menghapus data lama. Pekerjaan ini harus selesai sebelum perluasan ke seluruh produksi. Pengguna memilih memakai spreadsheet operasional langsung; uji transaksi hanya pada pekerjaan nyata oleh PPIC/admin/leader, dengan versi deployment 41 sebagai titik kembali.

## Tujuan

- PPIC menjadwalkan routing SPK pada mesin dan waktu yang tersedia.
- Admin/operator mencatat hasil aktual sekali per pekerjaan dan shift.
- Leader memeriksa hasil serta alasan selisih atau berhenti mesin.
- PPIC melihat progres, kebutuhan tindakan, dan rekap otomatis tanpa mengetik ulang laporan admin.
- Setiap perubahan dapat ditelusuri ke pengguna, waktu, dan alasan.

## Alur kerja

1. **SPK siap:** SPK berstatus aktif dan sudah mempunyai routing serta kebutuhan bahan. Sistem menampilkan kekurangan data sebelum SPK dapat dijadwalkan.
2. **Perencanaan PPIC:** PPIC memilih routing, tanggal/jam, mesin, urutan antrean, target dalam satuan yang berlaku, dan catatan kesiapan. Satu routing dapat mempunyai beberapa slot untuk pergantian shift, mesin, atau hari.
3. **Rilis jadwal:** PPIC merilis slot. Sistem memeriksa benturan mesin dan waktu, kecocokan proses dengan mesin, target positif, serta referensi SPK/routing. Slot draf belum muncul sebagai pekerjaan produksi.
4. **Pelaksanaan:** operator/admin membuka pekerjaan dari jadwal rilis, mencatat mulai, selesai, shift, personel, hasil baik, BS/sisa, pemakaian bahan bila relevan, downtime, dan catatan. Satu slot dapat memiliki beberapa entri hasil; satu entri adalah satu kejadian kerja yang dapat diaudit.
5. **Verifikasi leader:** leader memeriksa hasil dan penyebab selisih. Koreksi tidak menghapus entri lama; sistem menyimpan revisi dan alasan. Hasil yang belum diverifikasi tetap terlihat dengan penanda.
6. **Pemantauan PPIC:** PPIC melihat hasil harian dan akumulasi per SPK/routing, sisa order, keterlambatan, konsumsi bahan, BS, downtime, dan kebutuhan jadwal berikutnya. Rekap dibuat dari entri yang sudah diverifikasi, dengan pilihan melihat entri sementara.
7. **Serah terima proses:** hasil yang tersedia menjadi masukan proses berikutnya. Routing ditutup hanya setelah sisa pekerjaan dan verifikasi diselesaikan; satu entri hasil tidak langsung menutup routing.

## Sumber data dan identitas

| Entitas | Kunci | Isi pokok | Aturan |
| --- | --- | --- | --- |
| SPK Master | `SPK` | customer, artikel, ukuran, jumlah order, UOM, status | Tetap di tabel V2 yang ada; tidak disalin sebagai sumber fakta baru. |
| SPK Routing | `Routing ID` | SPK, proses, urutan proses, parameter | Tetap di tabel V2 yang ada. Satu SPK dapat memiliki beberapa routing dengan proses sama. |
| Slot Schedule | `Schedule ID` | routing, mesin, mulai/selesai rencana, urutan, target, UOM, status, catatan | Satu routing dapat mempunyai banyak slot. Identitas tidak bergantung pada nomor baris spreadsheet. |
| Entri Produksi | `Production Entry ID` | schedule, routing, SPK, tanggal, shift, mesin, personel, mulai/selesai aktual, hasil baik, BS, UOM, downtime, status verifikasi | Banyak entri per slot. Simpan `request ID` agar pengiriman ulang tidak menggandakan transaksi. |
| Pemakaian Bahan | `Consumption ID` | entry, bahan/kode, jenis resin, kuantitas KG, sumber/lot bila ada | Banyak baris per entri; wajib hanya untuk proses yang menggunakan bahan. |
| Downtime | `Downtime ID` | entry, mulai, selesai, alasan terstruktur, catatan | Banyak kejadian per entri; durasi dihitung dari waktu. |
| Audit Perubahan | `Audit ID` | entitas, ID, aksi, nilai sebelum/sesudah, alasan, pelaku, waktu | Append only; dipakai untuk koreksi dan pembatalan. |

Target schedule dan hasil aktual selalu dipisahkan. Satuan dicatat secara eksplisit (`KG`, `PCS`, `ROLL`, `METER`) beserta konversi yang dipakai saat itu; angka berbeda satuan tidak dijumlah langsung. Nilai hasil sebelumnya, hasil hari ini, akumulasi, sisa order, serta persentase dihitung saat membaca data.

## Status dan aturan perubahan

| Objek | Status | Perpindahan utama |
| --- | --- | --- |
| Schedule | `DRAFT`, `RELEASED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | PPIC membuat dan merilis; pelaksanaan mengubah progres; pembatalan memerlukan alasan. |
| Entri Produksi | `DRAFT`, `SUBMITTED`, `VERIFIED`, `REJECTED`, `VOIDED` | Admin/operator mengirim; leader memverifikasi atau mengembalikan; pembatalan menyimpan jejak. |
| Routing | status SPK V2 yang ada | Penutupan dihitung dari pekerjaan terjadwal, hasil, dan verifikasi; tidak dilakukan otomatis oleh satu entri. |

Perubahan schedule yang telah dirilis tidak menimpa riwayat pelaksanaan. Jika mesin/waktu berubah sebelum bekerja, buat revisi dengan alasan. Jika pekerjaan sudah berjalan, sisa target ditempatkan pada slot baru.

## Validasi sebelum simpan

- SPK, routing, dan proses saling cocok; SPK masih boleh dikerjakan.
- Entri harus merujuk slot `RELEASED` atau `IN_PROGRESS` yang aktif.
- Mesin mendukung proses, serta slot mesin tidak berbenturan pada waktu yang sama.
- Hasil, BS, dan pemakaian bahan berupa angka nonnegatif dengan UOM yang jelas.
- Kelebihan terhadap sisa order ditandai dan memerlukan alasan serta verifikasi leader; sistem tetap mencatat jumlah aktual.
- Hasil dan downtime tidak melampaui durasi kerja tanpa penjelasan.
- Backend memvalidasi ulang semua aturan; kontrol pada halaman hanya membantu pengguna.
- Setiap mutasi memakai lock, kunci transaksi unik, dan pemeriksaan baca balik sesuai pola database V2.

## Layar yang dibutuhkan

1. **Antrean SPK untuk PPIC:** filter status, proses, tanggal kebutuhan, kesiapan bahan, dan SPK yang belum dijadwalkan.
2. **Papan schedule:** tampilan per hari/minggu dan mesin; pindah urutan, pecah target ke beberapa slot, deteksi benturan, rilis jadwal.
3. **Daftar pekerjaan produksi:** hanya slot yang dirilis, dikelompokkan menurut proses, mesin, tanggal, dan shift.
4. **Form hasil per proses:** bagian umum yang sama, dengan field khusus Mixer, Blowing, Printing, Slitting/Folding/Gusset, Bottom Seal/T-Shirt, dan Side Seal.
5. **Verifikasi leader:** daftar entri menunggu verifikasi, perubahan dan alasan, serta tindakan setujui/kembalikan.
6. **Dashboard PPIC:** rencana vs aktual, WIP, sisa order, keterlambatan, BS, downtime, konsumsi bahan, dan riwayat per SPK.
7. **Ekspor laporan:** hasil dari data aplikasi dengan filter tanggal/proses/mesin/SPK; Excel/PDF hanya format keluaran.

## Hak akses

| Peran | Hak utama |
| --- | --- |
| PPIC | Buat, ubah, rilis, dan batalkan schedule; lihat semua progres; koreksi melalui alur audit. |
| Admin produksi | Buat dan kirim entri hasil pada pekerjaan yang dirilis; lihat hasil prosesnya. |
| Operator | Input hasil pekerjaannya bila akun operator sudah diterapkan. |
| Leader produksi | Verifikasi atau kembalikan entri; beri alasan selisih dan penyelesaian. |
| Manajemen | Baca dashboard dan laporan. |

Endpoint tulis baru wajib memeriksa sesi dan peran di backend. Web app Apps Script saat ini dapat diakses publik dan allowlist RPC saja tidak cukup untuk otorisasi mutasi produksi.

## Tahap implementasi

1. **Fondasi:** definisi schema schedule/hasil dan validasi, sesi/peran, pembacaan SPK/routing, serta audit. Verifikasi schema sebelum mutasi produksi pertama.
2. **Schedule PPIC:** antrean, pembuatan slot, pemeriksaan benturan, rilis, dan pembacaan kembali.
3. **Produksi Mixer:** ganti simpan satu kali pada `Payload JSON` dengan entri hasil berulang; tampilkan hanya slot yang dirilis.
4. **Verifikasi dan rekap:** leader memverifikasi, PPIC melihat perbandingan rencana/aktual dan rekap otomatis.
5. **Perluasan proses:** Blowing, Printing, Slitting/Folding/Gusset, Bottom Seal/T-Shirt, lalu Side Seal; field khusus ditambahkan berdasarkan kebutuhan proses, bukan menyalin kolom workbook.
6. **Migrasi dan rilis:** rilis terbatas dengan pembacaan awal dan transaksi pekerjaan nyata oleh pengguna per peran, lalu perluas setelah hasilnya benar. Prototipe Mixer lama tidak dipakai untuk transaksi baru setelah jalur entri aktif.
