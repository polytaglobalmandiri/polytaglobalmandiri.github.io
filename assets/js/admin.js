/* =====================================================================
   POLYTA GLOBAL MANDIRI — Panel Administrator
   ---------------------------------------------------------------------
   Situs ini statis: tidak ada server dan tidak ada basis data. Karena itu
   panel ini bekerja dengan menyunting salinan isi situs di dalam peramban,
   lalu MENGHASILKAN ULANG berkas assets/js/data.js.

   Ada dua cara menyimpan hasil suntingan:

     1. Unduh atau salin berkas data.js, lalu timpa berkas lama dan
        kirimkan lewat git. Selalu bisa dipakai, tidak perlu apa pun.

     2. Terbitkan langsung ke GitHub memakai token pribadi. Sekali klik,
        perubahan langsung tayang. Token hanya tersimpan di peramban Anda
        dan tidak pernah ikut masuk ke dalam repositori.

   Draf tersimpan otomatis di perangkat, sehingga pekerjaan tidak hilang
   bila halaman tertutup sebelum diterbitkan.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------- Utilitas */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var adminScriptUrl = document.currentScript && document.currentScript.src;
  var SITE_ROOT_URL = new URL("../../", adminScriptUrl || location.href);

  function siteUrl(path) {
    return new URL(String(path || "").replace(/^\.\//, ""), SITE_ROOT_URL).href;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* data.js menyimpan "&amp;" agar aman saat disisipkan sebagai HTML.
     Di dalam formulir yang ditampilkan adalah "&" biasa, lalu dikembalikan
     menjadi entitas ketika berkas ditulis ulang. */
  function decodeAmp(s) { return String(s == null ? "" : s).replace(/&amp;/g, "&"); }
  function encodeAmp(s) { return String(s == null ? "" : s).replace(/&(?![a-zA-Z]+;|#\d+;)/g, "&amp;"); }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var ICON = (window.PGM && window.PGM.ICON) || {};
  var TYPE_LABEL = (window.PGM && window.PGM.TYPE_LABEL) || {};

  var TYPES = [
    { id: "sheets",   label: "Google Spreadsheet" },
    { id: "drive",    label: "Direktori Google Drive" },
    { id: "onedrive", label: "Direktori OneDrive" },
    { id: "form",     label: "Google Form" },
    { id: "script",   label: "Aplikasi Web / Apps Script" },
    { id: "slides",   label: "Google Slides" },
    { id: "site",     label: "Halaman internal" },
    { id: "folder",   label: "Direktori umum" }
  ];

  /* Nama glif yang boleh dipilih — tidak termasuk ikon antarmuka */
  var UI_ONLY = ["search", "pin", "pinOn", "arrow", "sun", "moon", "menu", "top", "close"];
  var GLYPHS = Object.keys(ICON).filter(function (k) { return UI_ONLY.indexOf(k) === -1; }).sort();

  /* ------------------------------------------------------------ Keadaan */
  var DRAFT_KEY = "pgm:admin-draft";
  var TOKEN_KEY = "pgm:gh-token";
  var REPO_KEY = "pgm:gh-repo";

  var state = {
    data: null,
    dirty: false,
    tab: "beranda"
  };

  function published() {
    var d = clone(SITE);
    walkStrings(d, decodeAmp);
    return d;
  }

  /* Menjalankan fungsi pada setiap ruas teks yang kelak dirender sebagai HTML */
  function walkStrings(d, fn) {
    ["name", "tagline", "notice", "footer"].forEach(function (k) { if (d[k] != null) d[k] = fn(d[k]); });
    (d.nav || []).forEach(function (n) { n.label = fn(n.label); });
    Object.keys(d.pages).forEach(function (id) {
      var p = d.pages[id];
      ["title", "heading", "lead"].forEach(function (k) { if (p[k] != null) p[k] = fn(p[k]); });
      (p.departments || []).forEach(function (x) { x.label = fn(x.label); x.desc = fn(x.desc); });
      (p.sections || []).forEach(function (s) {
        s.title = fn(s.title);
        if (s.hint != null) s.hint = fn(s.hint);
        s.items.forEach(function (it) { it.label = fn(it.label); });
      });
    });
    return d;
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function migrateDraft(draft) {
    var live = published();
    var liveNav = {};
    var defaults = {};
    (live.nav || []).forEach(function (x) { liveNav[x.id] = x; });
    (draft.nav || []).forEach(function (x) {
      if (liveNav[x.id]) x.path = liveNav[x.id].path;
    });
    ((live.pages.beranda || {}).departments || []).forEach(function (x) { defaults[x.id] = x; });
    (((draft.pages || {}).beranda || {}).departments || []).forEach(function (x) {
      var fallback = defaults[x.id];
      if (fallback) x.path = fallback.path;
      if (x.image == null) x.image = fallback ? fallback.image : "assets/img/departments/marketing.webp";
      delete x.code;
    });
    return draft;
  }

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.data)); } catch (e) { /* mode privat */ }
  }

  function touch() {
    state.dirty = true;
    saveDraft();
    paintStatus();
  }

  /* -------------------------------------------------------------- Toast */
  var toastWrap;
  function toast(msg, tone) {
    if (!toastWrap) {
      toastWrap = el("div", "toast-wrap");
      toastWrap.setAttribute("aria-live", "polite");
      toastWrap.setAttribute("aria-atomic", "false");
      document.body.appendChild(toastWrap);
    }
    var t = el("div", "toast" + (tone === "bad" ? " toast--bad" : " toast--good"),
      (tone === "bad" ? ICON.warn : ICON.check || "") + "<span>" + esc(msg) + "</span>");
    t.setAttribute("role", tone === "bad" ? "alert" : "status");
    toastWrap.appendChild(t);
    setTimeout(function () {
      t.classList.add("is-out");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 3000);
  }

  /* ============================================================ SERIALISASI
     Menghasilkan ulang isi assets/js/data.js dari draf. Keluarannya sengaja
     dibuat rapi dan berkomentar agar berkas tetap enak dibaca manusia. */

  var HEADER = [
    "/* =====================================================================",
    "   POLYTA GLOBAL MANDIRI — Portal Akses Internal",
    "   ---------------------------------------------------------------------",
    "   BERKAS INI DIHASILKAN OLEH PANEL ADMINISTRATOR (/pages/admin/).",
    "   Boleh disunting tangan, dan panel akan tetap membacanya dengan benar.",
    "",
    "   Setiap item memiliki dua penanda yang berbeda maksudnya:",
    "",
    "     type  — DI MANA berkas tersimpan. Menentukan warna dan bahan plat.",
    "             sheets | drive | onedrive | form | script | slides | site | folder",
    "",
    "     icon  — APA isi tautannya. Menentukan gambar glif di atas plat.",
    "             Daftar lengkap ada pada objek ICON di assets/js/app.js.",
    "             Bila dikosongkan, glif mengikuti `type`.",
    "   ===================================================================== */",
    ""
  ].join("\n");

  function q(s) { return JSON.stringify(encodeAmp(s)); }
  function qPlain(s) { return JSON.stringify(String(s == null ? "" : s)); }

  function serialize(d) {
    var o = [];
    o.push(HEADER);
    o.push("const SITE = {");
    o.push("  name: " + q(d.name) + ",");
    o.push("  short: " + qPlain(d.short) + ",");
    o.push("  tagline: " + q(d.tagline) + ",");
    o.push("  notice:");
    o.push("    " + q(d.notice) + ",");
    o.push("  footer: " + q(d.footer) + ",");
    o.push("");
    o.push("  /* Urutan menu navigasi. `path` adalah folder halaman, dibuat berbasis");
    o.push("     folder agar alamatnya bersih tanpa akhiran .html */");
    o.push("  nav: [");
    o.push(d.nav.map(function (n) {
      return "    { id: " + qPlain(n.id) + ", label: " + q(n.label) + ", path: " + qPlain(n.path) + " }";
    }).join(",\n"));
    o.push("  ],");
    o.push("");
    o.push("  pages: {");

    var ids = Object.keys(d.pages);
    ids.forEach(function (id, i) {
      var p = d.pages[id];
      o.push("    " + id + ": {");
      o.push("      title: " + q(p.title) + ",");
      o.push("      heading: " + q(p.heading) + ",");
      if (p.lead != null) o.push("      lead: " + q(p.lead) + ",");

      if (p.departments) {
        o.push("      departments: [");
        o.push(p.departments.map(function (x) {
          return "        { id: " + qPlain(x.id) + ", label: " + q(x.label) +
                 ", path: " + qPlain(x.path) + ", desc: " + q(x.desc) +
                 ", image: " + qPlain(x.image || "") + " }";
        }).join(",\n"));
        o.push("      ]" + (p.sections || p.faq ? "," : ""));
      }

      if (p.sections) {
        o.push("      sections: [");
        o.push(p.sections.map(function (s) {
          var b = [];
          b.push("        {");
          b.push("          title: " + q(s.title) + ",");
          if (s.hint) b.push("          hint: " + q(s.hint) + ",");
          b.push("          items: [");
          b.push(s.items.map(function (it) {
            var parts = ["label: " + q(it.label), "url: " + qPlain(it.url || ""), "type: " + qPlain(it.type || "folder")];
            if (it.icon) parts.push("icon: " + qPlain(it.icon));
            return "            { " + parts.join(", ") + " }";
          }).join(",\n"));
          b.push("          ]");
          b.push("        }");
          return b.join("\n");
        }).join(",\n"));
        o.push("      ]" + (p.faq ? "," : ""));
      }

      if (p.faq) {
        o.push("      faq: [");
        o.push(p.faq.map(function (f) {
          return "        {\n          q: " + qPlain(f.q) + ",\n          a: " + qPlain(f.a) + "\n        }";
        }).join(",\n"));
        o.push("      ]");
      }

      o.push("    }" + (i < ids.length - 1 ? "," : ""));
    });

    o.push("  }");
    o.push("};");
    o.push("");
    return o.join("\n");
  }

  /* =========================================================== PEMERIKSAAN */
  function problems(d) {
    var list = [];
    Object.keys(d.pages).forEach(function (id) {
      var p = d.pages[id];
      if (!p.sections) return;
      var seen = {};
      p.sections.forEach(function (s) {
        if (!String(s.title).trim()) list.push({ page: id, msg: "Ada seksi tanpa judul." });
        s.items.forEach(function (it) {
          var nm = String(it.label).trim();
          if (!nm) { list.push({ page: id, msg: "Ada tautan tanpa nama." }); return; }
          if (seen[nm]) {
            list.push({
              page: id,
              msg: "Nama tautan ganda: “" + nm + "”. Sematan (pin) memakai nama sebagai penanda, " +
                   "sehingga dua tautan bernama sama akan saling tertukar."
            });
          }
          seen[nm] = true;
          if (it.url && !/^(https?:\/\/|#|\/|\.\/|\.\.\/)/i.test(it.url)) {
            list.push({ page: id, msg: "URL “" + nm + "” harus diawali https:// atau / untuk halaman internal." });
          }
        });
      });
    });
    return list;
  }

  /* ============================================================ PEMILIH IKON */
  function openIconPicker(current, onPick) {
    var pop = el("div", "pop");
    var box = el("div", "pop__box");
    box.innerHTML =
      '<div class="pop__head">' +
        '<strong style="font-size:.86rem">Pilih ikon</strong>' +
        '<input class="inp" id="ipq" placeholder="Cari nama ikon&hellip;" style="max-width:220px;margin-left:auto">' +
      "</div>";
    var grid = el("div", "pop__grid");

    function fill(filter) {
      grid.innerHTML = "";
      var kosong = el("button", "pop__cell" + (current ? "" : " is-on"), '<span style="opacity:.5">—</span><span>ikut tipe</span>');
      kosong.type = "button";
      kosong.addEventListener("click", function () { onPick(""); close(); });
      grid.appendChild(kosong);

      GLYPHS.filter(function (g) { return !filter || g.indexOf(filter) !== -1; }).forEach(function (g) {
        var c = el("button", "pop__cell" + (g === current ? " is-on" : ""), ICON[g] + "<span>" + g + "</span>");
        c.type = "button";
        c.addEventListener("click", function () { onPick(g); close(); });
        grid.appendChild(c);
      });
    }

    function close() { if (pop.parentNode) pop.parentNode.removeChild(pop); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }

    box.appendChild(grid);
    pop.appendChild(box);
    pop.addEventListener("click", function (e) { if (e.target === pop) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(pop);
    fill("");
    $("#ipq", box).addEventListener("input", function () { fill(this.value.trim().toLowerCase()); });
    $("#ipq", box).focus();
  }

  /* ================================================================ DIALOG */
  var dialogSeq = 0;
  function dialog(title, bodyNode, buttons) {
    var previous = document.activeElement;
    var titleId = "dlg-title-" + (++dialogSeq);
    var pop = el("div", "pop pop--dialog");
    var box = el("div", "pop__box pop__box--dialog");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", titleId);

    var head = el("div", "pop__head");
    var heading = el("strong", null, esc(title));
    heading.id = titleId;
    head.appendChild(heading);
    box.appendChild(head);
    var body = el("div", "dlg__body");
    body.appendChild(bodyNode);
    box.appendChild(body);

    var foot = el("div", "dlg__foot");
    var preferredFocus = null;
    buttons.forEach(function (b) {
      var btn = el("button", "btn" + (b.primary ? " btn--primary" : "") + (b.danger ? " btn--danger" : ""), esc(b.label));
      btn.type = "button";
      btn.addEventListener("click", function () { b.run(close, btn); });
      if (b.autofocus) preferredFocus = btn;
      foot.appendChild(btn);
    });
    box.appendChild(foot);

    function close() {
      if (pop.parentNode) pop.parentNode.removeChild(pop);
      document.removeEventListener("keydown", onKey);
      setTimeout(function () {
        if (previous && previous.isConnected && previous.focus) previous.focus();
      }, 0);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var focusable = $$('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', box);
      if (!focusable.length) { e.preventDefault(); return; }
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    pop.appendChild(box);
    pop.addEventListener("click", function (e) { if (e.target === pop) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(pop);
    setTimeout(function () {
      var target = preferredFocus || $(".inp", box) || $("button", box);
      if (target) target.focus();
    }, 0);
    return close;
  }

  function confirmDialog(options) {
    var content = el("div", "confirm-card");
    content.appendChild(el("div", "confirm-card__icon", ICON.warn || "!"));
    var copy = el("div", "confirm-card__copy");
    copy.appendChild(el("strong", null, esc(options.heading || "Konfirmasi diperlukan")));
    var message = el("p");
    message.textContent = options.message;
    copy.appendChild(message);
    content.appendChild(copy);

    dialog(options.title || "Konfirmasi", content, [
      { label: options.cancelLabel || "Batal", autofocus: true, run: function (close) { close(); } },
      {
        label: options.confirmLabel || "Lanjutkan",
        danger: options.danger !== false,
        run: function (close) { close(); options.onConfirm(); }
      }
    ]);
  }

  /* ================================================================ RENDER */
  var app;

  function paintStatus() {
    var s = $("#admStatus");
    if (!s) return;
    s.className = "adm-status" + (state.dirty ? " is-dirty" : "");
    s.innerHTML = "<i></i>" + (state.dirty ? "draf belum diterbitkan" : "sama dengan yang tayang");
  }

  function render() {
    app.innerHTML = "";
    app.appendChild(buildBar());

    var wrap = el("div", "wrap");
    wrap.id = "konten";
    wrap.appendChild(buildActions());
    wrap.appendChild(buildTabs());
    wrap.appendChild(buildProblems());

    if (state.tab === "situs") wrap.appendChild(buildSite());
    else if (state.tab === "beranda") wrap.appendChild(buildBeranda());
    else wrap.appendChild(buildPage(state.tab));

    var foot = el("div", "adm-foot",
      "Perubahan tersimpan otomatis sebagai draf di perangkat ini. " +
      "Situs yang tayang baru berubah setelah Anda menerbitkan.");
    wrap.appendChild(foot);
    app.appendChild(wrap);
    paintStatus();
  }

  function buildBar() {
    var bar = el("header", "topbar adm-bar");
    var inner = el("div", "wrap topbar__in adm-bar__in");

    var brand = el("a", "brand adm-brand");
    brand.href = siteUrl("");
    brand.setAttribute("aria-label", "Kembali ke portal POLYTA GLOBAL MANDIRI");
    brand.innerHTML =
      '<span class="brand__plate"><img src="' + siteUrl("assets/img/logo-spk.svg") + '" alt="" width="120" height="120"></span>' +
      '<span class="brand__txt">' +
        '<span class="brand__name">' + esc((state.data && state.data.name) || "POLYTA GLOBAL MANDIRI") + "</span>" +
        '<span class="brand__sub">Portal Administrator</span>' +
      "</span>";
    inner.appendChild(brand);

    var meta = el("div", "adm-bar__meta");
    meta.appendChild(el("span", "adm-badge", "Mode Administrator"));
    var status = el("span", "adm-status");
    status.id = "admStatus";
    meta.appendChild(status);
    inner.appendChild(meta);

    var tools = el("div", "adm-bar__tools");
    tools.appendChild(buildThemeSwitch());
    tools.appendChild(mkBtn("Lihat situs", "btn btn--ghost", function () { location.href = siteUrl(""); }));

    inner.appendChild(tools);
    bar.appendChild(inner);
    return bar;
  }

  function buildThemeSwitch() {
    function current() {
      var selected = document.documentElement.getAttribute("data-theme");
      return selected || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }

    var sw = el("button", "switch adm-switch");
    sw.type = "button";
    sw.setAttribute("aria-label", "Ganti mode terang atau gelap");
    sw.innerHTML = '<span class="switch__led"></span><span class="switch__knob">' +
      (current() === "dark" ? ICON.moon : ICON.sun) + "</span>";
    sw.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("pgm:theme", JSON.stringify(next)); } catch (e) {}
      $(".switch__knob", sw).innerHTML = next === "dark" ? ICON.moon : ICON.sun;
    });
    return sw;
  }

  function buildActions() {
    var bar = el("section", "adm-actions");
    bar.setAttribute("aria-label", "Tindakan administrator");

    var copy = el("div", "adm-actions__copy");
    copy.appendChild(el("strong", null, "Kelola Konten Portal"));
    copy.appendChild(el("span", null, "Sunting menu lalu terbitkan perubahan ke GitHub."));
    bar.appendChild(copy);

    var buttons = el("div", "adm-actions__buttons");
    buttons.appendChild(mkBtn("Muat ulang", "btn btn--ghost", resetDraft));
    buttons.appendChild(mkBtn("Unduh data.js", "btn", downloadFile));
    buttons.appendChild(mkBtn("Salin", "btn", copyFile));
    buttons.appendChild(mkBtn("Terbitkan ke GitHub", "btn btn--primary", openPublish));
    bar.appendChild(buttons);
    return bar;
  }

  function mkBtn(label, cls, fn) {
    var b = el("button", cls, esc(label));
    b.type = "button";
    b.addEventListener("click", fn);
    return b;
  }

  function buildTabs() {
    var t = el("div", "adm-tabs");
    var tabs = [{ id: "situs", label: "PENGATURAN SITUS", n: null }];
    state.data.nav.forEach(function (n) {
      var p = state.data.pages[n.id];
      var count = (p.sections || []).reduce(function (a, s) { return a + s.items.length; }, 0);
      tabs.push({ id: n.id, label: n.label, n: p.sections ? count : null });
    });

    tabs.forEach(function (x) {
      var b = el("button", "adm-tab" + (state.tab === x.id ? " is-on" : ""),
        esc(x.label) + (x.n != null ? "<b>" + x.n + "</b>" : ""));
      b.type = "button";
      b.addEventListener("click", function () { state.tab = x.id; render(); window.scrollTo({ top: 0 }); });
      t.appendChild(b);
    });
    return t;
  }

  function buildProblems() {
    var box = el("div");
    var list = problems(state.data).filter(function (p) { return state.tab === "situs" || p.page === state.tab; });
    if (!list.length) return box;
    var note = el("div", "note");
    note.style.marginBottom = "1rem";
    note.innerHTML = "<b>Perlu diperiksa:</b><ul style='margin:.4rem 0 0;padding-left:1.1rem'>" +
      list.map(function (p) { return "<li>" + esc(p.msg) + "</li>"; }).join("") + "</ul>";
    box.appendChild(note);
    return box;
  }

  /* ------------------------------------------------------- Pengaturan situs */
  function buildSite() {
    var box = el("div");
    var d = state.data;

    var c = card("Identitas situs", null, []);
    var b = $(".card__body", c);
    b.appendChild(fieldText("Nama situs", d.name, function (v) { d.name = v; touch(); }));
    b.appendChild(fieldText("Slogan", d.tagline, function (v) { d.tagline = v; touch(); }));
    b.appendChild(fieldArea("Teks pemberitahuan akses", d.notice, function (v) { d.notice = v; touch(); },
      "Muncul sebagai strip merah di setiap halaman."));
    b.appendChild(fieldText("Teks kaki halaman", d.footer, function (v) { d.footer = v; touch(); }));
    box.appendChild(c);

    var c2 = card("Label menu navigasi", null, []);
    var b2 = $(".card__body", c2);
    b2.appendChild(el("p", "hint",
      "Hanya labelnya yang dapat diubah. Alamat direktori tiap halaman terikat pada " +
      "struktur berkas, sehingga tidak disunting dari sini."));
    d.nav.forEach(function (n) {
      var row = el("div", "field-row field-row--2");
      row.appendChild(fieldText("Label — " + n.id, n.label, function (v) { n.label = v; touch(); }));
      var p = el("div");
      p.appendChild(el("label", "lbl", "Alamat"));
      var ro = el("input", "inp");
      ro.value = "/" + (n.path || "");
      ro.readOnly = true;
      ro.style.opacity = ".6";
      p.appendChild(ro);
      row.appendChild(p);
      b2.appendChild(row);
    });
    box.appendChild(c2);

    return box;
  }

  /* -------------------------------------------------------------- Beranda */
  function buildBeranda() {
    var box = el("div");
    var p = state.data.pages.beranda;

    var c = card("Teks halaman Beranda", null, []);
    var b = $(".card__body", c);
    b.appendChild(fieldText("Judul besar", p.heading, function (v) { p.heading = v; touch(); }));
    b.appendChild(fieldArea("Kalimat pengantar", p.lead, function (v) { p.lead = v; touch(); }));
    box.appendChild(c);

    var c2 = card("Kartu departemen", p.departments.length + " kartu", []);
    var b2 = $(".card__body", c2);
    b2.appendChild(el("p", "hint",
      "Kelola kartu yang tampil di Beranda. Gambar dapat memakai aset bawaan " +
      "(assets/img/departments/nama.webp) atau URL gambar publik."));
    p.departments.forEach(function (x, i) {
      var it = el("div", "item");
      var top = el("div", "item__top");
      top.appendChild(el("span", "item__no", String(i + 1)));
      var namePreview = el("strong", null, esc(x.label));
      namePreview.style.fontSize = ".8rem";
      top.appendChild(namePreview);
      var acts = el("div", "item__acts");
      acts.appendChild(iconBtn(ICON.top, "Naikkan kartu", i === 0, function () { move(p.departments, i, -1); }));
      acts.appendChild(iconBtn(rot(ICON.top), "Turunkan kartu", i === p.departments.length - 1, function () { move(p.departments, i, 1); }));
      acts.appendChild(iconBtn(ICON.close, "Hapus kartu", false, function () {
        confirmDialog({
          title: "Hapus kartu departemen?",
          heading: x.label || "Kartu tanpa nama",
          message: "Kartu akan dihapus dari Beranda. Halaman dan tautan departemen tidak ikut dihapus.",
          confirmLabel: "Hapus kartu",
          onConfirm: function () { p.departments.splice(i, 1); touch(); render(); }
        });
      }));
      top.appendChild(acts);
      it.appendChild(top);
      var preview = el("div", "dept-admin-preview");
      var previewImg = el("img");
      previewImg.alt = "";
      previewImg.loading = "lazy";
      previewImg.src = departmentPreviewUrl(x.image);
      preview.appendChild(previewImg);
      it.appendChild(preview);
      var g = el("div", "item__grid item__grid--department");
      g.appendChild(fieldText("ID halaman", x.id, function (v) { x.id = slug(v); touch(); },
        "Gunakan ID halaman yang sudah ada agar jumlah tautan terbaca."));
      g.appendChild(fieldText("Nama", x.label, function (v) {
        x.label = v;
        namePreview.textContent = v || "(tanpa nama)";
        touch();
      }));
      g.appendChild(fieldText("Alamat tujuan", x.path, function (v) { x.path = v.trim(); touch(); },
        "Contoh: marketing/ atau https://example.com"));
      g.appendChild(fieldText("Keterangan", x.desc, function (v) { x.desc = v; touch(); }));
      g.appendChild(fieldText("Gambar 3D", x.image || "", function (v) {
        x.image = v.trim();
        previewImg.src = departmentPreviewUrl(x.image);
        touch();
      }, "Path aset atau URL gambar publik."));
      it.appendChild(g);
      b2.appendChild(it);
    });
    var addDepartment = mkBtn("+  Tambah kartu departemen", "btn btn--primary", function () {
      var sequence = p.departments.length + 1;
      p.departments.push({
        id: "departemen-" + sequence,
        label: "DEPARTEMEN BARU",
        path: "#",
        desc: "Keterangan singkat departemen.",
        image: "assets/img/departments/marketing.webp"
      });
      touch(); render();
    });
    addDepartment.style.marginTop = ".7rem";
    b2.appendChild(addDepartment);
    box.appendChild(c2);

    return box;
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function departmentPreviewUrl(value) {
    var url = String(value || "").trim();
    if (!url) return siteUrl("assets/img/departments/marketing.webp");
    if (/^(?:https?:|data:|blob:)/i.test(url)) return url;
    if (/^\//.test(url)) return new URL(url, location.origin).href;
    return siteUrl(url);
  }

  /* -------------------------------------------------- Halaman departemen */
  function buildPage(pageId) {
    var box = el("div");
    var p = state.data.pages[pageId];

    var c = card("Teks halaman", null, []);
    var b = $(".card__body", c);
    b.appendChild(fieldText("Judul halaman (remah jejak)", p.title, function (v) { p.title = v; touch(); }));
    b.appendChild(fieldText("Judul besar", p.heading, function (v) { p.heading = v; touch(); }));
    box.appendChild(c);

    (p.sections || []).forEach(function (s, si) {
      box.appendChild(buildSection(p, s, si));
    });

    var add = mkBtn("+  Tambah seksi baru", "btn btn--primary", function () {
      p.sections = p.sections || [];
      p.sections.push({ title: "Seksi Baru", hint: "", items: [] });
      touch(); render();
    });
    add.style.marginTop = ".4rem";
    box.appendChild(add);

    return box;
  }

  function buildSection(page, s, si) {
    var c = card(s.title || "(tanpa judul)", s.items.length + " item", [
      { icon: ICON.top, title: "Naikkan seksi", disabled: si === 0, run: function () { move(page.sections, si, -1); } },
      { icon: rot(ICON.top), title: "Turunkan seksi", disabled: si === page.sections.length - 1, run: function () { move(page.sections, si, 1); } },
      { icon: ICON.close, title: "Hapus seksi", danger: true, run: function () {
          confirmDialog({
            title: "Hapus seksi?",
            heading: s.title || "Seksi tanpa judul",
            message: s.items.length + " tautan di dalam seksi ini juga akan dihapus dari draf.",
            confirmLabel: "Hapus seksi",
            onConfirm: function () { page.sections.splice(si, 1); touch(); render(); }
          });
        } }
    ]);
    var b = $(".card__body", c);
    var titlePreview = $(".card__title", c);

    var head = el("div", "field-row field-row--2");
    head.appendChild(fieldText("Judul seksi", s.title, function (v) {
      s.title = v;
      titlePreview.textContent = v || "(tanpa judul)";
      touch();
    }));
    head.appendChild(fieldText("Keterangan singkat", s.hint || "", function (v) { s.hint = v; touch(); }));
    b.appendChild(head);

    s.items.forEach(function (it, ii) { b.appendChild(buildItem(s, it, ii)); });

    var add = mkBtn("+  Tambah tautan", "btn", function () {
      s.items.push({ label: "Tautan Baru", url: "", type: "sheets", icon: "" });
      touch(); render();
    });
    add.style.marginTop = ".6rem";
    b.appendChild(add);

    return c;
  }

  function buildItem(section, it, ii) {
    var wrap = el("div", "item item--" + (it.type || "folder"));

    function paintItemTheme() {
      TYPES.forEach(function (t) { wrap.classList.remove("item--" + t.id); });
      wrap.classList.add("item--" + (it.type || "folder"));
    }

    var top = el("div", "item__top");
    top.appendChild(el("span", "item__no", String(ii + 1)));

    var pick = el("button", "pick");
    pick.type = "button";
    function paintPick() {
      pick.innerHTML =
        '<span class="pick__sw t-' + (it.type || "folder") + '">' + (ICON[it.icon] || ICON[it.type] || ICON.folder) + "</span>" +
        "<span>" + esc(it.icon || "ikut tipe") + "</span>";
    }
    paintPick();
    pick.addEventListener("click", function () {
      openIconPicker(it.icon || "", function (g) { it.icon = g; paintPick(); touch(); });
    });
    top.appendChild(pick);

    var acts = el("div", "item__acts");
    acts.appendChild(iconBtn(ICON.top, "Naikkan", ii === 0, function () { move(section.items, ii, -1); }));
    acts.appendChild(iconBtn(rot(ICON.top), "Turunkan", ii === section.items.length - 1, function () { move(section.items, ii, 1); }));
    acts.appendChild(iconBtn(ICON.layers, "Gandakan", false, function () {
      section.items.splice(ii + 1, 0, JSON.parse(JSON.stringify(it)));
      touch(); render();
    }));
    acts.appendChild(iconBtn(ICON.close, "Hapus", false, function () {
      confirmDialog({
        title: "Hapus tautan?",
        heading: it.label || "Tautan tanpa nama",
        message: "Tautan akan dihapus dari seksi ini. Perubahan tetap dapat dibatalkan dengan memuat ulang data yang sedang tayang.",
        confirmLabel: "Hapus tautan",
        onConfirm: function () { section.items.splice(ii, 1); touch(); render(); }
      });
    }));
    top.appendChild(acts);
    wrap.appendChild(top);

    var g = el("div", "item__grid");
    g.appendChild(fieldText("Nama tautan", it.label, function (v) { it.label = v; touch(); }));
    g.appendChild(fieldText("URL", it.url || "", function (v) { it.url = v.trim(); touch(); },
      it.url
        ? "Gunakan https:// untuk layanan luar atau / untuk halaman internal portal."
        : "Kosong berarti tampil sebagai “URL belum diatur”.",
      "https://… atau /apps/…"));
    g.appendChild(fieldSelect("Tersimpan di", TYPES, it.type || "folder", function (v) {
      it.type = v; paintPick(); paintItemTheme(); touch();
    }));
    wrap.appendChild(g);

    return wrap;
  }

  function move(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    touch(); render();
  }

  function rot(svg) { return svg.replace("<svg", '<svg style="transform:rotate(180deg)"'); }

  function iconBtn(svg, title, disabled, fn) {
    var b = el("button", "icon-btn", svg);
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    if (disabled) b.disabled = true;
    b.addEventListener("click", fn);
    return b;
  }

  /* --------------------------------------------------------- Potongan UI */
  function card(title, count, acts) {
    var c = el("div", "card");
    var h = el("div", "card__head");
    h.appendChild(el("span", "card__title", esc(title)));
    if (count) h.appendChild(el("span", "card__count", esc(count)));
    if (acts && acts.length) {
      var a = el("div", "card__acts");
      acts.forEach(function (x) { a.appendChild(iconBtn(x.icon, x.title, x.disabled, x.run)); });
      h.appendChild(a);
    }
    c.appendChild(h);
    c.appendChild(el("div", "card__body"));
    return c;
  }

  function fieldText(label, value, onChange, hint, placeholder) {
    var w = el("div");
    w.appendChild(el("label", "lbl", esc(label)));
    var i = el("input", "inp");
    i.type = "text";
    i.value = value == null ? "" : value;
    if (placeholder) i.placeholder = placeholder;
    i.addEventListener("input", function () { onChange(i.value); });
    w.appendChild(i);
    if (hint) w.appendChild(el("p", "hint", hint));
    return w;
  }

  function fieldArea(label, value, onChange, hint) {
    var w = el("div");
    w.appendChild(el("label", "lbl", esc(label)));
    var t = el("textarea", "inp");
    t.value = value == null ? "" : value;
    t.addEventListener("input", function () { onChange(t.value); });
    w.appendChild(t);
    if (hint) w.appendChild(el("p", "hint", hint));
    return w;
  }

  function fieldSelect(label, options, value, onChange) {
    var w = el("div");
    w.appendChild(el("label", "lbl", esc(label)));
    var s = el("select", "inp");
    options.forEach(function (o) {
      var op = el("option", null, esc(o.label));
      op.value = o.id;
      if (o.id === value) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onChange(s.value); });
    w.appendChild(s);
    return w;
  }

  /* ============================================================== SIMPAN */
  function resetDraft() {
    if (state.dirty) {
      confirmDialog({
        title: "Buang seluruh draf?",
        heading: "Perubahan lokal belum diterbitkan",
        message: "Semua perubahan pada perangkat ini akan dibuang dan isi editor dikembalikan ke versi yang sedang tayang.",
        confirmLabel: "Buang draf",
        onConfirm: applyReset
      });
      return;
    }
    applyReset();
  }

  function applyReset() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    state.data = published();
    state.dirty = false;
    render();
    toast("Draf dibuang, isi disamakan dengan situs");
  }

  function downloadFile() {
    var text = serialize(state.data);
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var a = el("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("data.js diunduh — timpa berkas lama di assets/js/");
  }

  function copyFile() {
    var text = serialize(state.data);
    function fallback() {
      var body = el("div");
      body.appendChild(el("p", "hint", "Salin seluruh teks di bawah, lalu timpa isi assets/js/data.js"));
      var pre = el("pre", "out", esc(text));
      body.appendChild(pre);
      dialog("Isi data.js", body, [{ label: "Tutup", primary: true, run: function (close) { close(); } }]);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast("Isi data.js disalin ke papan klip"); },
        fallback
      );
    } else fallback();
  }

  /* ------------------------------------------------------- Terbit ke GitHub */
  function b64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function guessRepo() {
    var h = location.hostname.toLowerCase();
    var inferred = "";
    var legacyWrongRepo = "";
    if (/\.github\.io$/.test(h)) {
      var owner = h.replace(/\.github\.io$/, "");
      var rootParts = SITE_ROOT_URL.pathname.split("/").filter(Boolean);
      inferred = owner + "/" + (rootParts[0] || h);
      legacyWrongRepo = owner + "/pages";
    }

    try {
      var saved = localStorage.getItem(REPO_KEY);
      if (saved && saved.toLowerCase() !== legacyWrongRepo) return saved;
      if (saved && inferred) localStorage.setItem(REPO_KEY, inferred);
    } catch (e) {}
    return inferred;
  }

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ""; }
    catch (e) { return ""; }
  }

  function openPublish() {
    var body = el("div", "publish-form");

    var note = el("div", "note");
    note.innerHTML =
      "<b>Cara kerja.</b> Panel ini menulis ulang berkas <code>assets/js/data.js</code> langsung " +
      "ke repositori GitHub Anda. Setelah GitHub selesai membangun ulang situs — biasanya satu " +
      "sampai dua menit — perubahan langsung tayang untuk semua orang.";
    body.appendChild(note);

    var warn = el("div", "note");
    warn.style.borderLeftColor = "var(--accent)";
    warn.innerHTML =
      "<b>Soal token.</b> Token hanya disimpan di peramban ini dan tidak pernah ikut masuk ke " +
      "dalam repositori. Gunakan <i>fine-grained token</i> yang dibatasi hanya pada repositori ini " +
      "dengan izin <i>Contents: Read and write</i>. Jangan pernah membagikannya kepada siapa pun.";
    body.appendChild(warn);

    var fRepo = fieldText("Repositori", guessRepo(), function () {}, "Bentuk: pemilik/nama-repo", "pemilik/nama-repo");
    var fMsg = fieldText("Pesan perubahan", "Perbarui daftar tautan lewat panel administrator", function () {});
    var fTok = fieldText("Token Akses Pribadi", getToken(), function () {}, null, "github_pat_… atau ghp_…");
    $("input", fTok).type = "password";

    body.appendChild(fRepo);
    body.appendChild(fMsg);
    body.appendChild(fTok);

    var remember = el("label", "hint");
    remember.style.display = "flex";
    remember.style.alignItems = "center";
    remember.style.gap = ".45rem";
    remember.innerHTML = '<input type="checkbox" id="rmb"> Ingat token di perangkat ini ' +
      "(bila tidak dicentang, token terlupakan saat tab ditutup)";
    body.appendChild(remember);

    var log = el("p", "hint");
    body.appendChild(log);

    dialog("Terbitkan ke GitHub", body, [
      { label: "Batal", run: function (close) { close(); } },
      {
        label: "Terbitkan", primary: true, run: function (close, btn) {
          var repo = $("input", fRepo).value.trim();
          var msg = $("input", fMsg).value.trim() || "Perbarui data.js";
          var tok = $("input", fTok).value.trim();
          var keep = $("#rmb", body).checked;

          if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { log.className = "hint hint--warn"; log.textContent = "Format repositori belum benar."; return; }
          if (!tok) { log.className = "hint hint--warn"; log.textContent = "Token belum diisi."; return; }

          try {
            localStorage.setItem(REPO_KEY, repo);
            if (keep) localStorage.setItem(TOKEN_KEY, tok);
            else { sessionStorage.setItem(TOKEN_KEY, tok); localStorage.removeItem(TOKEN_KEY); }
          } catch (e) {}

          btn.disabled = true;
          log.className = "hint";
          log.textContent = "Menghubungi GitHub…";

          publish(repo, tok, msg, serialize(state.data), function (ok, message) {
            btn.disabled = false;
            if (ok) {
              state.dirty = false;
              saveDraft();
              paintStatus();
              close();
              toast("Berhasil diterbitkan. Situs akan tayang dalam 1–2 menit.");
            } else {
              log.className = "hint hint--warn";
              log.textContent = message;
            }
          });
        }
      }
    ]);
  }

  function publish(repo, token, message, content, done) {
    var url = "https://api.github.com/repos/" + repo + "/contents/assets/js/data.js";
    var headers = {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    fetch(url + "?ref=main", { headers: headers })
      .then(function (r) {
        if (r.status === 401) throw new Error("Token ditolak. Periksa kembali atau buat token baru.");
        if (r.status === 404) throw new Error("Repositori atau berkas tidak ditemukan. Periksa nama repositori dan izin token.");
        if (!r.ok) throw new Error("GitHub menjawab " + r.status + " saat membaca berkas.");
        return r.json();
      })
      .then(function (info) {
        return fetch(url, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({ message: message, content: b64(content), sha: info.sha, branch: "main" })
        });
      })
      .then(function (r) {
        if (r.status === 403) throw new Error("Token tidak punya izin menulis. Perlu Contents: Read and write.");
        if (r.status === 409) throw new Error("Berkas berubah di GitHub sejak dimuat. Muat ulang halaman, lalu coba lagi.");
        if (!r.ok) return r.json().then(function (j) { throw new Error("Gagal menyimpan: " + (j.message || r.status)); });
        return r.json();
      })
      .then(function () { done(true); })
      .catch(function (e) { done(false, e.message || "Terjadi kesalahan jaringan."); });
  }

  /* ================================================================= BOOT */
  function boot() {
    app = $("#app");
    if (!app || typeof SITE === "undefined") return;

    var draft = loadDraft();
    if (draft && draft.pages) {
      state.data = migrateDraft(draft);
      state.dirty = JSON.stringify(draft) !== JSON.stringify(published());
    } else {
      state.data = published();
    }
    render();
    /* Tidak memakai beforeunload karena dialognya dikendalikan browser dan
       tidak dapat diberi tema. Draf sudah disimpan otomatis setiap perubahan. */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
