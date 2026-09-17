# Aplikasi Android POLYTA

Modul ini menghasilkan dua paket APK yang membuka portal di dalam WebView:

- **Polyta Portal** (`com.polytaglobalmandiri.portal`) membuka `https://polytaglobalmandiri.github.io/`.
- **Polyta Administrator** (`com.polytaglobalmandiri.admin`) membuka `https://polytaglobalmandiri.github.io/pages/admin/`.

Tautan di luar domain portal dan permintaan unduhan dibuka memakai peramban bawaan sistem.
Izin kamera hanya diminta ketika halaman portal memintanya, dan hanya untuk halaman portal.
Nomor versi diambil dari `desktop/electron/package.json` agar sama dengan paket desktop.

## Membuat paket secara lokal

Dibutuhkan JDK 17, Android SDK, dan Gradle 8.11 atau lebih baru.

```bash
cd android
gradle assemblePortalRelease assembleAdminRelease
```

Hasil berada di `app/build/outputs/apk/portal/release/` dan `app/build/outputs/apk/admin/release/`.

## Penandatanganan

Bila variabel lingkungan berikut tersedia, build rilis memakai keystore perusahaan:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Tanpa variabel tersebut, build memakai kunci debug bawaan Android sehingga APK tetap dapat
dipasang, tetapi tanda tangannya berganti setiap kali lingkungan build berubah. Pembaruan
di atas pemasangan lama hanya berhasil bila tanda tangannya sama, jadi gunakan keystore tetap
untuk distribusi. Simpan keystore sebagai secret repositori `ANDROID_KEYSTORE_BASE64`
(hasil `base64` berkas `.jks`) beserta ketiga secret kata sandi/alias di atas.

## Penerbitan otomatis

`.github/workflows/build-android.yml` membangun kedua varian lalu mengunggahnya sebagai
aset Release untuk tag `desktop-v*`, dengan nama `Polyta-Portal-<versi>-android.apk` dan
`Polyta-Administrator-<versi>-android.apk`. Halaman [`/unduh/`](../unduh/index.html)
menautkan berkas tersebut secara langsung sehingga unduhan APK berjalan tanpa membuka
halaman Releases terlebih dahulu.

## Pemeriksaan

Dari akar repositori:

```bash
node --test tools/test-android.cjs
```

Pemeriksaan ini memverifikasi identitas kedua varian, rute awal, pembatasan navigasi
WebView, penamaan aset rilis, dan tautan unduhan pada halaman Unduh.

APK belum ditandatangani dengan sertifikat perusahaan; Android akan menampilkan
peringatan pemasangan dari sumber tidak dikenal.
