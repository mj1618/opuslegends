/**
 * ACT 1b — THE HONKY-TONK BAR interior. Built on ParallaxScene + stripLayer + LifeLayer.
 *
 *   const bar = makeBar(lightingDirector);   // light key 'bar' (or 'poolroom') in the 'grindhouse' set
 *   bar.drawBack(ctx, cam, beat); ...play layer (drawBarFloor)...; bar.drawFront(ctx, cam, beat);
 *
 * Layers: back wall (0.35): panelling, back-bar mirror + backlit bottle shelves, neon beer signs
 * (buzz on hats, flash on the kick), jukebox (pulses on the beat) · mid (0.6): pool tables under
 * green-shade lamps (light pools), the bartender, LIFE: brawlers trading punches on the beat,
 * patrons raising glasses on "HEY!", bottles thrown on the snare, pool balls flying on piano runs ·
 * front (1.3): hanging lamps swinging on the shuffle, stool silhouettes, smoke layers.
 */
import { type BeatInfo, hit } from '../core/beat';
import { TintBake } from '../core/bake';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { drawGlow } from '../core/draw';
import { TAU, hash, rng } from '../core/math';
import { LifeLayer } from '../life/life';
import { CF } from '../palette';
import { type ArtCamera, SEA_Y, VIEW_H, VIEW_W, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, atmos, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, stripLayer } from '../world/parallax';
import { BOTTLE, BRAWLERS, PATRON, POOL_BALL } from './actors';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const SIGNS = ['COLD BEER', 'EIGHT BALL', 'LIVE MUSIC', 'NO CREDIT'];

export function makeBar(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  // dark ceiling / room fill
  scene.add({
    id: 'room',
    pass: 'back',
    draw: (g, _cam, f) => {
      g.fillStyle = css(lit(f.L, H('#2A1E18'), 0.4, 0.3));
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    },
  });
  const WW = 2800;
  // back wall
  const wall = stripLayer({
    id: 'backwall',
    factor: 0.35,
    W: WW,
    top: -1100,
    H: 1250,
    res: 0.5,
    material: { base: '#5A3A26', shade: '#3A2418', detail: '#1E140E', accent: '#7A5A3A', glow: '#E8C88A', depth: 0.45 },
    paint: (p) => {
      const r = rng(5);
      const floor = p.H - 60;
      p.body.fillRect(0, 0, p.W, p.H);
      // wainscot panels
      for (let x = 0; x < p.W; x += 140) {
        p.detail.fillRect(x, floor - 260, 4, 260);
        p.accent.fillRect(x + 12, floor - 240, 116, 220);
        p.shadeR.fillRect(x + 100, floor - 240, 28, 220);
      }
      p.rim.fillRect(0, floor - 266, p.W, 6);
      // back bar: mirror + shelves of bottles (backlit)
      for (const bx of [200, 1500]) {
        p.detail.fillRect(bx - 10, floor - 720, 920, 470);
        p.glow.globalAlpha = 0.16;
        p.glow.fillRect(bx, floor - 710, 900, 440);
        p.glow.globalAlpha = 1;
        for (let sh = 0; sh < 3; sh++) {
          const sy = floor - 700 + sh * 140;
          p.detail.fillRect(bx, sy + 110, 900, 10);
          for (let x = bx + 12; x < bx + 880; x += 22 + r() * 10) {
            const h = 50 + r() * 40;
            p.glow.fillRect(x, sy + 110 - h, 14, h);
            p.glow.fillRect(x + 4, sy + 110 - h - 16, 6, 16);
            p.detail.globalAlpha = 0.5;
            p.detail.fillRect(x + 9, sy + 110 - h + 6, 3, h - 10);
            p.detail.globalAlpha = 1;
          }
        }
        p.anchors.push({ kind: 'sign', x: bx + 450, y: p.top + floor - 800, s: Math.floor(r() * SIGNS.length) });
      }
      // framed pictures + dartboard + jukebox spot
      for (let x = 1180; x < 1440; x += 130) {
        p.detail.fillRect(x, floor - 640, 90, 110);
        p.accent.fillRect(x + 8, floor - 632, 74, 94);
      }
      p.anchors.push({ kind: 'jukebox', x: 1310, y: p.top + floor, s: 1 });
      p.anchors.push({ kind: 'sign', x: 2600, y: p.top + floor - 620, s: 3 });
      // ceiling beams
      for (let x = 0; x < p.W; x += 400) {
        p.detail.fillRect(x, 0, 60, 120);
      }
      p.detail.fillRect(0, 110, p.W, 30);
    },
    props: (g, v, f, layer) => wallProps(g, v, f, layer),
  });
  scene.add(wall);
  // mid: pool tables, lamps, bartender counter
  const TW = 2400;
  const mid = stripLayer({
    id: 'tables',
    factor: 0.6,
    W: TW,
    top: SEA_Y - 680,
    H: 520,
    res: 0.6,
    material: { base: '#4A2E1E', shade: '#2A1A10', detail: '#140C08', accent: CF.felt, glow: CF.lampPool, depth: 0.3 },
    paint: (p) => {
      const floor = p.H - 20;
      for (const tx of [300, 1300]) {
        // table: felt top in perspective strip, walnut rails, legs
        p.accent.fillRect(tx - 180, floor - 150, 360, 36);
        p.body.fillRect(tx - 196, floor - 118, 392, 40);
        p.detail.fillRect(tx - 196, floor - 158, 392, 8);
        p.rim.fillRect(tx - 196, floor - 158, 392, 3);
        for (const lx of [-170, 150]) p.body.fillRect(tx + lx, floor - 80, 22, 80);
        // soft light cone from the lamp (fades out toward the lamp and the edges)
        const cone = p.glow.createLinearGradient(0, floor - 460, 0, floor - 150);
        cone.addColorStop(0, 'rgba(255,255,255,0.02)');
        cone.addColorStop(1, 'rgba(255,255,255,0.28)');
        p.glow.fillStyle = cone;
        p.glow.beginPath();
        p.glow.moveTo(tx - 50, floor - 460);
        p.glow.lineTo(tx + 50, floor - 460);
        p.glow.lineTo(tx + 220, floor - 150);
        p.glow.lineTo(tx - 220, floor - 150);
        p.glow.closePath();
        p.glow.fill();
        p.glow.fillStyle = '#fff';
        p.glow.globalAlpha = 0.5;
        p.glow.beginPath();
        p.glow.ellipse(tx, floor - 150, 190, 16, 0, 0, TAU);
        p.glow.fill();
        p.glow.globalAlpha = 1;
        p.anchors.push({ kind: 'lamp', x: tx, y: p.top + floor - 470, s: 1 });
        p.anchors.push({ kind: 'felt', x: tx, y: p.top + floor - 150, s: 1 });
      }
      // the bar counter (bartender behind it)
      p.body.fillRect(1800, floor - 170, 560, 170);
      p.detail.fillRect(1790, floor - 186, 580, 18);
      p.rim.fillRect(1790, floor - 186, 580, 4);
      p.anchors.push({ kind: 'bartender', x: 2080, y: p.top + floor - 186, s: 1 });
    },
    props: (g, v, f, layer) => tableProps(g, v, f, layer),
  });
  scene.add(mid);
  const felt = mid.layer.anchors.filter((a) => a.kind === 'felt');
  scene.add(
    new LifeLayer({
      id: 'bar-life',
      factor: 0.6,
      depth: 0.3,
      wrapW: TW,
      pinned: [
        { kind: BRAWLERS, x: 800, y: SEA_Y - 200, s: 1 },
        { kind: PATRON, x: 1900, y: SEA_Y - 236, s: 0.9, dir: 1 },
        { kind: PATRON, x: 2230, y: SEA_Y - 236, s: 0.9, dir: -1 },
        { kind: PATRON, x: 560, y: SEA_Y - 200, s: 0.95, dir: -1 },
      ],
      rules: [
        { kind: BOTTLE, on: 'snare', chance: 0.4, y: SEA_Y - 340, from: 'view', max: 3 },
        { kind: POOL_BALL, on: 'piano', chance: 0.5, y: felt.length ? felt[0].y - 20 : SEA_Y - 300, from: 'view', max: 4 },
      ],
    }),
  );
  scene.add({ id: 'bar-front', pass: 'front', draw: (g, cam, f) => frontProps(g, cam, f) });
  return scene;
}

function neonSign(g: Ctx, x: number, y: number, text: string, colHex: string, on: number, L: Lighting, d: number) {
  g.save();
  g.font = `italic 44px ${SIGN_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = css(lit(L, H('#140C08'), 0.4, d), 0.85);
  g.strokeText(text, x, y);
  g.fillStyle = css(atmos(L, H(colHex), d * 0.3), 0.25 + on * 0.75);
  g.fillText(text, x, y);
  g.restore();
  drawGlow(g, x, y, colHex, 160, on * 0.4);
}

function wallProps(g: Ctx, v: import('../world/camera').LayerView, f: SceneFrame, layer: import('../world/tiledLayer').TiledLayer) {
  const L = f.L;
  const b = f.b;
  const kick = hit(b, 'kick', 0.12);
  layer.eachAnchor(v, 'sign', 400, (a, x) => {
    const buzz = hash(Math.floor(b.time * 24) * 5 + a.x) < 0.05 * (1 + hit(b, 'hat', 0.05) * 5) ? 0.3 : 1;
    const on = Math.min(1, (0.5 + 0.5 * L.lamps) * buzz + kick * 0.3);
    neonSign(g, x, a.y, SIGNS[a.s % SIGNS.length], a.s % 2 ? CF.neonJade : CF.neonRose, on, L, 0.45);
  });
  layer.eachAnchor(v, 'jukebox', 300, (a, x) => {
    // jukebox: arched top, bubble tubes pulse on the beat
    const p = Math.exp(-b.beatPhase * 4);
    g.fillStyle = css(lit(L, H('#6A3A2A'), 0.7, 0.45));
    g.beginPath();
    g.moveTo(x - 60, a.y);
    g.lineTo(x - 60, a.y - 150);
    g.arc(x, a.y - 150, 60, Math.PI, 0);
    g.lineTo(x + 60, a.y);
    g.closePath();
    g.fill();
    const cols = [CF.neonRose, CF.bulb, CF.neonJade];
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = css(atmos(L, H(cols[i]), 0.2), 0.4 + 0.6 * p);
      g.lineWidth = 6;
      g.beginPath();
      g.arc(x, a.y - 150, 48 - i * 12, Math.PI, 0);
      g.stroke();
    }
    drawGlow(g, x, a.y - 150, CF.bulb, 140, 0.3 + 0.4 * p);
    // little music notes rise on the beat
    g.fillStyle = css(atmos(L, H(CF.cream), 0.3), 0.7);
    for (let i = 0; i < 3; i++) {
      const u = (b.beatPhase + i / 3) % 1;
      g.beginPath();
      g.ellipse(x - 30 + i * 30 + Math.sin(u * 6) * 10, a.y - 220 - u * 80, 5, 4, -0.4, 0, TAU);
      g.fill();
      g.fillRect(x - 26 + i * 30 + Math.sin(u * 6) * 10, a.y - 240 - u * 80, 2, 20);
    }
  });
}

function tableProps(g: Ctx, v: import('../world/camera').LayerView, f: SceneFrame, layer: import('../world/tiledLayer').TiledLayer) {
  const L = f.L;
  const b = f.b;
  // balls rolling across the felt on the bass
  const bass = hit(b, 'bass', 0.25);
  layer.eachAnchor(v, 'felt', 400, (a, x) => {
    for (let i = 0; i < 4; i++) {
      const u = ((b.beat * 0.25 + i * 0.27 + hash(a.x) * 0.5) % 1) * 2 - 1;
      const bx = x + u * 150;
      const col = mix(H(['#D0C8B8', '#3A4A7A', '#6A2A4A', '#1A1410'][i]), H('#8A8078'), 0.35);
      g.fillStyle = css(lit(L, col, 0.9, 0.3));
      g.beginPath();
      g.arc(bx, a.y + 10 - bass * 3, 8, 0, TAU);
      g.fill();
    }
  });
  // bartender polishes a glass on the beat
  layer.eachAnchor(v, 'bartender', 300, (a, x) => {
    const p = Math.sin(b.beat * Math.PI) * 10;
    g.fillStyle = css(lit(L, H('#E8E0CC'), 0.8, 0.3));
    g.beginPath();
    g.moveTo(x - 22, a.y);
    g.lineTo(x + 22, a.y);
    g.lineTo(x + 18, a.y - 60);
    g.quadraticCurveTo(x, a.y - 68, x - 18, a.y - 60);
    g.closePath();
    g.fill();
    g.fillStyle = css(lit(L, H('#1A1410'), 0.5, 0.3));
    g.fillRect(x - 6, a.y - 60, 12, 30);
    g.fillStyle = css(lit(L, H('#B08868'), 0.8, 0.3));
    g.beginPath();
    g.arc(x, a.y - 80, 13, 0, TAU);
    g.fill();
    g.fillStyle = css(lit(L, H('#1A1410'), 0.5, 0.3));
    g.fillRect(x - 12, a.y - 92, 24, 6);
    g.fillStyle = css(atmos(L, H('#CFE8F0'), 0.3), 0.8);
    g.fillRect(x + 20 + p, a.y - 40, 10, 16);
  });
}

function frontProps(g: Ctx, cam: ArtCamera, f: SceneFrame) {
  const L = f.L;
  const b = f.b;
  const v = layerView(cam, 1.3);
  pushLayer(g, v);
  // hanging green-shade lamps swinging on the shuffle
  const hat = hit(b, 'hat', 0.1);
  for (let k = Math.floor(v.x0 / 900) - 1; k <= Math.floor(v.x1 / 900); k++) {
    const x = k * 900 + 300;
    const topY = v.y0;
    const sw = Math.sin(b.beat * Math.PI + k) * 0.08 * (0.5 + hat);
    const lx = x + Math.sin(sw) * 160;
    const ly = topY + 160;
    g.strokeStyle = css(lit(L, H('#141010'), 0.3));
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, topY);
    g.lineTo(lx, ly);
    g.stroke();
    g.fillStyle = css(lit(L, H(CF.felt), 0.7));
    g.beginPath();
    g.moveTo(lx - 50, ly + 34);
    g.quadraticCurveTo(lx, ly - 20, lx + 50, ly + 34);
    g.closePath();
    g.fill();
    g.fillStyle = css(atmos(L, H(CF.lampPool)), 0.5 + 0.5 * L.lamps);
    g.fillRect(lx - 40, ly + 30, 80, 6);
    drawGlow(g, lx, ly + 40, CF.lampPool, 180, 0.35 * L.lamps);
  }
  // smoke layers drifting
  const smoke = css(atmos(L, H(CF.smoke)));
  for (let i = 0; i < 4; i++) {
    const x = ((hash(i) * 3000 + b.time * (18 + i * 7)) % 3000) + Math.floor(v.x0 / 3000) * 3000;
    drawGlow(g, x, v.y0 + (0.25 + hash(i + 3) * 0.3) * (v.y1 - v.y0), smoke, 420, 0.12, false);
  }
  g.restore();
}

// ------------------------------------------------------------------------------ bar floor (play layer)

let floorBake: TintBake | null = null;
const SEG = 512;
const SEG_H = 280;

function barFloorBake(): TintBake {
  if (floorBake) return floorBake;
  // 0 planks, 1 plank gaps/shade, 2 ink, 3 highlight (varnish), 4 brass rail
  const b = new TintBake(SEG, SEG_H + 24, 5);
  const [pl, sh, ink, hi, br] = [0, 1, 2, 3, 4].map((i) => b.ch(i));
  for (const c of [pl, sh, ink, hi, br]) c.translate(0, 24);
  const r = rng(12);
  // top floorboards seen edge-on (walkable top), then the dark underfloor with joists
  pl.fillRect(0, -2, SEG, 26);
  for (let x = 0; x < SEG; x += 96 + Math.floor(r() * 3) * 16) ink.fillRect(x, -2, 2, 26);
  hi.globalAlpha = 0.85;
  hi.fillRect(0, -2, SEG, 4);
  hi.globalAlpha = 0.4;
  for (let i = 0; i < 6; i++) hi.fillRect(r() * SEG, 6 + r() * 12, 30 + r() * 60, 1.5);
  hi.globalAlpha = 1;
  ink.fillRect(0, 22, SEG, 6);
  ink.fillRect(0, -5, SEG, 3);
  // underfloor: dark boards + joists + a brass kick rail
  sh.fillRect(0, 28, SEG, SEG_H);
  for (let x = 20; x < SEG; x += 128) pl.fillRect(x, 28, 30, SEG_H);
  br.fillRect(0, 40, SEG, 6);
  const gr = sh.createLinearGradient(0, 28, 0, SEG_H);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  ink.fillStyle = gr;
  ink.fillRect(0, 28, SEG, SEG_H);
  floorBake = b;
  return b;
}

/** Varnished bar floorboards + dark underfloor with a brass rail. rect.y = walkable surface. */
export function drawBarFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting }): void {
  const L = style.light;
  const b = barFloorBake();
  b.compose([
    css(lit(L, H('#8A5A36'), 0.95)),
    css(lit(L, H('#2A1A10'), 0.35)),
    CF.filmBlack,
    css(mix(lit(L, H('#E8B880'), 1.05), L.rim, 0.3 * L.rimAmt)),
    css(lit(L, H('#B8923A'), 0.9)),
  ]);
  const hTop = Math.min(rect.h + 24, SEG_H + 24);
  let x = rect.x;
  const x1 = rect.x + rect.w;
  while (x < x1) {
    const idx = Math.floor(x / SEG);
    const sx = x - idx * SEG;
    const w = Math.min(SEG - sx, x1 - x);
    g.drawImage(b.out, sx * b.res, 0, w * b.res, hTop * b.res, x, rect.y - 24, w, hTop);
    x += w;
  }
  g.fillStyle = CF.filmBlack;
  g.fillRect(rect.x - 3, rect.y - 5, 6, rect.h + 5);
  g.fillRect(x1 - 3, rect.y - 5, 6, rect.h + 5);
}

export type { BeatInfo };
