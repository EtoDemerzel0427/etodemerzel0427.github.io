import React from 'react';
import { Network, ArrowUpRight, Sprout } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

// Universes that draw with hard edges — no rounded bars / chips.
const SHARP = ['punk', 'retro', 'terminal', 'newspaper', 'comic', 'cyberpunk', 'bauhaus'];

// The card is roomy at lg, cramped below it: show every branch when there is space.
const CATEGORY_LIMIT_NARROW = 4;
const CATEGORY_LIMIT_WIDE = 6;

const asciiBar = (ratio) => {
    const filled = Math.max(1, Math.round(ratio * 10));
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
};

/**
 * Sits in its own band below the main grid, always 2 rows tall and never wider
 * than half the grid — the space next to it is reserved for future cards.
 * One stacked layout at every width; only the third recent note and the dates
 * drop out on the narrower breakpoints.
 */
const WikiCard = ({ universe, data, className }) => {
    // data = { title, url, noteCount, categoryCount, categories: [{name, count}], recent: [...], updatedAt }
    const wiki = data || {};
    const categories = wiki.categories || [];
    const recent = (wiki.recent || []).slice(0, 3);
    const shown = categories.slice(0, CATEGORY_LIMIT_WIDE);
    const hiddenNarrow = categories.length - CATEGORY_LIMIT_NARROW;
    const hiddenWide = categories.length - CATEGORY_LIMIT_WIDE;
    const maxCount = shown.reduce((max, item) => Math.max(max, item.count), 1);

    const isSharp = SHARP.includes(universe);
    const radius = isSharp ? 'rounded-none' : 'rounded-full';
    const isAscii = universe === 'terminal';

    const openWiki = () => window.open(wiki.url || '#', '_blank', 'noopener,noreferrer');

    const barFill = universe === 'retro' ? 'bg-[#ff0055]'
        : universe === 'botanical' ? 'bg-[#3a5a40]'
            : universe === 'aero' ? 'bg-blue-500/80'
                : 'bg-current';

    // Track and fill are siblings on purpose: `opacity-*` would otherwise fade the fill with it.
    const barTrack = universe === 'botanical' ? 'bg-[#a3b18a]/40'
        : universe === 'comic' ? 'bg-white border-2 border-black'
            : universe === 'aero' ? 'bg-white/50'
                : 'bg-current opacity-20';

    const microLabel = 'text-[10px] font-bold uppercase tracking-widest opacity-50';

    return (
        <div
            className={`${getCardStyle(universe, universe === 'punk' ? 'pink' : 'yellow', className)} group cursor-pointer`}
            onClick={openWiki}
            onKeyDown={(event) => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    openWiki();
                }
            }}
            role="link"
            tabIndex={0}
            aria-label={`${wiki.title || 'Wiki'} — ${wiki.noteCount} notes`}
        >
            {/* --- Universe decorations --- */}
            {universe === 'neon' && (
                <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-white/40 rounded-full blur-2xl"></div>
            )}
            {universe === 'lofi' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#c8e6c9]/80 -rotate-2 shadow-sm z-20"></div>
            )}
            {universe === 'bauhaus' && (
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-[#1d3557] rounded-tl-full z-0"></div>
            )}
            {universe === 'cyberpunk' && (
                <div className="absolute bottom-2 right-3 text-[9px] font-mono opacity-60 z-0">
                    // KNOWLEDGE.DB
                </div>
            )}
            {universe !== 'neon' && universe !== 'bauhaus' && (
                <div className="absolute -bottom-6 -right-6 opacity-[0.06] rotate-12 z-0 pointer-events-none">
                    {universe === 'botanical' ? <Sprout size={120} strokeWidth={1} /> : <Network size={120} strokeWidth={1} />}
                </div>
            )}

            {/* --- Header --- */}
            <div className="flex justify-between items-start gap-3 relative z-10">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 shrink-0 rounded-lg transition-colors
            ${universe === 'punk' ? 'bg-black border-2 border-black text-white rounded-none' : ''}
            ${universe === 'retro' ? 'bg-[#ff0055] text-white rounded-sm border-2 border-white' : ''}
            ${universe === 'terminal' ? 'bg-[#00ff41]/20 text-[#00ff41] rounded-none border border-[#00ff41]' : ''}
            ${universe === 'newspaper' ? 'bg-black text-white rounded-none' : ''}
            ${universe === 'aero' ? 'bg-white/50 text-blue-700 shadow-md' : ''}
            ${universe === 'comic' ? 'bg-black text-white rounded-none border-2 border-black' : ''}
            ${universe === 'cyberpunk' ? 'bg-[#00f0ff] text-black rounded-none' : ''}
            ${universe === 'bauhaus' ? 'bg-black text-[#ffb703] rounded-none' : ''}
            ${universe === 'botanical' ? 'bg-[#3a5a40] text-white rounded-lg' : ''}
            ${universe === 'lofi' ? 'bg-[#586e75]/10 text-[#586e75]' : ''}
            ${universe === 'neon' ? 'bg-[#5c4d00]/10 text-[#5c4d00]' : ''}
            ${universe === 'noir' ? 'bg-white/10 text-white' : ''}
          `}>
                        <Network size={16} />
                    </div>
                    <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider truncate opacity-70
            ${universe === 'retro' ? 'text-[8px] tracking-normal' : ''}`}>
                        {universe === 'terminal' ? '~/notes' : wiki.title || 'Wiki'}
                    </span>
                    {wiki.updatedAt && (
                        <span className={`hidden lg:inline ${microLabel} !opacity-40 ml-3 shrink-0`}>
                            Updated {wiki.updatedAt}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className={`text-[10px] font-bold px-2.5 py-1 tracking-widest
            ${universe === 'punk' ? 'bg-black text-white border-2 border-black -rotate-2' : ''}
            ${universe === 'retro' ? 'bg-[#55ffff] text-black border-2 border-white rounded-sm text-[8px]' : ''}
            ${universe === 'terminal' ? 'border border-[#00ff41] text-[#00ff41]' : ''}
            ${universe === 'newspaper' ? 'border-b-2 border-black text-black italic font-serif' : ''}
            ${universe === 'aero' ? 'bg-white/50 border border-white/60 text-blue-900 rounded-full' : ''}
            ${universe === 'comic' ? 'bg-white border-[3px] border-black text-black shadow-[2px_2px_0_#000]' : ''}
            ${universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black cyber-clip' : ''}
            ${universe === 'bauhaus' ? 'bg-black text-white' : ''}
            ${universe === 'botanical' ? 'bg-[#a3b18a] text-white rounded-lg' : ''}
            ${universe === 'lofi' ? 'bg-white/60 text-[#586e75] rounded-sm' : ''}
            ${universe === 'noir' ? 'border border-white/20 text-gray-400 rounded' : ''}
            ${universe === 'neon' ? 'bg-white/50 text-[#5c4d00] rounded-full' : ''}
          `}>
                        WIKI
                    </div>
                    <ArrowUpRight size={16} className="opacity-40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
            </div>

            {/* --- Body --- */}
            <div className="flex flex-col mt-3 relative z-10">

                {/* Counters */}
                <div className="flex items-end gap-5 shrink-0">
                    <div>
                        <div className={`text-4xl sm:text-5xl lg:text-6xl font-black leading-none tracking-tighter ${getFontClass(universe, 'title')}
              ${universe === 'retro' ? '!text-2xl' : ''}
              ${universe === 'terminal' ? '!text-3xl' : ''}`}>
                            {wiki.noteCount ?? '—'}
                        </div>
                        <div className={`${microLabel} mt-1`}>Notes</div>
                    </div>
                    <span className={`self-stretch w-px my-1 bg-current opacity-20 ${universe === 'punk' ? '!opacity-100 w-0.5' : ''}`} />
                    <div className="pb-1">
                        <div className={`text-2xl font-black leading-none ${getFontClass(universe, 'title')}
              ${universe === 'retro' ? '!text-base' : ''}
              ${universe === 'terminal' ? '!text-xl' : ''}`}>
                            {wiki.categoryCount ?? categories.length}
                        </div>
                        <div className={`${microLabel} mt-1`}>Branches</div>
                    </div>
                </div>

                {/* Category distribution */}
                <div className="flex flex-col gap-1.5 mt-4 w-full min-w-0">
                    {shown.map((category, index) => (
                        <div key={category.name}
                            className={`items-center gap-3 ${index >= CATEGORY_LIMIT_NARROW ? 'hidden lg:flex' : 'flex'}`}>
                            <span className={`w-20 shrink-0 text-[11px] font-bold uppercase tracking-wider truncate opacity-70
                ${universe === 'retro' ? 'text-[8px]' : ''}
                ${universe === 'lofi' ? 'normal-case text-sm' : ''}`}>
                                {category.name}
                            </span>
                            {isAscii ? (
                                <span className="font-mono text-[11px] tracking-tighter text-[#00ff41]">
                                    {asciiBar(category.count / maxCount)}
                                </span>
                            ) : (
                                <span className="flex-1 h-1.5 relative">
                                    <span className={`absolute inset-0 ${barTrack} ${radius}`} />
                                    <span
                                        className={`absolute inset-y-0 left-0 ${barFill} ${radius} transition-[width] duration-700`}
                                        style={{ width: `${Math.max(8, (category.count / maxCount) * 100)}%` }}
                                    />
                                </span>
                            )}
                            <span className={`w-5 shrink-0 text-right text-[11px] font-black tabular-nums opacity-60
                ${universe === 'retro' ? 'text-[8px]' : ''}`}>
                                {category.count}
                            </span>
                        </div>
                    ))}
                    {hiddenNarrow > 0 && (
                        <div className="lg:hidden text-[10px] font-bold uppercase tracking-widest opacity-40 pl-0.5">
                            +{hiddenNarrow} more branches
                        </div>
                    )}
                    {hiddenWide > 0 && (
                        <div className="hidden lg:block text-[10px] font-bold uppercase tracking-widest opacity-40 pl-0.5">
                            +{hiddenWide} more branches
                        </div>
                    )}
                </div>

                {/* Recently updated */}
                {recent.length > 0 && (
                    <>
                        <div className={`mt-4 min-w-0 ${universe === 'bauhaus' ? 'pr-12' : ''}`}>
                            <span className={`block h-px w-full bg-current opacity-20 mb-2
                ${['punk', 'comic', 'newspaper', 'bauhaus'].includes(universe) ? '!opacity-100 h-0.5' : ''}`} />
                            <div className={`${microLabel} !opacity-40 mb-1.5`}>Recently Updated</div>
                            <div className="flex flex-col gap-1">
                                {recent.map((note, index) => (
                                    <a
                                        key={note.url + index}
                                        href={note.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(event) => event.stopPropagation()}
                                        title={note.title}
                                        className={`items-baseline gap-3 group/note hover:opacity-100 opacity-80 transition-opacity
                      ${index === 2 ? 'hidden md:flex' : 'flex'}`}
                                    >
                                        {/* Category rides inline with the title: in the stacked layout a
                                            separate column would leave the title barely readable. */}
                                        <span className={`min-w-0 text-xs font-bold line-clamp-2 md:line-clamp-1 leading-snug group-hover/note:underline underline-offset-2
                      ${universe === 'retro' ? 'text-[9px] leading-relaxed' : ''}
                      ${universe === 'lofi' ? 'text-sm font-normal' : ''}`}>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider opacity-50 mr-1.5
                        ${universe === 'retro' ? 'text-[8px]' : ''}`}>
                                                {note.category}
                                            </span>
                                            {note.title}
                                        </span>
                                        <span className="hidden lg:block ml-auto shrink-0 text-[9px] font-bold opacity-40 tabular-nums">
                                            {note.date}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WikiCard;
