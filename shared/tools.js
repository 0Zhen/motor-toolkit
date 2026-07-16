/* ═══════════════════════════════════════════════════════════════
   Motor Toolkit — tool registry
   Adding a new tool = create tools/<id>/ + add ONE entry here.
   Homepage cards and the header dropdown are both generated from
   this list.  `path` is relative to the site root.
   ═══════════════════════════════════════════════════════════════ */
const MT_TOOLS = [
  {
    id:   'efficiency-map',
    name: 'Efficiency Map',
    desc: 'Generate a contour efficiency map from speed / torque / efficiency data. PNG export.',
    icon: '🗺️',
    path: 'tools/efficiency-map/',
  },
  {
    id:   'fft-analyser',
    name: 'FFT Analyser',
    desc: 'Spectrum analysis with harmonic extraction and THD. Flat-top / Hann / Hamming windows.',
    icon: '📊',
    path: 'tools/fft-analyser/',
  },
  {
    id:   'working-point',
    name: 'Working Point Explorer',
    desc: 'Solve the stable working point of a motor and sweep design parameters.',
    icon: '⚙️',
    path: 'tools/working-point/',
  },
];
