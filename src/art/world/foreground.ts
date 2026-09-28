/**
 * Foreground (parallax 1.3): sparse, soft-focus silhouettes along the BOTTOM edge only (rocks,
 * kelp, a drifting net with floats) + spray bursts on the snare. Never covers the play band.
 */
import { type BeatInfo } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { puff } from '../core/draw';
import { TAU, clamp01, easeOut, hash, rng } from '../core/math';
import { type ArtCamera, SEA_Y, pushLayer } from './camera';
import { type Lighting, atmos, lit } from './lighting';
import { TiledLayer } from './tiledLayer';

const TOP = SEA_Y - 70;

export class Foreground {
  readonly layer: TiledLayer;
  constructor() {
    // 0 silhouette, 1 rim light, 2 floats (sea glass)
    this.layer = new TiledLayer(2600, TOP, 300, 1.3, 3, (ch, W, H, anchors) => {
      const sil = ch(0);
      const rim = ch(1);
      const gl = ch(2);
      const r = rng(12);
      const clusters = [180, 1150, 1900];
      for (const cx of clusters) {
        for (const dx of [0, -W, W]) {
          // rock cluster
          for (let i = 0; i < 4; i++) {
            const x = cx + dx + (i - 1.5) * 70 + r() * 20;
            const rw = 60 + r() * 60;
            const ry = H - 40 - r() * 30;
            sil.beginPath();
            sil.ellipse(x, ry + 60, rw, 70 + r() * 30, 0, Math.PI, TAU);
            sil.fill();
            rim.lineWidth = 4;
            rim.beginPath();
            rim.ellipse(x, ry + 60, rw - 2, 68, 0, Math.PI * 1.15, Math.PI * 1.6);
            rim.stroke();
          }
          // kelp strands
          for (let i = 0; i < 6; i++) {
            const x = cx + dx + (i - 3) * 38 + r() * 20;
            const h = 110 + r() * 150;
            sil.beginPath();
            sil.moveTo(x - 7, H);
            for (let k = 1; k <= 10; k++) {
              const t = k / 10;
              sil.lineTo(x + Math.sin(t * 5 + i) * 16 * t - 7 * (1 - t), H - t * h);
            }
            for (let k = 10; k >= 0; k--) {
              const t = k / 10;
              sil.lineTo(x + Math.sin(t * 5 + i) * 16 * t + 7 * (1 - t) + 3, H - t * h);
            }
            sil.closePath();
            sil.fill();
            // bladder floats on the kelp
            sil.beginPath();
            sil.ellipse(x + Math.sin(5 + i) * 16, H - h, 9, 6, 0.4, 0, TAU);
            sil.fill();
          }
        }
        anchors.push({ kind: 'spray', x: cx, y: TOP + H - 90, s: 1 });
      }
      // drifting net with glass floats
      const nx = 620;
      sil.lineWidth = 3;
      sil.beginPath();
      for (let k = 0; k <= 8; k++) {
        const x = nx + k * 40;
        const y = H - 60 + Math.sin(k * 0.8) * 16;
        if (k === 0) sil.moveTo(x, y);
        else sil.lineTo(x, y);
      }
      sil.stroke();
      for (let k = 0; k < 8; k++) {
        sil.beginPath();
        sil.moveTo(nx + k * 40, H - 60 + Math.sin(k * 0.8) * 16);
        sil.lineTo(nx + k * 40 + 20, H);
        sil.moveTo(nx + (k + 1) * 40, H - 60 + Math.sin((k + 1) * 0.8) * 16);
        sil.lineTo(nx + k * 40 + 20, H);
        sil.stroke();
      }
      for (const k of [1, 4, 7]) {
        const x = nx + k * 40;
        const y = H - 72 + Math.sin(k * 0.8) * 16;
        gl.beginPath();
        gl.arc(x, y, 16, 0, TAU);
        gl.fill();
      }
      void hash;
    });
    this.layer.bake.blur = 2.5;
  }

  draw(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo): void {
    const dark = mix(lit(L, hex('#1E2A2A'), 0.25), L.amb, 0.15);
    const v = this.layer.view(cam);
    // gentle sway: skew about the bottom edge
    g.save();
    const sway = Math.sin(b.time * 1.1) * 0.03;
    const baseY = 1080;
    g.translate(0, baseY);
    g.transform(1, 0, sway, 1, 0, 0);
    g.translate(0, -baseY);
    this.layer.draw(g, cam, [css(dark), css(mix(dark, L.rim, 0.45 * L.rimAmt + 0.1)), css(atmos(L, hex('#4FAE8A')), 0.85)]);
    g.restore();
    // spray bursts on the snare from the rocks
    const sn = b.since.snare;
    if (sn < 0.7) {
      const k = clamp01(sn / 0.7);
      pushLayer(g, v);
      const col = css(atmos(L, L.foam), 0.8);
      this.layer.eachAnchor(v, 'spray', 300, (a, x) => {
        for (let i = 0; i < 6; i++) {
          const u = easeOut(clamp01((sn - i * 0.03) / 0.5));
          puff(g, x + (i - 2.5) * 22 * u, a.y - u * (70 + hash(i) * 60) + k * k * 80, 12 + u * 16, (1 - k) * 0.7, col);
        }
      });
      g.restore();
    }
  }
}
