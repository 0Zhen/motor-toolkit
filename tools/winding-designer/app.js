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
  legendHint:          { en: 'Block color = phase. "+"/"−" (linear view) or ⊙/⊗ (cross-section view) = current direction (EMF phasor sign). Single-layer windings are drawn as a coil symbol per tooth (concentrated-winding style); double-layer windings merge consecutive same-phase, same-direction slots into one arc/block (distributed-winding style). The cross-section\'s inner ring shows the rotor\'s alternating N/S poles (illustrative only). Curves/brackets trace coils wired in series (all coils in a single parallel path — no wave-winding reordering or multi-path splitting yet); a tooth whose adjacent same-phase partner would wrap past the first/last slot is left unbracketed. In the cross-section view each phase gets its own bus radius (A innermost, C outermost) so all three can be shown at once without overlapping each other; the "max overlapping" readout below the phase filter shows how many of that phase\'s own segments still stack on top of each other.',
                          zh: '色塊代表相別。線性展開圖用「+」/「−」、馬達剖面圖用 ⊙/⊗ 代表電流方向（EMF 相量正負）。單層繞組在每齒畫成線圈符號（集中繞組風格）；雙層繞組把相鄰同相同方向的槽合併成一段弧／色塊（分佈繞組風格）。馬達剖面圖內圈環為轉子 N/S 極示意（僅示意，無實際磁極角位置意義）。弧線／跳線表示線圈的串接順序（目前只支援單一 parallel path，未處理 wave 繞法重排或多路分流）；若相鄰同相的配對齒剛好跨過頭尾槽，則不畫跳線。馬達剖面圖中三相各自用不同的匯流半徑（A 最內、C 最外），所以三相可以同時顯示不互相重疊；下方「最大重疊」數字顯示該相自己的線段裡最多有幾段疊在一起。' },
  keyNumbersTitle:     { en: 'Key Numbers',              zh: '關鍵數值' },
  diagramTitle:        { en: 'Winding Layout',           zh: '繞組展開圖' },
  viewLinear:          { en: 'Linear',                    zh: '展開圖' },
  viewRadial:          { en: 'Cross-section',              zh: '馬達剖面' },
  phaseFilterLabel:    { en: 'Coil path:',                 zh: '線圈接線：' },
  phaseAll:            { en: 'All',                         zh: '全部' },
  overlapLabel:        { en: 'Max overlapping segments (same phase)', zh: '最大重疊段數（同相）' },
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

/** 齒形路徑（單層集中繞組用）：頂部平、底部收尖，示意實體齒的輪廓 */
function toothPath(x, top, bottom, w) {
  const h = bottom - top;
  return 'M ' + x + ' ' + top +
    ' L ' + (x + w) + ' ' + top +
    ' L ' + (x + w * 0.78) + ' ' + (top + h * 0.55) +
    ' L ' + (x + w / 2) + ' ' + bottom +
    ' L ' + (x + w * 0.22) + ' ' + (top + h * 0.55) +
    ' Z';
}

function renderLinearDiagram(result) {
  const svg = document.getElementById('wdSvg');
  svg.innerHTML = '';
  renderWireOverlapInfo(null); // 重疊提示僅在馬達剖面圖顯示

  const Q = result.Q;
  const isDouble = result.slots[0].bottom !== null;
  const slotW = 30, gapW = 10, pitch = slotW + gapW;
  const blockH = isDouble ? 34 : 60;
  const labelGap = 4, labelH = 10;
  const frontAreaH = isDouble ? 120 : 56, rearAreaH = isDouble ? 120 : 0;
  const marginTop = frontAreaH + 8;
  const slotX = function (k) { return gapW / 2 + k * pitch + slotW / 2; };

  const width = Q * pitch + gapW;
  const bodyTop = marginTop;
  const bodyBottom = bodyTop + blockH * (isDouble ? 2 : 1);
  const labelY = bodyBottom + labelGap + labelH;
  const rearTop = labelY + 8;
  const height = isDouble ? rearTop + rearAreaH + 6 : labelY + 6;

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

      const lineX = x - gapW / 2;
      if (k > 0) {
        svg.appendChild(svgEl('line', {
          x1: lineX, y1: bodyTop - 2, x2: lineX, y2: bodyBottom + 2,
          stroke: 'var(--border)', 'stroke-width': 1,
        }));
      }
    } else {
      // 齒形輪廓 + 齒尖顏色 + 頂部入/出線符號（集中繞組風格）
      svg.appendChild(svgEl('path', {
        d: toothPath(x, bodyTop, bodyBottom, slotW),
        fill: PHASE_COLOR[s.top.phase], 'fill-opacity': 0.22,
        stroke: PHASE_COLOR[s.top.phase], 'stroke-width': 1.4,
      }));
      svg.appendChild(textEl(cx, bodyTop + blockH * 0.74, s.top.phase + (s.top.sign > 0 ? '+' : '−'),
        { fill: PHASE_COLOR[s.top.phase], 'font-weight': 700 }));
      currentDirSymbol(svg, cx, bodyTop, 5, s.top.sign);
    }

    svg.appendChild(textEl(cx, labelY, String(k + 1), { fill: 'var(--text3)', 'font-size': 8 }));
  });

  if (isDouble) {
    const chains = buildPhaseChains(result);
    ['A', 'B', 'C'].forEach(function (phase) {
      if (phaseFilter !== 'all' && phaseFilter !== phase) return;
      const wp = phaseWaypoints(chains[phase]);
      const dimmed = phaseFilter !== 'all'; // 單相模式下其餘相已被濾掉，此處不用再淡化
      const opacity = dimmed ? 0.85 : 0.5;
      for (let i = 0; i < wp.length - 1; i++) {
        const front = i % 2 === 0; // 交替 front（去程，上方）／rear（回程接下一圈，下方）
        const x1 = slotX(wp[i]), x2 = slotX(wp[i + 1]);
        const span = Math.abs(wp[i + 1] - wp[i]);
        const h = Math.min(front ? frontAreaH - 10 : rearAreaH - 10, 16 + span * 6);
        const path = front
          ? 'M ' + x1 + ' ' + bodyTop + ' C ' + x1 + ' ' + (bodyTop - h) + ', ' + x2 + ' ' + (bodyTop - h) + ', ' + x2 + ' ' + bodyTop
          : 'M ' + x1 + ' ' + rearTop + ' C ' + x1 + ' ' + (rearTop + h) + ', ' + x2 + ' ' + (rearTop + h) + ', ' + x2 + ' ' + rearTop;
        svg.appendChild(svgEl('path', {
          d: path, fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity,
        }));
      }
    });
  } else {
    // 單層：相鄰同相配對齒，頂部用直角跳線橋接（不與齒形重疊，留在 front 區）
    const wireTop = bodyTop - (frontAreaH - 16);
    buildSingleLayerPairs(result).forEach(function (pair) {
      if (phaseFilter !== 'all' && phaseFilter !== pair.phase) return;
      const opacity = phaseFilter !== 'all' ? 0.9 : 0.6;
      const x1 = slotX(pair.aK), x2 = slotX(pair.bK);
      const d = 'M ' + x1 + ' ' + (bodyTop - 6) + ' L ' + x1 + ' ' + wireTop +
                ' L ' + x2 + ' ' + wireTop + ' L ' + x2 + ' ' + (bodyTop - 6);
      svg.appendChild(svgEl('path', {
        d: d, fill: 'none', stroke: PHASE_COLOR[pair.phase], 'stroke-width': 1.5, opacity: opacity,
      }));
    });
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

/**
 * 線圈連接線（直角版）：從來源槽徑向出線到共用匯流半徑 busR，沿該半徑走
 * 一段真圓弧到目的槽的角度，再徑向收回槽緣——呈「出線／匯流排／收線」
 * 的直角走線，明確落在定子外側，不與定子本體重疊。
 */
function radialConnectionPath(cx, cy, r0, aStart, aEnd, busR) {
  const delta = ((aEnd - aStart + 540) % 360) - 180; // 正規化到 (-180,180]，取較短角距方向
  const aEndShort = aStart + delta;
  const sweepFlag = delta >= 0 ? 1 : 0;
  const p0 = polarPt(cx, cy, r0, aStart);
  const p0b = polarPt(cx, cy, busR, aStart);
  const p1b = polarPt(cx, cy, busR, aEndShort);
  const p1 = polarPt(cx, cy, r0, aEndShort);
  return 'M ' + p0.x + ' ' + p0.y + ' L ' + p0b.x + ' ' + p0b.y +
    ' A ' + busR + ' ' + busR + ' 0 0 ' + sweepFlag + ' ' + p1b.x + ' ' + p1b.y +
    ' L ' + p1.x + ' ' + p1.y;
}

/** 把某相的線圈接線路徑序列轉成角度區間 [lo, hi]（走短邊方向，未處理跨越頭尾接縫的邊界情形） */
function hopIntervals(wp, slotAngle) {
  const intervals = [];
  for (let i = 0; i < wp.length - 1; i++) {
    const aStart = slotAngle(wp[i]), aEndRaw = slotAngle(wp[i + 1]);
    const delta = ((aEndRaw - aStart + 540) % 360) - 180;
    const aEnd = aStart + delta;
    intervals.push([Math.min(aStart, aEnd), Math.max(aStart, aEnd)]);
  }
  return intervals;
}

/** 掃描線法算出同一相在同一匯流圈上，最多同時有幾段接線互相重疊 */
function maxOverlapDepth(intervals) {
  const events = [];
  intervals.forEach(function (iv) { events.push([iv[0], 1]); events.push([iv[1], -1]); });
  events.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  let cur = 0, max = 0;
  events.forEach(function (e) { cur += e[1]; if (cur > max) max = cur; });
  return max;
}

/** 顯示（或隱藏）各相接線最大重疊段數的小提示 */
function renderWireOverlapInfo(overlap) {
  const el = document.getElementById('wireOverlapInfo');
  if (!el) return;
  if (!overlap) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = mtT('overlapLabel') + ': ' +
    ['A', 'B', 'C'].map(function (ph) {
      return '<span style="color:' + PHASE_COLOR[ph] + ';font-weight:700">' + ph + '×' + overlap[ph] + '</span>';
    }).join('　');
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

/** 把連續槽依「同相同方向」合併成一組（僅比對相鄰，不處理跨越槽1的回捲合併） */
function groupConsecutiveSlots(Q, sideAt) {
  const groups = [];
  let i = 0;
  while (i < Q) {
    const cur = sideAt(i);
    let j = i;
    while (j + 1 < Q) {
      const nxt = sideAt(j + 1);
      if (nxt.phase === cur.phase && nxt.sign === cur.sign) j++;
      else break;
    }
    groups.push({ startK: i, endK: j, phase: cur.phase, sign: cur.sign });
    i = j + 1;
  }
  return groups;
}

/**
 * 單層（集中繞組）齒配對：把連續同相（不分正負）的齒兩兩配成一個線圈單元
 * （相鄰齒一正一負，頂部用跳線橋接）。落單的齒（該相連續段長度為奇數時
 * 的最後一顆）不配對，不畫跳線。
 */
function buildSingleLayerPairs(result) {
  const Q = result.Q;
  const runs = groupConsecutiveSlots(Q, function (k) { return { phase: result.slots[k].top.phase, sign: 0 }; });
  const pairs = [];
  runs.forEach(function (run) {
    for (let k = run.startK; k + 1 <= run.endK; k += 2) {
      pairs.push({ aK: k, bK: k + 1, phase: run.phase });
    }
  });
  return pairs;
}

/** 集中繞組（單層）線圈符號：齒上的旗形線圈，斜線代表繞線圈數，中心疊方向符號 */
function drawConcentratedCoil(svg, cx, cy, aMid, rIn, rOut, phase, sign, symR) {
  const rMid = (rIn + rOut) / 2;
  const p = polarPt(cx, cy, rMid, aMid);
  const len = (rOut - rIn) * 0.92;
  const wid = Math.max(12, len * 0.5);
  const g = svgEl('g', { transform: 'translate(' + p.x + ',' + p.y + ') rotate(' + (aMid + 90) + ')' });
  g.appendChild(svgEl('rect', {
    x: -wid / 2, y: -len / 2, width: wid, height: len, rx: wid * 0.3,
    fill: PHASE_COLOR[phase], opacity: 0.28, stroke: PHASE_COLOR[phase], 'stroke-width': 1.4,
  }));
  const stripes = 4;
  for (let i = 1; i <= stripes; i++) {
    const yy = -len / 2 + (len * i) / (stripes + 1);
    g.appendChild(svgEl('line', {
      x1: -wid / 2 + 2, y1: yy - wid * 0.32, x2: wid / 2 - 2, y2: yy + wid * 0.32,
      stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: 0.8,
    }));
  }
  svg.appendChild(g);
  currentDirSymbol(svg, p.x, p.y, symR, sign);
}

function renderRadialDiagram(result) {
  const svg = document.getElementById('wdSvg');
  svg.innerHTML = '';

  const Q = result.Q, P = result.P;
  const isDouble = result.slots[0].bottom !== null;
  const size = 600;
  const cx = size / 2, cy = size / 2;
  const IRON = '#94a3b8', IRON_STROKE = '#475569';
  const rYoke = 200, rOuter = 175, rMid = isDouble ? 140 : 160, rInner = 100, rRotor = 70, rRotorCore = 56;
  const step = 360 / Q;
  const gapDeg = Math.min(7, step * 0.22); // 槽間留白角度（露出鐵芯，形成齒），比例隨槽數自動縮小避免槽被吃光

  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);

  // 定子鐵芯本體（軛部＋齒）：先畫實心圓盤，槽扇形與槽間隙分別覆蓋出槽口與齒
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: rYoke, fill: IRON, stroke: IRON_STROKE, 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: rInner, fill: 'var(--bg)', stroke: IRON_STROKE, 'stroke-width': 1 }));

  // 轉子磁極環（僅示意：交替 N/S，無實際磁極角位置意義）＋轉子鐵芯與氣隙
  for (let pi = 0; pi < P; pi++) {
    const pa0 = -90 + pi * (360 / P) + 1;
    const pa1 = -90 + (pi + 1) * (360 / P) - 1;
    svg.appendChild(svgEl('path', {
      d: annularSectorPath(cx, cy, rRotorCore, rRotor, pa0, pa1),
      fill: pi % 2 === 0 ? '#f3b4c4' : '#a9c6f0',
    }));
  }
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: rRotorCore, fill: IRON, opacity: 0.45, stroke: IRON_STROKE, 'stroke-width': 1.5 }));
  svg.appendChild(textEl(cx, cy + 3, 'rotor', { fill: 'var(--text3)', 'font-size': 9 }));

  // 方向符號半徑：依實際像素（徑向band厚度、弧長）換算，避免符號過大互相蓋住
  const arcAtMid = (rOuter - rInner) / 2 * (step - gapDeg) * Math.PI / 180;
  function symbolR(bandThk) {
    return Math.max(3, Math.min(9, Math.min(bandThk, arcAtMid) * 0.32));
  }

  if (isDouble) {
    // 雙層：同相同方向的相鄰槽合併成一組，畫成一段連續弧（仿 JMAG 風格），
    // 組內不再顯示每槽的齒縫，只在組中心疊一個方向符號
    const groupA0 = function (startK) { return -90 + startK * step + gapDeg / 2; };
    const groupA1 = function (endK) { return -90 + (endK + 1) * step - gapDeg / 2; };

    groupConsecutiveSlots(Q, function (k) { return result.slots[k].top; }).forEach(function (g) {
      const a0 = groupA0(g.startK), a1 = groupA1(g.endK);
      svg.appendChild(svgEl('path', { d: annularSectorPath(cx, cy, rMid, rOuter, a0, a1), fill: PHASE_COLOR[g.phase], opacity: 0.9 }));
      const p = polarPt(cx, cy, (rMid + rOuter) / 2, (a0 + a1) / 2);
      currentDirSymbol(svg, p.x, p.y, symbolR(rOuter - rMid), g.sign);
    });
    groupConsecutiveSlots(Q, function (k) { return result.slots[k].bottom; }).forEach(function (g) {
      const a0 = groupA0(g.startK), a1 = groupA1(g.endK);
      svg.appendChild(svgEl('path', { d: annularSectorPath(cx, cy, rInner, rMid, a0, a1), fill: PHASE_COLOR[g.phase], opacity: 0.6 }));
      const p = polarPt(cx, cy, (rInner + rMid) / 2, (a0 + a1) / 2);
      currentDirSymbol(svg, p.x, p.y, symbolR(rMid - rInner), g.sign);
    });
  } else {
    // 單層（集中繞組）：每齒一個線圈旗形符號
    result.slots.forEach(function (s, k) {
      const a0 = -90 + k * step + gapDeg / 2;
      const a1 = -90 + (k + 1) * step - gapDeg / 2;
      const aMid = (a0 + a1) / 2;
      drawConcentratedCoil(svg, cx, cy, aMid, rInner, rOuter, s.top.phase, s.top.sign, symbolR(rOuter - rInner));
    });
  }

  // 線圈連接弧線：定子外側，三相各用不同匯流半徑（由內而外 A→B→C），
  // 彼此不會疊在同一圈上；選定單一相時其餘相調淡，方便專注看該相走線。
  // 雙層依 buildPhaseChains 把整條 path 串起來；單層依 buildSingleLayerPairs
  // 把相鄰配對齒橋接起來，兩者共用同一套 busR／方向邏輯。
  const slotAngle = function (k) { return -90 + k * step + step / 2; };
  const busR = { A: rYoke + 22, B: rYoke + 38, C: rYoke + 54 };
  const overlap = {};

  if (isDouble) {
    const chains = buildPhaseChains(result);
    ['A', 'B', 'C'].forEach(function (phase) {
      const wp = phaseWaypoints(chains[phase]);
      overlap[phase] = maxOverlapDepth(hopIntervals(wp, slotAngle));
      const dimmed = phaseFilter !== 'all' && phaseFilter !== phase;
      const opacity = dimmed ? 0.15 : 0.8;
      for (let i = 0; i < wp.length - 1; i++) {
        svg.appendChild(svgEl('path', {
          d: radialConnectionPath(cx, cy, rYoke + 6, slotAngle(wp[i]), slotAngle(wp[i + 1]), busR[phase]),
          fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity,
        }));
      }
    });
  } else {
    const pairs = buildSingleLayerPairs(result);
    ['A', 'B', 'C'].forEach(function (phase) {
      const phPairs = pairs.filter(function (p) { return p.phase === phase; });
      const intervals = phPairs.map(function (p) {
        const a = slotAngle(p.aK), b = slotAngle(p.bK);
        return [Math.min(a, b), Math.max(a, b)];
      });
      overlap[phase] = maxOverlapDepth(intervals);
      const dimmed = phaseFilter !== 'all' && phaseFilter !== phase;
      const opacity = dimmed ? 0.15 : 0.8;
      phPairs.forEach(function (p) {
        svg.appendChild(svgEl('path', {
          d: radialConnectionPath(cx, cy, rYoke + 6, slotAngle(p.aK), slotAngle(p.bK), busR[phase]),
          fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity,
        }));
      });
    });
  }
  renderWireOverlapInfo(overlap);

  // 槽號放在所有接線匯流圈之外，避免被徑向出線／收線的線段蓋住
  const labelR = busR.C + 16;
  result.slots.forEach(function (s, k) {
    const a0 = -90 + k * step + gapDeg / 2;
    const a1 = -90 + (k + 1) * step - gapDeg / 2;
    const aMid = (a0 + a1) / 2;
    const pLabel = polarPt(cx, cy, labelR, aMid);
    svg.appendChild(textEl(pLabel.x, pLabel.y + 3, String(k + 1), { fill: 'var(--text3)', 'font-size': 8 }));
  });
}


/** 目前選擇的展開圖顯示模式：'linear' | 'radial' */
let diagramView = 'linear';
/** 目前選擇的線圈接線相別濾鏡：'all' | 'A' | 'B' | 'C'（僅雙層繞組有作用） */
let phaseFilter = 'all';

function renderDiagram(result) {
  if (diagramView === 'radial') renderRadialDiagram(result);
  else renderLinearDiagram(result);
}

/**
 * 線圈接線濾鏡列可見性：雙層兩種視圖都有接線；單層目前只有展開圖
 * （馬達剖面圖的單層是旗形符號，尚未加接線串接，見專案記憶）。
 */
function updatePhaseFilterVisibility() {
  // 兩種層數、兩種視圖現在都有線圈接線可濾，只要有可行結果就顯示濾鏡列
  document.getElementById('phaseFilterRow').style.display = lastResult ? 'flex' : 'none';
}

function setDiagramView(view) {
  diagramView = view;
  document.getElementById('viewLinearBtn').classList.toggle('active', view === 'linear');
  document.getElementById('viewRadialBtn').classList.toggle('active', view === 'radial');
  updatePhaseFilterVisibility();
  if (lastResult) renderDiagram(lastResult);
}

function setPhaseFilter(phase) {
  phaseFilter = phase;
  document.querySelectorAll('.phase-filter-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.phase === phase);
  });
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
  updatePhaseFilterVisibility();
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
