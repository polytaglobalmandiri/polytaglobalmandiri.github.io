(function () {
  'use strict';
  var KEY = 'pgm:spk-auth-v1';
  var LOGIN = '/login/';
  var PPIC = ['admin_ppic', 'asmen_ppic', 'manager_ppic', 'senior_manager', 'general_manager'];
  var PRODUCTION = ['admin_produksi', 'operator_produksi', 'head_mixer', 'head_blowing', 'head_printing', 'head_slitting', 'head_folding', 'head_gusset', 'head_finishing'];
  var rules = [
    [/^\/apps\/spk-automation\/schedule\//, PPIC],
    [/^\/apps\/spk-automation\/admin\//, []],
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
  function allowed(path, role, permissions, isOwner) {
    if (isOwner) return true;
    var pages = permissions && permissions.pages || {};
    var cleanPath = String(path || '/').replace(/index\.html$/, '');
    if (Object.prototype.hasOwnProperty.call(pages, cleanPath)) return pages[cleanPath] === true;
    for (var i = 0; i < rules.length; i++) {
      if (rules[i][0].test(cleanPath)) return !rules[i][1] || rules[i][1].indexOf(role) !== -1;
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
  function withBody(callback) {
    if (document.body) callback();
    else document.addEventListener('DOMContentLoaded', callback, { once: true });
  }
  function afterParsed(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  }
  var authBarCleanup = null;
  function authIcon(name) {
    var paths = {
      user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      shield: '<path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-3.9"/>',
      logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>'
    };
    var span = document.createElement('span');
    span.className = 'pgm-auth-icon';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24">' + paths[name] + '</svg>';
    return span;
  }
  function show(user) {
    document.documentElement.classList.remove('pgm-auth-pending');
    if (authBarCleanup) authBarCleanup();
    var previousBar = document.querySelector('.pgm-auth-bar');
    if (previousBar) previousBar.remove();
    var bar = document.createElement('div');
    bar.className = 'pgm-auth-bar';

    var panel = document.createElement('div');
    panel.className = 'pgm-auth-panel';
    panel.id = 'pgmAuthPanel';
    panel.hidden = true;

    var profile = document.createElement('div');
    profile.className = 'pgm-auth-profile';
    var avatar = document.createElement('span');
    avatar.className = 'pgm-auth-avatar';
    avatar.textContent = String(user.name || user.email || 'P').trim().charAt(0).toUpperCase();
    var identity = document.createElement('span');
    identity.className = 'pgm-auth-identity';
    var name = document.createElement('strong');
    name.textContent = user.name || user.email || 'Pengguna';
    var role = document.createElement('span');
    role.textContent = user.roleLabel || user.roleKey || 'Pengguna portal';
    identity.appendChild(name);
    identity.appendChild(role);
    if (user.email && user.email !== user.name) {
      var email = document.createElement('small');
      email.textContent = user.email;
      identity.appendChild(email);
    }
    profile.appendChild(avatar);
    profile.appendChild(identity);
    panel.appendChild(profile);

    var accountState = document.createElement('div');
    accountState.className = 'pgm-auth-state';
    accountState.innerHTML = '<i aria-hidden="true"></i><span>Akun aktif</span>';
    panel.appendChild(accountState);

    var actions = document.createElement('div');
    actions.className = 'pgm-auth-actions';
    if (user.isOwner) {
      var accessLink = document.createElement('a');
      accessLink.href = '/apps/spk-automation/admin/';
      accessLink.appendChild(authIcon('shield'));
      var accessCopy = document.createElement('span');
      accessCopy.innerHTML = '<strong>Kelola akses</strong><small>Atur pengguna dan wewenang</small>';
      accessLink.appendChild(accessCopy);
      accessLink.appendChild(authIcon('chevron'));
      actions.appendChild(accessLink);
    }
    var logoutButton = document.createElement('button');
    logoutButton.className = 'pgm-auth-logout';
    logoutButton.type = 'button';
    logoutButton.appendChild(authIcon('logout'));
    var logoutCopy = document.createElement('span');
    logoutCopy.innerHTML = '<strong>Keluar</strong><small>Akhiri sesi portal</small>';
    logoutButton.appendChild(logoutCopy);
    logoutButton.onclick = function () {
      var auth = stored();
      clear();
      location.replace(LOGIN);
      if (auth) rpc('logoutApprovalUser', auth.token).catch(function () {});
    };
    actions.appendChild(logoutButton);
    panel.appendChild(actions);

    var trigger = document.createElement('button');
    trigger.className = 'pgm-auth-trigger';
    trigger.type = 'button';
    trigger.title = 'Akun dan akses';
    trigger.setAttribute('aria-label', 'Buka menu akun');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.appendChild(authIcon('user'));
    var indicator = document.createElement('span');
    indicator.className = 'pgm-auth-online';
    indicator.setAttribute('aria-hidden', 'true');
    trigger.appendChild(indicator);

    function setOpen(open) {
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      trigger.setAttribute('aria-label', open ? 'Tutup menu akun' : 'Buka menu akun');
      bar.classList.toggle('is-open', open);
    }
    trigger.onclick = function (event) {
      event.stopPropagation();
      setOpen(panel.hidden);
    };
    panel.onclick = function (event) { event.stopPropagation(); };
    function closeFromOutside() { setOpen(false); }
    function closeFromKeyboard(event) {
      if (event.key === 'Escape' && !panel.hidden) { setOpen(false); trigger.focus(); }
    }
    document.addEventListener('click', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    authBarCleanup = function () {
      document.removeEventListener('click', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
      authBarCleanup = null;
    };

    bar.appendChild(panel);
    bar.appendChild(trigger);
    document.body.appendChild(bar);
  }
  var style = document.createElement('style');
  style.textContent = [
    'html.pgm-auth-pending{background:#f3f4f2}',
    'html.pgm-auth-pending body{visibility:hidden}',
    'html.pgm-auth-pending::before{content:"Memeriksa akses portal...";position:fixed;inset:0;display:grid;place-items:center;color:#526058;font:600 14px system-ui,sans-serif}',
    '.pgm-auth-bar{position:fixed;z-index:99999;right:18px;bottom:18px;color:#25282e;font:13px Inter,system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.pgm-auth-trigger{position:relative;width:52px;height:52px;display:grid;place-items:center;padding:0;border:1px solid #ffffff30;border-radius:17px;background:linear-gradient(145deg,#ca203a,#9f1027);color:#fff;box-shadow:0 13px 30px #6f0b1f35,0 4px 10px #1113,inset 0 1px #ffffff45;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-radius .18s ease}',
    '.pgm-auth-trigger:hover{transform:translateY(-2px);box-shadow:0 17px 34px #6f0b1f40,0 5px 12px #1114,inset 0 1px #ffffff45}',
    '.pgm-auth-trigger:active{transform:translateY(0) scale(.97)}',
    '.pgm-auth-trigger:focus-visible{outline:3px solid #d1264050;outline-offset:4px}',
    '.pgm-auth-bar.is-open .pgm-auth-trigger{border-radius:50%;background:linear-gradient(145deg,#30333b,#1d1f25)}',
    '.pgm-auth-icon{width:21px;height:21px;display:grid;place-items:center;flex:none}',
    '.pgm-auth-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.pgm-auth-online{position:absolute;right:1px;bottom:2px;width:12px;height:12px;border:3px solid #fff;border-radius:50%;background:#2fb46e}',
    '.pgm-auth-panel{position:absolute;right:0;bottom:calc(100% + 12px);width:min(330px,calc(100vw - 28px));overflow:hidden;border:1px solid #dfe1e5;border-radius:18px;background:#fff;box-shadow:0 22px 60px #15182028,0 5px 16px #15182014;transform-origin:calc(100% - 25px) 100%;animation:pgm-auth-in .2s cubic-bezier(.2,.75,.25,1) both}',
    '.pgm-auth-panel[hidden]{display:none}',
    '@keyframes pgm-auth-in{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '.pgm-auth-profile{display:flex;align-items:center;gap:13px;padding:18px 18px 13px;background:linear-gradient(145deg,#fff,#fafafa)}',
    '.pgm-auth-avatar{width:46px;height:46px;display:grid;place-items:center;flex:none;border-radius:14px;background:linear-gradient(145deg,#c91e38,#a61029);color:#fff;box-shadow:0 7px 16px #b317302d,inset 0 1px #ffffff48;font-size:18px;font-weight:800}',
    '.pgm-auth-identity{min-width:0;display:block}',
    '.pgm-auth-identity strong,.pgm-auth-identity span,.pgm-auth-identity small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pgm-auth-identity strong{color:#202329;font-size:14px;font-weight:800;line-height:1.35}',
    '.pgm-auth-identity span{margin-top:2px;color:#a8172e;font-size:11px;font-weight:750;letter-spacing:.035em}',
    '.pgm-auth-identity small{margin-top:4px;color:#828a95;font-size:10px}',
    '.pgm-auth-state{display:flex;align-items:center;gap:7px;margin:0 18px 12px;padding:8px 10px;border:1px solid #dcede3;border-radius:9px;background:#f4faf6;color:#47705a;font-size:10px;font-weight:700}',
    '.pgm-auth-state i{width:7px;height:7px;border-radius:50%;background:#2eae69;box-shadow:0 0 0 3px #2eae691b}',
    '.pgm-auth-actions{padding:7px;border-top:1px solid #ebecef}',
    '.pgm-auth-actions a,.pgm-auth-actions button{width:100%;min-height:52px;display:flex;align-items:center;gap:12px;padding:9px 11px;border:0;border-radius:11px;background:transparent;color:#363b43;text-align:left;text-decoration:none;cursor:pointer;transition:background .15s ease,color .15s ease}',
    '.pgm-auth-actions a:hover,.pgm-auth-actions a:focus-visible{outline:none;background:#f5f2f3;color:#a4162c}',
    '.pgm-auth-actions button:hover,.pgm-auth-actions button:focus-visible{outline:none;background:#fff0f1;color:#a4162c}',
    '.pgm-auth-actions a>span:nth-child(2),.pgm-auth-actions button>span:nth-child(2){min-width:0;flex:1}',
    '.pgm-auth-actions strong,.pgm-auth-actions small{display:block}',
    '.pgm-auth-actions strong{font-size:12px;font-weight:800}',
    '.pgm-auth-actions small{margin-top:2px;color:#8b929c;font-size:10px}',
    '.pgm-auth-actions a>.pgm-auth-icon:last-child{width:15px;height:15px;color:#a7adb5}',
    '.pgm-auth-logout>.pgm-auth-icon{color:#b01930}',
    '@media(max-width:480px){.pgm-auth-bar{right:14px;bottom:14px}.pgm-auth-trigger{width:48px;height:48px;border-radius:15px}.pgm-auth-panel{width:min(320px,calc(100vw - 28px))}}',
    '@media(prefers-reduced-motion:reduce){.pgm-auth-trigger,.pgm-auth-actions a,.pgm-auth-actions button{transition-duration:.01ms}.pgm-auth-panel{animation-duration:.01ms}}'
  ].join('');
  document.head.appendChild(style);
  document.documentElement.classList.add('pgm-auth-pending');
  var auth = stored();
  if (!auth) { location.replace(loginUrl()); return; }
  var cachedViewAllowed = Boolean(auth.user && Number(auth.user.expiresAt) > Date.now() &&
    allowed(location.pathname, auth.user.roleKey, auth.user.permissions, auth.user.isOwner));
  if (cachedViewAllowed) {
    document.documentElement.classList.remove('pgm-auth-pending');
    withBody(function () { if (cachedViewAllowed) show(auth.user); });
  }
  var resolveReady;
  var ready = new Promise(function (resolve) { resolveReady = resolve; });
  window.POLYTA_PORTAL_AUTH = { stored: stored, allowed: allowed, safeNext: safeNext, clear: clear, ready: ready };
  function endSession() {
    cachedViewAllowed = false;
    document.documentElement.classList.add('pgm-auth-pending');
    resolveReady(null);
    clear();
    location.replace(loginUrl());
  }
  function connectionFailure() {
    if (cachedViewAllowed) { resolveReady(auth.user); return; }
    resolveReady(null);
    location.replace(loginUrl());
  }
  function verify() {
    rpc('getApprovalSession', auth.token).then(function (result) {
      if (!result || result.status !== 'success' || !result.user) { endSession(); return; }
      if (!allowed(location.pathname, result.user.roleKey, result.user.permissions, result.user.isOwner)) {
        cachedViewAllowed = false;
        document.documentElement.classList.add('pgm-auth-pending');
        afterParsed(function () {
          document.body.textContent = '';
          var denied = document.createElement('main');
          denied.style.cssText = 'max-width:520px;margin:15vh auto;padding:28px;font:16px system-ui,sans-serif;color:#26312b';
          denied.innerHTML = '<h1>Akses dibatasi</h1><p>Akun Anda belum diizinkan membuka halaman ini. Hubungi akun master untuk meminta akses.</p><a href="/">Kembali ke Portal Operasional</a>';
          document.body.appendChild(denied);
          show(result.user);
        });
        resolveReady(null);
        return;
      }
      auth.user = result.user;
      cachedViewAllowed = true;
      try { (auth.remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(auth)); } catch (ignore) {}
      withBody(function () { show(result.user); });
      resolveReady(result.user);
    }, connectionFailure).catch(connectionFailure);
  }
  function start() {
    if (window.google && window.google.script && window.google.script.run) { verify(); return; }
    var script = document.createElement('script');
    script.src = '/assets/js/gas-rpc.js?v=20260926-2';
    script.onload = verify;
    script.onerror = connectionFailure;
    document.head.appendChild(script);
  }
  start();
})();
