/**
 * TintBake: the relighting primitive.
 *
 * A drawing is authored as up to N greyscale/alpha CHANNEL masks (paint them in white; alpha =
 * coverage). `compose(colours)` flattens them into one colour canvas, channel by channel in
 * order ("paint-over"), each channel filled with its colour. Relighting a whole parallax layer
 * = recomposing it with new colours: a handful of GPU blits, no path re-rendering.
 *
 * Re-composition is throttled globally (`TintBake.budget` per frame) so a lighting transition
 * never spikes a frame: stale layers just catch up a frame later.
 */
import { type Ctx, artResolution, ctx2d, makeCanvas, scratchCanvas } from './canvas';

/**
 * Cheap blur without ctx.filter (which is slow or broken on some GPUs / headless): downsample by
 * `radius`, then upsample twice with smoothing. Good enough for depth-of-field on foreground props.
 */
export function softBlur(c: HTMLCanvasElement, radius: number): void {
  const k = Math.max(1.5, radius / 1.5);
  const w = Math.max(1, Math.round(c.width / k));
  const h = Math.max(1, Math.round(c.height / k));
  const small = makeCanvas(w, h);
  const sg = ctx2d(small);
  sg.imageSmoothingQuality = 'high';
  sg.drawImage(c, 0, 0, w, h);
  const o = ctx2d(c);
  o.save();
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, c.width, c.height);
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, 0, 0, c.width, c.height);
  o.restore();
}

export class TintBake {
  static budget = 3;
  static used = 0;
  static composes = 0;
  /** total device pixels held by all TintBakes (channels + output) */
  static pixelsTotal = 0;
  /** call once per frame */
  static frame(): void {
    TintBake.used = 0;
  }

  readonly w: number;
  readonly h: number;
  readonly res: number;
  readonly channels: HTMLCanvasElement[] = [];
  readonly out: HTMLCanvasElement;
  private lastKey = '';
  /** blur radius (logical px) applied after composing, via cheap down/up-sampling (no ctx.filter) */
  blur = 0;

  constructor(w: number, h: number, nChannels: number, resMul = 1) {
    this.w = w;
    this.h = h;
    this.res = artResolution() * resMul;
    for (let i = 0; i < nChannels; i++) this.channels.push(makeCanvas(w * this.res, h * this.res));
    this.out = makeCanvas(w * this.res, h * this.res);
    TintBake.pixelsTotal += this.pixels();
  }

  /** context for painting channel i in logical units (white = full coverage) */
  ch(i: number): Ctx {
    const g = ctx2d(this.channels[i]);
    g.setTransform(this.res, 0, 0, this.res, 0, 0);
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    return g;
  }

  /** true if these colours differ from the currently composed ones */
  stale(colours: readonly (string | null)[]): boolean {
    return colours.join('|') !== this.lastKey;
  }

  /**
   * Compose with the given CSS colours (null = skip channel). Returns false if throttled
   * (unless `force`). The first compose always happens.
   */
  compose(colours: readonly (string | null)[], force = false): boolean {
    const key = colours.join('|');
    if (key === this.lastKey) return true;
    if (!force && this.lastKey !== '' && TintBake.used >= TintBake.budget) return false;
    TintBake.used++;
    TintBake.composes++;
    this.lastKey = key;
    const W = this.out.width;
    const H = this.out.height;
    const o = ctx2d(this.out);
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, W, H);
    const { c: sc, g: s } = scratchCanvas(W, H);
    for (let i = 0; i < this.channels.length; i++) {
      const col = colours[i];
      if (!col) continue;
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.globalCompositeOperation = 'source-over';
      s.clearRect(0, 0, W, H);
      s.drawImage(this.channels[i], 0, 0);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = col;
      s.fillRect(0, 0, W, H);
      s.globalCompositeOperation = 'source-over';
      o.drawImage(sc, 0, 0, W, H, 0, 0, W, H);
    }
    if (this.blur > 0) softBlur(this.out, this.blur * this.res);
    return true;
  }

  pixels(): number {
    return this.out.width * this.out.height * (this.channels.length + 1);
  }
}
