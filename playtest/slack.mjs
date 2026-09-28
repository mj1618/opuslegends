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
 * Physics only: stumbles, the Burn and strikes are not modelled (the real bots measure those).
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
  const level = await load(args.level ?? 'src/level/slice.ts#sliceLevel');
  const songMod = await server.ssrLoadModule('/src/audio/song.ts');
  const bm = join(root, `assets/audio/${level.songId}.beatmap.json`);
  const song = existsSync(bm) ? songMod.songFromBeatmap(JSON.parse(readFileSync(bm, 'utf8')), '') : await load('src/audio/placeholderSong.ts#placeholderSong');
  const { buildLevel, slamState, launchVelocity, BOUNCE } = await server.ssrLoadModule('/src/level/build.ts');
  const { Player } = await server.ssrLoadModule('/src/game/player.ts');
  const { Controls } = await server.ssrLoadModule('/src/engine/input.ts');
  const { Tun } = await server.ssrLoadModule('/src/game/tunables.ts');
  const tempo = songMod.makeTempoMap(song);
  const L = buildLevel(level, tempo, song);
  const ppb = L.ppb;
  const dt = 1 / Tun.sim.hz;
  const noop = () => {};

  /** simulate from `start` to `end` beats; `offsets` maps action index -> press offset (s). Returns death beat or null */
  function run(start, end, offsets, hits = null, trace = null, takeoffs = null) {
    for (const b of L.bouncePads) b.used = false;
    let tNow = 0;
    const p = new Player({ jump: () => takeoffs?.push(tNow), land: noop, strike: noop, slide: noop, footstep: noop });
    p.setWorld(L.world);
    p.lowCeilings = (r) => L.signs.some((sg) => r.x < sg.rect.x + sg.rect.w && r.x + r.w > sg.rect.x && r.y < sg.rect.y + sg.rect.h && r.y + r.h > sg.rect.y);
    const x0 = start * ppb;
    const y0 = L.floorYAt(x0);
    p.spawn(x0, Number.isNaN(y0) ? 0 : y0, tempo.runSpeedAt(start, ppb), ppb);
    const c = new Controls();
    c.apply('right', true, 0);
    p.setTempo(tempo.secondsPerBeatAt(start));
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
      p.musicX = beat * ppb;
      p.setTempo(tempo.secondsPerBeatAt(beat));
      for (const f of L.slams) f.solid.active = slamState(f, beat, L.swing).solid;
      p.step(dt, c, L.world);
      c.clearEdges();
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
      if (trace && Math.floor(beat * 10) !== Math.floor((beat - dt / tempo.secondsPerBeatAt(beat)) * 10)) trace.push(`${beat.toFixed(2)} x ${(p.x / ppb).toFixed(2)} y ${Math.round(p.y)}${p.grounded ? ' G' : ''}${p.sliding ? ' S' : ''}`);
      if (p.y > Tun.flow.killY) return p.x / ppb;
      // walled: stuck far behind the music line = dead in the real game (the Burn)
      if (beat - p.x / ppb > 1.5) return p.x / ppb;
    }
    return null;
  }

  if (args.trace) {
    holds = new Map(String(args.hold ?? '').split(',').filter(Boolean).map((h) => h.split(':').map(Number)));
    const [a, b] = String(args.trace).split(',').map(Number);
    const tr = [];
    let s0 = a;
    while (Number.isNaN(L.floorYAt(s0 * ppb))) s0 -= 0.25;
    run(s0, b, new Map(), new Map(), tr);
    console.log(tr.join('\n'));
    process.exit(0);
  }
  // --hold=<beat>:<beats>[,…] overrides an action's hold in --trace runs (e.g. release a knee-slide early)
  var holds = new Map(String(args.hold ?? '').split(',').filter(Boolean).map((h) => h.split(':').map(Number)));
  const from = Number(args.from ?? level.startBeat);
  const to = Number(args.to ?? level.endBeat);
  const lethal = L.actions.map((a, i) => ({ a, i })).filter(({ a }) => a.failKind === 'death' && a.beat >= from && a.beat < to);
  const rows = [];
  for (const { a, i } of lethal) {
    let start = Math.max(level.startBeat, a.beat - 3);
    // start on solid ground, and never mid-way through an earlier jump (include its press)
    for (let k = 0; k < 20; k++) {
      while (Number.isNaN(L.floorYAt(start * ppb))) start -= 0.25;
      const prev = L.actions.find((b) => b.type === 'jump' && b.beat < start && b.beat + 2.2 > start);
      if (!prev) break;
      start = prev.beat - 0.5;
    }
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
  {
    const hits = new Map();
    const takeoffs = [];
    const dead = run(level.startBeat, Math.min(to, level.endBeat), new Map(), hits, null, takeoffs);
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
      const k = (a.source === 'breakable' ? 'b' : a.source === 'pendulum' ? 'p' : 'e') + a.beat;
      const h = hits.get(k);
      if (!h) missing.push(`${a.source}@${a.beat}`);
      else if (Math.abs(h.beat - a.beat) > 0.25) missing.push(`${a.source}@${a.beat} (only at ${h.beat.toFixed(2)})`);
    }
    console.log(`on-time run: ${dead === null ? 'survives' : 'DIES at ' + dead.toFixed(2)}; strike targets unreachable on the beat: ${missing.length ? missing.join(', ') : 'none'}`);
  }
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
} finally {
  await server.close();
}
