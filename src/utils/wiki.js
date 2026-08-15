/**
 * Wiki metadata (RectoWiki: github.com/EtoDemerzel0427/notes)
 *
 * The deployed wiki publishes its whole tree as `/notes/content.json`
 * (drafts are already filtered out by its deploy workflow). We fetch that at
 * BUILD time and only keep the small summary the Bento card needs, so the
 * 140KB payload never reaches the browser.
 */

export const WIKI_URL = 'https://huangweiran.club/notes';
export const WIKI_REPO_URL = 'https://github.com/EtoDemerzel0427/notes';
const WIKI_CONTENT_URL = `${WIKI_URL}/content.json`;

const RECENT_LIMIT = 3;

export const formatWikiDate = (value) => {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    if (!year || !month || !day) return String(value);
    return `${year}.${month}.${day}`;
};

const noteUrl = (note) => (note.slug ? `${WIKI_URL}/#${note.slug}` : WIKI_URL);

const categoryOf = (note) => note.category || String(note.id || '').split('/')[0] || 'Notes';

export const summarizeWiki = (payload) => {
    const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
    const notes = nodes.filter((node) => node && !node.isFolder && node.draft !== true);
    if (notes.length === 0) return null;

    const counts = new Map();
    notes.forEach((note) => {
        const name = categoryOf(note);
        counts.set(name, (counts.get(name) || 0) + 1);
    });

    const categories = [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const byDate = [...notes].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    return {
        title: payload?.config?.title || "Weiran's Notes",
        url: WIKI_URL,
        noteCount: notes.length,
        categoryCount: categories.length,
        categories,
        recent: byDate.slice(0, RECENT_LIMIT).map((note) => ({
            title: note.title || note.fileName || 'Untitled',
            category: categoryOf(note),
            date: formatWikiDate(note.date),
            url: noteUrl(note),
        })),
        updatedAt: formatWikiDate(byDate[0]?.date),
    };
};

/**
 * Build-time fetch. Any failure (offline build, wiki redeploying) falls back to
 * the static snapshot in config.js instead of breaking the build.
 */
export const fetchWikiSummary = async () => {
    try {
        const response = await fetch(WIKI_CONTENT_URL, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return summarizeWiki(await response.json());
    } catch (error) {
        console.warn('[wiki] Falling back to static summary:', error.message);
        return null;
    }
};
