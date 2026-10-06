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

  const centroid = points.reduce(
    (acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }),
    { x: 0, y: 0 }
  );

  const shifted = [];
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len; // 邊方向的其中一個法向量
    const midx = (a.x + b.x) / 2, midy = (a.y + b.y) / 2;
    if (nx * (centroid.x - midx) + ny * (centroid.y - midy) < 0) { nx = -nx; ny = -ny; }
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
  return result;
}

/**
 * 檢查 offsetPolygonInward() 的結果有沒有「內縮過頭」（相鄰邊互相穿越、
 * 幾何已經不成立）：逐邊比較內縮前後的方向向量，只要有一邊的方向反過
 * 來了（內積 ≤ 0），就代表那段邊被壓縮穿越、不是真正的內縮結果。
 * 這是輕量啟發式檢查，不是嚴謹的多邊形自我相交偵測，但足以攔住
 * 「liner 厚度超過局部幾何能容許範圍」這種最常見的失敗情況。
 */
function isOffsetValid(original, inset) {
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
 * 逐顆「沉降」模擬：每一條新線材從槽口端開始往槽底方向落下，貼著槽壁
 * /槽底、或已經放好的線材停住——不是套固定格點公式，是真的模擬「線
 * 一條條塞進去、滾到最深處」的物理直覺，貼牆/貼鄰線是自然結果，不需
 * 要另外偵測槽壁方向或做座標旋轉（跟之前的六方格點版本最大的差異，
 * 也因此同一套函式不管槽壁是什麼角度、雙層分割後兩側的「牆」在哪一
 * 邊，都不用特殊處理）。
 *
 * 作法（每次只放一顆，放的時候全槽寬都掃過一輪）：
 *   1. 對一組取樣 x（橫跨整個可用寬度），各自獨立算「這個 x 能落到多
 *      深」：先找槽型本身（不管其他線材）在這個 x 能到的最大 y
 *      （polyMaxValidY，用二分搜尋貼齊槽底/槽壁，不是只看槽口那一點
 *      ——槽口附近的喉部殘留頸縮不該卡住整條 x 柱，頸縮只是局部現象，
 *      底下變寬之後一樣能用），再檢查附近已放置線材會不會把這個 x 卡
 *      在更淺的位置（跟某顆鄰線相切的高度）。
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
  const safeY = bbox.maxY - r;   // 靠近槽底的參考高度，用來起算槽型本身的可用範圍（不受槽口喉部頸縮影響）
  const floorY = bbox.maxY + r;  // 二分搜尋的保底上界（通常已經在多邊形外）
  const xMin = bbox.minX + r, xMax = bbox.maxX - r;
  if (!(xMax > xMin)) return result;

  const nSamples = 220;

  function validAt(x, y) {
    const p = { x, y };
    return pointInPolygon(p, points) && distanceToPolygonBoundary(p, points) >= r - 1e-9;
  }
  function polyMaxValidY(x) {
    if (!validAt(x, safeY)) return null;
    if (validAt(x, floorY)) return floorY;
    let lo = safeY, hi = floorY;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (validAt(x, mid)) lo = mid; else hi = mid; }
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
    if (placed.length >= requestedCount) break;
  }

  result.maxCapacity = placed.length;
  result.placed = placed.map(p => ({ x: p.x, y: p.y, d: diameter }));
  result.placedCount = result.placed.length;
  return result;
}
