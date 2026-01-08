import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { universe as universeStore } from '../../stores/universeStore';
import { libraryData } from '../../data/library';
import MediaItemCard from './MediaItemCard';
import { Book, Film, Music, Gamepad2, LayoutGrid } from 'lucide-react';
import { getFontClass } from '../../utils/theme';
import { createPortal } from 'react-dom';
import MediaDetailModal from './MediaDetailModal';
import BackNavigation from '../BackNavigation';

const MediaGallery = ({ initialLibraryData }) => {
    const universe = useStore(universeStore);
    const dataSource = initialLibraryData || libraryData;

    // Initialize state from URL param or default to 'book'
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            return ['book', 'movie', 'music', 'game'].includes(tab) ? tab : 'book';
        }
        return 'book';
    });

    const [selectedItem, setSelectedItem] = useState(null);

    // Sync URL when tab changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.set('tab', activeTab);
            window.history.pushState({}, '', url);
        }
    }, [activeTab]);

    const filteredData = useMemo(() => {
        return dataSource.filter(item => item.type === activeTab);
    }, [activeTab, dataSource]);

    const tabs = [
        { id: 'book', label: 'Books', icon: Book },
        { id: 'movie', label: 'Movies', icon: Film },
        { id: 'music', label: 'Music', icon: Music },
        { id: 'game', label: 'Games', icon: Gamepad2 },
    ];



    // Theme-specific styles for tabs
    const getTabStyle = (isActive) => {
        const base = "flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 font-bold text-sm uppercase tracking-wider cursor-pointer select-none";

        if (universe === 'punk') {
            return isActive
                ? `${base} bg-[#F7E018] text-black border-2 border-black shadow-[4px_4px_0_#000] -translate-y-1`
                : `${base} bg-white text-black border-2 border-transparent hover:border-black`;
        }
        if (universe === 'retro') {
            return isActive
                ? `${base} bg-[#ff0055] text-white rounded-none border-2 border-white shadow-[0_0_10px_#ff0055] !text-[10px]`
                : `${base} text-gray-400 hover:text-white hover:bg-white/10 rounded-none !text-[10px]`;
        }
        if (universe === 'bauhaus') {
            return isActive
                ? `${base} bg-[#1d3557] text-white rounded-none`
                : `${base} bg-[#f4f1ea] text-[#1d3557] hover:bg-[#e63946] hover:text-white rounded-none`;
        }
        if (universe === 'noir') {
            return isActive
                ? `${base} bg-white text-black border border-white`
                : `${base} text-gray-500 hover:text-white border border-transparent`;
        }
        if (universe === 'cyberpunk') {
            return isActive
                ? `${base} bg-[#fcee0a] text-black border border-[#00f0ff] rounded-none clip-path-polygon-[0_0,100%_0,95%_100%,5%_100%] font-cyber tracking-widest`
                : `${base} bg-black text-[#fcee0a] border border-[#fcee0a] hover:bg-[#fcee0a] hover:text-black hover:border-[#00f0ff] rounded-none clip-path-polygon-[0_0,100%_0,95%_100%,5%_100%] font-cyber tracking-widest`;
        }
        if (universe === 'comic') {
            return isActive
                ? `${base} bg-white text-black border-2 border-black shadow-[4px_4px_0_#000]`
                : `${base} text-gray-500 border-2 border-transparent hover:border-black`;
        }
        if (universe === 'newspaper') {
            return isActive
                ? `${base} bg-white text-black rounded-none border-y-2 border-black border-x-0 font-serif tracking-widest font-bold`
                : `${base} bg-white text-gray-400 border-y-2 border-gray-200 border-x-0 hover:text-black hover:border-black rounded-none font-serif tracking-widest`;
        }
        if (universe === 'terminal') {
            return isActive
                ? `${base} bg-[#003300] text-[#00ff41] border-4 border-double border-[#00ff41] shadow-[0_0_10px_#00ff41] !rounded-none`
                : `${base} text-[#003300] hover:text-[#00ff41] border-4 border-double border-transparent hover:border-[#00ff41]/50 hover:cursor-none hover:shadow-[0_0_5px_#00ff41] !rounded-none`;
        }
        if (universe === 'lofi') {
            return isActive
                ? `${base} bg-[#b58900] text-[#fdf6e3] rounded-sm transform rotate-1`
                : `${base} bg-[#fdf6e3] text-[#586e75] hover:bg-[#eee8d5] rounded-sm`;
        }
        if (universe === 'botanical') {
            return isActive
                ? `${base} bg-[#3a5a40] text-white border border-[#3a5a40]`
                : `${base} bg-[#dad7cd]/50 text-[#3a5a40] hover:bg-[#dad7cd]`;
        }

        // Default
        return isActive
            ? `${base} bg-black text-white shadow-lg scale-105`
            : `${base} bg-gray-100 text-gray-500 hover:bg-gray-200`;
    };

    return (
        // REMOVED bg classes from here. Layout/BackgroundManager handles the background.
        <div className="w-full min-h-screen">

            {/* Navigation using standardized component */}
            <BackNavigation universe={universe} label="Back to Home" href="/" />


            {/* Added container padding to match Layout/Header */}
            <div className={`max-w-7xl mx-auto px-2 py-4 md:py-8 mt-6`}> {/* Reduced spacing */}

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl 
                            ${universe === 'punk' ? 'bg-black text-[#F7E018]' : 'bg-white shadow-md text-black'}
                            ${universe === 'retro' ? '!bg-[#ff0055] !text-white !rounded-none shadow-[4px_4px_0_white]' : ''}
                            ${universe === 'cyberpunk' ? '!bg-[#fcee0a] !text-black clip-path-polygon-[0_0,100%_0,95%_100%,5%_100%]' : ''}
                            ${universe === 'comic' ? 'border-2 border-black shadow-[4px_4px_0_black]' : ''}
                            ${universe === 'terminal' ? '!bg-black !text-[#00ff41] border-4 border-double border-[#00ff41]/50 !rounded-none hover:border-[#00ff41] hover:shadow-[0_0_20px_rgba(0,255,65,0.2)]' : ''}
                            ${universe === 'newspaper' ? '!bg-black !text-white !rounded-none' : ''}
                            ${universe === 'lofi' ? '!bg-[#fdf6e3] !text-[#b58900] shadow-sm' : ''}
                            ${universe === 'botanical' ? '!bg-[#3a5a40] !text-white shadow-lg' : ''}
                        `}>
                            <LayoutGrid size={32} />
                        </div>
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-black mb-2
                                ${getFontClass(universe, 'title')}
                                ${universe === 'retro' ? 'text-white drop-shadow-[4px_4px_0_#ff0055]' : ''}
                                ${universe === 'noir' ? 'text-white' : ''}
                                ${universe === 'bauhaus' ? 'text-[#1d3557]' : ''}
                                ${universe === 'cyberpunk' ? 'text-[#fcee0a] drop-shadow-[2px_2px_0_#00f0ff]' : ''}
                                ${universe === 'comic' ? 'text-black drop-shadow-[2px_2px_0_white] [-webkit-text-stroke:1px_black]' : ''}
                                ${universe === 'terminal' ? 'text-[#00ff41] text-shadow-[0_0_10px_#00ff41]' : ''}
                                ${universe === 'newspaper' ? 'text-black font-serif tracking-tighter' : ''}
                                ${universe === 'botanical' ? 'text-[#3a5a40] italic' : ''}
                                ${universe === 'lofi' ? 'text-[#586e75]' : ''} 
                            `}>
                                Gallery
                            </h1>
                            <p className={`text-sm max-w-md
                                ${universe === 'retro' ? 'text-gray-400 font-pixel text-xs' : 'text-gray-500'}
                                ${universe === 'punk' ? 'bg-black !text-white px-2 py-1 font-code font-bold uppercase italic -skew-x-12 inline-block' : ''}
                                ${universe === 'noir' ? 'text-gray-400' : ''}
                                ${universe === 'terminal' ? 'text-[#00ff41]/80' : ''}
                                ${universe === 'newspaper' ? 'italic text-black border-l-2 border-black pl-2' : ''}
                                ${universe === 'aero' ? 'text-blue-900/80 font-medium' : ''}
                            `}>
                                A refined collection of thoughts and inspirations.
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={`flex p-2 gap-2 overflow-x-auto max-w-full
                         ${universe === 'terminal' ? 'bg-black border-4 border-double border-[#00ff41]/50 rounded-none' : ''}
                         ${universe === 'retro' ? 'flex flex-wrap gap-2 bg-black border-2 border-white/20 p-2 rounded-lg' : ''}
                         ${['punk', 'noir', 'bauhaus', 'comic', 'newspaper', 'lofi', 'botanical', 'aero', 'default', 'neon', 'cyberpunk'].includes(universe) ? 'bg-white/5 rounded-full' : ''}
                    `}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={getTabStyle(activeTab === tab.id)}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredData.map(item => (
                        <MediaItemCard
                            key={item.id}
                            item={item}
                            universe={universe}
                            onClick={setSelectedItem}
                        />
                    ))}

                    {/* Empty State */}
                    {filteredData.length === 0 && (
                        <div className="col-span-full py-20 text-center opacity-40">
                            <Library size={48} className="mx-auto mb-4" />
                            <p className={`text-xl font-bold ${universe === 'cyberpunk' ? 'text-[#fcee0a]' : ''}`}>
                                No items found in this section yet.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal Portal */}
            {selectedItem && createPortal(
                <MediaDetailModal
                    item={selectedItem}
                    universe={universe}
                    onClose={() => setSelectedItem(null)}
                />,
                document.body
            )}
        </div>
    );
};

export default MediaGallery;
