import React from 'react';

// --- 样式工厂 ---
export const getContainerStyle = (universe) => {
    switch (universe) {
        case 'noir': return "bg-[#050505] text-gray-300 font-sans selection:bg-white selection:text-black";
        case 'punk': return "bg-[#F7E018] text-black font-serif selection:bg-black selection:text-white";
        case 'retro': return "bg-[#202028] text-[#e0e0e0] font-pixel selection:bg-[#ff0055] selection:text-white relative";
        case 'terminal': return "bg-black text-[#33ff00] font-mono selection:bg-[#33ff00] selection:text-black";
        case 'newspaper': return "bg-[#f4f4f0] text-[#111] font-serif selection:bg-black selection:text-white";
        case 'aero': return "text-gray-900 font-sans selection:bg-blue-500/30 selection:text-blue-900";
        case 'comic': return "bg-[#fff9f0] text-black font-comic selection:bg-black selection:text-white";
        case 'lofi': return "bg-[#fdf6e3] text-[#586e75] font-hand selection:bg-[#eee8d5] selection:text-[#b58900]";
        case 'cyberpunk': return "bg-[#050a0e] text-[#fcee0a] font-cyber selection:bg-[#fcee0a] selection:text-black";
        case 'bauhaus': return "bg-[#f4f1ea] text-[#1d3557] font-geo selection:bg-[#e63946] selection:text-white";
        case 'botanical': return "bg-[#dad7cd] text-[#344e41] font-serif selection:bg-[#3a5a40] selection:text-white";
        case 'neon': default: return "bg-[#F4F5F7] text-gray-900 font-sans selection:bg-[#3A86FF]/20 selection:text-[#3A86FF]";
    }
};

export const getCardStyle = (universe, type = 'default', customClass = "") => {
    const baseTransition = "relative flex flex-col justify-between transition-all duration-500 ease-out";
    const overflowClass = (universe === 'bauhaus' || universe === 'comic' || universe === 'botanical' || universe === 'punk' || universe === 'lofi') ? '' : 'overflow-hidden';

    // 🌑 NOIR
    if (universe === 'noir') return `${baseTransition} ${overflowClass} bg-[#111] border border-white/10 rounded-3xl p-6 group hover:border-white/30 hover:bg-[#161616] hover:shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)] ${customClass}`;

    // 🤘 PUNK
    if (universe === 'punk') {
        const punkBase = `${baseTransition} ${overflowClass} border-[3px] border-black p-5 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 hover:-translate-x-[1px] group rotate-1 hover:rotate-0 transition-transform duration-200`;

        switch (type) {
            case 'primary': return `${punkBase} bg-black text-white ${customClass}`;
            case 'green': return `${punkBase} bg-[#ff00ff] text-black ${customClass}`;
            case 'yellow': return `${punkBase} bg-white text-black ${customClass}`;
            case 'blue': return `${punkBase} bg-black text-white ${customClass}`;
            case 'pink': return `${punkBase} bg-[#ff0000] text-black ${customClass}`;
            default: return `${punkBase} bg-white text-black ${customClass}`;
        }
    }

    if (universe === 'retro') return `${baseTransition} ${overflowClass} border-2 border-white/20 bg-[#2d2a2e] p-4 group rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:border-[#ff0055] hover:z-10 ${customClass}`;

    // 📟 TERMINAL
    if (universe === 'terminal') {
        const termBase = `${baseTransition} ${overflowClass} border-4 border-double border-[#00ff41]/50 p-5 bg-black hover:border-[#00ff41] hover:shadow-[0_0_20px_rgba(0,255,65,0.2)] group rounded-none`;
        return `${termBase} ${customClass}`;
    }

    if (universe === 'newspaper') {
        const newsBase = `${baseTransition} ${overflowClass} border-y-2 border-black p-6 bg-white group hover:bg-[#fafafa] rounded-none shadow-sm`;
        return `${newsBase} ${customClass}`;
    }

    if (universe === 'aero') return `${baseTransition} ${overflowClass} bg-white/40 backdrop-blur-[60px] border border-white/20 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] hover:bg-white/50 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(31,38,135,0.15)] rounded-[2rem] group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] ${customClass}`;

    if (universe === 'comic') {
        // Fixed: Removed background-color from base to allow halftone to show, but ensured content readability via z-index
        const comicBase = `${baseTransition} ${overflowClass} border-[3px] border-black bg-white p-6 group shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 rounded-sm comic-halftone`;
        return `${comicBase} ${customClass}`;
    }

    // ☕ LOFI
    if (universe === 'lofi') {
        const lofiBase = `${baseTransition} ${overflowClass} shadow-md hover:shadow-lg hover:-translate-y-1 p-6 rounded-sm border-none group relative`;
        switch (type) {
            case 'primary': return `${lofiBase} bg-[#fff8e1] rotate-1 ${customClass}`;
            case 'green': return `${lofiBase} bg-[#e8f5e9] -rotate-1 ${customClass}`;
            case 'yellow': return `${lofiBase} bg-[#fff3e0] rotate-2 ${customClass}`;
            case 'blue': return `${lofiBase} bg-[#e3f2fd] -rotate-2 ${customClass}`;
            case 'pink': return `${lofiBase} bg-[#fce4ec] rotate-1 ${customClass}`;
            default: return `${lofiBase} bg-white rotate-0 ${customClass}`;
        }
    }

    if (universe === 'cyberpunk') {
        const cyberBase = `${baseTransition} ${overflowClass} border-none p-6 group cyber-clip hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(252,238,10,0.6)] rounded-none transition-colors duration-200`;
        switch (type) {
            case 'primary': return `${cyberBase} bg-[#fcee0a] text-black pb-12 ${customClass}`;
            case 'green': return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`;
            case 'pink': return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`;
            case 'blue': return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`;
            default: return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`;
        }
    }

    if (universe === 'bauhaus') {
        const bauhausBase = `${baseTransition} p-8 group shadow-xl hover:-translate-y-2 border-4 border-black relative z-10`;
        const roundTop = "rounded-tr-[4rem] rounded-bl-[4rem]";
        const roundBottom = "rounded-tl-[4rem] rounded-br-[4rem]";
        const roundLeft = "rounded-r-[4rem]";
        const box = "rounded-none";

        switch (type) {
            case 'primary': return `${bauhausBase} bg-[#e63946] text-white ${roundTop} ${customClass}`;
            case 'green': return `${bauhausBase} bg-[#457b9d] text-white ${roundLeft} ${customClass}`;
            case 'yellow': return `${bauhausBase} bg-[#ffb703] text-black ${box} ${customClass}`;
            case 'blue': return `${bauhausBase} bg-[#1d3557] text-white ${roundBottom} ${customClass}`;
            default: return `${bauhausBase} bg-white text-black ${box} ${customClass}`;
        }
    }

    if (universe === 'botanical') {
        const botBase = `${baseTransition} ${overflowClass} bg-[#f0ead6] border border-[#a3b18a] p-6 shadow-sm hover:shadow-md hover:border-[#3a5a40] rounded-xl group hover:-translate-y-0.5`;
        return `${botBase} ${customClass}`;
    }

    // ✨ NEON
    const neonBase = `${baseTransition} ${overflowClass} rounded-[2.5rem] p-8 group border border-white/50 hover:-translate-y-1 relative overflow-hidden neon-glow-card`;
    switch (type) {
        case 'primary': return `${neonBase} bg-white text-gray-900 shadow-[0_10px_40px_-10px_rgba(58,134,255,0.2)] ${customClass}`;
        case 'white': return `${neonBase} bg-white text-gray-900 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] ${customClass}`;
        case 'green': return `${neonBase} bg-[#06D6A0] text-white shadow-[0_10px_40px_-10px_rgba(6,214,160,0.4)] ${customClass}`;
        case 'yellow': return `${neonBase} bg-[#FFD166] text-[#5c4d00] shadow-[0_10px_40px_-10px_rgba(255,209,102,0.4)] ${customClass}`;
        case 'blue': return `${neonBase} bg-[#3A86FF] text-white shadow-[0_10px_40px_-10px_rgba(58,134,255,0.4)] ${customClass}`;
        case 'pink': return `${neonBase} bg-[#EF476F] text-white shadow-[0_10px_40px_-10px_rgba(239,71,111,0.4)] ${customClass}`;
        default: return `${neonBase} bg-white text-gray-900 ${customClass}`;
    }
};

export const getFontClass = (universe, variant = 'body') => {
    if (universe === 'punk') return variant === 'title' ? 'font-academic italic font-black uppercase tracking-tighter' : 'font-code font-bold uppercase';
    if (universe === 'retro') return 'font-pixel text-xs md:text-sm tracking-widest leading-loose';
    if (universe === 'terminal') return 'font-mono text-sm md:text-base text-shadow-glow';
    if (universe === 'newspaper') return variant === 'title' ? 'font-academic font-bold tracking-tight' : 'font-serif';
    if (universe === 'aero') return variant === 'title' ? 'font-sans font-light tracking-wide' : 'font-sans font-light tracking-wide';
    if (universe === 'comic') return 'font-comic tracking-wider uppercase';
    if (universe === 'lofi') return 'font-hand text-lg';
    if (universe === 'cyberpunk') return 'font-cyber tracking-widest uppercase';
    if (universe === 'bauhaus') return 'font-geo tracking-tight';
    if (universe === 'botanical') return 'font-serif tracking-wide';
    if (universe === 'neon') return variant === 'title' ? 'font-academic font-bold tracking-tight' : 'font-sans';
    return variant === 'title' ? 'font-sans tracking-tight' : 'font-sans';
};

export const getTagStyle = (universe, colorType) => {
    if (universe === 'retro') return "border-2 border-current px-2 py-1 text-[8px] bg-white text-black";
    if (universe === 'terminal') return "border border-[#00ff41] px-2 py-0 text-xs bg-[#00ff41] text-black font-bold";
    if (universe === 'newspaper') return "border-y border-black px-0 py-1 text-xs font-bold uppercase tracking-widest font-sans";
    if (universe === 'aero') return "bg-white/40 border border-white/50 px-4 py-1 text-xs font-medium rounded-full text-gray-800 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]";
    if (universe === 'comic') return "bg-white border-2 border-black text-black px-3 py-1 text-xs font-bold rounded-[50%_50%_50%_0] shadow-[2px_2px_0_#000] -rotate-2";
    if (universe === 'lofi') return "bg-white/50 px-2 py-1 rounded-sm text-[#586e75] text-sm border border-gray-200";
    if (universe === 'cyberpunk') return "bg-[#fcee0a] text-black px-2 py-0.5 text-[10px] font-bold skew-x-[-10deg]";
    if (universe === 'punk') return "bg-black text-white px-2 py-1 text-xs font-black uppercase -rotate-2 border-2 border-white shadow-md";
    if (universe === 'bauhaus') return "bg-black text-white px-3 py-1 text-xs font-bold rounded-none -translate-y-4 shadow-md";
    if (universe === 'botanical') return "bg-[#a3b18a]/30 text-[#3a5a40] px-3 py-1 rounded-full text-xs font-serif italic";
    if (universe === 'noir') return "bg-white/10 border border-white/20 text-gray-300 px-3 py-1 rounded-full text-xs";
    if (universe !== 'neon') return "";
    return "bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm px-3 py-1 rounded-full text-xs font-bold";
};
