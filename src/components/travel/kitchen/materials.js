import * as THREE from 'three';

/* ---------- 调色板 ---------- */
export const PALETTE = {
    ink: 0x141024,
    // 墙其实是白的 —— 实拍里那股暖调是灯给的，不是墙给的。
    // 底色留一点点暖，纯 #fff 在 ACES + 色阶量化下会直接糊成一块。
    wall: 0xe9e6df,
    wallShade: 0xe1ddd4,
    woodLight: 0xd3bb98,   // 浅橡木柜体
    woodMid: 0xbfa47c,
    cabinetWhite: 0xcdcac2, // 白色柜门
    steel: 0xb0b7c0,       // 不锈钢
    steelDark: 0x8e959e,
    counter: 0xd4d0c6,     // 白石英台面
    appliance: 0x1a1a20,   // 灶面 / 烤箱玻璃
    floorA: 0x574a44,      // 深色木地板
    floorB: 0x453a36,
    accentPink: 0xff2e88,
    accentCyan: 0x35e2ff,
};

/* ---------- 程序化贴图：给平面加一点脏，避免塑料感 ---------- */

function canvas2d(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return [c, c.getContext('2d')];
}

let noiseTex = null;
export function surfaceNoise() {
    if (noiseTex) return noiseTex;
    const [c, ctx] = canvas2d(256);
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
        // 低频 + 高频混合，纯高频看起来像噪点而不像表面
        const v = 150 + Math.random() * 60;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    noiseTex = new THREE.CanvasTexture(c);
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.repeat.set(6, 6);
    return noiseTex;
}

export function checkerTexture(colorA, colorB, tiles = 8, px = 512) {
    const [c, ctx] = canvas2d(px);
    const s = px / tiles;
    for (let y = 0; y < tiles; y++) {
        for (let x = 0; x < tiles; x++) {
            ctx.fillStyle = (x + y) % 2 ? colorA : colorB;
            ctx.fillRect(x * s, y * s, s, s);
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/* ---------- PBR 贴图（Poly Haven，CC0） ----------
   木纹和地板之前是 canvas 画的，凑近看是「画出来的」。
   这两张是真实扫描材质，512px WebP，加起来不到 60KB。 */

/* 同一张图会被多个部件以不同重复率使用。
   不能直接 clone 已 load 的 Texture —— clone 是在图片还没下载完时发生的，
   克隆体拿到的 image 是 undefined 并且之后不会再更新（控制台会刷
   "Texture marked for update but no image data found"）。
   正确做法是只缓存「图片」，每个重复率各自建一个 Texture 共享这张图。 */
const imgCache = new Map();

function loadImage(url) {
    if (!imgCache.has(url)) {
        imgCache.set(url, new Promise((resolve, reject) => {
            new THREE.ImageLoader().load(url, resolve, undefined, reject);
        }));
    }
    return imgCache.get(url);
}

function loadTex(url, { srgb = false, repeat = [1, 1] } = {}) {
    const t = new THREE.Texture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    loadImage(url).then((img) => {
        t.image = img;
        t.needsUpdate = true;
    }).catch(() => { /* 贴图缺失就退化成纯色，不阻断场景 */ });
    return t;
}

/** 一张画：唱片封套、海报之类。贴图是异步来的，先给一块底色顶着，
 *  图到了再挂上去 —— 图缺了就一直是底色，不会变成白板或黑板。 */
export function artworkMaterial(url, fallbackColor = 0x8b8478) {
    const mat = new THREE.MeshStandardMaterial({
        color: fallbackColor, roughness: 0.86, metalness: 0.0,
    });
    if (!url) return mat;
    loadImage(url).then((img) => {
        const t = new THREE.Texture(img);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.needsUpdate = true;
        mat.map = t;
        mat.color.setHex(0xffffff);   // 有图之后底色会把图染色，收回白
        mat.needsUpdate = true;
    }).catch(() => { /* 没这张图就留着底色 */ });
    return mat;
}



/* 亮着的布灯罩的自发光贴图：一张竖向渐变。

   为什么非要一张贴图不可 —— 均匀自发光有两条死路：
     · 调低 → 整块平黄，看着是「一块黄布」不是「一盏亮着的灯」
     · 调高 → 整块顶到纯白，再被色阶量化拍成一个死形状，就是「过曝」
   实物是有层次的：贴着灯泡的下沿几乎发白，往上收成琥珀色。有了这个梯度，
   量化切出来是两三层台阶而不是一整块，亮和「有形」才能同时成立。

   另外颜色要**压住蓝通道**。emissive 乘上强度之后是逐通道 clamp 的：
   蓝低的话红绿先饱和、蓝还留着余量，于是越亮越黄；蓝一高就三个通道
   一起顶到 1，那就是白。 */
let shadeGradTex = null;
export function shadeGradient() {
    if (shadeGradTex) return shadeGradTex;
    const [c, ctx] = canvas2d(8);
    c.width = 8; c.height = 128;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0.00, '#c07d22');   // v=1 罩顶：最暗，琥珀
    g.addColorStop(0.42, '#e8b342');
    g.addColorStop(0.80, '#ffd25e');
    g.addColorStop(1.00, '#ffeaa8');   // v=0 罩口：贴着灯泡，最亮
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
    shadeGradTex = new THREE.CanvasTexture(c);
    shadeGradTex.colorSpace = THREE.SRGBColorSpace;
    shadeGradTex.wrapS = THREE.ClampToEdgeWrapping;
    shadeGradTex.wrapT = THREE.ClampToEdgeWrapping;
    return shadeGradTex;
}

/* 走廊书架上那张裱起来的毕业证。
   照实物画：黑木框 + 一圈金色珠边 + 深色卡纸 + 金线 + 米色证书。
   为什么用 canvas 画而不是贴一张照片：这是本人的学位证，扫描件不该
   进公开仓库；照排一遍，走近能读，字也永远是清的。 */
/* 拿到眼前看的那一份要另画一张更大的：架子上那张在画面里只有几十像素宽，
   1200×900 绰绰有余；举到脸前占掉半屏，同一张图就糊了。所以按倍数缓存，
   坐标一律写在 1200×900 这套里，靠 ctx.scale 放大 —— 字号、线宽跟着一起长。 */
const diplomaTexBySize = new Map();
export function diplomaTexture(scale = 1) {
    if (diplomaTexBySize.has(scale)) return diplomaTexBySize.get(scale);
    const W = 1200, H = 900;
    const [c, ctx] = canvas2d(Math.round(W * scale));
    c.height = Math.round(H * scale);      // 改尺寸会把画布连同变换一起清空，所以 scale 放在后面
    ctx.scale(scale, scale);

    ctx.fillStyle = '#120f0d';                       // 框
    ctx.fillRect(0, 0, W, H);
    // 珠边：沿框内缘一圈小金点
    ctx.fillStyle = '#b9963f';
    const bead = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill(); };
    for (let x = 46; x <= W - 46; x += 11) { bead(x, 46); bead(x, H - 46); }
    for (let y = 46; y <= H - 46; y += 11) { bead(46, y); bead(W - 46, y); }

    ctx.fillStyle = '#1b1613';                       // 卡纸
    ctx.fillRect(72, 72, W - 144, H - 144);
    ctx.fillStyle = '#c8a53f';                       // 金线
    ctx.fillRect(212, 150, W - 424, H - 300);
    ctx.fillStyle = '#f7f0e1';                       // 证书纸
    ctx.fillRect(222, 160, W - 444, H - 320);

    const cx = W / 2;
    // 校徽：一圈字 + 中间一颗星
    ctx.strokeStyle = '#9c9080';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, 232, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 232, 33, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#9c9080';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 8 : 19;
        ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, 232 + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();

    ctx.textAlign = 'center';
    const line = (text, y, size, { color = '#2a2622', style = '', font = 'Georgia, "Times New Roman", serif' } = {}) => {
        ctx.fillStyle = color;
        ctx.font = `${style} ${size}px ${font}`.trim();
        ctx.fillText(text, cx, y);
    };
    line('THE UNIVERSITY OF TEXAS', 318, 54, { color: '#3a3630' });
    line('AT AUSTIN', 372, 54, { color: '#3a3630' });
    line('has conferred on', 424, 26, { style: 'italic', color: '#4a453d' });
    line('Weiran Huang', 476, 44, { color: '#2a2622' });
    line('the degree of', 520, 26, { style: 'italic', color: '#4a453d' });
    line('Master of Science in Engineering', 570, 36, { color: '#2a2622' });
    line('and all the rights and privileges thereto appertaining.', 620, 22, { style: 'italic', color: '#4a453d' });
    line('In Witness Thereof, this diploma duly signed has', 650, 22, { style: 'italic', color: '#4a453d' });
    line('been issued and the seal of the University affixed.', 680, 22, { style: 'italic', color: '#4a453d' });
    line('Issued by the Board of Regents upon Recommendation of the Faculty.', 726, 21, { style: 'italic', color: '#4a453d' });
    line('AWARDED ON THIS ELEVENTH DAY OF MAY, 2024', 764, 17, { color: '#55504a' });

    // 两个签名：随手的连笔，不写具体名字
    ctx.strokeStyle = '#232025';
    ctx.lineWidth = 3;
    for (const sx of [cx - 210, cx + 150]) {
        ctx.beginPath();
        ctx.moveTo(sx - 60, 812);
        for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            ctx.lineTo(sx - 60 + t * 130,
                812 - Math.sin(t * Math.PI * 3.1 + sx) * 15 - Math.sin(t * Math.PI * 7) * 5);
        }
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    diplomaTexBySize.set(scale, tex);
    return tex;
}

/* 贴图代表的真实尺寸（米）。全屋木纹共用这一个尺度，
   否则窄立板和宽柜门上的木纹粗细会对不上，看着就假。 */
export const WOOD_TILE = 1.0;

/* 关掉就是纯色平板，不贴木纹。
   贴面板的木纹本来就只是装饰，后期的色阶量化又会把细纹放大成条纹，
   所以「干脆不要」是个合理选项。 */
export const WOOD_GRAIN = true;
export const WOOD_PLAIN_COLOR = 0xc3bcb1;   // 与贴图的平均色一致

/** 按部件的真实宽高推导重复率。
 *  BoxGeometry 每个面的 UV 都是 0..1、不随尺寸变化，
 *  所以必须显式换算，不能所有部件共用一套重复率。 */
export function woodFor(width, height, opts = {}) {
    return woodMaterial({
        repeat: [width / WOOD_TILE, height / WOOD_TILE],
        ...opts,
    });
}

/** 灰调橡木贴面板。
 *  关键：这是**贴面板上印的木纹装饰**，板面本身是平的、光泽均匀。
 *  所以只用一张漫反射，不上法线图也不上粗糙度图——上了就会把木纹
 *  渲染成真实的沟壑，看起来像表面参差不平。
 *
 *  repeat 要按部件的实际尺寸调：BoxGeometry 每个面的 UV 都是 0..1，
 *  不随尺寸变化，宽柜门和窄立板必须给不同的重复次数。 */
export function woodMaterial({ repeat = [1, 1], color = 0xffffff, roughness = 0.5 } = {}) {
    if (!WOOD_GRAIN) {
        return new THREE.MeshStandardMaterial({
            color: WOOD_PLAIN_COLOR, roughness, metalness: 0.0,
        });
    }
    return new THREE.MeshStandardMaterial({
        color,
        map: loadTex('/travel/textures/wood_diff.webp', { srgb: true, repeat }),
        roughness,
        metalness: 0.0,
    });
}

/** 木纹地板。原贴图偏暖棕，用 color 往灰里压一压才接近实物。 */
export function floorMaterial({ repeat = [9, 9], color = 0x9c9285 } = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        map: loadTex('/travel/textures/floor_diff.webp', { srgb: true, repeat }),
        normalMap: loadTex('/travel/textures/floor_nor.webp', { repeat }),
        roughnessMap: loadTex('/travel/textures/floor_rough.webp', { repeat }),
        roughness: 1.0,
        metalness: 0.02,
        normalScale: new THREE.Vector2(0.22, 0.22),
    });
}

/* 圆石马赛克墙砖 */
export function pennyTileTexture(px = 512) {
    const [c, ctx] = canvas2d(px);
    ctx.fillStyle = '#b3aba1';
    ctx.fillRect(0, 0, px, px);
    const cols = 14;
    const r = px / cols / 2;
    // 行距要能整除画布高度，否则纵向重复时会出现接缝；行数取偶数保证错缝也对得上
    let rows = Math.round(px / (r * 1.732));
    if (rows % 2) rows += 1;
    const rowStep = px / rows;
    for (let row = 0; row < rows; row++) {
        for (let col = -1; col <= cols; col++) {
            const x = col * r * 2 + r + (row % 2 ? r : 0);
            const y = row * rowStep + rowStep / 2;
            const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
            const v = 206 + Math.floor(Math.random() * 20);
            g.addColorStop(0, '#f0ece4');
            g.addColorStop(0.6, `rgb(${v},${v - 4},${v - 9})`);
            g.addColorStop(1, '#bdb5aa');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/* 缎面不锈钢的表面起伏。
   注意：不能用明显的竖条纹——条纹经过后期色阶量化会被切成一道道色带，
   看起来像刷子刷出来的。这里只做极细的各向异性噪声。 */
let brushedTex = null;
export function brushedMetal() {
    if (brushedTex) return brushedTex;
    const px = 256;
    const [c, ctx] = canvas2d(px);
    const img = ctx.createImageData(px, px);
    for (let y = 0; y < px; y++) {
        // 每一行取一个基准值，行内再抖动 —— 纵向相关、横向随机，
        // 得到的是「缎面」而不是「刷痕」
        const base = 128 + (Math.random() - 0.5) * 8;
        for (let x = 0; x < px; x++) {
            const v = base + (Math.random() - 0.5) * 5;
            const i = (y * px + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    brushedTex = new THREE.CanvasTexture(c);
    brushedTex.wrapS = brushedTex.wrapT = THREE.RepeatWrapping;
    return brushedTex;
}

/* 中性环境贴图。
   three 自带的 RoomEnvironment 是个彩色摄影棚盒子，反射到不锈钢上会变成
   一块块粉蓝色斑——再经过后期色阶量化就更明显。这里换成一张
   上亮下暗的中性渐变，外加一条模拟窗户的亮带，反射就回到「灰调金属」。 */
let envTex = null;
export function neutralEnvTexture() {
    if (envTex) return envTex;
    const w = 512, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.00, '#fbf6ec');   // 天花板
    g.addColorStop(0.34, '#e2dcd2');
    g.addColorStop(0.52, '#c3bcb1');   // 视平线
    g.addColorStop(0.72, '#7d766d');
    g.addColorStop(1.00, '#3a352f');   // 地面
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 一条横向亮带：不锈钢上那道柔和的高光就是它反射出来的
    const band = ctx.createLinearGradient(0, h * 0.28, 0, h * 0.5);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, 'rgba(255,252,244,0.85)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(w * 0.05, h * 0.28, w * 0.34, h * 0.22);

    envTex = new THREE.CanvasTexture(c);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    return envTex;
}

/* ---------- 材质 ---------- */

export function matte(color, { roughness = 0.75, metalness = 0.0, noise = 0, ...rest } = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...rest });
    if (noise) {
        m.roughnessMap = surfaceNoise();
        m.roughness = roughness;
    }
    return m;
}

export function metal(color = PALETTE.steel, roughness = 0.3) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.72 });
}

/* 不锈钢家电：金属度高但不做镜面，靠拉丝 roughnessMap 出方向感 */
export function stainless(color = PALETTE.steel, { roughness = 0.62, repeat = [1, 1] } = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.5 });
    const t = brushedMetal().clone();
    t.needsUpdate = true;
    t.repeat.set(...repeat);
    m.roughnessMap = t;
    return m;
}

const whirlpoolLogoTextures = new Map();

/** Whirlpool 官方产品品牌 Logo。素材来自 Whirlpool Corporation Media Hub，
 * 保留原始黑色字标、金色 Ring of Promise 与注册标记，不再自行描摹。 */
export function whirlpoolBadge(w = 0.13, h = w * (400 / 1260), variant = 'black') {
    const key = variant === 'white' ? 'white' : 'black';
    if (!whirlpoolLogoTextures.has(key)) {
        const suffix = key === 'white' ? '-white' : '';
        const tex = new THREE.TextureLoader().load(`/whirlpool-brand-logo${suffix}.png`);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        whirlpoolLogoTextures.set(key, tex);
    }
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
            map: whirlpoolLogoTextures.get(key), transparent: true, depthWrite: false, toneMapped: false,
        }),
    );
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
}

/* ---------- 反转外壳描边 ----------
   沿法线外推一圈背面几何，得到粗细稳定的墨线。
   比后期边缘检测可控：每个部件自己一条线，门缝、把手都圈得住。 */

const outlineMaterialCache = new Map();

function outlineMaterial(thickness, color) {
    const key = `${thickness}|${color}`;
    if (outlineMaterialCache.has(key)) return outlineMaterialCache.get(key);
    const m = new THREE.ShaderMaterial({
        uniforms: {
            uThickness: { value: thickness },
            uColor: { value: new THREE.Color(color) },
        },
        vertexShader: `
            uniform float uThickness;
            void main() {
                vec3 p = position + normalize(normal) * uThickness;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            void main() { gl_FragColor = vec4(uColor, 1.0); }
        `,
        side: THREE.BackSide,
    });
    outlineMaterialCache.set(key, m);
    return m;
}

export function inkOutline(mesh, thickness = 0.012, color = PALETTE.ink) {
    const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thickness, color));
    o.castShadow = false;
    o.receiveShadow = false;
    o.renderOrder = -1;
    o.userData.isOutline = true;
    mesh.add(o);
    return o;
}

/** 一个**空心**柜体：五块板围出来、正面留空，可选层板。

    柜子做成一个实心盒子的话，门开了里面还是一整块木头 —— 那是「门开着的
    柜子」，不是「打开的柜子」。之前是靠在门背后垫一块暗面糊弄，门一开到
    大角度就露馅。

    face 指开口朝哪：'z+' / 'z-' / 'x+' / 'x-'。内部一律按开口朝 +Z 建，
    再整体绕 y 转过去 —— 所以 w 永远是**沿开口面的宽**、d 是进深，
    朝 ±X 的柜子调用时这两个要按世界轴换过来。
    shelves 是层板中心相对柜体中心的高度。 */
export function carcass(parent, {
    w, h, d, pos, face = 'z+', mat, innerMat, t = 0.018, shelves = [], outline = 0.009,
}) {
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    g.rotation.y = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 }[face] || 0;
    parent.add(g);
    const box3 = (bw, bh, bd) => new THREE.BoxGeometry(bw, bh, bd);
    solid(box3(w, h, t), mat, { position: [0, 0, -(d - t) / 2], parent: g, outline });          // 背板
    for (const sx of [-1, 1]) {
        solid(box3(t, h, d), mat, { position: [sx * (w - t) / 2, 0, 0], parent: g, outline });  // 两侧
    }
    solid(box3(w - 2 * t, t, d), mat, { position: [0, -(h - t) / 2, 0], parent: g, outline });  // 底
    solid(box3(w - 2 * t, t, d), mat, { position: [0, (h - t) / 2, 0], parent: g, outline });   // 顶
    for (const sy of shelves) {
        solid(box3(w - 2 * t - 0.004, 0.016, d - t - 0.014), innerMat || mat, {
            position: [0, sy, 0.005], parent: g, outline: 0.005, cast: false,
        });
    }
    return g;
}

/* 建网格的统一入口：默认收发阴影 + 描边 */
export function solid(geometry, material, {
    outline = 0.011,
    cast = true,
    receive = true,
    position,
    rotation,
    parent,
} = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (position) mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    if (outline) inkOutline(mesh, outline);
    if (parent) parent.add(mesh);
    return mesh;
}
