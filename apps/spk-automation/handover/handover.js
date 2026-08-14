(function () {
  "use strict";

  var scannedRecords = new Map();
  var routingGroups = new Map();
  var history = [];
  var saving = false;
  var lookupBusy = false;
  var toastTimer = null;
  var scannerStream = null;
  var scannerAnimation = 0;
  var scannerFrameBusy = false;
  var scannerLastFrame = 0;
  var scannerDetector = null;
  var scannerReturnFocus = null;
  var MAX_SCANNED_SPK = 50;
  var ROUTE_ORDER = ["mixer", "blowing", "printing", "folding", "slitting", "gusset", "cutting"];
  var ROUTE_ICONS = {
    mixer: "fa-blender",
    blowing: "fa-wind",
    printing: "fa-print",
    folding: "fa-layer-group",
    slitting: "fa-scissors",
    gusset: "fa-arrows-left-right-to-line",
    cutting: "fa-box-open"
  };

  var form = document.getElementById("handoverForm");
  var loadingState = document.getElementById("loadingState");
  var errorState = document.getElementById("errorState");
  var errorMessage = document.getElementById("errorMessage");
  var refreshButton = document.getElementById("refreshButton");
  var scanButton = document.getElementById("scanButton");
  var manualSpkInput = document.getElementById("manualSpkInput");
  var addSpkButton = document.getElementById("addSpkButton");
  var clearScannedButton = document.getElementById("clearScannedButton");
  var scannedSpkList = document.getElementById("scannedSpkList");
  var scannedEmpty = document.getElementById("scannedEmpty");
  var scannedCount = document.getElementById("scannedCount");
  var lookupState = document.getElementById("lookupState");
  var routingGroupsElement = document.getElementById("routingGroups");
  var routingEmpty = document.getElementById("routingEmpty");
  var routingCount = document.getElementById("routingCount");
  var formAlert = document.getElementById("formAlert");
  var submitButton = document.getElementById("submitButton");
  var submitSummary = document.getElementById("submitSummary");
  var historyPanel = document.getElementById("historyPanel");
  var historyList = document.getElementById("historyList");
  var historyEmpty = document.getElementById("historyEmpty");
  var scanModal = document.getElementById("scanModal");
  var scanVideo = document.getElementById("scanVideo");
  var scanCanvas = document.getElementById("scanCanvas");
  var scanStatus = document.getElementById("scanStatus");
  var cameraWaiting = document.getElementById("cameraWaiting");

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    scanButton.addEventListener("click", openScanner);
    addSpkButton.addEventListener("click", function () { lookupSpk(manualSpkInput.value, "manual"); });
    manualSpkInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      lookupSpk(manualSpkInput.value, "manual");
    });
    clearScannedButton.addEventListener("click", clearScannedRecords);
    scannedSpkList.addEventListener("click", handleScannedClick);
    routingGroupsElement.addEventListener("input", handleRoutingInput);
    routingGroupsElement.addEventListener("change", handleRoutingChange);
    routingGroupsElement.addEventListener("click", handleRoutingClick);
    form.addEventListener("submit", submitHandover);
    refreshButton.addEventListener("click", loadOverview);
    document.getElementById("retryButton").addEventListener("click", loadOverview);
    document.querySelectorAll("[data-close-scanner]").forEach(function (button) {
      button.addEventListener("click", closeScanner);
    });
    document.getElementById("scannerManualButton").addEventListener("click", function () {
      closeScanner();
      window.setTimeout(function () { manualSpkInput.focus(); }, 0);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !scanModal.hidden) closeScanner();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && !scanModal.hidden) closeScanner();
    });

    renderScannedRecords();
    renderRoutingGroups();
    loadOverview();
  }

  function loadOverview() {
    setView("loading");
    refreshButton.disabled = true;
    google.script.run
      .withSuccessHandler(function (response) {
        refreshButton.disabled = false;
        if (!response || response.status !== "success" || !response.data) {
          showLoadError(response && response.message);
          return;
        }
        history = Array.isArray(response.data.history) ? response.data.history : [];
        updateSummary(response.data.summary || {});
        renderHistory();
        setView("ready");
      })
      .withFailureHandler(function (error) {
        refreshButton.disabled = false;
        showLoadError(error && error.message);
      })
      .getHandoverOverview();
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

  function lookupSpk(rawValue, source) {
    var spk = extractSpkNumber(rawValue);
    if (!spk) {
      setLookupState("Masukkan atau pindai nomor SPK yang valid.", "error");
      manualSpkInput.focus();
      return;
    }
    if (lookupBusy) return;
    if (scannedRecords.has(spk)) {
      setLookupState("SPK " + spk + " sudah ada dalam daftar.", "warning");
      showToast("SPK " + spk + " sudah dipindai.", true);
      return;
    }
    if (scannedRecords.size >= MAX_SCANNED_SPK) {
      setLookupState("Maksimal " + MAX_SCANNED_SPK + " SPK dalam satu transaksi.", "error");
      return;
    }

    setLookupBusy(true);
    setLookupState("Mencari SPK " + spk + " dan membaca routing...", "loading");
    google.script.run
      .withSuccessHandler(function (response) {
        setLookupBusy(false);
        if (!response || response.status !== "success" || !response.found || !response.data) {
          setLookupState(response && response.message ? response.message : "SPK tidak ditemukan.", "error");
          if (source === "scan") window.setTimeout(openScanner, 650);
          return;
        }
        addScannedRecord(response.data);
      })
      .withFailureHandler(function (error) {
        setLookupBusy(false);
        setLookupState(error && error.message ? error.message : "Server belum merespons.", "error");
      })
      .getHandoverSpkDetails(spk);
  }

  function addScannedRecord(record) {
    var spk = normalizeSpk(record.spk);
    var routings = Array.isArray(record.routings) ? record.routings : [];
    var available = routings.filter(function (route) { return route && !route.sudahDiserahkan; });
    var handed = routings.filter(function (route) { return route && route.sudahDiserahkan; });

    if (!routings.length) {
      setLookupState("SPK " + spk + " belum memiliki routing produksi.", "error");
      return;
    }
    if (!available.length) {
      setLookupState("Semua routing SPK " + spk + " sudah diserahterimakan.", "warning");
      showToast("Semua routing SPK tersebut sudah diserahkan.", true);
      return;
    }

    record.spk = spk;
    record.routings = routings;
    scannedRecords.set(spk, record);
    available.forEach(function (route) {
      var key = normalizeRoute(route.key);
      if (!key) return;
      if (!routingGroups.has(key)) {
        routingGroups.set(key, createRoutingGroup(key, route.label));
      }
      routingGroups.get(key).spks.add(spk);
    });

    manualSpkInput.value = "";
    clearFormAlert();
    renderScannedRecords();
    renderRoutingGroups();
    var message = "SPK " + spk + " ditambahkan ke " + available.length + " routing.";
    if (handed.length) message += " " + handed.length + " routing yang sudah diserahkan dilewati.";
    setLookupState(message, "success");
    showToast(message, false);
  }

  function createRoutingGroup(key, label) {
    return {
      key: key,
      label: String(label || routeLabel(key)),
      spks: new Set(),
      recipient: "",
      notes: "",
      photo: "",
      signature: ""
    };
  }

  function removeScannedRecord(spk) {
    var key = normalizeSpk(spk);
    if (!scannedRecords.has(key)) return;
    scannedRecords.delete(key);
    routingGroups.forEach(function (group, routeKey) {
      group.spks.delete(key);
      if (!group.spks.size) routingGroups.delete(routeKey);
    });
    clearFormAlert();
    renderScannedRecords();
    renderRoutingGroups();
  }

  function clearScannedRecords() {
    scannedRecords.clear();
    routingGroups.clear();
    clearFormAlert();
    setLookupState("Daftar SPK dikosongkan.", "neutral");
    renderScannedRecords();
    renderRoutingGroups();
  }

  function handleScannedClick(event) {
    var button = event.target.closest("button[data-remove-spk]");
    if (!button) return;
    removeScannedRecord(button.dataset.removeSpk);
  }

  function renderScannedRecords() {
    var records = Array.from(scannedRecords.values());
    scannedCount.textContent = records.length + " SPK";
    scannedEmpty.hidden = records.length > 0;
    clearScannedButton.hidden = records.length === 0;
    scannedSpkList.innerHTML = records.map(function (record) {
      var routes = (record.routings || []).map(function (route) {
        return '<span class="route-mini' + (route.sudahDiserahkan ? ' is-handed' : '') + '">' +
          escapeHtml(route.label || routeLabel(route.key)) +
          (route.sudahDiserahkan ? ' <i class="fa-solid fa-check" aria-hidden="true"></i>' : '') +
          '</span>';
      }).join("");
      return (
        '<article class="scanned-spk-card">' +
          '<span class="scanned-check"><i class="fa-solid fa-check" aria-hidden="true"></i></span>' +
          '<div class="scanned-copy"><strong>' + escapeHtml(record.spk) + '</strong>' +
            '<span>' + escapeHtml(joinMeta([record.pelanggan, record.artikel])) + '</span>' +
            '<div class="route-mini-list">' + routes + '</div></div>' +
          '<button type="button" data-remove-spk="' + escapeAttr(record.spk) + '" aria-label="Hapus SPK ' +
            escapeAttr(record.spk) + '"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        '</article>'
      );
    }).join("");
  }

  function sortedGroups() {
    return Array.from(routingGroups.values()).sort(function (left, right) {
      return ROUTE_ORDER.indexOf(left.key) - ROUTE_ORDER.indexOf(right.key);
    });
  }

  function renderRoutingGroups() {
    var groups = sortedGroups();
    routingCount.textContent = groups.length + " routing";
    routingEmpty.hidden = groups.length > 0;
    routingGroupsElement.innerHTML = groups.map(renderRoutingGroup).join("");
    initializeSignatureCanvases();
    updateSubmitSummary();
  }

  function renderRoutingGroup(group, index) {
    var spks = Array.from(group.spks);
    var complete = group.recipient.trim().length >= 2 && Boolean(group.photo || group.signature);
    var photoContent = group.photo
      ? '<img src="' + escapeAttr(group.photo) + '" alt="Pratinjau foto bukti ' + escapeAttr(group.label) + '">'
      : '<span><i class="fa-solid fa-camera-retro" aria-hidden="true"></i><strong>Ambil Foto</strong><small>atau pilih dari perangkat</small></span>';
    return (
      '<article class="routing-group-card' + (complete ? ' is-complete' : '') + '" data-route-card="' + escapeAttr(group.key) + '">' +
        '<header class="routing-group-head">' +
          '<span class="routing-order">' + String(index + 1).padStart(2, "0") + '</span>' +
          '<span class="routing-icon"><i class="fa-solid ' + escapeAttr(routeIcon(group.key)) + '" aria-hidden="true"></i></span>' +
          '<div><strong>' + escapeHtml(group.label) + '</strong><small>' + spks.length + ' SPK pada divisi ini</small></div>' +
          '<span class="routing-ready"><i class="fa-solid fa-check" aria-hidden="true"></i> Lengkap</span>' +
        '</header>' +
        '<div class="routing-spks">' + spks.map(function (spk) {
          return '<span><i class="fa-solid fa-file-lines" aria-hidden="true"></i>' + escapeHtml(spk) + '</span>';
        }).join("") + '</div>' +
        '<div class="routing-fields">' +
          '<div class="field-group route-recipient"><label for="recipient-' + escapeAttr(group.key) + '">Nama penerima</label>' +
            '<div class="input-with-icon"><i class="fa-solid fa-user-check" aria-hidden="true"></i>' +
              '<input id="recipient-' + escapeAttr(group.key) + '" data-route="' + escapeAttr(group.key) +
                '" data-group-field="recipient" type="text" maxlength="100" autocomplete="name" placeholder="Nama penerima di divisi ' +
                escapeAttr(group.label) + '" value="' + escapeAttr(group.recipient) + '"></div></div>' +
          '<button class="copy-proof-button" type="button" data-copy-route="' + escapeAttr(group.key) + '">' +
            '<i class="fa-solid fa-copy" aria-hidden="true"></i><span>Salin isian ini ke semua routing</span></button>' +
        '</div>' +
        '<div class="evidence-grid route-evidence-grid">' +
          '<div class="evidence-card"><div class="evidence-head"><span><i class="fa-solid fa-camera" aria-hidden="true"></i> Foto bukti</span>' +
            '<small>Potret penerima dan SPK</small></div>' +
            '<label class="photo-picker route-photo-picker" for="photo-' + escapeAttr(group.key) + '">' +
              '<input id="photo-' + escapeAttr(group.key) + '" data-route="' + escapeAttr(group.key) +
                '" data-photo-input type="file" accept="image/jpeg,image/png,image/webp" capture="environment">' +
              photoContent + '</label>' +
            '<button class="text-button" type="button" data-clear-photo="' + escapeAttr(group.key) + '"' +
              (group.photo ? '' : ' hidden') + '><i class="fa-solid fa-trash" aria-hidden="true"></i> Hapus foto</button></div>' +
          '<div class="evidence-card"><div class="evidence-head"><span><i class="fa-solid fa-signature" aria-hidden="true"></i> Tanda tangan digital</span>' +
            '<small>Gunakan jari atau tetikus</small></div>' +
            '<div class="signature-wrap route-signature-wrap"><canvas data-signature-canvas data-route="' + escapeAttr(group.key) +
              '" width="900" height="260" tabindex="0" aria-label="Tanda tangan penerima ' + escapeAttr(group.label) + '"></canvas>' +
              '<span' + (group.signature ? ' hidden' : '') + '>Tanda tangan di sini</span></div>' +
            '<button class="text-button" type="button" data-clear-signature="' + escapeAttr(group.key) + '">' +
              '<i class="fa-solid fa-eraser" aria-hidden="true"></i> Bersihkan tanda tangan</button></div>' +
        '</div>' +
        '<div class="field-group route-note"><label for="notes-' + escapeAttr(group.key) + '">Catatan <span>Boleh dikosongkan</span></label>' +
          '<textarea id="notes-' + escapeAttr(group.key) + '" data-route="' + escapeAttr(group.key) +
            '" data-group-field="notes" maxlength="500" rows="2" placeholder="Catatan untuk divisi ' + escapeAttr(group.label) + '">' +
            escapeHtml(group.notes) + '</textarea></div>' +
        '<p class="route-proof-hint"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Isi minimal satu bukti: foto atau tanda tangan.</p>' +
      '</article>'
    );
  }

  function handleRoutingInput(event) {
    var field = event.target.closest("[data-group-field][data-route]");
    if (!field) return;
    var group = routingGroups.get(normalizeRoute(field.dataset.route));
    if (!group) return;
    group[field.dataset.groupField] = field.value;
    clearFormAlert();
    updateRouteCompletion(group.key);
    updateSubmitSummary();
  }

  function handleRoutingChange(event) {
    var input = event.target.closest("input[data-photo-input][data-route]");
    if (!input) return;
    var group = routingGroups.get(normalizeRoute(input.dataset.route));
    var file = input.files && input.files[0];
    if (!group || !file) return;
    if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type)) {
      showFormAlert("Gunakan foto berformat JPG, PNG, atau WEBP.", group.key);
      return;
    }
    if (file.size > 12000000) {
      showFormAlert("Ukuran foto terlalu besar. Gunakan foto di bawah 12 MB.", group.key);
      return;
    }
    compressPhoto(file).then(function (dataUrl) {
      group.photo = dataUrl;
      clearFormAlert();
      renderRoutingGroups();
    }).catch(function () {
      showFormAlert("Foto belum dapat diproses. Silakan ambil foto ulang.", group.key);
    });
  }

  function handleRoutingClick(event) {
    var clearPhotoButton = event.target.closest("button[data-clear-photo]");
    if (clearPhotoButton) {
      var photoGroup = routingGroups.get(normalizeRoute(clearPhotoButton.dataset.clearPhoto));
      if (photoGroup) photoGroup.photo = "";
      renderRoutingGroups();
      return;
    }
    var clearSignatureButton = event.target.closest("button[data-clear-signature]");
    if (clearSignatureButton) {
      var signatureGroup = routingGroups.get(normalizeRoute(clearSignatureButton.dataset.clearSignature));
      if (signatureGroup) signatureGroup.signature = "";
      renderRoutingGroups();
      return;
    }
    var copyButton = event.target.closest("button[data-copy-route]");
    if (copyButton) copyGroupProof(copyButton.dataset.copyRoute);
  }

  function copyGroupProof(route) {
    var source = routingGroups.get(normalizeRoute(route));
    if (!source) return;
    if (source.recipient.trim().length < 2 || (!source.photo && !source.signature)) {
      showFormAlert("Lengkapi nama penerima dan minimal satu bukti sebelum menyalin.", source.key);
      return;
    }
    routingGroups.forEach(function (group) {
      group.recipient = source.recipient;
      group.notes = source.notes;
      group.photo = source.photo;
      group.signature = source.signature;
    });
    clearFormAlert();
    renderRoutingGroups();
    showToast("Isian " + source.label + " disalin ke semua routing.", false);
  }

  function initializeSignatureCanvases() {
    routingGroupsElement.querySelectorAll("canvas[data-signature-canvas][data-route]").forEach(function (canvas) {
      var group = routingGroups.get(normalizeRoute(canvas.dataset.route));
      if (!group) return;
      paintSignatureBackground(canvas);
      if (group.signature) restoreSignature(canvas, group.signature);
      initializeSignatureCanvas(canvas, group);
    });
  }

  function initializeSignatureCanvas(canvas, group) {
    var context = canvas.getContext("2d");
    var drawing = false;
    var lastPoint = null;
    var hint = canvas.parentElement.querySelector("span");

    canvas.addEventListener("pointerdown", function (event) {
      if (saving) return;
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      lastPoint = canvasPoint(canvas, event);
      context.beginPath();
      context.arc(lastPoint.x, lastPoint.y, 2.4, 0, Math.PI * 2);
      context.fillStyle = "#17191d";
      context.fill();
      hint.hidden = true;
    });
    canvas.addEventListener("pointermove", function (event) {
      if (!drawing) return;
      var point = canvasPoint(canvas, event);
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(point.x, point.y);
      context.strokeStyle = "#17191d";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      lastPoint = point;
    });
    function finish(event) {
      if (!drawing) return;
      drawing = false;
      lastPoint = null;
      if (event && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      group.signature = canvas.toDataURL("image/png");
      clearFormAlert();
      updateRouteCompletion(group.key);
      updateSubmitSummary();
    }
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    canvas.addEventListener("pointerleave", function (event) {
      if (event.buttons === 0) finish(event);
    });
  }

  function paintSignatureBackground(canvas) {
    var context = canvas.getContext("2d");
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function restoreSignature(canvas, dataUrl) {
    var image = new Image();
    image.onload = function () {
      paintSignatureBackground(canvas);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = dataUrl;
  }

  function canvasPoint(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function updateRouteCompletion(route) {
    var group = routingGroups.get(normalizeRoute(route));
    var card = routingGroupsElement.querySelector('[data-route-card="' + cssEscape(route) + '"]');
    if (!group || !card) return;
    card.classList.toggle("is-complete", group.recipient.trim().length >= 2 && Boolean(group.photo || group.signature));
  }

  function updateSubmitSummary() {
    var groups = sortedGroups();
    var complete = groups.filter(function (group) {
      return group.recipient.trim().length >= 2 && Boolean(group.photo || group.signature);
    }).length;
    submitSummary.textContent = groups.length
      ? complete + " dari " + groups.length + " routing sudah lengkap"
      : "Pindai SPK untuk melanjutkan";
  }

  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () {
          var maxEdge = 960;
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
          resolve(canvas.toDataURL("image/jpeg", .72));
        };
        image.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function validateForm() {
    if (!scannedRecords.size) return { message: "Pindai setidaknya satu SPK.", route: "" };
    var groups = sortedGroups();
    if (!groups.length) return { message: "Routing SPK belum ditemukan.", route: "" };
    for (var index = 0; index < groups.length; index += 1) {
      var group = groups[index];
      if (group.recipient.trim().length < 2) {
        return { message: "Isi nama penerima untuk routing " + group.label + ".", route: group.key };
      }
      if (!group.photo && !group.signature) {
        return { message: "Isi foto atau tanda tangan untuk routing " + group.label + ".", route: group.key };
      }
    }
    if (!navigator.onLine) return { message: "Perangkat sedang tidak terhubung ke jaringan.", route: "" };
    return null;
  }

  function submitHandover(event) {
    event.preventDefault();
    if (saving) return;
    var validation = validateForm();
    if (validation) {
      showFormAlert(validation.message, validation.route);
      return;
    }

    var payload = {
      groups: sortedGroups().map(function (group) {
        return {
          routing: group.key,
          spks: Array.from(group.spks),
          recipient: group.recipient.trim(),
          notes: group.notes.trim(),
          photo: group.photo,
          signature: group.signature
        };
      })
    };
    setSaving(true);
    google.script.run
      .withSuccessHandler(function (response) {
        setSaving(false);
        if (!response || response.status !== "success") {
          showFormAlert(response && response.message ? response.message : "Data belum dapat disimpan.");
          return;
        }
        showToast(response.message || "Serah terima per routing berhasil disimpan.", false);
        scannedRecords.clear();
        routingGroups.clear();
        renderScannedRecords();
        renderRoutingGroups();
        setLookupState("Serah terima berhasil disimpan.", "success");
        loadOverview();
      })
      .withFailureHandler(function (error) {
        setSaving(false);
        showFormAlert(error && error.message ? error.message : "Server belum merespons. Silakan coba kembali.");
      })
      .saveHandoverByRouting(payload);
  }

  function setSaving(value) {
    saving = Boolean(value);
    submitButton.querySelector("span").textContent = saving ? "Menyimpan..." : "Simpan Semua Routing";
    submitButton.querySelector("i").className = saving ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk";
    Array.prototype.forEach.call(form.querySelectorAll("input, textarea, button"), function (control) {
      control.disabled = saving;
    });
    refreshButton.disabled = saving;
  }

  function renderHistory() {
    historyEmpty.hidden = history.length > 0;
    if (!history.length) {
      historyList.innerHTML = "";
      return;
    }
    historyList.innerHTML = history.map(function (record) {
      var spks = Array.isArray(record.spks) ? record.spks : [];
      var routing = record.routingLabel || routeLabel(record.routing) || "Serah terima lama";
      return (
        '<article class="history-item">' +
          '<div class="history-recipient"><strong>' + escapeHtml(record.penerima || "—") + '</strong>' +
            '<span>' + escapeHtml(record.waktu || "") + ' · ' + escapeHtml(record.id || "") + '</span></div>' +
          '<div class="history-spks"><strong><span class="history-route-badge">' + escapeHtml(routing) + '</span> ' + spks.length + ' SPK</strong>' +
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

  function openScanner() {
    if (saving || lookupBusy || !scanModal.hidden) return;
    scannerReturnFocus = document.activeElement;
    scanModal.hidden = false;
    document.documentElement.classList.add("scanner-open");
    document.body.classList.add("scanner-open");
    cameraWaiting.hidden = false;
    scanStatus.className = "scan-status";
    scanStatus.textContent = "Izinkan akses kamera jika diminta.";
    startCamera();
  }

  function startCamera() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      showScannerError("Kamera tidak tersedia pada perangkat ini. Gunakan masukan nomor SPK.");
      return;
    }
    if (typeof window.BarcodeDetector === "function") {
      try { scannerDetector = new window.BarcodeDetector({ formats: ["qr_code"] }); }
      catch (error) { scannerDetector = null; }
    }

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    }).then(function (stream) {
      scannerStream = stream;
      scanVideo.srcObject = stream;
      return scanVideo.play();
    }).then(function () {
      cameraWaiting.hidden = true;
      scanStatus.textContent = "Posisikan QR di dalam bingkai. Pemindaian berjalan otomatis.";
      scannerLastFrame = 0;
      scannerAnimation = window.requestAnimationFrame(scanCameraFrame);
    }).catch(function (error) {
      var denied = error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      showScannerError(denied
        ? "Izin kamera ditolak. Izinkan kamera atau masukkan nomor SPK secara manual."
        : "Kamera belum dapat dibuka. Gunakan masukan nomor SPK.");
    });
  }

  function scanCameraFrame(timestamp) {
    if (scanModal.hidden || !scannerStream) return;
    scannerAnimation = window.requestAnimationFrame(scanCameraFrame);
    if (scannerFrameBusy || timestamp - scannerLastFrame < 120 || scanVideo.readyState < 2) return;
    scannerLastFrame = timestamp;
    scannerFrameBusy = true;
    decodeCameraFrame().then(function (value) {
      scannerFrameBusy = false;
      if (!value || scanModal.hidden) return;
      var spk = extractSpkNumber(value);
      if (!spk) {
        scanStatus.textContent = "QR terbaca, tetapi tidak berisi nomor SPK yang valid.";
        return;
      }
      closeScanner();
      lookupSpk(spk, "scan");
    }).catch(function () {
      scannerFrameBusy = false;
    });
  }

  function decodeCameraFrame() {
    var sourceWidth = scanVideo.videoWidth || 0;
    var sourceHeight = scanVideo.videoHeight || 0;
    if (!sourceWidth || !sourceHeight) return Promise.resolve("");
    var scale = Math.min(1, 720 / Math.max(sourceWidth, sourceHeight));
    scanCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
    scanCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
    var context = scanCanvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(scanVideo, 0, 0, scanCanvas.width, scanCanvas.height);

    if (scannerDetector) {
      return scannerDetector.detect(scanCanvas).then(function (codes) {
        return codes && codes.length ? String(codes[0].rawValue || "") : decodeWithJsQr(context);
      }).catch(function () { return decodeWithJsQr(context); });
    }
    return Promise.resolve(decodeWithJsQr(context));
  }

  function decodeWithJsQr(context) {
    if (typeof window.jsQR !== "function") return "";
    var image = context.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    var result = window.jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
    return result && result.data ? String(result.data) : "";
  }

  function showScannerError(message) {
    cameraWaiting.hidden = true;
    scanStatus.className = "scan-status is-error";
    scanStatus.textContent = message;
  }

  function closeScanner() {
    if (scannerAnimation) window.cancelAnimationFrame(scannerAnimation);
    scannerAnimation = 0;
    scannerFrameBusy = false;
    if (scannerStream) {
      scannerStream.getTracks().forEach(function (track) { track.stop(); });
      scannerStream = null;
    }
    scanVideo.pause();
    scanVideo.srcObject = null;
    scanModal.hidden = true;
    document.documentElement.classList.remove("scanner-open");
    document.body.classList.remove("scanner-open");
    if (scannerReturnFocus && typeof scannerReturnFocus.focus === "function") scannerReturnFocus.focus();
  }

  function setLookupBusy(value) {
    lookupBusy = Boolean(value);
    scanButton.disabled = lookupBusy;
    addSpkButton.disabled = lookupBusy;
    manualSpkInput.disabled = lookupBusy;
    addSpkButton.querySelector("i").className = lookupBusy ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-plus";
  }

  function setLookupState(message, tone) {
    lookupState.hidden = !message;
    lookupState.className = "lookup-state" + (tone ? " is-" + tone : "");
    var icon = tone === "success" ? "fa-circle-check" : tone === "error" ? "fa-circle-exclamation" :
      tone === "warning" ? "fa-triangle-exclamation" : tone === "loading" ? "fa-spinner fa-spin" : "fa-circle-info";
    lookupState.innerHTML = message
      ? '<i class="fa-solid ' + icon + '" aria-hidden="true"></i><span>' + escapeHtml(message) + '</span>'
      : "";
  }

  function showFormAlert(message, route) {
    formAlert.textContent = message;
    formAlert.hidden = false;
    if (route) {
      var card = routingGroupsElement.querySelector('[data-route-card="' + cssEscape(route) + '"]');
      if (card) {
        card.classList.add("has-error");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        var field = card.querySelector("input, textarea, canvas");
        if (field) window.setTimeout(function () { field.focus(); }, 280);
      }
    }
  }

  function clearFormAlert() {
    formAlert.hidden = true;
    formAlert.textContent = "";
    routingGroupsElement.querySelectorAll(".has-error").forEach(function (card) {
      card.classList.remove("has-error");
    });
  }

  function showToast(message, isError) {
    var toast = document.getElementById("toast");
    toast.querySelector("span").textContent = message;
    toast.querySelector("i").className = isError ? "fa-solid fa-circle-exclamation" : "fa-solid fa-circle-check";
    toast.classList.toggle("error", Boolean(isError));
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 4200);
  }

  function extractSpkNumber(value) {
    var text = String(value || "").trim();
    if (!text) return "";
    try {
      var url = new URL(text);
      text = url.searchParams.get("spk") || url.searchParams.get("SPK") || text;
    } catch (error) {}
    text = text.split(/\r?\n/)[0].replace(/^\s*(?:NO\.?\s*)?SPK\s*[:#-]?\s*/i, "");
    return normalizeSpk(text).slice(0, 80);
  }

  function normalizeSpk(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  }

  function normalizeRoute(value) {
    var key = String(value || "").trim().toLowerCase();
    return ROUTE_ORDER.indexOf(key) > -1 ? key : "";
  }

  function routeLabel(value) {
    var key = normalizeRoute(value);
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
  }

  function routeIcon(value) {
    return ROUTE_ICONS[normalizeRoute(value)] || "fa-gears";
  }

  function joinMeta(values) {
    return values.filter(function (value) { return String(value || "").trim(); }).join(" · ") || "—";
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
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
