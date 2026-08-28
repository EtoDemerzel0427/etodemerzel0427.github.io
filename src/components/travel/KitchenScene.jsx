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
/** 自己上传的那份谱子存在这个键下。换 key 就等于把所有人的清一次。 */
const ABC_KEY = 'fv-abc-1';

const mmss = (t) => {
    const n = Math.max(0, Math.floor(t));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/** 举在眼前那张谱子的页宽（米）。living.js 的 SHEET_W —— 两边都是 A4，
 *  这儿只拿它反推「离眼睛多远才占到画面的那么宽」。 */
const SHEET_PAGE_W = 0.210;
/** 看过开场引导的标记。换了 key 就等于对所有人再弹一次。 */
const GUIDE_KEY = 'fv-guide-seen-1';
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

/** @param {{ places?: Array<Record<string, any>>, things?: Array<Record<string, any>> }} props */
export default function KitchenScene({ places = [], things = [] }) {
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

    /* ---------- 谱子 ----------
       抽屉里那张。现在只有一份，所以直接取第一件 sheet；以后多起来了
       再让 3D 那边按 slug 认人。 */
    const sheetThing = useMemo(
        () => things.find((t) => t.kind === 'sheet' && t.sheet?.abc) || null,
        [things],
    );
    const [sheetOpen, setSheetOpen] = useState(false);   // 面板开着
    const [sheetFound, setSheetFound] = useState(false); // 翻出来过
    const [onRest, setOnRest] = useState(false);         // 已经架在谱架上
    const [playing, setPlaying] = useState(false);
    /* 没在弹的时候停在第几秒。只在停下/回到开头/弹完的时候更新一次 ——
       播放中的进度是直接写 DOM 的，不走 state（每帧 setState 会把整个组件
       连着那张 canvas 一起重调）。按钮上写「接着弹」还是「让它弹一遍」看它。 */
    const [holdAt, setHoldAt] = useState(0);
    const holdAtRef = useRef(0);
    holdAtRef.current = holdAt;
    /* 换速度时算好的新位置。停下那一下的清理会照 recital 报的秒数写 holdAt，
       会把这个值盖掉 —— 所以放在 ref 里让清理优先用它。 */
    const rescaleRef = useRef(null);
    const [scoreState, setScoreState] = useState('idle');// idle | loading | ready | failed

    /* 自己带来的谱子。存 localStorage，下次进屋还在 —— 拿这间屋子当练琴的
       台子的话，每次都要重新贴一遍 ABC 是不能忍的。 */
    const [userAbc, setUserAbc] = useState(null);
    const [userMeta, setUserMeta] = useState(null);      // { title, composer }
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadText, setUploadText] = useState('');
    const [uploadErr, setUploadErr] = useState('');
    /* 速度倍率。练琴用的：写死在谱面上的速度对着练是没法练的。 */
    const [rate, setRate] = useState(1);
    const baseTempoRef = useRef(0);

    useEffect(() => {
        let saved = null;
        try { saved = window.localStorage.getItem(ABC_KEY); } catch { /* 隐私模式读不到 */ }
        if (!saved) return;
        import('./kitchen/recital.js').then(({ abcMeta }) => {
            setUserMeta(abcMeta(saved));
            setUserAbc(saved);
        }).catch(() => { /* 拿不到就还是原来那份 */ });
    }, []);

    const abc = userAbc || sheetThing?.abc || '';
    const title = userMeta?.title || sheetThing?.title || '';
    const subtitle = userMeta ? (userMeta.composer || '你带来的谱子') : sheetThing?.subtitle;
    const spot = userAbc ? '你自己上传的' : sheetThing?.spot;
    const paperRef = useRef(null);      // 面板里画五线谱的地方
    const scoreRef = useRef(null);      // { tune, notes, duration }
    const timerRef = useRef(null);      // abcjs.TimingCallbacks
    const abcjsRef = useRef(null);
    const visualRef = useRef(null);     // renderAbc 出来的 tune，高亮要用它
    /* 进度条走 DOM 不走 state：每帧 setState 会把整个组件（连着那张 canvas
       的 vdom）重调一遍，而屋子本身正吃着一帧 16ms 的预算。 */
    const barRef = useRef(null);
    const clockRef = useRef(null);

    /* 3D 那边点到谱子时调这个。用 ref 是因为场景那个 effect 只跑一次，
       闭包里拿不到后来的 setState。 */
    const openSheetRef = useRef(null);
    openSheetRef.current = () => {
        setActiveSlug(null);
        setSheetFound(true);
        setSheetOpen((v) => !v);
    };
    const closeSheetRef = useRef(null);
    closeSheetRef.current = () => setSheetOpen(false);

    /* 纸在手上 ⟺ 面板开着**且**它还没架到琴上。

       这一条同时定了面板长什么样：拿在手里的时候，谱子就是手上那张纸，面板
       只留说明和几个按钮（再在面板里画一遍五线谱是把同一样东西说两遍，而且
       两个都得挤在一屏里，谁也看不清）；一旦架上谱架，纸归了钢琴，面板才把
       完整谱面接过来，好跟着弹到哪儿高亮到哪儿。 */
    const inHand = sheetOpen && !onRest;
    useEffect(() => {
        worldRef.current?.holdSheet(inHand);
    }, [inHand, ready]);

    /* 进度条和读秒。停下之后还得停在原地（不是归零），所以画这一下要能被
       播放循环之外的地方调到 —— 暂停、拖进度、回到开头都要重画。 */
    const totalRef = useRef(1);
    const paint = useCallback((t) => {
        const total = totalRef.current;
        if (barRef.current) {
            barRef.current.style.width = `${Math.max(0, Math.min(1, t / total)) * 100}%`;
        }
        if (clockRef.current) clockRef.current.textContent = `${mmss(t)} / ${mmss(total)}`;
    }, []);

    /* 翻开谱子那一下才去拉 abcjs（一百多 KB）+ 排一遍谱。换谱子、换速度都
       从这儿重来。

       同一份谱子只排一次，靠 ref 记「上次排的是哪一份、什么速度」，而不是把
       scoreState 写进依赖 —— 写进去的话第一句 setScoreState('loading') 就会让
       这个 effect 重跑一遍，清理函数顺手把**它自己**那次还在飞的加载标成作废，
       面板于是永远停在「正在排谱」。 */
    const builtRef = useRef({ abc: '', rate: 0 });
    const aliveRef = useRef(true);
    useEffect(() => () => { aliveRef.current = false; }, []);

    useEffect(() => {
        if (!sheetOpen || !abc) return;
        const was = builtRef.current;
        if (was.abc === abc && was.rate === rate) return;
        const fresh = was.abc !== abc;          // 换了谱子，还是只换了速度
        builtRef.current = { abc, rate };
        setScoreState('loading');
        (async () => {
            try {
                const { loadAbcjs, buildScore, sheetTexture } = await import('./kitchen/recital.js');
                const abcjs = await loadAbcjs();
                if (!aliveRef.current) return;
                abcjsRef.current = abcjs;

                /* 倍率是乘在**谱面自己的速度**上的，所以原速要先量一遍。
                   直接拿 qpm 当绝对值填的话，换一份谱子速度就全乱了。 */
                if (fresh || !baseTempoRef.current) {
                    baseTempoRef.current = buildScore(abcjs, abc).tempo;
                }
                const qpm = rate === 1 ? undefined : baseTempoRef.current * rate;
                scoreRef.current = buildScore(abcjs, abc, qpm);
                totalRef.current = scoreRef.current.duration || 1;
                setScoreState('ready');
                paint(holdAtRef.current);

                if (!fresh) return;              // 只是换了速度，纸上印的还是那一页
                // 纸上的印面：同一份谱子真排一遍，画到 canvas 上当贴图
                const tex = await sheetTexture(abcjs, abc);
                if (!aliveRef.current) { tex?.dispose?.(); return; }
                if (tex) worldRef.current?.setSheetTexture(tex);
            } catch (e) {
                builtRef.current = { abc: '', rate: 0 };   // 关掉再打开还能再试
                if (aliveRef.current) setScoreState('failed');
            }
        })();
    }, [sheetOpen, abc, rate, paint]);

    /* 面板里的五线谱。排一次就留着 —— 面板关掉只是移出视野，曲子还在弹，
       回来还得接着高亮。换谱子才重排；换速度不用，音符一个没动。 */
    useEffect(() => {
        if (scoreState !== 'ready' || !paperRef.current || !abcjsRef.current) return;
        const paper = paperRef.current;
        paper.innerHTML = '';
        const [visual] = abcjsRef.current.renderAbc(paper, abc, {
            add_classes: true,
            responsive: 'resize',
            staffwidth: 560,
            scale: 0.86,
            paddingtop: 4, paddingbottom: 10, paddingleft: 4, paddingright: 4,
            foregroundColor: '#150f2c',
        });
        visualRef.current = visual;
    }, [scoreState, abc]);

    /* 弹的时候：进度条 + 谱面上跟着走的高亮。
       高亮用 abcjs 的 TimingCallbacks，但**时钟以音频为准** —— 它自己那套是
       performance.now，四分钟下来会和采样播放对不上，所以每隔几秒拿音频时钟
       把它拨回去一次。 */
    useEffect(() => {
        if (!playing) return undefined;
        const paper = paperRef.current;
        const clear = () => paper?.querySelectorAll('.fv-note-on')
            .forEach((el) => el.classList.remove('fv-note-on'));

        const scroller = paper?.closest('.fv-sheet__scroll');
        /* 谱面跟着走。整首曲子在面板里有二十来行，不卷的话高亮十几秒之后
           就跑到看不见的地方去了。只在它**快出画**的时候卷一次 —— 每个音都
           卷等于谱子一直在抖。 */
        const follow = (el) => {
            if (!el || !scroller) return;
            const a = el.getBoundingClientRect(), b = scroller.getBoundingClientRect();
            if (a.top >= b.top + 24 && a.bottom <= b.bottom - 24) return;
            scroller.scrollTop += (a.top - b.top) - b.height * 0.34;
        };

        if (!timerRef.current && abcjsRef.current && visualRef.current) {
            timerRef.current = new abcjsRef.current.TimingCallbacks(visualRef.current, {
                // 调过速之后，谱面上的高亮也得按新速度走
                qpm: scoreRef.current?.tempo,
                eventCallback: (ev) => {
                    clear();
                    if (!ev?.elements) return;
                    let first = null;
                    for (const group of ev.elements) {
                        for (const el of [group].flat(Infinity)) {
                            if (!el?.classList) continue;
                            el.classList.add('fv-note-on');
                            first = first || el;
                        }
                    }
                    follow(first);
                },
            });
        }

        let raf = 0, started = false, lastSync = -1e9;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            const t = worldRef.current?.sheetPos?.() ?? 0;
            paint(t);
            const timer = timerRef.current;
            if (!timer) return;
            if (!started) {
                if (t < 0) return;                  // 起手前那半秒，谱面先别动
                started = true; lastSync = t;
                timer.setProgress(t, 'seconds');
                timer.start();
            } else if (t - lastSync > 4) {
                lastSync = t;
                timer.setProgress(t, 'seconds');    // 拨回音频时钟
            }
        };
        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            timerRef.current?.stop?.();
            timerRef.current = null;
            clear();
            /* 最后再画一次：停在哪儿就显示到哪儿。归零是不对的 —— 暂停之后
               进度条空着、但按「继续」是从中间接上，两下对不上。
               暂停、弹完、卸载都走这儿，所以停在哪儿只在这一处记。 */
            const at = rescaleRef.current ?? worldRef.current?.sheetPos?.() ?? 0;
            rescaleRef.current = null;
            paint(at);
            setHoldAt(at);
        };
    }, [playing, paint]);

    const putOnRest = useCallback((on) => {
        worldRef.current?.putSheetOnRest(on);
        setOnRest(on);
        if (!on) { setPlaying(false); setHoldAt(0); paint(0); }
    }, [paint]);

    /* 收回抽屉：面板一并关掉。纸从手上飞回抽屉，镜头跟过去看它落下 ——
       所以这是「收起来」，不是「拿下来」，两个按钮各管一段。 */
    const stowSheet = useCallback(() => {
        worldRef.current?.stowSheet();
        setOnRest(false);
        setPlaying(false); setHoldAt(0); paint(0);
        setSheetOpen(false);
    }, [paint]);

    /** from 留空 = 从停下的地方接着弹 */
    const playSheet = useCallback((from) => {
        if (!scoreRef.current) return;
        if (!onRest) { worldRef.current?.putSheetOnRest(true); setOnRest(true); }
        /* 位置显式传进去，不靠 recital 自己记：换速度会连谱带 recital 一起
           重建，它内部那个「停在第几秒」就没了。 */
        worldRef.current?.playSheet(scoreRef.current, from ?? holdAt);
    }, [onRest, holdAt]);

    const pauseSheet = useCallback(() => {
        // 进度条和 holdAt 都由 playing 那个 effect 的清理照当前位置写，这儿不用管
        worldRef.current?.pauseSheet();
    }, []);

    const rewindSheet = useCallback(() => {
        worldRef.current?.rewindSheet();
        setPlaying(false);
        setHoldAt(0);
        paint(0);
    }, [paint]);

    /* 换速度。练琴用的：写死在谱面上的那个速度对着练是没法练的。

       位置要跟着换算 —— 停在「第 23 秒」这件事在半速下指的是另一个小节，
       照搬秒数会跳到别处去。 */
    const changeRate = useCallback((r) => {
        if (r === rate) return;
        const at = Math.max(0, worldRef.current?.sheetPos?.() ?? 0);
        // 秒数要换算：停在「第 5 秒」这件事，半速下指的是另一个小节
        const scaled = at * (rate / r);
        rescaleRef.current = scaled;
        worldRef.current?.pauseSheet();
        setPlaying(false);
        setHoldAt(scaled);
        setRate(r);
    }, [rate]);

    /** 换上一份自己的谱子。解不开就不换，把话说在弹窗里。 */
    const applyAbc = useCallback((text) => {
        const next = String(text || '').trim();
        if (!next) { setUploadErr('先贴一段 ABC 进来'); return; }
        (async () => {
            try {
                const { loadAbcjs, buildScore, abcMeta } = await import('./kitchen/recital.js');
                const abcjs = await loadAbcjs();
                buildScore(abcjs, next);          // 解不开、或者一个音都没有，在这儿就抛了
                worldRef.current?.rewindSheet();
                setPlaying(false); setHoldAt(0); setRate(1);
                setUserMeta(abcMeta(next));
                setUserAbc(next);
                try { window.localStorage.setItem(ABC_KEY, next); } catch { /* 存不下就只这一次有效 */ }
                setUploadErr(''); setUploadOpen(false);
            } catch (e) {
                setUploadErr(e?.message || '这段 ABC 解不开');
            }
        })();
    }, []);

    /** 换回屋里原来那份 */
    const clearAbc = useCallback(() => {
        worldRef.current?.rewindSheet();
        setPlaying(false); setHoldAt(0); setRate(1);
        setUserAbc(null); setUserMeta(null);
        try { window.localStorage.removeItem(ABC_KEY); } catch { /* 忽略 */ }
        setUploadErr(''); setUploadOpen(false);
    }, []);

    /* 进度条能拖。四分五十秒的曲子只能从头听，等于听不了中段。
       拖到哪儿就从哪儿弹 —— 拖了还得自己按一下播放是多余的一步。 */
    const seekTo = useCallback((frac) => {
        if (!scoreRef.current) return;
        playSheet(Math.max(0, Math.min(1, frac)) * totalRef.current);
    }, [playSheet]);

    const seekFromPointer = useCallback((e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (r.width > 0) seekTo((e.clientX - r.left) / r.width);
    }, [seekTo]);

    const seekByKey = useCallback((e) => {
        const step = e.key === 'ArrowLeft' ? -10 : e.key === 'ArrowRight' ? 10 : 0;
        if (!step) return;
        e.preventDefault();
        const now = worldRef.current?.sheetPos?.() ?? 0;
        seekTo((Math.max(0, now) + step) / totalRef.current);
    }, [seekTo]);

    /* 选中状态和当前机位都要给渲染循环读，用 ref 免得重建场景 */
    const activeRef = useRef(null);
    useEffect(() => { activeRef.current = activeSlug; }, [activeSlug]);
    const viewRef = useRef('fridge');
    useEffect(() => { viewRef.current = view; }, [view]);
    /* 列表页盖在上面的时候，键盘和滚轮别把身后的人挪走 */
    /* 开场引导。桌面端左下角那行提示在 ≤820px 是 display:none 的 ——
       手机上等于一句说明都没有，所以改成进屋先弹一次，看过就记进 localStorage。
       左下角常驻一个「玩法 ?」，随时能再叫出来（那个按钮手机上也在）。 */
    const [guide, setGuide] = useState(false);
    useEffect(() => {
        let seen = false;
        try { seen = window.localStorage.getItem(GUIDE_KEY) === '1'; } catch { seen = false; }
        if (!seen) setGuide(true);
    }, []);
    const closeGuide = useCallback(() => {
        setGuide(false);
        // 隐私模式下 localStorage 会抛，弹窗照常关掉就行
        try { window.localStorage.setItem(GUIDE_KEY, '1'); } catch { /* 忽略 */ }
    }, []);

    const uiRef = useRef(false);
    // 弹窗开着的时候别让 WASD / 滚轮在后面推镜头
    useEffect(() => { uiRef.current = listView || guide; }, [listView, guide]);
    /* 纯文本列表是不透明铺满的（overlay.css 里 .fv-list：inset 0 + 实底色），
       盖着的时候屋子一个像素都露不出来 —— 那就别画，也别拾取。
       开场引导只是块小面板，屋子还看得见，不算。 */
    const coveredRef = useRef(false);
    useEffect(() => { coveredRef.current = listView; }, [listView]);
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
                const { createRecital } = await import('./kitchen/recital.js');
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

                /* 内部分辨率的档位。这间屋子的开销是**按像素算**的：同一台机器上只把
                   内部画布从 2× 降到 1×，帧时间掉到三分之一，而绘制调用一个没少 ——
                   瓶颈在每个像素要过的那段着色器（二十盏灯 + 五道后期），不在屋里
                   摆了多少东西。所以跑不动的机器该省的是像素，不是内容：家具、灯光、
                   漫画滤镜一样不减，只把画布铺得稀一点。
                   网点和颗粒是按 CSS 像素算的（见 resize 里的 uResolution），降档
                   不会让网点跟着变粗，掉的只是边缘那一点锐度 —— 而边缘后面还压着
                   SMAA 和色阶量化，本来就不靠分辨率撑。 */
                const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2);
                const DPR_STEPS = [...new Set([MAX_DPR, 1.5, 1.25, 1].filter((d) => d <= MAX_DPR))];
                let dprIdx = 0;
                let dpr = DPR_STEPS[0];
                renderer.setPixelRatio(dpr);
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                /* 投影贴图不每帧重画。两盏带影的方向光各 2048²，一帧要把 331 个投影体
                   各画一遍 —— 全场一千两百多次绘制调用里有一半花在这上面。可屋里绝大
                   多数时候是静的：投影相机按整屋框死（fitShadowCamera），走动和转头都
                   不改投影，只有柜门、磁贴、唱盘这些真动起来的东西才需要重画。
                   下面 markShadows() 负责在那几处缓动里点名。 */
                renderer.shadowMap.autoUpdate = false;
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

                const { group: room, range, microwave, floor, cabinets: cabDefs } = buildRoom();

                /* 柜门 / 抽屉 / 垃圾桶盖：点一下开，再点一下关。
                   三种运动共用一套状态，只是落到不同的属性上 ——
                   门转 y、抽屉挪 z、桶盖转 x（外加踏板跟着沉）。 */
                const cabs = (cabDefs || []).map((c) => ({ ...c, open: 0, want: 0 }));
                const addCabs = (list) => { for (const c of list || []) cabs.push({ ...c, open: 0, want: 0 }); };
                const APPLIANCE_DOORS = new Set([
                    'fridge-door', 'freezer-drawer', 'microwave-door',
                    'oven-door', 'dishwasher-door',
                ]);
                const isInside = (o, root) => {
                    for (let p = o; p; p = p.parent) if (p === root) return true;
                    return false;
                };
                const belongsToPlace = (o) => {
                    for (let p = o; p; p = p.parent) if (p.userData?.place) return true;
                    return false;
                };
                /* 关着时仍然只能拉把手；打开后，整扇家电门都是“关闭”热区。
                   冰箱贴特意排除，否则点磁贴会先把门关掉。 */
                const cabOf = (o) => cabs.find((c) => c.pick.includes(o))
                    || (!belongsToPlace(o) && cabs.find((c) => c.want > 0.5
                        && APPLIANCE_DOORS.has(c.kind) && isInside(o, c.node)))
                    || null;
                const CAB_LABEL = {
                    door: ['开柜门', '关柜门'],
                    drawer: ['拉开抽屉', '推回去'],
                    lid: ['开垃圾桶', '盖上'],
                    'fridge-door': ['拉开冰箱门', '关上冰箱门'],
                    'freezer-drawer': ['拉开冷冻抽屉', '推回冷冻抽屉'],
                    'microwave-door': ['拉开微波炉门', '关上微波炉门'],
                    'oven-door': ['拉开烤箱门', '关上烤箱门'],
                    'dishwasher-door': ['拉开洗碗机门', '关上洗碗机门'],
                };
                if (microwave?.door) addCabs([microwave.door]);
                if (range?.door) addCabs([range.door]);
                scene.add(room);

                /* 四个炉头各带一盏点光，负责把火焰周围的灶架和台面染上一圈蓝 ——
                   没有它，火焰就只是贴在灶台上的一张图，而不是在烧。

                   问题是它们平时是灭的，可 three 把**灯的数量编进着色器**：一盏
                   intensity 0、照射半径只有 40cm 的点光，照样要在屏幕上每一个像素里
                   算一遍衰减。实测这四盏占掉整帧三成的时间（16.6ms → 11.4ms），
                   而绝大多数人从进屋到离开根本没拧过灶。

                   所以平时干脆不让它们待在场景里，点火才挂上去。四盏一起进出 ——
                   一盏一盏加的话点光数量会走 2→3→4→5→6 五种，每种都是一套新着色器。 */
                const burnerLights = range.burners.map((b) => ({ light: b.light, host: b.light.parent }));
                let burnerLightsIn = true;
                function setBurnerLights(want) {
                    if (want === burnerLightsIn) return;
                    burnerLightsIn = want;
                    for (const { light, host } of burnerLights) {
                        if (want) host.add(light); else host.remove(light);
                    }
                }
                setBurnerLights(false);

                /* 灶台开火：点旋钮点火，再点熄火 */
                const knobAngle = range.knobs.map(() => 0);
                function toggleBurner(i) {
                    const b = range.burners[i];
                    const on = !b.flame.visible;
                    b.flame.visible = on;
                    b.light.intensity = on ? 0.018 : 0;
                    knobAngle[i] = on ? -Math.PI * 0.55 : 0;
                    // 还有一个炉头在烧，四盏就都留着；全灭了才一起撤走
                    setBurnerLights(range.burners.some((x) => x.flame.visible));
                }
                buildLights(scene);

                // 客厅：和厨房同一个局部坐标系，往 +Z / +X 长出去
                const { group: living } = buildLiving();
                scene.add(living);
                addCabs(living.userData.cabinets);
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
                    ['screenbar', livingLights.screenBar],
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
                        // 悬臂灯的罩子会动，光源每帧跟着罩口走（见 frame）
                        mouth: d.mouth || null,
                        aim: d.aim || null,
                        joints: d.joints || [],
                        on: true,
                    };
                }).filter(Boolean);
                const lampOf = (o) => lamps.find((l) => l.pick.includes(o)) || null;

                /* 悬臂灯那两个关节（立杆上的滚花枢轴 / 罩子那副铰链）。
                   点一下转一格、转到头掉头 —— 和龙头出水口一个套路：
                   离散几档比拖拽好点，也不会和拖视角抢手指。 */
                const joints = lamps.flatMap((l) => l.joints).map((j) => ({
                    ...j,
                    idx: Math.max(0, j.stops.indexOf(0)),
                    dir: 1,
                    angle: 0,
                }));
                const jointOf = (o) => joints.find((j) => j.pick.includes(o)) || null;
                function turnJoint(j) {
                    const next = j.idx + j.dir;
                    if (next < 0 || next >= j.stops.length) j.dir = -j.dir;
                    j.idx += j.dir;
                }
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
                let nudgeUntil = 0;             // 没开机就弹琴时，让指示灯闪几下指路
                function hitKey(mesh) {
                    const d = mesh.userData;
                    if (!d || d.midi === undefined) return;
                    // 键是机械的，没通电也压得下去；只是不出声
                    pressed.set(mesh, performance.now() + 110);
                    if (!pianoOn) {
                        /* 没电还去弹 —— 别只是「没反应」，那样人会以为琴是死的。
                           让电源指示灯猛闪一秒半，眼睛自然会被带到开关上。 */
                        nudgeUntil = performance.now() + 1500;
                        return;
                    }
                    // 力度给一点随机，不至于每下都一模一样
                    audio.playPianoNote(d.midi, 0.72 + Math.random() * 0.2, PIANO_AT);
                }
                function togglePiano() {
                    pianoOn = !pianoOn;
                    // 开电源那一下顺带把采样拉下来：关着的琴不用先下 700KB
                    if (pianoOn) audio.preloadPiano();
                }

                /* ---------- 谱子 / 自动演奏 ----------
                   谱子在唱机底下那个五斗柜最上层的抽屉里（living.js buildSheetMusic）。
                   点它开面板；放上谱架之后，这台琴能照着谱子自己弹一遍 —— 走的是
                   和你手点琴键完全同一条路：同一套采样、同一个 pressed 表、同一个
                   PannerNode，所以听感和「有人坐在那儿弹」是一致的。 */
                const sheet = living.userData.sheet || null;
                const sheetCab = sheet ? cabs.find((c) => c.node === sheet.drawerNode) : null;
                const keyByMidi = new Map(pianoKeys.map((m) => [m.userData.midi, m]));
                let recital = null;
                let sheetOnRest = false;
                let sheetHeld = false;      // 面板开着 = 纸在手上
                let heldT = 0;              // 0 = 在原处，1 = 举在眼前
                const homePos = new THREE.Vector3(), homeQuat = new THREE.Quaternion();
                const handPos = new THREE.Vector3(), handQuat = new THREE.Quaternion();
                const homeScale = new THREE.Vector3();
                /* 举着的时候不要正对着脸拍平 —— 歪一点点才有厚度。
                   页面在画面右边，所以往画面中心侧一点。 */
                const HAND_TILT = new THREE.Quaternion()
                    .setFromEuler(new THREE.Euler(0.035, 0.085, -0.012));

                /* 让它弹的时候把镜头带到琴前。走过去是不行的 —— 从影音角到窗边
                   要绕大半间屋子，寻路走完曲子都过了半分钟了，而且一路低头看地板
                   （walkTo 是到位之前就把朝向定死的）。所以走预设机位那条路：
                   直接滑过去，不做碰撞，一秒到位。 */
                /* 纸换地方的时候镜头跟过去 —— 不跟的话，你按下「放上谱架」，画面
                   里什么都没变，纸凭空消失在另一间屋角。两处都走预设机位那条路：
                   直接滑过去、不做碰撞，一秒到位。
                   视高在函数里补（EYE 在下面才声明）。 */
                const PIANO_SEAT = [2.55, 0.95], PIANO_LOOK = [3.70, 0.85, -0.10];
                /* 站远一点、看高一点：贴到一米以内低头 43° 看柜子，画面里只剩
                   一块柜面。1.7m 外压 28°，五斗柜连同上面那台唱机正好在框里。
                   （沙发在 z 1.78–2.70，这个位置绕开了。） */
                const DRESSER_SEAT = [1.75, 3.25], DRESSER_LOOK = [0.05, 0.66, 3.25];

                function glideTo(seat, look) {
                    snapTo.set(seat[0], EYE, seat[1]);
                    snapping = true;
                    walkPath = null;
                    const a = aimAt(snapTo, ...look);
                    faceTo(a.yaw, a.pitch);
                    leavePreset();
                }
                /** 已经站在跟前了就别折腾镜头 —— 人自己走过来看的，不该被拽一下。 */
                const near = (x, z, r) => Math.hypot(camPos.x - x, camPos.z - z) < r;
                function goToPiano() {
                    if (near(PIANO_AT[0], PIANO_AT[2], 2.2)) return;
                    glideTo(PIANO_SEAT, PIANO_LOOK);
                }
                function goToDresser() {
                    if (near(DRESSER_LOOK[0], DRESSER_LOOK[2], 1.9)) return;
                    glideTo(DRESSER_SEAT, DRESSER_LOOK);
                }

                /* 采样没下完的时候按「停」，那会儿 recital 还没建出来 ——
                   光把它置空拦不住，等下载一好还是会开弹。所以另记一个意图。 */
                let wantPlay = false;
                let score = null;           // React 那边解好的谱，第一次播放时交过来

                function ensureRecital() {
                    if (recital || !score) return recital;
                    recital = createRecital(score, {
                        at: PIANO_AT,
                        onNote: (midi, dur) => {
                            const mesh = keyByMidi.get(midi);
                            if (!mesh) return;
                            /* 键沉下去的时长照谱面走，但压一个上限：这谱子里有
                               四拍的长音，键在那儿按住三秒看着是卡住了，不是在弹。 */
                            pressed.set(mesh, performance.now() + Math.min(dur * 1000, 420) + 90);
                        },
                        onEnd: () => { wantPlay = false; setPlaying(false); },
                    });
                    return recital;
                }

                /** 从 from 秒起弹（留空 = 从停下的地方接着）。 */
                function playSheetFrom(nextScore, from) {
                    if (nextScore && nextScore !== score) { score = nextScore; recital = null; }
                    if (!score) return;
                    // 自动演奏之前先替人把电源打开 —— 谁弹琴之前不开机
                    if (!pianoOn) togglePiano();
                    if (!wantPlay) goToPiano();     // 已经在弹的时候拖进度，别再拽一次镜头
                    wantPlay = true;
                    setPlaying(true);
                    /* 采样要 700KB。没开过电源的话这会儿才开始下，playPianoNote
                       在下完之前是直接吞掉的 —— 不等它，开头一整句就没了。 */
                    const ready = audio.preloadPiano();
                    const go = () => {
                        if (disposed || !wantPlay) return;
                        ensureRecital()?.play(from);
                    };
                    if (ready?.then) ready.then(go); else go();
                }

                /** 停在当前位置，接着还能续上。 */
                function pauseSheet() {
                    wantPlay = false;
                    recital?.pause();
                    setPlaying(false);
                }
                /** 回到开头。 */
                function rewindSheet() {
                    wantPlay = false;
                    recital?.pause();
                    recital?.reset();
                    setPlaying(false);
                }

                /* 唱机：掀盖 / 上唱片放音。角度和转速都在 living.js 里解好了。 */
                const tt = living.userData.turntable;
                let lidOpen = false, spinning = false;
                let lidAngle = 0, armAngle = tt.ARM_REST, armLift = 0, armTrack = 0;
                let lpDrop = 0;                 // 0 = 唱片悬在盘上方，1 = 落到盘上
                function toggleLid() { lidOpen = !lidOpen; }
                function togglePlay() {
                    spinning = !spinning;
                    if (spinning) {
                        lidOpen = true;              // 放唱片总得先掀盖
                        armTrack = 0;
                        tt.lp.visible = true;
                        tt.lp.position.y = tt.LP_Y + tt.LP_LIFT * (1 - lpDrop);
                        audio.startRecord(tt.speakers);
                    } else {
                        audio.stopRecord();
                    }
                }

                const { group: fridge, doorPlane, doors: fridgeDoors } = buildFridge();
                // 嵌在柜龛里，所以正对前方；三维感靠机位角度，不靠转冰箱。
                // 不是居中：实拍里冰箱贴着左边那堵墙（缝只有 1cm），
                // 龛口 0.95 减冰箱 0.89 剩下的余量基本都在右边。
                fridge.position.set(-0.16, 0, -1.53);
                scene.add(fridge);

                const textureLoader = new THREE.TextureLoader();
                const { group: magnetGroup, meshes: magnets } = buildMagnets(places, doorPlane, textureLoader);
                fridge.add(magnetGroup);

                /* 冰箱贴真正挂到左右门上。门轴以外缘为原点，而磁贴坐标原本以
                   整台冰箱为原点，所以换父节点时扣除门轴偏移并同步 home。 */
                for (const m of magnets) {
                    const door = m.position.x < 0 ? fridgeDoors[0] : fridgeDoors[1];
                    door.node.add(m);
                    m.position.x -= door.node.position.x;
                    m.position.z -= door.node.position.z;
                    m.userData.home.copy(m.position);
                }
                addCabs(fridgeDoors);

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
                    /* 辉光走半分辨率。它本来就是一团糊的（strength 0.12、radius 0.5），
                       少一半采样点看不出来，而它是整条后期链里第二贵的一道。
                       这行必须排在 composer.setSize 之后 —— composer 会按自己的
                       分辨率把每道 pass 重设一遍，写在前面会被盖掉。 */
                    bloom.setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
                    comic.uniforms.uResolution.value.set(w, h);
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();   // fov 每帧按当前机位设，见下面 frame()
                }
                resize();
                window.addEventListener('resize', resize);
                // 视口变化不总会触发 window resize（面板拖拽、旋转屏），盯住画布本身更可靠
                const ro = new ResizeObserver(resize);
                ro.observe(canvas);

                /* 掉帧就往下降一档（见 DPR_STEPS）。
                   开头 2.5 秒不算数 —— 着色器编译、贴图上传、字体全挤在那儿，
                   拿那几帧判机器卡不卡是在冤枉它。之后每 1.2 秒看一次中位帧时。

                   窗口按**时间**算而不是按帧数算，这一点是有讲究的：按帧数的话，
                   越卡的机器攒满一窗越慢 —— 8fps 那台要等半分钟才等来第一次降档，
                   而它恰恰是最需要马上降的那一台。按时间就跟帧率无关，谁都是
                   五秒内见分晓。

                   第一档要连着两窗都差才降（一次 GC、一次切标签页不该把画质带下去）；
                   已经降过一次说明这台机器确实吃力，后面就不再犹豫。
                   只降不升：跑得动的机器从头到尾都是满分辨率，这段逻辑一次都不触发。 */
                const PERF_WARMUP_MS = 2500, PERF_WINDOW_MS = 1200;
                const PERF_MIN_SAMPLES = 5, PERF_BAD_MS = 27;   // 27ms ≈ 37fps
                let perfStart = 0, perfWindowEnd = 0, perfBad = 0;
                const perfBuf = [];
                function samplePerf(now, ms) {
                    if (!perfStart) {
                        perfStart = now;
                        perfWindowEnd = now + PERF_WARMUP_MS + PERF_WINDOW_MS;
                        return;
                    }
                    if (now < perfStart + PERF_WARMUP_MS || dprIdx >= DPR_STEPS.length - 1) return;
                    if (ms < 1000) perfBuf.push(ms);    // 切回标签页那一下能有好几秒，不算
                    // 时间到了、样本也够了才结一窗 —— 极慢的机器一窗攒不到几帧，等它攒够
                    if (now < perfWindowEnd || perfBuf.length < PERF_MIN_SAMPLES) return;
                    perfWindowEnd = now + PERF_WINDOW_MS;
                    perfBuf.sort((a, b) => a - b);
                    const p50 = perfBuf[perfBuf.length >> 1];
                    perfBuf.length = 0;
                    perfBad = p50 > PERF_BAD_MS ? perfBad + 1 : 0;
                    if (perfBad < (dprIdx === 0 ? 2 : 1)) return;
                    perfBad = 0;
                    dprIdx += 1;
                    dpr = DPR_STEPS[dprIdx];
                    renderer.setPixelRatio(dpr);
                    composer.setPixelRatio(dpr);
                    resize();
                }

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
                    ...(sheet?.pick || []),
                    ...lamps.flatMap((l) => l.pick), ...joints.flatMap((j) => j.pick),
                    ...cabs.flatMap((c) => c.pick),
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
                /* three 的射线**不跳过隐藏的东西** —— Mesh.raycast 压根不看 visible。
                   屋里现在有藏起来的件（谱架上那张谱子在放上去之前是隐藏的），
                   不滤一道的话，它在原地照样挡射线、照样点得开。 */
                const shown = (o) => {
                    for (let n = o; n; n = n.parent) if (!n.visible) return false;
                    return true;
                };
                const probe = (v, list = solids) => {
                    raycaster.setFromCamera(v, camera);
                    for (const hit of raycaster.intersectObjects(list, false)) {
                        if (shown(hit.object)) return hit;
                    }
                    return null;
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
                    // 门板不常驻 pickSet：这样关闭时点门板不会误开；只有已经
                    // 打开的家电门，才把实际命中的任意子网格当作关闭按钮。
                    if (exact && cabOf(exact.object)) {
                        return { kind: 'interactive', hit: exact, object: exact.object };
                    }
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
                /* 鼠标和手指的方向习惯是**反的**，这不是口味问题：
                     · 鼠标按住拖 = 转头，往右拖就往右看（屋子往左滑）
                     · 手指按住划 = 把屋子拖着走，手指往右划屋子跟着往右，
                       视线于是往**左**转
                   Street View、地图、一切全景看房都是后者。手机上照鼠标那套做，
                   划哪边都跟手感相反 —— 所以触摸/触控笔时把两个轴一起取反。 */
                let dragSign = 1;

                function onPointerDown(e) {
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    dragging = true; dragAmount = 0; downAt = performance.now();
                    dragSign = (e.pointerType === 'touch' || e.pointerType === 'pen') ? -1 : 1;
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
                    want.yaw -= dx * TURN_PER_PX * dragSign;
                    want.pitch = clampPitch(want.pitch - dy * TURN_PER_PX * 0.72 * dragSign);
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
                    /* 点下去多半会有东西动起来（门、旋钮、唱盘…）。各处缓动自己会
                       markShadows()，这里再补一手：万一将来加了件没登记的活动零件，
                       至少点它的那一下投影是对的。 */
                    markShadows();
                    const r = resolve(toNdc(e, clickNdc));

                    if (r.kind === 'interactive') {
                        const o = r.object;
                        if (o.userData.knob) {
                            toggleBurner(o.userData.knob.index);
                            return;                   // 开火不影响冰箱贴的选中状态
                        }
                        if (faucet.pickLever.includes(o)) { waterOn = !waterOn; return; }
                        if (faucet.pickSpout.includes(o)) { swivelSpout(); return; }
                        const cab = cabOf(o);
                        if (cab) { cab.want = cab.want > 0.5 ? 0 : 1; return; }
                        const joint = jointOf(o);
                        if (joint) { turnJoint(joint); return; }
                        const lamp = lampOf(o);
                        if (lamp) { toggleLamp(lamp); return; }
                        if (power.pick.includes(o)) { togglePiano(); return; }
                        if (tt.pickCover.includes(o)) { toggleLid(); return; }
                        if (tt.pickPlay.includes(o)) { togglePlay(); return; }
                        if (sheet && sheet.pick.includes(o)) {
                            // 举着的时候点它 = 放回去；在原处点它 = 拿起来
                            if (sheet.held.visible) closeSheetRef.current?.();
                            else openSheetRef.current?.();
                            return;
                        }
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

                /* 这一帧有没有东西动过 —— 动了才重画投影贴图（见 shadowMap.autoUpdate）。
                   置 2 而不是 1：缓动是写完最后一帧属性才停的，多留一帧收尾。 */
                let shadowDirty = 2;
                const markShadows = () => { shadowDirty = 2; };
                /* 悬停拾取最快每 22ms 算一次（≈45Hz）。一次 resolve 要把射线过一遍
                   1108 个网格，2ms 的纯 JS —— 慢机器上更贵，而地面光标和悬停提示
                   在 45Hz 和 120Hz 之间没人分得出来。点击不走这条路（handleClick 自己
                   现算一次），所以点得准不准不受影响。 */
                const PROBE_MIN_MS = 22;
                let lastProbeAt = 0;

                /* 磁贴的投影是拿贴图的 alpha 裁出来的（见 magnets.js 里那个 alphaTest），
                   所以贴图到货的那一刻投影得重画一次 —— 不然先画出来的是一块方方正正
                   的影子，永远等不到自己变成磁贴的形状。
                   这是「几何没动、投影却该变」的一类：投影贴图平时不刷新，这种时刻
                   只能自己点名。 */
                const loadManager = THREE.DefaultLoadingManager;
                const prevOnProgress = loadManager.onProgress;
                loadManager.onProgress = (...a) => { markShadows(); prevOnProgress?.(...a); };

                function frame() {
                    raf = requestAnimationFrame(frame);
                    const raw = clock.getDelta();
                    const dt = Math.min(raw, 0.05);
                    const t = clock.getElapsedTime();
                    const now = performance.now();
                    samplePerf(now, raw * 1000);
                    if (shadowDirty > 0) { renderer.shadowMap.needsUpdate = true; shadowDirty -= 1; }

                    /* 指着什么 + 会走到哪 —— 同一次 resolve 决定，所以地面光标
                       画的就是点下去真正会落到的点，不会「看着指沙发、点了跑别处」。
                       射线要过全屋一千一百多个网格（约 2ms 纯 JS），鼠标和镜头都没动
                       就沿用上一帧的结果，动了也最多每 22ms 重算一次。 */
                    if (!dragging && !coveredRef.current && ndc.x > -5) {
                        const moved = now - lastProbeAt >= PROBE_MIN_MS && (
                            Math.abs(ndc.x - lastProbe.nx) > 1e-4
                            || Math.abs(ndc.y - lastProbe.ny) > 1e-4
                            || Math.abs(camPos.x - lastProbe.cx) > 1e-3
                            || Math.abs(camPos.z - lastProbe.cz) > 1e-3
                            || Math.abs(aim.yaw - lastProbe.yaw) > 3e-4
                            || Math.abs(aim.pitch - lastProbe.pitch) > 3e-4
                            || activeRef.current !== lastProbe.active);
                        if (moved) {
                            lastProbeAt = now;
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
                        else if (hovered && sheet?.pick.includes(hovered)) {
                            setHover({
                                slug: 'sheet',
                                place: sheet.held.visible ? '放回去'
                                    : sheetOnRest ? '谱架上那张谱子' : '一叠谱子',
                            });
                        }
                        else if (d?.note) {
                            setHover({ slug: `key-${d.midi}`, place: pianoOn ? d.note : '琴没开 · 按低音那头的电源' });
                        } else if (hovered && power.pick.includes(hovered)) {
                            setHover({ slug: 'power', place: pianoOn ? '关掉电钢琴' : '开电钢琴' });
                        }
                        else if (hovered && cabOf(hovered)) {
                            const c = cabOf(hovered);
                            setHover({ slug: 'cab', place: CAB_LABEL[c.kind][c.want > 0.5 ? 1 : 0] });
                        }
                        else if (hovered && jointOf(hovered)) {
                            setHover({ slug: `joint-${jointOf(hovered).name}`, place: jointOf(hovered).label });
                        }
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
                        focused.getWorldQuaternion(tmpQ);
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
                        const s = m.userData.baseScale * (isActive ? 1.06 : isHover ? 1.04 : 1);
                        // 到位就别写了：四十来枚磁贴全是投影体，每帧都动等于每帧重画投影
                        if (Math.abs(target - m.position.z) < 1e-5
                            && Math.abs(s - m.scale.x) < 1e-6) continue;
                        m.position.z += (target - m.position.z) * (1 - Math.exp(-9 * dt));
                        m.scale.x += (s - m.scale.x) * (1 - Math.exp(-9 * dt));
                        m.scale.y = m.scale.z = m.scale.x;
                        markShadows();
                    }

                    /* 自动演奏：这一帧该响的音排给 WebAudio、该沉的键塞进 pressed。
                       放在键盘缓动**之前**，这一帧按下去的键当帧就沉。 */
                    recital?.tick();

                    /* 谱子在哪儿。三份纸轮流出场：
                         · 抽屉里那份 —— 还得等抽屉真拉开，关着的时候它整个埋在
                           柜体里，露出来就穿帮
                         · 谱架上那份 —— 放上去之后
                         · 手上那份 —— 面板开着的时候，从前两份的位姿插值到眼前

                       手上那份不是「另一张纸」，是同一张被拿起来了，所以原处那份
                       同时要收掉；heldT 走到两头才切，中途两边都不显示，只有飞着
                       的那张。 */
                    if (sheet) {
                        const wantHeld = sheetHeld ? 1 : 0;
                        if (Math.abs(heldT - wantHeld) > 1e-4) {
                            heldT += (wantHeld - heldT) * (1 - Math.exp(-7.5 * dt));
                            if (Math.abs(heldT - wantHeld) < 1e-4) heldT = wantHeld;
                            markShadows();
                        }

                        const atHome = heldT < 0.002;
                        const inDrawer = atHome && !sheetOnRest && (sheetCab ? sheetCab.open > 0.06 : true);
                        const atRest = atHome && sheetOnRest;
                        if (sheet.inDrawer.visible !== inDrawer) {
                            sheet.inDrawer.visible = inDrawer;
                            sheet.grab.visible = inDrawer;
                        }
                        if (sheet.onRest.visible !== atRest) {
                            sheet.onRest.visible = atRest;
                            sheet.restGrab.visible = atRest;
                        }
                        sheet.held.visible = !atHome;

                        if (!atHome) {
                            // 原处那份的世界位姿（抽屉会滑、谱架是斜的，所以每帧取）
                            const home = sheetOnRest ? sheet.onRest : sheet.inDrawer;
                            home.updateWorldMatrix(true, false);
                            home.matrixWorld.decompose(homePos, homeQuat, homeScale);

                            /* 举在眼前那个位姿。想要的是**画面上**的构图，所以先定
                               「占多宽、摆在哪一格」，再反推该离眼睛多远 —— 换视场角、
                               换屏幕比例，纸在画面里的位置和大小都不变。

                               让开面板：宽屏面板贴在左边，纸就往右让；窄屏面板是从
                               底下抽上来的那种，纸往上让。分界线跟 overlay.css 里
                               那条 820px 一致，看的是**窗口宽度**不是画面比例 ——
                               又高又窄的窗口比例小于 1，但面板还铺在左边。 */
                            const half = Math.tan((camera.fov * Math.PI / 180) / 2);
                            const wide = canvas.clientWidth > 820;
                            const fracW = wide ? 0.30 : 0.62;      // 纸占画面宽度的几成
                            const ndcX = wide ? 0.42 : 0;          // 摆在横向哪一格
                            const ndcY = wide ? 0 : 0.30;
                            const dist = SHEET_PAGE_W / (fracW * 2 * half * camera.aspect);
                            const visH = 2 * dist * half;
                            tmpV.set(ndcX * visH * camera.aspect / 2, ndcY * visH / 2, -dist)
                                .applyMatrix4(camera.matrixWorld);
                            handPos.copy(tmpV);
                            camera.getWorldQuaternion(handQuat);
                            handQuat.multiply(HAND_TILT);

                            // 缓入缓出：直着插值的话，起手和落回都是硬邦邦的等速
                            const e = heldT * heldT * (3 - 2 * heldT);
                            sheet.held.position.lerpVectors(homePos, handPos, e);
                            sheet.held.quaternion.slerpQuaternions(homeQuat, handQuat, e);
                            // 中途往上拱一点，读作「飘出来」而不是「从抽屉面板里穿过去」
                            sheet.held.position.y += Math.sin(Math.PI * e) * 0.10;
                        }
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

                    /* 电源指示。关机时**不是灭的，是慢慢呼吸**的待机红灯 ——
                       这台琴最不显眼的地方就是它能开机，一个会动的小红点是
                       整个画面里唯一会主动招手的东西。
                       刚被「弹了但没电」戳过的一秒半里改成急闪，指路更明确。 */
                    {
                        const led = power.led.material, scr = power.screen.material;
                        const k = 1 - Math.exp(-9 * dt);
                        let wantLed;
                        if (pianoOn) wantLed = 2.4;
                        else if (performance.now() < nudgeUntil) wantLed = Math.sin(t * 26) > 0 ? 3.2 : 0.1;
                        else wantLed = 0.42 + 0.30 * Math.sin(t * 2.1);
                        led.emissiveIntensity += (wantLed - led.emissiveIntensity) * k;
                        scr.emissiveIntensity += ((pianoOn ? 1.1 : 0) - scr.emissiveIntensity) * k;
                    }

                    /* 柜门 / 抽屉 / 桶盖。缓动到位就不再写属性，免得每帧都在
                       给几十个 group 赋值。 */
                    for (const c of cabs) {
                        if (Math.abs(c.want - c.open) < 1e-4) continue;
                        markShadows();
                        c.open += (c.want - c.open) * (1 - Math.exp(-7 * dt));
                        if (c.kind === 'drawer' || c.kind === 'freezer-drawer') {
                            c.node.position[c.axis] = c.dir * c.travel * c.open;
                        }
                        else if (c.kind === 'lid') c.node.rotation.x = -c.swing * c.open;
                        else if (c.axis === 'x') c.node.rotation.x = c.spin * c.swing * c.open;
                        else c.node.rotation.y = c.spin * c.swing * c.open;
                        if (c.extra) c.extra.rotation.x = c.extraTilt * c.open;
                    }

                    /* 悬臂灯：两个关节各自缓到当前那一档；罩子一动，聚光灯就得
                       跟着罩口重新摆位 —— 光源写死在世界坐标里的话，转完罩子
                       朝着东、光还照在原地。 */
                    for (const j of joints) {
                        const wantA = j.stops[j.idx];
                        if (Math.abs(wantA - j.angle) > 1e-4) {
                            j.angle += (wantA - j.angle) * (1 - Math.exp(-8 * dt));
                            j.node.rotation.z = j.angle;
                            markShadows();
                        }
                    }
                    for (const l of lamps) {
                        if (!l.mouth || !l.aim) continue;
                        l.mouth.getWorldPosition(l.light.position);
                        l.aim.getWorldPosition(l.light.target.position);
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

                        /* 上片 / 收片是「落下去」和「拿起来」，不是显示/隐藏。
                           一闪就出现的唱片和绿绒垫连在一起看，就是「绿胶变黑胶」。 */
                        lpDrop += ((spinning ? 1 : 0) - lpDrop) * (1 - Math.exp(-5.5 * dt));
                        tt.lp.position.y = tt.LP_Y + tt.LP_LIFT * (1 - lpDrop);
                        if (!spinning && !moving && tt.lp.visible && armLift < 0.005 && lpDrop < 0.02) {
                            tt.lp.visible = false;
                        }
                        /* 盘和唱片是绕自己轴心转的圆盘 —— 转归转，这一帧和下一帧的
                           投影一模一样，没必要为它每帧重画两张 2048² 的投影贴图。
                           真会改投影的只有三样：掀盖、抬臂、上下片。 */
                        if (moving || Math.abs(wantLid - lidAngle) > 1e-4
                            || Math.abs((spinning ? 1 : 0) - lpDrop) > 1e-3) {
                            markShadows();
                        }
                    }

                    /* 耳朵跟着相机走：钢琴在窗边、音箱在北墙，走过去才听得清 */
                    audio.updateListener(
                        camPos.x, camPos.y, camPos.z,
                        Math.sin(aim.yaw) * cp, Math.sin(aim.pitch), Math.cos(aim.yaw) * cp,
                    );

                    /* 火焰：每根火舌用不同相位错开缩放，配合灯光轻微闪烁 */
                    range.burners.forEach((b, i) => {
                        const knob = range.knobs[i].userData.knob.group;
                        if (Math.abs(knobAngle[i] - knob.rotation.y) > 1e-4) markShadows();
                        knob.rotation.y += (knobAngle[i] - knob.rotation.y) * (1 - Math.exp(-12 * dt));
                        if (!b.flame.visible) return;
                        b.flame.userData.uniforms.uTime.value = t;
                        b.light.intensity = 0.016 + 0.006 * Math.sin(t * 13 + i * 1.7);
                    });

                    /* 水龙头：转到位 / 扳手柄 / 出水 */
                    {
                        const f = faucet;
                        const wantLever = waterOn ? f.LEVER_ON : f.LEVER_OFF;
                        if (Math.abs(f.SWIVEL_STOPS[swivelIdx] - f.spout.rotation.y) > 1e-4
                            || Math.abs(wantLever - f.lever.rotation.x) > 1e-4) markShadows();
                        f.spout.rotation.y += (f.SWIVEL_STOPS[swivelIdx] - f.spout.rotation.y) * (1 - Math.exp(-7 * dt));
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

                    // 列表盖着的时候屋子看不见（见 coveredRef），画了也是白画
                    if (coveredRef.current) return;
                    composer.render();
                }

                /* 着色器是第一次用到才编译的：三十来个程序、每个都要过十几盏灯，
                   慢机器上全挤在进屋第一帧，于是「进来 → 僵住半秒 → 才开始动」。
                   先编完再揭幕 —— 有 KHR_parallel_shader_compile 的浏览器还能并行编。
                   代价是加载动画多转一会儿，换掉的是开门那一下的卡顿，这笔划算。

                   两种灯光配置各编一遍：点火那一下点光会从 2 盏变 6 盏，而灯的数量
                   是编进着色器的，等于要把全部材质重编一次。不预热的话，第一次拧开
                   灶就会僵一下。先编「有炉火」那套、再编默认那套，两个变体都进缓存，
                   之后来回切就是白拿；末尾停在默认配置上。 */
                setBurnerLights(true);
                try { await renderer.compileAsync(scene, camera); } catch { /* 编不了就照常走 */ }
                setBurnerLights(false);
                try { await renderer.compileAsync(scene, camera); } catch { /* 同上 */ }
                if (disposed) return;

                frame();

                if (!disposed) setReady(true);

                worldRef.current = {
                    /* ---- 谱子那一摊，给 React 那边调 ---- */
                    hasSheet: !!sheet,
                    setSheetTexture: (tex) => sheet?.setTexture(tex),
                    /** 面板开着 = 纸拿在手上 */
                    holdSheet: (on) => { sheetHeld = !!on; },
                    /* 架上谱架 / 从谱架拿下来。往琴那边去要跟镜头，往回不用 ——
                       从谱架下来是回到手上，纸是朝人这边来的。 */
                    putSheetOnRest: (on) => {
                        sheetOnRest = !!on;
                        if (on) goToPiano();
                        else rewindSheet();
                    },
                    /** 收回抽屉。镜头跟过去，顺手把抽屉拉开 —— 不然飞到那儿
                     *  只看见一个关着的柜子，纸凭空没了。 */
                    stowSheet: () => {
                        sheetOnRest = false;
                        rewindSheet();
                        if (sheetCab) sheetCab.want = 1;
                        goToDresser();
                    },
                    playSheet: (s, from) => playSheetFrom(s, from),
                    pauseSheet,
                    rewindSheet,
                    /** 弹到第几秒。停下之后停在那儿不动，起手那一小段是负的。 */
                    sheetPos: () => recital?.position ?? 0,
                    /* 调试用：不用在屋里把那张纸点中就能开面板 */
                    openSheet: () => openSheetRef.current?.(),

                    camera, canvas, magnets, THREE, raycaster, ndc, range, scene,
                    camPos, aim, want, solids, resolve, walkable, snapToWalkable, findPath, keys,
                    renderer, composer, bloom, comic,
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
                    /* 排音那个定时器不归 rAF 管，得单独停 —— 留着的话它会在
                       页面走了之后继续跑，还会把刚关掉的 AudioContext 重新建起来。 */
                    recital?.pause();
                    loadManager.onProgress = prevOnProgress;   // 这是个全局单例，别留着
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
            if (guide) closeGuide();
            else if (listView) setListView(false);
            else if (activeSlug) setActiveSlug(null);
            else if (sheetOpen) setSheetOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeSlug, listView, guide, sheetOpen, closeGuide]);

    return (
        <div className="fv-root">
            <canvas className="fv-canvas" ref={canvasRef} />

            {/* 这儿以前写的是「正在布置厨房」—— 那时候整页只有一台冰箱。
                现在是一整套公寓了，措辞跟着改；而且开场本来就是灯一盏盏亮起来。 */}
            {!ready && !failed && <div className="fv-boot">正在开灯…</div>}
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

            {/* 谱子。翻出来之后就一直挂着不卸 —— 面板关掉只是移出视野，曲子还在
                弹，谱面上的高亮也还得接着走。 */}
            {sheetThing && sheetFound && (
                <aside
                    className={`fv-sheet${sheetOpen ? ' is-open' : ''}${onRest ? ' has-score' : ''}`}
                    aria-hidden={!sheetOpen}
                >
                    <button className="fv-panel__close fv-sheet__close"
                            onClick={() => setSheetOpen(false)} aria-label="关闭">✕</button>
                    <div className="fv-panel__head">
                        <div className="fv-panel__place">{title}</div>
                        <div className="fv-panel__sub">
                            {subtitle ? `${subtitle} · ` : ''}{spot}
                        </div>
                    </div>
                    <div className="fv-sheet__scroll">
                        {!userAbc && (
                            <div className="fv-panel__body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{sheetThing.body || ''}</ReactMarkdown>
                            </div>
                        )}
                        {scoreState !== 'ready' ? (
                            <p className="fv-sheet__note">
                                {scoreState === 'failed' ? '这份谱子没排出来 —— 关掉再点一次试试。' : '正在排谱…'}
                            </p>
                        ) : !onRest && (
                            <p className="fv-sheet__note">谱面在你手上。放上谱架，这台琴就能照着弹。</p>
                        )}
                        {/* 手上拿着的时候把谱面收起来、但不卸载 —— 卸了每次都要重排
                            一遍八十七小节，高亮那套绑定也得重接。收在外面这层上：
                            abcjs 的 responsive:'resize' 会往 paper 上写行内 display，
                            压不过它。
                            renderAbc 会把 paper 的 innerHTML 整个换掉，别往里放
                            React 的孩子。 */}
                        <div className="fv-sheet__score">
                            <div className="fv-sheet__paper" ref={paperRef} />
                        </div>
                    </div>
                    {/* 底下三段：先是「弹不弹」，再是弹到哪儿，最后才是设置。
                        谱子放哪儿归到设置那一排 —— 那是「它住哪」，不是操作。 */}
                    <div className="fv-sheet__foot">
                        <div className="fv-sheet__btns">
                            <button className="fv-btn" disabled={scoreState !== 'ready'}
                                    onClick={() => (playing ? pauseSheet() : playSheet())}>
                                {playing ? '停一下 ⏸' : holdAt > 0.5 ? '接着弹 ▶' : '让它弹一遍 ▶'}
                            </button>
                            {/* 停在半路才有「从头」可按 —— 本来就在开头的话它是个死键 */}
                            {holdAt > 0.5 && (
                                <button className="fv-btn fv-btn--mini" onClick={rewindSheet}
                                        title="回到开头">从头 ↺</button>
                            )}
                        </div>
                        <div
                            className="fv-sheet__prog"
                            role="slider"
                            tabIndex={scoreState === 'ready' ? 0 : -1}
                            aria-label="播放进度"
                            aria-valuemin={0}
                            aria-valuemax={Math.round(totalRef.current)}
                            aria-valuenow={Math.round(holdAt)}
                            onClick={scoreState === 'ready' ? seekFromPointer : undefined}
                            onKeyDown={scoreState === 'ready' ? seekByKey : undefined}
                        >
                            <span ref={barRef} />
                        </div>
                        <span className="fv-sheet__clock" ref={clockRef}>0:00</span>

                        <div className="fv-sheet__tools">
                            <span className="fv-sheet__label">速度</span>
                            {[0.5, 0.75, 1, 1.25].map((r) => (
                                <button
                                    key={r}
                                    className={`fv-chip${rate === r ? ' is-on' : ''}`}
                                    aria-pressed={rate === r}
                                    onClick={() => changeRate(r)}
                                >{r === 1 ? '原速' : `${r}×`}</button>
                            ))}
                        </div>
                        <div className="fv-sheet__tools">
                            {onRest ? (
                                <button className="fv-chip" disabled={playing}
                                        onClick={() => putOnRest(false)}>拿下来</button>
                            ) : (
                                <>
                                    <button className="fv-chip" disabled={scoreState !== 'ready'}
                                            onClick={() => putOnRest(true)}>放上谱架</button>
                                    <button className="fv-chip" onClick={stowSheet}>收回抽屉</button>
                                </>
                            )}
                            <button className="fv-chip fv-chip--wide"
                                    onClick={() => { setUploadText(userAbc || ''); setUploadErr(''); setUploadOpen(true); }}>
                                换一份谱 ⇪
                            </button>
                        </div>
                    </div>
                </aside>
            )}

            {uploadOpen && (
                <div className="fv-guide" role="dialog" aria-modal="true"
                     aria-label="换一份谱子" onClick={() => setUploadOpen(false)}>
                    <div className="fv-guide__panel fv-upload" onClick={(e) => e.stopPropagation()}>
                        <button className="fv-panel__close fv-guide__close"
                                onClick={() => setUploadOpen(false)} aria-label="关闭">✕</button>
                        <div className="fv-guide__head">
                            <div className="fv-guide__title">换一份谱子</div>
                            <div className="fv-guide__sub">
                                贴一段 <b>ABC 记谱</b>进来，或者拖一个 .abc 文件。这台琴就照着它弹。
                                谱子只存在你自己的浏览器里，不上传到任何地方。
                            </div>
                        </div>
                        <div className="fv-guide__body">
                            <textarea
                                className="fv-upload__text"
                                value={uploadText}
                                spellCheck={false}
                                onChange={(e) => { setUploadText(e.target.value); setUploadErr(''); }}
                                placeholder={'X:1\nT:曲名\nM:4/4\nQ:1/4=72\nL:1/8\nK:C\nCDEF GABc |'}
                            />
                            <div className="fv-upload__row">
                                <label className="fv-chip fv-chip--wide">
                                    选个文件…
                                    <input
                                        type="file"
                                        accept=".abc,.txt,text/plain"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            e.target.value = '';
                                            if (!f) return;
                                            f.text().then((t) => { setUploadText(t); setUploadErr(''); })
                                                .catch(() => setUploadErr('这个文件读不出来'));
                                        }}
                                    />
                                </label>
                                {uploadErr && <span className="fv-upload__err">{uploadErr}</span>}
                            </div>
                        </div>
                        <div className="fv-guide__foot">
                            <button className="fv-btn" onClick={() => applyAbc(uploadText)}>用这份 →</button>
                            {userAbc && (
                                <button className="fv-btn fv-btn--mini" onClick={clearAbc}>
                                    换回《{sheetThing.title}》
                                </button>
                            )}
                            <span className="fv-guide__note">ABC 记谱怎么写：abcnotation.com</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 面板关掉之后还能把它叫停、再接上。停下之后这条**不收** ——
                收了的话屏幕上就一个入口都没有了，只剩去屋里把那张纸再点一次。 */}
            {sheetThing && !sheetOpen && (playing || holdAt > 0.5) && (
                <div className="fv-playing">
                    <span className={`fv-playing__dot${playing ? '' : ' is-held'}`} />
                    {playing ? `正在弹《${title}》` : `《${title}》停在 ${mmss(holdAt)}`}
                    {playing ? (
                        <button className="fv-btn fv-btn--mini" onClick={pauseSheet}>停一下</button>
                    ) : (
                        <button className="fv-btn fv-btn--mini" onClick={() => playSheet()}>接着弹</button>
                    )}
                    <button className="fv-btn fv-btn--mini" onClick={() => setSheetOpen(true)}>看谱</button>
                </div>
            )}

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
                <button className="fv-btn fv-btn--mini" onClick={() => setGuide(true)}>玩法 ?</button>
                <span className="fv-hint">
                    {coarse ? '拖动转视角 · 点哪儿走哪儿' : 'WASD 走动 · 拖动或 ← → 转视角 · 点哪儿走哪儿'}
                    {view === 'fridge'
                        ? ` · ${places.length} 枚冰箱贴，点开看详情 · 家电点把手开门 · 旋钮点火、龙头能转能放水`
                        : ' · 钢琴开电源就能弹 · 唱机能掀盖、能放唱片 · 灯罩点一下开关灯 · 柜门抽屉垃圾桶都点得开，抽屉里有东西'}
                </span>
            </div>

            {guide && (
                <div className="fv-guide" role="dialog" aria-modal="true"
                     aria-label="怎么玩" onClick={closeGuide}>
                    {/* 点面板本身不该关掉，所以这儿把冒泡掐了 */}
                    <div className="fv-guide__panel" onClick={(e) => e.stopPropagation()}>
                        {/* 借 fv-panel__close 的样子，但定位要自己来 ——
                            那个类在 ≤820px 有 top:-22px（给底部抽屉式详情面板的），
                            照搬会让 ✕ 翘到弹窗外面压住右上角的按钮。 */}
                        <button className="fv-panel__close fv-guide__close"
                                onClick={closeGuide} aria-label="关闭">✕</button>
                        <div className="fv-guide__head">
                            <div className="fv-guide__title">怎么玩</div>
                            <div className="fv-guide__sub">
                                一间照着实测尺寸复刻的公寓。屋里的东西大多能上手。
                            </div>
                        </div>
                        <div className="fv-guide__body">
                            <section>
                                <h4>走动</h4>
                                <ul>
                                    {coarse ? (
                                        <li><b>拖动</b>转视角，<b>点地板</b>就走过去</li>
                                    ) : (
                                        <li><b>W A S D</b> 走动，<b>拖动</b>或 <b>← →</b> 转视角，<b>点地板</b>就走过去</li>
                                    )}
                                    <li>右上角四个按钮直接跳到<b>厨房 / 客厅 / 窗边 / 影音角</b></li>
                                </ul>
                            </section>
                            <section>
                                <h4>冰箱贴</h4>
                                <ul>
                                    <li>冰箱门上 <b>{places.length} 枚</b>磁贴，点开看是从哪儿带回来的</li>
                                    <li>不想转的话，<b>列表 ☰</b> 是纯文字版</li>
                                </ul>
                            </section>
                            <section>
                                <h4>能上手的东西</h4>
                                <ul>
                                    <li><b>柜门 / 抽屉 / 垃圾桶盖</b> —— 点一下开，再点一下关</li>
                                    <li><b>冰箱 · 烤箱 · 微波炉 · 洗碗机</b> —— 点把手开门</li>
                                    <li><b>灶台旋钮</b> —— 点一下点火，再点一下熄火</li>
                                    <li><b>水龙头</b> —— 能转向，也能放水</li>
                                    <li><b>电钢琴</b> —— 先开电源，然后就能弹</li>
                                    <li><b>唱机</b> —— 能掀盖、能放唱片</li>
                                    <li><b>灯罩</b> —— 点一下开灯关灯</li>
                                    <li><b>抽屉</b> —— 不只是能拉开，里头有东西</li>
                                </ul>
                            </section>
                        </div>
                        <div className="fv-guide__foot">
                            <button className="fv-btn" onClick={closeGuide}>进屋 →</button>
                            <span className="fv-guide__note">左下角「玩法 ?」随时能再看</span>
                        </div>
                    </div>
                </div>
            )}

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
