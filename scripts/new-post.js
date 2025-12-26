import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get title from command line args, or default to 'Untitled'
const rawTitle = process.argv.slice(2).join(' ') || 'Untitled';

// Generate slug: "Hello World" -> "hello-world"
const slug = rawTitle
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // Allow Chinese chars or replace non-alphanumeric
    .replace(/^-+|-+$/g, '');

const date = new Date().toISOString().split('T')[0];
const filename = `${date}-${slug || 'post'}.md`;

const targetDir = path.join(__dirname, '../src/content/posts');
const targetPath = path.join(targetDir, filename);

// Ensure directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const template = `---
title: "${rawTitle}"
date: "${date}"
summary: "TODO: Write a short summary here..."
tags: ["General"]
lang: "en"

---

Write your content here...
`;

if (fs.existsSync(targetPath)) {
    console.error(`❌ Error: File "${filename}" already exists.`);
    process.exit(1);
}

fs.writeFileSync(targetPath, template);
console.log(`✅ Post created successfully!`);
console.log(`📄 Path: src/content/posts/${filename}`);
