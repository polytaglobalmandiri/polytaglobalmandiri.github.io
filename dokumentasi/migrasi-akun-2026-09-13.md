# Migrasi MASTER DATA — 13 September 2026

## Tujuan

- Spreadsheet: `1bvyTfFQ1vvzw5ZVj-QUn-XGiyWifjK0lG-GPd0FO9Aw` (`MASTER DATA`).
- Apps Script: `1X4f-lJts_2H_rQBP6Q7G61FVeAPOuO5O0SLw_HvWUlP2UE9ePputw156` (`POLYTA SPK — MASTER DATA`).
- Akun eksekusi yang direncanakan: `zulfi.polyta@gmail.com`.

## Hasil pemindahan

35 file disalin langsung dari project lama
`1LwIFRTK8TttF9uIAQcaEOfKPhVPVnIKXtIC5kma_vRqSQ3mg8CK4tpQS`.
Sumber tersebut sama dengan salinan lokal sebelum migrasi. Semua file tujuan
telah dibaca ulang dan dibandingkan dengan sumber yang disesuaikan.

Perubahan: ID database baru dan zona waktu `Asia/Jakarta`. Drive v3 dan Sheets v4
aktif. Properti kompatibilitas password approval dipindahkan melalui pengaturan
project tanpa menyimpan nilainya di repository. Sesi login lama tidak disalin.

Project sumber menampilkan nol pemicu untuk akun yang sedang login; pemicu milik
akun lain belum diverifikasi. Folder sumber ekstraksi, sumber OTD, dan berkas
bukti/tanda tangan historis tidak dipindahkan; akses akun baru ke sumber eksternal
tersebut masih perlu diperiksa.

## Verifikasi

- Sintaks 15 modul backend: lulus.
- Lima tes `tools/test-database-v2-*.cjs`: lulus.
- Audit database baru: 8 tabel, 0 error, 0 peringatan, 0 blocker, tanpa sheet lama.
- Smoke test project baru: lulus seluruh 9 pemeriksaan, dashboard 9.090 SPK.
- Sampel smoke test: `A24.004`; repeat order, edit, cetak, manager, dan approval lulus.
- Endpoint publik Versi 1: `getDatabaseV2CutoverAudit` dan
  `getDatabaseV2Readiness` lulus tanpa sesi login Google; 9.090 SPK terbaca.

Commit GitHub `dfbf914` menambahkan `BE-Cache-Layer.js`, tetapi file tersebut tidak
ada pada sumber Apps Script lama dan tidak ikut deployment migrasi ini. Salinan
lokal mempertahankan file tersebut dari GitHub; penambahan ke deployment harus
ditinjau tersendiri.

## Status deployment

Deployment Versi 1 diterbitkan pada 13 September 2026 dengan akses `Siapa saja`,
berjalan sebagai `zulfi.polyta@gmail.com`, setelah mendapat persetujuan pengguna.

Endpoint baru:
`https://script.google.com/macros/s/AKfycbwXTVKAJ0ftVTi-egf6SNN7q0_cLUkSeChsuBzbmPgDuXV-SMMUnum-LJvoAUphqQ/exec`.

Perubahan website mengarahkan RPC ke endpoint baru; versi aset RPC dan kunci
cache dashboard diperbarui agar data perangkat dari database lama tidak dipakai.
Project, deployment, dan database lama tetap dipertahankan.
