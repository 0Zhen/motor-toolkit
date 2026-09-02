'use strict';
/* ══════════════════════════════════════════════════════════
   Winding Designer — app.js
   state、事件 wiring、SVG 繞組展開圖繪製、i18n、初始化。
   ══════════════════════════════════════════════════════════ */

var MT_I18N = {
  configTitle:        { en: 'Winding Configuration',   zh: '繞組設定' },
  poles:               { en: 'Poles (2p)',              zh: '極數 (2p)' },
  slots:               { en: 'Slots (Q)',                zh: '槽數 (Q)' },
  layers:              { en: 'Layers',                   zh: '層數' },
  doubleLayer:         { en: 'Double layer',             zh: '雙層' },
  singleLayer:         { en: 'Single layer',             zh: '單層' },
  coilSpan:            { en: 'Coil span [slots]',        zh: '線圈節距 [槽]' },
  phaseFixedHint:      { en: 'Three-phase (m = 3) only.', zh: '固定三相 (m = 3)。' },
  legendTitle:         { en: 'Legend',                   zh: '圖例' },
  legendHint:          { en: 'Block color = phase. "+"/"−" (linear view) or ⊙/⊗ (cross-section view) = current direction (EMF phasor sign). Arcs below the linear diagram trace each coil (double layer only); coils that wrap past the last slot are not drawn.',
                          zh: '色塊代表相別。線性展開圖用「+」/「−」、馬達剖面圖用 ⊙/⊗ 代表電流方向（EMF 相量正負）。展開圖下方弧線表示線圈連接（僅雙層繞組顯示）；跨越最後一槽回捲的線圈不繪出。' },
  keyNumbersTitle:     { en: 'Key Numbers',              zh: '關鍵數值' },
  diagramTitle:        { en: 'Winding Layout',           zh: '繞組展開圖' },
  viewLinear:          { en: 'Linear',                    zh: '展開圖' },
  viewRadial:          { en: 'Cross-section',              zh: '馬達剖面' },
  spanHintFullPitch:   { en: 'Full pitch = {v} slots',   zh: '全節距 = {v} 槽' },
  warnInvalidQ:        { en: 'Slots (Q) must be an integer ≥ 3.',
                          zh: '槽數 (Q) 須為 ≥ 3 的整數。' },
  warnInvalidP:        { en: 'Poles (2p) must be a positive even integer.',
                          zh: '極數 (2p) 須為正偶數整數。' },
  warnNotDivisibleByM: { en: 'No symmetric 3-phase winding exists: slots (Q) must be a multiple of 3.',
                          zh: '無法組成對稱三相繞組：槽數 (Q) 須為 3 的倍數。' },
  warnInvalidSpan:     { en: 'Coil span must be an integer between 1 and Q−1.',
                          zh: '線圈節距須為 1 到 Q−1 之間的整數。' },
  warnSingleLayerNotConstructible: {
                          en: 'This slot/pole combination cannot form a real single-layer winding (the star-of-slots assignment degenerates). Try double layer instead.',
                          zh: '此槽極組合無法組成真正可繞製的單層繞組（星形圖分配會退化）。請改用雙層繞組。' },
  tableTitle:          { en: 'Pole–Slot Comparison — Max Fundamental Winding Factor',
                          zh: '槽極比較表 — 最大基波繞組係數' },
  slotsRangeLabel:     { en: 'Slots',                    zh: '槽數' },
  polesRangeLabel:     { en: 'Poles',                    zh: '極數' },
  tableHint:           { en: 'Click a cell to load that combination above. Red = k_w1 ≥ 0.999, orange = ≥ 0.9, green = feasible, black = no symmetric 3-phase winding exists.',
                          zh: '點擊儲存格可套用該組合到上方設定。紅 = k_w1 ≥ 0.999，橘 = ≥ 0.9，綠 = 可行，黑 = 無法組成對稱三相繞組。' },
  qSlotsPerPolePerPhase:{ en: 'Slots / pole / phase (q)', zh: '每極每相槽數 (q)' },
  tSymmetry:           { en: 'Symmetry units (t)',       zh: '對稱單元數 (t)' },
  elecStep:            { en: 'Slot electrical angle',    zh: '槽電機角' },
  fullPitchSlots:      { en: 'Full pitch',                zh: '全節距' },
  slotsUnit:           { en: 'slots',                    zh: '槽' },
  windingFactor:       { en: 'Fundamental winding factor (k_w1)', zh: '基波繞組係數 (k_w1)' },
  sidesPerPhase:       { en: 'Conductor sides / phase',  zh: '每相導體邊數' },
  phaseALabel:         { en: 'Phase A',                  zh: 'A 相' },
  phaseBLabel:         { en: 'Phase B',                  zh: 'B 相' },
  phaseCLabel:         { en: 'Phase C',                  zh: 'C 相' },
};

const PHASE_COLOR = { A: '#2563eb', B: '#dc2626', C: '#059669' };
let lastResult = null; // 最近一次成功計算的結果，供切換展開圖顯示模式時重繪

/* ══════════════════════════════════════════════════════════
   輸入變更事件
   ══════════════════════════════════════════════════════════ */

function readPQ() {
  const P = parseInt(document.getElementById('in_P').value, 10);
  const Q = parseInt(document.getElementById('in_Q').value, 10);
  return { P: isNaN(P) ? 0 : P, Q: isNaN(Q) ? 0 : Q };
}

function updateSpanHint(Q, P) {
  const hint = document.getElementById('spanHint');
  const fp = P > 0 ? Q / P : NaN;
  hint.textContent = isFinite(fp) ? mtT('spanHintFullPitch').replace('{v}', fp.toFixed(2)) : '—';
}

/** Poles 或 Slots 變更：雙層時重算建議節距（覆蓋使用者先前輸入） */
function onPQChange() {
  const { P, Q } = readPQ();
  if (document.getElementById('in_layers').value === 'double' && P > 0 && Q > 0) {
    document.getElementById('in_span').value = suggestSpan(Q, P);
  }
  updateSpanHint(Q, P);
  update();
}

/** Coil span 使用者手動變更：只重算，不覆蓋 */
function onSpanChange() { update(); }

/** 切換單層／雙層：顯示或隱藏節距欄，雙層時重算建議節距 */
function onLayersChange() {
  const isDouble = document.getElementById('in_layers').value === 'double';
  document.getElementById('spanRow').style.display = isDouble ? 'grid' : 'none';
  const { P, Q } = readPQ();
  if (isDouble && P > 0 && Q > 0) {
    document.getElementById('in_span').value = suggestSpan(Q, P);
  }
  updateSpanHint(Q, P);
  update();
}


/* ══════════════════════════════════════════════════════════
   結果文字
   ══════════════════════════════════════════════════════════ */

function renderKeyNumbers(result) {
  function row(label, val, unit) {
    return '<div>' + label + ': <span class="rv">' + val + '</span><span class="ru">' + unit + '</span></div>';
  }
  const q = result.q.den === 1 ? String(result.q.num) : (result.q.num + '/' + result.q.den);
  const el = document.getElementById('keyNumbersOut');
  el.innerHTML =
    row(mtT('qSlotsPerPolePerPhase'), q, '') +
    row(mtT('tSymmetry'), result.t, '') +
    row(mtT('elecStep'), result.elecStepDeg.toFixed(2), '°') +
    row(mtT('fullPitchSlots'), result.fullPitchSlots.toFixed(2), ' ' + mtT('slotsUnit')) +
    row(mtT('windingFactor'), result.windingFactor.toFixed(4), '') +
    row(mtT('sidesPerPhase'),
        'A=' + result.sidesPerPhase.A + '  B=' + result.sidesPerPhase.B + '  C=' + result.sidesPerPhase.C, '');
}

function renderLegend() {
  const wrap = document.getElementById('wdLegend');
  wrap.innerHTML = '';
  ['A', 'B', 'C'].forEach(function (ph) {
    const row = document.createElement('div');
    row.className = 'wd-legend-item';
    row.innerHTML = '<span class="wd-legend-dot" style="background:' + PHASE_COLOR[ph] + '"></span><span>' +
      mtT('phase' + ph + 'Label') + '</span>';
    wrap.appendChild(row);
  });
}


/* ══════════════════════════════════════════════════════════
   SVG 繞組展開圖
   ══════════════════════════════════════════════════════════ */

function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function textEl(x, y, str, attrs) {
  const t = svgEl('text', Object.assign({
    x: x, y: y, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'font-size': 9,
  }, attrs || {}));
  t.textContent = str;
  return t;
}

function renderLinearDiagram(result) {
  const svg = document.getElementById('wdSvg');
  svg.innerHTML = '';

  const Q = result.Q;
  const isDouble = result.slots[0].bottom !== null;
  const slotW = 30, gapW = 10, pitch = slotW + gapW;
  const blockH = isDouble ? 34 : 60;
  const marginTop = 8, labelGap = 4, labelH = 10;
  const W = result.span || 0;
  const arcH = isDouble ? Math.min(90, 26 + (W - 1) * 8) : 0;

  const width = Q * pitch + gapW;
  const bodyTop = marginTop;
  const bodyBottom = bodyTop + blockH * (isDouble ? 2 : 1);
  const labelY = bodyBottom + labelGap + labelH;
  const arcTop = labelY + 8;
  const height = isDouble ? arcTop + arcH + 6 : labelY + 6;

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

  result.slots.forEach(function (s, k) {
    const x = gapW / 2 + k * pitch;
    const cx = x + slotW / 2;

    if (isDouble) {
      svg.appendChild(svgEl('rect', {
        x: x, y: bodyTop, width: slotW, height: blockH,
        fill: PHASE_COLOR[s.top.phase], opacity: 0.9, rx: 2,
      }));
      svg.appendChild(textEl(cx, bodyTop + blockH / 2 + 3, s.top.phase + (s.top.sign > 0 ? '+' : '−'),
        { fill: '#fff', 'font-weight': 700 }));

      svg.appendChild(svgEl('rect', {
        x: x, y: bodyTop + blockH, width: slotW, height: blockH,
        fill: PHASE_COLOR[s.bottom.phase], opacity: 0.55, rx: 2,
      }));
      svg.appendChild(textEl(cx, bodyTop + blockH * 1.5 + 3, s.bottom.phase + (s.bottom.sign > 0 ? '+' : '−'),
        { fill: '#fff', 'font-weight': 700 }));
    } else {
      svg.appendChild(svgEl('rect', {
        x: x, y: bodyTop, width: slotW, height: blockH,
        fill: PHASE_COLOR[s.top.phase], opacity: 0.9, rx: 2,
      }));
      svg.appendChild(textEl(cx, bodyTop + blockH / 2 + 3, s.top.phase + (s.top.sign > 0 ? '+' : '−'),
        { fill: '#fff', 'font-weight': 700 }));
    }

    svg.appendChild(textEl(cx, labelY, String(k + 1), { fill: 'var(--text3)', 'font-size': 8 }));

    if (k > 0) {
      const lineX = x - gapW / 2;
      svg.appendChild(svgEl('line', {
        x1: lineX, y1: bodyTop - 2, x2: lineX, y2: bodyBottom + 2,
        stroke: 'var(--border)', 'stroke-width': 1,
      }));
    }
  });

  if (isDouble) {
    for (let k = 0; k < Q; k++) {
      const srcK = k - W;
      if (srcK < 0) continue; // 回捲到頭尾的線圈不繪製（避免圖面混亂）
      const s = result.slots[k];
      const x1 = gapW / 2 + srcK * pitch + slotW / 2;
      const x2 = gapW / 2 + k * pitch + slotW / 2;
      const path = 'M ' + x1 + ' ' + arcTop + ' C ' + x1 + ' ' + (arcTop + arcH) + ', ' +
                   x2 + ' ' + (arcTop + arcH) + ', ' + x2 + ' ' + arcTop;
      svg.appendChild(svgEl('path', {
        d: path, fill: 'none', stroke: PHASE_COLOR[s.bottom.phase], 'stroke-width': 1.3, opacity: 0.55,
      }));
    }
  }
}


/* ══════════════════════════════════════════════════════════
   徑向（馬達剖面）繞組展開圖
   ══════════════════════════════════════════════════════════ */

function polarPt(cx, cy, r, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 環形扇區路徑（一個槽的一個繞組層），角度跨度恆 < 180°，故 large-arc-flag 固定 0 */
function annularSectorPath(cx, cy, rInner, rOuter, startDeg, endDeg) {
  const p1 = polarPt(cx, cy, rOuter, startDeg);
  const p2 = polarPt(cx, cy, rOuter, endDeg);
  const p3 = polarPt(cx, cy, rInner, endDeg);
  const p4 = polarPt(cx, cy, rInner, startDeg);
  return 'M ' + p1.x + ' ' + p1.y +
    ' A ' + rOuter + ' ' + rOuter + ' 0 0 1 ' + p2.x + ' ' + p2.y +
    ' L ' + p3.x + ' ' + p3.y +
    ' A ' + rInner + ' ' + rInner + ' 0 0 0 ' + p4.x + ' ' + p4.y +
    ' Z';
}

/** 電流方向符號：⊙ = 流出（+），⊗ = 流入（−），為剖面圖慣用符號 */
function currentDirSymbol(svg, cx, cy, r, sign) {
  const color = '#fff';
  if (sign > 0) {
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: color, 'stroke-width': 1.1 }));
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r * 0.32, fill: color }));
  } else {
    const k = r * 0.72;
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: color, 'stroke-width': 1.1 }));
    svg.appendChild(svgEl('line', { x1: cx - k, y1: cy - k, x2: cx + k, y2: cy + k, stroke: color, 'stroke-width': 1.1 }));
    svg.appendChild(svgEl('line', { x1: cx - k, y1: cy + k, x2: cx + k, y2: cy - k, stroke: color, 'stroke-width': 1.1 }));
  }
}

function renderRadialDiagram(result) {
  const svg = document.getElementById('wdSvg');
  svg.innerHTML = '';

  const Q = result.Q;
  const isDouble = result.slots[0].bottom !== null;
  const size = 520;
  const cx = size / 2, cy = size / 2;
  const IRON = '#94a3b8', IRON_STROKE = '#475569';
  const rYoke = 222, rOuter = 190, rMid = isDouble ? 150 : 170, rInner = 110, rRotor = 78;
  const step = 360 / Q;
  const gapDeg = Math.min(4, step * 0.16); // 槽間留白角度（露出鐵芯，形成齒）

  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);

  // 定子鐵芯本體（軛部＋齒）：先畫實心圓盤，槽扇形與槽間隙分別覆蓋出槽口與齒
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: rYoke, fill: IRON, stroke: IRON_STROKE, 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: rInner, fill: 'var(--bg)', stroke: IRON_STROKE, 'stroke-width': 1 }));

  // 轉子（僅示意，無功能意義）與氣隙
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: rRotor, fill: IRON, opacity: 0.45, stroke: IRON_STROKE, 'stroke-width': 1.5 }));
  svg.appendChild(textEl(cx, cy + 3, 'rotor', { fill: 'var(--text3)', 'font-size': 9 }));

  result.slots.forEach(function (s, k) {
    const a0 = -90 + k * step + gapDeg / 2;
    const a1 = -90 + (k + 1) * step - gapDeg / 2;
    const aMid = (a0 + a1) / 2;

    if (isDouble) {
      svg.appendChild(svgEl('path', {
        d: annularSectorPath(cx, cy, rMid, rOuter, a0, a1),
        fill: PHASE_COLOR[s.top.phase], opacity: 0.9,
      }));
      const pOuter = polarPt(cx, cy, (rMid + rOuter) / 2, aMid);
      currentDirSymbol(svg, pOuter.x, pOuter.y, Math.max(4, step * 1.4), s.top.sign);

      svg.appendChild(svgEl('path', {
        d: annularSectorPath(cx, cy, rInner, rMid, a0, a1),
        fill: PHASE_COLOR[s.bottom.phase], opacity: 0.6,
      }));
      const pInner = polarPt(cx, cy, (rInner + rMid) / 2, aMid);
      currentDirSymbol(svg, pInner.x, pInner.y, Math.max(4, step * 1.4), s.bottom.sign);
    } else {
      svg.appendChild(svgEl('path', {
        d: annularSectorPath(cx, cy, rInner, rMid, a0, a1),
        fill: PHASE_COLOR[s.top.phase], opacity: 0.9,
      }));
      const pMid = polarPt(cx, cy, (rInner + rMid) / 2, aMid);
      currentDirSymbol(svg, pMid.x, pMid.y, Math.max(4, step * 1.6), s.top.sign);
    }

    const pLabel = polarPt(cx, cy, rYoke + 14, aMid);
    svg.appendChild(textEl(pLabel.x, pLabel.y + 3, String(k + 1), { fill: 'var(--text3)', 'font-size': 8 }));
  });
}


/** 目前選擇的展開圖顯示模式：'linear' | 'radial' */
let diagramView = 'linear';

function renderDiagram(result) {
  if (diagramView === 'radial') renderRadialDiagram(result);
  else renderLinearDiagram(result);
}

function setDiagramView(view) {
  diagramView = view;
  document.getElementById('viewLinearBtn').classList.toggle('active', view === 'linear');
  document.getElementById('viewRadialBtn').classList.toggle('active', view === 'radial');
  if (lastResult) renderDiagram(lastResult);
}


/* ══════════════════════════════════════════════════════════
   主更新函式
   ══════════════════════════════════════════════════════════ */

function update() {
  const { P, Q } = readPQ();
  const layers = document.getElementById('in_layers').value;
  const span = layers === 'double' ? parseInt(document.getElementById('in_span').value, 10) : undefined;

  const result = computeWinding({ Q: Q, P: P, layers: layers, span: span });

  const warnEl  = document.getElementById('feasWarning');
  const cardsEl = document.getElementById('resultCards');

  if (!result.feasible) {
    const key = 'warn' + result.reason.charAt(0).toUpperCase() + result.reason.slice(1);
    const msg = MT_I18N[key] ? mtT(key) : result.reason;
    warnEl.textContent = '⚠ ' + msg;
    warnEl.style.display = 'block';
    cardsEl.style.display = 'none';
    lastResult = null;
    return;
  }

  warnEl.style.display = 'none';
  cardsEl.style.display = 'flex';
  lastResult = result;
  renderKeyNumbers(result);
  renderDiagram(result);
}


/* ══════════════════════════════════════════════════════════
   槽極比較表
   ══════════════════════════════════════════════════════════ */

function tableCellColor(value) {
  if (value >= 0.999) return { bg: '#ef4444', fg: '#fff' };
  if (value >= 0.9)   return { bg: '#f59e0b', fg: '#fff' };
  return { bg: '#84cc16', fg: '#1a1d23' };
}

function renderTable() {
  const qMin = parseInt(document.getElementById('tblQMin').value, 10) || 3;
  const qMax = parseInt(document.getElementById('tblQMax').value, 10) || 21;
  const pMin = parseInt(document.getElementById('tblPMin').value, 10) || 4;
  const pMax = parseInt(document.getElementById('tblPMax').value, 10) || 16;

  const slotsList = [];
  for (let Q = Math.max(3, Math.ceil(qMin / 3) * 3); Q <= qMax; Q += 3) slotsList.push(Q);
  const polesList = [];
  for (let P = Math.max(2, Math.ceil(pMin / 2) * 2); P <= pMax; P += 2) polesList.push(P);

  let html = '<tr><th></th>' + polesList.map(function (P) { return '<th>' + P + '</th>'; }).join('') + '</tr>';
  slotsList.forEach(function (Q) {
    html += '<tr><th>' + Q + '</th>';
    polesList.forEach(function (P) {
      const r = bestWindingFactor(Q, P);
      if (!r.feasible) {
        html += '<td class="wd-cell-na"></td>';
      } else {
        const c = tableCellColor(r.value);
        const title = r.layers + (r.span ? (' span=' + r.span) : '');
        html += '<td class="wd-cell" style="background:' + c.bg + ';color:' + c.fg + '" ' +
          'title="' + title + '" onclick="loadCombo(' + Q + ',' + P + ')">' + r.value.toFixed(3) + '</td>';
      }
    });
    html += '</tr>';
  });
  document.getElementById('wdTable').innerHTML = html;
}

/** 點擊比較表儲存格：把該槽極組合套用到上方設定並捲動過去 */
function loadCombo(Q, P) {
  document.getElementById('in_Q').value = Q;
  document.getElementById('in_P').value = P;
  onPQChange();
  const cards = document.getElementById('resultCards');
  (cards.style.display !== 'none' ? cards : document.getElementById('feasWarning'))
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ══════════════════════════════════════════════════════════
   語言切換
   ══════════════════════════════════════════════════════════ */
document.addEventListener('mt-lang-change', function () {
  renderLegend();
  update();
});


/* ══════════════════════════════════════════════════════════
   初始化
   ══════════════════════════════════════════════════════════ */
renderLegend();
onLayersChange(); // 依預設值（雙層）設定節距欄可見性、建議節距，並觸發第一次 update()
renderTable();
