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
 * 成左右兩個獨立線圈邊，各自密排——不這樣切的話，六方格點會把雙層跟
 * 單層畫成同一種「整個繞線窗一池子」的樣子，看不出線圈邊的分別。
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

/** 左右鏡射（x 取負），搭配 hexLatticePack 貼左牆的習慣，用來讓右半邊
 *  的線圈邊改貼「真正的右側槽壁」——不是分裂後那半邊自己座標系的左側
 *  （那其實是中間的間隙，不是槽壁）。呼叫端鏡射多邊形、跑完密排、再把
 *  結果的 x 鏡射回來即可，不用在 hexLatticePack 本身加左右選項。 */
function mirrorPolygonX(points) {
  return points.map(p => ({ x: -p.x, y: p.y }));
}

/**
 * 真正的交錯密排：固定六方最密堆積格點（triangular lattice），裁進
 * 多邊形裡——不是逐排/逐欄湊數字，是業界畫線材截面示意圖常見的那種
 * 真實交錯堆疊。
 *
 * 格點定義（y 往下遞增）：
 *   row pitch = diameter × √3/2（正三角形排列的標準直向間距）
 *   偶數排：x = originX, originX±d, originX±2d, ...
 *   奇數排：x = originX±d/2, originX±3d/2, ...（跟偶數排整整錯開半個直徑）
 * 原點 originX 用「最底排（最寬、最沒有限制的那排）左緣＋半徑」校正，
 * 不是多邊形中心、也不是寫死全域 x=0——這樣最底排的第一顆線材會直接
 * 貼齊左側槽壁（真正的 0 間隙，不是剛好接近而已），畫面上最明顯的那
 * 排才會像參考圖一樣整排切齊槽壁。這個格點本身就是數學上證明過的最
 * 密圓形排列之一，不管 originX 怎麼選，相鄰格點之間的距離恆等於
 * diameter（不管同排還是跨排），所以相位選擇只影響「貼哪裡好看」，
 * 不影響「會不會重疊」這個安全性——整個格點清單先生成好、只篩選落在
 * 多邊形內部的，彼此之間保證不會重疊。
 * 只會貼「x 較小」那一側的槽壁；如果要貼另一側（例如雙層繞組右半邊
 * 真正的槽壁在大 x 那側），呼叫端自己用 mirrorPolygonX() 把多邊形鏡
 * 射過來跑、結果的 x 再鏡射回去即可，不在這裡加左右選項。
 *
 * 排序：依「欄」分組（固定 x 一欄，六方格點裡一欄只會出現在同一種奇
 * /偶排相位，彼此垂直間距是 2×rowPitch），欄的順序由貼牆那欄（colKey
 * =0）往另一側走，每一欄內部由下往上（貼槽底的 y 先）——所以 count
 * 不夠疊滿整個槽時，會先把貼牆那一欄一路疊到那一欄實際能到的最高
 * 處（跟著槽型的高度輪廓走），才開始疊下一欄，而不是每排都疊一點、
 * 停在某個高度留下一大截跟槽型taper脫節的矩形缺口。
 * @param {Array<{x,y}>} points 槽型頂點（mm，已經是內縮＋裁掉喉部後的繞線窗）
 * @param {number} diameter 線材外徑（mm，含漆膜）
 * @param {number} [count] 要擺的線材總數；省略或 Infinity 時回傳「這個槽能塞下的全部格點」
 * @returns {{placed:Array<{x,y,d}>, placedCount:number, requestedCount:number, maxCapacity:number}}
 */
function hexLatticePack(points, diameter, count) {
  const requestedCount = (count === undefined) ? Infinity : count;
  const result = { placed: [], placedCount: 0, requestedCount, maxCapacity: 0 };
  if (!(diameter > 0) || points.length < 3) return result;

  const r = diameter / 2;
  const rowPitch = diameter * Math.sqrt(3) / 2;
  const bbox = polygonBBox(points);

  // 格點相位用「最底排（最寬、最沒有限制的那排）」校正，讓格點直接從
  // 貼著底排左牆的位置起算——整條格點是數學上無限延伸的六方網格，相位
  // （從哪個 x 開始算）怎麼選都不影響「彼此距離≥diameter」這個安全性，
  // 純粹是視覺上要跟哪個基準對齊的選擇。用底排對齊，會讓畫面上最明顯
  // 的那排確實貼住槽壁，不是像用整體中心當基準那樣，貼壁只是巧合、實
  // 際上每排都留了隨機大小的縫。
  const bottomSpans = horizontalSpans(points, bbox.maxY - r).filter(([a, b]) => b - a >= diameter - 1e-9);
  const originX = bottomSpans.length ? bottomSpans[0][0] + r : (bbox.minX + bbox.maxX) / 2;

  // 先把全部格點依「欄」分組（不管 count，先找出整個槽的真實容量，也
  // 才知道每一欄實際能到多高）。colKey 用整數算（相對 originX 差幾個
  // 半徑），同一欄的點一定是同一種奇/偶排相位，不會混到別欄的點。
  const columns = new Map(); // colKey -> { x, ys: number[] }
  let rowIndex = 0;
  let y = bbox.maxY - r;
  while (y >= bbox.minY + r - 1e-9) {
    const offset = (rowIndex % 2 === 1) ? r : 0;
    const spans = horizontalSpans(points, y).filter(([a, b]) => b - a >= diameter - 1e-9);
    spans.forEach(([left, right]) => {
      const mMin = Math.ceil((left + r - originX - offset) / diameter - 1e-9);
      const mMax = Math.floor((right - r - originX - offset) / diameter + 1e-9);
      for (let m = mMin; m <= mMax; m++) {
        const x = originX + offset + m * diameter;
        const colKey = Math.round((x - originX) / r); // 貼牆那欄 = 0，往外每隔半徑遞增
        let col = columns.get(colKey);
        if (!col) { col = { x, ys: [] }; columns.set(colKey, col); }
        col.ys.push(y);
      }
    });
    y -= rowPitch;
    rowIndex++;
  }

  // 欄的順序：colKey 由小到大＝從貼牆那欄往另一側走；欄內由下往上（y
  // 較大、離槽底較近的先）——這樣疊到一半被 count 截斷時，缺口會出現
  // 在「還沒輪到的欄」，而不是每欄都疊一點、整齊切齊在同一個高度。
  const slots = [];
  Array.from(columns.keys()).sort((a, b) => a - b).forEach(key => {
    const col = columns.get(key);
    col.ys.sort((a, b) => b - a);
    col.ys.forEach(cy => slots.push({ x: col.x, y: cy }));
  });

  result.maxCapacity = slots.length;
  const n = Math.min(requestedCount, slots.length);
  result.placed = slots.slice(0, n).map(p => ({ x: p.x, y: p.y, d: diameter }));
  result.placedCount = result.placed.length;
  return result;
}

/**
 * hexLatticePack 的「沿牆版」：hexLatticePack 本身只會貼「x 較小」那一
 * 條垂直線——槽壁是斜的時候，垂直線只在格點原點那一排真正碰到牆，離
 * 那排越遠，垂直線跟斜牆的實際距離就越大，貼牆只是局部現象。這個函
 * 式改成先把整個多邊形轉進一個「跟著牆的方向走」的局部座標系（s=沿
 * 牆方向、從槽底角開始；t=離牆的垂直距離，貼牆=0），t 對應
 * hexLatticePack 原本的 x（欄＝固定 t＝跟牆平行的一整條，不是垂直牆
 * 的一條）、s 對應 hexLatticePack 原本的 y（同一欄內沿牆方向由槽底角
 * 往槽口排過去），直接重用同一套密排／分欄／排序邏輯，算完再把結果
 * 轉換回原本的座標——這樣每一欄都是跟牆平行、整條貼齊，不是只有一點。
 *
 * 牆的方向：取「多邊形最底那條邊的最小x端點」當槽底角 A、「最頂那條邊
 * 的最小x端點」當槽口端點 B，A→B 的方向視為牆的方向——適用於這個工具
 * 產生的梯形／自訂頂點槽型（上下緣接近水平、左右兩側是直線斜邊的情
 * 況）。如果最頂/最底緣找不到明確端點（退化形狀），直接退回原本
 * hexLatticePack 的垂直版本。
 * @param {Array<{x,y}>} points 槽型頂點（mm，已經是內縮＋裁掉喉部後的繞線窗）
 * @param {number} diameter 線材外徑（mm，含漆膜）
 * @param {number} [count] 要擺的線材總數；省略或 Infinity 時回傳「這個槽能塞下的全部格點」
 * @returns {{placed:Array<{x,y,d}>, placedCount:number, requestedCount:number, maxCapacity:number}}
 */
function hexLatticePackAlongWall(points, diameter, count) {
  const bbox = polygonBBox(points);
  const bottomPts = points.filter(p => Math.abs(p.y - bbox.maxY) < 1e-6);
  const topPts = points.filter(p => Math.abs(p.y - bbox.minY) < 1e-6);
  if (!bottomPts.length || !topPts.length) return hexLatticePack(points, diameter, count);

  const A = bottomPts.reduce((m, p) => (p.x < m.x ? p : m), bottomPts[0]);
  const B = topPts.reduce((m, p) => (p.x < m.x ? p : m), topPts[0]);
  let ux = B.x - A.x, uy = B.y - A.y;
  const wallLen = Math.hypot(ux, uy);
  if (wallLen < 1e-9) return hexLatticePack(points, diameter, count); // 退化（上下緣端點重合），退回垂直版

  ux /= wallLen; uy /= wallLen;
  let nx = -uy, ny = ux; // 牆方向的法向量，兩個候選，用重心判斷哪個朝內
  const n = points.length;
  const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }), { x: 0, y: 0 });
  if (nx * (centroid.x - A.x) + ny * (centroid.y - A.y) < 0) { nx = -nx; ny = -ny; }

  // 轉到局部座標：local.x = t（離牆的垂直距離，貼牆=0，往內遞增——
  // hexLatticePack 的「欄」是固定x分組，這樣欄才會是「固定離牆距離」
  // ＝跟牆平行的一整條，不是垂直牆的一條）；local.y = -s（s=沿牆方向、
  // A為0，取負號讓 s=0（槽底角A）對應 local.y=0=hexLatticePack 原本
  // 「從 bbox.maxY 開始掃」的起點，往 B（槽口方向）掃是 local.y 遞減，
  // 對應 s 遞增，這樣每一欄內部才會是「從槽底角A開始、往槽口方向疊」。
  const localPts = points.map(p => {
    const dx = p.x - A.x, dy = p.y - A.y;
    const s = dx * ux + dy * uy;
    const t = dx * nx + dy * ny;
    return { x: t, y: -s };
  });

  const localResult = hexLatticePack(localPts, diameter, count);

  // 轉回原本座標：local.x=t、local.y=-s → s=-local.y
  const placed = localResult.placed.map(p => {
    const t = p.x, s = -p.y;
    return { x: A.x + s * ux + t * nx, y: A.y + s * uy + t * ny, d: p.d };
  });

  return {
    placed,
    placedCount: localResult.placedCount,
    requestedCount: localResult.requestedCount,
    maxCapacity: localResult.maxCapacity,
  };
}
