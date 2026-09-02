'use strict';
/* ══════════════════════════════════════════════════════════
   Winding Designer — winding.js
   純計算層：star-of-slots 方法產生三相繞組槽相位分佈、
   計算基波繞組係數。不含任何 DOM / UI 邏輯。
   ══════════════════════════════════════════════════════════ */

/**
 * EMF 星形圖 60° 相帶對照表（標準正相序 A-C-B-A-C-B，每帶 60 電機角）
 * index = floor(slot 電機角 / 60) mod 6
 */
const PHASE_SECTOR_MAP = [
  { phase: 'A', sign:  1 },
  { phase: 'C', sign: -1 },
  { phase: 'B', sign:  1 },
  { phase: 'A', sign: -1 },
  { phase: 'C', sign:  1 },
  { phase: 'B', sign: -1 },
];

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a || 1;
}

/**
 * 計算三相繞組槽分佈與基波繞組係數
 * @param {object} cfg
 * @param {number} cfg.Q      槽數
 * @param {number} cfg.P      極數（偶數）
 * @param {string} cfg.layers 'single' | 'double'
 * @param {number} [cfg.span] 線圈節距（槽數），僅 double layer 需要
 * @returns {object} 結果（見下方 return）
 */
function computeWinding(cfg) {
  const Q = cfg.Q, P = cfg.P, layers = cfg.layers;
  const m = 3; // 固定三相

  if (!Number.isInteger(Q) || Q < 3) {
    return { feasible: false, reason: 'invalidQ' };
  }
  if (!Number.isInteger(P) || P < 2 || P % 2 !== 0) {
    return { feasible: false, reason: 'invalidP' };
  }
  if (Q % m !== 0) {
    return { feasible: false, reason: 'notDivisibleByM' };
  }

  const p = P / 2;                    // 極對數
  const t = gcd(Q, p);                // 對稱重複單元數
  const qDenRaw = 2 * p * m;
  const g = gcd(Q, qDenRaw);
  const q = { num: Q / g, den: qDenRaw / g, value: Q / qDenRaw };

  /* 對稱三相繞組存在的充要條件：q（最簡分數）的分母不可被 m 整除。
     分母被 m 整除時，60° 相帶會系統性地只落在部分相上，
     產生不平衡繞組（某相導體數為 0），無法組成對稱三相繞組。 */
  if (q.den % m === 0) {
    return { feasible: false, reason: 'unbalancedWinding' };
  }

  /* 單層繞組另有額外充要條件（每槽僅 1 導體邊，需能兩兩配對成線圈，
     經對照多組已知繞組係數標準值反推得出）：
       - 槽數必須為偶數（奇數槽無法把每槽 1 邊兩兩配成線圈）
       - q 為整數（分母=1）時恆可行（標準整數槽單層繞組）
       - q 為真分數時，最簡分子若為 1 或可被 m 整除，會退化成
         每相導體集中在單一電機角、算出虛高且不可實際繞製的係數，
         此時單層不可行；分子為其他值時可行 */
  const singleLayerValid = (Q % 2 === 0) &&
    (q.den === 1 || (q.num !== 1 && q.num % m !== 0));
  if (layers === 'single' && !singleLayerValid) {
    return { feasible: false, reason: 'singleLayerNotConstructible' };
  }

  const elecStepDeg = (p * 360) / Q;  // 相鄰槽電機角差
  const fullPitchSlots = Q / P;       // 理論全節距（槽數，可能非整數）

  /* 逐槽計算 EMF 相量角度與相帶（= 上層 / single layer 唯一層） */
  const slots = [];
  for (let k = 0; k < Q; k++) {
    const angleDeg = (((k * elecStepDeg) % 360) + 360) % 360;
    const sector = Math.floor(angleDeg / 60) % 6;
    const belt = PHASE_SECTOR_MAP[sector];
    slots.push({
      index: k,
      angleDeg,
      top: { phase: belt.phase, sign: belt.sign },
      bottom: null,
    });
  }

  /* 雙層繞組：下層由節距 W 決定（同一線圈的回程邊，方向相反） */
  let span = null;
  if (layers === 'double') {
    span = cfg.span;
    if (!Number.isInteger(span) || span < 1 || span > Q - 1) {
      return { feasible: false, reason: 'invalidSpan' };
    }
    for (let k = 0; k < Q; k++) {
      const srcIdx = (((k - span) % Q) + Q) % Q;
      const src = slots[srcIdx];
      slots[k].bottom = { phase: src.top.phase, sign: -src.top.sign };
    }
  }

  /* 基波（ν=1）繞組係數：每相所有導體邊相量和的量值 / 導體邊數 */
  const acc = { A: { x: 0, y: 0, n: 0 }, B: { x: 0, y: 0, n: 0 }, C: { x: 0, y: 0, n: 0 } };
  function add(side, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const a = acc[side.phase];
    a.x += side.sign * Math.cos(rad);
    a.y += side.sign * Math.sin(rad);
    a.n += 1;
  }
  slots.forEach(s => {
    add(s.top, s.angleDeg);
    if (s.bottom) add(s.bottom, s.angleDeg);
  });
  const kw = {};
  const sidesPerPhase = {};
  ['A', 'B', 'C'].forEach(ph => {
    const a = acc[ph];
    kw[ph] = a.n > 0 ? Math.sqrt(a.x * a.x + a.y * a.y) / a.n : 0;
    sidesPerPhase[ph] = a.n;
  });
  const windingFactor = (kw.A + kw.B + kw.C) / 3;

  return {
    feasible: true,
    Q, P, p, m, t, q,
    elecStepDeg, fullPitchSlots, span,
    slots,
    windingFactor,
    windingFactorByPhase: kw,
    sidesPerPhase,
  };
}

/** 雙層繞組建議節距（四捨五入到最近整數槽，clamp 到合法範圍） */
function suggestSpan(Q, P) {
  return Math.max(1, Math.min(Q - 1, Math.round(Q / P)));
}

/**
 * 慣例節距：q<1（分數槽集中繞組）恆用單齒節距 1；
 * q≥1（整數槽／重疊分數槽）用最接近全節距的整數槽
 * （chording 只會讓 kw1 變小，故最接近全節距即為該類型下的最大值）
 */
function conventionalSpan(Q, P) {
  const p = P / 2, m = 3;
  const qVal = Q / (2 * p * m);
  return qVal < 1 ? 1 : suggestSpan(Q, P);
}

/**
 * 給定槽極組合，取雙層（慣例節距）與單層（若可行）中較高的基波繞組係數，
 * 供槽極比較表使用。
 * @returns {{feasible:boolean, value?:number, layers?:'single'|'double', span?:number}}
 */
function bestWindingFactor(Q, P) {
  if (!Number.isInteger(Q) || Q < 3 || !Number.isInteger(P) || P < 2 || P % 2 !== 0) {
    return { feasible: false };
  }
  const span = conventionalSpan(Q, P);
  const dbl = computeWinding({ Q, P, layers: 'double', span });
  const sgl = computeWinding({ Q, P, layers: 'single' });

  let best = null;
  if (dbl.feasible) best = { value: dbl.windingFactor, layers: 'double', span };
  if (sgl.feasible && (!best || sgl.windingFactor > best.value)) {
    best = { value: sgl.windingFactor, layers: 'single' };
  }
  if (!best) return { feasible: false };
  return Object.assign({ feasible: true }, best);
}
