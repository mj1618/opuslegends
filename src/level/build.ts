/**
 * Level builder: LevelDef (musical time) -> RuntimeLevel (world pixels, collision, entities).
 * Pure function of (level, tempo, song, tunables) so it can be rebuilt at any time.
 *
 * Placement rules (all derived from "the hero is at x = beat * ppb on that beat"):
 *   - spike:  centred at its beat (hop over it from beat - 0.5)
 *   - jabber:    placed so a strike pressed ON its beat connects early in the strike's active window,
 *              and body contact happens only ~0.42 beat later (late strikes within Good still win)
 *   - float:   bottom of the swing (strike height) just ahead of the hero on its beat
 *   - slam:    a one-way press top spanning [beat - 0.42, beat + 0.36] (where a tap hop lands)
 *   - breakable: `BREAK.ahead` px in front of its beat position (a strike ON the beat connects early)
 *   - bounce:  pad centred on its beat; tokens follow the launch arc (solved like the game does)
 *   - lowSign: hangs over [from, to], bottom edge SIGN.clear px above the ground
 *   - lumRow every 0.5 is SWUNG (k, k + song.swing), on the TOPMOST surface (so rows ride awnings);
 *     everything else sits on the ground-level surface (floors, dips, press tops), never on awnings
 *   - lumJump samples the real jump arc
 */
import type { SongDef } from '../audio/song';
import { swingBeat } from '../audio/song';
import type { TempoMap } from '../audio/tempoMap';
import type {
  ActionMarker,
  BouncePad,
  Breakable,
  CameraCue,
  CrowdCap,
  Checkpoint,
  Enemy,
  FxCue,
  PendulumTarget,
  Hazard,
  Hint,
  Label,
  LowSign,
  Lum,
  Phrase,
  SkyCue,
  SlamPlatform,
} from '../game/entities';
import { heightAt, jumpProfile } from '../game/jumpProfile';
import { CollisionWorld, type Solid } from '../game/physics';
import { Tun } from '../game/tunables';
import type { FailKind, GroundStyle, LevelDef } from './types';

export interface FloorSpan {
  x0: number;
  x1: number;
  /** top y (world, negative = above base ground) */
  y: number;
}

export interface RuntimeLevel {
  def: LevelDef;
  ppb: number;
  runSpeed: number;
  swing: number;
  world: CollisionWorld;
  floors: FloorSpan[];
  platforms: Solid[];
  blocks: Solid[];
  enemies: Enemy[];
  lums: Lum[];
  hazards: Hazard[];
  pendulums: PendulumTarget[];
  slams: SlamPlatform[];
  breakables: Breakable[];
  bouncePads: BouncePad[];
  signs: LowSign[];
  /** crowd cap by beat (sorted); default Tun.crowd.max */
  crowdCaps: CrowdCap[];
  phrases: Phrase[];
  checkpoints: Checkpoint[];
  finishX: number;
  finishBeat: number;
  fx: FxCue[];
  cameraCues: CameraCue[];
  skyCues: SkyCue[];
  hints: Hint[];
  /** ground look changes (by beat) */
  groundCues: { beat: number; style: GroundStyle }[];
  /** beat the Chaser rises (Infinity = never) */
  chaserBeat: number;
  /** [beat, on] toggles for scansion marks */
  marks: { beat: number; on: boolean }[];
  actions: ActionMarker[];
  labels: Label[];
  /** x extent of authored content */
  minX: number;
  maxX: number;
  /** floor top y at world x (NaN over gaps) */
  floorYAt(x: number): number;
  /** topmost static surface at x (floor/platform/block/slam); over a pit: nearest floor to the left */
  surfaceYNear(x: number): number;
}

const FLOOR_DEPTH = 1400;
const DEFAULT_LUM_H = 62;

/** Jabber geometry (see file header) */
export const JABBER = { w: 70, h: 96, hurtK: 0.72, contactBeats: 0.42 } as const;
/** Pendulum target geometry */
export const PENDULUM = { strikeHeight: 150, highStrikeHeight: 390, ahead: 90, len: 300, amp: 0.55, r: 26, rBig: 36, periodBeats: 4 } as const;
/** slam platform geometry/timing (beats relative to the slam beat) */
/**
 * Slam platform geometry/timing, in beats relative to its slam beat. A tap hop (~0.93 beat) pressed
 * up to ~0.25 beat early lands at ~-0.32, so the press top spans [-0.34, +0.33] and is solid from
 * -0.42 until just after the swung "and" (+swing+0.08); the visual is "down" exactly while solid.
 */
/* iteration 2: wider (press top -0.42..+0.36, solid from -0.5 to the "and" + 0.12) — sloppy ±110 ms survives */
export const SLAM = { from: -0.42, to: 0.36, thickness: 34, solidEarly: 0.5, solidLateExtra: 0.12, riseBeats: 0.28, fallBeats: 0.3 } as const;
/** Spike geometry */
export const SPIKE = { visW: 62, visH: 54, hurtW: 28, hurtH: 28 } as const;
/**
 * Breakable geometry. A strike pressed ON its beat reaches it early in the active window: the strike
 * box spans [x - 24, x + 198] and travels ~178 px while active, so a target `ahead` px in front of the
 * hero's beat position is hit by presses from ~-210 ms to ~+220 ms (neighbouring strikes ≥ 0.66 beat
 * apart can't reach it). `h` = centre height above the ground surface; `highH` = only reachable in the air.
 */
export const BREAK = { ahead: 200, r: 30, rBig: 40, h: 110, highH: 330, tokens: 3, tokensBig: 6 } as const;
/** Bounce pad geometry: pad half-width (beats), trigger band above the pad top (px) */
export const BOUNCE = { halfBeats: 0.3, trigger: 130, padH: 18 } as const;
/**
 * Low sign: bottom edge `clear` px above the ground (sliding hero = 40 tall, standing = 100), top at
 * `top` (a held jump can't clear it). The sign starts `lead` beats after the slide beat (dsl slideUnder)
 * so a press up to ~160 ms late still gets the hero low in time.
 */
export const SIGN = { clear: 58, top: 440, lead: 0.5 } as const;

export function buildLevel(def: LevelDef, tempo: TempoMap, song: SongDef): RuntimeLevel {
  const ppb = def.pixelsPerBeat;
  const bpm = tempo.bpmAtBeat(def.startBeat);
  const runSpeed = (ppb * bpm) / 60;
  const X = (beat: number) => beat * ppb;
  const spb = 60 / bpm;
  const swing = song.swing;

  // ---------------------------------------------------------------- floor
  const floorFrom = def.startBeat - 16;
  const floorTo = def.endBeat + 32;
  const bounds = new Set<number>([floorFrom, floorTo]);
  for (const it of def.items) {
    if (it.type === 'floor' || it.type === 'gap') {
      bounds.add(it.from);
      bounds.add(it.to);
    }
  }
  const edges = [...bounds].filter((b) => b >= floorFrom && b <= floorTo).sort((a, b) => a - b);
  const floors: FloorSpan[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    const mid = (a + b) / 2;
    let h = 0;
    let hole = false;
    for (const it of def.items) {
      if (it.type === 'floor' && mid > it.from && mid < it.to) h = it.h;
      if (it.type === 'gap' && mid > it.from && mid < it.to) hole = true;
    }
    if (hole) continue;
    const last = floors[floors.length - 1];
    if (last && last.x1 === X(a) && last.y === -h) last.x1 = X(b);
    else floors.push({ x0: X(a), x1: X(b), y: -h });
  }
  const floorYAt = (x: number): number => {
    for (const f of floors) if (x >= f.x0 && x < f.x1) return f.y;
    return NaN;
  };
  const floorYNear = (x: number): number => {
    const y = floorYAt(x);
    if (!Number.isNaN(y)) return y;
    let best = 0;
    for (const f of floors) if (f.x1 <= x) best = f.y;
    return best;
  };

  const world = new CollisionWorld();
  for (const f of floors) world.add({ kind: 'solid', x: f.x0, y: f.y, w: f.x1 - f.x0, h: FLOOR_DEPTH });

  // ---------------------------------------------------------------- geometry pass
  const platforms: Solid[] = [];
  const blocks: Solid[] = [];
  const slams: SlamPlatform[] = [];
  let id = 1;
  for (const it of def.items) {
    switch (it.type) {
      case 'platform': {
        const th = it.thickness ?? 30;
        const s: Solid = { kind: it.oneWay === false ? 'solid' : 'oneway', x: X(it.from), y: -it.h, w: X(it.to) - X(it.from), h: th };
        platforms.push(s);
        world.add(s);
        break;
      }
      case 'block': {
        const bottom = it.bottom ?? 0;
        const s: Solid = { kind: 'solid', x: X(it.from), y: -it.h, w: X(it.to) - X(it.from), h: it.h - bottom };
        blocks.push(s);
        world.add(s);
        break;
      }
      case 'slam': {
        const s: Solid = { kind: 'oneway', x: X(it.beat + SLAM.from), y: 0, w: X(SLAM.to - SLAM.from), h: SLAM.thickness, active: true };
        world.add(s);
        slams.push({ id: id++, beat: it.beat, set: ((Math.round(it.beat) % 2) + 2) % 2 === 0 ? 'A' : 'B', solid: s, lift: 0, wasDown: true });
        break;
      }
      default:
        break;
    }
  }

  const surfaceYNear = (x: number): number => {
    const y = world.groundBelow(x, -1e5, 2e5);
    return Number.isNaN(y) ? floorYNear(x) : y;
  };
  /**
   * ground-level surface at x: floor spans (street, raised rooftops / bar tops, dips), else slam press
   * tops over a shaft, else the nearest floor to the left — ignores one-way awnings/platforms
   */
  const groundYNear = (x: number): number => {
    const fy = floorYAt(x);
    if (!Number.isNaN(fy)) return fy;
    const y = world.groundBelow(x, -60, 2e5);
    return Number.isNaN(y) ? floorYNear(x) : y;
  };

  // ---------------------------------------------------------------- entities pass
  const enemies: Enemy[] = [];
  const lums: Lum[] = [];
  const hazards: Hazard[] = [];
  const pendulums: PendulumTarget[] = [];
  const phrases: Phrase[] = [];
  const breakables: Breakable[] = [];
  const bouncePads: BouncePad[] = [];
  const signs: LowSign[] = [];
  const crowdCaps: CrowdCap[] = [];
  const checkpoints: Checkpoint[] = [];
  const fx: FxCue[] = [];
  const cameraCues: CameraCue[] = [];
  const skyCues: SkyCue[] = [];
  const hints: Hint[] = [];
  const groundCues: { beat: number; style: GroundStyle }[] = [];
  const marks: { beat: number; on: boolean }[] = [];
  const actions: ActionMarker[] = [];
  const labels: Label[] = [];
  let finishBeat = def.endBeat;
  let chaserBeat = Infinity;

  const addLum = (beat: number, y: number, note?: number, angle = 0) => {
    lums.push({ id: id++, beat, x: X(beat), y, note, collected: false, collectT: 0, skipped: false, angle });
  };
  const DEFAULT_FAIL: Record<string, FailKind> = { gap: 'death', spike: 'stumble', jabber: 'stumble', float: 'none', lowSign: 'stumble', breakable: 'none' };

  for (const it of def.items) {
    if ('action' in it && it.action) {
      const a = it.action;
      const x = X(a.beat);
      actions.push({
        ...a,
        x,
        source: it.type,
        failKind: a.fail ?? DEFAULT_FAIL[it.type] ?? 'none',
        phrase: -1,
        glyph: a.mark === 'none' ? 'none' : a.mark ?? (a.type === 'jump' && (a.hold ?? 1) >= 0.5 ? 'long' : 'short'),
        groundY: groundYNear(x),
      });
    }
    switch (it.type) {
      case 'jabber': {
        const hurtW = JABBER.w * JABBER.hurtK;
        const hurtLeft = X(it.beat) + (Tun.player.width / 2 - Tun.player.hurtInset) + JABBER.contactBeats * ppb;
        const cx = hurtLeft + hurtW / 2;
        const y = groundYNear(cx);
        enemies.push({
          id: id++,
          kind: 'jabber',
          beat: it.beat,
          homeX: cx,
          homeY: y,
          x: cx,
          y,
          w: JABBER.w,
          h: JABBER.h,
          alive: true,
          retired: false,
          heaved: false,
          vx: 0,
          vy: 0,
          rot: 0,
          vrot: 0,
          deadTime: 0,
          hitFlash: 0,
          jabT: 0,
          react: it.react ?? { every: 1, kind: 'squash', amount: 0.1, decay: 0.3 },
        });
        break;
      }
      case 'spike': {
        const x = X(it.beat);
        const fy = groundYNear(x) - (it.h ?? 0);
        const vis = { x: x - SPIKE.visW / 2, y: fy - SPIKE.visH, w: SPIKE.visW, h: SPIKE.visH };
        const rect = { x: x - SPIKE.hurtW / 2, y: fy - SPIKE.hurtH, w: SPIKE.hurtW, h: SPIKE.hurtH };
        hazards.push({ id: id++, kind: 'spike', vis, rect, beat: it.beat, alive: true, vx: 0, vy: 0, rot: 0, offX: 0, offY: 0 });
        break;
      }
      case 'pendulum': {
        const bx = X(it.beat) + PENDULUM.ahead;
        const by = floorYNear(X(it.beat)) - (it.high ? PENDULUM.highStrikeHeight : PENDULUM.strikeHeight);
        pendulums.push({
          id: id++,
          beat: it.beat,
          big: !!it.big,
          pivotX: bx,
          pivotY: by - PENDULUM.len,
          len: PENDULUM.len,
          amp: PENDULUM.amp,
          x: bx,
          y: by,
          r: it.big ? PENDULUM.rBig : PENDULUM.r,
          struck: false,
          struckT: 0,
          glint: 0,
        });
        break;
      }
      case 'breakable': {
        const bx = X(it.beat) + BREAK.ahead;
        const base = groundYNear(X(it.beat));
        const high = !!it.high;
        const h = it.h ?? (high ? BREAK.highH : BREAK.h);
        breakables.push({
          id: id++,
          beat: it.beat,
          x: bx,
          y: base - h,
          r: it.big ? BREAK.rBig : BREAK.r,
          baseY: base,
          high,
          big: !!it.big,
          look: it.look ?? (it.big ? 'crate' : 'bottle'),
          tokens: it.tokens ?? (it.big ? BREAK.tokensBig : BREAK.tokens),
          broken: false,
          brokenT: 0,
        });
        break;
      }
      case 'bounce': {
        const x = X(it.beat);
        const y = groundYNear(x);
        const landY = it.land !== undefined ? -it.land : y;
        const pad: BouncePad = { id: id++, beat: it.beat, landBeat: it.beat + it.beats, landY, x, y, w: 2 * BOUNCE.halfBeats * ppb, kick: 0, used: false };
        bouncePads.push(pad);
        if (it.tokens !== false) {
          // tokens along the launch arc (same solver the game uses at launch time)
          const dh = y - landY; // + = lands higher
          const v = launchVelocity(it.beats * spb, dh, spb);
          for (const [db, hgt] of launchArc(v, spb, dh, it.beats)) addLum(it.beat + db, y - hgt - Tun.player.height * 0.6);
        }
        break;
      }
      case 'lowSign': {
        const x0 = X(it.from);
        const x1 = X(it.to);
        const gy = groundYNear((x0 + x1) / 2);
        signs.push({ id: id++, beat: it.from, rect: { x: x0, y: gy - SIGN.top, w: x1 - x0, h: SIGN.top - SIGN.clear }, hit: false, swing: 0 });
        break;
      }
      case 'crowd':
        crowdCaps.push({ beat: it.beat, cap: it.cap });
        break;
      case 'phrase':
        phrases.push({ beats: it.beats });
        break;
      case 'lum': {
        addLum(it.beat, groundYNear(X(it.beat)) - (it.h ?? DEFAULT_LUM_H), it.note);
        break;
      }
      case 'lumRow': {
        const every = it.every ?? 0.5;
        for (let b = it.from; b <= it.to + 1e-6; b += every) {
          const sb = every === 0.5 ? swingBeat(b, swing) : b;
          addLum(sb, surfaceYNear(X(sb)) - (it.h ?? DEFAULT_LUM_H));
        }
        break;
      }
      case 'lumJump': {
        const every = it.every ?? 1 / 3;
        const holdSec = (it.hold ?? 1) * spb;
        const prof = jumpProfile(holdSec, runSpeed, ppb);
        const takeoffY = groundYNear(X(it.beat));
        const airBeats = prof.airtime / spb;
        const H = (db: number) => heightAt(prof, db * spb);
        for (let db = it.skipFirst ? every : 0; db < airBeats - every * 0.5; db += every) {
          const slope = (H(db + 0.02) - H(db - 0.02)) / (0.04 * ppb);
          addLum(it.beat + db, takeoffY - H(db) - Tun.player.height * 0.6, undefined, -Math.atan(slope));
        }
        break;
      }
      case 'checkpoint': {
        const x = X(it.beat);
        checkpoints.push({ beat: it.beat, x, y: groundYNear(x), reached: false, flash: 0 });
        break;
      }
      case 'finish':
        finishBeat = it.beat;
        break;
      case 'fx':
        fx.push({ beat: it.beat, fx: it.fx, amount: it.amount ?? 1 });
        break;
      case 'camera':
        cameraCues.push({ beat: it.beat, zoom: it.zoom, beats: it.beats ?? 4 });
        break;
      case 'sky':
        skyCues.push({ beat: it.beat, preset: it.preset });
        break;
      case 'ground':
        groundCues.push({ beat: it.beat, style: it.style });
        break;
      case 'hint':
        hints.push({ beat: it.beat, beats: it.beats ?? 8, text: it.text });
        break;
      case 'chaser':
        chaserBeat = Math.min(chaserBeat, it.beat);
        break;
      case 'marks':
        marks.push({ beat: it.beat, on: it.on });
        break;
      case 'label':
        labels.push({ beat: it.beat, x: X(it.beat), text: it.text });
        break;
      default:
        break;
    }
  }
  actions.sort((a, b) => a.beat - b.beat);
  // phrases: tag their actions; the final strike is a long "–" (the Heave)
  phrases.forEach((ph, pi) => {
    for (const b of ph.beats) {
      for (const a of actions) if (Math.abs(a.beat - b) < 1e-6) a.phrase = pi;
    }
    const last = actions.find((a) => Math.abs(a.beat - ph.beats[2]) < 1e-6 && a.type === 'strike');
    if (last && !last.mark) last.glyph = 'long';
  });
  lums.sort((a, b) => a.beat - b.beat);
  enemies.sort((a, b) => a.beat - b.beat);
  pendulums.sort((a, b) => a.beat - b.beat);
  slams.sort((a, b) => a.beat - b.beat);
  breakables.sort((a, b) => a.beat - b.beat);
  bouncePads.sort((a, b) => a.beat - b.beat);
  signs.sort((a, b) => a.beat - b.beat);
  crowdCaps.sort((a, b) => a.beat - b.beat);
  checkpoints.sort((a, b) => a.beat - b.beat);
  cameraCues.sort((a, b) => a.beat - b.beat);
  skyCues.sort((a, b) => a.beat - b.beat);
  marks.sort((a, b) => a.beat - b.beat);

  return {
    def,
    ppb,
    runSpeed,
    swing,
    world,
    floors,
    platforms,
    blocks,
    enemies,
    lums,
    hazards,
    pendulums,
    slams,
    breakables,
    bouncePads,
    signs,
    crowdCaps,
    phrases,
    checkpoints,
    finishX: X(finishBeat),
    finishBeat,
    fx,
    cameraCues,
    skyCues,
    hints,
    groundCues: groundCues.sort((a, b) => a.beat - b.beat),
    chaserBeat,
    marks,
    actions,
    labels,
    minX: X(floorFrom),
    maxX: X(floorTo),
    floorYAt,
    surfaceYNear,
  };
}

/** Camera zoom the level asks for at `beat` (eased between cues). */
export function cameraZoomAt(L: RuntimeLevel, beat: number, base: number): number {
  let z = base;
  for (const c of L.cameraCues) {
    if (beat < c.beat) break;
    const k = Math.min(1, (beat - c.beat) / Math.max(0.001, c.beats));
    const e = k * k * (3 - 2 * k);
    z = z + (c.zoom - z) * e;
  }
  return z;
}

/** Ground look at world beat position `beat` (default street). */
export function groundStyleAt(L: RuntimeLevel, beat: number): GroundStyle {
  let st: GroundStyle = 'street';
  for (const c of L.groundCues) {
    if (beat < c.beat) break;
    st = c.style;
  }
  return st;
}

/** Are scansion marks on at `beat`? (default on) */
export function marksOnAt(L: RuntimeLevel, beat: number): boolean {
  let on = true;
  for (const m of L.marks) {
    if (beat < m.beat) break;
    on = m.on;
  }
  return on;
}

/**
 * slam platform state at song beat `now`: phase relative to its slam grid (period 2 beats).
 * Solid from `solidEarly` before the slam until just after the swung "and".
 */
export function slamState(f: SlamPlatform, now: number, swing: number): { solid: boolean; lift: number; phase: number } {
  let ph = (now - f.beat) % 2;
  if (ph < 0) ph += 2;
  // signed phase in [-1, 1): 0 = slam
  const s = ph >= 1 ? ph - 2 : ph;
  const end = swing + SLAM.solidLateExtra;
  const solid = s >= -SLAM.solidEarly && s <= end;
  // presentation: down exactly while solid, rising after, hovering, descending just before
  let lift: number;
  if (solid) lift = 0;
  else if (s > end) lift = Math.min(1, (s - end) / SLAM.riseBeats);
  else if (s >= -SLAM.solidEarly - SLAM.fallBeats) lift = (-SLAM.solidEarly - s) / SLAM.fallBeats;
  else lift = 1;
  return { solid, lift: Math.max(0, Math.min(1, lift)), phase: s };
}

/** Crowd cap in effect at `beat` (level `crowd` items; default Tun.crowd.max). */
export function crowdCapAt(L: RuntimeLevel, beat: number): number {
  let cap: number = Tun.crowd.max;
  for (const c of L.crowdCaps) {
    if (beat < c.beat - 1e-6) break;
    cap = c.cap;
  }
  return cap;
}

/**
 * Free flight of a launched hero (no jump held: plain gravity rising, Tun.jump.fallGravityMul falling,
 * capped at maxFallSpeed), simulated at the sim rate. Returns the time (s) until the hero comes down
 * through `dh` px above the takeoff (dh > 0 = higher), or Infinity if the apex never reaches it.
 */
function flightTime(v: number, dh: number, spb: number): number {
  const J = Tun.jump;
  const tApex = J.timeToApexBeats * spb;
  const g = (2 * J.height) / (tApex * tApex);
  const dt = 1 / Tun.sim.hz;
  let vy = -v;
  let y = 0; // height above takeoff (positive up)
  for (let t = 0; t < 10; t += dt) {
    vy = Math.min(vy + g * (vy > 0 ? J.fallGravityMul : 1) * dt, J.maxFallSpeed);
    y -= vy * dt;
    if (vy > 0 && y <= dh) return t + dt;
  }
  return Infinity;
}

/** Launch speed (px/s, upward) so a free flight lasts `sec` and lands `dh` px above the takeoff. */
export function launchVelocity(sec: number, dh: number, spb: number): number {
  let lo = 100;
  let hi = 6000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (flightTime(mid, dh, spb) < sec) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** [beat offset, height above takeoff] samples along a launch arc, every 1/3 beat (skipping the pad). */
function launchArc(v: number, spb: number, dh: number, beats: number): [number, number][] {
  const J = Tun.jump;
  const tApex = J.timeToApexBeats * spb;
  const g = (2 * J.height) / (tApex * tApex);
  const dt = 1 / Tun.sim.hz;
  const out: [number, number][] = [];
  let vy = -v;
  let y = 0;
  let next = 1 / 3;
  for (let t = 0; t < beats * spb; t += dt) {
    vy = Math.min(vy + g * (vy > 0 ? J.fallGravityMul : 1) * dt, J.maxFallSpeed);
    y -= vy * dt;
    const b = (t + dt) / spb;
    if (b >= next && b < beats - 0.25) {
      out.push([b, y]);
      next += 1 / 3;
    }
    if (vy > 0 && y <= dh) break;
  }
  return out;
}
