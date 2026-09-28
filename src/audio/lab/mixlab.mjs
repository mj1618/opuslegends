#!/usr/bin/env node
/**
 * Offline mix lab runner: renders the real game audio graph (src/audio/lab/mixlab.ts) in headless Chromium's
 * OfflineAudioContext for a set of scripted scenarios, writes 4-channel float WAVs (ch 0-1 master out,
 * ch 2-3 pre-limiter) + meta JSON, then runs the analysis (tools/music/mix_report.py).
 *
 *   node src/audio/lab/mixlab.mjs [--out=playtest/out-audio/mixlab] [--only=full,booth] [--prefix=act3_,act2_] [--no-report]
 *
 * The act-2/3 scenes (`act3_*`, `act2_*`) are analysed by tools/music/stage_report.py (run after mix_report.py).
 *
 * Needs the licensed recording (assets/audio/licensed/jim_edit.ogg). Nothing it writes is committed.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
// ---- iteration 4: the level's audio cues (acts 2-3) through the real graph. Each scene renders three ways: the mix,
// `_music` (no SFX: record + overlays + the hush), `_cues` (the cue sounds alone: no music, no strikes/bells).
// Scenes use the REAL game level (src/level/index.ts) and a clean player (every breakable struck + smashed ON its
// beat, thrown bottles batted, firebombs / balls telegraphed) at FULL HOUSE.
const MUSIC = ['record', 'shouts', 'stomps', 'cowbell'];
const scene = (name, from, to, extra = {}) => {
  const base = { from, to, crowd: 24, ticks: true, level: true, levelEvents: true, ...extra };
  return [
    { name, ...base },
    { name: `${name}_music`, ...base, nosfx: true },
    { name: `${name}_cues`, ...base, mute: MUSIC, noStrikes: true },
    // the same play with only iteration 3's sounds (strikes + bells): what the stage sounds add
    { name: `${name}_legacy`, ...base, legacy: true },
  ];
};
SCENARIOS.push(
  ...scene('act3_break', 262, 278),
  // the same beat WITHOUT the hush (A/B: how deep the hush goes)
  { name: 'act3_break_nohush_music', from: 262, to: 278, crowd: 24, ticks: true, level: true, noHush: true, nosfx: true },
  // click test through the hush: a steady tone as the record, squeezed in and released
  { name: 'act3_break_tone', from: 262, to: 278, crowd: 24, ticks: true, level: true, tone: true, nosfx: true, mute: ['shouts', 'stomps', 'cowbell'] },
  // a mid-crowd player (no cowbell yet): the KRAK alone in the hush
  { name: 'act3_break_mid', from: 262, to: 278, crowd: 12, ticks: true, level: true, levelEvents: true },
  ...scene('act3_chorus', 270, 302),
  ...scene('act3_gauntlet', 298, 334),
  ...scene('act3_finale', 326, 360),
  ...scene('act2_mech', 196, 240),
);
// ---- iteration 6 ("feel"): the record full from beat 0 (the crowd now starts at 14), tokens singing the melody, the
// near-miss WHEW, the film canister, the goons' flares + stingers, the poster stings. `tools/music/feel_report.py`.
const BMAP = JSON.parse(readFileSync(join(root, 'assets/audio/jim_edit.beatmap.json'), 'utf8'));
/** a token on every melody-lane onset in [a, b) + one on every beat of the gaps (>= 1 beat from a sung note) */
const tokenEvents = (a, b) => {
  const notes = BMAP.lanes.tokenMelody.filter((n) => n.beat >= a && n.beat < b);
  const ev = notes.map((n) => ({ beat: n.beat, token: true }));
  for (let k = Math.ceil(a); k < b; k++) if (!notes.some((n) => Math.abs(n.beat - k) < 1 || (n.beat < k && n.endBeat > k - 0.5))) ev.push({ beat: k, token: true });
  return ev;
};
const MUSICSTEMS = ['record', 'shouts', 'stomps', 'cowbell'];
const feel = (name, base) => [
  { name, ...base },
  { name: `${name}_music`, ...base, nosfx: true },
  { name: `${name}_sfx`, ...base, mute: MUSICSTEMS },
];
SCENARIOS.push(
  // the run's first 32 beats as a first-timer hears them now (crowd 14 = the booth open) vs the old start (8)
  { name: 'feel_intro14', from: 0, to: 40, crowd: 14, ticks: true },
  { name: 'feel_intro14_record', from: 0, to: 40, crowd: 14, mute: ['shouts', 'stomps', 'cowbell'] },
  { name: 'feel_intro12', from: 0, to: 40, crowd: 12, ticks: true },
  { name: 'feel_intro8', from: 0, to: 40, crowd: 8, ticks: true },
  { name: 'feel_intro14_stomps', from: 0, to: 40, crowd: 14, mute: ['record', 'shouts', 'cowbell'] },
  { name: 'feel_intro14_shouts', from: 0, to: 40, crowd: 14, mute: ['record', 'stomps', 'cowbell'] },
  // verse 1 at 14 with a perfect-ish player climbing (bells), the whole chain
  { name: 'feel_verse14', from: 16, to: 80, crowd: 14, ticks: true, events: range(16, 80).map((beat) => ({ beat, grade: 'perfect' })) },
  // tokens singing: chorus 1 at FULL HOUSE, verse 1 at 14
  ...feel('feel_tok_chorus', { from: 84, to: 124, crowd: 20, ticks: true, events: tokenEvents(84, 124) }),
  ...feel('feel_tok_verse', { from: 16, to: 48, crowd: 14, ticks: true, events: tokenEvents(16, 48) }),
  // the REAL level's tokens (every lum laid in the level, picked up clean): acts 1 + 3's choruses and verse 1
  ...feel('feel_lvltok_act1', { from: 0, to: 132, crowd: 16, ticks: true, levelTokens: true }),
  ...feel('feel_lvltok_act3', { from: 270, to: 340, crowd: 22, ticks: true, levelTokens: true }),
  // near-miss WHEW (chorus 1 at FULL HOUSE), a film canister (turnaround B7 + verse E), goons smashed
  ...feel('feel_whew', { from: 88, to: 104, crowd: 20, ticks: true, events: [{ beat: 90.4, whew: true }, { beat: 97.3, whew: true }] }),
  ...feel('feel_canister', { from: 120, to: 140, crowd: 16, ticks: true, events: [{ beat: 125.3, canister: true }, { beat: 134.2, canister: true }] }),
  ...feel('feel_goons', {
    from: 84, to: 132, crowd: 16, ticks: true,
    events: [{ beat: 89, goon: 'stomps' }, { beat: 96, goon: 'cowbell' }, { beat: 101, goon: 'claps' }, { beat: 110, goon: 'cowbell' }, { beat: 124.4, goon: 'piano' }, { beat: 128, goon: 'shouts' }],
  }),
  // the stems alone with and without the goons (the flare depth)
  { name: 'feel_goons_stems', from: 84, to: 132, crowd: 16, nosfx: true, mute: ['record'], events: [{ beat: 89, goon: 'stomps' }, { beat: 96, goon: 'cowbell' }, { beat: 110, goon: 'cowbell' }, { beat: 128, goon: 'shouts' }] },
  { name: 'feel_goons_stems_ref', from: 84, to: 132, crowd: 16, nosfx: true, mute: ['record'] },
  // the finale into the poster, S and D (the applause re-levelled to the billing)
  ...['S', 'A', 'D'].map((L) => ({ name: `feel_poster_${L}`, from: 326, to: 362, crowd: 24, ticks: true, level: true, levelEvents: true, events: [{ beat: 347.5, poster: L }] })),
);
const only = args.only ? new Set(String(args.only).split(',')) : null;
const prefix = args.prefix ? String(args.prefix).split(',') : null;

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

// no HMR / file watching: other agents edit the tree while a render runs (a reload would kill the page)
const server = await createServer({ root, logLevel: 'error', server: { port: 5198, strictPort: false, hmr: false, watch: { ignored: ['**/*'] } } });
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
  if (prefix && !prefix.some((p) => sc.name.startsWith(p))) continue;
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
  const names = metas.map((m) => m.name);
  let status = 0;
  if (names.some((n) => !n.startsWith('act') && !n.startsWith('feel'))) status ||= spawnSync(py, [join(root, 'tools/music/mix_report.py'), out], { stdio: 'inherit' }).status ?? 1;
  if (names.some((n) => n.startsWith('act'))) status ||= spawnSync(py, [join(root, 'tools/music/stage_report.py'), out], { stdio: 'inherit' }).status ?? 1;
  if (names.some((n) => n.startsWith('feel'))) status ||= spawnSync(py, [join(root, 'tools/music/feel_report.py'), out], { stdio: 'inherit' }).status ?? 1;
  process.exit(status);
}
