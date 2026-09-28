/**
 * Horizon (parallax 0.08): distant sea band + sun glitter, BIG JIM'S ROCK (two claw crags that
 * twitch on the chorus "HEY!"s), the fishing fleet (bobs on the bass), whale spouts (on crashes).
 */
import { type BeatInfo, hit } from '../core/beat';
import { TintBake } from '../core/bake';
import type { Ctx } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { drawGlow, puff } from '../core/draw';
import { TAU, clamp01, easeOut, hash, rng } from '../core/math';
import { PAL, RGBP } from '../palette';
import { type ArtCamera, HORIZON_Y, VIEW_H, VIEW_W, layerView, pushLayer, screenY } from './camera';
import { type Lighting, atmos, lit } from './lighting';

export interface HorizonOptions {
  /** Big Jim's Rock: screen-x fraction and size (it grows act by act). null hides it */
  jimRock?: { x: number; scale: number } | null;
}

const FLEET_W = 4200;

export class Horizon {
  private rock: TintBake;
  private seaKey = -1;
  private seaGrad: CanvasGradient | null = null;

  constructor() {
    // Big Jim's Rock: 0 body, 1 shade side, 2 crust/detail, 3 kelp/green tops
    this.rock = new TintBake(420, 560, 4, 0.75);
    const b = this.rock.ch(0);
    const sh = this.rock.ch(1);
    const dt = this.rock.ch(2);
    const kp = this.rock.ch(3);
    const r = rng(3);
    const rockPath = (g: Ctx) => {
      g.beginPath();
      g.moveTo(40, 560);
      g.bezierCurveTo(70, 420, 90, 300, 120, 190);
      g.bezierCurveTo(140, 130, 170, 110, 210, 108);
      g.bezierCurveTo(260, 106, 290, 140, 305, 200);
      g.bezierCurveTo(330, 300, 350, 430, 390, 560);
      g.closePath();
    };
    rockPath(b);
    b.fill();
    // shade on the right flank (baked; the lighting chooses its colour)
    sh.save();
    rockPath(sh);
    sh.clip();
    const gr = sh.createLinearGradient(180, 0, 380, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gr.addColorStop(1, 'rgba(255,255,255,1)');
    sh.fillStyle = gr;
    sh.fillRect(0, 0, 420, 560);
    const gb = sh.createLinearGradient(0, 380, 0, 560);
    gb.addColorStop(0, 'rgba(255,255,255,0)');
    gb.addColorStop(1, 'rgba(255,255,255,0.9)');
    sh.fillStyle = gb;
    sh.fillRect(0, 380, 420, 180);
    sh.restore();
    // strata + barnacle crust specks
    dt.save();
    rockPath(dt);
    dt.clip();
    dt.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const y = 160 + i * 34 + r() * 10;
      dt.globalAlpha = 0.5;
      dt.beginPath();
      dt.moveTo(0, y);
      dt.bezierCurveTo(140, y + r() * 16 - 8, 280, y + r() * 16 - 8, 420, y + 6);
      dt.stroke();
    }
    dt.globalAlpha = 0.8;
    for (let i = 0; i < 80; i++) {
      dt.beginPath();
      dt.arc(80 + r() * 270, 140 + r() * 400, 1.5 + r() * 2.5, 0, TAU);
      dt.fill();
    }
    dt.restore();
    // kelp tufts + the nest on top
    kp.beginPath();
    kp.ellipse(208, 110, 80, 14, 0, 0, TAU);
    kp.fill();
    for (let i = 0; i < 7; i++) {
      const x = 140 + i * 24;
      kp.beginPath();
      kp.moveTo(x - 6, 112);
      kp.quadraticCurveTo(x + 3, 160 + r() * 60, x - 2, 190 + r() * 90);
      kp.lineTo(x + 5, 112);
      kp.fill();
    }
  }

  draw(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo, version: number, opts: HorizonOptions = {}): void {
    const v = layerView(cam, 0.08);
    const hy = screenY(v, HORIZON_Y);
    // distant sea band: horizon haze -> sea top -> deep, down to the bottom of the screen
    if (this.seaKey !== version || !this.seaGrad) {
      const gr = g.createLinearGradient(0, 0, 0, 1);
      const far = mix(atmos(L, L.skyLow), L.seaTop, 0.35);
      gr.addColorStop(0, css(mix(far, L.haze, 0.5)));
      gr.addColorStop(0.06, css(atmos(L, far)));
      gr.addColorStop(0.45, css(atmos(L, L.seaTop)));
      gr.addColorStop(1, css(atmos(L, L.seaDeep)));
      this.seaGrad = gr;
      this.seaKey = version;
    }
    g.save();
    g.translate(0, hy);
    g.scale(1, VIEW_H - hy + 2);
    g.fillStyle = this.seaGrad;
    g.fillRect(0, 0, VIEW_W, 1);
    g.restore();
    // sun / glow glitter path
    const gl = L.glitter * (L.sunAmt > 0.1 ? 1 : L.moonAmt * 0.6);
    if (gl > 0.02) {
      const sx = (L.sunAmt > 0.1 ? L.sunX : 0.78) * VIEW_W;
      g.fillStyle = css(mix(atmos(L, L.sun), [255, 255, 255], 0.6), 0.85 * gl);
      for (let i = 0; i < 70; i++) {
        const k = i / 70;
        const y = hy + 4 + k * k * 260;
        const w = (6 + k * 60) * (0.4 + hash(i * 7 + Math.floor(b.time * 6 + i)) * 0.9);
        const x = sx + (hash(i * 13 + Math.floor(b.time * 4)) - 0.5) * (30 + k * 220);
        g.globalAlpha = (1 - k) * gl;
        g.fillRect(x - w / 2, y, w, 1.5 + k * 2);
      }
      g.globalAlpha = 1;
    }
    // horizon line highlight
    g.fillStyle = css(mix(atmos(L, L.skyLow), [255, 255, 255], 0.35), 0.6);
    g.fillRect(0, hy - 1, VIEW_W, 2);

    // Big Jim's Rock
    const jr = opts.jimRock === undefined ? { x: 0.8, scale: 1 } : opts.jimRock;
    if (jr) this.drawRock(g, jr.x * VIEW_W, hy + 6, jr.scale, L, b);

    // fleet + spouts (scroll with the layer)
    pushLayer(g, v);
    const bassHeave = hit(b, 'bass', 0.14);
    for (let i = 0; i < 6; i++) {
      const bx0 = hash(i * 31) * FLEET_W;
      const x = bx0 + Math.ceil((v.x0 - 100 - bx0) / FLEET_W) * FLEET_W;
      if (x > v.x1 + 100) continue;
      const sc = 0.5 + hash(i * 5) * 0.5;
      const bob = Math.sin(b.time * 1.6 + i) * 2 - bassHeave * 3;
      drawBoat(g, x, HORIZON_Y + 4 + sc * 6 + bob, sc, L, Math.sin(b.time * 1.1 + i) * 0.05);
    }
    // whale spouts on crash
    const cs = b.since.crash;
    if (cs < 1.6) {
      const n = b.count.crash;
      const x0 = hash(n * 17) * FLEET_W;
      const x = x0 + Math.ceil((v.x0 - x0) / FLEET_W) * FLEET_W + ((hash(n) * 0.6 + 0.2) * (v.x1 - v.x0) - (x0 % 1));
      const wx = v.x0 + (hash(n * 3) * 0.6 + 0.2) * (v.x1 - v.x0);
      void x;
      const k = clamp01(cs / 1.6);
      const wy = HORIZON_Y + 10;
      // whale back arcs out of the water
      const back = Math.sin(clamp01(cs / 1.2) * Math.PI);
      g.fillStyle = css(lit(L, hex('#2E3A4A'), 0.6, 0.8));
      g.beginPath();
      g.ellipse(wx + 20, wy + 4, 40, 12 * back, 0, Math.PI, TAU);
      g.fill();
      const spoutCol = css(atmos(L, hex('#F4FAFF'), 0.6));
      for (let j = 0; j < 7; j++) {
        const u = easeOut(clamp01((cs - j * 0.03) / 0.7));
        puff(g, wx + (j - 3) * 6 * u, wy - 10 - u * 70 + j * 3, 5 + u * 10, (1 - k) * 0.85, spoutCol);
      }
    }
    g.restore();
  }

  private drawRock(g: Ctx, x: number, baseY: number, scale: number, L: Lighting, b: BeatInfo) {
    const depth = 0.72;
    const chalk = hex('#B8A58A');
    this.rock.compose([
      css(lit(L, chalk, 0.85, depth)),
      css(lit(L, chalk, 0.05, depth), 0.9),
      css(lit(L, hex('#5A4636'), 0.4, depth), 0.8),
      css(lit(L, RGBP.kelp, 0.6, depth)),
    ]);
    const w = 420 * 0.62 * scale;
    const h = 560 * 0.62 * scale;
    g.drawImage(this.rock.out, x - w / 2, baseY - h, w, h);
    // the two claw-shaped crags twitch on the "HEY!"s (foreshadowing)
    const tw = hit(b, 'hey', 0.12);
    const col = css(lit(L, chalk, 0.7, depth));
    const sh = css(lit(L, chalk, 0.1, depth));
    for (let side = -1; side <= 1; side += 2) {
      const cx = x + side * 36 * scale * 0.62 * 1.6;
      const cy = baseY - h + 10 * scale;
      g.save();
      g.translate(cx, cy);
      g.rotate(side * (0.25 + tw * 0.28));
      g.scale(scale * 0.62, scale * 0.62);
      g.beginPath();
      g.moveTo(-18, 20);
      g.bezierCurveTo(-30, -20, -18, -70, 4, -96);
      g.bezierCurveTo(8, -70, 10, -50, 4, -34);
      g.bezierCurveTo(16, -52, 26, -60, 30, -64);
      g.bezierCurveTo(34, -30, 24, 0, 18, 20);
      g.closePath();
      g.fillStyle = side < 0 ? col : sh;
      g.fill();
      g.restore();
    }
    // a faint magenta glint at the peak on the HEYs (danger foreshadow)
    if (tw > 0.05) drawGlow(g, x, baseY - h + 20, PAL.magenta, 50 * scale, tw * 0.35);
  }
}

function drawBoat(g: Ctx, x: number, y: number, sc: number, L: Lighting, roll: number) {
  const depth = 0.75;
  g.save();
  g.translate(x, y);
  g.rotate(roll);
  g.scale(sc, sc);
  const hull: RGB = hex('#4E3A2C');
  g.fillStyle = css(lit(L, hull, 0.6, depth));
  g.beginPath();
  g.moveTo(-34, -8);
  g.lineTo(34, -10);
  g.lineTo(26, 4);
  g.lineTo(-26, 4);
  g.closePath();
  g.fill();
  g.fillStyle = css(lit(L, hex('#E8E0CC'), 0.8, depth));
  g.beginPath();
  g.moveTo(-2, -12);
  g.lineTo(-2, -58);
  g.quadraticCurveTo(18, -40, 22, -12);
  g.closePath();
  g.fill();
  g.fillStyle = css(lit(L, RGBP.oxblood, 0.7, depth));
  g.beginPath();
  g.moveTo(-4, -12);
  g.lineTo(-4, -46);
  g.quadraticCurveTo(-20, -30, -22, -12);
  g.closePath();
  g.fill();
  g.strokeStyle = css(lit(L, hull, 0.4, depth));
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-2, -12);
  g.lineTo(-2, -64);
  g.stroke();
  // pennant (Big Jim's: oxblood + black)
  g.fillStyle = css(lit(L, RGBP.oxblood, 0.7, depth));
  g.beginPath();
  g.moveTo(-2, -64);
  g.lineTo(10, -61);
  g.lineTo(-2, -58);
  g.fill();
  g.restore();
}
