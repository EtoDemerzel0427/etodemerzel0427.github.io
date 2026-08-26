import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PALETTE, matte, metal, solid, stainless } from './materials.js';

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

    /* 底座 */
    solid(rb(W - 0.05, PLINTH_H, D - 0.12, 0.005, 2), darkMat, {
        position: [0, PLINTH_H / 2, -0.04], parent: group, outline: 0.007,
    });

    /* 箱体 */
    solid(rb(W, BODY_H, D, 0.010, 3), bodyMat, {
        position: [0, PLINTH_H + BODY_H / 2, 0], parent: group, outline: 0.012,
    });

    const DOOR_D = 0.07;
    const doorZ = D / 2 + DOOR_D / 2 - 0.003;
    const faceZ = doorZ + DOOR_D / 2;

    /* 下面的冷冻抽屉 */
    const DRAWER = { h: 0.605, cy: 0.378 };
    solid(rb(W - 0.015, DRAWER.h, DOOR_D, 0.007, 3), drawerMat, {
        position: [0, DRAWER.cy, doorZ], parent: group, outline: 0.011,
    });
    // 抽屉把手：横向，微微下弯
    const drawerHandleY = DRAWER.cy + DRAWER.h / 2 - 0.10;
    // 两端弯回门面，所以不需要另外的支撑柱 —— 之前留着支撑，
    // 把手一拱起来支撑就露在外面了
    const drawerHandle = bridgeHandle({
        length: W - 0.14, bow: 0.052, width: 0.052, thickness: 0.016,
    });
    drawerHandle.rotateZ(Math.PI / 2);       // 长度转到 x 方向
    solid(drawerHandle, handleMat, {
        position: [0, drawerHandleY, faceZ + 0.010], parent: group, outline: 0.006,
    });

    /* 上面两扇对开门 */
    const DOORS = { h: 1.10, cy: 1.265, w: (W - 0.025) / 2 - 0.005 };
    const doorOffsetX = DOORS.w / 2 + 0.005;

    for (const sign of [-1, 1]) {
        solid(rb(DOORS.w, DOORS.h, DOOR_D, 0.007, 3), doorMat, {
            position: [sign * doorOffsetX, DOORS.cy, doorZ], parent: group, outline: 0.011,
        });
        // 门封条：内缩一圈的深色，把门的厚度交代清楚
        solid(rb(DOORS.w - 0.05, DOORS.h - 0.05, DOOR_D + 0.004, 0.006, 2), sealMat, {
            position: [sign * doorOffsetX, DOORS.cy, doorZ - 0.008],
            parent: group, outline: 0, cast: false,
        });

        // 把手：竖向圆管，贴着中缝两侧
        const hx = sign * 0.075;
        const hLen = DOORS.h - 0.16;
        solid(bridgeHandle({
            length: hLen, bow: 0.058, width: 0.046, thickness: 0.015,
        }), handleMat, {
            position: [hx, DOORS.cy - 0.01, faceZ + 0.010], parent: group, outline: 0.006,
        });
    }

    /* 中缝 */
    solid(rb(0.012, DOORS.h, 0.01, 0.003, 2), sealMat, {
        position: [0, DOORS.cy, doorZ + DOOR_D / 2 - 0.008],
        parent: group, outline: 0, cast: false,
    });
    // 上下门之间的横缝
    solid(rb(W - 0.015, 0.02, 0.012, 0.004, 2), sealMat, {
        position: [0, (DRAWER.cy + DRAWER.h / 2 + DOORS.cy - DOORS.h / 2) / 2, doorZ + DOOR_D / 2 - 0.01],
        parent: group, outline: 0, cast: false,
    });

    /* 铭牌 */
    solid(rb(0.115, 0.026, 0.005, 0.005, 2), matte(0x2a2a33, { roughness: 0.6 }), {
        position: [doorOffsetX + 0.06, DOORS.cy + DOORS.h / 2 - 0.10, faceZ],
        parent: group, outline: 0.004, cast: false,
    });

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

    return { group, doorPlane, size: { W, H: PLINTH_H + BODY_H, D: D + DOOR_D } };
}
