import path from 'node:path';
import {
    ROOT,
    createUniqueId,
    parseNamedArgs,
    parseNumber,
    readBaseLibraryIds,
    readJson,
    resolveAsset,
    writeJsonAtomically,
} from './content-update-utils.mjs';

const CURRENT_FILE = path.join(ROOT, 'src/data/current-library.json');
const ADDITIONS_FILE = path.join(ROOT, 'src/data/library-additions.json');
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const args = parseNamedArgs([
    'id', 'title', 'studio', 'cover', 'platform', 'progress', 'rating',
    'summary', 'review', 'year', 'genre',
]);

if (args.has('id') && args.has('title')) {
    throw new Error('Use --id to select an existing game or --title to add a new one, not both.');
}

const current = await readJson(CURRENT_FILE);
const additions = await readJson(ADDITIONS_FILE);
const existingIds = await readBaseLibraryIds();
additions.forEach((item) => existingIds.add(item.id));

let selectedId = current.gameId;
let addedItem = null;

if (args.has('id')) {
    selectedId = args.get('id');
    if (!existingIds.has(selectedId)) throw new Error(`Unknown Gallery item id "${selectedId}".`);
} else if (args.has('title')) {
    const studio = args.get('studio');
    const coverInput = args.get('cover');
    if (!studio || !coverInput) throw new Error('A new game requires --title, --studio, and --cover.');

    selectedId = createUniqueId('game', args.get('title'), existingIds);
    addedItem = {
        id: selectedId,
        type: 'game',
        title: args.get('title'),
        creator: studio,
        cover: await resolveAsset(coverInput, {
            directory: 'library/games',
            publicPath: '/library/games',
            extensions: IMAGE_EXTENSIONS,
        }),
        status: 'playing',
        progress: args.has('progress')
            ? parseNumber(args.get('progress'), 'progress', { min: 0, max: 100 })
            : 0,
        rating: args.has('rating')
            ? parseNumber(args.get('rating'), 'rating', { min: 0, max: 5 })
            : null,
        summary: args.get('summary') || '',
        review: args.get('review') || '',
        year: args.get('year') || '',
        genre: args.get('genre') || '',
        platform: args.get('platform') || 'PC',
    };
    additions.push(addedItem);
}

if (!selectedId) throw new Error('No current game is configured.');

const overrideFields = ['platform', 'summary', 'review', 'year', 'genre'];
const override = { ...(current.overrides[selectedId] || {}) };
for (const field of overrideFields) {
    if (args.has(field) && !addedItem) override[field] = args.get(field);
}
if (args.has('progress') && !addedItem) {
    override.progress = parseNumber(args.get('progress'), 'progress', { min: 0, max: 100 });
}
if (args.has('rating') && !addedItem) {
    override.rating = parseNumber(args.get('rating'), 'rating', { min: 0, max: 5 });
}

if (Object.keys(override).length > 0) current.overrides[selectedId] = override;
current.gameId = selectedId;

if (addedItem) await writeJsonAtomically(ADDITIONS_FILE, additions);
await writeJsonAtomically(CURRENT_FILE, current);

console.log(addedItem ? `Added ${addedItem.title} to Gallery` : `Selected Gallery item ${selectedId}`);
console.log(`Now Playing points to ${selectedId}`);
