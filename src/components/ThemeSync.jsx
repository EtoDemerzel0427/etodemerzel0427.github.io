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
        // The universe lives on <html> rather than <body>: the boot script in
        // Layout.astro puts it there before the first paint, and this keeps it in
        // sync afterwards (theme switches, client-side navigation).
        const root = document.documentElement;
        root.className = `transition-all duration-700 ${getContainerStyle($universe)}`;
        root.dataset.universe = $universe;

        // The boot script in Layout.astro owns data-themePending: it reveals the markup
        // once every island has hydrated, which is later than this effect runs.
    }, [$universe]);

    return null; // This component renders nothing
};

export default ThemeSync;
