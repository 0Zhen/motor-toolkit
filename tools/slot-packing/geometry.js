'use strict';
/* ══════════════════════════════════════════════════════════
   Slot Packing Viewer — geometry.js
   純計算層：多邊形面積/掃描線切片、梯形槽型生成、線材堆疊演算法。
   不含任何 DOM 邏輯。

   槽型一律用「頂點清單」(array of {x,y}, mm) 表達——不管是梯形參數
   生成的、還是使用者自訂的，最終都收斂成同一份資料結構，共用這裡
   的面積/堆疊計算。
   ══════════════════════════════════════════════════════════ */

/**
 * 開口槽：對稱，y=0 是槽口最外緣（靠氣隙那端），y=depth 是槽底（靠軛部
 * 那端）。槽口先是一段窄直的「開口喉」(openWidth × openHeight)，之後
 * 才展開成梯形本體（topWidth 在喉部結束處，taper 到 bottomWidth 在槽
 * 底）。openWidth=topWidth 或 openHeight=0 時會自然退化成單純梯形
 * （喉部兩側的點重合，不用另外特判）。8 個頂點，當作後續「加點微調」
 * 的起始外形。
 * @returns {Array<{x:number,y:number}>} 依順時針排列的 8 個頂點
 */
function generateSlotShape(openWidth, openHeight, topWidth, bottomWidth, depth) {
  return [
    { x: -openWidth / 2, y: 0 },
    { x: openWidth / 2, y: 0 },
    { x: openWidth / 2, y: openHeight },
    { x: topWidth / 2, y: openHeight },
    { x: bottomWidth / 2, y: depth },
    { x: -bottomWidth / 2, y: depth },
    { x: -topWidth / 2, y: openHeight },
    { x: -openWidth / 2, y: openHeight },
  ];
}

/** Shoelace 公式算簡單多邊形面積（絕對值，不管頂點是順時針還逆時針）。 */
function polygonArea(points) {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function polygonBBox(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/**
 * 點是否在多邊形內部（even-odd 規則，ray casting）。不要求頂點順時針/
 * 逆時針，凹多邊形也能正確處理。
 */
function pointInPolygon(p, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 兩條線段所在「直線」的交點（不限制在線段範圍內，offsetPolygonInward
 * 要的是無限長直線的交點）。平行/重合時回傳 null。
 */
function lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

/**
 * 多邊形向內偏移（簡化版 Liner 幾何）：每條邊沿法線方向內移
 * distance，再求相鄰兩條偏移後直線的交點，得到內縮後的新頂點。
 * 法線方向用「邊中點→重心」的內積判斷要不要翻面，所以不管輸入頂點是
 * 順時針還逆時針都能正確內縮，不依賴固定的環繞方向假設。
 *
 * 已知限制：這是簡化演算法，遇到凹多邊形或內縮距離相對局部幾何過大
 * 時（例如 liner 厚度比槽口喉部寬度還大），偏移後的邊可能互相穿越、
 * 算出畸形結果——呼叫端應該檢查回傳多邊形的面積是否合理（> 0 且小於
 * 原始面積），不合理就當作「這個厚度在這個形狀上不成立」處理，不要
 * 直接拿來用。
 * @returns {Array<{x,y}>} 內縮後的頂點，點數與輸入相同
 */
function offsetPolygonInward(points, distance) {
  const n = points.length;
  if (n < 3 || !(distance > 0)) return points.map(p => ({ x: p.x, y: p.y }));

  // 「往內」用多邊形的繞行方向判斷（有號面積的正負），不用頂點平均位置：
  // 圓弧槽底會在槽底擠一堆頂點，把頂點平均位置拉到弧線附近，靠近兩角的
  // 弧段就會被判斷成反方向、往外偏移。
  let signedArea2 = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    signedArea2 += a.x * b.y - b.x * a.y;
  }
  const side = signedArea2 >= 0 ? 1 : -1;

  const shifted = [];
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * side, ny = dx / len * side; // 指向多邊形內側的法向量
    shifted.push({
      ax: a.x + nx * distance, ay: a.y + ny * distance,
      bx: b.x + nx * distance, by: b.y + ny * distance,
    });
  }

  const result = [];
  for (let i = 0; i < n; i++) {
    const prev = shifted[(i - 1 + n) % n], cur = shifted[i];
    const pt = lineIntersect(prev.ax, prev.ay, prev.bx, prev.by, cur.ax, cur.ay, cur.bx, cur.by);
    result.push(pt || { x: points[i].x, y: points[i].y }); // 平行時退回原頂點（已知限制）
  }
  if (isOffsetValid(points, result)) return result;
  return offsetDroppingCollapsedEdges(points, shifted, distance);
}

/**
 * 銳角旁邊的短邊（例如圓弧槽底拆出來、緊貼槽壁的第一小段）內縮後本來
 * 就該整段消失——逐頂點求交點的做法會把它算成方向反過來的邊，被當成
 * 「liner 太厚」。這裡把方向反過來的邊拿掉、用剩下的邊重新求交點，重複
 * 到沒有反向邊為止，再嚴格驗證結果：每個頂點都要在原多邊形內、而且離
 * 原輪廓至少 distance 遠（真正的內縮一定滿足）。槽口喉部真的太窄這類
 * 情況救不回來，驗證會失敗，照樣回報 liner 太厚。
 * 回傳的陣列帶 dropped=true 與 valid 旗標，點數可能比原多邊形少。
 */
function offsetDroppingCollapsedEdges(points, shifted, distance) {
  let lines = shifted.map(function (l, i) {
    const a = points[i], b = points[(i + 1) % points.length];
    return { l: l, dx: b.x - a.x, dy: b.y - a.y };
  });
  let pts = [];
  for (let iter = 0; iter < points.length; iter++) {
    const m = lines.length;
    if (m < 3) break;
    pts = [];
    for (let i = 0; i < m; i++) {
      const prev = lines[(i - 1 + m) % m].l, cur = lines[i].l;
      pts.push(lineIntersect(prev.ax, prev.ay, prev.bx, prev.by, cur.ax, cur.ay, cur.bx, cur.by));
    }
    if (pts.some(function (q) { return !q; })) { pts = []; break; }
    const keep = lines.filter(function (L, i) {
      const a = pts[i], b = pts[(i + 1) % m];
      return (b.x - a.x) * L.dx + (b.y - a.y) * L.dy > 0;
    });
    if (keep.length === m) break;
    lines = keep;
    pts = [];
  }
  const out = pts.slice();
  out.dropped = true;
  const tol = 1e-6 * Math.max(1, distance);
  out.valid = out.length >= 3 && out.every(function (q) {
    return pointInPolygon(q, points) && distanceToPolygonBoundary(q, points) >= distance - tol;
  });
  return out;
}

/**
 * 檢查 offsetPolygonInward() 的結果有沒有「內縮過頭」（相鄰邊互相穿越、
 * 幾何已經不成立）：逐邊比較內縮前後的方向向量，只要有一邊的方向反過
 * 來了（內積 ≤ 0），就代表那段邊被壓縮穿越、不是真正的內縮結果。
 * 這是輕量啟發式檢查，不是嚴謹的多邊形自我相交偵測，但足以攔住
 * 「liner 厚度超過局部幾何能容許範圍」這種最常見的失敗情況。
 */
function isOffsetValid(original, inset) {
  if (inset.dropped) return inset.valid;
  const n = original.length;
  if (n !== inset.length || n < 3) return false;
  for (let i = 0; i < n; i++) {
    const a = original[i], b = original[(i + 1) % n];
    const ai = inset[i], bi = inset[(i + 1) % n];
    const dot = (b.x - a.x) * (bi.x - ai.x) + (b.y - a.y) * (bi.y - ai.y);
    if (dot <= 0) return false;
  }
  return true;
}

/**
 * Sutherland-Hodgman 單一半平面裁切：只留下 y >= minY 的部分（y 往下遞
 * 增的座標系裡，這就是「槽口以下」的本體部分）。凹凸多邊形都適用。
 * 用來把「開口喉不繞線」這件事從堆疊/面積計算裡排除——喉部本身還是
 * 槽型/liner 的一部分（照樣畫出來），只是不會被當成可以塞線的區域。
 * @returns {Array<{x,y}>} 裁切後的多邊形頂點，minY 以上整個不相交時回傳 []
 */
function clipPolygonMinY(points, minY) {
  const n = points.length;
  if (n < 3) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const cur = points[i], prev = points[(i - 1 + n) % n];
    const curIn = cur.y >= minY, prevIn = prev.y >= minY;
    if (curIn) {
      if (!prevIn) {
        const t = (minY - prev.y) / (cur.y - prev.y);
        out.push({ x: prev.x + t * (cur.x - prev.x), y: minY });
      }
      out.push({ x: cur.x, y: cur.y });
    } else if (prevIn) {
      const t = (minY - prev.y) / (cur.y - prev.y);
      out.push({ x: prev.x + t * (cur.x - prev.x), y: minY });
    }
  }
  return out;
}

/**
 * 跟 clipPolygonMinY 同一套 Sutherland-Hodgman 半平面裁切，只是裁的是
 * x 軸：maxX 版留下 x <= maxX（槽內左半），minX 版留下 x >= minX
 * （槽內右半）。雙層繞組（Coils/slot >= 2）時用這兩個函式把繞線窗切
 * 成左右兩個獨立線圈邊，各自密排——不這樣切的話，密排會把雙層跟單層
 * 畫成同一種「整個繞線窗一池子」的樣子，看不出線圈邊的分別。
 */
function clipPolygonMaxX(points, maxX) {
  const n = points.length;
  if (n < 3) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const cur = points[i], prev = points[(i - 1 + n) % n];
    const curIn = cur.x <= maxX, prevIn = prev.x <= maxX;
    if (curIn) {
      if (!prevIn) {
        const t = (maxX - prev.x) / (cur.x - prev.x);
        out.push({ x: maxX, y: prev.y + t * (cur.y - prev.y) });
      }
      out.push({ x: cur.x, y: cur.y });
    } else if (prevIn) {
      const t = (maxX - prev.x) / (cur.x - prev.x);
      out.push({ x: maxX, y: prev.y + t * (cur.y - prev.y) });
    }
  }
  return out;
}

function clipPolygonMinX(points, minX) {
  const n = points.length;
  if (n < 3) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const cur = points[i], prev = points[(i - 1 + n) % n];
    const curIn = cur.x >= minX, prevIn = prev.x >= minX;
    if (curIn) {
      if (!prevIn) {
        const t = (minX - prev.x) / (cur.x - prev.x);
        out.push({ x: minX, y: prev.y + t * (cur.y - prev.y) });
      }
      out.push({ x: cur.x, y: cur.y });
    } else if (prevIn) {
      const t = (minX - prev.x) / (cur.x - prev.x);
      out.push({ x: minX, y: prev.y + t * (cur.y - prev.y) });
    }
  }
  return out;
}

/**
 * 點到多邊形邊界（線段集合，不是無限延伸的直線）的最短距離——逐邊算
 * point-to-segment distance 取最小值。用來確認一顆線材的圓心離「真實
 * 邊界」還有至少一個半徑的空間，不是只離某條邊的無限延伸直線夠遠
 * （轉角附近這兩者會不一樣）。
 */
function distanceToPolygonBoundary(p, points) {
  let minD = Infinity;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    const projx = a.x + t * dx, projy = a.y + t * dy;
    const d = Math.hypot(p.x - projx, p.y - projy);
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * 跟 horizontalSpans 方向相反：固定 x，掃描跟多邊形邊界的交點，回傳由
 * 小到大排序的 [yTop,yBottom] 區間（even-odd 規則）。settlePack 用這個
 * 直接算出「這個 x 在槽型裡的真實有效範圍」，不用去猜「哪一側通常比
 * 較寬、可以當基準做二分搜尋」——猜錯基準side是之前版本踩過的bug（開
 * 口喉頸縮讓『槽口端』不是可靠基準；槽壁側貼牆方向的沉降又讓『槽壁
 * 端』不是可靠基準），直接掃描交點就不用賭哪一側安全。
 */
function verticalSpans(points, x) {
  const n = points.length;
  const ys = [];
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const x1 = a.x, x2 = b.x;
    if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
      const t = (x - x1) / (x2 - x1);
      ys.push(a.y + t * (b.y - a.y));
    }
  }
  ys.sort((p, q) => p - q);
  const spans = [];
  for (let i = 0; i + 1 < ys.length; i += 2) spans.push([ys[i], ys[i + 1]]);
  return spans;
}

/**
 * 逐顆「沉降」模擬：每一條新線材從槽口端開始往槽底方向落下，貼著槽壁
 * /槽底、或已經放好的線材停住——不是套固定格點公式，是真的模擬「線
 * 一條條塞進去、滾到最深處」的物理直覺，貼牆/貼鄰線是自然結果。沉降
 * 方向固定是「y 遞增」；如果要改成貼某一側槽壁沉降，呼叫端把多邊形
 * 轉90度（見下面 settlePackTowardWall）再呼叫這個函式即可，不用在這
 * 裡另外加方向參數。
 *
 * 作法（每次只放一顆，放的時候全槽寬都掃過一輪）：
 *   1. 對一組取樣 x（橫跨整個可用寬度），各自獨立算「這個 x 能落到多
 *      深」：先用 verticalSpans 找出槽型本身（不管其他線材）在這個 x
 *      的真實有效 y 區間（取最靠近槽底、即 y 最大的那一段），再從區
 *      間內部（保證合法的中點）二分搜尋出貼著邊界、容許半徑誤差的最
 *      大 y，最後檢查附近已放置線材會不會把這個 x 卡在更淺的位置
 *      （跟某顆鄰線相切的高度，且那個高度本身仍要在槽型合法範圍內）。
 *   2. 取所有取樣 x 裡「能落最深（y 最大）」的那一個，當作這顆新線材
 *      實際落地的位置——這就是「滾到最深處」的貼合判斷，不用真的做
 *      逐步迭代的物理模擬。
 *   3. 重複，直到要求的數量放完，或是已經沒有任何 x 能再放下一顆
 *      （這時候算出的已放置總數就是這個槽的真實容量，不管有沒有限制
 *      count 都是同一套流程，只是提早在 count 顆時停止）。
 *
 * 已知限制：取樣 x 是離散網格（不是連續求解），極端情況下可能漏掉某
 * 個比取樣間距還窄的縫隙，但對這個工具的 mm 級槽型/線徑來說精度足夠；
 * 另外這仍然是幾何上的沉降近似，不是真的剛體動力學模擬。
 * @param {Array<{x,y}>} points 槽型頂點（mm，已經是內縮＋裁掉喉部後的繞線窗；雙層繞組時傳入切半後的單一線圈邊）
 * @param {number} diameter 線材外徑（mm，含漆膜）
 * @param {number} [count] 要擺的線材總數；省略或 Infinity 時回傳「這個槽能塞下的全部數量」
 * @returns {{placed:Array<{x,y,d}>, placedCount:number, requestedCount:number, maxCapacity:number}}
 */
function settlePack(points, diameter, count) {
  const requestedCount = (count === undefined) ? Infinity : count;
  const result = { placed: [], placedCount: 0, requestedCount, maxCapacity: 0 };
  const r = diameter / 2;
  if (!(diameter > 0) || points.length < 3) return result;

  const bbox = polygonBBox(points);
  const xMin = bbox.minX + r, xMax = bbox.maxX - r;
  if (!(xMax > xMin)) return result;

  const nSamples = 220;

  function validAt(x, y) {
    const p = { x, y };
    return pointInPolygon(p, points) && distanceToPolygonBoundary(p, points) >= r - 1e-9;
  }
  function polyMaxValidY(x) {
    const spans = verticalSpans(points, x);
    let best = null;
    for (let i = 0; i < spans.length; i++) { const s = spans[i]; if (!best || s[1] > best[1]) best = s; }
    if (!best) return null;
    const mid = (best[0] + best[1]) / 2; // 區間內部，保證合法
    if (!validAt(x, mid)) return null;
    let lo = mid, hi = best[1] + r; // 保底超出邊界
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (validAt(x, m)) lo = m; else hi = m; }
    return lo;
  }

  // 槽型本身（不管已放置哪些線材）在每個取樣 x 能到的最大 y，只跟槽型
  // 有關，整個沉降過程只需要算一次，不用每放一顆就重算一次二分搜尋。
  const xs = [], baseY = [];
  for (let s = 0; s <= nSamples; s++) {
    const x = xMin + (xMax - xMin) * s / nSamples;
    xs.push(x); baseY.push(polyMaxValidY(x));
  }

  const placed = [];
  // 用「每 diameter 寬一格」的空間雜湊分桶，查詢某個 x 附近可能構成阻擋
  // 的線材時只需要看鄰近幾桶，不用每次都掃過全部已放置的線材。
  const bins = new Map();
  function binKey(x) { return Math.floor(x / diameter); }
  function insertBin(p) { const k = binKey(p.x); let arr = bins.get(k); if (!arr) { arr = []; bins.set(k, arr); } arr.push(p); }
  function nearbyCircles(x) {
    const k = binKey(x), out = [];
    for (let dk = -1; dk <= 1; dk++) { const arr = bins.get(k + dk); if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]); }
    return out;
  }
  function landingY(x, base) {
    if (base === null) return null;
    let y = base;
    const near = nearbyCircles(x);
    for (let k = 0; k < near.length; k++) {
      const q = near[k]; const dx = x - q.x;
      if (Math.abs(dx) < diameter) {
        const dy2 = diameter * diameter - dx * dx;
        const obstructY = q.y - Math.sqrt(Math.max(0, dy2));
        if (obstructY < y) y = obstructY;
      }
    }
    // 只有被鄰線往上頂、真的改到槽型本身的 base 值時才需要重新驗證邊界
    // ——頂起來的那個高度可能剛好撞進槽壁往內收的區域（斜槽壁的常見情
    // 況），這個 x 在那個高度其實放不下，整欄判定失敗，換別的 x 候選。
    if (y !== base && !validAt(x, y)) return null;
    return y;
  }

  const hardCap = 5000; // 安全上限，避免極端參數（例如線徑趨近於0）造成無窮迴圈
  for (let i = 0; i < hardCap; i++) {
    let bestX = null, bestY = -Infinity;
    for (let s = 0; s <= nSamples; s++) {
      const y = landingY(xs[s], baseY[s]);
      if (y !== null && y > bestY) { bestY = y; bestX = xs[s]; }
    }
    if (bestX === null || !isFinite(bestY)) break;
    const p = { x: bestX, y: bestY };
    let ok = true;
    const near = nearbyCircles(bestX);
    for (let k = 0; k < near.length; k++) {
      if (Math.hypot(p.x - near[k].x, p.y - near[k].y) < diameter - 1e-6) { ok = false; break; }
    }
    if (!ok) break;
    placed.push(p);
    insertBin(p);
  }

  // maxCapacity 一定是跑完整個沉降流程（不受 requestedCount 影響）算出
  // 來的真實上限——之前這裡有個「放到 requestedCount 顆就提早 break」
  // 的提早結束，當初是當成效能最佳化加的，但副作用是 maxCapacity 被
  // 悄悄限制成「min(真實容量, 使用者要求的數量)」：只要使用者設定的匝
  // 數低於真實容量，算出來的「最大容量」就會錯誤地跟著縮小，使用者改
  // 小匝數卻看到最大容量跟著變小，誤以為兩者有關聯（實際上應該完全無
  // 關，純粹是線徑/槽型決定的）。拿掉提早結束，maxCapacity 才會是真正
  // 跟 count 無關的數字；要放的數量再用 requestedCount 截斷 placed 陣
  // 列即可，不影響正確性，效能也沒差（最壞情況本來就已經在算全部容量
  // ——沒有要求數量時就是這樣跑的，有驗算過、毫秒級）。
  result.maxCapacity = placed.length;
  const n = Math.min(requestedCount, placed.length);
  result.placed = placed.slice(0, n).map(p => ({ x: p.x, y: p.y, d: diameter }));
  result.placedCount = result.placed.length;
  return result;
}

/**
 * settlePack 本身固定沉降方向是「y 遞增」。這兩組旋轉/還原函式把「貼左
 * 牆（x 較小）沉降」「貼右牆（x 較大）沉降」轉成 settlePack 聽得懂的
 * 座標系（90 度旋轉或對角線鏡射，都是保距變換，不影響半徑/重疊判斷），
 * 算完再把結果轉換回真正的槽型座標——不用為了「往哪個方向沉降」另外
 * 重寫一份 settlePack。
 *   左牆：(x,y) → (y,−x)，還原 (a,b) → (−b,a)。
 *   右牆：(x,y) → (y, x)，自己就是自己的還原（對角線鏡射）。
 */
function rotateForLeftWallSettle(points) {
  return points.map(p => ({ x: p.y, y: -p.x }));
}
function unrotateFromLeftWallSettle(p) {
  return { x: -p.y, y: p.x };
}
function rotateForRightWallSettle(points) {
  return points.map(p => ({ x: p.y, y: p.x }));
}
function unrotateFromRightWallSettle(p) {
  return { x: p.y, y: p.x };
}

/**
 * 貼槽壁沉降：跟 settlePack 的差別只在沉降方向（往某一側槽壁而不是往
 * 槽底），用來給雙層繞組的左右線圈邊各自貼自己真正的外側槽壁——不管
 * 牆是什麼角度都適用，因為旋轉之後核心演算法完全沒變。
 * @param {Array<{x,y}>} points 單一線圈邊的槽型頂點（已切半）
 * @param {number} diameter 線材外徑（mm，含漆膜）
 * @param {number} [count] 要擺的線材總數；省略時回傳這一側的全部容量
 * @param {'left'|'right'} side 'left'＝貼 x 較小那側槽壁，'right'＝貼 x 較大那側
 * @returns {{placed:Array<{x,y,d}>, placedCount:number, requestedCount:number, maxCapacity:number}}
 */
function settlePackTowardWall(points, diameter, count, side) {
  const rotate = side === 'right' ? rotateForRightWallSettle : rotateForLeftWallSettle;
  const unrotate = side === 'right' ? unrotateFromRightWallSettle : unrotateFromLeftWallSettle;
  const localPts = rotate(points);
  const res = settlePack(localPts, diameter, count);
  return {
    placed: res.placed.map(p => { const u = unrotate(p); return { x: u.x, y: u.y, d: p.d }; }),
    placedCount: res.placedCount,
    requestedCount: res.requestedCount,
    maxCapacity: res.maxCapacity,
  };
}

/**
 * 雙層繞組的線材編號順序：照實際繞線的走法一層一層排——第 1 層（貼著外
 * 側槽壁那一層）由上往下，第 2 層由下往上，第 3 層再由上往下……
 *
 * 沉降排列放線的順序（settlePack 的 placed 順序）是「哪個位置最深就先
 * 放」，斜槽壁時第 1、2 層會交錯放，直接拿來編號會跳來跳去，所以另外算。
 * 分層方式：
 *   1. 外側槽壁＝這一側繞線窗裡「偏直立（|dx| < |dy|）且位在外側（中點
 *      比 bbox 中線更靠外）」的邊——中間導針那條切線在內側、槽底跟頂部
 *      裁切線是橫的，都不算。
 *   2. 中心到外側槽壁距離 ≤ 半徑（含容差）的線材＝第 1 層。
 *   3. 從第 1 層沿「互相接觸」（中心距 ≤ 線徑，含容差）往槽中間做 BFS，
 *      跟槽壁隔幾顆線就是第幾層——跟槽壁角度無關。BFS 走不到的線材（理
 *      論上不會發生）依它到槽壁的距離估一個層數。
 *   4. 每一層內照 y 排序（y 小＝靠槽口＝上），奇數層由上往下、偶數層由
 *      下往上。
 * @param {Array<{x,y,d}>} placed 這一側已放置的線材（原始槽型座標）
 * @param {Array<{x,y}>} points 這一側的繞線窗多邊形（切半後）
 * @param {'left'|'right'} side 外側槽壁在哪一側
 * @returns {Array<{x,y,d}>} 重新排序後的新陣列（元素本身不變）
 */
function serpentineOrder(placed, points, side) {
  if (placed.length < 2 || points.length < 3) return placed.slice();
  const d = placed[0].d, r = d / 2, tol = 0.03 * d;
  const bbox = polygonBBox(points);
  const midX = (bbox.minX + bbox.maxX) / 2;

  const walls = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const mx = (a.x + b.x) / 2;
    const outer = side === 'right' ? mx > midX : mx < midX;
    if (Math.abs(dx) < Math.abs(dy) && outer) walls.push([a, b]);
  }
  function distToSeg(p, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy;
    let t = len2 > 0 ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  }
  const wallDist = placed.map(p => {
    let m = Infinity;
    for (let k = 0; k < walls.length; k++) m = Math.min(m, distToSeg(p, walls[k][0], walls[k][1]));
    return m;
  });

  const n = placed.length;
  const layer = new Array(n).fill(0);
  let queue = [];
  const minDist = Math.min(...wallDist);
  const seedLimit = isFinite(minDist) ? Math.max(r, minDist) + tol : Infinity;
  for (let i = 0; i < n; i++) if (wallDist[i] <= seedLimit) { layer[i] = 1; queue.push(i); }
  while (queue.length) {
    const next = [];
    for (let qi = 0; qi < queue.length; qi++) {
      const i = queue[qi];
      for (let j = 0; j < n; j++) {
        if (layer[j]) continue;
        if (Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y) <= d + tol) {
          layer[j] = layer[i] + 1; next.push(j);
        }
      }
    }
    queue = next;
  }
  for (let i = 0; i < n; i++) {
    if (!layer[i]) layer[i] = 1 + Math.max(0, Math.round((wallDist[i] - r) / (0.866 * d)));
  }

  const idx = placed.map((_, i) => i);
  idx.sort((a, b) => {
    if (layer[a] !== layer[b]) return layer[a] - layer[b];
    const down = layer[a] % 2 === 1; // 奇數層由上往下（y 遞增）
    return down ? placed[a].y - placed[b].y : placed[b].y - placed[a].y;
  });
  return idx.map(i => placed[i]);
}

/* ══════════════════════════════════════════════════════════
   RMxprt 定子槽型 1–5（參數名稱跟 Ansys RMxprt 一致）
   座標慣例同全工具：y=0 是槽口（氣隙側），y 往槽底增加；只產生左半邊
   （x ≤ 0，由槽口排到槽底），右半邊由 app.js 鏡射。圓弧（Rs 圓角、半圓
   槽底、同心圓弧槽底）都拆成短直線段，後面的 liner 內縮、排列只認多邊形。
   ══════════════════════════════════════════════════════════ */

/** 角 P 的圓角：回傳兩個切點 t1（prev 那側）、t2（next 那側）與實際半徑
 *  （r 太大、切點超出相鄰邊時自動縮到放得下；maxT 可另外限制切點距離）。 */
function filletCorner(prev, P, next, r, maxT) {
  const ux = prev.x - P.x, uy = prev.y - P.y, vx = next.x - P.x, vy = next.y - P.y;
  const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
  if (!(r > 0) || lu < 1e-9 || lv < 1e-9) return null;
  const u = { x: ux / lu, y: uy / lu }, v = { x: vx / lv, y: vy / lv };
  const theta = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y)));
  if (theta < 1e-6 || Math.PI - theta < 1e-6) return null;
  let t = r / Math.tan(theta / 2);
  const tMax = Math.min(lu, lv, maxT === undefined ? Infinity : maxT) * 0.98;
  if (t > tMax) { t = tMax; r = t * Math.tan(theta / 2); }
  return { t1: { x: P.x + u.x * t, y: P.y + u.y * t }, t2: { x: P.x + v.x * t, y: P.y + v.y * t }, r: r };
}

/* ── 圓弧連接（自訂頂點與參數化共用）──
 * 左半邊頂點 {x, y, r}：r 是「這一點連到下一點」用的圓弧半徑，0／空白＝直線；
 * 正值往槽外（鐵芯那側）凸，負值往槽內凹，一律取小於半圓的那段弧。最後一
 * 點的 r 是跨過對稱軸、連到自己鏡射點的槽底圓弧。展開成短直線段後再鏡射，
 * 後面的 liner、排列、面積都只看展開後的多邊形。 */
var ARC_SAGITTA_TOL = 0.005; // mm：每段直線跟真實圓弧的最大偏差

/** 一段圓弧 A→B 的中間點（不含 A、含 B）；半徑不夠跨過弦長時回傳 null */
function arcPoints(A, B, r, inward) {
  const dx = B.x - A.x, dy = B.y - A.y, c = Math.hypot(dx, dy);
  if (c < 1e-12) return [B];
  const R = Math.abs(r), h = c / 2;
  if (R < h * (1 - 1e-9)) return null;
  const bulge = r > 0 ? { x: -inward.x, y: -inward.y } : inward;
  const d = Math.sqrt(Math.max(0, R * R - h * h));
  const C = { x: (A.x + B.x) / 2 - bulge.x * d, y: (A.y + B.y) / 2 - bulge.y * d };
  const aA = Math.atan2(A.y - C.y, A.x - C.x);
  let delta = Math.atan2(B.y - C.y, B.x - C.x) - aA;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  const am = aA + delta / 2; // 弧的中點要落在凸出的那一側，不然換另一個方向繞
  if (Math.cos(am) * bulge.x + Math.sin(am) * bulge.y < 0) delta -= Math.sign(delta || 1) * 2 * Math.PI;
  const step = 2 * Math.acos(Math.max(-1, 1 - ARC_SAGITTA_TOL / Math.max(R, 1e-9)));
  let n = Math.max(2, Math.min(256, Math.ceil(Math.abs(delta) / step)));
  if (n % 2) n++; // 偶數段：槽底圓弧剛好有一點落在對稱軸上
  const out = [];
  for (let k = 1; k <= n; k++) {
    const a = aA + delta * k / n;
    out.push({ x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) });
  }
  return out;
}

/** 左半邊頂點（含 r）→ 完整封閉多邊形；bad 列出半徑太小、畫不出圓弧的點
 *  （那段先當直線）：[{ i, minR }]，i 從 0 開始。 */
function expandHalfWithArcs(half) {
  const n = half.length;
  const mirror = function (q) { return { x: -q.x, y: q.y }; };
  const straight = half.concat(half.slice().reverse().map(mirror));
  let area2 = 0;
  for (let i = 0; i < straight.length; i++) {
    const a = straight[i], b = straight[(i + 1) % straight.length];
    area2 += a.x * b.y - b.x * a.y;
  }
  const side = area2 >= 0 ? 1 : -1;
  const inwardOf = function (A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len * side, y: dx / len * side };
  };
  const bad = [];
  let left = [{ x: half[0].x, y: half[0].y }];
  let onAxis = false, openOnAxis = false;
  // 槽口圓弧（第一點的 ro）：從對稱軸連到第一點，跟槽底圓弧一樣只產生左半邊。
  // 跟定子內徑同心時 ro＝−Dsi/2（往槽內凹）。
  const ro = Number(half[0].ro) || 0;
  if (ro && Math.abs(half[0].x) > 1e-12) {
    const F = half[0], Fm = mirror(F);
    const pts = arcPoints(Fm, F, ro, inwardOf(Fm, F));
    if (!pts) bad.push({ i: -1, minR: Math.abs(F.x) });
    else {
      const k = pts.length / 2;          // pts[k-1] 落在對稱軸上
      const opening = pts.slice(k - 1);  // 對稱軸 → … → F
      opening[0].x = 0;
      opening[opening.length - 1] = { x: F.x, y: F.y };
      left = opening;
      openOnAxis = true;
    }
  }
  for (let i = 0; i < n; i++) {
    const A = half[i], r = Number(A.r) || 0;
    const isBottom = i === n - 1;
    const B = isBottom ? mirror(A) : half[i + 1];
    if (r && !(isBottom && Math.abs(A.x) < 1e-12)) {
      const pts = arcPoints(A, B, r, inwardOf(A, B));
      if (!pts) {
        bad.push({ i: i, minR: Math.hypot(B.x - A.x, B.y - A.y) / 2 });
      } else if (isBottom) {
        // 槽底圓弧只取左半（到對稱軸那一點為止），右半由鏡射產生
        const halfPts = pts.slice(0, pts.length / 2);
        halfPts[halfPts.length - 1].x = 0;
        halfPts.forEach(function (q) { left.push(q); });
        onAxis = true;
        continue;
      } else {
        pts.forEach(function (q) { left.push(q); });
        continue;
      }
    }
    if (!isBottom) left.push({ x: B.x, y: B.y });
  }
  const back = left.slice().reverse().map(mirror);
  if (onAxis) back.shift(); // 對稱軸上那一點左右共用，不重複
  if (openOnAxis) back.pop();
  return { pts: left.concat(back), bad: bad };
}

/** p = { bs0, hs0, hs1, bs1, bs2, hs2, rs, dsi }；回傳 { half, y1, y2, yBottom } 或 { error }。
 *  half 是左半邊的定義點，圓弧用 r 表示（見 expandHalfWithArcs）。
 *  y1 = 槽身開始（Bs1 那條線），y2 = Bs2 那條線，yBottom = 槽最深處。 */
function rmxprtSlotHalf(type, p) {
  const t = String(type);
  const need = ['hs0', 'hs1', 'bs1', 'bs2', 'hs2'].concat(t === '2' ? [] : ['bs0']);
  for (const k of need) if (!(p[k] >= 0) || !isFinite(p[k])) return { error: 'errSlotParams' };
  if (!(p.bs1 > 0) || !(p.bs2 > 0) || !(p.hs2 > 0)) return { error: 'errSlotParams' };
  if (t !== '2' && !(p.bs0 > 0)) return { error: 'errSlotParams' };
  // 定子槽由槽口往槽底展開（平行齒）：除了開口槽 2，槽壁不可畫成等寬或往下收窄
  if (t !== '2' && !(p.bs2 > p.bs1)) return { error: 'errSlotWiden' };
  const g = rmxprtSlotHalfRaw(t, p);
  // 有 Dsi：槽口沿定子內徑的圓弧（跟氣隙同心，往槽內凹）
  if (g.half && p.dsi > 0) g.half[0].ro = -p.dsi / 2;
  return g;
}

function rmxprtSlotHalfRaw(t, p) {
  const y0 = p.hs0, y1 = p.hs0 + p.hs1, y2 = y1 + p.hs2;
  if (t === '2') {
    // 開口槽：槽口寬＝Bs1；Hs1 段是放槽楔的 V 形凹口，凹口深度圖上沒有標，取 Hs1/2（示意）
    const half = [
      { x: -p.bs1 / 2, y: 0 },
      { x: -p.bs1 / 2, y: y0 },
      { x: -p.bs1 / 2 - p.hs1 / 2, y: y0 + p.hs1 / 2 },
      { x: -p.bs1 / 2, y: y1 },
      { x: -p.bs2 / 2, y: y2 },
    ];
    return { half: dedupe(half), y1: y1, y2: y2, yBottom: y2 };
  }
  const body = [{ x: -p.bs0 / 2, y: 0 }, { x: -p.bs0 / 2, y: y0 }];
  if (t === '3') body.push({ x: -p.bs1 / 2, y: y0 }); // 水平台階，再接 Hs1 直段
  body.push({ x: -p.bs1 / 2, y: y1 });
  const corner = { x: -p.bs2 / 2, y: y2 };
  if (t === '1' || t === '3') {
    const f = p.rs > 0 ? filletCorner(body[body.length - 1], corner, { x: 0, y: y2 }, p.rs, p.bs2 / 2) : null;
    const tail = f ? [{ x: f.t1.x, y: f.t1.y, r: f.r }, { x: f.t2.x, y: f.t2.y }] : [corner];
    return { half: dedupe(body.concat(tail)), y1: y1, y2: y2, yBottom: y2 };
  }
  if (t === '4') {
    // 半圓槽底：直徑 Bs2，圓心在 Bs2 那條線的中點
    return { half: dedupe(body.concat([{ x: corner.x, y: corner.y, r: p.bs2 / 2 }])), y1: y1, y2: y2, yBottom: y2 + p.bs2 / 2 };
  }
  if (t === '5') {
    // 與定子同心的圓弧槽底：圓心在定子中心（槽口往氣隙側 Dsi/2 處），通過 Bs2 兩端
    if (!(p.dsi > 0)) return { error: 'errSlotParams' };
    const R = Math.hypot(p.bs2 / 2, y2 + p.dsi / 2);
    return { half: dedupe(body.concat([{ x: corner.x, y: corner.y, r: R }])), y1: y1, y2: y2,
             yBottom: R - p.dsi / 2, arcR: R };
  }
  return { error: 'errSlotParams' };

  function dedupe(pts) {
    return pts.filter(function (q, i) {
      return i === 0 || Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) > 1e-9;
    });
  }
}

/* ══════════════════════════════════════════════════════════
   規則層繞（往返排線）
   每個線圈邊從自己的外側槽壁開始一層一層往內排：層＝平行於槽壁的一排
   導線，相鄰兩層錯開半個節距、嵌進前一層的凹槽（間距 d·√3/2）。
   第 1 層由槽底往槽口、第 2 層由槽口往槽底……連續往返。限制：
   - 第 1 匝在槽底；
   - 換層跳距（上一層最後一根到下一層第一根的中心距）≤ 3 個節距；
   - 使用的層數必須是偶數（進出線都在槽底那端）。
   ══════════════════════════════════════════════════════════ */
var LAYER_MAX_JUMP = 3; // 換層跳距上限，單位：導線節距（＝外徑）

/** 每一層可放的位置（槽底→槽口排序）。side：外側槽壁在哪一邊。 */
function layerRuns(area, d, side) {
  const r = d / 2;
  const bb = polygonBBox(area), midX = (bb.minX + bb.maxX) / 2;
  // 槽壁方向：外側那半邊最長的一段偏垂直的邊（圓角、圓弧拆出來的短邊不算進方向）
  let ux = 0, uy = 1, longest = 0;
  for (let i = 0; i < area.length; i++) {
    const a = area[i], b = area[(i + 1) % area.length];
    let dx = b.x - a.x, dy = b.y - a.y;
    const mx = (a.x + b.x) / 2, len = Math.hypot(dx, dy);
    if (Math.abs(dy) <= Math.abs(dx)) continue;
    if (side === 'left' ? mx > midX : mx < midX) continue;
    if (len <= longest) continue;
    if (dy < 0) { dx = -dx; dy = -dy; }
    ux = dx / len; uy = dy / len; longest = len;
  }
  const u = { x: ux, y: uy };                                            // 沿槽壁、朝槽底
  const n = side === 'left' ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x }; // 離開槽壁、朝槽內
  let sMin = Infinity, sMax = -Infinity, tMin = Infinity, tMax = -Infinity;
  area.forEach(function (p) {
    const s = p.x * n.x + p.y * n.y, t = p.x * u.x + p.y * u.y;
    sMin = Math.min(sMin, s); sMax = Math.max(sMax, s); tMin = Math.min(tMin, t); tMax = Math.max(tMax, t);
  });
  const at = function (s, t) { return { x: s * n.x + t * u.x, y: s * n.y + t * u.y }; };
  const valid = function (p) { return pointInPolygon(p, area) && distanceToPolygonBoundary(p, area) >= r - 1e-9; };
  const step = d / 20;
  // 最靠槽底、而且放得下的位置（沿 t 由槽底往槽口找，再二分逼近邊界）
  const lowest = function (s) {
    for (let t = tMax; t >= tMin; t -= step) {
      if (valid(at(s, t))) {
        let lo = t, hi = Math.min(t + step, tMax);
        for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (valid(at(s, mid))) lo = mid; else hi = mid; }
        return lo;
      }
    }
    return null;
  };

  // 第 1 層：貼著槽壁那條線；槽壁不完全是直線時（圓角、圓弧），往內移到放得下為止
  let s1 = sMin + r, tb = null;
  for (; s1 <= sMax - r + 1e-9; s1 += d / 50) { tb = lowest(s1); if (tb !== null) break; }
  if (tb === null) return [];
  const runs = [];
  const pitchS = d * Math.sqrt(3) / 2;
  for (let j = 0; ; j++) {
    const s = s1 + j * pitchS;
    if (s > sMax - r + 1e-9) break;
    const shift = (j % 2) * d / 2;
    const kMin = Math.floor((tMin - tb - shift) / d) - 1, kMax = Math.ceil((tMax - tb - shift) / d) + 1;
    // 找最長的一段連續位置（同一層要連續繞，不跳格）
    let best = [], cur = [];
    for (let k = kMax; k >= kMin; k--) {
      const p = at(s, tb + shift + k * d);
      if (valid(p)) cur.push(p);
      else { if (cur.length > best.length) best = cur; cur = []; }
    }
    if (cur.length > best.length) best = cur;
    if (!best.length) { if (j === 0) return []; break; }
    runs.push(best); // 已經是槽底→槽口
  }
  return runs;
}

/** 依各層根數 counts 實際排出往返順序；不可行（位置不夠或跳距超過上限）回傳 null。
 *  奇數層（第 1、3…層）由槽底往槽口，偶數層反過來；每一層從離上一根最近的
 *  那端開始，如果該層最遠的起點也在跳距上限內就從最遠的起點開始（放得比較多）。 */
function layerSequence(runs, counts, d) {
  const seq = [];
  let prev = null, maxJump = 0;
  for (let j = 0; j < counts.length; j++) {
    if (!counts[j]) continue;
    const run = runs[j];
    if (!run) return null;
    const ordered = j % 2 === 0 ? run : run.slice().reverse();
    let start = 0;
    if (prev) {
      const dist0 = Math.hypot(ordered[0].x - prev.x, ordered[0].y - prev.y);
      if (dist0 > LAYER_MAX_JUMP * d + 1e-9) {
        let bestI = 0, bestD = Infinity;
        ordered.forEach(function (p, i) { const dd = Math.hypot(p.x - prev.x, p.y - prev.y); if (dd < bestD) { bestD = dd; bestI = i; } });
        start = bestI;
      }
    }
    const take = ordered.slice(start, start + counts[j]);
    if (take.length < counts[j]) return null;
    if (prev) {
      const jump = Math.hypot(take[0].x - prev.x, take[0].y - prev.y) / d;
      if (jump > LAYER_MAX_JUMP + 1e-9) return null;
      maxJump = Math.max(maxJump, jump);
    }
    take.forEach(function (p) { seq.push({ x: p.x, y: p.y, d: d, layer: j + 1 }); });
    prev = take[take.length - 1];
  }
  return { seq: seq, maxJump: maxJump, layers: counts.filter(function (c) { return c > 0; }).length };
}

/** 一個線圈邊的規則層繞。回傳格式跟 settlePack 相容（placed/placedCount/
 *  requestedCount/maxCapacity），另外多 layers、maxJump（節距）與 limitedBy。 */
function layeredWinding(area, d, count, side) {
  const empty = { placed: [], placedCount: 0, requestedCount: count, maxCapacity: 0, layers: 0, maxJump: 0, limitedBy: 'space' };
  if (!area || area.length < 3 || !(d > 0)) return empty;
  const runs = layerRuns(area, d, side);
  // 每層最多繞幾根。槽型往槽口收窄時，內層比外層短：上一層如果一路繞到
  // 槽口，換到下一層的跳距會超過上限——這時把上一層提早折返（尾端少繞幾
  // 根，讓下一層從最遠端開始），或下一層改從最近的位置開始，取總根數多的。
  const sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  let full = runs.length ? [runs[0].length] : [];
  for (let j = 1; j < runs.length; j++) {
    let best = null, partial = false;
    for (let k = full[j - 1]; k >= 1; k--) { // 上一層提早折返，這一層繞滿
      const c = full.slice(0, j - 1).concat([k, runs[j].length]);
      if (layerSequence(runs, c, d)) { best = c; break; }
    }
    for (let c = runs[j].length; c >= 1; c--) { // 上一層不動，這一層從最近的位置開始
      const cc = full.concat([c]);
      if (layerSequence(runs, cc, d)) {
        if (!best || sum(cc) > sum(best)) { best = cc; partial = c < runs[j].length; }
        break;
      }
    }
    if (!best) break;
    full = best;
    if (partial) break; // 這一層沒繞滿，再往下的起點已經不規則，到此為止
  }
  const usable = full.length % 2 === 0 ? full : full.slice(0, -1); // 層數要偶數
  const maxCapacity = usable.reduce(function (a, b) { return a + b; }, 0);

  function plan(N) {
    // N 根需要幾層；最後一層是奇數層就拆成兩層（後半段往回繞），讓總層數維持偶數
    let cum = 0, L = 0;
    while (L < usable.length && cum + usable[L] < N) { cum += usable[L]; L++; }
    if (L >= usable.length) return null;
    const m = N - cum, base = usable.slice(0, L);
    const layerNo = L + 1;
    if (layerNo % 2 === 0) return layerSequence(runs, base.concat([m]), d);
    for (let m1 = Math.ceil(m / 2); m1 <= m - 1; m1++) {
      const s = layerSequence(runs, base.concat([m1, m - m1]), d);
      if (s) return s;
    }
    if (m === 1 && L >= 1) { // 只剩 1 根：跟前一層借 1 根，變成 1+1
      const b2 = base.slice(); b2[b2.length - 1] -= 1;
      if (b2[b2.length - 1] >= 1) return layerSequence(runs, b2.concat([1, 1]), d);
    }
    return null;
  }

  let N = Math.min(count, maxCapacity), res = null;
  while (N > 0 && !(res = plan(N))) N--;
  if (!res) return Object.assign(empty, { maxCapacity: maxCapacity });
  return {
    placed: res.seq, placedCount: res.seq.length, requestedCount: count, maxCapacity: maxCapacity,
    layers: res.layers, maxJump: res.maxJump, limitedBy: res.seq.length >= count ? null : 'space',
  };
}
