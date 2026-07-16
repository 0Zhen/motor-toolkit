/* ═══════════════════════════════════════════════════════════════
   Efficiency Map Generator
   Contour rendering ported from motor_choose_web frontend
   (Bowyer-Watson Delaunay triangulation + barycentric interpolation
   onto a regular grid), same colorscale.
   ═══════════════════════════════════════════════════════════════ */
var MT_I18N = {
  data:      { en: 'Data', zh: '資料' },
  pasteLabel:{ en: 'Paste data — 3 columns: speed, torque, efficiency', zh: '貼上資料——三欄：轉速、扭矩、效率' },
  pastePh:   {
    en: '1000  15  92.68\n1000  20  94.61\n1000  25  93.80\n…\n\nSeparators: space / tab / comma / semicolon.\nA header row is skipped automatically.',
    zh: '1000  15  92.68\n1000  20  94.61\n1000  25  93.80\n…\n\n分隔符：空白／Tab／逗號／分號皆可。\n標題列會自動略過。',
  },
  loadCsv:   { en: 'Load CSV…', zh: '載入 CSV…' },
  sample:    { en: 'Sample data', zh: '範例資料' },
  options:   { en: 'Options', zh: '選項' },
  title:     { en: 'Title (optional)', zh: '標題（選填）' },
  titlePh:   { en: 'e.g. Motor A — Total Efficiency', zh: '例：Motor A — 總效率' },
  xAxis:     { en: 'X axis', zh: 'X 軸標籤' },
  yAxis:     { en: 'Y axis', zh: 'Y 軸標籤' },
  unit:      { en: 'Value unit', zh: '數值單位' },
  valName:   { en: 'Value name', zh: '數值名稱' },
  showPts:   { en: 'Show data points', zh: '顯示資料點' },
  render:    { en: 'Generate map', zh: '產生地圖' },
  png:       { en: 'Download PNG', zh: '下載 PNG' },
  hint:      {
    en: 'Points are triangulated (Delaunay) and interpolated onto a regular grid — irregular operating envelopes are supported; regions outside the measured envelope stay blank. All processing happens in your browser.',
    zh: '資料點經 Delaunay 三角化後內插到規則網格——支援不規則運轉範圍，量測範圍外的區域保持空白。所有計算都在你的瀏覽器本機完成。',
  },
  errRows:   { en: 'Need at least 3 valid data rows (speed, torque, efficiency). Parsed {n} row(s).',
               zh: '至少需要 3 筆有效資料（轉速、扭矩、效率），目前解析到 {n} 筆。' },
  statPts:   { en: '{n} points', zh: '{n} 筆資料點' },
  statSpeed: { en: 'speed', zh: '轉速' },
  statTorque:{ en: 'torque', zh: '扭矩' },
  statSkip:  { en: '{n} line(s) skipped', zh: '略過 {n} 行' },
};

(function () {
'use strict';

var GRID = 120;
var COLORSCALE = [
  [0, '#15803d'], [0.25, '#65a30d'], [0.5, '#ca8a04'],
  [0.75, '#b45309'], [1.0, '#dc2626']
];

var $ = function (id) { return document.getElementById(id); };
var lastRendered = false;

/* ── parsing ─────────────────────────────────────────────────── */
function parseData(text) {
  var rows = [];
  var skipped = 0;
  text.split(/\r?\n/).forEach(function (line) {
    line = line.trim();
    if (!line) return;
    var parts = line.split(/[,\t; ]+/).filter(Boolean);
    if (parts.length < 3) { skipped++; return; }
    var s = parseFloat(parts[0]), t = parseFloat(parts[1]), e = parseFloat(parts[2]);
    if (isNaN(s) || isNaN(t) || isNaN(e)) { skipped++; return; }  /* header rows land here */
    rows.push({ speed: s, torque: t, eff: e });
  });
  return { rows: rows, skipped: skipped };
}

/* ── Delaunay (Bowyer-Watson) + barycentric grid interpolation ── */
function linspace(a, b, n) {
  var r = [];
  for (var i = 0; i < n; i++) r.push(a + (b - a) * i / (n - 1));
  return r;
}

function gridInterpolate(pts, vals) {
  var xs = pts.map(function (p) { return p[0]; });
  var ys = pts.map(function (p) { return p[1]; });
  var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
  var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);

  var gx = linspace(xMin, xMax, GRID);
  var gy = linspace(yMin, yMax, GRID);

  /* super-triangle enclosing all points */
  var n = pts.length;
  var M = Math.max(xMax - xMin, yMax - yMin) * 10;
  var cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
  var sup = [[cx - 3 * M, cy - M], [cx + 3 * M, cy - M], [cx, cy + 3 * M]];
  var all = pts.concat(sup);
  var tris = [[n, n + 1, n + 2]];

  for (var p = 0; p < n; p++) {
    var px = all[p][0], py = all[p][1];
    var bad = [], good = [];
    for (var ti = 0; ti < tris.length; ti++) {
      var t = tris[ti];
      var ax = all[t[0]][0], ay = all[t[0]][1];
      var bx = all[t[1]][0], by = all[t[1]][1];
      var cx2 = all[t[2]][0], cy2 = all[t[2]][1];
      var D = 2 * ((ax - px) * (by - cy2) + (bx - px) * (cy2 - ay) + (cx2 - px) * (ay - by));
      if (Math.abs(D) < 1e-10) { good.push(t); continue; }
      var ux = (ax - px) * (ax - px) + (ay - py) * (ay - py);
      var vx = (bx - px) * (bx - px) + (by - py) * (by - py);
      var wx = (cx2 - px) * (cx2 - px) + (cy2 - py) * (cy2 - py);
      var ox = (ux * (by - cy2) + vx * (cy2 - ay) + wx * (ay - by)) / D;
      var oy = (ux * (cx2 - bx) + vx * (ax - cx2) + wx * (bx - ax)) / D;
      var r2 = (ax - px - ox) * (ax - px - ox) + (ay - py - oy) * (ay - py - oy);
      if (ox * ox + oy * oy < r2 + 1e-10) bad.push(t); else good.push(t);
    }
    var edges = new Map();
    bad.forEach(function (t) {
      [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(function (e) {
        var k = e[0] < e[1] ? e[0] + '_' + e[1] : e[1] + '_' + e[0];
        edges.set(k, (edges.get(k) || 0) + 1);
      });
    });
    tris = good;
    edges.forEach(function (c, k) {
      if (c === 1) {
        var ab = k.split('_');
        tris.push([+ab[0], +ab[1], p]);
      }
    });
  }
  tris = tris.filter(function (t) { return t[0] < n && t[1] < n && t[2] < n; });

  function baryInterp(px, py, tri) {
    var ax = pts[tri[0]][0], ay = pts[tri[0]][1];
    var bx = pts[tri[1]][0], by = pts[tri[1]][1];
    var cx = pts[tri[2]][0], cy = pts[tri[2]][1];
    var d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-12) return null;
    var l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
    var l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
    var l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) return null;
    return l1 * vals[tri[0]] + l2 * vals[tri[1]] + l3 * vals[tri[2]];
  }

  var z = [];
  for (var yi = 0; yi < gy.length; yi++) {
    var row = [];
    for (var xi = 0; xi < gx.length; xi++) {
      var val = null;
      for (var k = 0; k < tris.length; k++) {
        val = baryInterp(gx[xi], gy[yi], tris[k]);
        if (val !== null) break;
      }
      row.push(val);
    }
    z.push(row);
  }
  return { gx: gx, gy: gy, z: z };
}

/* ── rendering ───────────────────────────────────────────────── */
function themeColors() {
  var s = getComputedStyle(document.documentElement);
  return {
    bg:   s.getPropertyValue('--surface').trim(),
    grid: s.getPropertyValue('--grid-c').trim(),
    font: s.getPropertyValue('--text2').trim(),
  };
}

function showError(msg) {
  var box = $('errBox');
  box.textContent = msg;
  box.style.display = msg ? 'block' : 'none';
}

function render() {
  showError('');
  var parsed = parseData($('dataInput').value);
  var rows = parsed.rows;
  if (rows.length < 3) {
    showError(mtT('errRows').replace('{n}', rows.length));
    return;
  }

  var pts  = rows.map(function (r) { return [r.speed, r.torque]; });
  var vals = rows.map(function (r) { return r.eff; });
  var g = gridInterpolate(pts, vals);

  var unit  = $('optUnit').value || '%';
  var label = $('optLabel').value || 'Efficiency';
  var th = themeColors();

  var traces = [{
    x: g.gx, y: g.gy, z: g.z, type: 'contour', colorscale: COLORSCALE,
    contours: { showlabels: true, labelfont: { size: 9, color: '#fff' } },
    colorbar: { title: unit, thickness: 12, len: 0.8, tickfont: { size: 10 }, titlefont: { size: 11 } },
    connectgaps: false,
    hovertemplate: 'Speed: %{x:.0f}<br>Torque: %{y:.2f}<br>' + label +
      ': %{z:.2f} ' + unit + '<extra></extra>',
  }];
  if ($('optPoints').checked) {
    traces.push({
      x: rows.map(function (r) { return r.speed; }),
      y: rows.map(function (r) { return r.torque; }),
      mode: 'markers',
      marker: { size: 5, color: '#fff', opacity: 0.5, line: { color: 'rgba(0,0,0,0.5)', width: 0.5 } },
      type: 'scatter', name: 'Data Points', showlegend: false,
      hovertemplate: 'Speed: %{x}<br>Torque: %{y}<extra></extra>',
    });
  }

  var layout = {
    title: $('optTitle').value ? { text: $('optTitle').value, font: { size: 15 } } : undefined,
    paper_bgcolor: th.bg, plot_bgcolor: th.bg,
    font: { color: th.font, size: 12 },
    margin: { l: 60, r: 20, t: $('optTitle').value ? 44 : 20, b: 55 },
    xaxis: { title: $('optXLabel').value, gridcolor: th.grid, zerolinecolor: th.grid },
    yaxis: { title: $('optYLabel').value, gridcolor: th.grid, zerolinecolor: th.grid },
    showlegend: false,
  };

  Plotly.newPlot('plot', traces, layout, { responsive: true, displayModeBar: false });
  lastRendered = true;

  $('statBox').textContent = mtT('statPts').replace('{n}', rows.length) +
    ' · ' + mtT('statSpeed') + ' ' +
    Math.min.apply(null, pts.map(function (p) { return p[0]; })) + '–' +
    Math.max.apply(null, pts.map(function (p) { return p[0]; })) +
    ' · ' + mtT('statTorque') + ' ' +
    Math.min.apply(null, pts.map(function (p) { return p[1]; })) + '–' +
    Math.max.apply(null, pts.map(function (p) { return p[1]; })) +
    (parsed.skipped ? ' · ' + mtT('statSkip').replace('{n}', parsed.skipped) : '');
  if (window.gaTrack) gaTrack('render_map', rows.length + 'pts');
}

function downloadPng() {
  if (!lastRendered) { render(); if (!lastRendered) return; }
  Plotly.downloadImage('plot', {
    format: 'png', scale: 2, width: 900, height: 620,
    filename: ($('optTitle').value || 'efficiency_map').replace(/[^\w\-]+/g, '_'),
  });
  if (window.gaTrack) gaTrack('download_png', 'efficiency-map');
}

/* ── wiring ──────────────────────────────────────────────────── */
$('btnRender').addEventListener('click', render);
$('btnPng').addEventListener('click', downloadPng);

$('btnCsv').addEventListener('click', function () { $('csvFile').click(); });
$('csvFile').addEventListener('change', function () {
  var f = this.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function () { $('dataInput').value = reader.result; render(); };
  reader.readAsText(f);
  this.value = '';
});

$('btnSample').addEventListener('click', function () {
  var lines = [];
  var eff = {
    15: [94.9, 95.0, 95.1, 95.1, 95.1, 95.1, 95.1, 94.9, 94.9],
    20: [95.1, 95.2, 95.4, 95.5, 95.5, 95.5, 95.4, 95.3, 95.2],
    25: [94.9, 95.1, 95.3, 95.4, 95.4, 95.4, 95.4],
    30: [94.5, 94.7, 95.0, 95.1, 95.1, 95.2],
    35: [93.9, 94.2, 94.5, 94.7, 94.7],
  };
  var speeds = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2500];
  Object.keys(eff).forEach(function (tq) {
    eff[tq].forEach(function (e, i) { lines.push(speeds[i] + '\t' + tq + '\t' + e); });
  });
  $('dataInput').value = lines.join('\n');
  render();
});

/* re-render on theme/language switch so plot colors and messages follow */
document.addEventListener('mt-theme-change', function () {
  if (lastRendered) render();
});
document.addEventListener('mt-lang-change', function () {
  if (lastRendered) render();
});
})();
