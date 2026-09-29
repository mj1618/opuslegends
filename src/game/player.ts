/**
 * Player controller — the hero. Deterministic, fixed-step (called at Tun.sim.hz),
 * reads only a Controls snapshot — human input and the autoplay bot drive it identically.
 *
 * Verbs (DESIGN §2): Scuttle (hold right; top speed = tempo, +15% catch-up surge when behind the
 * grid; Game calls setTempo() every step so top speed follows the song's TEMPO MAP), Hop (variable jump defined in BEATS: every tap <= minHoldBeats is the same 1-beat hop,
 * hold ~1 beat = 2-beat jump), Strike (up-forward strike; hits ahead AND above; buffered; hitbox +
 * hitstop handled by Game). Stumble = knockback + control lock + i-frames (never death).
 * Feel: accel/decel, coyote time, jump buffer, apex hang, fall gravity, fast fall, corner
 * correction, ledge assist, squash & stretch spring, beat-locked run cycle. Wall jump is off.
 * Timing grades never touch any of this (physics ignores the judge).
 */
import type { Controls } from '../engine/input';
import { approach, clamp, type Rect } from '../engine/math';
import { type Body, type CollisionWorld, type MoveResult, bodyRect, moveBody } from './physics';
import { Tun } from './tunables';

export interface PlayerEvents {
  jump(kind: 'ground' | 'coyote' | 'buffer' | 'wall'): void;
  land(impactVy: number): void;
  strike(): void;
  slide(): void;
  footstep(): void;
}

export type PlayerMode = 'ready' | 'play' | 'dead' | 'finished';

export class Player implements Body {
  x = 0;
  y = 0;
  w = Tun.player.width;
  h = Tun.player.height;
  vx = 0;
  vy = 0;
  /** previous-step position for render interpolation */
  px = 0;
  py = 0;

  mode: PlayerMode = 'ready';
  runSpeed = 960;
  grounded = false;
  facing = 1;
  sliding = false;
  slideTime = 0;
  /** true while the current airborne phase came from a jump (enables cut/apex hang) */
  jumping = false;
  coyote = 0;
  jumpBuffer = 0;
  strikeBuffer = 0;
  strikeTime = -1; // <0 = not striking
  strikeCooldown = 0;
  strikeHitSomething = false;
  /** seconds since the current jump's takeoff (for the minimum-hold rule) */
  jumpT = 0;
  /** stumble: controls locked while > 0 (s) */
  stumbleLock = 0;
  /** stumble invulnerability (s) */
  iframes = 0;
  /** true while the catch-up surge is boosting top speed (presentation) */
  surging = false;
  wallDir = 0;
  wallLock = 0;
  airTime = 0;
  /** squash & stretch (visual), spring toward 1 */
  sx = 1;
  sy = 1;
  private svx = 0;
  private svy = 0;
  /** run cycle phase (footfalls = integer crossings) */
  runPhase = 0;
  /** last ground surface y, for the camera */
  groundY = 0;
  /** world x where the music says the hero should be (set by Game each step; NaN = unknown) */
  musicX = NaN;

  private res: MoveResult = { hitWallDir: 0, hitCeiling: false, landed: false, steppedUp: false };
  private rect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private events: PlayerEvents;
  private pixelsPerBeat = 384;
  /** seconds per beat (jump physics are defined in beats) */
  spb = 0.4;

  constructor(events: PlayerEvents) {
    this.events = events;
  }

  spawn(x: number, y: number, runSpeed: number, pixelsPerBeat: number): void {
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = this.vy = 0;
    this.runSpeed = runSpeed;
    this.pixelsPerBeat = pixelsPerBeat;
    this.spb = pixelsPerBeat / runSpeed;
    this.mode = 'ready';
    this.grounded = true;
    this.groundY = y;
    this.sliding = false;
    this.h = Tun.player.height;
    this.jumping = false;
    this.coyote = this.jumpBuffer = this.strikeBuffer = 0;
    this.strikeTime = -1;
    this.strikeCooldown = 0;
    this.stumbleLock = 0;
    this.iframes = 0;
    this.surging = false;
    this.wallDir = 0;
    this.wallLock = 0;
    this.sx = this.sy = 1;
    this.svx = this.svy = 0;
    this.runPhase = 0;
    this.airTime = 0;
  }

  /**
   * Follow the tempo map (called by Game every sim step with the seconds-per-beat at the world
   * beat): top run speed = pixelsPerBeat / spb, and the jump physics (defined in beats) rescale.
   * Positions stay x = X(beat) (level/beatx.ts), so holding right keeps the hero on the music line
   * however the band pushes or drags (the original drifts 161.5 -> 166.6 BPM).
   */
  setTempo(secondsPerBeat: number, pixelsPerBeat?: number): void {
    this.spb = secondsPerBeat;
    // iteration 9: the px per beat varies (the chorus speed zones, level/beatx.ts) — Game passes the ppb at the hero's
    // own beat position, so a hero behind the grid keeps his lag in BEATS through a ramp
    if (pixelsPerBeat !== undefined) this.pixelsPerBeat = pixelsPerBeat;
    this.runSpeed = this.pixelsPerBeat / secondsPerBeat;
  }

  /** px per beat at the hero's position (set by setTempo) */
  get ppb(): number {
    return this.pixelsPerBeat;
  }

  /** Release from the count-in hold. */
  release(c: Controls): void {
    this.mode = 'play';
    if (Tun.run.launchOnRelease && c.right) {
      this.vx = this.runSpeed * Tun.run.speedScale;
      this.facing = 1;
      this.kick(1.2, 0.85);
    }
  }

  get maxSpeed(): number {
    return this.runSpeed * Tun.run.speedScale;
  }

  private get timeToApex(): number {
    return Tun.jump.timeToApexBeats * this.spb;
  }

  get gravity(): number {
    const t = this.timeToApex;
    return (2 * Tun.jump.height) / (t * t);
  }

  get jumpVelocity(): number {
    return this.gravity * this.timeToApex;
  }

  get strikeActive(): boolean {
    return this.strikeTime >= Tun.strike.startup && this.strikeTime < Tun.strike.startup + Tun.strike.active;
  }

  get striking(): boolean {
    return this.strikeTime >= 0;
  }

  get invulnerable(): boolean {
    return this.iframes > 0;
  }

  hitbox(): Rect {
    return bodyRect(this, this.rect);
  }

  /** Body rect narrowed for hazard/enemy contact (fairness). */
  hurtbox(out: Rect): Rect {
    const i = Tun.player.hurtInset;
    out.x = this.x - this.w / 2 + i;
    out.y = this.y - this.h + 4;
    out.w = this.w - 2 * i;
    out.h = this.h - 4;
    return out;
  }

  /** Strike hitbox in world space (valid when strikeActive): up-forward arc, hits ahead AND above. */
  strikeBox(out: Rect): Rect {
    const C = Tun.strike;
    out.w = C.backReach + this.w / 2 + C.reach;
    out.h = C.height;
    out.x = this.facing > 0 ? this.x - C.backReach : this.x - this.w / 2 - C.reach;
    out.y = this.y - C.height;
    return out;
  }

  /** Knockback from a stumble (spike, jabber jab). Physics only; Game handles lums/crowd. */
  stumble(): void {
    const S = Tun.stumble;
    this.vx = S.vx * this.facing;
    this.vy = S.vy;
    this.grounded = false;
    this.jumping = false;
    this.stumbleLock = S.lockTime;
    this.iframes = S.iframesBeats * this.spb;
    this.jumpBuffer = 0;
    this.strikeBuffer = 0;
    this.kick(1.3, 0.7);
  }

  /** Impulse into the squash/stretch spring. */
  kick(sx: number, sy: number): void {
    this.sx = sx;
    this.sy = sy;
    this.svx = this.svy = 0;
  }

  step(dt: number, c: Controls, world: CollisionWorld): void {
    this.px = this.x;
    this.py = this.y;
    this.updateSpring(dt);
    if (this.mode === 'ready') {
      // held at the spawn (cold open / count-in): the strike can still be waved
      if (c.strikePressed && this.strikeTime < 0) {
        this.strikeTime = 0;
        this.kick(Tun.juice.strikeStretch[0], Tun.juice.strikeStretch[1]);
      }
      this.advanceStrike(dt);
      return;
    }
    if (this.mode === 'dead') return;

    const J = Tun.jump;
    const finished = this.mode === 'finished';
    this.stumbleLock -= dt;
    this.iframes -= dt;
    const locked = this.stumbleLock > 0;
    const left = !finished && !locked && c.left;
    const right = finished || (!locked && c.right);
    const down = !finished && !locked && c.down;

    // ---- timers & buffers
    this.coyote -= dt;
    this.jumpBuffer -= dt;
    this.strikeBuffer -= dt;
    this.strikeCooldown -= dt;
    this.wallLock -= dt;
    this.jumpT += dt;
    if (!finished && !locked && c.jumpPressed) this.jumpBuffer = J.bufferTime;
    if (!finished && !locked && c.strikePressed) this.strikeBuffer = Tun.strike.bufferTime;

    // ---- horizontal
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0 && !this.sliding) this.facing = dir;
    let max = this.maxSpeed;
    const GL = Tun.grooveLock;
    this.surging = false;
    if (GL.enabled && dir > 0 && !finished && Number.isFinite(this.musicX)) {
      const lag = this.musicX - this.x;
      if (lag > 0 && lag < GL.maxLagBeats * this.pixelsPerBeat) {
        max += Math.min(GL.gain * lag, GL.maxBoost * this.runSpeed);
        this.surging = lag > 12;
      }
    }
    if (locked) {
      // knockback: no control, gentle air drag
      this.vx = approach(this.vx, 0, Tun.run.decelAir * dt);
    } else if (this.sliding) {
      const target = dir === this.facing ? max * this.facing : 0;
      const acc = dir === this.facing ? Tun.run.accelGround : Tun.slide.friction;
      this.vx = approach(this.vx, target, acc * dt);
    } else if (this.grounded) {
      const target = dir * max;
      let acc: number;
      if (dir === 0) acc = Tun.run.decelGround;
      else if (this.vx !== 0 && Math.sign(this.vx) !== dir) acc = Tun.run.turnAccel;
      else acc = Tun.run.accelGround;
      this.vx = approach(this.vx, target, acc * dt);
    } else {
      const lockK = this.wallLock > 0 ? 0.25 : 1;
      const target = dir * max;
      const acc = (dir === 0 ? Tun.run.decelAir : Tun.run.accelAir) * lockK;
      if (dir !== 0 || this.wallLock <= 0) this.vx = approach(this.vx, target, acc * dt);
    }

    // ---- jump
    const canGroundJump = this.grounded || this.coyote > 0;
    if (this.jumpBuffer > 0 && canGroundJump && this.headroom(Tun.player.height)) {
      const kind = this.grounded ? (c.jumpPressed ? 'ground' : 'buffer') : 'coyote';
      this.doJump(this.jumpVelocity);
      this.events.jump(kind);
    } else if (this.jumpBuffer > 0 && !this.grounded && Tun.wall.enabled && this.wallDir !== 0) {
      this.doJump(this.jumpVelocity * Tun.wall.jumpVYMul);
      this.vx = -this.wallDir * Tun.wall.jumpVX;
      this.facing = -this.wallDir;
      this.wallLock = Tun.wall.lockTime;
      this.wallDir = 0;
      this.events.jump('wall');
    }
    // variable height: releasing jump while rising cuts the velocity (once) — but never before
    // minHoldBeats, so every quick tap is the same 1-beat hop
    if (this.jumping && !c.jump && this.vy < 0 && this.jumpT >= J.minHoldBeats * this.spb) {
      this.vy *= J.cutMultiplier;
      this.jumping = false;
    }

    // ---- gravity
    let g = this.gravity;
    let maxFall = J.maxFallSpeed;
    if (this.vy > 0) g *= J.fallGravityMul;
    if (this.jumping && c.jump && Math.abs(this.vy) < J.apexThreshold) g *= J.apexGravityMul;
    if (down && !this.grounded && this.vy > -200) {
      g *= J.fastFallGravityMul;
      maxFall = J.fastFallMaxSpeed;
    }
    this.vy = Math.min(this.vy + g * dt, maxFall);
    // wall slide
    if (!this.grounded && Tun.wall.enabled && this.wallDir !== 0 && dir === this.wallDir && this.vy > Tun.wall.slideMaxSpeed) {
      this.vy = Tun.wall.slideMaxSpeed;
    }

    // ---- strike
    this.advanceStrike(dt);
    const S = Tun.strike;
    const ready = this.strikeTime < 0 ? this.strikeCooldown <= 0 : S.cancelRecovery && this.strikeTime >= S.startup + S.active;
    if (this.strikeBuffer > 0 && ready) {
      this.strikeBuffer = 0;
      this.strikeTime = 0;
      this.strikeHitSomething = false;
      // (airPop 0 = no pop at all: iteration 3 fix — `min(vy, -0)` used to zero a FALLING hero's speed, a hidden
      // hover that delayed landings after every air strike and let air strikes rescue early jumps over pits)
      if (Tun.strike.airPop > 0 && !this.grounded && this.vy > -Tun.strike.airPop) this.vy = Math.min(this.vy, -Tun.strike.airPop);
      this.kick(Tun.juice.strikeStretch[0], Tun.juice.strikeStretch[1]);
      this.events.strike();
    }

    // ---- slide / duck
    const wantSlide = down && this.grounded;
    if (wantSlide && !this.sliding) {
      this.sliding = true;
      this.slideTime = 0;
      this.setHeight(Tun.player.slideHeight);
      if (Math.abs(this.vx) > Tun.slide.minSpeed) this.events.slide();
    } else if (this.sliding) {
      this.slideTime += dt;
      const release = (!down || !this.grounded) && this.slideTime >= Tun.slide.minTime;
      if (release && this.headroom(Tun.player.height)) {
        this.sliding = false;
        this.setHeight(Tun.player.height);
        this.kick(0.9, 1.12);
      }
    }

    // ---- integrate + collide
    const wasGrounded = this.grounded;
    const impactVy = this.vy;
    moveBody(
      this,
      this.vx * dt,
      this.vy * dt,
      world,
      { ledgeAssist: J.ledgeAssist, cornerCorrection: J.cornerCorrection, canStepUp: this.vy >= 0 },
      this.res,
    );
    this.grounded = this.res.landed;
    if (this.res.hitCeiling) this.jumping = false;
    // wall contact probe (for wall slide / jump)
    this.wallDir = 0;
    if (!this.grounded && Tun.wall.enabled) {
      const r = this.hitbox();
      r.x += 2;
      if (world.overlapsSolid(r)) this.wallDir = 1;
      else {
        r.x -= 4;
        if (world.overlapsSolid(r)) this.wallDir = -1;
      }
    }

    if (this.grounded) {
      this.groundY = this.y;
      this.coyote = J.coyoteTime;
      if (!wasGrounded) {
        this.jumping = false;
        this.onLand(impactVy);
      }
      this.airTime = 0;
    } else {
      this.airTime += dt;
      if (wasGrounded && this.vy >= 0) {
        // walked off a ledge: coyote timer already running
        this.jumping = false;
      }
    }

    // ---- run cycle, locked to distance so footfalls land on the beat grid at max speed
    if (this.grounded && !this.sliding) {
      const prev = this.runPhase;
      this.runPhase += (Math.abs(this.vx) * dt * Tun.run.footfallsPerBeat) / this.pixelsPerBeat;
      if (Math.floor(this.runPhase) !== Math.floor(prev) && Math.abs(this.vx) > 100) this.events.footstep();
    }
  }

  private advanceStrike(dt: number): void {
    if (this.strikeTime < 0) return;
    this.strikeTime += dt;
    if (this.strikeTime >= Tun.strike.duration) {
      this.strikeTime = -1;
      this.strikeCooldown = Tun.strike.cooldown;
    }
  }

  private doJump(v: number): void {
    this.vy = -v;
    this.jumpT = 0;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = true;
    if (this.sliding) {
      this.sliding = false;
      this.setHeight(Tun.player.height);
    }
    this.kick(Tun.juice.jumpStretch[0], Tun.juice.jumpStretch[1]);
  }

  private onLand(impactVy: number): void {
    const k = clamp(impactVy / 1800, 0.15, 1);
    const [mx, my] = Tun.juice.landSquashMax;
    this.kick(1 + (mx - 1) * k, 1 - (1 - my) * k);
    this.events.land(impactVy);
  }

  private setHeight(h: number): void {
    this.h = h;
    if (this.sliding) this.kick(Tun.juice.slideSquash[0], Tun.juice.slideSquash[1]);
  }

  private worldRef: CollisionWorld | null = null;
  /**
   * Extra low ceilings that aren't collision solids (the knee-slide signs): while one is overhead the hero
   * can't stand up or hop — he stays ducked (AUTO-CROUCH, iteration 3: releasing ↓ a hair before the held
   * note ends no longer stands him up into the sign's tail) and a hop press waits in the jump buffer.
   */
  lowCeilings: (r: Rect) => boolean = () => false;
  setWorld(w: CollisionWorld): void {
    this.worldRef = w;
  }

  private headroom(h: number): boolean {
    const r = { x: this.x - this.w / 2, y: this.y - h, w: this.w, h: h - 1 };
    if (this.sliding && this.lowCeilings(r)) return false;
    if (!this.worldRef) return true;
    return !this.worldRef.overlapsSolid(r);
  }

  private updateSpring(dt: number): void {
    const k = Tun.juice.springK;
    const d = Tun.juice.springDamp;
    this.svx += (-(this.sx - 1) * k - this.svx * d) * dt;
    this.svy += (-(this.sy - 1) * k - this.svy * d) * dt;
    this.sx += this.svx * dt;
    this.sy += this.svy * dt;
  }
}
