(function () {
  "use strict";

  var MOBILE_QUERY = "(max-width: 900px)";

  function initializeResponsiveHeader() {
    var nav = document.querySelector(".topnav, .app-nav");
    if (!nav || nav.dataset.responsiveNavReady === "true") return;

    var header = nav.closest(".topbar, .app-topbar, .app-header");
    var inner = nav.parentElement;
    if (!header || !inner) return;

    var links = nav.querySelectorAll("a, button");
    if (links.length === 1 && links[0].classList.contains("polyta-portal-home")) {
      header.classList.add("spk-simple-header");
      nav.classList.add("spk-simple-nav");
      return;
    }

    nav.dataset.responsiveNavReady = "true";
    header.classList.add("spk-responsive-header");
    nav.classList.add("spk-responsive-nav");

    if (!nav.id) nav.id = "spkResponsiveNavigation";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "spk-mobile-nav-toggle no-print";
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Buka menu navigasi");
    toggle.innerHTML =
      '<span class="spk-menu-icon" aria-hidden="true">' +
        '<span></span><span></span><span></span>' +
      '</span>' +
      '<span class="spk-menu-label">Menu</span>';
    inner.insertBefore(toggle, nav);

    var media = window.matchMedia(MOBILE_QUERY);

    function setNavAccessibility(isOpen) {
      if (!media.matches) {
        nav.removeAttribute("aria-hidden");
        nav.removeAttribute("inert");
        return;
      }

      nav.setAttribute("aria-hidden", String(!isOpen));
      if (isOpen) nav.removeAttribute("inert");
      else nav.setAttribute("inert", "");
    }

    function closeMenu(restoreFocus) {
      header.classList.remove("spk-nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Buka menu navigasi");
      setNavAccessibility(false);
      if (restoreFocus) toggle.focus();
    }

    function openMenu() {
      header.classList.add("spk-nav-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Tutup menu navigasi");
      setNavAccessibility(true);

      var current = nav.querySelector('[aria-current="page"]');
      var first = current || nav.querySelector("a, button");
      if (first) window.setTimeout(function () { first.focus(); }, 80);
    }

    toggle.addEventListener("click", function () {
      if (header.classList.contains("spk-nav-open")) closeMenu(false);
      else openMenu();
    });

    nav.addEventListener("click", function (event) {
      if (!media.matches || !event.target.closest("a, button")) return;
      window.setTimeout(function () { closeMenu(false); }, 0);
    });

    document.addEventListener("click", function (event) {
      if (!media.matches || !header.classList.contains("spk-nav-open")) return;
      if (!header.contains(event.target)) closeMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("spk-nav-open")) {
        closeMenu(true);
      }
    });

    function syncViewport() {
      header.classList.remove("spk-nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Buka menu navigasi");
      setNavAccessibility(false);
    }

    if (typeof media.addEventListener === "function") media.addEventListener("change", syncViewport);
    else if (typeof media.addListener === "function") media.addListener(syncViewport);
    syncViewport();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeResponsiveHeader, { once: true });
  } else {
    initializeResponsiveHeader();
  }
})();
