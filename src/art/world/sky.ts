/**
 * Sky (parallax 0): gradient to the horizon, horizon glow, sun / moon, stars, cloud banks (relit).
 */
import { type BeatInfo } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, mix } from '../core/color';
import { drawGlow } from '../core/draw';
import { TAU, hash, rng } from '../core/math';
import { makeCanvas, ctx2d, drawSprite, sprite } from '../core/canvas';
import { type ArtCamera, HORIZON_Y, VIEW_W, layerView, screenY } from './camera';
import { type Lighting, atmos } from './lighting';
import { TiledLayer } from './tiledLayer';

export class Sky {
  private gradKey = -1;
  private skyGrad: CanvasGradient | null = null;
  private stars: HTMLCanvasElement;
  private clouds: TiledLayer;

  constructor() {
    this.stars = makeCanvas(VIEW_W, 620);
    const sg = ctx2d(this.stars);
    const r = rng(11);
    for (let i = 0; i < 260; i++) {
      const x = r() * VIEW_W;
      const y = r() * 600;
      const s = r() < 0.08 ? 2.2 : r() < 0.3 ? 1.5 : 1;
      sg.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
      sg.beginPath();
      sg.arc(x, y, s, 0, TAU);
      sg.fill();
    }
    // soft cloud banks: 0 body, 1 lit upper rims
    this.clouds = new TiledLayer(
      3200,
      HORIZON_Y - 470,
      460,
      0.04,
      2,
      (ch, W) => {
        const r2 = rng(21);
        const body = ch(0);
        const rim = ch(1);
        const blob = (g: Ctx, x: number, y: number, rad: number, a: number) => {
          const gr = g.createRadialGradient(x, y, rad * 0.2, x, y, rad);
          gr.addColorStop(0, `rgba(255,255,255,${a})`);
          gr.addColorStop(0.6, `rgba(255,255,255,${a * 0.85})`);
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr;
          g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        };
        for (let c = 0; c < 9; c++) {
          const cx = (c / 9) * W + r2() * 200;
          const cy = 150 + r2() * 170;
          const len = 260 + r2() * 420;
          for (let k = 0; k < 14; k++) {
            const x = cx + (k / 14) * len;
            const y = cy - Math.sin((k / 14) * Math.PI) * (40 + r2() * 30) + r2() * 16;
            const rad = 45 + r2() * 50;
            for (const dx of [0, -W, W]) {
              blob(body, x + dx, y, rad, 0.9);
              blob(rim, x + dx - 6, y - rad * 0.35, rad * 0.75, 0.9);
            }
          }
          // soft flattened base
          body.globalCompositeOperation = 'destination-out';
          const fb = body.createLinearGradient(0, cy + 10, 0, cy + 90);
          fb.addColorStop(0, 'rgba(0,0,0,0)');
          fb.addColorStop(1, 'rgba(0,0,0,0.7)');
          body.fillStyle = fb;
          body.fillRect(cx - 200, cy + 10, len + 400, 200);
          body.globalCompositeOperation = 'source-over';
        }
        // rims only where there is body
        rim.globalCompositeOperation = 'destination-in';
        rim.drawImage(body.canvas, 0, 0, W, 460);
        rim.globalCompositeOperation = 'source-over';
      },
      0.5,
    );
  }

  /** horizon line on screen for this camera */
  horizonY(cam: ArtCamera): number {
    return screenY(layerView(cam, 0.08), HORIZON_Y);
  }

  draw(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo, version: number): void {
    const hy = this.horizonY(cam);
    if (this.gradKey !== version || !this.skyGrad) {
      const gr = g.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, css(atmos(L, L.skyTop)));
      gr.addColorStop(0.55, css(atmos(L, L.skyMid)));
      gr.addColorStop(1, css(atmos(L, L.skyLow)));
      this.skyGrad = gr;
      this.gradKey = version;
    }
    g.save();
    g.scale(1, Math.max(1, hy + 40));
    g.fillStyle = this.skyGrad;
    g.fillRect(0, 0, VIEW_W, 1);
    g.restore();
    // stars
    if (L.starAmt > 0.01) {
      g.save();
      g.globalAlpha = L.starAmt * (0.85 + 0.15 * Math.sin(b.time * 2.3));
      g.drawImage(this.stars, 0, hy - 640);
      g.restore();
    }
    const sx = L.sunX * VIEW_W;
    const sy = hy - (0.5 - L.sunY) * 900;
    // horizon glow (behind the sun)
    if (L.glowAmt > 0.01) {
      drawGlow(g, sx, hy, css(atmos(L, L.glow)), 900, L.glowAmt * 0.55);
      drawGlow(g, sx, hy, css(atmos(L, L.glow)), 420, L.glowAmt * 0.5);
    }
    // moon
    if (L.moonAmt > 0.01) {
      const mx = VIEW_W * 0.78;
      const my = hy - 330;
      drawGlow(g, mx, my, '#C8D4FF', 160, 0.35 * L.moonAmt);
      g.globalAlpha = L.moonAmt;
      drawSprite(g, moonSprite(), mx, my);
      g.globalAlpha = 1;
    }
    // sun
    if (L.sunAmt > 0.01 && sy < hy + L.sunR) {
      const sc = css(atmos(L, L.sun));
      drawGlow(g, sx, sy, sc, L.sunR * 7, 0.45 * L.sunAmt);
      drawGlow(g, sx, sy, '#FFFFFF', L.sunR * 2.4, 0.5 * L.sunAmt);
      g.save();
      g.beginPath();
      g.rect(0, 0, VIEW_W, hy + 1);
      g.clip();
      g.globalAlpha = L.sunAmt;
      g.fillStyle = css(mix(L.sun, [255, 255, 255], 0.5));
      g.beginPath();
      g.arc(sx, sy, L.sunR, 0, TAU);
      g.fill();
      g.restore();
    }
    // clouds (relit, drifting)
    if (L.cloudAmt > 0.01) {
      const drift = b.time * 6;
      const camD = { x: cam.x + drift / 0.04, y: cam.y, zoom: cam.zoom };
      g.save();
      g.globalAlpha = L.cloudAmt;
      this.clouds.draw(g, camD, [css(atmos(L, L.cloud)), css(atmos(L, L.cloudLit))]);
      g.restore();
    }
  }
}

function moonSprite() {
  return sprite('sky:moon', 90, 90, 45, 45, (g) => {
    g.fillStyle = '#EEF0FF';
    g.beginPath();
    g.arc(0, 0, 34, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(160,170,210,0.45)';
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.arc((hash(i) - 0.5) * 44, (hash(i + 9) - 0.5) * 44, 3 + hash(i + 3) * 7, 0, TAU);
      g.fill();
    }
    // terminator shade
    g.fillStyle = 'rgba(40,50,100,0.35)';
    g.beginPath();
    g.arc(10, -4, 32, 0, TAU);
    g.arc(0, 0, 34, 0, TAU, true);
    g.fill();
  });
}
