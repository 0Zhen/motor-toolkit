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
 * 梯形開口槽：對稱等腰梯形，y=0 是槽口（靠氣隙那端），y=depth 是槽底
 * （靠軛部那端）。4 個頂點，當作後續「加點微調」的起始外形。
 * @returns {Array<{x:number,y:number}>} 依順時針排列的 4 個頂點
 */
function generateTrapezoid(topWidth, bottomWidth, depth) {
  return [
    { x: -topWidth / 2, y: 0 },
    { x: topWidth / 2, y: 0 },
    { x: bottomWidth / 2, y: depth },
    { x: -bottomWidth / 2, y: depth },
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
 * 槽內線材堆疊（簡單逐排視覺化，不是最佳圓形填充演算法）：
 * 由槽口往槽底逐排排列，每排用掃描線算出該高度的實際寬度，
 * 該排置中擺放能放下的圓（一律同直徑），放滿 count 顆或掃到槽底為止。
 * @param {Array<{x,y}>} points 槽型頂點（mm）
 * @param {number} diameter 線材外徑（mm，含漆膜）
 * @param {number} count 要擺的線材總數（= 每槽匝數×每槽線圈數×股數/匝）
 * @param {number} wallClearance 每排兩側各自內縮的壁面餘隙（mm，簡化模型，
 *   不是真正的多邊形內縮，只在每排的左右邊界各扣掉這個值）
 * @returns {{placed:Array<{x,y,d}>, placedCount:number, requestedCount:number}}
 */
function packCirclesInPolygon(points, diameter, count, wallClearance) {
  const result = { placed: [], placedCount: 0, requestedCount: count };
  if (!(diameter > 0) || !(count > 0) || points.length < 3) return result;
  const clearance = wallClearance || 0;
  const r = diameter / 2;
  const bbox = polygonBBox(points);

  let y = bbox.minY + r;
  while (y <= bbox.maxY - r + 1e-9 && result.placed.length < count) {
    const spans = horizontalSpans(points, y)
      .map(([a, b]) => [a + clearance, b - clearance])
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
