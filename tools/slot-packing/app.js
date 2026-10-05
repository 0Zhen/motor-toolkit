'use strict';
/* ══════════════════════════════════════════════════════════
   Slot Packing Viewer — app.js
   state、事件綁定、頂點表格渲染、SVG 繪製、i18n 字典。
   ══════════════════════════════════════════════════════════ */

var MT_I18N = {
  shapeTitle:   { en: 'Slot Shape', zh: '槽型' },
  tabParam:     { en: 'Parametric', zh: '參數化' },
  tabCustom:    { en: 'Custom points', zh: '自訂頂點' },
  topWidth:     { en: 'Top width [mm]', zh: '上寬（槽口）[mm]' },
  bottomWidth:  { en: 'Bottom width [mm]', zh: '下寬（槽底）[mm]' },
  slotDepth:    { en: 'Depth [mm]', zh: '槽深 [mm]' },
  generateBtn:  { en: 'Generate points (overwrites below)', zh: '產生頂點（覆蓋下方表格）' },
  paramHint:    {
    en: 'Symmetric trapezoid: y=0 is the slot opening (air-gap side), y=depth is the slot bottom (yoke side). Generates 4 points below — add more afterwards to refine the shape.',
    zh: '對稱梯形：y=0 是槽口（靠氣隙那端），y=depth 是槽底（靠軛部那端）。會產生下方4個頂點，之後可以再手動加點微調形狀。',
  },
  customHint:   {
    en: 'Start from scratch, or switch to Parametric, generate a trapezoid, then come back here — every point is editable either way.',
    zh: '可以從空白開始，或先切到參數化產生梯形再回來這裡繼續編輯——不管哪種方式，每個頂點都可以修改。',
  },
  verticesTitle:{ en: 'Vertices', zh: '頂點' },
  colX:         { en: 'X [mm]', zh: 'X [mm]' },
  colY:         { en: 'Y [mm]', zh: 'Y [mm]' },
  addPointBtn:  { en: '+ Add point', zh: '+ 新增頂點' },
  vertexHint:   {
    en: 'Points connect in order and close back to the first one. No self-intersection check — keep them tracing a simple outline.',
    zh: '頂點依序連接，最後一個會連回第一個。沒有自我相交檢查，請確保連起來是一個單純的輪廓，不要交叉。',
  },
  wireTitle:    { en: 'Wire / Turns', zh: '線材 / 匝數' },
  bareDia:      { en: 'Bare copper dia. [mm]', zh: '裸銅徑 [mm]' },
  enamelThk:    { en: 'Enamel thk., one side [mm]', zh: '漆膜厚度（單邊）[mm]' },
  turnsPerSlot: { en: 'Turns / slot', zh: '每槽匝數' },
  coilsPerSlot: { en: 'Coils / slot', zh: '每槽線圈數' },
  strandsPerTurn:{ en: 'Strands / turn', zh: '股數/匝' },
  wallClearance:{ en: 'Wall clearance [mm]', zh: '壁面餘隙 [mm]' },
  wireHint:     {
    en: "Wall clearance is a flat inset applied to each row's width — a simplification, not a real liner/wedge geometry.",
    zh: '壁面餘隙是每一排寬度各自內縮的簡化值，不是真正的槽絕緣紙/楔片幾何。',
  },
  toolHint:     {
    en: '💡 This is a simple row-by-row visual, not an optimal circle-packing solver — a real winding may fit tighter than shown. The area-based fill % is the reliable number; the packed count is indicative only.',
    zh: '💡 這只是簡單的逐排視覺化，不是最佳圓形填充演算法——實際繞線可能比畫面上塞得更緊。「面積槽滿率」才是可靠的數字，「堆疊顆數」只是示意。',
  },
  statsTitle:   { en: 'Stats', zh: '統計' },

  outArea:       { en: 'Slot area', zh: '槽面積' },
  outWireOd:     { en: 'Wire OD', zh: '線材外徑（OD）' },
  outCount:      { en: 'Wire count', zh: '線材總數' },
  outFillArea:   { en: 'Fill % (area-based)', zh: '槽滿率 %（面積法）' },
  outPacked:     { en: 'Packed (visual)', zh: '堆疊顆數（示意）' },
  packedAll:     { en: 'all placed', zh: '全部放得下' },
  packedPartial: { en: 'did not all fit in this simple layout', zh: '這個簡易排法放不滿' },
  errFewPoints:  { en: 'Need at least 3 points to form a shape.', zh: '至少需要3個頂點才能構成形狀。' },
  errBadArea:    { en: 'These points don’t enclose a usable area — check the vertex order/values.', zh: '這些頂點圍不出有效面積，請檢查頂點順序/數值。' },
  errBadWire:    { en: 'Wire diameter and count must be greater than 0.', zh: '線徑與數量都必須大於0。' },

  tipArea: {
    en: 'Shoelace formula on the vertex list — the polygon’s own area, regardless of how many sides it has.',
    zh: '用頂點清單算的鞋帶公式（Shoelace formula）——多邊形本身的面積，不管幾個邊都適用。',
  },
  outWireOdTip:  {
    en: 'Wire OD = bare copper dia. + 2 × enamel thickness (one side).',
    zh: '線材外徑 = 裸銅徑 + 2 × 漆膜厚度（單邊）。',
  },
  outFillAreaTip:{
    en: 'Fill % = (wire count × circle area) / slot area × 100 — independent of how the row-packing below actually arranges them.',
    zh: '槽滿率 % = (線材總數 × 單根截面積) / 槽面積 × 100 — 跟下面的排列演算法擺不擺得下無關，純粹面積比。',
  },
  outPackedTip:  {
    en: 'How many of the wires this simple row-by-row packer could actually place without overlapping. Not placing all of them does not necessarily mean they don’t physically fit — a better arrangement might.',
    zh: '這個簡易逐排演算法實際能無重疊擺進去幾根。沒有全部擺進去，不代表實際上真的塞不下——換個排法可能塞得進去。',
  },
};

(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };

var shapeMode = 'param';
var vertices = [];

function num(id, fallback) {
  var v = parseFloat($(id).value);
  return isFinite(v) ? v : fallback;
}
function fmt(v, digits) {
  if (digits === undefined) digits = 2;
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function tip(label, key) {
  return '<span class="formula-tip" title="' + window.mtT(key).replace(/"/g, '&quot;') + '">' + label + '</span>';
}

/* ── 模式切換 ── */
window.switchShapeMode = function (mode) {
  shapeMode = mode;
  $('tabParam').classList.toggle('active', mode === 'param');
  $('tabCustom').classList.toggle('active', mode === 'custom');
  $('paramPanel').style.display = mode === 'param' ? '' : 'none';
  $('customPanel').style.display = mode === 'custom' ? '' : 'none';
  if (typeof gaTrack === 'function') gaTrack('slotpack_mode', mode);
};

/* ── 頂點表格 ── */
function renderVertexTable() {
  var body = $('vertexTableBody');
  var html = '';
  vertices.forEach(function (v, i) {
    html += '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="x" value="' + fmt(v.x, 3) + '"></td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="y" value="' + fmt(v.y, 3) + '"></td>' +
      '<td><button class="vertex-del-btn" data-i="' + i + '" title="' + mtT('addPointBtn') + '">✕</button></td>' +
      '</tr>';
  });
  body.innerHTML = html;

  body.querySelectorAll('input').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var i = parseInt(this.dataset.i, 10), axis = this.dataset.axis;
      var v = parseFloat(this.value);
      if (isFinite(v)) { vertices[i][axis] = v; computeAll(); }
    });
  });
  body.querySelectorAll('.vertex-del-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (vertices.length <= 3) return; // 至少留3點才能成形
      vertices.splice(parseInt(this.dataset.i, 10), 1);
      renderVertexTable();
      computeAll();
    });
  });
}

function generateFromParametric() {
  var top = num('p_topWidth', 4), bottom = num('p_bottomWidth', 7), depth = num('p_depth', 12);
  vertices = generateTrapezoid(top, bottom, depth);
  renderVertexTable();
  computeAll();
  if (typeof gaTrack === 'function') gaTrack('slotpack_generate', 'trapezoid');
}

function addVertexPoint() {
  var last = vertices[vertices.length - 1] || { x: 0, y: 0 };
  vertices.push({ x: last.x + 2, y: last.y });
  renderVertexTable();
  computeAll();
}

/* ── SVG 繪製 ── */
function renderSvg(pack) {
  var svg = $('packingSvg');
  if (vertices.length < 3) { svg.innerHTML = ''; return; }

  var bbox = polygonBBox(vertices);
  var w = bbox.maxX - bbox.minX, h = bbox.maxY - bbox.minY;
  var pad = Math.max(w, h, 1) * 0.12;
  svg.setAttribute('viewBox', (bbox.minX - pad) + ' ' + (bbox.minY - pad) + ' ' + (w + 2 * pad) + ' ' + (h + 2 * pad));

  var strokeW = Math.max(w, h, 1) * 0.01;
  var pts = vertices.map(function (p) { return p.x + ',' + p.y; }).join(' ');
  var html = '<polygon class="slot-outline" points="' + pts + '" style="stroke-width:' + strokeW + '"></polygon>';
  (pack ? pack.placed : []).forEach(function (c) {
    html += '<circle class="slot-circle" cx="' + c.x + '" cy="' + c.y + '" r="' + (c.d / 2) + '" style="stroke-width:' + (strokeW * 0.4) + '"></circle>';
  });
  svg.innerHTML = html;
}

/* ── 主重算 ── */
function computeAll() {
  if (vertices.length < 3) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errFewPoints') + '</span>';
    renderSvg(null);
    return;
  }
  var area = polygonArea(vertices);
  if (!(area > 0)) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadArea') + '</span>';
    renderSvg(null);
    return;
  }

  var bareDia = num('w_bareDia', 0.7), enamel = num('w_enamel', 0.025);
  var turns = num('w_turns', 0), coils = num('w_coils', 1), strands = num('w_strands', 1);
  var clearance = num('w_wallClearance', 0);
  var diameter = bareDia + 2 * enamel;
  var count = Math.max(0, Math.round(turns * coils * strands));

  if (!(diameter > 0) || count <= 0) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadWire') + '</span>';
    renderSvg(null);
    return;
  }

  var circleArea = Math.PI / 4 * diameter * diameter;
  var fillPctArea = count * circleArea / area * 100;
  var pack = packCirclesInPolygon(vertices, diameter, count, clearance);
  renderSvg(pack);

  var fillClass = fillPctArea > 100 ? 'bad' : (fillPctArea > 85 ? 'warn' : '');
  var packedClass = pack.placedCount >= count ? '' : 'warn';
  var packedNote = pack.placedCount >= count ? mtT('packedAll') : mtT('packedPartial');

  $('statsOut').innerHTML =
    tip(mtT('outArea'), 'tipArea') + ': <span class="rv">' + fmt(area, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWireOd'), 'outWireOdTip') + ' = <span class="rv">' + fmt(diameter, 4) + '</span><span class="ru">mm</span>' +
      ' <span class="sub-note">(' + fmt(bareDia, 3) + ' + 2×' + fmt(enamel, 3) + ')</span><br>' +
    mtT('outCount') + ' = <span class="rv">' + count + '</span><br>' +
    tip(mtT('outFillArea'), 'outFillAreaTip') + ' = <span class="rv ' + fillClass + '">' + fmt(fillPctArea, 1) + '</span><span class="ru">%</span><br>' +
    tip(mtT('outPacked'), 'outPackedTip') + ': <span class="rv ' + packedClass + '">' + pack.placedCount + ' / ' + count + '</span>' +
      ' <span class="ru">(' + packedNote + ')</span>';
}

/* ── 事件綁定 ── */
document.addEventListener('DOMContentLoaded', function () {
  $('btnGenerate').addEventListener('click', generateFromParametric);
  $('btnAddPoint').addEventListener('click', addVertexPoint);

  ['w_bareDia', 'w_enamel', 'w_turns', 'w_coils', 'w_strands', 'w_wallClearance']
    .forEach(function (id) { $(id).addEventListener('input', computeAll); });

  document.addEventListener('mt-lang-change', computeAll);
  document.addEventListener('mt-theme-change', function () { computeAll(); });

  generateFromParametric(); // 進頁面先用預設梯形參數產生一組起始外形，不留空白畫面
});

})();
