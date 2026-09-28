/**
 * Cached procedural placeholder sprites. Each sprite is drawn ONCE into an offscreen canvas at
 * 2x resolution (crisp on high-DPI) and then blitted with drawImage. Swap these for real art
 * later — the renderer only needs {canvas, w, h, ax, ay}.
 */
import { makeCanvas } from '../engine/display';

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** logical size */
  w: number;
  h: number;
  /** anchor in logical px from the top-left */
  ax: number;
  ay: number;
}

const RES = 2;

export function makeSprite(w: number, h: number, ax: number, ay: number, draw: (ctx: CanvasRenderingContext2D) => void): Sprite {
  const [c, ctx] = makeCanvas(w * RES, h * RES);
  ctx.scale(RES, RES);
  draw(ctx);
  return { canvas: c, w, h, ax, ay };
}

/** Draw a sprite anchored at (x, y) with scale and rotation around the anchor. */
export function blit(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, sx = 1, sy = 1, rot = 0): void {
  if (sx === 1 && sy === 1 && rot === 0) {
    ctx.drawImage(s.canvas, x - s.ax, y - s.ay, s.w, s.h);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  if (rot !== 0) ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(s.canvas, -s.ax, -s.ay, s.w, s.h);
  ctx.restore();
}

export interface SpriteSet {
  lum: Sprite;
  lumGlow: Sprite;
  grunt: Sprite;
  flyerBody: Sprite;
  wing: Sprite;
  spike: Sprite;
  groundTile: HTMLCanvasElement;
  flag: Sprite;
}

export function makeSprites(): SpriteSet {
  const lumGlow = makeSprite(120, 120, 60, 60, (ctx) => {
    const g = ctx.createRadialGradient(60, 60, 0, 60, 60, 60);
    g.addColorStop(0, 'rgba(255,230,120,0.55)');
    g.addColorStop(0.4, 'rgba(255,200,60,0.18)');
    g.addColorStop(1, 'rgba(255,180,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 120, 120);
  });
  const lum = makeSprite(40, 40, 20, 20, (ctx) => {
    const g = ctx.createRadialGradient(15, 14, 2, 20, 20, 19);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.45, '#ffe25a');
    g.addColorStop(1, '#f0a020');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(20, 20, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(14, 13, 5, 3.5, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });
  const grunt = makeSprite(110, 120, 55, 118, (ctx) => {
    // body blob
    ctx.fillStyle = '#d8345f';
    ctx.strokeStyle = '#3a0a1c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(14, 116);
    ctx.bezierCurveTo(4, 60, 22, 22, 55, 22);
    ctx.bezierCurveTo(88, 22, 106, 60, 96, 116);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // horns
    ctx.fillStyle = '#f4e3c1';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(55 + s * 18, 30);
      ctx.lineTo(55 + s * 38, 2);
      ctx.lineTo(55 + s * 30, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // belly
    ctx.fillStyle = '#f07a95';
    ctx.beginPath();
    ctx.ellipse(55, 88, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    // angry eyes (looking left, toward the player)
    for (const ex of [40, 66]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, 52, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(ex - 4, 54, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3a0a1c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(28, 36);
    ctx.lineTo(48, 44);
    ctx.moveTo(82, 36);
    ctx.lineTo(60, 44);
    ctx.stroke();
    // teeth
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(38, 72);
    ctx.lineTo(44, 80);
    ctx.lineTo(50, 72);
    ctx.lineTo(58, 80);
    ctx.lineTo(64, 72);
    ctx.lineTo(70, 80);
    ctx.lineTo(74, 72);
    ctx.closePath();
    ctx.fill();
  });
  const flyerBody = makeSprite(80, 80, 40, 40, (ctx) => {
    ctx.fillStyle = '#8a3fd1';
    ctx.strokeStyle = '#220a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(40, 40, 30, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffec5c';
    ctx.beginPath();
    ctx.arc(30, 36, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(27, 37, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(22, 54);
    ctx.lineTo(28, 62);
    ctx.lineTo(34, 54);
    ctx.lineTo(40, 62);
    ctx.lineTo(46, 54);
    ctx.closePath();
    ctx.fill();
  });
  const wing = makeSprite(70, 40, 4, 34, (ctx) => {
    ctx.fillStyle = '#5b2396';
    ctx.strokeStyle = '#220a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 34);
    ctx.quadraticCurveTo(30, -4, 68, 6);
    ctx.quadraticCurveTo(52, 16, 56, 26);
    ctx.quadraticCurveTo(40, 22, 36, 34);
    ctx.quadraticCurveTo(22, 26, 4, 34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  const spike = makeSprite(32, 46, 0, 46, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 32, 0);
    g.addColorStop(0, '#f2f2f7');
    g.addColorStop(1, '#9ea2b8');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#2b2440';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, 46);
    ctx.lineTo(16, 3);
    ctx.lineTo(30, 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff3b5c';
    ctx.beginPath();
    ctx.moveTo(11, 18);
    ctx.lineTo(16, 3);
    ctx.lineTo(21, 18);
    ctx.closePath();
    ctx.fill();
  });
  const flag = makeSprite(90, 200, 10, 200, (ctx) => {
    ctx.fillStyle = '#e8e2d0';
    ctx.fillRect(6, 10, 8, 190);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(86, 36);
    ctx.lineTo(14, 62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  // ground texture tile (used as a CanvasPattern, 1x logical)
  const [groundTile, gctx] = makeCanvas(128, 128);
  gctx.fillStyle = '#5b3a2e';
  gctx.fillRect(0, 0, 128, 128);
  gctx.fillStyle = '#6b4636';
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 2; x++) {
      const ox = (y % 2) * 32;
      gctx.fillRect(x * 64 + ox + 3, y * 32 + 3, 58, 26);
    }
  }
  gctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < 4; y++) gctx.fillRect(0, y * 32 + 27, 128, 5);
  return { lum, lumGlow, grunt, flyerBody, wing, spike, groundTile, flag };
}
