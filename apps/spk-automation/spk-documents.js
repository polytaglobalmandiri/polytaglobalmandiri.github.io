(function () {
  'use strict';
  var MAX_BYTES = 10 * 1024 * 1024;
  var FORMATS = /\.(pdf|jpe?g|png|docx?|xlsx?)$/i;
  var currentSpk = '';
  var busy = false;
  var sequence = 0;
  var queue = [];
  var modalElement;
  var modal;

  function element(id) { return document.getElementById(id); }
  function rpc(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (resolve, reject) {
      if (!window.google || !google.script || !google.script.run) {
        reject(new Error('Layanan dokumen tidak tersedia. Buka halaman melalui portal.'));
        return;
      }
      var runner = google.script.run.withSuccessHandler(resolve).withFailureHandler(reject);
      runner[method].apply(runner, args);
    });
  }
  function token() {
    var auth = window.POLYTA_PORTAL_AUTH && window.POLYTA_PORTAL_AUTH.stored();
    if (!auth) {
      for (var store of [window.sessionStorage, window.localStorage]) {
        var stored = store.getItem('pgm:spk-auth-v1');
        if (stored) {
          auth = JSON.parse(stored);
          if (auth && auth.token) break;
        }
      }
    }
    if (!auth || !auth.token) throw new Error('Sesi login tidak tersedia. Silakan masuk kembali.');
    return auth.token;
  }
  function status(message, kind) {
    element('spkDocStatus').textContent = message;
    element('spkDocStatus').className = 'spk-doc-status' + (kind ? ' is-' + kind : '');
  }
  function setBusy(value) {
    busy = value;
    modalElement.querySelectorAll('button, input, select').forEach(function (control) {
      control.disabled = value;
    });
    element('spkDocSave').disabled = value || !queue.some(function (item) { return !item.saved; });
    element('spkDocSave').innerHTML = value
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Mengunggah...'
      : '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Upload Dokumen';
  }
  function renderQueue() {
    var list = element('spkDocQueue');
    list.replaceChildren();
    queue.forEach(function (item) {
      var row = document.createElement('li');
      row.className = item.saved ? 'is-saved' : item.error ? 'is-failed' : '';
      row.textContent = item.type + ' - ' + item.file.name + ' (' + formatSize(item.file.size) + ')' +
        (item.saved ? ' - Tersimpan' : item.error ? ' - ' + item.error : ' - Siap diunggah');
      list.appendChild(row);
    });
  }
  function formatSize(bytes) {
    return bytes >= 1024 * 1024
      ? (bytes / (1024 * 1024)).toFixed(1) + ' MB'
      : Math.max(1, Math.ceil(bytes / 1024)) + ' KB';
  }
  function fileBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
      reader.onerror = function () { reject(new Error('File gagal dibaca: ' + file.name)); };
      reader.onabort = function () { reject(new Error('Pembacaan file dibatalkan: ' + file.name)); };
      reader.readAsDataURL(file);
    });
  }
  function renderDocuments(documents) {
    var list = element('spkDocList');
    list.replaceChildren();
    ['PO', 'PHJ', 'TDS'].forEach(function (type) {
      var section = document.createElement('section');
      section.className = 'spk-doc-category';
      var heading = document.createElement('h4');
      var files = documents.filter(function (file) { return file.type === type; });
      heading.textContent = type + ' (' + files.length + ')';
      section.appendChild(heading);
      if (!files.length) {
        var empty = document.createElement('p');
        empty.className = 'spk-doc-empty';
        empty.textContent = 'Belum ada dokumen ' + type + '.';
        section.appendChild(empty);
      }
      files.forEach(function (file) {
        var row = document.createElement('div');
        row.className = 'spk-doc-file';
        var icon = document.createElement('i');
        icon.className = 'fa-solid fa-file-lines';
        icon.setAttribute('aria-hidden', 'true');
        var copy = document.createElement('div');
        var link = document.createElement('a');
        if (!/^https:\/\/drive\.google\.com\//.test(file.url)) throw new Error('Tautan dokumen tidak valid.');
        link.href = file.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = file.name;
        var meta = document.createElement('small');
        meta.textContent = formatSize(file.size) + ' - ' +
          new Date(file.uploadedAt).toLocaleString('id-ID') + ' - ' + file.uploadedBy;
        copy.append(link, meta);
        row.append(icon, copy);
        section.appendChild(row);
      });
      list.appendChild(section);
    });
  }
  async function refresh(preserveStatus) {
    var request = ++sequence;
    var spk = currentSpk;
    element('spkDocList').textContent = 'Memuat dokumen...';
    try {
      var result = await rpc('getSpkDocuments', token(), spk);
      if (request !== sequence) return;
      if (!result || result.status !== 'success' || !Array.isArray(result.documents)) {
        throw new Error(result && result.message || 'Daftar dokumen gagal dimuat.');
      }
      renderDocuments(result.documents);
      if (!preserveStatus) status('');
    } catch (error) {
      if (request !== sequence) return;
      element('spkDocList').textContent = 'Daftar dokumen belum dapat dimuat. Klik Segarkan untuk mencoba kembali.';
      status(error.message, 'error');
      console.error('Daftar dokumen SPK gagal', error);
    }
  }
  function selectFiles() {
    if (busy) return;
    var files = Array.from(element('spkDocFiles').files);
    var type = element('spkDocType').value;
    try {
      files.forEach(function (file) {
        if (!FORMATS.test(file.name)) throw new Error('Format file tidak didukung: ' + file.name);
        if (!file.size || file.size > MAX_BYTES) throw new Error('File harus berisi data dan maksimal 10 MB: ' + file.name);
        if (file.name.length > 180 || /[\u0000-\u001f\\/]/.test(file.name)) throw new Error('Nama file tidak valid: ' + file.name);
      });
      queue = files.map(function (file) {
        return { file: file, type: type, uploadId: crypto.randomUUID(), saved: false, error: '' };
      });
      status(files.length ? files.length + ' file siap diunggah sebagai ' + type + '.' : '');
    } catch (error) {
      queue = [];
      element('spkDocFiles').value = '';
      status(error.message, 'error');
    }
    renderQueue();
    setBusy(false);
  }
  async function upload() {
    if (busy || !queue.some(function (item) { return !item.saved; })) return;
    var authToken;
    try { authToken = token(); }
    catch (error) { status(error.message, 'error'); return; }
    setBusy(true);
    status('Jangan tutup halaman sampai upload selesai.');
    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      if (item.saved) continue;
      try {
        item.error = '';
        status('Mengunggah ' + (i + 1) + '/' + queue.length + ': ' + item.file.name);
        var base64 = await fileBase64(item.file);
        var result = await rpc('saveSpkDocument', authToken, currentSpk, {
          type: item.type, name: item.file.name, uploadId: item.uploadId, base64: base64
        });
        if (!result || result.status !== 'success' || !result.document) {
          throw new Error(result && result.message || 'Upload belum dapat dikonfirmasi.');
        }
        item.saved = true;
      } catch (error) {
        item.error = error.message + ' Klik Upload Dokumen untuk mencoba lagi.';
        console.error('Upload dokumen SPK gagal', error);
      }
      renderQueue();
    }
    var failed = queue.filter(function (item) { return !item.saved; }).length;
    status(failed
      ? (queue.length - failed) + ' file tersimpan, ' + failed + ' file belum berhasil. Coba lagi tanpa memilih ulang file.'
      : queue.length + ' file berhasil disimpan.', failed ? 'error' : 'success');
    await refresh(true);
    setBusy(false);
  }
  function init() {
    if (modalElement) return;
    modalElement = document.createElement('div');
    modalElement.id = 'spkDocumentsModal';
    modalElement.className = 'modal fade';
    modalElement.tabIndex = -1;
    modalElement.setAttribute('aria-labelledby', 'spkDocTitle');
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.innerHTML =
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">' +
      '<div class="modal-header"><div><h2 class="modal-title" id="spkDocTitle">Dokumen SPK</h2>' +
      '<p class="modal-subtitle" id="spkDocSpk"></p></div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>' +
      '<div class="modal-body"><div class="spk-doc-upload">' +
      '<div class="spk-doc-upload-fields"><div><label for="spkDocType">Jenis dokumen</label>' +
      '<select id="spkDocType" class="form-select"><option>PO</option><option>PHJ</option><option>TDS</option></select></div>' +
      '<div><label for="spkDocFiles">Pilih file</label><input id="spkDocFiles" class="form-control" type="file" multiple ' +
      'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"></div></div>' +
      '<p class="spk-doc-help">PDF, JPG/PNG, Word (DOC/DOCX), Excel (XLS/XLSX). Maksimal 10 MB per file. Bisa pilih beberapa file sekaligus.</p>' +
      '<ul id="spkDocQueue" class="spk-doc-queue"></ul>' +
      '<button id="spkDocSave" type="button" class="button button-primary" disabled>Upload Dokumen</button>' +
      '<div id="spkDocStatus" class="spk-doc-status" role="status" aria-live="polite"></div></div>' +
      '<div class="spk-doc-list-heading"><h3>Dokumen tersimpan</h3>' +
      '<button id="spkDocRefresh" type="button" class="button"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Segarkan</button></div>' +
      '<p class="spk-doc-help">Dokumen dibuka di Google Drive. Akses file mengikuti izin folder Drive; upload tidak mengubah izin berbagi.</p>' +
      '<div id="spkDocList"></div></div><div class="modal-footer">' +
      '<button type="button" class="button" data-bs-dismiss="modal">Tutup</button></div></div></div>';
    document.body.appendChild(modalElement);
    modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    element('spkDocFiles').addEventListener('change', selectFiles);
    element('spkDocType').addEventListener('change', selectFiles);
    element('spkDocSave').addEventListener('click', upload);
    element('spkDocRefresh').addEventListener('click', function () { refresh(false); });
    modalElement.addEventListener('hide.bs.modal', function (event) {
      if (busy) { event.preventDefault(); return; }
      sequence++;
    });
  }
  function open(spk) {
    if (busy) return;
    if (!window.bootstrap || !bootstrap.Modal) {
      throw new Error('Komponen dialog belum tersedia. Muat ulang halaman.');
    }
    init();
    currentSpk = String(spk || '').trim();
    queue = [];
    element('spkDocSpk').textContent = currentSpk;
    element('spkDocFiles').value = '';
    element('spkDocType').value = 'PO';
    renderQueue();
    status('');
    setBusy(false);
    modal.show();
    refresh();
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('.spk-documents-button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    open(button.dataset.spk);
  }, true);
  window.addEventListener('beforeunload', function (event) {
    if (busy) { event.preventDefault(); event.returnValue = ''; }
  });
  window.POLYTA_SPK_DOCUMENTS = { open: open };
})();
