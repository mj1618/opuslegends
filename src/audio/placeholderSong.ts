/**
 * Placeholder track for the vertical slice, synthesized in code (OfflineAudioContext) so the game
 * runs without assets. It mirrors the REAL arrangement's form and grid (DESIGN §7, docs/music):
 * 164 BPM, 4/4, E blues, SHUFFLE (swung 8ths at SWING of the beat), and the stab/shout grid the
 * level is built on. Swap it for the producer's render with songFromBeatmap() (a data change).
 *
 *   bar 0        pickup: cowbell + stomp count-in, gang HEY! on beat 4            (beats 0-3)
 *   bars 1-4     intro: fuzz boogie riff + stomp                                   (4-19)
 *   bars 5-8     intro: + bass, piano, cowbell, full kit                           (20-35)
 *   bars 9-16    verse 1a: melody over the groove, turnaround stab + HEY on 16 b4  (36-67)
 *   bars 17-24   verse 1b: stomp on every beat; A7/B7; stab + HEY on 24 b4         (68-99)
 *   bars 25-32   chorus 1 (DESIGN chorus template C1..C8, melody from the transcription)
 *   bar 33       final hit + ring-out                                             (132-)
 *
 * Stems: main mix (everything but shouts/bonus), 'shouts' (gang HEY!/HUP!, volume = crowd),
 * 'bonus' (organ + harmony lead, faded in during BIG CATCH). Every note is placed via the
 * TempoMap, so onsets land exactly on the (swung) grid (verify with analyzeBeatAlignment / probe).
 */
import type { LaneEvent, SongDef, SongMap } from './song';
import { mtof } from './song';
import type { TempoMap } from './tempoMap';

const BPM = 164;
/** the swung "and" (shuffle). One constant; the level reads it via SongDef.swing. */
export const SWING = 0.67;
const LENGTH_BEATS = 140;
const RENDER_OFFSET = 0.1; // beat 0 is 100 ms into the buffer (exercises the offset path)
/** Chromium's DynamicsCompressorNode look-ahead (~6 ms) — see iteration 0 notes. */
const COMPRESSOR_DELAY = 0.006;
const AUDIO_OFFSET = RENDER_OFFSET + COMPRESSOR_DELAY;
const ROOT = 40; // E2

type Chord = 'E' | 'E7' | 'A7' | 'B7';
const TONES: Record<Chord, number[]> = { E: [0, 4, 7], E7: [0, 4, 7, 10], A7: [5, 9, 12, 15], B7: [7, 11, 14, 17] };
const CHORD_ROOT: Record<Chord, number> = { E: 0, E7: 0, A7: 5, B7: 7 };

/** chord per bar, bars 0..33 */
const BARS: Chord[] = [
  'E', // 0 pickup
  'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', // 1-8 intro
  'E', 'E', 'E', 'E7', 'E', 'E', 'E', 'E', // 9-16 verse 1a
  'A7', 'A7', 'A7', 'A7', 'B7', 'A7', 'B7', 'A7', // 17-24 verse 1b
  'A7', 'E7', 'A7', 'E7', 'A7', 'A7', 'B7', 'E', // 25-32 chorus 1
  'E', // 33 final hit
];

// ---------------------------------------------------------------- the shout / stop grid (the level is built on this)
const SHOUTS: LaneEvent[] = [
  { beat: 3, word: 'HEY' }, // pickup
  { beat: 67, word: 'HEY' }, // verse turnaround (bar 16 b4)
  { beat: 99, word: 'HEY' }, // verse turnaround (bar 24 b4)
  { beat: 106, word: 'HEY' }, { beat: 107, word: 'HEY' }, // C2 b3 b4
  { beat: 114, word: 'HEY' }, { beat: 115, word: 'HEY' }, // C4 b3 b4
  { beat: 116, word: 'HEY' }, { beat: 118, word: 'HEY' }, // C5 stop-time
  { beat: 120, word: 'HEY' }, { beat: 121, word: 'HEY' }, { beat: 122, word: 'HEY' }, { beat: 123, word: 'HEY' }, // C6
  { beat: 124, word: 'HUP' }, { beat: 125, word: 'HUP' }, { beat: 126, word: 'HEY', beats: 2 }, // C7
  { beat: 128, word: 'HUP' }, { beat: 129, word: 'HUP' }, { beat: 130, word: 'HEY' }, // C8
  { beat: 132, word: 'HEY', beats: 2 }, // final hit
];
const STOPS: LaneEvent[] = [
  { beat: 117, beats: 1, kind: 'stop-time' },
  { beat: 119, beats: 1, kind: 'stop-time' },
];
/** band stabs (full-band hits) */
const STABS = [35, 67, 99, 106, 107, 114, 115, 116, 118, 120, 121, 122, 124, 125, 126, 128, 129, 130];

const MAP: SongMap = {
  sections: [
    { name: 'pickup', startBeat: 0, endBeat: 4 },
    { name: 'intro', startBeat: 4, endBeat: 36 },
    { name: 'verse1a', startBeat: 36, endBeat: 68 },
    { name: 'verse1b', startBeat: 68, endBeat: 100 },
    { name: 'chorus1', startBeat: 100, endBeat: 132 },
    { name: 'end', startBeat: 132, endBeat: LENGTH_BEATS },
  ],
  lanes: { shouts: SHOUTS, stops: STOPS, stabs: STABS.map((beat) => ({ beat })) },
};

/**
 * Chorus melody (notes only, from docs/music/transcription.md §5a): [relBeat, midi, durBeats];
 * relBeat 0 = chorus bar 1 beat 1. x.67 = the swung "and".
 */
const E3 = 52, G3 = 55, Gs3 = 56, A3 = 57, As3 = 58, B3 = 59, Fs3 = 54, D3 = 50, Ds3 = 51;
const CHORUS_MELODY: [number, number, number][] = [
  [-1, E3, 0.67], [-0.33, G3, 0.33],
  [0, A3, 1], [1, G3, 0.67], [2, A3, 0.67], [2.67, G3, 0.33], [3, B3, 1],
  [4, Fs3, 0.67], [6.67, Gs3, 0.33], [7, A3, 1],
  [8, A3, 1], [9, A3, 1], [10, A3, 0.67], [10.67, G3, 0.33], [11, B3, 0.67], [11.67, G3, 0.33],
  [12, E3, 1], [14.67, Gs3, 0.33], [15, A3, 1],
  [16, A3, 1], [18, A3, 1], [19, A3, 0.67], [19.67, G3, 0.33],
  [20, A3, 0.67], [21, A3, 0.67], [21.67, G3, 0.33], [22, A3, 0.67], [22.67, G3, 0.33], [23, A3, 0.67], [23.67, G3, 0.33],
  [24, A3, 0.67], [24.67, B3, 0.33], [25, A3, 0.67], [25.67, Ds3, 0.33], [26, G3, 0.67], [26.67, Ds3, 0.33], [27, D3, 0.67], [27.67, E3, 0.33],
  [28, E3, 0.67], [28.67, D3, 0.33], [29, E3, 1], [30, G3, 0.67], [30.67, A3, 0.33], [31, A3, 0.67], [31.67, As3, 0.33],
];

export const placeholderSong: SongDef = {
  id: 'placeholder-boogie-164',
  title: 'Placeholder Boogie (164 shuffle)',
  artist: 'synth',
  tempo: [{ beat: 0, bpm: BPM }],
  beatsPerBar: 4,
  audioOffset: AUDIO_OFFSET,
  lengthBeats: LENGTH_BEATS,
  key: { root: ROOT, scale: [0, 2, 4, 5, 7, 9, 10] },
  harmony: BARS.map((c, bar) => ({ beat: bar * 4, tones: TONES[c] })),
  swing: SWING,
  map: MAP,
  source: { kind: 'synth', render: (song, tempo) => render(song, tempo, 'main') },
  stems: {
    shouts: { kind: 'synth', render: (song, tempo) => render(song, tempo, 'shouts') },
    bonus: { kind: 'synth', render: (song, tempo) => render(song, tempo, 'bonus') },
  },
  stemGains: { shouts: 0.5, bonus: 0 },
};

type Part = 'main' | 'shouts' | 'bonus';

function isStopped(beat: number): boolean {
  return STOPS.some((s) => beat >= s.beat - 1e-6 && beat < s.beat + (s.beats ?? 1) - 1e-6);
}

const SR = 44100;
/** bars per render chunk: OfflineAudioContext cost ~ (live nodes x duration), so small chunks are ~10x faster */
const CHUNK_BARS = 2;
const CHUNK_TAIL = 2.2;
const CHUNK_PRE = 0.3;

/** Render a part in CHUNK_BARS chunks (in parallel) and sum them into one buffer. */
async function render(song: SongDef, tempo: TempoMap, part: Part): Promise<AudioBuffer> {
  const endTime = tempo.beatToTime(song.lengthBeats) + RENDER_OFFSET + 1;
  const total = Math.ceil(endTime * SR);
  const chunks: Promise<{ at: number; buf: AudioBuffer }>[] = [];
  for (let b0 = 0; b0 < BARS.length; b0 += CHUNK_BARS) {
    // chunks start a little early: events exactly at a context's time 0 render unreliably
    const t0 = Math.max(0, tempo.beatToTime(b0 * 4) + RENDER_OFFSET - CHUNK_PRE);
    const len = Math.min(total - Math.floor(t0 * SR), Math.ceil((tempo.beatToTime((b0 + CHUNK_BARS) * 4) - tempo.beatToTime(b0 * 4) + CHUNK_PRE + CHUNK_TAIL + (b0 + CHUNK_BARS >= BARS.length ? 4 : 0)) * SR));
    const at = Math.floor(t0 * SR);
    chunks.push(renderChunk(tempo, part, b0, Math.min(BARS.length, b0 + CHUNK_BARS), at / SR, len).then((buf) => ({ at, buf })));
  }
  const parts = await Promise.all(chunks);
  const out = new AudioBuffer({ numberOfChannels: 2, length: total, sampleRate: SR });
  for (let ch = 0; ch < 2; ch++) {
    const dst = out.getChannelData(ch);
    for (const { at, buf } of parts) {
      const src = buf.getChannelData(ch);
      const n = Math.min(src.length, dst.length - at);
      for (let i = 0; i < n; i++) dst[at + i] += src[i];
    }
  }
  return out;
}

/** Schedule and render bars [barFrom, barTo) of one part; time 0 of the chunk = `chunkT0` in the song buffer. */
async function renderChunk(tempo: TempoMap, part: Part, barFrom: number, barTo: number, chunkT0: number, length: number): Promise<AudioBuffer> {
  const sr = SR;
  const ctx = new OfflineAudioContext(2, Math.max(1, length), sr);
  const T = (beat: number) => tempo.beatToTime(beat) + RENDER_OFFSET - chunkT0;
  const inChunk = (beat: number) => beat >= barFrom * 4 - 1e-6 && beat < barTo * 4 - 1e-6;
  const spb = 60 / BPM;
  const sw = SWING;

  // master chain (same on every stem so the compressor delay matches the beat map offset)
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.1;
  const master = ctx.createGain();
  master.gain.value = 0.8;
  comp.connect(master).connect(ctx.destination);

  const noise = ctx.createBuffer(1, sr, sr);
  const nd = noise.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < nd.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    nd[i] = (seed / 4294967296) * 2 - 1;
  }

  const env = (g: AudioParam, t: number, peak: number, attack: number, decay: number) => {
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const noiseHit = (t: number, filter: BiquadFilterType, freq: number, q: number, peak: number, decay: number, pan = 0) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    env(g.gain, t, peak, 0.001, decay);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    src.connect(f).connect(g).connect(p).connect(comp);
    src.start(Math.max(0, t), (Math.abs(t) * 7.31) % 0.5);
    src.stop(t + decay + 0.05);
  };
  const osc = (t: number, type: OscillatorType, f0: number, f1: number, fdur: number, peak: number, decay: number, dest: AudioNode = comp) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + fdur);
    const g = ctx.createGain();
    env(g.gain, t, peak, 0.002, decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + decay + 0.05);
  };

  // ------------------------------------------------------------ drums
  const kick = (t: number, vel = 1) => {
    osc(t, 'sine', 160, 45, 0.12, 1.0 * vel, 0.36);
    noiseHit(t, 'highpass', 3000, 0.7, 0.1 * vel, 0.012);
  };
  const floorTom = (t: number, vel = 1) => {
    osc(t, 'sine', 110, 70, 0.2, 0.55 * vel, 0.3);
    noiseHit(t, 'lowpass', 900, 0.8, 0.25 * vel, 0.09);
  };
  const stomp = (t: number, vel = 1) => {
    kick(t, vel);
    floorTom(t, vel * 0.9);
    noiseHit(t, 'bandpass', 250, 1.2, 0.35 * vel, 0.08); // wooden boards
  };
  const snare = (t: number, vel = 1) => {
    noiseHit(t, 'highpass', 1200, 0.7, 0.42 * vel, 0.17);
    osc(t, 'triangle', 220, 160, 0.08, 0.3 * vel, 0.1);
  };
  const clap = (t: number, vel = 1) => {
    for (const d of [0, 0.011, 0.022]) noiseHit(t + d, 'bandpass', 1400, 1.4, 0.3 * vel, 0.05, 0.1);
  };
  const hat = (t: number, vel = 1, open = false) => noiseHit(t, 'highpass', 8000, 0.8, 0.085 * vel, open ? 0.2 : 0.035, 0.25);
  const crash = (t: number, vel = 1) => noiseHit(t, 'highpass', 4500, 0.5, 0.22 * vel, 1.6, -0.2);
  const cowbell = (t: number, vel = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 3;
    const g = ctx.createGain();
    env(g.gain, t, 0.22 * vel, 0.001, 0.16);
    f.connect(g).connect(comp);
    for (const fr of [540, 800]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = fr;
      o.connect(f);
      o.start(t);
      o.stop(t + 0.2);
    }
  };

  // ------------------------------------------------------------ pitched
  const shaper = ctx.createWaveShaper();
  {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 5);
    }
    shaper.curve = curve;
  }
  const fuzzBus = ctx.createGain();
  fuzzBus.gain.value = 0.35;
  const fuzzLp = ctx.createBiquadFilter();
  fuzzLp.type = 'lowpass';
  fuzzLp.frequency.value = 2600;
  fuzzBus.connect(shaper).connect(fuzzLp);
  const fuzzOut = ctx.createGain();
  fuzzOut.gain.value = 0.16;
  fuzzLp.connect(fuzzOut).connect(comp);
  const fuzz = (t: number, midi: number, dur: number, vel = 1) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.002);
    // soft release (no gate click off the grid)
    g.gain.setTargetAtTime(0, t + dur * 0.75, dur * 0.18);
    g.connect(fuzzBus);
    for (const det of [-9, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(midi);
      o.detune.value = det;
      o.connect(g);
      o.start(t);
      o.stop(t + dur * 1.9 + 0.02);
    }
  };
  const bass = (t: number, midi: number, dur: number, vel = 1) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(midi);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 5;
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(240, t + Math.min(dur, 0.22));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.002);
    g.gain.setTargetAtTime(0, t + dur * 0.7, dur * 0.2);
    o.connect(f).connect(g).connect(comp);
    o.start(t);
    o.stop(t + dur * 1.9 + 0.02);
  };
  const piano = (t: number, midi: number, dur: number, vel = 1, pan = 0.15) => {
    const g = ctx.createGain();
    env(g.gain, t, 0.07 * vel, 0.003, Math.max(0.15, dur * 1.4));
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(comp);
    for (const [type, det, k] of [['triangle', -14, 1], ['triangle', 14, 1], ['square', 0, 0.25]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(midi);
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = k;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur * 1.4 + 0.1);
    }
  };
  const stab = (t: number, chord: Chord, dur: number, vel = 1) => {
    const r = ROOT + 24 + CHORD_ROOT[chord];
    const tones = TONES[chord].map((x) => x - CHORD_ROOT[chord]);
    for (const tn of tones) fuzz(t, r + tn - 12, dur, 0.5 * vel);
    for (const tn of tones) piano(t, r + tn, dur, 1.3 * vel, -0.2);
  };
  const organ = (t: number, midis: number[], dur: number, vel = 1) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03 * vel, t + 0.02);
    g.gain.setTargetAtTime(0, t + dur * 0.8, dur * 0.12);
    g.connect(comp);
    for (const m of midis)
      for (const [type, mul] of [['sine', 1], ['square', 2]] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = mtof(m) * mul;
        o.connect(g);
        o.start(t);
        o.stop(t + dur * 1.6 + 0.02);
      }
  };

  // ------------------------------------------------------------ gang shout (formant synth)
  const shout = (t: number, word: string, beats: number) => {
    const vowel = word === 'HUP' ? [640, 1190, 2390] : [530, 1840, 2480];
    const dur = word === 'HUP' ? 0.13 : Math.min(0.55, 0.2 + (beats - 1) * 0.3);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + 0.004);
    out.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.15);
    out.connect(comp);
    const src = ctx.createGain();
    src.gain.value = 1;
    const vel = [1, 0.5, 0.3];
    vowel.forEach((fq, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = fq;
      bp.Q.value = 7;
      const g = ctx.createGain();
      g.gain.value = vel[i] * 0.9;
      src.connect(bp).connect(g).connect(out);
    });
    for (const [f0, det] of [[190, -10], [220, 6], [247, -4], [165, 12], [208, 0]]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 1.06, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.94, t + dur);
      o.detune.value = det;
      o.connect(src);
      o.start(t);
      o.stop(t + dur * 1.5 + 0.02);
    }
    // consonant burst (h / p) right on the onset
    noiseHit(t, 'bandpass', 1600, 1, 0.25, 0.03);
  };

  // ============================================================ SCORE
  for (let bar = barFrom; bar < barTo; bar++) {
    const b0 = bar * 4;
    const chord = BARS[bar];
    const r = CHORD_ROOT[chord];
    const pickup = bar === 0;
    const intro1 = bar >= 1 && bar <= 4;
    const intro2 = bar >= 5 && bar <= 8;
    const verseA = bar >= 9 && bar <= 16;
    const verseB = bar >= 17 && bar <= 24;
    const chorus = bar >= 25 && bar <= 32;
    const final = bar === 33;
    const full = intro2 || verseA || verseB || chorus;

    if (part === 'shouts') continue; // shouts are rendered from the SHOUTS lane below

    if (part === 'bonus') {
      if (!full) continue;
      // organ pad (whole bar) + in the chorus a harmony line a 3rd/6th above the melody
      const tones = TONES[chord].slice(0, 3).map((x) => ROOT + 24 + x);
      for (let k = 0; k < 4; k++) if (!isStopped(b0 + k)) organ(T(b0 + k), tones, spb * 0.95, 0.8);
      continue;
    }

    // ---------------- main mix
    if (final) {
      stomp(T(b0), 1.2);
      crash(T(b0), 1.2);
      stab(T(b0), 'E7', spb * 8, 1.1);
      bass(T(b0), ROOT, spb * 7);
      fuzz(T(b0), ROOT, spb * 8, 0.8);
      continue;
    }
    if (pickup) {
      for (let k = 0; k < 4; k++) {
        cowbell(T(k), k === 3 ? 1.2 : 1);
        stomp(T(k), 0.7 + k * 0.1);
      }
      continue;
    }
    if (bar === 1 || bar === 5 || bar === 9 || bar === 17 || bar === 25 || bar === 27) crash(T(b0));

    for (let k = 0; k < 4; k++) {
      const b = b0 + k;
      if (isStopped(b)) continue;
      const isStab = STABS.includes(b);
      // --- drums
      if (intro1) {
        if (k === 0 || k === 2) stomp(T(b));
      } else if (verseB) {
        stomp(T(b), k % 2 === 0 ? 1 : 0.85);
        if (k === 1 || k === 3) snare(T(b), 0.8);
        cowbell(T(b), 0.6);
      } else if (full) {
        if (k === 0 || k === 2) kick(T(b));
        if (k === 1 || k === 3) {
          snare(T(b));
          if (chorus) clap(T(b), 0.7);
        }
        if (intro2 || chorus) cowbell(T(b), 0.55);
      }
      if (full || intro1) {
        hat(T(b), 0.9);
        hat(T(b + sw), 0.6, chorus);
      }
      if (isStab) {
        stab(T(b), chord, spb * (b === 126 ? 1.6 : 0.5), 1);
        kick(T(b), 1.05);
        if (bar === 29 || bar === 30) crash(T(b), 0.6);
      }
      // --- boogie riff (fuzz): swung 8ths 1-3-5-6-b7-6-5-3; lighter in the verse, stabs replace it
      const RIFF = [0, 4, 7, 9, 10, 9, 7, 4];
      if (!isStab && (intro1 || intro2 || (chorus && bar !== 29 && bar !== 30))) {
        fuzz(T(b), ROOT + r + RIFF[k * 2], spb * sw * 0.9, 1);
        fuzz(T(b + sw), ROOT + r + RIFF[k * 2 + 1], spb * (1 - sw) * 0.9, 0.8);
      } else if (!isStab && (verseA || verseB)) {
        // verse: palm-muted root chugs on the beat
        fuzz(T(b), ROOT + r, spb * 0.35, 0.7);
      }
      // --- bass (boogie walk) from bar 5
      if (full && !isStab) {
        bass(T(b), ROOT - 12 + r + [0, 7, 9, 7][k], spb * sw * 0.95);
        bass(T(b + sw), ROOT - 12 + r + [0, 7, 9, 7][k] + (k === 3 ? -1 : 0), spb * (1 - sw) * 0.9, 0.8);
      }
      // --- piano comping on the swung "and"
      if ((intro2 || verseA || verseB || chorus) && !isStab) {
        for (const tn of TONES[chord]) piano(T(b + sw), ROOT + 24 + tn, spb * 0.25, 0.6, 0.3);
      }
    }
    // phrase-end fill (accent on 3.67 then 4) at the end of 4-bar phrases (not where stabs sit)
    if ((bar === 4 || bar === 8 || bar === 12 || bar === 20) && !STABS.includes(b0 + 3)) {
      snare(T(b0 + 2 + sw), 0.9);
      kick(T(b0 + 3));
      snare(T(b0 + 3));
    }
    // drum pickup into the final hit (C8 b4)
    if (bar === 32) {
      for (const d of [0, 1 / 3, 2 / 3]) snare(T(b0 + 3 + d), 0.6 + d * 0.5);
    }

    // --- verse melody (piano): reciting patter on A/B with a G neighbour, cadence to E (docs/music §5b contour)
    if (verseA || verseB) {
      const phraseBar = (bar - 9) % 2;
      const top = chord === 'B7' ? 62 : 59; // peak on the B7 bar (D4)
      const notes: [number, number][] =
        phraseBar === 0
          ? [[0, top], [0.67, 57], [1, top], [1.67, 57], [2, 55], [2.67, 57], [3, top]]
          : [[0, 57], [0.67, 55], [1, 52], [3, 55], [3.67, 57]];
      for (const [rb, m] of notes) if (!STABS.includes(b0 + Math.floor(rb)) || rb % 1 !== 0) piano(T(b0 + rb), m + 12, spb * 0.6, 0.85, -0.1);
    }
  }

  // --- chorus melody: fuzz lead + piano, from the transcription (relBeat 0 = beat 100)
  if (part === 'main' || part === 'bonus') {
    for (const [rb, m, d] of CHORUS_MELODY) {
      const b = 100 + rb;
      if (!inChunk(b)) continue;
      if (part === 'main') {
        fuzz(T(b), m + 12, spb * d * 0.95, 0.9);
        piano(T(b), m + 24, spb * d, 0.9, -0.15);
      } else {
        // harmony a diatonic-ish 3rd above (bonus stem)
        piano(T(b), m + 24 + (m === A3 || m === E3 ? 4 : 3), spb * d, 0.9, 0.3);
      }
    }
  }

  if (part === 'shouts') {
    for (const s of SHOUTS) if (inChunk(s.beat)) shout(T(s.beat), s.word ?? 'HEY', s.beats ?? 1);
  }

  return ctx.startRendering();
}
