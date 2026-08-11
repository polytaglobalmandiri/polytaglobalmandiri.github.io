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
    "Untuk akses folder dari cloud pastikan anda sudah memiliki akses file tersebut, apabila ada perubahan dan perizinan silakan hubungi administrator!",
  footer: "Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI",

  /* Urutan menu navigasi. `path` adalah folder halaman, dibuat berbasis
     folder agar alamatnya bersih tanpa akhiran .html */
  nav: [
    { id: "beranda", label: "BERANDA", path: "" },
    { id: "marketing", label: "MARKETING", path: "marketing/" },
    { id: "ppic", label: "PPIC", path: "ppic/" },
    { id: "purchasing", label: "PURCHASING", path: "purchasing/" },
    { id: "produksi", label: "PRODUKSI", path: "produksi/" },
    { id: "finance", label: "FINANCE", path: "finance/" },
    { id: "bantuan", label: "BANTUAN", path: "bantuan/" }
  ],

  pages: {
    beranda: {
      title: "BERANDA",
      heading: "Pusat Akses Terpadu",
      lead: "Pusat tautan menuju folder dan berkas cloud seluruh departemen. Akses dibatasi berdasarkan peran masing-masing pengguna.",
      departments: [
        { id: "marketing", label: "MARKETING", path: "marketing/", desc: "Folder tim, laporan, dan tautan operasional pemasaran.", image: "assets/img/departments/marketing.webp" },
        { id: "ppic", label: "PPIC", path: "ppic/", desc: "Manajemen SPK, database OTS, back-up produksi, dashboard.", image: "assets/img/departments/ppic.webp" },
        { id: "purchasing", label: "PURCHASING", path: "purchasing/", desc: "Purchase order dan perbandingan harga supplier.", image: "assets/img/departments/purchasing.webp" },
        { id: "produksi", label: "PRODUKSI", path: "produksi/", desc: "Input problem, dokumentasi foto, dan data production issue.", image: "assets/img/departments/produksi.webp" },
        { id: "finance", label: "FINANCE", path: "finance/", desc: "Arsip laporan piutang, hutang, dan kas pabrik.", image: "assets/img/departments/finance.webp" },
        { id: "bantuan", label: "BANTUAN", path: "bantuan/", desc: "Panduan penggunaan portal dan kontak administrator.", image: "assets/img/departments/bantuan.webp" }
      ]
    },
    marketing: {
      title: "MARKETING TEAM",
      heading: "Folder &amp; File Marketing",
      sections: [
        {
          title: "Folder - File Marketing",
          hint: "Folder personal anggota tim",
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
          title: "Report Marketing",
          hint: "Arsip laporan dan lampiran",
          items: [
            { label: "Laporan Marketing", url: "", type: "onedrive", icon: "chart" },
            { label: "Lampiran PO", url: "", type: "onedrive", icon: "clip" },
            { label: "Lampiran PHJ", url: "", type: "onedrive", icon: "clip" }
          ]
        },
        {
          title: "Link Marketing",
          hint: "Spreadsheet dan folder operasional",
          items: [
            { label: "Schedule Design", url: "", type: "sheets", icon: "calendar" },
            { label: "PH - KP - SPK", url: "", type: "sheets", icon: "doc" },
            { label: "Mobil Marketing", url: "", type: "sheets", icon: "car" },
            { label: "Izin dan Legalitas", url: "", type: "drive", icon: "badge" },
            { label: "Schedule Blowing Printing", url: "", type: "drive", icon: "calendar" },
            { label: "Stok Barang Jadi", url: "", type: "drive", icon: "box" },
            { label: "Target Tagihan Piutang", url: "", type: "drive", icon: "target" },
            { label: "Order Balance", url: "", type: "drive", icon: "scale" },
            { label: "Pengiriman Marketing Harian", url: "", type: "drive", icon: "truck" },
            { label: "PO Harga Terbaru", url: "", type: "onedrive", icon: "tag" },
            { label: "OTS Mustika", url: "", type: "onedrive", icon: "list" }
          ]
        }
      ]
    },
    ppic: {
      title: "PPIC TEAM",
      heading: "Production Planning &amp; Inventory Control",
      sections: [
        {
          title: "Manajemen SPK",
          hint: "Sistem otomasi surat perintah kerja",
          items: [
            { label: "Dashboard PPIC", url: "", type: "script", icon: "gauge" },
            { label: "Penarikan data", url: "", type: "script", icon: "download" },
            { label: "Manajemen Bahan", url: "", type: "script", icon: "box" },
            { label: "Kembali", url: "../", type: "site" }
          ]
        },
        {
          title: "Database SPK dan OTS",
          hint: "Basis data perencanaan dan persediaan",
          items: [
            { label: "Master Data", url: "", type: "sheets", icon: "database" },
            { label: "Pengiriman Harian Marketing", url: "", type: "sheets", icon: "truck" },
            { label: "LHP - SPK Selesai", url: "", type: "sheets", icon: "check" },
            { label: "WIP Stok Roll", url: "", type: "sheets", icon: "cylinder" },
            { label: "Stok WH Roll", url: "", type: "sheets", icon: "warehouse" },
            { label: "Stok Barang Jadi", url: "", type: "sheets", icon: "box" },
            { label: "Schedule Blowing Printing", url: "", type: "sheets", icon: "calendar" },
            { label: "List Pemesanan Bahan Baku", url: "", type: "sheets", icon: "list" },
            { label: "Tinta dan Cylinder", url: "", type: "sheets", icon: "droplet" },
            { label: "Outstanding on Hand", url: "", type: "sheets", icon: "clock" },
            { label: "Stok Bahan Baku Resin", url: "", type: "sheets", icon: "flask" },
            { label: "Sparepart", url: "", type: "sheets", icon: "nut" },
            { label: "Folder Sharing", url: "", type: "drive", icon: "share" }
          ]
        },
        {
          title: "Back Up Seluruh Data Produksi",
          hint: "Arsip per lini proses",
          items: [
            { label: "BLOWING", url: "", type: "drive", icon: "wind" },
            { label: "PRINTING", url: "", type: "drive", icon: "printer" },
            { label: "FOLDING", url: "", type: "drive", icon: "fold" },
            { label: "SLITTING", url: "", type: "drive", icon: "slit" },
            { label: "GUSSET", url: "", type: "drive", icon: "layers" },
            { label: "CUTTING", url: "", type: "drive", icon: "scissors" }
          ]
        },
        {
          title: "Dashboard",
          hint: "Visualisasi kinerja produksi",
          items: [
            { label: "DASHBOARD ANALISYS", url: "", type: "script", icon: "gauge" }
          ]
        },
        {
          title: "Get Data By Outstanding",
          hint: "Penarikan data berdasarkan outstanding",
          items: [
            { label: "RETRIEVE DATA", url: "", type: "script", icon: "download" }
          ]
        },
        {
          title: "Form Input",
          hint: "Formulir pengisian data",
          items: [
            { label: "Hanover Work Order", url: "", type: "form", icon: "clipboard" }
          ]
        }
      ]
    },
    purchasing: {
      title: "PURCHASING TEAM",
      heading: "Pengadaan &amp; Perbandingan Harga",
      sections: [
        {
          title: "Report Purchasing",
          hint: "Dokumen pengadaan berjalan",
          items: [
            { label: "PO 2026", url: "", type: "sheets", icon: "receipt" },
            { label: "Perbandingan Harga Supplier", url: "", type: "sheets", icon: "scale" },
            { label: "Perbandingan Harga Tinta", url: "", type: "sheets", icon: "droplet" }
          ]
        }
      ]
    },
    produksi: {
      title: "PRODUKSI TEAM",
      heading: "Pelaporan &amp; Pengendalian Produksi",
      sections: [
        {
          title: "Input Problem Produksi",
          hint: "Laporkan kendala sesuai bagian",
          items: [
            { label: "Produksi", url: "", type: "form", icon: "factory" },
            { label: "Teknik", url: "", type: "form", icon: "wrench" },
            { label: "Sparepart", url: "", type: "form", icon: "nut" },
            { label: "Purchasing", url: "", type: "form", icon: "cart" },
            { label: "Panel Listrik", url: "", type: "form", icon: "bolt" },
            { label: "Refresh", url: "#refresh", type: "site" }
          ]
        },
        {
          title: "Foto Problem Produksi",
          hint: "Dokumentasi visual per bagian",
          items: [
            { label: "Foto Produksi", url: "", type: "drive", icon: "camera" },
            { label: "Foto Teknik", url: "", type: "drive", icon: "camera" },
            { label: "Foto Sparepart", url: "", type: "drive", icon: "camera" },
            { label: "Foto Purchasing", url: "", type: "drive", icon: "camera" },
            { label: "Foto Panel Listrik", url: "", type: "drive", icon: "camera" }
          ]
        },
        {
          title: "Data Production Issue",
          hint: "Basis data dan aplikasi pengendalian",
          items: [
            { label: "Production Problem", url: "", type: "sheets", icon: "warn" },
            { label: "Production Control", url: "", type: "script", icon: "sliders" },
            { label: "Engineering Archived", url: "", type: "script", icon: "archive" },
            { label: "Quality Control", url: "", type: "drive", icon: "shield" },
            { label: "HR - GA Issue", url: "", type: "script", icon: "users" },
            { label: "Warehouse", url: "", type: "script", icon: "warehouse" },
            { label: "Document SOP", url: "", type: "script", icon: "doc" },
            { label: "Work In Proses", url: "", type: "script", icon: "layers" }
          ]
        }
      ]
    },
    finance: {
      title: "FINANCE TEAM",
      heading: "Arsip Laporan Keuangan",
      sections: [
        {
          title: "Archived Report Finance",
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
    bantuan: {
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
          q: "Saya tidak bisa membuka salah satu folder, apa yang harus dilakukan?",
          a: "Pastikan Anda telah masuk (login) dengan akun perusahaan yang benar. Bila tetap ditolak, berarti akun Anda belum memiliki izin pada folder tersebut — hubungi administrator untuk pengajuan akses."
        },
        {
          q: "Bagaimana cara mengajukan perubahan perizinan?",
          a: "Kirimkan permintaan kepada administrator dengan menyebutkan nama file/folder, jenis akses yang diminta (lihat atau edit), serta alasan kebutuhannya."
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
          a: "Ada. Tekan tombol garis miring <b>/</b> di mana saja pada halaman untuk langsung melompat ke kolom pencarian, tanpa perlu mengarahkan tetikus. Tekan <b>Esc</b> untuk mengosongkan kolom dan keluar darinya."
        }
      ]
    }
  }
};
