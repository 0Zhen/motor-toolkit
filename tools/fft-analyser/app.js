// FFT Analyser — application logic
// (ported from d:/ClaudeCode/fft-analyser/index.html; FFT math left byte-identical)

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
  mTHD:  { en: 'THD', zh: 'THD' },
  mSr:   { en: 'Sample rate', zh: '取樣率' },
  mFft:  { en: 'FFT size', zh: 'FFT 大小' },
  mWin:  { en: 'Window', zh: '窗函數' },
  kHz:   { en: 'kHz', zh: 'kHz' },
  pts:   { en: 'pts', zh: '點' },

  ttOrder: { en: '{h}x harmonic', zh: '第 {h} 次諧波' },
  ttFreq:  { en: 'Freq', zh: '頻率' },
  ttAmp:   { en: 'Amp', zh: '振幅' },

  fundamentalWord: { en: 'fundamental', zh: '基頻' },
  thdRow:          { en: 'Total Harmonic Distortion (THD)', zh: '總諧波失真 (THD)' },

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
  whatDoesLabel:  { en: 'What it does', zh: '功能說明' },
  whatDoesText:   { en: 'Upload an oscilloscope CSV or paste time-domain data to compute the frequency spectrum, extract harmonic amplitudes (1x–10x), and calculate THD — all in your browser, no install needed.',
                    zh: '上傳示波器 CSV 檔案，或貼上時域資料，即可在瀏覽器中計算頻譜、擷取諧波振幅（1x–10x）並計算 THD——不需安裝任何軟體。' },
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
  if (chart.config.type !== "line") {
    chart.options.scales.x.ticks.color = c.text2;
    chart.options.scales.y.ticks.color = c.text2;
    chart.options.scales.y.grid.color  = c.grid;
  } else {
    ["x","y"].forEach(ax => {
      chart.options.scales[ax].ticks.color = c.text2;
      chart.options.scales[ax].grid.color  = c.grid;
      if (chart.options.scales[ax].title)
        chart.options.scales[ax].title.color = c.text2;
    });
  }
  chart.update();
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

// ── FFT ────────────────────────────────────────────────────────────────────
const ACF = {"Flat-top":4.638,"Hann":2.0,"Hamming":1.852,"Rectangular":1.0};

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

function computeFFT(voltages,sr,win){
  const acf=ACF[win],N0=voltages.length;
  const avg=voltages.reduce((a,b)=>a+b,0)/N0;
  const Nf=nextPow2(N0);
  const re=new Float64Array(Nf),im=new Float64Array(Nf);
  for(let i=0;i<N0;i++) re[i]=(voltages[i]-avg)*winVal(win,i,N0);
  fftCT(re,im);
  const fb=sr/Nf,mf=sr/N0,OR=Nf>>1;
  const fftRes=[]; let maxA=0,fFund=0;
  for(let i=0;i<=OR;i++){
    const f=i*fb,mag=Math.sqrt(re[i]**2+im[i]**2)*(2/N0)*acf;
    fftRes.push({f,mag});
    if(f>mf&&mag>maxA){maxA=mag;fFund=f;}
  }
  const harmonics=[]; let sumSq=0;
  for(let h=1;h<=10;h++){
    const b=Math.round(fFund*h/fb);
    if(b>OR) break;
    const ha=fftRes[b].mag;
    harmonics.push({h,freq:fFund*h,amp:ha});
    if(h>1) sumSq+=ha*ha;
  }
  const thd=harmonics.length?Math.sqrt(sumSq)/harmonics[0].amp:0;
  return {fftRes,harmonics,thd,freqFund:fFund,maxAmp:maxA,sr,Nfft:Nf,Norig:N0};
}

// ── Run ─────────────────────────────────────────────────────────────────────
// ── Web Worker (inline blob — works under file://) ───────────────────────
const WORKER_SRC = `
const ACF={"Flat-top":4.638,"Hann":2.0,"Hamming":1.852,"Rectangular":1.0};
function nextPow2(n){let p=1;while(p<n)p<<=1;return p;}
function winVal(name,i,N){
  const p=2*Math.PI*i/(N-1);
  if(name==="Flat-top")return .21557895-.41663158*Math.cos(p)+.277263158*Math.cos(2*p)-.083578947*Math.cos(3*p)+.006947368*Math.cos(4*p);
  if(name==="Hann")return .5*(1-Math.cos(p));
  if(name==="Hamming")return .54-.46*Math.cos(p);
  return 1;
}
function fftCT(re,im){
  const N=re.length;let j=0;
  for(let i=0;i<N-1;i++){
    if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
    let k=N>>1;while(k<=j){j-=k;k>>=1;}j+=k;
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
self.onmessage=function(e){
  const{voltages,sr,win}=e.data;
  const acf=ACF[win],N0=voltages.length;
  self.postMessage({type:"progress",pct:20,msg:"Removing DC…"});
  const avg=voltages.reduce((a,b)=>a+b,0)/N0;
  const Nf=nextPow2(N0);
  self.postMessage({type:"progress",pct:35,msg:"Applying window…"});
  const re=new Float64Array(Nf),im=new Float64Array(Nf);
  for(let i=0;i<N0;i++)re[i]=(voltages[i]-avg)*winVal(win,i,N0);
  self.postMessage({type:"progress",pct:50,msg:"Running FFT… ("+N0.toLocaleString()+" pts → "+Nf.toLocaleString()+")"});
  fftCT(re,im);
  self.postMessage({type:"progress",pct:80,msg:"Computing spectrum…"});
  const fb=sr/Nf,mf=sr/N0,OR=Nf>>1;
  const fftRes=[];let maxA=0,fFund=0;
  for(let i=0;i<=OR;i++){
    const f=i*fb,mag=Math.sqrt(re[i]**2+im[i]**2)*(2/N0)*acf;
    fftRes.push({f,mag});
    if(f>mf&&mag>maxA){maxA=mag;fFund=f;}
  }
  const harmonics=[];let sumSq=0;
  for(let h=1;h<=10;h++){
    const b=Math.round(fFund*h/fb);
    if(b>OR)break;
    const ha=fftRes[b].mag;
    harmonics.push({h,freq:fFund*h,amp:ha});
    if(h>1)sumSq+=ha*ha;
  }
  const thd=harmonics.length?Math.sqrt(sumSq)/harmonics[0].amp:0;
  self.postMessage({type:"done",result:{fftRes,harmonics,thd,freqFund:fFund,maxAmp:maxA,sr,Nfft:Nf,Norig:N0}});
};
`;

function runAnalysis(){
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

  const blob   = new Blob([WORKER_SRC],{type:"application/javascript"});
  const blobURL= URL.createObjectURL(blob);
  const worker = new Worker(blobURL);

  worker.onmessage = function(e){
    const d = e.data;
    if(d.type==="progress"){
      setProgress(d.pct, d.msg);
    } else if(d.type==="done"){
      URL.revokeObjectURL(blobURL);
      setProgress(90, window.mtT("renderingChart"));
      lastResult = d.result;
      renderResults(d.result);
      setProgress(100, window.mtT("doneMsg")
        .replace("{f}", d.result.freqFund.toFixed(2))
        .replace("{t}", (d.result.thd*100).toFixed(2)));
      document.getElementById("btn-dl").classList.remove("hidden");
      btn.disabled=false;
    }
  };
  worker.onerror = function(err){
    URL.revokeObjectURL(blobURL);
    setProgress(0, window.mtT("errMsg").replace("{m}", err.message));
    alert(err.message);
    btn.disabled=false;
  };

  // Transfer the buffer (zero-copy) to worker
  worker.postMessage({voltages: new Float64Array(buf), sr, win: selectedWindow}, [buf]);
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderResults(r){
  document.getElementById("results").classList.remove("hidden");
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
    <div class="metric"><div class="mlabel">${window.mtT("mTHD")}</div><div class="mvalue">${(r.thd*100).toFixed(2)}<span class="munit">%</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mSr")}</div><div class="mvalue">${(r.sr/1000).toFixed(1)}<span class="munit">${window.mtT("kHz")}</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mFft")}</div><div class="mvalue">${r.Nfft.toLocaleString()}<span class="munit">${window.mtT("pts")}</span></div></div>
    <div class="metric"><div class="mlabel">${window.mtT("mWin")}</div><div class="mvalue" style="font-size:14px">${selectedWindow}</div></div>
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

// ── Bar chart ──────────────────────────────────────────────────────────────
function renderBarChart(r){
  if(chartBar) chartBar.destroy();
  const c=getThemeColors();
  chartBar=new Chart(document.getElementById("chart-bar").getContext("2d"),{
    type:"bar",
    data:{
      labels:r.harmonics.map(h=>`${h.h}x${h.freq>=1?" "+h.freq.toFixed(1)+"Hz":""}`),
      datasets:[{
        data:r.harmonics.map(h=>h.amp),
        backgroundColor:r.harmonics.map((_,i)=>i===0?"#2563eb":"#dc2626"),
        borderRadius:4,borderSkipped:false,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        y:{type:"logarithmic",grid:{color:c.grid},
           ticks:{font:{size:10},color:c.text2,callback:v=>v>=.01?v.toFixed(3):v.toExponential(1)}},
        x:{grid:{display:false},ticks:{font:{size:9},color:c.text2}}
      },
      plugins:{legend:{display:false},tooltip:{enabled:false}}
    },
    plugins:[tooltipPlugin]
  });
}

// ── Spectrum chart ─────────────────────────────────────────────────────────
function renderSpecChart(r){
  if(chartSpec) chartSpec.destroy();
  const c=getThemeColors();
  const maxHF=r.harmonics.at(-1)?.freq??r.freqFund;
  const xlim=maxHF*2.2;
  const pts=r.fftRes.filter(p=>p.f<=xlim);
  chartSpec=new Chart(document.getElementById("chart-spec").getContext("2d"),{
    type:"line",
    data:{
      datasets:[
        {label:window.mtT("spectrumLabel"),data:pts.map(p=>({x:p.f,y:p.mag})),
         borderColor:"#2563eb",borderWidth:1.2,backgroundColor:"rgba(37,99,235,0.1)",
         fill:true,pointRadius:0,tension:0},
        {label:window.mtT("harmonicsLabel"),data:r.harmonics.map(h=>({x:h.freq,y:h.amp,h:h.h})),
         borderColor:"transparent",backgroundColor:"#dc2626",
         pointRadius:0,pointHoverRadius:0,showLine:false},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        x:{type:"linear",min:0,max:xlim,
           title:{display:true,text:window.mtT("axisFreq"),font:{size:11},color:c.text2},
           grid:{color:c.grid},
           ticks:{font:{size:10},color:c.text2,callback:v=>v>=1000?(v/1000).toFixed(1)+"k":v.toFixed(0)}},
        y:{min:0,
           title:{display:true,text:window.mtT("axisAmp"),font:{size:11},color:c.text2},
           grid:{color:c.grid},ticks:{font:{size:10},color:c.text2}}
      },
      plugins:{legend:{display:false},tooltip:{enabled:false}}
    },
    plugins:[tooltipPlugin]
  });
}

// ── Table ──────────────────────────────────────────────────────────────────
function renderTable(r){
  const fund=r.harmonics[0]?.amp??1;
  document.getElementById("harm-body").innerHTML=
    r.harmonics.map((h,i)=>`
      <tr>
        <td><span class="badge ${i===0?"badge-fund":"badge-harm"}">${h.h}x</span></td>
        <td>${h.freq.toFixed(2)}</td>
        <td>${fmtAmp(h.amp)}</td>
        <td>${i===0?`— (${window.mtT("fundamentalWord")})`:(h.amp/fund*100).toFixed(3)+" %"}</td>
      </tr>`).join("")+
    `<tr style="font-weight:600;background:var(--metric-bg)">
       <td colspan="3">${window.mtT("thdRow")}</td>
       <td>${(r.thd*100).toFixed(4)} %</td>
     </tr>`;
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
    [],["THD (%)",(r.thd*100).toFixed(4)],
    ["Window",selectedWindow],["Sampling rate (Hz)",r.sr.toFixed(2)],["FFT size",r.Nfft],
    [],["=== Full Spectrum ==="],["Frequency (Hz)","Amplitude (V)"],
    ...r.fftRes.map(p=>[p.f.toFixed(4),p.mag.toExponential(8)])
  ];
  const csvContent = rows.map(r=>r.join(",")).join("\r\n");
  const a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csvContent);
  a.download="fft_result.csv";a.click();
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
