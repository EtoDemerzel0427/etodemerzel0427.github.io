import React from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '../components/Header';


import { getFontClass, getCardStyle } from '../utils/theme';
import { getAllPosts } from '../utils/blogLoader';

const BlogList = () => {
    const { universe, handleShowStatus, lang, toggleLang } = useOutletContext();

    // Load posts directly (since it utilizes eager import, it's synchronous)
    const allPosts = getAllPosts();

    // Filter by language (default to all if no lang specified in post, or exact match)
    const posts = allPosts.filter(post => !post.lang || post.lang === lang);

    // Helper to detect Chinese characters
    const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);

    // 4. Navigation Bar Style (Copied & Adapted from BlogPost for consistency)
    const getHeaderClass = () => {
        // Base: Fixed, full width, NO background, NO events on container
        const base = "fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 transition-all duration-500 pointer-events-none";

        switch (universe) {
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
        <div className="max-w-6xl mx-auto px-4 min-h-screen flex flex-col">

            {/* Header Portal */}
            {createPortal(
                <nav className={getHeaderClass()}>
                    <Link to="/" className={`flex items-center gap-2 font-bold pointer-events-auto transition-opacity hover:opacity-100 opacity-60
                        ${getFontClass(universe)}
                    `}>
                        <ArrowLeft size={20} />
                        <span>Back to Home</span>
                    </Link>
                </nav>,
                document.body
            )}

            <div className="pt-32 flex-1">
                <Header
                    universe={universe}
                    onShowStatus={handleShowStatus}
                />

                <div className="space-y-6 mt-12">
                    <div className="flex items-baseline gap-4 mb-8">
                        <h2 className={`text-4xl font-bold ${getFontClass(universe, 'title')}`}>Articles</h2>
                        <div className={`text-xl font-bold ${getFontClass(universe, 'body')}`}>
                            <span
                                onClick={() => lang !== 'zh' && toggleLang()}
                                className={`cursor-pointer transition-all ${lang === 'zh' ? 'opacity-100 border-b-2 border-current' : 'opacity-30 hover:opacity-100'}`}
                            >
                                ZH
                            </span>
                            <span className="opacity-30 mx-2">/</span>
                            <span
                                onClick={() => lang !== 'en' && toggleLang()}
                                className={`cursor-pointer transition-all ${lang === 'en' ? 'opacity-100 border-b-2 border-current' : 'opacity-30 hover:opacity-100'}`}
                            >
                                EN
                            </span>
                        </div>
                    </div>

                    {posts.length === 0 ? (
                        <p className="opacity-50 italic">No articles found in this language.</p>
                    ) : (
                        posts.map(post => (
                            <Link
                                to={`/blog/${post.slug}`}
                                key={post.slug}
                                className={`block group no-underline ${getCardStyle(universe, 'default', '!min-h-0 !p-6 md:!p-8 h-auto')}`}
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className={`text-2xl font-bold group-hover:underline decoration-2 underline-offset-4 ${getFontClass(universe, 'title')}
                                            ${universe === 'retro' && hasChinese(post.title) ? '!font-[Cubic]' : ''}
                                        `}>
                                            {post.title}
                                        </h3>
                                        <span className={`text-sm opacity-50 whitespace-nowrap mt-1 ${universe === 'retro' ? 'font-pixel text-[10px]' : 'font-mono'}`}>
                                            {post.date}
                                        </span>
                                    </div>
                                    <p className={`opacity-70 line-clamp-3 ${getFontClass(universe, 'body')}
                                         ${universe === 'retro' && hasChinese(post.summary) ? '!font-[Cubic]' : ''}
                                    `}>
                                        {post.summary}
                                    </p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>


        </div>
    );
};

export default BlogList;
