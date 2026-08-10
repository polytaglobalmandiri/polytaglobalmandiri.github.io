# Installer Windows Portal POLYTA

Installer mandiri ini membuat pintasan **POLYTA GLOBAL MANDIRI Portal** pada Desktop dan Start Menu. Portal dibuka seperti aplikasi melalui Microsoft Edge; jika Edge tidak tersedia, pintasan akan memakai browser bawaan Windows.

## Membangun installer

Jalankan dari PowerShell pada root repositori:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

Hasil build berada di `release\Polyta-Portal-Setup.exe`.

## Perilaku instalasi

- Dipasang khusus untuk pengguna aktif, sehingga tidak memerlukan hak administrator.
- Membuat pintasan di Desktop dan Start Menu.
- Terdaftar pada **Settings > Apps > Installed apps** agar mudah dihapus.
- Hanya terdiri dari satu berkas `.exe`; penerima tidak memerlukan PowerShell atau alat build tambahan.
- Memerlukan koneksi Internet karena aplikasi membuka portal GitHub Pages yang selalu menggunakan versi terbaru.

## Catatan keamanan

Berkas `.exe` belum ditandatangani dengan sertifikat code-signing perusahaan. Windows SmartScreen mungkin menampilkan peringatan saat pertama dijalankan. Untuk distribusi publik tanpa peringatan tersebut, tandatangani hasil build dengan sertifikat code-signing milik perusahaan.
