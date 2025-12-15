import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Grid3X3, X } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { universe, setUniverse } from '../stores/universeStore';
import { showStatusCard, setShowStatusCard } from '../stores/uiStore';
import { UNIVERSE_OPTIONS } from '../utils/constants';
import { getFontClass } from '../utils/theme';
import StatusCard from './StatusCard';

/* --- Helper Components --- */
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

const GlobalUI = () => {
    const $universe = useStore(universe);
    const $showStatusCard = useStore(showStatusCard);
    const [showPortal, setShowPortal] = useState(false);

    const handleUniverseSelect = (id) => {
        setUniverse(id);
        setShowPortal(false);
    };

    return (
        <>
            {/* --- MULTIVERSE PORTAL TRIGGER (Bottom Right or Top Right?) --- */}
            <div className="fixed top-6 right-6 z-[40]">
                {/* ... button content kept same ... */}
                <button
                    onClick={() => setShowPortal(true)}
                    className={`px-5 py-2.5 rounded-full font-bold shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2
            ${$universe === 'retro' ? 'bg-[#ff0055] text-white border-2 border-white rounded-sm font-pixel text-[10px]' :
                            $universe === 'terminal' ? 'bg-[#00ff41] text-black rounded-none border border-[#00ff41] font-mono' :
                                $universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black rounded-none border border-[#00f0ff] cyber-clip font-cyber tracking-widest' :
                                    $universe === 'bauhaus' ? 'bg-[#e63946] text-white rounded-none border-2 border-black font-geo' :
                                        $universe === 'botanical' ? 'bg-[#3a5a40] text-[#dad7cd] font-serif italic' :
                                            $universe === 'comic' ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000] font-comic tracking-wider' :
                                                $universe === 'punk' ? 'bg-[#F7E018] text-black border-2 border-black font-code uppercase' :
                                                    $universe === 'newspaper' ? 'bg-white text-black border-y-2 border-black font-serif italic tracking-wider rounded-none' :
                                                        $universe === 'lofi' ? 'bg-[#fdf6e3] text-[#586e75] border border-[#eee8d5] font-hand text-lg rounded-sm' :
                                                            $universe === 'aero' ? 'bg-white/60 text-blue-900 border border-white/50 backdrop-blur-md shadow-lg font-sans' :
                                                                $universe === 'noir' ? 'bg-[#222] text-gray-300 border border-white/10 font-sans tracking-widest' :
                                                                    $universe === 'neon' ? 'bg-white text-black border border-white/50 font-sans' :
                                                                        'bg-white text-black'}
          `}
                >
                    <Grid3X3 size={18} />
                    <span className="hidden md:inline md:text-xs tracking-widest uppercase">Switch Universe</span>
                </button>
            </div>

            {/* PORTAL MODAL */}
            {showPortal && createPortal(
                <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${getFontClass($universe, 'body')}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowPortal(false)}></div>
                    <div className="relative bg-white rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
                        {/* Portal Content */}
                        <div className="flex items-center justify-between p-6 border-b bg-white top-0 z-10 sticky">
                            <h2 className={`text-xl font-bold ${getFontClass($universe, 'title')}`}>CHOOSE YOUR UNIVERSE</h2>
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
                                        active={$universe === option.id}
                                        onSelect={handleUniverseSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* STATUS CARD MODAL */}
            {$showStatusCard && createPortal(
                <StatusCard onClose={() => setShowStatusCard(false)} />,
                document.body
            )}
        </>
    );
};

export default GlobalUI;
