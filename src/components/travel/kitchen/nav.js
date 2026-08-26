/* ============================================================================
   走位。房间里哪些地方站得住、怎么绕过家具走过去。

   全屋家具都是轴对齐的盒子，所以不做物理：在 XZ 平面上维护一张「可走区域」
   和一张「障碍矩形」表，判定是纯算术；再把它烤成一张栅格做 BFS 寻路。

   为什么要寻路而不是「撞上就沿墙滑」：这间屋子的通道是折线形的
   （厨房过道 → 沙发西侧 → 横过中间 → 沙发东侧 → 电视柜前面），
   滑墙会在凹角上卡住，点了半天走不到。

   坐标和 living.js / room.js 同一套（见 living.js 顶部的换算说明）。
   ========================================================================== */

/** 身体半径。墙往里收这么多，家具往外扩这么多。
 *  0.24 是量出来的：客厅几条真实通道（沙发西侧 0.73m、沙发东侧到椅子
 *  0.57m、茶几到电视柜 0.41m）在这个值下刚好都还通得过。
 *  吧台东端到书桌那条也是照这个定的：净宽 0.62m > 2×0.24，刚好走得通。 */
export const BODY = 0.24;

/** 可走的地面。
 *
 *  关键：每块区域判定时都要**往内收 BODY**，所以相邻两块必须在收进去之后
 *  仍然重叠，否则中间会裂开一条 2×BODY 宽的缝，两块区域实际上是断开的
 *  —— 之前客厅到 z=-0.22、过道从 z=-0.22 起，收完之后中间 0.6m 谁也不属于，
 *  于是根本走不进厨房。现在两块各自往对方多探一截。 */
const AREAS = [
    // 客厅，往南多探到 z=-1.00（灶台一线自己有障碍矩形挡着）
    { x0: -0.40, x1: 3.95, z0: -1.00, z1: 4.61 },
    /* 厨房过道：灶台一线 / 冰箱龛 和吧台之间那条。
       西端收在 -1.35（净走到 lx≈-1.11）—— 再往西是走廊，那块只做了
       「看得见」的一层皮（墙、尽头的书架鞋柜、一盏吸顶灯，见 room.js
       buildHallway），门后的房间没做，走进去就穿帮。停在廊口，
       正好能站着往里看一整条走廊。 */
    { x0: -1.35, x1: 2.90, z0: -1.34, z1: -0.18 },
];

/* 障碍：家具在地面上的投影。刻意漏掉两样：
   · 茶几（0.45 高）—— 算成障碍会把客厅北半边整个封死，沙发、茶几、
     电视柜三件首尾相接，中间一条缝都不剩；镜头从它上面过去看不出破绽。
   · 吧台凳 —— 两张凳子之间只剩 13cm，会把客厅东西向那条唯一的通道掐断。 */
const BLOCKERS = [
    { x0: 0.69, x1: 2.53, z0: -0.22, z1: 0.86 },    // 半岛吧台（东端让出过道）
    { x0: 3.15, x1: 3.92, z0: 0.74, z1: 3.95 },     // 两张书桌
    { x0: 2.88, x1: 3.38, z0: 1.52, z1: 2.04 },     // 棕椅（按收在桌下算）
    { x0: 2.88, x1: 3.38, z0: 2.89, z1: 3.41 },     // 黑椅
    { x0: 3.76, x1: 4.00, z0: 2.22, z1: 2.46 },     // 桌间那盏落地灯
    { x0: 3.60, x1: 3.95, z0: -0.72, z1: 0.62 },    // 电钢琴（琴身 1.32m）
    { x0: 3.23, x1: 3.57, z0: -0.33, z1: 0.23 },    // 琴凳（收在琴底下）
    { x0: 0.33, x1: 2.23, z0: 1.78, z1: 2.70 },     // 沙发
    { x0: 0.62, x1: 2.27, z0: 4.05, z1: 4.61 },     // 电视柜
    { x0: -0.04, x1: 0.54, z0: 3.90, z1: 4.51 },    // 边几
    { x0: -0.33, x1: 0.13, z0: 2.93, z1: 3.58 },    // 白斗柜
    { x0: -0.28, x1: -0.04, z0: 2.50, z1: 2.74 },   // 音箱脚架
    { x0: -0.28, x1: -0.04, z0: 3.76, z1: 4.00 },
    { x0: -0.38, x1: -0.14, z0: 2.18, z1: 2.42 },   // 弓形灯底座
    { x0: 2.49, x1: 2.76, z0: 4.11, z1: 4.38 },     // 电视旁那盏方罩落地灯（按钢板底座 0.27²）
    { x0: 3.14, x1: 4.00, z0: 3.95, z1: 4.71 },     // 转角那根方柱
    { x0: 0.50, x1: 2.75, z0: -1.95, z1: -1.28 },   // 厨房操作台一线
    { x0: -0.80, x1: 0.52, z0: -1.95, z1: -1.15 },  // 冰箱龛
];

/** (x, z) 这个点站得住吗（解析判定，不查栅格） */
export function walkable(x, z) {
    const inArea = AREAS.some((a) => (
        x > a.x0 + BODY && x < a.x1 - BODY && z > a.z0 + BODY && z < a.z1 - BODY
    ));
    if (!inArea) return false;
    return !BLOCKERS.some((b) => (
        x > b.x0 - BODY && x < b.x1 + BODY && z > b.z0 - BODY && z < b.z1 + BODY
    ));
}

/* ---------- 栅格 ---------- */

const G = { x0: -2.8, z0: -1.5, s: 0.10, w: 69, h: 63 };
let grid = null;

const at = (i, j) => j * G.w + i;
const cellOf = (x, z) => [
    Math.max(0, Math.min(G.w - 1, Math.round((x - G.x0) / G.s))),
    Math.max(0, Math.min(G.h - 1, Math.round((z - G.z0) / G.s))),
];
const posOf = (i, j) => ({ x: G.x0 + i * G.s, z: G.z0 + j * G.s });

/** 落在栅格外多远。cellOf 会把越界的点夹回边缘，光看夹完的格子分不出
 *  「墙角」和「墙外三米」—— 之前点冰箱门，射线穿过去落在屋外，被夹到边上
 *  再一吸附，人就走到房间另一头去了。所以越界距离要单独算。 */
const outsideBy = (x, z) => Math.max(
    G.x0 - x, x - (G.x0 + (G.w - 1) * G.s),
    G.z0 - z, z - (G.z0 + (G.h - 1) * G.s),
    0,
);

/** 烤栅格，并且**只保留最大的那个连通块**。
 *  被家具围死的小口袋（比如斗柜和茶几之间那条缝）留着没用：
 *  地面光标会指过去，点了却走不到，比直接不让指更让人困惑。 */
function ensureGrid() {
    if (grid) return grid;
    const raw = new Uint8Array(G.w * G.h);
    for (let j = 0; j < G.h; j++) {
        for (let i = 0; i < G.w; i++) {
            const p = posOf(i, j);
            raw[at(i, j)] = walkable(p.x, p.z) ? 1 : 0;
        }
    }
    // 找最大连通块
    const comp = new Int32Array(raw.length).fill(-1);
    let best = -1, bestSize = 0;
    for (let c = 0, id = 0; c < raw.length; c++) {
        if (!raw[c] || comp[c] !== -1) continue;
        const q = [c]; comp[c] = id; let size = 0;
        while (q.length) {
            const cur = q.pop(); size++;
            const ci = cur % G.w, cj = (cur - ci) / G.w;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const ni = ci + di, nj = cj + dj;
                if (ni < 0 || nj < 0 || ni >= G.w || nj >= G.h) continue;
                const n = at(ni, nj);
                if (!raw[n] || comp[n] !== -1) continue;
                comp[n] = id; q.push(n);
            }
        }
        if (size > bestSize) { bestSize = size; best = id; }
        id++;
    }
    grid = new Uint8Array(raw.length);
    for (let c = 0; c < raw.length; c++) grid[c] = comp[c] === best ? 1 : 0;
    return grid;
}

/** 离 (x,z) 最近的、真的走得到的点。指到家具或墙外时用它把落点吸出来。
 *  吸附半径是硬上限：超出 maxR 就返回 null（宁可「这儿去不了」，
 *  也不要把人送到一个他根本没指的地方）。 */
export function snapToWalkable(x, z, maxR = 0.8) {
    const g = ensureGrid();
    if (outsideBy(x, z) > maxR) return null;
    const [ci, cj] = cellOf(x, z);
    if (g[at(ci, cj)]) return posOf(ci, cj);
    const R = Math.ceil(maxR / G.s);
    let best = null, bestD = maxR * maxR;
    for (let dj = -R; dj <= R; dj++) {
        for (let di = -R; di <= R; di++) {
            const ni = ci + di, nj = cj + dj;
            if (ni < 0 || nj < 0 || ni >= G.w || nj >= G.h) continue;
            if (!g[at(ni, nj)]) continue;
            // 按真实距离量（含越界那一段），格数量法在屋外会低估
            const p = posOf(ni, nj);
            const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
            if (d < bestD) { bestD = d; best = p; }
        }
    }
    return best;
}

/** 键盘走位用：想挪 (dx,dz)，被挡住就沿墙滑一格。
 *  返回真正落到的位置。整段走不通时拆成两个轴分别试，
 *  贴着沙发往前推也不会整个卡死。 */
export function slide(x, z, dx, dz) {
    if (walkable(x + dx, z + dz)) return { x: x + dx, z: z + dz };
    if (Math.abs(dx) > 1e-6 && walkable(x + dx, z)) return { x: x + dx, z };
    if (Math.abs(dz) > 1e-6 && walkable(x, z + dz)) return { x, z: z + dz };
    return { x, z };
}

/** 两点之间直着走通不通（沿线采样） */
function clearLine(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.06);
    for (let i = 1; i < n; i++) {
        const t = i / n;
        if (!walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
}

/** 把逐格的路径拉直成几个拐点（string pulling），走起来才不是锯齿 */
function simplify(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
        let j = pts.length - 1;
        while (j > i + 1 && !clearLine(pts[i], pts[j])) j--;
        out.push(pts[j]);
        i = j;
    }
    return out;
}

/** 从 (fx,fz) 走到 (tx,tz)。返回拐点数组；走不到返回 null。
 *  起点允许不可站 —— 预设机位就「坐在沙发里」，这时从最近的可站格起算。 */
export function findPath(fx, fz, tx, tz) {
    const g = ensureGrid();
    const [ti, tj] = cellOf(tx, tz);
    if (!g[at(ti, tj)]) return null;

    let [si, sj] = cellOf(fx, fz);
    if (!g[at(si, sj)]) {
        const near = snapToWalkable(fx, fz, 2.0);
        if (!near) return null;
        [si, sj] = cellOf(near.x, near.z);
    }

    const start = at(si, sj), goal = at(ti, tj);
    const prev = new Int32Array(g.length).fill(-1);
    const seen = new Uint8Array(g.length);
    const q = [start];
    seen[start] = 1;
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let head = 0, found = start === goal;
    while (head < q.length && !found) {
        const cur = q[head++];
        const ci = cur % G.w, cj = (cur - ci) / G.w;
        for (const [di, dj] of NB) {
            const ni = ci + di, nj = cj + dj;
            if (ni < 0 || nj < 0 || ni >= G.w || nj >= G.h) continue;
            const n = at(ni, nj);
            if (seen[n] || !g[n]) continue;
            // 斜着走不许贴着角穿过去
            if (di && dj && (!g[at(ci + di, cj)] || !g[at(ci, cj + dj)])) continue;
            seen[n] = 1; prev[n] = cur; q.push(n);
            if (n === goal) { found = true; break; }
        }
    }
    if (!found) return null;

    const pts = [];
    for (let c = goal; c !== -1; c = prev[c]) {
        const ci = c % G.w, cj = (c - ci) / G.w;
        pts.push(posOf(ci, cj));
        if (c === start) break;
    }
    pts.reverse();
    return simplify(pts);
}
