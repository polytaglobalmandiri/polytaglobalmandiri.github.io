(function () {
  "use strict";

  /* Kaki halaman hanya ditampilkan ketika pembaca benar-benar sudah sampai di
     dasar halaman. Pada halaman yang isinya pendek dan tidak dapat digulir,
     kaki halaman sengaja tidak pernah muncul supaya tidak menggantung di
     tengah layar yang masih kosong. */

  var TOLERANCE = 4;
  var root = document.documentElement;

  function initializeFooterReveal() {
    var footer = document.querySelector(".spk-app-footer");
    if (!footer) return;

    /* Penanda dipasang dari skrip, bukan langsung di CSS, supaya kaki halaman
       tetap tampil seperti biasa bila berkas ini gagal dimuat. */
    root.classList.add("spk-footer-reveal");

    var pending = false;

    function isAtBottom() {
      var scrollable = root.scrollHeight - window.innerHeight;
      if (scrollable <= TOLERANCE) return false;
      return window.scrollY + window.innerHeight >= root.scrollHeight - TOLERANCE;
    }

    function sync() {
      pending = false;
      footer.classList.toggle("is-revealed", isAtBottom());
    }

    function request() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(sync);
    }

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    /* Tinggi isi berubah setiap data dimuat atau panel dibuka, sehingga batas
       dasar halaman ikut bergeser dan perlu dihitung ulang. */
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(request).observe(document.body);
    }

    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFooterReveal, { once: true });
  } else {
    initializeFooterReveal();
  }
})();
