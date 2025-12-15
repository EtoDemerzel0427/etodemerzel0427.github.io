import { atom } from 'nanostores';

export const isPlaying = atom(false);

export const toggleMusic = () => {
    isPlaying.set(!isPlaying.get());
};

export const setPlaying = (status) => {
    isPlaying.set(status);
};
