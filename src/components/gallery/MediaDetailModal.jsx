import React from 'react';
import { X, Star, Calendar, User, AlignLeft, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { getFontClass } from '../../utils/theme';

const MediaDetailModal = ({ item, universe, onClose }) => {
    // Helper to get status color/icon
    const getStatusInfo = (status) => {
        switch (status) {
            case 'reading': case 'watching': case 'listening': case 'playing':
                return { color: 'text-blue-500', bg: 'bg-blue-100', icon: Clock, label: 'In Progress' };
            case 'finished':
                return { color: 'text-green-500', bg: 'bg-green-100', icon: CheckCircle2, label: 'Finished' };
            case 'wishlist':
                return { color: 'text-yellow-500', bg: 'bg-yellow-100', icon: Star, label: 'Wishlist' };
            default:
                return { color: 'text-gray-500', bg: 'bg-gray-100', icon: BookOpen, label: 'Unknown' };
        }
    };

    const { color: statusColor, bg: statusBg, icon: StatusIcon, label } = getStatusInfo(item.status);

    // Dynamic Theme Styles
    const getModalTheme = () => {
        const baseContent = "relative w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in-95 duration-300";
        const baseClose = "absolute top-4 right-4 z-20 p-2 rounded-full transition-transform hover:scale-110";

        switch (universe) {
            case 'punk':
                return {
                    wrapper: `${baseContent} bg-white border-[4px] border-black shadow-[8px_8px_0_#000]`,
                    closeBtn: `${baseClose} bg-black text-white hover:rotate-90`,
                    imageCont: "border-b-4 md:border-b-0 md:border-r-4 border-black",
                    tag: "border border-black bg-white text-black",
                    review: "bg-white border-2 border-black",
                    progress: "bg-black"
                };
            case 'noir':
                return {
                    wrapper: `${baseContent} bg-[#1a1a1a] text-gray-200 border border-white/20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.05)]`,
                    closeBtn: `${baseClose} bg-white/10 text-white hover:bg-white/20`,
                    imageCont: "md:border-r border-white/10 grayscale",
                    tag: "bg-white/10 text-white border border-white/20",
                    review: "bg-white/5 border border-white/10",
                    progress: "bg-white"
                };
            case 'cyberpunk':
                return {
                    wrapper: `${baseContent} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] clip-path-polygon-[0_0,100%_0,100%_90%,90%_100%,0_100%] drop-shadow-[0_0_15px_rgba(252,238,10,0.5)]`,
                    closeBtn: `${baseClose} bg-[#fcee0a] text-black hover:bg-white rounded-none`,
                    imageCont: "border-r border-[#fcee0a]/50 clip-path-polygon-[0_0,100%_0,100%_85%,85%_100%,0_100%]",
                    tag: "bg-black text-[#fcee0a] border border-[#fcee0a] rounded-none",
                    review: "bg-black/50 border border-[#fcee0a]/30 text-[#fcee0a]",
                    progress: "bg-[#fcee0a] shadow-[0_0_10px_#fcee0a]"
                };
            case 'terminal':
                return {
                    wrapper: `${baseContent} bg-black text-[#00ff41] border-4 border-double border-[#00ff41] rounded-none font-mono shadow-[0_0_20px_rgba(0,255,65,0.3)]`,
                    closeBtn: `${baseClose} bg-[#00ff41] text-black hover:bg-[#003300] hover:text-[#00ff41] rounded-none`,
                    imageCont: "border-b-4 md:border-b-0 md:border-r-4 border-double border-[#00ff41]/50 grayscale sepia hue-rotate-[90deg] contrast-150",
                    tag: "bg-[#003300] text-[#00ff41] border border-[#00ff41] rounded-none",
                    review: "bg-black border border-[#00ff41]/50",
                    progress: "bg-[#00ff41]"
                };
            case 'retro':
                return {
                    wrapper: `${baseContent} bg-[#2d2a2e] text-white border-2 border-[#ff0055] rounded-lg shadow-[0_0_20px_#ff0055]`,
                    closeBtn: `${baseClose} bg-[#ff0055] text-white hover:bg-[#ff0055]/80 rounded-sm`,
                    imageCont: "border-r border-white/10",
                    tag: "bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]",
                    review: "bg-[#ff0055]/5 border border-[#ff0055]/20",
                    progress: "bg-[#ff0055] shadow-[0_0_10px_#ff0055]"
                };
            case 'newspaper':
                return {
                    wrapper: `${baseContent} bg-[#f4f4f0] text-black border-y-4 border-black font-serif rounded-none`,
                    closeBtn: `${baseClose} bg-black text-white hover:bg-gray-800 rounded-none`,
                    imageCont: "border-r border-black",
                    tag: "bg-white text-black border border-black rounded-none uppercase tracking-widest",
                    review: "bg-white border-y border-black/20 italic",
                    progress: "bg-black"
                };
            case 'lofi':
                return {
                    wrapper: `${baseContent} bg-[#fff8e1] text-[#5d4037] rounded-xl shadow-[8px_8px_0_#e0c097]`,
                    closeBtn: `${baseClose} bg-[#e0c097] text-[#5d4037] hover:bg-[#d7ccc8]`,
                    imageCont: "rounded-l-xl opacity-90 sepia-[.3]",
                    tag: "bg-[#e0c097]/20 text-[#5d4037]",
                    review: "bg-white/50 border-none shadow-inner",
                    progress: "bg-[#e0c097]"
                };
            case 'botanical':
                return {
                    wrapper: `${baseContent} bg-[#f0ead6] text-[#3a5a40] border border-[#a3b18a] rounded-2xl shadow-xl`,
                    closeBtn: `${baseClose} bg-[#3a5a40] text-white hover:bg-[#588157]`,
                    imageCont: "rounded-l-2xl",
                    tag: "bg-[#a3b18a]/20 text-[#3a5a40] border border-[#a3b18a]",
                    review: "bg-[#fff] border border-[#a3b18a]/20",
                    progress: "bg-[#3a5a40]"
                };
            case 'aero':
                return {
                    wrapper: `${baseContent} bg-white/60 backdrop-blur-2xl border border-white/40 text-gray-800 rounded-3xl shadow-[0_8px_32px_rgba(31,38,135,0.15)]`,
                    closeBtn: `${baseClose} bg-white/50 text-blue-600 hover:bg-white`,
                    imageCont: "rounded-l-3xl",
                    tag: "bg-white/40 text-blue-600 border border-white/50 shadow-sm",
                    review: "bg-white/30 border border-white/40 shadow-inner",
                    progress: "bg-blue-500" // Standard Aero blue
                };
            case 'bauhaus':
                return {
                    wrapper: `${baseContent} bg-[#f4f1ea] border-4 border-black rounded-none shadow-[10px_10px_0_#1d3557]`,
                    closeBtn: `${baseClose} bg-[#e63946] text-white hover:bg-[#1d3557] rounded-none`,
                    imageCont: "border-r-4 border-black",
                    tag: "bg-[#1d3557] text-white rounded-none",
                    review: "bg-white border-2 border-black rounded-none",
                    progress: "bg-[#ffb703]"
                };
            case 'comic':
                return {
                    wrapper: `${baseContent} bg-white text-black border-[3px] border-black shadow-[8px_8px_0_#000] font-comic`,
                    closeBtn: `${baseClose} bg-[#ff0000] text-white border-2 border-black hover:-translate-y-1 shadow-[2px_2px_0_#000]`,
                    imageCont: "border-r-[3px] border-black",
                    tag: "bg-white text-black border-2 border-black shadow-[2px_2px_0_#000]",
                    review: "bg-[#f0f0f0] border-2 border-black border-dashed",
                    progress: "bg-[#ff0000]"
                };
            default: // Default / Neon
                return {
                    wrapper: `${baseContent} bg-white rounded-2xl`,
                    closeBtn: `${baseClose} bg-black/5 hover:bg-black/10 text-black`,
                    imageCont: "",
                    tag: `${statusBg} ${statusColor}`,
                    review: "bg-gray-50",
                    progress: "bg-blue-500"
                };
        }
    };

    const theme = getModalTheme();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className={theme.wrapper}>
                <button onClick={onClose} className={theme.closeBtn}>
                    <X size={20} />
                </button>

                {/* Left: Image */}
                <div className={`w-full md:w-1/3 relative shrink-0 ${theme.imageCont}`}>
                    <img
                        src={item.cover}
                        alt={item.title}
                        className="w-full h-full object-cover min-h-[300px]"
                    />
                    {/* Optional gradient overlay for text visibility on mobile if needed, though theme styles might handle it */}
                </div>

                {/* Right: Content */}
                <div className="flex-1 p-6 md:p-8 flex flex-col gap-6">
                    {/* Header */}
                    <div>
                        <h2 className={`text-3xl md:text-4xl font-bold mb-2 ${getFontClass(universe, 'title')}`}>
                            {item.title}
                        </h2>
                        <div className={`text-xl opacity-70 flex items-center gap-2 ${getFontClass(universe, 'body')}`}>
                            <User size={18} />
                            {item.creator}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.tag}`}>
                            <StatusIcon size={14} />
                            {label}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.tag}`}>
                            <Calendar size={14} />
                            {item.year}
                        </div>
                        {item.rating && (
                            <div className="flex items-center gap-1 text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} className={i < Math.floor(item.rating) ? 'fill-current' : 'opacity-30'} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Review / Content */}
                    {(item.review || item.summary) && (
                        <div className={`flex-1 relative p-6 rounded-2xl ${theme.review}`}>
                            <div className="absolute -top-3 -left-2 text-4xl opacity-20">❝</div>
                            <div className="flex items-start gap-4">
                                <AlignLeft className="shrink-0 opacity-50 mt-1" size={20} />
                                <div className={`leading-relaxed whitespace-pre-wrap font-medium opacity-90 ${getFontClass(universe, 'body')}`}>
                                    {item.review || item.summary}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {item.status === 'reading' && (
                        <div className="mt-auto">
                            <div className="flex justify-between text-xs font-bold mb-1 uppercase opacity-70">
                                <span>Progress</span>
                                <span>{item.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200/20 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${theme.progress}`}
                                    style={{ width: `${item.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaDetailModal;
