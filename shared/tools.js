/* ═══════════════════════════════════════════════════════════════
   Motor Toolkit — tool registry
   Adding a new tool = create tools/<id>/ + add ONE entry here.
   Homepage cards and the header dropdown are both generated from
   this list.  `path` is relative to the site root.
   `name_zh` / `desc_zh` are used when the language is set to zh.
   `group` is one of the MT_GROUPS ids; `icon` is the inner markup of a
   24×24 stroke-only SVG (drawn with currentColor by shell.js mtIcon()).
   ═══════════════════════════════════════════════════════════════ */
const MT_GROUPS = [
  { id: 'design',     name: 'Design',          name_zh: '設計',
    sub: 'Size the winding and the slot',      sub_zh: '繞組、槽與工作點' },
  { id: 'analysis',   name: 'Test & analysis', name_zh: '測試與分析',
    sub: 'Make sense of bench data',           sub_zh: '整理量測資料' },
  { id: 'production', name: 'Production',      name_zh: '生產',
    sub: 'Quality and cost',                   sub_zh: '品質與成本' },
];

const MT_TOOLS = [
  {
    id:      'efficiency-map',
    name:    'Efficiency Map',
    name_zh: '效率地圖產生器',
    desc:    'Generate a contour efficiency map from speed / torque / efficiency data. PNG export.',
    desc_zh: '從轉速／扭矩／效率資料產生等高線效率地圖，可匯出 PNG。',
    group:   'analysis',
    icon:    '<path d="M3 20V4M3 20h18"/><ellipse cx="12" cy="13" rx="7" ry="4"/><ellipse cx="12" cy="13" rx="3.5" ry="1.8"/>',
    path:    'tools/efficiency-map/',
  },
  {
    id:      'fft-analyser',
    name:    'FFT Analyser',
    name_zh: 'FFT 頻譜分析',
    desc:    'Spectrum analysis with harmonic extraction and THD. Flat-top / Hann / Hamming windows.',
    desc_zh: '頻譜分析、諧波抽取與 THD 計算，支援 Flat-top／Hann／Hamming 窗函數。',
    group:   'analysis',
    icon:    '<path d="M3 21h18"/><path d="M6 21V8M10 21v-6M14 21V4M18 21v-9"/>',
    path:    'tools/fft-analyser/',
  },
  {
    id:      'working-point',
    name:    'Working Point Explorer',
    name_zh: '馬達工作點探索器',
    desc:    'Solve the stable working point of a motor and sweep design parameters.',
    desc_zh: '求解馬達穩定工作點，並掃描設計參數的影響。',
    group:   'design',
    icon:    '<path d="M3 20V4M3 20h18"/><path d="M5 6c4 0 8 4 14 13"/><path d="M5 17c5-1 9-4 14-9" opacity=".5"/><circle cx="12.4" cy="12.6" r="2"/>',
    path:    'tools/working-point/',
  },
  {
    id:      'dcr-calculator',
    name:    'DCR Calculator',
    name_zh: 'DCR 換算工具',
    desc:    'Convert between winding turns, wire diameter, DCR and slot fill factor. Quick calibration or full geometry mode with a wire-diameter sweep table.',
    desc_zh: '匝數／線徑／DCR／槽滿率互算，支援快速校準或完整幾何模式，含線徑掃描表。',
    group:   'design',
    icon:    '<path d="M2 12h4l2-5 3 10 3-10 3 10 2-5h3"/>',
    path:    'tools/dcr-calculator/',
  },
  {
    id:      'cpk-analysis',
    name:    'CPK Analysis',
    name_zh: 'CPK 製程能力分析',
    desc:    'Process capability (Cp / Cpk) from a single measured parameter. IQR outlier removal, USL/LSL, histogram with sigma lines, PNG export.',
    desc_zh: '單一量測參數的製程能力分析（Cp／Cpk），IQR離群值過濾、USL/LSL、含sigma參考線的直方圖，可匯出PNG。',
    group:   'production',
    icon:    '<path d="M2 19c4 0 5-13 10-13s6 13 10 13"/><path d="M6 21V9M18 21V9" stroke-dasharray="2 2"/>',
    path:    'tools/cpk-analysis/',
  },
  {
    id:      'winding-designer',
    name:    'Winding Designer',
    name_zh: '繞組設計工具',
    desc:    'Pick poles, slots and layers to get the winding layout diagram and fundamental winding factor. Integer- and fractional-slot windings.',
    desc_zh: '輸入極數／槽數／層數，產生繞組展開圖與基波繞組係數，支援整數槽與分數槽繞組。',
    group:   'design',
    icon:    '<path d="M3 16c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/><path d="M3 8c2 6 4 6 6 0s4-6 6 0 4 6 6 0" opacity=".5"/>',
    path:    'tools/winding-designer/',
  },
  {
    id:      'cost-calculator',
    name:    'Cost Calculator',
    name_zh: '成本計算機',
    desc:    'Estimate silicon steel / copper / magnet or rotor material cost from geometry, slot/pole count and winding data. Supports PMSM, EESM and induction motors.',
    desc_zh: '依幾何尺寸、槽極數與繞組資料估算矽鋼片／銅／磁鐵或轉子材料成本，支援 PMSM、EESM 與感應馬達。',
    group:   'production',
    icon:    '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    path:    'tools/cost-calculator/',
  },
  {
    id:      'slot-packing',
    name:    'Slot Packing Viewer',
    name_zh: '槽內排列工具',
    desc:    'Visualize how turns pack into a stator slot — parametric trapezoid or custom vertices, editable point table, simple row-by-row circle packing.',
    desc_zh: '視覺化線材在槽內的堆疊——參數化梯形或自訂頂點，可編輯頂點表格，簡易逐排圓形堆疊示意。',
    group:   'design',
    icon:    '<path d="M7 3h10l3 18H4z"/><circle cx="9" cy="16" r="2"/><circle cx="15" cy="16" r="2"/><circle cx="12" cy="10.5" r="2"/>',
    path:    'tools/slot-packing/',
  },
];
