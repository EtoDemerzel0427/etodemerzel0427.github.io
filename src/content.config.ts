import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
    // Keep using the legacy content collection API to ensure 100% backward compatibility
    // with your existing getStaticPaths logic (like post.slug and post.body).
    type: 'content',
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
