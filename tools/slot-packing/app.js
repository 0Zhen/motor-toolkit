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
    en: 'Start from scratch, or switch to Parametric, generate a trapezoid, then come back here — every point is editable either way. You only edit the left half; the right half mirrors it automatically (slots are symmetric left-right).',
    zh: '可以從空白開始，或先切到參數化產生梯形再回來這裡繼續編輯——不管哪種方式，每個頂點都可以修改。只需要編輯左半邊，右半邊會自動依Y軸鏡射產生（槽型左右對稱）。',
  },
  verticesTitle:{ en: 'Vertices', zh: '頂點' },
  colX:         { en: 'X [mm]', zh: 'X [mm]' },
  colY:         { en: 'Y [mm]', zh: 'Y [mm]' },
  addPointBtn:  { en: '+ Add point', zh: '+ 新增頂點' },
  undoBtn:      { en: '↶ Undo', zh: '↶ 復原' },
  vertexHint:   {
    en: 'This lists the left half only, traced from the opening (top) down to the bottom — the right half is generated automatically by mirroring across the Y axis, and isn’t listed separately. Drag the labeled points on the drawing, or edit the numbers here. No self-intersection check — keep the half-outline simple (no crossing).',
    zh: '這裡只列左半邊的頂點，從槽口（上）往槽底（下）依序排列——右半邊會自動依Y軸鏡射產生，不會另外列出來。可以直接在圖上拖曳編號的點，或在這裡改數字。沒有自我相交檢查，請確保左半邊這條線本身不要交叉。',
  },
  wireTitle:    { en: 'Wire / Turns', zh: '線材 / 匝數' },
  bareDia:      { en: 'Bare copper dia. [mm]', zh: '裸銅徑 [mm]' },
  enamelThk:    { en: 'Enamel thk., one side [mm]', zh: '漆膜厚度（單邊）[mm]' },
  turnsPerSlot: { en: 'Turns / slot', zh: '每槽匝數' },
  coilsPerSlot: { en: 'Coils / slot', zh: '每槽線圈數' },
  strandsPerTurn:{ en: 'Strands / turn', zh: '股數/匝' },
  coilsSplitHint:{
    en: '2 or more: the winding window splits into a left and a right coil side, each independently packed (double-layer winding). 1: the whole window is packed as one — doesn’t decide anything about the total wire count, which is still turns × coils × strands.',
    zh: '2 以上：繞線窗分成左右兩個線圈邊，各自獨立密排（雙層繞組）。1：整個繞線窗當一池子密排——這個欄位不影響線材總數，總數還是匝數×線圈數×股數。',
  },
  needleWidth:  { en: 'Needle channel width [mm]', zh: '導針通道寬度 [mm]' },
  needleWidthHint:{
    en: 'Gap reserved between the two coil sides (Coils/slot ≥ 2 only) — separate from liner thickness, since this is the phase-separator / needle-insertion clearance in the middle of the slot, not insulation against the slot wall. Shown below as a dashed rectangle.',
    zh: '雙層繞組（每槽線圈數≥2）兩個線圈邊之間保留的間隙——跟liner厚度是分開的，因為這是繞線窗正中間的相間絕緣/導針通道空間，不是貼槽壁的絕緣。下方畫面用藍色虛線矩形標示。',
  },
  linerThickness:{ en: 'Liner thickness [mm]', zh: 'Liner 厚度 [mm]' },
  windStartY:   { en: 'No-wind depth (opening) [mm]', zh: '不繞線深度（開口）[mm]' },
  windStartHint:{
    en: 'The opening throat is too narrow for wire — auto-filled from Opening height when you Generate, but editable (e.g. for a custom shape with no formal throat).',
    zh: '開口喉太窄塞不了線——按 Generate 時會自動帶入「開口高」，也可以自己改（例如自訂頂點的槽型沒有正式的開口喉概念時）。',
  },
  wireHint:     {
    en: 'The liner is modeled as a real inward offset of the slot outline (shown in green below), not just a number subtracted from the fill % — turns are packed inside that offset shape.',
    zh: 'Liner 是真的把槽型輪廓向內偏移出來的幾何（下方綠色區域），不是從槽滿率扣一個數字而已——線材是塞在這個內縮後的區域裡。',
  },
  checkDcrBtn:  { en: 'Check DCR with these turns →', zh: '用這組匝數去DCR計算機確認電阻 →' },
  toolHint:     {
    en: '💡 Each wire is simulated settling into place, coming to rest against the slot wall (or the floor, for single-layer slots) and whichever wires are already placed — so it naturally hugs any wall angle and nests into the gaps between neighbors, without a fixed lattice pattern. For double-layer slots, each coil side settles independently toward its own outer wall. Still a geometric idealization, not a physics simulation — no wire tension, insertion order, friction, or enamel deformation.',
    zh: '💡 每條線材是用沉降模擬排列：貼著槽壁（單層時則貼槽底）、或已經放好的線材停住——不管槽壁是什麼角度都會自然貼合，也會自然嵌進鄰線間的縫隙，不是套固定格點樣式。雙層繞組時，左右兩個線圈邊各自獨立往自己的外側槽壁沉降。這仍然是幾何上的理想化，不是力學模擬——沒有算線材張力、插入順序、摩擦力或漆膜受壓變形。',
  },
  statsTitle:   { en: 'Stats', zh: '統計' },
  legendLam:    { en: 'Lamination', zh: '鐵芯' },
  legendLiner:  { en: 'Liner (winding window)', zh: 'Liner（繞線窗）' },
  legendWire:   { en: 'Conductor', zh: '導線' },
  legendNeedle: { en: 'Needle channel', zh: '導針通道' },

  outSlotArea:   { en: 'Slot area (outer)', zh: '槽面積（外緣）' },
  outWindingArea:{ en: 'Winding area (after liner)', zh: '繞線窗面積（liner內縮後）' },
  outWireOd:     { en: 'Wire OD', zh: '線材外徑（OD）' },
  outCount:      { en: 'Wire count', zh: '線材總數' },
  outFillArea:   { en: 'Fill % (area-based)', zh: '槽滿率 %（面積法）' },
  outPacked:     { en: 'Wires actually fit', zh: '實際容納線材數' },
  outMaxCapacity:{ en: 'Max capacity (this wire size)', zh: '最大容量（該線徑上限）' },
  outMaxFillArea:{ en: 'Fill % at max capacity', zh: '滿載時槽滿率 %' },
  packedAll:     { en: 'all placed', zh: '全部放得下' },
  packedPartial: { en: 'this slot can’t physically fit this many at this wire size', zh: '這個線徑下，這個槽塞不下這麼多' },
  applyMaxBtn:   { en: 'Fill to max', zh: '填滿到最大容量' },
  errFewPoints:  { en: 'Need at least 3 points to form a shape.', zh: '至少需要3個頂點才能構成形狀。' },
  errBadArea:    { en: 'These points don’t enclose a usable area — check the vertex order/values.', zh: '這些頂點圍不出有效面積，請檢查頂點順序/數值。' },
  errBadWire:    { en: 'Wire diameter and count must be greater than 0.', zh: '線徑與數量都必須大於0。' },
  errNeedleTooWide: {
    en: 'Needle channel width is wider than the slot opening itself — the needle couldn’t fit through. Reduce the needle channel width or widen the opening.',
    zh: '導針通道寬度比槽開口本身還寬，導針根本穿不進去。請縮小導針通道寬度，或把開口放寬。',
  },
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
    en: 'How many wires actually got placed by the settling simulation, out of the wire count above (turns × coils × strands). Equals the wire count when everything fits; otherwise it’s capped at Max capacity below — the slot genuinely can’t hold more at this wire diameter, so this number and Max capacity end up the same.',
    zh: '照沉降模擬實際擺得進去幾根，對照上面的線材總數（匝數×線圈數×股數）。全部放得下時兩個數字會一樣；放不下時會被限制在下面的「最大容量」——這個槽在這個線徑下真的塞不下更多了，所以這兩個數字此時會相同，不是算錯。',
  },
  tipMaxCapacity: {
    en: 'The same settling simulation run with no limit on count — the absolute ceiling for this exact wire diameter in this slot (after liner, opening excluded), independent of whatever Turns/slot you’ve set. Use "Fill to max" above to set Turns/slot to reach this number exactly.',
    zh: '用同一套沉降模擬、不限制數量跑出來的結果——這個槽（扣掉liner跟開口喉之後）在這個線徑下的絕對上限，跟你目前設定的「每槽匝數」無關。上面的「填滿到最大容量」按鈕可以直接把匝數設成剛好達到這個數字。',
  },
  outMaxFillAreaTip: {
    en: 'Fill % if the slot were packed to its max capacity (above) instead of your requested wire count — the practical ceiling for this wire size. Hexagonal packing on an infinite plane tops out around 90.7%, but a small or tapered slot loses more to boundary effects (circles near the wall can’t nest as tightly), so the real number here is usually well below that.',
    zh: '如果照上面的「最大容量」塞滿（而不是你設定的線材總數）會是多少槽滿率——這個線徑的實際上限。六方密排在無限平面上的理論密度約90.7%，但槽越小、越有taper，邊界效應（貼壁的圓沒辦法跟內部排得一樣緊）損失就越多，這裡算出來的實際數字通常會明顯低於那個理論值。',
  },
};

(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };

var shapeMode = 'param';
// 使用者只編輯左半邊（由槽口y=0往槽底方向排列），右半邊永遠是左半邊依
// Y軸（x=0）鏡射自動產生——槽型本來就是左右對稱的，編輯一半、另一半跟
// 著動，不用使用者自己維護兩份對稱的數字。vertices 是從 halfVertices
// 算出來的完整多邊形（左半+鏡射後倒序接回去的右半，形成封閉輪廓），
// 所有幾何計算（面積、liner、堆疊……）都只讀 vertices，不直接碰
// halfVertices；UI編輯（表格/新增/刪除/拖曳）只碰 halfVertices，改完
// 一定呼叫 syncVerticesFromHalf() 才讓 vertices 跟著更新。
var halfVertices = [];
var vertices = [];
var lastMaxCapacity = 0, lastCoils = 1, lastStrands = 1; // 給「自動填滿到最大容量」按鈕用
var lastWindingArea = 0; // 給「去DCR計算機確認」按鈕用——DCR自己的槽面積欄位需要這個真實算出來的繞線窗面積，不能留它自己的預設值

/** 左半邊（依序從槽口排到槽底）鏡射回去接成完整封閉多邊形：左半原封
 *  不動，右半＝左半倒序＋x取負——這樣鏡射後的右半會從槽底往槽口接回
 *  去，整圈連起來才會是正確方向的簡單多邊形（不是兩段各自獨立的開放
 *  折線）。左半的頭尾兩點不需要剛好落在x=0上：如果不是，鏡射後頭尾會
 *  各自形成一條連接左右兩側的邊（分別對應槽口開口線、槽底線），效果
 *  是對的，不用特判。 */
function syncVerticesFromHalf() {
  var mirroredBack = halfVertices.slice().reverse().map(function (p) { return { x: -p.x, y: p.y }; });
  vertices = halfVertices.concat(mirroredBack);
}

/* ── 頂點清單復原（Undo）──
 * 只管左半邊頂點清單本身（編輯座標／新增／刪除／按Generate整個覆蓋
 * 掉），不管線材/槽型參數等其他欄位——這是使用者最容易「不小心弄丟工
 * 作」的地方（尤其是切回參數化按Generate，會直接覆蓋掉所有自訂編輯）。*/
var vertexHistory = [];
var MAX_VERTEX_HISTORY = 50;
function pushVertexHistory() {
  vertexHistory.push(halfVertices.map(function (v) { return { x: v.x, y: v.y }; }));
  if (vertexHistory.length > MAX_VERTEX_HISTORY) vertexHistory.shift();
  $('btnUndoVertex').disabled = false;
}
function undoVertices() {
  if (!vertexHistory.length) return;
  halfVertices = vertexHistory.pop();
  syncVerticesFromHalf();
  $('btnUndoVertex').disabled = vertexHistory.length === 0;
  renderVertexTable();
  computeAll();
}

/* 統計欄「填滿到最大容量」：反推 Turns/slot = maxCapacity / (coils×strands)
 * 無條件捨去（寧可少塞，不要讓算出來的數字又超過容量），直接改掉輸入
 * 欄再重算一次——不是另外存一個「建議值」，使用者看到的就是實際套用
 * 後的結果。 */
window.applyMaxTurns = function () {
  if (!(lastMaxCapacity > 0) || !(lastCoils > 0) || !(lastStrands > 0)) return;
  var newTurns = Math.floor(lastMaxCapacity / (lastCoils * lastStrands));
  if (newTurns < 1) return;
  $('w_turns').value = newTurns;
  computeAll();
};

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
  computeAll(); // 圖上的標註（尺寸線 vs 座標文字）跟著模式切換，不等下次輸入才重畫
  if (typeof gaTrack === 'function') gaTrack('slotpack_mode', mode);
};

/* ── 頂點表格（只列左半邊，右半邊自動鏡射）── */
function renderVertexTable() {
  var body = $('vertexTableBody');
  var html = '';
  halfVertices.forEach(function (v, i) {
    html += '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="x" value="' + fmt(v.x, 3) + '"></td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="y" value="' + fmt(v.y, 3) + '"></td>' +
      '<td><button class="vertex-del-btn" data-i="' + i + '" title="' + mtT('addPointBtn') + '">✕</button></td>' +
      '</tr>';
  });
  body.innerHTML = html;

  body.querySelectorAll('input').forEach(function (inp) {
    // 在開始編輯那一刻（focus）存一次快照，不是每個按鍵都存——這樣一次
    // 「復原」會退回到那格開始編輯之前的狀態，不是只退回最後一個字元。
    inp.addEventListener('focus', function () { pushVertexHistory(); });
    inp.addEventListener('input', function () {
      var i = parseInt(this.dataset.i, 10), axis = this.dataset.axis;
      var v = parseFloat(this.value);
      if (isFinite(v)) { halfVertices[i][axis] = v; syncVerticesFromHalf(); computeAll(); }
    });
  });
  body.querySelectorAll('.vertex-del-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (halfVertices.length <= 2) return; // 左半邊至少留2點，鏡射後才能成形（至少4邊）
      pushVertexHistory();
      halfVertices.splice(parseInt(this.dataset.i, 10), 1);
      syncVerticesFromHalf();
      renderVertexTable();
      computeAll();
    });
  });
}

function generateFromParametric() {
  // Generate 會整個覆蓋掉目前的左半邊頂點清單，包含使用者切到自訂頂點
  // 手動改過的內容——這是最容易「不小心弄丟工作」的操作，按之前先存一
  // 次快照（頁面剛載入、halfVertices 還是空的那次不用存，沒有東西好
  // 復原）。
  if (halfVertices.length >= 2) pushVertexHistory();
  var openW = num('p_openWidth', 3), openH = num('p_openHeight', 1.5);
  var top = num('p_topWidth', 4), bottom = num('p_bottomWidth', 7), depth = num('p_depth', 12);
  // 跟 generateSlotShape() 產生的8點是同一個形狀，但這裡直接寫出「左半
  // 邊、從槽口排到槽底」的4點，不是反過來從8點裡篩選——對稱軸切出來的
  // 左半邊本來就該長這樣，不需要用篩選+排序去猜。
  halfVertices = [
    { x: -openW / 2, y: 0 },
    { x: -openW / 2, y: openH },
    { x: -top / 2, y: openH },
    { x: -bottom / 2, y: depth },
  ];
  syncVerticesFromHalf();
  renderVertexTable();
  $('w_windStartY').value = fmt(openH, 3); // 開口喉不繞線，跟著參數化的開口高自動帶
  computeAll();
  if (typeof gaTrack === 'function') gaTrack('slotpack_generate', 'slot');
}

function addVertexPoint() {
  pushVertexHistory();
  var last = halfVertices[halfVertices.length - 1] || { x: -1, y: 0 };
  halfVertices.push({ x: last.x, y: last.y + 2 });
  syncVerticesFromHalf();
  renderVertexTable();
  computeAll();
}

/* 槽口（y=0，靠氣隙那端）實際上是開放的，不是鐵芯/liner包起來的封閉邊
 * ——把多邊形重新排序成「從開口的其中一個端點開始，繞一圈到開口的另一
 * 端點結束」，畫成不封口的 polyline，開口那一段邊就不會被畫出來。找
 * 「開口邊」用 y 最小（靠氣隙那端是整個工具固定的座標慣例）判斷，不是
 * 只認參數化生成時的頂點順序，使用者自訂頂點也適用。找不到明顯的水平
 * 頂緣（例如整個形狀被改到沒有任何一段貼齊最小 y）就退回整圈都畫。 */
function openingAwarePoints(poly) {
  var n = poly.length;
  if (n < 2) return poly;
  var minY = Math.min.apply(null, poly.map(function (p) { return p.y; }));
  var eps = 1e-6;
  for (var i = 0; i < n; i++) {
    var a = poly[i], b = poly[(i + 1) % n];
    if (Math.abs(a.y - minY) < eps && Math.abs(b.y - minY) < eps) {
      var reordered = [];
      for (var k = 0; k < n; k++) reordered.push(poly[(i + 1 + k) % n]);
      return reordered;
    }
  }
  return poly;
}

/* 跟 openingAwarePoints 用同一條「y 最小＝開口邊」規則，量出那段開口邊
 * 的實際寬度——導針要先穿過這個開口才進得了槽，通道寬度不該比這個還
 * 寬。找不到明顯的水平頂緣就回傳 0（視為沒有可比較的寬度，不擋）。 */
function openingWidthOf(poly) {
  var n = poly.length;
  if (n < 2) return 0;
  var minY = Math.min.apply(null, poly.map(function (p) { return p.y; }));
  var eps = 1e-6;
  for (var i = 0; i < n; i++) {
    var a = poly[i], b = poly[(i + 1) % n];
    if (Math.abs(a.y - minY) < eps && Math.abs(b.y - minY) < eps) return Math.abs(b.x - a.x);
  }
  return 0;
}

/* 畫一條水平尺寸標註：兩端垂直延伸線（從特徵本身的 yFeature 連到尺寸線
 * 所在的 yDim）＋主尺寸線＋兩端短撇＋置中數字。延伸線跨過其他幾何（例
 *如內縮梯形較窄處的延伸線會跨過下方較寬的本體）是常見、可接受的畫
 * 法，不特別避開。 */
function dimH(x1, x2, yFeature, yDim, label, tick, fontSize) {
  var midX = (x1 + x2) / 2;
  return (
    '<line class="dim-ext" x1="' + x1 + '" y1="' + yFeature + '" x2="' + x1 + '" y2="' + yDim + '"></line>' +
    '<line class="dim-ext" x1="' + x2 + '" y1="' + yFeature + '" x2="' + x2 + '" y2="' + yDim + '"></line>' +
    '<line class="dim-line" x1="' + x1 + '" y1="' + yDim + '" x2="' + x2 + '" y2="' + yDim + '"></line>' +
    '<line class="dim-line" x1="' + x1 + '" y1="' + (yDim - tick) + '" x2="' + x1 + '" y2="' + (yDim + tick) + '"></line>' +
    '<line class="dim-line" x1="' + x2 + '" y1="' + (yDim - tick) + '" x2="' + x2 + '" y2="' + (yDim + tick) + '"></line>' +
    '<text class="dim-text" x="' + midX + '" y="' + yDim + '" font-size="' + fontSize + '">' + label + '</text>'
  );
}
/** 跟 dimH 同一套畫法，軸互換；文字旋轉-90度直式顯示（由下往上讀，標準工程圖慣例）。
 *  xFeature1/xFeature2 分開給，因為量垂直距離時兩端對應的槽型寬度通常不同
 *（例如開口高：上端在本體上寬處、下端在開口寬處，不是同一個x）。 */
function dimV(y1, y2, xFeature1, xFeature2, xDim, label, tick, fontSize) {
  var midY = (y1 + y2) / 2;
  return (
    '<line class="dim-ext" x1="' + xFeature1 + '" y1="' + y1 + '" x2="' + xDim + '" y2="' + y1 + '"></line>' +
    '<line class="dim-ext" x1="' + xFeature2 + '" y1="' + y2 + '" x2="' + xDim + '" y2="' + y2 + '"></line>' +
    '<line class="dim-line" x1="' + xDim + '" y1="' + y1 + '" x2="' + xDim + '" y2="' + y2 + '"></line>' +
    '<line class="dim-line" x1="' + (xDim - tick) + '" y1="' + y1 + '" x2="' + (xDim + tick) + '" y2="' + y1 + '"></line>' +
    '<line class="dim-line" x1="' + (xDim - tick) + '" y1="' + y2 + '" x2="' + (xDim + tick) + '" y2="' + y2 + '"></line>' +
    '<text class="dim-text" x="' + xDim + '" y="' + midY + '" font-size="' + fontSize + '" transform="rotate(-90 ' + xDim + ' ' + midY + ')">' + label + '</text>'
  );
}

/** 座標軸箭頭：從(x1,y1)到(x2,y2)畫一條線，終點畫小三角形箭頭＋文字標籤。 */
function axisArrow(x1, y1, x2, y2, label, arrowSize, fontSize) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  var backX = x2 - ux * arrowSize, backY = y2 - uy * arrowSize;
  var p1x = backX + nx * arrowSize * 0.5, p1y = backY + ny * arrowSize * 0.5;
  var p2x = backX - nx * arrowSize * 0.5, p2y = backY - ny * arrowSize * 0.5;
  var labelX = x2 + ux * fontSize * 0.8, labelY = y2 + uy * fontSize * 0.8;
  return '<line class="axis-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line>' +
    '<polygon class="axis-arrow" points="' + x2 + ',' + y2 + ' ' + p1x + ',' + p1y + ' ' + p2x + ',' + p2y + '"></polygon>' +
    '<text class="axis-label" x="' + labelX + '" y="' + labelY + '" font-size="' + fontSize + '">' + label + '</text>';
}

/** 把滑鼠/觸控事件的螢幕座標轉成 SVG viewBox 的使用者座標（mm）——優先
 *  用 getScreenCTM()（正確處理 preserveAspectRatio 置中縮放），拿不到
 *  時退回用 viewBox 手動按比例換算。 */
function svgPointToUser(svg, clientX, clientY) {
  var ctm = svg.getScreenCTM && svg.getScreenCTM();
  if (ctm && svg.createSVGPoint) {
    var pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    var up = pt.matrixTransform(ctm.inverse());
    return { x: up.x, y: up.y };
  }
  var rect = svg.getBoundingClientRect();
  var vb = svg.viewBox.baseVal;
  return {
    x: vb.x + (clientX - rect.left) / rect.width * vb.width,
    y: vb.y + (clientY - rect.top) / rect.height * vb.height,
  };
}

/** 自訂頂點模式：讓圖上每個標了編號的點可以直接拖曳——拖的是
 *  halfVertices[i]（左半邊），右半邊由 syncVerticesFromHalf() 自動鏡
 *  射更新，所以只要處理左半邊這一側的拖曳邏輯，不用另外判斷「拖到的
 *  是左點還是右點」（圖上本來就只有左半邊的點有控點）。用
 *  requestAnimationFrame 節流（pointermove 可能比畫面更新頻繁），拖曳
 *  開始時存一次 undo 快照（不是每個影格都存）。 */
function attachVertexDragHandlers(svg) {
  svg.querySelectorAll('.vertex-handle').forEach(function (handle) {
    handle.style.cursor = 'grab';
    handle.addEventListener('pointerdown', function (downEv) {
      downEv.preventDefault();
      var i = parseInt(handle.dataset.i, 10);
      pushVertexHistory();
      handle.style.cursor = 'grabbing';
      var rafPending = false, latest = null;
      function applyMove() {
        rafPending = false;
        if (!latest) return;
        var p = svgPointToUser(svg, latest.clientX, latest.clientY);
        // 卡住x<=0，不讓左半邊的點被拖過Y軸跑到右邊——拖過去的話鏡射出來
        // 的右半邊會變成跑到左邊，兩邊角色對調，畫面會很confusing，直
        // 接限制住比較不會拖錯。
        halfVertices[i].x = Math.min(p.x, 0);
        halfVertices[i].y = p.y;
        syncVerticesFromHalf();
        renderVertexTable();
        computeAll(); // 會重新呼叫 renderSvg()，含重新綁定這些拖曳控點
      }
      function onMove(mv) {
        latest = mv;
        if (!rafPending) { rafPending = true; requestAnimationFrame(applyMove); }
      }
      function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  });
}

/* ── SVG 繪製：紅=鐵芯、綠=liner內縮後的繞線窗、黃=導線（仿 Motor-CAD 配色） ── */
function renderSvg(innerPoly, pack, needleRect) {
  var svg = $('packingSvg');
  if (vertices.length < 3) { svg.innerHTML = ''; return; }

  var bbox = polygonBBox(vertices);
  var w = bbox.maxX - bbox.minX, h = bbox.maxY - bbox.minY;
  var maxDim = Math.max(w, h, 1);
  // 參數化模式會在圖外圍標尺寸，需要比自訂頂點模式更大的留白空間才放
  // 得下尺寸線跟文字——上方堆兩條（開口寬、上寬）、下方一條（下寬）、
  // 左右各一條（開口高、槽深）。
  var padTop = maxDim * (shapeMode === 'param' ? 0.40 : 0.18);
  var padBottom = maxDim * (shapeMode === 'param' ? 0.22 : 0.18);
  var padLeft = maxDim * (shapeMode === 'param' ? 0.26 : 0.26);
  var padRight = maxDim * (shapeMode === 'param' ? 0.26 : 0.26);
  var vx = bbox.minX - padLeft, vy = bbox.minY - padTop, vw = w + padLeft + padRight, vh = h + padTop + padBottom;
  svg.setAttribute('viewBox', vx + ' ' + vy + ' ' + vw + ' ' + vh);

  var strokeW = Math.max(w, h, 1) * 0.01;
  var outerPts = openingAwarePoints(vertices).map(function (p) { return p.x + ',' + p.y; }).join(' ');

  // 鐵芯（紅）只畫到槽口那條線（bbox.minY，氣隙側）為止，不要往上延伸到
  // 墊白區域——那裡是氣隙/轉子那側，不是鐵芯，照真實矽鋼片圖只有鐵芯
  // 本體是紅色，氣隙上方留白。
  var html = '<rect class="slot-lamination" x="' + vx + '" y="' + bbox.minY + '" width="' + vw + '" height="' + (vy + vh - bbox.minY) + '"></rect>' +
    '<polyline class="slot-outline" points="' + outerPts + '" style="stroke-width:' + strokeW + '"></polyline>';

  if (innerPoly) {
    var innerPts = openingAwarePoints(innerPoly).map(function (p) { return p.x + ',' + p.y; }).join(' ');
    html += '<polyline class="slot-liner" points="' + innerPts + '" style="stroke-width:' + strokeW + '"></polyline>';
  }

  // 自訂頂點模式：座標軸畫在liner之上、線材之下——畫在最底層（鐵芯/
  // liner之前）的話，大部分線段會被鐵芯/liner的實心填色蓋住，只剩墊
  // 白區域那一小段看得到，不夠明顯；畫在這裡才會整條線都蓋在材料色塊
  // 上面、顏色也改深色加粗，確保看得清楚。只在0落在目前視野範圍內才
  // 畫，避免極端自訂形狀把原點甩到畫面外時畫出奇怪的線。
  if (shapeMode === 'custom') {
    var axisFont = maxDim * 0.06, axisArrowSize = axisFont * 0.6;
    html += '<g style="stroke-width:' + (strokeW * 1.1) + '">';
    if (0 >= vx && 0 <= vx + vw) html += axisArrow(0, vy, 0, vy + vh, 'Y', axisArrowSize, axisFont);
    if (0 >= vy && 0 <= vy + vh) html += axisArrow(vx, 0, vx + vw, 0, 'X', axisArrowSize, axisFont);
    html += '</g>';
  }

  (pack ? pack.placed : []).forEach(function (c) {
    html += '<circle class="slot-circle" cx="' + c.x + '" cy="' + c.y + '" r="' + (c.d / 2) + '" style="stroke-width:' + (strokeW * 0.4) + '"></circle>';
  });
  if (needleRect) {
    html += '<rect class="slot-needle-channel" x="' + needleRect.x + '" y="' + needleRect.y + '" width="' + needleRect.width + '" height="' + needleRect.height + '" style="stroke-width:' + (strokeW * 0.6) + '"></rect>';
  }

  var dimStrokeW = strokeW * 0.5, fontSize = maxDim * 0.062, tick = fontSize * 0.4;
  if (shapeMode === 'param') {
    var openW = num('p_openWidth', 3), openH = num('p_openHeight', 1.5);
    var topW = num('p_topWidth', 4), bottomW = num('p_bottomWidth', 7), depthV = num('p_depth', 12);
    html += '<g style="stroke-width:' + dimStrokeW + '">' +
      dimH(-openW / 2, openW / 2, 0, -maxDim * 0.10, fmt(openW, 2), tick, fontSize) +
      dimH(-topW / 2, topW / 2, openH, -maxDim * 0.24, fmt(topW, 2), tick, fontSize) +
      dimH(-bottomW / 2, bottomW / 2, depthV, depthV + maxDim * 0.09, fmt(bottomW, 2), tick, fontSize) +
      dimV(0, openH, -openW / 2, -topW / 2, bbox.minX - maxDim * 0.10, fmt(openH, 2), tick, fontSize) +
      dimV(0, depthV, openW / 2, bottomW / 2, bbox.maxX + maxDim * 0.10, fmt(depthV, 2), tick, fontSize) +
      '</g>';
  } else if (shapeMode === 'custom') {
    // 完整座標字串太長，即使做碰撞收斂也容易把兩個離得近的點的標籤推到
    // 視覺順序對調（例如#2比#3高，但收斂後#2的標籤反而畫在#3下面，看
    // 起來像編號錯位）——座標本來就能直接在左邊頂點表格看到，圖上只需
    // 要「這個點是編號幾」就夠對照，改成只顯示編號，文字框小很多，也
    // 把推開方向的判斷從「比較目前暫定位置」改成「比較頂點本身實際的
    // y座標」，確保推開後標籤的上下順序一定跟頂點本身的上下順序一致，
    // 不會看起來錯位。碰撞收斂邏輯本身維持（相鄰點還是可能靠得夠近，
    // 短文字還是可能疊在一起），每個標籤畫一條細引線連回對應的頂點。
    var vLabelFont = fontSize * 0.85;
    var cx = halfVertices.reduce(function (s, v) { return s + v.x; }, 0) / halfVertices.length;
    var charW = vLabelFont * 0.56, lineH = vLabelFont * 1.3;
    var labels = halfVertices.map(function (v, i) {
      var above = i % 2 === 0;
      var right = v.x >= cx;
      var text = '#' + (i + 1);
      return {
        i: i,
        x: v.x + (right ? 1 : -1) * fontSize * 0.35,
        y: above ? v.y - vLabelFont * 0.9 : v.y + vLabelFont * 1.5,
        width: text.length * charW, height: lineH,
        anchor: right ? 'start' : 'end', text: text, dotX: v.x, dotY: v.y,
      };
    });
    function updateBox(L) {
      if (L.anchor === 'start') { L.x1 = L.x; L.x2 = L.x + L.width; } else { L.x1 = L.x - L.width; L.x2 = L.x; }
      L.y1 = L.y - L.height / 2; L.y2 = L.y + L.height / 2;
    }
    labels.forEach(updateBox);
    for (var iter = 0; iter < 12; iter++) {
      var moved = false;
      for (var a = 0; a < labels.length; a++) {
        for (var b = a + 1; b < labels.length; b++) {
          var A = labels[a], B = labels[b];
          var overlapX = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
          var overlapY = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1);
          if (overlapX > 0 && overlapY > 0) {
            moved = true;
            // 推開的軸選「兩個頂點本身差距較大的那一軸」，不是選文字框重
            // 疊量較小的那一軸——後者（最小位移）雖然收斂快，但常常選到
            // 跟頂點實際關係不一致的軸，例如兩點垂直差很多、水平差很少
            // 時卻選擇水平推開，畫出來兩個標籤會變成並排，視覺上跟頂點
            // 實際的上下關係對不起來，看起來像編號錯位。
            var useY = Math.abs(A.dotY - B.dotY) >= Math.abs(A.dotX - B.dotX);
            if (useY) {
              var pushY = overlapY / 2 + fontSize * 0.02;
              if (A.dotY < B.dotY) { A.y -= pushY; B.y += pushY; } else { A.y += pushY; B.y -= pushY; }
            } else {
              var pushX = overlapX / 2 + fontSize * 0.02;
              if (A.dotX < B.dotX) { A.x -= pushX; B.x += pushX; } else { A.x += pushX; B.x -= pushX; }
            }
            updateBox(A); updateBox(B);
          }
        }
      }
      if (!moved) break;
    }
    html += '<g style="stroke-width:' + dimStrokeW + '">' +
      labels.map(function (L) {
        return '<line class="dim-ext" x1="' + L.dotX + '" y1="' + L.dotY + '" x2="' + L.x + '" y2="' + L.y + '"></line>' +
          '<circle class="vertex-handle" data-i="' + L.i + '" cx="' + L.dotX + '" cy="' + L.dotY + '" r="' + (fontSize * 0.32) + '" fill="#3f4d66" stroke="none"></circle>' +
          '<text class="vertex-label" x="' + L.x + '" y="' + L.y + '" font-size="' + vLabelFont + '" style="text-anchor:' + L.anchor + '">' + L.text + '</text>';
      }).join('') +
      '</g>';
  }

  svg.innerHTML = html;
  if (shapeMode === 'custom') attachVertexDragHandlers(svg);
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
  lastWindingArea = windingArea;

  if (!(windingArea > 0)) {
    $('statsOut').innerHTML =
      tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
      '<span class="bad">' + mtT('errLinerTooThick') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var bareDia = num('w_bareDia', 0.7), enamel = num('w_enamel', 0.025);
  var turns = num('w_turns', 0), coils = num('w_coils', 1), strands = num('w_strands', 1);
  var diameter = bareDia + 2 * enamel;
  var count = Math.max(0, Math.round(turns * coils * strands));

  if (!(diameter > 0) || count <= 0) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadWire') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var needleWidth = Math.max(0, num('w_needleWidth', 0));
  var openingWidth = openingWidthOf(vertices);
  if (coils >= 2 && needleWidth > 0 && openingWidth > 0 && needleWidth > openingWidth) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errNeedleTooWide') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var circleArea = Math.PI / 4 * diameter * diameter;
  var fillPctArea = count * circleArea / windingArea * 100;

  // 逐顆沉降模擬：每條線材落下，貼著槽壁/槽底或已放置的線材停住，只
  // 決定於線徑/槽型本身，不用使用者設定層數/欄數——這就是整個重新設
  // 計要的「只設定匝數，工具自動排出來」。pack.maxCapacity 是同一套
  // 流程跑「不限數量」算出來的，直接回答「這個槽到底塞不塞得下」。
  // 雙層繞組（Coils/slot >= 2）：繞線窗先切成左右兩個獨立線圈邊（中間
  // 留一道「導針通道寬度」當間隙——這是相間絕緣/導針空間，跟貼槽壁的
  // liner厚度是不同的東西，不能共用同一個數字），各自往自己真正的外
  // 側槽壁沉降（settlePackTowardWall）、各自算自己的容量——理論上只會
  // 佔其中一邊，不是整個繞線窗混在一起看起來像單層。單層（Coils/slot
  // <= 1）：沒有單一偏向的槽壁可貼，整個繞線窗當一池子往槽底沉降，維
  // 持原樣，也沒有中間通道這個概念。
  var pack, needleRect = null;
  if (coils >= 2) {
    var packBbox = polygonBBox(packableArea);
    var splitX = (packBbox.minX + packBbox.maxX) / 2;
    var gap = needleWidth / 2;
    var leftArea = clipPolygonMaxX(packableArea, splitX - gap);
    var rightArea = clipPolygonMinX(packableArea, splitX + gap);
    var perSide = Math.round(count / 2);
    var packL = settlePackTowardWall(leftArea, diameter, perSide, 'left');
    var packR = settlePackTowardWall(rightArea, diameter, count - perSide, 'right');
    pack = {
      placed: packL.placed.concat(packR.placed),
      placedCount: packL.placedCount + packR.placedCount,
      requestedCount: count,
      maxCapacity: packL.maxCapacity + packR.maxCapacity,
    };
    if (needleWidth > 0) {
      needleRect = { x: splitX - gap, y: packBbox.minY, width: needleWidth, height: packBbox.maxY - packBbox.minY };
    }
  } else {
    pack = settlePack(packableArea, diameter, count);
  }
  renderSvg(innerPoly, pack, needleRect);

  var maxFillPct = pack.maxCapacity * circleArea / windingArea * 100;
  var fillClass = fillPctArea > 100 ? 'bad' : (fillPctArea > 85 ? 'warn' : '');
  var packedClass = pack.placedCount >= count ? '' : 'warn';
  var packedNote = pack.placedCount >= count ? mtT('packedAll') : mtT('packedPartial');
  lastMaxCapacity = pack.maxCapacity; lastCoils = coils; lastStrands = strands;
  // 「填滿到最大容量」按鈕放在「最大容量」這個數字後面（不是放在上面的
  // 「實際容納」那行）——按鈕的目標值就是這個數字，放在旁邊比較直覺。
  // 顯示條件：只要目前的匝數換算回去不等於「剛好用滿容量」的匝數，不
  // 管是塞不下（要減少）還是還有空間（可以加多），都該讓使用者一鍵套
  // 用；剛好已經是最大匝數時沒有東西好填，不顯示。
  var maxTurns = Math.floor(pack.maxCapacity / (coils * strands));
  var applyMaxBtn = (maxTurns >= 1 && maxTurns !== turns)
    ? ' <button class="mini-btn" onclick="applyMaxTurns()">' + mtT('applyMaxBtn') + '</button>' : '';

  $('statsOut').innerHTML =
    tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWindingArea'), 'tipWindingArea') + ': <span class="rv">' + fmt(windingArea, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWireOd'), 'outWireOdTip') + ' = <span class="rv">' + fmt(diameter, 4) + '</span><span class="ru">mm</span>' +
      ' <span class="sub-note">(' + fmt(bareDia, 3) + ' + 2×' + fmt(enamel, 3) + ')</span><br>' +
    mtT('outCount') + ' = <span class="rv">' + count + '</span><br>' +
    tip(mtT('outFillArea'), 'outFillAreaTip') + ' = <span class="rv ' + fillClass + '">' + fmt(fillPctArea, 1) + '</span><span class="ru">%</span><br>' +
    tip(mtT('outPacked'), 'outPackedTip') + ': <span class="rv ' + packedClass + '">' + pack.placedCount + ' / ' + count + '</span>' +
      ' <span class="ru">(' + packedNote + ')</span><br>' +
    tip(mtT('outMaxCapacity'), 'tipMaxCapacity') + ' = <span class="rv">' + pack.maxCapacity + '</span>' + applyMaxBtn + '<br>' +
    tip(mtT('outMaxFillArea'), 'outMaxFillAreaTip') + ' = <span class="rv">' + fmt(maxFillPct, 1) + '</span><span class="ru">%</span>';
}

/* ── 事件綁定 ── */
/* ── 跟 DCR Calculator 的雙向連結 ──
 * 兩個工具都要輸入同一組線材參數（匝數/線圈數/股數/裸銅徑/漆膜厚
 * 度），用URL query string帶一次性的「現在這組數字」過去確認，不做成
 * 持久共用的localStorage——不是要兩個工具隨時同步狀態。槽面積也一併
 * 帶過去（DCR自己的槽面積欄位預設是固定小數字，不帶的話DCR算出來的
 * 槽滿率會對不上這裡真實算出來的槽型，容易誤判成爆滿）。 */
window.openInDcrCalculator = function () {
  var params = new URLSearchParams();
  params.set('turns', num('w_turns', 0));
  params.set('coils', num('w_coils', 1));
  params.set('strands', num('w_strands', 1));
  params.set('bareDia', num('w_bareDia', 0.7));
  params.set('enamel', num('w_enamel', 0.025));
  if (lastWindingArea > 0) params.set('slotArea', lastWindingArea.toFixed(4));
  window.open('../dcr-calculator/index.html?' + params.toString(), '_blank');
};
/** 從 DCR Calculator 帶過來的參數：有帶到的欄位覆蓋掉預設值，其餘（槽
 *  型本身、liner、導針通道……）維持不變，在 generateFromParametric()
 *  跑第一次 computeAll() 之前先套用，不然畫面會先閃一次預設值。 */
function applyIncomingParams() {
  var p = new URLSearchParams(window.location.search);
  var keys = { turns: 'w_turns', coils: 'w_coils', strands: 'w_strands', bareDia: 'w_bareDia', enamel: 'w_enamel' };
  Object.keys(keys).forEach(function (k) {
    if (p.has(k)) { var v = parseFloat(p.get(k)); if (isFinite(v)) $(keys[k]).value = v; }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  $('btnGenerate').addEventListener('click', generateFromParametric);
  $('btnAddPoint').addEventListener('click', addVertexPoint);
  $('btnUndoVertex').addEventListener('click', undoVertices);

  ['w_bareDia', 'w_enamel', 'w_turns', 'w_coils', 'w_strands', 'w_linerThickness', 'w_needleWidth', 'w_windStartY']
    .forEach(function (id) { $(id).addEventListener('input', computeAll); });

  document.addEventListener('mt-lang-change', computeAll);
  document.addEventListener('mt-theme-change', function () { computeAll(); });

  applyIncomingParams();
  generateFromParametric(); // 進頁面先用預設梯形參數產生一組起始外形，不留空白畫面
});

})();
