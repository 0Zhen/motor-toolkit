/* ═══════════════════════════════════════════════════════════════
   CPK Analysis
   IQR outlier removal, Cp/Cpk/k, histogram + spec/sigma lines.
   Logic ported from an Excel VBA CPK macro (same IQR rule, same
   fixed 1.0 / 1.33 capability thresholds).
   ═══════════════════════════════════════════════════════════════ */
var MT_I18N = {
  data:        { en: 'Data', zh: '資料' },
  pastePh:     {
    en: '7813.9\n7820.1\n7809.6\n…\n\nOne value per line (or comma/tab/space separated).\nNon-numeric header rows are skipped automatically.',
    zh: '7813.9\n7820.1\n7809.6\n…\n\n每行一筆數值（也可用逗號／Tab／空白分隔）。\n非數值的標題列會自動略過。',
  },
  loadCsv:     { en: 'Load CSV…', zh: '載入 CSV…' },
  sample:      { en: 'Sample data', zh: '範例資料' },
  specTitle:   { en: 'Specification Limits', zh: '規格上下限' },
  uslLabel:    { en: 'USL — upper limit', zh: 'USL（上限）' },
  lslLabel:    { en: 'LSL — lower limit', zh: 'LSL（下限）' },
  calcBtn:     { en: 'Calculate', zh: '計算' },
  pngBtn:      { en: 'Download chart PNG', zh: '下載圖表 PNG' },
  hint:        {
    en: 'Outliers are removed with the IQR rule (values outside Q1 − 1.5×IQR … Q3 + 1.5×IQR) before computing statistics. All processing happens in your browser.',
    zh: '計算統計量之前，會先用IQR規則（保留 Q1 − 1.5×IQR 到 Q3 + 1.5×IQR 之間的值）移除離群值。所有計算都在你的瀏覽器本機完成。',
  },
  emptyState:  { en: 'Paste data, enter USL/LSL, then click Calculate.', zh: '貼上資料、輸入USL/LSL後按下計算。' },
  errNeedData: { en: 'Need at least 2 numeric values. Parsed {n}.', zh: '至少需要2筆數值資料，目前解析到{n}筆。' },
  errNeedLimits:{ en: 'Enter at least one of USL / LSL.', zh: '請至少輸入USL或LSL其中一個。' },
  errLimitOrder:{ en: 'USL must be greater than LSL.', zh: 'USL（上限）必須大於 LSL（下限），請確認兩者是否填反了。' },

  statsTitle:  { en: 'Statistics', zh: '統計量' },
  statN:       { en: 'n (after outlier removal)', zh: 'n（離群值過濾後）' },
  statMean:    { en: 'Mean', zh: '平均值' },
  statSd:      { en: 'Std. dev.', zh: '標準差' },
  statAbove:   { en: 'Above USL', zh: '超出上限' },
  statBelow:   { en: 'Below LSL', zh: '超出下限' },

  capTitle:    { en: 'Process Capability', zh: '製程能力' },
  cpkLabel:    { en: 'Cpk', zh: 'Cpk' },
  cpLabel:     { en: 'Cp', zh: 'Cp' },
  kLabel:      { en: 'k (offset)', zh: 'k（偏移）' },
  naText:      { en: 'N/A', zh: 'N/A' },
  capGood:     { en: 'Capable', zh: '能力足夠' },
  capWarn:     { en: 'Marginal', zh: '邊緣' },
  capBad:      { en: 'Not capable', zh: '能力不足' },

  chartXAxis:  { en: 'Value', zh: '數值' },
  chartYAxis:  { en: 'Count', zh: '次數' },
  legendDist:  { en: 'Distribution', zh: '分布' },
  legendMean:  { en: 'Mean', zh: '平均值' },
  legendOut:   { en: 'Out of range', zh: '超出規格' },
};

(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };

var chart = null;
var lastResult = null; /* kept so theme/lang switches can redraw without recalculating */

/* ── parsing ─────────────────────────────────────────────────── */
function parseNumbers(text) {
  var values = [];
  text.split(/\r?\n/).forEach(function (line) {
    line = line.trim();
    if (!line) return;
    var tok = line.split(/[,\t; ]+/).filter(Boolean)[0];
    var v = parseFloat(tok);
    if (isNaN(v)) return; /* header rows land here */
    values.push(v);
  });
  return values;
}

/* ── stats ───────────────────────────────────────────────────── */
function quantile(sorted, p) {
  var idx = p * (sorted.length - 1);
  var lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function iqrFilter(values) {
  if (values.length < 4) return values.slice();
  var sorted = values.slice().sort(function (a, b) { return a - b; });
  var q1 = quantile(sorted, 0.25), q3 = quantile(sorted, 0.75);
  var iqr = q3 - q1;
  var lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  return values.filter(function (v) { return v >= lo && v <= hi; });
}

function mean(arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }

function stdev(arr, m) {
  if (arr.length < 2) return 0;
  var ss = arr.reduce(function (a, v) { return a + (v - m) * (v - m); }, 0);
  return Math.sqrt(ss / (arr.length - 1));
}

function capabilityClass(v) {
  if (v >= 1.33) return 'good';
  if (v >= 1.0) return 'warn';
  return 'bad';
}
function capabilityVerdict(cls) {
  return cls === 'good' ? mtT('capGood') : (cls === 'warn' ? mtT('capWarn') : mtT('capBad'));
}

/* ── main compute ────────────────────────────────────────────── */
function compute(raw, usl, lslVal, hasUsl, hasLsl) {
  var filtered = iqrFilter(raw);
  var n = filtered.length;
  var m = mean(filtered);
  var sd = stdev(filtered, m);

  var above = 0, below = 0;
  filtered.forEach(function (v) {
    if (hasUsl && v > usl) above++;
    if (hasLsl && v < lslVal) below++;
  });

  var cpu = null, cpl = null, cpk = null, cp = null, k = null;
  if (sd > 0) {
    if (hasUsl) cpu = (usl - m) / (3 * sd);
    if (hasLsl) cpl = (m - lslVal) / (3 * sd);
    if (hasUsl && hasLsl) {
      cpk = Math.min(cpu, cpl);
      cp = (usl - lslVal) / (6 * sd);
      k = cp !== 0 ? 1 - cpk / cp : null;
    } else if (hasUsl) {
      cpk = cpu;
    } else if (hasLsl) {
      cpk = cpl;
    }
  }

  return {
    filtered: filtered, n: n, mean: m, sd: sd,
    above: above, below: below,
    usl: hasUsl ? usl : null, lsl: hasLsl ? lslVal : null,
    cpu: cpu, cpl: cpl, cpk: cpk, cp: cp, k: k,
  };
}

/* ── histogram ───────────────────────────────────────────────── */
function buildHistogram(r) {
  var data = r.filtered;
  var n = data.length;
  var binCount = Math.max(5, Math.min(30, Math.floor(Math.sqrt(n)) + 1));

  var minV = Math.min.apply(null, data);
  var maxV = Math.max.apply(null, data);
  if (r.usl !== null && r.usl > maxV) maxV = r.usl;
  if (r.lsl !== null && r.lsl < minV) minV = r.lsl;

  var binWidth = (maxV - minV) / binCount;
  if (binWidth === 0) binWidth = 1;

  var freq = new Array(binCount).fill(0);
  data.forEach(function (v) {
    var b = Math.floor((v - minV) / binWidth);
    if (b >= binCount) b = binCount - 1;
    if (b < 0) b = 0;
    freq[b]++;
  });

  var bars = [];
  for (var i = 0; i < binCount; i++) {
    bars.push({ x: minV + binWidth * (i + 0.5), y: freq[i] });
  }
  var maxFreq = Math.max.apply(null, freq);

  return { bars: bars, maxFreq: maxFreq, binWidth: binWidth, minV: minV, maxV: maxV };
}

/* ── rendering: stats + pills ────────────────────────────────── */
function fmt(v, d) { return v === null || v === undefined || isNaN(v) ? mtT('naText') : v.toFixed(d === undefined ? 3 : d); }

function renderStats(r) {
  $('outN').textContent = r.n;
  $('outMean').textContent = fmt(r.mean, 4);
  $('outSd').textContent = fmt(r.sd, 4);
  $('outAbove').textContent = r.above;
  $('outBelow').textContent = r.below;
}

function pillHtml(labelKey, value, cls) {
  var cellClass = cls || 'neutral';
  var verdict = cls ? capabilityVerdict(cls) : '';
  return '<div class="cpk-pill ' + cellClass + '">' +
    '<div class="pill-label">' + mtT(labelKey) + '</div>' +
    '<div class="pill-value">' + value + '</div>' +
    (verdict ? '<div class="pill-verdict">' + verdict + '</div>' : '') +
    '</div>';
}

function renderPills(r) {
  var html = '';
  if (r.cpk !== null) {
    html += pillHtml('cpkLabel', fmt(r.cpk, 4), capabilityClass(r.cpk));
  } else {
    html += pillHtml('cpkLabel', mtT('naText'));
  }
  if (r.cp !== null) {
    html += pillHtml('cpLabel', fmt(r.cp, 4), capabilityClass(r.cp));
  } else {
    html += pillHtml('cpLabel', mtT('naText'));
  }
  if (r.k !== null) {
    html += pillHtml('kLabel', fmt(r.k, 3));
  } else {
    html += pillHtml('kLabel', mtT('naText'));
  }
  $('pillRow').innerHTML = html;
}

/* ── chart ───────────────────────────────────────────────────── */
function themeColors() {
  var cs = getComputedStyle(document.documentElement);
  return {
    text: cs.getPropertyValue('--text').trim(),
    text2: cs.getPropertyValue('--text2').trim(),
    border: cs.getPropertyValue('--border').trim(),
    grid: cs.getPropertyValue('--grid-c').trim(),
    accent: cs.getPropertyValue('--accent').trim(),
    red: cs.getPropertyValue('--red').trim(),
    green: cs.getPropertyValue('--green').trim(),
    amber: cs.getPropertyValue('--amber').trim(),
    surface: cs.getPropertyValue('--surface').trim(),
  };
}

function sigmaDatasets(r, maxFreq, c) {
  var shades = [
    c.text2 + '55', /* ±1σ, most transparent */
    c.text2 + '88', /* ±2σ */
    c.text2 + 'cc', /* ±3σ, most opaque */
  ];
  var out = [];
  for (var k = 1; k <= 3; k++) {
    var color = shades[k - 1];
    [r.mean - k * r.sd, r.mean + k * r.sd].forEach(function (x) {
      out.push({
        type: 'line',
        label: '±' + k + 'σ',
        data: [{ x: x, y: 0 }, { x: x, y: maxFreq }],
        borderColor: color,
        borderDash: [4, 3],
        borderWidth: 1,
        pointRadius: 0,
        showLine: true,
      });
    });
  }
  return out;
}

function buildChart(r) {
  var hist = buildHistogram(r);
  var c = themeColors();
  var maxFreq = hist.maxFreq;

  var datasets = [
    {
      type: 'bar',
      label: mtT('legendDist'),
      data: hist.bars,
      backgroundColor: c.accent + '99',
      borderColor: c.accent,
      borderWidth: 1,
      barPercentage: 1.0,
      categoryPercentage: 1.0,
      order: 3,
    },
    {
      type: 'line',
      label: mtT('legendMean'),
      data: [{ x: r.mean, y: 0 }, { x: r.mean, y: maxFreq }],
      borderColor: c.green,
      borderWidth: 2,
      pointRadius: 0,
      order: 1,
    },
  ];

  if (r.usl !== null) {
    datasets.push({
      type: 'line', label: 'USL',
      data: [{ x: r.usl, y: 0 }, { x: r.usl, y: maxFreq }],
      borderColor: c.red, borderWidth: 2, borderDash: [6, 3], pointRadius: 0, order: 1,
    });
  }
  if (r.lsl !== null) {
    datasets.push({
      type: 'line', label: 'LSL',
      data: [{ x: r.lsl, y: 0 }, { x: r.lsl, y: maxFreq }],
      borderColor: c.red, borderWidth: 2, borderDash: [6, 3], pointRadius: 0, order: 1,
    });
  }

  datasets = datasets.concat(sigmaDatasets(r, maxFreq, c));

  var outPts = r.filtered.filter(function (v) {
    return (r.usl !== null && v > r.usl) || (r.lsl !== null && v < r.lsl);
  }).map(function (v) { return { x: v, y: 0 }; });
  if (outPts.length) {
    datasets.push({
      type: 'line',
      label: mtT('legendOut'),
      data: outPts,
      showLine: false,
      pointStyle: 'crossRot',
      pointRadius: 6,
      pointBorderWidth: 2,
      pointBorderColor: c.red,
      pointBackgroundColor: c.red,
      order: 0,
    });
  }

  if (chart) { chart.destroy(); chart = null; }
  var ctx = $('chartCanvas').getContext('2d');
  chart = new Chart(ctx, {
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: mtT('chartXAxis'), color: c.text2 },
          ticks: { color: c.text2 },
          grid: { color: c.grid },
        },
        y: {
          type: 'linear',
          beginAtZero: true,
          title: { display: true, text: mtT('chartYAxis'), color: c.text2 },
          ticks: { color: c.text2 },
          grid: { color: c.grid },
        },
      },
      plugins: {
        legend: { position: 'bottom', labels: { color: c.text, boxWidth: 14, filter: function (item, data) {
          /* each ±kσ level is added as two datasets (left/right line); keep only the first in the legend */
          if (item.text.indexOf('±') === -1) return true;
          return data.datasets.findIndex(function (d) { return d.label === item.text; }) === item.datasetIndex;
        } } },
        tooltip: {
          callbacks: {
            title: function (items) { return items.length ? Number(items[0].parsed.x).toFixed(3) : ''; },
          },
        },
      },
    },
  });
}

/* ── wiring ──────────────────────────────────────────────────── */
function showError(msg) {
  var box = $('errBox');
  box.textContent = msg;
  box.style.display = msg ? 'block' : 'none';
}

function runCalculate() {
  showError('');
  var values = parseNumbers($('dataInput').value);
  if (values.length < 2) {
    showError(mtT('errNeedData').replace('{n}', values.length));
    return;
  }
  var uslStr = $('uslInput').value.trim();
  var lslStr = $('lslInput').value.trim();
  var hasUsl = uslStr !== '';
  var hasLsl = lslStr !== '';
  if (!hasUsl && !hasLsl) {
    showError(mtT('errNeedLimits'));
    return;
  }
  var usl = hasUsl ? parseFloat(uslStr) : null;
  var lslVal = hasLsl ? parseFloat(lslStr) : null;
  if (hasUsl && hasLsl && usl <= lslVal) {
    showError(mtT('errLimitOrder'));
    return;
  }

  var r = compute(values, usl, lslVal, hasUsl, hasLsl);

  lastResult = r;
  $('emptyState').style.display = 'none';
  $('resultsWrap').style.display = 'flex';
  renderStats(r);
  renderPills(r);
  buildChart(r);

  if (window.gaTrack) gaTrack('cpk_calculate', r.n + 'pts');
}

$('btnCalc').addEventListener('click', runCalculate);

$('btnCsv').addEventListener('click', function () { $('csvFile').click(); });
$('csvFile').addEventListener('change', function () {
  var f = this.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function () { $('dataInput').value = reader.result; };
  reader.readAsText(f);
});

$('btnSample').addEventListener('click', function () {
  var lines = [];
  var target = 25.0, sd = 0.30;
  for (var i = 0; i < 150; i++) {
    /* Box-Muller */
    var u1 = Math.random(), u2 = Math.random();
    var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    lines.push((target + z * sd).toFixed(3));
  }
  /* two data-entry-error-style extreme values: far enough out to be caught by the
     IQR filter, so they demonstrate outlier removal (not spec violation) */
  lines.push('15.000', '35.000');
  $('dataInput').value = lines.join('\n');
  /* USL/LSL at ±2σ: tight enough that natural tail points (~2–2.7σ, which the IQR
     rule keeps) legitimately trip the spec — demonstrates the out-of-range markers
     and gives a non-trivial (sub-1.33) Cp/Cpk instead of a trivially "everything's fine" demo */
  $('uslInput').value = '25.6';
  $('lslInput').value = '24.4';
  runCalculate();
});

$('btnPng').addEventListener('click', function () {
  if (!chart) return;
  var url = chart.toBase64Image('image/png', 1);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'cpk-chart.png';
  a.click();
  if (window.gaTrack) gaTrack('download_png', 'cpk-analysis');
});

/* re-render on theme/language switch so chart colors and labels follow */
document.addEventListener('mt-theme-change', function () {
  if (lastResult) buildChart(lastResult);
});
document.addEventListener('mt-lang-change', function () {
  if (lastResult) { renderStats(lastResult); renderPills(lastResult); buildChart(lastResult); }
});

})();
