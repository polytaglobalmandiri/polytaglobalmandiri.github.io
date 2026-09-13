# Perbaikan kinerja SPK — 13 September 2026

Perubahan ini mempercepat pengambilan SPK sebelumnya dan pemuatan dashboard pada spreadsheet MASTER DATA yang sama.

- Formulir mengambil header delapan tabel dalam satu batch Sheets API, kolom SPK dalam satu batch, lalu baris yang cocok dalam satu batch. Nama kolom tetap divalidasi, posisi kolom boleh berubah, dan tanggal serial beserta jam dikonversi melalui zona waktu asli spreadsheet sebelum diformat oleh aplikasi. Metadata zona waktu dibaca satu kali jika ada tanggal numerik.
- Data SPK lengkap disimpan di ScriptCache. Versi file Drive diperiksa sebelum menggunakan cache; edit langsung pada spreadsheet menyebabkan pembacaan baru. Revisi sebelum pembacaan disimpan bersama hasil agar perubahan saat pembacaan tidak membuat hasil lama dianggap baru.
- Nomor baris tidak disimpan lintas permintaan. Jalur SpreadsheetApp tetap tersedia ketika Sheets API gagal; baris berdekatan dibaca sekaligus.
- Dashboard mendukung gzip/base64 atas permintaan klien. Browser lama dan frontend lama tetap menerima format JSON sebelumnya. Seluruh 9.090 SPK tetap tersedia; tidak ada pengurangan isi data.
- Pembacaan dashboard dan SPK sebelumnya langsung memakai JSONP yang sudah tersedia. Operasi lain mempertahankan jalur transport sebelumnya.
- Jika metadata Drive tidak dapat diperiksa melalui Drive API maupun DriveApp, cache tidak dianggap mutakhir.

Validasi lokal: delapan suite regresi; sintaks seluruh berkas backend dan RPC; kompresi bolak-balik termasuk Unicode dan angka nol; kompatibilitas klien lama; perubahan spreadsheet; perpindahan baris; fallback Sheets API.

Cadangan kode Apps Script sebelum perubahan tersedia secara lokal di `.cache/performance-20260913/live-before/` (diabaikan Git).

Rujukan implementasi: [batchGet Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet), [praktik kinerja Apps Script](https://developers.google.com/apps-script/guides/support/best-practices), [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API).

Deployment Apps Script: versi 4, URL deployment tetap sama. Pengambilan SPK A24.004 pada versi akhir: 7,22 detik pada cache kosong (proses internal 3.475 ms), kemudian 3,28 detik dari cache (141 ms). Semua field formulir dibandingkan dengan hasil sebelum optimasi dan cocok, termasuk tanggal.

Muatan dashboard terkompresi sekitar 485 KB, dibandingkan 2,68 MB sebelumnya (berkurang sekitar 82%). Pada pengukuran setelah kompresi, respons cache normal tercatat 3,09–4,57 detik. Terdapat pula respons HTTP 404 sementara dan satu respons 114 detik meskipun proses internal hanya 419 ms; durasi total Apps Script/jaringan masih dapat bervariasi. Ini pengukuran sampel, bukan jaminan waktu respons.
