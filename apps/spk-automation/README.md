# SPK Automate

Frontend SPK Automate di-host oleh GitHub Pages pada `/spk-automasi/`, sedangkan logika bisnis dan akses Spreadsheet tetap berjalan pada Google Apps Script.

## Arsitektur

- Frontend: lima halaman statis di folder ini.
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

Proses tersebut memperluas partial HTML, mengganti navigasi GAS menjadi rute GitHub Pages, memasang transport RPC, dan membentuk ulang seluruh halaman statis.
