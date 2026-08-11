(function () {
  "use strict";

  var STORAGE_KEY = "pgm:language";
  var ID = {
    "MARKETING": "PEMASARAN",
    "PURCHASING": "PEMBELIAN",
    "PRODUCTION": "PRODUKSI",
    "FINANCE": "KEUANGAN",
    "SUPPORT": "BANTUAN",
    "MARKETING TEAM": "TIM PEMASARAN",
    "PPIC TEAM": "TIM PPIC",
    "PURCHASING TEAM": "TIM PEMBELIAN",
    "PRODUCTION TEAM": "TIM PRODUKSI",
    "FINANCE TEAM": "TIM KEUANGAN",
    "Dashboard": "Dasbor",
    "Dashboard PPIC": "Dasbor PPIC",
    "Marketing": "Pemasaran",
    "Purchasing": "Pembelian",
    "Production": "Produksi",
    "Finance": "Keuangan",
    "Support": "Bantuan",
    "Customer": "Pelanggan",
    "Brand": "Merek",
    "Folder": "Direktori",
    "File": "Berkas",
    "Report": "Laporan",
    "Refresh": "Segarkan",
    "Database": "Basis Data",
    "Master Data": "Data Induk",
    "Back Up": "Cadangan",
    "Sparepart": "Suku Cadang",
    "Warehouse": "Gudang",
    "Quality Control": "Kendali Mutu"
  };
  var EN = {
    "Portal Akses Internal": "Internal Access Portal",
    "Portal Administrator": "Administrator Portal",
    "Beranda": "Home",
    "Seluruh Tautan": "All Links",
    "Bantuan": "Support",
    "PEMASARAN": "MARKETING",
    "PEMBELIAN": "PURCHASING",
    "PRODUKSI": "PRODUCTION",
    "KEUANGAN": "FINANCE",
    "BANTUAN": "SUPPORT",
    "TIM PEMASARAN": "MARKETING TEAM",
    "TIM PPIC": "PPIC TEAM",
    "TIM PEMBELIAN": "PURCHASING TEAM",
    "TIM PRODUKSI": "PRODUCTION TEAM",
    "TIM KEUANGAN": "FINANCE TEAM",
    "Dasbor": "Dashboard",
    "Dasbor PPIC": "PPIC Dashboard",
    "Pemasaran": "Marketing",
    "Pembelian": "Purchasing",
    "Produksi": "Production",
    "Keuangan": "Finance",
    "Bahasa Indonesia": "Indonesian",
    "Bahasa Inggris": "English",
    "Pelanggan": "Customer",
    "Merek": "Brand",
    "Direktori": "Folder",
    "Berkas": "File",
    "Laporan": "Reports",
    "Segarkan": "Refresh",
    "Basis Data": "Database",
    "Data Induk": "Master Data",
    "Cadangan": "Backup",
    "Suku Cadang": "Spare Parts",
    "Gudang": "Warehouse",
    "Kendali Mutu": "Quality Control",
    "Administrator": "Administrator",
    "Portal Utama": "Main Portal",
    "Kembali ke portal utama": "Return to main portal",
    "Ganti mode terang atau gelap": "Switch light or dark mode",
    "Lewati ke konten utama": "Skip to main content",
    "Pencarian": "Search",
    "Cari tautan, folder, atau dokumen...": "Search links, folders, or documents...",
    "Cari tautan di halaman ini...": "Search links on this page...",
    "seluruh tautan": "all links",
    "Akses Cepat": "Quick Access",
    "Tautan yang Anda sematkan — tersimpan di perangkat ini": "Links pinned on this device",
    "Direktori Departemen": "Department Directory",
    "Pilih departemen untuk melihat daftar folder dan berkas": "Select a department to view folders and files",
    "Seluruh Tautan": "All Links",
    "Indeks lengkap lintas departemen": "Complete cross-department index",
    "Pertanyaan Umum": "Frequently Asked Questions",
    "Jawaban singkat untuk kendala yang sering terjadi": "Quick answers to common issues",
    "Tidak ada tautan yang cocok dengan pencarian Anda.": "No links match your search.",
    "Kembali ke atas": "Back to top",
    "Buka tautan": "Open link",
    "Sematkan": "Pin",
    "Lepas sematan": "Unpin",
    "Tautan belum diatur": "Link not configured",
    "© 2026 POLYTA GLOBAL MANDIRI · Akses berbasis peran": "© 2026 POLYTA GLOBAL MANDIRI · Role-based access",
    "Dikembangkan dan dikelola oleh: Team POLYTA GLOBAL MANDIRI": "Developed and managed by: POLYTA GLOBAL MANDIRI Team",
    "Pusat tautan menuju folder dan berkas cloud seluruh departemen. Akses dibatasi berdasarkan peran masing-masing pengguna.": "Central access to cloud folders and files across all departments. Access is restricted by each user's role.",

    "Marketing & Sales": "Marketing & Sales",
    "PPIC TEAM": "PPIC TEAM",
    "Purchasing": "Purchasing",
    "Produksi": "Production",
    "Finance": "Finance",
    "Bantuan & Dukungan": "Help & Support",
    "Folder tim, laporan, dan tautan operasional pemasaran.": "Team folders, reports, and marketing operational links.",
    "Manajemen SPK, database OTS, back-up produksi, dashboard.": "SPK management, OTS database, production backup, and dashboard.",
    "Purchase order dan perbandingan harga supplier.": "Purchase orders and supplier price comparisons.",
    "Input problem, dokumentasi foto, dan data production issue.": "Issue input, photo documentation, and production issue data.",
    "Arsip laporan piutang, hutang, dan kas pabrik.": "Receivables, payables, and factory cash report archives.",
    "Panduan penggunaan portal dan kontak administrator.": "Portal usage guide and administrator contact.",
    "Direktori tim, laporan, dan tautan operasional pemasaran.": "Team folders, reports, and marketing operational links.",
    "Pengelolaan SPK, basis data OTS, cadangan produksi, dan dasbor.": "SPK management, OTS database, production backup, and dashboard.",
    "Pesanan pembelian dan perbandingan harga pemasok.": "Purchase orders and supplier price comparisons.",
    "Pelaporan kendala, dokumentasi foto, dan data masalah produksi.": "Issue reporting, photo documentation, and production issue data.",
    "Arsip laporan piutang, utang, dan kas pabrik.": "Receivables, payables, and factory cash report archives.",
    "Panduan penggunaan portal dan kontak pengelola.": "Portal usage guide and administrator contact.",
    "Dashboard PPIC": "PPIC Dashboard",
    "Penarikan data": "Data Retrieval",
    "Manajemen Bahan": "Material Management",
    "Folder - File Marketing": "Marketing Folders & Files",
    "Report Marketing": "Marketing Reports",
    "Link Marketing": "Marketing Links",
    "Manajemen SPK": "SPK Management",
    "Database SPK dan OTS": "SPK and OTS Database",
    "Back Up Seluruh Data Produksi": "Complete Production Data Backup",
    "Get Data By Outstanding": "Retrieve Data by Outstanding",
    "Form Input": "Input Forms",
    "Report Purchasing": "Purchasing Reports",
    "Input Problem Produksi": "Production Issue Input",
    "Foto Problem Produksi": "Production Issue Photos",
    "Data Production Issue": "Production Issue Data",
    "Archived Report Finance": "Archived Finance Reports",
    "Panduan": "Guide",
    "Direktori & Berkas Pemasaran": "Marketing Folders & Files",
    "Direktori dan Berkas Pemasaran": "Marketing Folders & Files",
    "Direktori pribadi anggota tim": "Personal folders for team members",
    "Laporan Pemasaran": "Marketing Reports",
    "Tautan Pemasaran": "Marketing Links",
    "Lembar kerja dan direktori operasional": "Operational spreadsheets and folders",
    "Jadwal Desain": "Design Schedule",
    "Kendaraan Pemasaran": "Marketing Vehicles",
    "Jadwal Peniupan dan Pencetakan": "Blowing and Printing Schedule",
    "Sisa Pesanan": "Order Balance",
    "Pengiriman Pemasaran Harian": "Daily Marketing Deliveries",
    "Perencanaan Produksi & Pengendalian Persediaan": "Production Planning & Inventory Control",
    "Basis Data SPK dan OTS": "SPK and OTS Database",
    "Pengiriman Harian Pemasaran": "Daily Marketing Deliveries",
    "Persediaan Rol Dalam Proses": "Work-in-Process Roll Inventory",
    "Persediaan Rol Gudang": "Warehouse Roll Inventory",
    "Daftar Pemesanan Bahan Baku": "Raw Material Order List",
    "Tinta dan Silinder": "Ink and Cylinders",
    "Persediaan Tersedia": "Available Inventory",
    "Direktori Bersama": "Shared Folder",
    "Cadangan Seluruh Data Produksi": "Complete Production Data Backup",
    "PENIUPAN": "BLOWING",
    "PENCETAKAN": "PRINTING",
    "PELIPATAN": "FOLDING",
    "PEMBELAHAN": "SLITTING",
    "PEMBENTUKAN LIPATAN": "GUSSET",
    "PEMOTONGAN": "CUTTING",
    "DASBOR ANALISIS": "ANALYTICS DASHBOARD",
    "Ambil Data Tertunda": "Retrieve Outstanding Data",
    "Penarikan data berdasarkan pekerjaan tertunda": "Data retrieval based on outstanding work",
    "AMBIL DATA": "RETRIEVE DATA",
    "Formulir Isian": "Input Forms",
    "Perintah Kerja Hanover": "Hanover Work Order",
    "Laporan Pembelian": "Purchasing Reports",
    "Perbandingan Harga Pemasok": "Supplier Price Comparison",
    "Pelaporan Kendala Produksi": "Production Issue Reporting",
    "Foto Kendala Produksi": "Production Issue Photos",
    "Foto Suku Cadang": "Spare Parts Photos",
    "Foto Pembelian": "Purchasing Photos",
    "Data Kendala Produksi": "Production Issue Data",
    "Masalah Produksi": "Production Issues",
    "Pengendalian Produksi": "Production Control",
    "Arsip Teknik": "Engineering Archive",
    "Kendala SDM dan Umum": "HR and General Affairs Issues",
    "Dokumen SOP": "SOP Documents",
    "Barang Dalam Proses": "Work in Process",
    "Arsip Laporan Keuangan": "Archived Finance Reports",
    "Dokumen penjualan, database customer, dan aktivitas marketing.": "Sales documents, customer database, and marketing activities.",
    "Perencanaan produksi, kebutuhan material, dan kontrol persediaan.": "Production planning, material requirements, and inventory control.",
    "Pengadaan barang, vendor, PO, dan pemantauan pembelian.": "Procurement, vendors, purchase orders, and purchasing monitoring.",
    "Dokumen proses produksi dan kontrol operasional.": "Production process documents and operational control.",
    "Dokumen keuangan, pembayaran, dan pelaporan.": "Finance, payment, and reporting documents.",

    "Mode Administrator": "Administrator Mode",
    "Lihat situs": "View Site",
    "Kelola Konten Portal": "Manage Portal Content",
    "Sunting menu lalu terbitkan perubahan ke GitHub.": "Edit menus and publish changes to GitHub.",
    "Muat ulang": "Reload",
    "Simpan draf": "Save Draft",
    "Terbitkan": "Publish",
    "Terbitkan ke GitHub": "Publish to GitHub",
    "Tambah menu": "Add Menu",
    "Tambah seksi": "Add Section",
    "Tambah departemen": "Add Department",
    "Situs": "Site",
    "Nama situs": "Site Name",
    "Pemberitahuan": "Notice",
    "Beranda Portal": "Portal Home",
    "Departemen": "Departments",
    "Judul": "Title",
    "Deskripsi": "Description",
    "Nama menu": "Menu Name",
    "URL tujuan": "Destination URL",
    "Jenis": "Type",
    "Ikon": "Icon",
    "Warna": "Color",
    "Gambar": "Image",
    "Hapus": "Delete",
    "Batal": "Cancel",
    "Simpan": "Save",
    "Konfirmasi": "Confirm",
    "Yakin ingin menghapus item ini?": "Are you sure you want to delete this item?",
    "Perubahan tersimpan otomatis sebagai draf di perangkat ini. Situs yang tayang baru berubah setelah Anda menerbitkan.": "Changes are automatically saved as a draft on this device. The live site changes only after publishing.",
    "draf belum diterbitkan": "draft not published",
    "sama dengan yang tayang": "matches live site",
    "Berhasil diterbitkan. Situs akan tayang dalam 1–2 menit.": "Published successfully. The site will update in 1–2 minutes.",
    "Menghubungi GitHub…": "Connecting to GitHub…",
    "Token belum diisi.": "Token is required.",
    "Format repositori belum benar.": "Repository format is invalid.",
    "Cari nama ikon…": "Search icon names…",
    "Perubahan belum diterbitkan": "Unpublished Changes"
  };

  var language = readLanguage();
  var textState = new WeakMap();
  var attrState = new WeakMap();
  var observer;
  var queued = false;
  var originalTitle = document.title;

  function readLanguage() {
    try { return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "id"; }
    catch (error) { return "id"; }
  }

  function pattern(value) {
    var match;
    if ((match = value.match(/^(\d+)\s+item$/i))) return match[1] + " items";
    if ((match = value.match(/^(\d+)\s+tautan$/i))) return match[1] + " links";
    return value;
  }

  function translate(value) {
    var leading = (value.match(/^\s*/) || [""])[0];
    var trailing = (value.match(/\s*$/) || [""])[0];
    var clean = value.trim();
    if (!clean) return value;
    var canonical = ID[clean] || clean;
    if (language !== "en") return leading + canonical + trailing;
    return leading + (EN[canonical] || pattern(canonical)) + trailing;
  }

  function skipped(element) {
    return !element || element.closest("script,style,noscript,template,[data-i18n-ignore]") !== null;
  }

  function text(node) {
    if (!node.parentElement || skipped(node.parentElement)) return;
    var current = node.nodeValue;
    var state = textState.get(node);
    if (!state || current !== state.rendered) state = { source: current, rendered: current };
    var next = translate(state.source);
    state.rendered = next;
    textState.set(node, state);
    if (current !== next) node.nodeValue = next;
  }

  function attribute(element, name) {
    if (!element.hasAttribute(name) || skipped(element)) return;
    var states = attrState.get(element) || {};
    var current = element.getAttribute(name) || "";
    var state = states[name];
    if (!state || current !== state.rendered) state = { source: current, rendered: current };
    var next = translate(state.source);
    state.rendered = next;
    states[name] = state;
    attrState.set(element, states);
    if (current !== next) element.setAttribute(name, next);
  }

  function element(node) {
    if (!node || node.nodeType !== 1 || skipped(node)) return;
    ["placeholder", "title", "aria-label"].forEach(function (name) { attribute(node, name); });
  }

  function render(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    if (root.nodeType === 1) element(root);
    var node;
    while ((node = walker.nextNode())) node.nodeType === 3 ? text(node) : element(node);
  }

  function updateButtons() {
    var group = document.querySelector(".language-switcher");
    if (group) group.setAttribute("aria-label", language === "en" ? "Language selection" : "Pilihan bahasa");
    document.querySelectorAll("[data-language]").forEach(function (button) {
      var active = button.dataset.language === language;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setLanguage(next) {
    language = next === "en" ? "en" : "id";
    try { localStorage.setItem(STORAGE_KEY, language); } catch (error) {}
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    document.title = language === "en"
      ? originalTitle
          .replace("Beranda", "Home")
          .replace("Pemasaran", "Marketing")
          .replace("Pembelian", "Purchasing")
          .replace("Produksi", "Production")
          .replace("Keuangan", "Finance")
          .replace("Bantuan", "Support")
      : originalTitle;
    render(document.body);
    updateButtons();
  }

  function switcher() {
    if (document.querySelector(".language-switcher")) return;
    var host = document.querySelector(".tools, .adm-bar__tools");
    if (!host) return;
    var group = document.createElement("div");
    group.className = "language-switcher";
    group.setAttribute("role", "group");
    [{ code: "id", label: "ID", title: "Bahasa Indonesia" }, { code: "en", label: "EN", title: "Bahasa Inggris" }]
      .forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item.label;
        button.title = item.title;
        button.setAttribute("aria-label", item.title);
        button.dataset.language = item.code;
        button.addEventListener("click", function () { setLanguage(item.code); });
        group.appendChild(button);
      });
    host.insertBefore(group, host.firstChild);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; render(document.body); });
  }

  function init() {
    switcher();
    setLanguage(language);
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
    window.PGM_I18N = { getLanguage: function () { return language; }, setLanguage: setLanguage, t: translate };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
