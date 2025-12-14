import React from 'react';
import { Cpu, ArrowRight, Leaf, Newspaper as NewspaperIcon } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

const BioCard = ({ universe, data, className }) => {
    return (
        <div className={`${getCardStyle(universe, 'primary', `col-span-1 row-span-2 sm:col-span-2 md:col-span-2 ${className}`)} p-6 md:!p-10 relative`}>
            {/* Universe Specific Decorations */}
            {universe === 'neon' && (
                <>
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#3A86FF]/5 via-white/0 to-[#EF476F]/5 opacity-100"></div>
                    <div className="absolute top-10 right-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
                </>
            )}

            {universe === 'noir' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none"></div>
            )}

            {universe === 'aero' && (
                <div className="absolute top-4 right-4 flex gap-2">
                    <div className="w-8 h-2 bg-white/50 rounded-full"></div>
                    <div className="w-4 h-2 bg-white/30 rounded-full"></div>
                </div>
            )}

            {universe === 'punk' && (
                <div className="absolute top-[-10px] right-[-10px] bg-yellow-400 border-2 border-black px-2 py-1 transform rotate-6 font-black shadow-[2px_2px_0_#000]">
                    RAW!!
                </div>
            )}

            {/* LOFI DECO - Washi Tape */}
            {universe === 'lofi' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e0c097]/80 transform -rotate-1 shadow-sm z-20"></div>
            )}

            {/* NEWSPAPER DECO */}
            {universe === 'newspaper' && (
                <div className="absolute top-0 left-0 w-full p-4 border-b-4 border-double border-black flex justify-between items-center bg-[#f4f4f0]">
                    <div className="flex items-center gap-2">
                        <NewspaperIcon size={16} />
                        <span className="font-serif font-bold text-xs tracking-widest">THE DAILY CODE</span>
                    </div>
                    <span className="font-serif text-[10px] italic">VOL. 12 • NO. 1</span>
                </div>
            )}

            {/* COMIC DECO - CRUNCH */}
            {universe === 'comic' && (
                <>
                    <div className="absolute inset-0 manga-speedlines opacity-10 pointer-events-none"></div>
                    {/* z-50 to ensure it pops out */}
                    <div className="absolute -top-6 -right-6 bg-[#ff0000] text-white p-4 font-black text-2xl rotate-12 shadow-[4px_4px_0_#000] border-[3px] border-black z-50">
                        CRUNCH!!
                    </div>
                    <div className="absolute bottom-4 right-4 bg-white border-[3px] border-black p-3 rounded-[50%_50%_0_50%] z-20 shadow-[4px_4px_0_#000]">
                        <span className="font-comic text-sm">C++ POWER!</span>
                    </div>
                </>
            )}


            {universe === 'cyberpunk' && (
                <>
                    <div className="absolute top-5 right-5 flex flex-col items-end gap-1 pointer-events-none z-20">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-[#00f0ff] animate-pulse"></div>
                                <div className="w-1 h-1 bg-[#00f0ff]/50"></div>
                                <div className="w-1 h-1 bg-[#00f0ff] animate-pulse delay-75"></div>
                            </div>
                            <span className="text-[10px] font-cyber text-[#00f0ff] tracking-widest drop-shadow-[0_0_5px_#00f0ff]">NET.LINK_ACTIVE</span>
                        </div>
                        <div className="w-full h-[2px] bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/50 w-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <div className="h-4 w-[2px] bg-[#00f0ff] mr-0 shadow-[0_0_8px_#00f0ff]"></div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-6 caution-tape border-t-2 border-black z-10"></div>
                </>
            )}

            {/* Bauhaus Deco Hanging Out */}
            {universe === 'bauhaus' && (
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#ffb703] rounded-full border-4 border-black z-20"></div>
            )}

            {/* Botanical Deco */}
            {universe === 'botanical' && (
                <div className="absolute -top-4 -left-4 text-[#3a5a40] transform -rotate-12 z-20">
                    <Leaf size={48} fill="#a3b18a" />
                </div>
            )}

            <div className={`z-10 relative h-full flex flex-col justify-between 
        ${universe === 'newspaper' ? 'pt-8 md:pt-12' : ''} 
        ${universe === 'cyberpunk' ? 'pb-4 md:pb-8' : ''}
        ${universe === 'terminal' ? 'pb-4 md:pb-12' : ''}
        ${universe === 'bauhaus' ? 'pt-12 md:pt-20' : ''}
    `}>
                <div className={universe === 'bauhaus' ? 'max-w-[90%] md:max-w-[80%]' : ''}>
                    <Cpu size={48} className={`mb-4 md:mb-6 transition-colors 
    ${universe === 'neon' ? 'text-[#3A86FF]' : ''}
    ${universe === 'retro' ? 'text-[#ff0055]' : ''}
    ${universe === 'terminal' ? 'text-[#00ff41]' : 'opacity-90'}
    ${universe === 'newspaper' ? 'text-black' : ''}
    ${universe === 'aero' ? 'text-blue-600 drop-shadow-sm' : ''}
    ${universe === 'comic' ? 'text-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]' : ''}
    ${universe === 'lofi' ? 'text-[#b58900]' : ''}
    ${universe === 'cyberpunk' ? 'text-black' : ''}
    ${universe === 'bauhaus' ? 'text-white absolute -left-2 -top-2 sm:-left-4 sm:-top-4 w-12 h-12 sm:w-16 sm:h-16 bg-black p-2 sm:p-3 rounded-full border-4 border-white' : ''}
    ${universe === 'botanical' ? 'text-[#3a5a40] opacity-0' : ''} 
  `} />
                    {/* Botanical hides standard icon for custom leaf */}
                    <h2 className={`${universe === 'cyberpunk' ? 'leading-relaxed' : 'leading-tight'} mb-2 md:mb-6 ${getFontClass(universe, 'title')}
    ${(universe === 'retro' || universe === 'terminal') ? 'text-base sm:text-lg md:text-xl' : 'text-lg sm:text-xl md:text-3xl lg:text-4xl'}
  `}>
                        {universe === 'terminal' ? '> ' : ''}
                        {universe === 'newspaper' ? 'Forging ultra-low latency ' : 'Forging ultra-low latency '}
                        <br />
                        <span className={
                            universe === 'punk' ? 'italic bg-[#FEE440] px-1' :
                                universe === 'retro' ? 'text-[#55ffff]' :
                                    universe === 'terminal' ? 'bg-[#00ff41] text-black px-1' :
                                        universe === 'newspaper' ? 'italic decoration-4 underline' :
                                            universe === 'aero' ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600' :
                                                universe === 'comic' ? 'bg-black text-white px-2 skew-x-[-5deg] inline-block' :
                                                    universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] px-1 inline-block' :
                                                        universe === 'bauhaus' ? 'text-[#ffb703] underline decoration-4' :
                                                            universe === 'botanical' ? 'italic text-[#3a5a40]' :
                                                                'text-transparent bg-clip-text bg-gradient-to-r from-[#3A86FF] to-[#8338EC]'
                        }>
                            systems with C++.
                        </span>
                        {universe === 'terminal' && <span className="animate-pulse">_</span>}
                    </h2>
                </div>

                <div className={`space-y-4 md:space-y-6 ${universe === 'bauhaus' ? 'pl-4 border-l-4 border-white' : ''} pt-2`}>
                    <p className={`text-xs sm:text-sm md:text-lg max-w-md leading-relaxed ${getFontClass(universe, 'body')}
            ${universe === 'neon' ? 'text-gray-500' : 'opacity-90'}
          `}>
                        Building the backbone of high-frequency trading. Obsessed with memory models, lock-free structures, and zero-cost abstractions.
                    </p>
                    <div className="flex gap-4 pt-1 md:pt-2">
                        <button
                            onClick={() => window.open(data?.projectUrl || 'https://github.com', '_blank')}
                            className={`px-5 py-2.5 md:px-8 md:py-4 font-bold text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer
              ${universe === 'punk' ? 'bg-black text-white shadow-[4px_4px_0px_#fff] hover:-translate-y-1' : ''}
              ${universe === 'retro' ? 'bg-[#ff0055] text-white border-2 border-white hover:scale-105 rounded-sm text-[10px] shadow-[2px_2px_0px_rgba(255,255,255,0.5)]' : ''}
              ${universe === 'terminal' ? 'bg-[#00ff41] text-black hover:bg-white rounded-none border border-[#00ff41]' : ''}
              ${universe === 'newspaper' ? 'border-y-2 border-black bg-white text-black hover:bg-black hover:text-white rounded-none uppercase tracking-widest font-serif' : ''}
              ${universe === 'aero' ? 'bg-white/50 border border-white/60 text-gray-800 hover:bg-white hover:text-blue-600 rounded-full shadow-lg backdrop-blur-md' : ''}
              ${universe === 'comic' ? 'bg-white text-black border-[3px] border-black hover:bg-black hover:text-white shadow-[4px_4px_0_#000]' : ''}
              ${universe === 'lofi' ? 'bg-[#eee8d5] text-[#b58900] border border-[#d3cbb7] rounded-sm' : ''}
              ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] border-2 border-black hover:bg-[#00f0ff] hover:text-black cyber-clip' : ''}
              ${universe === 'bauhaus' ? 'bg-[#1d3557] text-white rounded-none hover:bg-[#457b9d] border-2 border-white shadow-none' : ''}
              ${universe === 'botanical' ? 'bg-[#3a5a40] text-white rounded-xl hover:bg-[#588157]' : ''}
              ${universe === 'noir' ? 'bg-white text-black hover:bg-gray-200 rounded-full' : ''}
              ${universe === 'neon' ? 'bg-gray-900 text-white hover:bg-black rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5' : ''}
             `}>
                            View Projects <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BioCard;
