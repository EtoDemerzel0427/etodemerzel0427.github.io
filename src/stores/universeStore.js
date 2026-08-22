import { atom } from 'nanostores';
import { USER_CONTENT } from '../config';

export const DEFAULT_UNIVERSE = USER_CONTENT.defaultTheme || 'neon';
const initialUniverse = DEFAULT_UNIVERSE;
export const UNIVERSE_IDS = [
    'neon', 'noir', 'aero', 'punk', 'retro', 'terminal',
    'bauhaus', 'newspaper', 'comic', 'lofi', 'botanical', 'cyberpunk'
];
const validUniverses = new Set(UNIVERSE_IDS);
let stopPersistence;

export const universe = atom(initialUniverse);

export const initializeUniverse = () => {
    if (typeof window === 'undefined' || stopPersistence) return;

    const savedUniverse = localStorage.getItem('universe');
    if (savedUniverse && validUniverses.has(savedUniverse)) {
        universe.set(savedUniverse);
    }

    stopPersistence = universe.subscribe(value => {
        localStorage.setItem('universe', value);
    });
};

export const setUniverse = (newUniverse) => {
    universe.set(newUniverse);
};
