(function () {
  "use strict";

  var records = [];
  var history = [];
  var selected = new Set();
  var photoDataUrl = "";
  var signatureDirty = false;
  var saving = false;
  var toastTimer = null;
  var MAX_VISIBLE_RECORDS = 180;
  var MAX_SELECTED_RECORDS = 50;

  var form = document.getElementById("handoverForm");
  var loadingState = document.getElementById("loadingState");
  var errorState = document.getElementById("errorState");
  var errorMessage = document.getElementById("errorMessage");
  var spkList = document.getElementById("spkList");
  var spkEmpty = document.getElementById("spkEmpty");
  var spkSearch = document.getElementById("spkSearch");
  var showHandedToggle = document.getElementById("showHandedToggle");
  var selectedSpks = document.getElementById("selectedSpks");
  var selectedCount = document.getElementById("selectedCount");
  var selectVisibleButton = document.getElementById("selectVisibleButton");
  var recipientName = document.getElementById("recipientName");
  var photoInput = document.getElementById("photoInput");
  var photoPreview = document.getElementById("photoPreview");
  var photoPlaceholder = document.getElementById("photoPlaceholder");
  var removePhotoButton = document.getElementById("removePhotoButton");
  var signatureCanvas = document.getElementById("signatureCanvas");
  var signatureHint = document.getElementById("signatureHint");
  var clearSignatureButton = document.getElementById("clearSignatureButton");
  var notesField = document.getElementById("handoverNotes");
  var formAlert = document.getElementById("formAlert");
  var submitButton = document.getElementById("submitButton");
  var submitSummary = document.getElementById("submitSummary");
  var historyPanel = document.getElementById("historyPanel");
  var historyList = document.getElementById("historyList");
  var historyEmpty = document.getElementById("historyEmpty");
  var refreshButton = document.getElementById("refreshButton");

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    initializeSignatureCanvas();

    spkSearch.addEventListener("input", debounce(renderSpkList, 100));
    showHandedToggle.addEventListener("change", renderSpkList);
    selectVisibleButton.addEventListener("click", selectVisibleRecords);
    spkList.addEventListener("click", handleSpkListClick);
    selectedSpks.addEventListener("click", handleSelectedChipClick);
    photoInput.addEventListener("change", handlePhotoSelection);
    document.getElementById("photoPicker").addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      photoInput.click();
    });
    removePhotoButton.addEventListener("click", clearPhoto);
    clearSignatureButton.addEventListener("click", clearSignature);
    form.addEventListener("submit", submitHandover);
    refreshButton.addEventListener("click", loadPageData);
    document.getElementById("retryButton").addEventListener("click", loadPageData);
    recipientName.addEventListener("input", clearFormAlert);
    notesField.addEventListener("input", clearFormAlert);

    loadPageData();
  }

  // Pemberitahuan luring dulu digambar sendiri di sini. Sekarang seluruh
  // halaman memakai pita baku dari assets/js/status.js supaya bentuk dan
  // kalimatnya sama di mana pun, jadi versi khusus halaman ini dilepas.

  function loadPageData() {
    setView("loading");
    refreshButton.disabled = true;
    google.script.run
      .withSuccessHandler(function (response) {
        refreshButton.disabled = false;
        if (!response || response.status !== "success" || !response.data) {
          showLoadError(response && response.message);
          return;
        }
        records = Array.isArray(response.data.spks) ? response.data.spks : [];
        history = Array.isArray(response.data.history) ? response.data.history : [];
        removeUnavailableSelections();
        updateSummary(response.data.summary || {});
        renderSpkList();
        renderHistory();
        setView("ready");
      })
      .withFailureHandler(function (error) {
        refreshButton.disabled = false;
        showLoadError(error && error.message);
      })
      .getHandoverPageData();
  }

  function setView(view) {
    loadingState.hidden = view !== "loading";
    errorState.hidden = view !== "error";
    form.hidden = view !== "ready";
    historyPanel.hidden = view !== "ready";
  }

  function showLoadError(message) {
    errorMessage.textContent = message || "Server belum merespons. Silakan coba kembali.";
    setView("error");
  }

  function updateSummary(summary) {
    document.getElementById("availableCount").textContent = Number(summary.tersedia) || 0;
    document.getElementById("handedCount").textContent = Number(summary.sudahDiserahkan) || 0;
    document.getElementById("transactionCount").textContent = Number(summary.transaksi) || 0;
  }

  function filteredRecords() {
    var query = spkSearch.value.trim().toUpperCase();
    var showHanded = showHandedToggle.checked;
    return records.filter(function (record) {
      if (!showHanded && record.sudahDiserahkan) return false;
      if (!query) return true;
      return [record.spk, record.pelanggan, record.artikel, record.bahan, record.pemasaran]
        .some(function (value) { return String(value || "").toUpperCase().indexOf(query) > -1; });
    });
  }

  function visibleRecords() {
    return filteredRecords().slice(0, MAX_VISIBLE_RECORDS);
  }

  function renderSpkList() {
    var filtered = filteredRecords();
    var visible = filtered.slice(0, MAX_VISIBLE_RECORDS);
    spkEmpty.hidden = visible.length > 0;
    if (!visible.length) {
      spkList.innerHTML = "";
    } else {
      spkList.innerHTML = visible.map(function (record) {
        var key = normalizeSpk(record.spk);
        var isSelected = selected.has(key);
        var isHanded = Boolean(record.sudahDiserahkan);
        var quantity = formatQuantity(record.jumlah, record.uom);
        return (
          '<button type="button" class="spk-option' + (isSelected ? ' is-selected' : '') +
            (isHanded ? ' is-handed' : '') + '" data-spk="' + escapeAttr(key) + '" role="option"' +
            ' aria-selected="' + String(isSelected) + '"' + (isHanded ? ' disabled' : '') + '>' +
            '<span class="spk-check"><i class="fa-solid fa-check" aria-hidden="true"></i></span>' +
            '<span class="spk-main"><strong>' + escapeHtml(record.spk) + '</strong>' +
              '<span>' + escapeHtml(joinMeta([record.pelanggan, record.artikel])) + '</span></span>' +
            '<span class="spk-meta"><span>' + escapeHtml(quantity) + '</span>' +
              (isHanded ? '<span class="handed-badge">Sudah diserahkan</span>' : '<span>' + escapeHtml(record.tanggal || "") + '</span>') +
            '</span>' +
          '</button>'
        );
      }).join("");
    }

    if (filtered.length > MAX_VISIBLE_RECORDS) {
      spkList.insertAdjacentHTML(
        "beforeend",
        '<div class="empty-inline">Menampilkan ' + MAX_VISIBLE_RECORDS +
        ' hasil pertama. Persempit pencarian untuk menemukan SPK lainnya.</div>'
      );
    }
    updateSelectionUi();
  }

  function handleSpkListClick(event) {
    var button = event.target.closest(".spk-option[data-spk]");
    if (!button || button.disabled) return;
    toggleSelection(button.dataset.spk);
  }

  function toggleSelection(spk) {
    var key = normalizeSpk(spk);
    if (!key) return;
    if (selected.has(key)) selected.delete(key);
    else if (selected.size < MAX_SELECTED_RECORDS) selected.add(key);
    else {
      showToast("Maksimal 50 SPK dalam satu transaksi.", true);
      return;
    }
    clearFormAlert();
    renderSpkList();
  }

  function selectVisibleRecords() {
    var available = visibleRecords().filter(function (record) { return !record.sudahDiserahkan; });
    var allSelected = available.length > 0 && available.every(function (record) {
      return selected.has(normalizeSpk(record.spk));
    });
    available.forEach(function (record) {
      var key = normalizeSpk(record.spk);
      if (allSelected) selected.delete(key);
      else if (selected.size < MAX_SELECTED_RECORDS) selected.add(key);
    });
    clearFormAlert();
    renderSpkList();
  }

  function handleSelectedChipClick(event) {
    var button = event.target.closest("button[data-remove-spk]");
    if (!button) return;
    selected.delete(normalizeSpk(button.dataset.removeSpk));
    renderSpkList();
  }

  function updateSelectionUi() {
    var keys = Array.from(selected);
    selectedCount.textContent = keys.length + " dipilih";
    selectedSpks.hidden = keys.length === 0;
    selectedSpks.innerHTML = keys.map(function (spk) {
      return '<span class="selected-chip">' + escapeHtml(spk) +
        '<button type="button" data-remove-spk="' + escapeAttr(spk) + '" aria-label="Hapus ' + escapeAttr(spk) + '">&times;</button></span>';
    }).join("");
    submitSummary.textContent = keys.length
      ? keys.length + " SPK akan diserahterimakan"
      : "Pilih SPK untuk melanjutkan";

    var available = visibleRecords().filter(function (record) { return !record.sudahDiserahkan; });
    var allSelected = available.length > 0 && available.every(function (record) {
      return selected.has(normalizeSpk(record.spk));
    });
    selectVisibleButton.querySelector("span").textContent = allSelected ? "Batal Pilih" : "Pilih Hasil";
    selectVisibleButton.disabled = available.length === 0;
  }

  function removeUnavailableSelections() {
    var available = {};
    records.forEach(function (record) {
      if (!record.sudahDiserahkan) available[normalizeSpk(record.spk)] = true;
    });
    Array.from(selected).forEach(function (spk) {
      if (!available[spk]) selected.delete(spk);
    });
  }

  function handlePhotoSelection() {
    var file = photoInput.files && photoInput.files[0];
    if (!file) return;
    if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type)) {
      showFormAlert("Gunakan foto berformat JPG, PNG, atau WEBP.");
      clearPhoto();
      return;
    }
    if (file.size > 12000000) {
      showFormAlert("Ukuran foto terlalu besar. Gunakan foto di bawah 12 MB.");
      clearPhoto();
      return;
    }

    compressPhoto(file).then(function (dataUrl) {
      photoDataUrl = dataUrl;
      photoPreview.src = dataUrl;
      photoPreview.hidden = false;
      photoPlaceholder.hidden = true;
      removePhotoButton.hidden = false;
      clearFormAlert();
    }).catch(function () {
      clearPhoto();
      showFormAlert("Foto belum dapat diproses. Silakan ambil foto ulang.");
    });
  }

  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () {
          var maxEdge = 1280;
          var scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
          var width = Math.max(1, Math.round(image.naturalWidth * scale));
          var height = Math.max(1, Math.round(image.naturalHeight * scale));
          var canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          var context = canvas.getContext("2d", { alpha: false });
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", .78));
        };
        image.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function clearPhoto() {
    photoDataUrl = "";
    photoInput.value = "";
    photoPreview.removeAttribute("src");
    photoPreview.hidden = true;
    photoPlaceholder.hidden = false;
    removePhotoButton.hidden = true;
  }

  function initializeSignatureCanvas() {
    var context = signatureCanvas.getContext("2d");
    var drawing = false;
    var last = null;
    clearSignature();

    signatureCanvas.addEventListener("pointerdown", function (event) {
      if (saving) return;
      drawing = true;
      signatureCanvas.setPointerCapture(event.pointerId);
      last = canvasPoint(event);
      context.beginPath();
      context.arc(last.x, last.y, 2.4, 0, Math.PI * 2);
      context.fillStyle = "#17191d";
      context.fill();
      markSignatureDirty();
    });
    signatureCanvas.addEventListener("pointermove", function (event) {
      if (!drawing) return;
      var point = canvasPoint(event);
      context.beginPath();
      context.moveTo(last.x, last.y);
      context.lineTo(point.x, point.y);
      context.strokeStyle = "#17191d";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      last = point;
      markSignatureDirty();
    });
    function finish(event) {
      if (!drawing) return;
      drawing = false;
      last = null;
      if (event && signatureCanvas.hasPointerCapture(event.pointerId)) {
        signatureCanvas.releasePointerCapture(event.pointerId);
      }
    }
    signatureCanvas.addEventListener("pointerup", finish);
    signatureCanvas.addEventListener("pointercancel", finish);
    signatureCanvas.addEventListener("pointerleave", function (event) {
      if (event.buttons === 0) finish(event);
    });
  }

  function canvasPoint(event) {
    var rect = signatureCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (signatureCanvas.width / rect.width),
      y: (event.clientY - rect.top) * (signatureCanvas.height / rect.height)
    };
  }

  function markSignatureDirty() {
    signatureDirty = true;
    signatureHint.hidden = true;
    clearFormAlert();
  }

  function clearSignature() {
    var context = signatureCanvas.getContext("2d");
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    context.restore();
    signatureDirty = false;
    signatureHint.hidden = false;
  }

  function validateForm() {
    if (!selected.size) return "Pilih setidaknya satu SPK yang akan diserahkan.";
    var recipient = recipientName.value.trim();
    if (recipient.length < 2) return "Isi nama penerima dengan benar.";
    if (!photoDataUrl) return "Ambil foto bukti serah terima.";
    if (!signatureDirty) return "Minta penerima membubuhkan tanda tangan digital.";
    if (!navigator.onLine) return "Perangkat sedang tidak terhubung ke jaringan.";
    return "";
  }

  function submitHandover(event) {
    event.preventDefault();
    if (saving) return;
    var validation = validateForm();
    if (validation) {
      showFormAlert(validation);
      focusInvalidField(validation);
      return;
    }

    var payload = {
      spks: Array.from(selected),
      recipient: recipientName.value.trim(),
      notes: notesField.value.trim(),
      photo: photoDataUrl,
      signature: signatureCanvas.toDataURL("image/png")
    };
    setSaving(true);
    google.script.run
      .withSuccessHandler(function (response) {
        setSaving(false);
        if (!response || response.status !== "success") {
          showFormAlert(response && response.message ? response.message : "Data belum dapat disimpan.");
          return;
        }
        showToast(response.message || "Serah terima berhasil disimpan.", false);
        resetFormAfterSave();
        loadPageData();
      })
      .withFailureHandler(function (error) {
        setSaving(false);
        showFormAlert(error && error.message ? error.message : "Server belum merespons. Silakan coba kembali.");
      })
      .saveHandover(payload);
  }

  function focusInvalidField(message) {
    if (message.indexOf("Pilih") === 0) spkSearch.focus();
    else if (message.indexOf("nama") > -1) recipientName.focus();
    else if (message.indexOf("foto") > -1) document.getElementById("photoPicker").focus();
    else if (message.indexOf("tanda tangan") > -1) signatureCanvas.focus();
  }

  function setSaving(value) {
    saving = Boolean(value);
    submitButton.disabled = saving;
    refreshButton.disabled = saving;
    submitButton.querySelector("span").textContent = saving ? "Menyimpan..." : "Simpan Serah Terima";
    submitButton.querySelector("i").className = saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk";
    Array.prototype.forEach.call(form.querySelectorAll("input, textarea, button"), function (control) {
      if (control !== submitButton) control.disabled = saving;
    });
    if (!saving) renderSpkList();
  }

  function resetFormAfterSave() {
    selected.clear();
    recipientName.value = "";
    notesField.value = "";
    clearPhoto();
    clearSignature();
    clearFormAlert();
    spkSearch.value = "";
    showHandedToggle.checked = false;
  }

  function renderHistory() {
    historyEmpty.hidden = history.length > 0;
    if (!history.length) {
      historyList.innerHTML = "";
      return;
    }
    historyList.innerHTML = history.map(function (record) {
      var spks = Array.isArray(record.spks) ? record.spks : [];
      return (
        '<article class="history-item">' +
          '<div class="history-recipient"><strong>' + escapeHtml(record.penerima || "—") + '</strong>' +
            '<span>' + escapeHtml(record.waktu || "") + ' · ' + escapeHtml(record.id || "") + '</span></div>' +
          '<div class="history-spks"><strong>' + spks.length + ' SPK</strong>' +
            '<span title="' + escapeAttr(spks.join(", ")) + '">' + escapeHtml(spks.join(" · ")) + '</span></div>' +
          '<div class="history-actions">' +
            renderProofLink(record.fotoUrl, "fa-camera", "Lihat foto bukti") +
            renderProofLink(record.tandaTanganUrl, "fa-signature", "Lihat tanda tangan") +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  function renderProofLink(url, icon, label) {
    if (!url) return "";
    return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener" aria-label="' + escapeAttr(label) +
      '" title="' + escapeAttr(label) + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i></a>';
  }

  function showFormAlert(message, success) {
    formAlert.textContent = message;
    formAlert.classList.toggle("success", Boolean(success));
    formAlert.hidden = false;
  }

  function clearFormAlert() {
    formAlert.hidden = true;
    formAlert.textContent = "";
    formAlert.classList.remove("success");
  }

  function showToast(message, isError) {
    var toast = document.getElementById("toast");
    toast.querySelector("span").textContent = message;
    toast.querySelector("i").className = isError
      ? "fa-solid fa-circle-exclamation"
      : "fa-solid fa-circle-check";
    toast.classList.toggle("error", Boolean(isError));
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 4200);
  }

  function normalizeSpk(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  }

  function formatQuantity(value, uom) {
    var text = String(value === null || value === undefined ? "" : value).trim();
    return joinMeta([text, String(uom || "").trim()]) || "—";
  }

  function joinMeta(values) {
    return values.filter(function (value) { return String(value || "").trim(); }).join(" · ");
  }

  function debounce(callback, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { callback.apply(null, args); }, wait);
    };
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
