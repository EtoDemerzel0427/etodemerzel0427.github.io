import { atom } from 'nanostores';

const getInitialState = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('music_isPlaying') === 'true';
    }
    return false;
};

export const isPlaying = atom(getInitialState());

// Subscription to save changes
if (typeof window !== 'undefined') {
    isPlaying.subscribe(params => {
        localStorage.setItem('music_isPlaying', String(params));
    });
}

export const toggleMusic = () => {
    isPlaying.set(!isPlaying.get());
};

export const setPlaying = (status) => {
    isPlaying.set(status);
};
