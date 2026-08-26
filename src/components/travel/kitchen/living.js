import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
    PALETTE, artworkMaterial, inkOutline, matte, metal, shadeGradient, solid, woodFor,
} from './materials.js';
import { fitShadowCamera } from './room.js';

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
   剪影，帘子的织纹叠在上面。所以贴图一次画完（城市 → 织纹），材质用
   MeshBasic —— 窗户是画面里的**光源**，不该再被房间的灯照一遍变灰。 */
let shadeTex = null;
export function shadeTexture() {
    if (shadeTex) return shadeTex;
    const w = 1024, h = 512;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // 黄昏天空：上面偏冷，接近地平线转暖
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0.00, '#6e7f9c');
    sky.addColorStop(0.45, '#8f9db4');
    sky.addColorStop(0.72, '#b3aeb0');
    sky.addColorStop(1.00, '#9a8f88');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // 楼群剪影。用固定的伪随机序列，免得每次刷新窗外都换一座城。
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const horizon = h * 0.80;
    for (const [depth, tint] of [[0.55, '#7d879b'], [0.25, '#5f6779']]) {
        let x = -20;
        while (x < w + 20) {
            const bw = 34 + rnd() * 76;
            const bh = (40 + rnd() * 150) * (1 - depth * 0.45);   // 高度不跟着放大，楼才不会变成积木
            ctx.fillStyle = tint;
            ctx.fillRect(x, horizon - bh, bw, bh);
            // 零星的窗光，近处那层才点
            if (depth < 0.4) {
                for (let i = 0; i < 14; i++) {
                    if (rnd() > 0.55) continue;
                    ctx.fillStyle = 'rgba(255,226,170,0.5)';
                    ctx.fillRect(x + 6 + rnd() * (bw - 14), horizon - bh + 6 + rnd() * (bh - 14), 4, 5);
                }
            }
            x += bw + 5 + rnd() * 14;
        }
    }
    // 地面那一带压暗
    const grd = ctx.createLinearGradient(0, horizon, 0, h);
    grd.addColorStop(0, 'rgba(60,58,60,0.55)');
    grd.addColorStop(1, 'rgba(40,38,40,0.85)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, horizon, w, h - horizon);

    // 卷帘织纹。故意做得很淡：后期的色阶量化会把任何明显条纹切成色带。
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#3a3a3e';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);
    ctx.globalAlpha = 1;

    // 帘子本身的灰调，把城市压到「隐约看得见」
    ctx.fillStyle = 'rgba(152,154,158,0.55)';
    ctx.fillRect(0, 0, w, h);

    shadeTex = new THREE.CanvasTexture(c);
    shadeTex.colorSpace = THREE.SRGBColorSpace;
    shadeTex.wrapS = shadeTex.wrapT = THREE.ClampToEdgeWrapping;
    return shadeTex;
}

/** 一整面开窗的墙：墙体按洞口切成四块，再补竖挺、上下收边和帘布。
 *  axis='x' 是法线朝 ±X 的墙（窗墙），'z' 是朝 ±Z 的墙（电视墙）。
 *  u 轴 = 沿墙长度的那个方向；facing=-1 表示房间在 plane 的负轴一侧。 */
function windowWall(parent, {
    axis, plane, facing, from, to, y0, y1,
    winFrom, winTo, sillY, headY, wallMat, mullionEvery = 1.25, mullionsAt = null,
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

    /* 帘布。窗户在画面里是光源，用 MeshBasic —— 再被房间的灯照一遍就灰了。 */
    const shade = new THREE.Mesh(
        new THREE.PlaneGeometry(winTo - winFrom, headY - sillY),
        new THREE.MeshBasicMaterial({ map: shadeTexture() }),
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
        wallMat, mullionEvery: 1.24,
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
        wallMat, mullionsAt: [1.55],
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
    solid(holedPlate(X0, X1, Z0, Z1, [SK_CAB], TOP - 0.105), whiteMat, {
        position: [0, 0.095, 0], parent: group, outline: 0.011,
    });

    // 厨房那一侧（lz = Z0）才有柜门和洗碗机；客厅这一侧是一整块白板
    const frontZ = Z0 - 0.013;
    // 洗碗机 lx 1.82..2.49（紧挨着水槽，占掉柜体东头）
    solid(rb(0.67, TOP - 0.16, 0.026, 0.006), matte(0xb3bac2, { roughness: 0.4, metalness: 0.5 }), {
        position: [2.15, (TOP + 0.10) / 2 - 0.005, frontZ], parent: group, outline: 0.009,
    });
    solid(rb(0.60, 0.022, 0.030, 0.008), metal(0xc2c8d0, 0.28), {
        position: [2.15, TOP - 0.13, frontZ - 0.014], parent: group, outline: 0.005, cast: false,
    });
    // 洗碗机左边两扇木柜门
    for (const [dx, dw] of [[0.96, 0.51], [1.51, 0.53]]) {
        solid(rb(dw, TOP - 0.20, 0.024, 0.005), woodFrontMat, {
            position: [dx, (TOP + 0.14) / 2, frontZ], parent: group, outline: 0.009,
        });
        solid(rb(dw * 0.4, 0.014, 0.016, 0.006), metal(0xb9bfc7, 0.3), {
            position: [dx, TOP - 0.20, frontZ - 0.016], parent: group, outline: 0.005, cast: false,
        });
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

    /** 显示器：屏面朝 -X（人坐在房间那头） */
    const monitor = (z, w, h, x = 3.81) => {
        solid(rb(0.030, h, w, 0.006), bezel, {
            position: [x, TOP + TH + 0.11 + h / 2, z], parent: group, outline: 0.008,
        });
        solid(box(0.004, h - 0.026, w - 0.026), screenMat, {
            position: [x - 0.018, TOP + TH + 0.11 + h / 2, z], parent: group, outline: 0, cast: false,
        });
        solid(cyl(0.022, 0.022, 0.11, 8), bezel, {
            position: [x + 0.02, TOP + TH + 0.055, z], parent: group, outline: 0.006,
        });
        solid(rb(0.20, 0.014, 0.24, 0.005), bezel, {
            position: [x + 0.02, TOP + TH + 0.007, z], parent: group, outline: 0.006, cast: false,
        });
    };

    // 左桌：一块大屏 + 前面的笔记本
    monitor(1.48, 0.74, 0.44);
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

    /* 右桌：一台 27 寸 + 一台立式主机（不是第二块屏）。
       机箱是「正面朝人」摆的：人坐在 -X 那头，所以 0.42 的进深沿 X、
       0.20 的宽度沿 Z —— 之前反了，等于把机箱侧过来对着桌子。 */
    monitor(3.02, 0.62, 0.37);
    const TX = 3.55, TZ = 3.74, TY = TOP + TH + 0.22;
    solid(rb(0.42, 0.44, 0.20, 0.010), matte(0x24242a, { roughness: 0.5 }), {
        position: [TX, TY, TZ], parent: group, outline: 0.009,
    });
    // 正面（朝 -X）：细长进风格栅 + 电源键
    solid(box(0.006, 0.34, 0.13), matte(0x15161a, { roughness: 0.7 }), {
        position: [TX - 0.213, TY, TZ], parent: group, outline: 0, cast: false,
    });
    solid(cyl(0.010, 0.010, 0.006, 10), matte(0x9fd0e0, { roughness: 0.3, emissive: 0x2c6c86, emissiveIntensity: 1.4 }), {
        position: [TX - 0.214, TY + 0.19, TZ], rotation: [0, 0, Math.PI / 2],
        parent: group, outline: 0, cast: false,
    });
    // 侧透玻璃在朝椅子那一面（-Z）
    solid(box(0.34, 0.34, 0.004), matte(0x14161c, { roughness: 0.2, metalness: 0.3 }), {
        position: [TX, TY, TZ - 0.102], parent: group, outline: 0, cast: false,
    });

    // 键盘鼠标，桌面才不是两块空板
    for (const [kz, kx] of [[1.98, 3.39], [3.20, 3.41]]) {
        solid(rb(0.14, 0.014, 0.40, 0.004), matte(0x2a2a30, { roughness: 0.6 }), {
            position: [kx, TOP + TH + 0.007, kz], parent: group, outline: 0.005, cast: false,
        });
    }

    /* 两张桌子中间那道缝里那盏灯。实物是一支黄铜悬臂灯，值得照着做：

         · 竖杆上端一个**滚花枢轴**，横臂从中间穿过去
         · 横臂过了枢轴还往回伸出一截**配重尾巴**，端头一个圆帽
         · 靠灯罩那半截更粗（伸缩管），接缝处一道压边
         · 罩子是**拉丝钢色**的锥筒，不是黄铜；顶上一颗黄铜小帽

       原来是「一根杆 + 一根横棍 + 一个小圆锥」，三件几何体，凑近就露怯。 */
    const brass = metal(0xb08d55, 0.32);
    const brassDark = metal(0x8e7040, 0.38);
    const steel = metal(0xb9b4a9, 0.28);
    const GX = 3.84, GZ = 2.345;   // 杆正好穿过两桌之间那道 7cm 缝
    const PIV = 1.44;
    solid(cyl(0.095, 0.11, 0.026, 18), brass, { position: [GX, 0.013, GZ], parent: group, outline: 0.006, cast: false });
    solid(cyl(0.016, 0.019, PIV - 0.02, 10), brass, {
        position: [GX, (PIV - 0.02) / 2 + 0.02, GZ], parent: group, outline: 0.006,
    });
    solid(cyl(0.030, 0.030, 0.038, 18), brassDark, {        // 滚花枢轴
        position: [GX, PIV, GZ], rotation: [Math.PI / 2, 0, 0], parent: group, outline: 0.005, cast: false,
    });
    solid(cyl(0.019, 0.019, 0.050, 14), brass, {
        position: [GX, PIV, GZ], rotation: [Math.PI / 2, 0, 0], parent: group, outline: 0.004, cast: false,
    });
    solid(cyl(0.0115, 0.0115, 0.235, 12), brass, {          // 配重尾巴
        position: [GX + 0.118, PIV, GZ], rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.005, cast: false,
    });
    solid(cyl(0.0125, 0.0125, 0.020, 12), brass, {          // 尾端圆帽
        position: [GX + 0.240, PIV, GZ], rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.004, cast: false,
    });
    solid(cyl(0.0155, 0.0155, 0.300, 12), brass, {          // 伸缩管（粗）
        position: [GX - 0.155, PIV, GZ], rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.005, cast: false,
    });
    solid(cyl(0.0175, 0.0175, 0.014, 12), brassDark, {      // 接缝压边
        position: [GX - 0.300, PIV, GZ], rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.004, cast: false,
    });
    solid(cyl(0.0125, 0.0125, 0.185, 12), brass, {          // 前段（细）
        position: [GX - 0.398, PIV, GZ], rotation: [0, 0, Math.PI / 2], parent: group, outline: 0.005, cast: false,
    });
    solid(new THREE.SphereGeometry(0.019, 14, 10), brassDark, {   // 球形关节
        position: [GX - 0.492, PIV, GZ], parent: group, outline: 0.004, cast: false,
    });

    /* 灯罩：拉丝钢锥筒，朝左前下方照着左桌。锥筒是开口的，材质要双面，
       不然从侧下方看进去是空的。 */
    const SH = 0.205;
    const shadeGrp = new THREE.Group();
    shadeGrp.position.set(GX - 0.522, PIV - 0.012, GZ);
    shadeGrp.rotation.z = -0.34;
    group.add(shadeGrp);
    const cone = solid(cyl(0.044, 0.086, SH, 22, 1, true), metal(0xb9b4a9, 0.28), {
        position: [0, -SH / 2, 0], parent: shadeGrp, outline: 0.007, cast: false,
    });
    cone.material.side = THREE.DoubleSide;
    // 金属罩不发光，「亮着」全靠罩口那圈；关灯就是把那圈灭掉
    const deskGlow = diffuserMaterial();
    solid(cyl(0.044, 0.044, 0.012, 22), steel, {            // 顶盖
        position: [0, 0.006, 0], parent: shadeGrp, outline: 0.004, cast: false,
    });
    solid(cyl(0.011, 0.011, 0.030, 10), brass, {            // 顶上那颗小帽
        position: [0, 0.028, 0], parent: shadeGrp, outline: 0.004, cast: false,
    });
    solid(cyl(0.080, 0.080, 0.004, 22), deskGlow, {          // 罩口那圈暖光
        position: [0, -SH + 0.012, 0], parent: shadeGrp, outline: 0, cast: false,
    });
    group.userData.lamps = {
        ...(group.userData.lamps || {}),
        desk: {
            pick: [lampGrab(cyl(0.115, 0.115, 0.24, 14), [0, -SH / 2, 0], shadeGrp)],
            shade: null, glow: deskGlow,
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

    /* 靠背：一整片，往后仰 11°，顶到离地 1.20m。
       圆角给到 0.09 —— 实物顶部是个大圆角，不是方角。 */
    const LEAN = 0.20;                           // 弧度，约 11.5°
    const BH = 0.735;                            // 背板长（沿它自己的轴）
    const ux = -Math.sin(LEAN), uy = Math.cos(LEAN);   // 「沿背往上」的单位向量
    const rootX = -0.205, rootY = SEAT + 0.015;        // 背板下端
    const backCx = rootX + ux * BH / 2, backCy = rootY + uy * BH / 2;
    const back = solid(rb(0.105, BH, 0.475, 0.090), hide, {
        position: [backCx, backCy, 0], parent: g, outline: 0.010,
    });
    back.rotation.z = LEAN;
    // 背面下缘那道横缝（两张照片里都很清楚）
    const seamT = 0.185 / BH;                    // 缝在背板 1/4 高处
    const seam = solid(rb(0.115, 0.012, 0.455, 0.005), stitch, {
        position: [rootX + ux * BH * seamT, rootY + uy * BH * seamT, 0],
        parent: g, outline: 0, cast: false,
    });
    seam.rotation.z = LEAN;
    // 腰部往前顶一点：一块薄垫贴在背板正面
    const lumbar = solid(rb(0.030, 0.26, 0.40, 0.030), hide, {
        position: [rootX + ux * 0.30 + 0.062, rootY + uy * 0.30, 0],
        parent: g, outline: 0, cast: false,
    });
    lumbar.rotation.z = LEAN;

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
    const TX = 1.40, TZ = 3.325;      // 桌面中心（沙发在 -Z、电视柜在 +Z）
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

/* ---------- 影音那一头：电视 + 电视柜 + 抽屉柜 + 唱机 + 音箱 + 边几 ---------- */

function buildMedia(group) {
    const white = matte(0xd9d6cb, { roughness: 0.5 });
    const mint = matte(0xbfd0c2, { roughness: 0.55 });   // 照片二里电视柜那两扇淡绿门
    const dark = matte(0x1c1c22, { roughness: 0.6 });

    /* 电视柜 lx 0.62..2.27, lz 4.05..4.61, 高 0.72 */
    const cX0 = 0.62, cX1 = 2.27, cZ0 = 4.05, cZ1 = 4.61, cH = 0.72;
    solid(box(cX1 - cX0, cH, cZ1 - cZ0), white, {
        position: [(cX0 + cX1) / 2, cH / 2, (cZ0 + cZ1) / 2], parent: group, outline: 0.011,
    });
    /* 门色是「绿—白—绿」。三扇门**铺满整个正面** —— 柜体正面除了 6mm 的
       缝几乎看不到白色柜身。之前每扇只做了 0.42 宽、上下还各留 4.5cm，
       三扇缩在中间，看着像三块贴在柜面上的小板。 */
    const REVEAL = 0.006;
    const dw = (cX1 - cX0 - REVEAL * 4) / 3;
    const dh = cH - REVEAL * 2;
    [mint, white, mint].forEach((m, i) => {
        const dx = cX0 + REVEAL + dw / 2 + i * (dw + REVEAL);
        solid(rb(dw, dh, 0.022, 0.005), m, {
            position: [dx, cH / 2, cZ0 - 0.012], parent: group, outline: 0.009,
        });
        // 中间那扇白门里嵌着一块更浅的方框（照片四）
        if (i === 1) {
            solid(box(dw - 0.11, dh - 0.14, 0.006), matte(0xeeece5, { roughness: 0.55 }), {
                position: [dx, cH / 2, cZ0 - 0.026], parent: group, outline: 0.006, cast: false,
            });
        }
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
    solid(box(dX1 - dX0, dH, dZ1 - dZ0), white, {
        position: [(dX0 + dX1) / 2, dH / 2, (dZ0 + dZ1) / 2], parent: group, outline: 0.011,
    });
    for (let i = 0; i < 5; i++) {
        solid(rb(0.021, dH / 5 - 0.02, dZ1 - dZ0 - 0.06, 0.005), white, {
            position: [dX1 + 0.011, dH / 5 * (i + 0.5), (dZ0 + dZ1) / 2], parent: group, outline: 0.008,
        });
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
    solid(cyl(0.148, 0.148, 0.014, 36), matte(0x63b892, { roughness: 0.34, metalness: 0.10 }), {
        position: [0, 0.020, 0], parent: platter, outline: 0.005, cast: false,
    });
    // 12 吋黑胶：不放唱片时收起来
    const lp = new THREE.Group();
    lp.position.y = 0.028;
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
        position: [0, 0.031, 0], parent: platter, outline: 0.003, cast: false,
    });
    solid(cyl(0.0035, 0.0035, 0.024, 8), ttChrome, {          // 唱盘轴
        position: [0, 0.038, 0], parent: platter, outline: 0, cast: false,
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
       锥形罩往左前下方歪了 0.34 rad，光就得顺着同一个轴出去 ——
       罩口解出来在 (3.250, 1.235, 2.345)，方向 (-sin, -cos)。 */
    const T = 0.34;
    const desk = new THREE.SpotLight(0xffdcaa, 2.4, 3.2, 0.62, 0.85, 2);
    desk.position.set(3.250, 1.230, 2.345);
    desk.target.position.set(3.250 - Math.sin(T) * 1.2, 1.230 - Math.cos(T) * 1.2, 2.345);
    scene.add(desk, desk.target);

    /* 窗户是一整面 5 米的玻璃，实拍里靠窗那半间屋子是被天光泡着的。
       方向光只能给一个角度，再补一盏很软的面光把窗边整体托起来。 */
    const skyFill = new THREE.HemisphereLight(0xcfd8e8, 0x3a3228, 0.10);
    scene.add(skyFill);

    return { win, arc, floorLamp, desk };
}
