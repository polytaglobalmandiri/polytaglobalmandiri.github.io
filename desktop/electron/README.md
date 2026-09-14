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

Untuk membangun kedua varian Linux AMD64 secara eksplisit:

```bash
npm run build:portal -- --linux --x64
npm run build:admin -- --linux --x64
```

Konfigurasi masing-masing varian menyertakan `extraMetadata.name` dan
`extraMetadata.productName` di dalam aplikasi. Nama tersebut menentukan URL awal,
identitas aplikasi, serta nama paket dan peluncur Linux: `polyta-portal` atau
`polyta-administrator`. Keduanya dapat dipasang berdampingan. Paket lama bernama
`polyta-desktop`; hapus paket lama sebelum berpindah ke paket dengan identitas baru.

Build sebaiknya dijalankan pada sistem operasi target. Workflow
`.github/workflows/build-electron.yml` membangun ketiga platform secara otomatis lewat
GitHub Actions. Jalankan workflow secara manual dari tab **Actions**, atau push tag seperti
`desktop-v3.0.0` untuk sekaligus membuat GitHub Release.

`publish: null` menonaktifkan publikasi dan deteksi penyedia pembaruan otomatis oleh
electron-builder. Perintah build lokal dan build workflow hanya membuat paket;
unggahan GitHub Release tetap dilakukan oleh langkah `softprops/action-gh-release`
yang sudah ada, khusus untuk tag `desktop-v*`.

## Memeriksa hasil build Linux

Dari root repositori, setelah kedua build selesai:

```bash
PGM_DESKTOP_ARTIFACTS=desktop/electron/release node --test tools/test-desktop.cjs
```

Pemeriksaan ini membaca metadata serta kode dari `app.asar`, memverifikasi URL awal
tanpa membuka portal, dan memeriksa nama paket serta peluncur Debian tanpa memasang
aplikasi. Dibutuhkan dependensi build Electron, `dpkg-deb`, `tar`, dan Bash.
Tanpa `PGM_DESKTOP_ARTIFACTS`, hanya pemeriksaan sumber/konfigurasi yang dijalankan;
dua pemeriksaan paket dilewati.

Paket saat ini belum ditandatangani secara digital. Distribusi publik yang bebas dari
peringatan keamanan Windows dan macOS memerlukan sertifikat code-signing perusahaan;
macOS juga memerlukan proses notarization Apple.
