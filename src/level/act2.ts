/**
 * ACT 2 — edit bars 34-60 (beats 132-240): verse 3 (the boogie bass + stop-time), pre-chorus 3, chorus 3, tag 3.
 * Plan and bar-by-bar rationale: docs/level/act2_plan.md (iteration 4: the vertical rework). Merged after act 1 by
 * level/index.ts (continuous world x; act 1's finish line becomes the honky-tonk's front door; act 3 starts on this
 * act's last floor height).
 *
 *   bar  34     THE BREATH: out the door onto 42nd Street, the camera tilts up the Jimperial (facadeReveal). Rewards.
 *   bars 35-41  THE CLIMB, ~1,600 px up the fire escapes on the boogie bass: flights of stairs walk you up (no input,
 *               hands free), ledge hops UP on the climbing notes (G# A A# B on the "and"s), storey-high HELD jumps,
 *               alleys jumped UP (lethal), the first HOOK RIDE (strike the counterweight rope on the kick: it hoists
 *               you two storeys), bottles to bat back, one firebomb. The peak (41): two gaps hopped UP on the fill.
 *   bars 42-49  THE ROOF + STOP-TIME (the valley): big smashes in the holes the bass leaves, a laundry line hooked ON
 *               the held note (178.66: glide over the light well), BIG JIM's glint (180), the window-washer's CRADLE
 *               hoisting you up the tower one step per B on the B pedal (188-191) while you smash panes.
 *   bars 50-51  PRE-CHORUS on the tower's ledge: the hush, then HUP (held jump up to the sill) · HUP (bat) · HEY = the
 *               Heave sends the goon across the light well THROUGH the Lanes' window far below.
 *   bars 52-60  THE DROP + the BLACKLIGHT LANES (chorus 3): hook the cable ON the chorus downbeat and ZIP ~900 px down
 *               through the smashed window (zipDrop), then bowling: balls to hop, ball-return pops to bat on HEY HEY,
 *               the pinsetter's sweep bar hooked over the pit (with a rack smashed mid-ride), a slick-lane knee-slide,
 *               the peak gutter, a ball-return launch to the catwalk and the hook-A WALKDOWN walked DOWN the catwalk
 *               (STRIKE! · hop down · SPARE! · hop down), the tag.                                    ◆ 132 164 196 220 236
 *
 * GRID: bar n starts on beat 4(n-1); "&" = the swung and (+0.66). Heights = px above the street. Every lethal fit was
 * measured with the real controller (node playtest/slack.mjs --stumbles; windows in the plan doc): pits ≥ −85/+150 ms,
 * moving threats ≥ +130 ms late.
 */
import {
  and,
  bottle,
  bottleHigh,
  crate,
  giantKeg,
  jabber,
  launch,
  lumArcHop,
  lumArcJump,
  lumRowSwung,
  melodyTokens,
  pendulum,
  slideUnder,
  tokenHop,
  tokenJump,
} from './dsl';
import type { BreakableLook, FxKind, HookStyle, LevelDef, LevelItem, SetPieceName } from './types';

/** beat of bar n (1-based, the edit's numbering), beat k (1-based) */
const bar = (n: number, beat = 1) => (n - 1) * 4 + (beat - 1);
const fx = (beat: number, kind: FxKind, amount = 1): LevelItem => ({ type: 'fx', beat, fx: kind, amount });
const mode = (beat: number, m: string): LevelItem => ({ type: 'mode', beat, mode: m });
const follows = (beat: number, lane: string): LevelItem => ({ type: 'follows', beat, lane });
const hint = (beat: number, text: string, beats = 6): LevelItem => ({ type: 'hint', beat, beats, text });
const label = (beat: number, text: string): LevelItem => ({ type: 'label', beat, text });
const setPiece = (beat: number, name: SetPieceName, beats = 4, extra: { h?: number; ahead?: number } = {}): LevelItem => ({ type: 'setPiece', beat, name, beats, ...extra });
const TAP = 0.15;

// ------------------------------------------------------------------ act-2 pieces (measured fits, see the plan)

/** a window pane on the facade (strike ON `beat`: reward); `big` = the stop-time's single big hits */
const pane = (beat: number, big = false): LevelItem => bottle(beat, 'window', big);
/** a bowling pin (reward) */
const pin = (beat: number): LevelItem => bottle(beat, 'pin');

/**
 * a bottle thrown from a window, arriving at the bat point ON `beat`: strike to bat it back (stumble if missed).
 * In the Lanes (ground style 'lanes') the same throw is a ball / pin POPPING out of the ball return (the art's skin).
 */
function batBottle(beat: number): LevelItem {
  return { type: 'thrown', beat, style: 'bottle', action: { type: 'strike', beat, fail: 'stumble' } };
}
/** a firebomb that shatters a hop ahead ON `beat`: tap-hop over the flames (stumble) */
function firebomb(beat: number): LevelItem[] {
  return [{ type: 'thrown', beat, style: 'firebomb', action: { type: 'jump', beat, hold: TAP, fail: 'stumble' } }, lumArcHop(beat)];
}
/** a bowling ball rolling in along the lane: tap-hop it ON `beat` (stumble) */
function ball(beat: number, from?: number): LevelItem[] {
  return [{ type: 'ball', beat, from, action: { type: 'jump', beat, hold: TAP, fail: 'stumble' } }, lumArcHop(beat)];
}

/**
 * The act's terrain: consecutive floor spans, gaps and stairs, authored left to right. Heights are absolute.
 *   T.up(beat, rise)              a tap hop ON `beat` up a `rise` px ledge whose edge is at beat + UP.edge (reward: a
 *                                 missed hop is a bonk + ledge scramble, ~0.3 beat lost)
 *   T.storey(beat, rise)          a HELD jump ON `beat` up a storey (`rise` ≤ 150) onto the next fire-escape landing,
 *                                 edge at beat + STOREY.edge (reward: a tapped hop bonks and scrambles, ~0.5 beat)
 *   T.stairs(a, b, rise)          a fire-escape FLIGHT from beat a to b rising `rise` px in ≤ 24 px risers (the 26 px
 *                                 step-up assist walks you up it: no input, the hands are free)
 *   T.gapUp(beat, [f, t], rise, hold)  a gap [beat+f, beat+t] jumped UP onto a ledge `rise` px higher (lethal)
 *   T.set(beat, h)                the floor changes height at `beat` (a launch target, a recess, ...)
 */
const UP = { edge: 0.55 } as const;
const STOREY = { edge: 0.8 } as const;
class Terrain {
  readonly items: LevelItem[] = [];
  /** [from, h] of every span so far (for hAt) */
  private log: [number, number][] = [];
  private from: number;
  h: number;
  constructor(from: number, h: number) {
    this.from = from;
    this.h = h;
  }
  /** floor changes to height `h` at `beat` */
  set(beat: number, h: number): this {
    if (beat > this.from) {
      this.items.push({ type: 'floor', from: this.from, to: beat, h: this.h });
      this.log.push([this.from, this.h]);
    }
    this.from = beat;
    this.h = h;
    return this;
  }
  /** floor height at `beat` (the last span starting at or before it; over a pit: the ledge before it) */
  hAt(beat: number): number {
    let h = this.log.length ? this.log[0][1] : this.h;
    for (const [f, hh] of this.log) if (f <= beat + 1e-9) h = hh;
    if (beat >= this.from) h = this.h;
    return h;
  }
  /** a hop UP a ledge (reward; see the class doc) */
  up(beat: number, rise: number): this {
    this.items.push({ type: 'ledge', beat, action: { type: 'jump', beat, hold: TAP, fail: 'none' } }, lumArcHop(beat));
    return this.set(beat + UP.edge, this.h + rise);
  }
  /** a held jump UP a storey onto the next landing (reward; see the class doc) */
  storey(beat: number, rise: number, edge: number = STOREY.edge): this {
    this.items.push({ type: 'ledge', beat, action: { type: 'jump', beat, hold: 1, fail: 'none' } }, lumArcJump(beat));
    return this.set(beat + edge, this.h + rise);
  }
  /** a flight of stairs from a to b rising `rise` px (risers ≤ 24 px, the step-up assist is 26) */
  stairs(a: number, b: number, rise: number): this {
    const n = Math.max(1, Math.ceil(rise / 24));
    const h0 = this.h;
    for (let i = 1; i <= n; i++) this.set(a + ((b - a) * (i - 1)) / n, h0 + (rise * i) / n);
    return this.set(b, h0 + rise);
  }
  /** a lethal gap [beat+f, beat+t] crossed by a hop (hold TAP) or jump (hold 1) pressed ON `beat`, landing `rise` px higher */
  gapUp(beat: number, fit: readonly [number, number], rise: number, hold = 1): this {
    const [f, t] = fit;
    this.set(beat + f, this.h);
    this.items.push({ type: 'gap', from: beat + f, to: beat + t, action: { type: 'jump', beat, hold } }, hold >= 0.5 ? lumArcJump(beat) : lumArcHop(beat));
    this.log.push([beat + f, this.h]);
    this.from = beat + t;
    this.h += rise;
    return this;
  }
  /** a lethal pit [a, b] with no action of its own (a hook ride carries the action), landing at height `h` */
  pit(a: number, b: number, h = this.h): this {
    this.set(a, this.h);
    this.items.push({ type: 'gap', from: a, to: b });
    this.log.push([a, this.h]);
    this.from = b;
    this.h = h;
    return this;
  }
  /** a recessed balcony / light well [a, b] `depth` px down (safe: walk or scramble out) */
  recess(a: number, b: number, depth = 24): this {
    const h = this.h;
    this.set(a, h - depth);
    return this.set(b, h);
  }
  end(beat: number): LevelItem[] {
    this.set(beat, this.h);
    return this.items;
  }
}

/**
 * HOOK RIDE (game/mech/hook.ts): strike ON `beat` to hook the rope / line / cradle, ride the feet `path` ([beat, h]
 * absolute, first point = the grab) and let go at its end. `fail` = what a miss costs ('none' when stairs / a ladder
 * wait below, 'death' over a pit). Tokens trace the ride (`tokenH` px above the feet).
 */
function hookRide(beat: number, style: HookStyle, path: [number, number][], fail: 'none' | 'death', floorAt: (b: number) => number, tokenH = 70): LevelItem[] {
  const out: LevelItem[] = [{ type: 'hook', beat, style, path, action: { type: 'strike', beat, fail } }];
  const end = path[path.length - 1][0];
  for (let b = path[0][0] + 1 / 3; b < end - 0.1; b += 1 / 3) {
    let h = path[0][1];
    for (let i = 1; i < path.length; i++) {
      if (b <= path[i][0]) {
        const [ba, ha] = path[i - 1];
        const [bb, hb] = path[i];
        h = ha + ((hb - ha) * (b - ba)) / Math.max(1e-6, bb - ba);
        break;
      }
    }
    out.push({ type: 'lum', beat: b, h: h + tokenH - floorAt(b) });
  }
  return out;
}

// ------------------------------------------------------------------ heights (px above the street)
const H_STREET = 0;
const H_LANES = 950; // the Blacklight Lanes' lane deck (chorus 3; act 3 starts here)

// ------------------------------------------------------------------ terrain, left to right
const T = new Terrain(bar(34) - 4, H_STREET);
// bar 34: a basement areaway (a shallow step down, safe) hopped on the snare — the pit shape, before the climb's alleys
T.recess(bar(34, 4) + 0.22, bar(34, 4) + 0.68);
// bar 35: onto the fire escape (136), a FLIGHT walks you up, then the boogie climb G# A on the "and"s: up, up
T.up(bar(35, 1), 60); // 60
T.stairs(bar(35, 1) + 0.7, bar(35, 2) + 0.45, 144); // 204
T.up(and(bar(35, 2)), 60); // 264
T.up(and(bar(35, 3)), 60); // 324
// bar 36: the first ALLEY, jumped UP a storey on the kick (held); a flight after the snare
T.gapUp(bar(36, 1), [0.3, 1.45], 110); // 434
T.stairs(bar(36, 3) + 0.4, bar(36, 4) + 0.4, 168); // 602
// bar 37: a hop up on the E, a STOREY jump (held) on the A, a hop up on the A#
T.up(bar(37, 1), 60); // 662
T.storey(bar(37, 2), 120); // 782
T.up(bar(37, 4), 60); // 842
// bar 38: THE HOIST — strike the counterweight rope on the kick (148) and it yanks you two storeys (hookRide below);
// miss it and the fire-escape flight under it walks you up the same two storeys
const HOIST0 = T.h;
T.stairs(bar(38, 1) + 0.35, bar(38, 2) + 0.55, 288); // 1130
T.up(bar(38, 4), 60); // 1190
// bar 39: up on the E (153), the second ALLEY jumped UP on the A (154, the boom)
T.up(bar(39, 2), 60); // 1250
T.gapUp(bar(39, 3), [0.3, 1.575], 110); // 1360
T.stairs(bar(39, 4) + 0.6, bar(40, 1) - 0.05, 60); // 1420
// bar 40: up on the E, a flight, the firebomb on the landing (158)
T.up(bar(40, 1), 60); // 1480
T.stairs(bar(40, 1) + 0.7, bar(40, 2) + 0.7, 60); // 1540
// bar 41: THE PEAK — two gaps hopped UP on the fill (160, 162)
T.gapUp(bar(41, 1), [0.09, 0.71], 40, TAP); // 1580
T.gapUp(bar(41, 3), [0.09, 0.7], 40, TAP); // 1620 = the roof
const H_ROOF = T.h;
// bars 42-47 on the roof. bar 42: a held jump over a vent (flat). bar 45: the laundry line over a light well (safe:
// 60 px down, scramble out) on the held note 178.66
T.recess(bar(45, 3) + 1.0, bar(45, 4) + 0.95, 60);
// bar 47: a held jump over a recessed balcony on the held note
T.recess(and(bar(47, 1)) + 0.3, and(bar(47, 1)) + 1.6);
// bar 48: THE CRADLE hoists you up the tower on the B pedal (188-191: +80 per B). Miss it: two ladders (scramble up)
const CRADLE0 = T.h;
T.set(bar(48, 2) + 0.6, CRADLE0 + 120); // 1740 (ladder 1)
T.set(bar(48, 4) + 0.2, CRADLE0 + 240); // 1860 (ladder 2) = the tower ledge
// bar 49: up on the kick
T.up(bar(49, 1), 60); // 1920
// bar 51: HUP = a hop UP to the big window's sill across a gap (the kick)
T.gapUp(bar(51, 1), [0.09, 0.71], 40, TAP); // 1960 = the sill
const H_SILL = T.h;
// bar 52: THE DROP — the cable from the sill down to the Lanes' window (hookRide): the light well below is lethal
T.pit(bar(52, 1) + 0.6, bar(52, 3) + 0.5, H_LANES);
// bar 53: a gutter on the kick
T.gapUp(bar(53, 1), [0.09, 0.82], 0, TAP);
// bar 54: the pinsetter pit under the sweep bar (the hook ride carries the action)
T.pit(bar(54, 1) + 0.55, bar(54, 3) + 0.7);
// bar 55: a gutter on the kick (216)
T.gapUp(bar(55, 1), [0.09, 0.8], 0, TAP);
// bar 57: the peak gutter on the kick, then the ball-return launch (226) onto the pinsetter catwalk
T.gapUp(bar(57, 1), [0.09, 0.8], 0, TAP);
T.set(bar(57, 4) + 0.6, H_LANES + 120); // the catwalk (+120): the ball-return launch (226) lands on it at 227.85
// bar 58: the WALKDOWN walked DOWN the catwalk: hop down a tier over a pinsetter pit on the B (228) and the G (230)
T.gapUp(bar(58, 1), [0.09, 1.05], -60, TAP); // 1010
T.gapUp(bar(58, 3), [0.09, 0.93], -60, TAP); // 950
const terrain = T.end(bar(61) + 40);
const floorAt = (b: number) => T.hAt(b);

export const act2Items: LevelItem[] = [
  ...terrain,

  // ================================================================ bar 34 — THE BREATH (out the door) ◆ 132
  { type: 'checkpoint', beat: bar(34) },
  { type: 'chaser', beat: bar(34) }, // (act 1 raised it on bar 5; standalone act-2 runs need it too)
  { type: 'sky', beat: bar(34), preset: 'facade' },
  { type: 'ground', beat: bar(34), style: 'facade' },
  // the verse cap waits for the climb (review iter3 fix 5: the crowd decays over the breath instead of clamping on 132)
  { type: 'crowd', beat: bar(36), cap: 16 },
  setPiece(bar(34), 'facadeReveal', 4, { h: 1960, ahead: 6 }),
  setPiece(bar(34), 'climb', 32),
  mode(bar(34), 'street'),
  follows(bar(34), 'bassWalks'),
  label(bar(34), 'VERSE 3 — the Jimperial'),
  // camera `ground` = the hero's ground line on screen (default 0.66): the climb frames him HIGH so the street drops away
  { type: 'camera', beat: bar(34), zoom: 0.84, beats: 2, ground: 0.62 },
  // ---- bar 34: act 1's last launch lands ON 133 on 42nd Street; a ground-floor window on the snare, a hop over the
  // basement areaway on 4, tokens on the fill's "and". Nothing hurts: look up.
  pane(bar(34, 2)),
  { type: 'action', action: { type: 'jump', beat: bar(34, 4), hold: TAP, fail: 'none' } }, // over the areaway (safe)
  lumArcHop(bar(34, 4)),
  lumRowSwung(and(bar(34, 4)), bar(35, 1) + 0.5),

  // ================================================================ bars 35-41 — THE CLIMB. Follows: the boogie bass
  // ---- bar 35: up onto the fire escape on the kick, a FLIGHT walks you up, the boogie's climbing notes G# (137.63)
  // and A (138.66) are hops UP on the "and"s, a window on the B (139.68)
  { type: 'camera', beat: bar(35, 1), zoom: 0.86, beats: 4, ground: 0.52 },
  mode(bar(35, 1), 'climb'),
  // iteration 5 (review iter4 fix 4, the 26 s facade): the windows light up one per beat just ahead of Slim (bars 35-38)
  setPiece(bar(35, 1), 'lightChase', 16, { ahead: 1 }),
  lumRowSwung(bar(35, 1) + 0.9, bar(35, 2) + 0.4, 70), // tokens up the flight
  pane(and(bar(35, 4))),
  fx(and(bar(35, 4)), 'bgPulse', 0.5),
  // ---- bar 36: the first ALLEY jumped UP a storey on the kick, the first THROWN BOTTLE batted on the snare, a flight
  // on 3-4, tokens on the fill (143.65)
  hint(bar(35, 3), 'Bottles fly from the windows — SWING on the beat to bat them back!', 6),
  batBottle(bar(36, 3)),
  lumRowSwung(bar(36, 3) + 0.5, bar(36, 4) + 0.5, 70),
  // ---- bar 37: up on the E, a STOREY jump (held) on the A, up on the A#
  // ---- bar 38: THE HOIST — strike the counterweight rope on the kick: yanked two storeys (+300) by 149.95; a hop
  // through tokens on the landing (the snare), up on the E
  ...hookRide(
    bar(38, 1),
    'rope',
    [
      [bar(38, 1), HOIST0],
      [bar(38, 1) + 0.8, HOIST0 + 280],
      [bar(38, 2) + 0.7, HOIST0 + 292],
    ],
    'none',
    floorAt,
  ),
  mode(bar(38, 1), 'ride'),
  hint(bar(37, 3), 'SWING at the rope on the beat — it hauls you up!', 5),
  { type: 'camera', beat: bar(38, 1), zoom: 0.8, beats: 2 },
  fx(bar(38, 1), 'zoom', 0.5),
  mode(bar(38, 3), 'climb'),
  ...tokenHop(bar(38, 3)),
  // ---- bar 39: a hop through tokens on the kick, up on the E (153), the second ALLEY jumped UP on the A (154, the boom), a high
  // bottle mid-air on the B (155), tokens up the flight on the fill (155.61)
  // iteration 5: the camera TILTS for a bar to show how far down the street is (streetReveal), then back to the climb
  setPiece(bar(39, 1), 'streetReveal', 4),
  { type: 'camera', beat: bar(39, 1), zoom: 0.8, beats: 1.5, ground: 0.44 },
  { type: 'camera', beat: bar(39, 4), zoom: 0.84, beats: 1.5, ground: 0.52 },
  ...tokenHop(bar(39, 1)),
  bottleHigh(bar(39, 4), 'glass'),
  lumRowSwung(and(bar(39, 4)), bar(40, 1), 70),
  // ---- bar 40: up on the E, a flight, the FIREBOMB on the landing (the snare), a window on 4 (thinned: iteration 3's
  // bars 40-41 held five threats in 12 beats and a Burn loop)
  { type: 'camera', beat: bar(40, 1), zoom: 0.86, beats: 4 },
  ...firebomb(bar(40, 3)),
  pane(bar(40, 4)),
  lumRowSwung(and(bar(40, 4)), bar(41, 1)),
  // ---- bar 41: THE PEAK (energy .93, the fill on &1, &3, 4): two gaps hopped UP on 1 and 3, a bottle on the fill's
  // &1, the big window on &3
  fx(bar(41, 1), 'shake', 0.35),
  bottle(and(bar(41, 1)), 'glass'),
  crate(and(bar(41, 3)), 'window'),
  fx(and(bar(41, 3)), 'flash', 0.4),
  fx(bar(41, 4), 'bgPulse', 0.8),

  // ================================================================ BLOCK 2 — the ROOF + STOP-TIME (bars 42-49) ◆ 164
  { type: 'checkpoint', beat: bar(42) },
  { type: 'camera', beat: bar(42), zoom: 0.9, beats: 4, ground: 0.58 },
  mode(bar(42), 'roof'),
  follows(bar(42), 'vocal'),
  // iteration 5: on the roof the sky shifts — the moon out, searchlights sweeping (bars 42-45); tenants react to the
  // stop-time (bars 44-45)
  setPiece(bar(42), 'searchlights', 16),
  setPiece(bar(44), 'tenants', 8),
  label(bar(42), 'THE ROOF'),
  // ---- bar 42: breather after the peak: a hop onto the roof, a swung token row, a held jump through tokens on the kick
  ...tokenHop(bar(42, 1)),
  lumRowSwung(bar(42, 2) + 0.5, bar(42, 3), 70),
  ...tokenJump(bar(42, 3)),
  // ---- bar 43: a swinging neon letter, a hop, tokens on the kick-and
  pendulum(bar(43, 2)),
  ...tokenHop(bar(43, 3)),
  // FILM CANISTER #2 (iteration 6): the roof's quiet stretch hides one — HOLD the hop on 170 and it's caught in the
  // searchlight over the water tower (tokens up the held arc are the clue)
  { type: 'canister', from: bar(43, 3) },
  lumRowSwung(and(bar(43, 3)), bar(43, 4) + 0.5, 60),
  // ---- bar 44: STOP-TIME (the bass drops out): X · rest · X — big smashes; your hit is the sound
  label(bar(44), 'STOP-TIME'),
  crate(bar(44, 1), 'neon'),
  crate(bar(44, 3), 'neon'),
  ...tokenHop(bar(44, 4)),
  fx(bar(44, 1), 'bgPulse', 0.9),
  fx(bar(44, 3), 'bgPulse', 0.9),
  // ---- bar 45: a big one on 1, then the LAUNDRY LINE: hook it on the held note (178.66) and glide over the light well
  // (a miss drops you 60 px onto the well's floor: scramble out)
  crate(bar(45, 1), 'neon'),
  ...hookRide(
    and(bar(45, 3)),
    'line',
    [
      [and(bar(45, 3)), H_ROOF],
      [bar(45, 4), H_ROOF],
      [bar(45, 4) + 0.5, H_ROOF - 24],
      [bar(46, 1) + 0.05, H_ROOF + 6],
    ],
    'none',
    floorAt,
  ),
  mode(and(bar(45, 3)), 'ride'),
  // ---- bar 46: the VERSE PEAK (180): BIG JIM's aviators glint in the penthouse. Drop off the line, big hits on 2 and 4,
  // a hop between them
  setPiece(bar(46, 1), 'bigJimGlint', 4, { h: 560, ahead: 3.5 }),
  mode(bar(46, 1), 'roof'),
  fx(bar(46, 1), 'flash', 0.45),
  { type: 'camera', beat: bar(46, 1), zoom: 0.8, beats: 1 },
  { type: 'camera', beat: bar(46, 3), zoom: 0.9, beats: 2 },
  crate(bar(46, 2), 'window'),
  ...tokenHop(bar(46, 3)),
  crate(bar(46, 4), 'window'),
  fx(bar(46, 2), 'bgPulse', 0.8),
  fx(bar(46, 4), 'bgPulse', 0.8),
  // ---- bar 47: the held note 184.67 = a held jump over a recessed balcony (safe), a bottle batted on 4
  { type: 'action', action: { type: 'jump', beat: and(bar(47, 1)), hold: 1, fail: 'none' } },
  lumArcJump(and(bar(47, 1))),
  batBottle(bar(47, 4)),
  // ---- bar 48: the B pedal (the bass on every beat): strike the WINDOW-WASHER CRADLE's rope on 188 and it hoists you
  // up the tower one step per B (188, 189, 190), a pane smashed on the way up (the held note 190.66)
  mode(bar(48, 1), 'cradle'),
  { type: 'camera', beat: bar(48, 1), zoom: 0.86, beats: 3, ground: 0.5 },
  follows(bar(48, 1), 'bass'),
  ...hookRide(
    bar(48, 1),
    'cradle',
    [
      [bar(48, 1), CRADLE0],
      [bar(48, 1) + 0.3, CRADLE0 + 80],
      [bar(48, 2), CRADLE0 + 80],
      [bar(48, 2) + 0.3, CRADLE0 + 160],
      [bar(48, 3), CRADLE0 + 160],
      [bar(48, 3) + 0.3, CRADLE0 + 244],
      [bar(48, 4) + 0.5, CRADLE0 + 244],
    ],
    'none',
    floorAt,
    40,
  ),
  pane(and(bar(48, 3))),
  // ---- bar 49: up on the kick, a firebomb on the snare, a bottle on 3, panes on the "and"s
  mode(bar(49, 1), 'ledges'),
  ...firebomb(bar(49, 2)),
  batBottle(bar(49, 3)),
  pane(and(bar(49, 4))),

  // ================================================================ PRE-CHORUS 3 (bars 50-51): the Heave across the well ◆ 196
  { type: 'checkpoint', beat: bar(50) },
  { type: 'crowd', beat: bar(50), cap: 19 },
  follows(bar(50), 'shouts'),
  label(bar(50), 'PRE-CHORUS — HUP HUP HEY'),
  { type: 'camera', beat: bar(50), zoom: 0.84, beats: 4, ground: 0.55 },
  // ---- bar 50: no vocal, the bass sits on the D#: the hush — a hop, panes, the lanes' window glowing far below
  ...tokenHop(bar(50, 1)),
  pane(bar(50, 2)),
  ...tokenHop(bar(50, 3)),
  pane(and(bar(50, 4))),
  // ---- bar 51: HUP = a hop UP to the sill across a gap (the kick) · HUP = bat a bottle · HEY = the goon on the
  // sill: the HEAVE sends him across the light well THROUGH the Lanes' window far below; the fill (&3, &4) = the glass
  jabber(bar(51, 3)),
  batBottle(bar(51, 2)),
  { type: 'phrase', beats: [bar(51, 1), bar(51, 2), bar(51, 3)] },
  setPiece(bar(51, 3), 'windowCrash', 2),
  fx(bar(51, 1), 'bgPulse', 0.7),
  fx(bar(51, 2), 'bgPulse', 0.7),
  fx(bar(51, 3), 'flash', 0.6),
  fx(bar(51, 3), 'shake', 0.5),
  ...tokenHop(bar(51, 4)), // through the falling glass on the fill

  // ================================================================ CHORUS 3 — THE DROP + the BLACKLIGHT LANES (bars 52-59)
  { type: 'crowd', beat: bar(52), cap: 24 },
  { type: 'sky', beat: bar(52), preset: 'lanes' },
  label(bar(52), 'CHORUS 3 — the Blacklight Lanes'),
  follows(bar(52), 'kick'),
  // ---- bar 52: THE DROP — hook the cable on the chorus downbeat (lethal: the light well) and ZIP ~1,000 px down
  // through the smashed window, landing on the lane deck on the E (206.6); a pin on the snare (207)
  ...hookRide(
    bar(52, 1),
    'line',
    [
      [bar(52, 1), H_SILL],
      [bar(52, 1) + 0.6, H_SILL - 6],
      [bar(52, 2) + 0.3, H_SILL - 280],
      [bar(52, 3) + 0.6, H_LANES + 4],
    ],
    'death',
    floorAt,
  ),
  setPiece(bar(52, 1), 'zipDrop', 3, { h: H_SILL - H_LANES }),
  // neon letters smashed on the way down (the snare, the kick: strikes work while riding; `h` is relative to the sill)
  { type: 'breakable', beat: bar(52, 2), h: -110, look: 'neon', action: { type: 'strike', beat: bar(52, 2) } },
  { type: 'breakable', beat: bar(52, 3), h: -620, look: 'neon', action: { type: 'strike', beat: bar(52, 3) } },
  mode(bar(52, 1), 'zip'),
  { type: 'camera', beat: bar(52, 1), zoom: 0.76, beats: 1, ground: 0.42 },
  fx(bar(52, 1), 'flash', 0.6),
  fx(bar(52, 1), 'shake', 0.4),
  { type: 'ground', beat: bar(52, 3) + 0.3, style: 'lanes' },
  setPiece(bar(52, 3), 'lanes', 34),
  mode(bar(52, 3), 'lanes'),
  fx(bar(52, 3) + 0.6, 'shake', 0.5),
  { type: 'camera', beat: bar(52, 3), zoom: 0.82, beats: 2, ground: 0.66 },
  pin(bar(52, 4)),
  // ---- bar 53 (E7): a gutter on the kick, the record's HEY HEY (209, 210) = a BALL-RETURN POP batted back down the
  // lane, then a pin smashed; the first BALL rolls in on 4 (a pin, not a ball, on 207: no stumble hop right before the
  // gutter hop — iteration 3's 207/208 death spot)
  batBottle(bar(53, 2)),
  pin(bar(53, 3)),
  fx(bar(53, 2), 'flash', 0.4),
  fx(bar(53, 3), 'flash', 0.4),
  hint(bar(52, 4), 'Bowling balls roll down the lanes — HOP them on the beat!', 5),
  ...ball(bar(53, 4)),
  // ---- bar 54 (A7): hook the PINSETTER's sweep bar on the kick (lethal: the pinsetter pit) and ride it over, smashing a
  // rack of pins mid-ride on the snare; drop off on 3, a pin on the E (215)
  mode(bar(54, 1), 'sweep'),
  ...hookRide(
    bar(54, 1),
    'line',
    [
      [bar(54, 1), H_LANES],
      [bar(54, 1) + 0.5, H_LANES + 30],
      [bar(54, 2), H_LANES + 50],
      [bar(54, 3) + 0.75, H_LANES + 6],
    ],
    'death',
    floorAt,
  ),
  bottleHigh(bar(54, 2), 'pin', 160),
  bottleHigh(and(bar(54, 2)), 'pin', 150),
  mode(bar(54, 3) + 0.75, 'lanes'),
  fx(bar(54, 2), 'bgPulse', 0.6),
  pin(bar(54, 4)),
  // ---- bar 55 (E7, HEY 218): a gutter on the kick, a hop, the goon bowler on the HEY, a pin on 4
  ...tokenHop(bar(55, 2)),
  jabber(bar(55, 3)),
  fx(bar(55, 3), 'flash', 0.4),
  pin(bar(55, 4)),

  // ---- bar 56 (A7, held note 222.09): a hop on 1 (re-entry: nothing hurts for 2 beats), a pin on 2, the SLICK RUN:
  // knee-slide down the oiled lane under the pinsetter's sweep bar on the held note, pop out on the "and"
  { type: 'checkpoint', beat: bar(56) },
  follows(bar(56), 'shouts'),
  ...tokenHop(bar(56, 1)),
  pin(bar(56, 2)),
  mode(bar(56, 3), 'slick-run'),
  ...slideUnder(bar(56, 3), 1.45),
  pin(and(bar(56, 4))),
  mode(bar(56, 4) + 0.9, 'lanes'),
  // ---- bar 57 (A7, energy .85 = the chorus peak): the peak gutter on 1, a goon on the snare, then the BALL-RETURN
  // LAUNCH on 3 flings you onto the pinsetter catwalk (lands 227.85), a pin smashed mid-flight on 4
  fx(bar(57, 1), 'shake', 0.3),
  jabber(bar(57, 2)),
  pin(bar(57, 3)), // on the ball return as it fires
  launch(bar(57, 3), 1.85, H_LANES + 120),
  mode(bar(57, 3), 'launch'),
  bottleHigh(bar(57, 4), 'pin'),
  // ---- bar 58: HOOK A — the walkdown B A G F# walked DOWN the catwalk: hop DOWN a tier over a pinsetter pit on the B,
  // STRIKE! a giant rack on the A, hop down over the last pit onto the lane on the G, SPARE! the giant rack on the F#
  // (E lands on 232)
  label(bar(58), 'THE WALKDOWN'),
  mode(bar(58, 1), 'walkdown'),
  { type: 'camera', beat: bar(58, 1), zoom: 0.76, beats: 1 },
  giantKeg(bar(58, 2), 'pin'),
  giantKeg(bar(58, 4), 'pin'),
  fx(bar(58, 1), 'zoom', 0.4),
  fx(bar(58, 2), 'shake', 0.45),
  fx(bar(58, 3), 'zoom', 0.4),
  fx(bar(58, 4), 'shake', 0.5),
  // ---- bar 59: E lands (232), hook B — the breath after the peak: a ball on the E, a hop, one last ball, a pin
  { type: 'camera', beat: bar(59, 1), zoom: 0.86, beats: 2 },
  mode(bar(59, 1), 'lanes'),
  fx(bar(59, 1), 'flash', 0.6),
  ...ball(bar(59, 1)),
  ...tokenHop(bar(59, 2)),
  ...ball(bar(59, 3)),
  pin(bar(59, 4)),
  ...melodyTokens([[233, 52], [234.67, 57], [235, 57], [235.67, 58]]),

  // ================================================================ TAG 3 (bar 60): hop, hop, hop, hop, SMASH on the fill's &4 ◆ 236
  { type: 'checkpoint', beat: bar(60) },
  label(bar(60), 'TAG'),
  ...tokenHop(bar(60, 1)),
  { type: 'camera', beat: bar(60), zoom: 0.9, beats: 2 },
  ...tokenHop(bar(60, 2)),
  ...tokenHop(bar(60, 3)),
  ...tokenHop(bar(60, 4)),
  crate(and(bar(60, 4)), 'pin'), // the big pin mid-hop on the fill's &4
  fx(and(bar(60, 3)), 'bgPulse', 0.6),
  fx(and(bar(60, 4)), 'bgPulse', 0.8),

  // ================================================================ the breakdown downbeat = act 2's final hit (act 3 continues here)
  { type: 'finish', beat: bar(61) },
  fx(bar(61), 'flash', 1),
  fx(bar(61), 'shake', 0.6),
];

/** Act 2 on its own (for `npm run rubric -- --level=src/level/act2.ts#act2Level` and focused tests). */
export const act2Level: LevelDef = {
  id: 'act2-bars-34-60',
  name: 'Act 2 — the climb, stop-time and the Blacklight Lanes (original recording)',
  songId: 'jim_edit',
  pixelsPerBeat: 384,
  startBeat: bar(34),
  endBeat: bar(61),
  items: [{ type: 'sky', beat: -100, preset: 'neon' }, { type: 'camera', beat: -100, zoom: 0.95, beats: 0.01 }, ...act2Items],
};

/** the act's end state (act 3 continues from it): beat 240, the lane deck */
export const ACT2_END = { beat: bar(61), h: H_LANES } as const;

/** breakable looks act 2 uses (for the art pass) */
export const ACT2_LOOKS: BreakableLook[] = ['window', 'pin', 'glass', 'neon'];
