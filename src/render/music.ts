/**
 * MusicFeed: turns the song's beat map (SongDef.map lanes + sections) into the art toolkit's
 * per-frame `BeatInfo` (src/art/core/beat.ts) so every art layer can dance to the REAL song.
 *
 *   const feed = new MusicFeed(song, tempo);
 *   const b = feed.update(groove);          // once per frame, after the Groove is set
 *   hit(b, 'snare')                         // 1 on each snare, decaying (x section energy)
 *   feed.accent / feed.accentStrength       // seconds since the last BIG hit (stab / fill / section / hook)
 *   feed.section / feed.chorus / feed.energy
 *
 * Lanes (first one present in the song wins, else a beat-grid fallback so the world still dances):
 *   kick <- kick | stomps (grid: 1 & 3)       snare <- snare | claps (grid: 2 & 4)
 *   hat <- hat | hats (grid: swung 8ths)      cowbell <- cowbell (grid: every beat)
 *   bass <- bass (grid: every beat)           riff <- riff | tom | fills (grid: 1 + swung 2-and)
 *   piano <- piano | stabs | hooks            crash <- crash, else derived: section starts, fill ends, 8-bar lines
 *   hey <- shouts
 * Energy per bar: `energy` lane (`intensity`) > section.energy > section-name heuristic; smoothed across the bar.
 * When no song plays (title screen) everything free-runs from the grid.
 */
import { type BeatInfo, INSTRUMENTS, type Instrument, emptyBeat } from '../art/core/beat';
import type { LaneEvent, SongDef, SongSection } from '../audio/song';
import type { TempoMap } from '../audio/tempoMap';
import type { Groove } from './groove';

const SOURCES: Record<Instrument, string[]> = {
  kick: ['kick', 'stomps'],
  snare: ['snare', 'claps'],
  hat: ['hat', 'hats'],
  cowbell: ['cowbell'],
  crash: ['crash', 'crashes'],
  bass: ['bass'],
  riff: ['riff', 'tom', 'fills'],
  piano: ['piano', 'stabs', 'hooks'],
  hey: ['shouts'],
};

interface Track {
  beats: Float64Array;
  times: Float64Array;
  /** true = came from the song map, false = grid fallback */
  real: boolean;
}

interface Accent {
  beat: number;
  time: number;
  strength: number;
}

export function sectionEnergy(s: SongSection | undefined): number {
  if (!s) return 0.7;
  const e = (s as unknown as { energy?: number }).energy;
  if (typeof e === 'number' && e > 0) return Math.min(1, Math.max(0.3, e));
  const n = s.name.toLowerCase();
  if (/chorus|drop|final|climax/.test(n)) return 1;
  if (/tag|turn|hook/.test(n)) return 0.9;
  if (/pre|build|walk|climb/.test(n)) return 0.8;
  if (/verse/.test(n)) return 0.62;
  if (/break|stop|vamp/.test(n)) return 0.55;
  if (/intro|pickup|cold/.test(n)) return 0.5;
  if (/end|outro/.test(n)) return 0.7;
  return 0.7;
}

export class MusicFeed {
  readonly info: BeatInfo = emptyBeat(160);
  private tracks = {} as Record<Instrument, Track>;
  private accents: Accent[] = [];
  private barEnergy: number[] = [];
  private sections: SongSection[];
  /** seconds since the last BIG accent (Infinity = none yet) */
  accent = Infinity;
  /** strength 0..1 of the last big accent */
  accentStrength = 0;
  /** running count of big accents (edge detection) */
  accentCount = 0;
  /** current section (undefined before the first) */
  section: SongSection | undefined;
  /** beats since the current section started */
  sectionBeat = 0;
  /** true inside a chorus-like section (zoom-out, full spectacle) */
  chorus = false;
  /** smoothed 0..1 energy of the current bar */
  energy = 0.7;
  /** true when the lane came from the real song map */
  realLanes: Partial<Record<Instrument, boolean>> = {};

  constructor(
    private song: SongDef,
    tempo: TempoMap,
  ) {
    const lanes = song.map?.lanes ?? {};
    this.sections = [...(song.map?.sections ?? [])].sort((a, b) => a.startBeat - b.startBeat);
    const len = Math.max(song.lengthBeats, 8) + 64;
    const swing = song.swing > 0.5 && song.swing < 0.95 ? song.swing : 0.5;
    const bpb = song.beatsPerBar || 4;
    const grid = (every: number, offs: number[]): number[] => {
      const out: number[] = [];
      for (let b = 0; b < len; b += every) for (const o of offs) out.push(b + o);
      return out;
    };
    const fallback: Record<Instrument, () => number[]> = {
      kick: () => grid(2, [0]),
      snare: () => grid(2, [1]),
      hat: () => grid(1, [0, swing]),
      cowbell: () => grid(1, [0]),
      crash: () => [],
      bass: () => grid(1, [0]),
      riff: () => grid(bpb, [0, 1 + swing]),
      piano: () => [],
      hey: () => [],
    };
    const pick = (inst: Instrument): { beats: number[]; real: boolean } => {
      for (const name of SOURCES[inst]) {
        const l = lanes[name];
        if (l && l.length) {
          // fills: use every accent inside the fill (tom hits), not only its start
          const beats: number[] = [];
          for (const e of l) {
            const acc = (e as LaneEvent & { accents?: number[] }).accents;
            if (Array.isArray(acc) && acc.length) beats.push(...acc);
            else beats.push(e.beat);
          }
          return { beats, real: true };
        }
      }
      return { beats: fallback[inst](), real: false };
    };
    // big accents: stabs, fill ends, hook starts, crashes, section starts
    const acc: { beat: number; strength: number }[] = [];
    for (const e of lanes.stabs ?? []) acc.push({ beat: e.beat, strength: 0.9 });
    for (const e of lanes.crash ?? lanes.crashes ?? []) acc.push({ beat: e.beat, strength: 1 });
    for (const e of lanes.fills ?? []) {
      const end = typeof e.endBeat === 'number' ? (e.endBeat as number) : e.beat;
      acc.push({ beat: Math.round(end), strength: 0.6 + 0.4 * (typeof e.strength === 'number' ? (e.strength as number) : 0.7) });
    }
    for (const e of lanes.hooks ?? []) acc.push({ beat: e.beat, strength: 0.75 + 0.25 * (1 - Math.min(4, Number(e.priority ?? 3)) / 4) });
    for (const s of this.sections) if (s.startBeat > 0) acc.push({ beat: s.startBeat, strength: sectionEnergy(s) });
    acc.sort((a, b) => a.beat - b.beat);
    // merge accents closer than a quarter beat (keep the strongest)
    for (const a of acc) {
      const last = this.accents[this.accents.length - 1];
      if (last && a.beat - last.beat < 0.25) {
        last.strength = Math.max(last.strength, a.strength);
        continue;
      }
      this.accents.push({ beat: a.beat, time: tempo.beatToTime(a.beat), strength: a.strength });
    }
    for (const inst of INSTRUMENTS) {
      let { beats, real } = pick(inst);
      if (inst === 'crash') {
        // no crash lane: crash on every big accent >= 0.85 and every 8-bar line
        beats = this.accents.filter((a) => a.strength >= 0.85).map((a) => a.beat);
        for (let b = 0; b < len; b += bpb * 8) beats.push(b);
      }
      beats = [...new Set(beats.map((b) => Math.round(b * 1000) / 1000))].sort((a, b) => a - b);
      const times = new Float64Array(beats.length);
      beats.forEach((b, i) => (times[i] = tempo.beatToTime(b)));
      this.tracks[inst] = { beats: Float64Array.from(beats), times, real };
      this.realLanes[inst] = real;
    }
    // per-bar energy
    const bars = Math.ceil(len / bpb);
    const lane = lanes.energy ?? [];
    for (let i = 0; i < bars; i++) this.barEnergy.push(sectionEnergy(this.sectionAt(i * bpb + 0.01)));
    if (lane.length) {
      // intensity is loudness-ish (0..1): blend it with the section's role so verses still breathe
      for (const e of lane) {
        const k = Math.floor(e.beat / bpb + 1e-3);
        const v = typeof e.intensity === 'number' ? (e.intensity as number) : NaN;
        if (k >= 0 && k < bars && Number.isFinite(v)) this.barEnergy[k] = Math.min(1, Math.max(0.3, 0.5 * this.barEnergy[k] + 0.5 * v * 1.15));
      }
    }
  }

  sectionAt(beat: number): SongSection | undefined {
    let cur: SongSection | undefined;
    for (const s of this.sections) {
      if (beat + 1e-6 < s.startBeat) break;
      cur = s;
    }
    return cur;
  }

  /** 0..1 energy at a beat (smoothed from the per-bar values) */
  energyAt(beat: number): number {
    const bpb = this.song.beatsPerBar || 4;
    const x = Math.max(0, beat / bpb);
    const i = Math.floor(x);
    const a = this.barEnergy[Math.min(this.barEnergy.length - 1, i)] ?? 0.7;
    const b = this.barEnergy[Math.min(this.barEnergy.length - 1, i + 1)] ?? a;
    const f = x - i;
    // hold the bar's value, ease into the next one over the last beat
    const k = f < 0.75 ? 0 : (f - 0.75) / 0.25;
    return a + (b - a) * k * k;
  }

  /** index of the last element <= v (binary search), -1 if none */
  private static last(arr: Float64Array, v: number): number {
    let lo = 0;
    let hi = arr.length - 1;
    let r = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (arr[m] <= v) {
        r = m;
        lo = m + 1;
      } else hi = m - 1;
    }
    return r;
  }

  update(g: Groove): BeatInfo {
    const b = this.info;
    const beat = g.beat;
    const spb = g.secondsPerBeat > 0 ? g.secondsPerBeat : 0.37;
    const bpb = g.beatsPerBar || 4;
    b.time = g.time;
    b.beat = beat;
    b.beatPhase = beat - Math.floor(beat);
    b.bar = beat / bpb;
    b.barPhase = b.bar - Math.floor(b.bar);
    b.beatInBar = ((Math.floor(beat) % bpb) + bpb) % bpb;
    b.spb = spb;
    b.bpm = 60 / spb;
    if (g.playing) {
      // song time: exact lane lookups on the audio clock
      const t = g.time;
      for (const inst of INSTRUMENTS) {
        const tr = this.tracks[inst];
        const i = MusicFeed.last(tr.times, t + 1e-4);
        b.since[inst] = i < 0 ? Infinity : Math.max(0, t - tr.times[i]);
        b.count[inst] = i + 1;
      }
      const ai = this.accents.length ? MusicFeed.lastAccent(this.accents, t + 1e-4) : -1;
      this.accent = ai < 0 ? Infinity : t - this.accents[ai].time;
      this.accentStrength = ai < 0 ? 0 : this.accents[ai].strength;
      this.accentCount = ai + 1;
      this.section = this.sectionAt(beat);
      this.energy = this.energyAt(beat);
    } else {
      // free-run (menus): a plain stomp-boogie grid
      const sw = this.song.swing > 0.5 && this.song.swing < 0.95 ? this.song.swing : 0.5;
      const since = (every: number, phase = 0) => {
        const x = (beat - phase) / every;
        return (x - Math.floor(x)) * every * spb;
      };
      const cnt = (every: number, phase = 0) => Math.floor((beat - phase) / every);
      b.since.kick = since(2);
      b.count.kick = cnt(2);
      b.since.snare = since(2, 1);
      b.count.snare = cnt(2, 1);
      const ph = b.beatPhase;
      b.since.hat = (ph >= sw ? ph - sw : ph) * spb;
      b.count.hat = Math.floor(beat) * 2 + (ph >= sw ? 1 : 0);
      b.since.cowbell = b.since.bass = since(1);
      b.count.cowbell = b.count.bass = cnt(1);
      b.since.riff = since(bpb);
      b.count.riff = cnt(bpb);
      b.since.crash = since(bpb * 8);
      b.count.crash = cnt(bpb * 8);
      b.since.piano = b.since.hey = Infinity;
      this.accent = Infinity;
      this.accentStrength = 0;
      this.section = undefined;
      this.energy = 0.6;
    }
    b.energy = Math.max(0.35, this.energy);
    this.chorus = !!this.section && /chorus|drop|final|tag/i.test(this.section.name);
    this.sectionBeat = this.section ? beat - this.section.startBeat : 0;
    return b;
  }

  private static lastAccent(arr: Accent[], t: number): number {
    let lo = 0;
    let hi = arr.length - 1;
    let r = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (arr[m].time <= t) {
        r = m;
        lo = m + 1;
      } else hi = m - 1;
    }
    return r;
  }
}
