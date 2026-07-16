'use strict';
/* ══════════════════════════════════════════════════════════
   Working Point Explorer — physics.js
   純計算層：馬達預設值、可調參數定義、物理公式、二分法求解、
   油品資料庫與 Walther Equation。不含任何 DOM / UI 邏輯。
   ══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   管理者設定區
   ══════════════════════════════════════════════════════════
   新增馬達：複製一個 {} 區塊貼上並填入參數。

   必填欄位：
     name    顯示在下拉選單的名稱
     N_ref   實測基準轉速 [RPM]
     TA_ref  實測負載係數 [μN·m]

   選填欄位（未填則使用 PARAMS 的 init 預設值）：
     Ke      反電動勢常數 [mV/krpm]
     R_C     線圈電阻 [Ω]
     D_shaft 軸徑 [mm]
     L_shaft 軸長 [mm]
     G_film  油膜間隙 [μm]
     Vc      運動黏度 [mm²/s]
     D_oil   油品比重 [-]
     V_rated 額定電壓 [V]
   ══════════════════════════════════════════════════════════ */
const MOTORS = [
  // 通用示例值（非任何實際產品的實測資料）
  {
    name:   'Example Motor A',
    N_ref:  15000,   // 實測基準轉速 [RPM]
    TA_ref: 10.00,   // 實測負載係數 [μN·m]
    Ke:     50.00,   // 反電動勢常數 [mV/krpm]
    R_C:    16.00,   // 線圈電阻 [Ω]
  },
  {
    name:   'Example Motor B',
    N_ref:  18000,
    TA_ref: 20.00,
    // 其餘欄位未設定 → 使用 PARAMS init 預設值
  },
];

/** 可調設計參數定義（使用者透過滑桿或輸入框調整） */
const PARAMS = [
  { key: 'D_shaft', label: 'D_shaft [mm]',  min: 0.1, max: 5,   init: 0.80, step: 0.05, zh: 'Shaft diameter'       },
  { key: 'L_shaft', label: 'L_shaft [mm]',  min: 0.5, max: 10,  init: 2.10, step: 0.10, zh: 'Shaft length'       },
  { key: 'G_film',  label: 'G_film [μm]',   min: 0.5, max: 20,  init: 2.50, step: 0.10, zh: 'Oil film gap'   },
  { key: 'Vc',      label: 'Vc [mm²/s]',    min: 1,   max: 1500, init: 44.1, step: 0.5,  zh: 'Kinematic viscosity'   },
  { key: 'D_oil',   label: 'D_oil [-]',     min: 0.5, max: 2,   init: 0.89, step: 0.01, zh: 'Oil specific gravity'   },
  { key: 'Ke',      label: 'Ke [mV/krpm]',  min: 10,  max: 200, init: 50.8, step: 1.0,  zh: 'Back-EMF constant' },
  { key: 'R_C',     label: 'R_C [Ω]',       min: 1,   max: 80,  init: 16.5, step: 0.5,  zh: 'Coil resistance'   },
  { key: 'V_rated', label: 'V_rated [V]',   min: 1.5, max: 12,  init: 3.0,  step: 0.1,  zh: 'Rated voltage'   },
];

/** 曲線掃描上限（內部使用），不給使用者調整 */
const N_MAX = 200000; // [RPM]


/* ══════════════════════════════════════════════════════════
   物理公式
   ══════════════════════════════════════════════════════════ */

/**
 * 從目前 state 衍生出計算用的物理量
 * @returns {{ Vkc, Kt, R_m, L_m, G_m }}
 */
function getDerived(p) {
  return {
    Vkc: p.Vc * p.D_oil * 1e-3,          // 動力黏度 [Pa·s]
    Kt:  p.Ke * 9.5493e-6,               // 扭矩常數 [Nm/A]
    R_m: (p.D_shaft * 1e-3) / 2,         // 軸半徑 [m]
    L_m: p.L_shaft * 1e-3,              // 軸長 [m]
    G_m: p.G_film  * 1e-6,              // 油膜間隙 [m]
  };
}

/**
 * Petroff 軸承摩擦力矩 T_F [μN·m]
 * T_F = 2π × Vkc × L × ω × R³ / G × 1e6
 */
function T_F_at(N, d) {
  const omega = 2 * Math.PI * N / 60;   // 角速度 [rad/s]
  return 2 * Math.PI * d.Vkc * d.L_m * omega * Math.pow(d.R_m, 3) / d.G_m * 1e6;
}

/**
 * 反電勢 E [V]
 * E = Ke × N/1000 × 1e-3
 */
function E_at(N, Ke) {
  return Ke * (N / 1000) * 1e-3;
}

/**
 * 實測拋物線：T_A = T_A_ref × (N/N_ref)² [μN·m]
 * 代表馬達在轉速 N 時的實際氣動負載
 */
function T_A_at(N) {
  return state.TA_ref * Math.pow(N / state.N_ref, 2);
}

/**
 * 邊界函式 f(N) = V_sum(N) - V_rated
 * f(N) = 0 時即為工作點（拋物線與邊界曲線的交點）
 *
 * V_sum = E + V_drop
 *       = E + 2 × (T_A + T_F) × 1e-6 / Kt × R_C
 */
function fBoundary(N, d) {
  const T_F    = T_F_at(N, d);
  const T_A    = T_A_at(N);
  const I_in   = (T_A + T_F) * 1e-6 / d.Kt;
  const E      = E_at(N, state.Ke);
  const V_drop = 2 * I_in * state.R_C;
  return E + V_drop - state.V_rated;
}

/**
 * 計算給定轉速 N 下的所有工作點輸出量
 * @returns {{ T_F, T_A, T_sum, I_in, E, V_drop, V_sum, P_in, eta_mech }}
 *
 * η_mech = T_A × ω / P_in × 100  [%]
 *   P_out_mech = T_A [μN·m] × 1e-6 × ω [rad/s]  [W]
 */
function opDetails(N, d) {
  const T_F    = T_F_at(N, d);
  const T_A    = T_A_at(N);
  const T_sum  = T_A + T_F;
  const I_in   = T_sum * 1e-6 / d.Kt;
  const E      = E_at(N, state.Ke);
  const V_drop = 2 * I_in * state.R_C;
  const V_sum  = E + V_drop;
  const P_in   = state.V_rated * I_in;
  const omega    = 2 * Math.PI * N / 60;
  const P_out    = T_sum * 1e-6 * omega;  // 總機械輸出（T_sum，含氣動+摩擦）
  const eta_mech = P_in > 0 ? P_out / P_in * 100 : 0;
  return { T_F, T_A, T_sum, I_in, E, V_drop, V_sum, P_in, eta_mech };
}

/**
 * 二分法求工作點：在 [N_lo, N_hi] 搜尋使 f(N) = 0 的 N
 * 精度 0.1 RPM，最多迭代 80 次
 */
function bisect(d, N_lo, N_hi) {
  let flo = fBoundary(N_lo, d);
  let fhi = fBoundary(N_hi, d);
  if (flo * fhi > 0) return null; // 無符號改變，此區間無解

  for (let i = 0; i < 80; i++) {
    const mid  = (N_lo + N_hi) / 2;
    const fmid = fBoundary(mid, d);
    if (Math.abs(N_hi - N_lo) < 0.1) return mid;
    if (flo * fmid <= 0) { N_hi = mid; fhi = fmid; }
    else                  { N_lo = mid; flo = fmid; }
  }
  return (N_lo + N_hi) / 2;
}


/* ══════════════════════════════════════════════════════════
   油品資料庫與 Walther Equation
   ══════════════════════════════════════════════════════════
   Walther Equation：
     log10(log10(v + C)) = A - B × log10(T)
     其中 T 為絕對溫度 [K] = °C + 273.15，C ≅ 0.7

   由兩個標定點（T1, v1）和（T2, v2）求解 A、B：
     B = [log10(log10(v1+C)) - log10(log10(v2+C))] / [log10(T2) - log10(T1)]
     A = log10(log10(v1+C)) + B × log10(T1)

   求任意溫度 T3 的黏度 v3：
     v3 = 10^(10^(A - B×log10(T3))) - C
   ══════════════════════════════════════════════════════════ */

/**
 * 油品資料庫
 * ──────────────────────────────────────────────────────────
 * 新增油品：複製一個 {} 區塊並填入以下欄位：
 *   name:   油品名稱（顯示在下拉選單）
 *   T1, v1: 第一標定點溫度 [°C] 和動黏度 [mm²/s]
 *   T2, v2: 第二標定點溫度 [°C] 和動黏度 [mm²/s]
 *   C:      黏度常數（選填，未填預設 0.7）
 *   D_oil:  油品比重（選填，若有設定則切換油品時更新滑桿）
 *   Vc_ref: 參考黏度 [mm²/s]（選填，若有設定則切換油品時更新 Vc 滑桿初始值）
 * ──────────────────────────────────────────────────────────
 */
const OIL_DB = [
  {
    name:   'Oil A (VG32-class)',
    T1: 40,  v1: 29.3,   // 40°C 動黏度 [mm²/s]
    T2: 100, v2: 5.70,   // 100°C 動黏度 [mm²/s]
    C:    0.7,        // 黏度常數（未填自動使用 0.7）
    // D_oil: 0.89,      // 油品比重（選填）
    // Vc_ref: 44.1,     // 參考黏度，用於設定滑桿初始值（選填）
  },
  {
    name:   'Oil B (low-viscosity)',
    D_oil: 0.89,      // 油品比重（選填）
    Vc_ref: 17.8,     // 參考黏度，用於設定滑桿初始值（選填）
  },
];

const WALTHER_C = 0.7; // 黏度常數

/**
 * 由兩個標定點求 Walther 常數 A、B
 * @param {number} T1_C  - 第一標定溫度 [°C]
 * @param {number} v1    - T1 時的動黏度 [mm²/s]
 * @param {number} T2_C  - 第二標定溫度 [°C]
 * @param {number} v2    - T2 時的動黏度 [mm²/s]
 * @returns {{ A, B }}
 */
function waltherAB(T1_C, v1, T2_C, v2, C) {
  C = (C !== undefined) ? C : WALTHER_C;
  const T1 = T1_C + 273.15;
  const T2 = T2_C + 273.15;
  const W1 = Math.log10(Math.log10(v1 + C));
  const W2 = Math.log10(Math.log10(v2 + C));
  const B  = (W1 - W2) / (Math.log10(T2) - Math.log10(T1));
  const A  = W1 + B * Math.log10(T1);
  return { A, B };
}

/**
 * 由 Walther 常數求指定溫度的動黏度
 * @param {number} A, B  - Walther 常數
 * @param {number} T_C   - 目標溫度 [°C]
 * @returns {number}     動黏度 [mm²/s]
 */
function waltherVc(A, B, T_C, C) {
  C = (C !== undefined) ? C : WALTHER_C;
  const T = T_C + 273.15;
  return Math.pow(10, Math.pow(10, A - B * Math.log10(T))) - C;
}

/**
 * 取得油品的 Walther 常數 {A, B, C}
 * 從兩個標定點計算 A、B；C 未填則預設 0.7
 */
function getOilABC(oil) {
  const C = (oil.C !== undefined) ? oil.C : WALTHER_C;
  const { A, B } = waltherAB(oil.T1, oil.v1, oil.T2, oil.v2, C);
  return { A, B, C };
}
