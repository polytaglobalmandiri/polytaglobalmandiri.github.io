# Aplikasi Desktop Electron POLYTA

Aplikasi Electron ini menyediakan dua paket desktop lintas platform:

- **Polyta Portal** membuka `https://polytaglobalmandiri.github.io/`.
- **Polyta Administrator** membuka `https://polytaglobalmandiri.github.io/pages/admin/`.

Tautan di luar domain portal dibuka menggunakan peramban bawaan sistem. Aplikasi memerlukan
koneksi Internet dan tidak menyimpan kredensial GitHub di proses utama Electron.

## Menjalankan saat pengembangan

Pasang Node.js 22 atau versi LTS terbaru, kemudian jalankan dari folder ini:

```bash
npm install
npm start
```

Untuk membuka varian Administrator:

```bash
npm run start:admin
```

## Membuat paket

```bash
npm run build:portal
npm run build:admin
```

Hasil berada di `release/portal/` dan `release/admin/`. Format yang dihasilkan:

- Windows: NSIS `.exe`
- Linux: `.AppImage` dan `.deb`
- macOS: `.dmg`

Build sebaiknya dijalankan pada sistem operasi target. Workflow
`.github/workflows/build-electron.yml` membangun ketiga platform secara otomatis lewat
GitHub Actions. Jalankan workflow secara manual dari tab **Actions**, atau push tag seperti
`desktop-v3.0.0` untuk sekaligus membuat GitHub Release.

Paket saat ini belum ditandatangani secara digital. Distribusi publik yang bebas dari
peringatan keamanan Windows dan macOS memerlukan sertifikat code-signing perusahaan;
macOS juga memerlukan proses notarization Apple.
