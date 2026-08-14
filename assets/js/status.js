/* =====================================================================
   STATUS STANDAR POLYTA GLOBAL MANDIRI
   ---------------------------------------------------------------------
   Menyatukan tampilan seluruh keadaan tidak normal: jaringan terputus,
   data gagal dimuat, pustaka pihak ketiga tidak sampai, dan galat yang
   tidak tertangkap. Berkas ini berpasangan dengan assets/css/status.css.

   Dua hal yang membentuk isi berkas ini:

   1. Ditulis dengan tata bahasa ES5 dan tanpa pustaka apa pun. Berkas
      ini adalah jaring pengaman; kalau ia sendiri gagal dijalankan pada
      peramban lawas atau WebView bawaan perangkat, justru tidak ada
      yang menangkap keadaan gagal tersebut.

   2. Semua tampilannya dibuat dari DOM, bukan dari penanda pada
      halaman. Pita luring yang lama digambar oleh Alpine yang diunduh
      dari CDN, sehingga tepat pada saat jaringan putus pita itu tidak
      pernah muncul. Berkas ini tidak punya ketergantungan tersebut.

   Pembagian tugas antar tampilan:

   - Pita  : keadaan sesaat yang halamannya masih bisa dipakai.
   - Panel : keadaan yang membuat halaman tidak dapat dilanjutkan.
   ===================================================================== */

(function initPolytaStatus() {
  "use strict";

  if (window.PolytaStatus) return;

  var LOGO_SVG =
    '<svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">' +
    '<path d="M14 12h50v43h42v53h-8V63H64v45H14V55h42V20H14z" fill="#111216"/>' +
    '<rect x="15" y="22" width="41" height="12" rx="6" fill="#4563b3"/>' +
    '<rect x="22" y="63" width="34" height="37" fill="#ef2631"/>' +
    '<rect x="84" y="64" width="11" height="44" rx="5.5" fill="#40b84e"/>' +
    "</svg>";

  /**
   * Lambang bervolume untuk layar pemuatan. Kesan timbulnya dibentuk dari
   * tiga lapis: salinan badan yang digeser sebagai sisi tebalnya, muka
   * depan bergradasi diagonal, lalu selaput kilau di atas semuanya. Tiap
   * balok warna diberi gradasi tegak dan segaris cahaya di tepi atas,
   * seperti benda padat yang disinari dari kiri atas.
   *
   * Nama gradasinya diawali pgmMark karena id pada SVG berlaku untuk
   * seluruh dokumen; tanpa awalan itu ia bisa bertabrakan dengan gambar
   * milik halaman yang memuatnya.
   */
  var JEJAK_LAMBANG = "M14 12h50v43h42v53h-8V63H64v45H14V55h42V20H14z";
  var LOGO_3D_SVG =
    '<svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">' +
    "<defs>" +
    '<linearGradient id="pgmMarkBody" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#63676f"/>' +
    '<stop offset=".34" stop-color="#2a2d33"/>' +
    '<stop offset="1" stop-color="#0a0b0d"/>' +
    "</linearGradient>" +
    '<linearGradient id="pgmMarkGloss" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".42"/>' +
    '<stop offset=".42" stop-color="#fff" stop-opacity=".06"/>' +
    '<stop offset=".62" stop-color="#fff" stop-opacity="0"/>' +
    "</linearGradient>" +
    '<linearGradient id="pgmMarkBlue" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#9db4f2"/>' +
    '<stop offset=".45" stop-color="#4563b3"/>' +
    '<stop offset="1" stop-color="#1f3178"/>' +
    "</linearGradient>" +
    '<linearGradient id="pgmMarkRed" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#ff8a90"/>' +
    '<stop offset=".45" stop-color="#ef2631"/>' +
    '<stop offset="1" stop-color="#96101a"/>' +
    "</linearGradient>" +
    '<linearGradient id="pgmMarkGreen" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#8ee79a"/>' +
    '<stop offset=".45" stop-color="#40b84e"/>' +
    '<stop offset="1" stop-color="#1a7a2c"/>' +
    "</linearGradient>" +
    "</defs>" +
    '<path d="' + JEJAK_LAMBANG + '" transform="translate(3 3.6)" fill="#05060a" opacity=".55"/>' +
    '<path d="' + JEJAK_LAMBANG + '" fill="url(#pgmMarkBody)"/>' +
    '<rect x="15" y="22" width="41" height="12" rx="6" fill="url(#pgmMarkBlue)"/>' +
    '<rect x="22" y="63" width="34" height="37" fill="url(#pgmMarkRed)"/>' +
    '<rect x="84" y="64" width="11" height="44" rx="5.5" fill="url(#pgmMarkGreen)"/>' +
    '<rect x="17" y="23.2" width="37" height="2.4" rx="1.2" fill="#fff" opacity=".38"/>' +
    '<rect x="23.4" y="64.2" width="31" height="2.2" fill="#fff" opacity=".26"/>' +
    '<rect x="85.4" y="65.4" width="8.2" height="2.2" rx="1.1" fill="#fff" opacity=".34"/>' +
    '<path d="' + JEJAK_LAMBANG + '" fill="url(#pgmMarkGloss)"/>' +
    "</svg>";

  var BANNER_TEXT_OFFLINE = "Koneksi terputus — menunggu jaringan kembali";
  var BANNER_TEXT_ONLINE = "Koneksi tersambung kembali";
  var BANNER_TEXT_ERROR = "Terjadi kendala — sebagian fitur mungkin tidak berjalan";

  var root = document.documentElement;
  var bannerEl = null;
  var bannerTextEl = null;
  var bannerTimer = null;
  var pageEl = null;
  var pageParts = null;
  var lastFocused = null;

  /* ------------------------------------------------------- pembantu */

  function makeEl(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function whenBodyReady(callback) {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function textOf(value, fallback) {
    var text = value == null ? "" : String(value).trim();
    return text || fallback || "";
  }

  /* ---------------------------------------------------------- pita */

  function ensureBanner() {
    if (bannerEl) return bannerEl;

    bannerEl = makeEl("div", "pgm-status-banner no-print");
    bannerEl.setAttribute("role", "status");
    bannerEl.setAttribute("aria-live", "polite");
    bannerEl.hidden = true;
    bannerEl.appendChild(makeEl("span", "pgm-status-banner-dot"));
    bannerTextEl = makeEl("span", "pgm-status-banner-text");
    bannerEl.appendChild(bannerTextEl);
    document.body.appendChild(bannerEl);
    return bannerEl;
  }

  /**
   * Menampilkan pita status.
   * @param {string} text isi pesan.
   * @param {string} kind "putus", "pulih", atau "kendala".
   * @param {number} autoHideMs 0 berarti menetap sampai ditutup.
   */
  function showBanner(text, kind, autoHideMs) {
    whenBodyReady(function () {
      ensureBanner();
      bannerTextEl.textContent = text;
      bannerEl.setAttribute("data-kind", kind || "putus");
      bannerEl.hidden = false;

      if (bannerTimer) {
        window.clearTimeout(bannerTimer);
        bannerTimer = null;
      }
      if (autoHideMs > 0) {
        bannerTimer = window.setTimeout(hideBanner, autoHideMs);
      }
    });
  }

  function hideBanner() {
    if (bannerTimer) {
      window.clearTimeout(bannerTimer);
      bannerTimer = null;
    }
    if (bannerEl) bannerEl.hidden = true;
  }

  /* --------------------------------------------------------- panel */

  function ensurePage() {
    if (pageEl) return pageEl;

    pageEl = makeEl("div", "pgm-status-page no-print");
    pageEl.setAttribute("role", "alertdialog");
    pageEl.setAttribute("aria-modal", "true");
    pageEl.setAttribute("aria-labelledby", "pgmStatusTitle");
    pageEl.setAttribute("aria-describedby", "pgmStatusMessage");
    pageEl.hidden = true;

    var plate = makeEl("div", "pgm-status-plate");

    var mark = makeEl("div", "pgm-status-mark");
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = LOGO_SVG;
    plate.appendChild(mark);

    plate.appendChild(makeEl("p", "pgm-status-eyebrow", "POLYTA GLOBAL MANDIRI"));

    var title = makeEl("h1", "pgm-status-title");
    title.id = "pgmStatusTitle";
    plate.appendChild(title);

    var message = makeEl("p", "pgm-status-message");
    message.id = "pgmStatusMessage";
    plate.appendChild(message);

    var detail = makeEl("p", "pgm-status-detail");
    detail.hidden = true;
    plate.appendChild(detail);

    var actions = makeEl("div", "pgm-status-actions");
    plate.appendChild(actions);

    var foot = makeEl("p", "pgm-status-foot");
    foot.appendChild(document.createTextNode("Dikembangkan dan dikelola oleh: "));
    foot.appendChild(makeEl("strong", null, "Team POLYTA GLOBAL MANDIRI"));
    plate.appendChild(foot);

    pageEl.appendChild(plate);
    document.body.appendChild(pageEl);

    pageParts = {
      plate: plate,
      title: title,
      message: message,
      detail: detail,
      actions: actions
    };
    return pageEl;
  }

  function buildAction(action, closeAfter) {
    var node;
    if (action.href) {
      node = makeEl("a", "pgm-status-button", action.label);
      node.href = action.href;
      // Halaman aplikasi kerap berada di dalam bingkai; tanpa ini
      // tautan pulihnya hanya mengganti isi bingkai, bukan halamannya.
      node.target = "_top";
    } else {
      node = makeEl("button", "pgm-status-button", action.label);
      node.type = "button";
    }
    if (action.primary) node.className += " is-primary";

    node.addEventListener("click", function (event) {
      if (typeof action.onClick === "function") {
        action.onClick(event);
      }
      if (closeAfter && !action.href) hide();
    });
    return node;
  }

  /**
   * Menampilkan panel status yang menutup halaman.
   * @param {Object} options judul, pesan, keterangan teknis, dan tombol.
   */
  function show(options) {
    var config = options || {};

    whenBodyReady(function () {
      ensurePage();

      pageParts.title.textContent = textOf(config.title, "Terjadi kendala");
      pageParts.message.textContent = textOf(
        config.message,
        "Halaman ini belum dapat dilanjutkan. Silakan coba beberapa saat lagi."
      );

      var detail = textOf(config.detail, "");
      pageParts.detail.textContent = detail;
      pageParts.detail.hidden = !detail;

      while (pageParts.actions.firstChild) {
        pageParts.actions.removeChild(pageParts.actions.firstChild);
      }

      var actions = config.actions;
      if (!actions) {
        actions = [
          {
            label: "Muat ulang halaman",
            primary: true,
            onClick: function () {
              window.location.reload();
            }
          }
        ];
      }
      for (var i = 0; i < actions.length; i++) {
        pageParts.actions.appendChild(buildAction(actions[i], config.closeOnAction !== false));
      }

      lastFocused = document.activeElement;
      pageEl.hidden = false;
      root.classList.add("pgm-status-locked");

      var firstButton = pageParts.actions.firstChild;
      if (firstButton && typeof firstButton.focus === "function") {
        firstButton.focus();
      }
    });
  }

  function hide() {
    if (pageEl) pageEl.hidden = true;
    root.classList.remove("pgm-status-locked");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  /* ------------------------------------------------------ percakapan */

  /**
   * Kotak pesan bergaya baku. Dipakai sendiri oleh halaman, sekaligus
   * menjadi pengganti SweetAlert2 ketika pustaka itu tidak sampai.
   * Bentuk pilihan dan hasilnya sengaja mengikuti SweetAlert2 supaya
   * kode halaman yang sudah ada tidak perlu diubah.
   */
  function dialog(options) {
    var config = options || {};

    return new Promise(function (resolve) {
      var actions = [];

      actions.push({
        label: textOf(config.confirmButtonText, "OK"),
        primary: true,
        onClick: function () {
          resolve({ isConfirmed: true, isDenied: false, isDismissed: false, value: true });
        }
      });

      if (config.showCancelButton) {
        actions.push({
          label: textOf(config.cancelButtonText, "Batal"),
          onClick: function () {
            resolve({ isConfirmed: false, isDenied: false, isDismissed: true, value: null });
          }
        });
      }

      show({
        title: textOf(config.title, "Pemberitahuan"),
        message: textOf(config.text || config.html, ""),
        actions: actions
      });
    });
  }

  /* -------------------------------------------------- layar pemuatan */

  /**
   * Layar pemuatan dengan cincin kemajuan. Kemajuannya tidak dikarang:
   * setiap tonggak nyata dari peramban menaikkan sasarannya, lalu angkanya
   * merayap mendekati sasaran itu tanpa pernah melewatinya. Dengan begitu
   * cincinnya selalu bergerak, tetapi tidak pernah menunjukkan selesai
   * sebelum halamannya benar-benar selesai.
   */
  var KELILING = 2 * Math.PI * 52;
  var BATAS_TUNGGU_MS = 12000;

  var bootEl = null;
  var bootBarEl = null;
  var bootPersenEl = null;
  var bootNilai = 0;
  var bootSasaran = 8;
  var bootTimer = null;
  var bootSelesai = false;

  /**
   * Warna dasar layar pemuatan diambil dari meta theme-color halaman bila
   * ada. Tanpa ini layar pemuatan akan memakai kanvas terang lalu berganti
   * ke halaman Otomasi SPK yang berkanvas gelap, dan kedipannya terlihat
   * jelas. Nilai meta itu memang sudah menyatakan warna dasar halaman.
   */
  function warnaTemaHalaman() {
    var meta = document.querySelector('meta[name="theme-color"]');
    var nilai = meta ? String(meta.getAttribute("content") || "").trim() : "";
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(nilai) ? nilai : "";
  }

  function terangnya(hex) {
    var isi = hex.slice(1);
    if (isi.length === 3) isi = isi[0] + isi[0] + isi[1] + isi[1] + isi[2] + isi[2];
    var angka = parseInt(isi, 16);
    var merah = (angka >> 16) & 255;
    var hijau = (angka >> 8) & 255;
    var biru = angka & 255;
    // Pembobotan terang yang lazim dipakai; cukup untuk memutuskan tulisan
    // gelap atau terang, tanpa perlu perhitungan sRGB penuh.
    return (merah * 0.299 + hijau * 0.587 + biru * 0.114) / 255;
  }

  function buatLayarPemuatan() {
    if (bootEl || bootSelesai) return;

    bootEl = makeEl("div", "pgm-boot no-print");
    bootEl.setAttribute("role", "progressbar");
    bootEl.setAttribute("aria-label", "Memuat aplikasi");
    bootEl.setAttribute("aria-valuemin", "0");
    bootEl.setAttribute("aria-valuemax", "100");
    bootEl.setAttribute("aria-valuenow", "0");

    var ring = makeEl("div", "pgm-boot-ring");
    ring.innerHTML =
      '<svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">' +
      '<circle class="pgm-boot-track" cx="60" cy="60" r="52"></circle>' +
      '<circle class="pgm-boot-bar" cx="60" cy="60" r="52"' +
      ' stroke-dasharray="' + KELILING.toFixed(2) + '"' +
      ' stroke-dashoffset="' + KELILING.toFixed(2) + '"></circle>' +
      "</svg>";

    var mark = makeEl("div", "pgm-boot-mark");
    mark.setAttribute("aria-hidden", "true");
    var ayun = makeEl("span", "pgm-boot-mark-ayun");
    ayun.innerHTML = LOGO_3D_SVG;
    mark.appendChild(ayun);
    ring.appendChild(mark);

    bootEl.appendChild(ring);

    var copy = makeEl("div", "pgm-boot-copy");
    copy.appendChild(makeEl("p", "pgm-boot-text", "waiting for me"));
    bootPersenEl = makeEl("p", "pgm-boot-persen", "0%");
    copy.appendChild(bootPersenEl);
    bootEl.appendChild(copy);

    var tema = warnaTemaHalaman();
    if (tema) {
      bootEl.style.background = tema;
      if (terangnya(tema) < 0.45) {
        bootEl.style.setProperty("--pgm-status-ink", "#f6f6f8");
        bootEl.style.setProperty("--pgm-status-ink-mute", "rgba(246,246,248,.62)");
        bootEl.style.setProperty("--pgm-status-panel-edge", "rgba(255,255,255,.24)");
      }
    }

    // Ditempelkan ke elemen html karena berkas ini berjalan di dalam
    // <head>, saat <body> belum ada. Begitu body terbentuk, layarnya
    // dipindahkan ke sana supaya susunannya kembali wajar.
    (document.body || root).appendChild(bootEl);
    bootBarEl = bootEl.querySelector(".pgm-boot-bar");

    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () {
        if (bootEl && bootEl.parentNode !== document.body && document.body) {
          document.body.appendChild(bootEl);
        }
      });
    }
  }

  function gambarKemajuan() {
    if (!bootEl) return;
    var persen = Math.max(0, Math.min(100, bootNilai));
    if (bootBarEl) {
      bootBarEl.setAttribute("stroke-dashoffset", (KELILING * (1 - persen / 100)).toFixed(2));
    }
    if (bootPersenEl) bootPersenEl.textContent = Math.round(persen) + "%";
    bootEl.setAttribute("aria-valuenow", String(Math.round(persen)));
  }

  function detakKemajuan() {
    if (bootSelesai) return;
    // Merayap sepertiga dari sisa jarak ke sasaran. Geraknya cepat di awal
    // lalu melambat, dan tidak pernah menyentuh sasaran sebelum tonggak
    // berikutnya menaikkannya.
    bootNilai += (bootSasaran - bootNilai) / 3;
    gambarKemajuan();
  }

  function naikkanSasaran(nilai) {
    if (nilai > bootSasaran) bootSasaran = nilai;
  }

  function mulaiPemuatan() {
    buatLayarPemuatan();
    gambarKemajuan();
    bootTimer = window.setInterval(detakKemajuan, 220);

    // Pengaman: bila satu permintaan menggantung dan peristiwa load tidak
    // pernah tiba, layar ini tetap dilepas supaya halaman yang sudah
    // terbentuk bisa dipakai.
    window.setTimeout(selesaikanPemuatan, BATAS_TUNGGU_MS);
  }

  function selesaikanPemuatan() {
    if (bootSelesai) return;
    bootSelesai = true;

    if (bootTimer) {
      window.clearInterval(bootTimer);
      bootTimer = null;
    }
    if (!bootEl) return;

    bootNilai = 100;
    gambarKemajuan();

    // Cincinnya dibiarkan penuh sesaat sebelum memudar, supaya lompatan ke
    // 100% sempat terlihat dan tidak terasa terpotong.
    window.setTimeout(function () {
      if (!bootEl) return;
      bootEl.className += " is-selesai";
      window.setTimeout(function () {
        if (bootEl && bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
        bootEl = null;
      }, 360);
    }, 260);
  }

  document.addEventListener("readystatechange", function () {
    if (document.readyState === "interactive") naikkanSasaran(68);
    if (document.readyState === "complete") naikkanSasaran(96);
  });

  document.addEventListener("DOMContentLoaded", function () {
    naikkanSasaran(78);
  });

  /* --------------------------------------------------------- jaringan */

  function applyConnection(online) {
    root.setAttribute("data-connection", online ? "online" : "offline");

    if (!online) {
      showBanner(BANNER_TEXT_OFFLINE, "putus", 0);
      return;
    }
    // Pita pulih hanya ditampilkan bila sebelumnya memang sempat putus.
    if (bannerEl && !bannerEl.hidden && bannerEl.getAttribute("data-kind") === "putus") {
      showBanner(BANNER_TEXT_ONLINE, "pulih", 3200);
      return;
    }
    hideBanner();
  }

  /* ------------------------------------------------- pustaka luar */

  /**
   * Alpine hanya dipakai untuk menyembunyikan dan menampilkan elemen
   * lewat x-cloak. Bila ia tidak sampai, elemen bertanda x-cloak akan
   * tersembunyi selamanya karena atributnya tidak pernah dilepas.
   * Di sini atribut tersebut dilepas sendiri agar halamannya utuh.
   */
  function recoverFromMissingAlpine() {
    if (window.Alpine) return;

    root.setAttribute("data-pgm-alpine", "gagal");

    var cloaked = document.querySelectorAll("[x-cloak]");
    for (var i = 0; i < cloaked.length; i++) {
      // Pita luring bawaan halaman digantikan oleh pita berkas ini,
      // jadi ia dibiarkan tersembunyi supaya tidak tampil dobel.
      if (cloaked[i].getAttribute("x-show") === "!online") continue;
      cloaked[i].removeAttribute("x-cloak");
    }
  }

  /**
   * SweetAlert2 dipakai untuk hampir seluruh pesan pada Otomasi SPK.
   * Bila pustakanya tidak sampai, setiap pemanggilan Swal.fire akan
   * menggagalkan alur yang sedang berjalan. Pengganti ini memakai panel
   * baku sehingga pesannya tetap tersampaikan dengan rupa yang sama.
   */
  function recoverFromMissingSwal() {
    if (window.Swal) return;

    root.setAttribute("data-pgm-swal", "gagal");
    window.Swal = {
      fire: dialog,
      close: hide,
      isVisible: function () {
        return Boolean(pageEl) && !pageEl.hidden;
      }
    };
  }

  function checkExternalLibraries() {
    recoverFromMissingAlpine();
    recoverFromMissingSwal();
  }

  /* ----------------------------------------------------- galat umum */

  function describeError(error) {
    if (!error) return "";
    if (typeof error === "string") return error;
    if (error.message) return String(error.message);
    return "";
  }

  /**
   * Galat yang tidak tertangkap selalu dilaporkan lewat pita, tidak
   * pernah lewat panel yang menutup halaman. Satu galat kecil pada
   * bagian yang tidak dipakai tidak boleh menghentikan pekerjaan yang
   * sedang berjalan, dan menutup halaman yang sebenarnya masih berjalan
   * justru merugikan. Panel disediakan untuk halaman yang memang tahu
   * dirinya gagal, lewat PolytaStatus.loadFailed.
   */
  function reportError(error) {
    var detail = describeError(error);
    if (detail && window.console && window.console.error) {
      window.console.error("[PolytaStatus]", detail);
    }
    showBanner(BANNER_TEXT_ERROR, "kendala", 7000);
  }

  /* ---------------------------------------------------------- rakit */

  window.addEventListener("online", function () {
    applyConnection(true);
  });
  window.addEventListener("offline", function () {
    applyConnection(false);
  });

  window.addEventListener("error", function (event) {
    // Galat pemuatan berkas tidak punya properti error dan sasarannya
    // berupa elemen; keduanya ditangani terpisah supaya kegagalan satu
    // ikon tidak dianggap sebagai kegagalan halaman.
    if (event && event.target && event.target !== window && event.target.tagName) {
      root.setAttribute("data-pgm-aset", "gagal");
      return;
    }
    reportError(event ? event.error || event.message : null);
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    reportError(event ? event.reason : null);
  });

  window.addEventListener("load", function () {
    checkExternalLibraries();
    selesaikanPemuatan();
  });

  mulaiPemuatan();

  // Jaring kedua: bila peristiwa load tidak pernah tiba karena satu
  // permintaan menggantung, pustaka luar tetap diperiksa agar
  // penggantinya siap sebelum pengguna menekan apa pun.
  window.setTimeout(checkExternalLibraries, 6000);

  whenBodyReady(function () {
    applyConnection(navigator.onLine !== false);
  });

  window.PolytaStatus = {
    show: show,
    hide: hide,
    dialog: dialog,
    banner: showBanner,
    hideBanner: hideBanner,
    /** Melepas layar pemuatan lebih awal, dipakai halaman yang sudah siap
     *  sebelum seluruh berkas pelengkapnya selesai diunduh. */
    doneLoading: selesaikanPemuatan,
    isOnline: function () {
      return navigator.onLine !== false;
    },
    /**
     * Jalan pintas untuk kegagalan pemuatan data, dipakai halaman pada
     * penangan kegagalan pemanggilan server.
     */
    loadFailed: function (message, detail, onRetry) {
      var actions = [];
      if (typeof onRetry === "function") {
        actions.push({ label: "Coba lagi", primary: true, onClick: onRetry });
      } else {
        actions.push({
          label: "Muat ulang halaman",
          primary: true,
          onClick: function () {
            window.location.reload();
          }
        });
      }
      actions.push({ label: "Kembali ke portal", href: "/" });

      show({
        title: navigator.onLine === false ? "Tidak ada koneksi" : "Data belum dapat dimuat",
        message: textOf(
          message,
          navigator.onLine === false
            ? "Perangkat sedang tidak tersambung ke jaringan. Data akan dimuat kembali setelah koneksi pulih."
            : "Data tidak dapat diambil dari server. Periksa koneksi Internet, lalu coba lagi."
        ),
        detail: detail,
        actions: actions
      });
    }
  };
})();
