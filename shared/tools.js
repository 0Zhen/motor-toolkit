/* ═══════════════════════════════════════════════════════════════
   Motor Toolkit — tool registry
   Adding a new tool = create tools/<id>/ + add ONE entry here.
   Homepage cards and the header dropdown are both generated from
   this list.  `path` is relative to the site root.
   `name_zh` / `desc_zh` are used when the language is set to zh.
   ═══════════════════════════════════════════════════════════════ */
const MT_TOOLS = [
  {
    id:      'efficiency-map',
    name:    'Efficiency Map',
    name_zh: '效率地圖產生器',
    desc:    'Generate a contour efficiency map from speed / torque / efficiency data. PNG export.',
    desc_zh: '從轉速／扭矩／效率資料產生等高線效率地圖，可匯出 PNG。',
    icon:    '🗺️',
    path:    'tools/efficiency-map/',
  },
  {
    id:      'fft-analyser',
    name:    'FFT Analyser',
    name_zh: 'FFT 頻譜分析',
    desc:    'Spectrum analysis with harmonic extraction and THD. Flat-top / Hann / Hamming windows.',
    desc_zh: '頻譜分析、諧波抽取與 THD 計算，支援 Flat-top／Hann／Hamming 窗函數。',
    icon:    '📊',
    path:    'tools/fft-analyser/',
  },
  {
    id:      'working-point',
    name:    'Working Point Explorer',
    name_zh: '馬達工作點探索器',
    desc:    'Solve the stable working point of a motor and sweep design parameters.',
    desc_zh: '求解馬達穩定工作點，並掃描設計參數的影響。',
    icon:    '⚙️',
    path:    'tools/working-point/',
  },
];
