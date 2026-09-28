/**
 * Canvas setup: fixed LOGICAL resolution (1920x1080) scaled to fit the window with
 * letterboxing, rendered at device pixel ratio so it stays crisp on high-DPI screens.
 *
 * All game rendering happens in logical coordinates; call `beginFrame()` to get a context
 * whose transform maps logical px -> backing-store px.
 */
export const VIEW_W = 1920;
export const VIEW_H = 1080;
/** cap on the backing-store width (fill-rate guard for 4K/5K screens); still > logical res */
const MAX_BACKING_W = 2880;

export class Display {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** backing-store pixels per logical pixel */
  scale = 1;
  /** CSS pixels per logical pixel (for mapping pointer events) */
  cssScale = 1;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    // Fit 16:9 inside the window (letterbox / pillarbox).
    const s = Math.min(ww / VIEW_W, wh / VIEW_H);
    this.cssW = Math.floor(VIEW_W * s);
    this.cssH = Math.floor(VIEW_H * s);
    this.cssScale = s;
    const c = this.canvas;
    c.style.width = `${this.cssW}px`;
    c.style.height = `${this.cssH}px`;
    c.style.left = `${Math.floor((ww - this.cssW) / 2)}px`;
    c.style.top = `${Math.floor((wh - this.cssH) / 2)}px`;
    const k = Math.min(this.dpr, MAX_BACKING_W / Math.max(1, this.cssW));
    c.width = Math.max(1, Math.round(this.cssW * k));
    c.height = Math.max(1, Math.round(this.cssH * k));
    this.scale = c.width / VIEW_W;
  }

  /** Reset transform to logical space; returns the context. */
  beginFrame(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return ctx;
  }
}

/** Create an offscreen canvas for caching expensive procedural art. */
export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');
  return [c, ctx];
}
