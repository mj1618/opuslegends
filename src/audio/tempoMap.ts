/**
 * Tempo map: converts between song time (seconds, 0 = beat 0) and beats.
 * Piecewise-constant tempo: a list of { beat, bpm } change points. Negative beats/times
 * (count-ins before the downbeat) extrapolate using the first segment's tempo.
 */
export interface TempoPoint {
  /** beat at which this tempo starts */
  beat: number;
  bpm: number;
}

interface Segment {
  beat: number;
  time: number;
  spb: number; // seconds per beat
}

export class TempoMap {
  readonly beatsPerBar: number;
  private segs: Segment[];

  constructor(points: TempoPoint[], beatsPerBar = 4) {
    if (points.length === 0) throw new Error('TempoMap needs at least one tempo point');
    const sorted = [...points].sort((a, b) => a.beat - b.beat);
    this.beatsPerBar = beatsPerBar;
    this.segs = [];
    let time = 0;
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i > 0) {
        const prev = this.segs[i - 1];
        time = prev.time + (p.beat - prev.beat) * prev.spb;
      } else {
        // first point defines beat 0 as time 0 even if it starts later
        time = p.beat * (60 / p.bpm);
      }
      this.segs.push({ beat: p.beat, time, spb: 60 / p.bpm });
    }
  }

  static constant(bpm: number, beatsPerBar = 4): TempoMap {
    return new TempoMap([{ beat: 0, bpm }], beatsPerBar);
  }

  private segForBeat(beat: number): Segment {
    const s = this.segs;
    let i = s.length - 1;
    while (i > 0 && s[i].beat > beat) i--;
    return s[i];
  }

  private segForTime(time: number): Segment {
    const s = this.segs;
    let i = s.length - 1;
    while (i > 0 && s[i].time > time) i--;
    return s[i];
  }

  beatToTime(beat: number): number {
    const s = this.segForBeat(beat);
    return s.time + (beat - s.beat) * s.spb;
  }

  timeToBeat(time: number): number {
    const s = this.segForTime(time);
    return s.beat + (time - s.time) / s.spb;
  }

  bpmAtBeat(beat: number): number {
    return 60 / this.segForBeat(beat).spb;
  }

  bpmAtTime(time: number): number {
    return 60 / this.segForTime(time).spb;
  }

  secondsPerBeatAt(beat: number): number {
    return this.segForBeat(beat).spb;
  }

  get points(): TempoPoint[] {
    return this.segs.map((s) => ({ beat: s.beat, bpm: 60 / s.spb }));
  }
}
