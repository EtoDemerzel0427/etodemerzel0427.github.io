import React, { useEffect } from 'react';
import { USER_CONTENT } from '../config';

const SEO = ({ title, description, image, type = 'website' }) => {
    // defaults
    const siteTitle = USER_CONTENT?.name ? `${USER_CONTENT.name}'s Universe` : "Weiran's Universe";
    const defaultDescription = USER_CONTENT?.intro || "Weiran's personal website and blog.";

    // Fallback image (using the first available profile pic usually, or a specific OG image if we had one)
    // For now, we'll use a placeholder or the profile image if standard.
    // Ideally user adds an 'ogImage' to config, but we'll try to use what we have.
    const defaultImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien%20Monster.png";

    const metaTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const metaDescription = description || defaultDescription;
    const metaImage = image || defaultImage;

    useEffect(() => {
        // 1. Update Title
        document.title = metaTitle;

        // 2. Helper to set meta tags
        const setMetaTag = (name, content, attribute = 'name') => {
            let element = document.querySelector(`meta[${attribute}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        // Standard Meta
        setMetaTag('description', metaDescription);

        // Open Graph / Facebook
        setMetaTag('og:type', type, 'property');
        setMetaTag('og:title', metaTitle, 'property');
        setMetaTag('og:description', metaDescription, 'property');
        setMetaTag('og:image', metaImage, 'property');
        setMetaTag('og:url', window.location.href, 'property');
        setMetaTag('og:site_name', siteTitle, 'property');

        // Twitter
        setMetaTag('twitter:card', 'summary_large_image'); // Use large card for better visuals
        setMetaTag('twitter:title', metaTitle);
        setMetaTag('twitter:description', metaDescription);
        setMetaTag('twitter:image', metaImage);

    }, [metaTitle, metaDescription, metaImage, type, siteTitle]);

    return null; // Headless component
};

export default SEO;
