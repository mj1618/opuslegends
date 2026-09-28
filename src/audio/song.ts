/**
 * Song definition = audio source + BEAT MAP (tempo points, offset of beat 0 in the file,
 * key/harmony for musically-quantized SFX).
 *
 * Two source kinds:
 *   - 'synth': rendered in code (OfflineAudioContext) — the placeholder track.
 *   - 'file' : an ogg/mp3/wav URL (put it in /public and reference it relatively, e.g.
 *              'audio/song.ogg', so it works under any hosting sub-path). The beat map must
 *              then be authored: `audioOffset` = seconds into the file where beat 0 lands,
 *              `tempo` = tempo points. Use the debug beat-alignment tool (see
 *              analyzeBeatAlignment) to check the beat map against the audio's onsets.
 */
import type { TempoPoint } from './tempoMap';
import { TempoMap } from './tempoMap';

export interface MusicalKey {
  /** MIDI note of the tonic, e.g. 52 = E3 */
  root: number;
  /** scale as semitone offsets from the tonic, e.g. natural minor [0,2,3,5,7,8,10] */
  scale: number[];
}

export interface ChordSpan {
  /** beat where this chord starts (lasts until the next span) */
  beat: number;
  /** chord tones as semitone offsets from the key root, e.g. [0,3,7] */
  tones: number[];
}

export type SongSource =
  | { kind: 'file'; url: string }
  | { kind: 'synth'; render: (song: SongDef, tempo: TempoMap) => Promise<AudioBuffer> };

export interface SongDef {
  id: string;
  title: string;
  artist?: string;
  tempo: TempoPoint[];
  beatsPerBar: number;
  /** seconds into the audio buffer where beat 0 occurs */
  audioOffset: number;
  /** musical length (beats) — the conductor keeps counting past the end of the audio */
  lengthBeats: number;
  key: MusicalKey;
  harmony?: ChordSpan[];
  source: SongSource;
}

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  minorPentatonic: [0, 3, 5, 7, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
} as const;

export function makeTempoMap(song: SongDef): TempoMap {
  return new TempoMap(song.tempo, song.beatsPerBar);
}

export async function loadSongBuffer(song: SongDef, ctx: BaseAudioContext, tempo: TempoMap): Promise<AudioBuffer> {
  if (song.source.kind === 'synth') return song.source.render(song, tempo);
  const res = await fetch(song.source.url);
  if (!res.ok) throw new Error(`Failed to load song ${song.source.url}: ${res.status}`);
  const data = await res.arrayBuffer();
  return ctx.decodeAudioData(data);
}

/** Chord tones active at `beat` (falls back to the tonic triad of the key). */
export function chordAt(song: SongDef, beat: number): number[] {
  const h = song.harmony;
  if (!h || h.length === 0) return [song.key.scale[0], song.key.scale[2 % song.key.scale.length], song.key.scale[4 % song.key.scale.length]];
  let cur = h[0];
  for (const span of h) {
    if (span.beat <= beat) cur = span;
    else break;
  }
  return cur.tones;
}

/**
 * Musically quantized note for collectibles: the `index`-th note of an ascending run over the
 * chord tones active at `beat` (so lum chains arpeggiate the current chord), starting an octave
 * above the key root. Returns a MIDI note number.
 */
export function collectibleNote(song: SongDef, beat: number, index: number): number {
  const tones = [...new Set(chordAt(song, beat).map((t) => ((t % 12) + 12) % 12))].sort((a, b) => a - b);
  const n = tones.length;
  const octave = Math.floor(index / n);
  const wrapped = octave % 2; // climb two octaves then wrap
  const t = tones[index % n];
  return song.key.root + 24 + t + 12 * wrapped;
}

/** MIDI -> Hz */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Offline check of a beat map against audio content: for each beat, finds the strongest
 * transient onset within ±`windowSec` and reports its deviation (+ = audio is late vs the map).
 * Useful when authoring beat maps for real songs; on the synthesized track it is ~0-1 ms.
 * Heuristic: assumes the loudest transient near each beat is on the beat.
 */
export function analyzeBeatAlignment(
  buffer: AudioBuffer,
  tempo: TempoMap,
  audioOffset: number,
  fromBeat: number,
  toBeat: number,
  windowSec = 0.06,
): { beats: number; meanAbsMs: number; maxAbsMs: number; meanMs: number } {
  const sr = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  // Transient detector: first difference (a crude high-pass that emphasizes attacks: kick
  // beaters, snares, hats) -> energy in ~1.5 ms windows.
  const hop = 8;
  const win = Math.max(8, Math.round(sr * 0.0015));
  const lp = new Float32Array(data.length);
  for (let i = 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    lp[i] = d * d;
  }
  const errs: number[] = [];
  const energyAt = (s: number) => {
    let e = 0;
    for (let i = s; i < s + win; i++) e += lp[i];
    return e;
  };
  for (let b = Math.ceil(fromBeat); b <= toBeat; b++) {
    const t = tempo.beatToTime(b) + audioOffset;
    const s0 = Math.floor((t - windowSec) * sr);
    const s1 = Math.floor((t + windowSec) * sr);
    if (s0 < 0 || s1 + win >= data.length) continue;
    // find the energy peak in the window, then walk back to where energy first rose above 30%
    // (the loudest transient near the beat is assumed to be the beat)
    let peak = 0;
    let peakS = s0;
    const env: number[] = [];
    for (let s = s0; s <= s1; s += hop) {
      const e = energyAt(s);
      env.push(e);
      if (e > peak) {
        peak = e;
        peakS = s;
      }
    }
    let k = (peakS - s0) / hop;
    while (k > 0 && env[k - 1] > peak * 0.3) k--;
    // window [s, s+win) crosses 30% when ~30% of it overlaps the onset
    const onset = (s0 + k * hop + win * 0.7) / sr;
    errs.push((onset - t) * 1000);
  }
  if (errs.length === 0) return { beats: 0, meanAbsMs: NaN, maxAbsMs: NaN, meanMs: NaN };
  const abs = errs.map(Math.abs);
  const r = (x: number) => Math.round(x * 100) / 100;
  return {
    beats: errs.length,
    meanAbsMs: r(abs.reduce((s, v) => s + v, 0) / abs.length),
    maxAbsMs: r(Math.max(...abs)),
    meanMs: r(errs.reduce((s, v) => s + v, 0) / errs.length),
  };
}
