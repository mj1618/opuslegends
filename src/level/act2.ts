/**
 * ACT 2 — edit bars 34-60 (beats 132-240): verse 3 (the boogie bass + stop-time), pre-chorus 3, chorus 3, tag 3.
 * Plan and bar-by-bar rationale: docs/level/act2_plan.md. Merged after act 1 by level/index.ts (continuous world x;
 * act 1's finish line becomes the honky-tonk's front door).
 *
 *   bars 34-41  THE CLIMB up the Jimperial's facade on the boogie bass: ledge hops UP on the climbing bass notes,
 *               alley gaps jumped UP (lethal), a fire-escape springboard, and the act's new MOVING threat:
 *               bottles thrown from the windows (bat them back ON the beat) and firebombs (hop the flames).
 *               ◆ 132
 *   bars 42-49  a roof ledge breather, then STOP-TIME: big window smashes in the holes the bass leaves, a knee-slide
 *               on the held note, BIG JIM's first glint in a penthouse window (180 = the verse peak), window-washer
 *               cradles (safe lifts) on the B pedal.                                               ◆ 164
 *   bars 50-51  PRE-CHORUS: quiet bar, then HUP (gap) · HUP (firebomb) · HEY = the Heave smashes a goon THROUGH the
 *               big window into the building.                                                       ◆ 196
 *   bars 52-60  the BLACKLIGHT LANES (chorus 3): launch in on the downbeat, rolling bowling balls (hop), pins (smash),
 *               a Bluffer pair on HEY HEY (209/210), pinsetter lifts over the gutter (lethal), a slick run under the
 *               pinsetter bar on the held note, four GIANT pins on the hook-A walkdown, the tag breath. ◆ 220, ◆ 236
 *
 * GRID: bar n starts on beat 4(n-1); "&" = the swung and (+0.66). Heights = px above the street (the climb tops out at
 * 950: the Lanes are on the Jimperial's 4th floor). Every gap/ledge fit below was measured with the real controller
 * (press-offset windows in the plan doc).
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
import type { BreakableLook, FxKind, LevelDef, LevelItem, SetPieceName } from './types';

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

/** a bottle thrown from a window, arriving at the bat point ON `beat`: strike to bat it back (stumble if missed) */
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
 * The climb's terrain: consecutive ledges (floor spans) and gaps, authored left to right. Heights are absolute.
 *   T.up(beat, rise)            a tap hop ON `beat` up a `rise` px ledge whose edge is at beat + UP.edge (reward:
 *                               a missed hop is a bonk + ledge scramble, ~0.3 beat lost)
 *   T.gapUp(beat, [f, t], rise, hold)  a gap [beat+f, beat+t] jumped UP onto a ledge `rise` px higher (lethal)
 *   T.set(beat, h)              the floor changes height at `beat` (a launch target, a recess, ...)
 */
const UP = { edge: 0.55 } as const;
class Terrain {
  readonly items: LevelItem[] = [];
  private from: number;
  h: number;
  constructor(from: number, h: number) {
    this.from = from;
    this.h = h;
  }
  /** floor changes to height `h` at `beat` */
  set(beat: number, h: number): this {
    if (beat > this.from) this.items.push({ type: 'floor', from: this.from, to: beat, h: this.h });
    this.from = beat;
    this.h = h;
    return this;
  }
  /** a hop UP a ledge (reward; see the class doc) */
  up(beat: number, rise: number): this {
    this.items.push({ type: 'ledge', beat, action: { type: 'jump', beat, hold: TAP, fail: 'none' } }, lumArcHop(beat));
    return this.set(beat + UP.edge, this.h + rise);
  }
  /** a lethal gap [beat+f, beat+t] crossed by a hop (hold TAP) or jump (hold 1) pressed ON `beat`, landing `rise` px higher */
  gapUp(beat: number, fit: readonly [number, number], rise: number, hold = 1): this {
    const [f, t] = fit;
    this.set(beat + f, this.h);
    this.items.push({ type: 'gap', from: beat + f, to: beat + t, action: { type: 'jump', beat, hold } }, hold >= 0.5 ? lumArcJump(beat) : lumArcHop(beat));
    this.from = beat + t;
    this.h += rise;
    return this;
  }
  /** a lethal pit [a, b] with no action of its own (e.g. under a lift run, whose hops carry the actions) */
  pit(a: number, b: number): this {
    this.set(a, this.h);
    this.items.push({ type: 'gap', from: a, to: b });
    this.from = b;
    return this;
  }
  /** a recessed balcony [a, b] 24 px down (safe: walk out) */
  recess(a: number, b: number): this {
    const h = this.h;
    this.set(a, h - 24);
    return this.set(b, h);
  }
  end(beat: number): LevelItem[] {
    this.set(beat, this.h);
    return this.items;
  }
}

/** window-washer cradles / pinsetters: slam lifts `h` px up, hops on first-1 .. first+n-1; over a recess (safe) or a gap (lethal) */
function liftRun(first: number, n: number, h: number, lethal: boolean): LevelItem[] {
  const out: LevelItem[] = [];
  // lethal pinsetters: narrow press tops [-0.3, +0.2] (~-110/+120 ms per hop, like act 1's turnaround); safe cradles
  // keep the wide default
  for (let i = 0; i < n; i++) out.push(lethal ? { type: 'slam', beat: first + i, h, from: -0.3, to: 0.2 } : { type: 'slam', beat: first + i, h });
  for (let b = first - 1; b <= first + n - 1; b++) {
    out.push({ type: 'action', action: { type: 'jump', beat: b, hold: TAP, fail: lethal ? 'death' : 'none' } });
    out.push(lumArcHop(b));
  }
  return out;
}

// ------------------------------------------------------------------ heights (px above the street)
const H_STREET = 0;
const H_TOP = 790; // the roof ledge of the lower wing (bars 42-49)
const H_LANES = 950; // the Blacklight Lanes' lane deck (chorus 3)

// ------------------------------------------------------------------ terrain, left to right
const T = new Terrain(bar(34) - 4, H_STREET);
// bar 34: a basement areaway (a shallow step down, safe) hopped on the snare — the pit shape, taught before the climb's gaps
T.recess(bar(34, 3) + 0.22, bar(34, 3) + 0.68);
// bar 35: the boogie climb G# A A# B — up, up, up
T.up(bar(35, 1), 50).up(bar(35, 3), 50).up(bar(35, 4), 50); // 150
// bar 36: the first alley gap, jumped UP onto the next fire escape (kick on 1)
T.gapUp(bar(36, 1), [0.15, 1.6], 60); // 210   (~-130/+170 ms)
// bar 37: up the climbing bass again (E, A, B)
T.up(bar(37, 2), 50).up(bar(37, 3), 50).up(bar(37, 4), 50); // 360
// bar 38: the counterweight ladder (springboard) flings Slim up two storeys: land ON 150 at 560
T.set(bar(38, 2), 560);
// bar 39: gap on the kick (153), jumped UP
T.gapUp(bar(39, 2), [0.05, 1.6], 80); // 640   (~-110/+130 ms)
// bar 40
T.up(bar(40, 1), 50); // 690
// bar 41: THE PEAK — two gaps hopped UP on the fill (160, 162)
T.gapUp(bar(41, 1), [0, 0.65], 50, TAP); // 740   (~-100/+110 ms: the block's peak bites)
T.gapUp(bar(41, 3), [0, 0.65], 50, TAP); // 790 = H_TOP
// bars 42-47 on the roof ledge; bar 47: a held jump over a recessed balcony on the held note
T.recess(and(bar(47, 1)) + 0.3, and(bar(47, 1)) + 1.6);
// bar 48: cradles over a recessed balcony (safe lifts on the B pedal: hops 188, 189, 190 -> ledge 191)
T.recess(bar(48, 2) - 0.72, bar(48, 4) - 0.3);
// bar 49 / 50: up again
T.up(bar(49, 1), 50); // 840
T.up(bar(50, 3), 50); // 890
// bar 51: HUP = a gap on the kick (tap hop)
T.gapUp(bar(51, 1), [0, 0.78], 0, TAP); // (~-110/+110 ms)
// bar 52: the launch lands ON 206 on the lane deck
T.set(bar(52, 2), H_LANES);
// bar 53: a gutter on the kick
T.gapUp(bar(53, 1), [0, 0.78], 0, TAP); // (~-110/+110 ms)
// bar 54: the pinsetters — a gutter under the lifts (212.28 .. 214.7), hops 212, 213, 214 -> ledge 215
T.pit(bar(54, 2) - 0.72, bar(54, 4) - 0.3); // (the hops are the liftRun's actions)
// bar 57: the peak gutter on the kick
T.gapUp(bar(57, 1), [0, 0.8], 0, TAP); // the chorus peak (~-100/+110 ms)
const terrain = T.end(bar(61) + 40);

export const act2Items: LevelItem[] = [
  ...terrain,

  // ================================================================ BLOCK 1 — THE CLIMB (bars 34-41). Follows: the boogie bass
  { type: 'checkpoint', beat: bar(34) },
  { type: 'chaser', beat: bar(34) }, // (act 1 raised it on bar 5; standalone act-2 runs need it too)
  { type: 'sky', beat: bar(34), preset: 'facade' },
  { type: 'ground', beat: bar(34), style: 'facade' },
  { type: 'crowd', beat: bar(34), cap: 16 },
  setPiece(bar(34), 'climb', 32),
  mode(bar(34), 'street'),
  follows(bar(34), 'bassWalks'),
  label(bar(34), 'VERSE 3 — the Jimperial'),
  // ---- bar 34: out of the honky-tonk's door (act 1's last launch lands ON 133) at the foot of the Jimperial.
  // Snares 133/134/135: a ground-floor window, a hop over a basement areaway, then the FIRST thrown bottle — bat it
  // back on the snare (135)
  hint(bar(34, 1) + 0.5, 'Bottles fly from the windows — SWING on the beat to bat them back!', 6),
  pane(bar(34, 2)),
  { type: 'action', action: { type: 'jump', beat: bar(34, 3), hold: TAP, fail: 'none' } }, // a hop over the areaway (safe)
  lumArcHop(bar(34, 3)),
  batBottle(bar(34, 4)),
  lumRowSwung(and(bar(34, 4)), bar(35, 1)), // the fill's "and" accent (135.67)
  // ---- bar 35: THE CLIMB STARTS on the bass figure: E (hop up) · E (window) · A (up) · A# (bottle) · B (up)
  { type: 'camera', beat: bar(35, 1), zoom: 0.86, beats: 4 },
  mode(bar(35, 1), 'climb'),
  pane(bar(35, 2)),
  bottle(and(bar(35, 3)), 'glass'),
  fx(bar(35, 4), 'bgPulse', 0.5),
  // ---- bar 36: the first alley gap jumped UP on the kick, a high bottle mid-air, land on the snare, a FIREBOMB on 4
  bottleHigh(bar(36, 2), 'glass'),
  pane(bar(36, 3)),
  ...firebomb(bar(36, 4)),
  // ---- bar 37: a window on the downbeat, then up on the climbing bass (E, A, B) with a bottle on the A#
  pane(bar(37, 1)),
  bottle(and(bar(37, 3)), 'glass'),
  ...melodyTokens([[144, 62], [144.33, 62], [145.33, 62]], 62, 7, 55),
  // ---- bar 38: the springboard (kick) flings Slim two storeys up; a window mid-flight, a pane on the and, a token hop
  launch(bar(38, 1), 2, 560),
  mode(bar(38, 1), 'launch'),
  { type: 'camera', beat: bar(38, 1), zoom: 0.8, beats: 2 },
  fx(bar(38, 1), 'zoom', 0.6),
  bottleHigh(bar(38, 2), 'window'),
  mode(bar(38, 3), 'climb'),
  pane(and(bar(38, 3))),
  ...tokenHop(bar(38, 4)),
  // ---- bar 39: bat a bottle on the kick, the second gap jumped UP (153, the E), a high bottle on the A (154)
  batBottle(bar(39, 1)),
  bottleHigh(bar(39, 3), 'glass'),
  bottle(and(bar(39, 4)), 'glass'), // the fill's "and" (155.61)
  // ---- bar 40: up on the kick, bat a bottle, a firebomb on the snare, windows on 4 and the fill's "and"
  { type: 'camera', beat: bar(40, 1), zoom: 0.86, beats: 4 },
  batBottle(bar(40, 2)),
  ...firebomb(bar(40, 3)),
  pane(bar(40, 4)),
  bottle(and(bar(40, 4)), 'glass'),
  // ---- bar 41: THE PEAK (energy .93, the fill on &1, &3, 4): two gaps hopped UP on 1 and 3, a bottle batted between,
  // a big window on the fill's "and"
  fx(bar(41, 1), 'shake', 0.35),
  bottle(and(bar(41, 1)), 'glass'),
  batBottle(and(bar(41, 2))), // 161.66: the kick's "and" (strikes stay ≥ 0.66 beat apart)
  crate(and(bar(41, 3)), 'window'),
  fx(and(bar(41, 3)), 'flash', 0.4),
  fx(bar(41, 4), 'bgPulse', 0.8),

  // ================================================================ BLOCK 2 — the roof ledge + STOP-TIME (bars 42-49)
  { type: 'checkpoint', beat: bar(42) },
  { type: 'camera', beat: bar(42), zoom: 0.92, beats: 4 },
  mode(bar(42), 'ledges'),
  follows(bar(42), 'vocal'),
  label(bar(42), 'THE ROOF LEDGE'),
  // ---- bar 42: breather after the peak: a swung token row, a held jump through tokens
  lumRowSwung(bar(42, 1) + 0.5, bar(42, 2) + 0.5, 70),
  ...tokenJump(bar(42, 3)),
  // ---- bar 43: a swinging neon letter, a hop, windows on the kick-and and the fill
  pendulum(bar(43, 2)),
  ...tokenHop(bar(43, 3)),
  pane(and(bar(43, 3))),
  // ---- bar 44: STOP-TIME (the bass drops out): X · rest · X — big panes; your hit is the sound
  label(bar(44), 'STOP-TIME'),
  crate(bar(44, 1), 'window'),
  crate(bar(44, 3), 'window'),
  ...tokenHop(bar(44, 4)),
  fx(bar(44, 1), 'bgPulse', 0.9),
  fx(bar(44, 3), 'bgPulse', 0.9),
  // ---- bar 45: a pane on 1, a bottle batted on the snare-and, then the knee-slide under a window-washer's plank on the
  // held note 178.67
  crate(bar(45, 1), 'window'),
  batBottle(and(bar(45, 2))),
  ...slideUnder(and(bar(45, 3)), 1.3),
  // ---- bar 46: the VERSE PEAK (180): BIG JIM's aviators glint in a penthouse window. Pop out, big panes on 2 and 4
  setPiece(bar(46, 1), 'bigJimGlint', 4, { h: 560, ahead: 3.5 }),
  fx(bar(46, 1), 'flash', 0.45),
  { type: 'camera', beat: bar(46, 1), zoom: 0.84, beats: 1 },
  { type: 'camera', beat: bar(46, 3), zoom: 0.92, beats: 2 },
  ...tokenHop(bar(46, 1)),
  crate(bar(46, 2), 'window'),
  crate(bar(46, 4), 'window'),
  fx(bar(46, 2), 'bgPulse', 0.8),
  fx(bar(46, 4), 'bgPulse', 0.8),
  // ---- bar 47: held note 184.67 -> a held jump over a recessed balcony (safe), a bottle batted on the snare (187)
  pane(bar(47, 1)),
  { type: 'action', action: { type: 'jump', beat: and(bar(47, 1)), hold: 1, fail: 'none' } },
  lumArcJump(and(bar(47, 1))),
  batBottle(bar(47, 4)),
  // ---- bar 48: the B pedal (bass on every beat): WINDOW-WASHER CRADLES slam on the beat (safe: a miss drops you on
  // the balcony)
  mode(bar(48, 1), 'cradles'),
  follows(bar(48, 1), 'bass'),
  ...liftRun(bar(48, 2), 2, H_TOP, false),
  mode(bar(48, 4), 'ledges'),
  pane(bar(48, 4)),
  // ---- bar 49: up on the kick, bat a bottle on the snare, a firebomb on the kick, panes on the "and"s
  batBottle(bar(49, 2)),
  ...firebomb(bar(49, 3)),
  pane(and(bar(49, 3))),
  pane(and(bar(49, 4))),

  // ================================================================ PRE-CHORUS 3 (bars 50-51): the Heave through the window
  { type: 'checkpoint', beat: bar(50) },
  { type: 'crowd', beat: bar(50), cap: 19 },
  follows(bar(50), 'shouts'),
  label(bar(50), 'PRE-CHORUS — HUP HUP HEY'),
  // ---- bar 50: no vocal, the bass sits on the D#: a quiet bar of panes and one last hop up
  ...tokenHop(bar(50, 1)),
  pane(bar(50, 2)),
  pane(bar(50, 4)),
  // ---- bar 51: HUP (a gap, kick) · HUP (a firebomb) · HEY = the goon in front of the big window: the HEAVE sends him
  // through the glass into the building; the fill (&3, &4) = the shards; the springboard inside on the downbeat
  ...firebomb(bar(51, 2)),
  jabber(bar(51, 3)),
  { type: 'phrase', beats: [bar(51, 1), bar(51, 2), bar(51, 3)] },
  setPiece(bar(51, 3), 'windowCrash', 2),
  fx(bar(51, 1), 'bgPulse', 0.7),
  fx(bar(51, 2), 'bgPulse', 0.7),
  fx(bar(51, 3), 'flash', 0.6),
  fx(bar(51, 3), 'shake', 0.5),
  { type: 'ground', beat: bar(51, 3) + 0.5, style: 'lanes' },
  bottle(and(bar(51, 4)), 'glass'), // (nothing on 202.66: the Heave's hitstop is still being repaid)

  // ================================================================ CHORUS 3 — the BLACKLIGHT LANES (bars 52-59)
  { type: 'crowd', beat: bar(52), cap: 24 },
  { type: 'sky', beat: bar(52), preset: 'lanes' },
  setPiece(bar(52), 'lanes', 36),
  label(bar(52), 'CHORUS 3 — the Blacklight Lanes'),
  follows(bar(52), 'kick'),
  launch(bar(52, 1), 2, H_LANES),
  mode(bar(52, 1), 'launch'),
  { type: 'camera', beat: bar(52, 1), zoom: 0.8, beats: 2 },
  fx(bar(52, 1), 'flash', 0.6),
  fx(bar(52, 1), 'shake', 0.5),
  // ---- bar 52 (A7 climb): a pin up high mid-launch (snare), land ON 206 on the lane deck; the D# a pin; the first
  // BALL rolls down the lane on the E (207) — hop it
  bottleHigh(bar(52, 2), 'pin'),
  mode(bar(52, 3), 'lanes'),
  hint(bar(52, 2), 'Bowling balls roll down the lanes — HOP them on the beat!', 5),
  pin(and(bar(52, 3))),
  ...ball(bar(52, 4)),
  // (no strike on the snare's "and" 207.66: an air strike stalls the fall and the gutter hop on 208 would come late)
  // ---- bar 53 (E7): a gutter on the kick, the record's HEY HEY (209, 210) = a Bluffer PAIR, pins on the snares
  jabber(bar(53, 2)),
  jabber(bar(53, 3)),
  fx(bar(53, 2), 'flash', 0.4),
  fx(bar(53, 3), 'flash', 0.4),
  pin(bar(53, 4)),
  pin(and(bar(53, 4))),
  // ---- bar 54 (A7): the PINSETTERS slam on every beat over the gutter (lethal): hops 212, 213, 214 -> 215 (E)
  mode(bar(54, 1), 'pinsetters'),
  ...liftRun(bar(54, 2), 2, H_LANES, true),
  pin(bar(54, 4)),
  mode(bar(54, 4), 'lanes'),
  fx(bar(54, 2), 'bgPulse', 0.6),
  fx(bar(54, 3), 'bgPulse', 0.6),
  // ---- bar 55 (E7, HEY 218): a ball on the kick, a pin on the snare, the Bluffer on the HEY, a second ball on 4
  ...ball(bar(55, 1)),
  pin(bar(55, 2)),
  jabber(bar(55, 3)),
  fx(bar(55, 3), 'flash', 0.4),
  ...ball(bar(55, 4)),

  // ---- bar 56 (A7, held note 222.09): pins on 1 and 2, the SLICK RUN: knee-slide under the pinsetter bar, pop out
  { type: 'checkpoint', beat: bar(56) },
  follows(bar(56), 'shouts'),
  pin(bar(56, 1)),
  pin(bar(56, 2)),
  mode(bar(56, 3), 'slick-run'),
  ...slideUnder(bar(56, 3), 1.45),
  pin(and(bar(56, 4))),
  mode(bar(56, 4) + 0.9, 'lanes'),
  // ---- bar 57 (A7, energy .85 = the chorus peak): gutter on 1, a Bluffer on the snare, a ball on the kick, pins on the
  // climb's D# and the snare's "and"
  ...ball(bar(57, 3)),
  jabber(bar(57, 2)),
  pin(and(bar(57, 3))),
  fx(bar(57, 1), 'shake', 0.3),
  // ---- bar 58: HOOK A — the walkdown B A G F#: FOUR GIANT PINS, one per quarter (everyone slams)
  label(bar(58), 'THE WALKDOWN'),
  { type: 'camera', beat: bar(58, 1), zoom: 0.76, beats: 1 },
  giantKeg(bar(58, 1), 'pin'),
  giantKeg(bar(58, 2), 'pin'),
  giantKeg(bar(58, 3), 'pin'),
  giantKeg(bar(58, 4), 'pin'),
  fx(bar(58, 1), 'shake', 0.35),
  fx(bar(58, 2), 'shake', 0.35),
  fx(bar(58, 3), 'shake', 0.35),
  fx(bar(58, 4), 'zoom', 0.8),
  // ---- bar 59: E lands (232), hook B — the breath after the peak: tokens, pins, one last ball
  { type: 'camera', beat: bar(59, 1), zoom: 0.86, beats: 2 },
  fx(bar(59, 1), 'flash', 0.6),
  ...tokenHop(bar(59, 1)),
  pin(bar(59, 2)),
  ...ball(bar(59, 3)),
  pin(bar(59, 4)),
  ...melodyTokens([[233, 52], [234.67, 57], [235, 57], [235.67, 58]]),

  // ================================================================ TAG 3 (bar 60): the breath; the fill on &3, &4, 1
  { type: 'checkpoint', beat: bar(60) },
  label(bar(60), 'TAG'),
  ...tokenHop(bar(60, 1)),
  { type: 'camera', beat: bar(60), zoom: 0.9, beats: 2 },
  pin(bar(60, 2)),
  ...tokenHop(bar(60, 3)),
  pin(and(bar(60, 3))),
  crate(and(bar(60, 4)), 'pin'),
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

/** breakable looks act 2 uses (for the art pass) */
export const ACT2_LOOKS: BreakableLook[] = ['window', 'pin', 'glass', 'neon'];
