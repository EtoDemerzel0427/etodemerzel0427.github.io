import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { matte, metal, stainless, solid, whirlpoolBadge } from './materials.js';

const rb = (w, h, d, r = 0.012, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

const cyl = (r, h, seg = 20) => new THREE.CylinderGeometry(r, r, h, seg);

/** 扁截面弓形把手：和冰箱把手使用同一种桥式轮廓。局部长度沿 Y、向 +Z 拱起。 */
function bridgeHandle({ length, bow, width, thickness, segments = 30 }) {
    const flatten = thickness / width;
    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, -length / 2, 0),
        new THREE.Vector3(0, 0, (2 * bow) / flatten),
        new THREE.Vector3(0, length / 2, 0),
    );
    const geo = new THREE.TubeGeometry(curve, segments, width / 2, 12, false);
    geo.scale(1, 1, flatten);
    return geo;
}

/**
 * 嵌入式燃气灶（30"）。原点在灶台正面地面中心，正面朝 +z。
 * 分件建模：踢脚、箱体、烤箱门框、玻璃、把手、正面控制条、旋钮、
 * 黑色灶面、四个封闭炉头和铸铁灶架。
 */
export function buildRange({ W = 0.76, D = 0.66, TOP = 0.92 } = {}) {
    const g = new THREE.Group();

    const steel = stainless(0xa9afb9, { roughness: 0.6 });
    const steelDim = stainless(0x969ca7, { roughness: 0.66 });
    const glass = matte(0x15151c, { roughness: 0.26, metalness: 0.32 });
    // 灶面下方那条是黑色烤漆弧面，很亮，不是拉丝钢
    const gloss = matte(0x0e0e13, { roughness: 0.10, metalness: 0.18 });
    const enamel = matte(0x121217, { roughness: 0.34, metalness: 0.14 });
    const castIron = matte(0x101014, { roughness: 0.78 });
    const knobMat = metal(0xc6ccd4, 0.34);   // 实物是不锈钢旋钮，不是黑的
    const frontZ = D / 2;

    /* 立面自下而上的分段 */
    const DRAWER = { y0: 0.015, y1: 0.235 };
    const DOOR = { y0: 0.245, y1: 0.745 };
    const HANDLE_Y = 0.778;
    const BOW = { y0: 0.806, y1: 0.906 };

    /* 箱体 */
    solid(box(W - 0.02, TOP - 0.02, D), steelDim, {
        position: [0, (TOP - 0.02) / 2, 0], parent: g, outline: 0.010,
    });

    /* 底部储物抽屉：整块不锈钢，比门略退后，顶边一道内凹拉手 */
    solid(rb(W - 0.006, DRAWER.y1 - DRAWER.y0, 0.045, 0.006), steelDim, {
        position: [0, (DRAWER.y0 + DRAWER.y1) / 2, frontZ + 0.018], parent: g, outline: 0.009,
    });
    solid(box(W - 0.14, 0.014, 0.02), matte(0x1e1e26, { roughness: 0.7 }), {
        position: [0, DRAWER.y1 - 0.020, frontZ + 0.032], parent: g, outline: 0, cast: false,
    });

    /* 烤箱门：厚不锈钢门框 + 黑玻璃，下沿留一条宽带放铭牌 */
    const doorH = DOOR.y1 - DOOR.y0, doorCy = (DOOR.y0 + DOOR.y1) / 2;
    const ovenPivot = new THREE.Group();
    ovenPivot.position.set(0, DOOR.y0, frontZ + 0.026);
    g.add(ovenPivot);
    solid(rb(W, doorH, 0.052, 0.008), steel, {
        position: [0, doorCy - DOOR.y0, 0], parent: ovenPivot, outline: 0.009,
    });
    const glassW = W - 0.155, glassH = doorH - 0.165;
    // 玻璃比几何中心略偏上，下面那条不锈钢才更宽——和实物一致
    const glassCy = doorCy + 0.028;
    solid(rb(glassW + 0.016, glassH + 0.016, 0.012, 0.006), matte(0x2f343c, { roughness: 0.4, metalness: 0.5 }), {
        position: [0, glassCy - DOOR.y0, 0.024], parent: ovenPivot, outline: 0.005, cast: false,
    });
    solid(rb(glassW, glassH, 0.014, 0.005), glass, {
        position: [0, glassCy - DOOR.y0, 0.028], parent: ovenPivot, outline: 0.004, cast: false,
    });
    // 铭牌
    solid(box(0.115, 0.018, 0.003), matte(0xdfe3e9, { roughness: 0.35, metalness: 0.4 }), {
        position: [0, 0.042, 0.029], parent: ovenPivot, outline: 0, cast: false,
    });

    // 开门后可见的搪瓷内胆、后壁和两层烤架。
    solid(rb(W - 0.075, doorH - 0.055, 0.018, 0.008), enamel, {
        position: [0, doorCy, frontZ + 0.004], parent: g, outline: 0.006,
    });
    for (const sy of [doorCy - 0.105, doorCy + 0.085]) {
        for (let i = -3; i <= 3; i++) {
            solid(cyl(0.0035, W - 0.14, 8), steelDim, {
                position: [0, sy, frontZ + 0.016 + i * 0.003], rotation: [0, 0, Math.PI / 2],
                parent: g, outline: 0, cast: false,
            });
        }
    }
    // 门背内衬与观察窗内层，翻平后朝上。
    solid(rb(W - 0.045, doorH - 0.045, 0.012, 0.007), enamel, {
        position: [0, doorCy - DOOR.y0, -0.033], parent: ovenPivot, outline: 0.005,
    });
    solid(rb(glassW, glassH, 0.006, 0.005), glass, {
        position: [0, glassCy - DOOR.y0, -0.041], parent: ovenPivot, outline: 0.003, cast: false,
    });

    /* 把手：扁平不锈钢宽条，不是圆管 */
    const ovenHandle = solid(rb(W - 0.02, 0.048, 0.062, 0.008), steel, {
        position: [0, HANDLE_Y - DOOR.y0, 0.026], parent: ovenPivot, outline: 0.008,
    });
    solid(box(W - 0.06, 0.010, 0.02), matte(0x1a1a22, { roughness: 0.7 }), {
        position: [0, HANDLE_Y - DOOR.y0 - 0.026, 0.036], parent: ovenPivot, outline: 0, cast: false,
    });

    /* 灶面下方的黑色光泽弧面 */
    solid(rb(W, BOW.y1 - BOW.y0, 0.105, 0.048, 5), gloss, {
        position: [0, (BOW.y0 + BOW.y1) / 2, frontZ + 0.010], parent: g, outline: 0.008,
    });

    /* 黑色灶面：略宽于箱体，压在两侧台面上 */
    solid(rb(W + 0.04, 0.028, D + 0.02, 0.005), enamel, {
        position: [0, TOP - 0.014, 0], parent: g, outline: 0.007,
    });

    /* 控制区在灶面前缘：左二右三共五个旋钮，中间一块显示屏 */
    const ctrlZ = frontZ - 0.042;
    solid(box(W - 0.05, 0.006, 0.10), matte(0x1b1b22, { roughness: 0.45, metalness: 0.2 }), {
        position: [0, TOP + 0.003, ctrlZ], parent: g, outline: 0, cast: false,
    });
    const disp = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.024),
        new THREE.MeshBasicMaterial({ color: 0x6fe4ff, toneMapped: false }),
    );
    disp.rotation.x = -Math.PI / 2;
    disp.position.set(-0.03, TOP + 0.007, ctrlZ);
    g.add(disp);
    // 四个旋钮，从左到右依次对应左后、左前、右前、右后炉头
    const knobs = [];
    const KNOB_X = [-0.30, -0.205, 0.205, 0.30];
    KNOB_X.forEach((dx, i) => {
        // 旋钮本体做成 Group，开火时整体绕自身轴转。
        //
        // 形状：扁圆盘 + 顶面一道楔形立筋。那道筋既是握把也是指针，
        // 从盘心往外越来越高、末端最宽。不是带防滑纹的圆柱。
        const knob = new THREE.Group();
        knob.position.set(dx, TOP + 0.007, ctrlZ);
        knob.rotation.x = 0.22;

        // 底座：下宽上窄的锥台，顶面往边缘缓缓下坡（不是平的圆盘）
        // 底部有一段实打实的竖直裙边（约 11mm），再往上才开始收成穹顶。
        // 之前竖直段只有 3mm，看着像一片没有厚度的圆盘。
        const discProfile = [
            new THREE.Vector2(0.0001, 0.0000),
            new THREE.Vector2(0.0244, 0.0000),
            new THREE.Vector2(0.0252, 0.0024),
            new THREE.Vector2(0.0252, 0.0118),   // 竖直裙边
            new THREE.Vector2(0.0243, 0.0145),
            new THREE.Vector2(0.0207, 0.0176),
            new THREE.Vector2(0.0108, 0.0195),
            new THREE.Vector2(0.0000, 0.0199),
        ];
        const body = solid(new THREE.LatheGeometry(discProfile, 36), knobMat, {
            parent: knob, outline: 0.004,
        });

        // 握把是一根横贯直径的凸起筋条：等高、两端圆角、侧面竖直。
        // 转到哪儿，筋条指向哪儿，它本身就是指针。
        solid(rb(0.0108, 0.0180, 0.0462, 0.0034, 4), knobMat, {
            position: [0, 0.0244, 0], parent: knob, outline: 0.004,
        });

        // 筋条侧面靠指针端的一道细凹槽
        solid(box(0.0016, 0.0092, 0.0038), matte(0x1a1a20, { roughness: 0.45 }), {
            position: [0.0053, 0.0238, 0.0132], parent: knob, outline: 0, cast: false,
        });

        g.add(knob);

        body.userData.knob = { group: knob, index: i };
        knobs.push(body);
    });

    /* 铸铁灶架：左右两大块连体格栅 */
    function grate(cx, cz, gw, gd) {
        const bar = 0.014, lift = TOP + 0.028;
        for (const [ox, oz, bw, bd] of [
            [0, -gd / 2, gw, bar], [0, gd / 2, gw, bar],
            [-gw / 2, 0, bar, gd], [gw / 2, 0, bar, gd],
        ]) {
            solid(box(bw, 0.014, bd), castIron, {
                position: [cx + ox, lift, cz + oz], parent: g, outline: 0.004, cast: false,
            });
        }
        for (let i = 1; i <= 3; i++) {
            solid(box(bar, 0.014, gd), castIron, {
                position: [cx - gw / 2 + (gw / 4) * i, lift, cz], parent: g, outline: 0.004, cast: false,
            });
        }
        for (let i = 1; i <= 2; i++) {
            solid(box(gw, 0.014, bar), castIron, {
                position: [cx, lift, cz - gd / 2 + (gd / 3) * i], parent: g, outline: 0.004, cast: false,
            });
        }
        for (const sx of [-gw / 2 + 0.02, gw / 2 - 0.02]) {
            for (const sz of [-gd / 2 + 0.02, gd / 2 - 0.02]) {
                solid(box(0.016, 0.026, 0.016), castIron, {
                    position: [cx + sx, TOP + 0.008, cz + sz], parent: g, outline: 0, cast: false,
                });
            }
        }
    }
    /* 灶架和炉头整体往前挪、并且加深。

       之前灶架只有 0.36 深、中心在 -0.06，前沿落在 +0.12，而旋钮条的后缘在
       +0.258 —— 中间空出 0.138 一条什么都没有的黑灶面，整个「灶」看着就像被
       推到墙那头去了。后面反而只剩 0.12。实物是反的：灶架前沿基本顶到旋钮条，
       后面才留一指宽。

       现在灶架 0.48 深、中心 -0.015 → 前沿 +0.225（离旋钮条 0.033）、
       后沿 -0.255（离灶面后缘 0.095）。炉头前后间距也从 0.19 放到 0.25，
       接近 30" 灶的真实尺寸。 */
    const grateZ = -0.015, GRATE_D = 0.48, BURNER_DZ = 0.125;
    grate(-W / 4 + 0.01, grateZ, W / 2 - 0.05, GRATE_D);
    grate(W / 4 - 0.01, grateZ, W / 2 - 0.05, GRATE_D);

    // 炉头顺序和旋钮一致：左后、左前、右前、右后
    const BURNERS = [
        [-0.185, grateZ - BURNER_DZ], [-0.185, grateZ + BURNER_DZ],
        [0.185, grateZ + BURNER_DZ], [0.185, grateZ - BURNER_DZ],
    ];
    const burners = BURNERS.map(([bx, bz]) => {
        solid(cyl(0.048, 0.012, 16), matte(0x1a1a20, { roughness: 0.55 }), {
            position: [bx, TOP + 0.004, bz], parent: g, outline: 0, cast: false,
        });
        solid(cyl(0.034, 0.014, 14), matte(0x0c0c10, { roughness: 0.45, metalness: 0.3 }), {
            position: [bx, TOP + 0.014, bz], parent: g, outline: 0, cast: false,
        });
        const flame = makeFlame(0.036);   // 贴着炉头盖外缘
        flame.position.set(bx, TOP + 0.020, bz);
        g.add(flame);

        const light = new THREE.PointLight(0x4f8fd8, 0, 0.42, 2);
        light.position.set(bx, TOP + 0.06, bz);
        g.add(light);

        // pos 交出去给 room.js 摆锅用 —— 锅的位置必须由炉头算，不能各写一套
        return { flame, light, pos: [bx, bz] };
    });

    // 灶架横条上沿：锅就坐在这个高度上（grate() 里 lift = TOP + 0.028、条厚 0.014）
    const grateTop = TOP + 0.035;

    return {
        group: g, top: TOP, width: W, depth: D, knobs, burners, grateTop,
        door: { kind: 'oven-door', node: ovenPivot, pick: [ovenHandle], axis: 'x', spin: 1, swing: 1.42 },
    };
}

/** 燃气火焰。
 *
 *  真实燃气灶是炉头盖一圈几十个火孔，每孔一簇小火苗：根部亮蓝、中段深蓝、
 *  尖端微橙。之前只摆了 16 个独立 Mesh 靠改 scale 抖动，既不够密、
 *  又要 16×4=64 次 draw call。
 *
 *  这里把一圈火苗合并成一个 BufferGeometry，跳动交给顶点着色器按
 *  每孔的相位算 —— 一个炉头一次 draw call，孔数可以随便加。
 */
function makeFlame(radius) {
    const PORTS = 56;
    const H = 0.029;          // 内焰高度：实物只有两三厘米，之前做成 6cm 全是尖刺
    const W = 0.0044;         // 根部半宽。要略大于孔距，火苗才连成一圈冠

    const pos = [];
    const aPhase = [];
    const aUp = [];

    for (let i = 0; i < PORTS; i++) {
        const a = (i / PORTS) * Math.PI * 2;
        const cx = Math.cos(a) * radius;
        const cz = Math.sin(a) * radius;
        // 每孔一个四面小锥体：尖端略微向外倾，像真实火苗那样张开
        const tipX = Math.cos(a) * (radius - 0.0035);
        const tipZ = Math.sin(a) * (radius - 0.0035);
        const phase = (i * 2.39996) % (Math.PI * 2);   // 黄金角，相邻孔不同步

        const base = [
            [cx - W, 0, cz - W], [cx + W, 0, cz - W],
            [cx + W, 0, cz + W], [cx - W, 0, cz + W],
        ];
        const tip = [tipX, H, tipZ];

        for (let k = 0; k < 4; k++) {
            const p0 = base[k];
            const p1 = base[(k + 1) % 4];
            pos.push(...p0, ...p1, ...tip);
            aUp.push(0, 0, 1);
            aPhase.push(phase, phase, phase);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(aPhase, 1));
    geo.setAttribute('aUp', new THREE.Float32BufferAttribute(aUp, 1));

    const uniforms = { uTime: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */`
            uniform float uTime;
            attribute float aPhase;
            attribute float aUp;
            varying float vUp;
            void main() {
                // 两个不同频率叠加，跳动才不规律
                float k = 0.66
                        + 0.28 * sin(uTime * 9.0  + aPhase)
                        + 0.11 * sin(uTime * 23.0 + aPhase * 1.7);
                vec3 p = position;
                p.y *= k;
                vUp = aUp * k;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            varying float vUp;
            void main() {
                vec3 root = vec3(0.26, 0.50, 0.92);   // 根部亮蓝
                vec3 body = vec3(0.05, 0.20, 0.78);   // 中段深蓝
                vec3 tip  = vec3(0.80, 0.44, 0.14);   // 尖端微橙
                vec3 c = mix(root, body, smoothstep(0.05, 0.55, vUp));
                c = mix(c, tip, smoothstep(0.68, 1.05, vUp));
                float a = (1.0 - smoothstep(0.5, 1.05, vUp)) * 0.78;
                gl_FragColor = vec4(c, a);
            }
        `,
    });

    const g = new THREE.Group();
    g.userData.ghost = true;        // 火焰不参与拾取，射线要能穿过去
    g.add(new THREE.Mesh(geo, mat));

    // 炉头盖上的一圈辉光，把火焰和灶面连起来
    const glow = new THREE.Mesh(
        new THREE.RingGeometry(radius * 0.62, radius * 1.12, 36),
        new THREE.MeshBasicMaterial({
            color: 0x5f92d8, transparent: true, opacity: 0.22,
            blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.003;
    g.add(glow);

    g.userData.uniforms = uniforms;
    g.visible = false;
    return g;
}

/**
 * 抽油烟微波炉（OTR）。原点在正面底边中心，正面朝 +z。
 * 左侧是带黑玻璃观察窗的门，右侧是控制面板，底部有排风格栅和照明灯。
 */
export function buildMicrowave({ W = 0.76, H = 0.43, D = 0.40 } = {}) {
    const g = new THREE.Group();

    const steel = stainless(0xc4cad2, { roughness: 0.62 });
    const glass = matte(0x181820, { roughness: 0.3, metalness: 0.32 });
    const enamel = matte(0x35373c, { roughness: 0.72 });
    const cavityMat = matte(0x70737a, { roughness: 0.68, metalness: 0.14 });
    const frontZ = D;

    /* 外壳留出真实开口；顶、底、背与两侧围成箱体。 */
    const shell = stainless(0xb6bdc6, { roughness: 0.68 });
    const T = 0.025;
    solid(rb(W, T, D, 0.005), shell, {
        position: [0, H - T / 2, D / 2], parent: g, outline: 0.008,
    });
    solid(rb(W, T, D, 0.005), shell, {
        position: [0, T / 2, D / 2], parent: g, outline: 0.008,
    });
    solid(rb(T, H - 2 * T, D, 0.005), shell, {
        position: [-W / 2 + T / 2, H / 2, D / 2], parent: g, outline: 0.008,
    });
    solid(rb(T, H - 2 * T, D, 0.005), shell, {
        position: [W / 2 - T / 2, H / 2, D / 2], parent: g, outline: 0.008,
    });
    solid(box(W - 2 * T, H - 2 * T, T), shell, {
        position: [0, H / 2, T / 2], parent: g, outline: 0.006,
    });

    /* 门 */
    const doorW = W * 0.775;
    const doorCx = -W / 2 + doorW / 2 + 0.004;
    const hingeX = -W / 2 + 0.006;
    const doorPivot = new THREE.Group();
    doorPivot.position.set(hingeX, 0, frontZ + 0.006);
    g.add(doorPivot);
    const doorRelX = doorCx - hingeX;
    solid(rb(doorW, H - 0.028, 0.032, 0.008), steel, {
        position: [doorRelX, H / 2, 0.014], parent: doorPivot, outline: 0.008,
    });
    solid(rb(doorW - 0.10, H - 0.13, 0.014, 0.005), matte(0x1b1b23, { roughness: 0.55 }), {
        position: [doorRelX - 0.012, H / 2, 0.031], parent: doorPivot, outline: 0.005, cast: false,
    });
    solid(rb(doorW - 0.125, H - 0.155, 0.012, 0.004), glass, {
        position: [doorRelX - 0.012, H / 2, 0.034], parent: doorPivot, outline: 0.004, cast: false,
    });
    // 门背板和观察窗内层，打开时不露出正面钢壳的背面。
    solid(rb(doorW - 0.045, H - 0.070, 0.014, 0.006), enamel, {
        position: [doorRelX, H / 2, -0.013], parent: doorPivot, outline: 0.004,
    });
    solid(rb(doorW - 0.130, H - 0.160, 0.007, 0.004), glass, {
        position: [doorRelX - 0.012, H / 2, -0.022], parent: doorPivot, outline: 0.003, cast: false,
    });
    // 门把手：和冰箱一样的扁截面弓形桥，不是笔直圆柱。
    const hx = doorCx + doorW / 2 - 0.028;
    const handle = solid(bridgeHandle({
        length: H - 0.125, bow: 0.042, width: 0.034, thickness: 0.011,
    }), metal(0xd4dae2, 0.3), {
        position: [hx - hingeX, H / 2, 0.042], parent: doorPivot, outline: 0.005,
    });

    /* 搪瓷内胆：开门后有顶/底/侧壁、后壁与玻璃转盘，而不是一张黑贴片。 */
    const innerX0 = -W / 2 + 0.040;
    const innerX1 = -W / 2 + doorW - 0.026;
    const innerW = innerX1 - innerX0;
    const innerCx = (innerX0 + innerX1) / 2;
    const innerY0 = 0.048, innerY1 = H - 0.048;
    const innerD = D - 0.070;
    solid(box(innerW, innerY1 - innerY0, 0.018), cavityMat, {
        position: [innerCx, (innerY0 + innerY1) / 2, 0.045], parent: g, outline: 0.004,
    });
    for (const sx of [innerX0, innerX1]) {
        solid(box(0.020, innerY1 - innerY0, innerD), cavityMat, {
            position: [sx, (innerY0 + innerY1) / 2, 0.045 + innerD / 2], parent: g, outline: 0.004,
        });
    }
    solid(box(innerW, 0.020, innerD), cavityMat, {
        position: [innerCx, innerY0, 0.045 + innerD / 2], parent: g, outline: 0.004,
    });
    solid(box(innerW, 0.020, innerD), cavityMat, {
        position: [innerCx, innerY1, 0.045 + innerD / 2], parent: g, outline: 0.004,
    });
    const turntable = solid(cyl(Math.min(innerW * 0.40, 0.18), 0.010, 40), matte(0xc7d6d9, {
        roughness: 0.16, transparent: true, opacity: 0.52,
    }), {
        position: [innerCx, innerY0 + 0.017, 0.045 + innerD * 0.52], parent: g, outline: 0.004, cast: false,
    });
    turntable.receiveShadow = true;
    // 右上角暖色内灯，门打开时提供结构层次（不额外加动态光，避免溢出橱柜）。
    solid(box(0.055, 0.040, 0.004), matte(0xffedc0, {
        roughness: 0.55, emissive: 0xffd995, emissiveIntensity: 0.65,
    }), {
        position: [innerX1 - 0.040, innerY1 - 0.045, 0.058], parent: g, outline: 0.002, cast: false,
    });

    /* 控制面板 */
    const panW = W * 0.195;
    const panCx = W / 2 - panW / 2 - 0.008;
    solid(rb(panW, H - 0.032, 0.026, 0.006), matte(0x22222a, { roughness: 0.5 }), {
        position: [panCx, H / 2, frontZ + 0.012], parent: g, outline: 0.007,
    });
    const disp = new THREE.Mesh(
        new THREE.PlaneGeometry(panW - 0.035, 0.026),
        new THREE.MeshBasicMaterial({ color: 0x7fe9ff, toneMapped: false }),
    );
    disp.position.set(panCx, H - 0.09, frontZ + 0.026);
    g.add(disp);
    // 按键阵列
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
            solid(box(0.021, 0.016, 0.006), matte(0x33333d, { roughness: 0.6 }), {
                position: [panCx - 0.029 + c * 0.029, H - 0.155 - r * 0.036, frontZ + 0.026],
                parent: g, outline: 0, cast: false,
            });
        }
    }

  // The real unit carries a very small Whirlpool mark on the stainless
  // fascia above the window. Keep it on the door so it follows the hinge.
  const logo = whirlpoolBadge(0.052);
  logo.position.set(doorRelX - 0.012, H - 0.040, 0.038);
  doorPivot.add(logo);

    /* 底部排风格栅 + 照明灯 */
    for (let i = 0; i < 9; i++) {
        solid(box(0.045, 0.008, 0.012), matte(0x2a2a33, { roughness: 0.7 }), {
            position: [-W / 2 + 0.07 + i * 0.077, 0.012, frontZ - 0.02],
            parent: g, outline: 0, cast: false,
        });
    }
    const lamp = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 0.5, 0.10),
        new THREE.MeshBasicMaterial({ color: 0xfff3d4, toneMapped: false, opacity: 0.75, transparent: true }),
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0, 0.002, D * 0.55);
    g.add(lamp);

    /* 顶部前缘的进风格栅 */
    for (let i = 0; i < 11; i++) {
        solid(box(0.038, 0.010, 0.010), matte(0x9aa1aa, { roughness: 0.6 }), {
            position: [-W / 2 + 0.06 + i * 0.065, H - 0.022, frontZ + 0.004],
            parent: g, outline: 0, cast: false,
        });
    }

    return {
        group: g,
        door: { kind: 'microwave-door', node: doorPivot, pick: [handle], spin: -1, swing: 1.62 },
    };
}
