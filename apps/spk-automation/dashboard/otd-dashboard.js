/* =====================================================================
   DASBOR PPIC — REKAPAN DARI DATABASE SPK
   ---------------------------------------------------------------------
   Tiga hal yang membentuk susunan berkas ini:

   1. Seluruh rekapan dihitung dalam SATU lintasan per tahun, lalu
      hasilnya disimpan. Sebelumnya baris yang sama ditelusuri berkali
      kali: sekali untuk KPI, sekali untuk rekap, sekali untuk daftar
      kontribusi marketing, dan sekali lagi untuk penyaring. Nilai KG
      tiap baris pun dihitung ulang di setiap tempat.

   2. Muatan dari server disimpan di peramban dan ditandai dengan token
      revisi milik server. Saat dibuka lagi, rekapan langsung tampil
      dari simpanan itu sementara token diperiksa di latar. Pemeriksaan
      token jauh lebih ringan daripada menarik seluruh tabel.

   3. Penggambaran dipecah antar bingkai. Menggambar lima panel sekaligus
      mengunci utas utama, sehingga bilah kemajuan tidak sempat tergambar
      dan halaman justru terasa membeku.
   ===================================================================== */

(function () {
  'use strict';

  var state = { rows: [], filtered: [], meta: null, cache: {}, signature: '' };
  var marketingYear = 0;
  var REALTIME_INTERVAL_MS = 5000;
  var realtimeTimer = null;
  var realtimeInFlight = false;

  var DATABASE_TABLE_COL = {
    SPK: 0,
    TANGGAL: 1,
    MARKETING: 3,
    CUSTOMER: 4,
    ARTIKEL: 5,
    MATERIAL: 7,
    JUMLAH: 8,
    UOM: 9,
    TRACKING: 12
  };

  var els = {
    status: document.getElementById('dataStatus'),
    processBars: document.getElementById('processBars'),
    marketingBars: document.getElementById('marketingBars'),
    recapTotals: document.getElementById('recapTotals'),
    routingRecap: document.getElementById('routingRecap'),
    materialRecap: document.getElementById('materialRecap'),
    routeMaterialRecap: document.getElementById('routeMaterialRecap'),
    monthlyRecap: document.getElementById('monthlyRecap'),
    marketingRecap: document.getElementById('marketingRecap'),
    trackingRecap: document.getElementById('trackingRecap')
  };

  /* ------------------------------------------------------- pembantu */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(v, decimals) {
    return Number(v || 0).toLocaleString('id-ID', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals == null ? 1 : decimals
    });
  }

  function setPeriodTitle() {
    var monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var today = new Date();
    var title = 'Outstanding On Hand Periode ' + today.getDate() + ' ' +
      monthNames[today.getMonth()] + ' ' + today.getFullYear();
    var heading = document.getElementById('recapTitle');
    if (heading) heading.textContent = title;
  }

  function mainMaterial(value) {
    var material = String(value || '').trim();
    var main = material ? material.split(/\s+/)[0].toUpperCase() : '';
    if (main === 'HD') return 'HDPE';
    if (main === 'PE') return 'LLDPE';
    return main || 'Belum ditentukan';
  }

  function spkYear(value) {
    var match = String(value || '').trim().toUpperCase().match(/^[A-Z](\d{2})\./);
    return match ? 2000 + Number(match[1]) : 0;
  }

  function kgValue(row) {
    var order = Number(row.order || 0);
    var factor = Number(row.pcsPerKg || 0);
    return row.uom === 'KG' ? order : (factor > 0 ? order / factor : 0);
  }

  // Satu penentu dipakai oleh Total Outstanding dan seluruh panel rekapan.
  // SPK tanpa tracking belum masuk proses, sedangkan F sudah selesai.
  function isOutstanding(row) {
    return Boolean(row && row.tracking && row.tracking !== 'F');
  }

  // Pada rekapan outstanding, Mixer merupakan bagian dari proses Blowing.
  // Normalisasi dilakukan tanpa mengubah data routing asli SPK.
  function outstandingRoute(value) {
    var route = String(value || '').trim();
    var key = route.toLowerCase();
    if (key === 'mixer' || key === 'blowing') return 'Blowing';
    return route;
  }

  function qtyLabel(q) {
    return num(q.KG || 0, 1) + ' KG';
  }

  function sortByCount(a, b) {
    return b.count - a.count || a.name.localeCompare(b.name);
  }

  function values(map) {
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  /* ------------------------------------------------ bilah kemajuan */

  /* Persentase hanya berubah setelah tahap pemuatan benar-benar selesai. */

  var progress = { el: null, bar: null, persen: null, tahap: null, nilai: 0, sasaran: 0, timer: null };

  function buildProgress() {
    if (progress.el) return progress.el;

    var section = document.querySelector('.production-recap');
    if (!section) return null;

    var box = document.createElement('div');
    box.className = 'recap-progress';
    box.setAttribute('role', 'progressbar');
    box.setAttribute('aria-valuemin', '0');
    box.setAttribute('aria-valuemax', '100');
    box.innerHTML =
      '<div class="recap-progress-copy">' +
      '<span class="recap-progress-tahap">Menyiapkan rekapan</span>' +
      '<strong class="recap-progress-persen">0%</strong>' +
      '</div>' +
      '<span class="recap-progress-track"><span class="recap-progress-bar"></span></span>';

    section.insertBefore(box, section.children[1] || null);

    progress.el = box;
    progress.bar = box.querySelector('.recap-progress-bar');
    progress.persen = box.querySelector('.recap-progress-persen');
    progress.tahap = box.querySelector('.recap-progress-tahap');
    return box;
  }

  function paintProgress() {
    if (!progress.el) return;
    var persen = Math.max(0, Math.min(100, progress.nilai));
    progress.bar.style.width = persen + '%';
    progress.persen.textContent = Math.round(persen) + '%';
    progress.el.setAttribute('aria-valuenow', String(Math.round(persen)));
  }

  function startProgress(label) {
    if (!buildProgress()) return;
    progress.nilai = 0;
    progress.sasaran = 0;
    progress.el.hidden = false;
    progress.el.classList.remove('is-selesai');
    progress.tahap.textContent = label || 'Menyiapkan rekapan';
    paintProgress();

  }

  function stepProgress(sasaran, label) {
    if (!progress.el) return;
    progress.sasaran = sasaran;
    if (label) progress.tahap.textContent = label;
    progress.nilai = sasaran;
    paintProgress();
  }

  function endProgress() {
    if (!progress.el) return;
    if (progress.timer) {
      window.clearInterval(progress.timer);
      progress.timer = null;
    }
    progress.nilai = 100;
    progress.sasaran = 100;
    progress.tahap.textContent = 'Rekapan siap';
    paintProgress();

    window.setTimeout(function () {
      if (!progress.el) return;
      progress.el.classList.add('is-selesai');
      window.setTimeout(function () {
        if (progress.el) progress.el.hidden = true;
      }, 320);
    }, 240);
  }

  function failProgress(message) {
    if (!progress.el) return;
    if (progress.timer) {
      window.clearInterval(progress.timer);
      progress.timer = null;
    }
    progress.el.classList.add('is-gagal');
    progress.tahap.textContent = message || 'Rekapan gagal dimuat';
  }

  // Memberi peramban satu bingkai untuk menggambar sebelum tahap berikutnya.
  function nextFrame(callback) {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(function () { window.setTimeout(callback, 0); });
      return;
    }
    window.setTimeout(callback, 16);
  }

  /* ---------------------------------------------------- perhitungan */

  /**
   * Satu lintasan menghasilkan seluruh bahan untuk KPI, kelima panel
   * rekapan, dan kedua grafik batang. Hasilnya disimpan per tahun,
   * sehingga berpindah tahun yang sudah pernah dibuka tidak menghitung
   * ulang apa pun.
   */
  function aggregate() {
    if (state.cache.all) return state.cache.all;

    var rows = state.rows;
    var routing = {};
    var materials = {};
    var routeMaterials = {};
    var marketing = {};
    var marketingOrder = [];
    var marketingByYear = {};
    var tracking = {};
    var months = [];
    var totalQty = { KG: 0, PCS: 0 };
    var trackedQty = { KG: 0, PCS: 0 };
    var kpi = { kg: 0, pcs: 0, aging30: 0, oldest: 0 };
    var totalTrackedSpk = 0;

    for (var m = 0; m < 12; m++) months.push({});

    rows.forEach(function (row) {
      var kg = row._kg;
      var material = mainMaterial(row.material);
      var pcs = row.uom === 'PCS' ? Number(row.order || 0) : 0;
      var monthIndex = Number(String(row.tanggalPo).slice(5, 7)) - 1;
      var age = Number(row.aging) || 0;
      var outstanding = isOutstanding(row);
      if (row.tracking) {
        tracking[row.tracking] = (tracking[row.tracking] || 0) + 1;
      }

      totalQty.KG += kg;
      totalQty.PCS += pcs;
      if (!outstanding) return;

      totalTrackedSpk++;
      trackedQty.KG += kg;
      trackedQty.PCS += pcs;
      kpi.kg += kg;
      kpi.pcs += pcs;
      if (age >= 30) kpi.aging30++;
      if (age > kpi.oldest) kpi.oldest = age;

      var bucket = materials[material] ||
        (materials[material] = { name: material, count: 0, qty: { KG: 0, PCS: 0 } });
      bucket.count++;
      bucket.qty.KG += kg;
      bucket.qty.PCS += pcs;

      var person = row.marketing || 'Belum ditentukan';
      var orang = marketing[person];
      if (!orang) {
        orang = marketing[person] = { name: person, count: 0, kg: 0, pcs: 0 };
        marketingOrder.push(person);
      }
      orang.count++;
      orang.kg += kg;
      orang.pcs += pcs;

      var year = spkYear(row.spk);
      if (year) {
        var yearMarketing = marketingByYear[year] || (marketingByYear[year] = {});
        var yearPerson = yearMarketing[person] || (yearMarketing[person] = {
          name: person, count: 0, kg: 0, pcs: 0
        });
        yearPerson.count++;
        yearPerson.kg += kg;
        yearPerson.pcs += pcs;
      }

      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex][material] = (months[monthIndex][material] || 0) + 1;
      }

      // Mixer dilebur ke Blowing sebelum routing unik dihitung. Dengan begitu
      // SPK yang memiliki Mixer dan Blowing hanya dihitung sekali sebagai Blowing.
      var seen = {};
      (row.routing || []).forEach(function (value) {
        var route = outstandingRoute(value);
        var routeKey = route.toLowerCase();
        if (!route || seen[routeKey]) return;
        seen[routeKey] = true;

        var jalur = routing[route] ||
          (routing[route] = { name: route, count: 0, qty: { KG: 0, PCS: 0 } });
        jalur.count++;
        jalur.qty.KG += kg;
        jalur.qty.PCS += pcs;

        var pasangan = routeMaterials[route] || (routeMaterials[route] = {});
        var sel = pasangan[material] ||
          (pasangan[material] = { count: 0, qty: { KG: 0, PCS: 0 } });
        sel.count++;
        sel.qty.KG += kg;
        sel.qty.PCS += pcs;
      });
    });

    var hasil = {
      year: 'Semua SPK',
      rows: rows,
      routeEntries: values(routing).sort(sortByCount),
      materialEntries: values(materials).sort(sortByCount),
      routeMaterials: routeMaterials,
      months: months,
      totalQty: totalQty,
      trackedQty: trackedQty,
      totalTrackedSpk: totalTrackedSpk,
      kpi: kpi,
      marketing: marketing,
      marketingOrder: marketingOrder,
      marketingByYear: marketingByYear,
      tracking: tracking,
      // Grafik batang KPI mengurutkan berdasarkan volume, sedangkan daftar
      // kontribusi memakai urutan yang sama; keduanya berbagi satu susunan.
      marketingByKg: values(marketing).sort(function (a, b) {
        return b.kg - a.kg || b.count - a.count || a.name.localeCompare(b.name);
      }),
      routingByKg: values(routing).sort(function (a, b) {
        return b.qty.KG - a.qty.KG || b.count - a.count || a.name.localeCompare(b.name);
      })
    };

    state.cache.all = hasil;
    return hasil;
  }

  /* ----------------------------------------------------- penggambar */
  /* Seluruh cetakan HTML di bawah ini dipertahankan sama persis seperti
     sebelumnya; yang berubah hanya dari mana angkanya datang. */

  function bars(target, valueMap, showShare) {
    var entries = Object.keys(valueMap).map(function (k) { return [k, valueMap[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var total = entries.reduce(function (sum, item) { return sum + Number(item[1] || 0); }, 0);
    var max = Math.max.apply(null, entries.map(function (x) { return x[1]; }).concat([1]));
    target.innerHTML = entries.map(function (item, index) {
      var share = total ? Number(item[1] || 0) / total * 100 : 0;
      var width = showShare ? share : Math.max(8, item[1] / max * 100);
      return '<div class="bar-item' + (showShare ? ' has-share color-' + (index % 6 + 1) : '') +
        '"><span class="bar-label" title="' + esc(item[0]) + '">' + esc(item[0]) +
        '</span><span class="bar-track"><span class="bar-fill" style="width:' + width +
        '%"></span></span><strong class="bar-value">' + item[1] + ' SPK</strong></div>';
    }).join('');
  }

  function routingKgBars(target, entries) {
    var max = Math.max.apply(null, entries.map(function (item) { return item.qty.KG; }).concat([1]));
    target.innerHTML = entries.map(function (item, index) {
      return '<div class="bar-item has-share routing-volume color-' + (index % 6 + 1) +
        '"><span class="bar-label" title="' + esc(item.name) + '">' + esc(item.name) +
        '</span><span class="bar-track"><span class="bar-fill" style="width:' +
        (item.qty.KG / max * 100) + '%"></span></span><strong class="bar-value">' +
        num(item.qty.KG, 1) + ' KG<small>' + item.count + ' SPK</small></strong></div>';
    }).join('');
  }

  /* Bilah dan angka yang tertera harus mengukur hal yang sama. Untuk
     routing acuannya KG, sejalan dengan panel volume produksi; untuk bahan
     utama acuannya masih jumlah SPK. Parameter ukurKg yang memilihnya. */
  function renderStatList(target, entries, kind, ukurKg) {
    var ukur = ukurKg
      ? function (item) { return Number(item.qty.KG || 0); }
      : function (item) { return item.count; };
    var max = Math.max.apply(null, entries.map(ukur).concat([1]));
    target.innerHTML = '<div class="recap-stat-list">' + entries.map(function (item, index) {
      return '<div class="recap-stat-row" style="animation-delay:' + (index * .045) +
        's"><div class="recap-stat-copy"><strong title="' + esc(item.name) + '">' + esc(item.name) +
        '</strong><small>' + item.count + ' SPK</small></div><span class="recap-meter"><span style="width:' +
        Math.max(7, ukur(item) / max * 100) + '%"></span></span><span class="recap-qty">' +
        qtyLabel(item.qty) + '</span></div>';
    }).join('') + '</div>' +
      (entries.length ? '' : '<div class="recap-empty">Belum ada data ' + esc(kind) + ' untuk tahun ini.</div>');
  }

  function renderTotals(agg) {
    els.recapTotals.innerHTML = [
      ['Total SPK', agg.totalTrackedSpk + ' SPK', 'accent'],
      ['Total Routing', agg.routeEntries.length + ' Proses', ''],
      ['Total Bahan Utama', agg.materialEntries.length + ' Jenis', ''],
      ['Total Marketing', agg.marketingByKg.length + ' Orang', ''],
      ['Total Outstanding', num(agg.trackedQty.KG || 0, 1) + ' KG', '']
    ].map(function (x) {
      return '<article class="recap-total ' + x[2] + '"><small>' + x[0] + '</small><strong>' +
        x[1] + '</strong></article>';
    }).join('');
  }

  function renderInsights(agg) {
    var counts = {};
    agg.marketingOrder.forEach(function (name) { counts[name] = agg.marketing[name].count; });
    routingKgBars(els.processBars, agg.routingByKg);
    bars(els.marketingBars, counts, true);
  }

  function renderRouteMaterial(agg) {
    els.routeMaterialRecap.innerHTML = agg.routeEntries.map(function (route, index) {
      var items = Object.keys(agg.routeMaterials[route.name]).map(function (name) {
        return { name: name, data: agg.routeMaterials[route.name][name] };
      }).sort(function (a, b) { return b.data.count - a.data.count; });
      return '<article class="route-material-card" style="animation-delay:' + (index * .05) +
        's"><h4>' + esc(route.name) + '<span>' + route.count + ' SPK</span></h4>' +
        items.map(function (item) {
          return '<div class="route-material-item"><span>' + esc(item.name) +
            '<small> · ' + item.data.count + ' SPK</small></span><b>' +
            qtyLabel(item.data.qty) + '</b></div>';
        }).join('') + '</article>';
    }).join('') || '<div class="recap-empty">Belum ada pemetaan routing dan bahan utama.</div>';
  }

  function renderMonthly(agg) {
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    els.monthlyRecap.innerHTML = '<table class="monthly-table"><thead><tr><th>Bahan Utama</th>' +
      monthNames.map(function (m) { return '<th>' + m + '</th>'; }).join('') +
      '<th>Total</th></tr></thead><tbody>' +
      agg.materialEntries.map(function (mat) {
        var total = 0;
        var cells = agg.months.map(function (month) {
          var value = month[mat.name] || 0;
          total += value;
          return '<td class="' + (value ? 'has-data' : '') + '">' + (value || '—') + '</td>';
        }).join('');
        return '<tr><td>' + esc(mat.name) + '</td>' + cells + '<td><strong>' + total + '</strong></td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td>Total SPK</td>' +
      agg.months.map(function (month) {
        var total = Object.keys(month).reduce(function (n, k) { return n + month[k]; }, 0);
        return '<td>' + total + '</td>';
      }).join('') +
      '<td>' + agg.totalTrackedSpk + '</td></tr></tfoot></table>';
  }

  function renderMarketing(agg) {
    var head = '<div class="marketing-list-head"><span>Peringkat</span><span>Marketing</span>' +
      '<span>SPK</span><span>Kontribusi KG</span></div>';

    var years = Object.keys(agg.marketingByYear).map(Number).sort(function (a, b) { return b - a; });
    if (marketingYear !== 'all' && (!marketingYear || years.indexOf(marketingYear) === -1)) {
      var currentYear = new Date().getFullYear();
      marketingYear = years.indexOf(currentYear) !== -1 ? currentYear : (years[0] || 0);
    }
    var entries = (marketingYear === 'all'
      ? agg.marketingByKg.slice()
      : values(agg.marketingByYear[marketingYear] || {})).sort(function (a, b) {
        return b.kg - a.kg || b.count - a.count || a.name.localeCompare(b.name);
      });
      var totalKg = entries.reduce(function (sum, item) { return sum + item.kg; }, 0);
      var rows = entries.map(function (item, index) {
        var kgPct = totalKg ? item.kg / totalKg * 100 : 0;
      var tier = index < 4 ? ' tier-' + (index + 1) : '';
      var tierName = index === 0 ? 'Diamond' : index === 1 ? 'Gold' : index === 2 ? 'Silver' : index === 3 ? 'Bronze' : '';
      var recommendation = index === 0 ? 'Kontribusi Istimewa'
        : index === 1 ? 'Kontribusi Terbaik'
        : index === 2 ? 'Kontribusi Unggulan'
        : index === 3 ? 'Kontribusi Potensial'
        : 'Kontributor Produksi';
      var icon = index === 0 ? 'fa-gem' : index === 1 ? 'fa-trophy' : index === 2 ? 'fa-medal' : index === 3 ? 'fa-award' : '';
      var title = index < 4 ? 'Peringkat ' + (index + 1) + ' · ' + tierName : 'Peringkat ' + (index + 1);
      var subtitle = recommendation + ' · Kontribusi KG ' +
        (marketingYear === 'all' ? 'semua periode' : 'tahun ' + marketingYear);

      return '<article class="marketing-list-row' + tier + '" style="animation-delay:' + (index * .08) +
        's"><span class="marketing-rank" title="' + title + '">' +
        (icon ? '<i class="fa-solid ' + icon + '"></i>' : index + 1) +
        '</span><div class="marketing-person"><strong>' + esc(item.name) + '</strong>' +
        (tierName ? '<span class="marketing-tier-tag">' + tierName + ' · ' + recommendation + '</span>' : '') +
        '<small>' + subtitle + '</small></div><div class="marketing-spk">' + item.count +
        '<small>SPK</small></div><div class="marketing-contribution kg">' +
        '<div class="marketing-contribution-head"><span>KG hasil konversi</span><b>' +
        num(item.kg, 1) + ' KG · ' + num(kgPct, 1) + '%</b></div>' +
        '<div class="contribution-track"><span style="width:' + kgPct + '%"></span></div></div></article>';
      }).join('');
    els.marketingRecap.innerHTML = '<div class="marketing-year-toolbar"><label for="marketingYearSelect">Periode Tahun</label>' +
      '<select id="marketingYearSelect" aria-label="Pilih tahun peringkat marketing">' +
      '<option value="all">Semua Periode</option>' +
      years.map(function(year) { return '<option value="' + year + '">' + year + '</option>'; }).join('') +
      '</select></div>' +
      (entries.length ? head + rows : '<div class="recap-empty">Belum ada data marketing untuk tahun ini.</div>');
    var select = document.getElementById('marketingYearSelect');
    if (select) {
      select.value = String(marketingYear);
      select.onchange = function() {
        marketingYear = select.value === 'all' ? 'all' : Number(select.value) || 0;
        renderMarketing(agg);
      };
    }
  }

  function renderTracking(agg) {
    var order = ['Q', 'MX', 'BL', 'PR', 'FL', 'GS', 'CT', 'F'];
    var labels = {
      Q: 'Queue',
      MX: 'Mixer',
      BL: 'Blowing',
      PR: 'Printing',
      FL: 'Folding',
      GS: 'Gusset',
      CT: 'Cutting',
      F: 'Finish'
    };
    var total = order.reduce(function(sum, code) {
      return sum + Number(agg.tracking[code] || 0);
    }, 0);
    els.trackingRecap.innerHTML = '<div class="tracking-recap-grid">' + order.map(function(code) {
      var count = Number(agg.tracking[code] || 0);
      var share = total ? count / total * 100 : 0;
      return '<article class="tracking-recap-item tracking-' + code.toLowerCase() + '">' +
        '<span class="tracking-code">' + code + '</span><div><strong>' + labels[code] +
        '</strong><small>' + count + ' SPK</small></div><b>' + num(share, 1) + '%</b></article>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------- alur tampilan */

  /* Panel digambar bertahap, satu per bingkai. Menggambar kelimanya
     sekaligus mengunci utas utama selama ratusan milidetik: bilah
     kemajuan tidak sempat tergambar dan halaman terasa membeku justru
     pada saat yang ingin kita perlihatkan sedang berjalan. */
  function renderRecap(agg, onDone) {
    var langkah = [
      [72, 'Menyusun ringkasan seluruh SPK', function () { renderTotals(agg); renderInsights(agg); }],
      [79, 'Menyusun proses per routing', function () { renderStatList(els.routingRecap, agg.routingByKg, 'routing', true); }],
      [85, 'Menyusun produksi per bahan', function () { renderStatList(els.materialRecap, agg.materialEntries, 'bahan utama'); }],
      [91, 'Memetakan routing dan bahan', function () { renderRouteMaterial(agg); }],
      [96, 'Menyusun tabel bulanan', function () { renderMonthly(agg); }],
      [98, 'Menyusun status tracking', function () { renderTracking(agg); }],
      [100, 'Menyusun peringkat marketing', function () { renderMarketing(agg); }]
    ];

    var index = 0;
    (function lanjut() {
      if (index >= langkah.length) {
        if (onDone) onDone();
        return;
      }
      var tahap = langkah[index++];
      stepProgress(tahap[0], tahap[1]);
      nextFrame(function () {
        tahap[2]();
        lanjut();
      });
    })();
  }

  function applyFilters() {
    state.filtered = state.rows;
  }

  function showAll(withProgress, onDone) {
    var agg = aggregate();
    if (!withProgress) {
      renderTotals(agg);
      renderInsights(agg);
      renderStatList(els.routingRecap, agg.routingByKg, 'routing', true);
      renderStatList(els.materialRecap, agg.materialEntries, 'bahan utama');
      renderRouteMaterial(agg);
      renderMonthly(agg);
      renderTracking(agg);
      renderMarketing(agg);
      applyFilters();
      if (onDone) onDone();
      return;
    }
    renderRecap(agg, function () {
      applyFilters();
      if (onDone) onDone();
    });
  }

  /* ------------------------------------------------ simpanan lokal */

  // Kunci dinaikkan ketika bentuk muatan berubah. Token revisi hanya
  // berubah bila datanya bermutasi, jadi perubahan kode di sisi server tidak
  // akan menggugurkan simpanan lama; mengganti kunci inilah yang menggugurkan.
  // Naik ke v2: rekap routing kini memecah Cutting menjadi jenis finishing.
  var CACHE_KEY = 'pgm:dashboard-spk-v2';
  var CACHE_MAX_CHARS = 4000000;

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.payload && Array.isArray(parsed.payload.rows) ? parsed : null;
    } catch (galat) {
      return null;
    }
  }

  function writeCache(payload, revision) {
    try {
      var raw = JSON.stringify({ revision: revision || '', savedAt: Date.now(), payload: payload });
      // Jatah penyimpanan peramban terbatas. Bila muatannya terlampau
      // besar, simpanan dilewati saja: tanpa simpanan halaman tetap
      // benar, hanya kehilangan keuntungan tampil seketika.
      if (raw.length > CACHE_MAX_CHARS) {
        window.localStorage.removeItem(CACHE_KEY);
        return;
      }
      window.localStorage.setItem(CACHE_KEY, raw);
    } catch (galat) {
      try { window.localStorage.removeItem(CACHE_KEY); } catch (abaikan) {}
    }
  }

  /* ----------------------------------------------------- pengambil */

  function hasRuntime() {
    return typeof google !== 'undefined' && google.script && google.script.run;
  }

  function requestRevision() {
    return new Promise(function (resolve) {
      if (!hasRuntime()) { resolve(''); return; }
      google.script.run
        .withSuccessHandler(function (data) { resolve(data && data.revision ? String(data.revision) : ''); })
        .withFailureHandler(function () { resolve(''); })
        .getDashboardDataRevision();
    });
  }

  function requestDatabase(forceRefresh) {
    return new Promise(function (resolve, reject) {
      if (!hasRuntime()) {
        reject(new Error('Koneksi Database SPK tidak tersedia.'));
        return;
      }
      stepProgress(10, 'Menghubungi Database SPK');
      google.script.run
        .withSuccessHandler(function (data) {
          if (!data || data.error) {
            reject(new Error(data && data.error || 'Format Database SPK tidak dikenali.'));
            return;
          }
          stepProgress(48, 'Data Spreadsheet diterima');
          nextFrame(function () {
            stepProgress(56, 'Menyiapkan baris SPK');
            var payload = databasePayload(data);
            payload.revision = data.revision ? String(data.revision) : '';
            resolve(payload);
          });
        })
        .withFailureHandler(reject)
        .getDashboardData(Boolean(forceRefresh));
    });
  }

  function requestTrackingData() {
    return new Promise(function (resolve, reject) {
      if (!hasRuntime()) {
        reject(new Error('Koneksi Database SPK tidak tersedia.'));
        return;
      }
      google.script.run
        .withSuccessHandler(function (data) {
          if (!data || data.error) {
            reject(new Error(data && data.error || 'Tracking Database SPK tidak dikenali.'));
            return;
          }
          resolve(data);
        })
        .withFailureHandler(reject)
        .getDashboardTrackingData();
    });
  }

  function dashboardDate(value) {
    var text = String(value || '').trim();
    var match = text.match(/^(\d{1,2})[-\/]([0-1]?\d)[-\/](\d{4})$/);
    return match
      ? match[3] + '-' + String(match[2]).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0')
      : text.slice(0, 10);
  }

  function databasePayload(data) {
    var volumes = data && data.volumeKgBySpk || {};
    var details = data && data.dashboardRecapBySpk || {};
    var now = Date.now();

    return {
      source: 'database-spk',
      snapshotAt: new Date().toISOString(),
      rows: (data && Array.isArray(data.tableData) ? data.tableData : []).map(function (row) {
        var spk = String(row[DATABASE_TABLE_COL.SPK] || '').trim();
        var key = spk.toUpperCase();
        var detail = details[spk] || details[key] || {};
        var order = Number(row[DATABASE_TABLE_COL.JUMLAH] || 0);
        var uom = String(row[DATABASE_TABLE_COL.UOM] || '').trim().toUpperCase();
        var kg = Number(volumes[spk] || volumes[key] || detail.kg || 0);
        var date = dashboardDate(
          detail.tanggalPo || detail.poMasuk || row[DATABASE_TABLE_COL.TANGGAL]
        );
        var age = date ? Math.max(0, Math.floor((now - new Date(date + 'T00:00:00').getTime()) / 86400000)) : 0;
        var pcsPerKg = uom === 'PCS' && kg > 0 ? order / kg : Number(detail.pcsPerKg || 0);

        return {
          spk: spk,
          tanggalPo: date,
          marketing: String(row[DATABASE_TABLE_COL.MARKETING] || detail.marketing || '').trim(),
          customer: String(row[DATABASE_TABLE_COL.CUSTOMER] || detail.customer || '').trim(),
          brand: String(row[DATABASE_TABLE_COL.ARTIKEL] || detail.brand || detail.artikel || '').trim(),
          material: String(row[DATABASE_TABLE_COL.MATERIAL] || detail.material || '').trim(),
          order: order,
          uom: uom,
          pcsPerKg: pcsPerKg,
          aging: age,
          tracking: normalizeTracking(row[DATABASE_TABLE_COL.TRACKING] || detail.tracking),
          proses: String(detail.proses || '').trim(),
          routing: Array.isArray(detail.routing) ? detail.routing.filter(Boolean) : []
        };
      }).filter(function (row) { return row.spk; })
    };
  }

  function normalizeTracking(value) {
    var tracking = String(value == null ? '' : value).trim().toUpperCase();
    return ['Q', 'MX', 'BL', 'PR', 'FL', 'GS', 'CT', 'F'].indexOf(tracking) > -1
      ? tracking
      : '';
  }

  function payloadSignature(payload) {
    return JSON.stringify([
      payload && payload.tableData || [],
      payload && payload.volumeKgBySpk || {},
      payload && payload.dashboardRecapBySpk || {}
    ]);
  }

  /* Nilai turunan dihitung sekali di sini, bukan berulang di setiap
     penggambar. Sebelumnya kgValue dipanggil ulang untuk baris yang sama
     pada KPI, rekap bahan, rekap routing, pemetaan routing x bahan, dan
     daftar kontribusi marketing. */
  function prepareRows(rows) {
    rows.forEach(function (row) {
      row._kg = kgValue(row);
    });
    return rows;
  }

  /* ---------------------------------------------------------- alur */

  function adoptPayload(data) {
    state.meta = data;
    state.rows = prepareRows(Array.isArray(data.rows) ? data.rows : []);
    state.cache = {};
    state.signature = payloadSignature(data);
  }

  function setStatus(html, isError) {
    els.status.classList.toggle('is-error', Boolean(isError));
    els.status.innerHTML = html;
  }

  function showError(err) {
    setStatus('<i class="fa-solid fa-triangle-exclamation"></i> Database SPK gagal dimuat', true);
    failProgress('Rekapan gagal dimuat');
    if (window.console && window.console.error) window.console.error(err);
  }

  function fetchAndRender(withProgress) {
    return requestDatabase().then(function (payload) {
      stepProgress(64, 'Menghitung rekapan');
      adoptPayload(payload);
      stepProgress(68, 'Data siap digambar');
      writeCache(payload, payload.revision);
      return new Promise(function (resolve) {
        showAll(withProgress, function () {
          setStatus('<i class="fa-solid fa-circle-check"></i> Database SPK live');
          endProgress();
          resolve();
        });
      });
    });
  }

  function syncRealtime() {
    if (realtimeInFlight || !hasRuntime()) return;
    realtimeInFlight = true;
    requestTrackingData().then(function(data) {
      var trackingBySpk = data.trackingBySpk || {};
      var changed = false;
      state.rows.forEach(function(row) {
        var nextTracking = normalizeTracking(trackingBySpk[String(row.spk || '').toUpperCase()]);
        if (nextTracking !== row.tracking) {
          row.tracking = nextTracking;
          changed = true;
        }
      });
      if (changed) {
        state.cache = {};
        showAll(false);
      }
    }).catch(function(error) {
      if (window.console && window.console.warn) window.console.warn('Sinkronisasi realtime tertunda:', error);
    }).then(function() {
      realtimeInFlight = false;
    });
  }

  function syncTrackingNow() {
    if (realtimeInFlight || !hasRuntime()) return Promise.resolve();
    realtimeInFlight = true;
    return requestTrackingData().then(function(data) {
      var trackingBySpk = data.trackingBySpk || {};
      state.rows.forEach(function(row) {
        row.tracking = normalizeTracking(trackingBySpk[String(row.spk || '').toUpperCase()]);
      });
      state.cache = {};
      showAll(false);
    }).catch(function(error) {
      if (window.console && window.console.warn) window.console.warn('Tracking awal tertunda:', error);
    }).then(function() {
      realtimeInFlight = false;
    });
  }

  function startRealtime() {
    if (realtimeTimer || !hasRuntime()) return;
    realtimeTimer = window.setInterval(syncRealtime, REALTIME_INTERVAL_MS);
  }

  function load() {
    var cached = readCache();

    if (cached) {
      // Rekapan tampil seketika dari simpanan, lalu kebaruannya diperiksa
      // lewat token revisi yang jauh lebih ringan daripada seluruh tabel.
      adoptPayload(cached.payload);
      showAll(false, function () {
        setStatus('<i class="fa-solid fa-clock-rotate-left"></i> Rekapan tersimpan · memeriksa pembaruan');
        syncTrackingNow();
      });

      requestRevision().then(function (revision) {
        if (revision && cached.revision && revision === cached.revision) {
          setStatus('<i class="fa-solid fa-circle-check"></i> Database SPK live');
          startRealtime();
          return null;
        }
        startProgress('Memperbarui rekapan');
        return fetchAndRender(true);
      }).catch(showError);
      startRealtime();
      return;
    }

    startProgress('Menghubungi Database SPK');
    fetchAndRender(true).then(startRealtime).catch(showError);
  }

  setPeriodTitle();
  load();
})();
