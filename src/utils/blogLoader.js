/**
 * Utility to load markdown blog posts from src/content/posts
 * Uses import.meta.glob to fetch files at build time.
 */

// 1. Fetch all markdown files in content/posts
// query: '?raw' imports content as string (for parsing)
const modules = import.meta.glob('../content/posts/*.md', { query: '?raw', import: 'default', eager: true });

/**
 * Regex to parse Frontmatter
 * Matches content between first pair of ---
 */
const FRONTMATTER_REGEX = /^---\s*([\s\S]*?)\s*---/;

/**
 * Simple YAML parser for flat key-value pairs
 * e.g., title: "Hello" -> { title: "Hello" }
 * Handles arrays: tags: ["a", "b"]
 */
const parseYaml = (yamlString) => {
    const metadata = {};
    const lines = yamlString.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        // Handle quoted strings
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }

        // Handle arrays [item1, item2]
        if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(item => {
                const trimmed = item.trim();
                return (trimmed.startsWith('"') && trimmed.endsWith('"'))
                    ? trimmed.slice(1, -1)
                    : trimmed;
            });
        }

        metadata[key] = value;
    }
    return metadata;
};

/**
 * Parse a single markdown file string
 */
const parsePost = (filePath, fileContent) => {
    const match = FRONTMATTER_REGEX.exec(fileContent);

    if (!match) {
        console.warn(`No frontmatter found in ${filePath}`);
        return {
            metadata: {},
            content: fileContent
        };
    }

    const frontmatterBlock = match[1];
    const content = fileContent.replace(match[0], '').trim();
    const metadata = parseYaml(frontmatterBlock);

    return {
        // slug fallback: filename if not in frontmatter
        slug: metadata.slug || filePath.split('/').pop().replace('.md', ''),
        ...metadata, // title, date, tags, lang, summary
        content
    };
};

// 2. Process all modules into an array of posts
const allPosts = Object.entries(modules).map(([path, content]) => {
    return parsePost(path, content);
}).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date desc

export const getAllPosts = () => {
    return allPosts;
};

export const getPostBySlug = (slug) => {
    return allPosts.find(post => post.slug === slug);
};
