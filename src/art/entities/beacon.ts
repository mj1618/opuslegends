/**
 * Checkpoint beacon — a channel marker (red can topmark, striped pole, brass lantern) on a
 * barnacled plinth. `lit` 0..1 = activation (lamp turns gold, rays, a teal claw pennant unfurls).
 * Origin = base centre on the ground. ~230 px tall.
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow, inkFill, sparkle } from '../core/draw';
import { TAU, clamp01, easeOut, hash, smooth } from '../core/math';
import { PAL } from '../palette';

export interface BeaconState {
  time: number;
  beatPhase: number;
  /** 0..1 bar phase (idle blink on the downbeat) */
  barPhase?: number;
  /** 0 = unlit .. 1 = lit */
  lit: number;
  /** seconds since activation (burst ring) */
  litTime?: number;
}

function towerSprite() {
  return sprite('beacon:tower', 120, 250, 60, 240, (g) => {
    // plinth
    g.beginPath();
    g.moveTo(-40, 0);
    g.lineTo(-34, -30);
    g.quadraticCurveTo(0, -38, 34, -30);
    g.lineTo(40, 0);
    g.closePath();
    inkFill(g, '#9A968C', 3);
    g.fillStyle = '#7C786F';
    g.fillRect(-38, -12, 76, 12);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(-30, -30, 30, 4);
    // barnacles + weed
    for (let i = 0; i < 9; i++) {
      const x = -32 + hash(i) * 64;
      const y = -4 - hash(i * 3) * 18;
      g.beginPath();
      g.arc(x, y, 2.5 + hash(i * 7) * 2, 0, TAU);
      g.fillStyle = '#D8D2C2';
      g.fill();
      g.strokeStyle = '#4A463F';
      g.lineWidth = 1;
      g.stroke();
    }
    g.fillStyle = PAL.kelp;
    g.beginPath();
    g.moveTo(-40, 0);
    g.quadraticCurveTo(-30, -14, -18, -2);
    g.quadraticCurveTo(-8, -10, 6, 0);
    g.fill();
    // pole with red/white bands
    g.beginPath();
    g.rect(-8, -170, 16, 140);
    inkFill(g, '#F4F0E6', 3);
    g.fillStyle = PAL.beaconRed;
    for (let i = 0; i < 4; i++) g.fillRect(-8, -170 + i * 36, 16, 18);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(3, -170, 5, 140);
    // ladder rungs
    g.strokeStyle = '#5A5A60';
    g.lineWidth = 2;
    for (let y = -160; y < -36; y += 12) {
      g.beginPath();
      g.moveTo(8, y);
      g.lineTo(14, y + 2);
      g.stroke();
    }
    // gallery
    g.beginPath();
    g.rect(-22, -178, 44, 8);
    inkFill(g, '#3A3A40', 2.5);
    // lantern cage (glass drawn live)
    g.strokeStyle = PAL.outline;
    g.lineWidth = 5;
    g.strokeRect(-14, -206, 28, 28);
    g.strokeStyle = '#B8923A';
    g.lineWidth = 2.5;
    g.strokeRect(-14, -206, 28, 28);
    g.beginPath();
    g.moveTo(0, -206);
    g.lineTo(0, -178);
    g.stroke();
    // roof
    g.beginPath();
    g.moveTo(-18, -206);
    g.lineTo(0, -218);
    g.lineTo(18, -206);
    g.closePath();
    inkFill(g, '#3A3A40', 2.5);
    // red can topmark
    g.beginPath();
    g.rect(-9, -238, 18, 18);
    inkFill(g, PAL.beaconRed, 2.5);
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fillRect(-6, -236, 4, 14);
  });
}

export function drawBeacon(g: Ctx, x: number, y: number, s: BeaconState): void {
  const lit = clamp01(s.lit);
  const beat = Math.exp(-s.beatPhase * 5);
  const lx = x;
  const ly = y - 192;
  // beams / rays behind when lit
  if (lit > 0.01) {
    g.save();
    g.translate(lx, ly);
    g.rotate(s.time * 0.6);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,210,120,${0.12 * lit})`;
    for (let i = 0; i < 6; i++) {
      g.rotate(TAU / 6);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(220, -18);
      g.lineTo(220, 18);
      g.closePath();
      g.fill();
    }
    g.restore();
    g.globalCompositeOperation = 'source-over';
  }
  drawSprite(g, towerSprite(), x, y);
  // lamp glass
  const blink = s.barPhase !== undefined ? Math.exp(-s.barPhase * 8) : 0;
  const glassCol = lit > 0.5 ? '#FFE9A8' : blink > 0.3 ? '#FF8A7A' : '#6E8F92';
  g.fillStyle = glassCol;
  g.fillRect(lx - 11.5, ly - 11.5, 10.5, 23);
  g.fillRect(lx + 1, ly - 11.5, 10.5, 23);
  drawGlow(g, lx, ly, '#FFD37A', 60 + 50 * lit + beat * 20 * lit, lit * 0.9 + blink * 0.4 * (1 - lit));
  if (lit > 0.01) drawGlow(g, lx, ly, '#FFFFFF', 24, lit);
  // pennant (teal, white claw emblem) unfurls
  if (lit > 0.01) {
    const u = easeOut(clamp01(lit * 1.3));
    const L = 70 * u;
    const w = Math.sin(s.time * 8) * 5;
    const px = x + 8;
    const py = y - 168;
    g.beginPath();
    g.moveTo(px, py);
    g.bezierCurveTo(px + L * 0.4, py - 4 + w, px + L * 0.7, py + 4 - w, px + L, py + 10 + w);
    g.bezierCurveTo(px + L * 0.7, py + 18 - w, px + L * 0.4, py + 22 + w, px, py + 26);
    g.closePath();
    inkFill(g, PAL.seaTeal, 2.4);
    if (u > 0.6) {
      g.fillStyle = '#FFFFFF';
      g.beginPath();
      g.ellipse(px + L * 0.42, py + 13, 7, 5, -0.5, 0, TAU);
      g.fill();
      g.fillStyle = PAL.seaTeal;
      g.beginPath();
      g.moveTo(px + L * 0.42 + 2, py + 11);
      g.lineTo(px + L * 0.42 + 9, py + 7);
      g.lineTo(px + L * 0.42 + 4, py + 13);
      g.fill();
    }
  }
  const lt = s.litTime;
  if (lt !== undefined && lt >= 0 && lt < 0.8) {
    const k = lt / 0.8;
    g.save();
    g.globalAlpha = 1 - k;
    g.strokeStyle = PAL.gold;
    g.lineWidth = 6 * (1 - k);
    g.beginPath();
    g.arc(lx, ly, 20 + 200 * easeOut(k), 0, TAU);
    g.stroke();
    g.restore();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      const d = 30 + 120 * easeOut(k);
      sparkle(g, lx + Math.cos(a) * d, ly + Math.sin(a) * d, 12 * (1 - smooth(k)), a, 1 - k);
    }
  }
}
