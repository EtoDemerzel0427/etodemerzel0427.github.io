import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight, ArrowRight, BookOpen, PenTool, Gamepad2, Mic2, Code, Coffee, Disc, Quote,
  MapPin, Library, Music, Terminal, Cpu, Zap, Palette, Monitor, Piano,
  Ghost, Hash, FileText, Cloud, Command, Grid3X3, Crosshair, Settings, Circle, X, Trophy,
  Book, Coffee as CoffeeIcon, Activity, Triangle, Leaf, MessageCircle, Newspaper as NewspaperIcon,
  Sprout, Flower, AlertTriangle, Wifi, Battery, Radio, Scan, Sparkles, Fingerprint, Maximize2, Minus, Star, Linkedin, Mail
} from 'lucide-react';

import { USER_CONTENT } from './config';
import { useGitHubBlogs } from './hooks/useGitHubBlogs';
import { useScores } from './hooks/useScores';
import { useGitHubStats } from './hooks/useGitHubStats';
import { getContainerStyle, getFontClass, getTagStyle } from './utils/theme';
import { CardRegistry } from './components/CardRegistry';
import { LAYOUT_CONFIG } from './config';


// --- 独立组件提取 (Clean Code & Perf) ---

const Clock = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <>{time}</>;
};

const AeroBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#eef2ff]">
    <div className="absolute top-0 left-[-10%] w-[800px] h-[800px] bg-[#4f46e5]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
    <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#06b6d4]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-[-30%] left-[20%] w-[900px] h-[900px] bg-[#ec4899]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
  </div>
);

const BauhausBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f0f0f0]">
    <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
    <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-[#e63946] rounded-full mix-blend-multiply opacity-20"></div>
    <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-[#457b9d] rounded-none rotate-12 mix-blend-multiply opacity-20"></div>
    <div className="absolute top-[40%] right-[20%] w-0 h-0 border-l-[120px] border-l-transparent border-b-[200px] border-b-[#ffb703] border-r-[120px] border-r-transparent mix-blend-multiply opacity-20 rotate-45"></div>
  </div>
);

const BotanicalBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#dad7cd]">
    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
    <div className="absolute -bottom-20 -left-20 text-[#3a5a40] opacity-10 transform rotate-12">
      <Leaf size={600} />
    </div>
    <div className="absolute -top-20 -right-20 text-[#3a5a40] opacity-10 transform -rotate-45">
      <Leaf size={500} />
    </div>
  </div>
);

const UniverseCard = ({ id, label, icon: Icon, color, desc, active, onSelect }) => (
  <button
    onClick={() => onSelect(id)}
    className={`relative group p-4 rounded-2xl border transition-all duration-300 text-left h-full flex flex-col justify-between overflow-hidden
      ${active ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
    `}
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${color}`}></div>
    <div className="relative z-10">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 text-white bg-gradient-to-br ${color} shadow-sm`}>
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
      <p className="text-xs text-gray-500">{desc}</p>
    </div>
  </button>
);

const UNIVERSE_OPTIONS = [
  { id: 'neon', label: 'Neon', desc: 'Vibrant & Modern', icon: Zap, color: 'from-blue-400 to-purple-500' },
  { id: 'noir', label: 'Noir', desc: 'Dark & Minimal', icon: Monitor, color: 'from-gray-700 to-black' },
  { id: 'aero', label: 'Aero', desc: 'Glass & Fluid', icon: Cloud, color: 'from-cyan-400 to-blue-500' },
  { id: 'punk', label: 'Punk', desc: 'Bold & Brutal', icon: Palette, color: 'from-yellow-400 to-red-500' },
  { id: 'retro', label: 'Retro', desc: '8-Bit Arcade', icon: Ghost, color: 'from-red-500 to-pink-500' },
  { id: 'terminal', label: 'Terminal', desc: 'Hacker Console', icon: Hash, color: 'from-green-400 to-green-600' },
  { id: 'bauhaus', label: 'Bauhaus', desc: 'Geometric Art', icon: Triangle, color: 'from-red-600 to-yellow-500' },
  { id: 'newspaper', label: 'Times', desc: 'Classic Editorial', icon: FileText, color: 'from-gray-400 to-gray-600' },
  { id: 'comic', label: 'Comic', desc: 'Western Style', icon: Book, color: 'from-gray-800 to-black' },
  { id: 'lofi', label: 'Lofi', desc: 'Cozy Vibes', icon: CoffeeIcon, color: 'from-yellow-600 to-yellow-800' },
  { id: 'botanical', label: 'Botanical', desc: 'Organic Nature', icon: Leaf, color: 'from-green-700 to-green-900' },
  { id: 'cyberpunk', label: 'Cyberpunk', desc: '2077 Night City', icon: Activity, color: 'from-yellow-400 to-yellow-600' },
];

const Header = ({ universe, time, onShowStatus }) => (
  <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 px-2 relative">

    {/* Cyberpunk HUD */}
    {universe === 'cyberpunk' && (
      <div className="absolute -top-10 right-0 border border-[#00f0ff]/50 bg-black/80 text-[#00f0ff] p-2 text-[10px] font-cyber flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span>SYS.ONLINE</span>
          <div className="w-2 h-2 bg-[#00f0ff] animate-pulse"></div>
        </div>
        <div className="opacity-50">LOC: CHI_Z0NE</div>
        <div className="opacity-50">USR: WEIRAN</div>
      </div>
    )}

    <div>
      {/* 状态栏 */}
      {(() => {
        const hasPolaroid = USER_CONTENT.status.meta && USER_CONTENT.status.meta.photoUrl;
        return (
          <div
            onClick={() => hasPolaroid && onShowStatus(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium transition-all
            ${hasPolaroid ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
            ${universe === 'noir' ? 'text-gray-300 border border-white/10 rounded-full bg-white/5' : ''}
            ${universe === 'punk' ? 'bg-white text-black border-2 border-black rotate-1 shadow-[2px_2px_0px_#000]' : ''}
            ${universe === 'retro' ? 'text-white bg-[#ff0055] border-2 border-white rounded-sm shadow-[2px_2px_0px_rgba(255,255,255,0.5)]' : ''}
            ${universe === 'terminal' ? 'text-[#00ff41] border border-[#00ff41] bg-black shadow-[0_0_10px_rgba(0,255,65,0.3)]' : ''}
            ${universe === 'newspaper' ? 'text-black border-y-2 border-black bg-transparent tracking-widest' : ''}
            ${universe === 'aero' ? 'text-gray-700 bg-white/30 border border-white/50 backdrop-blur-md rounded-full shadow-lg' : ''}
            ${universe === 'comic' ? 'text-black bg-white border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.2)]' : ''}
            ${universe === 'lofi' ? 'bg-[#eee8d5] text-[#586e75] transform -rotate-2 rounded-sm shadow-sm' : ''}
            ${universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black border-none cyber-clip skew-x-[-10deg]' : ''}
            ${universe === 'bauhaus' ? 'bg-[#e63946] text-white rounded-full' : ''}
            ${universe === 'botanical' ? 'bg-[#a3b18a] text-white rounded-xl' : ''}
            ${universe === 'neon' ? 'text-gray-700 bg-white border border-gray-200 rounded-full shadow-sm' : ''}
          `}>
            <span className="text-lg animate-pulse">{USER_CONTENT.status.emoji}</span>
            <span>{USER_CONTENT.status.text}</span>
          </div>
        );
      })()}


      <>
        <h1 className={`text-6xl md:text-8xl font-bold mb-4 transition-all ${getFontClass(universe, 'title')}
           ${universe === 'comic' ? 'bg-black text-white px-6 py-2 transform -skew-x-12 block w-fit shadow-[8px_8px_0_rgba(0,0,0,0.2)]' : ''}
           ${universe === 'cyberpunk' ? 'text-[#fcee0a] drop-shadow-[2px_2px_0_#00f0ff]' : ''}
           ${universe === 'terminal' ? 'animate-pulse' : ''} 
           ${universe === 'bauhaus' ? 'text-[#1d3557]' : ''}
        `}>
          {universe === 'terminal' && <span className="mr-4">_</span>}
          {USER_CONTENT.name}
        </h1>

        <p className={`text-xl md:text-2xl max-w-2xl leading-relaxed transition-colors ${getFontClass(universe, 'body')}
           ${universe === 'noir' ? 'text-gray-400' : ''}
           ${universe === 'punk' ? 'text-black bg-white inline px-1 font-black uppercase' : ''}
           ${universe === 'retro' ? 'text-white/70 text-sm leading-8' : ''}
           ${universe === 'terminal' ? 'text-[#00ff41] opacity-80' : ''}
           ${universe === 'newspaper' ? 'text-[#333] italic' : ''}
           ${universe === 'aero' ? 'text-gray-800/80 drop-shadow-sm font-light' : ''}
           ${universe === 'comic' ? 'text-black font-bold uppercase' : ''}
           ${universe === 'lofi' ? 'text-[#586e75]' : ''}
           ${universe === 'cyberpunk' ? 'text-[#00f0ff]' : ''}
           ${universe === 'bauhaus' ? 'text-[#457b9d]' : ''}
           ${universe === 'botanical' ? 'text-[#3a5a40]' : ''}
           ${universe === 'neon' ? 'text-gray-500 font-medium' : ''}
        `}>
          {USER_CONTENT.role}.<br />
          <span className={
            universe === 'punk' ? 'bg-black text-white px-1' :
              universe === 'retro' ? 'text-[#55ffff]' :
                universe === 'terminal' ? 'text-white bg-[#00ff41] text-black px-1' :
                  universe === 'newspaper' ? 'italic font-serif' :
                    universe === 'aero' ? 'text-blue-600 font-normal' :
                      universe === 'comic' ? 'bg-black text-white px-1' :
                        universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] px-1' :
                          universe === 'bauhaus' ? 'text-[#e63946] font-bold' :
                            universe === 'botanical' ? 'italic text-[#3a5a40]' :
                              universe === 'neon' ? 'text-[#3A86FF]' : 'text-blue-500'
          }>{USER_CONTENT.bio}</span>
        </p>
      </>
    </div>

    <div className="mt-8 md:mt-0 flex flex-col items-end">
      <span className={`text-sm transition-all flex items-center gap-2
         ${universe === 'punk' ? 'font-code bg-black text-white px-2' : ''}
         ${universe === 'retro' ? 'text-xs text-[#ff0055]' : 'font-mono opacity-50'}
         ${universe === 'terminal' ? 'text-[#00ff41]' : ''}
         ${universe === 'newspaper' ? 'italic text-black border-b border-black opacity-100' : ''}
         ${universe === 'aero' ? 'text-gray-600 bg-white/40 px-3 py-1 rounded-full' : ''}
         ${universe === 'cyberpunk' ? 'text-[#fcee0a] bg-black border border-[#fcee0a] px-2' : ''}
         ${universe === 'bauhaus' ? 'text-white bg-[#1d3557] rounded-full px-3' : ''}
         ${universe === 'botanical' ? 'text-[#3a5a40] font-serif italic' : ''}
       `}>
        <MapPin size={12} /> {USER_CONTENT.location} • <Clock />
      </span>
    </div>
  </header>
);

const BentoGrid = React.memo(({ universe, blogCount, featuredPost, scores, userProfile, contributionStats, blogsLoading, scoresLoading, githubLoading, isPlaying, onToggleMusic }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[240px]">
    {LAYOUT_CONFIG.map((cardConfig) => {
      const Component = CardRegistry[cardConfig.type];
      if (!Component) return null;

      // Resolve Data
      let data = {};
      if (cardConfig.type === 'music') data = USER_CONTENT.nowPlaying;
      else if (cardConfig.type === 'archive') data = { count: blogCount, siteUrl: USER_CONTENT.blogRepo.siteBaseUrl };
      else if (cardConfig.type === 'tech') data = featuredPost || USER_CONTENT.featuredArticle;
      else if (cardConfig.type === 'reading') data = USER_CONTENT.reading;
      else if (cardConfig.type === 'score') data = scores;
      else if (cardConfig.type === 'game') data = USER_CONTENT.game;
      else if (cardConfig.type === 'activity') data = { profile: userProfile, contributions: contributionStats, fallbackUrl: `https://github.com/${USER_CONTENT.social.github}` };
      else if (cardConfig.type === 'bio') data = { projectUrl: `https://github.com/${USER_CONTENT.social.github}?tab=repositories` };
      // Quote handles its own static data or don't need it prop-passed

      // Resolve Special Props
      const extraProps = {};
      if (cardConfig.type === 'music') {
        extraProps.isPlaying = isPlaying;
        extraProps.onToggle = onToggleMusic;
      }
      if (cardConfig.type === 'archive') extraProps.loading = blogsLoading;
      if (cardConfig.type === 'score') extraProps.loading = scoresLoading;
      if (cardConfig.type === 'activity') extraProps.loading = githubLoading;

      return (
        <Component
          key={cardConfig.id}
          universe={universe}
          data={data}
          className={cardConfig.className || ''}
          {...extraProps}
        />
      );
    })}
  </div>
));

const Footer = ({ universe }) => (
  <footer className={`relative mt-20 pt-8 flex flex-col md:flex-row justify-between items-center border-t-2 text-xs font-bold tracking-widest uppercase
    ${universe === 'punk' ? 'border-black text-black' : 'border-white/5 text-gray-500'}
    ${universe === 'terminal' ? 'border-[#00ff41] text-[#00ff41]' : ''}
    ${universe === 'retro' ? 'border-white/20 text-[#ff0055]' : ''}
    ${universe === 'newspaper' || universe === 'comic' ? 'border-black text-black' : ''}
    ${universe === 'aero' ? 'border-white/40 text-blue-900/60' : ''}
    ${universe === 'lofi' ? 'border-[#eee8d5] text-[#93a1a1]' : ''}
    ${universe === 'cyberpunk' ? 'border-[#fcee0a] text-[#fcee0a]' : ''}
    ${universe === 'bauhaus' ? 'border-black text-black' : ''}
    ${universe === 'botanical' ? 'border-[#a3b18a] text-[#3a5a40]' : ''}
  `}>

    {/* Botanical Deco: Potted Plant on line */}
    {universe === 'botanical' && (
      <div className="absolute top-[-24px] left-10 text-[#3a5a40]">
        <Sprout size={24} />
      </div>
    )}
    {/* Cyberpunk Deco: Tech Stats */}
    {universe === 'cyberpunk' && (
      <div className="absolute top-[-10px] right-0 bg-black px-2 text-[10px] text-[#00f0ff] font-mono">
        MEM: 64TB // NET: SECURE
      </div>
    )}

    <p>© 2025 {USER_CONTENT.name}.</p>
    <div className="flex gap-8 mt-4 md:mt-0">
      <a href={`mailto:${USER_CONTENT.social.email}`} className="hover:opacity-50 transition-opacity flex items-center gap-2">
        <Mail size={16} /> Email
      </a>
      <a href={`https://www.linkedin.com/in/${USER_CONTENT.social.linkedin}/`} target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity flex items-center gap-2">
        <Linkedin size={16} /> LinkedIn
      </a>
    </div>
  </footer>
);

const App = () => {
  // Moved time state to Clock component to prevent App re-renders
  const [universe, setUniverse] = useState(USER_CONTENT.defaultTheme || 'neon');
  const [showPortal, setShowPortal] = useState(false);
  const [showStatusCard, setShowStatusCard] = useState(false);

  // Blog Hook
  const { count: blogCount, featuredPost, loading: blogsLoading } = useGitHubBlogs();

  // Score Hook
  const { scores, loading: scoresLoading } = useScores();

  // Fetch Real GitHub Stats
  const { userProfile, contributionStats, loading: githubLoading } = useGitHubStats(USER_CONTENT.social.github);

  // Music Player State
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleMusic = React.useCallback((e) => {
    e.stopPropagation(); // Prevent card click if any
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleUniverseSelect = React.useCallback((id) => {
    setUniverse(id);
    setShowPortal(false);
  }, []);

  const handleShowStatus = React.useCallback((show) => {
    setShowStatusCard(show);
  }, []);

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-all duration-700 ${getContainerStyle(universe)} relative z-0 overflow-hidden`}>

      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@400;700&family=Press+Start+2P&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@200;300;400;600&family=Bangers&family=Patrick+Hand&family=Orbitron:wght@400;700;900&family=DM+Sans:wght@400;700&display=swap');
          .font-academic { font-family: 'Playfair Display', serif; }
          .font-code { font-family: 'JetBrains Mono', monospace; }
          .font-pixel { font-family: 'Press Start 2P', cursive; }
          .font-serif { font-family: 'Lora', serif; }
          .font-comic { font-family: 'Bangers', cursive; letter-spacing: 0.05em; }
          .font-hand { font-family: 'Patrick Hand', cursive; }
          .font-cyber { font-family: 'Orbitron', sans-serif; }
          .font-geo { font-family: 'DM Sans', sans-serif; }
          
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

          .text-shadow-glow { text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
          
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(50px, -80px) scale(1.2); }
            66% { transform: translate(-40px, 40px) scale(0.8); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 5s infinite ease-in-out alternate; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          .animation-delay-6000 { animation-delay: 6s; }

          .scanlines {
            background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
            background-size: 100% 4px;
          }

          .halftone {
            background-image: radial-gradient(circle, #000 1px, transparent 1px);
            background-size: 8px 8px;
          }
          
          .manga-speedlines {
            background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px);
          }

          .cyber-clip {
            clip-path: polygon(
              0 0, 
              100% 0, 
              100% 90%, 
              95% 100%, 
              0 100%
            );
          }
          
          .cyber-glitch {
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 0, 0.05) 3px);
          }
          
          .caution-tape {
            background: repeating-linear-gradient(
              45deg,
              #fcee0a,
              #fcee0a 10px,
              #000 10px,
              #000 20px
            );
          }

          .comic-halftone {
            position: relative;
            z-index: 1;
          }
          .comic-halftone::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: radial-gradient(#000 1px, transparent 1px);
            background-size: 6px 6px;
            opacity: 0.02;
            pointer-events: none;
            z-index: -1;
          }

          /* Noir Film Grain - Enhanced opacity */
          .film-grain {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E");
          }

          /* Terminal Scanlines Overlay */
          .terminal-scanlines {
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 2px, 3px 100%;
          }

          /* Neon Ceramic Glow */
          .neon-glow-card {
            box-shadow: 
              0 10px 40px -10px rgba(0,0,0,0.1),
              inset 0 2px 0 rgba(255,255,255,0.5),
              inset 0 -2px 0 rgba(0,0,0,0.05);
          }
          .neon-glow-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100%;
            background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%);
            pointer-events: none;
          }
        `}
      </style>

      {/* --- UNIVERSE BACKGROUNDS --- */}
      {universe === 'aero' && <AeroBackground />}
      {universe === 'bauhaus' && <BauhausBackground />}
      {universe === 'botanical' && <BotanicalBackground />}

      {universe === 'retro' && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
        </div>
      )}
      {universe === 'terminal' && (
        <div className="fixed inset-0 pointer-events-none z-50 opacity-20 terminal-scanlines pointer-events-none"></div>
      )}
      {universe === 'newspaper' && (
        <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-multiply"
          style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}>
        </div>
      )}
      {universe === 'comic' && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] halftone z-0"></div>
      )}
      {universe === 'lofi' && (
        <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply film-grain"></div>
      )}
      {universe === 'cyberpunk' && (
        <div className="fixed inset-0 pointer-events-none z-0 cyber-glitch opacity-20"></div>
      )}

      {/* Noir Spotlight & Grain */}
      {universe === 'noir' && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 film-grain opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_10%,rgba(0,0,0,0.6)_90%)]"></div>
        </div>
      )}


      {/* --- MULTIVERSE PORTAL (Theme Switcher) --- */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => setShowPortal(true)}
          className={`px-5 py-2.5 rounded-full font-bold shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2
            ${universe === 'retro' ? 'bg-[#ff0055] text-white border-2 border-white rounded-sm' :
              universe === 'terminal' ? 'bg-[#00ff41] text-black rounded-none border border-[#00ff41]' :
                universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black rounded-none border border-[#00f0ff] cyber-clip' :
                  universe === 'bauhaus' ? 'bg-[#e63946] text-white rounded-none border-2 border-black' :
                    universe === 'botanical' ? 'bg-[#3a5a40] text-[#dad7cd] font-serif italic' :
                      universe === 'comic' ? 'bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000]' :
                        universe === 'punk' ? 'bg-[#F7E018] text-black border-2 border-black' :
                          'bg-white text-black'}
          `}
        >
          <Grid3X3 size={18} />
          <span className="hidden md:inline text-xs tracking-widest uppercase">Switch Universe</span>
        </button>
      </div>

      {/* PORTAL MODAL */}
      {showPortal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowPortal(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* Portal Content */}
            <div className="flex items-center justify-between p-6 border-b bg-white top-0 z-10 sticky">
              <h2 className="text-xl font-bold">CHOOSE YOUR UNIVERSE</h2>
              <button onClick={() => setShowPortal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {UNIVERSE_OPTIONS.map((option) => (
                  <UniverseCard
                    key={option.id}
                    {...option}
                    active={universe === option.id}
                    onSelect={handleUniverseSelect}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POLAROID MOMENT MODAL */}
      {showStatusCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowStatusCard(false)}></div>
          <div className="relative bg-white p-4 pb-12 shadow-2xl transform rotate-2 max-w-sm w-full animate-in fade-in zoom-in-95 duration-300">
            {/* Tape Effect */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/30 backdrop-blur-sm border border-white/40 shadow-sm rotate-[-2deg] z-10"></div>

            <button
              onClick={() => setShowStatusCard(false)}
              className="absolute -top-4 -right-4 bg-black text-white rounded-full p-2 hover:scale-110 transition-transform shadow-lg z-20"
            >
              <X size={20} />
            </button>

            <div className="aspect-[4/5] bg-gray-100 overflow-hidden mb-4 border border-gray-200 shadow-inner">
              <img
                src={USER_CONTENT.status.meta.photoUrl}
                alt="Status Moment"
                className="w-full h-full object-cover filter contrast-110 hover:scale-105 transition-transform duration-700"
              />
            </div>

            <div className="text-center px-2">
              <p className={`font-hand text-2xl text-gray-800 -rotate-1`}>
                {USER_CONTENT.status.meta.note}
              </p>
              <p className="text-xs text-gray-400 mt-4 font-mono uppercase tracking-widest">
                {USER_CONTENT.status.meta.date ?? new Date().toLocaleDateString()} • {USER_CONTENT.status.meta.location ?? USER_CONTENT.location}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <audio ref={audioRef} src={USER_CONTENT.nowPlaying.audioUrl} loop />

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto relative z-10 pt-12">

        <Header universe={universe} onShowStatus={handleShowStatus} />

        {/* BENTO GRID - Refactored */}
        <BentoGrid
          universe={universe}
          blogCount={blogCount}
          featuredPost={featuredPost}
          scores={scores}
          userProfile={userProfile}
          contributionStats={contributionStats}
          blogsLoading={blogsLoading}
          scoresLoading={scoresLoading}
          githubLoading={githubLoading}
          isPlaying={isPlaying}
          onToggleMusic={toggleMusic}
        />

        <Footer universe={universe} />

      </div>

      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
};

export default App;