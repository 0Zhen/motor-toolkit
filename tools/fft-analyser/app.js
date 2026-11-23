// FFT Analyser — application logic
// (ported from d:/ClaudeCode/fft-analyser/index.html; radix-2 FFT and window
//  math unchanged — harmonic extraction rewritten to track up to 100 orders)

// ── i18n dictionary (zh restored from old single-file version) ─────────────
var MT_I18N = {
  inputData:  { en: 'Input Data', zh: '輸入資料' },
  uploadCsv:  { en: 'Upload CSV', zh: '上傳 CSV' },
  pasteData:  { en: 'Paste Data', zh: '貼上資料' },
  dropMsg:    { en: 'Click to upload or drag & drop a CSV file', zh: '點擊上傳或拖曳 CSV 檔案' },
  dropSub:    { en: 'Tektronix format — column D = time, column E = voltage', zh: 'Tektronix 格式 — D 欄 = 時間，E 欄 = 電壓' },
  srLabel:    { en: 'Sampling rate (Hz):', zh: '取樣率 (Hz)：' },
  srHint:     { en: 'Leave blank to auto-detect', zh: '時間欄為秒時可留空' },
  srPh:       { en: 'auto-detect from time column', zh: '留空自動偵測' },
  manualPh:   { en: 'Paste data here…', zh: '在此貼上資料…' },
  winFunc:    { en: 'Window Function', zh: '窗函數' },
  btnAnalyse: { en: '▶ Analyse', zh: '▶ 開始分析' },
  btnExport:  { en: '⬇ Export CSV', zh: '⬇ 匯出 CSV' },
  btnSample:  { en: 'Sample data', zh: '範例資料' },
  preview:    { en: 'Preview', zh: '預覽' },
  barTitle:   { en: 'Harmonic amplitude (log scale)', zh: '諧波振幅（對數刻度）' },
  specTitle:  { en: 'Frequency spectrum', zh: '頻譜圖' },
  summary:    { en: 'Harmonic Summary', zh: '諧波摘要' },
  thOrder:    { en: 'Order', zh: '階次' },
  thFreq:     { en: 'Frequency (Hz)', zh: '頻率 (Hz)' },
  thAmp:      { en: 'Amplitude (V)', zh: '振幅 (V)' },
  thRel:      { en: 'Relative to fund.', zh: '相對基頻' },
  ready:      { en: 'Ready', zh: '就緒' },

  hintBox: {
    en: 'Two columns (time or index + voltage), tab or space separated:<br>'+
        '&nbsp;&nbsp;-2.00E-02 &nbsp; 1.82E-01<br>'+
        '&nbsp;&nbsp;-1.99E-02 &nbsp; 1.81E-01 &nbsp; ...<br><br>'+
        'Index column (1, 2, 3 …) — enter sampling rate below:<br>'+
        '&nbsp;&nbsp;1 &nbsp; 0.087 &nbsp;&nbsp;&nbsp; 2 &nbsp; 0.174 &nbsp; ...',
    zh: '兩欄資料（時間或序號 + 電壓），Tab 或空白分隔：<br>'+
        '&nbsp;&nbsp;-2.00E-02 &nbsp; 1.82E-01<br>'+
        '&nbsp;&nbsp;-1.99E-02 &nbsp; 1.81E-01 &nbsp; ...<br><br>'+
        '左欄為序號（1, 2, 3…）時，請在下方填入取樣率：<br>'+
        '&nbsp;&nbsp;1 &nbsp; 0.087 &nbsp;&nbsp;&nbsp; 2 &nbsp; 0.174 &nbsp; ...',
  },

  winFlatTop: { en: 'Best amplitude accuracy — ideal for harmonic measurement', zh: '振幅精度最高 — 適合量諧波大小' },
  winHann:    { en: 'Good frequency resolution — general-purpose default', zh: '頻率解析度好 — 一般分析的預設選擇' },
  winHamming: { en: 'Low sidelobes — good for speech / telecom', zh: '旁瓣較小 — 適合語音／通訊訊號' },
  winRect:    { en: 'No weighting — best resolution but heavy leakage', zh: '無加權 — 頻率解析度最好但洩漏嚴重' },

  mFund: { en: 'Fundamental', zh: '基頻' },
  mAmp:  { en: 'Amplitude (1x)', zh: '振幅 (1x)' },
  mTHD:  { en: 'THD (2–{n}x)', zh: 'THD (2–{n}x)' },
  mSr:   { en: 'Sample rate', zh: '取樣率' },
  mFft:  { en: 'FFT size', zh: 'FFT 大小' },
  mWin:  { en: 'Window', zh: '窗函數' },
  kHz:   { en: 'kHz', zh: 'kHz' },
  pts:   { en: 'pts', zh: '點' },

  ttOrder: { en: '{h}x harmonic', zh: '第 {h} 次諧波' },
  ttFreq:  { en: 'Freq', zh: '頻率' },
  ttAmp:   { en: 'Amp', zh: '振幅' },

  fundamentalWord: { en: 'fundamental', zh: '基頻' },
  thdRow:          { en: 'Total Harmonic Distortion (THD, orders 2–{n})', zh: '總諧波失真 (THD，2–{n} 階)' },
  thdOrderLabel:   { en: 'THD up to order', zh: 'THD 計算到' },
  noteNyquist:     { en: 'Sampling rate only allows harmonics up to {h}x. For {m}x, sample faster than {sr} kHz.',
                     zh: '取樣率只能算到 {h} 階；要算到 {m} 階，取樣率需高於 {sr} kHz。' },
  noteCycles:      { en: 'Record holds only {c} cycles of the fundamental — use ≥ 10 cycles, otherwise neighbouring harmonics leak into each other (even orders especially).',
                     zh: '資料只有 {c} 個基頻週期，建議 ≥ 10 個週期，否則相鄰諧波會互相洩漏（偶次諧波尤其不準）。' },

  axisOrder:      { en: 'Harmonic order', zh: '諧波階次' },
  zoomHint:       { en: 'Wheel: zoom · Drag: pan · Double-click: reset', zh: '滾輪：縮放．拖曳：平移．雙擊：重設' },
  rangeOrder:     { en: 'Orders', zh: '階次' },
  rangeHz:        { en: 'Hz', zh: 'Hz' },
  btnReset:       { en: 'Reset', zh: '重設' },
  logY:           { en: 'Log Y', zh: '對數 Y 軸' },

  spectrumLabel:  { en: 'Spectrum', zh: '頻譜' },
  harmonicsLabel: { en: 'Harmonics', zh: '諧波' },
  axisFreq:       { en: 'Frequency (Hz)', zh: '頻率 (Hz)' },
  axisAmp:        { en: 'Amplitude (V)', zh: '振幅 (V)' },

  startingWorker: { en: 'Starting worker…', zh: '啟動運算中…' },
  renderingChart: { en: 'Rendering…', zh: '繪製圖表…' },
  doneMsg:        { en: 'Done — fundamental {f} Hz | THD {t}%', zh: '完成 — 基頻 {f} Hz | THD {t}%' },
  errMsg:         { en: 'Error: {m}', zh: '錯誤：{m}' },
  loadedMsg:      { en: 'Loaded {n} points — {f}', zh: '已載入 {n} 個資料點 — {f}' },

  alertNoCsv:    { en: 'Please upload a CSV file first.', zh: '請先上傳 CSV 檔案。' },
  alertNoPaste:  { en: 'Please paste your data first.', zh: '請先貼上資料。' },
  alertParse:    { en: 'Expected 2 columns per line:\n{l}', zh: '每行需要恰好兩個數值：\n{l}' },
  alertNoSr:     { en: 'Cannot auto-detect sampling rate. Please enter it manually.', zh: '無法自動偵測取樣率，請在上方手動填入。' },
  alertFewPts:   { en: 'Not enough data ({n} points — need at least 8).', zh: '資料點數不足（{n} 點，至少需要 8 點）。' },
  alertCsvFmt:   { en: 'Not enough data points (< 8). Check CSV format.', zh: '資料點不足（< 8），請確認 CSV 格式。' },
  alertNoSrCsv:  { en: 'Cannot determine sampling rate from CSV time column.', zh: '無法從時間欄計算取樣率。' },

  aboutLabel:     { en: 'About this tool', zh: '關於此工具' },

  warnLabel:  { en: 'Warnings you may see', zh: '可能出現的警告' },
  warnSub:    { en: 'Shown above the harmonic table when the data limits the result. The analysis still runs, but read the affected orders with care.',
                zh: '資料條件限制結果時，會顯示在諧波表格上方。分析仍會完成，但相關階次的數值要小心解讀。' },
  whyLabel:   { en: 'Why', zh: '原因' },
  fixLabel:   { en: 'Fix', zh: '解法' },
  warnNyqMsg: { en: '⚠ Sampling rate only allows harmonics up to 99x. For 100x, sample faster than 10.0 kHz.',
                zh: '⚠ 取樣率只能算到 99 階；要算到 100 階，取樣率需高於 10.0 kHz。' },
  warnNyqWhy: { en: 'Order h sits at h × f₀ and the FFT only covers up to half the sampling rate (Nyquist). Reaching 100x needs a sampling rate above 2 × 100 × f₀, e.g. above 10 kHz for a 50 Hz fundamental. Orders past the limit are simply not listed.',
                zh: '第 h 階位於 h × f₀，而 FFT 只能看到取樣率的一半（Nyquist 頻率）。要算到 100 階，取樣率需高於 2 × 100 × f₀，例如基頻 50 Hz 時需高於 10 kHz。超過上限的階次不會列出。' },
  warnNyqFix: { en: 'Raise the oscilloscope sampling rate, or accept fewer orders. For accurate high-order amplitudes, aim for 5–10× the minimum.',
                zh: '提高示波器取樣率，或接受較少的階數。要讓高階振幅準確，建議取樣率是最低需求的 5–10 倍。' },
  warnCycMsg: { en: '⚠ Record holds only 5.0 cycles of the fundamental — use ≥ 10 cycles, otherwise neighbouring harmonics leak into each other (even orders especially).',
                zh: '⚠ 資料只有 5.0 個基頻週期，建議 ≥ 10 個週期，否則相鄰諧波會互相洩漏（偶次諧波尤其不準）。' },
  warnCycWhy: { en: "Adjacent harmonics are as many FFT bins apart as the record has cycles. With few cycles that gap is narrower than the window's main lobe (Flat-top is widest), so a strong harmonic spills into its neighbours. A weak even order next to strong odd orders then reads far too high, and THD is inflated.",
                zh: '相鄰諧波在頻譜上相隔的 bin 數等於資料的週期數。週期太少時，間距比窗函數的主瓣還窄（Flat-top 最寬），強的諧波會漏到隔壁。夾在強奇次諧波中間的弱偶次諧波會被高估，THD 也會偏大。' },
  warnCycFix: { en: 'Capture at least 10 cycles, e.g. ≥ 200 ms at 50 Hz. More cycles also lower the noise floor.',
                zh: '至少擷取 10 個週期，例如 50 Hz 需 ≥ 200 ms。週期越多，雜訊底也越低。' },
  errLabel:   { en: 'Input errors (pop-up)', zh: '輸入錯誤（彈出視窗）' },
  errSrMsg:   { en: 'Cannot auto-detect sampling rate', zh: '無法自動偵測取樣率' },
  errSrFix:   { en: 'The time column is constant, missing, or an index (1, 2, 3 …). Type the sampling rate in Hz into the field above the data.',
                zh: '時間欄是固定值、缺漏，或是序號（1, 2, 3…）。請在資料上方的欄位填入取樣率 (Hz)。' },
  errFmtMsg:  { en: 'Not enough data points / Expected 2 columns per line', zh: '資料點數不足／每行需要恰好兩個數值' },
  errFmtFix:  { en: 'CSV upload expects the Tektronix layout (column D = time, column E = voltage). Pasted data needs exactly two numbers per line, separated by tab or space, and at least 8 lines.',
                zh: 'CSV 上傳需為 Tektronix 格式（D 欄 = 時間，E 欄 = 電壓）。貼上的資料每行需恰好兩個數值，以 Tab 或空白分隔，且至少 8 行。' },
  whatDoesLabel:  { en: 'What it does', zh: '功能說明' },
  whatDoesText:   { en: 'Upload an oscilloscope CSV or paste time-domain data to compute the frequency spectrum, extract harmonic amplitudes (1x–100x), and calculate THD — all in your browser, no install needed.',
                    zh: '上傳示波器 CSV 檔案，或貼上時域資料，即可在瀏覽器中計算頻譜、擷取諧波振幅（1x–100x）並計算 THD——不需安裝任何軟體。' },
  winFuncsLabel:  { en: 'Window functions', zh: '窗函數' },
  seoFlatTop:     { en: 'best amplitude accuracy, ideal for THD measurement', zh: '振幅精度最高，適合量測 THD' },
  seoHann:        { en: 'general-purpose spectrum analysis', zh: '一般用途頻譜分析' },
  seoHamming:     { en: 'low sidelobes, speech & telecom', zh: '旁瓣較小，適合語音與通訊' },
  seoRect:        { en: 'best frequency resolution', zh: '頻率解析度最佳' },
  useCasesLabel:  { en: 'Use cases', zh: '應用場景' },
  useCasesText:   { en: 'Motor back-EMF harmonic analysis · Power quality THD measurement · Audio distortion testing · Vibration analysis · FFT education',
                    zh: '馬達反電動勢諧波分析．電力品質 THD 量測．音訊失真測試．振動分析．FFT 教學' },
};

function getThemeColors() {
  const s = getComputedStyle(document.documentElement);
  return {
    grid:  s.getPropertyValue("--grid-c").trim(),
    text2: s.getPropertyValue("--text2").trim(),
    text3: s.getPropertyValue("--text3").trim(),
  };
}

function updateChartColors(chart) {
  const c = getThemeColors();
  ["x","y"].forEach(ax => {
    chart.options.scales[ax].ticks.color = c.text2;
    chart.options.scales[ax].grid.color  = c.grid;   // bar x grid is hidden anyway
    if (chart.options.scales[ax].title)
      chart.options.scales[ax].title.color = c.text2;
  });
  chart.update("none");
}

// Re-draw chart colors whenever shell.js toggles the theme.
document.addEventListener("mt-theme-change", () => {
  if (chartBar)  updateChartColors(chartBar);
  if (chartSpec) updateChartColors(chartSpec);
});

// ── Window cards ───────────────────────────────────────────────────────────
const WIN_DESC_KEYS = {
  "Flat-top":"winFlatTop",
  "Hann":"winHann",
  "Hamming":"winHamming",
  "Rectangular":"winRect",
};
let selectedWindow = "Flat-top";
function buildWinCards() {
  const grid = document.getElementById("win-grid");
  grid.innerHTML = "";
  const names = ["Flat-top","Hann","Hamming","Rectangular"];
  names.forEach(name => {
    const el = document.createElement("div");
    el.className = "win-card" + (name === selectedWindow ? " selected" : "");
    el.innerHTML = `<div class="wname">${name}</div><div class="wdesc">${window.mtT(WIN_DESC_KEYS[name])}</div>`;
    el.onclick = () => {
      selectedWindow = name;
      document.querySelectorAll(".win-card").forEach(c => c.classList.remove("selected"));
      el.classList.add("selected");
      if (window.gaTrack) gaTrack('select_window', name);
      // Results already on screen → re-run with the new window, keep the zoom.
      if (lastResult) runAnalysis({keepView:true});
    };
    grid.appendChild(el);
  });
}
buildWinCards();

// ── Language switch: re-render dynamic content (shell.js handles data-i18n) ─
function applyHintBox() {
  const el = document.getElementById("t-hint");
  if (el) el.innerHTML = window.mtT("hintBox");
}
applyHintBox();

document.addEventListener("mt-lang-change", () => {
  applyHintBox();
  buildWinCards();
  if (lastResult) {
    renderMetrics(lastResult);
    renderBarChart(lastResult);
    renderSpecChart(lastResult);
    renderTable(lastResult);
  }
});

// ── Tab switch ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById("tab-csv").classList.toggle("active", tab==="csv");
  document.getElementById("tab-manual").classList.toggle("active", tab==="manual");
  document.getElementById("panel-csv").classList.toggle("active", tab==="csv");
  document.getElementById("panel-manual").classList.toggle("active", tab==="manual");
}

// ── File handling ──────────────────────────────────────────────────────────
let csvData = null, lastResult = null;
let chartBar = null, chartSpec = null;

function onDrag(e, over) { e.preventDefault(); document.getElementById("drop-zone").classList.toggle("drag",over); }
function onDrop(e) { e.preventDefault(); onDrag(e,false); if(e.dataTransfer.files[0]) parseCSVFile(e.dataTransfer.files[0]); }
function onFileSelect(e) { if(e.target.files[0]) parseCSVFile(e.target.files[0]); }

function parseCSVFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    const rows = ev.target.result.split(/\r?\n/);
    const times=[], voltages=[];
    for(const row of rows) {
      const cols = row.split(/[,\t]/);
      if(cols.length < 5) continue;
      const tv=parseFloat(cols[3]), v=parseFloat(cols[4]);
      if(isNaN(tv)||isNaN(v)) continue;
      times.push(tv); voltages.push(v);
    }
    if(voltages.length < 8) { alert(window.mtT("alertCsvFmt")); return; }
    csvData = {times, voltages};
    const fn = document.getElementById("file-name");
    fn.textContent = `✓  ${file.name}  (${voltages.length.toLocaleString()} ${window.mtT("pts")})`;
    fn.classList.remove("hidden");
    setProgress(0, window.mtT("loadedMsg").replace("{n}", voltages.length.toLocaleString()).replace("{f}", file.name));
  };
  reader.readAsText(file);
}

function parseManual() {
  const text = document.getElementById("manual-input").value.trim();
  if(!text) { alert(window.mtT("alertNoPaste")); return null; }
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const pairs=[];
  for(const l of lines) {
    const parts = l.split(/[\t ]+/);
    if(parts.length!==2) { alert(window.mtT("alertParse").replace("{l}", l)); return null; }
    const a=parseFloat(parts[0]), b=parseFloat(parts[1]);
    if(isNaN(a)||isNaN(b)) { alert(window.mtT("alertParse").replace("{l}", l)); return null; }
    pairs.push([a,b]);
  }
  const times=pairs.map(p=>p[0]), voltages=pairs.map(p=>p[1]);
  const srVal=parseFloat(document.getElementById("sr-input").value);
  let sr;
  if(!isNaN(srVal)&&srVal>0) {
    sr=srVal;
  } else {
    let dt=null;
    for(let i=1;i<times.length;i++){const d=times[i]-times[i-1];if(Math.abs(d)>1e-15){dt=d;break;}}
    if(!dt||dt<=0){alert(window.mtT("alertNoSr")); return null;}
    sr=1/dt;
  }
  if(voltages.length<8){alert(window.mtT("alertFewPts").replace("{n}", voltages.length)); return null;}
  return {voltages, sr};
}

function loadSampleData() {
  const sr = 10000;      // Hz — sampling rate
  const N  = 4096;       // samples — power of 2, avoids FFT zero-padding shift
  const f0 = 50;         // Hz — fundamental frequency
  const harmonics = [
    { order: 1, amp: 1.0  },   // fundamental
    { order: 3, amp: 0.15 },   // 3rd harmonic, 15% of fundamental
    { order: 5, amp: 0.08 },   // 5th harmonic, 8% of fundamental
  ];
  const noiseAmp = 0.01; // uniform noise, +/-0.01 V on top of the signal

  const lines = [];
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    let v = 0;
    for (const h of harmonics) v += h.amp * Math.sin(2 * Math.PI * f0 * h.order * t);
    v += (Math.random() - 0.5) * 2 * noiseAmp;
    lines.push(t.toFixed(6) + "\t" + v.toFixed(6));
  }

  document.getElementById("sr-input").value = sr;
  document.getElementById("manual-input").value = lines.join("\n");
  // Must switch tab before running: runAnalysis() decides CSV-vs-manual by
  // checking whether #panel-csv has the "active" class.
  switchTab("manual");
  runAnalysis();
}

// ── FFT ────────────────────────────────────────────────────────────────────
// These functions run inside the Web Worker: WORKER_SRC below is built from
// their source text, so there is exactly one copy of the math.
const ACF = {"Flat-top":4.638,"Hann":2.0,"Hamming":1.852,"Rectangular":1.0};
const MAX_ORDER = 100;   // highest harmonic order extracted

function nextPow2(n){let p=1;while(p<n)p<<=1;return p;}

function fftCT(re,im){
  const N=re.length; let j=0;
  for(let i=0;i<N-1;i++){
    if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
    let k=N>>1; while(k<=j){j-=k;k>>=1;} j+=k;
  }
  for(let len=2;len<=N;len<<=1){
    const half=len>>1,ang=-2*Math.PI/len;
    for(let i=0;i<N;i+=len)
      for(let k=0;k<half;k++){
        const c=Math.cos(ang*k),s=Math.sin(ang*k);
        const tr=re[i+k+half]*c-im[i+k+half]*s,ti=re[i+k+half]*s+im[i+k+half]*c;
        re[i+k+half]=re[i+k]-tr;im[i+k+half]=im[i+k]-ti;re[i+k]+=tr;im[i+k]+=ti;
      }
  }
}

function winVal(name,i,N){
  const p=2*Math.PI*i/(N-1);
  if(name==="Flat-top") return .21557895-.41663158*Math.cos(p)+.277263158*Math.cos(2*p)-.083578947*Math.cos(3*p)+.006947368*Math.cos(4*p);
  if(name==="Hann")    return .5*(1-Math.cos(p));
  if(name==="Hamming") return .54-.46*Math.cos(p);
  return 1;
}

// Sub-bin peak position: 3-point parabolic fit around local maximum k.
function refinePeak(mag,k){
  if(k<=0||k>=mag.length-1) return k;
  const a=mag[k-1],b=mag[k],c=mag[k+1],d=a-2*b+c;
  return d<0 ? k+0.5*(a-c)/d : k;
}

// Harmonic extraction. The fundamental's bin is only known to ±0.5 bin, and
// that error grows h-fold at order h (±50 bins at h=100), so instead of
// reading bin round(h·f0) we (1) search for the local peak within ±R bins of
// the predicted position and (2) re-estimate f0 from every clearly visible
// harmonic peak (error ÷ h), so the prediction stays on target up to h=100.
function extractHarmonics(mag,kFund,Nf,N0,maxOrder){
  const OR=mag.length-1;
  let f0b=refinePeak(mag,kFund);                 // fundamental, in bins
  const fundAmp=mag[kFund];
  // search half-width: ~2 original bins (covers the window's flat top),
  // never more than 40% of the harmonic spacing
  const R=Math.max(1,Math.min(Math.round(2*Nf/N0)+1,Math.floor(0.4*f0b)));
  // Only peaks far above the noise floor may refine f0 — otherwise noise
  // peaks make the prediction random-walk. Floor = median bin magnitude
  // (sampled); 10× median is > 11σ for Rayleigh-distributed noise.
  const stride=Math.max(1,Math.floor(OR/65536)),smp=[];
  for(let i=1;i<=OR;i+=stride) smp.push(mag[i]);
  smp.sort((a,b)=>a-b);
  const thr=Math.max(1e-3*fundAmp,10*smp[smp.length>>1]);
  const found=[{h:1,amp:fundAmp}];
  for(let h=2;h<=maxOrder;h++){
    const c=Math.round(h*f0b);
    if(c+R>OR) break;                            // beyond Nyquist
    let k=c-R;
    for(let i=c-R+1;i<=c+R;i++) if(mag[i]>mag[k]) k=i;
    found.push({h,amp:mag[k]});
    // strong, interior peak → use it to sharpen the f0 estimate
    if(mag[k]>thr && k>c-R && k<c+R) f0b=refinePeak(mag,k)/h;
  }
  return {f0b,harmonics:found};
}

function analyseSignal(voltages,sr,win,progress){
  progress=progress||function(){};
  const acf=ACF[win],N0=voltages.length;
  progress(20,"Removing DC…");
  let avg=0; for(let i=0;i<N0;i++) avg+=voltages[i]; avg/=N0;
  const Nf=nextPow2(N0);
  progress(35,"Applying window…");
  const re=new Float64Array(Nf),im=new Float64Array(Nf);
  for(let i=0;i<N0;i++) re[i]=(voltages[i]-avg)*winVal(win,i,N0);
  progress(50,"Running FFT… ("+N0.toLocaleString()+" pts → "+Nf.toLocaleString()+")");
  fftCT(re,im);
  progress(80,"Computing spectrum…");
  const fb=sr/Nf,OR=Nf>>1,kMin=Math.floor(Nf/N0)+1;   // skip bins below 1 original bin
  const mag=new Float64Array(OR+1);
  let maxA=0,kFund=0;
  for(let i=0;i<=OR;i++){
    mag[i]=Math.sqrt(re[i]*re[i]+im[i]*im[i])*(2/N0)*acf;
    if(i>=kMin&&mag[i]>maxA){maxA=mag[i];kFund=i;}
  }
  const ex=extractHarmonics(mag,kFund,Nf,N0,MAX_ORDER);
  const f0=ex.f0b*fb;
  const harmonics=ex.harmonics.map(x=>({h:x.h,freq:f0*x.h,amp:x.amp}));
  return {mag,fb,harmonics,freqFund:f0,maxAmp:maxA,sr,Nfft:Nf,Norig:N0};
}

// THD over orders 2..n (THD-F: relative to the fundamental)
function thdUpTo(harmonics,n){
  if(!harmonics.length||!harmonics[0].amp) return 0;
  let s=0; for(const x of harmonics) if(x.h>1&&x.h<=n) s+=x.amp*x.amp;
  return Math.sqrt(s)/harmonics[0].amp;
}

// ── Web Worker (inline blob — works under file://) ───────────────────────
const WORKER_SRC =
  "const ACF="+JSON.stringify(ACF)+";const MAX_ORDER="+MAX_ORDER+";\n"+
  [nextPow2,fftCT,winVal,refinePeak,extractHarmonics,analyseSignal].map(String).join("\n")+
  "\nself.onmessage=function(e){const d=e.data;"+
  "const r=analyseSignal(d.voltages,d.sr,d.win,(pct,msg)=>self.postMessage({type:'progress',pct,msg}));"+
  "self.postMessage({type:'done',result:r},[r.mag.buffer]);};";

let activeWorker=null;   // only the latest run may render its result
function runAnalysis(opts){
  const keepView=!!(opts&&opts.keepView);
  const isCSV=document.getElementById("panel-csv").classList.contains("active");
  let voltages,sr;
  if(isCSV){
    if(!csvData){alert(window.mtT("alertNoCsv"));return;}
    voltages=csvData.voltages;
    let dt=null;
    for(let i=1;i<csvData.times.length;i++){const d=csvData.times[i]-csvData.times[i-1];if(Math.abs(d)>1e-15){dt=d;break;}}
    if(!dt){alert(window.mtT("alertNoSrCsv"));return;}
    sr=1/dt;
  } else {
    const p=parseManual(); if(!p) return;
    voltages=p.voltages; sr=p.sr;
  }

  const btn=document.getElementById("btn-analyse");
  btn.disabled=true;
  setProgress(10, window.mtT("startingWorker"));

  // Transfer voltages as ArrayBuffer to avoid copying 100M floats
  const buf = new Float64Array(voltages).buffer;

  const win    = selectedWindow;
  const blob   = new Blob([WORKER_SRC],{type:"application/javascript"});
  const blobURL= URL.createObjectURL(blob);
  if(activeWorker) activeWorker.terminate();   // superseded by this run
  const worker = activeWorker = new Worker(blobURL);

  worker.onmessage = function(e){
    if(worker!==activeWorker) return;
    const d = e.data;
    if(d.type==="progress"){
      setProgress(d.pct, d.msg);
    } else if(d.type==="done"){
      URL.revokeObjectURL(blobURL);
      activeWorker=null;
      setProgress(90, window.mtT("renderingChart"));
      d.result.thd = thdUpTo(d.result.harmonics, thdOrder);
      d.result.win = win;
      lastResult = d.result;
      renderResults(d.result, keepView);
      if (window.gaTrack) gaTrack('run_analysis', win);
      setProgress(100, window.mtT("doneMsg")
        .replace("{f}", d.result.freqFund.toFixed(2))
        .replace("{t}", (d.result.thd*100).toFixed(2)));
      document.getElementById("btn-dl").classList.remove("hidden");
      btn.disabled=false;
    }
  };
  worker.onerror = function(err){
    URL.revokeObjectURL(blobURL);
    if(worker!==activeWorker) return;
    activeWorker=null;
    setProgress(0, window.mtT("errMsg").replace("{m}", err.message));
    alert(err.message);
    btn.disabled=false;
  };

  // Transfer the buffer (zero-copy) to worker
  worker.postMessage({voltages: new Float64Array(buf), sr, win}, [buf]);
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderResults(r,keepView){
  document.getElementById("results").classList.remove("hidden");
  const H=r.harmonics.length;
  barLim ={min:0.5, max:H+0.5};
  specLim={min:0,   max:r.fb*(r.mag.length-1)};
  if(keepView){                       // same data, new window: stay where the user zoomed
    barView =clampView(barView,barLim,3);
    specView=clampView(specView,specLim,r.fb*8);
  } else {
    barView ={...barLim};
    specView=defaultSpecView(r);
  }
  renderMetrics(r);
  renderBarChart(r);
  renderSpecChart(r);
  renderTable(r);
}

function renderMetrics(r){
  const fund=r.harmonics[0];
  document.getElementById("metrics-row").innerHTML=`
    <div class="metric"><div class="mlabel">${window.mtT("mFund")}</div><div class="mvalue">${r.freqFund.toFixed(2)}<span class="munit">Hz</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mAmp")}</div><div class="mvalue">${fund?fund.amp.toFixed(4):"—"}<span class="munit">V</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mTHD").replace("{n}", thdOrder)}</div><div class="mvalue">${(r.thd*100).toFixed(2)}<span class="munit">%</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mSr")}</div><div class="mvalue">${(r.sr/1000).toFixed(1)}<span class="munit">${window.mtT("kHz")}</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mFft")}</div><div class="mvalue">${r.Nfft.toLocaleString()}<span class="munit">${window.mtT("pts")}</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mWin")}</div><div class="mvalue" style="font-size:14px">${r.win}</div></div>
  `;
}

// ── Custom tooltip ────────────────────────────────────────────────────────
const ttEl = document.getElementById("tt");

const tooltipPlugin = {
  id:"customTooltip",
  afterEvent(chart, args){
    const e = args.event;
    if(e.type==="mousemove"){
      const pts = chart.getElementsAtEventForMode(e.native,"nearest",{intersect:true},false);
      if(pts.length){
        const idx  = pts[0].index;
        const dsIdx= pts[0].datasetIndex;
        const ds   = chart.data.datasets[dsIdx];
        // Only show for harmonics dataset (ds index 1 on spec, any on bar)
        if(chart.canvas.id==="chart-spec" && dsIdx!==1){hideTooltip();return;}
        const raw  = ds.data[idx];
        const h    = chart.canvas.id==="chart-bar"
                     ? lastResult.harmonics[idx]
                     : {h:raw.h, freq:raw.x, amp:raw.y};
        const html = `<strong>${window.mtT("ttOrder").replace("{h}", h.h)}</strong><br>`+
                     `${window.mtT("ttFreq")}:&nbsp; ${h.freq.toFixed(2)} Hz<br>`+
                     `${window.mtT("ttAmp")}:&nbsp; ${fmtAmp(h.amp)}`;
        showTooltip(html, e.native.clientX, e.native.clientY);
      } else {
        hideTooltip();
      }
    } else if(e.type==="mouseout"){
      hideTooltip();
    }
  }
};

function showTooltip(html, x, y){
  ttEl.innerHTML = html;
  ttEl.style.display = "block";
  const tw=ttEl.offsetWidth, th=ttEl.offsetHeight;
  const vw=window.innerWidth, vh=window.innerHeight;
  let lx=x+14, ly=y-10;
  if(lx+tw > vw-10) lx=x-tw-14;
  if(ly+th > vh-10) ly=y-th-10;
  if(ly<10) ly=10;
  ttEl.style.left=lx+"px";
  ttEl.style.top=ly+"px";
}
function hideTooltip(){ ttEl.style.display="none"; }

// ── Chart view state (zoom / pan) ──────────────────────────────────────────
// Bar chart x is in harmonic order (bar centres at 1..H); spectrum x in Hz.
let barView={min:0.5,max:10.5},  barLim={min:0.5,max:10.5};
let specView={min:0,max:1},      specLim={min:0,max:1};
let thdOrder=40;                 // THD sums orders 2..thdOrder
const SPEC_TARGET_PTS=1600;      // max points drawn on the spectrum (peak-preserving)

function clampView(v,lim,minSpan){
  const span=Math.min(Math.max(v.max-v.min,minSpan),lim.max-lim.min);
  const min=Math.max(lim.min,Math.min(v.min,lim.max-span));
  return {min,max:min+span};
}
function specMinSpan(){ return lastResult ? lastResult.fb*8 : 1; }

function setBarView(v){
  barView=clampView(v,barLim,3);
  if(!chartBar) return;
  chartBar.options.scales.x.min=barView.min;
  chartBar.options.scales.x.max=barView.max;
  chartBar.update("none");
  syncRangeInputs();
}
function setSpecView(v){
  specView=clampView(v,specLim,specMinSpan());
  if(!chartSpec||!lastResult) return;
  chartSpec.options.scales.x.min=specView.min;
  chartSpec.options.scales.x.max=specView.max;
  chartSpec.data.datasets[0].data=specPoints(lastResult,specView.min,specView.max);
  chartSpec.update("none");
  syncRangeInputs();
}

// Spectrum points for [fmin,fmax]: every bin if few, otherwise the max of each
// bucket, so peaks stay visible however far the user zooms out.
function specPoints(r,fmin,fmax){
  const last=r.mag.length-1;
  const i0=Math.max(0,Math.floor(fmin/r.fb)-1), i1=Math.min(last,Math.ceil(fmax/r.fb)+1);
  const n=i1-i0+1, out=[];
  if(n<=SPEC_TARGET_PTS*2){
    for(let i=i0;i<=i1;i++) out.push({x:i*r.fb,y:r.mag[i]});
    return out;
  }
  const step=n/SPEC_TARGET_PTS;
  for(let b=0;b<SPEC_TARGET_PTS;b++){
    const a=i0+Math.floor(b*step), e=Math.min(i1,i0+Math.floor((b+1)*step)-1);
    let k=a; for(let i=a+1;i<=e;i++) if(r.mag[i]>r.mag[k]) k=i;
    out.push({x:k*r.fb,y:r.mag[k]});
  }
  return out;
}

// Wheel = zoom around the cursor, drag = pan, double-click = reset.
function attachZoomPan(canvasId,getChart,getView,setView,resetView){
  const cv=document.getElementById(canvasId);
  cv.addEventListener("wheel",e=>{
    const ch=getChart(); if(!ch) return;
    e.preventDefault();
    const v=getView(), area=ch.chartArea;
    const px=Math.min(Math.max(e.offsetX,area.left),area.right);
    const at=v.min+(px-area.left)/(area.right-area.left)*(v.max-v.min);
    const dy=e.deltaMode===1?e.deltaY*33:e.deltaY;   // lines → pixels (Firefox)
    const f=Math.pow(1.0015,dy);                       // ~20% per wheel notch, smooth on trackpads
    setView({min:at-(at-v.min)*f, max:at+(v.max-at)*f});
    hideTooltip();
  },{passive:false});
  let drag=null;
  cv.addEventListener("pointerdown",e=>{
    const ch=getChart(); if(!ch||e.button!==0) return;
    drag={x:e.clientX,v:{...getView()},w:ch.chartArea.right-ch.chartArea.left};
    cv.setPointerCapture(e.pointerId); cv.classList.add("dragging");
  });
  cv.addEventListener("pointermove",e=>{
    if(!drag) return;
    const d=(e.clientX-drag.x)/drag.w*(drag.v.max-drag.v.min);
    setView({min:drag.v.min-d,max:drag.v.max-d});
    hideTooltip();
  });
  const end=()=>{ if(drag){drag=null;cv.classList.remove("dragging");} };
  cv.addEventListener("pointerup",end);
  cv.addEventListener("pointercancel",end);
  cv.addEventListener("dblclick",()=>resetView());
}

function defaultSpecView(r){
  return {min:0,max:Math.min(specLim.max,r.freqFund*(r.harmonics.length+0.5))};
}
function resetBarView(){ if(lastResult) setBarView({...barLim}); }
function resetSpecView(){ if(lastResult) setSpecView(defaultSpecView(lastResult)); }
attachZoomPan("chart-bar", ()=>chartBar, ()=>barView, setBarView, resetBarView);
attachZoomPan("chart-spec",()=>chartSpec,()=>specView,setSpecView,resetSpecView);

// Range inputs under each chart
function syncRangeInputs(){
  const set=(id,v)=>{const el=document.getElementById(id); if(el&&document.activeElement!==el) el.value=v;};
  set("bar-from",Math.max(1,Math.ceil(barView.min)));
  set("bar-to",  Math.floor(barView.max));
  set("spec-from",+specView.min.toPrecision(5));
  set("spec-to",  +specView.max.toPrecision(5));
}
function applyBarRange(){
  const a=parseFloat(document.getElementById("bar-from").value),
        b=parseFloat(document.getElementById("bar-to").value);
  if(isNaN(a)||isNaN(b)) return syncRangeInputs();
  setBarView({min:Math.min(a,b)-0.5,max:Math.max(a,b)+0.5});
}
function applySpecRange(){
  const a=parseFloat(document.getElementById("spec-from").value),
        b=parseFloat(document.getElementById("spec-to").value);
  if(isNaN(a)||isNaN(b)||a===b) return syncRangeInputs();
  setSpecView({min:Math.min(a,b),max:Math.max(a,b)});
}
function onRangeKey(e,apply){ if(e.key==="Enter") apply(); }
function onSpecLogToggle(){ if(lastResult) renderSpecChart(lastResult); }

function onThdOrderChange(){
  thdOrder=parseInt(document.getElementById("thd-order").value,10)||40;
  if(!lastResult) return;
  lastResult.thd=thdUpTo(lastResult.harmonics,thdOrder);
  renderMetrics(lastResult);
  renderBarChart(lastResult);
  renderTable(lastResult);
}

// ── Bar chart ──────────────────────────────────────────────────────────────
function renderBarChart(r){
  if(chartBar) chartBar.destroy();
  const c=getThemeColors();
  chartBar=new Chart(document.getElementById("chart-bar").getContext("2d"),{
    type:"bar",
    data:{
      datasets:[{
        data:r.harmonics.map(h=>({x:h.h,y:h.amp})),
        // fundamental blue; orders counted in THD red; orders beyond the THD limit faded
        backgroundColor:r.harmonics.map(h=>h.h===1?"#2563eb":h.h<=thdOrder?"#dc2626":"rgba(220,38,38,0.35)"),
        borderRadius:2,borderSkipped:false,
        barPercentage:0.8,categoryPercentage:1,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      scales:{
        y:{type:"logarithmic",grid:{color:c.grid},
           ticks:{font:{size:10},color:c.text2,callback:v=>v>=.01?v.toFixed(3):v.toExponential(1)}},
        x:{type:"linear",offset:false,min:barView.min,max:barView.max,grid:{display:false},
           title:{display:true,text:window.mtT("axisOrder"),font:{size:11},color:c.text2},
           ticks:{font:{size:10},color:c.text2,precision:0,maxRotation:0,includeBounds:false,
                  callback:v=>Number.isInteger(v)&&v>=1?v+"x":""}}
      },
      plugins:{legend:{display:false},tooltip:{enabled:false}}
    },
    plugins:[tooltipPlugin]
  });
  syncRangeInputs();
}

// ── Spectrum chart ─────────────────────────────────────────────────────────
function renderSpecChart(r){
  if(chartSpec) chartSpec.destroy();
  const c=getThemeColors();
  const logY=document.getElementById("spec-log").checked;
  const yMinLog=Math.pow(10,Math.floor(Math.log10((r.maxAmp||1)*1e-6)));
  const yTitle={display:true,text:window.mtT("axisAmp"),font:{size:11},color:c.text2};
  chartSpec=new Chart(document.getElementById("chart-spec").getContext("2d"),{
    type:"line",
    data:{
      datasets:[
        {label:window.mtT("spectrumLabel"),data:specPoints(r,specView.min,specView.max),
         borderColor:"#2563eb",borderWidth:1.2,backgroundColor:"rgba(37,99,235,0.1)",
         fill:!logY,pointRadius:0,pointHitRadius:0,tension:0},
        {label:window.mtT("harmonicsLabel"),data:r.harmonics.map(h=>({x:h.freq,y:h.amp,h:h.h})),
         borderColor:"transparent",backgroundColor:"#dc2626",
         pointRadius:2.5,pointHoverRadius:4,pointHitRadius:6,showLine:false},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,animation:false,
      scales:{
        x:{type:"linear",min:specView.min,max:specView.max,
           title:{display:true,text:window.mtT("axisFreq"),font:{size:11},color:c.text2},
           grid:{color:c.grid},
           ticks:{font:{size:10},color:c.text2,maxRotation:0,includeBounds:false,
                  callback:v=>Math.abs(v)>=1000?+(v/1000).toPrecision(4)+"k":+v.toPrecision(4)}},
        y:logY
          ? {type:"logarithmic",min:yMinLog,title:yTitle,grid:{color:c.grid},
             ticks:{font:{size:10},color:c.text2,
                    callback:v=>{const l=Math.log10(v);return Math.abs(l-Math.round(l))<1e-9?v.toExponential(0):"";}}}
          : {type:"linear",min:0,title:yTitle,grid:{color:c.grid},ticks:{font:{size:10},color:c.text2}}
      },
      plugins:{legend:{display:false},tooltip:{enabled:false}}
    },
    plugins:[tooltipPlugin]
  });
  syncRangeInputs();
}

// ── Table ──────────────────────────────────────────────────────────────────
function renderTable(r){
  const fund=r.harmonics[0]?.amp??1;
  document.getElementById("harm-body").innerHTML=
    r.harmonics.map((h,i)=>`
      <tr class="${h.h>thdOrder?"out-thd":""}">
        <td><span class="badge ${i===0?"badge-fund":"badge-harm"}">${h.h}x</span></td>
        <td>${h.freq.toFixed(2)}</td>
        <td>${fmtAmp(h.amp)}</td>
        <td>${i===0?`— (${window.mtT("fundamentalWord")})`:(h.amp/fund*100).toFixed(3)+" %"}</td>
      </tr>`).join("");
  document.getElementById("harm-foot").innerHTML=
    `<tr><td colspan="3">${window.mtT("thdRow").replace("{n}",thdOrder)}</td>
         <td>${(r.thd*100).toFixed(4)} %</td></tr>`;
  // data-quality notes
  const notes=[], H=r.harmonics.length;
  if(H<MAX_ORDER) notes.push(window.mtT("noteNyquist").replace("{h}",H)
      .replace("{m}",MAX_ORDER).replace("{sr}",(2*MAX_ORDER*r.freqFund/1000).toFixed(1)));
  const cycles=r.Norig/r.sr*r.freqFund;
  if(cycles<10) notes.push(window.mtT("noteCycles").replace("{c}",cycles.toFixed(1)));
  const el=document.getElementById("harm-note");
  el.innerHTML=notes.map(n=>"⚠ "+n).join("<br>");
  el.classList.toggle("hidden",!notes.length);
}

// ── Export CSV ─────────────────────────────────────────────────────────────
function exportCSV(){
  if(!lastResult) return;
  const r=lastResult, fund=r.harmonics[0]?.amp??1;
  const rows=[
    ["=== Harmonic Summary ==="],
    ["Order","Frequency (Hz)","Amplitude (V)","Relative (%)"],
    ...r.harmonics.map((h,i)=>[`${h.h}x`,h.freq.toFixed(4),h.amp.toExponential(8),
                                i===0?"fundamental":(h.amp/fund*100).toFixed(4)]),
    [],[`THD orders 2-${thdOrder} (%)`,(r.thd*100).toFixed(4)],
    ["Window",r.win],["Sampling rate (Hz)",r.sr.toFixed(2)],["FFT size",r.Nfft],
    [],["=== Full Spectrum ==="],["Frequency (Hz)","Amplitude (V)"],
  ];
  for(let i=0;i<r.mag.length;i++) rows.push([(i*r.fb).toFixed(4),r.mag[i].toExponential(8)]);
  const csvContent = rows.map(r=>r.join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csvContent],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");
  a.href=url; a.download="fft_result.csv"; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  if (window.gaTrack) gaTrack('export_csv', 'fft-analyser');
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtAmp(a){
  if(a>=.01)  return a.toFixed(6)+" V";
  if(a>=1e-6) return a.toExponential(4)+" V";
  return a.toExponential(2)+" V";
}
function setProgress(pct,msg){
  document.getElementById("prog-fill").style.width=pct+"%";
  document.getElementById("prog-label").textContent=msg;
}
