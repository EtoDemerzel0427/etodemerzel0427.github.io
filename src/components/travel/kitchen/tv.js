/* ============================================================================
   电视上放什么 —— PS5 的主界面。

   为什么是这个：屋里唱机旁边的地上**本来就立着一台 PS5**（living.js
   buildMedia 里那台光驱版）。一台接着电视的游戏机，电视上该有的画面就是它的
   主界面 —— 现实里客厅那块屏九成时间也是这个样子。不用另外找内容，也不会
   像播比分那样一周只有两场、其余时间盯着一张不动的板子。

   画的是**这台机器上真有的东西**：游戏封面取自 public/library/games/，
   和站点首页那张 GameCard 同一份素材；角标那颗 PS 标取自
   public/travel/playstation-mark.svg。素材没到就退成色块，不报错。

   和右桌那块屏一样走 CanvasTexture：它是真几何体，沙发、茶几挡住就是挡住。
   ========================================================================== */

import * as THREE from 'three';

const W = 1280, H = 725;                 // 电视屏面 1.43 × 0.81，长宽比 1.765

const BG_TOP = '#1a56a8';
const BG_BOT = '#0b2a44';

/** 载一张图，失败就给 null —— 素材缺席不该让整块屏黑掉。 */
function load(src) {
    return new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
    });
}

export function createTv(screen, {
    art = '/library/games/ea-sports-fc-26-banner-web.jpg',
    mark = '/travel/playstation-mark.svg',
    title = 'EA SPORTS FC 26',
} = {}) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const face = new THREE.Mesh(
        new THREE.PlaneGeometry(screen.w, screen.h),
        new THREE.MeshStandardMaterial({
            map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0,
            roughness: 0.28, metalness: 0,
            /* 内容面和屏面板**几乎共面**，光靠位置差躲不开深度冲突 —— 镜头一动
               两个面就争先后，画面整片闪。polygonOffset 在光栅化那一步把它
               往前挪一点深度，不用真把它挪出壳外。 */
            polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        }),
    );
    /* 这块屏朝 -Z（对着沙发），平面默认朝 +Z，所以绕 Y 转 180°。
       转完平面自身的 +X 落在世界 -X 上 —— 正好是坐在沙发上时的右手边，
       画面不会左右翻。 */
    face.rotation.y = Math.PI;
    face.position.z = -0.0042;
    face.visible = false;
    face.userData.ghost = true;
    face.userData.isOutline = true;
    screen.mesh.add(face);

    let artImg = null, markImg = null;
    let clock = '';
    /* off → boot → home。真机按下电源不是「唰一下出主界面」：黑屏一小会儿，
       PS 标浮出来，底下扫过一道蓝，然后才是主界面。 */
    let phase = 'off', bootT = 0;
    const BOOT = 2.4;

    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

    function draw() {
        // 底：PS5 那种从上到下变深的蓝
        const grad = g.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, BG_TOP); grad.addColorStop(1, BG_BOT);
        g.fillStyle = grad; g.fillRect(0, 0, W, H);

        /* 选中那款游戏的大图铺在上半部，再压一层从下往上的黑到透明 ——
           PS5 主界面就是这么把标题压在图上的。 */
        if (artImg) {
            const s = Math.max(W / artImg.width, (H * 0.72) / artImg.height);
            const dw = artImg.width * s, dh = artImg.height * s;
            g.drawImage(artImg, (W - dw) / 2, -dh * 0.06, dw, dh);
            /* 压暗层只铺在**要放字的那两条**上，不铺满整块屏。
               之前为了让标题和状态栏读得出来把整张图压掉七成，结果整台电视
               看着像台老彩电 —— 而现实里一台亮着的电视是屋里最亮的东西。 */
            const veil = g.createLinearGradient(0, H * 0.52, 0, H);
            veil.addColorStop(0, 'rgba(6,20,38,0)');
            veil.addColorStop(0.55, 'rgba(6,20,38,0.62)');
            veil.addColorStop(1, 'rgba(6,20,38,0.90)');
            g.fillStyle = veil; g.fillRect(0, H * 0.52, W, H * 0.48);
            const top = g.createLinearGradient(0, 0, 0, H * 0.16);
            top.addColorStop(0, 'rgba(6,20,38,0.55)');
            top.addColorStop(1, 'rgba(6,20,38,0)');
            g.fillStyle = top; g.fillRect(0, 0, W, H * 0.16);
        }

        // 顶栏：左边一排小圆（游戏 / 媒体切换），右边是时间和头像
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 3; i++) { rr(64 + i * 46, 42, 30, 30, 8); g.fill(); }
        g.globalAlpha = 0.45; rr(64 + 3 * 46, 42, 30, 30, 8); g.fill(); g.globalAlpha = 1;

        g.font = '500 26px ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif';
        g.textBaseline = 'middle'; g.textAlign = 'right';
        g.fillStyle = 'rgba(255,255,255,0.92)';
        g.fillText(clock, W - 132, 57);
        g.fillStyle = '#4a7fd0';                       // 头像
        g.beginPath(); g.arc(W - 84, 57, 22, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.font = '700 22px ui-sans-serif, system-ui, sans-serif';
        g.textAlign = 'center'; g.fillText('W', W - 84, 58);

        // 选中那款的名字 + 一行「继续游戏」
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillStyle = '#ffffff';
        g.font = '700 52px ui-sans-serif, system-ui, -apple-system, sans-serif';
        g.fillText(title, 64, H - 236);
        g.fillStyle = 'rgba(255,255,255,0.62)';
        g.font = '500 24px ui-sans-serif, system-ui, sans-serif';
        g.fillText('继续游戏', 64, H - 196);

        /* 底下那一排卡片。第一张是选中的（大一圈 + 白边），
           后面几张按 PS5 那种「已安装但没点开」的灰蓝底给。 */
        const TY = H - 158, TH2 = 112;
        const tiles = [
            { w: 150, art: true },
            { w: 112, c: '#1c3f6e' }, { w: 112, c: '#20496b' },
            { w: 112, c: '#173252' }, { w: 112, c: '#1b3a5e' },
        ];
        let tx = 64;
        for (let i = 0; i < tiles.length; i++) {
            const t = tiles[i];
            const y = i === 0 ? TY - 14 : TY, h = i === 0 ? TH2 + 14 : TH2;
            g.save();
            rr(tx, y, t.w, h, 10); g.clip();
            if (t.art && artImg) {
                const s = Math.max(t.w / artImg.width, h / artImg.height);
                g.drawImage(artImg, tx + (t.w - artImg.width * s) / 2, y + (h - artImg.height * s) / 2,
                    artImg.width * s, artImg.height * s);
            } else {
                g.fillStyle = t.c || '#1c3f6e'; g.fillRect(tx, y, t.w, h);
            }
            g.restore();
            if (i === 0) {
                g.strokeStyle = '#ffffff'; g.lineWidth = 3;
                rr(tx - 1.5, y - 1.5, t.w + 3, h + 3, 11); g.stroke();
            }
            tx += t.w + 18;
        }
        // 最后一格：PS Store 位，摆那颗 PS 标
        if (markImg) {
            const mh = 46, mw = mh * (markImg.width / markImg.height || 1.29);
            g.globalAlpha = 0.9;
            g.drawImage(markImg, W - 64 - mw, TY + (TH2 - mh) / 2, mw, mh);
            g.globalAlpha = 1;
        }

        tex.needsUpdate = true;
    }

    /** 开机那两秒：黑底 + 浮出来的 PS 标 + 一道蓝色扫光。 */
    function drawBoot(t) {
        g.fillStyle = '#000000'; g.fillRect(0, 0, W, H);
        const k = Math.min(1, t / 0.9);                       // 标浮出来
        if (markImg && k > 0) {
            const mh = 118, mw = mh * (markImg.width / markImg.height || 1.29);
            g.save();
            g.globalAlpha = k;
            // 微微放大，读作「亮起来」而不是「贴上去」
            const sc = 0.94 + 0.06 * k;
            g.translate(W / 2, H / 2 - 20);
            g.scale(sc, sc);
            g.filter = 'brightness(3)';                        // 素材本身是深灰的，开机标是白的
            g.drawImage(markImg, -mw / 2, -mh / 2, mw, mh);
            g.restore();
        }
        // 后半段底下扫过一道蓝
        if (t > 1.0) {
            const p = Math.min(1, (t - 1.0) / (BOOT - 1.0));
            const cx = W * (-0.2 + 1.4 * p);
            const sweep = g.createRadialGradient(cx, H * 0.78, 0, cx, H * 0.78, W * 0.34);
            sweep.addColorStop(0, `rgba(70,170,255,${0.45 * (1 - Math.abs(p - 0.5) * 1.6)})`);
            sweep.addColorStop(1, 'rgba(70,170,255,0)');
            g.fillStyle = sweep; g.fillRect(0, H * 0.5, W, H * 0.5);
        }
        tex.needsUpdate = true;
    }

    const tick = () => {
        const d = new Date();
        const next = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        if (next === clock) return false;
        clock = next;
        return true;
    };

    tick();
    draw();
    // 素材各自到位各自重画一次；没到就一直是色块版，不影响能不能开机
    load(art).then((i) => { if (i) { artImg = i; draw(); } });
    load(mark).then((i) => { if (i) { markImg = i; draw(); } });

    let since = 0;
    return {
        get on() { return face.visible; },
        setPower(on) {
            face.visible = on;
            /* 1.5 而不是 1：屋里过一道漫画滤镜（色阶量化 + 暗角），
               按 1 给出来的电视在这间暗屋里读作「屏幕蒙了层灰」。
               一台开着的电视应该是全屋最亮的一块。 */
            face.material.emissiveIntensity = on ? 1.5 : 0;
            if (on) { phase = 'boot'; bootT = 0; drawBoot(0); }
            else { phase = 'off'; }
        },
        /** 开机走到第几步（0→1）。PS5 主机上那条灯带跟着它走。 */
        get boot() { return phase === 'boot' ? Math.min(1, bootT / BOOT) : phase === 'home' ? 1 : 0; },
        update(dt) {
            if (!face.visible) return;
            if (phase === 'boot') {
                bootT += dt;
                if (bootT >= BOOT) { phase = 'home'; tick(); draw(); }
                else drawBoot(bootT);
                return;
            }
            // 只有分钟真的跳了才重画；每帧重排一次版是白费
            since += dt;
            if (since < 5) return;
            since = 0;
            if (tick()) draw();
        },
        dispose() {
            screen.mesh.remove(face);
            face.geometry.dispose(); face.material.dispose(); tex.dispose();
        },
    };
}
