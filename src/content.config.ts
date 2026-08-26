import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
    loader: glob({
        pattern: '**/[^_]*.{md,mdx}',
        base: './src/content/posts',
    }),
    schema: z.object({
        title: z.string(),
        date: z.date().or(z.string()),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
        cover: z.string().optional(),
        image: z.string().optional(),
        draft: z.boolean().optional(),
        slug: z.string().optional(),
        lang: z.string().optional(),
    }),
});

const travel = defineCollection({
    loader: glob({
        pattern: '**/[^_]*.md',
        base: './src/content/travel',
    }),
    schema: z.object({
        // 地点
        place: z.string(),
        placeEn: z.string().optional(),
        country: z.string(),
        kind: z.enum(['place', 'gift', 'fandom']).default('place'),
        year: z.number().optional(),
        dates: z.string().optional(),
        rating: z.number().min(0).max(5).optional(),

        // 磁贴外观。有真实正视素材时填 magnet（PNG/JPEG/WebP，放 public/travel/magnets/），
        // 并用 magnetAspect 写宽 / 高；透明素材也支持。此时 shape / glyph / palette 全部忽略。
        magnet: z.string().optional(),
        magnetAspect: z.number().positive().optional(),
        magnetShape: z.enum(['rounded', 'circle', 'alpha-card', 'volumetric-clip']).optional(),
        magnetEdge: z.string().optional(),
        magnetBrightness: z.number().min(0).max(2).optional(),
        shape: z.enum(['round', 'arch', 'banner', 'tile', 'star', 'plate', 'shield']).default('round'),
        glyph: z.enum(['tower', 'mountain', 'bridge', 'temple', 'skyline', 'wave', 'palm']).default('skyline'),
        palette: z.array(z.string()).optional(),

        // 在冰箱门上的位置（百分比）与随手贴歪的角度
        pos: z.object({ x: z.number(), y: z.number() }),
        tilt: z.number().default(0),
        scale: z.number().default(1),

        draft: z.boolean().optional(),
    }),
});

export const collections = { posts, travel };
