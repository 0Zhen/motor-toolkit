# Motor Toolkit 功能更新 — Agent 討論紀錄

- **日期**：2026-08-03
- **目的**：驗證「多 agent 討論 + branch + PR」流程的 pilot（對應 life-os O-A KR3 / GitHub issue #5「A-A3 三工具各 1 次功能更新」）
- **Branch**：`agent/toolkit-pilot-2026-08-03`
- **參與角色**：Proposer（提案）→ Critic（審查）→ 實作 → 開 PR 給使用者人工審查（不自動 merge）

---

## Round 1 — Proposer

> Prompt 重點：唯讀分析 `/home/pi/projects/motor-toolkit` 三個工具的原始碼與 README 維護規則，提出 2-3 個小而低風險的功能更新候選，並選一個推薦方案。

### 候選方案

**方案 1：FFT Analyser 加「圖表 PNG 匯出」**
- 加在 `tools/fft-analyser/app.js`、`index.html`，用 Chart.js 內建 `toBase64Image()`，仿照既有 `exportCSV()` 的 `<a download>` 模式。
- 理由：Efficiency Map 已有 PNG 匯出（Plotly），FFT Analyser 只有 CSV，體驗不一致；頻譜圖是常見要貼進報告/簡報的產出。
- 工作量：< 1 小時。README 風險：無。

**方案 2：Working Point Explorer 加「Query 比較表 CSV 匯出」**
- 加在 `tools/working-point/app.js`，把 `queryList`（`doQuery()` 算出的 N/T_A/T_F/I_in/E/V_sum/P_in/Eff 等）攤平成 CSV。
- 理由：這個工具的核心互動就是存多個設計點比較，但目前唯一輸出是螢幕卡片，缺一鍵匯出比較表，是補齊既有資料流程的缺口。
- 工作量：1–2 小時。README 風險：無。

**方案 3：Efficiency Map 加「內插網格資料 CSV 匯出」**
- 加在 `tools/efficiency-map/app.js`，把 `gridInterpolate()` 算出的 `{gx, gy, z}` 規則網格攤平成 CSV。
- 理由：內插後的規則網格目前只能拿去畫圖，無法帶走餵給其他分析工具。
- 工作量：1–2 小時，需注意 120×120 網格攤平的檔案大小/效能。README 風險：無明顯違規，但需求相對小眾。

### Proposer 的推薦
**方案 1（FFT Analyser PNG 匯出）**——風險最低工作量最小、補平台一致性落差（三工具中兩個已有圖片匯出）、對作品集展示加分最直接。認為方案 2 技術價值其實更高（補核心工作流程缺口），但工作量與展示效果不如方案 1 立即，留給 Critic 討論優先順序。

---

## Round 2 — Critic

> Prompt 重點：不接受 Proposer 的結論當前提，實際讀程式碼驗證每個宣稱，可以同意/推翻/修改範圍，並要給出函式層級的實作規格。

### 驗證結果（逐項核對 Proposer 說法）
1. **FFT 現況屬實**，但 Proposer 漏了一個規格缺口：FFT 頁面有 `chartBar` 和 `chartSpec` 兩張圖，PNG 匯出要匯出哪一張／要不要各一顆按鈕，這細節沒講清楚，代表方案 1「不到 1 小時」估得偏樂觀。
2. **Efficiency Map PNG 現況屬實**，但繪圖庫不同——Efficiency Map 用 Plotly 的 `downloadImage()`，FFT 用的是 Chart.js，兩者 API 不能直接互抄，Proposer 只當「先例佐證」沒說錯，但要留意。
3. **Working Point `queryList`/`doQuery` 機制屬實**，但欄位描述有誤：`addQueryCard()` 實際只畫 T_A/T_F/T_sum/I_in/E/V_drop/V_sum，**沒有 P_in 和 Eff**，這兩個要從 `q.result`（`opDetails()` 回傳的 `r.P_in`、`r.eta_mech`）另外取，變數名是 `eta_mech` 不是 `Eff`。可修正，不影響方案可行性。
4. **Efficiency Map `gridInterpolate` 120×120 網格數字正確**。
5. **README 維護規則核對**：三個方案都沒有違規風險，Proposer 判斷正確。

### 我的判斷：推翻 Proposer 推薦，改選方案 2
- 方案 1「補平台一致性」站不住腳：暴露了沒回答的規格問題（匯出哪張圖），且截圖轉貼報告使用者本來就能用系統截圖做，屬於錦上添花而非缺口。
- 方案 2 是把工具本來就在做的核心比較機制（`doQuery`/`queryList`/`addQueryCard`）**補完整**，不是加裝飾；對作品集展示「功能鏈路完整」比「兩個工具都有 PNG 按鈕」更能展現工程判斷力——這也是 Proposer 自己承認技術價值更高的方案，不該只因為多花 30-60 分鐘就讓位。
- 工作量差距小（<1hr vs 1-2hr），不足以蓋過方案 2 的定位優勢。
- 方案 3 維持不選（較小眾）。

---

## 最終決定

**方案 2：Working Point Explorer 加「Query 比較表 CSV 匯出」**（Critic 推翻 Proposer 原推薦的方案 1，理由見上）。

### 實作規格（Critic 提供，函式層級）

**檔案**：`tools/working-point/app.js`、`tools/working-point/index.html`

`app.js` 新增：
```js
function exportQueryCSV() {
  if (!queryList.length) { alert(mtT('alertNoQuery')); return; }
  const header = ['#','N (rpm)','T_A (uN.m)','T_F (uN.m)','T_sum (uN.m)',
                   'I_in (mA)','E (V)','V_drop (V)','V_sum (V)','P_in (mW)','Eff (%)'];
  const rows = queryList.map((q, i) => {
    const r = q.result;
    return [i+1, q.N.toFixed(0), q.TA.toFixed(4), r.T_F.toFixed(4), r.T_sum.toFixed(4),
            (r.I_in*1000).toFixed(3), r.E.toFixed(4), r.V_drop.toFixed(4), r.V_sum.toFixed(4),
            (r.P_in*1000).toFixed(3), r.eta_mech.toFixed(2)];
  });
  const csvContent = [header, ...rows].map(r => r.join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  a.download = 'working_point_queries.csv';
  a.click();
}
```

i18n（`MT_I18N`）新增：
```js
exportQueryBtn: { en: '⬇ Export Queries CSV', zh: '⬇ 匯出比較表 CSV' },
alertNoQuery:   { en: 'No saved query yet — click "Save Working Point" first.', zh: '尚未儲存任何工作點，請先按「+ 儲存工作點」。' },
```

`index.html`：在 `+ Save Working Point` 按鈕與 `query-cards-wrap` 之間插入新按鈕，沿用 `query-btn` class、`var(--accent)` 共用 CSS 變數（不寫死色碼）：
```html
<button class="query-btn" onclick="exportQueryCSV()" style="margin-top:6px;background:var(--accent)" data-i18n="exportQueryBtn">⬇ Export Queries CSV</button>
```

驗收：`queryList` 為空時按鈕觸發 alert 不當機；有資料時下載檔含正確表頭與數字，Excel 可讀。純字串組裝 + `<a download>`，不涉及 build/module/theme，不違反 README 規則。

## 實作紀錄

- `tools/working-point/app.js`：新增 `exportQueryCSV()`（欄位對齊 `addQueryCard()` 表格 + `P_in`/`Eff`，資料源為 `opDetails()` 回傳的 `r.T_A/T_F/T_sum/I_in/E/V_drop/V_sum/P_in/eta_mech`，已逐一核對欄位名稱與 `physics.js:139` 的實際回傳值一致）；`MT_I18N` 新增 `exportQueryBtn`、`alertNoQuery` 兩個中英字串。
- `tools/working-point/index.html`：在 `+ Save Working Point` 按鈕下方新增 `⬇ Export Queries CSV` 按鈕，沿用既有 `.query-btn` class（該 class 預設背景已是 `var(--accent)`，未額外寫死顏色，符合 README 規則）。
- **驗證**：`node --check` 語法通過；起本地 `python -m http.server` + headless Chromium 載入頁面，DOM 內容含新按鈕與 `exportQueryCSV`，過程無頁面層級 JS 錯誤（僅有 headless sandbox 環境固有的 dbus/flag 雜訊，非本次改動造成）；`opDetails()` 回傳欄位與匯出函式使用的欄位逐一核對一致，不會有 `undefined.toFixed()` 的執行期錯誤。
- 與 Critic 規格的差異：CSV 的 `T_A` 欄改用 `r.T_A`（`opDetails` 回傳值）而非 Critic 原規格的 `q.TA`——兩者數值相同，但 `r.T_A` 與 `addQueryCard()` 顯示卡片時用的欄位完全一致，寫法更貼近既有慣例。按鈕未額外加 `style="background:var(--accent)"`，因為 `.query-btn` class 本身預設就是這個顏色，加了反而是多餘的行內樣式。
