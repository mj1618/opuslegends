/**
 * Placeholder track, synthesized in code with an OfflineAudioContext so sync can be tested
 * without any asset: 150 BPM, E minor, 4/4, a driving drum+bass rock groove with chord stabs.
 * Every note is placed via the TempoMap, so kicks land exactly on beats (verify with
 * analyzeBeatAlignment). Swap for a real song by providing a SongDef with source.kind='file'.
 *
 * Structure (bars of 4 beats):
 *   bar 0        intro / count-in (kick + hats + riser)
 *   bars 1-8     A  : drums + bass
 *   bars 9-16    B  : + stabs + open hats
 *   bars 17-20   breakdown: half-time drums, sustained bass
 *   bars 21-28   B' : everything + arpeggio lead
 *   bar 29-30    ending hits, final crash at beat 120
 */
import type { SongDef } from './song';
import { mtof } from './song';
import type { TempoMap } from './tempoMap';

const BPM = 150;
const LENGTH_BEATS = 124;
const RENDER_OFFSET = 0.1; // notes are scheduled so beat 0 is 100 ms into the buffer (exercises the offset path)
/**
 * Chromium's DynamicsCompressorNode has a fixed ~6 ms look-ahead delay, so the rendered audio
 * lands 6 ms after the scheduled note times. The beat map's audioOffset must include it —
 * analyzeBeatAlignment measured exactly this (+6.5 ms) before the correction.
 */
const COMPRESSOR_DELAY = 0.006;
const AUDIO_OFFSET = RENDER_OFFSET + COMPRESSOR_DELAY;
const ROOT = 40; // E2

// Chords per bar (semitones from E): Em, C, D, B
const PROG: number[][] = [
  [0, 3, 7],
  [8, 12, 15],
  [10, 14, 17],
  [7, 11, 14],
];

export const placeholderSong: SongDef = {
  id: 'placeholder-stomp',
  title: 'Placeholder Stomp',
  artist: 'synth',
  tempo: [{ beat: 0, bpm: BPM }],
  beatsPerBar: 4,
  audioOffset: AUDIO_OFFSET,
  lengthBeats: LENGTH_BEATS,
  key: { root: ROOT, scale: [0, 2, 3, 5, 7, 8, 10] },
  harmony: Array.from({ length: Math.ceil(LENGTH_BEATS / 4) }, (_, bar) => ({ beat: bar * 4, tones: PROG[bar % 4] })),
  source: { kind: 'synth', render: renderPlaceholder },
};

type Section = 'intro' | 'A' | 'B' | 'break' | 'B2' | 'end' | 'none';
function sectionOfBar(bar: number): Section {
  if (bar < 1) return 'intro';
  if (bar <= 8) return 'A';
  if (bar <= 16) return 'B';
  if (bar <= 20) return 'break';
  if (bar <= 28) return 'B2';
  if (bar <= 30) return 'end';
  return 'none';
}

async function renderPlaceholder(song: SongDef, tempo: TempoMap): Promise<AudioBuffer> {
  const sr = 44100;
  const endTime = tempo.beatToTime(song.lengthBeats) + RENDER_OFFSET + 2.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(endTime * sr), sr);
  const T = (beat: number) => tempo.beatToTime(beat) + RENDER_OFFSET;
  const spb = 60 / BPM;

  // master chain
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.1;
  const master = ctx.createGain();
  master.gain.value = 0.8;
  comp.connect(master).connect(ctx.destination);

  // shared white noise
  const noise = ctx.createBuffer(1, sr, sr);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

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
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  };

  const kick = (t: number, vel = 1) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1.0 * vel, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(comp);
    o.start(t);
    o.stop(t + 0.4);
    noiseHit(t, 'highpass', 3000, 0.7, 0.12 * vel, 0.012);
  };
  const snare = (t: number, vel = 1) => {
    noiseHit(t, 'highpass', 1200, 0.7, 0.45 * vel, 0.18);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    const g = ctx.createGain();
    env(g.gain, t, 0.35 * vel, 0.001, 0.1);
    o.connect(g).connect(comp);
    o.start(t);
    o.stop(t + 0.15);
  };
  const hat = (t: number, open: boolean, vel = 1) => noiseHit(t, 'highpass', 8000, 0.8, (open ? 0.12 : 0.09) * vel, open ? 0.22 : 0.035, 0.25);
  const crash = (t: number) => noiseHit(t, 'highpass', 4500, 0.5, 0.22, 1.6, -0.2);

  const bass = (t: number, midi: number, dur: number, vel = 1) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(midi);
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = mtof(midi - 12);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(260, t + Math.min(dur, 0.25));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.005);
    g.gain.setValueAtTime(0.32 * vel, t + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur);
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    o.connect(f);
    o2.connect(g2).connect(f);
    f.connect(g).connect(comp);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.02);
    o2.stop(t + dur + 0.02);
  };

  const stab = (t: number, midis: number[], dur: number, vel = 1, pan = 0) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    f.connect(g).connect(p).connect(comp);
    for (const m of midis) {
      for (const det of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
  };

  const lead = (t: number, midi: number, dur: number) => {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = mtof(midi);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 3000;
    const g = ctx.createGain();
    env(g.gain, t, 0.05, 0.004, dur);
    o.connect(f).connect(g).connect(comp);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  // riser in the intro bar
  {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(300, T(0));
    f.frequency.exponentialRampToValueAtTime(6000, T(4));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T(0));
    g.gain.exponentialRampToValueAtTime(0.25, T(3.9));
    g.gain.linearRampToValueAtTime(0, T(4));
    src.connect(f).connect(g).connect(comp);
    src.start(T(0));
    src.stop(T(4.05));
  }

  const bassPattern = [0, 0, 12, 0, 0, 0, 12, 7];
  const totalBars = Math.ceil(song.lengthBeats / 4);
  for (let bar = 0; bar < totalBars; bar++) {
    const sec = sectionOfBar(bar);
    if (sec === 'none') break;
    const b0 = bar * 4;
    const chord = PROG[bar % 4];
    const root = ROOT + chord[0];
    const sectionStart = bar === 1 || bar === 9 || bar === 21;
    if (sectionStart) crash(T(b0));

    if (sec === 'end') {
      // ending: hits on 1 and 2.5 of bar 29, final crash + chord at beat 120
      if (bar === 29) {
        for (const hb of [0, 1.5, 3]) {
          kick(T(b0 + hb));
          stab(T(b0 + hb), [ROOT + 24, ROOT + 31, ROOT + 36], 0.2 * spb * 4);
          bass(T(b0 + hb), ROOT + 12, spb * 0.6);
        }
        snare(T(b0 + 3.5));
        snare(T(b0 + 3.75));
      } else {
        kick(T(b0), 1.1);
        crash(T(b0));
        stab(T(b0), [ROOT + 24, ROOT + 31, ROOT + 36, ROOT + 39], spb * 6);
        bass(T(b0), ROOT, spb * 6);
      }
      continue;
    }

    for (let beat = 0; beat < 4; beat++) {
      const b = b0 + beat;
      // kick
      if (sec === 'break') {
        if (beat === 0) kick(T(b));
      } else {
        kick(T(b), beat === 0 ? 1 : 0.9);
      }
      // snare
      if (sec !== 'intro' && sec !== 'break' && (beat === 1 || beat === 3)) snare(T(b));
      if (sec === 'break' && beat === 2) snare(T(b)); // half-time backbeat
      // hats (8ths)
      if (sec !== 'break' || beat % 2 === 1) {
        hat(T(b), false);
        hat(T(b + 0.5), sec === 'B' || sec === 'B2', 0.8);
      }
    }
    if (sec === 'B' || sec === 'B2' || sec === 'break') kick(T(b0 + 2.5), 0.7);

    // snare fill at the end of each 4-bar phrase before a section change
    if (bar === 8 || bar === 16 || bar === 20 || bar === 28) {
      for (let i = 0; i < 4; i++) snare(T(b0 + 3 + i * 0.25), 0.5 + i * 0.15);
    }

    // bass
    if (sec === 'A' || sec === 'B' || sec === 'B2') {
      for (let i = 0; i < 8; i++) bass(T(b0 + i * 0.5), root + bassPattern[i], spb * 0.45, i % 2 === 0 ? 1 : 0.8);
    } else if (sec === 'break') {
      bass(T(b0), root, spb * 3.8);
    }

    // stabs
    if (sec === 'B' || sec === 'B2') {
      const pc = [root + 24, root + 31, root + 36];
      stab(T(b0), pc, spb * 0.35, 1, -0.3);
      stab(T(b0 + 1.5), pc, spb * 0.35, 0.9, 0.3);
      if (bar % 2 === 1) stab(T(b0 + 3), pc, spb * 0.3, 0.8, 0);
    }
    if (sec === 'break') {
      stab(T(b0), [root + 24, ROOT + 24 + chord[1], ROOT + 24 + chord[2]], spb * 3.5, 0.6);
    }

    // arpeggio lead in B'
    if (sec === 'B2') {
      const tones = [chord[0], chord[1], chord[2], chord[0] + 12];
      for (let i = 0; i < 8; i++) lead(T(b0 + i * 0.5), ROOT + 36 + tones[(i * 3) % 4], spb * 0.4);
    }
  }

  return ctx.startRendering();
}
