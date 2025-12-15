import React from 'react';
import { Trophy } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

const ScoreCard = ({ universe, data, loading, className }) => {
    // data = scores object
    const handleClick = () => window.open('https://www.fcbarcelona.com/en/football/first-team/results', '_blank');

    return (
        <div
            className={`${getCardStyle(universe, universe === 'punk' ? 'primary' : 'green', universe === 'punk' ? '!bg-[#004D98] !text-white' : '')} group relative overflow-hidden cursor-pointer ${className || ''}`}
            onClick={handleClick}
        >

            {/* Background Image (Camp Nou or colors) */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-500
           ${universe === 'noir' ? 'opacity-20' : 'opacity-10'}
      `} style={{
                    background: 'linear-gradient(135deg, #004D98 0%, #A50044 100%)'
                }}></div>

            {/* Texture overlay for retro vibes - dimmed dots for readability */}
            {universe === 'retro' && <div className="absolute inset-0 z-0 bg-[#2d2a2e]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>}

            <div className="relative z-10 h-full flex flex-col justify-between">

                {/* HEADER AREA */}
                <div className="flex justify-between items-start">

                    {/* 1. Retro Exclusive Header: '8-Bit Banner' */}
                    {universe === 'retro' ? (
                        <div className="flex items-center gap-2 w-full border-2 border-black p-1 shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden bg-gradient-to-r from-[#FF0055] via-[#FF0055] to-[#FF0088]">
                            {/* Pixel Pattern Deco */}
                            <div className="absolute top-0 right-0 p-1 flex gap-0.5">
                                <div className="w-1 h-1 bg-black/20"></div>
                                <div className="w-1 h-1 bg-black/40"></div>
                                <div className="w-1 h-1 bg-black/60"></div>
                            </div>

                            <div className="bg-black text-[#FF0055] p-1.5 flex items-center justify-center border-2 border-black min-w-[32px] z-10 relative">
                                <Trophy size={14} strokeWidth={2.5} />
                            </div>
                            <div className="overflow-hidden flex-1 relative h-full flex items-center">
                                <span className="font-pixel text-[10px] md:text-xs font-bold uppercase tracking-widest text-white drop-shadow-md animate-marquee">
                                    {data ? data.competition : 'LOADING...'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* 2. Standard Header for other Universes */
                        <>
                            <div className={`p-2 rounded-lg 
                      ${universe === 'neon' ? 'bg-white/20 backdrop-blur-md' : 'bg-white/90 text-black shadow-sm'}
                  `}>
                                <Trophy size={18} />
                            </div>
                            {data && (
                                <span className={`text-[10px] font-bold opacity-80 uppercase tracking-widest px-2 py-0.5 rounded
                    ${'bg-black/10 opacity-80'}
                `}>
                                    {data.competition}
                                </span>
                            )}
                        </>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 opacity-50">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <span className="text-xs font-bold">Loading Match...</span>
                    </div>
                ) : data ? (
                    <div className="mt-2">
                        <div className={`flex justify-between items-center mb-2`}>
                            {/* Home */}
                            <div className="flex flex-col items-center">
                                {data.homeTeam.crest ? (
                                    <img src={data.homeTeam.crest} alt="Home" className={`w-8 h-8 object-contain mb-1 drop-shadow-sm ${universe === 'retro' ? 'grayscale contrast-125 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]' : ''}`} />
                                ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[8px]">{data.homeTeam.name.substring(0, 3).toUpperCase()}</div>
                                )}
                                <span className={`text-[10px] font-black uppercase ${universe === 'retro' ? 'text-white drop-shadow-md tracking-wider' : 'opacity-70'}`}>{data.homeTeam.name.substring(0, 3).toUpperCase()}</span>
                            </div>

                            {/* Score */}
                            <div className={`text-3xl font-black tracking-tight ${getFontClass(universe, 'title')} flex gap-1
                   ${universe === 'retro' ? 'text-white drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]' : ''}
              `}>
                                <span>{data.homeTeam.score}</span>
                                <span className="opacity-40">:</span>
                                <span>{data.awayTeam.score}</span>
                            </div>

                            {/* Away */}
                            <div className="flex flex-col items-center">
                                {data.awayTeam.crest ? (
                                    <img src={data.awayTeam.crest} alt="Away" className={`w-8 h-8 object-contain mb-1 drop-shadow-sm ${universe === 'retro' ? 'grayscale contrast-125 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]' : ''}`} />
                                ) : (
                                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[8px]">{data.awayTeam.name.substring(0, 3).toUpperCase()}</div>
                                )}
                                <span className={`text-[10px] font-black uppercase ${universe === 'retro' ? 'text-white drop-shadow-md tracking-wider' : 'opacity-70'}`}>{data.awayTeam.name.substring(0, 3).toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full
                          ${data.status === 'FINISHED' ? 'bg-green-500/20 text-green-700' : 'bg-yellow-500/20 text-yellow-700'}
                          ${universe === 'retro' ? '!bg-[#55ffff] !text-black border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.5)]' : ''}
                          ${universe === 'bauhaus' ? '!bg-[#f4f1ea] !text-[#1d3557] !rounded-none shadow-sm font-bold' : ''}
                          ${universe === 'punk' ? '!bg-[#F7E018] !text-black border-2 border-black -rotate-1 shadow-[2px_2px_0px_#000] !font-black' : ''}
                     `}>{data.date}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center opacity-60">
                        <div className="text-xs font-bold mb-1">No Recent Match</div>
                        <div className="text-[10px]">Updating soon...</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScoreCard;
