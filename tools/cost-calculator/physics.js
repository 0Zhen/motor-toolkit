'use strict';
/* ══════════════════════════════════════════════════════════
   Cost Calculator — physics.js
   純計算層：矽鋼片／銅／磁鐵／轉子鴨籠材料成本估算。不含 DOM 邏輯。

   範圍與簡化（MVP，使用者已確認）：
   - 只算材料成本（重量×單價），不含加工/人工/良率/損耗。
   - 矽鋼片用毛胚環形面積（定子OD/ID、轉子OD/ID 各自的圓環），
     不扣除槽開口面積。
   - 導線總長用 DCR Calculator 同一套簡化 MLT 模型：MLT = 積厚 × MLT係數。
   - 感應馬達轉子鴨籠簡化成「總重直接輸入」，不做導條/端環幾何細節。
   - 幣別固定 USD（$/kg）。
   ══════════════════════════════════════════════════════════ */

const CC_DENSITY = {
  steelDefault: 7650,   // kg/m³ 矽鋼片
  copperDefault: 8960,  // kg/m³
};

/* 矽鋼片／磁鐵牌號-密度-單價對照表是使用者可編輯資料（含 localStorage 持久化），
   不是固定常數，改放在 app.js（見 DEFAULT_STEEL_GRADES / DEFAULT_MAGNET_GRADES）。 */

/* ── 小工具 ── */
function ccCircleArea(d) { return Math.PI / 4 * d * d; }              // d,面積同單位平方
function ccAnnulusArea(od, id) { return Math.PI / 4 * (od * od - id * id); } // mm²

/**
 * 矽鋼片成本（定子+轉子鐵芯毛胚環形面積，不扣槽面積）。
 * @param {object} p statorOD, statorID, rotorOD, rotorID, stack [mm], stackFactor, density [kg/m³], price [$/kg]
 */
function ccSteelCost(p) {
  const statorArea = ccAnnulusArea(p.statorOD, p.statorID); // mm²
  const rotorArea = ccAnnulusArea(p.rotorOD, p.rotorID);
  const volumeMm3 = (statorArea + rotorArea) * p.stack * p.stackFactor;
  const weightKg = volumeMm3 * 1e-9 * p.density;
  const cost = weightKg * p.price;
  return { weightKg: weightKg, cost: cost };
}

/**
 * 繞組銅材成本（通用：定子槽繞組或 EESM 轉子極繞組共用同一公式）。
 * 總長 = (每單元匝數 × 單元數) × MLT；MLT = mlt(若給定) 或 stack × mltFactor。
 * @param {number} turnsPerUnit 每槽或每極匝數
 * @param {number} unitCount 槽數或極數
 * @param {number} wireDia 裸銅線徑 [mm]
 * @param {number} stack 積厚 [mm]
 * @param {number} mltFactor MLT 係數（stack 留空時用）
 * @param {number} density 銅密度 [kg/m³]
 * @param {number} price 銅價 [$/kg]
 * @param {number|null} mltOverride 直接指定 MLT [mm]（留空則用 stack×mltFactor）
 */
function ccWindingCopperCost(turnsPerUnit, unitCount, wireDia, stack, mltFactor, density, price, mltOverride) {
  const mlt = (mltOverride != null && mltOverride > 0) ? mltOverride : stack * mltFactor; // mm
  const totalTurns = turnsPerUnit * unitCount;
  const lengthM = totalTurns * mlt / 1000;
  const areaM2 = ccCircleArea(wireDia) * 1e-6;
  const weightKg = lengthM * areaM2 * density;
  const cost = weightKg * price;
  return { weightKg: weightKg, cost: cost, mlt: mlt };
}

/**
 * PMSM 磁鐵成本。磁鐵用量 = 單極面積 × 極數（使用者確認的簡化輸入方式）。
 * @param {number} areaPerPole 單極磁鐵面積 [mm²]
 * @param {number} poles 極數
 * @param {number} stack 積厚 [mm]（假設磁鐵軸向長度＝積厚）
 * @param {number} density 磁鐵密度 [kg/m³]
 * @param {number} price 磁鐵價 [$/kg]
 */
function ccMagnetCost(areaPerPole, poles, stack, density, price) {
  const volumeMm3 = areaPerPole * poles * stack;
  const weightKg = volumeMm3 * 1e-9 * density;
  const cost = weightKg * price;
  return { weightKg: weightKg, cost: cost };
}

/**
 * 感應馬達轉子鴨籠成本（簡化：直接輸入總重）。
 * @param {number} weightKg 轉子鴨籠總重 [kg]
 * @param {number} price 轉子材料價 [$/kg]
 */
function ccRotorCageCost(weightKg, price) {
  return { weightKg: weightKg, cost: weightKg * price };
}

/**
 * 彙總成本明細，附加各項佔比。
 * @param {Array<{key:string, weightKg:number, cost:number}>} items
 */
function ccSummarize(items) {
  const total = items.reduce(function (s, it) { return s + it.cost; }, 0);
  const rows = items.map(function (it) {
    return {
      key: it.key,
      weightKg: it.weightKg,
      cost: it.cost,
      sharePct: total > 0 ? (it.cost / total * 100) : 0,
    };
  });
  return { rows: rows, total: total };
}
