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
  legendHint:          { en: 'Block color = phase. "+"/"−" (linear view) or ⊙/⊗ (cross-section view) = current direction (EMF phasor sign). Single-layer windings are drawn as a coil symbol per tooth (concentrated-winding style); double-layer windings split each slot left/right into its two coil sides — left = bottom (return, facing the lower-numbered neighbor), right = top (start, facing the higher-numbered neighbor) — even when both happen to share the same phase and direction, so every coil side stays its own distinct block. The cross-section\'s inner ring shows the rotor\'s alternating N/S poles (illustrative only). Curves/brackets trace coils wired in series (all coils in a single parallel path — no wave-winding reordering or multi-path splitting yet); a tooth whose adjacent same-phase partner would wrap past the first/last slot is left unbracketed. In the cross-section view each phase gets its own band of bus rings (A innermost, C outermost); when a phase\'s cross-slot connections overlap in angle, they\'re automatically offset into separate concentric-arc lanes instead of stacking, so every segment stays visible — the "max overlapping" readout below the phase filter shows how many lanes that phase needed. Same-slot jumpers hugging the teeth now get direction arrows too (smaller, to mark them as short local connections).',
                          zh: '色塊代表相別。線性展開圖用「+」/「−」、馬達剖面圖用 ⊙/⊗ 代表電流方向（EMF 相量正負）。單層繞組在每齒畫成線圈符號（集中繞組風格）；雙層繞組把每槽左右分成兩個線圈邊——左＝bottom（回程，面向較小槽號那側）、右＝top（去程，面向較大槽號那側）——即使剛好同相同方向也一樣分開顯示，每個線圈邊都對應獨立一塊色塊。馬達剖面圖內圈環為轉子 N/S 極示意（僅示意，無實際磁極角位置意義）。弧線／跳線表示線圈的串接順序（目前只支援單一 parallel path，未處理 wave 繞法重排或多路分流）；若相鄰同相的配對齒剛好跨過頭尾槽，則不畫跳線。馬達剖面圖中三相各自佔一段由內而外的匯流環（A 最內、C 最外）；同一相如果有多條跨槽接線角度重疊，會自動錯開成不同車道的同心弧分開顯示，不會疊在一起看不出來——下方「最大重疊」數字就是該相最多同時用到幾條車道。貼齒的同槽跳線現在也會畫方向箭頭（尺寸較小，標示是短接線）。' },
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

/** 齒形路徑的左／右半邊（雙層槽內兩個線圈邊左右並排用），沿中線對切 */
function toothHalfPath(x, top, bottom, w, side) {
  const h = bottom - top;
  const midX = x + w / 2;
  if (side === 'left') {
    return 'M ' + x + ' ' + top +
      ' L ' + midX + ' ' + top +
      ' L ' + midX + ' ' + bottom +
      ' L ' + (x + w * 0.22) + ' ' + (top + h * 0.55) +
      ' Z';
  }
  return 'M ' + midX + ' ' + top +
    ' L ' + (x + w) + ' ' + top +
    ' L ' + (x + w * 0.78) + ' ' + (top + h * 0.55) +
    ' L ' + midX + ' ' + bottom +
    ' Z';
}

function renderLinearDiagram(result) {
  const svg = document.getElementById('wdSvgLinear');
  svg.innerHTML = '';

  const Q = result.Q;
  const isDouble = result.slots[0].bottom !== null;
  const slotW = isDouble ? 44 : 30, gapW = 10, pitch = slotW + gapW; // 雙層較寬，左右兩層並排才放得下文字
  const blockH = 60;
  const labelGap = 4, labelH = 10;
  const frontAreaH = isDouble ? 120 : 56, rearAreaH = isDouble ? 120 : 0;
  const marginTop = frontAreaH + 8;
  const slotX = function (k) { return gapW / 2 + k * pitch + slotW / 2; };
  /** 雙層接線出線點：isTop=true 取右半中心（go/top）、false 取左半中心（ret/bottom），跟色塊左右配置一致 */
  const sideX = function (k, isTop) {
    const x = gapW / 2 + k * pitch, halfW = slotW / 2;
    return isTop ? x + halfW * 1.5 : x + halfW * 0.5;
  };

  const width = Q * pitch + gapW;
  const bodyTop = marginTop;
  const bodyBottom = bodyTop + blockH;
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
      // 雙層的兩個線圈邊左右並排在同一個齒形輪廓裡：左＝bottom（回程，面向
      // 較小槽號、也就是它的 go 搭檔所在方向）、右＝top（去程，面向較大槽號、
      // 也就是它的 ret 搭檔所在方向）——這樣同一枚線圈的兩端會分別落在相鄰
      // 兩槽「面對面」的那一側，接線才會走最短路徑，不會繞去槽的外側。
      const halfW = slotW / 2;
      svg.appendChild(svgEl('path', {
        d: toothHalfPath(x, bodyTop, bodyBottom, slotW, 'left'),
        fill: PHASE_COLOR[s.bottom.phase], 'fill-opacity': 0.75,
        stroke: PHASE_COLOR[s.bottom.phase], 'stroke-width': 1.2,
      }));
      svg.appendChild(textEl(x + halfW * 0.55, bodyTop + blockH * 0.3, s.bottom.phase + (s.bottom.sign > 0 ? '+' : '−'),
        { fill: '#fff', 'font-weight': 700, 'font-size': 7.5 }));

      svg.appendChild(svgEl('path', {
        d: toothHalfPath(x, bodyTop, bodyBottom, slotW, 'right'),
        fill: PHASE_COLOR[s.top.phase], 'fill-opacity': 0.45,
        stroke: PHASE_COLOR[s.top.phase], 'stroke-width': 1.2,
      }));
      svg.appendChild(textEl(x + halfW * 1.45, bodyTop + blockH * 0.3, s.top.phase + (s.top.sign > 0 ? '+' : '−'),
        { fill: '#fff', 'font-weight': 700, 'font-size': 7.5, stroke: PHASE_COLOR[s.top.phase], 'stroke-width': 2, 'paint-order': 'stroke' }));

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
        const front = i % 2 === 0; // 交替 front（線圈自己的去回程，上方）／rear（線圈之間的跳線，下方）
        const x1 = sideX(wp[i].k, wp[i].top), x2 = sideX(wp[i + 1].k, wp[i + 1].top);
        const span = Math.abs(wp[i + 1].k - wp[i].k); // 槽數差（不是像素差），同槽跳線 span=0 自然只給最小弧高
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
      if (pair.wraps) return; // 跨槽1／槽Q接縫的配對，在展開圖上斷開，不畫
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

/**
 * 把整條相線的所有線圈接線串成「一條路徑」（單一 `<path>` 的 d 字串），
 * 而不是每段各自獨立的 `<path>`——即使每段的端點都精確相接，分開畫在視覺
 * 上仍會像好幾截各自獨立的線段；串成一條路徑後才是真正頭尾相連的一條線。
 * `angleAt(idx)` 取第 idx 個端點角度；`wp[i].k===wp[i+1].k` 的同槽跳線貼槽緣
 * （半徑 r0）畫一小段弧，其餘跨槽的段落繞去 `busRAt(i)` 決定的匯流半徑——
 * 依車道分開的半徑，讓角度重疊的跨槽接線不會疊在同一條圓弧上分不出來。
 */
function buildChainPath(cx, cy, r0, busRAt, wp, angleAt) {
  const p0 = polarPt(cx, cy, r0, angleAt(0));
  const parts = ['M ' + p0.x + ' ' + p0.y];
  for (let i = 0; i < wp.length - 1; i++) {
    const aStart = angleAt(i), aEndRaw = angleAt(i + 1);
    if (wp[i].k === wp[i + 1].k) {
      const sweepFlag = aEndRaw >= aStart ? 1 : 0;
      const p1 = polarPt(cx, cy, r0, aEndRaw);
      parts.push('A ' + r0 + ' ' + r0 + ' 0 0 ' + sweepFlag + ' ' + p1.x + ' ' + p1.y);
    } else {
      const busR = busRAt(i);
      const delta = ((aEndRaw - aStart + 540) % 360) - 180;
      const aEnd = aStart + delta;
      const sweepFlag = delta >= 0 ? 1 : 0;
      const p0b = polarPt(cx, cy, busR, aStart);
      const p1b = polarPt(cx, cy, busR, aEnd);
      const p1 = polarPt(cx, cy, r0, aEnd);
      parts.push('L ' + p0b.x + ' ' + p0b.y);
      parts.push('A ' + busR + ' ' + busR + ' 0 0 ' + sweepFlag + ' ' + p1b.x + ' ' + p1b.y);
      parts.push('L ' + p1.x + ' ' + p1.y);
    }
  }
  return parts.join(' ');
}

/** 在匯流圓弧上畫一個小箭頭，指出這段接線的走向（沿圓弧切線方向） */
function arrowMarker(svg, cx, cy, r, angleDeg, clockwise, color, size, opacity) {
  const rad = angleDeg * Math.PI / 180;
  const nx = Math.cos(rad), ny = Math.sin(rad); // 徑向（法線）方向
  const tx = clockwise ? -Math.sin(rad) : Math.sin(rad); // 切線方向（沿走向）
  const ty = clockwise ? Math.cos(rad) : -Math.cos(rad);
  const px = cx + r * Math.cos(rad), py = cy + r * Math.sin(rad);
  const tipX = px + tx * size, tipY = py + ty * size;
  const backX = px - tx * size * 0.6, backY = py - ty * size * 0.6;
  const leftX = backX + nx * size * 0.55, leftY = backY + ny * size * 0.55;
  const rightX = backX - nx * size * 0.55, rightY = backY - ny * size * 0.55;
  svg.appendChild(svgEl('polygon', {
    points: tipX + ',' + tipY + ' ' + leftX + ',' + leftY + ' ' + rightX + ',' + rightY,
    fill: color, opacity: opacity,
  }));
}

/**
 * 在整條相線的每一段接線中點畫一個方向箭頭：跨槽段畫在 busRAt(i) 的匯流弧
 * 上，同槽跳線畫在貼槽緣的 r0 弧上（箭頭縮小標示是短接線）——兩種接線統一
 * 都有箭頭，視覺語言一致。箭頭方向不是照 wp 陣列順序（那只是串接時任意選
 * 的走訪順序），而是照 ⊙(+)／⊗(−) 符號本身：一律從 + 端指向 − 端，才能跟
 * 旁邊槽的方向符號對得起來——同一枚線圈的兩端保證一正一負，箭頭就從 + 那
 * 端畫向 − 那端。
 */
function drawChainArrows(svg, cx, cy, r0, busRAt, wp, angleAt, signAt, color, opacity, size) {
  for (let i = 0; i < wp.length - 1; i++) {
    const sameSlot = wp[i].k === wp[i + 1].k;
    const aStart = angleAt(i), aEndRaw = angleAt(i + 1);
    const delta = ((aEndRaw - aStart + 540) % 360) - 180;
    const aEnd = aStart + delta;
    const aMid = (aStart + aEnd) / 2;
    const forward = signAt(i) > 0; // wp[i] 是 + 端就順著畫（i→i+1）；是 − 端就反過來（i+1→i）
    const clockwise = forward ? (delta >= 0) : (delta < 0);
    const r = sameSlot ? r0 : busRAt(i);
    const sz = sameSlot ? size * 0.7 : size;
    arrowMarker(svg, cx, cy, r, aMid, clockwise, color, sz, opacity);
  }
}

/** 把兩個角度端點轉成走「短邊方向」的區間 [lo, hi]——跟 radialConnectionPath 實際畫的方向一致 */
function shortWayInterval(aStart, aEndRaw) {
  const delta = ((aEndRaw - aStart + 540) % 360) - 180;
  const aEnd = aStart + delta;
  return [Math.min(aStart, aEnd), Math.max(aStart, aEnd)];
}

/**
 * 貪婪掃描線分配「車道」：把彼此角度重疊的區間分開放到不同車道，同車道內
 * 保證互不重疊；車道數等於這批區間最多同時重疊的深度（區間排程的古典結果）。
 * 回傳每個區間對應的車道編號（跟輸入陣列順序一致）與總車道數，供匯流弧
 * 依車道往外偏移半徑，讓重疊的接線變成看得出來的同心弧，而不是疊在同一條
 * 線上分不出來。
 */
function assignLanes(intervals) {
  const order = intervals.map(function (_, i) { return i; })
    .sort(function (a, b) { return intervals[a][0] - intervals[b][0]; });
  const laneEnd = []; // 每條車道目前占用到的角度終點
  const laneOf = new Array(intervals.length);
  order.forEach(function (i) {
    const iv = intervals[i];
    let lane = laneEnd.findIndex(function (end) { return end <= iv[0]; });
    if (lane === -1) { lane = laneEnd.length; laneEnd.push(iv[1]); }
    else { laneEnd[lane] = iv[1]; }
    laneOf[i] = lane;
  });
  return { laneOf: laneOf, laneCount: laneEnd.length };
}

/**
 * 依三相「跨槽接線」各自需要的車道數，由內而外分配匯流半徑起點——車道數
 * 愈多的相占用愈寬的圓環範圍，彼此不會撞在一起；也回傳三相都畫完後最外側
 * 的可用半徑，供槽號標籤定位。
 */
function layoutPhaseBuses(intervalsByPhase, startR, laneStep, phaseGap) {
  const layout = {};
  let cursor = startR;
  ['A', 'B', 'C'].forEach(function (phase) {
    const lanes = assignLanes(intervalsByPhase[phase]);
    layout[phase] = { base: cursor, laneOf: lanes.laneOf, laneCount: lanes.laneCount };
    cursor += Math.max(1, lanes.laneCount) * laneStep + phaseGap;
  });
  layout.labelR = cursor + 8;
  return layout;
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
 * （相鄰齒一正一負，用跳線橋接）。若頭尾兩段剛好同相且都落單一顆，視為
 * 跨越槽1／槽Q接縫的一對（`wraps:true`）——沿圓周本來就相鄰，只是在
 * 線性展開圖上斷成兩截；展開圖畫的時候應跳過這種對（見 renderLinearDiagram），
 * 剖面圖因為是真圓周，可以正常畫。
 */
function buildSingleLayerPairs(result) {
  const Q = result.Q;
  const runs = groupConsecutiveSlots(Q, function (k) { return { phase: result.slots[k].top.phase, sign: 0 }; });
  const pairs = [];
  runs.forEach(function (run) {
    for (let k = run.startK; k + 1 <= run.endK; k += 2) {
      pairs.push({ aK: k, bK: k + 1, phase: run.phase, wraps: false });
    }
  });
  if (runs.length > 1) {
    const first = runs[0], last = runs[runs.length - 1];
    const firstLen = first.endK - first.startK + 1;
    const lastLen = last.endK - last.startK + 1;
    if (first.phase === last.phase && firstLen % 2 === 1 && lastLen % 2 === 1) {
      pairs.push({ aK: last.endK, bK: first.startK, phase: first.phase, wraps: true });
    }
  }
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
  const svg = document.getElementById('wdSvgRadial');
  svg.innerHTML = '';

  const Q = result.Q, P = result.P;
  const isDouble = result.slots[0].bottom !== null;
  const IRON = '#94a3b8', IRON_STROKE = '#475569';
  const rYoke = 200, rOuter = 175, rInner = 100, rRotor = 70, rRotorCore = 56;
  const step = 360 / Q;
  const gapDeg = Math.min(7, step * 0.22); // 槽間留白角度（露出鐵芯，形成齒），比例隨槽數自動縮小避免槽被吃光

  const slotAngle = function (k) { return -90 + k * step + step / 2; };
  /** 半槽（角度方向）中心角：isTop=true 取右半（面向較大槽號），false 取左半（面向較小槽號） */
  const sideAngle = function (k, isTop) {
    const a0 = -90 + k * step + gapDeg / 2, a1 = -90 + (k + 1) * step - gapDeg / 2, aMid = (a0 + a1) / 2;
    return isTop ? (aMid + a1) / 2 : (a0 + aMid) / 2;
  };
  const laneStep = 12, phaseGap = 8;
  const overlap = {};

  // ── 先在角度空間（不需要畫布尺寸）算出每相跨槽接線要用幾條匯流車道；
  // 車道數決定匯流環要多寬，進而決定畫布要留多大，複雜繞組（高極對數／
  // 高度分數槽重複單元）的接線才不會被裁到畫布外。雙層依 buildPhaseChains
  // 把整條 path 串起來；單層依 buildSingleLayerPairs 把相鄰配對齒橋接起來，
  // 兩者共用同一套車道分配邏輯。
  let connByPhase, layout;
  if (isDouble) {
    const chains = buildPhaseChains(result);
    connByPhase = {};
    ['A', 'B', 'C'].forEach(function (phase) {
      const wp = phaseWaypoints(chains[phase]);
      const angleAt = function (idx) {
        return sideAngle(wp[idx].k, wp[idx].top);
      };
      const signAt = function (idx) {
        return wp[idx].top ? result.slots[wp[idx].k].top.sign : result.slots[wp[idx].k].bottom.sign;
      };
      // 只有跨槽的段落要占匯流車道；同槽跳線固定貼在 r0，不參與車道分配
      const farHopIdx = [], farIntervals = [];
      for (let i = 0; i < wp.length - 1; i++) {
        if (wp[i].k === wp[i + 1].k) continue;
        farHopIdx.push(i);
        farIntervals.push(shortWayInterval(angleAt(i), angleAt(i + 1)));
      }
      connByPhase[phase] = { wp: wp, angleAt: angleAt, signAt: signAt, farHopIdx: farHopIdx, farIntervals: farIntervals };
    });
    const intervalsByPhase = {};
    ['A', 'B', 'C'].forEach(function (phase) { intervalsByPhase[phase] = connByPhase[phase].farIntervals; });
    layout = layoutPhaseBuses(intervalsByPhase, rYoke + 20, laneStep, phaseGap);
  } else {
    const pairs = buildSingleLayerPairs(result);
    connByPhase = {};
    ['A', 'B', 'C'].forEach(function (phase) {
      const phPairs = pairs.filter(function (p) { return p.phase === phase; });
      const intervals = phPairs.map(function (p) {
        return shortWayInterval(slotAngle(p.aK), slotAngle(p.bK));
      });
      connByPhase[phase] = { pairs: phPairs, intervals: intervals };
    });
    const intervalsByPhase = {};
    ['A', 'B', 'C'].forEach(function (phase) { intervalsByPhase[phase] = connByPhase[phase].intervals; });
    layout = layoutPhaseBuses(intervalsByPhase, rYoke + 20, laneStep, phaseGap);
  }

  // 畫布依匯流車道實際需要的寬度放大，車道多的複雜繞組也不會被裁到邊界外；
  // 一般情形（車道需求小）維持原本 600×600。
  const size = Math.max(600, 2 * (layout.labelR + 14));
  const cx = size / 2, cy = size / 2;

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
  /** 雙層合併弧專用：角寬隨合併段數變化，弧長要用該段實際角寬重算 */
  function symbolRSpan(radialDepth, angularSpanDeg) {
    const arcLen = (rInner + rOuter) / 2 * angularSpanDeg * Math.PI / 180;
    return Math.max(3, Math.min(9, Math.min(radialDepth, arcLen) * 0.32));
  }

  if (isDouble) {
    // 雙層：每槽切成左右兩半（角度方向，非徑向），左＝bottom（回程，面向較小
    // 槽號——即它 go 搭檔所在方向）、右＝top（去程，面向較大槽號），跟展開圖
    // 一致，讓同一枚線圈的兩端落在相鄰槽面對面的一側。每槽的左右兩半各自
    // 獨立畫出（不跨槽合併），即使相鄰的剛好同相同方向也一樣分開顯示，
    // 這樣每個線圈邊都對應唯一一塊色塊、接線的出線點才看得出來是哪一邊。
    const halfGapDeg = Math.min(2, step * 0.06);
    result.slots.forEach(function (s, k) {
      const a0 = -90 + k * step + gapDeg / 2;
      const a1 = -90 + (k + 1) * step - gapDeg / 2;
      const aMid = (a0 + a1) / 2;

      const lA0 = a0, lA1 = aMid - halfGapDeg / 2;
      svg.appendChild(svgEl('path', { d: annularSectorPath(cx, cy, rInner, rOuter, lA0, lA1), fill: PHASE_COLOR[s.bottom.phase], opacity: 0.8 }));
      const pL = polarPt(cx, cy, (rInner + rOuter) / 2, (lA0 + lA1) / 2);
      currentDirSymbol(svg, pL.x, pL.y, symbolRSpan(rOuter - rInner, lA1 - lA0), s.bottom.sign);

      const rA0 = aMid + halfGapDeg / 2, rA1 = a1;
      svg.appendChild(svgEl('path', { d: annularSectorPath(cx, cy, rInner, rOuter, rA0, rA1), fill: PHASE_COLOR[s.top.phase], opacity: 0.8 }));
      const pR = polarPt(cx, cy, (rInner + rOuter) / 2, (rA0 + rA1) / 2);
      currentDirSymbol(svg, pR.x, pR.y, symbolRSpan(rOuter - rInner, rA1 - rA0), s.top.sign);
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

  // 線圈連接弧線：定子外側，三相依 layout 分到的匯流車道畫出（車道分配已在
  // 函式開頭算好）；選定單一相時其餘相調淡，方便專注看該相走線。
  if (isDouble) {
    ['A', 'B', 'C'].forEach(function (phase) {
      const pd = connByPhase[phase], ph = layout[phase];
      const laneOfHop = {};
      pd.farHopIdx.forEach(function (hopI, j) { laneOfHop[hopI] = ph.laneOf[j]; });
      const busRAt = function (hopIdx) { return ph.base + (laneOfHop[hopIdx] || 0) * laneStep; };
      overlap[phase] = ph.laneCount;
      const dimmed = phaseFilter !== 'all' && phaseFilter !== phase;
      const opacity = dimmed ? 0.15 : 0.8;
      // 整條相線串成一條路徑：同槽跳線（線圈回程邊直接接下一枚線圈在同槽
      // 的去程邊）貼著槽緣走一小段（半徑 r0），跨槽段落繞去該段所在車道的
      // 匯流半徑——半徑會隨車道變化，但整條線頭尾相連，不再是分開的小段
      const d = buildChainPath(cx, cy, rYoke + 6, busRAt, pd.wp, pd.angleAt);
      svg.appendChild(svgEl('path', {
        d: d, fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity,
      }));
      drawChainArrows(svg, cx, cy, rYoke + 6, busRAt, pd.wp, pd.angleAt, pd.signAt, PHASE_COLOR[phase], opacity, 6.5);
    });
  } else {
    ['A', 'B', 'C'].forEach(function (phase) {
      const pd = connByPhase[phase], ph = layout[phase];
      overlap[phase] = ph.laneCount;
      const dimmed = phaseFilter !== 'all' && phaseFilter !== phase;
      const opacity = dimmed ? 0.15 : 0.8;
      pd.pairs.forEach(function (p, i) {
        const hopBusR = ph.base + ph.laneOf[i] * laneStep;
        svg.appendChild(svgEl('path', {
          d: radialConnectionPath(cx, cy, rYoke + 6, slotAngle(p.aK), slotAngle(p.bK), hopBusR),
          fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity,
        }));
      });
    });
  }
  renderWireOverlapInfo(overlap);

  // 槽號放在所有接線匯流圈之外，避免被徑向出線／收線的線段蓋住
  result.slots.forEach(function (s, k) {
    const a0 = -90 + k * step + gapDeg / 2;
    const a1 = -90 + (k + 1) * step - gapDeg / 2;
    const aMid = (a0 + a1) / 2;
    const pLabel = polarPt(cx, cy, layout.labelR, aMid);
    svg.appendChild(textEl(pLabel.x, pLabel.y + 3, String(k + 1), { fill: 'var(--text3)', 'font-size': 8 }));
  });
}


/** 目前選擇的線圈接線相別濾鏡：'all' | 'A' | 'B' | 'C'（僅雙層繞組有作用） */
let phaseFilter = 'all';

/** 展開圖與剖面圖並排顯示，兩者一起重繪 */
function renderDiagram(result) {
  renderLinearDiagram(result);
  renderRadialDiagram(result);
}

/** 線圈接線濾鏡列可見性：兩種層數、兩種視圖都有線圈接線可濾，只要有可行結果就顯示 */
function updatePhaseFilterVisibility() {
  document.getElementById('phaseFilterRow').style.display = lastResult ? 'flex' : 'none';
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
