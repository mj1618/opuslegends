#!/usr/bin/env node
/**
 * node playtest/tokens.mjs [--level=src/level/index.ts#gameLevel] [--report=<dir or report.json>] [--sections=chorus]
 *
 * TOKENS vs THE MELODY (iteration 7, review iter6 fix 2): do the level's tokens SING the tune? Loads the real level +
 * song (Vite SSR, like rubric.mjs), takes every authored token (spills excluded), models when it SOUNDS the way
 * StageAudio.onToken does (a token picked up early sings ON its own beat, snapped to the triplet / swung-8th grid when
 * it sits within TOKEN_SFX.snapBeats of a grid point) and compares that with the `tokenMelody` lane's sung onsets:
 *
 *   on-onset   tokens sounding within ±60 ms of a sung onset (they double / harmonise the singer IN TIME)
 *   echo       tokens sounding 60 ms .. 1/3 beat + 60 ms AFTER a sung onset and on no onset (the late flam)
 *   coverage   sung notes with a token sounding within ±60 ms of their onset (target ≥ 60 % in the choruses)
 *
 * --report: a playtest report.json (or its dir) whose `lumsMissed` lists tokens the bot did NOT collect: those don't
 * count (a token off the hero's path sings nothing). Prints a table per song section and writes nothing.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const TOL_MS = Number(args.tol ?? 60);

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
let level, song, L, tempo, tokenGrid, snapBeats;
try {
  const [file, name] = String(args.level ?? 'src/level/index.ts#gameLevel').split('#');
  level = (await server.ssrLoadModule('/' + file))[name];
  const songMod = await server.ssrLoadModule('/src/audio/song.ts');
  song = songMod.songFromBeatmap(JSON.parse(readFileSync(join(root, `assets/audio/${level.songId}.beatmap.json`), 'utf8')), '');
  tempo = songMod.makeTempoMap(song);
  L = (await server.ssrLoadModule('/src/level/build.ts')).buildLevel(level, tempo, song);
  tokenGrid = (await server.ssrLoadModule('/src/audio/tokenMelody.ts')).tokenGrid;
  snapBeats = (await server.ssrLoadModule('/src/audio/mix.ts')).TOKEN_SFX.snapBeats;
} finally {
  await server.close();
}

let missed = new Set();
if (args.report) {
  let p = resolve(root, String(args.report));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'report.json');
  const rep = JSON.parse(readFileSync(p, 'utf8'));
  missed = new Set((rep.lumsMissed ?? []).map((b) => Math.round(b * 1000)));
}

const sound = (beat) => {
  const g = tokenGrid(beat - 0.5, song.swing).reduce((a, b) => (Math.abs(b - beat) < Math.abs(a - beat) ? b : a));
  return Math.abs(g - beat) <= snapBeats ? g : beat;
};
const ms = (a, b) => (tempo.beatToTime(a) - tempo.beatToTime(b)) * 1000;
const notes = song.lane('tokenMelody').beats ? song.lane('tokenMelody') : [];
const onsets = [...notes].map((n) => n.beat).sort((a, b) => a - b);
const toks = L.lums.filter((l) => !missed.has(Math.round(l.beat * 1000))).map((l) => ({ beat: l.beat, at: sound(l.beat) }));

const sections = (song.map?.sections ?? []).filter((s) => !args.sections || String(args.sections).split(',').some((k) => s.name.startsWith(k)));
const rows = [];
const tot = {};
for (const s of sections) {
  const ts = toks.filter((t) => t.at >= s.startBeat && t.at < s.endBeat);
  const ns = onsets.filter((b) => b >= s.startBeat && b < s.endBeat);
  let on = 0;
  let echo = 0;
  for (const t of ts) {
    const near = onsets.filter((b) => Math.abs(ms(t.at, b)) <= TOL_MS);
    if (near.length) on++;
    else if (onsets.some((b) => t.at > b && ms(t.at, b) > TOL_MS && t.at - b <= 1 / 3 + 0.17)) echo++;
  }
  const covered = ns.filter((b) => ts.some((t) => Math.abs(ms(t.at, b)) <= TOL_MS)).length;
  rows.push({ section: s.name, tokens: ts.length, on, echo, notes: ns.length, covered });
  const k = s.name.replace(/\d+$/, '');
  tot[k] ??= { tokens: 0, on: 0, echo: 0, notes: 0, covered: 0 };
  for (const f of ['tokens', 'on', 'echo', 'notes', 'covered']) tot[k][f] += rows[rows.length - 1][f];
}
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
console.log(`tokens vs tokenMelody (±${TOL_MS} ms${missed.size ? `, ${missed.size} uncollected tokens excluded` : ''})`);
console.log('| section | tokens | on-onset | echo | sung notes covered |');
console.log('|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.section} | ${r.tokens} | ${r.on} (${pct(r.on, r.tokens)}) | ${r.echo} (${pct(r.echo, r.tokens)}) | ${r.covered}/${r.notes} (${pct(r.covered, r.notes)}) |`);
for (const [k, r] of Object.entries(tot)) console.log(`| **${k}** (all) | ${r.tokens} | ${r.on} (${pct(r.on, r.tokens)}) | ${r.echo} (${pct(r.echo, r.tokens)}) | ${r.covered}/${r.notes} (${pct(r.covered, r.notes)}) |`);
if (args.json) console.log(JSON.stringify({ rows, tot }));
