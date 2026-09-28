#!/usr/bin/env node
/**
 * npm run rubric [-- options]
 *
 * FUN RUBRIC meter (docs/FUN_RUBRIC.md part (b)). Loads the REAL level + song modules through Vite's
 * SSR loader (no browser), builds the RuntimeLevel exactly like the game does, and measures every
 * criterion that is computable from level data (L), plus the sloppy-bot ones (S/J) when playtest
 * report.json files are supplied. Writes <out>/rubric.json and <out>/rubric.md and prints the markdown.
 * Works for any bar range (the 33-bar slice now, the 96-bar level later).
 *
 * Options:
 *   --level=<file>#<export>   level module (default src/level/slice.ts#sliceLevel)
 *   --song=<file>#<export>    SongDef the level is built against, or a beatmap.json path (loaded with songFromBeatmap).
 *                             Default: assets/audio/<level.songId>.beatmap.json if it exists, else the placeholder song
 *   --beatmap=<json>          extra accent lanes + section energy (default: the song's beatmap json, else
 *                             assets/audio/jim.beatmap.json if present)
 *   --reports=<dir>[,<dir>]   playtest output dirs (searched recursively for report.json) → A5, A9, A10, A11 (teeth)
 *   --block=<bars>            analysis block size in bars (default 8)
 *   --bars=<A>-<B>            judge only edit bars A..B (1-based) of the level, e.g. --level=src/level/index.ts#gameLevel
 *                             --bars=34-60 for act 2 (novelty still sees the earlier bars; opening rules only for bar 1)
 *   --out=<dir>               output dir (default playtest/out/rubric; gitignored, wiped by the next playtest run)
 *   --quiet                   don't print the markdown
 *
 * Definitions (FUN_RUBRIC (b)):
 *   action  = an intended action. lethal = failKind death, stumble = failKind stumble, reward = failKind none.
 *   verb    = hop (∪, jump hold < 0.5), jump (–, held), strike (X), slide (═).
 *   kind    = what the action is aimed at: gap, gap-long, spike, jabber, pendulum, pendulum-high, pendulum-big,
 *             slam (a hop onto/off a slam platform), lumArc (a free hop through tokens), pool, …
 *   bar signature = sorted list of (offset in bar rounded to 1/6 beat, verb, kind). Kind encodes the threat flag.
 *   rhythm   = the bar's onset set only (offsets rounded to 1/6).
 *   accents  = kick, floortom, snare, crash, shouts, stop edges, slots, fillAccents, riff, gtrRiff, sustain starts,
 *              stabs (±1/12 beat). STRONG accents = what a lethal threat should sit on (rubric (d) threat ladder):
 *              the boom (beats 1 and 3 of the bar: kick in the stomp arrangement AND in the original's
 *              two-beat groove), crash, shouts/HEY, band stabs, slots, fillAccents.
 *              The level's own song lanes win; the beatmap only fills lanes the song lacks.
 *   hand pattern = the bar's (offset, verb, hold) list WITHOUT the hazard kind: what the player's hands do.
 *   intensity(bar) = 3·lethal + 1.5·stumble + 0.5·reward + 2·[new element in the bar].
 *   isochronous run = ≥ 3 threat actions of one verb+kind at a 1-beat interval (slam lifts): for A2/A3/A6 the
 *              rubric counts such a run (≤ 8) as ONE threat. Both raw and adjusted numbers are reported.
 *   blocks   = BLOCK-bar sections from the level's first bar; a trailing remainder shorter than BLOCK/2 bars
 *              (e.g. the 33rd bar of a 33-bar act) is merged into the previous block instead of being judged
 *              as a 1-bar "section".
 *   design tags (level items, ignored by the game): `mode` (traversal mode from a beat → B6, novelty) and
 *              `follows` (lead lane from a beat → B7). Without tags, modes are inferred (lifts / ground).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
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
const BLOCK = Number(args.block ?? 8);
const outDir = resolve(root, String(args.out ?? 'playtest/out/rubric'));
const TOL = 1 / 12 + 1e-6;

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '—');
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

// ------------------------------------------------------------------ load the real modules
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
const load = async (spec, dflt) => {
  const [file, name] = String(spec ?? dflt).split('#');
  const mod = await server.ssrLoadModule('/' + file.replace(/^\.?\//, ''));
  return name ? mod[name] : mod.default;
};
let level, song, L, tempo, Tun, cameraZoomAt, VIEW_W, FRAMING;
try {
  level = await load(args.level, 'src/level/slice.ts#sliceLevel');
  const songMod = await server.ssrLoadModule('/src/audio/song.ts');
  if (!args.song && level.songId && existsSync(join(root, `assets/audio/${level.songId}.beatmap.json`))) args.song = `assets/audio/${level.songId}.beatmap.json`;
  if (args.song && String(args.song).endsWith('.json')) {
    song = songMod.songFromBeatmap(JSON.parse(readFileSync(resolve(root, String(args.song)), 'utf8')), '');
  } else {
    song = await load(args.song, 'src/audio/placeholderSong.ts#placeholderSong');
  }
  const build = await server.ssrLoadModule('/src/level/build.ts');
  cameraZoomAt = build.cameraZoomAt;
  Tun = (await server.ssrLoadModule('/src/game/tunables.ts')).Tun;
  VIEW_W = (await server.ssrLoadModule('/src/engine/display.ts')).VIEW_W ?? 1920;
  // the render-owned framing (camera.ts FRAMING: extra zoom + hero lead) is what the player actually sees
  try {
    FRAMING = (await server.ssrLoadModule('/src/render/camera.ts')).FRAMING;
  } catch {
    FRAMING = undefined;
  }
  tempo = songMod.makeTempoMap(song);
  L = build.buildLevel(level, tempo, song);
} finally {
  await server.close();
}

const beatmapPath = args.beatmap ? resolve(root, String(args.beatmap)) : args.song && String(args.song).endsWith('.json') ? resolve(root, String(args.song)) : join(root, 'assets/audio/jim.beatmap.json');
const beatmap = existsSync(beatmapPath) ? JSON.parse(readFileSync(beatmapPath, 'utf8')) : null;

// ------------------------------------------------------------------ musical grid
const BPB = song.beatsPerBar ?? 4;
const bpm = tempo.bpmAtBeat(level.startBeat);
const spb = 60 / bpm;
// --bars=A-B (1-based, the edit's bar numbers): judge only that range of the level (e.g. one act) while novelty
// ("is this new?") still sees everything before it
const barRange = args.bars ? String(args.bars).split('-').map(Number) : null;
const levelFirstBar = Math.floor(level.startBeat / BPB);
const firstBar = barRange ? Math.max(levelFirstBar, barRange[0] - 1) : levelFirstBar;
const lastBar = Math.min(Math.ceil(L.finishBeat / BPB) - 1, barRange ? barRange[1] - 1 : Infinity); // bar containing the last playable beat
const nBars = lastBar - firstBar + 1;
const rangeStart = firstBar * BPB;
const rangeEnd = Math.min(L.finishBeat, (lastBar + 1) * BPB);
/** the level-OPENING rules (reward-heavy first 16 bars, no lethal in bars 1–6) only apply to a range that starts the song;
 *  a mid-song act (--bars, or a standalone act like src/level/act2.ts#act2Level) is judged like the middle of the level */
const opensSong = firstBar === 0;
const barOf = (beat) => Math.floor(beat / BPB + 1e-9);

// lanes: the level's song lanes + the beatmap's (same bar grid)
const lanes = {};
const addLane = (name, evs) => {
  for (const e of evs ?? []) {
    const beat = typeof e === 'number' ? e : e.beat;
    if (typeof beat !== 'number') continue;
    (lanes[name] ??= []).push({ ...e, beat });
  }
};
// the level's own song wins per lane; the beatmap only fills lanes the song doesn't define (kick, crash, …)
for (const [k, v] of Object.entries(song.map?.lanes ?? {})) addLane(k, v);
if (beatmap) for (const [k, v] of Object.entries(beatmap.lanes ?? {})) if (!lanes[k]) addLane(k, v);
const stopRanges = (lanes.stops ?? []).map((s) => [s.beat, s.beat + (s.beats ?? (s.dur ? s.dur / spb : 1))]);
const ACCENT_LANES = ['kick', 'floortom', 'snare', 'crash', 'shouts', 'slots', 'fillAccents', 'riff', 'gtrRiff', 'stabs'];
const accentBeats = [];
for (const n of ACCENT_LANES) for (const e of lanes[n] ?? []) accentBeats.push(e.beat);
for (const e of lanes.sustains ?? []) accentBeats.push(e.beat);
for (const [a, b] of stopRanges) accentBeats.push(a, b);
const strongBeats = [];
for (const n of ['crash', 'shouts', 'stabs', 'slots', 'fillAccents']) for (const e of lanes[n] ?? []) strongBeats.push(e.beat);
const allLaneBeats = Object.values(lanes).flatMap((evs) => evs.map((e) => e.beat));
const near = (list, beat) => list.some((b) => Math.abs(b - beat) <= TOL);
const inBar = (beat) => beat - barOf(beat) * BPB; // 0-based offset in bar
const isBoom = (beat) => {
  const o = inBar(beat);
  return Math.abs(o - 0) <= TOL || Math.abs(o - 2) <= TOL;
};
const onAccent = (beat) => near(accentBeats, beat);
const onStrong = (beat) => isBoom(beat) || near(strongBeats, beat);
// members of an isochronous run (slam lifts on the stomp) inherit the run head's placement

// sections: song sections clipped to the level, split into BLOCK-bar blocks
const songSections = (song.map?.sections ?? []).slice().sort((a, b) => a.startBeat - b.startBeat);
const sectionAt = (beat) => songSections.find((s) => beat >= s.startBeat && beat < s.endBeat)?.name ?? '?';
const energyOf = (name) => beatmap?.sections?.find((s) => s.name === name)?.energy;
const classOf = (name) =>
  /intro/i.test(name) ? 'intro' : /pre|verse/i.test(name) ? 'verse' : /chorus|final|drop/i.test(name) ? 'chorus' : /build/i.test(name) ? 'build' : /break|breath|valley/i.test(name) ? 'valley' : /outro|gauntlet/i.test(name) ? 'climax' : 'verse';

// ------------------------------------------------------------------ classify actions
const itemByAction = new Map();
const poolBeats = [];
for (const it of level.items) {
  if (it.action) itemByAction.set(`${it.action.type}@${it.action.beat}`, it);
  if (it.type === 'floor' && it.h < 0) poolBeats.push(it.from);
}
const slamBeats = new Set(L.slams.map((s) => s.beat));
const verbOf = (a) => (a.type === 'strike' ? 'strike' : a.type === 'slide' ? 'slide' : (a.hold ?? 1) >= 0.5 ? 'jump' : 'hop');
const GLYPH = { hop: '∪', jump: '–', strike: 'X', slide: '═' };
const kindOf = (a) => {
  const it = itemByAction.get(`${a.type}@${a.beat}`);
  const t = it?.type ?? a.source;
  if (t === 'gap') return verbOf(a) === 'jump' ? 'gap-long' : 'gap';
  if (t === 'thrown') return it?.style === 'firebomb' ? 'firebomb' : 'thrown'; // two shapes: a bottle to bat, flames to hop
  if (t === 'pendulum') return it?.high ? 'pendulum-high' : it?.big ? 'pendulum-big' : 'pendulum';
  if (t === 'breakable') return it?.high ? 'breakable-high' : it?.giant ? 'breakable-giant' : it?.big ? 'breakable-big' : 'breakable';
  if (t === 'action' && a.type === 'jump' && (slamBeats.has(a.beat) || slamBeats.has(a.beat + 1))) return a.failKind === 'death' ? 'slam' : 'slam-safe';
  if (t === 'action' && a.type === 'jump' && poolBeats.some((p) => Math.abs(p - (a.beat + 0.22)) < 0.05 || Math.abs(p - (a.beat + 0.3)) < 0.05)) return 'pool';
  if (t === 'action') return a.type === 'jump' ? 'lumArc' : 'free';
  return t;
};
const allActions = L.actions
  .filter((a) => a.beat >= level.startBeat - 1e-6 && a.beat < L.finishBeat - 1e-6)
  .map((a) => {
    const verb = verbOf(a);
    const kind = kindOf(a);
    const cls = a.failKind === 'death' ? 'lethal' : a.failKind === 'stumble' ? 'stumble' : 'reward';
    return { beat: a.beat, bar: barOf(a.beat), off: inBar(a.beat), verb, kind, cls, threat: cls !== 'reward', phrase: a.phrase >= 0, hold: a.hold };
  });

const actions = allActions.filter((a) => a.beat >= rangeStart - 1e-6 && a.beat < rangeEnd - 1e-6);
// isochronous threat runs (slam lifts etc.): ≥3 same verb+kind threats at exactly 1-beat spacing
const isoRunId = new Map();
{
  const thr = actions.filter((a) => a.threat);
  let run = [];
  const flush = () => {
    if (run.length >= 3 && run.length <= 8) run.forEach((a, i) => isoRunId.set(a, { head: run[0], i }));
    run = [];
  };
  for (const a of thr) {
    const p = run[run.length - 1];
    if (p && Math.abs(a.beat - p.beat - 1) < 1e-6 && a.verb === p.verb && a.kind === p.kind) run.push(a);
    else {
      flush();
      run = [a];
    }
  }
  flush();
}
const countsAsThreat = (a) => a.threat && (!isoRunId.has(a) || isoRunId.get(a).i === 0);

// ------------------------------------------------------------------ novelty timeline (first appearance of each element)
const novelty = [];
const seen = new Set();
const note = (key, beat, type, what) => {
  if (seen.has(key)) return;
  seen.add(key);
  novelty.push({ bar: barOf(beat), beat, type, what });
};
for (const a of allActions) {
  note('verb:' + a.verb, a.beat, 'verb', a.verb);
  note('kind:' + a.kind, a.beat, 'mechanic', a.kind + (a.threat ? ` (${a.cls})` : ' (reward)'));
  note(`combo:${a.kind}:${a.cls}`, a.beat, 'variation', `${a.kind} as ${a.cls}`);
  if (a.phrase) note('phrase', a.beat, 'mechanic', 'Hup-Hup-HEY phrase');
}
// cell-level variations: a new 2-action cell (verb+kind pair on consecutive beats) is a (weak) twist
for (let i = 1; i < allActions.length; i++) {
  const p = allActions[i - 1];
  const a = allActions[i];
  if (a.beat - p.beat > 1.01) continue;
  note(`cell:${p.verb}${p.kind}>${a.verb}${a.kind}`, a.beat, 'cell', `${GLYPH[p.verb]}${p.kind} → ${GLYPH[a.verb]}${a.kind}`);
}
for (const it of level.items) {
  if (it.type === 'platform') note('route:high', it.from, 'mode', 'optional high route (awning)');
  if (it.type === 'chaser') note('chaser', it.beat, 'set-piece', 'the Burn (chaser) rises');
  if (it.type === 'setPiece') note('setPiece:' + it.name, it.beat, 'set-piece', `set-piece: ${it.name}`);
  if (it.type === 'sky' && it.beat >= level.startBeat) note('sky:' + it.preset, it.beat, 'context', `sky → ${it.preset}`);
  if (it.type === 'ground') note('ground:' + it.style, Math.max(it.beat, level.startBeat), 'context', `ground → ${it.style}`);
}
if (L.slams.length) note('mode:lifts', L.slams[0].beat, 'mode', 'slam lifts');
const modeTags = level.items.filter((it) => it.type === 'mode').sort((a, b) => a.beat - b.beat);
for (const m of modeTags) if (m.beat >= level.startBeat - 1e-6) note('mode:' + m.mode, m.beat, 'mode', `mode → ${m.mode}`);
const followTags = level.items.filter((it) => it.type === 'follows').sort((a, b) => a.beat - b.beat);
const followsAt = (beat) => {
  let lane = null;
  for (const f of followTags) if (f.beat <= beat + 1e-6) lane = f.lane;
  return lane;
};
novelty.sort((a, b) => a.beat - b.beat);
const BIG_NOVELTY = new Set(['mechanic', 'mode', 'set-piece']);
const TWIST_NOVELTY = new Set(['mechanic', 'mode', 'set-piece', 'variation', 'verb']);

// ------------------------------------------------------------------ traversal mode per bar
const modeOfBar = (bar) => {
  const b0 = bar * BPB;
  if (modeTags.length) {
    // explicit tags: the mode in effect at mid-bar (a mode that starts and ends inside the bar still counts)
    let m = modeTags[0].mode;
    for (const t of modeTags) if (t.beat <= b0 + BPB / 2 + 1e-6) m = t.mode;
    const inside = modeTags.filter((t) => t.beat > b0 + 1e-6 && t.beat < b0 + BPB - 1e-6).map((t) => t.mode);
    return inside.includes('launch') ? 'launch' : m;
  }
  if (L.slams.some((s) => s.beat >= b0 - 0.5 && s.beat < b0 + BPB)) return 'lifts';
  return 'ground';
};
const VERTICAL_MODES = new Set(['rooftops', 'bar-top', 'launch', 'climb', 'vertical', 'drop']);

// ------------------------------------------------------------------ per-bar table
// E1 runway = screen width ahead of the hero at the level zoom x the render framing (FRAMING.zoomMul, leadFraction).
// Ignores the director's chorus zoom-out (only widens) and hit punches (brief).
const leadFrac = FRAMING?.leadFraction ?? Tun.camera.leadFraction;
const zoomMul = FRAMING?.zoomMul ?? 1;
const runwayBeatsAt = (beat) => ((1 - leadFrac) * VIEW_W) / (cameraZoomAt(L, beat, Tun.camera.zoom) * zoomMul) / L.ppb;
const bars = [];
for (let bar = firstBar; bar <= lastBar; bar++) {
  const acts = actions.filter((a) => a.bar === bar);
  const lethal = acts.filter((a) => a.cls === 'lethal').length;
  const stumble = acts.filter((a) => a.cls === 'stumble').length;
  const reward = acts.filter((a) => a.cls === 'reward').length;
  const lethalAdj = acts.filter((a) => a.cls === 'lethal' && countsAsThreat(a)).length;
  const stumbleAdj = acts.filter((a) => a.cls === 'stumble' && countsAsThreat(a)).length;
  const sig = acts
    .map((a) => `${Math.round(a.off * 6) / 6}${GLYPH[a.verb]}${a.kind}`)
    .sort()
    .join(' ');
  const hand = acts
    .map((a) => `${Math.round(a.off * 6) / 6}${GLYPH[a.verb]}`)
    .sort()
    .join(' ');
  const rhythm = [...new Set(acts.map((a) => Math.round(a.off * 6) / 6))].sort((x, y) => x - y).join(',');
  const isNew = novelty.some((n) => n.bar === bar && n.type !== 'cell' && n.type !== 'context');
  bars.push({
    bar,
    section: sectionAt(bar * BPB),
    n: acts.length,
    lethal,
    stumble,
    reward,
    lethalAdj,
    stumbleAdj,
    sig: sig || '(empty)',
    rhythm: rhythm || '(rest)',
    hand: hand || '(rest)',
    mode: modeOfBar(bar),
    breather: lethal === 0 && stumble <= 1,
    intensity: 3 * lethal + 1.5 * stumble + 0.5 * reward + 2 * (isNew ? 1 : 0),
    verbs: acts.map((a) => GLYPH[a.verb]).join(''),
    kinds: acts.map((a) => a.kind),
  });
}
const barRow = (bar) => bars.find((b) => b.bar === bar);

// ------------------------------------------------------------------ blocks (sections)
const blocks = [];
const blockStarts = [];
for (let b = firstBar; b <= lastBar; b += BLOCK) blockStarts.push(b);
// a trailing remainder shorter than half a block joins the previous block
if (blockStarts.length > 1 && lastBar + 1 - blockStarts[blockStarts.length - 1] < BLOCK / 2) blockStarts.pop();
const blockLen = (b) => {
  const i = blockStarts.indexOf(b);
  return i < blockStarts.length - 1 ? blockStarts[i + 1] - b : lastBar + 1 - b;
};
for (const b of blockStarts) {
  const BL = blockLen(b);
  const bs = bars.filter((x) => x.bar >= b && x.bar < b + BL);
  const acts = actions.filter((a) => a.bar >= b && a.bar < b + BL);
  const beats = bs.length * BPB;
  // the section covering most of the block's bars (ties: the first bar's) — an 11-bar pre-chorus+chorus block is a chorus
  const secCount = {};
  for (let x = b; x < b + BL; x++) secCount[sectionAt(x * BPB)] = (secCount[sectionAt(x * BPB)] ?? 0) + 1;
  const name = Object.entries(secCount).reduce((best, e) => (e[1] > best[1] ? e : best), [sectionAt(b * BPB), secCount[sectionAt(b * BPB)]])[0];
  const threats = acts.filter((a) => a.threat);
  const lethals = acts.filter((a) => a.cls === 'lethal');
  // signatures
  const sigCount = {};
  for (const x of bs) sigCount[x.sig] = (sigCount[x.sig] ?? 0) + 1;
  let maxRepeat = 1;
  for (let i = 1, run = 1; i < bs.length; i++) {
    run = bs[i].sig === bs[i - 1].sig ? run + 1 : 1;
    maxRepeat = Math.max(maxRepeat, run);
  }
  const two = {};
  for (let i = 0; i + 1 < bs.length; i++) {
    const k = bs[i].sig + ' | ' + bs[i + 1].sig;
    two[k] = (two[k] ?? 0) + 1;
  }
  const rhythms = new Set(bs.map((x) => x.rhythm));
  const handCount = {};
  for (const x of bs) handCount[x.hand] = (handCount[x.hand] ?? 0) + 1;
  const actionBeats = new Set(acts.map((a) => Math.floor(a.beat + 1e-6)));
  let restBeats = 0;
  for (let beat = b * BPB; beat < (b + bs.length) * BPB; beat++) if (!actionBeats.has(beat)) restBeats++;
  const quarterBars = bs.filter((x) => x.rhythm === '0,1,2,3').length;
  // verbs
  const verbCount = {};
  for (const a of acts) verbCount[a.verb] = (verbCount[a.verb] ?? 0) + 1;
  const [leadVerb, leadN] = Object.entries(verbCount).sort((p, q) => q[1] - p[1])[0] ?? ['—', 0];
  const maxRun = (list) => {
    let m = 0;
    let run = 0;
    let prev = null;
    for (const a of list) {
      run = a.verb === prev ? run + 1 : 1;
      prev = a.verb;
      m = Math.max(m, run);
    }
    return m;
  };
  // threat walls (consecutive integer beats that carry a threat)
  const wall = (pred) => {
    const tb = new Set(acts.filter(pred).map((a) => Math.floor(a.beat + 1e-6)));
    let m = 0;
    let run = 0;
    for (let beat = b * BPB; beat < (b + BL) * BPB; beat++) {
      run = tb.has(beat) ? run + 1 : 0;
      m = Math.max(m, run);
    }
    return m;
  };
  // runway + clutter
  const runway = threats.length ? Math.min(...threats.map((a) => runwayBeatsAt(a.beat))) : runwayBeatsAt(b * BPB);
  let clutter = 0;
  for (const a of threats) {
    const w = runwayBeatsAt(a.beat);
    clutter = Math.max(clutter, threats.filter((t) => t.beat >= a.beat - 1e-6 && t.beat <= a.beat + w).length);
  }
  // camera events
  const inBlock = (beat) => beat >= b * BPB && beat < (b + BL) * BPB;
  const camEvents = L.cameraCues.filter((c) => inBlock(c.beat)).length + L.fx.filter((f) => inBlock(f.beat) && (f.fx === 'zoom' || f.fx === 'shake')).length;
  // sawtooth
  const ints = bs.map((x) => x.intensity);
  const blockMean = mean(ints);
  const peakIdx = ints.indexOf(Math.max(...ints));
  const sawtooth = bs.length >= 4 && peakIdx >= bs.length - 3 && mean(ints.slice(0, 2)) < blockMean;
  // phrase payoff: 4th bar of each 4-bar phrase
  const payoffs = [];
  for (let p = b; p < b + BL; p += 4) {
    const pb = p + 3;
    if (pb > lastBar) continue;
    const a4 = actions.filter((a) => a.bar === pb);
    const has =
      a4.some((a) => a.kind === 'pendulum-big' || (a.phrase && a.verb === 'strike')) ||
      L.fx.some((f) => barOf(f.beat) === pb) ||
      L.cameraCues.some((c) => barOf(c.beat) === pb);
    payoffs.push({ bar: pb, payoff: has });
  }
  blocks.push({
    name,
    cls: classOf(name),
    bars: `${b}-${Math.min(b + BL - 1, lastBar)}`,
    firstBar: b,
    follows: followsAt(b * BPB),
    nBars: bs.length,
    energy: energyOf(name) ?? null,
    actions: acts.length,
    actionsPerBeat: acts.length / beats,
    rewardShare: acts.length ? acts.filter((a) => a.cls === 'reward').length / acts.length : NaN,
    lethalPerBar: lethals.length / bs.length,
    lethalPerBarAdj: acts.filter((a) => a.cls === 'lethal' && countsAsThreat(a)).length / bs.length,
    maxLethalInBar: Math.max(...bs.map((x) => x.lethal)),
    threatsPerBar: threats.length / bs.length,
    threatsPerBarAdj: acts.filter(countsAsThreat).length / bs.length,
    lethalOnAccent: lethals.length ? lethals.filter((a) => onAccent(a.beat)).length / lethals.length : NaN,
    lethalOnStrong: lethals.length ? lethals.filter((a) => onStrong(a.beat)).length / lethals.length : NaN,
    stumbleOnAccent: acts.filter((a) => a.cls === 'stumble').length ? acts.filter((a) => a.cls === 'stumble' && onAccent(a.beat)).length / acts.filter((a) => a.cls === 'stumble').length : NaN,
    wallRaw: wall((a) => a.threat),
    wallAdj: wall(countsAsThreat),
    distinctSigs: Object.keys(sigCount).length,
    maxSigShare: Math.max(...Object.values(sigCount)) / bs.length,
    maxRepeat,
    max2BarRepeat: Math.max(0, ...Object.values(two)),
    distinctRhythms: rhythms.size,
    distinctHands: Object.keys(handCount).length,
    topHand: Object.entries(handCount).sort((p, q) => q[1] - p[1])[0],
    restBeats,
    quarterNoteBars: quarterBars,
    offbeatActions: acts.filter((a) => Math.abs(a.off - Math.round(a.off)) > TOL).length,
    verbShare: Object.fromEntries(Object.entries(verbCount).map(([k, v]) => [k, v / acts.length])),
    leadVerb,
    leadVerbShare: acts.length ? leadN / acts.length : NaN,
    maxSameVerbRun: maxRun(acts),
    maxSameVerbRunRequired: maxRun(acts.filter((a) => a.threat)),
    kinds: [...new Set(acts.map((a) => a.kind))],
    modes: [...new Set(bs.map((x) => x.mode))],
    breatherBars: bs.filter((x) => x.breather).map((x) => x.bar),
    intensity: blockMean,
    intensityByBar: ints,
    sawtooth,
    payoffs,
    cameraEvents: camEvents,
    runwayBeats: runway,
    runwaySec: runway * spb,
    clutterMax: clutter,
    novelty: novelty.filter((n) => n.bar >= b && n.bar < b + BL && n.type !== 'cell').map((n) => `${n.bar}: ${n.what}`),
  });
}

// ------------------------------------------------------------------ level-wide measures
const all = actions;
const lethalAll = all.filter((a) => a.cls === 'lethal');
const stumbleAll = all.filter((a) => a.cls === 'stumble');
const rewardShareAll = all.filter((a) => a.cls === 'reward').length / all.length;

// A7 safe re-entry
const reentry = L.checkpoints
  .filter((c) => c.beat >= rangeStart && c.beat < rangeEnd)
  .map((c) => {
    const early = all.filter((a) => a.threat && a.beat >= c.beat - 1e-6 && a.beat < c.beat + 2);
    const blk = blocks.find((k) => barOf(c.beat) >= k.firstBar && barOf(c.beat) < k.firstBar + k.nBars);
    const first = barRow(barOf(c.beat));
    return { checkpointBar: barOf(c.beat), threatsInFirst2Beats: early.map((a) => `${a.kind}@${a.beat}`), firstBarIntensity: first?.intensity, sectionMean: blk?.intensity };
  });
// A8 teach before threat
const teach = [];
{
  const LETHAL_FAMILY = { gap: 'pit', 'gap-long': 'pit', slam: 'lift', 'slam-safe': 'lift', pool: 'pit' };
  const families = new Map();
  for (const a of all) {
    const fam = LETHAL_FAMILY[a.kind] ?? a.kind;
    if (!families.has(fam)) families.set(fam, { family: fam, first: a, firstLethal: null });
    const f = families.get(fam);
    if (a.cls === 'lethal' && !f.firstLethal) f.firstLethal = a;
  }
  for (const f of families.values()) {
    if (!f.firstLethal) continue;
    const firstSafe = f.first.cls !== 'lethal';
    const gapBars = f.firstLethal.bar - f.first.bar;
    teach.push({ family: f.family, firstSeen: `bar ${f.first.bar} (${f.first.kind}, ${f.first.cls})`, firstLethal: `bar ${f.firstLethal.bar} beat ${r2(f.firstLethal.off + 1)}`, pass: firstSafe && gapBars >= 2 });
  }
}
// E2 one shape = one verb
const shapeVerbs = {};
for (const a of all.filter((x) => x.threat)) (shapeVerbs[a.kind] ??= new Set()).add(a.verb);
const e2Bad = Object.entries(shapeVerbs).filter(([, v]) => v.size > 1).map(([k, v]) => `${k}: ${[...v].join('/')}`);
// D2 on the music
const onMusic = all.filter((a) => near(allLaneBeats, a.beat)).length / all.length;
// D3 emphasis matches the sound
const shoutBeats = (lanes.shouts ?? []).map((e) => e.beat).filter((b) => b >= rangeStart && b < rangeEnd);
const uniqShouts = [...new Set(shoutBeats.map((b) => Math.round(b * 12) / 12))];
const shoutsStruck = uniqShouts.filter((b) => all.some((a) => a.verb === 'strike' && Math.abs(a.beat - b) <= TOL)).length;
const hops = all.filter((a) => a.verb === 'hop' || a.verb === 'jump');
const hopsOnBoom = hops.filter((a) => isBoom(a.beat)).length;
const strikes = all.filter((a) => a.verb === 'strike');
const strikesOnBackbeatOrShout = strikes.filter((a) => !isBoom(a.beat) || near(shoutBeats, a.beat)).length;
// D4 holes filled
const threatsInStops = all.filter((a) => a.threat && stopRanges.some(([s, e]) => a.beat >= s - TOL && a.beat < e - TOL)).map((a) => `${a.kind}(${a.cls})@${a.beat}`);
// D5 every success pays
const paid = all.filter((a) => a.threat).filter((a) => a.verb === 'strike' || L.lums.some((l) => l.beat > a.beat && l.beat <= a.beat + 1.3));
// C1 intensity follows the song
const named = blocks.filter((k) => k.energy != null);
const rank = (xs) => {
  const idx = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};
const pearson = (x, y) => {
  const mx = mean(x);
  const my = mean(y);
  let n = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    n += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  return dx && dy ? n / Math.sqrt(dx * dy) : NaN;
};
const spearman = named.length >= 3 ? pearson(rank(named.map((k) => k.intensity)), rank(named.map((k) => k.energy))) : NaN;
// C2 valleys
let valleys = 0;
{
  let peak = -Infinity;
  for (const k of blocks) {
    if (peak > 0 && k.intensity <= 0.65 * peak) valleys++;
    peak = Math.max(peak, k.intensity);
  }
}
// C3 breather pairs per 16 bars (after the first 4 bars)
const breatherPairs = bars.filter((x, i) => i > 0 && x.breather && bars[i - 1].breather && x.bar > firstBar + 4).map((x) => x.bar - 1);
const windows16 = [];
for (let b = firstBar + 4; b + 15 <= lastBar; b += 16) windows16.push({ from: b, to: b + 15, pairs: breatherPairs.filter((p) => p >= b && p < b + 15).length });
// C6 hit/shift points
const sectionStarts = songSections.filter((s) => s.startBeat > rangeStart && s.startBeat < rangeEnd).map((s) => s.startBeat);
const shiftAt = (beat) =>
  L.skyCues.some((c) => Math.abs(c.beat - beat) <= 1) ||
  L.cameraCues.some((c) => Math.abs(c.beat - beat) <= 1) ||
  L.fx.some((f) => Math.abs(f.beat - beat) <= 1) ||
  L.groundCues.some((c) => Math.abs(c.beat - beat) <= 1) ||
  Math.abs(L.chaserBeat - beat) <= 1;
const shiftsHit = sectionStarts.filter(shiftAt);
const crashes = [...new Set((lanes.crash ?? []).map((e) => e.beat).filter((b) => b >= rangeStart && b < rangeEnd + 0.5))];
const crashesReacted = crashes.filter((b) => L.fx.some((f) => Math.abs(f.beat - b) <= 0.25));
// B1 novelty cadence
const bigNov = novelty.filter((n) => BIG_NOVELTY.has(n.type));
const twistNov = novelty.filter((n) => TWIST_NOVELTY.has(n.type));
const maxGap = (list) => {
  const pts = [...new Set(list.map((n) => n.bar))].filter((b) => b >= firstBar && b <= lastBar).sort((a, b) => a - b);
  let m = 0;
  let prev = firstBar;
  for (const p of pts) {
    m = Math.max(m, p - prev);
    prev = p;
  }
  return { maxGapBars: Math.max(m, lastBar + 1 - prev), lastNew: prev };
};
const twistGap = maxGap(twistNov);
const bigGap = maxGap(bigNov);
// B6 traversal modes
const modeSeq = bars.map((x) => x.mode);
const modeChanges = modeSeq.filter((m, i) => i > 0 && m !== modeSeq[i - 1]).length;
const distinctModes = [...new Set(modeSeq)];
const verticalStretches = modeSeq.filter((m, i) => VERTICAL_MODES.has(m) && (i === 0 || !VERTICAL_MODES.has(modeSeq[i - 1]))).length;
// B5 lead verb changes between adjacent blocks
const leadChanges = blocks.filter((k, i) => i > 0 && k.leadVerb !== blocks[i - 1].leadVerb).length;
// global max same-verb run
const globalMaxRun = (list) => {
  let m = 0;
  let run = 0;
  let prev = null;
  let where = null;
  for (const a of list) {
    run = a.verb === prev ? run + 1 : 1;
    prev = a.verb;
    if (run > m) {
      m = run;
      where = a.beat;
    }
  }
  return { run: m, endsAtBeat: where };
};
const allSigs = {};
for (const x of bars) allSigs[x.sig] = (allSigs[x.sig] ?? 0) + 1;
const topSig = Object.entries(allSigs).sort((p, q) => q[1] - p[1])[0];
const allRhythms = {};
for (const x of bars) allRhythms[x.rhythm] = (allRhythms[x.rhythm] ?? 0) + 1;

// ------------------------------------------------------------------ playtest reports (S / J)
const reports = [];
const walk = (d) => {
  if (!existsSync(d)) return;
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'report.json') {
      try {
        reports.push({ path: p, ...JSON.parse(readFileSync(p, 'utf8')) });
      } catch {
        /* skip */
      }
    }
  }
};
if (args.reports) for (const d of String(args.reports).split(',')) walk(resolve(root, d));
const threatActs = all.filter((a) => a.threat);
const blame = (deathBeat) => {
  // the last lethal action pressed at or before the death position (pits kill ~0.2-1.5 beats after the press)
  const c = all.filter((a) => a.cls === 'lethal' && a.beat <= deathBeat + 0.05 && deathBeat - a.beat < 2.5);
  return c.length ? c[c.length - 1] : null;
};
const blockOf = (beat) => blocks.find((k) => barOf(beat) >= k.firstBar && barOf(beat) < k.firstBar + k.nBars)?.bars ?? '?';
const groups = {};
for (const r of reports) {
  const key = `jitter ±${r.jitterMs ?? 0} ms, late ${Math.round((r.lateProb ?? 0) * 100)}%`;
  (groups[key] ??= []).push(r);
}
const playtests = Object.entries(groups).map(([key, rs]) => {
  const perBlock = {};
  const hot = {};
  const byKind = {};
  const stumbleCauses = {};
  let deaths = 0;
  let stumbles = 0;
  for (const r of rs) {
    for (const d of r.deathLog ?? []) {
      deaths++;
      const k = blockOf(d.beat);
      perBlock[k] ??= { deaths: 0, stumbles: 0, maxDeathsOneRun: 0 };
      perBlock[k].deaths++;
      const a = blame(d.beat);
      const hk = a ? `${a.kind}@${a.beat} (bar ${a.bar} b${r2(a.off + 1)})` : `${d.cause}@${d.beat}`;
      const kk = a ? a.kind : d.cause;
      byKind[kk] = (byKind[kk] ?? 0) + 1;
      hot[hk] ??= new Set();
      hot[hk].add(r.path);
      hot[hk].n = (hot[hk].n ?? 0) + 1;
    }
    for (const s of r.stumbleLog ?? []) {
      stumbles++;
      const sc = String(s.cause).split('@')[0];
      stumbleCauses[sc] = (stumbleCauses[sc] ?? 0) + 1;
      const k = blockOf(s.beat);
      perBlock[k] ??= { deaths: 0, stumbles: 0, maxDeathsOneRun: 0 };
      perBlock[k].stumbles++;
    }
    const byBlock = {};
    for (const d of r.deathLog ?? []) byBlock[blockOf(d.beat)] = (byBlock[blockOf(d.beat)] ?? 0) + 1;
    for (const [k, n] of Object.entries(byBlock)) perBlock[k].maxDeathsOneRun = Math.max(perBlock[k].maxDeathsOneRun, n);
  }
  const hotspots = Object.entries(hot)
    .map(([k, v]) => ({ action: k, deaths: v.n, runs: v.size, share: deaths ? v.n / deaths : 0 }))
    .sort((p, q) => q.deaths - p.deaths);
  return {
    group: key,
    runs: rs.length,
    completed: rs.filter((r) => r.completed).length,
    deathsPerRun: rs.map((r) => r.deaths),
    meanDeaths: deaths / rs.length,
    meanStumbles: stumbles / rs.length,
    perBlock,
    hotspots,
    deathsByKind: Object.fromEntries(Object.entries(byKind).sort((p, q) => q[1] - p[1])),
    stumbleCauses,
    jitterMs: rs[0].jitterMs ?? 0,
    lateProb: rs[0].lateProb ?? 0,
  };
});

// ------------------------------------------------------------------ criteria
const crit = [];
const add = (id, name, target, measured, status, how = 'L') => crit.push({ id, name, target, measured, status, how });
const P = (ok) => (ok ? 'PASS' : 'FAIL');
const early = opensSong ? blocks.filter((k) => k.firstBar < firstBar + 16) : [];
const isClimax = (k) => ['chorus', 'build', 'climax'].includes(k.cls);
const inFinal = (k) => k.firstBar >= 73 && k.firstBar <= 92;
add('A1', 'Reward share', '≥60% level; ≥75% bars 1–16 & valleys; ≥45% climaxes', `level ${pct(rewardShareAll)}; ` + blocks.map((k) => `${k.bars} ${pct(k.rewardShare)}`).join(', '),
  P(rewardShareAll >= 0.6 && early.every((k) => k.rewardShare >= 0.75) && blocks.every((k) => k.rewardShare >= (isClimax(k) ? 0.45 : k.cls === 'valley' ? 0.75 : 0.6))));
const lethalCap = (k) => (inFinal(k) ? 1.5 : isClimax(k) ? 1 : 0.5);
const zeroLethalBars = opensSong ? bars.filter((x) => x.bar <= firstBar + 5 && x.lethal > 0).map((x) => x.bar) : [];
add('A2', 'Lethal per bar (section avg)', '≤0.5 intro/verse, ≤1 chorus/build, ≤1.5 in 73–92; never >3 in a bar; 0 in bars 1–6',
  blocks.map((k) => `${k.bars} ${r2(k.lethalPerBar)} (adj ${r2(k.lethalPerBarAdj)}, cap ${lethalCap(k)})`).join(', ') + `; max in one bar ${Math.max(...bars.map((x) => x.lethal))}; lethal in bars 1–6: ${zeroLethalBars.length ? zeroLethalBars.join(',') : 'none'}`,
  P(blocks.every((k) => k.lethalPerBarAdj <= lethalCap(k)) && bars.every((x) => x.lethal <= 3) && !zeroLethalBars.length));
add('A3', 'Threats (lethal+stumble) per bar', '≤1.5 avg outside climaxes, ≤2.5 in climaxes', blocks.map((k) => `${k.bars} ${r2(k.threatsPerBar)} (adj ${r2(k.threatsPerBarAdj)})`).join(', '),
  P(blocks.every((k) => k.threatsPerBarAdj <= (isClimax(k) ? 2.5 : 1.5))));
const lethOnAcc = lethalAll.filter((a) => onAccent(a.beat)).length / (lethalAll.length || 1);
const lethOnStrong = lethalAll.filter((a) => onStrong(a.beat)).length / (lethalAll.length || 1);
const strongIso = (a) => (isoRunId.has(a) ? onStrong(isoRunId.get(a).head.beat) : onStrong(a.beat));
const lethOnStrongIso = lethalAll.filter(strongIso).length / (lethalAll.length || 1);
const stumOnAcc = stumbleAll.filter((a) => onAccent(a.beat)).length / (stumbleAll.length || 1);
const offStrong = lethalAll.filter((a) => !onStrong(a.beat)).map((a) => `${a.kind}@${a.bar}.${r2(a.off + 1)}`);
add('A4', 'Threats on accents', '≥90% lethal, ≥75% stumble (strong = boom 1&3 / crash / HEY / stab)',
  `lethal on any accent ${pct(lethOnAcc)}, on STRONG accent ${pct(lethOnStrong)} (${pct(lethOnStrongIso)} if slam-run members inherit their head) (off-strong: ${offStrong.join(' ') || 'none'}); stumble on accent ${pct(stumOnAcc)}`,
  lethOnStrongIso >= 0.9 && stumOnAcc >= 0.75 ? 'PASS' : lethOnAcc >= 0.9 && stumOnAcc >= 0.75 ? 'WARN' : 'FAIL');
const j130 = playtests.filter((p) => p.jitterMs >= 130 && !p.lateProb);
add('A5', 'Lethal timing slack', '0 deaths at --jitter=130', j130.length ? j130.map((p) => `${p.group}: deaths/run ${p.deathsPerRun.join(',')}`).join('; ') : 'no --jitter=130 reports supplied', j130.length ? P(j130.every((p) => p.meanDeaths === 0)) : 'N/A', 'J');
add('A6', 'No threat walls (consecutive threat beats)', '≤4 (≤6 in 73–92); isochronous run ≤8 counts once', blocks.map((k) => `${k.bars} raw ${k.wallRaw} / adj ${k.wallAdj}`).join(', '), P(blocks.every((k) => k.wallAdj <= (inFinal(k) ? 6 : 4))));
add('A7', 'Safe re-entry after checkpoints', '0 threats in first 2 beats; first bar ≤ section mean intensity',
  reentry.map((r) => `bar ${r.checkpointBar}: ${r.threatsInFirst2Beats.length ? r.threatsInFirst2Beats.join(' ') : 'clear'}, first bar ${r1(r.firstBarIntensity)} vs mean ${r1(r.sectionMean)}`).join('; '),
  P(reentry.every((r) => !r.threatsInFirst2Beats.length && r.firstBarIntensity <= r.sectionMean + 1e-9)));
add('A8', 'Teach before threat', 'first appearance non-lethal; first lethal ≥2 bars later', teach.map((t) => `${t.family}: first ${t.firstSeen}, first lethal ${t.firstLethal} → ${t.pass ? 'ok' : 'NOT taught'}`).join('; ') || 'no lethal families', P(teach.every((t) => t.pass)));
const sloppy = playtests.find((p) => p.jitterMs === 85 && Math.abs(p.lateProb - 0.1) < 1e-6);
if (sloppy) {
  const perBlockOk = Object.entries(sloppy.perBlock).every(([, v]) => v.maxDeathsOneRun <= 1);
  const early16 = opensSong ? Object.entries(sloppy.perBlock).filter(([k]) => Number(k.split('-')[0]) < firstBar + 16).reduce((s, [, v]) => s + v.deaths, 0) : 0;
  add('A9', 'Sloppy human clears (jitter 85 + 10% late)', 'mean ≤6 deaths/level (≈≤2 for a 32-bar slice); 0 in bars 1–16; ≤1 per 8-bar block', `${sloppy.runs} runs, deaths/run ${sloppy.deathsPerRun.join(',')} (mean ${r2(sloppy.meanDeaths)}), stumbles/run ${r2(sloppy.meanStumbles)}; bars 1–16 deaths ${early16}; per block ${JSON.stringify(sloppy.perBlock)}`,
    P(sloppy.meanDeaths <= (6 * nBars) / 96 + 0.5 && early16 === 0 && perBlockOk), 'S');
  const top = sloppy.hotspots[0];
  const kindTotal = Object.values(sloppy.deathsByKind).reduce((a, b) => a + b, 0);
  add('A10', 'No hotspots', 'no action >20% of deaths; none killing in ≥3 of 5 seeds (also shown: deaths by mechanic)', top ? sloppy.hotspots.slice(0, 4).map((h) => `${h.action}: ${h.deaths} deaths in ${h.runs} runs (${pct(h.share)})`).join('; ') + `; by mechanic ${Object.entries(sloppy.deathsByKind).map(([k, v]) => `${k} ${pct(v / kindTotal)}`).join(', ')}` : 'no deaths',
    top ? P(top.share <= 0.2 && sloppy.hotspots.every((h) => h.runs < Math.max(3, (3 * sloppy.runs) / 5))) : 'PASS', 'S');
} else {
  add('A9', 'Sloppy human clears', 'mean ≤6 deaths/level', 'no --sloppy reports supplied', 'N/A', 'S');
  add('A10', 'No hotspots', '≤20% per action', 'no --sloppy reports supplied', 'N/A', 'S');
}
// A11 (informational, iteration-2 review): the upper bound. A level no bot can die in is "no challenge" for a
// player with rhythm. Harsh = jitter ≥ 130 ms or ≥ 20% late presses; deaths are normalised per 32 bars.
const per32 = (p) => (p.meanDeaths * 32) / nBars;
const harsh = playtests.filter((p) => p.jitterMs >= 130 || p.lateProb >= 0.2);
if (harsh.length || sloppy) {
  const harshOk = harsh.length ? harsh.some((p) => per32(p) >= 1) : true;
  const sloppyOk = sloppy ? per32(sloppy) >= 0.25 : true;
  add('A11', 'Teeth (not in gate): the level can punish sloppy timing', 'a harsh bot (≥±130 ms or ≥20% late) dies ≥1 per 32 bars; the ±85 sloppy bot ≥0.25 per 32 bars (and ≤2)',
    [...(sloppy ? [sloppy] : []), ...harsh].map((p) => `${p.group}: ${r2(per32(p))} deaths/32 bars (${p.runs} runs)`).join('; '), harshOk && sloppyOk ? 'PASS' : 'WARN', 'S');
}
add('B1', 'Novelty cadence', 'a twist ≤ every 8 bars; new mechanic/mode/set-piece ≤ every 16 bars',
  `longest stretch without a twist ${twistGap.maxGapBars} bars (last twist bar ${twistGap.lastNew}); without a new mechanic/mode ${bigGap.maxGapBars} bars (last bar ${bigGap.lastNew})`,
  P(twistGap.maxGapBars <= 8 && bigGap.maxGapBars <= 16));
add('B2', 'Consecutive identical bars', '≤2 in a row', blocks.map((k) => `${k.bars} ${k.maxRepeat}`).join(', '), P(blocks.every((k) => k.maxRepeat <= 2)));
add('B3', '2-bar phrase repeats in a section', '≤2 occurrences', blocks.map((k) => `${k.bars} ${k.max2BarRepeat}`).join(', '), P(blocks.every((k) => k.max2BarRepeat <= 2)));
add('B4', 'Distinct bar signatures', '≥5 of 8 per section; top signature ≤8% of all bars',
  blocks.map((k) => `${k.bars} ${k.distinctSigs}/${k.nBars}`).join(', ') + `; top sig ${pct(topSig[1] / bars.length)} ("${topSig[0]}")`, P(blocks.every((k) => k.distinctSigs >= Math.min(5, k.nBars)) && topSig[1] / bars.length <= 0.08));
add('B4r', 'Distinct RHYTHMS (onset sets) — not in rubric, explains "repetitive"', 'informational: ≥3 per section, few plain-quarter bars',
  blocks.map((k) => `${k.bars} ${k.distinctRhythms} rhythms, ${k.quarterNoteBars}/${k.nBars} bars = 4 quarters, ${k.offbeatActions} off-beat actions`).join('; '),
  blocks.every((k) => k.distinctRhythms >= 3 && k.quarterNoteBars <= k.nBars / 2) ? 'PASS' : 'FAIL');
const allHands = {};
for (const x of bars) if (x.n) allHands[x.hand] = (allHands[x.hand] ?? 0) + 1;
const topHand = Object.entries(allHands).sort((p, q) => q[1] - p[1]);
add('B4h', 'Distinct HAND patterns (offset+verb, no hazard kind) — not in rubric', 'informational: ≥5 of 8 per section; top hand pattern ≤15% of bars',
  blocks.map((k) => `${k.bars} ${k.distinctHands}/${k.nBars} (top "${k.topHand?.[0]}" ×${k.topHand?.[1]})`).join('; ') + `; level top: ${topHand.slice(0, 3).map(([h, n]) => `"${h}" ×${n}`).join(', ')} of ${bars.filter((x) => x.n).length} bars`,
  blocks.every((k) => k.distinctHands >= Math.min(5, k.nBars)) && topHand[0][1] / bars.length <= 0.15 ? 'PASS' : 'FAIL');
add('B5', 'Verb balance', 'largest verb ≤60% per section; lead verb changes between adjacent sections',
  blocks.map((k) => `${k.bars} ${k.leadVerb} ${pct(k.leadVerbShare)}`).join(', ') + `; lead-verb changes ${leadChanges}/${blocks.length - 1}`, P(blocks.every((k) => k.leadVerbShare <= 0.6) && leadChanges === blocks.length - 1));
add('B6', 'Traversal mode changes', 'a change ≤ every 16 bars; ≥6 distinct modes over the level; ≥2 vertical stretches',
  `modes ${distinctModes.join(', ')}${modeTags.length ? ' (tagged)' : ' (inferred)'}; ${modeChanges} changes in ${nBars} bars (${bars.filter((x) => x.mode !== 'ground' && x.mode !== 'street').length} bars off the flat ground run); vertical stretches ${verticalStretches}`, P(distinctModes.length >= Math.min(6, Math.ceil(nBars / 16)) && modeChanges >= Math.floor(nBars / 16)));
{
  const lanesUsed = [...new Set(followTags.map((f) => f.lane))];
  const leads = blocks.map((k) => k.follows);
  const adjDiffer = leads.every((l, i) => l && (i === 0 || l !== leads[i - 1]));
  add('B7', 'Lead instrument per section', 'adjacent sections differ; ≥5 lanes over the level (≥ #sections here)',
    followTags.length ? `block leads ${blocks.map((k) => `${k.bars} ${k.follows ?? '—'}`).join(', ')}; lanes used ${lanesUsed.join(', ')}` : 'no section declares `follows` (not authored)',
    followTags.length && adjDiffer && lanesUsed.length >= Math.min(5, blocks.length) ? 'PASS' : 'FAIL');
}
add('C1', 'Intensity follows the song (Spearman ρ vs energy)', '≥0.7',
  `ρ = ${r2(spearman)} over ${named.length} sections: ` + named.map((k) => `${k.name} int ${r1(k.intensity)} / energy ${k.energy}`).join(', '), Number.isFinite(spearman) ? P(spearman >= 0.7) : 'N/A');
add('C2', 'Valleys (≥35% below previous peak)', `≥3 per 96 bars (≈${Math.max(1, Math.round((3 * nBars) / 96))} here)`, `${valleys}; section intensity ${blocks.map((k) => r1(k.intensity)).join(' → ')}`, P(valleys >= Math.max(1, Math.round((3 * nBars) / 96))));
add('C3', 'Breathers (0 lethal, ≤1 stumble)', '≥ one pair of consecutive breather bars every 16 bars (after bar 4)',
  `breather bars ${bars.filter((x) => x.breather && x.bar > firstBar + 3).map((x) => x.bar).join(',') || 'none'} after bar ${firstBar + 3}; pairs start at ${breatherPairs.join(',') || 'none'}; 16-bar windows ${windows16.map((w) => `${w.from}-${w.to}:${w.pairs}`).join(' ')}`,
  P(windows16.every((w) => w.pairs >= 1)));
add('C4', 'Sawtooth blocks', '≥80% of blocks peak in bars 6–8 with bars 1–2 below the mean', blocks.map((k) => `${k.bars} [${k.intensityByBar.map(r1).join(' ')}] ${k.sawtooth ? '✓' : '✗'}`).join('; '),
  P(blocks.filter((k) => k.sawtooth).length / blocks.length >= 0.8));
const payAll = blocks.flatMap((k) => k.payoffs);
add('C5', 'Phrase payoff on bar 4 of each phrase', '≥50% of phrases', `${payAll.filter((p) => p.payoff).length}/${payAll.length}: ` + payAll.map((p) => `${p.bar}${p.payoff ? '✓' : '✗'}`).join(' '), P(payAll.filter((p) => p.payoff).length / payAll.length >= 0.5));
add('C6', 'Hit & shift points', '100% section starts shift; ≥90% crashes get a world reaction',
  `section starts shifted ${shiftsHit.length}/${sectionStarts.length}; crashes with fx ${crashesReacted.length}/${crashes.length} (${crashes.filter((c) => !crashesReacted.includes(c)).join(',')} bare)`,
  P(shiftsHit.length === sectionStarts.length && (!crashes.length || crashesReacted.length / crashes.length >= 0.9)));
add('C7', 'Camera choreography', '≥1 camera event per 8 bars', blocks.map((k) => `${k.bars} ${k.cameraEvents}`).join(', '), P(blocks.every((k) => k.cameraEvents >= 1)));
add('C8', 'Spectacle cadence', 'set-piece ≤ every 16 bars; biggest on the drop and the end', 'judge by eye (video)', 'MANUAL', 'V');
const d1 = (k) => (isClimax(k) ? 1 : 0.5);
add('D1', 'Action density (ALL actions)', '≥0.5/beat verses, ≥1/beat choruses, ≤2/beat anywhere', blocks.map((k) => `${k.bars} ${r2(k.actionsPerBeat)}/beat (min ${d1(k)})`).join(', '), P(blocks.every((k) => k.actionsPerBeat >= d1(k) && k.actionsPerBeat <= 2)));
add('D2', 'On the music', '≥95% on a lane onset; ≥70% in the section lead lane', `${pct(onMusic)} on some lane onset; lead lane: not tagged`, onMusic >= 0.95 ? 'WARN' : 'FAIL');
add('D3', 'Emphasis matches the sound', '≥80% of each lane’s actions use its mapped verb',
  `shouts struck ${shoutsStruck}/${uniqShouts.length} (${pct(shoutsStruck / (uniqShouts.length || 1))}); hops on the boom (1&3) ${hopsOnBoom}/${hops.length} (${pct(hopsOnBoom / (hops.length || 1))}); strikes on backbeat/HEY ${strikesOnBackbeatOrShout}/${strikes.length} (${pct(strikesOnBackbeatOrShout / (strikes.length || 1))})`,
  P(shoutsStruck / (uniqShouts.length || 1) >= 0.8 && hopsOnBoom / (hops.length || 1) >= 0.8 && strikesOnBackbeatOrShout / (strikes.length || 1) >= 0.8));
add('D4', 'Holes filled (no threat inside a stop; cell 6 = X, silence, X, silence)', '100%', threatsInStops.length ? `threats inside stops: ${threatsInStops.join(', ')}` : 'clean', P(!threatsInStops.length), 'L');
add('D5', 'Every success pays', '100% of threats carry a reward', `${paid.length}/${threatActs.length}`, P(paid.length === threatActs.length));
add('D6', 'Distinct voices per verb/reward', 'all', 'listen', 'MANUAL', 'listen');
add('E1', 'Runway', '≥1.2 s', blocks.map((k) => `${k.bars} ${r2(k.runwaySec)} s (${r1(k.runwayBeats)} beats)`).join(', '), P(blocks.every((k) => k.runwaySec >= 1.2)));
add('E2', 'One shape = one verb', '0 hazard types needing >1 verb', e2Bad.length ? e2Bad.join('; ') : 'clean', P(!e2Bad.length));
add('E3', 'Clutter (threats in the runway at once)', '≤3 outside 73–92', blocks.map((k) => `${k.bars} ${k.clutterMax}`).join(', '), P(blocks.every((k) => k.clutterMax <= (inFinal(k) ? 5 : 3))));
const TOP10 = ['A1', 'A2', 'A4', 'A9', 'B1', 'B2', 'B3', 'B6', 'C1', 'C3', 'D1'];
const gate = crit.filter((c) => TOP10.includes(c.id));

// ------------------------------------------------------------------ output
const result = {
  generatedAt: new Date().toISOString(),
  level: level.id,
  song: song.id,
  bpm,
  bars: `${firstBar}-${lastBar}`,
  totals: {
    actions: all.length,
    lethal: lethalAll.length,
    stumble: stumbleAll.length,
    reward: all.length - lethalAll.length - stumbleAll.length,
    rewardShare: rewardShareAll,
    kinds: Object.fromEntries(Object.entries(all.reduce((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + 1), m), {})).sort((p, q) => q[1] - p[1])),
    verbs: all.reduce((m, a) => ((m[a.verb] = (m[a.verb] ?? 0) + 1), m), {}),
    maxSameVerbRun: globalMaxRun(all),
    maxSameVerbRunRequired: globalMaxRun(all.filter((a) => a.threat)),
    distinctSignatures: Object.keys(allSigs).length,
    rhythms: allRhythms,
    isochronousRuns: [...new Set([...isoRunId.values()].map((v) => v.head.beat))],
  },
  gate: { passed: gate.filter((c) => c.status === 'PASS').length, of: gate.length },
  criteria: crit,
  sections: blocks,
  bars,
  novelty,
  playtests,
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'rubric.json'), JSON.stringify(result, null, 2));

const md = [];
md.push(`# Fun rubric — ${level.id} (bars ${firstBar}-${lastBar}, ${bpm} BPM)`, '');
md.push(`Actions ${all.length}: ${result.totals.reward} reward / ${stumbleAll.length} stumble / ${lethalAll.length} lethal (reward share ${pct(rewardShareAll)}). Kinds ${JSON.stringify(result.totals.kinds)}. Verbs ${JSON.stringify(result.totals.verbs)}.`);
md.push(`Top-10 gate: **${result.gate.passed}/${result.gate.of} pass**. Longest same-verb run ${result.totals.maxSameVerbRun.run} (ends beat ${result.totals.maxSameVerbRun.endsAtBeat}); required-only ${result.totals.maxSameVerbRunRequired.run}.`, '');
md.push('## Per section (8-bar blocks)', '');
const cols = [
  ['section', (k) => `${k.name} ${k.bars}`],
  ['energy', (k) => k.energy ?? '—'],
  ['act/beat', (k) => r2(k.actionsPerBeat)],
  ['reward', (k) => pct(k.rewardShare)],
  ['lethal/bar (adj)', (k) => `${r2(k.lethalPerBar)} (${r2(k.lethalPerBarAdj)})`],
  ['threat/bar (adj)', (k) => `${r2(k.threatsPerBar)} (${r2(k.threatsPerBarAdj)})`],
  ['lethal on strong', (k) => pct(k.lethalOnStrong)],
  ['wall raw/adj', (k) => `${k.wallRaw}/${k.wallAdj}`],
  ['sigs', (k) => `${k.distinctSigs}/${k.nBars}`],
  ['rhythms', (k) => `${k.distinctRhythms} (${k.quarterNoteBars} ♩♩♩♩)`],
  ['hands', (k) => `${k.distinctHands}/${k.nBars}`],
  ['rest beats', (k) => k.restBeats],
  ['lead verb', (k) => `${k.leadVerb} ${pct(k.leadVerbShare)}`],
  ['same-verb run', (k) => k.maxSameVerbRun],
  ['breathers', (k) => k.breatherBars.join(',') || '—'],
  ['intensity', (k) => r1(k.intensity)],
  ['cam', (k) => k.cameraEvents],
  ['runway s', (k) => r2(k.runwaySec)],
  ['clutter', (k) => k.clutterMax],
  ['modes', (k) => k.modes.join('+')],
];
md.push('| ' + cols.map((c) => c[0]).join(' | ') + ' |', '|' + cols.map(() => '---').join('|') + '|');
for (const k of blocks) md.push('| ' + cols.map((c) => c[1](k)).join(' | ') + ' |');
md.push('', '## Criteria', '', '| # | criterion | target | measured | status |', '|---|---|---|---|---|');
for (const c of crit) md.push(`| ${c.id} | ${c.name} | ${c.target} | ${String(c.measured).replace(/\|/g, '/')} | **${c.status}** |`);
if (playtests.length) {
  md.push('', '## Sloppy-bot playtests', '', '| group | runs | completed | deaths/run | mean deaths | mean stumbles | deaths by block | deaths by mechanic | stumbles by cause | top hotspot |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const p of playtests)
    md.push(`| ${p.group} | ${p.runs} | ${p.completed} | ${p.deathsPerRun.join(',')} | ${r2(p.meanDeaths)} | ${r2(p.meanStumbles)} | ${Object.entries(p.perBlock).sort((x, y) => parseInt(x[0]) - parseInt(y[0])).map(([k, v]) => `${k}: ${v.deaths}d/${v.stumbles}s`).join('; ')} | ${Object.entries(p.deathsByKind).map(([k, v]) => `${k} ${v}`).join(', ') || '—'} | ${Object.entries(p.stumbleCauses).map(([k, v]) => `${k} ${v}`).join(', ') || '—'} | ${p.hotspots[0] ? `${p.hotspots[0].action} ×${p.hotspots[0].deaths}` : '—'} |`);
}
md.push('', '## Novelty timeline', '');
for (const n of novelty.filter((x) => x.type !== 'cell')) md.push(`- bar ${n.bar} (beat ${n.beat}) — ${n.type}: ${n.what}`);
md.push('', '## Bars', '', '| bar | section | mode | hands | lethal | stumble | reward | int | signature |', '|---|---|---|---|---|---|---|---|---|');
for (const x of bars) md.push(`| ${x.bar} | ${x.section} | ${x.mode} | ${x.hand} | ${x.lethal} | ${x.stumble} | ${x.reward} | ${r1(x.intensity)} | ${x.sig} |`);
writeFileSync(join(outDir, 'rubric.md'), md.join('\n') + '\n');
if (!args.quiet) console.log(md.join('\n'));
console.log(`\n[rubric] wrote ${join(outDir, 'rubric.json')} and rubric.md — top-10 gate ${result.gate.passed}/${result.gate.of}`);
