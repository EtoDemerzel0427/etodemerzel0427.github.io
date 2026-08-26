import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
    PALETTE, matte, metal, solid,
    woodFor, floorMaterial, pennyTileTexture, diplomaTexture,
} from './materials.js';
import { buildRange, buildMicrowave } from './appliances.js';

/** 垃圾桶那种拉丝不锈钢：比家电稍暗一点，粗糙度更高 */
const stainlessProp = () => matte(0x9ba1a9, { roughness: 0.45, metalness: 0.55 });

const rb = (w, h, d, r = 0.014, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb_, h, seg = 16) => new THREE.CylinderGeometry(rt, rb_, h, seg);

/* 房间尺寸（米）。
   这一版把整条立面按扫描校正过：原来是照构图手摆的，一线被拉长了 0.77m、
   冰箱也偏西，接上客厅之后北墙会横在「看冰箱」那个主镜头里。现在
   lx 一律服从 living.js 顶部那套换算，全屋一个坐标系。 */
const BACK_Z = -1.95;
const CEIL = 2.76;                            // 扫描：Ceiling_Kitchen y=2.76

const NOOK_L = -0.615, NOOK_R = 0.335;      // 冰箱龛开口（扫描：冰箱 lx -0.37..0.53）
const PANEL_W = 0.16, PANEL_D = 0.70;
const CAB_TOP = 2.62;                        // 扫描：吊柜顶 2.62

const GAP_L = 0.495, GAP_R = 0.58;           // 柜体和台面之间那道窄缝
const RUN_L = 0.58, RUN_R = 2.70;            // 操作台一线（扫描：0.60..2.70）
const COUNTER_Y = 0.945, BASE_D = 0.65;      // 扫描：地柜 0.04~1.00
const RANGE_L = 0.90, RANGE_R = 1.68;        // 扫描：灶宽 0.78，落在 0.92..1.70
const UPPER_Y0 = 1.47, UPPER_D = 0.36;       // 扫描：吊柜 1.47~2.62

/** 照着实拍的公寓厨房搭：冰箱嵌在木色柜龛里，右边一整条操作台 + 白色吊柜 + 不锈钢家电。 */
export function buildRoom() {
    const group = new THREE.Group();

    // 每种部件按自己的真实宽高换算重复率，木纹尺度才全屋一致
    const woodMat = woodFor(1.24, 0.60);        // 吊柜箱身
    // 立板露给镜头的是 0.7m 深的侧面，不是 0.16m 宽的正面。
    // 按正面宽度算会把纹理横向拉四倍，细密竖纹就变成宽条纹。
    const woodPanelMat = woodFor(0.70, 2.50);   // 到顶立板
    const woodTallMat = woodFor(0.61, 0.58);    // 吊柜门
    const woodFrontMat = woodFor(0.39, 0.26);   // 抽屉面板
    const woodBaseMat = woodFor(1.70, 0.80);    // 地柜箱身

    const whiteCabMat = matte(PALETTE.cabinetWhite, { roughness: 0.5 });
    const wallMat = matte(PALETTE.wall, { roughness: 0.95, noise: 1 });
    const counterMat = matte(PALETTE.counter, { roughness: 0.36, metalness: 0.04 });
    const darkMat = matte(0x141419, { roughness: 0.7 });
    const glassMat = matte(0x0e0e14, { roughness: 0.14, metalness: 0.35 });

    /* ---------- 壳体 ---------- */

    const floor = solid(box(16, 0.2, 16), floorMaterial({ repeat: [8, 8], color: 0xc2b7a8 }), {
        position: [0, -0.1, 0], parent: group, outline: 0, cast: false,
    });
    floor.receiveShadow = true;
    floor.userData.isFloor = true;      // 走位的射线要认出「这是地面」，见 KitchenScene

    // 后墙不开洞（门洞挪到左侧那道前移的墙上）。
    // 右端收在 lx=2.81：扫描里灶台一线到这儿就折向窗墙了，living.js 接着往下建。
    const WALL_H = CEIL + 0.6;
    const BACK_L = -6.0, BACK_R = 2.81;
    solid(box(BACK_R - BACK_L, WALL_H, 0.14), wallMat, {
        position: [(BACK_L + BACK_R) / 2, WALL_H / 2, BACK_Z - 0.07], parent: group, outline: 0,
    });

    /* ---------- 冰箱左侧：整块往前推的墙，卫生间门开在上面 ----------
       实物里这一侧不是和后墙平齐的，而是整体前移到和冰箱柜面差不多的位置，
       垃圾桶就靠在这堵墙上。之前把门洞平铺在后墙、再靠一个深凹的黑洞
       制造纵深，方向是反的。 */
    const LW_Z = -1.34;                     // 扫描：门面在冰箱正面后方 0.24m
    const LW_T = 0.14;                      // 墙厚
    // 西端从 -2.85 延到 -3.85：扫描里走廊到 lx=-3.81 才到底（那面墙前面
    // 靠着书架和鞋柜）。原来提前一米收口，人走到冰箱边往左看就看到断头。
    const LW_X0 = -3.85, LW_X1 = -0.75;     // 左到走廊尽头，右到冰箱柜的立板
    // 扫描：门洞 1.03 宽 × 2.22 高，冰箱边缘到门洞边缘净距 0.74m。
    // 我原来只留了 0.23m，垃圾桶放不下、有一截压在门洞开口上，那就是「穿模」。
    const DOOR_R = LW_X1 - 0.025 - 0.74;
    const DOOR_L = DOOR_R - 1.03, DOOR_H = 2.22;
    const doorCx = (DOOR_L + DOOR_R) / 2;

    const lwSeg = (x0, x1, y0, y1) => solid(box(x1 - x0, y1 - y0, LW_T), wallMat, {
        position: [(x0 + x1) / 2, (y0 + y1) / 2, LW_Z - LW_T / 2], parent: group, outline: 0,
    });
    /* 门洞**西边不再砌墙** —— 扫描里 Wall_27 只到 lx=-2.38 就没了，
       再往西走廊往南拐（Wall_35 / Wall_6 那条支廊）。原来一路砌到底，
       站在廊口看，鞋柜右手边就成了一堵平墙，把拐角封死了。
       门套西侧那根立边由支廊东墙兜底（见 buildHallway 的 BR_E）。 */
    // 尽头墙。南端要一直伸到 -2.22，把拐角那面墙也带出来
    solid(box(0.14, WALL_H, 2.86 + 2.22), wallMat, {
        position: [LW_X0 - 0.07, WALL_H / 2, (2.86 - 2.22) / 2], parent: group, outline: 0,
    });
    lwSeg(DOOR_R, LW_X1, 0, WALL_H);
    lwSeg(DOOR_L, DOOR_R, DOOR_H, WALL_H);

    // 门洞里面：浅浅一层就够，做深了会露出侧壁和地面，看着像走廊
    const DOOR_DEPTH = 0.30;
    solid(box(DOOR_R - DOOR_L, DOOR_H, DOOR_DEPTH),
        matte(0x6b655d, { roughness: 0.98, side: THREE.BackSide,
            emissive: 0x2b2721, emissiveIntensity: 1 }), {
        position: [doorCx, DOOR_H / 2, LW_Z - LW_T - DOOR_DEPTH / 2], parent: group,
        outline: 0, cast: false,
    });
    solid(box(DOOR_R - DOOR_L - 0.03, 0.02, DOOR_DEPTH),
        matte(0x3b352e, { roughness: 0.92, emissive: 0x1a1712, emissiveIntensity: 1 }), {
        position: [doorCx, 0.012, LW_Z - LW_T - DOOR_DEPTH / 2], parent: group,
        outline: 0, cast: false,
    });

    /* 白色门套。往墙里嵌 5mm —— 贴面放会和墙面共面，画面上就会不停闪烁（z-fighting）。 */
    const CASE_W = 0.065, CASE_D = 0.030, CASE_EMBED = 0.005;
    const caseMat = matte(0xe9e5dc, { roughness: 0.55 });
    const caseZ = LW_Z + CASE_D / 2 - CASE_EMBED;
    for (const cx of [DOOR_L - CASE_W / 2, DOOR_R + CASE_W / 2]) {
        solid(box(CASE_W, DOOR_H + CASE_W, CASE_D), caseMat, {
            position: [cx, (DOOR_H + CASE_W) / 2, caseZ], parent: group, outline: 0.007,
        });
    }
    solid(box(DOOR_R - DOOR_L + CASE_W * 2, CASE_W, CASE_D), caseMat, {
        position: [doorCx, DOOR_H + CASE_W / 2, caseZ], parent: group, outline: 0.007,
    });

    /* 踢脚线，同样嵌进墙里避免共面 */
    for (const [x0, x1] of [[DOOR_R + CASE_W, LW_X1]]) {
        if (x1 - x0 < 0.05) continue;
        solid(box(x1 - x0, 0.105, 0.035), caseMat, {
            position: [(x0 + x1) / 2, 0.0525, LW_Z + 0.0175 - CASE_EMBED],
            parent: group, outline: 0.006, cast: false,
        });
    }

    /* 靠着这堵墙的不锈钢脚踏垃圾桶，正面和冰箱门差不多齐平 */
    const BIN_W = 0.35, BIN_D = 0.27, BIN_H = 0.60;
    const binX = LW_X1 - 0.03 - BIN_W / 2;       // 紧挨着冰箱柜，离门洞还有半米
    const binZ = LW_Z + BIN_D / 2 + 0.015;
    const binMat = stainlessProp();
    solid(rb(BIN_W, BIN_H, BIN_D, 0.022), binMat, {
        position: [binX, BIN_H / 2 + 0.012, binZ], parent: group, outline: 0.009,
    });
    // 盖子是薄薄一圈深色边框 + 中间的不锈钢面板，不是一块厚砖
    solid(rb(BIN_W + 0.012, 0.030, BIN_D + 0.012, 0.014), matte(0x22222a, { roughness: 0.55 }), {
        position: [binX, BIN_H + 0.027, binZ], parent: group, outline: 0.007,
    });
    solid(rb(BIN_W - 0.030, 0.014, BIN_D - 0.030, 0.010), binMat, {
        position: [binX, BIN_H + 0.040, binZ], parent: group, outline: 0, cast: false,
    });
    solid(rb(0.155, 0.020, 0.048, 0.007), binMat, {
        position: [binX, 0.028, binZ + BIN_D / 2 + 0.012], parent: group, outline: 0.005, cast: false,
    });

    /* ---------- 冰箱柜龛 ---------- */

    const nook = new THREE.Group();
    const panelCz = BACK_Z + PANEL_D / 2;

    for (const cx of [NOOK_L - PANEL_W / 2, NOOK_R + PANEL_W / 2]) {
        solid(box(PANEL_W, CAB_TOP, PANEL_D), woodPanelMat, {
            position: [cx, CAB_TOP / 2, panelCz], parent: nook, outline: 0.012,
        });
    }

    // 龛内背板（比墙暗一点，冰箱后面才有层次）
    solid(box(NOOK_R - NOOK_L, CAB_TOP, 0.04), matte(0xd8cdbd, { roughness: 0.9 }), {
        position: [(NOOK_L + NOOK_R) / 2, CAB_TOP / 2, BACK_Z + 0.03], parent: nook, outline: 0, cast: false,
    });

    // 冰箱上方的吊柜，两扇门
    const overW = (NOOK_R + PANEL_W) - (NOOK_L - PANEL_W);
    const overCx = (NOOK_L + NOOK_R) / 2;
    // 扫描：冰箱顶 1.864、吊柜底 1.864 —— 是齐平的，中间没有缝
    const overY0 = 1.845;
    solid(box(overW, CAB_TOP - overY0, PANEL_D - 0.02), woodMat, {
        position: [overCx, (CAB_TOP + overY0) / 2, panelCz + 0.01], parent: nook, outline: 0.012,
    });
    for (const s of [-1, 1]) {
        const dw = overW / 2 - 0.014;
        solid(rb(dw, CAB_TOP - overY0 - 0.02, 0.03, 0.006), woodTallMat, {
            position: [overCx + s * (dw / 2 + 0.007), (CAB_TOP + overY0) / 2, panelCz + PANEL_D / 2 - 0.005],
            parent: nook, outline: 0.009,
        });
    }
    group.add(nook);

    /* 柜体与操作台之间的暗缝 */
    solid(box(GAP_R - GAP_L, CAB_TOP, 0.5), matte(0x3b332c, { roughness: 0.95 }), {
        position: [(GAP_L + GAP_R) / 2, CAB_TOP / 2, BACK_Z + 0.26], parent: group, outline: 0, cast: false,
    });

    /* ---------- 操作台 ---------- */

    const runW = RUN_R - RUN_L, runCx = (RUN_L + RUN_R) / 2;
    const baseCz = BACK_Z + BASE_D / 2;

    // 柜体分左右两段，中间留给烤箱——之前是一整条，直接穿模穿过烤箱
    const SEGMENTS = [[RUN_L, RANGE_L], [RANGE_R, RUN_R]];
    for (const [x0, x1] of SEGMENTS) {
        const sw = x1 - x0, scx = (x0 + x1) / 2;
        if (sw < 0.05) continue;
        solid(box(sw, 0.10, BASE_D - 0.08), darkMat, {
            position: [scx, 0.05, baseCz - 0.04], parent: group, outline: 0, cast: false,
        });
        solid(box(sw, COUNTER_Y - 0.10, BASE_D), woodBaseMat, {
            position: [scx, (COUNTER_Y + 0.10) / 2 - 0.005, baseCz], parent: group, outline: 0.011,
        });
    }

    // 柜门 / 抽屉面板，避开炉灶那一段
    const frontZ = baseCz + BASE_D / 2 + 0.012;
    function cabFronts(x0, x1, rows, forceCols) {
        const w = x1 - x0;
        if (w < 0.18) return;
        const cols = forceCols || Math.max(1, Math.round(w / 0.52));
        const cw = w / cols - 0.018;
        let y = 0.12;
        for (const r of rows) {
            for (let i = 0; i < cols; i++) {
                const cx = x0 + 0.009 + cw / 2 + i * (cw + 0.018);
                solid(rb(cw, r - 0.016, 0.024, 0.005), woodFrontMat, {
                    position: [cx, y + r / 2, frontZ], parent: group, outline: 0.009,
                });
                // 细长条把手
                solid(rb(cw * 0.42, 0.014, 0.016, 0.006), metal(0xb9bfc7, 0.3), {
                    position: [cx, y + r - 0.055, frontZ + 0.018], parent: group, outline: 0.005, cast: false,
                });
            }
            y += r;
        }
    }
    // 烤箱左边是单列三个抽屉；右边是三扇到底的柜门，不是抽屉
    cabFronts(RUN_L, RANGE_L - 0.01, [0.22, 0.26, 0.30], 1);
    cabFronts(RANGE_R + 0.01, RUN_R, [0.74], 3);

    // 白石英台面同样分段，灶面自己占中间那一截
    for (const [x0, x1] of SEGMENTS) {
        const sw = x1 - x0;
        if (sw < 0.05) continue;
        // 只有朝外的一端加出挑边，靠灶那一侧要切齐
        const ext0 = x0 === RUN_L ? 0.015 : 0;
        const ext1 = x1 === RUN_R ? 0.015 : 0;
        solid(rb(sw + ext0 + ext1, 0.045, BASE_D + 0.05, 0.008), counterMat, {
            position: [(x0 - ext0 + x1 + ext1) / 2, COUNTER_Y - 0.02, baseCz + 0.02],
            parent: group, outline: 0.009,
        });
    }

    // 圆石马赛克墙砖
    const tileTex = pennyTileTexture();
    tileTex.repeat.set(5.1, 1.6);
    solid(box(runW, UPPER_Y0 - COUNTER_Y, 0.02), matte(0xffffff, { roughness: 0.2, metalness: 0.05, map: tileTex }), {
        position: [runCx, (UPPER_Y0 + COUNTER_Y) / 2, BACK_Z + 0.02], parent: group, outline: 0.007, cast: false,
    });

    /* ---------- 白色吊柜 ---------- */

    const upperCz = BACK_Z + UPPER_D / 2;
    function upperRun(x0, x1) {
        const w = x1 - x0;
        if (w < 0.1) return;
        solid(box(w, CAB_TOP - UPPER_Y0, UPPER_D), whiteCabMat, {
            position: [(x0 + x1) / 2, (CAB_TOP + UPPER_Y0) / 2, upperCz], parent: group, outline: 0.011,
        });
        const cols = Math.max(1, Math.round(w / 0.50));
        const dw = w / cols - 0.016;
        for (let i = 0; i < cols; i++) {
            solid(rb(dw, CAB_TOP - UPPER_Y0 - 0.02, 0.026, 0.005), whiteCabMat, {
                position: [x0 + 0.008 + dw / 2 + i * (dw + 0.016), (CAB_TOP + UPPER_Y0) / 2, upperCz + UPPER_D / 2 + 0.012],
                parent: group, outline: 0.009,
            });
        }
    }
    upperRun(RUN_L, RANGE_L - 0.02);
    upperRun(RANGE_R + 0.02, RUN_R);
    // 微波炉上方那一小段
    solid(box(RANGE_R - RANGE_L, CAB_TOP - 1.97, UPPER_D), whiteCabMat, {
        position: [(RANGE_L + RANGE_R) / 2, (CAB_TOP + 1.97) / 2, upperCz], parent: group, outline: 0.011,
    });

    /* ---------- 不锈钢家电 ---------- */

    const rangeCx = (RANGE_L + RANGE_R) / 2;
    const rangeW = RANGE_R - RANGE_L;
    // 按「背面贴墙」定位。之前按正面对齐算，而灶体进深 0.66 比柜体 0.62 深，
    // 背面就整整插进墙里 4.5cm —— 后排的锅也跟着穿进墙砖。
    const rangeCz = BACK_Z + 0.005 + 0.70 / 2;

    const range = buildRange({ W: rangeW, D: 0.70, TOP: 0.97 });   // 扫描：0.78 × 0.70，灶面 0.99
    range.group.position.set(rangeCx, 0, rangeCz);
    group.add(range.group);

    const mw = buildMicrowave({ W: rangeW, H: 0.43, D: 0.40 });
    mw.group.position.set(rangeCx, 1.52, BACK_Z);
    group.add(mw.group);

    const cookTop = range.top;

    /* ---------- 台面上的东西 ---------- */

    const props = new THREE.Group();
    const topY = COUNTER_Y;

    // 炉灶左边那堆油和酱油瓶
    const bottles = [
        [0.60, 0.032, 0.27, 0x33421f, 0.30], [0.66, 0.030, 0.22, 0x6e2c12, 0.34],
        [0.72, 0.036, 0.19, 0xb8811b, 0.26], [0.78, 0.028, 0.25, 0x7d5320, 0.36],
        [0.84, 0.030, 0.17, 0x4e2016, 0.30],
    ];
    bottles.forEach(([x, r, h, c, z]) => {
        solid(new THREE.CylinderGeometry(r, r, h, 16), matte(c, { roughness: 0.34, metalness: 0.04 }), {
            position: [x, topY + h / 2, BACK_Z + z], parent: props, outline: 0.005,
        });
        solid(new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.05, 12), matte(0x1e1e24, { roughness: 0.6 }), {
            position: [x, topY + h + 0.02, BACK_Z + z], parent: props, outline: 0.004, cast: false,
        });
    });

    // 灶上的锅
    function pan(x, z, r, depth, handleDir, baseY) {
        solid(new THREE.CylinderGeometry(r, r * 0.72, depth, 24, 1, true), matte(0x1b1b21, { roughness: 0.5, side: THREE.DoubleSide }), {
            position: [x, baseY + depth / 2, z], parent: props, outline: 0.005,
        });
        solid(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.012, 24), matte(0x141418, { roughness: 0.55 }), {
            position: [x, baseY + 0.006, z], parent: props, outline: 0.004, cast: false,
        });
        solid(new THREE.TorusGeometry(r, 0.008, 6, 24), matte(0x24242c, { roughness: 0.45 }), {
            position: [x, baseY + depth, z], rotation: [Math.PI / 2, 0, 0],
            parent: props, outline: 0.004, cast: false,
        });
        solid(new THREE.CylinderGeometry(0.013, 0.013, 0.19, 10), matte(0x18181c, { roughness: 0.62 }), {
            position: [x + handleDir * (r + 0.085), baseY + depth * 0.8, z],
            rotation: [0, 0, Math.PI / 2], parent: props, outline: 0.005,
        });
    }
    /* 锅的位置**直接取炉头坐标**，不再各写一套数字 —— 原来前锅写死在
       rangeCz + 0.150、而前炉头在 grateZ + 0.095 = rangeCz + 0.035，开火之后
       火苗整整跑到锅前面 11.5cm 去了。高度也从「灶面 +0.046」（悬空 11mm）
       改成坐在灶架横条上沿。

       两口锅都在左侧一列，右边两个炉头留空 —— 锅坐在炉头正上方之后，
       点它下面那个炉头火苗会被锅挡住（只透出锅内壁的一圈蓝光），
       想看整簇火还是点右边那两个。 */
    const potOn = (i, r, depth, handleDir) => {
        const [bx, bz] = range.burners[i].pos;
        pan(rangeCx + bx, rangeCz + bz, r, depth, handleDir, range.grateTop);
    };
    potOn(0, 0.105, 0.085, -1);    // 左后
    potOn(1, 0.120, 0.095, -1);    // 左前

    // 电饭煲
    solid(rb(0.26, 0.24, 0.28, 0.05), matte(0xb6bcc4, { roughness: 0.48, metalness: 0.2 }), {
        position: [2.20, topY + 0.12, BACK_Z + 0.28], parent: props, outline: 0.008,
    });
    solid(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), metal(0xc6ccd4, 0.3), {
        position: [2.20, topY + 0.245, BACK_Z + 0.28], parent: props, outline: 0.005, cast: false,
    });

    // 玻璃电水壶
    solid(new THREE.CylinderGeometry(0.075, 0.068, 0.20, 20), matte(0xbfd6e0, { roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.55 }), {
        position: [2.45, topY + 0.13, BACK_Z + 0.28], parent: props, outline: 0.006,
    });
    solid(new THREE.CylinderGeometry(0.078, 0.078, 0.035, 20), matte(0x1c1c22, { roughness: 0.5 }), {
        position: [2.45, topY + 0.245, BACK_Z + 0.28], parent: props, outline: 0.005, cast: false,
    });
    solid(new THREE.TorusGeometry(0.055, 0.012, 8, 16, Math.PI), matte(0x1c1c22, { roughness: 0.5 }), {
        position: [2.54, topY + 0.14, BACK_Z + 0.28], rotation: [0, Math.PI / 2, -Math.PI / 2],
        parent: props, outline: 0.005, cast: false,
    });

    // 厨房纸
    solid(new THREE.CylinderGeometry(0.052, 0.052, 0.24, 18), matte(0xdcd6c9, { roughness: 0.92 }), {
        position: [1.86, topY + 0.12, BACK_Z + 0.22], parent: props, outline: 0.006,
    });

    // 一只碗
    solid(new THREE.SphereGeometry(0.09, 18, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), matte(0xf4f2ec, { roughness: 0.4, side: THREE.DoubleSide }), {
        position: [2.62, topY + 0.045, BACK_Z + 0.30], parent: props, outline: 0.005,
    });

    group.add(props);

    /* 近处原本有一张占位白桌，用来压住画面前景。
       客厅建起来之后那块地方是沙发，桌子正好穿模，撤掉。 */

    // 冰箱左边那条走廊（只做看得见的那一层，见 buildHallway 的说明）
    buildHallway(group, { WALL_H, ceil: CEIL, LW_Z, wallMat });
    buildCeilingLights(group);

    return { group, range, floor };
}



/* ---------- 天花板上的灯具 ----------
   之前抬头看是一整块空白板：光是有的（buildLights 里几盏 PointLight），
   发光的东西一个没有。照实拍补上厨房那条轨道灯 —— 一根拉丝钢方轨，
   三个可调射灯头，两端黑色端帽；再加一只烟感。

   轨道沿 X 架在过道上方，和灶台一线平行，正好压在 buildLights 那盏
   `ceiling` 点光源上 —— 光和灯具这才对得上。 */
function buildCeilingLights(group) {
    /* 拉丝铝，不是镜面。这里踩的坑和 living.js 那盏方罩灯是同一个：
       metal() 是 metalness 0.72，再配 0.26 的粗糙度基本就是面镜子，而环境
       贴图里**专门有一条横向亮带**（materials.js：不锈钢那道柔和高光就靠它）。
       一根横着的金属方管正对这条横带，反射出来是一道贯穿全长的高光 ——
       看着就像轨道自己在发光；再被 bloom 一糊，天花板上还多一圈光晕。
       粗糙度提到 0.5、金属度压到 0.45，高光散开成柔和的缎面。 */
    const steel = matte(0xc0c4c8, { roughness: 0.50, metalness: 0.45 });
    const dark = matte(0x1a1a1f, { roughness: 0.5 });
    const TR_X0 = 0.20, TR_X1 = 2.62, TR_Z = TRACK_Z;
    const y = CEIL - 0.022;

    // 轨道本体：方管贴着顶，底面开槽（那道槽是灯头卡进去的地方）
    solid(box(TR_X1 - TR_X0, 0.030, 0.036), steel, {
        position: [(TR_X0 + TR_X1) / 2, y, TR_Z], parent: group, outline: 0.005, cast: false,
    });
    solid(box(TR_X1 - TR_X0 - 0.02, 0.006, 0.016), dark, {
        position: [(TR_X0 + TR_X1) / 2, y - 0.016, TR_Z], parent: group, outline: 0, cast: false,
    });
    for (const ex of [TR_X0, TR_X1]) {                    // 两端黑端帽
        solid(box(0.026, 0.036, 0.042), dark, {
            position: [ex, y, TR_Z], parent: group, outline: 0.004, cast: false,
        });
    }

    /* 三个灯头。每个是：卡座 → 短颈 → 万向球 → 筒身 → 罩口那圈暖光。
       三个各自歪一点，规规矩矩排一排反而假。 */
    TRACK_TILTS.forEach(([tx, tilt]) => {
        solid(box(0.038, 0.026, 0.044), dark, {           // 卡座
            position: [tx, y - 0.026, TR_Z], parent: group, outline: 0.004, cast: false,
        });
        solid(cyl(0.008, 0.008, 0.030, 8), steel, {       // 短颈
            position: [tx, y - 0.052, TR_Z], parent: group, outline: 0.003, cast: false,
        });
        solid(new THREE.SphereGeometry(0.016, 12, 9), steel, {
            position: [tx, y - 0.072, TR_Z], parent: group, outline: 0.004, cast: false,
        });
        const headGrp = new THREE.Group();
        headGrp.position.set(tx, y - 0.072, TR_Z);
        headGrp.rotation.z = tilt;
        group.add(headGrp);
        solid(cyl(0.026, 0.030, 0.086, 16), steel, {      // 筒身
            position: [0, -0.062, 0], parent: headGrp, outline: 0.005, cast: false,
        });
        solid(cyl(0.030, 0.030, 0.008, 16), dark, {       // 罩口压边
            position: [0, -0.108, 0], parent: headGrp, outline: 0.003, cast: false,
        });
        solid(cyl(0.024, 0.024, 0.004, 16), matte(0xfff0d2, {
            roughness: 0.9, emissive: 0xffe6b4, emissiveIntensity: 2.0,
        }), { position: [0, -0.113, 0], parent: headGrp, outline: 0, cast: false });
    });

}

/* 三个射灯头：[x, 绕 Z 的俯仰]。buildLights 照着这张表摆聚光灯 ——
   灯具和光必须同一个坐标同一个朝向，不然「灯在这儿、亮在那儿」。
   灯头筒身绕 Z 转 tilt 之后，出光方向（本地 -Y）变成 (sin tilt, -cos tilt, 0)。 */
export const TRACK_TILTS = [[0.42, -0.34], [1.24, 0.10], [2.16, 0.30]];
export const TRACK_Z = -0.92;
export const TRACK_HEAD_Y = CEIL - 0.207;

/* ---------- 冰箱左边那条走廊 ----------
   人走到冰箱旁边往左看，原来是一片空的：右墙（LW_Z，带卫生间门）有，
   左墙没有，于是从缝里直接看到场景外面去了。

   这一段照扫描补齐。换算见 living.js 顶部（lx = -sz - 0.26，lz = sx - 0.50）：

     Wall_33 / Wall_23      左墙，lz = -0.18，中间 Door_2 一个门洞
     Wall_37                尽头墙，lx = -3.81
     storage_shelf_1        书架    lx -3.76…-3.43  lz -0.89…-0.25  高 1.88
     storage_cabinet_tall2_0 白鞋柜 lx -3.76…-3.44  lz -1.44…-0.91  高 1.41

   走廊本身**不让走进去** —— nav.js 里厨房过道的西端收在 lx≈-1.1，
   刚好站在廊口能看进去、进不去。所以这里只做「看得见」的那一层：
   墙、尽头那两件家具、一盏吸顶灯；门后的房间不做。 */
function buildHallway(group, { WALL_H, ceil, LW_Z, wallMat }) {
    const HALL_Z = -0.18;                  // 左墙内表面（和客厅北墙的南端对齐）
    const HALL_T = 0.14;
    const END_X = -3.85;                   // 尽头墙内表面（= LW_X0）
    const D2_L = -1.49, D2_R = -0.70, D2_H = 2.17;   // 通卧室那个门洞
    /* 往南拐的那条支廊（下面 buildHallway 后半段会用到，先声明，
       上半段的踢脚也要按它算长度） */
    const BR_S = -2.15;                    // 回折墙内表面（拐角）
    const BR_W = -3.38, BR_E = -2.575;     // 支廊西 / 东两面墙的内表面
    const BR_END = -3.95;                  // 往南看到头的那面墙

    /* 左墙。门洞上方那条过梁单独一块 —— 这屋里的墙全是实心 box 拼的，
       挖洞要上 ExtrudeGeometry，为一个门洞不值当。 */
    const seg = (x0, x1, y0, y1) => {
        if (x1 - x0 < 0.02) return;
        solid(box(x1 - x0, y1 - y0, HALL_T), wallMat, {
            position: [(x0 + x1) / 2, (y0 + y1) / 2, HALL_Z + HALL_T / 2],
            parent: group, outline: 0,
        });
    };
    seg(END_X - HALL_T, D2_L, 0, WALL_H);
    seg(D2_R, -0.40, 0, WALL_H);
    seg(D2_L, D2_R, D2_H, WALL_H);

    /* 门洞里面：浅浅一层暗房间，和卫生间门那边同一套做法。
       内衬盒的底面**必须抬离地板** —— 贴着 y=0 和地板共面，人一动
       那一小块地面就会在两个面之间来回闪（z-fighting）。抬 2cm，
       再在洞里单铺一条深色地面把缝盖住。 */
    const RECESS = 0.34, R_LIFT = 0.02;
    solid(box(D2_R - D2_L, D2_H - R_LIFT, RECESS),
        // 自发光要给够：门后没有灯，光靠环境光这块会黑成一个洞，
        // 读起来不是「暗房间」而是「场景破了」
        matte(0x585249, {
            roughness: 0.98, side: THREE.BackSide,
            emissive: 0x4a443b, emissiveIntensity: 1,
        }), {
            position: [(D2_L + D2_R) / 2, R_LIFT + (D2_H - R_LIFT) / 2, HALL_Z + HALL_T + RECESS / 2],
            parent: group, outline: 0, cast: false,
        });
    solid(box(D2_R - D2_L - 0.03, 0.024, RECESS),
        matte(0x33302b, { roughness: 0.92, emissive: 0x2b2721, emissiveIntensity: 1 }), {
            position: [(D2_L + D2_R) / 2, 0.012, HALL_Z + HALL_T + RECESS / 2],
            parent: group, outline: 0, cast: false,
        });

    /* 白门套 + 踢脚。和卫生间门那边一样往墙里嵌 5mm，避免共面闪烁。 */
    const CW = 0.065, CD = 0.030, EMB = 0.005;
    const caseMat = matte(0xe9e5dc, { roughness: 0.55 });
    const caseZ = HALL_Z - CD / 2 + EMB;
    for (const cx of [D2_L - CW / 2, D2_R + CW / 2]) {
        solid(box(CW, D2_H + CW, CD), caseMat, {
            position: [cx, (D2_H + CW) / 2, caseZ], parent: group, outline: 0.007,
        });
    }
    solid(box(D2_R - D2_L + CW * 2, CW, CD), caseMat, {
        position: [(D2_L + D2_R) / 2, D2_H + CW / 2, caseZ], parent: group, outline: 0.007,
    });
    for (const [x0, x1] of [[END_X, D2_L - CW], [D2_R + CW, -0.40]]) {
        if (x1 - x0 < 0.05) continue;
        solid(box(x1 - x0, 0.105, 0.035), caseMat, {
            position: [(x0 + x1) / 2, 0.0525, HALL_Z - 0.0175 + EMB],
            parent: group, outline: 0.006, cast: false,
        });
    }
    solid(box(0.035, 0.105, HALL_Z - BR_S), caseMat, {      // 尽头墙根
        position: [END_X + 0.0175, 0.0525, (HALL_Z + BR_S) / 2],
        parent: group, outline: 0.006, cast: false,
    });
    /* 灯开关。**要贴在实墙上** —— 原来摆在 x=-0.95，正好落在门洞正中，
       后面没有墙，画面上就是半空里飘着一块板。挪到门西侧那段墙上。 */
    solid(box(0.085, 0.125, 0.012), caseMat, {
        position: [-1.66, 1.18, HALL_Z - 0.006], parent: group, outline: 0.005, cast: false,
    });

    /* ---- 往南拐的那条支廊 ----
       扫描：东墙 Wall_35 在 lx=-2.33（从 lz -1.44 一路往南），西墙 Wall_6 在
       lx=-3.45，回折墙 Wall_1 在 lz=-2.00。所以站在廊口看，鞋柜右手边不是墙，
       是走廊拐过去继续走。

       这条支廊只做「看得见的一截」：往南 2.4m 打止，再远的门厅和入户门
       都在视锥外，做了也看不见。 */
    const wall = (x0, x1, z0, z1) => solid(box(x1 - x0, WALL_H, z1 - z0), wallMat, {
        position: [(x0 + x1) / 2, WALL_H / 2, (z0 + z1) / 2], parent: group, outline: 0,
    });
    wall(END_X - HALL_T, BR_W, BR_S - HALL_T, BR_S);            // 回折墙（鞋柜右手那道）
    wall(BR_W, BR_W + HALL_T, BR_END, BR_S);                    // 支廊西墙
    wall(BR_E - HALL_T, BR_E, BR_END, LW_Z);                    // 支廊东墙（兼门套立边的backing）
    wall(BR_W, BR_E, BR_END - HALL_T, BR_END);                  // 看到头那面
    // 支廊上方补一块天花板：客厅那块只铺到 lz≈-1.98
    solid(box(END_X - BR_E + 0.3, 0.12, BR_S - BR_END + 0.3),
        matte(0xf0ece2, { roughness: 0.95 }), {
            position: [(END_X + BR_E) / 2, ceil + 0.06, (BR_S + BR_END) / 2],
            parent: group, outline: 0, cast: false,
        });
    // 拐角两侧的踢脚
    solid(box(END_X - BR_W, 0.105, 0.035), caseMat, {
        position: [(END_X + BR_W) / 2, 0.0525, BR_S - 0.0175], parent: group, outline: 0.006, cast: false,
    });
    solid(box(0.035, 0.105, BR_S - BR_END), caseMat, {
        position: [BR_W + HALL_T + 0.0175, 0.0525, (BR_S + BR_END) / 2],
        parent: group, outline: 0.006, cast: false,
    });

    /* 尽头那只深灰木书架。照实拍一格一格摆（自下而上）：

         5 顶格  一排书 —— 哈利波特精装、芝加哥老照片、Kaggle、1421…，
                 右端两台马力欧卡丁车小车
         4       裱起来的 UT Austin 硕士学位证，右边两个手办
         3       一摞平放的杂志 / 画册，一副黑色眼罩，右端立着的手办
         2       雅达利那只扁盒子 + 一只藤编筐
         1 底格  棋盘盒、绿色收纳盒

       之所以值得一格一格摆：这是走廊尽头唯一的落点，人走到廊口第一眼
       就看它，摆成「五块空板」会立刻露怯。 */
    const shWood = matte(0x5c554e, { roughness: 0.72 });
    const SH_X0 = END_X, SH_X1 = END_X + 0.31;
    const SH_Z0 = -0.85, SH_Z1 = -0.21, SH_H = 1.88, SH_T = 0.020;
    const SH_CX = (SH_X0 + SH_X1) / 2, SH_CZ = (SH_Z0 + SH_Z1) / 2;
    for (const sz of [SH_Z0, SH_Z1]) {                    // 两块侧板
        solid(box(SH_X1 - SH_X0, SH_H, SH_T), shWood, {
            position: [SH_CX, SH_H / 2, sz], parent: group, outline: 0.007,
        });
    }
    solid(box(SH_X1 - SH_X0, SH_T, SH_Z1 - SH_Z0), shWood, {      // 顶板
        position: [SH_CX, SH_H - SH_T / 2, SH_CZ], parent: group, outline: 0.006,
    });
    solid(box(0.014, SH_H, SH_Z1 - SH_Z0), shWood, {              // 薄背板
        position: [SH_X0 + 0.007, SH_H / 2, SH_CZ], parent: group, outline: 0, cast: false,
    });

    const BAY = (SH_H - SH_T) / 5;                        // 每格净高 ≈ 0.372
    const shelfY = (i) => 0.02 + i * BAY;                 // 第 i 格的搁板顶面
    for (let i = 0; i < 5; i++) {
        solid(box(SH_X1 - SH_X0 - 0.014, SH_T, SH_Z1 - SH_Z0 - SH_T * 2), shWood, {
            position: [SH_CX + 0.007, shelfY(i), SH_CZ], parent: group, outline: 0.005, cast: false,
        });
    }

    /* --- 顶格：一排书 --- */
    const BOOK_TONES = [0x8d3b2f, 0x2f4a63, 0xb8925a, 0x3d5c44, 0x6b4a72,
        0xc4b49a, 0x2b2b33, 0xa8552c, 0x30607a, 0xd8c88c];
    {
        const y0 = shelfY(4) + SH_T / 2;
        let z = SH_Z0 + 0.035, n = 0;
        while (z < SH_Z1 - 0.14 && n < 18) {
            const t = 0.016 + ((n * 5) % 4) * 0.010;
            const h = 0.215 + ((n * 7) % 5) * 0.020;
            const d = 0.135 + ((n * 3) % 3) * 0.020;
            const bk = solid(box(d, h, t), matte(BOOK_TONES[n % BOOK_TONES.length], { roughness: 0.8 }), {
                position: [SH_X0 + 0.022 + d / 2, y0 + h / 2, z + t / 2],
                parent: group, outline: 0.004, cast: false,
            });
            if (n === 17) bk.rotation.x = 0.12;           // 最后一本歪着靠
            z += t + 0.003;
            n++;
        }
        // 右端那两台小车
        for (let k = 0; k < 2; k++) {
            const czz = SH_Z1 - 0.10 + k * 0.052;
            solid(rb(0.075, 0.030, 0.042, 0.010), matte(k ? 0xd8443a : 0xe4d24a, { roughness: 0.5 }), {
                position: [SH_X0 + 0.085, y0 + 0.024, czz], parent: group, outline: 0.005, cast: false,
            });
            solid(cyl(0.014, 0.014, 0.048, 10), matte(0x1e1e22, { roughness: 0.7 }), {
                position: [SH_X0 + 0.062, y0 + 0.014, czz], rotation: [Math.PI / 2, 0, 0],
                parent: group, outline: 0.003, cast: false,
            });
        }
    }

    /* --- 第 4 格：学位证。黑框 + 金珠边 + 米色证书，全画在一张贴图上；
           正面朝 +X（走廊这头），微微后仰靠在背板上。 --- */
    {
        const y0 = shelfY(3) + SH_T / 2;
        const FR_W = 0.335, FR_H = 0.255;                 // 4:3，和实物一样横着
        const frame = new THREE.Group();
        frame.position.set(SH_X0 + 0.055, y0 + FR_H / 2 + 0.004, SH_CZ - 0.045);
        frame.rotation.z = -0.10;                         // 靠在背板上
        group.add(frame);
        const faceMat = new THREE.MeshStandardMaterial({
            map: diplomaTexture(), roughness: 0.42, metalness: 0.04,
        });
        const sideMat = matte(0x171310, { roughness: 0.45 });
        // BoxGeometry 六面顺序 [+X, -X, +Y, -Y, +Z, -Z]，正面挂 +X
        solid(box(0.016, FR_H, FR_W),
            [faceMat, sideMat, sideMat, sideMat, sideMat, sideMat], {
                parent: frame, outline: 0.005, cast: false,
            });
        // 立在后面的支脚
        const leg = solid(box(0.055, 0.012, 0.05), sideMat, {
            position: [-0.028, -FR_H / 2 + 0.02, 0], parent: frame, outline: 0, cast: false,
        });
        leg.rotation.z = 0.35;
        // 右边两个手办
        for (let k = 0; k < 2; k++) {
            const zz = SH_Z1 - 0.085 - k * 0.055;
            const hgt = 0.115 + k * 0.02;
            solid(cyl(0.026, 0.030, 0.012, 12), matte(0xd8d4cc, { roughness: 0.6 }), {
                position: [SH_X0 + 0.10, y0 + 0.006, zz], parent: group, outline: 0.003, cast: false,
            });
            solid(rb(0.032, hgt, 0.034, 0.012), matte(k ? 0x3c5f9e : 0xb8b2a6, { roughness: 0.55 }), {
                position: [SH_X0 + 0.10, y0 + 0.012 + hgt / 2, zz], parent: group, outline: 0.004, cast: false,
            });
            solid(cyl(0.019, 0.019, 0.026, 10), matte(k ? 0xe8c07a : 0xc9c3b6, { roughness: 0.6 }), {
                position: [SH_X0 + 0.10, y0 + 0.024 + hgt, zz], parent: group, outline: 0.003, cast: false,
            });
        }
    }

    /* --- 第 3 格：平摞的画册 + 眼罩 + 立着的手办 --- */
    {
        const y0 = shelfY(2) + SH_T / 2;
        let z = SH_Z0 + 0.035;
        for (let n = 0; n < 9; n++) {                     // 竖插的一叠薄画册
            const t = 0.009 + (n % 3) * 0.004;
            solid(box(0.155, 0.235, t), matte([0xe6e2d8, 0x2b2f36, 0xb9c3c9, 0x8a3b34][n % 4], { roughness: 0.78 }), {
                position: [SH_X0 + 0.030 + 0.078, y0 + 0.118, z + t / 2],
                parent: group, outline: 0.004, cast: false,
            });
            z += t + 0.002;
        }
        // 黑眼罩，摊在板上
        solid(rb(0.075, 0.022, 0.135, 0.010), matte(0x1c1c20, { roughness: 0.7 }), {
            position: [SH_X0 + 0.11, y0 + 0.011, SH_CZ + 0.03], parent: group, outline: 0.004, cast: false,
        });
        // 立在圆座上的手办
        solid(cyl(0.032, 0.036, 0.010, 14), matte(0x141418, { roughness: 0.5 }), {
            position: [SH_X0 + 0.10, y0 + 0.005, SH_Z1 - 0.075], parent: group, outline: 0.003, cast: false,
        });
        solid(rb(0.030, 0.125, 0.032, 0.012), matte(0xc94f3a, { roughness: 0.6 }), {
            position: [SH_X0 + 0.10, y0 + 0.072, SH_Z1 - 0.075], parent: group, outline: 0.004, cast: false,
        });
    }

    /* --- 第 2 格：雅达利那只扁盒子 + 藤编筐 --- */
    {
        const y0 = shelfY(1) + SH_T / 2;
        solid(box(0.145, 0.045, 0.215), matte(0xd9d2c2, { roughness: 0.8 }), {
            position: [SH_X0 + 0.095, y0 + 0.023, SH_Z0 + 0.135], parent: group, outline: 0.005, cast: false,
        });
        solid(box(0.130, 0.004, 0.180), matte(0xb43a2c, { roughness: 0.75 }), {
            position: [SH_X0 + 0.095, y0 + 0.047, SH_Z0 + 0.135], parent: group, outline: 0, cast: false,
        });
        // 藤筐
        solid(rb(0.185, 0.145, 0.235, 0.014), matte(0xb08f5e, { roughness: 0.95, noise: 1 }), {
            position: [SH_X0 + 0.11, y0 + 0.073, SH_Z1 - 0.145], parent: group, outline: 0.007, cast: false,
        });
    }

    /* --- 底格：棋盘盒 + 收纳盒 --- */
    {
        const y0 = shelfY(0) + SH_T / 2;
        solid(box(0.125, 0.085, 0.115), matte(0x8c4a2c, { roughness: 0.7 }), {
            position: [SH_X0 + 0.085, y0 + 0.043, SH_Z0 + 0.095], parent: group, outline: 0.006, cast: false,
        });
        solid(rb(0.130, 0.135, 0.120, 0.012), matte(0x3d6b4a, { roughness: 0.6 }), {
            position: [SH_X0 + 0.090, y0 + 0.068, SH_Z0 + 0.245], parent: group, outline: 0.006, cast: false,
        });
        solid(rb(0.120, 0.110, 0.110, 0.010), matte(0xdcdfe0, { roughness: 0.35, metalness: 0.05 }), {
            position: [SH_X0 + 0.085, y0 + 0.055, SH_Z1 - 0.09], parent: group, outline: 0.005, cast: false,
        });
    }

    /* 白色三层翻斗鞋柜 */
    const white = matte(0xdedbd2, { roughness: 0.5 });
    const SC_X0 = END_X, SC_X1 = END_X + 0.32;
    const SC_Z0 = -1.28, SC_Z1 = -0.87, SC_H = 1.41;
    solid(box(SC_X1 - SC_X0, SC_H, SC_Z1 - SC_Z0), white, {
        position: [(SC_X0 + SC_X1) / 2, SC_H / 2, (SC_Z0 + SC_Z1) / 2], parent: group, outline: 0.010,
    });
    for (let i = 0; i < 3; i++) {
        solid(rb(0.018, SC_H / 3 - 0.022, SC_Z1 - SC_Z0 - 0.024, 0.004), white, {
            position: [SC_X1 + 0.009, (SC_H / 3) * (i + 0.5), (SC_Z0 + SC_Z1) / 2],
            parent: group, outline: 0.007,
        });
    }

    /* 吸顶灯：一只暖白鼓形罩。走廊本来就只有这一盏灯。 */
    solid(cyl(0.175, 0.175, 0.085, 24), matte(0xf4e6c6, {
        roughness: 0.9, emissive: 0xffe2ab, emissiveIntensity: 0.9,
    }), { position: [-2.30, ceil - 0.05, -0.76], parent: group, outline: 0.007, cast: false });
}


/* 整间屋子（含走廊 / 支廊）的世界包围盒。阴影相机照着它来收。 */
export const WORLD_BOUNDS = new THREE.Box3(
    new THREE.Vector3(-4.15, -0.15, -4.15),
    new THREE.Vector3(4.15, 3.50, 4.95),
);

/** 把方向光的阴影相机**收到刚好罩住整间屋子**。
 *
 *  为什么必须算而不是写死：DirectionalLight 的阴影是一台固定大小的正交
 *  相机，盒子外面的表面压根不在深度图里，three 就按「完全没有阴影」渲。
 *  于是盒内盒外之间是一条刀切一样的直线 —— 投在平墙上就是一条横贯整面墙
 *  的硬带。这屋子这几版一直在长（走廊往西、支廊往南），写死的 ±3.5
 *  早就罩不住了，北墙顶那一角正好越界。
 *
 *  three 的阴影相机架在 light.position、朝 target 看，left/right/top/bottom
 *  是**它自己那套轴**上的量，所以这里得按 lookAt 的定义把基重建出来：
 *  z = normalize(eye - target)，x = cross(worldUp, z)，y = cross(z, x)。 */
export function fitShadowCamera(light, box = WORLD_BOUNDS, pad = 0.4) {
    const z = new THREE.Vector3().subVectors(light.position, light.target.position).normalize();
    const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x);

    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const v = new THREE.Vector3();
    for (const px of [box.min.x, box.max.x]) {
        for (const py of [box.min.y, box.max.y]) {
            for (const pz of [box.min.z, box.max.z]) {
                v.set(px, py, pz).sub(light.position);
                const c = [v.dot(x), v.dot(y), -v.dot(z)];   // 相机看向 -z，深度取负
                for (let i = 0; i < 3; i++) {
                    lo[i] = Math.min(lo[i], c[i]);
                    hi[i] = Math.max(hi[i], c[i]);
                }
            }
        }
    }
    const cam = light.shadow.camera;
    cam.left = lo[0] - pad; cam.right = hi[0] + pad;
    cam.bottom = lo[1] - pad; cam.top = hi[1] + pad;
    cam.near = Math.max(0.1, lo[2] - pad);
    cam.far = hi[2] + pad;
    cam.updateProjectionMatrix();
    return cam;
}

/* 灯光：公寓白天的顶灯 + 侧向自然光，比之前那版平、亮、中性。
   漫画感靠后期和轮廓光，不再靠一束戏剧化的夕阳。 */
export function buildLights(scene) {
    const key = new THREE.DirectionalLight(0xfff5e6, 1.62);
    key.position.set(-1.83, 3.4, 3.4);
    key.target.position.set(0.07, 1.1, -1.3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.001;
    key.shadow.normalBias = 0.02;
    scene.add(key, key.target);
    fitShadowCamera(key);          // 别再写死视锥，见 fitShadowCamera 的说明

    const hemi = new THREE.HemisphereLight(0xfff2e6, 0x22201f, 0.17);
    scene.add(hemi);

    /* 厨房顶上那条轨道灯。三个头各一盏**聚光灯**，不是点光源 ——
       这一点是有物理后果的，不是风格问题：

         · 射灯是有方向的，光只往下打一个锥。点光源四面八方都发，
           于是天花板被自己底下那盏灯照了个透亮。
         · 灯头离天花板只有 24cm，按平方反比 `I/d²` 算，天花板拿到的
           照度是 1/0.24² ≈ 17 倍 —— ACES 压不住，再经漫画滤镜的色阶
           量化，就糊成一大团死白。

       换成 SpotLight 之后灯头上方不发光，天花板干净了，光按锥形落在
       台面和柜门下沿上 —— 和实拍里那几摊光斑对得上。
       penumbra 给到 0.7：边缘太硬会被色阶量化切成一圈套一圈的年轮。 */
    const track = TRACK_TILTS.map(([x, tilt]) => {
        const l = new THREE.SpotLight(0xfff6e8, 4.6, 6.5, 0.55, 0.7, 2);
        l.position.set(x, TRACK_HEAD_Y - 0.03, TRACK_Z);
        l.target.position.set(
            x + Math.sin(tilt) * 2.0,
            TRACK_HEAD_Y - 0.03 - Math.cos(tilt) * 2.0,
            TRACK_Z,
        );
        scene.add(l, l.target);
        return l;
    });

    /* 走廊那盏吸顶灯。厨房这盏够不到走廊尽头（衰减 9m、还隔着冰箱柜），
       不补一盏的话书架和鞋柜就是两块黑影。 */
    /* 走廊那只吸顶鼓形罩。原来是点光源，贴着天花板 0.14m —— `1/0.14²`
       ≈ 265 倍，那一圈天花板直接烧穿。吸顶灯本来也只往下照，
       换成一盏很宽的聚光灯（角度 1.15 rad ≈ 66°，penumbra 拉满）。 */
    const hall = new THREE.SpotLight(0xffeccd, 7.5, 7.5, 1.15, 1.0, 2);
    hall.position.set(-2.30, CEIL - 0.10, -0.76);        // = buildHallway 里那只鼓形罩
    hall.target.position.set(-2.30, 0, -0.76);
    scene.add(hall.target);
    scene.add(hall);

    /* 支廊那截**没有灯具**，所以这盏不是「一盏灯」，是主走廊漏过拐角的光：
       摆在拐角上、压得很低。不给的话拐过去是纯黑，读起来是「场景破了」，
       不是「走廊拐过去了」。 */
    const branch = new THREE.PointLight(0xffe9c6, 0.85, 3.4, 2);
    branch.position.set(-3.00, 2.30, -2.05);
    scene.add(branch);

    /* 柜下照明。原来摆在 y=1.42，离吊柜底面（1.47）只有 5cm ——
       `1/0.05²` = 400 倍，柜子底面是烧穿的（平时看不到而已）。
       往下挪到台面和柜底的中间，强度不变。 */
    const underCab = new THREE.PointLight(0xfff8f0, 0.52, 3.2, 2);
    underCab.position.set(1.52, 1.22, -1.25);
    scene.add(underCab);

    /* 冷补光，让暗部偏蓝而不是发灰。强度压到 0.14 —— 见下面 rimCyan 那段。 */
    const coolFill = new THREE.DirectionalLight(0xa8b2f5, 0.14);
    coolFill.position.set(3.77, 1.6, 3.0);
    coolFill.target.position.set(0.17, 1.0, -1.3);
    scene.add(coolFill, coolFill.target);

    /* 轮廓光，把冰箱从柜体里抠出来。

       这里有个容易忽略的事：**方向光是照全场的**，target 只决定方向、
       不决定照到谁。所以这盏本来只想勾冰箱边的饱和青光（0x74ecff @ 0.55）
       其实把整间屋子朝那个角度的面都染了一层青 —— 客厅墙下半截发薄荷绿
       就是它干的，再被色阶量化切一刀，就成了一条横带。
       颜色收淡、强度砍到 1/4，勾边还在，屋子不再是青的。 */
    const rimCyan = new THREE.DirectionalLight(0x9fd6e8, 0.14);
    rimCyan.position.set(4.37, 2.2, -2.4);
    rimCyan.target.position.set(-0.08, 1.2, -1.2);
    scene.add(rimCyan, rimCyan.target);

    /* 原来这儿还有一盏 rimPink，强度 0.05 —— 画面上完全看不出来，
       纯粹是遗留。删了。 */

    return { key, track, hall, branch, underCab, coolFill, rimCyan };
}
