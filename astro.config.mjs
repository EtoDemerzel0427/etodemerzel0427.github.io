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
});