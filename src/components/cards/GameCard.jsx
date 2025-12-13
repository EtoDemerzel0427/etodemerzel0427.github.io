import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { getCardStyle } from '../../utils/theme';

const GameCard = ({ universe, data, className }) => {
    // data = game object (title, platform, status, cover, link)
    return (
        <div className={`${getCardStyle(universe, universe === 'punk' ? 'primary' : 'primary', `md:col-span-2 ${className}`)} relative overflow-hidden group cursor-pointer transform-gpu
       ${universe === 'noir' ? 'grayscale' : ''}
       ${universe === 'neon' ? '!bg-[#10141e] border border-blue-500/30' : ''}
        /* Use dark bg as base */
       ${!['noir', 'neon', 'retro'].includes(universe) ? '!bg-[#10141e]' : ''}
    `}
            style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }} // Force Safari/Chrome to respect border-radius clipping
            onClick={() => window.open(data.link, '_blank')}>

            {/* Immersive Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={data.cover}
                    alt={data.title}
                    className={`w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105
             ${universe === 'noir' ? 'grayscale contrast-125 brightness-75' : 'brightness-50 group-hover:brightness-40'}
           `}
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 h-full w-full">

                {/* Top Left: Status */}
                <div className={`absolute top-2 left-4 flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md
           ${universe === 'neon' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/10 text-white/80 border border-white/10'}
         `}>
                    <Gamepad2 size={14} className={universe === 'neon' ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{data.status}</span>
                </div>

                {/* Top Right: PS5 Badge */}
                <div className={`absolute top-2 right-4 px-2 py-1 rounded font-bold text-[10px] tracking-widest bg-white text-black`}>
                    {data.platform}
                </div>

                {/* Bottom Right: Title */}
                <div className="absolute bottom-4 right-4 text-right max-w-[70%]">
                    <h3 className={`text-2xl md:text-3xl font-black italic tracking-tighter text-white drop-shadow-lg leading-none
              ${universe === 'neon' ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-[0_0_10px_rgba(58,134,255,0.5)]' : ''}
            `}>
                        {data.title}
                    </h3>
                </div>
            </div>
        </div>
    );
};

export default GameCard;
