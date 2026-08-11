/* =====================================================================
   POLYTA GLOBAL MANDIRI — Runtime
   Merender chrome (topbar/footer) + konten halaman dari data.js,
   menangani tema, pencarian, pin favorit, aksesibilitas, dan animasi.
   Tanpa dependensi eksternal — berjalan langsung dari file:// .
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------- Utilitas */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Konten data.js sudah memuat entitas HTML yang disengaja (mis. &amp;) */
  function raw(s) { return s == null ? "" : String(s); }

  /* ------------------------------------------------------------ Rute
     Situs berbasis folder agar alamatnya bersih: /marketing/ bukan
     /marketing.html. Beranda berada di akar, halaman lain satu tingkat
     di bawahnya, sehingga awalan berbeda per halaman.

     Saat dibuka langsung dari file:// (klik ganda, tanpa server), peramban
     tidak mengenal index.html implisit — jadi nama berkasnya ditambahkan.
     Di GitHub Pages hal itu tidak diperlukan dan alamat tetap rapi. */
  var scripts = document.getElementsByTagName('script');
  var ROOT = "./";
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].getAttribute('src');
    if (src && src.indexOf('assets/js/app.js') !== -1) {
      ROOT = src.split('assets/js/app.js')[0];
      break;
    }
  }
  var IS_FILE = location.protocol === "file:";

  function link(path) {
    var p = ROOT + (path || "");
    return IS_FILE ? p + (p.slice(-1) === "/" ? "index.html" : "/index.html") : p;
  }

  /* Berkas aset dirujuk apa adanya — tanpa penambahan index.html */
  function asset(path) { return ROOT + path; }

  function managedUrl(path) {
    var value = String(path || "").trim();
    if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/i.test(value)) return value;
    return link(value);
  }

  function managedImage(path) {
    var value = String(path || "").trim();
    if (/^(?:https?:|data:|blob:|\/)/i.test(value)) return value;
    return asset(value);
  }

  var LOGO = "assets/img/logo-polyta.png";

  var store = {
    get: function (k, fb) {
      try { var v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }
      catch (e) { return fb; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* mode privat */ }
    }
  };

  /* ------------------------------------------------------------- Ikon */
  var ICON = {
    sheets:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 9v12M16 9v12"/></svg>',
    drive:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2.4h8.8A1.5 1.5 0 0 1 21 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>',
    onedrive:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M6.6 18.5A3.6 3.6 0 0 1 6 11.4a5.1 5.1 0 0 1 9.6-1.6 3.9 3.9 0 0 1 .8 8.7z"/></svg>',
    form:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/></svg>',
    script:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/></svg>',
    slides:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8.5 20h7"/></svg>',
    site:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4v5h-5"/></svg>',
    folder:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2.4h8.8A1.5 1.5 0 0 1 21 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></svg>',

    /* ------------------------------------------------------------------
       Glif makna — dipilih menurut nama tautan, bukan menurut sumbernya.
       Warna plat tetap mengikuti `type`, sehingga satu keping menyampaikan
       dua hal sekaligus: apa isinya, dan di layanan mana ia tersimpan.
       ------------------------------------------------------------------ */
    person:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20.2a6.5 6.5 0 0 1 13 0"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="9.2" cy="8.4" r="3"/><path d="M3.4 19.8a5.8 5.8 0 0 1 11.6 0"/>' +
      '<path d="M16.4 6.2a3 3 0 0 1 0 5.8M17.6 14.4a5.4 5.4 0 0 1 3 4.6"/></svg>',
    chart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 4v16h16"/><path d="M8 16.5v-4M12.4 16.5V8M16.8 16.5v-6"/></svg>',
    gauge:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3.6 17.5a8.6 8.6 0 1 1 16.8 0"/><path d="m12 17.5 3.9-5.6"/></svg>',
    up:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m3.8 17 5.6-5.6 3.4 3.4L20 7.6"/><path d="M14.6 7.6H20v5.4"/></svg>',
    down:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m3.8 7.6 5.6 5.6 3.4-3.4L20 17"/><path d="M14.6 17H20v-5.4"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3.4" y="5" width="17.2" height="15.4" rx="2.2"/><path d="M3.4 10h17.2M8 3.4v3.2M16 3.4v3.2"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.8v5.5l3.6 2.1"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2.4 6.6h10.8v10H2.4z"/><path d="M13.2 10.2h3.6l3.2 3.2v3.2h-6.8"/>' +
      '<circle cx="6.6" cy="18.4" r="1.7"/><circle cx="16.6" cy="18.4" r="1.7"/></svg>',
    car:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 16v-2.4l1.9-4.6a2 2 0 0 1 1.9-1.2h10.4a2 2 0 0 1 1.9 1.2L21 13.6V16z"/>' +
      '<path d="M3 16v2.2M21 16v2.2M6.6 12.6h10.8"/><circle cx="7.4" cy="16" r="1.4"/><circle cx="16.6" cy="16" r="1.4"/></svg>',
    road:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M7.6 3.4 5 20.6M16.4 3.4l2.6 17.2"/><path d="M12 4.4v3M12 10.5v3M12 16.6v3"/></svg>',
    badge:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="9.4" r="5.2"/><path d="m8.4 13.6-1 7 4.6-2.5 4.6 2.5-1-7"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.2 19 6v6c0 4.3-3 7.2-7 8.9-4-1.7-7-4.6-7-8.9V6z"/><path d="m9.2 11.9 2 2 3.6-3.9"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="8.6"/><path d="m8.3 12.2 2.6 2.6 4.8-5.2"/></svg>',
    target:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1"/></svg>',
    box:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.2 20.2 7v10L12 20.8 3.8 17V7z"/><path d="m3.8 7 8.2 3.8L20.2 7M12 10.8v10"/></svg>',
    warehouse:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3.4 20.4V9.4L12 4.6l8.6 4.8v11"/><path d="M8 20.4v-6.2h8v6.2M8 17h8"/></svg>',
    cylinder:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="12" cy="6" rx="6.4" ry="2.6"/><path d="M5.6 6v12c0 1.4 2.9 2.6 6.4 2.6s6.4-1.2 6.4-2.6V6"/></svg>',
    database:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="12" cy="5.8" rx="6.8" ry="2.8"/><path d="M5.2 5.8v12.4c0 1.5 3 2.8 6.8 2.8s6.8-1.3 6.8-2.8V5.8"/>' +
      '<path d="M5.2 12c0 1.5 3 2.8 6.8 2.8s6.8-1.3 6.8-2.8"/></svg>',
    wallet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="5.8" width="18" height="13" rx="2.6"/><path d="M3 10.4h18M16.6 14.6h2"/></svg>',
    coins:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="12" cy="6.4" rx="6.8" ry="2.8"/><path d="M5.2 6.4v5c0 1.6 3 2.8 6.8 2.8s6.8-1.2 6.8-2.8v-5"/>' +
      '<path d="M5.2 11.4v5c0 1.6 3 2.8 6.8 2.8s6.8-1.2 6.8-2.8v-5"/></svg>',
    receipt:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5.8 3.4h12.4v17.2l-2.5-1.6-2.5 1.6-2.6-1.6-2.3 1.6-2.5-1.6z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/></svg>',
    tag:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M11.4 3.4H20v8.6l-8.6 8.6a1.7 1.7 0 0 1-2.4 0l-6.2-6.2a1.7 1.7 0 0 1 0-2.4z"/>' +
      '<circle cx="16.2" cy="7.6" r="1.4"/></svg>',
    scale:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 4.4v16M6.6 20.4h10.8M4.6 8.6h14.8"/>' +
      '<path d="M4.6 8.6 2.4 13.4a2.5 2.5 0 0 0 4.4 0z"/><path d="m19.4 8.6-2.2 4.8a2.5 2.5 0 0 0 4.4 0z"/></svg>',
    cart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2.6 4h2.6l2.6 11h10.6l2-7.6H6.2"/><circle cx="9.4" cy="19" r="1.6"/><circle cx="17.4" cy="19" r="1.6"/></svg>',
    clip:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M19.8 11.4 12 19.2a5 5 0 0 1-7.1-7.1l8.4-8.4a3.3 3.3 0 1 1 4.7 4.7l-8.3 8.4a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6"/></svg>',
    list:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M8.4 6.4h11.4M8.4 12h11.4M8.4 17.6h8"/><circle cx="4.4" cy="6.4" r="1.1"/>' +
      '<circle cx="4.4" cy="12" r="1.1"/><circle cx="4.4" cy="17.6" r="1.1"/></svg>',
    doc:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M6 3.4h7.6L19 8.8v11.8H6z"/><path d="M13.6 3.4v5.4H19"/><path d="M9 13h7M9 16.6h4.6"/></svg>',
    clipboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="5" y="4.6" width="14" height="16" rx="2.2"/><path d="M9.2 4.6V3.2h5.6v1.4"/><path d="M9 10.4h6M9 14.4h4"/></svg>',
    archive:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="4" width="18" height="4.6" rx="1.6"/><path d="M5 8.6v10.2a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6V8.6"/>' +
      '<path d="M10 12.4h4"/></svg>',
    layers:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m12 3.4 8.6 4.3L12 12 3.4 7.7z"/><path d="m3.4 12.2 8.6 4.3 8.6-4.3M3.4 16.5l8.6 4.3 8.6-4.3"/></svg>',
    share:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="17.4" cy="5.8" r="2.6"/><circle cx="6.4" cy="12" r="2.6"/><circle cx="17.4" cy="18.2" r="2.6"/>' +
      '<path d="m8.8 10.7 6.2-3.4M8.8 13.3l6.2 3.4"/></svg>',
    gear:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="3.7"/>' +
      '<path d="M12 4.3v2M12 17.7v2M4.3 12h2M17.7 12h2M6.6 6.6l1.5 1.5M15.9 15.9l1.5 1.5M17.4 6.6l-1.5 1.5M8.1 15.9l-1.5 1.5"/></svg>',
    /* Mur segi enam — terbaca jauh lebih jelas daripada roda gigi pada 19px */
    nut:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.2 19.6 7.6v8.8L12 20.8 4.4 16.4V7.6z"/><circle cx="12" cy="12" r="3.1"/></svg>',
    wrench:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M15.6 5.2a4.7 4.7 0 0 0-6.2 6.2l-5.6 5.6a2 2 0 0 0 2.8 2.8l5.6-5.6a4.7 4.7 0 0 0 6.2-6.2l-2.9 2.9-2.6-.7-.7-2.6z"/></svg>',
    bolt:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M13.4 2.6 4.6 13.6h5.8l-.6 7.8 8.8-11h-5.8z"/></svg>',
    factory:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 20.4V11l5.4 3.3V11l5.4 3.3V7.4l7.2 3.6v9.4z"/><path d="M3 20.4h18"/></svg>',
    camera:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3.4 8.6h3.2l1.6-2.4h7.6l1.6 2.4h3.2v11H3.4z"/><circle cx="12" cy="13.8" r="3.5"/></svg>',
    printer:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M7 9V3.6h10V9"/><rect x="3.4" y="9" width="17.2" height="7" rx="2.2"/><path d="M7 13.4h10v7H7z"/></svg>',
    wind:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3.4 8.4h9.8a2.9 2.9 0 1 0-2.9-2.9"/><path d="M3.4 12.4h13.4a2.9 2.9 0 1 1-2.9 2.9"/><path d="M3.4 16.6h6"/></svg>',
    fold:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3.6 12h16.8"/><path d="m8.4 7.6-4.4 4.4 4.4 4.4M15.6 7.6l4.4 4.4-4.4 4.4"/></svg>',
    slit:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3v18"/><path d="M6.2 6.4v11.2M17.8 6.4v11.2"/></svg>',
    scissors:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="6.4" cy="6.4" r="2.4"/><circle cx="6.4" cy="17.6" r="2.4"/><path d="M8.5 7.6 20 18M20 6 8.5 16.4"/></svg>',
    droplet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.4c3.3 3.7 5.5 6.4 5.5 9.2a5.5 5.5 0 0 1-11 0c0-2.8 2.2-5.5 5.5-9.2z"/></svg>',
    flask:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 3.6v5.2L4.9 18a2 2 0 0 0 1.7 3h10.8a2 2 0 0 0 1.7-3L14 8.8V3.6"/><path d="M9 3.6h6M7.6 14.4h8.8"/></svg>',
    chip:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="7" y="7" width="10" height="10" rx="2"/>' +
      '<path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/></svg>',
    sliders:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 6.4h16M4 12h16M4 17.6h16"/><circle cx="9" cy="6.4" r="2"/><circle cx="15.4" cy="12" r="2"/><circle cx="10.6" cy="17.6" r="2"/></svg>',
    download:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.4v11.2M7.8 10.6 12 14.8l4.2-4.2"/><path d="M4.4 18v2.6h15.2V18"/></svg>',
    book:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 4.4h6a2.6 2.6 0 0 1 2 2.6v13a2.2 2.2 0 0 0-2-1.6H4z"/>' +
      '<path d="M20 4.4h-6a2.6 2.6 0 0 0-2 2.6v13a2.2 2.2 0 0 1 2-1.6h6z"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 17.5V22"/><path d="M9 2h6l-1 6 3 3v2H7v-2l3-3z"/></svg>',
    pinOn:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">' +
      '<path d="M12 17.5V22" stroke-linecap="round"/><path d="M9 2h6l-1 6 3 3v2H7v-2l3-3z"/></svg>',
    warn:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.6 22 20H2z"/><path d="M12 10v4.2M12 17.2h.01"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    sun:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5"/></svg>',
    menu:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
      '<path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    top:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 19V6M6 12l6-6 6 6"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  var TYPE_LABEL = {
    sheets: "Lembar Kerja", drive: "Google Drive", onedrive: "OneDrive",
    form: "Formulir", script: "Aplikasi Daring", slides: "Presentasi",
    site: "Laman", folder: "Direktori"
  };

  /* ------------------------------------------------------------ Tema */
  var THEME_KEY = "pgm:theme";

  function applyTheme(t) {
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }

  function currentTheme() {
    var s = document.documentElement.getAttribute("data-theme");
    if (s) return s;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* Hormati atribut yang sudah dipasang skrip anti-kedip di <head>;
     hanya timpa bila ada pilihan tersimpan. */
  (function () {
    var saved = store.get(THEME_KEY, null);
    if (saved) applyTheme(saved);
  })();

  /* ------------------------------------------------------------ Toast */
  var toastWrap;
  function toast(msg, icon) {
    if (!toastWrap) {
      toastWrap = el("div", "toast-wrap");
      toastWrap.setAttribute("aria-live", "polite");
      toastWrap.setAttribute("aria-atomic", "false");
      document.body.appendChild(toastWrap);
    }
    var t = el("div", "toast", (icon || ICON.warn) + "<span>" + esc(msg) + "</span>");
    t.setAttribute("role", "status");
    toastWrap.appendChild(t);
    setTimeout(function () {
      t.classList.add("is-out");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 2600);
  }

  /* ------------------------------------------------------------- Pin */
  var PIN_KEY = "pgm:pins";
  function pins() { return store.get(PIN_KEY, []); }
  function pinId(pageId, label) { return pageId + "::" + label; }
  function isPinned(id) { return pins().indexOf(id) !== -1; }
  function togglePin(id) {
    var list = pins(), i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    store.set(PIN_KEY, list);
    return i === -1;
  }

  /* --------------------------------------------------- Statistik data */
  function pageItems(pageId) {
    var p = SITE.pages[pageId];
    if (!p || !p.sections) return [];
    var out = [];
    p.sections.forEach(function (s) {
      s.items.forEach(function (it) { out.push({ item: it, section: s.title, page: pageId }); });
    });
    return out;
  }

  function allItems() {
    var out = [];
    SITE.nav.forEach(function (n) {
      if (n.id === "beranda") return;
      pageItems(n.id).forEach(function (r) { out.push(r); });
    });
    return out;
  }

  /* ---------------------------------------------------------- Chrome */
  function buildTopbar(active) {
    var bar = el("header", "topbar");
    var inner = el("div", "wrap topbar__in");

    var brand = el("a", "brand");
    brand.href = link("");
    brand.innerHTML =
      '<span class="brand__plate"><img src="' + asset(LOGO) + '" alt="" width="438" height="438"></span>' +
      '<span class="brand__txt">' +
        '<span class="brand__name">' + raw(SITE.name) + "</span>" +
        '<span class="brand__sub">Portal Akses Internal</span>' +
      "</span>";
    inner.appendChild(brand);

    var nav = el("nav", "nav");
    nav.setAttribute("aria-label", "Navigasi utama");
    var ul = el("ul", "nav__list");
    SITE.nav.forEach(function (n) {
      var li = el("li");
      var a = el("a", "nav__link" + (n.id === active ? " is-active" : ""), raw(n.label));
      a.href = link(n.path);
      if (n.id === active) a.setAttribute("aria-current", "page");
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);

    var tools = el("div", "tools");

    var sw = el("button", "switch");
    sw.type = "button";
    sw.setAttribute("aria-label", "Ganti mode terang / gelap");
    sw.innerHTML = '<span class="switch__led"></span><span class="switch__knob">' +
      (currentTheme() === "dark" ? ICON.moon : ICON.sun) + "</span>";
    sw.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      store.set(THEME_KEY, next);
      $(".switch__knob", sw).innerHTML = next === "dark" ? ICON.moon : ICON.sun;
    });
    tools.appendChild(sw);

    var menuBtn = el("button", "iconbtn nav-toggle", ICON.menu);
    menuBtn.type = "button";
    menuBtn.setAttribute("aria-label", "Buka menu");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    tools.appendChild(menuBtn);

    inner.appendChild(nav);
    inner.appendChild(tools);
    bar.appendChild(inner);

    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
        nav.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    return bar;
  }

  function buildFooter() {
    var f = el("footer", "foot");
    f.innerHTML =
      '<div class="wrap foot__in">' +
        '<span class="foot__text">' + raw(SITE.footer) + "</span>" +
      "</div>";
    return f;
  }

  /* --------------------------------------------------- Kepala halaman
     Ringkas dan langsung di atas substrat — remah jejak, judul, dan
     keping angka dalam satu baris. Menggantikan panel hero besar yang
     mendorong konten jauh ke bawah di setiap halaman. */
  function buildPageHead(pageId) {
    var p = SITE.pages[pageId];
    var isHome = pageId === "beranda";
    var items = isHome ? allItems() : pageItems(pageId);
    var secCount = isHome ? SITE.pages.beranda.departments.length : (p.sections ? p.sections.length : 0);

    var crumb =
      '<nav class="crumb" aria-label="Remah jejak"><i class="dot-led"></i>' +
      (isHome
        ? '<span class="crumb__now">' + raw(SITE.name) + "</span>"
        : '<a href="' + link("") + '">Beranda</a>' +
          '<span class="crumb__sep">/</span>' +
          '<span class="crumb__now">' + raw(p.title) + "</span>") +
      "</nav>";

    var chips =
      '<div class="chips">' +
        chip(secCount, isHome ? "Departemen" : "Seksi") +
        chip(items.length, "Tautan") +
        chip(pins().length, "Disematkan") +
      "</div>";

    var sec = el("section", "pagehead");
    var wrap = el("div", "wrap");
    var head = el("div", "pagehead__in reveal");
    head.innerHTML =
      '<div class="pagehead__id">' +
        crumb +
        '<h1 class="pagehead__title engrave">' + raw(p.heading) + "</h1>" +
        (isHome ? '<p class="pagehead__sub">' + raw(p.lead) + "</p>" : "") +
      "</div>" +
      chips;
    wrap.appendChild(head);
    sec.appendChild(wrap);
    return sec;
  }

  function chip(num, label) {
    return '<span class="chip"><b>' + String(num).padStart(2, "0") + "</b>" + esc(label) + "</span>";
  }

  /* ---------------------------------------- Strip peringatan (tertutup) */
  var NOTICE_KEY = "pgm:notice-hidden";

  function buildNotice() {
    if (store.get(NOTICE_KEY, false)) return null;

    var wrap = el("div", "wrap");
    var box = el("div", "notice reveal");
    box.innerHTML =
      ICON.warn.replace("<svg", '<svg class="notice__icon"') +
      '<span class="notice__txt">' + raw(SITE.notice) + "</span>";

    var close = el("button", "notice__close", ICON.close);
    close.type = "button";
    close.setAttribute("aria-label", "Tutup pemberitahuan");
    close.addEventListener("click", function () {
      store.set(NOTICE_KEY, true);
      box.parentNode.removeChild(box);
      toast("Pemberitahuan disembunyikan di perangkat ini");
    });
    box.appendChild(close);

    wrap.appendChild(box);
    return wrap;
  }

  /* ---------------------------------------------------- Konsol cari */
  function buildConsole(scopeLabel) {
    var wrap = el("div", "wrap");
    var box = el("div", "console reveal");
    /* Pintasan "/" tetap berfungsi, tetapi tidak lagi ditampilkan sebagai
       lencana di dalam kolom. Petunjuknya dipindah ke atribut title agar
       tetap dapat ditemukan tanpa mengotori tampilan. */
    box.innerHTML =
      '<label class="field">' +
        ICON.search +
        '<input type="search" id="q" autocomplete="off"' +
        ' placeholder="Cari ' + esc(scopeLabel) + '&hellip;"' +
        ' aria-label="Cari tautan" title="Tekan / untuk melompat ke kolom pencarian">' +
      "</label>" +
      '<span class="console__count" id="qcount"></span>';
    wrap.appendChild(box);
    return wrap;
  }

  /* ------------------------------------------------------------ Tile */
  function paintPinButton(button, on, label) {
    button.classList.toggle("is-on", on);
    button.innerHTML = on ? ICON.pinOn : ICON.pin;
    button.setAttribute("aria-label", (on ? "Lepaskan " : "Sematkan ") + String(label) +
      (on ? " dari Akses Cepat" : " ke Akses Cepat"));
    button.setAttribute("aria-pressed", String(on));
  }

  function buildTile(pageId, item) {
    var type = item.type || "folder";
    var id = pinId(pageId, item.label);
    var isRefresh = item.url === "#refresh";
    var hasUrl = !!item.url && !isRefresh;

    var a = el("a", "tile t-" + type + (hasUrl || isRefresh ? "" : " is-unset"));
    a.href = hasUrl ? item.url : "#";
    a.dataset.label = String(item.label).toLowerCase();
    a.dataset.pin = id;
    if (hasUrl && /^https?:/i.test(item.url)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    a.innerHTML =
      '<span class="tile__icon">' + (ICON[item.icon] || ICON[type] || ICON.folder) + "</span>" +
      '<span class="tile__body">' +
        '<span class="tile__label">' + raw(item.label) + "</span>" +
        '<span class="tile__meta">' +
          (isRefresh ? "Muat ulang halaman" : hasUrl ? esc(TYPE_LABEL[type] || "Tautan") : "URL belum diatur") +
        "</span>" +
      "</span>";

    var pin = el("button", "tile__pin");
    pin.type = "button";
    paintPinButton(pin, isPinned(id), item.label);
    pin.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = togglePin(id);
      toast(on ? "Disematkan ke Akses Cepat" : "Sematan dilepas", on ? ICON.pinOn : ICON.pin);
      syncPinnedUI();
    });
    a.appendChild(pin);

    if (isRefresh) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        location.reload();
      });
    } else if (!hasUrl) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Tautan “" + item.label + "” belum diatur di assets/js/data.js");
      });
    }
    return a;
  }

  function syncPinnedStat() {
    $$(".chip").forEach(function (c) {
      if (c.textContent.indexOf("Disematkan") !== -1) {
        $("b", c).textContent = String(pins().length).padStart(2, "0");
      }
    });
  }

  function syncPinButtons() {
    $$('[data-pin]').forEach(function (tile) {
      var button = $(".tile__pin", tile);
      var label = $(".tile__label", tile);
      if (button) paintPinButton(button, isPinned(tile.dataset.pin), label ? label.textContent : "tautan");
    });
  }

  /* ---------------------------------------------------------- Seksi */
  function buildSection(pageId, section) {
    var s = el("section", "section reveal");
    s.innerHTML =
      '<div class="section__head">' +
        '<h2 class="section__title engrave">' + raw(section.title) + "</h2>" +
        (section.hint ? '<span class="section__hint">' + raw(section.hint) + "</span>" : "") +
        '<span class="section__badge">' + section.items.length + " item</span>" +
      "</div>";
    var g = el("div", "grid");
    section.items.forEach(function (it) { g.appendChild(buildTile(pageId, it)); });
    s.appendChild(g);
    return s;
  }

  function buildPinnedSection(live) {
    var pinned = [];
    allItems().forEach(function (r) {
      if (isPinned(pinId(r.page, r.item.label))) pinned.push(r);
    });
    if (!pinned.length) return null;

    var s = el("section", "section reveal section--pinned" + (live ? " is-in is-live" : ""));
    s.setAttribute("data-pinned-section", "");
    s.innerHTML =
      '<div class="section__head">' +
        '<h2 class="section__title engrave">Akses Cepat</h2>' +
        '<span class="section__hint">Tautan yang Anda sematkan &mdash; tersimpan di perangkat ini</span>' +
        '<span class="section__badge">' + pinned.length + " item</span>" +
      "</div>";
    var g = el("div", "grid");
    pinned.forEach(function (r) { g.appendChild(buildTile(r.page, r.item)); });
    s.appendChild(g);
    return s;
  }

  function syncPinnedUI() {
    syncPinButtons();
    syncPinnedStat();

    var home = $("[data-home-wrap]");
    if (home) {
      var current = $("[data-pinned-section]", home);
      var next = buildPinnedSection(true);
      if (current && next) home.replaceChild(next, current);
      else if (current) current.remove();
      else if (next) home.insertBefore(next, home.firstChild);
    }

    var search = $("#q");
    if (search) search.dispatchEvent(new Event("input"));
  }

  /* ------------------------------------------------- Beranda: konten */
  function buildHome(main) {
    var wrap = el("div", "wrap");
    wrap.setAttribute("data-home-wrap", "");

    /* Akses cepat (pin) */
    var pinnedSection = buildPinnedSection(false);
    if (pinnedSection) wrap.appendChild(pinnedSection);

    /* Departemen */
    var sec = el("section", "section reveal");
    sec.innerHTML =
      '<div class="section__head">' +
        '<h2 class="section__title engrave">Direktori Departemen</h2>' +
        '<span class="section__hint">Pilih departemen untuk melihat daftar direktori dan berkas</span>' +
      "</div>";
    var grid = el("div", "grid grid--dept");
    SITE.pages.beranda.departments.forEach(function (d) {
      var n = pageItems(d.id).length;
      var deptClass = String(d.id || "custom").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
      var a = el("a", "dept dept--" + deptClass);
      a.href = managedUrl(d.path);
      a.dataset.label = String(d.label).toLowerCase() + " " + String(d.desc).toLowerCase();
      var count = el("span", "dept__count", n + " tautan");
      if (d.image) {
        var visual = el("span", "dept__visual");
        var image = el("img", "dept__image");
        image.src = managedImage(d.image);
        image.alt = "";
        image.width = 420;
        image.height = 420;
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", function () {
          a.insertBefore(count, visual);
          visual.classList.add("is-empty");
        });
        visual.appendChild(image);
        visual.appendChild(count);
        a.appendChild(visual);
      } else a.appendChild(count);
      a.appendChild(el("span", "dept__name engrave", raw(d.label)));
      a.appendChild(el("span", "dept__desc", raw(d.desc)));
      a.appendChild(el("span", "dept__go", "Buka " + ICON.arrow));
      grid.appendChild(a);
    });
    sec.appendChild(grid);
    wrap.appendChild(sec);

    /* Seluruh tautan (dapat dicari) */
    var all = el("section", "section reveal");
    all.innerHTML =
      '<div class="section__head">' +
        '<h2 class="section__title engrave">Seluruh Tautan</h2>' +
        '<span class="section__hint">Indeks lengkap lintas departemen</span>' +
        '<span class="section__badge">' + allItems().length + " item</span>" +
      "</div>";
    var ag = el("div", "grid");
    allItems().forEach(function (r) { ag.appendChild(buildTile(r.page, r.item)); });
    all.appendChild(ag);
    wrap.appendChild(all);

    wrap.appendChild(el("div", "empty", "Tidak ada tautan yang cocok dengan pencarian Anda."));
    main.appendChild(wrap);
  }

  /* -------------------------------------------------------- FAQ/Bantuan */
  function buildFaq(list) {
    var s = el("section", "section reveal");
    s.innerHTML =
      '<div class="section__head">' +
        '<h2 class="section__title engrave">Pertanyaan Umum</h2>' +
        '<span class="section__hint">Jawaban singkat untuk kendala yang sering terjadi</span>' +
      "</div>";
    var box = el("div", "faq");
    list.forEach(function (f) {
      var acc = el("div", "acc");
      var q = el("button", "acc__q", raw(f.q));
      q.type = "button";
      q.setAttribute("aria-expanded", "false");
      var a = el("div", "acc__a", "<div>" + raw(f.a) + "</div>");
      q.addEventListener("click", function () {
        var open = acc.classList.toggle("is-open");
        q.setAttribute("aria-expanded", String(open));
      });
      acc.appendChild(q);
      acc.appendChild(a);
      box.appendChild(acc);
    });
    s.appendChild(box);
    return s;
  }

  /* ------------------------------------------------------------ Cari */
  function wireSearch() {
    var input = $("#q");
    if (!input) return;
    var count = $("#qcount");
    var empty = $(".empty");

    function run() {
      var q = input.value.trim().toLowerCase();
      var shown = 0, total = 0;

      $$(".tile, .dept").forEach(function (n) {
        total++;
        var hit = !q || (n.dataset.label || "").indexOf(q) !== -1;
        n.style.display = hit ? "" : "none";
        if (hit) shown++;
      });

      $$(".section").forEach(function (s) {
        var g = $(".grid", s);
        if (!g) return;
        var any = $$(".tile, .dept", g).some(function (n) { return n.style.display !== "none"; });
        s.style.display = any ? "" : "none";
      });

      if (count) count.textContent = q ? shown + " / " + total + " cocok" : total + " tautan";
      if (empty) empty.classList.toggle("is-on", q && shown === 0);
    }

    input.addEventListener("input", run);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; run(); input.blur(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
    run();
  }

  /* -------------------------------------------------------- Animasi */
  function wireReveal() {
    var nodes = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -4% 0px", threshold: .04 });
    nodes.forEach(function (n, i) {
      n.style.transitionDelay = Math.min(i * 45, 240) + "ms";
      io.observe(n);
    });

    /* Jaring pengaman: apa pun yang terjadi, konten tidak boleh tetap tersembunyi. */
    setTimeout(function () {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
    }, 1600);
  }

  /* Kemiringan halus mengikuti kursor — memperkuat kesan objek fisik */
  function wireTilt() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest ? e.target.closest(".tile, .dept") : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      card.style.transform =
        "translateY(-4px) perspective(700px) rotateX(" + (-py * 4).toFixed(2) +
        "deg) rotateY(" + (px * 5).toFixed(2) + "deg)";
    });
    document.addEventListener("pointerout", function (e) {
      var card = e.target.closest ? e.target.closest(".tile, .dept") : null;
      if (card) card.style.transform = "";
    });
  }

  /* Tombol kembali ke atas */
  function wireBackTop() {
    var btn = el("button", "iconbtn", ICON.top);
    btn.type = "button";
    btn.setAttribute("aria-label", "Kembali ke atas");
    btn.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:70;width:42px;height:42px;opacity:0;pointer-events:none;transition:opacity .3s var(--ease-ui),transform .3s var(--ease-spring);transform:translateY(10px) scale(.96)";
    btn.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    document.body.appendChild(btn);
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var on = window.scrollY > 420;
        btn.style.opacity = on ? "1" : "0";
        btn.style.pointerEvents = on ? "auto" : "none";
        btn.style.transform = on ? "none" : "translateY(10px) scale(.96)";
        ticking = false;
      });
    }, { passive: true });
  }

  /* Header tetap menempel di atas. Kelas ini hanya mengubah kedalaman visual,
     tanpa mengubah ukuran header sehingga posisi navigasi tidak bergeser. */
  function wireStickyHeader() {
    var ticking = false;

    function paint() {
      var bar = $(".topbar");
      if (bar) bar.classList.toggle("is-stuck", window.scrollY > 8);
      ticking = false;
    }

    function requestPaint() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }

    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("load", requestPaint, { once: true });
    requestPaint();
  }

  /* Fallback transisi halaman untuk browser tanpa View Transitions. */
  function wirePageTransitions() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.addEventListener("pageshow", function () { document.body.classList.remove("is-page-leaving"); });
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (document.startViewTransition) return;
      e.preventDefault();
      document.body.classList.add("is-page-leaving");
      setTimeout(function () { location.href = url.href; }, 165);
    });
  }

  /* Dibuka agar halaman administrator dapat memakai ulang pustaka ikon
     dan label tipe tanpa menyalinnya. */
  window.PGM = { ICON: ICON, TYPE_LABEL: TYPE_LABEL };

  /* ------------------------------------------------------------ Boot */
  function init() {
    wireStickyHeader();

    /* Halaman tanpa atribut data-page — misalnya halaman administrator —
       hanya meminjam pustaka ikon di atas; tidak ada yang perlu dirender. */
    var pageId = document.body.dataset.page;
    if (!pageId) { wirePageTransitions(); return; }

    var page = SITE.pages[pageId];
    if (!page) return;

    /* ROOT sudah dihitung dari lokasi app.js. Ini tetap benar meski halaman
       dipindahkan lebih dalam, misalnya pages/ppic/ pada struktur baru. */

    document.title = SITE.name + " — " + String(page.title).replace(/&amp;/g, "&");

    document.body.insertBefore(buildTopbar(pageId), document.body.firstChild);

    var main = $("main") || document.body.appendChild(el("main"));
    main.innerHTML = "";
    main.insertAdjacentElement("beforebegin", buildPageHead(pageId));

    var notice = buildNotice();
    if (notice) main.appendChild(notice);

    main.appendChild(buildConsole(pageId === "beranda" ? "seluruh tautan" : String(page.title).toLowerCase()));

    if (pageId === "beranda") {
      buildHome(main);
    } else {
      var wrap = el("div", "wrap");
      (page.sections || []).forEach(function (s) { wrap.appendChild(buildSection(pageId, s)); });
      if (page.faq) wrap.appendChild(buildFaq(page.faq));
      wrap.appendChild(el("div", "empty", "Tidak ada tautan yang cocok dengan pencarian Anda."));
      main.appendChild(wrap);
    }

    document.body.appendChild(buildFooter());

    wireSearch();
    wireReveal();
    wireTilt();
    wireBackTop();
    wirePageTransitions();

    window.addEventListener("storage", function (e) {
      if (e.key === PIN_KEY) syncPinnedUI();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
