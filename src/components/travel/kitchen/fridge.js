import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PALETTE, matte, metal, solid, stainless, whirlpoolBadge } from './materials.js';

/** 弓形把手：扁截面的「桥」。
 *
 *  实物不是圆管，是一根扁条：贴门那一面窄、正面宽，中段拱起、两端弯回门面。
 *  做法是先用 TubeGeometry 沿贝塞尔生成圆截面管，再沿厚度方向整体压扁。
 *  控制点要预先按压扁系数放大，压完才是想要的拱高。
 *
 *  返回的几何体在局部坐标里：长度沿 y，拱向 +z，两端落在 z = 0。
 */
function bridgeHandle({ length, bow, width, thickness, segments = 36 }) {
    const k = thickness / width;              // 压扁系数
    const r = width / 2;
    const ctrlZ = (2 * bow) / k;              // 二次贝塞尔在 t=0.5 只到控制点的一半
    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, -length / 2, 0),
        new THREE.Vector3(0, 0, ctrlZ),
        new THREE.Vector3(0, length / 2, 0),
    );
    const geo = new THREE.TubeGeometry(curve, segments, r, 14, false);
    geo.scale(1, 1, k);
    return geo;
}

const rb = (w, h, d, r = 0.02, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, r);
const cyl = (r, h, seg = 20) => new THREE.CylinderGeometry(r, r, h, seg);

/**
 * 不锈钢法式对开门冰箱，下置冷冻抽屉。
 * 上面两扇门是贴冰箱贴的地方，把手在中缝两侧。
 */
export function buildFridge() {
    const group = new THREE.Group();

    // 扫描（RoomPlan）：refrigerator_0 = 0.89 宽 × 1.83 高
    const W = 0.89, D = 0.72;
    const PLINTH_H = 0.055;
    const BODY_H = 1.775;

    const bodyMat = stainless(PALETTE.steel, { roughness: 0.70, repeat: [2, 2] });
    const doorMat = stainless(0xc6ccd4, { roughness: 0.66, repeat: [2, 2] });
    const drawerMat = stainless(0xc6ccd4, { roughness: 0.66, repeat: [2, 2] });
    const darkMat = matte(0x1c1c24, { roughness: 0.75 });
    const sealMat = matte(0x15151c, { roughness: 0.95 });
    const handleMat = metal(0xd2d8e0, 0.34);
    const linerMat = matte(0xe7e8e5, { roughness: 0.68 });
    const linerShadow = matte(0xb8bcc1, { roughness: 0.78 });
    const glassMat = matte(0xd8edf1, {
        roughness: 0.14, metalness: 0.02, transparent: true, opacity: 0.42,
    });

    /* 底座 */
    solid(rb(W - 0.05, PLINTH_H, D - 0.12, 0.005, 2), darkMat, {
        position: [0, PLINTH_H / 2, -0.04], parent: group, outline: 0.007,
    });

    /* 箱体改为空心结构。门打开后能真正看到有深度的冷藏室，而不是一块钢盒正面。 */
    const T = 0.035;
    const bodyY0 = PLINTH_H, bodyY1 = PLINTH_H + BODY_H;
    solid(rb(T, BODY_H, D, 0.008, 3), bodyMat, {
        position: [-(W - T) / 2, (bodyY0 + bodyY1) / 2, 0], parent: group, outline: 0.009,
    });
    solid(rb(T, BODY_H, D, 0.008, 3), bodyMat, {
        position: [(W - T) / 2, (bodyY0 + bodyY1) / 2, 0], parent: group, outline: 0.009,
    });
    solid(rb(W - 2 * T, T, D, 0.006, 2), bodyMat, {
        position: [0, bodyY1 - T / 2, 0], parent: group, outline: 0.008,
    });
    solid(new THREE.BoxGeometry(W - 2 * T, BODY_H - 2 * T, T), linerMat, {
        position: [0, (bodyY0 + bodyY1) / 2, -D / 2 + T / 2], parent: group, outline: 0.006,
    });

    const DOOR_D = 0.07;
    const doorZ = D / 2 + DOOR_D / 2 - 0.003;
    const faceZ = doorZ + DOOR_D / 2;
    const doors = [];

    /* 下面的冷冻抽屉 */
    const DRAWER = { h: 0.605, cy: 0.378 };
    const freezerDrawer = new THREE.Group();
    group.add(freezerDrawer);
    solid(rb(W - 0.015, DRAWER.h, DOOR_D, 0.007, 3), drawerMat, {
        position: [0, DRAWER.cy, doorZ], parent: freezerDrawer, outline: 0.011,
    });
    // 抽屉随门板一起拉出的深篮筐：底板、四周箱壁和中间分隔。
    const binW = W - 0.105, binD = D - 0.105;
    const binBottomY = 0.105, binWallH = 0.335;
    solid(rb(binW, 0.028, binD, 0.006, 2), linerMat, {
        position: [0, binBottomY, doorZ - binD / 2 + 0.018], parent: freezerDrawer, outline: 0.005,
    });
    for (const sx of [-1, 1]) {
        solid(rb(0.026, binWallH, binD, 0.006, 2), linerMat, {
            position: [sx * (binW - 0.026) / 2, binBottomY + binWallH / 2, doorZ - binD / 2 + 0.018],
            parent: freezerDrawer, outline: 0.005,
        });
    }
    solid(rb(binW, binWallH, 0.026, 0.006, 2), linerMat, {
        position: [0, binBottomY + binWallH / 2, doorZ - binD + 0.030],
        parent: freezerDrawer, outline: 0.005,
    });
    solid(new THREE.BoxGeometry(0.022, binWallH * 0.72, binD - 0.07), linerShadow, {
        position: [0, binBottomY + binWallH * 0.40, doorZ - binD / 2 + 0.025],
        parent: freezerDrawer, outline: 0.003,
    });

    /* 上层浅抽屉：比下层短、整体后退，拉开主抽屉时能一眼读出上下两层。
       两侧导轨也一起带出来，避免看起来像一块悬空托盘。 */
    const upperW = binW - 0.055, upperD = binD - 0.135;
    const upperY = 0.485, upperWallH = 0.105;
    solid(rb(upperW, 0.020, upperD, 0.005, 2), linerMat, {
        position: [0, upperY, doorZ - upperD / 2 - 0.045], parent: freezerDrawer, outline: 0.004,
    });
    for (const sx of [-1, 1]) {
        solid(rb(0.020, upperWallH, upperD, 0.005, 2), linerMat, {
            position: [sx * (upperW - 0.020) / 2, upperY + upperWallH / 2, doorZ - upperD / 2 - 0.045],
            parent: freezerDrawer, outline: 0.004,
        });
        solid(new THREE.BoxGeometry(0.025, 0.022, upperD + 0.035), linerShadow, {
            position: [sx * (upperW + 0.020) / 2, upperY - 0.010, doorZ - upperD / 2 - 0.045],
            parent: freezerDrawer, outline: 0.003,
        });
    }
    solid(rb(upperW, upperWallH, 0.020, 0.005, 2), linerMat, {
        position: [0, upperY + upperWallH / 2, doorZ - upperD - 0.035],
        parent: freezerDrawer, outline: 0.004,
    });
    // 浅抽屉透明前挡板，让后面的制冰组件仍然看得见。
    solid(rb(upperW - 0.025, 0.085, 0.012, 0.005, 2), glassMat, {
        position: [0, upperY + 0.045, doorZ - 0.048], parent: freezerDrawer, outline: 0.003, cast: false,
    });

    /* 固定在冷冻腔体左上方的制冰机：主抽屉拉出后留在原位，电机盒、
       圆形驱动盖、落冰口和储冰盒会直接暴露出来。 */
    const iceX = -0.205;
    // 整套组件必须留在抽屉门内表面之后。之前储冰盒的最前沿到了
    // z≈0.445，已经穿过 z≈0.357 的门内面；后移后仍能在拉开时看清。
    const iceZ = -0.045;
    solid(rb(0.245, 0.145, 0.155, 0.010, 3), linerMat, {
        position: [iceX, 0.615, iceZ], parent: group, outline: 0.005,
    });
    solid(cyl(0.040, 0.018, 24), linerShadow, {
        position: [iceX + 0.065, 0.620, iceZ + 0.086], rotation: [Math.PI / 2, 0, 0],
        parent: group, outline: 0.004,
    });
    solid(rb(0.080, 0.058, 0.060, 0.008, 3), linerShadow, {
        position: [iceX - 0.060, 0.600, iceZ + 0.135], parent: group, outline: 0.004,
    });
    solid(rb(0.235, 0.115, 0.210, 0.010, 3), matte(0x9ed8e6, {
        roughness: 0.18, transparent: true, opacity: 0.62,
    }), {
        position: [iceX, 0.595, iceZ + 0.185], parent: group, outline: 0.004, cast: false,
    });
    // 几块淡蓝冰块，远看能明确读成储冰盒而不是普通塑料框。
    const iceMat = matte(0xbfe9f3, { roughness: 0.22, transparent: true, opacity: 0.68 });
    for (const [dx, dz, rz] of [[-0.055, 0.115, 0.12], [0.010, 0.150, -0.18], [0.065, 0.100, 0.28]]) {
        solid(rb(0.045, 0.038, 0.045, 0.009, 3), iceMat, {
            position: [iceX + dx, 0.635, iceZ + dz + 0.035], rotation: [0, rz, 0],
            parent: group, outline: 0.002, cast: false,
        });
    }
    // 抽屉把手：横向，微微下弯
    const drawerHandleY = DRAWER.cy + DRAWER.h / 2 - 0.10;
    // 两端弯回门面，所以不需要另外的支撑柱 —— 之前留着支撑，
    // 把手一拱起来支撑就露在外面了
    const drawerHandle = bridgeHandle({
        length: W - 0.14, bow: 0.052, width: 0.052, thickness: 0.016,
    });
    drawerHandle.rotateZ(Math.PI / 2);       // 长度转到 x 方向
    const freezerHandle = solid(drawerHandle, handleMat, {
        position: [0, drawerHandleY, faceZ + 0.010], parent: freezerDrawer, outline: 0.006,
    });
    doors.push({
        kind: 'freezer-drawer', node: freezerDrawer, pick: [freezerHandle],
        axis: 'z', dir: 1, travel: 0.49,
    });

    /* 上面两扇对开门 */
    const DOORS = { h: 1.10, cy: 1.265, w: (W - 0.025) / 2 - 0.005 };
    const doorOffsetX = DOORS.w / 2 + 0.005;
    const cavityBottom = DOORS.cy - DOORS.h / 2 + 0.025;

    // 冷藏室底板、三层玻璃搁板和两只保鲜抽屉。
    solid(rb(W - 2 * T - 0.012, 0.035, D - 0.075, 0.005, 2), linerMat, {
        position: [0, cavityBottom, -0.010], parent: group, outline: 0.006,
    });
    for (const sy of [0.925, 1.195, 1.465]) {
        solid(rb(W - 2 * T - 0.045, 0.012, D - 0.12, 0.004, 2), glassMat, {
            position: [0, sy, -0.012], parent: group, outline: 0.004, cast: false,
        });
        solid(new THREE.BoxGeometry(W - 2 * T - 0.055, 0.018, 0.018), linerShadow, {
            position: [0, sy - 0.004, D / 2 - 0.085], parent: group, outline: 0.003, cast: false,
        });
    }
    for (const sx of [-1, 1]) {
        solid(rb((W - 2 * T) / 2 - 0.025, 0.155, D - 0.13, 0.012, 3), linerMat, {
            position: [sx * 0.205, cavityBottom + 0.105, -0.018], parent: group, outline: 0.006,
        });
        solid(rb((W - 2 * T) / 2 - 0.055, 0.055, 0.018, 0.007, 2), linerShadow, {
            position: [sx * 0.205, cavityBottom + 0.135, D / 2 - 0.058], parent: group, outline: 0.003,
        });
    }

    for (const sign of [-1, 1]) {
        const pivot = new THREE.Group();
        const hingeX = sign * (W / 2 - 0.008);
        pivot.position.set(hingeX, 0, doorZ);
        group.add(pivot);
        const relCx = sign * doorOffsetX - hingeX;

        solid(rb(DOORS.w, DOORS.h, DOOR_D, 0.007, 3), doorMat, {
            position: [relCx, DOORS.cy, 0], parent: pivot, outline: 0.011,
        });
        // 门封条：内缩一圈的深色，把门的厚度交代清楚
        solid(rb(DOORS.w - 0.05, DOORS.h - 0.05, DOOR_D + 0.004, 0.006, 2), sealMat, {
            position: [relCx, DOORS.cy, -0.008], parent: pivot, outline: 0, cast: false,
        });

        // 门内侧的浅色衬板与两层窄门架，开门后从斜角能看见。
        solid(rb(DOORS.w - 0.075, DOORS.h - 0.075, 0.018, 0.012, 3), linerMat, {
            position: [relCx, DOORS.cy, -DOOR_D / 2 - 0.010], parent: pivot, outline: 0.005,
        });
        for (const sy of [DOORS.cy - 0.285, DOORS.cy + 0.12]) {
            solid(rb(DOORS.w - 0.11, 0.105, 0.065, 0.010, 3), linerMat, {
                position: [relCx, sy, -DOOR_D / 2 - 0.042], parent: pivot, outline: 0.005,
            });
            solid(new THREE.BoxGeometry(DOORS.w - 0.13, 0.018, 0.018), linerShadow, {
                position: [relCx, sy + 0.04, -DOOR_D / 2 - 0.080], parent: pivot, outline: 0.002,
            });
        }

        // 把手：竖向圆管，贴着中缝两侧
        const hx = sign * 0.075;
        const hLen = DOORS.h - 0.16;
        const handle = solid(bridgeHandle({
            length: hLen, bow: 0.058, width: 0.046, thickness: 0.015,
        }), handleMat, {
            position: [hx - hingeX, DOORS.cy - 0.01, DOOR_D / 2 + 0.010], parent: pivot, outline: 0.006,
        });

        doors.splice(sign < 0 ? 0 : 1, 0, {
            kind: 'fridge-door', node: pivot, pick: [handle], spin: sign, swing: 1.72,
            side: sign < 0 ? 'left' : 'right',
        });
    }

    // 上下门之间的横缝
    solid(rb(W - 0.015, 0.02, 0.012, 0.004, 2), sealMat, {
        position: [0, (DRAWER.cy + DRAWER.h / 2 + DOORS.cy - DOORS.h / 2) / 2, doorZ + DOOR_D / 2 - 0.01],
        parent: group, outline: 0, cast: false,
    });

    /* Whirlpool 字标跟着右门走。 */
    const logo = whirlpoolBadge(0.086);
    const rightDoor = doors[1].node;
    const rightHingeX = rightDoor.position.x;
    logo.position.set(doorOffsetX + 0.045 - rightHingeX, DOORS.cy + DOORS.h / 2 - 0.095, DOOR_D / 2 + 0.006);
    rightDoor.add(logo);

    /* 冰箱贴可用区域：两扇门的正面，中间把手那一条留空由内容自己避开。

       内缩量按实拍收紧过：上边距 0.09 → 0.045（实拍最上面那排贴纸离门顶只有
       4~5cm，留 9cm 的话整片贴纸会被压低一截）、左右 0.09 → 0.06。
       handleGap 也从 [27,73] 收到 [36,64] —— 把手实际只占 ±0.075±0.023，
       换算过来是 37.3~43.2%，原来那个范围保守得多，白白吃掉了两侧各 9% 的
       可贴面积，实拍里科罗拉多和格兰芬多是紧挨着把手的。 */
    const doorPlane = {
        z: faceZ,
        x0: -W / 2 + 0.06,
        x1: W / 2 - 0.06,
        y0: DOORS.cy - DOORS.h / 2 + 0.09,
        y1: DOORS.cy + DOORS.h / 2 - 0.045,
        // 中缝把手区，冰箱贴要躲开（百分比）
        handleGap: [36, 64],
    };

    return { group, doorPlane, doors, size: { W, H: PLINTH_H + BODY_H, D: D + DOOR_D } };
}
