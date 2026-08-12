(function () {
  "use strict";

  var API_URL = "https://script.google.com/macros/s/AKfycbzEml-brh_-SmKAsvd-1iFy6nelvc9YENtn-bkjD1T6UUgX7QNBE0ycjU02QEfY-91aXQ/exec";
  var requestSequence = 0;
  var CACHE_DATABASE = "polyta-spk-client-cache";
  var CACHE_STORE = "responses";
  var DASHBOARD_CACHE_KEY = "dashboard-data-v1";
  var DASHBOARD_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
  var MUTATING_METHODS = {
    saveSpkYearPreference: true,
    markSpkReleasedForPrint: true,
    updateSpkFromDashboard: true,
    saveCustomerMaster: true,
    saveBrandMaster: true,
    submitDatabase: true,
    saveEtaBeliBahanScheduleByManager: true,
    updateEtaBeliBahanByManager: true,
    updateKeluarBahanByManager: true,
    saveHandover: true,
    beginExtractionJob: true,
    extractData: true,
    cancelExtractionJob: true
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

  function requestServer(method, args) {
    return new Promise(function (resolve, reject) {
      requestSequence += 1;
      var requestId = "spk-" + Date.now().toString(36) + "-" + requestSequence.toString(36);
      var frameName = "polytaGasRpcFrame-" + requestId;
      var iframe = document.createElement("iframe");
      var form = document.createElement("form");
      var input = document.createElement("input");
      var host = document.body || document.documentElement;
      var settled = false;

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
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }

      function receiveMessage(event) {
        var data = event.data;
        if (settled || !data ||
            data.source !== "polyta-spk-gas-rpc" || data.requestId !== requestId) return;

        settled = true;
        cleanup();
        var payload = data.payload;
        if (!payload || payload.ok !== true) {
          reject(new Error(payload && payload.error && payload.error.message
            ? payload.error.message
            : "Permintaan ke GAS gagal."));
          return;
        }
        resolve(payload.result);
      }

      var timeoutId = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Server GAS belum merespons. Silakan coba kembali."));
      }, 360000);

      window.addEventListener("message", receiveMessage);
      host.appendChild(iframe);
      host.appendChild(form);
      form.submit();
    });
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
      return readClientCache(DASHBOARD_CACHE_KEY).then(function (cached) {
        if (!cached || !cached.value || Date.now() - Number(cached.savedAt || 0) > DASHBOARD_CACHE_MAX_AGE) {
          return requestAndCacheDashboard(method, args);
        }

        // Data tersimpan ditampilkan segera. Salinan terbaru diambil tanpa
        // menahan render; pemeriksa revisi Dashboard menangani perubahan aktif.
        window.setTimeout(function () {
          requestAndCacheDashboard(method, args).catch(function () {});
        }, 800);
        return cached.value;
      }).catch(function () {
        return requestAndCacheDashboard(method, args);
      });
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
})();
