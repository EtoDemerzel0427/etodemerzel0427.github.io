/* ============================================================================
   自动演奏：把一份 ABC 记谱变成「屋里那台电钢琴自己弹一遍」。

   分三件事，互相不耦合：

     1. buildScore()      ABC → 一条按时间排好的音符表（秒 / MIDI 音高 / 力度）
     2. createRecital()   按音频时钟把这张表排出去，顺带回调「这个键该沉下去了」
     3. sheetTexture()    把同一份谱子排版成一张纸，贴到谱架上那块平面上

   为什么调度要按 AudioContext 的时钟、而不是 rAF：这份谱子里有成串的十六分音符
   （72bpm 下一个 83ms），rAF 的 16ms 抖动落在那种句子上是听得出来的。所以音**提前**
   按绝对时刻排给 WebAudio（它自己有采样级的精度），**琴键**才跟着 rAF 走 —— 眼睛
   对 16ms 没意见。两边读的是同一个时钟，所以五分钟下来也不会漂。
   ========================================================================== */

import * as THREE from 'three';
import { audioNow, playPianoNote, stopPianoVoices } from './audio.js';

/** abcjs 一百多 KB，只在真去翻那张谱子的时候才拉。 */
let abcjsPromise = null;
export function loadAbcjs() {
    if (!abcjsPromise) {
        abcjsPromise = import('abcjs')
            .then((m) => m.default || m)
            // 失败了要把缓存清掉。留着一个已 reject 的 promise，之后每次
            // 重试都会立刻拿到同一个失败，这张谱子就再也打不开了。
            .catch((e) => { abcjsPromise = null; throw e; });
    }
    return abcjsPromise;
}

/* ---------- 1. 谱 → 音符表 ---------- */

/** abcjs 的 start / duration 以**全音符**为单位；tempo 是每分钟多少四分音符。 */
const unitToSec = (tempo) => (60 / tempo) * 4;

/**
 * 每个音是哪只手弹的。钢琴谱两行谱表：上面那行右手，下面那行左手。
 *
 * 认**谱表**，不认谱号 —— 这份谱子里左手那行有好几处临时改成高音谱号
 * （`[V:LHupper clef=treble]`，左手爬到中央 C 以上那几句），照谱号分会把
 * 那几句判给右手。
 *
 * @returns {{ handOf: Map<number, 0|1>, staves: number }} startChar → 0 右手 / 1 左手。
 *          只有一行谱表的谱子（单声部旋律）没有左右手可分，表是空的
 */
function handsByChar(tune) {
    const handOf = new Map();
    let staves = 1;
    for (const line of tune.lines || []) {
        const sts = line.staff || [];
        staves = Math.max(staves, sts.length);
        for (let s = 0; s < sts.length; s++) {
            for (const voice of sts[s].voices || []) {
                for (const el of voice) {
                    if (el.el_type !== 'note' || el.startChar == null) continue;
                    handOf.set(el.startChar, s > 0 ? 1 : 0);
                }
            }
        }
    }
    return { handOf: staves > 1 ? handOf : new Map(), staves };
}

/**
 * @param abcjs   loadAbcjs() 的结果
 * @param abc     ABC 源码
 * @param qpm     每分钟多少四分音符。留空 = 用谱面自带的 Q:（没写就是 abcjs 的 180）
 * @returns {{ tune, notes, duration, tempo, staves }}
 * @throws 谱子解不开、或者一个音都没有
 */
export function buildScore(abcjs, abc, qpm) {
    const tune = abcjs.parseOnly(abc)[0];
    if (!tune) throw new Error('这段 ABC 解不开');
    const audio = tune.setUpAudio(qpm ? { qpm } : {});
    const k = unitToSec(audio.tempo);
    const { handOf, staves } = handsByChar(tune);

    const notes = [];
    for (const track of audio.tracks) {
        for (const e of track) {
            if (e.cmd !== 'note') continue;
            notes.push({
                midi: e.pitch,
                t: e.start * k,
                dur: Math.max(0.06, e.duration * k),
                // abcjs 的 volume 是 0..127 那一路；除以 120 之后落在 0.7..0.88，
                // 和点琴键那条路（0.72..0.92）是同一个力度区间
                vel: Math.min(1, (e.volume || 95) / 120),
                // 这个音在 ABC 源码里的位置。点谱面跳播时拿它对时间，见 timeAtChar()
                startChar: e.startChar,
                endChar: e.endChar,
                hand: handOf.get(e.startChar) || 0,      // 0 右手 / 1 左手
            });
        }
    }
    if (!notes.length) throw new Error('这份谱子里一个音都没有');
    notes.sort((a, b) => a.t - b.t);
    return { tune, notes, duration: audio.totalDuration * k, tempo: audio.tempo, staves };
}

/**
 * 谱面上第 char 个字符，落在曲子的第几秒。点谱面跳播用的：abcjs 只能告诉我们
 * 被点的是源码里哪一段，秒数得回音符表里换。
 *
 * 点中的那一下不一定有声音 —— 休止符、连音线后半截的那个音头、装饰音的尾巴，
 * 谱面上都是一个能点的东西，音符表里却没有对应的条目。所以对不上就退一步，
 * 找字符位置最近的那个音：谱面上挨着的，时间上也挨着。
 *
 * @param score buildScore() 的结果
 * @param char  abcjs 给的 startChar
 * @param near  现在弹到第几秒。同一个字符往往对上好几个音（和弦里的几个音头、
 *              走两遍的段落），拿它挑离当下最近的那一次
 * @returns 秒；一个音都对不上就是 null
 */
export function timeAtChar(score, char, near = 0) {
    if (!Number.isFinite(char)) return null;
    let best = null, bestGap = Infinity, bestDt = Infinity;
    for (const n of score.notes) {
        if (n.startChar == null) continue;
        // 落在这个音自己那段字符里 = 正好点中它，不用比远近
        const gap = char >= n.startChar && char < (n.endChar ?? n.startChar + 1)
            ? 0 : Math.abs(n.startChar - char);
        const dt = Math.abs(n.t - near);
        if (gap < bestGap || (gap === bestGap && dt < bestDt)) {
            best = n; bestGap = gap; bestDt = dt;
        }
    }
    return best ? best.t : null;
}

/** 从 ABC 头里抠出曲名 / 作者，给面板当标题用。 */
export function abcMeta(abc) {
    const field = (k) => abc.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '';
    return { title: field('T') || '没有名字的谱子', composer: field('C') };
}

/* ---------- 2. 调度 ---------- */

const LEAD = 0.6;         // 按下播放到第一个音之间的空当：给解码留余量，也是个起手
const LATE = 0.05;        // 比这还晚的音就别补了（机器睡过一觉回来会攒一堆）

/* 排音的活儿**不能跟着 rAF 走**。标签页切到后台，浏览器就把 rAF 停了；排音一停，
   WebAudio 队列里那点存货放完就没声了，切回来还发现中间那一段全过期被跳掉 ——
   听上去正是「切走一下，曲子停了，或者停了一半」。

   所以给它一个自己的定时器。后台标签页的 setInterval 会被压到一秒一次（正在出声
   的页面不吃 Chrome 那套更狠的节流），所以前瞻量要盖得住这一秒：存 2.5 秒的货、
   250ms 喂一次，就算被压到一秒一次也还剩一秒半余量。
   **琴键**照旧跟 rAF —— 页面看不见的时候没有键要按。 */
const LOOKAHEAD = 2.5;
const PUMP_MS = 250;

/**
 * @param score   buildScore() 的结果
 * @param onNote  (midi, durSec, hand) —— 这个键现在该沉下去，沉多久，哪只手
 * @param onEnd   最后一个音响完
 * @param at      琴在屋里的坐标，给 PannerNode
 */
export function createRecital(score, { onNote, onEnd, at } = {}) {
    let t0 = 0;
    let audioIdx = 0, keyIdx = 0;
    let running = false;
    let held = 0;             // 没在弹的时候停在第几秒
    let pump = 0;             // 排音那个定时器

    /* 手弹不会正好压在格子上。±7ms 听不出是「抖」，但少了它整首曲子是打字机。
       用音符下标算，不用 Math.random —— 同一首每次弹出来一样，调起来才有准。 */
    const jitter = (i) => (((i * 2654435761) % 1000) / 1000 - 0.5) * 0.014;

    /** 把两个游标挪到 from 秒那一刻。音符表是按时间排好的，扫一遍就够。 */
    function seekCursors(from) {
        let i = 0;
        while (i < score.notes.length && score.notes[i].t < from) i++;
        audioIdx = keyIdx = i;
    }

    const pos = () => (running ? audioNow() - t0 : held);

    /** 把下一段的音排给 WebAudio。游标幂等，谁叫都行。 */
    function schedule() {
        if (!running) return;
        const now = audioNow() - t0;
        const { notes } = score;
        while (audioIdx < notes.length && notes[audioIdx].t <= now + LOOKAHEAD) {
            const i = audioIdx++;
            const n = notes[i];
            const when = t0 + n.t + jitter(i);
            // 机器睡过一觉回来，这一段的音全过期了 —— 跳过，别一起炸响
            if (when < audioNow() - LATE) continue;
            playPianoNote(n.midi, n.vel, at, when);
        }
        /* 最后一个音还要响一会儿才算完。这一判也在定时器里，所以页面在后台
           也能自己走到头；弹完归零 —— 停在末尾的话，下次按「接着弹」是从
           终点接着，等于什么也不弹。 */
        if (now > score.duration + 2.0) {
            stopPump();
            running = false;
            held = 0;
            seekCursors(0);
            onEnd?.();
        }
    }
    const startPump = () => { if (!pump) pump = setInterval(schedule, PUMP_MS); };
    const stopPump = () => { if (pump) { clearInterval(pump); pump = 0; } };

    return {
        duration: score.duration,
        get running() { return running; },
        /** 弹到第几秒。停下之后保持不动，所以接着弹接得回去。起手那一小段是负的。 */
        get position() { return pos(); },

        /** 从 from 秒起弹。留空 = 从停下的地方接着。 */
        play(from) {
            const t = Math.max(0, Math.min(score.duration, from ?? held));
            /* 队列里可能还压着两秒半的存货（拖进度条就是这种情况），不清掉的话
               新旧两段会叠着响。 */
            stopPianoVoices(0.12);
            seekCursors(t);
            /* 从头起手要留 LEAD 那点空当（也给采样解码留余量）；接着弹就不留，
               「继续」按下去还等半秒会读作卡了一下。 */
            t0 = audioNow() + (t > 0.01 ? 0.12 : LEAD) - t;
            held = t;
            running = true;
            startPump();
            schedule();          // 别等第一个 tick，起手那几个音现在就排出去
        },

        /** 停在当前位置，接着弹能接回去。 */
        pause() {
            if (!running) return;
            held = Math.max(0, pos());
            running = false;
            stopPump();
            stopPianoVoices(0.45);
        },

        /** 回到开头。 */
        reset() {
            running = false;
            held = 0;
            stopPump();
            seekCursors(0);
            stopPianoVoices(0.35);
        },

        /** 每帧调一次：只管琴键。声音是定时器排的，见 schedule()。 */
        tick() {
            if (!running) return;
            const now = audioNow() - t0;
            const { notes } = score;
            while (keyIdx < notes.length && notes[keyIdx].t <= now) {
                const n = notes[keyIdx++];
                // 从后台切回来，这一段的键早该松了 —— 补按一屏没有意义
                if (n.t < now - 0.2) continue;
                onNote?.(n.midi, n.dur, n.hand);
            }
        },
    };
}

/* ---------- 3. 那张纸 ----------
   贴图不是画出来的假谱线，是 abcjs **真排一遍**，再把矢量图画到 canvas 上。
   纸上摊着的就是 notes 里那份谱子的第一页 —— A4 竖版，排版排到哪儿算哪儿，
   底下的行自然被裁掉，跟真谱子翻开一页是一回事。

   纸的**轮廓也画在贴图里**，不是外面套一圈几何体。套几何体做出来的是个
   画框：四条边一样粗、一样直、四个角一样方，读作「一块牌子」而不是
   「一张纸」。画在贴图里就能让每条边各走各的 —— 稍微不平行、边上有起伏、
   墨线时粗时细、收笔处淡下去。四周留一圈透明，所以纸的**外形**由这条
   路径决定，不是画布那个矩形。 */

const PAGE_W = 794, PAGE_H = 1123;   // A4 @ 96dpi
const PAGE_PAD = 30;                 // 四周留白：纸边不齐和墨线都在这一圈里

/** 贴图比纸本身大出来的倍数。living.js 建平面时要按这个放大，
 *  放大之后**纸**才是 A4，画布那圈留白落在纸外面。 */
export const SHEET_BLEED = {
    x: (PAGE_W + PAGE_PAD * 2) / PAGE_W,
    y: (PAGE_H + PAGE_PAD * 2) / PAGE_H,
};

/** 固定序列的伪随机。同一份谱子每次生成的纸边一样，不会刷新一次换个形状。 */
function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

/* 采样点沿边的分布。**两头挤在一起**是关键：下面走的是穿中点的二次贝塞尔，
   拐点的圆角半径就是相邻两段的长度，均匀分段的话四个角会被抹成一个圆角矩形
   ——读作贴纸，不是纸。角上两段只有百分之一条边长，角就还是角。 */
const EDGE_TS = [0, 0.012, 0.15, 0.29, 0.44, 0.58, 0.72, 0.86, 0.988];

/** 一张手裁纸的轮廓。四条边各自起伏，四个角各歪各的。 */
function paperPath(ctx, x0, y0, w, h, rnd) {
    const AMP = 2.6;                 // 边上起伏的幅度（像素）
    const pts = [];
    const side = (ax, ay, bx, by) => {
        const nx = -(by - ay), ny = bx - ax;        // 这条边的法线
        const len = Math.hypot(nx, ny) || 1;
        for (const t of EDGE_TS) {
            // 贴着角的那两个点不抖，抖了角就散了
            const d = t < 0.05 || t > 0.95 ? 0 : (rnd() - 0.5) * 2 * AMP;
            pts.push([ax + (bx - ax) * t + (nx / len) * d, ay + (by - ay) * t + (ny / len) * d]);
        }
    };
    // 四个角各自偏一点，纸就不是个标准矩形了 —— 但只偏一点点，纸不是梯形
    const c = () => (rnd() - 0.5) * 2 * 2.5;
    const p1 = [x0 + c(), y0 + c()], p2 = [x0 + w + c(), y0 + c()];
    const p3 = [x0 + w + c(), y0 + h + c()], p4 = [x0 + c(), y0 + h + c()];
    side(...p1, ...p2); side(...p2, ...p3); side(...p3, ...p4); side(...p4, ...p1);

    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    // 走二次贝塞尔穿过中点：直接连折线会读成锯齿，纸边应该是软的
    for (let i = 1; i <= pts.length; i++) {
        const a = pts[i % pts.length], b = pts[(i + 1) % pts.length];
        ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
    return pts;
}

/**
 * @param abcjs loadAbcjs() 的结果
 * @param abc   ABC 源码
 * @returns {Promise<THREE.CanvasTexture|null>}
 */
export async function sheetTexture(abcjs, abc) {
    /* abcjs 要量文字宽度（getBBox），元素必须真的在文档里 —— 挂在屏幕外，
       排完就摘掉。 */
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-10000px;top:0;width:760px;pointer-events:none;';
    document.body.appendChild(stage);

    try {
        abcjs.renderAbc(stage, abc, {
            staffwidth: 700,
            scale: 1,
            paddingtop: 18, paddingbottom: 18, paddingleft: 14, paddingright: 14,
            foregroundColor: '#23212b',
        });
        const svg = stage.querySelector('svg');
        if (!svg) return null;

        /* responsive 没开，abcjs 会把 width/height 写成属性；serialize 之前
           补一个 xmlns，否则当成 <img> 的源解不开。 */
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const svgW = Number(svg.getAttribute('width')) || 728;
        const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;

        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = src;
        });

        const c = document.createElement('canvas');
        c.width = PAGE_W + PAGE_PAD * 2;
        c.height = PAGE_H + PAGE_PAD * 2;
        const ctx = c.getContext('2d');

        // 纸形。种子跟着谱子的长度走 —— 换一份谱子就是另一张纸
        const rnd = seeded(abc.length * 2654435761);
        paperPath(ctx, PAGE_PAD, PAGE_PAD, PAGE_W, PAGE_H, rnd);

        ctx.save();
        ctx.clip();
        // 纸。纯白在这屋的暖光里会翻蓝，压成米色
        ctx.fillStyle = '#f6f1e4';
        ctx.fillRect(0, 0, c.width, c.height);
        // 按纸宽等比放，顶着上边画 —— 装不下的行就是「翻过去那一页」
        const scale = (PAGE_W - 24) / svgW;
        ctx.drawImage(img, PAGE_PAD + 12, PAGE_PAD + 10, img.width * scale, img.height * scale);
        ctx.restore();

        /* 墨线。描三遍、每遍粗细和透明度都不同，叠出来才是一条**手画的**线：
           一遍匀的线不管画得多抖，读起来还是「描边」。 */
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (const [w, alpha, seed] of [[3.4, 0.5, 11], [2.1, 0.85, 29], [1.2, 0.6, 47]]) {
            paperPath(ctx, PAGE_PAD, PAGE_PAD, PAGE_W, PAGE_H, seeded(abc.length + seed));
            ctx.lineWidth = w;
            ctx.strokeStyle = `rgba(30, 26, 44, ${alpha})`;
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        return tex;
    } catch {
        return null;               // 排不出来就还是一张空白纸，不至于把面板拖垮
    } finally {
        stage.remove();
    }
}
