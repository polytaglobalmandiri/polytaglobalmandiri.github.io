(function () {
  "use strict";

  var themeKey = "pgm:theme";
  var themeButton = document.querySelector(".resource-theme");
  var menuButton = document.querySelector(".resource-menu");
  var nav = document.querySelector(".resource-nav");
  var topbar = document.querySelector(".topbar");

  function currentTheme() {
    var fixed = document.documentElement.getAttribute("data-theme");
    if (fixed) return fixed;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(themeKey, JSON.stringify(theme)); } catch (error) { /* penyimpanan dapat dibatasi */ }
    if (themeButton) themeButton.setAttribute("aria-label", theme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap");
  }

  if (themeButton) {
    themeButton.setAttribute("aria-label", currentTheme() === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap");
    themeButton.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target) && !menuButton.contains(event.target)) {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Buka menu");
      }
    });
  }

  function paintHeader() {
    if (topbar) topbar.classList.toggle("is-stuck", window.scrollY > 8);
  }

  window.addEventListener("scroll", paintHeader, { passive: true });
  paintHeader();
})();
