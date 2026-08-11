(function () {
  "use strict";

  function validBsKey_(key) {
    return BS_LIST.some(function (item) { return item.key === key; });
  }

  function escapeBsAttr_(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseBsEntries_(raw) {
    try {
      var parsed = JSON.parse(String(raw || "[]"));
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeBsEntries_(entries) {
    var seen = {};
    return (Array.isArray(entries) ? entries : []).slice(0, BS_LIST.length).map(function (entry) {
      var key = String(entry && entry.key ? entry.key : "").trim();
      var value = String(entry && entry.value !== null && entry.value !== undefined ? entry.value : "").trim();
      if (!validBsKey_(key) || seen[key]) key = "";
      if (key) seen[key] = true;
      return { key: key, value: value };
    });
  }

  function hiddenField_(routeKey) {
    return document.getElementById("bsDaftar-" + routeKey);
  }

  function controlEntries_(routeKey) {
    var field = hiddenField_(routeKey);
    var parsed = field ? parseBsEntries_(field.value) : [];
    return normalizeBsEntries_(parsed || []);
  }

  function saveControlEntries_(routeKey, entries) {
    var normalized = normalizeBsEntries_(entries);
    var field = hiddenField_(routeKey);
    if (field) field.value = JSON.stringify(normalized);
    return normalized;
  }

  function focusBsField_(id) {
    window.requestAnimationFrame(function () {
      var field = document.getElementById(id);
      if (field) field.focus();
    });
  }

  window.renderRoutingBsControls_ = function () {
    ROUTING_LIST.forEach(function (item) {
      if (item.key === "mixer") return;

      var panel = document.getElementById("route-" + item.key);
      if (!panel) return;

      var block = document.querySelector('[data-routing-bs="' + item.key + '"]');
      if (!block) {
        block = document.createElement("section");
        block.className = "routing-bs-control";
        block.dataset.routingBs = item.key;
        block.setAttribute("aria-label", "Daftar BS");
        block.innerHTML =
          '<input type="hidden" id="bsDaftar-' + item.key + '" value="[]">' +
          '<div class="routing-bs-head">' +
            '<div class="routing-bs-control-copy">' +
              '<span class="field-label">Daftar BS</span>' +
              '<p class="field-hint">Tambahkan satu atau beberapa jenis BS untuk langkah routing ini.</p>' +
            '</div>' +
            '<div class="routing-bs-head-actions">' +
              '<span class="routing-bs-count" id="bsCount-' + item.key + '">0/' + BS_LIST.length + '</span>' +
              '<button type="button" class="routing-bs-add" id="bsAdd-' + item.key + '" onclick="addRoutingBs_(\'' + item.key + '\')">+ Tambah BS</button>' +
            '</div>' +
          '</div>' +
          '<div class="routing-bs-empty" id="bsEmpty-' + item.key + '">Belum ada BS. Gunakan tombol Tambah BS.</div>' +
          '<div class="routing-bs-list" id="bsRows-' + item.key + '"></div>';

        var target = item.key === "cutting"
          ? document.getElementById("finishingNoteArea")
          : panel.querySelector(".route-note");
        var host = item.key === "cutting" ? document.getElementById("cuttingDetail") : panel;
        if (host) host.insertBefore(block, target || null);
      }

      panel.querySelectorAll('[id^="bs-"]').forEach(function (input) {
        var cell = input.closest(".form-cell");
        if (cell) cell.classList.add("legacy-bs-control");
      });
      var extra = panel.querySelector(".routing-extra");
      if (extra) extra.classList.add("legacy-bs-control");
      renderRoutingBsRows_(item.key);
    });

    var sheetArea = document.getElementById("bsSheetArea");
    if (sheetArea) sheetArea.classList.add("legacy-bs-control");
  };

  window.renderRoutingBsRows_ = function (routeKey) {
    var entries = saveControlEntries_(routeKey, controlEntries_(routeKey));
    var list = document.getElementById("bsRows-" + routeKey);
    var empty = document.getElementById("bsEmpty-" + routeKey);
    var count = document.getElementById("bsCount-" + routeKey);
    var addButton = document.getElementById("bsAdd-" + routeKey);
    if (!list) return;

    var selectedKeys = entries.map(function (entry) { return entry.key; }).filter(Boolean);
    list.innerHTML = entries.map(function (entry, index) {
      var options = '<option value="">Pilih jenis BS</option>' + BS_LIST.map(function (item) {
        var selected = item.key === entry.key;
        var usedElsewhere = !selected && selectedKeys.indexOf(item.key) > -1;
        return '<option value="' + escapeBsAttr_(item.key) + '"' +
          (selected ? ' selected' : '') + (usedElsewhere ? ' disabled' : '') + '>' +
          escapeBsAttr_(item.label) + '</option>';
      }).join("");

      return '<div class="routing-bs-row">' +
        '<span class="routing-bs-index" aria-hidden="true">' + String(index + 1).padStart(2, "0") + '</span>' +
        '<div class="routing-bs-row-field routing-bs-row-type">' +
          '<label class="field-label" for="bsJenis-' + routeKey + '-' + index + '">Jenis BS</label>' +
          '<select id="bsJenis-' + routeKey + '-' + index + '" class="field-input" onchange="setRoutingBsType_(\'' + routeKey + '\',' + index + ',this.value)">' + options + '</select>' +
        '</div>' +
        '<div class="routing-bs-row-field routing-bs-row-value">' +
          '<label class="field-label" for="bsNilai-' + routeKey + '-' + index + '">Nilai BS (%)</label>' +
          '<input type="number" step="any" min="0" max="100" inputmode="decimal" id="bsNilai-' + routeKey + '-' + index + '" class="field-input" value="' + escapeBsAttr_(entry.value) + '" oninput="setRoutingBsValue_(\'' + routeKey + '\',' + index + ',this.value);this.classList.remove(\'wizard-invalid\')">' +
        '</div>' +
        '<button type="button" class="routing-bs-remove" onclick="removeRoutingBs_(\'' + routeKey + '\',' + index + ')" aria-label="Hapus BS">&times;</button>' +
      '</div>';
    }).join("");

    if (empty) empty.hidden = entries.length > 0;
    if (count) count.textContent = entries.length + "/" + BS_LIST.length;
    if (addButton) {
      var hasBlank = entries.some(function (entry) { return !entry.key; });
      addButton.disabled = entries.length >= BS_LIST.length || hasBlank;
      addButton.title = entries.length >= BS_LIST.length
        ? "Semua jenis BS sudah ditambahkan."
        : (hasBlank ? "Pilih jenis BS pada baris yang tersedia." : "Tambah BS");
    }
  };

  window.addRoutingBs_ = function (routeKey) {
    var entries = controlEntries_(routeKey);
    var blankIndex = entries.findIndex(function (entry) { return !entry.key; });
    if (blankIndex > -1) {
      focusBsField_("bsJenis-" + routeKey + "-" + blankIndex);
      return;
    }
    if (entries.length >= BS_LIST.length) return;
    entries.push({ key: "", value: "" });
    saveControlEntries_(routeKey, entries);
    renderRoutingBsRows_(routeKey);
    focusBsField_("bsJenis-" + routeKey + "-" + (entries.length - 1));
  };

  window.removeRoutingBs_ = function (routeKey, index) {
    var entries = controlEntries_(routeKey);
    entries.splice(index, 1);
    saveControlEntries_(routeKey, entries);
    renderRoutingBsRows_(routeKey);
    hitungTotalBs();
  };

  window.setRoutingBsType_ = function (routeKey, index, key) {
    var entries = controlEntries_(routeKey);
    if (!entries[index]) return;
    var duplicate = entries.some(function (entry, entryIndex) {
      return entryIndex !== index && entry.key === key && key !== "";
    });
    entries[index].key = duplicate || !validBsKey_(key) ? "" : key;
    saveControlEntries_(routeKey, entries);
    renderRoutingBsRows_(routeKey);
    if (entries[index].key) focusBsField_("bsNilai-" + routeKey + "-" + index);
    hitungTotalBs();
  };

  window.setRoutingBsValue_ = function (routeKey, index, value) {
    var entries = controlEntries_(routeKey);
    if (!entries[index]) return;
    entries[index].value = String(value === null || value === undefined ? "" : value);
    saveControlEntries_(routeKey, entries);
    hitungTotalBs();
  };

  window.syncRoutingBsInput_ = function (routeKey) {
    renderRoutingBsRows_(routeKey);
    hitungTotalBs();
  };

  window.validateRoutingBs_ = function (routeKey) {
    var entries = controlEntries_(routeKey);
    for (var index = 0; index < entries.length; index += 1) {
      if (!entries[index].key) {
        var select = document.getElementById("bsJenis-" + routeKey + "-" + index);
        if (select) {
          select.classList.add("wizard-invalid");
          select.focus();
        }
        showRoutingFeedback_("Pilih jenis BS pada setiap baris atau hapus baris yang tidak digunakan.", "error");
        return false;
      }

      var raw = String(entries[index].value || "").trim();
      var value = parseFloat(raw);
      if (raw === "" || !Number.isFinite(value) || value < 0 || value > 100) {
        var input = document.getElementById("bsNilai-" + routeKey + "-" + index);
        if (input) {
          input.classList.add("wizard-invalid");
          input.focus();
        }
        showRoutingFeedback_("Isi setiap nilai BS antara 0 sampai 100 persen.", "error");
        return false;
      }
    }
    return true;
  };

  window.migrateLegacyRoutingBsValues_ = function (routeKey, values, options) {
    if (routeKey === "mixer" || !values) return;
    var listId = "bsDaftar-" + routeKey;
    var hasList = Object.prototype.hasOwnProperty.call(values, listId);
    var parsed = hasList ? parseBsEntries_(values[listId]) : null;
    if (parsed !== null && (parsed.length || (options && options.preserveExplicitEmpty))) {
      values[listId] = JSON.stringify(normalizeBsEntries_(parsed));
      return;
    }

    var entries = [];
    var selectedKey = String(values["bsJenis-" + routeKey] || "").trim();
    if (validBsKey_(selectedKey)) {
      entries.push({
        key: selectedKey,
        value: String(values["bsNilai-" + routeKey] || "")
      });
    } else {
      var legacyStep = { key: routeKey, values: values };
      stepBsKeys_(legacyStep).forEach(function (bsKey) {
        var value = parseFloat(stepValue_(legacyStep, "bs-" + bsKey)) || 0;
        if (value > 0) entries.push({ key: bsKey, value: String(value) });
      });
    }
    values[listId] = JSON.stringify(normalizeBsEntries_(entries));
  };

  window.getStepBsEntries_ = function (step) {
    var routeKey = step ? String(step.key || "") : "";
    if (!routeKey || routeKey === "mixer") return [];

    var values = step && step.values ? step.values : {};
    var listId = "bsDaftar-" + routeKey;
    if (Object.prototype.hasOwnProperty.call(values, listId)) {
      var parsed = parseBsEntries_(values[listId]);
      if (parsed !== null) {
        return normalizeBsEntries_(parsed).filter(function (entry) {
          return validBsKey_(entry.key);
        }).map(function (entry) {
          return { key: entry.key, value: parseFloat(entry.value) || 0 };
        });
      }
    }

    var selectedKey = String(stepValue_(step, "bsJenis-" + routeKey) || "").trim();
    if (validBsKey_(selectedKey)) {
      return [{
        key: selectedKey,
        value: parseFloat(stepValue_(step, "bsNilai-" + routeKey)) || 0
      }];
    }

    return stepBsKeys_(step).map(function (bsKey) {
      return { key: bsKey, value: parseFloat(stepValue_(step, "bs-" + bsKey)) || 0 };
    });
  };
})();
