(function () {
  "use strict";

  var STORAGE_KEY = "pgm:language";
  var DEFAULT_LANGUAGE = "id";
  var SUPPORTED = ["id", "en"];

  var EN = {
    "PPIC": "PPIC Dashboard",
    "Ringkasan PPIC": "PPIC Overview",
    "Dashboard PPIC": "PPIC Dashboard",
    "Keluar Bahan": "Material Issue",
    "Penarikan Data": "Data Retrieval",
    "Portal Utama": "Main Portal",
    "Layar Penuh": "Full Screen",
    "Keluar dari layar penuh": "Exit Full Screen",
    "Buka tampilan layar penuh": "Open Full Screen",
    "Menu": "Menu",
    "Buka menu navigasi": "Open navigation menu",
    "Tutup menu navigasi": "Close navigation menu",
    "Navigasi utama": "Main navigation",
    "Koneksi terputus — menunggu jaringan kembali": "Connection lost — waiting for network",
    "Koneksi terputus â€” menunggu jaringan kembali": "Connection lost — waiting for network",

    "Tampilkan Rekapan": "Show Summary",
    "Sembunyikan Rekapan": "Hide Summary",
    "Input SPK": "Create SPK",
    "Customer": "Customer",
    "Brand": "Brand",
    "Mengaktifkan realtime": "Enabling real-time updates",
    "Menunggu sinkronisasi data": "Waiting for data synchronization",
    "Rekapan SPK Tahunan": "Annual SPK Summary",
    "Pilih tahun dan kategori kode SPK A–L untuk memperbarui seluruh rekapan.": "Select a year and SPK code category A–L to update the summary.",
    "Tahun SPK": "SPK Year",
    "Pilih tahun SPK": "Select SPK year",
    "Ringkasan produksi": "Production summary",
    "Total SPK": "Total SPKs",
    "Sudah Release": "Released",
    "Belum Release": "Not Released",
    "Total Order": "Total Orders",
    "Sesuai data yang tampil": "Based on visible records",
    "Database SPK": "SPK Database",
    "Klik baris untuk melihat informasi lengkap": "Select a row to view complete information",
    "Menghubungkan ke database": "Connecting to database",
    "Data produksi sedang disiapkan. Mohon tunggu sebentar.": "Production data is being prepared. Please wait.",
    "Data belum dapat dimuat": "Unable to load data",
    "Terjadi kendala saat menghubungkan ke database.": "There was a problem connecting to the database.",
    "Coba lagi": "Try Again",
    "Pencarian cepat": "Quick Search",
    "Cari SPK, customer, artikel, ukuran, atau material...": "Search SPK, customer, item, size, or material...",
    "Tanggal SPK": "SPK Date",
    "Jenis order": "Order Type",
    "Semua jenis": "All Types",
    "Material": "Material",
    "Semua material": "All Materials",
    "Semua UOM": "All UOMs",
    "Status": "Status",
    "Semua status": "All Statuses",
    "Keluar bahan belum diisi": "Material issue not entered",
    "Sudah dicetak": "Printed",
    "Belum dicetak": "Not Printed",
    "Reset": "Reset",
    "Menampilkan seluruh data produksi.": "Showing all production records.",
    "Hapus semua filter": "Clear All Filters",
    "Geser tabel ke samping untuk melihat data lainnya": "Swipe sideways to view more data",
    "Tanggal": "Date",
    "Keterangan": "Description",
    "Marketing": "Marketing",
    "Artikel": "Item",
    "Ukuran": "Size",
    "Jumlah": "Quantity",
    "Manage": "Manage",
    "Detail SPK": "SPK Details",
    "Database Produksi": "Production Database",
    "Memuat informasi order produksi…": "Loading production order information…",
    "Gambaran Umum": "Overview",
    "Alur Produksi": "Production Flow",
    "Komposisi Bahan": "Material Composition",
    "Tutup": "Close",
    "Cetak": "Print",
    "Edit SPK": "Edit SPK",
    "Simpan Perubahan": "Save Changes",

    "Data Utama": "Main Data",
    "Identitas order dan nomor SPK": "Order identity and SPK number",
    "New Order": "New Order",
    "Repeat Order": "Repeat Order",
    "Kode SPK": "SPK Code",
    "Tanggal PO Masuk": "PO Receipt Date",
    "SPK Sebelumnya": "Previous SPK",
    "SPK Repeat Baru": "New Repeat SPK",
    "No. PO Customer": "Customer PO No.",
    "Artikel / Brand": "Item / Brand",
    "Kode Item": "Item Code",
    "Ukuran Jadi": "Finished Size",
    "Model Kantong": "Bag Model",
    "Keterangan Warna": "Color Description",
    "Jenis Bahan & Film": "Material & Film Type",
    "Pilih jenis bahan": "Select Material Type",
    "Order": "Order",
    "Boleh dikosongkan": "Optional",
    "Jenis Produk": "Product Type",
    "Keterangan": "Notes",
    "Tambah Bahan": "Add Material",
    "Simpan SPK": "Save SPK",
    "Kembali": "Back",
    "Berikutnya": "Next",
    "Sebelumnya": "Previous",
    "Selesai": "Finish",
    "Nomor SPK berhasil disimpan": "SPK number saved successfully",
    "Buat SPK Baru": "Create Another SPK",
    "Lihat Dashboard": "View Dashboard",
    "Perhitungan Keluar Bahan": "Material Issue Calculation",
    "Rute Produksi": "Production Route",
    "Catatan Alur": "Process Notes",
    "Finishing": "Finishing",
    "Aktif": "Active",
    "Tidak Aktif": "Inactive",

    "Manager PPIC": "PPIC Manager",
    "Kelola ETA pembelian dan keluar bahan untuk setiap SPK.": "Manage purchase ETAs and material issue quantities for each SPK.",
    "Halaman Manager PPIC": "PPIC Manager Page",
    "Menunggu": "Pending",
    "Belum ditentukan": "Not specified",
    "Sudah Lengkap": "Complete",
    "Dapat diperbarui": "Can be updated",
    "Dalam database": "In database",
    "Pengelolaan keluar bahan": "Material issue management",
    "Cari SPK, customer, artikel, atau material...": "Search SPK, customer, item, or material...",
    "Menunggu diatur": "Pending Setup",
    "Sudah lengkap": "Complete",
    "Muat Ulang": "Reload",
    "Memuat data SPK": "Loading SPK data",
    "Menyiapkan antrean keluar bahan dari Database.": "Preparing the material issue queue from the database.",
    "Tidak ada data": "No Data",
    "Ubah filter atau kata pencarian untuk melihat data lainnya.": "Change the filter or search term to view other records.",
    "Data gagal dimuat": "Failed to Load Data",
    "Terjadi gangguan saat membaca Database.": "There was a problem reading the database.",
    "Coba Lagi": "Try Again",
    "SPK / Tanggal": "SPK / Date",
    "Customer / Artikel": "Customer / Item",
    "Jumlah Order": "Order Quantity",
    "ETA Beli Bahan": "Material Purchase ETA",
    "Aksi": "Actions",
    "Halaman sebelumnya": "Previous page",
    "Halaman berikutnya": "Next page",
    "Jadwal pembelian bahan baku": "Raw material purchase schedule",
    "Jadwal Kedatangan Material": "Material Arrival Schedule",
    "Isi berurutan. ETA berikutnya tidak boleh lebih awal.": "Complete in sequence. Each next ETA cannot be earlier.",
    "Urutan": "Sequence",
    "Tanggal ETA": "ETA Date",
    "Simpan ETA": "Save ETA",
    "Batal": "Cancel",
    "Detail Keluar Bahan": "Material Issue Details",

    "Sinkronisasi Data": "Data Synchronization",
    "Cari nomor SPK, periksa status Database, lalu tarik seluruh folder atau satu file tertentu.": "Find an SPK number, check its database status, then retrieve an entire folder or a specific file.",
    "Menghubungkan ke Drive": "Connecting to Drive",
    "Alur Penarikan": "Retrieval Workflow",
    "Pilih scope penarikan yang dibutuhkan": "Select the required retrieval scope",
    "Pilih direktori": "Select Directory",
    "Buka subfolder hingga mencapai folder yang berisi file SPK.": "Open subfolders until you reach the folder containing SPK files.",
    "Cari dan periksa": "Search and Verify",
    "Gunakan pencarian SPK dan lihat tanda apakah file sudah tersimpan.": "Use SPK search and check whether each file is already stored.",
    "Mulai penarikan": "Start Retrieval",
    "Tarik semua file dalam folder atau gunakan tombol Tarik pada satu file SPK.": "Retrieve every file in the folder or use Retrieve for a single SPK file.",
    "Direktori Sumber": "Source Directory",
    "Navigasikan folder, cari SPK, dan periksa status": "Browse folders, find SPKs, and verify status",
    "Menghubungkan ke Drive...": "Connecting to Drive...",
    "Mengekstrak data": "Extracting Data",
    "Menyiapkan sinkronisasi data.": "Preparing data synchronization.",
    "Progres tersimpan di server. Halaman boleh ditutup dan dibuka kembali.": "Progress is stored on the server. You may close and reopen this page.",
    "Batalkan penarikan": "Cancel Retrieval",
    "Mode Lengkapi Data Lama": "Complete Existing Data Mode",
    "Tarik semua file dari direktori ini": "Retrieve All Files from This Directory",
    "Tarik": "Retrieve",
    "Sudah di Database": "Already in Database",
    "Belum di Database": "Not in Database",

    "Memuat data SPK...": "Loading SPK data...",
    "PPIC": "PPIC Dashboard",
    "Cetak & Tandai Release": "Print & Mark as Released",
    "Menyiapkan paket SPK": "Preparing SPK Package",
    "PO Produksi dan formulir setiap alur sedang disusun.": "The production PO and process forms are being prepared.",
    "Diperiksa": "Checked By",
    "Diverifikasi": "Verified By",
    "Disetujui": "Approved By",
    "Tanggal Release": "Release Date",
    "Tanda Tangan": "Signature",
    "Catatan": "Notes",
    "Proses": "Process",
    "Mesin": "Machine",
    "Operator": "Operator",
    "Hasil": "Output"
  };

  var textState = new WeakMap();
  var attrState = new WeakMap();
  var originalTitle = document.title;
  var currentLanguage = readLanguage();
  var observer = null;
  var refreshQueued = false;

  function readLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.indexOf(saved) >= 0 ? saved : DEFAULT_LANGUAGE;
    } catch (error) {
      return DEFAULT_LANGUAGE;
    }
  }

  function translatePattern(value) {
    var match;
    if ((match = value.match(/^(\d+)\s+data$/i))) return match[1] + " records";
    if ((match = value.match(/^Halaman\s+(\d+)\s*\/\s*(\d+)$/i))) return "Page " + match[1] + " of " + match[2];
    if ((match = value.match(/^(\d+)\s+dari\s+(\d+)\s+ETA terisi$/i))) return match[1] + " of " + match[2] + " ETAs completed";
    if ((match = value.match(/^(\d+)\s+bahan$/i))) return match[1] + " materials";
    if ((match = value.match(/^Terakhir diperbarui\s+(.+)$/i))) return "Last updated " + match[1];
    if ((match = value.match(/^Memuat\s+(.+)$/i))) return "Loading " + match[1];
    return value;
  }

  function translateValue(value, language) {
    if (language !== "en") return value;
    var leading = (value.match(/^\s*/) || [""])[0];
    var trailing = (value.match(/\s*$/) || [""])[0];
    var clean = value.trim();
    if (!clean) return value;
    var translated = EN[clean] || translatePattern(clean);
    return leading + translated + trailing;
  }

  function shouldSkipElement(element) {
    return !element ||
      element.closest("script, style, noscript, template, [data-i18n-ignore]") !== null;
  }

  function applyTextNode(node) {
    if (!node || !node.parentElement || shouldSkipElement(node.parentElement)) return;
    var current = node.nodeValue;
    var state = textState.get(node);
    if (!state || current !== state.rendered) {
      state = { source: current, rendered: current };
      textState.set(node, state);
    }
    var next = translateValue(state.source, currentLanguage);
    state.rendered = next;
    if (current !== next) node.nodeValue = next;
  }

  function applyAttribute(element, name) {
    if (!element.hasAttribute(name) || shouldSkipElement(element)) return;
    var states = attrState.get(element);
    if (!states) {
      states = {};
      attrState.set(element, states);
    }
    var current = element.getAttribute(name) || "";
    var state = states[name];
    if (!state || current !== state.rendered) state = states[name] = { source: current, rendered: current };
    var next = translateValue(state.source, currentLanguage);
    state.rendered = next;
    if (current !== next) element.setAttribute(name, next);
  }

  function applyElement(element) {
    if (!element || element.nodeType !== 1 || shouldSkipElement(element)) return;
    ["placeholder", "title", "aria-label"].forEach(function (name) { applyAttribute(element, name); });
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      applyTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;

    if (root.nodeType === 1) applyElement(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) applyTextNode(node);
      else applyElement(node);
    }
  }

  function updateSwitcher() {
    var switcher = document.querySelector(".spk-language-switcher");
    if (switcher) switcher.setAttribute("aria-label", currentLanguage === "en" ? "Language selection" : "Pilihan bahasa");
    document.querySelectorAll("[data-spk-language]").forEach(function (button) {
      var active = button.getAttribute("data-spk-language") === currentLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyLanguage(language) {
    currentLanguage = SUPPORTED.indexOf(language) >= 0 ? language : DEFAULT_LANGUAGE;
    try { localStorage.setItem(STORAGE_KEY, currentLanguage); } catch (error) {}
    document.documentElement.lang = currentLanguage;
    document.documentElement.dataset.language = currentLanguage;
    document.title = currentLanguage === "en"
      ? originalTitle
          .replace("Penarikan Data", "Data Retrieval")
          .replace("Keluar Bahan", "Material Issue")
          .replace("PPIC |", "PPIC Dashboard |")
      : originalTitle;
    translateTree(document.body);
    updateSwitcher();
    document.dispatchEvent(new CustomEvent("spk:languagechange", { detail: { language: currentLanguage } }));
  }

  function buildSwitcher() {
    if (document.querySelector(".spk-language-switcher")) return;
    var host = document.querySelector(".topbar-inner, .app-topbar-inner, .header-inner");
    var printActions = document.querySelector("body[data-page='cetak-spk'] .toolbar-actions");
    if (!host && !printActions) return;

    var switcher = document.createElement("div");
    switcher.className = "spk-language-switcher no-print";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Pilihan bahasa");
    switcher.setAttribute("data-i18n-ignore", "");

    [{ code: "id", label: "ID", title: "Bahasa Indonesia" }, { code: "en", label: "EN", title: "English" }]
      .forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item.label;
        button.title = item.title;
        button.setAttribute("aria-label", item.title);
        button.setAttribute("data-spk-language", item.code);
        button.addEventListener("click", function () { applyLanguage(item.code); });
        switcher.appendChild(button);
      });

    if (host) {
      var anchor = host.querySelector(".spk-mobile-nav-toggle, .topnav, .app-nav");
      host.insertBefore(switcher, anchor || null);
    } else {
      printActions.insertBefore(switcher, printActions.firstChild);
    }
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(function () {
      refreshQueued = false;
      translateTree(document.body);
    });
  }

  function initialize() {
    buildSwitcher();
    applyLanguage(currentLanguage);

    observer = new MutationObserver(function (mutations) {
      var needsRefresh = mutations.some(function (mutation) {
        return mutation.type === "characterData" || mutation.type === "childList" || mutation.type === "attributes";
      });
      if (needsRefresh) scheduleRefresh();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"]
    });

    window.SPK_I18N = {
      getLanguage: function () { return currentLanguage; },
      setLanguage: applyLanguage,
      t: function (value) { return translateValue(String(value || ""), currentLanguage); }
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
