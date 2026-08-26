import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://huangweiran.club',
    base: '/',
    // 房间那页原来叫 /travel/，长成一整套公寓之后改名 /my-apt/。
    // 旧链接留个兜底（静态构建会生成 meta-refresh 页）。
    redirects: {
        '/travel': '/my-apt/',
        '/travel/list': '/my-apt/list/',
    },
    integrations: [
        react(),
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
                },
                {
                    id: 'abc',
                    scopeName: 'source.abc',
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
