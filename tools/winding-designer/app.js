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
  legendHint:          { en: 'Tip color (linear view) / block color (cross-section view) = phase. ⊙/⊗ (with "+"/"−") = current direction (EMF phasor sign). Cross-section double-layer windings split each slot left/right into its two coil sides — left = bottom (return, facing the lower-numbered neighbor), right = top (start, facing the higher-numbered neighbor) — even when both happen to share the same phase and direction, so every coil side stays its own distinct block. Linear-view teeth are drawn with a neutral outline and just the tip colored, one tooth per slot (single layer, concentrated-winding style) or split left/right into two coil sides (double layer) — the ⊙/⊗ symbol and its sign sit above the tooth, the phase letter below. The cross-section\'s inner ring shows the rotor\'s alternating N/S poles (illustrative only). Only each individual coil\'s own two ends (its entry and exit) are connected with a line; the series jumpers wiring separate coils together into a phase are not drawn, so what you see is each coil on its own, not a lead-to-lead series path. When a phase\'s coil connections overlap — in angle (cross-section) or horizontal position (linear) — they\'re automatically offset into separate lanes instead of stacking, so every coil stays visible; the cross-section\'s "max overlapping" readout shows how many lanes each phase needed. A coil that only looks long because the slot-1/slot-Q seam was cut open to unroll the linear view is left undrawn there, its two ends marked with a short dashed line to the nearest edge instead (it\'s a short coil on the real circle — see the cross-section for it).',
                          zh: '展開圖用齒尖顏色、剖面圖用色塊代表相別。⊙/⊗（配「+」/「−」）代表電流方向（EMF 相量正負）。剖面圖的雙層繞組把每槽左右分成兩個線圈邊——左＝bottom（回程，面向較小槽號那側）、右＝top（去程，面向較大槽號那側）——即使剛好同相同方向也一樣分開顯示，每個線圈邊都對應獨立一塊色塊。展開圖的齒形一律中性色輪廓、只有齒尖著色，單層每槽一顆齒（集中繞組風格），雙層每槽左右分成兩個線圈邊，⊙/⊗ 符號與正負號在齒上方、相別字母在齒下方。馬達剖面圖內圈環為轉子 N/S 極示意（僅示意，無實際磁極角位置意義）。畫面上只連每一枚線圈自己的兩端（進線與出線），線圈跟線圈之間串成同一相的跳線不畫，看到的是每顆線圈各自獨立的樣子，不是整相頭尾相接的串聯路徑。同一相如果有多枚線圈接線重疊——剖面圖是角度重疊、展開圖是水平位置重疊——會自動錯開成不同車道，不會疊在一起看不出來；剖面圖下方「最大重疊」數字就是該相最多同時用到幾條車道。展開圖是把圓周從槽1／槽Q接縫剪開拉直畫的，某枚線圈如果剛好跨過這個接縫、被拉成看起來很長，展開圖上會跳過不畫，改成兩端各拉一小段虛線指向最近的邊緣（它在圓周上其實是很短的線圈——完整走向請看剖面圖）。' },
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
  const svg = document.getElementById('wdSvgLinear');
  svg.innerHTML = '';

  const Q = result.Q;
  const isDouble = result.slots[0].bottom !== null;
  const slotW = isDouble ? 44 : 30, gapW = 10, pitch = slotW + gapW; // 雙層較寬，左右兩層並排才放得下文字
  const blockH = 60;
  const labelGap = 4, labelH = 10;
  const slotX = function (k) { return gapW / 2 + k * pitch + slotW / 2; };
  /** 雙層接線出線點：isTop=true 取右半中心（go/top）、false 取左半中心（ret/bottom），跟色塊左右配置一致 */
  const sideX = function (k, isTop) {
    const x = gapW / 2 + k * pitch, halfW = slotW / 2;
    return isTop ? x + halfW * 1.5 : x + halfW * 0.5;
  };

  // 只畫「同一枚線圈自己」的去回程接線（entry↔exit），線圈跟線圈之間的跳線
  // 不畫——單層／雙層都用同一套（buildPhaseChains／buildSingleLayerChains
  // 回傳的線圈陣列，不用 phaseWaypoints 展開成整條鏈，也不用管串接順序，
  // 每顆線圈各自獨立畫一段）。車道分配比照剖面圖：三相「各自」分配車道、
  // 由下而上疊成三段（A 最靠近齒排、C 最遠），不是三相合併共用一個車道池
  // ——三相合併雖然車道數較省，但不同相的線會夾在一起造成不必要的交叉，
  // 跟剖面圖 A/B/C 各佔一段匯流環的做法不一致。同一相自己的線圈如果剛好
  // 交錯（角度區間互相穿插、不是誰包住誰），車道再多也無法完全避免視覺
  // 上的交叉——這是這批線圈本身的幾何關係決定的，不是車道分配的問題。
  const width = Q * pitch + gapW;
  const chainsRaw = isDouble ? buildPhaseChains(result) : buildSingleLayerChains(result);
  const laneStepPx = 12, phaseGapPx = 8;
  const coilsByPhase = {}, intervalsByPhase = {};
  ['A', 'B', 'C'].forEach(function (phase) {
    const coils = chainsRaw[phase].map(function (c) {
      const wp = [{ k: c.goK, top: c.goTop }, { k: c.retK, top: c.retTop }];
      const xAt = function (idx) { return isDouble ? sideX(wp[idx].k, wp[idx].top) : slotX(wp[idx].k); };
      // 圓周上「短邊」是繞過槽1／槽Q接縫的那種線圈（例如槽12接槽1，圓周上緊
      // 鄰），在展開圖是把圓周剪開拉直的長條，槽1在最左、槽Q在最右，這種
      // 線圈的 x 距離反而是全圖最長、畫不出合理的直線，改成兩端往邊緣拉虛線
      // 指示（drawWrapEdgeStubs）。
      const d = Math.abs(wp[0].k - wp[1].k);
      const isWrap = Q - d < d;
      return { wp: wp, xAt: xAt, isWrap: isWrap, lane: 0 };
    });
    coilsByPhase[phase] = coils;
    const ivs = [], idxMap = [];
    coils.forEach(function (c, ci) {
      // wrap 線圈用「整個畫布寬」當它的區間餵進車道分配——它兩端各自拉到左右
      // 邊緣，視覺上等於占滿整個寬度，這樣同一相如果有不只一顆 wrap 線圈，
      // 會各自搶到自己的車道，虛線就不會疊在同一高度分不出來（之前沒把 wrap
      // 算進車道，一相有兩顆以上 wrap 時，兩條虛線會疊在同一條 busBaseY 上）。
      ivs.push(c.isWrap ? [0, width] : [Math.min(c.xAt(0), c.xAt(1)), Math.max(c.xAt(0), c.xAt(1))]);
      idxMap.push(ci);
    });
    intervalsByPhase[phase] = ivs;
    coilsByPhase[phase].idxMap = idxMap;
  });
  const bandLayout = layoutPhaseBuses(intervalsByPhase, 0, laneStepPx, phaseGapPx);
  ['A', 'B', 'C'].forEach(function (phase) {
    coilsByPhase[phase].idxMap.forEach(function (ci, i) {
      coilsByPhase[phase][ci].lane = bandLayout[phase].laneOf[i];
      coilsByPhase[phase][ci].bandBase = bandLayout[phase].base;
    });
  });

  // 由齒排上緣（bodyTop）往上，依序疊出：出線 stub → ⊙/⊗ 符號 → 到符號的間距
  // → 正負號標籤（含字元本身的視覺高度，不能只留基線到符號的距離，字元往上
  // 還要再佔一截，之前漏算這塊才會被最底下那條車道的線切到）→ 到車道0的
  // 間距 → 三相車道逐層往上疊（bandLayout.labelR 已含車道、相間留白、緩衝）。
  const stubGap = 7, symbolR = 5, symbolToLabelGap = 8, labelTextH = 11, labelToBusGap = 8;
  const aboveBody = stubGap + symbolR * 2 + symbolToLabelGap + labelTextH + labelToBusGap + bandLayout.labelR;
  const marginTop = aboveBody + 8;

  const bodyTop = marginTop;
  const bodyBottom = bodyTop + blockH;
  const labelY = bodyBottom + labelGap + labelH;
  const height = labelY + 6;
  const symbolY = bodyTop - stubGap - symbolR;
  const signLabelY = symbolY - symbolR - symbolToLabelGap; // 正負號標籤基線
  const busBaseY = signLabelY - labelTextH - labelToBusGap; // 車道 0（A 相最靠近齒排的車道）

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);

  /** 一個線圈邊的符號＋標籤：⊙/⊗ 疊正負號在上、相別字母（不含正負號）在下，中間貼齒尖著色 */
  function drawSideMarks(symX, tipX0, tipX1, tipApexX, phase, sign, labelBottomX) {
    const color = PHASE_COLOR[phase];
    svg.appendChild(svgEl('path', {
      d: 'M ' + tipX0 + ' ' + (bodyTop + blockH * 0.55) + ' L ' + tipApexX + ' ' + bodyBottom +
         ' L ' + tipX1 + ' ' + (bodyTop + blockH * 0.55) + ' Z',
      fill: color, opacity: 0.85,
    }));
    svg.appendChild(textEl(labelBottomX, labelY, phase, { fill: color, 'font-weight': 700, 'font-size': isDouble ? 10 : 12 }));
    svg.appendChild(svgEl('line', { x1: symX, y1: symbolY + symbolR, x2: symX, y2: bodyTop, stroke: 'var(--text3)', 'stroke-width': 1 }));
    currentDirSymbolOutlined(svg, symX, symbolY, symbolR, sign, color);
    svg.appendChild(textEl(symX, signLabelY, (sign > 0 ? '+' : '−') + phase, { fill: color, 'font-weight': 700, 'font-size': isDouble ? 7.5 : 9 }));
  }

  result.slots.forEach(function (s, k) {
    const x = gapW / 2 + k * pitch;
    const cx = x + slotW / 2;

    // 齒形輪廓一律中性色，只有齒尖著色、槽號放進齒形內部——單層一顆齒一個
    // 線圈邊、雙層一顆齒兩個線圈邊（左＝bottom 面向較小槽號、右＝top 面向
    // 較大槽號，這樣同一枚線圈的兩端落在相鄰槽面對面那側，接線走最短路徑）
    svg.appendChild(svgEl('path', {
      d: toothPath(x, bodyTop, bodyBottom, slotW), fill: 'none', stroke: 'var(--text3)', 'stroke-width': 1.2,
    }));
    svg.appendChild(textEl(cx, bodyTop + blockH * 0.4, String(k + 1), { fill: 'var(--text3)', 'font-size': 11, 'font-weight': 600 }));

    if (isDouble) {
      const midX = x + slotW / 2;
      drawSideMarks(sideX(k, false), x + slotW * 0.22, midX, midX, s.bottom.phase, s.bottom.sign, x + slotW * 0.28);
      drawSideMarks(sideX(k, true), midX, x + slotW * 0.78, midX, s.top.phase, s.top.sign, x + slotW * 0.72);
      if (k > 0) {
        svg.appendChild(svgEl('line', {
          x1: x - gapW / 2, y1: bodyTop - 2, x2: x - gapW / 2, y2: bodyBottom + 2,
          stroke: 'var(--border)', 'stroke-width': 1,
        }));
      }
    } else {
      drawSideMarks(cx, x + slotW * 0.22, x + slotW * 0.78, cx, s.top.phase, s.top.sign, cx);
    }
  });

  ['A', 'B', 'C'].forEach(function (phase) {
    if (phaseFilter !== 'all' && phaseFilter !== phase) return;
    const dimmed = phaseFilter !== 'all'; // 單相模式下其餘相已被濾掉，此處不用再淡化
    const opacity = dimmed ? 0.85 : 0.5;
    coilsByPhase[phase].forEach(function (c) {
      const laneY = busBaseY - (c.bandBase + c.lane * laneStepPx);
      if (c.isWrap) { drawWrapEdgeStubs(svg, width, symbolY, laneY, c.wp, c.xAt, PHASE_COLOR[phase], opacity); return; }
      const laneYAt = function () { return laneY; };
      const d = buildLinearChainPath(symbolY, laneYAt, c.wp, c.xAt, null);
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity }));
    });
  });
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
 * 畫一枚線圈自己的去回程接線（`<path>` 的 d 字串）：從槽緣沿半徑出線到
 * `busRAt(0)` 決定的匯流半徑，沿真圓弧走到另一端槽的角度，再沿半徑收回槽緣。
 * `wp` 目前一律是 2 點（entry/exit），特例處理 `wp[i].k===wp[i+1].k`（同槽兩端，
 * 貼槽緣畫一小段弧）理論上不會被觸發（線圈節距 span≥1，entry/exit 一定在
 * 不同槽），保留只是跟原本多段版共用邏輯，不影響現在的用法。
 */
function buildChainPath(cx, cy, r0, busRAt, wp, angleAt) {
  if (!wp.length) return ''; // 該相在這個槽極組合下沒有線圈（見 buildSingleLayerChains），沒東西可畫
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

/**
 * 展開圖版單一線圈接線路徑：跟剖面圖的 buildChainPath 同一個精神，只是把
 * 極座標換成卡氏座標——半徑方向的出線／收線換成垂直方向的 up/down，匯流圓
 * 弧換成水平直線（車道＝高度，離齒排愈遠車道編號愈大）。symbolY 是線圈符號
 * 所在的固定高度；laneYAt(i) 決定第 i 段要走哪一條車道。`wp` 目前一律是
 * 2 點（一枚線圈自己的 entry/exit），保留 isWrapHop 參數是因為介面沿用剖面圖
 * 那份，但現在都傳 null（線圈間的跳線已經整個不畫了，不會有需要跳過的段落）。
 */
function buildLinearChainPath(symbolY, laneYAt, wp, xAt, isWrapHop) {
  if (!wp.length) return '';
  const parts = [];
  let started = false;
  for (let i = 0; i < wp.length - 1; i++) {
    if (isWrapHop && isWrapHop(i)) { started = false; continue; } // 跳過接縫那段，路徑在這裡斷開重新起筆
    const x1 = xAt(i), x2 = xAt(i + 1), y = laneYAt(i);
    if (!started) { parts.push('M ' + x1 + ' ' + symbolY); started = true; }
    parts.push('L ' + x1 + ' ' + y);
    parts.push('L ' + x2 + ' ' + y);
    parts.push('L ' + x2 + ' ' + symbolY);
  }
  return parts.join(' ');
}

/**
 * 跨槽1／槽Q接縫的那顆線圈（自己的兩端在展開圖上落在最左跟最右）沒有畫成
 * 一條線橫跨整張圖，但兩端不能就這樣懸空——不然使用者會以為那顆線圈少接
 * 了一段。改成兩端各自往最近的畫布邊緣拉一小段虛線，暗示「這裡接到圖外
 * （其實是圓周上緊鄰的另一端）」，實際完整走向要看剖面圖（真圓周，不會斷）。
 */
function drawWrapEdgeStubs(svg, width, symbolY, busBaseY, wp, xAt, color, opacity) {
  [0, 1].forEach(function (idx) {
    const x = xAt(idx);
    const toLeft = x < width / 2;
    const edgeX = toLeft ? 0 : width;
    // 先從符號往上接到 busBaseY 這個高度（虛線一律走最靠近齒排的車道），
    // 再往邊緣拉平——不然虛線只在半空中，跟槽上的符號中間會留一截空隙
    svg.appendChild(svgEl('path', {
      d: 'M ' + x + ' ' + symbolY + ' L ' + x + ' ' + busBaseY + ' L ' + edgeX + ' ' + busBaseY,
      fill: 'none', stroke: color, 'stroke-width': 1.3, opacity: opacity * 0.8, 'stroke-dasharray': '3,3',
    }));
  });
}

/** 把兩個角度端點轉成走「短邊方向」的區間 [lo, hi]——跟 radialConnectionPath 實際畫的方向一致 */
function shortWayInterval(aStart, aEndRaw) {
  const delta = ((aEndRaw - aStart + 540) % 360) - 180;
  const aEnd = aStart + delta;
  return [Math.min(aStart, aEnd), Math.max(aStart, aEnd)];
}

/**
 * `shortWayInterval` 回傳的區間是相對「各自的 aStart」算出來的原始角度，不同
 * 線圈的數值範圍彼此沒有統一基準——同一個實際角度位置，可能一顆線圈算出來
 * 落在 [260,340]，另一顆算出來卻是 [-70,10]（差了 360），兩者用普通線性比大小
 * 的 assignLanes 判斷會誤判成「沒有重疊」，實際上在圓上是真的疊在一起
 * （已用腳本驗證過這個 bug：同車道兩段角度區間換算成同一基準後其實有重疊）。
 * 這裡先找一個「安全切點」——排序所有端點，取相鄰端點間最大的角度間隙，
 * 缺口中點通常不會被任何一段蓋住——把圓周從那裡剪開，所有區間依此切點
 * 重新展開成同一條不循環的數線，再交給線性版 assignLanes 判斷，就不會有
 * 上述「同一位置兩種數值表示法」的誤判。
 */
function unwrapCircularIntervals(intervals) {
  if (!intervals.length) return intervals;
  const norm = intervals.reduce(function (acc, iv) {
    acc.push(((iv[0] % 360) + 360) % 360, ((iv[1] % 360) + 360) % 360);
    return acc;
  }, []);
  norm.sort(function (a, b) { return a - b; });
  const uniq = norm.filter(function (v, i) { return i === 0 || v !== norm[i - 1]; });
  let cut = 0, maxGap = -1;
  for (let i = 0; i < uniq.length; i++) {
    const a = uniq[i], b = uniq[(i + 1) % uniq.length];
    const gap = ((b - a + 360) % 360) || 360;
    if (gap > maxGap) { maxGap = gap; cut = (a + gap / 2) % 360; }
  }
  return intervals.map(function (iv) {
    const s = ((iv[0] - cut) % 360 + 360) % 360;
    let e = ((iv[1] - cut) % 360 + 360) % 360;
    if (e < s) e += 360;
    return [s, e];
  });
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

/**
 * 電流方向符號（白底＋相色版）：符號線條與外框用相色，先墊一片背景色底，
 * 不管疊在什麼背景上都看得清楚——展開圖單層把符號畫在齒排上方的空白處
 * （不是疊在色塊上），白色符號在淺色主題下會看不見，所以另外做這個版本。
 */
function currentDirSymbolOutlined(svg, cx, cy, r, sign, color) {
  svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r + 1.5, fill: 'var(--bg)' }));
  if (sign > 0) {
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: color, 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r * 0.32, fill: color }));
  } else {
    const k = r * 0.72;
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: color, 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('line', { x1: cx - k, y1: cy - k, x2: cx + k, y2: cy + k, stroke: color, 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('line', { x1: cx - k, y1: cy + k, x2: cx + k, y2: cy - k, stroke: color, 'stroke-width': 1.2 }));
  }
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
  const laneStep = 20, phaseGap = 22;
  const overlap = {};

  // ── 只畫「同一枚線圈自己」的去回程接線（entry↔exit），線圈跟線圈之間的
  // 跳線不畫；單層／雙層共用同一套（buildPhaseChains／buildSingleLayerChains
  // 回傳的線圈陣列，每顆線圈各自獨立畫一段，不用管串接順序）。先在角度空間
  // （不需要畫布尺寸）算出每相要用幾條匯流車道——車道數決定匯流環要多寬，
  // 進而決定畫布要留多大。
  const chainsRaw = isDouble ? buildPhaseChains(result) : buildSingleLayerChains(result);
  const coilsByPhase = {};
  ['A', 'B', 'C'].forEach(function (phase) {
    coilsByPhase[phase] = chainsRaw[phase].map(function (c) {
      const wp = [{ k: c.goK, top: c.goTop }, { k: c.retK, top: c.retTop }];
      const angleAt = function (idx) {
        return isDouble ? sideAngle(wp[idx].k, wp[idx].top) : slotAngle(wp[idx].k);
      };
      return { wp: wp, angleAt: angleAt };
    });
  });
  const intervalsByPhase = {};
  ['A', 'B', 'C'].forEach(function (phase) {
    const raw = coilsByPhase[phase].map(function (c) { return shortWayInterval(c.angleAt(0), c.angleAt(1)); });
    // 這批區間各自用自己的基準表示角度，同一相若有兩顆以上線圈，直接拿去比
    // 大小可能誤判「沒重疊」（見 unwrapCircularIntervals 說明），先統一展開成
    // 同一條數線再交給車道分配。
    intervalsByPhase[phase] = unwrapCircularIntervals(raw);
  });
  const layout = layoutPhaseBuses(intervalsByPhase, rYoke + 20, laneStep, phaseGap);

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
  // 函式開頭算好）；選定單一相時其餘相調淡，方便專注看該相走線。每顆線圈
  // 各自獨立一段（buildChainPath 對 2 點 wp 就是單一 M→L→A→L 的弧線），不畫
  // 線圈間的跳線，也不畫方向箭頭。
  // 由外而內畫（C→B→A），讓最內圈的 A（離定子最近、最常被對照的一圈）疊在
  // 最上層——三相車道彼此不真的共用半徑（已各自分段），但 B/C 的出線／收線
  // 徑向段落必然會「穿過」比自己內側的相所在的半徑範圍（從槽緣往外接到自己
  // 的車道，路上會經過內側相的車道），這樣畫至少讓內側那圈線不被外側的線蓋住
  ['C', 'B', 'A'].forEach(function (phase) {
    const coils = coilsByPhase[phase], ph = layout[phase];
    overlap[phase] = ph.laneCount;
    const dimmed = phaseFilter !== 'all' && phaseFilter !== phase;
    const opacity = dimmed ? 0.15 : 0.8;
    coils.forEach(function (c, i) {
      const busR = ph.base + ph.laneOf[i] * laneStep;
      const d = buildChainPath(cx, cy, rYoke + 6, function () { return busR; }, c.wp, c.angleAt);
      svg.appendChild(svgEl('path', {
        d: d, fill: 'none', stroke: PHASE_COLOR[phase], 'stroke-width': 1.3, opacity: opacity,
      }));
    });
  });
  renderWireOverlapInfo(overlap);

  // 槽號放在所有接線匯流圈之外，避免被徑向出線／收線的線段蓋住
  result.slots.forEach(function (s, k) {
    const a0 = -90 + k * step + gapDeg / 2;
    const a1 = -90 + (k + 1) * step - gapDeg / 2;
    const aMid = (a0 + a1) / 2;
    const pLabel = polarPt(cx, cy, layout.labelR, aMid);
    svg.appendChild(textEl(pLabel.x, pLabel.y + 4, String(k + 1), { fill: 'var(--text3)', 'font-size': 11, 'font-weight': 600 }));
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
