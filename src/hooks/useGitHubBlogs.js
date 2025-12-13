import { useState, useEffect } from 'react';
import { USER_CONTENT } from '../config';
import fm from 'front-matter';
import removeMd from 'remove-markdown';

const GITHUB_API_BASE = "https://api.github.com/repos";

export const useGitHubBlogs = () => {
    const [stats, setStats] = useState({ count: 0 });
    const [featuredPost, setFeaturedPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBlogData = async () => {
            try {
                const { username, repo, rawBaseUrl, featuredPostPath } = USER_CONTENT.blogRepo;

                // 1. Fetch File Tree for Count
                const treeRes = await fetch(`${GITHUB_API_BASE}/${username}/${repo}/git/trees/main?recursive=1`);
                if (treeRes.ok) {
                    const treeData = await treeRes.json();
                    const mdFiles = treeData.tree.filter(node =>
                        node.path.startsWith('content/') && node.path.endsWith('.md')
                    );
                    setStats({ count: mdFiles.length });
                }

                // 2. Fetch Configured Featured Post directly
                if (featuredPostPath) {
                    const rawRes = await fetch(`${rawBaseUrl}${featuredPostPath}`);
                    if (rawRes.ok) {
                        const rawText = await rawRes.text();

                        // Use front-matter to parse
                        const { attributes, body } = fm(rawText);

                        // Use remove-markdown to clean body for preview
                        // Replace newlines with spaces first to avoid clunky previews
                        const cleanText = removeMd(body).replace(/\n/g, ' ');

                        setFeaturedPost({
                            title: attributes.title || featuredPostPath.split('/').pop().replace('.md', ''),
                            slug: attributes.slug,
                            date: attributes.date ? new Date(attributes.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            category: attributes.category || 'Blog',
                            content: body, // Keep raw body if needed elsewhere
                            summary: cleanText, // Pre-cleaned summary
                            filePath: featuredPostPath,
                            url: `${USER_CONTENT.blogRepo.siteBaseUrl}#${attributes.slug || featuredPostPath.split('/').pop().replace('.md', '')}` // Dynamically construct deep link
                        });
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error("Error fetching blogs:", err);
                setError(err);
                setLoading(false);
            }
        };

        fetchBlogData();
    }, []);

    return { count: stats.count, featuredPost, loading, error };
};
