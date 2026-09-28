/**
 * ACT 3a — THE POOL ROOM (the breakdown valley, bars 61-64): green felt under swinging lamps, cigarette smoke in the
 * light cones, jukeboxes that BOOM on the stomp, goons leaning over the tables taking shots on the kick.
 * Light key 'poolroom' (felt-green lamp pools).
 *
 * Layers: room fill · back wall (0.32): green damask, walnut wainscot, cue racks, framed fight posters, a bead-wire
 * score abacus, the BILLIARDS script neon · mid (0.6): background tables under green-shade lamps (light cones), players
 * leaning in and shooting on the kick, balls rolling on the bass, JUKEBOXES (bubble tubes, BOOM on the kick) · front
 * (1.25): lamp shades swinging at the top of the frame on the hats, smoke banks drifting.
 *
 * Play layer: drawFeltFloor(g, rect, style) — the floors ARE pool tables: felt bed, walnut cushion rail with diamond
 * sights, pockets at the ends, turned legs. drawBench (the see-saw launch), drawBarBell, drawBallRack, drawJukebox.
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { drawGlow } from '../core/draw';
import { TAU, hash, rng } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, SEA_Y, VIEW_H, VIEW_W, type LayerView, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, stripLayer } from '../world/parallax';
import type { TiledLayer } from '../world/tiledLayer';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const INK = CF.filmBlack;
export const FELT = { felt: '#1F6B45', shadow: '#0E3A26', lamp: '#F6E7B0', walnut: '#5A3A26', smoke: '#8C8A7A', shade: '#2F7A52' } as const;

export function makePoolRoom(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  scene.add({
    id: 'pool-room',
    pass: 'back',
    draw: (g, _cam, f) => {
      const gr = g.createLinearGradient(0, 0, 0, VIEW_H);
      gr.addColorStop(0, css(lit(f.L, H('#0A140E'), 0.5, 0.2)));
      gr.addColorStop(1, css(lit(f.L, H('#16261C'), 0.6, 0.2)));
      g.fillStyle = gr;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    },
  });
  scene.add(
    stripLayer({
      id: 'pool-wall',
      factor: 0.32,
      W: 2800,
      top: -1100,
      H: 1200,
      res: 0.45,
      material: { base: '#1E3A2A', shade: '#122418', detail: '#0A140E', accent: '#5A3A26', glow: '#F6E7B0', depth: 0.35 },
      paint: (p) => {
        const r = rng(611);
        const floor = p.H - 40;
        p.body.fillRect(0, 0, p.W, p.H);
        // damask: rows of diamonds
        p.detail.globalAlpha = 0.35;
        for (let y = 140; y < floor - 330; y += 70)
          for (let x = (y / 70) % 2 ? 0 : 35; x < p.W; x += 70) {
            p.detail.beginPath();
            p.detail.moveTo(x, y - 18);
            p.detail.lineTo(x + 12, y);
            p.detail.lineTo(x, y + 18);
            p.detail.lineTo(x - 12, y);
            p.detail.fill();
          }
        p.detail.globalAlpha = 1;
        // walnut wainscot + rail
        p.accent.fillRect(0, floor - 320, p.W, 320);
        p.detail.fillRect(0, floor - 330, p.W, 12);
        p.rim.fillRect(0, floor - 332, p.W, 3);
        for (let x = 60; x < p.W; x += 180) p.shadeL.fillRect(x, floor - 300, 120, 260);
        // cue racks: rows of cues standing in a rack
        for (const cx of [300, 1500, 2350]) {
          p.accent.fillRect(cx - 120, floor - 760, 240, 18);
          p.accent.fillRect(cx - 120, floor - 420, 240, 24);
          for (let i = 0; i < 11; i++) {
            p.detail.fillRect(cx - 110 + i * 22, floor - 790, 6, 390);
            p.rim.fillRect(cx - 110 + i * 22, floor - 790, 2, 390);
          }
        }
        // framed fight posters + a chalkboard
        for (const [x, w, h] of [
          [760, 220, 300],
          [1080, 180, 240],
          [1950, 240, 300],
        ] as [number, number, number][]) {
          p.detail.fillRect(x - 8, floor - 780 - 8, w + 16, h + 16);
          p.accent.fillRect(x, floor - 780, w, h);
          p.anchors.push({ kind: 'poster', x: x + w / 2, y: p.top + floor - 780 + h / 2, s: Math.floor(r() * 3) });
        }
        // bead-wire score abacus across the wall
        p.anchors.push({ kind: 'abacus', x: 1400, y: p.top + floor - 900, s: 0 });
        p.anchors.push({ kind: 'script', x: 700, y: p.top + floor - 980, s: 0 });
        p.detail.fillRect(0, 0, p.W, 100);
      },
      props: (g, v, f, layer) => wallProps(g, v, f, layer),
    }),
  );
  // background tables + lamps + players + jukeboxes
  scene.add({ id: 'pool-tables', pass: 'back', draw: (g, cam, f) => tables(g, cam, f) });
  // front: swinging lamp shades + smoke banks
  scene.add({ id: 'pool-front', pass: 'front', draw: (g, cam, f) => front(g, cam, f) });
  return scene;
}

function wallProps(g: Ctx, v: LayerView, f: SceneFrame, layer: TiledLayer): void {
  const L = f.L;
  const b = f.b;
  layer.eachAnchor(v, 'poster', 200, (a, x) => {
    g.font = `italic 44px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = css(lit(L, H('#E9D8B4'), 0.9, 0.35));
    g.fillText(['FATS vs', 'THE KID', '9-BALL'][a.s], x, a.y - 60);
    g.fillText(['SLIM?', 'TONITE', 'CHAMPS'][a.s], x, a.y + 60);
    g.beginPath();
    g.arc(x, a.y, 34, 0, TAU);
    g.fillStyle = css(lit(L, H('#1A1410'), 0.9, 0.35));
    g.fill();
    g.fillStyle = css(lit(L, H('#E9D8B4'), 0.9, 0.35));
    g.beginPath();
    g.arc(x, a.y, 14, 0, TAU);
    g.fill();
  });
  layer.eachAnchor(v, 'abacus', 900, (a, x) => {
    // score beads slide one notch on every stomp
    g.strokeStyle = css(lit(L, H('#8C7440'), 0.9, 0.35));
    g.lineWidth = 3;
    for (let w = 0; w < 2; w++) {
      g.beginPath();
      g.moveTo(x - 700, a.y + w * 40);
      g.lineTo(x + 700, a.y + w * 40);
      g.stroke();
      const n = Math.floor(b.beat) % 16;
      for (let i = 0; i < 16; i++) {
        const side = i < n ? -1 : 1;
        const bx = x + side * (560 - (side < 0 ? i : 15 - i) * 26);
        g.fillStyle = css(lit(L, H(i % 2 ? '#C9A070' : '#6A4428'), 0.9, 0.3));
        g.beginPath();
        g.ellipse(bx, a.y + w * 40, 12, 10, 0, 0, TAU);
        g.fill();
      }
    }
  });
  layer.eachAnchor(v, 'script', 700, (a, x) => {
    const on = Math.min(1, (hash(Math.floor(b.time * 20)) < 0.05 ? 0.4 : 1) * (0.75 + 0.25 * hit(b, 'kick', 0.14)));
    g.font = `italic 92px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(6,12,8,0.9)';
    g.strokeText('BILLIARDS', x, a.y);
    g.fillStyle = css(mix(H(CF.neonJade), [255, 255, 255], 0.2), on * (0.35 + 0.65 * L.lamps));
    g.fillText('BILLIARDS', x, a.y);
    drawGlow(g, x, a.y, CF.neonJade, 420, 0.3 * on * L.lamps);
  });
}

const TP = 1700;

function tables(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const v = layerView(cam, 0.6);
  const L = f.L;
  const b = f.b;
  const kick = hit(b, 'kick', 0.14);
  pushLayer(g, v);
  const floorY = SEA_Y - 170;
  for (let k = Math.floor(v.x0 / TP) - 1; k <= Math.floor(v.x1 / TP) + 1; k++) {
    const x = k * TP + 300;
    const seed = k * 7 + 3;
    // lamp cone from the ceiling onto the table
    const lx = x + 200;
    const ly = floorY - 560;
    const swing = Math.sin(b.beat * Math.PI * 0.5 + seed) * 10;
    const cone = g.createLinearGradient(0, ly, 0, floorY - 120);
    cone.addColorStop(0, css(H(FELT.lamp), 0.28 * L.lamps));
    cone.addColorStop(1, css(H(FELT.lamp), 0.02));
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(lx + swing - 50, ly);
    g.lineTo(lx + swing + 50, ly);
    g.lineTo(lx + swing * 3 + 330, floorY - 120);
    g.lineTo(lx + swing * 3 - 330, floorY - 120);
    g.closePath();
    g.fill();
    // the table (dark walnut + lit felt)
    g.fillStyle = css(lit(L, H('#2A1A10'), 0.7, 0.3));
    g.fillRect(x - 120, floorY - 150, 640, 50);
    for (const lxx of [x - 90, x + 200, x + 460]) g.fillRect(lxx, floorY - 100, 30, 100);
    g.fillStyle = css(lit(L, H(FELT.felt), 1.1, 0.25));
    g.fillRect(x - 108, floorY - 158, 616, 16);
    drawGlow(g, lx + swing * 3, floorY - 150, FELT.lamp, 360, 0.18 * L.lamps);
    // balls on the felt, rolling on the bass
    for (let i = 0; i < 5; i++) {
      const bx = x - 60 + ((hash(seed + i) * 520 + b.beat * 20 * (hash(seed + i + 9) - 0.5)) % 520 + 520) % 520;
      g.fillStyle = i === 0 ? '#E9E2D0' : css(lit(L, H(['#C9A040', '#3A5AA0', '#8A2A3A', '#1A1410'][i % 4]), 1, 0.2));
      g.beginPath();
      g.arc(bx, floorY - 164, 9, 0, TAU);
      g.fill();
    }
    // a player leaning in, shooting on the kick (silhouette)
    const px = x + 560;
    const lean = 0.4 + 0.15 * Math.sin(b.beat * Math.PI);
    const thrust = kick * 40;
    g.fillStyle = css(lit(L, H('#0E1410'), 0.6, 0.3));
    g.save();
    g.translate(px, floorY);
    g.beginPath();
    g.moveTo(-26, 0);
    g.lineTo(-18, -110);
    g.lineTo(18, -110);
    g.lineTo(26, 0);
    g.fill();
    g.rotate(-lean);
    g.beginPath();
    g.ellipse(0, -150, 32, 50, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(0, -212, 20, 0, TAU);
    g.fill();
    g.restore();
    g.strokeStyle = css(lit(L, H('#8A6A4F'), 0.8, 0.3));
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(px + 40 - thrust, floorY - 110);
    g.lineTo(px - 230 - thrust, floorY - 168);
    g.stroke();
    // lamp: green shade + bulb
    g.strokeStyle = 'rgba(8,12,8,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(lx, v.y0 - 20);
    g.lineTo(lx + swing, ly - 30);
    g.stroke();
    g.fillStyle = css(lit(L, H(FELT.shade), 0.9, 0.2));
    g.beginPath();
    g.moveTo(lx + swing - 60, ly);
    g.quadraticCurveTo(lx + swing, ly - 60, lx + swing + 60, ly);
    g.closePath();
    g.fill();
    drawGlow(g, lx + swing, ly + 4, FELT.lamp, 80, 0.5 * L.lamps);
    // JUKEBOX every other table: bubble tubes + a BOOM on the kick
    if (k % 2 === 0) drawJukebox(g, x + 980, floorY, 1, L, b, seed);
  }
  g.restore();
}

/** a Wurlitzer-style jukebox (background or play prop): arched top, bubble tubes, speaker grille that BOOMS on the kick */
export function drawJukebox(g: Ctx, x: number, floorY: number, k: number, L: Lighting, b: BeatInfo, seed = 0): void {
  const boom = hit(b, 'kick', 0.16);
  const s = k * (1 + 0.04 * boom);
  g.save();
  g.translate(x, floorY);
  g.scale(s, s);
  g.beginPath();
  g.moveTo(-90, 0);
  g.lineTo(-90, -200);
  g.arc(0, -200, 90, Math.PI, 0);
  g.lineTo(90, 0);
  g.closePath();
  g.fillStyle = css(lit(L, H('#5A3A26'), 0.9, 0.2));
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.stroke();
  // bubble tubes (arch)
  const tube = css(mix(H('#E0569B'), [255, 255, 255], 0.2), 0.5 + 0.5 * L.lamps);
  g.lineWidth = 12;
  g.strokeStyle = tube;
  g.beginPath();
  g.arc(0, -200, 72, Math.PI, 0);
  g.stroke();
  g.strokeStyle = css(H(CF.neonJade), 0.5 + 0.5 * L.lamps);
  g.beginPath();
  g.moveTo(-72, -200);
  g.lineTo(-72, -30);
  g.moveTo(72, -200);
  g.lineTo(72, -30);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 8; i++) {
    const u = (b.time * 0.6 + hash(i + seed)) % 1;
    g.beginPath();
    g.arc(i % 2 ? 72 : -72, -30 - u * 170, 3, 0, TAU);
    g.fill();
  }
  // record window + grille
  g.fillStyle = css(lit(L, H('#F6E7B0'), 1, 0.1), 0.85);
  g.fillRect(-50, -230, 100, 60);
  g.fillStyle = INK;
  g.beginPath();
  g.arc(0, -200, 22, 0, TAU);
  g.fill();
  g.fillStyle = css(lit(L, H('#2A1A10'), 0.8, 0.2));
  g.fillRect(-56, -140, 112, 110);
  g.strokeStyle = css(lit(L, H('#C9A070'), 0.9, 0.2));
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.moveTo(-50, -130 + i * 18);
    g.lineTo(50, -130 + i * 18);
    g.stroke();
  }
  g.restore();
  if (boom > 0.05) {
    drawGlow(g, x, floorY - 150 * k, '#E0569B', 220 * k, 0.35 * boom * L.lamps);
    g.strokeStyle = `rgba(255,233,194,${0.5 * boom})`;
    g.lineWidth = 4;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(x, floorY - 90 * k, (80 + (1 - boom) * 120 + i * 40) * k, -2.4, -0.7);
      g.stroke();
    }
  }
}

function front(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const L = f.L;
  const b = f.b;
  const v = layerView(cam, 1.25);
  pushLayer(g, v);
  const P = 1400;
  for (let k = Math.floor(v.x0 / P) - 1; k <= Math.floor(v.x1 / P) + 1; k++) {
    const x = k * P + 500;
    const sw = Math.sin(b.beat * Math.PI * 0.5 + k) * 0.08 + hit(b, 'hat', 0.1) * 0.02;
    const top = v.y0 - 20;
    g.save();
    g.translate(x, top);
    g.rotate(sw);
    g.strokeStyle = INK;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, 120);
    g.stroke();
    g.fillStyle = css(lit(L, H('#1E4A32'), 0.7, 0.05));
    g.beginPath();
    g.moveTo(-110, 190);
    g.quadraticCurveTo(0, 90, 110, 190);
    g.closePath();
    g.fill();
    g.lineWidth = 5;
    g.stroke();
    drawGlow(g, 0, 196, FELT.lamp, 120, 0.4 * L.lamps);
    g.restore();
  }
  g.restore();
  // smoke banks drifting through the light (screen space, soft)
  for (let i = 0; i < 5; i++) {
    const x = ((hash(i) * VIEW_W + b.time * (14 + i * 4) - cam.x * 0.2) % (VIEW_W + 1000) + VIEW_W + 1000) % (VIEW_W + 1000) - 500;
    drawGlow(g, x, VIEW_H * (0.2 + hash(i + 7) * 0.35), css(lit(L, H(FELT.smoke), 1, 0.2)), 420, 0.06 + 0.06 * L.fog, false);
  }
}

// ------------------------------------------------------------------ play layer

/** the floors ARE pool tables: felt bed, walnut cushion rail with diamond sights, corner pockets, turned legs */
export function drawFeltFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }): void {
  const L = style.light;
  const { x, y, w } = rect;
  const hh = Math.min(rect.h, 1600);
  // walnut rail (the top 22 px) with diamond sights
  g.fillStyle = css(lit(L, H(FELT.walnut), 1, 0));
  g.fillRect(x, y, w, 26);
  g.fillStyle = css(lit(L, H('#8A5A36'), 1.1, 0));
  g.fillRect(x, y + 2, w, 5);
  g.fillStyle = CF.bulb;
  for (let px = Math.ceil(x / 96) * 96; px < x + w; px += 96) {
    g.beginPath();
    g.moveTo(px, y + 10);
    g.lineTo(px + 6, y + 15);
    g.lineTo(px, y + 20);
    g.lineTo(px - 6, y + 15);
    g.fill();
  }
  // felt apron (the table's side cloth) + lamp pools on it
  g.fillStyle = css(lit(L, H(FELT.felt), 0.95, 0));
  g.fillRect(x, y + 26, w, 40);
  g.fillStyle = css(lit(L, H(FELT.shadow), 0.8, 0));
  g.fillRect(x, y + 58, w, 8);
  // the cabinet + turned legs under it, into the dark
  const body = g.createLinearGradient(0, y + 66, 0, y + 400);
  body.addColorStop(0, css(lit(L, H('#3A2418'), 0.9, 0)));
  body.addColorStop(1, '#070504');
  g.fillStyle = body;
  g.fillRect(x, y + 66, w, 110);
  g.fillStyle = '#070504';
  g.fillRect(x, y + 176, w, hh - 176);
  g.fillStyle = css(lit(L, H('#2A1A10'), 0.8, 0));
  for (let px = Math.ceil((x + 60) / 420) * 420; px < x + w - 40; px += 420) {
    g.beginPath();
    g.moveTo(px - 26, y + 176);
    g.quadraticCurveTo(px - 42, y + 240, px - 16, y + 330);
    g.lineTo(px + 16, y + 330);
    g.quadraticCurveTo(px + 42, y + 240, px + 26, y + 176);
    g.closePath();
    g.fill();
  }
  // corner pockets at the table's ends (brass-trimmed leather)
  for (const [px, cap] of [
    [x + 14, style.capL !== false],
    [x + w - 14, style.capR !== false],
  ] as [number, boolean][]) {
    if (!cap) continue;
    g.fillStyle = INK;
    g.beginPath();
    g.arc(px, y + 20, 16, 0, TAU);
    g.fill();
    g.strokeStyle = CF.gold === '#E0B64A' ? '#8C7440' : '#8C7440';
    g.lineWidth = 4;
    g.stroke();
  }
  // walkable-top rule
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(x - 6, y - 5, 6, hh + 5);
  if (style.capR !== false) g.fillRect(x + w, y - 5, 6, hh + 5);
}

/** BENCH SEE-SAW (a launch skin): a walnut bench on a pivot with a racked 8-ball on its raised end. kick = 1 on launch */
export function drawBench(g: Ctx, cx: number, y: number, w: number, kick: number, L: Lighting): void {
  const tilt = -0.22 + kick * 0.5;
  g.save();
  g.translate(cx, y - 26);
  // pivot trestle
  g.fillStyle = css(lit(L, H('#3A2418'), 0.9, 0));
  g.beginPath();
  g.moveTo(-26, 26);
  g.lineTo(0, -6);
  g.lineTo(26, 26);
  g.closePath();
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = INK;
  g.stroke();
  g.rotate(tilt);
  // the plank
  g.beginPath();
  g.rect(-w / 2, -16, w, 18);
  g.fillStyle = css(lit(L, H('#8A5A36'), 1, 0));
  g.fill();
  g.lineWidth = 6;
  g.stroke();
  g.fillStyle = css(lit(L, H('#5A3A26'), 1, 0));
  g.fillRect(-w / 2, -2, w, 4);
  // walkable top on the plank
  g.fillStyle = '#F4EFE2';
  g.fillRect(-w / 2, -19, w, 3);
  // chalk up-chevrons
  g.strokeStyle = 'rgba(228,238,242,0.8)';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(w / 2 - 50, -36);
  g.lineTo(w / 2 - 30, -52);
  g.lineTo(w / 2 - 10, -36);
  g.stroke();
  g.restore();
}

/** a brass BAR BELL on a wall bracket (reward target, r ~ 30) */
export function drawBarBell(g: Ctx, r: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  g.fillStyle = INK;
  g.fillRect(-30, -44, 60, 8);
  g.fillRect(-4, -44, 8, 14);
  g.beginPath();
  g.moveTo(-8, -32);
  g.quadraticCurveTo(-26, -24, -26, 10);
  g.lineTo(-34, 22);
  g.lineTo(34, 22);
  g.lineTo(26, 10);
  g.quadraticCurveTo(26, -24, 8, -32);
  g.closePath();
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.stroke();
  const gr = g.createLinearGradient(-30, 0, 30, 0);
  gr.addColorStop(0, '#8A6A1E');
  gr.addColorStop(0.35, '#FFE08A');
  gr.addColorStop(1, '#8A6A1E');
  g.fillStyle = gr;
  g.fill();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(0, 26, 7, 0, TAU);
  g.fill();
  g.restore();
}

/** a racked TRIANGLE of pool balls in a wooden rack (reward target, r ~ 30) */
export function drawBallRack(g: Ctx, r: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  const cols = ['#E0B64A', '#2A4A9A', '#B3201B', '#5A2A7A', '#E07A1A', '#1F6B45', '#7A2A1A', '#1A1410', '#E0B64A', '#2A4A9A'];
  let i = 0;
  for (let row = 0; row < 4; row++)
    for (let c = 0; c <= row; c++) {
      const bx = (c - row / 2) * 17;
      const by = -26 + row * 15;
      // pool colours but keep danger red / tangerine OUT of the reward target: remap them to gold / fig
      const col = cols[i++ % cols.length].replace('#B3201B', '#8A4A76').replace('#E07A1A', '#C9A040');
      g.beginPath();
      g.arc(bx, by, 8.5, 0, TAU);
      g.fillStyle = col;
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = INK;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath();
      g.arc(bx - 3, by - 3, 2.2, 0, TAU);
      g.fill();
    }
  g.beginPath();
  g.moveTo(0, -42);
  g.lineTo(-36, 28);
  g.lineTo(36, 28);
  g.closePath();
  g.lineWidth = 7;
  g.strokeStyle = INK;
  g.stroke();
  g.lineWidth = 4;
  g.strokeStyle = '#8A5A36';
  g.stroke();
  g.restore();
}
