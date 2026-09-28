/**
 * Game: owns every system and runs the frame loop.
 *
 * TIME MODEL (the heart of music sync)
 *   - While the song plays, the fixed-step simulation is SLAVED to the Conductor's audio clock:
 *     each frame we step until simTime catches up with conductor.time (song seconds). Sim time
 *     therefore can never drift from the music; render interpolates with alpha = leftover/step.
 *   - When no music plays (title, death sequence) the sim runs from a wall-clock accumulator.
 *   - Input edges are timestamped and applied on the exact step whose song time they fall in.
 *   - Hitstop freezes the world for a few steps but the music keeps going; the lost time is
 *     repaid by running the sim slightly faster right after (Tun.punch.catchUpRate), so the
 *     hero ends up exactly back on the beat.
 */
import { AudioSystem } from '../audio/audioSystem';
import { Conductor } from '../audio/conductor';
import { placeholderSong } from '../audio/placeholderSong';
import { analyzeBeatAlignment, collectibleNote, loadSongBuffer, makeTempoMap, type SongDef } from '../audio/song';
import { Sfx } from '../audio/sfx';
import { SyncProbe } from '../audio/syncProbe';
import type { TempoMap } from '../audio/tempoMap';
import { DebugOverlay } from '../debug/overlay';
import { Display } from '../engine/display';
import { Controls, Input, type InputEdge } from '../engine/input';
import { clamp, overlaps, type Rect } from '../engine/math';
import { params } from '../engine/params';
import { Ease, TweenManager } from '../engine/tween';
import { type RuntimeLevel, buildLevel } from '../level/build';
import { testLevel } from '../level/testLevel';
import type { LevelDef } from '../level/types';
import { Background } from '../render/background';
import { Camera } from '../render/camera';
import { Groove } from '../render/groove';
import { Particles, PShape } from '../render/particles';
import { Renderer } from '../render/renderer';
import { makeSprites } from '../render/sprites';
import { AutoPlayer } from './autoplay';
import type { Enemy } from './entities';
import { jumpProfile } from './jumpProfile';
import { Player } from './player';
import { FrameStats, RunStats, summarize } from './stats';
import { Tun } from './tunables';

export type Scene = 'loading' | 'title' | 'play' | 'end';
export type Phase = 'countIn' | 'run' | 'dying' | 'finished';

const LATENCY_KEY = 'opuslegends.latencyMs';

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

  /** beat the current attempt was spawned at */
  spawnBeat = 0;
  releaseTime = 0;
  checkpointIndex = -1;
  private lumSnapshot = new Set<number>();
  private lumStreak = { count: 0, lastBeat: -99 };
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

  constructor(canvas: HTMLCanvasElement) {
    this.display = new Display(canvas);
    this.audio = new AudioSystem(params.mute);
    this.song = placeholderSong;
    this.tempo = makeTempoMap(this.song);
    this.conductor = new Conductor(this.audio.ctx, this.audio.music, this.song, this.tempo);
    this.sfx = new Sfx(this.audio.ctx, this.audio.sfx);
    this.levelDef = testLevel;
    this.level = buildLevel(this.levelDef, this.tempo);
    this.background = new Background(params.seed);
    this.renderer = new Renderer(this, makeSprites());
    this.debug = new DebugOverlay(this, params.debug);
    this.player = this.makePlayer();

    const stored = safeGetLocal(LATENCY_KEY);
    const lat = params.latencyMs ?? (stored !== null ? Number(stored) : 0);
    this.conductor.latency = (Number.isFinite(lat) ? lat : 0) / 1000;

    this.input.onGesture(() => void this.audio.unlock());
    for (const cue of this.level.fx) this.conductor.at(cue.beat, () => this.fireFx(cue.fx, cue.amount));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.scene === 'play' && !this.paused) this.setPaused(true);
    });
  }

  private makePlayer(): Player {
    const p = new Player({
      jump: (kind) => this.onPlayerJump(kind),
      land: (vy) => this.onPlayerLand(vy),
      punch: () => this.onPlayerPunch(),
      slide: () => this.onPlayerSlide(),
      footstep: () => this.onFootstep(),
    });
    p.setWorld(this.level.world);
    return p;
  }

  async load(): Promise<void> {
    try {
      const buf = await loadSongBuffer(this.song, this.audio.ctx, this.tempo);
      this.conductor.buffer = buf;
      if (params.autoplay || params.probe) this.probe = await SyncProbe.create(this.audio.ctx, this.audio.music, this.conductor);
      this.beatAlignment = analyzeBeatAlignment(buf, this.tempo, this.song.audioOffset, 1, Math.min(this.song.lengthBeats, 67));
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

  /** Start a run from the level start (or ?start=<beat>). */
  startRun(fromBeat?: number): void {
    this.runId++;
    this.scene = 'play';
    this.paused = false;
    this.stats.reset();
    this.frameStats.reset();
    this.lumSnapshot.clear();
    this.checkpointIndex = -1;
    for (const cp of this.level.checkpoints) cp.reached = false;
    const start = fromBeat ?? params.start ?? this.level.def.startBeat;
    // lums before a mid-level start are skipped (not counted)
    for (const l of this.level.lums) {
      l.collected = false;
      l.skipped = l.beat < start - 1e-6;
    }
    this.stats.lumsTotal = this.level.lums.filter((l) => !l.skipped).length;
    // mark checkpoints behind the start as reached
    this.level.checkpoints.forEach((cp, i) => {
      if (cp.beat <= start + 1e-6) {
        cp.reached = true;
        this.checkpointIndex = i;
      }
    });
    if (params.autoplay) this.bot = new AutoPlayer(this.level.actions, this.tempo, params.miss);
    this.spawnAt(start);
  }

  /** (Re)spawn at a beat: reset entities ahead, place the hero, rewind the music with a count-in. */
  private spawnAt(beat: number): void {
    this.spawnBeat = beat;
    this.phase = 'countIn';
    this.hitstop = 0;
    this.debt = 0;
    this.fade = 0;
    this.lumStreak = { count: 0, lastBeat: -99 };
    for (const e of this.level.enemies) if (e.beat >= beat - 0.5) resetEnemy(e);
    for (const l of this.level.lums) {
      if (l.skipped) continue;
      l.collected = this.lumSnapshot.has(l.id);
      l.collectT = l.collected ? 99 : 0;
    }
    this.stats.lums = this.lumSnapshot.size;
    const x = beat * this.level.ppb;
    const y = this.level.floorYAt(x);
    this.player.spawn(x, Number.isNaN(y) ? 0 : y, this.level.runSpeed, this.level.ppb);
    this.controls.reset();
    // keep currently held directions so a player holding right launches immediately
    if (this.input.isHeld('right')) this.controls.apply('right', true, 0);
    if (this.bot) this.bot.reset(beat, this.controls);
    this.pendingEdges = [];
    const from = this.tempo.beatToTime(beat - Tun.flow.countInBeats);
    this.releaseTime = this.tempo.beatToTime(beat);
    this.conductor.play(from);
    this.simTime = from;
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
    this.stats.deathLog.push({ beat: this.player.x / this.level.ppb, cause });
    this.player.mode = 'dead';
    this.conductor.stop('tape');
    this.sfx.death();
    this.camera.addTrauma(Tun.juice.shakeOnDeath);
    this.flashScreen('#ff3355', 0.45);
    const p = this.player;
    this.particles.emit({ x: p.x, y: p.y - p.h / 2, count: 40, speed: [200, 900], life: [0.4, 0.9], size: [8, 20], color: '#fff3e0', gravity: 1400, drag: 1.5, shrink: 1 });
    this.particles.emit({ x: p.x, y: p.y - p.h / 2, count: 20, speed: [100, 600], life: [0.5, 1.1], size: [10, 26], color: '#ff4a6e', gravity: 900, drag: 2, shrink: 1 });
    this.log('death', { cause, beat: p.x / this.level.ppb });
  }

  private respawn(): void {
    const cp = this.level.checkpoints[this.checkpointIndex];
    const beat = cp ? cp.beat : (params.start ?? this.level.def.startBeat);
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
      this.particles.emit({ x: this.level.finishX, y: this.player.y - 300 - i * 60, count: 24, speed: [200, 700], life: [0.8, 1.6], size: [8, 16], color: ['#ffd23f', '#ff5d8f', '#5de0ff', '#8dff6a', '#ffffff'][i], gravity: 600, drag: 1, shape: PShape.Square, shrink: 0.5 });
    }
    this.log('finish', {});
  }

  private reachCheckpoint(i: number): void {
    const cp = this.level.checkpoints[i];
    cp.reached = true;
    cp.flash = 1;
    this.checkpointIndex = i;
    this.lumSnapshot = new Set(this.level.lums.filter((l) => l.collected).map((l) => l.id));
    this.sfx.checkpoint(this.song.key.root + 24);
    this.particles.emit({ x: cp.x, y: cp.y - 160, count: 30, speed: [150, 500], life: [0.5, 1], size: [6, 12], color: '#ffd23f', gravity: 500, drag: 1.5, shape: PShape.Square });
    this.showToast('Checkpoint');
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
    this.groove.set(
      this.conductor.playing || this.scene === 'play' ? this.conductor.time : now / 1000,
      this.conductor.playing || this.scene === 'play' ? this.conductor.beat : (now / 1000) * (this.tempo.bpmAtBeat(0) / 60),
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
    for (const cp of this.level.checkpoints) cp.flash = Math.max(0, cp.flash - presDt * 1.5);
    for (const l of this.level.lums) if (l.collected) l.collectT += presDt;

    const p = this.player;
    const ix = p.px + (p.x - p.px) * this.alpha;
    const iy = p.py + (p.y - p.py) * this.alpha;
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
      if (e.button === 'pause' && this.scene === 'play') this.setPaused(!this.paused);
      else if (this.paused && (e.button === 'start' || e.button === 'jump')) this.setPaused(false);
    }
    if (this.scene === 'title' && this.input.anyPressed && this.conductor.buffer) {
      void this.audio.unlock().then(() => {
        if (this.scene === 'title') this.startRun();
      });
      this.sfx.ui();
    }
    if (this.scene === 'end' && edges.some((e) => e.down && (e.button === 'start' || e.button === 'jump'))) {
      this.startRun(this.level.def.startBeat);
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
          break; // respawned: music clock takes over
        }
      }
      this.alpha = this.conductor.playing ? 0 : this.freeAcc / dt;
    }
    // any edges left (timestamped slightly in the future due to clock jitter) apply next frame
  }

  /** One fixed simulation step ending at song time `t`. */
  private tick(dt: number, t: number): void {
    // input for this step
    while (this.pendingEdges.length && this.pendingEdges[0].t <= t) {
      const { e, t: et } = this.pendingEdges.shift()!;
      this.controls.apply(e.button, e.down, Number.isFinite(et) ? et : t);
    }
    if (this.bot && (this.phase === 'countIn' || this.phase === 'run')) this.bot.update(t, dt, this.controls);

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
      const extra = Math.min(this.debt, dt * Tun.punch.catchUpRate);
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
    p.musicX = this.conductor.playing && this.phase === 'run' ? this.tempo.timeToBeat(w0) * this.level.ppb : NaN;
    p.step(dt, this.controls, this.level.world);
    this.controls.clearEdges();
    this.updateEnemies(dt);

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
    this.interact();
  }

  /** song time at the start of the current sim step (for action logging) */
  private stepTime = 0;

  private updateEnemies(dt: number): void {
    for (const e of this.level.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt * 6);
      if (e.alive) continue;
      e.deadTime += dt;
      if (e.deadTime < 3) {
        e.vy += 2600 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot += e.vrot * dt;
      }
    }
  }

  private scratchRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private interact(): void {
    const p = this.player;
    const L = this.level;
    const body = p.hitbox();

    // --- punch vs enemies
    if (p.punchActive) {
      const pb = p.punchBox(this.scratchRect);
      for (const e of L.enemies) {
        if (!e.alive) continue;
        if (overlaps(pb, enemyRect(e, 1))) this.killEnemy(e, 'punch');
      }
    }
    // --- body vs enemies (hurtbox shrunk for fairness)
    for (const e of L.enemies) {
      if (!e.alive) continue;
      const er = enemyRect(e, 0.72);
      if (!overlaps(body, er)) continue;
      const stomp = p.vy > 50 && p.py <= e.y - e.h + 26;
      if (stomp) {
        this.killEnemy(e, 'stomp');
        p.vy = this.controls.jump ? Tun.stomp.bounceVY * 1.15 : Tun.stomp.bounceVY;
        p.jumping = this.controls.jump;
        p.kick(0.8, 1.25);
      } else if (p.punching) {
        this.killEnemy(e, 'punch');
      } else {
        this.die(`enemy@${e.beat}`);
        return;
      }
    }
    // --- hazards
    for (const h of L.hazards) {
      if (overlaps(body, h.rect)) {
        this.die(`${h.kind}@${(h.rect.x / L.ppb).toFixed(1)}`);
        return;
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
      if (dx * dx + dy * dy <= 40 * 40) this.collectLum(l.id);
    }
    // --- checkpoints
    L.checkpoints.forEach((cp, i) => {
      if (!cp.reached && p.x >= cp.x) this.reachCheckpoint(i);
    });
    // --- finish
    if (p.x >= L.finishX) this.finish();
    // --- pits
    if (p.y > Tun.flow.killY) this.die('fell');
  }

  private killEnemy(e: Enemy, how: 'punch' | 'stomp'): void {
    e.alive = false;
    e.deadTime = 0;
    e.hitFlash = 1;
    const p = this.player;
    p.punchHitSomething = true;
    if (how === 'punch') {
      e.vx = 1400 * p.facing + p.vx * 0.5;
      e.vy = -900;
      e.vrot = 14 * p.facing;
      this.sfx.hit();
    } else {
      e.vx = p.vx * 0.3;
      e.vy = 300;
      e.vrot = 4;
      this.sfx.stomp();
    }
    this.hitstop = Tun.punch.hitstop;
    this.stats.hitstops++;
    this.camera.addTrauma(Tun.juice.shakeOnHit);
    this.zoomPunch(Tun.juice.zoomPunchHit);
    const hx = e.x - (e.w / 2) * p.facing;
    const hy = e.y - e.h / 2;
    this.particles.emit({ x: hx, y: hy, count: 18, speed: [400, 1200], angle: p.facing > 0 ? 0 : Math.PI, spread: 1.6, life: [0.15, 0.35], size: [10, 18], color: '#fff7d6', shape: PShape.Spark, drag: 4 });
    this.particles.emit({ x: hx, y: hy, count: 14, speed: [150, 600], life: [0.3, 0.7], size: [8, 16], color: '#ff4f7b', gravity: 1500, drag: 1, shape: PShape.Square, shrink: 1 });
    this.log('kill', { beat: e.beat, how, at: this.stepTime });
  }

  private collectLum(id: number): void {
    const l = this.level.lums.find((x) => x.id === id);
    if (!l) return;
    l.collected = true;
    l.collectT = 0;
    this.stats.lums++;
    // musical note: consecutive lums (within ~1 beat) climb the current chord's arpeggio
    const beatNow = this.tempo.timeToBeat(this.stepTime);
    if (beatNow - this.lumStreak.lastBeat > 1.1) this.lumStreak.count = 0;
    this.lumStreak.lastBeat = beatNow;
    const idx = l.note ?? this.lumStreak.count++;
    this.sfx.lum(collectibleNote(this.song, l.beat, idx));
    this.particles.emit({ x: l.x, y: l.y, count: 10, speed: [120, 380], life: [0.25, 0.5], size: [6, 12], color: '#ffe46b', drag: 3, shrink: 1 });
  }

  // ====================================================================== player event hooks

  private logAction(type: 'jump' | 'punch' | 'slide', pressTime: number): void {
    this.stats.executed.push({ type, simTime: this.stepTime, pressTime, x: this.player.px });
  }

  private onPlayerJump(kind: string): void {
    const p = this.player;
    this.logAction('jump', this.controls.jumpPressTime);
    this.sfx.jump();
    this.emitDust(p.x, p.y, kind === 'wall' ? 6 : 8, 0);
    if (kind === 'wall') this.camera.addTrauma(0.08);
  }

  private onPlayerLand(vy: number): void {
    const p = this.player;
    const k = clamp(vy / 1800, 0, 1);
    if (this.phase === 'countIn') return;
    this.sfx.land(0.4 + k * 0.6);
    this.emitDust(p.x, p.y, 6 + Math.round(k * 10), 0);
    if (k > 0.75) this.camera.addTrauma(Tun.juice.shakeOnLandHard);
  }

  private onPlayerPunch(): void {
    this.logAction('punch', this.controls.punchPressTime);
    this.sfx.punch();
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
      color: '#e9d8c4',
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
        sliding: p.sliding,
        punching: p.punching,
        alive: p.mode !== 'dead',
        mode: p.mode,
      },
      deaths: this.stats.deaths,
      lums: this.stats.lums,
      lumsTotal: this.stats.lumsTotal,
      checkpoint: this.checkpointIndex,
      finished: this.stats.finished,
      fps: Math.round(this.frameStats.fps),
      loadError: this.loadError,
    };
  }

  report() {
    const L = this.level;
    const timings = this.stats.timings(L.actions, this.tempo, L.ppb, params.start ?? L.def.startBeat, L.finishBeat);
    const matched = timings.filter((t) => t.matched);
    const spb = this.tempo.secondsPerBeatAt(L.def.startBeat);
    const jumps = [0.15, 0.5, 1].map((hold) => {
      const prof = jumpProfile(hold * spb, L.runSpeed, L.ppb);
      return { holdBeats: hold, airtimeBeats: round3(prof.airtime / spb), apexPx: Math.round(prof.apex) };
    });
    return {
      level: L.def.id,
      song: this.song.id,
      bpm: this.tempo.bpmAtBeat(L.def.startBeat),
      pixelsPerBeat: L.ppb,
      runSpeed: L.runSpeed,
      autoplay: params.autoplay,
      deliberateMisses: params.miss,
      completed: this.stats.finished,
      deaths: this.stats.deaths,
      deathLog: this.stats.deathLog,
      lums: this.stats.lums,
      lumsTotal: this.stats.lumsTotal,
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
            note: 'music-bus transients (AudioWorklet, graph clock) vs nearest 8th note per the Conductor mapping',
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
  e.x = e.homeX;
  e.y = e.homeY;
  e.vx = e.vy = e.rot = e.vrot = 0;
  e.deadTime = 0;
  e.hitFlash = 0;
}

/** Enemy rect (feet-anchored), optionally shrunk around its center. */
export function enemyRect(e: Enemy, k: number): Rect {
  const w = e.w * k;
  const h = e.h * k;
  return { x: e.x - w / 2, y: e.y - e.h / 2 - h / 2, w, h };
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
