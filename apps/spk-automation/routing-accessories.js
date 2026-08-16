(function () {
  "use strict";

  var MAX_ACCESSORIES = 12;
  var UOM_GROUPS = [
    {
      label: "Jumlah & hitungan",
      options: [
        ["PCS", "PCS — Buah"], ["UNIT", "UNIT — Unit"], ["SET", "SET — Set"],
        ["PASANG", "PASANG — Pasang"], ["LUSIN", "LUSIN — 12 buah"],
        ["KODI", "KODI — 20 buah"], ["GROSS", "GROSS — 144 buah"]
      ]
    },
    {
      label: "Panjang & jarak",
      options: [
        ["MM", "MM — Milimeter"], ["CM", "CM — Sentimeter"],
        ["M", "M — Meter"], ["KM", "KM — Kilometer"],
        ["INCH", "INCH — Inci"], ["FT", "FT — Kaki"], ["YARD", "YARD — Yard"]
      ]
    },
    {
      label: "Berat & massa",
      options: [
        ["MG", "MG — Miligram"], ["GRAM", "GRAM — Gram"], ["ONS", "ONS — Ons"],
        ["KG", "KG — Kilogram"], ["KWINTAL", "KWINTAL — 100 kg"], ["TON", "TON — Ton"]
      ]
    },
    {
      label: "Luas",
      options: [
        ["MM2", "MM² — Milimeter persegi"], ["CM2", "CM² — Sentimeter persegi"],
        ["M2", "M² — Meter persegi"], ["HEKTAR", "HEKTAR — Hektare"]
      ]
    },
    {
      label: "Volume",
      options: [
        ["ML", "ML — Mililiter"], ["CL", "CL — Sentiliter"], ["CC", "CC — Sentimeter kubik"],
        ["LITER", "LITER — Liter"], ["M3", "M³ — Meter kubik"], ["GALON", "GALON — Galon"]
      ]
    },
    {
      label: "Kemasan",
      options: [
        ["PACK", "PACK — Paket"], ["PAK", "PAK — Pak"], ["BOX", "BOX — Boks"],
        ["KOTAK", "KOTAK — Kotak"], ["KARTON", "KARTON — Karton"],
        ["SAK", "SAK — Sak"], ["KARUNG", "KARUNG — Karung"],
        ["BOTOL", "BOTOL — Botol"], ["KALENG", "KALENG — Kaleng"],
        ["JERIGEN", "JERIGEN — Jerigen"], ["DRUM", "DRUM — Drum"],
        ["PALLET", "PALLET — Palet"], ["BUNDLE", "BUNDLE — Bundel"],
        ["BAL", "BAL — Bal"], ["RIM", "RIM — Rim"]
      ]
    },
    {
      label: "Bentuk material & produksi",
      options: [
        ["ROLL", "ROLL — Gulungan"], ["GULUNG", "GULUNG — Gulung"],
        ["LEMBAR", "LEMBAR — Lembar"], ["SHEET", "SHEET — Lembaran"],
        ["BATANG", "BATANG — Batang"], ["SPOL", "SPOL — Spol"],
        ["CONE", "CONE — Kerucut"], ["TUBE", "TUBE — Tabung"],
        ["BOBBIN", "BOBBIN — Bobbin"], ["LOT", "LOT — Lot"]
      ]
    },
    {
      label: "Waktu & layanan",
      options: [
        ["DETIK", "DETIK — Detik"], ["MENIT", "MENIT — Menit"],
        ["JAM", "JAM — Jam"], ["HARI", "HARI — Hari"],
        ["SHIFT", "SHIFT — Giliran kerja"], ["JASA", "JASA — Layanan"]
      ]
    }
  ];
  var UOM_OPTIONS = UOM_GROUPS.reduce(function (all, group) {
    return all.concat(group.options.map(function (option) { return option[0]; }));
  }, []);

  function escapeAccessoryAttr_(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fieldId_(routeKey) {
    return "aksesorisData-" + routeKey;
  }

  function hiddenField_(routeKey) {
    return document.getElementById(fieldId_(routeKey));
  }

  function parseEntries_(raw) {
    try {
      var parsed = JSON.parse(String(raw || "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeEntries_(entries) {
    return (Array.isArray(entries) ? entries : []).slice(0, MAX_ACCESSORIES).map(function (entry) {
      return {
        nama: String(entry && entry.nama !== undefined ? entry.nama : "").trim().slice(0, 120),
        kebutuhan: String(entry && entry.kebutuhan !== undefined ? entry.kebutuhan : "").trim().slice(0, 40),
        uom: String(entry && entry.uom !== undefined ? entry.uom : "").trim().toUpperCase().slice(0, 20)
      };
    });
  }

  function entriesForRoute_(routeKey) {
    var field = hiddenField_(routeKey);
    return normalizeEntries_(parseEntries_(field ? field.value : "[]"));
  }

  function saveEntries_(routeKey, entries) {
    var normalized = normalizeEntries_(entries);
    var field = hiddenField_(routeKey);
    if (field) field.value = JSON.stringify(normalized);
    return normalized;
  }

  function focusField_(id) {
    window.requestAnimationFrame(function () {
      var field = document.getElementById(id);
      if (field) field.focus();
    });
  }

  window.renderRoutingAccessoryControls_ = function () {
    ROUTING_LIST.forEach(function (item) {
      if (item.key === "mixer") return;
      var panel = document.getElementById("route-" + item.key);
      if (!panel) return;

      var block = panel.querySelector('[data-routing-accessories="' + item.key + '"]');
      if (!block) {
        block = document.createElement("section");
        block.className = "routing-accessory-control";
        block.dataset.routingAccessories = item.key;
        block.setAttribute("aria-label", "Daftar aksesoris");
        block.innerHTML =
          '<input type="hidden" id="' + fieldId_(item.key) + '" value="[]">' +
          '<div class="routing-accessory-head">' +
            '<div>' +
              '<span class="field-label">Aksesoris</span>' +
              '<p class="field-hint">Tambahkan aksesoris, jumlah kebutuhan, dan UOM untuk langkah ini.</p>' +
            '</div>' +
            '<div class="routing-accessory-head-actions">' +
              '<span class="routing-accessory-count" id="aksesorisCount-' + item.key + '">0/' + MAX_ACCESSORIES + '</span>' +
              '<button type="button" class="routing-accessory-add" id="aksesorisAdd-' + item.key + '" onclick="addRoutingAccessory_(\'' + item.key + '\')">+ Tambah Aksesoris</button>' +
            '</div>' +
          '</div>' +
          '<div class="routing-accessory-empty" id="aksesorisEmpty-' + item.key + '">Belum ada aksesoris untuk langkah ini.</div>' +
          '<div class="routing-accessory-list" id="aksesorisRows-' + item.key + '"></div>';

        var target = item.key === "cutting"
          ? document.getElementById("finishingNoteArea")
          : panel.querySelector(".route-note");
        var host = item.key === "cutting" ? document.getElementById("cuttingDetail") : panel;
        if (host) host.insertBefore(block, target || null);
      }
      window.renderRoutingAccessoryRows_(item.key);
    });
  };

  window.renderRoutingAccessoryRows_ = function (routeKey) {
    var entries = saveEntries_(routeKey, entriesForRoute_(routeKey));
    var list = document.getElementById("aksesorisRows-" + routeKey);
    var empty = document.getElementById("aksesorisEmpty-" + routeKey);
    var count = document.getElementById("aksesorisCount-" + routeKey);
    var addButton = document.getElementById("aksesorisAdd-" + routeKey);
    if (!list) return;

    list.innerHTML = entries.map(function (entry, index) {
      var uomOptions = '<option value="">Pilih UOM</option>' + UOM_GROUPS.map(function (group) {
        return '<optgroup label="' + escapeAccessoryAttr_(group.label) + '">' + group.options.map(function (option) {
          return '<option value="' + option[0] + '"' + (entry.uom === option[0] ? ' selected' : '') + '>' + option[1] + '</option>';
        }).join("") + '</optgroup>';
      }).join("");
      return '<div class="routing-accessory-row">' +
        '<span class="routing-accessory-index" aria-hidden="true">' + String(index + 1).padStart(2, "0") + '</span>' +
        '<div class="routing-accessory-field routing-accessory-name">' +
          '<label class="field-label" for="aksesorisNama-' + routeKey + '-' + index + '">Aksesoris</label>' +
          '<input type="text" maxlength="120" id="aksesorisNama-' + routeKey + '-' + index + '" class="field-input" value="' + escapeAccessoryAttr_(entry.nama) + '" placeholder="Nama aksesoris" oninput="setRoutingAccessory_(\'' + routeKey + '\',' + index + ',\'nama\',this.value);this.classList.remove(\'wizard-invalid\')">' +
        '</div>' +
        '<div class="routing-accessory-field routing-accessory-need">' +
          '<label class="field-label" for="aksesorisKebutuhan-' + routeKey + '-' + index + '">Kebutuhan</label>' +
          '<input type="number" min="0" step="any" inputmode="decimal" id="aksesorisKebutuhan-' + routeKey + '-' + index + '" class="field-input" value="' + escapeAccessoryAttr_(entry.kebutuhan) + '" placeholder="0" oninput="setRoutingAccessory_(\'' + routeKey + '\',' + index + ',\'kebutuhan\',this.value);this.classList.remove(\'wizard-invalid\')">' +
        '</div>' +
        '<div class="routing-accessory-field routing-accessory-uom">' +
          '<label class="field-label" for="aksesorisUom-' + routeKey + '-' + index + '">UOM</label>' +
          '<select id="aksesorisUom-' + routeKey + '-' + index + '" class="field-input" onchange="setRoutingAccessory_(\'' + routeKey + '\',' + index + ',\'uom\',this.value);this.classList.remove(\'wizard-invalid\')">' + uomOptions + '</select>' +
        '</div>' +
        '<button type="button" class="routing-accessory-remove" onclick="removeRoutingAccessory_(\'' + routeKey + '\',' + index + ')" aria-label="Hapus aksesoris">&times;</button>' +
      '</div>';
    }).join("");

    if (empty) empty.hidden = entries.length > 0;
    if (count) count.textContent = entries.length + "/" + MAX_ACCESSORIES;
    if (addButton) addButton.disabled = entries.length >= MAX_ACCESSORIES;
  };

  window.addRoutingAccessory_ = function (routeKey) {
    var entries = entriesForRoute_(routeKey);
    if (entries.length >= MAX_ACCESSORIES) return;
    entries.push({ nama: "", kebutuhan: "", uom: "" });
    saveEntries_(routeKey, entries);
    window.renderRoutingAccessoryRows_(routeKey);
    focusField_("aksesorisNama-" + routeKey + "-" + (entries.length - 1));
  };

  window.removeRoutingAccessory_ = function (routeKey, index) {
    var entries = entriesForRoute_(routeKey);
    entries.splice(index, 1);
    saveEntries_(routeKey, entries);
    window.renderRoutingAccessoryRows_(routeKey);
  };

  window.setRoutingAccessory_ = function (routeKey, index, property, value) {
    var entries = entriesForRoute_(routeKey);
    if (!entries[index] || ["nama", "kebutuhan", "uom"].indexOf(property) === -1) return;
    entries[index][property] = String(value === null || value === undefined ? "" : value);
    saveEntries_(routeKey, entries);
  };

  window.syncRoutingAccessoryInput_ = function (routeKey) {
    window.renderRoutingAccessoryRows_(routeKey);
  };

  window.validateRoutingAccessories_ = function (routeKey) {
    var entries = entriesForRoute_(routeKey);
    for (var index = 0; index < entries.length; index += 1) {
      if (!entries[index].nama) {
        var nameField = document.getElementById("aksesorisNama-" + routeKey + "-" + index);
        if (nameField) { nameField.classList.add("wizard-invalid"); nameField.focus(); }
        showRoutingFeedback_("Isi nama aksesoris atau hapus baris yang tidak digunakan.", "error");
        return false;
      }
      var need = Number(String(entries[index].kebutuhan || "").replace(",", "."));
      if (!Number.isFinite(need) || need <= 0) {
        var needField = document.getElementById("aksesorisKebutuhan-" + routeKey + "-" + index);
        if (needField) { needField.classList.add("wizard-invalid"); needField.focus(); }
        showRoutingFeedback_("Kebutuhan aksesoris harus lebih besar dari nol.", "error");
        return false;
      }
      if (UOM_OPTIONS.indexOf(entries[index].uom) === -1) {
        var uomField = document.getElementById("aksesorisUom-" + routeKey + "-" + index);
        if (uomField) { uomField.classList.add("wizard-invalid"); uomField.focus(); }
        showRoutingFeedback_("Pilih UOM untuk setiap aksesoris.", "error");
        return false;
      }
    }
    return true;
  };

  window.getStepAccessoryEntries_ = function (step) {
    if (!step || step.key === "mixer") return [];
    var values = step.values && typeof step.values === "object" ? step.values : {};
    return normalizeEntries_(parseEntries_(values[fieldId_(step.key)])).filter(function (entry) {
      return entry.nama && Number(String(entry.kebutuhan).replace(",", ".")) > 0 && UOM_OPTIONS.indexOf(entry.uom) > -1;
    });
  };

  window.getStepAccessorySummary_ = function (step) {
    return window.getStepAccessoryEntries_(step).map(function (entry) {
      return entry.nama + ": " + entry.kebutuhan + " " + entry.uom;
    }).join(" / ");
  };
})();
