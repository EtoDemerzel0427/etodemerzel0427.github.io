import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { isPlaying, toggleMusic, setPlaying } from '../stores/musicStore';
import { universe as universeStore } from '../stores/universeStore';
import { USER_CONTENT } from '../config';
import { Pause, Play, GripHorizontal, X } from 'lucide-react';
import { getFontClass } from '../utils/theme';

const MusicPlayer = () => {
    const $isPlaying = useStore(isPlaying);
    const $universe = useStore(universeStore);
    const audioRef = useRef(null);

    // UI State
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 }); // Bottom-left relative default
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);

    // 1. Initial Position (Bottom Right)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPosition({
                x: window.innerWidth - 320,
                y: window.innerHeight - 100
            });
        }
    }, []);

    // 2. Visibility Logic (Route + State)
    useEffect(() => {
        const checkVisibility = () => {
            if (typeof window === 'undefined') return;
            const path = window.location.pathname;
            const isHomepage = path === '/' || path === '/index.html';

            if (isHomepage) {
                // RULE 1: Always hide on homepage
                setIsVisible(false);
            } else if ($isPlaying) {
                // RULE 2: Always show if music starts playing (and not on homepage)
                setIsVisible(true);
            }
            // RULE 3: If paused (!isPlaying) and NOT homepage, 
            // we do NOTHING. This keeps the widget visible if it was already there.
        };

        checkVisibility();
        window.addEventListener('popstate', checkVisibility);
        document.addEventListener('astro:page-load', checkVisibility);

        return () => {
            window.removeEventListener('popstate', checkVisibility);
            document.removeEventListener('astro:page-load', checkVisibility);
        };
    }, [$isPlaying]);

    // Explicit Close Handler (Stops music AND hides widget)
    const handleClose = (e) => {
        e.stopPropagation(); // Prevent drag or other clicks
        setPlaying(false);
        setIsVisible(false);
    };

    // 3. Audio Control Logic
    useEffect(() => {
        if (audioRef.current) {
            if ($isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Auto-play policies might block this without interaction
                    });
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [$isPlaying]);

    // 4. Drag Logic (Mouse + Touch)
    const handleStart = (clientX, clientY) => {
        setIsDragging(true);
        dragStartRef.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
    };

    const handleMouseDown = (e) => handleStart(e.clientX, e.clientY);
    const handleTouchStart = (e) => handleStart(e.touches[0].clientX, e.touches[0].clientY);

    const handleMove = useCallback((clientX, clientY) => {
        if (isDragging) {
            const newX = clientX - dragStartRef.current.x;
            const newY = clientY - dragStartRef.current.y;
            setPosition({ x: newX, y: newY });
        }
    }, [isDragging, position]);

    const handleMouseMove = useCallback((e) => handleMove(e.clientX, e.clientY), [handleMove]);
    const handleTouchMove = useCallback((e) => {
        if (e.cancelable) e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, [handleMove]);

    const handleEnd = useCallback(() => setIsDragging(false), []);
    const handleMouseUp = handleEnd;
    const handleTouchEnd = handleEnd;

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });

            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchend', handleTouchEnd);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);

            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);

            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, handleMouseMove, handleTouchMove, handleMouseUp, handleTouchEnd]);


    return (
        <>
            <audio
                ref={audioRef}
                src={USER_CONTENT.nowPlaying.audioUrl}
                loop
                className="hidden"
            />

            {isVisible && (
                <div
                    ref={modalRef}
                    className={`fixed z-[9999] shadow-2xl backdrop-blur-md transition-shadow select-none
                        ${$universe === 'retro' ? 'bg-[#ff0055] text-white border-2 border-white rounded-sm font-pixel' :
                            $universe === 'terminal' ? 'bg-black text-[#00ff41] border border-[#00ff41] font-mono' :
                                $universe === 'punk' ? 'bg-white text-black border-2 border-black font-code' :
                                    $universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] border border-[#00f0ff] cyber-clip font-cyber' :
                                        $universe === 'bauhaus' ? 'bg-[#e63946] text-white border-2 border-black font-geo' :
                                            $universe === 'comic' ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000]' :
                                                'bg-white/80 border border-white/20 text-gray-800 rounded-xl'}
                    `}
                    style={{
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        cursor: isDragging ? 'grabbing' : 'auto',
                        width: '280px'
                    }}
                >
                    {/* Drag Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                        className={`h-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity
                           ${$universe === 'cyberpunk' ? 'bg-[#00f0ff]/20' : ''} 
                        `}
                    >
                        <GripHorizontal size={16} />
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4 pt-1 flex items-center gap-3">
                        <div
                            onClick={toggleMusic}
                            className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer hover:scale-105 transition-transform
                                ${$universe === 'retro' ? 'bg-white text-[#ff0055]' :
                                    $universe === 'terminal' ? 'bg-[#00ff41] text-black' :
                                        $universe === 'punk' ? 'bg-black text-white' :
                                            'bg-black/5 hover:bg-black/10'}
                            `}
                        >
                            {$isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold truncate leading-tight ${getFontClass($universe, 'title')}`}>
                                {USER_CONTENT.nowPlaying.song}
                            </h4>
                            <p className="text-xs opacity-70 truncate">
                                {USER_CONTENT.nowPlaying.artist}
                            </p>
                        </div>

                        {/* Close / Stop Button */}
                        <div onClick={handleClose} className="cursor-pointer opacity-50 hover:opacity-100" title="Stop & Hide">
                            <X size={16} />
                        </div>
                    </div>

                    {/* Progress Bar (Visual Only for now) */}
                    <div className="h-1 w-full bg-black/5 overflow-hidden">
                        <div className={`h-full w-full animate-[music-bar_2s_ease-in-out_infinite] origin-left
                            ${$universe === 'retro' ? 'bg-white' :
                                $universe === 'terminal' ? 'bg-[#00ff41]' :
                                    'bg-current opacity-30'}
                        `}></div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MusicPlayer;
