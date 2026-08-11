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
    ,"ROLL": "GULUNGAN"
    ,"NEW ORDER": "PESANAN BARU"
    ,"REPEAT ORDER": "PESANAN ULANG"
    ,"BOTTOM SEAL": "SEGEL BAWAH"
    ,"SIDE SEAL": "SEGEL SAMPING"
    ,"SHEET SLITTING": "PEMBELAHAN LEMBARAN"
    ,"MIXER": "PENCAMPURAN"
    ,"BLOWING": "PENIUPAN"
    ,"PRINTING": "PENCETAKAN"
    ,"FOLDING": "PELIPATAN"
    ,"SLITTING": "PEMBELAHAN"
    ,"GUSSET": "PEMBENTUKAN LIPATAN"
    ,"CUTTING": "PEMOTONGAN"
    ,"TSHIRT": "KANTONG KAOS"
    ,"NON PRINT": "TANPA CETAK"
    ,"INLINE": "LANGSUNG"
    ,"FULL": "PENUH"
    ,"CUSTOM": "KHUSUS"
    ,"Sample": "Sampel"
    ,"Trial Sheet": "Lembaran Uji Coba"
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
    "Portal Akses Internal": "Internal Access Portal",
    "Ringkasan PPIC": "PPIC Overview",
    "Dashboard PPIC": "PPIC Dashboard",
    "Keluar Bahan": "Material Issue",
    "Penarikan Data": "Data Retrieval",
    "Portal Utama": "Main Portal",
    "Portal PPIC": "PPIC Portal",
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

  /* Kamus lengkap untuk teks kanonis antarmuka SPK. Nama orang, kode proses,
     satuan, serta nilai teknis dari basis data sengaja tidak diterjemahkan. */
  Object.assign(EN, {
    "SPK Ulang Baru": "New Repeat SPK",
    "Pilih pemasaran": "Select marketing staff",
    "Meter / Gulungan": "Meters / Roll",
    "Jenis Potongan": "Cut Type",
    "Pilih jenis potongan": "Select cut type",
    "Keterangan Bahan": "Material Notes",
    "Pilih sumber bahan": "Select material source",
    "Bahan Internal": "Internal Material",
    "Bahan dari Luar": "External Material",
    "Toleransi Kirim (%)": "Delivery Tolerance (%)",
    "Toleransi Produksi (%)": "Production Tolerance (%)",
    "Stok": "Stock",
    "Keterangan Artikel": "Item Notes",
    "Jadwal Kirim": "Delivery Schedule",
    "Belum ada jadwal": "No schedule yet",
    "+ Tambah Tahap": "+ Add Stage",
    "Tahap pertama adalah tanggal kirim utama (ETD). Ketik tanggal singkat seperti": "The first stage is the main delivery date (ETD). Enter a short date such as",
    ". Pilih": ". Select",
    "agar tahap itu mengambil sisa pesanan secara otomatis, atau": "so that stage automatically uses the remaining order quantity, or",
    "untuk mengisi jumlahnya sendiri.": "to enter its quantity manually.",
    "Urutan Proses Produksi": "Production Process Sequence",
    "Susun urutan bebas — satu proses boleh dipakai berkali-kali": "Arrange any sequence — a process may be used more than once",
    "Susun urutan bebas - satu proses boleh dipakai berkali-kali": "Arrange any sequence — a process may be used more than once",
    "Klik proses untuk menambahkannya sebagai langkah berikutnya. Proses yang sama boleh dipilih lagi — misalnya Pembentukan Lipatan, Pelipatan, Pembelahan, lalu Pelipatan sekali lagi. Urutan dapat digeser dan tiap langkah disunting lewat kartunya di bawah.": "Select a process to add it as the next stage. The same process may be selected again—for example Gusseting, Folding, Slitting, then Folding again. Reorder the stages and edit each one using its card below.",
    "Klik proses untuk menambahkannya sebagai langkah berikutnya. Proses yang sama boleh dipilih lagi - misalnya Pembentukan Lipatan, Pelipatan, Pembelahan, lalu Pelipatan sekali lagi. Urutan dapat digeser dan tiap langkah disunting lewat kartunya di bawah.": "Select a process to add it as the next stage. The same process may be selected again—for example Gusseting, Folding, Slitting, then Folding again. Reorder the stages and edit each one using its card below.",
    "Pilih proses yang akan ditambahkan": "Select a process to add",
    "Langkah tersusun:": "Arranged stages:",
    "Total BS:": "Total BS:",
    "Pilih tab proses produksi di atas untuk menampilkan input yang dibutuhkan.": "Select a production process tab above to show the required fields.",
    "Komposisi bahan baku": "Raw Material Composition",
    "+ Tambah Bahan": "+ Add Material",
    "Total komposisi:": "Total composition:",
    "Ukuran, perlakuan, dan mode cetak": "Size, treatment, and print mode",
    "Ukuran, threat, dan mode cetak": "Size, treatment, and print mode",
    "Ukuran Peniupan": "Blowing Size",
    "(dari Data Utama)": "(from Main Data)",
    "Massa Jenis": "Density",
    "(dari Jenis Bahan)": "(from Material Type)",
    "Perlakuan": "Treatment",
    "Tanpa Perlakuan": "No Treatment",
    "Perlakuan 1 Sisi": "Single-Side Treatment",
    "Perlakuan 2 Sisi": "Double-Side Treatment",
    "Perlakuan Potong": "Cut Treatment",
    "Mode Cetak": "Print Mode",
    "Tanpa Cetak": "Non-Printed",
    "Target BS (%)": "BS Target (%)",
    "Kolom BS": "BS Column",
    "Jenis BS": "BS Type",
    "Pilih kolom BS": "Select BS column",
    "Pilih kolom BS untuk menampilkan nilai yang akan disimpan.": "Select a BS column to show the value that will be saved.",
    "Nilai BS (%)": "BS Value (%)",
    "Isi nilai BS antara 0 sampai 100 persen.": "Enter a BS value between 0 and 100 percent.",
    "Daftar BS": "BS List",
    "Tambah BS": "Add BS",
    "+ Tambah BS": "+ Add BS",
    "Tambahkan satu atau beberapa jenis BS untuk langkah routing ini.": "Add one or more BS types for this routing stage.",
    "Belum ada BS. Gunakan tombol Tambah BS.": "No BS has been added. Use the Add BS button.",
    "Pilih jenis BS": "Select BS type",
    "Hapus BS": "Remove BS",
    "Semua jenis BS sudah ditambahkan.": "All BS types have been added.",
    "Pilih jenis BS pada baris yang tersedia.": "Select a BS type in the available row.",
    "Pilih jenis BS pada setiap baris atau hapus baris yang tidak digunakan.": "Select a BS type in every row or remove unused rows.",
    "Isi setiap nilai BS antara 0 sampai 100 persen.": "Enter every BS value between 0 and 100 percent.",
    "Warna, tinta, dan silinder": "Colors, Ink, and Cylinders",
    "Kode Silinder": "Cylinder Code",
    "Ukuran lipat": "Fold Size",
    "Ukuran Pelipatan": "Folding Size",
    "Ukuran potong memanjang": "Longitudinal Cut Size",
    "Ukuran Pembelahan": "Slitting Size",
    "Ukuran lipatan samping": "Side Gusset Size",
    "Ukuran Lipatan": "Gusset Size",
    "Lebar Lipatan": "Gusset Width",
    "Pemotongan — Penyelesaian": "Cutting — Finishing",
    "Pemotongan - Penyelesaian": "Cutting — Finishing",
    "Alur akhir dan pengepakan": "Final process and packing",
    "Jenis Penyelesaian": "Finishing Type",
    "Kantong Kaos": "T-Shirt Bag",
    "Pegangan/Pon": "Handle/Punch",
    "Pon": "Punch",
    "Pilih jenis pengepakan": "Select packing type",
    "Karung": "Sack",
    "Dus": "Box",
    "Dalam": "Inner",
    "Pilih bentuk pengepakan": "Select packing form",
    "Kantong": "Bag",
    "Gulungan": "Roll",
    "Luar (Bal)": "Outer (Bale)",
    "Isi per Gulungan": "Contents per Roll",
    "Target BS tambahan": "Additional BS Target",
    "BS Pembelahan Lembaran (%)": "Sheet Slitting BS (%)",
    "BS Pon (%)": "Punch BS (%)",
    "BS Pegangan (%)": "Handle BS (%)",
    "Keterangan Segel Bawah": "Bottom Seal Notes",
    "Keterangan Segel Samping": "Side Seal Notes",
    "Keterangan Kantong Kaos": "T-Shirt Bag Notes",
    "Keterangan T-Shirt": "T-Shirt Bag Notes",
    "Ukuran Bahan": "Material Size",
    "Kembalikan hitungan otomatis": "Restore automatic calculation",
    "Lebar (cm)": "Width (cm)",
    "Panjang (cm)": "Length (cm)",
    "Tebal (mm)": "Thickness (mm)",
    "Kolom kosong terisi otomatis dari Ukuran Peniupan, Ukuran Jadi, dan Jenis Bahan. Begitu diketik, angka Anda yang dipakai untuk menghitung PCS/KG dan Keluar Bahan.": "Empty fields are filled automatically from Blowing Size, Finished Size, and Material Type. Once entered manually, your values are used to calculate PCS/KG and Material Issue.",
    "Simpan Proses": "Save Process",
    "Urutan tersusun": "Arranged Sequence",
    "Rincian Proses Produksi": "Production Process Details",
    "langkah": "stages",
    "Belum ada langkah tersusun. Urutan proses akan muncul di area ini.": "No stages have been arranged. The process sequence will appear here.",
    "BS Lembaran (%)": "Sheet BS (%)",
    "Warna & Pemakaian Tinta": "Colors & Ink Usage",
    "Klik warna untuk menambah cepat, lalu isi pemakaian KG. Maksimal sepuluh warna.": "Select a color to add it quickly, then enter its usage in KG. A maximum of ten colors is allowed.",
    "Tinta:": "Ink:",
    "Belum ada warna dipilih. Klik salah satu warna di atas atau tombol + Warna Lain.": "No color selected. Select a color above or use + Other Color.",
    "+ Warna Lain": "+ Other Color",
    "Perhitungan bahan": "Material Calculation",
    "Belum lengkap": "Incomplete",
    "Logika Perhitungan": "Calculation Logic",
    "Kategori —": "Category —",
    "Kategori -": "Category —",
    "Pesanan + BS": "Order + BS",
    "Rumus": "Formula",
    "Lengkapi jenis bahan, ukuran, dan pesanan.": "Complete the material type, size, and order quantity.",
    "Catatan: OPP - CPP - Kirim Gulungan, mohon atur ukuran panjang sesuai kebutuhan meter!": "Note: For OPP - CPP roll delivery, set the length according to the required meterage.",
    "Jenis Film": "Film Type",
    "Meter/KG": "Meters/KG",
    "SIMPAN DRAF": "SAVE DRAFT",
    "SIMPAN KE BASIS DATA": "SAVE TO DATABASE",
    "SPK berhasil disimpan": "SPK saved successfully",
    "Apakah Anda ingin mencetak SPK ini sekarang?": "Would you like to print this SPK now?",
    "Nomor SPK": "SPK Number",
    "Cetak SPK": "Print SPK",
    "Keluar Bahan Manajer PPIC": "PPIC Manager Material Issue",
    "Kembali ke portal utama": "Return to main portal",
    "Kembali ke portal PPIC": "Return to PPIC portal",
    "Nama perusahaan pemesan": "Customer company name",
    "Ketik tanggal/bulan, contoh 6/8": "Enter date/month, for example 6/8",
    "SPK yang ditarik datanya": "SPK used as the data source",
    "Nomor PO dari pelanggan": "Customer PO number",
    "Nama artikel atau merek produk": "Item name or product brand",
    "Kode dari master barang": "Code from item master data",
    "Boleh format angka seperti 5+1, boleh juga teks seperti 1 Warna": "Numbers such as 5+1 or text such as 1 Color are accepted",
    "Gunakan angka atau format angka+angka, contoh 5+1": "Use a number or number+number format, for example 5+1",
    "Kosongkan jika PASS": "Leave blank for PASS",
    "Dari ukuran jadi": "From finished size",
    "Lembaran menggandakan PCS/KG; Kantong tidak": "Sheets double PCS/KG; Bags do not",
    "Panjang per roll": "Length per roll",
    "Kosongkan bila PASS": "Leave blank for PASS",
    "Ditambahkan ke Total BS": "Added to Total BS",
    "Mengurangi Jumlah Pesanan": "Subtracts from Order Quantity",
    "Menambah hasil perhitungan": "Adds to the calculated result",
    "Mengurangi hasil perhitungan": "Subtracts from the calculated result",
    "Catatan atau deskripsi tambahan untuk artikel ini.": "Additional notes or description for this item.",
    "Pilih proses produksi": "Select production process",
    "Urutan pencampuran, waktu pencampuran, atau instruksi khusus.": "Mixing sequence, mixing time, or special instructions.",
    "Instruksi khusus untuk divisi Peniupan.": "Special instructions for the Blowing department.",
    "Instruksi khusus untuk divisi Pencetakan.": "Special instructions for the Printing department.",
    "Instruksi khusus untuk divisi Pelipatan.": "Special instructions for the Folding department.",
    "Instruksi khusus untuk divisi Pembelahan.": "Special instructions for the Slitting department.",
    "Instruksi khusus untuk divisi Pembentukan Lipatan.": "Special instructions for the Gusseting department.",
    "Instruksi khusus untuk divisi Segel Bawah.": "Special instructions for the Bottom Seal department.",
    "Instruksi khusus untuk divisi Segel Samping.": "Special instructions for the Side Seal department.",
    "Instruksi khusus untuk divisi Kantong Kaos.": "Special instructions for the T-Shirt Bag department.",
    "Jumlah bal pada kemasan luar": "Number of bales in the outer pack",
    "Kode silinder yang dipakai": "Cylinder code used",
    "Pilih di Data Utama": "Select in Main Data",
    "Berapa bal per luar": "Number of bales per outer pack",
    "Nilai": "Value",
    "Pantau SPK, volume pesanan, dan target pengiriman dari satu tampilan yang selalu terhubung ke basis data produksi.": "Monitor SPKs, order volume, and delivery targets from one view connected to the production database.",
    "SPK yang sudah dicetak": "Printed SPKs",
    "SPK yang belum dicetak": "Unprinted SPKs",
    "Pelanggan Aktif": "Active Customers",
    "Pelanggan unik pada data tampil": "Unique customers in the displayed records",
    "Jenis Pesanan": "Order Type",
    "Perbandingan SPK berdasarkan jenis pesanan": "SPK comparison by order type",
    "Volume KG": "KG Volume",
    "PCS ÷ PCS/KG · GULUNGAN × Meter Gulungan ÷ Meter/KG": "PCS ÷ PCS/KG · ROLL × Roll Meters ÷ Meters/KG",
    "Menghubungkan ke basis data": "Connecting to database",
    "Terjadi kendala saat menghubungkan ke basis data.": "There was a problem connecting to the database.",
    "Semua bahan": "All Materials",
    "Memuat informasi pesanan produksi…": "Loading production order information…",
    "Menyiapkan rincian SPK": "Preparing SPK details",
    "Seluruh informasi produksi sedang dibaca langsung dari Basis Data.": "All production information is being read directly from the Database.",
    "Rincian belum dapat ditampilkan": "Details cannot be displayed yet",
    "Terjadi kendala saat membaca Basis Data.": "There was a problem reading the Database.",
    "Artikel belum tersedia": "Item not available",
    "Target ETD": "ETD Target",
    "Total Target BS": "Total BS Target",
    "Alur & Keterangan": "Process & Notes",
    "Bahan & Target BS": "Materials & BS Target",
    "Identitas Pesanan": "Order Identity",
    "Informasi administrasi dan pemilik pesanan": "Administrative and order-owner information",
    "Data utama": "Main Data",
    "Spesifikasi Produk": "Product Specifications",
    "Bahan, film, ukuran, dan parameter teknis": "Materials, film, dimensions, and technical parameters",
    "Spesifikasi": "Specifications",
    "Pesanan & Pengiriman": "Orders & Delivery",
    "Kuantitas, toleransi, bahan keluar, dan jadwal ETD": "Quantity, tolerance, material issue, and ETD schedule",
    "Jadwal produksi": "Production Schedule",
    "Status divisi yang digunakan pada SPK ini": "Department statuses used for this SPK",
    "Keterangan per Divisi": "Notes by Department",
    "Klik setiap baris untuk membuka atau menutup instruksi": "Select each row to expand or collapse its instructions",
    "Komposisi Bahan Baku": "Raw Material Composition",
    "Rincian bahan, berat, dan komposisi persentase": "Material, weight, and percentage composition details",
    "No.": "No.",
    "Jenis Bahan": "Material Type",
    "Qty (KG)": "Qty (KG)",
    "Persentase": "Percentage",
    "Target BS per Proses": "BS Target by Process",
    "Persentase toleransi bahan sisa pada setiap tahapan": "Waste tolerance percentage at each stage",
    "Kontrol BS": "BS Control",
    "Daftar warna tinta pencetakan dan pemakaiannya": "Printing ink colors and their usage",
    "Warna": "Color",
    "Pemakaian (KG)": "Usage (KG)",
    "Rincian dibaca langsung dari baris SPK di Basis Data.": "Details are read directly from the SPK row in the Database.",
    "Lihat SPK": "View SPK",
    "Kelola SPK": "Manage SPK",
    "Pilih cara membuka surat perintah kerja": "Choose how to open the work order",
    "Buka halaman cetak. Saat dicetak, kolom BW (Terbit) akan ditandai YA.": "Open the print page. When printed, the BW (Released) column will be marked YES.",
    "Lihat Saja": "View Only",
    "Buka dokumen SPK tanpa mengubah nilai terbit dan tanpa menandai BW.": "Open the SPK document without changing the release value or marking BW.",
    "Sunting Data": "Edit Data",
    "Edit Data": "Edit Data",
    "Perbarui data utama, spesifikasi produk, jumlah pesanan, dan jadwal kirim.": "Update main data, product specifications, order quantity, and delivery schedule.",
    "Sunting Data SPK": "Edit SPK Data",
    "Edit Data SPK": "Edit SPK Data",
    "Perubahan akan langsung disimpan ke lembar Basis Data": "Changes will be saved directly to the Database sheet",
    "Mohon tunggu saat data terbaru dibaca dari Basis Data.": "Please wait while the latest data is read from the Database.",
    "Data sunting tidak dapat dimuat": "Edit data could not be loaded",
    "Terjadi kesalahan saat membaca SPK.": "An error occurred while reading the SPK.",
    "Nomor SPK dan status terbit dikunci. Data proses produksi, BS, komposisi bahan, dan ETA pembelian tidak akan berubah.": "The SPK number and release status are locked. Production process data, BS, material composition, and purchasing ETAs will not change.",
    "SPK Referensi": "Reference SPK",
    "Nomor PO": "PO Number",
    "Ukuran Peniupan": "Blowing Size",
    "Pertahankan pola ukuran yang sudah digunakan pada pembuatan SPK.": "Keep the size pattern used when the SPK was created.",
    "Contoh pola: lebar × panjang × tebal.": "Example pattern: width × length × thickness.",
    "Pesanan dan Pengiriman": "Order and Delivery",
    "UOM Pesanan": "Order UOM",
    "UOM Keluar Bahan": "Material Issue UOM",
    "Pilih UOM": "Select UOM",
    "Toleransi (%)": "Tolerance (%)",
    "ETD / Tanggal Kirim": "ETD / Delivery Date",
    "Isian Pelanggan": "Customer Entry",
    "Disimpan ke lembar Basis Data Pelanggan": "Saved to the Customer Database sheet",
    "Identitas": "Identity",
    "Kode Pelanggan": "Customer Code",
    "Nama Pelanggan": "Customer Name",
    "Nama Alias": "Alias Name",
    "Alamat": "Address",
    "Kota": "City",
    "Provinsi": "Province",
    "Kode Pos": "Postal Code",
    "Alamat Kirim": "Delivery Address",
    "(bila berbeda dari alamat utama)": "(if different from the main address)",
    "Kontak": "Contact",
    "Telepon": "Phone",
    "Surel": "Email",
    "Email": "Email",
    "Narahubung": "Contact Person",
    "Telepon Narahubung": "Contact Person Phone",
    "Ketentuan dagang": "Trade Terms",
    "Termin (hari)": "Terms (days)",
    "Limit Kredit": "Credit Limit",
    "Tanggal Terdaftar": "Registration Date",
    "Simpan Pelanggan": "Save Customer",
    "Isian Merek": "Brand Entry",
    "Disimpan ke lembar Basis Data Merek": "Saved to the Brand Database sheet",
    "Identitas merek": "Brand Identity",
    "Kode Merek": "Brand Code",
    "Nama Merek": "Brand Name",
    "Pilih pelanggan": "Select customer",
    "Spesifikasi barang": "Item Specifications",
    "Pilih film": "Select film",
    "Pengepakan dan keadaan": "Packing and status",
    "Simpan Merek": "Save Brand",
    "Berhasil.": "Successful.",
    "Tampilkan rekapan": "Show summary",
    "Tambah pelanggan ke data induk": "Add customer to master data",
    "Tambah merek ke data induk": "Add brand to master data",
    "Kategori kode SPK per bulan": "Monthly SPK code categories",
    "Distribusi data": "Data distribution",
    "Atur ulang pencarian dan penyaring": "Reset search and filters",
    "Reset pencarian dan filter": "Reset search and filters",
    "Ringkasan SPK": "SPK Summary",
    "Kelompok rincian SPK": "SPK detail group",
    "Kelompok detail SPK": "SPK detail group",
    "Cari nomor SPK, periksa keadaan Basis Data, lalu tarik seluruh direktori atau satu berkas tertentu.": "Search for an SPK number, check its Database status, then retrieve an entire directory or a specific file.",
    "Gunakan pencarian SPK dan lihat tanda apakah berkas sudah tersimpan.": "Use SPK search and check whether the file has already been saved.",
    "Kedua mode berjalan bertahap: SPK lama tidak ditimpa. SPK baru ditambahkan dan disusun dari kecil ke besar; rumus, keadaan terbit, serta keterangan manual tetap dilindungi.": "Both modes run incrementally: existing SPKs are not overwritten. New SPKs are added and sorted in ascending order, while formulas, release status, and manual notes remain protected.",
    "Telusuri direktori, cari SPK, dan periksa keadaan": "Browse directories, search SPKs, and check status",
    "Isi warna tinta, keterangan artikel, keterangan divisi, dan kode barang untuk SPK yang sudah ada di Basis Data. Hanya sel yang masih kosong yang diisi; kolom lain dan hasil sunting manual tidak disentuh.": "Fill ink colors, item notes, department notes, and item codes for SPKs already in the Database. Only empty cells are filled; other columns and manual edits are left unchanged.",
    "Tarik semua berkas dari direktori ini": "Retrieve all files from this directory",
    "Lokasi direktori": "Directory location",
    "Cari data": "Search data",
    "Menyiapkan antrean keluar bahan dari Basis Data.": "Preparing the material issue queue from the Database.",
    "Halaman 1 / 1": "Page 1 / 1",
    "Jadwal Kedatangan Bahan": "Material Arrival Schedule",
    "Data disimpan ke kolom CG–CV pada Basis Data.": "Data is saved to columns CG–CV in the Database.",
    "Data disimpan ke kolom CG–CV pada Database.": "Data is saved to columns CG–CV in the Database.",
    "Simpan Jadwal ETA": "Save ETA Schedule",
    "Menghitung ulang kebutuhan bahan dan membaca rincian produksi.": "Recalculating material requirements and reading production details.",
    "Rincian gagal dimuat": "Failed to load details",
    "Terjadi gangguan saat membaca rincian SPK.": "There was a problem reading the SPK details.",
    "Hasil dihitung ulang dari data SPK tersimpan dengan rumus halaman Pembuatan SPK.": "Results are recalculated from saved SPK data using the Create SPK page formula.",
    "Hasil dihitung ulang dari data SPK tersimpan dengan rumus halaman Input SPK.": "Results are recalculated from saved SPK data using the Create SPK page formula.",
    "Sembunyikan rekapan": "Hide summary",
    "Ringkasan keluar bahan": "Material issue summary",
    "Penyaring keadaan": "Status filter",
    "Filter status": "Status filter",
    "Tutup modal ETA": "Close ETA dialog",
    "Tambahkan informasi pemasok, kendala pembelian, atau catatan lainnya...": "Add supplier information, purchasing issues, or other notes...",
    "Tutup rincian": "Close details",
    "Tutup detail": "Close details",
    "Terisi dari kode pelanggan": "Filled from customer code",
    "Terjadi gangguan saat membaca Basis Data.": "There was a problem reading the Database."
    ,"(dihitung dari lebar)": "(calculated from width)"
    ,"(tertulis pada Ukuran Peniupan)": "(entered in Blowing Size)"
    ,"Gunakan angka atau format angka+angka, contoh 5+1.": "Use a number or number+number format, for example 5+1."
    ,"Hasil × Meter Gulungan ÷ Meter ÷ UP": "Result × Roll Meters ÷ Meters ÷ UP"
    ,"Hasil × Panjang × Konversi PCS/KG ÷ 100 ÷ Meter": "Result × Length × PCS/KG Conversion ÷ 100 ÷ Meters"
    ,"Hasil × Panjang ÷ 100 ÷ Meter": "Result × Length ÷ 100 ÷ Meters"
    ,"Hasil ÷ Konversi PCS/KG": "Result ÷ PCS/KG Conversion"
    ,"Panjang, Tebal, atau Lebar Jadi belum valid.": "Finished Length, Thickness, or Width is invalid."
    ,"Pilih PCS, KG, atau GULUNGAN.": "Select PCS, KG, or ROLL."
    ,"Pilih proses berikutnya untuk menambah langkah. Proses yang sama boleh dipilih lagi; gunakan tombol Sunting pada kartu untuk mengubah langkah yang sudah ada.": "Select the next process to add a stage. The same process may be selected again; use Edit on the card to change an existing stage."
    ,"Tidak memakai konversi; hasil sama dengan Pesanan + BS.": "No conversion is used; the result equals Order + BS."
    ,"Draf Belum Aktif": "Draft Not Active"
    ,"Tombolnya sudah tersedia, tetapi penyimpanan draf belum dijalankan. Tidak ada data yang tersimpan saat tombol ini ditekan.": "The button is available, but draft storage has not been enabled. No data is saved when this button is selected."
    ,"Lengkapi data lama SPK ini (isi kolom baru yang masih kosong)": "Complete this existing SPK (fill newly added empty columns)"
    ,"Proses berhenti setelah berkas yang sedang dibaca selesai. Data yang sudah masuk tetap tersimpan; berkas yang belum diproses tidak diubah.": "The process stops after the current file finishes. Imported data remains saved, and unprocessed files are not changed."
    ,"Data yang sudah masuk tetap tersimpan. Berkas yang belum diproses tidak diubah.": "Imported data remains saved. Unprocessed files are not changed."
    ,"Tidak ada SPK baru; data lama dilewati tanpa perubahan.": "No new SPKs were found; existing data was skipped without changes."
    ,"· Gagal": "· Failed"
    ,"Coba muat ulang halaman; bila berulang, Basis Data kemungkinan terlalu besar untuk sekali baca.": "Reload the page. If the issue continues, the Database may be too large to read in one request."
    ,"Data berhasil diambil, tetapi gagal ditampilkan:": "Data was retrieved but could not be displayed:"
    ,"Menampilkan _START_–_END_ dari _TOTAL_ data": "Showing _START_–_END_ of _TOTAL_ records"
    ,"Semua Tahun": "All Years"
    ,"ETA Beli Bahan": "Material Purchase ETA"
    ,"Bahan CPP → Meter tetap 6.000": "CPP Material → Meters remain 6,000"
    ,"Nilai PPIC tersimpan; hasil sistem belum dapat dihitung.": "The PPIC value is saved; the system result cannot be calculated yet."
    ,"Pesanan setelah BS × Panjang × PCS/KG ÷ 100 ÷ Meter": "Order after BS × Length × PCS/KG ÷ 100 ÷ Meters"
    ,"Pesanan setelah BS × Panjang ÷ 100 ÷ Meter": "Order after BS × Length ÷ 100 ÷ Meters"
    ,"Pesanan setelah BS ÷ PCS/KG": "Order after BS ÷ PCS/KG"
    ,"Pesanan setelah BS × Meter Gulungan ÷ Meter ÷ UP": "Order after BS × Roll Meters ÷ Meters ÷ UP"
    ,"Keluar Bahan = Pesanan setelah BS": "Material Issue = Order after BS"
    ,"PCS/KG = 5.444 ÷ Panjang ÷ Tebal ÷ Lebar Jadi": "PCS/KG = 5,444 ÷ Length ÷ Thickness ÷ Finished Width"
    ,"Periksa kombinasi bahan, UOM pesanan, dan ukuran.": "Check the material, order UOM, and size combination."
    ,"Tanggal —": "Date —"
    ,"UP = pembulatan ke bawah (Lebar Bahan ÷ Lebar Jadi)": "UP = floor(Material Width ÷ Finished Width)"
    ,"Memperbarui kolom BV (Terbit)...": "Updating column BV (Released)..."
    ,"Segel harus rata, kuat, dan tidak berkerut.": "The seal must be even, strong, and wrinkle-free."
    ,"Segel harus rata dan kuat.": "The seal must be even and strong."
    ,"Menampilkan": "Showing"
    ,"GULUNGAN": "ROLL"
    ,"Panjang per gulungan": "Length per roll"
    ,"Meter Gulungan": "Roll Meters"
    ,"Meter per Gulungan": "Meters per Roll"
    ,"Kg / Gulungan": "Kg / Roll"
    ,"Meter / Gulungan": "Meters / Roll"
    ,"Keadaan ETD": "ETD Status"
    ,"Terbit": "Release"
    ,"Keadaan terbit": "Release status"
    ,"Jenis Pengepakan": "Packing Type"
    ,"Pengepakan": "Packing"
    ,"Penyelesaian": "Finishing"
    ,"Periksa isian": "Check the entries"
    ,"Nomor SPK Pesanan Baru": "New Order SPK Number"
    ,"Hasil tidak valid. Periksa dimensi dan pesanan.": "The result is invalid. Check the dimensions and order quantity."
    ,"Nomor SPK tidak ditemukan di Basis Data.": "The SPK number was not found in the Database."
    ,"Tidak ada data yang sesuai dengan penyaring.": "No data matches the filters."
    ,"Data SPK tidak ditemukan di Basis Data.": "SPK data was not found in the Database."
    ,"Gagal membaca data sunting dari Basis Data.": "Failed to read edit data from the Database."
    ,"Gagal menyimpan perubahan ke Basis Data.": "Failed to save changes to the Database."
    ,"Terbit YA": "Released"
    ,"Terbit TIDAK": "Not Released"
    ,"Periksa kedalaman lipatan samping pada awal gulungan.": "Check the side-gusset depth at the start of the roll."
    ,"Penyaring keadaan penarikan": "Retrieval status filter"
    ,"Keadaan:": "Status:"
    ,"Keadaan belum tersedia": "Status is not available"
    ,"Tidak ada berkas yang cocok dengan pencarian.": "No files match the search."
    ,"Memindai berkas sumber...": "Scanning source files..."
    ,"SPK baru berhasil ditambahkan dan Basis Data sudah diurutkan.": "New SPKs were added successfully and the Database was sorted."
    ,"Berkas SPK": "SPK File"
    ,"Berkas gagal diproses": "Files that failed to process"
    ,"Berkas dengan peringatan": "Files with warnings"
    ,"Semua berkas yang memenuhi syarat selesai diproses tanpa kesalahan.": "All eligible files were processed without errors."
    ,"Direktori penarikan": "Retrieval directory"
    ,"Direktori Produksi": "Production Directory"
    ,"Pilih UOM ETA 1: KG atau GULUNGAN.": "Select ETA 1 UOM: KG or ROLL."
    ,"Pilih UOM KG atau GULUNGAN.": "Select UOM KG or ROLL."
    ,"Jumlah pesanan setelah BS": "Order quantity after BS"
    ,"Aturan Meter berdasarkan bahan dan tebal": "Meter rule based on material and thickness"
    ,"Jenis Pesanan": "Order Type"
    ,"Belum ada data pada keadaan ini": "There is no data with this status"
    ,"Periksa kembali kata pencarian atau ubah penyaring keadaan.": "Check the search term or change the status filter."
    ,"Ubah penyaring untuk melihat data SPK lainnya.": "Change the filter to view other SPK data."
    ,"Cetak dan Tandai Terbit": "Print and Mark as Released"
    ,"Dokumen telah ditandai Terbit = YA.": "The document has been marked as Released = YES."
    ,"Mode Lihat Saja. Keadaan terbit tidak diubah.": "View-only mode. Release status is unchanged."
    ,"Paket SPK sudah pernah diterbitkan dan siap dicetak ulang.": "The SPK package was previously released and is ready to reprint."
    ,"Paket siap. Keadaan terbit menjadi YA setelah tombol cetak ditekan.": "The package is ready. Release status changes to YES after the print button is selected."
    ,"MENANDAI TERBIT...": "MARKING AS RELEASED..."
    ,"CETAK DAN TANDAI TERBIT": "PRINT AND MARK AS RELEASED"
    ,"Keadaan terbit gagal diperbarui.": "Failed to update release status."
    ,"Keadaan terbit berhasil diperbarui.": "Release status was updated successfully."
    ,"TERBIT": "RELEASED"
    ,"BELUM TERBIT": "NOT RELEASED"
    ,"Manajer Kendali Mutu / Jaminan Mutu": "Quality Control / Quality Assurance Manager"
    ,"Manajer Senior": "Senior Manager"
    ,"Manajer Umum": "General Manager"
    ,"Giliran Kerja": "Shift"
    ,"Giliran Kerja / Operator": "Shift / Operator"
    ,"Gulungan Awal": "Starting Roll"
    ,"No. Gulungan": "Roll No."
    ,"Mulai": "Start"
    ,"Selesai": "Finish"
    ,"PESANAN BARU": "NEW ORDER"
    ,"PESANAN ULANG": "REPEAT ORDER"
    ,"SEGEL BAWAH": "BOTTOM SEAL"
    ,"SEGEL SAMPING": "SIDE SEAL"
    ,"PEMBELAHAN LEMBARAN": "SHEET SLITTING"
    ,"PENCAMPURAN": "MIXER"
    ,"PENIUPAN": "BLOWING"
    ,"PENCETAKAN": "PRINTING"
    ,"PELIPATAN": "FOLDING"
    ,"PEMBELAHAN": "SLITTING"
    ,"PEMBENTUKAN LIPATAN": "GUSSETING"
    ,"PEMOTONGAN": "CUTTING"
    ,"KANTONG KAOS": "T-SHIRT BAG"
    ,"TANPA CETAK": "NON-PRINT"
    ,"LANGSUNG": "INLINE"
    ,"PENUH": "FULL"
    ,"KHUSUS": "CUSTOM"
    ,"Film": "Film"
    ,"Mode": "Mode"
    ,"Pemotongan dan pembagian gulungan": "Cutting and roll splitting"
    ,"Keterangan Pencampuran": "Mixing Notes"
    ,"Keterangan Peniupan": "Blowing Notes"
    ,"Keterangan Pencetakan": "Printing Notes"
    ,"Keterangan Pembelahan": "Slitting Notes"
    ,"Keterangan Pelipatan": "Folding Notes"
    ,"Keterangan Pembentukan Lipatan": "Gusseting Notes"
    ,"Tidak": "No"
    ,"Server belum menjawab setelah 90 detik.": "The server did not respond within 90 seconds."
    ,"Gagal mengambil data dari Google Spreadsheet.": "Failed to retrieve data from Google Sheets."
    ,"Format data dari server tidak dikenali.": "The server data format was not recognized."
    ,"tembolok": "cache"
    ,"baca lembar": "read sheet"
    ,"Semua Tahun": "All Years"
    ,"Pilihan tahun SPK gagal disimpan:": "The SPK year selection could not be saved:"
    ,"Belum ada data SPK.": "No SPK data is available."
    ,"Menampilkan 0 data": "Showing 0 records"
    ,"Tampilkan _MENU_ data": "Show _MENU_ records"
    ,"Tidak diketahui": "Unknown"
    ,"Seluruh data produksi": "All production data"
    ,"SPK belum memiliki data konversi": "SPKs do not have conversion data yet"
    ,"Semua SPK berhasil dikonversi": "All SPKs were converted successfully"
    ,"dari semua tahun": "from all years"
    ,"Pelanggan belum tersedia": "Customer is not available"
    ,"Nomor SPK tidak tersedia pada baris yang dipilih.": "The SPK number is not available in the selected row."
    ,"Gagal membaca rincian SPK dari Basis Data.": "Failed to read SPK details from the Database."
    ,"SPK belum dicetak": "SPK has not been printed"
    ,"Data lengkap untuk SPK ini tidak ditemukan.": "Complete data for this SPK was not found."
    ,"Pemasaran belum tersedia": "Marketing is not available"
    ,"Bahan belum tersedia": "Material is not available"
    ,"Meter per KG": "Meters per KG"
    ,"Proses aktif": "Active Process"
    ,"Proses tidak digunakan": "Process Not Used"
    ,"Tidak digunakan": "Not Used"
    ,"Belum ada keterangan untuk proses ini.": "No notes are available for this process."
    ,"Sesuai Jadwal": "On Schedule"
    ,"Sesuai jadwal": "On schedule"
    ,"Gunakan artwork revisi terakhir.": "Use the latest artwork revision."
    ,"Data SPK yang akan disunting tidak tersedia.": "The SPK data to edit is not available."
    ,"Data SPK yang akan diedit tidak tersedia.": "The SPK data to edit is not available."
    ,"Menyimpan perubahan ke Basis Data...": "Saving changes to the Database..."
    ,"Menyimpan...": "Saving..."
    ,"Perubahan gagal disimpan.": "Changes could not be saved."
    ,"Tanggal belum tersedia": "Date is not available"
    ,"Jenis belum tersedia": "Type is not available"
    ,"Keluar Bahan belum diisi": "Material Issue has not been entered"
    ,"Data proses tersimpan": "Process data saved"
    ,"Hapus bahan": "Remove material"
    ,"F · Pesanan GULUNGAN": "F · ROLL Order"
    ,"Logika Perhitungan Kirim GULUNGAN": "ROLL Delivery Calculation Logic"
    ,"Bahan memuat CPP dan OPP sekaligus. Pilih salah satu di Data Utama.": "The material contains both CPP and OPP. Select one in Main Data."
    ,"Bahan dan UOM belum masuk kategori A-F. Periksa Bahan di Data Utama.": "The material and UOM do not match categories A-F. Check the Material in Main Data."
    ,"Isi Bahan pada tab Data Utama.": "Enter the Material on the Main Data tab."
    ,"Isi Ukuran Peniupan.": "Enter the Blowing Size."
    ,"Isi Ukuran Jadi.": "Enter the Finished Size."
    ,"Isi Jumlah Pesanan lebih dari 0.": "Enter an Order Quantity greater than 0."
    ,"Panjang atau Tebal pada Ukuran Jadi belum valid.": "The Finished Length or Thickness is invalid."
    ,"Dimensi belum lengkap untuk kategori C.": "The dimensions are incomplete for category C."
    ,"Tebal/Mikron belum valid untuk menentukan Meter.": "Thickness/Microns is invalid for calculating Meters."
    ,"UP tidak valid. Lebar Bahan harus minimal sama dengan Lebar Jadi.": "UP is invalid. Material Width must be at least equal to Finished Width."
    ,"Isi Meter/Gulungan untuk pesanan GULUNGAN.": "Enter Meters/Roll for a ROLL order."
    ,"Aturan Meter CPP: tetap 6.000": "CPP Meter Rule: fixed at 6,000"
    ,"Meter dari Tebal": "Meters from Thickness"
    ,"Kategori ditentukan dari Bahan dan UOM Pesanan.": "The category is determined from the Material and Order UOM."
    ,"Lengkapi data perhitungan.": "Complete the calculation data."
    ,"Belum mulai": "Not started"
    ,"Tunggu sampai data SPK sebelumnya selesai dimuat.": "Wait until the previous SPK data has finished loading."
    ,"SPK Lama Belum Ditemukan": "Previous SPK Not Found"
    ,"Pastikan SPK item sebelumnya ditemukan dan data berhasil dimuat.": "Make sure the previous item SPK was found and its data loaded successfully."
    ,"Nomor SPK Ulang Baru": "New Repeat SPK Number"
    ,"Tanggal Kirim": "Delivery Date"
    ,"Data Utama Belum Lengkap": "Main Data Is Incomplete"
    ,"Lengkapi:": "Complete:"
    ,"Keterangan Warna Belum Valid": "Color Notes Are Invalid"
    ,"Keterangan Bahan Belum Valid": "Material Notes Are Invalid"
    ,"Nomor SPK Tidak Boleh Sama": "SPK Numbers Must Be Different"
    ,"Tunggu sampai pengecekan nomor SPK baru selesai.": "Wait until the new SPK number check is complete."
    ,"SPK Sudah Ada": "SPK Already Exists"
    ,"Ganti nomor SPK baru sebelum melanjutkan.": "Change the new SPK number before continuing."
    ,"SPK Belum Terverifikasi": "SPK Has Not Been Verified"
    ,"Ketik nomor SPK baru lalu tunggu hingga keadaannya tersedia.": "Enter a new SPK number and wait until its status is available."
    ,"Ketik nomor SPK baru lalu tunggu hingga statusnya tersedia.": "Enter a new SPK number and wait until its status is available."
    ,"Lengkapi: Ukuran Jadi.": "Complete: Finished Size."
    ,"Jumlah Pesanan wajib lebih dari 0.": "Order Quantity must be greater than 0."
    ,"UOM Pesanan Belum Valid": "Order UOM Is Invalid"
    ,"Meter/Gulungan Belum Lengkap": "Meters/Roll Is Incomplete"
    ,"Isi Meter/Gulungan lebih dari 0 untuk pesanan GULUNGAN.": "Enter Meters/Roll greater than 0 for a ROLL order."
    ,"Keluar Bahan Belum Valid": "Material Issue Is Invalid"
    ,"Kosongkan kolom atau isi Keluar Bahan lebih dari 0.": "Leave the field blank or enter a Material Issue quantity greater than 0."
    ,"UOM Keluar Bahan Belum Valid": "Material Issue UOM Is Invalid"
    ,"Gagal Memeriksa SPK": "Failed to Check SPK"
    ,"Data SPK gagal dimuat.": "SPK data could not be loaded."
    ,"Respons server tidak dikenali. Periksa PPIC sebelum mencoba menyimpan ulang.": "The server response was not recognized. Check PPIC before trying to save again."
    ,"Gagal Menyimpan": "Failed to Save"
    ,"Konfirmasi server tidak dapat dibaca. Periksa PPIC sebelum mencoba menyimpan ulang.": "The server confirmation could not be read. Check PPIC before trying to save again."
    ,"Keadaan penarikan sebelumnya tidak dapat dibaca.": "The previous retrieval status could not be read."
    ,"Proses penarikan sebelumnya telah selesai.": "The previous retrieval process has completed."
    ,"Gagal membaca Google Drive.": "Failed to read Google Drive."
    ,"Tanggapan direktori tidak dikenali.": "The directory response was not recognized."
    ,"Cari nomor SPK atau nama berkas...": "Search by SPK number or file name..."
    ,"Cari nomor SPK atau nama berkas": "Search by SPK number or file name"
    ,"Semua": "All"
    ,"Belum ditarik": "Not Retrieved"
    ,"SPK tidak terdeteksi": "SPK Not Detected"
    ,"SPK ini sudah tersedia di Basis Data": "This SPK is already in the Database"
    ,"Tarik data hanya dari berkas ini": "Retrieve data from this file only"
    ,"Menyinkronkan data sumber ke Basis Data.": "Synchronizing source data to the Database."
    ,"Proses penarikan telah selesai.": "The retrieval process has completed."
    ,"Mendaftarkan penarikan seluruh direktori...": "Registering retrieval for the entire directory..."
    ,"Proses penarikan tidak dapat didaftarkan.": "The retrieval process could not be registered."
    ,"Pratinjau lokal: satu berkas SPK berhasil diproses.": "Local preview: one SPK file was processed successfully."
    ,"Pratinjau lokal selesai. Beberapa berkas memerlukan perhatian sebelum ditarik ulang.": "The local preview is complete. Some files need attention before being retrieved again."
    ,"Ada lebih dari satu berkas sumber untuk SPK G26.041. Sisakan satu berkas yang paling baru.": "There is more than one source file for SPK G26.041. Keep only the newest file."
    ,"Format SPK pada F7 tidak valid. Gunakan format seperti G26.001.": "The SPK format in F7 is invalid. Use a format such as G26.001."
    ,"SPK tidak cocok": "SPK Does Not Match"
    ,"Terdapat berkas sumber lain dengan nomor SPK yang sama.": "Another source file has the same SPK number."
    ,"Nomor SPK pada nama berkas berbeda dengan nilai yang ditemukan pada sel F7.": "The SPK number in the file name differs from the value in cell F7."
    ,"Ditemukan 10 bahan. Basis Data AW-BR hanya menyimpan sampai Bahan 8.": "Ten materials were found. Database columns AW-BR only store up to Material 8."
    ,"Proses ekstraksi gagal.": "The extraction process failed."
    ,"Tidak ada berkas sumber yang diproses": "No source files were processed"
    ,"Penarikan tidak dapat diselesaikan": "Retrieval Could Not Be Completed"
    ,"Penarikan selesai dengan kesalahan": "Retrieval Completed with Errors"
    ,"Penarikan selesai dengan catatan": "Retrieval Completed with Notes"
    ,"Penarikan data selesai": "Data Retrieval Complete"
    ,"Tanggapan sinkronisasi tidak dikenali.": "The synchronization response was not recognized."
    ,"Semua keadaan": "All Statuses"
    ,"Ubah penyaring atau kata pencarian untuk melihat data lainnya.": "Change the filter or search term to view other data."
    ,"Hapus semua penyaring": "Clear All Filters"
    ,"Keadaan divisi yang digunakan pada SPK ini": "Department statuses used for this SPK"
    ,"Nomor SPK dan keadaan terbit dikunci. Data proses produksi, BS, komposisi bahan, dan ETA pembelian tidak akan berubah.": "The SPK number and release status are locked. Production process data, BS, material composition, and purchasing ETAs will not change."
    ,"Atur Ulang": "Reset"
    ,"Penarikan data masih berjalan.": "Data retrieval is still running."
    ,"Batalkan penarikan data?": "Cancel data retrieval?"
    ,"Lanjutkan proses": "Continue Process"
    ,"Membatalkan penarikan data...": "Canceling data retrieval..."
    ,"Penarikan dibatalkan": "Retrieval Canceled"
    ,"Permintaan pembatalan gagal dikirim.": "The cancellation request could not be sent."
    ,"Sampel dan Uji Coba": "Samples and Trials"
    ,"Belum diisi": "Not Entered"
    ,"Isi tanggal ETA": "Enter the ETA date"
    ,"Keterangan maksimal 1.000 karakter.": "Notes may contain up to 1,000 characters."
    ,"Jadwal ETA gagal disimpan.": "The ETA schedule could not be saved."
    ,"Jadwal ETA berhasil disimpan.": "The ETA schedule was saved successfully."
    ,"Terjadi gangguan saat menyimpan jadwal ETA.": "There was a problem saving the ETA schedule."
    ,"Rincian kebutuhan keluar bahan": "Material issue requirement details"
    ,"Perhitungan belum tersedia": "Calculation is not available"
    ,"Data belum lengkap untuk dihitung.": "The data is incomplete and cannot be calculated."
    ,"Keterangan:": "Notes:"
    ,"Belum dapat dihitung": "Cannot be calculated yet"
    ,"Kategori belum valid": "The category is invalid"
    ,"Jumlah Pesanan × (1 + Total BS ÷ 100)": "Order Quantity × (1 + Total BS ÷ 100)"
    ,"Tebal ≥ 0,029 → Meter 3.000": "Thickness ≥ 0.029 → 3,000 Meters"
    ,"Tebal ≥ 0,020 → Meter 4.000": "Thickness ≥ 0.020 → 4,000 Meters"
    ,"Tidak memerlukan konversi tambahan": "No additional conversion is required"
    ,"Hasil setelah BS digunakan langsung.": "The result after BS is used directly."
    ,"Hasil setelah BS": "Result after BS"
    ,"Belum ditetapkan oleh Manajer PPIC.": "Not set by the PPIC Manager."
    ,"Selisih terhadap hasil sistem:": "Difference from the system result:"
    ,"Data tidak ditemukan": "Data Not Found"
    ,"Semua Keluar Bahan sudah diatur": "All Material Issues Have Been Set"
    ,"Tidak ada SPK yang masih menunggu pengisian Manajer PPIC.": "No SPKs are waiting for the PPIC Manager's entry."
    ,"Belum disimpan": "Not Saved"
    ,"Klik baris untuk melihat rincian SPK": "Select a row to view SPK details"
    ,"Isi QTY ETA": "Enter ETA Quantity"
    ,"ETA beli bahan gagal disimpan.": "The material purchase ETA could not be saved."
    ,"Terjadi gangguan saat menyimpan ETA beli bahan.": "There was a problem saving the material purchase ETA."
    ,"Isi Keluar Bahan dengan angka lebih dari 0.": "Enter a Material Issue quantity greater than 0."
    ,"Keluar Bahan gagal disimpan.": "Material Issue could not be saved."
    ,"Keluar Bahan berhasil disimpan.": "Material Issue was saved successfully."
    ,"Terjadi gangguan saat menyimpan data.": "There was a problem saving the data."
    ,"Nomor SPK tidak tersedia pada tautan cetak.": "The SPK number is not available in the print link."
    ,"Data SPK tidak ditemukan.": "SPK data was not found."
    ,"Nomor PO Pelanggan": "Customer PO Number"
    ,"Jumlah Bahan": "Material Quantity"
    ,"Estimasi Proses": "Process Estimate"
    ,"Jumlah Warna": "Color Count"
    ,"0/0 SPK": "0/0 SPKs"
    ,"⌂ Dasbor PPIC": "⌂ PPIC Dashboard"
    ,"Sampel": "Sample"
    ,"Lembaran Uji Coba": "Trial Sheet"
    ,"Peniupan:": "Blowing:"
    ,"· Semua Tahun": "· All Years"
    ,"Meter:": "Meters:"
    ,"Meter Gulungan:": "Roll Meters:"
    ,"Meter/KG:": "Meters/KG:"
    ,"Massa Jenis:": "Density:"
    ,"Tanggapan sinkronisasi tidak dikenali.": "The synchronization response was not recognized."
  });

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
    if ((match = value.match(/^Contoh:\s*(.+)$/i))) return "Example: " + match[1];
    if ((match = value.match(/^Pilih UOM ETA\s+(\d+):\s+KG atau GULUNGAN\.$/i))) return "Select ETA " + match[1] + " UOM: KG or ROLL.";
    if ((match = value.match(/^Pilih\s+(.+)$/i))) return "Select " + (EN[match[1]] || match[1]);
    if ((match = value.match(/^(\d+)\s+langkah$/i))) return match[1] + " stages";
    if ((match = value.match(/^Naikkan\s+(.+)\s+ke langkah\s+(\d+)$/i))) return "Move " + match[1] + " up to stage " + match[2];
    if ((match = value.match(/^Turunkan\s+(.+)\s+ke langkah\s+(\d+)$/i))) return "Move " + match[1] + " down to stage " + match[2];
    if ((match = value.match(/^Hapus langkah\s+(\d+)\s+(.+)$/i))) return "Remove stage " + match[1] + " " + match[2];
    if ((match = value.match(/^Hasil otomatis kategori\s+(.+)\. Gunakan sebagai acuan; isian Keluar Bahan boleh dikosongkan oleh administrator\.$/i))) return "Automatic result for category " + match[1] + ". Use it as a reference; the Material Issue field may be left empty by the administrator.";
    if ((match = value.match(/^Data SPK '(.+)' berhasil diperbarui\.$/i))) return "SPK data '" + match[1] + "' was updated successfully.";
    if ((match = value.match(/^Kelola SPK\s+(.+)$/i))) return "Manage SPK " + match[1];
    if ((match = value.match(/^ETA Beli Bahan\s+·\s+(.+)$/i))) return "Material Purchase ETA · " + match[1];
    if ((match = value.match(/^Satuan PPIC berbeda dari satuan hasil sistem \((.+)\)$/i))) return "The PPIC unit differs from the system result unit (" + match[1] + ")";
    if ((match = value.match(/^dari\s+(\d+)\s+data\s+·\s+Penyaring:\s*(.+)$/i))) return "of " + match[1] + " records · Filters: " + match[2];
    if ((match = value.match(/^Menampilkan seluruh\s+(\d+)\s+data produksi\.$/i))) return "Showing all " + match[1] + " production records.";
    if ((match = value.match(/^Menampilkan\s+(\d+)\s+dari\s+(\d+)\s+data\s+·\s+Penyaring:\s*(.+)$/i))) {
      var filterDescription = match[3]
        .replace(/\btahun SPK\b/gi, "SPK year")
        .replace(/\bkategori\b/gi, "category")
        .replace(/\bdari semua tahun\b/gi, "from all years")
        .replace(/\bpencarian\b/gi, "search")
        .replace(/\btanggal\b/gi, "date")
        .replace(/\bjenis pesanan\b/gi, "order type")
        .replace(/\bbahan\b/gi, "material")
        .replace(/\bkeluar bahan belum diisi\b/gi, "material issue not entered")
        .replace(/\bsudah dicetak\b/gi, "printed")
        .replace(/\bbelum dicetak\b/gi, "not printed");
      return "Showing " + match[1] + " of " + match[2] + " records · Filters: " + filterDescription;
    }
    if ((match = value.match(/^Menampilkan\s+(\d+)\s+data$/i))) return "Showing " + match[1] + " records";
    if ((match = value.match(/^Pilih UOM ETA\s+(\d+):\s+KG atau GULUNGAN\.$/i))) return "Select ETA " + match[1] + " UOM: KG or ROLL.";
    if ((match = value.match(/^Isi tanggal ETA\s+(\d+)\s+tidak boleh lebih awal dari ETA sebelumnya\.$/i))) return "ETA " + match[1] + " date cannot be earlier than the previous ETA.";
    if ((match = value.match(/^Tarik data hanya dari berkas\s+(.+)$/i))) return "Retrieve data only from file " + match[1];
    if ((match = value.match(/^Mendaftarkan penarikan berkas\s+(.+)\.\.\.$/i))) return "Registering retrieval for file " + match[1] + "...";
    if ((match = value.match(/^(\d+)\s+dari\s+(\d+)\s+berkas telah diperiksa$/i))) return match[1] + " of " + match[2] + " files checked";
    if ((match = value.match(/^(\d+)\s+berkas$/i))) return match[1] + " files";
    if ((match = value.match(/^(\d+)\s+kategori$/i))) return match[1] + " categories";
    if ((match = value.match(/^(\d+)\s+proses aktif$/i))) return match[1] + " active processes";
    if ((match = value.match(/^(\d+)\s+keterangan$/i))) return match[1] + " notes";
    if ((match = value.match(/^(\d+)\s+warna$/i))) return match[1] + " colors";
    if ((match = value.match(/^(\d+)\s+dari\s+(\d+)\s+keterangan terisi$/i))) return match[1] + " of " + match[2] + " notes completed";
    if ((match = value.match(/^(\d+)\s*\/\s*(\d+)\s+SPK$/i))) return match[1] + "/" + match[2] + " SPKs";
    if ((match = value.match(/^(.+)\s+·\s+(.+)\s+·\s+Semua Tahun$/i))) {
      var firstLabel = ID[match[1]] || canonicalizePattern(match[1]);
      var secondLabel = ID[match[2]] || canonicalizePattern(match[2]);
      return (EN[firstLabel] || firstLabel) + " · " + (EN[secondLabel] || secondLabel) + " · All Years";
    }
    if ((match = value.match(/^Satuan PPIC berbeda dari satuan hasil sistem \((.+)\)$/i))) return "The PPIC unit differs from the system result unit (" + match[1] + ")";
    var technical = value
      .replace(/\bGULUNGAN\b/g, "ROLL")
      .replace(/\bPESANAN BARU\b/g, "NEW ORDER")
      .replace(/\bPESANAN ULANG\b/g, "REPEAT ORDER")
      .replace(/\bSEGEL BAWAH\b/g, "BOTTOM SEAL")
      .replace(/\bSEGEL SAMPING\b/g, "SIDE SEAL")
      .replace(/\bPEMBELAHAN LEMBARAN\b/g, "SHEET SLITTING")
      .replace(/\bPENCAMPURAN\b/g, "MIXER")
      .replace(/\bPENIUPAN\b/g, "BLOWING")
      .replace(/\bPENCETAKAN\b/g, "PRINTING")
      .replace(/\bPELIPATAN\b/g, "FOLDING")
      .replace(/\bPEMBELAHAN\b/g, "SLITTING")
      .replace(/\bPEMBENTUKAN LIPATAN\b/g, "GUSSETING")
      .replace(/\bPEMOTONGAN\b/g, "CUTTING")
      .replace(/\bKANTONG KAOS\b/g, "T-SHIRT BAG")
      .replace(/\bPEGANGAN\b/g, "HANDLE");
    if (technical !== value) return technical;
    return value;
  }

  function canonicalizePattern(value) {
    return value
      .replace(/\bBOTTOM SEAL\b/g, "SEGEL BAWAH")
      .replace(/\bSIDE SEAL\b/g, "SEGEL SAMPING")
      .replace(/\bSHEET SLITTING\b/g, "PEMBELAHAN LEMBARAN")
      .replace(/\bREPEAT ORDER\b/g, "PESANAN ULANG")
      .replace(/\bNEW ORDER\b/g, "PESANAN BARU")
      .replace(/\bMIXER\b/g, "PENCAMPURAN")
      .replace(/\bBLOWING\b/g, "PENIUPAN")
      .replace(/\bPRINTING\b/g, "PENCETAKAN")
      .replace(/\bFOLDING\b/g, "PELIPATAN")
      .replace(/\bSLITTING\b/g, "PEMBELAHAN")
      .replace(/\bGUSSET\b/g, "PEMBENTUKAN LIPATAN")
      .replace(/\bCUTTING\b/g, "PEMOTONGAN")
      .replace(/\bTSHIRT\b/g, "KANTONG KAOS")
      .replace(/\bHANDLE\b/g, "PEGANGAN")
      .replace(/\bROLL\b/g, "GULUNGAN");
  }

  function translateValue(value, language) {
    var leading = (value.match(/^\s*/) || [""])[0];
    var trailing = (value.match(/\s*$/) || [""])[0];
    var clean = value.trim();
    if (!clean) return value;
    var canonical = ID[clean] || canonicalizePattern(clean);
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

  function bindSwitcherButtons() {
    document.querySelectorAll("[data-spk-language]").forEach(function (button) {
      if (button.dataset.spkLanguageBound === "true") return;
      button.dataset.spkLanguageBound = "true";
      button.addEventListener("click", function () {
        applyLanguage(button.getAttribute("data-spk-language"));
      });
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
    if (document.querySelector(".spk-language-switcher")) {
      bindSwitcherButtons();
      return;
    }
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
        switcher.appendChild(button);
      });

    if (host) {
      host.appendChild(switcher);
    } else {
      printActions.appendChild(switcher);
    }
    bindSwitcherButtons();
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
