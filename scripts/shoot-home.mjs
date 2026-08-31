/* 给屋里那台电脑拍一张首页快照。
 *
 * 为什么要这张图：/my-apt 那块显示器分两态 ——
 *   · 开着（任何角度都看得见）：屏面是一张**贴图**。它是普通几何体，所以会被
 *     椅背、笔记本上盖正确遮挡，走到屋里哪儿都看得见。
 *   · 坐下（能操作）：CSS3D 层里的真 iframe 盖上来。
 * 远景那一态非用截图不可 —— 浏览器不让把一个文档的像素读进 WebGL 贴图，
 * html2canvas 那类光栅化既不带交互也还原不准。而远景本来也不需要操作。
 *
 * 用本机的 Chrome 拍，**不装任何依赖**（playwright 那一套要下 150MB 的
 * chromium，为一张图不值当）。转 webp 用的 sharp 项目里已经有了。
 *
 * 首页改了版就重跑一次，和 fetch-cover.mjs / fetch-preview.mjs 一个路数：
 *
 *     npm run dev                     # 另开一个终端
 *     node scripts/shoot-home.mjs
 *
 * 也可以直接拍线上的：
 *
 *     node scripts/shoot-home.mjs https://huangweiran.club/
 */

import { execFile } from 'node:child_process';
import { mkdir, unlink, access } from 'node:fs/promises';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';

const run = promisify(execFile);

/* 1280 是和 3D 那边说好的：webscreen.js 里的 iframe 也是 1280 CSS 像素宽。
   两态换手时版式是同一套，坐下的那一下画面不会跳。
   高度按那块屏的实际长宽比 0.724 : 0.412 算。 */
const W = 1280;
const H = Math.round(W * (0.412 / 0.724));

const CHROMES = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
];

const url = process.argv[2] || 'http://localhost:4321/';
const out = path.resolve('public/travel/screens/home.webp');

const chrome = process.env.CHROME_PATH || await (async () => {
    for (const c of CHROMES) {
        try { await access(c); return c; } catch { /* 下一个 */ }
    }
    return null;
})();

if (!chrome) {
    console.error('没找到 Chrome / Chromium / Edge。装一个，或者用 CHROME_PATH=... 指给我。');
    process.exit(1);
}

const png = path.join(tmpdir(), `home-shot-${process.pid}.png`);
await mkdir(path.dirname(out), { recursive: true });

console.log(`拍 ${url} …`);
await run(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    /* 2× 拍，缩回 1× 存 —— 直接按 1× 拍的话字的边缘是糊的，
       缩一道相当于一次超采样，在屏幕那么小的一块上差别看得出来。 */
    '--force-device-scale-factor=2',
    `--window-size=${W},${H}`,
    /* 首页有入场动画，还要现拉几张封面图和 Google Fonts。
       虚拟时间给足 8 秒，拍到的才是稳定之后的样子，不是动画拍到一半。 */
    '--virtual-time-budget=8000',
    `--screenshot=${png}`,
    url,
], { maxBuffer: 1 << 24 }).catch((e) => {
    // headless Chrome 在 macOS 上必定往 stderr 吐一堆 CVDisplayLink 的报错，
    // 但图照样写出来了 —— 所以这儿不能见 stderr 就退出。
    if (!e.stdout && !e.stderr) throw e;
});

const sharp = (await import('sharp')).default;
const info = await sharp(png).resize(W).webp({ quality: 88 }).toFile(out);
await unlink(png).catch(() => {});

console.log(`→ ${path.relative(process.cwd(), out)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)}KB`);
