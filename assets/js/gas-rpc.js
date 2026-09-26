(function () {
  "use strict";

  var API_URL = "https://script.google.com/macros/s/AKfycbwgMIuKAdI8PpXyrTgXaNbbpoCi6JXlxCTxuScwEShcv2fCkIjv8NhmVio1tikASSYg/exec";
  var requestSequence = 0;
  // Operasi autentikasi harus cepat pulih ketika koneksi Apps Script macet.
  // Operasi pengolahan data lain tetap memakai batas lama karena beberapa di
  // antaranya memang dapat berjalan beberapa menit.
  var REQUEST_TIMEOUTS = {
    getApprovalBootstrapStatus: 20000,
    getApprovalSession: 20000,
    loginApprovalUser: 180000
  };
  var CACHE_DATABASE = "polyta-spk-client-cache";
  var CACHE_STORE = "responses";
  // Naik ke v2: bentuk routing pada muatan dashboard berubah, Cutting kini
  // dipecah menjadi jenis finishingnya. Simpanan ini hanya gugur karena umur
  // atau karena pemanggilan yang mengubah data; perubahan kode tidak
  // menyentuhnya sama sekali, jadi nomor versi pada kunci inilah yang wajib
  // dinaikkan setiap bentuk muatannya berubah.
  var DASHBOARD_CACHE_KEY = "dashboard-data-v8";
  var DASHBOARD_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
  var MUTATING_METHODS = {
    saveSpkYearPreference: true,
    markSpkReleasedForPrint: true,
    updateSpkFromDashboard: true,
    saveCustomerMaster: true,
    saveBrandMaster: true,
    saveMaterialMaster: true,
    submitDatabase: true,
    saveProductionMixerEntry: true,
    saveProductionBlowingEntry: true,
    saveProductionPrintingEntry: true,
    saveEtaBeliBahanScheduleByManager: true,
    updateEtaBeliBahanByManager: true,
    updateKeluarBahanByManager: true,
    saveProductionSchedule: true,
    releaseProductionSchedule: true,
    cancelProductionSchedule: true,
    saveProductionEntry: true,
    verifyProductionEntry: true,
    rejectProductionEntry: true,
    saveHandover: true,
    saveHandoverByRouting: true,
    beginExtractionJob: true,
    extractData: true,
    cancelExtractionJob: true,
    approveSpk: true
  };

  function openClientCache() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB tidak tersedia."));
        return;
      }

      var request = window.indexedDB.open(CACHE_DATABASE, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
          request.result.createObjectStore(CACHE_STORE);
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Cache perangkat gagal dibuka.")); };
    });
  }

  function readClientCache(key) {
    return openClientCache().then(function (database) {
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction(CACHE_STORE, "readonly");
        var request = transaction.objectStore(CACHE_STORE).get(key);
        request.onsuccess = function () { resolve(request.result || null); };
        request.onerror = function () { reject(request.error); };
        transaction.oncomplete = function () { database.close(); };
        transaction.onabort = function () { database.close(); };
      });
    });
  }

  function writeClientCache(key, value) {
    return openClientCache().then(function (database) {
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction(CACHE_STORE, "readwrite");
        transaction.objectStore(CACHE_STORE).put({ savedAt: Date.now(), value: value }, key);
        transaction.oncomplete = function () { database.close(); resolve(); };
        transaction.onerror = function () { database.close(); reject(transaction.error); };
        transaction.onabort = function () { database.close(); reject(transaction.error); };
      });
    });
  }

  function deleteClientCache(key) {
    return openClientCache().then(function (database) {
      return new Promise(function (resolve) {
        var transaction = database.transaction(CACHE_STORE, "readwrite");
        transaction.objectStore(CACHE_STORE).delete(key);
        transaction.oncomplete = function () { database.close(); resolve(); };
        transaction.onerror = function () { database.close(); resolve(); };
        transaction.onabort = function () { database.close(); resolve(); };
      });
    }).catch(function () {});
  }

  var scriptTransport = "belum-diuji";
  var postTransport = "belum-diuji";
  function authToken() {
    for (var i = 0, stores = [window.sessionStorage, window.localStorage]; i < stores.length; i++) {
      try {
        var auth = JSON.parse(stores[i].getItem('pgm:spk-auth-v1') || 'null');
        if (auth && auth.token) return auth.token;
      } catch (ignore) {}
    }
    return '';
  }
  function dashboardCacheKey() { return DASHBOARD_CACHE_KEY + ':' + authToken(); }

  function transportError(code, message, originalError) {
    var error = new Error(message);
    error.transportCode = code;
    // Pertahankan jenis error asli. Pembatalan fetch saat navigasi halaman
    // bukan gangguan aplikasi dan perlu dikenali oleh lapisan status.
    if (originalError && originalError.name) {
      error.originalErrorName = String(originalError.name);
    }
    return error;
  }

  // Satu-satunya penentu boleh tidaknya sebuah panggilan diulang. Dipakai
  // bersama oleh pesan kegagalan dan keputusan coba ulang agar keduanya tidak
  // pernah berbeda pendapat.
  function isMutating(method) {
    return Boolean(MUTATING_METHODS[method]) ||
      /^(save|submit|update|mark|approve|begin|extract|cancel|bootstrap|acknowledge)/.test(method);
  }

  // JSON mentah dikirim sebagai text/plain agar tidak memerlukan preflight.
  // doPost sudah membalas ContentService JSON untuk badan ini. Kredensial
  // tetap di badan POST; tidak masuk URL dan tidak membutuhkan iframe/cookie.
  // Jangan mencoba ulang otomatis: server mungkin sudah menyimpan transaksi
  // walaupun koneksi terputus sebelum balasannya diterima.
  function requestViaPost(method, args) {
    if (typeof window.fetch !== "function" || typeof window.AbortController !== "function") {
      return Promise.reject(transportError("browser-tidak-didukung", "Perbarui peramban agar dapat terhubung ke aplikasi."));
    }
    var controller = new window.AbortController();
    var timeoutId = window.setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUTS[method] || 360000);
    return window.fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ method: method, args: args, authToken: authToken() }),
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error("Server mengembalikan HTTP " + response.status + ".");
      return response.json();
    }).catch(function (error) {
      postTransport = "gagal";
      var message = error && error.name === "AbortError"
        ? "Waktu tunggu balasan server habis."
        : "Balasan server tidak dapat diterima. Periksa koneksi lalu muat ulang data.";
      if (isMutating(method)) {
        message += " Periksa hasil transaksi sebelum mengirim ulang; proses di server mungkin sudah berjalan.";
      }
      throw transportError("post-gagal", message, error);
    }).then(function (payload) {
      postTransport = "sehat";
      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error && payload.error.message || "Permintaan ke GAS gagal.");
      }
      return payload.result;
    }).finally(function () { window.clearTimeout(timeoutId); });
  }

  // Pembacaan publik menggunakan callback JSONP yang dibatasi backend.
  function requestViaScript(method, args) {
    return new Promise(function (resolve, reject) {
      requestSequence += 1;
      var callbackName = "cb" + Date.now().toString(36) + requestSequence.toString(36);
      var registry = window.__polytaGasJsonp || (window.__polytaGasJsonp = {});
      var script = document.createElement("script");
      var settled = false;

      function cleanup() {
        window.clearTimeout(timeoutId);
        delete registry[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      function abandon(message) {
        if (settled) return;
        settled = true;
        scriptTransport = "tidak-ada";
        cleanup();
        reject(transportError("cadangan-belum-ada", message));
      }

      registry[callbackName] = function (payload) {
        if (settled) return;
        settled = true;
        scriptTransport = "ada";
        cleanup();
        if (!payload || payload.ok !== true) {
          reject(new Error(payload && payload.error && payload.error.message
            ? payload.error.message
            : "Permintaan ke GAS gagal."));
          return;
        }
        resolve(payload.result);
      };

      script.async = true;
      script.src = API_URL +
        "?callback=" + encodeURIComponent("__polytaGasJsonp." + callbackName) +
        "&payload=" + encodeURIComponent(JSON.stringify({ method: method, args: args }));
      script.addEventListener("error", function () {
        abandon("Jalur cadangan belum tersedia di server.");
      });

      var timeoutId = window.setTimeout(function () {
        abandon("Jalur cadangan tidak menjawab.");
      }, REQUEST_TIMEOUTS[method] || 60000);

      (document.head || document.documentElement).appendChild(script);
    });
  }

  function requestTransport(method, args) {
    // Semua permintaan membawa sesi dalam badan POST. Hop kedua Apps Script
    // (script.googleusercontent.com) sesekali membalas
    // halaman 404 Drive walau skripnya sendiri berhasil, terutama ketika
    // eksekusinya lambat. Pembacaan tidak mengubah apa pun, jadi diberi satu
    // kesempatan kedua seperti jalur JSONP. Transaksi tetap tidak diulang.
    return requestViaPost(method, args).catch(function (error) {
      if (isMutating(method)) throw error;
      if (!error || error.transportCode !== "post-gagal") throw error;
      return requestViaPost(method, args);
    });
  }

  function requestServer(method, args) {
    var wireArgs = args;
    if (method === "getDashboardData" && typeof window.DecompressionStream === "function") {
      wireArgs = [Boolean(args && args[0]), "gzip-base64"];
    }
    return requestTransport(method, wireArgs).then(function (result) {
      if (!result || result.encoding !== "gzip-base64") return result;
      var binary = window.atob(result.payload);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      var stream = new Blob([bytes]).stream().pipeThrough(new window.DecompressionStream("gzip"));
      return new Response(stream).json();
    });
  }

  // Kompatibilitas untuk halaman lama yang memanggil helper sebelum login.
  // Transport POST/JSONP tidak membutuhkan izin penyimpanan pihak ketiga.
  function primeThirdPartyAccess() {
    return Promise.resolve(true);
  }

  function requestAndCacheDashboard(method, args) {
    return requestServer(method, args).then(function (result) {
      writeClientCache(dashboardCacheKey(), result).catch(function () {});
      return result;
    });
  }

  function callServer(method, args) {
    var forceRefresh = method === "getDashboardData" && args && args[0] === true;

    if (method === "getDashboardData" && !forceRefresh) {
      // Dashboard sendiri sudah menampilkan localStorage seketika dan
      // membandingkan token revisi setiap lima detik. Lapisan IndexedDB di
      // sini sebelumnya dapat mengembalikan snapshot lama justru setelah
      // perubahan terdeteksi. Hubungi server agar cache tervalidasi terhadap
      // revisi file Spreadsheet sebelum dipakai.
      return requestAndCacheDashboard(method, args);
    }

    return requestServer(method, args).then(function (result) {
      if (method === "getDashboardData") {
        writeClientCache(dashboardCacheKey(), result).catch(function () {});
      } else if (MUTATING_METHODS[method]) {
        deleteClientCache(dashboardCacheKey());
      }
      return result;
    });
  }

  function createRunner() {
    var successHandler = null;
    var failureHandler = null;
    var userObject;
    var runner;

    runner = new Proxy({}, {
      get: function (_, property) {
        if (property === "withSuccessHandler") {
          return function (handler) { successHandler = handler; return runner; };
        }
        if (property === "withFailureHandler") {
          return function (handler) { failureHandler = handler; return runner; };
        }
        if (property === "withUserObject") {
          return function (value) { userObject = value; return runner; };
        }
        if (property === "then") return undefined;

        return function () {
          var args = Array.prototype.slice.call(arguments);
          callServer(String(property), args).then(function (result) {
            if (typeof successHandler === "function") successHandler(result, userObject);
          }).catch(function (error) {
            if (typeof failureHandler === "function") failureHandler(error, userObject);
            else console.error("GAS RPC gagal:", error);
          });
          return runner;
        };
      }
    });

    return runner;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, "run", {
    configurable: true,
    get: createRunner
  });
  window.POLYTA_SPK_API_URL = API_URL;
  window.POLYTA_PRIME_GAS_ACCESS = primeThirdPartyAccess;
  window.POLYTA_GAS_TRANSPORT = function () {
    return { frame: "tidak-digunakan", post: postTransport, cadangan: scriptTransport };
  };
})();
