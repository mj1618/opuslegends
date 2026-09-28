/**
 * Far stacks (parallax 0.25): a hazy row of sea stacks and arches, gull clouds wheeling on the hats.
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex } from '../core/color';
import { TAU, clamp01, hash } from '../core/math';
import { RGBP } from '../palette';
import { type ArtCamera, HORIZON_Y, pushLayer } from './camera';
import { type Lighting, atmos, lit } from './lighting';
import { archShape, flintBands, stackShape, streaks, turf } from './paint';
import { TiledLayer } from './tiledLayer';

const W = 3000;
const BASE = HORIZON_Y + 34; // sea line of this layer
const TOP = BASE - 360;

export class FarStacks {
  readonly layer: TiledLayer;
  constructor() {
    this.layer = new TiledLayer(W, TOP, 370, 0.25, 6, (ch, Wt, _H, anchors) => {
      const body = ch(0);
      const shR = ch(1);
      const shL = ch(2);
      const grass = ch(3);
      const detail = ch(4);
      const foam = ch(5);
      const y = (v: number) => v - TOP; // layer coords -> tile coords
      const forms: { path: Path2D; top: number[]; x0: number; x1: number; h: number }[] = [];
      const spec: [string, number, number, number][] = [
        ['s', 150, 70, 170],
        ['s', 330, 110, 250],
        ['a', 520, 860, 210],
        ['s', 1010, 60, 120],
        ['s', 1180, 130, 290],
        ['s', 1420, 80, 190],
        ['s', 1640, 50, 90],
        ['a', 1850, 2250, 250],
        ['s', 2440, 120, 230],
        ['s', 2640, 70, 150],
        ['s', 2840, 90, 200],
      ];
      spec.forEach(([k, a, b2, h], i) => {
        for (const dx of [0, -Wt, Wt]) {
          const f =
            k === 's'
              ? { ...stackShape(a + dx, y(BASE) + 8, b2, h, i + 1), x0: a + dx - b2 * 0.6, x1: a + dx + b2 * 0.6, h }
              : { ...archShape(a + dx, b2 + dx, y(BASE) + 8, h, i + 1), x0: a + dx - 20, x1: b2 + dx + 20, h };
          forms.push(f);
          if (dx === 0) anchors.push({ kind: 'top', x: (f.x0 + f.x1) / 2, y: TOP + f.top[1], s: f.x1 - f.x0 });
        }
      });
      for (const f of forms) {
        body.fill(f.path, 'evenodd');
        const mid = (f.x0 + f.x1) / 2;
        for (const [g2, from, to] of [
          [shR, mid - (f.x1 - f.x0) * 0.05, f.x1 + 20],
          [shL, f.x0 - 20, mid + (f.x1 - f.x0) * 0.05],
        ] as [Ctx, number, number][]) {
          g2.save();
          g2.clip(f.path, 'evenodd');
          const gr = g2.createLinearGradient(from, 0, to, 0);
          const right = g2 === shR;
          gr.addColorStop(0, `rgba(255,255,255,${right ? 0 : 1})`);
          gr.addColorStop(1, `rgba(255,255,255,${right ? 1 : 0})`);
          g2.fillStyle = gr;
          g2.fillRect(f.x0 - 30, 0, f.x1 - f.x0 + 60, 400);
          g2.restore();
        }
        detail.save();
        detail.clip(f.path, 'evenodd');
        flintBands(detail, f.x0, f.x1, y(BASE) - f.h, y(BASE), 26, f.x0, 2.2);
        streaks(detail, f.x0, f.x1, y(BASE) - f.h + 20, y(BASE), f.x0, 0.25);
        const wet = detail.createLinearGradient(0, y(BASE) - 40, 0, y(BASE) + 8);
        wet.addColorStop(0, 'rgba(255,255,255,0)');
        wet.addColorStop(1, 'rgba(255,255,255,0.9)');
        detail.fillStyle = wet;
        detail.fillRect(f.x0 - 30, y(BASE) - 40, f.x1 - f.x0 + 60, 50);
        detail.restore();
        turf(grass, f.top, 7, f.x0);
        // foam at the waterline
        foam.globalAlpha = 0.9;
        foam.beginPath();
        foam.ellipse(mid, y(BASE) + 6, (f.x1 - f.x0) * 0.6, 5, 0, 0, TAU);
        foam.fill();
        foam.globalAlpha = 1;
      }
      // long foam line on the sea
      foam.globalAlpha = 0.35;
      for (let x = 0; x < Wt; x += 60) foam.fillRect(x, y(BASE) + 12 + Math.sin(x) * 3, 40, 2);
      foam.globalAlpha = 1;
    }, 0.5);
  }

  draw(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo): void {
    const d = 0.62;
    const chalk = RGBP.chalkShade;
    const aR = clamp01(0.5 - L.lightDir * 0.5);
    const shadow = lit(L, chalk, 0.0, d);
    const v = this.layer.draw(g, cam, [
      css(lit(L, chalk, 0.9, d)),
      css(shadow, 0.25 + 0.6 * aR),
      css(shadow, 0.25 + 0.6 * (1 - aR)),
      css(lit(L, RGBP.turf, 0.8, d)),
      css(lit(L, RGBP.flint, 0.5, d), 0.55),
      css(atmos(L, L.foam, d), 0.85),
    ]);
    // gull flocks wheeling: wings flap on 16ths
    pushLayer(g, v);
    const col = css(lit(L, hex('#39404C'), 0.5, 0.55));
    g.strokeStyle = col;
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    const flap16 = Math.floor(b.beat * 4) % 2;
    const hat = hit(b, 'hat', 0.08);
    for (let f = 0; f < 3; f++) {
      const fx = hash(f * 7) * W;
      const cx0 = fx + Math.ceil((v.x0 - 300 - fx) / W) * W;
      if (cx0 > v.x1 + 300) continue;
      const cy = TOP + 40 + hash(f * 3) * 120;
      g.beginPath();
      for (let i = 0; i < 14; i++) {
        const ph = b.time * (0.6 + (i % 3) * 0.05) + i * 0.45 + f;
        const x = cx0 + Math.cos(ph) * (60 + i * 5) + Math.sin(ph * 2.1) * 14;
        const yy = cy + Math.sin(ph * 1.3) * (22 + i * 1.5);
        const up = ((i + flap16) % 2 === 0 ? 1 : -0.4) * (4 + hat * 2);
        g.moveTo(x - 6, yy - up);
        g.quadraticCurveTo(x - 2, yy - 1, x, yy);
        g.quadraticCurveTo(x + 2, yy - 1, x + 6, yy - up);
      }
      g.stroke();
    }
    g.restore();
  }
}
