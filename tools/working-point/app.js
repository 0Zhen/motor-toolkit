'use strict';
/* ══════════════════════════════════════════════════════════
   Working Point Explorer — app.js
   state、事件 wiring、query 卡、sweep、updateAll、calibrateKe、
   UI helpers、初始化。
   ══════════════════════════════════════════════════════════ */

/**
 * 全域狀態物件：
 *   - PARAMS 各 key：設計參數目前值
 *   - N_ref, TA_ref：固定實測值（從 MOTORS 讀入）
 */
const state = {};
PARAMS.forEach(p => { state[p.key] = p.init; });
state.N_ref  = 15000;   // 實測基準轉速初始值
state.TA_ref = 10.00;   // 實測負載係數初始值

/** Query 圖卡相關狀態 */
const QUERY_COLORS = [
  '#f59e0b', '#10b981', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#6366f1', '#84cc16',
];
let queryList      = [];  // 所有已儲存的 Query 項目陣列
let queryIdCounter = 0;   // 自增 ID，確保每張圖卡 id 唯一


/* ══════════════════════════════════════════════════════════
   UI 建立：動態產生參數列（滑桿 + 輸入框）
   ══════════════════════════════════════════════════════════ */
const paramRowsEl = document.getElementById('paramRows');
PARAMS.forEach(p => {
  const row = document.createElement('div');
  row.className = 'param-row';
  row.innerHTML = `
    <span class="param-label" id="lbl_${p.key}">${p.label}<br><span style="font-size:7.5px;color:#9ca3af;font-weight:400">${p.zh || ''}</span></span>
    <input type="range" id="sl_${p.key}"
           min="${p.min}" max="${p.max}" step="${p.step}" value="${p.init}"
           oninput="onSlider('${p.key}', this.value)">
    <input type="text" id="in_${p.key}" class="param-input" value="${p.init}"
           onchange="onInput('${p.key}', this.value)">
  `;
  paramRowsEl.appendChild(row);


});

/**
 * 滑桿拖動事件：更新 state 與數字輸入框，觸發重算
 */
function onSlider(key, val) {
  val = parseFloat(val);
  state[key] = val;
  document.getElementById('in_' + key).value = val;
  updateParamLabels();
  updateAll();
}

/**
 * 數字輸入框 Enter/失焦事件：clamp 到合法範圍，同步滑桿，觸發重算
 */
function onInput(key, val) {
  const p = PARAMS.find(x => x.key === key);
  let v = parseFloat(val);
  if (isNaN(v)) return;
  v = Math.max(p.min, Math.min(p.max, v)); // clamp 到 min/max
  state[key] = v;
  document.getElementById('sl_' + key).value = v;
  document.getElementById('in_' + key).value = v;
  updateParamLabels();
  updateAll();
}

/**
 * 使用者直接修改 Measured Values（N_REF 或 T_A_ref）後觸發
 */
function onFixedInput(key, rawVal) {
  const v = parseFloat(rawVal);
  if (isNaN(v) || v <= 0) return; // 忽略無效輸入
  state[key] = v;
  updateAll();
}

/**
 * 更新所有參數標籤的 modified 狀態
 * 比較目前值與馬達預設值（或 PARAMS init）：
 *   有差異 → 加 modified class（橘色 + *）
 *   相同   → 移除 modified class
 */
function updateParamLabels() {
  const sel = document.getElementById('motorSelect');
  const m   = MOTORS[parseInt(sel.value)];
  PARAMS.forEach(function(p) {
    const labelEl = document.getElementById('lbl_' + p.key);
    if (!labelEl) return;
    // 馬達有設定 → 對比馬達值；未設定 → 對比 PARAMS init
    const baseVal = (m && m[p.key] !== undefined) ? m[p.key] : p.init;
    const curVal  = state[p.key];
    if (Math.abs(curVal - baseVal) > 1e-9) {
      labelEl.classList.add('modified');
    } else {
      labelEl.classList.remove('modified');
    }
  });
}


/* ══════════════════════════════════════════════════════════
   Motor 選擇器
   ══════════════════════════════════════════════════════════ */

/** 初始化 Motor 下拉選單，載入第一顆馬達 */
function initMotorSelect() {
  const sel = document.getElementById('motorSelect');
  MOTORS.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });
  if (MOTORS.length > 0) {
    sel.dataset.lastIdx = 0;
    onMotorSelect(0);
  }
}

/**
 * 切換馬達：
 *   N_ref、TA_ref → 直接更新 state 並顯示在輸入框
 *   其餘選填參數 → 有設定用設定值，沒設定用 PARAMS init 預設值
 */
function onMotorSelect(idx) {
  const m = MOTORS[parseInt(idx)];
  if (!m) return;

  // 更新固定實測值
  state.N_ref  = m.N_ref;
  state.TA_ref = m.TA_ref;
  document.getElementById('dispNref').value  = m.N_ref;
  document.getElementById('dispTAref').value = m.TA_ref.toFixed(2);

  // 更新選填設計參數
  const optional = ['Ke','R_C','D_shaft','L_shaft','G_film','Vc','D_oil','V_rated'];
  optional.forEach(key => {
    const p   = PARAMS.find(x => x.key === key);
    const raw = (m[key] !== undefined) ? m[key] : p.init; // 有設定用設定值，否則用預設
    const v   = Math.max(p.min, Math.min(p.max, raw));    // clamp
    state[key] = v;
    document.getElementById('sl_' + key).value = v;
    document.getElementById('in_' + key).value = v;
  });

  document.getElementById('motorSelect').dataset.lastIdx = idx;
  updateParamLabels();
  clearSweep(); // 換馬達時清除 Sweep 圖
  updateAll();
}


/* ══════════════════════════════════════════════════════════
   可拖曳工作點資訊框（滑鼠 + 觸控）
   ══════════════════════════════════════════════════════════ */
(function initDraggable() {
  const box    = document.getElementById('infoBox');
  const handle = document.getElementById('infoHandle');
  const wrap   = document.getElementById('chartWrap');
  let dragging = false, ox = 0, oy = 0;

  // 將位置 clamp 在圖表範圍內
  function clamp(nx, ny) {
    const wr = wrap.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(wr.width  - box.offsetWidth,  nx)),
      y: Math.max(0, Math.min(wr.height - box.offsetHeight, ny)),
    };
  }
  function moveTo(nx, ny) {
    const { x, y } = clamp(nx, ny);
    box.style.left  = x + 'px';
    box.style.top   = y + 'px';
    box.style.right = 'auto';
  }

  // 滑鼠拖曳
  handle.addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - box.offsetLeft;
    oy = e.clientY - box.offsetTop;
    box.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => { if (dragging) moveTo(e.clientX - ox, e.clientY - oy); });
  document.addEventListener('mouseup',   () => { dragging = false; box.classList.remove('dragging'); });

  // 觸控拖曳
  handle.addEventListener('touchstart', e => {
    const t = e.touches[0];
    dragging = true;
    ox = t.clientX - box.offsetLeft;
    oy = t.clientY - box.offsetTop;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const t = e.touches[0];
    moveTo(t.clientX - ox, t.clientY - oy);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', () => { dragging = false; });
})();


/* ══════════════════════════════════════════════════════════
   油品選擇與溫度
   ══════════════════════════════════════════════════════════ */

/**
 * 切換油品時，若油品有設定 D_oil 或 Vc_ref，更新對應滑桿
 * 之後再呼叫 onOilChange() 重算 Vc
 */
function applyOilDefaults(oil) {
  if (!oil) return;

  // 更新 D_oil 滑桿（若有設定）
  if (oil.D_oil !== undefined) {
    const p = PARAMS.find(x => x.key === 'D_oil');
    const v = Math.max(p.min, Math.min(p.max, oil.D_oil));
    state.D_oil = v;
    document.getElementById('sl_D_oil').value = v;
    document.getElementById('in_D_oil').value = v;
  }

  // 更新 Vc 滑桿初始值（若有設定 Vc_ref）
  if (oil.Vc_ref !== undefined) {
    const p = PARAMS.find(x => x.key === 'Vc');
    const v = Math.max(p.min, Math.min(p.max, oil.Vc_ref));
    state.Vc = v;
    document.getElementById('sl_Vc').value = v;
    document.getElementById('in_Vc').value = v.toFixed(1);
  }

  updateParamLabels();
}

/** 初始化油品下拉選單 */
function initOilSelect() {
  const sel = document.getElementById('oilSelect');
  OIL_DB.forEach((oil, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = oil.name;
    sel.appendChild(opt);
  });
  // 套用第一個油品的預設值
  applyOilDefaults(OIL_DB[0]);
  onOilChange(); // 初始計算一次
}

/**
 * 油品或溫度改變時：用 Walther Equation 計算 Vc，
 * 自動套用到 Vc 滑桿並重算工作點
 */
function onOilChange() {
  const oilSel = document.getElementById('oilSelect');
  const rTamb  = document.getElementById('inTamb');
  const rTrise = document.getElementById('inTrise');
  const resEl  = document.getElementById('oilResult');
  if (!oilSel || !rTamb || !rTrise || !resEl) return;

  const oilIdx = parseInt(oilSel.value);
  const T_amb  = parseFloat(rTamb.value);
  const T_rise = parseFloat(rTrise.value);
  const oil    = OIL_DB[oilIdx];

  if (!oil || isNaN(T_amb) || isNaN(T_rise)) {
    resEl.textContent = '—';
    return;
  }

  // 切換油品時套用 D_oil 和 Vc_ref 預設值
  applyOilDefaults(oil);

  const T_op = T_amb + T_rise; // 作動溫度 [°C]

  // 若油品沒有標定點，直接用 Vc_ref 作為固定值
  if (oil.T1 === undefined || oil.v1 === undefined || oil.T2 === undefined || oil.v2 === undefined) {
    if (oil.Vc_ref !== undefined) {
      resEl.textContent = `Vc = ${oil.Vc_ref.toFixed(2)} mm²/s (fixed value, no temperature correction)`;
    } else {
      resEl.textContent = 'Please provide calibration points (T1/v1/T2/v2) or Vc_ref';
    }
    return;
  }

  const { A, B, C } = getOilABC(oil);
  const Vc_calc  = waltherVc(A, B, T_op, C);

  if (!isFinite(Vc_calc) || Vc_calc <= 0) {
    resEl.textContent = 'Out of range';
    return;
  }

  // 顯示作動溫度和計算結果
  resEl.textContent = `T_op=${T_op.toFixed(1)}°C → Vc=${Vc_calc.toFixed(2)} mm²/s`;

  // 自動套用到 Vc 滑桿並重算
  const p = PARAMS.find(x => x.key === 'Vc');
  const v = Math.max(p.min, Math.min(p.max, Vc_calc));
  state.Vc = v;
  document.getElementById('sl_Vc').value = v;
  document.getElementById('in_Vc').value = v.toFixed(1);
  updateParamLabels();
  updateAll();
}


/* ══════════════════════════════════════════════════════════
   曲線計算
   ══════════════════════════════════════════════════════════ */

/**
 * 顯示警告訊息（持續顯示，直到 hideWarning() 被呼叫）
 * 不自動消失，避免滑桿拖動時警告一閃而過
 */
function showWarning(msg) {
  const el = document.getElementById('curveWarning');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}
function hideWarning() {
  document.getElementById('curveWarning').style.display = 'none';
}

/**
 * 計算邊界曲線：對每個 N，解析求出使 V_sum = V_rated 的 T_A
 * T_A = (V_rated - E) × Kt/(2×R_C) × 1e6 - T_F
 *
 * @param {object} d      - getDerived() 的結果
 * @param {number} Nshow  - 掃描上限 [RPM]
 * @returns {Array<{x, y}>} 邊界曲線資料點
 */
function computeBoundaryCurve(d, Nshow) {
  const Nmax = Nshow || N_MAX;
  const PTS  = 800;             // 取樣點數（越多越平滑）
  const pts  = [];
  let   hasPositive = false;    // 是否已有 T_A > 0 的點

  for (let i = 0; i <= PTS; i++) {
    const N   = 10 + (Nmax - 10) * i / PTS;  // 從 10 RPM 開始
    const T_F = T_F_at(N, d);
    const E   = E_at(N, state.Ke);
    const T_A = (state.V_rated - E) * d.Kt / (2 * state.R_C) * 1e6 - T_F;

    if (T_A >= 0) {
      pts.push({ x: N, y: T_A });
      hasPositive = true;
    }
    // T_A 從正轉負時，補一個端點 T_A=0 後停止（保持曲線連續）
    if (T_A < 0 && hasPositive) {
      pts.push({ x: N, y: 0 });
      break;
    }
  }
  return pts;
}

/**
 * 計算負載拋物線：T_A = T_A_ref × (N/N_ref)²
 *
 * @param {number} Nshow  - 掃描上限 [RPM]
 * @returns {Array<{x, y}>} 拋物線資料點
 */
function computeLoadCurve(Nshow) {
  const Nmax = Nshow || N_MAX;
  const PTS  = 800;
  const pts  = [];
  for (let i = 0; i <= PTS; i++) {
    const N = 10 + (Nmax - 10) * i / PTS;
    pts.push({ x: N, y: T_A_at(N) });
  }
  return pts;
}

/**
 * 搜尋工作點：掃描 N 找符號改變區間，再用二分法精確求根
 *
 * @param {object} d - getDerived() 的結果
 * @returns {number|null} 工作點 N [RPM]，或 null（無解）
 */
function findWorkingPoint(d) {
  const STEPS = 500;                      // 掃描步數（越多越不漏掉低速工作點）
  const step  = (N_MAX - 10) / STEPS;

  let N_lo = null, N_hi = null, f_lo = null;

  for (let i = 0; i <= STEPS; i++) {
    const N = 10 + i * step;
    const f = fBoundary(N, d);
    if (f_lo !== null && f_lo * f < 0) { // 找到符號改變的區間
      N_lo = N - step;
      N_hi = N;
      break;
    }
    f_lo = f;
  }

  if (N_lo === null) return null;         // 整個範圍沒有符號改變，無工作點
  return bisect(d, N_lo, N_hi);
}


/* ══════════════════════════════════════════════════════════
   Query：儲存工作點為圖卡，支援多點比較
   ══════════════════════════════════════════════════════════ */

/**
 * 取得第 idx 個 Query 的 dataset 起始索引
 * 固定 datasets 0-4，Query 從 5 開始，每個佔 3 個（H線、V線、菱形點）
 */
function queryDsBase(idx) { return 5 + idx * 3; }

/**
 * 為新 Query 新增 3 個 datasets（H輔助線、V輔助線、菱形點）
 */
function addQueryDatasets(color) {
  chartData.datasets.push(
    { label:'_qH',   data:[], borderColor:color, borderWidth:1.2,
      borderDash:[3,3], pointRadius:0, fill:false, order:4 },
    { label:'_qV',   data:[], borderColor:color, borderWidth:1.2,
      borderDash:[3,3], pointRadius:0, fill:false, order:4 },
    { label:'_qDot', data:[], borderColor:'#fff', backgroundColor:color,
      borderWidth:2, pointRadius:7, pointHoverRadius:9,
      pointStyle:'rectRot', fill:false, order:7 }
  );
}

/**
 * 移除指定 Query：刪除 datasets、圖卡 DOM、queryList 項目
 */
function removeQuery(id) {
  const idx = queryList.findIndex(q => q.id === id);
  if (idx === -1) return;
  chartData.datasets.splice(queryDsBase(idx), 3); // 移除 3 個 datasets
  document.getElementById('qcard-' + id)?.remove();
  queryList.splice(idx, 1);
  myChart.update('none');
}

/**
 * 點擊圖卡展開區：還原當時所有參數並重算
 */
function restoreQuery(id) {
  const q = queryList.find(x => x.id === id);
  if (!q) return;

  // 還原固定實測值
  state.N_ref  = q.snap.N_ref;
  state.TA_ref = q.snap.TA_ref;
  document.getElementById('dispNref').value  = q.snap.N_ref;
  document.getElementById('dispTAref').value = q.snap.TA_ref.toFixed(2);

  // 還原設計參數
  PARAMS.forEach(function(p) {
    const v = q.snap.params[p.key];
    if (v === undefined) return;
    state[p.key] = v;
    document.getElementById('sl_' + p.key).value = v;
    document.getElementById('in_' + p.key).value = v;
  });

  updateParamLabels();

  // 還原油品、溫度，並重新計算 Vc
  if (q.snap.T_amb !== undefined) {
    const oilSel = document.getElementById('oilSelect');
    if (oilSel && q.snap.oilIdx !== undefined) oilSel.value = q.snap.oilIdx;
    document.getElementById('inTamb').value  = q.snap.T_amb;
    document.getElementById('slTamb').value  = q.snap.T_amb;
    document.getElementById('inTrise').value = q.snap.T_rise;
    document.getElementById('slTrise').value = q.snap.T_rise;
    onOilChange(); // 重算 Vc 並觸發 updateAll
  } else {
    updateAll();
  }
}

/**
 * 新增 Query 圖卡到右側欄
 * 標題列：點擊展開/折疊
 * 展開內容：點擊還原參數
 */
function addQueryCard(q) {
  const cards = document.getElementById('queryCards');
  const card  = document.createElement('div');
  card.className = 'query-card';
  card.id = 'qcard-' + q.id;
  const r = q.result;

  // 產生表格列 HTML
  function row(label, val, unit) {
    return '<tr><td>' + label + '</td><td>' + val + '</td><td>' + unit + '</td></tr>';
  }

  card.innerHTML =
    '<div class="query-card-header" id="qhdr-' + q.id + '">' +
      '<span class="query-card-chevron">&#9658;</span>' +
      '<span class="query-card-dot" style="background:' + q.color + '"></span>' +
      '<span class="query-card-title">N=' + q.N.toFixed(0) + ' / T_A=' + q.TA.toFixed(4) + ' uN.m</span>' +
      '<button class="query-card-del" onclick="event.stopPropagation();removeQuery(' + q.id + ')">&#x2715;</button>' +
    '</div>' +
    '<div class="query-card-body"><table>' +
      row('T_A',    r.T_A.toFixed(4),           'uN.m') +
      row('T_F',    r.T_F.toFixed(4),           'uN.m') +
      row('T_sum',  r.T_sum.toFixed(4),         'uN.m') +
      row('I_in',   (r.I_in*1000).toFixed(3),   'mA')   +
      row('E',      r.E.toFixed(4),              'V')    +
      row('V_drop', r.V_drop.toFixed(4),        'V')    +
      row('V_sum',  r.V_sum.toFixed(4),         'V')    +
    '</table></div>' +
    '<div class="query-card-hint">Click data area to restore params</div>';

  // 標題列點擊 → 展開/折疊（✕ 按鈕除外）
  card.querySelector('#qhdr-' + q.id).addEventListener('click', function(e) {
    if (e.target.classList.contains('query-card-del')) return;
    card.classList.toggle('expanded');
  });
  // 展開內容點擊 → 還原參數
  card.querySelector('.query-card-body').addEventListener('click', function(e) {
    e.stopPropagation();
    restoreQuery(q.id);
  });
  cards.appendChild(card);
}

/**
 * 儲存目前工作點為 Query 圖卡
 * 流程：計算工作點 → 新增 dataset slot → 新增圖卡 → 呼叫 updateAll 統一重繪
 */
function doQuery() {
  const d    = getDerived(state);
  const N_wp = findWorkingPoint(d);
  if (N_wp === null) return; // 無工作點，不儲存

  const T_A_wp = T_A_at(N_wp);
  const r      = opDetails(N_wp, d);
  const color  = QUERY_COLORS[queryList.length % QUERY_COLORS.length];
  const id     = ++queryIdCounter;

  // 建立 Query 項目（含當時所有參數的快照）
  const q = {
    id, color,
    N:  N_wp, TA: T_A_wp, result: r,
    snap: {
      N_ref:  state.N_ref,
      TA_ref: state.TA_ref,
      params: Object.assign({}, state), // 淺拷貝所有 state
      T_amb:  parseFloat(document.getElementById('inTamb')?.value)  || 0,
      T_rise: parseFloat(document.getElementById('inTrise')?.value) || 0,
      oilIdx: parseInt(document.getElementById('oilSelect')?.value) || 0,
    },
  };
  queryList.push(q);
  addQueryDatasets(color); // 先新增 dataset slot
  addQueryCard(q);         // 再新增圖卡

  // 讓 updateAll 統一處理縮放、資料填入、重繪
  updateAll();
}


/* ══════════════════════════════════════════════════════════
   軸縮放
   ══════════════════════════════════════════════════════════ */

/**
 * 自動調整 X / Y 軸範圍，讓工作點和所有 Query 點都在可見區域
 *
 * X 軸：最大 N 落在 70% 位置
 * Y 軸：
 *   - 比例 ≤ 4 倍：用聯立方程式讓 TAmax 在 80%、TAmin 在 20%
 *   - 比例 > 4 倍：TAmax 在 75%，Y 軸從 0 開始（無法同時滿足兩端）
 *   - 只有一個點：給 60% 位置的預設範圍
 */
function applyAxisLimits(N_wp, T_A_wp) {
  // 收集所有需要顯示的 N 和 T_A
  const allN  = [N_wp,   ...queryList.map(q => q.N )].filter(v => isFinite(v) && v > 0);
  const allTA = [T_A_wp, ...queryList.map(q => q.TA)].filter(v => isFinite(v) && v > 0);

  const Nmax  = Math.max(...allN);
  const TAmax = Math.max(...allTA);
  const TAmin = Math.min(...allTA);

  // X 軸：最大 N 落在 70% 處
  myChart.options.scales.x.max = Math.ceil((Nmax / 0.70) / 1000) * 1000;

  // Y 軸：根據比例決定策略
  const ratio = (TAmin > 0) ? TAmax / TAmin : Infinity;
  let yMin, yMax;

  if (TAmax === TAmin) {
    // 只有一個點
    yMin = 0;
    yMax = TAmax / 0.60;
  } else if (ratio <= 4) {
    // 比例合理：聯立方程式精確計算
    // TAmin 在 20%、TAmax 在 80%：
    //   range = (TAmax - TAmin) / 0.60
    //   yMin  = TAmin - range × 0.20
    //   yMax  = TAmax + range × 0.20
    const range = (TAmax - TAmin) / 0.60;
    yMin = TAmin - range * 0.20;
    yMax = TAmax + range * 0.20;
    if (yMin < 0) {
      // yMin < 0 時改以 0 為下界，重新確保兩點都在範圍內
      yMin = 0;
      yMax = Math.max(TAmin / 0.20, TAmax / 0.80);
    }
  } else {
    // 比例差距太大（>4倍）：TAmax 落在 75%，Y 軸從 0 開始
    yMin = 0;
    yMax = TAmax / 0.75;
  }

  myChart.options.scales.y.min = Math.max(0, yMin);
  myChart.options.scales.y.max = yMax;
}


/* ══════════════════════════════════════════════════════════
   主更新函式：重算曲線 + 工作點 + Query 點
   ══════════════════════════════════════════════════════════ */

let _updating = false; // 防止重入 flag

/**
 * 公開的更新入口：帶重入保護
 * 任何參數變更後都呼叫此函式
 */
function updateAll() {
  if (_updating) return;
  _updating = true;
  try {
    _updateAllImpl();
  } finally {
    _updating = false;
  }
}

/**
 * 實際的更新邏輯：
 *   1. 同步 Chart.js 的 dataset 數量（若有新 Query）
 *   2. 求工作點
 *   3. 計算並更新兩條曲線
 *   4. 更新工作點輔助線和圓點
 *   5. 套用軸縮放
 *   6. 重新套用所有 Query 點資料
 *   7. 更新浮動資訊框
 */
function _updateAllImpl() {
  // 若有新 push 的 dataset（來自 doQuery），先讓 Chart.js 感知
  if (chartData.datasets.length !== myChart.data.datasets.length) {
    myChart.update('none');
  }

  const d    = getDerived(state);
  const N_wp = findWorkingPoint(d);

  // ── 無工作點：顯示警告，清除工作點標記 ──
  if (N_wp === null) {
    const boundary = computeBoundaryCurve(d, N_MAX);
    const load     = computeLoadCurve(N_MAX);
    chartData.datasets[0].data = boundary;
    chartData.datasets[1].data = load;
    showWarning(boundary.length === 0
      ? 'No solution: V_sum cannot equal V_rated with current parameters'
      : 'No working point found: load curve does not intersect boundary');
    chartData.datasets[2].data = [];
    chartData.datasets[3].data = [];
    chartData.datasets[4].data = [];
    document.getElementById('infoBox').style.display = 'none';
    updateFixedSpeedMarker(d);
    myChart.options.scales.x.max = N_MAX;
    myChart.options.scales.y.max = null;
    myChart.update();
    return;
  }

  hideWarning();

  // ── 計算曲線（範圍到工作點和 Query 點最大 N 的 1.4 倍） ──
  const Nshow = Math.min(
    Math.max(N_wp, ...queryList.map(q => q.N)) * 1.4,
    N_MAX
  );
  const boundary = computeBoundaryCurve(d, Nshow);
  const load     = computeLoadCurve(Nshow);
  chartData.datasets[0].data = boundary;
  chartData.datasets[1].data = load;

  // ── 更新工作點輔助線和圓點 ──
  const T_A_wp = T_A_at(N_wp);
  chartData.datasets[2].data = [{ x: 0, y: T_A_wp }, { x: N_wp, y: T_A_wp }];
  chartData.datasets[3].data = [{ x: N_wp, y: 0 },   { x: N_wp, y: T_A_wp }];
  chartData.datasets[4].data = [{ x: N_wp, y: T_A_wp }];

  // ── 套用軸縮放 ──
  applyAxisLimits(N_wp, T_A_wp);

  // ── 重新套用所有 Query 點資料（必須在 update 之前） ──
  queryList.forEach(function(q, idx) {
    const base = queryDsBase(idx);
    if (chartData.datasets[base]) {
      chartData.datasets[base    ].data = [{ x: 0, y: q.TA }, { x: q.N, y: q.TA }];
      chartData.datasets[base + 1].data = [{ x: q.N, y: 0 }, { x: q.N, y: q.TA }];
      chartData.datasets[base + 2].data = [{ x: q.N, y: q.TA }];
    }
  });

  // ── 一次性重繪 ──
  myChart.update('none');

  // ── 更新浮動資訊框 ──
  const r = opDetails(N_wp, d);
  // 用 table 顯示工作點數值 + 英文說明
  (function() {
    function row(sym, val, unit, note) {
      return '<tr>' +
        '<td style="font-family:var(--mono);font-size:10px;padding:1px 6px 1px 0;white-space:nowrap">' + sym + '</td>' +
        '<td style="font-family:var(--mono);font-size:10px;text-align:right;padding:1px 4px 1px 0;white-space:nowrap">' + val + '</td>' +
        '<td style="font-family:var(--mono);font-size:10px;padding:1px 8px 1px 0;white-space:nowrap">' + unit + '</td>' +
        '<td style="font-size:8px;color:#9ca3af;white-space:nowrap">' + note + '</td>' +
        '</tr>';
    }

    // ── Torque bar ──
    const pctA = (r.T_A / r.T_sum * 100).toFixed(1);
    const pctF = (r.T_F / r.T_sum * 100).toFixed(1);
    const ratio = (r.T_A / r.T_F).toFixed(3);
    const labelA = parseFloat(pctA) > 20 ? pctA + '%' : '';
    const labelF = parseFloat(pctF) > 20 ? pctF + '%' : '';
    const torqueBar =
      '<div style="margin:7px 0 2px;border-top:1px solid #e5e7eb;padding-top:6px">' +
        '<div style="font-family:var(--mono);font-size:8px;color:#9ca3af;margin-bottom:3px;' +
             'display:flex;justify-content:space-between">' +
          '<span>&#9632; T_A&nbsp;' + pctA + '%</span>' +
          '<span>&#9632; T_F&nbsp;' + pctF + '%</span>' +
        '</div>' +
        '<div style="height:12px;border-radius:6px;overflow:hidden;display:flex;' +
             'background:#e5e7eb;border:1px solid #d1d5db">' +
          '<div style="width:' + pctA + '%;background:#2563eb;display:flex;align-items:center;' +
               'justify-content:center;font-family:var(--mono);font-size:7.5px;' +
               'color:#fff;font-weight:600;overflow:hidden;white-space:nowrap">' + labelA + '</div>' +
          '<div style="width:' + pctF + '%;background:#f59e0b;display:flex;align-items:center;' +
               'justify-content:center;font-family:var(--mono);font-size:7.5px;' +
               'color:#fff;font-weight:600;overflow:hidden;white-space:nowrap">' + labelF + '</div>' +
        '</div>' +
        '<div style="font-family:var(--mono);font-size:8.5px;color:#6b7280;margin-top:4px">' +
          'T_A/T_F = <b style="color:#2563eb">' + ratio + '</b>' +
        '</div>' +
      '</div>';

    document.getElementById('infoBody').innerHTML =
      '<table style="border-collapse:collapse">' +
        row('N',      N_wp.toFixed(1),              'RPM',  'Working speed') +
        row('T_A',    r.T_A.toFixed(4),             'uN·m', 'Aero load') +
        row('T_F',    r.T_F.toFixed(4),             'uN·m', 'Friction load') +
        row('T_sum',  r.T_sum.toFixed(4),           'uN·m', 'Total torque') +
        row('I_in',   (r.I_in*1000).toFixed(3),     'mA',   'Input current') +
        row('E',      r.E.toFixed(4),               'V',    'Back-EMF') +
        row('V_drop', r.V_drop.toFixed(4),          'V',    'Voltage drop') +
        row('V_sum',  r.V_sum.toFixed(4),           'V',    'Total voltage') +
        row('P_in',   (r.P_in*1000).toFixed(3),     'mW',   'Input power') +
        row('Eff',    r.eta_mech.toFixed(1),          '%',    'Total efficiency (T_sum)') +
      '</table>' + torqueBar;
  })();
  document.getElementById('infoBox').style.display = 'block';
  updateFixedSpeedMarker(d);
}


/* ══════════════════════════════════════════════════════════
   Calibrate Ke：反推使工作點 = REF 點的 Ke
   ══════════════════════════════════════════════════════════
   在 N = N_REF、T_A = T_A_ref 時，V_sum = V_rated：
     V_rated = Ke × N_REF × 1e-6  +  2 × (T_A_ref + T_F) × R_C / (Ke × 9.5493)

   整理為 Ke 的二次方程式：
     a × Ke² - V_rated × Ke + b = 0
     a = N_REF × 1e-6
     b = 2 × (T_A_ref + T_F) × R_C / 9.5493

   取在 PARAMS 範圍內的較小正根
   ══════════════════════════════════════════════════════════ */
function calibrateKe() {
  const d   = getDerived(state);
  const N   = state.N_ref;
  const T_F = T_F_at(N, d);
  const T_A = state.TA_ref;

  const a = N * 1e-6;
  const b = 2 * (T_A + T_F) * state.R_C / 9.5493;
  const discriminant = state.V_rated * state.V_rated - 4 * a * b;

  if (discriminant < 0) {
    alert('No real solution: cannot calibrate Ke.\nTry adjusting R_C or V_rated.');
    return;
  }

  const sqrtD = Math.sqrt(discriminant);
  const Ke1   = (state.V_rated + sqrtD) / (2 * a);
  const Ke2   = (state.V_rated - sqrtD) / (2 * a);

  const p          = PARAMS.find(x => x.key === 'Ke');
  const candidates = [Ke1, Ke2].filter(k => k > 0 && k >= p.min && k <= p.max);

  if (!candidates.length) {
    alert('Calibrated Ke out of valid range.\nTry adjusting R_C or V_rated.');
    return;
  }

  const Ke_cal = Math.min(...candidates); // 取較小的合法正根

  // 更新 Ke 滑桿和 state
  state.Ke = Ke_cal;
  document.getElementById('sl_Ke').value = Ke_cal;
  document.getElementById('in_Ke').value = Ke_cal.toFixed(2);
  updateParamLabels();
  updateAll();
}


/* ══════════════════════════════════════════════════════════
   Parameter Sweep：第二張圖
   ══════════════════════════════════════════════════════════
   操作流程：
     1. 選擇 X 軸參數和掃描範圍（min ~ max）
     2. 選擇 Y 軸輸出量
     3. 按 Run Sweep → 掃描 50 點，畫出軌跡線
     4. 菱形標記目前工作點在軌跡上的位置
     5. 按 Clear → 清除圖表，隱藏第二張圖
   ══════════════════════════════════════════════════════════ */

/** Sweep 軌跡顏色循環 */
const SWEEP_LINE_COLORS = [
  '#a855f7','#06b6d4','#f97316','#84cc16',
  '#ec4899','#6366f1','#14b8a6','#f59e0b',
];
let sweepLineIdx = 0;
let sweepLines   = [];

// 溫度參數的預設掃描範圍
const TEMP_SWEEP_RANGE = {
  T_amb:  { min: -20, max: 85 },
  T_rise: { min: 0,   max: 60 },
};

/**
 * X 軸選單改變時，自動帶入對應的 min/max 預設值
 * PARAMS 參數用 PARAMS 的 min/max；溫度參數用 TEMP_SWEEP_RANGE
 */
function onSwXParamChange() {
  const key = document.getElementById('swXParam').value;
  const p   = PARAMS.find(x => x.key === key);
  if (p) {
    document.getElementById('swXMin').value = p.min;
    document.getElementById('swXMax').value = p.max;
  } else if (TEMP_SWEEP_RANGE[key]) {
    document.getElementById('swXMin').value = TEMP_SWEEP_RANGE[key].min;
    document.getElementById('swXMax').value = TEMP_SWEEP_RANGE[key].max;
  }
}
document.getElementById('swXParam').addEventListener('change', onSwXParamChange);

// 頁面載入時初始化 min/max
onSwXParamChange();

/** Y 軸標籤對應表 */
const Y_LABELS = {
  N_wp:     'N_wp [RPM]',
  T_A:      'T_A [μN·m]',
  I_in:     'I_in [mA]',
  P_in:     'P_in [mW]',
  Eff_Tsum: 'Eff T_sum [%]',
  Eff_TA:   'Eff T_A [%]',
};

/**
 * 從 opDetails 結果取出指定 Y 軸的值
 */
function getYVal(yKey, N, d) {
  if (yKey === 'N_wp') return N;
  const r = opDetails(N, d);
  if (yKey === 'T_A')      return r.T_A;
  if (yKey === 'I_in')     return r.I_in * 1000;
  if (yKey === 'P_in')     return r.P_in * 1000;
  if (yKey === 'Eff_Tsum') return r.eta_mech;   // T_sum 版（Working Point 用）
  if (yKey === 'Eff_TA') {                        // T_A 版（Fixed Speed 用）
    const omega = 2 * Math.PI * N / 60;
    return r.P_in > 0 ? (r.T_A * 1e-6 * omega) / r.P_in * 100 : 0;
  }
  return null;
}

/**
 * 執行 Sweep：
 *   每次 Run 清除舊圖，重新掃描 50 點畫出新曲線
 *   並在曲線上標記目前參數值對應的位置（菱形）
 */
function runSweep() {
  const xKey = document.getElementById('swXParam').value;
  const yKey = document.getElementById('swYParam').value;
  const xMin = parseFloat(document.getElementById('swXMin').value);
  const xMax = parseFloat(document.getElementById('swXMax').value);

  if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) {
    alert('Invalid range: min must be less than max');
    return;
  }

  // 清除舊圖，只顯示最新一條
  sweepChart.data.datasets = [];
  sweepLines   = [];
  sweepLineIdx = 0;

  const STEPS = 50;
  const color = SWEEP_LINE_COLORS[sweepLineIdx % SWEEP_LINE_COLORS.length];
  const pts   = [];
  let   markX = null, markY = null, minDist = Infinity;

  // 判斷是溫度參數還是一般設計參數
  const isTempParam = (xKey === 'T_amb' || xKey === 'T_rise');

  // 記住目前值（溫度從 UI 讀，一般參數從 state 讀）
  const origTamb  = parseFloat(document.getElementById('inTamb').value)  || 0;
  const origTrise = parseFloat(document.getElementById('inTrise').value) || 0;
  const origState = isTempParam ? null : state[xKey];

  for (let i = 0; i <= STEPS; i++) {
    const xVal = xMin + (xMax - xMin) * i / STEPS;

    let N = null, d = null;
    if (isTempParam) {
      // 溫度掃描：暫時修改 UI 值並重算 Vc
      const T_amb  = xKey === 'T_amb'  ? xVal : origTamb;
      const T_rise = xKey === 'T_rise' ? xVal : origTrise;
      const oilIdx = parseInt(document.getElementById('oilSelect').value);
      const oil    = OIL_DB[oilIdx];
      if (oil) {
        const { A, B, C } = getOilABC(oil);
        const Vc_calc = waltherVc(A, B, T_amb + T_rise, C);
        if (isFinite(Vc_calc) && Vc_calc > 0) {
          const p = PARAMS.find(x => x.key === 'Vc');
          state.Vc = Math.max(p.min, Math.min(p.max, Vc_calc));
          d = getDerived(state);
          N = findWorkingPoint(d);
        }
      }
      const origDist = Math.abs(xVal - (xKey === 'T_amb' ? origTamb : origTrise));
      if (N !== null) {
        const yVal = getYVal(yKey, N, d);
        if (yVal !== null) pts.push({ x: xVal, y: yVal });
        if (origDist < minDist) { minDist = origDist; markX = xVal; markY = getYVal(yKey, N, d); }
      }
    } else {
      // 一般參數掃描
      state[xKey] = xVal;
      d = getDerived(state);
      N = findWorkingPoint(d);
      if (N !== null) {
        const yVal = getYVal(yKey, N, d);
        if (yVal !== null) pts.push({ x: xVal, y: yVal });
        const dist = Math.abs(xVal - origState);
        if (dist < minDist) { minDist = dist; markX = xVal; markY = yVal; }
      }
    }
  }

  // 還原
  if (isTempParam) {
    // 還原 Vc（重新用原本溫度計算）
    const oilIdx = parseInt(document.getElementById('oilSelect').value);
    const oil    = OIL_DB[oilIdx];
    if (oil) {
      const { A, B, C } = getOilABC(oil);
      const Vc_calc = waltherVc(A, B, origTamb + origTrise, C);
      if (isFinite(Vc_calc) && Vc_calc > 0) {
        const p = PARAMS.find(x => x.key === 'Vc');
        state.Vc = Math.max(p.min, Math.min(p.max, Vc_calc));
      }
    }
  } else {
    state[xKey] = origState; // 還原一般參數
  }

  if (!pts.length) {
    alert('No working point found in this range');
    return;
  }

  const label = xKey + ' → ' + yKey;

  // 加軌跡線
  sweepChart.data.datasets.push({
    label, data: pts,
    borderColor: color, borderWidth: 2,
    pointRadius: 0, fill: false, tension: 0.3,
  });

  // 加目前值標記（菱形）
  if (markX !== null) {
    sweepChart.data.datasets.push({
      label: '_mk_' + label,
      data: [{ x: markX, y: markY }],
      borderColor: '#fff', backgroundColor: color,
      borderWidth: 2, pointRadius: 7, pointStyle: 'rectRot', fill: false,
    });
  }

  sweepLines.push({ label, colorIdx: sweepLineIdx });
  sweepLineIdx++;

  // 更新軸標籤並顯示第二張圖
  const X_LABELS = { T_amb: 'Ambient temp. [°C]', T_rise: 'Rise [°C]' };
  sweepChart.options.scales.x.title.text = X_LABELS[xKey] || xKey;
  sweepChart.options.scales.y.title.text = Y_LABELS[yKey] || yKey;
  document.getElementById('sweepChartWrap').style.display = 'flex';
  sweepChart.update('none');
}

/** 清除所有 Sweep 線，隱藏第二張圖 */
function clearSweep() {
  sweepChart.data.datasets = [];
  sweepLines   = [];
  sweepLineIdx = 0;
  sweepChart.update('none');
  document.getElementById('sweepChartWrap').style.display = 'none';
}


/* ══════════════════════════════════════════════════════════
   Fixed Speed Mode
   ══════════════════════════════════════════════════════════ */

function onFixedSpeedChange() {
  fixedSpeedN = parseFloat(document.getElementById('inFixedN').value) || 15000;
  fixedSpeedN = Math.max(100, Math.min(200000, fixedSpeedN));
  // 同步 slider 範圍（若超出就擴展）
  const sl = document.getElementById('slFixedN');
  if (fixedSpeedN > parseFloat(sl.max)) sl.max = fixedSpeedN;
  sl.value = fixedSpeedN;
  updateAll();
}

/**
 * 更新固定轉速垂直線 + 浮動標記框
 * 用 Chart.js annotation plugin 不可用時，改用 afterDraw 直接在 canvas 畫
 */
function updateFixedSpeedMarker(d) {
  const markerBox = document.getElementById('speedMarkerBox');
  // 若 Fixed Speed 區塊已收合，隱藏浮動框
  const box = document.getElementById('fixedSpeedBox');
  if (box && box.classList.contains('collapsed')) {
    markerBox.style.display = 'none';
    return;
  }

  const N     = fixedSpeedN;
  const T_F   = T_F_at(N, d);
  const T_A   = T_A_at(N);
  const T_sum = T_A + T_F;
  const I_in  = T_sum * 1e-6 / d.Kt;
  const E     = E_at(N, state.Ke);
  const V_drop = 2 * I_in * state.R_C;
  const V_sum  = E + V_drop;
  const P_in   = state.V_rated * I_in;
  const omega_fs = 2 * Math.PI * N / 60;
  const eff_fs   = P_in > 0 ? (T_A * 1e-6 * omega_fs) / P_in * 100 : 0;

  // 計算 canvas 上的 X 像素位置
  const xScale = myChart.scales.x;
  const xPx    = xScale.getPixelForValue(N);
  const chartArea = myChart.chartArea;

  // 如果超出圖表範圍就隱藏
  if (xPx < chartArea.left || xPx > chartArea.right) {
    markerBox.style.display = 'none';
    return;
  }

  // 把標記框放在垂直線旁邊
  const wrap    = document.getElementById('chartWrap');
  const wrapRect = wrap.getBoundingClientRect();
  const canvasRect = myChart.canvas.getBoundingClientRect();

  // canvas 在 chartWrap 內的偏移
  const canvasOffsetX = canvasRect.left - wrapRect.left;
  const canvasOffsetY = canvasRect.top  - wrapRect.top;

  let boxLeft = canvasOffsetX + xPx + 8;
  const boxWidth = 180;
  // 如果右邊放不下就放左邊
  if (boxLeft + boxWidth > wrap.offsetWidth - 10) {
    boxLeft = canvasOffsetX + xPx - boxWidth - 8;
  }
  const boxTop = canvasOffsetY + chartArea.top + 10;

  markerBox.style.display = 'none'; // 已停用浮動框，改用右側面板

  function row(sym, val, unit) {
    return '<tr><td class="sm-sym">' + sym + '</td>' +
           '<td class="sm-val">' + val + '</td>' +
           '<td class="sm-unit">' + unit + '</td></tr>';
  }

  // 標題顯示目標 N
  const onBoundary = V_sum <= state.V_rated + 0.001;
  fixedSpeedOperable = onBoundary; // 更新全域，供 plugin 讀色
  const statusColor = onBoundary ? '#10b981' : '#ef4444';
  const statusText  = onBoundary ? '✓ operable' : '✗ over V_rated';

  function panelRow(sym, val, unit, note) {
    return '<tr>' +
      '<td style="font-family:var(--mono);font-size:9px;color:#6b7280;padding:1px 5px 1px 0;white-space:nowrap">' + sym + '</td>' +
      '<td style="font-family:var(--mono);font-size:9.5px;font-weight:600;text-align:right;' +
           'padding:1px 4px 1px 0;white-space:nowrap;color:' + (onBoundary ? '#10b981' : '#ef4444') + '">' + val + '</td>' +
      '<td style="font-family:var(--mono);font-size:8.5px;color:#9ca3af;padding:1px 0;white-space:nowrap">' + unit + '</td>' +
      '<td style="font-size:7.5px;color:#9ca3af;padding-left:4px;white-space:nowrap">' + note + '</td>' +
      '</tr>';
  }

  // 更新右側面板數值表
  const tbl = document.getElementById('fixedSpeedTable');
  const res = document.getElementById('fixedSpeedResult');
  if (tbl && res) {
    res.style.display = 'block';
    const statusBadge = '<span style="display:inline-block;padding:1px 6px;border-radius:3px;' +
      'font-size:8px;font-weight:600;background:' + (onBoundary ? '#dcfce7' : '#fee2e2') + ';' +
      'color:' + (onBoundary ? '#16a34a' : '#dc2626') + '">' + statusText + '</span>';
    tbl.innerHTML =
      '<tr><td colspan="4" style="padding-bottom:4px;font-family:var(--mono);font-size:9px;color:#6b7280">' +
        'N = <b style="color:#10b981">' + N.toFixed(0) + ' RPM</b>&nbsp;&nbsp;' + statusBadge +
      '</td></tr>' +
      panelRow('T_A',    T_A.toFixed(4),         'μN·m', 'Aero load') +
      panelRow('T_F',    T_F.toFixed(4),         'μN·m', 'Friction load') +
      panelRow('T_sum',  T_sum.toFixed(4),       'μN·m', 'Total torque'  ) +
      panelRow('I_in',   (I_in*1000).toFixed(3), 'mA',   'Input current') +
      panelRow('E',      E.toFixed(4),           'V',    'Back-EMF') +
      panelRow('V_drop', V_drop.toFixed(4),      'V',    'Voltage drop'  ) +
      panelRow('V_sum',  V_sum.toFixed(4),       'V',    'Total voltage'  ) +
      panelRow('P_in',   (P_in*1000).toFixed(3), 'mW',   'Input power') +
      panelRow('Eff',    eff_fs.toFixed(1),       '%',    'Aero efficiency (T_A)');
    // 扭矩比例條
    const pctA_fs = (T_A / T_sum * 100).toFixed(1);
    const pctF_fs = (T_F / T_sum * 100).toFixed(1);
    const ratio_fs = (T_A / T_F).toFixed(3);
    const lA_fs = parseFloat(pctA_fs) > 20 ? pctA_fs + '%' : '';
    const lF_fs = parseFloat(pctF_fs) > 20 ? pctF_fs + '%' : '';
    tbl.innerHTML +=
      '<tr><td colspan="4">' +
        '<div style="margin:7px 0 2px;border-top:1px solid #e5e7eb;padding-top:6px">' +
          '<div style="font-family:var(--mono);font-size:8px;color:#9ca3af;margin-bottom:3px;' +
               'display:flex;justify-content:space-between">' +
            '<span>&#9632; T_A&nbsp;' + pctA_fs + '%</span>' +
            '<span>&#9632; T_F&nbsp;' + pctF_fs + '%</span>' +
          '</div>' +
          '<div style="height:12px;border-radius:6px;overflow:hidden;display:flex;' +
               'background:#e5e7eb;border:1px solid #d1d5db">' +
            '<div style="width:' + pctA_fs + '%;background:#2563eb;display:flex;align-items:center;' +
                 'justify-content:center;font-family:var(--mono);font-size:7.5px;' +
                 'color:#fff;font-weight:600;overflow:hidden;white-space:nowrap">' + lA_fs + '</div>' +
            '<div style="width:' + pctF_fs + '%;background:#f59e0b;display:flex;align-items:center;' +
                 'justify-content:center;font-family:var(--mono);font-size:7.5px;' +
                 'color:#fff;font-weight:600;overflow:hidden;white-space:nowrap">' + lF_fs + '</div>' +
          '</div>' +
          '<div style="font-family:var(--mono);font-size:8.5px;color:#6b7280;margin-top:4px">' +
            'T_A/T_F = <b style="color:#2563eb">' + ratio_fs + '</b>' +
          '</div>' +
        '</div>' +
      '</td></tr>';
  }

  // 更新浮動標記框（主圖上）
  markerBox.innerHTML =
    '<div style="font-family:var(--sans);font-size:8.5px;font-weight:600;' +
         'color:#10b981;margin-bottom:4px;border-bottom:1px solid #e5e7eb;padding-bottom:3px">' +
      'N = ' + N.toFixed(0) + ' RPM' +
      '<span style="float:right;color:' + statusColor + ';font-weight:400">' + statusText + '</span>' +
    '</div>' +
    '<table>' +
      row('T_A',    T_A.toFixed(4),           'μN·m') +
      row('T_F',    T_F.toFixed(4),           'μN·m') +
      row('T_sum',  T_sum.toFixed(4),         'μN·m') +
      row('I_in',   (I_in*1000).toFixed(3),   'mA'  ) +
      row('E',      E.toFixed(4),             'V'   ) +
      row('V_drop', V_drop.toFixed(4),        'V'   ) +
      row('V_sum',  V_sum.toFixed(4),         'V'   ) +
      row('P_in',   (P_in*1000).toFixed(3),   'mW'  ) +
      row('Eff',    eff_fs.toFixed(1),         '%'   ) +
    '</table>';
}


/* ══════════════════════════════════════════════════════════
   Collapsible sections
   ══════════════════════════════════════════════════════════ */
function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}


/* ══════════════════════════════════════════════════════════
   主題（深色 / 淺色）
   ══════════════════════════════════════════════════════════
   主題由 shared/shell.js 統一管理（<html data-theme="...">，
   localStorage key 'mt-theme'）。本工具只需：
     1. 監聽 mt-theme-change，重繪兩張圖表的顏色
     2. 頁面載入時依目前 data-theme 初始化一次
   ══════════════════════════════════════════════════════════ */
document.addEventListener('mt-theme-change', function(e) {
  applyChartTheme(e.detail.theme === 'dark');
});


/* ══════════════════════════════════════════════════════════
   初始化
   ══════════════════════════════════════════════════════════ */

// 建立 Motor 選單並載入第一顆馬達
initMotorSelect();

// 建立油品選單並初始計算
initOilSelect();

// 監聽圖表容器大小變化，自動通知 Chart.js 重算尺寸
// 解決視窗縮放後需要重新整理才能正常顯示的問題
const resizeObserver = new ResizeObserver(function() {
  myChart.resize();
  sweepChart.resize();
});
resizeObserver.observe(document.getElementById('chartWrap'));
resizeObserver.observe(document.getElementById('sweepChartWrap'));

// 依目前 data-theme 初始化圖表顏色
applyChartTheme(document.documentElement.getAttribute('data-theme') === 'dark');
