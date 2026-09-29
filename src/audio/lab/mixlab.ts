/**
 * Offline mix lab: renders the REAL game audio graph (AudioSystem: booth + headroom trim + limiter +
 * soft clip; Conductor: record + overlay stem buses with their EQ/clip; StageAudio: grade/miss/stumble
 * SFX, FULL HOUSE cheers) in an OfflineAudioContext, driven by a scripted clock. Run by mixlab.mjs,
 * which saves 4-channel float WAVs (ch 0-1 = master out, ch 2-3 = pre-limiter) for tools/music/mix_report.py.
 */
import { buildLevel } from '../../level/build';
import { gameLevel } from '../../level/index';
import { AudioSystem } from '../audioSystem';
import { Conductor } from '../conductor';
import type { LevelLike } from '../cues';
import { GOON_FLARE, STAGE_SFX, type StageSound } from '../mix';
import { Sfx } from '../sfx';
import type { GoonPart } from '../goonParts';
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
  /** the player's strike ON `beat` (the synth whoosh + HEY, a Perfect bell) — the final hit's real stack */
  strike?: boolean;
  /** the breakable at `beat` bursts (game 'smash' event: its onSmash cue) */
  smash?: boolean;
  /** the strike target at `beat` passes unhit (onMiss cue) */
  missTarget?: boolean;
  /** act 2 telegraph for the arrival at `arrive` (the game calls it ~1.5 beats ahead: event `beat` = the call) */
  mech?: 'whistle' | 'rumble';
  arrive?: number;
  /** act 2 impact at `beat` */
  fx?: 'shatter' | 'ignite' | 'ballHit';
  // ---- iteration 6
  /** a token laid ON `beat`, picked up 60 ms early (StageAudio.onToken(beat)); `loose`: a spilled token, no own beat */
  token?: boolean;
  loose?: boolean;
  /** a near-miss (game 'whew') at `beat` */
  whew?: boolean;
  /** a film canister picked up at `beat` */
  canister?: boolean;
  /** the poster appears at `beat` with this rank letter */
  poster?: string;
  /** a goon playing this part is smashed on `beat` */
  goon?: GoonPart;
  // ---- iteration 7
  /** the event happens this many SECONDS after `beat` (the ending's picture clock runs in seconds from the hit) */
  sec?: number;
  /** THE END (the renderer's 'theEnd': the iris has shut) */
  theEnd?: boolean;
  /** the rank stamp slams with this letter (the renderer's 'posterStamp') */
  stamp?: string;
  /** the roof sign: letter `sign` (0..3) flickers on (game 'sign' on `beat`) */
  sign?: number;
  /** the hero passed under a canister (game 'tease') */
  tease?: boolean;
  /** play a STAGE_SFX stack whose beat 0 is `soundBeat` (a level `at` cue: the colour burst, a canister glint) */
  sound?: StageSound;
  soundBeat?: number;
  rate?: number;
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
  /** the level's audio cues: the real game level (acts 1-3) */
  level?: boolean;
  /** leave the hush out (A/B for the report) */
  noHush?: boolean;
  /** add the level's act-2 mechanic + smash events in [from, to) (thrown / ball / pins / firebombs) */
  levelEvents?: boolean;
  /** level events without the player's strikes (no synth whoosh/HEY, no bells): the cue sounds alone */
  noStrikes?: boolean;
  /** the player's strikes/bells only: no stage sounds (the iteration-3 baseline for the same play) */
  legacy?: boolean;
  /** a token pickup (60 ms early) for every token the REAL level lays in [from, to) (iteration 6) */
  levelTokens?: boolean;
}

type Item = { type: string; beat?: number; style?: string; look?: string; giant?: boolean; action?: { type?: string; beat?: number } };

/** the level's gameplay audio events in [a, b): what the game would emit for a clean player */
function levelEvents(a: number, b: number): LabEvent[] {
  const ev: LabEvent[] = [];
  for (const it of gameLevel.items as Item[]) {
    const bt = it.beat;
    if (typeof bt !== 'number' || bt < a || bt >= b) continue;
    if (it.type === 'thrown') {
      ev.push({ beat: bt - 1.5, mech: 'whistle', arrive: bt });
      if (it.style === 'firebomb') ev.push({ beat: bt, fx: 'ignite' });
      else ev.push({ beat: bt, strike: true });
    } else if (it.type === 'ball') ev.push({ beat: bt - 1.5, mech: 'rumble', arrive: bt });
    else if (it.type === 'breakable') ev.push({ beat: bt, smash: true, strike: true });
  }
  return ev;
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
  cond.inserts = { record: audio.squeeze.input, stomps: audio.squeeze.input }; // as StageAudio.forGame
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
  const sfxOut = sc.nosfx ? ctx.createGain() : audio.sfx;
  const stage = new StageAudio({
    ctx,
    booth: audio.booth,
    squeeze: audio.squeeze,
    sfxOut,
    song,
    clock,
    setOverlays: (n, when, instant) => cond.setCrowdLevel(n, instant, when),
    flareOverlay: (stem, when, hold) => void cond.flareStem(stem, when, GOON_FLARE.db, hold, hold),
  });
  await stage.load();
  if (sc.nosfx) audio.booth.muteBed();
  if (sc.level && !sc.legacy) {
    stage.useLevel(gameLevel as unknown as LevelLike, song);
    if (sc.noHush) stage.setCues(stage.audioCues.filter((c) => c.type !== 'hush'));
  }
  const synth = new Sfx(ctx, sfxOut);
  cond.play(t0, lead, 0.005);
  stage.setCrowd(sc.crowd, true);

  const lev = sc.levelEvents ? levelEvents(sc.from, sc.to).map((e) => (sc.noStrikes ? { ...e, strike: false } : e)).filter((e) => e.strike || e.smash || e.mech || e.fx) : [];
  const toks: LabEvent[] = sc.levelTokens
    ? buildLevel(gameLevel, tempo, song).lums.filter((l) => l.beat >= sc.from && l.beat < sc.to).map((l) => ({ beat: l.beat, token: true }))
    : [];
  const evs = [...(sc.events ?? []), ...lev, ...toks];
  if (sc.ticks) for (let b = Math.ceil(sc.from); b < sc.to; b++) evs.push({ beat: b });
  const at = (e: LabEvent): number =>
    (e.sec ?? 0) + (e.miss || e.missTarget ? 0.135 : e.token ? -0.06 : e.grade || e.strike || e.smash || e.goon || e.sign !== undefined ? -0.02 : e.crowd !== undefined ? -0.015 : 0);
  const tokens: { beat: number; midi: number; source: string; mode?: string; role?: string; when: number; sung?: number }[] = [];
  evs.sort((a, b) => a.beat + at(a) / 0.37 - (b.beat + at(b) / 0.37));
  for (const e of evs) {
    now = clock.ctxAtBeat(e.beat) + at(e);
    if (e.grade) stage.onGrade(e.grade, e.beat);
    if (e.miss) stage.onMiss(e.beat);
    if (e.stumble) stage.onStumble();
    if (e.checkpoint) stage.onCheckpoint();
    if (e.crowd !== undefined) stage.setCrowd(e.crowd);
    if (e.strike) {
      synth.strike(clock.ctxAtBeat(e.beat), true);
      stage.onGrade('perfect', e.beat);
    }
    if (e.smash && !sc.legacy) stage.onSmash(e.beat);
    if (e.missTarget && !sc.legacy) stage.onTargetMissed(e.beat);
    if (e.mech && !sc.legacy) stage.mechTelegraph(e.mech, (e.arrive ?? e.beat + 1.5) - 1);
    if (e.fx && !sc.legacy) stage.mechFx(e.fx);
    if (e.token || e.loose) {
      const p = stage.onToken(e.loose ? undefined : e.beat);
      tokens.push({ beat: p.beat, midi: p.midi, source: p.source, mode: p.note?.mode, role: p.role, sung: p.note?.sung, when: p.when - (clock.ctxAtBeat(0) - tempo.beatToTime(0)) });
    }
    if (e.whew) stage.onWhew({ beat: e.beat });
    if (e.canister) stage.onCanister({ beat: e.beat });
    if (e.goon) stage.goonHit(e.goon, e.beat);
    if (e.poster) stage.onPoster(e.poster);
    if (e.theEnd) stage.onTheEnd(0);
    if (e.stamp) stage.onRank(e.stamp, 0, true);
    if (e.sign !== undefined) stage.onSign({ index: e.sign, beat: e.beat });
    if (e.tease) stage.onTease({ beat: e.beat });
    if (e.sound) stage.playSound(e.sound, e.soundBeat ?? e.beat, false, true, e.rate ?? 1);
    const other = e.strike || e.smash || e.missTarget || e.mech || e.fx || e.token || e.loose || e.whew || e.canister || e.goon || e.poster || e.theEnd || e.stamp || e.sign !== undefined || e.tease || e.sound;
    if (!e.grade && !e.miss && !e.stumble && !e.checkpoint && e.crowd === undefined && !other) stage.beatTick(e.beat);
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
      // the act-2/3 scenes (tools/music/stage_report.py): the cues in effect, the stacks, what the player did
      cues: stage.audioCues,
      stageSfx: STAGE_SFX,
      smashes: evs.filter((e) => e.smash).map((e) => e.beat),
      mechs: evs.filter((e) => e.mech || e.fx).map((e) => ({ kind: e.mech ?? e.fx, arrive: e.arrive ?? e.beat })),
      // iteration 6: what each token sang (song time of its sound = `when`), the feel events
      tokens,
      feel: evs.filter((e) => e.whew || e.canister || e.goon || e.poster).map((e) => ({ beat: e.beat, whew: e.whew, canister: e.canister, goon: e.goon, poster: e.poster })),
      // iteration 7: the ending's picture beats, the sign letters, the teases, the cue sounds (song time of each)
      polish: evs
        .filter((e) => e.theEnd || e.stamp || e.sign !== undefined || e.tease || e.sound)
        .map((e) => ({ beat: e.beat, sec: e.sec ?? 0, t: tempo.beatToTime(e.beat) + (e.sec ?? 0), theEnd: e.theEnd, stamp: e.stamp, sign: e.sign, tease: e.tease, sound: e.sound, soundBeat: e.soundBeat })),
    },
  };
}

(window as unknown as { __mixlab: unknown }).__mixlab = { render };
