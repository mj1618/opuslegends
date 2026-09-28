/**
 * Wave Flat — a stage cut-out of the chart's engraved curly waves on a stagehand's pole (§5.4).
 * `down` 1 = slammed onto the water (solid), 0 = lifted and turned edge-on (intangible).
 * `clack` 0..1 = the rim-clack telegraph flash (1 beat before each slam).
 * Origin = centre of the standing surface (top rim) in the DOWN position.
 */
import { type Ctx, drawSprite, sprite } from '../core/canvas';
import { drawGlow, puff } from '../core/draw';
import { TAU, clamp01 } from '../core/math';
import { PAL } from '../palette';

export interface WaveFlatState {
  time: number;
  /** 0 = up (intangible) .. 1 = down (solid) */
  down: number;
  /** 0..1 telegraph flash */
  clack?: number;
  /** seconds since the last slam (splash); undefined = none */
  slam?: number;
  width?: number;
}

/**
 * Standard Wave-Flat timing for set 'A' (down on beats 1 & 3) / 'B' (2 & 4): solid from the beat
 * until the "and", lifted on the offbeat. Returns the draw params for a float beat.
 */
export function waveFlatTiming(beat: number, set: 'A' | 'B'): { down: number; clack: number; slam: number | undefined; solid: boolean } {
  const phase = set === 'A' ? 0 : 1;
  const b = beat - phase;
  const inPair = ((b % 2) + 2) % 2; // 0..2 : 0 = slam beat
  const solid = inPair < 0.5;
  // travel: slam down fast right on the beat, lift on the "and"
  let down: number;
  if (inPair < 0.5) down = 1;
  else if (inPair < 0.7) down = 1 - (inPair - 0.5) / 0.2;
  else if (inPair < 1.85) down = 0;
  else down = Math.pow((inPair - 1.85) / 0.15, 2);
  const clack = inPair >= 1 && inPair < 1.25 ? 1 - (inPair - 1) / 0.25 : 0;
  const slam = inPair < 1 ? inPair * (60 / 160) : undefined;
  return { down, clack, slam, solid };
}

function boardSprite(W: number) {
  const H = 64;
  return sprite(`waveflat:${W}`, W + 20, H + 50, W / 2 + 10, 30, (g) => {
    const n = Math.max(2, Math.round(W / 70));
    const cw = W / n;
    const path = () => {
      g.beginPath();
      g.moveTo(-W / 2, H);
      g.lineTo(-W / 2, 8);
      for (let i = 0; i < n; i++) {
        const x0 = -W / 2 + i * cw;
        // a curling crest: rise, curl over into a spiral hook
        g.bezierCurveTo(x0 + cw * 0.3, 6, x0 + cw * 0.45, -10, x0 + cw * 0.7, -12);
        g.bezierCurveTo(x0 + cw * 0.95, -13, x0 + cw * 1.02, 2, x0 + cw * 0.84, 4);
        g.bezierCurveTo(x0 + cw * 0.74, 5, x0 + cw * 0.72, -4, x0 + cw * 0.8, -3);
        g.bezierCurveTo(x0 + cw * 0.9, 2, x0 + cw * 0.98, 8, x0 + cw, 8);
      }
      g.lineTo(W / 2, H);
      g.closePath();
    };
    // board
    path();
    g.lineWidth = 7;
    g.strokeStyle = PAL.ink;
    g.stroke();
    const gr = g.createLinearGradient(0, -12, 0, H);
    gr.addColorStop(0, '#CFE7DF');
    gr.addColorStop(0.3, PAL.seaWash);
    gr.addColorStop(1, '#6E9E98');
    g.fillStyle = gr;
    g.fill();
    // engraving: parallel wave hatch lines
    g.save();
    path();
    g.clip();
    g.strokeStyle = 'rgba(43,35,32,0.55)';
    g.lineWidth = 1.6;
    for (let row = 0; row < 6; row++) {
      const y = 14 + row * 9;
      g.beginPath();
      for (let x = -W / 2; x <= W / 2; x += 4) {
        const yy = y + Math.sin((x / cw) * TAU + row * 0.6) * 3;
        if (x === -W / 2) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.stroke();
    }
    // crest curls (parchment highlight)
    g.strokeStyle = PAL.parchment;
    g.lineWidth = 3;
    for (let i = 0; i < n; i++) {
      const x0 = -W / 2 + i * cw;
      g.beginPath();
      g.moveTo(x0 + cw * 0.2, 8);
      g.quadraticCurveTo(x0 + cw * 0.5, -6, x0 + cw * 0.72, -7);
      g.stroke();
    }
    g.restore();
    // bright top rim (readability rule)
    g.strokeStyle = 'rgba(255,248,225,0.9)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-W / 2 + 3, 9);
    g.lineTo(W / 2 - 3, 9);
    g.stroke();
    // wooden cleat + bolts
    g.fillStyle = PAL.woodDark;
    g.fillRect(-10, H - 10, 20, 12);
    g.fillStyle = '#C9B48A';
    g.beginPath();
    g.arc(-5, H - 4, 2, 0, TAU);
    g.arc(5, H - 4, 2, 0, TAU);
    g.fill();
  });
}

function backSprite(W: number) {
  return sprite(`waveflatback:${W}`, W + 20, 60, W / 2 + 10, 30, (g) => {
    g.beginPath();
    g.rect(-W / 2, -8, W, 16);
    g.lineWidth = 6;
    g.strokeStyle = PAL.ink;
    g.stroke();
    g.fillStyle = PAL.woodLight;
    g.fill();
    g.strokeStyle = 'rgba(78,58,44,0.6)';
    g.lineWidth = 1.5;
    for (let x = -W / 2 + 18; x < W / 2; x += 26) {
      g.beginPath();
      g.moveTo(x, -8);
      g.lineTo(x + 6, 8);
      g.stroke();
    }
  });
}

export function drawWaveFlat(g: Ctx, x: number, y: number, s: WaveFlatState): void {
  const W = s.width ?? 200;
  const d = clamp01(s.down);
  const lift = (1 - d) * 70;
  const turn = 0.18 + 0.82 * d; // edge-on when up
  const top = y - lift;
  // pole down into the water
  g.strokeStyle = PAL.ink;
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(x, top + 50 * turn);
  g.lineTo(x, y + 220);
  g.stroke();
  g.strokeStyle = PAL.wood;
  g.lineWidth = 7;
  g.stroke();
  // shadow on the water sharpens as it comes down
  g.fillStyle = `rgba(10,40,50,${0.1 + 0.25 * d})`;
  g.beginPath();
  g.ellipse(x, y + 70, W * 0.5 * (0.7 + 0.3 * d), 7, 0, 0, TAU);
  g.fill();
  const clack = s.clack ?? 0;
  if (clack > 0) drawGlow(g, x, top, '#FFF3C4', W * 0.7, clack * 0.8);
  if (d < 0.5) {
    g.globalAlpha = 0.55 + d;
    drawSprite(g, backSprite(W), x, top + 8, 0, 1, 0.5 + turn);
    g.globalAlpha = 1;
  }
  if (turn > 0.3) {
    drawSprite(g, boardSprite(W), x, top - 9 * turn, 0, 1, turn);
  }
  if (clack > 0) {
    g.strokeStyle = `rgba(255,236,160,${clack})`;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x - W / 2, top);
    g.lineTo(x + W / 2, top);
    g.stroke();
  }
  const sl = s.slam;
  if (sl !== undefined && sl >= 0 && sl < 0.35) {
    const k = sl / 0.35;
    for (let i = -1; i <= 1; i += 2)
      for (let j = 0; j < 3; j++)
        puff(g, x + i * (W * 0.45 + k * 50 + j * 12), y + 50 - j * 8 - k * 20, 6 + k * 10 - j, (1 - k) * 0.85, '#F2FEFB');
  }
}
