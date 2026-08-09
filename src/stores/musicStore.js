import { atom } from 'nanostores';

let stopPersistence;

export const isPlaying = atom(false);

export const initializeMusic = () => {
    if (typeof window === 'undefined' || stopPersistence) return;

    isPlaying.set(localStorage.getItem('music_isPlaying') === 'true');
    stopPersistence = isPlaying.subscribe(value => {
        localStorage.setItem('music_isPlaying', String(value));
    });
};

export const toggleMusic = () => {
    isPlaying.set(!isPlaying.get());
};

export const setPlaying = (status) => {
    isPlaying.set(status);
};
