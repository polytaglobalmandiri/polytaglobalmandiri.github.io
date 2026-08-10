(function () {
  "use strict";

  var API_URL = "https://script.google.com/macros/s/AKfycbzEml-brh_-SmKAsvd-1iFy6nelvc9YENtn-bkjD1T6UUgX7QNBE0ycjU02QEfY-91aXQ/exec";

  function callServer(method, args) {
    return fetch(API_URL, {
      method: "POST",
      credentials: "omit",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ method: method, args: args })
    }).then(function (response) {
      if (!response.ok) throw new Error("Server GAS merespons HTTP " + response.status + ".");
      return response.text();
    }).then(function (text) {
      var payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error("Respons GAS tidak dapat dibaca. Pastikan deployment Web App dapat diakses.");
      }
      if (!payload || payload.ok !== true) {
        throw new Error(payload && payload.error && payload.error.message
          ? payload.error.message
          : "Permintaan ke GAS gagal.");
      }
      return payload.result;
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
