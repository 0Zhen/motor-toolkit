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
  checkSlotFitBtn: { en: 'Check slot fit →',               zh: '去槽內排列工具確認塞不塞得下 →' },

  geomTitle:       { en: 'Geometry',                      zh: '幾何尺寸' },
  stackLength:     { en: 'Stack length [mm]',             zh: '疊長 [mm]' },
  mlt:             { en: 'MLT [mm] (blank=est.)',        zh: 'MLT [mm]（留空=估算）' },
  mltFactor:       { en: 'MLT factor (if blank)',        zh: 'MLT 係數（留空時用）' },
  slotArea:        { en: 'Slot area [mm²]',               zh: '槽面積 [mm²]' },

  condTitle:       { en: 'Condition',                     zh: '工況' },
  temp:            { en: 'Temperature [°C]',              zh: '溫度 [°C]' },
  fullHint:        { en: 'Generic placeholder values — replace with your own design/CAD data.',
                      zh: '通用示例值，請替換成你自己的設計/CAD 資料。' },

  validateTitle:    { en: 'Compare to Measured Sample',   zh: '樣品實測比對' },
  measuredTurns:    { en: 'Measured turns',               zh: '實測匝數' },
  measuredWire:     { en: 'Measured wire dia. [mm]',      zh: '實測線徑 [mm]' },
  measuredR:        { en: 'Measured DCR [Ω]',             zh: '實測 DCR [Ω]' },
  measuredTemp:     { en: 'Measured at temp. [°C]',       zh: '量測溫度 [°C]' },
  measuredWhich:    { en: 'Measured value is',            zh: '實測值是' },
  validatePredicted:{ en: 'Predicted (same N, d)',        zh: '理論值（同N、d）' },
  validateError:    { en: 'Error',                        zh: '誤差' },
  validateApply:    { en: 'Apply correction factor to results below', zh: '把校正係數套用到下方結果' },
  validateHint:     {
    en: 'Correction factor = measured ÷ predicted at the same temperature. When applied, it scales every DCR value below (main result and sweep table) — the underlying formula itself is unchanged.',
    zh: '校正係數 = 實測 ÷ 同溫度下的理論值。套用後會等比例放大/縮小下方所有 DCR 數值（主結果與掃描表），公式本身不會被改動。',
  },
  qValidateHint:    {
    en: 'Enter a second measured point (not the reference design above) to check whether the R = C·N/d² relationship holds for your actual winding.',
    zh: '輸入一組不同於上方基準設計的實測點，檢查 R = C·N/d² 這個關係在你的實際繞組上成不成立。',
  },
  correctionApplied:{ en: 'correction applied', zh: '已套用校正' },

  /* 公式提示（滑鼠移過去看計算式，原生 title tooltip） */
  tipQuickTheoretical: {
    en: 'Locks the wound area A₀ = N₀ × (π/4) × d₀² from the reference design, then solves for the continuous (non-integer, non-stepped) N/d that keeps that area while matching your target.',
    zh: '鎖定基準設計的結線面積 A₀ = N₀ × (π/4) × d₀²，在面積不變的前提下，解出能滿足你目標值的連續（非整數、非線徑級距）N/d。',
  },
  tipQuickN: {
    en: 'N = 4·A₀ / (π·d²), A₀ = N₀ × (π/4) × d₀² (area held constant).',
    zh: 'N = 4·A₀ / (π·d²)，A₀ = N₀ × (π/4) × d₀²（結線面積固定不變）。',
  },
  tipQuickD: {
    en: 'd = √(4·A₀ / (π·N)), A₀ = N₀ × (π/4) × d₀² (area held constant).',
    zh: 'd = √(4·A₀ / (π·N))，A₀ = N₀ × (π/4) × d₀²（結線面積固定不變）。',
  },
  tipQuickR: {
    en: 'R = C × N / d², C = R₀ × d₀² / N₀ (from the reference design). N, d snapped to an integer turn / wire step first.',
    zh: 'R = C × N / d²，C = R₀ × d₀² / N₀（取自基準設計）。N、d 會先分別四捨五入到整數匝 / 線徑級距。',
  },
  tipQuickFill: {
    en: 'Fill ratio = (N × d²) / (N₀ × d₀²) × 100% — compares the wound area to the reference design; not an absolute slot-fill %.',
    zh: '結線面積比例 = (N × d²) / (N₀ × d₀²) × 100% — 跟基準設計的結線面積相比，不是絕對槽滿率。',
  },
  tipError: {
    en: 'Error % = (measured − predicted) / predicted × 100.',
    zh: '誤差 % = (實測 − 理論值) / 理論值 × 100。',
  },
  tipCorrectionFactor: {
    en: 'Error % = (measured − predicted) / predicted × 100.\nk = measured / predicted — the optional correction factor applied below.',
    zh: '誤差 % = (實測 − 理論值) / 理論值 × 100。\nk = 實測 / 理論值 — 下方「套用校正係數」用的倍數。',
  },
  tipTempCorr: {
    en: 'R(T2) = R(T1) × (T2+T0) / (T1+T0), T0 = 234.5°C (Cu) or 225°C (Al) — assumed-zero-resistance temperature.',
    zh: 'R(T2) = R(T1) × (T2+T0) / (T1+T0)，T0 = 234.5°C（銅）或 225°C（鋁）— 推定絕對零電阻溫度。',
  },
  tipOd: {
    en: 'OD = bare copper dia. + 2 × enamel thickness (one side).',
    zh: 'OD = 裸銅徑 + 2 × 漆膜厚度（單邊）。',
  },
  tipMlt: {
    en: 'MLT = stack length × MLT factor, unless an MLT value is entered directly above.\n' +
      'The factor is an empirical estimate of end-turn length: 2.0 is just the two straight passes through the slot, anything above 2.0 is the end-turn looping over both ends of the core. Larger coil span, distributed (vs. concentrated) windings, and hand-wound (vs. preformed) coils all push it higher — typically ~2.0–2.3 for concentrated windings, ~2.4–2.8 for distributed. If you have an actual end-turn height from CAD/a real sample, enter MLT directly above instead of relying on this factor.',
    zh: 'MLT = 疊長 × MLT 係數，除非上方直接輸入 MLT 數值。\n' +
      '係數是端部繞組長度的經驗估計：2.0 只是穿過槽的來回兩段直線長度，超過2.0的部分就是兩端端部繞組繞出鐵芯外的弧長。節距越大、分佈繞（相對集中繞）、手繞（相對預成型線圈）都會讓係數變高——集中繞通常約2.0–2.3，分佈繞約2.4–2.8。如果你有CAD或實測樣品量到的實際端部高度，建議直接在上方填入MLT數值，不要依賴這個係數估算。',
  },
  tipSeriesTurns: {
    en: 'Series turns/phase = Turns/slot × Series coils/phase.',
    zh: '每相串聯匝數 = 每槽匝數 × 每相串聯圈數。',
  },
  tipFullFill: {
    en: 'Fill % = (Turns/slot × Coils/slot × Strands/turn × wire OD area) / Slot area × 100.',
    zh: '槽滿率 % = (每槽匝數 × 每槽線圈數 × 股數/匝 × 含漆膜線徑截面積) / 槽面積 × 100。',
  },
  tipFullR: {
    en: 'R_phase = ρ(T) × series turns/phase × (MLT/1000) / (strands/turn × bare copper area × parallel paths²). ρ(T) is resistivity temperature-corrected from 20°C.',
    zh: 'R_phase = ρ(T) × 每相串聯匝數 × (MLT/1000) / (股數/匝 × 裸銅截面積 × 並聯路數²)。ρ(T) 是從20°C溫度換算後的電阻率。',
  },
  tipRline:  {
    en: 'R_line = 2 × R_phase (Y connection) or (2/3) × R_phase (Δ connection).',
    zh: 'R_line = 2 × R_phase（Y接）或 (2/3) × R_phase（Δ接）。',
  },
  tipSweepTurns: {
    en: 'Max turns/slot at this wire diameter that still fit within the target fill % and slot area (floored to a whole turn).',
    zh: '在目標槽滿率與槽面積限制下，這個線徑每槽最多能繞的匝數（無條件捨去到整數）。',
  },

  formulaHint: {
    en: '💡 Labels with a dotted underline show the formula behind the number — hover over them.',
    zh: '💡 標籤底下有虛線的，滑鼠移過去可以看到背後的計算公式。',
  },
  outN:          { en: 'N (turns)',          zh: 'N（匝數）' },
  outD:          { en: 'd (wire dia.)',      zh: 'd（線徑）' },
  outDcr:        { en: 'DCR',                zh: 'DCR' },
  outOd:         { en: 'Wire OD',            zh: '線材外徑（OD）' },
  outMltUsed:    { en: 'MLT used',           zh: '採用的 MLT' },
  outSeriesTurns:{ en: 'Series turns/phase', zh: '每相串聯匝數' },
  outRphase:     { en: 'R_phase',            zh: 'R_phase（相電阻）' },
  outRline:      { en: 'R_line',             zh: 'R_line（線電阻）' },

  sweepTitle:        { en: 'Wire Diameter Sweep',          zh: '線徑掃描' },
  sweepTargetFill:   { en: 'Target fill [%]',              zh: '目標槽滿率 [%]' },
  sweepMinLabel:     { en: 'min',                          zh: '最小' },
  sweepMaxLabel:     { en: 'max',                          zh: '最大' },
  sweepStepLabel:    { en: 'step',                         zh: '級距' },
  runSweepBtn:       { en: '▶ Run Sweep',                  zh: '▶ 執行掃描' },

  tempCorrTitle:   { en: 'Temperature Correction',        zh: '溫度換算' },
  tempCorrHint:    {
    en: 'A separate utility — take any known resistance (R1/T1 default to the result above) and find its value at a different temperature (T2). Not part of the geometry calculation.',
    zh: '這是獨立的小工具——拿任何一個已知的電阻值（R1/T1 預設帶入上面算出的結果），換算到另一個溫度 T2 下的電阻，跟上面的幾何計算是分開的。',
  },
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

/* ── 跟 Slot Packing Viewer 的雙向連結 ──
 * 兩個工具都要輸入同一組線材參數（匝數/線圈數/股數/裸銅徑/漆膜厚
 * 度），用URL query string帶過去，不做成持久共用的localStorage——帶
 * 一次性的「現在這組數字」過去確認，不是要兩個工具隨時同步,使用者改
 * 其中一個也不會悄悄動到另一個分頁或下次造訪的狀態。 */
function openInSlotPacking() {
  var params = new URLSearchParams();
  params.set('turns', num('f_Nslot', 0));
  params.set('coils', num('f_coilsSlot', 1));
  params.set('strands', num('f_strands', 1));
  params.set('bareDia', num('f_dbare', 0.7));
  params.set('enamel', num('f_enamel', 0.025));
  window.open('../slot-packing/index.html?' + params.toString(), '_blank');
}
/** 從 Slot Packing Viewer 帶過來的參數：只要網址帶了任何一個就切到
 *  Full 模式（Quick 模式是單一目標值的校準介面，塞不下匝數/線圈數/股
 *  數這一整組），其餘沒帶到的欄位維持原本預設值不動。 */
function applyIncomingParams() {
  var p = new URLSearchParams(window.location.search);
  var keys = { turns: 'f_Nslot', coils: 'f_coilsSlot', strands: 'f_strands', bareDia: 'f_dbare', enamel: 'f_enamel' };
  var any = false;
  Object.keys(keys).forEach(function (k) {
    if (p.has(k)) { var v = parseFloat(p.get(k)); if (isFinite(v)) { $(keys[k]).value = v; any = true; } }
  });
  if (any) switchMode('full');
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

/* 公式提示：把一段標籤文字包成「滑鼠移過去看公式」的 span（原生 title tooltip，隨語言切換） */
function tip(label, key) {
  return '<span class="formula-tip" title="' + window.mtT(key).replace(/"/g, '&quot;') + '">' + label + '</span>';
}

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
    tip(window.mtT('outN'), 'tipQuickN') + ' = <span class="rv">' + fmt(res.nIdeal, 2) + '</span><span class="ru">turns</span><br>' +
    tip(window.mtT('outD'), 'tipQuickD') + ' = <span class="rv">' + fmt(res.dIdeal, 4) + '</span><span class="ru">mm</span>';

  $('q_practicalOut').innerHTML =
    window.mtT('outN') + ' = <span class="rv">' + res.nPractical + '</span><span class="ru">turns</span><br>' +
    window.mtT('outD') + ' = <span class="rv">' + fmt(res.dPractical, 2) + '</span><span class="ru">mm</span><br>' +
    tip(window.mtT('outDcr'), 'tipQuickR') + ' = <span class="rv">' + fmt(res.rPractical, 4) + '</span><span class="ru">Ω</span>';

  $('q_fillOut').innerHTML = '<span class="rv">' + fmt(res.fillRatioPct, 1) + '</span><span class="ru">%</span>';

  updateQuickValidation(calib);
  setDefaultTempInput(res.rPractical, 20);
}

/* 驗證點：用校準係數 C 反推一組不同的實測 (N,d) 應該有的 R，跟實測比對 */
function updateQuickValidation(calib) {
  var vN = $('qv_N').value.trim(), vd = $('qv_d').value.trim(), vR = $('qv_R').value.trim();
  if (vN === '' || vd === '' || vR === '') {
    $('qv_predicted').textContent = '—';
    $('qv_error').textContent = '—';
    return;
  }
  var Nm = parseFloat(vN), dm = parseFloat(vd), Rm = parseFloat(vR);
  if (!isFinite(Nm) || !isFinite(dm) || !isFinite(Rm) || dm <= 0) {
    $('qv_predicted').textContent = '—';
    $('qv_error').textContent = '—';
    return;
  }
  var predictedR = calib.C * Nm / (dm * dm);
  var errPct = (Rm - predictedR) / predictedR * 100;
  $('qv_predicted').textContent = fmt(predictedR, 4) + ' Ω';
  $('qv_error').textContent = (errPct >= 0 ? '+' : '') + fmt(errPct, 1) + '%';
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

/* 樣品實測比對：在量測溫度下算理論值、顯示誤差與校正係數；
   勾選「套用」時把校正係數寫進 p，供 fullSolve/sweepWireTable 使用。
   比較基準永遠用未校正的理論值，不會自我對自己比對出 0 誤差。 */
function applyValidation(p) {
  var measuredStr = $('v_measuredR').value.trim();
  if (measuredStr === '') {
    $('v_predicted').textContent = '—';
    $('v_error').textContent = '—';
    return p;
  }
  var measuredR = parseFloat(measuredStr);
  var measuredTemp = num('v_measuredTemp', p.tempC);
  var which = $('v_which').value;
  if (!isFinite(measuredR)) {
    $('v_predicted').textContent = '—';
    $('v_error').textContent = '—';
    return p;
  }
  var cmp = compareToMeasured(p, measuredR, measuredTemp, which);
  $('v_predicted').textContent = fmt(cmp.predicted, 4) + ' Ω';
  $('v_error').textContent = (cmp.errorPct >= 0 ? '+' : '') + fmt(cmp.errorPct, 1) +
    '% (k=' + fmt(cmp.correctionFactor, 3) + ')';
  if ($('v_applyCorrection').checked) p.correctionFactor = cmp.correctionFactor;
  return p;
}

function computeFull() {
  updateWindingInfo();
  var p = readFullParams();
  p = applyValidation(p);
  var res = fullSolve(p);

  var correctionNote = p.correctionFactor != null
    ? ' <span class="ru">(×' + fmt(p.correctionFactor, 3) + ' ' + window.mtT('correctionApplied') + ')</span>'
    : '';
  var odDerivation = ' <span class="sub-note">(' + fmt(p.bareDia, 3) + ' + 2×' + fmt(p.enamelThk, 3) + ')</span>';
  $('f_out').innerHTML =
    tip(window.mtT('outOd'), 'tipOd') + ' = <span class="rv">' + fmt(res.od, 4) + '</span><span class="ru">mm</span>' + odDerivation + '<br>' +
    tip(window.mtT('outMltUsed'), 'tipMlt') + ' = <span class="rv">' + fmt(res.mlt, 2) + '</span><span class="ru">mm</span><br>' +
    tip(window.mtT('outSeriesTurns'), 'tipSeriesTurns') + ' = <span class="rv">' + fmt(res.seriesTurnsTotal, 0) + '</span><br>' +
    tip(window.mtT('thFill'), 'tipFullFill') + ' = <span class="rv">' + fmt(res.fillPct, 1) + '</span><span class="ru">%</span><br>' +
    tip(window.mtT('outRphase'), 'tipFullR') + ' = <span class="rv">' + fmt(res.rPhase, 4) + '</span><span class="ru">Ω</span>' + correctionNote + '<br>' +
    tip(window.mtT('outRline'), 'tipRline') + ' = <span class="rv">' + fmt(res.rLine, 4) + '</span><span class="ru">Ω</span>' + correctionNote;

  setDefaultTempInput(res.rPhase, p.tempC);
  renderSweepTable();
}

function renderSweepTable() {
  var p = readFullParams();
  p = applyValidation(p);
  var targetFill = num('s_targetFill', 75);
  var dMin = num('s_dMin', 0.1), dMax = num('s_dMax', 1.0), dStep = num('s_dStep', 0.05);
  if (dStep <= 0 || dMax < dMin) return;

  var rows = sweepWireTable(p, targetFill, dMin, dMax, dStep);
  var html = '<thead><tr>' +
    '<th>' + window.mtT('thWire') + '</th>' +
    '<th>' + tip(window.mtT('thTurns'), 'tipSweepTurns') + '</th>' +
    '<th>' + tip(window.mtT('thFill'), 'tipFullFill') + '</th>' +
    '<th>' + tip(window.mtT('thRphase'), 'tipFullR') + '</th>' +
    '<th>' + tip(window.mtT('thRline'), 'tipRline') + '</th>' +
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

/* ── 溫度換算 ──
   R1/T1 都採「輸入框空白時用自動值」的模式：R1 自動帶入上面算出的 DCR，
   T1 自動帶入該 DCR 實際算出時用的溫度（Quick 模式沒有溫度概念，固定視為20°C）。
   兩者只要使用者自己填了值就不再跟著變，確保「換算哪個溫度的哪個電阻」永遠一致，
   不會發生 R1 已經是80°C算出來的值、T1 卻還顯示20°C的錯誤換算。 */
function setDefaultTempInput(r, baseTempC) {
  if ($('t_R1').value === '') $('t_R1').dataset.auto = fmt(r, 4);
  if ($('t_T1').value === '') $('t_T1').dataset.auto = String(baseTempC != null ? baseTempC : 20);
  computeTempCorr();
}

function computeTempCorr() {
  var r1raw = $('t_R1').value;
  var R1 = r1raw === '' ? parseFloat($('t_R1').dataset.auto || 'NaN') : parseFloat(r1raw);
  var t1raw = $('t_T1').value;
  var T1 = t1raw === '' ? parseFloat($('t_T1').dataset.auto || '20') : parseFloat(t1raw);
  var T2 = num('t_T2', 120);
  var material = $('t_material').value;
  if (!isFinite(R1)) { $('t_result').textContent = '—'; return; }
  var R2 = tempCorrectR(R1, T1, T2, material);
  $('t_result').textContent = fmt(R2, 4);
  if (r1raw === '') $('t_R1').placeholder = fmt(R1, 4);
  if (t1raw === '') $('t_T1').placeholder = fmt(T1, 0);
}

/* ── 統一重算入口 ── */
function computeAll() {
  if (currentMode === 'quick') computeQuick(); else computeFull();
}

/* ── 事件綁定 ── */
document.addEventListener('DOMContentLoaded', function () {
  var quickIds = ['q_N0', 'q_d0', 'q_R0', 'q_step', 'q_targetVal', 'qv_N', 'qv_d', 'qv_R'];
  quickIds.forEach(function (id) { $(id).addEventListener('input', computeQuick); });
  document.getElementsByName('qTarget').forEach(function (el) { el.addEventListener('change', computeQuick); });

  var fullIds = ['f_a', 'f_Nslot', 'f_coilsSlot', 'f_seriesCoils', 'f_strands',
    'f_dbare', 'f_enamel', 'f_stack', 'f_mlt', 'f_mltFactor', 'f_slotArea', 'f_temp',
    'v_measuredR', 'v_measuredTemp'];
  fullIds.forEach(function (id) { $(id).addEventListener('input', computeFull); });
  $('f_conn').addEventListener('change', computeFull);
  $('f_material').addEventListener('change', computeFull);
  $('v_which').addEventListener('change', computeFull);
  $('v_applyCorrection').addEventListener('change', computeFull);

  ['f_poles', 'f_slots', 'f_phases'].forEach(function (id) { $(id).addEventListener('input', applySuggestedSeriesCoils); });

  var tempIds = ['t_R1', 't_T1', 't_T2'];
  tempIds.forEach(function (id) { $(id).addEventListener('input', computeTempCorr); });
  $('t_material').addEventListener('change', computeTempCorr);

  document.addEventListener('mt-lang-change', computeAll);

  applyIncomingParams();
  computeAll();
});
