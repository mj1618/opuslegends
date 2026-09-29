/**
 * SlimDriver: maps the REAL player/game state onto the art rig's SlimState every frame
 * (src/art/grindhouse/slim.ts). Presentation only — reads state, never writes it.
 *
 *   run      grounded + moving; leg phase from DISTANCE (x / SLIM_STRIDE) so feet plant on the beat grid
 *   hop/fall airborne, split on vy; poseTime from take-off
 *   land     first 0.16 s (running) / 0.3 s (standing) after touching down
 *   strike   player.strikeTime (contact frame = the press); `heave` when the strike Heaved a goon
 *   slide    player.sliding          stumble  first 0.4 s of the stumble i-frames
 *   dead     player.mode 'dead'      respawn  0.45 s splice-pop after every (re)spawn
 *   victory  finish / end screen     idle     everything else (beat swagger: flex bar, chalk bar, cue spin)
 *
 * The look: the inked-comic Slim (art/grindhouse/slimx, iteration 9) — `?slim=old` draws the original capsule rig for
 * comparison (every `drawSlim` call: the run, the title, the poster).
 */
import { SLIM_POSE_LEN, SLIM_STRIDE, type SlimPose, type SlimState, setSlimLook } from '../art/grindhouse/slim';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';

/** Slim's draw scale over the 56x100 hitbox (DESIGN §2: ~144 px tall) */
export const SLIM_SCALE = 1.1;

export class SlimDriver {
  constructor() {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    setSlimLook(q?.get('slim') === 'old' ? 'old' : 'ink');
  }
  readonly s: SlimState = { pose: 'idle', poseTime: 0, time: 0, scale: SLIM_SCALE, facing: 1 };
  private pose: SlimPose = 'idle';
  private poseStart = 0;
  private wasGrounded = true;
  private airStart = 0;
  private landAt = -9;
  private spawnAt = -9;
  private lastRun = -1;
  private lastPhase = '';
  private heaves = 0;
  private heaveAt = -9;
  /** 0..1 alpha (i-frame blink) */
  alpha = 1;

  /** @param now presentation clock (s, keeps running while the music is stopped) */
  update(g: Game, now: number): SlimState {
    const p = g.player;
    const s = this.s;
    // (re)spawn detection: new run or a new count-in after dying
    if (g.runId !== this.lastRun || (g.phase === 'countIn' && this.lastPhase === 'dying')) this.spawnAt = now;
    this.lastRun = g.runId;
    this.lastPhase = g.phase;
    if (g.stats.heaves > this.heaves) this.heaveAt = now;
    this.heaves = g.stats.heaves;

    if (p.grounded && !this.wasGrounded) this.landAt = now;
    if (!p.grounded && this.wasGrounded) this.airStart = now;
    this.wasGrounded = p.grounded;

    const moving = Math.abs(p.vx) > 50;
    const sinceStumble = p.iframes > 0 ? Tun.stumble.iframesBeats * p.spb - p.iframes : Infinity;
    let pose: SlimPose;
    let pt = -1;
    if (g.scene === 'end' || g.phase === 'finished') pose = p.grounded && !moving ? 'victory' : p.grounded ? 'run' : p.vy < 0 ? 'hop' : 'fall';
    else if (p.mode === 'dead') pose = 'dead';
    else if (sinceStumble < (SLIM_POSE_LEN.stumble ?? 0.4)) {
      pose = 'stumble';
      pt = sinceStumble;
    } else if (p.strikeTime >= 0 && p.strikeTime < 0.46) {
      const heave = now - this.heaveAt < 0.5;
      pose = heave ? 'heave' : 'strike';
      pt = heave ? now - this.heaveAt : p.strikeTime;
    } else if (now - this.spawnAt < (SLIM_POSE_LEN.respawn ?? 0.45) && g.phase !== 'coldOpen') {
      pose = 'respawn';
      pt = now - this.spawnAt;
    } else if (p.sliding) pose = 'slide';
    else if (!p.grounded) pose = p.vy < 0 ? 'hop' : 'fall';
    else if (now - this.landAt < (moving ? 0.14 : 0.3)) pose = 'land';
    else pose = moving ? 'run' : 'idle';

    if (pose !== this.pose) {
      this.pose = pose;
      this.poseStart = pose === 'hop' || pose === 'fall' ? this.airStart : pose === 'land' ? this.landAt : now;
    }
    s.pose = pose;
    s.poseTime = pt >= 0 ? pt : now - this.poseStart;
    s.time = now;
    s.beat = g.groove.beat;
    s.beatPhase = g.groove.beat - Math.floor(g.groove.beat);
    s.runPhase = p.x / SLIM_STRIDE;
    s.speed = Math.abs(p.vx);
    s.vy = p.vy;
    s.facing = p.facing < 0 ? -1 : 1;
    s.scale = SLIM_SCALE;
    // the controller's squash spring, damped to 30 % (the rig squashes per pose on its own)
    s.squashX = 1 + (p.sx - 1) * 0.3;
    s.squashY = 1 + (p.sy - 1) * 0.3;
    s.perfect = Math.max(0, Math.min(1, g.freezeFx / 0.2));
    // i-frames after the stumble tumble: blink
    this.alpha = p.iframes > 0 && sinceStumble >= 0.4 ? (Math.floor(now * 16) % 2 ? 0.35 : 1) : 1;
    return s;
  }
}
