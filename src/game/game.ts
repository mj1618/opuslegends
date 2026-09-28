/**
 * Game: owns every system and runs the frame loop.
 *
 * TIME MODEL (the heart of music sync)
 *   - While the song plays, the fixed-step simulation is SLAVED to the Conductor's audio clock:
 *     each frame we step until simTime catches up with conductor.time (song seconds). Sim time
 *     therefore can never drift from the music; render interpolates with alpha = leftover/step.
 *   - When no music plays (title, cold open, death sequence) the sim runs from a wall-clock
 *     accumulator.
 *   - Input edges are timestamped and applied on the exact step whose song time they fall in.
 *   - Hitstop freezes the world for a few steps but the music keeps going; the lost time is
 *     repaid by running the sim slightly faster right after (Tun.strike.catchUpRate), so the
 *     hero ends up exactly back on the beat.
 *
 * RUN FLOW: title -> COLD OPEN (hero waits, no music; press STRIKE) -> count-in (bar 0,
 * the pickup) -> run -> (stumble: knockback, keep running | death: pit / chaser -> <1 s ->
 * checkpoint, music rewinds 1 bar for a count-in) -> finish (bar 33 final hit) -> end screen.
 *
 * MECHANICS living here (all beat-driven from the WORLD beat = song beat minus hitstop debt):
 * timing judge + crowd, Pendulum Targets, slam platforms, jabbers (jab + flag bounce), spikes,
 * Hup-Hup-HEY -> Heave, the chaser, stumble lums drops, telegraph SFX (slam clack,
 * jabber squawk) scheduled on the audio clock.
 */
import { AudioSystem } from '../audio/audioSystem';
import { Conductor } from '../audio/conductor';
import { placeholderSong } from '../audio/placeholderSong';
import { analyzeBeatAlignment, beatAlignmentForSong, chordAt, collectibleNote, laneBeats, loadSongBuffer, loadSongStems, makeTempoMap, type SongDef } from '../audio/song';
import { Sfx } from '../audio/sfx';
import { StageAudio } from '../audio/stage';
import { SyncProbe } from '../audio/syncProbe';
import type { TempoMap } from '../audio/tempoMap';
import { DebugOverlay } from '../debug/overlay';
import { Display } from '../engine/display';
import { Controls, Input, type InputEdge } from '../engine/input';
import { clamp, overlaps, type Rect } from '../engine/math';
import { params } from '../engine/params';
import { Ease, TweenManager } from '../engine/tween';
import { BOUNCE, JABBER, type RuntimeLevel, buildLevel, cameraGroundAt, cameraZoomAt, crowdCapAt, launchVelocity, slamState } from '../level/build';
import { gameLevel } from '../level/index';
import type { LevelDef } from '../level/types';
import { Background } from '../render/background';
import { Camera } from '../render/camera';
import { Groove } from '../render/groove';
import { Particles, PShape } from '../render/particles';
import { Renderer } from '../render/renderer';
import { makeSprites } from '../render/sprites';
import { AutoPlayer } from './autoplay';
import { Calibrator, median } from './calibrate';
import { Crowd } from './crowd';
import type { ActionMarker, BouncePad, Breakable, Enemy, PendulumTarget, LooseLum } from './entities';
import { GameEvents } from './events';
import { Judge, type JudgeResult } from './judge';
import { type MechHost, Mechanics } from './mech';
import { jumpProfile } from './jumpProfile';
import { Player } from './player';
import { FrameStats, RunStats, summarize } from './stats';
import { Tun } from './tunables';

export type Scene = 'loading' | 'title' | 'play' | 'end';
export type Phase = 'coldOpen' | 'countIn' | 'run' | 'dying' | 'finished';

const LATENCY_KEY = 'opuslegends.latencyMs';

export interface Popup {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
}

export class Game {
  readonly display: Display;
  readonly input = new Input();
  readonly audio: AudioSystem;
  readonly song: SongDef;
  readonly tempo: TempoMap;
  readonly conductor: Conductor;
  readonly sfx: Sfx;
  /** the music as the reward: projection booth, overlays, grade/miss/stumble sounds (audio/stage.ts) */
  readonly stage: StageAudio;
  readonly tweens = new TweenManager();
  readonly particles = new Particles(4000);
  readonly camera = new Camera();
  readonly groove = new Groove();
  readonly background: Background;
  readonly renderer: Renderer;
  readonly debug: DebugOverlay;
  readonly controls = new Controls();
  readonly stats = new RunStats();
  readonly frameStats = new FrameStats();
  readonly levelDef: LevelDef;
  level: RuntimeLevel;
  player: Player;
  bot: AutoPlayer | null = null;
  readonly judge: Judge;
  /** act-2 mechanics: thrown bottles, rolling balls, set-piece cues, ledge scramble, fall-out (src/game/mech) */
  readonly mech: Mechanics;
  readonly crowd = new Crowd();
  /** the projector sync (latency tap test): cold open (first run / ?calib=1 / ↓) and the pause screen (X) */
  readonly calib: Calibrator;
  /** the latency offset the player calibrated / stored (ms): the in-run auto-drift stays within ±Tun.autoLatency.rangeMs of it */
  latencyBaseMs = 0;
  /** press errors (ms) since the last auto-drift step */
  private autoErr: number[] = [];
  /** stumbles after a respawn that don't pull the Burn yet (Tun.chaser.respawnGraceStumbles) */
  private burnGrace = 0;
  /** extra rest distance (beats) after the Burn caught you, until the next checkpoint (Tun.chaser.caughtBonus) */
  private burnRestBonus = 0;
  /** chorus drops (cap-rise beats) already paid this attempt */
  private dropsDone = new Set<number>();
  /** a paid drop opens its chorus cap early (until its downbeat) */
  private dropCapBeat = -Infinity;
  /** thrown bottles batted back / phrases heaved this run (and at the last checkpoint): the poster counts */
  private batted = new Set<number>();
  private snapBatted = new Set<number>();
  private heaved = new Set<number>();
  private snapHeaved = new Set<number>();
  /** gameplay → presentation hooks (grades, misses, combo, crowd, the Burn, set-pieces): game/events.ts */
  readonly events = new GameEvents();
  /** consecutive Great-or-better presses (a Good, a miss, a stumble or a death breaks it) */
  combo = 0;
  comboPeak = 0;
  /** lums dropped by stumbles */
  loose: LooseLum[] = [];
  /**
   * The Burn (chaser). `x` = world x of its front (the kill line, lunge included); `gap` = where it wants to be
   * (beats behind the music line, Tun.chaser); `rel` = where it is (beats behind the line, before the lunge);
   * `lunge` 0..1 = the drum-fill lunge envelope; `danger` 0..1 = how close it is to the hero (1 = touching);
   * `flare` 0..1 = decaying pulse on every pull (stumble / missed reward).
   */
  chaser = { active: false, x: -Infinity, riseBeat: 0, gap: Tun.chaser.restGap, rel: Tun.chaser.restGap + 0.5, lunge: 0, danger: 0, flare: 0 };
  /** the scripted set-piece in progress (level `setPiece` items; gameplay 'launch'), for the art/audio */
  setPiece: { name: string; beat: number; beats: number } | null = null;
  /** beats of the song's drum fills (the Burn lunges on them) */
  private lungeBeats: number[] = [];
  private lungeIdx = 0;
  private setPieceIdx = 0;
  /** failures per kind this run (failure hints) and hints already shown */
  private fails: Record<string, number> = {};
  private hintsShown = new Set<string>();
  private pendingHint: string | null = null;
  /** beats spent at FULL HOUSE this run, crowd value at each bar line (report) */
  private fullHouseBeats = 0;
  private crowdTrace: { beat: number; value: number }[] = [];
  private burnStats = { pulls: 0, lunges: 0, minMarginBeats: Infinity, caught: 0 };
  popups: Popup[] = [];
  /** dubbed subtitle flashed on the song's shouts ("HEY!") */
  subtitle = { text: '', t: 0 };
  /** Perfect-sweep freeze-frame overlay (s remaining) */
  freezeFx = 0;

  scene: Scene = 'loading';
  phase: Phase = 'countIn';
  paused = false;
  loadError = '';

  /** song time (s) at the END of the last simulated step */
  simTime = 0;
  /** accumulator for wall-clock stepping when music isn't playing */
  private freeAcc = 0;
  /** render interpolation factor */
  alpha = 0;
  readonly dt = 1 / Tun.sim.hz;
  hitstop = 0;
  private debt = 0;
  private phaseTimer = 0;
  private lastPerf = performance.now();
  /** seconds spent in the cold open (presentation) */
  coldOpenT = 0;
  /** 0..1 progress through the death sequence (presentation: the film rewind) */
  get deathProgress(): number {
    return this.phase === 'dying' ? clamp(1 - this.phaseTimer / Tun.flow.deathTime, 0, 1) : 0;
  }
  /** world beat of the current step (song beat minus hitstop debt) */
  worldBeat = 0;
  private lastWholeBeat = -999;
  /** song time of the last stumble (for recovery measurement) */
  private recoverFrom = NaN;

  /** beat the current attempt was spawned at */
  spawnBeat = 0;
  releaseTime = 0;
  checkpointIndex = -1;
  private snap = { lums: new Set<number>(), crowd: Tun.crowd.start, pendulums: new Set<number>(), burnGap: Tun.chaser.restGap as number };
  /** breakables already smashed at the last checkpoint (and the tokens they paid) */
  private snapBroken = new Set<number>();
  /** hero was standing in a pool last step (splash fx) */
  private inPool = false;
  private lumStreak = { count: 0, lastBeat: -99 };
  /** phrases whose three actions all graded Good+ (their strike becomes a Heave) */
  private heaveReady = new Set<number>();
  /** full-screen flash (presentation) */
  flash = 0;
  flashColor = '#ffffff';
  /** fade to black for respawn */
  fade = 0;
  toast = { text: '', t: 0 };
  private pausedAt = 0;
  private beatAlignment: ReturnType<typeof analyzeBeatAlignment> | null = null;
  private pendingEdges: { e: InputEdge; t: number }[] = [];
  private probe: SyncProbe | null = null;
  /** runs of the whole level: incremented on every start (for the test API) */
  runId = 0;

  /** `song`: resolved by audio/songs.ts selectSong() (?song=edit|full|placeholder) before the Game exists */
  constructor(canvas: HTMLCanvasElement, song: SongDef = placeholderSong) {
    this.display = new Display(canvas);
    this.audio = new AudioSystem(params.mute);
    this.song = song;
    this.tempo = makeTempoMap(this.song);
    this.conductor = new Conductor(this.audio.ctx, this.audio.music, this.song, this.tempo);
    this.sfx = new Sfx(this.audio.ctx, this.audio.sfx);
    this.stage = StageAudio.forGame(this.audio, this.conductor);
    this.stage.listen(this.events);
    this.levelDef = gameLevel;
    this.level = buildLevel(this.levelDef, this.tempo, this.song);
    // the level's audio cues: act 3's hush + world sounds, act 2's mechanic voices (audio/cues.ts)
    this.stage.useLevel(this.levelDef, this.song);
    this.mech = new Mechanics(this.level, this.mechHost(), this.song);
    this.judge = new Judge(this.level.actions, this.tempo);
    this.background = new Background(params.seed);
    this.renderer = new Renderer(this, makeSprites());
    this.debug = new DebugOverlay(this, params.debug);
    this.player = this.makePlayer();
    this.stats.pendulumsTotal = this.level.pendulums.length;

    const stored = safeGetLocal(LATENCY_KEY);
    const lat = params.latencyMs ?? (stored !== null ? Number(stored) : 0);
    this.setLatencyMs(Number.isFinite(lat) ? lat : 0, false);
    this.calib = new Calibrator(this.conductor, this.sfx);

    this.crowd.onChange = (n) => this.onCrowdChange(n);
    this.crowd.onValue = (v, dv) => {
      const full = this.crowd.bigCatch;
      this.events.emit('crowd', { value: v, count: this.crowd.count, norm: this.crowd.norm, delta: dv, fullHouse: full });
      if (full !== this.wasFullHouse) {
        this.wasFullHouse = full;
        this.events.emit('fullHouse', { on: full, beat: this.worldBeat });
      }
    };
    this.lungeBeats = laneBeats(this.song, 'fills').sort((a, b) => a - b);
    this.player.lowCeilings = (r) => {
      for (const sg of this.level.signs) if (!sg.hit && overlaps(r, sg.rect)) return true;
      return false;
    };
    this.input.onGesture(() => void this.audio.unlock());
    for (const cue of this.level.fx) this.conductor.at(cue.beat, () => this.fireFx(cue.fx, cue.amount));
    // the audience yells with the band: a dubbed subtitle on every shout in the song map
    for (const e of this.song.map?.lanes.shouts ?? []) this.conductor.at(e.beat, () => (this.subtitle = { text: `${e.word ?? 'HEY'}!`, t: 0.45 }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.scene === 'play' && !this.paused) this.setPaused(true);
    });
  }

  private wasFullHouse = false;

  private makePlayer(): Player {
    const p = new Player({
      jump: (kind) => this.onPlayerJump(kind),
      land: (vy) => this.onPlayerLand(vy),
      strike: () => this.onPlayerStrike(),
      slide: () => this.onPlayerSlide(),
      footstep: () => this.onFootstep(),
    });
    p.setWorld(this.level.world);
    return p;
  }

  async load(): Promise<void> {
    try {
      const t0 = performance.now();
      const [buf, stems] = await Promise.all([
        loadSongBuffer(this.song, this.audio.ctx, this.tempo),
        loadSongStems(this.song, this.audio.ctx, this.tempo),
        this.audio.calibrate(),
      ]);
      // the master limiter's look-ahead delays everything audible: the clock accounts for it
      this.conductor.outputDelay = this.audio.outputDelay;
      console.info(`song loaded in ${Math.round(performance.now() - t0)} ms`);
      this.conductor.buffer = buf;
      this.conductor.stems = stems;
      if (params.autoplay || params.probe) this.probe = await SyncProbe.forSong(this.audio.ctx, this.audio.music, this.conductor);
      this.beatAlignment = beatAlignmentForSong(buf, this.song, this.tempo);
      this.scene = 'title';
      if (params.skipTitle) {
        await this.audio.unlock();
        if (this.audio.running) this.startRun();
      }
    } catch (err) {
      this.loadError = String(err);
      console.error(err);
    }
  }

  // ====================================================================== run flow

  /** Start a run: the cold open (unless mid-level via ?start / fromBeat), else straight to the count-in. */
  startRun(fromBeat?: number): void {
    this.runId++;
    this.scene = 'play';
    this.paused = false;
    this.stats.reset();
    this.stats.pendulumsTotal = this.level.pendulums.length;
    this.frameStats.reset();
    this.judge.reset(-1e9);
    this.judge.clearCounts();
    this.heaveReady.clear();
    this.snap = { lums: new Set(), crowd: Tun.crowd.start, pendulums: new Set(), burnGap: Tun.chaser.restGap };
    this.snapBroken = new Set();
    this.combo = 0;
    this.comboPeak = 0;
    this.fails = {};
    this.hintsShown.clear();
    this.pendingHint = null;
    this.level.hints = this.level.hints.filter((h) => !h.dynamic);
    this.fullHouseBeats = 0;
    this.crowdTrace = [];
    this.burnStats = { pulls: 0, lunges: 0, minMarginBeats: Infinity, caught: 0 };
    this.checkpointIndex = -1;
    for (const cp of this.level.checkpoints) cp.reached = false;
    const start = fromBeat ?? params.start ?? this.level.def.startBeat;
    // lums/pendulums before a mid-level start are skipped (not counted)
    for (const l of this.level.lums) {
      l.collected = false;
      l.skipped = l.beat < start - 1e-6;
    }
    this.stats.lumsTotal = this.level.lums.filter((l) => !l.skipped).length + this.level.breakables.filter((b) => b.beat >= start - 1e-6).reduce((n, b) => n + b.tokens, 0) + this.mech.tokensFrom(start);
    this.stats.pendulumsTotal = this.level.pendulums.filter((f) => f.beat >= start - 1e-6).length;
    this.stats.breakablesTotal = this.level.breakables.filter((b) => b.beat >= start - 1e-6).length + this.mech.bottles.filter((b) => b.tokens > 0 && b.beat >= start - 1e-6).length;
    this.stats.phrasesTotal = this.level.phrases.filter((ph) => ph.beats[0] >= start - 1e-6).length;
    this.level.checkpoints.forEach((cp, i) => {
      if (cp.beat <= start + 1e-6) {
        cp.reached = true;
        this.checkpointIndex = i;
      }
    });
    if (params.autoplay) this.bot = new AutoPlayer(this.level.actions, this.tempo, params.miss, params.jitter, params.seed, params.late, params.skip);
    const cold = fromBeat === undefined && params.start === null && this.level.def.coldOpen && params.coldOpen;
    this.crowd.reset(crowdCapAt(this.level, start));
    this.wasFullHouse = false;
    this.dropsDone.clear();
    this.batted.clear();
    this.snapBatted.clear();
    this.heaved.clear();
    this.snapHeaved.clear();
    this.burnGrace = 0;
    this.burnRestBonus = 0;
    this.autoErr = [];
    if (cold) this.enterColdOpen(start);
    else {
      this.crowd.wake();
      this.spawnAt(start);
    }
  }

  /** The cold open: no music, ambience, the hero waits for the first STRIKE. */
  private enterColdOpen(beat: number): void {
    this.phase = 'coldOpen';
    this.coldOpenT = 0;
    this.spawnBeat = beat;
    this.conductor.stop('cut');
    this.resetWorld(beat);
    const x = beat * this.level.ppb;
    const y = this.level.floorYAt(x);
    this.player.spawn(x, Number.isNaN(y) ? 0 : y, this.tempo.runSpeedAt(beat, this.level.ppb), this.level.ppb);
    this.controls.reset();
    if (this.bot) this.bot.reset(beat, this.controls);
    this.pendingEdges = [];
    this.simTime = this.tempo.beatToTime(0);
    this.camera.zoom = cameraZoomAt(this.level, -50, Tun.camera.zoom);
    this.camera.snap(this.player.x, this.player.y);
    this.sfx.ambience(true);
  }

  /** STRIKE in the cold open: the crowd wakes, bar 0 (the pickup) starts the band. */
  private beginFromColdOpen(): void {
    this.sfx.ambience(false);
    this.sfx.strike(undefined, false);
    this.sfx.crowdWake();
    this.crowd.wake();
    this.snap.crowd = this.crowd.value;
    this.particles.emit({ x: this.player.x + 40, y: this.player.y - 90, count: 16, speed: [150, 500], life: [0.3, 0.6], size: [6, 12], color: '#E0B64A', shape: PShape.Spark, drag: 3 });
    this.spawnAt(this.spawnBeat);
    this.player.strikeTime = 0; // keep waving through the count-in
    this.log('coldOpenStrike', {});
  }

  /** Reset entities at/after `beat` (checkpoint rewinds re-arm everything ahead). */
  private resetWorld(beat: number): void {
    const L = this.level;
    for (const e of L.enemies) if (e.beat >= beat - 0.5) resetEnemy(e);
    for (const h of L.hazards) {
      if (h.beat < beat - 0.5) continue;
      h.alive = true;
      h.vx = h.vy = h.rot = h.offX = h.offY = 0;
    }
    for (const f of L.pendulums) {
      if (f.beat < beat - 0.5) continue;
      f.struck = this.snap.pendulums.has(f.id);
      f.struckT = f.struck ? 99 : 0;
    }
    for (const l of L.lums) {
      if (l.skipped) continue;
      l.collected = this.snap.lums.has(l.id);
      l.collectT = l.collected ? 99 : 0;
    }
    for (const b of L.breakables) {
      if (b.beat < beat - 0.5) continue;
      b.broken = this.snapBroken.has(b.id);
      b.brokenT = b.broken ? 99 : 0;
    }
    for (const b of L.bouncePads) if (b.beat >= beat - 0.5) b.used = false;
    for (const sg of L.signs) if (sg.beat >= beat - 0.5) sg.hit = false;
    this.inPool = false;
    this.loose = [];
    this.popups = [];
    this.mech.reset(beat);
    const rest = Tun.chaser.restGap + this.burnRestBonus;
    const gap = Math.min(rest, Math.max(this.snap.burnGap, Tun.chaser.respawnMinGap + this.burnRestBonus));
    this.chaser = { active: false, x: -Infinity, riseBeat: 0, gap, rel: gap + 0.5, lunge: 0, danger: 0, flare: 0 };
    for (const b of [...this.dropsDone]) if (b >= beat - 1e-6) this.dropsDone.delete(b);
    this.dropCapBeat = -Infinity;
    this.lungeIdx = this.lungeBeats.findIndex((b) => b >= beat - 1e-6);
    if (this.lungeIdx < 0) this.lungeIdx = this.lungeBeats.length;
    this.setPieceIdx = this.level.setPieces.findIndex((sp) => sp.beat >= beat - 1e-6);
    if (this.setPieceIdx < 0) this.setPieceIdx = this.level.setPieces.length;
    this.setPiece = null;
  }

  /** (Re)spawn at a beat: reset entities ahead, place the hero, rewind the music with a count-in. */
  private spawnAt(beat: number): void {
    this.spawnBeat = beat;
    this.phase = 'countIn';
    this.hitstop = 0;
    this.debt = 0;
    this.fade = 0;
    this.lumStreak = { count: 0, lastBeat: -99 };
    this.recoverFrom = NaN;
    this.resetWorld(beat);
    // the run's counts go back to the checkpoint's (a rewind replays what's ahead: nothing is counted twice)
    this.batted = new Set(this.snapBatted);
    this.heaved = new Set(this.snapHeaved);
    this.stats.lums = this.snap.lums.size + this.level.breakables.filter((b) => this.snapBroken.has(b.id)).reduce((n, b) => n + b.tokens, 0) + this.mech.bottles.filter((b) => this.batted.has(b.id)).reduce((n, b) => n + b.tokens, 0);
    this.stats.pendulums = this.snap.pendulums.size;
    this.stats.breakables = this.snapBroken.size + this.batted.size;
    this.stats.heaves = this.heaved.size;
    this.judge.reset(beat);
    for (const i of [...this.heaveReady]) if (this.level.phrases[i].beats[0] >= beat - 1e-6) this.heaveReady.delete(i);
    const x = beat * this.level.ppb;
    const y = this.level.floorYAt(x);
    this.player.spawn(x, Number.isNaN(y) ? 0 : y, this.tempo.runSpeedAt(beat, this.level.ppb), this.level.ppb);
    this.controls.reset();
    // keep currently held directions so a player holding right launches immediately
    if (this.input.isHeld('right')) this.controls.apply('right', true, 0);
    if (this.bot) this.bot.reset(beat, this.controls);
    this.pendingEdges = [];
    const from = this.tempo.beatToTime(beat - Tun.flow.countInBeats);
    this.releaseTime = this.tempo.beatToTime(beat);
    this.stage.setCrowd(this.crowd.value, true);
    this.conductor.play(from);
    // count-in: stick clicks on the recording's own beat grid (tempo map; extrapolated before beat 0)
    for (let i = 0; i < Tun.flow.countInBeats; i++) {
      this.sfx.sticks(this.conductor.ctxTimeAtSongTime(this.tempo.beatToTime(beat - Tun.flow.countInBeats + i)), i === 0);
    }
    this.simTime = from;
    this.lastWholeBeat = Math.floor(beat - Tun.flow.countInBeats) - 1;
    this.camera.zoom = cameraZoomAt(this.level, beat, Tun.camera.zoom);
    this.camera.snap(this.player.x, this.player.y);
  }

  private release(): void {
    this.phase = 'run';
    this.player.release(this.controls);
    if (this.player.vx > 0) {
      this.emitDust(this.player.x - 20, this.player.y, 10, -1);
    }
  }

  die(cause: string): void {
    if (this.phase !== 'run') return;
    // caught by the Burn: it keeps an extra distance until the next checkpoint (no catch-twice at one spot)
    if (cause === 'chaser') this.burnRestBonus = Tun.chaser.caughtBonus;
    this.phase = 'dying';
    this.phaseTimer = Tun.flow.deathTime;
    this.stats.deaths++;
    this.stats.deathLog.push({ beat: round3(this.player.x / this.level.ppb), cause });
    this.breakCombo('death');
    this.events.emit('death', { cause, beat: round3(this.player.x / this.level.ppb) });
    const overLifts = this.level.slams.some((f) => Math.abs(f.solid.x + f.solid.w / 2 - this.player.x) < 1.5 * this.level.ppb);
    this.noteFailure(cause === 'chaser' ? 'burn' : overLifts ? 'lifts' : 'pit', true);
    this.player.mode = 'dead';
    this.conductor.stop('tape');
    this.sfx.death();
    const p = this.player;
    if (cause === 'pit' || cause === 'chaser') {
      this.sfx.fall();
      this.particles.emit({ x: p.x, y: Math.min(p.y, Tun.flow.pitY), count: 50, speed: [300, 1100], angle: -Math.PI / 2, spread: 1.4, life: [0.4, 0.9], size: [8, 22], color: '#3A2F28', gravity: 2200, drag: 1, shrink: 1 });
      this.particles.emit({ x: p.x, y: Math.min(p.y, Tun.flow.pitY), count: 24, speed: [200, 700], angle: -Math.PI / 2, spread: 1.2, life: [0.5, 1.0], size: [10, 26], color: '#1A1410', gravity: 1800, drag: 1.5, shrink: 1 });
    } else {
      this.particles.emit({ x: p.x, y: p.y - p.h / 2, count: 40, speed: [200, 900], life: [0.4, 0.9], size: [8, 20], color: '#fff3e0', gravity: 1400, drag: 1.5, shrink: 1 });
    }
    this.camera.addTrauma(Tun.juice.shakeOnDeath);
    this.flashScreen('#1A1410', 0.35);
    this.log('death', { cause, beat: p.x / this.level.ppb });
  }

  private respawn(): void {
    const cp = this.level.checkpoints[this.checkpointIndex];
    const beat = cp ? cp.beat : (params.start ?? this.level.def.startBeat);
    // back to the checkpoint's crowd, minus a death's worth
    this.crowd.set(this.snap.crowd - Tun.crowd.deathLoss);
    this.spawnAt(beat);
    // the Burn restarts at rest (respawnMinGap) and ignores the first stumble: it can't catch you twice in a row
    this.burnGrace = Tun.chaser.respawnGraceStumbles;
    if (this.pendingHint) {
      this.showFailHint(this.pendingHint, beat - Tun.flow.countInBeats + 0.5);
      this.pendingHint = null;
    }
  }

  private finish(): void {
    if (this.phase !== 'run') return;
    this.phase = 'finished';
    this.phaseTimer = Tun.flow.finishEndScreenDelay;
    this.player.mode = 'finished';
    this.stats.finished = true;
    this.stats.finishedAt = performance.now();
    if (!this.stage.hasFinale) this.sfx.finish(this.song.key.root + 24); // (the edit's final hit has its own stack)
    this.flashScreen('#fff6c0', 0.6);
    this.camera.addTrauma(0.3);
    for (let i = 0; i < 5; i++) {
      this.particles.emit({ x: this.level.finishX, y: this.player.y - 300 - i * 60, count: 24, speed: [200, 700], life: [0.8, 1.6], size: [8, 16], color: ['#E0B64A', '#E9D8B4', '#2FA37A', '#FFE24A', '#ffffff'][i], gravity: 600, drag: 1, shape: PShape.Square, shrink: 0.5 });
    }
    this.log('finish', {});
  }

  private reachCheckpoint(i: number): void {
    const cp = this.level.checkpoints[i];
    cp.reached = true;
    cp.flash = 1;
    this.checkpointIndex = i;
    this.snap = {
      lums: new Set(this.level.lums.filter((l) => l.collected).map((l) => l.id)),
      crowd: this.crowd.value,
      pendulums: new Set(this.level.pendulums.filter((f) => f.struck).map((f) => f.id)),
      burnGap: this.chaser.active ? this.chaser.gap : Tun.chaser.restGap,
    };
    this.snapBroken = new Set(this.level.breakables.filter((b) => b.broken).map((b) => b.id));
    this.snapBatted = new Set(this.batted);
    this.snapHeaved = new Set(this.heaved);
    this.burnGrace = 0;
    this.burnRestBonus = 0;
    this.stage.onCheckpoint();
    this.particles.emit({ x: cp.x, y: cp.y - 200, count: 30, speed: [150, 500], life: [0.5, 1], size: [6, 12], color: '#F8F1DC', gravity: 500, drag: 1.5, shape: PShape.Square });
    this.log('checkpoint', { beat: cp.beat });
  }

  setPaused(p: boolean): void {
    if (this.scene !== 'play' || p === this.paused) return;
    if (p) {
      this.paused = true;
      this.pausedAt = this.conductor.playing ? this.conductor.time : NaN;
      if (this.conductor.playing) this.conductor.stop('cut');
    } else {
      this.paused = false;
      if (Number.isFinite(this.pausedAt)) {
        this.conductor.play(this.simTime);
      }
      this.lastPerf = performance.now();
    }
  }

  // ====================================================================== frame loop

  frame(): void {
    const now = performance.now();
    const frameDt = Math.min(0.1, (now - this.lastPerf) / 1000);
    this.lastPerf = now;
    this.frameStats.tick(now);
    this.input.pollGamepads();
    this.conductor.update(now);
    let edges = this.input.drain();
    if (this.calib.active) edges = this.calibInput(edges);
    this.handleMetaInput(edges);
    if (this.calib.update()) this.finishCalibration();

    if (this.scene === 'play' && !this.paused) this.advanceSim(edges, frameDt);

    // presentation-time updates
    const freeRun = !this.conductor.playing && (this.scene !== 'play' || this.phase === 'coldOpen');
    const bpm0 = this.tempo.bpmAtBeat(0);
    this.groove.set(
      freeRun ? now / 1000 : this.conductor.time,
      freeRun ? (now / 1000) * (bpm0 / 60) : this.conductor.beat,
      this.tempo.secondsPerBeatAt(this.conductor.beat),
      this.tempo.beatsPerBar,
      this.conductor.playing,
    );
    const presDt = this.paused ? 0 : frameDt;
    this.tweens.update(presDt);
    this.particles.update(this.hitstop > 0 ? presDt * 0.15 : presDt);
    this.flash = Math.max(0, this.flash - presDt * 3.2);
    this.background.pulse = Math.max(0, this.background.pulse - presDt * 1.5);
    this.toast.t = Math.max(0, this.toast.t - presDt);
    this.crowd.flash = Math.max(0, this.crowd.flash - presDt * 3);
    for (const cp of this.level.checkpoints) cp.flash = Math.max(0, cp.flash - presDt * 1.5);
    for (const l of this.level.lums) if (l.collected) l.collectT += presDt;
    for (const f of this.level.pendulums) if (f.struck) f.struckT += presDt;
    for (const b of this.level.breakables) if (b.broken) b.brokenT += presDt;
    for (const b of this.level.bouncePads) b.kick = Math.max(0, b.kick - presDt * 3);
    for (const sg of this.level.signs) sg.swing = Math.max(0, sg.swing - presDt * 1.5);
    for (const pu of this.popups) pu.t += presDt;
    this.subtitle.t = Math.max(0, this.subtitle.t - presDt);
    this.freezeFx = Math.max(0, this.freezeFx - presDt);
    if (this.popups.length && this.popups[0].t > 1) this.popups = this.popups.filter((p) => p.t < 1);
    if (this.phase === 'coldOpen') this.coldOpenT += presDt;

    const p = this.player;
    const ix = p.px + (p.x - p.px) * this.alpha;
    const iy = p.py + (p.y - p.py) * this.alpha;
    if (this.scene === 'play') this.camera.zoom = cameraZoomAt(this.level, this.conductor.playing ? this.conductor.beat : this.spawnBeat, Tun.camera.zoom);
    if (this.scene === 'play') this.camera.groundFrac = cameraGroundAt(this.level, this.conductor.playing ? this.conductor.beat : this.spawnBeat, Tun.camera.groundFraction);
    this.camera.beatZoom = this.scene === 'play' && this.conductor.playing ? Tun.camera.barZoomPulse * this.groove.pulse(4, 0.35) : 0;
    this.camera.update(presDt, ix, iy, p.h, p.groundY, p.vx / p.maxSpeed, p.mode === 'dead');

    this.renderer.render(ix, iy);
    this.input.endFrame();
  }

  private handleMetaInput(edges: InputEdge[]): void {
    for (const e of edges) {
      if (!e.down) continue;
      if (e.button === 'debug') this.debug.enabled = !this.debug.enabled;
      if (e.button === 'latUp' || e.button === 'latDown') {
        const ms = Math.round(this.conductor.latency * 1000) + (e.button === 'latUp' ? 5 : -5);
        this.setLatencyMs(ms, true);
        this.showToast(`Audio latency offset: ${ms} ms`);
      }
      if (e.button === 'pause' && this.scene === 'play' && this.phase !== 'coldOpen') this.setPaused(!this.paused);
      else if (this.paused && (e.button === 'start' || e.button === 'jump')) this.setPaused(false);
      else if (this.paused && e.button === 'strike' && !this.calib.active) this.startCalibration('pause');
    }
    if (this.scene === 'title' && this.input.anyPressed && this.conductor.buffer) {
      void this.audio.unlock().then(() => {
        if (this.scene === 'title') this.startRun();
      });
      this.sfx.ui();
    }
    if (this.scene === 'end' && edges.some((e) => e.down && (e.button === 'start' || e.button === 'jump'))) {
      this.startRun();
    }
  }

  // ====================================================================== latency: the projector sync + auto-drift

  /** set the latency offset (ms); `store` = it is the player's choice (localStorage) and the auto-drift's new centre */
  setLatencyMs(ms: number, store: boolean): void {
    this.conductor.latency = ms / 1000;
    this.latencyBaseMs = ms;
    this.autoErr = [];
    if (store) safeSetLocal(LATENCY_KEY, String(Math.round(ms)));
  }

  /** the cold open offers the sync on the first run (nothing stored, no ?latency) or when asked (?calib=1) */
  private wantsCalibration(): boolean {
    if (params.calib) return true;
    return !params.autoplay && params.latencyMs === null && safeGetLocal(LATENCY_KEY) === null;
  }

  private startCalibration(origin: 'coldOpen' | 'pause'): void {
    const spb = this.tempo.secondsPerBeatAt(Math.max(0, this.conductor.playing ? this.conductor.beat : this.spawnBeat));
    if (!this.calib.start(origin, spb, Math.round(this.conductor.latency * 1000))) {
      if (origin === 'coldOpen') this.beginFromColdOpen();
      return;
    }
    this.log('calibStart', { origin });
    if (this.bot) {
      // the bot hears the clicks `device` ms late and taps with its usual jitter
      let seed = params.seed * 7919 + 17;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
      for (const c of this.calib.clicks) this.calib.tapAudible(c + (params.device + rnd() * params.jitter) / 1000);
    }
  }

  /** while the sync runs, STRIKE taps it, JUMP / Esc skip it; the other buttons pass through */
  private calibInput(edges: InputEdge[]): InputEdge[] {
    const out: InputEdge[] = [];
    for (const e of edges) {
      if (e.button === 'strike') {
        if (e.down) this.calib.tap(e.time);
      } else if (e.button === 'jump' || e.button === 'pause' || e.button === 'start') {
        if (e.down) this.skipCalibration();
      } else out.push(e);
    }
    return out;
  }

  private skipCalibration(): void {
    if (!this.calib.active) return;
    const origin = this.calib.origin;
    this.calib.cancel();
    // a skip is a choice too: the first-run sync isn't forced again
    this.setLatencyMs(this.calib.before, true);
    this.showToast('Projector sync skipped (re-run it: ↓ before the film · X in the pause menu)', 3);
    this.log('calibSkip', {});
    if (origin === 'coldOpen' && this.phase === 'coldOpen') this.beginFromColdOpen();
  }

  private finishCalibration(): void {
    const r = this.calib.result;
    if (r !== null) {
      this.setLatencyMs(r, true);
      this.showToast(`Projector synced — audio offset ${r >= 0 ? '+' : ''}${r} ms`, 3);
    } else this.showToast('Not enough taps — offset unchanged (↓ before the film · X in the pause menu)', 3.5);
    this.log('calib', { result: r, errs: this.calib.errs.map((e) => Math.round(e)) });
    if (this.calib.origin === 'coldOpen' && this.phase === 'coldOpen') this.beginFromColdOpen();
  }

  /**
   * AUTO-DRIFT: the median press error of the last `window` graded presses nudges the offset toward the player
   * (a small step, only for a clear bias), bounded to ±rangeMs around the calibrated value. Applied on bar lines.
   */
  private autoLatencyStep(): void {
    const A = Tun.autoLatency;
    if (!A.enabled || !params.autoLatency || this.autoErr.length < A.window) return;
    const errs = this.autoErr;
    this.autoErr = [];
    const med = median(errs);
    // only a CLEAR bias moves it: |median| beyond 2 standard errors of the median (robust spread: 1.4826 × MAD), so a
    // merely sloppy player's noise doesn't random-walk the offset
    const sigma = 1.4826 * median(errs.map((e) => Math.abs(e - med)));
    const se = (1.2533 * sigma) / Math.sqrt(errs.length);
    if (Math.abs(med) < Math.max(A.deadMs, 2 * se)) return;
    const cur = this.conductor.latency * 1000;
    const step = clamp(med * A.gain, -A.maxStepMs, A.maxStepMs);
    const next = clamp(cur + step, this.latencyBaseMs - A.rangeMs, this.latencyBaseMs + A.rangeMs);
    if (Math.abs(next - cur) < 0.5) return;
    this.conductor.latency = next / 1000;
    this.log('autoLatency', { medianMs: Math.round(med), ms: Math.round(next * 10) / 10 });
  }

  private advanceSim(edges: InputEdge[], frameDt: number): void {
    const dt = this.dt;
    // timestamp edges in song time (or apply immediately when the music isn't running)
    for (const e of edges) {
      if (e.button === 'debug' || e.button === 'latUp' || e.button === 'latDown' || e.button === 'pause' || e.button === 'start') continue;
      this.pendingEdges.push({ e, t: this.conductor.playing ? this.conductor.songTimeAtPerf(e.time) : -Infinity });
    }
    let steps = 0;
    if (this.conductor.playing) {
      const target = this.conductor.time;
      while (this.simTime + dt <= target && steps < Tun.sim.maxStepsPerFrame) {
        this.simTime += dt;
        this.tick(dt, this.simTime);
        steps++;
        if (!this.conductor.playing) break; // died this step
      }
      if (this.conductor.playing) {
        if (steps >= Tun.sim.maxStepsPerFrame && this.simTime + dt <= target) this.simTime = target - dt * 0.5; // drop time (hitch)
        this.alpha = clamp((this.conductor.time - this.simTime) / dt, 0, 1);
        const drift = Math.abs(this.conductor.time - this.simTime) * 1000;
        if (steps > 0) this.stats.maxDriftMs = Math.max(this.stats.maxDriftMs, drift);
      }
    } else {
      this.freeAcc = Math.min(this.freeAcc + frameDt, 0.25);
      while (this.freeAcc >= dt) {
        this.freeAcc -= dt;
        this.tick(dt, this.simTime);
        if (this.conductor.playing) {
          this.freeAcc = 0;
          break; // (re)spawned: music clock takes over
        }
      }
      this.alpha = this.conductor.playing ? 0 : this.freeAcc / dt;
    }
  }

  private heroView() {
    return { phase: this.phase, x: this.player.x, musicX: this.player.musicX, ppb: this.level.ppb };
  }

  /** One fixed simulation step ending at song time `t`. */
  private tick(dt: number, t: number): void {
    // input for this step
    while (this.pendingEdges.length && this.pendingEdges[0].t <= t) {
      const { e, t: et } = this.pendingEdges.shift()!;
      this.controls.apply(e.button, e.down, Number.isFinite(et) ? et : t);
    }
    if (this.bot && (this.phase === 'coldOpen' || this.phase === 'countIn' || this.phase === 'run')) {
      this.bot.lag = params.device / 1000 - this.conductor.latency;
      this.bot.update(t, dt, this.controls, this.heroView());
    }

    if (this.phase === 'coldOpen') {
      const strike = this.controls.strikePressed;
      const down = this.controls.downPressed;
      this.player.step(dt, this.controls, this.level.world);
      this.controls.clearEdges();
      if (this.calib.active) return;
      // first run (no stored offset), ?calib=1 or ↓: the projector sync first, then the film rolls by itself
      if ((strike && this.wantsCalibration()) || (down && !params.autoplay)) this.startCalibration('coldOpen');
      else if (strike) this.beginFromColdOpen();
      return;
    }

    if (this.phase === 'dying') {
      this.phaseTimer -= dt;
      this.player.step(dt, this.controls, this.level.world);
      this.fade = clamp(1 - this.phaseTimer / Tun.flow.respawnFade, 0, 1) * (this.phaseTimer < Tun.flow.respawnFade ? 1 : 0);
      if (this.phaseTimer <= 0) this.respawn();
      this.controls.clearEdges();
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.debt += dt;
      return; // world frozen; edges stay pending in Controls
    }
    // world time lags song time by the hitstop debt until it's repaid
    this.simulate(dt, t - dt, t - dt - this.debt);
    if (this.debt > 0 && this.phase === 'run') {
      const extra = Math.min(this.debt, dt * Tun.strike.catchUpRate);
      const w0 = t - this.debt;
      this.debt -= extra;
      this.simulate(extra, t, w0);
    } else if (this.phase !== 'run') this.debt = 0;
  }

  /**
   * Advance the world by dt. `t0` = song time at the start of this (sub)step, `w0` = world time
   * (song time minus unpaid hitstop debt) — where the hero "should" be is derived from w0.
   */
  private simulate(dt: number, t0: number, w0: number): void {
    this.stepTime = t0;
    const p = this.player;
    if (this.phase === 'countIn' && t0 >= this.releaseTime - dt * 0.5) this.release();
    const beatW = this.tempo.timeToBeat(w0);
    const dBeat = beatW - this.worldBeat;
    this.worldBeat = beatW;
    if (this.phase === 'run' && dBeat > 0 && dBeat < 0.5) this.beatTick(beatW, dBeat);
    p.musicX = this.conductor.playing && this.phase === 'run' ? beatW * this.level.ppb : NaN;
    // top run speed + jump physics follow the TEMPO MAP (x = beat * ppb, so speed = ppb / spb(beat))
    p.setTempo(this.tempo.secondsPerBeatAt(beatW));
    // grade presses (score/feedback/crowd only — the controller never sees this)
    if (this.phase === 'run') {
      if (this.controls.jumpPressed) this.gradePress('jump', this.controls.jumpPressTime);
      if (this.controls.strikePressed) this.gradePress('strike', this.controls.strikePressTime);
    }
    this.updateSlams(beatW);
    p.step(dt, this.controls, this.level.world);
    this.controls.clearEdges();
    this.updateEntities(dt, beatW);
    this.mech.step(dt, beatW, p, this.phase === 'run', this.controls.right);
    this.beatEvents(beatW);

    if (this.phase === 'finished') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0 && this.scene === 'play') {
        this.scene = 'end';
        this.conductor.stop('fade');
        this.log('endScreen', {});
      }
      return;
    }
    if (this.phase !== 'run') return;
    for (const miss of this.judge.expire(t0)) this.onMissTarget(miss.action);
    // surge recovery measurement
    if (Number.isFinite(this.recoverFrom) && p.stumbleLock <= 0 && p.musicX - p.x < 4) {
      this.stats.recoveries.push(round3(this.tempo.timeToBeat(t0) - this.tempo.timeToBeat(this.recoverFrom)));
      this.recoverFrom = NaN;
    }
    this.updateChaser(dt, beatW);
    if (this.phase !== 'run') return;
    this.interact(beatW);
  }

  /** song time at the start of the current sim step (for action logging) */
  private stepTime = 0;

  /** per-step musical bookkeeping while running: crowd decay, set-piece cues, report traces */
  private beatTick(beatW: number, dBeat: number): void {
    this.crowd.decay(dBeat);
    this.chorusDrop(beatW);
    if (this.crowd.bigCatch) this.fullHouseBeats += dBeat;
    const bar = Math.floor(beatW / 4);
    if (Math.floor((beatW - dBeat) / 4) !== bar) {
      this.crowdTrace.push({ beat: bar * 4, value: round3(this.crowd.value) });
      this.autoLatencyStep();
    }
    const sps = this.level.setPieces;
    while (this.setPieceIdx < sps.length && sps[this.setPieceIdx].beat <= beatW) {
      const sp = sps[this.setPieceIdx++];
      this.startSetPiece(sp.name, sp.beat, sp.beats);
    }
    if (this.setPiece && beatW > this.setPiece.beat + this.setPiece.beats) this.setPiece = null;
  }

  /**
   * THE DROP (iteration 4, review iter3 fix 5): a chorus cap (≥ bigCatchAt, rising from below it) is EARNED by a clean
   * (all Great+) Hup-Hup-HEY ending in the `dropWindowBeats` before it, or by its `earn` beats graded Great+. Earned →
   * `dropLeadBeats` before the downbeat the cap opens and the house fills to FULL HOUSE: StageAudio quantises crowd
   * moves to the next beat, so the overlays and the FULL HOUSE cheer hit ON the chorus downbeat.
   */
  private chorusDrop(beatW: number): void {
    const C = Tun.crowd;
    const caps = this.level.crowdCaps;
    for (let i = 0; i < caps.length; i++) {
      const c = caps[i];
      if (c.cap < C.bigCatchAt || this.dropsDone.has(c.beat)) continue;
      if (beatW < c.beat - C.dropLeadBeats - 1e-6 || beatW > c.beat + 0.5) continue;
      const prev = i > 0 ? caps[i - 1].cap : Tun.crowd.max;
      if (prev >= C.bigCatchAt) continue;
      // keep asking until the downbeat (+0.5): the earning action may land inside the lead (act 3's break shot on 271.65)
      if (!this.dropEarned(c.beat, c.earn)) continue;
      this.dropsDone.add(c.beat);
      this.dropCapBeat = c.beat;
      this.crowd.setCap(c.cap);
      this.crowd.set(Math.max(this.crowd.value, C.bigCatchAt + C.dropBonus));
      this.log('drop', { beat: c.beat });
    }
  }

  private dropEarned(beat: number, earn?: number[]): boolean {
    const w = Tun.crowd.dropWindowBeats;
    const clean = (g: string | null) => g === 'perfect' || g === 'great';
    for (let pi = 0; pi < this.level.phrases.length; pi++) {
      const ph = this.level.phrases[pi];
      const end = ph.beats[ph.beats.length - 1];
      if (end > beat + 1e-6 || end < beat - w) continue;
      const acts = this.level.actions.filter((a) => a.phrase === pi && (a.type === 'jump' || a.type === 'strike'));
      if (acts.length && acts.every((a) => clean(this.judge.gradeAt(a.beat, a.type)))) return true;
    }
    if (earn?.length) return earn.every((b) => this.level.actions.some((a) => Math.abs(a.beat - b) < 1e-6 && clean(this.judge.gradeAt(b, a.type))));
    return false;
  }

  private startSetPiece(name: string, beat: number, beats: number): void {
    this.setPiece = { name, beat, beats };
    this.events.emit('setPiece', { name, beat, beats });
    this.log('setPiece', { name, beat });
  }

  // ====================================================================== mechanics

  private updateSlams(beatW: number): void {
    for (const f of this.level.slams) {
      const st = slamState(f, beatW, this.level.swing);
      f.solid.active = st.solid;
      f.lift = st.lift;
      const down = st.lift === 0;
      if (down && !f.wasDown && Math.abs(f.solid.x - this.player.x) < 2200) {
        // SLAM: spray off the board
        const cx = f.solid.x + f.solid.w / 2;
        this.particles.emit({ x: cx, y: f.solid.y + 10, count: 10, speed: [150, 500], angle: -Math.PI / 2, spread: 2.4, life: [0.2, 0.45], size: [6, 14], color: '#9A948A', gravity: 1400, drag: 2, shrink: 1 });
      }
      f.wasDown = down;
    }
  }

  private updateEntities(dt: number, beatW: number): void {
    const L = this.level;
    for (const e of L.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt * 6);
      e.jabT = Math.max(0, e.jabT - dt);
      if (e.alive && !e.retired) continue;
      e.deadTime += dt;
      if (e.deadTime < 3) {
        e.vy += (e.retired && e.alive ? 600 : e.heaved ? 1800 : 2600) * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot += e.vrot * dt;
      }
    }
    for (const h of L.hazards) {
      if (h.alive) continue;
      h.vy += 2600 * dt;
      h.offX += h.vx * dt;
      h.offY += h.vy * dt;
      h.rot += 10 * dt;
    }
    for (const f of L.pendulums) {
      const th = f.amp * Math.sin((2 * Math.PI * (beatW - f.beat)) / 4);
      f.x = f.pivotX + f.len * Math.sin(th);
      f.y = f.pivotY + f.len * Math.cos(th);
    }
    const now = this.stepTime;
    for (const h of this.loose) {
      if (h.collected) continue;
      h.t += dt;
      h.vx *= Math.exp(-3 * dt);
      h.vy += (h.vy < 0 ? 1600 : 300) * dt;
      h.vy *= Math.exp(-4 * dt);
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (now > h.expires) h.collected = true;
    }
  }

  /** things that happen once per beat: jabber jabs (presentation), telegraph SFX on the audio clock */
  private beatEvents(beatW: number): void {
    const k = Math.floor(beatW);
    if (k === this.lastWholeBeat) return;
    this.lastWholeBeat = k;
    if (!this.conductor.playing) return;
    const L = this.level;
    const px = this.player.x;
    const ppb = L.ppb;
    const view0 = px - 2 * ppb;
    const view1 = px + 6 * ppb;
    for (const e of L.enemies) if (e.alive && !e.retired && e.x > view0 && e.x < view1) e.jabT = 0.12;
    const ctxAt = (b: number) => this.conductor.ctxTimeAtSongTime(this.tempo.beatToTime(b));
    // slam platform clack: 1 beat before each slam (slams slam every beat, alternating sets)
    if (L.slams.some((f) => f.solid.x > view0 && f.solid.x < view1 && f.beat >= k + 1)) this.sfx.clack(ctxAt(k + 1));
    // jabber squawk: rising wind-up 1 beat before its jab beat
    for (const e of L.enemies) if (e.alive && !e.retired && Math.abs(e.beat - (k + 2)) < 1e-6) this.sfx.windup(ctxAt(k + 1));
    // act 2: bottle whistle / ball rumble 1 beat before each arrival
    this.mech.beat(k);
  }

  /** act-2 mechanics (src/game/mech): what they need from the game — stumbles, deaths, rewards, juice, telegraphs */
  private mechHost(): MechHost {
    return {
      stumble: (cause) => this.stumble(cause),
      die: (cause) => this.die(cause),
      batted: (b) => {
        // a thrown bottle batted back ON its beat: tokens + the bottle chime, a bigger hit than a static bottle
        this.stats.lums += b.tokens;
        this.batted.add(b.id);
        this.stats.breakables = this.level.breakables.filter((x) => x.broken).length + this.batted.size;
        this.player.strikeHitSomething = true;
        const tones = chordAt(this.song, b.beat);
        this.sfx.chime(this.song.key.root + 36 + tones[b.id % tones.length], true);
        this.sfx.lum(collectibleNote(this.song, b.beat, 3));
        this.camera.addTrauma(0.18);
        this.zoomPunch(0.025);
        this.particles.emit({ x: b.x, y: b.y, count: 18, speed: [250, 800], life: [0.25, 0.55], size: [5, 12], color: '#CFE8E0', shape: PShape.Spark, drag: 2 });
        this.particles.emit({ x: b.x, y: b.y, count: b.tokens * 2, speed: [250, 650], angle: -Math.PI / 2, spread: 1.8, life: [0.5, 0.9], size: [10, 16], color: '#E0B64A', gravity: 1400, drag: 1, shape: PShape.Square, shrink: 1 });
        this.log('bat', { beat: b.beat, at: this.stepTime });
      },
      fx: (kind, x, y) => {
        if (kind === 'scramble') {
          this.emitDust(x, y, 8, 0);
          this.log('scramble', { beat: this.worldBeat });
          return;
        }
        const fire = kind === 'ignite';
        this.particles.emit({ x, y: y - 10, count: fire ? 26 : 14, speed: [150, fire ? 700 : 500], angle: -Math.PI / 2, spread: fire ? 1.2 : 2.4, life: [0.25, 0.6], size: [6, 14], color: fire ? '#FF4A3D' : kind === 'ballHit' ? '#3A302A' : '#CFE8E0', shape: PShape.Spark, gravity: fire ? -200 : 1600, drag: 2, shrink: 1 });
        if (this.stage.mechFx(kind)) return;
        if (fire) this.sfx.stomp();
        else this.sfx.hit();
      },
      telegraph: (kind, beat) => {
        const t = this.conductor.ctxTimeAtSongTime(this.tempo.beatToTime(beat));
        if (this.stage.mechTelegraph(kind, beat)) return;
        if (kind === 'whistle') this.sfx.windup(t);
        else this.sfx.clack(t);
      },
    };
  }

  /**
   * THE BURN (iteration 3, "the Burn remembers"): its front sits `gap` beats behind the music line. Stumbles and
   * missed rewards PULL it closer (feedBurn), clean play lets it back off, and on every drum fill it LUNGES.
   * `rel` (its actual distance) chases `gap` at Tun.chaser.closeRate; the lunge rides on top. Touching it = death.
   */
  private updateChaser(dt: number, beatW: number): void {
    const L = this.level;
    const B = Tun.chaser;
    const p = this.player;
    const c = this.chaser;
    if (beatW < L.chaserBeat) return;
    // act 3: the Burn retires for the finale (the level's `chaser { off }` beat): it can't kill after it
    if (this.mech.act3.burnRetired(beatW)) {
      c.active = false;
      c.x = -Infinity;
      c.danger = 0;
      c.lunge = 0;
      return;
    }
    const dBeats = dt / this.tempo.secondsPerBeatAt(beatW);
    if (!c.active) {
      c.active = true;
      c.riseBeat = Math.max(L.chaserBeat, beatW);
      c.rel = c.gap + 0.5;
    }
    c.gap = Math.min(B.restGap + this.burnRestBonus, c.gap + B.relaxPerBeat * dBeats);
    const step = B.closeRate * dBeats;
    c.rel = c.rel > c.gap ? Math.max(c.gap, c.rel - step) : Math.min(c.gap, c.rel + step);
    // drum-fill lunges (deterministic from the world beat, so rewinds replay them exactly)
    while (this.lungeIdx < this.lungeBeats.length && this.lungeBeats[this.lungeIdx] <= beatW) {
      this.burnStats.lunges++;
      this.events.emit('burn', { kind: 'lunge', beat: this.lungeBeats[this.lungeIdx], gap: c.gap, danger: c.danger });
      this.lungeIdx++;
    }
    const last = this.lungeIdx > 0 ? this.lungeBeats[this.lungeIdx - 1] : -Infinity;
    const d = beatW - last;
    c.lunge = d < 0 ? 0 : d < B.lungeRise ? Math.sin((d / B.lungeRise) * Math.PI * 0.5) : d < B.lungeRise + B.lungeFall ? 1 - (d - B.lungeRise) / B.lungeFall : 0;
    c.x = (beatW - c.rel + B.lungeBeats * c.lunge) * L.ppb;
    c.flare = Math.max(0, c.flare - dBeats * 0.5);
    const margin = (p.x - p.w / 2 + Tun.player.hurtInset - c.x) / L.ppb;
    c.danger = clamp(1 - margin / B.restGap, 0, 1);
    if (beatW > c.riseBeat + B.riseBeats) this.burnStats.minMarginBeats = Math.min(this.burnStats.minMarginBeats, margin);
    if (margin < 0) {
      this.burnStats.caught++;
      this.events.emit('burn', { kind: 'caught', beat: beatW, gap: c.gap, danger: 1 });
      this.die('chaser');
    }
  }

  /** feed the Burn: it jumps `beats` closer (a stumble, a missed reward) */
  private feedBurn(beats: number): void {
    const c = this.chaser;
    c.gap = Math.max(0, c.gap - beats);
    c.flare = Math.min(1, c.flare + beats / Tun.chaser.stumblePull);
    this.burnStats.pulls++;
    this.events.emit('burn', { kind: 'pull', beat: this.worldBeat, gap: c.gap, danger: c.danger });
  }

  /** hits push the Burn back a little */
  private starveBurn(beats: number): void {
    this.chaser.gap = Math.min(Tun.chaser.restGap + this.burnRestBonus, this.chaser.gap + beats);
  }

  private scratchRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private hurtRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private interact(beatW: number): void {
    const p = this.player;
    const L = this.level;
    const hurt = p.hurtbox(this.hurtRect);

    // --- strike vs jabbers and pendulums (the strike always wins over a same-beat jab)
    if (p.strikeActive) {
      const cb = p.strikeBox(this.scratchRect);
      for (const e of L.enemies) {
        if (!e.alive || e.retired) continue;
        if (overlaps(cb, enemyRect(e, 1))) this.hitJabber(e);
      }
      for (const f of L.pendulums) {
        if (f.struck) continue;
        if (circleRect(f.x, f.y, f.r, cb)) this.hitPendulum(f);
      }
      for (const b of L.breakables) {
        if (b.broken || Math.abs(b.x - p.x) > 400) continue;
        if (circleRect(b.x, b.y, b.r, cb)) this.hitBreakable(b);
      }
    }
    this.levelProps(beatW, hurt);
    // --- jabbers: truce-flag bounce on the offbeat, body/jab contact = stumble
    const off = beatW - Math.floor(beatW);
    const flagOut = Math.abs(off - L.swing) < 0.22;
    for (const e of L.enemies) {
      if (!e.alive || e.retired) continue;
      if (flagOut && p.vy > 0) {
        const fx0 = e.x - 118;
        const fy = e.y - 128;
        if (p.x + p.w / 2 > fx0 && p.x - p.w / 2 < fx0 + 70 && p.py <= fy + 2 && p.y >= fy) {
          p.y = fy;
          p.vy = Tun.jabberFlag.bounceVY;
          p.jumping = this.controls.jump;
          p.kick(0.75, 1.3);
          this.sfx.hop(undefined, true);
          this.emitDust(p.x, p.y, 8, 0);
          continue;
        }
      }
      if (!overlaps(hurt, enemyRect(e, JABBER.hurtK))) continue;
      if (p.striking && p.strikeTime < Tun.strike.startup + Tun.strike.active + 0.05) this.hitJabber(e);
      else if (!p.invulnerable) {
        e.retired = true;
        e.deadTime = 0;
        e.jabT = 0.25;
        e.vx = 500;
        e.vy = -1100;
        e.vrot = 0;
        this.stumble(`jabber@${e.beat}`);
      }
    }
    // --- spikes
    for (const h of L.hazards) {
      if (!h.alive) continue;
      if (overlaps(hurt, h.rect) && !p.invulnerable) {
        h.alive = false;
        h.vx = 500 + Math.random() * 200;
        h.vy = -900;
        this.stumble(`spike@${h.beat}`);
      }
    }
    // --- lums (generous circle vs box)
    const cx = p.x;
    const cy = p.y - p.h / 2;
    for (const l of L.lums) {
      if (l.collected || l.skipped) continue;
      if (Math.abs(l.x - cx) > 140) continue;
      const dx = Math.max(Math.abs(l.x - cx) - p.w / 2, 0);
      const dy = Math.max(Math.abs(l.y - cy) - p.h / 2, 0);
      if (dx * dx + dy * dy <= 44 * 44) this.collectLum(l.id);
    }
    for (const h of this.loose) {
      if (h.collected || h.t < 0.35) continue;
      if (Math.abs(h.x - cx) < 70 && Math.abs(h.y - cy) < 80) {
        h.collected = true;
        this.stats.lums++;
        this.sfx.lum(collectibleNote(this.song, beatW, this.lumStreak.count++));
      }
    }
    // --- checkpoints
    L.checkpoints.forEach((cp, i) => {
      if (!cp.reached && p.x >= cp.x) this.reachCheckpoint(i);
    });
    // --- finish
    if (p.x >= L.finishX) this.finish();
    // --- the pit
    if (p.y > Tun.flow.killY) this.die('pit');
  }

  private gradePress(verb: 'jump' | 'strike', t: number): void {
    const r = this.judge.press(verb, t);
    if (!r) return;
    this.onGrade(r);
  }

  private onGrade(r: JudgeResult): void {
    const p = this.player;
    const C = Tun.crowd;
    this.crowd.add(r.grade === 'perfect' ? C.perPerfect : r.grade === 'great' ? C.perGreat : C.perGood);
    if (r.grade === 'good') this.breakCombo('good');
    else {
      this.combo++;
      this.comboPeak = Math.max(this.comboPeak, this.combo);
    }
    this.starveBurn(Tun.chaser.relaxPerHit);
    this.watchLatency(r.errMs);
    this.autoErr.push(r.errMs);
    const a = r.target.action;
    if (r.grade === 'perfect') {
      if (a.type === 'strike') {
        // the Freeze: the movie's own slow-motion replay — presentation only (zoom punch + speed
        // lines); it never freezes the sim, so a dense run of Perfects can't drag the hero off the grid
        this.zoomPunch(0.02);
        this.freezeFx = 0.2;
      }
      this.particles.emit({ x: p.x, y: p.y - 40, count: 12, speed: [180, 520], life: [0.25, 0.5], size: [6, 12], color: '#E0B64A', shape: PShape.Spark, drag: 3 });
    } else if (r.grade === 'great') {
      this.particles.emit({ x: p.x, y: p.y - 40, count: 7, speed: [150, 400], life: [0.2, 0.4], size: [5, 10], color: '#2FA37A', shape: PShape.Spark, drag: 3 });
    }
    if (params.judge) this.popup(r.grade.toUpperCase(), r.grade === 'perfect' ? '#E0B64A' : r.grade === 'great' ? '#2FA37A' : '#ffffff', `${r.errMs >= 0 ? '+' : ''}${r.errMs.toFixed(0)}`);
    // Hup-Hup-HEY: the phrase's final grade decides the Heave
    let heave = false;
    if (a.phrase >= 0) {
      const ph = this.level.phrases[a.phrase];
      if (Math.abs(a.beat - ph.beats[2]) < 1e-6 && this.judge.phraseComplete(a.phrase)) {
        this.heaveReady.add(a.phrase);
        // the poster's HEAVES = completed Hup-Hup-HEYs, whatever the HEY hits (a goon, a giant, Big Jim)
        this.heaved.add(a.phrase);
        this.stats.heaves = this.heaved.size;
        this.crowd.add(Tun.crowd.perPhrase);
        this.sfx.roar();
        heave = true;
      }
    }
    this.events.emit('grade', { grade: r.grade as 'perfect' | 'great' | 'good', verb: a.type === 'strike' ? 'strike' : 'jump', beat: a.beat, errMs: r.errMs, combo: this.combo, heave, x: p.x, y: p.y });
  }

  private onMissTarget(a: ActionMarker): void {
    if (params.judge) this.popup('miss', '#8F8A80', String(a.beat));
    if (this.phase !== 'run') return;
    // a missed beat costs the crowd, breaks the combo, and a missed REWARD feeds the Burn (skipping the game
    // isn't free); missed threats already cost a stumble / a life
    this.crowd.add(-Tun.crowd.perMiss);
    this.breakCombo('miss');
    if (a.failKind === 'none' && this.chaser.active) this.feedBurn(Tun.chaser.missPull);
    this.events.emit('miss', { verb: a.type === 'strike' ? 'strike' : 'jump', beat: a.beat, failKind: a.failKind, source: a.source });
  }

  /** press errors of the last graded presses: a steady bias means the audio latency isn't calibrated */
  private recentErr: number[] = [];
  private latencyTipShown = false;

  private watchLatency(errMs: number): void {
    const e = this.recentErr;
    e.push(errMs);
    if (e.length > 16) e.shift();
    if (this.latencyTipShown || e.length < 16) return;
    const mean = e.reduce((a, b) => a + b, 0) / e.length;
    if (Math.abs(mean) < 45) return;
    this.latencyTipShown = true;
    this.showToast(`Hitting ${mean > 0 ? 'LATE' : 'EARLY'} every time? Esc → X re-syncs the projector (or nudge with  [  ])`, 4);
    this.log('latencyTip', { meanMs: Math.round(mean) });
  }

  private breakCombo(reason: 'good' | 'miss' | 'stumble' | 'death'): void {
    if (this.combo > 0) this.events.emit('combo', { broken: this.combo, reason });
    this.combo = 0;
  }

  // ====================================================================== failure hints (iteration 3)

  /** the tip shown after the player fails the same thing Tun.hints.after times (once per run) */
  static readonly FAIL_HINTS: Record<string, { text: string; icon: string }> = {
    pit: { text: 'TAP JUMP right at the edge', icon: 'jump' },
    lifts: { text: 'HOP on EVERY beat — the kegs slam on it', icon: 'jump' },
    burn: { text: 'Hit the beats — every miss feeds the BURN', icon: 'burn' },
    jabber: { text: 'X — swing FIRST, on the beat', icon: 'strike' },
    spike: { text: 'Hop the cue racks', icon: 'jump' },
    lowSign: { text: 'HOLD ↓ under the sign', icon: 'down' },
    wall: { text: 'X — smash through on the beat', icon: 'strike' },
  };

  private noteFailure(key: string, death: boolean): void {
    this.fails[key] = (this.fails[key] ?? 0) + 1;
    if (this.fails[key] < Tun.hints.after || this.hintsShown.has(key) || !Game.FAIL_HINTS[key]) return;
    if (death) this.pendingHint = key; // shown on the respawn count-in
    else this.showFailHint(key, this.worldBeat + 0.25);
  }

  private showFailHint(key: string, beat: number): void {
    const h = Game.FAIL_HINTS[key];
    if (!h || this.hintsShown.has(key)) return;
    this.hintsShown.add(key);
    this.level.hints.push({ beat, beats: Tun.hints.beats, text: h.text, icon: h.icon, dynamic: true });
    this.level.hints.sort((a, b) => a.beat - b.beat);
    this.events.emit('hint', { key, text: h.text, icon: h.icon });
    this.log('hint', { key, beat });
  }

  // ====================================================================== level props (iteration 2)

  /** bounce pads (launch), low signs (knee-slide), pools (splash), the crowd cap */
  private levelProps(beatW: number, hurt: Rect): void {
    const p = this.player;
    const L = this.level;
    // act 3's finale: the whole house on its feet for the final hit (the level's `crowd { floor }`)
    const floor = this.mech.act3.crowdFloor(beatW);
    if (floor > 0 && this.crowd.value < floor) this.crowd.set(floor);
    this.crowd.setCap(crowdCapAt(L, beatW < this.dropCapBeat ? this.dropCapBeat : beatW));
    for (const b of L.bouncePads) {
      if (b.used || Math.abs(p.x - b.x) > b.w / 2) continue;
      if (p.y < b.y - BOUNCE.trigger || p.y > b.y + 4) continue;
      // launch when he touches down on the pad — or, if he's hopping over it, before he leaves it
      if ((p.grounded && p.x >= b.x - BOUNCE.fireAhead) || p.x > b.x + b.w / 2 - 30) this.launch(b, beatW);
    }
    for (const sg of L.signs) {
      if (sg.hit || p.invulnerable || !overlaps(hurt, sg.rect)) continue;
      sg.hit = true;
      sg.swing = 1;
      this.stumble(`lowSign@${sg.beat}`);
    }
    const pool = p.grounded && p.y > 10 && L.floorYAt(p.x) > 10;
    if (pool && !this.inPool) {
      this.sfx.land(0.6);
      this.particles.emit({ x: p.x, y: p.y - 10, count: 22, speed: [200, 700], angle: -Math.PI / 2, spread: 1.6, life: [0.3, 0.6], size: [6, 14], color: '#7FB8C9', gravity: 2200, drag: 1, shrink: 1 });
    }
    this.inPool = pool;
  }

  /** LAUNCH: fling the hero so he lands on the pad's landing surface exactly on its landing beat */
  private launch(b: BouncePad, beatW: number): void {
    const p = this.player;
    b.used = true;
    b.kick = 1;
    const sec = Math.max(0.25, this.tempo.beatToTime(b.landBeat) - this.tempo.beatToTime(beatW));
    const v = launchVelocity(sec, p.y - b.landY, p.spb);
    p.y = Math.min(p.y, b.y);
    p.vy = -v;
    p.grounded = false;
    p.jumping = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.kick(0.7, 1.45);
    this.sfx.hop(undefined, true);
    this.sfx.stomp();
    this.zoomPunch(0.035);
    this.camera.addTrauma(0.15);
    this.particles.emit({ x: b.x, y: b.y - 6, count: 26, speed: [250, 800], angle: -Math.PI / 2, spread: 1.3, life: [0.3, 0.7], size: [8, 16], color: '#E0B64A', shape: PShape.Spark, drag: 3 });
    this.log('launch', { beat: b.beat, at: this.stepTime, landBeat: b.landBeat });
    this.startSetPiece('launch', b.beat, b.landBeat - b.beat);
  }

  /** a bottle / crate smashed on its beat: glass + a token burst (tokens go straight to the count) */
  private hitBreakable(b: Breakable): void {
    b.broken = true;
    b.brokenT = 0;
    this.stats.lums += b.tokens;
    this.stats.breakables = this.level.breakables.filter((x) => x.broken).length + this.batted.size;
    this.player.strikeHitSomething = true;
    this.events.emit('smash', { beat: b.beat, x: b.x, y: b.y, big: b.big, giant: b.giant, index: b.giantIndex });
    if (b.giant) {
      // the walkdown kegs: the act's money shot — a real hitstop (repaid, so the hero lands back on the beat)
      this.hitstop = Tun.strike.giantHitstop;
      this.stats.hitstops++;
      this.zoomPunch(0.07);
      this.camera.addTrauma(0.45);
    }
    const tones = chordAt(this.song, b.beat);
    this.sfx.chime(this.song.key.root + 36 + tones[b.id % tones.length], b.big);
    this.sfx.lum(collectibleNote(this.song, b.beat, 2 + (b.id % 3)));
    if (!b.giant) this.camera.addTrauma(b.big ? 0.22 : 0.1);
    if (b.big && !b.giant) this.zoomPunch(0.03);
    this.particles.emit({ x: b.x, y: b.y, count: b.big ? 28 : 16, speed: [250, 900], life: [0.25, 0.6], size: [5, 12], color: '#CFE8E0', shape: PShape.Spark, gravity: 1800, drag: 2 });
    this.particles.emit({ x: b.x, y: b.y, count: b.tokens * 2, speed: [250, 650], angle: -Math.PI / 2, spread: 1.8, life: [0.5, 0.9], size: [10, 16], color: '#E0B64A', gravity: 1400, drag: 1, shape: PShape.Square, shrink: 1 });
    this.log('smash', { beat: b.beat, at: this.stepTime });
  }

  private popup(text: string, color: string, sub = ''): void {
    const p = this.player;
    this.popups.push({ text: sub ? `${text} ${sub}` : text, x: p.x, y: p.y - 150, t: 0, color });
  }

  private stumble(cause: string): void {
    const p = this.player;
    if (p.invulnerable) return;
    this.stats.stumbles++;
    const lag = Number.isFinite(p.musicX) ? (p.musicX - p.x) / this.level.ppb : 0;
    this.stats.stumbleLog.push({ beat: round3(p.x / this.level.ppb), cause, lagBeats: round3(lag) });
    p.stumble();
    this.recoverFrom = this.stepTime;
    // drop lums: they hover for a bar, re-grab them
    const S = Tun.stumble;
    const n = Math.min(S.dropLums, this.stats.lums);
    this.stats.lums -= n;
    const expires = this.stepTime + S.dropHoverBeats * this.tempo.secondsPerBeatAt(this.worldBeat);
    for (let i = 0; i < n; i++) {
      this.loose.push({ x: p.x, y: p.y - 40, vx: (i - (n - 1) / 2) * 160 + 120, vy: -700 - (i % 2) * 150, expires, collected: false, t: 0 });
    }
    this.crowd.stumble();
    this.breakCombo('stumble');
    if (this.chaser.active || this.worldBeat >= this.level.chaserBeat) {
      if (this.burnGrace > 0) {
        this.burnGrace--;
        this.chaser.flare = 1; // it flares (you see it) but doesn't pull
      } else this.feedBurn(Tun.chaser.stumblePull);
    }
    this.events.emit('stumble', { cause, beat: round3(p.x / this.level.ppb) });
    this.noteFailure(cause.split('@')[0], false);
    this.sfx.stumble();
    this.camera.addTrauma(0.35);
    this.flashScreen('#B3201B', 0.12);
    this.particles.emit({ x: p.x, y: p.y - 30, count: 14, speed: [200, 600], life: [0.2, 0.45], size: [6, 12], color: '#B3201B', shape: PShape.Spark, drag: 3 });
    this.log('stumble', { cause, beat: p.x / this.level.ppb });
  }

  private hitJabber(e: Enemy): void {
    const p = this.player;
    const act = this.level.actions.find((a) => a.type === 'strike' && Math.abs(a.beat - e.beat) < 1e-6);
    const heave = !!act && act.phrase >= 0 && this.heaveReady.has(act.phrase);
    e.alive = false;
    e.deadTime = 0;
    e.hitFlash = 1;
    e.heaved = heave;
    p.strikeHitSomething = true;
    if (heave) {
      e.vx = 700;
      e.vy = -2300;
      e.vrot = 18;
    } else {
      // knocked off the screen into the theatre's front row
      e.vx = 350 + p.vx * 0.2;
      e.vy = -700;
      e.vrot = 6;
    }
    this.sfx.thwack(heave);
    this.hitstop = heave ? Tun.strike.heaveHitstop : Tun.strike.hitstop;
    this.stats.hitstops++;
    this.camera.addTrauma(heave ? 0.55 : Tun.juice.shakeOnHit);
    this.zoomPunch(heave ? Tun.juice.zoomPunchHeave : Tun.juice.zoomPunchHit);
    if (heave) this.flashScreen('#E0B64A', 0.25);
    const hx = e.x - e.w / 2;
    const hy = e.y - e.h / 2;
    this.particles.emit({ x: hx, y: hy, count: heave ? 30 : 18, speed: [400, 1200], angle: -0.5, spread: 1.8, life: [0.15, 0.35], size: [10, 18], color: '#F8F1DC', shape: PShape.Spark, drag: 4 });
    this.particles.emit({ x: hx, y: hy, count: 14, speed: [150, 600], life: [0.3, 0.7], size: [8, 16], color: '#E9D8B4', gravity: 1500, drag: 1, shape: PShape.Square, shrink: 1 });
    this.log('kill', { beat: e.beat, heave, at: this.stepTime });
  }

  private hitPendulum(f: PendulumTarget): void {
    f.struck = true;
    f.struckT = 0;
    this.stats.pendulums++;
    const tones = chordAt(this.song, f.beat);
    this.sfx.chime(this.song.key.root + 36 + tones[f.id % tones.length], f.big);
    this.player.strikeHitSomething = true;
    this.camera.addTrauma(f.big ? 0.2 : 0.1);
    this.particles.emit({ x: f.x, y: f.y, count: f.big ? 26 : 16, speed: [200, 700], life: [0.3, 0.7], size: [6, 14], color: '#9A6B45', shape: PShape.Spark, drag: 3 });
    this.particles.emit({ x: f.x, y: f.y, count: f.big ? 8 : 5, speed: [250, 600], angle: -Math.PI / 2, spread: 2, life: [0.5, 0.9], size: [10, 16], color: '#E0B64A', gravity: 1400, drag: 1, shape: PShape.Square, shrink: 1 });
    this.log('snip', { beat: f.beat, at: this.stepTime });
  }

  private collectLum(id: number): void {
    const l = this.level.lums.find((x) => x.id === id);
    if (!l) return;
    l.collected = true;
    l.collectT = 0;
    this.stats.lums++;
    // piano ladder: consecutive lums (within ~1 beat) climb the current chord
    const beatNow = this.tempo.timeToBeat(this.stepTime);
    if (beatNow - this.lumStreak.lastBeat > 1.1) this.lumStreak.count = 0;
    this.lumStreak.lastBeat = beatNow;
    const idx = l.note ?? this.lumStreak.count++;
    this.sfx.lum(collectibleNote(this.song, l.beat, idx));
    this.particles.emit({ x: l.x, y: l.y, count: 8, speed: [120, 380], life: [0.25, 0.5], size: [5, 10], color: '#E0B64A', drag: 3, shrink: 1 });
  }

  private onCrowdChange(n: number): void {
    // reward overlay stems (shouts / stomps+claps / cowbell / bonus) follow the crowd: audio/mix.ts
    // (the stems + the projection booth follow the crowd via the 'crowd' event: StageAudio.listen)
    void n;
  }

  // ====================================================================== player event hooks

  private logAction(type: 'jump' | 'strike' | 'slide', pressTime: number): void {
    this.stats.executed.push({ type, simTime: this.stepTime, pressTime, x: this.player.px });
  }

  /** early presses that graded sound ON the target beat (SFX quantisation, DESIGN §4) */
  private quantizedWhen(verb: 'jump' | 'strike'): number | undefined {
    const r = this.judge.last[verb];
    if (!r || r.errMs >= 0 || -r.errMs > Tun.judge.quantizeEarlyMs) return undefined;
    if (this.stepTime - r.target.time > 0.05 || r.target.time - this.stepTime > 0.2) return undefined;
    return this.conductor.ctxTimeAtSongTime(r.target.time);
  }

  private onPlayerJump(kind: string): void {
    const p = this.player;
    this.logAction('jump', this.controls.jumpPressTime);
    this.sfx.hop(this.quantizedWhen('jump'));
    this.emitDust(p.x, p.y, 8, 0);
    if (kind === 'wall') this.camera.addTrauma(0.08);
  }

  private onPlayerLand(vy: number): void {
    const p = this.player;
    const k = clamp(vy / 1800, 0, 1);
    if (this.phase === 'countIn' || this.phase === 'coldOpen') return;
    this.sfx.land(0.25 + k * 0.5);
    this.emitDust(p.x, p.y, 6 + Math.round(k * 10), 0);
    if (k > 0.75) this.camera.addTrauma(Tun.juice.shakeOnLandHard);
  }

  private onPlayerStrike(): void {
    this.logAction('strike', this.controls.strikePressTime);
    this.sfx.strike(this.quantizedWhen('strike'), this.crowd.count >= 4);
  }

  private onPlayerSlide(): void {
    this.logAction('slide', this.controls.downPressTime);
    this.sfx.slide();
    this.emitDust(this.player.x, this.player.y, 10, -1);
  }

  private onFootstep(): void {
    const p = this.player;
    if (this.phase === 'run') this.emitDust(p.x - p.facing * 10, p.y, 2, -p.facing);
  }

  emitDust(x: number, y: number, count: number, dir: number): void {
    this.particles.emit({
      x,
      y: y - 4,
      count,
      speed: [60, 260],
      angle: dir === 0 ? -Math.PI / 2 : dir > 0 ? -0.35 : Math.PI + 0.35,
      spread: dir === 0 ? Math.PI * 1.1 : 1.0,
      life: [0.25, 0.55],
      size: [10, 22],
      color: '#C9B99A',
      gravity: -150,
      drag: 3.5,
      shrink: 1,
    });
  }

  // ====================================================================== juice helpers

  flashScreen(color: string, amount: number): void {
    this.flashColor = color;
    this.flash = Math.max(this.flash, amount);
  }

  zoomPunch(amount: number): void {
    this.tweens.fromTo(this.camera, 'zoomPunch', amount, 0, 0.25, Ease.outCubic);
  }

  private fireFx(fx: string, amount: number): void {
    if (this.scene !== 'play') return;
    switch (fx) {
      case 'flash':
        this.flashScreen('#ffffff', 0.35 * amount);
        break;
      case 'shake':
        this.camera.addTrauma(0.5 * amount);
        break;
      case 'zoom':
        this.zoomPunch(0.06 * amount);
        break;
      case 'bgPulse':
        this.background.pulse = amount;
        break;
      case 'shot':
        // the chorus SHOT (presentation: render/moments.ts reads the level's 'shot' cues itself)
        this.zoomPunch(0.04 * amount);
        break;
    }
  }

  showToast(text: string, seconds = 2): void {
    this.toast = { text, t: seconds };
  }

  // ====================================================================== test API / report

  readonly eventLog: { t: number; type: string; data: Record<string, unknown> }[] = [];
  private log(type: string, data: Record<string, unknown>): void {
    if (this.eventLog.length < 5000) this.eventLog.push({ t: Math.round(this.conductor.time * 1000) / 1000, type, data });
  }

  snapshot() {
    const p = this.player;
    return {
      scene: this.scene,
      phase: this.phase,
      paused: this.paused,
      runId: this.runId,
      songTime: round3(this.conductor.time),
      beat: round3(this.conductor.beat),
      simTime: round3(this.simTime),
      playing: this.conductor.playing,
      audioState: this.audio.ctx.state,
      player: {
        x: Math.round(p.x),
        y: Math.round(p.y),
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        beatPos: round3(p.x / this.level.ppb),
        grounded: p.grounded,
        striking: p.striking,
        alive: p.mode !== 'dead',
        mode: p.mode,
      },
      deaths: this.stats.deaths,
      stumbles: this.stats.stumbles,
      lums: this.stats.lums,
      lumsTotal: this.stats.lumsTotal,
      crowd: this.crowd.count,
      checkpoint: this.checkpointIndex,
      finished: this.stats.finished,
      fps: Math.round(this.frameStats.fps),
      loadError: this.loadError,
    };
  }

  /** What --miss=<beats> should cost, from the level's declared fail kinds. */
  expectedFromMisses(): { deaths: number; stumbles: number; detail: string[] } {
    let deaths = 0;
    let stumbles = 0;
    const detail: string[] = [];
    for (const b of params.miss) {
      const a = this.level.actions.find((x) => Math.abs(x.beat - b) < 1e-6);
      if (!a) continue;
      if (a.failKind === 'death') deaths++;
      if (a.failKind === 'stumble') stumbles++;
      detail.push(`${a.type}@${a.beat}(${a.source}) -> ${a.failKind}`);
    }
    return { deaths, stumbles, detail };
  }

  report() {
    const L = this.level;
    const timings = this.stats.timings(L.actions, this.tempo, L.ppb, params.start ?? L.def.startBeat, L.finishBeat);
    const matched = timings.filter((t) => t.matched);
    const spb = this.tempo.secondsPerBeatAt(L.def.startBeat);
    const jumps = [0.15, 0.25, 0.5, 1].map((hold) => {
      const prof = jumpProfile(hold * spb, L.runSpeed, L.ppb);
      return { holdBeats: hold, airtimeBeats: round3(prof.airtime / spb), apexPx: Math.round(prof.apex) };
    });
    const shouts = new Set(laneBeats(this.song, 'shouts'));
    // enemies (jabbers) are built on the shout grid; pendulum targets are free to sit anywhere
    const strikes = L.actions.filter((a) => a.type === 'strike' && a.source === 'jabber');
    const chorus = this.song.map?.sections.find((s) => s.name.startsWith('chorus'));
    const chorusStrikes = chorus ? strikes.filter((a) => a.beat >= chorus.startBeat && a.beat < chorus.endBeat) : [];
    return {
      level: L.def.id,
      song: this.song.id,
      bpm: this.tempo.bpmAtBeat(L.def.startBeat),
      swing: this.song.swing,
      pixelsPerBeat: L.ppb,
      runSpeed: L.runSpeed,
      tempoMap: { points: this.tempo.points.length, bpmRange: this.tempo.bpmRange().map(round3), runSpeedRange: this.tempo.bpmRange().map((b) => Math.round((L.ppb * b) / 60)) },
      autoplay: params.autoplay,
      jitterMs: params.jitter,
      lateProb: params.late,
      deliberateMisses: params.miss,
      expectedFromMisses: this.expectedFromMisses(),
      completed: this.stats.finished,
      deaths: this.stats.deaths,
      deathLog: this.stats.deathLog,
      stumbles: this.stats.stumbles,
      stumbleLog: this.stats.stumbleLog,
      surgeRecoveryBeats: this.stats.recoveries,
      lums: this.stats.lums,
      lumsTotal: this.stats.lumsTotal,
      pendulums: this.stats.pendulums,
      pendulumsTotal: this.stats.pendulumsTotal,
      breakables: this.stats.breakables,
      breakablesTotal: this.stats.breakablesTotal,
      heaves: this.stats.heaves,
      phrases: this.stats.phrasesTotal,
      grades: { ...this.judge.counts },
      crowd: { end: this.crowd.count, endValue: round3(this.crowd.value), peak: this.crowd.peak, fullHouseBeats: round3(this.fullHouseBeats), trace: this.crowdTrace },
      combo: { peak: this.comboPeak, end: this.combo },
      burn: { ...this.burnStats, minMarginBeats: round3(this.burnStats.minMarginBeats), endGap: round3(this.chaser.gap) },
      failHints: [...this.hintsShown],
      /** final grade per judge target [beat, grade] (split the grades by act / section) */
      targetGrades: this.judge.targets.map((t) => [t.action.beat, t.grade ?? '-']),
      // only meaningful when the level was authored against this song's shout grid
      shoutAlignment:
        L.def.songId === this.song.id
          ? {
              note: 'chorus jabber strikes vs the song map shouts lane (the enemies are built on the shout grid)',
              chorusStrikes: chorusStrikes.length,
              onShout: chorusStrikes.filter((a) => shouts.has(a.beat)).length,
              offShout: chorusStrikes.filter((a) => !shouts.has(a.beat)).map((a) => a.beat),
            }
          : { note: `skipped: level authored against '${L.def.songId}', playing '${this.song.id}'`, chorusStrikes: 0, onShout: 0, offShout: [] as number[] },
      intendedActions: timings.length,
      matchedActions: matched.length,
      missedActions: timings.filter((t) => !t.matched).map((t) => `${t.type}@${t.beat}`),
      timing: {
        note: 'execErr = sim step the action executed vs the beat on the audio clock; pressErr = input event time vs beat; posErr = where the hero physically was vs the authored beat position (ms of running)',
        exec: summarize(matched.map((t) => t.execErrMs)),
        press: summarize(matched.map((t) => t.pressErrMs)),
        position: summarize(matched.map((t) => t.posErrMs)),
      },
      perAction: timings.map((t) => ({ ...t, execErrMs: round3(t.execErrMs), pressErrMs: round3(t.pressErrMs), posErrMs: round3(t.posErrMs) })),
      clock: {
        source: this.conductor.clockSource,
        jitterMs: round3(this.conductor.clockJitterMs),
        maxSimDriftMs: round3(this.stats.maxDriftMs),
        latencyOffsetMs: Math.round(this.conductor.latency * 1000),
        latencyBaseMs: this.latencyBaseMs,
        calibration: this.calib.errs.length ? { resultMs: this.calib.result, tapErrsMs: this.calib.errs.map((e) => Math.round(e)) } : null,
        deviceMs: params.device,
        baseLatencyMs: round3((this.audio.ctx.baseLatency || 0) * 1000),
        outputLatencyMs: round3((this.audio.ctx.outputLatency || 0) * 1000),
        sampleRate: this.audio.ctx.sampleRate,
      },
      beatMapAlignment: this.beatAlignment,
      liveAudioProbe: this.probe
        ? {
            note: `transients (AudioWorklet, graph clock) of the ${this.probe.target}, via the Conductor mapping`,
            onsets: this.probe.onsets,
            ...summarize(this.probe.errorsMs),
          }
        : null,
      jumpAirtimes: jumps,
      hitstops: this.stats.hitstops,
      frames: this.frameStats.summary(),
      events: this.eventLog.slice(-400),
    };
  }
}

function resetEnemy(e: Enemy): void {
  e.alive = true;
  e.retired = false;
  e.heaved = false;
  e.x = e.homeX;
  e.y = e.homeY;
  e.vx = e.vy = e.rot = e.vrot = 0;
  e.deadTime = 0;
  e.hitFlash = 0;
  e.jabT = 0;
}

/** Enemy rect (feet-anchored), optionally shrunk around its center. */
export function enemyRect(e: Enemy, k: number): Rect {
  const w = e.w * k;
  const h = e.h * k;
  return { x: e.x - w / 2, y: e.y - e.h / 2 - h / 2, w, h };
}

function circleRect(cx: number, cy: number, r: number, b: Rect): boolean {
  const dx = Math.max(b.x - cx, 0, cx - (b.x + b.w));
  const dy = Math.max(b.y - cy, 0, cy - (b.y + b.h));
  return dx * dx + dy * dy <= r * r;
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

function safeGetLocal(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSetLocal(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
