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
  var selectedType = 'PO';
  var activePreview = null;

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
    var pending = queue.filter(function (item) { return !item.saved; }).length;
    element('spkDocSave').disabled = value || pending === 0;
    element('spkDocSave').innerHTML = value
      ? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Mengunggah...'
      : '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Simpan Semua' +
        (pending ? ' <span class="spk-doc-save-count">' + pending + '</span>' : '');
    ['PO', 'PHJ', 'TDS'].forEach(function (type) {
      var count = queue.filter(function (item) { return item.type === type && !item.saved; }).length;
      element('spkDocCount' + type).textContent = count || '';
      element('spkDocAdd' + type).setAttribute('aria-label', 'Tambah file ' + type + (count ? ', ' + count + ' belum disimpan' : ''));
    });
    syncPreview();
  }
  function releasePreviewUrl() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
  function syncPreview() {
    if (!activePreview) {
      element('spkDocPreviewTitle').textContent = 'Belum ada preview';
      element('spkDocPreviewIdentity').textContent = 'Pilih + PO, + PHJ, atau + TDS untuk menambahkan dokumen.';
      element('spkDocPreviewPosition').textContent = '0 / 0';
      element('spkDocPreviewState').textContent = '';
      element('spkDocPrevious').disabled = true;
      element('spkDocNext').disabled = true;
      element('spkDocDelete').disabled = true;
      return;
    }
    var index = queue.indexOf(activePreview);
    element('spkDocPreviewTitle').textContent = activePreview.type;
    element('spkDocPreviewIdentity').textContent = activePreview.file.name;
    element('spkDocPreviewPosition').textContent = (index + 1) + ' / ' + queue.length;
    element('spkDocPreviewState').textContent = activePreview.saved
      ? 'Tersimpan di Google Drive'
      : activePreview.error || 'Belum disimpan · ' + formatSize(activePreview.file.size);
    element('spkDocPrevious').disabled = busy || index <= 0;
    element('spkDocNext').disabled = busy || index < 0 || index >= queue.length - 1;
    element('spkDocDelete').disabled = busy || activePreview.saved;
    element('spkDocDelete').title = activePreview.saved
      ? 'Dokumen tersimpan tidak dihapus dari Google Drive'
      : 'Hapus file yang belum disimpan';
  }
  function showPreview(item) {
    if (activePreview === item) return;
    releasePreviewUrl();
    element('spkDocPreviewContent').replaceChildren();
    activePreview = item;
    element('spkDocPreview').hidden = false;
    element('spkDocPreview').classList.add('has-preview');
    syncPreview();
    var extension = item.file.name.split('.').pop().toLowerCase();
    var mime = extension === 'pdf' ? 'application/pdf' :
      extension === 'png' ? 'image/png' : /jpe?g/.test(extension) ? 'image/jpeg' :
      'application/octet-stream';
    if (mime !== 'application/octet-stream') {
      previewUrl = URL.createObjectURL(item.file.slice(0, item.file.size, mime));
    }
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
        '. Preview isi Word/Excel tidak tersedia di browser.';
      content.appendChild(info);
    }
  }
  function clearPreview() {
    releasePreviewUrl();
    element('spkDocPreviewContent').innerHTML =
      '<div class="spk-doc-preview-placeholder">Pilih + PO, + PHJ, atau + TDS untuk menampilkan preview.</div>';
    activePreview = null;
    element('spkDocPreview').hidden = false;
    element('spkDocPreview').classList.remove('has-preview');
    syncPreview();
  }
  function movePreview(direction) {
    if (busy || !queue.length) return;
    var index = queue.indexOf(activePreview);
    var nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= queue.length) return;
    showPreview(queue[nextIndex]);
  }
  function deletePreview() {
    if (busy || !activePreview || activePreview.saved) return;
    var deletedIndex = queue.indexOf(activePreview);
    var deletedName = activePreview.file.name;
    releasePreviewUrl();
    element('spkDocPreviewContent').replaceChildren();
    queue.splice(deletedIndex, 1);
    activePreview = null;
    if (queue.length) showPreview(queue[Math.min(deletedIndex, queue.length - 1)]);
    else {
      element('spkDocPreview').classList.remove('has-preview');
      syncPreview();
    }
    setBusy(false);
    status(deletedName + ' dihapus dari pilihan. Dokumen yang sudah ada di Google Drive tidak berubah.');
    element('spkDocPreview').hidden = false;
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
    var type = selectedType;
    try {
      files.forEach(function (file) {
        if (!FORMATS.test(file.name)) throw new Error('Format file tidak didukung: ' + file.name);
        if (!file.size || file.size > MAX_BYTES) throw new Error('File harus berisi data dan maksimal 10 MB: ' + file.name);
        if (file.name.length > 180 || /[\u0000-\u001f\\/]/.test(file.name)) throw new Error('Nama file tidak valid: ' + file.name);
      });
      var additions = files.map(function (file) {
        return { file: file, type: type, uploadId: crypto.randomUUID(), saved: false, error: '' };
      });
      var duplicateCount = additions.filter(function (addition) {
        return queue.some(function (item) {
          return item.type === addition.type && item.file.name === addition.file.name &&
            item.file.size === addition.file.size && item.file.lastModified === addition.file.lastModified;
        });
      }).length;
      var newItems = additions.filter(function (addition) {
        return !queue.some(function (item) {
          return item.type === addition.type && item.file.name === addition.file.name &&
            item.file.size === addition.file.size && item.file.lastModified === addition.file.lastModified;
        });
      });
      queue = queue.concat(newItems);
      if (duplicateCount) status(duplicateCount + ' file duplikat dilewati; file yang sudah dipilih tetap tersedia.', 'error');
      else status(files.length ? files.length + ' file ' + type + ' siap diperiksa.' : '');
      if (newItems.length) showPreview(newItems[newItems.length - 1]);
    } catch (error) {
      status(error.message, 'error');
    }
    element('spkDocFiles').value = '';
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
      syncPreview();
    }
    var failed = queue.filter(function (item) { return !item.saved; }).length;
    status(failed
      ? (queue.length - failed) + ' file tersimpan, ' + failed + ' file belum berhasil. Coba lagi tanpa memilih ulang file.'
      : queue.length + ' file berhasil disimpan.', failed ? 'error' : 'success');
    await refresh(true);
    setBusy(false);
    syncPreview();
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
      '<p>Pilih kategori untuk melihat preview, lalu simpan semua file sekaligus.</p></div><span class="spk-doc-limit">Maks. 10 MB / file</span></div>' +
      '<div class="spk-doc-upload-fields"><div><span class="spk-doc-field-label">Tambah file ke kategori</span>' +
      '<div class="spk-doc-add-group" role="group" aria-label="Pilih kategori dokumen">' +
      '<button id="spkDocAddPO" type="button" class="spk-doc-add"><i class="fa-solid fa-plus" aria-hidden="true"></i> PO <span id="spkDocCountPO"></span></button>' +
      '<button id="spkDocAddPHJ" type="button" class="spk-doc-add"><i class="fa-solid fa-plus" aria-hidden="true"></i> PHJ <span id="spkDocCountPHJ"></span></button>' +
      '<button id="spkDocAddTDS" type="button" class="spk-doc-add"><i class="fa-solid fa-plus" aria-hidden="true"></i> TDS <span id="spkDocCountTDS"></span></button>' +
      '</div><input id="spkDocFiles" type="file" hidden multiple aria-label="Tambah file dokumen" aria-describedby="spkDocFormats" ' +
      'accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"></div></div>' +
      '<p id="spkDocFormats" class="spk-doc-help">PDF, JPG/PNG, Word, atau Excel. Pilih beberapa file sekaligus bila diperlukan.</p>' +
      '<section id="spkDocPreview" class="spk-doc-preview" hidden aria-labelledby="spkDocPreviewTitle">' +
      '<div class="spk-doc-preview-heading"><div class="spk-doc-preview-identity">' +
      '<span id="spkDocPreviewTitle" class="spk-doc-preview-category"></span>' +
      '<strong id="spkDocPreviewIdentity"></strong><small id="spkDocPreviewState"></small></div>' +
      '<div class="spk-doc-preview-tools"><span id="spkDocPreviewPosition" class="spk-doc-preview-position"></span>' +
      '<button id="spkDocDelete" type="button" class="button spk-doc-delete" aria-label="Hapus file preview">' +
      '<i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Hapus</span></button></div></div>' +
      '<div id="spkDocPreviewContent" class="spk-doc-preview-content" tabindex="0" aria-label="Geser ke kiri atau kanan untuk berpindah dokumen">' +
      '<div class="spk-doc-preview-placeholder">Pilih + PO, + PHJ, atau + TDS untuk menampilkan preview.</div></div>' +
      '<div class="spk-doc-preview-navigation"><button id="spkDocPrevious" type="button" class="spk-doc-icon-action" aria-label="Preview sebelumnya">' +
      '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button><span>Geser kiri / kanan untuk berpindah</span>' +
      '<button id="spkDocNext" type="button" class="spk-doc-icon-action" aria-label="Preview berikutnya">' +
      '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></div></section>' +
      '<div id="spkDocStatus" class="spk-doc-status" role="status" aria-live="polite"></div></section>' +
      '<div class="spk-doc-list-heading"><h3>Dokumen tersimpan</h3>' +
      '<button id="spkDocRefresh" type="button" class="button"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Segarkan</button></div>' +
      '<div id="spkDocList" aria-live="polite"></div></div><div class="modal-footer">' +
      '<span class="spk-doc-footer-note"><i class="fa-solid fa-lock" aria-hidden="true"></i> Akses file mengikuti izin Google Drive.</span>' +
      '<button type="button" class="button" data-bs-dismiss="modal">Tutup</button>' +
      '<button id="spkDocSave" type="button" class="button button-primary" disabled><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Simpan Semua</button>' +
      '</div></div></div>';
    document.body.appendChild(modalElement);
    modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    element('spkDocFiles').addEventListener('change', selectFiles);
    ['PO', 'PHJ', 'TDS'].forEach(function (type) {
      element('spkDocAdd' + type).addEventListener('click', function () {
        selectedType = type;
        element('spkDocFiles').click();
      });
    });
    element('spkDocDelete').addEventListener('click', deletePreview);
    element('spkDocPrevious').addEventListener('click', function () { movePreview(-1); });
    element('spkDocNext').addEventListener('click', function () { movePreview(1); });
    var previewStartX = null;
    element('spkDocPreview').addEventListener('touchstart', function (event) {
      previewStartX = event.changedTouches.length ? event.changedTouches[0].clientX : null;
    }, { passive: true });
    element('spkDocPreview').addEventListener('touchend', function (event) {
      if (previewStartX === null || !event.changedTouches.length) return;
      var distance = event.changedTouches[0].clientX - previewStartX;
      previewStartX = null;
      if (Math.abs(distance) >= 45) movePreview(distance < 0 ? 1 : -1);
    }, { passive: true });
    element('spkDocPreviewContent').addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        movePreview(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    element('spkDocSave').addEventListener('click', upload);
    element('spkDocRefresh').addEventListener('click', function () { refresh(false); });
    modalElement.addEventListener('hide.bs.modal', function (event) {
      if (busy) { event.preventDefault(); return; }
      sequence++;
    });
    modalElement.addEventListener('hidden.bs.modal', function () { clearPreview(); queue = []; });
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
    selectedType = 'PO';
    element('spkDocPreview').hidden = false;
    element('spkDocPreview').classList.remove('has-preview');
    element('spkDocPreviewContent').innerHTML =
      '<div class="spk-doc-preview-placeholder">Pilih + PO, + PHJ, atau + TDS untuk menampilkan preview.</div>';
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
