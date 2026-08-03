'use strict';
/* ══════════════════════════════════════════════════════════
   DCR Calculator — physics.js
   純計算層：匝數／線徑／DCR／槽滿率換算公式。不含任何 DOM 邏輯。

   兩種模式：
   ① Quick（校準模式）：只需要目前設計的 (N0, d0, R0) 一個實測/模擬點，
      鎖定結線面積 A=N×(π/4)d² 為常數反推等效係數，換算時不需要知道
      槽面積、MLT、電阻率等細節。
   ② Full（完整幾何模式）：需要槽面積、MLT、線材與工況，算絕對 DCR
      與絕對槽滿率，並可對線徑範圍做掃描表。
   ══════════════════════════════════════════════════════════ */

/* ── 材料常數 ──
   電阻溫度換算採「推定絕對零電阻溫度」法：R(T) = R(Tref) × (T+T0)/(Tref+T0)
   銅 T0=234.5°C、鋁 T0=225°C 為業界慣用值。 */
const MATERIALS = {
  cu: { label: 'Copper', label_zh: '銅', rho20: 1.724e-8, T0: 234.5 }, // Ω·m @20°C
  al: { label: 'Aluminum', label_zh: '鋁', rho20: 2.82e-8, T0: 225.0 },
};

function resistivityAt(material, tempC) {
  const m = MATERIALS[material];
  return m.rho20 * (tempC + m.T0) / (20 + m.T0);
}

function tempCorrectR(R1, T1, T2, material) {
  const m = MATERIALS[material];
  return R1 * (T2 + m.T0) / (T1 + m.T0);
}

/* ── 通用小工具 ── */
function circleArea(d) { return Math.PI / 4 * d * d; } // d,面積同單位平方
function snapStep(v, step) { return Math.round(v / step) * step; }

/**
 * 槽極配衍生資訊：極對數、每極每相槽數 q。
 * q 為整數 → 整數槽分佈繞；q 為分數（如 0.4）→ 分數槽集中繞（10極12槽這類常見風扇馬達配置）。
 */
function windingLayoutInfo(poles, slots, phases) {
  const polePairs = poles / 2;
  const q = slots / (poles * phases);
  const suggestedSeriesCoils = slots / phases; // 單層/全串聯時的典型值，僅供建議
  return { polePairs, q, suggestedSeriesCoils };
}

/* ══════════════════════════════════════════════════════════
   ① Quick 校準模式
   ══════════════════════════════════════════════════════════ */

/**
 * 由目前設計的實測點反推兩個等效係數：
 *   A0 = N0 × (π/4) × d0²         結線面積基準（鎖定用）
 *   K  = R0 / N0²                 面積守恆關係 R=K×N²（改N、d同時變動時用）
 *   C  = R0 × d0² / N0            通用關係 R=C×N/d²（N、d 各自獨立時用，恆成立）
 */
function quickCalibrate(N0, d0, R0) {
  const A0 = N0 * circleArea(d0);
  const K = R0 / (N0 * N0);
  const C = R0 * d0 * d0 / N0;
  return { N0, d0, R0, A0, K, C };
}

/**
 * 給定其中一個變數（匝數 / 線徑 / DCR），算出理論連續解與 snap 後的實際可用值。
 * @param {{turns?:number, wire?:number, dcr?:number}} input 只能給一個
 * @param {object} calib quickCalibrate() 回傳值
 * @param {number} wireStep 線徑可選級距，如 0.1
 */
function quickSolve(input, calib, wireStep) {
  const { A0, K, C } = calib;
  let nIdeal;
  if (input.turns != null) {
    nIdeal = input.turns;
  } else if (input.wire != null) {
    nIdeal = 4 * A0 / (Math.PI * input.wire * input.wire);
  } else if (input.dcr != null) {
    nIdeal = Math.sqrt(input.dcr / K);
  } else {
    throw new Error('quickSolve: need one of turns / wire / dcr');
  }
  const dIdeal = Math.sqrt(4 * A0 / (Math.PI * nIdeal));

  const nPractical = Math.max(1, Math.round(nIdeal));
  const dPractical = input.wire != null ? snapStep(input.wire, wireStep) : snapStep(dIdeal, wireStep);
  const rPractical = C * nPractical / (dPractical * dPractical);
  const fillRatio = (nPractical * dPractical * dPractical) / (calib.N0 * calib.d0 * calib.d0);

  return {
    nIdeal, dIdeal,
    nPractical, dPractical, rPractical,
    fillRatioPct: fillRatio * 100,
  };
}

/* ══════════════════════════════════════════════════════════
   ② Full 完整幾何模式
   ══════════════════════════════════════════════════════════ */

/**
 * @param {object} p
 *   phases, connection ('Y'|'D'), parallelPaths, turnsPerSlot, coilsPerSlot,
 *   seriesCoilsPerPhase, strandsPerTurn,
 *   bareDia, enamelThk, material ('cu'|'al'),
 *   stackLength, mlt (null→用 mltFactor 估), mltFactor,
 *   slotArea, tempC
 */
function fullSolve(p) {
  const od = p.bareDia + 2 * p.enamelThk;
  const strandArea = circleArea(p.bareDia);
  const strandAreaOD = circleArea(od);

  const mlt = (p.mlt != null && p.mlt > 0) ? p.mlt : p.stackLength * p.mltFactor;

  const slotCopperAreaOD = p.turnsPerSlot * p.coilsPerSlot * p.strandsPerTurn * strandAreaOD;
  const fillPct = slotCopperAreaOD / p.slotArea * 100;

  const seriesTurnsTotal = p.turnsPerSlot * p.seriesCoilsPerPhase;
  const rho = resistivityAt(p.material, p.tempC);
  // R = ρ × N_series × MLT / (股數×裸銅截面積 × a²)   [ρ單位Ω·m，其餘用mm→需統一單位]
  const rPhase = rho * seriesTurnsTotal * (mlt / 1000) /
    (p.strandsPerTurn * strandArea / 1e6 * p.parallelPaths * p.parallelPaths);

  const rLine = p.connection === 'Y' ? 2 * rPhase : (2 / 3) * rPhase;

  return { od, mlt, fillPct, seriesTurnsTotal, rPhase, rLine };
}

/**
 * 線徑掃描表：固定槽面積＋目標槽滿率，掃描一段線徑範圍，
 * 對每個線徑算出可繞匝數（floor）、實際槽滿率、DCR。
 * @param {object} p 同 fullSolve 的參數（turnsPerSlot 會被掃描結果取代，其餘沿用）
 * @param {number} targetFillPct 目標槽滿率 %
 * @param {number} dMin,dMax,dStep 線徑掃描範圍 mm
 */
function sweepWireTable(p, targetFillPct, dMin, dMax, dStep) {
  const rows = [];
  const mlt = (p.mlt != null && p.mlt > 0) ? p.mlt : p.stackLength * p.mltFactor;
  const rho = resistivityAt(p.material, p.tempC);
  const allowedCopperArea = p.slotArea * (targetFillPct / 100);

  for (let d = dMin; d <= dMax + 1e-9; d += dStep) {
    const dRound = Math.round(d * 1000) / 1000;
    const od = dRound + 2 * p.enamelThk;
    const strandAreaOD = circleArea(od);
    const strandArea = circleArea(dRound);

    const nSlotMax = Math.floor(allowedCopperArea / (p.coilsPerSlot * p.strandsPerTurn * strandAreaOD));
    if (nSlotMax < 1) { rows.push({ d: dRound, nSlot: 0, fillPct: 0, rPhase: null, rLine: null }); continue; }

    const actualFillPct = (nSlotMax * p.coilsPerSlot * p.strandsPerTurn * strandAreaOD) / p.slotArea * 100;
    const seriesTurnsTotal = nSlotMax * p.seriesCoilsPerPhase;
    const rPhase = rho * seriesTurnsTotal * (mlt / 1000) /
      (p.strandsPerTurn * strandArea / 1e6 * p.parallelPaths * p.parallelPaths);
    const rLine = p.connection === 'Y' ? 2 * rPhase : (2 / 3) * rPhase;

    rows.push({ d: dRound, nSlot: nSlotMax, fillPct: actualFillPct, rPhase, rLine });
  }
  return rows;
}
