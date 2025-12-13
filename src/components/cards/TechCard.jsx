import React from 'react';
import { Terminal } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

const TechCard = ({ universe, data, loading, className }) => {
    // data = featuredPost object
    const handleClick = () => {
        if (data && data.url) {
            window.open(data.url, '_blank');
        }
    };

    return (
        <div className={`${getCardStyle(universe, universe === 'punk' ? 'white' : 'white', `md:col-span-2 ${className}`)}`}>

            {universe === 'neon' && (
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-60"></div>
            )}

            {universe === 'lofi' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-40 h-8 bg-[#e1bee7]/80 transform -rotate-1 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg transition-colors
             ${universe === 'punk' ? 'bg-[#00BBF9] border border-black text-white' : ''}
             ${universe === 'retro' ? 'bg-[#ff0055] text-white rounded-sm border-2 border-white' : ''}
             ${universe === 'terminal' ? 'bg-[#00ff41]/20 text-[#00ff41] rounded-none border border-[#00ff41]' : ''}
             ${universe === 'newspaper' ? 'bg-black text-white rounded-none' : ''}
             ${universe === 'aero' ? 'bg-white/50 text-blue-700 shadow-md' : ''}
             ${universe === 'comic' ? 'bg-black text-white rounded-none border-2 border-black' : ''}
             ${universe === 'cyberpunk' ? 'bg-[#00f0ff] text-black border-none rounded-none' : ''}
             ${universe === 'bauhaus' ? 'bg-[#ffb703] text-black rounded-none border-2 border-black' : ''}
             ${universe === 'botanical' ? 'bg-[#3a5a40] text-white rounded-lg' : ''}
             ${universe === 'neon' ? 'bg-[#3A86FF]/10 text-[#3A86FF]' : ''}
             ${universe === 'noir' ? 'bg-blue-500/20 text-blue-400' : ''}
           `}>
                        <Terminal size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                        {data ? data.category : '...'}
                    </span>
                </div>
                <span className={`text-xs font-bold ${universe === 'punk' ? 'font-code' : 'opacity-40'} ${universe === 'retro' ? 'text-[8px]' : ''}`}>
                    {data ? data.date : '...'}
                </span>
            </div>
            <div className="group-hover:translate-x-1 transition-transform duration-300 relative z-10 cursor-pointer"
                onClick={handleClick}>
                <h3 className={`text-2xl md:text-3xl font-bold mb-3 leading-tight ${getFontClass(universe, 'title')}
           ${universe === 'punk' ? 'decoration-2 underline-offset-4 group-hover:underline' : ''}
           ${universe === 'newspaper' ? 'italic' : ''}
           ${universe === 'comic' ? 'uppercase italic' : ''}
           ${universe === 'neon' ? 'text-gray-900 group-hover:text-[#3A86FF] transition-colors' : ''}
        `}>
                    {universe === 'newspaper' && <span className="bg-black text-white text-xs px-1 mr-2 not-italic align-middle">EXCLUSIVE</span>}
                    {data ? data.title : 'Loading...'}
                </h3>
                <p className={`text-base font-medium line-clamp-2 leading-relaxed opacity-60 ${getFontClass(universe, 'body')}`}>
                    {data ? data.summary : 'Fetching latest article...'}
                </p>
            </div>
        </div>
    );
};

export default TechCard;
