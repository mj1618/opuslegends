/**
 * Offline mix lab: renders the REAL game audio graph (AudioSystem: booth + headroom trim + limiter +
 * soft clip; Conductor: record + overlay stem buses with their EQ/clip; StageAudio: grade/miss/stumble
 * SFX, FULL HOUSE cheers) in an OfflineAudioContext, driven by a scripted clock. Run by mixlab.mjs,
 * which saves 4-channel float WAVs (ch 0-1 = master out, ch 2-3 = pre-limiter) for tools/music/mix_report.py.
 */
import { AudioSystem } from '../audioSystem';
import { Conductor } from '../conductor';
import { loadSongBuffer, loadSongStems, makeTempoMap } from '../song';
import { jimEdit } from '../songs';
import { StageAudio, type StageClock, type StageGrade } from '../stage';

export interface LabEvent {
  beat: number;
  crowd?: number;
  grade?: StageGrade;
  miss?: boolean;
  stumble?: boolean;
  checkpoint?: boolean;
}

export interface Scenario {
  name: string;
  from: number;
  to: number;
  /** crowd at the start (instant) */
  crowd: number;
  events?: LabEvent[];
  /** stems to leave out ('record' = the recording) */
  mute?: string[];
  /** replace the record with a test tone (click test) */
  tone?: boolean;
  /** run StageAudio.beatTick every beat (gap cheers) */
  ticks?: boolean;
  /** drop the stage SFX (click test: only the music moves) */
  nosfx?: boolean;
}

const SR = 48000;
const song = jimEdit;
const tempo = makeTempoMap(song);
let cache: { buf: AudioBuffer; stems: Record<string, AudioBuffer> } | null = null;

async function assets(): Promise<{ buf: AudioBuffer; stems: Record<string, AudioBuffer> }> {
  if (cache) return cache;
  const dec = new OfflineAudioContext(2, SR, SR);
  const [buf, stems] = await Promise.all([loadSongBuffer(song, dec, tempo), loadSongStems(song, dec, tempo)]);
  cache = { buf, stems };
  return cache;
}

function toneBuffer(ctx: BaseAudioContext, secs: number): AudioBuffer {
  const b = ctx.createBuffer(2, Math.ceil(secs * SR), SR);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = 0.25 * Math.sin((2 * Math.PI * 220 * i) / SR) + 0.12 * Math.sin((2 * Math.PI * 1320 * i) / SR + c);
  }
  return b;
}

export async function render(sc: Scenario): Promise<{ sr: number; channels: string[]; meta: Record<string, unknown> }> {
  const { buf, stems } = await assets();
  const lead = 0.1;
  const t0 = tempo.beatToTime(sc.from);
  const dur = tempo.beatToTime(sc.to) - t0 + lead + 0.5;
  const ctx = new OfflineAudioContext(4, Math.ceil(dur * SR), SR);
  ctx.destination.channelCount = 4;
  ctx.destination.channelInterpretation = 'discrete';
  const audio = new AudioSystem(false, ctx);
  await audio.calibrate();
  // master (post-limiter, stereo) -> ch 0-1; pre-limiter (after the trim) -> ch 2-3
  const outMerge = ctx.createChannelMerger(4);
  const postSplit = ctx.createChannelSplitter(2);
  const preSplit = ctx.createChannelSplitter(2);
  audio.master.disconnect();
  audio.master.connect(postSplit);
  audio.trim.connect(preSplit);
  postSplit.connect(outMerge, 0, 0);
  postSplit.connect(outMerge, 1, 1);
  preSplit.connect(outMerge, 0, 2);
  preSplit.connect(outMerge, 1, 3);
  outMerge.connect(ctx.destination);

  const cond = new Conductor(ctx as unknown as AudioContext, audio.music, song, tempo);
  cond.outputDelay = audio.outputDelay;
  const mute = new Set(sc.mute ?? []);
  cond.buffer = sc.tone ? toneBuffer(ctx, tempo.beatToTime(sc.to) + song.audioOffset + 2) : mute.has('record') ? null : buf;
  cond.stems = Object.fromEntries(Object.entries(stems).filter(([k]) => !mute.has(k)));
  let now = 0;
  const clock: StageClock = {
    graphBeat: () => tempo.timeToBeat(now - cond.ctxTimeAtSongTime(0)),
    ctxAtBeat: (b) => cond.ctxTimeAtSongTime(tempo.beatToTime(b)),
    now: () => now,
    secondsPerBeat: (b) => tempo.secondsPerBeatAt(b),
    beatsPerBar: tempo.beatsPerBar,
  };
  cond.filmDelay = audio.filmDelay;
  const stage = new StageAudio({
    ctx,
    booth: audio.booth,
    sfxOut: sc.nosfx ? ctx.createGain() : audio.sfx,
    song,
    clock,
    setOverlays: (n, when, instant) => cond.setCrowdLevel(n, instant, when),
  });
  await stage.load();
  if (sc.nosfx) audio.booth.muteBed();
  cond.play(t0, lead, 0.005);
  stage.setCrowd(sc.crowd, true);

  const evs = [...(sc.events ?? [])];
  if (sc.ticks) for (let b = Math.ceil(sc.from); b < sc.to; b++) evs.push({ beat: b });
  const at = (e: LabEvent): number => (e.miss ? 0.135 : e.grade ? -0.02 : e.crowd !== undefined ? -0.015 : 0);
  evs.sort((a, b) => a.beat + at(a) / 0.37 - (b.beat + at(b) / 0.37));
  for (const e of evs) {
    now = clock.ctxAtBeat(e.beat) + at(e);
    if (e.grade) stage.onGrade(e.grade, e.beat);
    if (e.miss) stage.onMiss(e.beat);
    if (e.stumble) stage.onStumble();
    if (e.checkpoint) stage.onCheckpoint();
    if (e.crowd !== undefined) stage.setCrowd(e.crowd);
    if (!e.grade && !e.miss && !e.stumble && !e.checkpoint && e.crowd === undefined) stage.beatTick(e.beat);
  }
  const out = await ctx.startRendering();
  const channels: string[] = [];
  for (let c = 0; c < 4; c++) {
    const d = out.getChannelData(c);
    const u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    channels.push(btoa(s));
  }
  return {
    sr: SR,
    channels,
    meta: {
      name: sc.name,
      from: sc.from,
      to: sc.to,
      // song time at output sample 0: pre-limiter channels (film delay only) / master channels (+ limiter)
      songTimeAtSample0Pre: t0 - lead - audio.filmDelay,
      songTimeAtSample0Post: t0 - lead - audio.outputDelay,
      audioOffset: song.audioOffset,
      limiterDelay: audio.limiterDelay,
      limiterMakeup: audio.limiterMakeup,
      outputDelay: audio.outputDelay,
      samples: stage.samples.has('chime_E5'),
    },
  };
}

(window as unknown as { __mixlab: unknown }).__mixlab = { render };
