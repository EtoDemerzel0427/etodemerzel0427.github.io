import React from 'react';
import { MapPin } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { universe } from '../stores/universeStore';
import { setShowStatusCard } from '../stores/uiStore'; // Import UI Store
import { USER_CONTENT } from '../config';
import Clock from './Clock';
import { getFontClass } from '../utils/theme';

const Header = () => {
    const $universe = useStore(universe);

    return (
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 px-2 relative">

            {/* Cyberpunk HUD */}
            {$universe === 'cyberpunk' && (
                <div className="absolute -top-10 right-0 border border-[#00f0ff]/50 bg-black/80 text-[#00f0ff] p-2 text-[10px] font-cyber flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                        <span>SYS.ONLINE</span>
                        <div className="w-2 h-2 bg-[#00f0ff] animate-pulse"></div>
                    </div>
                    <div className="opacity-50">LOC: CHI_Z0NE</div>
                    <div className="opacity-50">USR: WEIRAN</div>
                </div>
            )}

            <div className="">
                {/* 状态栏 */}
                {(() => {
                    const hasPolaroid = USER_CONTENT.status.meta && USER_CONTENT.status.meta.photoUrl;
                    return (
                        <div
                            onClick={() => hasPolaroid && setShowStatusCard(true)}
                            className={`inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium transition-all
            ${hasPolaroid ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
            ${$universe === 'noir' ? 'text-gray-300 border border-white/10 rounded-full bg-white/5' : ''}
            ${$universe === 'punk' ? 'bg-white text-black border-2 border-black rotate-1 shadow-[2px_2px_0px_#000]' : ''}
            ${$universe === 'retro' ? 'text-white bg-[#ff0055] border-2 border-white rounded-sm shadow-[2px_2px_0px_rgba(255,255,255,0.5)]' : ''}
            ${$universe === 'terminal' ? 'text-[#00ff41] border border-[#00ff41] bg-black shadow-[0_0_10px_rgba(0,255,65,0.3)]' : ''}
            ${$universe === 'newspaper' ? 'text-black border-y-2 border-black bg-transparent tracking-widest' : ''}
            ${$universe === 'aero' ? 'text-gray-700 bg-white/30 border border-white/50 backdrop-blur-md rounded-full shadow-lg' : ''}
            ${$universe === 'comic' ? 'text-black bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.2)]' : ''}
            ${$universe === 'lofi' ? 'bg-[#eee8d5] text-[#586e75] transform -rotate-2 rounded-sm shadow-sm' : ''}
            ${$universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black border-none cyber-clip skew-x-[-10deg]' : ''}
            ${$universe === 'bauhaus' ? 'bg-[#e63946] text-white rounded-full' : ''}
            ${$universe === 'botanical' ? 'bg-[#a3b18a] text-white rounded-xl' : ''}
            ${$universe === 'neon' ? 'text-gray-700 bg-white border border-gray-200 rounded-full shadow-sm' : ''}
          `}>
                            <span className="text-lg animate-pulse">{USER_CONTENT.status.emoji}</span>
                            <span>{USER_CONTENT.status.text}</span>
                        </div>
                    );
                })()}


                <>
                    <h1 className={`text-6xl md:text-8xl font-bold mb-4 transition-all ${getFontClass($universe, 'title')}
           ${$universe === 'comic' ? 'bg-black text-white px-6 py-2 transform -skew-x-12 block w-fit shadow-[8px_8px_0_rgba(0,0,0,0.2)]' : ''}
           ${$universe === 'cyberpunk' ? 'text-[#fcee0a] drop-shadow-[2px_2px_0_#00f0ff]' : ''}
           ${$universe === 'terminal' ? 'animate-pulse' : ''} 
           ${$universe === 'bauhaus' ? 'text-[#1d3557]' : ''}
        `}>
                        {$universe === 'terminal' && <span className="mr-4">_</span>}
                        {USER_CONTENT.name}
                    </h1>

                    <p className={`text-xl md:text-2xl max-w-2xl leading-relaxed transition-colors ${getFontClass($universe, 'body')}
           ${$universe === 'noir' ? 'text-gray-400' : ''}
           ${$universe === 'punk' ? 'text-black bg-white inline px-1 font-black uppercase' : ''}
           ${$universe === 'retro' ? 'text-white/70 text-sm leading-8' : ''}
           ${$universe === 'terminal' ? 'text-[#00ff41] opacity-80' : ''}
           ${$universe === 'newspaper' ? 'text-[#333] italic' : ''}
           ${$universe === 'aero' ? 'text-gray-800/80 drop-shadow-sm font-light' : ''}
           ${$universe === 'comic' ? 'text-black font-bold uppercase' : ''}
           ${$universe === 'lofi' ? 'text-[#586e75]' : ''}
           ${$universe === 'cyberpunk' ? 'text-[#00f0ff]' : ''}
           ${$universe === 'bauhaus' ? 'text-[#457b9d]' : ''}
           ${$universe === 'botanical' ? 'text-[#3a5a40]' : ''}
           ${$universe === 'neon' ? 'text-gray-500 font-medium' : ''}
        `}>
                        {USER_CONTENT.role}.<br />
                        <span className={
                            $universe === 'punk' ? 'bg-black text-white px-1 font-black uppercase' :
                                $universe === 'retro' ? 'text-[#55ffff]' :
                                    $universe === 'terminal' ? 'text-white bg-[#00ff41] text-black px-1' :
                                        $universe === 'newspaper' ? 'italic font-serif' :
                                            $universe === 'aero' ? 'text-blue-600 font-normal' :
                                                $universe === 'comic' ? 'bg-black text-white px-1' :
                                                    $universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] px-1' :
                                                        $universe === 'bauhaus' ? 'text-[#e63946] font-bold' :
                                                            $universe === 'botanical' ? 'italic text-[#3a5a40]' :
                                                                $universe === 'neon' ? 'text-[#3A86FF]' : 'text-blue-500'
                        }>{USER_CONTENT.bio}</span>
                    </p>
                </>
            </div >

            <div className="mt-8 md:mt-0 flex flex-col items-end gap-2">
                <span className={`text-sm transition-all flex items-center gap-2 whitespace-nowrap
         ${$universe === 'punk' ? 'font-code bg-black text-white px-2' : ''}
         ${$universe === 'retro' ? 'text-xs text-[#ff0055]' : 'font-mono opacity-50'}
         ${$universe === 'terminal' ? 'text-[#00ff41]' : ''}
         ${$universe === 'newspaper' ? 'italic text-black border-b border-black opacity-100' : ''}
         ${$universe === 'aero' ? 'text-gray-600 bg-white/40 px-3 py-1 rounded-full' : ''}
         ${$universe === 'cyberpunk' ? 'text-[#fcee0a] bg-black border border-[#fcee0a] px-2' : ''}
         ${$universe === 'bauhaus' ? 'text-white bg-[#1d3557] rounded-full px-3' : ''}
         ${$universe === 'botanical' ? 'text-[#3a5a40] font-serif italic' : ''}
       `}>
                    <MapPin size={12} /> {USER_CONTENT.location} • <Clock />
                </span>
            </div>
        </header >
    );
};
export default Header;
