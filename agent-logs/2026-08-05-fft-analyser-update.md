# 2026-08-05 夜間 Pilot：FFT Analyser 功能更新

對應 `agent-dev-backlog.md` 待處理清單第一項（life-os issue #5 / O-A KR3）。
Repo：`motor-toolkit`，目標：`tools/fft-analyser/`。
Branch：`agent/fft-analyser-update-2026-08-05`。

## Proposer 提案（sonnet, model 明確指定）

### README 規則重點
- 無 build step，`<script src>` 順序固定：theme.css → styles.css → tools.js → shell.js → vendor → 自己的 js。fft-analyser 現況符合規範。
- 樣式要用共用 CSS 變數，`shared/theme.css` 有現成 `.mt-btn-ghost` class，fft-analyser 目前沒用到。
- 這次是既有工具加功能，不用碰 `shared/tools.js`／`sitemap.xml`（那是新增工具才要動的）。
- 主題切換只有 `shell.js` 能碰，工具監聽 `mt-theme-change` 事件——fft-analyser 已正確做到。

### fft-analyser 現況盤點
- 輸入：CSV 上傳（寫死 Tektronix 5 欄格式，取欄位 3/4）+ 手動貼上（兩欄，可設取樣率或自動推導）。
- 運算：自寫 radix-2 FFT，4 種窗函數，10 階諧波（主線程 + inline Worker 各一份），標準 THD-R 公式，Web Worker 用 Transferable Object 避免複製。
- 輸出：6 個 metric 卡片、2 張 Chart.js 圖、諧波表格、CSV 匯出（無 PNG 匯出）。
- 缺口：沒有 sample data 按鈕、沒有 gaTrack 埋點、CSV 格式寫死、無 PNG 匯出。

### 候選方案
- **方案 A（推薦）**：Load Sample Data 按鈕。合成一組含 3/5 次諧波失真的正弦波，填入 manual tab、自動觸發分析。理由：repo 裡 efficiency-map 已有先例可參照、不碰任何既有運算/解析函式、補到新訪客沒資料可試用的實際缺口。工作量：小。
- **方案 B（附帶）**：補 3 處 `gaTrack()` 呼叫。Proposer 原始理由是「全 repo 唯一沒有 gaTrack 的工具」。
- **方案 C（不推薦，留待下一輪）**：圖表 PNG 匯出，深色模式背景合成細節較複雜，工作量中等。

## Critic 審查（sonnet, model 明確指定，獨立驗證，不接受 Proposer 結論當前提）

逐一核對 Proposer 引用的所有行號與函式簽名，發現並修正以下問題：

| # | Proposer 宣稱 | 核對結果 |
|---|---|---|
| 1 | Worker 諧波迴圈在 app.js:341 | 實際是 340（差一行） |
| 2 | efficiency-map `btnSample` 在 app.js:282-297 | 實際結束於 298（差一行） |
| 3 | 「全 repo 唯一沒有 gaTrack() 呼叫的工具」 | **錯誤** —— `tools/working-point/` 同樣完全沒有 gaTrack 呼叫，fft-analyser 是兩個之一，不是唯一。方案 B 保留但理由改為「跟 working-point 並列的兩個缺口之一，這次先補這個」 |
| 4 | 其餘行號（parseCSVFile、parseManual、fftCT、THD 公式、tooltip、mt-theme-change 監聽、exportCSV、CSV 欄位寫死） | 全部核對正確 |
| 5 | README 規則摘要 | 正確，無誤讀 |
| 6 | `.mt-btn-ghost` 存在於 shared/theme.css:138-142 | 正確 |

**額外修正（Proposer 沒點出但 Critic 發現的關鍵點）**：
- fft-analyser 全部按鈕都用 inline `onclick`，沒有任何 `addEventListener` 掛法。efficiency-map 的 `btnSample` 是用 `addEventListener`，**不應照抄**，新按鈕要沿用 fft-analyser 自己的 inline onclick 風格。
- `runAnalysis()` 用 `#panel-csv` 是否有 `active` class 判斷走 CSV 還是 manual 分支。**呼叫順序必須是先 `switchTab("manual")` 再 `runAnalysis()`**，順序顛倒會誤判走 CSV 分支導致功能失敗（此時 `csvData` 為 null 會跳出錯誤 alert）。
- `parseManual()` 若 `#sr-input` 有有效正數值會直接使用，不走時間欄自動推導 dt 分支——`loadSampleData()` 應顯式設定 `#sr-input`，比依賴自動偵測更穩妥。

**最終判斷**：同意方案 A（維持核心交付物，按上述細節修正），保留方案 B（理由修正後），不做方案 C。

## 最終實作規格（摘要，完整版見 Critic 輸出）

- 改動檔案：`tools/fft-analyser/app.js`、`tools/fft-analyser/index.html`。不動 `shared/tools.js`、`sitemap.xml`。
- `index.html`：在 `.tabs` 區塊後、`#panel-csv` 前插入 `<button class="mt-btn-ghost" id="btn-sample" onclick="loadSampleData()" data-i18n="btnSample">Sample data</button>`。
- `app.js`：
  - `MT_I18N` 新增 `btnSample: { en: 'Sample data', zh: '範例資料' }`（緊接 `btnExport` 之後）。
  - 新增 `loadSampleData()`（緊接 `parseManual()` 之後）：合成 50Hz 基頻 + 3 次(15%)/5 次(8%) 諧波 + ±0.01V 雜訊，10kHz 取樣率、4096 點，設定 `#sr-input`、填入 `#manual-input`、`switchTab("manual")`、`runAnalysis()`（順序固定不可顛倒）。
  - 3 處 `gaTrack()` 埋點：`runAnalysis()` 成功分支、`exportCSV()`、`win-card` 點擊事件，均用 `if (window.gaTrack)` guard。
- 驗收：按鈕樣式正確、點擊後自動切 tab 並跑出結果、基頻 ≈50Hz（±5Hz）、振幅 ≈1.0V（±10%）、THD 落在 12%–22% 區間（理論值 ≈16.97%）、原有 CSV/手動輸入流程不受影響（沒有修改任何既有函式）。

## 實作紀錄

照 Critic 規格實作，與規格差異：無（`loadSampleData()`、i18n key、3 處 gaTrack 插入位置都跟規格一致）。

驗證方式：
- `node --check app.js` 語法檢查通過。
- 用系統既有的 `/usr/bin/chromium`（`puppeteer-core`，臨時裝在 `/tmp`，測試完已清除，未進 repo）起 headless 瀏覽器，實際跑過一次：
  - 點擊「Sample data」按鈕後：自動切到 Paste Data tab、`sr-input` 顯示 10000、`manual-input` 填入 4096 行資料、自動觸發分析。
  - 結果：Fundamental 48.83 Hz（預期 50Hz±5Hz，通過）、Amplitude 0.9986V（預期 1.0V±10%，通過）、THD 13.55%（預期 12%–22%，通過）、Sample rate 10.0kHz、FFT size 4,096 pts，皆正確。Export CSV 按鈕正確從 hidden 變可見。無 console 錯誤。
  - 回歸測試：不透過 Sample data 按鈕、直接在 Paste Data tab 手動輸入資料並按 Analyse，流程正常跑出結果，無 console 錯誤，證實 `parseManual()`/`runAnalysis()` 等既有函式未被破壞。
- gaTrack 埋點在沒有載入 GA 腳本（`window.gaTrack` 為 undefined）的測試環境下，因為都用 `if (window.gaTrack)` guard，未拋出任何錯誤。
