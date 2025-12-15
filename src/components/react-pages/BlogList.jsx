import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { universe } from '../../stores/universeStore';
import { lang, toggleLang } from '../../stores/langStore'; // Adjust path
import { getFontClass, getCardStyle } from '../../utils/theme';

const BlogList = ({ posts }) => {
    const $universe = useStore(universe);
    const $lang = useStore(lang);

    // Filter by language
    const filteredPosts = posts.filter(post => !post.lang || post.lang === $lang);

    // Helper to detect Chinese characters
    const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

    // 4. Navigation Bar Style (Copied & Adapted from BlogPost for consistency)
    const getHeaderClass = () => {
        // Base: Fixed, full width, NO background, NO events on container
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

    return (
        <div className="max-w-6xl mx-auto px-4 flex flex-col">

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
                        <h2 className={`text-4xl font-bold ${getFontClass($universe, 'title')}`}>Articles</h2>
                        <div className={`text-xl font-bold ${getFontClass($universe, 'body')}`}>
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
                            <a
                                href={`/blog/${post.slug}`}
                                key={post.slug}
                                className={`block group no-underline ${getCardStyle($universe, 'default', '!min-h-0 !p-6 md:!p-8 h-auto')}`}
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
                                </div>
                            </a>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlogList;
