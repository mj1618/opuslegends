/**
 * ACT 2b — THE BLACKLIGHT LANES: a bowling alley under UV, inside the Jimperial (chorus 3).
 *
 *   const lanes = makeLanes(lightingDirector);   // light keys 'blacklight' -> 'blacklightHot' (the chorus)
 *   lanes.drawBack(ctx, cam, beat); ...play layer (drawLanesFloor)...; lanes.drawFront(ctx, cam, beat);
 *
 * Layers: the room (UV black) · back wall (0.35): cosmic UV carpet print, glowing posters (planet, lightning,
 * pins, "STRIKE!"), lane-number boards + score monitors blinking on the beat, the BOWL-O-RAMA script neon ·
 * disco-ball light spots sweeping the walls (turn on the bar, flare on the kick) · mid (0.6): the pin decks —
 * racks of glowing pins in their triangles under the masking hoods, the sweep bar drops on the kick and the pins
 * jump on the snare, ball returns with balls rolling up on the bass · front (1.05): the mirror ball itself,
 * glinting on the hats · UV haze.
 *
 *   drawLanesFloor(g, rect, style)   the lane you run on: lacquered maple under UV, glowing guide arrows +
 *                                    dots, glowing gutter trim (the walkable top keeps the cream lip)
 *   drawRollingBall(g, x, y, r, rot, L, b)   a rolling bowling ball (STUMBLE threat: dark ball, red finger
 *                                    holes = the only red, a rumble trail)
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { drawGlow } from '../core/draw';
import { TAU, hash, rng } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, SEA_Y, VIEW_H, VIEW_W, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, stripLayer } from '../world/parallax';
import { type JammerColours, drawJammer } from './jammers';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
export const UV = { violet: '#2A1650', black: '#120C1E', cyan: '#3FF0E0', pink: '#E04BD0', gloss: '#B9A0E0' } as const;

export function makeLanes(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  scene.add({
    id: 'lanes-room',
    pass: 'back',
    draw: (g, _cam, f) => {
      const gr = g.createLinearGradient(0, 0, 0, VIEW_H);
      gr.addColorStop(0, css(lit(f.L, H('#1A1030'), 0.5, 0.3)));
      gr.addColorStop(1, css(lit(f.L, H('#34205A'), 0.7, 0.3)));
      g.fillStyle = gr;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    },
  });
  const WW = 2800;
  const wall = stripLayer({
    id: 'lanes-wall',
    factor: 0.35,
    W: WW,
    top: -1100,
    H: 1250,
    res: 0.45,
    material: { base: '#2A1A48', shade: '#1A1030', detail: '#0E0818', accent: '#3A2460', glow: UV.cyan, depth: 0.4 },
    paint: (p) => {
      const r = rng(81);
      const floor = p.H - 60;
      p.body.fillRect(0, 0, p.W, p.H);
      // cosmic carpet print (UV): rings, stars, squiggles
      for (let i = 0; i < 260; i++) {
        const x = r() * p.W;
        const y = r() * (floor - 300) + 140;
        const k = r();
        p.glow.globalAlpha = 0.22 + r() * 0.25;
        if (k < 0.35) {
          p.glow.lineWidth = 3;
          p.glow.strokeStyle = '#fff';
          p.glow.beginPath();
          p.glow.arc(x, y, 6 + r() * 12, 0, TAU);
          p.glow.stroke();
        } else if (k < 0.7) {
          p.glow.fillStyle = '#fff';
          p.glow.beginPath();
          for (let s = 0; s < 8; s++) {
            const a = (s / 8) * TAU;
            const rr = s % 2 ? 3 : 9;
            p.glow.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          p.glow.fill();
        } else {
          p.glow.lineWidth = 3;
          p.glow.strokeStyle = '#fff';
          p.glow.beginPath();
          p.glow.moveTo(x, y);
          p.glow.bezierCurveTo(x + 10, y - 14, x + 20, y + 14, x + 30, y);
          p.glow.stroke();
        }
      }
      p.glow.globalAlpha = 1;
      // dado rail + dark wainscot under the print
      p.detail.fillRect(0, floor - 300, p.W, 300);
      p.rim.fillRect(0, floor - 304, p.W, 4);
      p.glow.globalAlpha = 0.7;
      p.glow.fillRect(0, floor - 300, p.W, 3);
      p.glow.globalAlpha = 1;
      // lane-number boards + score monitors, one per lane
      for (let i = 0; i < 4; i++) {
        const x = 200 + i * 700;
        p.detail.fillRect(x - 110, 150, 220, 130);
        p.accent.fillRect(x - 100, 160, 200, 110);
        p.anchors.push({ kind: 'board', x, y: p.top + 215, s: i + 7 });
      }
      // posters
      for (let i = 0; i < 4; i++) p.anchors.push({ kind: 'poster', x: 550 + i * 700, y: p.top + 480, s: i });
      p.anchors.push({ kind: 'script', x: 1400, y: p.top + 70, s: 0 });
      // ceiling
      p.detail.fillRect(0, 0, p.W, 90);
    },
    props: (g, v, f, layer) => wallProps(g, v, f, layer),
  });
  scene.add(wall);
  // disco-ball light spots sweeping the walls
  scene.add({ id: 'lanes-spots', pass: 'back', draw: (g, cam, f) => spots(g, cam, f) });
  // the pin decks + ball returns (mid)
  const PW = 2400;
  const mid = stripLayer({
    id: 'lanes-decks',
    factor: 0.6,
    W: PW,
    top: SEA_Y - 700,
    H: 560,
    res: 0.5,
    material: { base: '#1E1234', shade: '#120A20', detail: '#08040E', accent: '#3A2A5A', glow: UV.cyan, depth: 0.28 },
    paint: (p) => {
      const floor = p.H - 30;
      // far lanes: glossy strips with glowing gutters
      p.accent.fillRect(0, floor - 40, p.W, 30);
      p.glow.globalAlpha = 0.55;
      p.glow.fillRect(0, floor - 42, p.W, 3);
      p.glow.fillRect(0, floor - 10, p.W, 3);
      p.glow.globalAlpha = 1;
      for (const dx of [400, 1600]) {
        // masking hood over the pin deck
        p.body.fillRect(dx - 240, floor - 330, 480, 170);
        p.detail.fillRect(dx - 250, floor - 340, 500, 14);
        p.rim.fillRect(dx - 250, floor - 340, 500, 3);
        p.glow.globalAlpha = 0.8;
        p.glow.fillRect(dx - 230, floor - 176, 460, 4);
        p.glow.globalAlpha = 1;
        // deck (dark) where the pins stand
        p.detail.fillRect(dx - 230, floor - 160, 460, 120);
        p.anchors.push({ kind: 'deck', x: dx, y: p.top + floor - 44, s: dx });
        // ball return hood
        p.body.fillRect(dx + 420, floor - 110, 150, 80);
        p.detail.fillRect(dx + 410, floor - 116, 170, 10);
        p.anchors.push({ kind: 'return', x: dx + 495, y: p.top + floor - 116, s: 1 });
      }
    },
    props: (g, v, f, layer) => deckProps(g, v, f, layer),
  });
  scene.add(mid);
  // THE BOWLERS: a crowd behind the rail dancing on the backbeat, arms up on the HEYs (they're the Lanes' audience)
  scene.add({ id: 'lanes-crowd', pass: 'back', draw: (g, cam, f) => bowlers(g, cam, f) });
  // disco-ball BEAMS: big coloured cones sweeping the room, bursting on the kick
  scene.add({ id: 'lanes-beams', pass: 'back', draw: (g, cam, f) => beams(g, cam, f) });
  scene.add({ id: 'lanes-front', pass: 'front', draw: (g, cam, f) => discoBall(g, cam, f) });
  scene.add({
    id: 'lanes-haze',
    pass: 'front',
    draw: (g, _cam, f) => {
      for (let i = 0; i < 3; i++) {
        const x = ((hash(i) * VIEW_W + f.b.time * (12 + i * 5)) % (VIEW_W + 900)) - 450;
        drawGlow(g, x, VIEW_H * (0.3 + hash(i + 7) * 0.3), i % 2 ? UV.pink : UV.cyan, 520, 0.05 + 0.04 * f.L.fog, true);
      }
    },
  });
  return scene;
}

function uv(L: Lighting, col: string, on = 1): string {
  // UV emissives ride the lamps scalar, never darkened by the key light
  return css(mix(H(col), [255, 255, 255], 0.08), Math.min(1, (0.35 + 0.65 * L.lamps) * on));
}

function wallProps(g: Ctx, v: import('../world/camera').LayerView, f: SceneFrame, layer: import('../world/tiledLayer').TiledLayer): void {
  const L = f.L;
  const b = f.b;
  const kick = hit(b, 'kick', 0.12);
  layer.eachAnchor(v, 'board', 300, (a, x) => {
    // lane number + a score monitor that blinks STRIKE-ish on the beat
    g.font = `bold 58px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = uv(L, UV.cyan, 0.8 + 0.2 * kick);
    g.fillText(String(a.s), x - 55, a.y);
    const on = Math.floor(b.beat) % 4 === (a.s % 4) ? 1 : 0.35;
    g.fillStyle = uv(L, UV.pink, on);
    g.fillRect(x - 10, a.y - 36, 96, 72);
    g.fillStyle = css(H(UV.black), 0.8);
    for (let i = 0; i < 3; i++) g.fillRect(x - 2 + i * 30, a.y - 26, 22, 52);
    g.fillStyle = uv(L, UV.cyan, on);
    g.font = `bold 34px ${SIGN_FONT}`;
    g.fillText(on > 0.5 ? 'X' : '/', x + 38, a.y + 2);
  });
  layer.eachAnchor(v, 'poster', 400, (a, x) => {
    const y = a.y;
    g.lineWidth = 5;
    g.strokeStyle = uv(L, a.s % 2 ? UV.pink : UV.cyan, 0.9);
    g.strokeRect(x - 90, y - 130, 180, 260);
    const pulse = 1 + 0.06 * kick;
    g.save();
    g.translate(x, y - 10);
    g.scale(pulse, pulse);
    if (a.s === 0) {
      // ringed planet
      g.fillStyle = uv(L, UV.pink, 0.9);
      g.beginPath();
      g.arc(0, 0, 50, 0, TAU);
      g.fill();
      g.strokeStyle = uv(L, UV.cyan, 1);
      g.lineWidth = 7;
      g.beginPath();
      g.ellipse(0, 0, 82, 20, -0.35, 0, TAU);
      g.stroke();
    } else if (a.s === 1) {
      // lightning bolt
      g.fillStyle = uv(L, '#F4F070', 0.9);
      g.beginPath();
      g.moveTo(10, -90);
      g.lineTo(-40, 10);
      g.lineTo(0, 10);
      g.lineTo(-18, 90);
      g.lineTo(44, -18);
      g.lineTo(4, -18);
      g.closePath();
      g.fill();
    } else if (a.s === 2) {
      // three pins
      for (const dx of [-45, 0, 45]) {
        g.fillStyle = uv(L, '#F4EFE2', 0.9);
        g.beginPath();
        g.ellipse(dx, 30, 18, 42, 0, 0, TAU);
        g.ellipse(dx, -30, 9, 20, 0, 0, TAU);
        g.fill();
        g.fillStyle = uv(L, UV.pink, 1);
        g.fillRect(dx - 9, -14, 18, 5);
      }
    } else {
      g.font = `italic 64px ${SIGN_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = uv(L, UV.cyan, 0.9);
      g.fillText('STRIKE!', 0, -20);
      g.fillStyle = uv(L, UV.pink, 0.9);
      g.fillText('SPARE?', 0, 50);
    }
    g.restore();
  });
  layer.eachAnchor(v, 'script', 900, (a, x) => {
    const buzz = hash(Math.floor(b.time * 24) + 3) < 0.04 * (1 + hit(b, 'hat', 0.05) * 5) ? 0.4 : 1;
    const on = Math.min(1, buzz * (0.75 + 0.25 * kick));
    g.font = `italic 96px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(8,4,14,0.9)';
    g.strokeText('BOWL-O-RAMA', x, a.y);
    g.fillStyle = uv(L, UV.pink, on);
    g.fillText('BOWL-O-RAMA', x, a.y);
    drawGlow(g, x, a.y, UV.pink, 420, 0.35 * on * L.lamps);
  });
}

function bowlers(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const v = layerView(cam, 0.72);
  const L = f.L;
  const b = f.b;
  const SP = 150;
  const floor = SEA_Y - 250;
  pushLayer(g, v);
  // the rail + a UV glow strip along it
  g.fillStyle = css(lit(L, H('#1E1234'), 0.8, 0.2));
  g.fillRect(v.x0 - 50, floor - 20, v.x1 - v.x0 + 100, 200);
  const cols = [UV.cyan, UV.pink, '#B9A0E0', '#F4F070', '#6A4AE0'];
  const heyUp = Math.max(hit(b, 'hey', 0.5), 0);
  for (let k = Math.floor(v.x0 / SP) - 1; k <= Math.floor(v.x1 / SP) + 1; k++) {
    const x = k * SP + (hash(k) - 0.5) * 50;
    const row = k % 2 ? 0 : 1;
    const s = 1.0 + hash(k + 3) * 0.25 - row * 0.12;
    const C: JammerColours = {
      body: css(lit(L, H('#140A22'), 0.5, 0.15)),
      skin: css(lit(L, H('#7A5A6A'), 0.6, 0.15)),
      rim: uv(L, cols[k % 5], 0.8),
      vest: uv(L, cols[(k + 2) % 5], 0.75),
    };
    drawJammer(g, x, floor - row * 26, s, Math.floor(hash(k * 5) * 5), b, C, k % 3 ? 1 : -1);
    if (heyUp > 0.05) {
      // arms (and a bowling pin) up on the HEY
      g.strokeStyle = C.rim;
      g.lineWidth = 7;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - 10, floor - row * 26 - 95 * s);
      g.lineTo(x - 22, floor - row * 26 - (95 + 60 * heyUp) * s);
      g.moveTo(x + 10, floor - row * 26 - 95 * s);
      g.lineTo(x + 22, floor - row * 26 - (95 + 60 * heyUp) * s);
      g.stroke();
    }
  }
  g.fillStyle = css(lit(L, H('#0E0818'), 0.8, 0.1));
  g.fillRect(v.x0 - 50, floor - 30, v.x1 - v.x0 + 100, 40);
  g.fillStyle = uv(L, UV.cyan, 0.85);
  g.fillRect(v.x0 - 50, floor - 34, v.x1 - v.x0 + 100, 5);
  g.fillStyle = uv(L, UV.pink, 0.6);
  g.fillRect(v.x0 - 50, floor + 4, v.x1 - v.x0 + 100, 3);
  g.restore();
}

function beams(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const b = f.b;
  const L = f.L;
  const v = layerView(cam, 1.05);
  const SP = 2600;
  const kick = hit(b, 'kick', 0.2);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const cols = [UV.cyan, UV.pink, '#F4F070', '#B9A0E0'];
  for (let k = Math.floor(v.x0 / SP) - 1; k <= Math.floor(v.x1 / SP) + 1; k++) {
    const bx = (k * SP + 900 - v.cx) * v.z + VIEW_W / 2;
    const by = (v.y0 + 110 - v.cy) * v.z + VIEW_H / 2;
    if (bx < -1600 || bx > VIEW_W + 1600) continue;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + Math.sin(b.beat * 0.4 + i * 1.3 + k) * 0.9;
      const len = 1500;
      const w = 0.07;
      const gr = g.createLinearGradient(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len);
      const c = cols[(i + Math.floor(b.beat)) % 4];
      gr.addColorStop(0, css(mix(H(c), [255, 255, 255], 0.2), (0.16 + 0.14 * kick) * L.lamps));
      gr.addColorStop(1, css(H(c), 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + Math.cos(a - w) * len, by + Math.sin(a - w) * len);
      g.lineTo(bx + Math.cos(a + w) * len, by + Math.sin(a + w) * len);
      g.closePath();
      g.fill();
    }
  }
  // UV floor fog glowing at the lane line
  const fy = VIEW_H / 2 + (SEA_Y - 170 - layerView(cam, 1).cy) * cam.zoom;
  const fg = g.createLinearGradient(0, fy - 260, 0, fy + 40);
  fg.addColorStop(0, 'rgba(120,60,200,0)');
  fg.addColorStop(1, `rgba(120,60,200,${0.16 + 0.1 * kick})`);
  g.fillStyle = fg;
  g.fillRect(0, fy - 260, VIEW_W, 300);
  g.restore();
}

function spots(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const b = f.b;
  const on = 0.5 + 0.5 * hit(b, 'kick', 0.15);
  const rot = b.beat * 0.25;
  const cols = [UV.cyan, UV.pink, '#F4F070', '#FFFFFF'];
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const a = rot + (i / 26) * TAU + hash(i) * 0.4;
    const rr = 0.35 + hash(i + 3) * 0.6;
    const x = VIEW_W / 2 + Math.cos(a) * VIEW_W * 0.55 * rr - ((cam.x * 0.35) % 400) * 0;
    const y = VIEW_H * 0.36 + Math.sin(a) * VIEW_H * 0.3 * rr;
    g.globalAlpha = (0.16 + 0.14 * on) * f.L.lamps;
    g.fillStyle = cols[i % 4];
    g.beginPath();
    g.ellipse(x, y, 18, 11, a, 0, TAU);
    g.fill();
  }
  g.restore();
}

function deckProps(g: Ctx, v: import('../world/camera').LayerView, f: SceneFrame, layer: import('../world/tiledLayer').TiledLayer): void {
  const L = f.L;
  const b = f.b;
  const kick = hit(b, 'kick', 0.14);
  const snare = hit(b, 'snare', 0.12);
  layer.eachAnchor(v, 'deck', 400, (a, x) => {
    // ten pins in a triangle (side-on: 4 rows staggered in depth), jumping on the snare
    for (let row = 3; row >= 0; row--) {
      for (let i = 0; i <= row; i++) {
        const px = x - 90 + row * 44 + (i - row / 2) * 10;
        const py = a.y - row * 6;
        const j = snare * (6 + 6 * hash(row * 5 + i));
        const s = 0.8 - row * 0.05;
        g.fillStyle = uv(L, '#F4EFE2', 0.75);
        g.beginPath();
        g.ellipse(px, py - 22 * s - j, 9 * s, 20 * s, 0, 0, TAU);
        g.ellipse(px, py - 50 * s - j, 5 * s, 10 * s, 0, 0, TAU);
        g.fill();
        g.fillStyle = uv(L, UV.pink, 0.9);
        g.fillRect(px - 5 * s, py - 42 * s - j, 10 * s, 3);
      }
    }
    // the sweep bar drops on the kick
    const drop = kick * 60;
    g.fillStyle = css(lit(L, H('#3A2A5A'), 0.8, 0.28));
    g.fillRect(x - 230, a.y - 140 + drop, 460, 12);
    g.fillStyle = uv(L, UV.cyan, 0.6);
    g.fillRect(x - 230, a.y - 130 + drop, 460, 2);
  });
  layer.eachAnchor(v, 'return', 300, (a, x) => {
    // balls ride up the return on the bass
    const bass = hit(b, 'bass', 0.25);
    const cols = [UV.pink, UV.cyan, '#6A4AE0'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = uv(L, cols[i], 0.7);
      g.beginPath();
      g.arc(x - 50 + i * 42, a.y - 16 - (i === 0 ? bass * 8 : 0), 18, 0, TAU);
      g.fill();
    }
  });
}

function discoBall(g: Ctx, cam: ArtCamera, f: SceneFrame): void {
  const v = layerView(cam, 1.05);
  const b = f.b;
  const L = f.L;
  const SP = 2600;
  pushLayer(g, v);
  for (let k = Math.floor(v.x0 / SP) - 1; k <= Math.floor(v.x1 / SP) + 1; k++) {
    const x = k * SP + 900;
    if (x < v.x0 - 200 || x > v.x1 + 200) continue;
    const y = v.y0 + 110;
    g.strokeStyle = 'rgba(8,4,14,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, v.y0 - 10);
    g.lineTo(x, y - 60);
    g.stroke();
    const R = 60;
    g.fillStyle = css(lit(L, H('#8A84A8'), 0.9, 0.05));
    g.beginPath();
    g.arc(x, y, R, 0, TAU);
    g.fill();
    // facets, turning
    const rot = b.beat * 0.25;
    const hat = hit(b, 'hat', 0.08);
    for (let row = -3; row <= 3; row++) {
      const lat = (row / 4) * (Math.PI / 2);
      const ry = y + Math.sin(lat) * R;
      const rw = Math.cos(lat) * R;
      for (let i = 0; i < 10; i++) {
        const lon = ((i / 10) * TAU + rot) % TAU;
        if (Math.cos(lon) < 0) continue;
        const fx = x + Math.sin(lon) * rw;
        const bright = hash(i * 7 + row * 3 + Math.floor(b.beat * 2)) < 0.25 + 0.3 * hat;
        g.fillStyle = bright ? '#FFFFFF' : css(lit(L, H('#C9D3DA'), 0.9, 0.05));
        g.fillRect(fx - 5 * Math.cos(lon), ry - 4, 10 * Math.cos(lon), 8);
      }
    }
    drawGlow(g, x, y, '#FFFFFF', 160, 0.2 + 0.25 * hat);
  }
  g.restore();
}

// ------------------------------------------------------------------ play layer

/** the lane you run on: lacquered maple under UV, glowing guide arrows + dots, glowing gutter trim */
export function drawLanesFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }, b?: BeatInfo): void {
  const L = style.light;
  const { x, y, w } = rect;
  const hh = Math.min(rect.h, 1400);
  // gloss top band
  const gr = g.createLinearGradient(0, y, 0, y + 46);
  gr.addColorStop(0, css(lit(L, H('#8A6A9A'), 1, 0)));
  gr.addColorStop(1, css(lit(L, H('#3A2450'), 0.8, 0)));
  g.fillStyle = gr;
  g.fillRect(x, y, w, 46);
  // board seams
  g.fillStyle = 'rgba(8,4,14,0.35)';
  for (let px = Math.ceil(x / 40) * 40; px < x + w; px += 40) g.fillRect(px, y + 6, 2, 38);
  // glowing guide arrows + dots, pulsing on the beat
  const p = b ? 0.7 + 0.3 * Math.exp(-b.beatPhase * 4) : 1;
  g.fillStyle = uv(L, UV.cyan, p);
  for (let px = Math.ceil(x / 480) * 480; px < x + w; px += 480) {
    g.beginPath();
    g.moveTo(px, y + 14);
    g.lineTo(px + 26, y + 24);
    g.lineTo(px, y + 34);
    g.closePath();
    g.fill();
    for (const d of [-120, -80]) g.fillRect(px + d, y + 22, 5, 5);
  }
  // gutter trim + the lane's glowing UNDERBODY (no black void: the Lanes are the chorus showpiece)
  g.fillStyle = uv(L, UV.pink, 0.85);
  g.fillRect(x, y + 46, w, 4);
  const ub = g.createLinearGradient(0, y + 50, 0, y + 420);
  ub.addColorStop(0, css(lit(L, H('#3A1E6A'), 0.9, 0)));
  ub.addColorStop(0.45, css(lit(L, H('#221040'), 0.8, 0)));
  ub.addColorStop(1, '#0A0612');
  g.fillStyle = ub;
  g.fillRect(x, y + 50, w, hh - 50);
  // chasing LANE LIGHTS along the fascia: a run of bulbs that sweeps on the 8ths (+ flares on the kick)
  const ch = b ? Math.floor(b.beat * 2) : 0;
  const kick = b ? hit(b, 'kick', 0.14) : 0;
  for (let px = Math.ceil(x / 32) * 32; px < x + w - 8; px += 32) {
    const i = Math.round(px / 32);
    const on = ((i - ch) % 8 + 8) % 8 < 2;
    g.fillStyle = on ? uv(L, i % 16 < 8 ? UV.cyan : UV.pink, 1) : 'rgba(80,60,120,0.5)';
    g.fillRect(px, y + 62, 14, 8);
    if (on) drawGlow(g, px + 7, y + 66, i % 16 < 8 ? UV.cyan : UV.pink, 40 + 30 * kick, 0.35);
  }
  g.fillStyle = uv(L, UV.cyan, 0.5 + 0.4 * kick);
  g.fillRect(x, y + 92, w, 3);
  // the ball-return track below, balls riding it on the bass
  g.fillStyle = css(lit(L, H('#140A24'), 0.9, 0));
  g.fillRect(x, y + 118, w, 26);
  const bass = b ? b.beat * 0.8 : 0;
  for (let px = Math.floor((x - 400) / 400) * 400; px < x + w; px += 400) {
    const bx = px + ((bass * 160) % 400);
    if (bx < x + 14 || bx > x + w - 14) continue;
    g.fillStyle = uv(L, Math.round(px / 400) % 2 ? UV.pink : '#6A4AE0', 0.9);
    g.beginPath();
    g.arc(bx, y + 131, 11, 0, TAU);
    g.fill();
  }
  g.fillStyle = uv(L, UV.pink, 0.3);
  g.fillRect(x, y + 150, w, 2);
  // walkable-top rule: black edge + cream lip
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(x - 6, y - 5, 6, hh + 5);
  if (style.capR !== false) g.fillRect(x + w, y - 5, 6, hh + 5);
}

/**
 * Rolling bowling ball (STUMBLE threat, rolls toward the hero): a dark swirl ball with RED finger holes (the only
 * red), a rumble trail of UV sparks, dust puffs on the floor. (x, y) = centre, rot = roll angle.
 */
export function drawRollingBall(g: Ctx, x: number, y: number, r: number, rot: number, b: BeatInfo): void {
  // rumble trail behind it (it rolls LEFT, trail to the right)
  for (let i = 1; i < 6; i++) {
    g.globalAlpha = 0.35 * (1 - i / 6);
    g.fillStyle = i % 2 ? UV.cyan : UV.pink;
    g.fillRect(x + r * 0.6 + i * 18, y + r - 6 - (hash(i + Math.floor(b.time * 20)) * 10), 10, 4);
  }
  g.globalAlpha = 1;
  // UV rim light so the dark ball pops off the dark lane (cream-cyan halo, never gold)
  g.beginPath();
  g.arc(x, y, r + 5, 0, TAU);
  g.fillStyle = 'rgba(200,255,250,0.9)';
  g.fill();
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = '#2A1846';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = CF.filmBlack;
  g.stroke();
  // UV swirl
  g.strokeStyle = 'rgba(224,75,208,0.55)';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(-r * 0.2, r * 0.1, r * 0.55, 0.3, 2.6);
  g.stroke();
  g.strokeStyle = 'rgba(63,240,224,0.4)';
  g.beginPath();
  g.arc(r * 0.15, -r * 0.1, r * 0.4, 3.4, 5.6);
  g.stroke();
  // finger holes: red points (stumble language)
  for (const [hx, hy, hr] of [
    [-r * 0.3, -r * 0.4, r * 0.17],
    [r * 0.08, -r * 0.52, r * 0.17],
    [-r * 0.05, -r * 0.02, r * 0.2],
  ]) {
    g.fillStyle = '#B3201B';
    g.beginPath();
    g.arc(hx, hy, hr, 0, TAU);
    g.fill();
    g.fillStyle = '#0B0706';
    g.beginPath();
    g.arc(hx, hy, hr * 0.55, 0, TAU);
    g.fill();
  }
  g.restore();
  // gloss highlight (doesn't rotate)
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.14, -0.6, 0, TAU);
  g.fill();
}
