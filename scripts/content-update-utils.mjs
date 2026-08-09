import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const parseNamedArgs = (allowedNames) => {
    const allowed = new Set(allowedNames);
    const args = new Map();

    for (let index = 2; index < process.argv.length; index += 2) {
        const key = process.argv[index];
        const value = process.argv[index + 1];
        const name = key?.slice(2);

        if (!key?.startsWith('--') || value === undefined || !allowed.has(name)) {
            throw new Error(`Invalid argument near "${key ?? ''}".`);
        }
        args.set(name, value.trim());
    }

    if (args.size === 0) throw new Error('Provide at least one value to update.');
    return args;
};

export const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

export const writeJsonAtomically = async (file, value) => {
    const temporaryFile = `${file}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporaryFile, file);
};

export const resolveAsset = async (input, { directory, publicPath, extensions }) => {
    if (/^(?:https?:\/\/|\/)/i.test(input)) return input;

    const source = path.resolve(process.cwd(), input);
    const extension = path.extname(source).toLowerCase();
    if (!extensions.has(extension)) {
        throw new Error(`Unsupported asset type "${extension || '(none)'}".`);
    }
    if (!(await stat(source)).isFile()) throw new Error(`Asset is not a file: ${source}`);

    const destinationDirectory = path.join(ROOT, 'public', directory);
    await mkdir(destinationDirectory, { recursive: true });

    const baseName = path.basename(source, extension)
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'asset';
    let outputName = `${baseName}${extension}`;
    let destination = path.join(destinationDirectory, outputName);

    for (let suffix = 2; ; suffix += 1) {
        try {
            await stat(destination);
            outputName = `${baseName}-${suffix}${extension}`;
            destination = path.join(destinationDirectory, outputName);
        } catch (error) {
            if (error?.code === 'ENOENT') break;
            throw error;
        }
    }

    await copyFile(source, destination);
    return `${publicPath}/${outputName}`;
};

export const parseNumber = (value, name, { min, max }) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
        throw new Error(`--${name} must be between ${min} and ${max}.`);
    }
    return number;
};

export const slugify = (value, fallback = 'item') => (
    value.normalize('NFKD')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || fallback
);

export const createUniqueId = (prefix, title, existingIds) => {
    const base = `${prefix}-${slugify(title)}`;
    let candidate = base;
    for (let suffix = 2; existingIds.has(candidate); suffix += 1) {
        candidate = `${base}-${suffix}`;
    }
    return candidate;
};

export const readBaseLibraryIds = async () => {
    const source = await readFile(path.join(ROOT, 'src/data/library.js'), 'utf8');
    return new Set([...source.matchAll(/\bid:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]));
};
