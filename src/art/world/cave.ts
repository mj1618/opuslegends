/**
 * Sea cave (lighting.cave > 0): an opaque cave backdrop (dark rock, a BACKLIT cave mouth, rock
 * pillars silhouetted against it), a stalactite ceiling in front, light shafts through blowholes,
 * dancing water caustics and drips. Cross-fades with the open coast by `L.cave`.
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { makeCanvas, ctx2d } from '../core/canvas';
import { drawGlow } from '../core/draw';
import { TAU, fract, hash, rng } from '../core/math';
import { type ArtCamera, VIEW_H, VIEW_W, pushLayer } from './camera';
import { type Lighting, atmos, lit } from './lighting';
import { noisyLine, polyTo } from './paint';
import { TiledLayer } from './tiledLayer';

export class Cave {
  private back: TiledLayer;
  private ceiling: TiledLayer;
  private caustic: HTMLCanvasElement;

  constructor() {
    // backdrop: 0 rock, 1 lit facets, 2 mouth glow, 3 pillars (in front of the glow), 4 pillar rims
    this.back = new TiledLayer(2800, -1300, 1700, 0.35, 5, (ch, W, H, anchors) => {
      const rock = ch(0);
      const facet = ch(1);
      const glow = ch(2);
      const pil = ch(3);
      const prim = ch(4);
      rock.fillRect(0, 0, W, H);
      const r = rng(8);
      // rock strata facets
      for (let i = 0; i < 40; i++) {
        const x = r() * W;
        const y = r() * H;
        facet.globalAlpha = 0.25 + r() * 0.3;
        facet.beginPath();
        facet.moveTo(x, y);
        facet.lineTo(x + 80 + r() * 160, y + (r() - 0.5) * 40);
        facet.lineTo(x + 60 + r() * 120, y + 16 + r() * 30);
        facet.closePath();
        facet.fill();
      }
      facet.globalAlpha = 1;
      // two cave mouths (the way out), glowing
      for (const [mx, mw, mh] of [
        [900, 700, 520],
        [2250, 380, 300],
      ]) {
        const base = 1300 + 40; // layer y ~ +40 (below the sea line)
        for (const dx of [0, -W, W]) {
          const p = new Path2D();
          const left = noisyLine(mx - mw / 2 + dx, base, mx - mw * 0.3 + dx, base - mh, 40, mx, 10);
          const right = noisyLine(mx + mw * 0.32 + dx, base - mh * 0.95, mx + mw / 2 + dx, base, 40, mx + 1, 10);
          p.moveTo(left[0], left[1]);
          polyTo(p, left, true);
          p.quadraticCurveTo(mx + dx, base - mh * 1.25, right[0], right[1]);
          polyTo(p, right, true);
          p.closePath();
          const gr = glow.createRadialGradient(mx + dx, base - mh * 0.3, 20, mx + dx, base - mh * 0.3, mw * 0.7);
          gr.addColorStop(0, 'rgba(255,255,255,1)');
          gr.addColorStop(1, 'rgba(255,255,255,0.75)');
          glow.fillStyle = gr;
          glow.fill(p);
          facet.lineWidth = 10;
          facet.globalAlpha = 0.9;
          facet.stroke(p);
          facet.globalAlpha = 1;
        }
        anchors.push({ kind: 'mouth', x: mx, y: -1300 + 1340 - mh * 0.5, s: mw });
      }
      // stalagmite pillars silhouetted in front
      for (let i = 0; i < 9; i++) {
        const x = r() * W;
        const w = 30 + r() * 70;
        const h = 200 + r() * 420;
        const base = 1360;
        for (const dx of [0, -W, W]) {
          pil.beginPath();
          pil.moveTo(x - w + dx, base);
          pil.quadraticCurveTo(x - w * 0.3 + dx, base - h * 0.6, x + dx, base - h);
          pil.quadraticCurveTo(x + w * 0.3 + dx, base - h * 0.6, x + w + dx, base);
          pil.closePath();
          pil.fill();
          prim.lineWidth = 3;
          prim.beginPath();
          prim.moveTo(x + dx + 2, base - h + 6);
          prim.quadraticCurveTo(x + w * 0.35 + dx, base - h * 0.55, x + w * 0.9 + dx, base - 20);
          prim.stroke();
        }
      }
    }, 0.4);
    // ceiling: 0 rock, 1 teal rim on the stalactite tips, 2 wet shine
    this.ceiling = new TiledLayer(2400, -1250, 560, 0.8, 3, (ch, W, _H, anchors) => {
      const rock = ch(0);
      const rim = ch(1);
      const wet = ch(2);
      const r = rng(4);
      const edge = noisyLine(0, 330, W, 330, 30, 2, 40);
      rock.beginPath();
      rock.moveTo(0, 0);
      rock.lineTo(0, 330);
      for (let i = 0; i < edge.length; i += 2) rock.lineTo(edge[i], edge[i + 1]);
      rock.lineTo(W, 0);
      rock.fill();
      for (let i = 0; i < 34; i++) {
        const x = r() * W;
        const w = 10 + r() * 34;
        const h = 60 + r() * 170;
        for (const dx of [0, -W, W]) {
          rock.beginPath();
          rock.moveTo(x - w + dx, 320);
          rock.quadraticCurveTo(x - w * 0.2 + dx, 320 + h * 0.6, x + dx, 320 + h);
          rock.quadraticCurveTo(x + w * 0.2 + dx, 320 + h * 0.6, x + w + dx, 320);
          rock.fill();
          rim.lineWidth = 2.5;
          rim.beginPath();
          rim.moveTo(x + w * 0.1 + dx, 330);
          rim.quadraticCurveTo(x + w * 0.3 + dx, 320 + h * 0.6, x + dx + 1, 318 + h);
          rim.stroke();
          wet.beginPath();
          wet.arc(x + dx, 322 + h, 3, 0, TAU);
          wet.fill();
        }
        if (i % 4 === 0) anchors.push({ kind: 'drip', x, y: -1250 + 320 + h, s: h });
      }
      // blowhole openings (light shafts come through)
      for (const hx of [500, 1500]) {
        rock.save();
        rock.globalCompositeOperation = 'destination-out';
        rock.beginPath();
        rock.ellipse(hx, 200, 70, 150, 0, 0, TAU);
        rock.fill();
        rock.restore();
        anchors.push({ kind: 'shaft', x: hx, y: -1250 + 300, s: 1 });
      }
    }, 0.6);
    // caustic pattern tile (additive light net)
    this.caustic = makeCanvas(512, 256);
    const cg = ctx2d(this.caustic);
    cg.strokeStyle = 'rgba(255,255,255,0.9)';
    cg.lineWidth = 2.2;
    const r = rng(5);
    for (let i = 0; i < 70; i++) {
      const x = r() * 512;
      const y = r() * 256;
      const rad = 12 + r() * 26;
      cg.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * TAU + r() * 0.3;
        const px = x + Math.cos(a) * rad * (0.7 + r() * 0.5);
        const py = y + Math.sin(a) * rad * 0.45 * (0.7 + r() * 0.5);
        if (k === 0) cg.moveTo(px, py);
        else cg.lineTo(px, py);
      }
      cg.stroke();
    }
  }

  drawBackdrop(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo): void {
    const a = L.cave;
    if (a < 0.01) return;
    const rockC = hex('#1C2E34');
    const mouthCol = mix(hex('#DFFBF4'), L.rim, 0.3);
    g.save();
    g.globalAlpha = a;
    const v = this.back.draw(g, cam, [
      css(lit(L, rockC, 0.3)),
      css(lit(L, hex('#4E7A80'), 0.8), 0.6),
      css(mouthCol),
      css(lit(L, hex('#0E1A1E'), 0.2)),
      css(mix(lit(L, hex('#6FD6C8'), 1), L.rim, 0.5), 0.9),
    ]);
    // mouth bloom
    pushLayer(g, v);
    this.back.eachAnchor(v, 'mouth', 600, (m, x) => {
      drawGlow(g, x, m.y, '#CFFFF6', m.s * 1.1, 0.35 * a);
    });
    g.restore();
    // caustics over the lower backdrop
    if (L.caustics > 0.01) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.12 * L.caustics * a;
      const off = (v.cx * v.z) % 512;
      for (let k = 0; k < 2; k++) {
        const dx = -off + ((b.time * (k ? 14 : -9)) % 512);
        for (let x = dx - 512; x < VIEW_W + 512; x += 512)
          for (let y = VIEW_H * 0.35; y < VIEW_H; y += 256) g.drawImage(this.caustic, x, y + k * 60 + Math.sin(b.time + k) * 10);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  }

  /** ceiling + shafts: draw after the play layer (in front) */
  drawCeiling(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo): void {
    const a = L.cave;
    if (a < 0.01) return;
    g.save();
    g.globalAlpha = a;
    const v = this.ceiling.draw(g, cam, [
      css(lit(L, hex('#10191C'), 0.25)),
      css(mix(lit(L, hex('#6FD6C8'), 1), L.rim, 0.5), 0.9),
      css(atmos(L, hex('#BFF7EE')), 0.8),
    ]);
    pushLayer(g, v);
    // light shafts (pulse gently on the kick)
    const kick = hit(b, 'kick', 0.2);
    g.globalCompositeOperation = 'lighter';
    this.ceiling.eachAnchor(v, 'shaft', 900, (s, x) => {
      const gr = g.createLinearGradient(x, s.y, x + 260, s.y + 1300);
      gr.addColorStop(0, `rgba(210,255,245,${0.28 * a + kick * 0.08})`);
      gr.addColorStop(1, 'rgba(210,255,245,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x - 60, s.y);
      g.lineTo(x + 70, s.y);
      g.lineTo(x + 520, s.y + 1400);
      g.lineTo(x + 120, s.y + 1400);
      g.closePath();
      g.fill();
      // dust motes in the shaft
      g.fillStyle = `rgba(230,255,250,${0.5 * a})`;
      for (let i = 0; i < 14; i++) {
        const u = fract(hash(i) + b.time * 0.05 * (1 + hash(i + 3)));
        const px = x + u * 300 + hash(i * 5) * 120;
        const py = s.y + u * 1300;
        g.fillRect(px, py, 2.5, 2.5);
      }
    });
    g.globalCompositeOperation = 'source-over';
    // drips fall from the tips
    g.fillStyle = css(atmos(L, hex('#BFF7EE')), 0.9 * a);
    this.ceiling.eachAnchor(v, 'drip', 100, (d, x) => {
      const u = fract(b.time * 0.7 + hash(d.x));
      g.beginPath();
      g.ellipse(x, d.y + u * u * 900, 2.5, 4 + u * 3, 0, 0, TAU);
      g.fill();
    });
    g.restore();
    g.restore();
  }
}
