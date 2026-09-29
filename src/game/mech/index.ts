/**
 * Act-2 mechanics (iterations 3-4, docs/level/act2_plan.md): the runtime for level items the core builder doesn't
 * know — THROWN BOTTLES (thrownBottle.ts), ROLLING BALLS (rollingBall.ts), HOOK RIDES (hook.ts, iteration 4: strike ON
 * the beat to hook a rope / line / cradle and ride it) and presentation SET-PIECE cues — plus two climb rules:
 *   - LEDGE SCRAMBLE: a hero stopped dead against a ledge (27–150 px, e.g. a missed hop UP or a tapped storey jump on
 *     the climb) scrambles up it after a moment instead of standing there forever. Costs ~0.3–0.5 beat (the surge
 *     wins it back); no stumble. Keeps a missed reward hop a reward miss (failKind 'none'), for humans and the lazy
 *     bot alike.
 *   - FALL-OUT: falling more than `FALL_OUT` px below the last ledge is a death right away (the pits on the facade
 *     and the lane gutters sit high above the street; without this the fall would take ~0.8 s off-screen). Not while
 *     riding a hook (the chorus zip drops ~900 px).
 *
 * Game (game.ts) owns one `Mechanics`, built from the RuntimeLevel, and calls reset / step / beat. Everything here is
 * a pure function of the world beat plus the player, so rewinds and hitstop behave like the core entities.
 * The renderer draws `bottles`, `balls`, `setPieces` (render/mechDraw.ts: placeholders in the danger language until
 * the art pass skins them).
 */
import { overlaps, type Rect } from '../../engine/math';
import type { RuntimeLevel } from '../../level/build';
import type { SetPieceName } from '../../level/types';
import type { SongDef } from '../../audio/song';
import type { Player } from '../player';
import { Act3 } from './act3';
import { Tun } from '../tunables';
import { HOOK, type HookRide, hookY } from './hook';
import { BALL, type RollingBall, ballX } from './rollingBall';
import { BAT, FIRE, type ThrownBottle, bottleArc } from './thrownBottle';

export { BALL, BAT, FIRE, HOOK, hookY };
export type { HookRide, RollingBall, ThrownBottle };

/** px below the last ledge at which a fall is a death (act 1's deepest intended drop is 150 px) */
export const FALL_OUT = 420;
/** ledge scramble: riser heights it helps with (iteration 4: up to a storey, 150), stall speed, delay before it (s) */
export const SCRAMBLE = { min: 27, max: 150, stallVx: 60, delay: 0.1 } as const;

export interface SetPieceCue {
  beat: number;
  name: SetPieceName;
  beats: number;
  /** world anchor: x = X(beat + ahead), y = `h` px above the floor there */
  x: number;
  y: number;
  floorY: number;
}

export interface MechHost {
  stumble(cause: string): void;
  die(cause: string): void;
  /** a thrown bottle batted back ON its beat: tokens, sound, juice */
  batted(b: ThrownBottle): void;
  /** presentation hooks (particles / SFX) */
  fx(kind: 'shatter' | 'ignite' | 'ballHit' | 'scramble' | 'hook', x: number, y: number): void;
  /** schedule a telegraph sound at an AudioContext time */
  telegraph(kind: 'whistle' | 'rumble', beat: number): void;
  /** a hook ride starts (optional: presentation / stats) */
  hooked?(h: HookRide): void;
}

const TOKENS_BAT = 4;

export class Mechanics {
  readonly bottles: ThrownBottle[] = [];
  readonly balls: RollingBall[] = [];
  readonly setPieces: SetPieceCue[] = [];
  readonly hooks: HookRide[] = [];
  /** the hook ride in progress (render: Slim hangs from `hook.pts` + HOOK.hang), or null */
  hook: HookRide | null = null;
  private readonly L: RuntimeLevel;
  private host: MechHost;
  private hurt: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private box: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private pt = { x: 0, y: 0 };
  private stallT = 0;
  private wasActive = false;
  /** scrambles this attempt (stats / debug) */
  scrambles = 0;

  /** act 3's set-pieces (the call and response, the rack, the BIG JIM letters, Big Jim, the iris): mech/act3.ts */
  readonly act3: Act3;

  constructor(level: RuntimeLevel, host: MechHost, song?: SongDef) {
    this.L = level;
    this.host = host;
    this.act3 = new Act3(level, song);
    const X = level.xAt;
    const floorAt = (x: number) => {
      const y = level.floorYAt(x);
      return Number.isNaN(y) ? level.surfaceYNear(x) : y;
    };
    let id = 90000;
    for (const it of level.def.items) {
      if (it.type === 'thrown') {
        const bottle = it.style === 'bottle';
        const tx = bottle ? X(it.beat) + BAT.ahead : X(it.beat + FIRE.at);
        const floorY = floorAt(tx);
        const ty = bottle ? floorY - BAT.h : floorY;
        const from = it.from ?? it.beat - BAT.beats;
        this.bottles.push({
          id: id++,
          beat: it.beat,
          from,
          style: it.style,
          wx: tx + (it.dx ?? BAT.dx),
          wy: floorY - (it.h ?? BAT.wh),
          tx,
          ty,
          loft: BAT.loft,
          floorY,
          r: BAT.r,
          tokens: bottle ? TOKENS_BAT : 0,
          state: 'idle',
          graze: -1,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rot: 0,
          t: 0,
          fire: { x: tx - FIRE.w / 2, y: floorY - FIRE.h, w: FIRE.w, h: FIRE.h },
        });
      } else if (it.type === 'ball') {
        const meetX = X(it.beat + BALL.at);
        this.balls.push({
          id: id++,
          beat: it.beat,
          from: it.from ?? it.beat - BALL.lead,
          // (iteration 9: in a chorus speed zone the ball rolls faster by the same factor — its window stays in beats)
          speed: (it.speed ?? BALL.speed) * level.speedMulAt(it.beat + BALL.at),
          r: BALL.r,
          meetX,
          floorY: floorAt(meetX),
          state: 'idle',
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          rot: 0,
          t: 0,
        });
      } else if (it.type === 'hook') {
        const pts = it.path.map(([b, h]) => [X(b), -h] as [number, number]);
        this.hooks.push({ id: id++, beat: it.beat, style: it.style, pts, x0: pts[0][0], x1: pts[pts.length - 1][0], state: 'idle', k: 0, t: 0 });
      } else if (it.type === 'setPiece') {
        const x = X(it.beat + (it.ahead ?? 0));
        const floorY = floorAt(x);
        this.setPieces.push({ beat: it.beat, name: it.name, beats: it.beats ?? 4, x, y: floorY - (it.h ?? 0), floorY });
      }
    }
    this.bottles.sort((a, b) => a.beat - b.beat);
    this.balls.sort((a, b) => a.beat - b.beat);
    this.setPieces.sort((a, b) => a.beat - b.beat);
    this.hooks.sort((a, b) => a.beat - b.beat);
  }

  /** tokens the level's bat-able bottles pay from `beat` on (for the run's token total) */
  tokensFrom(beat: number): number {
    return this.bottles.filter((b) => b.beat >= beat - 1e-6).reduce((n, b) => n + b.tokens, 0);
  }

  /** re-arm everything at/after `beat` (checkpoint rewinds); what's behind stays spent */
  reset(beat: number): void {
    this.act3.reset(beat);
    for (const b of this.bottles) {
      b.state = b.beat >= beat - 0.5 ? 'idle' : 'out';
      b.t = 0;
      b.rot = 0;
      b.graze = -1;
    }
    for (const b of this.balls) {
      b.state = b.beat >= beat - 0.5 ? 'idle' : 'gone';
      b.t = 0;
    }
    for (const h of this.hooks) {
      h.state = h.beat >= beat - 0.5 ? 'idle' : 'done';
      h.k = 0;
      h.t = 0;
    }
    this.hook = null;
    this.wasActive = false;
    this.stallT = 0;
  }

  /**
   * One sim step at world beat `wb`. `running` = the run phase (interactions live), `right` = forward held.
   * Kinematics run in every phase so the throws stay on their beats through count-ins.
   */
  step(dt: number, wb: number, p: Player, running: boolean, right: boolean): void {
    this.act3.step(wb);
    const hurt = p.hurtbox(this.hurt);
    const striking = running && p.strikeActive;
    const box = striking ? p.strikeBox(this.box) : null;
    // ---------------------------------------------------------------- thrown bottles
    for (const b of this.bottles) {
      if (b.state === 'out') continue;
      b.t += dt;
      if (b.state === 'idle') {
        if (wb < b.from) continue;
        b.state = 'air';
        b.t = 0;
      }
      if (b.state === 'air') {
        bottleArc(b, wb, this.pt);
        b.x = this.pt.x;
        b.y = this.pt.y;
        b.rot = (wb - b.from) * 7;
        if (b.style === 'firebomb') {
          if (wb >= b.beat) {
            b.state = 'burning';
            b.t = 0;
            b.x = b.tx;
            b.y = b.floorY;
            this.host.fx('ignite', b.tx, b.floorY);
          }
          continue;
        }
        if (box && (circleRect(b.x, b.y, b.r, box) || b.graze >= 0)) {
          b.state = 'batted';
          b.t = 0;
          b.vx = 900 + Math.max(0, p.vx) * 0.3;
          b.vy = -1500;
          this.host.batted(b);
          continue;
        }
        // iteration 4: when it first CLIPS him, a swing inside BAT.grace still bats it off his shoulder (late ≥ +130 ms)
        if (b.graze < 0 && running && circleRect(b.x, b.y, b.r * 0.8, hurt)) b.graze = 0;
        if (b.graze >= 0) {
          b.graze += dt;
          if (b.graze < BAT.grace) continue;
          b.state = 'smashed';
          b.t = 0;
          this.host.fx('shatter', b.x, b.y);
          if (!p.invulnerable) this.host.stumble(`thrown@${b.beat}`);
          continue;
        }
        const fy = this.L.floorYAt(b.x);
        if ((wb > b.beat && !Number.isNaN(fy) && b.y >= fy - 6) || wb > b.beat + 3) {
          b.state = 'smashed';
          b.t = 0;
          if (wb <= b.beat + 3) this.host.fx('shatter', b.x, Number.isNaN(fy) ? b.y : fy - 6);
        }
        continue;
      }
      if (b.state === 'batted') {
        b.vy += 900 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += 18 * dt;
        if (b.t > 0.9) b.state = 'out';
        continue;
      }
      if (b.state === 'smashed') {
        if (b.t > 0.6) b.state = 'out';
        continue;
      }
      if (b.state === 'burning') {
        if (wb > b.beat + FIRE.beats) {
          b.state = 'out';
          continue;
        }
        if (running && !p.invulnerable && overlaps(hurt, b.fire)) this.host.stumble(`firebomb@${b.beat}`);
      }
    }
    // ---------------------------------------------------------------- rolling balls
    for (const b of this.balls) {
      if (b.state === 'gone') continue;
      b.t += dt;
      if (b.state === 'idle') {
        if (wb < b.from) continue;
        b.state = 'rolling';
        b.t = 0;
      }
      if (b.state === 'rolling') {
        b.x = ballX(b, wb);
        b.y = b.floorY - b.r;
        b.rot = -b.x / b.r;
        if (running && !p.invulnerable && circleRect(b.x, b.y, b.r, hurt)) {
          b.state = 'hit';
          b.t = 0;
          b.vx = -350;
          b.vy = -700;
          this.host.fx('ballHit', b.x, b.y);
          this.host.stumble(`ball@${b.beat}`);
        } else if (wb > b.beat + 4) b.state = 'gone';
        continue;
      }
      if (b.state === 'hit') {
        b.vy += 2200 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot -= 10 * dt;
        if (b.t > 1.2) b.state = 'gone';
      }
    }
    // ---------------------------------------------------------------- hook rides
    const active = running && p.strikeActive;
    if (active && !this.wasActive && !this.hook) {
      // the press = the active edge minus the strike's startup
      // iteration 5: a hero BEHIND the grid (a stumble's knockback, still surging back) grabs by where he IS — the rope
      // hangs at its beat's x, so the window follows his position (a player who stumbled right before the zip used to
      // press on reaching the cable, past the +0.5 beat window, and fall every retry: reckless bot 26× at 206)
      const lag = Math.min(1.5, Math.max(0, this.L.beatAt(p.musicX) - this.L.beatAt(p.x)));
      const pressBeat = wb - Tun.strike.startup / p.spb - (Number.isFinite(lag) ? lag : 0);
      for (const h of this.hooks) {
        if (h.state !== 'idle' || pressBeat < h.beat - HOOK.early || pressBeat > h.beat + HOOK.late) continue;
        if (p.x > h.x1 - 8 || p.x < this.L.xAt(this.L.beatAt(h.x0) - 1.2)) continue;
        h.state = 'riding';
        h.t = 0;
        this.hook = h;
        p.strikeHitSomething = true;
        this.host.fx('hook', p.x + 40, hookY(h, p.x) - HOOK.hang);
        this.host.hooked?.(h);
        break;
      }
    }
    this.wasActive = active;
    const h = this.hook;
    if (h) {
      h.t += dt;
      if (!running || p.x >= h.x1) {
        // let go: drop onto whatever is under the end of the path (the fall-out rule measures from here)
        h.state = 'done';
        h.k = 1;
        this.hook = null;
        p.groundY = p.y;
      } else {
        h.k = Math.max(0, Math.min(1, (p.x - h.x0) / Math.max(1, h.x1 - h.x0)));
        p.y = hookY(h, Math.max(p.x, h.x0));
        p.vy = 0;
        p.grounded = false;
        p.jumping = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        p.groundY = p.y;
      }
    }
    if (!running) {
      this.stallT = 0;
      return;
    }
    // ---------------------------------------------------------------- climb rules
    if (!this.hook && !p.grounded && p.y > p.groundY + FALL_OUT) {
      this.host.die('pit');
      return;
    }
    const stalled = right && p.grounded && !p.sliding && Math.abs(p.vx) < SCRAMBLE.stallVx && p.stumbleLock <= 0;
    this.stallT = stalled ? this.stallT + dt : 0;
    if (this.stallT >= SCRAMBLE.delay) {
      const front = p.x + p.w / 2;
      const f = this.L.floors.find((s) => s.x0 >= front - 4 && s.x0 <= front + 30);
      const rise = f ? p.y - f.y : 0;
      if (f && rise >= SCRAMBLE.min && rise <= SCRAMBLE.max) {
        p.vy = -Math.sqrt(2 * p.gravity * (rise + 30));
        p.grounded = false;
        p.jumping = false;
        this.scrambles++;
        this.stallT = 0;
        this.host.fx('scramble', front, f.y);
      }
    }
  }

  /** once per whole beat k: schedule the telegraph sounds 1 beat before each arrival */
  beat(k: number): void {
    for (const b of this.bottles) if (b.state !== 'out' && b.beat - 1 >= k + 1 - 1e-6 && b.beat - 1 < k + 2 - 1e-6) this.host.telegraph('whistle', b.beat - 1);
    for (const b of this.balls) if (b.state !== 'gone' && b.beat - 1 >= k + 1 - 1e-6 && b.beat - 1 < k + 2 - 1e-6) this.host.telegraph('rumble', b.beat - 1);
  }

  /** presentation: set-piece cue active at `beat` (0..1 progress), or null */
  active(name: SetPieceName, beat: number): { cue: SetPieceCue; k: number } | null {
    for (const c of this.setPieces) if (c.name === name && beat >= c.beat && beat < c.beat + c.beats) return { cue: c, k: (beat - c.beat) / c.beats };
    return null;
  }
}

function circleRect(cx: number, cy: number, r: number, b: Rect): boolean {
  const dx = Math.max(b.x - cx, 0, cx - (b.x + b.w));
  const dy = Math.max(b.y - cy, 0, cy - (b.y + b.h));
  return dx * dx + dy * dy <= r * r;
}
