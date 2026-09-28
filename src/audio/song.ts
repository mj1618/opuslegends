/**
 * Song definition = audio source (+ optional synced STEMS) + BEAT MAP (tempo points, offset of
 * beat 0 in the file, swing, key/harmony for musically-quantized SFX, and event LANES such as
 * shouts/stops/sections in the producer's `beatmap.json` shape — see songFromBeatmap()).
 *
 * Two source kinds:
 *   - 'synth': rendered in code (OfflineAudioContext) — the placeholder track.
 *   - 'file' : an ogg/mp3/wav URL (put it in /public and reference it relatively, e.g.
 *              'audio/song.ogg', so it works under any hosting sub-path). The beat map must
 *              then be authored: `audioOffset` = seconds into the file where beat 0 lands,
 *              `tempo` = tempo points. Use the debug beat-alignment tool (see
 *              analyzeBeatAlignment) to check the beat map against the audio's onsets.
 */
import { Lane, type BarEnergy, type LaneEventBase, type LaneName, type LaneTypes } from './lanes';
import type { TempoPoint } from './tempoMap';
import { TempoMap } from './tempoMap';

export { Lane } from './lanes';
export type * from './lanes';

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

/** One event in a beatmap lane (schema 'opuslegends.beatmap/1', tools/music). Extra fields pass through. */
export interface LaneEvent {
  beat: number;
  /** shouts: HEY / HUP / ... */
  word?: string;
  /** stops: length in beats */
  beats?: number;
  pitch?: number;
  durBeats?: number;
  [k: string]: unknown;
}

export interface SongSection {
  name: string;
  label?: string;
  startBeat: number;
  endBeat: number;
}

/** Musical event map of the arrangement (the gameplay-relevant part of beatmap.json). */
export interface SongMap {
  sections: SongSection[];
  /** lanes by name: shouts, stops, kick, snare, cowbell, riff, melody, ... */
  lanes: Record<string, LaneEvent[]>;
}

/** The plain data of a song (what placeholderSong / songFromBeatmap provide); see defineSong(). */
export interface SongData {
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
  /**
   * Swing RATIO: where the off-beat 8th ("and") lands within the beat, 0.5 (straight) .. 0.75;
   * 0.667 = triplet shuffle, the original recording measures 0.659. Everything that sits on an "and"
   * (slam lifts, jabber bows, 8th lum rows) reads THIS value (beatmap `audio.swingRatio`).
   */
  swing: number;
  /** event lanes / sections (shouts, stops...) — levels can validate their action beats against it */
  map?: SongMap;
  source: SongSource;
  /** extra stems played sample-aligned with the main source; gains driven by gameplay (crowd) */
  stems?: Record<string, SongSource>;
  /** initial stem gains (linear), default 1 */
  stemGains?: Record<string, number>;
  /** bar number of beat 0 in this song's own numbering (default 1: the edit's bar 1 = beat 0; placeholder 0 = pickup) */
  firstBar?: number;
}

/**
 * A song: its data + typed queries over the beat map (build with defineSong()).
 *   song.lane('snare').between(96, 128)        typed lane events (audio/lanes.ts)
 *   song.section('chorus1') / sectionAt(beat)  section spans
 *   song.energyAt(beat)                        bar intensity 0..1 (energy lane)
 *   song.barBeat(9, 3)                         beat of bar 9, beat 3 in the song's bar numbering
 */
export interface SongDef extends SongData {
  lane<K extends LaneName>(name: K): Lane<LaneTypes[K]>;
  lane(name: string): Lane<LaneEventBase>;
  section(name: string): SongSection | undefined;
  sectionAt(beat: number): SongSection | undefined;
  /** energy-lane intensity (0..1) of the bar containing `beat`; undefined if the song has no energy lane */
  energyAt(beat: number): number | undefined;
  /** first beat of `bar` (+ beatInBar - 1), in the song's own bar numbering (firstBar) */
  barBeat(bar: number, beatInBar?: number): number;
}

/** Attach the lane/section queries to song data (lanes are built once, lazily). */
export function defineSong(data: SongData): SongDef {
  const cache = new Map<string, Lane<LaneEventBase>>();
  const lane = (name: string): Lane<LaneEventBase> => {
    let l = cache.get(name);
    if (!l) {
      l = new Lane(name, (data.map?.lanes[name] ?? []) as LaneEventBase[]);
      cache.set(name, l);
    }
    return l;
  };
  const sections = () => data.map?.sections ?? [];
  const song: SongDef = {
    ...data,
    lane: lane as SongDef['lane'],
    section: (name) => sections().find((x) => x.name === name),
    sectionAt: (beat) => sections().find((x) => beat >= x.startBeat - 1e-6 && beat < x.endBeat - 1e-6),
    energyAt: (beat) => {
      const e = (lane('energy') as Lane<BarEnergy>).prev(beat + 1e-6);
      return e ? e.intensity : undefined;
    },
    barBeat: (bar, beatInBar = 1) => (bar - (data.firstBar ?? 1)) * data.beatsPerBar + (beatInBar - 1),
  };
  return song;
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

async function loadSource(src: SongSource, song: SongDef, ctx: BaseAudioContext, tempo: TempoMap): Promise<AudioBuffer> {
  if (src.kind === 'synth') return src.render(song, tempo);
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`Failed to load audio ${src.url}: ${res.status}`);
  const data = await res.arrayBuffer();
  return ctx.decodeAudioData(data);
}

export async function loadSongBuffer(song: SongDef, ctx: BaseAudioContext, tempo: TempoMap): Promise<AudioBuffer> {
  return loadSource(song.source, song, ctx, tempo);
}

/** Load every stem (in parallel). Missing stems are skipped with a console warning. */
export async function loadSongStems(song: SongDef, ctx: BaseAudioContext, tempo: TempoMap): Promise<Record<string, AudioBuffer>> {
  const out: Record<string, AudioBuffer> = {};
  const entries = Object.entries(song.stems ?? {});
  await Promise.all(
    entries.map(async ([name, src]) => {
      try {
        out[name] = await loadSource(src, song, ctx, tempo);
      } catch (e) {
        console.warn(`stem ${name} failed to load`, e);
      }
    }),
  );
  return out;
}

/** Beats of all events in a lane (optionally filtered by `word`). */
export function laneBeats(song: SongDef, lane: string, word?: string): number[] {
  const l = song.map?.lanes[lane] ?? [];
  return l.filter((e) => word === undefined || e.word === word).map((e) => e.beat);
}

/**
 * Build a SongDef from the producer's beatmap.json (schema 'opuslegends.beatmap/1', see
 * tools/music/README.md). `baseUrl` = folder of the audio files (relative URL, e.g. 'audio/jim/').
 * The main mix is `audio.files.mix` (or the first file); other files become stems (base/lead/
 * shouts/bonus). Swapping the real song in = fetch the JSON, call this, point Game.song at it.
 */
export function songFromBeatmap(json: BeatmapJson, baseUrl: string): SongDef {
  const files = json.audio?.files ?? {};
  const fileUrl = (f: unknown): string => baseUrl + (typeof f === 'string' ? f : String((f as { path?: string; file?: string }).path ?? (f as { file?: string }).file ?? ''));
  const names = Object.keys(files);
  const mainName = names.includes('mix') ? 'mix' : names.includes('base') && names.length > 1 ? 'base' : names[0];
  const stems: Record<string, SongSource> = {};
  for (const n of names) if (n !== mainName && n !== 'mix') stems[n] = { kind: 'file', url: fileUrl(files[n]) };
  // if a full mix exists and stems exist, play the stems instead of the mix (so gains work)
  const useStems = mainName === 'mix' && Object.keys(stems).length > 0 && 'base' in stems;
  const main: SongSource = useStems ? stems.base : { kind: 'file', url: fileUrl(files[mainName]) };
  if (useStems) delete stems.base;
  const sections: SongSection[] = (json.sections ?? []).map((x) => ({ name: x.name, label: x.label, startBeat: x.startBeat, endBeat: x.endBeat }));
  return defineSong({
    id: json.song.id,
    title: json.song.title,
    artist: json.song.artist,
    tempo: json.song.tempo,
    beatsPerBar: json.song.beatsPerBar,
    audioOffset: json.song.audioOffset,
    lengthBeats: json.song.lengthBeats,
    key: json.song.key,
    harmony: json.song.harmony,
    swing: swingRatioOf(json),
    map: { sections, lanes: (json.lanes ?? {}) as Record<string, LaneEvent[]> },
    source: main,
    stems,
    firstBar: 1,
  });
}

/** Valid swing ratios: 0.5 = straight 8ths, 0.667 = triplet shuffle, 0.75 = dotted-8th + 16th. */
export const SWING_MIN = 0.5;
export const SWING_MAX = 0.75;

/**
 * The beatmap's swing as SongDef.swing = where the off-beat 8th ("and") lands within the beat.
 * Schema: `audio.swingRatio` in [0.5, 0.75]. Legacy maps had a bare `audio.swing` that some
 * producers filled with the DSL's swing AMOUNT (1.02 = triplet) instead of the ratio; it is only
 * accepted when it is a valid ratio. `audio.swingAmount` (1.0 = triplet) is converted as a fallback.
 */
export function swingRatioOf(json: BeatmapJson): number {
  const a = json.audio ?? {};
  const ok = (v: unknown): v is number => typeof v === 'number' && v >= SWING_MIN && v <= SWING_MAX;
  if (ok(a.swingRatio)) return a.swingRatio;
  if (a.swingRatio !== undefined) console.warn(`beatmap ${json.song.id}: audio.swingRatio ${a.swingRatio} outside [${SWING_MIN}, ${SWING_MAX}] — ignored`);
  if (ok(a.swing)) return a.swing;
  if (typeof a.swingAmount === 'number') {
    const r = 0.5 + a.swingAmount / 6;
    if (ok(r)) return r;
  }
  if (a.swing !== undefined) console.warn(`beatmap ${json.song.id}: legacy audio.swing ${a.swing} is not a ratio in [${SWING_MIN}, ${SWING_MAX}] — ignored`);
  return SWING_MIN;
}

/** The subset of beatmap.json the game reads. */
export interface BeatmapJson {
  schema?: string;
  song: {
    id: string;
    title: string;
    artist?: string;
    tempo: TempoPoint[];
    beatsPerBar: number;
    audioOffset: number;
    lengthBeats: number;
    key: MusicalKey;
    harmony?: ChordSpan[];
  };
  audio?: {
    /** off-beat 8th position within the beat, 0.5..0.75 (-> SongDef.swing) */
    swingRatio?: number;
    /** the producer DSL's swing amount (1.0 = triplet shuffle); informational */
    swingAmount?: number;
    /** LEGACY, ambiguous (ratio in some maps, amount in others): read only if it is a valid ratio */
    swing?: number;
    files?: Record<string, unknown>;
  };
  sections?: { name: string; label?: string; startBeat: number; endBeat: number }[];
  lanes?: Record<string, LaneEvent[]>;
}

/**
 * Map a straight-time beat position onto the swung grid: the straight "and" (x.5) lands on
 * x + swing; positions in between are stretched piecewise-linearly.
 */
export function swingBeat(beat: number, swing: number): number {
  const k = Math.floor(beat);
  const f = beat - k;
  return f < 0.5 ? k + f * 2 * swing : k + swing + (f - 0.5) * 2 * (1 - swing);
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

/** Result of analyzeBeatAlignment (ms; + = the audio is late vs the beat map). */
export interface BeatAlignment {
  beats: number;
  /** median error over all beats: the robust offset of the map vs the audio (the pass criterion) */
  medianMs: number;
  meanMs: number;
  meanAbsMs: number;
  maxAbsMs: number;
  /** medians on beats 1 & 3 vs 2 & 4 (a live drummer's laid-back backbeat shows up as 2/4 > 1/3) */
  beats13Ms: number;
  beats24Ms: number;
  /** largest |median| over 8-bar blocks: catches a tempo map that drifts off the recording */
  blockMedianMaxMs: number;
}

/**
 * Offline check of a beat map against audio content: for each beat, finds the strongest
 * transient within ±`windowSec` and measures where its attack STARTS (10 % of its energy peak;
 * later points on the rise are biased late on a full mix, whose peak includes the bass/guitar
 * swell) — + = audio is late vs the map. A live recording scatters around its smoothed grid
 * (laid-back backbeat, pushed fills, strums that speak early), so judge it by the ROBUST numbers:
 * `medianMs` (offset) and `blockMedianMaxMs` (drift), not the per-beat mean |error|.
 * The edit of the original: median ~0 ms, 8-bar medians within ±5 ms, mean |err| ~11 ms.
 * On the synthesized placeholder everything is ~0-1 ms.
 */
export function analyzeBeatAlignment(
  buffer: AudioBuffer,
  tempo: TempoMap,
  audioOffset: number,
  fromBeat: number,
  toBeat: number,
  windowSec = 0.06,
  skip?: (beat: number) => boolean,
): BeatAlignment {
  const sr = buffer.sampleRate;
  // mono sum: a 1972 stereo mix pans the kit (the left channel alone is 60 ms off in the outro)
  const data = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) data[i] += ch[i];
  }
  // Transient detector: first difference (a crude high-pass that emphasizes attacks: kick
  // beaters, snares, hats) -> energy in ~1.5 ms windows (prefix sums).
  const hop = 8;
  const win = Math.max(8, Math.round(sr * 0.0015));
  const THR = 0.1;
  const P = new Float64Array(data.length + 1);
  for (let i = 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    P[i + 1] = P[i] + d * d;
  }
  const found: { b: number; err: number; peak: number }[] = [];
  for (let b = Math.ceil(fromBeat); b <= toBeat; b++) {
    if (skip?.(b)) continue;
    const t = tempo.beatToTime(b) + audioOffset;
    const s0 = Math.floor((t - windowSec) * sr);
    const s1 = Math.floor((t + windowSec) * sr);
    if (s0 < 0 || s1 + win >= data.length) continue;
    let peak = 0;
    let peakS = s0;
    const env: number[] = [];
    for (let s = s0; s <= s1; s += hop) {
      const e = P[s + win] - P[s];
      env.push(e);
      if (e > peak) {
        peak = e;
        peakS = s;
      }
    }
    if (peak <= 0) continue;
    let k = (peakS - s0) / hop;
    while (k > 0 && env[k - 1] > peak * THR) k--;
    // window [s, s+win) crosses THR of a step onset when (1-THR) of it precedes the onset
    const onset = (s0 + k * hop + win * (1 - THR)) / sr;
    found.push({ b, err: (onset - t) * 1000, peak });
  }
  // beats without a real transient (ring-outs, fades, silence) aren't measurements
  const peaks = found.map((f) => f.peak).sort((x, y) => x - y);
  const floor = 0.05 * (peaks[Math.floor(peaks.length / 2)] ?? 0);
  const kept = found.filter((f) => f.peak >= floor);
  const errs = kept.map((f) => f.err);
  const beatsOf = kept.map((f) => f.b);
  const nan = NaN;
  if (errs.length === 0) return { beats: 0, medianMs: nan, meanMs: nan, meanAbsMs: nan, maxAbsMs: nan, beats13Ms: nan, beats24Ms: nan, blockMedianMaxMs: nan };
  const r = (x: number) => Math.round(x * 100) / 100;
  const median = (a: number[]) => {
    if (a.length === 0) return NaN;
    const s = [...a].sort((x, y) => x - y);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const bpb = tempo.beatsPerBar;
  const inBar = (b: number) => ((b % bpb) + bpb) % bpb;
  let blockMax = 0;
  const block = 8 * bpb;
  for (let i = 0; i < errs.length; i += block) blockMax = Math.max(blockMax, Math.abs(median(errs.slice(i, i + block))));
  const abs = errs.map(Math.abs);
  return {
    beats: errs.length,
    medianMs: r(median(errs)),
    meanMs: r(errs.reduce((s, v) => s + v, 0) / errs.length),
    meanAbsMs: r(abs.reduce((s, v) => s + v, 0) / abs.length),
    maxAbsMs: r(Math.max(...abs)),
    beats13Ms: r(median(errs.filter((_, i) => inBar(beatsOf[i]) % 2 === 0))),
    beats24Ms: r(median(errs.filter((_, i) => inBar(beatsOf[i]) % 2 === 1))),
    blockMedianMaxMs: r(blockMax),
  };
}

/** Is `beat` inside a whole-band stop (the `stops` lane: no band onsets there)? */
export function inStop(song: SongDef, beat: number): boolean {
  for (const e of song.map?.lanes.stops ?? []) if (beat >= e.beat - 1e-6 && beat < e.beat + (e.beats ?? 1) - 1e-6) return true;
  return false;
}

/** analyzeBeatAlignment over the whole song, skipping the band's stops (e.g. the edit's ending). */
export function beatAlignmentForSong(buffer: AudioBuffer, song: SongDef, tempo: TempoMap): BeatAlignment {
  return analyzeBeatAlignment(buffer, tempo, song.audioOffset, 1, song.lengthBeats - 1, 0.06, (b) => inStop(song, b));
}
