# POLYTA GLOBAL MANDIRI — Portal Operasional

Portal internal terpadu untuk alur PO, SPK, persetujuan, bahan, jadwal produksi,
hasil produksi, penarikan data, dan serah terima. Antarmuka web memakai HTML, CSS,
dan JavaScript, sedangkan layanan data dan otorisasi memakai Google Apps Script.

---

## Struktur Proyek

```
.
├── index.html                         # Portal operasional utama
├── apps/spk-automation/               # Modul operasi dan produksi
│   ├── admin/                         # Kelola pengguna dan otorisasi
│   ├── approval/                      # Persetujuan SPK
│   ├── dashboard/                     # Dashboard operasional
│   ├── material-management/           # Bahan dan tinta
│   ├── material-issue/                # Keluar bahan
│   ├── schedule/                      # Jadwal produksi
│   ├── production/                    # Hasil produksi
│   ├── data-retrieval/                # Penarikan data
│   └── handover/                      # Serah terima
├── assets/
│   ├── css/portal.css                 # Sistem tampilan portal utama
│   ├── js/portal-home.js              # Katalog dan pencarian modul
│   └── js/portal-auth.js              # Gerbang sesi dan akses halaman
├── gas-deploy/BE-Api.js               # API, sesi, dan otorisasi server
├── desktop/                            # Aplikasi desktop dan installer
├── android/                            # Aplikasi Android
└── README.md
```

Rute lama `/pages/ppic/` dan `/ppic/` tetap tersedia sebagai pengalih ke portal utama
agar pintasan lama tidak terputus.

---

## Menambah Modul Portal

Daftarkan kartu modul di `assets/js/portal-home.js`, halaman pada
`PORTAL_PAGE_CATALOG_`, dan menu pada `PORTAL_MENU_CATALOG_` di
`gas-deploy/BE-Api.js`. Dengan begitu modul langsung mengikuti pencarian dan kontrol
akses yang dikelola akun master.

---

## Menjalankan Secara Lokal

Jalankan server dari akar repositori agar rute dan aset absolut bekerja:

```powershell
node tools/serve-local.cjs
```

Lalu buka <http://127.0.0.1:8765/>.

---

## Kelola Akses

Akun master membuka `/apps/spk-automation/admin/`, misalnya
<http://localhost:5500/apps/spk-automation/admin/> ketika menjalankan portal secara lokal.
Halaman ini mengatur pengguna, jabatan, status akun, tanda tangan, akses halaman, modul
yang tampil di portal, serta izin membaca, menambah, mengubah, menghapus, membatalkan,
menyetujui, dan merilis data.

---

## Fitur

- **Portal operasional tunggal** sebagai pintu masuk seluruh modul kerja.
- **Pencarian langsung** pada seluruh modul. Tekan <kbd>/</kbd> untuk fokus
  ke kolom pencarian, <kbd>Esc</kbd> untuk mengosongkan.
- **Akses berbasis wewenang** untuk halaman, menu, dan tindakan data.
- **Ringkasan modul** yang tersedia sesuai akun pengguna.
- **Responsif penuh** hingga layar ponsel.
- **Aksesibilitas** — navigasi papan ketik, `:focus-visible`, lewati-ke-konten, `aria-*`,
  serta menghormati `prefers-reduced-motion`.
- **Mode cetak** yang bersih.

---

## Installer Windows

Installer siap dibagikan tersedia di
[`desktop/release/Polyta-Portal-Setup.exe`](desktop/release/Polyta-Portal-Setup.exe). Penerima cukup
menjalankan berkas tersebut untuk membuat pintasan portal di Desktop dan Start Menu,
tanpa perlu mengetik URL. Untuk administrator, gunakan
[`desktop/release/Polyta-Admin-Setup.exe`](desktop/release/Polyta-Admin-Setup.exe) agar pintasan
langsung membuka panel admin. Petunjuk build dan catatan distribusi tersedia di
[`desktop/installer/README.md`](desktop/installer/README.md).

## Aplikasi Desktop Linux, macOS, dan Windows

Versi lintas platform berbasis Electron tersedia di [`desktop/electron/`](desktop/electron/).
Versi ini menghasilkan paket `.AppImage`/`.deb` untuk Linux, `.dmg` untuk macOS, dan `.exe`
untuk Windows. Portal dan Administrator tetap dibangun sebagai dua aplikasi terpisah.
Petunjuk build lokal dan GitHub Actions tersedia di
[`desktop/electron/README.md`](desktop/electron/README.md).

Artefak pemasang dan petunjuk build dikelola di folder `desktop/` dan `android/`.

---

## Publikasi ke GitHub

> 📘 Panduan lengkap beserta pemecahan masalah tersedia di
> **[GITHUB-GUIDE.md](GITHUB-GUIDE.md)** — termasuk pengaturan identitas git,
> autentikasi token, dan penanganan konflik saat push pertama.
>
> 🌐 Untuk merapikan alamat situs — baik yang gratis
> (`polytaglobalmandiri.github.io`) maupun domain perusahaan sendiri
> (`portal.polytaglobalmandiri.com`) — lihat **[DOMAIN-GUIDE.md](DOMAIN-GUIDE.md)**.

Repositori sudah terhubung ke GitHub dan diterbitkan melalui GitHub Pages.

Alur kerja harian:

```powershell
git pull              # ambil perubahan terbaru
git add -A            # tandai semua perubahan
git commit -m "Perbarui tautan marketing"
git push              # kirim ke GitHub
```

### Mengaktifkan GitHub Pages

Repository → **Settings** → **Pages** → *Source*: `Deploy from a branch` →
Branch `main`, folder `/ (root)` → **Save**.

Situs akan tersedia di `https://<username>.github.io/<nama-repo>/`.

> **Catatan keamanan:** situs ini bersifat publik bila di-host di GitHub Pages.
> Katalog portal hanya berisi rute, bukan data. Perlindungan sesungguhnya tetap
> berada pada izin berbagi (sharing permission) di Google Drive/OneDrive masing-masing
> berkas. Bila daftar tautan pun dianggap sensitif, gunakan repositori **private**
> dan hosting internal, bukan GitHub Pages publik.

---

## Aplikasi SPK

Lihat [panduan SPK](apps/spk-automation/README.md) untuk transport, backend, dan batasan membangun ulang frontend. Folder rute lama tetap dipertahankan agar tautan yang sudah dibagikan dapat digunakan.

Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI
