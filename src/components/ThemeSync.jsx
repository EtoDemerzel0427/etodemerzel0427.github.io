import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { initializeUniverse, universe } from '../stores/universeStore';
import { getContainerStyle } from '../utils/theme';

const ThemeSync = () => {
    const $universe = useStore(universe);

    useEffect(() => {
        initializeUniverse();
    }, []);

    useEffect(() => {
        // Apply the container styles to the body element
        // This ensures text colors, fonts, and selection styles apply globally
        document.body.className = `transition-all duration-700 ${getContainerStyle($universe)}`;
        document.documentElement.dataset.universe = $universe;

    }, [$universe]);

    return null; // This component renders nothing
};

export default ThemeSync;
