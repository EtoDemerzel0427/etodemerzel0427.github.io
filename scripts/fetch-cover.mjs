#!/usr/bin/env node
/**
 * 抓一张唱片封面到 public/travel/covers/。
 *
 *   node scripts/fetch-cover.mjs "Adele" "21" adele-21
 *   node scripts/fetch-cover.mjs "Kanye West" "ye"          # 文件名自动生成
 *
 * 走 iTunes Search API（公开、免 key，本来就是给这种「显示我的唱片」用的）。
 * 拿 600×600 的那一档：封套在墙上不到 32cm，再大也看不出来。
 *
 * 抓完把文件名填进 src/components/travel/kitchen/living.js 顶上的
 * TOP_ROW / BOTTOM_ROW 表里。
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const [artist, album, slugArg] = process.argv.slice(2);
if (!artist || !album) {
    console.error('用法: node scripts/fetch-cover.mjs "<艺人>" "<专辑>" [文件名]');
    process.exit(1);
}

const slug = slugArg || `${artist}-${album}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const url = 'https://itunes.apple.com/search?'
    + new URLSearchParams({ term: `${artist} ${album}`, entity: 'album', limit: '12' });
const { results } = await (await fetch(url)).json();

const norm = (s) => s.toLowerCase().replace(/\s*[([].*$/, '').trim();
const hit = results.find((r) => norm(r.artistName) === norm(artist) && norm(r.collectionName) === norm(album))
    || results.find((r) => norm(r.artistName) === norm(artist))
    || results[0];

if (!hit) {
    console.error('没搜到。iTunes 返回：', results.map((r) => `${r.artistName} — ${r.collectionName}`));
    process.exit(1);
}

const art = hit.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
const dir = resolve('public/travel/covers');
await mkdir(dir, { recursive: true });
const file = resolve(dir, `${slug}.jpg`);
await writeFile(file, Buffer.from(await (await fetch(art)).arrayBuffer()));

console.log(`${hit.artistName} — ${hit.collectionName}  →  public/travel/covers/${slug}.jpg`);
