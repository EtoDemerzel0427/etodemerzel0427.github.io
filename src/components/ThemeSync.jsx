import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { universe } from '../stores/universeStore';
import { getContainerStyle } from '../utils/theme';

const ThemeSync = () => {
    const $universe = useStore(universe);

    useEffect(() => {
        // Apply the container styles to the body element
        // This ensures text colors, fonts, and selection styles apply globally
        const containerClasses = getContainerStyle($universe).split(' ');

        // Remove previous theme classes (this is naive, assuming only theme classes are on body might be dangerous,
        // but for this app the body is clean. A safer way is to manage a specific class list or attribute).
        // Since getContainerStyle returns a string of Tailwind classes, we can set className directly 
        // IF we preserve existing body classes (Layout.astro puts classes on <body>? No, just the <div> inside).

        // Actually, Layout.astro has:
        // <body class="bg-gray-50 text-gray-900 transition-colors duration-200">
        // We should Overwrite or Append?
        // getContainerStyle returns things like "bg-[#050505] text-gray-300 ..."
        // These should override the defaults. 

        document.body.className = `transition-all duration-700 ${getContainerStyle($universe)}`;

    }, [$universe]);

    return null; // This component renders nothing
};

export default ThemeSync;
