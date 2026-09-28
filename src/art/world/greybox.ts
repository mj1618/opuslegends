/**
 * GREYBOX demo scene — built ONLY from the generic framework (skyLayer + stripLayer + props), to
 * show how a new theme plugs in. Far hills, a mid skyline with windows that light up at night, a
 * near street layer with lamps that pulse on the kick, and a soft-focus foreground.
 * Also registers the theme-neutral 'neutral' lighting set.
 */
import { hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { css, hex } from '../core/color';
import { drawGlow } from '../core/draw';
import { TAU, hash, rng } from '../core/math';
import { HORIZON_Y, SEA_Y, VIEW_H, VIEW_W, layerView, screenY } from './camera';
import { type LightingDirector, registerLights, atmos, lit } from './lighting';
import { noisyLine, polyTo } from './paint';
import { ParallaxScene, skyLayer, stripLayer } from './parallax';

const H = hex;

registerLights('neutral', {
  day: {},
  golden: {
    skyTop: H('#6E8FD0'),
    skyMid: H('#F6C58E'),
    skyLow: H('#FFE3B0'),
    glow: H('#FFD28A'),
    glowAmt: 0.8,
    sunX: 0.25,
    sunY: 0.4,
    sunR: 60,
    key: H('#FFD8A0'),
    amb: H('#8A74A0'),
    rim: H('#FFC477'),
    rimAmt: 0.9,
    haze: H('#F2CFAE'),
    lightDir: -1,
    lamps: 0.3,
  },
  dusk: {
    skyTop: H('#1E1C48'),
    skyMid: H('#6A3C6E'),
    skyLow: H('#E0806A'),
    glow: H('#F09A74'),
    glowAmt: 0.6,
    sunAmt: 0,
    starAmt: 0.4,
    key: H('#B09AC8'),
    amb: H('#3A3462'),
    rim: H('#F0A07A'),
    rimAmt: 0.7,
    haze: H('#4A3E6A'),
    hazeK: 0.6,
    cloud: H('#2A2850'),
    cloudLit: H('#C07080'),
    lamps: 0.85,
    lightDir: 1,
  },
  night: {
    skyTop: H('#05060F'),
    skyMid: H('#0F1330'),
    skyLow: H('#26284A'),
    glow: H('#3A3F7A'),
    glowAmt: 0.3,
    sunAmt: 0,
    moonAmt: 1,
    starAmt: 1,
    key: H('#7F8CC8'),
    amb: H('#22264A'),
    rim: H('#9FB0FF'),
    rimAmt: 0.6,
    haze: H('#1C2040'),
    hazeK: 0.6,
    cloud: H('#141833'),
    cloudLit: H('#3A4070'),
    cloudAmt: 0.6,
    lamps: 1,
    accent: H('#FF4FA3'),
    accentAmt: 0.5,
  },
  interior: {
    skyTop: H('#120C10'),
    skyMid: H('#24161A'),
    skyLow: H('#3A2420'),
    glow: H('#FFB35A'),
    glowAmt: 0.35,
    sunAmt: 0,
    cloudAmt: 0,
    key: H('#FFC890'),
    amb: H('#3A2630'),
    rim: H('#FF7FC0'),
    rimAmt: 0.8,
    haze: H('#2E1E22'),
    hazeK: 0.7,
    lamps: 1,
    accent: H('#FF4FA3'),
    accentAmt: 1,
    fog: 0.8,
  },
  storm: {
    skyTop: H('#23273F'),
    skyMid: H('#4B4E6D'),
    skyLow: H('#6E6F88'),
    sunAmt: 0,
    key: H('#B4B8D6'),
    amb: H('#3A3E5E'),
    haze: H('#555A78'),
    hazeK: 0.7,
    cloud: H('#2E3350'),
    cloudLit: H('#6E7194'),
    rain: 1,
    lightning: 1,
    lamps: 0.7,
    bgDesat: 0.45,
  },
});

export function makeGreybox(light: LightingDirector): ParallaxScene {
  const scene = new ParallaxScene(light);
  scene.add(skyLayer());
  // ground plane from the horizon down (lit, hazed toward the horizon)
  let gk = -1;
  let gg: CanvasGradient | null = null;
  scene.add({
    id: 'ground',
    pass: 'back',
    draw: (g, cam, f) => {
      const hy = screenY(layerView(cam, 0.08), HORIZON_Y);
      if (gk !== f.version || !gg) {
        gk = f.version;
        gg = g.createLinearGradient(0, 0, 0, 1);
        gg.addColorStop(0, css(atmos(f.L, f.L.haze)));
        gg.addColorStop(0.3, css(lit(f.L, H('#7C7A70'), 0.7, 0.6)));
        gg.addColorStop(1, css(lit(f.L, H('#4A4640'), 0.5, 0.2)));
      }
      g.save();
      g.translate(0, hy);
      g.scale(1, VIEW_H - hy + 2);
      g.fillStyle = gg;
      g.fillRect(0, 0, VIEW_W, 1);
      g.restore();
    },
  });

  // far hills (depth .75)
  scene.add(
    stripLayer({
      id: 'hills',
      factor: 0.12,
      W: 3000,
      top: HORIZON_Y - 180,
      H: 220,
      res: 0.5,
      material: { base: '#8FA37A', shade: '#6E7F62', accent: '#A7B98E', depth: 0.75 },
      paint: (p) => {
        for (let k = 0; k < 2; k++) {
          const pts = noisyLine(-50, 120 + k * 40, p.W + 50, 120 + k * 40, 60, 3 + k, 30);
          const path = new Path2D();
          path.moveTo(-50, p.H);
          polyTo(path, pts);
          path.lineTo(p.W + 50, p.H);
          path.closePath();
          (k ? p.body : p.accent).fill(path);
        }
      },
    }),
  );

  // mid skyline: generic blocks with windows (glow channel lights up with L.lamps)
  scene.add(
    stripLayer({
      id: 'skyline',
      factor: 0.3,
      W: 2800,
      top: HORIZON_Y - 420,
      H: 460,
      res: 0.6,
      material: { base: '#9AA0B4', shade: '#6A7086', detail: '#3A3E50', accent: '#B8866A', glow: '#FFD27A', depth: 0.5 },
      bump: { lane: 'kick', amount: 0.006 },
      paint: (p) => {
        const r = rng(4);
        let x = 0;
        while (x < p.W) {
          const w = 90 + r() * 170;
          const h = 140 + r() * 280;
          const y0 = p.H - h;
          for (const dx of x + w > p.W ? [0, -p.W] : [0]) {
            p.body.fillRect(x + dx, y0, w, h);
            p.shadeR.fillRect(x + dx + w * 0.7, y0, w * 0.3, h);
            p.shadeL.fillRect(x + dx, y0, w * 0.3, h);
            p.rim.fillRect(x + dx, y0, w, 3);
            p.detail.fillRect(x + dx - 3, y0 - 6, w + 6, 6);
            // windows
            for (let wy = y0 + 18; wy < p.H - 20; wy += 26)
              for (let wx = x + 12; wx < x + w - 16; wx += 22) {
                p.detail.fillRect(wx + dx, wy, 12, 15);
                if (r() < 0.45) p.glow.fillRect(wx + dx + 1, wy + 1, 10, 13);
              }
            if (r() < 0.35) {
              // rooftop tank / sign
              p.detail.fillRect(x + dx + w * 0.3, y0 - 40, 6, 34);
              p.accent.fillRect(x + dx + w * 0.2, y0 - 70, w * 0.5, 30);
            }
          }
          x += w + 8 + r() * 30;
        }
      },
    }),
  );

  // near street layer: poles + lamps (live glow, pulse on the kick)
  scene.add(
    stripLayer({
      id: 'street',
      factor: 0.6,
      W: 2400,
      top: SEA_Y - 520,
      H: 400,
      res: 0.75,
      material: { base: '#6C6A78', shade: '#4A4856', detail: '#2A2830', accent: '#8C5A4A', depth: 0.25 },
      paint: (p) => {
        const r = rng(9);
        // low wall + railing
        p.body.fillRect(0, p.H - 60, p.W, 60);
        p.rim.fillRect(0, p.H - 60, p.W, 3);
        for (let x = 0; x < p.W; x += 24) p.detail.fillRect(x, p.H - 110, 4, 50);
        p.detail.fillRect(0, p.H - 112, p.W, 5);
        for (let i = 0; i < 4; i++) {
          const x = 200 + i * 600 + r() * 80;
          p.detail.fillRect(x - 5, p.H - 380, 10, 320);
          p.detail.fillRect(x - 5, p.H - 380, 60, 8);
          p.anchors.push({ kind: 'lamp', x: x + 52, y: p.top + p.H - 368, s: 1 });
        }
      },
      props: (g, v, f, layer) => {
        const k = hit(f.b, 'kick', 0.15);
        layer.eachAnchor(v, 'lamp', 200, (a, x) => {
          g.fillStyle = css(atmos(f.L, H('#FFE9B0'), 0.2), 0.4 + 0.6 * f.L.lamps);
          g.beginPath();
          g.ellipse(x, a.y, 10, 6, 0, 0, TAU);
          g.fill();
          drawGlow(g, x, a.y + 6, '#FFD890', 90 + 40 * k, f.L.lamps * (0.6 + 0.4 * k));
        });
      },
    }),
  );

  // foreground (soft focus, bottom edge only)
  scene.add(
    stripLayer({
      id: 'fg',
      pass: 'front',
      factor: 1.3,
      W: 2600,
      top: SEA_Y - 40,
      H: 280,
      blur: 3,
      material: { base: '#1E2028', shade: '#14161C', depth: 0 },
      paint: (p) => {
        const r = rng(2);
        for (const cx of [300, 1300, 2000]) {
          for (let i = 0; i < 5; i++) {
            p.body.beginPath();
            p.body.ellipse(cx + (i - 2) * 60 + r() * 20, p.H, 50 + r() * 40, 60 + r() * 60, 0, Math.PI, TAU);
            p.body.fill();
            p.rim.beginPath();
            p.rim.ellipse(cx + (i - 2) * 60, p.H, 48, 58, 0, Math.PI * 1.2, Math.PI * 1.5);
            p.rim.lineWidth = 3;
            p.rim.stroke();
          }
        }
      },
    }),
  );

  // fog / smoke + vignette (uses L.fog)
  scene.add({
    id: 'fog',
    pass: 'front',
    draw: (g, _cam, f) => {
      const fog = f.L.fog;
      if (fog > 0.01) {
        const col = atmos(f.L, f.L.haze);
        for (let i = 0; i < 5; i++) {
          const x = ((hash(i) * VIEW_W + f.b.time * (12 + i * 5)) % (VIEW_W + 800)) - 400;
          drawGlow(g, x, VIEW_H * (0.3 + hash(i + 7) * 0.5), css(col), 500, fog * 0.18, false);
        }
      }
    },
  });
  return scene;
}

/** Simple inked play-layer block for greybox levels (world coords). */
export function drawGreyBlock(g: Ctx, x: number, y: number, w: number, h: number, L: import('./lighting').Lighting): void {
  g.fillStyle = css(lit(L, H('#B9B4A8'), 0.9));
  g.fillRect(x, y, w, h);
  g.fillStyle = css(lit(L, H('#8E897E'), 0.3), 0.6);
  g.fillRect(x, y + 18, w, h - 18);
  g.fillStyle = css(lit(L, H('#E8E2D2'), 1.05));
  g.fillRect(x, y, w, 6);
  g.strokeStyle = '#17161E';
  g.lineWidth = 4;
  g.strokeRect(x, y, w, h);
}
