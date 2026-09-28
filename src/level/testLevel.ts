/**
 * Placeholder test level (~45 s at 150 BPM) exercising every system: gaps, raised floors,
 * one-way platforms, enemies (ground + flying), spikes, slide-under beams, lums on beats,
 * checkpoints (music rewinds in sync), fx cues and the finish.
 *
 * Authored against placeholderSong's structure: intro bar 0 | A 4-35 | B 36-67 | break 68-83 |
 * B' 84-115 | ending 116-120.
 */
import { enemy, flyer, hopSpikes, jumpGap, jumpSpikes, jumpUp, lumJump, lumRow, slideUnder } from './dsl';
import type { LevelDef } from './types';

export const testLevel: LevelDef = {
  id: 'test',
  name: 'Test Groove',
  songId: 'placeholder-stomp',
  pixelsPerBeat: 384,
  startBeat: 4,
  endBeat: 120,
  items: [
    // ---------------------------------------------------------------- A (4-35)
    { type: 'label', beat: 4, text: 'A: warm-up' },
    lumRow(6, 9.5, 0.5),
    jumpGap(10),
    lumJump(10),
    enemy(14),
    enemy(16),
    hopSpikes(18),
    lumRow(19, 19.5, 0.5),
    jumpGap(20),
    lumJump(20),
    // step up onto a raised section
    jumpUp(24),
    { type: 'floor', from: 24.7, to: 31.25, h: 110 },
    lumJump(24),
    enemy(27),
    jumpSpikes(28),
    lumJump(28),
    // drop back down at 31.25 (run off the edge)
    jumpGap(32),
    lumJump(32),
    enemy(34),
    { type: 'fx', beat: 36, fx: 'zoom', amount: 1 },
    { type: 'fx', beat: 36, fx: 'flash', amount: 0.5 },

    // ---------------------------------------------------------------- B (36-67)
    { type: 'checkpoint', beat: 36 },
    { type: 'label', beat: 36, text: 'B: slide + flyers' },
    slideUnder(38, 39.5),
    lumRow(38, 39.5, 0.5, 30),
    ...flyer(42.5, 42),
    jumpGap(44),
    lumJump(44),
    enemy(46),
    enemy(47),
    enemy(48),
    slideUnder(50, 51),
    lumRow(50, 51, 0.5, 30),
    jumpGap(52),
    lumJump(52),
    // one-way platform over a long pit: jump on 54 onto the platform, jump on 58 off it
    { type: 'gap', from: 54.3, to: 59.8 },
    { type: 'platform', from: 55.3, to: 58.3, h: 120, action: { type: 'jump', beat: 54, hold: 1 } },
    lumRow(56, 58, 0.5),
    jumpUp(58),
    lumJump(58),
    enemy(62),
    hopSpikes(64),
    lumRow(65, 67, 0.5),

    // ---------------------------------------------------------------- breakdown (68-83)
    { type: 'checkpoint', beat: 68 },
    { type: 'label', beat: 68, text: 'Breakdown' },
    { type: 'fx', beat: 68, fx: 'bgPulse', amount: 1 },
    hopSpikes(70),
    hopSpikes(72),
    slideUnder(74.5, 75.5),
    lumRow(74.5, 75.5, 0.5, 30),
    jumpSpikes(76),
    lumJump(76),
    hopSpikes(80),
    enemy(82),

    // ---------------------------------------------------------------- B' (84-115)
    { type: 'fx', beat: 84, fx: 'flash', amount: 0.7 },
    { type: 'fx', beat: 84, fx: 'shake', amount: 0.4 },
    { type: 'checkpoint', beat: 84 },
    { type: 'label', beat: 84, text: "B': finale" },
    jumpGap(84),
    lumJump(84),
    enemy(86),
    enemy(87),
    ...flyer(88.5, 88),
    jumpGap(90),
    lumJump(90),
    slideUnder(93, 94),
    enemy(96),
    enemy(97),
    enemy(98),
    enemy(99),
    jumpGap(100),
    lumJump(100),
    jumpGap(104),
    lumJump(104),
    // staircase up
    jumpUp(108),
    { type: 'floor', from: 108.7, to: 125, h: 100 },
    jumpUp(110),
    { type: 'floor', from: 110.7, to: 125, h: 200 },
    lumJump(110),
    lumRow(112, 115, 0.5),
    { type: 'finish', beat: 116 },
    { type: 'fx', beat: 116, fx: 'flash', amount: 1 },
  ],
};
