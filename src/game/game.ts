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
import { SyncProbe } from '../audio/syncProbe';
import type { TempoMap } from '../audio/tempoMap';
import { DebugOverlay } from '../debug/overlay';
import { Display } from '../engine/display';
import { Controls, Input, type InputEdge } from '../engine/input';
import { clamp, overlaps, type Rect } from '../engine/math';
import { params } from '../engine/params';
import { Ease, TweenManager } from '../engine/tween';
import { JABBER, type RuntimeLevel, buildLevel, cameraZoomAt, slamState } from '../level/build';
import { sliceLevel } from '../level/slice';
import type { LevelDef } from '../level/types';
import { Background } from '../render/background';
import { Camera } from '../render/camera';
import { Groove } from '../render/groove';
import { Particles, PShape } from '../render/particles';
import { Renderer } from '../render/renderer';
import { makeSprites } from '../render/sprites';
import { AutoPlayer } from './autoplay';
import { Crowd } from './crowd';
import type { ActionMarker, Enemy, PendulumTarget, LooseLum } from './entities';
import { Judge, type JudgeResult } from './judge';
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
  readonly crowd = new Crowd();
  /** lums dropped by stumbles */
  loose: LooseLum[] = [];
  /** the Chaser (chaser): world x of its front */
  chaser = { active: false, x: -Infinity, riseBeat: 0 };
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
  private snap = { lums: new Set<number>(), crowd: Tun.crowd.start, pendulums: new Set<number>() };
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
    this.levelDef = sliceLevel;
    this.level = buildLevel(this.levelDef, this.tempo, this.song);
    this.judge = new Judge(this.level.actions, this.tempo);
    this.background = new Background(params.seed);
    this.renderer = new Renderer(this, makeSprites());
    this.debug = new DebugOverlay(this, params.debug);
    this.player = this.makePlayer();
    this.stats.pendulumsTotal = this.level.pendulums.length;

    const stored = safeGetLocal(LATENCY_KEY);
    const lat = params.latencyMs ?? (stored !== null ? Number(stored) : 0);
    this.conductor.latency = (Number.isFinite(lat) ? lat : 0) / 1000;

    this.crowd.onChange = (n) => this.onCrowdChange(n);
    this.input.onGesture(() => void this.audio.unlock());
    for (const cue of this.level.fx) this.conductor.at(cue.beat, () => this.fireFx(cue.fx, cue.amount));
    // the audience yells with the band: a dubbed subtitle on every shout in the song map
    for (const e of this.song.map?.lanes.shouts ?? []) this.conductor.at(e.beat, () => (this.subtitle = { text: `${e.word ?? 'HEY'}!`, t: 0.45 }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.scene === 'play' && !this.paused) this.setPaused(true);
    });
  }

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
      this.conductor.outputDelay = this.audio.limiterDelay;
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
    this.snap = { lums: new Set(), crowd: Tun.crowd.start, pendulums: new Set() };
    this.checkpointIndex = -1;
    for (const cp of this.level.checkpoints) cp.reached = false;
    const start = fromBeat ?? params.start ?? this.level.def.startBeat;
    // lums/pendulums before a mid-level start are skipped (not counted)
    for (const l of this.level.lums) {
      l.collected = false;
      l.skipped = l.beat < start - 1e-6;
    }
    this.stats.lumsTotal = this.level.lums.filter((l) => !l.skipped).length;
    this.stats.pendulumsTotal = this.level.pendulums.filter((f) => f.beat >= start - 1e-6).length;
    this.level.checkpoints.forEach((cp, i) => {
      if (cp.beat <= start + 1e-6) {
        cp.reached = true;
        this.checkpointIndex = i;
      }
    });
    if (params.autoplay) this.bot = new AutoPlayer(this.level.actions, this.tempo, params.miss, params.jitter, params.seed, params.late);
    const cold = fromBeat === undefined && params.start === null && this.level.def.coldOpen && params.coldOpen;
    this.crowd.awake = false;
    this.crowd.count = 0;
    this.crowd.peak = 0;
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
    this.snap.crowd = this.crowd.count;
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
    this.loose = [];
    this.popups = [];
    this.chaser = { active: false, x: -Infinity, riseBeat: 0 };
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
    this.stats.lums = this.snap.lums.size;
    this.stats.pendulums = this.snap.pendulums.size;
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
    this.conductor.setCrowdLevel(this.crowd.count, true);
    this.conductor.play(from);
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
    this.phase = 'dying';
    this.phaseTimer = Tun.flow.deathTime;
    this.stats.deaths++;
    this.stats.deathLog.push({ beat: round3(this.player.x / this.level.ppb), cause });
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
    // the crowd forgives a little: back to the checkpoint's count, minus a stumble's worth
    this.crowd.set(Math.floor(this.snap.crowd * (1 - Tun.crowd.stumbleLoss)));
    this.spawnAt(beat);
  }

  private finish(): void {
    if (this.phase !== 'run') return;
    this.phase = 'finished';
    this.phaseTimer = Tun.flow.finishEndScreenDelay;
    this.player.mode = 'finished';
    this.stats.finished = true;
    this.stats.finishedAt = performance.now();
    this.sfx.finish(this.song.key.root + 24);
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
      crowd: this.crowd.count,
      pendulums: new Set(this.level.pendulums.filter((f) => f.struck).map((f) => f.id)),
    };
    this.sfx.checkpoint(this.song.key.root + 24);
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
    const edges = this.input.drain();
    this.handleMetaInput(edges);

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
    for (const pu of this.popups) pu.t += presDt;
    this.subtitle.t = Math.max(0, this.subtitle.t - presDt);
    this.freezeFx = Math.max(0, this.freezeFx - presDt);
    if (this.popups.length && this.popups[0].t > 1) this.popups = this.popups.filter((p) => p.t < 1);
    if (this.phase === 'coldOpen') this.coldOpenT += presDt;

    const p = this.player;
    const ix = p.px + (p.x - p.px) * this.alpha;
    const iy = p.py + (p.y - p.py) * this.alpha;
    if (this.scene === 'play') this.camera.zoom = cameraZoomAt(this.level, this.conductor.playing ? this.conductor.beat : this.spawnBeat, Tun.camera.zoom);
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
        this.conductor.latency = ms / 1000;
        safeSetLocal(LATENCY_KEY, String(ms));
        this.showToast(`Audio latency offset: ${ms} ms`);
      }
      if (e.button === 'pause' && this.scene === 'play' && this.phase !== 'coldOpen') this.setPaused(!this.paused);
      else if (this.paused && (e.button === 'start' || e.button === 'jump')) this.setPaused(false);
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
    if (this.bot && (this.phase === 'coldOpen' || this.phase === 'countIn' || this.phase === 'run')) this.bot.update(t, dt, this.controls, this.heroView());

    if (this.phase === 'coldOpen') {
      const strike = this.controls.strikePressed;
      this.player.step(dt, this.controls, this.level.world);
      this.controls.clearEdges();
      if (strike) this.beginFromColdOpen();
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
    this.worldBeat = beatW;
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
  }

  private updateChaser(dt: number, beatW: number): void {
    const L = this.level;
    const B = Tun.chaser;
    const p = this.player;
    if (beatW < L.chaserBeat) return;
    const target = (beatW - B.behindBeats) * L.ppb;
    if (!this.chaser.active) {
      this.chaser.active = true;
      this.chaser.x = Math.min(target, p.x - (B.behindBeats + 0.5) * L.ppb);
      this.chaser.riseBeat = Math.max(L.chaserBeat, beatW);
    } else {
      this.chaser.x = Math.min(target, this.chaser.x + p.runSpeed * B.catchUpMul * dt);
    }
    if (p.x - p.w / 2 + Tun.player.hurtInset < this.chaser.x) this.die('chaser');
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
    }
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
    this.crowd.add(Tun.crowd.perGood);
    const a = r.target.action;
    if (r.grade === 'perfect') {
      const note = collectibleNote(this.song, a.beat, 4);
      this.sfx.perfect(note + 12);
      if (a.type === 'strike') {
        // the Freeze: the movie's own slow-motion replay — presentation only (zoom punch + speed
        // lines); it never freezes the sim, so a dense run of Perfects can't drag the hero off the grid
        this.zoomPunch(0.02);
        this.freezeFx = 0.2;
      }
      this.particles.emit({ x: p.x, y: p.y - 40, count: 12, speed: [180, 520], life: [0.25, 0.5], size: [6, 12], color: '#E0B64A', shape: PShape.Spark, drag: 3 });
    } else if (r.grade === 'great') {
      this.sfx.great();
      this.particles.emit({ x: p.x, y: p.y - 40, count: 7, speed: [150, 400], life: [0.2, 0.4], size: [5, 10], color: '#2FA37A', shape: PShape.Spark, drag: 3 });
    }
    if (params.judge) this.popup(r.grade.toUpperCase(), r.grade === 'perfect' ? '#E0B64A' : r.grade === 'great' ? '#2FA37A' : '#ffffff', `${r.errMs >= 0 ? '+' : ''}${r.errMs.toFixed(0)}`);
    // Hup-Hup-HEY: the phrase's final grade decides the Heave
    if (a.phrase >= 0) {
      const ph = this.level.phrases[a.phrase];
      if (Math.abs(a.beat - ph.beats[2]) < 1e-6 && this.judge.phraseComplete(a.phrase)) {
        this.heaveReady.add(a.phrase);
        this.crowd.add(Tun.crowd.perPhrase);
        this.sfx.roar();
      }
    }
  }

  private onMissTarget(a: ActionMarker): void {
    if (params.judge) this.popup('miss', '#8F8A80', String(a.beat));
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
      this.stats.heaves++;
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
    this.conductor.setCrowdLevel(n);
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
    }
  }

  showToast(text: string): void {
    this.toast = { text, t: 2 };
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
      heaves: this.stats.heaves,
      phrases: L.phrases.length,
      grades: { ...this.judge.counts },
      crowd: { end: this.crowd.count, peak: this.crowd.peak },
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
