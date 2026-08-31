/* ============================================================================
   桌上那台电脑里跑的是**这个站本身**。

   这块屏分两态，两态用两种完全不同的东西画：

     开着  屏面是一张贴图（buildScreenSurface，见本文件下半段）。它是**真几何体**，
           走深度缓冲，所以椅背、笔记本上盖挡在前面就是挡住 —— 走到屋里哪个
           角度都看得见，也都遮挡正确。贴图是首页的快照，scripts/shoot-home.mjs
           拍的，首页改版了重跑一次。
     坐下  一个真 <iframe src="/"> 盖上来，能滚能点。

   ── 为什么坐下这一态**不用 CSS3DRenderer** ──

   一开始是用的，两个问题都致命：

   1. **点不动。** CSS3D 把元素按世界单位摆，这块屏 0.724 米宽而 iframe 要
      1280 CSS 像素才是桌面版布局，于是缩放比是 0.00057。这个量级下浏览器的
      3D 命中测试会失准 —— 画得出来，但 elementFromPoint 命不中，点击穿过
      iframe 落到底下的层上。（three 官方那些例子的缩放比在 0.01 上下，差两个
      数量级，所以那边没事。）
   2. **挡不住。** CSS3D 是独立的一层 DOM，屋里的几何体挡不住它。原以为
      「座位到屏幕这条视线上什么都没有」，其实不成立：椅子占 x 2.88–3.38，
      而座位距离是按画幅算的，窄窗口下会退到椅背后面；笔记本上盖顶到 y≈1.02，
      比屏幕下沿 0.918 还高，**任何高度的正视都会被它挡住底部**。

   坐下的时候相机是**正对且锁死**的，所以那块屏在画面上的投影就是一个
   轴对齐的矩形 —— 根本不需要 3D 变换。换成按投影矩形摆的普通 2D iframe，
   命中测试是平的，点击/滚动全部正常。

   遮挡则是换个办法根治：坐下时**屋里除了这台显示器什么都不画**
   （KitchenScene 里的 SEAT_LAYER）。压暗没有用 —— 暗的椅背也还是椅背，
   照样横在屏幕前面；只有让它不出现，前后关系才没得错。

   真正需要几何诚实的是**开着**那一态，而那一态是贴图，本来就诚实。
   ========================================================================== */

import * as THREE from 'three';

/** iframe 的 CSS 像素宽。1280 是有意选的：
 *  一来站点在这个宽度下走的是桌面版布局（不是塞进屏幕的移动版），
 *  二来和 scripts/shoot-home.mjs 拍快照用的宽度一致 —— 两态换手时
 *  版式是同一套，坐下的那一下画面不会跳。 */
const PX_W = 1280;

export function createWebScreen(root, screen, { src = '/' } = {}) {
    const layer = document.createElement('div');
    layer.className = 'fv-screen-layer';
    root.appendChild(layer);

    const px = { w: PX_W, h: Math.round(PX_W * (screen.h / screen.w)) };

    const frame = document.createElement('iframe');
    /* **进屋的时候不给 src。** 一挂上去就是把整个首页（React 岛、字体、封面图）
       连着这间屋子一起加载，而绝大多数人根本不会走到这张桌子跟前。
       等真坐下了（enterScreen → reset）再让它去取。 */
    frame.title = '这台电脑';
    frame.style.cssText =
        `position:absolute;left:0;top:0;width:${px.w}px;height:${px.h}px;`
        + 'border:0;display:block;background:#0d0b1a;transform-origin:0 0;'
        // pointer-events 要显式关掉：层上的 none 不传给子元素，
        // 不写这行的话这块透明 iframe 照样吃掉点击，人还没坐下就点不动显示器了
        + 'opacity:0;pointer-events:none;transition:opacity .4s ease';
    frame.setAttribute('allow', 'autoplay');
    layer.appendChild(frame);

    /* ---------- 摆到那块屏的投影上 ---------- */
    const corner = new THREE.Vector3();
    const center = new THREE.Vector3();

    /** 把屏幕那个矩形投到画面上，iframe 照着摆。
     *  正对着看，所以四个角投出来就是个轴对齐矩形，取包围盒即可 ——
     *  歪着看会有透视梯形，但那只发生在推镜头的路上，那会儿 iframe 是灭的。 */
    const place = (camera, w, h) => {
        screen.mesh.getWorldPosition(center);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        // 屏面朝 -X：宽沿世界 Z，高沿世界 Y
        for (const sz of [-1, 1]) for (const sy of [-1, 1]) {
            corner.set(center.x, center.y + sy * screen.h / 2, center.z + sz * screen.w / 2);
            corner.project(camera);
            const px2 = (corner.x * 0.5 + 0.5) * w, py2 = (-corner.y * 0.5 + 0.5) * h;
            x0 = Math.min(x0, px2); x1 = Math.max(x1, px2);
            y0 = Math.min(y0, py2); y1 = Math.max(y1, py2);
        }
        const s = (x1 - x0) / px.w;
        frame.style.transform = `translate(${x0}px, ${y0}px) scale(${s})`;
    };

    /* ---------- 页内导航的两道闸 ---------- */
    /* 同源，所以能进这张页面里把某些链接接管掉。拦两类：
       1. /my-apt —— 会在这台电脑里再开一间公寓，再跑一遍整个 three.js 场景，
          显卡直接跪。
       2. /blog/... —— 博文正文是 client:only 的岛（见 blog/[...slug].astro），
          正文完全不在服务端 HTML 里，要等 React 在 iframe 里再水合一遍才出现；
          而且一篇长文塞进这块 0.72 米宽的屏本来也不是好的读法。
          拦下来，给一个「去站上读」的出口。 */
    let onBlocked = null;
    let onEscape = null;
    const guard = () => {
        let doc;
        try { doc = frame.contentDocument; } catch { return; }   // 跳站了就够不着，随它
        if (!doc) return;
        doc.addEventListener('click', (e) => {
            const a = e.target?.closest?.('a[href]');
            if (!a) return;
            let url;
            try { url = new URL(a.getAttribute('href'), doc.location.href); } catch { return; }
            if (url.origin !== doc.location.origin) return;      // 外链随它去
            const stop = (kind, href) => {
                e.preventDefault();
                e.stopPropagation();
                onBlocked?.(kind, href);
            };
            if (/^\/my-apt\/?$/.test(url.pathname)) stop('apt', null);
            /* 只拦**正文页**。/blog/ 列表和 /blog/tag/xxx 是 client:load 的，
               服务端就有内容，在这块屏上翻着没问题，不该一并拦掉。 */
            else if (/^\/blog\/(?!tag\/)[^/]+\/?$/.test(url.pathname)) stop('post', url.href);
        }, true);
        /* Esc 也要在**页面里面**再听一遍。焦点一进 iframe，键盘事件就只走它自己
           那个 document，父页面 window 上那个监听收不到 —— 不补这一手，坐下之后
           Esc 是死的，只剩点外面才能站起来。 */
        doc.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') onEscape?.();
        });
    };
    frame.addEventListener('load', guard);

    /* ---------- 对外 ---------- */
    let live = false;

    return {
        place,
        /** 落位之后才把网页亮出来、才接管鼠标。
         *  推镜头的路上不亮：那会儿还没正对，投影是个梯形，摆不准。 */
        setLive(on) {
            if (on === live) return;
            live = on;
            frame.style.opacity = on ? '1' : '0';
            frame.style.pointerEvents = on ? 'auto' : 'none';
            layer.style.pointerEvents = on ? 'auto' : 'none';
        },
        /** 坐下时调。第一次坐下才真去加载；之后每次坐下都回到首页 ——
         *  上次翻到哪儿是上次的事，重新坐下该是一块干净的屏。
         *  比的是 contentWindow 的当前地址，不是 src 属性：页内跳转不改属性，
         *  拿属性比的话第二次坐下永远判「没变」，就回不到首页了。 */
        reset() {
            const want = new URL(src, location.href).href;
            let here = null;
            try { here = frame.contentWindow?.location?.href ?? null; } catch { here = null; }
            if (here !== want) frame.src = want;
        },
        onBlocked(fn) { onBlocked = fn; },
        onEscape(fn) { onEscape = fn; },
        dispose() {
            frame.src = 'about:blank';
            layer.remove();
        },
    };
}

/**
 * 站在哪儿看这块屏。
 *
 * 沿屏面法线退开一段，退到屏幕占画面 fill 那么大为止 —— 不写死距离，
 * 因为视场角是变的（VIEWS 里每个机位都带 fov / fovNarrow，而且还在缓动中）。
 *
 * **高和宽都要算，取远的那个。** 只按高算的话，窗口一窄（画面比这块 16:9
 * 的屏还瘦），屏幕左右两边就顶出画面外去了。
 */
export function seatFor(screen, camera, fill = 0.82) {
    const at = new THREE.Vector3();
    screen.mesh.getWorldPosition(at);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const tanH = tanV * camera.aspect;
    const dist = Math.max(
        (screen.h / fill / 2) / tanV,
        (screen.w / fill / 2) / tanH,
    );
    return {
        pos: [at.x - dist, at.y, at.z],       // 屏面朝 -X，所以人在 -X 那头
        look: [at.x, at.y, at.z],
        dist,
    };
}

/* ============================================================================
   开着的那一态：屏面上贴一张首页快照。

   这一层是**真几何体**，所以走的是深度缓冲 —— 椅背、台灯、笔记本挡在前面
   就是挡住，和屋里别的东西一样。CSS3D 那层做不到这件事，这也是为什么
   远景非得换成贴图不可。
   ========================================================================== */

/** 快照还没拍（或者 404）时顶上的那张。
 *
 *  不画成「无信号」的蓝屏 —— 那读作屏幕坏了。画成首页的色块骨架：
 *  米色纸面 + 那几张 Bento 卡片的主色。隔着两三米看，它和真快照的差别
 *  只在字上，而那个距离本来就读不出字。 */
function fallbackPoster(THREE, w, h) {
    const cv = document.createElement('canvas');
    cv.width = 1280; cv.height = Math.round(1280 * (h / w));
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height;

    g.fillStyle = '#f4f2ed'; g.fillRect(0, 0, W, H);
    // 首页那层点阵底纹。少了它整张图是一块死平的米色，不像个页面
    g.fillStyle = 'rgba(27,42,82,0.10)';
    for (let y = 16; y < H; y += 22) for (let x = 16; x < W; x += 22) g.fillRect(x, y, 2, 2);

    const box = (c, x, y, bw, bh, r = 10) => {
        g.fillStyle = c;
        g.beginPath(); g.roundRect(x, y, bw, bh, r); g.fill();
    };

    box('#d63a45', W - 270, 38, 198, 40, 20);          // 右上角那颗 SWITCH UNIVERSE
    box('#1b2a52', 72, 104, 520, 76, 6);               // 标题
    box('#8a93a8', 72, 200, 300, 15, 4);               // 副标题两行
    box('#d63a45', 72, 227, 372, 15, 4);

    // 下面那片 Bento。颜色照首页取，比例也照着排 —— 隔着两三米，
    // 认得出来的就是这几块颜色和它们的相对大小。
    box('#e0323f', 72, 296, 470, 362);                 // C++
    box('#3f6f96', 566, 296, 290, 232, 18);            // 音乐
    box('#fdfdfb', 880, 296, 328, 232);                // 归档
    g.strokeStyle = '#dcd9d1'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(880, 296, 328, 232, 10); g.stroke();
    box('#f2c230', 566, 552, 290, 106);                // 笔记
    box('#1b2a52', 880, 552, 328, 106);                // 公寓

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * 在屏面前面贴一层，管这块屏的开关。
 *
 * 为什么另起一块 Plane、而不是给原来那个 Box 换贴图：Box 六个面共用一套
 * UV，正面（朝 -X 那面）拿到的 UV 方向是转过的，贴上去字是躺倒或者镜像的。
 * 单独一块朝向自己定死的平面，横平竖直不用猜。
 *
 * @param screen living.js userData.screens 里的那一项 { mesh, w, h }
 */
export function buildScreenSurface(THREE, screen, { poster = '/travel/screens/home.webp' } = {}) {
    const geo = new THREE.PlaneGeometry(screen.w, screen.h);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0b0d14, roughness: 0.34, metalness: 0,
        emissive: 0xffffff, emissiveIntensity: 0,
    });
    const face = new THREE.Mesh(geo, mat);
    /* 平面默认躺在 XY、法线朝 +Z；这块屏朝 -X，所以绕 Y 转 -90°。
       转完平面自身的 +X 落在世界 +Z 上 —— 和 CSS3DObject 那边同一个朝向，
       两态换手时画面不会左右翻。 */
    face.rotation.y = -Math.PI / 2;
    face.position.x = -0.0028;              // 压在亮面前头一点点，避免同面打架
    face.visible = false;
    face.userData.ghost = true;             // 命中还归后面那块 Box，别让它抢
    face.userData.isOutline = true;         // 描边遍历也跳过它
    screen.mesh.add(face);

    let tex = null;
    let loading = false;

    /** 贴图**开机才去拉**。绝大多数人不会走到这张桌子跟前，
     *  不该让所有人在开屋子的时候先下一张 200KB 的图。 */
    const ensureTexture = () => {
        if (tex || loading) return;
        loading = true;
        new THREE.TextureLoader().load(
            poster,
            (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                t.anisotropy = 8;
                tex = t;
                mat.map = t; mat.emissiveMap = t; mat.needsUpdate = true;
            },
            undefined,
            // 还没拍过快照就先顶一张色块骨架，别让屏幕开出来是黑的
            () => {
                const t = fallbackPoster(THREE, screen.w, screen.h);
                tex = t;
                mat.map = t; mat.emissiveMap = t; mat.needsUpdate = true;
            },
        );
    };

    return {
        get on() { return face.visible; },
        setPower(on) {
            if (on) ensureTexture();
            face.visible = on;
            /* 屋里是漫画滤镜 + 二十盏灯，屏幕得靠自发光才「亮」得起来；
               0.92 是压着不让它进 bloom 过曝的那一档。 */
            mat.emissiveIntensity = on ? 0.92 : 0;
        },
        dispose() {
            screen.mesh.remove(face);
            geo.dispose(); mat.dispose(); tex?.dispose();
        },
    };
}
