import * as THREE from 'three';
import { inkOutline, matte } from './materials.js';

/* ---------- 外形 ---------- */

function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
}

const SHAPES = {
    round() {
        const s = new THREE.Shape();
        s.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
        return s;
    },
    tile() {
        return roundedRectShape(0.98, 0.90, 0.10);
    },
    arch() {
        const s = new THREE.Shape();
        const w = 0.86, r = w / 2;
        s.moveTo(-r, -0.46);
        s.lineTo(-r, 0.06);
        s.absarc(0, 0.06, r, Math.PI, 0, false);
        s.lineTo(r, -0.46);
        s.quadraticCurveTo(r, -0.52, r - 0.06, -0.52);
        s.lineTo(-r + 0.06, -0.52);
        s.quadraticCurveTo(-r, -0.52, -r, -0.46);
        return s;
    },
    banner() {
        const s = new THREE.Shape();
        s.moveTo(-0.54, 0.26);
        s.lineTo(0.54, 0.26);
        s.lineTo(0.40, 0.0);
        s.lineTo(0.54, -0.26);
        s.lineTo(-0.54, -0.26);
        s.lineTo(-0.40, 0.0);
        s.closePath();
        return s;
    },
    plate() {
        return roundedRectShape(1.02, 0.52, 0.07);
    },
    shield() {
        const s = new THREE.Shape();
        s.moveTo(-0.42, 0.52);
        s.lineTo(0.42, 0.52);
        s.lineTo(0.42, -0.10);
        s.quadraticCurveTo(0.42, -0.40, 0, -0.56);
        s.quadraticCurveTo(-0.42, -0.40, -0.42, -0.10);
        s.closePath();
        return s;
    },
    star() {
        const s = new THREE.Shape();
        const spikes = 5, outer = 0.54, inner = 0.235;
        for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 ? inner : outer;
            const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
        }
        s.closePath();
        return s;
    },
};

/* ---------- 正面图案：画在 canvas 上，当贴图 ---------- */

const GLYPHS = {
    mountain: { main: ['M4 40 L28 6 L44 25 L56 13 L78 40 Z'], light: ['M28 6 L38 19 L28 22 L20 17 Z'] },
    temple: { main: ['M6 22 L41 6 L76 22 Z', 'M14 33 L41 21 L68 33 Z', 'M30 32 L52 32 L52 42 L30 42 Z'], light: [] },
    tower: { main: ['M35 4 H47 L58 41 H24 Z'], light: ['M30 24 H52 V28 H30 Z', 'M34 13 H48 V16 H34 Z'] },
    bridge: {
        main: ['M4 36 H78 V41 H4 Z', 'M18 12 H24 V40 H18 Z', 'M58 12 H64 V40 H58 Z',
               'M21 14 Q41 32 61 14 L61 19 Q41 37 21 19 Z'],
        light: [],
    },
    skyline: {
        main: ['M4 20 H18 V41 H4 Z', 'M21 8 H34 V41 H21 Z', 'M37 26 H49 V41 H37 Z',
               'M52 14 H67 V41 H52 Z', 'M70 24 H80 V41 H70 Z'],
        light: ['M25 14 H30 V19 H25 Z', 'M56 21 H61 V26 H56 Z'],
    },
    wave: { main: ['M2 28 Q16 10 30 28 T58 28 T84 28 L84 42 L2 42 Z'], light: [] },
    palm: {
        main: ['M38 41 Q41 26 46 14 L52 15 Q46 27 44 41 Z',
               'M48 13 Q68 6 80 18 Q64 12 50 19 Z',
               'M44 12 Q26 4 12 15 Q28 10 42 18 Z',
               'M46 10 Q50 -2 62 -2 Q50 4 50 13 Z'],
        light: [],
    },
};

function faceTexture({ shape, glyph, palette, label }) {
    const [accent, deep, light] = [
        palette?.[0] || '#ff2e88',
        palette?.[1] || '#241436',
        palette?.[2] || '#ffd23f',
    ];
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, S, S);

    // 下半部铺主色，像真的旅游贴纸那样上下分区
    ctx.fillStyle = accent;
    ctx.fillRect(0, S * 0.56, S, S * 0.44);

    // 图形
    const g = GLYPHS[glyph] || GLYPHS.skyline;
    const flat = shape === 'banner' || shape === 'plate';
    const scale = flat ? 2.6 : 4.0;
    ctx.save();
    ctx.translate(S / 2, S * (flat ? 0.44 : 0.44));
    ctx.scale(scale, scale);
    ctx.translate(-42, -23);
    ctx.fillStyle = deep;
    for (const d of g.main) ctx.fill(new Path2D(d));
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const d of g.light) ctx.fill(new Path2D(d));
    ctx.restore();

    // 分区线
    ctx.strokeStyle = deep;
    ctx.lineWidth = S * 0.018;
    ctx.beginPath();
    ctx.moveTo(0, S * 0.56);
    ctx.lineTo(S, S * 0.56);
    ctx.stroke();

    // 地名
    if (label) {
        const size = Math.min(S * 0.15, (S * 1.5) / Math.max(6, label.length));
        ctx.font = `${Math.round(size)}px Bangers, "Patrick Hand", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = light;
        ctx.lineWidth = size * 0.28;
        const ly = flat ? 0.52 : shape === 'shield' ? 0.72 : 0.76;
        ctx.strokeText(label, S / 2, S * ly);
        ctx.fillStyle = deep;
        ctx.fillText(label, S / 2, S * ly);
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

/* ExtrudeGeometry 的端面 UV 用的是世界坐标，得按包围盒重映射 */
function remapUV(geo) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const w = bb.max.x - bb.min.x;
    const h = bb.max.y - bb.min.y;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - bb.min.x) / w, (pos.getY(i) - bb.min.y) / h);
    }
    uv.needsUpdate = true;
}

function extrudedPart(shape, depth, material, {
    bevelSize = 0.012,
    bevelThickness = 0.008,
    bevelSegments = 3,
} = {}) {
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSize,
        bevelThickness,
        bevelOffset: 0,
        bevelSegments,
        curveSegments: 32,
    });
    geo.center();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

/**
 * 黄石大棱镜这枚不是印刷平板，而是一只真正凸起的金属夹式纪念磁贴。
 * 用一个透明 Mesh 当命中盒，下面所有可见部件都做成它的子物体；这样
 * KitchenScene 仍然可以把整枚物件当成一个磁贴做悬停、聚焦与缩放。
 */
function volumetricClip(textureLoader, texturePath) {
    const hitMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
    });
    const hitGeometry = new THREE.BoxGeometry(0.84, 0.92, 0.46);
    hitGeometry.translate(0, 0.04, 0.23);
    const root = new THREE.Mesh(hitGeometry, hitMaterial);

    const chrome = new THREE.MeshPhysicalMaterial({
        color: 0xc2b5ad,
        emissive: 0x201714,
        emissiveIntensity: 0.08,
        metalness: 0.92,
        roughness: 0.16,
        clearcoat: 0.42,
        clearcoatRoughness: 0.16,
    });
    const chromeDark = new THREE.MeshPhysicalMaterial({
        color: 0x766a64,
        emissive: 0x17110f,
        emissiveIntensity: 0.05,
        metalness: 0.88,
        roughness: 0.25,
        clearcoat: 0.25,
    });

    // 夹子的固定半边：黑色磁性垫贴门，外面是平行于门面的金属后块。
    const magnetPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.59, 0.64, 0.035),
        new THREE.MeshStandardMaterial({ color: 0x1e1b1a, roughness: 0.92 }),
    );
    magnetPad.position.set(0, -0.015, 0.021);
    magnetPad.castShadow = true;
    root.add(magnetPad);

    const back = extrudedPart(roundedRectShape(0.66, 0.72, 0.035), 0.125, chromeDark, {
        bevelSize: 0.012,
        bevelThickness: 0.009,
    });
    back.position.set(0, -0.015, 0.090);
    root.add(back);

    // 夹子的活动半边以底部铰轴为支点向外张开；圆章也随整片夹爪一起倾斜。
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.35, 0.145);
    jaw.rotation.x = 0.24;
    root.add(jaw);

    const jawPlate = extrudedPart(roundedRectShape(0.70, 0.69, 0.035), 0.060, chrome, {
        bevelSize: 0.010,
        bevelThickness: 0.008,
    });
    jawPlate.position.set(0, 0.345, 0.052);
    jaw.add(jawPlate);

    // 两侧耳片把活动夹爪扣在横向铰轴上。
    for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.245, 0.095), chromeDark);
        ear.position.set(side * 0.325, 0.11, 0.018);
        ear.castShadow = true;
        ear.receiveShadow = true;
        jaw.add(ear);
    }

    const lowerLip = extrudedPart(roundedRectShape(0.73, 0.090, 0.020), 0.075, chrome, {
        bevelSize: 0.011,
        bevelThickness: 0.008,
    });
    lowerLip.position.set(0, 0.025, 0.095);
    jaw.add(lowerLip);

    // 横向铰轴和卷簧是这一版的关键：从侧面看，前后两半之间真的留有张口。
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.74, 28), chromeDark);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, -0.35, 0.148);
    hinge.castShadow = true;
    root.add(hinge);

    const springPoints = [];
    const turns = 7;
    for (let i = 0; i <= 112; i++) {
        const u = i / 112;
        const a = u * turns * Math.PI * 2;
        springPoints.push(new THREE.Vector3(
            -0.205 + u * 0.41,
            -0.16 + Math.cos(a) * 0.045,
            0.176 + Math.sin(a) * 0.045,
        ));
    }
    const spring = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints), 112, 0.010, 7, false),
        chromeDark,
    );
    spring.castShadow = true;
    root.add(spring);

    const springPin = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.46, 18), chromeDark);
    springPin.rotation.z = Math.PI / 2;
    springPin.position.set(0, -0.16, 0.176);
    root.add(springPin);

    // 圆牌由厚底盘、两道真实圆环和最前面的图案面组成。
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.372, 0.372, 0.070, 72), chromeDark);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, 0.455, 0.112);
    disc.castShadow = true;
    disc.receiveShadow = true;
    jaw.add(disc);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.324, 0.050, 18, 72), chrome);
    outerRing.position.set(0, 0.455, 0.158);
    outerRing.castShadow = true;
    jaw.add(outerRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.278, 0.017, 14, 64), chromeDark);
    innerRing.position.set(0, 0.455, 0.181);
    innerRing.castShadow = true;
    jaw.add(innerRing);

    const medallionTexture = textureLoader.load(texturePath);
    medallionTexture.colorSpace = THREE.SRGBColorSpace;
    medallionTexture.anisotropy = 8;
    // 生成纹理的方图留有预览边；把 UV 收进圆牌的真实边界。
    const crop = 1120 / 1254;
    const inset = 67 / 1254;
    medallionTexture.repeat.set(crop, crop);
    medallionTexture.offset.set(inset, inset);

    const medallionMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: medallionTexture,
        emissive: 0xffffff,
        emissiveMap: medallionTexture,
        emissiveIntensity: 0.12,
        metalness: 0.16,
        roughness: 0.62,
    });
    const medallion = new THREE.Mesh(new THREE.CircleGeometry(0.273, 72), medallionMaterial);
    medallion.position.set(0, 0.455, 0.202);
    medallion.castShadow = true;
    medallion.receiveShadow = true;
    jaw.add(medallion);

    return root;
}

/**
 * 把每个地点做成一枚有厚度的冰箱贴，贴在门上。
 * 有真扫描件时走 alphaMap 平板路线，没有就用矢量外形挤出。
 */
export function buildMagnets(places, doorPlane, textureLoader) {
    const group = new THREE.Group();
    const meshes = [];
    const BASE = 0.115;   // 约 11cm，接近真实纪念磁贴的尺寸

    places.forEach((p) => {
        const shapeName = SHAPES[p.shape] ? p.shape : 'round';
        // 中缝那条把手不能被盖住，落在里面的往两边推
        let px = p.pos.x;
        if (doorPlane.handleGap) {
            const [g0, g1] = doorPlane.handleGap;
            if (px > g0 && px < g1) px = px - g0 < g1 - px ? g0 : g1;
        }
        // 规则素材按正视图宽高比生成薄底板；异形透明素材则走 alpha 贴片，
        // 直接使用图片自己的轮廓，避免近似几何切到实物包边。
        const magnetAspect = THREE.MathUtils.clamp(p.magnetAspect || 1, 0.35, 2.8);
        const isVolumetricClip = p.magnetShape === 'volumetric-clip';
        const isAlphaCard = p.magnet && p.magnetShape === 'alpha-card';
        if (isVolumetricClip) {
            const mesh = volumetricClip(textureLoader, p.magnet);
            const size = BASE * (p.scale || 1);
            mesh.scale.setScalar(size);

            const x = doorPlane.x0 + (px / 100) * (doorPlane.x1 - doorPlane.x0);
            const y = doorPlane.y1 - (p.pos.y / 100) * (doorPlane.y1 - doorPlane.y0);
            mesh.position.set(x, y, doorPlane.z + 0.006);
            mesh.rotation.z = THREE.MathUtils.degToRad(p.tilt || 0);

            mesh.userData.place = p;
            mesh.userData.home = mesh.position.clone();
            mesh.userData.baseScale = size;

            group.add(mesh);
            meshes.push(mesh);
            return;
        }
        const shape = p.magnet
            ? p.magnetShape === 'circle'
                ? SHAPES.round()
                : roundedRectShape(magnetAspect, 1, Math.min(0.045, magnetAspect * 0.06))
            : SHAPES[shapeName]();
        const geo = isAlphaCard
            ? new THREE.PlaneGeometry(magnetAspect, 1)
            : new THREE.ExtrudeGeometry(shape, {
                depth: 0.011,
                bevelEnabled: true,
                bevelThickness: 0.0035,
                bevelSize: 0.006,
                bevelOffset: 0,
                bevelSegments: 3,
                curveSegments: 32,
            });
        if (!isAlphaCard) {
            geo.center();
            remapUV(geo);
        }

        const accent = p.palette?.[0] || '#ff2e88';
        const front = matte(0xffffff, { roughness: p.magnet ? 0.36 : 0.42 });
        const sideColor = p.magnet
            ? new THREE.Color(p.magnetEdge || '#d8d2c3')
            : new THREE.Color(accent).multiplyScalar(0.75);
        const side = matte(sideColor, { roughness: 0.55 });

        if (p.magnet) {
            const tex = textureLoader.load(p.magnet);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            front.map = tex;
            front.transparent = true;
            front.alphaTest = isAlphaCard ? 0.025 : 0.08;
            if (isAlphaCard) front.side = THREE.DoubleSide;

            // 场景会经过低曝光与漫画色阶后期，彩色贴图容易被压暗。
            // 给单枚磁贴叠一份很弱的同色自发光，保留环境阴影但让图案不发灰。
            const brightness = THREE.MathUtils.clamp(p.magnetBrightness || 0, 0, 2);
            if (brightness > 0) {
                front.emissive.set(0xffffff);
                front.emissiveMap = tex;
                front.emissiveIntensity = brightness;
            }
        } else {
            front.map = faceTexture({
                shape: shapeName,
                glyph: p.glyph,
                palette: p.palette,
                label: (p.placeEn || p.place || '').toUpperCase(),
            });
        }

        // 异形透明 PNG 自己提供精确轮廓。它使用一张极薄的 alpha 贴片，
        // 避免近似挤出轮廓再次切到素材里的包边和黑线。
        const mesh = new THREE.Mesh(geo, isAlphaCard ? front : [front, side]);
        const size = BASE * (p.scale || 1);
        mesh.scale.setScalar(size);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const x = doorPlane.x0 + (px / 100) * (doorPlane.x1 - doorPlane.x0);
        const y = doorPlane.y1 - (p.pos.y / 100) * (doorPlane.y1 - doorPlane.y0);
        mesh.position.set(x, y, doorPlane.z + 0.006);
        mesh.rotation.z = THREE.MathUtils.degToRad(p.tilt || 0);

        mesh.userData.place = p;
        mesh.userData.home = mesh.position.clone();
        mesh.userData.baseScale = size;

        if (!isAlphaCard) inkOutline(mesh, 0.028);
        group.add(mesh);
        meshes.push(mesh);
    });

    return { group, meshes };
}
