(function () {
  "use strict";

  var AUTH_KEY = "pgm:spk-auth-v1";

  function logout() {
    var auth = null;
    try {
      auth = JSON.parse(localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY) || "null");
    } catch (error) {}
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    if (auth && auth.token && window.google && google.script && google.script.run) {
      try {
        google.script.run.logoutApprovalUser(auth.token);
      } catch (error) {}
    }
    window.location.href = "/";
  }

  function mount() {
    var existing = document.querySelector("#logoutButton, [data-pgm-logout]");
    if (existing) {
      existing.setAttribute("data-pgm-logout", "true");
      return;
    }

    var nav = document.querySelector(".topnav, .nav, .app-nav");
    if (!nav) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "nav-link-app app-nav-link nav__link pgm-logout";
    button.setAttribute("data-pgm-logout", "true");
    button.title = "Keluar";
    button.innerHTML = '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Keluar</span>';
    button.addEventListener("click", logout);
    nav.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}());
