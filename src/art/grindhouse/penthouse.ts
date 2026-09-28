/**
 * ACT 3c — THE PENTHOUSE (bars 76-83): Big Jim's throne room at the top of the Jimperial. Fig dark, ONE cream skylight
 * shaft with dust turning in it, a panoramic window onto the night city far below, velvet curtains, gold busts on
 * plinths, a trophy wall, the BJ monogram in gold neon. Light key 'throne'. Big Jim himself is drawn by the renderer
 * with art/grindhouse/bigjim.ts (he IS the level here).
 *
 *   const ph = makePenthouse(light);  ph.state.blaze = 0..1 (lens blaze: the room strobes chrome on every beat of the
 *   reveal), ph.state.crack = 0..1 (a crack flare: the room flashes white)
 *
 * Play layer: drawPenthouseFloor (black + gold marble checker, brass rail), drawGlassWall (the giant glass wall you
 * crash in through), drawDecanter (a crystal decanter breakable).
 */
import { hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex } from '../core/color';
import { drawGlow, star4 } from '../core/draw';
import { TAU, clamp01, hash, rng } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, SEA_Y, VIEW_H, VIEW_W, type LayerView, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, stripLayer } from '../world/parallax';
import type { TiledLayer } from '../world/tiledLayer';
import { drawJimBust } from './bigjim';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const INK = CF.filmBlack;

export interface PenthouseState {
  blaze: number;
  crack: number;
}

export function makePenthouse(light: LightingDirector): ParallaxScene & { state: PenthouseState } {
  const scene = new ParallaxScene(light) as ParallaxScene & { state: PenthouseState };
  scene.state = { blaze: 0, crack: 0 };
  const st = scene.state;
  scene.add({
    id: 'ph-room',
    pass: 'back',
    draw: (g, _cam, f) => {
      g.fillStyle = css(lit(f.L, H('#120812'), 0.5, 0.3));
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    },
  });
  // the panoramic window: the night city far, far below (drawn live: lights twinkle)
  scene.add({ id: 'ph-window', pass: 'back', draw: (g, cam, f) => cityWindow(g, cam, f) });
  scene.add(
    stripLayer({
      id: 'ph-wall',
      factor: 0.3,
      W: 3200,
      top: -1150,
      H: 1250,
      res: 0.45,
      material: { base: '#2E1428', shade: '#1E0C1A', detail: '#0C040A', accent: '#8C7440', glow: '#FFE9C2', depth: 0.3 },
      paint: (p) => {
        const floor = p.H - 40;
        // wall with a huge window cut out (the window layer shows through): bays of 1600
        for (let bay = 0; bay < 2; bay++) {
          const x0 = bay * 1600;
          p.body.fillRect(x0, 0, 1600, 220);
          p.body.fillRect(x0, floor - 260, 1600, 260);
          p.body.fillRect(x0, 0, 420, floor);
          p.body.fillRect(x0 + 1480, 0, 120, floor);
          // window mullions
          for (let m = 0; m < 4; m++) p.detail.fillRect(x0 + 420 + m * 265, 220, 12, floor - 480);
          p.detail.fillRect(x0 + 420, 220 + (floor - 480) * 0.35, 1060, 10);
          p.accent.fillRect(x0 + 410, 210, 1080, 12);
          p.accent.fillRect(x0 + 410, floor - 262, 1080, 12);
          // curtains swept aside
          for (let i = 0; i < 6; i++) {
            (i % 2 ? p.shadeL : p.shadeR).fillRect(x0 + 300 + i * 22, 180, 18, floor - 200);
            (i % 2 ? p.shadeL : p.shadeR).fillRect(x0 + 1480 + i * 20, 180, 16, floor - 200);
          }
          p.accent.fillRect(x0 + 280, 170, 1340, 18);
          // plinths with gold busts + the trophy shelf
          p.anchors.push({ kind: 'bust', x: x0 + 200, y: p.top + floor - 200, s: bay });
          p.anchors.push({ kind: 'mono', x: x0 + 200, y: p.top + 360, s: bay });
          p.detail.fillRect(x0 + 140, floor - 200, 120, 200);
          p.rim.fillRect(x0 + 140, floor - 200, 120, 4);
        }
        p.detail.fillRect(0, 0, p.W, 60);
      },
      props: (g, v, f, layer) => wallProps(g, v, f, layer),
    }),
  );
  // the skylight shaft: one cream beam with dust turning in it
  scene.add({ id: 'ph-shaft', pass: 'back', draw: (g, cam, f) => shaft(g, cam, f, st) });
  scene.add({ id: 'ph-front', pass: 'front', draw: (g, cam, f) => front(g, cam, f, st) });
  return scene;
}

function cityWindow(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const L = f.L;
  const v = layerView(cam, 0.1);
  const gr = g.createLinearGradient(0, 0, 0, VIEW_H);
  gr.addColorStop(0, css(lit(L, H('#0C0818'), 1, 0)));
  gr.addColorStop(0.6, css(lit(L, H('#2A1438'), 1, 0)));
  gr.addColorStop(1, css(lit(L, H('#4A2240'), 1, 0)));
  g.fillStyle = gr;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // a grid of city lights far below, twinkling
  pushLayer(g, v);
  const r = rng(771);
  const t = f.b.time;
  for (let i = 0; i < 420; i++) {
    const x = v.x0 - 200 + ((r() * 4000 - (v.x0 % 4000) + 8000) % 4000);
    const y = -120 + r() * r() * 520;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + r() * 3) + i);
    g.fillStyle = i % 5 === 0 ? `rgba(224,86,155,${0.5 * tw})` : i % 7 === 0 ? `rgba(70,214,160,${0.45 * tw})` : `rgba(255,233,194,${0.35 + 0.4 * tw})`;
    g.fillRect(x, y, 3, 3);
  }
  g.restore();
}

function wallProps(g: Ctx, v: LayerView, f: SceneFrame, layer: TiledLayer): void {
  const L = f.L;
  const b = f.b;
  layer.eachAnchor(v, 'bust', 200, (a, x) => {
    g.save();
    g.translate(x, a.y - 70);
    drawJimBust(g, 60, a.s, hit(b, 'piano', 0.3));
    g.restore();
    drawGlow(g, x, a.y - 90, '#FFD878', 180, 0.12 * L.lamps);
  });
  layer.eachAnchor(v, 'mono', 300, (a, x) => {
    const on = 0.7 + 0.3 * hit(b, 'kick', 0.14);
    g.font = `italic 120px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(10,4,8,0.9)';
    g.strokeText('BJ', x, a.y);
    g.fillStyle = css(H('#E0B64A'), (0.4 + 0.5 * L.lamps) * on);
    g.fillText('BJ', x, a.y);
    drawGlow(g, x, a.y, '#E0B64A', 240, 0.2 * on * L.lamps);
  });
}

function shaft(g: Ctx, cam: ArtCamera, f: SceneFrame, st: PenthouseState): void {
  const L = f.L;
  const v = layerView(cam, 0.5);
  const x = VIEW_W / 2 + ((2200 - v.cx) % 3200 + 3200) % 3200 - 1600;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(0, 0, 0, VIEW_H);
  gr.addColorStop(0, `rgba(248,241,220,${0.22 * L.glowAmt * 4})`);
  gr.addColorStop(1, 'rgba(248,241,220,0.02)');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - 140, -40);
  g.lineTo(x + 140, -40);
  g.lineTo(x + 420, VIEW_H);
  g.lineTo(x - 180, VIEW_H);
  g.closePath();
  g.fill();
  // dust motes turning in the beam
  const t = f.b.time;
  for (let i = 0; i < 40; i++) {
    const u = (hash(i) + t * 0.02 * (0.5 + hash(i + 3))) % 1;
    const y = u * VIEW_H;
    const w = 140 + (y / VIEW_H) * 300;
    const px = x - 40 + (hash(i + 7) - 0.5) * w * 1.6 + Math.sin(t * 0.7 + i) * 20;
    g.fillStyle = `rgba(255,248,230,${0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i))})`;
    g.fillRect(px, y, 2.5, 2.5);
  }
  g.restore();
  void st;
}

function front(g: Ctx, _cam: ArtCamera, f: SceneFrame, st: PenthouseState): void {
  // the lens BLAZE: the whole room strobes chrome-white on the reveal's beats; crack flares flash white
  const a = Math.max(st.blaze * 0.18, st.crack * 0.55);
  if (a > 0.01) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(230,240,250,${a})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.restore();
  }
  // heavy vignette: the throne room is dark at the edges
  const gr = g.createRadialGradient(VIEW_W * 0.5, VIEW_H * 0.5, VIEW_H * 0.45, VIEW_W * 0.5, VIEW_H * 0.5, VIEW_H * 1.05);
  gr.addColorStop(0, 'rgba(8,3,8,0)');
  gr.addColorStop(1, 'rgba(8,3,8,0.6)');
  g.fillStyle = gr;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  void f;
}

// ------------------------------------------------------------------ play layer

/** black + gold MARBLE checker floor with a brass rail; the walkable top keeps the cream lip */
export function drawPenthouseFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }): void {
  const L = style.light;
  const { x, y, w } = rect;
  const hh = Math.min(rect.h, 1600);
  g.fillStyle = css(lit(L, H('#8C7440'), 1.1, 0));
  g.fillRect(x, y, w, 14);
  // checker band (floor seen edge-on: two rows of tiles)
  const T = 64;
  for (let row = 0; row < 2; row++) {
    for (let px = Math.floor(x / T) * T; px < x + w; px += T) {
      const a = Math.max(x, px);
      const z = Math.min(x + w, px + T);
      if (z <= a) continue;
      const dark = ((px / T) | 0) % 2 === row;
      g.fillStyle = css(lit(L, H(dark ? '#1A1016' : '#D8CCB8'), 0.95, 0));
      g.fillRect(a, y + 14 + row * 26, z - a, 26);
    }
  }
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(x, y + 16, w, 4);
  g.fillStyle = css(lit(L, H('#8C7440'), 1, 0));
  g.fillRect(x, y + 66, w, 8);
  const body = g.createLinearGradient(0, y + 74, 0, y + 420);
  body.addColorStop(0, css(lit(L, H('#2E1428'), 0.8, 0)));
  body.addColorStop(1, '#080408');
  g.fillStyle = body;
  g.fillRect(x, y + 74, w, hh - 74);
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(x - 6, y - 5, 6, hh + 5);
  if (style.capR !== false) g.fillRect(x + w, y - 5, 6, hh + 5);
}

/**
 * The penthouse's GLASS WALL (a giant breakable): a tall steel-framed pane with the throne room glowing behind it and
 * Big Jim's silhouette. Drawn around (0, 0) at r ~ 30 normal (giant = r ~ 60+).
 */
export function drawGlassWall(g: Ctx, r: number, t: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  g.fillStyle = '#1A0A16';
  g.fillRect(-40, -60, 80, 100);
  g.fillStyle = 'rgba(248,241,220,0.25)';
  g.fillRect(-36, -56, 72, 92);
  // Big Jim's silhouette inside, two glints
  g.fillStyle = '#2E1428';
  g.beginPath();
  g.ellipse(0, 30, 26, 30, 0, Math.PI, TAU);
  g.fill();
  g.beginPath();
  g.arc(0, -8, 11, 0, TAU);
  g.fill();
  star4(g, -4, -9, 5 + 3 * Math.sin(t * 6), 0, 'rgba(255,255,255,0.95)');
  star4(g, 4, -9, 5 + 3 * Math.sin(t * 6 + 1), 0, 'rgba(255,255,255,0.95)');
  // glass reflections + steel frame
  g.fillStyle = 'rgba(210,230,245,0.35)';
  g.beginPath();
  g.moveTo(-30, 36);
  g.lineTo(-6, -56);
  g.lineTo(6, -56);
  g.lineTo(-18, 36);
  g.closePath();
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 6;
  g.strokeRect(-40, -60, 80, 100);
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, -60);
  g.lineTo(0, 40);
  g.stroke();
  g.restore();
}

/** a crystal DECANTER on a silver tray (reward target, r ~ 30) */
export function drawDecanter(g: Ctx, r: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  g.fillStyle = '#9AA4AC';
  g.fillRect(-30, 26, 60, 6);
  g.beginPath();
  g.moveTo(-6, -40);
  g.lineTo(6, -40);
  g.lineTo(6, -24);
  g.quadraticCurveTo(26, -10, 22, 10);
  g.quadraticCurveTo(18, 26, 0, 26);
  g.quadraticCurveTo(-18, 26, -22, 10);
  g.quadraticCurveTo(-26, -10, -6, -24);
  g.closePath();
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = 'rgba(214,228,236,0.8)';
  g.fill();
  g.fillStyle = 'rgba(160,100,40,0.8)';
  g.beginPath();
  g.moveTo(-20, 6);
  g.quadraticCurveTo(0, 2, 20, 6);
  g.quadraticCurveTo(18, 24, 0, 24);
  g.quadraticCurveTo(-18, 24, -20, 6);
  g.fill();
  g.beginPath();
  g.arc(0, -46, 8, 0, TAU);
  g.fillStyle = 'rgba(214,228,236,0.9)';
  g.fill();
  g.stroke();
  g.restore();
  void clamp01;
  void SEA_Y;
}
