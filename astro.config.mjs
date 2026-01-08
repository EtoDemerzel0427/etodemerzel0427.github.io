import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

import partytown from '@astrojs/partytown';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    // deployed to https://<username>.github.io/
    site: 'https://huangweiran.club',
    base: '/',
    integrations: [react({
        include: ['**/react/*'], // Optional: explicit inclusion if needed, usually auto-detected
    }), tailwind({
        // Example: Disable default base styles if needed, but we likely want them
        applyBaseStyles: false,
    }), partytown(), sitemap()],
    image: {
        domains: [
            'pubengine.s3.eu-central-1.amazonaws.com',
            'images-na.ssl-images-amazon.com',
            'm.media-amazon.com',
            'cdn.hk01.com',
            'external-preview.redd.it',
            'media.cnn.com',
            'cdn.mos.cms.futurecdn.net',
            'tse3.mm.bing.net',
            'upload.wikimedia.org',
            'i1.sndcdn.com',
            'p3-pc-sign.douyinpic.com',
            'asianpopweekly.com',
            'd1lss44hh2trtw.cloudfront.net',
            'file.garden'
        ]
    }
});