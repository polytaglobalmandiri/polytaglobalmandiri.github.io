(function () {
  'use strict';

  var KEY = 'pgm:spk-auth-v1';
  var params = new URLSearchParams(location.search);
  var next = String(params.get('next') || '/');
  if (!next.startsWith('/') || next.startsWith('//') || /[\\\x00-\x1f]/.test(next) || next.startsWith('/login/')) next = '/';

  function rpc(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      runner[method].apply(runner, args);
    });
  }

  function saved() {
    for (var i = 0, stores = [sessionStorage, localStorage]; i < stores.length; i++) {
      try {
        var data = JSON.parse(stores[i].getItem(KEY) || 'null');
        if (data && data.token) return data;
      } catch (ignore) {}
    }
    return null;
  }

  var form = document.getElementById('loginForm');
  var email = document.getElementById('email');
  var password = document.getElementById('password');
  var submit = document.getElementById('submit');
  var submitLabel = document.getElementById('submitLabel');
  var message = document.getElementById('message');
  var toggle = document.getElementById('togglePassword');
  var capsHint = document.getElementById('capsHint');

  function setBusy(busy) {
    submit.disabled = busy;
    submit.classList.toggle('is-loading', busy);
    submitLabel.textContent = busy ? 'Memeriksa akun...' : 'Masuk ke portal';
  }

  function clearMessage() {
    message.textContent = '';
    email.removeAttribute('aria-invalid');
    password.removeAttribute('aria-invalid');
  }

  email.addEventListener('input', clearMessage);
  password.addEventListener('input', clearMessage);
  password.addEventListener('keyup', function (event) {
    capsHint.hidden = !event.getModifierState('CapsLock');
  });
  password.addEventListener('blur', function () { capsHint.hidden = true; });
  toggle.addEventListener('click', function () {
    var visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Sembunyikan' : 'Lihat';
    toggle.setAttribute('aria-label', visible ? 'Sembunyikan password' : 'Tampilkan password');
    toggle.setAttribute('aria-pressed', String(visible));
    password.focus();
  });

  var existing = saved();
  if (existing) {
    rpc('getApprovalSession', existing.token).then(function (result) {
      if (result && result.status === 'success') location.replace(next);
    }).catch(function () {});
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessage();
    setBusy(true);
    try {
      var remember = document.getElementById('remember').checked;
      var result = await rpc('loginApprovalUser', email.value.trim(), password.value, remember);
      if (!result || result.status !== 'success' || !result.token) {
        throw new Error(result && result.message || 'Login gagal.');
      }
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify({
        token: result.token, user: result.user, remember: remember
      }));
      password.value = '';
      location.replace(next);
    } catch (error) {
      message.textContent = error && error.message || 'Tidak dapat masuk.';
      password.setAttribute('aria-invalid', 'true');
      setBusy(false);
    }
  });
})();
