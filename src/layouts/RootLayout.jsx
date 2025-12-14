import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation } from 'react-router-dom';
import { Grid3X3, X } from 'lucide-react';

import { USER_CONTENT } from '../config';
import { UNIVERSE_OPTIONS } from '../utils/constants';
import { getContainerStyle, getFontClass } from '../utils/theme';
import { AeroBackground, BauhausBackground, BotanicalBackground } from '../components/Backgrounds';
import StatusCard from '../components/StatusCard';
import Header from '../components/Header'; // Added from instruction
import SEO from '../components/SEO'; // Added from instruction
import Footer from '../components/Footer';

/* --- Helper Components for Layout --- */
const UniverseCard = ({ id, label, icon: Icon, color, desc, active, onSelect }) => (
    <button
        onClick={() => onSelect(id)}
        className={`relative group p-4 rounded-2xl border transition-all duration-300 text-left h-full flex flex-col justify-between overflow-hidden
      ${active ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
    `}
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${color}`}></div>
        <div className="relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 text-white bg-gradient-to-br ${color} shadow-sm`}>
                <Icon size={20} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
    </button>
);

const RootLayout = () => {
    const [universe, setUniverse] = useState(USER_CONTENT.defaultTheme || 'neon');
    const [showPortal, setShowPortal] = useState(false);
    const [showStatusCard, setShowStatusCard] = useState(false);

    // --- LANGUAGE STATE ---
    const [lang, setLang] = useState('zh'); // 'zh' | 'en'
    const toggleLang = useCallback(() => {
        setLang(prev => prev === 'zh' ? 'en' : 'zh');
    }, []);


    const handleUniverseSelect = useCallback((id) => {
        setUniverse(id);
        setShowPortal(false);
    }, []);

    /* --- Audio State --- */
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const toggleMusic = useCallback((e) => {
        if (e) e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(console.error);
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const handleShowStatus = useCallback((show) => {
        setShowStatusCard(show);
    }, []);

    return (
        <div className={`min-h-screen p-4 md:p-8 transition-all duration-700 ${getContainerStyle(universe)} relative z-0 overflow-hidden`}>
            {/* Hidden Audio Player */}
            <audio ref={audioRef} src={USER_CONTENT.nowPlaying.audioUrl} loop />

            {/* Font Injection */}
            <style>
                {`
          .font-academic { font-family: 'Playfair Display', serif; }
          .font-code { font-family: 'JetBrains Mono', monospace; }
          .font-pixel { font-family: 'Press Start 2P', 'Cubic', cursive; }
          .font-serif { font-family: 'Lora', serif; }
          .font-comic { font-family: 'Bangers', cursive; letter-spacing: 0.05em; }
          .font-hand { font-family: 'Patrick Hand', cursive; }
          .font-cyber { font-family: 'Orbitron', sans-serif; }
          .font-geo { font-family: 'DM Sans', sans-serif; }
          
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

          .text-shadow-glow { text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
          
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(50px, -80px) scale(1.2); }
            66% { transform: translate(-40px, 40px) scale(0.8); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 5s infinite ease-in-out alternate; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          .animation-delay-6000 { animation-delay: 6s; }

          .scanlines {
            background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
            background-size: 100% 4px;
          }

          .halftone {
            background-image: radial-gradient(circle, #000 1px, transparent 1px);
            background-size: 8px 8px;
          }
          
          .manga-speedlines {
            background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px);
          }

          .cyber-clip {
            clip-path: polygon(
              0 0, 
              100% 0, 
              100% 90%, 
              95% 100%, 
              0 100%
            );
          }
          
          .cyber-glitch {
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 0, 0.05) 3px);
          }
          
          .caution-tape {
            background: repeating-linear-gradient(
              45deg,
              #fcee0a,
              #fcee0a 10px,
              #000 10px,
              #000 20px
            );
          }

          .comic-halftone {
            position: relative;
            z-index: 1;
          }
          .comic-halftone::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: radial-gradient(#000 1px, transparent 1px);
            background-size: 6px 6px;
            opacity: 0.02;
            pointer-events: none;
            z-index: -1;
          }

          /* Noir Film Grain - Enhanced opacity */
          .film-grain {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E");
          }

          /* Terminal Scanlines Overlay */
          .terminal-scanlines {
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 2px, 3px 100%;
          }

          /* Neon Ceramic Glow */
          .neon-glow-card {
            box-shadow: 
              0 10px 40px -10px rgba(0,0,0,0.1),
              inset 0 2px 0 rgba(255,255,255,0.5),
              inset 0 -2px 0 rgba(0,0,0,0.05);
          }
          .neon-glow-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%);
            pointer-events: none;
          }
          
           @keyframes music-bar {
            0%, 100% { height: 40%; }
            50% { height: 100%; }
          }
        `}
            </style>

            {/* --- UNIVERSE BACKGROUNDS --- */}
            {universe === 'aero' && <AeroBackground />}
            {universe === 'bauhaus' && <BauhausBackground />}
            {universe === 'botanical' && <BotanicalBackground />}

            {universe === 'retro' && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
                </div>
            )}
            {universe === 'terminal' && (
                <div className="fixed inset-0 pointer-events-none z-50 opacity-20 terminal-scanlines pointer-events-none"></div>
            )}
            {universe === 'newspaper' && (
                <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-multiply"
                    style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}>
                </div>
            )}
            {universe === 'comic' && (
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] halftone z-0"></div>
            )}
            {universe === 'lofi' && (
                <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply film-grain"></div>
            )}
            {universe === 'cyberpunk' && (
                <div className="fixed inset-0 pointer-events-none z-0 cyber-glitch opacity-20"></div>
            )}

            {/* Noir Spotlight & Grain */}
            {universe === 'noir' && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 film-grain opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_10%,rgba(0,0,0,0.6)_90%)]"></div>
                </div>
            )}


            {/* --- MULTIVERSE PORTAL (Theme Switcher) --- */}
            {createPortal(
                <>
                    <div className="fixed top-6 right-6 z-[70]">
                        <button
                            onClick={() => setShowPortal(true)}
                            className={`px-5 py-2.5 rounded-full font-bold shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2
            ${universe === 'retro' ? 'bg-[#ff0055] text-white border-2 border-white rounded-sm font-pixel text-[10px]' :
                                    universe === 'terminal' ? 'bg-[#00ff41] text-black rounded-none border border-[#00ff41] font-mono' :
                                        universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black rounded-none border border-[#00f0ff] cyber-clip font-cyber tracking-widest' :
                                            universe === 'bauhaus' ? 'bg-[#e63946] text-white rounded-none border-2 border-black font-geo' :
                                                universe === 'botanical' ? 'bg-[#3a5a40] text-[#dad7cd] font-serif italic' :
                                                    universe === 'comic' ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000] font-comic tracking-wider' :
                                                        universe === 'punk' ? 'bg-[#F7E018] text-black border-2 border-black font-code uppercase' :
                                                            universe === 'newspaper' ? 'bg-white text-black border-y-2 border-black font-serif italic tracking-wider rounded-none' :
                                                                universe === 'lofi' ? 'bg-[#fdf6e3] text-[#586e75] border border-[#eee8d5] font-hand text-lg rounded-sm' :
                                                                    universe === 'aero' ? 'bg-white/60 text-blue-900 border border-white/50 backdrop-blur-md shadow-lg font-sans' :
                                                                        universe === 'noir' ? 'bg-[#222] text-gray-300 border border-white/10 font-sans tracking-widest' :
                                                                            universe === 'neon' ? 'bg-white text-black border border-white/50 font-sans' :
                                                                                'bg-white text-black'}
          `}
                        >
                            <Grid3X3 size={18} />
                            <span className="hidden md:inline md:text-xs tracking-widest uppercase">Switch Universe</span>
                        </button>
                    </div>

                    {/* PORTAL MODAL */}
                    {showPortal && (
                        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${getFontClass(universe, 'body')}`}>
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowPortal(false)}></div>
                            <div className="relative bg-white rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
                                {/* Portal Content */}
                                <div className="flex items-center justify-between p-6 border-b bg-white top-0 z-10 sticky">
                                    <h2 className={`text-xl font-bold ${getFontClass(universe, 'title')}`}>CHOOSE YOUR UNIVERSE</h2>
                                    <button onClick={() => setShowPortal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                        <X size={24} className="text-gray-500" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {UNIVERSE_OPTIONS.map((option) => (
                                            <UniverseCard
                                                key={option.id}
                                                {...option}
                                                active={universe === option.id}
                                                onSelect={handleUniverseSelect}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>,
                document.body
            )}

            {/* POLAROID MOMENT MODAL */}
            {showStatusCard && <StatusCard onClose={() => setShowStatusCard(false)} />}


            <SEO />

            {/* MAIN CONTENT OUTLET */}
            <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
                <Outlet context={{ universe, handleShowStatus, isPlaying, toggleMusic, lang, toggleLang }} />
                <Footer universe={universe} />
            </div>

        </div>
    );
};

export default RootLayout;
