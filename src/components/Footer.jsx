import React from 'react';
import { Mail, Sprout, Linkedin, Book } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { universe } from '../stores/universeStore';
import { USER_CONTENT } from '../config';

const Footer = () => {
    const $universe = useStore(universe);

    return (
        <footer className={`relative mt-20 pt-8 flex flex-col md:flex-row justify-between items-center border-t-2 text-xs font-bold tracking-widest uppercase
    ${$universe === 'punk' ? 'border-black text-black' : 'border-white/5 text-gray-500'}
    ${$universe === 'terminal' ? 'border-[#00ff41] text-[#00ff41]' : ''}
    ${$universe === 'retro' ? 'border-white/20 text-[#ff0055]' : ''}
    ${$universe === 'newspaper' || $universe === 'comic' ? 'border-black text-black' : ''}
    ${$universe === 'aero' ? 'border-white/40 text-blue-900/60' : ''}
    ${$universe === 'lofi' ? 'border-[#eee8d5] text-[#93a1a1]' : ''}
    ${$universe === 'cyberpunk' ? 'border-[#fcee0a] text-[#fcee0a]' : ''}
    ${$universe === 'bauhaus' ? 'border-black text-black' : ''}
    ${$universe === 'botanical' ? 'border-[#a3b18a] text-[#3a5a40]' : ''}
  `}>

            {/* Botanical Deco: Potted Plant on line */}
            {$universe === 'botanical' && (
                <div className="absolute top-[-24px] left-10 text-[#3a5a40]">
                    <Sprout size={24} />
                </div>
            )}
            {/* Cyberpunk Deco: Tech Stats */}
            {$universe === 'cyberpunk' && (
                <div className="absolute top-[-10px] right-0 bg-black px-2 text-[10px] text-[#00f0ff] font-mono">
                    MEM: 64TB // NET: SECURE
                </div>
            )}

            <p>© 2025 {USER_CONTENT.name}.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
                <a href="https://huangweiran.club/notes" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity flex items-center gap-2">
                    <Book size={16} /> Wiki
                </a>
                <a href={`mailto:${USER_CONTENT.social.email}`} className="hover:opacity-50 transition-opacity flex items-center gap-2">
                    <Mail size={16} /> Email
                </a>
                <a href={`https://www.linkedin.com/in/${USER_CONTENT.social.linkedin}/`} target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity flex items-center gap-2">
                    <Linkedin size={16} /> LinkedIn
                </a>
            </div>
        </footer>
    );
};

export default Footer;
