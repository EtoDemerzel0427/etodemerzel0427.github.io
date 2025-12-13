import React from 'react';
import { Disc } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

const MusicCard = ({ universe, data, isPlaying, onToggle, className }) => {
    return (
        <div className={`${getCardStyle(universe, 'green', className)} group cursor-pointer`} onClick={onToggle}>

            {universe === 'neon' && (
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-[#06D6A0] to-white opacity-20 rounded-full blur-xl"></div>
            )}

            {universe === 'lofi' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#b9f6ca]/80 transform rotate-2 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className={`p-3 rounded-full transition-colors
          ${universe === 'neon' ? 'bg-white/20 text-white backdrop-blur-md' : ''}
          ${universe === 'punk' ? 'bg-white border-2 border-black' : ''}
          ${universe === 'retro' ? 'bg-white border-2 border-white text-black rounded-sm' : ''}
          ${universe === 'terminal' ? 'border border-[#00ff41] text-[#00ff41] rounded-none' : ''}
          ${universe === 'newspaper' ? 'border border-black bg-white text-black rounded-none' : ''}
          ${universe === 'aero' ? 'bg-white/50 text-blue-900 border border-white/40 shadow-inner' : ''}
          ${universe === 'comic' ? 'bg-white border-[3px] border-black text-black' : ''}
          ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] rounded-none border-none' : ''}
          ${universe === 'bauhaus' ? 'bg-white text-[#457b9d] absolute -right-2 -top-2 w-12 h-12 flex items-center justify-center border-2 border-black' : ''}
          ${universe === 'botanical' ? 'bg-[#a3b18a]/30 text-[#3a5a40]' : ''}
          ${universe === 'noir' ? 'bg-white/10' : ''}
        `}>
                    <Disc size={20} className={universe === 'punk' ? 'text-black' : ''} />
                </div>

                <div className="flex gap-1 h-6 items-end">
                    {[0.4, 0.7, 0.3, 1.0].map((h, i) => (
                        <div key={i}
                            className={`w-1.5 ${isPlaying ? 'animate-[music-bar_1s_ease-in-out_infinite]' : 'h-2 bg-current/20'}
                ${universe === 'punk' ? 'bg-black border border-black' : ''}
                ${universe === 'retro' ? 'bg-[#ff0055]' : ''}
                ${universe === 'terminal' ? 'bg-[#00ff41]' : ''}
                ${universe === 'newspaper' ? 'bg-black' : ''}
                ${universe === 'aero' ? 'bg-blue-500/80 shadow-[0_0_10px_white]' : ''}
                ${universe === 'comic' ? 'bg-black' : ''}
                ${universe === 'cyberpunk' ? 'bg-black' : ''}
                ${universe === 'bauhaus' ? 'bg-white' : ''}
                ${universe === 'botanical' ? 'bg-[#3a5a40]' : ''}
                ${universe === 'noir' ? 'bg-green-500' : ''}
                ${universe === 'neon' ? 'bg-white/80 rounded-full' : ''}
              `}
                            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
                        />
                    ))}
                </div>
            </div>

            {/* Cyberpunk Deco */}
            {universe === 'cyberpunk' && (
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-1 gap-1">
                    {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-3 bg-[#fcee0a]"></div>)}
                </div>
            )}

            <div className={`relative z-10 ${universe === 'bauhaus' ? 'pl-8' : ''}`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-1 opacity-70 ${universe === 'retro' ? 'text-[8px]' : ''}`}>
                    {isPlaying ? 'Now Playing' : 'Click to Play'}
                </div>
                <h3 className={`text-2xl leading-none mb-1 font-bold ${getFontClass(universe, 'title')}`}>{data.song}</h3>
                <p className="text-sm font-medium opacity-80">{data.artist}</p>
            </div>
        </div>
    );
};

export default MusicCard;
