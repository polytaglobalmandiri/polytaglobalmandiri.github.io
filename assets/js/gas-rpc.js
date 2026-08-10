(function () {
  "use strict";

  var API_URL = "https://script.google.com/macros/s/AKfycbzEml-brh_-SmKAsvd-1iFy6nelvc9YENtn-bkjD1T6UUgX7QNBE0ycjU02QEfY-91aXQ/exec";
  var requestSequence = 0;

  function callServer(method, args) {
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
