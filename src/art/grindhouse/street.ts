/**
 * ACT 1 — 42ND STREET: golden hour -> neon dusk. Built on the generic ParallaxScene / stripLayer
 * framework + LifeLayers (ambient life).
 *
 *   const street = makeStreet(lightingDirector);      // light set 'grindhouse' (useLights)
 *   street.drawBack(ctx, cam, beat); ...play layer...; street.drawFront(ctx, cam, beat);
 *   drawStreetGround(ctx, rect, { light })           // relit sidewalk + brick foundation (play layer)
 *
 * Layers: matte sky · distant skyline + BIG JIM'S BILLIARDS tower on the horizon (spinning
 * eight-ball sign; aviator glints in the top window on the "HEY!" stabs) · far rooftops, water
 * towers, billboards (0.25) · grindhouse facades with marquees (bulbs chase on 8ths, flash on the
 * kick), neon (buzz-flicker on hats, letters tilt on cowbell) (0.55) · LIFE: pigeons on the
 * marquees scatter on crashes, sign letters drop on riff accents (0.55) · far-sidewalk crowd
 * stepping on the beat (0.68) · traffic: taxis, sedans, vans bouncing on the kick (0.8) ·
 * newspapers blowing (0.85) · foreground festoon bulbs swaying on the shuffle + manhole steam (1.3).
 */
import { type BeatInfo, hit } from '../core/beat';
import { TintBake } from '../core/bake';
import type { Ctx } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { drawGlow, puff } from '../core/draw';
import { TAU, clamp01, fract, hash, rng } from '../core/math';
import { CF } from '../palette';
import { type ArtCamera, HORIZON_Y, SEA_Y, VIEW_H, VIEW_W, layerView, pushLayer, screenX, screenY } from '../world/camera';
import { type Lighting, type LightingDirector, atmos, lit } from '../world/lighting';
import { ParallaxScene, type SceneFrame, skyLayer, stripLayer } from '../world/parallax';
import './lights';
import { LifeLayer } from '../life/life';
import { BRAWLERS, LETTER, NEWSPAPER, PEDESTRIAN, PIGEONS, SEDAN, TAXI, VAN } from './actors';
import { JAMMER } from './jammers';

const H = hex;
const MARQUEE_FONT = '"Impact", "Haettenschweiler", "Arial Narrow Bold", "Helvetica Neue", sans-serif';

/** titles on the grindhouse marquees (fictional; Eightball Pictures) */
const BILLS: [string, string][] = [
  ['BIG JIM’S REVENGE', 'with SLIM'],
  ['EIGHTBALL FURY', 'ALL NIGHT'],
  ['SIDE POCKET SHOWDOWN', 'DOUBLE FEATURE'],
  ['RACK ’EM UP', 'CONTINUOUS SHOWS'],
];

// ------------------------------------------------------------------------------ BIG JIM'S tower (horizon)

class JimsTower {
  private bake: TintBake;
  constructor() {
    // 0 body, 1 setbacks/shade, 2 neon trim (glow), 3 lit windows (glow), 4 detail
    this.bake = new TintBake(300, 700, 5, 0.6);
    const body = this.bake.ch(0);
    const shade = this.bake.ch(1);
    const neon = this.bake.ch(2);
    const win = this.bake.ch(3);
    const det = this.bake.ch(4);
    const cx = 150;
    // art-deco stepped tower
    const tiers: [number, number][] = [
      [180, 300],
      [140, 180],
      [100, 110],
      [60, 60],
    ];
    let y = 700;
    for (const [w, h] of tiers) {
      body.fillRect(cx - w / 2, y - h, w, h);
      shade.fillRect(cx + w / 2 - w * 0.28, y - h, w * 0.28, h);
      neon.fillRect(cx - w / 2 - 4, y - h - 3, w + 8, 4);
      for (let wy = y - h + 14; wy < y - 10; wy += 22)
        for (let wx = cx - w / 2 + 10; wx < cx + w / 2 - 14; wx += 18) {
          det.fillRect(wx, wy, 10, 14);
          if ((wx * 7 + wy * 3) % 5 < 2) win.fillRect(wx + 1, wy + 1, 8, 12);
        }
      y -= h;
    }
    // the top window (aviator glints are live) + mast
    det.fillRect(cx - 24, y + 18, 48, 20);
    body.fillRect(cx - 3, y - 80, 6, 80);
    // vertical neon blade "BIG JIM'S"
    det.fillRect(cx + 70, 330, 34, 300);
    neon.save();
    neon.font = '30px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
    neon.textAlign = 'center';
    const word = 'BIGJIMS';
    for (let i = 0; i < word.length; i++) neon.fillText(word[i], cx + 87, 364 + i * 38);
    neon.restore();
  }

  draw(g: Ctx, x: number, baseY: number, scale: number, L: Lighting, b: BeatInfo): void {
    const d = 0.6;
    const glowCol = mix(H(CF.neonRose), L.accent, 0.3);
    this.bake.compose([
      css(lit(L, H('#3E2E3E'), 0.6, d)),
      css(lit(L, H('#241A26'), 0.4, d), 0.8),
      css(atmos(L, glowCol, d * 0.5), 0.3 + 0.7 * L.lamps),
      css(atmos(L, H(CF.bulb), d * 0.4), 0.2 + 0.8 * L.lamps),
      css(lit(L, H('#140E12'), 0.4, d), 0.85),
    ]);
    const k = 0.62 * scale;
    const w = 300 * k;
    const h = 700 * k;
    g.drawImage(this.bake.out, x - w / 2, baseY - h, w, h);
    const topY = baseY - h + (700 - 650) * k;
    // aviator glints in the top window flash on the HEY! stabs
    const glint = hit(b, 'hey', 0.1);
    for (const dx of [-10, 10]) {
      g.fillStyle = css(mix(lit(L, H(CF.chrome), 0.8, 0.4), [255, 255, 255], glint));
      g.beginPath();
      g.ellipse(x + dx * k, topY + 28 * k, 8 * k, 5 * k, 0, 0, TAU);
      g.fill();
      if (glint > 0.05) drawGlow(g, x + dx * k, topY + 28 * k, '#FFFFFF', 50 * scale, glint);
    }
    // the giant eight-ball sign on the roof, spinning a quarter-turn per beat
    const bx = x;
    const by = topY - 110 * k;
    const R = 46 * k;
    const spin = (Math.floor(b.beat) + (1 - Math.exp(-b.beatPhase * 8))) * (Math.PI / 2);
    g.fillStyle = css(lit(L, H('#141014'), 0.5, d * 0.7));
    g.beginPath();
    g.arc(bx, by, R, 0, TAU);
    g.fill();
    g.strokeStyle = css(atmos(L, glowCol, d * 0.4), 0.4 + 0.6 * L.lamps);
    g.lineWidth = 3 * k;
    g.stroke();
    const sx = Math.cos(spin);
    g.fillStyle = css(atmos(L, H(CF.cream), d * 0.4));
    g.beginPath();
    g.ellipse(bx + sx * R * 0.3, by, R * 0.42 * Math.max(0.15, Math.abs(Math.cos(spin * 0.5 + 0.3))), R * 0.42, 0, 0, TAU);
    g.fill();
    if (Math.abs(Math.cos(spin * 0.5 + 0.3)) > 0.5) {
      g.fillStyle = css(lit(L, H('#141014'), 0.5, d * 0.7));
      g.font = `${Math.round(R * 0.6)}px "Impact", "Arial Narrow Bold", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('8', bx + sx * R * 0.3, by + 1);
    }
    if (L.lamps > 0.3) drawGlow(g, bx, by, CF.neonRose, R * 3, (L.lamps - 0.2) * 0.35);
  }
}

// ------------------------------------------------------------------------------ scene

export type StreetScene = ParallaxScene & { towerX: number; towerScale: number };

export function makeStreet(light: LightingDirector): StreetScene {
  const scene = new ParallaxScene(light) as StreetScene;
  /** Big Jim's tower on the horizon: screen-x fraction + size (grows act by act) */
  scene.towerX = 0.74;
  scene.towerScale = 1.05;
  scene.add(skyLayer());
  const tower = new JimsTower();
  // horizon: haze band + distant skyline silhouette + Big Jim's tower
  scene.add(
    stripLayer({
      id: 'distant',
      factor: 0.05,
      W: 3600,
      top: HORIZON_Y - 260,
      H: 300,
      res: 0.4,
      material: { base: '#7A6A78', shade: '#6A5A68', glow: CF.bulb, depth: 0.85 },
      paint: (p) => {
        const r = rng(31);
        let x = 0;
        while (x < p.W) {
          const w = 40 + r() * 90;
          const h = 60 + r() * 200 * (r() < 0.15 ? 1.4 : 1);
          p.body.fillRect(x, p.H - h, w, h);
          if (r() < 0.3) p.body.fillRect(x + w * 0.4, p.H - h - 30, 4, 30);
          for (let k = 0; k < 6; k++) if (r() < 0.4) p.glow.fillRect(x + 6 + r() * (w - 12), p.H - h + 10 + r() * (h - 20), 3, 4);
          x += w + r() * 10;
        }
      },
    }),
  );
  scene.add({
    id: 'tower',
    pass: 'back',
    draw: (g, cam, f) => {
      const v = layerView(cam, 0.05);
      const hy = screenY(v, HORIZON_Y);
      tower.draw(g, scene.towerX * VIEW_W, hy + 36, scene.towerScale, f.L, f.b);
    },
  });
  // far: rooftops, water towers, billboards (0.25)
  scene.add(
    stripLayer({
      id: 'far',
      factor: 0.25,
      W: 3200,
      top: HORIZON_Y - 330,
      H: 420,
      res: 0.5,
      material: { base: '#8A5A4E', shade: '#5E3A36', detail: '#2A1C1E', accent: '#6E7A6A', glow: CF.bulb, depth: 0.58 },
      paint: (p) => {
        const r = rng(8);
        let x = 0;
        while (x < p.W) {
          const w = 150 + r() * 220;
          const h = 120 + r() * 200;
          const y0 = p.H - h;
          for (const dx of x + w > p.W ? [0, -p.W] : [0]) {
            p.body.fillRect(x + dx, y0, w, h);
            p.shadeR.fillRect(x + dx + w * 0.72, y0, w * 0.28, h);
            p.shadeL.fillRect(x + dx, y0, w * 0.2, h);
            p.detail.fillRect(x + dx - 4, y0 - 8, w + 8, 8);
            p.rim.fillRect(x + dx, y0 - 8, w, 2);
            for (let wy = y0 + 20; wy < p.H - 16; wy += 30)
              for (let wx = x + 14; wx < x + w - 18; wx += 26) {
                p.detail.fillRect(wx + dx, wy, 12, 16);
                if (r() < 0.3) p.glow.fillRect(wx + dx + 1, wy + 1, 10, 14);
              }
            // water tower on stilts
            if (r() < 0.55) {
              const tx = x + dx + 20 + r() * (w - 80);
              p.detail.fillRect(tx + 4, y0 - 40, 3, 32);
              p.detail.fillRect(tx + 36, y0 - 40, 3, 32);
              p.detail.fillRect(tx + 20, y0 - 40, 3, 32);
              p.accent.beginPath();
              p.accent.moveTo(tx, y0 - 40);
              p.accent.lineTo(tx, y0 - 86);
              p.accent.lineTo(tx + 21, y0 - 100);
              p.accent.lineTo(tx + 43, y0 - 86);
              p.accent.lineTo(tx + 43, y0 - 40);
              p.accent.closePath();
              p.accent.fill();
              for (let k = 0; k < 3; k++) p.detail.fillRect(tx, y0 - 76 + k * 14, 43, 2);
            }
            // billboard frame
            if (r() < 0.3) {
              const bx = x + dx + r() * (w - 120);
              p.detail.fillRect(bx + 10, y0 - 70, 4, 70);
              p.detail.fillRect(bx + 100, y0 - 70, 4, 70);
              p.accent.fillRect(bx, y0 - 120, 115, 55);
              p.glow.fillRect(bx + 6, y0 - 114, 103, 6);
            }
          }
          x += w + 6 + r() * 30;
        }
      },
    }),
  );
  // mid: grindhouse facades (0.55)
  const FW = 3000;
  const mid = stripLayer({
    id: 'facades',
    factor: 0.55,
    W: FW,
    top: SEA_Y - 900,
    H: 820,
    res: 0.6,
    material: { base: CF.brick, shade: '#4A2820', detail: '#1A1210', accent: '#3A3A42', glow: CF.bulb, depth: 0.52 },
    paint: (p) => paintFacades(p.body, p.shadeL, p.shadeR, p.detail, p.accent, p.rim, p.glow, p.W, p.H, p.top, p.anchors),
    props: (g, v, f, layer) => facadeProps(g, v, f, layer),
  });
  scene.add(mid);
  // --- ambient life -----------------------------------------------------------------------
  const pigeons = mid.layer.anchors
    .filter((a) => a.kind === 'marquee')
    .map((a) => ({ kind: PIGEONS, x: a.x + (Math.floor(a.s / 10000) * 0.3), y: a.y - 22, s: 1 }));
  scene.add(
    new LifeLayer({
      id: 'life-facades',
      factor: 0.55,
      depth: 0.42,
      wrapW: FW,
      pinned: pigeons,
      rules: [{ kind: LETTER, on: 'riff', chance: 0.35, y: -380, ySpread: 60, from: 'view', max: 3 }],
    }),
  );
  // a background brawl outside the grindhouses (DESIGN §4 rule 6): punches land on the snare
  scene.add(
    new LifeLayer({
      id: 'life-brawl',
      factor: 0.62,
      depth: 0.42,
      wrapW: 2300,
      pinned: [
        { kind: BRAWLERS, x: 520, y: -30, s: 0.72 },
        { kind: BRAWLERS, x: 1650, y: -30, s: 0.68 },
        // jamming goons dancing on the backbeat outside the grindhouses (Rayman's jamming band)
        { kind: JAMMER, x: 1080, y: -30, s: 0.62 },
        { kind: JAMMER, x: 1150, y: -30, s: 0.6, dir: -1 },
        { kind: JAMMER, x: 2080, y: -30, s: 0.64 },
      ],
      rules: [],
    }),
  );
  scene.add(
    new LifeLayer({
      id: 'life-crowd',
      factor: 0.68,
      depth: 0.4,
      rules: [{ kind: PEDESTRIAN, every: 0.32, jitter: 0.6, y: -34, ySpread: 4, speed: 70, scale: 0.62, max: 14, prefill: 9 }],
    }),
  );
  scene.add(
    new LifeLayer({
      id: 'life-traffic',
      factor: 0.8,
      depth: 0.3,
      rules: [
        { kind: TAXI, every: 1.1, jitter: 0.5, y: -6, speed: 520, scale: 0.8, max: 3, prefill: 1 },
        { kind: SEDAN, every: 1.7, jitter: 0.5, y: -6, speed: 440, scale: 0.8, max: 2 },
        { kind: VAN, every: 5.5, jitter: 0.4, y: -6, speed: 420, scale: 0.8, max: 1 },
      ],
    }),
  );
  scene.add(
    new LifeLayer({
      id: 'life-gutter',
      factor: 0.86,
      depth: 0.25,
      rules: [{ kind: NEWSPAPER, every: 3.2, y: -14, speed: 160, dir: -1, max: 2 }],
    }),
  );
  // foreground: festoon bulbs across the top + manhole steam (1.3)
  scene.add({
    id: 'fg',
    pass: 'front',
    draw: (g, cam, f) => drawForeground(g, cam, f),
  });
  // fog/haze wash for interiors / night
  scene.add({
    id: 'haze',
    pass: 'front',
    draw: (g, _cam, f) => {
      if (f.L.fog < 0.02) return;
      const col = css(atmos(f.L, f.L.haze));
      for (let i = 0; i < 4; i++) {
        const x = ((hash(i) * VIEW_W + f.b.time * (10 + i * 6)) % (VIEW_W + 900)) - 450;
        drawGlow(g, x, VIEW_H * (0.35 + hash(i + 7) * 0.4), col, 520, f.L.fog * 0.16, false);
      }
    },
  });
  return scene;
}

function paintFacades(
  body: Ctx,
  shL: Ctx,
  shR: Ctx,
  det: Ctx,
  acc: Ctx,
  rim: Ctx,
  glow: Ctx,
  W: number,
  Ht: number,
  top: number,
  anchors: { kind: string; x: number; y: number; s: number }[],
) {
  const r = rng(42);
  const street = Ht - 10; // tile y of the sidewalk line
  let x = 0;
  let bill = 0;
  while (x < W - 200) {
    const theatre = bill < BILLS.length && r() < 0.7;
    const w = theatre ? 520 + r() * 120 : 260 + r() * 180;
    const h = 520 + r() * 220;
    const y0 = street - h;
    // building mass
    body.fillRect(x, y0, w, h);
    // brick courses (detail, faint)
    det.globalAlpha = 0.18;
    for (let by = y0 + 8; by < street; by += 12) {
      det.fillRect(x, by, w, 1.5);
      for (let bx = x + ((by / 12) % 2) * 14; bx < x + w; bx += 28) det.fillRect(bx, by - 10, 1.5, 10);
    }
    det.globalAlpha = 1;
    shR.fillRect(x + w - 26, y0, 26, h);
    shL.fillRect(x, y0, 18, h);
    // cornice
    det.fillRect(x - 8, y0 - 14, w + 16, 14);
    rim.fillRect(x - 8, y0 - 14, w + 16, 3);
    // upper windows (lit at night)
    const cols = Math.floor((w - 40) / 70);
    for (let wy = y0 + 40; wy < street - 260; wy += 90)
      for (let k = 0; k < cols; k++) {
        const wx = x + 30 + k * 70;
        det.fillRect(wx, wy, 40, 58);
        acc.fillRect(wx + 3, wy + 3, 34, 52);
        if (r() < 0.4) glow.fillRect(wx + 4, wy + 4, 32, 50);
        det.fillRect(wx + 18, wy, 4, 58);
        // fire escape landing
        if (k % 2 === 0) {
          det.fillRect(wx - 10, wy + 62, 60, 4);
          for (let s = 0; s < 6; s++) det.fillRect(wx - 10 + s * 12, wy + 46, 2, 18);
          det.fillRect(wx - 10, wy + 46, 60, 2);
        }
      }
    if (theatre) {
      // MARQUEE: lit board with heavy condensed lettering; bulbs are live props
      const mx = x + 40;
      const mw = w - 80;
      const my = street - 380;
      const mh = 100;
      det.fillRect(mx - 10, my - 10, mw + 20, mh + 20);
      // board at half glow: it sits right above the play band and must stay below the hero in value
      glow.globalAlpha = 0.5;
      glow.fillRect(mx, my, mw, mh);
      glow.globalAlpha = 1;
      const [title, sub] = BILLS[bill++];
      for (const c of [det, glow]) {
        c.save();
        if (c === glow) c.globalCompositeOperation = 'destination-out';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `${Math.min(62, (mw / title.length) * 1.75)}px ${MARQUEE_FONT}`;
        c.fillText(title, mx + mw / 2, my + mh * 0.4);
        c.font = `22px ${MARQUEE_FONT}`;
        c.fillText(sub, mx + mw / 2, my + mh * 0.82);
        c.restore();
      }
      // canopy under the marquee (dark soffit) keeps the play band behind the hero calm
      det.fillRect(mx - 30, my + mh + 10, mw + 60, 26);
      anchors.push({ kind: 'marquee', x: mx, y: top + my, s: mw * 10000 + mh });
      // vertical blade sign
      const bx = x + w - 70;
      det.fillRect(bx - 4, y0 + 40, 58, 240);
      acc.fillRect(bx, y0 + 44, 50, 232);
      anchors.push({ kind: 'blade', x: bx + 25, y: top + y0 + 44, s: bill });
      // entrance
      det.fillRect(x + w / 2 - 90, street - 140, 180, 140);
      glow.globalAlpha = 0.25;
      glow.fillRect(x + w / 2 - 80, street - 130, 160, 130);
      glow.globalAlpha = 1;
      det.fillRect(x + w / 2 - 2, street - 130, 4, 130);
      // poster cases
      for (const px of [x + 30, x + w - 110]) {
        det.fillRect(px, street - 150, 80, 110);
        acc.fillRect(px + 5, street - 145, 70, 100);
      }
    } else {
      // shopfront + neon sign
      det.fillRect(x + 20, street - 170, w - 40, 170);
      glow.globalAlpha = 0.3;
      glow.fillRect(x + 30, street - 150, w - 60, 110);
      glow.globalAlpha = 1;
      det.fillRect(x + 20, street - 44, w - 40, 6);
      // awning
      acc.beginPath();
      acc.moveTo(x + 10, street - 200);
      acc.lineTo(x + w - 10, street - 200);
      acc.lineTo(x + w - 30, street - 170);
      acc.lineTo(x + 30, street - 170);
      acc.closePath();
      acc.fill();
      for (let s = x + 20; s < x + w - 30; s += 30) det.fillRect(s, street - 200, 12, 30);
      anchors.push({ kind: 'neon', x: x + w / 2, y: top + street - 250, s: Math.floor(r() * 4) });
    }
    // alley gap
    x += w + 30 + r() * 80;
  }
}

const NEON_WORDS = ['POOL', 'BILLIARDS', 'OPEN', 'LIVE'];

function facadeProps(g: Ctx, v: import('../world/camera').LayerView, f: SceneFrame, layer: import('../world/tiledLayer').TiledLayer) {
  const L = f.L;
  const b = f.b;
  const d = 0.32;
  const kick = hit(b, 'kick', 0.1);
  const step = Math.floor(b.beat * 2); // chase on 8ths
  const bulbOn = css(atmos(L, H(CF.bulb), d * 0.3));
  const bulbOff = css(lit(L, H('#5A4A3A'), 0.5, d));
  // marquee bulbs chase on 8ths, all flash on the kick
  layer.eachAnchor(v, 'marquee', 600, (a, x) => {
    if (L.lamps < 0.05) return;
    const mw = Math.floor(a.s / 10000);
    const mh = a.s % 10000;
    const per = Math.round((2 * (mw + mh + 20)) / 18);
    for (let i = 0; i < per; i++) {
      const u = i / per;
      const P = u * 2 * (mw + mh + 20);
      let bx: number;
      let by: number;
      if (P < mw + 20) {
        bx = x - 10 + P;
        by = a.y - 10;
      } else if (P < mw + mh + 40) {
        bx = x + mw + 10;
        by = a.y - 10 + (P - mw - 20);
      } else if (P < 2 * mw + mh + 60) {
        bx = x + mw + 10 - (P - mw - mh - 40);
        by = a.y + mh + 10;
      } else {
        bx = x - 10;
        by = a.y + mh + 10 - (P - 2 * mw - mh - 60);
      }
      const on = kick > 0.4 || (i + step) % 3 === 0;
      g.fillStyle = on ? bulbOn : bulbOff;
      g.beginPath();
      g.arc(bx, by, 4, 0, TAU);
      g.fill();
      if (on && L.lamps > 0.2 && i % 2 === 0) drawGlow(g, bx, by, CF.bulb, 18, 0.5 * L.lamps);
    }
    drawGlow(g, x + mw / 2, a.y + mh / 2, CF.bulb, mw * 0.6, (0.15 + 0.2 * kick) * L.lamps);
  });
  // vertical blade signs: neon letters that tick/tilt on the cowbell
  const cb = b.since.cowbell;
  layer.eachAnchor(v, 'blade', 400, (a, x) => {
    const word = ['JIM', 'CUE', 'FURY', 'SHOW'][a.s % 4];
    const col = a.s % 2 ? CF.neonJade : CF.neonRose;
    const tilt = Math.exp(-cb / 0.2) * Math.sin(cb * 20) * 0.12;
    const buzz = hash(Math.floor(b.time * 24) + a.s) < 0.06 * (1 + hit(b, 'hat', 0.05) * 4) ? 0.4 : 1;
    const on = (0.35 + 0.65 * Math.max(L.lamps, L.accentAmt)) * buzz;
    g.save();
    g.font = `40px ${MARQUEE_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < word.length; i++) {
      const y = a.y + 30 + i * 52;
      g.save();
      g.translate(x, y);
      g.rotate(i % 2 ? tilt : -tilt);
      g.fillStyle = css(atmos(L, H(col), d * 0.3), on);
      g.fillText(word[i], 0, 0);
      g.restore();
      drawGlow(g, x, y, col, 50, on * 0.45);
    }
    g.restore();
  });
  // shop neon signs
  layer.eachAnchor(v, 'neon', 400, (a, x) => {
    const word = NEON_WORDS[a.s % NEON_WORDS.length];
    const col = a.s % 2 ? CF.neonRose : CF.neonJade;
    const buzz = hash(Math.floor(b.time * 24) * 3 + a.x) < 0.05 ? 0.3 : 1;
    const on = (0.3 + 0.7 * Math.max(L.lamps, L.accentAmt)) * buzz;
    g.save();
    g.font = `italic 46px ${MARQUEE_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = css(lit(L, H('#1A1210'), 0.4, d), 0.9);
    g.strokeText(word, x, a.y);
    g.fillStyle = css(atmos(L, H(col), d * 0.3), on);
    g.fillText(word, x, a.y);
    g.restore();
    drawGlow(g, x, a.y, col, 120, on * 0.35);
  });
}

function drawForeground(g: Ctx, cam: ArtCamera, f: SceneFrame) {
  const L = f.L;
  const b = f.b;
  const v = layerView(cam, 1.3);
  pushLayer(g, v);
  // festoon bulb strings sag across the street; they sway on the swung 8ths
  const span = 1400;
  const hat = hit(b, 'hat', 0.09);
  const topY = v.y0 + 30 / v.z;
  const wire = css(lit(L, H('#141010'), 0.3));
  for (let k = Math.floor(v.x0 / span) - 1; k <= Math.floor(v.x1 / span); k++) {
    const x0 = k * span;
    const x1 = x0 + span;
    const sag = 110 + hat * 10 + Math.sin(b.time * 2 + k) * 6;
    g.strokeStyle = wire;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x0, topY);
    g.quadraticCurveTo((x0 + x1) / 2, topY + sag * 2, x1, topY);
    g.stroke();
    for (let i = 1; i < 14; i++) {
      const u = i / 14;
      const bx = x0 + (x1 - x0) * u;
      const by = topY + sag * 2 * u * (1 - u) * 2 * 0.5 * 2;
      const sw = Math.sin(b.beat * Math.PI + i) * 0.12 * (0.4 + hat);
      const lx = bx + Math.sin(sw) * 16;
      const ly = by + 16;
      g.strokeStyle = wire;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(lx, ly);
      g.stroke();
      const lampOn = 0.35 + 0.65 * L.lamps;
      g.fillStyle = css(atmos(L, H(CF.bulb)), lampOn);
      g.beginPath();
      g.ellipse(lx, ly + 5, 6, 8, sw, 0, TAU);
      g.fill();
      drawGlow(g, lx, ly + 5, CF.bulb, 34, lampOn * 0.55);
    }
  }
  // manhole steam wisps rising from the street, puffing on the kick
  const steam = css(atmos(L, mix(H(CF.steam), L.haze, 0.3)));
  const kick = hit(b, 'kick', 0.25);
  for (let k = Math.floor(v.x0 / 1800); k <= Math.floor(v.x1 / 1800); k++) {
    const sx = k * 1800 + 600;
    for (let i = 0; i < 6; i++) {
      const u = fract(b.time * 0.35 + i / 6 + hash(k) * 0.3);
      puff(g, sx + Math.sin(u * 5 + i) * 30, SEA_Y + 60 - u * 360, 20 + u * 70, (1 - u) * (0.1 + kick * 0.08), steam);
    }
  }
  g.restore();
  void clamp01;
  void screenX;
}

// ------------------------------------------------------------------------------ play-layer ground

export interface StreetStyle {
  light: Lighting;
  version?: number;
  capL?: boolean;
  capR?: boolean;
}

const SEG = 512;
const SEG_H = 300;
let groundBake: TintBake | null = null;

function streetBake(): TintBake {
  if (groundBake) return groundBake;
  // 0 concrete, 1 brick, 2 mortar, 3 ink, 4 shade, 5 highlight, 6 grime
  const b = new TintBake(SEG, SEG_H + 24, 7);
  const [con, brick, mortar, ink, shade, hl, grime] = [0, 1, 2, 3, 4, 5, 6].map((i) => b.ch(i));
  for (const c of [con, brick, mortar, ink, shade, hl, grime]) c.translate(0, 24);
  const r = rng(77);
  // sidewalk slab (walkable top at y=0) + curb face
  con.fillRect(0, -2, SEG, 30);
  hl.globalAlpha = 0.9;
  hl.fillRect(0, -2, SEG, 4);
  hl.globalAlpha = 1;
  // slab joints + cracks + gum
  for (let x = 0; x < SEG; x += 128) {
    ink.fillRect(x, -2, 2, 22);
  }
  ink.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    let x = r() * SEG;
    let y = 2;
    ink.beginPath();
    ink.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 20;
      y += 4;
      ink.lineTo(x, y);
    }
    ink.stroke();
  }
  for (let i = 0; i < 10; i++) {
    grime.beginPath();
    grime.ellipse(r() * SEG, 4 + r() * 12, 2 + r() * 3, 1.5, 0, 0, TAU);
    grime.fill();
  }
  // the dark edge line under the walkable surface (readability rule)
  ink.fillRect(0, 20, SEG, 6);
  ink.fillRect(0, -5, SEG, 3);
  // brick foundation below
  brick.fillRect(0, 26, SEG, SEG_H);
  for (let y = 26; y < SEG_H; y += 16) {
    mortar.fillRect(0, y, SEG, 2.5);
    for (let x = ((y / 16) % 2) * 22; x < SEG; x += 44) mortar.fillRect(x, y, 2.5, 16);
  }
  for (let i = 0; i < 40; i++) {
    grime.globalAlpha = 0.3 + r() * 0.4;
    grime.fillRect(Math.floor(r() * 12) * 44 + ((r() * 2) | 0) * 22, 26 + Math.floor(r() * 16) * 16, 42, 14);
  }
  grime.globalAlpha = 1;
  const gr = shade.createLinearGradient(0, 26, 0, SEG_H);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.2, 'rgba(255,255,255,0.15)');
  gr.addColorStop(1, 'rgba(255,255,255,0.85)');
  shade.fillStyle = gr;
  shade.fillRect(0, 26, SEG, SEG_H);
  groundBake = b;
  return b;
}

/** Sidewalk + curb + brick foundation. rect.y = walkable surface; rect.h downwards. */
export function drawStreetGround(g: Ctx, rect: { x: number; y: number; w: number; h: number }, style: StreetStyle): void {
  const L = style.light;
  const b = streetBake();
  const cols = [
    css(lit(L, H('#8A8276'), 0.95)),
    css(lit(L, H(CF.brick), 0.85)),
    css(lit(L, H('#3A2A24'), 0.6)),
    CF.filmBlack,
    css(lit(L, H('#1A1210'), 0.2), 0.8),
    css(mix(lit(L, H('#C8C0B0'), 1.05), L.rim, 0.35 * L.rimAmt)),
    css(lit(L, H('#2A2220'), 0.4), 0.7),
  ];
  b.compose(cols);
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
  if (rect.h > SEG_H) {
    g.fillStyle = css(lit(L, H('#1A1210'), 0.3));
    g.fillRect(rect.x, rect.y + SEG_H - 1, rect.w, rect.h - SEG_H + 1);
  }
  // ends: dark ink caps
  g.fillStyle = CF.filmBlack;
  if (style.capL !== false) g.fillRect(rect.x - 3, rect.y - 5, 6, rect.h + 5);
  if (style.capR !== false) g.fillRect(x1 - 3, rect.y - 5, 6, rect.h + 5);
}

export type { RGB };
