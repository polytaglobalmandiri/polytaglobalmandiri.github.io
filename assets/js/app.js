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
    logo:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 2.6 20.4 7v10L12 21.4 3.6 17V7z"/><path d="M8.6 16V8.4h3.7a2.6 2.6 0 0 1 0 5.2H8.6"/></svg>',
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
      '<path d="M12 19V6M6 12l6-6 6 6"/></svg>'
  };

  var TYPE_LABEL = {
    sheets: "Spreadsheet", drive: "Google Drive", onedrive: "OneDrive",
    form: "Formulir", script: "Aplikasi Web", slides: "Presentasi",
    site: "Halaman", folder: "Folder"
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

  applyTheme(store.get(THEME_KEY, null));

  /* ------------------------------------------------------------ Toast */
  var toastWrap;
  function toast(msg, icon) {
    if (!toastWrap) {
      toastWrap = el("div", "toast-wrap");
      document.body.appendChild(toastWrap);
    }
    var t = el("div", "toast", (icon || ICON.warn) + "<span>" + esc(msg) + "</span>");
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

    var home = SITE.nav[0].file;
    var brand = el("a", "brand");
    brand.href = home;
    brand.innerHTML =
      '<span class="brand__plate">' + ICON.logo + "</span>" +
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
      a.href = n.file;
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
        '<span class="foot__mark">' + ICON.logo + "<span>" + raw(SITE.footer) + "</span></span>" +
        '<span>&copy; ' + new Date().getFullYear() + " " + raw(SITE.name) + " &middot; Akses berbasis peran</span>" +
      "</div>";
    return f;
  }

  /* ------------------------------------------------------------ Hero */
  function buildHero(pageId) {
    var p = SITE.pages[pageId];
    var isHome = pageId === "beranda";
    var items = isHome ? allItems() : pageItems(pageId);
    var secCount = isHome ? SITE.pages.beranda.departments.length : (p.sections ? p.sections.length : 0);
    var ready = items.filter(function (r) { return r.item.url; }).length;

    var sec = el("section", "hero");
    var wrap = el("div", "wrap");
    var plate = el("div", "plate reveal");
    plate.innerHTML =
      '<i class="screw screw--tl"></i><i class="screw screw--tr"></i>' +
      '<i class="screw screw--bl"></i><i class="screw screw--br"></i>' +
      '<div class="hero__in">' +
        "<div>" +
          '<span class="eyebrow"><i class="dot-led"></i>' +
            (isHome ? "Sistem Aktif" : raw(p.title)) +
          "</span>" +
          "<h1>" +
            (isHome ? '<span class="thin">' + raw(SITE.name) + "</span>" : '<span class="thin">' + raw(p.title) + "</span>") +
            '<span class="engrave">' + raw(p.heading) + "</span>" +
          "</h1>" +
          '<p class="hero__lead">' + raw(isHome ? p.lead : SITE.notice) + "</p>" +
          (isHome
            ? '<div class="notice">' + ICON.warn.replace("<svg", '<svg class="notice__icon"') +
              "<span>" + raw(SITE.notice) + "</span></div>"
            : "") +
        "</div>" +
        '<div class="gauge">' +
          '<div class="gauge__grid">' +
            statBox(isHome ? secCount : secCount, isHome ? "Departemen" : "Seksi") +
            statBox(items.length, isHome ? "Total Tautan" : "Tautan") +
            statBox(ready, "Aktif") +
            statBox(pins().length, "Disematkan") +
          "</div>" +
        "</div>" +
      "</div>";
    wrap.appendChild(plate);
    sec.appendChild(wrap);
    return sec;
  }

  function statBox(num, label) {
    return '<div class="stat"><div class="stat__num">' + String(num).padStart(2, "0") +
      '</div><div class="stat__lbl">' + esc(label) + "</div></div>";
  }

  /* ---------------------------------------------------- Konsol cari */
  function buildConsole(scopeLabel) {
    var wrap = el("div", "wrap");
    var box = el("div", "console reveal");
    box.innerHTML =
      '<label class="field">' +
        ICON.search +
        '<input type="search" id="q" autocomplete="off" placeholder="Cari ' + esc(scopeLabel) + '&hellip;" aria-label="Cari tautan">' +
        "<kbd>/</kbd>" +
      "</label>" +
      '<span class="console__count" id="qcount"></span>';
    wrap.appendChild(box);
    return wrap;
  }

  /* ------------------------------------------------------------ Tile */
  function buildTile(pageId, item) {
    var type = item.type || "folder";
    var id = pinId(pageId, item.label);
    var hasUrl = !!item.url;

    var a = el("a", "tile t-" + type + (hasUrl ? "" : " is-unset"));
    a.href = hasUrl ? item.url : "#";
    a.dataset.label = String(item.label).toLowerCase();
    a.dataset.pin = id;
    if (hasUrl && /^https?:/i.test(item.url)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    a.innerHTML =
      '<span class="tile__icon">' + (ICON[type] || ICON.folder) + "</span>" +
      '<span class="tile__body">' +
        '<span class="tile__label">' + raw(item.label) + "</span>" +
        '<span class="tile__meta">' + (hasUrl ? esc(TYPE_LABEL[type] || "Tautan") : "URL belum diatur") + "</span>" +
      "</span>";

    var pin = el("button", "tile__pin" + (isPinned(id) ? " is-on" : ""), isPinned(id) ? ICON.pinOn : ICON.pin);
    pin.type = "button";
    pin.setAttribute("aria-label", "Sematkan " + String(item.label) + " ke Akses Cepat");
    pin.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = togglePin(id);
      pin.classList.toggle("is-on", on);
      pin.innerHTML = on ? ICON.pinOn : ICON.pin;
      toast(on ? "Disematkan ke Akses Cepat" : "Sematan dilepas", on ? ICON.pinOn : ICON.pin);
      syncPinnedStat();
    });
    a.appendChild(pin);

    if (!hasUrl) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Tautan “" + item.label + "” belum diatur di assets/js/data.js");
      });
    }
    return a;
  }

  function syncPinnedStat() {
    var boxes = $$(".stat");
    boxes.forEach(function (b) {
      if ($(".stat__lbl", b).textContent.trim() === "Disematkan") {
        $(".stat__num", b).textContent = String(pins().length).padStart(2, "0");
      }
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

  /* ------------------------------------------------- Beranda: konten */
  function buildHome(main) {
    var wrap = el("div", "wrap");

    /* Akses cepat (pin) */
    var pinned = [];
    allItems().forEach(function (r) {
      if (isPinned(pinId(r.page, r.item.label))) pinned.push(r);
    });
    if (pinned.length) {
      var s = el("section", "section reveal");
      s.innerHTML =
        '<div class="section__head">' +
          '<h2 class="section__title engrave">Akses Cepat</h2>' +
          '<span class="section__hint">Tautan yang Anda sematkan &mdash; tersimpan di perangkat ini</span>' +
          '<span class="section__badge">' + pinned.length + " item</span>" +
        "</div>";
      var g = el("div", "grid");
      pinned.forEach(function (r) { g.appendChild(buildTile(r.page, r.item)); });
      s.appendChild(g);
      wrap.appendChild(s);
    }

    /* Departemen */
    var sec = el("section", "section reveal");
    sec.innerHTML =
      '<div class="section__head">' +
        '<h2 class="section__title engrave">Direktori Departemen</h2>' +
        '<span class="section__hint">Pilih departemen untuk melihat daftar folder dan berkas</span>' +
      "</div>";
    var grid = el("div", "grid grid--dept");
    SITE.pages.beranda.departments.forEach(function (d) {
      var n = pageItems(d.id).length;
      var a = el("a", "dept");
      a.href = d.file;
      a.dataset.label = String(d.label).toLowerCase() + " " + String(d.desc).toLowerCase();
      a.innerHTML =
        '<span class="dept__count">' + n + " tautan</span>" +
        '<span class="dept__badge">' + esc(d.label.slice(0, 2)) + "</span>" +
        '<span class="dept__name engrave">' + raw(d.label) + "</span>" +
        '<span class="dept__desc">' + raw(d.desc) + "</span>" +
        '<span class="dept__go">Buka ' + ICON.arrow + "</span>";
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
    }, { rootMargin: "0px 0px -8% 0px", threshold: .06 });
    nodes.forEach(function (n, i) {
      n.style.transitionDelay = Math.min(i * 55, 330) + "ms";
      io.observe(n);
    });
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
    btn.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:70;width:42px;height:42px;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;transform:translateY(8px)";
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(btn);
    window.addEventListener("scroll", function () {
      var on = window.scrollY > 420;
      btn.style.opacity = on ? "1" : "0";
      btn.style.pointerEvents = on ? "auto" : "none";
      btn.style.transform = on ? "none" : "translateY(8px)";
    }, { passive: true });
  }

  /* ------------------------------------------------------------ Boot */
  function init() {
    var pageId = document.body.dataset.page || "beranda";
    var page = SITE.pages[pageId];
    if (!page) return;

    document.title = SITE.name + " — " + String(page.title).replace(/&amp;/g, "&");

    document.body.insertBefore(buildTopbar(pageId), document.body.firstChild);

    var main = $("main") || document.body.appendChild(el("main"));
    main.innerHTML = "";
    main.insertAdjacentElement("beforebegin", buildHero(pageId));
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
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
