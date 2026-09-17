# Aplikasi Android Polyta

Dua APK universal versi 1.0.0 untuk Android 6.0 (API 23) atau lebih baru:

- `com.polyta.mobile.portal`: membuka `https://polytaglobalmandiri.github.io/`.
- `com.polyta.mobile.admin`: membuka `https://polytaglobalmandiri.github.io/pages/admin/`.

Aplikasi memakai protokol Android Custom Tabs. Browser yang mendukung menampilkan
portal dengan bilah judul Polyta; browser lain membuka tab biasa. Browser menangani
login, kamera, unggahan, unduhan, dan koneksi HTTPS. APK tidak menyimpan kredensial,
tidak memasang JavaScript bridge, dan tidak meminta izin kamera atau penyimpanan.
Hak administrator tetap ditentukan oleh portal. Aplikasi memerlukan internet dan
browser aktif; bukan salinan offline atau aplikasi dari Google Play.

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

Referensi: [Android Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs/guide-get-started)
dan [build command line](https://developer.android.com/build/building-cmdline).

## Validasi rilis 1.0.0

- Kedua APK lulus verifikasi signature v1/v2/v3 dan alignment.
- Tes artefak memeriksa checksum, identitas paket, activity launcher, Android minimum,
  tujuan portal/admin, protokol Custom Tabs, dan tidak adanya izin tambahan.
- Pemeriksaan integritas proyek dan regresi desktop lulus (dua tes paket desktop
  dilewati karena artefak Linux tidak tersedia). Halaman unduh diperiksa di browser.
- Instalasi, login, dan kamera pada ponsel/emulator Android belum diuji.

Jalankan pemeriksaan paket dengan:

```sh
python3 tools/test-android.py --build-tools /lokasi/sdk/build-tools/35.0.0
```
