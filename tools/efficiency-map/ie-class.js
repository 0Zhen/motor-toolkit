/* ═══════════════════════════════════════════════════════════════
   IE Class Calculator — pure logic, no UI, no i18n strings here
   (labels live in app.js's MT_I18N so there's one dictionary per tool).

   Ported from motor_choose_web/backend/services/iec_efficiency_service.py
   — IEC TS 60034-30-2 indicative IE1~IE5 classification for variable-speed
   motors. Same coefficient tables, same formulas, same coverage limits
   (0.12~200kW, 600~6000rpm). This is NOT an official compliance
   determination — voltage, cooling method, duty type and the servo
   exclusion test are not checked.
   ═══════════════════════════════════════════════════════════════ */
window.IEClass = (function () {
  'use strict';

  var IE_CLASSES = ['IE1', 'IE2', 'IE3', 'IE4', 'IE5'];

  /* Table 7 (0.12~0.64kW): (ieClass|band) -> [A,B,C,D] */
  var TABLE7 = {
    'IE1|600-900':    [5.9466, 7.9458, 40.441, 66.146],
    'IE1|901-1200':   [-45.9652, -87.1474, -8.2383, 68.7303],
    'IE1|1201-1800':  [16.7271, 12.7136, 25.947, 76.174],
    'IE1|1801-6000':  [11.924, 6.3699, 30.0509, 76.6136],
    'IE2|600-900':    [6.4855, 9.4748, 36.852, 70.762],
    'IE2|901-1200':   [-15.9218, -30.258, 16.6861, 79.1838],
    'IE2|1201-1800':  [17.2751, 23.978, 35.5822, 84.9935],
    'IE2|1801-6000':  [22.4864, 27.7603, 37.8091, 82.458],
    'IE3|600-900':    [-0.5896, -25.526, 4.2884, 75.831],
    'IE3|901-1200':   [-17.361, -44.538, -3.0554, 79.1318],
    'IE3|1201-1800':  [7.6356, 4.8236, 21.0903, 86.0998],
    'IE3|1801-6000':  [6.8532, 6.2006, 25.1317, 84.0392],
    'IE4|600-900':    [-4.9735, -21.453, 2.6653, 79.055],
    'IE4|901-1200':   [-13.0355, -36.9497, -4.3621, 82.0009],
    'IE4|1201-1800':  [8.432, 2.6888, 14.6236, 87.6153],
    'IE4|1801-6000':  [-8.8538, -20.3352, 8.9002, 85.0641],
    'IE5|600-900':    [-9.5776, -30.1627, -4.5962, 81.2564],
    'IE5|901-1200':   [-6.1120, -23.1331, 1.6331, 86.0990],
    'IE5|1201-1800':  [11.0118, 8.3635, 16.0368, 90.5323],
    'IE5|1801-6000':  [-7.0239, -16.9944, 8.1621, 87.7915],
  };

  /* Table 8 (0.65~200kW) */
  var TABLE8 = {
    'IE1|600-900':    [2.4433, -13.8, 30.656, 65.238],
    'IE1|901-1200':   [0.0786, -3.5838, 17.2918, 72.2383],
    'IE1|1201-1800':  [0.5234, -5.0499, 17.4180, 74.3171],
    'IE1|1801-6000':  [0.5234, -5.0499, 17.4180, 74.3171],
    'IE2|600-900':    [2.1311, -12.029, 26.719, 69.735],
    'IE2|901-1200':   [0.0148, -2.4978, 13.2470, 77.5603],
    'IE2|1201-1800':  [0.0278, -1.9247, 10.4395, 80.9761],
    'IE2|1801-6000':  [0.2972, -3.3454, 13.0651, 79.077],
    'IE3|600-900':    [0.7189, -5.1678, 15.705, 77.074],
    'IE3|901-1200':   [0.1252, -2.613, 11.9963, 80.4769],
    'IE3|1201-1800':  [0.0773, -1.8951, 9.2984, 83.7025],
    'IE3|1801-6000':  [0.3569, -3.3076, 11.6108, 82.2503],
    'IE4|600-900':    [0.6556, -4.7229, 13.977, 80.247],
    'IE4|901-1200':   [0.3598, -3.2107, 10.7933, 84.107],
    'IE4|1201-1800':  [0.2412, -2.3608, 8.446, 86.8321],
    'IE4|1801-6000':  [0.34, -3.0479, 10.293, 84.8208],
    'IE5|600-900':    [0.6183, -4.2672, 12.0866, 83.5379],
    'IE5|901-1200':   [0.3394, -2.8578, 9.2088, 86.8489],
    'IE5|1201-1800':  [0.2459, -2.136, 7.1743, 89.1712],
    'IE5|1801-6000':  [0.3106, -2.6854, 8.7516, 87.4633],
  };

  function speedBand(rpm) {
    if (rpm == null) return null;
    if (rpm >= 600 && rpm <= 900) return '600-900';
    if (rpm > 900 && rpm <= 1200) return '901-1200';
    if (rpm > 1200 && rpm <= 1800) return '1201-1800';
    if (rpm > 1800 && rpm <= 6000) return '1801-6000';
    return null;
  }

  function harmonicLossFactor(powerKw) {
    return powerKw > 90 ? 0.25 : 0.15;
  }

  function referenceEfficiencyPercent(powerKw, ieClass, band) {
    if (powerKw == null || powerKw <= 0) return null;
    var coeffs;
    if (powerKw >= 0.12 && powerKw <= 0.64) coeffs = TABLE7[ieClass + '|' + band];
    else if (powerKw > 0.64 && powerKw <= 200) coeffs = TABLE8[ieClass + '|' + band];
    else return null;
    if (!coeffs) return null;
    var x = Math.log10(powerKw);
    var val = coeffs[0] * x * x * x + coeffs[1] * x * x + coeffs[2] * x + coeffs[3];
    return Math.round(val * 10) / 10;
  }

  function nominalEfficiencyPercent(powerKw, ieClass, band) {
    var refPct = referenceEfficiencyPercent(powerKw, ieClass, band);
    if (refPct == null) return null;
    var ref = refPct / 100;
    var rhl = harmonicLossFactor(powerKw);
    var etaN = 1 / ((1 / ref - 1) * (1 + rhl) + 1);
    return Math.round(etaN * 1000) / 10;
  }

  function allThresholds(powerKw, band) {
    var out = {};
    for (var i = 0; i < IE_CLASSES.length; i++) {
      var ie = IE_CLASSES[i];
      var thr = nominalEfficiencyPercent(powerKw, ie, band);
      if (thr == null) return null;
      out[ie] = thr;
    }
    return out;
  }

  /**
   * classify(powerKw, speedRpm, eta90Percent) -> {
   *   achieved: 'IE1'..'IE5' | null,   band, thresholds: {IE1..IE5} | null,
   *   reason: null | 'power-range' | 'speed-range'
   * }
   * achieved=null + thresholds!=null means: in range, but below IE1.
   */
  function classify(powerKw, speedRpm, eta90Percent) {
    var band = speedBand(speedRpm);
    if (band == null) return { achieved: null, band: null, thresholds: null, reason: 'speed-range' };
    var thresholds = allThresholds(powerKw, band);
    if (thresholds == null) return { achieved: null, band: band, thresholds: null, reason: 'power-range' };
    if (eta90Percent == null) return { achieved: null, band: band, thresholds: thresholds, reason: null };

    var achieved = null;
    for (var i = 0; i < IE_CLASSES.length; i++) {
      if (eta90Percent >= thresholds[IE_CLASSES[i]]) achieved = IE_CLASSES[i];
    }
    return { achieved: achieved, band: band, thresholds: thresholds, reason: null };
  }

  /* ── Delaunay + barycentric point query (not a regular grid) ──
     Same triangulation approach as gridInterpolate() in app.js, but
     evaluated at one arbitrary (x, y) instead of a full mesh — used to
     look up eta90 = efficiency at (0.9*speed, torque) from whatever
     dataset is already loaded in the map. Returns null if the query
     point falls outside the data's convex hull (not enough coverage
     to interpolate — most commonly because the candidate speed is
     already near the bottom of the tested range). */
  function queryAtPoint(pts, vals, qx, qy) {
    var n = pts.length;
    if (n < 3) return null;
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    var M = Math.max(xMax - xMin, yMax - yMin) * 10;
    var cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2;
    var sup = [[cx - 3 * M, cy - M], [cx + 3 * M, cy - M], [cx, cy + 3 * M]];
    var all = pts.concat(sup);
    var tris = [[n, n + 1, n + 2]];

    for (var p = 0; p < n; p++) {
      var px = all[p][0], py = all[p][1];
      var bad = [], good = [];
      for (var ti = 0; ti < tris.length; ti++) {
        var t = tris[ti];
        var ax = all[t[0]][0], ay = all[t[0]][1];
        var bx = all[t[1]][0], by = all[t[1]][1];
        var cx2 = all[t[2]][0], cy2 = all[t[2]][1];
        var D = 2 * ((ax - px) * (by - cy2) + (bx - px) * (cy2 - ay) + (cx2 - px) * (ay - by));
        if (Math.abs(D) < 1e-10) { good.push(t); continue; }
        var ux = (ax - px) * (ax - px) + (ay - py) * (ay - py);
        var vx = (bx - px) * (bx - px) + (by - py) * (by - py);
        var wx = (cx2 - px) * (cx2 - px) + (cy2 - py) * (cy2 - py);
        var ox = (ux * (by - cy2) + vx * (cy2 - ay) + wx * (ay - by)) / D;
        var oy = (ux * (cx2 - bx) + vx * (ax - cx2) + wx * (bx - ax)) / D;
        var r2 = (ax - px - ox) * (ax - px - ox) + (ay - py - oy) * (ay - py - oy);
        if (ox * ox + oy * oy < r2 + 1e-10) bad.push(t); else good.push(t);
      }
      var edges = new Map();
      bad.forEach(function (t) {
        [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(function (e) {
          var k = e[0] < e[1] ? e[0] + '_' + e[1] : e[1] + '_' + e[0];
          edges.set(k, (edges.get(k) || 0) + 1);
        });
      });
      tris = good;
      edges.forEach(function (c, k) {
        if (c === 1) {
          var ab = k.split('_');
          tris.push([+ab[0], +ab[1], p]);
        }
      });
    }
    tris = tris.filter(function (t) { return t[0] < n && t[1] < n && t[2] < n; });

    for (var k = 0; k < tris.length; k++) {
      var tr = tris[k];
      var Ax = pts[tr[0]][0], Ay = pts[tr[0]][1];
      var Bx = pts[tr[1]][0], By = pts[tr[1]][1];
      var Cx = pts[tr[2]][0], Cy = pts[tr[2]][1];
      var d = (By - Cy) * (Ax - Cx) + (Cx - Bx) * (Ay - Cy);
      if (Math.abs(d) < 1e-12) continue;
      var l1 = ((By - Cy) * (qx - Cx) + (Cx - Bx) * (qy - Cy)) / d;
      var l2 = ((Cy - Ay) * (qx - Cx) + (Ax - Cx) * (qy - Cy)) / d;
      var l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      return l1 * vals[tr[0]] + l2 * vals[tr[1]] + l3 * vals[tr[2]];
    }
    return null;
  }

  return {
    IE_CLASSES: IE_CLASSES,
    speedBand: speedBand,
    referenceEfficiencyPercent: referenceEfficiencyPercent,
    nominalEfficiencyPercent: nominalEfficiencyPercent,
    allThresholds: allThresholds,
    classify: classify,
    queryAtPoint: queryAtPoint,
  };
})();
