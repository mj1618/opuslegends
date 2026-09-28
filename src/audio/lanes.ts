/**
 * Typed, queryable beat-map LANES — what the level (and art) code reads to put gameplay on the
 * music. Every event has `beat` (fractional song beat, on the tempo map; the edit's beat 0 = bar 1
 * beat 1). Get one from a song: `song.lane('snare').between(96, 128)`.
 *
 *   const snares = jimEdit.lane('snare').between(bar(9), bar(17)).filter((e) => e.backbeat);
 *   const hook = jimEdit.lane('hooks').where((h) => h.name === 'hookA').at(116, 1);
 *   const held = jimEdit.lane('sustains').active(141.5);          // spans covering a beat
 *   const walk = jimEdit.lane('bassWalks').next(120);              // first event after beat 120
 *   jimEdit.energyAt(200);                                         // 0..1 intensity of that bar
 *
 * Lanes of the original recording (docs/music/original_edit.md §2; spans have `endBeat`):
 *   kick, snare, tom   exact drum hits (fractional beat; kick/snare `pos` on|and|trip, snare `backbeat`)
 *   fills              phrase-end drum fills: span + `accents` (beats) + `strength`
 *   bass               bass notes (`pitch` MIDI, `durBeats`)
 *   bassWalks          the signature figures (walkdown, walk-ups, climbs): span + `name` + `notes`
 *   vocalPhrases       sung phrase spans (no words): `section`, `phrase`
 *   sustains           held vocal notes >= ~1 beat: span + `pitch`
 *   melody             the vocal line as notes (`pitch`, `durBeats`)
 *   hooks              hookA (title line / walkdown), hookB (tag), line1, versePeak: span + `name`
 *   bassOut            stop-time runs (bass lays out): span + `beats`
 *   stops              whole-band stops (`beats`, `kind`); the edit's only one is its ending
 *   energy             one per bar: `intensity` 0..1, `mixDb`, per-stem dB, `drumHits`
 *   cue                landmarks (`name`: section starts, final_hit, ...)
 *   shouts             OVERLAY gang HEY!/HUP! (`word`)      stomps, claps, cowbell: OVERLAY hits
 *   splices            the edit's cut points
 * The placeholder song only has shouts + stops. Unknown lane names return an empty lane.
 */

export interface LaneEventBase {
  /** fractional song beat */
  beat: number;
  /** song seconds (producer's value; the engine's tempo.beatToTime(beat) agrees) */
  t?: number;
  vel?: number;
  [k: string]: unknown;
}

/** events that last: [beat, endBeat) */
export interface SpanEvent extends LaneEventBase {
  endBeat: number;
  durBeats?: number;
}

export interface DrumHit extends LaneEventBase {
  vel: number;
  /** where the hit sits in the beat: on the beat, the swung "and", or a triplet position */
  pos?: 'on' | 'and' | 'trip';
  accent?: boolean;
  /** snare on beats 2/4 */
  backbeat?: boolean;
}
export interface Fill extends SpanEvent {
  strength: number;
  /** accent beats (the hits + the landing beat) */
  accents: number[];
  songBar?: number;
}
export interface BassNote extends LaneEventBase {
  pitch: number;
  durBeats: number;
}
export interface BassWalk extends SpanEvent {
  name: string;
  desc?: string;
  notes: { beat: number; t?: number; pitch: number; durBeats: number; detected: boolean }[];
}
export interface VocalPhrase extends SpanEvent {
  section: string;
  phrase: number;
}
export interface Sustain extends SpanEvent {
  /** sung MIDI note (+12 for a lead-guitar octave) */
  pitch: number;
}
export interface MelodyNote extends LaneEventBase {
  pitch: number;
  durBeats: number;
  section?: string;
}
export interface Hook extends SpanEvent {
  name: 'hookA' | 'hookB' | 'line1' | 'versePeak' | (string & {});
  desc?: string;
  priority?: number;
}
export interface BassOut extends SpanEvent {
  beats: number;
}
export interface Stop extends LaneEventBase {
  beats: number;
  kind?: string;
}
export interface BarEnergy extends LaneEventBase {
  /** 0..1, follow it for difficulty ramps */
  intensity: number;
  mixDb: number;
  drumHits: number;
  drumsDb?: number;
  bassDb?: number;
  guitarDb?: number;
  pianoDb?: number;
  vocalsDb?: number;
  songBar?: number;
}
export interface Cue extends LaneEventBase {
  name: string;
}
export interface Shout extends LaneEventBase {
  word: string;
}
export interface OverlayHit extends LaneEventBase {
  vel: number;
}

/** lane name -> event type */
export interface LaneTypes {
  kick: DrumHit;
  snare: DrumHit;
  tom: DrumHit;
  fills: Fill;
  bass: BassNote;
  bassWalks: BassWalk;
  vocalPhrases: VocalPhrase;
  sustains: Sustain;
  melody: MelodyNote;
  hooks: Hook;
  bassOut: BassOut;
  stops: Stop;
  energy: BarEnergy;
  cue: Cue;
  shouts: Shout;
  stomps: OverlayHit;
  claps: OverlayHit;
  cowbell: OverlayHit;
  splices: LaneEventBase;
}
export type LaneName = keyof LaneTypes;

const EPS = 1e-6;

/** A sorted, read-only lane with musical queries. All beats are song beats. */
export class Lane<E extends LaneEventBase = LaneEventBase> implements Iterable<E> {
  readonly name: string;
  /** events sorted by beat */
  readonly events: readonly E[];

  constructor(name: string, events: readonly E[]) {
    this.name = name;
    this.events = [...events].sort((a, b) => a.beat - b.beat);
  }

  get length(): number {
    return this.events.length;
  }

  [Symbol.iterator](): Iterator<E> {
    return this.events[Symbol.iterator]();
  }

  /** index of the first event with beat >= b */
  private lowerBound(b: number): number {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].beat < b - EPS) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** events with from <= beat < to */
  between(from: number, to: number): E[] {
    const out: E[] = [];
    for (let i = this.lowerBound(from); i < this.events.length && this.events[i].beat < to - EPS; i++) out.push(this.events[i]);
    return out;
  }

  /** events in (0-based) bar `bar`, i.e. beats [bar*bpb, (bar+1)*bpb) */
  inBar(bar: number, beatsPerBar = 4): E[] {
    return this.between(bar * beatsPerBar, (bar + 1) * beatsPerBar);
  }

  /** the event nearest to `beat` within ±tol beats (undefined if none) */
  at(beat: number, tol = 0.05): E | undefined {
    const e = this.nearest(beat);
    return e && Math.abs(e.beat - beat) <= tol + EPS ? e : undefined;
  }

  nearest(beat: number): E | undefined {
    const i = this.lowerBound(beat);
    const a = this.events[i - 1];
    const b = this.events[i];
    if (!a) return b;
    if (!b) return a;
    return beat - a.beat <= b.beat - beat ? a : b;
  }

  /** first event strictly after `beat` */
  next(beat: number): E | undefined {
    for (let i = this.lowerBound(beat); i < this.events.length; i++) if (this.events[i].beat > beat + EPS) return this.events[i];
    return undefined;
  }

  /** last event strictly before `beat` */
  prev(beat: number): E | undefined {
    const i = this.lowerBound(beat) - 1;
    return i >= 0 ? this.events[i] : undefined;
  }

  /** span events covering `beat` (beat <= b < endBeat; point events: none) */
  active(beat: number): E[] {
    return this.events.filter((e) => typeof e.endBeat === 'number' && e.beat <= beat + EPS && beat < (e.endBeat as number) - EPS);
  }

  /** a filtered lane (same queries) */
  where(pred: (e: E) => boolean): Lane<E> {
    return new Lane(this.name, this.events.filter(pred));
  }

  /** events within ±tol beats of the quarter-note grid (integer beats) */
  onBeat(tol = 0.08): Lane<E> {
    return this.where((e) => Math.abs(e.beat - Math.round(e.beat)) <= tol);
  }

  beats(): number[] {
    return this.events.map((e) => e.beat);
  }
}
