import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://huangweiran.club',
    base: '/',
    // dev server 端口跟随环境变量，方便多个 preview 实例并存；没设就还是 4321。
    server: { port: Number(process.env.PORT) || 4321 },
    vite: {
        // 公寓那页的后处理 pass 全是动态 import，冷启动时 Vite 扫不到，
        // 会在页面加载到一半才去预构建，在途的模块直接 504（场景就初始化失败了）。
        // 提前声明一遍，dev 冷启动才稳。
        optimizeDeps: {
            include: [
                'three',
                'three/examples/jsm/geometries/RoundedBoxGeometry.js',
                'three/examples/jsm/postprocessing/EffectComposer.js',
                'three/examples/jsm/postprocessing/RenderPass.js',
                'three/examples/jsm/postprocessing/ShaderPass.js',
                'three/examples/jsm/postprocessing/UnrealBloomPass.js',
                'three/examples/jsm/postprocessing/OutputPass.js',
                'three/examples/jsm/postprocessing/SMAAPass.js',
            ],
        },
    },
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
