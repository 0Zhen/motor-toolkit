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
  slotTypeHint5:{ en: 'Sloped shoulder (Hs1), body Bs1 → Bs2 over Hs2 (to the Bs2 chord), then an arc bottom concentric with the stator through both Bs2 ends — its radius follows from Dsi.',
                  zh: '斜肩（Hs1），槽身 Bs1 → Bs2（Hs2 量到 Bs2 弦），之後是通過 Bs2 兩端、跟定子同心的圓弧槽底——半徑由 Dsi 算出。' },
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
};

(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var mtT = window.mtT || function (k) { return (MT_I18N[k] && MT_I18N[k].en) || k; };

var shapeMode = 'param';
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
function tip(label, key) {
  return '<span class="formula-tip" title="' + window.mtT(key).replace(/"/g, '&quot;') + '">' + label + '</span>';
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

function updatePackModeHint() { $('packModeHint').textContent = mtT('packModeHint' + $('w_packMode').value); }

/* ── 參數化槽型（RMxprt 1–5／簡易梯形）── */
function readRmxprtParams() {
  return {
    bs0: num('p_bs0', NaN), hs0: num('p_hs0', NaN), hs1: num('p_hs1', NaN), bs1: num('p_bs1', NaN),
    bs2: num('p_bs2', NaN), hs2: num('p_hs2', NaN), rs: num('p_rs', 0), dsi: num('p_dsi', NaN),
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
  $('slotTypeHint').textContent = mtT('slotTypeHint' + type) + (type === 'trap' ? '' : ' ' + mtT('dsiHint'));
  if (slotParamErrKey) showSlotParamError(slotParamErrKey);
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

/** 鐵芯底色：槽口是圓弧（定子內徑）時，鐵芯上緣沿同一個圓（氣隙那側留白），
 *  不然就是從槽口那條線往下的矩形。 */
function laminationShape(bbox, vx, vy, vw, vh) {
  var F = halfVertices[0], ro = F && Number(F.ro);
  if (!ro || ro > 0 || Math.abs(ro) <= Math.abs(F.x)) {
    return '<rect class="slot-lamination" x="' + vx + '" y="' + bbox.minY + '" width="' + vw + '" height="' + (vy + vh - bbox.minY) + '"></rect>';
  }
  var R = Math.abs(ro), yc = F.y - Math.sqrt(R * R - F.x * F.x); // 定子中心（槽口上方）
  var pts = [];
  for (var k = 0; k <= 80; k++) {
    var x = vx + vw * k / 80, dx = Math.min(Math.abs(x), R);
    pts.push(x + ',' + (yc + Math.sqrt(R * R - dx * dx)));
  }
  pts.push((vx + vw) + ',' + (vy + vh), vx + ',' + (vy + vh));
  return '<polygon class="slot-lamination" points="' + pts.join(' ') + '"></polygon>';
}

/* ── SVG 繪製：紅=鐵芯、綠=liner內縮後的繞線窗、黃=導線（仿 Motor-CAD 配色） ── */
function renderSvg(innerPoly, pack, needleRect, clearanceRect) {
  var svg = $('packingSvg');
  if (vertices.length < 3) { svg.innerHTML = ''; return; }

  var bbox = polygonBBox(vertices);
  var w = bbox.maxX - bbox.minX, h = bbox.maxY - bbox.minY;
  var maxDim, vx, vy, vw, vh;
  if (dragView) {
    // 拖曳中：沿用按下時的視野，比例尺、線寬、字級、控點大小都不變
    maxDim = dragView.maxDim;
    vx = dragView.vx; vy = dragView.vy; vw = dragView.vw; vh = dragView.vh;
  } else {
    maxDim = Math.max(w, h, 1);
    // 參數化模式會在圖外圍標尺寸，需要比自訂頂點模式更大的留白空間才放
    // 得下尺寸線跟文字——上方堆兩條（開口寬、上寬）、下方一條（下寬）、
    // 左右各一條（開口高、槽深）。
    var padTop = maxDim * (shapeMode === 'param' ? 0.40 : 0.18);
    var padBottom = maxDim * (shapeMode === 'param' ? 0.32 : 0.18);
    var padLeft = maxDim * (shapeMode === 'param' ? 0.48 : 0.26);
    var padRight = maxDim * (shapeMode === 'param' ? 0.48 : 0.26);
    vx = bbox.minX - padLeft; vy = bbox.minY - padTop; vw = w + padLeft + padRight; vh = h + padTop + padBottom;
  }
  lastView = { vx: vx, vy: vy, vw: vw, vh: vh, maxDim: maxDim };
  svg.setAttribute('viewBox', vx + ' ' + vy + ' ' + vw + ' ' + vh);

  var strokeW = maxDim * 0.01;
  var outerPts = openingAwarePoints(vertices).map(function (p) { return p.x + ',' + p.y; }).join(' ');

  // 鐵芯（紅）只畫到槽口那條線（bbox.minY，氣隙側）為止，不要往上延伸到
  // 墊白區域——那裡是氣隙/轉子那側，不是鐵芯，照真實矽鋼片圖只有鐵芯
  // 本體是紅色，氣隙上方留白。
  var html = laminationShape(bbox, vx, vy, vw, vh) +
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
      var R5 = Math.hypot(P.bs2 / 2, y2 + P.dsi / 2);
      html += '<text class="dim-text" x="0" y="' + (bbox.maxY + maxDim * 0.24) + '" font-size="' + fontSize * 0.85 + '">' +
        'Dsi=' + fmt(P.dsi, 2) + ' → R=' + fmt(R5, 3) + '</text>';
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

  svg.innerHTML = html;
  if (shapeMode === 'custom') attachVertexDragHandlers(svg);
}

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
      },
      needleRect: needleRect,
      clearanceRect: clearanceRect,
    };
  }
  if (layered) {
    var one = withLabels(layeredWinding(packableArea, diameter, count, 'left'));
    one.paths = [one.placed]; one.layers = [one.layers];
    return { pack: one, needleRect: null, clearanceRect: null };
  }
  return { pack: settlePack(packableArea, diameter, count), needleRect: null, clearanceRect: null };
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
function computeAll() {
  computeAllInner();
  updateFindWireVisibility(); // 不論 computeAllInner 從哪個錯誤分支提早 return 都會檢查
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
var PARAM_IDS = ['p_slotType', 'p_bs0', 'p_hs0', 'p_hs1', 'p_bs1', 'p_bs2', 'p_hs2', 'p_rs', 'p_dsi',
                 'p_openWidth', 'p_openHeight', 'p_topWidth', 'p_bottomWidth', 'p_depth'];
var WIRE_IDS = ['w_packMode', 'w_searchFix', 'w_bareDia', 'w_enamel', 'w_turns', 'w_coils', 'w_strands', 'w_needleWidth', 'w_needleClearance',
                'w_linerThickness', 'w_windStartY'];
var fileStatus = null; // { key, name } — 切換語言時重畫狀態訊息

function showFileStatus(key, name) {
  fileStatus = key ? { key: key, name: name } : null;
  var el = $('fileStatus');
  el.style.display = key ? '' : 'none';
  if (key) el.textContent = mtT(key).replace('{name}', name);
  el.classList.toggle('bad', key === 'fileBad');
}

window.saveSlotFile = function () {
  var inputs = {};
  PARAM_IDS.concat(WIRE_IDS).forEach(function (id) { inputs[id] = $(id).value; });
  var data = {
    kind: FILE_KIND,
    version: 4,
    savedAt: new Date().toISOString(),
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
  pushVertexHistory();
  PARAM_IDS.concat(WIRE_IDS).forEach(function (id) {
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

document.addEventListener('DOMContentLoaded', function () {
  $('btnGenerate').addEventListener('click', generateFromParametric);
  $('btnSearchBest').addEventListener('click', searchBestFill);
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

  document.addEventListener('mt-lang-change', computeAll);
  document.addEventListener('mt-lang-change', function () {
    if (fileStatus) showFileStatus(fileStatus.key, fileStatus.name);
  });
  document.addEventListener('mt-theme-change', function () { computeAll(); });

  applyIncomingParams();
  updatePackModeHint();
  updateSlotTypeFields();
  generateFromParametric(); // 進頁面先用預設梯形參數產生一組起始外形，不留空白畫面
});

})();
