import React, { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { isPlaying } from '../stores/musicStore';
import { USER_CONTENT } from '../config';

const MusicPlayer = () => {
    const $isPlaying = useStore(isPlaying);
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current) {
            if ($isPlaying) {
                audioRef.current.play().catch(error => {
                    console.error("Audio play failed:", error);
                    // If autoplay fails (e.g. no user interaction), we might want to sync store to false
                    // setIsPlaying(false); // Optional: prevent UI form showing playing state if blocked
                });
            } else {
                audioRef.current.pause();
            }
        }
    }, [$isPlaying]);

    return (
        <audio
            ref={audioRef}
            src={USER_CONTENT.nowPlaying.audioUrl}
            loop
            className="hidden"
        />
    );
};

export default MusicPlayer;
