import React from 'react';
import { Home, ArrowUpRight } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

/* ============================================================================
   /my-apt/ 在首页上的入口。

   画的是那间屋子的**平面图**，不是截图：截图只能是一个宇宙的配色，而线稿
   全部用 currentColor 画，十二个宇宙各自的文字色一接管就成了那个宇宙的图。
   卡片底色统一取 'blue' —— neon / bauhaus / punk 那几个宇宙下就是深底白线，
   正好是蓝图。

   坐标 = 场景里的局部坐标（米），x 是 living.js 的 lx，y 是 lz。数字来自
   docs/kitchen-scan.md 的实测表和 kitchen/*.js 里的常量，所以这张图和走进去
   看到的是同一间屋子；改了那边的尺寸，这里也该跟着改。
   ========================================================================== */

// 外墙一圈：厨房那条 + 西边的走廊 + 客厅，东北角那两级台阶是灶台一线折向窗墙的地方
const SHELL = 'M -0.75 -1.95 L 2.74 -1.95 L 2.74 -1.53 L 3.15 -1.53 L 3.15 -1.09 '
    + 'L 3.95 -1.09 L 3.95 4.66 L -0.4 4.66 L -0.4 -0.18 L -3.85 -0.18 L -3.85 -1.34 L -0.75 -1.34 Z';

// 描边版：走廊北墙上留出卫生间门洞（room.js：门宽 1.03，右门框在 -1.515）
const WALLS = 'M -0.75 -1.34 L -0.75 -1.95 L 2.74 -1.95 L 2.74 -1.53 L 3.15 -1.53 L 3.15 -1.09 '
    + 'L 3.95 -1.09 L 3.95 4.66 L -0.4 4.66 L -0.4 -0.18 L -3.85 -0.18 L -3.85 -1.34 L -2.545 -1.34 '
    + 'M -1.515 -1.34 L -0.75 -1.34';
// 门扇 + 开启弧线：平面图上这一笔一出来，谁都知道这是张户型图
const DOOR = 'M -1.515 -1.34 L -1.515 -0.31 M -1.515 -0.31 A 1.03 1.03 0 0 0 -2.545 -1.34';

// 窗墙和电视墙交角上那根方柱（书桌一线为什么在 3.95 收口，就是被它顶住的）
const COLUMN = { x: 3.14, y: 3.95, w: 0.81, h: 0.71 };

const PROPS = [
    { id: 'fridge', x: -0.615, y: -1.95, w: 0.95, h: 0.72, star: true },  // 磁贴墙
    { id: 'counter', x: 0.58, y: -1.95, w: 2.12, h: 0.65 },
    { id: 'range', x: 0.90, y: -1.95, w: 0.78, h: 0.65, solid: true },
    { id: 'bar', x: 0.69, y: -0.22, w: 1.84, h: 1.08 },
    { id: 'piano', x: 3.605, y: -0.71, w: 0.29, h: 1.32, solid: true },
    { id: 'desk-n', x: 3.15, y: 0.74, w: 0.77, h: 1.57 },
    { id: 'desk-s', x: 3.15, y: 2.38, w: 0.77, h: 1.57 },
    { id: 'sofa', x: 0.33, y: 1.78, w: 1.90, h: 0.92 },
    { id: 'table', x: 0.82, y: 3.01, w: 1.16, h: 0.63 },
    { id: 'tv', x: 0.62, y: 4.05, w: 1.65, h: 0.56 },
];

/* 开场机位（KitchenScene 的 VIEWS[0]）：站在沙发上方，正对着冰箱。
   卡片上画成一个视锥，锥尖落在冰箱那面墙上 —— 点进去看到的就是这一眼。 */
const EYE = { x: 2.02, y: 2.55 };
const LOOK = { x: 0.05, y: -1.32 };
const CONE = (() => {
    const angle = Math.atan2(LOOK.y - EYE.y, LOOK.x - EYE.x);
    const half = 0.36;                                    // ≈ 21°，和 fov 34 的横向视野差不多
    const len = Math.hypot(LOOK.x - EYE.x, LOOK.y - EYE.y) + 0.2;
    const edge = (t) => `${(EYE.x + Math.cos(angle + t) * len).toFixed(3)} ${(EYE.y + Math.sin(angle + t) * len).toFixed(3)}`;
    return `M ${EYE.x} ${EYE.y} L ${edge(-half)} A ${len} ${len} 0 0 1 ${edge(half)} Z`;
})();

// 图上的强调色：冰箱、视锥、footer 的数字都用它。底色是 getCardStyle(_, 'blue')。
const ACCENT = {
    neon: '#FFD166',
    noir: '#ffffff',
    aero: '#2563eb',
    punk: '#F7E018',
    retro: '#ff0055',
    terminal: '#ffb000',
    bauhaus: '#e63946',
    newspaper: '#c1121f',
    comic: '#e63946',
    lofi: '#b58900',
    botanical: '#bc4749',
    cyberpunk: '#00f0ff',
};

// 图标底片 / 角标。'blue' 那一档每个宇宙的底色都不同，所以不能照抄别的卡片。
const CHIP = {
    neon: 'bg-white/20 text-white',
    noir: 'bg-white/10 text-white',
    aero: 'bg-white/50 text-blue-700 shadow-md',
    punk: 'bg-white text-black rounded-none border-2 border-white',
    retro: 'bg-[#ff0055] text-white rounded-sm border-2 border-white',
    terminal: 'bg-[#00ff41]/20 text-[#00ff41] rounded-none border border-[#00ff41]',
    bauhaus: 'bg-[#ffb703] text-black rounded-none',
    newspaper: 'bg-black text-white rounded-none',
    comic: 'bg-black text-white rounded-none border-2 border-black',
    lofi: 'bg-white/70 text-[#586e75] rounded-sm',
    botanical: 'bg-[#3a5a40] text-white rounded-lg',
    cyberpunk: 'bg-[#00f0ff] text-black rounded-none',
};

const microLabel = 'text-[10px] font-bold uppercase tracking-widest opacity-50';

const FloorPlan = ({ universe, accent, magnetCount }) => {
    // 硬边宇宙的线要粗、要实；报纸和终端相反，细线才像制图/CRT
    const wall = ['punk', 'comic'].includes(universe) ? 2.6
        : ['newspaper', 'retro', 'terminal'].includes(universe) ? 1.2 : 1.6;
    const dash = universe === 'terminal' ? '0.09 0.07'
        : universe === 'retro' ? '0.06 0.06' : undefined;
    const label = universe === 'retro' ? 0.2 : 0.28;

    return (
        <svg
            viewBox="-4.15 -2.4 8.4 7.36"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full transition-transform duration-500 group-hover:scale-[1.02]"
            role="img"
            aria-label="Floor plan of the apartment: a galley kitchen, a hallway, and a living room with a desk run along the window."
        >
            {/* 地板 */}
            <path d={SHELL} fill="currentColor" fillOpacity="0.05" />

            {/* 家具：留白的是柜体和台面，实心的是灶和钢琴 */}
            {PROPS.filter((p) => !p.star).map((p) => (
                <rect
                    key={p.id} x={p.x} y={p.y} width={p.w} height={p.h}
                    fill="currentColor" fillOpacity={p.solid ? 0.34 : 0.14}
                    stroke="currentColor" strokeOpacity="0.45" strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            ))}

            {/* 方柱：实心，画成结构而不是家具 */}
            <rect
                x={COLUMN.x} y={COLUMN.y} width={COLUMN.w} height={COLUMN.h}
                fill="currentColor" fillOpacity="0.3"
            />

            {/* 开场机位的视锥，正好落在冰箱上 */}
            <path d={CONE} fill={accent} fillOpacity="0.13" />

            {/* 冰箱 —— 这张卡真正想说的东西 */}
            {PROPS.filter((p) => p.star).map((p) => (
                <rect
                    key={p.id} x={p.x} y={p.y} width={p.w} height={p.h}
                    fill={accent} fillOpacity="0.85"
                    stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                />
            ))}

            {/* 外墙最后画，压住所有家具的边 */}
            <path
                d={WALLS} fill="none" stroke="currentColor" strokeWidth={wall}
                strokeDasharray={dash} strokeLinejoin="miter" vectorEffect="non-scaling-stroke"
            />
            <path
                d={DOOR} fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1"
                vectorEffect="non-scaling-stroke"
            />

            {/* 站位 */}
            <g>
                <circle
                    cx={EYE.x} cy={EYE.y} r="0.16" fill={accent} fillOpacity="0.5"
                    className="animate-ping [transform-box:fill-box] [transform-origin:center]"
                />
                <circle cx={EYE.x} cy={EYE.y} r="0.11" fill={accent} />
            </g>

            {/* --- 标注。左边那片空白是走廊外面，正好放引线 --- */}
            <g fill="currentColor" fontWeight="700" letterSpacing="0.02">
                <text x="1.62" y="-0.72" fontSize={label} textAnchor="middle" opacity="0.5">KITCHEN</text>
                <text x="3.53" y="1.52" fontSize={label} textAnchor="middle" opacity="0.5"
                    transform="rotate(90 3.53 1.52)">DESK</text>
                <text x="-0.62" y="2.32" fontSize={label} textAnchor="end" opacity="0.5">LIVING</text>
                <path d="M -0.5 2.26 L -0.05 2.26" stroke="currentColor" strokeOpacity="0.35"
                    strokeWidth="1" vectorEffect="non-scaling-stroke" />

                {/* 冰箱引线。压在门洞开启弧线上会打架，所以整块提到墙线以上 */}
                <text x="-0.95" y="-2.03" fontSize={label} textAnchor="end" opacity="0.6">FRIDGE</text>
                <text x="-0.95" y="-1.69" fontSize={label} textAnchor="end" fill={accent}>
                    {magnetCount} MAGNETS
                </text>
                <path d="M -0.85 -1.76 L -0.6 -1.76" stroke={accent} strokeWidth="1"
                    vectorEffect="non-scaling-stroke" />

                {/* 图签栏：图纸左下角那块，顺手把这张图的来历写清楚 */}
                <path d="M -3.85 3.32 L -1.9 3.32" stroke="currentColor" strokeOpacity="0.3"
                    strokeWidth="1" vectorEffect="non-scaling-stroke" />
                {/* 字宽随宇宙的字体变，短一点才不会顶到北墙上 */}
                <text x="-3.85" y="3.76" fontSize="0.26" textAnchor="start" opacity="0.55">ROOMPLAN SCAN</text>
                <text x="-3.85" y="4.1" fontSize="0.24" textAnchor="start" opacity="0.35">08.25.2026</text>

                {/* 指北针（北在 -x 那头）+ 比例尺 */}
                <g opacity="0.35">
                    <path d="M -3.35 4.6 L -3.85 4.6 M -3.85 4.6 L -3.7 4.5 M -3.85 4.6 L -3.7 4.7"
                        stroke="currentColor" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
                    <text x="-3.25" y="4.69" fontSize="0.24" textAnchor="start">N</text>
                    <path d="M -2.6 4.49 L -2.6 4.71 M -2.6 4.6 L -1.6 4.6 M -1.6 4.49 L -1.6 4.71"
                        stroke="currentColor" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
                    <text x="-1.5" y="4.69" fontSize="0.24" textAnchor="start">1 M</text>
                </g>
            </g>
        </svg>
    );
};

/**
 * 和 WikiCard 并排占满首页最后那一条 band：两列宽、两行高。
 * 平面图是主体，所以 header / footer 都压到最薄，中间那块全给它。
 */
const ApartmentCard = ({ universe, data, className }) => {
    // data = { url, magnetCount, pianoKeys, lamps }
    const apt = data || {};
    const accent = ACCENT[universe] || ACCENT.neon;
    const chip = CHIP[universe] || CHIP.neon;

    const stats = [
        { value: apt.magnetCount ?? '—', label: 'Magnets' },
        { value: apt.pianoKeys ?? 88, label: 'Keys' },
        { value: apt.lamps ?? 3, label: 'Lamps' },
    ];

    return (
        <a
            href={apt.url || '/my-apt/'}
            className={`${getCardStyle(universe, 'blue', className)} group`}
            aria-label="Walk around a 1:1 replica of my apartment"
        >
            {/* --- Header --- */}
            <div className="flex justify-between items-start gap-3 relative z-10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 shrink-0 rounded-lg ${chip}`}>
                        <Home size={16} />
                    </div>
                    <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider truncate opacity-70
            ${universe === 'retro' ? 'text-[8px] tracking-normal' : ''}`}>
                        {universe === 'terminal' ? '~/my-apt' : 'My Apartment'}
                    </span>
                    <span className={`hidden lg:inline ${microLabel} !opacity-40 ml-3 shrink-0`}>
                        Chicago
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className={`text-[10px] font-bold px-2.5 py-1 tracking-widest rounded ${chip}
            ${universe === 'retro' ? 'text-[8px]' : ''}`}>
                        3D
                    </div>
                    <ArrowUpRight size={16} className="opacity-40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
            </div>

            {/* --- 平面图 --- */}
            <div className="flex-1 min-h-0 -mx-2 my-2 relative z-10">
                <FloorPlan universe={universe} accent={accent} magnetCount={apt.magnetCount ?? 20} />
            </div>

            {/* --- Footer --- */}
            <div className="flex items-end justify-between gap-3 relative z-10 shrink-0">
                <div className="flex items-end gap-4">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <div className={`text-xl lg:text-2xl font-black leading-none tabular-nums ${getFontClass(universe, 'title')}
                ${universe === 'retro' ? '!text-sm' : ''}`}>
                                {stat.value}
                            </div>
                            <div className={`${microLabel} mt-1`}>{stat.label}</div>
                        </div>
                    ))}
                </div>
                <span className={`hidden lg:block ${microLabel} !opacity-40 text-right`}>
                    WASD · Click to walk
                </span>
            </div>
        </a>
    );
};

export default ApartmentCard;
