import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Clock, Tag, Share2, MessageCircle, 
  Terminal, Monitor, Zap, Palette, Ghost, Hash, FileText, 
  Cloud, Book, Coffee as CoffeeIcon, Activity, Triangle, Leaf, Grid3X3, X,
  Newspaper as NewspaperIcon, Sprout, Cpu, Wifi, Battery, Play, Disc, Minus, Maximize2
} from 'lucide-react';

// --- 🔧 模拟博客文章数据 ---
const POST_DATA = {
  title: "深入理解 C++ 内存模型：为什么 volatile 救不了你的锁无关队列？",
  date: "2024.03.15",
  readTime: "8 min read",
  tags: ["C++", "Concurrency", "Low Latency"],
  content: `
    <p>在构建高频交易系统时，我们对延迟的容忍度是以纳秒计算的。这就是为什么我们痴迷于 <strong>Lock-free (无锁)</strong> 数据结构。</p>
    
    <h3>误区：Volatile 的陷阱</h3>
    <p>很多从 Java 或 C# 转过来的开发者习惯用 <code>volatile</code> 来处理线程间通信。但在 C++ 中，<code>volatile</code> 并不保证原子性，也不保证内存可见性顺序。它只告诉编译器：不要优化对这个变量的读写。</p>

    <blockquote>
      "C++ 中的 volatile 和 Java 中的 volatile 完全是两码事。如果你想做线程同步，请使用 std::atomic。"
    </blockquote>

    <h3>Memory Order (内存序)</h3>
    <p>要正确实现一个 SPSC (单生产者单消费者) 队列，我们需要理解 <code>std::memory_order_acquire</code> 和 <code>std::memory_order_release</code>。</p>

    <pre><code>// 错误的实现
bool push(const T& val) {
    if (tail_ - head_ >= size_) return false;
    buffer_[tail_ % size_] = val;
    tail_++; // 这里的写操作可能会被乱序
    return true;
}</code></pre>

    <p>正确的做法是建立 happens-before 关系，确保消费者看到数据时，数据已经完全写入了环形缓冲区。这一原则在多核处理器架构下尤为重要，因为缓存一致性协议（如 MESI）并不保证指令执行的顺序。</p>
    
    <p>当我们谈论无锁编程时，不仅仅是避免 mutex，更多的是关于理解硬件如何处理并发读写。</p>
  `
};

// --- 背景组件 ---
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

const BlogPost = () => {
  const [universe, setUniverse] = useState('neon');
  const [showPortal, setShowPortal] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const scroll = totalScroll / windowHeight;
        setScrollProgress(Number(scroll));
      }
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- 样式配置工厂 ---

  // 1. 全局背景与字体
  const getContainerStyle = () => {
    switch (universe) {
      case 'noir': return "bg-[#050505] text-gray-300 font-sans selection:bg-white selection:text-black";
      case 'punk': return "bg-[#F7E018] text-black font-serif selection:bg-black selection:text-white"; 
      case 'retro': return "bg-[#202028] text-[#e0e0e0] font-pixel selection:bg-[#ff0055] selection:text-white relative"; 
      case 'terminal': return "bg-black text-[#33ff00] font-mono selection:bg-[#33ff00] selection:text-black"; 
      case 'newspaper': return "bg-[#f0f0eb] text-[#111] font-serif selection:bg-black selection:text-white"; // 稍微灰一点的纸色
      case 'aero': return "text-gray-900 font-sans selection:bg-blue-500/30 selection:text-blue-900"; 
      case 'comic': return "bg-[#eee] text-black font-comic selection:bg-black selection:text-white"; // Background has halftone, not article
      case 'lofi': return "bg-[#fdf6e3] text-[#586e75] font-hand selection:bg-[#eee8d5] selection:text-[#b58900]";
      case 'cyberpunk': return "bg-[#050a0e] text-[#fcee0a] font-cyber selection:bg-[#fcee0a] selection:text-black";
      case 'bauhaus': return "bg-[#f4f1ea] text-[#1d3557] font-geo selection:bg-[#e63946] selection:text-white";
      case 'botanical': return "bg-[#dad7cd] text-[#344e41] font-serif selection:bg-[#3a5a40] selection:text-white";
      case 'neon': default: return "bg-[#F4F5F7] text-gray-900 font-sans selection:bg-[#3A86FF]/20 selection:text-[#3A86FF]";
    }
  };

  // 2. 文章容器样式 (纸张/屏幕)
  const getArticleContainerStyle = () => {
    const base = "max-w-3xl mx-auto transition-all duration-500 relative";
    
    switch (universe) {
      case 'neon': return `${base} bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] border border-white/50`;
      case 'noir': return `${base} bg-[#111] rounded-none p-8 md:p-12 border-x border-white/10`;
      case 'aero': return `${base} bg-white/40 backdrop-blur-[60px] border border-white/40 p-8 md:p-12 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]`;
      // NEWSPAPER: Removed side borders, added classic padding
      case 'newspaper': return `${base} bg-transparent px-4 md:px-0`; 
      // TERMINAL: Full border box
      case 'terminal': return `${base} bg-black p-6 md:p-10 border-2 border-[#33ff00] shadow-[0_0_20px_rgba(0,255,0,0.15)]`;
      case 'retro': return `${base} bg-[#2d2a2e] border-4 border-white/20 p-6 md:p-8 rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,0.5)]`;
      case 'punk': return `${base} bg-white border-[3px] border-black p-8 md:p-12 shadow-[12px_12px_0px_#000] rotate-1`;
      // COMIC: Solid white background, removing halftone from here
      case 'comic': return `${base} bg-white border-[4px] border-black p-8 md:p-12 shadow-[12px_12px_0px_#000] z-10`;
      case 'lofi': return `${base} bg-[#fffbf0] shadow-sm border border-[#eee8d5] p-8 md:p-12 rounded-sm rotate-[-0.5deg] mt-8`;
      case 'cyberpunk': return `${base} bg-black/90 border-x-2 border-[#fcee0a] p-8 md:p-12 cyber-clip relative`;
      case 'bauhaus': return `${base} bg-white border-[3px] border-black p-8 md:p-16 shadow-[16px_16px_0_#e63946]`;
      case 'botanical': return `${base} bg-[#f0ead6] border border-[#a3b18a] p-10 md:p-16 rounded-xl shadow-md`;
      default: return base;
    }
  };

  // 3. 排版细节样式 (Prose)
  const getTypographyStyle = () => {
    switch (universe) {
      case 'newspaper': 
        return { 
          h1: "text-5xl md:text-7xl font-bold mb-8 text-black tracking-tight leading-none text-center font-serif",
          h3: "text-2xl font-bold mt-8 mb-2 text-black uppercase border-b border-black pb-1 inline-block font-sans",
          // Newspaper two columns
          p: "text-lg md:text-xl leading-relaxed text-[#111] mb-6 font-serif text-justify md:columns-2 md:gap-8",
          quote: "font-sans font-bold text-2xl text-black border-y-4 border-double border-black py-6 my-10 text-center italic w-full inline-block",
          code: "bg-gray-200 px-1 text-sm font-mono",
          pre: "bg-gray-100 border border-black p-4 my-6 text-sm font-mono w-full inline-block"
        };
      case 'comic':
        return {
           h1: "text-6xl md:text-7xl font-comic tracking-wider mb-8 text-black drop-shadow-[4px_4px_0_#000] -rotate-2",
           h3: "text-3xl font-comic mt-8 mb-4 text-black uppercase decoration-wavy underline decoration-4 decoration-black",
           p: "text-xl leading-normal text-black mb-6 font-comic",
           quote: "bg-white border-[3px] border-black p-6 my-8 rounded-[40%] shadow-[6px_6px_0_#000] text-center font-black relative after:content-[''] after:absolute after:bottom-[-20px] after:right-[30%] after:border-l-[20px] after:border-l-transparent after:border-r-[0px] after:border-r-transparent after:border-t-[20px] after:border-t-black", 
           code: "bg-black text-white px-1 font-bold transform skew-x-[-10deg] inline-block",
           pre: "border-[3px] border-black bg-gray-100 p-4 my-6 shadow-[6px_6px_0_#000]"
        };
      case 'terminal': 
        return { 
          h1: "text-3xl md:text-4xl font-bold mb-6 text-[#33ff00] uppercase tracking-widest border-b-2 border-[#33ff00] pb-4 border-dashed",
          h3: "text-xl font-bold mt-8 mb-4 text-[#33ff00] before:content-['>_'] before:mr-2",
          p: "text-base leading-loose text-[#33ff00] mb-6 font-mono",
          quote: "border-l-4 border-[#33ff00] pl-4 text-[#33ff00] my-6 italic",
          code: "text-black bg-[#33ff00] px-1",
          pre: "border border-[#33ff00] bg-[#001100] p-4 my-6 text-xs"
        };
      // ... (Keep other styles mostly same, just slight refinement)
      case 'neon': 
        return { 
          h1: "text-4xl md:text-5xl font-bold tracking-tight mb-6 text-gray-900",
          h3: "text-2xl font-bold mt-8 mb-4 text-gray-800",
          p: "text-lg leading-relaxed text-gray-600 mb-6",
          quote: "border-l-4 border-[#3A86FF] pl-4 italic text-gray-500 my-8 bg-blue-50/50 py-4 pr-4 rounded-r-lg",
          code: "bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-sm font-mono",
          pre: "bg-[#1e1e1e] text-gray-200 p-4 rounded-xl overflow-x-auto text-sm my-6 font-mono shadow-inner"
        };
      default: return { 
          h1: "text-4xl md:text-5xl font-bold tracking-tight mb-6",
          h3: "text-2xl font-bold mt-8 mb-4",
          p: "text-lg leading-relaxed mb-6 opacity-90",
          quote: "border-l-4 border-current pl-4 italic opacity-80 my-8",
          code: "bg-current/10 px-1 rounded text-sm font-mono",
          pre: "bg-black/5 p-4 rounded-lg overflow-x-auto text-sm my-6 font-mono"
        };
    }
  };

  const typo = getTypographyStyle();

  const getProgressBarStyle = () => {
    switch (universe) {
      case 'neon': return "bg-gradient-to-r from-[#3A86FF] to-[#EF476F]";
      case 'cyberpunk': return "bg-[#fcee0a] shadow-[0_0_10px_#fcee0a]";
      case 'terminal': return "bg-[#00ff41] shadow-[0_0_5px_#00ff41]";
      case 'retro': return "bg-[#ff0055]";
      case 'bauhaus': return "bg-[#e63946]";
      case 'botanical': return "bg-[#3a5a40]";
      case 'newspaper': return "bg-black";
      case 'aero': return "bg-blue-500/50 backdrop-blur-md";
      case 'punk': return "bg-black";
      default: return "bg-gray-900";
    }
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
    <div className={`min-h-screen transition-all duration-700 ${getContainerStyle()} relative z-0`}>
      
      {/* 字体注入 */}
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
          
          .text-shadow-glow { text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
          .comic-halftone {
            background-image: radial-gradient(#000 1px, transparent 1px);
            background-size: 6px 6px;
            background-color: #fff;
          }
          .cyber-clip { clip-path: polygon(0 0, 100% 0, 100% 95%, 95% 100%, 0 100%); }
          .caution-tape { background: repeating-linear-gradient(45deg, #fcee0a, #fcee0a 10px, #000 10px, #000 20px); }
          
          /* Terminal Overlay */
          .terminal-scanlines {
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 2px, 3px 100%;
          }
          
          /* Lofi Grain */
          .film-grain { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E"); }
        `}
      </style>

      {/* --- BACKGROUNDS --- */}
      {universe === 'aero' && <AeroBackground />}
      {universe === 'bauhaus' && <BauhausBackground />}
      {universe === 'botanical' && <BotanicalBackground />}
      {universe === 'newspaper' && <div className="fixed inset-0 pointer-events-none opacity-20 mix-blend-multiply" style={{backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")`}}></div>}
      {universe === 'terminal' && <div className="fixed inset-0 pointer-events-none z-50 opacity-20 terminal-scanlines pointer-events-none"></div>}
      {universe === 'lofi' && <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply film-grain"></div>}
      {/* Comic Halftone Background ONLY */}
      {universe === 'comic' && (
         <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0 comic-halftone"></div>
      )}

      {/* --- SCROLL PROGRESS BAR --- */}
      <div className="fixed top-0 left-0 w-full h-1.5 z-[60]">
        <div 
          className={`h-full transition-all duration-100 ease-out ${getProgressBarStyle()}`} 
          style={{ width: `${scrollProgress * 100}%` }}
        ></div>
      </div>

      {/* --- NAVIGATION & SWITCHER --- */}
      <nav className={`fixed top-0 w-full p-6 flex justify-between items-center z-50 transition-all duration-500
        ${scrollProgress > 0.05 ? 'backdrop-blur-md bg-opacity-80' : ''}
        ${universe === 'terminal' ? 'bg-black/80 text-[#33ff00] border-b border-[#33ff00]' : ''}
        ${universe === 'neon' ? 'bg-white/70' : ''}
        ${universe === 'newspaper' ? 'bg-[#f4f4f0] border-b-4 border-double border-black' : ''}
        ${universe === 'cyberpunk' ? 'bg-black/90 border-b border-[#fcee0a]' : ''}
      `}>
        <a href="#" className={`flex items-center gap-2 font-bold ${universe === 'retro' ? 'font-pixel text-xs' : ''}`}>
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </a>

        <button 
          onClick={() => setShowPortal(true)}
          className={`px-4 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105 flex items-center gap-2 text-xs uppercase tracking-widest
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
          <Grid3X3 size={16} />
          <span>Universe</span>
        </button>
      </nav>

      {/* --- PORTAL MODAL --- */}
      {showPortal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-sans">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowPortal(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-5xl h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">CHOOSE YOUR FIGHTER</h2>
                <p className="text-sm text-gray-500">Select a reality for reading.</p>
              </div>
              <button onClick={() => setShowPortal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {/* Reusing cards logic for brevity - keeping 12 core styles */}
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

      {/* --- MAIN BLOG CONTENT --- */}
      <main className="pt-32 pb-20 px-4 md:px-8 relative z-10">
        
        {/* Cyberpunk Decorative Sidebars */}
        {universe === 'cyberpunk' && (
           <>
            <div className="fixed left-6 top-1/3 w-1 h-32 bg-[#fcee0a] hidden md:block"></div>
            <div className="fixed right-6 top-1/3 w-1 h-32 bg-[#fcee0a] hidden md:block"></div>
            <div className="fixed left-6 bottom-1/3 text-[#00f0ff] font-mono text-xs rotate-90 origin-bottom-left hidden md:block">SYS.MONITORING</div>
           </>
        )}

        <article className={getArticleContainerStyle()}>
          
          {/* Lofi Tape - Applied on Article Container */}
          {universe === 'lofi' && (
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e0c097]/90 transform -rotate-1 shadow-sm z-20 backdrop-blur-sm border-l border-r border-white/20"></div>
          )}

          {/* Terminal Decor */}
          {universe === 'terminal' && (
             <div className="absolute top-0 left-0 w-full border-b border-[#33ff00] p-2 mb-4 bg-[#001100] text-xs font-mono flex justify-between">
                <span>[ TERMINAL / main.cpp ]</span>
                <span>-- INSERT --</span>
             </div>
          )}

          {/* Newspaper Decor Header */}
          {universe === 'newspaper' && (
            <div className="text-center border-b-4 border-double border-black pb-6 mb-8">
              <div className="text-sm font-sans font-bold tracking-[0.2em] mb-2">THE DAILY DEV LOG</div>
              <div className="text-xs font-serif italic flex justify-between border-t border-black pt-1 mt-1">
                 <span>VOL. 12</span>
                 <span>{POST_DATA.date}</span>
                 <span>No. 0086</span>
              </div>
            </div>
          )}

          {/* Comic Visuals */}
          {universe === 'comic' && (
            <>
               <div className="absolute -top-4 -right-4 w-12 h-12 bg-black rounded-full z-0"></div>
               <div className="absolute top-[-20px] left-[-10px] transform -rotate-6 bg-white border-2 border-black px-4 py-2 font-black shadow-[4px_4px_0_#000] z-20">
                  POW!
               </div>
            </>
          )}

          {/* Header Section */}
          <header className={`mb-12 ${universe === 'newspaper' ? '' : 'border-b border-current/10 pb-8'}`}>
            <div className="flex flex-wrap gap-3 mb-6">
              {POST_DATA.tags.map(tag => (
                <span key={tag} className={`
                  px-3 py-1 text-xs font-bold uppercase tracking-wider
                  ${universe === 'retro' ? 'border border-current' : 
                    universe === 'terminal' ? 'bg-[#33ff00] text-black' :
                    universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black skew-x-[-10deg]' :
                    universe === 'newspaper' ? 'border border-black bg-white text-black' :
                    'bg-current/10 text-current rounded-full'}
                `}>
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className={typo.h1}>
              {POST_DATA.title}
            </h1>

            <div className="flex items-center gap-6 text-sm opacity-60 font-medium">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{POST_DATA.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{POST_DATA.readTime}</span>
              </div>
            </div>
          </header>

          {/* Content Body */}
          <div className={`prose max-w-none ${universe === 'retro' ? 'font-pixel' : ''}`}>
             <div dangerouslySetInnerHTML={{ __html: POST_DATA.content }} 
                  className="[&>p]:mb-6 [&>h3]:mt-10 [&>h3]:mb-4 [&>blockquote]:my-8 [&>pre]:my-8"
                  style={{
                    '--h3-class': typo.h3,
                  }}
             />
             
             {/* Dynamic styles injection for HTML content */}
             <style>{`
                .prose h3 { ${typo.h3.split(' ').map(c => `@apply ${c};`).join(' ')} }
                .prose p { ${typo.p.split(' ').map(c => `@apply ${c};`).join(' ')} }
                .prose blockquote { ${typo.quote.split(' ').map(c => `@apply ${c};`).join(' ')} }
                .prose code { ${typo.code.split(' ').map(c => `@apply ${c};`).join(' ')} }
                .prose pre { ${typo.pre.split(' ').map(c => `@apply ${c};`).join(' ')} }
             `}</style>
          </div>

          {/* Cyberpunk Caution Tape Footer */}
          {universe === 'cyberpunk' && (
             <div className="h-4 w-full mt-12 caution-tape border-y border-[#fcee0a]"></div>
          )}

          {/* Share / Footer */}
          <div className="mt-16 pt-8 border-t border-current/10 flex justify-between items-center opacity-70">
            <div className="text-sm font-bold">
              Written by Weiran Huang
            </div>
            <div className="flex gap-4">
              <button className="hover:text-current/50 transition-colors"><Share2 size={20} /></button>
              <button className="hover:text-current/50 transition-colors"><MessageCircle size={20} /></button>
            </div>
          </div>

        </article>
      </main>

    </div>
  );
};

export default BlogPost;