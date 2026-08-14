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

  window.addEventListener("load", checkExternalLibraries);

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
