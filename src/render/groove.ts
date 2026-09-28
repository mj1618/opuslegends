/**
 * Groove: per-frame snapshot of musical position for BEAT-REACTIVE PRESENTATION.
 *
 * Anything that should "dance" reads the shared `groove` instead of the conductor:
 *   groove.pulse(1)        1.0 on every beat, decaying (default 0.25 beat)
 *   groove.pulse(4, 0.5)   bar pulse with a longer tail
 *   groove.pulse(1, .2, 1) backbeat-only pulse if combined with every=2 (phase 1)
 *   groove.bounce(1)       |sin| bounce, 0 on the beat and 1 halfway (feet-on-beat hopping)
 *   groove.wave(2)         smooth sine with a 2-beat period
 *   applyBeatReact(spec)   declarative version for level data (BeatReactSpec)
 *
 * When no song is playing (title screen) the groove free-runs from a wall clock at the
 * song's tempo so menus still pulse.
 */
import type { BeatReactSpec } from '../level/types';

export class Groove {
  /** song time (s) */
  time = 0;
  /** float beat */
  beat = 0;
  secondsPerBeat = 0.4;
  beatsPerBar = 4;
  playing = false;

  set(time: number, beat: number, spb: number, beatsPerBar: number, playing: boolean): void {
    this.time = time;
    this.beat = beat;
    this.secondsPerBeat = spb;
    this.beatsPerBar = beatsPerBar;
    this.playing = playing;
  }

  /** beats elapsed since the last grid point of size `every` (offset by `phase`) */
  since(every = 1, phase = 0): number {
    const x = (this.beat - phase) / every;
    return (x - Math.floor(x)) * every;
  }

  /** 1 exactly on each grid point, decaying exponentially (decay in beats). */
  pulse(every = 1, decay = 0.25, phase = 0): number {
    return Math.exp(-this.since(every, phase) / decay);
  }

  /** 0 on the grid point, 1 halfway between (use for hops that touch down on the beat). */
  bounce(every = 1, phase = 0): number {
    return Math.abs(Math.sin((Math.PI * (this.beat - phase)) / every));
  }

  /** sine wave with period `every` beats, in [-1, 1] */
  wave(every = 2, phase = 0): number {
    return Math.sin((2 * Math.PI * (this.beat - phase)) / every);
  }

  get bar(): number {
    return this.beat / this.beatsPerBar;
  }

  get beatInBar(): number {
    const b = this.beat % this.beatsPerBar;
    return b < 0 ? b + this.beatsPerBar : b;
  }
}

export interface BeatReactResult {
  sx: number;
  sy: number;
  dy: number;
  flash: number;
}

const tmp: BeatReactResult = { sx: 1, sy: 1, dy: 0, flash: 0 };

/** Evaluate a declarative BeatReactSpec. Returns a shared object (copy if you need to keep it). */
export function applyBeatReact(spec: BeatReactSpec, g: Groove, phaseOffset = 0): BeatReactResult {
  const p = g.pulse(spec.every, spec.decay ?? 0.25, (spec.phase ?? 0) + phaseOffset);
  tmp.sx = 1;
  tmp.sy = 1;
  tmp.dy = 0;
  tmp.flash = 0;
  switch (spec.kind) {
    case 'scale':
      tmp.sx = tmp.sy = 1 + spec.amount * p;
      break;
    case 'squash':
      tmp.sx = 1 + spec.amount * p;
      tmp.sy = 1 - spec.amount * p;
      break;
    case 'bob':
      tmp.dy = -spec.amount * (1 - g.bounce(spec.every, (spec.phase ?? 0) + phaseOffset));
      break;
    case 'flash':
      tmp.flash = spec.amount * p;
      break;
  }
  return tmp;
}
