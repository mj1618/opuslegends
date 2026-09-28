/**
 * FILM PASS — the grindhouse print look (CUE-FU art direction), all cheap:
 *   - grain: 4 cached noise tiles, re-picked + re-offset every film frame (24 fps), 'overlay' blend
 *   - vertical scratches, dust specks and hairs (seeded per film frame; a couple drift for seconds)
 *   - exposure flicker, warm print tint ('multiply'), vignette (cached)
 *   - gate weave: 1-2 px jitter that pushes on the beat + bass (caller applies `weave()` to the scene)
 *   - reel-change "cigarette burn" cue marks (top-right) on crashes / on demand
 *   - dubbed cream subtitles (DESIGN: cream #F4EFE2 + film-black outline, never yellow = reward)
 *   - accessibility presets: filmPreset('full' | 'light' | 'off')
 *
 *   const film = new FilmPass();
 *   const w = film.weave(beat);  ctx.save(); ctx.translate(w.x, w.y); ...draw the scene...; ctx.restore();
 *   film.draw(ctx, beat);                       // screen space, after the scene
 *   drawSubtitle(ctx, 'HAI!', { alpha });        // anywhere after
 */
import type { BeatInfo } from '../core/beat';
import { type Ctx, ctx2d, makeCanvas } from '../core/canvas';
import { hash, rng } from '../core/math';
import { CF } from '../palette';

const W = 1920;
const H = 1080;
const TILE = 256;

export interface FilmOptions {
  /** 0..1 overall strength (0 = clean digital) */
  amount?: number;
  grain?: number;
  scratches?: number;
  dust?: number;
  flicker?: number;
  tint?: number;
  vignette?: number;
  /** force a cue mark (0..1), else they flash for one beat on crashes */
  burn?: number;
  /** 0..1 extra scratch density (rises as the Burn chaser closes in) */
  damage?: number;
}

/** "Film damage" accessibility setting -> options */
export function filmPreset(level: 'full' | 'light' | 'off'): FilmOptions {
  if (level === 'off') return { amount: 0 };
  if (level === 'light') return { amount: 1, grain: 0.5, scratches: 0.3, dust: 0.3, flicker: 0, tint: 1, vignette: 1 };
  return { amount: 1 };
}

export class FilmPass {
  private tiles: HTMLCanvasElement[] = [];
  private vignette: HTMLCanvasElement;
  /** film frames per second of the "projector" */
  fps = 24;

  constructor() {
    const r = rng(1973);
    for (let k = 0; k < 4; k++) {
      const c = makeCanvas(TILE, TILE);
      const g = ctx2d(c);
      const img = g.createImageData(TILE, TILE);
      for (let i = 0; i < TILE * TILE; i++) {
        // clumpy grain: mix of fine noise and occasional bright/dark clumps
        const v = r();
        const n = v < 0.5 ? Math.pow(v * 2, 2) * 0.5 : 1 - Math.pow((1 - v) * 2, 2) * 0.5;
        const L = Math.round(n * 255);
        img.data[i * 4] = L;
        img.data[i * 4 + 1] = L;
        img.data[i * 4 + 2] = L;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      this.tiles.push(c);
    }
    this.vignette = makeCanvas(480, 270);
    const v = ctx2d(this.vignette);
    const gr = v.createRadialGradient(240, 135, 70, 240, 135, 300);
    gr.addColorStop(0, 'rgba(26,20,16,0)');
    gr.addColorStop(0.65, 'rgba(26,20,16,0.18)');
    gr.addColorStop(1, 'rgba(26,20,16,0.75)');
    v.fillStyle = gr;
    v.fillRect(0, 0, 480, 270);
  }

  /** film frame index for time t */
  frame(t: number): number {
    return Math.max(0, Math.floor(t * this.fps));
  }

  /**
   * Gate weave for the scene: <= 2 px horizontal + <= 1 px vertical, in time with the bassline
   * (render offset only — never touches collision).
   */
  weave(b: BeatInfo, amount = 1): { x: number; y: number } {
    const f = this.frame(b.time);
    const bass = b.since.bass === Infinity ? 0 : Math.exp(-b.since.bass / 0.12);
    const jx = (hash(f * 3 + 1) - 0.5) * 0.5;
    const jy = (hash(f * 7 + 2) - 0.5) * 0.4;
    const sway = Math.sin(b.beat * Math.PI) * 1.1 + bass * 0.5;
    const x = Math.max(-2, Math.min(2, jx + sway));
    const y = Math.max(-1, Math.min(1, jy + bass * 0.6));
    return { x: x * amount, y: y * amount };
  }

  draw(g: Ctx, b: BeatInfo, o: FilmOptions = {}): void {
    const A = o.amount ?? 1;
    if (A <= 0.01) return;
    const f = this.frame(b.time);
    g.save();
    // warm print tint
    const tint = (o.tint ?? 1) * A;
    if (tint > 0.01) {
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.45 * tint;
      g.fillStyle = '#FFF1DC';
      g.fillRect(0, 0, W, H);
    }
    // grain (overlay), chunky: tiles drawn at 2x
    const gr = (o.grain ?? 1) * A;
    if (gr > 0.01) {
      g.globalCompositeOperation = 'overlay';
      g.globalAlpha = 0.07 * gr;
      const n = this.tiles.length;
      const tile = this.tiles[(((f % n) + n) % n) | 0];
      const ox = -Math.floor(hash(f) * TILE * 2);
      const oy = -Math.floor(hash(f + 99) * TILE * 2);
      for (let y = oy; y < H; y += TILE * 2) for (let x = ox; x < W; x += TILE * 2) g.drawImage(tile, x, y, TILE * 2, TILE * 2);
    }
    g.globalCompositeOperation = 'source-over';
    // exposure flicker (1.5% at 24 Hz) + a one-film-frame shutter dip on every downbeat
    const fl = (o.flicker ?? 1) * A;
    if (fl > 0.01) {
      const v = hash(f * 5 + 3);
      g.globalAlpha = 0.03 * v * fl;
      g.fillStyle = v > 0.5 ? '#000' : '#FFF6E0';
      g.fillRect(0, 0, W, H);
      if (b.barPhase * 4 * b.spb < 1 / this.fps) {
        g.globalAlpha = 0.14 * fl;
        g.fillStyle = CF.filmBlack;
        g.fillRect(0, 0, W, H);
      }
    }
    // scratches: a couple of long-lived ones that drift + per-frame flashes
    const sc = (o.scratches ?? 1) * A;
    if (sc > 0.01) {
      g.lineCap = 'butt';
      for (let k = 0; k < 2; k++) {
        const life = Math.floor(b.time / (2.5 + k * 1.3));
        if (hash(life * 11 + k) < 0.45) continue;
        const x = hash(life * 13 + k) * W + Math.sin(b.time * 0.9 + k) * 6;
        g.globalAlpha = (0.25 + hash(f + k) * 0.2) * sc;
        g.strokeStyle = k ? 'rgba(255,248,230,1)' : 'rgba(26,20,16,1)';
        g.lineWidth = 1 + hash(life + k) * 1.2;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + (hash(life * 3) - 0.5) * 12, H);
        g.stroke();
      }
      const dmg = o.damage ?? 0;
      const n = hash(f * 17) < 0.3 + dmg * 0.6 ? 1 + Math.floor(hash(f * 19) * (3 + dmg * 4)) : 0;
      for (let k = 0; k < n; k++) {
        const x = hash(f * 23 + k) * W;
        const y0 = hash(f * 29 + k) * H * 0.5;
        const len = H * (0.2 + hash(f * 31 + k) * 0.8);
        g.globalAlpha = 0.35 * sc;
        g.strokeStyle = hash(f + k * 5) > 0.5 ? '#FFF6E0' : CF.filmBlack;
        g.lineWidth = 1 + hash(f * 37 + k);
        g.beginPath();
        g.moveTo(x, y0);
        g.lineTo(x + (hash(f * 41 + k) - 0.5) * 6, y0 + len);
        g.stroke();
      }
    }
    // dust specks + the odd hair
    const du = (o.dust ?? 1) * A;
    if (du > 0.01) {
      const n = Math.floor(hash(f * 43) * 3);
      for (let k = 0; k < n; k++) {
        const x = hash(f * 47 + k) * W;
        const y = hash(f * 53 + k) * H;
        const rad = 1 + hash(f * 59 + k) * 3.5;
        g.globalAlpha = 0.5 * du;
        g.fillStyle = hash(f * 61 + k) > 0.3 ? CF.filmBlack : '#FFF6E0';
        g.beginPath();
        g.ellipse(x, y, rad, rad * (0.5 + hash(k + f) * 0.8), hash(k) * 3, 0, Math.PI * 2);
        g.fill();
      }
      if (Math.floor(b.time / 8) !== Math.floor((b.time - 1 / 24) / 8) || hash(f * 67) < 0.004) {
        const x = hash(f * 71) * W;
        const y = hash(f * 73) * H;
        g.globalAlpha = 0.55 * du;
        g.strokeStyle = CF.filmBlack;
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + 30, y - 20, x + 10, y + 40, x + 50, y + 30);
        g.stroke();
      }
    }
    // vignette
    const vg = (o.vignette ?? 1) * A;
    if (vg > 0.01) {
      g.globalAlpha = 0.34 * vg;
      g.drawImage(this.vignette, 0, 0, W, H);
    }
    // reel-change cue mark ("cigarette burn", 36 px) for one beat on the crash
    const burn = o.burn ?? (b.since.crash < b.spb ? 1 : 0);
    if (burn > 0.01) drawCueMark(g, W - 170, 150, 18, burn);
    g.restore();
  }
}

/** A reel-change cue mark: a pale, ragged-edged circle with a dark rim. */
export function drawCueMark(g: Ctx, x: number, y: number, r: number, alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(26,20,16,0.9)';
  g.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = r * 1.15 + (hash(i * 3) - 0.5) * 4;
    if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
  g.fillStyle = '#FFF4DA';
  g.beginPath();
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = r * 0.95 + (hash(i * 7 + 1) - 0.5) * 3;
    if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.fill();
  g.restore();
}

export interface SubtitleOptions {
  alpha?: number;
  /** baseline y (default 950) */
  y?: number;
  x?: number;
  size?: number;
  /** 0..1 pop-in scale bounce */
  pop?: number;
  align?: CanvasTextAlign;
}

/** Dubbed subtitle: subtitle-yellow bold sans with a heavy black outline. */
export function drawSubtitle(g: Ctx, text: string, o: SubtitleOptions = {}): void {
  const a = o.alpha ?? 1;
  if (a <= 0.01) return;
  const size = o.size ?? 46;
  g.save();
  g.globalAlpha = a;
  g.translate(o.x ?? W / 2, o.y ?? 950);
  const p = o.pop ?? 0;
  if (p > 0) g.scale(1 + p * 0.25, 1 + p * 0.25);
  g.font = `700 ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  g.textAlign = o.align ?? 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  g.strokeStyle = CF.filmBlack;
  g.lineWidth = size * 0.16;
  g.strokeText(text, 0, 0);
  g.fillStyle = CF.subtitle;
  g.fillText(text, 0, 0);
  g.restore();
}

/**
 * Trash-talk subtitle PLATFORM (world space): big cream letters with a film-black outline sitting on
 * a thin cream ledge (the walkable top is y). Cream, never yellow, so it never reads as reward.
 */
export function drawSubtitleBar(g: Ctx, x: number, y: number, w: number, text: string, alpha = 1): void {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = CF.filmBlack;
  g.fillRect(x - 3, y - 3, w + 6, 12);
  g.fillStyle = CF.subtitle;
  g.fillRect(x, y, w, 6);
  g.restore();
  drawSubtitle(g, text, { x: x + w / 2, y: y + 50, size: 40, alpha });
}
