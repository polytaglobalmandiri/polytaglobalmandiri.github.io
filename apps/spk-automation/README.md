# Otomasi SPK

Antarmuka Otomasi SPK diterbitkan melalui GitHub Pages pada `/apps/spk-automation/`, sedangkan logika bisnis dan akses lembar kerja tetap berjalan pada Google Apps Script.

## Arsitektur

- Frontend: halaman-halaman statis SPK, termasuk Serah Terima, di folder ini.
- Transport: `assets/js/gas-rpc.js` menyesuaikan pemanggilan `google.script.run` menjadi HTTP `POST`.
- Backend: project GAS `1LwIFRTK8TttF9uIAQcaEOfKPhVPVnIKXtIC5kma_vRqSQ3mg8CK4tpQS`.
- Endpoint: deployment GAS yang sudah digunakan oleh aplikasi sebelumnya.
- Database: Spreadsheet yang dikonfigurasi pada project GAS.

Backend hanya menerima nama fungsi yang dicantumkan dalam allowlist `SPK_RPC_METHODS_` pada `BE-Api.js`. Fungsi lain ditolak.

## Memperbarui frontend dari GAS

Setelah kode frontend pada GAS ditarik menggunakan `clasp clone`, jalankan:

```powershell
node .\tools\build-spk-frontend.mjs "C:\lokasi\hasil-clone-gas"
```

Proses tersebut memperluas partial HTML, mengganti navigasi GAS menjadi rute GitHub Pages, memasang transport RPC, menyisipkan aset statis bersama (`responsive.css`, `i18n.js`, `responsive-header.js`, `modal-scroll-lock.js`, serta modul routing untuk halaman berwizard), dan membentuk ulang lima halaman: `index.html`, `create-spk/`, `material-issue/`, `data-retrieval/`, dan `print-spk/`.

Halaman `handover/` tidak dibangun dari GAS. Halaman itu hanya ada sebagai berkas statis di repositori ini, jadi jangan menghapusnya saat menyegarkan halaman lain.

### Periksa selisihnya sebelum menimpa

Bawaannya hasil build ditulis ke `tools/.build-spk/`, **bukan** ke folder yang terbit. Bandingkan dulu:

```powershell
git diff --no-index apps/spk-automation tools/.build-spk
```

Jika hasilnya sudah benar, jalankan ulang dengan `--timpa` untuk menulis ke folder aplikasi. Argumen kedua juga boleh diisi direktori lain bila ingin menyimpan hasilnya di tempat sendiri.

> **Perhatian.** Per 12 Agustus 2026 sumber GAS tertinggal dari halaman yang terbit: sebagian pengembangan dikerjakan langsung pada berkas statis di sini dan belum dikembalikan ke GAS. Membangun ulang sekarang akan menghapus pengalih bahasa pada Penarikan Data, tombol Portal PPIC pada semua halaman, serta penyeragaman istilah Indonesia. Kembalikan dulu perubahan itu ke berkas `FE-*.html` di project GAS sebelum memakai `--timpa`.

Versi aset lokal terdaftar pada `assetVersions` di dalam skrip. Naikkan nilainya setiap berkas aset diubah supaya browser tidak memakai salinan lama.
