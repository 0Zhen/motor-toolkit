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

/** 圓周上兩槽的最短距離（槽數），用來挑「就近」的跳線目標 */
function circularSlotDist(Q, a, b) {
  const d = Math.abs(a - b) % Q;
  return Math.min(d, Q - d);
}

/**
 * 貪婪就近法把同一相的線圈串成一條鏈：從第一顆線圈的「進」端開始，繞到它的
 * 「出」端後，在還沒用過的線圈裡找「進」端跟目前位置槽號最近的那一顆接上去，
 * 重複到全部線圈用完。模擬真實繞線機的接線方式——線圈本身的方向固定是
 * 「−進、+出」（不能反過來，這是線圈本身的物理特性決定的），跳線只能接
 * 「出→進」（+接+或−接−都不合法），且優先選最近的槽以縮短跳線距離。
 * 取代舊版「照回程邊槽號排序、頭尾硬接」的 MVP 假設（會接出「出接出」這種
 * 不合法的跳線，例如某槽兩條都是同號時無法直接同槽相接）。
 */
function chainByNearestEntry(Q, coils) {
  if (!coils.length) return []; // 某相在這個槽極組合下一顆線圈也沒配到（見 buildSingleLayerChains 的說明），避免 remaining.shift() 出來的 undefined 炸掉下面
  const remaining = coils.slice();
  const ordered = [remaining.shift()];
  while (remaining.length) {
    let bestIdx = 0, bestDist = Infinity;
    remaining.forEach(function (c, i) {
      const d = circularSlotDist(Q, ordered[ordered.length - 1].exit.k, c.entry.k);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered.map(function (c) {
    return { goK: c.entry.k, goTop: c.entry.top, retK: c.exit.k, retTop: c.exit.top };
  });
}

/**
 * 依相別把雙層繞組的所有線圈串成一條序列。每顆線圈的兩條邊（槽 k 的下半、
 * 槽 k−span 的上半）固定同相；用正負號決定哪端是「進」（−）、哪端是
 * 「出」（+），再用 chainByNearestEntry() 依「出→進、就近」的規則接成鏈。
 * 每個線圈以 { goK, goTop, retK, retTop } 表示進／出端所在槽索引與上下半。
 * @returns {{A:Array, B:Array, C:Array}|null} 單層繞組無此結構，回傳 null
 */
function buildPhaseChains(result) {
  if (!result.feasible || !result.slots.length || !result.slots[0].bottom) return null;
  const Q = result.Q, W = result.span;
  const byPhase = { A: [], B: [], C: [] };
  for (let k = 0; k < Q; k++) {
    const bottom = result.slots[k].bottom;
    const topK = (((k - W) % Q) + Q) % Q;
    const top = result.slots[topK].top;
    const bottomIsEntry = bottom.sign < 0;
    const entry = bottomIsEntry ? { k: k, top: false } : { k: topK, top: true };
    const exit = bottomIsEntry ? { k: topK, top: true } : { k: k, top: false };
    byPhase[bottom.phase].push({ entry: entry, exit: exit });
  }
  const chains = {};
  ['A', 'B', 'C'].forEach(function (phase) { chains[phase] = chainByNearestEntry(Q, byPhase[phase]); });
  return chains;
}

/**
 * 給定相別的線圈序列，展開成頭尾相接的端點序列
 * [coil0.go, coil0.ret, coil1.go, coil1.ret, ...]，相鄰兩點即為一段連接弧；
 * 每個端點是 { k, top }，top 標明這端是槽 k 的上半還是下半（進出端不一定
 * 固定在上半或下半，要照 top 欄位查，不能再用陣列索引奇偶推算）。
 */
function phaseWaypoints(coils) {
  const wp = [];
  coils.forEach(function (c) {
    wp.push({ k: c.goK, top: c.goTop });
    wp.push({ k: c.retK, top: c.retTop });
  });
  return wp;
}

/** 把連續槽依「同相」合併成一組（僅比對相鄰，不處理跨越槽1的回捲合併），單層用 */
function groupConsecutiveSlots(Q, phaseAt) {
  const groups = [];
  let i = 0;
  while (i < Q) {
    const ph = phaseAt(i);
    let j = i;
    while (j + 1 < Q && phaseAt(j + 1) === ph) j++;
    groups.push({ startK: i, endK: j, phase: ph });
    i = j + 1;
  }
  return groups;
}

/**
 * 單層（集中繞組）齒配對：把連續同相的齒兩兩配成一個線圈單元（相鄰齒一正
 * 一負，物理上是同一枚集中繞組線圈的兩端）。若頭尾兩段剛好同相且都落單一顆，
 * 視為跨越槽1／槽Q接縫的一對（`wraps:true`）——沿圓周本來就相鄰，只是陣列
 * 上斷成兩截；這一對是真實存在的線圈，不能丟掉（否則 sidesPerPhase 會少算），
 * `buildSingleLayerChains()` 串鏈時一併當作正常線圈處理即可（圓周拓樸下沒有
 * 「跨接縫」這種特例，`chainByNearestEntry` 的環狀距離本來就吃得下）。
 */
function buildSingleLayerPairs(result) {
  const Q = result.Q;
  const runs = groupConsecutiveSlots(Q, function (k) { return result.slots[k].top.phase; });
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

/**
 * 依相別把單層繞組的所有線圈（`buildSingleLayerPairs` 配對出的齒對）串成一條
 * 序列，串接規則與 `buildPhaseChains`（雙層）完全一樣：線圈固定「−進+出」、
 * 跳線只能「出接進」、優先接最近槽號。單層每槽只有一個導體邊（`top`），沒有
 * 上下半之分，waypoint 一律標 `top:true`（下游 `phaseWaypoints`/`buildChainPath`
 * 只認 `.k`/`.top` 欄位，沿用即可，不用另外寫一套）。
 * @returns {{A:Array, B:Array, C:Array}|null} 雙層繞組無此結構，回傳 null
 */
function buildSingleLayerChains(result) {
  if (!result.feasible || !result.slots.length || result.slots[0].bottom) return null;
  const Q = result.Q;
  const pairs = buildSingleLayerPairs(result);
  const byPhase = { A: [], B: [], C: [] };
  pairs.forEach(function (p) {
    const aSign = result.slots[p.aK].top.sign;
    const entryK = aSign < 0 ? p.aK : p.bK;
    const exitK = aSign < 0 ? p.bK : p.aK;
    byPhase[p.phase].push({ entry: { k: entryK, top: true }, exit: { k: exitK, top: true } });
  });
  const chains = {};
  ['A', 'B', 'C'].forEach(function (phase) { chains[phase] = chainByNearestEntry(Q, byPhase[phase]); });
  return chains;
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
