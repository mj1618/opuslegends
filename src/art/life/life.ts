/**
 * AMBIENT LIFE — reusable, beat-driven background actors (theme-agnostic).
 *
 * A LifeLayer is a SceneLayer at some parallax factor that owns a pool of Actors. SpawnRules create
 * actors on timers or on BeatInfo lanes (kick, snare, riff, crash, hey...), just off-screen or
 * anywhere in view; each ActorKind updates + draws itself (cheap vector silhouettes) and reacts to
 * the beat. Persistent actors can be pinned to tiling anchors (e.g. pigeons on ledges).
 *
 *   const traffic = new LifeLayer({ id: 'traffic', factor: 0.8, depth: 0.35, rules: [
 *     { kind: TAXI, every: 2.5, jitter: 0.6, y: -10, from: 'edge' },
 *     { kind: BOTTLE, on: 'snare', chance: 0.3, y: -200, from: 'view' } ] });
 *   scene.add(traffic);
 *
 * Actors are drawn in layer space; kinds get a LifeCtx with lighting + depth so silhouettes haze
 * and relight like everything else. Keep kinds cheap: a handful of paths each.
 */
import type { BeatInfo, Instrument } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { hash } from '../core/math';
import { type ArtCamera, type LayerView, layerView, pushLayer } from '../world/camera';
import type { Lighting } from '../world/lighting';
import type { SceneFrame, SceneLayer } from '../world/parallax';

export interface Actor {
  kind: ActorKind;
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** seconds alive */
  t: number;
  /** per-actor random 0..1 */
  seed: number;
  /** facing / direction (+1 right, -1 left) */
  dir: number;
  /** scale */
  s: number;
  /** kind-specific state machine value */
  state: number;
  /** kind-specific scratch */
  a: number;
  b: number;
}

export interface LifeCtx {
  L: Lighting;
  b: BeatInfo;
  /** layer depth (0 play .. 1 horizon) for lit()/atmos() */
  depth: number;
  view: LayerView;
  /** lighting version (for memoising colours) */
  version: number;
}

export interface ActorKind {
  id: string;
  /** initialise a freshly spawned actor (x, y, dir already set) */
  spawn?(a: Actor, rnd: () => number): void;
  /** advance; return false to despawn. Default: move by velocity, despawn when off view */
  update?(a: Actor, dt: number, c: LifeCtx): boolean;
  draw(g: Ctx, a: Actor, c: LifeCtx): void;
}

export interface SpawnRule {
  kind: ActorKind;
  /** spawn every N seconds (with +-jitter fraction) */
  every?: number;
  jitter?: number;
  /** spawn on every event of this lane */
  on?: Instrument;
  /** probability per trigger */
  chance?: number;
  /** actors per trigger */
  count?: number;
  /** layer-space y (reference coords) */
  y: number;
  /** random +- y spread */
  ySpread?: number;
  /** 'edge' = just outside the LEADING edge of the scrolling view (or either edge when still), 'view' = anywhere visible */
  from?: 'edge' | 'view';
  /** max live actors of this rule */
  max?: number;
  /** base speed px/s (layer space); direction random unless `dir` */
  speed?: number;
  dir?: 1 | -1;
  scale?: number;
  /** spawn this many anywhere in view on the first frame (a street that's already busy) */
  prefill?: number;
}

export interface LifeOptions {
  id: string;
  factor: number;
  pass?: 'back' | 'front';
  /** 0 play .. 1 horizon */
  depth: number;
  rules: SpawnRule[];
  pool?: number;
  /** actors placed at start at fixed layer positions (x is wrapped by `wrapW` so they tile) */
  pinned?: { kind: ActorKind; x: number; y: number; s?: number; dir?: 1 | -1 }[];
  wrapW?: number;
}

export class LifeLayer implements SceneLayer {
  readonly id: string;
  readonly pass: 'back' | 'front';
  readonly actors: Actor[] = [];
  private pinned: Actor[] = [];
  private lastT = -1;
  private next: number[] = [];
  private counts = new Map<Instrument, number>();
  private seed = 1;
  private filled = false;
  private lastCx = NaN;
  /** layer-space scroll velocity of the view (px/s) */
  private viewVel = 0;

  constructor(readonly o: LifeOptions) {
    this.id = o.id;
    this.pass = o.pass ?? 'back';
    for (let i = 0; i < (o.pool ?? 64); i++) this.actors.push(this.blank());
    this.next = o.rules.map(() => 0);
    for (const p of o.pinned ?? []) {
      const a = this.blank();
      a.kind = p.kind;
      a.alive = true;
      a.x = p.x;
      a.y = p.y;
      a.s = p.s ?? 1;
      a.dir = p.dir ?? 1;
      a.seed = hash(Math.round(p.x) * 7 + Math.round(p.y));
      p.kind.spawn?.(a, () => this.rand());
      this.pinned.push(a);
    }
  }

  private blank(): Actor {
    return { kind: null as unknown as ActorKind, alive: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, seed: 0, dir: 1, s: 1, state: 0, a: 0, b: 0 };
  }

  rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed & 0xffffff) / 0x1000000;
  }

  live(): number {
    let n = 0;
    for (const a of this.actors) if (a.alive) n++;
    return n;
  }

  private spawn(r: SpawnRule, v: LayerView): void {
    if (r.max !== undefined) {
      let n = 0;
      for (const a of this.actors) if (a.alive && a.kind === r.kind) n++;
      if (n >= r.max) return;
    }
    const a = this.actors.find((x) => !x.alive);
    if (!a) return;
    const dir = r.dir ?? (this.rand() < 0.5 ? 1 : -1);
    a.kind = r.kind;
    a.alive = true;
    a.t = 0;
    a.seed = this.rand();
    a.dir = dir;
    a.s = (r.scale ?? 1) * (0.9 + this.rand() * 0.2);
    a.state = 0;
    a.a = 0;
    a.b = 0;
    a.y = r.y + (this.rand() - 0.5) * 2 * (r.ySpread ?? 0);
    const margin = 160;
    if ((r.from ?? 'edge') === 'edge') {
      // camera scrolling: spawn ahead of it so actors are actually seen
      if (Math.abs(this.viewVel) > 40) a.x = this.viewVel > 0 ? v.x1 + margin : v.x0 - margin;
      else a.x = dir > 0 ? v.x0 - margin : v.x1 + margin;
    } else a.x = v.x0 + this.rand() * (v.x1 - v.x0);
    const sp = r.speed ?? 0;
    a.vx = dir * sp * (0.8 + this.rand() * 0.4);
    a.vy = 0;
    r.kind.spawn?.(a, () => this.rand());
  }

  draw(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
    const v = layerView(cam, this.o.factor);
    const b = f.b;
    const dt = this.lastT < 0 ? 0 : Math.max(0, Math.min(0.1, b.time - this.lastT));
    // time went backwards (rewind / scrub): clear transient actors
    if (b.time < this.lastT - 0.5) for (const a of this.actors) a.alive = false;
    this.lastT = b.time;
    if (dt > 0 && !Number.isNaN(this.lastCx)) this.viewVel = this.viewVel * 0.8 + ((v.cx - this.lastCx) / dt) * 0.2;
    this.lastCx = v.cx;
    const c: LifeCtx = { L: f.L, b, depth: this.o.depth, view: v, version: f.version };
    if (!this.filled) {
      this.filled = true;
      for (const r of this.o.rules) for (let k = 0; k < (r.prefill ?? 0); k++) this.spawn({ ...r, from: 'view' }, v);
    }
    // rules
    this.o.rules.forEach((r, i) => {
      if (r.every !== undefined) {
        this.next[i] -= dt;
        if (this.next[i] <= 0) {
          this.next[i] = r.every * (1 + ((r.jitter ?? 0.3) * (this.rand() * 2 - 1)));
          if (this.rand() <= (r.chance ?? 1)) for (let k = 0; k < (r.count ?? 1); k++) this.spawn(r, v);
        }
      }
      if (r.on) {
        const cnt = b.count[r.on];
        const prev = this.counts.get(r.on);
        if (prev !== undefined && cnt !== prev && b.since[r.on] < 0.2 && this.rand() <= (r.chance ?? 1))
          for (let k = 0; k < (r.count ?? 1); k++) this.spawn(r, v);
      }
    });
    for (const r of this.o.rules) if (r.on) this.counts.set(r.on, b.count[r.on]);
    // update
    const m = 260;
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.t += dt;
      let keep: boolean;
      if (a.kind.update) keep = a.kind.update(a, dt, c);
      else {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        keep = true;
      }
      if (!keep || a.x < v.x0 - m * 2 || a.x > v.x1 + m * 2 || a.t > 60) a.alive = false;
    }
    for (const a of this.pinned) {
      a.t += dt;
      a.kind.update?.(a, dt, c);
    }
    // draw
    pushLayer(g, v);
    const W = this.o.wrapW;
    for (const a of this.pinned) {
      if (!W) {
        a.kind.draw(g, a, c);
        continue;
      }
      const x0 = a.x;
      for (let x = x0 + Math.ceil((v.x0 - 200 - x0) / W) * W; x <= v.x1 + 200; x += W) {
        a.x = x;
        a.kind.draw(g, a, c);
      }
      a.x = x0;
    }
    for (const a of this.actors) if (a.alive) a.kind.draw(g, a, c);
    g.restore();
  }
}
