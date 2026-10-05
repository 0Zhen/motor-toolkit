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
 * 掃描線切片：水平線 y 與多邊形邊界的交點，成對回傳「在多邊形內部」的
 * x 區間（even-odd 規則）。不要求頂點順時針/逆時針，凹多邊形（例如
 * 自訂頂點弄出畸形槽）也能正確處理，可能回傳多段區間。
 * @returns {Array<[number,number]>} 由左到右排序的 [xLeft,xRight] 區間
 */
function horizontalSpans(points, y) {
  const n = points.length;
  const xs = [];
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    const y1 = a.y, y2 = b.y;
    // 半開區間 [min,max) 避免頂點剛好落在掃描線上時重複計算
    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
      const t = (y - y1) / (y2 - y1);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  xs.sort((p, q) => p - q);
  const spans = [];
  for (let i = 0; i + 1 < xs.length; i += 2) spans.push([xs[i], xs[i + 1]]);
  return spans;
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
 * 槽內線材堆疊（簡單逐排視覺化，不是最佳圓形填充演算法）：
 * 由槽口往槽底逐排排列，每排用掃描線算出該高度的實際寬度，
 * 該排置中擺放能放下的圓（一律同直徑），放滿 count 顆或掃到槽底為止。
 * 呼叫端應該先用 offsetPolygonInward() 把 liner 內縮做完，這裡只管
 * 單純在給定的多邊形裡塞圓，不再處理壁面餘隙。
 * @param {Array<{x,y}>} points 槽型頂點（mm，已經是內縮後的繞線窗）
 * @param {number} diameter 線材外徑（mm，含漆膜）
 * @param {number} count 要擺的線材總數（= 每槽匝數×每槽線圈數×股數/匝）
 * @returns {{placed:Array<{x,y,d}>, placedCount:number, requestedCount:number}}
 */
function packCirclesInPolygon(points, diameter, count) {
  const result = { placed: [], placedCount: 0, requestedCount: count };
  if (!(diameter > 0) || !(count > 0) || points.length < 3) return result;
  const r = diameter / 2;
  const bbox = polygonBBox(points);

  let y = bbox.minY + r;
  while (y <= bbox.maxY - r + 1e-9 && result.placed.length < count) {
    const spans = horizontalSpans(points, y)
      .filter(([a, b]) => b - a >= diameter - 1e-9);

    for (const [left, right] of spans) {
      const spanWidth = right - left;
      const extraSlots = Math.floor((spanWidth - diameter) / diameter + 1e-9);
      const n = extraSlots + 1;
      const totalWidth = (n - 1) * diameter;
      const startX = left + (spanWidth - totalWidth) / 2;
      for (let k = 0; k < n && result.placed.length < count; k++) {
        result.placed.push({ x: startX + k * diameter, y, d: diameter });
      }
    }
    y += diameter; // 矩形排距（非六方最密堆積），確保排與排之間絕不重疊
  }
  result.placedCount = result.placed.length;
  return result;
}
