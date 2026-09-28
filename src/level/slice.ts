/**
 * THE LEVEL — Act 1 on the ORIGINAL recording (the 2:04 edit, `assets/audio/jim_edit.beatmap.json`):
 * cold open + edit bars 1-33 (intro → verse 1 → pre-chorus → chorus 1 → tag → turnaround), ending on
 * the verse-3 downbeat (beat 132). Plan and bar-by-bar rationale: docs/level/act1_plan.md.
 *
 * GRID: beat 0 = song bar 1 beat 1 (the record has no pickup: the count-in is the game's), bar n starts
 * on beat 4(n-1). "&" = the swung and (+0.66). Tempo-agnostic (x = beat * pixelsPerBeat).
 *
 * ECONOMY (docs/FUN_RUBRIC.md, docs/reviews/iter1.md): ~1 action per beat, most of them REWARDS
 * (bottles/crates smashed on snares, stabs and fill accents; token hops and held jumps on the vocal;
 * pools; launches). Lethal threats are sparse and sit on the kick (beats 1/3) or a shout. Every 8-bar
 * block is a sawtooth (groove → build → peak); the chorus block is the act's peak.
 *
 *   cold open   no music; STRIKE -> 4-beat count-in -> the record
 *   bars 1-8    42nd Street (golden): teach hop / held jump / strike; the Burn on 5; pools; first pit on 8
 *   bars 9-16   the neon ROOFTOPS: launch up on 9, step down, alley gap, drop to the street on 12,
 *               stop-time big hits (long gap on the held note 14)                        ◆ 32
 *   bars 17-24  the HONKY-TONK: knee-slide on the held note (18), lifts over a pool (19), fill runs,
 *               Hup-Hup-HEY on the walk-up (22), LAUNCH onto the bar top for the chorus   ◆ 64, ◆ 80
 *   bars 25-33  chorus body on the bar top, the walkdown smash (29), the tag breath (31), the lethal
 *               lift run on the piano stabs (32), Hup-Hup-HEY + the last launch (33)        ◆ 96, ◆ 120
 */
import {
  and,
  bottle,
  bottleHigh,
  crate,
  gapHop,
  gapJump,
  jabber,
  launch,
  lumRowSwung,
  melodyTokens,
  pendulum,
  poolHop,
  poolJump,
  raised,
  slamRun,
  slamRunPool,
  slideUnder,
  spikeHop,
  tokenHop,
  tokenJump,
} from './dsl';
import type { FxKind, LevelDef, LevelItem } from './types';

/** beat of bar n (1-based, the edit's numbering), beat k (1-based) */
const bar = (n: number, beat = 1) => (n - 1) * 4 + (beat - 1);
const fx = (beat: number, kind: FxKind, amount = 1): LevelItem => ({ type: 'fx', beat, fx: kind, amount });
const mode = (beat: number, m: string): LevelItem => ({ type: 'mode', beat, mode: m });
const follows = (beat: number, lane: string): LevelItem => ({ type: 'follows', beat, lane });
const hint = (beat: number, text: string, beats = 6): LevelItem => ({ type: 'hint', beat, beats, text });
const label = (beat: number, text: string): LevelItem => ({ type: 'label', beat, text });

/** heights (px above the street) */
const ROOF_A = 150;
const ROOF_B = 90;
const BAR_TOP = 120;

export const sliceLevel: LevelDef = {
  id: 'act1-bars-1-33',
  name: 'Act 1 — cold open to the chorus-1 turnaround (original recording)',
  songId: 'jim_edit',
  pixelsPerBeat: 384,
  startBeat: bar(1),
  endBeat: bar(34),
  coldOpen: true,
  items: [
    { type: 'sky', beat: -100, preset: 'golden' },
    { type: 'camera', beat: -100, zoom: 0.95, beats: 0.01 },
    { type: 'crowd', beat: -100, cap: 10 },
    mode(bar(1), 'street'),
    follows(bar(1), 'kick'),

    // ================================================================ BLOCK 1 — 42nd Street, golden hour
    // ---- bar 1: the band comes in (kick 1&3, snare 2&4)
    label(bar(1), 'INTRO — 42nd Street'),
    hint(bar(1), 'Hold → to run — top speed IS the beat'),
    lumRowSwung(bar(1, 1) + 0.5, bar(1, 2) + 0.5),
    ...tokenHop(bar(1, 3)),
    // ---- bar 2
    hint(bar(2, 1), 'SPACE: tap = hop · hold = big jump', 7),
    ...tokenHop(bar(2, 1)),
    ...tokenJump(bar(2, 3)),
    // ---- bar 3: strike on the snare
    hint(bar(3, 1) + 0.5, 'X: CUE SWING — smash the bottles on the snare', 7),
    bottle(bar(3, 2)),
    ...tokenHop(bar(3, 3)),
    bottle(bar(3, 4)),
    // ---- bar 4: the intro fill + our HEY on beat 4 (beat 15) = the first payoff
    ...tokenHop(bar(4, 1)),
    bottle(bar(4, 2), 'glass'),
    ...tokenHop(bar(4, 3)),
    pendulum(bar(4, 4), true),
    fx(bar(4, 4), 'flash', 0.5),
    fx(bar(4, 4), 'zoom', 0.8),

    // ---- bar 5: VERSE 1 — the vocal enters, the Burn rises
    label(bar(5), 'VERSE 1 — the vocal'),
    follows(bar(5), 'vocal'),
    { type: 'chaser', beat: bar(5) },
    fx(bar(5), 'zoom', 0.8),
    fx(bar(5), 'shake', 0.4),
    hint(bar(5), 'The film is BURNING behind you — keep up with the beat!', 5),
    ...melodyTokens([[16, 57], [16.33, 58], [17.33, 59], [18.67, 55], [19.67, 57]]),
    bottle(bar(5, 2)),
    ...spikeHop(bar(5, 3)),
    // ---- bar 6: the held note 20.66 -> 22.74: a held jump across it, over a (safe) pool
    hint(bar(6, 1), 'Puddles only splash — HOLD the jump through the long note', 6),
    ...poolJump(and(bar(6, 1))),
    bottle(bar(6, 4)),
    // ---- bar 7: phrase 2 (energy .88)
    ...poolHop(bar(7, 1)),
    bottle(bar(7, 2), 'glass'),
    ...spikeHop(bar(7, 3)),
    bottle(and(bar(7, 4))),
    ...melodyTokens([[24.33, 59], [25.33, 55], [26.67, 55]]),
    // ---- bar 8: the fill (&3, 4, &4) + HEY on 4 = block peak; the FIRST real pit (on the kick)
    hint(bar(8, 1), 'Pits are for real — hop them on the kick', 5),
    ...tokenHop(bar(8, 1)),
    ...gapHop(bar(8, 3)),
    pendulum(bar(8, 4), true),
    bottle(and(bar(8, 4)), 'glass'),
    fx(bar(8, 4), 'flash', 0.5),
    fx(bar(8, 4), 'zoom', 0.8),
    fx(and(bar(8, 3)), 'bgPulse', 0.6),

    // ================================================================ BLOCK 2 — the neon rooftops
    { type: 'checkpoint', beat: bar(9) },
    { type: 'sky', beat: bar(9), preset: 'neon' },
    { type: 'crowd', beat: bar(9), cap: 14 },
    label(bar(9), 'ROOFTOPS'),
    fx(bar(9), 'bgPulse', 0.8),
    // ---- bar 9: LAUNCH up onto the roofs (pad on the kick, 3), a high bottle mid-flight on the snare (4)
    hint(bar(9, 1) + 0.5, 'Springboards LAUNCH you — swing at the bottles up high!', 6),
    bottle(bar(9, 2)),
    launch(bar(9, 3), 2, ROOF_A),
    mode(bar(9, 3), 'launch'),
    bottleHigh(bar(9, 4), 'neon'),
    { type: 'camera', beat: bar(9, 3), zoom: 0.88, beats: 2 },
    fx(bar(9, 3), 'zoom', 0.6),
    raised(bar(9, 4), bar(10, 3) + 0.6, ROOF_A),
    mode(bar(10, 1), 'rooftops'),
    // ---- bar 10: roof A; step down on the descending vocal run
    bottle(bar(10, 2), 'neon'),
    ...tokenHop(bar(10, 3)), // hop down to roof B
    raised(bar(10, 3) + 0.6, bar(12, 3) + 0.4, ROOF_B),
    bottle(bar(10, 4)),
    ...melodyTokens([[36.67, 57], [37.33, 56], [37.67, 55]]),
    // ---- bar 11: the alley (lethal, kick on 1) with a swung-pair bottle mid-air; a vent spike on 3
    ...gapHop(bar(11, 1)),
    bottle(and(bar(11, 1)), 'glass'),
    ...spikeHop(bar(11, 3)),
    bottle(bar(11, 4), 'neon'),
    // ---- bar 12: E7 + fill: the first goon, then DROP to the street on the fill
    hint(bar(12, 1), 'Goons flex on the "and"… then JAB on the beat — swing first!', 6),
    jabber(bar(12, 2)),
    ...tokenHop(bar(12, 3)), // off the roof edge
    mode(bar(12, 3) + 0.4, 'street'),
    bottle(bar(12, 4)),
    bottle(and(bar(12, 4)), 'glass'),
    fx(and(bar(12, 3)), 'shake', 0.3),
    fx(and(bar(12, 4)), 'bgPulse', 0.7),
    { type: 'camera', beat: bar(12, 3), zoom: 0.95, beats: 2 },
    // ---- bar 13: stop-time begins (the bass drops out on 4): swung-8th vocal = a token row
    ...tokenHop(bar(13, 1)),
    { type: 'pendulum', beat: bar(13, 2), action: { type: 'strike', beat: bar(13, 2) } },
    ...tokenHop(bar(13, 3)),
    bottle(bar(13, 4), 'glass'),
    fx(bar(13, 4), 'bgPulse', 0.6),
    lumRowSwung(bar(13, 1) + 0.5, bar(13, 2) - 0.5),
    // ---- bar 14: the held note on 3 = a held jump over the first LONG pit, bottle high on 4
    ...tokenHop(bar(14, 1)),
    ...gapJump(bar(14, 3)),
    bottleHigh(bar(14, 4)),
    // ---- bar 15: bass out again — a breather: held jump over a pool, a hop, a bottle on the snare
    ...poolJump(bar(15, 1)),
    ...tokenHop(bar(15, 3)),
    bottle(bar(15, 4)),
    ...melodyTokens([[58.67, 55], [59.67, 59]]),
    // ---- bar 16: block peak: pit on 1, a goon on 2, the BIG sign on 3; silence on the high-D pickup
    ...gapHop(bar(16, 1)),
    jabber(bar(16, 2)),
    pendulum(bar(16, 3), true),
    fx(bar(16, 3), 'zoom', 0.7),

    // ================================================================ BLOCK 3 — the honky-tonk
    { type: 'checkpoint', beat: bar(17) },
    { type: 'sky', beat: bar(17), preset: 'honkytonk' },
    { type: 'ground', beat: bar(17) - 1, style: 'timber' },
    { type: 'crowd', beat: bar(17), cap: 17 },
    mode(bar(17), 'bar-floor'),
    follows(bar(17), 'fills'),
    label(bar(17), 'THE HONKY-TONK — stop-time'),
    fx(bar(17), 'flash', 0.3),
    // ---- bar 17: the versePeak (the held high D) — a groove bar
    bottle(bar(17, 2), 'jug'),
    ...tokenJump(bar(17, 3)),
    // ---- bar 18: the held note 69.67 -> 70.67 = the first KNEE-SLIDE
    hint(bar(18, 1), 'HOLD ↓ on the long note: knee-slide under the signs', 6),
    bottle(bar(18, 2)),
    ...slideUnder(and(bar(18, 2)), 1),
    ...tokenHop(bar(18, 4)),
    // ---- bar 19: stomp on every beat: lifts over a POOL (safe) — the lift rhythm, taught
    hint(bar(19, 1) - 0.5, 'Kegs SLAM on the beat — hop on EVERY beat (it only splashes here)', 7),
    mode(bar(19, 1), 'lifts'),
    ...slamRunPool(bar(19, 2), 2), // hops 72, 73, 74 -> ledge 75
    bottle(bar(19, 4), 'jug'),
    mode(bar(19, 4), 'bar-floor'),
    // ---- bar 20: the fill (&1, &2, 3): a fill run
    ...tokenHop(bar(20, 1)),
    bottle(and(bar(20, 1)), 'glass'),
    bottle(and(bar(20, 2))),
    ...tokenHop(bar(20, 3)),
    fx(and(bar(20, 1)), 'bgPulse', 0.6),
    fx(and(bar(20, 2)), 'bgPulse', 0.6),
    fx(bar(20, 3), 'shake', 0.3),

    // ---- bar 21: PRE-CHORUS: the fill (&3, 4, &4) — rewards only after the checkpoint
    { type: 'checkpoint', beat: bar(21) },
    { type: 'crowd', beat: bar(21), cap: 19 },
    follows(bar(21), 'bassWalks'),
    label(bar(21), 'PRE-CHORUS — the walk-up'),
    fx(bar(21), 'bgPulse', 0.8),
    bottle(bar(21, 2)),
    ...tokenHop(bar(21, 3)),
    bottle(and(bar(21, 3)), 'glass'),
    bottle(and(bar(21, 4))),
    fx(and(bar(21, 3)), 'bgPulse', 0.5),
    fx(and(bar(21, 4)), 'bgPulse', 0.5),
    // ---- bar 22: the walk-up E E F# G# with the record's HUP HUP HEY: the motto phrase
    hint(bar(21, 3), 'HUP · HUP · HEY!  hop, hop, SWING — all on the beat = POWER SHOT', 9),
    ...gapHop(bar(22, 1)),
    ...spikeHop(bar(22, 2)),
    jabber(bar(22, 3)),
    { type: 'phrase', beats: [bar(22, 1), bar(22, 2), bar(22, 3)] },
    ...tokenHop(bar(22, 4)), // onto the springboard
    fx(bar(22, 1), 'bgPulse', 0.7),
    fx(bar(22, 2), 'bgPulse', 0.7),
    fx(bar(22, 3), 'flash', 0.5),

    // ================================================================ CHORUS 1 (bar 23 = A on the downbeat)
    { type: 'crowd', beat: bar(23), cap: 24 },
    label(bar(23), 'CHORUS 1 — on the bar'),
    launch(bar(23, 1), 2, BAR_TOP),
    mode(bar(23, 1), 'launch'),
    { type: 'camera', beat: bar(23, 1), zoom: 0.82, beats: 2 },
    fx(bar(23, 1), 'flash', 0.6),
    fx(bar(23, 1), 'shake', 0.5),
    bottleHigh(bar(23, 2), 'neon'),
    raised(bar(23, 2), bar(26, 4) + 1.2, BAR_TOP),
    mode(bar(23, 3), 'bar-top'),
    // ---- bar 23 lands on the counter: the A7 climb's D# (&3) is a bottle, E on 4 a spike
    bottle(and(bar(23, 3)), 'glass'),
    ...spikeHop(bar(23, 4)),
    // ---- bar 24: E7, the record's HEY HEY on 2 and 3 = two goons; a gap in the counter on 1
    ...gapHop(bar(24, 1)),
    jabber(bar(24, 2)),
    jabber(bar(24, 3)),
    bottle(and(bar(24, 4)), 'glass'),
    fx(bar(24, 2), 'flash', 0.4),
    fx(bar(24, 3), 'flash', 0.4),
    fx(and(bar(24, 4)), 'bgPulse', 0.6),

    // ---- bar 25: A7 climb: the chorus cell (hop on D, swing on D#)
    { type: 'checkpoint', beat: bar(25) },
    follows(bar(25), 'shouts'),
    bottle(bar(25, 2), 'jug'),
    ...spikeHop(bar(25, 3)),
    bottle(and(bar(25, 3))),
    bottle(and(bar(25, 4)), 'glass'),
    // ---- bar 26: E7, HEY on 3, then the held note 102.97: a held jump off the end of the counter
    ...tokenHop(bar(26, 1)),
    bottle(bar(26, 2)),
    jabber(bar(26, 3)),
    ...tokenJump(bar(26, 4)),
    fx(bar(26, 3), 'flash', 0.5),
    mode(bar(27, 1), 'bar-floor'),
    // ---- bar 27: A7 climb on the floor: a pit on the D, the D# and the E are bottles
    bottle(bar(27, 2), 'jug'),
    ...gapHop(bar(27, 3)),
    bottle(and(bar(27, 3)), 'glass'),
    bottle(and(bar(27, 4))),
    // ---- bar 28: A7, the held note 109: hop a pit on 1 straight into a knee-slide
    ...gapHop(bar(28, 1)),
    ...slideUnder(bar(28, 2), 1.3),
    ...tokenHop(and(bar(28, 3))), // pop up out of the slide on the melody's "and"
    bottle(bar(28, 4), 'jug'),
    // ---- bar 29: HOOK A — the walkdown B A G F#: everyone slams, a bottle on every quarter
    label(bar(29), 'THE WALKDOWN'),
    crate(bar(29, 1), 'jug'),
    crate(bar(29, 2), 'jug'),
    crate(bar(29, 3), 'jug'),
    crate(bar(29, 4), 'jug'),
    fx(bar(29, 1), 'shake', 0.35),
    fx(bar(29, 2), 'shake', 0.35),
    fx(bar(29, 3), 'shake', 0.35),
    fx(bar(29, 4), 'zoom', 0.8),
    { type: 'camera', beat: bar(29, 1), zoom: 0.78, beats: 1 },
    // ---- bar 30: E lands; hook B + the fill (&3, &4)
    fx(bar(30, 1), 'flash', 0.6),
    { type: 'camera', beat: bar(30, 1), zoom: 0.84, beats: 2 },
    ...tokenHop(bar(30, 1)),
    bottle(bar(30, 2)),
    ...gapHop(bar(30, 3)),
    bottle(and(bar(30, 3)), 'glass'),
    bottle(and(bar(30, 4))),
    fx(and(bar(30, 3)), 'bgPulse', 0.6),
    fx(and(bar(30, 4)), 'bgPulse', 0.6),

    // ---- bar 31: the TAG — the record dips (.48): a breath before the last run
    { type: 'checkpoint', beat: bar(31) },
    label(bar(31), 'TAG'),
    fx(bar(31), 'bgPulse', 0.5),
    { type: 'camera', beat: bar(31), zoom: 0.9, beats: 2 },
    bottle(bar(31, 2), 'glass'),
    ...tokenHop(bar(31, 3)),
    bottle(and(bar(31, 3))),
    ...melodyTokens([[120, 59], [121.67, 55], [123, 55], [123.67, 52]]),
    // ---- bar 32: TURNAROUND — piano B stabs on every beat: smash two, then the lethal lift run over the
    // cellar starts on the HEY (126) and carries the record's HUP HUP (128, 129) — the HEY (130) is the Heave
    label(bar(32), 'TURNAROUND — the cellar lifts'),
    follows(bar(32), 'stabs'),
    hint(bar(31, 3), 'The kegs again — over the CELLAR this time. Hop every beat, then HEY!', 7),
    { type: 'camera', beat: bar(32), zoom: 0.84, beats: 1 },
    crate(bar(32, 1)),
    bottle(bar(32, 2), 'glass'),
    fx(bar(32, 1), 'bgPulse', 0.8),
    fx(bar(32, 2), 'bgPulse', 0.8),
    fx(bar(32, 3), 'flash', 0.5),
    fx(bar(32, 4), 'bgPulse', 0.8),
    mode(bar(32, 3), 'lifts'),
    ...slamRun(bar(32, 4), 3), // hops 126 (HEY), 127, 128 (HUP), 129 (HUP) -> ledge 130
    // ---- bar 33: HUP HUP on the lifts, HEY = the Heave on the far ledge, then the last springboard
    jabber(bar(33, 3)),
    { type: 'phrase', beats: [bar(33, 1), bar(33, 2), bar(33, 3)] },
    fx(bar(33, 1), 'zoom', 0.5),
    fx(bar(33, 2), 'zoom', 0.5),
    fx(bar(33, 3), 'flash', 0.7),
    mode(bar(33, 3), 'bar-floor'),
    launch(bar(33, 4), 2, undefined, false), // the finish line is on 132: no tokens after it
    mode(bar(33, 4), 'launch'),
    bottleHigh(and(bar(33, 4)), 'neon'), // the act's last smash, mid-flight through the finish line

    // ================================================================ verse-3 downbeat = the act's final hit
    { type: 'finish', beat: bar(34) },
    fx(bar(34), 'flash', 1),
    fx(bar(34), 'shake', 0.6),
  ],
};
