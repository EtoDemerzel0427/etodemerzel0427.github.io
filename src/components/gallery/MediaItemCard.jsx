import React, { useMemo } from 'react';
import { Star, Clock, BookOpen, Film, Music, CheckCircle2 } from 'lucide-react';
import { getFontClass } from '../../utils/theme';

const MediaItemCard = ({ item, universe, onClick }) => {
    // Helper to get Status info
    const getStatusInfo = (status) => {
        switch (status) {
            case 'reading': case 'watching': case 'listening': case 'playing':
                return { color: 'text-blue-500', icon: Clock, label: 'In Progress' };
            case 'finished':
                return { color: 'text-green-500', icon: CheckCircle2, label: 'Finished' };
            case 'wishlist':
                return { color: 'text-yellow-500', icon: Star, label: 'Wishlist' };
            default:
                return { color: 'text-gray-500', icon: BookOpen, label: 'Unknown' };
        }
    };

    const statusInfo = getStatusInfo(item.status);
    const StatusIcon = statusInfo.icon;

    // Calculate random rotation and color for tape (Lofi) AND background color (Punk)
    const randomStyle = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < item.id.length; i++) {
            hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Lofi Tape Rotation
        const tapeRotation = (hash % 6) - 3;

        // Lofi Tape Colors
        // Lofi Tape Colors
        const lofiColors = ['#e0c097', '#ffccbc', '#c1e1c1', '#e1bee7', '#b2dfdb'];
        const tapeColor = lofiColors[Math.abs(hash) % lofiColors.length];

        // Lofi Card Backgrounds (Pastel Palette from theme.js)
        // Replaced #fff8e1 (Cream) with #f3e5f5 (Lavender) for better contrast
        const lofiCardColors = ['#f3e5f5', '#e8f5e9', '#fff3e0', '#e3f2fd', '#fce4ec'];
        const lofiBg = lofiCardColors[Math.abs(hash) % lofiCardColors.length];

        // Punk Card Background Colors
        const punkColors = [
            '#B92056', // Deep Pink
            '#E85627', // Orange
            '#F0B54D', // Gold/Yellow (Matches scheme)
            '#682957', // Deep Purple
            '#67B9A9', // Teal/Green
            '#2B5983', // Dark Blue
        ];
        const punkColor = punkColors[Math.abs(hash) % punkColors.length];

        return { tapeRotation, tapeColor, lofiBg, punkColor };
    }, [universe, item.id]);

    // Theme-specific styles (Updated to use dynamic punk color)
    const getCardStyle = () => {
        // Base transitions and layout
        const base = "relative flex flex-col transition-all duration-300 cursor-pointer group";
        // Only hide overflow for non-Lofi themes to allow tape to stick out
        const overflow = universe === 'lofi' ? '' : 'overflow-hidden';

        if (universe === 'punk') {
            return `${base} ${overflow} border-[3px] border-black p-4 shadow-[5px_5px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:-translate-y-1 hover:-translate-x-[1px] -rotate-1 hover:rotate-0`;
        }
        if (universe === 'retro') {
            return `${base} ${overflow} bg-[#2d2a2e] border-2 border-white/20 p-2 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:border-[#ff0055]`;
        }
        if (universe === 'noir') {
            return `${base} ${overflow} bg-[#1a1a1a] border border-white/20 p-4 rounded-3xl hover:bg-[#222] grayscale hover:grayscale-0 shadow-[0_4px_20px_rgba(255,255,255,0.05)]`;
        }
        if (universe === 'bauhaus') {
            return `${base} ${overflow} bg-[#f4f1ea] border-4 border-black p-4 shadow-md hover:-translate-y-1`;
        }
        if (universe === 'terminal') {
            return `${base} ${overflow} bg-black border-4 border-double border-[#00ff41]/50 p-4 font-mono text-[#00ff41] hover:border-[#00ff41] hover:shadow-[0_0_20px_rgba(0,255,65,0.2)] rounded-none`;
        }
        if (universe === 'cyberpunk') {
            // Dark bg, yellow border, hover turns WHITE (not yellow) with black text.
            // Using cyber-clip utility and standard border to match homepage theme.js exactly.
            return `${base} ${overflow} bg-[#1a1a1a] p-4 text-[#fcee0a] border border-[#fcee0a] hover:bg-white hover:text-black hover:shadow-[0_0_10px_rgba(252,238,10,0.8)] cyber-clip`;
        }
        if (universe === 'comic') {
            return `${base} ${overflow} bg-white border-[3px] border-black p-4 shadow-[6px_6px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000]`;
        }
        if (universe === 'newspaper') {
            return `${base} ${overflow} bg-white border-y-2 border-black p-4 hover:bg-gray-50`;
        }
        if (universe === 'lofi') {
            // No overflow hidden for lofi, dynamic BG applied in inline style
            return `${base} p-4 shadow-sm hover:shadow-md hover:-translate-y-1 rounded-sm mt-4`;
        }
        if (universe === 'botanical') {
            return `${base} ${overflow} bg-[#f0ead6] border border-[#a3b18a] p-4 rounded-xl hover:shadow-md hover:border-[#3a5a40]`;
        }
        if (universe === 'aero') {
            return `${base} ${overflow} bg-white/40 backdrop-blur-[10px] border border-white/30 p-4 shadow-lg rounded-2xl hover:bg-white/60 hover:scale-[1.02]`;
        }
        // Default / Neon
        return `${base} ${overflow} bg-white/80 backdrop-blur-sm border border-white/40 rounded-2xl p-4 hover:bg-white shadow-sm hover:shadow-md hover:-translate-y-1`;
    };

    return (
        <div
            className={getCardStyle()}
            onClick={() => onClick(item)}
            style={{
                ...(universe === 'punk' ? { backgroundColor: randomStyle.punkColor } : {}),
                ...(universe === 'lofi' ? { backgroundColor: randomStyle.lofiBg } : {})
            }}
        >
            {/* Noir Gradient Overlay - Increased Brightness */}
            {universe === 'noir' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-white/5 to-transparent pointer-events-none rounded-3xl mix-blend-overlay"></div>
            )}

            {/* Lofi Tape on top of card */}
            {universe === 'lofi' && (
                <div
                    className="absolute -top-3 left-1/2 w-20 h-6 shadow-sm z-20 pointer-events-none opacity-90"
                    style={{
                        backgroundColor: randomStyle.tapeColor,
                        transform: `translateX(-50%) rotate(${randomStyle.tapeRotation}deg)`,
                    }}
                ></div>
            )}

            {/* Image Container */}
            <div className={`relative w-full aspect-[2/3] mb-4 overflow-hidden
                ${universe === 'punk' ? 'border-2 border-black bg-white' : 'rounded-lg'}
                ${universe === 'retro' ? 'rounded-sm border border-white/20' : ''}
                ${universe === 'bauhaus' ? 'rounded-none border-2 border-black' : ''}
                ${universe === 'newspaper' ? 'border border-black rounded-none' : ''} 
                ${universe === 'botanical' ? 'rounded-lg border border-[#a3b18a]' : ''}
                ${['default', 'neon', 'aero', 'botanical'].includes(universe) ? 'shadow-md' : ''}
            `}>
                <img
                    src={item.cover}
                    alt={item.title}
                    className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110
                        ${universe === 'retro' || universe === 'noir' ? 'grayscale hover:grayscale-0' : ''}
                        ${universe === 'lofi' ? 'sepia-[0.3]' : ''}
                    `}
                />

                {/* Overlay Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider
                    ${universe === 'punk' ? 'bg-black text-white' : 'bg-white/90 text-black backdrop-blur shadow-sm rounded-full'}
                    ${universe === 'terminal' ? '!bg-[#003300] !text-[#00ff41] rounded-none border border-[#00ff41]' : ''}
                    ${universe === 'newspaper' ? '!bg-black !text-white rounded-none' : ''}
                     ${universe === 'cyberpunk' ? '!bg-[#fcee0a] !text-black rounded-none skew-x-[-10deg]' : ''}
                `}>
                    {item.genre}
                </div>

            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                <h3 className={`text-lg font-bold leading-tight mb-1 ${getFontClass(universe, 'title')}
                    ${universe === 'retro' ? 'text-white' : ''}
                    ${universe === 'noir' ? 'text-gray-200' : ''}
                    ${universe === 'aero' ? 'text-gray-800' : ''}
                `}>
                    {item.title}
                </h3>
                <p className={`text-sm mb-3 opacity-70
                    ${universe === 'retro' ? 'text-gray-400' : ''}
                    ${universe === 'noir' ? 'text-gray-500' : ''}
                    ${universe === 'botanical' ? 'text-[#3a5a40]' : ''}
                    ${universe === 'lofi' ? 'text-[#586e75]' : ''}
                `}>
                    {item.creator}
                </p>

                {/* Rating if available */}
                {item.rating && (
                    <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                size={12}
                                className={`${i < Math.floor(item.rating) ? 'fill-current' : 'opacity-20'}
                                    ${universe === 'punk' ? 'text-black' : 'text-yellow-500'}
                                    ${universe === 'retro' ? 'text-[#ff0055]' : ''}
                                    ${universe === 'noir' ? 'text-white' : ''}
                                    ${universe === 'terminal' ? 'text-[#00ff41]' : ''}
                                    ${universe === 'newspaper' ? 'text-black' : ''}
                                    ${universe === 'botanical' ? 'text-[#3a5a40]' : ''}
                                    ${universe === 'lofi' ? 'text-[#b58900]' : ''}
                                `}
                            />
                        ))}
                    </div>
                )}

                {/* Review Bubble / Summary */}
                {item.summary && (
                    <div className={`mt-auto text-xs p-3 relative line-clamp-3
                        ${universe === 'punk' ? 'bg-white border-2 border-black text-black italic' : 'bg-black/5 rounded-lg text-gray-600'}
                        ${universe === 'retro' ? '!bg-black/30 border border-white/10 !text-gray-300 !text-[9px] !leading-[1.4]' : ''}
                        ${universe === 'noir' ? '!bg-white/5 !text-gray-400' : ''}
                        ${universe === 'terminal' ? '!bg-[#003300] !text-[#00ff41]' : ''}
                        ${universe === 'newspaper' ? '!bg-gray-100 !text-black rounded-none border-l-2 border-black italic' : ''}
                        ${universe === 'lofi' ? '!bg-white/50 !text-[#586e75] border border-gray-200' : ''}
                        ${universe === 'botanical' ? '!bg-[#a3b18a]/20 !text-[#3a5a40]' : ''}
                        ${universe === 'cyberpunk' ? '!bg-[#1a1a1a] !text-[#fcee0a] border border-[#fcee0a]/30' : ''}
                    `}>
                        "{item.summary}"
                    </div>
                )}

                {/* Progress Bar for Reading Items */}
                {item.status === 'reading' && (
                    <div className="mt-3 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${universe === 'punk' ? 'bg-black' : 'bg-blue-500'}
                                ${universe === 'retro' ? 'bg-[#ff0055]' : ''}
                                ${universe === 'terminal' ? 'bg-[#00ff41]' : ''}
                                ${universe === 'newspaper' ? 'bg-black' : ''}
                                ${universe === 'botanical' ? 'bg-[#3a5a40]' : ''}
                                ${universe === 'lofi' ? 'bg-[#b58900]' : ''}
                                ${universe === 'cyberpunk' ? 'bg-[#fcee0a]' : ''}
                            `}
                            style={{ width: `${item.progress}%` }}
                        ></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaItemCard;
