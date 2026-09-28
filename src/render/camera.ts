/**
 * Camera: smooth follow with velocity look-ahead, platformer-style vertical framing (tracks the
 * last ground height, not every jump), trauma-based screen shake, zoom punches, and a
 * beat-driven zoom pulse hook.
 */
import { VIEW_H, VIEW_W } from '../engine/display';
import { clamp, damp, noise1 } from '../engine/math';
import { Tun } from '../game/tunables';

/**
 * Presentation framing (render-owned, never touches physics): Rayman heroes are BIG. The art's Slim
 * is ~143 world px tall (drawn at 1.1x over the 56x100 hitbox, DESIGN §2), so the camera zooms in by
 * `zoomMul` on top of the level's zoom (0.95 x 1.14 = 1.08 -> Slim ~155 px at 1080p) and moves the hero
 * left to `leadFraction` so the runway stays ~3.5 beats (was 3.7).
 */
export const FRAMING = { zoomMul: 1.14, leadFraction: 0.25 };

export class Camera {
  /** world point at the view center */
  x = 0;
  y = 0;
  zoom = 1;
  /** additive zoom offset driven by tweens (zoom punches) */
  zoomPunch = 0;
  /** additive zoom from beat pulses */
  beatZoom = 0;
  /** additive zoom from the music director: slow section framing (chorus zoom-out) — render-owned */
  musicZoom = 0;
  /** additive zoom from the music director: fast punches on big hits (not used for framing) */
  hitZoom = 0;
  /** additive zoom from set-piece MOMENTS (big launch reveal, walkdown smash) — render-owned, framed like musicZoom */
  momentZoom = 0;
  /** render-only vertical offset (world px, negative = look up) for set-piece moments (the launch's city reveal) */
  momentY = 0;
  trauma = 0;
  private lead = 1;
  private t = 0;
  /** final values for this frame (with shake) */
  rx = 0;
  ry = 0;
  rzoom = 1;
  rangle = 0;

  snap(px: number, groundY: number): void {
    this.lead = 1;
    this.x = this.targetX(px);
    this.y = this.targetYForGround(groundY);
  }

  /** level zoom x framing (what the follow maths frames with) */
  get frameZoom(): number {
    return this.zoom * FRAMING.zoomMul * (1 + this.musicZoom + this.momentZoom);
  }

  private targetX(px: number): number {
    return px + (0.5 - FRAMING.leadFraction) * (VIEW_W / this.frameZoom) * this.lead;
  }

  private targetYForGround(gy: number): number {
    return gy - (Tun.camera.groundFraction - 0.5) * (VIEW_H / this.frameZoom);
  }

  /**
   * @param px,py  interpolated player feet position
   * @param ph     player height
   * @param groundY last ground surface under the player
   * @param vxNorm  player vx / max speed (-1..1), drives look-ahead
   */
  update(dt: number, px: number, py: number, ph: number, groundY: number, vxNorm: number, dead: boolean): void {
    this.t += dt;
    const C = Tun.camera;
    if (!dead) {
      // look-ahead follows direction of travel, eased
      const wantLead = Math.abs(vxNorm) > 0.2 ? Math.sign(vxNorm) : this.lead;
      this.lead = damp(this.lead, wantLead, 2.5, dt);
      this.x = damp(this.x, this.targetX(px), C.followX, dt);
      const vh = VIEW_H / this.frameZoom;
      let ty = this.targetYForGround(groundY);
      const top = ty - vh / 2;
      if (py - ph < top + C.topMargin * vh) ty = py - ph - C.topMargin * vh + vh / 2;
      if (py > top + C.bottomMargin * vh) ty = py - C.bottomMargin * vh + vh / 2;
      // don't chase the player down into pits
      ty = Math.min(ty, this.targetYForGround(groundY) + 160);
      this.y = damp(this.y, ty, C.followY, dt);
    }
    // shake
    this.trauma = Math.max(0, this.trauma - C.traumaDecay * dt);
    const s = this.trauma * this.trauma;
    const f = 18;
    this.rx = this.x + C.maxShakeOffset * s * noise1(this.t * f, 1);
    this.ry = this.y + this.momentY + C.maxShakeOffset * s * noise1(this.t * f, 2);
    this.rangle = C.maxShakeAngle * s * noise1(this.t * f, 3);
    this.rzoom = this.zoom * FRAMING.zoomMul * (1 + this.zoomPunch + this.beatZoom + this.musicZoom + this.momentZoom + this.hitZoom);
  }

  addTrauma(a: number): void {
    this.trauma = clamp(this.trauma + a, 0, 1);
  }

  /** Apply the world transform to a context already in logical (1920x1080) space. */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(VIEW_W / 2, VIEW_H / 2);
    if (this.rangle !== 0) ctx.rotate(this.rangle);
    ctx.scale(this.rzoom, this.rzoom);
    ctx.translate(-Math.round(this.rx * 4) / 4, -Math.round(this.ry * 4) / 4);
  }

  /** World-space visible bounds (approx; ignores rotation). */
  viewBounds(): { x0: number; y0: number; x1: number; y1: number } {
    const hw = VIEW_W / 2 / this.rzoom + 60;
    const hh = VIEW_H / 2 / this.rzoom + 60;
    return { x0: this.rx - hw, y0: this.ry - hh, x1: this.rx + hw, y1: this.ry + hh };
  }
}
