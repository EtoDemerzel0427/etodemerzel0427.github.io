import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { getFontClass } from '../utils/theme';

const BackNavigation = ({ universe, href = "/", label = "Back to Home" }) => {
    // Standardized Navigation Bar Style
    // Source of Truth: Derived from BlogList.jsx logic which was verified as "better"
    const getHeaderClass = () => {
        const base = "absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 transition-all duration-500 pointer-events-none";

        switch (universe) {
            case 'terminal': return `${base} text-[#33ff00]`;
            case 'neon': return `${base} text-gray-900`;
            case 'newspaper': return `${base} text-black`;
            case 'cyberpunk': return `${base} text-[#fcee0a] drop-shadow-[2px_2px_0_#000]`;
            case 'retro': return `${base} text-white mix-blend-difference`;
            case 'noir': return `${base} text-gray-300 mix-blend-difference`;
            case 'bauhaus': return `${base} text-black`;
            case 'comic': return `${base} text-black`;
            case 'punk': return `${base} mix-blend-difference text-white`;
            case 'lofi': return `${base} text-[#5f5a4e]`;
            case 'botanical': return `${base} text-[#3a5a40]`;
            case 'aero': return `${base} text-white drop-shadow-md`;
            default: return `${base} text-gray-800`;
        }
    };

    return createPortal(
        <nav className={getHeaderClass()}>
            <a href={href} className={`flex items-center gap-2 font-bold pointer-events-auto transition-opacity hover:opacity-100 opacity-60
                ${getFontClass(universe)}
            `}>
                <ArrowLeft size={20} />
                <span>{label}</span>
            </a>
        </nav>,
        document.body
    );
};

export default BackNavigation;
