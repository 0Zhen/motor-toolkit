'use strict';
/* ══════════════════════════════════════════════════════════
   Slot Packing Viewer — app.js
   state、事件綁定、頂點表格渲染、SVG 繪製、i18n 字典。
   ══════════════════════════════════════════════════════════ */

var MT_I18N = {
  shapeTitle:   { en: 'Slot Shape', zh: '槽型' },
  tabParam:     { en: 'Parametric', zh: '參數化' },
  tabCustom:    { en: 'Custom points', zh: '自訂頂點' },
  slotType:     { en: 'Slot type', zh: '槽型' },
  slotTypeTrap: { en: 'Simple trapezoid', zh: '簡易梯形' },
  statorDsi:    { en: 'Stator inner dia. Dsi [mm]', zh: '定子內徑 Dsi [mm]' },
  dsiHint:      { en: 'The slot opening follows the stator bore (an arc concentric with the air gap). Leave Dsi blank for a straight opening.',
                  zh: '槽口沿定子內徑畫成圓弧（跟氣隙同心）。Dsi 留空就是直線槽口。' },
  slotTypeHint1:{ en: 'Sloped shoulder (Hs1) from Bs0 to Bs1, body Bs1 → Bs2 over Hs2, flat bottom with corner radius Rs.',
                  zh: '槽口 Bs0 經斜肩（Hs1）展開到 Bs1，槽身 Bs1 → Bs2（深 Hs2），平底、兩角圓角 Rs。' },
  slotTypeHint2:{ en: 'Open slot (no Bs0): the opening is Bs1 wide; Hs1 is the wedge notch (its depth is drawn as Hs1/2, illustrative only — it sits inside the no-wind depth). Body Bs1 → Bs2 over Hs2, flat bottom.',
                  zh: '開口槽（沒有 Bs0）：開口寬＝Bs1；Hs1 是放槽楔的 V 形凹口（凹口深度圖上沒標，畫成 Hs1/2 只是示意，而且在不繞線區內）。槽身 Bs1 → Bs2（深 Hs2），平底。' },
  slotTypeHint3:{ en: 'Flat step from Bs0 out to Bs1, then a straight Bs1-wide section of height Hs1, body Bs1 → Bs2 over Hs2, flat bottom with corner radius Rs.',
                  zh: '槽口 Bs0 以水平台階展開到 Bs1，接一段寬 Bs1、高 Hs1 的直段，槽身 Bs1 → Bs2（深 Hs2），平底、兩角圓角 Rs。' },
  slotTypeHint4:{ en: 'Sloped shoulder (Hs1), body Bs1 → Bs2 over Hs2, then a semicircular bottom of diameter Bs2 below the Bs2 line.',
                  zh: '斜肩（Hs1），槽身 Bs1 → Bs2（深 Hs2），Bs2 那條線以下接直徑 Bs2 的半圓槽底。' },
  slotTypeHint5:{ en: 'Sloped shoulder (Hs1), body Bs1 → Bs2 over Hs2 (to the Bs2 chord), then an arc bottom concentric with the stator through both Bs2 ends — its radius follows from Dsi (inner rotor) or Dso (outer rotor). On an outer rotor that arc is the yoke circle R_y and bulges into the slot.',
                  zh: '斜肩（Hs1），槽身 Bs1 → Bs2（Hs2 量到 Bs2 弦），之後是通過 Bs2 兩端、跟定子同心的圓弧槽底——半徑由 Dsi（內轉）或 Dso（外轉）算出。外轉子的這段圓弧就是軛部圓 R_y，往槽內凸。' },
  slotTypeHinttrap:{ en: 'The original simple shape: a straight opening throat, a flat step out to the body top width, then a trapezoid to a flat bottom.',
                  zh: '原本的簡易槽型：直的開口喉，水平台階展開到本體上寬，再以梯形接到平底。' },
  errSlotParams:{ en: 'Check the slot dimensions — widths and Hs2 must be greater than 0 (Dsi too for type 5).',
                  zh: '請檢查槽型尺寸——寬度與 Hs2 都必須大於 0（槽型 5 的 Dsi 也是）。' },
  openWidth:    { en: 'Opening width [mm]', zh: '開口寬 [mm]' },
  openHeight:   { en: 'Opening height [mm]', zh: '開口高 [mm]' },
  topWidth:     { en: 'Body top width [mm]', zh: '本體上寬 [mm]' },
  bottomWidth:  { en: 'Bottom width [mm]', zh: '下寬（槽底）[mm]' },
  slotDepth:    { en: 'Depth [mm]', zh: '槽深 [mm]' },
  generateBtn:  { en: 'Generate points (overwrites below)', zh: '產生頂點（覆蓋下方表格）' },
  paramHint:    {
    en: 'Symmetric slot; y=0 is the opening (air-gap side) and y grows toward the slot bottom. Types 1–5 use the same Bs/Hs/Rs names as Ansys RMxprt stator slots, so values can be copied straight from Maxwell. Generate writes the outline into the vertex table below (arcs become short straight segments) — switch to Custom points to keep editing it.',
    zh: '槽型左右對稱；y=0 是槽口（氣隙側），y 往槽底增加。槽型 1–5 的 Bs/Hs/Rs 參數名稱跟 Ansys RMxprt 定子槽一致，可以直接照 Maxwell 的數值填。按「產生頂點」會把輪廓寫進下方頂點表格（圓弧拆成短直線段），切到「自訂頂點」可以接著修改。',
  },
  customHint:   {
    en: 'Start from scratch, or switch to Parametric, generate a trapezoid, then come back here — every point is editable either way. You only edit the left half; the right half mirrors it automatically (slots are symmetric left-right).',
    zh: '可以從空白開始，或先切到參數化產生梯形再回來這裡繼續編輯——不管哪種方式，每個頂點都可以修改。只需要編輯左半邊，右半邊會自動依Y軸鏡射產生（槽型左右對稱）。',
  },
  verticesTitle:{ en: 'Vertices', zh: '頂點' },
  colX:         { en: 'X [mm]', zh: 'X [mm]' },
  colY:         { en: 'Y [mm]', zh: 'Y [mm]' },
  colRTip:      { en: 'Arc radius from this point to the next (blank = straight line)', zh: '這一點到下一點的圓弧半徑（空白＝直線）' },
  arcHint:      {
    en: 'R: leave blank for a straight line to the next point, or enter an arc radius — positive bulges outward (into the iron), negative bulges inward. On the last point, R is the slot bottom arc across the centre line (e.g. Bs2/2 for a semicircle).',
    zh: 'R：空白＝直線連到下一點；填半徑就改成圓弧——正值往槽外（鐵芯那側）凸，負值往槽內凹。最後一點的 R 是跨過中心線的槽底圓弧（例如半圓底就填 Bs2/2）。',
  },
  arcErr:       { en: 'Point #{i}: R must be at least {min} mm to reach the next point — drawn straight for now.',
                  zh: '第 {i} 點：R 至少要 {min} mm 才連得到下一點，目前先畫成直線。' },
  addPointBtn:  { en: '+ Add point', zh: '+ 新增頂點' },
  undoBtn:      { en: '↶ Undo', zh: '↶ 復原' },
  vertexHint:   {
    en: 'This lists the left half only, traced from the opening (top) down to the bottom — the right half is generated automatically by mirroring across the Y axis, and isn’t listed separately. Drag the labeled points on the drawing, or edit the numbers here. No self-intersection check — keep the half-outline simple (no crossing).',
    zh: '這裡只列左半邊的頂點，從槽口（上）往槽底（下）依序排列——右半邊會自動依Y軸鏡射產生，不會另外列出來。可以直接在圖上拖曳編號的點，或在這裡改數字。沒有自我相交檢查，請確保左半邊這條線本身不要交叉。',
  },
  wireTitle:    { en: 'Wire / Turns', zh: '線材 / 匝數' },
  bareDia:      { en: 'Bare copper dia. [mm]', zh: '裸銅徑 [mm]' },
  enamelThk:    { en: 'Enamel thk., one side [mm]', zh: '漆膜厚度（單邊）[mm]' },
  turnsPerSlot: { en: 'Turns / slot', zh: '每槽匝數' },
  coilsPerSlot: { en: 'Coils / slot', zh: '每槽線圈數' },
  strandsPerTurn:{ en: 'Strands / turn', zh: '股數/匝' },
  coilsSplitHint:{
    en: '2 or more: the winding window splits into a left and a right coil side, each independently packed (double-layer winding). 1: the whole window is packed as one — doesn’t decide anything about the total wire count, which is still turns × coils × strands.',
    zh: '2 以上：繞線窗分成左右兩個線圈邊，各自獨立密排（雙層繞組）。1：整個繞線窗當一池子密排——這個欄位不影響線材總數，總數還是匝數×線圈數×股數。',
  },
  needleWidth:  { en: 'Needle channel width [mm]', zh: '導針通道寬度 [mm]' },
  needleWidthHint:{
    en: 'Gap reserved between the two coil sides (Coils/slot ≥ 2 only) — separate from liner thickness, since this is the phase-separator / needle-insertion clearance in the middle of the slot, not insulation against the slot wall. Shown below as a dashed rectangle.',
    zh: '雙層繞組（每槽線圈數≥2）兩個線圈邊之間保留的間隙——跟liner厚度是分開的，因為這是繞線窗正中間的相間絕緣/導針通道空間，不是貼槽壁的絕緣。下方畫面用藍色虛線矩形標示。',
  },
  needleClearance: { en: 'Needle clearance [mm]', zh: '導針安全距離 [mm]' },
  needleClearanceHint: {
    en: 'Safety margin between the wires and each side edge of the needle channel (Coils/slot ≥ 2 only): the gap between the two coil sides becomes needle width + 2 × clearance. Shown as dashed lines when > 0.',
    zh: '線材與導針通道兩側邊之間的安全裕度（每槽線圈數≥2 才有作用）：兩個線圈邊之間的實際間隙變成「導針寬度 + 2 × 安全距離」。大於 0 時畫面以虛線標示。',
  },
  linerThickness:{ en: 'Liner thickness [mm]', zh: 'Liner 厚度 [mm]' },
  windStartY:   { en: 'No-wind depth (opening) [mm]', zh: '不繞線深度（開口）[mm]' },
  windStartHint:{
    en: 'The opening throat is too narrow for wire — auto-filled from Opening height when you Generate, but editable (e.g. for a custom shape with no formal throat).',
    zh: '開口喉太窄塞不了線——按 Generate 時會自動帶入「開口高」，也可以自己改（例如自訂頂點的槽型沒有正式的開口喉概念時）。',
  },
  wireHint:     {
    en: 'The liner is modeled as a real inward offset of the slot outline (shown in green below), not just a number subtracted from the fill % — turns are packed inside that offset shape.',
    zh: 'Liner 是真的把槽型輪廓向內偏移出來的幾何（下方綠色區域），不是從槽滿率扣一個數字而已——線材是塞在這個內縮後的區域裡。',
  },
  checkDcrBtn:  { en: 'Check DCR with these turns →', zh: '用這組匝數去DCR計算機確認電阻 →' },
  toolHint:     {
    en: '💡 Regular layers (default): each coil side is wound layer by layer from its outer wall — turn 1 at the slot bottom, layer 1 toward the opening, layer 2 back down, and so on; the thin line follows the winding order. Settling simulation: each wire drops in and rests against the wall or the wires already placed. Both are geometric idealizations — no wire tension, friction or enamel deformation.',
    zh: '💡 規則往返（預設）：每個線圈邊從外側槽壁一層一層往內繞——第 1 匝在槽底，第 1 層往槽口、第 2 層繞回槽底，依此往返；細線標出繞線順序。沉降模擬：每根線掉進去、靠著槽壁或已放好的線停住。兩種都是幾何上的理想化，沒有算線材張力、摩擦或漆膜變形。',
  },
  statsTitle:   { en: 'Stats', zh: '統計' },
  legendLam:    { en: 'Lamination', zh: '鐵芯' },
  legendLiner:  { en: 'Liner (winding window)', zh: 'Liner（繞線窗）' },
  legendWire:   { en: 'Conductor', zh: '導線' },
  legendNeedle: { en: 'Needle channel', zh: '導針通道' },

  outSlotArea:   { en: 'Slot area (outer)', zh: '槽面積（外緣）' },
  outWindingArea:{ en: 'Winding area (after liner)', zh: '繞線窗面積（liner內縮後）' },
  outWireOd:     { en: 'Wire OD', zh: '線材外徑（OD）' },
  outCount:      { en: 'Wire count', zh: '線材總數' },
  outFillArea:   { en: 'Fill % (area-based)', zh: '槽滿率 %（面積法）' },
  outPacked:     { en: 'Wires actually fit', zh: '實際容納線材數' },
  outMaxCapacity:{ en: 'Max capacity (this wire size)', zh: '最大容量（該線徑上限）' },
  outMaxFillArea:{ en: 'Fill % at max capacity', zh: '滿載時槽滿率 %' },
  packedAll:     { en: 'all placed', zh: '全部放得下' },
  packedPartial: { en: 'this slot can’t physically fit this many at this wire size', zh: '這個線徑下，這個槽塞不下這麼多' },
  applyMaxBtn:   { en: 'Fill to max', zh: '填滿到最大容量' },
  findWireBtn:   { en: 'Max wire dia. for these turns', zh: '依匝數回推最大線徑' },
  findWireHint:  {
    en: 'Keeps the slot shape and turns × coils × strands fixed, tries standard bare diameters in 0.05 mm steps (enamel thickness held fixed) and applies the largest one where every wire fits.',
    zh: '槽型與匝數 × 線圈數 × 股數固定不變，以標準線徑 0.05 mm 為一格試裸銅徑（漆膜厚度維持不變），套用能把全部線材放進去的最大值。',
  },
  findWireResult: {
    en: 'Largest bare dia. that fits {n} wires: {d} mm (OD {od} mm, fill {f}%). Applied — was {prev} mm.',
    zh: '放得下 {n} 根的最大裸銅徑：{d} mm（外徑 {od} mm，槽滿率 {f}%）。已套用，原本 {prev} mm。',
  },
  findWireNone:  {
    en: 'No standard bare diameter down to 0.05 mm fits {n} wires in this slot.',
    zh: '裸銅徑降到 0.05 mm 也放不下 {n} 根線材。',
  },
  packMode:      { en: 'Winding layout', zh: '排線方式' },
  packModeLayer: { en: 'Regular layers (back and forth)', zh: '規則往返（層繞）' },
  packModeSettle:{ en: 'Settling simulation', zh: '沉降模擬' },
  packModeHintlayer: {
    en: 'Each coil side is wound in layers parallel to its outer slot wall, each layer nested half a pitch into the one before. Turn 1 starts at the slot bottom and layer 1 runs toward the opening, layer 2 back toward the bottom, and so on. Rules: a layer change may jump at most 3 wire pitches, and the number of layers used must be even.',
    zh: '每個線圈邊從外側槽壁開始一層一層往內繞，層平行於槽壁、每層錯開半個節距嵌進前一層。第 1 匝從槽底開始，第 1 層往槽口、第 2 層往回到槽底，依此往返。限制：換層跳距不超過 3 個導線節距，使用的層數必須是偶數。',
  },
  packModeHintsettle: {
    en: 'Each wire drops in and rests against the wall or the wires already placed — the densest free packing, but no winding order rules.',
    zh: '每根線材掉進去、靠著槽壁或已放好的線材停住——最密的自由堆疊，不考慮繞線順序的限制。',
  },
  searchFix:     { en: 'Search keeps fixed', zh: '搜尋時固定' },
  searchFixWire: { en: 'Wire diameter', zh: '線徑' },
  searchFixTurns:{ en: 'Turns', zh: '匝數' },
  searchBtn:     { en: 'Find highest slot fill', zh: '搜尋最高槽滿率' },
  searchHint:    {
    en: 'Wire diameter fixed: finds the most turns that still fit. Turns fixed: tries standard bare diameters in 0.05 mm steps and keeps the largest that fits. In Regular layers, every rule must hold (first turn at the bottom, even layer count, layer jumps ≤ 3 pitches).',
    zh: '固定線徑：找出還放得下的最多匝數。固定匝數：以標準線徑 0.05 mm 一格試裸銅徑，取放得下的最大值。規則往返模式下，所有限制都必須成立（第 1 匝在槽底、層數為偶數、換層跳距 ≤ 3 節距）。',
  },
  searchResultWire: {
    en: 'Bare dia. {d} mm fixed: at most {t} turns ({n} wires), fill {f}%. Applied — was {prev} turns.',
    zh: '固定裸銅徑 {d} mm：最多 {t} 匝（{n} 根），槽滿率 {f}%。已套用，原本 {prev} 匝。',
  },
  searchNoneWire: { en: 'Not even 1 turn fits at this wire diameter.', zh: '這個線徑連 1 匝都放不下。' },
  outLayers:     { en: 'Layers used', zh: '排線層數' },
  outLayersTip:  {
    en: 'Layers actually used per coil side (must be even, so both leads come out at the slot bottom).',
    zh: '每個線圈邊實際用到的層數（必須是偶數，進出線才會都在槽底那端）。',
  },
  outJump:       { en: 'Max layer jump', zh: '最大換層跳距' },
  outJumpTip:    {
    en: 'Largest centre distance between the last wire of a layer and the first wire of the next, in wire pitches (wire OD). Limit: 3.',
    zh: '上一層最後一根到下一層第一根的最大中心距，以導線節距（外徑）為單位。上限 3。',
  },
  pitchUnit:     { en: 'pitch', zh: '節距' },
  sideL:         { en: 'L', zh: '左' },
  sideR:         { en: 'R', zh: '右' },
  totalLayers:   { en: 'total', zh: '合計' },
  slotCount:     { en: 'Slots Q', zh: '槽數 Q' },
  statorDso:     { en: 'Stator outer dia. Dso [mm]', zh: '定子外徑 Dso [mm]' },
  viewOrient:    { en: 'View', zh: '顯示方向' },
  viewReal:      { en: 'Real (opening down)', zh: '真實方向（槽口朝下）' },
  viewUp:        { en: 'Opening up', zh: '槽口朝上' },
  viewHint:      {
    en: 'Real: the slot as it sits in the stator, opening toward the rotor (down for an inner rotor). Opening up: flipped so the opening is on top. The stator around the slot is drawn when the opening follows Dsi / Dso and Q is set. Display only — calculations are not affected.',
    zh: '真實方向：槽在定子裡的實際方向，槽口朝轉子（內轉子朝下）。槽口朝上：上下翻轉，槽口在上。槽口沿 Dsi／Dso 而且有填 Q 時，會畫出槽周圍的定子。只影響顯示，不影響任何計算。',
  },
  pitchWarn:     { en: 'The slot is wider than one slot pitch at Q = {q} — its sides cross the neighbouring tooth centre lines. Check the slot count.',
                   zh: 'Q = {q} 時，槽比一個槽距還寬——槽的兩側超過相鄰齒的中心線。請確認槽數。' },
  exportDxfBtn:  { en: 'Export DXF (line drawing)', zh: '匯出 DXF 線圖' },
  dxfSaved:      { en: 'Exported {name} (mm, stator centre at 0,0).', zh: '已匯出 {name}（單位 mm，定子中心在原點）。' },
  dxfNone:       { en: 'Fix the slot inputs first — nothing to export.', zh: '請先修正槽型輸入，目前沒有可以匯出的圖。' },
  openingArcR:   { en: 'Opening arc R [mm]', zh: '槽口圓弧 R [mm]' },
  arcErrOpening: { en: 'Opening arc: R must be at least {min} mm — drawn straight for now.', zh: '槽口圓弧：R 至少要 {min} mm，目前先畫成直線。' },
  errSlotWiden:  { en: 'This slot type must widen from the opening to the bottom — make Bs2 larger than Bs1.',
                   zh: '這個槽型必須由槽口往槽底展開——Bs2 要大於 Bs1。' },
  findWireNoSlot: { en: 'Fix the slot / wire inputs first (see Stats).', zh: '請先修正槽型或線材輸入（見右側統計）。' },
  errFewPoints:  { en: 'Need at least 3 points to form a shape.', zh: '至少需要3個頂點才能構成形狀。' },
  errBadArea:    { en: 'These points don’t enclose a usable area — check the vertex order/values.', zh: '這些頂點圍不出有效面積，請檢查頂點順序/數值。' },
  errBadWire:    { en: 'Wire diameter and count must be greater than 0.', zh: '線徑與數量都必須大於0。' },
  errNeedleTooWide: {
    en: 'Needle channel width is wider than the slot opening itself — the needle couldn’t fit through. Reduce the needle channel width or widen the opening.',
    zh: '導針通道寬度比槽開口本身還寬，導針根本穿不進去。請縮小導針通道寬度，或把開口放寬。',
  },
  errLinerTooThick: {
    en: 'Liner thickness is too large for this slot shape (it would cross itself, e.g. at the opening throat). Reduce the liner thickness or widen the shape there.',
    zh: 'Liner 厚度對這個槽型來說太厚了（內縮後會在某處自我交叉，例如開口喉部太窄）。請縮小 liner 厚度，或把該處的槽型放寬。',
  },

  fileTitle:     { en: 'Save / Open', zh: '儲存／開啟' },
  saveFileBtn:   { en: 'Save to file', zh: '存成檔案' },
  openFileBtn:   { en: 'Open file…', zh: '開啟檔案…' },
  fileHint: {
    en: 'Saves the slot shape (every vertex), the parametric inputs and all wire / turns settings to a .json file you can keep with the project or send to a colleague. Opening it restores everything; Undo brings back the previous vertices.',
    zh: '把槽型（所有頂點）、參數化輸入和所有線材／匝數設定存成一個 .json 檔，可以放在專案資料夾或寄給同事。開啟後會全部還原；按「復原」可以回到開檔前的頂點。',
  },
  fileSaved:     { en: 'Saved {name}.', zh: '已存成 {name}。' },
  fileLoaded:    { en: 'Opened {name}.', zh: '已開啟 {name}。' },
  fileBad:       { en: '{name} is not a Slot Packing file (or it is damaged).', zh: '{name} 不是槽內排列工具的檔案（或檔案已損壞）。' },

  tipSlotArea: {
    en: 'Shoelace formula on the outer vertex list — the slot’s own cut area, before the liner.',
    zh: '用槽型外緣頂點算的鞋帶公式（Shoelace formula）——liner內縮之前，槽本身的切割面積。',
  },
  tipWindingArea: {
    en: 'Area of the outer slot outline offset inward by the liner thickness, with the opening throat (no-wind depth) excluded — the actual usable winding window.',
    zh: '槽型外緣向內偏移liner厚度之後、再扣掉開口喉（不繞線深度）的面積——實際可以拿來繞線的窗口。',
  },
  outWireOdTip:  {
    en: 'Wire OD = bare copper dia. + 2 × enamel thickness (one side).',
    zh: '線材外徑 = 裸銅徑 + 2 × 漆膜厚度（單邊）。',
  },
  outFillAreaTip:{
    en: 'Fill % = (wire count × circle area) / winding area (after liner) × 100 — independent of how the row-packing below actually arranges them.',
    zh: '槽滿率 % = (線材總數 × 單根截面積) / 繞線窗面積（liner內縮後） × 100 — 跟下面的排列演算法擺不擺得下無關，純粹面積比。',
  },
  outPackedTip:  {
    en: 'How many wires actually got placed by the settling simulation, out of the wire count above (turns × coils × strands). Equals the wire count when everything fits; otherwise it’s capped at Max capacity below — the slot genuinely can’t hold more at this wire diameter, so this number and Max capacity end up the same.',
    zh: '照沉降模擬實際擺得進去幾根，對照上面的線材總數（匝數×線圈數×股數）。全部放得下時兩個數字會一樣；放不下時會被限制在下面的「最大容量」——這個槽在這個線徑下真的塞不下更多了，所以這兩個數字此時會相同，不是算錯。',
  },
  tipMaxCapacity: {
    en: 'The same settling simulation run with no limit on count — the absolute ceiling for this exact wire diameter in this slot (after liner, opening excluded), independent of whatever Turns/slot you’ve set. Use "Fill to max" above to set Turns/slot to reach this number exactly.',
    zh: '用同一套沉降模擬、不限制數量跑出來的結果——這個槽（扣掉liner跟開口喉之後）在這個線徑下的絕對上限，跟你目前設定的「每槽匝數」無關。上面的「填滿到最大容量」按鈕可以直接把匝數設成剛好達到這個數字。',
  },
  outMaxFillAreaTip: {
    en: 'Fill % if the slot were packed to its max capacity (above) instead of your requested wire count — the practical ceiling for this wire size. Hexagonal packing on an infinite plane tops out around 90.7%, but a small or tapered slot loses more to boundary effects (circles near the wall can’t nest as tightly), so the real number here is usually well below that.',
    zh: '如果照上面的「最大容量」塞滿（而不是你設定的線材總數）會是多少槽滿率——這個線徑的實際上限。六方密排在無限平面上的理論密度約90.7%，但槽越小、越有taper，邊界效應（貼壁的圓沒辦法跟內部排得一樣緊）損失就越多，這裡算出來的實際數字通常會明顯低於那個理論值。',
  },

  /* ── 內轉／外轉 ── */
  rotorTitle:    { en: 'Motor type', zh: '馬達型式' },
  rotorInner:    { en: 'Inner rotor', zh: '內轉子' },
  rotorOuter:    { en: 'Outer rotor', zh: '外轉子' },
  iRotor: {
    en: 'Inner rotor: the slots open toward the bore and the rotor turns inside the stator.\nOuter rotor: the slots open outward, the yoke is on the inside and the magnets turn around the outside (fans, drones, hub motors). The slot narrows toward the yoke, so Bs1 > Bs2.\n\nEach type keeps its own set of inputs — switching back restores them. The outer-rotor defaults are set up like the default example of the siderpan resistance calculator (same tooth, wire and winding), so the two tools can be cross-checked. Add #outer to the address to open straight on the outer rotor.',
    zh: '內轉子：槽口朝定子內孔，轉子在定子裡面轉。\n外轉子：槽口朝外、軛部在內側，磁鐵在外圈轉（風扇、無人機、輪轂馬達）。槽往軛部收窄，所以 Bs1 > Bs2。\n\n兩種各自保留一組輸入值，切回來會還原。外轉子的預設值照 siderpan 電阻計算的預設範例設定（同樣的齒、線材與繞組），可以拿兩個工具交叉比對。網址加 #outer 可以直接開外轉子。',
  },
  statorDsiOuter:{ en: 'Stator outer dia. Dso [mm]', zh: '定子外徑 Dso [mm]' },
  statorDiOuter: { en: 'Stator inner dia. Di [mm]', zh: '定子內徑 Di [mm]' },
  dsiHintOuter:  { en: 'The slot opening follows the stator outer diameter Dso (an arc concentric with the air gap, bulging outward). Leave Dso blank for a straight opening.',
                   zh: '槽口沿定子外徑 Dso 畫成圓弧（跟氣隙同心，往外凸）。Dso 留空就是直線槽口。' },
  errSlotNarrow: { en: 'An outer-rotor slot narrows from the opening toward the yoke — make Bs2 smaller than Bs1.',
                   zh: '外轉子的槽由槽口往軛部收窄——Bs2 要小於 Bs1。' },

  fitSlot:       { en: 'Fit slot', zh: '貼合槽' },
  fitStator:     { en: 'Slot pitch', zh: '整個槽距' },
  zoomHint:      { en: 'Scroll to zoom · drag to pan · double-click to reset', zh: '滾輪縮放 · 拖曳平移 · 雙擊還原' },

  /* ── 欄位說明（?）── */
  infoClose:     { en: 'Close', zh: '關閉' },
  iBs0:  { en: 'Slot opening width — the gap between the two tooth-shoe tips at the air gap. Same name as Ansys RMxprt.',
           zh: '槽口寬：兩個極靴尖端之間、氣隙那一側的開口寬度。名稱跟 Ansys RMxprt 一致。' },
  iHs0:  { en: 'Slot opening depth — height of the straight opening throat (the shoe-tip thickness at the opening). No wire goes in here.',
           zh: '槽口深：槽口直段的高度（槽口處極靴尖的厚度）。這裡不繞線。' },
  iHs1:  { en: 'Shoulder height — from the opening throat out to the body width Bs1: sloped in types 1, 4 and 5, a straight Bs1-wide section in type 3, the wedge notch in type 2. In types 1, 4 and 5 it is the underside of the tooth shoe.',
           zh: '肩部高：從槽口直段展開到槽身寬 Bs1 的那一段。槽型 1、4、5 是斜肩，3 是寬 Bs1 的直段，2 是槽楔凹口。槽型 1、4、5 的斜肩就是極靴下緣。' },
  iBs1:  { en: 'Slot width at the top of the body (shoe side).\nInner rotor: Bs1 < Bs2 — the slot widens toward the yoke.\nOuter rotor: Bs1 > Bs2 — the slot narrows toward the yoke.',
           zh: '槽身頂端（極靴側）的槽寬。\n內轉子：Bs1 < Bs2，槽往軛部展開。\n外轉子：Bs1 > Bs2，槽往軛部收窄。' },
  iBs2:  { en: 'Slot width at the bottom of the body (yoke side). See Bs1 for which one must be larger.',
           zh: '槽身底端（軛部側）的槽寬。哪一個要比較大請看 Bs1 的說明。' },
  iHs2:  { en: 'Body height, from the Bs1 line to the Bs2 line (type 5: to the Bs2 chord, before the arc bottom).',
           zh: '槽身高：從 Bs1 那條線到 Bs2 那條線（槽型 5 量到 Bs2 弦，不含圓弧槽底）。' },
  iRs0:  { en: 'Fillet radius where the opening throat meets the shoulder (the tooth-tip corner).',
           zh: '槽口直段與肩部交接處（齒尖那個角）的倒圓半徑。' },
  iRs:   { en: 'Fillet radius of the two bottom corners (types 1 and 3).', zh: '槽底兩個角的倒圓半徑（槽型 1、3）。' },
  iDsiInner: {
    en: 'Stator inner (bore) diameter. The opening is drawn as an arc of this circle, and it fixes where the stator centre is — needed for the stator drawing, type 5 and the automatic tooth width.',
    zh: '定子內徑（內孔）。槽口畫成這個圓上的圓弧，也決定定子中心的位置——定子圖、槽型 5 與自動齒寬都要用到。',
  },
  iDsiOuter: {
    en: 'Stator outer diameter — the circle through the tooth-shoe tips, facing the outer magnets. The opening is drawn as an arc of this circle, and it fixes where the stator centre is — needed for the stator drawing, type 5 (its bottom arc is the yoke circle R_y) and the automatic tooth width.',
    zh: '定子外徑：通過極靴外緣、面對外圈磁鐵的那個圓。槽口畫成這個圓上的圓弧，也決定定子中心的位置——定子圖、槽型 5（槽底圓弧就是軛部圓 R_y）與自動齒寬都要用到。',
  },
  iOpenWidth:  { en: 'Width of the straight opening throat.', zh: '直的開口喉寬度。' },
  iOpenHeight: { en: 'Height of the opening throat — also the default no-wind depth.', zh: '開口喉的高度，也是不繞線深度的預設值。' },
  iTopWidth:   { en: 'Slot width where the body starts, just below the throat.', zh: '槽身起點（開口喉下方）的槽寬。' },
  iBottomWidth:{ en: 'Slot width at the flat bottom.', zh: '平底處的槽寬。' },
  iDepth:      { en: 'Total slot depth, from the opening to the bottom.', zh: '槽的總深度，從槽口量到槽底。' },
  iSlots: {
    en: 'Number of stator slots Q. Sets the slot pitch for the stator drawing and the automatic tooth width, and is used to check Coils / phase (usually Q ÷ 3 for a double-layer concentrated winding).',
    zh: '定子槽數 Q。決定定子圖與自動齒寬用的槽距，也用來檢查每相線圈數（雙層集中繞通常是 Q ÷ 3）。',
  },
  iDsoInner: { en: 'Stator outer diameter — only for drawing the yoke around the slot. Blank draws a nominal yoke. Does not affect any calculation.',
               zh: '定子外徑，只用來畫槽周圍的軛部。留空就畫一段示意的軛部。不影響任何計算。' },
  iDsoOuter: { en: 'Stator inner diameter — the centre hole inside the yoke. Only for drawing; blank draws a nominal yoke. Does not affect any calculation.',
               zh: '定子內徑：軛部內側的中心孔。只用來畫圖，留空就畫一段示意的軛部。不影響任何計算。' },
  iOpeningR: {
    en: 'Radius of the opening arc between the two opening corners. Negative = concave into the slot (inner rotor, follows the bore: −Dsi/2). Positive = bulging outward (outer rotor, follows the outer diameter: +Dso/2). It also fixes where the stator centre is. Blank = straight opening.',
    zh: '兩個槽口角之間的槽口圓弧半徑。負值＝往槽內凹（內轉子，沿內徑：−Dsi/2）；正值＝往外凸（外轉子，沿外徑：+Dso/2）。也決定定子中心的位置。空白＝直線槽口。',
  },
  iWire: {
    en: 'Wire size, turns and how they are laid into the slot. The packing result also feeds the coil resistance: every wire’s distance from the tooth face sets its turn length.',
    zh: '線徑、匝數，以及線怎麼排進槽裡。排線結果也直接用在線圈電阻：每根導線離齒面多遠，決定它那一匝有多長。',
  },
  iBareDia: { en: 'Bare copper diameter d. Used for the copper cross-section A = π/4·d² in the resistance, and (plus enamel) for the packing.',
              zh: '裸銅徑 d。電阻用它算銅截面積 A = π/4·d²；加上漆膜就是排線用的外徑。' },
  iTurns: {
    en: 'Turns per coil N. With 2 coils/slot each coil side holds N turns; with 1 coil/slot the whole window holds N turns. Total wires in the slot = turns × coils × strands.',
    zh: '每個線圈的匝數 N。每槽 2 個線圈時，每個線圈邊各 N 匝；每槽 1 個線圈時，整個繞線窗 N 匝。槽內線材總數 = 匝數 × 線圈數 × 股數。',
  },
  iStrands: { en: 'Wires wound in parallel per turn (n_s). Each strand is placed and measured on its own; the resistance divides by n_s.',
              zh: '每匝並繞的股數 n_s。每一股都各自排、各自量長度；電阻除以 n_s。' },
  iLiner: {
    en: 'The liner is modeled as a real inward offset of the slot outline (shown in green), not just a number subtracted from the fill % — turns are packed inside that offset shape.\n\nThe same thickness is the insulation i around the tooth in the turn length (L′ = L + 2i, b′ = b + 2i), as in the siderpan calculator.',
    zh: 'Liner 是真的把槽型輪廓向內偏移出來的幾何（綠色區域），不是從槽滿率扣一個數字而已——線材是塞在這個內縮後的區域裡。\n\n同一個厚度也是匝長公式裡包在齒外的絕緣厚 i（L′ = L + 2i、b′ = b + 2i），跟 siderpan 電阻計算一樣。',
  },

  /* ── 線圈與電阻 ── */
  coilTitle:     { en: 'Coil & Resistance', zh: '線圈與電阻' },
  iCoil: {
    en: 'Mean length of turn (MLT) and winding resistance of the concentrated coil, following the method of the siderpan resistance calculator (verified against measurements on outer-rotor motors).\n\nThe only difference is where c comes from — each wire’s distance from the insulated tooth face. Here it is measured on the wires as they are actually packed in the slot, in whichever winding layout is selected.',
    zh: '集中繞線圈的平均匝長（MLT）與繞組電阻，計算方式比照 siderpan 電阻計算（已用外轉子馬達的實測驗證過）。\n\n唯一的差別是 c 的來源——每根導線中心離絕緣後齒面的距離。這裡用的是導線在槽內實際排出來的位置，跟著你選的排線方式。',
  },
  iCoilF: {
    en: 'L′ = L + 2i      b′ = b + 2i\nℓ = 2(L′−2r₀) + 2(b′−2r₀) + 2π(r₀ + c)\nMLT = mean ℓ of all wires in one coil\nR_coil = ρ·MLT·N / (A·n_s),  A = π/4·d²\nR_ph = [R_coil·coils/a + ρ·lead/(A·n_s)] / a\nY: R_LL = 2·R_ph     Δ: R_LL = ⅔·R_ph\nR(T) = R₂₀·(234.5 + T) / 254.5',
    zh: 'L′ = L + 2i      b′ = b + 2i\nℓ = 2(L′−2r₀) + 2(b′−2r₀) + 2π(r₀ + c)\nMLT = 一個線圈所有導線 ℓ 的平均\nR_coil = ρ·MLT·N / (A·n_s)，A = π/4·d²\nR_ph = [R_coil·線圈數/a + ρ·引出線/(A·n_s)] / a\nY：R_LL = 2·R_ph     Δ：R_LL = ⅔·R_ph\nR(T) = R₂₀·(234.5 + T) / 254.5',
  },
  stackLength:   { en: 'Stack length L [mm]', zh: '疊厚 L [mm]' },
  iStack: { en: 'Stack length L — axial length of the lamination stack (the tooth length in the side view). The two long straight sides of every turn run along it.',
            zh: '疊厚 L：矽鋼片疊起來的軸向長度（側視圖裡齒的長度）。每一匝的兩條長直邊沿著它走。' },
  toothWidth:    { en: 'Tooth width b [mm]', zh: '齒寬 b [mm]' },
  iToothW: {
    en: 'Tooth width b (steel, without insulation). Leave blank to derive it from the slot: twice the distance from the slot wall to the tooth centre line, at the middle of the wall. That needs Q and an opening that follows Dsi (inner) / Dso (outer). For a trapezoid or a custom shape without an opening arc, enter it.',
    zh: '齒寬 b（鐵芯本身，不含絕緣）。留空就從槽型推算：槽壁中點到齒中心線距離的兩倍。這需要槽數 Q，以及沿 Dsi（內轉）/ Dso（外轉）畫的槽口圓弧；簡易梯形或沒有槽口圓弧的自訂形狀請自己填。',
  },
  sideCorner:    { en: 'Side-view corner r₀ [mm]', zh: '側視轉角 r₀ [mm]' },
  iR0: { en: 'Corner radius of the insulated tooth seen from the side (the bobbin / end-insulation corner). Every turn rounds that corner at radius r₀ + c. Limited to half of L′ or b′.',
         zh: '從側面看、包好絕緣的齒的轉角半徑（線架／端部絕緣的圓角）。每一匝都以 r₀ + c 的半徑繞過這個角。上限是 L′ 或 b′ 的一半。' },
  coilsPerPhase: { en: 'Coils / phase', zh: '每相線圈數' },
  iCpp: { en: 'Coils per phase, all paths together. Double-layer concentrated winding: Q ÷ 3. Single layer (1 coil/slot): Q ÷ 6. Must be divisible by the parallel paths a.',
          zh: '每相線圈數（所有並聯路合計）。雙層集中繞：Q ÷ 3；單層（每槽 1 個線圈）：Q ÷ 6。必須能被並聯路數 a 整除。' },
  parallelPaths: { en: 'Parallel paths a', zh: '並聯路數 a' },
  iPaths: { en: 'Parallel paths per phase a. Each path has coils/a coils in series plus its own lead; the a paths are then connected in parallel.',
            zh: '每相並聯路數 a。每一路是「線圈數/a」個線圈串聯，再加上自己的引出線；a 路再並聯起來。' },
  leadLength:    { en: 'Lead length / path [mm]', zh: '引出線長／路 [mm]' },
  iLead: { en: 'Lead wire per parallel path (from the coils to the terminal), in series with that path’s coils.',
           zh: '每一路並聯的引出線長度（從線圈到端子），跟那一路的線圈串聯。' },
  connection:    { en: 'Connection', zh: '接線方式' },
  connY:         { en: 'Y (star)', zh: 'Y 星形' },
  connD:         { en: 'Δ (delta)', zh: 'Δ 三角形' },
  iConn: { en: 'Y: line-to-line resistance R_LL = 2·R_ph.\nΔ: R_LL = ⅔·R_ph (one phase in parallel with the other two in series).',
           zh: 'Y：端子間電阻 R_LL = 2·R_ph。\nΔ：R_LL = ⅔·R_ph（一相與另外兩相串聯後並聯）。' },
  iRho: { en: 'Copper resistivity at 20 °C. Annealed copper (100 % IACS): 0.017241 Ω·mm²/m.',
          zh: '20 °C 的銅電阻率。退火銅（100 % IACS）：0.017241 Ω·mm²/m。' },
  refTemp:       { en: 'Reference temp. [°C]', zh: '參考溫度 [°C]' },
  iTref: { en: 'Temperature at which R_LL and R_ph are shown — e.g. the room temperature of your measurement. Corrected from 20 °C with copper’s 234.5 °C constant.',
           zh: 'R_LL、R_ph 顯示時的溫度，例如量測當下的室溫。以銅的 234.5 °C 常數從 20 °C 換算。' },
  opTemp:        { en: 'Operating temp. [°C]', zh: '工作溫度 [°C]' },
  iTop: { en: 'Winding temperature in operation, for the hot R_LL: R(T) = R₂₀·(234.5 + T)/254.5.',
          zh: '運轉時的繞組溫度，用來算熱態 R_LL：R(T) = R₂₀·(234.5 + T)/254.5。' },
  hUp:           { en: 'Height limit, top [mm]', zh: '上方高度限制 [mm]' },
  hDown:         { en: 'Height limit, bottom [mm]', zh: '下方高度限制 [mm]' },
  iHup: { en: 'Optional. Room above the top lamination end face for the end turns. The coil sticks out by i + t (insulation + coil build). Blank = no check.',
          zh: '選填。上端面以上留給端部線圈的空間。線圈伸出端面的高度是 i + t（絕緣厚 + 線圈厚）。空白＝不檢查。' },
  iHdn: { en: 'Optional. Room below the bottom lamination end face for the end turns (i + t). Blank = no check.',
          zh: '選填。下端面以下留給端部線圈的空間（i + t）。空白＝不檢查。' },

  /* ── 電阻結果 ── */
  resTitle:      { en: 'Coil Resistance', zh: '線圈電阻' },
  sideTitle:     { en: 'Side View (one coil)', zh: '側視圖（一個線圈）' },
  legendTooth:   { en: 'Tooth (L × b)', zh: '齒（L × b）' },
  legendIns:     { en: 'Insulation (L′ × b′)', zh: '絕緣（L′ × b′）' },
  legendCoil:    { en: 'Coil', zh: '線圈' },
  legendMean:    { en: 'Mean turn (MLT)', zh: '平均匝路徑（MLT）' },
  kRLL:          { en: 'R_LL', zh: '端子間 R_LL' },
  kRLLop:        { en: 'R_LL hot', zh: '工作溫度 R_LL' },
  kRph:          { en: 'R_ph', zh: '每相 R_ph' },
  kMlt:          { en: 'MLT', zh: '平均匝長 MLT' },
  kLen:          { en: 'Wire / coil', zh: '每線圈線長' },
  tipRLL:   { en: 'Line-to-line resistance at the reference temperature — what you measure between two terminals.',
              zh: '參考溫度下的端子間電阻，也就是兩個端子之間量到的值。' },
  tipRLLop: { en: 'R_LL at the operating temperature: R(T) = R₂₀·(234.5 + T)/254.5.', zh: '工作溫度下的 R_LL：R(T) = R₂₀·(234.5 + T)/254.5。' },
  tipRph:   { en: 'Phase resistance at the reference temperature: [R_coil·coils/a + R_lead] / a.', zh: '參考溫度下的相電阻：[R_coil·線圈數/a + R_引出線] / a。' },
  tipMlt:   { en: 'Mean length of turn: the average of ℓ = 2(L′−2r₀) + 2(b′−2r₀) + 2π(r₀ + c) over every wire of one coil, each at the position it is actually packed.',
              zh: '平均匝長：一個線圈每一根導線的 ℓ = 2(L′−2r₀) + 2(b′−2r₀) + 2π(r₀ + c) 取平均，c 用每根導線實際排到的位置。' },
  tipLen:   { en: 'Wire length of one coil, per strand: MLT × N.', zh: '一個線圈的線長（每股）：MLT × N。' },
  outNcoil:      { en: 'Turns per coil N', zh: '每線圈匝數 N' },
  tipNcoil: { en: 'Turns in one coil, and how many wires (turns × strands) the MLT is averaged over.', zh: '一個線圈的匝數，以及 MLT 是用幾根導線（匝數 × 股數）平均出來的。' },
  outToothW:     { en: 'Tooth width b', zh: '齒寬 b' },
  tipToothWOut: { en: 'Tooth width used: from the input, or derived from the slot (wall to tooth centre line × 2, mid-wall).',
                  zh: '計算用的齒寬：輸入值，或由槽型推算（槽壁中點到齒中心線距離 × 2）。' },
  autoTag:       { en: 'auto', zh: '自動' },
  outFrame:      { en: 'L′ × b′', zh: 'L′ × b′' },
  tipFrame: { en: 'Insulated tooth: L′ = L + 2i, b′ = b + 2i, with i = liner thickness. r₀ is the side-view corner actually used.',
              zh: '包絕緣後的齒：L′ = L + 2i、b′ = b + 2i，i = liner 厚度。r₀ 是實際採用的側視轉角。' },
  outC:          { en: 'c (wire centres)', zh: 'c（導線中心）' },
  tipC: { en: 'Distance c from the insulated tooth face to the wire centres — innermost to outermost wire.',
          zh: '絕緣後齒面到導線中心的距離 c，從最內側到最外側那根。' },
  outT:          { en: 'Coil build t', zh: '線圈厚 t' },
  tipT: { en: 'Coil build t = outermost c + wire OD/2 — the coil thickness measured from the insulation.',
          zh: '線圈厚 t = 最外側的 c + 導線外徑/2，從絕緣面量起的線圈厚度。' },
  outOverhang:   { en: 'End-turn overhang i + t', zh: '端部伸出 i + t' },
  tipOverhang: { en: 'How far the end turns stick out beyond each lamination end face: insulation i + coil build t.',
                 zh: '端部線圈伸出疊片端面的高度：絕緣厚 i + 線圈厚 t。' },
  outMltF:       { en: 'MLT, simple formula', zh: 'MLT 簡化公式' },
  tipMltF: { en: 'Quick estimate 2L′ + 2b′ + π·t, and how far it is from the per-wire MLT above.',
             zh: '簡化估算 2L′ + 2b′ + π·t，以及跟上面逐根計算的 MLT 差多少。' },
  outRcoil:      { en: 'R_coil @ 20 °C', zh: '線圈 R_coil @ 20 °C' },
  tipRcoil: { en: 'One coil at 20 °C: ρ·MLT·N / (A·n_s), A = π/4·d² (bare copper).', zh: '單一線圈 @ 20 °C：ρ·MLT·N / (A·n_s)，A = π/4·d²（裸銅）。' },
  outPhaseLen:   { en: 'Wire per phase', zh: '每相線長' },
  tipPhaseLen: { en: 'Wire per phase, per strand: MLT·N·coils + lead·a.', zh: '每相線長（每股）：MLT·N·線圈數 + 引出線·a。' },
  msgNoToothW:   { en: 'Enter the tooth width b — it can’t be derived here (needs Q and an opening arc that follows Dsi / Dso).',
                   zh: '請輸入齒寬 b——這裡推算不出來（需要槽數 Q，以及沿 Dsi／Dso 的槽口圓弧）。' },
  msgBadInput:   { en: 'Stack length, ρ, coils / phase and parallel paths must all be greater than 0.',
                   zh: '疊厚、ρ、每相線圈數與並聯路數都必須大於 0。' },
  msgNoWires:    { en: 'No wires placed — nothing to measure.', zh: '沒有排進任何導線，沒有東西可以量。' },
  msgPartial:    { en: 'Only {p} of {n} wires fit — MLT is the average of the wires that fit, and the resistance still uses N = {N}.',
                   zh: '{n} 根只排得下 {p} 根——MLT 是排得下的那些的平均，電阻仍以 N = {N} 計算。' },
  msgR0Clamp:    { en: 'r₀ is more than half of L′ or b′ — limited to {r} mm.', zh: 'r₀ 超過 L′ 或 b′ 的一半，已限制為 {r} mm。' },
  msgCppA:       { en: 'Coils / phase ({c}) must be divisible by the parallel paths a ({a}).', zh: '每相線圈數（{c}）必須能被並聯路數 a（{a}）整除。' },
  msgCppQ:       { en: 'With Q = {q} and {k} coil(s)/slot, a 3-phase concentrated winding usually has {e} coils per phase — you entered {c}.',
                   zh: 'Q = {q}、每槽 {k} 個線圈時，三相集中繞每相通常是 {e} 個線圈，目前輸入 {c}。' },
  msgToothTaper: { en: 'The tooth is not parallel: b runs {b1}–{b2} mm along the wall; the mid-wall value {b} mm is used.',
                   zh: '齒不是平行齒：沿槽壁 b 從 {b1} 到 {b2} mm，採用槽壁中點的 {b} mm。' },
  msgHOver:      { en: 'End turns stick out {oh} mm at the {side} (i + t) — {d} mm over the {h} mm limit.',
                   zh: '{side}伸出 {oh} mm（i + t），超過限制 {h} mm 達 {d} mm。' },
  msgHOk:        { en: 'End turns stick out {oh} mm at the {side}, within the {h} mm limit ({d} mm to spare).',
                   zh: '{side}伸出 {oh} mm，在限制 {h} mm 內，餘裕 {d} mm。' },
  sideTop:       { en: 'top', zh: '上方' },
  sideBottom:    { en: 'bottom', zh: '下方' },
};

(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };

var shapeMode = 'param';
var rotor = 'inner'; // 'inner' | 'outer'：決定槽口圓弧方向、定子中心在哪一側、欄位名稱與顯示方向
// 使用者只編輯左半邊（由槽口y=0往槽底方向排列），右半邊永遠是左半邊依
// Y軸（x=0）鏡射自動產生——槽型本來就是左右對稱的，編輯一半、另一半跟
// 著動，不用使用者自己維護兩份對稱的數字。vertices 是從 halfVertices
// 算出來的完整多邊形（左半+鏡射後倒序接回去的右半，形成封閉輪廓），
// 所有幾何計算（面積、liner、堆疊……）都只讀 vertices，不直接碰
// halfVertices；UI編輯（表格/新增/刪除/拖曳）只碰 halfVertices，改完
// 一定呼叫 syncVerticesFromHalf() 才讓 vertices 跟著更新。
var halfVertices = [];
var vertices = [];
var lastMaxCapacity = 0, lastCoils = 1, lastStrands = 1; // 給「自動填滿到最大容量」按鈕用
var lastPackable = null; // 給「依匝數回推線徑」用：目前有效的繞線窗與排列條件，computeAll 失敗時為 null
var findWireSig = null;  // 回推結果對應的條件；條件一改就把那行結果藏起來，避免顯示過期的答案
var findWireRender = null; // 重畫那行結果（切換語言時用）
var lastWindingArea = 0; // 給「去DCR計算機確認」按鈕用——DCR自己的槽面積欄位需要這個真實算出來的繞線窗面積，不能留它自己的預設值

/** 左半邊（依序從槽口排到槽底）鏡射回去接成完整封閉多邊形：左半原封
 *  不動，右半＝左半倒序＋x取負——這樣鏡射後的右半會從槽底往槽口接回
 *  去，整圈連起來才會是正確方向的簡單多邊形（不是兩段各自獨立的開放
 *  折線）。左半的頭尾兩點不需要剛好落在x=0上：如果不是，鏡射後頭尾會
 *  各自形成一條連接左右兩側的邊（分別對應槽口開口線、槽底線），效果
 *  是對的，不用特判。 */
var arcProblems = [];
function syncVerticesFromHalf() {
  var hasArc = halfVertices.some(function (p) { return Number(p.r); }) || (halfVertices[0] && Number(halfVertices[0].ro));
  if (!hasArc) {
    var mirroredBack = halfVertices.slice().reverse().map(function (p) { return { x: -p.x, y: p.y }; });
    vertices = halfVertices.map(function (p) { return { x: p.x, y: p.y }; }).concat(mirroredBack);
    arcProblems = [];
  } else {
    // 有圓弧：展開成短直線段（見 geometry.js expandHalfWithArcs）
    var ex = expandHalfWithArcs(halfVertices);
    vertices = ex.pts;
    arcProblems = ex.bad;
  }
  showArcProblems();
}
function showArcProblems() {
  var el = $('arcErr');
  if (!el) return;
  el.style.display = arcProblems.length ? '' : 'none';
  el.textContent = arcProblems.map(function (b) {
    if (b.i < 0) return mtT('arcErrOpening').replace('{min}', fmt(b.minR, 3));
    return mtT('arcErr').replace('{i}', b.i + 1).replace('{min}', fmt(b.minR, 3));
  }).join(' ');
}
function copyHalf(arr) {
  return arr.map(function (v) {
    var c = { x: v.x, y: v.y };
    if (Number(v.r)) c.r = Number(v.r);
    if (Number(v.ro)) c.ro = Number(v.ro);
    return c;
  });
}

/* ── 頂點清單復原（Undo）──
 * 只管左半邊頂點清單本身（編輯座標／新增／刪除／按Generate整個覆蓋
 * 掉），不管線材/槽型參數等其他欄位——這是使用者最容易「不小心弄丟工
 * 作」的地方（尤其是切回參數化按Generate，會直接覆蓋掉所有自訂編輯）。*/
var vertexHistory = [];
var MAX_VERTEX_HISTORY = 50;
function pushVertexHistory() {
  vertexHistory.push(copyHalf(halfVertices));
  if (vertexHistory.length > MAX_VERTEX_HISTORY) vertexHistory.shift();
  $('btnUndoVertex').disabled = false;
}
function undoVertices() {
  if (!vertexHistory.length) return;
  halfVertices = vertexHistory.pop();
  syncVerticesFromHalf();
  $('btnUndoVertex').disabled = vertexHistory.length === 0;
  renderVertexTable();
  computeAll();
}

/* 統計欄「填滿到最大容量」：反推 Turns/slot = maxCapacity / (coils×strands)
 * 無條件捨去（寧可少塞，不要讓算出來的數字又超過容量），直接改掉輸入
 * 欄再重算一次——不是另外存一個「建議值」，使用者看到的就是實際套用
 * 後的結果。 */
window.applyMaxTurns = function () {
  if (!(lastMaxCapacity > 0) || !(lastCoils > 0) || !(lastStrands > 0)) return;
  var newTurns = Math.floor(lastMaxCapacity / (lastCoils * lastStrands));
  if (newTurns < 1) return;
  $('w_turns').value = newTurns;
  computeAll();
};

function num(id, fallback) {
  var v = parseFloat($(id).value);
  return isFinite(v) ? v : fallback;
}
function fmt(v, digits) {
  if (digits === undefined) digits = 2;
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
/** 結果欄的標籤＋「?」說明鈕（點開看公式／細節，跟左側欄位同一套 popover） */
function tip(label, key) {
  return '<span class="tip-label">' + label + infoButton(key) + '</span>';
}
function infoButton(key) {
  return '<button type="button" class="info-btn" data-info="' + key + '" aria-label="?" aria-expanded="false">?</button>';
}

/* ── 模式切換 ── */
window.switchShapeMode = function (mode) {
  shapeMode = mode;
  $('tabParam').classList.toggle('active', mode === 'param');
  $('tabCustom').classList.toggle('active', mode === 'custom');
  $('paramPanel').style.display = mode === 'param' ? '' : 'none';
  $('customPanel').style.display = mode === 'custom' ? '' : 'none';
  computeAll(); // 圖上的標註（尺寸線 vs 座標文字）跟著模式切換，不等下次輸入才重畫
  if (typeof gaTrack === 'function') gaTrack('slotpack_mode', mode);
};

/* ── 頂點表格（只列左半邊，右半邊自動鏡射）── */
function renderVertexTable() {
  var body = $('vertexTableBody');
  var html = '';
  halfVertices.forEach(function (v, i) {
    html += '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="x" value="' + fmt(v.x, 3) + '"></td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="y" value="' + fmt(v.y, 3) + '"></td>' +
      '<td><input type="text" data-i="' + i + '" data-axis="r" placeholder="—" value="' + (Number(v.r) ? fmt(v.r, 3) : '') + '"></td>' +
      '<td><button class="vertex-del-btn" data-i="' + i + '" title="' + mtT('addPointBtn') + '">✕</button></td>' +
      '</tr>';
  });
  body.innerHTML = html;
  var ro = halfVertices[0] && Number(halfVertices[0].ro);
  $('v_openingR').value = ro ? fmt(ro, 3) : '';

  body.querySelectorAll('input').forEach(function (inp) {
    // 在開始編輯那一刻（focus）存一次快照，不是每個按鍵都存——這樣一次
    // 「復原」會退回到那格開始編輯之前的狀態，不是只退回最後一個字元。
    inp.addEventListener('focus', function () { pushVertexHistory(); });
    inp.addEventListener('input', function () {
      var i = parseInt(this.dataset.i, 10), axis = this.dataset.axis;
      var v = parseFloat(this.value);
      if (axis === 'r') {
        // 空白或 0 ＝ 直線
        if (this.value.trim() === '' || v === 0) delete halfVertices[i].r;
        else if (isFinite(v)) halfVertices[i].r = v;
        else return;
        syncVerticesFromHalf(); computeAll();
        return;
      }
      if (isFinite(v)) { halfVertices[i][axis] = v; syncVerticesFromHalf(); computeAll(); }
    });
  });
  body.querySelectorAll('.vertex-del-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (halfVertices.length <= 2) return; // 左半邊至少留2點，鏡射後才能成形（至少4邊）
      pushVertexHistory();
      halfVertices.splice(parseInt(this.dataset.i, 10), 1);
      syncVerticesFromHalf();
      renderVertexTable();
      computeAll();
    });
  });
}

// 排線方式的說明改由「?」popover 顯示（內容依目前選的方式），這裡只負責重畫已開著的 popover
function updatePackModeHint() { refreshInfoPop(); }

/* ── 參數化槽型（RMxprt 1–5／簡易梯形）── */
function readRmxprtParams() {
  return {
    bs0: num('p_bs0', NaN), hs0: num('p_hs0', NaN), hs1: num('p_hs1', NaN), bs1: num('p_bs1', NaN),
    bs2: num('p_bs2', NaN), hs2: num('p_hs2', NaN), rs: num('p_rs', 0), rs0: num('p_rs0', 0), dsi: num('p_dsi', NaN),
    outer: rotor === 'outer',
  };
}
var slotParamErrKey = null;
function showSlotParamError(key) {
  slotParamErrKey = key;
  var el = $('slotParamErr');
  el.style.display = key ? '' : 'none';
  if (key) el.textContent = mtT(key);
}
/** 只顯示目前槽型用得到的欄位（data-types 列出適用的槽型） */
function updateSlotTypeFields() {
  var type = $('p_slotType').value;
  document.querySelectorAll('#paramPanel [data-types]').forEach(function (row) {
    row.style.display = row.getAttribute('data-types').split(',').indexOf(type) >= 0 ? '' : 'none';
  });
  if (slotParamErrKey) showSlotParamError(slotParamErrKey);
  refreshInfoPop();
}

function generateFromParametric() {
  // Generate 會整個覆蓋掉目前的左半邊頂點清單，包含使用者切到自訂頂點
  // 手動改過的內容——這是最容易「不小心弄丟工作」的操作，按之前先存一
  // 次快照（頁面剛載入、halfVertices 還是空的那次不用存，沒有東西好
  // 復原）。
  if (halfVertices.length >= 2) pushVertexHistory();
  var type = $('p_slotType').value, windStart;
  if (type === 'trap') {
    var openW = num('p_openWidth', 3), openH = num('p_openHeight', 1.5);
    var top = num('p_topWidth', 4), bottom = num('p_bottomWidth', 7), depth = num('p_depth', 12);
    // 跟 generateSlotShape() 產生的8點是同一個形狀，但這裡直接寫出「左半
    // 邊、從槽口排到槽底」的4點，不是反過來從8點裡篩選——對稱軸切出來的
    // 左半邊本來就該長這樣，不需要用篩選+排序去猜。
    halfVertices = [
      { x: -openW / 2, y: 0 },
      { x: -openW / 2, y: openH },
      { x: -top / 2, y: openH },
      { x: -bottom / 2, y: depth },
    ];
    windStart = openH;
  } else {
    var g = rmxprtSlotHalf(type, readRmxprtParams());
    if (g.error) {
      showSlotParamError(g.error);
      if (vertexHistory.length) vertexHistory.pop(); // 沒有真的改到頂點，剛存的快照收回
      $('btnUndoVertex').disabled = vertexHistory.length === 0;
      return;
    }
    halfVertices = g.half;
    windStart = num('p_hs0', 0) + num('p_hs1', 0); // 槽口＋肩部（槽楔區）不繞線
  }
  showSlotParamError(null);
  syncVerticesFromHalf();
  renderVertexTable();
  $('w_windStartY').value = fmt(windStart, 3); // 開口喉不繞線，跟著參數化的開口高（Hs0+Hs1）自動帶
  computeAll();
  if (typeof gaTrack === 'function') gaTrack('slotpack_generate', 'slot');
}

function addVertexPoint() {
  pushVertexHistory();
  var last = halfVertices[halfVertices.length - 1] || { x: -1, y: 0 };
  halfVertices.push({ x: last.x, y: last.y + 2 });
  syncVerticesFromHalf();
  renderVertexTable();
  computeAll();
}

/* 槽口（y=0，靠氣隙那端）實際上是開放的，不是鐵芯/liner包起來的封閉邊
 * ——把多邊形重新排序成「從開口的其中一個端點開始，繞一圈到開口的另一
 * 端點結束」，畫成不封口的 polyline，開口那一段邊就不會被畫出來。找
 * 「開口邊」用 y 最小（靠氣隙那端是整個工具固定的座標慣例）判斷，不是
 * 只認參數化生成時的頂點順序，使用者自訂頂點也適用。找不到明顯的水平
 * 頂緣（例如整個形狀被改到沒有任何一段貼齊最小 y）就退回整圈都畫。 */
function openingChain(poly) {
  var n = poly.length;
  if (n < 2) return null;
  var minY = Infinity, m = 0;
  poly.forEach(function (p, i) { if (p.y < minY) { minY = p.y; m = i; } });
  // 槽口是直線時只認貼齊最小 y 的那一段；槽口是圓弧時，整段弧（高低差＝弓
  // 高）都算槽口
  var ro = halfVertices[0] && Number(halfVertices[0].ro), fx = halfVertices[0] ? Math.abs(halfVertices[0].x) : 0;
  var sag = ro && Math.abs(ro) > fx ? Math.abs(ro) - Math.sqrt(ro * ro - fx * fx) : 0;
  var limit = minY + sag * 1.5 + 1e-6;
  var flat = function (a, b) { return Math.abs(b.y - a.y) <= Math.abs(b.x - a.x) && a.y <= limit && b.y <= limit; };
  var i0 = m, i1 = m, steps = 0;
  while (steps < n && flat(poly[(i0 - 1 + n) % n], poly[i0])) { i0 = (i0 - 1 + n) % n; steps++; }
  while (steps < n && flat(poly[i1], poly[(i1 + 1) % n])) { i1 = (i1 + 1) % n; steps++; }
  if (i0 === i1) return null;
  return { from: i0, to: i1 };
}
function openingAwarePoints(poly) {
  var c = openingChain(poly);
  if (!c) return poly;
  var n = poly.length, out = [];
  for (var k = c.to; ; k = (k + 1) % n) { out.push(poly[k]); if (k === c.from) break; }
  return out;
}

/* 槽口寬度：openingChain 兩端點的水平距離——導針要先穿過這個開口才進得
 * 了槽，通道寬度不該比這個還寬。找不到槽口就回傳 0（不擋）。 */
function openingWidthOf(poly) {
  var c = openingChain(poly);
  return c ? Math.abs(poly[c.to].x - poly[c.from].x) : 0;
}

/* 畫一條水平尺寸標註：兩端垂直延伸線（從特徵本身的 yFeature 連到尺寸線
 * 所在的 yDim）＋主尺寸線＋兩端短撇＋置中數字。延伸線跨過其他幾何（例
 *如內縮梯形較窄處的延伸線會跨過下方較寬的本體）是常見、可接受的畫
 * 法，不特別避開。 */
function dimH(x1, x2, yFeature, yDim, label, tick, fontSize) {
  var midX = (x1 + x2) / 2;
  return (
    '<line class="dim-ext" x1="' + x1 + '" y1="' + yFeature + '" x2="' + x1 + '" y2="' + yDim + '"></line>' +
    '<line class="dim-ext" x1="' + x2 + '" y1="' + yFeature + '" x2="' + x2 + '" y2="' + yDim + '"></line>' +
    '<line class="dim-line" x1="' + x1 + '" y1="' + yDim + '" x2="' + x2 + '" y2="' + yDim + '"></line>' +
    '<line class="dim-line" x1="' + x1 + '" y1="' + (yDim - tick) + '" x2="' + x1 + '" y2="' + (yDim + tick) + '"></line>' +
    '<line class="dim-line" x1="' + x2 + '" y1="' + (yDim - tick) + '" x2="' + x2 + '" y2="' + (yDim + tick) + '"></line>' +
    '<text class="dim-text" x="' + midX + '" y="' + (yDim - fontSize * 0.5) + '" font-size="' + fontSize + '">' + label + '</text>'
  );
}
/** 跟 dimH 同一套畫法，軸互換；文字旋轉-90度直式顯示（由下往上讀，標準工程圖慣例）。
 *  xFeature1/xFeature2 分開給，因為量垂直距離時兩端對應的槽型寬度通常不同
 *（例如開口高：上端在本體上寬處、下端在開口寬處，不是同一個x）。 */
function dimV(y1, y2, xFeature1, xFeature2, xDim, label, tick, fontSize, side) {
  var midY = (y1 + y2) / 2;
  var dir = side === 'right' ? 1 : -1;
  var text;
  if (String(label).length * fontSize * 0.56 > Math.abs(y2 - y1) * 0.9) {
    // 尺寸太短放不下直式文字（例如 Hs0、Hs1）：改成橫式，放在尺寸線外側
    text = '<text class="dim-text" x="' + (xDim + dir * fontSize * 0.4) + '" y="' + midY + '" font-size="' + fontSize +
      '" style="text-anchor:' + (dir > 0 ? 'start' : 'end') + '">' + label + '</text>';
  } else {
    var tx = xDim + dir * fontSize * 0.5;
    text = '<text class="dim-text" x="' + tx + '" y="' + midY + '" font-size="' + fontSize + '" transform="rotate(-90 ' + tx + ' ' + midY + ')">' + label + '</text>';
  }
  return (
    '<line class="dim-ext" x1="' + xFeature1 + '" y1="' + y1 + '" x2="' + xDim + '" y2="' + y1 + '"></line>' +
    '<line class="dim-ext" x1="' + xFeature2 + '" y1="' + y2 + '" x2="' + xDim + '" y2="' + y2 + '"></line>' +
    '<line class="dim-line" x1="' + xDim + '" y1="' + y1 + '" x2="' + xDim + '" y2="' + y2 + '"></line>' +
    '<line class="dim-line" x1="' + (xDim - tick) + '" y1="' + y1 + '" x2="' + (xDim + tick) + '" y2="' + y1 + '"></line>' +
    '<line class="dim-line" x1="' + (xDim - tick) + '" y1="' + y2 + '" x2="' + (xDim + tick) + '" y2="' + y2 + '"></line>' +
    text
  );
}

/** 座標軸箭頭：從(x1,y1)到(x2,y2)畫一條線，終點畫小三角形箭頭＋文字標籤。 */
function axisArrow(x1, y1, x2, y2, label, arrowSize, fontSize) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  var backX = x2 - ux * arrowSize, backY = y2 - uy * arrowSize;
  var p1x = backX + nx * arrowSize * 0.5, p1y = backY + ny * arrowSize * 0.5;
  var p2x = backX - nx * arrowSize * 0.5, p2y = backY - ny * arrowSize * 0.5;
  var labelX = x2 + ux * fontSize * 0.8, labelY = y2 + uy * fontSize * 0.8;
  return '<line class="axis-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"></line>' +
    '<polygon class="axis-arrow" points="' + x2 + ',' + y2 + ' ' + p1x + ',' + p1y + ' ' + p2x + ',' + p2y + '"></polygon>' +
    '<text class="axis-label" x="' + labelX + '" y="' + labelY + '" font-size="' + fontSize + '">' + label + '</text>';
}

/** 把滑鼠/觸控事件的螢幕座標轉成 SVG viewBox 的使用者座標（mm）——優先
 *  用 getScreenCTM()（正確處理 preserveAspectRatio 置中縮放），拿不到
 *  時退回用 viewBox 手動按比例換算。 */
function svgPointToUser(svg, clientX, clientY) {
  var ctm = svg.getScreenCTM && svg.getScreenCTM();
  if (ctm && svg.createSVGPoint) {
    var pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    var up = pt.matrixTransform(ctm.inverse());
    return { x: up.x, y: up.y };
  }
  var rect = svg.getBoundingClientRect();
  var vb = svg.viewBox.baseVal;
  return {
    x: vb.x + (clientX - rect.left) / rect.width * vb.width,
    y: vb.y + (clientY - rect.top) / rect.height * vb.height,
  };
}

/** 自訂頂點模式：讓圖上每個標了編號的點可以直接拖曳——拖的是
 *  halfVertices[i]（左半邊），右半邊由 syncVerticesFromHalf() 自動鏡
 *  射更新，所以只要處理左半邊這一側的拖曳邏輯，不用另外判斷「拖到的
 *  是左點還是右點」（圖上本來就只有左半邊的點有控點）。用
 *  requestAnimationFrame 節流（pointermove 可能比畫面更新頻繁），拖曳
 *  開始時存一次 undo 快照（不是每個影格都存）。 */
/** 拖曳頂點時凍結的視野（viewBox＋maxDim）。拖曳中每個影格都會重畫，若
 *  照常依形狀重新算 viewBox，比例尺會跟著一直縮放、控點也會從游標底下
 *  跑掉；所以按下時凍結目前的視野，放開滑鼠才解除並重畫一次重新貼合。 */
var dragView = null;
var lastView = null;

/* ── 排線圖的視野：貼合槽／整個槽距，滾輪縮放、拖曳平移 ── */
var fitMode = 'slot';                  // 'slot' | 'stator'
var zoom = { z: 1, dx: 0, dy: 0 };     // 相對自動視野的倍率與中心位移（模型座標）
var autoCenter = { x: 0, y: 0 };
var ZOOM_MIN = 0.3, ZOOM_MAX = 20;
function redrawSvg() {
  if (!lastDraw) return;
  renderSvg(lastDraw.innerPoly, lastDraw.pack, lastDraw.needleRect, lastDraw.clearanceRect);
}
function resetZoom() { zoom = { z: 1, dx: 0, dy: 0 }; }
window.setFitMode = function (m) {
  fitMode = m === 'stator' ? 'stator' : 'slot';
  resetZoom();
  $('fitSlot').classList.toggle('active', fitMode === 'slot');
  $('fitStator').classList.toggle('active', fitMode === 'stator');
  redrawSvg();
};
/** 螢幕座標 → 模型座標（真實方向的畫面是上下翻轉的） */
function screenToModel(svg, x, y) {
  var p = svgPointToUser(svg, x, y);
  if (lastView && lastView.flip) p.y = -p.y;
  return p;
}
function attachZoomPan(svg) {
  svg.addEventListener('wheel', function (e) {
    if (!lastView || dragView) return;
    e.preventDefault();
    var f = Math.exp(-e.deltaY * 0.0015);
    var nz = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.z * f));
    f = nz / zoom.z;
    if (Math.abs(f - 1) < 1e-9) return;
    // 游標底下那一點固定不動
    var p = screenToModel(svg, e.clientX, e.clientY);
    var c = { x: lastView.vx + lastView.vw / 2, y: lastView.vy + lastView.vh / 2 };
    zoom.z = nz;
    zoom.dx = p.x + (c.x - p.x) / f - autoCenter.x;
    zoom.dy = p.y + (c.y - p.y) / f - autoCenter.y;
    redrawSvg();
  }, { passive: false });
  svg.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || (e.target.closest && e.target.closest('.vertex-handle'))) return;
    var last = { x: e.clientX, y: e.clientY }, moved = false;
    function onMove(ev) {
      var a = screenToModel(svg, last.x, last.y), b = screenToModel(svg, ev.clientX, ev.clientY);
      if (!moved && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 3) return;
      moved = true;
      zoom.dx -= b.x - a.x; zoom.dy -= b.y - a.y;
      last = { x: ev.clientX, y: ev.clientY };
      svg.classList.add('panning');
      redrawSvg();
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      svg.classList.remove('panning');
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
  svg.addEventListener('dblclick', function (e) {
    if (e.target.closest && e.target.closest('.vertex-handle')) return;
    resetZoom(); redrawSvg();
  });
}

function attachVertexDragHandlers(svg) {
  svg.querySelectorAll('.vertex-handle').forEach(function (handle) {
    handle.style.cursor = 'grab';
    handle.addEventListener('pointerdown', function (downEv) {
      downEv.preventDefault();
      var i = parseInt(handle.dataset.i, 10);
      pushVertexHistory();
      dragView = lastView;
      handle.style.cursor = 'grabbing';
      var rafPending = false, latest = null;
      function applyMove() {
        rafPending = false;
        if (!latest) return;
        var p = svgPointToUser(svg, latest.clientX, latest.clientY);
        if (lastView && lastView.flip) p.y = -p.y; // 真實方向的畫面是上下翻轉的
        // 卡住x<=0，不讓左半邊的點被拖過Y軸跑到右邊——拖過去的話鏡射出來
        // 的右半邊會變成跑到左邊，兩邊角色對調，畫面會很confusing，直
        // 接限制住比較不會拖錯。同理卡住y>=0：y=0（X軸）是槽口，往上是
        // 氣隙那一側，槽型不會長到那裡去。
        halfVertices[i].x = Math.min(p.x, 0);
        halfVertices[i].y = Math.max(p.y, 0);
        syncVerticesFromHalf();
        renderVertexTable();
        computeAll(); // 會重新呼叫 renderSvg()，含重新綁定這些拖曳控點
      }
      function onMove(mv) {
        latest = mv;
        if (!rafPending) { rafPending = true; requestAnimationFrame(applyMove); }
      }
      function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        // 若還有排隊中的影格，先把最後位置套用掉，再解除凍結重新貼合比例尺
        if (rafPending) applyMove();
        latest = null;
        dragView = null;
        computeAll();
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  });
}

/** 槽口沿氣隙側圓弧時的定子幾何（模型座標：y=0 是槽口兩角、往槽底增加）。
 *  槽口圓弧 ro < 0（往槽內凹）＝內轉：定子中心在槽口上方，半徑往槽底變大；
 *  ro > 0（往外凸）＝外轉：定子中心在槽底那一側，半徑往槽底變小。
 *  dir：從定子中心看向這個槽是 +y（內轉）還是 −y（外轉）。沒有槽口圓弧回傳 null。
 *  有槽數 Q 時再算一個槽距的扇形：Rgap＝氣隙側（槽口）圓，Ryoke＝軛部那一側的圓，
 *  Rin／Rout 是兩者較小／較大的那個。 */
function statorGeometry() {
  var F = halfVertices[0], ro = F && Number(F.ro);
  if (!ro || Math.abs(ro) <= Math.abs(F.x)) return null;
  var Rgap = Math.abs(ro), dir = ro < 0 ? 1 : -1;
  var yc = F.y - dir * Math.sqrt(Rgap * Rgap - F.x * F.x);
  var g = { Rgap: Rgap, Rin: Rgap, Rout: Rgap, yc: yc, dir: dir, Q: 0 };
  var Q = Math.round(num('p_slots', 0));
  if (Q >= 3) {
    var dists = vertices.map(function (p) { return Math.hypot(p.x, p.y - yc); });
    var Rmax = Math.max.apply(null, dists), Rmin = Math.min.apply(null, dists);
    var dYoke = num('p_dso', 0); // 內轉：定子外徑 Dso；外轉：定子內徑 Di（同一個欄位）
    g.Q = Q;
    g.half = Math.PI / Q;
    if (dir > 0) {
      g.Ryoke = dYoke / 2 > Rmax ? dYoke / 2 : Rmax + Math.max(1.5, 0.35 * (Rmax - Rgap));
      g.Rin = Rgap; g.Rout = g.Ryoke;
    } else {
      g.Ryoke = dYoke / 2 > 0 && dYoke / 2 < Rmin ? dYoke / 2 : Math.max(0.3 * Rmin, Rmin - Math.max(1.5, 0.35 * (Rgap - Rmin)));
      g.Rin = g.Ryoke; g.Rout = Rgap;
    }
  }
  return g;
}
/** 極座標（從定子中心量，角度 0 = 槽的中心線、從中心看向這個槽）→ 模型座標 */
function statorPt(g, phi, rho) { return { x: rho * Math.sin(phi), y: g.yc + g.dir * rho * Math.cos(phi) }; }
/** 模型座標 → 極座標（statorPt 的反函數） */
function statorPolar(g, p) {
  var dy = g.dir * (p.y - g.yc);
  return { rho: Math.hypot(p.x, dy), phi: Math.atan2(p.x, dy) };
}

/** 齒寬 b（鐵芯，不含絕緣）由槽型推算：槽壁（左側齒面）到左邊那顆齒中心線
 *  （角度 −π/Q 的徑向線）的距離 × 2。量在槽壁中點；兩端也量，給「不是平行
 *  齒」的提醒用。需要槽數 Q 與沿 Dsi／Dso 的槽口圓弧，不然回傳 null。 */
function autoToothWidth(g) {
  if (!g || !g.Q || vertices.length < 3) return null;
  var fr = toothFaceFrame(vertices, 'left');
  if (!fr.mid) return null;
  var bAt = function (p) { var q = statorPolar(g, p); return 2 * q.rho * Math.sin(q.phi + g.half); };
  var b = bAt(fr.mid);
  if (!(b > 0)) return null;
  var e = fr.ends.map(bAt);
  return { b: b, bMin: Math.min(e[0], e[1]), bMax: Math.max(e[0], e[1]) };
}

/** 鐵芯底色：有槽數就畫一個槽距的扇形；只有內徑就畫到內徑圓弧為止；
 *  都沒有就是從槽口那條線往下的矩形。 */
function laminationShape(g, bbox, vx, vy, vw, vh) {
  if (!g) {
    return '<rect class="slot-lamination" x="' + vx + '" y="' + bbox.minY + '" width="' + vw + '" height="' + (vy + vh - bbox.minY) + '"></rect>';
  }
  var pts = [], k;
  if (g.Q) {
    for (k = 0; k <= 64; k++) pts.push(statorPt(g, -g.half + 2 * g.half * k / 64, g.Rout));
    for (k = 64; k >= 0; k--) pts.push(statorPt(g, -g.half + 2 * g.half * k / 64, g.Rin));
  } else {
    // 沒有槽數：從氣隙側的圓（槽口圓弧所在的圓）往槽底方向畫到畫面邊緣
    for (k = 0; k <= 80; k++) {
      var x = vx + vw * k / 80, dx = Math.min(Math.abs(x), g.Rgap);
      pts.push({ x: x, y: g.yc + g.dir * Math.sqrt(g.Rgap * g.Rgap - dx * dx) });
    }
    pts.push({ x: vx + vw, y: vy + vh }, { x: vx, y: vy + vh });
  }
  return '<polygon class="slot-lamination" points="' + pts.map(function (p) { return p.x + ',' + p.y; }).join(' ') + '"></polygon>';
}

/* ── SVG 繪製：紅=鐵芯、綠=liner內縮後的繞線窗、黃=導線（仿 Motor-CAD 配色） ── */
function renderSvg(innerPoly, pack, needleRect, clearanceRect) {
  var svg = $('packingSvg');
  if (vertices.length < 3) { svg.innerHTML = ''; return; }

  var bbox = polygonBBox(vertices);
  var stator = statorGeometry();
  // 預設視野只貼合槽本身（定子扇形當背景、超出畫面就裁掉），槽才夠大看得清楚；
  // 「整個槽距」才把扇形整個框進來。線寬、字級一律跟槽的尺寸走，兩種視野看起來一致。
  var viewBB = bbox;
  if (fitMode === 'stator' && stator && stator.Q) {
    var corners = [statorPt(stator, -stator.half, stator.Rout), statorPt(stator, stator.half, stator.Rout),
      statorPt(stator, 0, stator.Rout), statorPt(stator, -stator.half, stator.Rin), statorPt(stator, stator.half, stator.Rin),
      statorPt(stator, 0, stator.Rin)];
    viewBB = polygonBBox(vertices.concat(corners));
  }
  // 真實方向＝槽口朝轉子：內轉子要上下翻轉（槽口朝下、定子中心在下）；外轉子的
  // 模型座標本來就是槽口朝上、定子中心在下，不用翻
  var flip = $('p_view').value === 'real' && rotor === 'inner';
  // 槽寬超過一個槽距（槽數填錯時常見）：扇形還是照畫，但提醒一下
  var tooWide = !!(stator && stator.Q) && vertices.some(function (p) {
    return Math.abs(statorPolar(stator, p).phi) > stator.half + 1e-9;
  });
  $('pitchWarn').style.display = tooWide ? '' : 'none';
  if (tooWide) $('pitchWarn').textContent = mtT('pitchWarn').replace('{q}', stator.Q);
  var w = viewBB.maxX - viewBB.minX, h = viewBB.maxY - viewBB.minY;
  var maxDim, vx, vy, vw, vh;
  if (dragView) {
    // 拖曳中：沿用按下時的視野，比例尺、線寬、字級、控點大小都不變
    maxDim = dragView.maxDim;
    vx = dragView.vx; vy = dragView.vy; vw = dragView.vw; vh = dragView.vh;
  } else {
    maxDim = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY, 1);
    // 參數化模式會在圖外圍標尺寸，需要比自訂頂點模式更大的留白空間才放
    // 得下尺寸線跟文字——上方堆兩條（開口寬、上寬）、下方一條（下寬）、
    // 左右各一條（開口高、槽深）。
    var padTop = maxDim * (shapeMode === 'param' ? 0.40 : 0.18);
    var padBottom = maxDim * (shapeMode === 'param' ? 0.32 : 0.18);
    var padLeft = maxDim * (shapeMode === 'param' ? 0.48 : 0.26);
    var padRight = maxDim * (shapeMode === 'param' ? 0.48 : 0.26);
    vx = viewBB.minX - padLeft; vy = viewBB.minY - padTop; vw = w + padLeft + padRight; vh = h + padTop + padBottom;
    // 使用者縮放／平移：以自動視野為基準，倍率 z、中心再位移 (dx, dy)（模型座標）
    autoCenter = { x: vx + vw / 2, y: vy + vh / 2 };
    if (zoom.z !== 1 || zoom.dx || zoom.dy) {
      var zcx = autoCenter.x + zoom.dx, zcy = autoCenter.y + zoom.dy;
      vw /= zoom.z; vh /= zoom.z; vx = zcx - vw / 2; vy = zcy - vh / 2;
    }
  }
  lastView = { vx: vx, vy: vy, vw: vw, vh: vh, maxDim: maxDim, flip: flip };
  svg.classList.toggle('zoomed', zoom.z !== 1 || !!zoom.dx || !!zoom.dy);
  // 真實方向：整張圖上下翻轉（定子中心在下、槽口朝下）。幾何都在模型座標裡畫，
  // 外面包一層 scale(1,-1)；viewBox 用翻轉後的範圍，文字最後再個別翻回來。
  svg.setAttribute('viewBox', vx + ' ' + (flip ? -(vy + vh) : vy) + ' ' + vw + ' ' + vh);

  var strokeW = maxDim * 0.01;
  var outerPts = openingAwarePoints(vertices).map(function (p) { return p.x + ',' + p.y; }).join(' ');

  // 鐵芯（紅）只畫到槽口那條線（bbox.minY，氣隙側）為止，不要往上延伸到
  // 墊白區域——那裡是氣隙/轉子那側，不是鐵芯，照真實矽鋼片圖只有鐵芯
  // 本體是紅色，氣隙上方留白。
  var html = laminationShape(stator, bbox, vx, vy, vw, vh) +
    '<polyline class="slot-outline" points="' + outerPts + '" style="stroke-width:' + strokeW + '"></polyline>';

  if (innerPoly) {
    var innerPts = openingAwarePoints(innerPoly).map(function (p) { return p.x + ',' + p.y; }).join(' ');
    html += '<polyline class="slot-liner" points="' + innerPts + '" style="stroke-width:' + strokeW + '"></polyline>';
  }

  // 自訂頂點模式：座標軸畫在liner之上、線材之下——畫在最底層（鐵芯/
  // liner之前）的話，大部分線段會被鐵芯/liner的實心填色蓋住，只剩墊
  // 白區域那一小段看得到，不夠明顯；畫在這裡才會整條線都蓋在材料色塊
  // 上面、顏色也改深色加粗，確保看得清楚。只在0落在目前視野範圍內才
  // 畫，避免極端自訂形狀把原點甩到畫面外時畫出奇怪的線。
  if (shapeMode === 'custom') {
    var axisFont = maxDim * 0.06, axisArrowSize = axisFont * 0.6;
    html += '<g style="stroke-width:' + (strokeW * 1.1) + '">';
    if (0 >= vx && 0 <= vx + vw) html += axisArrow(0, vy, 0, vy + vh, 'Y', axisArrowSize, axisFont);
    if (0 >= vy && 0 <= vy + vh) html += axisArrow(vx, 0, vx + vw, 0, 'X', axisArrowSize, axisFont);
    html += '</g>';
  }

  // 編號照 pack.placed 陣列順序＝沉降模擬實際放入的順序（雙層繞組時左
  // 半邊先、右半邊接著，兩側各自獨立沉降但畫面上編號是連續的，不是各
  // 自從1開始，避免畫面同時出現兩個#1）。字體大小跟著線徑縮放，線材
  // 很多很密時數字會很小——這是編號擠進每顆線材裡的必然取捨。
  // 規則往返模式：用細線把繞線順序連起來，換層跳距一眼看得出來
  if (pack && pack.paths) {
    pack.paths.forEach(function (path) {
      if (path.length < 2) return;
      html += '<polyline class="wind-path" points="' + path.map(function (c) { return c.x + ',' + c.y; }).join(' ') +
        '" style="stroke-width:' + (strokeW * 0.5) + '"></polyline>';
    });
  }
  (pack ? pack.placed : []).forEach(function (c, idx) {
    var r = c.d / 2;
    html += '<circle class="slot-circle" cx="' + c.x + '" cy="' + c.y + '" r="' + r + '" style="stroke-width:' + (strokeW * 0.4) + '"></circle>' +
      '<text class="wire-index" x="' + c.x + '" y="' + c.y + '" font-size="' + (r * 0.85) + '">' + (c.label || idx + 1) + '</text>';
  });
  if (needleRect) {
    html += '<rect class="slot-needle-channel" x="' + needleRect.x + '" y="' + needleRect.y + '" width="' + needleRect.width + '" height="' + needleRect.height + '" style="stroke-width:' + (strokeW * 0.6) + '"></rect>';
  }
  if (clearanceRect) {
    // 導針安全距離：線材不能越過的兩條界線（只畫左右兩邊，虛線）
    var cy1 = clearanceRect.y, cy2 = clearanceRect.y + clearanceRect.height;
    var dash = 'stroke-width:' + (strokeW * 0.6) + ';stroke-dasharray:' + (strokeW * 3) + ' ' + (strokeW * 2);
    [clearanceRect.x, clearanceRect.x + clearanceRect.width].forEach(function (x) {
      html += '<line class="slot-needle-clearance" x1="' + x + '" y1="' + cy1 + '" x2="' + x + '" y2="' + cy2 + '" style="' + dash + '"></line>';
    });
  }

  var dimStrokeW = strokeW * 0.5, fontSize = maxDim * 0.062, tick = fontSize * 0.4;
  if (shapeMode === 'param' && $('p_slotType').value === 'trap') {
    var openW = num('p_openWidth', 3), openH = num('p_openHeight', 1.5);
    var topW = num('p_topWidth', 4), bottomW = num('p_bottomWidth', 7), depthV = num('p_depth', 12);
    html += '<g style="stroke-width:' + dimStrokeW + '">' +
      dimH(-openW / 2, openW / 2, 0, -maxDim * 0.10, fmt(openW, 2), tick, fontSize) +
      dimH(-topW / 2, topW / 2, openH, -maxDim * 0.24, fmt(topW, 2), tick, fontSize) +
      dimH(-bottomW / 2, bottomW / 2, depthV, depthV + maxDim * 0.09, fmt(bottomW, 2), tick, fontSize) +
      dimV(0, openH, -openW / 2, -topW / 2, bbox.minX - maxDim * 0.10, fmt(openH, 2), tick, fontSize) +
      dimV(0, depthV, openW / 2, bottomW / 2, bbox.maxX + maxDim * 0.10, fmt(depthV, 2), tick, fontSize, 'right') +
      '</g>';
  } else if (shapeMode === 'param') {
    // RMxprt 槽型：標註名稱跟 Maxwell 一樣（Bs0=3.00），方便對照抄數字。
    // 上方兩條（Bs0、Bs1）、下方一條（Bs2）、左邊兩欄（Hs0、Hs1）、右邊一條（Hs2）。
    var type = $('p_slotType').value, P = readRmxprtParams();
    var y0 = P.hs0, y1 = P.hs0 + P.hs1, y2 = y1 + P.hs2;
    var mouthW = type === '2' ? P.bs1 : P.bs0;
    var L = function (name, v) { return name + '=' + fmt(v, 2); };
    var rightX = bbox.maxX + maxDim * 0.10;
    html += '<g style="stroke-width:' + dimStrokeW + '">';
    if (type !== '2') html += dimH(-P.bs0 / 2, P.bs0 / 2, 0, -maxDim * 0.10, L('Bs0', P.bs0), tick, fontSize);
    html += dimH(-P.bs1 / 2, P.bs1 / 2, y1, -maxDim * (type === '2' ? 0.10 : 0.24), L('Bs1', P.bs1), tick, fontSize) +
      dimH(-P.bs2 / 2, P.bs2 / 2, y2, bbox.maxY + maxDim * 0.12, L('Bs2', P.bs2), tick, fontSize);
    // Hs0 在左邊；Hs1、Hs2 在右邊串成連續尺寸（Hs1 接著 Hs2），短的那段自動改橫式文字
    if (P.hs0 > 0) html += dimV(0, y0, -mouthW / 2, -mouthW / 2, bbox.minX - maxDim * 0.10, L('Hs0', P.hs0), tick, fontSize, 'left');
    if (P.hs1 > 0) html += dimV(y0, y1, mouthW / 2, P.bs1 / 2, rightX, L('Hs1', P.hs1), tick, fontSize, 'right');
    html += dimV(y1, y2, P.bs1 / 2, P.bs2 / 2, rightX, L('Hs2', P.hs2), tick, fontSize, 'right');
    if ((type === '1' || type === '3') && P.rs > 0) {
      // 圓角標註放在槽外左下方，不壓在線材上
      html += '<text class="dim-text" x="' + (-P.bs2 / 2 - fontSize * 0.3) + '" y="' + (y2 + fontSize * 0.9) +
        '" font-size="' + fontSize * 0.85 + '" style="text-anchor:end">' + L('Rs', P.rs) + '</text>';
    }
    if (type === '5' && P.dsi > 0) {
      var R5 = Math.hypot(P.bs2 / 2, y2 - statorCentreY(P.dsi, P.bs0, P.outer));
      html += '<text class="dim-text" x="0" y="' + (bbox.maxY + maxDim * 0.24) + '" font-size="' + fontSize * 0.85 + '">' +
        (P.outer ? 'Dso=' + fmt(P.dsi, 2) + ' → Ry=' : 'Dsi=' + fmt(P.dsi, 2) + ' → R=') + fmt(R5, 3) + '</text>';
    }
    html += '</g>';
  } else if (shapeMode === 'custom') {
    // 完整座標字串太長，即使做碰撞收斂也容易把兩個離得近的點的標籤推到
    // 視覺順序對調（例如#2比#3高，但收斂後#2的標籤反而畫在#3下面，看
    // 起來像編號錯位）——座標本來就能直接在左邊頂點表格看到，圖上只需
    // 要「這個點是編號幾」就夠對照，改成只顯示編號，文字框小很多，也
    // 把推開方向的判斷從「比較目前暫定位置」改成「比較頂點本身實際的
    // y座標」，確保推開後標籤的上下順序一定跟頂點本身的上下順序一致，
    // 不會看起來錯位。碰撞收斂邏輯本身維持（相鄰點還是可能靠得夠近，
    // 短文字還是可能疊在一起），每個標籤畫一條細引線連回對應的頂點。
    var vLabelFont = fontSize * 0.85;
    var cx = halfVertices.reduce(function (s, v) { return s + v.x; }, 0) / halfVertices.length;
    var charW = vLabelFont * 0.56, lineH = vLabelFont * 1.3;
    var labels = halfVertices.map(function (v, i) {
      var above = i % 2 === 0;
      var right = v.x >= cx;
      var text = '#' + (i + 1);
      return {
        i: i,
        x: v.x + (right ? 1 : -1) * fontSize * 0.35,
        y: above ? v.y - vLabelFont * 0.9 : v.y + vLabelFont * 1.5,
        width: text.length * charW, height: lineH,
        anchor: right ? 'start' : 'end', text: text, dotX: v.x, dotY: v.y,
      };
    });
    function updateBox(L) {
      if (L.anchor === 'start') { L.x1 = L.x; L.x2 = L.x + L.width; } else { L.x1 = L.x - L.width; L.x2 = L.x; }
      L.y1 = L.y - L.height / 2; L.y2 = L.y + L.height / 2;
    }
    labels.forEach(updateBox);
    for (var iter = 0; iter < 12; iter++) {
      var moved = false;
      for (var a = 0; a < labels.length; a++) {
        for (var b = a + 1; b < labels.length; b++) {
          var A = labels[a], B = labels[b];
          var overlapX = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
          var overlapY = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1);
          if (overlapX > 0 && overlapY > 0) {
            moved = true;
            // 推開的軸選「兩個頂點本身差距較大的那一軸」，不是選文字框重
            // 疊量較小的那一軸——後者（最小位移）雖然收斂快，但常常選到
            // 跟頂點實際關係不一致的軸，例如兩點垂直差很多、水平差很少
            // 時卻選擇水平推開，畫出來兩個標籤會變成並排，視覺上跟頂點
            // 實際的上下關係對不起來，看起來像編號錯位。
            var useY = Math.abs(A.dotY - B.dotY) >= Math.abs(A.dotX - B.dotX);
            if (useY) {
              var pushY = overlapY / 2 + fontSize * 0.02;
              if (A.dotY < B.dotY) { A.y -= pushY; B.y += pushY; } else { A.y += pushY; B.y -= pushY; }
            } else {
              var pushX = overlapX / 2 + fontSize * 0.02;
              if (A.dotX < B.dotX) { A.x -= pushX; B.x += pushX; } else { A.x += pushX; B.x -= pushX; }
            }
            updateBox(A); updateBox(B);
          }
        }
      }
      if (!moved) break;
    }
    html += '<g style="stroke-width:' + dimStrokeW + '">' +
      labels.map(function (L) {
        return '<line class="dim-ext" x1="' + L.dotX + '" y1="' + L.dotY + '" x2="' + L.x + '" y2="' + L.y + '"></line>' +
          '<circle class="vertex-handle" data-i="' + L.i + '" cx="' + L.dotX + '" cy="' + L.dotY + '" r="' + (fontSize * 0.32) + '" fill="#3f4d66" stroke="none"></circle>' +
          '<text class="vertex-label" x="' + L.x + '" y="' + L.y + '" font-size="' + vLabelFont + '" style="text-anchor:' + L.anchor + '">' + L.text + '</text>';
      }).join('') +
      '</g>';
  }

  svg.innerHTML = flip ? '<g transform="scale(1,-1)">' + html + '</g>' : html;
  if (flip) {
    // 文字以自己的錨點再翻一次，字才不會上下顛倒
    svg.querySelectorAll('text').forEach(function (t) {
      var y0 = parseFloat(t.getAttribute('y')) || 0;
      t.setAttribute('transform', 'matrix(1 0 0 -1 0 ' + 2 * y0 + ') ' + (t.getAttribute('transform') || ''));
    });
  }
  lastDraw = { innerPoly: innerPoly, pack: pack, needleRect: needleRect, clearanceRect: clearanceRect, stator: stator };
  if (shapeMode === 'custom') attachVertexDragHandlers(svg);
}
var lastDraw = null; // 給 DXF 匯出：最後一次畫出來的 liner、線材、導針通道

/** 在繞線窗裡排 count 根外徑 diameter 的線材。Coils/slot >= 2 時先切成
 *  左右兩個線圈邊（中間留導針通道），各自往外側槽壁沉降；否則整個繞線
 *  窗往槽底沉降。computeAll 與「依匝數回推線徑」共用這一套，確保兩邊
 *  判斷「放不放得下」的標準完全一致。pack.placedCount >= count 就代表
 *  全部放得下（雙層時等於兩側都各自放得下分到的根數）。orderForLabels
 *  為 true 時把雙層的 placed 重排成畫面編號用的繞線順序（回推線徑的迴
 *  圈只看數量，不需要排）。 */
function packWindow(packableArea, diameter, count, coils, needleWidth, needleClearance, orderForLabels, mode, strands) {
  var needleRect = null, clearanceRect = null;
  var layered = mode === 'layer';
  strands = Math.max(1, strands || 1);
  // 規則往返：每個線圈邊各自從槽底開始編匝號（股數 > 1 時同一匝的幾根同號）
  function withLabels(p) {
    p.placed.forEach(function (c, i) { c.label = Math.floor(i / strands) + 1; });
    return p;
  }
  var clearance = Math.max(0, needleClearance || 0);
  if (coils >= 2) {
    var packBbox = polygonBBox(packableArea);
    var splitX = (packBbox.minX + packBbox.maxX) / 2;
    // 線材要離導針通道兩側邊至少 clearance：每個線圈邊從中線退開
    // 「導針半寬 + 安全距離」
    var gap = needleWidth / 2 + clearance;
    var leftArea = clipPolygonMaxX(packableArea, splitX - gap);
    var rightArea = clipPolygonMinX(packableArea, splitX + gap);
    var perSide = Math.round(count / 2);
    var packL = layered ? withLabels(layeredWinding(leftArea, diameter, perSide, 'left'))
                        : settlePackTowardWall(leftArea, diameter, perSide, 'left');
    var packR = layered ? withLabels(layeredWinding(rightArea, diameter, count - perSide, 'right'))
                        : settlePackTowardWall(rightArea, diameter, count - perSide, 'right');
    if (needleWidth > 0) {
      needleRect = { x: splitX - needleWidth / 2, y: packBbox.minY, width: needleWidth, height: packBbox.maxY - packBbox.minY };
    }
    if (clearance > 0) {
      clearanceRect = { x: splitX - gap, y: packBbox.minY, width: 2 * gap, height: packBbox.maxY - packBbox.minY };
    }
    return {
      pack: {
        // 編號順序照實際繞線走法（每一側：第 1 層由上往下、第 2 層由下往
        // 上……）；左側編完右側接續。只影響畫面上的編號，不影響位置與數量。
        placed: layered ? packL.placed.concat(packR.placed)
                : orderForLabels ? serpentineOrder(packL.placed, leftArea, 'left')
                  .concat(serpentineOrder(packR.placed, rightArea, 'right'))
                : packL.placed.concat(packR.placed),
        paths: layered ? [packL.placed, packR.placed] : null,
        layers: layered ? [packL.layers, packR.layers] : null,
        maxJump: layered ? Math.max(packL.maxJump, packR.maxJump) : null,
        placedCount: packL.placedCount + packR.placedCount,
        requestedCount: count,
        maxCapacity: packL.maxCapacity + packR.maxCapacity,
        // 給 MLT：每個線圈邊繞在自己外側那顆齒上，c 要從那一側的齒面量
        sides: [{ area: leftArea, side: 'left', placed: packL.placed }, { area: rightArea, side: 'right', placed: packR.placed }],
      },
      needleRect: needleRect,
      clearanceRect: clearanceRect,
    };
  }
  if (layered) {
    var one = withLabels(layeredWinding(packableArea, diameter, count, 'left'));
    one.paths = [one.placed]; one.layers = [one.layers];
    one.sides = [{ area: packableArea, side: 'left', placed: one.placed }];
    return { pack: one, needleRect: null, clearanceRect: null };
  }
  var sp = settlePack(packableArea, diameter, count);
  sp.sides = [{ area: packableArea, side: 'left', placed: sp.placed }];
  return { pack: sp, needleRect: null, clearanceRect: null };
}

/** 依匝數回推線徑：槽型與總線數（匝數 × 線圈數 × 股數）固定，從「面積
 *  上限」（100% 槽滿率時的線徑，實際一定放不下）往下以標準線徑
 *  0.05 mm 一格試裸銅徑，第一個能把全部線材放進去的就是答案。用逐格往下掃而不是二分
 *  搜尋：沉降排列的容量對線徑不保證單調，二分可能跳過真正的最大值，逐
 *  格掃描保證找到網格上最大的可行線徑。漆膜厚度維持使用者輸入的值。 */
window.searchBestFill = function () {
  var out = $('findWireOut');
  var L = lastPackable;
  function show(render) { findWireRender = render; out.innerHTML = render(); out.style.display = 'block'; }
  if (!L) { findWireSig = null; show(function () { return '<span class="bad">' + mtT('findWireNoSlot') + '</span>'; }); return; }
  var fits = function (od, count) {
    var res = packWindow(L.packableArea, od, count, L.coils, L.needleWidth, L.needleClearance, false, L.mode, L.strands);
    return res.pack.placedCount >= count;
  };
  var enamel = Math.max(0, num('w_enamel', 0.025));
  var fillOf = function (od, count) { return count * Math.PI / 4 * od * od / L.windingArea * 100; };

  if ($('w_searchFix').value === 'wire') {
    // 固定線徑：從面積上限往下找第一個放得下的匝數
    var bare0 = num('w_bareDia', 0.7), od0 = bare0 + 2 * enamel, prevTurns = num('w_turns', 0);
    var per = L.coils * L.strands;
    var tMax = Math.floor(L.windingArea / (Math.PI / 4 * od0 * od0) / per);
    var best = 0;
    for (var t = tMax; t >= 1; t--) { if (fits(od0, Math.round(t * per))) { best = t; break; } }
    if (!best) { findWireSig = null; show(function () { return '<span class="bad">' + mtT('searchNoneWire') + '</span>'; }); return; }
    var n0 = Math.round(best * per), f0 = fillOf(od0, n0);
    $('w_turns').value = best;
    computeAll();
    findWireSig = lastPackable && lastPackable.sig;
    show(function () {
      return mtT('searchResultWire').replace('{d}', fmt(bare0, 3)).replace('{t}', best).replace('{n}', n0)
        .replace('{f}', fmt(f0, 1)).replace('{prev}', prevTurns);
    });
    if (typeof gaTrack === 'function') gaTrack('slotpack_search', 'wire');
    return;
  }

  // 固定匝數：從「面積上限」（100% 槽滿率的線徑）往下以標準線徑 0.05 mm 一格試，
  // 逐格往下掃而不是二分——容量對線徑不保證單調，逐格掃保證找到網格上的最大值
  var prevBare = num('w_bareDia', 0.7);
  var STEP = 0.05;
  var dAreaLimit = Math.sqrt(4 * L.windingArea / (Math.PI * L.count));
  var kStart = Math.floor((dAreaLimit - 2 * enamel) / STEP + 1e-9);
  var found = null;
  for (var k = kStart; k >= 1; k--) {
    var bare = Math.round(k * STEP * 1000) / 1000;
    if (fits(bare + 2 * enamel, L.count)) { found = bare; break; }
  }
  if (found === null) {
    findWireSig = null;
    show(function () { return '<span class="bad">' + mtT('findWireNone').replace('{n}', L.count) + '</span>'; });
    return;
  }
  var od = found + 2 * enamel, fill = fillOf(od, L.count);
  $('w_bareDia').value = found.toFixed(2);
  computeAll();
  findWireSig = lastPackable && lastPackable.sig;
  show(function () {
    return mtT('findWireResult')
      .replace('{n}', L.count).replace('{d}', found.toFixed(2)).replace('{od}', fmt(od, 3))
      .replace('{f}', fmt(fill, 1)).replace('{prev}', fmt(prevBare, 3));
  });
  if (typeof gaTrack === 'function') gaTrack('slotpack_search', 'turns');
};
window.findMaxWireDia = function () { $('w_searchFix').value = 'turns'; searchBestFill(); };

/** 回推結果只在條件完全沒變時顯示：槽型、線數、線圈數、導針通道、漆膜
 *  或裸銅徑任何一個被改過就藏起來（套用結果本身改的裸銅徑，是在記下條件
 *  之前發生的，不會把自己藏掉）。錯誤訊息也在下一次重算時清掉。 */
function updateFindWireVisibility() {
  var out = $('findWireOut');
  if (!out || out.style.display === 'none') return;
  if (!findWireSig || !lastPackable || lastPackable.sig !== findWireSig) { out.style.display = 'none'; return; }
  if (findWireRender) out.innerHTML = findWireRender(); // 語言切換時跟著換
}

/* ── 主重算 ── */
var packCtx = null;  // 這次排線成功時的結果與條件，給線圈電阻用；任何錯誤分支都會留 null
var lastRes = null;  // 最近一次算出來的電阻結果（給 DCR 連結帶 MLT 過去）
function computeAll() {
  packCtx = null;
  computeAllInner();
  updateResistance();         // 不論 computeAllInner 從哪個錯誤分支提早 return，電阻卡片都會跟著更新／清空
  updateFindWireVisibility(); // 同上
  refreshInfoPop();           // 結果卡片重畫過，開著的說明跟著換到新的按鈕
}

/* ── 線圈 MLT 與電阻（計算見 resistance.js，比照 siderpan 電阻計算）── */
function cFieldNum(id) { var v = parseFloat($(id).value); return isFinite(v) ? v : NaN; }
function fmtTpl(key, map) {
  var s = mtT(key);
  Object.keys(map).forEach(function (k) { s = s.split('{' + k + '}').join(map[k]); });
  return s;
}

function computeResistance() {
  var msgs = [];
  if (!packCtx) return null;
  var P = packCtx, pack = P.pack;
  var cs = [];
  (pack.sides || []).forEach(function (s) {
    if (!s.placed.length) return;
    var fr = toothFaceFrame(s.area, s.side);
    s.placed.forEach(function (w) { cs.push(w.x * fr.n.x + w.y * fr.n.y - fr.s0); });
  });
  if (!cs.length) return { error: 'msgNoWires' };

  var L = cFieldNum('c_stack'), r0 = Math.max(0, cFieldNum('c_r0') || 0);
  var cpp = Math.round(cFieldNum('c_cpp')), a = Math.round(cFieldNum('c_paths'));
  var lead = Math.max(0, cFieldNum('c_lead') || 0), rho = cFieldNum('c_rho');
  var tref = cFieldNum('c_tref'), top = cFieldNum('c_top');
  if (!isFinite(tref)) tref = 20;
  if (!isFinite(top)) top = tref;
  if (!(L > 0) || !(rho > 0) || !(cpp >= 1) || !(a >= 1)) return { error: 'msgBadInput' };

  var stator = statorGeometry();
  var autoB = autoToothWidth(stator);
  var bIn = cFieldNum('c_toothW'), b, bAuto = false;
  if (bIn > 0) b = bIn;
  else if (autoB) { b = autoB.b; bAuto = true; }
  else return { error: 'msgNoToothW', autoB: null };

  var i = P.linerThk;
  var m = coilMlt(cs, { L: L, b: b, i: i, r0: r0 });
  // 每個線圈的匝數：每槽 2 個線圈時每個線圈邊 N＝匝數；每槽 1 個時整個繞線窗 N＝匝數
  var Ncoil = P.count / (Math.min(Math.max(1, P.coils), 2) * P.strands);
  var w = windingResistance({ mlt: m.mlt, N: Ncoil, ns: P.strands, d: P.bareDia, rho: rho, cpp: cpp, a: a,
                              lead: lead, conn: $('c_conn').value });
  var rw = P.diameter / 2, t = m.cMax + rw;
  var kRef = copperTempFactor(tref), kTop = copperTempFactor(top);

  if (pack.placedCount < P.count) msgs.push(['warn', fmtTpl('msgPartial', { p: pack.placedCount, n: P.count, N: fmtSmart(Ncoil) })]);
  if (m.r0Clamped) msgs.push(['', fmtTpl('msgR0Clamp', { r: fmt(m.r0, 3) })]);
  if (bAuto && autoB.bMax - autoB.bMin > 0.02 * autoB.b) {
    msgs.push(['', fmtTpl('msgToothTaper', { b1: fmt(autoB.bMin, 2), b2: fmt(autoB.bMax, 2), b: fmt(autoB.b, 2) })]);
  }
  if (cpp % a !== 0) msgs.push(['warn', fmtTpl('msgCppA', { c: cpp, a: a })]);
  var Q = Math.round(num('p_slots', 0)), k = Math.min(Math.max(1, Math.round(P.coils)), 2);
  if (Q >= 3) {
    var expect = Q * k / 6;
    if (Math.abs(expect - cpp) > 1e-9) msgs.push(['', fmtTpl('msgCppQ', { q: Q, k: k, e: fmtSmart(expect), c: cpp })]);
  }
  var oh = i + t;
  [['c_hup', 'sideTop'], ['c_hdn', 'sideBottom']].forEach(function (h) {
    var H = cFieldNum(h[0]);
    if (!(H > 0)) return;
    var map = { oh: fmt(oh, 2), h: fmt(H, 2), side: mtT(h[1]), d: fmt(Math.abs(H - oh), 2) };
    msgs.push(oh > H + 1e-9 ? ['warn', fmtTpl('msgHOver', map)] : ['ok', fmtTpl('msgHOk', map)]);
  });

  var mltF = 2 * m.Lp + 2 * m.bp + Math.PI * t;
  return {
    m: m, w: w, b: b, bAuto: bAuto, i: i, t: t, oh: oh, Ncoil: Ncoil, wires: cs.length, strands: P.strands,
    tref: tref, top: top, kRef: kRef, kTop: kTop, mltF: mltF, msgs: msgs, rw: rw, L: L,
  };
}

function fmtSmart(v) { return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : fmt(v, 2); }
function fmtOhm(v) { return !isFinite(v) ? '—' : v >= 100 ? fmt(v, 1) : v >= 10 ? fmt(v, 2) : v >= 1 ? fmt(v, 3) : fmt(v, 4); }

function updateResistance() {
  var R = computeResistance();
  lastRes = R && !R.error ? R : null;
  // 齒寬留空時，欄位裡用 placeholder 顯示目前自動推算的值
  var autoB = autoToothWidth(statorGeometry());
  $('c_toothW').placeholder = autoB ? mtT('autoTag') + ' ' + fmt(autoB.b, 3) : '—';

  var kpis = $('resKpis'), out = $('resOut'), msgsEl = $('resMsgs');
  if (!R || R.error) {
    kpis.innerHTML = '';
    out.innerHTML = R ? '<span class="bad">' + mtT(R.error) + '</span>' : '—';
    msgsEl.innerHTML = '';
    renderSideView(null);
    return;
  }
  var m = R.m, w = R.w;
  var kpi = function (labelKey, tipKey, val, unit, cls) {
    return '<div class="kpi' + (cls ? ' ' + cls : '') + '"><div class="kpi-l">' + tip(mtT(labelKey), tipKey) + '</div>' +
      '<div class="kpi-v">' + val + '<span class="ru">' + unit + '</span></div></div>';
  };
  var connTxt = $('c_conn').value === 'D' ? 'Δ' : 'Y';
  kpis.innerHTML =
    kpi('kRLL', 'tipRLL', fmtOhm(w.RLL20 * R.kRef), 'Ω @ ' + fmtSmart(R.tref) + ' °C · ' + connTxt, 'main') +
    kpi('kRLLop', 'tipRLLop', fmtOhm(w.RLL20 * R.kTop), 'Ω @ ' + fmtSmart(R.top) + ' °C') +
    kpi('kRph', 'tipRph', fmtOhm(w.Rph20 * R.kRef), 'Ω @ ' + fmtSmart(R.tref) + ' °C') +
    kpi('kMlt', 'tipMlt', fmt(m.mlt, 2), 'mm') +
    kpi('kLen', 'tipLen', fmt(w.strand / 1000, 3), 'm');

  var dev = (R.mltF - m.mlt) / m.mlt * 100;
  var line = function (labelKey, tipKey, val) { return tip(mtT(labelKey), tipKey) + ': ' + val + '<br>'; };
  var rv = function (v, unit) { return '<span class="rv">' + v + '</span>' + (unit ? '<span class="ru">' + unit + '</span>' : ''); };
  out.innerHTML =
    line('outNcoil', 'tipNcoil', rv(fmtSmart(R.Ncoil)) + ' <span class="sub-note">(' + R.wires + ' × ℓ)</span>') +
    line('outToothW', 'tipToothWOut', rv(fmt(R.b, 3), 'mm') + (R.bAuto ? ' <span class="sub-note">(' + mtT('autoTag') + ')</span>' : '')) +
    line('outFrame', 'tipFrame', rv(fmt(m.Lp, 2) + ' × ' + fmt(m.bp, 2), 'mm') + ' <span class="sub-note">r₀ = ' + fmt(m.r0, 2) + '</span>') +
    line('outC', 'tipC', rv(fmt(m.cMin, 3) + ' – ' + fmt(m.cMax, 3), 'mm')) +
    line('outT', 'tipT', rv(fmt(R.t, 3), 'mm')) +
    line('outOverhang', 'tipOverhang', rv(fmt(R.oh, 3), 'mm')) +
    line('outMltF', 'tipMltF', rv(fmt(R.mltF, 2), 'mm') + ' <span class="sub-note">(' + (dev >= 0 ? '+' : '') + fmt(dev, 1) + ' %)</span>') +
    line('outRcoil', 'tipRcoil', rv(fmtOhm(w.Rcoil), 'Ω')) +
    tip(mtT('outPhaseLen'), 'tipPhaseLen') + ': ' + rv(fmt(w.phaseLen, 2), 'm');
  msgsEl.innerHTML = R.msgs.map(function (mm) { return '<li class="' + mm[0] + '">' + mm[1] + '</li>'; }).join('');
  renderSideView(R);
}

/* ── 側視圖：從徑向看一顆齒＋一個線圈。橫向＝疊厚方向（L），縱向＝齒寬方向（b）。
   每一匝是一個圓角矩形，離絕緣面 c 的那一匝：寬 L′+2c、高 b′+2c、圓角 r₀+c。 */
function rrectPath(cx, cy, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  var x = cx - w / 2, y = cy - h / 2;
  if (r <= 0) return 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z';
  return 'M' + (x + r) + ' ' + y + 'h' + (w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r +
    'v' + (h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + r + 'h' + (-(w - 2 * r)) +
    'a' + r + ' ' + r + ' 0 0 1 ' + (-r) + ' ' + (-r) + 'v' + (-(h - 2 * r)) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + (-r) + 'Z';
}
function renderSideView(R) {
  var svg = $('sideSvg');
  if (!R) { svg.innerHTML = ''; return; }
  var m = R.m, cOut = m.cMax + R.rw, cIn = Math.max(0, m.cMin - R.rw);
  var W = m.Lp + 2 * cOut, H = m.bp + 2 * cOut, big = Math.max(W, H);
  var fs = big * 0.055, padX = big * 0.08, padTop = fs * 2.6, padBot = fs * 3.2;
  svg.setAttribute('viewBox', (-W / 2 - padX) + ' ' + (-H / 2 - padTop) + ' ' + (W + 2 * padX) + ' ' + (H + padTop + padBot));
  var sw = big * 0.006;
  var html =
    '<path class="side-coil" d="' + rrectPath(0, 0, W, H, m.r0 + cOut) + '"></path>' +
    '<path class="side-gap" d="' + rrectPath(0, 0, m.Lp + 2 * cIn, m.bp + 2 * cIn, m.r0 + cIn) + '"></path>' +
    '<path class="side-ins" d="' + rrectPath(0, 0, m.Lp, m.bp, m.r0) + '" style="stroke-width:' + sw + '"></path>' +
    '<path class="side-tooth" d="' + rrectPath(0, 0, R.L, R.b, Math.max(0, m.r0 - R.i)) + '" style="stroke-width:' + sw + '"></path>' +
    '<path class="side-mean" d="' + rrectPath(0, 0, m.Lp + 2 * m.cMean, m.bp + 2 * m.cMean, m.r0 + m.cMean) +
      '" style="stroke-width:' + (sw * 2) + ';stroke-dasharray:' + (sw * 8) + ' ' + (sw * 5) + '"></path>';
  // 尺寸：上方 L′，齒中間 b′，下方 MLT
  var yDim = -H / 2 - fs * 1.2;
  html += '<g class="side-dim" style="stroke-width:' + sw + '">' +
    '<line x1="' + (-m.Lp / 2) + '" y1="' + yDim + '" x2="' + (m.Lp / 2) + '" y2="' + yDim + '"></line>' +
    '<line x1="' + (-m.Lp / 2) + '" y1="' + (yDim - fs * 0.35) + '" x2="' + (-m.Lp / 2) + '" y2="' + (yDim + fs * 0.35) + '"></line>' +
    '<line x1="' + (m.Lp / 2) + '" y1="' + (yDim - fs * 0.35) + '" x2="' + (m.Lp / 2) + '" y2="' + (yDim + fs * 0.35) + '"></line>' +
    '</g>' +
    '<text class="side-text" x="0" y="' + (yDim - fs * 0.6) + '" font-size="' + fs + '">L′ = ' + fmt(m.Lp, 2) + '</text>' +
    '<text class="side-text" x="0" y="0" font-size="' + fs + '">b′ = ' + fmt(m.bp, 2) + '</text>' +
    '<text class="side-text" x="0" y="' + (H / 2 + fs * 1.6) + '" font-size="' + fs + '">MLT = ' + fmt(m.mlt, 2) +
      ' mm · t = ' + fmt(R.t, 2) + ' mm</text>';
  svg.innerHTML = html;
}
function computeAllInner() {
  lastPackable = null;
  if (vertices.length < 3) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errFewPoints') + '</span>';
    renderSvg(null, null);
    return;
  }
  var slotArea = polygonArea(vertices);
  if (!(slotArea > 0)) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadArea') + '</span>';
    renderSvg(null, null);
    return;
  }

  var linerThk = num('w_linerThickness', 0);
  var innerPoly = linerThk > 0 ? offsetPolygonInward(vertices, linerThk) : vertices;
  var innerValid = linerThk <= 0 || isOffsetValid(vertices, innerPoly);

  if (!innerValid) {
    $('statsOut').innerHTML =
      tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
      '<span class="bad">' + mtT('errLinerTooThick') + '</span>';
    renderSvg(null, null);
    return;
  }

  // 開口喉塞不下線：繞線用的多邊形先在 y=windStartY 裁掉喉部，liner 本身（innerPoly，
  // 畫面上的綠色區域）仍然包含喉部兩側——喉部有襯墊但不繞線，這兩件事分開處理
  var windStartY = Math.max(0, num('w_windStartY', 0));
  var packableArea = clipPolygonMinY(innerPoly, windStartY);
  var windingArea = polygonArea(packableArea);
  lastWindingArea = windingArea;

  if (!(windingArea > 0)) {
    $('statsOut').innerHTML =
      tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
      '<span class="bad">' + mtT('errLinerTooThick') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var bareDia = num('w_bareDia', 0.7), enamel = num('w_enamel', 0.025);
  var turns = num('w_turns', 0), coils = num('w_coils', 1), strands = num('w_strands', 1);
  var diameter = bareDia + 2 * enamel;
  var count = Math.max(0, Math.round(turns * coils * strands));

  if (!(diameter > 0) || count <= 0) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errBadWire') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var needleWidth = Math.max(0, num('w_needleWidth', 0));
  var needleClearance = Math.max(0, num('w_needleClearance', 0));
  var openingWidth = openingWidthOf(vertices);
  if (coils >= 2 && needleWidth > 0 && openingWidth > 0 && needleWidth > openingWidth) {
    $('statsOut').innerHTML = '<span class="bad">' + mtT('errNeedleTooWide') + '</span>';
    renderSvg(innerPoly, null);
    return;
  }

  var circleArea = Math.PI / 4 * diameter * diameter;
  var fillPctArea = count * circleArea / windingArea * 100;

  // 逐顆沉降模擬：每條線材落下，貼著槽壁/槽底或已放置的線材停住，只
  // 決定於線徑/槽型本身，不用使用者設定層數/欄數——這就是整個重新設
  // 計要的「只設定匝數，工具自動排出來」。pack.maxCapacity 是同一套
  // 流程跑「不限數量」算出來的，直接回答「這個槽到底塞不塞得下」。
  // 雙層繞組（Coils/slot >= 2）：繞線窗先切成左右兩個獨立線圈邊（中間
  // 留一道「導針通道寬度」當間隙——這是相間絕緣/導針空間，跟貼槽壁的
  // liner厚度是不同的東西，不能共用同一個數字），各自往自己真正的外
  // 側槽壁沉降（settlePackTowardWall）、各自算自己的容量——理論上只會
  // 佔其中一邊，不是整個繞線窗混在一起看起來像單層。單層（Coils/slot
  // <= 1）：沒有單一偏向的槽壁可貼，整個繞線窗當一池子往槽底沉降，維
  // 持原樣，也沒有中間通道這個概念。
  var packMode = $('w_packMode').value;
  var packed = packWindow(packableArea, diameter, count, coils, needleWidth, needleClearance, true, packMode, strands);
  var pack = packed.pack, needleRect = packed.needleRect;
  window.mtSlotLastPack = pack; // 給自動測試讀目前的排線結果（含層號、順序）
  packCtx = { pack: pack, count: count, coils: coils, strands: Math.max(1, Math.round(strands)), diameter: diameter,
              bareDia: bareDia, linerThk: Math.max(0, linerThk) };
  renderSvg(innerPoly, pack, needleRect, packed.clearanceRect);

  lastPackable = {
    packableArea: packableArea, windingArea: windingArea, count: count, coils: coils,
    needleWidth: needleWidth, needleClearance: needleClearance, mode: packMode, strands: strands,
    sig: [JSON.stringify(packableArea), count, coils, needleWidth, needleClearance, enamel, bareDia, packMode].join('|'),
  };

  var maxFillPct = pack.maxCapacity * circleArea / windingArea * 100;
  var fillClass = fillPctArea > 100 ? 'bad' : (fillPctArea > 85 ? 'warn' : '');
  var packedClass = pack.placedCount >= count ? '' : 'warn';
  var packedNote = pack.placedCount >= count ? mtT('packedAll') : mtT('packedPartial');
  lastMaxCapacity = pack.maxCapacity; lastCoils = coils; lastStrands = strands;
  // 「填滿到最大容量」按鈕放在「最大容量」這個數字後面（不是放在上面的
  // 「實際容納」那行）——按鈕的目標值就是這個數字，放在旁邊比較直覺。
  // 顯示條件：只要目前的匝數換算回去不等於「剛好用滿容量」的匝數，不
  // 管是塞不下（要減少）還是還有空間（可以加多），都該讓使用者一鍵套
  // 用；剛好已經是最大匝數時沒有東西好填，不顯示。
  var maxTurns = Math.floor(pack.maxCapacity / (coils * strands));
  var applyMaxBtn = (maxTurns >= 1 && maxTurns !== turns)
    ? ' <button class="mini-btn" onclick="applyMaxTurns()">' + mtT('applyMaxBtn') + '</button>' : '';

  $('statsOut').innerHTML =
    tip(mtT('outSlotArea'), 'tipSlotArea') + ': <span class="rv">' + fmt(slotArea, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWindingArea'), 'tipWindingArea') + ': <span class="rv">' + fmt(windingArea, 2) + '</span><span class="ru">mm²</span><br>' +
    tip(mtT('outWireOd'), 'outWireOdTip') + ' = <span class="rv">' + fmt(diameter, 4) + '</span><span class="ru">mm</span>' +
      ' <span class="sub-note">(' + fmt(bareDia, 3) + ' + 2×' + fmt(enamel, 3) + ')</span><br>' +
    mtT('outCount') + ' = <span class="rv">' + count + '</span><br>' +
    tip(mtT('outFillArea'), 'outFillAreaTip') + ' = <span class="rv ' + fillClass + '">' + fmt(fillPctArea, 1) + '</span><span class="ru">%</span><br>' +
    tip(mtT('outPacked'), 'outPackedTip') + ': <span class="rv ' + packedClass + '">' + pack.placedCount + ' / ' + count + '</span>' +
      ' <span class="ru">(' + packedNote + ')</span><br>' +
    tip(mtT('outMaxCapacity'), 'tipMaxCapacity') + ' = <span class="rv">' + pack.maxCapacity + '</span>' + applyMaxBtn + '<br>' +
    tip(mtT('outMaxFillArea'), 'outMaxFillAreaTip') + ' = <span class="rv">' + fmt(maxFillPct, 1) + '</span><span class="ru">%</span>' +
    layerStats(pack);
}

/** 規則往返模式的限制檢查：各線圈邊的層數（要偶數）與最大換層跳距（≤ 3 節距） */
function layerStats(pack) {
  if (!pack.layers) return '';
  var ok = '<span class="ok-mark">✓</span>', no = '<span class="bad">✗</span>';
  var L = pack.layers, total = L.reduce(function (a, b) { return a + b; }, 0);
  var allEven = L.every(function (n) { return n % 2 === 0; });
  var layersTxt = L.length === 2
    ? mtT('sideL') + ' ' + L[0] + ' ／ ' + mtT('sideR') + ' ' + L[1] + ' <span class="ru">(' + mtT('totalLayers') + ' ' + total + ')</span>'
    : String(L[0]);
  var jumpOk = pack.maxJump <= LAYER_MAX_JUMP + 1e-9;
  return '<br>' + tip(mtT('outLayers'), 'outLayersTip') + ': <span class="rv">' + layersTxt + '</span> ' + (allEven && total > 0 ? ok : no) +
    '<br>' + tip(mtT('outJump'), 'outJumpTip') + ' = <span class="rv">' + fmt(pack.maxJump, 2) + '</span>' +
    '<span class="ru"> × ' + mtT('pitchUnit') + ' (≤ ' + LAYER_MAX_JUMP + ')</span> ' + (jumpOk ? ok : no);
}

/* ── 存檔／讀檔 ──
 * 存成使用者自己保管的 .json 檔（不放 localStorage）：可以跟專案資料一起
 * 歸檔、寄給同事、換電腦也能開。內容是「重現這個畫面需要的全部輸入」：
 * 左半邊頂點（不是由參數重新產生，自訂頂點的編輯也要留住）、參數化欄位、
 * 線材欄位、目前的模式。算出來的結果不存，開檔後照當時的程式重算。 */
var FILE_KIND = 'motor-toolkit/slot-packing';
var PARAM_IDS = ['p_slotType', 'p_bs0', 'p_hs0', 'p_hs1', 'p_bs1', 'p_bs2', 'p_hs2', 'p_rs', 'p_rs0', 'p_dsi',
                 'p_slots', 'p_dso', 'p_view',
                 'p_openWidth', 'p_openHeight', 'p_topWidth', 'p_bottomWidth', 'p_depth'];
var WIRE_IDS = ['w_packMode', 'w_searchFix', 'w_bareDia', 'w_enamel', 'w_turns', 'w_coils', 'w_strands', 'w_needleWidth', 'w_needleClearance',
                'w_linerThickness', 'w_windStartY'];
var COIL_IDS = ['c_stack', 'c_toothW', 'c_r0', 'c_cpp', 'c_paths', 'c_lead', 'c_conn', 'c_rho', 'c_tref', 'c_top', 'c_hup', 'c_hdn'];
var ALL_IDS = PARAM_IDS.concat(WIRE_IDS, COIL_IDS);
var fileStatus = null; // { key, name } — 切換語言時重畫狀態訊息

function showFileStatus(key, name) {
  fileStatus = key ? { key: key, name: name } : null;
  var el = $('fileStatus');
  el.style.display = key ? '' : 'none';
  if (key) el.textContent = mtT(key).replace('{name}', name);
  el.classList.toggle('bad', key === 'fileBad' || key === 'dxfNone');
}

window.saveSlotFile = function () {
  var inputs = {};
  ALL_IDS.forEach(function (id) { inputs[id] = $(id).value; });
  var data = {
    kind: FILE_KIND,
    version: 5,
    savedAt: new Date().toISOString(),
    rotor: rotor,
    shapeMode: shapeMode,
    halfVertices: copyHalf(halfVertices),
    inputs: inputs,
  };
  var d = new Date();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var name = 'slot-packing_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
    pad(d.getHours()) + pad(d.getMinutes()) + '.json';
  var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  showFileStatus('fileSaved', name);
  if (typeof gaTrack === 'function') gaTrack('slotpack_save', shapeMode);
};

/* ── DXF 線圖匯出（AutoCAD R12 格式，幾乎所有 CAD 都讀得到）──
 * 方向跟「真實方向」畫面一樣：槽底朝 +Y；有定子內徑時原點放在定子中心，
 * 不然放在槽口中點。單位 mm。槽型外框用定義點＋bulge 寫，CAD 裡就是真正的
 * 圓弧（不是拆成短線段）；liner 是內縮後的多邊形，線材是 CIRCLE＋匝號。 */
function fileStamp() {
  var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
}
function downloadText(name, text, type) {
  var url = URL.createObjectURL(new Blob([text], { type: type }));
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/** 槽型外框的定義點（左半＋鏡射，不展開圓弧）與每一段的圓弧半徑 */
function slotRingWithArcs() {
  var n = halfVertices.length, pts = [], rs = [];
  for (var i = 0; i < n; i++) {
    pts.push({ x: halfVertices[i].x, y: halfVertices[i].y });
    rs.push(Number(halfVertices[i].r) || 0); // 到下一點（最後一點：槽底，到自己的鏡射點）
  }
  var last = halfVertices[n - 1], bottomOnAxis = Math.abs(last.x) < 1e-12;
  if (bottomOnAxis) rs[n - 1] = 0;
  for (var k = n - (bottomOnAxis ? 2 : 1); k >= 0; k--) {
    pts.push({ x: -halfVertices[k].x, y: halfVertices[k].y });
    rs.push(k > 0 ? (Number(halfVertices[k - 1].r) || 0) : (Number(halfVertices[0].ro) || 0)); // 最後一段：槽口
  }
  return { pts: pts, rs: rs };
}

function buildSlotDxf() {
  // 槽一律朝 +Y（從定子中心往外看這個槽）：內轉 Y = y − yc；外轉的槽在中心的 −y 側，
  // 上下鏡射成 Y = yc − y。鏡射會反轉繞行方向，所以圓弧 bulge 也要乘上 dir。
  var g = lastDraw && lastDraw.stator, oy = g ? g.yc : 0, dir = g ? g.dir : 1;
  var X = function (x) { return x.toFixed(6); }, Y = function (y) { return (dir * (y - oy)).toFixed(6); };
  var out = [];
  var e = function () { for (var i = 0; i < arguments.length; i++) out.push(String(arguments[i])); };
  var polyline = function (layer, pts, closed, bulges) {
    e(0, 'POLYLINE', 8, layer, 66, 1, 70, closed ? 1 : 0, 10, 0, 20, 0, 30, 0);
    pts.forEach(function (p, i) {
      e(0, 'VERTEX', 8, layer, 10, X(p.x), 20, Y(p.y), 30, 0);
      if (bulges && bulges[i]) e(42, bulges[i].toFixed(9));
    });
    e(0, 'SEQEND', 8, layer);
  };
  var arc = function (layer, R, a0, a1) { e(0, 'ARC', 8, layer, 10, X(0), 20, Y(oy), 30, 0, 40, R.toFixed(6), 50, a0.toFixed(6), 51, a1.toFixed(6)); };
  var line = function (layer, p, q) { e(0, 'LINE', 8, layer, 10, X(p.x), 20, Y(p.y), 30, 0, 11, X(q.x), 21, Y(q.y), 31, 0); };

  var layers = [['STATOR', 8], ['SLOT', 7], ['LINER', 3], ['NEEDLE', 5], ['WIRE', 2], ['WIRE_NO', 1]];
  e(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 0, 'ENDSEC');
  e(0, 'SECTION', 2, 'TABLES');
  e(0, 'TABLE', 2, 'LTYPE', 70, 1, 0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, '0.0', 0, 'ENDTAB');
  e(0, 'TABLE', 2, 'LAYER', 70, layers.length);
  layers.forEach(function (L) { e(0, 'LAYER', 2, L[0], 70, 0, 62, L[1], 6, 'CONTINUOUS'); });
  e(0, 'ENDTAB', 0, 'ENDSEC');
  e(0, 'SECTION', 2, 'ENTITIES');

  // 槽型外框：bulge＝tan(圓心角/4)，正值＝從這一點逆時針繞到下一點（Y 朝上）
  var ring = slotRingWithArcs(), m = ring.pts.length;
  var area2 = 0;
  for (var i = 0; i < m; i++) { var a = ring.pts[i], b = ring.pts[(i + 1) % m]; area2 += a.x * b.y - b.x * a.y; }
  var side = area2 >= 0 ? 1 : -1;
  var bulges = ring.pts.map(function (A, i) {
    var r = ring.rs[i]; if (!r) return 0;
    var B = ring.pts[(i + 1) % m], dx = B.x - A.x, dy = B.y - A.y, c = Math.hypot(dx, dy);
    if (c < 1e-12 || Math.abs(r) < c / 2 * (1 - 1e-9)) return 0;
    var inward = { x: -dy / c * side, y: dx / c * side };
    var bulgeDir = r > 0 ? { x: -inward.x, y: -inward.y } : inward;
    var theta = 2 * Math.asin(Math.min(1, c / (2 * Math.abs(r))));
    var right = bulgeDir.x * dy - bulgeDir.y * dx > 0; // 凸向弦的右側＝逆時針
    return dir * (right ? 1 : -1) * Math.tan(theta / 4);
  });
  polyline('SLOT', ring.pts, true, bulges);

  if (lastDraw.innerPoly) polyline('LINER', openingAwarePoints(lastDraw.innerPoly), false);
  var nr = lastDraw.needleRect;
  if (nr) polyline('NEEDLE', [{ x: nr.x, y: nr.y }, { x: nr.x + nr.width, y: nr.y },
    { x: nr.x + nr.width, y: nr.y + nr.height }, { x: nr.x, y: nr.y + nr.height }], true);
  (lastDraw.pack ? lastDraw.pack.placed : []).forEach(function (c, idx) {
    e(0, 'CIRCLE', 8, 'WIRE', 10, X(c.x), 20, Y(c.y), 30, 0, 40, (c.d / 2).toFixed(6));
    e(0, 'TEXT', 8, 'WIRE_NO', 10, X(c.x), 20, Y(c.y), 30, 0, 40, (c.d * 0.4).toFixed(6), 1, c.label || idx + 1,
      72, 1, 11, X(c.x), 21, Y(c.y), 31, 0, 73, 2);
  });

  if (g && g.Q) {
    // 一個槽距的定子：軛部那一側的完整圓弧、兩側到相鄰齒中心的徑向線、氣隙側圓弧（扣掉槽口）
    var deg = 180 / Math.PI, h = g.half * deg, F = halfVertices[0];
    var thR = Math.atan2(dir * (F.y - g.yc), Math.abs(F.x)) * deg;
    arc('STATOR', g.Ryoke, 90 - h, 90 + h);
    arc('STATOR', g.Rgap, 90 - h, thR);
    arc('STATOR', g.Rgap, 180 - thR, 90 + h);
    line('STATOR', statorPt(g, -g.half, g.Rin), statorPt(g, -g.half, g.Rout));
    line('STATOR', statorPt(g, g.half, g.Rin), statorPt(g, g.half, g.Rout));
  }
  e(0, 'ENDSEC', 0, 'EOF');
  return out.join('\r\n') + '\r\n';
}

window.exportSlotDxf = function () {
  if (!lastDraw || vertices.length < 3) { showFileStatus('dxfNone', ''); return; }
  var name = 'slot-packing_' + fileStamp() + '.dxf';
  downloadText(name, buildSlotDxf(), 'application/dxf');
  showFileStatus('dxfSaved', name);
  if (typeof gaTrack === 'function') gaTrack('slotpack_dxf', shapeMode);
};

/** 驗證後套用；任何一項不對就整個不套用，不會只還原一半 */
function applySlotFile(data) {
  if (!data || data.kind !== FILE_KIND || !Array.isArray(data.halfVertices) || data.halfVertices.length < 2) return false;
  var hv = data.halfVertices.map(function (v) {
    var c = { x: Number(v && v.x), y: Number(v && v.y) };
    if (v && v.r !== undefined && v.r !== null) c.r = Number(v.r);
    if (v && v.ro !== undefined && v.ro !== null) c.ro = Number(v.ro);
    return c;
  });
  if (hv.some(function (v) {
    return !isFinite(v.x) || !isFinite(v.y) || (v.r !== undefined && !isFinite(v.r)) || (v.ro !== undefined && !isFinite(v.ro));
  })) return false;
  hv.forEach(function (v) { if (!v.r) delete v.r; if (!v.ro) delete v.ro; });
  var inputs = data.inputs || {};
  // 第 5 版以前沒有內轉／外轉：當時只有內轉。檔案的型式直接取代目前這一組，不另外存
  var fileRotor = data.rotor === 'outer' ? 'outer' : 'inner';
  if (fileRotor !== rotor) {
    rotor = fileRotor;
    vertexHistory = [];
    applyRotorUi();
  }
  pushVertexHistory();
  ALL_IDS.forEach(function (id) {
    if (inputs[id] !== undefined && inputs[id] !== null) $(id).value = String(inputs[id]);
  });
  // 舊檔沒有排線方式：當時只有沉降模擬
  if (!inputs.w_packMode) $('w_packMode').value = 'settle';
  // 第 1 版檔案還沒有槽型選單，當時的參數化只有簡易梯形
  if (!inputs.p_slotType) $('p_slotType').value = data.version >= 2 ? '1' : 'trap';
  updateSlotTypeFields();
  updatePackModeHint();
  showSlotParamError(null);
  halfVertices = hv;
  syncVerticesFromHalf();
  renderVertexTable();
  switchShapeMode(data.shapeMode === 'custom' ? 'custom' : 'param'); // 會順便 computeAll()
  return true;
}

function openSlotFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var data = null;
    try { data = JSON.parse(reader.result); } catch (e) { /* 留給下面一起報錯 */ }
    showFileStatus(applySlotFile(data) ? 'fileLoaded' : 'fileBad', file.name);
    if (typeof gaTrack === 'function') gaTrack('slotpack_open', data && data.shapeMode || 'bad');
  };
  reader.onerror = function () { showFileStatus('fileBad', file.name); };
  reader.readAsText(file);
}

/* ── 事件綁定 ── */
/* ── 跟 DCR Calculator 的雙向連結 ──
 * 兩個工具都要輸入同一組線材參數（匝數/線圈數/股數/裸銅徑/漆膜厚
 * 度），用URL query string帶一次性的「現在這組數字」過去確認，不做成
 * 持久共用的localStorage——不是要兩個工具隨時同步狀態。槽面積也一併
 * 帶過去（DCR自己的槽面積欄位預設是固定小數字，不帶的話DCR算出來的
 * 槽滿率會對不上這裡真實算出來的槽型，容易誤判成爆滿）。 */
window.openInDcrCalculator = function () {
  var params = new URLSearchParams();
  params.set('turns', num('w_turns', 0));
  params.set('coils', num('w_coils', 1));
  params.set('strands', num('w_strands', 1));
  params.set('bareDia', num('w_bareDia', 0.7));
  params.set('enamel', num('w_enamel', 0.025));
  if (lastWindingArea > 0) params.set('slotArea', lastWindingArea.toFixed(4));
  // 這裡由實際排線算出來的 MLT 與疊厚一起帶過去，DCR 就不用靠「疊厚 × 係數」估 MLT
  if (lastRes) {
    params.set('mlt', lastRes.m.mlt.toFixed(3));
    params.set('stack', lastRes.L);
  }
  window.open('../dcr-calculator/index.html?' + params.toString(), '_blank');
};
/** 從 DCR Calculator 帶過來的參數：有帶到的欄位覆蓋掉預設值，其餘（槽
 *  型本身、liner、導針通道……）維持不變，在 generateFromParametric()
 *  跑第一次 computeAll() 之前先套用，不然畫面會先閃一次預設值。 */
function applyIncomingParams() {
  var p = new URLSearchParams(window.location.search);
  var keys = { turns: 'w_turns', coils: 'w_coils', strands: 'w_strands', bareDia: 'w_bareDia', enamel: 'w_enamel' };
  Object.keys(keys).forEach(function (k) {
    if (p.has(k)) { var v = parseFloat(p.get(k)); if (isFinite(v)) $(keys[k]).value = v; }
  });
}

/* ── 內轉／外轉切換 ──
 * 兩種各自保留一整組輸入值與頂點（跟 siderpan 電阻計算一樣），切回來還原。
 * 外轉子的預設值照 siderpan 的外轉子預設範例換算成這裡的槽型參數：齒寬 4、
 * 疊厚 15、可繞線長度 6、軛部 R_y 16、12 槽、Dso 47、Di 26、槽口 2，
 * 線徑 0.35／外徑 0.395、60 匝、絕緣 0.3、r₀ 0.5。槽型 5 的同心槽底就是 R_y。 */
var OUTER_DEFAULTS = {
  p_slotType: '5', p_bs0: '2', p_hs0: '0.519', p_hs1: '0.77', p_bs1: '7.75', p_bs2: '4.354', p_hs2: '6.338',
  p_rs0: '0', p_rs: '0.5', p_dsi: '47', p_slots: '12', p_dso: '26', p_view: 'real',
  p_openWidth: '2', p_openHeight: '0.8', p_topWidth: '7.5', p_bottomWidth: '4.4', p_depth: '7.6',
  w_packMode: 'layer', w_searchFix: 'wire', w_bareDia: '0.35', w_enamel: '0.0225', w_turns: '60', w_coils: '2', w_strands: '1',
  w_needleWidth: '0', w_needleClearance: '0', w_linerThickness: '0.3',
  c_stack: '15', c_toothW: '', c_r0: '0.5', c_cpp: '4', c_paths: '1', c_lead: '40', c_conn: 'Y', c_rho: '0.017241',
  c_tref: '20', c_top: '110', c_hup: '', c_hdn: '',
};
var rotorState = { inner: null, outer: { vals: OUTER_DEFAULTS, half: null, shapeMode: 'param' } };

function snapshotInputs() {
  var o = {};
  ALL_IDS.forEach(function (id) { o[id] = $(id).value; });
  return o;
}
/** 只更新畫面上跟型式有關的部分（分頁、欄位名稱、顯示方向那一列），不動數值 */
function applyRotorUi() {
  var outer = rotor === 'outer';
  $('tabInner').classList.toggle('active', !outer);
  $('tabOuter').classList.toggle('active', outer);
  $('lblDsi').setAttribute('data-i18n', outer ? 'statorDsiOuter' : 'statorDsi');
  $('lblDso').setAttribute('data-i18n', outer ? 'statorDiOuter' : 'statorDso');
  $('lblDsi').textContent = mtT($('lblDsi').getAttribute('data-i18n'));
  $('lblDso').textContent = mtT($('lblDso').getAttribute('data-i18n'));
  $('viewRow').style.display = outer ? 'none' : ''; // 外轉子的真實方向本來就是槽口朝上
  injectInfoButtons();
  refreshInfoPop();
}
window.switchRotor = function (r) {
  if (r !== 'outer') r = 'inner';
  if (r === rotor) return;
  rotorState[rotor] = { vals: snapshotInputs(), half: copyHalf(halfVertices), shapeMode: shapeMode };
  rotor = r;
  resetZoom();
  vertexHistory = []; // 復原只在同一種型式裡有意義
  $('btnUndoVertex').disabled = true;
  applyRotorUi();
  var st = rotorState[r];
  ALL_IDS.forEach(function (id) { if (st.vals[id] !== undefined) $(id).value = st.vals[id]; });
  updateSlotTypeFields();
  updatePackModeHint();
  showSlotParamError(null);
  showFileStatus(null);
  if (st.half && st.half.length >= 2) {
    halfVertices = copyHalf(st.half);
    syncVerticesFromHalf();
    renderVertexTable();
    switchShapeMode(st.shapeMode === 'custom' ? 'custom' : 'param'); // 會順便 computeAll()
  } else {
    shapeMode = 'param';
    $('tabParam').classList.add('active'); $('tabCustom').classList.remove('active');
    $('paramPanel').style.display = ''; $('customPanel').style.display = 'none';
    generateFromParametric();
    vertexHistory = []; // generate 會存一次快照（另一種型式的頂點），不能留著讓復原跳回去
    $('btnUndoVertex').disabled = true;
  }
  try { history.replaceState(null, '', r === 'outer' ? '#outer' : '#inner'); } catch (e) { /* file:// 等環境可能不允許 */ }
  if (typeof gaTrack === 'function') gaTrack('slotpack_rotor', r);
};

/* ── 「?」說明 popover ──
 * 每個欄位列、區塊標題（data-info="key"）與結果標籤旁邊都有一顆「?」，點開
 * 顯示標題＋說明（＋公式）。內容依目前的槽型／排線方式／內外轉而變的，用
 * INFO_DYNAMIC 即時組。語言切換時 shell 會重寫標籤文字（按鈕跟著被清掉），
 * 所以 injectInfoButtons() 在每次 mt-lang-change 之後再補一次。 */
var INFO_DYNAMIC = {
  iShape: function () { return mtT(shapeMode === 'param' ? 'paramHint' : 'customHint'); },
  iSlotType: function () {
    var t = $('p_slotType').value;
    return mtT('slotTypeHint' + t) + (t === 'trap' ? '' : '\n\n' + mtT(rotor === 'outer' ? 'dsiHintOuter' : 'dsiHint'));
  },
  iDsi: function () { return mtT(rotor === 'outer' ? 'iDsiOuter' : 'iDsiInner'); },
  iDso: function () { return mtT(rotor === 'outer' ? 'iDsoOuter' : 'iDsoInner'); },
  iVertices: function () { return mtT('vertexHint') + '\n\n' + mtT('arcHint') + '\n\n' + mtT('customHint'); },
  iPackMode: function () { return mtT('packModeHint' + $('w_packMode').value); },
};
var infoOpen = null; // { key, btn }

function injectInfoButtons() {
  document.querySelectorAll('[data-info]').forEach(function (host) {
    if (host.classList.contains('info-btn')) return;
    var label = host.classList.contains('section-title') ? host : host.querySelector('.param-label');
    if (!label || label.querySelector('.info-btn')) return;
    attachInfoButton(label, host.getAttribute('data-info'));
  });
}
/** 標籤最後一個字跟「?」包進同一個不換行的 span：長標籤換行時「?」跟著最後一個字，
 *  不會自己掉到下一行（中文標籤沒有空格，整段都會包進去，一樣不會斷開）。 */
function attachInfoButton(label, key) {
  var walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT), n, last = null;
  while ((n = walker.nextNode())) if (n.nodeValue.trim()) last = n;
  var glue = document.createElement('span');
  glue.className = 'info-glue';
  if (last) {
    var txt = last.nodeValue.replace(/\s+$/, ''), k = txt.search(/\S+$/);
    glue.textContent = txt.slice(k);
    last.nodeValue = txt.slice(0, k);
    last.parentNode.insertBefore(glue, last.nextSibling);
  } else {
    label.appendChild(glue);
  }
  glue.insertAdjacentHTML('beforeend', infoButton(key));
}
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function infoTitleOf(btn) {
  var host = btn.closest('.param-label, .section-title, .tip-label') || btn.parentNode;
  var c = host.cloneNode(true);
  c.querySelectorAll('.info-btn').forEach(function (x) { x.remove(); });
  return c.textContent.trim();
}
function fillInfoPop() {
  var key = infoOpen.key, btn = infoOpen.btn;
  var body = INFO_DYNAMIC[key] ? INFO_DYNAMIC[key]() : mtT(key);
  var html = '<div class="info-title">' + escHtml(infoTitleOf(btn)) + '</div>' +
    escHtml(body).split(/\n\n/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  if (MT_I18N[key + 'F']) html += '<pre class="info-formula">' + escHtml(mtT(key + 'F')) + '</pre>';
  $('infoPopBody').innerHTML = html;
  $('infoPop').querySelector('.info-x').setAttribute('aria-label', mtT('infoClose'));
}
function placeInfoPop() {
  var pop = $('infoPop'), r = infoOpen.btn.getBoundingClientRect();
  pop.style.left = '0px'; pop.style.top = '0px';
  var w = pop.offsetWidth, h = pop.offsetHeight;
  var left = Math.min(Math.max(8, r.left - 14), window.innerWidth - w - 8);
  var top = r.bottom + 8;
  if (top + h > window.innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
  pop.style.left = left + 'px';
  pop.style.top = Math.max(8, top) + 'px';
}
function openInfo(btn) {
  if (infoOpen) infoOpen.btn.setAttribute('aria-expanded', 'false');
  infoOpen = { key: btn.getAttribute('data-info'), btn: btn };
  btn.setAttribute('aria-expanded', 'true');
  $('infoPop').hidden = false;
  fillInfoPop();
  placeInfoPop();
  if (typeof gaTrack === 'function') gaTrack('slotpack_info', infoOpen.key);
}
function closeInfo() {
  if (!infoOpen) return;
  infoOpen.btn.setAttribute('aria-expanded', 'false');
  $('infoPop').hidden = true;
  infoOpen = null;
}
/** 內容跟著目前狀態（語言、槽型、重畫過的結果卡片）更新；按鈕被重畫掉就找同一個 key 的新按鈕 */
function refreshInfoPop() {
  if (!infoOpen || !$('infoPop')) return;
  if (!document.body.contains(infoOpen.btn)) {
    var nb = document.querySelector('.info-btn[data-info="' + infoOpen.key + '"]');
    if (!nb || !nb.offsetParent) { closeInfo(); return; }
    infoOpen.btn = nb;
    nb.setAttribute('aria-expanded', 'true');
  }
  fillInfoPop();
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.info-btn');
  if (b) {
    e.preventDefault();
    if (infoOpen && infoOpen.btn === b) closeInfo(); else openInfo(b);
    return;
  }
  if (infoOpen && (e.target.closest('.info-x') || !$('infoPop').contains(e.target))) closeInfo();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && infoOpen) { var b = infoOpen.btn; closeInfo(); if (document.body.contains(b)) b.focus(); }
});
document.addEventListener('scroll', function (e) {
  if (infoOpen && !$('infoPop').contains(e.target)) closeInfo();
}, true);
window.addEventListener('resize', closeInfo);

document.addEventListener('DOMContentLoaded', function () {
  $('btnGenerate').addEventListener('click', generateFromParametric);
  $('btnSearchBest').addEventListener('click', searchBestFill);
  $('btnExportDxf').addEventListener('click', exportSlotDxf);
  ['p_slots', 'p_dso'].forEach(function (id) { $(id).addEventListener('input', computeAll); });
  $('p_view').addEventListener('change', computeAll);
  $('w_packMode').addEventListener('change', function () { updatePackModeHint(); computeAll(); });
  document.addEventListener('mt-lang-change', updatePackModeHint);
  $('v_openingR').addEventListener('focus', function () { pushVertexHistory(); });
  $('v_openingR').addEventListener('input', function () {
    var v = parseFloat(this.value);
    if (this.value.trim() === '' || v === 0) delete halfVertices[0].ro;
    else if (isFinite(v)) halfVertices[0].ro = v;
    else return;
    syncVerticesFromHalf(); computeAll();
  });
  // 換槽型：只顯示該槽型的欄位，並直接用新槽型重新產生（會先存 Undo 快照）
  $('p_slotType').addEventListener('change', function () {
    updateSlotTypeFields();
    generateFromParametric();
    if (typeof gaTrack === 'function') gaTrack('slotpack_slot_type', this.value);
  });
  document.addEventListener('mt-lang-change', updateSlotTypeFields);
  document.addEventListener('mt-lang-change', showArcProblems);
  $('btnAddPoint').addEventListener('click', addVertexPoint);
  $('btnUndoVertex').addEventListener('click', undoVertices);
  $('btnSaveFile').addEventListener('click', saveSlotFile);
  $('btnOpenFile').addEventListener('click', function () { $('fileInput').click(); });
  $('fileInput').addEventListener('change', function () {
    if (this.files && this.files[0]) openSlotFile(this.files[0]);
    this.value = ''; // 同一個檔案再選一次也要觸發 change
  });

  ['w_bareDia', 'w_enamel', 'w_turns', 'w_coils', 'w_strands', 'w_linerThickness', 'w_needleWidth', 'w_needleClearance', 'w_windStartY']
    .forEach(function (id) { $(id).addEventListener('input', computeAll); });
  // 線圈與電阻：只影響電阻卡片，不必重排線
  COIL_IDS.forEach(function (id) {
    $(id).addEventListener($(id).tagName === 'SELECT' ? 'change' : 'input', function () { updateResistance(); refreshInfoPop(); });
  });

  document.addEventListener('mt-lang-change', injectInfoButtons);
  document.addEventListener('mt-lang-change', computeAll);
  document.addEventListener('mt-lang-change', function () {
    if (fileStatus) showFileStatus(fileStatus.key, fileStatus.name);
  });
  document.addEventListener('mt-theme-change', function () { computeAll(); });

  injectInfoButtons();
  attachZoomPan($('packingSvg'));
  // 網址 #outer 直接開外轉子：內轉子的 HTML 預設值先存起來，切回去才還原得到
  if (/^#outer$/i.test(window.location.hash)) {
    rotorState.inner = { vals: snapshotInputs(), half: null, shapeMode: 'param' };
    rotor = 'outer';
    ALL_IDS.forEach(function (id) { if (OUTER_DEFAULTS[id] !== undefined) $(id).value = OUTER_DEFAULTS[id]; });
    applyRotorUi();
  }
  applyIncomingParams();
  updatePackModeHint();
  updateSlotTypeFields();
  generateFromParametric(); // 進頁面先用預設參數產生一組起始外形，不留空白畫面
});

})();
