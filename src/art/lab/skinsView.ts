/**
 * Art-lab "Skins" board: every gameplay entity skin from src/render/entityDraw.ts on one sheet, grouped by
 * DANGER CLASS (lethal / stumble / reward / terrain), plus the Bluffer's beat cycle (flex on the "and",
 * jab on the beat, wind-up tell) and the generic fallback per class. Press G for the greyscale+blur test.
 */
import type { SkinCtx } from '../../render/entityDraw';
import {
  DANGER,
  REWARD,
  drawBlock,
  drawBouncePad,
  drawBreakable,
  drawChaser,
  drawGeneric,
  drawJabber,
  drawLowSign,
  drawPendulum,
  drawPlatform,
  drawScansion,
  drawSlamPlatform,
  drawSpike,
  drawSplice,
  drawToken,
} from '../../render/entityDraw';
import { drawLethalPit } from '../../render/stage';
import { fract } from '../core/math';
import { CF } from '../palette';
import type { LabCtx } from './views';
import { beatDots } from './views';

function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, col: string = CF.filmBlack): void {
  g.font = '600 18px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = col;
  g.fillText(text, x, y);
}

function header(g: CanvasRenderingContext2D, text: string, x: number, y: number, col: string): void {
  g.fillStyle = col;
  g.fillRect(x, y - 22, 300, 30);
  g.font = '700 18px ui-sans-serif, system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillStyle = '#fff';
  g.fillText(text, x + 10, y);
}

export function drawSkinsView(l: LabCtx): void {
  const g = l.g;
  const b = l.sim.at(l.time);
  const sc: SkinCtx = { b, env: 'street', time: l.time, wb: b.beat, swing: 0.67 };
  g.fillStyle = '#6A5A5E';
  g.fillRect(0, 0, 1920, 1080);
  // floor band
  g.fillStyle = '#4A3E40';
  g.fillRect(0, 520, 1920, 40);
  g.fillRect(0, 1000, 1920, 80);

  // ---- LETHAL
  header(g, 'LETHAL — red + hot edge', 40, 40, DANGER.red);
  g.save();
  g.beginPath();
  g.rect(40, 60, 420, 460);
  g.clip();
  g.fillStyle = '#3A3034';
  g.fillRect(40, 60, 420, 460);
  g.translate(0, 360);
  drawLethalPit(g, 90, 250, 0, 150, 400, b);
  g.restore();
  label(g, 'pit (gap)', 170, 548, '#fff');
  g.save();
  g.beginPath();
  g.rect(270, 60, 190, 460);
  g.clip();
  drawChaser(g, 360, 40, l.time, 540);
  g.restore();
  label(g, 'the Burn', 380, 548, '#fff');

  // ---- STUMBLE
  header(g, 'STUMBLE — ink + red points', 500, 40, '#5A2A28');
  drawSpike(g, 560, 520, Math.exp(-b.beatPhase * 4), 0);
  label(g, 'snapped cues', 560, 548, '#fff');
  drawLowSign(g, 630, 110, 260, 290, Math.sin(l.time * 2) * 0.3, false, b, 60);
  label(g, 'low sign (slide)', 760, 548, '#fff');
  // Bluffer beat cycle: live + filmstrip
  const off = b.beatPhase;
  const flexK = Math.max(0, 1 - Math.abs(off - 0.67) / 0.3);
  const jab = Math.max(0, 1 - off / 0.12);
  const windup = fract(b.beat / 4) > 0.75 ? off : 0;
  drawJabber(g, 1000, 520, { flex: windup ? 0 : flexK, jab: windup ? 0 : jab, windup, flying: false, dead: false, rot: 0, scale: 1, squash: 0, time: l.time, seed: 1 });
  label(g, 'Bluffer (live)', 1000, 548, '#fff');
  const strip: [string, Partial<Parameters<typeof drawJabber>[3]>][] = [
    ['idle', {}],
    ['flex on "and"', { flex: 1 }],
    ['jab on beat', { jab: 1 }],
    ['wind-up .4', { windup: 0.4 }],
    ['wind-up .9', { windup: 0.9 }],
    ['struck', { dead: true, rot: 0.6 }],
  ];
  strip.forEach(([name, p], i) => {
    const x = 1150 + i * 125;
    drawJabber(g, x, 520, { flex: 0, jab: 0, windup: 0, flying: false, dead: false, rot: 0, scale: 0.8, squash: 0, time: l.time, seed: i, ...p });
    label(g, name, x, 548, '#fff');
  });

  // ---- REWARD
  header(g, 'REWARD — gold', 40, 600, REWARD.dark);
  for (let i = 0; i < 4; i++) drawToken(g, 80 + i * 50, 700 + Math.sin(l.time * 4 + i) * 6, b.beat + i, 1, Math.exp(-fract(b.beatPhase + i * 0.25) * 4));
  label(g, 'tokens', 155, 760);
  const swing = Math.sin(l.time * Math.PI * (b.bpm / 60 / 2)) * 0.5;
  const pend = (px: number, env: 'street' | 'bar', big: boolean) => {
    const len = 190;
    drawPendulum(g, { pivotX: px, pivotY: 620, x: px + Math.sin(swing) * len, y: 620 + Math.cos(swing) * len, r: big ? 36 : 26, big, glint: Math.max(0, 1 - Math.abs(fract(b.beat / 2) - 0.5) / 0.15), bottom: Math.abs(swing) < 0.08 ? 1 : 0, struckT: NaN, seed: 1, viewTop: 580 }, { ...sc, env });
  };
  pend(360, 'street', false);
  label(g, 'bar sign', 360, 1040, '#fff');
  pend(520, 'bar', false);
  label(g, 'pool lamp', 520, 1040, '#fff');
  pend(680, 'street', true);
  label(g, 'big 8-ball', 680, 1040, '#fff');
  ['bottle', 'glass', 'jug', 'crate', 'neon'].forEach((look, i) => {
    const x = 820 + i * 110;
    drawBreakable(g, { x, y: 890, r: look === 'crate' ? 36 : 30, baseY: 1000, high: false, big: false, look, glint: fract(b.beat) > 0.7 ? 1 : 0, now: 0, brokenT: NaN, seed: i, viewTop: 600 }, sc);
    label(g, look, x, 1040, '#fff');
  });

  // ---- TERRAIN
  header(g, 'TERRAIN — cream lip', 1400, 600, '#3A3A42');
  const lift = Math.max(0, Math.sin(b.beat * Math.PI));
  drawSlamPlatform(g, 1410, 900, 130, 34, lift > 0.5 ? (lift - 0.5) * 2 : 0, 1100, Math.exp(-b.beatPhase * 5), b);
  label(g, 'keg lift', 1475, 1040, '#fff');
  drawPlatform(g, 1580, 760, 150, 24, 'street', b);
  drawPlatform(g, 1580, 880, 150, 24, 'bar', b);
  label(g, 'awning / shelf', 1655, 1040, '#fff');
  drawBlock(g, 1770, 912, 90, 88);
  drawBouncePad(g, 1815, 760, 120, Math.max(0, 1 - b.beatPhase * 3), 'street', b);
  label(g, 'crates · pad', 1815, 1040, '#fff');
  drawScansion(g, 'short', 1450, 700, Math.exp(-b.beatPhase * 3), false);
  drawScansion(g, 'long', 1520, 700, 0, true);
  drawSplice(g, 1880, 580, 1000, true, 0, 'SC. 9', 1000);

  // generic fallbacks
  label(g, 'generic fallback per class:', 1150, 590, '#fff');
  (['lethal', 'stumble', 'reward', 'neutral'] as const).forEach((d, i) => drawGeneric(g, d, 1120 + i * 70, 690, 44, 60, b));
  beatDots(g, b, 70, 1070);
}
