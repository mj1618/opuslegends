#!/usr/bin/env node
/**
 * TOKEN TIMING PROBE (iteration 7): plays the REAL game (headless Chromium, the built dist) with bots and reads every
 * collected token's timing decision (`stage.tokenTrace`, audio/stage.ts): when it was picked up vs its own beat, the
 * beat its note sounded on, what it played against the singer (double / harmony / ornament / answer / chord) and how
 * late that sound is after the sung onset under it. Answers "do the tokens sound like a late echo of the singer?"
 *
 *   node src/audio/lab/tokenprobe.mjs [--dist=dist-audio] [--build] [--out=playtest/out-audio/tokens]
 *                                     [--runs=auto,sloppy:1,j130:1] [--start=<beat>]
 *
 * Echo = the token plays the singer's OWN note (double) or the lane's harmony for it more than ECHO_MS after he sang
 * it: a flam / echo instead of a doubling (identical onsets fuse within ~30 ms). Coverage = sung notes with a token
 * doubling / harmonising them on time. Sections from the lane's `section` tags. Also prints the ending's stings as they
 * played (`stage.endingLog`: THE END and the rank sting, seconds after the final hit). Needs the licensed recording.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const s = a.replace(/^--/, '');
    const i = s.indexOf('=');
    return i < 0 ? [s, true] : [s.slice(0, i), s.slice(i + 1)];
  }),
);
const dist = String(args.dist ?? 'dist-audio');
const out = resolve(root, String(args.out ?? 'playtest/out-audio/tokens'));
// a sung syllable's attack is soft (tens of ms): a token <= 40 ms after it still reads as together (fused), later = a flam / echo
const ECHO_MS = 40;
mkdirSync(out, { recursive: true });
if (args.build) execSync(`npx tsc --noEmit && npx vite build --outDir ${dist} --emptyOutDir`, { cwd: root, stdio: 'inherit' });

const PROFILES = {
  auto: {},
  sloppy: { sloppy: '1' },
  j130: { jitter: '130' },
  j85: { jitter: '85' },
};
const runs = String(args.runs ?? 'auto,sloppy:1,j130:1').split(',').map((r) => {
  const [p, seed] = r.split(':');
  return { name: r.replace(':', 's'), q: { ...PROFILES[p], ...(seed ? { seed } : {}) } };
});

const BMAP = JSON.parse(readFileSync(join(root, 'assets/audio/jim_edit.beatmap.json'), 'utf8'));
const NOTES = BMAP.lanes.tokenMelody;
const sectionAt = (b) => {
  let s = 'intro';
  for (const n of NOTES) {
    if (n.beat > b + 1) break;
    s = n.section ?? s;
  }
  return s;
};

const server = await preview({ root, logLevel: 'warn', preview: { port: 4190, strictPort: false, open: false }, build: { outDir: dist } });
const base = server.resolvedUrls?.local?.[0];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });

async function play(run) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const q = new URLSearchParams({ autoplay: '1', ...run.q, ...(args.start ? { start: String(args.start) } : {}) });
  await page.goto(`${base}?${q}`);
  await page.waitForFunction(() => window.__game && window.__game.state().scene === 'play', null, { timeout: 30000 });
  const deadline = Date.now() + 320000;
  while (Date.now() < deadline) {
    const st = await page.evaluate(() => window.__game.state());
    if (st.scene === 'end') break;
    await page.waitForTimeout(250);
  }
  // the ending's stings (iteration 7): when each played vs the final hit, and when the picture's poster/stamp came
  await page.waitForTimeout(6500);
  const ending = await page.evaluate(() => window.__game.game.stage.endingLog);
  console.log(`[${run.name}] ending stings:`, JSON.stringify(ending));
  const trace = await page.evaluate(() => window.__game.game.stage.tokenTrace);
  await page.close();
  return trace;
}

function summarize(trace) {
  const sec = new Map();
  const row = (s) => {
    if (!sec.has(s)) sec.set(s, { n: 0, own: 0, grid: 0, fused: 0, now: 0, double: 0, harmony: 0, ornament: 0, answer: 0, chord: 0, echo: 0, onTime: 0, lead: [], lag: [], covered: new Set() });
    return sec.get(s);
  };
  for (const t of trace) {
    const r = row(sectionAt(t.sound));
    r.n++;
    r[t.timing]++;
    r[t.role] = (r[t.role] ?? 0) + 1;
    if (t.own !== null) r.lead.push(Math.round((t.pickupBeat - t.own) * (60 / 163) * 1000));
    const sings = t.role === 'double' || t.role === 'harmony';
    // an echo: the singer's syllable (or its lane harmony) replayed late — or ANY token repeating that note's pitch late
    const samePitch = t.notePitch !== null && ((t.midi - t.notePitch) % 12 + 12) % 12 === 0;
    if (t.lagMs !== null && t.lagMs > ECHO_MS && (sings || samePitch)) r.echo++;
    if (sings && t.lagMs !== null && t.lagMs >= -70 && t.lagMs <= ECHO_MS) {
      r.onTime++;
      r.covered.add(t.noteBeat);
    }
    if (t.lagMs !== null) r.lag.push(t.lagMs);
  }
  const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const lines = [];
  lines.push('section        tokens  own fuse grid now | double harm orn answer chord | ECHO  on-time | covered/sung | pickup vs own (ms, median)');
  const sungIn = (s) => NOTES.filter((n) => n.section === s).length;
  let tot = { n: 0, echo: 0, sing: 0 };
  for (const [s, r] of [...sec.entries()].sort((a, b) => NOTES.findIndex((n) => n.section === a[0]) - NOTES.findIndex((n) => n.section === b[0]))) {
    const sing = r.double + r.harmony;
    tot.n += r.n;
    tot.echo += r.echo;
    tot.sing += sing;
    lines.push(
      `${s.padEnd(14)} ${String(r.n).padStart(6)} ${String(r.own).padStart(4)} ${String(r.fused).padStart(4)} ${String(r.grid).padStart(4)} ${String(r.now).padStart(3)} | ${String(r.double).padStart(6)} ${String(r.harmony).padStart(4)} ${String(r.ornament).padStart(3)} ${String(r.answer).padStart(6)} ${String(r.chord).padStart(5)} | ${String(pct(r.echo, r.n)).padStart(3)} %  ${String(pct(r.onTime, r.n)).padStart(4)} % | ${String(r.covered.size).padStart(3)}/${String(sungIn(s)).padEnd(3)} ${String(pct(r.covered.size, sungIn(s))).padStart(3)} % | ${med(r.lead)}`,
    );
  }
  lines.push(`TOTAL ${tot.n} tokens: echo ${pct(tot.echo, tot.n)} % of tokens (${tot.echo}), ${pct(tot.echo, tot.sing)} % of the singing ones`);
  return lines.join('\n');
}

const results = {};
try {
  for (const run of runs) {
    const t0 = Date.now();
    const trace = await play(run);
    results[run.name] = trace;
    writeFileSync(join(out, `${run.name}.json`), JSON.stringify(trace, null, 0));
    console.log(`\n== ${run.name} (${trace.length} tokens, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    console.log(summarize(trace));
  }
} finally {
  await browser.close();
  await server.close();
}
