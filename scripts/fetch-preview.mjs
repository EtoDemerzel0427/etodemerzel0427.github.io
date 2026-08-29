#!/usr/bin/env node
/**
 * 给墙上那张唱片找一段能放的音源。
 *
 *   node scripts/fetch-preview.mjs "Adele" "21" "Rolling in the Deep"
 *   node scripts/fetch-preview.mjs --id 1443120095 "There Is No Greater Love"
 *   node scripts/fetch-preview.mjs --all          # 把表里七张一次跑完
 *
 * 走 iTunes Search API —— 和 fetch-cover.mjs 同一个接口，封面就是从那儿抓的。
 * 每首歌带一段 30 秒的试听（AAC，约 1MB），托管在 Apple 自己的 CDN 上，
 * 而且响应头是 access-control-allow-origin: *，所以能直接进屋里那条
 * WebAudio 链（底噪 + 低通 + 两只音箱的定位）。
 *
 * 一个音频文件都不用进仓库 —— 现在 /music/ 下那支 7.4MB 的完整 MP3 是特例，
 * 别照着它往下做。
 *
 * 跑完把 track / preview 两个字段填进 living.js 顶上的 TOP_ROW / BOTTOM_ROW。
 * 预览链接偶尔会轮换，哪天不响了就重跑一次；运行时取不到就只剩唱片底噪，
 * 不会报错。
 */

/** 墙上那两排。和 living.js 的 TOP_ROW / BOTTOM_ROW 一一对应。
 *  id 是 iTunes 的 collectionId —— 只在按名字搜不准的那几张上写死。 */
const WALL = [
    { artist: 'Adele', album: '21', track: 'Someone Like You' },
    { artist: 'The Weeknd', album: 'After Hours', track: 'Blinding Lights' },
    // 按名字搜会撞上他 2025 那张 Son Of Spergy，钉死 2023 的 NEVER ENOUGH
    { artist: 'Daniel Caesar', album: 'NEVER ENOUGH', track: 'Always', id: 1681329711 },
    // 搜「Miles Davis Miles」会撞上一大堆同名合辑，钉死 Prestige 7014 那张
    { artist: 'Miles Davis', album: 'Miles', track: '', id: 1443120095 },
    { artist: 'The Weeknd', album: 'Starboy', track: 'Starboy' },
    { artist: 'Kanye West', album: 'ye', track: 'Ghost Town' },
    { artist: 'RADWIMPS', album: '君の名は。', track: 'Zenzenzense' },
];

const norm = (s) => String(s).toLowerCase().replace(/\s*[([].*$/, '').trim();
const get = async (u) => (await fetch(u)).json();

/** 找到专辑，返回 collectionId */
async function findAlbum(artist, album) {
    const url = 'https://itunes.apple.com/search?'
        + new URLSearchParams({ term: `${artist} ${album}`, entity: 'album', limit: '20' });
    const { results } = await get(url);
    const exact = results.find((r) => norm(r.artistName) === norm(artist) && norm(r.collectionName) === norm(album));
    const loose = results.find((r) => norm(r.collectionName) === norm(album));
    const hit = exact || loose || results.find((r) => norm(r.artistName) === norm(artist));
    if (!hit) {
        throw new Error(`没搜到。iTunes 返回：\n    ${results.slice(0, 6).map((r) => `${r.artistName} — ${r.collectionName}`).join('\n    ')}`);
    }
    return hit;
}

/** 列出这张专辑的曲目，挑一首 */
async function pickTrack(collectionId, want) {
    const url = 'https://itunes.apple.com/lookup?'
        + new URLSearchParams({ id: String(collectionId), entity: 'song', limit: '80' });
    const { results } = await get(url);
    const songs = results.filter((r) => r.wrapperType === 'track' && r.previewUrl);
    if (!songs.length) throw new Error('这张一首带试听的都没有');
    const hit = want
        ? songs.find((s) => norm(s.trackName) === norm(want))
            || songs.find((s) => norm(s.trackName).includes(norm(want)))
        : null;
    return { song: hit || songs[0], songs, matched: !!hit };
}

async function one({ artist, album, track, id }) {
    const coll = id ? { collectionId: id, artistName: artist, collectionName: album } : await findAlbum(artist, album);
    const { song, songs, matched } = await pickTrack(coll.collectionId, track);
    console.log(`\n${coll.artistName} — ${coll.collectionName}  (id ${coll.collectionId})`);
    if (track && !matched) {
        console.log(`  ⚠ 表里写的「${track}」没对上，退回第一首。这张的曲目：`);
        console.log(`    ${songs.map((s) => s.trackName).join(' · ')}`);
    }
    console.log(`  track: '${song.trackName.replace(/'/g, "\\'")}',`);
    console.log(`  preview: '${song.previewUrl}',`);
}

const args = process.argv.slice(2);
if (args[0] === '--all' || args.length === 0) {
    for (const rec of WALL) {
        try { await one(rec); } catch (e) { console.log(`\n✗ ${rec.artist} — ${rec.album}: ${e.message}`); }
    }
} else if (args[0] === '--id') {
    await one({ artist: '', album: '', id: Number(args[1]), track: args[2] || '' });
} else {
    const [artist, album, track] = args;
    if (!artist || !album) {
        console.error('用法: node scripts/fetch-preview.mjs "<艺人>" "<专辑>" ["<曲名>"]');
        process.exit(1);
    }
    await one({ artist, album, track: track || '' });
}
