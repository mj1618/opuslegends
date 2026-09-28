/**
 * Player controller. Deterministic, fixed-step (called at Tun.sim.hz), reads only a Controls
 * snapshot — human input and the autoplay bot drive it identically.
 *
 * Feel features: accel/decel, variable jump (release to cut), coyote time, jump buffer,
 * apex hang, fall gravity, fast fall, punch (buffered, hitbox + hitstop handled by Game),
 * slide/duck with low-ceiling lock, wall slide + wall jump, corner correction, ledge assist,
 * squash & stretch spring, beat-locked run cycle.
 */
import type { Controls } from '../engine/input';
import { approach, clamp, type Rect } from '../engine/math';
import { type Body, type CollisionWorld, type MoveResult, bodyRect, moveBody } from './physics';
import { Tun } from './tunables';

export interface PlayerEvents {
  jump(kind: 'ground' | 'coyote' | 'buffer' | 'wall'): void;
  land(impactVy: number): void;
  punch(): void;
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
  punchBuffer = 0;
  punchTime = -1; // <0 = not punching
  punchCooldown = 0;
  punchHitSomething = false;
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

  constructor(events: PlayerEvents) {
    this.events = events;
  }

  spawn(x: number, y: number, runSpeed: number, pixelsPerBeat: number): void {
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = this.vy = 0;
    this.runSpeed = runSpeed;
    this.pixelsPerBeat = pixelsPerBeat;
    this.mode = 'ready';
    this.grounded = true;
    this.groundY = y;
    this.sliding = false;
    this.h = Tun.player.height;
    this.jumping = false;
    this.coyote = this.jumpBuffer = this.punchBuffer = 0;
    this.punchTime = -1;
    this.punchCooldown = 0;
    this.wallDir = 0;
    this.wallLock = 0;
    this.sx = this.sy = 1;
    this.svx = this.svy = 0;
    this.runPhase = 0;
    this.airTime = 0;
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

  get gravity(): number {
    return (2 * Tun.jump.height) / (Tun.jump.timeToApex * Tun.jump.timeToApex);
  }

  get jumpVelocity(): number {
    return this.gravity * Tun.jump.timeToApex;
  }

  get punchActive(): boolean {
    return this.punchTime >= Tun.punch.startup && this.punchTime < Tun.punch.startup + Tun.punch.active;
  }

  get punching(): boolean {
    return this.punchTime >= 0;
  }

  hitbox(): Rect {
    return bodyRect(this, this.rect);
  }

  /** Punch hitbox in world space (valid when punchActive). */
  punchBox(out: Rect): Rect {
    const hh = Tun.punch.hitboxHeight;
    out.w = Tun.punch.reach + this.w * 0.5;
    out.h = hh;
    out.x = this.facing > 0 ? this.x : this.x - out.w;
    out.y = this.y - Math.max(this.h, hh * 0.9) + (this.sliding ? 0 : 4);
    return out;
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
    if (this.mode === 'ready' || this.mode === 'dead') return;

    const J = Tun.jump;
    const finished = this.mode === 'finished';
    const left = !finished && c.left;
    const right = finished || c.right;
    const down = !finished && c.down;

    // ---- timers & buffers
    this.coyote -= dt;
    this.jumpBuffer -= dt;
    this.punchBuffer -= dt;
    this.punchCooldown -= dt;
    this.wallLock -= dt;
    if (!finished && c.jumpPressed) this.jumpBuffer = J.bufferTime;
    if (!finished && c.punchPressed) this.punchBuffer = Tun.punch.bufferTime;

    // ---- horizontal
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0 && !this.sliding) this.facing = dir;
    let max = this.maxSpeed;
    const GL = Tun.grooveLock;
    if (GL.enabled && dir > 0 && !finished && Number.isFinite(this.musicX)) {
      const lag = this.musicX - this.x;
      if (lag > 0 && lag < GL.maxLagBeats * this.pixelsPerBeat) max += Math.min(GL.gain * lag, GL.maxBoost * this.runSpeed);
    }
    if (this.sliding) {
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
    // variable height: releasing jump while rising cuts the velocity (once)
    if (this.jumping && !c.jump && this.vy < 0) {
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

    // ---- punch
    if (this.punchTime >= 0) {
      this.punchTime += dt;
      if (this.punchTime >= Tun.punch.duration) {
        this.punchTime = -1;
        this.punchCooldown = Tun.punch.cooldown;
      }
    }
    if (this.punchBuffer > 0 && this.punchTime < 0 && this.punchCooldown <= 0) {
      this.punchBuffer = 0;
      this.punchTime = 0;
      this.punchHitSomething = false;
      if (!this.grounded && this.vy > -Tun.punch.airPop) this.vy = Math.min(this.vy, -Tun.punch.airPop);
      this.kick(Tun.juice.punchStretch[0], Tun.juice.punchStretch[1]);
      this.events.punch();
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

  private doJump(v: number): void {
    this.vy = -v;
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
  setWorld(w: CollisionWorld): void {
    this.worldRef = w;
  }

  private headroom(h: number): boolean {
    if (!this.worldRef) return true;
    const r = { x: this.x - this.w / 2, y: this.y - h, w: this.w, h: h - 1 };
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
