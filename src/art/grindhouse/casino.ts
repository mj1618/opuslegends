/**
 * ACT 3a' — THE VELVET CASINO: THE RACK (bars 65-68). Fig darkness, velvet drapes, gold, and three crystal chandeliers
 * that die one per crack until only the GOLD HEAD GOON glows. Light key 'velvet'.
 *
 *   const casino = makeCasino(light);   casino.state.dark = 0..3 (chandeliers out), casino.state.hush = 0..1 (the
 *   reel-change freeze before the break: the room holds its breath), casino.state.krak = seconds since the break
 *
 * Layers: room fill · back wall (0.3): swagged velvet drapes, gold pilasters, Big Jim's portrait, the JIMPERIAL CASINO
 * bulb marquee · chandeliers (0.42): three per tile, crystal drops glinting on the hats; dead ones spark and sway dark
 * · floor (0.62): roulette (the wheel spins on the beat), blackjack tables with dealers, a bank of slots chasing
 * lights, chip towers · front: cigar haze, the dark closing in.
 *
 * Play layer: drawRackFloor (the goon heap: stacked fig vests + flat caps, the walkable top = a row of broad backs),
 * drawChipTower (breakable), drawChandelier (pendulum skin), drawHeadGoon (the giant gold head goon = THE BREAK),
 * drawRackFrame (the huge wooden triangle that slams down around the heap on 268).
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex, mix } from '../core/color';
import { drawGlow, star4 } from '../core/draw';
import { TAU, clamp01, hash } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, SEA_Y, VIEW_H, VIEW_W, type LayerView, layerView, pushLayer } from '../world/camera';
import { type Lighting, type LightingDirector, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, stripLayer } from '../world/parallax';
import type { TiledLayer } from '../world/tiledLayer';
import './lights';

const H = hex;
const SIGN_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
const INK = CF.filmBlack;
export const VELVET = { fig: '#5E2B4E', velvet: '#8A4A76', shadow: '#2E1428', chrome: '#C9D3DA', teal: '#2E7F86', gold: '#E0B64A', crystal: '#F4EFE2' } as const;

export interface CasinoState {
  /** chandeliers out (0..3, fractional = the one dying) */
  dark: number;
  /** 0..1 the hush: the room freezes before the break */
  hush: number;
  /** seconds since the break (NaN = not yet) */
  krak: number;
}

export function makeCasino(light: LightingDirector): ParallaxScene & { state: CasinoState } {
  const scene = new ParallaxScene(light) as ParallaxScene & { state: CasinoState };
  scene.state = { dark: 0, hush: 0, krak: NaN };
  const st = scene.state;
  scene.add({
    id: 'casino-room',
    pass: 'back',
    draw: (g, _cam, f) => {
      g.fillStyle = css(lit(f.L, H('#1A0A16'), 0.5, 0.3));
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    },
  });
  scene.add(
    stripLayer({
      id: 'casino-wall',
      factor: 0.3,
      W: 3000,
      top: -1150,
      H: 1250,
      res: 0.45,
      material: { base: '#4A1E40', shade: '#2E1428', detail: '#160812', accent: '#8C7440', glow: '#FFE9C2', depth: 0.35 },
      paint: (p) => {
        const floor = p.H - 40;
        p.body.fillRect(0, 0, p.W, p.H);
        // drapes: vertical folds, swagged at the top between gold pilasters
        for (let bay = 0; bay < 5; bay++) {
          const x0 = bay * 600;
          for (let i = 0; i < 14; i++) {
            const fx = x0 + 60 + i * 34;
            (i % 2 ? p.shadeL : p.shadeR).fillRect(fx, 140, 16, floor - 140);
          }
          // swag
          p.accent.beginPath();
          p.accent.moveTo(x0 + 40, 120);
          p.accent.quadraticCurveTo(x0 + 300, 300, x0 + 560, 120);
          p.accent.lineTo(x0 + 560, 150);
          p.accent.quadraticCurveTo(x0 + 300, 330, x0 + 40, 150);
          p.accent.fill();
          // pilaster
          p.accent.fillRect(x0 - 20, 80, 40, floor - 80);
          p.rim.fillRect(x0 - 20, 80, 5, floor - 80);
          p.detail.fillRect(x0 - 30, floor - 60, 60, 60);
        }
        p.detail.fillRect(0, 0, p.W, 90);
        p.accent.fillRect(0, 86, p.W, 10);
        p.anchors.push({ kind: 'portrait', x: 900, y: p.top + floor - 640, s: 0 });
        p.anchors.push({ kind: 'marquee', x: 2250, y: p.top + floor - 820, s: 0 });
      },
      props: (g, v, f, layer) => wallProps(g, v, f, layer, st),
    }),
  );
  scene.add({ id: 'casino-chandeliers', pass: 'back', draw: (g, cam, f) => chandeliers(g, cam, f, st) });
  scene.add({ id: 'casino-floor', pass: 'back', draw: (g, cam, f) => gaming(g, cam, f, st) });
  scene.add({ id: 'casino-front', pass: 'front', draw: (g, cam, f) => front(g, cam, f, st) });
  return scene;
}

function wallProps(g: Ctx, v: LayerView, f: SceneFrame, layer: TiledLayer, st: CasinoState): void {
  const L = f.L;
  const b = f.b;
  layer.eachAnchor(v, 'portrait', 400, (a, x) => {
    // Big Jim's portrait in a heavy gold frame (a silhouette with chrome aviators that glint)
    g.fillStyle = css(lit(L, H('#8C7440'), 1, 0.3));
    g.fillRect(x - 170, a.y - 220, 340, 440);
    g.fillStyle = css(lit(L, H('#1E0C1A'), 0.8, 0.3));
    g.fillRect(x - 140, a.y - 190, 280, 380);
    g.fillStyle = css(lit(L, H('#5E2B4E'), 0.9, 0.3));
    g.beginPath();
    g.ellipse(x, a.y + 120, 120, 110, 0, Math.PI, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(x, a.y - 30, 60, 70, 0, 0, TAU);
    g.fillStyle = css(lit(L, H('#A8664F'), 0.8, 0.3));
    g.fill();
    g.fillStyle = css(lit(L, H('#141018'), 0.8, 0.3));
    g.beginPath();
    g.ellipse(x, a.y - 90, 64, 30, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = css(lit(L, H(VELVET.chrome), 1, 0.2));
    g.fillRect(x - 48, a.y - 44, 40, 22);
    g.fillRect(x + 8, a.y - 44, 40, 22);
    const gl = hit(b, 'piano', 0.3);
    if (gl > 0.05) star4(g, x - 30, a.y - 40, 26 * gl, b.time, 'rgba(255,255,255,0.9)');
  });
  layer.eachAnchor(v, 'marquee', 700, (a, x) => {
    const lamps = clamp01(1 - st.dark / 3) * 0.7 + 0.3;
    g.font = `italic 86px ${SIGN_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(14,6,12,0.9)';
    g.strokeText('JIMPERIAL CASINO', x, a.y);
    g.fillStyle = css(lit(L, H('#C9A040'), 1, 0.2));
    g.fillText('JIMPERIAL CASINO', x, a.y);
    // bulbs chasing round the board
    const chase = Math.floor(b.beat * 4);
    for (let i = 0; i < 40; i++) {
      const u = i / 40;
      const bx = x - 520 + (u < 0.5 ? u * 2 * 1040 : (1 - u) * 2 * 1040);
      const by = a.y + (u < 0.5 ? -80 : 80);
      const on = (i + chase) % 4 !== 0;
      g.fillStyle = on ? css(H(CF.bulb), lamps) : 'rgba(40,20,30,0.9)';
      g.beginPath();
      g.arc(bx, by, 7, 0, TAU);
      g.fill();
    }
    drawGlow(g, x, a.y, CF.bulb, 520, 0.12 * lamps);
  });
}

const CP = 1500;

/** three chandeliers per tile; `st.dark` of them are out (the i-th dies as dark passes i) */
function chandeliers(g: Ctx, cam: ArtCamera, f: SceneFrame, st: CasinoState): void {
  const v = layerView(cam, 0.42);
  pushLayer(g, v);
  for (let k = Math.floor(v.x0 / CP) - 1; k <= Math.floor(v.x1 / CP) + 1; k++) {
    const x = k * CP + 400;
    const idx = ((k % 3) + 3) % 3;
    const out = clamp01(st.dark - idx);
    drawChandelier(g, x, v.y0 + 60, 1.1, 1 - out, f.L, f.b, x, out > 0 && out < 1 ? out : 0);
  }
  g.restore();
}

/**
 * A crystal CHANDELIER (bg decoration + the act-3 pendulum skin): gilded tiers, candle bulbs, hanging crystal drops that
 * glint on the hats. `on` 0..1 (dies: sparks + sway), (x, y) = the ceiling rose; it hangs down ~260*k.
 */
export function drawChandelier(g: Ctx, x: number, y: number, k: number, on: number, L: Lighting, b: BeatInfo, seed = 0, dying = 0): void {
  const sway = Math.sin(b.time * 1.3 + seed) * 0.03 + (on < 0.5 ? Math.sin(b.time * 3 + seed) * 0.06 : 0);
  g.save();
  g.translate(x, y);
  g.rotate(sway);
  g.scale(k, k);
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(0, -80);
  g.lineTo(0, 60);
  g.stroke();
  const gold = css(lit(L, H('#C9A040'), 1.1, 0.1));
  // tiers
  for (const [ty, tw] of [
    [70, 70],
    [130, 120],
    [190, 90],
  ] as [number, number][]) {
    g.fillStyle = gold;
    g.beginPath();
    g.ellipse(0, ty, tw, 12, 0, 0, TAU);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.stroke();
    // candle bulbs
    for (let i = -2; i <= 2; i++) {
      const bx = (i / 2) * tw * 0.9;
      g.fillStyle = on > 0.1 ? css(H('#FFF3D0'), 0.4 + 0.6 * on) : 'rgba(80,70,70,0.9)';
      g.beginPath();
      g.ellipse(bx, ty - 16, 5, 9, 0, 0, TAU);
      g.fill();
    }
    // crystal drops
    for (let i = 0; i < 9; i++) {
      const dx = ((i + 0.5) / 9 - 0.5) * tw * 2;
      const len = 26 + (i % 3) * 12;
      g.strokeStyle = 'rgba(244,239,226,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(dx, ty + 8);
      g.lineTo(dx, ty + 8 + len);
      g.stroke();
      const glint = on > 0.3 && hash(i + seed + Math.floor(b.beat * 2)) < 0.12 + 0.3 * hit(b, 'hat', 0.08);
      g.fillStyle = glint ? '#FFFFFF' : 'rgba(220,210,230,0.7)';
      g.beginPath();
      g.moveTo(dx, ty + 8 + len);
      g.lineTo(dx + 5, ty + 16 + len);
      g.lineTo(dx, ty + 26 + len);
      g.lineTo(dx - 5, ty + 16 + len);
      g.fill();
    }
  }
  g.restore();
  if (on > 0.05) {
    drawGlow(g, x, y + 130 * k, '#FFF3D0', 280 * k, 0.35 * on);
    drawGlow(g, x, y + 130 * k, '#FFE9C2', 700 * k, 0.1 * on);
  }
  if (dying > 0) {
    // the fizz: sparks raining off the dead fixture
    for (let i = 0; i < 12; i++) {
      const u = (dying * 3 + hash(i + seed)) % 1;
      g.fillStyle = i % 2 ? '#FFF3D0' : '#FFFFFF';
      g.fillRect(x + (hash(i + 3) - 0.5) * 200 * k, y + 130 * k + u * 400 * k, 4, 4);
    }
  }
}

function gaming(g: Ctx, cam: ArtCamera, f: SceneFrame, st: CasinoState): void {
  const v = layerView(cam, 0.62);
  const L = f.L;
  const b = f.b;
  const P = 2200;
  const floorY = SEA_Y - 170;
  const hush = st.hush;
  pushLayer(g, v);
  const dim = clamp01(1 - st.dark / 3.3);
  for (let k = Math.floor(v.x0 / P) - 1; k <= Math.floor(v.x1 / P) + 1; k++) {
    const x = k * P + 200;
    // roulette table: the wheel spins on the beat (freezes in the hush)
    g.fillStyle = css(lit(L, H('#2A1026'), 0.8, 0.3));
    g.fillRect(x - 200, floorY - 130, 460, 130);
    g.fillStyle = css(lit(L, H(VELVET.teal), 0.9, 0.3));
    g.fillRect(x - 190, floorY - 142, 440, 18);
    const rot = hush > 0.5 ? 0 : b.beat * Math.PI * 0.5;
    g.save();
    g.translate(x - 90, floorY - 146);
    g.scale(1, 0.35);
    g.fillStyle = css(lit(L, H('#5A3A26'), 1, 0.3));
    g.beginPath();
    g.arc(0, 0, 80, 0, TAU);
    g.fill();
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? css(lit(L, H('#1A1410'), 1, 0.3)) : css(lit(L, H('#7A1E30'), 1, 0.3));
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 70, rot + (i / 16) * TAU, rot + ((i + 1) / 16) * TAU);
      g.fill();
    }
    g.fillStyle = css(lit(L, H('#C9A040'), 1, 0.3));
    g.beginPath();
    g.arc(0, 0, 18, 0, TAU);
    g.fill();
    g.restore();
    // croupier + two punters (silhouettes; arms up on the snare)
    const snare = hush > 0.5 ? 0 : hit(b, 'snare', 0.14);
    g.fillStyle = css(lit(L, H('#120610'), 0.6, 0.3));
    for (const [px, arms] of [
      [x + 330, 0],
      [x - 280, 1],
      [x + 120, 1],
    ] as [number, number][]) {
      g.beginPath();
      g.moveTo(px - 30, floorY);
      g.lineTo(px - 24, floorY - 140);
      g.lineTo(px + 24, floorY - 140);
      g.lineTo(px + 30, floorY);
      g.fill();
      g.beginPath();
      g.arc(px, floorY - 166, 22, 0, TAU);
      g.fill();
      if (arms) {
        g.lineWidth = 12;
        g.strokeStyle = css(lit(L, H('#120610'), 0.6, 0.3));
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px + 18, floorY - 130);
        g.lineTo(px + 40, floorY - 150 - snare * 60);
        g.stroke();
      }
    }
    // a bank of slot machines, lights chasing (die with the chandeliers)
    for (let s = 0; s < 4; s++) {
      const sx = x + 700 + s * 110;
      g.fillStyle = css(lit(L, H('#3A1A34'), 0.9, 0.3));
      g.fillRect(sx, floorY - 260, 90, 260);
      g.fillStyle = css(lit(L, H('#E9D8B4'), 0.9, 0.2), 0.3 + 0.6 * dim);
      g.fillRect(sx + 12, floorY - 200, 66, 50);
      const on = (Math.floor(b.beat * 2) + s) % 3 === 0;
      g.fillStyle = on ? css(H('#FF5C9A'), 0.8 * dim + 0.1) : css(H('#46D6A0'), 0.5 * dim + 0.1);
      g.fillRect(sx + 10, floorY - 250, 70, 18);
      if (on) drawGlow(g, sx + 45, floorY - 240, '#FF5C9A', 80, 0.3 * dim);
      g.fillStyle = css(lit(L, H('#8C7440'), 1, 0.3));
      g.fillRect(sx + 86, floorY - 190, 6, 60);
    }
    // chip towers on a side table
    for (let c = 0; c < 5; c++) drawChipTower(g, x + 1250 + c * 44, floorY - 100, 0.8 + (c % 3) * 0.3, L, c + k * 5);
    g.fillStyle = css(lit(L, H('#2A1026'), 0.8, 0.3));
    g.fillRect(x + 1200, floorY - 100, 280, 100);
  }
  g.restore();
}

/** a CHIP TOWER: a stack of casino chips (teal / cream / fig, edge spots). (x, y) = bottom centre, k = height factor */
export function drawChipTower(g: Ctx, x: number, y: number, k: number, L: Lighting, seed = 0): void {
  const n = Math.round(6 + 10 * k);
  const cols = [VELVET.teal, '#E9D8B4', VELVET.fig, '#1A1410'];
  for (let i = 0; i < n; i++) {
    const cy = y - i * 7;
    const col = cols[Math.floor(hash(i + seed * 13) * 4)];
    const wob = (hash(i * 3 + seed) - 0.5) * 3;
    g.fillStyle = css(lit(L, H(col), 1, 0.15));
    g.beginPath();
    g.ellipse(x + wob, cy, 18, 5, 0, 0, TAU);
    g.fill();
    g.fillRect(x + wob - 18, cy - 6, 36, 6);
    g.fillStyle = 'rgba(244,239,226,0.8)';
    for (let d = -1; d <= 1; d++) g.fillRect(x + wob + d * 11 - 2, cy - 5, 4, 4);
  }
  g.fillStyle = css(lit(L, H(cols[Math.floor(hash(n + seed * 13) * 4)]), 1.1, 0.15));
  g.beginPath();
  g.ellipse(x, y - n * 7, 18, 5, 0, 0, TAU);
  g.fill();
}

function front(g: Ctx, _cam: ArtCamera, f: SceneFrame, st: CasinoState): void {
  const L = f.L;
  const b = f.b;
  // cigar haze
  for (let i = 0; i < 4; i++) {
    const x = ((hash(i) * VIEW_W + b.time * (10 + i * 5)) % (VIEW_W + 900)) - 450;
    drawGlow(g, x, VIEW_H * (0.25 + hash(i + 5) * 0.3), css(lit(L, H('#8A4A76'), 1, 0.2)), 480, 0.05 + 0.05 * L.fog, false);
  }
  // the dark closing in as the chandeliers die (a vignette that tightens)
  const d = clamp01(st.dark / 3) * 0.75 + st.hush * 0.2;
  if (d > 0.02) {
    const gr = g.createRadialGradient(VIEW_W * 0.45, VIEW_H * 0.55, VIEW_H * (0.6 - 0.25 * d), VIEW_W * 0.45, VIEW_H * 0.55, VIEW_H * 1.1);
    gr.addColorStop(0, 'rgba(10,4,10,0)');
    gr.addColorStop(1, `rgba(10,4,10,${0.8 * d})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// ------------------------------------------------------------------ play layer

/**
 * THE RACK's floors: the GOON HEAP. The walkable top is a row of broad fig-vested backs + flat caps (cream lip), under it
 * goons piled on goons (arms, legs, caps), sinking into the dark. Stumble red is NOT here: only jabbers carry cue tips.
 */
export function drawRackFloor(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: { light: Lighting; capL?: boolean; capR?: boolean }, b?: BeatInfo): void {
  const L = style.light;
  const { x, y, w } = rect;
  const hh = Math.min(rect.h, 1600);
  const breathe = b ? hit(b, 'kick', 0.2) * 3 : 0;
  // dark body of the heap
  const body = g.createLinearGradient(0, y, 0, y + 500);
  body.addColorStop(0, css(lit(L, H('#3A1634'), 0.9, 0)));
  body.addColorStop(1, '#0A040A');
  g.fillStyle = body;
  g.fillRect(x, y + 10, w, hh - 10);
  // piled goons: rows of rounded backs + caps, smaller + darker lower down
  const x0 = Math.floor(x / 90) * 90;
  for (let row = 0; row < 4; row++) {
    const ry = y + 20 + row * 70;
    const a = 1 - row * 0.22;
    for (let px = x0 + (row % 2) * 45; px < x + w + 40; px += 90) {
      if (px < x - 40) continue;
      const s = hash(px * 0.37 + row);
      g.fillStyle = css(lit(L, H(s < 0.5 ? '#5E2B4E' : '#4A2040'), 0.9 * a, 0));
      g.beginPath();
      g.ellipse(px, ry + 26 - (row === 0 ? breathe : 0), 52, 30, (s - 0.5) * 0.4, 0, TAU);
      g.fill();
      // flat cap / bald head poking out
      g.fillStyle = css(lit(L, H(s < 0.3 ? '#2A1A14' : '#A8664F'), 0.8 * a, 0));
      g.beginPath();
      g.arc(px + (s - 0.5) * 60, ry + 6, 14, 0, TAU);
      g.fill();
      // an arm flopped over
      if (s > 0.6) {
        g.strokeStyle = css(lit(L, H('#A8664F'), 0.7 * a, 0));
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px + 20, ry + 30);
        g.lineTo(px + 50, ry + 58);
        g.stroke();
      }
    }
  }
  // the TOP: a plank laid over the backs (reads as a walkable tier)
  g.fillStyle = css(lit(L, H('#8A5A36'), 1, 0));
  g.fillRect(x, y, w, 16);
  g.fillStyle = css(lit(L, H('#5A3A26'), 1, 0));
  g.fillRect(x, y + 12, w, 5);
  g.fillStyle = CF.filmBlack;
  g.fillRect(x, y - 1, w, 5);
  g.fillStyle = '#F4EFE2';
  g.fillRect(x, y - 3, w, 3);
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(x - 6, y - 5, 6, hh + 5);
  if (style.capR !== false) g.fillRect(x + w, y - 5, 6, hh + 5);
}

/**
 * THE GOLD HEAD GOON (the rack's apex = the giant breakable of THE BREAK): a huge goon in a gold lamé vest, arms crossed,
 * flat cap, a gold 1 on his chest like the head ball of a rack. Drawn around (0,0), r ~ 30 = normal size.
 */
export function drawHeadGoon(g: Ctx, r: number, time: number, glint: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  // body
  g.beginPath();
  g.moveTo(-40, 40);
  g.quadraticCurveTo(-46, -10, -26, -22);
  g.lineTo(26, -22);
  g.quadraticCurveTo(46, -10, 40, 40);
  g.closePath();
  const gg = g.createLinearGradient(-40, -30, 40, 40);
  gg.addColorStop(0, '#FFF0B8');
  gg.addColorStop(0.45, '#E0B64A');
  gg.addColorStop(1, '#8A6A1E');
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = gg;
  g.fill();
  // crossed arms
  g.fillStyle = '#A8664F';
  g.beginPath();
  g.roundRect(-34, 2, 68, 18, 9);
  g.fill();
  g.stroke();
  // the "1" ball on his chest
  g.fillStyle = '#F4EFE2';
  g.beginPath();
  g.arc(0, -8, 9, 0, TAU);
  g.fill();
  g.fillStyle = INK;
  g.font = 'bold 12px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('1', 0, -7);
  // head + cap + scowl
  g.beginPath();
  g.arc(0, -34, 14, 0, TAU);
  g.fillStyle = '#C98E68';
  g.fill();
  g.stroke();
  g.fillStyle = '#2A1A14';
  g.beginPath();
  g.ellipse(2, -44, 17, 7, 0.1, Math.PI, TAU);
  g.fill();
  g.fillRect(-15, -45, 34, 4);
  g.strokeStyle = INK;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(-7, -36);
  g.lineTo(-2, -34);
  g.moveTo(7, -36);
  g.lineTo(2, -34);
  g.moveTo(-5, -26);
  g.lineTo(5, -27);
  g.stroke();
  g.restore();
  drawGlow(g, 0, 0, '#FFD878', 110 * k, 0.35 + 0.25 * Math.sin(time * 4));
  if (glint > 0.05) star4(g, -18 * k, -30 * k, 24 * k * glint, time, 'rgba(255,248,220,0.95)');
}

/**
 * THE RACK FRAME: the giant wooden triangle (the pool rack) that slams down around the goon heap. (x, y) = the base
 * middle, w = base width, drop = 0 (in place) .. 1 (hanging high, about to slam). Breaks apart when `burst` > 0.
 */
export function drawRackFrame(g: Ctx, x: number, y: number, w: number, drop: number, L: Lighting, burst = 0): void {
  const hgt = w * 0.866;
  const oy = -drop * 900;
  const pts: [number, number][] = [
    [x - w / 2, y],
    [x, y - hgt],
    [x + w / 2, y],
  ];
  const wood = css(lit(L, H('#8A5A36'), 1.05, 0));
  const dark = css(lit(L, H('#4A2E1C'), 1, 0));
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % 3];
    const fly = burst > 0 ? burst : 0;
    const mx = (ax + bx) / 2 - x;
    const my = (ay + by) / 2 - (y - hgt / 3);
    g.save();
    g.translate(mx * fly * 1.6, my * fly * 1.6 + oy + fly * fly * 900);
    g.translate((ax + bx) / 2, (ay + by) / 2);
    g.rotate(fly * (i - 1) * 2.5);
    g.translate(-(ax + bx) / 2, -(ay + by) / 2);
    g.lineCap = 'round';
    g.strokeStyle = INK;
    g.lineWidth = 58;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke();
    g.strokeStyle = dark;
    g.lineWidth = 48;
    g.stroke();
    g.strokeStyle = wood;
    g.lineWidth = 26;
    g.stroke();
    g.restore();
  }
  if (burst <= 0) {
    // brass corners
    for (const [px, py] of pts) {
      g.fillStyle = '#8C7440';
      g.beginPath();
      g.arc(px, py + oy, 22, 0, TAU);
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = INK;
      g.stroke();
    }
  }
  void mix;
}
