/**
 * ACT 3 — THE CLIMAX, edit bars 61-86 (beats 240-341): the breakdown, the fill, chorus 4, tag 4, the outro, the final
 * hit on 340. Plan and bar-by-bar rationale: docs/level/act3_plan.md (+ the act-3 map in docs/reviews/iter3.md).
 * Joined after act 2 by level/index.ts on one world x; `act3Items(h0)` starts on act 2's last floor height.
 *
 *   bars 61-64  THE POOL ROOM, the level's real valley (0 threats). CALL AND RESPONSE with the band: the goons stomp
 *               the Black Betty call (1 · &2 · 3) while you hit the claps (2, 4); next bar you ANSWER the call on the
 *               same rhythm (X ∪ X, then ∪ X –). A bench see-saw on bar 63, a held jump up onto the rack.
 *   bars 65-68  THE RACK in the Velvet Casino: a staircase climb (+~500 px) on the kick, goons jab, three chandeliers
 *               die one by one, the frame slams on 268, HUP (269.70) · HUP (270.70) · THE BREAK SHOT on the fill's
 *               &4 tom (271.65, the loudest drum hit of the breakdown), the hush under it.               ◆ 256
 *   bars 69-76  SIGN FALLS on the roof at sunset: the rack's recoil launches you through the skylight ON the drop
 *               (272, camera 0.72: the widest shot of the level), the BIG JIM letters topple one per downbeat
 *               (B 272 · I 276 · G 280 · J 284 · I 288 · M 292) and land as bridges on the backbeat, the HEY HEY Bluffer,
 *               a bottle batted into the G, the J-hook see-saw, your shot topples the second I (role reversal), a
 *               post run over the light-well, the lethal combination on the M, then the THIRD WALKDOWN as four blows
 *               ON BIG JIM (fist, fist, lapel, jaw) and the crash through his glass wall.            ◆ 272, ◆ 284
 *   bars 77-83  THE REVEAL (the bluff display on the held B, 0 threats) and THE GAUNTLET: climb Big Jim himself, no
 *               chalk marks — his fists slam (lethal lifts), up the velvet sleeve (knee-slide), lapels (ledges, gaps
 *               UP), medallions (pendulums), and the HEY answers crack his lenses (317 left, 325 right). ◆ 304, ◆ 320
 *               Iteration 6: real stakes to ~332 — the hop onto the lens rim (326) and over the snapped chain (330) are
 *               lethal (−90 after a strike); film canister #3 sits on his shoulder (hold the 315 HUP)
 *   bars 84-86  THE FINALE, can't die (the Burn retires on 332): the pull-out into the theatre, sprockets rising on the
 *               pickup, iris blades closing one per beat, HUP · HUP · the FINAL HIT on 340 as the iris SLAMS shut on
 *               Big Jim's face. THE END (341), Slim stops at the throne for the victory pose, the poster.
 *
 * GRID: bar n starts on beat 4(n-1); "&" = the swung and (+0.66). Heights = px above the street, relative to `h0`
 * (act 2's Lanes deck, 950 px). FAIRNESS (docs/reviews/iter3.md, non-negotiable): every lethal window ≥ −85 / +150 ms
 * (iteration 6: chorus 4's light-wells 276 / 280 / 284 are the exam at −80, review iter5 fix 5)
 * (measured with `node playtest/slack.mjs --level=src/level/act3.ts#act3Level --from=240`), ≤ 1 stumble per bar,
 * checkpoints ≤ 5 bars apart, a breather after every peak.
 */
import { and, bottle, bottleHigh, crate, jabber, launch, lumArcHop, lumArcJump, lumRowSwung, melodyTokens, pendulum, slideUnder, spikeHop, tokenHop } from './dsl';
import type { BigJimPose, BreakableLook, FxKind, LevelDef, LevelItem, SetPieceName, SkyPreset } from './types';

/** beat of bar n (1-based, the edit's numbering), beat k (1-based) */
const bar = (n: number, beat = 1) => (n - 1) * 4 + (beat - 1);
const fx = (beat: number, kind: FxKind, amount = 1): LevelItem => ({ type: 'fx', beat, fx: kind, amount });
const mode = (beat: number, m: string): LevelItem => ({ type: 'mode', beat, mode: m });
const follows = (beat: number, lane: string): LevelItem => ({ type: 'follows', beat, lane });
const label = (beat: number, text: string): LevelItem => ({ type: 'label', beat, text });
const cam = (beat: number, zoom: number, beats = 4): LevelItem => ({ type: 'camera', beat, zoom, beats });
const sky = (beat: number, preset: SkyPreset): LevelItem => ({ type: 'sky', beat, preset });
const setPiece = (beat: number, name: SetPieceName, beats = 4, extra: { h?: number; ahead?: number } = {}): LevelItem => ({ type: 'setPiece', beat, name, beats, ...extra });
const jim = (beat: number, pose: BigJimPose, beats = 1, extra: { x?: number; ahead?: number; h?: number; scale?: number } = {}): LevelItem => ({ type: 'bigJim', beat, pose, beats, ...extra });
const TAP = 0.15;

// ------------------------------------------------------------------ act-3 pieces

/** a reward breakable with an act-3 look */
const smash = (beat: number, look: BreakableLook, big = false): LevelItem => bottle(beat, look, big);
/** a GIANT breakable (2x, 80 ms hitstop repaid): the break shot, the walkdown blows, the lenses, the final hit */
const giant = (beat: number, look: BreakableLook): LevelItem => ({ type: 'breakable', beat, look, giant: true, action: { type: 'strike', beat } });
/** a bottle thrown from a window, arriving at the bat point ON `beat`: strike to bat it back (stumble if missed) */
const batBottle = (beat: number, dx?: number, h?: number): LevelItem => ({ type: 'thrown', beat, style: 'bottle', dx, h, action: { type: 'strike', beat, fail: 'stumble' } });
/** a high pendulum (chandelier / medallion) struck mid-jump ON `beat` */
const pendulumHigh = (beat: number, big = false): LevelItem => ({ type: 'pendulum', beat, high: true, big, action: { type: 'strike', beat } });

/**
 * The act's terrain, authored left to right (heights absolute, px above the street).
 *   up(beat, rise)              tap hop ON `beat` up a ledge whose edge is at beat + UP_EDGE (reward: a missed hop is
 *                               a bonk + the ledge scramble, ~0.3 beat, game/mech)
 *   gapUp(beat, [f, t], rise, hold)  a LETHAL gap [beat+f, beat+t] crossed by a hop (hold TAP) / jump (hold 1) pressed
 *                               ON `beat`, landing `rise` px higher (0 = flat)
 *   posts(first, n)             static steel posts over a lethal pit: hops on first-1 .. first+n-1 (like a lift run,
 *                               but the posts don't move), far ledge at first + n
 *   lifts(first, n)             Big Jim's FISTS: slam lifts over a lethal pit (hops first-1 .. first+n-1)
 *   void(a, b)                  a hole with no action (under a launch arc)
 *   set(beat, h)                the floor changes height at `beat`
 */
const UP_EDGE = 0.55;
/** post tops [from, to] relative to their beat: narrow enough that the gaps can't be walked (the 26 px ledge assist) */
const POST_TOP = [-0.27, 0.28] as const;
/** Big Jim's fists: slam-lift press tops, narrower than the dsl default (build.ts SLAM -0.42..0.36) */
const SLAM_TOP = [-0.3, 0.26] as const;
/** the knee's solid lip after the first fist (beats after its slam) */
const KNEE = 0.42;
class Terrain {
  readonly items: LevelItem[] = [];
  private from: number;
  h: number;
  constructor(from: number, h: number) {
    this.from = from;
    this.h = h;
  }
  set(beat: number, h: number): this {
    if (beat > this.from) this.items.push({ type: 'floor', from: this.from, to: beat, h: this.h });
    this.from = beat;
    this.h = h;
    return this;
  }
  up(beat: number, rise: number): this {
    this.items.push({ type: 'ledge', beat, action: { type: 'jump', beat, hold: TAP, fail: 'none' } }, lumArcHop(beat));
    return this.set(beat + UP_EDGE, this.h + rise);
  }
  /** a HELD jump ON `beat` up a tall step (edge at beat + `edge`): a reward (a miss = the ledge scramble) */
  jumpUp(beat: number, rise: number, edge = 0.9): this {
    this.items.push({ type: 'ledge', beat, action: { type: 'jump', beat, hold: 1, fail: 'none' } }, lumArcJump(beat));
    return this.set(beat + edge, this.h + rise);
  }
  gapUp(beat: number, fit: readonly [number, number], rise: number, hold = TAP): this {
    const [f, t] = fit;
    this.set(beat + f, this.h);
    this.items.push({ type: 'gap', from: beat + f, to: beat + t, action: { type: 'jump', beat, hold } }, hold >= 0.5 ? lumArcJump(beat) : lumArcHop(beat));
    this.from = beat + t;
    this.h += rise;
    return this;
  }
  void(a: number, b: number, h = this.h): this {
    this.set(a, this.h);
    this.items.push({ type: 'gap', from: a, to: b });
    this.from = b;
    this.h = h;
    return this;
  }
  /**
   * static posts (floor spans) over a lethal pit, each `rise` px above the last (so the ledge assist can never carry a
   * runner across: you must hop); hops ON first-1 .. first+n-1, the far ledge `rise` above the last post
   */
  posts(first: number, n: number, rise = 24): this {
    this.set(first - 0.8, this.h);
    // (a gap wins over any floor in the builder: the pit is split around each post)
    let a = first - 0.8;
    for (let i = 0; i < n; i++) {
      this.h += rise;
      this.items.push({ type: 'gap', from: a, to: first + i + POST_TOP[0] }, { type: 'floor', from: first + i + POST_TOP[0], to: first + i + POST_TOP[1], h: this.h });
      a = first + i + POST_TOP[1];
    }
    this.items.push({ type: 'gap', from: a, to: first + n - 0.3 });
    this.hops(first, n, 'death');
    this.from = first + n - 0.3;
    this.h += rise;
    return this;
  }
  /**
   * slam lifts (Big Jim's fists) at the current height; hops ON first-1 .. first+n-1. The FIRST fist slams onto solid
   * ground (his knee: hopping onto it is a reward), the pit opens after it (the hops off the fists are lethal)
   */
  lifts(first: number, n: number, walkOn = false): this {
    // the knee (solid) runs on KNEE past the first fist's top, so a LATE reward hop onto it still lands (iteration 5: at
    // SLAM_TOP[1] a +145 ms late 308 hop fell into the pit)
    const pit = first + KNEE;
    this.set(pit, this.h);
    this.items.push({ type: 'gap', from: pit, to: first + n - 0.15 });
    for (let i = 0; i < n; i++) this.items.push({ type: 'slam', beat: first + i, h: this.h, from: SLAM_TOP[0], to: SLAM_TOP[1] });
    // walkOn (iteration 5): no hop onto the first fist — you run onto it (it slams onto solid ground), so the first
    // lethal hop off it has no jump buffer behind it: its early side is real
    if (walkOn) this.hops(first + 1, n - 1, 'death');
    else this.hops(first, n, 'death', 1);
    this.from = first + n - 0.15;
    return this;
  }
  /** hops ON first-1 .. first+n-1; the first `safe` of them are rewards */
  private hops(first: number, n: number, fail: 'death' | 'none', safe = 0): void {
    for (let b = first - 1, k = 0; b <= first + n - 1; b++, k++) this.items.push({ type: 'action', action: { type: 'jump', beat: b, hold: TAP, fail: k < safe ? 'none' : fail } }, lumArcHop(b));
  }
  end(beat: number): LevelItem[] {
    this.set(beat, this.h);
    return this.items;
  }
}

/**
 * Measured fits (press-offset windows from `node playtest/slack.mjs`, every lethal ≥ −85 / +150 ms):
 * see the "As shipped" table in docs/level/act3_plan.md.
 */
const FIT = {
  /** 262: held jump UP +90 over the rack's hole (the kick) */
  rackHole: [0.08, 1.63] as const,
  /** 266 / 270.70: tap hop UP +50-55 across a hole in the rack */
  rackStep: [0.1, 0.65] as const,
  /** 268: tap hop UP +40 onto the apex tier as the frame slams (the kick) */
  rackGap: [0.1, 0.7] as const,
  /** 276 / 282: light-wells between the letters (tap hop, flat). Iteration 5: 276 is no longer led by a reward hop on
   * 275 (a +95 ms late 275 hop landed in the well — a hidden lethal, the 277 loop): X X X ∪, its early side is real */
  /** iteration 6 (review iter5 fix 5, chorus 4 = the exam): 276 / 280 / 284 tightened to −80 (was −85 / −90 / −95; the
   * physics quantises these windows in 10 ms steps: one step tighter is −70, under the −75 the review allowed) */
  well: [0.13, 0.871] as const,
  wellStd: [0.09, 0.8] as const,
  /** 284 (iteration 5): the light-well past the G, after the G's neon (282.66): no buffer */
  wellG: [0.13, 0.858] as const,
  /** 294: held jump UP +150 from the M's hump to the terrace */
  terrace: [0.2, 1.5] as const,
  /** (316 / 324 were `lapel` / `lapelHup` gaps: each followed a hop within half a beat, so the jump buffer hid their early
   * side (−255 / −190 ms): lethal on paper, never in play. Iteration 6 made them reward ledges and spent that intensity on
   * real stakes at 326 / 330 — the outro must stay calmer than the breakdown, rubric C1) */
  /**
   * iteration 5, THE GAUNTLET'S TEETH (review iter4 fix 7): hops UP across his body that follow a STRIKE or a landing
   * (no jump buffer to hide an early press): 312 cuff -> sleeve, 318 lapel -> tie pin, 326 collar -> lens rim.
   * ~-90/+150 ms: fair to the rule, but a ±130 press misses them early
   */
  climb: [0.1, 0.66] as const,
  /** 318: the same across a FLAT notch (the landing comes sooner than going up, so the pit runs further) */
  notch: [0.1, 0.84] as const,
  /** 280: up onto the fallen I after the strikes (was `lapel`, measured −80 once 275 stopped being a hop) */
  ontoI: [0.1, 0.695] as const,
  /** 330 (iteration 6): flat, over the gap the snapped gold chain tore, after the medallion strike on 329 */
  chain: [0.09, 0.8] as const,
};

/** Act 3's items, starting on a floor `h0` px above the street (act 2's last height). */
export function act3Items(h0 = 950): LevelItem[] {
  // ------------------------------------------------------------------ heights
  const T = new Terrain(bar(61) - 2, h0);
  // ---- the Pool Room (61-64): the bench see-saw lands on a pool table (+90) on 250
  T.set(bar(63, 2) + 0.7, h0 + 90).set(bar(63, 4) + 0.7, h0);
  // ---- bar 64: held jump UP onto the rack's first tier (+100), landing on the checkpoint (256)
  T.jumpUp(bar(64, 3), 100); // a reward
  // ---- the Rack (65-68): up on the kick, the hole on 262, the frame gap on 268, HUP HUP on the fill
  T.up(bar(65, 3), 55) // 258
    .up(bar(66, 1), 55) // 260
    .gapUp(bar(66, 3), FIT.rackHole, 90, 1) // 262: LETHAL (held)
    .gapUp(bar(67, 3), FIT.rackStep, 55) // 266: LETHAL (tap): the rack ramps 0 → 1 → 1 → 2 lethal per bar into the fill
    .gapUp(bar(68, 1), FIT.rackGap, 40) // 268: LETHAL (tap)
    .up(269.7, 50) // HUP (the fill's &2)
    .gapUp(270.7, FIT.rackStep, 50); // HUP (the fill's &3): LETHAL
  const APEX = T.h; // the rack's apex tier (RACK + 345)
  const ROOF = APEX + 120; // the Jimperial's roof at sunset
  // ---- the drop (272): the launch pad on the apex tier, the skylight hole under the arc, the roof from 273.4
  T.void(bar(69) + 0.45, bar(69) + 1.4, ROOF);
  // ---- Sign Falls (69-74)
  T.gapUp(bar(70, 1), FIT.well, 0) // 276: LETHAL light-well
    .gapUp(bar(71, 1), FIT.ontoI, 50) // 280: LETHAL — across a light-well UP onto the fallen I (the A7 climb, .90)
    .gapUp(bar(71, 3), FIT.wellStd, 0) // 282: LETHAL light-well
    .gapUp(bar(72, 1), FIT.wellG, 0) // 284: LETHAL light-well past the G (iteration 5: chorus 4's teeth, after a strike)
    .set(bar(72, 4) + 0.7, ROOF + 50); // (the J lies to 287.3; its hook = the see-saw at 287)
  T.set(bar(73, 1) + 0.6, ROOF + 140); // the second I's cap tier: the J-hook launch lands on it ON 289
  T.posts(bar(73, 4), 2); // 290 · 291 · 292: LETHAL posts over the light-well -> the M's hump at 292.7
  T.gapUp(bar(74, 3), FIT.terrace, 150, 1); // 294: LETHAL held jump UP to the terrace
  const TERRACE = T.h;
  // ---- the penthouse (76-77) + Big Jim (77-83)
  const P = TERRACE;
  T.set(bar(77, 1) + 0.3, P - 24).set(bar(77, 1) + 1.6, P); // 304: a table pocket (safe pool)
  T.up(bar(77, 4), 50); // 307: up onto his knee
  T.lifts(bar(78, 2), 2, true); // (308 X) · 309 · 310: LETHAL — his FISTS slam over the burned-out floor -> the cuff (311)
  T.gapUp(bar(79, 1), FIT.climb, 50); // 312: LETHAL — off his cuff, across the gap onto the velvet sleeve
  T.up(bar(79, 4), 50); // 315: HUP — up the sleeve to his shoulder
  T.up(bar(80, 1), 50); // 316: HUP — up onto the lapel (iteration 6: a reward ledge; was a lethal the 315 hop's buffer hid)
  T.gapUp(bar(80, 3), FIT.notch, 0); // 318: LETHAL — after the HEY (the lens), across the lapel's notch to his tie pin
  T.set(bar(81, 1) + 0.3, T.h - 24).set(bar(81, 1) + 1.6, T.h); // 320: his breast pocket (safe pool)
  T.up(bar(82, 1), 50); // 324: HUP — lapel -> collar (iteration 6: a reward ledge, see FIT)
  // iteration 6 (review iter5 fix 5, THE GAUNTLET'S STAKES: death possible up to ~332): 326 is a LETHAL hop UP across the
  // gap between his collar and the lens rim, right after the HEY on the lens (a strike: no jump buffer, a real early side)
  T.gapUp(bar(82, 3), FIT.climb, 50); // 326: LETHAL — collar -> lens rim
  // …and his gold chain snaps on 328: the hop on 330 crosses the gap it tore in his vest (after the medallion on 329)
  T.gapUp(bar(83, 3), FIT.chain, 0); // 330: LETHAL — over the snapped chain (the Burn lunges on the fill right after)
  // ---- the finale (84-86): the film strip, sprockets rising on the pickup (B C D D#), iris blades
  T.up(bar(84, 1), 40).up(bar(84, 3), 40).up(bar(84, 4), 40);
  T.up(bar(85, 1), 30).up(bar(85, 3), 30).up(bar(85, 4), 30);
  const terrain = T.end(bar(86) + 40);

  return [
    ...terrain,

    // ================================================================ BLOCK 1 — THE POOL ROOM (61-64). Follows: the stomp
    { type: 'crowd', beat: bar(61), cap: 16 }, // iteration 6: ≥ the meter's rest (14)
    sky(bar(61), 'poolroom'),
    { type: 'ground', beat: bar(61) + 0.1, style: 'felt' },
    setPiece(bar(61), 'poolRoom', 16),
    mode(bar(61), 'poolroom'),
    follows(bar(61), 'stomps'),
    label(bar(61), 'BREAKDOWN — the Pool Room'),
    // ---- bar 61 (.46): CALL 1 — the goons stomp 1 · &2 · 3 on the tables (gold dust where they stomp); you hit the
    // claps: the racked balls on 2, the felt lamp on 4 (the held C#)
    setPiece(bar(61), 'callResponse', 4),
    // iteration 5 (review iter4 fix 5): a 1-bar camera PUSH-IN on the goons for each call, back out for your answer
    cam(bar(61), 0.84, 1),
    cam(bar(62), 0.95, 1),
    { type: 'lum', beat: bar(61), h: 40 },
    { type: 'lum', beat: and(bar(61, 2)), h: 40 },
    { type: 'lum', beat: bar(61, 3), h: 40 },
    smash(bar(61, 2), 'balls'),
    pendulum(bar(61, 4)),
    // ---- bar 62 (.32, the lowest): ANSWER 1 — the call's rhythm is yours: X (bell) · ∪ (&2) · X (bell, mid-hop);
    // the chromatic pickup B C D D# -> E rises as a token line
    smash(bar(62, 1), 'bell'),
    ...tokenHop(and(bar(62, 2))),
    smash(bar(62, 3), 'bell'),
    ...melodyTokens([[246.67, 35], [247, 36], [247.33, 38], [247.64, 39], [248, 40]], 40, 12, 35),
    // ---- bar 63 (.41): CALL 2 — the bench see-saw on the stomp's 1 flings you onto a pool table ON 250 (the 3); a
    // brass bell mid-arc on the clap, a bottle on the table on 4
    setPiece(bar(63), 'callResponse', 4),
    cam(bar(63), 0.86, 1),
    cam(bar(64), 0.95, 1),
    launch(bar(63, 1), 2, h0 + 90),
    mode(bar(63, 1), 'launch'),
    bottleHigh(bar(63, 2), 'bell'),
    mode(bar(63, 3), 'tables'),
    smash(bar(63, 4), 'bottle'),
    // ---- bar 64 (.39): ANSWER 2, a new shape on the same rhythm: ∪ (1) · X (&2, the bell) · – (3: the held jump UP
    // onto the rack's first tier, the pickup tokens on its arc). The goons pile into the rack ahead on 252
    ...tokenHop(bar(64, 1)),
    smash(and(bar(64, 2)), 'bell'),
    mode(bar(64, 3), 'rack-climb'),
    fx(bar(64, 3), 'bgPulse', 0.5),

    // ================================================================ BLOCK 2 — THE RACK (65-68). Follows: the kick, then the fill
    { type: 'checkpoint', beat: bar(65) },
    { type: 'crowd', beat: bar(65), cap: 18 },
    sky(bar(65), 'casino'),
    { type: 'ground', beat: bar(64, 4), style: 'rack' },
    setPiece(bar(65), 'rack', 16),
    cam(bar(65), 0.88, 4),
    follows(bar(65), 'kick'),
    label(bar(65), 'THE RACK — the Velvet Casino'),
    // ---- bar 65 (.44): land (256), a chip tower on the snare, up on the kick, chandelier 1 on the snare
    smash(bar(65, 2), 'chips'),
    pendulum(bar(65, 4)),
    fx(bar(65, 4), 'bgPulse', 0.4),
    // ---- bar 66 (.52): up (260), a racked goon JABS on the snare, the held jump UP over the rack's hole (262, the kick),
    // chandelier 2 struck at the apex (263)
    jabber(bar(66, 2)),
    pendulumHigh(bar(66, 4)),
    fx(bar(66, 4), 'bgPulse', 0.4),
    // ---- bar 67 (.36, the inhale): a goon jab on the snare (265), up (266), the last chandelier (267): only the gold
    // head goon still glows
    smash(bar(67, 1), 'chips'), // iteration 5: a chip tower on the landing (the kick)
    jabber(bar(67, 2)),
    pendulum(bar(67, 4)),
    fx(bar(67, 4), 'bgPulse', 0.5),
    cam(bar(67, 3), 0.84, 5), // the slow push-in on the head goon
    // ---- bar 68 (1.00, THE FILL): the frame gap UP on the kick (268) as the frame SLAMS, then HUP (&2) · HUP (&3) ·
    // THE BREAK SHOT on the &4 tom (271.65): the gold head goon, a giant (80 ms hitstop, repaid before the drop)
    mode(bar(68, 1), 'fill'),
    follows(bar(68, 1), 'fills'),
    fx(bar(68, 1), 'shake', 0.4),
    { type: 'phrase', beats: [269.7, 270.7, 271.65] },
    giant(271.65, 'headGoon'),
    setPiece(270.95, 'hush', 1),
    setPiece(271.65, 'rackBreak', 1.5),
    fx(269.7, 'bgPulse', 0.7),
    fx(270.7, 'bgPulse', 0.8),
    fx(271.65, 'flash', 0.9),

    // ================================================================ BLOCK 3 — SIGN FALLS (69-76). Follows: the shouts
    { type: 'checkpoint', beat: bar(69) },
    { type: 'crowd', beat: bar(69), cap: 24, earn: [271.65] }, // FULL HOUSE lands on the drop for a clean break shot
    sky(bar(69), 'sunset'),
    { type: 'ground', beat: bar(69) + 1.4, style: 'roof' },
    setPiece(bar(69), 'drop', 2),
    setPiece(bar(69), 'signFalls', 24),
    label(bar(69), 'CHORUS 4 — Sign Falls'),
    follows(bar(69), 'shouts'),
    // ---- bar 69 (THE DROP, .85): the rack's recoil launches you through the skylight (the high pane mid-arc) onto the
    // roof ON 274, right onto the fallen B; the B's neon on the D# (274.66). 0 threats: the drop lands
    launch(bar(69, 1), 2, ROOF),
    mode(bar(69, 1), 'launch'),
    cam(bar(69, 1), 0.72, 1.5),
    fx(bar(69, 1), 'flash', 1),
    fx(bar(69, 1), 'shake', 0.7),
    fx(bar(69, 1), 'shot', 1),
    bottleHigh(bar(69, 2), 'glass', undefined, true), // the casino's skylight, burst from below mid-launch
    mode(bar(69, 3), 'roof'),
    crate(bar(69, 3), 'letterNeon'), // land ON 274 on the fallen B: its big neon SLAMS
    // iteration 5: X · X then the well — the B's last tube on 4 (was a reward hop on 275 whose late landing fell into the
    // 276 well: a hidden lethal). Tokens run along the B to the lip
    smash(bar(69, 4), 'letterNeon'),
    lumRowSwung(and(bar(69, 3)), bar(70, 1) - 0.1, 50),
    topple(bar(69), 0, 'B', 274.3, 276.09, ROOF, 'frame'),
    // ---- bar 70 (.80, HEY 277 · 278): the light-well on the kick (276, tight), the BLUFFER PAIR leaps off the falling I
    // on the two HEYs, neon tubes on 4 and its "and"
    mode(bar(70, 1), 'letters'),
    topple(bar(70), 1, 'I', 278.0, 280.55, ROOF),
    jabber(bar(70, 2)),
    jabber(bar(70, 3)), // iteration 5: the BLUFFER PAIR — a second one leaps off the I on the second HEY (miss both = the Burn)
    fx(bar(70, 2), 'flash', 0.45),
    fx(bar(70, 3), 'flash', 0.45),
    smash(bar(70, 4), 'letterNeon'),
    smash(and(bar(70, 4)), 'letterNeon'), // the I's last tube on the "and" of 4
    // ---- bar 71 (.90, the A7 climb): up onto the fallen I (280), bat a bottle from the crown's window into the G on
    // the snare (281), the light-well on the kick (282), the G's neon mid-hop on the D# (282.66)
    topple(bar(71), 2, 'G', 282.75, 284.13, ROOF + 50),
    batBottle(bar(71, 2)),
    smash(and(bar(71, 3)), 'letterNeon'),
    // (iteration 5: no hop on 283 — the 284 well's early side is real; tokens along the G)
    lumRowSwung(bar(71, 4), bar(72, 1) - 0.1, 50),
    // ---- bar 72 (.72, the dip, HEY 286): the light-well past the G on the kick (284, lethal), the J's neon on the snare, a Bluffer riding the J on the HEY,
    // the J-HOOK SEE-SAW on 4 flings you up ON 289
    topple(bar(72), 3, 'J', 286.0, 287.3, ROOF + 50),
    smash(bar(72, 2), 'letterNeon'),
    jabber(bar(72, 3)),
    fx(bar(72, 3), 'flash', 0.45),
    launch(bar(72, 4), 2, ROOF + 140),
    mode(bar(72, 4), 'launch'),
    cam(bar(72, 4), 0.74, 1),
    // ---- bar 73 (.76): ROLE REVERSAL — mid-flight, smash the second I's cap ON the downbeat and YOUR shot topples it;
    // land 289, then the POST RUN over the light-well on its steel legs: 290 · 291 · 292 (isochronous, counts once)
    bottleHigh(bar(73, 1), 'letterNeon', undefined, true),
    topple(bar(73), 4, 'I', 290.28, 292.7, ROOF + 140, 'shot'),
    smash(bar(73, 2), 'letterNeon'), // land ON 289: its neon shatters under you
    mode(bar(73, 3), 'posts'),
    follows(bar(73, 3), 'kick'),
    // ---- bar 74 (.85, THE CHORUS PEAK): the lethal combination — a Bluffer on the M's hump (293), the held jump UP to the
    // terrace on the kick (294), the M's big neon mid-jump (295). The M falls into the terrace ahead of you
    topple(bar(74), 5, 'M', 295.6, 297.5, TERRACE),
    jabber(bar(74, 2)),
    bottleHigh(bar(74, 4), 'letterNeon', undefined, true),
    mode(bar(74, 4), 'terrace'),
    fx(bar(74, 1), 'shake', 0.35),
    // ---- bar 75: HOOK A — the THIRD WALKDOWN is four blows ON BIG JIM (he has risen behind the letters since 73):
    // FIST · FIST · LAPEL · JAW on B A G F# (giants, a real hitstop each)
    label(bar(75), 'THE WALKDOWN — on Big Jim'),
    setPiece(bar(75), 'walkdownJim', 4),
    follows(bar(75), 'bassWalks'),
    cam(bar(75, 1), 0.74, 1),
    giant(bar(75, 1), 'fist'),
    giant(bar(75, 2), 'fist'),
    giant(bar(75, 3), 'lapel'),
    giant(bar(75, 4), 'jaw'),
    fx(bar(75, 1), 'shake', 0.4),
    fx(bar(75, 2), 'shake', 0.4),
    fx(bar(75, 3), 'shake', 0.4),
    fx(bar(75, 4), 'zoom', 0.9),
    // ---- bar 76 (.59, E lands): the breath — you crash IN through his penthouse's glass wall, token hops, a decanter
    setPiece(bar(76), 'penthouse', 8),
    sky(bar(76), 'penthouse'),
    { type: 'ground', beat: bar(76) + 0.5, style: 'penthouse' },
    cam(bar(76), 0.9, 2),
    fx(bar(76), 'flash', 0.7),
    giant(bar(76, 1), 'glass'), // his penthouse's glass wall: crash IN
    mode(bar(76, 1), 'penthouse'),
    ...tokenHop(bar(76, 2)),
    ...tokenHop(bar(76, 3)),
    smash(bar(76, 4), 'decanter'),
    smash(and(bar(76, 4)), 'glass'), // (iteration 5) his whisky glass on the "and" — the chorus keeps ≥ 1 action per beat

    // ================================================================ BLOCK 4 — THE REVEAL + THE GAUNTLET (77-83). No chalk marks
    { type: 'checkpoint', beat: bar(77) },
    { type: 'marks', beat: bar(77), on: false },
    label(bar(77), 'TAG 4 — BIG JIM'),
    follows(bar(77), 'sustains'),
    // ---- bar 77 (tag 4, the held B 304-305): THE REVEAL — the bluff display on the held note (0 threats): the held
    // jump over a table pocket (tokens trace his roar), a medallion on 3, up onto his knee on 4
    setPiece(bar(77), 'bigJimReveal', 4),
    cam(bar(77), 0.78, 0.5),
    cam(bar(77, 2), 0.86, 2),
    fx(bar(77), 'flash', 0.8),
    fx(bar(77), 'shake', 0.6),
    { type: 'action', action: { type: 'jump', beat: bar(77), hold: 1, fail: 'none' } },
    lumArcJump(bar(77)),
    bottleHigh(bar(77, 2), 'bell'), // mid-roar, at the apex
    smash(bar(77, 3), 'bell'),
    mode(bar(77, 4), 'bigJim-climb'),
    // ---- bar 78 (hook B): HIS FISTS SLAM on the beat (lethal lifts over the burned-out floor), hops 308 · 309 · 310 ->
    // his cuff; a medallion on 4
    setPiece(bar(77, 4), 'gauntlet', 25),
    follows(bar(78), 'hooks'),
    smash(bar(78, 1), 'bell'), // iteration 5: his pinky ring on the downbeat (was a reward hop onto the knee: X ∪ ∪ X X)
    pendulum(bar(78, 4)),
    smash(and(bar(78, 4)), 'bell'), // his cufflink
    fx(bar(78, 2), 'bgPulse', 0.6),
    fx(bar(78, 3), 'bgPulse', 0.6),
    // ---- bar 79 (held 313.62, the fill): up onto the sleeve (312), KNEE-SLIDE up the velvet sleeve under the Bluffers'
    // cue line on the held note, then HUP up to his shoulder (315) — the Burn lunges on 314.72: his BACKHAND
    smash(bar(79, 2), 'bell'),
    // FILM CANISTER #3 (iteration 6): HOLD the HUP up the sleeve (315) and you vault his lapel onto his SHOULDER — the
    // canister is on his epaulette. The risk: the flight skips the HUP on 316 (no Heave on the lens) and lands you right
    // before the lethal notch (318)
    { type: 'canister', from: bar(79, 4) },
    ...slideUnder(313.62, 1.2),
    // ---- bar 80 (HEY 317): HUP up onto the lapel (316), HEY = the LEFT LENS CRACKS (a Hup-Hup-HEY), a hop, a
    // medallion
    { type: 'phrase', beats: [bar(79, 4), bar(80, 1), bar(80, 2)] },
    giant(bar(80, 2), 'lens'),
    fx(bar(80, 2), 'flash', 0.8),
    // (318: the hop across the lapel notch is lethal now — terrain above)
    pendulum(bar(80, 4)),
    // ---- bar 81 (held 320.07): the held jump over his breast pocket (safe), the big medallion mid-air (321), his
    // KNUCKLE RING sweeps low (323: hop it, the HUP)
    { type: 'checkpoint', beat: bar(81) },
    { type: 'action', action: { type: 'jump', beat: bar(81), hold: 1, fail: 'none' } },
    lumArcJump(bar(81)),
    pendulumHigh(bar(81, 2), true),
    smash(bar(81, 3), 'bell'),
    ...spikeHop(bar(81, 4)),
    // ---- bar 82 (HEY 325): HUP lapel -> collar (324), HEY = the RIGHT LENS CRACKS, the LETHAL hop onto the lens rim (326), a hit
    { type: 'phrase', beats: [bar(81, 4), bar(82, 1), bar(82, 2)] },
    giant(bar(82, 2), 'lens'),
    fx(bar(82, 2), 'flash', 0.8),
    smash(bar(82, 4), 'letterNeon'),
    // ---- bar 83 (the fill &3 &4): the exam's cadence, 0 threats (the song's outro is its calmest section: the valley
    // after chorus 4) — the GOLD CHAIN snaps on 1, a medallion off it on 2, a hop, the fill run through the flying
    // medallions (330.70, 331.68)
    crate(bar(83, 1), 'chain'),
    smash(bar(83, 2), 'bell'), // a medallion flying off the snapped chain (X X ∪ X X)
    // (330: the hop over the snapped chain's gap is lethal now — terrain above)
    smash(330.7, 'letterNeon'),
    smash(331.68, 'letterNeon'),
    fx(330.7, 'bgPulse', 0.7),
    fx(331.68, 'bgPulse', 0.8),

    // ================================================================ BLOCK 5 — THE FINALE (84-86): can't die
    { type: 'chaser', beat: bar(84), off: true },
    sky(bar(84), 'theatre'),
    { type: 'ground', beat: bar(84) - 0.2, style: 'filmstrip' },
    setPiece(bar(84), 'pullOut', 4),
    setPiece(bar(84, 2), 'marqueeSwap', 3),
    cam(bar(84), 0.7, 3),
    label(bar(84), 'OUTRO — the final reel'),
    follows(bar(84), 'shouts'),
    mode(bar(84), 'filmstrip'),
    // ---- bar 84 (HEY 333, the pickup): up a sprocket, YOUR HEY knocks Big Jim off the marquee (333), sprockets rising
    // on B C D D#
    crate(bar(84, 2), 'jaw'),
    fx(bar(84, 2), 'flash', 0.7),
    smash(and(bar(84, 3)), 'popcorn'), // the pickup's D
    // ---- bar 85 (held B 336): the IRIS closes blade by blade — up a blade on 1, a popcorn bucket from the front row on
    // 2, HUP · HUP up the last blades (338, 339)
    setPiece(bar(85), 'irisOut', 5),
    { type: 'crowd', beat: bar(85, 3), cap: 24, floor: 20 }, // the whole house on its feet for the final hit
    smash(bar(85, 2), 'popcorn'),
    cam(bar(85), 0.78, 4),
    // ---- bar 86: THE FINAL HIT (340) — the power shot off the last blade (the HEY of the last Hup-Hup-HEY) as the iris
    // SLAMS shut on Big Jim's face. THE END burns in on 341; Slim runs to the throne and strikes the victory pose
    { type: 'phrase', beats: [bar(85, 3), bar(85, 4), bar(86)] },
    giant(bar(86), 'finalHit'),
    fx(bar(86), 'flash', 1),
    fx(bar(86), 'shake', 1),
    fx(bar(86), 'shot', 1),
    cam(bar(86), 0.66, 0.5),
    // (the finish line sits half a beat after the final hit: a strike ON 340 must connect before the run ends. THE END
    // burns in on 341 and the second iris opens on the victory: `game.mech.act3.state.iris`, a function of the beat)
    { type: 'finish', beat: bar(86) + 0.5 },
    // the throne of stacked pool tables: Slim runs into it after THE END and stops (victory pose)
    { type: 'block', from: bar(86, 4) + 0.1, to: bar(86, 4) + 3, h: T.h + 240, bottom: T.h - 40 },

    // ================================================================ BIG JIM (game/mech/bigJim.ts poses; bound parts = the items above)
    jim(bar(73), 'hidden', 0.01, { x: bar(75, 4) + 1.5, h: TERRACE - 900, scale: 0.9 }),
    jim(bar(73, 3), 'rise', 6, { h: TERRACE - 260 }), // up behind the letters as the sign falls
    jim(bar(75), 'brace', 0.5), // the walkdown: he takes four blows (fist, fist, lapel, jaw)
    jim(bar(75, 4) + 0.2, 'reeling', 0.5),
    jim(bar(76), 'knockedBack', 1.5, { x: bar(77, 3) + 0.5, h: P - 120, scale: 1.0 }), // back through his own glass wall
    jim(bar(76, 3), 'throne', 1),
    jim(bar(77), 'bluff', 0.5), // THE REVEAL on the held B
    jim(bar(78), 'fight', 1.5, { ahead: 2.8, h: P - 60, scale: 1.1 }), // the gauntlet: you climb him, he stays in your face
    jim(314.4, 'swing', 0.35), // his backhand = the Burn's lunge on the fill (314.72)
    jim(315.4, 'fight', 0.6),
    jim(bar(80, 2), 'reel', 0.2), // left lens
    jim(bar(80, 3), 'fight', 1),
    jim(bar(81, 3) - 0.1, 'swing', 0.9), // the tag's call: a 1-beat wind-up, his knuckle ring sweeps low ON 323 (hop it)
    jim(bar(81, 4) + 0.4, 'fight', 0.5),
    jim(bar(82, 2), 'reel', 0.2), // right lens
    jim(bar(82, 3), 'fight', 1),
    jim(330.4, 'swing', 0.35), // the last lunge (330.70): he swings at air
    jim(331.4, 'fight', 0.5),
    jim(bar(84, 2), 'defeated', 0.5), // your HEY knocks him off the marquee
    jim(bar(85), 'framed', 1, { x: bar(86) + 1, h: T.h + 260, scale: 0.4 }), // shrunk into one film frame: the iris's target
  ];
}

/** a toppling BIG JIM letter (presentation; its bridge is the terrain floor under [from, to]) */
function topple(beat: number, index: number, letter: string, from: number, to: number, h: number, by?: 'frame' | 'shot'): LevelItem {
  return { type: 'topple', beat, index, letter, from, to, h, by };
}

// the standalone act (focused tools: slack, rubric) starts on act 2's Lanes deck
const H0 = 950;

/** Act 3 on its own (for `node playtest/slack.mjs --level=src/level/act3.ts#act3Level` and the rubric). */
export const act3Level: LevelDef = {
  id: 'act3-bars-61-86',
  name: 'Act 3 — the breakdown, the Rack, Sign Falls, Big Jim, the final hit (original recording)',
  songId: 'jim_edit',
  pixelsPerBeat: 384,
  startBeat: bar(61),
  endBeat: bar(86) + 0.5,
  items: [
    { type: 'floor', from: bar(61) - 20, to: bar(61) - 2, h: H0 },
    { type: 'sky', beat: -100, preset: 'lanes' },
    { type: 'camera', beat: -100, zoom: 0.9, beats: 0.01 },
    { type: 'chaser', beat: bar(61) },
    ...act3Items(H0),
  ],
};
