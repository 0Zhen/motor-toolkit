'use strict';
/* ══════════════════════════════════════════════════════════
   Cost Calculator — app.js
   state、事件綁定、即時重算、成本表/圓餅圖渲染、i18n 字典、
   可編輯矽鋼片／磁鐵價目表（localStorage 持久化，同步下拉選單）。
   ══════════════════════════════════════════════════════════ */

var MT_I18N = {
  motorType:       { en: 'Motor Type',                   zh: '馬達類型' },
  priceTableTitle: { en: 'Material Price Table (editable)', zh: '材料價目表（可編輯）' },
  priceTableHint:  { en: 'Edit grade / density / price here — the grade dropdowns on the left stay in sync automatically. Every edit is auto-saved to this browser (localStorage), no save button needed — it will still be here next time you open this page in the SAME browser. Clearing site data, private/incognito mode, or a different browser/device will reset it to the defaults.',
                      zh: '在這裡編輯牌號／密度／單價，左側的牌號下拉選單會自動同步。每次編輯都會自動存進這個瀏覽器（localStorage），不用按儲存鍵——下次用同一台瀏覽器打開這頁還會在。但清瀏覽器資料、無痕模式、或換瀏覽器/裝置就會回到預設值。' },
  copperTitle:     { en: 'Copper', zh: '銅' },
  copperGrade:     { en: 'Cu grade', zh: '銅材牌號' },
  typePMSM:        { en: 'PMSM',                          zh: 'PMSM' },
  typeEESM:        { en: 'EESM',                          zh: 'EESM' },
  typeIM:          { en: 'Induction',                     zh: '感應馬達' },

  geomTitle:       { en: 'Geometry',                      zh: '幾何尺寸' },
  statorOD:        { en: 'Stator OD [mm]',                zh: '定子外徑 [mm]' },
  statorID:        { en: 'Stator ID [mm]',                zh: '定子內徑 [mm]' },
  rotorOD:         { en: 'Rotor OD [mm]',                 zh: '轉子外徑 [mm]' },
  rotorID:         { en: 'Rotor ID [mm]',                 zh: '轉子內徑 [mm]' },
  stackLength:     { en: 'Stack length [mm]',             zh: '積厚（疊厚）[mm]' },

  slotPoleTitle:   { en: 'Slots / Poles',                 zh: '槽極數' },
  slots:           { en: 'Slots',                          zh: '槽數' },
  poles:           { en: 'Poles',                          zh: '極數' },

  steelTitle:      { en: 'Silicon Steel',                 zh: '矽鋼片' },
  steelGrade:      { en: 'Grade',                          zh: '牌號' },
  steelDensity:    { en: 'Density [kg/m³]',                zh: '密度 [kg/m³]' },
  stackFactor:     { en: 'Stacking factor',                zh: '疊片係數' },
  steelPrice:      { en: 'Price [$/kg]',                   zh: '單價 [$/kg]' },
  steelHint:       { en: 'Gross annulus of stator + rotor lamination OD/ID. Slot cutout area is NOT subtracted (confirmed simplification). Density/price come from the price table below — edit it to match your own grades.',
                      zh: '用定子/轉子疊片毛胚環形面積計算，不扣除槽開口面積（已確認的簡化假設）。密度/單價取自下方價目表，可自行編輯成你的牌號資料。' },

  windingTitle:    { en: 'Stator Winding (Copper)',        zh: '定子繞組（銅）' },
  turnsPerSlot:    { en: 'Turns / slot',                   zh: '每槽匝數' },
  wireDia:         { en: 'Bare wire dia. [mm]',            zh: '裸銅線徑 [mm]' },
  copperDensity:   { en: 'Cu density [kg/m³]',             zh: '銅密度 [kg/m³]' },
  copperPrice:     { en: 'Cu price [$/kg]',                zh: '銅價 [$/kg]' },
  mltFactor:       { en: 'MLT factor',                     zh: 'MLT 係數' },
  mltHint:         { en: 'MLT = stack length × MLT factor (same simplified model as the DCR Calculator).',
                      zh: 'MLT = 積厚 × MLT 係數（沿用 DCR Calculator 同一套簡化模型）。' },

  pmsmTitle:       { en: 'PMSM — Magnet', zh: 'PMSM — 磁鐵' },
  magnetArea:      { en: 'Magnet area / pole [mm²]',       zh: '單極磁鐵面積 [mm²]' },
  magnetAreaHint:  { en: 'Total magnet volume = area/pole × poles × stack length. Density/price come from the price table below.',
                      zh: '磁鐵用量 = 單極面積 × 極數 × 積厚（已確認的簡化輸入方式）。密度/單價取自下方價目表。' },
  magnetGrade:     { en: 'Magnet grade',                   zh: '磁鐵牌號' },
  magnetDensity:   { en: 'Magnet density [kg/m³]',         zh: '磁鐵密度 [kg/m³]' },
  magnetPrice:     { en: 'Magnet price [$/kg]',            zh: '磁鐵價 [$/kg]' },

  eesmTitle:       { en: 'EESM — Rotor Field Winding',     zh: 'EESM — 轉子激磁繞組' },
  rotorTurnsPerPole: { en: 'Rotor turns / pole',           zh: '轉子每極匝數' },
  rotorWireDia:    { en: 'Rotor wire dia. [mm]',           zh: '轉子線徑 [mm]' },
  eesmHint:        { en: 'Uses the same Cu density / Cu price / MLT factor as the stator winding above. Slip ring / brush cost not included.',
                      zh: '沿用上方定子繞組的銅密度／銅價／MLT係數，轉子積厚＝定子積厚。不含滑環／電刷成本。' },

  imTitle:         { en: 'Induction — Rotor Cage',         zh: '感應馬達 — 轉子鴨籠' },
  rotorCageWeight: { en: 'Rotor cage weight [kg]',         zh: '轉子鴨籠總重 [kg]' },
  rotorCageMaterial: { en: 'Cage material',                zh: '鴨籠材料' },
  rotorCagePrice:  { en: 'Cage material price [$/kg]',     zh: '鴨籠材料價 [$/kg]' },
  imHint:          { en: 'Simplified: total cage weight entered directly (bar/end-ring geometry not modeled).',
                      zh: '簡化模型：直接輸入鴨籠總重（不做導條/端環幾何細節）。' },

  thGrade:         { en: 'Grade', zh: '牌號' },
  thDensity2:      { en: 'ρ [kg/m³]', zh: 'ρ [kg/m³]' },
  thPrice2:        { en: '$/kg', zh: '$/kg' },
  addRowBtn:       { en: '+ Add grade', zh: '+ 新增牌號' },

  resultTitle:     { en: 'Cost Breakdown', zh: '成本明細' },
  thItem:          { en: 'Item', zh: '項目' },
  thWeight:        { en: 'Weight [kg]', zh: '重量 [kg]' },
  thCost:          { en: 'Cost [$]', zh: '成本 [$]' },
  thShare:         { en: 'Share [%]', zh: '佔比 [%]' },
  itemSteel:       { en: 'Silicon steel (stator+rotor core)', zh: '矽鋼片（定子+轉子鐵芯）' },
  itemCopper:      { en: 'Stator copper', zh: '定子銅' },
  itemMagnet:      { en: 'Magnet', zh: '磁鐵' },
  itemRotorCopper: { en: 'Rotor field winding copper', zh: '轉子激磁繞組銅' },
  itemRotorCage:   { en: 'Rotor cage', zh: '轉子鴨籠' },
  totalLabel:      { en: 'Total material cost', zh: '總材料成本' },
  mvpHint:         { en: 'Material cost only — labor, processing, yield loss and margin are NOT included.',
                      zh: '僅計算材料成本，不含人工、加工、良率損耗與利潤。' },

  warnStatorOD:    { en: 'Stator ID must be smaller than Stator OD — check your input.',
                      zh: '定子內徑必須小於定子外徑，請檢查輸入值。' },
  warnRotorOD:     { en: 'Rotor ID must be smaller than Rotor OD — check your input.',
                      zh: '轉子內徑必須小於轉子外徑，請檢查輸入值。' },
};

var CU = 'cu', AL = 'al';
var ROTOR_CAGE_DEFAULT_PRICE = { cu: 13.7, al: 2.5 }; // 粗略預設，使用者應自行覆蓋

var currentType = 'pmsm';

/* ── 矽鋼片／磁鐵價目表：預設資料（使用者提供的實際報價 + 補齊的密度估計值） ── */
var DEFAULT_STEEL_GRADES = [
  { grade: '50A1300', density: 7850, price: 0.77 },
  { grade: '50A470',  density: 7750, price: 0.80 },
  { grade: '50A290',  density: 7650, price: 1.18 },
  { grade: '35A300',  density: 7650, price: 1.13 },
  { grade: '35A440',  density: 7700, price: 0.96 },
];
var DEFAULT_MAGNET_GRADES = [
  { grade: 'N35SH', density: 7500, price: 42 },
  { grade: 'N38SH', density: 7500, price: 44 },
  { grade: 'N40SH', density: 7500, price: 46 },
  { grade: 'N42SH', density: 7500, price: 48 },
  { grade: 'N45SH', density: 7500, price: 52 },
  { grade: 'N38UH', density: 7500, price: 53 },
  { grade: 'N42UH', density: 7500, price: 55 },
  { grade: '4240',  density: 4900, price: 3.84 }, // ferrite
  { grade: '4545',  density: 4900, price: 4.80 }, // ferrite
  { grade: '4748',  density: 4900, price: 5.77 }, // ferrite
];
var DEFAULT_COPPER_GRADES = [
  { grade: 'Cu-ETP', density: 8960, price: 13.7 },
];
var STEEL_LS_KEY = 'mt-cost-calc-steel-grades';
var MAGNET_LS_KEY = 'mt-cost-calc-magnet-grades';
var COPPER_LS_KEY = 'mt-cost-calc-copper-grades';

var steelGrades, magnetGrades, copperGrades;

function loadGrades(key, defaults) {
  try {
    var raw = localStorage.getItem(key);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) { /* ignore corrupt/blocked storage, fall back to defaults */ }
  return defaults.map(function (g) { return { grade: g.grade, density: g.density, price: g.price }; });
}

function saveGrades(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) { /* storage unavailable, edits stay in-memory only */ }
}

function $(id) { return document.getElementById(id); }
function num(id, fallback) {
  var el = $(id);
  if (!el) return fallback;
  var v = parseFloat(el.value);
  return isFinite(v) ? v : fallback;
}
function fmt(v, digits) { return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }); }

/* ── 摺疊區塊 ── */
function toggleSection(id) { $(id).classList.toggle('collapsed'); }

/* ══════════════════════════════════════════════════════════
   價目表：可編輯表格 + 下拉選單同步
   ══════════════════════════════════════════════════════════ */
function renderGradeTable(tbodyId, arr, storeKey, onChange) {
  var tbody = $(tbodyId);
  tbody.innerHTML = '';
  arr.forEach(function (row, idx) {
    var tr = document.createElement('tr');

    var tdGrade = document.createElement('td');
    var inGrade = document.createElement('input');
    inGrade.type = 'text'; inGrade.className = 'ge-input ge-grade'; inGrade.value = row.grade;
    inGrade.addEventListener('change', function () {
      row.grade = inGrade.value || row.grade;
      saveGrades(storeKey, arr);
      onChange();
    });
    tdGrade.appendChild(inGrade); tr.appendChild(tdGrade);

    var tdDensity = document.createElement('td');
    var inDensity = document.createElement('input');
    inDensity.type = 'text'; inDensity.className = 'ge-input ge-num'; inDensity.value = row.density;
    inDensity.addEventListener('input', function () {
      row.density = parseFloat(inDensity.value) || 0;
      saveGrades(storeKey, arr);
      onChange();
    });
    tdDensity.appendChild(inDensity); tr.appendChild(tdDensity);

    var tdPrice = document.createElement('td');
    var inPrice = document.createElement('input');
    inPrice.type = 'text'; inPrice.className = 'ge-input ge-num'; inPrice.value = row.price;
    inPrice.addEventListener('input', function () {
      row.price = parseFloat(inPrice.value) || 0;
      saveGrades(storeKey, arr);
      onChange();
    });
    tdPrice.appendChild(inPrice); tr.appendChild(tdPrice);

    var tdDel = document.createElement('td');
    var btnDel = document.createElement('button');
    btnDel.type = 'button'; btnDel.className = 'ge-del'; btnDel.textContent = '×';
    btnDel.addEventListener('click', function () {
      arr.splice(idx, 1);
      saveGrades(storeKey, arr);
      renderGradeTable(tbodyId, arr, storeKey, onChange);
      onChange();
    });
    tdDel.appendChild(btnDel); tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });
}

function populateSelectFromGrades(selectId, arr) {
  var sel = $(selectId);
  var prevValue = sel.value;
  sel.innerHTML = '';
  arr.forEach(function (g) {
    var opt = document.createElement('option');
    opt.value = g.grade;
    opt.textContent = g.grade;
    sel.appendChild(opt);
  });
  if (arr.some(function (g) { return g.grade === prevValue; })) {
    sel.value = prevValue;
  } else if (arr.length) {
    sel.selectedIndex = 0;
  }
}

function populateSteelGrades() {
  populateSelectFromGrades('c_steelGrade', steelGrades);
  applySteelGrade();
}
function populateMagnetGrades() {
  populateSelectFromGrades('c_magnetGrade', magnetGrades);
  applyMagnetGrade();
}
function populateCopperGrades() {
  populateSelectFromGrades('c_copperGrade', copperGrades);
  applyCopperGrade();
}

function applySteelGrade() {
  var g = steelGrades.find(function (x) { return x.grade === $('c_steelGrade').value; });
  if (!g) return;
  $('c_steelDensity').value = g.density;
  $('c_steelPrice').value = g.price;
}
function applyMagnetGrade() {
  var g = magnetGrades.find(function (x) { return x.grade === $('c_magnetGrade').value; });
  if (!g) return;
  $('c_magnetDensity').value = g.density;
  $('c_magnetPrice').value = g.price;
}
function applyCopperGrade() {
  var g = copperGrades.find(function (x) { return x.grade === $('c_copperGrade').value; });
  if (!g) return;
  $('c_copperDensity').value = g.density;
  $('c_copperPrice').value = g.price;
}

function onSteelTableChange() { populateSteelGrades(); computeAll(); }
function onMagnetTableChange() { populateMagnetGrades(); computeAll(); }
function onCopperTableChange() { populateCopperGrades(); computeAll(); }

/* ── 馬達類型切換 ── */
function switchType(type) {
  currentType = type;
  ['pmsm', 'eesm', 'im'].forEach(function (t) {
    $('tab_' + t).classList.toggle('active', t === type);
    $('box_' + t).style.display = t === type ? '' : 'none';
  });
  computeAll();
  if (typeof gaTrack === 'function') gaTrack('cost_calc_type', type);
}

/* ── 鴨籠材料切換時帶入預設單價（僅在使用者尚未動過欄位時） ── */
function onCageMaterialChange() {
  var mat = $('c_rotorCageMaterial').value;
  var priceEl = $('c_rotorCagePrice');
  if (priceEl.dataset.userEdited !== '1') {
    priceEl.value = ROTOR_CAGE_DEFAULT_PRICE[mat];
  }
  computeAll();
}

/* ── 計算與渲染 ── */
var chart = null;

function themeColors() {
  var cs = getComputedStyle(document.documentElement);
  return {
    text: cs.getPropertyValue('--text').trim(),
    text2: cs.getPropertyValue('--text2').trim(),
    surface: cs.getPropertyValue('--surface').trim(),
    accent: cs.getPropertyValue('--accent').trim(),
    green: cs.getPropertyValue('--green').trim(),
    amber: cs.getPropertyValue('--amber').trim(),
  };
}

function readCommon() {
  return {
    statorOD: num('c_statorOD', 90),
    statorID: num('c_statorID', 55),
    rotorOD: num('c_rotorOD', 54),
    rotorID: num('c_rotorID', 20),
    stack: num('c_stackLength', 30),
    slots: num('c_slots', 12),
    poles: num('c_poles', 10),
    steelDensity: num('c_steelDensity', CC_DENSITY.steelDefault),
    stackFactor: num('c_stackFactor', 0.97),
    steelPrice: num('c_steelPrice', 3),
    turnsPerSlot: num('c_turnsPerSlot', 66),
    wireDia: num('c_wireDia', 0.7),
    copperDensity: num('c_copperDensity', CC_DENSITY.copperDefault),
    copperPrice: num('c_copperPrice', 13.7),
    mltFactor: num('c_mltFactor', 2.5),
  };
}

function validateGeometry(p) {
  var warnings = [];
  if (p.statorID >= p.statorOD) warnings.push('warnStatorOD');
  if (p.rotorID >= p.rotorOD) warnings.push('warnRotorOD');
  return warnings;
}

function renderWarnings(warnings) {
  var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };
  var el = $('geomWarning');
  if (!warnings.length) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  el.innerHTML = warnings.map(function (k) { return '<div>⚠ ' + mtT(k) + '</div>'; }).join('');
}

function computeAll() {
  var p = readCommon();
  renderWarnings(validateGeometry(p));

  var steel = ccSteelCost({
    statorOD: p.statorOD, statorID: p.statorID,
    rotorOD: p.rotorOD, rotorID: p.rotorID,
    stack: p.stack, stackFactor: p.stackFactor,
    density: p.steelDensity, price: p.steelPrice,
  });

  var statorCu = ccWindingCopperCost(
    p.turnsPerSlot, p.slots, p.wireDia, p.stack, p.mltFactor,
    p.copperDensity, p.copperPrice, null
  );

  var items = [
    { key: 'itemSteel', weightKg: steel.weightKg, cost: steel.cost },
    { key: 'itemCopper', weightKg: statorCu.weightKg, cost: statorCu.cost },
  ];

  if (currentType === 'pmsm') {
    var magnet = ccMagnetCost(num('c_magnetArea', 40), p.poles, p.stack, num('c_magnetDensity', 7500), num('c_magnetPrice', 45));
    items.push({ key: 'itemMagnet', weightKg: magnet.weightKg, cost: magnet.cost });
  } else if (currentType === 'eesm') {
    var rotorCu = ccWindingCopperCost(
      num('c_rotorTurnsPerPole', 40), p.poles, num('c_rotorWireDia', 0.6),
      p.stack, p.mltFactor, p.copperDensity, p.copperPrice, null
    );
    items.push({ key: 'itemRotorCopper', weightKg: rotorCu.weightKg, cost: rotorCu.cost });
  } else {
    var cage = ccRotorCageCost(num('c_rotorCageWeight', 0.3), num('c_rotorCagePrice', ROTOR_CAGE_DEFAULT_PRICE[$('c_rotorCageMaterial').value]));
    items.push({ key: 'itemRotorCage', weightKg: cage.weightKg, cost: cage.cost });
  }

  var summary = ccSummarize(items);
  renderTable(summary);
  renderChart(summary);
}

function renderTable(summary) {
  var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };
  var html = '<thead><tr>' +
    '<th>' + mtT('thItem') + '</th>' +
    '<th>' + mtT('thWeight') + '</th>' +
    '<th>' + mtT('thCost') + '</th>' +
    '<th>' + mtT('thShare') + '</th>' +
    '</tr></thead><tbody>';
  summary.rows.forEach(function (r) {
    html += '<tr>' +
      '<td>' + mtT(r.key) + '</td>' +
      '<td>' + fmt(r.weightKg, 3) + '</td>' +
      '<td>' + fmt(r.cost, 2) + '</td>' +
      '<td>' + fmt(r.sharePct, 1) + '</td>' +
      '</tr>';
  });
  html += '</tbody>';
  $('costTable').innerHTML = html;
  $('totalCostOut').textContent = '$' + fmt(summary.total, 2);
}

function renderChart(summary) {
  var c = themeColors();
  var palette = [c.accent, c.green, c.amber];
  var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };

  var labels = summary.rows.map(function (r) { return mtT(r.key); });
  var data = summary.rows.map(function (r) { return r.cost; });

  if (chart) { chart.destroy(); chart = null; }
  var ctx = $('chartCanvas').getContext('2d');
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: palette.slice(0, data.length),
        borderColor: c.surface,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: c.text, boxWidth: 14 } },
      },
    },
  });
}

/* ── 事件綁定 ── */
document.addEventListener('DOMContentLoaded', function () {
  steelGrades = loadGrades(STEEL_LS_KEY, DEFAULT_STEEL_GRADES);
  magnetGrades = loadGrades(MAGNET_LS_KEY, DEFAULT_MAGNET_GRADES);
  copperGrades = loadGrades(COPPER_LS_KEY, DEFAULT_COPPER_GRADES);

  renderGradeTable('steelGradeTbody', steelGrades, STEEL_LS_KEY, onSteelTableChange);
  renderGradeTable('magnetGradeTbody', magnetGrades, MAGNET_LS_KEY, onMagnetTableChange);
  renderGradeTable('copperGradeTbody', copperGrades, COPPER_LS_KEY, onCopperTableChange);
  populateSteelGrades();
  populateMagnetGrades();
  populateCopperGrades();

  $('steelAddRow').addEventListener('click', function () {
    steelGrades.push({ grade: 'NEW', density: 7650, price: 1 });
    saveGrades(STEEL_LS_KEY, steelGrades);
    renderGradeTable('steelGradeTbody', steelGrades, STEEL_LS_KEY, onSteelTableChange);
    onSteelTableChange();
  });
  $('magnetAddRow').addEventListener('click', function () {
    magnetGrades.push({ grade: 'NEW', density: 7500, price: 45 });
    saveGrades(MAGNET_LS_KEY, magnetGrades);
    renderGradeTable('magnetGradeTbody', magnetGrades, MAGNET_LS_KEY, onMagnetTableChange);
    onMagnetTableChange();
  });
  $('copperAddRow').addEventListener('click', function () {
    copperGrades.push({ grade: 'NEW', density: 8960, price: 13.7 });
    saveGrades(COPPER_LS_KEY, copperGrades);
    renderGradeTable('copperGradeTbody', copperGrades, COPPER_LS_KEY, onCopperTableChange);
    onCopperTableChange();
  });

  var commonIds = [
    'c_statorOD', 'c_statorID', 'c_rotorOD', 'c_rotorID', 'c_stackLength',
    'c_slots', 'c_poles',
    'c_stackFactor',
    'c_turnsPerSlot', 'c_wireDia', 'c_mltFactor',
    'c_magnetArea',
    'c_rotorTurnsPerPole', 'c_rotorWireDia',
    'c_rotorCageWeight',
  ];
  commonIds.forEach(function (id) { $(id).addEventListener('input', computeAll); });

  $('c_magnetGrade').addEventListener('change', function () { applyMagnetGrade(); computeAll(); });
  $('c_steelGrade').addEventListener('change', function () { applySteelGrade(); computeAll(); });
  $('c_copperGrade').addEventListener('change', function () { applyCopperGrade(); computeAll(); });
  $('c_rotorCageMaterial').addEventListener('change', onCageMaterialChange);
  $('c_rotorCagePrice').addEventListener('input', function () { $('c_rotorCagePrice').dataset.userEdited = '1'; });

  document.addEventListener('mt-lang-change', computeAll);
  document.addEventListener('mt-theme-change', computeAll);

  computeAll();
});
