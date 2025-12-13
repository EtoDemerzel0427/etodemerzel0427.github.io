import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, ArrowRight, BookOpen, PenTool, Gamepad2, Mic2, Code, Coffee, Disc, Quote, 
  MapPin, Twitter, Library, Music, Terminal, Cpu, Zap, Palette, Monitor, Piano, 
  Ghost, Hash, FileText, Cloud, Command, Grid3X3, Crosshair, Settings, Circle, X, 
  Book, Coffee as CoffeeIcon, Activity, Triangle, Leaf, MessageCircle, Newspaper as NewspaperIcon, 
  Sprout, Flower, AlertTriangle, Wifi, Battery, Radio, Scan, Sparkles, Fingerprint, Maximize2, Minus
} from 'lucide-react';

// --- 🔧 用户配置区域 (修改这里即可更新主页内容) ---
const USER_CONTENT = {
  name: "Weiran Huang",
  role: "C++ Engineer",
  company: "Akuna Capital",
  bio: "Digital Artist, Pianist & Console Gamer.",
  location: "CHICAGO",
  status: {
    emoji: "🌴",
    text: "Vacationing in Cali" // 修改这里更新状态
  },
  nowPlaying: {
    song: "Pink + White",
    artist: "Frank Ocean"
  },
  featuredArticle: {
    date: "2024.03.15",
    category: "Engineering",
    title: "Modern C++: Understanding Memory Order",
    desc: "Exploring std::memory_order_relaxed vs acquire/release semantics in lock-free queues. Why 'volatile' is not enough."
  },
  hobbies: {
    game: {
      title: "Platinum Trophy Hunting",
      desc: "Finally beat Malenia in Elden Ring after 50+ tries. The satisfaction is unreal.",
      console: "PS5"
    },
    music: {
      composer: "Chopin",
      piece: "Nocturne Op. 9 No. 2"
    }
  },
  stats: {
    posts: "86"
  },
  social: {
    twitter: "@weiran_dev"
  }
};

const BlogHome = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  const [universe, setUniverse] = useState('neon');
  const [showPortal, setShowPortal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 动态背景组件 ---
  const AeroBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#eef2ff]">
      <div className="absolute top-0 left-[-10%] w-[800px] h-[800px] bg-[#4f46e5]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#06b6d4]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-30%] left-[20%] w-[900px] h-[900px] bg-[#ec4899]/60 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
    </div>
  );

  const BauhausBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f0f0f0]">
      <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px'}}></div>
      <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-[#e63946] rounded-full mix-blend-multiply opacity-20"></div>
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-[#457b9d] rounded-none rotate-12 mix-blend-multiply opacity-20"></div>
      <div className="absolute top-[40%] right-[20%] w-0 h-0 border-l-[120px] border-l-transparent border-b-[200px] border-b-[#ffb703] border-r-[120px] border-r-transparent mix-blend-multiply opacity-20 rotate-45"></div>
    </div>
  );

  const BotanicalBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#dad7cd]">
       <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}}></div>
       <div className="absolute -bottom-20 -left-20 text-[#3a5a40] opacity-10 transform rotate-12">
         <Leaf size={600} />
       </div>
       <div className="absolute -top-20 -right-20 text-[#3a5a40] opacity-10 transform -rotate-45">
         <Leaf size={500} />
       </div>
    </div>
  );

  // --- 样式工厂 ---
  const getContainerStyle = () => {
    switch (universe) {
      case 'noir': return "bg-[#050505] text-gray-300 font-sans selection:bg-white selection:text-black";
      case 'punk': return "bg-[#F7E018] text-black font-serif selection:bg-black selection:text-white"; 
      case 'retro': return "bg-[#202028] text-[#e0e0e0] font-pixel selection:bg-[#ff0055] selection:text-white relative"; 
      case 'terminal': return "bg-black text-[#33ff00] font-mono selection:bg-[#33ff00] selection:text-black"; 
      case 'newspaper': return "bg-[#f4f4f0] text-[#111] font-serif selection:bg-black selection:text-white";
      case 'aero': return "text-gray-900 font-sans selection:bg-blue-500/30 selection:text-blue-900"; 
      case 'comic': return "bg-[#fff9f0] text-black font-comic selection:bg-black selection:text-white";
      case 'lofi': return "bg-[#fdf6e3] text-[#586e75] font-hand selection:bg-[#eee8d5] selection:text-[#b58900]";
      case 'cyberpunk': return "bg-[#050a0e] text-[#fcee0a] font-cyber selection:bg-[#fcee0a] selection:text-black";
      case 'bauhaus': return "bg-[#f4f1ea] text-[#1d3557] font-geo selection:bg-[#e63946] selection:text-white";
      case 'botanical': return "bg-[#dad7cd] text-[#344e41] font-serif selection:bg-[#3a5a40] selection:text-white";
      case 'neon': default: return "bg-[#F4F5F7] text-gray-900 font-sans selection:bg-[#3A86FF]/20 selection:text-[#3A86FF]";
    }
  };

  const getCardStyle = (type = 'default', customClass = "") => {
    const baseTransition = "relative flex flex-col justify-between transition-all duration-500 ease-out";
    const overflowClass = (universe === 'bauhaus' || universe === 'comic' || universe === 'botanical' || universe === 'punk' || universe === 'lofi') ? '' : 'overflow-hidden';

    // 🌑 NOIR
    if (universe === 'noir') return `${baseTransition} ${overflowClass} bg-[#111] border border-white/10 rounded-3xl p-6 group hover:border-white/30 hover:bg-[#161616] hover:shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)] ${customClass}`;
    
    // 🤘 PUNK
    if (universe === 'punk') {
      const punkBase = `${baseTransition} ${overflowClass} bg-white border-[3px] border-black p-5 shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 hover:-translate-x-[1px] group rotate-1 hover:rotate-0 transition-transform duration-200`;
      
      switch (type) {
        case 'primary': return `${punkBase} bg-black text-white ${customClass}`; 
        case 'green': return `${punkBase} bg-[#ff00ff] text-black ${customClass}`;
        case 'yellow': return `${punkBase} bg-white text-black ${customClass}`;
        case 'blue': return `${punkBase} bg-black text-white ${customClass}`;
        case 'pink': return `${punkBase} bg-[#ff0000] text-black ${customClass}`;
        default: return `${punkBase} bg-white text-black ${customClass}`;
      }
    }

    if (universe === 'retro') return `${baseTransition} ${overflowClass} border-2 border-white/20 bg-[#2d2a2e] p-4 group rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:border-[#ff0055] hover:z-10 ${customClass}`;
    
    // 📟 TERMINAL
    if (universe === 'terminal') {
      const termBase = `${baseTransition} ${overflowClass} border-4 border-double border-[#00ff41]/50 p-5 bg-black hover:border-[#00ff41] hover:shadow-[0_0_20px_rgba(0,255,65,0.2)] group rounded-none`;
      return `${termBase} ${customClass}`;
    }
    
    if (universe === 'newspaper') {
      const newsBase = `${baseTransition} ${overflowClass} border-y-2 border-black p-6 bg-white group hover:bg-[#fafafa] rounded-none shadow-sm`;
      return `${newsBase} ${customClass}`;
    }
    
    if (universe === 'aero') return `${baseTransition} ${overflowClass} bg-white/40 backdrop-blur-[60px] border border-white/20 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] hover:bg-white/50 hover:scale-[1.01] hover:shadow-[0_16px_48px_0_rgba(31,38,135,0.15)] rounded-[2rem] group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] ${customClass}`;

    if (universe === 'comic') {
      // Fixed: Removed background-color from base to allow halftone to show, but ensured content readability via z-index
      const comicBase = `${baseTransition} ${overflowClass} border-[3px] border-black bg-white p-6 group shadow-[8px_8px_0px_#000] hover:shadow-[12px_12px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 rounded-sm comic-halftone`;
      return `${comicBase} ${customClass}`;
    }

    // ☕ LOFI
    if (universe === 'lofi') {
      const lofiBase = `${baseTransition} ${overflowClass} shadow-md hover:shadow-lg hover:-translate-y-1 p-6 rounded-sm border-none group relative`;
      switch (type) {
        case 'primary': return `${lofiBase} bg-[#fff8e1] rotate-1 ${customClass}`; 
        case 'green': return `${lofiBase} bg-[#e8f5e9] -rotate-1 ${customClass}`; 
        case 'yellow': return `${lofiBase} bg-[#fff3e0] rotate-2 ${customClass}`; 
        case 'blue': return `${lofiBase} bg-[#e3f2fd] -rotate-2 ${customClass}`; 
        case 'pink': return `${lofiBase} bg-[#fce4ec] rotate-1 ${customClass}`; 
        default: return `${lofiBase} bg-white rotate-0 ${customClass}`;
      }
    }

    if (universe === 'cyberpunk') {
      const cyberBase = `${baseTransition} ${overflowClass} border-none p-6 group cyber-clip hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(252,238,10,0.6)] rounded-none transition-colors duration-200`;
      switch (type) {
        case 'primary': return `${cyberBase} bg-[#fcee0a] text-black pb-12 ${customClass}`; 
        case 'green': return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`; 
        case 'pink': return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`; 
        case 'blue': return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`; 
        default: return `${cyberBase} bg-[#1a1a1a] text-[#fcee0a] border border-[#fcee0a] ${customClass}`;
      }
    }

    if (universe === 'bauhaus') {
      const bauhausBase = `${baseTransition} p-8 group shadow-xl hover:-translate-y-2 border-4 border-black relative z-10`;
      const roundTop = "rounded-tr-[4rem] rounded-bl-[4rem]"; 
      const roundBottom = "rounded-tl-[4rem] rounded-br-[4rem]";
      const roundLeft = "rounded-r-[4rem]"; 
      const box = "rounded-none";
      
      switch (type) {
        case 'primary': return `${bauhausBase} bg-[#e63946] text-white ${roundTop} ${customClass}`;
        case 'green': return `${bauhausBase} bg-[#457b9d] text-white ${roundLeft} ${customClass}`; 
        case 'yellow': return `${bauhausBase} bg-[#ffb703] text-black ${box} ${customClass}`;
        case 'blue': return `${bauhausBase} bg-[#1d3557] text-white ${roundBottom} ${customClass}`;
        default: return `${bauhausBase} bg-white text-black ${box} ${customClass}`;
      }
    }

    if (universe === 'botanical') {
      const botBase = `${baseTransition} ${overflowClass} bg-[#f0ead6] border border-[#a3b18a] p-6 shadow-sm hover:shadow-md hover:border-[#3a5a40] rounded-xl group hover:-translate-y-0.5`;
      return `${botBase} ${customClass}`;
    }

    // ✨ NEON
    const neonBase = `${baseTransition} ${overflowClass} rounded-[2.5rem] p-8 group border border-white/50 hover:-translate-y-1 relative overflow-hidden neon-glow-card`;
    switch (type) {
      case 'primary': return `${neonBase} bg-white text-gray-900 shadow-[0_10px_40px_-10px_rgba(58,134,255,0.2)] ${customClass}`;
      case 'white': return `${neonBase} bg-white text-gray-900 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] ${customClass}`;
      case 'green': return `${neonBase} bg-[#06D6A0] text-white shadow-[0_10px_40px_-10px_rgba(6,214,160,0.4)] ${customClass}`;
      case 'yellow': return `${neonBase} bg-[#FFD166] text-[#5c4d00] shadow-[0_10px_40px_-10px_rgba(255,209,102,0.4)] ${customClass}`;
      case 'blue': return `${neonBase} bg-[#3A86FF] text-white shadow-[0_10px_40px_-10px_rgba(58,134,255,0.4)] ${customClass}`;
      case 'pink': return `${neonBase} bg-[#EF476F] text-white shadow-[0_10px_40px_-10px_rgba(239,71,111,0.4)] ${customClass}`;
      default: return `${neonBase} bg-white text-gray-900 ${customClass}`;
    }
  };

  const getFontClass = (variant = 'body') => {
    if (universe === 'punk') return variant === 'title' ? 'font-academic italic font-black uppercase tracking-tighter' : 'font-code font-bold uppercase';
    if (universe === 'retro') return 'font-pixel text-xs md:text-sm tracking-widest leading-loose';
    if (universe === 'terminal') return 'font-mono text-sm md:text-base text-shadow-glow'; 
    if (universe === 'newspaper') return variant === 'title' ? 'font-academic font-bold tracking-tight' : 'font-serif';
    if (universe === 'aero') return variant === 'title' ? 'font-sans font-light tracking-wide' : 'font-sans font-light tracking-wide';
    if (universe === 'comic') return 'font-comic tracking-wider uppercase';
    if (universe === 'lofi') return 'font-hand text-lg';
    if (universe === 'cyberpunk') return 'font-cyber tracking-widest uppercase';
    if (universe === 'bauhaus') return 'font-geo tracking-tight';
    if (universe === 'botanical') return 'font-serif tracking-wide';
    if (universe === 'neon') return variant === 'title' ? 'font-academic font-bold tracking-tight' : 'font-sans';
    return variant === 'title' ? 'font-sans tracking-tight' : 'font-sans';
  };

  const getTagStyle = (colorType) => {
    if (universe === 'retro') return "border-2 border-current px-2 py-1 text-[8px] bg-white text-black";
    if (universe === 'terminal') return "border border-[#00ff41] px-2 py-0 text-xs bg-[#00ff41] text-black font-bold";
    if (universe === 'newspaper') return "border-y border-black px-0 py-1 text-xs font-bold uppercase tracking-widest font-sans";
    if (universe === 'aero') return "bg-white/40 border border-white/50 px-4 py-1 text-xs font-medium rounded-full text-gray-800 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]";
    if (universe === 'comic') return "bg-white border-2 border-black text-black px-3 py-1 text-xs font-bold rounded-[50%_50%_50%_0] shadow-[2px_2px_0_#000] -rotate-2";
    if (universe === 'lofi') return "bg-white/50 px-2 py-1 rounded-sm text-[#586e75] text-sm border border-gray-200"; 
    if (universe === 'cyberpunk') return "bg-[#fcee0a] text-black px-2 py-0.5 text-[10px] font-bold skew-x-[-10deg]";
    if (universe === 'punk') return "bg-black text-white px-2 py-1 text-xs font-black uppercase -rotate-2 border-2 border-white shadow-md";
    if (universe === 'bauhaus') return "bg-black text-white px-3 py-1 text-xs font-bold rounded-none -translate-y-4 shadow-md";
    if (universe === 'botanical') return "bg-[#a3b18a]/30 text-[#3a5a40] px-3 py-1 rounded-full text-xs font-serif italic";
    if (universe === 'noir') return "bg-white/10 border border-white/20 text-gray-300 px-3 py-1 rounded-full text-xs";
    if (universe !== 'neon') return ""; 
    return "bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm px-3 py-1 rounded-full text-xs font-bold";
  };

  const UniverseCard = ({ id, label, icon: Icon, color, desc }) => (
    <button 
      onClick={() => { setUniverse(id); setShowPortal(false); }}
      className={`relative group p-4 rounded-2xl border transition-all duration-300 text-left h-full flex flex-col justify-between overflow-hidden
        ${universe === id ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
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

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-all duration-700 ${getContainerStyle()} relative z-0 overflow-hidden`}>
      
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
             style={{backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`}}>
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
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">CHOOSE YOUR FIGHTER</h2>
                <p className="text-sm text-gray-500">Select a reality to explore.</p>
              </div>
              <button onClick={() => setShowPortal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <UniverseCard id="neon" label="Neon" desc="Vibrant & Modern" icon={Zap} color="from-blue-400 to-purple-500" />
                <UniverseCard id="noir" label="Noir" desc="Dark & Minimal" icon={Monitor} color="from-gray-700 to-black" />
                <UniverseCard id="aero" label="Aero" desc="Glass & Fluid" icon={Cloud} color="from-cyan-400 to-blue-500" />
                <UniverseCard id="punk" label="Punk" desc="Bold & Brutal" icon={Palette} color="from-yellow-400 to-red-500" />
                <UniverseCard id="retro" label="Retro" desc="8-Bit Arcade" icon={Ghost} color="from-red-500 to-pink-500" />
                <UniverseCard id="terminal" label="Terminal" desc="Hacker Console" icon={Hash} color="from-green-400 to-green-600" />
                <UniverseCard id="bauhaus" label="Bauhaus" desc="Geometric Art" icon={Triangle} color="from-red-600 to-yellow-500" />
                <UniverseCard id="newspaper" label="Times" desc="Classic Editorial" icon={FileText} color="from-gray-400 to-gray-600" />
                <UniverseCard id="comic" label="Comic" desc="Western Style" icon={Book} color="from-gray-800 to-black" />
                <UniverseCard id="lofi" label="Lofi" desc="Cozy Vibes" icon={CoffeeIcon} color="from-yellow-600 to-yellow-800" />
                <UniverseCard id="botanical" label="Botanical" desc="Organic Nature" icon={Leaf} color="from-green-700 to-green-900" />
                <UniverseCard id="cyberpunk" label="Cyberpunk" desc="2077 Night City" icon={Activity} color="from-yellow-400 to-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto relative z-10 pt-12">
        
        {/* Header */}
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
            <div className={`inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium transition-all cursor-default
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

            <h1 className={`text-6xl md:text-8xl font-bold mb-4 transition-all ${getFontClass('title')}
               ${universe === 'comic' ? 'text-white text-stroke-black drop-shadow-[4px_4px_0_#000] italic' : ''}
               ${universe === 'cyberpunk' ? 'text-[#fcee0a] drop-shadow-[2px_2px_0_#00f0ff]' : ''}
               ${universe === 'terminal' ? 'animate-pulse' : ''} 
               ${universe === 'bauhaus' ? 'text-[#1d3557]' : ''}
            `}>
              {universe === 'terminal' && <span className="mr-4">_</span>}
              {USER_CONTENT.name}
            </h1>
            
            <p className={`text-xl md:text-2xl max-w-2xl leading-relaxed transition-colors ${getFontClass('body')}
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
              {USER_CONTENT.role} @ <span className="font-bold">{USER_CONTENT.company}</span>.<br/>
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
              <MapPin size={12} /> {USER_CONTENT.location} • {time}
            </span>
          </div>
        </header>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[240px]">
          
          {/* 1. 主卡 (2x2) - C++ */}
          <div className={`${getCardStyle('primary', "md:col-span-2 md:row-span-2")} !p-10`}>
            {/* Universe Specific Decorations */}
            {universe === 'neon' && (
              <>
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#3A86FF]/5 via-white/0 to-[#EF476F]/5 opacity-100"></div>
                <div className="absolute top-10 right-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
              </>
            )}
            
            {universe === 'noir' && (
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none"></div>
            )}

            {universe === 'aero' && (
               <div className="absolute top-4 right-4 flex gap-2">
                  <div className="w-8 h-2 bg-white/50 rounded-full"></div>
                  <div className="w-4 h-2 bg-white/30 rounded-full"></div>
               </div>
            )}

            {universe === 'punk' && (
               <div className="absolute top-[-10px] right-[-10px] bg-yellow-400 border-2 border-black px-2 py-1 transform rotate-6 font-black shadow-[2px_2px_0_#000]">
                 RAW!!
               </div>
            )}
            
            {/* LOFI DECO - Washi Tape */}
            {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e0c097]/80 transform -rotate-1 shadow-sm z-20"></div>
            )}

            {/* NEWSPAPER DECO */}
            {universe === 'newspaper' && (
              <div className="absolute top-0 left-0 w-full p-4 border-b-4 border-double border-black flex justify-between items-center bg-[#f4f4f0]">
                 <div className="flex items-center gap-2">
                   <NewspaperIcon size={16}/>
                   <span className="font-serif font-bold text-xs tracking-widest">THE DAILY CODE</span>
                 </div>
                 <span className="font-serif text-[10px] italic">VOL. 12 • NO. 1</span>
              </div>
            )}

            {/* COMIC DECO - CRUNCH */}
            {universe === 'comic' && (
              <>
                <div className="absolute inset-0 manga-speedlines opacity-10 pointer-events-none"></div>
                {/* z-50 to ensure it pops out */}
                <div className="absolute -top-6 -right-6 bg-[#ff0000] text-white p-4 font-black text-2xl rotate-12 shadow-[4px_4px_0_#000] border-[3px] border-black z-50">
                  CRUNCH!!
                </div>
                <div className="absolute bottom-4 right-4 bg-white border-[3px] border-black p-3 rounded-[50%_50%_0_50%] z-20 shadow-[4px_4px_0_#000]">
                   <span className="font-comic text-sm">C++ POWER!</span>
                </div>
              </>
            )}

            {/* Cyberpunk Deco: Caution Tape + Tech Lines */}
            {universe === 'cyberpunk' && (
              <>
               <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-[#00f0ff] rounded-tr-3xl opacity-50 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-full h-6 caution-tape border-t-2 border-black z-10"></div>
              </>
            )}

            {/* Bauhaus Deco Hanging Out */}
            {universe === 'bauhaus' && (
               <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#ffb703] rounded-full border-4 border-black z-20"></div>
            )}

            {/* Botanical Deco */}
            {universe === 'botanical' && (
               <div className="absolute -top-4 -left-4 text-[#3a5a40] transform -rotate-12 z-20">
                 <Leaf size={48} fill="#a3b18a" />
               </div>
            )}

            <div className={`z-10 relative h-full flex flex-col justify-between ${universe === 'newspaper' ? 'pt-12' : ''} ${universe === 'cyberpunk' ? 'pb-8' : ''}`}>
              <div className={universe === 'bauhaus' ? 'max-w-[80%]' : ''}>
                <Cpu size={48} className={`mb-6 transition-colors 
                  ${universe === 'neon' ? 'text-[#3A86FF]' : ''}
                  ${universe === 'retro' ? 'text-[#ff0055]' : ''}
                  ${universe === 'terminal' ? 'text-[#00ff41]' : 'opacity-90'}
                  ${universe === 'newspaper' ? 'text-black' : ''}
                  ${universe === 'aero' ? 'text-blue-600 drop-shadow-sm' : ''}
                  ${universe === 'comic' ? 'text-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]' : ''}
                  ${universe === 'lofi' ? 'text-[#b58900]' : ''}
                  ${universe === 'cyberpunk' ? 'text-black' : ''}
                  ${universe === 'bauhaus' ? 'text-white absolute -left-4 -top-4 w-16 h-16 bg-black p-3 rounded-full border-4 border-white' : ''}
                  ${universe === 'botanical' ? 'text-[#3a5a40] opacity-0' : ''} 
                `} />
                {/* Botanical hides standard icon for custom leaf */}
                <h2 className={`text-4xl md:text-5xl leading-[1.1] mb-6 ${getFontClass('title')}
                  ${universe === 'bauhaus' ? 'mt-8' : ''}
                `}>
                  {universe === 'terminal' ? '> ' : ''}
                  {universe === 'newspaper' && <span className="text-6xl float-left mr-2 font-serif leading-[0.8]">F</span>}
                  {universe === 'newspaper' ? 'orging ultra-low latency ' : 'Forging ultra-low latency '}
                  <br/>
                  <span className={
                    universe === 'punk' ? 'italic bg-[#FEE440] px-1' : 
                    universe === 'retro' ? 'text-[#55ffff]' :
                    universe === 'terminal' ? 'bg-[#00ff41] text-black px-1' :
                    universe === 'newspaper' ? 'italic decoration-4 underline' :
                    universe === 'aero' ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600' :
                    universe === 'comic' ? 'bg-black text-white px-2 skew-x-[-5deg] inline-block' :
                    universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] px-1' :
                    universe === 'bauhaus' ? 'text-[#ffb703] underline decoration-4' :
                    universe === 'botanical' ? 'italic text-[#3a5a40]' :
                    'text-transparent bg-clip-text bg-gradient-to-r from-[#3A86FF] to-[#8338EC]'
                  }>
                    systems with C++.
                  </span>
                  {universe === 'terminal' && <span className="animate-pulse">_</span>}
                </h2>
              </div>
              
              <div className={`space-y-6 ${universe === 'bauhaus' ? 'pl-4 border-l-4 border-white' : ''}`}>
                <p className={`text-lg max-w-md leading-relaxed ${getFontClass('body')}
                  ${universe === 'neon' ? 'text-gray-500' : 'opacity-90'}
                `}>
                  Building the backbone of high-frequency trading. Obsessed with memory models, lock-free structures, and zero-cost abstractions.
                </p>
                <div className="flex gap-4">
                   <button className={`px-8 py-4 font-bold text-sm transition-all flex items-center gap-2
                    ${universe === 'punk' ? 'bg-black text-white shadow-[4px_4px_0px_#fff] hover:-translate-y-1' : ''}
                    ${universe === 'retro' ? 'bg-[#ff0055] text-white border-2 border-white hover:scale-105 rounded-sm text-[10px] shadow-[2px_2px_0px_rgba(255,255,255,0.5)]' : ''}
                    ${universe === 'terminal' ? 'bg-[#00ff41] text-black hover:bg-white rounded-none border border-[#00ff41]' : ''}
                    ${universe === 'newspaper' ? 'border-y-2 border-black bg-white text-black hover:bg-black hover:text-white rounded-none uppercase tracking-widest font-serif' : ''}
                    ${universe === 'aero' ? 'bg-white/50 border border-white/60 text-gray-800 hover:bg-white hover:text-blue-600 rounded-full shadow-lg backdrop-blur-md' : ''}
                    ${universe === 'comic' ? 'bg-white text-black border-[3px] border-black hover:bg-black hover:text-white shadow-[4px_4px_0_#000]' : ''}
                    ${universe === 'lofi' ? 'bg-[#eee8d5] text-[#b58900] border border-[#d3cbb7] rounded-sm' : ''}
                    ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] border-2 border-black hover:bg-[#00f0ff] hover:text-black cyber-clip' : ''}
                    ${universe === 'bauhaus' ? 'bg-[#1d3557] text-white rounded-none hover:bg-[#457b9d] border-2 border-white shadow-none' : ''}
                    ${universe === 'botanical' ? 'bg-[#3a5a40] text-white rounded-xl hover:bg-[#588157]' : ''}
                    ${universe === 'noir' ? 'bg-white text-black hover:bg-gray-200 rounded-full' : ''}
                    ${universe === 'neon' ? 'bg-gray-900 text-white hover:bg-black rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5' : ''}
                   `}>
                    View Projects <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. 音乐 (1x1) */}
          <div className={`${getCardStyle('green')} group`}>
            
            {universe === 'neon' && (
               <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-[#06D6A0] to-white opacity-20 rounded-full blur-xl"></div>
            )}
            
            {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#b9f6ca]/80 transform rotate-2 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className={`p-3 rounded-full transition-colors
                ${universe === 'neon' ? 'bg-white/20 text-white backdrop-blur-md' : ''}
                ${universe === 'punk' ? 'bg-white border-2 border-black' : ''}
                ${universe === 'retro' ? 'bg-white border-2 border-white text-black rounded-sm' : ''}
                ${universe === 'terminal' ? 'border border-[#00ff41] text-[#00ff41] rounded-none' : ''}
                ${universe === 'newspaper' ? 'border border-black bg-white text-black rounded-none' : ''}
                ${universe === 'aero' ? 'bg-white/50 text-blue-900 border border-white/40 shadow-inner' : ''}
                ${universe === 'comic' ? 'bg-white border-[3px] border-black text-black' : ''}
                ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] rounded-none border-none' : ''}
                ${universe === 'bauhaus' ? 'bg-white text-[#457b9d] absolute -right-2 -top-2 w-12 h-12 flex items-center justify-center border-2 border-black' : ''}
                ${universe === 'botanical' ? 'bg-[#a3b18a]/30 text-[#3a5a40]' : ''}
                ${universe === 'noir' ? 'bg-white/10' : ''}
              `}>
                <Disc size={20} className={universe === 'punk' ? 'text-black' : ''} />
              </div>
              
              <div className="flex gap-1 h-6 items-end">
                {[0.4, 0.7, 0.3, 1.0].map((h, i) => (
                  <div key={i} 
                    className={`w-1.5 animate-[music-bar_1s_ease-in-out_infinite]
                      ${universe === 'punk' ? 'bg-black border border-black' : ''}
                      ${universe === 'retro' ? 'bg-[#ff0055]' : ''}
                      ${universe === 'terminal' ? 'bg-[#00ff41]' : ''}
                      ${universe === 'newspaper' ? 'bg-black' : ''}
                      ${universe === 'aero' ? 'bg-blue-500/80 shadow-[0_0_10px_white]' : ''}
                      ${universe === 'comic' ? 'bg-black' : ''}
                      ${universe === 'cyberpunk' ? 'bg-black' : ''}
                      ${universe === 'bauhaus' ? 'bg-white' : ''}
                      ${universe === 'botanical' ? 'bg-[#3a5a40]' : ''}
                      ${universe === 'noir' ? 'bg-green-500' : ''}
                      ${universe === 'neon' ? 'bg-white/80 rounded-full' : ''}
                    `}
                    style={{height: `${h * 100}%`, animationDelay: `${i * 0.1}s`}} 
                  />
                ))}
              </div>
            </div>
            
            {/* Cyberpunk Deco */}
            {universe === 'cyberpunk' && (
               <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-1 gap-1">
                  {[...Array(5)].map((_,i) => <div key={i} className="w-1 h-3 bg-[#fcee0a]"></div>)}
               </div>
            )}

            <div className={`relative z-10 ${universe === 'bauhaus' ? 'pl-8' : ''}`}>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1 opacity-70 ${universe === 'retro' ? 'text-[8px]' : ''}`}>Now Playing</div>
              <h3 className={`text-2xl leading-none mb-1 font-bold ${getFontClass('title')}`}>{USER_CONTENT.nowPlaying.song}</h3>
              <p className="text-sm font-medium opacity-80">{USER_CONTENT.nowPlaying.artist}</p>
            </div>
          </div>

          {/* 3. 归档 (1x1) */}
          <div className={`${getCardStyle('white')} cursor-pointer`}>
            
            {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#ffccbc]/80 transform rotate-2 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-start">
              <div className={universe === 'neon' ? 'text-gray-400' : ''}>
                <Library size={28} strokeWidth={1.5} />
              </div>
              <div className={`text-xs font-bold px-3 py-1.5 transition-colors
                ${universe === 'punk' ? 'bg-black text-white border-2 border-black' : ''}
                ${universe === 'retro' ? 'bg-[#55ffff] text-black border-2 border-white rounded-sm text-[8px]' : ''}
                ${universe === 'terminal' ? 'border border-[#00ff41] text-[#00ff41] rounded-none' : ''}
                ${universe === 'newspaper' ? 'border-b-2 border-black text-black rounded-none italic font-serif' : ''}
                ${universe === 'aero' ? 'bg-white/50 border border-white/60 text-blue-900 rounded-full' : ''}
                ${universe === 'comic' ? 'bg-white border-[3px] border-black text-black shadow-[2px_2px_0_#000]' : ''}
                ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] border-none cyber-clip' : ''}
                ${universe === 'bauhaus' ? 'bg-black text-white rounded-none absolute -top-4 -right-4' : ''}
                ${universe === 'botanical' ? 'bg-[#a3b18a] text-white rounded-lg' : ''}
                ${universe === 'noir' ? 'border border-white/20 rounded text-gray-400' : ''}
                ${universe === 'neon' ? 'bg-gray-100 text-gray-500 rounded-full' : ''}
              `}>
                ARCHIVE
              </div>
            </div>
            
            {universe === 'neon' && (
               <div className="absolute bottom-4 right-4 w-12 h-12 bg-gray-100 rounded-full blur-xl opacity-50"></div>
            )}

            <div className={universe === 'bauhaus' ? 'mt-8' : ''}>
              <div className={`text-6xl font-black mb-0 tracking-tighter ${getFontClass('title')}`}>{USER_CONTENT.stats.posts}</div>
              <div className="text-sm font-bold uppercase tracking-widest opacity-40">Posts</div>
            </div>
          </div>

          {/* 4. 技术文章 (2x1) */}
          <div className={`${getCardStyle(universe === 'punk' ? 'white' : 'white', "md:col-span-2")}`}>
            
            {universe === 'neon' && (
               <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-60"></div>
            )}
            
            {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-40 h-8 bg-[#e1bee7]/80 transform -rotate-1 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-center mb-4 relative z-10">
               <div className="flex items-center gap-2">
                 <div className={`p-1.5 rounded-lg transition-colors
                   ${universe === 'punk' ? 'bg-[#00BBF9] border border-black text-white' : ''}
                   ${universe === 'retro' ? 'bg-[#ff0055] text-white rounded-sm border-2 border-white' : ''}
                   ${universe === 'terminal' ? 'bg-[#00ff41]/20 text-[#00ff41] rounded-none border border-[#00ff41]' : ''}
                   ${universe === 'newspaper' ? 'bg-black text-white rounded-none' : ''}
                   ${universe === 'aero' ? 'bg-white/50 text-blue-700 shadow-md' : ''}
                   ${universe === 'comic' ? 'bg-black text-white rounded-none border-2 border-black' : ''}
                   ${universe === 'cyberpunk' ? 'bg-[#00f0ff] text-black border-none rounded-none' : ''}
                   ${universe === 'bauhaus' ? 'bg-[#ffb703] text-black rounded-none border-2 border-black' : ''}
                   ${universe === 'botanical' ? 'bg-[#3a5a40] text-white rounded-lg' : ''}
                   ${universe === 'neon' ? 'bg-[#3A86FF]/10 text-[#3A86FF]' : ''}
                   ${universe === 'noir' ? 'bg-blue-500/20 text-blue-400' : ''}
                 `}>
                    <Terminal size={16} />
                 </div>
                 <span className="text-xs font-bold uppercase tracking-wider opacity-60">{USER_CONTENT.featuredArticle.category}</span>
               </div>
               <span className={`text-xs font-bold ${universe === 'punk' ? 'font-code' : 'opacity-40'} ${universe === 'retro' ? 'text-[8px]' : ''}`}>{USER_CONTENT.featuredArticle.date}</span>
            </div>
            <div className="group-hover:translate-x-1 transition-transform duration-300 relative z-10">
              <h3 className={`text-2xl md:text-3xl font-bold mb-3 leading-tight ${getFontClass('title')}
                 ${universe === 'punk' ? 'decoration-2 underline-offset-4 group-hover:underline' : ''}
                 ${universe === 'newspaper' ? 'italic' : ''}
                 ${universe === 'comic' ? 'uppercase italic' : ''}
                 ${universe === 'neon' ? 'text-gray-900 group-hover:text-[#3A86FF] transition-colors' : ''}
              `}>
                {universe === 'newspaper' && <span className="bg-black text-white text-xs px-1 mr-2 not-italic align-middle">EXCLUSIVE</span>}
                {USER_CONTENT.featuredArticle.title}
              </h3>
              <p className={`text-base font-medium line-clamp-2 leading-relaxed opacity-60 ${getFontClass('body')}`}>
                {USER_CONTENT.featuredArticle.desc}
              </p>
            </div>
          </div>

          {/* 5. 艺术/画画 (1x2) */}
          <div className={`md:row-span-2 relative group overflow-hidden
             ${universe === 'punk' 
                ? 'bg-white border-2 border-black p-3 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-rotate-1 transition-all' 
                : universe === 'retro' 
                ? 'bg-[#202028] border-2 border-white/20 p-2' 
                : universe === 'terminal'
                ? 'border border-[#00ff41]/30 bg-black p-2 rounded-none'
                : universe === 'newspaper'
                ? 'border border-black p-2 bg-white rounded-none'
                : universe === 'comic'
                ? 'border-[3px] border-black bg-white p-2 rounded-sm grayscale contrast-125'
                : universe === 'aero'
                ? 'rounded-[2rem] border border-white/50 bg-white/30 backdrop-blur-xl shadow-xl'
                : universe === 'cyberpunk'
                ? 'border border-[#fcee0a] bg-black p-1 rounded-none cyber-clip'
                : universe === 'bauhaus'
                ? 'p-3 bg-white border-2 border-black rounded-none'
                : universe === 'botanical'
                ? 'p-2 bg-[#f0ead6] border border-[#a3b18a] rounded-xl'
                : universe === 'lofi'
                ? 'bg-[#fdf6e3] shadow-md p-3 pb-8 rounded-none border border-[#eee8d5]' // Polaroid style base
                : 'rounded-[2.5rem]'}
          `}>
             <div className={`w-full h-full relative overflow-hidden 
                ${universe === 'punk' ? 'h-[80%] border border-black grayscale group-hover:grayscale-0 transition-all duration-700' : ''}
                ${universe === 'retro' ? 'border-2 border-white/20 contrast-125' : ''}
                ${universe === 'terminal' ? 'border border-[#00ff41]/30 grayscale contrast-150 brightness-75 bg-green-900/20 mix-blend-screen' : ''}
                ${universe === 'comic' ? 'border-2 border-black grayscale contrast-150 brightness-110' : ''}
                ${universe === 'newspaper' ? 'grayscale contrast-125' : ''}
                ${universe === 'cyberpunk' ? 'grayscale sepia contrast-125 cyber-clip' : ''}
                ${universe === 'bauhaus' ? 'grayscale contrast-110 rounded-full border-4 border-white' : ''}
                ${universe === 'botanical' ? 'rounded-lg sepia-[.3]' : ''}
                ${universe === 'lofi' ? 'h-[85%] border border-gray-200' : ''}
             `}>
                <div className={`absolute inset-0 bg-[#2d1b4e] ${universe === 'retro' ? '' : 'hidden'}`}></div>
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80" 
                  alt="Digital Art" 
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105
                    ${universe === 'noir' ? 'opacity-70 group-hover:opacity-100' : ''}
                    ${universe === 'retro' ? 'image-pixelated mix-blend-overlay' : ''}
                    ${universe === 'comic' ? 'halftone' : ''}
                    ${universe === 'terminal' ? 'opacity-80 sepia-100 hue-rotate-[90deg] saturate-[300%] contrast-150' : ''} 
                  `}
                  style={universe === 'retro' ? {imageRendering: 'pixelated'} : {}}
                />
                
                {universe !== 'punk' && universe !== 'lofi' && (
                  <div className={`absolute inset-0 flex flex-col justify-end p-8
                    ${universe === 'terminal' ? 'bg-gradient-to-t from-black via-black/80 to-transparent' : 
                      universe === 'newspaper' ? 'bg-white/90 text-black' :
                      universe === 'comic' ? 'bg-white/80 text-black' :
                      universe === 'cyberpunk' ? 'bg-black/60' :
                      'bg-gradient-to-t from-black/80 via-transparent to-transparent'}
                  `}>
                    <div className={`flex items-center gap-2 mb-2 ${universe === 'newspaper' || universe === 'comic' ? 'text-black' : 'text-white/90'}`}>
                      <PenTool size={16} className={universe === 'terminal' ? 'text-[#00ff41]' : universe === 'cyberpunk' ? 'text-[#fcee0a]' : ''} />
                      <span className={`text-xs font-bold tracking-widest uppercase 
                        ${universe === 'terminal' ? 'text-[#00ff41]' : 
                          universe === 'cyberpunk' ? 'text-[#fcee0a]' :
                          ''}
                      `}>Wacom / Procreate</span>
                    </div>
                    <h3 className={`text-2xl font-serif italic 
                      ${universe === 'terminal' ? 'text-[#00ff41] font-mono not-italic' : 
                        universe === 'newspaper' ? 'text-black font-academic not-italic font-bold' :
                        universe === 'comic' ? 'text-black font-comic not-italic text-3xl' :
                        universe === 'cyberpunk' ? 'text-[#fcee0a] font-cyber not-italic' :
                        'text-white'}
                    `}>"Neon Dreams"</h3>
                  </div>
                )}
             </div>
             
             {/* Lofi Polaroid Text */}
             {universe === 'lofi' && (
                <div className="absolute bottom-2 left-0 w-full text-center font-hand text-gray-500 text-sm">
                  Neon Dreams, 2024
                </div>
             )}
             
             {universe === 'punk' && (
               <div className="h-[20%] flex flex-col justify-center items-center">
                  <p className="font-academic text-2xl italic text-black">Digital Art</p>
               </div>
             )}
          </div>

          {/* 6. 阅读/Piano (1x1) */}
          <div className={`${getCardStyle('yellow')}`}>
            
            {universe === 'neon' && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl"></div>
            )}
            
            {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#ffecb3]/80 transform rotate-1 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-start relative z-10">
              <div className={`p-2 rounded-lg 
                ${universe === 'neon' ? 'bg-black/10 text-[#4A3B00]' : ''} 
                ${universe === 'noir' ? 'opacity-50' : ''}
                ${universe === 'retro' ? 'border-2 border-white text-white bg-[#55ffff] rounded-sm text-black' : ''}
                ${universe === 'newspaper' ? 'border border-black rounded-none' : ''}
                ${universe === 'comic' ? 'bg-black text-white' : ''}
                ${universe === 'cyberpunk' ? 'bg-[#ff003c] text-white rounded-none' : ''}
                ${universe === 'bauhaus' ? 'bg-white text-black border-2 border-black' : ''}
                ${universe === 'botanical' ? 'bg-[#3a5a40]/10 text-[#3a5a40]' : ''}
                ${universe === 'aero' ? 'bg-white/50 text-blue-900' : ''}
              `}>
                <Piano size={24} />
              </div>
              <span className={`text-[10px] font-black uppercase 
                ${universe === 'punk' ? 'border-b-2 border-black' : 'opacity-40'}
              `}>Hobby</span>
            </div>
            <div className="mt-4 relative z-10">
              <h3 className={`font-bold text-xl leading-none mb-1 ${getFontClass('title')}`}>{USER_CONTENT.hobbies.music.composer}</h3>
              <p className="text-xs font-bold uppercase opacity-60 mb-4">{USER_CONTENT.hobbies.music.piece}</p>
              
              <div className="flex gap-0.5 h-6 opacity-60">
                 {[...Array(8)].map((_, i) => (
                    <div key={i} className={`flex-1 rounded-sm ${i % 2 === 0 ? 'bg-current' : 'bg-current/40'} ${['retro', 'terminal', 'newspaper', 'comic', 'cyberpunk', 'bauhaus'].includes(universe) ? 'rounded-none' : ''}`}></div>
                 ))}
              </div>
            </div>
          </div>

          {/* 7. 引言 (1x1) */}
          <div className={`${getCardStyle('blue')} !justify-center text-center relative overflow-hidden`}>
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
              <p className={`font-bold italic text-xl leading-tight drop-shadow-sm ${getFontClass('title')} ${['terminal'].includes(universe) ? 'not-italic font-mono' : ''}`}>
                "Simplicity is the ultimate sophistication."
              </p>
            </div>
          </div>

          {/* 8. 生活/游戏 (2x1) */}
          <div className={`${getCardStyle(universe === 'punk' ? 'pink' : 'pink', "md:col-span-2")}`}>
            
            {universe === 'comic' && (
               <div className="absolute top-2 right-2 rotate-12 z-20">
                 <div className="bg-[#ffcc00] border-[3px] border-black px-2 py-1 font-black text-sm shadow-[2px_2px_0_#000]">SMASH!</div>
               </div>
            )}
            
            {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#b2dfdb]/80 transform -rotate-2 shadow-sm z-20"></div>
            )}

            <div className="flex justify-between items-start mb-4 relative z-10">
               <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors
                 ${universe === 'punk' ? 'border border-white bg-white/20 rounded' : ''}
                 ${universe === 'neon' ? 'bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-sm' : ''}
                 ${universe === 'retro' ? 'border-2 border-white bg-[#55ffff] text-black rounded-sm' : ''}
                 ${universe === 'terminal' ? 'border border-[#00ff41] text-[#00ff41] rounded-none' : ''}
                 ${universe === 'newspaper' ? 'border border-black bg-white text-black rounded-none' : ''}
                 ${universe === 'comic' ? 'bg-black text-white rounded-none border-2 border-black' : ''}
                 ${universe === 'aero' ? 'bg-white/50 text-blue-900 border border-white/50' : ''}
                 ${universe === 'cyberpunk' ? 'bg-[#00f0ff] text-black border-none rounded-none' : ''}
                 ${universe === 'bauhaus' ? 'bg-white text-[#1d3557] rounded-full' : ''}
                 ${universe === 'botanical' ? 'bg-[#3a5a40]/10 text-[#3a5a40] rounded-lg' : ''}
                 ${universe === 'noir' ? 'bg-white/10 text-gray-400' : ''}
               `}>
                 <Gamepad2 size={14} /> Gaming
               </span>
               <ArrowUpRight size={24} className="hover:rotate-45 transition-transform opacity-60"/>
            </div>
            
            {/* Main Content for this card... */}
            <div className={`flex items-end justify-between relative z-10 ${universe === 'bauhaus' ? 'pr-12' : ''}`}>
              <div className="max-w-[75%]">
                <h3 className={`text-2xl font-bold mb-2 ${getFontClass('title')}`}>{USER_CONTENT.hobbies.game.title}</h3>
                <p className={`text-sm font-medium opacity-90 line-clamp-2 ${getFontClass('body')}`}>
                  {USER_CONTENT.hobbies.game.desc}
                </p>
              </div>
              <div className="text-4xl font-black opacity-20 italic">{USER_CONTENT.hobbies.game.console}</div>
            </div>
            
            {/* Lofi Coffee Cup on the desk (card) - Enhanced Animation & Position */}
            {universe === 'lofi' && (
                <div className="absolute -bottom-2 -right-2 text-[#795548] opacity-90 rotate-12 transform scale-110 z-20">
                   <div className="relative">
                     <CoffeeIcon size={56} strokeWidth={1.5} />
                     <div className="absolute -top-4 left-3 w-1.5 h-4 bg-[#795548]/30 rounded-full animate-bounce" style={{animationDuration: '2s'}}></div>
                     <div className="absolute -top-6 left-6 w-1.5 h-5 bg-[#795548]/30 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '2.5s'}}></div>
                     <div className="absolute -top-4 left-9 w-1.5 h-4 bg-[#795548]/30 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '2.2s'}}></div>
                   </div>
                </div>
            )}
          </div>
           
           {/* 9. Twitter (1x1) */}
           <div className={`${getCardStyle(universe === 'punk' ? 'white' : 'white')}`}>
             {universe === 'bauhaus' && (
                <div className="absolute top-0 left-0 w-8 h-8 bg-black z-0"></div>
             )}
             
             {universe === 'neon' && (
                <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent opacity-50"></div>
             )}
             
             {universe === 'lofi' && (
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#cfd8dc]/80 transform rotate-2 shadow-sm z-20"></div>
            )}

             <div className="flex justify-between w-full mb-4 relative z-10">
                <div className={universe === 'neon' ? getTagStyle('blue') + ' p-2 rounded-full' : ''}>
                  <Twitter size={24} className={universe === 'punk' ? 'text-[#00BBF9] fill-[#00BBF9]' : ''} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded
                  ${universe === 'punk' ? 'bg-black text-white' : 'bg-black/5 text-black/50'}
                  ${universe === 'retro' ? 'bg-[#ff0055] text-white rounded-sm' : ''}
                  ${universe === 'terminal' ? 'bg-[#00ff41] text-black rounded-none' : ''}
                  ${universe === 'newspaper' ? 'bg-black text-white rounded-none' : ''}
                  ${universe === 'comic' ? 'bg-black text-white border-2 border-black' : ''}
                  ${universe === 'aero' ? 'bg-white/50 text-blue-800 shadow-sm' : ''}
                  ${universe === 'cyberpunk' ? 'bg-black text-[#fcee0a] border border-[#fcee0a] rounded-none cyber-clip' : ''}
                  ${universe === 'bauhaus' ? 'bg-[#1d3557] text-white rounded-none border-2 border-black' : ''}
                  ${universe === 'botanical' ? 'bg-[#3a5a40] text-white rounded-lg' : ''}
                  ${universe === 'noir' ? 'bg-white/10 text-white/50' : ''}
                `}>LATEST</span>
             </div>
             
             {/* Cyberpunk Deco: Wifi/Battery */}
             {universe === 'cyberpunk' && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                   <Wifi size={12} className="text-[#fcee0a] opacity-50" />
                   <Battery size={12} className="text-[#fcee0a] opacity-50" />
                </div>
             )}

             <div className="relative z-10">
               <p className={`text-sm font-bold leading-snug ${getFontClass('body')}`}>
                 Debugging template meta-programming errors is my cardio. 🏃‍♂️
               </p>
               <p className="text-xs font-code mt-3 opacity-50">{USER_CONTENT.social.twitter}</p>
             </div>
           </div>

        </div>

        {/* Footer */}
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
            <a href="#" className="hover:opacity-50 transition-opacity">RSS</a>
            <a href="#" className="hover:opacity-50 transition-opacity">Email</a>
            <a href="#" className="hover:opacity-50 transition-opacity">Twitter</a>
          </div>
        </footer>

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

export default BlogHome;