/**
 * ACT 2a — THE JIMPERIAL, OUTSIDE: the night climb up Big Jim's building on the boogie bass.
 * VERTICALITY is the point: the city falls away below you as you climb.
 *
 *   const facade = makeFacade(lightingDirector);   // light keys 'facade' -> 'facadeHigh' (grindhouse set)
 *   facade.drawBack(ctx, cam, beat); ...play layer (drawFacadeLedge)...; facade.drawFront(ctx, cam, beat);
 *
 * Layers (back -> front):
 *   sky (moon, stars) · distant skyline (0.05) · midtown towers (0.18, sinks slowly) · THE ROOFTOPS BELOW (0.45:
 *   water towers, neon, lit windows — they drop away fast as you climb) + the street far below (headlight
 *   streaks, 0.45) · THE JIMPERIAL (0.92, procedural, infinite up): brick wings with light-well gaps (the city
 *   shows through), stone cornices per storey, windows with SILHOUETTES (goons dancing on the backbeat, TV
 *   flicker, blinds, a sax player), fire escapes zig-zagging up, drainpipes, AC units, and the vertical neon
 *   "BIG JIM'S" blade signs (buzz on hats, blaze on the kick) · front (1.25): laundry lines across the top of the
 *   frame flapping on the hats, pigeons.
 *
 * Also exported for the renderer's entity pass (act-2 entities):
 *   drawThrowWindow(g, x, y, k, L, b)  the window a bottle is thrown from: lit, a goon leaning out, arm cocked (the tell)
 *   drawBigJimGlint(g, x, y, k, L, b)  Big Jim's first glint in a high window: the pear-shaped velvet mass, chrome
 *                                       aviators flashing a star on the stab
 *   drawFacadeLedge(g, rect, style)    play-layer floors on the facade: iron fire-escape landing + stone cornice,
 *                                       the building wall below
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { makeCanvas, ctx2d } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { drawGlow, star4 } from '../core/draw';
import { TAU, hash, rng } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, HORIZON_Y, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, atmos, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, skyLayer, stripLayer } from '../world/parallax';
import { type JammerColours, drawJammer } from './jammers';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';

/** the Jimperial's storey grid (layer px at 0.92) */
const WX = 250;
const WY = 290;
/** wings: a period of P with a light-well gap of GAP at its end */
const P = 3300;
const GAP = 820;
const F_WALL = 0.92;

export function makeFacade(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  scene.add(skyLayer('facade-sky'));
  // distant skyline on the horizon
  scene.add(
    stripLayer({
      id: 'facade-distant',
      factor: 0.05,
      W: 3600,
      top: HORIZON_Y - 260,
      H: 300,
      res: 0.4,
      material: { base: '#4A3E5E', shade: '#3A2E4E', glow: CF.bulb, depth: 0.88 },
      paint: (p) => {
        const r = rng(71);
        let x = 0;
        while (x < p.W) {
          const w = 40 + r() * 90;
          const h = 60 + r() * 220;
          p.body.fillRect(x, p.H - h, w, h);
          if (r() < 0.25) p.body.fillRect(x + w * 0.45, p.H - h - 40, 3, 40);
          for (let k = 0; k < 8; k++) if (r() < 0.5) p.glow.fillRect(x + 5 + r() * (w - 10), p.H - h + 8 + r() * (h - 16), 3, 4);
          x += w + r() * 12;
        }
      },
    }),
  );
  // midtown towers: tall, lots of lit windows, sink slowly as you climb
  scene.add(
    stripLayer({
      id: 'facade-midtown',
      factor: 0.18,
      W: 3200,
      top: HORIZON_Y - 520,
      H: 820,
      res: 0.35,
      material: { base: '#3E3252', shade: '#2A2040', detail: '#140E1E', accent: '#5E2B4E', glow: CF.bulb, depth: 0.7 },
      paint: (p) => {
        const r = rng(72);
        let x = 0;
        while (x < p.W) {
          const w = 120 + r() * 180;
          const h = 300 + r() * 480;
          const y0 = p.H - h;
          for (const dx of x + w > p.W ? [0, -p.W] : [0]) {
            p.body.fillRect(x + dx, y0, w, h);
            p.shadeR.fillRect(x + dx + w * 0.7, y0, w * 0.3, h);
            // setback crown / spire
            if (r() < 0.4) {
              p.body.fillRect(x + dx + w * 0.2, y0 - 60, w * 0.6, 60);
              p.body.fillRect(x + dx + w * 0.48, y0 - 130, 5, 70);
            }
            for (let wy = y0 + 16; wy < p.H - 10; wy += 22)
              for (let wx = x + 10; wx < x + w - 12; wx += 16) if (r() < 0.32) p.glow.fillRect(wx + dx, wy, 7, 9);
            p.rim.fillRect(x + dx, y0, w, 2);
          }
          x += w + 10 + r() * 60;
        }
      },
    }),
  );
  // the rooftops BELOW: neighbouring buildings' roofs, water towers, neon — they drop away as you climb
  const roofs = stripLayer({
    id: 'facade-roofs',
    factor: 0.45,
    W: 2800,
    top: -520,
    H: 760,
    res: 0.4,
    material: { base: '#5A3A40', shade: '#3A2430', detail: '#1A1016', accent: '#6E6A7A', glow: CF.bulb, depth: 0.45 },
    paint: (p) => {
      const r = rng(73);
      let x = 0;
      while (x < p.W) {
        const w = 220 + r() * 300;
        const h = 260 + r() * 300;
        const y0 = p.H - h;
        for (const dx of x + w > p.W ? [0, -p.W] : [0]) {
          p.body.fillRect(x + dx, y0, w, h);
          p.shadeL.fillRect(x + dx, y0, w * 0.18, h);
          p.detail.fillRect(x + dx - 6, y0 - 10, w + 12, 10);
          p.rim.fillRect(x + dx - 6, y0 - 10, w + 12, 3);
          for (let wy = y0 + 26; wy < p.H - 20; wy += 40)
            for (let wx = x + 18; wx < x + w - 24; wx += 34) {
              p.detail.fillRect(wx + dx, wy, 16, 22);
              if (r() < 0.35) p.glow.fillRect(wx + dx + 2, wy + 2, 12, 18);
            }
          if (r() < 0.6) {
            // water tower
            const tx = x + dx + 30 + r() * (w - 110);
            for (const lx of [4, 24, 44]) p.detail.fillRect(tx + lx, y0 - 60, 4, 50);
            p.accent.beginPath();
            p.accent.moveTo(tx, y0 - 60);
            p.accent.lineTo(tx, y0 - 120);
            p.accent.lineTo(tx + 26, y0 - 138);
            p.accent.lineTo(tx + 52, y0 - 120);
            p.accent.lineTo(tx + 52, y0 - 60);
            p.accent.closePath();
            p.accent.fill();
            for (let k = 0; k < 3; k++) p.detail.fillRect(tx, y0 - 106 + k * 16, 52, 2);
          }
          if (r() < 0.35) p.anchors.push({ kind: 'roofsign', x: x + dx + w * 0.5, y: p.top + y0 - 60, s: Math.floor(r() * 4) });
        }
        x += w + 20 + r() * 80;
      }
    },
    props: (g, v, f, layer) => {
      const on = 0.6 + 0.4 * hit(f.b, 'kick', 0.12);
      layer.eachAnchor(v, 'roofsign', 300, (a, x) => {
        const words = ['HOTEL', 'EATS', 'BAR', 'DANCING'];
        const col = a.s % 2 ? CF.neonJade : CF.neonRose;
        g.font = `italic 46px ${SIGN_FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = css(atmos(f.L, H(col), 0.2), 0.35 + 0.6 * on * f.L.lamps);
        g.fillText(words[a.s % 4], x, a.y);
        drawGlow(g, x, a.y, col, 150, 0.3 * on * f.L.lamps);
      });
    },
  });
  scene.add(roofs);
  // the street far below: headlight / taillight streaks + lamp glows (same depth as the roofs)
  scene.add({ id: 'facade-street', pass: 'back', draw: (g, cam, f) => streetBelow(g, cam, f) });
  // THE JIMPERIAL
  const wall = new JimperialWall();
  scene.add({ id: 'facade-wall', pass: 'back', draw: (g, cam, f) => wall.draw(g, cam, f) });
  // front: laundry lines across the top of the frame, flapping on the hats
  scene.add({ id: 'facade-front', pass: 'front', draw: (g, cam, f) => laundry(g, cam, f) });
  return scene;
}

// ------------------------------------------------------------------ the street far below

function streetBelow(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const v = layerView(cam, 0.45);
  const y = 250;
  if (y < v.y0 - 50 || y > v.y1 + 50) return;
  pushLayer(g, v);
  g.fillStyle = css(lit(f.L, H('#141018'), 0.5, 0.5));
  g.fillRect(v.x0, y - 30, v.x1 - v.x0, 400);
  const t = f.b.time;
  for (let i = 0; i < 18; i++) {
    const dir = i % 2 ? 1 : -1;
    const sp = 260 + hash(i) * 260;
    const x = (((hash(i + 3) * 4000 + dir * t * sp) % 4000) + 4000) % 4000;
    const bx = Math.floor(v.x0 / 4000) * 4000 + x;
    for (const ox of [bx, bx + 4000]) {
      if (ox < v.x0 - 100 || ox > v.x1 + 100) continue;
      const col = dir > 0 ? CF.bulb : '#E0569B';
      g.fillStyle = css(atmos(f.L, H(col), 0.3), 0.7);
      g.fillRect(ox, y - 8 + (i % 3) * 7, 40 * dir, 3);
    }
  }
  for (let x = Math.floor(v.x0 / 300) * 300; x < v.x1; x += 300) drawGlow(g, x, y - 20, CF.lampPool, 70, 0.25 * f.L.lamps);
  g.restore();
}

// ------------------------------------------------------------------ the wall

let brickTile: HTMLCanvasElement | null = null;

/** mortar + brick variation, black alpha only (darkens whatever lit base is under it) */
function bricks(): HTMLCanvasElement {
  if (brickTile) return brickTile;
  const c = makeCanvas(240, 96);
  const g = ctx2d(c);
  const r = rng(9);
  g.fillStyle = 'rgba(0,0,0,0.5)';
  for (let row = 0; row < 6; row++) {
    const y = row * 16;
    g.fillRect(0, y, 240, 3);
    const off = row % 2 ? 20 : 0;
    for (let x = off; x < 240 + 40; x += 40) g.fillRect(x % 240, y, 3, 16);
    for (let x = off; x < 240; x += 40) {
      g.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.16})`;
      g.fillRect(x + 3, y + 3, 37, 13);
      g.fillStyle = 'rgba(0,0,0,0.5)';
    }
  }
  brickTile = c;
  return c;
}

const patterns = new WeakMap<Ctx, CanvasPattern>();

class JimperialWall {
  private cols: { key: number; brick: string; brickDark: string; stone: string; iron: string; ironRim: string; glass: string; sil: string; frame: string } | null = null;

  private colours(f: SceneFrame) {
    if (this.cols && this.cols.key === f.version) return this.cols;
    const L = f.L;
    const d = 0.1;
    this.cols = {
      key: f.version,
      brick: css(lit(L, H('#6B3A2E'), 0.7, d)),
      brickDark: css(lit(L, H('#3A2018'), 0.5, d)),
      stone: css(lit(L, H('#B8A890'), 0.75, d)),
      iron: css(lit(L, H('#2A2630'), 0.5, d)),
      ironRim: css(mix(lit(L, H('#2A2630'), 0.9, d), L.rim, 0.6), 0.9),
      glass: css(lit(L, H('#1A1E2E'), 0.6, d)),
      sil: css(lit(L, H('#140C10'), 0.3, d)),
      frame: css(lit(L, H('#4E3A2C'), 0.7, d)),
    };
    return this.cols;
  }

  draw(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
    const v = layerView(cam, F_WALL);
    const C = this.colours(f);
    const L = f.L;
    const b = f.b;
    pushLayer(g, v);
    let pat = patterns.get(g);
    if (!pat) {
      pat = g.createPattern(bricks(), 'repeat') as CanvasPattern;
      patterns.set(g, pat);
    }
    const yTop = v.y0 - 20;
    const yBot = Math.min(v.y1 + 20, 60);
    if (yBot > yTop) {
      for (let k = Math.floor(v.x0 / P); k * P < v.x1; k++) {
        const x0 = Math.max(v.x0 - 10, k * P);
        const x1 = Math.min(v.x1 + 10, k * P + P - GAP);
        if (x1 <= x0) continue;
        g.fillStyle = C.brick;
        g.fillRect(x0, yTop, x1 - x0, yBot - yTop);
        g.fillStyle = pat;
        g.fillRect(x0, yTop, x1 - x0, yBot - yTop);
        // corner quoins + a shadow down the light-well side
        const cx = k * P + P - GAP;
        if (cx > v.x0 - 100 && cx < v.x1 + 100) {
          const gr = g.createLinearGradient(cx - 90, 0, cx, 0);
          gr.addColorStop(0, 'rgba(10,6,12,0)');
          gr.addColorStop(1, 'rgba(10,6,12,0.55)');
          g.fillStyle = gr;
          g.fillRect(cx - 90, yTop, 90, yBot - yTop);
          g.fillStyle = C.stone;
          for (let y = Math.floor(yTop / 60) * 60; y < yBot; y += 60) {
            const odd = Math.abs(Math.round(y / 60)) % 2 === 1;
            g.fillRect(odd ? cx - 28 : cx - 40, y, odd ? 28 : 40, 26);
          }
        }
        const lx = k * P;
        if (lx > v.x0 - 100 && lx < v.x1 + 100) {
          g.fillStyle = C.stone;
          for (let y = Math.floor(yTop / 60) * 60; y < yBot; y += 60) g.fillRect(lx, y, Math.abs(Math.round(y / 60)) % 2 ? 28 : 40, 26);
        }
      }
    }
    // storeys: cornice bands, windows, silhouettes
    const r0 = Math.floor(v.y0 / WY) - 1;
    const r1 = Math.min(0, Math.ceil(v.y1 / WY));
    const c0 = Math.floor(v.x0 / WX) - 1;
    const c1 = Math.ceil(v.x1 / WX) + 1;
    const kick = hit(b, 'kick', 0.12);
    for (let row = r0; row < r1; row++) {
      const ry = row * WY;
      for (let k = Math.floor(v.x0 / P); k * P < v.x1; k++) {
        const a = Math.max(v.x0, k * P);
        const z = Math.min(v.x1, k * P + P - GAP);
        if (z <= a) continue;
        g.fillStyle = C.stone;
        g.fillRect(a, ry + WY - 26, z - a, 14);
        g.fillStyle = C.brickDark;
        g.fillRect(a, ry + WY - 12, z - a, 6);
      }
      for (let col = c0; col <= c1; col++) {
        const wx = col * WX + 70;
        const inWing = ((wx % P) + P) % P;
        if (inWing < 60 || inWing + 110 > P - GAP - 40) continue;
        this.window(g, wx, ry + 60, col, row, C, L, b, kick);
      }
      // fire escapes on some columns: a landing under each window + stairs to the next storey
      for (let col = c0; col <= c1; col++) {
        if (hash(col * 7 + 3) > 0.22) continue;
        const wx = col * WX + 20;
        const inWing = ((wx % P) + P) % P;
        if (inWing + WX * 1.4 > P - GAP - 20) continue;
        this.fireEscape(g, wx, ry, row, C);
      }
    }
    // drainpipes
    for (let col = c0; col <= c1; col++) {
      if (hash(col * 13 + 5) > 0.12) continue;
      const x = col * WX + 5;
      const inWing = ((x % P) + P) % P;
      if (inWing > P - GAP - 20) continue;
      g.fillStyle = C.iron;
      g.fillRect(x, yTop, 10, yBot - yTop);
      g.fillStyle = C.ironRim;
      g.fillRect(x, yTop, 2, yBot - yTop);
    }
    // BIG JIM'S vertical neon blade signs, one per wing, at hashed heights
    for (let k = Math.floor(v.x0 / P) - 1; k * P < v.x1 + 200; k++) {
      const sx = k * P + P - GAP - 150;
      const sy = -420 - Math.floor(hash(k * 3 + 1) * 5) * WY;
      if (sy + 700 < v.y0 || sy - 60 > v.y1) continue;
      this.blade(g, sx, sy, L, b, kick);
    }
    g.restore();
  }

  private window(g: Ctx, x: number, y: number, col: number, row: number, C: NonNullable<JimperialWall['cols']>, L: Lighting, b: BeatInfo, kick: number): void {
    const w = 110;
    const h = 150;
    const hs = hash(col * 31 + row * 17);
    // stone lintel + sill
    g.fillStyle = C.stone;
    g.fillRect(x - 10, y - 14, w + 20, 14);
    g.fillRect(x - 8, y + h, w + 16, 10);
    g.fillStyle = C.frame;
    g.fillRect(x - 4, y - 4, w + 8, h + 8);
    const lamps = L.lamps;
    const litW = hs < 0.58 && lamps > 0.2;
    if (!litW) {
      g.fillStyle = C.glass;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(200,210,240,0.12)';
      g.beginPath();
      g.moveTo(x + 10, y + h);
      g.lineTo(x + 50, y);
      g.lineTo(x + 66, y);
      g.lineTo(x + 26, y + h);
      g.fill();
    } else {
      const kind = Math.floor(hash(col * 5 + row * 3 + 1) * 5);
      const warm = kind === 1 ? '#9AC8F0' : kind === 2 ? CF.neonRose : CF.bulb;
      const flick = kind === 1 ? 0.6 + 0.4 * hash(Math.floor(b.time * 12) + col) : 1;
      g.fillStyle = css(atmos(L, H(warm), 0.1), (0.55 + 0.35 * lamps) * flick);
      g.fillRect(x, y, w, h);
      if (kind === 0 || kind === 4) {
        // a goon dancing on the backbeat in his room
        g.save();
        g.beginPath();
        g.rect(x, y, w, h);
        g.clip();
        const JC: JammerColours = { body: C.sil, vest: C.sil, skin: C.sil, rim: css(H(warm), 0.5) };
        drawJammer(g, x + w * (0.35 + hs * 0.3), y + h + 18, 0.78, Math.floor(hs * 50), b, JC, hs < 0.3 ? 1 : -1);
        g.restore();
      } else if (kind === 2) {
        // venetian blinds
        g.fillStyle = 'rgba(20,10,16,0.55)';
        for (let yy = y + 6; yy < y + h; yy += 12) g.fillRect(x, yy, w, 5);
      } else if (kind === 3) {
        // sax player swaying on the half-bar
        const sw = Math.sin(b.beat * Math.PI * 0.5) * 6;
        g.fillStyle = C.sil;
        g.beginPath();
        g.arc(x + 55 + sw, y + 70, 14, 0, TAU);
        g.moveTo(x + 30 + sw, y + h);
        g.quadraticCurveTo(x + 55 + sw, y + 70, x + 80 + sw, y + h);
        g.fill();
        g.strokeStyle = C.sil;
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(x + 62 + sw, y + 80);
        g.quadraticCurveTo(x + 84 + sw, y + 110, x + 74 + sw, y + 126);
        g.stroke();
      } else {
        // curtains, parted
        g.fillStyle = css(lit(L, H('#5E2B4E'), 0.8, 0.1));
        g.fillRect(x, y, 26, h);
        g.fillRect(x + w - 26, y, 26, h);
      }
      drawGlow(g, x + w / 2, y + h / 2, warm, 120, 0.12 * lamps * (1 + kick * 0.5));
    }
    // mullions
    g.fillStyle = C.frame;
    g.fillRect(x + w / 2 - 3, y, 6, h);
    g.fillRect(x, y + h * 0.48, w, 6);
  }

  private fireEscape(g: Ctx, x: number, ry: number, row: number, C: NonNullable<JimperialWall['cols']>): void {
    const w = WX * 1.35;
    const ly = ry + WY - 40;
    // landing grating + rail
    g.fillStyle = C.iron;
    g.fillRect(x, ly, w, 9);
    g.fillRect(x, ly - 58, w, 5);
    for (let px = x; px <= x + w; px += 26) g.fillRect(px, ly - 58, 3, 60);
    g.fillStyle = C.ironRim;
    g.fillRect(x, ly - 58, w, 1.5);
    g.fillRect(x, ly, w, 1.5);
    // stairs to the storey above, alternating direction
    const up = ly - WY;
    const dir = row % 2 ? 1 : -1;
    const sx0 = dir > 0 ? x + 20 : x + w - 20;
    const sx1 = dir > 0 ? x + w - 60 : x + 60;
    g.strokeStyle = C.iron;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(sx0, ly);
    g.lineTo(sx1, up + 10);
    g.stroke();
    g.lineWidth = 3;
    for (let i = 1; i < 9; i++) {
      const u = i / 9;
      const px = sx0 + (sx1 - sx0) * u;
      const py = ly + (up + 10 - ly) * u;
      g.beginPath();
      g.moveTo(px - 10, py);
      g.lineTo(px + 10, py);
      g.stroke();
    }
    g.strokeStyle = C.ironRim;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(sx0, ly - 40);
    g.lineTo(sx1, up - 30);
    g.stroke();
  }

  private blade(g: Ctx, x: number, y: number, L: Lighting, b: BeatInfo, kick: number): void {
    const letters = "BIG JIM'S";
    const hh = 64;
    const n = letters.length;
    const h = n * hh + 40;
    const buzz = hash(Math.floor(b.time * 24) * 3 + x) < 0.04 * (1 + hit(b, 'hat', 0.05) * 5) ? 0.35 : 1;
    const on = Math.min(1, (0.55 + 0.45 * L.lamps) * buzz + kick * 0.35);
    // bracket arms + dark blade
    g.fillStyle = css(lit(L, H('#1A1016'), 0.4, 0.1));
    g.fillRect(x - 60, y + 40, 60, 8);
    g.fillRect(x - 60, y + h - 60, 60, 8);
    g.fillRect(x, y, 96, h);
    g.strokeStyle = css(atmos(L, H(CF.bulb), 0.1), 0.4 + 0.5 * on);
    g.lineWidth = 3;
    g.strokeRect(x + 5, y + 5, 86, h - 10);
    g.font = `italic ${hh - 6}px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const ch = letters[i];
      if (ch === ' ') continue;
      const ly = y + 30 + i * hh;
      g.fillStyle = css(mix(H(CF.neonRose), [255, 255, 255], 0.2 * on), 0.3 + 0.7 * on);
      g.fillText(ch, x + 48, ly);
    }
    drawGlow(g, x + 48, y + h / 2, CF.neonRose, h * 0.7, 0.35 * on);
    // chasing bulbs down the edge on the 8ths
    const ch = Math.floor(b.beat * 2);
    for (let i = 0; i < n + 1; i++) {
      const lit8 = (i + ch) % 3 === 0;
      g.fillStyle = lit8 ? CF.bulb : '#4A3A38';
      g.beginPath();
      g.arc(x + 100, y + 20 + i * hh, 5, 0, TAU);
      g.fill();
    }
  }
}

// ------------------------------------------------------------------ front: laundry lines

function laundry(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const v = layerView(cam, 1.25);
  pushLayer(g, v);
  const hat = hit(f.b, 'hat', 0.1);
  const L = f.L;
  const cloth = [css(lit(L, H('#E9DCC4'), 0.7, 0.05)), css(lit(L, H('#5E6E8A'), 0.7, 0.05)), css(lit(L, H('#8A4A76'), 0.7, 0.05))];
  const line = css(lit(L, H('#1A1016'), 0.4, 0.05));
  const SPAN = 2200;
  for (let k = Math.floor(v.x0 / SPAN) - 1; k <= Math.floor(v.x1 / SPAN); k++) {
    if (hash(k * 5 + 2) < 0.35) continue;
    const x0 = k * SPAN + 200;
    const x1 = x0 + 900;
    const yy = v.y0 + 40 + hash(k) * 80;
    const sag = 70;
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x0, yy);
    g.quadraticCurveTo((x0 + x1) / 2, yy + sag * 2, x1, yy);
    g.stroke();
    for (let i = 1; i < 7; i++) {
      const u = i / 7;
      const px = x0 + (x1 - x0) * u;
      const py = yy + sag * 4 * u * (1 - u);
      const flap = Math.sin(f.b.time * 5 + i * 1.7) * (3 + 10 * hat);
      g.fillStyle = cloth[(i + k) % 3];
      g.beginPath();
      g.moveTo(px - 26, py);
      g.lineTo(px + 26, py);
      g.lineTo(px + 22 + flap, py + 64);
      g.lineTo(px - 22 + flap, py + 64);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

// ------------------------------------------------------------------ act-2 entity helpers (world space)

/**
 * The window a bottle is thrown from (world x, y = window centre). `k` 0..1: 0 = goon appears, ~0.5 = arm
 * cocked back (THE TELL), 1 = released. After release it stays lit a moment.
 */
export function drawThrowWindow(g: Ctx, x: number, y: number, k: number, L: Lighting, b: BeatInfo): void {
  const w = 130;
  const h = 170;
  g.save();
  g.translate(x, y);
  // frame + warm light
  g.fillStyle = css(lit(L, H('#B8A890'), 0.8, 0));
  g.fillRect(-w / 2 - 12, -h / 2 - 16, w + 24, 16);
  g.fillRect(-w / 2 - 10, h / 2, w + 20, 12);
  g.fillStyle = '#2A1E16';
  g.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
  g.fillStyle = css(atmos(L, H(CF.bulb), 0.05), 0.9);
  g.fillRect(-w / 2, -h / 2, w, h);
  drawGlow(g, 0, 0, CF.bulb, 200, 0.35);
  // the thrower: leans out, arm cocks back then whips forward (toward the hero = left)
  const lean = Math.min(1, k * 3);
  const cock = k < 0.7 ? Math.min(1, k / 0.5) : Math.max(0, 1 - (k - 0.7) / 0.1);
  const sil = '#1A1014';
  g.save();
  g.beginPath();
  g.rect(-w / 2 - 60, -h / 2 - 80, w + 120, h + 80);
  g.clip();
  g.translate(0, 26);
  g.scale(0.78, 0.78);
  g.fillStyle = sil;
  g.beginPath();
  g.moveTo(-40, h / 2);
  g.quadraticCurveTo(-46 - 20 * lean, -10, -18 - 22 * lean, -30);
  g.quadraticCurveTo(10, -44, 30, -20);
  g.lineTo(44, h / 2);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(-20 - 26 * lean, -54, 18, 0, TAU);
  g.fill();
  // flat cap
  g.beginPath();
  g.ellipse(-20 - 26 * lean, -66, 20, 7, 0, Math.PI, 0);
  g.fill();
  // throwing arm: cocked up and back (right) during the tell, whips to the left on release
  const ang = cock > 0 ? -Math.PI / 2 + 0.9 * cock : -Math.PI + 0.3;
  g.strokeStyle = sil;
  g.lineWidth = 14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -24);
  const hx = Math.cos(ang) * 60;
  const hy = -24 + Math.sin(ang) * 60;
  g.lineTo(hx, hy);
  g.stroke();
  if (k < 0.74) {
    // the bottle in his fist: the danger colour, before it flies
    g.save();
    g.translate(hx, hy);
    g.rotate(ang + Math.PI / 2);
    g.fillStyle = '#B3201B';
    g.strokeStyle = '#1A1410';
    g.lineWidth = 4;
    g.beginPath();
    g.rect(-9, -34, 18, 26);
    g.rect(-4, -48, 8, 14);
    g.stroke();
    g.fill();
    g.restore();
  }
  g.restore();
  // mullion over the lower sash
  g.fillStyle = '#2A1E16';
  g.fillRect(-w / 2, 20, w, 7);
  g.restore();
  void b;
}

/**
 * Big Jim's FIRST GLINT: a high penthouse-ish window, fig light, the pear-shaped velvet mass and two chrome
 * aviator ovals that flash a star on the beat. `k` 0..1 over the cue (fades in and out).
 */
export function drawBigJimGlint(g: Ctx, x: number, y: number, k: number, L: Lighting, b: BeatInfo): void {
  const a = Math.min(1, k * 5, (1 - k) * 4);
  if (a <= 0.01) return;
  const w = 200;
  const h = 240;
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.fillStyle = css(lit(L, H('#B8A890'), 0.8, 0));
  g.fillRect(-w / 2 - 14, -h / 2 - 18, w + 28, 18);
  g.fillStyle = '#1A0E16';
  g.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, '#8A4A76');
  gr.addColorStop(1, '#2E1428');
  g.fillStyle = gr;
  g.fillRect(-w / 2, -h / 2, w, h);
  // Big Jim: a pear-shaped velvet mass filling the window
  g.fillStyle = '#140810';
  g.beginPath();
  g.moveTo(-w / 2 + 4, h / 2);
  g.bezierCurveTo(-w / 2 - 10, 10, -60, -30, -38, -50);
  g.bezierCurveTo(-30, -110, 30, -110, 38, -50);
  g.bezierCurveTo(60, -30, w / 2 + 10, 10, w / 2 - 4, h / 2);
  g.closePath();
  g.fill();
  // gold chain
  g.strokeStyle = CF.gold;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, -20, 34, 0.35, Math.PI - 0.35);
  g.stroke();
  // the aviators (chrome) + the GLINT on the kick / stab
  const glint = Math.max(hit(b, 'piano', 0.2), hit(b, 'kick', 0.1) * 0.6);
  for (const s of [-1, 1]) {
    g.fillStyle = CF.chrome;
    g.beginPath();
    g.ellipse(s * 20, -66, 17, 12, s * 0.1, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.ellipse(s * 20 - 5, -70, 6, 3, -0.4, 0, TAU);
    g.fill();
  }
  g.fillStyle = CF.chrome;
  g.fillRect(-4, -68, 8, 3);
  g.restore();
  const flash = 0.5 + 0.5 * glint;
  drawGlow(g, x + 20, y - 66, '#FFFFFF', 90 + 60 * glint, 0.5 * flash * a);
  star4(g, x + 26, y - 72, 40 + 50 * glint, b.beat * 0.4, `rgba(255,255,255,${0.9 * a})`);
  star4(g, x - 14, y - 72, 22 + 30 * glint, -b.beat * 0.3, `rgba(255,255,255,${0.7 * a})`);
}

/** play-layer floor on the facade: iron fire-escape landing on a stone cornice, the building wall below */
export function drawFacadeLedge(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }): void {
  const L = style.light;
  const { x, y, w } = rect;
  const hh = Math.min(rect.h, 1400);
  // the wall below the ledge (the building's own face at play depth)
  g.fillStyle = css(lit(L, H('#4A2820'), 0.55, 0.02));
  g.fillRect(x, y + 34, w, hh - 34);
  let pat = patterns.get(g);
  if (!pat) {
    pat = g.createPattern(bricks(), 'repeat') as CanvasPattern;
    patterns.set(g, pat);
  }
  g.fillStyle = pat;
  g.fillRect(x, y + 34, w, hh - 34);
  // shadow cast by the ledge
  const sh = g.createLinearGradient(0, y + 34, 0, y + 140);
  sh.addColorStop(0, 'rgba(8,4,10,0.6)');
  sh.addColorStop(1, 'rgba(8,4,10,0)');
  g.fillStyle = sh;
  g.fillRect(x, y + 34, w, 106);
  // stone cornice
  g.fillStyle = css(lit(L, H('#B8A890'), 0.85, 0));
  g.fillRect(x - 6, y + 10, w + 12, 24);
  g.fillStyle = css(lit(L, H('#6A5A48'), 0.6, 0));
  g.fillRect(x - 6, y + 28, w + 12, 6);
  // iron grating (the walkable top) + rail posts
  g.fillStyle = css(lit(L, H('#2A2630'), 0.7, 0));
  g.fillRect(x, y, w, 12);
  g.fillStyle = 'rgba(0,0,0,0.5)';
  for (let px = x + 6; px < x + w; px += 12) g.fillRect(px, y + 2, 4, 8);
  // walkable-top rule: black edge + cream lip
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(x - 6, y - 5, 6, hh + 5);
  if (style.capR !== false) g.fillRect(x + w, y - 5, 6, hh + 5);
}

export type { RGB };
