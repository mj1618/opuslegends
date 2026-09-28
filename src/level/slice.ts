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
  giantKeg,
  jabber,
  jumpStrike,
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
import type { FxKind, LevelDef, LevelItem, SetPieceName } from './types';

/** beat of bar n (1-based, the edit's numbering), beat k (1-based) */
const bar = (n: number, beat = 1) => (n - 1) * 4 + (beat - 1);
const fx = (beat: number, kind: FxKind, amount = 1): LevelItem => ({ type: 'fx', beat, fx: kind, amount });
const mode = (beat: number, m: string): LevelItem => ({ type: 'mode', beat, mode: m });
const follows = (beat: number, lane: string): LevelItem => ({ type: 'follows', beat, lane });
/** first-appearance prompt (≤ 3 in act 1; everything else is taught by placement + failure hints, game.ts) */
const hint = (beat: number, text: string, icon: string, beats = 6): LevelItem => ({ type: 'hint', beat, beats, text, icon });
const setPiece = (beat: number, name: SetPieceName, beats = 4): LevelItem => ({ type: 'setPiece', beat, name, beats });
const label = (beat: number, text: string): LevelItem => ({ type: 'label', beat, text });

/** heights (px above the street) */
const ROOF_A = 250;
const ROOF_B = 150;
const BAR_TOP = 120;
/** the lethal turnaround lifts: narrower press tops (playtest/slack.mjs measures each hop's window) */
const TIGHT_LIFT = [-0.19, 0.28] as const;
/**
 * Iteration 4 (review iter3 fix 3): the chorus pits that punished EARLY presses in bursts (94 at -60 ms, 98 / 106 at
 * -65 ms killed a ±130 player 6× in bars 24-28) end sooner: ~-85/+150 ms. The peak-bar pit 92 and 108 keep -75.
 */
const CHORUS_FIT = [0.09, 0.81] as const;

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
    hint(bar(1), '→ HOLD to run  ·  SPACE hop  (hold = big jump)', 'run', 8),
    lumRowSwung(bar(1, 1) + 0.5, bar(1, 2) + 0.5),
    ...tokenHop(bar(1, 3)),
    // ---- bar 2
    ...tokenHop(bar(2, 1)),
    ...tokenJump(bar(2, 3)),
    // ---- bar 3: strike on the snare
    hint(bar(3, 1) + 0.5, 'X  swing — smash on the snare', 'strike', 6),
    bottle(bar(3, 2)),
    ...tokenHop(bar(3, 3)),
    bottle(bar(3, 4)),
    // ---- bar 4: the intro fill + our HEY on beat 4 (beat 15) = the first payoff
    // hop · hop · hop · HEY: the intro leads with the HOP (iteration 4, B5: strikes led every block)
    ...tokenHop(bar(4, 1)),
    ...tokenHop(bar(4, 2)),
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
    ...melodyTokens([[16, 57], [16.33, 58], [17.33, 59], [18.67, 55], [19.67, 57]]),
    bottle(bar(5, 2)),
    ...spikeHop(bar(5, 3)),
    // ---- bar 6: the held note 20.66 -> 22.74: a held jump across it, over a (safe) pool
    ...poolJump(and(bar(6, 1))),
    ...tokenHop(bar(6, 4)), // off the pool's far lip into the next pool (iteration 4: hop-led intro)
    // ---- bar 7: phrase 2 (energy .88)
    ...poolHop(bar(7, 1)),
    bottle(bar(7, 2), 'glass'),
    ...spikeHop(bar(7, 3)),
    bottle(and(bar(7, 4))),
    ...melodyTokens([[24.33, 59], [25.33, 55], [26.67, 55]]),
    // ---- bar 8: block PEAK = the first LETHAL COMBINATION: a pit on 1, then a held jump over a long pit on the
    // kick (3) smashing the BIG sign mid-air on the HEY (4): tap · hold · air-swing. Sloppy-safe timing ('teach')
    ...gapHop(bar(8, 1), 'teach'),
    ...jumpStrike(bar(8, 3), 'teach', true),
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
    // ---- bar 9: THE BIG LAUNCH (wow 1): pad on the kick (3), a 3-beat flight over the held note (34.67) up to the
    // 250 px roof, ~650 px apex on the kick of bar 10 (the sky-flip) — smash neon on the snare (4) and at the apex
    bottle(bar(9, 2)),
    launch(bar(9, 3), 3, ROOF_A),
    setPiece(bar(9, 3), 'bigLaunch', 3),
    mode(bar(9, 3), 'launch'),
    bottleHigh(bar(9, 4), 'neon'),
    bottleHigh(bar(10, 1), 'neon', undefined, true),
    { type: 'camera', beat: bar(9, 3), zoom: 0.8, beats: 1.5 },
    { type: 'camera', beat: bar(10, 2), zoom: 0.9, beats: 2 },
    fx(bar(9, 3), 'zoom', 0.6),
    fx(bar(10, 1), 'flash', 0.5),
    raised(bar(9, 4), bar(10, 3) + 0.6, ROOF_A),
    mode(bar(10, 1), 'rooftops'),
    // ---- bar 10: land on roof A on the snare; step down on the descending vocal run
    bottle(bar(10, 2), 'neon'),
    ...tokenHop(bar(10, 3)), // hop down to roof B
    raised(bar(10, 3) + 0.6, bar(12, 3) + 0.4, ROOF_B),
    bottle(bar(10, 4)), // (mid-drop: the step down to roof B lands after the beat — no hop here)
    ...melodyTokens([[36.67, 57], [37.33, 56], [37.67, 55]]),
    // ---- bar 11: the alley (lethal, kick on 1) with a swung-pair bottle mid-air; a vent spike on 3
    ...gapHop(bar(11, 1), 'teach'),
    bottle(and(bar(11, 1)), 'glass'),
    ...spikeHop(bar(11, 3)),
    ...tokenHop(bar(11, 4)), // a chimney hop: the rooftops lean on HOPS (review iter2 fix 6, B5)
    // ---- bar 12: E7 + fill: the first goon, then DROP to the street on the fill
    jabber(bar(12, 2)),
    ...tokenHop(bar(12, 3)), // off the roof edge
    mode(bar(12, 3) + 0.4, 'street'),
    bottleHigh(bar(12, 4), undefined, 250), // mid-drop off the roof
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
    ...gapJump(bar(14, 3), 'teach'),
    bottleHigh(bar(14, 4)),
    // ---- bar 15: bass out again — a breather: held jump over a pool, a hop, a bottle on the snare
    ...poolJump(bar(15, 1)),
    ...tokenHop(bar(15, 3)),
    ...tokenHop(bar(15, 4)),
    ...melodyTokens([[58.67, 55], [59.67, 59]]),
    // ---- bar 16: block PEAK = LETHAL COMBINATION: pit on 1, a goon on the snare (2), a held jump over a long pit on
    // the kick (3) and the BIG sign struck mid-air on the snare (4), landing on the versePeak downbeat. ('teach')
    ...gapHop(bar(16, 1), 'teach'),
    jabber(bar(16, 2)),
    ...jumpStrike(bar(16, 3), 'teach', true),
    fx(bar(16, 4), 'zoom', 0.7),

    // ================================================================ BLOCK 3 — the honky-tonk
    { type: 'checkpoint', beat: bar(17) },
    { type: 'sky', beat: bar(17), preset: 'honkytonk' },
    { type: 'ground', beat: bar(17) - 1, style: 'timber' },
    { type: 'crowd', beat: bar(17), cap: 15 },
    mode(bar(17), 'bar-floor'),
    follows(bar(17), 'fills'),
    label(bar(17), 'THE HONKY-TONK — stop-time'),
    fx(bar(17), 'flash', 0.3),
    // ---- bar 17: the versePeak (the held high D) — a groove bar
    ...tokenHop(bar(17, 2)), // iteration 4: the honky-tonk block leads with the hop (lifts, fill runs, HUP HUP)
    ...tokenJump(bar(17, 3)),
    // ---- bar 18: the held note 69.67 -> 70.67 = the first KNEE-SLIDE
    hint(bar(18, 1), '↓  HOLD to knee-slide under the sign', 'down', 5),
    bottle(bar(18, 2)),
    ...slideUnder(and(bar(18, 2)), 1),
    ...tokenHop(bar(18, 4)),
    // ---- bar 19: stomp on every beat: lifts over a POOL (safe) — the lift rhythm, taught
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
    { type: 'crowd', beat: bar(21), cap: 16 },
    follows(bar(21), 'bassWalks'),
    label(bar(21), 'PRE-CHORUS — the walk-up'),
    fx(bar(21), 'bgPulse', 0.8),
    ...tokenHop(bar(21, 2)),
    ...tokenHop(bar(21, 3)),
    bottle(and(bar(21, 3)), 'glass'),
    bottle(and(bar(21, 4))),
    fx(and(bar(21, 3)), 'bgPulse', 0.5),
    fx(and(bar(21, 4)), 'bgPulse', 0.5),
    // ---- bar 22: the walk-up E E F# G# with the record's HUP HUP HEY: the motto phrase
    ...gapHop(bar(22, 1), 'tight'),
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
    // THE CHORUS SHOT (wow 3): a new shot — wide (-20 %), the launch onto the counter, the BIG neon on the snare
    // at the top of the arc is the money shot (level `shot` fx: render/moments.ts punches the shot on it)
    setPiece(bar(23, 1), 'chorusShot', 32),
    launch(bar(23, 1), 2, BAR_TOP),
    mode(bar(23, 1), 'launch'),
    { type: 'camera', beat: bar(23, 1), zoom: 0.76, beats: 2 },
    fx(bar(23, 1), 'flash', 0.6),
    fx(bar(23, 1), 'shake', 0.5),
    fx(bar(23, 1), 'shot', 1),
    bottleHigh(bar(23, 2), 'neon', undefined, true),
    fx(bar(23, 2), 'shot', 0.6),
    raised(bar(23, 2), bar(26, 4) + 1.2, BAR_TOP),
    mode(bar(23, 3), 'bar-top'),
    // ---- bar 23 lands on the counter: the A7 climb's D# (&3) is a bottle, E on 4 a spike
    bottle(and(bar(23, 3)), 'glass'),
    // (beat 4 rests: a breath before the peak combination — a hop here would drag a late landing into the pit)
    // ---- bar 24: block PEAK = LETHAL COMBINATION on the counter, on the record's HEY HEY: a pit on the kick (1),
    // a goon on the first HEY (2), a pit on the second HEY + kick (3), then the snare and the fill's &4
    // smashed: ∪ X ∪ X X. A missed goon knocks you off the grid right before the second pit (and feeds the Burn,
    // which lunges on the fill).
    ...gapHop(bar(24, 1), 'tight'),
    jabber(bar(24, 2)),
    ...gapHop(bar(24, 3), CHORUS_FIT),
    bottle(bar(24, 4)),
    bottle(and(bar(24, 4)), 'glass'),
    fx(bar(24, 2), 'flash', 0.4),
    fx(bar(24, 3), 'flash', 0.4),
    fx(and(bar(24, 4)), 'bgPulse', 0.6),

    // ---- bar 25: A7 climb: the chorus cell (hop on D, swing on D#)
    { type: 'checkpoint', beat: bar(25) },
    follows(bar(25), 'shouts'),
    pendulum(bar(25, 2)), // the chorus's own target: swinging lamps (review iter2 fix 6)
    ...gapHop(bar(25, 3), CHORUS_FIT),
    bottle(and(bar(25, 3))),
    bottle(and(bar(25, 4)), 'glass'),
    // ---- bar 26: E7, HEY on 3, then the held note 102.97: a held jump off the end of the counter
    ...tokenHop(bar(26, 1)),
    bottle(bar(26, 2)),
    jabber(bar(26, 3)),
    ...tokenJump(bar(26, 4)), // off the end of the counter on the held note
    fx(bar(26, 3), 'flash', 0.5),
    mode(bar(27, 1), 'bar-floor'),
    // ---- bar 27: A7 climb on the floor: a pit on the D, the D# and the E are bottles
    pendulum(bar(27, 2)), // swinging lamp
    ...gapHop(bar(27, 3), CHORUS_FIT),
    bottle(and(bar(27, 3)), 'glass'),
    bottle(and(bar(27, 4))),
    // ---- bar 28: A7, the held note 109: hop a pit on 1 straight into a knee-slide
    ...gapHop(bar(28, 1), 'tight'),
    ...slideUnder(bar(28, 2), 1.3),
    ...tokenHop(and(bar(28, 3))), // pop up out of the slide on the melody's "and"
    bottle(bar(28, 4), 'jug'),
    // ---- bar 29: HOOK A — the walkdown B A G F#: THE GIANT SMASH (wow 2): four giant kegs, one per quarter, each a
    // real hitstop + zoom punch (game.ts hitBreakable; `smash` events carry index 0..3 for the art/audio)
    { type: 'checkpoint', beat: bar(29) }, // replays of the tight chorus body restart on the money shot
    label(bar(29), 'THE WALKDOWN'),
    setPiece(bar(29), 'walkdown', 4),
    giantKeg(bar(29, 1)),
    giantKeg(bar(29, 2)),
    giantKeg(bar(29, 3)),
    giantKeg(bar(29, 4)),
    fx(bar(29, 1), 'shake', 0.35),
    fx(bar(29, 2), 'shake', 0.35),
    fx(bar(29, 3), 'shake', 0.35),
    fx(bar(29, 4), 'zoom', 0.8),
    { type: 'camera', beat: bar(29, 1), zoom: 0.78, beats: 1 },
    // ---- bar 30: E lands; hook B + the fill (&3, &4)
    fx(bar(30, 1), 'flash', 0.6),
    { type: 'camera', beat: bar(30, 1), zoom: 0.84, beats: 2 },
    // iteration 4: E lands on a pit (~-80/+150 ms) — the ±130 teeth the widened 94/98/106 gave back, away from the
    // bars 24-28 burst (a ±85 press never misses it early; the late side keeps the +150 rule)
    ...gapHop(bar(30, 1), [0.09, 0.85]),
    bottle(bar(30, 2)),
    ...gapHop(bar(30, 3), 'tight'),
    bottle(and(bar(30, 3)), 'glass'),
    bottle(and(bar(30, 4))),
    fx(and(bar(30, 3)), 'bgPulse', 0.6),
    fx(and(bar(30, 4)), 'bgPulse', 0.6),

    // ---- bar 31: the TAG — the record dips (.48): a breath before the last run
    { type: 'checkpoint', beat: bar(31) },
    label(bar(31), 'TAG'),
    fx(bar(31), 'bgPulse', 0.5),
    { type: 'camera', beat: bar(31), zoom: 0.9, beats: 2 },
    ...tokenHop(bar(31, 2)), // the tag breathes on hops (iteration 4: the chorus block ≤ 60 % strikes)
    ...tokenHop(bar(31, 3)),
    bottle(and(bar(31, 3))),
    ...melodyTokens([[120, 59], [121.67, 55], [123, 55], [123.67, 52]]),
    // ---- bar 32: TURNAROUND — piano B stabs on every beat: smash two, then the lethal lift run over the
    // cellar starts on the HEY (126) and carries the record's HUP HUP (128, 129) — the HEY (130) is the Heave
    label(bar(32), 'TURNAROUND — the cellar lifts'),
    follows(bar(32), 'stabs'),
    { type: 'camera', beat: bar(32), zoom: 0.84, beats: 1 },
    crate(bar(32, 1)),
    bottle(bar(32, 2), 'glass'),
    fx(bar(32, 1), 'bgPulse', 0.8),
    fx(bar(32, 2), 'bgPulse', 0.8),
    fx(bar(32, 3), 'flash', 0.5),
    fx(bar(32, 4), 'bgPulse', 0.8),
    mode(bar(32, 3), 'lifts'),
    // block PEAK = LETHAL COMBINATION: tight lifts (narrow press tops) → HUP HUP → the HEY Heave on the ledge
    ...slamRun(bar(32, 4), 3, TIGHT_LIFT), // hops 126 (HEY), 127, 128 (HUP), 129 (HUP) -> ledge 130
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
