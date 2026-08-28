/* ============================================================================
   声音。两处：钢琴（点一个键响一声）和唱机（放一张唱片）。

   钢琴用的是真采样（Salamander Grand Piano，CC-BY 3.0，见下面钢琴那一段），
   每 6 个半音一个样本、中间靠变调补，一共 700KB。
   唱机放的是站上已经有的那支 MP3（首页播放器同一个文件），不另外引进音源。

   位置感交给 PannerNode：钢琴的声音从窗边来，唱片的声音从北墙那两只音箱来，
   人走近走远、转个身，音量和左右都跟着变。相机的位置每帧喂给 listener。

   浏览器要求 AudioContext 必须在**用户手势里**创建/恢复，所以所有入口都从
   点击里调用，ensureAudio() 每次都顺手 resume 一下。
   ========================================================================== */

let ctx = null;
let master = null;

/** 建（或恢复）音频上下文。必须在点击这类手势里调用，否则浏览器不给声。 */
export function ensureAudio() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

/** 一个「摆在屋里某处」的声源。返回的节点当输入用，接进去就有位置感。 */
function spot(x, y, z, { ref = 1.1, rolloff = 1.15 } = {}) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = rolloff;
    p.maxDistance = 30;
    if (p.positionX) {
        p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    } else {
        p.setPosition(x, y, z);                       // 老 Safari
    }
    p.connect(master);
    return p;
}

/** 每帧把耳朵搬到相机上。forward 是相机的朝向（单位向量）。 */
export function updateListener(px, py, pz, fx, fy, fz) {
    if (!ctx) return;
    const l = ctx.listener;
    if (l.positionX) {
        l.positionX.value = px; l.positionY.value = py; l.positionZ.value = pz;
        l.forwardX.value = fx; l.forwardY.value = fy; l.forwardZ.value = fz;
        l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
        l.setPosition(px, py, pz);
        l.setOrientation(fx, fy, fz, 0, 1, 0);
    }
}

const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- 钢琴 ----------
   真采样，不是合成器。音源是 Salamander Grand Piano（Alexander Holm，
   CC-BY 3.0），从 nbrosowsky/tonejs-instruments 的 mp3 转码版取的，
   抓取和裁剪见 scripts/fetch-piano-samples.mjs。

   每 6 个半音存一个样本，中间的音用 playbackRate 变调补 —— 最多差 ±3 个
   半音。88 个键各存一个要 30MB，这样只要 700KB。

   为什么不继续用合成器：正弦叠加出来的电钢琴音色就是廉价，锤击的噪声、
   琴弦的互相共鸣、每个音区不同的泛音结构，这些叠正弦叠不出来。 */

const PIANO_DIR = '/travel/piano';
const PIANO_SAMPLES = [24, 27, 33, 39, 45, 51, 57, 63, 69, 75, 81, 87, 93, 99, 108];

let pianoBus = null;
let pianoBuffers = null;        // Map<midi, AudioBuffer>
let pianoLoading = null;

/** 把整套采样拉下来解码。开电源那一下调用 —— 关着的琴不用先下 700KB。 */
export function preloadPiano() {
    const c = ensureAudio();
    if (!c || pianoLoading) return pianoLoading;
    pianoBuffers = new Map();
    pianoLoading = Promise.all(PIANO_SAMPLES.map(async (midi) => {
        try {
            const res = await fetch(`${PIANO_DIR}/${midi}.mp3`);
            if (!res.ok) return;
            pianoBuffers.set(midi, await c.decodeAudioData(await res.arrayBuffer()));
        } catch { /* 少一个样本就由邻近的顶上，不至于整台琴哑掉 */ }
    }));
    return pianoLoading;
}

/** 离目标音最近的那个采样 */
function nearestSample(midi) {
    let best = null, bestD = Infinity;
    for (const m of pianoBuffers.keys()) {
        const d = Math.abs(m - midi);
        if (d < bestD) { bestD = d; best = m; }
    }
    return best;
}

/** 现在的音频时钟。自动演奏要按它排，不能按 rAF —— 差 16ms 在十六分音符上听得出来。 */
export function audioNow() {
    const c = ensureAudio();
    return c ? c.currentTime : 0;
}

/* 还在响的音。自动演奏要能中途叫停，见 stopPianoVoices()。 */
const voices = new Set();

/** @param when 绝对的 AudioContext 时刻。留空 = 立刻（点琴键那条路）。 */
export function playPianoNote(midi, velocity = 0.85, at = [3.75, 0.78, 0.0], when = 0) {
    const c = ensureAudio();
    if (!c) return;
    if (!pianoBuffers) { preloadPiano(); return; }        // 第一下正好在下载，吞掉
    if (!pianoBus) pianoBus = spot(at[0], at[1], at[2], { ref: 1.4, rolloff: 1.0 });

    const src = nearestSample(midi);
    if (src == null) return;
    const buf = pianoBuffers.get(src);
    if (!buf) return;

    const t = Math.max(c.currentTime + 0.001, when || 0);
    const v = Math.max(0.05, Math.min(1, velocity));

    const node = c.createBufferSource();
    node.buffer = buf;
    node.playbackRate.value = Math.pow(2, (midi - src) / 12);

    /* 力度不只是音量：弹得轻，高频泛音本来就少。
       所以顺带把低通往下拉一点，不然小声的音听着只是「同一下变小」。 */
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600 + v * v * 14000;

    const g = c.createGain();
    g.gain.value = v * 0.9;

    node.connect(lp).connect(g).connect(pianoBus);
    node.start(t);

    /* 自动演奏要能中途叫停。采样是一按到底、没有 note-off 的（对慢板来说
       约等于一直踩着延音踏板，是对的），但点「停」之后还响五六秒就不对了。
       所以每个音都登记一下，stopPianoVoices() 统一淡出。 */
    const voice = { node, gain: g };
    voices.add(voice);
    node.onended = () => voices.delete(voice);
}

/** 把还在响的音全部淡出掉。停止自动演奏时用。 */
export function stopPianoVoices(fade = 0.35) {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const v of voices) {
        try {
            v.gain.gain.cancelScheduledValues(t);
            v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0001), t);
            v.gain.gain.exponentialRampToValueAtTime(0.0001, t + fade);
            v.node.stop(t + fade + 0.02);
        } catch { /* 已经停了 */ }
    }
    voices.clear();
}

/* ---------- 唱机 ----------
   放的是站上本来就有的那首 Frank Ocean《Pink + White》（/music/ 下那支，
   首页播放器也在用同一个文件）。走 <audio> + MediaElementSource：
   MP3 七兆多，不做成 decodeAudioData 一次性解码，边下边放。

   外面再罩两层「这是从唱机出来的」：
     · 一层唱片底噪（嘶声 + 稀疏的啪）
     · 一道低通，隔着半间屋子听音箱，高频本来就掉了
   两只音箱各接一个 PannerNode，人走过去左右和音量都跟着变。 */

const TRACK = '/music/Frank Ocean - Pink + White.mp3';

let vinyl = null;   // { el, src, bus, noise }

function noiseBuffer(c, seconds) {
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.12;
    // 稀疏的「啪」：唱片上的划痕，比连续的嘶声更像黑胶
    for (let n = 0; n < seconds * 24; n++) {
        const i = Math.floor(Math.random() * (d.length - 60));
        const amp = 0.25 + Math.random() * 0.6;
        for (let k = 0; k < 40; k++) d[i + k] += amp * Math.exp(-k / 7) * (Math.random() * 2 - 1);
    }
    return buf;
}

/** 开始放唱片。speakers 是两只音箱的世界坐标。 */
export function startRecord(speakers) {
    const c = ensureAudio();
    if (!c || vinyl) return;

    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, c.currentTime);
    bus.gain.exponentialRampToValueAtTime(1.0, c.currentTime + 0.8);
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 5200;
    bus.connect(tone);
    // 每次开唱都新建两个 PannerNode，停的时候要一起断开，不然反复开关会攒一堆
    const panners = speakers.map(([x, y, z]) => spot(x, y, z, { ref: 1.6, rolloff: 1.1 }));
    for (const p of panners) tone.connect(p);

    // 唱片底噪
    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer(c, 3.1);
    noise.loop = true;
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2600;
    nf.Q.value = 0.6;
    const ng = c.createGain();
    ng.gain.value = 0.13;
    noise.connect(nf).connect(ng).connect(bus);
    noise.start();

    /* 音乐本体。crossOrigin 要在 src 之前设，否则 MediaElementSource 会被
       当成跨域静音（同源其实用不着，留着以防以后换 CDN）。 */
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.loop = true;
    el.preload = 'auto';
    el.src = TRACK;
    const src = c.createMediaElementSource(el);
    const musicGain = c.createGain();
    musicGain.gain.value = 0.85;
    src.connect(musicGain).connect(bus);
    const play = el.play();
    if (play?.catch) play.catch(() => { /* 用户手势不算数就只剩底噪，不报错 */ });

    vinyl = { el, src, bus, noise, tone, panners };
}

export function stopRecord() {
    if (!vinyl || !ctx) return;
    const v = vinyl;
    vinyl = null;
    const t = ctx.currentTime;
    v.bus.gain.cancelScheduledValues(t);
    v.bus.gain.setValueAtTime(v.bus.gain.value, t);
    v.bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    setTimeout(() => {
        try { v.noise.stop(); } catch { /* 已经停了 */ }
        try { v.el.pause(); v.el.src = ''; } catch { /* 同上 */ }
        try { v.src.disconnect(); } catch { /* 同上 */ }
        try {
            v.tone.disconnect();
            for (const p of v.panners) p.disconnect();
        } catch { /* 同上 */ }
    }, 700);
}

export function isRecordPlaying() {
    return !!vinyl;
}

export function disposeAudio() {
    stopRecord();
    stopPianoVoices(0.05);
    if (ctx) { ctx.close(); ctx = null; master = null; pianoBus = null; }
}
