import { Library } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

const ArchiveCard = ({ universe, data, className }) => {
    // data = { count: 35, siteUrl: '...' }
    const handleClick = () => {
        if (data.siteUrl) {
            window.location.href = data.siteUrl;
        }
    };

    return (
        <div className={`${getCardStyle(universe, 'white', className)} cursor-pointer`} onClick={handleClick}>

            {universe === 'lofi' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#ffccbc]/80 transform rotate-2 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-start">
                <div className={universe === 'neon' ? 'text-gray-400' : ''}>
                    <Library size={28} strokeWidth={1.5} />
                </div>
                <div className={`text-xs font-bold px-3 py-1.5 transition-colors
          ${universe === 'punk' ? 'bg-black text-white border-2 border-black' : ''}
          ${universe === 'retro' ? 'bg-[#55ffff] text-black border-2 border-white rounded-sm text-[8px]' : ''}
          ${universe === 'terminal' ? 'border border-[#00ff41] text-[#00ff41] rounded-none' : ''}
          ${universe === 'newspaper' ? 'border-b-2 border-black text-black rounded-none italic font-serif' : ''}
          ${universe === 'aero' ? 'bg-white/50 border border-white/60 text-blue-900 rounded-full' : ''}
          ${universe === 'comic' ? 'bg-white border-[3px] border-black text-black shadow-[2px_2px_0_#000]' : ''}
          ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] border-none cyber-clip' : ''}
          ${universe === 'bauhaus' ? 'bg-black text-white rounded-none absolute -top-4 -right-4' : ''}
          ${universe === 'botanical' ? 'bg-[#a3b18a] text-white rounded-lg' : ''}
          ${universe === 'noir' ? 'border border-white/20 rounded text-gray-400' : ''}
          ${universe === 'neon' ? 'bg-gray-100 text-gray-500 rounded-full' : ''}
        `}>
                    ARCHIVE
                </div>
            </div>

            {universe === 'neon' && (
                <div className="absolute bottom-4 right-4 w-12 h-12 bg-gray-100 rounded-full blur-xl opacity-50"></div>
            )}

            <div className={universe === 'bauhaus' ? 'mt-8' : ''}>
                <div className={`text-6xl font-black mb-0 tracking-tighter ${getFontClass(universe, 'title')}`}>
                    {data.count}
                </div>
                <div className="text-sm font-bold uppercase tracking-widest opacity-40">Posts</div>
            </div>
        </div>
    );
};

export default ArchiveCard;
