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

export const collections = { posts };
