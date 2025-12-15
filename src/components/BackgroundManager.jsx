import React from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@nanostores/react';
import { universe } from '../stores/universeStore';
import { getContainerStyle } from '../utils/theme';
import { AeroBackground, BauhausBackground, BotanicalBackground } from './Backgrounds';

const BackgroundManager = () => {
    const $universe = useStore(universe);

    return (
        <div className={`fixed inset-0 pointer-events-none transition-all duration-700 ${getContainerStyle($universe)} z-[-1]`}>
            {/* --- UNIVERSE BACKGROUNDS --- */}
            {$universe === 'aero' && <AeroBackground />}
            {$universe === 'bauhaus' && <BauhausBackground />}
            {$universe === 'botanical' && <BotanicalBackground />}

            {$universe === 'retro' && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
                </div>
            )}
            {$universe === 'terminal' && (
                <div className="fixed inset-0 pointer-events-none z-50 opacity-20 terminal-scanlines pointer-events-none"></div>
            )}
            {$universe === 'newspaper' && (
                <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-multiply"
                    style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}>
                </div>
            )}
            {$universe === 'comic' && (
                <div className="fixed inset-0 pointer-events-none opacity-[0.03] halftone z-0"></div>
            )}
            {$universe === 'lofi' && (
                <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply film-grain"></div>
            )}
            {$universe === 'cyberpunk' && (
                <div className="fixed inset-0 pointer-events-none z-0 cyber-glitch opacity-20"></div>
            )}

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
