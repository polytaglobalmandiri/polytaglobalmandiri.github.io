(function () {
  "use strict";

  var STORAGE_KEY = "pgm:language";
  var DEFAULT_LANGUAGE = "id";
  var SUPPORTED = ["id", "en"];

  /* Teks lama dari modul SPK dinormalkan terlebih dahulu ke Bahasa
     Indonesia. Dengan begitu Indonesia menjadi satu-satunya bahasa sumber,
     sedangkan bahasa lain selalu diturunkan dari sumber yang sama. */
  var ID = {
    "Plastic Packaging Industry": "Industri Kemasan Plastik",
    "PPIC Dashboard": "Dasbor PPIC",
    "Dashboard PPIC": "Dasbor PPIC",
    "Dashboard": "Dasbor",
    "Input SPK": "Buat SPK",
    "Customer": "Pelanggan",
    "Brand": "Merek",
    "Marketing": "Pemasaran",
    "Material": "Bahan",
    "Order": "Pesanan",
    "New Order": "Pesanan Baru",
    "Repeat Order": "Pesanan Ulang",
    "Jenis order": "Jenis pesanan",
    "Identitas order dan nomor SPK": "Identitas pesanan dan nomor SPK",
    "No. PO Customer": "Nomor PO Pelanggan",
    "Artikel / Brand": "Artikel / Merek",
    "Jenis Bahan & Film": "Jenis Bahan dan Film",
    "Manage": "Kelola",
    "Manager PPIC": "Manajer PPIC",
    "Halaman Manager PPIC": "Halaman Manajer PPIC",
    "Database": "Basis Data",
    "Database SPK": "Basis Data SPK",
    "Database Produksi": "Basis Data Produksi",
    "Dalam database": "Dalam basis data",
    "Sudah di Database": "Sudah di Basis Data",
    "Belum di Database": "Belum di Basis Data",
    "Detail SPK": "Rincian SPK",
    "Detail Keluar Bahan": "Rincian Keluar Bahan",
    "Full Screen": "Layar Penuh",
    "Print": "Cetak",
    "Release": "Terbit",
    "Sudah Release": "Sudah Terbit",
    "Belum Release": "Belum Terbit",
    "Tanggal Release": "Tanggal Terbit",
    "Cetak & Tandai Release": "Cetak dan Tandai Terbit",
    "realtime": "waktu nyata",
    "Mengaktifkan realtime": "Mengaktifkan pembaruan waktu nyata",
    "Folder": "Direktori",
    "File": "Berkas",
    "Pilih scope penarikan yang dibutuhkan": "Pilih cakupan penarikan yang dibutuhkan",
    "Buka subfolder hingga mencapai folder yang berisi file SPK.": "Buka subdirektori hingga mencapai direktori yang berisi berkas SPK.",
    "Tarik semua file dalam folder atau gunakan tombol Tarik pada satu file SPK.": "Tarik semua berkas dalam direktori atau gunakan tombol Tarik pada satu berkas SPK.",
    "Cari SPK, customer, artikel, ukuran, atau material...": "Cari SPK, pelanggan, artikel, ukuran, atau bahan...",
    "Cari SPK, customer, artikel, atau material...": "Cari SPK, pelanggan, artikel, atau bahan...",
    "SPK / Date": "SPK / Tanggal",
    "Customer / Artikel": "Pelanggan / Artikel",
    "Jumlah Order": "Jumlah Pesanan",
    "Status": "Keadaan",
    "Actions": "Tindakan",
    "Optional": "Boleh dikosongkan",
    "Finishing": "Penyelesaian",
    "Mixer": "Pencampuran",
    "Blowing": "Peniupan",
    "Printing": "Pencetakan",
    "Folding": "Pelipatan",
    "Slitting": "Pembelahan",
    "Cutting": "Pemotongan",
    "Gusset": "Pembentukan Lipatan",
    "Bottom Seal": "Segel Bawah",
    "Side Seal": "Segel Samping",
    "Handle": "Pegangan",
    "Sheet": "Lembaran",
    "Sheet Slitting": "Pembelahan Lembaran",
    "Packing": "Pengepakan",
    "Packing Detail": "Rincian Pengepakan",
    "Jenis Packing": "Jenis Pengepakan",
    "Full": "Penuh",
    "Custom": "Khusus",
    "Inline": "Langsung",
    "FULL": "PENUH",
    "CUSTOM": "KHUSUS",
    "INLINE": "LANGSUNG",
    "SHEET": "LEMBARAN",
    "NON PRINT": "TANPA CETAK",
    "Detail": "Rincian",
    "Search": "Pencarian",
    "Loading": "Memuat",
    "Input": "Isian",
    "Periksa input": "Periksa isian",
    "Dimensi & Order": "Dimensi dan Pesanan",
    "Nama artikel atau brand produk": "Nama artikel atau merek produk",
    "Nomor PO dari customer": "Nomor PO dari pelanggan",
    "Nomor SPK New Order": "Nomor SPK Pesanan Baru",
    "Nomor SPK tidak ditemukan di Database.": "Nomor SPK tidak ditemukan di Basis Data.",
    "Data SPK tidak ditemukan di Database.": "Data SPK tidak ditemukan di Basis Data.",
    "Gagal membaca data edit dari Database.": "Gagal membaca data sunting dari Basis Data.",
    "Gagal menyimpan perubahan ke Database.": "Gagal menyimpan perubahan ke Basis Data.",
    "Menyimpan perubahan ke Database...": "Menyimpan perubahan ke Basis Data...",
    "Form Input SPK gagal disiapkan:": "Formulir Pembuatan SPK gagal disiapkan:",
    "Gagal menyiapkan form Input SPK:": "Gagal menyiapkan formulir Pembuatan SPK:",
    "Tambah brand ke master": "Tambah merek ke data induk",
    "Tambah customer ke master": "Tambah pelanggan ke data induk",
    "Terisi dari kode customer": "Terisi dari kode pelanggan",
    "Cari nomor SPK atau nama file": "Cari nomor SPK atau nama berkas",
    "Cari nomor SPK atau nama file...": "Cari nomor SPK atau nama berkas...",
    "File SPK": "Berkas SPK",
    "File dengan peringatan": "Berkas dengan peringatan",
    "File gagal diproses": "Berkas gagal diproses",
    "File tanpa nama": "Berkas tanpa nama",
    "Folder Produksi": "Direktori Produksi",
    "Folder penarikan": "Direktori penarikan",
    "Lokasi folder": "Lokasi direktori",
    "Memindai file sumber...": "Memindai berkas sumber...",
    "Mendaftarkan penarikan file": "Mendaftarkan penarikan berkas",
    "Mendaftarkan penarikan seluruh folder...": "Mendaftarkan penarikan seluruh direktori...",
    "Tidak ada file yang cocok dengan pencarian.": "Tidak ada berkas yang cocok dengan pencarian.",
    "Tidak ada file sumber yang diproses": "Tidak ada berkas sumber yang diproses",
    "Tarik data hanya dari file ini": "Tarik data hanya dari berkas ini",
    "Respons folder tidak dikenali.": "Tanggapan direktori tidak dikenali.",
    "Jenis Order": "Jenis Pesanan",
    "Jumlah order setelah BS": "Jumlah pesanan setelah BS",
    "Order setelah BS × Meter Roll ÷ Meter ÷ UP": "Pesanan setelah BS × Meter Gulungan ÷ Meter ÷ UP",
    "Order setelah BS × Panjang × PCS/KG ÷ 100 ÷ Meter": "Pesanan setelah BS × Panjang × PCS/KG ÷ 100 ÷ Meter",
    "Order setelah BS × Panjang ÷ 100 ÷ Meter": "Pesanan setelah BS × Panjang ÷ 100 ÷ Meter",
    "Order setelah BS ÷ PCS/KG": "Pesanan setelah BS ÷ PCS/KG",
    "Periksa kombinasi material, UOM order, dan ukuran.": "Periksa kombinasi bahan, UOM pesanan, dan ukuran.",
    "Tebal Blowing": "Tebal Peniupan",
    "Aturan Meter berdasarkan material dan tebal": "Aturan Meter berdasarkan bahan dan tebal",
    "Belum ditetapkan oleh Manager PPIC.": "Belum ditetapkan oleh Manajer PPIC.",
    "Tidak ada SPK yang masih menunggu pengisian Manager PPIC.": "Tidak ada SPK yang masih menunggu pengisian Manajer PPIC.",
    "Marketing": "Pemasaran",
    "Release YA": "Terbit YA",
    "Release Tidak": "Terbit TIDAK",
    "NON RELEASE": "BELUM TERBIT",
    "RELEASE": "TERBIT",
    "CETAK & TANDAI RELEASE": "CETAK DAN TANDAI TERBIT",
    "MENANDAI RELEASE...": "MENANDAI TERBIT...",
    "Mode Lihat Saja. Release tidak diubah.": "Mode Lihat Saja. Keadaan terbit tidak diubah.",
    "Paket SPK sudah pernah di-release dan siap dicetak ulang.": "Paket SPK sudah pernah diterbitkan dan siap dicetak ulang.",
    "Paket siap. Release menjadi YA setelah tombol cetak ditekan.": "Paket siap. Keadaan terbit menjadi YA setelah tombol cetak ditekan.",
    "Release berhasil diperbarui.": "Keadaan terbit berhasil diperbarui.",
    "Status Release gagal diperbarui.": "Keadaan terbit gagal diperbarui.",
    "Memperbarui kolom BV (Release)...": "Memperbarui kolom BV (Terbit)...",
    "General Manager": "Manajer Umum",
    "Senior Manager": "Manajer Senior",
    "Manager QC / QA": "Manajer Kendali Mutu / Jaminan Mutu",
    "Manager PPIC": "Manajer PPIC",
    "Kepala Blowing": "Kepala Peniupan",
    "Data Synchronization": "Sinkronisasi Data",
    "Source Directory": "Direktori Sumber",
    "Loading SPK data...": "Memuat data SPK..."
  };

  var EN = {
    "PPIC": "PPIC Dashboard",
    "Dasbor PPIC": "PPIC Dashboard",
    "Dasbor": "Dashboard",
    "Buat SPK": "Create SPK",
    "Pelanggan": "Customer",
    "Merek": "Brand",
    "Pemasaran": "Marketing",
    "Bahan": "Material",
    "Pesanan": "Order",
    "Pesanan Baru": "New Order",
    "Pesanan Ulang": "Repeat Order",
    "Jenis pesanan": "Order Type",
    "Identitas pesanan dan nomor SPK": "Order identity and SPK number",
    "Nomor PO Pelanggan": "Customer PO No.",
    "Artikel / Merek": "Item / Brand",
    "Jenis Bahan dan Film": "Material and Film Type",
    "Kelola": "Manage",
    "Manajer PPIC": "PPIC Manager",
    "Halaman Manajer PPIC": "PPIC Manager Page",
    "Basis Data": "Database",
    "Basis Data SPK": "SPK Database",
    "Basis Data Produksi": "Production Database",
    "Dalam basis data": "In database",
    "Sudah di Basis Data": "Already in Database",
    "Belum di Basis Data": "Not in Database",
    "Rincian SPK": "SPK Details",
    "Rincian Keluar Bahan": "Material Issue Details",
    "Sudah Terbit": "Released",
    "Belum Terbit": "Not Released",
    "Tanggal Terbit": "Release Date",
    "Cetak dan Tandai Terbit": "Print & Mark as Released",
    "Mengaktifkan pembaruan waktu nyata": "Enabling real-time updates",
    "Direktori": "Folder",
    "Berkas": "File",
    "Pilih cakupan penarikan yang dibutuhkan": "Select the required retrieval scope",
    "Buka subdirektori hingga mencapai direktori yang berisi berkas SPK.": "Open subfolders until you reach the folder containing SPK files.",
    "Tarik semua berkas dalam direktori atau gunakan tombol Tarik pada satu berkas SPK.": "Retrieve every file in the folder or use Retrieve for a single SPK file.",
    "Cari SPK, pelanggan, artikel, ukuran, atau bahan...": "Search SPK, customer, item, size, or material...",
    "Cari SPK, pelanggan, artikel, atau bahan...": "Search SPK, customer, item, or material...",
    "Pelanggan / Artikel": "Customer / Item",
    "Jumlah Pesanan": "Order Quantity",
    "Keadaan": "Status",
    "Tindakan": "Actions",
    "Penyelesaian": "Finishing",
    "Pencampuran": "Mixing",
    "Peniupan": "Blowing",
    "Pencetakan": "Printing",
    "Pelipatan": "Folding",
    "Pembelahan": "Slitting",
    "Pemotongan": "Cutting",
    "Pembentukan Lipatan": "Gusseting",
    "Segel Bawah": "Bottom Seal",
    "Segel Samping": "Side Seal",
    "Pegangan": "Handle",
    "Lembaran": "Sheet",
    "Pembelahan Lembaran": "Sheet Slitting",
    "Pengepakan": "Packing",
    "Rincian Pengepakan": "Packing Details",
    "Jenis Pengepakan": "Packing Type",
    "Penuh": "Full",
    "Khusus": "Custom",
    "Langsung": "Inline",
    "PENUH": "FULL",
    "KHUSUS": "CUSTOM",
    "LANGSUNG": "INLINE",
    "LEMBARAN": "SHEET",
    "TANPA CETAK": "NON-PRINTED",
    "Rincian": "Details",
    "Pencarian": "Search",
    "Memuat": "Loading",
    "Isian": "Input",
    "Periksa isian": "Check input",
    "Dimensi dan Pesanan": "Dimensions and Order",
    "Bahasa Indonesia": "Indonesian",
    "Bahasa Inggris": "English",
    "Industri Kemasan Plastik": "Plastic Packaging Industry",
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
    var leading = (value.match(/^\s*/) || [""])[0];
    var trailing = (value.match(/\s*$/) || [""])[0];
    var clean = value.trim();
    if (!clean) return value;
    var canonical = ID[clean] || clean;
    if (language !== "en") return leading + canonical + trailing;
    var translated = EN[canonical] || translatePattern(canonical);
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
          .replace("Pembuatan SPK", "Create SPK")
          .replace("Penarikan Data", "Data Retrieval")
          .replace("Keluar Bahan", "Material Issue")
          .replace("Cetak SPK", "Print SPK")
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
    [{ code: "id", label: "ID", title: "Bahasa Indonesia" }, { code: "en", label: "EN", title: "Bahasa Inggris" }]
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
