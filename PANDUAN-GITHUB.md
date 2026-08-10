# Panduan Push & Pull ke GitHub

Panduan lengkap untuk proyek **POLYTA GLOBAL MANDIRI — Portal Akses Internal**.
Semua perintah dijalankan dari folder proyek ini melalui **PowerShell**.

Kondisi saat ini:

| Hal | Status |
|-----|--------|
| Repositori lokal | ✅ Sudah dibuat (`git init`) |
| Branch | ✅ `main` |
| Commit | ✅ 2 commit sudah ada |
| Remote GitHub | ❌ Belum disambungkan |
| Identitas git (nama/email) | ❌ Belum diatur |
| Penyimpan kredensial | ✅ Aktif (Git Credential Manager) |

---

## Langkah 0 — Atur identitas git (wajib, sekali saja)

Tanpa ini, `git commit` akan gagal dengan pesan *"Please tell me who you are"*.

```powershell
git config --global user.name "Nama Anda"
git config --global user.email "matchapoii@gmail.com"
```

Gunakan email yang **sama dengan email akun GitHub** Anda supaya commit tercatat
atas nama Anda dan muncul di grafik kontribusi.

Verifikasi:

```powershell
git config --global user.name
git config --global user.email
```

---

## Langkah 1 — Salin URL repositori

Buka repositori yang baru Anda buat di GitHub. Pada tombol hijau **Code**,
pilih tab **HTTPS**, lalu salin alamatnya. Bentuknya:

```
https://github.com/USERNAME/NAMA-REPO.git
```

---

## Langkah 2 — Sambungkan remote

```powershell
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
```

Ganti `USERNAME` dan `NAMA-REPO` sesuai milik Anda. Cek hasilnya:

```powershell
git remote -v
```

Harus muncul dua baris `origin` — satu `(fetch)` dan satu `(push)`.

> **Salah ketik URL?** Perbaiki dengan `git remote set-url origin <URL-benar>`,
> bukan `git remote add` lagi (akan error "remote origin already exists").

---

## Langkah 3 — Push pertama

```powershell
git push -u origin main
```

Flag `-u` menghubungkan branch lokal `main` dengan `origin/main`, sehingga
selanjutnya cukup mengetik `git push` dan `git pull` tanpa argumen.

### Saat diminta login

Akan muncul jendela **Git Credential Manager**. Pilih **Sign in with your browser**,
lalu masuk ke akun GitHub Anda. Kredensial tersimpan otomatis — Anda tidak akan
ditanya lagi di lain waktu.

Bila yang muncul justru prompt teks di terminal:

- **Username:** username GitHub Anda
- **Password:** **jangan** pakai password akun. GitHub sudah tidak menerimanya sejak
  Agustus 2021. Buat **Personal Access Token** di
  <https://github.com/settings/tokens> → *Generate new token (classic)* → centang
  scope **`repo`** → salin token → tempelkan sebagai password.

  Token hanya ditampilkan sekali. Simpan baik-baik.

---

## Langkah 4 — Alur kerja harian

Setiap kali Anda mengubah tautan di `assets/js/data.js` atau mengubah tampilan:

```powershell
git pull                          # 1. Ambil perubahan terbaru dari GitHub
git status                        # 2. Lihat file apa saja yang berubah
git add -A                        # 3. Tandai semua perubahan
git commit -m "Isi tautan Marketing"   # 4. Simpan sebagai satu commit
git push                          # 5. Kirim ke GitHub
```

Biasakan `git pull` **sebelum** mulai bekerja, terutama bila ada rekan tim yang
juga mengubah repo yang sama. Ini mencegah konflik.

### Menulis pesan commit yang baik

Jelaskan **apa yang berubah**, bukan "update" saja:

```powershell
git commit -m "Isi URL folder personal tim Marketing"
git commit -m "Tambah tautan Stok Bahan Baku di halaman PPIC"
git commit -m "Perbaiki warna ikon spreadsheet mode gelap"
```

---

## Langkah 5 — Aktifkan GitHub Pages (opsional)

Agar situs bisa dibuka lewat alamat web, bukan hanya file lokal:

1. Buka repositori di GitHub → tab **Settings**
2. Menu kiri → **Pages**
3. Bagian *Source* → pilih **Deploy from a branch**
4. Branch: **`main`**, folder: **`/ (root)`** → klik **Save**
5. Tunggu 1–2 menit, lalu muat ulang halaman Settings → Pages

Alamat situs akan tampil di bagian atas:

```
https://USERNAME.github.io/NAMA-REPO/
```

File `.nojekyll` sudah disertakan di proyek ini supaya GitHub tidak memproses
situs lewat Jekyll dan folder `assets/` tetap terbaca apa adanya.

> ⚠️ **Peringatan keamanan.** GitHub Pages pada repositori publik dapat diakses
> siapa saja di internet. Isi proyek ini hanya berupa *daftar tautan*, bukan data —
> perlindungan sesungguhnya tetap berada pada izin berbagi (sharing permission)
> di Google Drive/OneDrive masing-masing berkas. Namun bila daftar tautan itu
> sendiri Anda anggap rahasia perusahaan, gunakan repositori **private** dan
> hosting internal. GitHub Pages pada repo private hanya tersedia untuk akun berbayar.

---

## Pemecahan Masalah

### ❌ `Updates were rejected because the remote contains work that you do not have locally`

Terjadi bila saat membuat repo Anda mencentang *"Add a README file"*, `.gitignore`,
atau lisensi — GitHub membuat commit sendiri yang tidak dikenal repo lokal.

Gabungkan dulu, lalu push:

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

Bila muncul konflik pada `README.md`, buka filenya, hapus penanda `<<<<<<<`,
`=======`, `>>>>>>>` beserta bagian yang tidak Anda inginkan, simpan, lalu:

```powershell
git add README.md
git commit -m "Gabungkan README dari GitHub"
git push
```

> **Jangan** pakai `git push --force` untuk mengatasi ini. Perintah itu menghapus
> commit yang ada di GitHub tanpa bisa dikembalikan dengan mudah.

### ❌ `src refspec main does not match any`

Belum ada commit di branch `main`, atau nama branch Anda berbeda. Cek:

```powershell
git branch --show-current
git log --oneline
```

Bila branch bernama `master`, ganti namanya:

```powershell
git branch -M main
```

### ❌ `Please tell me who you are`

Identitas git belum diatur. Kembali ke **Langkah 0**.

### ❌ `Authentication failed`

Kredensial lama tersimpan salah. Hapus lewat Windows:
**Control Panel → Credential Manager → Windows Credentials** → cari entri
`git:https://github.com` → **Remove**. Lalu ulangi `git push`, Anda akan diminta
login kembali.

### ❌ `remote origin already exists`

Remote sudah pernah ditambahkan. Ubah alamatnya, jangan menambah baru:

```powershell
git remote set-url origin https://github.com/USERNAME/NAMA-REPO.git
```

### ⚠️ File terkunci / commit gagal karena OneDrive

Folder proyek ini berada di dalam OneDrive. Bila sinkronisasi mengunci file saat
commit, jeda sinkronisasi sebentar (klik ikon OneDrive → **Pause syncing**), atau
pindahkan repositori ke luar OneDrive:

```powershell
Move-Item "C:\Users\Ancient_Light_Elf\OneDrive\Dokumen\Polyta Global Mandiri" "C:\Projects\polyta-portal"
```

Riwayat git ikut terbawa karena tersimpan di dalam folder `.git`.

### ⚠️ Peringatan `LF will be replaced by CRLF`

Ini **bukan error**, hanya pemberitahuan konversi akhir baris Windows. Abaikan saja.
Bila ingin menyembunyikannya:

```powershell
git config --global core.autocrlf true
```

---

## Perintah yang Sering Dipakai

| Perintah | Fungsi |
|----------|--------|
| `git status` | Lihat file apa yang berubah |
| `git diff` | Lihat isi perubahan baris per baris |
| `git log --oneline` | Riwayat commit ringkas |
| `git add -A` | Tandai semua perubahan |
| `git commit -m "pesan"` | Simpan perubahan sebagai commit |
| `git push` | Kirim commit ke GitHub |
| `git pull` | Ambil perubahan dari GitHub |
| `git restore <file>` | Batalkan perubahan pada satu file (belum di-`add`) |
| `git restore --staged <file>` | Batalkan `git add` pada satu file |
| `git remote -v` | Lihat alamat remote |

### Membatalkan commit terakhir (belum di-push)

```powershell
git reset --soft HEAD~1
```

Commit dibatalkan, tetapi perubahan file **tetap aman** dan siap di-commit ulang.

---

Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI
