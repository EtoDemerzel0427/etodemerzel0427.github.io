import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_FILE = path.join(ROOT, 'src/data/status.json');
const STATUS_IMAGE_DIR = path.join(ROOT, 'public/status');
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
        throw new Error(`Invalid argument near "${key ?? ''}". Use --name "value" pairs.`);
    }
    args.set(key.slice(2), value);
}

const text = args.get('text')?.trim();
const imageInput = args.get('image')?.trim();
if (!text || !imageInput) {
    throw new Error('Both --text and --image are required.');
}

const sourceImage = path.resolve(process.cwd(), imageInput);
const extension = path.extname(sourceImage).toLowerCase();
if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported image type "${extension || '(none)'}".`);
}
if (!(await stat(sourceImage)).isFile()) {
    throw new Error(`Image is not a file: ${sourceImage}`);
}

const currentStatus = JSON.parse(await readFile(STATUS_FILE, 'utf8'));
const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).format(new Date());
const slug = path.basename(sourceImage, extension)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'moment';

await mkdir(STATUS_IMAGE_DIR, { recursive: true });
let outputName = `${today}-${slug}${extension}`;
let outputImage = path.join(STATUS_IMAGE_DIR, outputName);
for (let suffix = 2; ; suffix += 1) {
    try {
        await stat(outputImage);
        outputName = `${today}-${slug}-${suffix}${extension}`;
        outputImage = path.join(STATUS_IMAGE_DIR, outputName);
    } catch (error) {
        if (error?.code === 'ENOENT') break;
        throw error;
    }
}
await copyFile(sourceImage, outputImage);

const nextStatus = {
    emoji: args.get('emoji')?.trim() || currentStatus.emoji || '✨',
    text,
    photo: {
        src: `/status/${outputName}`,
        alt: args.get('alt')?.trim() || text
    },
    note: args.get('note')?.trim() || text,
    date: (args.get('date')?.trim() || today).replaceAll('-', '.'),
    location: args.get('location')?.trim() || ''
};

const temporaryFile = `${STATUS_FILE}.tmp`;
await writeFile(temporaryFile, `${JSON.stringify(nextStatus, null, 2)}\n`, 'utf8');
await rename(temporaryFile, STATUS_FILE);

console.log(`Updated status in ${path.relative(ROOT, STATUS_FILE)}`);
console.log(`Copied image to ${path.relative(ROOT, outputImage)}`);
