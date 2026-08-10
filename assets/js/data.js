/* =====================================================================
   POLYTA GLOBAL MANDIRI — Portal Akses Internal
   ---------------------------------------------------------------------
   SEMUA KONTEN SITUS DIATUR DARI FILE INI.
   Untuk mengisi tautan: cukup isi properti `url` pada item yang sesuai.
   Item dengan url kosong ("") akan tampil sebagai "belum diatur".

   Tipe (menentukan ikon + warna label):
     sheets | drive | onedrive | form | script | slides | site | folder
   ===================================================================== */

const SITE = {
  name: "POLYTA GLOBAL MANDIRI",
  short: "PGM",
  tagline: "Portal Akses Data &amp; Dokumen Internal",
  notice:
    "Untuk akses folder dari cloud pastikan anda sudah memiliki akses file tersebut, apabila ada perubahan dan perizinan silakan hubungi administrator!",
  footer: "Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI",

  /* Urutan menu navigasi */
  nav: [
    { id: "beranda",    label: "BERANDA",    file: "index.html" },
    { id: "marketing",  label: "MARKETING",  file: "marketing.html" },
    { id: "ppic",       label: "PPIC",       file: "ppic.html" },
    { id: "purchasing", label: "PURCHASING", file: "purchasing.html" },
    { id: "produksi",   label: "PRODUKSI",   file: "produksi.html" },
    { id: "finance",    label: "FINANCE",    file: "finance.html" },
    { id: "bantuan",    label: "BANTUAN",    file: "bantuan.html" }
  ],

  pages: {
    /* ---------------------------------------------------------- BERANDA */
    beranda: {
      title: "BERANDA",
      heading: "Pusat Akses Terpadu",
      lead:
        "Akses terhadap folder cloud dibatasi berdasarkan peran masing-masing pengguna. " +
        "Pengguna hanya diperkenankan mengakses data yang telah diberikan izin. " +
        "Untuk permintaan akses tambahan atau perubahan perizinan, harap menghubungi administrator.",
      departments: [
        { id: "marketing",  label: "MARKETING",  file: "marketing.html",  desc: "Folder tim, laporan, dan tautan operasional pemasaran." },
        { id: "ppic",       label: "PPIC",       file: "ppic.html",       desc: "Manajemen SPK, database OTS, back-up produksi, dashboard." },
        { id: "purchasing", label: "PURCHASING", file: "purchasing.html", desc: "Purchase order dan perbandingan harga supplier." },
        { id: "produksi",   label: "PRODUKSI",   file: "produksi.html",   desc: "Input problem, dokumentasi foto, dan data production issue." },
        { id: "finance",    label: "FINANCE",    file: "finance.html",    desc: "Arsip laporan piutang, hutang, dan kas pabrik." },
        { id: "bantuan",    label: "BANTUAN",    file: "bantuan.html",    desc: "Panduan penggunaan portal dan kontak administrator." }
      ]
    },

    /* -------------------------------------------------------- MARKETING */
    marketing: {
      title: "MARKETING TEAM",
      heading: "Folder &amp; File Marketing",
      sections: [
        {
          title: "Folder - File Marketing",
          hint: "Folder personal anggota tim",
          items: [
            { label: "Sri Yamtinah",  url: "", type: "onedrive" },
            { label: "Mutiara",       url: "", type: "onedrive" },
            { label: "Siti Juheriah", url: "", type: "onedrive" },
            { label: "Michelle Lam",  url: "", type: "onedrive" },
            { label: "Lutfi",         url: "", type: "onedrive" },
            { label: "Welis",         url: "", type: "onedrive" },
            { label: "Puput Safitri", url: "", type: "onedrive" },
            { label: "Ersa Nuryana",  url: "", type: "onedrive" },
            { label: "Adel",          url: "", type: "onedrive" }
          ]
        },
        {
          title: "Report Marketing",
          hint: "Arsip laporan dan lampiran",
          items: [
            { label: "Laporan Marketing", url: "", type: "onedrive" },
            { label: "Lampiran PO",       url: "", type: "onedrive" },
            { label: "Lampiran PHJ",      url: "", type: "onedrive" }
          ]
        },
        {
          title: "Link Marketing",
          hint: "Spreadsheet dan folder operasional",
          items: [
            { label: "Schedule Design",            url: "", type: "sheets" },
            { label: "PH - KP - SPK",              url: "", type: "sheets" },
            { label: "Mobil Marketing",            url: "", type: "sheets" },
            { label: "Izin dan Legalitas",         url: "", type: "drive" },
            { label: "Schedule Blowing Printing",  url: "", type: "drive" },
            { label: "Stok Barang Jadi",           url: "", type: "drive" },
            { label: "Target Tagihan Piutang",     url: "", type: "drive" },
            { label: "Order Balance",              url: "", type: "drive" },
            { label: "Pengiriman Marketing Harian",url: "", type: "drive" },
            { label: "PO Harga Terbaru",           url: "", type: "onedrive" },
            { label: "OTS Mustika",                url: "", type: "onedrive" }
          ]
        }
      ]
    },

    /* ------------------------------------------------------------- PPIC */
    ppic: {
      title: "PPIC TEAM",
      heading: "Production Planning &amp; Inventory Control",
      sections: [
        {
          title: "Manajemen SPK",
          hint: "Sistem otomasi surat perintah kerja",
          items: [{ label: "SPK Automasi", url: "", type: "script" }]
        },
        {
          title: "Database SPK dan OTS",
          hint: "Basis data perencanaan dan persediaan",
          items: [
            { label: "Master Data",                url: "", type: "sheets" },
            { label: "Pengiriman Harian Marketing",url: "", type: "sheets" },
            { label: "LHP - SPK Selesai",          url: "", type: "sheets" },
            { label: "WIP Stok Roll",              url: "", type: "sheets" },
            { label: "Stok WH Roll",               url: "", type: "sheets" },
            { label: "Stok Barang Jadi",           url: "", type: "sheets" },
            { label: "Schedule Blowing Printing",  url: "", type: "sheets" },
            { label: "List Pemesanan Bahan Baku",  url: "", type: "sheets" },
            { label: "Tinta dan Cylinder",         url: "", type: "sheets" },
            { label: "Outstanding on Hand",        url: "", type: "sheets" },
            { label: "Stok Bahan Baku Resin",      url: "", type: "sheets" },
            { label: "Sparepart",                  url: "", type: "sheets" },
            { label: "Folder Sharing",             url: "", type: "drive" }
          ]
        },
        {
          title: "Back Up Seluruh Data Produksi",
          hint: "Arsip per lini proses",
          items: [
            { label: "BLOWING",  url: "", type: "drive" },
            { label: "PRINTING", url: "", type: "drive" },
            { label: "FOLDING",  url: "", type: "drive" },
            { label: "SLITTING", url: "", type: "drive" },
            { label: "GUSSET",   url: "", type: "drive" },
            { label: "CUTTING",  url: "", type: "drive" }
          ]
        },
        {
          title: "Dashboard",
          hint: "Visualisasi kinerja produksi",
          items: [{ label: "DASHBOARD ANALISYS", url: "", type: "script" }]
        },
        {
          title: "Get Data By Outstanding",
          hint: "Penarikan data berdasarkan outstanding",
          items: [{ label: "RETRIEVE DATA", url: "", type: "script" }]
        },
        {
          title: "Form Input",
          hint: "Formulir pengisian data",
          items: [{ label: "Hanover Work Order", url: "", type: "form" }]
        }
      ]
    },

    /* ------------------------------------------------------- PURCHASING */
    purchasing: {
      title: "PURCHASING TEAM",
      heading: "Pengadaan &amp; Perbandingan Harga",
      sections: [
        {
          title: "Report Purchasing",
          hint: "Dokumen pengadaan berjalan",
          items: [
            { label: "PO 2026",                    url: "", type: "sheets" },
            { label: "Perbandingan Harga Supplier",url: "", type: "sheets" },
            { label: "Perbandingan Harga Tinta",   url: "", type: "sheets" }
          ]
        }
      ]
    },

    /* --------------------------------------------------------- PRODUKSI */
    produksi: {
      title: "PRODUKSI TEAM",
      heading: "Pelaporan &amp; Pengendalian Produksi",
      sections: [
        {
          title: "Input Problem Produksi",
          hint: "Laporkan kendala sesuai bagian",
          items: [
            { label: "Produksi",      url: "", type: "form" },
            { label: "Teknik",        url: "", type: "form" },
            { label: "Sparepart",     url: "", type: "form" },
            { label: "Purchasing",    url: "", type: "form" },
            { label: "Panel Listrik", url: "", type: "form" },
            { label: "Refresh",       url: "produksi.html", type: "site" }
          ]
        },
        {
          title: "Foto Problem Produksi",
          hint: "Dokumentasi visual per bagian",
          items: [
            { label: "Foto Produksi",      url: "", type: "drive" },
            { label: "Foto Teknik",        url: "", type: "drive" },
            { label: "Foto Sparepart",     url: "", type: "drive" },
            { label: "Foto Purchasing",    url: "", type: "drive" },
            { label: "Foto Panel Listrik", url: "", type: "drive" }
          ]
        },
        {
          title: "Data Production Issue",
          hint: "Basis data dan aplikasi pengendalian",
          items: [
            { label: "Production Problem",  url: "", type: "sheets" },
            { label: "Production Control",  url: "", type: "script" },
            { label: "Engineering Archived",url: "", type: "script" },
            { label: "Quality Control",     url: "", type: "drive" },
            { label: "HR - GA Issue",       url: "", type: "script" },
            { label: "Warehouse",           url: "", type: "script" },
            { label: "Document SOP",        url: "", type: "script" },
            { label: "Work In Proses",      url: "", type: "script" }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------- FINANCE */
    finance: {
      title: "FINANCE TEAM",
      heading: "Arsip Laporan Keuangan",
      sections: [
        {
          title: "Archived Report Finance",
          hint: "Rekapitulasi berkala",
          items: [
            { label: "Rekap Piutang",       url: "", type: "sheets" },
            { label: "Rekap Hutang",        url: "", type: "sheets" },
            { label: "Pemakaian E-Tol",     url: "", type: "sheets" },
            { label: "Pemakaian Kas Pabrik",url: "", type: "sheets" }
          ]
        }
      ]
    },

    /* ---------------------------------------------------------- BANTUAN */
    bantuan: {
      title: "BANTUAN",
      heading: "Panduan Penggunaan Portal",
      sections: [
        {
          title: "Panduan",
          hint: "Materi presentasi penggunaan portal",
          items: [
            {
              label: "Klik untuk melihat panduan",
              url: "https://docs.google.com/presentation/d/1_oko31SZ2AmY0lv61rlOx4u8Ew0hsgN19rxX0A5sr60/present",
              type: "slides"
            }
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
        }
      ]
    }
  }
};
