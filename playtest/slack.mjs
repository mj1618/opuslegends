#!/usr/bin/env node
/**
 * node playtest/slack.mjs [--level=<file>#<export>] [--from=<beat>] [--to=<beat>] [--profiles]
 *
 * LETHAL SLACK METER (iteration 3). For every lethal intended action (failKind death) it re-runs the REAL
 * controller (game/player.ts) against the REAL built level (collision, slam lifts, low-sign ceilings, bounce
 * pads) headless in Node, sweeping that one press from -300 to +300 ms (every other action pressed on its
 * beat), and reports the contiguous window around 0 in which the hero survives: e.g. gap@92 -104/+118 ms.
 * Then it turns the windows into the expected deaths per act for the bot profiles (uniform jitter ±J plus a
 * fraction of extra-late presses, re-rolled every attempt, retries from the checkpoint), per checkpoint segment.
 * Physics + the act-2 mechanics (game/mech: thrown bottles, rolling balls, hook rides, ledge scramble, fall-out) run
 * in the sim; the Burn is not modelled (the real bots measure it).
 * --stumbles also sweeps every MOVING stumble threat (thrown bottles / firebombs / balls) and every hook ride the same
 * way and reports its window (no stumble / hooked): the act-2 fairness rule is ≥ +130 ms late on those.
 * --hidden (iteration 5) sweeps EVERY action for death (hidden lethal presses: a reward / stumble hop whose late landing
 * falls into the next pit) and exits 1 if a non-lethal action kills inside ±150 ms (--hiddenMs=) or when skipped, or
 * a lethal one is under −70/+150 (--lethalEarly=; act 1's tight/peak pits are −70, acts 2-3 author to −85). `npm run playtest` runs it as a gate on the full level (~1-2 min; --no-hidden skips).
 * --canisters (iteration 6) checks every hidden FILM CANISTER: the on-time (song-line) run must NOT pick it up, the HELD
 * jump from its `from` beat must pick it up AND survive (window reported in ms), and lists what the flight skips;
 * exits 1 if one fails. --scout lists every tap hop that survives being HELD (apex, landing, what it skips): the
 * candidate high routes.
 */
import { existsSync, readFileSync } from 'node:fs';
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
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
const load = async (spec) => {
  const [file, name] = String(spec).split('#');
  const mod = await server.ssrLoadModule('/' + file.replace(/^\.?\//, ''));
  return name ? mod[name] : mod.default;
};
try {
  await (async () => {
  const level = await load(args.level ?? 'src/level/slice.ts#sliceLevel');
  const songMod = await server.ssrLoadModule('/src/audio/song.ts');
  const bm = join(root, `assets/audio/${level.songId}.beatmap.json`);
  const song = existsSync(bm) ? songMod.songFromBeatmap(JSON.parse(readFileSync(bm, 'utf8')), '') : await load('src/audio/placeholderSong.ts#placeholderSong');
  const { buildLevel, slamState, launchVelocity, BOUNCE } = await server.ssrLoadModule('/src/level/build.ts');
  const { Player } = await server.ssrLoadModule('/src/game/player.ts');
  const { Controls } = await server.ssrLoadModule('/src/engine/input.ts');
  const { Tun } = await server.ssrLoadModule('/src/game/tunables.ts');
  const { FALL_OUT, Mechanics } = await server.ssrLoadModule('/src/game/mech/index.ts');
  const tempo = songMod.makeTempoMap(song);
  const L = buildLevel(level, tempo, song);
  const ppb = L.ppb;
  const dt = 1 / Tun.sim.hz;
  const noop = () => {};
  // the act-2 mechanics run in the sim too (bottles, balls, hooks, scramble, fall-out); `mechLog` collects what happened
  let mechLog = { died: false, stumbles: [], batted: new Set(), hooked: new Set() };
  /** film canisters touched in the last run (ids) + the hero's highest point (for --scout) */
  let canHit = new Set();
  let peak = { y: Infinity, x: 0 };
  const mech = new Mechanics(L, {
    stumble: (cause) => mechLog.stumbles.push(cause),
    die: () => (mechLog.died = true),
    batted: (b) => mechLog.batted.add(b.beat),
    fx: noop,
    telegraph: noop,
    hooked: (h) => mechLog.hooked.add(h.beat),
  });

  // --why: print why each simulated run ended in a death (debugging a fit)
  const why = (reason, x) => {
    if (args.why) console.log(`  [why] ${reason} at ${x.toFixed(2)}`);
    return x;
  };
  /** simulate from `start` to `end` beats; `offsets` maps action index -> press offset (s). Returns death beat or null */
  function run(start, end, offsets, hits = null, trace = null, takeoffs = null) {
    for (const b of L.bouncePads) b.used = false;
    mechLog = { died: false, stumbles: [], batted: new Set(), hooked: new Set() };
    canHit = new Set();
    peak = { y: Infinity, x: 0 };
    mech.reset(start);
    let tNow = 0;
    const p = new Player({ jump: () => takeoffs?.push(tNow), land: noop, strike: noop, slide: noop, footstep: noop });
    p.setWorld(L.world);
    p.lowCeilings = (r) => L.signs.some((sg) => r.x < sg.rect.x + sg.rect.w && r.x + r.w > sg.rect.x && r.y < sg.rect.y + sg.rect.h && r.y + r.h > sg.rect.y);
    const x0 = L.xAt(start);
    const y0 = L.floorYAt(x0);
    p.spawn(x0, Number.isNaN(y0) ? 0 : y0, tempo.runSpeedAt(start, L.ppbAt(start)), L.ppbAt(start));
    const c = new Controls();
    c.apply('right', true, 0);
    p.setTempo(tempo.secondsPerBeatAt(start), L.ppbAt(start));
    p.release(c);
    const events = [];
    L.actions.forEach((a, i) => {
      if (a.beat < start - 1e-6 || a.beat > end) return;
      const t = tempo.beatToTime(a.beat) + (offsets.get(i) ?? 0);
      const btn = a.type === 'jump' ? 'jump' : a.type === 'strike' ? 'strike' : 'down';
      const hold = tempo.beatToTime(a.beat + (holds.get(a.beat) ?? a.hold ?? (a.type === 'strike' ? 0.1 : 1))) - tempo.beatToTime(a.beat);
      events.push({ t, btn, down: true }, { t: t + hold, btn, down: false });
    });
    events.sort((u, v) => u.t - v.t);
    let t = tempo.beatToTime(start);
    const tEnd = tempo.beatToTime(end);
    let k = 0;
    while (t < tEnd) {
      t += dt;
      tNow = t;
      const beat = tempo.timeToBeat(t - dt);
      while (k < events.length && events[k].t <= t) {
        const e = events[k++];
        if (e.down && (e.btn === 'jump' ? c.jump : e.btn === 'strike' ? c.strike : c.down)) c.apply(e.btn, false, e.t);
        c.apply(e.btn, e.down, e.t);
      }
      p.musicX = L.xAt(beat);
      // (iteration 9: the ppb at the hero's own beat position — the chorus speed zones, like Game.simulate)
      p.setTempo(tempo.secondsPerBeatAt(beat), L.ppbAt(L.beatAt(p.x) + (0.5 * dt) / tempo.secondsPerBeatAt(beat)));
      for (const f of L.slams) f.solid.active = slamState(f, beat, L.swing).solid;
      p.step(dt, c, L.world);
      c.clearEdges();
      mech.step(dt, beat, p, true, true);
      if (mechLog.died) return why('fall-out (mech)', L.beatAt(p.x));
      if (L.canisters?.length) {
        const hb = p.hurtbox({ x: 0, y: 0, w: 0, h: 0 });
        for (const cn of L.canisters) {
          const dx = Math.max(hb.x - cn.x, 0, cn.x - (hb.x + hb.w));
          const dy = Math.max(hb.y - cn.y, 0, cn.y - (hb.y + hb.h));
          if (dx * dx + dy * dy <= cn.r * cn.r) canHit.add(cn.id);
        }
      }
      if (p.y < peak.y) peak = { y: p.y, x: p.x };
      if (hits && p.strikeActive) {
        const bx = p.strikeBox({ x: 0, y: 0, w: 0, h: 0 });
        const circ = (cx, cy, r) => {
          const dx = Math.max(bx.x - cx, 0, cx - (bx.x + bx.w));
          const dy = Math.max(bx.y - cy, 0, cy - (bx.y + bx.h));
          return dx * dx + dy * dy <= r * r;
        };
        for (const b of L.breakables) if (!hits.has('b' + b.beat) && circ(b.x, b.y, b.r)) hits.set('b' + b.beat, { beat, y: Math.round(p.y) });
        for (const f of L.pendulums) {
          const th = f.amp * Math.sin((2 * Math.PI * (beat - f.beat)) / 4);
          if (!hits.has('p' + f.beat) && circ(f.pivotX + f.len * Math.sin(th), f.pivotY + f.len * Math.cos(th), f.r)) hits.set('p' + f.beat, { beat, y: Math.round(p.y) });
        }
        for (const e of L.enemies) {
          const r = { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
          if (!hits.has('e' + e.beat) && bx.x < r.x + r.w && bx.x + bx.w > r.x && bx.y < r.y + r.h && bx.y + bx.h > r.y) hits.set('e' + e.beat, { beat, y: Math.round(p.y) });
        }
      }
      for (const b of L.bouncePads) {
        if (b.used || Math.abs(p.x - b.x) > b.w / 2) continue;
        if (p.y < b.y - BOUNCE.trigger || p.y > b.y + 4) continue;
        if ((p.grounded && p.x >= b.x - BOUNCE.fireAhead) || p.x > b.x + b.w / 2 - 30) {
          b.used = true;
          const sec = Math.max(0.25, tempo.beatToTime(b.landBeat) - tempo.beatToTime(beat));
          p.y = Math.min(p.y, b.y);
          p.vy = -launchVelocity(sec, p.y - b.landY, p.spb);
          p.grounded = false;
          p.jumping = false;
          p.coyote = 0;
          p.jumpBuffer = 0;
        }
      }
      if (trace) {
        const hb = p.hurtbox({ x: 0, y: 0, w: 0, h: 0 });
        if (L.signs.some((sg) => hb.x < sg.rect.x + sg.rect.w && hb.x + hb.w > sg.rect.x && hb.y < sg.rect.y + sg.rect.h && hb.y + hb.h > sg.rect.y)) trace.push(`${beat.toFixed(2)} !!! SIGN HIT`);
      }
      if (trace && Math.floor(beat * 10) !== Math.floor((beat - dt / tempo.secondsPerBeatAt(beat)) * 10)) trace.push(`${beat.toFixed(2)} x ${(L.beatAt(p.x)).toFixed(3)} y ${Math.round(p.y)}${p.grounded ? ' G' : ''}${p.sliding ? ' S' : ''}${mech.hook ? ' H' : ''}`);
      if (p.y > Tun.flow.killY) return why('killY', L.beatAt(p.x));
      // the game's FALL-OUT rule (game/mech): falling FALL_OUT px below the last ledge is a death (high pits)
      if (!p.grounded && p.y > p.groundY + FALL_OUT) return why('fall-out', L.beatAt(p.x));
      // walled: stuck far behind the music line = dead in the real game (the Burn: iteration 9, it catches a hero who
      // has fallen Tun.chaser.minGap beats behind — a stall)
      if (beat - L.beatAt(p.x) > Tun.chaser.minGap) return why(`walled (y ${Math.round(p.y)})`, L.beatAt(p.x));
    }
    return null;
  }

  /**
   * --hidden (iteration 5, review iter4 fix 2): HIDDEN LETHAL PRESSES. Sweeps EVERY action (not only the lethal ones)
   * from its beat outward (10 ms steps to ±300 ms, every other action on its beat) and reports the contiguous window
   * in which nothing kills, plus whether skipping it kills. FAILS (exit 1) when
   *   - an action NOT marked lethal (reward / stumble) kills inside ±HIDDEN_MS, or when skipped (a reward/stumble skip
   *     must never cost a life), or
   *   - a lethal action's window is under the fairness rule (−70 / +150 ms; acts 2-3 −85, listed).
   * A non-lethal action that only kills beyond ±HIDDEN_MS is listed as a note (that press is a miss by then anyway).
   */
  let hiddenFail = false;
  function hidden() {
    const HIDDEN_MS = Number(args.hiddenMs ?? 150);
    // lethal early-side floor: −70 = act 1's documented 'tight'/'peak' teeth (dsl GAP_FIT); acts 2-3 author to −85
    // (listed below as info). The late side is +150 everywhere.
    const LETHAL_EARLY = Number(args.lethalEarly ?? 70);
    const tight = [];
    const STEP = 10;
    const bad = [];
    const notes = [];
    let n = 0;
    const acts = L.actions.map((a, i) => ({ a, i })).filter(({ a }) => a.beat >= from && a.beat < to);
    for (const { a, i } of acts) {
      const start = startFor(a.beat);
      const end = a.beat + 3;
      if (run(start, end, new Map()) !== null) {
        bad.push(`${a.beat} ${a.source} ${a.type}: DIES ON TIME`);
        continue;
      }
      n++;
      const alive = (ms) => run(start, end, new Map([[i, ms / 1000]])) === null;
      let E = 0;
      let Lt = 0;
      while (E > -300 && alive(E - STEP)) E -= STEP;
      while (Lt < 300 && alive(Lt + STEP)) Lt += STEP;
      // skip = press it never (a huge offset beyond the sweep's end)
      const skipKills = run(start, end, new Map([[i, 99]])) !== null;
      const tag = `${String(a.beat).padEnd(8)} ${a.source.padEnd(9)} ${a.type.padEnd(6)} ${a.failKind.padEnd(8)} ${`${E}/+${Lt}`.padEnd(11)}${skipKills ? ' skip KILLS' : ''}`;
      if (a.failKind === 'death') {
        // (a lethal's skip kills by definition; its window must meet the rule — 10 ms steps: allow the 5 ms grid)
        if (E > -LETHAL_EARLY + STEP / 2 || Lt < 150 - STEP / 2) bad.push(`${tag}  <-- lethal under −${LETHAL_EARLY}/+150`);
        else if (E > -85 + STEP / 2) tight.push(tag);
      } else if (E > -HIDDEN_MS || Lt < HIDDEN_MS || skipKills) bad.push(`${tag}  <-- HIDDEN LETHAL (marked ${a.failKind})`);
      else if (E > -300 || Lt < 300) notes.push(tag);
    }
    console.log(`hidden-lethal sweep: ${acts.length} actions (${n} survive on time), ±${HIDDEN_MS} ms gate for rewards/stumbles, −${LETHAL_EARLY}/+150 for lethals`);
    if (tight.length) {
      console.log(`\nlethal actions between −${LETHAL_EARLY} and −85 ms early (the tight/peak teeth, info):`);
      for (const t of tight) console.log('  ' + t);
    }
    if (notes.length) {
      console.log(`\nnon-lethal actions that only kill beyond ±${HIDDEN_MS} ms (info):`);
      for (const t of notes) console.log('  ' + t);
    }
    if (bad.length) {
      hiddenFail = true;
      console.log('\nFAIL:');
      for (const t of bad) console.log('  ' + t);
    } else console.log('\nPASS: no hidden lethal presses');
  }

  if (args.trace) {
    holds = new Map(String(args.hold ?? '').split(',').filter(Boolean).map((h) => h.split(':').map(Number)));
    const [a, b] = String(args.trace).split(',').map(Number);
    const tr = [];
    let s0 = a;
    while (Number.isNaN(L.floorYAt(L.xAt(s0)))) s0 -= 0.25;
    // --offset=<beat>:<ms>[,…] presses those actions off their beat in the trace (debugging a window's edge)
    const offs = new Map(String(args.offset ?? '').split(',').filter(Boolean).map((o) => {
      const [bt, ms] = o.split(':').map(Number);
      return [L.actions.findIndex((q) => Math.abs(q.beat - bt) < 1e-6), ms / 1000];
    }));
    run(s0, b, offs, new Map(), tr);
    console.log(tr.join('\n'));
    process.exit(0);
  }
  // --hold=<beat>:<beats>[,…] overrides an action's hold in --trace runs (e.g. release a knee-slide early)
  var holds = new Map(String(args.hold ?? '').split(',').filter(Boolean).map((h) => h.split(':').map(Number)));
  const from = Number(args.from ?? level.startBeat);
  const to = Number(args.to ?? level.endBeat);
  const lethal = L.actions.map((a, i) => ({ a, i })).filter(({ a }) => a.failKind === 'death' && a.beat >= from && a.beat < to);
  /** a sweep's start beat: on solid ground, never mid-way through an earlier jump / launch / hook ride */
  const startFor = (beat) => {
    let start = Math.max(level.startBeat, beat - 3);
    for (let k = 0; k < 20; k++) {
      while (Number.isNaN(L.floorYAt(L.xAt(start)))) start -= 0.25;
      const prev = L.actions.find((b) => b.type === 'jump' && b.beat < start && b.beat + 2.2 > start);
      // …nor mid-way through a launch (start before the pad) or a hook ride (start before the grab)
      const pad = L.bouncePads.find((b) => b.beat - 0.3 < start && b.landBeat + 0.1 > start);
      const hk = mech.hooks.find((h) => h.beat - 0.3 < start && L.beatAt(h.x1) + 0.1 > start);
      if (!prev && !pad && !hk) break;
      start = Math.min(prev ? prev.beat - 0.5 : Infinity, pad ? pad.beat - 0.5 : Infinity, hk ? hk.beat - 0.5 : Infinity);
    }
    return Math.max(level.startBeat, start);
  };
  if (args.hidden) {
    hidden();
    process.exitCode = hiddenFail ? 1 : 0;
  }
  if (args.canisters || args.scout) {
    const inFlight = (b0, b1) => L.actions.filter((a) => a.beat > b0 + 1e-6 && a.beat < b1 - 1e-6).map((a) => `${a.type[0]}${a.beat}${a.failKind === 'death' ? '!' : ''}`);
    let bad = 0;
    if (args.canisters) {
      console.log(`film canisters (${L.canisters.length}): on-time route must MISS it, the held jump must GET it and survive`);
      for (const cn of L.canisters) {
        const start = startFor(cn.from);
        const end = cn.beat + 4;
        holds = new Map();
        const dead0 = run(start, end, new Map());
        const onLine = canHit.has(cn.id);
        holds = new Map([[cn.from, 1]]);
        const ai = L.actions.findIndex((a) => Math.abs(a.beat - cn.from) < 1e-6 && a.type === 'jump');
        const ok = (ms) => run(start, end, new Map([[ai, ms / 1000]])) === null && canHit.has(cn.id);
        const got = ok(0);
        let E = 0;
        let Lt = 0;
        if (got) {
          while (E > -300 && ok(E - 5)) E -= 5;
          while (Lt < 300 && ok(Lt + 5)) Lt += 5;
        }
        const deadHeld = run(start, end, new Map());
        holds = new Map();
        const fail = ai < 0 || onLine || !got || dead0 !== null;
        if (fail) bad++;
        const hy = Math.round(-cn.y + L.floorYAt(L.xAt(cn.from)));
        console.log(`  #${cn.index + 1} hold jump@${cn.from} -> canister @${cn.beat.toFixed(2)} (${hy} px over the takeoff): ${ai < 0 ? 'NO JUMP ACTION on from' : onLine ? 'ON THE SONG LINE (the on-time run takes it)' : !got ? `NOT REACHED${deadHeld !== null ? ` (held run dies @${deadHeld.toFixed(2)})` : ''}` : `OK window ${E}/+${Lt} ms`}; flight skips: ${inFlight(cn.from, cn.from + 2).join(' ') || '-'}`);
      }
      if (bad) process.exitCode = 1;
    }
    if (args.scout) {
      console.log('\nscout: tap hops that survive being HELD (apex px over takeoff, landing beat, actions inside the flight):');
      for (const a of L.actions) {
        if (a.type !== 'jump' || (a.hold ?? 1) >= 0.5 || a.beat < from || a.beat >= to) continue;
        const start = startFor(a.beat);
        holds = new Map([[a.beat, 1]]);
        const dead = run(start, a.beat + 4, new Map());
        holds = new Map();
        if (dead !== null) continue;
        const y0 = L.floorYAt(L.xAt(a.beat));
        console.log(`  ${String(a.beat).padEnd(8)} ${a.failKind.padEnd(8)} apex ${Math.round(y0 - peak.y)} px @${(L.beatAt(peak.x)).toFixed(2)}  skips: ${inFlight(a.beat, a.beat + 2).join(' ') || '-'}`);
      }
    }
    return;
  }
  const rows = [];
  for (const { a, i } of args.hidden ? [] : lethal) {
    const start = startFor(a.beat);
    const end = a.beat + 3;
    const base = run(start, end, new Map());
    const alive = (ms) => run(start, end, new Map([[i, ms / 1000]])) === null;
    let E = 0;
    let Lt = 0;
    if (base === null) {
      while (E > -300 && alive(E - 5)) E -= 5;
      while (Lt < 300 && alive(Lt + 5)) Lt += 5;
    }
    rows.push({ beat: a.beat, src: a.source, type: a.type, hold: a.hold, base: base === null ? 'ok' : `DIES@${base.toFixed(2)}`, early: E, late: Lt });
  }
  // strike reach: one on-time run of the whole act, every strike target must be hit
  if (!args.hidden) {
    const hits = new Map();
    const takeoffs = [];
    const otr = args.why ? [] : null;
    const dead = run(level.startBeat, Math.min(to, level.endBeat), new Map(), hits, otr, takeoffs);
    if (otr && dead !== null) console.log(otr.slice(-40).join("; "));
    // every hop must leave the ground on its press (a later takeoff = the hero was still airborne: buffered)
    const lateJumps = [];
    for (const a of L.actions) {
      if (a.type !== 'jump' || a.beat < from || a.beat >= to) continue;
      const tp = tempo.beatToTime(a.beat);
      const k = takeoffs.find((x) => x >= tp - 0.005);
      if (k === undefined || k - tp > 0.013) lateJumps.push(`${a.beat}${k === undefined ? '' : ` (+${Math.round((k - tp) * 1000)} ms)`}`);
    }
    if (lateJumps.length) console.log(`LATE TAKEOFFS (still airborne on the beat): ${lateJumps.join(', ')}`);
    const missing = [];
    for (const a of L.actions) {
      if (a.type !== 'strike' || a.beat < from || a.beat >= to) continue;
      // moving / ride targets are checked through the mechanics (batted / hooked on the on-time run)
      if (a.source === 'thrown') {
        if (!mechLog.batted.has(a.beat)) missing.push(`thrown@${a.beat} (not batted)`);
        continue;
      }
      if (a.source === 'hook') {
        if (!mechLog.hooked.has(a.beat)) missing.push(`hook@${a.beat} (not hooked)`);
        continue;
      }
      const k = (a.source === 'breakable' ? 'b' : a.source === 'pendulum' ? 'p' : 'e') + a.beat;
      const h = hits.get(k);
      if (!h) missing.push(`${a.source}@${a.beat}`);
      else if (Math.abs(h.beat - a.beat) > 0.25) missing.push(`${a.source}@${a.beat} (only at ${h.beat.toFixed(2)})`);
    }
    console.log(`on-time run: ${dead === null ? 'survives' : 'DIES at ' + dead.toFixed(2)}; strike targets unreachable on the beat: ${missing.length ? missing.join(', ') : 'none'}`);
  }
  if (args.stumbles) {
    // moving stumble threats + hook rides: sweep the one press, report the window with no stumble from it / hooked
    const movers = L.actions.map((a, i) => ({ a, i })).filter(({ a }) => a.beat >= from && a.beat < to && (a.source === 'thrown' || a.source === 'ball' || a.source === 'hook'));
    console.log('\nmoving threats / rides (press window, ms):');
    for (const { a, i } of movers) {
      let start = Math.max(level.startBeat, a.beat - 3);
      for (let k = 0; k < 20; k++) {
        while (Number.isNaN(L.floorYAt(L.xAt(start)))) start -= 0.25;
        const prev = L.actions.find((b) => b.type === 'jump' && b.beat < start && b.beat + 2.2 > start);
        const pad = L.bouncePads.find((b) => b.beat - 0.3 < start && b.landBeat + 0.1 > start);
        const hk = mech.hooks.find((h) => h.beat - 0.3 < start && L.beatAt(h.x1) + 0.1 > start);
        if (!prev && !pad && !hk) break;
        start = Math.min(prev ? prev.beat - 0.5 : Infinity, pad ? pad.beat - 0.5 : Infinity, hk ? hk.beat - 0.5 : Infinity);
      }
      const end = a.beat + 2.5;
      const tag = `@${a.beat}`;
      const ok = (ms) => {
        const dead = run(start, end, new Map([[i, ms / 1000]]));
        if (a.source === 'hook') return mechLog.hooked.has(a.beat) && (dead === null || a.failKind !== 'death');
        return dead === null && !mechLog.stumbles.some((c) => c.endsWith(tag));
      };
      let E = 0;
      let Lt = 0;
      const base = ok(0);
      if (base) {
        while (E > -300 && ok(E - 5)) E -= 5;
        while (Lt < 300 && ok(Lt + 5)) Lt += 5;
      }
      const name = a.source === 'thrown' ? (L.def.items.find((it) => it.type === 'thrown' && it.beat === a.beat)?.style ?? 'thrown') : a.source;
      const flag = base && (Lt < 130 || E > -85) ? '  <-- under −85/+130' : '';
      console.log(`${String(a.beat).padEnd(8)} ${name.padEnd(8)} ${a.type.padEnd(6)} ${base ? `${E}/+${Lt}` : 'FAILS ON TIME'}${flag}`);
    }
  }
  if (args.hidden) return;
  const cps = [level.startBeat, ...L.checkpoints.map((c) => c.beat)].sort((x, y) => x - y);
  const seg = (b) => cps.filter((c) => c <= b + 1e-6).pop();

  // death probability of one action for a profile: offset = U(-J, J) + (p late) U(60, 110)
  const pFail = (row, J, late) => {
    let fail = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const u = -J + ((i + 0.5) / N) * 2 * J;
      const inWin = (o) => o >= row.early - 2.5 && o <= row.late + 2.5;
      if (!inWin(u)) fail += 1 - late;
      if (late > 0) {
        let lf = 0;
        for (let j = 0; j < 20; j++) if (!inWin(u + 60 + ((j + 0.5) / 20) * 50)) lf++;
        fail += late * (lf / 20);
      }
    }
    return fail / N;
  };
  const profiles = [
    ['autoplay', 0, 0],
    ['skilled ±40', 40, 0],
    ['sloppy ±85+10%', 85, 0.1],
    ['±110+20%', 110, 0.2],
    ['±130', 130, 0],
    ['±160+20%', 160, 0.2],
    ['uncalibrated late', 40, 1],
  ];
  console.log('beat     source   verb  window (ms)      segment');
  for (const r of rows) console.log(`${String(r.beat).padEnd(8)} ${r.src.padEnd(8)} ${(r.type + (r.hold >= 0.5 ? '–' : '∪')).padEnd(5)} ${r.base === 'ok' ? `${r.early}/+${r.late}`.padEnd(16) : r.base.padEnd(16)} ◆${seg(r.beat)}`);
  console.log('\nexpected deaths per act (physics only; retries from the checkpoint, re-rolled presses):');
  for (const [name, J, late] of profiles) {
    const bySeg = {};
    for (const r of rows) {
      const k = seg(r.beat);
      bySeg[k] ??= [];
      bySeg[k].push(r.base === 'ok' ? pFail(r, J, late) : 1);
    }
    let total = 0;
    const parts = [];
    for (const [k, ps] of Object.entries(bySeg)) {
      const clear = ps.reduce((m, q) => m * (1 - q), 1);
      const d = clear > 1e-6 ? (1 - clear) / clear : Infinity;
      total += d;
      parts.push(`◆${k}:${d.toFixed(2)}`);
    }
    const early16 = rows.filter((r) => r.beat < level.startBeat + 64).reduce((s, r) => s + pFail(r, J, late), 0);
    console.log(`${name.padEnd(16)} ${total.toFixed(2).padStart(6)}   bars 1-16 ${early16.toFixed(3)}   ${parts.join(' ')}`);
  }
  })();
} finally {
  await server.close();
}
