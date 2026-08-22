import React from 'react';
import { createPortal } from 'react-dom';
import { useUniverse } from '../hooks/useUniverse';
import { AeroBackground, BauhausBackground, BotanicalBackground } from './Backgrounds';

const BackgroundManager = () => {
    const $universe = useUniverse();

    // The page background, text colour and font live on <html>, applied by the boot
    // script before the first paint — this layer only carries the decorations.
    return (
        <div className="fixed inset-0 pointer-events-none transition-all duration-700 z-[-1]">
            {/* Backgrounds with real DOM of their own stay conditional. They sit behind
                the content, so arriving one frame after hydration is not noticeable. */}
            {$universe === 'aero' && <AeroBackground />}
            {$universe === 'bauhaus' && <BauhausBackground />}
            {$universe === 'botanical' && <BotanicalBackground />}

            {/* Overlays are universe-agnostic markup, gated by CSS on [data-universe],
                so the correct one is painted before any island hydrates. */}
            <div className="u-overlay u-overlay--retro fixed inset-0 pointer-events-none z-50">
                <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
            </div>

            <div className="u-overlay u-overlay--terminal fixed inset-0 pointer-events-none z-50 opacity-20 terminal-scanlines"></div>

            <div className="u-overlay u-overlay--newspaper fixed inset-0 pointer-events-none opacity-20 mix-blend-multiply"
                style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}>
            </div>

            <div className="u-overlay u-overlay--comic fixed inset-0 pointer-events-none opacity-[0.03] halftone z-0"></div>

            <div className="u-overlay u-overlay--lofi fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply film-grain"></div>

            <div className="u-overlay u-overlay--cyberpunk fixed inset-0 pointer-events-none z-0 cyber-glitch opacity-20"></div>

            {/* Noir Spotlight & Grain - Portaled to ensure z-index applies over everything */}
            {$universe === 'noir' && createPortal(
                <div className="fixed inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 film-grain opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_10%,rgba(0,0,0,0.6)_90%)]"></div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default BackgroundManager;
