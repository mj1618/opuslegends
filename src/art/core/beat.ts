/**
 * BeatInfo: the musical snapshot every art layer / entity draw function receives.
 *
 * The engine fills it each frame from the conductor + beatmap lanes (see src/art/README.md);
 * the art lab fills it from `BeatSim` (a simulated 160 BPM stomp-boogie pattern).
 */
export const INSTRUMENTS = ['kick', 'snare', 'hat', 'cowbell', 'crash', 'bass', 'riff', 'piano', 'hey'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export interface BeatInfo {
  /** seconds (song time, or wall time when no song plays) */
  time: number;
  /** float beat index */
  beat: number;
  /** 0..1 within the current beat */
  beatPhase: number;
  /** float bar index */
  bar: number;
  /** 0..1 within the current bar */
  barPhase: number;
  /** integer beat within the bar 0..3 */
  beatInBar: number;
  bpm: number;
  /** seconds per beat */
  spb: number;
  /** seconds since the last event of each instrument lane (Infinity = none yet) */
  since: Record<Instrument, number>;
  /** running count of events per lane (use to seed per-hit variation) */
  count: Record<Instrument, number>;
  /** 0..1 section energy (quiet verse .4, chorus 1) - scales how hard the world dances */
  energy: number;
}

export function emptyBeat(bpm = 160): BeatInfo {
  const since = {} as Record<Instrument, number>;
  const count = {} as Record<Instrument, number>;
  for (const k of INSTRUMENTS) {
    since[k] = Infinity;
    count[k] = 0;
  }
  return { time: 0, beat: 0, beatPhase: 0, bar: 0, barPhase: 0, beatInBar: 0, bpm, spb: 60 / bpm, since, count, energy: 1 };
}

/** 1 on the event, decaying exponentially with time constant `k` seconds */
export function hit(b: BeatInfo, inst: Instrument, k = 0.12): number {
  const s = b.since[inst];
  return s === Infinity || s < 0 ? 0 : Math.exp(-s / k) * b.energy;
}

/** 1 exactly on each grid point of `every` beats, decaying over `decay` beats */
export function pulse(b: BeatInfo, every = 1, decay = 0.25, phase = 0): number {
  const x = (b.beat - phase) / every;
  const since = (x - Math.floor(x)) * every;
  return Math.exp(-since / decay);
}

/**
 * Simulated band for the art lab: Black-Betty stomp boogie at `bpm`.
 * Patterns are 16 sixteenths per bar (x = hit).
 */
const PATTERNS: Record<Instrument, string[]> = {
  //         1...2...3...4...
  kick: ['x.....x.x.......', 'x.....x.x.....x.'],
  snare: ['....x.......x...'],
  hat: ['x.x.x.x.x.x.x.x.'],
  cowbell: ['x...x...x...x...'],
  crash: ['x...............', '................', '................', '................'],
  bass: ['x.xxx.x.x.xxx.x.'],
  riff: ['x..x..x...x.....', 'x..x..x...x..x..'],
  piano: ['................', '..........xxxxxx'],
  hey: ['................', '........x...x...'],
};

export class BeatSim {
  bpm: number;
  private info = emptyBeat();
  energy = 1;
  constructor(bpm = 160) {
    this.bpm = bpm;
  }

  /** Build the BeatInfo for absolute time t (seconds since beat 0). Pure w.r.t. t. */
  at(t: number): BeatInfo {
    const b = this.info;
    const spb = 60 / this.bpm;
    const beat = t / spb;
    b.time = t;
    b.bpm = this.bpm;
    b.spb = spb;
    b.beat = beat;
    b.beatPhase = beat - Math.floor(beat);
    b.bar = beat / 4;
    b.barPhase = b.bar - Math.floor(b.bar);
    b.beatInBar = Math.floor(beat) % 4;
    b.energy = this.energy;
    const step = spb / 4;
    const cur = Math.floor(t / step);
    for (const inst of INSTRUMENTS) {
      const pats = PATTERNS[inst];
      const patLen = pats.length * 16;
      let found = -1;
      for (let k = 0; k < patLen; k++) {
        const s = cur - k;
        if (s < 0) break;
        const bar = Math.floor(s / 16);
        const p = pats[bar % pats.length];
        if (p[s % 16] === 'x') {
          found = s;
          break;
        }
      }
      if (found < 0) {
        b.since[inst] = Infinity;
        b.count[inst] = 0;
      } else {
        b.since[inst] = t - found * step;
        // count = number of events so far (approx: events per full pattern * cycles + partial)
        let perCycle = 0;
        for (const p of pats) for (const ch of p) if (ch === 'x') perCycle++;
        const cycles = Math.floor(found / patLen);
        let partial = 0;
        const inCycle = found % patLen;
        for (let s = 0; s <= inCycle; s++) if (pats[Math.floor(s / 16)][s % 16] === 'x') partial++;
        b.count[inst] = cycles * perCycle + partial;
      }
    }
    return b;
  }
}
