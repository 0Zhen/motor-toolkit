'use strict';
/* ══════════════════════════════════════════════════════════
   Slot Packing Viewer — resistance.js
   集中繞線圈的平均匝長（MLT）與繞組電阻。純計算，不碰 DOM。

   計算方式比照 siderpan「電阻計算」（已用實測驗證的外轉子方法）：
   https://github.com/siderpan/winding-resistance-calculator
     L' = L + 2i        b' = b + 2i        r₀ ≤ min(L', b')/2
     每根導線的匝長  ℓ = 2(L'−2r₀) + 2(b'−2r₀) + 2π(r₀ + c)
       c ＝ 導線中心到絕緣面（齒面 + 絕緣）的距離
     每股線長 = Σℓ ÷ n_s，  MLT = 每股線長 ÷ N   （＝ 所有導線 ℓ 的平均）
     R_coil = ρ · 每股線長 / (A · n_s)，A = π/4 · d²（裸銅）
     R_ph   = [R_coil · 線圈數/a + ρ · 引出線/(A · n_s)] / a
     Y：R_LL = 2·R_ph     Δ：R_LL = ⅔·R_ph
     R(T)   = R₂₀ · (234.5 + T) / 254.5
   差別只在 c 的來源：這裡是槽內排線實際擺出來的每根導線位置。
   ══════════════════════════════════════════════════════════ */

var COPPER_T0 = 234.5; // 銅的推定零電阻溫度 [°C]，ρ20 以 20 °C 為基準

function copperTempFactor(T) { return (COPPER_T0 + T) / (COPPER_T0 + 20); }

/** 齒部繞線外框：p = { L, b, i, r0 }（mm）。r0 超過 L'、b' 的一半時夾住。 */
function coilFrame(p) {
  var Lp = p.L + 2 * p.i, bp = p.b + 2 * p.i;
  var r0 = Math.min(Math.max(0, p.r0), Math.min(Lp, bp) / 2);
  return { Lp: Lp, bp: bp, r0: r0, r0Clamped: r0 < p.r0, straight: 2 * (Lp - 2 * r0) + 2 * (bp - 2 * r0) };
}

/** 離絕緣面 c（mm）的那一匝長度 */
function turnLength(frame, c) { return frame.straight + 2 * Math.PI * (frame.r0 + c); }

/** 一個線圈所有導線（含並繞股）的 c → MLT 與統計。cs：每根導線一個 c。 */
function coilMlt(cs, p) {
  var f = coilFrame(p);
  if (!cs.length) return Object.assign(f, { mlt: NaN, sum: 0, cMin: NaN, cMax: NaN, cMean: NaN, count: 0 });
  var sum = 0, cMin = Infinity, cMax = -Infinity;
  cs.forEach(function (c) { sum += turnLength(f, c); if (c < cMin) cMin = c; if (c > cMax) cMax = c; });
  var mlt = sum / cs.length;
  return Object.assign(f, {
    mlt: mlt, sum: sum, count: cs.length, cMin: cMin, cMax: cMax,
    cMean: (mlt - f.straight) / (2 * Math.PI) - f.r0, // 平均匝路徑離絕緣面的距離（畫側視圖用）
  });
}

/** p = { mlt, N, ns, d, rho (Ω·mm²/m), cpp, a, lead (mm／路), conn ('Y'|'D') } → 20 °C 的電阻 */
function windingResistance(p) {
  var strand = p.mlt * p.N;                      // mm，每股線長（一個線圈）
  var A = Math.PI / 4 * p.d * p.d;               // mm²
  var Rcoil = p.rho * (strand / 1000) / (A * p.ns);
  var Rlead = p.rho * (p.lead / 1000) / (A * p.ns);
  var Rph20 = (Rcoil * p.cpp / p.a + Rlead) / p.a;
  var kLL = p.conn === 'D' ? 2 / 3 : 2;
  return {
    strand: strand, A: A, Rcoil: Rcoil, Rlead: Rlead, Rph20: Rph20, kLL: kLL, RLL20: Rph20 * kLL,
    phaseLen: (strand * p.cpp + p.lead * p.a) / 1000, // m，每相線長（每股）
  };
}
