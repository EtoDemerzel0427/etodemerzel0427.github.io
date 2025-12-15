import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/atom-one-dark-reasonable.css';
import {
    ArrowLeft, Calendar, Clock, Share2, MessageCircle
} from 'lucide-react';
import { useStore } from '@nanostores/react';
import { universe as universeStore } from '../../stores/universeStore';
import { getFontClass } from '../../utils/theme';
import DisqusComments from '../DisqusComments';
import BackNavigation from '../BackNavigation';

const BlogPost = ({ post }) => {
    const universe = useStore(universeStore);
    const [scrollProgress, setScrollProgress] = useState(0);

    // Destructure post data
    const { title, date, readTime, tags, content, slug } = post;

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

    // 2. 文章容器样式 (纸张/屏幕)
    const getArticleContainerStyle = () => {
        const base = "max-w-5xl mx-auto transition-all duration-500 relative";

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
                    h1: "text-5xl md:text-7xl font-bold mb-8 text-black tracking-tight leading-none text-center font-serif [column-span:all]",
                    h3: "text-2xl font-bold mt-8 mb-2 text-black uppercase border-b border-black pb-1 inline-block font-sans w-full",
                    // Newspaper two columns
                    p: "text-lg md:text-xl leading-relaxed text-[#111] mb-6 font-serif text-justify",
                    quote: "font-sans font-bold text-xl text-black border-l-4 border-black pl-4 py-2 my-6 italic text-left",
                    code: "bg-gray-200 px-1 text-sm font-mono break-words",
                    pre: "bg-gray-100 border border-black p-4 my-6 text-xs font-mono w-full overflow-x-auto"
                };
            case 'comic':
                return {
                    h1: "text-5xl md:text-7xl font-comic tracking-wider mb-8 text-black -rotate-2",
                    h3: "text-2xl font-comic mt-8 mb-4 text-black uppercase decoration-wavy underline decoration-2 decoration-black",
                    p: "text-lg leading-normal text-black mb-6 font-comic",
                    quote: "bg-white border-[3px] border-black p-8 my-8 rounded-[2rem] shadow-[6px_6px_0_#000] text-center font-black relative after:content-[''] after:absolute after:bottom-[-20px] after:right-[15%] after:border-l-[20px] after:border-l-transparent after:border-r-[0px] after:border-r-transparent after:border-t-[20px] after:border-t-black",
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

    // Helper to detect Chinese characters
    const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);



    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title, text: `Check out this article: ${title}`, url });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
            } catch (err) {
                console.error('Clipboard failed:', err);
            }
        }
    };

    const handleComment = () => {
        const commentSection = document.getElementById('comments');
        if (commentSection) {
            commentSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className={`min-h-screen transition-all duration-700 relative z-0`}>

            {/* --- SCROLL PROGRESS BAR --- */}
            <div className="fixed top-0 left-0 w-full h-1.5 z-[60]">
                <div
                    className={`h-full transition-all duration-100 ease-out ${getProgressBarStyle()}`}
                    style={{ width: `${scrollProgress * 100}%` }}
                ></div>
            </div>

            {/* --- NAVIGATION --- */}
            <BackNavigation universe={universe} label="Back to Articles" href="/blog" />

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
                        <div className="absolute top-0 left-0 w-full p-2 mb-4 bg-[#001100] text-xs font-mono flex justify-between">
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
                                <span>{date}</span>
                                <span>No. 0086</span>
                            </div>
                        </div>
                    )}

                    {/* Comic Visuals */}
                    {universe === 'comic' && (
                        <>
                            <div className="absolute top-[-20px] left-[-10px] transform -rotate-6 bg-white border-2 border-black px-4 py-2 font-black shadow-[4px_4px_0_#000] z-20">
                                POW!
                            </div>
                        </>
                    )}

                    {/* Header Section */}
                    <header className={`mb-12 ${universe === 'newspaper' ? '' : 'border-b border-current/10 pb-8'}`}>
                        <div className="flex flex-wrap gap-3 mb-6">
                            {tags && tags.map(tag => (
                                <a href={`/blog/tag/${tag}`} key={tag} className={`
                  px-3 py-1 font-bold uppercase tracking-wider hover:opacity-80 transition-opacity
                  ${universe === 'comic' ? 'text-sm border-2 border-black bg-white shadow-[2px_2px_0_#000]' : 'text-xs'}
                  ${universe === 'retro' ? 'border border-current' :
                                        universe === 'terminal' ? 'bg-[#33ff00] text-black' :
                                            universe === 'cyberpunk' ? 'bg-[#fcee0a] text-black skew-x-[-10deg]' :
                                                universe === 'newspaper' ? 'border border-black bg-white text-black' :
                                                    'bg-current/10 text-current rounded-full'}
                `}>
                                    #{tag}
                                </a>
                            ))}
                        </div>

                        {/* Title Smart Font Logic */}
                        <h1 className={`${typo.h1} ${universe === 'retro' && hasChinese(title) ? '!font-[Cubic]' : ''}`}>
                            {title}
                        </h1>

                        <div className="flex items-center gap-6 text-sm opacity-60 font-medium">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                <span>{readTime || '5 min read'}</span>
                            </div>
                        </div>
                    </header>

                    {/* Content Body */}
                    <div className={`prose max-w-none ${universe === 'retro' ? 'font-pixel' : ''} ${universe === 'terminal' ? 'prose-invert' : ''} ${universe === 'newspaper' ? 'md:columns-2 md:gap-12' : ''}`}>
                        <ReactMarkdown
                            children={content}
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeHighlight, rehypeKatex]}
                            components={{
                                h1: ({ node, children, ...props }) => <h1 className={typo.h1} {...props}>{children}</h1>,
                                h2: ({ node, children, ...props }) => <h2 className={typo.h3} {...props}>{children}</h2>,
                                h3: ({ node, children, ...props }) => {
                                    const text = Array.isArray(children) ? children.join('') : children;
                                    const fontClass = (universe === 'retro' && hasChinese(text)) ? '!font-[Cubic]' : '';
                                    return <h3 className={`${typo.h3} ${fontClass}`} {...props}>{children}</h3>
                                },
                                p: ({ node, children, ...props }) => {
                                    const text = Array.isArray(children) ? children.join('') : (typeof children === 'string' ? children : '');
                                    const fontClass = (universe === 'retro' && hasChinese(text)) ? '!font-[Cubic]' : '';
                                    return <p className={`${typo.p} ${fontClass}`} {...props}>{children}</p>
                                },
                                blockquote: ({ node, children, ...props }) => {
                                    const fontClass = (universe === 'retro') ? '!font-[Cubic]' : '';
                                    return <blockquote className={`${typo.quote} ${fontClass}`} {...props}>{children}</blockquote>
                                },
                                code: ({ node, inline, className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <div className="rounded-xl overflow-hidden my-6 shadow-2xl bg-[#282c34] border border-white/10">
                                            {/* Window Header */}
                                            <div className="flex items-center justify-between px-4 py-3 bg-[#21252b] border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm"></div>
                                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm"></div>
                                                    <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm"></div>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-gray-400 opacity-50 uppercase tracking-widest">
                                                    {match[1]}
                                                </span>
                                            </div>
                                            {/* Code Content */}
                                            <div className="p-6 overflow-x-auto text-sm leading-relaxed">
                                                <code className={`${className} font-mono !bg-transparent`} {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        </div>
                                    ) : (
                                        <code className={typo.code} {...props}>
                                            {children}
                                        </code>
                                    );
                                }
                            }}
                        />
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
                            <button
                                onClick={handleShare}
                                className="hover:text-current/50 transition-colors flex items-center gap-2"
                                title="Share this article"
                            >
                                <Share2 size={20} />
                                <span className="text-xs uppercase tracking-widest font-bold">Share</span>
                            </button>
                            <button
                                onClick={handleComment}
                                className="hover:text-current/50 transition-colors flex items-center gap-2"
                                title="Jump to comments"
                            >
                                <MessageCircle size={20} />
                                <span className="text-xs uppercase tracking-widest font-bold">Comment</span>
                            </button>
                        </div>
                    </div>

                    {/* Disqus Comments */}
                    <DisqusComments key={universe} slug={slug} title={title} universe={universe} />
                </article>
            </main>
        </div>
    );
};

export default BlogPost;
