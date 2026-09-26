(function () {
  'use strict';
  var KEY = 'pgm:spk-auth-v1';
  var LOGIN = '/login/';
  var PPIC = ['admin_ppic', 'asmen_ppic', 'manager_ppic', 'senior_manager', 'general_manager'];
  var PRODUCTION = ['admin_produksi', 'operator_produksi', 'head_mixer', 'head_blowing', 'head_printing', 'head_slitting', 'head_folding', 'head_gusset', 'head_finishing'];
  var MANAGEMENT = ['senior_manager', 'general_manager'];
  var rules = [
    [/^\/pages\/ppic\//, PPIC],
    [/^\/pages\/production\//, PRODUCTION.concat(PPIC)],
    [/^\/pages\/marketing\//, ['marketing'].concat(MANAGEMENT)],
    [/^\/pages\/purchasing\//, ['purchasing'].concat(MANAGEMENT)],
    [/^\/pages\/finance\//, ['finance'].concat(MANAGEMENT)],
    [/^\/pages\/admin\//, ['admin_portal', 'admin_ppic'].concat(MANAGEMENT)],
    [/^\/pages\/support\//, ['support', 'admin_portal'].concat(MANAGEMENT)],
    [/^\/apps\/spk-automation\/schedule\//, PPIC],
    [/^\/apps\/spk-automation\/production\//, PRODUCTION.concat(PPIC)],
    [/^\/apps\/spk-automation\/create-spk\//, ['admin_ppic']],
    [/^\/apps\/spk-automation\/print-spk\//, PPIC],
    [/^\/apps\/spk-automation\/material-management\//, PPIC],
    [/^\/apps\/spk-automation\/material-issue\//, PPIC],
    [/^\/apps\/spk-automation\/data-retrieval\//, PPIC],
    [/^\/apps\/spk-automation\/handover\//, PPIC.concat(PRODUCTION)],
    [/^\/apps\/spk-automation\/dashboard\//, PPIC],
    [/^\/apps\/spk-automation\/approval\//, null],
    [/^\/apps\/spk-automation\//, PPIC]
  ];
  function stored() {
    for (var i = 0, stores = [sessionStorage, localStorage]; i < stores.length; i++) {
      try {
        var value = JSON.parse(stores[i].getItem(KEY) || 'null');
        if (value && value.token) return value;
      } catch (ignore) {}
    }
    return null;
  }
  function clear() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (ignore) {} }
  function allowed(path, role) {
    for (var i = 0; i < rules.length; i++) {
      if (rules[i][0].test(path)) return !rules[i][1] || rules[i][1].indexOf(role) !== -1;
    }
    return Boolean(role);
  }
  function safeNext(value) {
    var path = String(value || '/');
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\x00-\x1f]/.test(path)) return '/';
    return path;
  }
  function loginUrl() { return LOGIN + '?next=' + encodeURIComponent(location.pathname + location.search + location.hash); }
  function rpc(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      runner[method].apply(runner, args);
    });
  }
  function show(user) {
    document.documentElement.classList.remove('pgm-auth-pending');
    var bar = document.createElement('div');
    bar.className = 'pgm-auth-bar';
    var label = document.createElement('span');
    label.textContent = (user.name || user.email || 'Pengguna') + ' · ' + (user.roleLabel || user.roleKey || '');
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Keluar';
    button.onclick = function () {
      var auth = stored();
      clear();
      location.replace(LOGIN);
      if (auth) rpc('logoutApprovalUser', auth.token).catch(function () {});
    };
    bar.appendChild(label); bar.appendChild(button); document.body.appendChild(bar);
  }
  var style = document.createElement('style');
  style.textContent = 'html.pgm-auth-pending body{visibility:hidden}.pgm-auth-bar{position:fixed;z-index:99999;right:12px;bottom:12px;display:flex;align-items:center;gap:9px;max-width:calc(100vw - 24px);padding:7px 9px;border:1px solid #b9c2bd;border-radius:8px;background:#fff;color:#26312b;box-shadow:0 3px 12px #0002;font:12px system-ui,sans-serif}.pgm-auth-bar button{padding:5px 9px;border:1px solid #9d2028;border-radius:5px;background:#ab2029;color:#fff;cursor:pointer}';
  document.head.appendChild(style);
  document.documentElement.classList.add('pgm-auth-pending');
  var auth = stored();
  if (!auth) { location.replace(loginUrl()); return; }
  window.POLYTA_PORTAL_AUTH = { stored: stored, allowed: allowed, safeNext: safeNext, clear: clear };
  function verify() {
    rpc('getApprovalSession', auth.token).then(function (result) {
      if (!result || result.status !== 'success' || !result.user) throw new Error('Sesi berakhir.');
      if (!allowed(location.pathname, result.user.roleKey)) {
        location.replace('/?akses=ditolak');
        return;
      }
      auth.user = result.user;
      try { (auth.remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(auth)); } catch (ignore) {}
      show(result.user);
    }).catch(function () { clear(); location.replace(loginUrl()); });
  }
  function start() {
    if (window.google && window.google.script && window.google.script.run) { verify(); return; }
    var script = document.createElement('script');
    script.src = '/assets/js/gas-rpc.js?v=20260926-2';
    script.onload = verify;
    script.onerror = function () { clear(); location.replace(loginUrl()); };
    document.head.appendChild(script);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
