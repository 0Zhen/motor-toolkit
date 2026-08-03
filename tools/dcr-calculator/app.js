'use strict';
/* ══════════════════════════════════════════════════════════
   DCR Calculator — app.js
   state、事件綁定、即時重算、表格渲染、i18n 字典。
   ══════════════════════════════════════════════════════════ */

var MT_I18N = {
  tabQuick:        { en: 'Quick (calibration)',        zh: '快速（校準）' },
  tabFull:         { en: 'Full (geometry)',             zh: '完整（幾何）' },

  quickBaseTitle:  { en: 'Reference Design (measured point)', zh: '基準設計（實測點）' },
  baseTurns:       { en: 'N₀ — turns',                  zh: 'N₀ — 匝數' },
  baseWire:        { en: 'd₀ — wire dia. [mm]',          zh: 'd₀ — 線徑 [mm]' },
  baseDcr:         { en: 'R₀ — DCR phase [Ω]',           zh: 'R₀ — 相電阻 [Ω]' },
  wireStepLabel:   { en: 'Wire step [mm]',               zh: '線徑級距 [mm]' },
  quickBaseHint:   { en: '10p12s, outer rotor, single-layer concentrated, 3ph Y, fully series (example default).',
                      zh: '10極12槽、外轉子、集中繞單層、3相Y接全串聯（範例預設值）。' },
  quickTargetTitle:{ en: 'Change one value',             zh: '改其中一個值' },
  targetTurns:     { en: 'Turns',                        zh: '匝數' },
  targetWire:      { en: 'Wire dia.',                    zh: '線徑' },
  targetDcr:       { en: 'DCR',                          zh: 'DCR' },

  windingTitle:    { en: 'Winding Configuration',        zh: '繞組配置' },
  poles:           { en: 'Poles',                        zh: '極數' },
  slots:           { en: 'Slots',                        zh: '槽數' },
  windingInfoText: { en: 'p={p} pole pairs · q={q} slots/pole/phase ({type}) · suggested series coils/phase = {sc}',
                      zh: 'p={p} 對極 · q={q} 每極每相槽數（{type}）· 建議每相串聯圈數 = {sc}' },
  fractionalSlot:  { en: 'fractional-slot, concentrated',  zh: '分數槽，集中繞' },
  integerSlot:     { en: 'integer-slot, distributed',      zh: '整數槽，分佈繞' },
  phases:          { en: 'Phases',                       zh: '相數' },
  connection:      { en: 'Connection',                   zh: '接線' },
  parallelPaths:   { en: 'Parallel paths a',              zh: '並聯路數 a' },
  turnsPerSlot:    { en: 'Turns / slot',                 zh: '每槽匝數' },
  coilsPerSlot:    { en: 'Coils / slot',                 zh: '每槽線圈數' },
  seriesCoils:     { en: 'Series coils / phase',         zh: '每相串聯圈數' },
  strandsPerTurn:  { en: 'Strands / turn',               zh: '股數/匝' },

  wireTitle:       { en: 'Wire',                          zh: '線材' },
  bareDia:         { en: 'Bare copper dia. [mm]',        zh: '裸銅徑 [mm]' },
  enamelThk:       { en: 'Enamel thk., one side [mm]',   zh: '漆膜厚度（單邊）[mm]' },
  material:        { en: 'Material',                      zh: '材質' },

  geomTitle:       { en: 'Geometry',                      zh: '幾何尺寸' },
  stackLength:     { en: 'Stack length [mm]',             zh: '疊長 [mm]' },
  mlt:             { en: 'MLT [mm] (blank=est.)',        zh: 'MLT [mm]（留空=估算）' },
  mltFactor:       { en: 'MLT factor (if blank)',        zh: 'MLT 係數（留空時用）' },
  slotArea:        { en: 'Slot area [mm²]',               zh: '槽面積 [mm²]' },

  condTitle:       { en: 'Condition',                     zh: '工況' },
  temp:            { en: 'Temperature [°C]',              zh: '溫度 [°C]' },
  fullHint:        { en: 'Generic placeholder values — replace with your own design/CAD data.',
                      zh: '通用示例值，請替換成你自己的設計/CAD 資料。' },

  sweepTitle:        { en: 'Wire Diameter Sweep',          zh: '線徑掃描' },
  sweepTargetFill:   { en: 'Target fill [%]',              zh: '目標槽滿率 [%]' },
  sweepMinLabel:     { en: 'min',                          zh: '最小' },
  sweepMaxLabel:     { en: 'max',                          zh: '最大' },
  sweepStepLabel:    { en: 'step',                         zh: '級距' },
  runSweepBtn:       { en: '▶ Run Sweep',                  zh: '▶ 執行掃描' },

  tempCorrTitle:   { en: 'Temperature Correction',        zh: '溫度換算' },
  tcR1:            { en: 'R @ T1 [Ω]',                    zh: 'R @ T1 [Ω]' },
  tcT1:            { en: 'T1 [°C]',                       zh: 'T1 [°C]' },
  tcT2:            { en: 'T2 [°C]',                       zh: 'T2 [°C]' },
  tcMaterial:      { en: 'Material',                       zh: '材質' },
  tcResult:        { en: 'R @ T2',                        zh: 'R @ T2' },

  ideal:           { en: 'Theoretical (continuous)',      zh: '理論解（連續）' },
  practical:       { en: 'Practical (achievable)',        zh: '實際採用（可達成）' },
  fillRatio:       { en: 'Slot-fill ratio (vs. reference)', zh: '結線面積比例（對基準）' },
  fullOutTitle:    { en: 'Result',                         zh: '計算結果' },
  sweepResultTitle:{ en: 'Wire Diameter ↔ DCR Table',      zh: '線徑 ↔ DCR 對照表' },

  thWire:          { en: 'd [mm]',                        zh: '線徑 [mm]' },
  thTurns:         { en: 'Turns',                          zh: '匝數' },
  thFill:          { en: 'Fill [%]',                      zh: '槽滿率 [%]' },
  thRphase:        { en: 'R_phase [Ω]',                   zh: 'R_相 [Ω]' },
  thRline:         { en: 'R_line [Ω]',                    zh: 'R_線 [Ω]' },
};

var currentMode = 'quick';

function $(id) { return document.getElementById(id); }
function num(id, fallback) {
  var v = parseFloat($(id).value);
  return isFinite(v) ? v : fallback;
}

/* ── 模式切換 ── */
function switchMode(mode) {
  currentMode = mode;
  $('tabQuick').classList.toggle('active', mode === 'quick');
  $('tabFull').classList.toggle('active', mode === 'full');
  $('quickPanel').style.display = mode === 'quick' ? '' : 'none';
  $('fullPanel').style.display = mode === 'full' ? '' : 'none';
  $('quickResults').style.display = mode === 'quick' ? '' : 'none';
  $('fullResults').style.display = mode === 'full' ? '' : 'none';
  computeAll();
  if (typeof gaTrack === 'function') gaTrack('dcr_mode', mode);
}

/* ── 摺疊區塊 ── */
function toggleSection(id) {
  $(id).classList.toggle('collapsed');
}

/* ── Quick 模式 ── */
function currentTarget() {
  var els = document.getElementsByName('qTarget');
  for (var i = 0; i < els.length; i++) if (els[i].checked) return els[i].value;
  return 'turns';
}

function fmt(v, digits) { return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function fmtSmart(v) { return Number.isInteger(v) ? String(v) : fmt(v, 2); }

/* ── 槽極配資訊 ── */
function updateWindingInfo() {
  var poles = num('f_poles', 10), slots = num('f_slots', 12), phases = num('f_phases', 3);
  var info = windingLayoutInfo(poles, slots, phases);
  var isInt = Math.abs(info.q - Math.round(info.q)) < 1e-6;
  var text = window.mtT('windingInfoText')
    .replace('{p}', fmtSmart(info.polePairs))
    .replace('{q}', fmt(info.q, 2))
    .replace('{type}', window.mtT(isInt ? 'integerSlot' : 'fractionalSlot'))
    .replace('{sc}', fmtSmart(Math.round(info.suggestedSeriesCoils)));
  $('f_windingInfo').textContent = text;
}

function applySuggestedSeriesCoils() {
  var poles = num('f_poles', 10), slots = num('f_slots', 12), phases = num('f_phases', 3);
  var info = windingLayoutInfo(poles, slots, phases);
  $('f_seriesCoils').value = Math.round(info.suggestedSeriesCoils);
  computeFull();
}

function computeQuick() {
  var target = currentTarget();
  $('qTargetLabel').textContent = window.mtT(target === 'turns' ? 'targetTurns' : target === 'wire' ? 'targetWire' : 'targetDcr');

  var N0 = num('q_N0', 66), d0 = num('q_d0', 0.7), R0 = num('q_R0', 1.9);
  var step = num('q_step', 0.1);
  var val = num('q_targetVal', N0);
  var calib = quickCalibrate(N0, d0, R0);

  var input = {};
  if (target === 'turns') input.turns = val;
  else if (target === 'wire') input.wire = val;
  else input.dcr = val;

  var res;
  try { res = quickSolve(input, calib, step); } catch (e) { return; }

  $('q_idealOut').innerHTML =
    'N = <span class="rv">' + fmt(res.nIdeal, 2) + '</span><span class="ru">turns</span><br>' +
    'd = <span class="rv">' + fmt(res.dIdeal, 4) + '</span><span class="ru">mm</span>';

  $('q_practicalOut').innerHTML =
    'N = <span class="rv">' + res.nPractical + '</span><span class="ru">turns</span><br>' +
    'd = <span class="rv">' + fmt(res.dPractical, 2) + '</span><span class="ru">mm</span><br>' +
    'DCR = <span class="rv">' + fmt(res.rPractical, 4) + '</span><span class="ru">Ω</span>';

  $('q_fillOut').innerHTML = '<span class="rv">' + fmt(res.fillRatioPct, 1) + '</span><span class="ru">%</span>';

  setDefaultTempInput(res.rPractical);
}

/* ── Full 模式 ── */
function readFullParams() {
  return {
    phases: num('f_phases', 3),
    connection: $('f_conn').value,
    parallelPaths: num('f_a', 1),
    turnsPerSlot: num('f_Nslot', 66),
    coilsPerSlot: num('f_coilsSlot', 1),
    seriesCoilsPerPhase: num('f_seriesCoils', 4),
    strandsPerTurn: num('f_strands', 1),
    bareDia: num('f_dbare', 0.7),
    enamelThk: num('f_enamel', 0.025),
    material: $('f_material').value,
    stackLength: num('f_stack', 61.95),
    mlt: $('f_mlt').value === '' ? null : num('f_mlt', null),
    mltFactor: num('f_mltFactor', 2.5),
    slotArea: num('f_slotArea', 45),
    tempC: num('f_temp', 20),
  };
}

function computeFull() {
  updateWindingInfo();
  var p = readFullParams();
  var res = fullSolve(p);

  $('f_out').innerHTML =
    'OD = <span class="rv">' + fmt(res.od, 4) + '</span><span class="ru">mm</span><br>' +
    'MLT used = <span class="rv">' + fmt(res.mlt, 2) + '</span><span class="ru">mm</span><br>' +
    'Series turns/phase = <span class="rv">' + fmt(res.seriesTurnsTotal, 0) + '</span><br>' +
    window.mtT('thFill') + ' = <span class="rv">' + fmt(res.fillPct, 1) + '</span><span class="ru">%</span><br>' +
    'R_phase = <span class="rv">' + fmt(res.rPhase, 4) + '</span><span class="ru">Ω</span><br>' +
    'R_line = <span class="rv">' + fmt(res.rLine, 4) + '</span><span class="ru">Ω</span>';

  setDefaultTempInput(res.rPhase);
  renderSweepTable();
}

function renderSweepTable() {
  var p = readFullParams();
  var targetFill = num('s_targetFill', 75);
  var dMin = num('s_dMin', 0.3), dMax = num('s_dMax', 1.0), dStep = num('s_dStep', 0.05);
  if (dStep <= 0 || dMax < dMin) return;

  var rows = sweepWireTable(p, targetFill, dMin, dMax, dStep);
  var html = '<thead><tr>' +
    '<th>' + window.mtT('thWire') + '</th>' +
    '<th>' + window.mtT('thTurns') + '</th>' +
    '<th>' + window.mtT('thFill') + '</th>' +
    '<th>' + window.mtT('thRphase') + '</th>' +
    '<th>' + window.mtT('thRline') + '</th>' +
    '</tr></thead><tbody>';

  rows.forEach(function (r) {
    var isCurrent = Math.abs(r.d - p.bareDia) < 1e-6;
    if (r.nSlot === 0) {
      html += '<tr class="na"><td>' + fmt(r.d, 2) + '</td><td colspan="4">—</td></tr>';
      return;
    }
    html += '<tr' + (isCurrent ? ' class="current"' : '') + '>' +
      '<td>' + fmt(r.d, 2) + '</td>' +
      '<td>' + r.nSlot + '</td>' +
      '<td>' + fmt(r.fillPct, 1) + '</td>' +
      '<td>' + fmt(r.rPhase, 4) + '</td>' +
      '<td>' + fmt(r.rLine, 4) + '</td>' +
      '</tr>';
  });
  html += '</tbody>';
  $('sweepTable').innerHTML = html;
}

/* ── 溫度換算 ── */
function setDefaultTempInput(r) {
  if ($('t_R1').value === '') $('t_R1').dataset.auto = fmt(r, 4);
  computeTempCorr();
}

function computeTempCorr() {
  var r1raw = $('t_R1').value;
  var R1 = r1raw === '' ? parseFloat($('t_R1').dataset.auto || 'NaN') : parseFloat(r1raw);
  var T1 = num('t_T1', 20), T2 = num('t_T2', 120);
  var material = $('t_material').value;
  if (!isFinite(R1)) { $('t_result').textContent = '—'; return; }
  var R2 = tempCorrectR(R1, T1, T2, material);
  $('t_result').textContent = fmt(R2, 4);
  if (r1raw === '') $('t_R1').placeholder = fmt(R1, 4);
}

/* ── 統一重算入口 ── */
function computeAll() {
  if (currentMode === 'quick') computeQuick(); else computeFull();
}

/* ── 事件綁定 ── */
document.addEventListener('DOMContentLoaded', function () {
  var quickIds = ['q_N0', 'q_d0', 'q_R0', 'q_step', 'q_targetVal'];
  quickIds.forEach(function (id) { $(id).addEventListener('input', computeQuick); });
  document.getElementsByName('qTarget').forEach(function (el) { el.addEventListener('change', computeQuick); });

  var fullIds = ['f_a', 'f_Nslot', 'f_coilsSlot', 'f_seriesCoils', 'f_strands',
    'f_dbare', 'f_enamel', 'f_stack', 'f_mlt', 'f_mltFactor', 'f_slotArea', 'f_temp'];
  fullIds.forEach(function (id) { $(id).addEventListener('input', computeFull); });
  $('f_conn').addEventListener('change', computeFull);
  $('f_material').addEventListener('change', computeFull);

  ['f_poles', 'f_slots', 'f_phases'].forEach(function (id) { $(id).addEventListener('input', applySuggestedSeriesCoils); });

  var tempIds = ['t_R1', 't_T1', 't_T2'];
  tempIds.forEach(function (id) { $(id).addEventListener('input', computeTempCorr); });
  $('t_material').addEventListener('change', computeTempCorr);

  document.addEventListener('mt-lang-change', computeAll);

  computeAll();
});
