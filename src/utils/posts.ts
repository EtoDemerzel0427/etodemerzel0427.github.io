import type { CollectionEntry } from 'astro:content';

export type PostSummary = CollectionEntry<'posts'>['data'] & {
    slug: string;
    readTime?: string;
};

export const toPostSummary = (
    post: CollectionEntry<'posts'>,
    readTime?: string,
): PostSummary => ({
    slug: post.id,
    ...post.data,
    ...(readTime ? { readTime } : {}),
});

export const sortPostsByDate = <T extends { date: Date | string }>(posts: T[]): T[] => (
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
);
