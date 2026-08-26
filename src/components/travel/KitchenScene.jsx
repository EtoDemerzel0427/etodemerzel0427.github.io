import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './overlay.css';

/* 机位表。四个位置都在同一个局部坐标系里（见 kitchen/living.js 顶部的换算说明）。
   厨房那个是原来的构图 —— 换算过去正好是「坐在沙发前沿越过吧台看冰箱」。 */
const VIEWS = [
    { id: 'fridge', label: '厨房',  fov: 34, fovNarrow: 38,
      pos: [2.02, 1.55, 2.55],  target: [0.05, 1.08, -1.32] },
    { id: 'living', label: '客厅',  fov: 44, fovNarrow: 52,
      pos: [-0.15, 1.86, 0.35], target: [2.35, 0.82, 2.85] },
    { id: 'desk',   label: '窗边',  fov: 44, fovNarrow: 52,
      pos: [-0.20, 1.80, 1.20], target: [3.40, 1.02, 1.15] },
    { id: 'media',  label: '影音角', fov: 48, fovNarrow: 56,
      pos: [2.80, 1.46, 1.62],  target: [0.95, 1.28, 4.25] },
];
const VIEW_BY_ID = Object.fromEntries(VIEWS.map((v) => [v.id, v]));
/* 钢琴的声源摆在琴身中心（living.js buildPiano：X 3.75 / CZ -0.05 / 键床 0.73） */
const PIANO_AT = [3.75, 0.78, -0.05];
/* 走开之后用的视场角：比预设略广一点，自己走的时候看得舒服些 */
const FREE_FOV = 46, FREE_FOV_NARROW = 54;
const HOME_POS = VIEWS[0].pos;
const HOME_TARGET = VIEWS[0].target;

function Stars({ value = 0 }) {
    // 半星字符在很多字体里是缺字，直接补一个数字更稳
    const full = Math.round(value);
    return (
        <span className="fv-stars" aria-label={`评分 ${value} / 5`}>
            {'★'.repeat(full)}{'☆'.repeat(5 - full)}
            {value % 1 ? <span className="fv-stars__num"> {value}</span> : null}
        </span>
    );
}

function magnetMeta(item) {
    if (item.kind === 'gift') return `${item.country} · 朋友赠送 · 未到访`;
    if (item.kind === 'fandom') return '收藏 · 非旅行地点';
    return item.country;
}

/** @param {{ places?: Array<Record<string, any>> }} props */
export default function KitchenScene({ places = [] }) {
    const canvasRef = useRef(null);
    const worldRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [activeSlug, setActiveSlug] = useState(null);
    const [hover, setHover] = useState(null);   // { slug, place, x, y }
    const [listView, setListView] = useState(false);
    const [view, setView] = useState('fridge');
    /* 触屏没键盘，操作提示别写 WASD */
    const [coarse] = useState(() => (
        typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
    ));

    const active = useMemo(
        () => places.find((p) => p.slug === activeSlug) || null,
        [places, activeSlug],
    );

    /* 选中状态和当前机位都要给渲染循环读，用 ref 免得重建场景 */
    const activeRef = useRef(null);
    useEffect(() => { activeRef.current = activeSlug; }, [activeSlug]);
    const viewRef = useRef('fridge');
    useEffect(() => { viewRef.current = view; }, [view]);
    /* 列表页盖在上面的时候，键盘和滚轮别把身后的人挪走 */
    const uiRef = useRef(false);
    useEffect(() => { uiRef.current = listView; }, [listView]);
    /* 关掉冰箱贴详情，但不像 onSelect 那样顺手把机位收回厨房 */
    const clearActiveRef = useRef(null);
    clearActiveRef.current = () => setActiveSlug(null);

    const onSelect = useCallback((slug) => {
        setActiveSlug((cur) => (cur === slug ? null : slug));
        setView('fridge');          // 冰箱贴在厨房那头，先把机位收回去
    }, []);

    useEffect(() => {
        let disposed = false;
        let cleanup = () => {};

        (async () => {
            try {
                const THREE = await import('three');
                const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
                const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
                const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
                const { OutputPass } = await import('three/examples/jsm/postprocessing/OutputPass.js');
                const { SMAAPass } = await import('three/examples/jsm/postprocessing/SMAAPass.js');
                const { makeComicPass } = await import('./kitchen/ComicPass.js');
                const { buildRoom, buildLights } = await import('./kitchen/room.js');
                const { buildLiving, buildLivingLights } = await import('./kitchen/living.js');
                const { findPath, snapToWalkable, slide, walkable } = await import('./kitchen/nav.js');
                const audio = await import('./kitchen/audio.js');
                const { buildFridge } = await import('./kitchen/fridge.js');
                const { buildMagnets } = await import('./kitchen/magnets.js');

                // 贴图上的地名要用 Bangers 画，先等字体
                if (document.fonts?.ready) {
                    try { await document.fonts.load('64px Bangers'); } catch { /* 字体没到就用回退 */ }
                    await document.fonts.ready;
                }
                if (disposed) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                renderer.setPixelRatio(dpr);
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 0.64;

                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0x1a1030);

                const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
                camera.position.set(...HOME_POS);

                // 环境反射：中性渐变，不用 RoomEnvironment（那个是彩色摄影棚，
                // 反射到不锈钢上会变成粉蓝色斑）
                const { neutralEnvTexture } = await import('./kitchen/materials.js');
                const pmrem = new THREE.PMREMGenerator(renderer);
                const envRT = pmrem.fromEquirectangular(neutralEnvTexture());
                scene.environment = envRT.texture;
                scene.environmentIntensity = 0.5;

                const { group: room, range, floor } = buildRoom();
                scene.add(room);

                /* 灶台开火：点旋钮点火，再点熄火 */
                const knobAngle = range.knobs.map(() => 0);
                function toggleBurner(i) {
                    const b = range.burners[i];
                    const on = !b.flame.visible;
                    b.flame.visible = on;
                    b.light.intensity = on ? 0.018 : 0;
                    knobAngle[i] = on ? -Math.PI * 0.55 : 0;
                }
                buildLights(scene);

                // 客厅：和厨房同一个局部坐标系，往 +Z / +X 长出去
                const { group: living } = buildLiving();
                scene.add(living);
                const livingLights = buildLivingLights(scene);

                /* 三盏落地灯都能开关：点灯罩就行。
                   灯具（living.userData.lamps）和光源（buildLivingLights 的返回值）
                   是两处建的，这里按名字配对起来 —— 一盏灯 = 一个罩 + 一圈罩口亮片
                   + 一个光源，三样要一起灭，只灭光源的话罩子还亮着，很出戏。 */
                const lampDefs = living.userData.lamps || {};
                const lamps = [
                    ['arc', livingLights.arc],
                    ['floor', livingLights.floorLamp],
                    ['desk', livingLights.desk],
                ].map(([name, light]) => {
                    const d = lampDefs[name];
                    if (!d || !light) return null;
                    return {
                        pick: d.pick,
                        light,
                        baseIntensity: light.intensity,
                        shade: d.shade,
                        baseShade: d.shade ? d.shade.emissiveIntensity : 0,
                        glow: d.glow,
                        baseGlow: d.glow ? d.glow.emissiveIntensity : 0,
                        on: true,
                    };
                }).filter(Boolean);
                const lampOf = (o) => lamps.find((l) => l.pick.includes(o)) || null;
                function toggleLamp(l) {
                    l.on = !l.on;
                    l.light.intensity = l.on ? l.baseIntensity : 0;
                    if (l.shade) l.shade.emissiveIntensity = l.on ? l.baseShade : 0;
                    if (l.glow) l.glow.emissiveIntensity = l.on ? l.baseGlow : 0;
                }

                /* 水龙头：上半截能转，手柄能开关水。
                   两件事分开 —— 实物上转的只有接缝以上那根柱子，
                   装手柄的粗柱是拧死在台面上的，所以手柄永远正对水槽。 */
                const faucet = living.userData.faucet;
                let swivelIdx = 2, swivelDir = 1;   // 从「正对水槽」那一档起
                let waterOn = false;
                faucet.spout.rotation.y = faucet.SWIVEL_STOPS[swivelIdx];
                faucet.lever.rotation.x = faucet.LEVER_OFF;
                const faucetTmp = new THREE.Vector3();
                /** 点一下转一格；转到头就掉头，反复点是来回扫，不用绕一圈 */
                function swivelSpout() {
                    const next = swivelIdx + swivelDir;
                    if (next < 0 || next >= faucet.SWIVEL_STOPS.length) swivelDir = -swivelDir;
                    swivelIdx += swivelDir;
                }

                /* 钢琴：点一个键，响一声 + 键往下沉。
                   living.js 早就把 88 个键连 midi 一起挂出来了，这里只管接。 */
                const pianoKeys = living.userData.pianoKeys || [];
                const power = living.userData.pianoPower;
                const pressed = new Map();      // key mesh -> 松手的时刻
                let pianoOn = false;            // 电钢琴，开机才响
                function hitKey(mesh) {
                    const d = mesh.userData;
                    if (!d || d.midi === undefined) return;
                    // 键是机械的，没通电也压得下去；只是不出声
                    pressed.set(mesh, performance.now() + 110);
                    if (!pianoOn) return;
                    // 力度给一点随机，不至于每下都一模一样
                    audio.playPianoNote(d.midi, 0.72 + Math.random() * 0.2, PIANO_AT);
                }
                function togglePiano() {
                    pianoOn = !pianoOn;
                    // 开电源那一下顺带把采样拉下来：关着的琴不用先下 700KB
                    if (pianoOn) audio.preloadPiano();
                }

                /* 唱机：掀盖 / 上唱片放音。角度和转速都在 living.js 里解好了。 */
                const tt = living.userData.turntable;
                let lidOpen = false, spinning = false;
                let lidAngle = 0, armAngle = tt.ARM_REST, armLift = 0, armTrack = 0;
                function toggleLid() { lidOpen = !lidOpen; }
                function togglePlay() {
                    spinning = !spinning;
                    if (spinning) {
                        lidOpen = true;              // 放唱片总得先掀盖
                        armTrack = 0;
                        tt.lp.visible = true;
                        audio.startRecord(tt.speakers);
                    } else {
                        audio.stopRecord();
                    }
                }

                const { group: fridge, doorPlane } = buildFridge();
                // 嵌在柜龛里，所以正对前方；三维感靠机位角度，不靠转冰箱
                fridge.position.set(-0.14, 0, -1.53);
                scene.add(fridge);

                const textureLoader = new THREE.TextureLoader();
                const { group: magnetGroup, meshes: magnets } = buildMagnets(places, doorPlane, textureLoader);
                fridge.add(magnetGroup);

                /* ---------- 后期 ---------- */
                const composer = new EffectComposer(renderer);
                composer.setPixelRatio(dpr);
                composer.addPass(new RenderPass(scene, camera));

                const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.5, 0.95);
                composer.addPass(bloom);
                composer.addPass(new SMAAPass());
                composer.addPass(new OutputPass());

                const comic = makeComicPass(1, 1, dpr);
                composer.addPass(comic);

                /* ---------- 相机：预设机位 + 自由走动 ----------
                   位置和朝向拆开存：位置可以「走」（带碰撞），朝向永远是
                   拖拽给的 yaw/pitch。预设机位只是一次「位置 + 朝向」的赋值。 */
                const EYE = 1.56;                       // 站着的视高
                const ndc = new THREE.Vector2(-10, -10);
                const raycaster = new THREE.Raycaster();
                const tmpV = new THREE.Vector3();
                const tmpQ = new THREE.Quaternion();

                const camPos = new THREE.Vector3(...HOME_POS);
                const aim = { yaw: 0, pitch: 0 };       // 当前朝向
                const want = { yaw: 0, pitch: 0 };      // 目标朝向
                const snapTo = camPos.clone();          // 预设/聚焦时直接插值过去的位置
                let snapping = true;                    // true = 不做碰撞，直接飞
                let walkPath = null, pathIdx = 0;       // 点地面之后算出来的一串拐点
                let viewFov = VIEWS[0].fov, viewFovNarrow = VIEWS[0].fovNarrow;

                /* 转视角的两个手感常量。俯仰留一点余量就够了：
                   这间屋子该看的东西都在水平线上下不远处。 */
                const TURN_PER_PX = 0.0062;         // 拖拽：每像素转多少弧度
                const TURN_PER_SEC = 2.05;          // 键盘：每秒转多少弧度（≈118°）
                const clampPitch = (v) => Math.max(-0.62, Math.min(0.42, v));

                const wrapPi = (d) => Math.atan2(Math.sin(d), Math.cos(d));
                const aimAt = (from, tx, ty, tz) => {
                    const dx = tx - from.x, dy = ty - from.y, dz = tz - from.z;
                    return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
                };
                /** 转到某个朝向。yaw 走最短弧，不然切机位时镜头会绕一大圈。 */
                const faceTo = (y, p) => {
                    want.yaw = aim.yaw + wrapPi(y - aim.yaw);
                    want.pitch = p;
                };
                {
                    const a0 = aimAt(camPos, ...HOME_TARGET);
                    aim.yaw = want.yaw = a0.yaw;
                    aim.pitch = want.pitch = a0.pitch;
                }

                /* 地面光标：鼠标指到哪、哪儿能站，先画出来再让人点 */
                const marker = new THREE.Mesh(
                    new THREE.RingGeometry(0.15, 0.215, 32),
                    new THREE.MeshBasicMaterial({ color: 0xffd9a2, transparent: true, opacity: 0.9 }),
                );
                marker.rotation.x = -Math.PI / 2;
                marker.visible = false;
                marker.renderOrder = 2;
                marker.userData.ghost = true;      // 光标自己不能挡住射线
                scene.add(marker);

                let lastView = 'fridge';
                let wasFocused = false;
                const beforeFocus = camPos.clone();
                const beforeAim = { yaw: 0, pitch: 0 };   // 位置和朝向都要存，不然退出聚焦会站对地方看错方向
                const tmpV2 = new THREE.Vector3();


                function resize() {
                    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
                    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
                    if (!w || !h) return;
                    renderer.setSize(w, h, false);
                    composer.setSize(w, h);
                    bloom.setSize(w, h);
                    comic.uniforms.uResolution.value.set(w, h);
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();   // fov 每帧按当前机位设，见下面 frame()
                }
                resize();
                window.addEventListener('resize', resize);
                // 视口变化不总会触发 window resize（面板拖拽、旋转屏），盯住画布本身更可靠
                const ro = new ResizeObserver(resize);
                ro.observe(canvas);

                let hovered = null;
                /* 上一帧的拾取结果 + 当时的鼠标/镜头状态，没动就不重算 */
                const lastProbe = {
                    nx: NaN, ny: NaN, cx: NaN, cz: NaN, yaw: NaN, pitch: NaN,
                    active: null, hover: null, spot: null, aimPoint: null,
                };

                function toNdc(e, out) {
                    const r = canvas.getBoundingClientRect();
                    out.set(
                        ((e.clientX - r.left) / r.width) * 2 - 1,
                        -(((e.clientY - r.top) / r.height) * 2 - 1),
                    );
                    return out;
                }
                /* ---------- 拾取 ----------
                   一条射线打进**真实几何**里，第一件撞到的东西决定这一下是什么：

                     可交互件（冰箱贴 / 旋钮 / 龙头）→ 交互
                     地面                            → 走过去
                     别的实体（冰箱门、沙发、墙）    → 走到它跟前，转身看它

                   之前地面是拿一个无限大的 y=0 平面代替的：点冰箱门，射线从门里
                   穿出去落在屋外好几米，再被吸附回最近的可站点 —— 于是「点冰箱」
                   变成「走到客厅另一头」。现在射线撞到门就停在门上。 */

                /** 只发光、不挡视线的东西（火焰、水流、辉光）不参与拾取。
                 *  判据：写颜色但不写深度。命中盒是 colorWrite:false，不会被误伤。 */
                const isGhostMaterial = (m) => (Array.isArray(m) ? m : [m])
                    .some((x) => x && x.depthWrite === false && x.colorWrite !== false);

                const solids = [];
                scene.traverse((o) => {
                    // traverse 是先序，父节点先标记，子节点跟着继承
                    if (o.userData.ghost || o.parent?.userData?.__ghost) { o.userData.__ghost = true; return; }
                    if (!o.isMesh || o.userData.isOutline) return;
                    if (isGhostMaterial(o.material)) { o.userData.__ghost = true; return; }
                    solids.push(o);
                });

                const pickSet = new Set([
                    ...magnets, ...range.knobs, ...faucet.pickSpout, ...faucet.pickLever,
                    ...pianoKeys, ...power.pick, ...tt.pickCover, ...tt.pickPlay,
                    ...lamps.flatMap((l) => l.pick),
                ]);
                const pickList = [...pickSet];
                /** 撞到的这块几何属于哪个可交互件（大棱镜那枚磁贴是一堆零件拼的，
                 *  命中盒在最外层，所以要往上找） */
                function interactiveOf(obj) {
                    for (let o = obj; o; o = o.parent) if (pickSet.has(o)) return o;
                    return null;
                }

                const stickyNdc = new THREE.Vector2();   // stickyPick 自己的暂存
                const clickNdc = new THREE.Vector2();    // 点击那一下的屏幕坐标
                const probe = (v, list = solids) => {
                    raycaster.setFromCamera(v, camera);
                    return raycaster.intersectObjects(list, false)[0] || null;
                };

                /* 差几个像素也算点到：龙头杆在两米外只有三五像素宽，边角上的冰箱贴
                   也一样。只对可交互件放宽 —— 地面本来就好点，不需要。 */
                const STICKY = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
                function stickyPick(v) {
                    const r = canvas.getBoundingClientRect();
                    const rx = (13 / Math.max(1, r.width)) * 2;
                    const ry = (13 / Math.max(1, r.height)) * 2;
                    // 八个方向各打一发，但**只打可交互件那几十个**（便宜），取最近的
                    let best = null, bx = 0, by = 0;
                    for (const [ox, oy] of STICKY) {
                        stickyNdc.set(v.x + ox * rx, v.y + oy * ry);
                        const near = probe(stickyNdc, pickList);
                        if (near && (!best || near.distance < best.distance)) { best = near; bx = ox; by = oy; }
                    }
                    if (!best) return null;
                    // 隔着墙 / 柜门点不到：只对选中的这一发做一次全场景遮挡检查
                    stickyNdc.set(v.x + bx * rx, v.y + by * ry);
                    const front = probe(stickyNdc);
                    if (front && !interactiveOf(front.object) && front.distance < best.distance - 0.01) return null;
                    return best;
                }

                /** 指着这个方向，会是什么。{ kind: 'interactive'|'floor'|'solid'|'none', hit, object } */
                function resolve(v) {
                    const exact = probe(v);
                    const direct = exact && interactiveOf(exact.object);
                    if (direct) return { kind: 'interactive', hit: exact, object: direct };
                    const near = stickyPick(v);
                    if (near) return { kind: 'interactive', hit: near, object: interactiveOf(near.object) };
                    if (!exact) return { kind: 'none' };
                    if (exact.object === floor) return { kind: 'floor', hit: exact };
                    return { kind: 'solid', hit: exact };
                }

                /** 点在实体上（冰箱门、沙发、墙）时的落脚点：沿这块面的法线往外
                 *  退到站得住的地方。够得着就行，不用贴脸。 */
                const nrm = new THREE.Vector3();
                function approachSpot(hit) {
                    const p = hit.point;
                    nrm.set(0, 0, 0);
                    if (hit.face) nrm.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
                    nrm.y = 0;
                    // 朝上的面（台面、地毯、天花板）没有水平法线，就从人这一侧退
                    if (nrm.lengthSq() < 1e-6) nrm.set(camPos.x - p.x, 0, camPos.z - p.z);
                    if (nrm.lengthSq() < 1e-6) return null;
                    nrm.normalize();
                    // 1.05m 是「站到它跟前看」的距离：再近整块门/柜面就糊满画面了
                    for (const d of [1.05, 1.3, 0.8, 1.65]) {
                        const spot = snapToWalkable(p.x + nrm.x * d, p.z + nrm.z * d, 0.5);
                        if (spot) return spot;
                    }
                    return null;
                }

                /** 预设机位是按构图摆的，有两个正好「坐在沙发里」。自己走的第一下
                 *  先把人从家具里挪出来，不然按半天没反应。
                 *  返回 true = 这一步用在挪出来上了。 */
                function unstick(dist) {
                    if (walkable(camPos.x, camPos.z)) return false;
                    const out = snapToWalkable(camPos.x, camPos.z, 3.0);
                    if (!out) return false;
                    const dx = out.x - camPos.x, dz = out.z - camPos.z;
                    const d = Math.hypot(dx, dz) || 1;
                    const s = Math.min(dist, d);
                    camPos.x += dx / d * s;
                    camPos.z += dz / d * s;
                    return true;
                }

                /** 走到 (spot)。lookAt 非空时，到位之后正对着它。 */
                function walkTo(spot, lookAt) {
                    const path = findPath(camPos.x, camPos.z, spot.x, spot.z);
                    if (!path) return false;        // 那儿走不到，就当没点
                    walkPath = path; pathIdx = 0;
                    snapping = false;
                    if (lookAt) {
                        tmpV.set(spot.x, EYE, spot.z);
                        const a = aimAt(tmpV, lookAt.x, lookAt.y, lookAt.z);
                        faceTo(a.yaw, a.pitch);
                    }
                    leavePreset();
                    return true;
                }
                /** 人一动（拖视角 / 走位），预设机位的高亮就该灭掉 */
                const leavePreset = () => { if (viewRef.current) setView(null); };

                let dragging = false, dragAmount = 0, lastX = 0, lastY = 0, downAt = 0;

                function onPointerDown(e) {
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    dragging = true; dragAmount = 0; downAt = performance.now();
                    lastX = e.clientX; lastY = e.clientY;
                    try { canvas.setPointerCapture(e.pointerId); } catch { /* 不支持就算了 */ }
                    canvas.classList.add('is-dragging');
                }
                function onPointerMove(e) {
                    toNdc(e, ndc);
                    if (!dragging) return;
                    const dx = e.clientX - lastX, dy = e.clientY - lastY;
                    lastX = e.clientX; lastY = e.clientY;
                    dragAmount += Math.abs(dx) + Math.abs(dy);
                    /* 0.0062 rad/px：触控板上一次能舒服划出去 400px 左右，
                       正好转 140°。原来是 0.0042，一次划完还差得远，
                       想转到身后要反复抬手重来 —— 这就是「右转转不过去」。 */
                    want.yaw -= dx * TURN_PER_PX;
                    want.pitch = clampPitch(want.pitch - dy * TURN_PER_PX * 0.72);
                    if (dragAmount > 7) leavePreset();
                }
                function onPointerUp(e) {
                    if (!dragging) return;
                    dragging = false;
                    try { canvas.releasePointerCapture(e.pointerId); } catch { /* 同上 */ }
                    canvas.classList.remove('is-dragging');
                    // 拖过就不算点击了
                    if (dragAmount > 7 || performance.now() - downAt > 600) return;
                    handleClick(e);
                }
                function onPointerLeave() {
                    ndc.set(-10, -10);
                }

                function handleClick(e) {
                    const r = resolve(toNdc(e, clickNdc));

                    if (r.kind === 'interactive') {
                        const o = r.object;
                        if (o.userData.knob) {
                            toggleBurner(o.userData.knob.index);
                            return;                   // 开火不影响冰箱贴的选中状态
                        }
                        if (faucet.pickLever.includes(o)) { waterOn = !waterOn; return; }
                        if (faucet.pickSpout.includes(o)) { swivelSpout(); return; }
                        const lamp = lampOf(o);
                        if (lamp) { toggleLamp(lamp); return; }
                        if (power.pick.includes(o)) { togglePiano(); return; }
                        if (tt.pickCover.includes(o)) { toggleLid(); return; }
                        if (tt.pickPlay.includes(o)) { togglePlay(); return; }
                        if (o.userData.midi !== undefined) { hitKey(o); return; }
                        if (o.userData.place) onSelect(o.userData.place.slug);
                        return;
                    }
                    // 正看着某枚冰箱贴：点别处先收面板，不顺手走一步
                    if (activeRef.current) { onSelect(activeRef.current); return; }

                    if (r.kind === 'floor') {
                        const spot = snapToWalkable(r.hit.point.x, r.hit.point.z, 0.8);
                        if (spot) walkTo(spot, null);
                        return;
                    }
                    if (r.kind === 'solid') {
                        // 点家具/墙不是「点空」：走到它跟前，转身看着它
                        const spot = approachSpot(r.hit);
                        if (spot) walkTo(spot, r.hit.point);
                    }
                }

                /* ---------- 键盘 ----------
                   点地面只能去「看得见的地面」；退半步、转个身、贴到墙边看画，
                   用点的都别扭，所以键盘走位装回来了。方向一律按**当前视线**算，
                   W 永远是往画面里走，不会做反。转视角单独给方向键 / Q E，
                   和拖拽不抢：拖拽是绝对量，键盘是持续量，叠加就好。 */
                const keys = new Set();
                const MOVE_KEYS = new Set([
                    'w', 'a', 's', 'd', 'q', 'e', 'shift',
                    'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
                ]);
                const keyOf = (e) => (e.key || '').toLowerCase();
                function onKeyDown(e) {
                    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
                    const t = e.target;
                    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
                    const k = keyOf(e);
                    if (!MOVE_KEYS.has(k)) return;
                    if (uiRef.current) return;        // 列表页开着就别在后面走
                    keys.add(k);
                    e.preventDefault();
                }
                const onKeyUp = (e) => keys.delete(keyOf(e));
                const dropKeys = () => keys.clear();

                /* 触控板：两指横滑转视角、纵滑前后挪。
                   Mac 上这是比拖拽更顺手的转身方式，也不占鼠标左键。 */
                function onWheel(e) {
                    if (activeRef.current || uiRef.current) return;
                    e.preventDefault();
                    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                        want.yaw -= e.deltaX * 0.0038;
                    } else {
                        // 每 100 单位滚动挪 11cm，带碰撞
                        const step = -e.deltaY * 0.0011;
                        if (!unstick(Math.abs(step))) {
                            const c = Math.cos(aim.yaw), sn = Math.sin(aim.yaw);
                            const next = slide(camPos.x, camPos.z, sn * step, c * step);
                            camPos.x = next.x; camPos.z = next.z;
                        }
                        walkPath = null;
                    }
                    snapping = false;
                    leavePreset();
                }

                window.addEventListener('keydown', onKeyDown);
                window.addEventListener('keyup', onKeyUp);
                window.addEventListener('blur', dropKeys);
                canvas.addEventListener('wheel', onWheel, { passive: false });

                canvas.addEventListener('pointerdown', onPointerDown);
                canvas.addEventListener('pointermove', onPointerMove);
                canvas.addEventListener('pointerup', onPointerUp);
                canvas.addEventListener('pointercancel', onPointerUp);
                canvas.addEventListener('pointerleave', onPointerLeave);

                const clock = new THREE.Clock();
                let raf = 0;

                function frame() {
                    raf = requestAnimationFrame(frame);
                    const dt = Math.min(clock.getDelta(), 0.05);
                    const t = clock.getElapsedTime();

                    /* 指着什么 + 会走到哪 —— 同一次 resolve 决定，所以地面光标
                       画的就是点下去真正会落到的点，不会「看着指沙发、点了跑别处」。
                       射线要过 586 个网格，鼠标和镜头都没动就沿用上一帧的结果。 */
                    if (!dragging && ndc.x > -5) {
                        const moved = Math.abs(ndc.x - lastProbe.nx) > 1e-4
                            || Math.abs(ndc.y - lastProbe.ny) > 1e-4
                            || Math.abs(camPos.x - lastProbe.cx) > 1e-3
                            || Math.abs(camPos.z - lastProbe.cz) > 1e-3
                            || Math.abs(aim.yaw - lastProbe.yaw) > 3e-4
                            || Math.abs(aim.pitch - lastProbe.pitch) > 3e-4
                            || activeRef.current !== lastProbe.active;
                        if (moved) {
                            lastProbe.nx = ndc.x; lastProbe.ny = ndc.y;
                            lastProbe.cx = camPos.x; lastProbe.cz = camPos.z;
                            lastProbe.yaw = aim.yaw; lastProbe.pitch = aim.pitch;
                            lastProbe.active = activeRef.current;
                            const r = resolve(ndc);
                            lastProbe.hover = r.kind === 'interactive' ? r.object : null;
                            lastProbe.spot = null; lastProbe.aimPoint = null;
                            if (!lastProbe.hover && !activeRef.current && r.hit) {
                                lastProbe.aimPoint = r.hit.point.clone();
                                lastProbe.spot = r.kind === 'floor'
                                    ? snapToWalkable(r.hit.point.x, r.hit.point.z, 0.8)
                                    : approachSpot(r.hit);
                            }
                        }
                    } else {
                        lastProbe.hover = null; lastProbe.spot = null; lastProbe.aimPoint = null;
                        lastProbe.nx = NaN;
                    }
                    const nextHover = lastProbe.hover;
                    const spot = lastProbe.spot, aimPoint = lastProbe.aimPoint;
                    if (nextHover !== hovered) {
                        hovered = nextHover;
                        canvas.classList.toggle('is-pointing', !!hovered);
                        const d = hovered?.userData;
                        if (d?.place) setHover({ slug: d.place.slug, place: d.place.place });
                        else if (d?.note) setHover({ slug: `key-${d.midi}`, place: pianoOn ? d.note : '电源没开' });
                        else if (hovered && power.pick.includes(hovered)) setHover({ slug: 'power', place: '电源' });
                        else if (hovered && lampOf(hovered)) {
                            setHover({ slug: 'lamp', place: lampOf(hovered).on ? '关灯' : '开灯' });
                        }
                        else setHover(null);
                    }

                    /* 地面光标。画在**实际会走到的那个点**上：指到家具或墙上时，
                       环会落到它跟前站得住的地方，点下去人就走到那儿 ——
                       所见即所得，比「变红拒绝」好用。 */
                    marker.visible = false;
                    if (spot && aimPoint && aimPoint.distanceTo(camPos) < 9) {
                        marker.position.set(spot.x, 0.014, spot.z);
                        marker.material.opacity =
                            Math.hypot(spot.x - aimPoint.x, spot.z - aimPoint.z) < 0.08 ? 0.9 : 0.45;
                        marker.visible = true;
                    }

                    /* 预设机位只在按钮切换的那一帧赋值一次。
                       之前是每帧都把 homePos 拉回预设，那样人根本走不开。 */
                    const vid = viewRef.current;
                    if (vid !== lastView) {
                        lastView = vid;
                        const v = VIEW_BY_ID[vid];
                        if (v) {
                            snapTo.set(...v.pos);
                            snapping = true;
                            walkPath = null;
                            const a1 = aimAt(snapTo, ...v.target);
                            faceTo(a1.yaw, a1.pitch);
                            viewFov = v.fov; viewFovNarrow = v.fovNarrow;
                        } else {
                            viewFov = FREE_FOV; viewFovNarrow = FREE_FOV_NARROW;
                        }
                    }
                    // 竖屏纵向余量更多，不该反而把视场角开大
                    const wantFov = camera.aspect < 0.8 ? viewFovNarrow : viewFov;
                    if (Math.abs(camera.fov - wantFov) > 0.01) {
                        camera.fov += (wantFov - camera.fov) * (1 - Math.exp(-4.2 * dt));
                        camera.updateProjectionMatrix();
                    }

                    /* 选中冰箱贴时镜头交给它 */
                    const slug = activeRef.current;
                    const focused = slug ? magnets.find((m) => m.userData.place.slug === slug) : null;

                    if (focused) {
                        if (!wasFocused) {
                            beforeFocus.copy(camPos);
                            beforeAim.yaw = want.yaw; beforeAim.pitch = want.pitch;
                            wasFocused = true;
                        }
                        focused.getWorldPosition(tmpV);
                        fridge.getWorldQuaternion(tmpQ);
                        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(tmpQ);
                        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(tmpQ);
                        const narrow = camera.aspect < 1;

                        // 让冰箱贴占画面高度的一个固定比例，剩下的留给门面和投影，
                        // 不然不同视场角下会凑到贴纸脸上。
                        const vFov = THREE.MathUtils.degToRad(camera.fov);
                        const wantH = focused.userData.baseScale / 0.22;
                        const dist = (wantH / 2) / Math.tan(vFov / 2);
                        const visW = wantH * camera.aspect;

                        snapTo.copy(tmpV).addScaledVector(normal, dist);
                        tmpV2.copy(tmpV);
                        // 面板在右边（窄屏在下面），把冰箱贴让到另一侧
                        if (narrow) tmpV2.y -= wantH * 0.24;
                        else tmpV2.addScaledVector(right, visW * 0.17);
                        const a2 = aimAt(snapTo, tmpV2.x, tmpV2.y, tmpV2.z);
                        faceTo(a2.yaw, a2.pitch);
                        snapping = true;
                        walkPath = null;
                    } else if (wasFocused) {
                        // 看完就退回原来站的地方，别把人留在冰箱脸上
                        wasFocused = false;
                        snapTo.copy(beforeFocus);
                        faceTo(beforeAim.yaw, beforeAim.pitch);
                        snapping = true;
                    }

                    /* 键盘：原地转 + 按视线走。放在位置插值之前，
                       这样按下去的当帧就生效，不会被 snapping 覆盖掉。 */
                    const kf = (keys.has('w') || keys.has('arrowup') ? 1 : 0)
                             - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
                    const ks = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
                    const kt = (keys.has('arrowright') || keys.has('e') ? 1 : 0)
                             - (keys.has('arrowleft') || keys.has('q') ? 1 : 0);
                    if (kt) {
                        // yaw 增大是往左转（相机看向 +Z 时右手边是 -X），所以右转要减
                        want.yaw -= kt * TURN_PER_SEC * dt;
                        leavePreset();
                    }
                    if (kf || ks) {
                        if (activeRef.current) clearActiveRef.current?.();   // 先从冰箱贴前退出来
                        walkPath = null;
                        snapping = false;
                        leavePreset();
                        const run = keys.has('shift') ? 1.8 : 1;
                        const step = 1.75 * run * dt;
                        if (!unstick(step)) {
                            // 前向 (sin,cos)，屏幕右手边 (-cos,sin) —— 和 lookAt 的基一致
                            const sn = Math.sin(aim.yaw), c = Math.cos(aim.yaw);
                            let dx = sn * kf - c * ks;
                            let dz = c * kf + sn * ks;
                            const len = Math.hypot(dx, dz) || 1;
                            dx = dx / len * step; dz = dz / len * step;
                            const next = slide(camPos.x, camPos.z, dx, dz);
                            camPos.x = next.x; camPos.z = next.z;
                        }
                        camPos.y += (EYE - camPos.y) * (1 - Math.exp(-5 * dt));
                    }

                    /* 位置：预设/聚焦是「飞过去」，自己走是「带碰撞地挪」 */
                    if (snapping) {
                        camPos.lerp(snapTo, 1 - Math.exp(-4.2 * dt));
                    } else {
                        const SPEED = 2.2;
                        if (walkPath) {
                            const wp = walkPath[pathIdx];
                            const dx = wp.x - camPos.x, dz = wp.z - camPos.z;
                            const d = Math.hypot(dx, dz);
                            const last = pathIdx === walkPath.length - 1;
                            // 中间的拐点擦过去就算到了，最后一个才停准
                            if (d < (last ? 0.05 : 0.12)) {
                                if (last) walkPath = null; else pathIdx++;
                            } else {
                                // 最后一段减速，落脚不至于急刹
                                const s = Math.min(SPEED * dt * (last ? Math.min(1, 0.35 + d) : 1), d);
                                camPos.x += dx / d * s;
                                camPos.z += dz / d * s;
                            }
                        }
                        camPos.y += (EYE - camPos.y) * (1 - Math.exp(-5 * dt));
                    }

                    /* 朝向插值 —— 位置和朝向分开插，转头才不会被走位带偏 */
                    const ak = 1 - Math.exp(-9 * dt);
                    aim.yaw += (want.yaw - aim.yaw) * ak;
                    aim.pitch += (want.pitch - aim.pitch) * ak;
                    const cp = Math.cos(aim.pitch);
                    camera.position.copy(camPos);
                    camera.lookAt(
                        camPos.x + Math.sin(aim.yaw) * cp,
                        camPos.y + Math.sin(aim.pitch),
                        camPos.z + Math.cos(aim.yaw) * cp,
                    );

                    /* 冰箱贴：悬停抬起，选中再抬高一点 */
                    for (const m of magnets) {
                        const isHover = m === hovered;
                        const isActive = m.userData.place.slug === slug;
                        const lift = isActive ? 0.028 : isHover ? 0.014 : 0;
                        const target = m.userData.home.z + lift;
                        m.position.z += (target - m.position.z) * (1 - Math.exp(-9 * dt));
                        const s = m.userData.baseScale * (isActive ? 1.06 : isHover ? 1.04 : 1);
                        m.scale.x += (s - m.scale.x) * (1 - Math.exp(-9 * dt));
                        m.scale.y = m.scale.z = m.scale.x;
                    }

                    /* 钢琴：按下的键沉 7mm，到点自己弹回来。
                       真琴键前端下沉约 10mm，这里取小一点 —— 键只有 13mm 厚，
                       沉太多会穿到键床下面去。 */
                    if (pressed.size) {
                        const now = performance.now();
                        for (const [m, until] of pressed) if (now > until) pressed.delete(m);
                    }
                    for (const m of pianoKeys) {
                        const down = pressed.has(m);
                        const want = m.userData.restY - (down ? 0.007 : 0);
                        const cur = m.position.y;
                        if (Math.abs(want - cur) > 1e-5) {
                            m.position.y = cur + (want - cur) * (1 - Math.exp(-26 * dt));
                        }
                    }

                    /* 电源指示：红灯 + 小屏，开机才亮 */
                    {
                        const want = pianoOn ? 1 : 0;
                        const led = power.led.material, scr = power.screen.material;
                        const k = 1 - Math.exp(-9 * dt);
                        led.emissiveIntensity += (want * 2.4 - led.emissiveIntensity) * k;
                        scr.emissiveIntensity += (want * 1.1 - scr.emissiveIntensity) * k;
                    }

                    /* 唱机：掀盖 / 唱盘 33⅓ 转 / 唱臂落针再慢慢往内圈走 */
                    {
                        const wantLid = lidOpen ? tt.LID_OPEN : 0;
                        lidAngle += (wantLid - lidAngle) * (1 - Math.exp(-6 * dt));
                        tt.coverPivot.rotation.z = lidAngle;

                        if (spinning) {
                            tt.platter.rotation.y -= 3.49 * dt;    // 33⅓ rpm
                            armTrack = Math.min(1, armTrack + dt / 240);
                        }
                        const wantArm = spinning
                            ? tt.ARM_OUTER + (tt.ARM_INNER - tt.ARM_OUTER) * armTrack
                            : tt.ARM_REST;
                        // 抬臂：正在移动就把针提起来，落到位再放下（真机的升降杆）
                        const moving = Math.abs(wantArm - armAngle) > 0.02;
                        armLift += ((moving ? 0.10 : 0) - armLift) * (1 - Math.exp(-7 * dt));
                        armAngle += (wantArm - armAngle) * (1 - Math.exp(-3.2 * dt));
                        tt.arm.rotation.y = armAngle;
                        tt.arm.rotation.z = armLift;
                        if (!spinning && !moving && tt.lp.visible && armLift < 0.005) tt.lp.visible = false;
                    }

                    /* 耳朵跟着相机走：钢琴在窗边、音箱在北墙，走过去才听得清 */
                    audio.updateListener(
                        camPos.x, camPos.y, camPos.z,
                        Math.sin(aim.yaw) * cp, Math.sin(aim.pitch), Math.cos(aim.yaw) * cp,
                    );

                    /* 火焰：每根火舌用不同相位错开缩放，配合灯光轻微闪烁 */
                    range.burners.forEach((b, i) => {
                        const knob = range.knobs[i].userData.knob.group;
                        knob.rotation.y += (knobAngle[i] - knob.rotation.y) * (1 - Math.exp(-12 * dt));
                        if (!b.flame.visible) return;
                        b.flame.userData.uniforms.uTime.value = t;
                        b.light.intensity = 0.016 + 0.006 * Math.sin(t * 13 + i * 1.7);
                    });

                    /* 水龙头：转到位 / 扳手柄 / 出水 */
                    {
                        const f = faucet;
                        f.spout.rotation.y += (f.SWIVEL_STOPS[swivelIdx] - f.spout.rotation.y) * (1 - Math.exp(-7 * dt));
                        const wantLever = waterOn ? f.LEVER_ON : f.LEVER_OFF;
                        f.lever.rotation.x += (wantLever - f.lever.rotation.x) * (1 - Math.exp(-11 * dt));

                        f.waterAnchor.visible = waterOn;
                        if (waterOn) {
                            /* 水柱拉多长要看出水口**当前**在哪：龙头转出槽外就只
                               淌到台面上，否则一直落到槽底。位置每帧从世界矩阵取，
                               所以转动过程中长度也是跟着变的。 */
                            f.waterAnchor.getWorldPosition(faucetTmp);
                            const k = f.SINK;
                            const inSink = faucetTmp.x > k.x0 && faucetTmp.x < k.x1
                                        && faucetTmp.z > k.z0 && faucetTmp.z < k.z1;
                            const drop = inSink ? f.DROP_IN_SINK : f.DROP_ON_TOP;
                            f.stream.scale.y = drop;
                            f.splash.position.y = -drop + 0.003;
                            f.streamMat.uniforms.uTime.value = t;
                            const p = 1 + 0.14 * Math.sin(t * 17);
                            f.splash.scale.set(p, p, 1);
                            f.splash.material.opacity = 0.30 + 0.14 * Math.sin(t * 23 + 1.3);
                        }
                    }

                    // 颗粒按 12fps 步进，动态是「二格一拍」而不是每帧都抖
                    comic.uniforms.uTime.value = Math.floor(t * 12) / 12;

                    composer.render();
                }
                frame();

                if (!disposed) setReady(true);

                worldRef.current = { camera, canvas, magnets, THREE, raycaster, ndc, range, scene,
                    camPos, aim, want, solids, resolve, walkable, snapToWalkable, findPath, keys,
                    /* 调试用：把人直接放到某处朝某处看。
                       光改 camPos 不行 —— 预设机位那套还在把镜头往回拉。 */
                    teleport: (px, py, pz, tx, ty, tz) => {
                        camPos.set(px, py, pz);
                        snapTo.copy(camPos);
                        snapping = false;
                        walkPath = null;
                        const a = aimAt(camPos, tx, ty, tz);
                        aim.yaw = want.yaw = a.yaw;
                        aim.pitch = want.pitch = a.pitch;
                        leavePreset();
                    },
                    debug: () => ({
                        pos: [camPos.x, camPos.y, camPos.z], snapTo: [snapTo.x, snapTo.y, snapTo.z],
                        snapping, pathIdx, path: walkPath, view: viewRef.current,
                        yaw: aim.yaw, wantYaw: want.yaw, pitch: aim.pitch, wantPitch: want.pitch,
                        fov: camera.fov,
                    }) };
                if (import.meta.env.DEV) window.__travel = worldRef.current;

                cleanup = () => {
                    cancelAnimationFrame(raf);
                    audio.disposeAudio();
                    ro.disconnect();
                    window.removeEventListener('resize', resize);
                    canvas.removeEventListener('pointerdown', onPointerDown);
                    canvas.removeEventListener('pointermove', onPointerMove);
                    canvas.removeEventListener('pointerup', onPointerUp);
                    canvas.removeEventListener('pointercancel', onPointerUp);
                    canvas.removeEventListener('pointerleave', onPointerLeave);
                    canvas.removeEventListener('wheel', onWheel);
                    window.removeEventListener('keydown', onKeyDown);
                    window.removeEventListener('keyup', onKeyUp);
                    window.removeEventListener('blur', dropKeys);
                    composer.dispose();
                    pmrem.dispose();
                    scene.traverse((o) => {
                        if (o.geometry) o.geometry.dispose();
                        if (o.material) {
                            (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
                                Object.values(m).forEach((v) => v?.isTexture && v.dispose());
                                m.dispose();
                            });
                        }
                    });
                    renderer.dispose();
                };
            } catch (err) {
                console.error('[travel] 场景初始化失败', err);
                if (!disposed) { setFailed(true); setListView(true); }
            }
        })();

        return () => { disposed = true; cleanup(); };
    }, [places, onSelect]);

    /* 悬停小牌跟着鼠标 */
    const tagRef = useRef(null);
    useEffect(() => {
        if (!hover) return;
        const move = (e) => {
            if (tagRef.current) {
                tagRef.current.style.left = `${e.clientX}px`;
                tagRef.current.style.top = `${e.clientY}px`;
            }
        };
        window.addEventListener('pointermove', move);
        return () => window.removeEventListener('pointermove', move);
    }, [hover]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (listView) setListView(false);
            else if (activeSlug) setActiveSlug(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeSlug, listView]);

    return (
        <div className="fv-root">
            <canvas className="fv-canvas" ref={canvasRef} />

            {!ready && !failed && <div className="fv-boot">正在布置厨房…</div>}
            {ready && <div className="fv-boot is-done" />}

            {hover && !activeSlug && (
                <div className="fv-tag" ref={tagRef}>{hover.place}</div>
            )}

            <aside className={`fv-panel${active ? ' is-open' : ''}`} aria-hidden={!active}>
                {active && (
                    <>
                        <button className="fv-panel__close" onClick={() => setActiveSlug(null)} aria-label="关闭">✕</button>
                        <div className="fv-panel__head">
                            <div className="fv-panel__place">{active.place}</div>
                            <div className="fv-panel__sub">
                                {active.placeEn ? `${active.placeEn} · ` : ''}{magnetMeta(active)}
                            </div>
                        </div>
                        <div className="fv-panel__meta">
                            <span>{active.dates || active.year || ''}</span>
                            {typeof active.rating === 'number' && <Stars value={active.rating} />}
                        </div>
                        <div className="fv-panel__body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.body}</ReactMarkdown>
                        </div>
                    </>
                )}
            </aside>

            <div className="fv-hud fv-hud--tl">
                <a className="fv-btn" href="/">← 回主页</a>
                <span className="fv-title">I LIVE HERE</span>
            </div>
            <div className="fv-hud fv-hud--tr">
                <div className="fv-views" role="group" aria-label="切换机位">
                    {VIEWS.map((v) => (
                        <button
                            key={v.id}
                            className={`fv-btn fv-btn--view${view === v.id ? ' is-on' : ''}`}
                            aria-pressed={view === v.id}
                            onClick={() => { setActiveSlug(null); setView(v.id); }}
                        >{v.label}</button>
                    ))}
                </div>
                <button className="fv-btn" onClick={() => setListView(true)}>列表 ☰</button>
            </div>
            <div className="fv-hud fv-hud--bl">
                <span className="fv-hint">
                    {coarse ? '拖动转视角 · 点哪儿走哪儿' : 'WASD 走动 · 拖动或 ← → 转视角 · 点哪儿走哪儿'}
                    {view === 'fridge'
                        ? ` · ${places.length} 枚冰箱贴，点开看详情 · 旋钮点火、龙头能转能放水`
                        : ' · 钢琴开电源就能弹 · 唱机能掀盖、能放唱片 · 灯罩点一下开关灯'}
                </span>
            </div>

            {listView && (
                <div className="fv-list">
                    <div className="fv-hud fv-hud--tr">
                        <button className="fv-btn" onClick={() => setListView(false)} disabled={failed}>
                            {failed ? '场景不可用' : '回到房间 ▦'}
                        </button>
                    </div>
                    <div className="fv-list__inner">
                        <a className="fv-btn" href="/my-apt/list/" style={{ alignSelf: 'flex-start' }}>
                            纯文本永久链接 ↗
                        </a>
                        {places.map((p) => (
                            <article className="fv-card" key={p.slug}>
                                <h3>{p.place} <small>{p.placeEn}</small></h3>
                                <div className="fv-card__meta">
                                    {magnetMeta(p)}{p.dates || p.year ? ` · ${p.dates || p.year}` : ''}
                                    {typeof p.rating === 'number' ? ` · ${p.rating}/5` : ''}
                                </div>
                                <div className="fv-card__body">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.body}</ReactMarkdown>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
