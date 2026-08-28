import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
    PALETTE, artworkMaterial, carcass, inkOutline, matte, metal, shadeGradient, solid, woodFor,
} from './materials.js';
import { fitShadowCamera } from './room.js';
import { SHEET_BLEED } from './recital.js';

/* ============================================================================
   客厅。和 room.js 共用同一个局部坐标系。

   尺寸来自 RoomPlan 扫描（scripts/read-roomplan.py 打的表），换算：

       lx = -sz - 0.26      lz = sx - 0.50

   为什么是这两个数：扫描里灶台一线在 sz ∈ [-2.96, 0.11]、灶台墙在 sx = -1.45。
   取 lz 的偏移让灶台墙落在 room.js 的 BACK_Z = -1.95；取 lx 的偏移让灶台一线
   的南端落在 RUN_R = 2.70。于是客厅是 lx ∈ [-0.40, 3.95] × lz ∈ [-0.18, 4.66]，
   4.35 × 4.79 米，和扫描的 Floor_Office 对得上。

   一个已知的不一致：room.js 当年是照着构图手摆的，灶台一线被拉长了约 0.8m、
   冰箱往西挪了约 1m，所以厨房内部并不严格服从上面这个换算。客厅这边一律按
   扫描来，只在**半岛吧台**这个接缝上对齐（吧台右端 = 灶台一线右端）。剩下那
   点误差落在冰箱那头的过道里，镜头看不出来。

   同样因为这个拉伸，扫描里的 Wall_23（厨房北墙，带通往卧室的门）这里**故意
   不建**：换算过去它会横在「坐在沙发上看冰箱」那个主镜头的视线上，差 18cm
   就把冰箱挡住。它本来也不属于客厅。
   ========================================================================== */

export const LIVING = {
    WIN_X: 3.95,      // 窗墙内表面（扫描 Wall_14 / Window_0）
    NORTH_X: -0.40,   // 北墙内表面（扫描 Wall_29 + Wall_2），贴照片、带出风口的那面
    TV_Z: 4.61,       // 电视墙内表面（扫描 Wall_26）
    BAR_Z: -0.22,     // 吧台背面 = 客厅西边界（扫描 Floor_Office 的 x 起点）
    CEIL: 2.76,       // 扫描 Ceiling_Office
    WALL_T: 0.14,
};

const { WIN_X, NORTH_X, TV_Z, CEIL, WALL_T } = LIVING;
const WALL_H = CEIL + 0.6;        // 和 room.js 一致，天花板之上还留一截免得穿帮

/* 北墙上那两排唱片。cover 是 public/travel/covers/ 下的文件名，
   tint 是图还没到（或者干脆没这张图）时顶着的底色 —— 取封面的主色，
   这样即使贴图缺席，那面墙的色彩关系也还在。
   换唱片只要改这张表 + 丢一张 600px 见方的封面进去。
   表里从左到右，和站在屋里看到的顺序一致。
   封面用 scripts/fetch-cover.mjs 抓：

       node scripts/fetch-cover.mjs "Kanye West" "ye"
*/
const TOP_ROW = [
    { name: 'Adele — 21', cover: 'adele-21.jpg', tint: 0x6b5a4e },
    { name: 'The Weeknd — After Hours', cover: 'the-weeknd-after-hours.jpg', tint: 0x6e3524 },
    { name: 'Daniel Caesar — NEVER ENOUGH', cover: 'daniel-caesar-never-enough.jpg', tint: 0x191a6b },
];
const BOTTOM_ROW = [
    // 数字版封面是蓝的，实物那张是绿调压片；封面图已经按实物调过色相
    { name: 'Miles Davis — Miles (Prestige 7014)', cover: 'miles-davis-miles.jpg', tint: 0x2f7a4a },
    { name: 'The Weeknd — Starboy', cover: 'the-weeknd-starboy.jpg', tint: 0xb8412a },
    { name: 'Kanye West — ye', cover: 'kanye-west-ye.jpg', tint: 0x6f7d86 },
    { name: 'RADWIMPS — 君の名は。', cover: 'radwimps-your-name.jpg', tint: 0x2c4a6e },
];

const rb = (w, h, d, r = 0.014, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb_, h, seg = 16) => new THREE.CylinderGeometry(rt, rb_, h, seg);

/* ---------------------------------------------------------------------------
   窗：卷帘 + 帘后的城市
   ---------------------------------------------------------------------------
   实拍里这是「太阳能卷帘全放下来、但还透得过去」的状态：城市是一层被压平的
   剪影，帘子的织纹叠在上面。所以贴图一次画完（城市 → 失焦 → 帘布），材质用
   MeshBasic —— 窗户是画面里的**光源**，不该再被房间的灯照一遍变灰。

   这张图之前有四个地方让它看着廉价，都不是「细节不够多」，而是画错了：

     1. 所有窗共用一张 2:1 的图。窗墙 4.96×2.76、电视墙 3.48×2.76，同一张图
        贴上去一面被拉长一面被压扁，两面的楼还一模一样 —— 站在转角上一眼
        就看出是同一张贴图翻了个面。现在按**实际开窗尺寸**各生成一张，
        像素/米固定，两面的楼于是一样大、但不是同一座城。

     2. 城市是**清晰**的。隔着一层织物看东西不可能清晰；矢量般的硬边就是
        「贴图」感的来源。现在整层做一次失焦再叠回去。

     3. 窗光是随机撒的小方块。真楼的窗是**按层按跨排的网格**，随机撒点读作
        噪点。现在按层高/柱距排，每栋楼自己的点亮率不同。

     4. 织纹是 3px 的**井字格**，alpha 0.16。它和 ComicPass 亮部那层网点
        正好打架，斜着看一片摩尔纹。现在改成纬向的软噪声 + 极淡的横向肋，
        竖向那半直接去掉。 */
const shadeCache = new Map();

/** 一块卷帘的贴图。widthM / heightM 是这面窗的**实际尺寸**（米）。
 *  seed 换一个就是另一座城 —— 转角上两面窗不该看见同一排楼。 */
export function shadeTexture({ widthM = 4.96, heightM = 2.76, seed = 7 } = {}) {
    const key = `${widthM.toFixed(2)}x${heightM.toFixed(2)}#${seed}`;
    const hit = shadeCache.get(key);
    if (hit) return hit;

    // 像素/米固定，两面窗的楼才一样大
    const PPM = 240;
    const w = Math.round(widthM * PPM), h = Math.round(heightM * PPM);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // 固定的伪随机序列，免得每次刷新窗外都换一座城
    let sd = (seed >>> 0) || 1;
    const rnd = () => (sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648;
    const rng = (a, b) => a + (b - a) * rnd();

    /* 地平线（**最远那层**的楼脚）压在 0.66 —— 楼在窗子下半，上面大片留给天。
       实拍那张就是这个构图：帘子主要是一大片光，城市只是个交代。
       近处几层的楼脚会从这条线往下逐层错开，见后面的 STEP。 */
    const horizon = Math.round(h * 0.66);

    // 黄昏天空：上面偏冷，接近地平线转暖
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0.00, '#93a3c0');
    sky.addColorStop(0.36, '#b0b8cb');
    sky.addColorStop(0.72, '#cdcccb');
    sky.addColorStop(1.00, '#e7d4b6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    // 地平线以下不能是另一种颜色硬接上来 —— 那条硬边就是「贴图感」。
    // 顺着天色继续往下压一点，剩下的交给后面的霾和低层城市。
    const under = ctx.createLinearGradient(0, horizon, 0, h);
    under.addColorStop(0.00, '#e7d4b6');
    under.addColorStop(1.00, '#b3a89c');
    ctx.fillStyle = under;
    ctx.fillRect(0, horizon, w, h - horizon);

    /* 太阳在楼后面。整张图有一个光心，比一片均匀的灰天贵得多 ——
       这也是后面帘布那层暖色渗光的锚点，两处必须对齐。 */
    const sunX = Math.round(w * rng(0.22, 0.72));
    const sunY = Math.round(horizon - h * 0.10);
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.66);
    glow.addColorStop(0.00, 'rgba(255,229,182,0.50)');
    glow.addColorStop(0.42, 'rgba(255,218,168,0.19)');
    glow.addColorStop(1.00, 'rgba(255,210,158,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    /* 楼群，四层，由远及近。三件事决定它读不读得出「天际线」，
       而它们都不是「多画几栋楼」：

         · **每近一层楼脚往下挪一档**。四层都踩在同一条地平线上，画出来
           是一排贴在墙上的方块；错开之后才有前后。
         · **高度按 pow(rnd, 1.8) 取**。均匀分布给出的是一排差不多高的楼，
           天际线的轮廓是平的；加权之后大多数是矮楼、偶尔冒出一座塔。
         · **楼之间要露天**。挨着排就没有剪影可言 —— 越近的一层间距越大。

       颜色上每层往天色里兑一点，这是空气透视：远近的差别首先是对比度，
       不是大小。 */
    const BUILD = [66, 76, 98], HAZE = [176, 182, 195];
    const tintOf = (t) => `rgb(${BUILD.map((v, i) => Math.round(v + (HAZE[i] - v) * t)).join(',')})`;
    const STEP = Math.round(h * 0.052);
    const LAYERS = [
        { haze: 0.80, hi: [0.10, 0.34], wd: [0.10, 0.26], gap: [0.005, 0.04], lit: 0 },
        { haze: 0.58, hi: [0.12, 0.44], wd: [0.12, 0.32], gap: [0.010, 0.07], lit: 0.16 },
        { haze: 0.34, hi: [0.14, 0.56], wd: [0.14, 0.40], gap: [0.020, 0.12], lit: 0.34 },
        { haze: 0.13, hi: [0.16, 0.76], wd: [0.16, 0.50], gap: [0.050, 0.26], lit: 0.50 },
    ];

    LAYERS.forEach((L, li) => {
        const tint = tintOf(L.haze);
        const base = horizon + li * STEP;
        let x = -Math.round(rnd() * horizon * 0.3);
        while (x < w + 10) {
            const bw = Math.round(horizon * rng(L.wd[0], L.wd[1]));
            // 矮楼多、高楼少：均匀分布画出来是一排一样高的积木
            const bh = Math.round(horizon * (L.hi[0] + (L.hi[1] - L.hi[0]) * Math.pow(rnd(), 1.8)));
            const top = base - bh;
            ctx.fillStyle = tint;
            ctx.fillRect(x, top, bw, bh);

            /* 收分。同一个矩形重复一百遍就是「积木」，真正让天际线成立的是
               楼顶那一两级台阶 —— 剪影一有变化，眼睛才认它是建筑。 */
            let sx = x, sw = bw, sy = top;
            for (let k = 0, steps = rnd() < 0.55 ? (rnd() < 0.38 ? 2 : 1) : 0; k < steps; k++) {
                const nw = Math.max(3, Math.round(sw * rng(0.46, 0.78)));
                sx = Math.round(sx + (sw - nw) * rng(0.2, 0.8));
                sw = nw;
                const sh = Math.max(2, Math.round(bh * rng(0.07, 0.20)));
                ctx.fillRect(sx, sy - sh, sw, sh);
                sy -= sh;
            }
            if (rnd() < 0.28) {                       // 天线 / 桅杆
                const aw = Math.max(1, Math.round(sw * 0.06));
                const ah = Math.round(bh * rng(0.06, 0.16));
                ctx.fillRect(Math.round(sx + sw / 2 - aw / 2), sy - ah, aw, ah);
            }

            /* 窗光按**层高和柱距**排，而且**按竖列聚团**。两条都要：
               随机撒的亮点眼睛读作噪点；排成均匀网格又读作打孔板。
               真楼是一列一列亮的（一梯几户、加班的那几列），所以每一竖列
               先抽一个自己的权重，再决定这列上的窗亮不亮。 */
            if (L.lit > 0 && bw > 12) {
                const floorH = 9, colW = 7, pad = 4;
                const density = L.lit * rng(0.18, 0.92);
                const colW8 = [];
                for (let ci = 0; ci * colW < bw; ci++) colW8.push(rnd() < 0.34 ? rng(0.05, 0.3) : rng(0.6, 1.4));
                for (let yy = top + pad; yy < base - pad - 4; yy += floorH) {
                    let ci = 0;
                    for (let xx = x + pad; xx < x + bw - pad - 3; xx += colW, ci++) {
                        if (rnd() > density * colW8[ci]) continue;
                        ctx.fillStyle = `rgba(255,226,176,${rng(0.26, 0.62).toFixed(3)})`;
                        ctx.fillRect(xx, yy, 3, 4);
                    }
                }
            }
            x += bw + Math.round(horizon * rng(L.gap[0], L.gap[1]));
        }
    });

    /* 最近那层楼脚以下：城市继续往下延伸，但已经沉在霾里。
       之前这儿是一条平铺的暖褐色 + 一条硬边，看着像海滩不像城市。 */
    const nearBase = horizon + (LAYERS.length - 1) * STEP;
    const low = ctx.createLinearGradient(0, nearBase - STEP, 0, h);
    low.addColorStop(0.00, 'rgba(104,110,124,0)');
    low.addColorStop(0.45, 'rgba(96,101,114,0.38)');
    low.addColorStop(1.00, 'rgba(78,82,94,0.58)');
    ctx.fillStyle = low;
    ctx.fillRect(0, nearBase - STEP, w, h - (nearBase - STEP));

    // 整体再罩一层从下往上散开的霾，把四层的楼脚统一进同一片空气里
    const air = ctx.createLinearGradient(0, horizon - h * 0.22, 0, h);
    air.addColorStop(0.00, 'rgba(196,196,198,0)');
    air.addColorStop(1.00, 'rgba(196,196,198,0.20)');
    ctx.fillStyle = air;
    ctx.fillRect(0, horizon - h * 0.22, w, h - (horizon - h * 0.22));

    /* 失焦。隔着织物看东西不会是清晰的，剪影的硬边一软，「矢量画的城市」
       立刻变成「一层布后面的城市」。
       用降采样再放大来做，不用 ctx.filter —— 后者在老一点的 Safari 上是
       静默失效的，那会直接退回到「清晰的贴图」，正是要躲的那个毛病。 */
    const bw2 = Math.max(2, Math.round(w / 3)), bh2 = Math.max(2, Math.round(h / 3));
    const small = document.createElement('canvas');
    small.width = bw2; small.height = bh2;
    const sctx = small.getContext('2d');
    sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(c, 0, 0, bw2, bh2);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.60;                   // 留一点原图，不然连轮廓都没了
    ctx.drawImage(small, 0, 0, w, h);
    ctx.globalAlpha = 1;

    /* 帘布本身。之前是一整块 55% 的平灰盖上去 —— 均匀的遮罩会把所有层次
       一起压掉，那正是「廉价」的观感来源。织物的密度是有分布的：贴着帘盒
       那头最密，中间被光透得最亮，两侧收边又暗回去。 */
    const veil = ctx.createLinearGradient(0, 0, 0, h);
    veil.addColorStop(0.00, 'rgba(176,176,180,0.66)');
    veil.addColorStop(0.07, 'rgba(196,196,198,0.38)');
    veil.addColorStop(0.58, 'rgba(194,195,197,0.34)');
    veil.addColorStop(1.00, 'rgba(172,172,176,0.50)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);

    // 太阳透过来的那一团暖光，锚在前面那个光心上
    const bleed = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.9);
    bleed.addColorStop(0.00, 'rgba(255,231,188,0.30)');
    bleed.addColorStop(0.50, 'rgba(255,224,180,0.11)');
    bleed.addColorStop(1.00, 'rgba(255,218,172,0)');
    ctx.fillStyle = bleed;
    ctx.fillRect(0, 0, w, h);

    /* 织纹：一张**纬向相关**的噪声放大铺满。纯白噪声看着像电视雪花，
       让每一行沿 x 递推才有布的絮感；放大 6 倍是故意的，2~3 米开外
       织物本来就只读得出这种云絮般的疏密，读不出经纬。 */
    const NW = 192, NH = 192;
    const nz = document.createElement('canvas');
    nz.width = NW; nz.height = NH;
    const nctx = nz.getContext('2d');
    const img = nctx.createImageData(NW, NH);
    for (let y = 0; y < NH; y++) {
        let v = 128;
        for (let x = 0; x < NW; x++) {
            v = v * 0.58 + (108 + rnd() * 42) * 0.42;
            const i = (y * NW + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
    }
    nctx.putImageData(img, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.18;
    ctx.drawImage(nz, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 极淡的横向肋。竖向那半不能加：井字格和亮部网点会打出摩尔纹
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = '#2f3136';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;

    // 两侧收边：帘子是缩在窗挺后面的，边上本来就该暗一档
    const edge = ctx.createLinearGradient(0, 0, w, 0);
    edge.addColorStop(0.00, 'rgba(44,46,52,0.24)');
    edge.addColorStop(0.05, 'rgba(44,46,52,0)');
    edge.addColorStop(0.95, 'rgba(44,46,52,0)');
    edge.addColorStop(1.00, 'rgba(44,46,52,0.24)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    /* 各向异性 + mipmap：窗子多半是斜着看的，少了这两样，横向肋和窗光
       在掠射角上会闪成一片。 */
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    shadeCache.set(key, tex);
    return tex;
}

/** 一整面开窗的墙：墙体按洞口切成四块，再补竖挺、上下收边和帘布。
 *  axis='x' 是法线朝 ±X 的墙（窗墙），'z' 是朝 ±Z 的墙（电视墙）。
 *  u 轴 = 沿墙长度的那个方向；facing=-1 表示房间在 plane 的负轴一侧。 */
function windowWall(parent, {
    axis, plane, facing, from, to, y0, y1,
    winFrom, winTo, sillY, headY, wallMat, mullionEvery = 1.25, mullionsAt = null,
    shadeSeed = 7,
}) {
    const frameMat = matte(0xe6e2d9, { roughness: 0.6 });

    /** 在 (u0..u1) × (ya..yb) 上放一块墙板 */
    const slab = (u0, u1, ya, yb, cast = true) => {
        if (u1 - u0 < 0.004 || yb - ya < 0.004) return;
        const p = plane - facing * (WALL_T / 2);
        const g = axis === 'x' ? box(WALL_T, yb - ya, u1 - u0) : box(u1 - u0, yb - ya, WALL_T);
        const pos = axis === 'x'
            ? [p, (ya + yb) / 2, (u0 + u1) / 2]
            : [(u0 + u1) / 2, (ya + yb) / 2, p];
        solid(g, wallMat, { position: pos, parent, outline: 0, cast });
    };

    slab(from, winFrom, y0, y1);          // 洞口两侧各一整条
    slab(winTo, to, y0, y1);
    slab(winFrom, winTo, y0, sillY);      // 窗台以下
    /* 窗顶以上那一截**不能投影**。窗顶就是吊顶高度，所以这块板整个在天花板
       之上，屋里根本看不见 —— 它只是为了不让墙和天花板之间露缝。

       但天花板本身是 cast:false（不然从上方来的主光会被整块板挡死，屋里就黑
       了），于是光穿过天花板、再被这块看不见的板挡住，在对面墙上投下一条
       凭空出现的水平硬边 —— 客厅墙上那条阴影带就是它。
       板留着占位，投影关掉。 */
    slab(winFrom, winTo, headY, y1, false);

    /* 帘布。窗户在画面里是光源，用 MeshBasic —— 再被房间的灯照一遍就灰了。
       贴图按**这面窗自己的尺寸**生成，不共用：共用就得拉伸，两面窗还会
       出现同一排楼。 */
    const shadeW = winTo - winFrom, shadeH = headY - sillY;
    const shade = new THREE.Mesh(
        new THREE.PlaneGeometry(shadeW, shadeH),
        new THREE.MeshBasicMaterial({
            map: shadeTexture({ widthM: shadeW, heightM: shadeH, seed: shadeSeed }),
        }),
    );
    const sp = plane - facing * 0.035;
    if (axis === 'x') {
        shade.position.set(sp, (sillY + headY) / 2, (winFrom + winTo) / 2);
        shade.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
        shade.position.set((winFrom + winTo) / 2, (sillY + headY) / 2, sp);
        shade.rotation.y = facing > 0 ? 0 : Math.PI;
    }
    parent.add(shade);

    /* 竖挺 + 窗台压条 + 顶上的卷帘盒 */
    const barD = 0.05, barW = 0.045;
    const bar = (u0, u1, ya, yb) => {
        const p = plane - facing * (barD / 2 - 0.004);
        const g = axis === 'x'
            ? rb(barD, yb - ya, u1 - u0, 0.006)
            : rb(u1 - u0, yb - ya, barD, 0.006);
        const pos = axis === 'x'
            ? [p, (ya + yb) / 2, (u0 + u1) / 2]
            : [(u0 + u1) / 2, (ya + yb) / 2, p];
        solid(g, frameMat, { position: pos, parent, outline: 0.007, cast: false });
    };
    // 落地窗没有窗台，底横挺就贴着地；顶横挺（卷帘盒）缩在吊顶下面
    const y0Bar = sillY < 0.05 ? 0 : sillY - barW;
    bar(winFrom, winTo, y0Bar, y0Bar + barW);
    bar(winFrom, winTo, headY - barW, headY);
    /* 竖挺。默认按间距均分；给了 mullionsAt 就照给的位置放 ——
       电视墙那面实物是两幅卷帘对接，只有一道缝，而且不在正中。 */
    let uAt;
    if (mullionsAt) {
        uAt = [winFrom, ...mullionsAt, winTo];
    } else {
        const n = Math.max(1, Math.round((winTo - winFrom) / mullionEvery));
        uAt = [];
        for (let i = 0; i <= n; i++) uAt.push(winFrom + (winTo - winFrom) * (i / n));
    }
    for (const u of uAt) bar(u - barW / 2, u + barW / 2, y0Bar, headY);
}

/* ---------- 外壳 ---------- */

function buildShell(group) {
    const wallMat = matte(PALETTE.wall, { roughness: 0.95, noise: 1 });
    const trimMat = matte(0xe9e5dc, { roughness: 0.55 });
    /* 扫描给 Window_0 的是 0.39~2.73 —— 那是 RoomPlan 把卷帘盒和地脚一起
       算进墙里了。实物是整面落地窗，上到吊顶下到地板，不留墙裙。 */
    const SILL = 0.0, HEAD = CEIL;

    /* 窗墙 lx = 3.95，从厨房那头的转角 lz=-1.09 一直到柱子 lz=3.95。
       扫描 Window_0 是 lz ∈ [-1.02, 3.94]，基本整面都是玻璃。 */
    windowWall(group, {
        axis: 'x', plane: WIN_X, facing: -1,
        from: -1.09, to: 3.95, y0: 0, y1: WALL_H,
        winFrom: -1.02, winTo: 3.94, sillY: SILL, headY: HEAD,
        wallMat, mullionEvery: 1.24, shadeSeed: 7,
    });

    /* 电视墙 lz = 4.61，从北墙 lx=-0.40 到柱子 lx=3.14。
       扫描没识别出这面的窗（卷帘放下来 RoomPlan 经常漏），照片里是有的，
       而且是**整面** —— 卷帘从吊顶一路铺到墙角，中间一道对接缝，
       偏在靠柱子那一侧。之前只开了 0.42…3.10，靠北墙那头留了 0.8m 墙，
       照片里那儿明明还是帘子。 */
    windowWall(group, {
        axis: 'z', plane: TV_Z, facing: -1,
        from: NORTH_X, to: 3.14, y0: 0, y1: WALL_H,
        winFrom: -0.37, winTo: 3.11, sillY: SILL, headY: HEAD,
        wallMat, mullionsAt: [1.55], shadeSeed: 41,   // 转角上两面窗不该是同一排楼
    });

    /* 北墙 lx = -0.40（贴照片、带出风口那面），实墙 */
    const nz0 = -0.18, nz1 = 4.61;
    solid(box(WALL_T, WALL_H, nz1 - nz0), wallMat, {
        position: [NORTH_X - WALL_T / 2, WALL_H / 2, (nz0 + nz1) / 2], parent: group, outline: 0,
    });

    /* 窗墙和电视墙交角上的那根方柱（扫描 Wall_18 + Wall_22）。
       照片一里窗户右边那根白柱子就是它。 */
    const colX0 = 3.14, colX1 = 4.00, colZ0 = 3.95, colZ1 = 4.71;
    solid(box(colX1 - colX0, WALL_H, colZ1 - colZ0), wallMat, {
        position: [(colX0 + colX1) / 2, WALL_H / 2, (colZ0 + colZ1) / 2], parent: group, outline: 0.009,
    });

    /* 厨房尽头到窗墙的那道折角（扫描 Wall_4 / 9 / 11 / 15）。
       灶台一线到 lx≈2.81 就收了，墙往东折 0.34m 再往南接到窗墙。 */
    /* 这里原来只画了 lz=-1.60 那一道薄墙，它和后墙（lz=-1.95）之间空着
       28cm —— 从厨房那个角望过去，就是一条一直看到场景外面的缝。
       实物这儿是个实心的墙角（垃圾桶和拖把靠在里面），所以填成一整块。 */
    solid(box(3.15 - 2.74, WALL_H, 2.02 - 1.53), wallMat, {
        position: [(2.74 + 3.15) / 2, WALL_H / 2, -(2.02 + 1.53) / 2], parent: group, outline: 0,
    });
    solid(box(WALL_T, WALL_H, 1.53 - 1.04), wallMat, {
        position: [3.15 - WALL_T / 2, WALL_H / 2, -(1.53 + 1.04) / 2], parent: group, outline: 0,
    });
    solid(box(WIN_X - 3.08, WALL_H, WALL_T), wallMat, {
        position: [(3.08 + WIN_X) / 2, WALL_H / 2, -1.09], parent: group, outline: 0,
    });

    /* 天花板。两处非做不可的处理：

       cast=false —— 三维里投影贴图只渲染 castShadow 的物体，关掉之后
       从上往下打的主光才不会被这块板挡住。

       自发光 0.30 —— 屋里**没有任何光照得到天花板的下表面**：射灯朝下、
       主光在天花板之上、半球光按法线取色而朝下的面拿到的是偏暗的地面色。
       材质明明是暖白，渲出来是一片脏棕。现实里天花板全靠地面和墙的反弹
       光照亮，这里没有全局光照，就用一点自发光顶替那份反弹 —— 数值只够
       把它托到「白墙」的亮度，不至于自己变成一个光源。 */
    solid(box(WIN_X + 3.85, 0.12, TV_Z + 2.10),
        matte(0xf0ece2, { roughness: 0.95, emissive: 0xf0ece2, emissiveIntensity: 0.30 }), {
        position: [(WIN_X - 3.85) / 2 + 0.0, CEIL + 0.06, (TV_Z - 1.95) / 2 + 0.05],
        parent: group, outline: 0, cast: false,
    });

    /* 踢脚线只走实墙。落地窗直接落地，下面没有墙裙可踢。 */
    const skirt = (w, d, x, z) => solid(box(w, 0.105, d), trimMat, {
        position: [x, 0.0525, z], parent: group, outline: 0.006, cast: false,
    });
    skirt(0.035, nz1 - nz0, NORTH_X + 0.017, (nz0 + nz1) / 2);
    skirt(0.42 - NORTH_X, 0.035, (NORTH_X + 0.42) / 2, TV_Z - 0.017);
    skirt(3.14 - 3.10, 0.035, 3.12, TV_Z - 0.017);

    /* 北墙：出风口 + 两排唱片封套（照片三）。
       封套立在两条窄搁板上，不是钉在墙上的。

       出风口原来摆在 lz=2.18、还是一块没有百叶的光板 —— 那个位置墙上
       其实什么都没有。实拍里它在**靠电视墙那个角**的高处（封套右边、
       快到吊顶），横着的白色百叶格栅。 */
    const VENT_Z = 4.30, VENT_Y = 2.24, VENT_W = 0.34, VENT_H = 0.24;
    solid(rb(0.022, VENT_H, VENT_W, 0.005), matte(0xe4e0d6, { roughness: 0.68 }), {
        position: [NORTH_X + 0.011, VENT_Y, VENT_Z], parent: group, outline: 0.006, cast: false,
    });
    for (let i = 0; i < 6; i++) {                       // 百叶：六片斜着的窄条
        const blade = solid(box(0.014, 0.020, VENT_W - 0.040), matte(0xcfcabe, { roughness: 0.72 }), {
            position: [NORTH_X + 0.026, VENT_Y + VENT_H / 2 - 0.032 - i * 0.032, VENT_Z],
            parent: group, outline: 0, cast: false,
        });
        blade.rotation.z = 0.55;
    }

    /* 两排封套。高度按实拍量：下排底边比音箱顶(约 1.19)高出一个巴掌，
       封套 31cm 见方，两排之间留一道 12cm 的缝。之前整组低了 40cm，
       下排的底边比音箱顶还矮，看着像塞在音箱后面。 */
    const SLEEVE = 0.315, PITCH = SLEEVE + 0.015, ROW_Z = 3.25;
    const rows = [
        { y: 1.96, covers: TOP_ROW },
        { y: 1.52, covers: BOTTOM_ROW },
    ];
    // 封套侧面 / 背面：牛皮纸板，只有正面(+X，朝屋里)是封面
    const sleeveSide = matte(0xb9b2a6, { roughness: 0.92 });
    for (const { y, covers } of rows) {
        const span = PITCH * covers.length + 0.02;
        solid(box(0.07, 0.016, span), trimMat, {
            position: [NORTH_X + 0.035, y - SLEEVE / 2 - 0.008, ROW_Z],
            parent: group, outline: 0.005, cast: false,
        });
        covers.forEach((c, i) => {
            // i 递增 = 往左 = z 变大，这样表里的顺序就是站在屋里从左往右读
            const z = ROW_Z - (i - (covers.length - 1) / 2) * PITCH;
            const art = artworkMaterial(c.cover && `/travel/covers/${c.cover}`, c.tint);
            // BoxGeometry 的六个面：[+X, -X, +Y, -Y, +Z, -Z]，封面挂在 +X
            solid(box(0.012, SLEEVE, SLEEVE),
                [art, sleeveSide, sleeveSide, sleeveSide, sleeveSide, sleeveSide], {
                    position: [NORTH_X + 0.024, y, z], parent: group, outline: 0.005, cast: false,
                });
        });
    }
}

/** 一块水平的板，可以在中间挖洞。
 *  为什么不用「四块板拼起来」：相邻板的顶面是共面的，各自又带一层沿法线
 *  外推的描边壳，壳会插进邻板里 —— 画面上就是一片闪烁的格子和几条多余的
 *  黑线。挖洞的板只有一个网格、一圈描边，不存在共面。
 *
 *  Shape 画在 XY，挤出沿 +Z；rotateX(-90°) 之后 shape-y -> 世界 -Z、
 *  挤出方向 -> +Y。所以传进来的 z 要取负。 */
function holedPlate(x0, x1, z0, z1, holes, thickness) {
    const sh = new THREE.Shape();
    // 外轮廓逆时针
    sh.moveTo(x0, -z0);
    sh.lineTo(x0, -z1);
    sh.lineTo(x1, -z1);
    sh.lineTo(x1, -z0);
    sh.closePath();
    for (const h of holes) {
        // 洞顺时针，和外轮廓反向
        const p = new THREE.Path();
        p.moveTo(h.x0, -h.z0);
        p.lineTo(h.x1, -h.z0);
        p.lineTo(h.x1, -h.z1);
        p.lineTo(h.x0, -h.z1);
        p.closePath();
        sh.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: thickness, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
}

/* ---------- 半岛吧台（扫描 storage_cabinet_mid4_0 + sink_2 + dishwasher_0） ---------- */

function buildPeninsula(group) {
    const cabinets = group.userData.cabinets || (group.userData.cabinets = []);
    /* 东端刻意比扫描短 0.35m。

       扫描给的是 lx 0.69..2.88（storage_cabinet_mid4_0），书桌一线是 3.11..3.90
       （table_other_rect_3）—— 照抄的话两者之间只剩 0.23m，人过不去，实拍里
       那儿是有一条正经过道的。RoomPlan 对这种一整条的橱柜惯常读长（台面出挑、
       塞在下面的凳子都会被吃进包围盒），所以按实测的过道净宽 0.6m 反推：
       书桌前沿 3.15 - 0.62 = 2.53。水槽、洗碗机、凳子跟着一起往西挪。 */
    const X0 = 0.69, X1 = 2.53, Z0 = -0.22, Z1 = 0.86;
    const TOP = 0.945;                       // 和 room.js 的 COUNTER_Y 对齐
    const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;

    const whiteMat = matte(PALETTE.cabinetWhite, { roughness: 0.5 });
    // 比厨房那条台面稍钝一点：吧台在好几个机位里都当前景，
    // roughness 0.36 会被顶灯打出一块死白的高光。
    const counterMat = matte(PALETTE.counter, { roughness: 0.5, metalness: 0.04 });
    const woodFrontMat = woodFor(0.52, 0.70);

    /* 水槽。扫描的 sink_2 只有 0.46 × 0.43，比实物小一圈 —— RoomPlan 量的是
       水面那一层的可见开口，不是台下盆的实际尺寸。实物是一只大号单盆，
       按 0.62 × 0.46 建，位置仍随柜体西移。 */
    const SK = { x0: 1.14, x1: 1.76, z0: -0.13, z1: 0.33 };

    // 踢脚凹
    solid(box(X1 - X0, 0.10, Z1 - Z0 - 0.08), matte(0x141419, { roughness: 0.7 }), {
        position: [cx, 0.05, cz], parent: group, outline: 0, cast: false,
    });
    /* 箱体也要按水槽开口挖穿。只挖台面是不够的：柜体那块实心盒子的顶面
       就在台面底下，洞里看到的会是柜子顶，水槽还是没有。

       柜体的洞要比台面的洞**大一圈**：三层（台面洞 / 槽体 / 柜体洞）的侧壁
       如果尺寸一样就是三组共面，深度缓冲区分不出先后，槽里会一直闪。
       现在从内到外依次是 台面洞 < 槽体 < 柜体洞，两两错开，谁也不贴着谁。 */
    const SK_CAB = { x0: SK.x0 - 0.03, x1: SK.x1 + 0.03, z0: SK.z0 - 0.03, z1: SK.z1 + 0.03 };
    // 洗碗机不是贴在柜门上的装饰面，而是占掉一整格柜体。柜体主体因此
    // 分成左段、右侧窄立板和后段，前方留下真正连通的开口；不能用一个
    // 内部闭合的“洞”，否则洞前仍会留下一张薄薄但完全遮挡视线的白墙。
    const DISH_CAV = { x0: 1.80, x1: 2.50, z1: 0.39 };
    const CAB_H = TOP - 0.105;
    const CAB_Y = 0.095 + CAB_H / 2;
    /* 水槽那一格要**空心**：两扇门点得开，开了得看得见台下盆的外壳和下水管。
       原来这儿是一整块挤出体（只有水槽那一竖井是通的），门开了里面是一坨白塑料。
       拆成：一块带水槽洞的顶板（把柜内和台面之间那截封住）+ 底 / 背 / 两端立板。 */
    const PT = 0.018;                       // 板厚
    const CAV_TOP = 0.860;                  // 柜内净空上沿（台面底在 0.8795）
    const CAV_BOT = 0.095 + PT;
    /* 实拍的顺序（钢琴那头往回数）：洗碗机 → 门 → 门 → 抽屉。
       所以西头这 1.11m 里，最西边留给一列抽屉，剩下的是水槽对开柜 ——
       水槽在 1.14..1.76，正好落在两扇门上头。 */
    const SINK_X1 = DISH_CAV.x0, SINK_X0 = 1.06;
    const sinkCabW = SINK_X1 - X0, sinkCabD = Z1 - Z0;
    solid(holedPlate(X0, SINK_X1, Z0, Z1, [SK_CAB], 0.095 + CAB_H - CAV_TOP), whiteMat, {
        position: [0, CAV_TOP, 0], parent: group, outline: 0.009,
    });
    solid(box(sinkCabW, PT, sinkCabD), whiteMat, {
        position: [(X0 + SINK_X1) / 2, 0.095 + PT / 2, (Z0 + Z1) / 2],
        parent: group, outline: 0.006, cast: false,
    });
    solid(box(sinkCabW, CAV_TOP - CAV_BOT, PT), whiteMat, {          // 背板＝客厅那侧那块白板
        position: [(X0 + SINK_X1) / 2, (CAV_BOT + CAV_TOP) / 2, Z1 - PT / 2],
        parent: group, outline: 0.006,
    });
    for (const px of [X0 + PT / 2, SINK_X0, SINK_X1 - PT / 2]) {   // 两端立板 + 抽屉柜/水槽柜之间的隔板
        solid(box(PT, CAV_TOP - CAV_BOT, sinkCabD), whiteMat, {
            position: [px, (CAV_BOT + CAV_TOP) / 2, (Z0 + Z1) / 2],
            parent: group, outline: 0.006,
        });
    }
    solid(box(X1 - DISH_CAV.x1, CAB_H, Z1 - Z0), whiteMat, {
        position: [(DISH_CAV.x1 + X1) / 2, CAB_Y, (Z0 + Z1) / 2],
        parent: group, outline: 0.009,
    });
    solid(box(DISH_CAV.x1 - DISH_CAV.x0, CAB_H, Z1 - DISH_CAV.z1), whiteMat, {
        position: [(DISH_CAV.x0 + DISH_CAV.x1) / 2, CAB_Y, (DISH_CAV.z1 + Z1) / 2],
        parent: group, outline: 0.009,
    });

    // 厨房那一侧（lz = Z0）才有柜门和洗碗机；客厅这一侧是一整块白板
    const frontZ = Z0 - 0.013;
    // 洗碗机 lx 1.82..2.49（紧挨着水槽，占掉柜体东头）
    const dishH = TOP - 0.16;
    const dishCy = (TOP + 0.10) / 2 - 0.005;
    const dishPivot = new THREE.Group();
    dishPivot.position.set(2.15, dishCy - dishH / 2, frontZ);
    group.add(dishPivot);
    solid(rb(0.67, TOP - 0.16, 0.026, 0.006), matte(0xb3bac2, { roughness: 0.4, metalness: 0.5 }), {
        position: [0, dishH / 2, 0], parent: dishPivot, outline: 0.009,
    });
    const dishHandle = solid(rb(0.60, 0.022, 0.030, 0.008), metal(0xc2c8d0, 0.28), {
        position: [0, TOP - 0.13 - dishPivot.position.y, -0.014], parent: dishPivot, outline: 0.005, cast: false,
    });
    // 门背不锈钢内衬与洗涤剂盒，翻平后朝上。
    const dishInner = matte(0xb8bec5, { roughness: 0.48, metalness: 0.34 });
    solid(rb(0.625, dishH - 0.050, 0.014, 0.008), dishInner, {
        position: [0, dishH / 2, 0.021], parent: dishPivot, outline: 0.005,
    });
    solid(rb(0.145, 0.085, 0.028, 0.010), matte(0x8d949d, { roughness: 0.62 }), {
        position: [0.145, dishH * 0.40, 0.036], parent: dishPivot, outline: 0.004,
    });
    solid(rb(0.085, 0.050, 0.020, 0.008), matte(0xd5d9dc, { roughness: 0.55 }), {
        position: [-0.115, dishH * 0.39, 0.034], parent: dishPivot, outline: 0.003,
    });

    // 柜体内的深色不锈钢内胆与上下两层碗篮。内胆后壁放在腔体深处，
    // 不能贴着门板；碗篮也要完整落在 frontZ 的后方（+z），否则开门后
    // 会有一半悬到机器外面。
    const dishRackFrontZ = frontZ + 0.055;
    const dishRackBackZ = frontZ + 0.555;
    const dishRackCenterZ = (dishRackFrontZ + dishRackBackZ) / 2;
    const dishRackDepth = dishRackBackZ - dishRackFrontZ;
    // 内胆的底、顶、左右侧板；周围白色柜体现在已经挖空，这些板才是开门后
    // 应该看到的洗碗机腔壁。
    for (const sx of [-1, 1]) {
        solid(rb(0.014, dishH - 0.055, dishRackDepth + 0.035, 0.004), dishInner, {
            position: [2.15 + sx * 0.313, dishCy, dishRackCenterZ],
            parent: group, outline: 0.004,
        });
    }
    for (const y of [0.135, TOP - 0.125]) {
        solid(rb(0.625, 0.014, dishRackDepth + 0.035, 0.004), dishInner, {
            position: [2.15, y, dishRackCenterZ], parent: group, outline: 0.004,
        });
    }
    solid(rb(0.625, dishH - 0.055, 0.022, 0.008), matte(0x555b63, { roughness: 0.58, metalness: 0.28 }), {
        position: [2.15, dishCy, dishRackBackZ + 0.018], parent: group, outline: 0.006,
    });
    /* 腔壁。这一格白柜体是整段挖掉的，只剩上面那五片内胆板；内胆四周和腔口
       之间还留着几条通缝，门一开就从旁边漏过去。按内胆的外沿把余下的补齐。 */
    const LIN_X = 0.320, LIN_B = 0.128, LIN_T = TOP - 0.118, LIN_BK = dishRackBackZ + 0.040;
    const cavZc = (Z0 + DISH_CAV.z1) / 2, cavD = DISH_CAV.z1 - Z0;
    const cavW = DISH_CAV.x1 - DISH_CAV.x0, cavXc = (DISH_CAV.x0 + DISH_CAV.x1) / 2;
    solid(box(cavW, LIN_B - 0.095, cavD), whiteMat, {                        // 内胆底下
        position: [cavXc, (0.095 + LIN_B) / 2, cavZc], parent: group, outline: 0, cast: false,
    });
    solid(box(cavW, 0.095 + CAB_H - LIN_T, cavD), whiteMat, {                // 内胆上头
        position: [cavXc, (LIN_T + 0.095 + CAB_H) / 2, cavZc], parent: group, outline: 0, cast: false,
    });
    for (const sx of [-1, 1]) {                                              // 内胆两侧
        const w = cavW / 2 - LIN_X;
        solid(box(w, LIN_T - LIN_B, cavD), whiteMat, {
            position: [cavXc + sx * (cavW / 2 - w / 2), (LIN_B + LIN_T) / 2, cavZc],
            parent: group, outline: 0, cast: false,
        });
    }
    solid(box(LIN_X * 2, LIN_T - LIN_B, DISH_CAV.z1 - LIN_BK), whiteMat, {   // 内胆后头
        position: [cavXc, (LIN_B + LIN_T) / 2, (LIN_BK + DISH_CAV.z1) / 2],
        parent: group, outline: 0, cast: false,
    });
    /* 门下那道缝：合页在 y=0.125，踢脚凹顶只到 0.10，中间 2.5cm 一开门就
       露出腔体。实物这儿是一块不锈钢踢脚板，从地面一直封到门下沿。 */
    solid(rb(0.67, 0.122, 0.020, 0.005), matte(0x9aa1a9, { roughness: 0.5, metalness: 0.45 }), {
        position: [2.15, 0.061, Z0 - 0.004], parent: group, outline: 0.005, cast: false,
    });
    const rackMat = metal(0xaeb5bd, 0.42);
    for (const y of [0.36, 0.66]) {
        for (let i = -4; i <= 4; i++) {
            solid(cyl(0.003, 0.003, dishRackDepth, 8), rackMat, {
                position: [2.15 + i * 0.060, y, dishRackCenterZ],
                rotation: [Math.PI / 2, 0, 0], parent: group, outline: 0, cast: false,
            });
        }
        for (const z of [dishRackFrontZ, dishRackBackZ]) {
            solid(cyl(0.004, 0.004, 0.56, 8), rackMat, {
                position: [2.15, y, z], rotation: [0, 0, Math.PI / 2],
                parent: group, outline: 0, cast: false,
            });
        }
    }
    cabinets.push({
        kind: 'dishwasher-door', node: dishPivot, pick: [dishHandle],
        axis: 'x', spin: -1, swing: 1.43,
    });
    /* 洗碗机左边那两扇 = 水槽柜的对开门。照实拍改了三处：
         · 门**下到踢脚凹、上到台面底**；原来上边顶进台面里、下边离踢脚还差 7cm。
         · 把手是贴着门顶边的一小截横条、靠对开缝那一侧；原来是居中的一根宽条。
         · 门能开了 —— 原来只是两块贴在柜面上的板。
       柜子正面朝 -Z（和厨房那些朝 +Z 的相反），所以 spin = -hinge，同电视柜。 */
    const DOOR_B = 0.108, DOOR_T = 0.872, DR = 0.008;
    const sdH = DOOR_T - DOOR_B, sdCy = (DOOR_B + DOOR_T) / 2;
    const sdW = (SINK_X1 - SINK_X0 - DR * 3) / 2;
    for (let i = 0; i < 2; i++) {
        const dx = SINK_X0 + DR + sdW / 2 + i * (sdW + DR);
        const hinge = i === 0 ? -1 : 1;      // 左扇合页在左、右扇合页在右，从中缝往两边开
        const g = new THREE.Group();
        g.position.set(dx + hinge * sdW / 2, sdCy, frontZ);
        group.add(g);
        const door = solid(rb(sdW, sdH, 0.024, 0.005), woodFrontMat, {
            position: [-hinge * sdW / 2, 0, 0], parent: g, outline: 0.009,
        });
        const handle = solid(rb(0.135, 0.016, 0.020, 0.006), metal(0xb9bfc7, 0.3), {
            position: [-hinge * (sdW - 0.10), sdH / 2 - 0.030, -0.022],
            parent: g, outline: 0.005, cast: false,
        });
        cabinets.push({ kind: 'door', node: g, pick: [door, handle], spin: -hinge, swing: 1.25 });
    }

    /* 最西头那一列抽屉：上薄下厚三个。做法和厨房一线那组一样 —— 整组沿轴平移，
       后面挂一只抽屉盒，拉开才有东西看。这个柜子正面朝 -Z，所以 dir = -1。 */
    const drawerBox = matte(0x8a7c68, { roughness: 0.8 });
    const dwW = SINK_X0 - X0 - DR * 2;
    let dwY = DOOR_B;
    for (const dh of [0.22, 0.26, 0.28]) {
        const g = new THREE.Group();
        g.position.set(X0 + DR + dwW / 2, dwY + dh / 2, 0);
        group.add(g);
        const front = solid(rb(dwW, dh - 0.008, 0.024, 0.005), woodFrontMat, {
            position: [0, 0, frontZ], parent: g, outline: 0.009,
        });
        const grip = solid(rb(0.135, 0.016, 0.020, 0.006), metal(0xb9bfc7, 0.3), {
            position: [dwW / 2 - 0.10, dh / 2 - 0.042, frontZ - 0.022],
            parent: g, outline: 0.005, cast: false,
        });
        const bd = 0.40, bh = Math.min(dh - 0.06, 0.20), bz = frontZ + bd / 2 + 0.022;
        solid(box(dwW - 0.022, 0.010, bd), drawerBox, {
            position: [0, -bh / 2, bz], parent: g, outline: 0, cast: false,
        });
        for (const sx of [-1, 1]) {
            solid(box(0.010, bh, bd), drawerBox, {
                position: [sx * (dwW / 2 - 0.016), 0, bz], parent: g, outline: 0, cast: false,
            });
        }
        solid(box(dwW - 0.022, bh, 0.010), drawerBox, {
            position: [0, 0, frontZ + bd + 0.022], parent: g, outline: 0, cast: false,
        });
        cabinets.push({ kind: 'drawer', node: g, pick: [front, grip], axis: 'z', dir: -1, travel: 0.28 });
        dwY += dh;
    }

    // 客厅这一侧的插座面板（照片三）。一整块白板没有任何参照物，
    // 前景占那么大一块会看不出是多高的台子。
    solid(rb(0.085, 0.125, 0.014, 0.004), matte(0xe8e5dd, { roughness: 0.5 }), {
        position: [2.20, 0.62, Z1 + 0.007], parent: group, outline: 0.006, cast: false,
    });

    /* 白石英台面：一块板，中间按水槽开口挖穿。 */
    // 客厅那一侧出挑 0.14（吧台要能塞下凳子和膝盖），厨房侧只出 0.025。
    // 东端**不出挑**：那 2.5cm 直接从过道净宽里扣，切齐了才是 0.62m。
    solid(holedPlate(X0 - 0.025, X1, Z0 - 0.025, Z1 + 0.14, [SK], 0.045), counterMat, {
        position: [0, TOP - 0.043, 0], parent: group, outline: 0.009,
    });

    /* 下嵌式不锈钢单槽。BackSide 的盒子 = 从上面看进去就是四面内壁 + 槽底，
       所以槽底不需要再单独放一块板（原来那块和盒子底面只差 1mm，
       是槽里闪烁的另一半原因）。 */
    const skCx = (SK.x0 + SK.x1) / 2, skCz = (SK.z0 + SK.z1) / 2;
    /* 盆内壁。metalness 调低、底色调亮，并且**不收阴影** —— 台面在阴影贴图里
       正好盖住整个洞口，收了阴影盆里就是一团纯黑，槽放大之后这块黑洞尤其显眼。 */
    const steelIn = matte(0xb4bac1, { roughness: 0.52, metalness: 0.16, side: THREE.BackSide });
    // 盆深 0.25，顶沿刻意比台面高 8mm：等高的话两者只差 1~2mm，
    // 台面洞的边上会漏出一圈缝
    solid(box(SK.x1 - SK.x0 + 0.03, 0.25, SK.z1 - SK.z0 + 0.03), steelIn, {
        position: [skCx, TOP - 0.115, skCz], parent: group, outline: 0, cast: false, receive: false,
    });
    // 落水口离槽底抬 8mm，别又贴上去
    solid(cyl(0.042, 0.042, 0.010, 16), matte(0x74797f, { roughness: 0.55, metalness: 0.25 }), {
        position: [skCx, TOP - 0.232, skCz], parent: group, outline: 0.004, cast: false, receive: false,
    });

    /* 台下盆的**外壳**。上面那只盆是 BackSide 的盒子 —— 从柜子里往上看它是
       透明的，两扇门一开，水槽位置就是个悬空的洞。补一层朝外的壳，柜内看到的
       才是盆底；再挂一段下水管，「打开是水池下面」这件事才立得住。 */
    solid(rb(SK.x1 - SK.x0 + 0.05, 0.165, SK.z1 - SK.z0 + 0.05, 0.010),
        matte(0x8f959c, { roughness: 0.62, metalness: 0.22 }), {
        position: [skCx, TOP - 0.158, skCz], parent: group, outline: 0.006, cast: false,
    });
    const pipeMat = matte(0x9298a0, { roughness: 0.5, metalness: 0.3 });
    solid(cyl(0.026, 0.026, 0.25, 14), pipeMat, {                 // 竖管
        position: [skCx, TOP - 0.370, skCz], parent: group, outline: 0.004, cast: false,
    });
    solid(cyl(0.026, 0.026, 0.70, 14), pipeMat, {                 // 横管，往客厅那侧的背板去
        position: [skCx, TOP - 0.495, skCz + 0.35], rotation: [Math.PI / 2, 0, 0],
        parent: group, outline: 0.004, cast: false,
    });
    /* 抽拉式龙头。之前那版是照着「硬 90° 折角 + 方管 + 往下折的方头」建的，
       那是把照片看错了。实物是：

         · **圆管**，不是方管
         · 立柱到横臂之间是一个**圆滑的直角弯**（四分之一圆环），不是方块折角
         · 横臂前端就是抽拉喷头本身 —— 齐口收边、出水口开在下面那一点，
           没有那截往下折的大方头（原来那截是整支龙头看着最怪的地方）
         · 柱身由粗到细：台面上一段接近 Ø48，往上收到横臂的 Ø31
         · 手柄是柱身侧面一个圆柱轴座 + 一根细杆，不是压在顶上的扁片

       整支装在一个子 group 里，绕 Y 一转就是龙头的旋转角度 —— 各段自己算
       朝向的话，弯头和横臂很难对齐。子 group 的局部坐标：立柱在原点沿 +Y、
       横臂伸向 -Z（也就是探到水槽上方）。

       位置在水槽朝客厅那一侧：人站在厨房过道（-Z）用水槽，龙头在对面。 */
    const chrome = metal(0xc6cdd6, 0.16);
    const NECK_R = 0.0155;      // 圆管半径
    const ARM_Y = 0.300;        // 横臂中心离台面
    const BEND_R = 0.042;       // 弯头圆角半径
    const NECK_TOP = ARM_Y - BEND_R;
    const SPLIT_Y = 0.191;      // 固定座 / 旋转柱的分界（实物上那道接缝）

    /* 分成**两截**：

         tap（固定）  台面座 + 粗柱 + 收细段 + 侧手柄  —— 永远正对水槽
         └ spout（转）直颈 + 弯头 + 横臂 + 喷头 + 出水口 + 水流

       实物就是这样：能转的只有接缝以上那根细柱，装着阀芯和手柄的粗柱是拧死在
       台面上的。之前整支龙头（含手柄）挂在一个 group 上一起转，手柄就会跟着
       甩到侧面去。 */
    const tap = new THREE.Group();
    tap.position.set(skCx, TOP, 0.41);
    group.add(tap);

    /* ---- 固定的下半截 ---- */
    solid(cyl(0.025, 0.030, 0.016, 20), chrome, { position: [0, 0.008, 0], parent: tap, outline: 0.005, cast: false });
    solid(cyl(0.0225, 0.025, 0.105, 20), chrome, { position: [0, 0.0685, 0], parent: tap, outline: 0.006 });
    solid(cyl(NECK_R + 0.0015, 0.0225, SPLIT_Y - 0.121, 20), chrome, {
        position: [0, (0.121 + SPLIT_Y) / 2, 0], parent: tap, outline: 0.006,
    });

    /* ---- 能转的上半截 ---- */
    const spout = new THREE.Group();
    spout.position.set(0, SPLIT_Y, 0);
    tap.add(spout);
    // 接缝那圈领子跟着转，转起来才看得出是「上面在动」
    solid(cyl(NECK_R + 0.0028, NECK_R + 0.0028, 0.009, 20), metal(0xa8b0ba, 0.26), {
        position: [0, 0.0045, 0], parent: spout, outline: 0.004, cast: false,
    });
    solid(cyl(NECK_R, NECK_R, NECK_TOP - SPLIT_Y, 18), chrome, {
        position: [0, (NECK_TOP - SPLIT_Y) / 2, 0], parent: spout, outline: 0.006,
    });

    /* 圆滑直角弯。TorusGeometry 默认躺在 XY 平面、从 (R,0) 起弧；
       rotateY(-90°) 把它扳进 YZ 平面，弧就从 +Z 转到 +Y —— 正好是
       「从竖着的颈子拐到伸向 -Z 的横臂」。 */
    const bend = new THREE.TorusGeometry(BEND_R, NECK_R, 12, 14, Math.PI / 2);
    bend.rotateY(-Math.PI / 2);
    solid(bend, chrome, { position: [0, NECK_TOP - SPLIT_Y, -BEND_R], parent: spout, outline: 0.006 });

    // 横臂 + 抽拉喷头。喷头比横臂略粗一点点，接缝那道墨线就是拔出来的分界
    const ARM_END = -0.207, TIP = -0.267, AY = ARM_Y - SPLIT_Y;
    solid(cyl(NECK_R, NECK_R, -BEND_R - ARM_END, 18), chrome, {
        position: [0, AY, (-BEND_R + ARM_END) / 2], rotation: [Math.PI / 2, 0, 0],
        parent: spout, outline: 0.006,
    });
    solid(cyl(0.0170, 0.0170, ARM_END - TIP, 18), chrome, {
        position: [0, AY, (ARM_END + TIP) / 2], rotation: [Math.PI / 2, 0, 0],
        parent: spout, outline: 0.006,
    });
    // 出水口：开在喷头下面靠前那一点
    const AER = [0, AY - 0.014, TIP + 0.014];
    solid(cyl(0.0115, 0.0115, 0.010, 14), matte(0x5a6068, { roughness: 0.62 }), {
        position: AER, parent: spout, outline: 0.004, cast: false,
    });

    /* ---- 水流。挂在出水口下面，跟着 spout 一起转 ----
       高度用 scale.y 拉：几何体是一根**单位高**的圆台，落点变了只要改 scale，
       不用每帧重建几何。落在槽里就拉到槽底，转到台面上方就只拉到台面。 */
    const waterAnchor = new THREE.Group();
    waterAnchor.position.set(AER[0], AER[1] - 0.006, AER[2]);
    waterAnchor.visible = false;
    spout.add(waterAnchor);

    const streamMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: /* glsl */`
            varying vec2 vUv; varying float vRim;
            void main() {
                vUv = uv;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vec3 n = normalize(normalMatrix * normal);
                // 侧面（掠射）≈1、正对镜头≈0 —— 水柱的边缘比中间亮
                vRim = 1.0 - abs(dot(n, normalize(-mv.xyz)));
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime; varying vec2 vUv; varying float vRim;
            void main() {
                // 几道顺流而下的亮纹。频率不成整数倍，看不出循环
                float s = fract(vUv.y * 5.0 + uTime * 2.7);
                float t = fract(vUv.y * 11.0 + uTime * 4.1);
                float streak = smoothstep(0.0, 0.35, s) * (1.0 - smoothstep(0.55, 1.0, s));
                streak = max(streak * 0.8, smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.3, 0.7, t)) * 0.45);
                vec3 col = mix(vec3(0.58, 0.72, 0.86), vec3(0.96, 0.99, 1.0), clamp(streak + vRim * 0.55, 0.0, 1.0));
                gl_FragColor = vec4(col, clamp(0.22 + streak * 0.26 + vRim * 0.34, 0.0, 0.86));
            }
        `,
    });
    // 单位高圆台，下端略粗一点（水柱往下会散一点）
    const streamGeo = new THREE.CylinderGeometry(0.0072, 0.0098, 1, 14, 1, true);
    streamGeo.translate(0, -0.5, 0);           // 顶端落在原点，往下长
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.renderOrder = 2;
    stream.userData.ghost = true;      // 半透明的水，射线要能穿过去
    waterAnchor.add(stream);

    // 落点的水花：一圈附加混合的环，靠 scale + opacity 抖
    const splashMat = new THREE.MeshBasicMaterial({
        color: 0xdff0ff, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const splash = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.052, 24), splashMat);
    splash.rotation.x = -Math.PI / 2;
    splash.renderOrder = 2;
    splash.userData.ghost = true;
    waterAnchor.add(splash);

    /* 侧面单柄。装在**固定**的那一截上，所以龙头怎么转它都正对水槽。

       结构是旋转式：柱身侧面伸出一个圆柱轴座，杆子接在轴座外端、**垂直于
       轴座轴线**，绕这根轴线上下扳就是开关水 —— 所以杆挂在自己的 Group 上
       绕 X 转，开水就是把这个角度扳上去。 */
    const HUB_X = -0.030;
    const hub = solid(cyl(0.019, 0.019, 0.036, 16), chrome, {
        position: [HUB_X, 0.105, 0], rotation: [0, 0, Math.PI / 2], parent: tap, outline: 0.005, cast: false,
    });
    // 轴座外端那道压边（实拍上是一圈明显的接缝）
    solid(cyl(0.0198, 0.0198, 0.005, 16), metal(0xa8b0ba, 0.28), {
        position: [HUB_X - 0.0165, 0.105, 0], rotation: [0, 0, Math.PI / 2],
        parent: tap, outline: 0.004, cast: false,
    });
    const lever = new THREE.Group();
    lever.position.set(HUB_X - 0.013, 0.105, 0);
    tap.add(lever);
    const leverRod = solid(cyl(0.0056, 0.0056, 0.085, 10), chrome, {
        position: [0, 0, -0.0425], rotation: [Math.PI / 2, 0, 0], parent: lever, outline: 0.004, cast: false,
    });
    // 杆头是压扁收口的一小段，不是圆球
    const leverTip = solid(cyl(0.0076, 0.0060, 0.014, 10), chrome, {
        position: [0, 0, -0.090], rotation: [Math.PI / 2, 0, 0], parent: lever, outline: 0.004, cast: false,
    });

    /* 命中盒。龙头杆才 5.6mm 粗，横臂 31mm —— 在两米开外就是屏幕上的三五个
       像素，鼠标差一点就点空，人还会被「点空 = 走过去」送到别处。所以给能操作
       的两处各套一个看不见的大盒子，实际点的是盒子。
       colorWrite:false 保证它既不画也不写深度，只参与射线。 */
    const proxyMat = new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, depthWrite: false, colorWrite: false,
    });
    const proxy = (parent, size, at) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...size), proxyMat);
        m.position.set(...at);
        m.castShadow = m.receiveShadow = false;
        m.userData.pickProxy = true;
        parent.add(m);
        return m;
    };
    const leverProxy = proxy(lever, [0.075, 0.075, 0.145], [0.004, 0, -0.050]);
    const spoutNeckProxy = proxy(spout, [0.080, 0.140, 0.100], [0, 0.050, -0.012]);
    const spoutArmProxy = proxy(spout, [0.070, 0.062, 0.250], [0, AY, -0.150]);

    /* 交给 KitchenScene 去接交互。

       SWIVEL_STOPS 是几个「转到位」的角度，都验算过：出水口在这些角度上
       仍然落在水槽开口里（水槽 x 1.14~1.76 / z -0.13~0.33，出挑 0.267）。
       点一下走一格，走到头就往回，所以反复点是来回扫，不用绕一整圈。 */
    group.userData.faucet = {
        spout, lever, waterAnchor, stream, splash, streamMat,
        // 能点的部件：转龙头点上半截，开关水点手柄
        pickSpout: [spoutNeckProxy, spoutArmProxy,
            ...spout.children.filter((o) => o.isMesh && !o.userData.isOutline && !o.userData.pickProxy)],
        pickLever: [leverProxy, hub, leverRod, leverTip],
        SWIVEL_STOPS: [-0.86, -0.44, 0, 0.44, 0.86],
        LEVER_OFF: 0.30,        // 关水时杆略微上翘
        LEVER_ON: -0.62,        // 开水时扳下来
        // 水柱要拉多长：落在槽里就到槽底，转到台面上方就到台面
        DROP_IN_SINK: (TOP + SPLIT_Y + AER[1] - 0.006) - (TOP - 0.24),
        DROP_ON_TOP: (TOP + SPLIT_Y + AER[1] - 0.006) - (TOP + 0.002),
        SINK: { x0: SK.x0, x1: SK.x1, z0: SK.z0, z1: SK.z1 },
    };

    /* 吧台凳：扫描给了三张，第三张（lx 1.51..1.92）停在厨房过道里，
       建出来就是挡路的杂物，只留客厅这侧的两张。

       扫描给的 lz≈0.78 是「凳子塞进台面下」时的包围盒中心，而吧台的实体
       一直到 lz=0.86 —— 直接照抄就有大半个凳子埋在柜体里，露出来的是半个
       盘子加两条腿。挪到 1.06：凳面刚好探进 0.14 的台面出挑下面。 */
    for (const [sx, sz] of [[1.10, 1.06], [2.12, 1.06]]) buildStool(group, sx, sz);
}

/** 吧台凳（实拍）：棕色绒面软包圆坐垫，四条外撇的深色金属锥形腿，
 *  下面一圈铜色脚踏环。座高 0.64。 */
function buildStool(parent, x, z) {
    const seat = matte(0x7d5c3e, { roughness: 0.78, noise: 1 });
    const seatSide = matte(0x5f4632, { roughness: 0.8, noise: 1 });
    const leg = matte(0x2e2823, { roughness: 0.5, metalness: 0.38 });
    const H = 0.64, R = 0.185;

    // 软包：上面一块略鼓的圆盘，下面收一圈，不是一块薄片
    solid(cyl(R, R * 0.97, 0.055, 24), seat, { position: [x, H - 0.028, z], parent, outline: 0.008 });
    solid(cyl(R * 0.97, R * 0.86, 0.040, 24), seatSide, {
        position: [x, H - 0.075, z], parent, outline: 0.007, cast: false,
    });

    /* 四条腿。上端离中心 0.115、下端 0.235，所以要往外倾 atan(0.12/0.55)≈0.21。
       圆柱默认沿 Y，用 rotation = [倾角·dz, 0, -倾角·dx] 把它扳到那个方向上。 */
    const TOP_R = 0.115, BOT_R = 0.235, LEN = H - 0.095;
    const tilt = Math.atan2(BOT_R - TOP_R, LEN);
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const dx = Math.cos(a), dz = Math.sin(a);
        const mid = (TOP_R + BOT_R) / 2;
        /* 倾角的符号：rotation 绕 X 转 θ 会把 +Y 推向 +Z、绕 Z 转 θ 推向 -X。
           要的是**顶端往里收、底端往外撇**，所以是 [-tilt·dz, 0, +tilt·dx]。
           写成 [+tilt·dz, 0, -tilt·dx] 就整个倒过来了，变成上宽下窄。
           锥度同理：实物是上粗下细，radiusTop 要比 radiusBottom 大。 */
        solid(cyl(0.024, 0.015, LEN / Math.cos(tilt), 8), leg, {
            position: [x + dx * mid, LEN / 2, z + dz * mid],
            rotation: [-tilt * dz, 0, tilt * dx],
            parent, outline: 0.006,
        });
    }
    // 脚踏环
    solid(new THREE.TorusGeometry(0.185, 0.011, 8, 26), metal(0x8a7355, 0.4), {
        position: [x, 0.215, z], rotation: [Math.PI / 2, 0, 0], parent, outline: 0.005, cast: false,
    });
}

/* ---------- 靠窗的两张升降桌（扫描 table_other_rect_3） ---------- */

function buildDesk(group) {
    const TOP = 0.755, TH = 0.028;
    const white = matte(0xdedbd0, { roughness: 0.38 });
    const legMat = matte(0xd0ccc2, { roughness: 0.55 });
    const bezel = matte(0x1b1b21, { roughness: 0.55 });
    const screenMat = matte(0x2b3346, { roughness: 0.22, emissive: 0x223047, emissiveIntensity: 0.9 });

    /* 扫描把靠窗这一条读成一张 3.21m 的长桌，实际是**两张升降桌并排**，
       中间留一道缝（灯就塞在那道缝里）。桌面深 0.79，贴着窗墙。
       之前还照着照片一猜了一截 L 形回折——那里其实什么都没有，撤掉。 */
    /* 整条往窗那边推到 3.15..3.92（扫描是 3.11..3.90，原来这里还往房间里多让了
       6cm）—— 桌深 0.77 不变，省下来的全部留给吧台东端那条过道，净宽 0.62m。

       两张桌子之间留一道 7cm 的真缝，落地灯的杆从缝里立起来（实拍里灯杆是藏在
       桌子后面的）；桌长仍是各 1.6m，这个是扫描里两把椅子的间距 1.61m 定死的。 */
    const X0 = 3.15, X1 = 3.92, XC = (X0 + X1) / 2;
    const DESKS = [
        { z0: 0.74, z1: 2.31 },     // 左桌：大屏 + 笔记本
        { z0: 2.38, z1: 3.95 },     // 右桌：27 寸 + 主机
    ];

    for (const d of DESKS) {
        solid(rb(X1 - X0, TH, d.z1 - d.z0, 0.008), white, {
            position: [XC, TOP + TH / 2, (d.z0 + d.z1) / 2], parent: group, outline: 0.010,
        });
        // 升降桌的 T 形脚：横脚垂直于桌长伸进房间，上面是方管立柱和顶梁
        for (const z of [d.z0 + 0.26, d.z1 - 0.26]) {
            solid(rb(0.60, 0.036, 0.095, 0.014), legMat, {
                position: [XC - 0.03, 0.018, z], parent: group, outline: 0.007, cast: false,
            });
            solid(box(0.075, 0.38, 0.075), legMat, {
                position: [XC, 0.22, z], parent: group, outline: 0.007,
            });
            solid(box(0.095, 0.32, 0.095), legMat, {
                position: [XC, 0.57, z], parent: group, outline: 0.007,
            });
            solid(rb(0.50, 0.045, 0.075, 0.012), legMat, {
                position: [XC, TOP - 0.022, z], parent: group, outline: 0.007, cast: false,
            });
        }
    }

    /* 显示器。屏面朝 -X（人坐在房间那头）。
       两台的**支架不一样**，这是照片里最先认出「哪台是哪台」的东西，
       不该共用一个圆柱：
         · 左桌那台是方铁底板 + 扁方立柱，柱子中间一个过线孔
         · 右桌那台（LG）是多节银色圆柱 + 有厚度的 ArcLine 圆弧底座
       边框也收窄了：原来上下各 13mm 一圈均匀边框，那是十年前的屏；
       实物是三面 8mm 窄边 + 20mm 下巴。 */
    const poleMat = matte(0xe4e1da, { roughness: 0.38 });
    const monitor = (z, w, h, { x = 3.81, stand = 'plate', lift = 0.115, whiteBack = false } = {}) => {
        const cy = TOP + TH + lift + h / 2;
        /* 背壳和前脸是**两种颜色**：27UP850K 的后壳是白的，只有正面那圈
           边框是黑的。做成一整块黑，从侧面和背后看就完全不是那台屏了。 */
        solid(rb(0.026, h, w, 0.006), whiteBack ? poleMat : bezel, {
            position: [x, cy, z], parent: group, outline: 0.007,
        });
        solid(box(0.005, h - 0.004, w - 0.004), bezel, {          // 正面黑边框
            position: [x - 0.0155, cy, z], parent: group, outline: 0, cast: false,
        });
        const SB = 0.008, CHIN = 0.020;
        solid(box(0.004, h - SB - CHIN, w - SB * 2), screenMat, {
            position: [x - 0.0195, cy + (CHIN - SB) / 2, z], parent: group, outline: 0, cast: false,
        });
        if (stand === 'plate') {
            solid(box(0.052, 0.058, 0.072), bezel, {              // 球头颈
                position: [x + 0.030, cy - h / 2 + 0.048, z], parent: group, outline: 0.005, cast: false,
            });
            solid(rb(0.235, 0.012, 0.30, 0.004), bezel, {         // 方铁底板
                position: [3.80, TOP + TH + 0.006, z], parent: group, outline: 0.005, cast: false,
            });
            const PH = 0.20;
            solid(box(0.045, PH, 0.086), bezel, {                 // 扁方立柱（在屏板**背后**）
                position: [3.845, TOP + TH + 0.012 + PH / 2, z], parent: group, outline: 0.006,
            });
            // 过线孔：挖不出来，用一块更深的凹面顶上去，够读出「这儿是个孔」
            solid(box(0.008, 0.032, 0.044), matte(0x0b0c0f, { roughness: 0.95 }), {
                position: [3.8225, TOP + TH + 0.012 + PH * 0.52, z], parent: group, outline: 0, cast: false,
            });
        } else {
            /* LG 27UP850K 的 ArcLine 底座。近照能确认它不是椭圆扁带：内外边
               是同心圆弧，截面有平整顶面和明显的竖向厚度；后柱则由多节不同
               直径的圆柱套接。立柱位于屏幕后，不能穿过屏板。 */
            const AX = 3.855;
            const lgMetal = matte(0xb9b9b6, {
                roughness: 0.33, metalness: 0.43, side: THREE.DoubleSide,
            });

            /* 四条同心圆轨道缝出一个矩形截面的圆弧实体：顶面、底面、内壁、
               外壁和两个端面都是真几何，不是压扁的圆管或一张薄片。 */
            const arcBand = (outerRx, outerRz, innerRx, innerRz, halfAngle, thickness, segments = 64) => {
                const positions = [];
                for (let i = 0; i <= segments; i++) {
                    const a = -halfAngle + halfAngle * 2 * i / segments;
                    const ca = Math.cos(a), sa = Math.sin(a);
                    positions.push(
                        outerRx * ca, -thickness / 2, outerRz * sa,
                        innerRx * ca, -thickness / 2, innerRz * sa,
                        outerRx * ca,  thickness / 2, outerRz * sa,
                        innerRx * ca,  thickness / 2, innerRz * sa,
                    );
                }
                const indices = [];
                for (let i = 0; i < segments; i++) {
                    const a = i * 4, b = a + 4;
                    indices.push(
                        a + 2, a + 3, b + 2, b + 2, a + 3, b + 3,
                        a, b, a + 1, b, b + 1, a + 1,
                        a, a + 2, b, b, a + 2, b + 2,
                        a + 1, b + 1, a + 3, b + 1, b + 3, a + 3,
                    );
                }
                const last = segments * 4;
                indices.push(0, 1, 2, 2, 1, 3, last, last + 2, last + 1, last + 2, last + 3, last + 1);
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geo.setIndex(indices);
                geo.computeVertexNormals();
                return geo;
            };

            // 半径约 25.5cm、张角约 148°：弦宽约 49cm，弓高约 18cm。
            const outerR = 0.255, innerR = 0.231, halfAngle = 1.29;
            const baseCenterX = AX - outerR;
            const crescent = arcBand(outerR, outerR, innerR, innerR, halfAngle, 0.018);
            solid(crescent, lgMetal, {
                position: [baseCenterX, TOP + TH + 0.009, z],
                parent: group, outline: 0.0032, cast: false,
            });

            // 底部短套筒压在圆弧中点上，遮住圆弧和立柱的接缝。
            solid(cyl(0.034, 0.036, 0.024, 28), lgMetal, {
                position: [AX - 0.012, TOP + TH + 0.021, z], parent: group, outline: 0.0035, cast: false,
            });

            // 下段细长、上段套筒略粗，中间用一道窄环把伸缩接缝读出来。
            const screenBottom = cy - h / 2;
            const p0 = TOP + TH + 0.024;
            const seamY = screenBottom - 0.045;
            const p1 = screenBottom + 0.088;
            solid(cyl(0.029, 0.031, seamY - p0, 28), lgMetal, {
                position: [AX - 0.012, (p0 + seamY) / 2, z], parent: group, outline: 0.0035,
            });
            solid(cyl(0.0325, 0.0325, 0.012, 28), matte(0xaeadab, {
                roughness: 0.37, metalness: 0.39,
            }), {
                position: [AX - 0.012, seamY, z], parent: group, outline: 0.0028, cast: false,
            });
            solid(cyl(0.034, 0.033, p1 - seamY, 28), lgMetal, {
                position: [AX - 0.012, (seamY + p1) / 2, z], parent: group, outline: 0.0035,
            });

            // 上段后面用一根短圆柱横向接进屏背的 OneClick 安装位。
            solid(cyl(0.028, 0.028, 0.050, 24), lgMetal, {
                position: [(3.823 + AX - 0.012) / 2, screenBottom + 0.058, z],
                rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.0032, cast: false,
            });
        }
    };

    // 左桌：一块大屏 + 屏顶挂灯 + 前面的笔记本
    monitor(1.48, 0.74, 0.44, { stand: 'plate' });

    /* 屏幕挂灯。实物是搭在屏顶、灯口朝下偏前的一根黑管，后面吊一块配重。
       它值得单独做，因为它**是这张桌子上的第二个光源** —— 一根不发光的
       黑管挂在那儿，读作「屏幕上边黏了个东西」，不读作灯。
       接线见 buildLivingLights 的 screenBar 和 lamps.screenbar。 */
    const SBAR_Z = 1.48, SBAR_W = 0.74 * 0.62;
    const sbarY = TOP + TH + 0.115 + 0.44 + 0.022;
    const sbarBody = solid(rb(0.034, 0.028, SBAR_W, 0.008), bezel, {
        position: [3.755, sbarY, SBAR_Z], parent: group, outline: 0.005, cast: false,
    });
    solid(box(0.052, 0.018, 0.052), bezel, {                // 屏后那块配重
        position: [3.836, sbarY - 0.022, SBAR_Z], parent: group, outline: 0.004, cast: false,
    });
    solid(box(0.030, 0.010, 0.030), bezel, {                // 搭在屏顶的挂钩
        position: [3.800, sbarY - 0.020, SBAR_Z], parent: group, outline: 0, cast: false,
    });
    const sbarGlowMat = diffuserMaterial();
    const sbarGlow = solid(box(0.016, 0.004, SBAR_W - 0.02), sbarGlowMat, {
        position: [3.752, sbarY - 0.015, SBAR_Z], parent: group, outline: 0, cast: false,
    });

    /* 笔记本。**宽度沿 Z、进深沿 X** —— 人坐在 -X 那头面朝 +X，屏面必须朝 -X。
       之前宽度做在了 X 上、上盖还绕 X 轴翻，等于把笔记本侧过来搁在桌上。 */
    const alu = matte(0x3c4048, { roughness: 0.45, metalness: 0.3 });
    const LP_X = 3.60, LP_Z = 1.62;               // 机身中心
    const LP_D = 0.235, LP_W = 0.335;             // 进深(X) / 宽度(Z)
    const LP_Y = TOP + TH;
    solid(rb(LP_D, 0.015, LP_W, 0.005), alu, {
        position: [LP_X, LP_Y + 0.0075, LP_Z], parent: group, outline: 0.007,
    });
    solid(box(0.115, 0.003, 0.285), matte(0x1d1f24, { roughness: 0.72 }), {   // 键盘区
        position: [LP_X + 0.035, LP_Y + 0.016, LP_Z], parent: group, outline: 0, cast: false,
    });
    solid(box(0.070, 0.003, 0.115), matte(0x33363c, { roughness: 0.5 }), {    // 触控板
        position: [LP_X - 0.062, LP_Y + 0.016, LP_Z], parent: group, outline: 0, cast: false,
    });
    /* 上盖：铰链在机身**后缘**（+X），往后仰 0.25 rad。
       绕 Z 转负角 = 顶端倒向 +X，屏面法线随之指向 -X 略微朝上。 */
    const TILT = 0.25, LID_H = 0.225;
    const hx = LP_X + LP_D / 2, hy = LP_Y + 0.015;
    const sn = Math.sin(TILT), cs = Math.cos(TILT);
    const lid = solid(rb(0.011, LID_H, LP_W, 0.004), alu, {
        position: [hx + sn * LID_H / 2, hy + cs * LID_H / 2, LP_Z], parent: group, outline: 0.007,
    });
    lid.rotation.z = -TILT;
    const scr = solid(box(0.003, LID_H - 0.020, LP_W - 0.020), screenMat, {
        position: [hx + sn * LID_H / 2 - cs * 0.008, hy + cs * LID_H / 2 - sn * 0.008, LP_Z],
        parent: group, outline: 0, cast: false,
    });
    scr.rotation.z = -TILT;

    /* 右桌：LG 27UP850K（27 吋 16:9 4K，白后壳 + 月牙底座）+ 一台 30L 主机。
       外框 614×365，是 16:9 —— 中间那版按带鱼屏做成 0.78×0.335 是我看错了。 */
    monitor(2.95, 0.614, 0.365, { stand: 'arc', lift: 0.185, whiteBack: true });

    /* 主机是台 **HP OMEN 30L**（GT13）：432 高 × 165 宽 × 421 深，一台又窄又深
       的塔。前面几版全错在同一件事上 —— 我一直把它当成「宽而扁」的箱子，
       所以怎么摆都不对。它其实很窄（前脸只有 16.5cm），深度差不多等于高度。

       朝向（两张视角对上了才敢定）：
         · **前脸朝 -X**（屋里）：靠玻璃那侧一条三角冲孔进风柱，其余是亮面
           黑塑料，上面一颗 OMEN 菱形标 + 字，底下一圈大圆环，顶端是前置
           I/O 和电源键
         · **玻璃侧板朝 -Z**（回头看得见的那一侧，朝着显示器）—— 侧板本身是
           一个黑框，玻璃是嵌在框里的，不是一整块玻璃
         · +Z 那侧贴着转角的柱子，顶盖是冲孔网

       深度沿 X（往窗墙里走），宽度沿 Z。 */
    const CX = 0.421, CZ = 0.165, CH = 0.432;     // 深(X) / 宽(Z) / 高
    const TX = 3.655, TZ = 3.76, TY = TOP + TH + CH / 2;
    /* 机箱正对屋里那几面全都背光（主光从窗那头 +X 来），不给一点自发光
       就是一团纯黑的剪影 —— 和天花板下表面是同一个毛病。 */
    const caseMat = matte(0x232329, { roughness: 0.52, emissive: 0x3c3e47, emissiveIntensity: 0.55 });
    const caseDark = matte(0x121317, { roughness: 0.78, emissive: 0x24262c, emissiveIntensity: 0.5 });
    const caseGloss = matte(0x1a1b20, { roughness: 0.22, metalness: 0.25, emissive: 0x33353d, emissiveIntensity: 0.5 });
    const faceX = TX - CX / 2, glassZ = TZ - CZ / 2;
    const panel = (g, pos, m = caseMat) => solid(g, m, { position: pos, parent: group, outline: 0.006, cast: false });
    panel(box(CX, 0.014, CZ), [TX, TY - CH / 2 + 0.007, TZ]);              // 底
    panel(box(CX, 0.014, CZ), [TX, TY + CH / 2 - 0.007, TZ]);              // 顶
    panel(box(0.014, CH - 0.028, CZ), [TX + CX / 2 - 0.007, TY, TZ]);      // 背板
    panel(box(CX, CH - 0.028, 0.012), [TX, TY, TZ + CZ / 2 - 0.006]);      // +Z 侧（贴柱子）
    solid(box(CX - 0.050, 0.004, CZ - 0.030), caseDark, {                  // 顶盖冲孔网
        position: [TX, TY + CH / 2 - 0.012, TZ], parent: group, outline: 0, cast: false,
    });

    /* 侧板是**黑框 + 嵌进去的玻璃**，所以框要单独做四条边。
       整块玻璃直接贴上去就少了实物那圈很显眼的边框。 */
    const fz = glassZ + 0.006;
    panel(box(CX - 0.020, 0.024, 0.012), [TX, TY + CH / 2 - 0.026, fz]);   // 框：上
    panel(box(CX - 0.020, 0.024, 0.012), [TX, TY - CH / 2 + 0.026, fz]);   // 框：下
    panel(box(0.022, CH - 0.028, 0.012), [faceX + 0.011, TY, fz]);         // 框：前
    panel(box(0.022, CH - 0.028, 0.012), [TX + CX / 2 - 0.011, TY, fz]);   // 框：后

    /* 前脸：靠玻璃那侧一条冲孔进风柱，其余是亮面黑塑料。 */
    const MESH_W = 0.050, BEZ_W = CZ - MESH_W;
    const meshZ = glassZ + MESH_W / 2, bezZ = glassZ + MESH_W + BEZ_W / 2;
    solid(box(0.016, CH - 0.030, MESH_W), caseDark, {
        position: [faceX + 0.008, TY, meshZ], parent: group, outline: 0.005, cast: false,
    });
    solid(box(0.016, CH - 0.030, BEZ_W - 0.004), caseGloss, {
        position: [faceX + 0.008, TY, bezZ], parent: group, outline: 0.005, cast: false,
    });
    solid(box(0.014, 0.022, BEZ_W - 0.020), caseDark, {                    // 顶端前置 I/O
        position: [faceX + 0.010, TY + CH / 2 - 0.036, bezZ], parent: group, outline: 0, cast: false,
    });
    const omen = matte(0x4b4d56, { roughness: 0.35, emissive: 0x565963, emissiveIntensity: 0.7 });
    const badge = solid(box(0.003, 0.026, 0.026), omen, {                  // OMEN 菱形标
        position: [faceX + 0.0005, TY + 0.085, bezZ], parent: group, outline: 0, cast: false,
    });
    badge.rotation.x = Math.PI / 4;
    solid(new THREE.TorusGeometry(0.042, 0.0022, 5, 28), omen, {           // 底下那一圈大圆环
        position: [faceX + 0.0005, TY - 0.095, bezZ], rotation: [0, Math.PI / 2, 0],
        parent: group, outline: 0, cast: false,
    });

    /* 箱子里那几件。关键是**自发光**而不是形状：箱子封闭、屋里没有一盏灯
       照得进去，没有全局光照的话里面就是纯黑，隔着玻璃只会看到一个黑方块。
       主板贴 +Z 内壁，塔散和显卡朝 -Z 探出来正对玻璃；箱子只有 16.5cm 宽，
       所以每件在 Z 上都很薄 —— 这正是窄塔该有的样子。 */
    const guts = (color, emissive, e = 1.0, rough = 0.6) => matte(color, {
        roughness: rough, emissive, emissiveIntensity: e,
    });
    const gz = TZ + CZ / 2 - 0.026;
    solid(box(0.245, CH - 0.130, 0.006), guts(0x243029, 0x445c4c, 0.80, 0.8), {   // 主板
        position: [TX + 0.045, TY + 0.030, gz], parent: group, outline: 0, cast: false,
    });
    /* 塔散。之前把风扇的圆面正对着玻璃摆了 —— 那是错的：**侧透看到的是
       散热器的侧面**，风扇吹的是前后（-X→+X），从侧面只能看见它窄窄的一条
       框，永远看不到那个圆。一个正对玻璃的大圆等于把风扇拧了 90°，
       和之前把整个机箱转错是同一类错误。
       侧面该有的读数是**一摞横鳍片**，所以给一块暗底 + 六道横缝。 */
    solid(box(0.098, 0.125, 0.058), guts(0x3c4048, 0x5a5f6a, 0.75, 0.55), {
        position: [TX + 0.030, TY + 0.075, gz - 0.040], parent: group, outline: 0, cast: false,
    });
    for (let i = 0; i < 6; i++) {
        solid(box(0.101, 0.003, 0.060), guts(0x1e2026, 0x33353c, 0.60), {
            position: [TX + 0.030, TY + 0.026 + i * 0.020, gz - 0.040], parent: group, outline: 0, cast: false,
        });
    }
    solid(box(0.022, 0.100, 0.060), guts(0x24262c, 0x3f424a, 0.70), {             // 风扇（侧面只是一条框）
        position: [TX - 0.026, TY + 0.075, gz - 0.040], parent: group, outline: 0, cast: false,
    });
    solid(box(0.275, 0.044, 0.048), guts(0x2a2c33, 0x5c606b, 0.95), {             // 显卡（顺着 X 长）
        position: [TX - 0.010, TY - 0.040, gz - 0.038], parent: group, outline: 0, cast: false,
    });
    solid(box(CX - 0.050, 0.056, CZ - 0.034), guts(0x2c2e35, 0x53565f, 0.85, 0.7), {   // 电源仓
        position: [TX, TY - CH / 2 + 0.048, TZ], parent: group, outline: 0, cast: false,
    });
    solid(box(0.230, 0.005, 0.004), matte(0xe3c6ff, { roughness: 0.3, emissive: 0xb07fe0, emissiveIntensity: 2.2 }), {
        position: [TX - 0.010, TY - 0.018, gz - 0.062], parent: group, outline: 0, cast: false,
    });
    /* 前脸网孔柱后面那把 12cm 进风扇。它也是吹前后的，所以从侧透同样
       只看得见框的侧面 —— 少了它箱子前面 17cm 是空的，但也不能拿一个
       圆面对着玻璃来凑数。 */
    solid(box(0.026, 0.120, 0.062), guts(0x24262c, 0x3f424a, 0.70), {
        position: [TX - CX / 2 + 0.046, TY - 0.010, TZ], parent: group, outline: 0, cast: false,
    });
    // 顺着上沿走的一束线，箱子里才不是干干净净的几块板
    for (const [cy2, cl] of [[TY + 0.148, 0.30], [TY + 0.138, 0.22]]) {
        solid(box(cl, 0.006, 0.006), guts(0x1b1c20, 0x3a3c44, 0.7), {
            position: [TX + 0.02, cy2, gz - 0.030], parent: group, outline: 0, cast: false,
        });
    }

    /* 玻璃嵌在侧板框里。描边**不能**用 inkOutline —— 沿法线外扩的背面壳
       套在透明件上就是一块灰板（唱机防尘罩那儿踩过一次）。 */
    const glassGeo = box(CX - 0.044, CH - 0.052, 0.004);
    const caseGlass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({
        color: 0xa8bcc8, roughness: 0.07, metalness: 0,
        transparent: true, opacity: 0.21, depthWrite: false, side: THREE.DoubleSide,
    }));
    caseGlass.position.set(TX, TY, glassZ + 0.007);
    caseGlass.castShadow = caseGlass.receiveShadow = false;
    caseGlass.renderOrder = 1;
    caseGlass.userData.ghost = true;
    group.add(caseGlass);
    const glassEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(glassGeo),
        new THREE.LineBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.55 }),
    );
    glassEdges.userData.ghost = true;
    caseGlass.add(glassEdges);

    /* 键盘 + 鼠标。两张桌子上都是全尺寸 MX Keys：主键区、导航岛、倒 T 方向键
       和四列数字区缺一不可。把整排键帽画成六根黑条会让它更像散热格栅；下面
       用实例化圆角键帽保留一百来颗独立按键，同时只增加一次绘制调用。 */
    const kbTray = matte(0x878683, { roughness: 0.38, metalness: 0.28 });
    const kbWell = matte(0x191a1e, { roughness: 0.63, metalness: 0.05 });
    const kbKey = matte(0x38393f, { roughness: 0.57 });
    const keyboard = (kx, kz) => {
        const KD = 0.132, KW = 0.430, PITCH = 0.018, KEY_GAP = 0.0032;
        const kg = new THREE.Group();
        kg.position.set(kx, TOP + TH, kz);
        group.add(kg);

        solid(rb(KD, 0.012, KW, 0.005), kbTray, {
            position: [0, 0.006, 0], parent: kg, outline: 0.004, cast: false,
        });
        solid(rb(KD - 0.015, 0.0025, KW - 0.018, 0.003), kbWell, {
            position: [0.001, 0.013, 0], parent: kg, outline: 0, cast: false,
        });

        const keys = [];
        const rowX = (row) => KD / 2 - 0.017 - row * 0.0188;
        const rowY = (row) => 0.0183 + (5 - row) * 0.00045;
        const addKey = (row, z, units = 1, depth = 0.0144) => {
            keys.push({ x: rowX(row), y: rowY(row), z, w: units * PITCH - KEY_GAP, d: depth });
        };
        const addRun = (row, widths, start) => {
            let cursor = start;
            widths.forEach((units) => {
                addKey(row, cursor + units * PITCH / 2, units);
                cursor += units * PITCH;
            });
        };

        const mainZ = -0.207;
        // Esc + 四组功能键：细小的组间距在远景里也能留下正确的节奏。
        [0, 1.65, 2.55, 3.45, 4.35, 5.55, 6.45, 7.35, 8.25,
            9.45, 10.35, 11.25, 12.15, 13.45, 14.35].forEach((col) => {
            addKey(0, mainZ + (col + 0.45) * PITCH, 0.9, 0.0128);
        });
        addRun(1, [1,1,1,1,1,1,1,1,1,1,1,1,1,2], mainZ);
        addRun(2, [1.5,1,1,1,1,1,1,1,1,1,1,1,1,1.5], mainZ);
        addRun(3, [1.75,1,1,1,1,1,1,1,1,1,1,1,2.25], mainZ);
        addRun(4, [2.25,1,1,1,1,1,1,1,1,1,1,2.75], mainZ);
        addRun(5, [1.25,1.25,1.25,1.25,6.25,1.25,1.25,1.25], mainZ);

        // 六键导航岛 + 独立倒 T 方向键。
        const navZ = 0.070;
        for (let col = 0; col < 3; col++) {
            addKey(1, navZ + (col + 0.5) * PITCH);
            addKey(2, navZ + (col + 0.5) * PITCH);
        }
        addKey(4, navZ + 1.5 * PITCH);
        for (let col = 0; col < 3; col++) addKey(5, navZ + (col + 0.5) * PITCH);

        // 四列数字区；双高的 + / Enter 会把轮廓从普通紧凑键盘区分开。
        const numZ = 0.131;
        for (let col = 0; col < 4; col++) addKey(0, numZ + (col + 0.5) * PITCH, 1, 0.0128);
        for (let row = 1; row <= 5; row++) {
            for (let col = 0; col < 4; col++) addKey(row, numZ + (col + 0.5) * PITCH);
        }

        const keyGeo = rb(1, 1, 1, 0.16, 2);
        const keyMesh = new THREE.InstancedMesh(keyGeo, kbKey, keys.length);
        const dummy = new THREE.Object3D();
        keys.forEach((key, i) => {
            dummy.position.set(key.x, key.y, key.z);
            dummy.scale.set(key.d, 0.0066, key.w);
            dummy.updateMatrix();
            keyMesh.setMatrixAt(i, dummy.matrix);
        });
        keyMesh.instanceMatrix.needsUpdate = true;
        keyMesh.castShadow = keyMesh.receiveShadow = false;
        keyMesh.frustumCulled = false;
        kg.add(keyMesh);
    };
    keyboard(3.40, 1.98);
    keyboard(3.42, 2.98);      // 键盘贴着月牙的两个尖端，落在豁口正前方

    /* 轨迹球（Logitech MX Ergo，实测 132×99×51）。

       它不是一颗带球的椭圆鼠标。三视图里真正决定身份的是：
         · 俯视为不对称肾形：前端窄、右后掌托宽，左腰被拇指球切出一道凹口；
         · 高点偏在右后方，向左前的按键和球窝连续下坡；
         · 银蓝色球嵌在**左侧斜腰**，球轴朝左上，不是平放在背上。

       下面仍然只给主壳一个描边，但不再用椭球：先画真实的肾形底边，再把六层
       不同缩放、不同偏心的截面缝成一张连续曲面。这样没有内部黑圈，却同时拿到
       俯视轮廓和右后隆起。 */
    const tbBody = matte(0x2b2c31, { roughness: 0.46, metalness: 0.04 });
    const tbButton = matte(0x24252a, { roughness: 0.50 });
    const tbDark = matte(0x111216, { roughness: 0.48 });

    const tbPlan = new THREE.CatmullRomCurve3([
        new THREE.Vector3( 0.066, 0,  0.000),   // 窄前鼻
        new THREE.Vector3( 0.058, 0,  0.028),
        new THREE.Vector3( 0.038, 0,  0.045),
        new THREE.Vector3( 0.004, 0,  0.050),   // 右侧最宽
        new THREE.Vector3(-0.041, 0,  0.047),
        new THREE.Vector3(-0.064, 0,  0.029),
        new THREE.Vector3(-0.068, 0,  0.002),   // 圆后缘
        new THREE.Vector3(-0.057, 0, -0.025),
        new THREE.Vector3(-0.032, 0, -0.033),   // 球后的收腰
        new THREE.Vector3(-0.010, 0, -0.036),
        new THREE.Vector3( 0.012, 0, -0.055),   // 拇指球外侧的包边
        new THREE.Vector3( 0.039, 0, -0.054),
        new THREE.Vector3( 0.059, 0, -0.031),
    ], true, 'catmullrom', 0.42).getSpacedPoints(64).slice(0, -1);

    /** level = [y, xScale, zScale, xShift, zShift] */
    const tbShell = (levels) => {
        const seg = tbPlan.length;
        const pos = [], idx = [];
        for (const [y, sx, sz, dx, dz] of levels) {
            for (const p of tbPlan) pos.push(p.x * sx + dx, y, p.z * sz + dz);
        }
        for (let j = 0; j < levels.length - 1; j++) {
            const lo = j * seg, hi = (j + 1) * seg;
            for (let i = 0; i < seg; i++) {
                const n = (i + 1) % seg;
                idx.push(lo + i, hi + n, lo + n, lo + i, hi + i, hi + n);
            }
        }
        const first = levels[0], last = levels.at(-1);
        const bottom = pos.length / 3;
        pos.push(first[3], first[0], first[4]);
        const top = pos.length / 3;
        pos.push(last[3], last[0] + 0.001, last[4]);
        const topLoop = (levels.length - 1) * seg;
        for (let i = 0; i < seg; i++) {
            const n = (i + 1) % seg;
            idx.push(bottom, i, n);
            idx.push(top, topLoop + n, topLoop + i);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    };

    const trackball = (mx, mz) => {
        const y0 = TOP + TH;
        const mouse = new THREE.Group();
        mouse.position.set(mx, y0, mz);
        mouse.rotation.y = 0.14;                    // 桌上自然略微摆斜
        group.add(mouse);

        // MX Ergo 的磁吸倾斜底板：只露一圈很薄的深色裙边。
        solid(tbShell([
            [0.001, 0.93, 0.93,  0.000, 0.000],
            [0.006, 1.02, 1.02, -0.001, 0.000],
            [0.010, 0.99, 0.99, -0.001, 0.000],
        ]), matte(0x15161a, { roughness: 0.44, metalness: 0.18 }), {
            parent: mouse, outline: 0.0025, cast: false,
        });

        solid(tbShell([
            [0.007, 0.96, 0.96,  0.000, 0.000],
            [0.014, 1.00, 1.00,  0.000, 0.000],
            [0.026, 0.96, 0.94, -0.004, 0.002],
            [0.037, 0.86, 0.82, -0.010, 0.006],
            [0.045, 0.71, 0.66, -0.016, 0.010],
            [0.050, 0.50, 0.43, -0.021, 0.013],
        ]), tbBody, { parent: mouse, outline: 0.004, cast: false });

        /* 球窝朝左上方。球心落在壳面上，壳体自动挡住内半球；深色 torus 是
           球窝唇边，让它读作“嵌入”，而不是在外壳旁粘了一颗珠子。 */
        const ballAt = [0.016, 0.030, -0.034];
        solid(new THREE.TorusGeometry(0.0207, 0.0026, 8, 28), tbDark, {
            position: ballAt, rotation: [-2.67, 0, 0], parent: mouse,
            outline: 0.0015, cast: false,
        });

        // 银蓝轨迹球不是纯色塑料：几层半透明云斑就足以做出实物的珠光纹。
        const ballCanvas = document.createElement('canvas');
        ballCanvas.width = 256; ballCanvas.height = 128;
        const btc = ballCanvas.getContext('2d');
        const bg = btc.createLinearGradient(0, 0, 256, 128);
        bg.addColorStop(0, '#779aa9'); bg.addColorStop(0.5, '#a9c2ca'); bg.addColorStop(1, '#668895');
        btc.fillStyle = bg; btc.fillRect(0, 0, 256, 128);
        const pseudo = (n) => {
            const v = Math.sin(n * 91.731 + 17.13) * 43758.5453;
            return v - Math.floor(v);
        };
        for (let i = 0; i < 28; i++) {
            const x = pseudo(i) * 256, y = pseudo(i + 41) * 128;
            const r = 10 + pseudo(i + 83) * 28;
            const cloud = btc.createRadialGradient(x, y, 0, x, y, r);
            cloud.addColorStop(0, i % 3 ? 'rgba(231,239,239,0.30)' : 'rgba(53,89,103,0.22)');
            cloud.addColorStop(1, 'rgba(110,145,158,0)');
            btc.fillStyle = cloud; btc.fillRect(x - r, y - r, r * 2, r * 2);
        }
        const ballTex = new THREE.CanvasTexture(ballCanvas);
        ballTex.colorSpace = THREE.SRGBColorSpace;
        ballTex.wrapS = THREE.RepeatWrapping;
        solid(new THREE.SphereGeometry(0.0205, 28, 20), matte(0xffffff, {
            roughness: 0.19, metalness: 0.32, map: ballTex,
        }), { position: ballAt, parent: mouse, outline: 0.0025, cast: false });

        // 左右主键沿着前坡铺开。只靠轻微色差和窄分缝区分，不各画一圈粗边。
        const leftKey = solid(rb(0.041, 0.0026, 0.022, 0.0012, 3), tbButton, {
            position: [0.039, 0.034, -0.013], parent: mouse, outline: 0, cast: false,
        });
        leftKey.rotation.y = -0.05;
        const rightKey = solid(rb(0.047, 0.0026, 0.030, 0.0012, 3), tbButton, {
            position: [0.034, 0.039, 0.018], parent: mouse, outline: 0, cast: false,
        });
        rightKey.rotation.y = 0.04;
        /* 两道分缝顺着壳面弯，不能用悬空的直方条：纵缝分开左右键，横缝把
           按键区和掌托断开，俯视正好是照片里那个不规则十字。 */
        const seam = (pts) => solid(new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(pts), 10, 0.00065, 5, false,
        ), tbDark, { parent: mouse, outline: 0, cast: false });
        seam([
            new THREE.Vector3(0.062, 0.0305, 0.002),
            new THREE.Vector3(0.045, 0.0408, 0.002),
            new THREE.Vector3(0.014, 0.0460, 0.003),
        ]);
        seam([
            new THREE.Vector3(0.014, 0.0410, -0.020),
            new THREE.Vector3(0.011, 0.0455,  0.002),
            new THREE.Vector3(0.008, 0.0435,  0.028),
        ]);

        // 中央橡胶滚轮，轴沿左右方向；后面是模式切换小键。
        solid(cyl(0.0055, 0.0055, 0.010, 14), matte(0x44464d, { roughness: 0.72 }), {
            position: [0.047, 0.039, 0.002], rotation: [Math.PI / 2, 0, 0],
            parent: mouse, outline: 0.0015, cast: false,
        });
        solid(cyl(0.0036, 0.0036, 0.002, 12), tbDark, {
            position: [0.019, 0.0455, 0.003], parent: mouse, outline: 0, cast: false,
        });

        // 拇指球上方两枚前进 / 后退键，贴着左侧斜面。
        for (const [x, z] of [[0.040, -0.034], [0.023, -0.037]]) {
            const sideKey = solid(rb(0.012, 0.0022, 0.006, 0.001, 3), tbDark, {
                position: [x, 0.032, z], parent: mouse, outline: 0, cast: false,
            });
            sideKey.rotation.x = -0.43;
        }

        // 掌托上的浅灰 logi 标记；用一张透明贴面，远看只是正确的明度点。
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 256; logoCanvas.height = 96;
        const lc = logoCanvas.getContext('2d');
        lc.clearRect(0, 0, 256, 96);
        lc.fillStyle = 'rgba(220,220,216,0.72)';
        lc.font = '600 62px sans-serif'; lc.textAlign = 'center'; lc.textBaseline = 'middle';
        lc.fillText('logi', 128, 50);
        const logoTex = new THREE.CanvasTexture(logoCanvas);
        logoTex.colorSpace = THREE.SRGBColorSpace;
        const logo = solid(new THREE.PlaneGeometry(0.022, 0.0085), new THREE.MeshBasicMaterial({
            map: logoTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        }), { position: [-0.006, 0.0495, 0.018], parent: mouse, outline: 0, cast: false });
        logo.rotation.x = -Math.PI / 2;
    };
    trackball(3.40, 3.30);      // 键盘右手边（人坐 -X 面朝 +X，右手边是 +Z）

    /* 左桌的 Logitech MX Anywhere 3/3S。它是低矮紧凑的普通鼠标，不是缩小版
       MX Ergo：前端略窄、后掌托圆，拱顶最高点偏后，中间有一整条独立控制带。 */
    const mxBodyMat = matte(0x303138, { roughness: 0.49, metalness: 0.03 });
    const mxSkirtMat = matte(0x202126, { roughness: 0.66 });
    const mxStripMat = matte(0x24252b, { roughness: 0.54 });
    const mxPlan = new THREE.CatmullRomCurve3([
        new THREE.Vector3( 0.050, 0,  0.000),
        new THREE.Vector3( 0.045, 0,  0.022),
        new THREE.Vector3( 0.027, 0,  0.031),
        new THREE.Vector3(-0.010, 0,  0.033),
        new THREE.Vector3(-0.039, 0,  0.027),
        new THREE.Vector3(-0.050, 0,  0.014),
        new THREE.Vector3(-0.052, 0,  0.000),
        new THREE.Vector3(-0.049, 0, -0.018),
        new THREE.Vector3(-0.033, 0, -0.029),
        new THREE.Vector3(-0.004, 0, -0.033),
        new THREE.Vector3( 0.029, 0, -0.030),
        new THREE.Vector3( 0.047, 0, -0.018),
    ], true, 'catmullrom', 0.46).getSpacedPoints(48).slice(0, -1);

    const loftMouse = (plan, levels) => {
        const seg = plan.length, pos = [], idx = [];
        for (const [y, sx, sz, dx, dz] of levels) {
            for (const p of plan) pos.push(p.x * sx + dx, y, p.z * sz + dz);
        }
        for (let j = 0; j < levels.length - 1; j++) {
            const lo = j * seg, hi = (j + 1) * seg;
            for (let i = 0; i < seg; i++) {
                const n = (i + 1) % seg;
                idx.push(lo + i, hi + n, lo + n, lo + i, hi + i, hi + n);
            }
        }
        const bottom = pos.length / 3;
        pos.push(levels[0][3], levels[0][0], levels[0][4]);
        const top = pos.length / 3, last = levels.at(-1), topLoop = (levels.length - 1) * seg;
        pos.push(last[3], last[0], last[4]);
        for (let i = 0; i < seg; i++) {
            const n = (i + 1) % seg;
            idx.push(bottom, i, n, top, topLoop + n, topLoop + i);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        return geo;
    };

    const mxAnywhere = (mx, mz) => {
        const mouse = new THREE.Group();
        mouse.position.set(mx, TOP + TH, mz);
        mouse.rotation.y = -0.055;
        group.add(mouse);

        // 深色下裙与连续拱壳分开，留下实物底缘那圈清楚的水平分模线。
        solid(loftMouse(mxPlan, [
            [0.003, 1.00, 1.00, 0, 0],
            [0.009, 1.01, 1.01, 0, 0],
            [0.013, 0.98, 0.98, 0, 0],
        ]), mxSkirtMat, { position: [0, 0, 0], parent: mouse, outline: 0.0035, cast: false });
        /* 拱壳。实物全高 34.4mm，所以顶面收在 0.0338 —— 原来做到 0.038，
           再加上浮在外面的滚轮，整只有 52mm，比实物高一半，看着就是颗蛋。
           中间多插一层，从 0.024 到顶是连续收拢，不再是「圆腰 + 平顶盖」。 */
        solid(loftMouse(mxPlan, [
            [0.0100, 0.98, 0.98,  0.000, 0],
            [0.0170, 0.98, 0.97, -0.001, 0],
            [0.0240, 0.93, 0.92, -0.004, 0],
            [0.0290, 0.84, 0.81, -0.008, 0],
            [0.0325, 0.66, 0.60, -0.012, 0],
            [0.0338, 0.38, 0.34, -0.015, 0],
        ]), mxBodyMat, { position: [0, 0, 0], parent: mouse, outline: 0.004, cast: false });

        /* 下面这几件都贴着上面那张曲面放。壳顶是拱的，所以每件的 y 是照着
           它自己那个 x 处的壳面高度算的 —— 取一个统一的 y 就会像原来那样，
           后半截陷进去、前半截飞出来。

           实物的中央控制带是**从滚轮一路往后**的一条窄脊，模式键、指示灯、
           logi 标依次排在带子里，左右两个大按键分列两侧。带子略高出壳面。
           拱顶从 x=0.004 往后是平的、往前才快速下坡，一根直条没法同时贴合，
           所以拆成后段（平）+ 前段（顺着坡）两截，接缝处只差 0.2mm。 */
        const STRIP_Z = 0.017;
        // 后段：压在平顶上，装指示灯和 logo
        solid(rb(0.022, 0.0022, STRIP_Z, 0.006, 4), mxStripMat, {
            position: [-0.003, 0.0334, 0], parent: mouse, outline: 0.0009, cast: false,
        });
        // 前段：顺着前坡往下，装模式键，末端接滚轮
        solid(rb(0.0233, 0.0022, STRIP_Z, 0.006, 4), mxStripMat, {
            position: [0.0195, 0.0313, 0], rotation: [0, 0, -0.164],
            parent: mouse, outline: 0.0009, cast: false,
        });

        /* MagSpeed 金属滚轮（轴沿 Z）。实物是露在槽口外的一整圈滚花轮，
           所以要露得出来 —— 壳面在 x=0.034 处高 0.0290，这里露 2.2mm。
           （上一版沉到只剩 1.5mm，反而不像了。）位置也顶到前坡上：实物滚轮
           前面只剩一道窄唇，放在 0.030 会在鼻子上多出 11mm 机身。
           轮下垫一块暗面当槽壁。 */
        const wheelR = 0.0088, wheelW = 0.0076;
        solid(box(0.017, 0.006, wheelW + 0.0026), matte(0x111216, { roughness: 0.9 }), {
            position: [0.034, 0.0260, 0], parent: mouse, outline: 0, cast: false,
        });
        solid(cyl(wheelR, wheelR, wheelW, 22), matte(0x8f8c85, {
            roughness: 0.42, metalness: 0.50,
        }), {
            position: [0.034, 0.0290 + 0.0022 - wheelR, 0], rotation: [Math.PI / 2, 0, 0],
            parent: mouse, outline: 0.0012, cast: false,
        });

        // 带子里的模式切换键 → 指示灯 → logo，从前往后排（和实物一致）
        solid(rb(0.009, 0.0028, 0.0055, 0.002, 3), matte(0x44454c, { roughness: 0.48 }), {
            position: [0.017, 0.0340, 0], parent: mouse, outline: 0.0011, cast: false,
        });
        solid(cyl(0.0011, 0.0011, 0.0010, 12), matte(0x15161a, { roughness: 0.5 }), {
            position: [0.004, 0.0349, 0], parent: mouse, outline: 0, cast: false,
        });

        /* 滚轮**前面**那一小段左右键分模线。带子占了滚轮往后的中线，
           所以这儿只剩鼻尖这一截；前坡陡，得跟着倾斜。 */
        solid(box(0.0110, 0.0016, 0.0013), mxSkirtMat, {
            position: [0.042, 0.02285, 0], rotation: [0, 0, -0.753],
            parent: mouse, outline: 0, cast: false,
        });

        // 拇指侧的前进 / 后退双键；面对屏幕时鼠标左侧是 -Z。
        for (const [x, y] of [[0.004, 0.023], [-0.015, 0.021]]) {
            solid(rb(0.013, 0.005, 0.0016, 0.0015, 3), mxStripMat, {
                position: [x, y, -0.0306], parent: mouse, outline: 0.0012, cast: false,
            });
        }

        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 192; logoCanvas.height = 72;
        const lc = logoCanvas.getContext('2d');
        lc.clearRect(0, 0, 192, 72);
        lc.fillStyle = 'rgba(125,126,132,0.78)';
        lc.font = '600 45px sans-serif'; lc.textAlign = 'center'; lc.textBaseline = 'middle';
        lc.fillText('logi', 96, 38);
        const logoTex = new THREE.CanvasTexture(logoCanvas);
        logoTex.colorSpace = THREE.SRGBColorSpace;
        const logo = solid(new THREE.PlaneGeometry(0.017, 0.0064), new THREE.MeshBasicMaterial({
            map: logoTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        }), { position: [-0.008, 0.0348, 0], parent: mouse, outline: 0, cast: false });
        logo.rotation.x = -Math.PI / 2;
    };

    // 键盘右沿 z=2.195；这里留 27mm 操作缝，同时离桌边仍有约 22mm。
    mxAnywhere(3.40, 2.255);

    group.userData.lamps = {
        ...(group.userData.lamps || {}),
        screenbar: { pick: [sbarBody, sbarGlow], shade: null, glow: sbarGlowMat },
    };

    /* 两张桌子中间那道缝里那盏灯。实物是一支黄铜悬臂灯，值得照着做：

         · 竖杆上端一个**滚花枢轴**，横臂从中间穿过去
         · 横臂过了枢轴还往回伸出一截**配重尾巴**，端头一个圆帽
         · 靠灯罩那半截更粗（伸缩管），接缝处一道压边
         · 罩子是**拉丝钢色**的锥筒，不是黄铜；顶上一颗黄铜小帽

       原来是「一根杆 + 一根横棍 + 一个小圆锥」，三件几何体，凑近就露怯。 */
    const brass = metal(0xb08d55, 0.32);
    const brassDark = metal(0x8e7040, 0.38);
    const GX = 3.84, GZ = 2.345;   // 杆正好穿过两桌之间那道 7cm 缝
    const PIV = 1.44;
    // 底座和立杆是拧死在地上的，转不动，留在 group 上
    solid(cyl(0.095, 0.11, 0.026, 18), brass, { position: [GX, 0.013, GZ], parent: group, outline: 0.006, cast: false });
    solid(cyl(0.016, 0.019, PIV - 0.02, 10), brass, {
        position: [GX, (PIV - 0.02) / 2 + 0.02, GZ], parent: group, outline: 0.006,
    });

    /* 滚花枢轴以外的一整条 —— 配重尾巴、伸缩管、灯罩 —— 全挂在 armPivot 上，
       绕 z 一转就是把灯臂抬起来 / 压下去，跟实物拧松那颗滚花螺母是一回事。
       所以下面这一串坐标都是**相对枢轴**的，别再往里写绝对的 GX / PIV。 */
    const armPivot = new THREE.Group();
    armPivot.position.set(GX, PIV, GZ);
    group.add(armPivot);
    solid(cyl(0.030, 0.030, 0.038, 18), brassDark, {        // 滚花枢轴
        position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], parent: armPivot, outline: 0.005, cast: false,
    });
    solid(cyl(0.019, 0.019, 0.050, 14), brass, {
        position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], parent: armPivot, outline: 0.004, cast: false,
    });
    solid(cyl(0.0115, 0.0115, 0.235, 12), brass, {          // 配重尾巴
        position: [0.118, 0, 0], rotation: [0, 0, Math.PI / 2], parent: armPivot, outline: 0.005, cast: false,
    });
    solid(cyl(0.0125, 0.0125, 0.020, 12), brass, {          // 尾端圆帽
        position: [0.240, 0, 0], rotation: [0, 0, Math.PI / 2], parent: armPivot, outline: 0.004, cast: false,
    });
    solid(cyl(0.0155, 0.0155, 0.300, 12), brass, {          // 伸缩管（粗）
        position: [-0.155, 0, 0], rotation: [0, 0, Math.PI / 2], parent: armPivot, outline: 0.005, cast: false,
    });
    solid(cyl(0.0175, 0.0175, 0.014, 12), brassDark, {      // 接缝压边
        position: [-0.300, 0, 0], rotation: [0, 0, Math.PI / 2], parent: armPivot, outline: 0.004, cast: false,
    });
    solid(cyl(0.0125, 0.0125, 0.185, 12), brass, {          // 前段（细）
        position: [-0.398, 0, 0], rotation: [0, 0, Math.PI / 2], parent: armPivot, outline: 0.005, cast: false,
    });

    /* 臂和罩是**侧接**的，不是「罩挂在臂端底下」。
       实拍看得很清楚：臂管一直伸到罩子旁边，末端一副铰链耳，拧在罩子
       上部的侧壁上；罩顶那块盖板连同那颗滚花铜帽，明显还在臂的上方。
       原来把球形关节顶在罩子正中心，罩子就成了吊在杆头的一只灯笼，
       罩顶和铜帽全被臂挡住 —— 那是「连接位置」错了，不是尺寸错了。

       几何是解出来的：铰链落在罩壁往外让开 15mm 的地方，罩子的轴心
       因此要往外 50mm、往上 60mm，才能让接点正好落在臂的中心线上。 */
    const SH = 0.205;
    const HINGE_X = -0.500;                  // 铰链（相对枢轴）
    solid(cyl(0.018, 0.018, 0.030, 14), brassDark, {        // 臂端那半边铰链耳
        position: [-0.490, 0, 0], rotation: [Math.PI / 2, 0, 0], parent: armPivot, outline: 0.004, cast: false,
    });

    const shadeHinge = new THREE.Group();    // 罩子绕这儿转，独立于灯臂
    shadeHinge.position.set(HINGE_X, 0, 0);
    armPivot.add(shadeHinge);
    solid(cyl(0.0105, 0.0105, 0.046, 12), brass, {          // 穿过铰链的调节螺栓
        position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], parent: shadeHinge, outline: 0.003, cast: false,
    });
    solid(box(0.030, 0.026, 0.013), brass, {                // 拧在罩壁上的托板
        position: [-0.016, 0.004, 0], parent: shadeHinge, outline: 0.004, cast: false,
    });

    /* 灯罩：**拉丝黄铜**锥筒，和臂管同色（这里之前记成拉丝钢了，实拍里
       罩子和臂是一整套黄铜）。朝左前下方照着左桌。锥筒是开口的，材质要
       双面，不然从侧下方看进去是空的。

       罩子比臂稍亮一档：实物那层是抛得更亮的旋压面，一整套同一个色号
       反而糊成一根管子，读不出「臂」和「罩」是两件。 */
    const shadeGrp = new THREE.Group();
    shadeGrp.position.set(-0.050, 0.060, 0);
    shadeGrp.rotation.z = -0.34;
    shadeHinge.add(shadeGrp);
    const shadeBrass = metal(0xc09a5c, 0.26);
    const cone = solid(cyl(0.044, 0.086, SH, 22, 1, true), shadeBrass, {
        position: [0, -SH / 2, 0], parent: shadeGrp, outline: 0.007, cast: false,
    });
    cone.material.side = THREE.DoubleSide;
    // 金属罩不发光，「亮着」全靠罩口那圈；关灯就是把那圈灭掉
    const deskGlow = diffuserMaterial();
    const capTop = solid(cyl(0.048, 0.048, 0.012, 22), shadeBrass, {       // 顶盖，比锥口略探出一圈
        position: [0, 0.006, 0], parent: shadeGrp, outline: 0.004, cast: false,
    });
    const capKnob = solid(cyl(0.011, 0.011, 0.030, 10), brass, {           // 顶上那颗小帽
        position: [0, 0.028, 0], parent: shadeGrp, outline: 0.004, cast: false,
    });
    const mouth = solid(cyl(0.080, 0.080, 0.004, 22), deskGlow, {          // 罩口那圈暖光
        position: [0, -SH + 0.012, 0], parent: shadeGrp, outline: 0, cast: false,
    });
    /* 罩子能转了，光就不能再写死世界坐标。挂两个空节点在罩子里：
       罩口一个、罩口正下方 1.2m 一个，聚光灯每帧照着它俩摆位就行。 */
    const aimAt = new THREE.Object3D();
    aimAt.position.set(0, -SH + 0.012 - 1.2, 0);
    shadeGrp.add(aimAt);

    group.userData.lamps = {
        ...(group.userData.lamps || {}),
        desk: {
            /* 开关灯直接拿罩子本身当命中件 —— 不能再套一个大命中盒，
               那个盒子会把旁边两个关节的命中盒一起吞掉。 */
            pick: [cone, capTop, capKnob, mouth],
            shade: null, glow: deskGlow,
            mouth: mouth, aim: aimAt,
            joints: [
                { name: 'arm', node: armPivot, label: '转灯臂',
                  stops: [-0.28, -0.14, 0, 0.14, 0.28],
                  pick: [lampGrab(new THREE.SphereGeometry(0.048, 10, 8), [0, 0, 0], armPivot)] },
                /* 罩子自带 -0.34 的仰角，所以这一档加完正好落在 0 —— 也就是
                   「垂直朝下照」，再往那边转就该照到窗户上去了，到此为止。 */
                { name: 'shade', node: shadeHinge, label: '转灯罩',
                  stops: [-0.34, -0.17, 0, 0.17, 0.34],
                  pick: [lampGrab(box(0.052, 0.052, 0.056), [0.010, 0, 0], shadeHinge)] },
            ],
        },
    };
}

/** 五星脚 + 气杆。两把椅子共用，颜色不同。
 *  椅子本地坐标：+X 是「人面朝的方向」，靠背在 -X 那头。 */
function chairBase(g, { metalColor, casterColor = 0x1b1b20, R = 0.31, colH = 0.34 }) {
    const met = metal(metalColor, 0.34);
    const dark = matte(casterColor, { roughness: 0.55 });
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        // 脚是一根从中心斜伸出去的扁杆，末端才是轮子
        const arm = solid(rb(R, 0.030, 0.055, 0.012), met, {
            position: [Math.cos(a) * R / 2, 0.085, Math.sin(a) * R / 2],
            rotation: [0, -a, 0], parent: g, outline: 0.006, cast: false,
        });
        arm.rotation.set(0, -a, -0.10);
        solid(cyl(0.030, 0.030, 0.024, 10), dark, {
            position: [Math.cos(a) * R, 0.032, Math.sin(a) * R],
            rotation: [Math.PI / 2, 0, 0], parent: g, outline: 0.005, cast: false,
        });
    }
    solid(cyl(0.055, 0.070, 0.06, 12), met, { position: [0, 0.12, 0], parent: g, outline: 0.006, cast: false });
    solid(cyl(0.032, 0.038, colH, 12), met, { position: [0, 0.12 + colH / 2, 0], parent: g, outline: 0.006 });
}

/** 棕色高背办公椅（实拍：侧视 + 背视两张）。
 *
 *  之前那版有三处错：
 *    · 靠背分成「背板 + 头枕鼓包」两块 —— 实物是**一整片**到顶的高背，
 *      没有独立头枕，圆角收头。
 *    · 靠背太矮太厚。实测背顶离地约 1.20m，板厚只有 10cm 出头。
 *    · 扶手做成了黑色直角框。实物是**两根古铜色弯管**从坐垫下面斜挑出来，
 *      上面搭一块薄皮垫，垫子前端是悬空的 —— 这是这把椅子最认得出的特征。
 *
 *  椅子本地坐标：+X 是人面朝的方向，靠背在 -X 那头。 */
function buildLeatherChair(parent, x, z, rot = 0) {
    const g = new THREE.Group();
    // 干邑色皮，比之前那版亮一档：实拍在灯下是 #b0703f 上下
    const hide = matte(0xa9754a, { roughness: 0.58 });
    const hideDark = matte(0x8e5c37, { roughness: 0.62 });
    // 缝线是橙白撞色，这个尺度只做得出「一条浅色细缝」
    const stitch = matte(0xd8a874, { roughness: 0.7 });
    const bronze = metal(0x8a6a45, 0.36);

    chairBase(g, { metalColor: 0x6b5744, colH: 0.32, R: 0.32 });

    const SEAT = 0.46;

    /* 坐垫：后厚前薄的一块楔子，前缘兜下去 */
    const seat = solid(rb(0.50, 0.105, 0.50, 0.048), hide, {
        position: [0.03, SEAT, 0], parent: g, outline: 0.010,
    });
    seat.rotation.z = -0.045;                    // 前低后高
    // 坐垫和靠背之间那条腰线
    solid(rb(0.045, 0.030, 0.46, 0.012), hideDark, {
        position: [-0.20, SEAT + 0.035, 0], parent: g, outline: 0.006, cast: false,
    });

    /* 靠背不是一块带圆角的长方体，更没有独立塞进去的腰垫。实物侧视是一条
       连续 S 曲线：根部厚、腰部向前托，上背逐渐后仰，顶部再收薄。每一行是
       [高度, 中心X, 半宽Z, 厚度X]，用超椭圆截面缝成封闭皮革壳体。 */
    const backRows = [
        [0.465, -0.195, 0.205, 0.120],
        [0.510, -0.188, 0.226, 0.122],
        [0.600, -0.190, 0.236, 0.116],
        [0.710, -0.207, 0.238, 0.106],
        [0.835, -0.232, 0.236, 0.098],
        [0.960, -0.260, 0.231, 0.090],
        [1.080, -0.287, 0.224, 0.083],
        [1.165, -0.305, 0.212, 0.078],
        [1.205, -0.311, 0.198, 0.074],
    ];
    const ringSeg = 28, backPos = [], backIdx = [];
    for (const [yy, cx, hz, thick] of backRows) {
        for (let i = 0; i < ringSeg; i++) {
            const a = i / ringSeg * Math.PI * 2;
            const ca = Math.cos(a), sa = Math.sin(a);
            // n=4 的超椭圆：正背面宽而柔和，侧边连续卷过去，不留方板边。
            const ex = Math.sign(ca) * Math.sqrt(Math.abs(ca));
            const ez = Math.sign(sa) * Math.sqrt(Math.abs(sa));
            backPos.push(cx + thick / 2 * ex, yy, hz * ez);
        }
    }
    for (let row = 0; row < backRows.length - 1; row++) {
        const lo = row * ringSeg, hi = (row + 1) * ringSeg;
        for (let i = 0; i < ringSeg; i++) {
            const n = (i + 1) % ringSeg;
            backIdx.push(lo + i, hi + i, lo + n, lo + n, hi + i, hi + n);
        }
    }
    const bottom = backPos.length / 3;
    backPos.push(backRows[0][1], backRows[0][0], 0);
    const top = backPos.length / 3, lastRow = backRows.at(-1), topLoop = (backRows.length - 1) * ringSeg;
    backPos.push(lastRow[1], lastRow[0], 0);
    for (let i = 0; i < ringSeg; i++) {
        const n = (i + 1) % ringSeg;
        backIdx.push(bottom, i, n, top, topLoop + n, topLoop + i);
    }
    const backGeo = new THREE.BufferGeometry();
    backGeo.setAttribute('position', new THREE.Float32BufferAttribute(backPos, 3));
    backGeo.setIndex(backIdx);
    backGeo.computeVertexNormals();
    solid(backGeo, hide, { position: [0, 0, 0], parent: g, outline: 0.009, cast: false });

    /* 原图下腰处是一道贴着皮面的缝线，不是一根浅色长方体。正面位置由同一条
       超椭圆算出，缝线会随靠背横向弧度轻微后退。 */
    const seamY = 0.625, seamCx = -0.194, seamHalfW = 0.232, seamThick = 0.113;
    const seamPts = [];
    for (let i = 0; i <= 24; i++) {
        const z2 = -seamHalfW * 0.94 + seamHalfW * 1.88 * i / 24;
        const ratio = Math.min(1, Math.abs(z2) / seamHalfW);
        const frontCurve = Math.pow(1 - Math.pow(ratio, 4), 0.25);
        seamPts.push(new THREE.Vector3(seamCx + seamThick / 2 * frontCurve + 0.002, seamY, z2));
    }
    solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPts), 36, 0.0023, 6, false), stitch, {
        parent: g, outline: 0, cast: false,
    });

    // 两侧包边随 S 曲线走，替代原先圆角盒子边缘形成的生硬黑框。
    for (const sd of [-1, 1]) {
        const edgePts = backRows.slice(1).map(([yy, cx, hz]) => new THREE.Vector3(cx, yy, sd * hz * 0.998));
        solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts), 40, 0.0020, 6, false), stitch, {
            parent: g, outline: 0, cast: false,
        });
    }

    /* 扶手。皮垫前端悬空，靠两根弯管从坐垫下面挑起来 —— 管子是
       CatmullRom 扫出来的，写死几个控制点比拿 Torus 掰姿态清楚得多。 */
    for (const sd of [-1, 1]) {
        const zz = sd * 0.285;
        const tube = (pts) => solid(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(...v))), 24, 0.0105, 8, false),
            bronze, { parent: g, outline: 0.005, cast: false },
        );
        tube([                                   // 前管
            [-0.085, SEAT - 0.075, sd * 0.235],
            [0.020, SEAT - 0.040, sd * 0.272],
            [0.115, SEAT + 0.075, zz],
            [0.150, SEAT + 0.190, zz],
        ]);
        tube([                                   // 后管
            [-0.140, SEAT - 0.075, sd * 0.235],
            [-0.105, SEAT + 0.010, sd * 0.272],
            [-0.035, SEAT + 0.110, zz],
            [-0.010, SEAT + 0.190, zz],
        ]);
        // 薄皮垫，前端探到坐垫前缘之外
        solid(rb(0.315, 0.034, 0.084, 0.016), hideDark, {
            position: [0.075, SEAT + 0.212, zz], parent: g, outline: 0.007, cast: false,
        });
    }

    g.position.set(x, 0, z);
    g.rotation.y = rot;
    parent.add(g);
    return g;
}

/** 黑色人体工学网椅（实拍图二）：细框网背 + 独立头枕，
 *  扶手是宽平的黑塑料板，五星脚是银灰色。 */
function buildMeshChair(parent, x, z, rot = 0) {
    const g = new THREE.Group();
    const mesh = matte(0x2b2b31, { roughness: 0.95, noise: 1 });
    const plastic = matte(0x1f1f24, { roughness: 0.55 });
    const silver = matte(0x9298a0, { roughness: 0.42, metalness: 0.45 });

    chairBase(g, { metalColor: 0x9aa0a8, colH: 0.32 });

    const SEAT = 0.45;
    solid(rb(0.50, 0.085, 0.50, 0.035), mesh, { position: [0.01, SEAT, 0], parent: g, outline: 0.010 });
    solid(rb(0.52, 0.055, 0.52, 0.020), plastic, { position: [0.01, SEAT - 0.06, 0], parent: g, outline: 0.008, cast: false });

    // 网背：薄一片，两侧有银色细框
    const back = solid(rb(0.055, 0.60, 0.42, 0.030), mesh, {
        position: [-0.245, SEAT + 0.34, 0], parent: g, outline: 0.009,
    });
    back.rotation.z = 0.15;
    for (const s of [-1, 1]) {
        const rail = solid(rb(0.045, 0.62, 0.030, 0.012), silver, {
            position: [-0.245, SEAT + 0.34, s * 0.225], parent: g, outline: 0.006, cast: false,
        });
        rail.rotation.z = 0.15;
    }
    // 头枕：单独一块，比背再往后仰一点
    const head = solid(rb(0.06, 0.15, 0.30, 0.035), mesh, {
        position: [-0.355, SEAT + 0.76, 0], parent: g, outline: 0.008,
    });
    head.rotation.z = 0.30;
    solid(rb(0.035, 0.12, 0.035, 0.010), silver, {
        position: [-0.315, SEAT + 0.66, 0], parent: g, outline: 0.005, cast: false,
    });

    // 扶手：宽平板 + 银色调节座
    for (const s of [-1, 1]) {
        solid(rb(0.035, 0.17, 0.045, 0.012), plastic, {
            position: [-0.13, SEAT + 0.08, s * 0.27], parent: g, outline: 0.006, cast: false,
        });
        solid(rb(0.055, 0.055, 0.055, 0.014), silver, {
            position: [-0.13, SEAT + 0.17, s * 0.27], parent: g, outline: 0.005, cast: false,
        });
        solid(rb(0.32, 0.042, 0.095, 0.020), plastic, {
            position: [0.01, SEAT + 0.21, s * 0.27], parent: g, outline: 0.008, cast: false,
        });
    }

    g.position.set(x, 0, z);
    g.rotation.y = rot;
    parent.add(g);
    return g;
}

/* ---------- 沙发（扫描 sofa_rect_0，朝 +Z 对着电视） ---------- */

function buildSofa(group) {
    const X0 = 0.33, X1 = 2.23, Z0 = 1.78, Z1 = 2.70;
    const cx = (X0 + X1) / 2;
    const fabric = matte(0xd8d3c8, { roughness: 0.92, noise: 1 });
    const fabricDark = matte(0xcbc5b8, { roughness: 0.92, noise: 1 });
    const legMat = matte(0x6f5138, { roughness: 0.6 });

    // 座箱
    solid(rb(X1 - X0, 0.22, Z1 - Z0 - 0.10, 0.03), fabricDark, {
        position: [cx, 0.30, (Z0 + Z1) / 2 + 0.05], parent: group, outline: 0.011,
    });
    // 靠背（在 -Z 那一侧）
    solid(rb(X1 - X0, 0.52, 0.20, 0.04), fabric, {
        position: [cx, 0.57, Z0 + 0.10], parent: group, outline: 0.011,
    });
    // 扶手
    for (const ax of [X0 + 0.11, X1 - 0.11]) {
        solid(rb(0.22, 0.30, Z1 - Z0 - 0.06, 0.05), fabric, {
            position: [ax, 0.44, (Z0 + Z1) / 2 + 0.03], parent: group, outline: 0.011,
        });
    }
    // 座垫 + 靠垫，两座
    for (const s of [-1, 1]) {
        const sx = cx + s * 0.42;
        solid(rb(0.80, 0.15, Z1 - Z0 - 0.30, 0.045), fabric, {
            position: [sx, 0.475, (Z0 + Z1) / 2 + 0.09], parent: group, outline: 0.010,
        });
        solid(rb(0.80, 0.40, 0.16, 0.05), fabricDark, {
            position: [sx, 0.72, Z0 + 0.19], parent: group, outline: 0.010,
        });
    }
    // 木脚
    for (const lx of [X0 + 0.12, X1 - 0.12]) {
        for (const lz of [Z0 + 0.14, Z1 - 0.14]) {
            solid(cyl(0.022, 0.030, 0.19, 8), legMat, { position: [lx, 0.095, lz], parent: group, outline: 0.006 });
        }
    }
    // 那只长毛靠枕
    solid(rb(0.42, 0.34, 0.16, 0.075), matte(0xe8e5dc, { roughness: 0.98, noise: 1 }), {
        position: [cx + 0.52, 0.70, Z0 + 0.30], rotation: [0.12, 0.2, -0.10], parent: group, outline: 0.010,
    });

    /* 茶几（扫描 table_dining_rect_0：1.16 × 0.63，高 0.45）。
       实物是中世纪那种「肾形 / 逗号」异形板，之前那版把两件事都摆反了：

         · 宽大的圆头在 **+X**（坐在沙发上看过去是画面**左**边），
           -X 那头收成一个小圆头 —— 原来是反的
         · 凹口开在 **朝沙发那一侧**（-Z），朝电视柜那侧（+Z）是一条长凸边
           —— 原来也是反的

       轮廓拿 Shape + splineThru 过手摆的点画，比拼贝塞尔控制点好调。 */
    const V2 = (x, y) => new THREE.Vector2(x, y);
    /* 桌面中心（沙发在 -Z、电视柜在 +Z）。

       z 从 3.325 挪到 3.19：原来茶几前沿在 3.650，离电视柜正面只有 400mm，
       而柜门宽 542mm —— 门开到设计角度自由边会落在 3.543，直接扎进茶几。
       实物那几扇门是开得开的，所以错的是茶几的位置不是门。挪 135mm 之后
       离柜 535mm、离沙发 175mm（茶几本来就是贴着沙发放的），门就让得开了。
       沙发前沿到电视柜一共只有 1350mm、茶几进深 640mm，两条缝总共 710mm
       可分 —— 这个屋子就这么大，只能这么分。 */
    const TX = 1.40, TZ = 3.19;
    /* 注意：Shape 画在 XY 平面，rotateX(-90°) 之后 shape-y 映射到世界 **-Z**。
       所以「凹口朝沙发（-Z）」= 这些点的 y 取**正**。 */
    const bean = new THREE.Shape();
    bean.moveTo(0.58, 0.02);
    bean.splineThru([
        V2(0.55, 0.17), V2(0.44, 0.28), V2(0.28, 0.33),          // 宽圆头（+X）绕到沙发侧
        V2(0.10, 0.27), V2(-0.08, 0.14), V2(-0.26, 0.10),        // 朝沙发的凹口
        V2(-0.42, 0.14), V2(-0.53, 0.10), V2(-0.58, 0.01),       // 小圆头（-X）
        V2(-0.54, -0.08), V2(-0.40, -0.14), V2(-0.20, -0.22),    // 朝电视柜的长凸边
        V2(0.02, -0.28), V2(0.24, -0.31), V2(0.44, -0.26),
        V2(0.56, -0.13), V2(0.58, 0.02),
    ]);
    const beanGeo = new THREE.ExtrudeGeometry(bean, {
        depth: 0.036, bevelEnabled: true, bevelThickness: 0.007,
        bevelSize: 0.009, bevelSegments: 2, curveSegments: 28,
    });
    beanGeo.rotateX(-Math.PI / 2);
    solid(beanGeo, woodFor(1.16, 0.64, { color: 0xb47a45 }), {
        position: [TX, 0.414, TZ], parent: group, outline: 0.009,
    });
    /* 三条深色锥形腿，都往外撇：宽头那边两条（一前一后），小圆头那边一条。
       腿要落在轮廓**里面**，不然从沙发的机位看过去会有一截腿悬在板子外。 */
    const darkLeg = matte(0x4a3423, { roughness: 0.6 });
    for (const [sx, sy] of [[0.30, 0.18], [0.30, -0.19], [-0.44, 0.00]]) {
        const lx = TX + sx, lz = TZ - sy;      // shape-y -> -Z
        solid(cyl(0.015, 0.027, 0.43, 8), darkLeg, {
            position: [lx, 0.215, lz],
            rotation: [(TZ - lz) * 0.55, 0, -(lx - TX) * 0.42],
            parent: group, outline: 0.006,
        });
    }
}

/* ---------- 影音那一头：电视 + 电视柜 + 抽屉柜 + 唱机 + 音箱 + 边几 + PS5 ---------- */

function buildMedia(group) {
    const white = matte(0xd9d6cb, { roughness: 0.5 });
    const mint = matte(0xbfd0c2, { roughness: 0.55 });   // 照片二里电视柜那两扇淡绿门
    const dark = matte(0x1c1c22, { roughness: 0.6 });
    /* 客厅这几件也能开，和厨房共用 KitchenScene 那一套。 */
    const cabinets = group.userData.cabinets || (group.userData.cabinets = []);
    const shelfMat = matte(0xcfcbc0, { roughness: 0.7 });
    const drawerBox = matte(0xb9b3a6, { roughness: 0.8 });

    /* 开门不能穿茶几。与其拍一个「就开 40°」的死数（茶几一挪又穿回去），
       不如按当前家具位置算：把门当成从合页伸出去的一条线段，沿开合角
       一点点扫过去，撞上障碍框的那一刻就停下来、再留 5° 余量。
       门是绕 y 转的，合页本地点 (-hinge*L, 0, 0) 转 φ 之后：
         x = hx - hinge*L*cos φ,  z = hz + hinge*L*sin φ */
    const swingClearOf = (hx, hz, len, hinge, spin, maxSwing, boxes, M = 0.020) => {
        const hit = (t) => {
            const phi = spin * t;
            for (let f = 0.30; f <= 1.0001; f += 0.175) {
                const L = len * f;
                const x = hx - hinge * L * Math.cos(phi);
                const z = hz + hinge * L * Math.sin(phi);
                for (const b of boxes) {
                    if (x > b.x0 - M && x < b.x1 + M && z > b.z0 - M && z < b.z1 + M) return true;
                }
            }
            return false;
        };
        for (let t = 0.06; t <= maxSwing + 1e-6; t += 0.02) {
            if (hit(t)) return Math.max(0.20, t - 0.05);
        }
        return maxSwing;
    };
    /* 那张豆形茶几的包围盒：shape 的 y 映射到世界 -Z，所以
       y∈[-0.31, 0.33] ⇒ z ∈ [TZ-0.33, TZ+0.31]，x = 1.40 ± 0.58。
       茶几挪到 3.19 之后这个框已经让开了门，clampSwing 现在返回满角；
       它留着是**兜底**：以后谁再挪家具，门会自己让，不会闷头穿过去。 */
    const COFFEE_TABLE = { x0: 0.82, x1: 1.98, z0: 2.86, z1: 3.50 };

    /* 电视柜 lx 0.62..2.27, lz 4.05..4.61, 高 0.72 */
    const cX0 = 0.62, cX1 = 2.27, cZ0 = 4.05, cZ1 = 4.61, cH = 0.72;
    /* 门色是「绿—白—绿」。三扇门**铺满整个正面** —— 柜体正面除了 6mm 的
       缝几乎看不到白色柜身。之前每扇只做了 0.42 宽、上下还各留 4.5cm，
       三扇缩在中间，看着像三块贴在柜面上的小板。 */
    const REVEAL = 0.006;
    const dw = (cX1 - cX0 - REVEAL * 4) / 3;
    const dh = cH - REVEAL * 2;
    /* 里面**不分上下层**：是三个通高的竖格，一扇门正对一格。
       原来给了一块贯通的横层板（shelves: [0]），门一开看进去就成了上下两层。 */
    carcass(group, {
        w: cX1 - cX0, h: cH, d: cZ1 - cZ0, pos: [(cX0 + cX1) / 2, cH / 2, (cZ0 + cZ1) / 2],
        face: 'z-', mat: white, innerMat: shelfMat, outline: 0.009, shelves: [],
    });
    /* 两块竖隔板，落在三扇门之间那两道门缝的正后方 —— 门开了，格子和门是对齐的。
       板厚跟 carcass 的 t 一致；进深比柜体浅一点，免得和背板、门共面打架。 */
    const CT = 0.018, divD = (cZ1 - cZ0) - CT - 0.010;
    for (let i = 1; i <= 2; i++) {
        solid(box(CT, cH - CT * 2, divD), shelfMat, {
            position: [cX0 + REVEAL * (i + 0.5) + dw * i, cH / 2, cZ0 + 0.005 + divD / 2],
            parent: group, outline: 0.005, cast: false,
        });
    }
    /* 三扇门都能开。注意这个柜子**正面朝 -Z**（朝沙发），和厨房那些朝 +Z 的
       正好相反 —— 所以同样的合页边，转的方向要反过来，这里 spin = -hinge。
       门后同样垫一块暗面，不然开了里面还是白柜体。 */
    [mint, white, mint].forEach((m, i) => {
        const dx = cX0 + REVEAL + dw / 2 + i * (dw + REVEAL);
        // 实物是左边两扇的合页在左、最右那扇在右 —— 不是左右交替
        const hinge = i < 2 ? -1 : 1;
        const g = new THREE.Group();
        g.position.set(dx + hinge * dw / 2, cH / 2, cZ0 - 0.012);
        group.add(g);
        const door = solid(rb(dw, dh, 0.022, 0.005), m, {
            position: [-hinge * dw / 2, 0, 0], parent: g, outline: 0.009,
        });
        // 中间那扇白门里嵌着一块更浅的方框（照片四）
        if (i === 1) {
            solid(box(dw - 0.11, dh - 0.14, 0.006), matte(0xeeece5, { roughness: 0.55 }), {
                position: [-hinge * dw / 2, 0, -0.014], parent: g, outline: 0.006, cast: false,
            });
        }
        const hx = dx + hinge * dw / 2, hz = cZ0 - 0.012;
        const swing = swingClearOf(hx, hz, dw, hinge, -hinge, 1.15, [COFFEE_TABLE]);
        cabinets.push({ kind: 'door', node: g, pick: [door], spin: -hinge, swing });
    });

    /* 电视 lx 0.71..2.19, y 0.77..1.63。

       脚是靠外缘的两只，但**不是「小方柱 + 垫板」**：实物每只脚是一根细亮
       金属条弯成的**扁 Λ**，尖朝上顶在屏底，两条腿一前一后叉开撑在柜面上
       —— 前后叉开是为了防止这么薄的屏往前栽。屏底离柜面只有 5cm，所以这个
       Λ 很扁，腿差不多是躺着的（离水平只有 22°）。 */
    const tvLeg = metal(0xb4bac2, 0.24);
    const AP_Y = 0.770, FT_Y = 0.727, SPREAD = 0.105;   // 尖端高 / 落点高 / 前后叉开
    const LEG_L = Math.hypot(AP_Y - FT_Y, SPREAD);
    const LEG_A = Math.atan2(SPREAD, AP_Y - FT_Y);      // 离竖直的夹角
    for (const fx of [0.95, 1.95]) {
        for (const s of [-1, 1]) {
            /* 绕 X 转 θ 把 +Y 推向 +Z，所以要「上端在中间、下端往 s 方向叉开」
               得取 **-s**·LEG_A —— 取 +s 的话整条腿是倒过来的。 */
            const leg = solid(rb(0.016, LEG_L, 0.011, 0.004, 1), tvLeg, {
                position: [fx, (AP_Y + FT_Y) / 2, 4.32 + s * SPREAD / 2],
                parent: group, outline: 0.005,
            });
            leg.rotation.x = -s * LEG_A;
            // 落点的小脚垫
            solid(rb(0.020, 0.007, 0.026, 0.003, 1), tvLeg, {
                position: [fx, cH + 0.0035, 4.32 + s * SPREAD], parent: group, outline: 0.004, cast: false,
            });
        }
        // 尖端那颗和屏底相接的小接头
        solid(rb(0.022, 0.014, 0.030, 0.005, 1), tvLeg, {
            position: [fx, AP_Y - 0.004, 4.32], parent: group, outline: 0.004, cast: false,
        });
    }
    solid(rb(1.48, 0.86, 0.045, 0.006), dark, { position: [1.45, 1.20, 4.32], parent: group, outline: 0.010 });
    solid(box(1.43, 0.81, 0.006), matte(0x161d29, { roughness: 0.26, metalness: 0.2 }), {
        position: [1.45, 1.20, 4.294], parent: group, outline: 0, cast: false,
    });

    /* 白色六斗柜（扫描 storage_cabinet_low1_0），上面那台唱机 */
    const dX0 = -0.33, dX1 = 0.13, dZ0 = 2.93, dZ1 = 3.58, dH = 0.74;
    carcass(group, {
        // 开口朝 +X：w 是沿开口面的宽（这里是 z 向），d 是进深（x 向）
        w: dZ1 - dZ0, h: dH, d: dX1 - dX0, pos: [(dX0 + dX1) / 2, dH / 2, (dZ0 + dZ1) / 2],
        face: 'x+', mat: white, innerMat: shelfMat, outline: 0.009,
    });
    /* 五个抽屉，正面朝 +X，所以是沿 +X 拉出来。抽屉盒挂在同一个 group 上，
       拉开才有东西看 —— 只滑一块面板出来，就是一块白板浮在空中。 */
    const dCz = (dZ0 + dZ1) / 2, dFw = dZ1 - dZ0 - 0.06, dFh = dH / 5 - 0.02;
    for (let i = 0; i < 5; i++) {
        const cy = dH / 5 * (i + 0.5);
        const g = new THREE.Group();
        g.position.set(0, 0, 0);
        group.add(g);
        const front = solid(rb(0.021, dFh, dFw, 0.005), white, {
            position: [dX1 + 0.011, cy, dCz], parent: g, outline: 0.008,
        });
        const dd = 0.34, dbh = dFh - 0.018, dbx = dX1 - dd / 2 - 0.014;
        solid(box(dd, 0.010, dFw - 0.02), drawerBox, {
            position: [dbx, cy - dbh / 2, dCz], parent: g, outline: 0, cast: false,
        });
        for (const sz of [-1, 1]) {
            solid(box(dd, dbh, 0.010), drawerBox, {
                position: [dbx, cy, dCz + sz * (dFw / 2 - 0.012)], parent: g, outline: 0, cast: false,
            });
        }
        solid(box(0.010, dbh, dFw - 0.02), drawerBox, {
            position: [dX1 - dd - 0.014, cy, dCz], parent: g, outline: 0, cast: false,
        });
        cabinets.push({ kind: 'drawer', node: g, pick: [front], axis: 'x', dir: 1, travel: 0.28 });
        // 最上面那一格：谱子收在这儿（buildSheetMusic 往里摆）
        if (i === 4) group.userData.sheetDrawer = { node: g, x: dbx, y: cy - dbh / 2 + 0.005, z: dCz };
    }
    /* 唱机（Pro-Ject 那种入门带罩的）。之前是「一块白板 + 一个绿盘」，
       凑近就是两块几何体；实物的读数全在细节上：四只脚、亚克力罩、
       后右角那支唱臂（轴座 / 配重 / 臂管 / 唱头）。

       朝向：正面朝 +X（屋里），所以**宽度沿 z、进深沿 x** —— 唱机总是
       宽大于深，之前反了，看着像块方板。 */
    const TT_X = -0.10, TT_Z = 3.26;          // 机身中心，和斗柜同轴
    const TT_W = 0.415, TT_D = 0.315;         // 宽（沿 z）/ 深（沿 x）
    const TT_Y = dH + 0.020;                  // 机身底面（脚 2cm）
    const ttBody = matte(0xe6e3da, { roughness: 0.42 });
    const ttDark = matte(0x2b2b30, { roughness: 0.5 });
    const ttChrome = metal(0xc3c8ce, 0.22);

    for (const fx of [TT_X - TT_D / 2 + 0.045, TT_X + TT_D / 2 - 0.045]) {
        for (const fz of [TT_Z - TT_W / 2 + 0.05, TT_Z + TT_W / 2 - 0.05]) {
            solid(cyl(0.019, 0.021, 0.020, 12), ttDark, {
                position: [fx, dH + 0.010, fz], parent: group, outline: 0.004, cast: false,
            });
        }
    }
    solid(rb(TT_D, 0.046, TT_W, 0.006), ttBody, {
        position: [TT_X, TT_Y + 0.023, TT_Z], parent: group, outline: 0.008,
    });
    const deck = TT_Y + 0.046;                // 机身顶面
    /* 唱盘偏左前（朝屋里看，左边是 +z），右后角让给唱臂。
       唱盘 / 黑胶 / 压片全挂在 platter 这个 group 上，播放时整组转 —— 转速
       33⅓ 转/分。唱盘本身是旋转对称的，光看它转不出来，所以**唱片中心那张
       偏心的标签**才是「在转」的唯一读数，别把它做成正圆纯色。 */
    const PL_X = TT_X + 0.010, PL_Z = TT_Z + 0.060;
    const platter = new THREE.Group();
    platter.position.set(PL_X, deck, PL_Z);
    group.add(platter);
    /* 唱盘是**铝盘 + 一块绿绒垫**，不是一整块绿的。这件事非分开做不可：
       原来唱盘是一张 R148 的纯绿圆片，和 R150 的黑胶几乎同径 —— 空盘时它自己
       就长得像一张绿唱片，上片那一下就成了「绿胶突然变成黑胶」。
       绒垫收到 R116、盘沿留出一圈铝，空盘的读数才是「转盘」而不是「唱片」。 */
    solid(cyl(0.140, 0.136, 0.018, 36), metal(0xa9aeb2, 0.30), {
        position: [0, 0.018, 0], parent: platter, outline: 0.005, cast: false,
    });
    solid(cyl(0.116, 0.116, 0.0035, 32), matte(0x63b892, { roughness: 0.88 }), {   // 绿绒垫
        position: [0, 0.0288, 0], parent: platter, outline: 0.003, cast: false,
    });
    /* 12 吋黑胶：不放唱片时收起来。收/放不是「显示/隐藏」——
       那是另一种「突然变了」。见 KitchenScene：从 LP_LIFT 那么高**落**下来。 */
    const lp = new THREE.Group();
    lp.position.y = 0.0318;                                   // 贴着绒垫面
    lp.visible = false;
    platter.add(lp);
    solid(cyl(0.150, 0.150, 0.0022, 48), matte(0x121215, { roughness: 0.30 }), {
        position: [0, 0, 0], parent: lp, outline: 0.003, cast: false,
    });
    // 盘上这张就是唱机在放的那张（Frank Ocean《Blonde》/ Pink + White）
    solid(cyl(0.0505, 0.0505, 0.0009, 32), artworkMaterial('/travel/covers/frank-ocean-blonde.jpg', 0xbfc6c9), {
        position: [0, 0.0017, 0], parent: lp, outline: 0, cast: false,
    });
    solid(cyl(0.030, 0.030, 0.010, 20), ttChrome, {           // 中心压片
        position: [0, 0.0375, 0], parent: platter, outline: 0.003, cast: false,
    });
    solid(cyl(0.0035, 0.0035, 0.024, 8), ttChrome, {          // 唱盘轴
        position: [0, 0.042, 0], parent: platter, outline: 0, cast: false,
    });
    for (const dz of [0.055, 0.105]) {                        // 转速 / 电源
        solid(cyl(0.011, 0.011, 0.006, 12), ttDark, {
            position: [TT_X + TT_D / 2 - 0.038, deck + 0.003, TT_Z + TT_W / 2 - dz],
            parent: group, outline: 0.003, cast: false,
        });
    }

    /* 唱臂：后右角起，斜着探到唱盘上方。挂在自己的 Group 上，
       以后要「放唱片」只要转这个 group 的 y。 */
    const armX = TT_X - 0.058, armZ = TT_Z - TT_W / 2 + 0.058;
    solid(cyl(0.021, 0.024, 0.042, 16), ttChrome, {           // 轴座
        position: [armX, deck + 0.021, armZ], parent: group, outline: 0.004, cast: false,
    });
    const arm = new THREE.Group();
    arm.position.set(armX, deck + 0.050, armZ);
    arm.rotation.y = -0.60;                                   // 臂管沿 +z 伸出，转向唱盘
    group.add(arm);
    solid(cyl(0.0045, 0.0045, 0.215, 10), ttChrome, {
        position: [0, 0, 0.108], rotation: [Math.PI / 2, 0, 0], parent: arm, outline: 0.003, cast: false,
    });
    solid(box(0.019, 0.015, 0.030), ttDark, {                 // 唱头
        position: [0, -0.009, 0.222], parent: arm, outline: 0.003, cast: false,
    });
    solid(cyl(0.020, 0.020, 0.026, 14), ttDark, {             // 配重
        position: [0, 0, -0.050], rotation: [Math.PI / 2, 0, 0], parent: arm, outline: 0.004, cast: false,
    });
    solid(cyl(0.006, 0.006, 0.028, 8), ttChrome, {            // 升降杆
        position: [armX + 0.028, deck + 0.023, armZ + 0.028], parent: group, outline: 0.003, cast: false,
    });
    solid(cyl(0.008, 0.008, 0.050, 10), ttChrome, {           // 臂托
        position: [armX - 0.008, deck + 0.028, armZ + 0.082], parent: group, outline: 0.003, cast: false,
    });

    /* 亚克力防尘罩。两处必须小心：

       · depthWrite 关掉 —— 开着会把罩子里的唱臂和唱盘剪掉。
       · **不能用 inkOutline** —— 描边是沿法线外扩的背面壳，套在不透明件上
         看不见，套在透明件上就成了一整块灰板扣在唱机上。透明件的边
         改用 EdgesGeometry 画线：亚克力本来也就是靠边角的高光才看得出来。 */
    const COVER_H = 0.115, COVER_D = TT_D + 0.024;
    const coverGeo = box(COVER_D, COVER_H, TT_W + 0.022);
    const cover = new THREE.Mesh(coverGeo, new THREE.MeshPhysicalMaterial({
        color: 0xe6ecec, roughness: 0.05, metalness: 0,
        transparent: true, opacity: 0.13, depthWrite: false,
        side: THREE.DoubleSide,
    }));
    /* 掀盖：铰链在**后缘的下沿**，所以罩子要挂在一个立在那条线上的 group 上，
       绕 z 转就是往后掀起来。直接转 mesh 会绕它自己的中心翻，看着像飘。 */
    const coverPivot = new THREE.Group();
    coverPivot.position.set(TT_X - COVER_D / 2, deck, TT_Z);
    group.add(coverPivot);
    cover.position.set(COVER_D / 2, COVER_H / 2, 0);
    cover.renderOrder = 1;
    cover.castShadow = cover.receiveShadow = false;
    cover.userData.ghost = true;      // 走位射线要能穿过去（拾取另有命中盒）
    coverPivot.add(cover);
    const coverEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(coverGeo),
        new THREE.LineBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.5 }),
    );
    coverEdges.userData.ghost = true;
    cover.add(coverEdges);
    /* 罩子自己是 ghost（射线穿过去才点得到里面的唱盘），可它又得能被点开，
       所以单独给它一个看不见的命中盒 —— 只盖住**顶面那一层**，不挡唱盘。 */
    const coverGrab = new THREE.Mesh(
        box(COVER_D, 0.030, TT_W + 0.022),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    coverGrab.position.set(COVER_D / 2, COVER_H - 0.015, 0);
    coverGrab.castShadow = coverGrab.receiveShadow = false;
    coverGrab.userData.pickProxy = true;
    coverPivot.add(coverGrab);
    for (const hz of [-0.13, 0.13]) {                         // 后铰链，跟着盖子转
        solid(box(0.022, 0.012, 0.030), ttDark, {
            position: [0.010, 0.014, hz], parent: coverPivot, outline: 0.003, cast: false,
        });
    }

    /* 交给 KitchenScene 接交互：掀盖、上唱片、转唱盘、落唱臂。
       几个角度是解出来的，别改了 armX/armZ 之后忘了跟着改：

         REST   -0.60  唱臂搁在托上，针尖在盘外
         OUTER  -0.354 针尖落在唱片最外圈（离盘心 145mm）
         INNER  +0.070 走到内圈（离盘心 55mm），一面放完 */
    const ttGrab = new THREE.Mesh(
        cyl(0.152, 0.152, 0.060, 20),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    ttGrab.position.set(PL_X, deck + 0.045, PL_Z);
    ttGrab.castShadow = ttGrab.receiveShadow = false;
    ttGrab.userData.pickProxy = true;
    group.add(ttGrab);

    group.userData.turntable = {
        platter, lp, arm, cover, coverPivot,
        pickCover: [coverGrab],
        pickPlay: [ttGrab],
        LID_OPEN: 1.22,
        ARM_REST: -0.60, ARM_OUTER: -0.354, ARM_INNER: 0.070,
        LP_Y: lp.position.y, LP_LIFT: 0.062,   // 唱片落到盘上 / 拿起来悬在多高
        // 音箱在北墙两侧，声音从那儿出来，不是从唱机出来
        speakers: [[-0.16, 1.07, 2.62], [-0.16, 1.07, 3.88]],
    };

    /* 两只书架箱（Kanto YU 那种），架在细黑脚架上，分居斗柜两侧。
       正面朝 +X：高音在上、低音在下，成对镜像 —— 单元各自往外侧偏一点。
       之前是一个白盒子加一个圆饼，读不出「音箱」。 */
    const SP_X = -0.16, SP_W = 0.152, SP_H = 0.235, SP_D = 0.185, SP_BASE = 0.95;
    for (const sz of [2.62, 3.88]) {
        const out = sz > 3.25 ? 1 : -1;
        solid(cyl(0.112, 0.132, 0.020, 20), dark, {
            position: [SP_X, 0.010, sz], parent: group, outline: 0.005, cast: false,
        });
        solid(cyl(0.019, 0.019, SP_BASE - 0.032, 10), dark, {
            position: [SP_X, (SP_BASE - 0.032) / 2 + 0.020, sz], parent: group, outline: 0.006,
        });
        solid(box(0.142, 0.008, 0.122), dark, {
            position: [SP_X, SP_BASE - 0.004, sz], parent: group, outline: 0.004, cast: false,
        });
        const cy = SP_BASE + SP_H / 2;
        solid(rb(SP_D, SP_H, SP_W, 0.008), matte(0xe4e1d8, { roughness: 0.55 }), {
            position: [SP_X, cy, sz], parent: group, outline: 0.009,
        });
        const face = SP_X + SP_D / 2, oz = sz + out * 0.010;
        // 低音：黑盆 + 银色防尘帽
        solid(cyl(0.049, 0.049, 0.005, 24), matte(0x1c1c20, { roughness: 0.74 }), {
            position: [face + 0.001, cy - 0.050, oz], rotation: [0, 0, Math.PI / 2],
            parent: group, outline: 0.004, cast: false,
        });
        solid(cyl(0.026, 0.040, 0.016, 24), matte(0x131317, { roughness: 0.82 }), {
            position: [face - 0.006, cy - 0.050, oz], rotation: [0, 0, -Math.PI / 2],
            parent: group, outline: 0, cast: false,
        });
        solid(cyl(0.013, 0.013, 0.010, 16), metal(0x9aa1a8, 0.30), {
            position: [face + 0.001, cy - 0.050, oz], rotation: [0, 0, Math.PI / 2],
            parent: group, outline: 0, cast: false,
        });
        // 高音：小黑圈 + 金属半球
        solid(cyl(0.023, 0.023, 0.005, 20), matte(0x1c1c20, { roughness: 0.74 }), {
            position: [face + 0.001, cy + 0.062, oz], rotation: [0, 0, Math.PI / 2],
            parent: group, outline: 0.003, cast: false,
        });
        solid(new THREE.SphereGeometry(0.011, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal(0x8f959c, 0.35), {
            position: [face + 0.003, cy + 0.062, oz], rotation: [0, 0, -Math.PI / 2],
            parent: group, outline: 0, cast: false,
        });
        // 侧面那个音量钮：只有主箱有
        if (out > 0) {
            solid(cyl(0.010, 0.010, 0.007, 12), dark, {
                position: [face - 0.032, cy - 0.012, sz + SP_W / 2 + 0.002],
                rotation: [Math.PI / 2, 0, 0], parent: group, outline: 0.003, cast: false,
            });
        }
    }

    /* 白色小边几（扫描 table_other_rect_1） */
    const tX0 = -0.04, tX1 = 0.54, tZ0 = 3.90, tZ1 = 4.51, tH = 0.60;
    solid(rb(tX1 - tX0, 0.035, tZ1 - tZ0, 0.008), white, {
        position: [(tX0 + tX1) / 2, tH - 0.018, (tZ0 + tZ1) / 2], parent: group, outline: 0.009,
    });
    solid(rb(tX1 - tX0 - 0.10, 0.028, tZ1 - tZ0 - 0.10, 0.006), white, {
        position: [(tX0 + tX1) / 2, 0.22, (tZ0 + tZ1) / 2], parent: group, outline: 0.008, cast: false,
    });
    for (const lx of [tX0 + 0.05, tX1 - 0.05]) {
        for (const lz of [tZ0 + 0.05, tZ1 - 0.05]) {
            solid(box(0.035, tH, 0.035), white, { position: [lx, tH / 2, lz], parent: group, outline: 0.006 });
        }
    }

    /* PS5（光驱版），竖放在边几和白斗柜之间。

       实拍里它并不是收在边几下面：边几右前腿挡在主机前面一点，主机本体在
       桌腿与旁边的白斗柜之间。场景里这两件家具沿 Z 留着 32cm，正好容下主机
       26cm 的进深，再各留约 3cm。宽面朝 +X，正对「影音角」机位，白色双壳、
       黑色中框和下半部的光驱鼓包都能读出来。 */
    const PS_X = 0.180, PS_Z = 3.740;
    const PS_H = 0.390;
    const ps = new THREE.Group();
    ps.position.set(PS_X, 0.016, PS_Z);
    // 只留很轻的偏角；转得太多会把 92mm 的薄机身看成厚重的方盒。
    ps.rotation.y = -0.07;
    group.add(ps);

    const psBlack = matte(0x17191e, { roughness: 0.42, metalness: 0.08 });
    const psWhite = matte(0xe9e9e5, { roughness: 0.38 });
    const psBlue = matte(0x71d9ff, {
        roughness: 0.25, emissive: 0x39bfff, emissiveIntensity: 1.35,
    });

    // 竖放底座：实物是前后较长的黑色椭圆盘，不是圆脚。
    const psBase = solid(cyl(0.096, 0.096, 0.014, 28), psBlack, {
        position: [0, -0.009, 0], parent: ps, outline: 0.005, cast: false,
    });
    psBase.scale.set(0.67, 1, 1);

    /* 黑色中芯不是圆角盒子：从侧面看，顶部缩进白色翼板之间，前后两条边
       也各自有一点内收。用独立轮廓挤出，顶端才会出现 PS5 那个深色「峡谷」。 */
    const coreShape = new THREE.Shape();
    coreShape.moveTo(-0.096, 0.014);
    coreShape.quadraticCurveTo(-0.108, 0.150, -0.101, 0.310);
    coreShape.lineTo(-0.090, 0.354);
    coreShape.quadraticCurveTo(-0.078, 0.372, -0.059, 0.374);
    coreShape.lineTo(0.088, 0.368);
    coreShape.lineTo(0.102, 0.337);
    coreShape.lineTo(0.099, 0.028);
    coreShape.lineTo(0.076, 0.012);
    coreShape.closePath();
    const coreGeo = new THREE.ExtrudeGeometry(coreShape, {
        depth: 0.058, bevelEnabled: true, bevelThickness: 0.001,
        bevelSize: 0.001, bevelSegments: 1, curveSegments: 10,
    });
    coreGeo.translate(0, 0, -0.029);
    coreGeo.rotateY(Math.PI / 2);        // shape-x → 世界 -Z，挤出方向 → 世界 X
    solid(coreGeo, psBlack, { parent: ps, outline: 0.006 });

    /* 两片白壳既不是平行板，也不是圆角矩形。它们在腰部贴近黑芯、越到顶部
       越向外翻，底部又轻微张开；侧面轮廓则是底窄顶长的刀片形。每片壳先按
       YZ 轮廓挤出，再逐顶点弯曲 X，才会同时拥有准确剪影和真正的双曲面。 */
    const shellShape = new THREE.Shape();
    shellShape.moveTo(-0.094, 0.008);
    shellShape.lineTo(-0.112, 0.046);
    shellShape.quadraticCurveTo(-0.120, 0.150, -0.116, 0.282);
    shellShape.quadraticCurveTo(-0.114, 0.365, -0.084, PS_H);
    shellShape.lineTo(0.139, 0.382);
    shellShape.quadraticCurveTo(0.132, 0.268, 0.128, 0.070);
    shellShape.lineTo(0.125, 0.027);
    shellShape.lineTo(0.091, 0.007);
    shellShape.closePath();

    const makeShell = (sx) => {
        const geo = new THREE.ExtrudeGeometry(shellShape, {
            depth: 0.006, bevelEnabled: false, curveSegments: 12,
        });
        geo.translate(0, 0, -0.003);
        geo.rotateY(Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const z = pos.getZ(i);
            const yn = Math.max(0, Math.min(1, y / PS_H));
            // 常规机身控制在约 92mm 内；顶部只做克制的外翻，板边保持刀锋感。
            const topFlare = 0.001 + 0.0075 * Math.pow(yn, 3.4);
            const bottomFlare = 0.0025 * Math.pow(1 - yn, 3.0);
            const edgeCurl = 0.001 * Math.pow(Math.min(1, Math.abs(z) / 0.13), 2.2);
            /* 光驱不另贴一块「蛋」：只把 +X 这片壳的前下半部连续顶出去。
               两个平方项控制鼓包的中心与衰减，边缘不会产生可见接缝。 */
            const drive = sx > 0
                ? 0.0105 * Math.exp(-Math.pow((y - 0.125) / 0.105, 2) - Math.pow((z + 0.030) / 0.090, 2))
                : 0;
            pos.setX(i, pos.getX(i) + sx * (0.0305 + topFlare + bottomFlare + edgeCurl) + drive);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        return geo;
    };
    for (const sx of [-1, 1]) {
        solid(makeShell(sx), psWhite, { parent: ps, outline: 0.005 });
    }

    // 光驱竖槽在前缘的白色鼓包上；上方黑芯里依次是 USB-C 与 USB-A。
    solid(rb(0.004, 0.118, 0.004, 0.0015, 1), psBlack, {
        position: [0.047, 0.132, -0.116], parent: ps, outline: 0, cast: false,
    });
    solid(rb(0.013, 0.005, 0.003, 0.0015, 1), metal(0x555b64, 0.35), {
        position: [0, 0.238, -0.109], parent: ps, outline: 0, cast: false,
    });
    solid(rb(0.014, 0.008, 0.003, 0.0015, 1), metal(0x555b64, 0.35), {
        position: [0, 0.210, -0.109], parent: ps, outline: 0, cast: false,
    });

    // 顶部进风口：一排横跨黑芯的短鳍片，近看能解释两片翼板之间为什么是空的。
    for (let i = 0; i < 7; i++) {
        solid(box(0.054, 0.003, 0.009), matte(0x24272d, { roughness: 0.66 }), {
            position: [0, 0.365 + i * 0.0015, -0.064 + i * 0.021],
            rotation: [0.08, 0, 0], parent: ps, outline: 0, cast: false,
        });
    }

    /* 蓝灯不在白壳表面竖着划一道线，而是贴着黑芯与两片壳的内缘，从顶部
       沿前角往下收。Tube 比直盒子多不了多少面，但近景轮廓完全不同。 */
    for (const sx of [-1, 1]) {
        const ledPath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(sx * 0.034, 0.371, 0.078),
            new THREE.Vector3(sx * 0.035, 0.374, 0.005),
            new THREE.Vector3(sx * 0.034, 0.359, -0.075),
            new THREE.Vector3(sx * 0.032, 0.304, -0.103),
        ]);
        solid(new THREE.TubeGeometry(ledPath, 18, 0.0015, 5, false), psBlue, {
            parent: ps, outline: 0, cast: false,
        });
    }

    // 电源 / 出仓键在正面最下方，做成嵌在黑芯里的两颗小银点。
    for (const y of [0.060, 0.081]) {
        solid(cyl(0.0032, 0.0032, 0.0022, 12), metal(0x777c83, 0.35), {
            position: [0, y, -0.108], rotation: [Math.PI / 2, 0, 0],
            parent: ps, outline: 0, cast: false,
        });
    }

    // 使用 Sony 的真实联合图形矢量路径，而不是用字体拼出「PS」两个字母。
    // 场景按需渲染，异步 SVG 载入完成后不一定恰好有下一帧；在创建时直接绘制
    // 同一条路径，既保留正确标形，也保证首帧就能看见。
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 256; logoCanvas.height = 200;
    const logoCtx = logoCanvas.getContext('2d');
    logoCtx.scale(1.25, 1.25);
    logoCtx.fillStyle = '#30343b';
    logoCtx.fill(new Path2D('m 197.23914,117.96194 c -3.8677,4.8796 -13.34356,8.36053 -13.34356,8.36053 0,0 -70.49109,25.31994 -70.49109,25.31994 0,0 0,-18.67289 0,-18.67289 0,0 51.87665,-18.48401 51.87665,-18.48401 5.887,-2.10924 6.79096,-5.09097 2.00581,-6.65604 -4.77616,-1.56957 -13.42451,-1.11983 -19.31601,0.99841 0,0 -34.56645,12.17426 -34.56645,12.17426 0,0 0,-19.37898 0,-19.37898 0,0 1.99232,-0.6746 1.99232,-0.6746 0,0 9.98856,-3.534896 24.03371,-5.09097 14.04515,-1.547081 31.24291,0.211374 44.74389,5.32933 15.21445,4.80764 16.92793,11.89543 13.06473,16.77502 z M 120.11451,86.165853 c 0,0 0,-47.752601 0,-47.752601 0,-5.608163 -1.03439,-10.771093 -6.29626,-12.232725 -4.0296,-1.290734 -6.53012,2.45104 -6.53012,8.054706 0,0 0,119.583887 0,119.583887 0,0 -32.250314,-10.23591 -32.250314,-10.23591 0,0 0,-142.58321 0,-142.58321 13.712343,2.54549 33.689454,8.56291 44.429074,12.18326 27.31226,9.376917 36.57225,21.047482 36.57225,47.343343 0,25.630256 -15.82159,35.344478 -35.92463,25.63925 z M 15.862004,131.01768 C 0.24279269,126.6193 -2.3566614,117.45375 4.7626047,112.17389 c 6.5795883,-4.8751 17.7689333,-8.54492 17.7689333,-8.54492 0,0 46.241498,-16.442224 46.241498,-16.442224 0,0 0,18.744854 0,18.744854 0,0 -33.275709,11.90892 -33.275709,11.90892 -5.878004,2.10924 -6.781967,5.09547 -2.005807,6.66054 4.780657,1.56506 13.433512,1.11983 19.320511,-0.99391 0,0 15.961005,-5.79256 15.961005,-5.79256 0,0 0,16.77053 0,16.77053 -1.011893,0.17989 -2.140724,0.35978 -3.184104,0.53518 -15.965505,2.60845 -32.969893,1.5201 -49.726928,-4.00262 z'));
    const logoTex = new THREE.CanvasTexture(logoCanvas);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    logoTex.anisotropy = 4;
    const logoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.021, 0.0163),
        new THREE.MeshBasicMaterial({
            map: logoTex, transparent: true, alphaTest: 0.08, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false,
            side: THREE.DoubleSide,
        }),
    );
    logoMesh.position.set(0.0445, 0.307, 0.052);
    logoMesh.rotation.y = Math.PI / 2;
    logoMesh.renderOrder = 4;
    logoMesh.castShadow = logoMesh.receiveShadow = false;
    ps.add(logoMesh);
}

/* ---------- 落地灯两盏（扫描里没有，但它们是这屋子夜里的光源） ---------- */

/** 亮着的布灯罩。每盏灯各要一份 —— 材质是共享引用，
 *  共用一份的话开一盏三盏一起亮。
 *
 *  颜色是有讲究的：底色和自发光都得**留住黄**。之前给的是米白底
 *  + 1.7 的自发光，漫画滤镜再叠 1.38 的对比和 1.16 的饱和，直接顶到
 *  纯白 —— 那就是「过曝」的来源。实物那个罩子是明确的暖黄，最白的地方
 *  只有底下罩口那一圈。所以：底色压深、自发光收到 0.95 但颜色更饱和，
 *  真正接近白的只留给罩口那块小圆片。 */
const shadeMaterial = () => matte(0xd9b871, {
    roughness: 0.9,
    emissive: 0xffffff,                 // 颜色交给贴图，这里给白让它原样透出来
    emissiveMap: shadeGradient(),
    emissiveIntensity: 1.7,
});
const diffuserMaterial = () => matte(0xfff4dc, {
    roughness: 0.85, emissive: 0xffe6b4, emissiveIntensity: 2.2,
});
/** 看不见的命中盒，用来点灯罩开关 */
const lampGrab = (geo, pos, parent) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        transparent: true, opacity: 0, depthWrite: false, colorWrite: false,
    }));
    m.position.set(...pos);
    m.castShadow = m.receiveShadow = false;
    m.userData.pickProxy = true;
    parent.add(m);
    return m;
};

function buildLamps(group) {
    const brass = metal(0xb59a6a, 0.35);
    const dark = matte(0x2a2a30, { roughness: 0.6 });
    const lamps = {};

    /* 弓形落地灯：底座在北墙边，灯臂弯过来罩住沙发那头（照片二）。
       灯臂用一条曲线扫出来 —— 拿 TorusGeometry 去掰姿态很难对，
       写死起落点反而清楚。 */
    solid(cyl(0.20, 0.22, 0.035, 20), dark, { position: [-0.22, 0.018, 2.30], parent: group, outline: 0.007, cast: false });
    const spine = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.22, 0.04, 2.30),
        new THREE.Vector3(-0.22, 1.10, 2.30),
        new THREE.Vector3(-0.19, 1.86, 2.38),
        new THREE.Vector3(0.10, 2.16, 2.62),
        new THREE.Vector3(0.58, 2.18, 2.86),
        new THREE.Vector3(0.92, 1.98, 2.97),
    ].map((v) => v));
    /* 弓臂是**藤编**的，不是铜管 —— 实拍里能一圈一圈数出缠绕的痕。
       所以除了把颜色换成浅藤色，还沿着曲线套了一圈圈细环；
       少了这个它就只是一根塑料棒。 */
    const rattan = matte(0xd6bd90, { roughness: 0.88 });
    solid(new THREE.TubeGeometry(spine, 40, 0.021, 8, false), rattan, {
        parent: group, outline: 0.006,
    });
    const ringGeo = new THREE.TorusGeometry(0.0222, 0.0042, 5, 12);
    const ringMat = matte(0xc7aa79, { roughness: 0.9 });
    const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
    for (let i = 1; i < 30; i++) {
        const t = i / 30;
        spine.getPointAt(t, tmpP);
        spine.getTangentAt(t, tmpT);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(tmpP);
        ring.lookAt(tmpP.clone().add(tmpT));       // 环面法线对齐切线
        ring.castShadow = false;
        group.add(ring);
    }

    const arcShade = shadeMaterial();
    solid(cyl(0.21, 0.25, 0.30, 20, 1, true), arcShade, {
        position: [0.92, 1.80, 2.97], parent: group, outline: 0.008, cast: false,
    });
    // 罩口那块亮片：整盏灯里唯一该接近白的地方
    const arcGlow = diffuserMaterial();
    solid(cyl(0.238, 0.238, 0.004, 20), arcGlow, {
        position: [0.92, 1.655, 2.97], parent: group, outline: 0, cast: false,
    });
    lamps.arc = {
        pick: [lampGrab(cyl(0.30, 0.30, 0.34, 12), [0.92, 1.80, 2.97], group)],
        shade: arcShade, glow: arcGlow,
    };

    /* 电视机旁那盏落地灯。杆的形状前面猜错了三次，实物是：

         **两片平行的钢板，隔开一段距离立着。**

       所以两个正交的机位看到的是完全不同的东西 ——
         · 正对板面看：后面那片被前面那片完全挡住，是一根「实心扁柱」
         · 转 90° 看：只看见两片板的**厚度边**，中间除了这两条边**全是空的**，
           而且空到底、不是中间开一条缝

       两片朝上收拢、朝下分开（顶部净空 ~0.03、底部 ~0.09），底下两腿之间还有
       一个半圆的弧面件。镂空的那一面朝 -X，也就是朝电视柜那边。

       之前先做成一整片扁板（没有厚度）、又做成中间挖一条长缝，都是因为只看到
       正面那一个机位。 */
    /* 拉丝不锈钢，不是镜面：metalness 压到 0.35。metal() 的 0.72 在这种
       只有点光源、没有环境贴图的角落里会把立面渲成一片黑，只剩一道高光。 */
    const steel = matte(0xc6ccd4, { roughness: 0.42, metalness: 0.35 });
    const acrylic = matte(0xdde7ee, {
        roughness: 0.10, metalness: 0.04, transparent: true, opacity: 0.5,
    });
    const LX = 2.62, LZ = 4.24;
    const PLATE_Y = 0.010, POST_H = 1.10;
    const P_W = 0.062, P_T = 0.016;          // 钢带：宽（沿 X）/ 厚（沿 Z）
    const Z_TOP = 0.0215;                    // 顶端两腿中心线离轴
    const Y_BEND = 0.113, Z_BEND = 0.060;    // 底部 U 弯的圆心高度 / 半径
                                             // （U 外沿最低点 = 0.113-0.068 = 0.045，贴近底板）

    const stem = new THREE.Group();
    stem.position.set(LX, PLATE_Y, LZ);
    group.add(stem);

    // 平底方钢板（在 stem 底下，所以 y 用负的回到地面）
    solid(rb(0.27, PLATE_Y, 0.27, 0.003, 1), steel, {
        position: [0, -PLATE_Y / 2, 0], parent: stem, outline: 0.006, cast: false,
    });

    /* 杆是**一整条钢带**：从顶上下来、在底部拐一个 180° 的 U 弯、再上去。
       所以两条腿不是两个零件，中间那片空一直通到 U 弯的圆弧为止。

       断面（U 形环带）画在 (z, y) 平面上，再沿 X 挤出钢带的宽度 —— 一次
       ExtrudeGeometry 就是整根杆，弯角自然是圆的，不用去拼圆柱段。
       外圈走「过底部」的那半边、内圈反着走一圈，中间就空出来。 */
    const R_OUT = Z_BEND + P_T / 2, R_IN = Z_BEND - P_T / 2;
    const u = new THREE.Shape();
    u.moveTo(Z_TOP + P_T / 2, POST_H);                 // 外圈：右腿外沿往下
    u.lineTo(R_OUT, Y_BEND);
    u.absarc(0, Y_BEND, R_OUT, 0, Math.PI, true);      // 顺时针 = 从右经底到左
    u.lineTo(-(Z_TOP + P_T / 2), POST_H);              // 左腿外沿回到顶
    u.lineTo(-(Z_TOP - P_T / 2), POST_H);              // 内圈：左腿内沿往下
    u.lineTo(-R_IN, Y_BEND);
    u.absarc(0, Y_BEND, R_IN, Math.PI, Math.PI * 2, false);   // 逆时针 = 从左经底到右
    u.lineTo(Z_TOP - P_T / 2, POST_H);
    u.closePath();

    const uGeo = new THREE.ExtrudeGeometry(u, {
        depth: P_W, bevelEnabled: true, bevelThickness: 0.0015,
        bevelSize: 0.0015, bevelSegments: 1, curveSegments: 16,
    });
    uGeo.translate(0, 0, -P_W / 2);
    uGeo.rotateY(-Math.PI / 2);       // shape-x → 世界 Z、挤出方向 → 世界 X
    solid(uGeo, steel, { position: [0, 0, 0], parent: stem, outline: 0.005 });

    /* U 弯和底板之间是一小截**方颈**，比钢带窄一圈 —— 所以侧面看过去，
       钢带落到这儿会有一道明显的**台阶**（实拍上那道横向的肩线）。
       之前做成了一块下宽上窄的三角托板，那是想当然：实物没有加强筋，
       就是一小段方料，而且很矮（U 的最低点离底板只有 45mm）。 */
    const NECK_W = 0.042, NECK_D = 0.028, NECK_H = 0.058;
    solid(rb(NECK_W, NECK_H, NECK_D, 0.003, 1), steel, {
        position: [0, NECK_H / 2, 0], parent: stem, outline: 0.005,
    });

    // 顶上的小方箍 → 透明亚克力方块 → 罩颈
    solid(rb(0.075, 0.022, 0.062, 0.004, 1), steel, {
        position: [0, POST_H + 0.011, 0], parent: stem, outline: 0.005, cast: false,
    });
    solid(rb(0.060, 0.058, 0.060, 0.005, 1), acrylic, {
        position: [0, POST_H + 0.051, 0], parent: stem, outline: 0.005, cast: false,
    });
    solid(cyl(0.012, 0.012, 0.032, 12), steel, {
        position: [0, POST_H + 0.095, 0], parent: stem, outline: 0.004, cast: false,
    });
    // 直筒方罩：宽 0.36 × 高 0.32 × 深 0.30，底 1.22
    const boxShade = shadeMaterial();
    solid(rb(0.36, 0.32, 0.30, 0.006, 1), boxShade, {
        position: [0, POST_H + 0.266, 0], parent: stem, outline: 0.008, cast: false,
    });
    const boxGlow = diffuserMaterial();
    solid(box(0.335, 0.004, 0.275), boxGlow, {
        position: [0, POST_H + 0.108, 0], parent: stem, outline: 0, cast: false,
    });
    lamps.floor = {
        pick: [lampGrab(box(0.42, 0.38, 0.36), [0, POST_H + 0.266, 0], stem)],
        shade: boxShade, glow: boxGlow,
    };
    group.userData.lamps = { ...(group.userData.lamps || {}), ...lamps };
}

/* ---------- 电钢琴（靠窗、键朝房间） ----------
   扫描把它读成 `chair_other_four_back_no_1`（0.66 × 0.53 × 1.03）——那个盒子
   只框住了谱架和琴身中段，不是琴本身。88 键的板琴长 1.32m，照那个尺寸建出来
   就是个方墩，上面再随便画几道白条，所以推倒重来，按实物的真实规格：

     · 琴身 1.32 × 0.29 × 0.07，前沿就是白键前沿（板琴没有裙板）
     · 88 键 = 52 白 + 36 黑。白键间距 23.55mm（一个八度 7 个白键 = 165mm），
       黑键落在 C#/D#/F#/G#/A# 那五道缝上，最低音是 A0、最高是 C8
     · 单 X 琴架：左右各一副 X，脚管沿 X 方向趴在地上，顶上两根托臂托住琴身

   每个键是**独立的 Mesh**，带 `userData.midi / note / restY`，并且整份键盘
   挂在 `group.userData.pianoKeys` 上 —— 以后要做「点一下响一声、键往下沉」，
   直接拿这份数组去 raycast 就行，不用重建几何。

   键不描边：88 个键各挂一圈反转外壳就是 88 个额外 draw call，而键缝的黑线
   底下那块键床本来就透得出来，效果一样。 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** 白键序号（0 = A0）-> MIDI 音高。A0 = 21，之后每个八度从 C 起算。 */
const whiteMidi = (w) => (w < 2 ? 21 + w * 2 : 24 + Math.floor((w - 2) / 7) * 12 + [0, 2, 4, 5, 7, 9, 11][(w - 2) % 7]);
/** 白键 w 的右边有没有黑键：A0 后面有 A#0，B0 后面没有；
 *  之后每个八度里只有 E（p=2）和 B（p=6）后面没有。 */
const hasSharp = (w) => (w === 0 ? true : w === 1 ? false : ![2, 6].includes((w - 2) % 7));

function buildPiano(group) {
    const dark = matte(0x1e1e24, { roughness: 0.55 });
    const panel = matte(0x141419, { roughness: 0.42 });
    const ivory = matte(0xf1eee5, { roughness: 0.34 });
    const ebony = matte(0x16161c, { roughness: 0.30 });
    /* 「点亮琴键」那个开关用的另一套材质。键按下去只沉 7mm，站远一点、或者
       快句里一闪而过的时候确实看不清 —— 学琴的时候得看得见弹的是哪个键。

       用**换材质**而不是改颜色：88 个键共用这两个材质，直接改 color 会一起变。
       粉色跟谱面上高亮那一下同一支（overlay.css 的 --pink），一眼能对上是同
       一个音。 */
    /* 白键和黑键要分开配，两头的做法是反的：

         · 白键**染色**，不换色。整块刷成满饱和的粉，出来是一个「粉色的键」，
           那是把键换掉了，不是把键标出来。所以拿象牙白往粉里调 55%，读起来
           还是白键，只是被标了一下。自发光给 0 —— 白键本来就朝着光、面积
           又是黑键的两倍多，再加自发光只会更烫。
         · 黑键反过来。底色是 0x16161c，染色染不动，只能实打实上色再补自发光
           才浮得起来。

       粉是谱面上高亮那一支（overlay.css 的 --pink），同一个音一眼能对上。 */
    const litKey = (base, color, glow) => {
        const m = base.clone();
        m.color = new THREE.Color(color);
        m.emissive = new THREE.Color(0xff2e88);
        m.emissiveIntensity = glow;
        return m;
    };
    const rubber = matte(0x0f0f13, { roughness: 0.85 });

    const X = 3.75;                      // 琴身中心（背面离窗墙内表面 0.055）
    const CZ = -0.05;                    // 沿 Z 的中心
    const D = 0.29, LEN = 1.32;          // 进深 / 长度
    const FRONT = X - D / 2;             // 白键前沿
    const STAND_H = 0.655;               // 托臂上沿 = 琴身底
    const CASE_T = 0.070;                // 琴身厚
    const BED_Y = STAND_H + CASE_T;      // 键床顶 = 白键底 0.725
    const KEY_Y = BED_Y + 0.008;         // 白键底 0.733

    /* ---- 单 X 琴架 ---- */
    const FOOT_Z = 0.34, ARM_Z = 0.26;   // 脚管 / 托臂离中心的距离
    const legDir = [0, STAND_H - 0.020 - 0.030, FOOT_Z + ARM_Z];   // (Δy, Δz)
    const legLen = Math.hypot(legDir[1], legDir[2]);
    const legTilt = Math.atan2(legDir[2], legDir[1]);
    for (const sx of [-0.115, 0.115]) {
        // 两根交叉管：一根从 -Z 的脚升到 +Z 的托臂，另一根反过来
        for (const s of [-1, 1]) {
            solid(cyl(0.014, 0.014, legLen, 10), dark, {
                position: [X + sx, 0.030 + legDir[1] / 2, CZ - s * (FOOT_Z - ARM_Z) / 2],
                rotation: [s * legTilt, 0, 0], parent: group, outline: 0.006,
            });
        }
        // 交叉处的轴销
        solid(cyl(0.016, 0.016, 0.030, 10), metal(0x9aa0a8, 0.35), {
            position: [X + sx, 0.030 + legDir[1] * (FOOT_Z / (FOOT_Z + ARM_Z)), CZ],
            rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.005, cast: false,
        });
    }
    for (const s of [-1, 1]) {
        // 脚管（沿 X 趴在地上）+ 两头的橡胶脚
        solid(rb(0.42, 0.026, 0.030, 0.008, 1), dark, {
            position: [X, 0.017, CZ + s * FOOT_Z], parent: group, outline: 0.006, cast: false,
        });
        // 托臂（沿 X，托住琴身）
        solid(rb(0.40, 0.024, 0.030, 0.008, 1), dark, {
            position: [X, STAND_H - 0.012, CZ + s * ARM_Z], parent: group, outline: 0.006,
        });
        for (const e of [-1, 1]) {
            solid(rb(0.030, 0.020, 0.034, 0.008, 1), rubber, {
                position: [X + e * 0.20, 0.014, CZ + s * FOOT_Z], parent: group, outline: 0.005, cast: false,
            });
            solid(rb(0.026, 0.018, 0.036, 0.008, 1), rubber, {
                position: [X + e * 0.19, STAND_H - 0.010, CZ + s * ARM_Z], parent: group, outline: 0.004, cast: false,
            });
        }
    }

    /* ---- 琴身 ---- */
    solid(rb(D, CASE_T, LEN, 0.010), dark, {
        position: [X, STAND_H + CASE_T / 2, CZ], parent: group, outline: 0.010,
    });
    // 键床：键缝里露出来的那层黑
    solid(box(0.158, 0.010, LEN - 0.030), panel, {
        position: [FRONT + 0.083, BED_Y - 0.001, CZ], parent: group, outline: 0, cast: false,
    });
    // 键后面那条控制面板（比键高一截，实物上是喇叭 + 按键 + 小屏）
    const PW = D - 0.165;                       // 0.125 深
    const PX = X + D / 2 - PW / 2;
    solid(rb(PW, 0.050, LEN, 0.008), panel, {
        position: [PX, BED_Y + 0.017, CZ], parent: group, outline: 0.007,
    });
    // 两块喇叭网（低音端和高音端各一块）
    for (const s of [-1, 1]) {
        solid(box(PW - 0.030, 0.004, 0.19), matte(0x0b0b0f, { roughness: 0.9 }), {
            position: [PX, BED_Y + 0.042, CZ + s * 0.50], parent: group, outline: 0, cast: false,
        });
    }
    // 小屏 + 一排按键，都挤在高音那一头
    const screen = solid(box(0.036, 0.003, 0.062), matte(0x9fd8c8, {
        roughness: 0.3, emissive: 0x2f6f60, emissiveIntensity: 0,
    }), { position: [PX, BED_Y + 0.043, CZ + 0.24], parent: group, outline: 0, cast: false });
    for (let i = 0; i < 7; i++) {
        solid(cyl(0.0055, 0.0055, 0.004, 8), matte(0x3a3a44, { roughness: 0.5 }), {
            position: [PX + 0.030, BED_Y + 0.043, CZ + 0.08 - i * 0.030],
            parent: group, outline: 0, cast: false,
        });
    }

    /* 电源键。板琴的电源都在低音那一头的端上，按键旁边一颗指示灯。
       实物只有 12mm 见方，在屏幕上不到几个像素，所以照例套一个看不见的
       大命中盒 —— 真正被点的是盒子。 */
    /* 电源那一块。这里刻意做得比实物**显眼一号**：

       实物的电源键 12mm 见方、指示灯 3mm，在屏幕上是三五个像素 —— 只有
       知道它在那儿的人才找得到，等于没有。所以按键放大到 28mm 并加了一圈
       亮边、指示灯放大到 10mm，命中盒更是横跨整个低音端 30cm。
       另外指示灯待机时会慢慢呼吸（见 KitchenScene），眼睛会被它带过去。 */
    const POWER_Z = CZ - 0.545;
    solid(rb(PW - 0.012, 0.004, 0.115, 0.002), matte(0x2b2b33, { roughness: 0.55 }), {
        position: [PX, BED_Y + 0.043, POWER_Z], parent: group, outline: 0.003, cast: false,
    });
    solid(cyl(0.0185, 0.0185, 0.004, 18), matte(0x8b8f9a, { roughness: 0.35, metalness: 0.4 }), {
        position: [PX + 0.020, BED_Y + 0.046, POWER_Z], parent: group, outline: 0.003, cast: false,
    });
    const powerBtn = solid(cyl(0.0140, 0.0140, 0.006, 18), matte(0x55555f, { roughness: 0.42 }), {
        position: [PX + 0.020, BED_Y + 0.048, POWER_Z], parent: group, outline: 0.003, cast: false,
    });
    const powerLed = solid(cyl(0.0050, 0.0050, 0.004, 12), matte(0x5c1d1d, {
        roughness: 0.3, emissive: 0xff3b2e, emissiveIntensity: 0,
    }), { position: [PX - 0.022, BED_Y + 0.046, POWER_Z], parent: group, outline: 0, cast: false });
    const powerGrab = new THREE.Mesh(
        box(PW + 0.06, 0.075, 0.30),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    powerGrab.position.set(PX, BED_Y + 0.050, POWER_Z + 0.02);
    powerGrab.castShadow = powerGrab.receiveShadow = false;
    powerGrab.userData.pickProxy = true;
    group.add(powerGrab);

    /* ---- 88 键 ---- */
    const WHITES = 52, WP = 0.02355;            // 白键间距 = 165mm / 7
    const KZ0 = CZ - (WHITES * WP) / 2;         // 最低音 A0 在 -Z 那一头
    const whiteGeo = rb(0.145, 0.013, WP - 0.0018, 0.0015, 1);
    const blackGeo = rb(0.094, 0.0095, 0.0108, 0.0012, 1);
    const keys = [];
    const addKey = (geo, mat, pos, midi, black) => {
        const m = solid(geo, mat, { position: pos, parent: group, outline: 0, cast: false });
        m.name = `piano-key-${midi}`;
        m.userData = { midi, note: `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`, black, restY: pos[1] };
        keys.push(m);
    };
    for (let w = 0; w < WHITES; w++) {
        const z = KZ0 + (w + 0.5) * WP;
        addKey(whiteGeo, ivory, [FRONT + 0.0735, KEY_Y + 0.0065, z], whiteMidi(w), false);
        if (w < WHITES - 1 && hasSharp(w)) {
            // 黑键短、靠后，压在两个白键的缝上
            addKey(blackGeo, ebony, [FRONT + 0.0985, KEY_Y + 0.0178, KZ0 + (w + 1) * WP], whiteMidi(w) + 1, true);
        }
    }
    group.userData.pianoKeys = keys;
    // 白键 / 黑键各一对：常态和点亮。KitchenScene 每帧按需换上去。
    group.userData.pianoKeyMats = {
        white: ivory, black: ebony,
        // 0xf98ab5 = 象牙白 0xf1eee5 往 0xff2e88 里调 55%
        whiteLit: litKey(ivory, 0xf98ab5, 0),
        blackLit: litKey(ebony, 0xff2e88, 1.05),
    };
    /* 电钢琴 —— 不开电源不响。KitchenScene 接这三样：命中盒、指示灯、小屏。 */
    group.userData.pianoPower = { pick: [powerGrab], btn: powerBtn, led: powerLed, screen };

    /* ---- 谱架：一块带两个圆角方孔的黑板，往窗那边仰着 ---- */
    /* 圆角方框。孔和外框走同一个函数，只是圆心平移一下（cx）、
       类型换成 Path —— Shape.holes 要的是 Path，不是 Shape。 */
    const rrect = (w, h, r, cx = 0, cls = THREE.Shape) => {
        const s = new cls();
        const x0 = cx - w / 2, x1 = cx + w / 2, y0 = -h / 2, y1 = h / 2;
        s.moveTo(x0 + r, y0);
        s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
        s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
        s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r);
        s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
        return s;
    };
    const restShape = rrect(0.62, 0.26, 0.030);
    for (const hx of [-0.15, 0.15]) {
        restShape.holes.push(rrect(0.22, 0.14, 0.022, hx, THREE.Path));
    }
    const restGeo = new THREE.ExtrudeGeometry(restShape, {
        depth: 0.012, bevelEnabled: false, curveSegments: 6,
    });
    restGeo.rotateY(Math.PI / 2);      // shape-x -> -Z（宽）、shape-y -> Y（高）、厚度 -> X
    const rest = solid(restGeo, panel, {
        position: [3.868, 0.905, CZ], parent: group, outline: 0.007, cast: false,
    });
    rest.rotation.z = -0.22;           // 顶端往窗那边仰
    group.userData.pianoRest = rest;   // 谱子立在它前面，见 buildSheetMusic
    // 谱架底下那道搁谱的小台阶
    solid(rb(0.030, 0.014, 0.60, 0.005, 1), panel, {
        position: [3.845, BED_Y + 0.049, CZ], parent: group, outline: 0.005, cast: false,
    });

    /* ---- 延音踏板（板琴那种一块小铁板） ---- */
    solid(rb(0.115, 0.018, 0.078, 0.006, 1), metal(0x2b2e33, 0.4), {
        position: [FRONT + 0.06, 0.012, CZ + 0.30], parent: group, outline: 0.005, cast: false,
    });

    /* ---- 琴凳：X 架、深棕软包。
       位置刻意往琴那边收 —— 拉出来的时候它正好堵在岛台和书桌之间那条 0.62m
       的过道上，寻路就断了。收进去之后过道净宽还有 0.70m。 ---- */
    const BX = 3.40, BH = 0.50;
    solid(rb(0.33, 0.062, 0.55, 0.018), matte(0x2b2118, { roughness: 0.72, noise: 1 }), {
        position: [BX, BH - 0.031, CZ], parent: group, outline: 0.008,
    });
    for (const s of [-1, 1]) {
        for (const bx of [-0.13, 0.13]) {
            const l = solid(cyl(0.012, 0.012, 0.60, 8), dark, {
                position: [BX + bx, (BH - 0.062) / 2, CZ + s * 0.02], parent: group, outline: 0.005,
            });
            l.rotation.x = s * 0.55;
        }
        solid(rb(0.30, 0.020, 0.024, 0.006, 1), dark, {
            position: [BX, 0.012, CZ + s * 0.115], parent: group, outline: 0.005, cast: false,
        });
    }
}

/* ---------- 组装 ---------- */

/* ---------- 谱子 ----------
   同一张纸做两份：一份摊在唱机底下那个五斗柜最上层的抽屉里（拉开才看得见），
   一份立在钢琴的谱架上（放上去之前藏着）。不做「同一块几何飞过去」是因为它要
   跨两个父节点 —— 抽屉会整体滑出来、谱架是斜着的 —— 两份各自摆正，比中间那段
   补间可靠得多。切换只是 visible 的事。

   印面单独一块平面：BoxGeometry 六个面共用一套 UV，直接贴上去连纸边那 3mm
   都会印上谱子。平面的 UV 没有歧义，而且能精确控制哪一面朝人。 */
const SHEET_W = 0.210, SHEET_H = 0.297, SHEET_T = 0.0025;   // A4
/* 印面那块平面要比纸大一圈：纸的**外形**（不齐的边、手画的墨线）是画在贴图
   里的，画布四周留了一圈透明，放大之后中间那块正好是 A4。见 recital.js。 */
const FACE_W = SHEET_W * SHEET_BLEED.x, FACE_H = SHEET_H * SHEET_BLEED.y;

function buildSheetMusic(group) {
    const slot = group.userData.sheetDrawer;
    const rest = group.userData.pianoRest;
    if (!slot || !rest) return;

    const paper = matte(0xefe8da, { roughness: 0.93, noise: 1 });
    /* 印面。贴图是运行时才生成的（abcjs 排好版再画到 canvas 上），在那之前
       这就是一张空白纸 —— 不是一个洞，也不该是块色卡。 */
    /* transparent 必须开：贴图四周那圈是透明的（纸的外形画在图里），不开的话
       alpha 被忽略，那一圈会当成 RGB 全 0 画出来 —— 纸就套上一圈黑框。 */
    const print = new THREE.MeshStandardMaterial({
        color: 0xf5f0e4, roughness: 0.95, transparent: true,
    });

    /* ---- 抽屉里那一份 ---- */
    const { node: drawerNode, x: dx, y: dy, z: dz } = slot;
    // 底下垫两张歪着的空白纸，一张纸孤零零躺在抽屉里读起来像掉进去的
    for (const [ox, oz, rot] of [[0.012, -0.008, 0.055], [-0.009, 0.011, -0.038]]) {
        const s = solid(box(SHEET_H, SHEET_T, SHEET_W), paper, {
            position: [dx + ox, dy + SHEET_T / 2, dz + oz], parent: drawerNode,
            outline: 0.004, cast: false,
        });
        s.rotation.y = rot;
    }
    const inDrawer = solid(box(SHEET_H, SHEET_T, SHEET_W), paper, {
        position: [dx, dy + SHEET_T * 1.6, dz], parent: drawerNode, outline: 0, cast: false,
    });
    inDrawer.rotation.y = 0.021;
    {
        /* 朝上、页首朝 +X（抽屉是往 +X 拉出来的，人站在 -X 这头往里看，
           页首自然该在远端）。两次 geometry 级的旋转：
             rotateX(-90°) → 法线朝 +Y，u→+X、v→-Z
             rotateY(-90°) → u→+Z、v→+X                                   */
        const g = new THREE.PlaneGeometry(FACE_W, FACE_H);
        g.rotateX(-Math.PI / 2);
        g.rotateY(-Math.PI / 2);
        solid(g, print, {
            position: [0, SHEET_T / 2 + 0.0004, 0], parent: inDrawer, outline: 0, cast: false,
        });
    }
    /* 命中盒：纸只有 2.5mm 厚，正对着看是一条线；抽屉拉开之后从上方点它，
       没有这个盒子基本点不中。 */
    const grab = new THREE.Mesh(
        box(SHEET_H + 0.03, 0.075, SHEET_W + 0.03),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    grab.position.set(dx, dy + 0.038, dz);
    grab.castShadow = grab.receiveShadow = false;
    grab.userData.pickProxy = true;
    drawerNode.add(grab);

    /* ---- 谱架上那一份 ----
       挂成 rest 的子节点，斜度就跟着谱架走，不用自己算。谱架的局部坐标：
       挤出方向是 +X（板占 x ∈ [0, 0.012]），宽在 Z、高在 Y，中心在世界 0.905，
       板高 0.26 → 下沿正好落在那道搁谱的小台阶上。 */
    const onRest = solid(box(SHEET_T, SHEET_H, SHEET_W), paper, {
        // 下沿贴着板的下沿：-0.13 + 0.297/2
        position: [-SHEET_T / 2 - 0.001, 0.019, 0], parent: rest, outline: 0, cast: false,
    });
    {
        // 法线朝 -X（人在房间那头），u→+Z、v→+Y
        const g = new THREE.PlaneGeometry(FACE_W, FACE_H);
        g.rotateY(-Math.PI / 2);
        solid(g, print, {
            position: [-SHEET_T / 2 - 0.0004, 0, 0], parent: onRest, outline: 0, cast: false,
        });
    }
    const restGrab = new THREE.Mesh(
        box(0.06, SHEET_H, SHEET_W),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    restGrab.position.set(-0.03, 0.019, 0);
    restGrab.castShadow = restGrab.receiveShadow = false;
    restGrab.userData.pickProxy = true;
    rest.add(restGrab);

    onRest.visible = false;
    restGrab.visible = false;

    /* ---- 手上那一份 ----
       点开之后从抽屉（或谱架）飘起来，停在眼前 —— 解谜游戏里「拿起来看」
       那一下。位姿由 KitchenScene 每帧算（要跟着相机走），这儿只把件建出来。

       三件事和屋里别的东西不一样：

         · depthTest 关掉。举在脸前的东西离相机 0.5m，而人能贴到离墙 0.24m
           的地方 —— 不关的话纸会插进墙里，读作穿模而不是「举在手上」。
         · **不受光**。这是这儿唯一一件不参与屋里光照的东西，故意的：白纸的
           反照率本来就接近 1，站在亮处举起来会直接顶到纯白，谱线跟着一起
           被推过去，整张纸糊成一块白板（试过配自发光的标准材质，就是这个
           下场，而且还把泛光带得整个画面发灰）。不受光既保证在哪儿都读得清，
           也正好是「这张纸现在归你看了」的信号。漫画滤镜是后期，照样吃得到。
         · 不做纸本身的厚度，只有一张平面 + 背后一圈墨色的边。正对着看，
           那 2.5mm 的侧面一个像素都占不到，白建。 */
    const heldPage = new THREE.MeshBasicMaterial({
        color: 0xf5f0e4, depthTest: false, transparent: true,
    });

    const held = new THREE.Group();
    held.visible = false;
    group.add(held);
    const heldFace = new THREE.Mesh(new THREE.PlaneGeometry(FACE_W, FACE_H), heldPage);
    heldFace.renderOrder = 901;
    heldFace.castShadow = heldFace.receiveShadow = false;
    held.add(heldFace);

    /* 三份纸的显隐由 KitchenScene 每帧定：抽屉那份还要看抽屉拉开没有，
       手上那份是从别的两份之间插值出来的，所以这儿只把件交出去，
       不在两处各写一半。 */
    group.userData.sheet = {
        inDrawer, onRest, grab, restGrab, print, drawerNode,
        held, heldFace,
        pick: [inDrawer, grab, onRest, restGrab, heldFace],
        /** abcjs 排好版之后把印面换成真正的谱子 */
        setTexture(tex) {
            print.map = tex;
            print.color.setHex(0xffffff);
            print.needsUpdate = true;
            heldPage.map = tex;
            heldPage.color.setHex(0xffffff);      // 有图之后底色会把图染色，收回白
            heldPage.needsUpdate = true;
        },
    };
}

export function buildLiving() {
    const group = new THREE.Group();
    buildShell(group);
    buildPeninsula(group);
    buildDesk(group);
    // 椅子面朝 +X（书桌和窗）。lx 取 3.10：坐垫伸进桌板下面，
    // 靠背留在桌沿 3.15 外侧 —— 扫描给的 3.22 会让靠背整个穿过桌面。
    buildLeatherChair(group, 3.10, 1.78, -0.22);
    buildMeshChair(group, 3.10, 3.15, 0.16);
    buildSofa(group);
    buildMedia(group);
    buildLamps(group);
    buildPiano(group);
    buildSheetMusic(group);
    return { group };
}

/** 客厅的光。窗户是主光，两盏落地灯补暖。
 *  单独一盏带投影的方向光，是因为 room.js 那盏的投影相机只框住了厨房。 */
export function buildLivingLights(scene) {
    const win = new THREE.DirectionalLight(0xffeede, 1.05);
    win.position.set(7.2, 3.6, 1.6);
    win.target.position.set(1.0, 0.9, 2.6);
    win.castShadow = true;
    win.shadow.mapSize.set(2048, 2048);
    win.shadow.bias = -0.001;
    win.shadow.normalBias = 0.02;
    scene.add(win, win.target);
    fitShadowCamera(win);          // 同 key：视锥按整屋算，不写死

    /* 两盏落地灯。原来各是一颗点光源，而且**摆在灯罩里面** ——
       弓形灯那盏在 y=1.76，灯罩内壁就在 4cm 外，按平方反比是
       `1/0.04²` ≈ 1500 倍；方罩那盏更是正在罩子正中。罩子自己先烧成
       一块死白，屋里再糊一层过曝。

       带罩的灯本来就是**朝下开口**的：光源挪到罩口、换成聚光灯，
       罩子在光源背后就不再被自己照。罩子「亮着」的观感交给材质的
       emissive，那本来也是它该负责的事。 */
    const arc = new THREE.SpotLight(0xffd9a2, 9.0, 6.5, 1.15, 0.9, 2);
    arc.position.set(0.92, 1.63, 2.97);          // 弓形灯罩口（罩子 1.65~1.95）
    arc.target.position.set(0.92, 0, 2.97);
    scene.add(arc, arc.target);

    const floorLamp = new THREE.SpotLight(0xffd9a2, 6.5, 5.6, 1.10, 0.9, 2);
    floorLamp.position.set(2.62, 1.20, 4.24);    // 方罩口（罩子 1.22~1.54）
    floorLamp.target.position.set(2.62, 0, 4.24);
    scene.add(floorLamp, floorLamp.target);

    /* 原来这儿还有一盏「客厅顶灯」，挂在 (1.6, 2.55, 2.4) —— 那个位置
       天花板上并没有灯具，纯粹是怕远端沉下去凭空加的。撤掉，靠上面
       两盏落地灯 + 整面窗的天光顶着；两盏落地灯各加了一点强度和范围
       来补这一块。 */

    /* 书桌上那盏悬臂灯。灯具一直在，光倒是一直没给。
       两个关节都能转之后，罩口的位置就不再是常数了：这里给的只是初始姿态，
       每一帧由 KitchenScene 照着罩子里那两个空节点（mouth / aim）重摆一次。 */
    const desk = new THREE.SpotLight(0xffdcaa, 2.4, 3.2, 0.62, 0.85, 2);
    desk.position.set(3.226, 1.318, 2.345);
    desk.target.position.set(3.226 - Math.sin(0.34) * 1.2, 1.318 - Math.cos(0.34) * 1.2, 2.345);
    scene.add(desk, desk.target);

    /* 左桌那根屏幕挂灯。挂灯的全部意义就是**照桌面、不照屏** —— 光洒回
       屏幕上就成了满屏反光，那正是买它要避免的事。灯口只比屏面靠前 4cm，
       所以光锥必须又窄又往屋里斜：半角 0.5rad、目标点推到屏前 38cm 的
       桌面上，锥体的后沿才不会扫回 +X 那侧的屏幕。
       强度比悬臂灯低一档，它是补光不是主光。 */
    const screenBar = new THREE.SpotLight(0xffe6c4, 2.0, 2.2, 0.50, 0.85, 2);
    screenBar.position.set(3.752, 1.345, 1.48);
    screenBar.target.position.set(3.42, 0.783, 1.48);
    scene.add(screenBar, screenBar.target);

    /* 窗户是一整面 5 米的玻璃，实拍里靠窗那半间屋子是被天光泡着的。
       方向光只能给一个角度，再补一盏很软的面光把窗边整体托起来。 */
    const skyFill = new THREE.HemisphereLight(0xcfd8e8, 0x3a3228, 0.10);
    scene.add(skyFill);

    return { win, arc, floorLamp, desk, screenBar };
}
