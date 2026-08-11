/* =====================================================================
   POLYTA GLOBAL MANDIRI — Portal Akses Internal
   ---------------------------------------------------------------------
   BERKAS INI DIHASILKAN OLEH PANEL ADMINISTRATOR (/admin/).
   Boleh disunting tangan, dan panel akan tetap membacanya dengan benar.

   Setiap item memiliki dua penanda yang berbeda maksudnya:

     type  — DI MANA berkas tersimpan. Menentukan warna dan bahan plat.
             sheets | drive | onedrive | form | script | slides | site | folder

     icon  — APA isi tautannya. Menentukan gambar glif di atas plat.
             Daftar lengkap ada pada objek ICON di assets/js/app.js.
             Bila dikosongkan, glif mengikuti `type`.
   ===================================================================== */

const SITE = {
  name: "POLYTA GLOBAL MANDIRI",
  short: "PGM",
  tagline: "Portal Akses Data &amp; Dokumen Internal",
  notice:
    "Untuk mengakses direktori penyimpanan daring, pastikan Anda sudah memiliki izin terhadap berkas tersebut. Apabila ada perubahan atau kendala perizinan, silakan hubungi administrator!",
  footer: "Dikembangkan dan dikelola oleh: Tim POLYTA GLOBAL MANDIRI",

  /* Urutan menu navigasi. `path` adalah folder halaman, dibuat berbasis
     folder agar alamatnya bersih tanpa akhiran .html */
  nav: [
    { id: "beranda", label: "BERANDA", path: "" },
    { id: "marketing", label: "PEMASARAN", path: "pages/marketing/" },
    { id: "ppic", label: "PPIC", path: "pages/ppic/" },
    { id: "purchasing", label: "PEMBELIAN", path: "pages/purchasing/" },
    { id: "production", label: "PRODUKSI", path: "pages/production/" },
    { id: "finance", label: "KEUANGAN", path: "pages/finance/" },
    { id: "support", label: "BANTUAN", path: "pages/support/" }
  ],

  pages: {
    beranda: {
      title: "BERANDA",
      heading: "Pusat Akses Terpadu",
      lead: "Pusat tautan menuju direktori dan berkas daring seluruh departemen. Akses dibatasi berdasarkan peran masing-masing pengguna.",
      departments: [
        { id: "marketing", label: "PEMASARAN", path: "pages/marketing/", desc: "Direktori tim, laporan, dan tautan operasional pemasaran.", image: "assets/img/departments/marketing.webp" },
        { id: "ppic", label: "PPIC", path: "pages/ppic/", desc: "Pengelolaan SPK, basis data OTS, cadangan produksi, dan dasbor.", image: "assets/img/departments/ppic.webp" },
        { id: "purchasing", label: "PEMBELIAN", path: "pages/purchasing/", desc: "Pesanan pembelian dan perbandingan harga pemasok.", image: "assets/img/departments/purchasing.webp" },
        { id: "production", label: "PRODUKSI", path: "pages/production/", desc: "Pelaporan kendala, dokumentasi foto, dan data masalah produksi.", image: "assets/img/departments/production.webp" },
        { id: "finance", label: "KEUANGAN", path: "pages/finance/", desc: "Arsip laporan piutang, utang, dan kas pabrik.", image: "assets/img/departments/finance.webp" },
        { id: "support", label: "BANTUAN", path: "pages/support/", desc: "Panduan penggunaan portal dan kontak pengelola.", image: "assets/img/departments/support.webp" }
      ]
    },
    marketing: {
      title: "TIM PEMASARAN",
      heading: "Direktori &amp; Berkas Pemasaran",
      sections: [
        {
          title: "Direktori dan Berkas Pemasaran",
          hint: "Direktori pribadi anggota tim",
          items: [
            { label: "Sri Yamtinah", url: "", type: "sheets", icon: "person" },
            { label: "Mutiara", url: "", type: "onedrive", icon: "person" },
            { label: "Siti Juheriah", url: "", type: "onedrive", icon: "person" },
            { label: "Michelle Lam", url: "", type: "onedrive", icon: "person" },
            { label: "Lutfi", url: "", type: "onedrive", icon: "person" },
            { label: "Welis", url: "", type: "onedrive", icon: "person" },
            { label: "Puput Safitri", url: "", type: "onedrive", icon: "person" },
            { label: "Ersa Nuryana", url: "", type: "onedrive", icon: "person" },
            { label: "Adel", url: "", type: "onedrive", icon: "person" }
          ]
        },
        {
          title: "Laporan Pemasaran",
          hint: "Arsip laporan dan lampiran",
          items: [
            { label: "Laporan Pemasaran", url: "", type: "onedrive", icon: "chart" },
            { label: "Lampiran PO", url: "", type: "onedrive", icon: "clip" },
            { label: "Lampiran PHJ", url: "", type: "onedrive", icon: "clip" }
          ]
        },
        {
          title: "Tautan Pemasaran",
          hint: "Lembar kerja dan direktori operasional",
          items: [
            { label: "Jadwal Desain", url: "", type: "sheets", icon: "calendar" },
            { label: "PH - KP - SPK", url: "", type: "sheets", icon: "doc" },
            { label: "Kendaraan Pemasaran", url: "", type: "sheets", icon: "car" },
            { label: "Izin dan Legalitas", url: "", type: "drive", icon: "badge" },
            { label: "Jadwal Peniupan dan Pencetakan", url: "", type: "drive", icon: "calendar" },
            { label: "Stok Barang Jadi", url: "", type: "drive", icon: "box" },
            { label: "Target Tagihan Piutang", url: "", type: "drive", icon: "target" },
            { label: "Sisa Pesanan", url: "", type: "drive", icon: "scale" },
            { label: "Pengiriman Pemasaran Harian", url: "", type: "drive", icon: "truck" },
            { label: "PO Harga Terbaru", url: "", type: "onedrive", icon: "tag" },
            { label: "OTS Mustika", url: "", type: "onedrive", icon: "list" }
          ]
        }
      ]
    },
    ppic: {
      title: "TIM PPIC",
      heading: "Perencanaan Produksi &amp; Pengendalian Persediaan",
      sections: [
        {
          title: "Manajemen SPK",
          hint: "Sistem otomasi surat perintah kerja",
          items: [
            { label: "Dasbor PPIC", url: "/apps/spk-automation/", type: "script", icon: "gauge" },
            { label: "Penarikan data", url: "/apps/spk-automation/data-retrieval/", type: "script", icon: "download" },
            { label: "Manajemen Bahan", url: "/apps/spk-automation/material-issue/", type: "script", icon: "box" }
          ]
        },
        {
          title: "Basis Data SPK dan OTS",
          hint: "Basis data perencanaan dan persediaan",
          items: [
            { label: "Data Induk", url: "", type: "sheets", icon: "database" },
            { label: "Pengiriman Harian Pemasaran", url: "", type: "sheets", icon: "truck" },
            { label: "LHP - SPK Selesai", url: "", type: "sheets", icon: "check" },
            { label: "Persediaan Rol Dalam Proses", url: "", type: "sheets", icon: "cylinder" },
            { label: "Persediaan Rol Gudang", url: "", type: "sheets", icon: "warehouse" },
            { label: "Stok Barang Jadi", url: "", type: "sheets", icon: "box" },
            { label: "Jadwal Peniupan dan Pencetakan", url: "", type: "sheets", icon: "calendar" },
            { label: "Daftar Pemesanan Bahan Baku", url: "", type: "sheets", icon: "list" },
            { label: "Tinta dan Silinder", url: "", type: "sheets", icon: "droplet" },
            { label: "Persediaan Tersedia", url: "", type: "sheets", icon: "clock" },
            { label: "Stok Bahan Baku Resin", url: "", type: "sheets", icon: "flask" },
            { label: "Suku Cadang", url: "", type: "sheets", icon: "nut" },
            { label: "Direktori Bersama", url: "", type: "drive", icon: "share" }
          ]
        },
        {
          title: "Cadangan Seluruh Data Produksi",
          hint: "Arsip per lini proses",
          items: [
            { label: "PENIUPAN", url: "", type: "drive", icon: "wind" },
            { label: "PENCETAKAN", url: "", type: "drive", icon: "printer" },
            { label: "PELIPATAN", url: "", type: "drive", icon: "fold" },
            { label: "PEMBELAHAN", url: "", type: "drive", icon: "slit" },
            { label: "PEMBENTUKAN LIPATAN", url: "", type: "drive", icon: "layers" },
            { label: "PEMOTONGAN", url: "", type: "drive", icon: "scissors" }
          ]
        },
        {
          title: "Dasbor",
          hint: "Visualisasi kinerja produksi",
          items: [
            { label: "DASBOR ANALISIS", url: "", type: "script", icon: "gauge" }
          ]
        },
        {
          title: "Ambil Data Tertunda",
          hint: "Penarikan data berdasarkan pekerjaan tertunda",
          items: [
            { label: "AMBIL DATA", url: "", type: "script", icon: "download" }
          ]
        },
        {
          title: "Formulir Isian",
          hint: "Formulir pengisian data",
          items: [
            { label: "Perintah Kerja Hanover", url: "", type: "form", icon: "clipboard" }
          ]
        }
      ]
    },
    purchasing: {
      title: "TIM PEMBELIAN",
      heading: "Pengadaan &amp; Perbandingan Harga",
      sections: [
        {
          title: "Laporan Pembelian",
          hint: "Dokumen pengadaan berjalan",
          items: [
            { label: "PO 2026", url: "", type: "sheets", icon: "receipt" },
            { label: "Perbandingan Harga Pemasok", url: "", type: "sheets", icon: "scale" },
            { label: "Perbandingan Harga Tinta", url: "", type: "sheets", icon: "droplet" }
          ]
        }
      ]
    },
    production: {
      title: "TIM PRODUKSI",
      heading: "Pelaporan &amp; Pengendalian Produksi",
      sections: [
        {
          title: "Pelaporan Kendala Produksi",
          hint: "Laporkan kendala sesuai bagian",
          items: [
            { label: "Produksi", url: "", type: "form", icon: "factory" },
            { label: "Teknik", url: "", type: "form", icon: "wrench" },
            { label: "Suku Cadang", url: "", type: "form", icon: "nut" },
            { label: "Pembelian", url: "", type: "form", icon: "cart" },
            { label: "Panel Listrik", url: "", type: "form", icon: "bolt" },
            { label: "Segarkan", url: "#refresh", type: "site" }
          ]
        },
        {
          title: "Foto Kendala Produksi",
          hint: "Dokumentasi visual per bagian",
          items: [
            { label: "Foto Produksi", url: "", type: "drive", icon: "camera" },
            { label: "Foto Teknik", url: "", type: "drive", icon: "camera" },
            { label: "Foto Suku Cadang", url: "", type: "drive", icon: "camera" },
            { label: "Foto Pembelian", url: "", type: "drive", icon: "camera" },
            { label: "Foto Panel Listrik", url: "", type: "drive", icon: "camera" }
          ]
        },
        {
          title: "Data Kendala Produksi",
          hint: "Basis data dan aplikasi pengendalian",
          items: [
            { label: "Masalah Produksi", url: "", type: "sheets", icon: "warn" },
            { label: "Pengendalian Produksi", url: "", type: "script", icon: "sliders" },
            { label: "Arsip Teknik", url: "", type: "script", icon: "archive" },
            { label: "Kendali Mutu", url: "", type: "drive", icon: "shield" },
            { label: "Kendala SDM dan Umum", url: "", type: "script", icon: "users" },
            { label: "Gudang", url: "", type: "script", icon: "warehouse" },
            { label: "Dokumen SOP", url: "", type: "script", icon: "doc" },
            { label: "Barang Dalam Proses", url: "", type: "script", icon: "layers" }
          ]
        }
      ]
    },
    finance: {
      title: "TIM KEUANGAN",
      heading: "Arsip Laporan Keuangan",
      sections: [
        {
          title: "Arsip Laporan Keuangan",
          hint: "Rekapitulasi berkala",
          items: [
            { label: "Rekap Piutang", url: "", type: "sheets", icon: "up" },
            { label: "Rekap Hutang", url: "", type: "sheets", icon: "down" },
            { label: "Pemakaian E-Tol", url: "", type: "sheets", icon: "road" },
            { label: "Pemakaian Kas Pabrik", url: "", type: "sheets", icon: "coins" }
          ]
        }
      ]
    },
    support: {
      title: "BANTUAN",
      heading: "Panduan Penggunaan Portal",
      sections: [
        {
          title: "Panduan",
          hint: "Materi presentasi penggunaan portal",
          items: [
            { label: "Klik untuk melihat panduan", url: "https://docs.google.com/presentation/d/1_oko31SZ2AmY0lv61rlOx4u8Ew0hsgN19rxX0A5sr60/present", type: "slides", icon: "book" }
          ]
        }
      ],
      faq: [
        {
          q: "Saya tidak bisa membuka salah satu direktori, apa yang harus dilakukan?",
          a: "Pastikan Anda telah masuk dengan akun perusahaan yang benar. Bila tetap ditolak, berarti akun Anda belum memiliki izin pada direktori tersebut — hubungi administrator untuk pengajuan akses."
        },
        {
          q: "Bagaimana cara mengajukan perubahan perizinan?",
          a: "Kirimkan permintaan kepada administrator dengan menyebutkan nama berkas atau direktori, jenis akses yang diminta (lihat atau sunting), serta alasan kebutuhannya."
        },
        {
          q: "Tautan mana yang boleh saya akses?",
          a: "Akses dibatasi berdasarkan peran. Setiap departemen hanya memiliki izin atas data pada halaman departemennya masing-masing, kecuali diberikan izin tambahan."
        },
        {
          q: "Apa fungsi tombol pin pada setiap tautan?",
          a: "Tombol pin menyimpan tautan favorit Anda ke bagian Akses Cepat di halaman Beranda. Data pin tersimpan di perangkat Anda sendiri dan tidak dibagikan."
        },
        {
          q: "Adakah pintasan papan ketik untuk mempercepat pencarian?",
          a: "Ada. Tekan tombol garis miring / di mana saja pada halaman untuk langsung melompat ke kolom pencarian, tanpa perlu mengarahkan tetikus. Tekan Esc untuk mengosongkan kolom dan keluar darinya."
        }
      ]
    }
  }
};
