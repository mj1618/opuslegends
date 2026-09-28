/**
 * ACT 3b — THE ROOF AT SUNSET (the drop, chorus 4): the widest, warmest, most beautiful shot of the level after 35 s of
 * purple. Cream sun, coral + rose sky, the whole city spread out BELOW you to the horizon, everything a silhouette
 * except Slim. Light keys 'sunset' (272) -> 'sunsetRose' (280) -> 'dusk' (288): the sun sinks, the neon wakes up.
 * NO ORANGE near the play band (tangerine is Slim's): the sun is cream, the sky coral / rose / fig.
 *
 *   const roof = makeRoof(lightingDirector);  roof.drawBack(ctx, cam, b); ...play...; roof.drawFront(ctx, cam, b);
 *
 * Layers (back -> front): the sky (gradient, corona, slow god rays, the cream sun sinking into the haze, streaky clouds
 * lit from below) · the far skyline (0.04: towers taller than us, hazed rose) · the ROOFTOP SEA (0.12: hundreds of roofs
 * and water towers packed toward the horizon, neon waking in the street canyons, headlight streaks) · the Jimperial's
 * penthouse tower (0.22, right: the goal, two aviator glints in its top window) · the near neighbours (0.5: water
 * towers, chimneys, a billboard, pigeons on the wires) · front: warm haze, an anamorphic lens flare from the sun,
 * pigeons crossing the sun.
 *
 * Play layer (exported):
 *   drawRoofFloor(g, rect, style)          tar deck + brick parapet + the Jimperial's top cornice, sun-glossed
 *   drawSignLetter(g, ch, v)               one of the six BIG JIM letters (3 storeys of steel box letter with rose neon
 *                                          tubes + marquee bulbs) — upright, toppling, fallen as a bridge; neon dies
 *   drawLetterLegs(g, x, w, top, foot, k)  the letter's steel lattice legs (they stay as POSTS after it falls)
 *   drawSkylight(g, r, t)                  a wired-glass skylight pyramid (the drop smashes through one)
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { drawGlow, star4 } from '../core/draw';
import { TAU, clamp01, hash, rng } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, HORIZON_Y, VIEW_H, VIEW_W, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, atmos, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, skyLayer, stripLayer } from '../world/parallax';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
export const SUN = { cream: '#FFE9C2', coral: '#F2856B', rose: '#E8577A', fig: '#5E2B4E', neon: '#FF5C9A' } as const;

export function makeRoof(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  // god rays + corona BEHIND the sky's own sun disc
  const sky = skyLayer('roof-sky');
  scene.add({
    id: 'roof-sky',
    pass: 'back',
    draw: (g, cam, f) => {
      sky.draw(g, cam, f);
      godRays(g, cam, f, sky.sky.horizonY(cam));
    },
  });
  // far skyline on the horizon: towers taller than us, deep in the haze
  scene.add(
    stripLayer({
      id: 'roof-far',
      factor: 0.04,
      W: 3600,
      top: HORIZON_Y - 420,
      H: 440,
      res: 0.4,
      material: { base: '#5A2A4A', shade: '#44203C', detail: '#2A1428', glow: CF.bulb, depth: 0.62 },
      paint: (p) => {
        const r = rng(301);
        let x = 0;
        while (x < p.W) {
          const w = 50 + r() * 110;
          const h = 60 + r() * 300 * (r() < 0.15 ? 1.3 : 0.7);
          p.body.fillRect(x, p.H - h, w, h);
          if (r() < 0.35) {
            // art-deco setbacks + a spire
            p.body.fillRect(x + w * 0.15, p.H - h - 40, w * 0.7, 40);
            p.body.fillRect(x + w * 0.3, p.H - h - 80, w * 0.4, 40);
            p.body.fillRect(x + w * 0.48, p.H - h - 150, 4, 70);
          }
          p.shadeR.fillRect(x + w * 0.75, p.H - h, w * 0.25, h);
          for (let k = 0; k < 10; k++) if (r() < 0.4) p.glow.fillRect(x + 4 + r() * (w - 8), p.H - h + 10 + r() * (h - 20), 3, 4);
          x += w + r() * 20;
        }
      },
    }),
  );
  // the city bed below the horizon (no sky through the gaps) and, after the sea, a depth grade (near = darker)
  scene.add({ id: 'roof-bed', pass: 'back', draw: (g, cam, f) => cityGrade(g, f, sky.sky.horizonY(cam), 'bed') });
  // THE ROOFTOP SEA: roofs + water towers packed toward the horizon (we're above all of them) — two depths
  for (const [id, factor, rows0, rows1, depth, base] of [
    ['roof-sea-far', 0.07, 0, 3, 0.6, '#4A2040'],
    ['roof-sea-near', 0.16, 3, 7, 0.3, '#24081E'],
  ] as [string, number, number, number, number, string][]) {
    scene.add(
      stripLayer({
        id,
        factor,
        W: 3400,
        top: HORIZON_Y - 60,
        H: 620,
        res: 0.4,
        material: { base, shade: '#2A1026', detail: '#1A0A18', accent: '#5A2A4A', glow: CF.bulb, depth },
        paint: (p) => {
          const r = rng(302 + rows0);
          // rows, smaller + denser toward the horizon (perspective)
          for (let row = rows0; row < rows1; row++) {
            const k = row / 6;
            const y0 = 20 + k * k * 460;
            const sc = 0.3 + k * 1.0;
            let x = r() * 60;
            while (x < p.W) {
              const w = (60 + r() * 120) * sc;
              const h = (20 + r() * 60) * sc;
              p.body.fillRect(x, y0 - h, w, h + 140 * sc);
              p.shadeL.fillRect(x, y0 - h, w * 0.22, h + 140 * sc);
              p.rim.fillRect(x, y0 - h, w, 1 + sc * 1.5);
              if (r() < 0.3) {
                const tx = x + w * (0.2 + r() * 0.5);
                const tw = 16 * sc;
                p.detail.fillRect(tx, y0 - h - 16 * sc, 2, 16 * sc);
                p.detail.fillRect(tx + tw - 2, y0 - h - 16 * sc, 2, 16 * sc);
                p.accent.fillRect(tx - 1, y0 - h - 36 * sc, tw + 2, 22 * sc);
                p.accent.beginPath();
                p.accent.moveTo(tx - 2, y0 - h - 36 * sc);
                p.accent.lineTo(tx + tw / 2, y0 - h - 46 * sc);
                p.accent.lineTo(tx + tw + 2, y0 - h - 36 * sc);
                p.accent.fill();
              }
              for (let q = 0; q < 5; q++) if (r() < 0.35) p.glow.fillRect(x + r() * w, y0 - h + 6 + r() * (h + 60 * sc), 2 + sc * 2, 3 + sc * 2);
              x += w + r() * 14 * sc;
            }
            if (row > 1) p.anchors.push({ kind: 'canyon', x: 0, y: p.top + y0 + 40 * sc, s: row });
          }
        },
        props: rows0 === 0 ? undefined : (g, v, f) => canyons(g, v, f),
      }),
    );
  }
  scene.add({ id: 'roof-grade', pass: 'back', draw: (g, cam, f) => cityGrade(g, f, sky.sky.horizonY(cam), 'grade') });
  // the Jimperial's penthouse tower: the goal on the right, two aviator glints in the top window
  scene.add({ id: 'roof-tower', pass: 'back', draw: (g, cam, f) => jimperialTower(g, cam, f) });
  // near neighbours: water towers, chimneys, a billboard, wires with pigeons (tops just above our roof line)
  scene.add(
    stripLayer({
      id: 'roof-near',
      factor: 0.5,
      W: 3000,
      top: -420,
      H: 520,
      res: 0.5,
      material: { base: '#2E1228', shade: '#200A1C', detail: '#12060E', accent: '#44203C', glow: CF.bulb, depth: 0.18 },
      paint: (p) => {
        const r = rng(303);
        let x = 0;
        while (x < p.W) {
          const w = 240 + r() * 360;
          const h = 60 + r() * 140;
          const y0 = p.H - h;
          for (const dx of x + w > p.W ? [0, -p.W] : [0]) {
            p.body.fillRect(x + dx, y0, w, h);
            p.detail.fillRect(x + dx - 8, y0 - 12, w + 16, 12);
            p.rim.fillRect(x + dx - 8, y0 - 12, w + 16, 3);
            if (r() < 0.55) {
              // water tower on stilts
              const tx = x + dx + 40 + r() * (w - 140);
              for (const lx of [6, 34, 62]) p.detail.fillRect(tx + lx, y0 - 90, 6, 80);
              p.detail.fillRect(tx, y0 - 60, 74, 4);
              p.accent.fillRect(tx, y0 - 170, 74, 84);
              p.accent.beginPath();
              p.accent.moveTo(tx - 4, y0 - 170);
              p.accent.lineTo(tx + 37, y0 - 206);
              p.accent.lineTo(tx + 78, y0 - 170);
              p.accent.fill();
              for (let k = 0; k < 4; k++) p.detail.fillRect(tx, y0 - 158 + k * 20, 74, 3);
              p.rim.fillRect(tx + 60, y0 - 170, 14, 84);
            } else if (r() < 0.5) {
              // billboard frame on the roof
              const bx = x + dx + 30 + r() * (w - 260);
              p.detail.fillRect(bx, y0 - 170, 220, 110);
              p.anchors.push({ kind: 'bill', x: bx + 110, y: p.top + y0 - 115, s: Math.floor(r() * 3) });
              for (const lx of [20, 100, 180]) p.detail.fillRect(bx + lx, y0 - 60, 6, 60);
            }
            // chimneys + vents
            for (let k = 0; k < 2; k++) {
              const cx = x + dx + r() * w;
              p.body.fillRect(cx, y0 - 40 - r() * 30, 24, 60);
              p.anchors.push({ kind: 'smoke', x: cx + 12, y: p.top + y0 - 60, s: k });
            }
            for (let wy = y0 + 20; wy < p.H - 10; wy += 36)
              for (let wx = x + 14; wx < x + w - 20; wx += 30) if (r() < 0.3) p.glow.fillRect(wx + dx, wy, 12, 16);
          }
          x += w + 40 + r() * 140;
        }
      },
      props: (g, v, f, layer) => {
        const L = f.L;
        layer.eachAnchor(v, 'bill', 300, (a, x) => {
          // painted billboards, sun-faded (never tangerine)
          g.fillStyle = css(lit(L, H(a.s === 1 ? '#E9D8B4' : '#C9B89A'), 0.9, 0.35));
          g.fillRect(x - 104, a.y - 50, 208, 100);
          g.font = `italic 40px ${SIGN_FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = css(lit(L, H(a.s === 0 ? '#5E2B4E' : '#2E7F86'), 0.9, 0.35));
          g.fillText(['BIG JIM', 'JIMPERIAL', 'CHIPS 24H'][a.s % 3], x, a.y - 8);
          g.font = `18px ${SIGN_FONT}`;
          g.fillText(['OWNS THIS TOWN', 'CASINO · POOL', 'NO LIMIT'][a.s % 3], x, a.y + 28);
        });
        layer.eachAnchor(v, 'smoke', 200, (a, x) => {
          for (let i = 0; i < 4; i++) {
            const u = (((f.b.time * 0.25 + i / 4 + a.s * 0.37) % 1) + 1) % 1;
            g.fillStyle = css(lit(L, H('#C9A0B0'), 1, 0.3), 0.18 * (1 - u));
            g.beginPath();
            g.arc(x + u * 70 + Math.sin(u * 5 + i) * 10, a.y - u * 160, 14 + u * 36, 0, TAU);
            g.fill();
          }
        });
      },
    }),
  );
  scene.add({ id: 'roof-front', pass: 'front', draw: (g, cam, f) => roofFront(g, cam, f, sky.sky.horizonY(cam)) });
  return scene;
}

// ------------------------------------------------------------------ sky dressing

function godRays(g: Ctx, _cam: ArtCamera, f: SceneFrame, hy: number): void {
  const L = f.L;
  if (L.sunAmt < 0.05) return;
  const sx = L.sunX * VIEW_W;
  const sy = hy - (0.5 - L.sunY) * 900;
  const a = L.sunAmt;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const rot = f.b.time * 0.015;
  const pulse = 0.8 + 0.2 * hit(f.b, 'kick', 0.3);
  for (let i = 0; i < 16; i++) {
    const ang = rot + (i / 16) * TAU + hash(i) * 0.2;
    const w = 0.035 + hash(i + 3) * 0.05;
    const len = 1500 + hash(i + 5) * 700;
    const gr = g.createRadialGradient(sx, sy, 60, sx, sy, len);
    const col = css(mix(L.sun, L.glow, 0.4), 0.09 * a * pulse * (0.5 + hash(i + 8)));
    gr.addColorStop(0, col);
    gr.addColorStop(1, css(L.glow, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(sx, sy);
    g.arc(sx, sy, len, ang - w, ang + w);
    g.closePath();
    g.fill();
  }
  // corona
  drawGlow(g, sx, sy, css(L.sun), L.sunR * 5, 0.35 * a);
  g.restore();
}

function cityGrade(g: Ctx, f: SceneFrame, hy: number, mode: 'bed' | 'grade'): void {
  const L = f.L;
  const deep = mix(H('#1E0818'), L.amb, 0.35);
  if (mode === 'bed') {
    const gr = g.createLinearGradient(0, hy - 20, 0, hy + 420);
    gr.addColorStop(0, css(mix(L.haze, L.skyLow, 0.5)));
    gr.addColorStop(0.1, css(mix(L.haze, deep, 0.6)));
    gr.addColorStop(1, css(deep));
    g.fillStyle = gr;
    g.fillRect(0, hy - 20, VIEW_W, VIEW_H - hy + 20);
    return;
  }
  // depth: MULTIPLY toward a deep fig as the city comes closer (below the horizon)
  const gr = g.createLinearGradient(0, hy + 10, 0, hy + 460);
  gr.addColorStop(0, 'rgb(255,255,255)');
  gr.addColorStop(0.45, css(mix([255, 255, 255], deep, 0.45)));
  gr.addColorStop(1, css(mix([255, 255, 255], deep, 0.8)));
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = gr;
  g.fillRect(0, hy + 10, VIEW_W, VIEW_H - hy);
  g.restore();
  // the horizon haze line (sun-side brighter)
  const hz = g.createLinearGradient(0, hy - 60, 0, hy + 80);
  hz.addColorStop(0, css(L.haze, 0));
  hz.addColorStop(0.5, css(mix(L.haze, L.glow, 0.4), 0.35 * L.hazeK));
  hz.addColorStop(1, css(L.haze, 0));
  g.fillStyle = hz;
  g.fillRect(0, hy - 60, VIEW_W, 140);
}

function canyons(g: Ctx, v: import('../world/camera').LayerView, f: SceneFrame): void {
  // street canyons: neon waking with the dusk (L.lamps), headlight streaks crawling
  const L = f.L;
  const on = 0.25 + 0.75 * L.lamps;
  const t = f.b.time;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let row = 2; row < 7; row++) {
    const k = row / 6;
    const sc = 0.3 + k * 1.0;
    const y = HORIZON_Y - 60 + 20 + k * k * 460 + 30 * sc;
    for (let i = 0; i < 26; i++) {
      const x = v.x0 + ((hash(i * 7 + row) * 4000 + t * 40 * sc * (i % 2 ? 1 : -1)) % (v.x1 - v.x0 + 200)) - 100;
      g.fillStyle = i % 3 === 0 ? `rgba(255,233,194,${0.35 * on})` : i % 3 === 1 ? `rgba(224,86,155,${0.3 * on})` : `rgba(70,214,160,${0.25 * on})`;
      g.fillRect(x, y + (i % 2) * 3 * sc, 10 * sc + 8, 2 + sc * 1.5);
    }
  }
  g.restore();
}

function jimperialTower(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const L = f.L;
  const v = layerView(cam, 0.22);
  pushLayer(g, v);
  const P = 5200;
  for (let k = Math.floor(v.x0 / P) - 1; k <= Math.floor(v.x1 / P) + 1; k++) {
    const x = k * P + 3000;
    if (x < v.x0 - 500 || x > v.x1 + 500) continue;
    const base = HORIZON_Y + 200;
    const top = HORIZON_Y - 760;
    const body = css(lit(L, H('#3A1A34'), 0.9, 0.55));
    const shade = css(lit(L, H('#2A1026'), 0.9, 0.55));
    g.fillStyle = body;
    g.fillRect(x - 170, top + 240, 340, base - top - 240);
    g.fillRect(x - 120, top + 120, 240, 130);
    g.fillRect(x - 80, top + 40, 160, 90);
    g.fillStyle = shade;
    g.fillRect(x + 90, top + 240, 80, base - top - 240);
    // the neon crown
    const on = 0.5 + 0.5 * L.lamps;
    g.strokeStyle = css(mix(H(SUN.neon), [255, 255, 255], 0.1), 0.35 + 0.5 * on);
    g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = x - 80 + i * 20;
      g.lineTo(px, top + 40 - (i % 2 ? 36 : 0));
    }
    g.stroke();
    drawGlow(g, x, top + 20, SUN.neon, 200, 0.25 * on);
    // the penthouse window: two chrome glints flash on the kick
    g.fillStyle = css(lit(L, H('#F8E0B0'), 1, 0.3), 0.8);
    g.fillRect(x - 60, top + 150, 120, 60);
    g.fillStyle = css(lit(L, H('#2E1428'), 0.9, 0.3));
    g.beginPath();
    g.ellipse(x, top + 212, 46, 50, 0, Math.PI, TAU);
    g.fill();
    const gl = hit(f.b, 'piano', 0.25) * 0.7 + 0.3;
    star4(g, x - 14, top + 184, 16 * gl, f.b.time, 'rgba(255,255,255,0.95)');
    star4(g, x + 14, top + 184, 16 * gl, f.b.time + 1, 'rgba(255,255,255,0.95)');
    // lit windows
    g.fillStyle = css(atmos(L, H(CF.bulb), 0.4), 0.3 + 0.5 * L.lamps);
    for (let wy = top + 280; wy < base - 20; wy += 44) for (let wx = x - 150; wx < x + 140; wx += 36) if (hash(wx * 3 + wy) < 0.35) g.fillRect(wx, wy, 14, 20);
  }
  g.restore();
}

function roofFront(g: Ctx, cam: ArtCamera, f: SceneFrame, hy: number): void {
  const L = f.L;
  const b = f.b;
  const sx = L.sunX * VIEW_W;
  const sy = hy - (0.5 - L.sunY) * 900;
  // pigeons crossing the sun (a flock every ~6 s)
  const ph = (b.time / 6) % 1;
  g.fillStyle = css(lit(L, H('#2A1428'), 0.6, 0.4), 0.85);
  for (let i = 0; i < 9; i++) {
    const px = -200 + ph * (VIEW_W + 400) + (hash(i) - 0.5) * 220 - ((cam.x * 0.3) % (VIEW_W + 400)) * 0;
    const py = sy - 120 + (hash(i + 4) - 0.5) * 140 + Math.sin(ph * 12 + i) * 10;
    const flap = Math.sin(b.time * 14 + i * 2);
    g.beginPath();
    g.moveTo(px - 12, py - flap * 6);
    g.quadraticCurveTo(px - 4, py - 2, px, py + 2);
    g.quadraticCurveTo(px + 4, py - 2, px + 12, py - flap * 6);
    g.lineTo(px, py + 5);
    g.closePath();
    g.fill();
  }
  if (L.sunAmt > 0.05) {
    // anamorphic flare through the sun + ghost rings toward the centre
    g.save();
    g.globalCompositeOperation = 'lighter';
    const a = L.sunAmt * (0.85 + 0.15 * hit(b, 'crash', 0.4));
    const gr = g.createLinearGradient(0, 0, VIEW_W, 0);
    gr.addColorStop(0, 'rgba(255,233,194,0)');
    gr.addColorStop(clamp01(sx / VIEW_W), `rgba(255,240,215,${0.22 * a})`);
    gr.addColorStop(1, 'rgba(255,233,194,0)');
    g.fillStyle = gr;
    g.fillRect(0, sy - 3, VIEW_W, 6);
    g.fillStyle = `rgba(255,240,215,${0.08 * a})`;
    g.fillRect(0, sy - 16, VIEW_W, 32);
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    for (let i = 1; i <= 4; i++) {
      const u = i * 0.45;
      const rx = sx + (cx - sx) * u;
      const ry = sy + (cy - sy) * u;
      g.strokeStyle = i % 2 ? `rgba(232,87,122,${0.12 * a})` : `rgba(255,233,194,${0.1 * a})`;
      g.lineWidth = 3 + i;
      g.beginPath();
      g.arc(rx, ry, 30 + i * 22, 0, TAU);
      g.stroke();
    }
    g.restore();
  }
  // warm haze low in the frame (never over the hero's colour)
  const hz = g.createLinearGradient(0, VIEW_H * 0.55, 0, VIEW_H);
  hz.addColorStop(0, css(L.haze, 0));
  hz.addColorStop(1, css(L.haze, 0.1 * L.hazeK));
  g.fillStyle = hz;
  g.fillRect(0, VIEW_H * 0.55, VIEW_W, VIEW_H * 0.45);
}

// ------------------------------------------------------------------ play layer

/** the roof: tar deck (sun-glossed), a brick parapet front + the Jimperial's top cornice; cream lip on the walkable top */
export function drawRoofFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }): void {
  const L = style.light;
  const { x, y, w } = rect;
  const hh = Math.min(rect.h, 1600);
  // deck: tar paper, warm gloss from the low sun
  const deck = g.createLinearGradient(0, y, 0, y + 40);
  deck.addColorStop(0, css(lit(L, H('#6A4A5A'), 1.1, 0)));
  deck.addColorStop(1, css(lit(L, H('#2A1A26'), 0.8, 0)));
  g.fillStyle = deck;
  g.fillRect(x, y, w, 40);
  g.fillStyle = css(mix(L.sun, [255, 255, 255], 0.3), 0.18 * L.sunAmt);
  for (let px = Math.ceil(x / 300) * 300; px < x + w; px += 300) g.fillRect(px + 40, y + 8, 120, 3);
  // parapet brick face
  g.fillStyle = css(lit(L, H('#6B3A2E'), 0.85, 0));
  g.fillRect(x, y + 40, w, 70);
  g.fillStyle = css(lit(L, H('#3A1E18'), 0.7, 0), 0.8);
  for (let row = 0; row < 3; row++) {
    const ry = y + 44 + row * 22;
    g.fillRect(x, ry + 19, w, 3);
    for (let px = Math.floor(x / 48) * 48 + (row % 2) * 24; px < x + w; px += 48) if (px > x) g.fillRect(px, ry, 3, 20);
  }
  // stone cornice + the building below, falling into shadow
  g.fillStyle = css(lit(L, H('#B8A890'), 0.9, 0));
  g.fillRect(x, y + 110, w, 26);
  g.fillStyle = css(lit(L, H('#4A3040'), 0.6, 0));
  g.fillRect(x, y + 136, w, 10);
  const wall = g.createLinearGradient(0, y + 146, 0, y + hh);
  wall.addColorStop(0, css(lit(L, H('#4A2A34'), 0.8, 0)));
  wall.addColorStop(0.5, css(lit(L, H('#241420'), 0.5, 0)));
  wall.addColorStop(1, '#0E0810');
  g.fillStyle = wall;
  g.fillRect(x, y + 146, w, hh - 146);
  // top-floor windows (dim)
  g.fillStyle = css(atmos(L, H(CF.bulb), 0.2), 0.25 + 0.35 * L.lamps);
  for (let px = Math.ceil(x / 180) * 180 + 50; px < x + w - 60; px += 180) g.fillRect(px, y + 186, 50, 80);
  // walkable-top rule
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(x - 6, y - 5, 6, hh + 5);
  if (style.capR !== false) g.fillRect(x + w, y - 5, 6, hh + 5);
}

export interface LetterView {
  /** pivot (world): the letter's bottom-LEFT corner (the foot on the hero's side); it topples forward (clockwise) and
   *  lands as a bridge whose TOP is the pivot's height, spanning [px, px + len] */
  px: number;
  py: number;
  /** letter height (upright) = bridge length when fallen */
  len: number;
  /** letter width (upright) = bridge thickness when fallen */
  thick: number;
  /** 0 upright .. PI/2 fallen */
  angle: number;
  /** 0..1 neon on (flickers while falling, dies after the SLAM) */
  neon: number;
  /** seconds since it landed (NaN = hasn't) — tube pops, sparks */
  landedT: number;
  time: number;
  light: Lighting;
  b: BeatInfo;
}

/**
 * One BIG JIM letter: a steel box letter (fig-dark sheet metal, riveted, rim-lit by the sun) with double ROSE NEON
 * tubes tracing the glyph and marquee bulbs round the edge. Drawn in the letter's frame and rotated about the pivot.
 */
export function drawSignLetter(g: Ctx, ch: string, v: LetterView): void {
  const L = v.light;
  const { len, thick } = v;
  g.save();
  g.translate(v.px, v.py);
  g.rotate(v.angle);
  // letter frame: x in [0, thick], y in [-len, 0]
  g.translate(thick, 0);
  const cx = -thick / 2;
  const cy = -len / 2;
  // steel backing frame (lattice) behind the glyph
  g.strokeStyle = css(lit(L, H('#2A1A26'), 0.8, 0.05));
  g.lineWidth = 10;
  g.strokeRect(-thick + 20, -len + 20, thick - 40, len - 40);
  g.lineWidth = 6;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const y0 = -len + 20 + (i * (len - 40)) / 6;
    const y1 = -len + 20 + ((i + 1) * (len - 40)) / 6;
    g.moveTo(-thick + 20, y0);
    g.lineTo(-20, y1);
    g.moveTo(-20, y0);
    g.lineTo(-thick + 20, y1);
  }
  g.stroke();
  // the glyph, sized to the box
  const fs = len * 1.12;
  g.font = `${fs}px ${SIGN_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const m = g.measureText(ch);
  const sx = Math.min(1.6, (thick * 0.96) / Math.max(1, m.width));
  g.save();
  g.translate(cx, cy + len * 0.04);
  g.scale(sx, 1);
  // ink outline + sheet-metal fill (sun rim on the lit side)
  g.lineJoin = 'round';
  g.lineWidth = 26 / sx;
  g.strokeStyle = CF.filmBlack;
  g.strokeText(ch, 0, 0);
  const face = g.createLinearGradient(-thick / 2 / sx, -len / 2, thick / 2 / sx, len / 2);
  face.addColorStop(0, css(lit(L, H('#4A1A40'), 1, 0)));
  face.addColorStop(0.5, css(lit(L, H('#2A0C26'), 0.9, 0)));
  face.addColorStop(1, css(lit(L, H('#16061A'), 0.8, 0)));
  g.fillStyle = face;
  g.fillText(ch, 0, 0);
  // the neon: two tubes (outer pale core + rose)
  const n = clamp01(v.neon);
  if (n > 0.02) {
    g.lineWidth = 30 / sx;
    g.strokeStyle = css(H(SUN.neon), 0.25 * n);
    g.strokeText(ch, 0, 0);
    g.lineWidth = 14 / sx;
    g.strokeStyle = css(H(SUN.neon), 0.8 * n);
    g.strokeText(ch, 0, 0);
    g.lineWidth = 5 / sx;
    g.strokeStyle = css(mix(H(SUN.neon), [255, 255, 255], 0.55), 0.95 * n);
    g.strokeText(ch, 0, 0);
  } else {
    // dead tubes: grey glass
    g.lineWidth = 7 / sx;
    g.strokeStyle = 'rgba(120,110,130,0.7)';
    g.setLineDash([60, 18]);
    g.strokeText(ch, 0, 0);
    g.setLineDash([]);
  }
  g.restore();
  if (n > 0.02) drawGlow(g, cx, cy, SUN.neon, Math.max(len, thick) * 0.8, 0.28 * n);
  // marquee bulbs round the frame, chasing
  const chase = Math.floor(v.b.beat * 4);
  const per = 2 * (len + thick);
  const nb = Math.floor(per / 70);
  for (let i = 0; i < nb; i++) {
    let d = (i / nb) * per;
    let bx: number;
    let by: number;
    if (d < thick) (bx = -thick + d), (by = -len);
    else if ((d -= thick) < len) (bx = 0), (by = -len + d);
    else if ((d -= len) < thick) (bx = -d), (by = 0);
    else (d -= thick), (bx = -thick), (by = -d);
    const on = n > 0.02 && (i + chase) % 3 !== 0;
    g.fillStyle = on ? CF.bulb : 'rgba(60,50,60,0.9)';
    g.beginPath();
    g.arc(bx, by, 8, 0, TAU);
    g.fill();
    if (on && i % 2 === 0) drawGlow(g, bx, by, CF.bulb, 26, 0.35 * n);
  }
  g.restore();
  // SLAM: sparks + tube pops from the landed letter (world space, along the bridge)
  if (!Number.isNaN(v.landedT) && v.landedT < 1.6) {
    const u = v.landedT;
    const topY = v.py;
    for (let i = 0; i < 26; i++) {
      const ex = v.px + hash(i) * len;
      const ang = -Math.PI / 2 + (hash(i + 3) - 0.5) * 2.2;
      const sp = 300 + hash(i + 7) * 700;
      const x = ex + Math.cos(ang) * sp * u;
      const y = topY + Math.sin(ang) * sp * u + 900 * u * u;
      g.fillStyle = i % 3 ? CF.bulb : '#FFFFFF';
      g.globalAlpha = Math.max(0, 1 - u / 1.2);
      g.fillRect(x, y, 5, 5);
    }
    g.globalAlpha = 1;
    // tube pops: bright flashes running along the letter
    for (let i = 0; i < 6; i++) {
      const tp = i * 0.09;
      const k = u - tp;
      if (k < 0 || k > 0.25) continue;
      const px = v.px + (0.1 + 0.8 * hash(i + 20)) * len;
      drawGlow(g, px, topY + thick * 0.4, '#FFFFFF', 140, 0.9 * (1 - k / 0.25));
      star4(g, px, topY + thick * 0.4, 70 * (1 - k / 0.25), i, 'rgba(255,240,245,0.95)');
    }
    // dust cloud off the roof
    g.fillStyle = css(lit(v.light, H('#C9A0B0'), 1, 0.2), 0.3 * Math.max(0, 1 - u));
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.arc(v.px + (i / 7) * len, v.py + 10 - u * 60, 40 + u * 80, 0, TAU);
      g.fill();
    }
  }
}

/** the letter's steel lattice legs (x = left edge, w wide) from its base down to the roof — they stay up as POSTS */
export function drawLetterLegs(g: Ctx, x: number, w: number, top: number, foot: number, L: Lighting): void {
  const hh = foot - top;
  if (hh < 4) return;
  const col = css(lit(L, H('#3A2A3A'), 0.9, 0.05));
  const legW = 26;
  g.fillStyle = CF.filmBlack;
  for (const lx of [x, x + w - legW]) {
    g.fillRect(lx - 3, top - 3, legW + 6, hh + 3);
  }
  g.fillStyle = col;
  for (const lx of [x, x + w - legW]) g.fillRect(lx, top, legW, hh);
  // cross bracing
  g.strokeStyle = col;
  g.lineWidth = 7;
  g.beginPath();
  const n = Math.max(1, Math.round(hh / 120));
  for (let i = 0; i < n; i++) {
    const y0 = top + (i / n) * hh;
    const y1 = top + ((i + 1) / n) * hh;
    g.moveTo(x + legW, y0);
    g.lineTo(x + w - legW, y1);
    g.moveTo(x + w - legW, y0);
    g.lineTo(x + legW, y1);
  }
  g.stroke();
  // the post caps: walkable tops (terrain rule)
  for (const lx of [x, x + w - legW]) {
    g.fillStyle = CF.filmBlack;
    g.fillRect(lx - 8, top - 6, legW + 16, 10);
    g.fillStyle = '#F4EFE2';
    g.fillRect(lx - 8, top - 8, legW + 16, 3);
  }
  g.fillStyle = css(mix(L.rim, [255, 255, 255], 0.3), 0.5 * L.rimAmt);
  g.fillRect(x + w - legW + 18, top, 4, hh);
}

/** a wired-glass SKYLIGHT pyramid in an iron frame (drawn around its centre, r ~ 30) */
export function drawSkylight(g: Ctx, r: number, t: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  g.beginPath();
  g.moveTo(-44, 26);
  g.lineTo(-24, -24);
  g.lineTo(24, -24);
  g.lineTo(44, 26);
  g.closePath();
  g.lineWidth = 7;
  g.strokeStyle = CF.filmBlack;
  g.stroke();
  const gl = g.createLinearGradient(0, -24, 0, 26);
  gl.addColorStop(0, 'rgba(255,233,194,0.85)');
  gl.addColorStop(1, 'rgba(232,87,122,0.6)');
  g.fillStyle = gl;
  g.fill();
  g.strokeStyle = 'rgba(40,24,36,0.8)';
  g.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(i * 12, -24);
    g.lineTo(i * 20, 26);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(-34, 1);
  g.lineTo(34, 1);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath();
  g.moveTo(-20, -20);
  g.lineTo(-10, -20);
  g.lineTo(-30, 20);
  g.lineTo(-38, 20);
  g.closePath();
  g.fill();
  g.restore();
  void t;
}
