# Installer Windows Portal POLYTA

Tersedia dua installer mandiri yang membuat pintasan pada Desktop dan Start Menu:

- `Polyta-Portal-Setup.exe` membuka portal utama untuk pengguna.
- `Polyta-Admin-Setup.exe` membuka panel administrator secara langsung.

Keduanya dibuka seperti aplikasi melalui Microsoft Edge; jika Edge tidak tersedia, pintasan akan memakai browser bawaan Windows. Portal dan administrator dipasang serta dapat dihapus secara terpisah.

## Membangun installer

Jalankan dari PowerShell pada root repositori:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

Hasil build berada di `release\Polyta-Portal-Setup.exe` dan `release\Polyta-Admin-Setup.exe`.

## Perilaku instalasi

- Dipasang khusus untuk pengguna aktif, sehingga tidak memerlukan hak administrator.
- Membuat pintasan di Desktop dan Start Menu.
- Terdaftar pada **Settings > Apps > Installed apps** agar mudah dihapus.
- Hanya terdiri dari satu berkas `.exe`; penerima tidak memerlukan PowerShell atau alat build tambahan.
- Memerlukan koneksi Internet karena aplikasi membuka portal GitHub Pages yang selalu menggunakan versi terbaru.

## Catatan keamanan

Berkas `.exe` belum ditandatangani dengan sertifikat code-signing perusahaan. Windows SmartScreen mungkin menampilkan peringatan saat pertama dijalankan. Untuk distribusi publik tanpa peringatan tersebut, tandatangani hasil build dengan sertifikat code-signing milik perusahaan.
