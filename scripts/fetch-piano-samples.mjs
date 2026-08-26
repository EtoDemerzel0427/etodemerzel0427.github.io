#!/usr/bin/env node
/**
 * 抓一套钢琴采样到 public/travel/piano/。
 *
 *   node scripts/fetch-piano-samples.mjs
 *
 * 音源：Salamander Grand Piano（Alexander Holm，CC-BY 3.0），
 * 取自 nbrosowsky/tonejs-instruments 的 mp3 转码版。
 *
 * 每 6 个半音取一个样本，中间的音靠 playbackRate 变调补上（最多差 ±3 个
 * 半音，钢琴这个尺度上听不出来）。88 个键各存一个采样要 30MB，这样只要
 * 不到 1MB。
 *
 * 原样本每个 230~430KB —— 是完整的自然衰减，十几秒长。这里按音区裁短
 * 再转单声道 96k：低音留 6 秒、高音 2.5 秒，尾巴做淡出，接缝听不出来。
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const run = promisify(execFile);
const BASE = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/piano';
const OUT = resolve('public/travel/piano');
const TMP = resolve('public/travel/piano/.tmp');

/** [文件名, midi]。名字里的 s = sharp。每 6 个半音一个，A0(21) 到 C8(108)。 */
const SAMPLES = [
    // 这套里没有 A0/B0，最低到 C1；21~26 那几个键靠 C1 往下变调补
    ['C1', 24], ['Ds1', 27], ['A1', 33], ['Ds2', 39], ['A2', 45], ['Ds3', 51],
    ['A3', 57], ['Ds4', 63], ['A4', 69], ['Ds5', 75], ['A5', 81], ['Ds6', 87],
    ['A6', 93], ['Ds7', 99], ['C8', 108],
];

/** 低音拖得久，高音收得快 —— 裁多长按音高来 */
const seconds = (midi) => Math.max(2.2, 7.0 * Math.pow(0.5, (midi - 21) / 40));

await mkdir(TMP, { recursive: true });
const manifest = [];

for (const [name, midi] of SAMPLES) {
    const res = await fetch(`${BASE}/${name}.mp3`);
    if (!res.ok) { console.error('跳过', name, res.status); continue; }
    const raw = resolve(TMP, `${name}.mp3`);
    await writeFile(raw, Buffer.from(await res.arrayBuffer()));

    const dur = seconds(midi);
    const out = resolve(OUT, `${midi}.mp3`);
    await run('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', raw,
        '-t', String(dur),
        '-af', `afade=t=out:st=${(dur - 0.5).toFixed(2)}:d=0.5`,
        '-ac', '1', '-ar', '44100', '-b:a', '96k',
        out,
    ]);
    manifest.push(midi);
    console.log(`${name} (midi ${midi})  ${dur.toFixed(1)}s  → public/travel/piano/${midi}.mp3`);
}

await rm(TMP, { recursive: true, force: true });
console.log('\nmidi 列表（贴进 audio.js 的 PIANO_SAMPLES）：', JSON.stringify(manifest));
