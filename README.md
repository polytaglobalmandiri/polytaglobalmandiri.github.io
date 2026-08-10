# POLYTA GLOBAL MANDIRI — Portal Akses Internal

Situs statis pengganti/kloning dari `sites.google.com/view/polytaglobalmandiri`, dibangun ulang
dengan tema **skeuomorphism** modern: permukaan logam sikat, panel timbul (emboss), tombol
mengkilap dengan pantulan, tipografi terukir, serta sekrup dan LED indikator.

Tanpa framework, tanpa dependensi, tanpa proses build — cukup HTML, CSS, dan JavaScript murni.

---

## Struktur Proyek

```
.
├── index.html          # BERANDA — direktori departemen + indeks seluruh tautan
├── marketing.html      # MARKETING
├── ppic.html           # PPIC
├── purchasing.html     # PURCHASING
├── produksi.html       # PRODUKSI
├── finance.html        # FINANCE
├── bantuan.html        # BANTUAN — panduan + FAQ
├── assets/
│   ├── css/skeuo.css   # Seluruh sistem desain skeuomorphic
│   ├── js/data.js      # ★ SEMUA KONTEN & TAUTAN DIATUR DI SINI
│   ├── js/app.js       # Render, pencarian, tema, pin, animasi
│   └── img/logo.svg    # Logo plat kuningan
├── .gitignore
├── .nojekyll           # Agar GitHub Pages tidak memproses lewat Jekyll
└── README.md
```

Setiap halaman HTML sengaja dibuat tipis. Navigasi, header, kartu tautan, dan footer
di-render oleh `assets/js/app.js` berdasarkan atribut `data-page` pada `<body>`.

---

## Cara Mengisi Tautan

Semua tombol saat ini masih berstatus **"URL belum diatur"** karena tautan asli pada
Google Sites bersifat privat dan tidak dapat dibaca dari luar.

Buka [assets/js/data.js](assets/js/data.js), lalu isi properti `url`:

```js
{ label: "Schedule Design", url: "https://docs.google.com/spreadsheets/d/xxxx", type: "sheets" },
```

**Tipe yang tersedia** (menentukan ikon dan warna):

| `type`     | Digunakan untuk        |
|------------|------------------------|
| `sheets`   | Google Spreadsheet     |
| `drive`    | Folder Google Drive    |
| `onedrive` | Folder OneDrive / 1drv |
| `form`     | Google Form            |
| `script`   | Google Apps Script     |
| `slides`   | Google Slides          |
| `site`     | Halaman internal       |
| `folder`   | Folder umum            |

Menambah tombol baru cukup menambah objek pada array `items`. Menambah seksi baru cukup
menambah objek pada array `sections`. Tidak ada file lain yang perlu disentuh.

---

## Menjalankan Secara Lokal

Klik ganda `index.html` — situs berjalan langsung dari `file://` tanpa server.

Bila ingin menggunakan server lokal (opsional):

```powershell
# Python
python -m http.server 5500

# atau Node
npx serve .
```

Lalu buka <http://localhost:5500>.

---

## Fitur

- **Tema terang / gelap** lewat sakelar fisik di kanan atas; pilihan tersimpan di perangkat
  dan mengikuti preferensi sistem bila belum pernah diubah.
- **Pencarian langsung** pada seluruh tautan di halaman. Tekan <kbd>/</kbd> untuk fokus
  ke kolom pencarian, <kbd>Esc</kbd> untuk mengosongkan.
- **Pin / Akses Cepat** — sematkan tautan yang sering dipakai; tampil di bagian atas Beranda.
- **Panel statistik** jumlah seksi, tautan, tautan aktif, dan tautan tersemat.
- **Responsif penuh** hingga layar ponsel, dengan menu tarik-turun.
- **Aksesibilitas** — navigasi papan ketik, `:focus-visible`, lewati-ke-konten, `aria-*`,
  serta menghormati `prefers-reduced-motion`.
- **Mode cetak** yang bersih.

---

## Publikasi ke GitHub

> 📘 Panduan lengkap beserta pemecahan masalah tersedia di
> **[PANDUAN-GITHUB.md](PANDUAN-GITHUB.md)** — termasuk pengaturan identitas git,
> autentikasi token, dan penanganan konflik saat push pertama.
>
> 🌐 Untuk merapikan alamat situs — baik yang gratis
> (`polytaglobalmandiri.github.io`) maupun domain perusahaan sendiri
> (`portal.polytaglobalmandiri.com`) — lihat **[PANDUAN-DOMAIN.md](PANDUAN-DOMAIN.md)**.

Repositori lokal sudah diinisialisasi dan commit pertama sudah dibuat.
Langkah berikutnya:

1. Buat repositori kosong baru di <https://github.com/new> (jangan centang
   "Add a README file" agar tidak bentrok).
2. Hubungkan dan kirim:

```powershell
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

Setelah itu, alur kerja harian:

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
> Isi `data.js` hanya berisi *tautan*, bukan data. Perlindungan sesungguhnya tetap
> berada pada izin berbagi (sharing permission) di Google Drive/OneDrive masing-masing
> berkas. Bila daftar tautan pun dianggap sensitif, gunakan repositori **private**
> dan hosting internal, bukan GitHub Pages publik.

---

## Catatan OneDrive

Folder proyek ini berada di dalam OneDrive. Git tetap berjalan normal, namun bila
sinkronisasi terasa mengganggu (file terkunci saat commit), pertimbangkan memindahkan
repositori ke luar folder OneDrive, misalnya `C:\Projects\polyta-portal`.

---

Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI
