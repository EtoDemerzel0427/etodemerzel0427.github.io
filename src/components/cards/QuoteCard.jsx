import React from 'react';
import { Quote } from 'lucide-react';
import { getCardStyle, getFontClass } from '../../utils/theme';

const QuoteCard = ({ universe, className }) => {
    return (
        <div className={`${getCardStyle(universe, 'blue', className)} !justify-center text-center relative overflow-hidden`}>
            <Quote className={`absolute -top-4 -left-4 rotate-180 
        ${universe === 'punk' ? 'text-white/30' : 'text-current opacity-20'}`} size={100}
            />

            {universe === 'neon' && (
                <div className="absolute bottom-[-20%] left-[-20%] w-32 h-32 bg-blue-400/20 rounded-full blur-xl"></div>
            )}

            {universe === 'bauhaus' && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#e63946] rounded-bl-full z-0"></div>
            )}
            <div className="relative z-10">
                <p className={`font-bold italic text-xl leading-tight drop-shadow-sm ${getFontClass(universe, 'title')} ${['terminal'].includes(universe) ? 'not-italic font-mono' : ''}`}>
                    "Simplicity is the ultimate sophistication."
                </p>
            </div>
        </div>
    );
};

export default QuoteCard;
