/**
 * Play-layer sea (parallax 1). Two passes around the terrain:
 *   drawBack  — surface (heaves on the bass), body gradient, drifting foam streaks, whitecaps
 *   drawFront — a lower, closer wave band IN FRONT of the terrain (columns look submerged), foam
 *               crest, and surf bursts at terrain edges on 2 & 4 (snare)
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, mix } from '../core/color';
import { puff } from '../core/draw';
import { TAU, clamp01, easeOut, hash } from '../core/math';
import { type ArtCamera, SEA_Y, layerView, pushLayer } from './camera';
import { type Lighting, atmos } from './lighting';

export interface SeaOptions {
  /** world x positions where terrain meets the water (surf bursts on the snare) */
  edges?: number[];
  /** override surface level (world y) */
  level?: number;
}

export class Sea {
  private key = -1;
  private back: CanvasGradient | null = null;
  private front: CanvasGradient | null = null;

  private grads(g: Ctx, L: Lighting, version: number) {
    if (this.key === version && this.back && this.front) return;
    this.key = version;
    const top = atmos(L, L.seaTop);
    const deep = atmos(L, L.seaDeep);
    const b = g.createLinearGradient(0, -30, 0, 420);
    b.addColorStop(0, css(mix(top, atmos(L, L.skyLow), 0.35)));
    b.addColorStop(0.12, css(top));
    b.addColorStop(1, css(deep));
    this.back = b;
    const f = g.createLinearGradient(0, -20, 0, 300);
    f.addColorStop(0, css(mix(top, deep, 0.25), 0.93));
    f.addColorStop(1, css(mix(deep, [0, 0, 0], 0.2), 0.98));
    this.front = f;
  }

  surface(x: number, b: BeatInfo, front: boolean): number {
    const t = b.time;
    const heave = hit(b, 'bass', 0.16) * 7 + Math.sin(t * 0.9) * 4;
    if (!front) return Math.sin(x * 0.006 + t * 1.3) * 7 + Math.sin(x * 0.017 - t * 2.1) * 3 - heave;
    return Math.sin(x * 0.0045 - t * 1.1 + 2) * 10 + Math.sin(x * 0.013 + t * 2.4) * 4 - heave * 1.3;
  }

  drawBack(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo, version: number, o: SeaOptions = {}): void {
    const v = layerView(cam, 1);
    const lvl = o.level ?? SEA_Y;
    if (v.y1 < lvl - 30) return;
    this.grads(g, L, version);
    pushLayer(g, v);
    g.translate(0, lvl);
    const x0 = Math.floor(v.x0 / 24) * 24 - 24;
    const x1 = v.x1 + 24;
    const bottom = v.y1 - lvl + 10;
    g.beginPath();
    g.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 24) g.lineTo(x, this.surface(x, b, false));
    g.lineTo(x1, bottom);
    g.closePath();
    g.fillStyle = this.back!;
    g.fill();
    // crest foam line
    const foam = atmos(L, L.foam);
    g.strokeStyle = css(foam, 0.9);
    g.lineWidth = 3;
    g.beginPath();
    for (let x = x0; x <= x1; x += 24) {
      const y = this.surface(x, b, false);
      if (x === x0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    // drifting foam streaks + sparkle
    g.fillStyle = css(foam, 0.35);
    const drift = b.time * 30;
    for (let i = 0; i < 60; i++) {
      const sx = hash(i * 11) * 2400;
      const x = sx + Math.floor((v.x0 - sx + drift) / 2400 + 1) * 2400 - drift;
      if (x > v.x1) continue;
      const y = 14 + hash(i * 7) * 120;
      g.fillRect(x, y, 20 + hash(i) * 40, 2);
    }
    // whitecaps
    if (L.whitecaps > 0.3) {
      g.fillStyle = css(foam, 0.8 * L.whitecaps);
      for (let x = Math.floor(v.x0 / 90) * 90; x < x1; x += 90) {
        const k = hash(x * 3 + Math.floor(b.time * 1.5));
        if (k < 0.55) continue;
        const y = this.surface(x, b, false);
        g.beginPath();
        g.ellipse(x, y - 1, 14 + k * 20, 4, 0, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  }

  drawFront(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo, version: number, o: SeaOptions = {}): void {
    const v = layerView(cam, 1);
    const lvl = (o.level ?? SEA_Y) + 36;
    if (v.y1 < lvl - 40) return;
    this.grads(g, L, version);
    pushLayer(g, v);
    const x0 = Math.floor(v.x0 / 20) * 20 - 20;
    const x1 = v.x1 + 20;
    // surf bursts at terrain edges on 2 & 4 (behind the front band's crest)
    const sn = b.since.snare;
    const foamCol = css(atmos(L, L.foam));
    if (o.edges && sn < 0.6) {
      const k = clamp01(sn / 0.6);
      for (const ex of o.edges) {
        if (ex < v.x0 - 200 || ex > v.x1 + 200) continue;
        for (let i = 0; i < 7; i++) {
          const u = easeOut(clamp01((sn - i * 0.025) / 0.4));
          const px = ex + (i - 3) * 10 * (0.5 + u);
          const py = lvl - 20 - u * (60 + hash(i + ex) * 60) + k * k * 60;
          puff(g, px, py, 9 + u * 14, (1 - k) * 0.9, foamCol);
        }
      }
    }
    g.translate(0, lvl);
    const bottom = v.y1 - lvl + 10;
    g.beginPath();
    g.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 20) g.lineTo(x, this.surface(x, b, true));
    g.lineTo(x1, bottom);
    g.closePath();
    g.fillStyle = this.front!;
    g.fill();
    // lush foam crest: bumpy rolling line
    g.fillStyle = foamCol;
    g.beginPath();
    for (let x = x0; x <= x1; x += 16) {
      const y = this.surface(x, b, true);
      const r = 4 + (Math.sin(x * 0.07 + b.time * 3) * 0.5 + 0.5) * 5;
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
    g.fill();
    // a second, broken foam lace just below
    g.fillStyle = css(atmos(L, L.foam), 0.45);
    for (let x = x0; x <= x1; x += 34) {
      const y = this.surface(x, b, true) + 14 + Math.sin(x * 0.03) * 4;
      g.fillRect(x, y, 18 + Math.sin(x) * 8, 2.5);
    }
    g.restore();
  }
}
