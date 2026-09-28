/**
 * BIG JIM — first sketch of the boss (DESIGN §6.1). A colossal barnacle-crusted, kelp-draped king
 * crab that passes for a sea stack while asleep. Layered + cached: shell (with crust, barnacles,
 * kelp, spines, gull nests) and each claw (palm + movable finger) are sprites; eyes, toothpick,
 * nest gulls and claw motion are live.
 *
 * Origin = shell base centre at the waterline. Shell ~1120 x 720 px at scale 1; claws rise ~700 px.
 * `wake` 0 = asleep (a stack: lids shut, claws under water) .. 1 = awake (glaring, claws up).
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow, inkFill } from '../core/draw';
import { TAU, clamp01, easeOut, hash, lerp, rng, smooth } from '../core/math';
import { PAL } from '../palette';

export interface BigJimState {
  time: number;
  beatPhase?: number;
  /** 0 asleep .. 1 awake */
  wake: number;
  /** 0..1 raise per claw (default = wake) */
  clawL?: number;
  clawR?: number;
  /** 0..1 pincer gape per claw */
  gapeL?: number;
  gapeR?: number;
  /** eye look -1..1 */
  lookX?: number;
  lookY?: number;
  /** 0..1 rumble shake */
  rumble?: number;
  scale?: number;
}

const RES = 0.6;
const O = PAL.outline;

function shellPath(g: Ctx, r: () => number) {
  // craggy dome, taller at centre-left, spiny ridge
  const pts: number[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = lerp(-560, 560, u);
    const dome = Math.sin(Math.PI * u) ** 0.8;
    const peak = Math.exp(-(((u - 0.46) / 0.16) ** 2)) * 120;
    const crag = (r() - 0.5) * 34 * dome;
    pts.push(x, -(dome * 560 + peak + crag) - 20);
  }
  g.beginPath();
  g.moveTo(-600, 20);
  for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.lineTo(600, 20);
  g.closePath();
  return pts;
}

function shellSprite() {
  return sprite(
    'bigjim:shell',
    1300,
    860,
    650,
    800,
    (g) => {
      const r = rng(77);
      // back walking legs (spiky, half-submerged)
      for (let sd = -1; sd <= 1; sd += 2) {
        for (let i = 0; i < 3; i++) {
          const hx = sd * (380 + i * 60);
          const hy = -120 + i * 30;
          const kx = sd * (560 + i * 50);
          const ky = -260 + i * 50;
          const fx = sd * (620 + i * 30);
          g.lineCap = 'round';
          g.strokeStyle = O;
          g.lineWidth = 46;
          g.beginPath();
          g.moveTo(hx, hy);
          g.lineTo(kx, ky);
          g.lineTo(fx, 40);
          g.stroke();
          g.strokeStyle = i % 2 ? '#6E2420' : '#7C2A25';
          g.lineWidth = 36;
          g.stroke();
          g.fillStyle = PAL.magenta;
          for (let k = 0; k < 3; k++) {
            const px = lerp(kx, fx, 0.2 + k * 0.25);
            const py = lerp(ky, 40, 0.2 + k * 0.25);
            g.beginPath();
            g.moveTo(px + sd * 16, py - 6);
            g.lineTo(px + sd * 34, py - 16);
            g.lineTo(px + sd * 16, py + 8);
            g.fill();
          }
        }
      }
      // spines along the ridge (drawn before the shell so bases tuck under)
      const pts = shellPath(g, rng(5));
      for (let i = 2; i < pts.length - 2; i += 2) {
        if (i % 4 !== 0) continue;
        const x = pts[i];
        const y = pts[i + 1];
        const nx = pts[i + 2] - pts[i - 2];
        const ny = pts[i + 3] - pts[i - 1];
        const d = Math.hypot(nx, ny) || 1;
        const ox = ny / d;
        const oy = -nx / d;
        const L = 34 + r() * 22;
        g.beginPath();
        g.moveTo(x - (nx / d) * 12, y - (ny / d) * 12);
        g.lineTo(x + ox * L, y + oy * L);
        g.lineTo(x + (nx / d) * 12, y + (ny / d) * 12);
        g.closePath();
        g.fillStyle = '#6E2420';
        g.fill();
        g.strokeStyle = O;
        g.lineWidth = 4;
        g.stroke();
        g.beginPath();
        g.moveTo(x + ox * L * 0.55 - (nx / d) * 5, y + oy * L * 0.55 - (ny / d) * 5);
        g.lineTo(x + ox * L, y + oy * L);
        g.lineTo(x + ox * L * 0.55 + (nx / d) * 5, y + oy * L * 0.55 + (ny / d) * 5);
        g.fillStyle = PAL.magenta;
        g.fill();
      }
      // shell
      shellPath(g, rng(5));
      g.lineWidth = 10;
      g.strokeStyle = O;
      g.stroke();
      const gr = g.createLinearGradient(0, -700, 0, 20);
      gr.addColorStop(0, '#A8443A');
      gr.addColorStop(0.5, PAL.jimShell);
      gr.addColorStop(1, '#4E1A18');
      g.fillStyle = gr;
      g.fill();
      g.save();
      shellPath(g, rng(5));
      g.clip();
      // ochre barnacle crust patches (asleep he is a rock)
      for (let i = 0; i < 26; i++) {
        const x = (r() - 0.5) * 1000;
        const y = -60 - r() * 620;
        const rad = 50 + r() * 110;
        g.fillStyle = i % 3 ? PAL.jimOchre : '#B39469';
        g.beginPath();
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * TAU;
          const rr = rad * (0.7 + r() * 0.4);
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr * 0.7;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
      }
      // strata cracks
      g.strokeStyle = 'rgba(40,20,14,0.5)';
      g.lineWidth = 4;
      for (let i = 0; i < 16; i++) {
        let x = (r() - 0.5) * 900;
        let y = -80 - r() * 560;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += (r() - 0.5) * 80;
          y += 20 + r() * 40;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      // barnacles
      for (let i = 0; i < 140; i++) {
        const x = (r() - 0.5) * 1060;
        const y = -30 - r() * 660;
        const rad = 5 + r() * 11;
        g.fillStyle = '#E6DDC8';
        g.beginPath();
        g.moveTo(x - rad, y + rad * 0.5);
        g.lineTo(x - rad * 0.45, y - rad * 0.7);
        g.lineTo(x + rad * 0.45, y - rad * 0.7);
        g.lineTo(x + rad, y + rad * 0.5);
        g.closePath();
        g.fill();
        g.strokeStyle = '#4A3A2C';
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = '#3A2A20';
        g.beginPath();
        g.ellipse(x, y - rad * 0.55, rad * 0.35, rad * 0.14, 0, 0, TAU);
        g.fill();
      }
      // light from upper-left, shadow right
      const sh = g.createLinearGradient(-560, 0, 560, 0);
      sh.addColorStop(0, 'rgba(255,230,190,0.18)');
      sh.addColorStop(0.5, 'rgba(0,0,0,0)');
      sh.addColorStop(1, 'rgba(30,10,20,0.4)');
      g.fillStyle = sh;
      g.fillRect(-620, -800, 1240, 840);
      // wet dark base
      const wb = g.createLinearGradient(0, -140, 0, 20);
      wb.addColorStop(0, 'rgba(20,30,30,0)');
      wb.addColorStop(1, 'rgba(20,30,30,0.6)');
      g.fillStyle = wb;
      g.fillRect(-620, -140, 1240, 160);
      g.restore();
      // kelp draping from the ridge
      for (let i = 0; i < 9; i++) {
        const u = 0.1 + i * 0.1;
        const x = lerp(-560, 560, u) + (r() - 0.5) * 30;
        const top = -(Math.sin(Math.PI * u) ** 0.8 * 560) - 40;
        const len = 160 + r() * 260;
        g.beginPath();
        g.moveTo(x - 14, top);
        let px = x;
        for (let k = 1; k <= 8; k++) {
          px = x + Math.sin(k * 1.3 + i) * 12;
          g.lineTo(px - 10 + k * 0.6, top + (len * k) / 8);
        }
        for (let k = 8; k >= 0; k--) {
          px = x + Math.sin(k * 1.3 + i) * 12;
          g.lineTo(px + 10 - k * 0.6, top + (len * k) / 8);
        }
        g.closePath();
        g.fillStyle = i % 2 ? PAL.kelp : '#4E7046';
        g.fill();
        g.strokeStyle = '#223522';
        g.lineWidth = 3;
        g.stroke();
      }
      // gull nests on the back
      for (const [nx, ny] of [
        [-120, -700],
        [210, -610],
      ]) {
        g.fillStyle = '#6B5436';
        g.beginPath();
        g.ellipse(nx, ny, 58, 20, 0, 0, TAU);
        g.fill();
        g.strokeStyle = '#3E2E1C';
        g.lineWidth = 3;
        for (let k = 0; k < 14; k++) {
          const a = r() * Math.PI;
          g.beginPath();
          g.moveTo(nx - 58 + r() * 116, ny - 6 + r() * 12);
          g.lineTo(nx - 58 + r() * 116 + Math.cos(a) * 30, ny + Math.sin(a) * 10);
          g.stroke();
        }
      }
      // face plate (mouthparts) — the live face sits on it
      g.beginPath();
      g.ellipse(0, -230, 150, 110, 0, 0, TAU);
      g.fillStyle = '#6E2420';
      g.fill();
      g.strokeStyle = O;
      g.lineWidth = 6;
      g.stroke();
      g.strokeStyle = '#3A1210';
      g.lineWidth = 5;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(k * 26, -200);
        g.quadraticCurveTo(k * 30, -150, k * 22, -128);
        g.stroke();
      }
    },
    RES,
  );
}

function palmSprite() {
  return sprite(
    'bigjim:palm',
    520,
    760,
    260,
    720,
    (g) => {
      const r = rng(9);
      // forearm rising from the sea
      g.beginPath();
      g.moveTo(-90, 40);
      g.bezierCurveTo(-110, -120, -120, -220, -140, -300);
      g.lineTo(90, -300);
      g.bezierCurveTo(90, -200, 80, -100, 90, 40);
      g.closePath();
      inkFill(g, '#7C2A25', 6);
      // palm (fixed finger on the right edge, pointing up)
      g.beginPath();
      g.moveTo(-170, -280);
      g.bezierCurveTo(-210, -380, -190, -520, -110, -560);
      g.bezierCurveTo(-60, -585, 0, -580, 40, -560);
      // fixed finger up to its tip
      g.bezierCurveTo(70, -600, 110, -660, 150, -700);
      g.bezierCurveTo(170, -640, 170, -520, 140, -420);
      g.bezierCurveTo(120, -330, 60, -270, -40, -260);
      g.bezierCurveTo(-110, -255, -150, -260, -170, -280);
      g.closePath();
      g.lineWidth = 16;
      g.strokeStyle = O;
      g.stroke();
      const gr = g.createLinearGradient(-200, -560, 160, -300);
      gr.addColorStop(0, '#B0483C');
      gr.addColorStop(0.5, PAL.jimShell);
      gr.addColorStop(1, '#4E1A18');
      g.fillStyle = gr;
      g.fill();
      g.save();
      g.clip();
      for (let i = 0; i < 9; i++) {
        g.fillStyle = PAL.jimOchre;
        g.globalAlpha = 0.8;
        g.beginPath();
        g.ellipse(-150 + r() * 200, -300 - r() * 240, 30 + r() * 40, 18 + r() * 24, r(), 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 40; i++) {
        const x = -170 + r() * 260;
        const y = -280 - r() * 280;
        g.fillStyle = '#E6DDC8';
        g.beginPath();
        g.arc(x, y, 4 + r() * 6, 0, TAU);
        g.fill();
        g.fillStyle = '#3A2A20';
        g.beginPath();
        g.arc(x, y - 1, 1.8, 0, TAU);
        g.fill();
      }
      g.restore();
      // magenta cutting edge on the fixed finger
      g.fillStyle = PAL.magenta;
      g.strokeStyle = O;
      g.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const u = k / 6;
        const x = lerp(50, 140, u);
        const y = lerp(-560, -690, u);
        g.beginPath();
        g.moveTo(x - 12, y + 6);
        g.lineTo(x - 30, y - 6);
        g.lineTo(x - 6, y - 12);
        g.closePath();
        g.fill();
        g.stroke();
      }
      // gloss
      g.fillStyle = 'rgba(255,220,200,0.25)';
      g.beginPath();
      g.ellipse(-120, -470, 30, 70, 0.3, 0, TAU);
      g.fill();
    },
    RES,
  );
}

function dactylSprite() {
  // movable finger, pivot at (0,0), pointing up
  return sprite(
    'bigjim:dactyl',
    260,
    380,
    130,
    340,
    (g) => {
      g.beginPath();
      g.moveTo(-40, 10);
      g.bezierCurveTo(-80, -100, -70, -240, 10, -320);
      g.bezierCurveTo(20, -250, 30, -120, 40, 0);
      g.closePath();
      g.lineWidth = 16;
      g.strokeStyle = O;
      g.stroke();
      const gr = g.createLinearGradient(-60, 0, 40, 0);
      gr.addColorStop(0, '#B0483C');
      gr.addColorStop(1, '#5E201C');
      g.fillStyle = gr;
      g.fill();
      g.fillStyle = PAL.magenta;
      g.strokeStyle = O;
      g.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const y = -40 - k * 44;
        const x = 30 - k * 3 - (k > 3 ? (k - 3) * 6 : 0);
        g.beginPath();
        g.moveTo(x - 4, y + 12);
        g.lineTo(x + 18, y);
        g.lineTo(x - 4, y - 12);
        g.closePath();
        g.fill();
        g.stroke();
      }
      g.fillStyle = 'rgba(255,220,200,0.25)';
      g.beginPath();
      g.ellipse(-30, -150, 12, 60, 0.1, 0, TAU);
      g.fill();
    },
    RES,
  );
}

function drawClaw(g: Ctx, x: number, raise: number, gape: number, side: number, time: number) {
  const k = easeOut(clamp01(raise));
  const y = (1 - k) * 760;
  const sway = Math.sin(time * 1.3 + side) * 0.03 * k;
  g.save();
  g.translate(x, y);
  g.rotate(sway + side * -0.08);
  g.scale(side, 1);
  // movable finger (behind the palm, on the inner edge), pivot near the palm top
  g.save();
  g.translate(-60, -560);
  g.rotate(-0.1 - gape * 0.7);
  drawSprite(g, dactylSprite(), 0, 0);
  g.restore();
  drawSprite(g, palmSprite(), 0, 0);
  g.restore();
}

function eye(g: Ctx, x: number, y: number, open: number, lx: number, ly: number, sd: number, time: number) {
  // short thick stalk
  g.lineCap = 'round';
  g.strokeStyle = O;
  g.lineWidth = 30;
  g.beginPath();
  g.moveTo(x - sd * 10, y + 50);
  g.lineTo(x, y);
  g.stroke();
  g.strokeStyle = '#7C2A25';
  g.lineWidth = 20;
  g.stroke();
  // tiny mean eye
  g.beginPath();
  g.ellipse(x, y, 20, 17, 0, 0, TAU);
  inkFill(g, '#F6E27A', 4);
  if (open > 0.05) {
    g.fillStyle = '#120A08';
    g.beginPath();
    g.ellipse(x + lx * 6, y + ly * 5, 4, 10 * open, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.arc(x - 7, y - 7, 3, 0, TAU);
    g.fill();
  }
  // heavy lid + brow (angled into a scowl)
  g.save();
  g.beginPath();
  g.ellipse(x, y, 21, 18, 0, 0, TAU);
  g.clip();
  g.fillStyle = '#8C2F2A';
  const lidY = y - 18 + (1 - open) * 36 + 10 * open;
  g.beginPath();
  g.moveTo(x - 30, y - 30);
  g.lineTo(x + 30, y - 30);
  g.lineTo(x + 30, lidY + sd * 8 * open);
  g.lineTo(x - 30, lidY - sd * 8 * open);
  g.closePath();
  g.fill();
  g.restore();
  g.strokeStyle = O;
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(x - 26, y - 20 - sd * 10);
  g.lineTo(x + 26, y - 20 + sd * 10);
  g.stroke();
  void time;
}

export function drawBigJim(g: Ctx, x: number, y: number, s: BigJimState): void {
  const sc = s.scale ?? 1;
  const w = clamp01(s.wake);
  const rum = (s.rumble ?? 0) * 6;
  const t = s.time;
  const beat = Math.exp(-(s.beatPhase ?? 0) * 5);
  g.save();
  g.translate(x + Math.sin(t * 43) * rum, y + Math.cos(t * 37) * rum);
  g.scale(sc, sc);
  // breathing (asleep: slow; awake: on the beat)
  const breathe = lerp(Math.sin(t * 0.8) * 0.006, beat * 0.012, w);
  g.save();
  g.scale(1 + breathe, 1 - breathe);
  drawSprite(g, shellSprite(), 0, 0);
  g.restore();
  // nest gulls (bob on 8ths)
  for (const [nx, ny, ph] of [
    [-140, -712, 0],
    [-96, -716, 1],
    [196, -622, 2],
  ]) {
    const b = Math.abs(Math.sin(t * 8 + ph)) * 5;
    g.beginPath();
    g.ellipse(nx, ny - 18 - b, 16, 14, 0, 0, TAU);
    inkFill(g, PAL.gullWhite, 3);
    g.beginPath();
    g.moveTo(nx + 12, ny - 22 - b);
    g.lineTo(nx + 30, ny - 18 - b);
    g.lineTo(nx + 12, ny - 14 - b);
    g.closePath();
    inkFill(g, PAL.gullBeak, 2);
    g.fillStyle = '#111';
    g.beginPath();
    g.arc(nx + 5, ny - 22 - b, 2.6, 0, TAU);
    g.fill();
  }
  // face: eyes + driftwood toothpick
  const open = smooth(w);
  eye(g, -70, -350, open, s.lookX ?? -0.5, s.lookY ?? 0.3, -1, t);
  eye(g, 70, -350, open, s.lookX ?? -0.5, s.lookY ?? 0.3, 1, t);
  if (w > 0.5) {
    drawGlow(g, -70, -350, PAL.magenta, 60, (w - 0.5) * 0.5);
    drawGlow(g, 70, -350, PAL.magenta, 60, (w - 0.5) * 0.5);
  }
  g.save();
  g.translate(30, -170);
  g.rotate(-0.35 + Math.sin(t * 2) * 0.05 + beat * 0.05 * w);
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(170, -4);
  g.lineTo(176, 2);
  g.lineTo(0, 7);
  g.closePath();
  inkFill(g, '#B79A72', 4);
  g.strokeStyle = 'rgba(78,58,44,0.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(20, 0);
  g.lineTo(150, 0);
  g.stroke();
  g.restore();
  // snore bubbles / steam when asleep
  if (w < 0.5) {
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.4 + i / 3) % 1;
      g.globalAlpha = (1 - u) * (1 - w * 2);
      g.strokeStyle = O;
      g.lineWidth = 3;
      g.fillStyle = 'rgba(232,251,247,0.7)';
      g.beginPath();
      g.arc(-20 + Math.sin(u * 6 + i) * 20, -140 - u * 120, 8 + u * 16, 0, TAU);
      g.fill();
      g.stroke();
      g.globalAlpha = 1;
    }
  }
  // claws rise from the sea either side
  drawClaw(g, -760, s.clawL ?? w, s.gapeL ?? 0.2 + beat * 0.2 * w, -1, t);
  drawClaw(g, 760, s.clawR ?? w, s.gapeR ?? 0.2 + beat * 0.2 * w, 1, t);
  g.restore();
  void hash;
}
