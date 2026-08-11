# Installer Windows Portal POLYTA

Tersedia dua installer mandiri yang membuat pintasan pada Desktop dan Start Menu:

- `Polyta-Portal-Setup.exe` membuka portal utama untuk pengguna.
- `Polyta-Admin-Setup.exe` membuka panel administrator secara langsung.

Keduanya dibuka seperti aplikasi melalui Microsoft Edge; jika Edge tidak tersedia, peluncur akan memakai browser bawaan Windows. Portal dan administrator dipasang serta dapat dihapus secara terpisah.

Pintasan Desktop dan Start Menu selalu menargetkan peluncur POLYTA yang memiliki logo aplikasi tertanam, bukan berkas browser. Dengan demikian Windows menampilkan logo POLYTA pada pintasan, pencarian, menu aplikasi, dan daftar aplikasi terpasang. Browser hanya dipanggil di belakang untuk menampilkan isi portal.

## Membangun installer

Jalankan dari PowerShell pada root repositori:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop\installer\build-installer.ps1
```

Hasil build berada di `release\Polyta-Portal-Setup.exe` dan `release\Polyta-Admin-Setup.exe`.

## Perilaku instalasi

- Dipasang khusus untuk pengguna aktif, sehingga tidak memerlukan hak administrator.
- Membuat pintasan di Desktop dan Start Menu.
- Terdaftar pada **Settings > Apps > Installed apps** agar mudah dihapus.
- Hanya terdiri dari satu berkas `.exe`; penerima tidak memerlukan PowerShell atau alat build tambahan.
- Memerlukan koneksi Internet karena aplikasi membuka portal GitHub Pages yang selalu menggunakan versi terbaru.
- Panel administrator menggunakan alamat `https://polytaglobalmandiri.github.io/pages/admin/`.

## Catatan keamanan

Berkas `.exe` belum ditandatangani dengan sertifikat code-signing perusahaan. Windows SmartScreen mungkin menampilkan peringatan saat pertama dijalankan. Untuk distribusi publik tanpa peringatan tersebut, tandatangani hasil build dengan sertifikat code-signing milik perusahaan.
