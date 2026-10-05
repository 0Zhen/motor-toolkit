'use strict';
/* ══════════════════════════════════════════════════════════
   Slot Packing Viewer — app.js
   state、事件綁定、頂點表格渲染、SVG 繪製、i18n 字典。
   ══════════════════════════════════════════════════════════ */

var MT_I18N = {
  shapeTitle:   { en: 'Slot Shape', zh: '槽型' },
  tabParam:     { en: 'Parametric', zh: '參數化' },
  tabCustom:    { en: 'Custom points', zh: '自訂頂點' },
  openWidth:    { en: 'Opening width [mm]', zh: '開口寬 [mm]' },
  openHeight:   { en: 'Opening height [mm]', zh: '開口高 [mm]' },
  topWidth:     { en: 'Body top width [mm]', zh: '本體上寬 [mm]' },
  bottomWidth:  { en: 'Bottom width [mm]', zh: '下寬（槽底）[mm]' },
  slotDepth:    { en: 'Depth [mm]', zh: '槽深 [mm]' },
  generateBtn:  { en: 'Generate points (overwrites below)', zh: '產生頂點（覆蓋下方表格）' },
  paramHint:    {
    en: 'Symmetric: y=0 is the slot opening (air-gap side), y=depth is the slot bottom (yoke side). A narrow opening throat (opening width/height) runs from y=0, then widens to the body’s top width and tapers to the bottom width. Set opening width = body top width (or opening height = 0) for a plain trapezoid. Generates 8 points below — add more afterwards to refine the shape.',
    zh: '對稱：y=0 是槽口（靠氣隙那端），y=depth 是槽底（靠軛部那端）。從y=0開始先是一段窄直的開口喉（開口寬/開口高），之後展開成本體上寬，再taper到下寬。把開口寬設成等於本體上寬（或開口高設0）就會退化成單純梯形。會產生下方8個頂點，之後可以再手動加點微調形狀。',
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
  coilsSplitHint:{
    en: '2 or more: split into a left and a right bundle (one per coil side), like a double-layer slot. 1: the whole bundle sits in just one side, the other side left empty.',
    zh: '2 以上：分成左右兩束（各自代表一個線圈邊），跟雙層槽一樣。1：整批線材只佔其中一側，另一側留白。',
  },
  linerThickness:{ en: 'Liner thickness [mm]', zh: 'Liner 厚度 [mm]' },
  windStartY:   { en: 'No-wind depth (opening) [mm]', zh: '不繞線深度（開口）[mm]' },
  layersCount:  { en: 'Layers', zh: '層數' },
  layersHint:   {
    en: 'Like a needle-winding machine program: turns are split evenly across this many layers (front layers get the remainder), stacked from the slot bottom toward the opening, one horizontal row per layer.',
    zh: '仿導針繞線機的繞法：匝數平均分配到這個層數（除不盡時前面幾層多一顆），沿槽深方向從槽底往槽口疊，一層一個橫排。',
  },
  autoLayers:   { en: 'Auto-fit layers to slot depth', zh: '自動排線（切齊槽深）' },
  autoLayersHint:{
    en: 'Ignores the Layers number above. Each layer fills to whatever that row’s actual width allows, moving to the next layer, until the turns run out or the slot depth does — no manual tuning of Layers needed, and no overfull-layer warnings possible.',
    zh: '忽略上面的層數。每一層直接疊到那個高度寬度實際容得下的最大顆數才換下一層，疊到匝數用完或槽深用完為止——不用手動調層數，也不會有層數太滿的警告。',
  },
  layerOverfull:{ en: 'Layer(s) too full for this width', zh: '有層的匝數超過該處寬度能塞下的量' },
  layerNum:     { en: 'Layer {n}', zh: '第{n}層' },
  sideLeft:     { en: 'Left', zh: '左' },
  sideRight:    { en: 'Right', zh: '右' },
  outLayersUsed:{ en: 'Layers used', zh: '實際層數' },
  packedDepthLimited: { en: 'slot depth ran out', zh: '槽深不夠疊完' },
  windStartHint:{
    en: 'The opening throat is too narrow for wire — auto-filled from Opening height when you Generate, but editable (e.g. for a custom shape with no formal throat).',
    zh: '開口喉太窄塞不了線——按 Generate 時會自動帶入「開口高」，也可以自己改（例如自訂頂點的槽型沒有正式的開口喉概念時）。',
  },
  wireHint:     {
    en: 'The liner is modeled as a real inward offset of the slot outline (shown in green below), not just a number subtracted from the fill % — turns are packed inside that offset shape.',
    zh: 'Liner 是真的把槽型輪廓向內偏移出來的幾何（下方綠色區域），不是從槽滿率扣一個數字而已——線材是塞在這個內縮後的區域裡。',
  },
  toolHint:     {
    en: '💡 This is a simple row-by-row visual, not an optimal circle-packing solver — a real winding may fit tighter than shown. The area-based fill % is the reliable number; the packed count is indicative only.',
    zh: '💡 這只是簡單的逐排視覺化，不是最佳圓形填充演算法——實際繞線可能比畫面上塞得更緊。「面積槽滿率」才是可靠的數字，「堆疊顆數」只是示意。',
  },
  statsTitle:   { en: 'Stats', zh: '統計' },
  legendLam:    { en: 'Lamination', zh: '鐵芯' },
  legendLiner:  { en: 'Liner (winding window)', zh: 'Liner（繞線窗）' },
  legendWire:   { en: 'Conductor', zh: '導線' },

  outSlotArea:   { en: 'Slot area (outer)', zh: '槽面積（外緣）' },
  outWindingArea:{ en: 'Winding area (after liner)', zh: '繞線窗面積（liner內縮後）' },
  outWireOd:     { en: 'Wire OD', zh: '線材外徑（OD）' },
  outCount:      { en: 'Wire count', zh: '線材總數' },
  outFillArea:   { en: 'Fill % (area-based)', zh: '槽滿率 %（面積法）' },
  outPacked:     { en: 'Packed (visual)', zh: '堆疊顆數（示意）' },
  packedAll:     { en: 'all placed', zh: '全部放得下' },
  packedPartial: { en: 'did not all fit in this simple layout', zh: '這個簡易排法放不滿' },
  errFewPoints:  { en: 'Need at least 3 points to form a shape.', zh: '至少需要3個頂點才能構成形狀。' },
  errBadArea:    { en: 'These points don’t enclose a usable area — check the vertex order/values.', zh: '這些頂點圍不出有效面積，請檢查頂點順序/數值。' },
  errBadWire:    { en: 'Wire diameter and count must be greater than 0.', zh: '線徑與數量都必須大於0。' },
  errLinerTooThick: {
    en: 'Liner thickness is too large for this slot shape (it would cross itself, e.g. at the opening throat). Reduce the liner thickness or widen the shape there.',
    zh: 'Liner 厚度對這個槽型來說太厚了（內縮後會在某處自我交叉，例如開口喉部太窄）。請縮小 liner 厚度，或把該處的槽型放寬。',
  },

  tipSlotArea: {
    en: 'Shoelace formula on the outer vertex list — the slot’s own cut area, before the liner.',
    zh: '用槽型外緣頂點算的鞋帶公式（Shoelace formula）——liner內縮之前，槽本身的切割面積。',
  },
  tipWindingArea: {
    en: 'Area of the outer slot outline offset inward by the liner thickness, with the opening throat (no-wind depth) excluded — the actual usable winding window.',
    zh: '槽型外緣向內偏移liner厚度之後、再扣掉開口喉（不繞線深度）的面積——實際可以拿來繞線的窗口。',
  },
  outWireOdTip:  {
    en: 'Wire OD = bare copper dia. + 2 × enamel thickness (one side).',
    zh: '線材外徑 = 裸銅徑 + 2 × 漆膜厚度（單邊）。',
  },
  outFillAreaTip:{
    en: 'Fill % = (wire count × circle area) / winding area (after liner) × 100 — independent of how the row-packing below actually arranges them.',
    zh: '槽滿率 % = (線材總數 × 單根截面積) / 繞線窗面積（liner內縮後） × 100 — 跟下面的排列演算法擺不擺得下無關，純粹面積比。',
  },
  outPackedTip:  {
    en: 'How many of the wires actually got placed, following the explicit layer pattern (turns split evenly across the Layers count, one horizontal row per layer, stacked from the slot bottom toward the opening) — like a needle-winding machine program, not an auto-fill solver. If this is less than the wire count, some layer was assigned more turns than fit in that row’s width (see the warning below) — try more layers or fewer turns.',
    zh: '按照明確的層數排法實際擺進去幾根——匝數平均分配到設定的層數，一層一個橫排，沿槽深方向從槽底往槽口疊，仿照導針繞線機的繞法，不是自動塞滿演算法。如果這個數字比線材總數少，代表某一層分配到的匝數超過那個高度的寬度塞得下的量（見下方警告），試試看增加層數或減少匝數。',
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
  var openW = num('p_openWidth', 3), openH = num('p_openHeight', 1.5);
  var top = num('p_topWidth', 4), bottom = num('p_bottomWidth', 7), depth = num('p_depth', 12);
  vertices = generateSlotShape(openW, openH, top, bottom, depth);
  renderVertexTable();
  $('w_windStartY').value = fmt(openH, 3); // 開口喉不繞線，跟著參數化的開口高自動帶
  computeAll();
  if (typeof gaTrack === 'function') gaTrack('slotpack_generate', 'slot');
}

function addVertexPoint() {
  var last = vertices[vertices.length - 1] || { x: 0, y: 0 };
  vertices.push({ x: last.x + 2, y: last.y });
  renderVertexTable();
  computeAll();
}

/* ── SVG 繪製：紅=鐵芯、綠=liner內縮後的繞線窗、黃=導線（仿 Motor-CAD 配色） ── */
function renderSvg(innerPoly, pack) {
  var svg = $('packingSvg');
  if (vertices.length < 3) { svg.innerHTML = ''; return; }

  var bbox = polygonBBox(vertices);
  var w = bbox.maxX - bbox.minX, h = bbox.maxY - bbox.minY;
  var pad = Math.max(w, h, 1) * 0.12;
  var vx = bbox.minX - pad, vy = bbox.minY - pad, vw = w + 2 * pad, vh = h + 2 * pad;
  svg.setAttribute('viewBox', vx + ' ' + vy + ' ' + vw + ' ' + vh);

  var strokeW = Math.max(w, h, 1) * 0.01;
  var outerPts = vertices.map(function (p) { return p.x + ',' + p.y; }).join(' ');
  var html = '<rect class="slot-lamination" x="' + vx + '" y="' + vy + '" width="' + vw + '" height="' + vh + '"></rect>' +
    '<polygon class="slot-outline" points="' + outerPts + '" style="stroke-width:' + strokeW + '"></polygon>';

  if (innerPoly) {
    var innerPts = innerPoly.map(function (p) { return p.x + ',' + p.y; }).join(' ');
    html += '<polygon class="slot-liner" points="' + innerPts + '" style="stroke-width:' + strokeW + '"></polygon>';
  }
  (pack ? pack.placed : []).forEach(function (c) {
    html += '<circle class="slot-circle" cx="' + c.x + '" cy="' + c.y + '" r="' + (c.d / 2) + '" style="stroke-width:' + (strokeW * 0.4) + '"></circle>';
  });
  svg.innerHTML = html;
}

/* ── 主重算 ── */
function computeAll() {
  if (vertices.length < 3) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errFewPoints') + '</span>';
    renderSvg(null, null);
    return;
  }
  var slotArea = polygonArea(vertices);
  if (!(slotArea > 0)) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadArea') + '</span>';
    renderSvg(null, null);
    return;
  }

  var linerThk = num('w_linerThickness', 0);
  var innerPoly = linerThk > 0 ? offsetPolygonInward(vertices, linerThk) : vertices;
  var innerValid = linerThk <= 0 || isOffsetValid(vertices, innerPoly);

  if (!innerValid) {
    $('statsOut').innerHTML =
      tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
      '<span class="bad">' + mtT('errLinerTooThick') + '</span>';
    renderSvg(null, null);
    return;
  }

  // 開口喉塞不下線：繞線用的多邊形先在 y=windStartY 裁掉喉部，liner 本身（innerPoly，
  // 畫面上的綠色區域）仍然包含喉部兩側——喉部有襯墊但不繞線，這兩件事分開處理
  var windStartY = Math.max(0, num('w_windStartY', 0));
  var packableArea = clipPolygonMinY(innerPoly, windStartY);
  var windingArea = polygonArea(packableArea);

  if (!(windingArea > 0)) {
    $('statsOut').innerHTML =
      tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
      '<span class="bad">' + mtT('errLinerTooThick') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var bareDia = num('w_bareDia', 0.7), enamel = num('w_enamel', 0.025);
  var turns = num('w_turns', 0), coils = num('w_coils', 1), strands = num('w_strands', 1);
  var autoLayers = $('w_autoLayers').checked;
  var layers = Math.max(1, Math.round(num('w_layers', 1)));
  var diameter = bareDia + 2 * enamel;
  var count = Math.max(0, Math.round(turns * coils * strands));

  if (!(diameter > 0) || count <= 0) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadWire') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var circleArea = Math.PI / 4 * diameter * diameter;
  var fillPctArea = count * circleArea / windingArea * 100;

  // 仿導針繞線機：匝數依「層數」疊，層與層沿槽深方向從槽底往槽口疊。
  // 手動模式：層數是輸入，匝數平均分配到每層，某層分到太多塞不下時回報
  // 警告。自動模式（切齊槽深）：不給層數，每層直接疊到那個高度實際塞
  // 得下的最大顆數，疊到匝數用完或槽深用完為止，層數是疊出來的結果。
  // 雙層（coils/slot >= 2）：繞線窗先切成左右兩束，中間留一道 liner 厚
  // 度當間隙，每束各自獨立套用同一套疊法；單層（coils/slot <= 1）：
  // 整批線材只佔其中一側（固定左半），右半留白——跟 Winding Designer
  // 既有的雙層左右並排慣例一致。bbox 用裁完喉部後的 packableArea 算，
  // 分界線在它的左右正中央，不是寫死 x=0。
  var packBbox = polygonBBox(packableArea);
  var splitX = (packBbox.minX + packBbox.maxX) / 2;
  var pack, layerWarnings = [], layersUsed;
  var packOneArea = function (area, areaCount) {
    return autoLayers
      ? packAutoLayersInPolygon(area, diameter, areaCount)
      : packLayersInPolygon(area, diameter, areaCount, layers);
  };
  if (coils >= 2) {
    var gap = linerThk / 2;
    var leftArea = clipPolygonMaxX(packableArea, splitX - gap);
    var rightArea = clipPolygonMinX(packableArea, splitX + gap);
    var perSide = Math.round(count / 2);
    var packL = packOneArea(leftArea, perSide);
    var packR = packOneArea(rightArea, count - perSide);
    pack = {
      placed: packL.placed.concat(packR.placed),
      placedCount: packL.placedCount + packR.placedCount,
      requestedCount: count,
    };
    if (!autoLayers) {
      collectLayerWarnings(packL.layers, mtT('sideLeft')).forEach(function (w) { layerWarnings.push(w); });
      collectLayerWarnings(packR.layers, mtT('sideRight')).forEach(function (w) { layerWarnings.push(w); });
    }
    layersUsed = Math.max(packL.layers.length, packR.layers.length);
  } else {
    var singleSideArea = clipPolygonMaxX(packableArea, splitX);
    pack = packOneArea(singleSideArea, count);
    if (!autoLayers) collectLayerWarnings(pack.layers, null).forEach(function (w) { layerWarnings.push(w); });
    layersUsed = pack.layers.length;
  }
  renderSvg(innerPoly, pack);

  var fillClass = fillPctArea > 100 ? 'bad' : (fillPctArea > 85 ? 'warn' : '');
  var packedClass = pack.placedCount >= count ? '' : 'warn';
  var packedNote = pack.placedCount >= count ? mtT('packedAll') : (autoLayers ? mtT('packedDepthLimited') : mtT('packedPartial'));
  var warningsHtml = layerWarnings.length
    ? '<br><span class="warn sub-note">' + mtT('layerOverfull') + ': ' + layerWarnings.join('; ') + '</span>'
    : '';

  $('statsOut').innerHTML =
    tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWindingArea'), 'tipWindingArea') + ': <span class="rv">' + fmt(windingArea, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWireOd'), 'outWireOdTip') + ' = <span class="rv">' + fmt(diameter, 4) + '</span><span class="ru">mm</span>' +
      ' <span class="sub-note">(' + fmt(bareDia, 3) + ' + 2×' + fmt(enamel, 3) + ')</span><br>' +
    mtT('outCount') + ' = <span class="rv">' + count + '</span><br>' +
    mtT('outLayersUsed') + ' = <span class="rv">' + layersUsed + '</span><br>' +
    tip(mtT('outFillArea'), 'outFillAreaTip') + ' = <span class="rv ' + fillClass + '">' + fmt(fillPctArea, 1) + '</span><span class="ru">%</span><br>' +
    tip(mtT('outPacked'), 'outPackedTip') + ': <span class="rv ' + packedClass + '">' + pack.placedCount + ' / ' + count + '</span>' +
      ' <span class="ru">(' + packedNote + ')</span>' + warningsHtml;
}

/* 收集「某一層指定匝數超過那個寬度塞得下的量」的警告文字 */
function collectLayerWarnings(layerInfos, sideLabel) {
  return (layerInfos || [])
    .filter(function (l) { return l.placed < l.requested; })
    .map(function (l) {
      var prefix = sideLabel ? sideLabel + ' ' : '';
      return prefix + mtT('layerNum').replace('{n}', l.index + 1) + ': ' + l.placed + '/' + l.requested;
    });
}

/* ── 事件綁定 ── */
document.addEventListener('DOMContentLoaded', function () {
  $('btnGenerate').addEventListener('click', generateFromParametric);
  $('btnAddPoint').addEventListener('click', addVertexPoint);

  ['w_bareDia', 'w_enamel', 'w_turns', 'w_coils', 'w_strands', 'w_layers', 'w_linerThickness', 'w_windStartY']
    .forEach(function (id) { $(id).addEventListener('input', computeAll); });

  function updateAutoLayersState() {
    $('w_layers').disabled = $('w_autoLayers').checked;
    computeAll();
  }
  $('w_autoLayers').addEventListener('change', updateAutoLayersState);
  updateAutoLayersState();

  document.addEventListener('mt-lang-change', computeAll);
  document.addEventListener('mt-theme-change', function () { computeAll(); });

  generateFromParametric(); // 進頁面先用預設梯形參數產生一組起始外形，不留空白畫面
});

})();
