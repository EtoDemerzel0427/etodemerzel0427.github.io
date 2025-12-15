import React from 'react';
import { BookOpen } from 'lucide-react';
import { getFontClass } from '../../utils/theme';

const ReadingCard = ({ universe, data, className }) => {
    // Navigate to local gallery instead of external link
    const handleClick = () => window.location.href = '/gallery';

    return (
        <div className={`md:row-span-2 relative group overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-out ${className || ''}
       ${universe === 'punk' ? 'bg-amber-100 border-2 border-black p-4 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-rotate-1 transition-all' : ''}
       ${universe === 'retro' ? 'border-2 border-white/20 bg-[#2d2a2e] p-4 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:border-[#ff0055] hover:z-10' : ''}
       ${universe === 'noir' ? 'bg-[#111] border border-white/10 rounded-3xl p-6 hover:border-white/30 hover:bg-[#161616] hover:shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)] grayscale' : ''}
       ${universe === 'aero' ? 'bg-white/40 backdrop-blur-[60px] border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] hover:bg-white/50 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(31,38,135,0.15)] rounded-[2rem] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] text-blue-900' : ''}
       ${universe === 'terminal' ? 'border-4 border-double border-[#00ff41]/50 p-5 bg-black hover:border-[#00ff41] hover:shadow-[0_0_20px_rgba(0,255,65,0.2)] rounded-none text-[#00ff41] font-mono' : ''}
       
       ${universe === 'bauhaus' ? 'bg-white text-black border-4 border-black p-8 shadow-xl hover:-translate-y-2 rounded-none relative z-10' : ''}
       ${universe === 'comic' ? 'bg-white border-[3px] border-black p-6 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 rounded-sm comic-halftone' : ''}
       ${universe === 'lofi' ? 'bg-[#fff8e1] shadow-md hover:shadow-lg hover:-translate-y-1 p-6 rounded-sm border-none rotate-1' : ''}
       ${universe === 'botanical' ? 'bg-[#f0ead6] border border-[#a3b18a] p-6 shadow-sm hover:shadow-md hover:border-[#3a5a40] rounded-xl hover:-translate-y-0.5' : ''}
       ${universe === 'cyberpunk' ? 'bg-[#1a1a1a] text-[#fcee0a] p-6 cyber-clip hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(252,238,10,0.6)] rounded-none transition-colors duration-200' : ''}
       ${universe === 'newspaper' ? 'bg-white border-y-2 border-black p-6 hover:bg-[#fafafa] rounded-none shadow-sm' : ''}
       ${universe === 'neon' ? 'bg-white text-gray-900 rounded-[2.5rem] p-8 border border-white/50 hover:-translate-y-1 neon-glow-card shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)]' : ''}
       
       ${!['punk', 'retro', 'noir', 'aero', 'terminal', 'bauhaus', 'comic', 'lofi', 'botanical', 'cyberpunk', 'newspaper', 'neon'].includes(universe) ? 'bg-white p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-500' : ''}
    `} onClick={handleClick}>

            {/* Background Decorations */}
            {['punk', 'default', 'lofi', 'bauhaus', 'comic', 'botanical'].includes(universe) && (
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-50 rounded-full -mr-16 -mt-16 z-0 mix-blend-multiply opacity-50"></div>
            )}

            {/* Terminal/Network Decorations */}
            {universe === 'terminal' && (
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
            )}
            {universe === 'cyberpunk' && (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(252,238,10,0.05)_3px)] pointer-events-none"></div>
            )}

            {/* Header Label (Absolute Top Left) */}
            <div className={`absolute top-6 left-6 flex items-center gap-2 z-20
          ${['retro', 'noir', 'terminal', 'cyberpunk'].includes(universe) ? 'opacity-80' : 'opacity-60'}
          ${universe === 'aero' ? 'text-blue-900 opacity-70' : ''}
          ${universe === 'cyberpunk' ? 'text-inherit opacity-100' : ''}
      `}>
                <BookOpen size={16} />
                <span className={`text-xs font-bold uppercase tracking-widest ${universe === 'retro' ? 'text-[8px]' : ''}`}>{data.status}</span>
            </div>

            <div className={`relative z-10 flex flex-col h-full justify-between pt-10 w-full 
          ${universe === 'aero' ? 'pb-12' : 'pb-2'}
      `}>

                {/* Flexible Image Container (Shrinks to fit, Hidden on mobile/tablet) */}
                <div className="flex-1 min-h-0 hidden md:flex items-center justify-center py-1">
                    <div className={`relative aspect-[2/3] transition-all duration-300
              ${universe === 'aero' ? 'h-[80%]' : 'h-full'}
          `}>
                        {/* Shadow/Glow behind book */}
                        <div className={`absolute inset-0 blur-xl rounded-full scale-110 translate-y-2
                ${universe === 'terminal' ? 'bg-[#00ff41]/20' : 'bg-black/10'}
                ${universe === 'aero' ? 'bg-blue-400/20' : ''}
                ${universe === 'cyberpunk' ? 'bg-[#fcee0a]/10' : ''}
            `}></div>
                        <img
                            src={data.cover}
                            alt={data.title}
                            className={`h-full w-auto max-h-full rounded shadow-xl rotate-0 transition-transform duration-500 object-contain
                    ${['retro', 'noir', 'terminal'].includes(universe) ? 'grayscale contrast-125' : ''}
                    ${universe === 'aero' ? 'opacity-90 mix-blend-multiply' : ''}
                    ${universe === 'comic' ? 'border-[2px] border-black shadow-[4px_4px_0_#000]' : ''}
                    ${universe === 'bauhaus' ? 'grayscale' : ''} 
                  `}
                        />
                    </div>
                </div>

                {/* Compact Text Info */}
                <div className="shrink-0 text-center w-full px-2 mb-2 mt-2">
                    <h3 className={`text-base sm:text-lg font-bold leading-tight line-clamp-1 ${getFontClass(universe, 'title')} 
              ${universe === 'terminal' ? 'text-[#00ff41]' : ''}
              ${universe === 'noir' ? 'text-gray-100' : ''}
              ${['retro'].includes(universe) ? 'text-white' : ''}
              ${universe === 'cyberpunk' ? 'text-inherit' : ''}
              ${!['terminal', 'noir', 'retro', 'cyberpunk'].includes(universe) ? 'text-current' : ''}
          `}>
                        {data.title}
                    </h3>
                    <p className={`text-xs font-medium line-clamp-1 
              ${universe === 'terminal' ? 'text-[#00ff41] opacity-70' : 'opacity-60'}
              ${universe === 'noir' ? 'text-gray-400' : ''}
              ${universe === 'cyberpunk' ? 'text-inherit opacity-70' : ''}
              ${universe === 'bauhaus' ? 'text-gray-600' : ''}
          `}>
                        {data.author}
                    </p>
                </div>

                {/* Compact Progress Bar */}
                <div className="shrink-0 w-full px-6">
                    <div className={`flex justify-between text-[10px] font-bold mb-1.5 opacity-80
               ${universe === 'terminal' ? 'text-[#00ff41]' : ''}
               ${universe === 'cyberpunk' ? 'text-inherit' : ''}
          `}>
                        <span>Progress</span>
                        <span className={`
                ${universe === 'retro' ? 'text-[#55ffff]' : ''}
                ${universe === 'terminal' ? 'text-[#00ff41]' : ''}
                ${universe === 'aero' ? 'text-blue-700' : ''}
                ${universe === 'cyberpunk' ? 'text-inherit' : ''}
                ${!['retro', 'terminal', 'aero', 'cyberpunk'].includes(universe) ? 'text-current' : ''}
            `}>{data.progress}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden 
              ${universe === 'retro' ? 'bg-gray-700' : 'bg-black/10'}
              ${universe === 'noir' ? 'bg-gray-800' : ''}
              ${universe === 'terminal' ? 'bg-[#003300]' : ''}
              ${universe === 'aero' ? 'bg-white/40' : ''}
              ${universe === 'cyberpunk' ? 'bg-[#fcee0a]/20' : ''}
              ${!['retro', 'noir', 'terminal', 'aero', 'cyberpunk'].includes(universe) ? 'bg-gray-100' : ''}
          `}>
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out
                       ${universe === 'punk' ? 'bg-black' : ''}
                       ${universe === 'retro' ? 'bg-[#55ffff]' : ''}
                       ${universe === 'noir' ? 'bg-gray-400' : ''}
                       ${universe === 'aero' ? 'bg-blue-600/70' : ''}
                       ${universe === 'terminal' ? 'bg-[#00ff41]' : ''}
                       ${universe === 'bauhaus' ? 'bg-black' : ''}
                       ${universe === 'comic' ? 'bg-black' : ''}
                       ${universe === 'lofi' ? 'bg-[#b58900]' : ''}
                       ${universe === 'botanical' ? 'bg-[#3a5a40]' : ''}
                       ${universe === 'cyberpunk' ? 'bg-[#fcee0a] group-hover:bg-black' : ''}
                       ${universe === 'newspaper' ? 'bg-black' : ''}
                       ${!['punk', 'retro', 'noir', 'aero', 'terminal', 'bauhaus', 'comic', 'lofi', 'botanical', 'cyberpunk', 'newspaper'].includes(universe) ? 'bg-blue-600' : ''}
                     `}
                            style={{ width: `${data.progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadingCard;
