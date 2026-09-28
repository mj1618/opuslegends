/**
 * THE STAR'S PASS (iteration 6, review iter5 fix 3): Slim is drawn AFTER every light / bloom / flash layer, so the
 * spotlights light the scene around him but never bleach his tangerine, and he gets his own subtle RIM LIGHT:
 *
 *   1. the rig is drawn once into an offscreen canvas (device pixels, same transform as the world)
 *   2. a tinted silhouette copy (source-in) is laid down twice behind him: a cream rim offset up-left (the key light
 *      catching his back edge) and a soft ink shadow offset down-right (separates him from bright backgrounds)
 *   3. then the rig itself
 *
 * Cost: three drawImage calls of a ~Slim-sized region (GPU), one extra 2D path pass is avoided (the rig is drawn once).
 */
import { type SlimState, drawSlim } from '../art/grindhouse/slim';

/** half-size (world px) of the box around Slim's feet that the offscreen pass covers (his strike crescent included) */
const BOX_W = 300;
const BOX_UP = 330;
const BOX_DOWN = 90;

export class HeroPass {
  private cv: HTMLCanvasElement | null = null;
  private tint: HTMLCanvasElement | null = null;
  private ink: HTMLCanvasElement | null = null;
  /** rim colour (css) and strength 0..1 — set per frame by the renderer from the scene light */
  rim = 'rgba(255,238,204,1)';
  rimA = 0.85;

  private ensure(w: number, h: number): [CanvasRenderingContext2D, CanvasRenderingContext2D, CanvasRenderingContext2D] | null {
    if (!this.cv || this.cv.width < w || this.cv.height < h) {
      const W = Math.max(w, this.cv?.width ?? 0);
      const H = Math.max(h, this.cv?.height ?? 0);
      this.cv = document.createElement('canvas');
      this.cv.width = W;
      this.cv.height = H;
      this.tint = document.createElement('canvas');
      this.tint.width = W;
      this.tint.height = H;
      this.ink = document.createElement('canvas');
      this.ink.width = W;
      this.ink.height = H;
    }
    const a = this.cv.getContext('2d');
    const b = this.tint?.getContext('2d');
    const k = this.ink?.getContext('2d');
    return a && b && k ? [a, b, k] : null;
  }

  /**
   * draw Slim with the rim + shadow. `ctx` has the WORLD transform applied (camera + DPR); px, py = feet (world).
   * `alpha` = the i-frame blink.
   */
  draw(ctx: CanvasRenderingContext2D, px: number, py: number, s: SlimState, alpha: number): void {
    const m = ctx.getTransform();
    const sc = Math.hypot(m.a, m.b);
    // the box in device pixels (bounds of the 4 transformed corners: the shake can roll the camera)
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [wx, wy] of [
      [px - BOX_W, py - BOX_UP],
      [px + BOX_W, py - BOX_UP],
      [px - BOX_W, py + BOX_DOWN],
      [px + BOX_W, py + BOX_DOWN],
    ]) {
      const dx = m.a * wx + m.c * wy + m.e;
      const dy = m.b * wx + m.d * wy + m.f;
      x0 = Math.min(x0, dx);
      y0 = Math.min(y0, dy);
      x1 = Math.max(x1, dx);
      y1 = Math.max(y1, dy);
    }
    const w = Math.ceil(x1 - x0) + 8;
    const h = Math.ceil(y1 - y0) + 8;
    const c = this.ensure(w, h);
    if (!c || sc <= 0 || w > 4096 || h > 4096) {
      ctx.globalAlpha = alpha;
      drawSlim(ctx, px, py, s);
      ctx.globalAlpha = 1;
      return;
    }
    const [g, t, k] = c;
    const ox = Math.floor(x0) - 4;
    const oy = Math.floor(y0) - 4;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(m.a, m.b, m.c, m.d, m.e - ox, m.f - oy);
    drawSlim(g, px, py, s);
    // tinted silhouettes (rim light, ink shadow)
    for (const [q, col] of [
      [t, this.rim],
      [k, 'rgb(13,8,10)'],
    ] as [CanvasRenderingContext2D, string][]) {
      q.setTransform(1, 0, 0, 1, 0, 0);
      q.globalCompositeOperation = 'source-over';
      q.clearRect(0, 0, w, h);
      q.drawImage(this.cv as HTMLCanvasElement, 0, 0, w, h, 0, 0, w, h);
      q.globalCompositeOperation = 'source-in';
      q.fillStyle = col;
      q.fillRect(0, 0, w, h);
      q.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const d = Math.max(1.5, 2.6 * sc);
    const src = this.cv as HTMLCanvasElement;
    const tin = this.tint as HTMLCanvasElement;
    // ink shadow (down-right), then the cream rim (up-left), then the star
    ctx.globalAlpha = 0.5 * alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.ink as HTMLCanvasElement, 0, 0, w, h, ox + d * 1.3, oy + d * 1.5, w, h);
    ctx.globalAlpha = this.rimA * alpha;
    ctx.drawImage(tin, 0, 0, w, h, ox - d, oy - d, w, h);
    ctx.globalAlpha = 0.45 * this.rimA * alpha;
    ctx.drawImage(tin, 0, 0, w, h, ox + d * 0.6, oy - d * 1.3, w, h);
    ctx.globalAlpha = alpha;
    ctx.drawImage(src, 0, 0, w, h, ox, oy, w, h);
    ctx.restore();
  }
}
