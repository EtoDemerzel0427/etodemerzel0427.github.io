import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { universe } from '../../stores/universeStore';
import { lang, toggleLang } from '../../stores/langStore'; // Adjust path
import { getFontClass, getCardStyle } from '../../utils/theme';

const BlogList = ({ posts, activeTag }) => {
    const $universe = useStore(universe);
    const $lang = useStore(lang);

    // Filter by language
    const filteredPosts = posts.filter(post => !post.lang || post.lang === $lang);

    // Helper to detect Chinese characters
    const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

    // Navigation logic for card click
    const handleCardClick = (e, slug) => {
        // Prevent navigation if clicking on a tag (which is an anchor)
        if (e.target.closest('a')) return;
        window.location.href = `/blog/${slug}`;
    };

    // 4. Navigation Bar Style
    const getHeaderClass = () => {
        const base = "fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 transition-all duration-500 pointer-events-none";

        switch ($universe) {
            case 'terminal': return `${base} text-[#33ff00]`;
            case 'neon': return `${base} text-gray-900`;
            case 'newspaper': return `${base} text-black`;
            case 'cyberpunk': return `${base} text-[#fcee0a]`;
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



    // Helper for highlight color
    const getHighlightColor = (u) => {
        switch (u) {
            case 'terminal': return 'text-[#33ff00]';
            case 'cyberpunk': return 'text-[#00f0ff] drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]';
            case 'retro': return 'text-[#ff0055]';
            case 'neon': return 'text-[#3A86FF]';
            case 'punk': return 'text-[#ff0090] bg-black text-white px-2 -rotate-1 inline-block';
            case 'bauhaus': return 'text-[#e63946]';
            case 'botanical': return 'text-[#3a5a40]';
            case 'newspaper': return 'text-black underline decoration-4 underline-offset-4';
            case 'comic': return 'text-black font-black underline decoration-wavy decoration-[#ff0055]';
            case 'aero': return 'text-blue-600 drop-shadow-md';
            default: return 'text-current opacity-100 underline decoration-2 underline-offset-4';
        }
    };

    return (
        <div className="w-full px-2 flex flex-col">

            {/* Header Portal - Back to Home */}
            {createPortal(
                <nav className={getHeaderClass()}>
                    <a href="/" className={`flex items-center gap-2 font-bold pointer-events-auto transition-opacity hover:opacity-100 opacity-60
                        ${getFontClass($universe)}
                    `}>
                        <ArrowLeft size={20} />
                        <span>Back to Home</span>
                    </a>
                </nav>,
                document.body
            )}

            <div className="flex-1">
                {/* Internal Header removed, provided by Layout.astro */}

                <div className="space-y-6 mt-12 pb-20">
                    <div className="flex items-baseline gap-4 mb-8">
                        <h2 className={`text-4xl font-bold ${getFontClass($universe, 'title')}`}>
                            {activeTag ? (
                                <>
                                    <span className="opacity-50">Tag:</span>
                                    <span className={`ml-2 ${getHighlightColor($universe)}`}>{activeTag}</span>
                                </>
                            ) : 'Articles'}
                        </h2>
                        <div className={`text-xl font-bold ${getFontClass($universe, 'body')}`}>
                            {/* Language Toggles */}
                            <span
                                onClick={() => $lang !== 'zh' && toggleLang()}
                                className={`cursor-pointer transition-all ${$lang === 'zh' ? 'opacity-100 border-b-2 border-current' : 'opacity-30 hover:opacity-100'}`}
                            >
                                ZH
                            </span>
                            <span className="opacity-30 mx-2">/</span>
                            <span
                                onClick={() => $lang !== 'en' && toggleLang()}
                                className={`cursor-pointer transition-all ${$lang === 'en' ? 'opacity-100 border-b-2 border-current' : 'opacity-30 hover:opacity-100'}`}
                            >
                                EN
                            </span>
                        </div>
                    </div>

                    {filteredPosts.length === 0 ? (
                        <p className="opacity-50 italic">No articles found in this language.</p>
                    ) : (
                        filteredPosts.map(post => (
                            <div
                                onClick={(e) => handleCardClick(e, post.slug)}
                                key={post.slug}
                                className={`block group cursor-pointer relative ${getCardStyle($universe, 'default', '!min-h-0 !p-6 md:!p-8 h-auto')}`}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className={`text-2xl font-bold group-hover:underline decoration-2 underline-offset-4 ${getFontClass($universe, 'title')}
                                            ${$universe === 'retro' && hasChinese(post.title) ? '!font-[Cubic]' : ''}
                                        `}>
                                            {post.title}
                                        </h3>
                                        <span className={`text-sm opacity-50 whitespace-nowrap mt-1 ${$universe === 'retro' ? 'font-pixel text-[10px]' : 'font-mono'}`}>
                                            {post.date}
                                        </span>
                                    </div>
                                    <p className={`opacity-70 line-clamp-3 ${getFontClass($universe, 'body')}
                                         ${$universe === 'retro' && hasChinese(post.summary) ? '!font-[Cubic]' : ''}
                                    `}>
                                        {post.summary}
                                    </p>

                                    {/* Tags Display */}
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            {post.tags.map(tag => (
                                                <a
                                                    key={tag}
                                                    href={`/blog/tag/${tag}`}
                                                    className={`text-xs font-bold px-2 py-1 border rounded z-10 transition-colors
                                                        ${$universe === 'retro' ? 'border-white text-white hover:bg-white hover:text-black' : 'border-current opacity-60 hover:opacity-100 hover:bg-black/5'}
                                                    `}
                                                >
                                                    #{tag}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlogList;
