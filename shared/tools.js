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
  {
    id:      'dcr-calculator',
    name:    'DCR Calculator',
    name_zh: 'DCR 換算工具',
    desc:    'Convert between winding turns, wire diameter, DCR and slot fill factor. Quick calibration or full geometry mode with a wire-diameter sweep table.',
    desc_zh: '匝數／線徑／DCR／槽滿率互算，支援快速校準或完整幾何模式，含線徑掃描表。',
    icon:    '🧵',
    path:    'tools/dcr-calculator/',
  },
  {
    id:      'cpk-analysis',
    name:    'CPK Analysis',
    name_zh: 'CPK 製程能力分析',
    desc:    'Process capability (Cp / Cpk) from a single measured parameter. IQR outlier removal, USL/LSL, histogram with sigma lines, PNG export.',
    desc_zh: '單一量測參數的製程能力分析（Cp／Cpk），IQR離群值過濾、USL/LSL、含sigma參考線的直方圖，可匯出PNG。',
    icon:    '📐',
    path:    'tools/cpk-analysis/',
  },
  {
    id:      'winding-designer',
    name:    'Winding Designer',
    name_zh: '繞組設計工具',
    desc:    'Pick poles, slots and layers to get the winding layout diagram and fundamental winding factor. Integer- and fractional-slot windings.',
    desc_zh: '輸入極數／槽數／層數，產生繞組展開圖與基波繞組係數，支援整數槽與分數槽繞組。',
    icon:    '🌀',
    path:    'tools/winding-designer/',
  },
];
