#!/usr/bin/env node
/**
 * Offline mix lab runner: renders the real game audio graph (src/audio/lab/mixlab.ts) in headless Chromium's
 * OfflineAudioContext for a set of scripted scenarios, writes 4-channel float WAVs (ch 0-1 master out,
 * ch 2-3 pre-limiter) + meta JSON, then runs the analysis (tools/music/mix_report.py).
 *
 *   node src/audio/lab/mixlab.mjs [--out=playtest/out-audio/mixlab] [--only=full,booth] [--no-report]
 *
 * Needs the licensed recording (assets/audio/licensed/jim_edit.ogg). Nothing it writes is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const s = a.replace(/^--/, '');
    const i = s.indexOf('=');
    return i < 0 ? [s, true] : [s.slice(0, i), s.slice(i + 1)];
  }),
);
const out = resolve(String(args.out ?? join(root, 'playtest/out-audio/mixlab')));
mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- scenarios (edit beats; chorus 1 = 88..120)
const PRE = 80; // pre-chorus 1 (edit bars 21-22) into chorus 1 (bars 23-30) + tag (bar 31)
const END = 124;
const range = (a, b, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const perfects = (a, b) => range(a, b).map((beat) => ({ beat, grade: 'perfect' }));
const full = { from: PRE, to: END, crowd: 24, ticks: true };
// the player's journey: booth -> FULL HOUSE with Perfects (+1), a few Greats (+0.5), misses (-2), a stumble
const journey = (() => {
  const ev = [];
  let c = 3;
  for (const beat of range(56, 120)) {
    if ([70, 71, 95, 109].includes(beat)) {
      ev.push({ beat, miss: true });
      c = Math.max(3, c - 2);
    } else if (beat === 101) {
      ev.push({ beat, stumble: true });
      c = Math.max(3, Math.floor(c * 0.75));
    } else if (beat % 5 === 3) {
      ev.push({ beat, grade: 'great' });
      c += 0.5;
    } else {
      ev.push({ beat, grade: 'perfect' });
      c += 1;
    }
    ev.push({ beat, crowd: Math.min(24, c) });
  }
  ev.push({ beat: 64, checkpoint: true });
  return ev;
})();
const SCENARIOS = [
  // references: the record alone through the chain, booth open (crowd 14: overlays muted)
  { name: 'record_open', from: PRE, to: END, crowd: 14, mute: ['shouts', 'stomps', 'cowbell'] },
  { name: 'record_booth', from: PRE, to: END, crowd: 3, mute: ['shouts', 'stomps', 'cowbell'] },
  // the booth as heard at the start of a run (crowd 3, all stems at their crowd-3 gains)
  { name: 'booth', from: PRE, to: END, crowd: 3 },
  // the projector bed alone (clatter + crackle at crowd 3)
  { name: 'bed', from: PRE, to: END, crowd: 3, mute: ['record', 'shouts', 'stomps', 'cowbell'] },
  { name: 'mid', from: PRE, to: END, crowd: 10 },
  // FULL HOUSE: overlays up, gap cheers, a Perfect bell on every beat of the chorus
  { name: 'full', ...full, events: perfects(88, 120) },
  { name: 'full_nosfx', ...full, ticks: false },
  // FULL HOUSE components (pre-limiter channels are linear): each alone, same chain state
  { name: 'full_record', ...full, ticks: false, mute: ['shouts', 'stomps', 'cowbell'] },
  { name: 'full_cowbell', ...full, ticks: false, mute: ['record', 'shouts', 'stomps'] },
  { name: 'full_stomps', ...full, ticks: false, mute: ['record', 'shouts', 'cowbell'] },
  { name: 'full_shouts', ...full, ticks: false, mute: ['record', 'stomps', 'cowbell'] },
  { name: 'full_cheers', ...full, mute: ['record', 'shouts', 'stomps', 'cowbell'] },
  { name: 'full_bells', ...full, ticks: false, mute: ['record', 'shouts', 'stomps', 'cowbell'], events: perfects(88, 120) },
  { name: 'journey', from: 52, to: END, crowd: 3, ticks: true, events: journey },
  { name: 'journey_sfx', from: 52, to: END, crowd: 3, ticks: true, events: journey, mute: ['record', 'shouts', 'stomps', 'cowbell'] },
  // click test: a steady two-tone instead of the record through the whole journey (moves, snags, warble)
  { name: 'clicktest', from: 52, to: END, crowd: 3, events: journey.filter((e) => !e.grade && !e.checkpoint), tone: true, nosfx: true, mute: ['shouts', 'stomps', 'cowbell'] },
];
const only = args.only ? new Set(String(args.only).split(',')) : null;

function wav(path, sr, chans) {
  const n = chans[0].length;
  const nc = chans.length;
  const buf = Buffer.alloc(44 + n * nc * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * nc * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float
  buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * nc * 4, 28);
  buf.writeUInt16LE(nc * 4, 32);
  buf.writeUInt16LE(32, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * nc * 4, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++, o += 4) buf.writeFloatLE(chans[c][i], o);
  writeFileSync(path, buf);
}

const server = await createServer({ root, logLevel: 'error', server: { port: 5198, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && console.log('[console]', m.text()));
await page.goto(`${base}src/audio/lab/mixlab.html`);
await page.waitForFunction(() => window.__mixlab, null, { timeout: 30000 });
const metas = [];
for (const sc of SCENARIOS) {
  if (only && !only.has(sc.name)) continue;
  const t = Date.now();
  const r = await page.evaluate((s) => window.__mixlab.render(s), sc);
  const chans = r.channels.map((b64) => {
    const b = Buffer.from(b64, 'base64');
    return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  });
  wav(join(out, `${sc.name}.wav`), r.sr, chans);
  metas.push({ ...r.meta, scenario: sc });
  console.log(`rendered ${sc.name} (${(chans[0].length / r.sr).toFixed(1)} s) in ${Date.now() - t} ms; samples=${r.meta.samples}`);
}
writeFileSync(join(out, 'meta.json'), JSON.stringify(metas, null, 1));
await browser.close();
await server.close();
if (!args['no-report']) {
  const py = join(root, 'tools/music/.venv/bin/python');
  const r = spawnSync(py, [join(root, 'tools/music/mix_report.py'), out], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
