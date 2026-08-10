# Panduan Alamat Situs

Ada dua cara membuat alamat portal terlihat profesional:

| Cara | Hasil | Biaya |
|------|-------|-------|
| **[Bagian I](#bagian-i--rapikan-alamat-githubio-gratis)** — rapikan alamat `.github.io` | `polytaglobalmandiri.github.io` | **Gratis** |
| **[Bagian II](#bagian-ii--custom-domain-berbayar)** — domain perusahaan sendiri | `portal.polytaglobalmandiri.com` | ± Rp 200–500 rb/tahun |

Keduanya bisa dikerjakan bertahap: rapikan dulu yang gratis, beli domain kemudian.
Alamat `.github.io` akan tetap berfungsi sebagai cadangan meski custom domain aktif.

---

# BAGIAN I — Rapikan Alamat .github.io (Gratis)

## Cara kerjanya

Alamat `.github.io` **bukan** pengaturan yang bisa diketik bebas. Bentuknya selalu:

```
https://NAMA-AKUN.github.io/NAMA-REPO/
```

Jadi `polyta.github.io` hanya bisa dimiliki oleh akun GitHub yang namanya persis
`polyta` — dan nama itu **sudah dipakai akun lain**, sehingga tidak dapat diambil.

Ada satu pengecualian penting: bila **nama repo dibuat sama persis** dengan
`NAMA-AKUN.github.io`, GitHub memperlakukannya sebagai *user site* dan alamatnya
menjadi bersih tanpa embel-embel nama repo:

```
https://polytaglobalmandiri.github.io          ← rapi (user site)
https://polytaglobalmandiri.github.io/portal/  ← ada tambahan (project site)
```

Itulah yang akan kita capai lewat dua penggantian nama di bawah.

**Kondisi sekarang → tujuan:**

| | Sekarang | Setelah selesai |
|-|----------|-----------------|
| Nama akun | `zulfipolyta-design` | `polytaglobalmandiri` |
| Nama repo | `polytaglobalmandiri` | `polytaglobalmandiri.github.io` |
| Alamat situs | *(Pages belum aktif)* | `https://polytaglobalmandiri.github.io` |

---

## Langkah 1 — Ganti nama akun GitHub

1. Buka <https://github.com/settings/admin>
   (atau: klik foto profil → **Settings** → menu kiri **Account** →
   bagian *Change username*)
2. Klik **Change username**
3. Ketik: `polytaglobalmandiri`
4. GitHub menampilkan peringatan — baca bagian di bawah ini dulu, lalu konfirmasi

### Yang perlu diketahui sebelum mengganti nama

**✅ Aman / tetap berjalan**

- Seluruh repositori, isi, dan riwayat commit tetap utuh
- Commit tetap tercatat atas nama Anda, karena penautan memakai **email**
  (`zulfi.polyta@gmail.com`), bukan username
- Tautan lama ke repo otomatis dialihkan ke nama baru
- Remote git lama masih berfungsi lewat pengalihan — tapi tetap sebaiknya
  diperbarui (lihat Langkah 3)

**⚠️ Perlu diperhatikan**

- Nama `zulfipolyta-design` **langsung bebas diklaim siapa saja** setelah diganti.
  Bila ada pihak lain mengambilnya, seluruh pengalihan tautan lama berhenti bekerja.
- Bila username lama pernah ditulis di dokumen, presentasi, atau dibagikan ke
  rekan kerja, alamat tersebut perlu diperbarui.
- Tautan ke **halaman profil** lama (`github.com/zulfipolyta-design`) tidak
  dialihkan — hanya tautan repositori yang dialihkan.

---

## Langkah 2 — Ganti nama repositori

Setelah nama akun berhasil diganti:

1. Buka <https://github.com/polytaglobalmandiri/polytaglobalmandiri/settings>
2. Di bagian paling atas (*Repository name*), ubah menjadi:
   ```
   polytaglobalmandiri.github.io
   ```
   Tulis persis seperti itu — **huruf kecil semua**, memakai titik, dan diakhiri
   `.github.io`. Salah satu huruf saja berbeda, alamat bersihnya tidak akan aktif.
3. Klik **Rename**

---

## Langkah 3 — Perbarui remote di komputer

Alamat repo sudah berubah, jadi remote lokal perlu disesuaikan:

```powershell
git remote set-url origin https://github.com/polytaglobalmandiri/polytaglobalmandiri.github.io.git
git remote -v
git pull
```

---

## Langkah 4 — Aktifkan Pages

1. Buka repo → **Settings** → menu kiri **Pages**
2. *Source* → **Deploy from a branch**
3. Branch **`main`**, folder **`/ (root)`** → **Save**
4. Tunggu 1–2 menit, lalu muat ulang halaman

Alamat portal akan tampil di bagian atas:

```
https://polytaglobalmandiri.github.io
```

HTTPS aktif otomatis untuk alamat `.github.io` — tidak perlu diatur.

> **Catatan:** *user site* (repo bernama `NAMA-AKUN.github.io`) pada akun gratis
> mensyaratkan repositori bersifat **publik**. Repo ini sudah publik, jadi tidak
> ada yang perlu diubah.

---

## Pemecahan Masalah — Bagian I

### ❌ Alamat masih menampilkan `/polytaglobalmandiri` di belakang

Nama repo belum persis `polytaglobalmandiri.github.io`. Periksa ejaannya di
**Settings → Repository name** — harus huruf kecil semua dan memakai titik,
bukan tanda hubung.

### ❌ Muncul halaman 404 setelah Pages diaktifkan

Tunggu 2–5 menit; penayangan pertama butuh waktu. Bila masih 404, pastikan pada
**Settings → Pages** folder yang dipilih adalah **`/ (root)`**, bukan `/docs`.

### ❌ `git push` error `repository not found`

Remote masih memakai alamat lama. Jalankan ulang perintah pada Langkah 3.

### ❌ Situs tampil polos tanpa warna dan ikon

File `.nojekyll` hilang dari akar repo. File itu mencegah GitHub memproses situs
lewat Jekyll — tanpanya, folder `assets/` bisa diabaikan. File tersebut sudah
disertakan di proyek ini; jangan dihapus.

---

# BAGIAN II — Custom Domain (Berbayar)

Bagian ini untuk mengganti alamat menjadi domain perusahaan sendiri, misalnya
`portal.polytaglobalmandiri.com`.

Boleh dikerjakan kapan saja setelah Bagian I selesai — atau dilewati sama sekali
bila alamat `.github.io` sudah dirasa cukup.

> Pada seluruh contoh di bawah, nilai CNAME tertulis
> `polytaglobalmandiri.github.io`. Bila Bagian I **belum** dikerjakan, ganti
> menjadi nama akun Anda yang berlaku saat ini.

---

## Langkah 1 — Pilih bentuk domain

Ada tiga pilihan. Untuk portal internal perusahaan, **Pilihan B paling
direkomendasikan** karena rapi, mudah diatur, dan tidak mengganggu website utama
perusahaan bila kelak dibuat.

### Pilihan A — Domain apex (akar)

```
polytaglobalmandiri.com
```

Paling singkat, tetapi memakai seluruh domain hanya untuk portal ini. Konfigurasi
DNS-nya paling banyak (4 record A + 4 record AAAA).

### Pilihan B — Subdomain ⭐ direkomendasikan

```
portal.polytaglobalmandiri.com
```

Hanya perlu **satu record CNAME**. Domain utama tetap bebas dipakai untuk
website profil perusahaan, dan portal punya alamat sendiri yang jelas fungsinya.

Alternatif nama subdomain: `data.`, `intranet.`, `akses.`, `drive.`

### Pilihan C — Sudah punya domain perusahaan

Bila `polytaglobalmandiri.com` (atau `.co.id`) sudah dimiliki dan dipakai untuk
website/email, cukup tambahkan satu subdomain baru seperti Pilihan B. Tidak perlu
membeli domain lagi, dan **website serta email yang berjalan tidak akan terganggu**
selama Anda hanya *menambah* record, bukan mengubah yang sudah ada.

---

## Langkah 2 — Beli domain (bila belum punya)

### Ekstensi mana yang paling profesional?

| Ekstensi | Kesan | Syarat | Perkiraan biaya/tahun |
|----------|-------|--------|------------------------|
| `.co.id` | **Paling kredibel** untuk badan usaha Indonesia — hanya bisa dimiliki perusahaan berbadan hukum | NIB/SIUP, Akta Pendirian, KTP penanggung jawab, NPWP | Rp 200–500 rb |
| `.com` | Standar internasional, netral, mudah diingat | Tidak ada | Rp 150–250 rb |
| `.id` | Modern, singkat, berkesan Indonesia | KTP | Rp 200–350 rb |

Untuk PT, `.co.id` memberi kesan paling resmi karena tidak sembarang pihak bisa
mendaftarkannya — verifikasi dokumen legal menjadi bukti keabsahan perusahaan.

### Tempat membeli

**Registrar Indonesia** (mendukung `.co.id`, dukungan bahasa Indonesia, bayar via
transfer/VA/QRIS):

- [Domainesia](https://www.domainesia.com)
- [Niagahoster](https://www.niagahoster.co.id)
- [Rumahweb](https://www.rumahweb.com)

**Registrar internasional** (untuk `.com`, umumnya lebih murah, perlu kartu kredit
atau PayPal):

- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) — dijual
  **tanpa markup** (harga modal), tidak ada trik harga murah tahun pertama lalu
  melonjak saat perpanjangan. Paling hemat jangka panjang.
- [Namecheap](https://www.namecheap.com)

> **Penting:** aktifkan **auto-renew**. Domain yang telat diperpanjang bisa hangus
> dan diambil pihak lain — portal langsung mati dan alamatnya hilang permanen.

---

## Langkah 3 — Atur DNS

Masuk ke panel DNS registrar Anda (biasanya menu **DNS Management**,
**Kelola DNS**, atau **DNS Records**).

### 🅰️ Bila memakai subdomain (Pilihan B — direkomendasikan)

Cukup **satu record**:

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| `CNAME` | `portal` | `polytaglobalmandiri.github.io` | Automatic / 3600 |

Catatan penulisan:

- Kolom **Name** diisi `portal` saja, **bukan** `portal.polytaglobalmandiri.com`.
  Sebagian besar panel menambahkan nama domain secara otomatis.
- Kolom **Value** diisi `polytaglobalmandiri.github.io` — **tanpa** `https://`,
  **tanpa** nama repo, dan **tanpa** garis miring di akhir. Sebagian panel
  meminta titik di akhir (`polytaglobalmandiri.github.io.`) — ikuti format yang
  ditampilkan panel tersebut.

### 🅱️ Bila memakai domain apex (Pilihan A)

Buat **4 record A**:

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |

Dan **4 record AAAA** (IPv6, sangat dianjurkan):

| Type | Name | Value |
|------|------|-------|
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |

Lalu tambahkan **satu CNAME** agar `www` ikut berfungsi:

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `www` | `polytaglobalmandiri.github.io` |

> Alamat IP di atas diverifikasi dari dokumentasi resmi GitHub. Bila suatu saat
> situs tiba-tiba tidak dapat diakses padahal sebelumnya normal, cek kembali
> daftar terbaru di
> <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site>

---

## Langkah 4 — Daftarkan domain di GitHub

**Jangan lewati langkah ini.** Mengarahkan DNS ke GitHub tanpa mendaftarkannya di
repo berarti siapa pun yang lebih dulu mengklaim subdomain tersebut bisa
menayangkan situsnya di alamat Anda.

1. Buka repo → **Settings** → menu kiri **Pages**
2. Pastikan *Source* sudah **Deploy from a branch**, branch `main`, folder `/ (root)`
3. Pada kolom **Custom domain**, ketik domain Anda, misalnya:
   ```
   portal.polytaglobalmandiri.com
   ```
4. Klik **Save**

GitHub akan otomatis membuat file bernama `CNAME` di akar repositori, lalu
menjalankan pengecekan DNS. Tunggu sampai muncul tanda centang hijau
**DNS check successful**.

### Ambil file CNAME ke komputer Anda

Karena GitHub membuat commit baru di sisi server, repo lokal Anda menjadi
tertinggal. Jalankan:

```powershell
git pull
```

Bila langkah ini dilewati, `git push` berikutnya akan ditolak dengan pesan
*"Updates were rejected"*.

> ⚠️ **Jangan pernah menghapus file `CNAME`** dari repo. File itulah yang memberi
> tahu GitHub domain mana yang dipakai. Menghapusnya membuat custom domain
> lepas dan situs kembali ke alamat `.github.io`.

---

## Langkah 5 — Aktifkan HTTPS

Setelah pengecekan DNS berhasil, kembali ke **Settings → Pages** lalu centang
**Enforce HTTPS**.

GitHub menerbitkan sertifikat SSL gratis dari Let's Encrypt secara otomatis.
Prosesnya bisa memakan waktu **hingga 24 jam** — selama itu kotak centangnya
mungkin masih abu-abu dan tidak bisa diklik. Ini normal, tunggu saja.

Setelah aktif, alamat portal akan tampil dengan ikon gembok:

```
https://portal.polytaglobalmandiri.com
```

---

## Langkah 6 — Verifikasi kepemilikan domain (dianjurkan)

Agar tidak ada akun GitHub lain yang bisa mengklaim subdomain Anda:

1. Buka **Settings akun/organisasi** (bukan settings repo) → **Pages**
2. Klik **Add a domain**, masukkan domain Anda
3. GitHub memberi satu record `TXT` — tambahkan di panel DNS registrar
4. Kembali ke GitHub, klik **Verify**

---

## Memeriksa Hasil

Perubahan DNS butuh waktu menyebar — biasanya **10–60 menit**, kadang sampai
24 jam. Periksa dari PowerShell:

```powershell
Resolve-DnsName portal.polytaglobalmandiri.com -Type CNAME
```

Untuk domain apex:

```powershell
Resolve-DnsName polytaglobalmandiri.com -Type A
```

Hasilnya harus menunjukkan `polytaglobalmandiri.github.io` atau salah satu dari
empat IP `185.199.10x.153` di atas.

> Perintah `dig` yang disebut dokumentasi GitHub tidak tersedia bawaan di Windows.
> Gunakan `Resolve-DnsName` atau `nslookup` seperti di atas.

Untuk melihat penyebaran DNS di berbagai negara: <https://dnschecker.org>

---

## Pemecahan Masalah — Bagian II

### ❌ "Domain does not resolve to the GitHub Pages server"

DNS belum menyebar, atau record salah ketik. Periksa:

- Kolom **Value** tidak mengandung `https://`, nama repo, atau garis miring
- Kolom **Name** hanya berisi `portal` (atau `@` untuk apex), bukan alamat lengkap
- Tunggu 30–60 menit, lalu klik **Save** ulang pada kolom Custom domain di GitHub

### ❌ "Enforce HTTPS" tidak bisa dicentang (abu-abu)

Sertifikat masih diterbitkan. Tunggu hingga 24 jam. Bila lewat dari itu, kosongkan
kolom Custom domain → **Save** → isi ulang → **Save**. Proses penerbitan akan diulang.

### ❌ `git push` ditolak setelah mengatur custom domain

GitHub membuat commit file `CNAME` yang belum ada di komputer Anda:

```powershell
git pull
git push
```

### ❌ Situs tampil tanpa gambar / CSS berantakan

Pastikan file `.nojekyll` masih ada di akar repo (sudah disertakan di proyek ini).
Tanpa file itu, GitHub memproses situs lewat Jekyll dan folder `assets/` bisa
diabaikan.

### ❌ Website perusahaan yang sudah ada ikut mati

Terjadi bila record apex (`@`) yang lama diubah, bukan ditambah. Kembalikan record
`A`/`CNAME` milik hosting lama, lalu pakai **subdomain** (Pilihan B) yang tidak
menyentuh konfigurasi domain utama sama sekali.

---

## Bonus: Email Profesional

Setelah memiliki domain, Anda juga bisa memakai alamat email perusahaan seperti
`zulfi@polytaglobalmandiri.com` — jauh lebih meyakinkan bagi pelanggan dan
supplier dibanding alamat Gmail.

Pilihannya:

- **Google Workspace** — ± Rp 100 rb/pengguna/bulan. Antarmuka Gmail yang sudah
  dikenal, plus Drive dan Sheets yang sudah dipakai portal ini.
- **Zoho Mail** — ada paket gratis untuk beberapa pengguna dengan satu domain.
- **Email dari paket hosting registrar** — biasanya sudah termasuk saat membeli
  domain di Domainesia/Niagahoster/Rumahweb.

Konfigurasinya lewat record `MX` di panel DNS yang sama, dan **tidak mengganggu**
record Pages selama record `A`/`CNAME` di atas tidak diubah.

---

## Catatan Keamanan

Repositori ini saat ini bersifat **publik**. Memasang custom domain membuat portal
lebih mudah ditemukan — termasuk oleh mesin pencari. Isi proyek hanya berupa
*daftar tautan*; perlindungan sesungguhnya tetap berada pada izin berbagi di
Google Drive/OneDrive tiap berkas.

Bila daftar tautan itu sendiri dianggap rahasia perusahaan, pertimbangkan:

1. Ubah repo menjadi **private** (GitHub Pages pada repo private memerlukan paket
   berbayar), atau
2. Tayangkan portal di server internal perusahaan, bukan GitHub Pages.

Untuk mencegah pengindeksan mesin pencari, tambahkan file `robots.txt` di akar repo:

```
User-agent: *
Disallow: /
```

Perlu diingat, ini hanya permintaan sopan kepada mesin pencari — bukan
pengamanan. Siapa pun yang mengetahui alamatnya tetap dapat membukanya.

---

Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI
