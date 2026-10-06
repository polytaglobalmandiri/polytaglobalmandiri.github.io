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
  var previewUrl = '';

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
      : '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Simpan Semua';
  }
  function renderQueue() {
    var list = element('spkDocQueue');
    list.replaceChildren();
    queue.forEach(function (item) {
      var row = document.createElement('li');
      row.className = item.saved ? 'is-saved' : item.error ? 'is-failed' : '';
      var name = document.createElement('strong');
      name.textContent = item.file.name;
      var detail = document.createElement('small');
      detail.textContent = item.type + ' · ' + formatSize(item.file.size) + ' · ' +
        (item.saved ? 'Tersimpan' : item.error || 'Siap diunggah');
      row.append(name, detail);
      var actions = document.createElement('div');
      actions.className = 'spk-doc-queue-actions';
      var preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'button';
      preview.textContent = 'Preview';
      preview.disabled = busy;
      preview.addEventListener('click', function () { showPreview(item); });
      actions.appendChild(preview);
      if (!item.saved) {
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'button';
        remove.textContent = 'Hapus';
        remove.disabled = busy;
        remove.addEventListener('click', function () {
          if (busy) return;
          clearPreview();
          queue = queue.filter(function (entry) { return entry !== item; });
          renderQueue();
          setBusy(false);
          status('File dihapus dari antrean, bukan dari Google Drive.');
        });
        actions.appendChild(remove);
      }
      row.appendChild(actions);
      list.appendChild(row);
    });
  }
  function clearPreview() {
    element('spkDocPreviewContent').replaceChildren();
    element('spkDocPreview').hidden = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
  function showPreview(item) {
    clearPreview();
    var extension = item.file.name.split('.').pop().toLowerCase();
    var mime = extension === 'pdf' ? 'application/pdf' :
      extension === 'png' ? 'image/png' : /jpe?g/.test(extension) ? 'image/jpeg' :
      'application/octet-stream';
    previewUrl = URL.createObjectURL(item.file.slice(0, item.file.size, mime));
    element('spkDocPreviewTitle').textContent = item.type + ' · ' + item.file.name;
    var content = element('spkDocPreviewContent');
    if (mime === 'application/pdf') {
      var frame = document.createElement('iframe');
      frame.title = 'Preview PDF ' + item.file.name;
      frame.src = previewUrl;
      content.appendChild(frame);
    } else if (mime.indexOf('image/') === 0) {
      var image = document.createElement('img');
      image.alt = item.file.name;
      image.src = previewUrl;
      image.onerror = function () {
        content.textContent = 'Gambar tidak dapat ditampilkan. Periksa file dengan aplikasi perangkat.';
      };
      content.appendChild(image);
    } else {
      var info = document.createElement('p');
      info.textContent = item.file.name + ' · ' + formatSize(item.file.size) +
        '. Preview isi Word/Excel tidak tersedia di browser. Unduh salinan untuk dibuka dengan aplikasi perangkat.';
      content.appendChild(info);
    }
    var download = document.createElement('a');
    download.href = previewUrl;
    download.download = item.file.name;
    download.className = 'button';
    download.textContent = 'Unduh / Buka di Perangkat';
    content.appendChild(download);
    element('spkDocPreview').hidden = false;
    element('spkDocPreview').scrollIntoView({ block: 'nearest' });
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
      heading.textContent = type;
      var count = document.createElement('span');
      count.className = 'spk-doc-count';
      count.textContent = files.length + ' file';
      heading.appendChild(count);
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
        icon.className = /\.pdf$/i.test(file.name) ? 'fa-solid fa-file-pdf' :
          /\.docx?$/i.test(file.name) ? 'fa-solid fa-file-word' :
          /\.xlsx?$/i.test(file.name) ? 'fa-solid fa-file-excel' : 'fa-solid fa-file-image';
        icon.setAttribute('aria-hidden', 'true');
        var copy = document.createElement('div');
        var link = document.createElement('a');
        if (!/^https:\/\/drive\.google\.com\//.test(file.url)) throw new Error('Tautan dokumen tidak valid.');
        link.href = file.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = file.name;
        var meta = document.createElement('small');
        meta.textContent = formatSize(file.size) + ' · ' + new Date(file.uploadedAt).toLocaleString('id-ID');
        var uploader = document.createElement('small');
        uploader.textContent = 'Diunggah oleh ' + file.uploadedBy;
        copy.append(link, meta, uploader);
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
      var additions = files.map(function (file) {
        return { file: file, type: type, uploadId: crypto.randomUUID(), saved: false, error: '' };
      });
      queue = queue.concat(additions);
      status(files.length ? files.length + ' file ' + type + ' ditambahkan. Tambahkan kategori lain atau klik Simpan Semua.' : '');
    } catch (error) {
      status(error.message, 'error');
    }
    element('spkDocFiles').value = '';
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
        item.error = error.message + ' Klik Simpan Semua untuk mencoba lagi.';
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
      '<div class="modal-header"><div class="spk-doc-header-copy"><span class="spk-doc-header-icon" aria-hidden="true">' +
      '<i class="fa-solid fa-folder-open"></i></span><div><h2 class="modal-title" id="spkDocTitle">Dokumen SPK</h2>' +
      '<p class="modal-subtitle" id="spkDocSpk"></p></div>' +
      '</div>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>' +
      '<div class="modal-body"><section class="spk-doc-upload" aria-labelledby="spkDocUploadTitle">' +
      '<div class="spk-doc-section-heading"><div><h3 id="spkDocUploadTitle">Upload dokumen</h3>' +
      '<p>Tambahkan file PO, PHJ, dan TDS, periksa preview, lalu simpan sekaligus.</p></div><span class="spk-doc-limit">Maks. 10 MB / file</span></div>' +
      '<div class="spk-doc-upload-fields"><div><label for="spkDocType">Jenis dokumen</label>' +
      '<select id="spkDocType" class="form-select"><option>PO</option><option>PHJ</option><option>TDS</option></select></div>' +
      '<div><span class="spk-doc-field-label">Lampiran</span><button id="spkDocAdd" type="button" class="button spk-doc-add">' +
      '<i class="fa-solid fa-plus" aria-hidden="true"></i> Tambah File</button>' +
      '<input id="spkDocFiles" type="file" hidden multiple aria-label="Tambah file dokumen" aria-describedby="spkDocFormats" ' +
      'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"></div></div>' +
      '<p id="spkDocFormats" class="spk-doc-help">PDF, JPG/PNG, Word, atau Excel. Bisa pilih beberapa file sekaligus.</p>' +
      '<ul id="spkDocQueue" class="spk-doc-queue"></ul>' +
      '<section id="spkDocPreview" class="spk-doc-preview" hidden aria-labelledby="spkDocPreviewTitle">' +
      '<div class="spk-doc-preview-heading"><strong id="spkDocPreviewTitle"></strong>' +
      '<button id="spkDocPreviewClose" type="button" class="button" aria-label="Tutup preview">Tutup Preview</button></div>' +
      '<div id="spkDocPreviewContent"></div></section>' +
      '<button id="spkDocSave" type="button" class="button button-primary" disabled>Simpan Semua</button>' +
      '<div id="spkDocStatus" class="spk-doc-status" role="status" aria-live="polite"></div></section>' +
      '<div class="spk-doc-list-heading"><h3>Dokumen tersimpan</h3>' +
      '<button id="spkDocRefresh" type="button" class="button"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Segarkan</button></div>' +
      '<div id="spkDocList" aria-live="polite"></div></div><div class="modal-footer">' +
      '<span class="spk-doc-footer-note"><i class="fa-solid fa-lock" aria-hidden="true"></i> Akses file mengikuti izin Google Drive.</span>' +
      '<button type="button" class="button" data-bs-dismiss="modal">Tutup</button></div></div></div>';
    document.body.appendChild(modalElement);
    modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    element('spkDocFiles').addEventListener('change', selectFiles);
    element('spkDocAdd').addEventListener('click', function () { element('spkDocFiles').click(); });
    element('spkDocPreviewClose').addEventListener('click', clearPreview);
    element('spkDocSave').addEventListener('click', upload);
    element('spkDocRefresh').addEventListener('click', function () { refresh(false); });
    modalElement.addEventListener('hide.bs.modal', function (event) {
      if (busy) { event.preventDefault(); return; }
      sequence++;
    });
    modalElement.addEventListener('hidden.bs.modal', function () { clearPreview(); queue = []; renderQueue(); });
  }
  function open(spk) {
    if (busy) return;
    if (!window.bootstrap || !bootstrap.Modal) {
      throw new Error('Komponen dialog belum tersedia. Muat ulang halaman.');
    }
    init();
    clearPreview();
    currentSpk = String(spk || '').trim();
    queue = [];
    element('spkDocSpk').textContent = 'SPK ' + currentSpk + ' · PO / PHJ / TDS';
    element('spkDocFiles').value = '';
    element('spkDocType').value = 'PO';
    renderQueue();
    status('');
    setBusy(false);
    modal.show();
    refresh();
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('#manageDocumentsButton');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (busy || button.disabled) return;
    var manageElement = element('manageModal');
    var spk = button.dataset.spk;
    button.disabled = true;
    manageElement.addEventListener('hidden.bs.modal', function () {
      button.disabled = false;
      open(spk);
    }, { once: true });
    bootstrap.Modal.getOrCreateInstance(manageElement).hide();
  }, true);
  window.addEventListener('beforeunload', function (event) {
    if (busy) { event.preventDefault(); event.returnValue = ''; }
  });
  window.POLYTA_SPK_DOCUMENTS = { open: open };
})();
