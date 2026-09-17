# Aplikasi Android Polyta 1.1.0

Dua APK universal untuk Android 6.0 (API 23) atau lebih baru. Portal dan
Administrator mempertahankan identitas paket `com.polyta.mobile.portal` dan
`com.polyta.mobile.admin`, serta sertifikat versi 1.0.0. Version code naik ke 2.

## Antarmuka

Versi 1.1.0 mengganti peluncur Custom Tabs dengan Activity Android sendiri:

- Beranda native dengan kartu Dashboard SPK, Buat SPK, Persetujuan, Bahan & tinta,
  Serah terima, Portal lengkap, Download, dan Bantuan/Administrator.
- Toolbar, navigasi bawah, tombol kembali, menu aplikasi, progres muat, serta
  layar gagal muat dengan tombol coba lagi dibuat menggunakan widget Android.
- Halaman operasional berjalan dalam WebView, tanpa bilah alamat browser.
  CSS khusus yang dibundel memperhalus tampilan layar kecil; CSS cetak tetap asli.
- Ikon adaptif Android, insets untuk status bar/keyboard, dan penanganan rotasi.
- Beranda tersedia tanpa jaringan; data SPK tetap membutuhkan koneksi internet.

Ini adalah aplikasi hybrid: beranda dan navigasi native, formulir operasional
memakai website yang sama dengan portal. Layar konfirmasi pemasangan dikelola
oleh Android; tampilan aplikasi berlaku setelah pemasangan selesai.

## Fitur perangkat dan batasan

WebView mempertahankan sesi aplikasi sendiri melalui cookies/storage. Sesi Chrome
versi 1.0.0 tidak diimpor, sehingga pengguna perlu login kembali. Hak akses tetap
berasal dari backend; memasang paket Administrator tidak memberi izin tambahan.

Kamera diminta saat halaman portal memerlukan video untuk pemindaian, hanya untuk
origin HTTPS portal dan setelah izin Android diberikan. Mikrofon tidak diizinkan.
Pemilih berkas memakai Android Storage Access Framework. Unduhan HTTPS memakai
DownloadManager; izin penyimpanan hanya diminta pada Android 6–9 saat mengunduh.
Unduhan `blob:`/`data:` tidak didukung. Print halaman tersedia dari menu
**Cetak / Simpan PDF** dan permintaan `window.print()` pada halaman portal.

Navigasi internal dibatasi ke origin portal HTTPS; tautan eksternal yang didukung
meminta konfirmasi sebelum membuka aplikasi lain. OAuth Google pada tautan luar
menggunakan browser dan tidak otomatis berbagi sesi dengan WebView. Tidak ada
JavaScript bridge. Akses file lokal dan mixed content dimatikan; galat TLS tidak
dilewati. Android System WebView perlu diperbarui untuk kompatibilitas.

## Build dan tanda tangan

Gunakan JDK 21, Android SDK Platform 35, dan Build Tools 35.0.0. `build.py` memakai
`javac`, `d8`, `aapt2`, `zipalign`, dan `apksigner` tanpa dependensi Gradle.

```sh
export JAVA_HOME=/lokasi/jdk
export PATH="$JAVA_HOME/bin:$PATH"
read -rs POLYTA_KEYSTORE_PASSWORD
export POLYTA_KEYSTORE_PASSWORD
python3 android/build.py \
  --build-tools /lokasi/sdk/build-tools/35.0.0 \
  --android-jar /lokasi/sdk/platforms/android-35/android.jar \
  --keystore /lokasi/aman/release.p12
unset POLYTA_KEYSTORE_PASSWORD
```

Hasil ada di `android/release/`; `SHA256SUMS.txt` berisi checksum paket.
Build memverifikasi tanda tangan serta alignment kedua APK. Paket tidak memakai
native library sehingga satu APK dapat dipakai pada ARM maupun x86.

Kunci rilis pertama disimpan di komputer pembuat pada
`~/.local/share/polyta/android-signing/release.p12`, dengan kata sandi pada berkas
`password` di folder yang sama (akses hanya pemilik). **Cadangkan keduanya ke
penyimpanan privat perusahaan. Jangan unggah kunci atau kata sandinya ke GitHub.**
Pembaruan wajib memakai kunci yang sama serta `--version-code` lebih besar dan
`--version` baru. Kehilangan kunci membuat APK baru tidak dapat memperbarui
instalasi lama tanpa pencopotan.

Setelah build, periksa manifest, tanda tangan, checksum, dan uji instalasi pada
perangkat Android. Ganti tautan unduh hanya setelah APK tersedia. Pengujian paket
di komputer tidak menggantikan uji login, kamera, dan unduhan pada ponsel nyata.

Referensi: [WebView Android](https://developer.android.com/develop/ui/views/layout/webapps/webview),
[WebChromeClient](https://developer.android.com/reference/android/webkit/WebChromeClient),
dan [build command line](https://developer.android.com/build/building-cmdline).

## Validasi rilis 1.1.0

- APK diverifikasi memakai signature v1/v2/v3 dan alignment.
- Tes paket memeriksa checksum, identitas/versi, launcher, WebView, aset mobile,
  izin, tidak adanya JavaScript bridge, serta sertifikat yang sama dengan 1.0.0.
- Tes JVM mencakup navigasi internal, tautan luar, spoofing host, userinfo, port,
  skema lokal, dan URL rusak.
- Pemeriksaan integritas HTML/JavaScript dan tautan unduh dijalankan terpisah.
- Instalasi, layout native, keyboard, login, kamera, unggahan, dan cetak pada
  perangkat/emulator Android belum diuji; pemeriksaan paket bukan pengujian UAT.

```sh
python3 tools/test-android.py --build-tools /lokasi/sdk/build-tools/35.0.0
```
