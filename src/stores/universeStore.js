import { atom } from 'nanostores';
import { USER_CONTENT } from '../config';

// Initialize from localStorage if available (client-side), otherwise default
const savedUniverse = typeof window !== 'undefined' ? localStorage.getItem('universe') : null;
const initialUniverse = savedUniverse || USER_CONTENT.defaultTheme || 'neon';

export const universe = atom(initialUniverse);

// Subscribe to changes and save to localStorage
if (typeof window !== 'undefined') {
    universe.subscribe(value => {
        localStorage.setItem('universe', value);
    });
}

export const setUniverse = (newUniverse) => {
    universe.set(newUniverse);
};
