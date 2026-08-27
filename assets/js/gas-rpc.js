(function () {
  "use strict";

  var API_URL = "https://script.google.com/macros/s/AKfycbzEml-brh_-SmKAsvd-1iFy6nelvc9YENtn-bkjD1T6UUgX7QNBE0ycjU02QEfY-91aXQ/exec";
  var requestSequence = 0;
  // Operasi autentikasi harus cepat pulih ketika koneksi Apps Script macet.
  // Operasi pengolahan data lain tetap memakai batas lama karena beberapa di
  // antaranya memang dapat berjalan beberapa menit.
  var REQUEST_TIMEOUTS = {
    getApprovalBootstrapStatus: 20000,
    getApprovalSession: 20000,
    // Apps Script sendiri menunggu 390 detik sebelum memutus callback, jadi
    // masih ada ruang. Login menanggung cold start plus dua perjalanan penuh:
    // POST ke /exec mengembalikan halaman shell, dan halaman itu baru
    // memanggil fungsinya lewat google.script.run. Batas 75 detik terbukti
    // masih terlalu rapat untuk itu.
    loginApprovalUser: 180000
  };
  var CACHE_DATABASE = "polyta-spk-client-cache";
  var CACHE_STORE = "responses";
  // Naik ke v2: bentuk routing pada muatan dashboard berubah, Cutting kini
  // dipecah menjadi jenis finishingnya. Simpanan ini hanya gugur karena umur
  // atau karena pemanggilan yang mengubah data; perubahan kode tidak
  // menyentuhnya sama sekali, jadi nomor versi pada kunci inilah yang wajib
  // dinaikkan setiap bentuk muatannya berubah.
  var DASHBOARD_CACHE_KEY = "dashboard-data-v4";
  var DASHBOARD_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
  var MUTATING_METHODS = {
    saveSpkYearPreference: true,
    markSpkReleasedForPrint: true,
    updateSpkFromDashboard: true,
    saveCustomerMaster: true,
    saveBrandMaster: true,
    saveMaterialMaster: true,
    submitDatabase: true,
    saveEtaBeliBahanScheduleByManager: true,
    updateEtaBeliBahanByManager: true,
    updateKeluarBahanByManager: true,
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

  // Bentuk jawaban Apps Script menentukan apa saja yang bisa gagal di sini.
  // POST ke /exec dibalas halaman shell di script.google.com, dan shell itu
  // menyisipkan iframe kedua dari *.googleusercontent.com. Iframe kedualah yang
  // menjalankan window.parent.parent.postMessage berisi hasilnya. Jadi ada dua
  // kegagalan yang sama sekali berbeda dan selama ini tertukar: POST yang tidak
  // pernah selesai, dan balasan yang tidak pernah dikirim balik karena frame
  // googleusercontent tidak boleh jalan. Yang kedua tidak ada hubungannya
  // dengan kecepatan server, jadi menunggu lebih lama tidak menolong sama
  // sekali — pesan "server belum merespons" justru menyesatkan.
  var REPLY_GRACE = 15000;
  var TRANSPORT_MEMO_KEY = "polyta-gas-frame-broken";
  var TRANSPORT_MEMO_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  // Mesin yang frame balasannya ditahan akan ditahan lagi pada muat halaman
  // berikutnya. Tanpa ingatan ini setiap kunjungan membayar ulang lima belas
  // detik hanya untuk sampai pada kesimpulan yang sama. Ingatan itu diberi
  // umur, dan dibuang begitu sebuah balasan benar-benar sampai, supaya
  // pemblokiran yang sudah dicabut tidak terus dianggap berlaku.
  function readTransportMemo() {
    try {
      var raw = window.localStorage.getItem(TRANSPORT_MEMO_KEY);
      return Boolean(raw) && Date.now() - Number(raw) < TRANSPORT_MEMO_MAX_AGE;
    } catch (error) { return false; }
  }

  function writeTransportMemo(broken) {
    try {
      if (broken) window.localStorage.setItem(TRANSPORT_MEMO_KEY, String(Date.now()));
      else window.localStorage.removeItem(TRANSPORT_MEMO_KEY);
    } catch (error) {}
  }

  var frameTransportBroken = readTransportMemo();
  var scriptTransport = "belum-diuji"; // belum-diuji | ada | tidak-ada

  function transportError(code, message) {
    var error = new Error(message);
    error.transportCode = code;
    return error;
  }

  function requestViaFrame(method, args) {
    return new Promise(function (resolve, reject) {
      requestSequence += 1;
      var requestId = "spk-" + Date.now().toString(36) + "-" + requestSequence.toString(36);
      var frameName = "polytaGasRpcFrame-" + requestId;
      var iframe = document.createElement("iframe");
      var form = document.createElement("form");
      var input = document.createElement("input");
      var host = document.body || document.documentElement;
      var settled = false;
      var replyTimer = 0;
      var loadCount = 0;
      var submittedAt = 0;

      iframe.name = frameName;
      iframe.title = "";
      iframe.hidden = true;
      iframe.setAttribute("aria-hidden", "true");

      form.method = "POST";
      form.action = API_URL;
      form.target = frameName;
      form.hidden = true;

      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify({ requestId: requestId, method: method, args: args });
      form.appendChild(input);

      function cleanup() {
        window.removeEventListener("message", receiveMessage);
        window.clearTimeout(timeoutId);
        window.clearTimeout(replyTimer);
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }

      function fail(code, message) {
        if (settled) return;
        settled = true;
        frameTransportBroken = true;
        writeTransportMemo(true);
        cleanup();
        reject(transportError(code, message));
      }

      function receiveMessage(event) {
        var data = event.data;
        if (settled || !data ||
            data.source !== "polyta-spk-gas-rpc" || data.requestId !== requestId) return;

        settled = true;
        cleanup();
        if (frameTransportBroken) { frameTransportBroken = false; writeTransportMemo(false); }
        var payload = data.payload;
        if (!payload || payload.ok !== true) {
          reject(new Error(payload && payload.error && payload.error.message
            ? payload.error.message
            : "Permintaan ke GAS gagal."));
          return;
        }
        resolve(payload.result);
      }

      // Iframe menyala berarti POST-nya sampai dan Apps Script sudah menjawab;
      // sisa penantian tinggal frame googleusercontent mengirim balik, dan itu
      // hitungan detik. Chrome membangkitkan satu load untuk about:blank saat
      // iframe disisipkan, jadi load pertama yang datang seketika diabaikan.
      // Setiap load menyetel ulang tenggat, sehingga urutan yang tidak terduga
      // pun tetap aman.
      iframe.addEventListener("load", function () {
        loadCount += 1;
        if (settled) return;
        if (loadCount < 2 && Date.now() - submittedAt < 1500) return;
        window.clearTimeout(replyTimer);
        replyTimer = window.setTimeout(function () {
          fail("balasan-diblokir",
            "Server sudah menjawab, tetapi balasannya tidak sampai ke halaman ini. " +
            "Peramban menahan frame googleusercontent.com milik Apps Script.");
        }, REPLY_GRACE);
      });

      var timeoutId = window.setTimeout(function () {
        fail("tanpa-jawaban",
          "Permintaan tidak pernah selesai dikirim ke server. Sambungan, proxy, " +
          "atau antivirus menahan script.google.com.");
      }, REQUEST_TIMEOUTS[method] || 360000);

      window.addEventListener("message", receiveMessage);
      host.appendChild(iframe);
      host.appendChild(form);
      submittedAt = Date.now();
      form.submit();
    });
  }

  // Jalur cadangan: <script> JSONP. Muatan <script> tidak menyentuh cookie
  // pihak ketiga dan tidak butuh frame sama sekali, jadi tetap hidup di mesin
  // yang menutup googleusercontent.com. Backend harus punya cabang doGet yang
  // membalas JSONP; selama belum ada, percobaan pertama gagal cepat lalu jalur
  // ini tidak dicoba lagi sepanjang sesi.
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

  function requestServer(method, args) {
    // Selama transport iframe masih sehat, tidak ada gunanya menambah
    // permintaan kedua. Jalur cadangan baru dipakai setelah iframe terbukti
    // gagal di perangkat ini, dan berhenti dicoba begitu server menolaknya.
    if (frameTransportBroken && scriptTransport !== "tidak-ada") {
      return requestViaScript(method, args).catch(function (error) {
        if (error && error.transportCode === "cadangan-belum-ada") {
          return requestViaFrame(method, args);
        }
        throw error;
      });
    }
    return requestViaFrame(method, args);
  }

  // Chrome memblokir cookie pihak ketiga secara bawaan dan frame
  // googleusercontent milik Apps Script ikut terkena. requestStorageAccessFor
  // adalah satu-satunya tuas yang dimiliki halaman induk untuk memintanya
  // kembali, dan hanya sah dipanggil sewaktu ada interaksi pengguna — jadi
  // pemanggilnya adalah penangan klik tombol, bukan kode pemuatan halaman.
  function primeThirdPartyAccess() {
    if (typeof document.requestStorageAccessFor !== "function") {
      return Promise.resolve(false);
    }
    return document.requestStorageAccessFor("https://script.google.com")
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  function requestAndCacheDashboard(method, args) {
    return requestServer(method, args).then(function (result) {
      writeClientCache(DASHBOARD_CACHE_KEY, result).catch(function () {});
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
        writeClientCache(DASHBOARD_CACHE_KEY, result).catch(function () {});
      } else if (MUTATING_METHODS[method]) {
        deleteClientCache(DASHBOARD_CACHE_KEY);
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
    return { frame: frameTransportBroken ? "gagal" : "sehat", cadangan: scriptTransport };
  };
})();
