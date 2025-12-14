import React, { useEffect } from 'react';
import { USER_CONTENT } from '../config';

const DisqusComments = ({ slug, title, universe }) => {
    const shortname = USER_CONTENT.disqus.shortname;

    // Helper to get text color for the container.
    // This serves two purposes:
    // 1. Strings like "Discussion" matches the theme.
    // 2. Disqus auto-detects background color. If we set text color to light, 
    //    it assumes background is dark and switches to Dark Mode (white text).
    // 1. Header Styles (Matches the Universe aesthetic)
    const getHeaderClasses = () => {
        switch (universe) {
            case 'terminal': return 'text-[#33ff00] border-[#33ff00]';
            case 'cyberpunk': return 'text-[#fcee0a] border-[#fcee0a]';
            case 'retro': return 'text-white border-white/20';
            case 'noir': return 'text-gray-400 border-gray-800';
            case 'lofi': return 'text-[#5f5a4e] border-[#5f5a4e]/20';
            case 'botanical': return 'text-[#3a5a40] border-[#3a5a40]/20';
            default: return 'text-black border-black/10';
        }
    };

    // 2. Thread Styles (The HINT for Disqus)
    // We explicitly force Black or White text on the container to guide Disqus auto-detection.
    const getThreadClasses = () => {
        if (['retro', 'terminal', 'cyberpunk', 'noir', 'neon'].includes(universe)) {
            return 'text-white'; // Force "Dark Mode" (White Text)
        }
        return 'text-black'; // Force "Light Mode" (Black Text)
    };

    useEffect(() => {
        // If placeholder or empty, don't try to load
        if (!shortname || shortname === 'your-disqus-shortname') return;

        const config = function () {
            this.page.identifier = slug;
            this.page.url = window.location.href;
            this.page.title = title;
        };

        // Add a delay to match the CSS transition duration (700ms in RootLayout/BlogPost).
        // This ensures the background color has fully switched to "Dark" before Disqus checks it.
        const timer = setTimeout(() => {
            if (window.DISQUS) {
                window.DISQUS.reset({
                    reload: true,
                    config: config
                });
            } else {
                window.disqus_config = config;
                const d = document;
                const s = d.createElement('script');
                s.src = `https://${shortname}.disqus.com/embed.js`;
                s.setAttribute('data-timestamp', +new Date());
                s.setAttribute('async', 'true');
                (d.head || d.body).appendChild(s);
            }
        }, 800); // Wait for transition (~700ms) to finish

        return () => clearTimeout(timer);
    }, [slug, title, shortname, universe]);

    return (
        <div className={`w-full mt-16 pt-10 border-t ${getHeaderClasses()}`} id="comments">
            <h3 className="text-xl font-bold mb-8 opacity-50 uppercase tracking-widest">Discussion</h3>
            <div id="disqus_thread" className={`min-h-[200px] ${getThreadClasses()}`}></div>
            <noscript>
                Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a>
            </noscript>
        </div>
    );
};

export default DisqusComments;
