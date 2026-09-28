/**
 * Authoring helpers for LevelDef items. Each helper encodes a timing convention so designers
 * can think only in "press X on beat N":
 *
 *   jumpGap(12)        press jump on beat 12, full jump (lands ~beat 14), hole in between
 *   hopSpikes(20)      tap jump on beat 20, short hop over a short spike strip
 *   jumpSpikes(28)     full jump on beat 28 over a longer spike strip
 *   enemy(16)          punch on beat 16
 *   flyer(40.5, 40)    jump on 40, punch the flying enemy on 40.5
 *   slideUnder(37, 38.5) slide (hold down) just before beat 37, stay down until the beam passes
 *
 * The exact margins below were validated with ?autoplay=1 (see `npm run playtest`).
 */
import type { IntendedAction, LevelItem } from './types';

/** Full jump (held 1 beat) airtime is ~2 beats at 150 BPM with the default tunables. */
export function jumpGap(beat: number, beats = 2, hold = 1): LevelItem {
  return { type: 'gap', from: beat + 0.2, to: beat + beats - 0.35, action: { type: 'jump', beat, hold } };
}

export function hopSpikes(beat: number): LevelItem {
  return { type: 'spikes', from: beat + 0.3, to: beat + 0.7, action: { type: 'jump', beat, hold: 0.15 } };
}

export function jumpSpikes(beat: number, len = 1): LevelItem {
  return { type: 'spikes', from: beat + 0.45, to: beat + 0.45 + len, action: { type: 'jump', beat, hold: 1 } };
}

export function enemy(beat: number): LevelItem {
  return { type: 'enemy', beat, kind: 'grunt', action: { type: 'punch', beat } };
}

/** Flying enemy hit in the air: jump on `jumpBeat`, punch on `beat`. */
export function flyer(beat: number, jumpBeat: number, h = 190): LevelItem[] {
  return [
    { type: 'action', action: { type: 'jump', beat: jumpBeat, hold: 1 } },
    { type: 'enemy', beat, kind: 'flyer', h, action: { type: 'punch', beat } },
  ];
}

export function slideUnder(from: number, to: number, lead = 0.3): LevelItem {
  return { type: 'beam', from, to, action: { type: 'slide', beat: from - lead, hold: to - from + lead + 0.3 } };
}

export function jumpUp(beat: number, hold = 1): LevelItem {
  return { type: 'action', action: { type: 'jump', beat, hold } as IntendedAction };
}

export function lumRow(from: number, to: number, every = 0.5, h = 60): LevelItem {
  return { type: 'lumRow', from, to, every, h };
}

export function lumJump(beat: number, hold = 1, every = 0.25): LevelItem {
  return { type: 'lumJump', beat, hold, every, skipFirst: true };
}
