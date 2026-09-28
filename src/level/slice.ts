/**
 * THE LEVEL — vertical slice: cold open + bars 0-32 (DESIGN §7 structure). Internal names are
 * neutral mechanics (hop, strike, pendulum targets, spikes, gaps, slam platforms, jabbers, the
 * 3-hit Hup-Hup-HEY phrase, the crowd, the chaser); the skin lives in the renderer.
 * Authored in beats against the song's bar grid (bar n starts on beat 4n; bar 0 = pickup).
 * Tempo-agnostic: the provisional song is 164 BPM (placeholderSong); swapping in the real
 * arrangement only needs the same bar/shout grid (jabber strikes are checked against the song's
 * `shouts` lane in the playtest report: report.shoutAlignment).
 *
 * DENSITY (Rayman music levels are relentless): bars 1-4 are the only zero-threat bars. From bar 5
 * on there's a required action at least every 2 beats in the verses and on every beat in the
 * chorus, and verbs mix inside a bar (hop -> strike -> hop, a held jump with a mid-air strike,
 * hop-strike on the same beat from a slam platform). Optional awnings give a harder high route.
 *
 *   cold open   no music; press STRIKE -> bar 0 count-in (HEY! on beat 4)
 *   bars 1-4    INTRO a  lum arcs on the riff (zero threat)                             beats 4-19
 *   bars 5-8    INTRO b  lethal gaps + spikes on 1 & 3, dummies on the backbeats; the chaser rises
 *   bars 9-16   VERSE 1a street rooftops: gaps, spikes, air strikes, first jabbers   checkpoint 36
 *   bars 17-24  VERSE 1b the bar: SLAM PLATFORMS (2 -> 5 -> 8), hop-strikes on them    checkpoint 68
 *   bars 25-32  CHORUS 1 an action on every beat; jabbers on the HEY!s; Hup-Hup-HEY x2 checkpoint 100
 *   bar 33      final hit = finish
 */
import {
  awning,
  gapHop,
  hop,
  hupHupHey,
  jabber,
  jump,
  jumpStrike,
  lumArcHop,
  lumArcJump,
  lumRowSwung,
  pendulum,
  slamRun,
  spikeHop,
} from './dsl';
import type { LevelDef, LevelItem } from './types';

const bar = (n: number, beat = 1) => n * 4 + (beat - 1);

/** a pendulum struck while taking off from a slam platform (hop + strike on the same beat) */
const hopStrike = (beat: number): LevelItem => pendulum(beat);

export const sliceLevel: LevelDef = {
  id: 'slice-bars-0-32',
  name: 'Vertical slice — cold open to Chorus 1',
  songId: 'placeholder-boogie-164',
  pixelsPerBeat: 384,
  startBeat: bar(1),
  endBeat: bar(33),
  coldOpen: true,
  items: [
    { type: 'sky', beat: -100, preset: 'golden' },
    { type: 'camera', beat: -100, zoom: 0.95, beats: 0.01 },

    // ============================================================ INTRO a (bars 1-4): tokens on the riff, zero threat
    { type: 'label', beat: bar(1), text: 'INTRO a — tokens on the riff' },
    { type: 'hint', beat: bar(1), beats: 6, text: 'Hold → to run — top speed IS the beat' },
    lumRowSwung(bar(1, 2), bar(2, 1)),
    hop(bar(2, 1)),
    lumArcHop(bar(2, 1)),
    lumRowSwung(bar(2, 3), bar(2, 4)),
    { type: 'hint', beat: bar(2, 3), beats: 7, text: 'SPACE: tap = hop (1 beat) · hold = big jump (2 beats)' },
    jump(bar(3, 1)),
    lumArcJump(bar(3, 1)),
    hop(bar(3, 3)),
    lumArcHop(bar(3, 3)),
    hop(bar(3, 4)),
    lumArcHop(bar(3, 4)),
    hop(bar(4, 1)),
    lumArcHop(bar(4, 1)),
    { type: 'hint', beat: bar(4, 2), beats: 6, text: 'X: CUE SWING — smash the dummies at the bottom of their swing' },
    pendulum(bar(4, 2)),
    pendulum(bar(4, 4)),

    // ============================================================ INTRO b (bars 5-8): the threats start
    { type: 'chaser', beat: bar(5) },
    { type: 'fx', beat: bar(5), fx: 'zoom', amount: 0.8 },
    { type: 'fx', beat: bar(5), fx: 'shake', amount: 0.4 },
    { type: 'label', beat: bar(5), text: 'INTRO b — the band kicks in' },
    { type: 'hint', beat: bar(5), beats: 5, text: 'The film is BURNING behind you — keep up with the beat!' },
    ...gapHop(bar(5, 1)),
    pendulum(bar(5, 2)),
    ...spikeHop(bar(5, 3)),
    pendulum(bar(5, 4)),
    ...spikeHop(bar(6, 1)),
    pendulum(bar(6, 2)),
    ...jumpStrike(bar(6, 3)), // held jump on 3, strike the HIGH dummy mid-air on 4
    ...gapHop(bar(7, 1)),
    pendulum(bar(7, 2)),
    ...gapHop(bar(7, 3)),
    pendulum(bar(7, 4)),
    ...spikeHop(bar(8, 1)),
    ...spikeHop(bar(8, 2)),
    pendulum(bar(8, 3)),
    pendulum(bar(8, 4), true), // intro-end stab

    // ============================================================ VERSE 1a (bars 9-16): 42nd Street rooftops
    { type: 'checkpoint', beat: bar(9) },
    { type: 'sky', beat: bar(9), preset: 'neon' },
    { type: 'label', beat: bar(9), text: 'VERSE 1a — rooftops' },
    ...spikeHop(bar(9, 2)),
    pendulum(bar(9, 3)),
    ...gapHop(bar(9, 4)),
    { type: 'hint', beat: bar(10), beats: 6, text: 'Goons bow on the "and"… then JAB on the beat — swing first!' },
    ...jumpStrike(bar(10, 1)),
    ...spikeHop(bar(10, 3)),
    jabber(bar(10, 4)),
    ...gapHop(bar(11, 1)),
    ...gapHop(bar(11, 2)),
    jabber(bar(11, 3)),
    ...spikeHop(bar(11, 4)),
    ...jumpStrike(bar(12, 1)),
    jabber(bar(12, 3)),
    ...gapHop(bar(12, 4)), // (hold this one instead to reach the awning above bar 13)
    ...awning(bar(13, 1) - 0.1, bar(14, 1) - 0.6),
    ...spikeHop(bar(13, 1)),
    ...spikeHop(bar(13, 2)),
    jabber(bar(13, 3)),
    pendulum(bar(13, 4)),
    ...jumpStrike(bar(14, 1)),
    ...gapHop(bar(14, 3)),
    jabber(bar(14, 4)),
    ...spikeHop(bar(15, 1)),
    ...gapHop(bar(15, 2)),
    ...spikeHop(bar(15, 3)),
    ...gapHop(bar(15, 4)),
    ...jumpStrike(bar(16, 1)),
    jabber(bar(16, 3)),
    pendulum(bar(16, 4), true), // turnaround stab + HEY!

    // ============================================================ VERSE 1b (bars 17-24): the honky-tonk bar, slam platforms
    { type: 'checkpoint', beat: bar(17) },
    { type: 'sky', beat: bar(17), preset: 'honkytonk' },
    { type: 'ground', beat: bar(17) - 1, style: 'timber' },
    { type: 'label', beat: bar(17), text: 'VERSE 1b — SLAM PLATFORMS' },
    { type: 'hint', beat: bar(17), beats: 8, text: 'Platforms SLAM down on the beat, lift on the "and" — hop on EVERY beat' },
    pendulum(bar(17, 2)),
    jabber(bar(17, 3)),
    ...slamRun(bar(18, 1), 2), // hops 71, 72, 73 -> ledge at 74
    pendulum(bar(18, 3)),
    ...spikeHop(bar(18, 4)),
    jabber(bar(19, 1)),
    ...slamRun(bar(19, 3), 5), // hops 77..82 -> ledge at 83
    hopStrike(bar(20, 1)),
    hopStrike(bar(20, 3)),
    jabber(bar(21, 2)),
    ...spikeHop(bar(21, 3)),
    pendulum(bar(21, 4)),
    ...slamRun(bar(22, 1), 8), // hops 87..95 -> ledge at 96
    hopStrike(bar(22, 3)),
    hopStrike(bar(23, 2)),
    hopStrike(bar(23, 4)),
    jabber(bar(25, 1) - 4),
    ...spikeHop(bar(24, 2)),
    pendulum(bar(24, 3)),
    pendulum(bar(24, 4), true), // turnaround stab + HEY!

    // ============================================================ CHORUS 1 (bars 25-32): something on every beat
    { type: 'checkpoint', beat: bar(25) },
    { type: 'camera', beat: bar(25), zoom: 0.86, beats: 4 },
    { type: 'fx', beat: bar(25), fx: 'flash', amount: 0.4 },
    { type: 'fx', beat: bar(25), fx: 'shake', amount: 0.5 },
    { type: 'label', beat: bar(25), text: 'CHORUS 1' },
    { type: 'hint', beat: bar(25), beats: 6, text: 'Swing at the goons on every HEY!' },
    // C1 hook line 1
    ...spikeHop(bar(25, 2)),
    pendulum(bar(25, 3)),
    ...gapHop(bar(25, 4)), // (hold it to reach the awning over C2)
    ...awning(bar(26, 1) - 0.1, bar(27, 1) - 0.6),
    // C2: stab + HEY on b3, b4
    ...spikeHop(bar(26, 1)),
    pendulum(bar(26, 2)),
    jabber(bar(26, 3)),
    jabber(bar(26, 4)),
    // C3 hook line 2
    ...jumpStrike(bar(27, 1)),
    ...spikeHop(bar(27, 3)),
    pendulum(bar(27, 4)),
    // C4: stab + HEY on b3, b4
    ...gapHop(bar(28, 1)),
    ...spikeHop(bar(28, 2)),
    jabber(bar(28, 3)),
    jabber(bar(28, 4)),
    // C5 stop-time: hit+HEY b1, (silence: your hop is the only sound), hit+HEY b3, (silence)
    jabber(bar(29, 1)),
    ...gapHop(bar(29, 2)),
    pendulum(bar(29, 3), true),
    ...spikeHop(bar(29, 4)),
    // C6: HEY! x4
    pendulum(bar(30, 1)),
    jabber(bar(30, 2)),
    pendulum(bar(30, 3)),
    jabber(bar(30, 4)),
    // C7 + C8: HUP! HUP! HEY!
    { type: 'hint', beat: bar(30, 3), beats: 9, text: 'HUP · HUP · HEY!  hop, hop, SWING — all on the beat = POWER SHOT' },
    ...hupHupHey(bar(31, 1), 'jabber', ['spike', 'gap']),
    ...hupHupHey(bar(32, 1), 'jabber', ['gap', 'spike']),
    ...gapHop(bar(32, 4)), // drum pickup

    // ============================================================ final hit
    { type: 'finish', beat: bar(33) },
    { type: 'fx', beat: bar(33), fx: 'flash', amount: 1 },
    { type: 'fx', beat: bar(33), fx: 'shake', amount: 0.6 },
  ],
};
