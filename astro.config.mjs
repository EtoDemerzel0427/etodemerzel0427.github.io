import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://huangweiran.club',
    base: '/',
    integrations: [
        react({ include: ['**/react/*'] }),
        tailwind({ applyBaseStyles: false }),
        partytown(),
        sitemap()
    ],
    markdown: {
        shikiConfig: {
            langs: [
                {
                    id: 'chart',
                    scopeName: 'source.chart',
                    grammar: {
                        patterns: []
                    }
                }
            ]
        }
    },
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