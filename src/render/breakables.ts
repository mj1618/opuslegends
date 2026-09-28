/**
 * BREAKABLE TARGETS (REWARD) — per-section FAMILIES (review iter2 fix 8: "the eyes see one object").
 *
 * Every family keeps the reward language: gold rim that brightens into its beat, a gold glint the beat
 * before, a gold ring + shards when smashed. What changes is the OBJECT and what holds it up:
 *
 *   street    newspaper box (pedestal) · trash can (crate stack) · parking meter (post)
 *   rooftops  water-tower valve wheel (pipe) · pigeon coop (stilts; pigeons scatter) · TV + antenna (crate)
 *   bar       bottle / beer glass / moonshine jug (stool) · neon letter · keg (big) · jukebox (big alt)
 *   facade    window pane (glazier's A-frame) · flower pot (iron plant stand)          [act 2: the climb]
 *   lanes     bowling pin (chrome stand; UV stripes), giant pin (big)                   [act 2: the lanes]
 *
 * `pickLook(look, env, mode, big, seed)` maps the level's hint (the default 'bottle'/'crate' say nothing)
 * onto the section's family, so authored levels get variety without data changes; explicit looks that
 * belong to another family ('newsbox', 'pane', 'pin', ...) are always honoured.
 * `giant` (walkdown money shot) draws the target 2x, standing on the floor, no support.
 */
import { drawGlow, star4 } from '../art/core/draw';
import type { Ctx } from '../art/core/canvas';
import { hit } from '../art/core/beat';
import { TAU, clamp01, easeOut } from '../art/core/math';
import { CF } from '../art/palette';
import { blobPath } from '../art/rig/parts';
import { REWARD, type SkinCtx, fillInk, roundRectPath } from './entityDraw';

const INK = CF.filmBlack;

export interface BreakableView {
  x: number;
  y: number;
  r: number;
  baseY: number;
  high: boolean;
  big: boolean;
  look: string;
  /** 0..1 glint the beat before its strike beat */
  glint: number;
  /** 0..1 on its strike beat */
  now: number;
  /** seconds since it broke (NaN = intact) */
  brokenT: number;
  seed: number;
  viewTop: number;
  /** walkdown money shot (r is already giant-sized): a sturdy crate stand, heavier ink */
  giant?: boolean;
}

type Support = 'stool' | 'post' | 'pedestal' | 'crates' | 'stilts' | 'aframe' | 'stand' | 'chrome' | 'none';

interface Look {
  support: Support;
  /** shard colour when smashed */
  shard: string;
  draw(g: Ctx, c: SkinCtx, seed: number): void;
}

const FAMILIES: Record<string, { small: string[]; big: string[] }> = {
  street: { small: ['newsbox', 'trashcan', 'meter'], big: ['trashcan', 'newsbox'] },
  rooftops: { small: ['valve', 'coop', 'tv'], big: ['coop', 'tv'] },
  bar: { small: ['bottle', 'neon', 'bottle', 'jug'], big: ['keg', 'jukebox'] },
  facade: { small: ['pane', 'pot', 'pane'], big: ['pane'] },
  lanes: { small: ['pin'], big: ['pin'] },
};

/** looks that are section-neutral hints (re-skinned per family) */
const NEUTRAL = new Set(['bottle', 'crate', 'glass', 'jug']);

/** the look to draw: an explicit family look wins; neutral hints are re-skinned by section */
export function pickLook(look: string, env: string, mode: string, big: boolean, seed: number): string {
  if (!NEUTRAL.has(look) && LOOKS[look]) return look;
  const fam = env === 'bar' ? 'bar' : env === 'facade' ? 'facade' : env === 'lanes' ? 'lanes' : /roof/.test(mode) ? 'rooftops' : 'street';
  if (fam === 'bar' && (look === 'glass' || look === 'jug') && !big) return look; // authored bar glassware stays
  const f = FAMILIES[fam];
  const list = big ? f.big : f.small;
  return list[seed % list.length];
}

// ------------------------------------------------------------------ the looks (drawn at r = 30, ~±40 px box)

function label(g: Ctx, t: string, x: number, y: number, px: number, col: string = INK): void {
  g.fillStyle = col;
  g.font = `bold ${px}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(t, x, y);
}

const LOOKS: Record<string, Look> = {
  // ---------------------------------------------------------------- bar
  bottle: {
    support: 'stool',
    shard: '#5A8A6A',
    draw(g) {
      g.beginPath();
      g.moveTo(-6, -40);
      g.lineTo(6, -40);
      g.lineTo(7, -16);
      g.quadraticCurveTo(16, -10, 16, 2);
      g.lineTo(16, 32);
      g.lineTo(-16, 32);
      g.lineTo(-16, 2);
      g.quadraticCurveTo(-16, -10, -7, -16);
      g.closePath();
      fillInk(g, '#3E7A5A', 3);
      g.fillStyle = CF.cream;
      g.fillRect(-13, 2, 26, 16);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(-11, -8, 4, 36);
    },
  },
  glass: {
    support: 'stool',
    shard: '#E8C86A',
    draw(g) {
      g.beginPath();
      g.moveTo(-18, -26);
      g.lineTo(18, -26);
      g.lineTo(15, 28);
      g.lineTo(-15, 28);
      g.closePath();
      fillInk(g, 'rgba(232,200,106,0.95)', 3);
      g.fillStyle = CF.cream;
      g.beginPath();
      g.ellipse(0, -26, 20, 9, 0, 0, TAU);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(20, 0, 11, -1.2, 1.2);
      g.stroke();
    },
  },
  jug: {
    support: 'stool',
    shard: '#C8B89A',
    draw(g) {
      blobPath(g, 0, 6, 24, 24, 0.3);
      fillInk(g, '#C8B89A', 3);
      g.beginPath();
      g.rect(-7, -30, 14, 14);
      fillInk(g, '#8A7A60', 2.5);
      label(g, 'XXX', 0, 12, 14);
    },
  },
  crate: {
    support: 'stool',
    shard: '#8A6A48',
    draw(g) {
      g.beginPath();
      g.rect(-32, -30, 64, 60);
      fillInk(g, '#8A6A48', 3);
      g.fillStyle = '#5A4230';
      g.fillRect(-32, -6, 64, 6);
      g.strokeStyle = '#5A4230';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(-28, -26);
      g.lineTo(28, 26);
      g.stroke();
      label(g, 'XXX', 0, 20, 13);
    },
  },
  neon: {
    support: 'none',
    shard: CF.neonRose,
    draw(g, c, seed) {
      const ch = 'JIMBIG8'[seed % 7];
      g.font = 'italic 76px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 12;
      g.strokeStyle = INK;
      g.strokeText(ch, 0, 2);
      g.fillStyle = CF.neonRose;
      g.fillText(ch, 0, 2);
      drawGlow(g, 0, 0, CF.neonRose, 60, 0.35 + 0.3 * hit(c.b, 'hat', 0.06));
    },
  },
  keg: {
    support: 'stool',
    shard: '#8A5A36',
    draw(g) {
      // oak keg on its side-ish: bulging staves, brass hoops, a tap
      g.beginPath();
      g.moveTo(-26, -34);
      g.quadraticCurveTo(-36, 0, -26, 34);
      g.lineTo(26, 34);
      g.quadraticCurveTo(36, 0, 26, -34);
      g.closePath();
      fillInk(g, '#8A5A36', 3);
      g.strokeStyle = '#5A3A22';
      g.lineWidth = 2.5;
      for (const sx of [-14, 0, 14]) {
        g.beginPath();
        g.moveTo(sx, -34);
        g.quadraticCurveTo(sx * 1.3, 0, sx, 34);
        g.stroke();
      }
      for (const hy of [-22, 22]) {
        g.fillStyle = '#B8923A';
        g.fillRect(-32, hy - 4, 64, 8);
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.strokeRect(-32, hy - 4, 64, 8);
      }
      g.fillStyle = '#C9D3DA';
      g.fillRect(-4, 2, 18, 6);
      g.fillRect(10, 2, 5, 12);
      label(g, 'XXX', 0, -6, 12, '#2A1A10');
    },
  },
  jukebox: {
    support: 'none',
    shard: '#E8B880',
    draw(g, c) {
      const p = Math.exp(-c.b.beatPhase * 4);
      g.beginPath();
      g.moveTo(-30, 36);
      g.lineTo(-30, -6);
      g.arc(0, -6, 30, Math.PI, 0);
      g.lineTo(30, 36);
      g.closePath();
      fillInk(g, '#6A3A2A', 3);
      const cols = [CF.neonRose, CF.bulb, CF.neonJade];
      for (let i = 0; i < 3; i++) {
        g.strokeStyle = cols[i];
        g.globalAlpha = 0.55 + 0.45 * p;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(0, -6, 24 - i * 7, Math.PI, 0);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#E9DCC4';
      g.fillRect(-18, 4, 36, 16);
      g.fillStyle = INK;
      for (let i = 0; i < 5; i++) g.fillRect(-16 + i * 7, 8, 4, 8);
      g.fillStyle = '#2A1A14';
      g.fillRect(-22, 24, 44, 10);
    },
  },
  // ---------------------------------------------------------------- street
  newsbox: {
    support: 'pedestal',
    shard: '#4E7A9A',
    draw(g, _c, seed) {
      roundRectPath(g, -24, -34, 48, 64, 4);
      fillInk(g, '#3E6E8A', 3);
      // slanted window with the day's front page
      g.beginPath();
      g.moveTo(-18, -24);
      g.lineTo(18, -28);
      g.lineTo(18, 4);
      g.lineTo(-18, 4);
      g.closePath();
      fillInk(g, '#E9DCC4', 2);
      g.fillStyle = INK;
      g.fillRect(-14, -20, 28, 5);
      g.fillStyle = 'rgba(26,20,16,0.45)';
      for (let i = 0; i < 4; i++) g.fillRect(-14, -11 + i * 4, i % 2 ? 18 : 26, 2);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(8, -24, 4, 26);
      // header strip + coin slot
      g.fillStyle = '#E9DCC4';
      g.fillRect(-20, 10, 40, 11);
      label(g, ['DAILY', 'POST', 'NEWS'][seed % 3], 0, 16, 8);
      g.fillStyle = INK;
      g.fillRect(12, 23, 8, 3);
    },
  },
  trashcan: {
    support: 'crates',
    shard: '#9A9EA0',
    draw(g) {
      // dented galvanised can, lid knocked askew, a fish skeleton hanging out
      g.beginPath();
      g.moveTo(-22, -22);
      g.lineTo(22, -22);
      g.lineTo(19, 32);
      g.lineTo(-19, 32);
      g.closePath();
      fillInk(g, '#8A8E90', 3);
      g.strokeStyle = '#5E6264';
      g.lineWidth = 2.5;
      for (let yy = -12; yy < 30; yy += 10) {
        g.beginPath();
        g.moveTo(-21, yy);
        g.lineTo(21, yy);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(-14, -18, 5, 46);
      g.strokeStyle = '#E9DCC4';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-6, -24);
      g.lineTo(-2, -40);
      for (let i = 0; i < 4; i++) {
        g.moveTo(-5 + i, -28 - i * 3);
        g.lineTo(-11 + i, -30 - i * 3);
        g.moveTo(-5 + i, -28 - i * 3);
        g.lineTo(1 + i, -30 - i * 3);
      }
      g.stroke();
      g.save();
      g.translate(6, -26);
      g.rotate(0.35);
      g.beginPath();
      g.ellipse(0, 0, 25, 6, 0, 0, TAU);
      fillInk(g, '#9A9EA0', 3);
      g.fillStyle = INK;
      g.fillRect(-6, -10, 12, 5);
      g.restore();
    },
  },
  meter: {
    support: 'post',
    shard: '#C9D3DA',
    draw(g) {
      // twin-dome parking meter head
      g.beginPath();
      g.rect(-20, -8, 40, 30);
      fillInk(g, '#4A4E56', 3);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(s * 10, -10, 12, Math.PI, 0);
        g.lineTo(s * 10 + 12, -4);
        g.lineTo(s * 10 - 12, -4);
        g.closePath();
        fillInk(g, '#C9D3DA', 2.5);
        g.fillStyle = '#E9DCC4';
        g.beginPath();
        g.arc(s * 10, -9, 7, Math.PI, 0);
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(s * 10, -9);
        g.lineTo(s * 10 + 5, -14);
        g.stroke();
      }
      // the EXPIRED flag (fig, never danger red)
      g.fillStyle = CF.fig;
      g.fillRect(-14, 2, 28, 10);
      label(g, 'EXPIRED', 0, 7, 6, CF.cream);
      g.fillStyle = INK;
      g.fillRect(-4, 16, 8, 3);
    },
  },
  // ---------------------------------------------------------------- rooftops
  valve: {
    support: 'post',
    shard: '#B8923A',
    draw(g, c) {
      // water-tower valve wheel on its pipe: spins on the beat
      const spin = c.b.beat * 0.5;
      g.fillStyle = '#4A4E56';
      g.fillRect(-8, -4, 16, 40);
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.strokeRect(-8, -4, 16, 40);
      g.save();
      g.rotate(spin);
      g.strokeStyle = INK;
      g.lineWidth = 12;
      g.beginPath();
      g.arc(0, 0, 26, 0, TAU);
      g.stroke();
      g.strokeStyle = '#B8923A';
      g.lineWidth = 6;
      g.stroke();
      g.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        g.strokeStyle = INK;
        g.lineWidth = 8;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
        g.stroke();
        g.strokeStyle = '#B8923A';
        g.lineWidth = 3.5;
        g.stroke();
      }
      g.restore();
      g.beginPath();
      g.arc(0, 0, 7, 0, TAU);
      fillInk(g, '#8A6A2A', 2);
      // pressure gauge
      g.beginPath();
      g.arc(22, 26, 9, 0, TAU);
      fillInk(g, '#E9DCC4', 2);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(22, 26);
      g.lineTo(22 + Math.cos(-0.6 + hit(c.b, 'kick', 0.15)) * 7, 26 + Math.sin(-0.6 - hit(c.b, 'kick', 0.15)) * 7);
      g.stroke();
    },
  },
  coop: {
    support: 'stilts',
    shard: '#8A7050',
    draw(g, c) {
      // slatted pigeon coop, a pigeon bobbing its head in the hole on the beat
      g.beginPath();
      g.moveTo(-32, -14);
      g.lineTo(0, -36);
      g.lineTo(32, -14);
      g.closePath();
      fillInk(g, '#5A4230', 3);
      g.beginPath();
      g.rect(-28, -14, 56, 44);
      fillInk(g, '#8A7050', 3);
      g.strokeStyle = '#5A4230';
      g.lineWidth = 2;
      for (let yy = -4; yy < 30; yy += 9) {
        g.beginPath();
        g.moveTo(-28, yy);
        g.lineTo(28, yy);
        g.stroke();
      }
      g.fillStyle = INK;
      g.beginPath();
      g.arc(-8, 6, 10, 0, TAU);
      g.fill();
      const bob = Math.exp(-c.b.beatPhase * 5) * 5;
      g.fillStyle = '#8A8E98';
      g.beginPath();
      g.arc(-8, 4 - bob, 6, 0, TAU);
      g.fill();
      g.fillStyle = '#E9DCC4';
      g.beginPath();
      g.moveTo(-3, 3 - bob);
      g.lineTo(3, 5 - bob);
      g.lineTo(-3, 6 - bob);
      g.fill();
      g.fillStyle = INK;
      g.fillRect(-10, 2 - bob, 2, 2);
      // perch
      g.fillStyle = '#5A4230';
      g.fillRect(4, 14, 22, 4);
    },
  },
  tv: {
    support: 'crates',
    shard: '#8A8E98',
    draw(g, c) {
      // a busted-out TV set with rabbit-ear antennas (the static flickers on the hats)
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-2, -22);
      g.lineTo(-22, -46);
      g.moveTo(2, -22);
      g.lineTo(24, -44);
      g.stroke();
      g.fillStyle = '#C9D3DA';
      g.beginPath();
      g.arc(-22, -46, 3, 0, TAU);
      g.arc(24, -44, 3, 0, TAU);
      g.fill();
      roundRectPath(g, -30, -22, 60, 50, 7);
      fillInk(g, '#6A5040', 3);
      roundRectPath(g, -24, -16, 40, 36, 8);
      fillInk(g, '#9AB0B0', 2);
      const st = hit(c.b, 'hat', 0.05);
      g.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * st})`;
      for (let i = 0; i < 6; i++) g.fillRect(-20, -12 + i * 5, 32 - ((i * 7) % 11), 2);
      g.fillStyle = '#C9D3DA';
      g.beginPath();
      g.arc(23, -6, 3.5, 0, TAU);
      g.arc(23, 6, 3.5, 0, TAU);
      g.fill();
    },
  },
  // ---------------------------------------------------------------- facade (act 2)
  pane: {
    support: 'aframe',
    shard: '#BFE0F0',
    draw(g, c) {
      // a sash window pane: painted frame, cross mullions, glass with streaks + a lamp reflection
      g.beginPath();
      g.rect(-30, -38, 60, 76);
      fillInk(g, '#4E3A2C', 3);
      g.fillStyle = 'rgba(150,196,220,0.85)';
      g.fillRect(-24, -32, 48, 64);
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath();
      g.moveTo(-22, 10);
      g.lineTo(-4, -30);
      g.lineTo(4, -30);
      g.lineTo(-14, 10);
      g.closePath();
      g.fill();
      g.fillRect(10, -28, 4, 22);
      drawGlow(g, 12, 14, CF.bulb, 22, 0.25 + 0.3 * hit(c.b, 'kick', 0.1));
      g.fillStyle = '#4E3A2C';
      g.fillRect(-3, -32, 6, 64);
      g.fillRect(-24, -2, 48, 5);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(-24, -32, 48, 64);
    },
  },
  pot: {
    support: 'stand',
    shard: '#4E6E8A',
    draw(g, c) {
      // glazed pot of geraniums (rose, never danger red); flowers nod on the snare
      const nod = hit(c.b, 'snare', 0.15) * 0.2;
      g.strokeStyle = '#2F5A3A';
      g.lineWidth = 4;
      for (const a of [-0.5, 0, 0.5]) {
        g.beginPath();
        g.moveTo(0, -8);
        g.lineTo(Math.sin(a + nod) * 22, -30 - Math.cos(a) * 6);
        g.stroke();
      }
      for (const [fx, fy] of [
        [-11, -32],
        [0, -38],
        [11, -32],
      ]) {
        g.fillStyle = CF.neonRose;
        g.beginPath();
        g.arc(fx + nod * 20, fy, 7, 0, TAU);
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.stroke();
        g.fillStyle = CF.cream;
        g.beginPath();
        g.arc(fx + nod * 20, fy, 2, 0, TAU);
        g.fill();
      }
      g.beginPath();
      g.moveTo(-24, -10);
      g.lineTo(24, -10);
      g.lineTo(17, 30);
      g.lineTo(-17, 30);
      g.closePath();
      fillInk(g, '#4E6E8A', 3);
      g.fillStyle = '#3A5670';
      g.fillRect(-26, -12, 52, 8);
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.fillRect(-12, -2, 5, 28);
    },
  },
  // ---------------------------------------------------------------- lanes (act 2)
  pin: {
    support: 'chrome',
    shard: '#F4EFE2',
    draw(g) {
      g.beginPath();
      g.moveTo(0, -42);
      g.bezierCurveTo(10, -42, 11, -26, 7, -18);
      g.bezierCurveTo(4, -12, 20, 4, 18, 22);
      g.quadraticCurveTo(16, 36, 8, 38);
      g.lineTo(-8, 38);
      g.quadraticCurveTo(-16, 36, -18, 22);
      g.bezierCurveTo(-20, 4, -4, -12, -7, -18);
      g.bezierCurveTo(-11, -26, -10, -42, 0, -42);
      g.closePath();
      fillInk(g, '#F4EFE2', 3);
      // UV-glowing neck stripes
      g.fillStyle = CF.neonRose;
      g.fillRect(-7, -22, 14, 3.5);
      g.fillRect(-6, -15, 12, 3.5);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(-12, 0, 4, 24);
    },
  },
};

/** the level's name for a window pane */
LOOKS.window = LOOKS.pane;

// ------------------------------------------------------------------ supports

function drawSupport(g: Ctx, kind: Support, x: number, top: number, baseY: number): void {
  if (baseY - top < 6) return;
  g.lineCap = 'round';
  const leg = (x0: number, y0: number, x1: number, y1: number, w: number, col: string) => {
    g.strokeStyle = INK;
    g.lineWidth = w + 5;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  };
  switch (kind) {
    case 'post':
      leg(x, baseY, x, top, 8, '#5E6264');
      g.fillStyle = INK;
      g.fillRect(x - 12, baseY - 5, 24, 5);
      break;
    case 'pedestal':
      leg(x - 14, baseY, x - 12, top, 5, '#2E4E62');
      leg(x + 14, baseY, x + 12, top, 5, '#2E4E62');
      break;
    case 'crates': {
      const h = baseY - top;
      const n = Math.max(1, Math.round(h / 44));
      const ch = h / n;
      for (let i = 0; i < n; i++) {
        const cy = baseY - (i + 1) * ch;
        g.beginPath();
        g.rect(x - 24 + (i % 2) * 4, cy, 48, ch);
        fillInk(g, '#7A5A3E', 2.5);
        g.strokeStyle = '#4E3A28';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x - 20 + (i % 2) * 4, cy + 4);
        g.lineTo(x + 20 + (i % 2) * 4, cy + ch - 4);
        g.stroke();
      }
      break;
    }
    case 'stilts':
      leg(x - 20, baseY, x - 18, top, 4, '#6A5040');
      leg(x + 20, baseY, x + 18, top, 4, '#6A5040');
      leg(x - 19, (baseY + top) / 2, x + 19, (baseY + top) / 2 - 12, 3, '#6A5040');
      break;
    case 'aframe':
      leg(x - 26, baseY, x - 6, top - 10, 4, '#8A6A48');
      leg(x + 26, baseY, x + 6, top - 10, 4, '#8A6A48');
      leg(x - 18, top + 4, x + 18, top + 4, 4, '#8A6A48');
      break;
    case 'stand':
      leg(x, baseY, x, top, 4, '#3A3A42');
      leg(x - 18, baseY, x, baseY - 26, 4, '#3A3A42');
      leg(x + 18, baseY, x, baseY - 26, 4, '#3A3A42');
      g.beginPath();
      g.ellipse(x, top, 22, 5, 0, 0, TAU);
      fillInk(g, '#3A3A42', 2);
      break;
    case 'chrome':
      leg(x, baseY, x, top, 7, CF.chrome);
      g.beginPath();
      g.ellipse(x, baseY - 3, 20, 5, 0, 0, TAU);
      fillInk(g, CF.chrome, 2);
      g.beginPath();
      g.ellipse(x, top, 18, 5, 0, 0, TAU);
      fillInk(g, CF.chrome, 2);
      break;
    case 'stool':
      leg(x - 20, baseY, x - 12, top, 4, '#6A5A4A');
      leg(x + 20, baseY, x + 12, top, 4, '#6A5A4A');
      g.beginPath();
      g.ellipse(x, top, 26, 7, 0, 0, TAU);
      fillInk(g, '#8A2E3E', 2.5);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ the target

/** Breakable target (reward) in its section's family. Gold rim = pays. */
export function drawBreakable(g: Ctx, p: BreakableView, c: SkinCtx): void {
  const lk = LOOKS[p.look] ?? LOOKS.bottle;
  const giant = !!p.giant;
  const R = p.r;
  const s = R / 30;
  const x = p.x;
  const y = p.y;
  if (!Number.isNaN(p.brokenT)) {
    const k = clamp01(p.brokenT / 0.45);
    if (k >= 1) return;
    g.globalAlpha = 1 - k;
    g.strokeStyle = REWARD.gold;
    g.lineWidth = 6 * (1 - k);
    g.beginPath();
    g.arc(x, y, R + 80 * easeOut(k), 0, TAU);
    g.stroke();
    g.fillStyle = lk.shard;
    const n = giant ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + p.seed;
      g.fillRect(x + Math.cos(a) * 90 * k * s, y + Math.sin(a) * 70 * k * s + 120 * k * k, 7 * s, 5 * s);
    }
    if (p.look === 'coop') {
      // the pigeons scatter
      g.fillStyle = '#8A8E98';
      for (let i = 0; i < 3; i++) {
        const px = x + (i - 1) * 40 * k + 60 * k;
        const py = y - 160 * k - i * 20 * k;
        const fl = Math.sin(p.brokenT * 40 + i) * 8;
        g.beginPath();
        g.ellipse(px, py, 9, 6, 0, 0, TAU);
        g.moveTo(px - 2, py);
        g.lineTo(px - 14, py - fl);
        g.lineTo(px + 2, py - 2);
        g.moveTo(px + 2, py);
        g.lineTo(px + 14, py - fl);
        g.lineTo(px + 4, py - 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    return;
  }
  // support: a hanging cable (high) or the family's stand (low)
  if (p.high) {
    g.strokeStyle = 'rgba(26,20,16,0.85)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x, p.viewTop);
    g.lineTo(x, y - R);
    g.stroke();
  } else {
    const top = y + R * (p.look === 'crate' ? 1 : lk.support === 'post' || lk.support === 'chrome' ? 0.3 : 1.05);
    drawSupport(g, giant && lk.support !== 'chrome' ? 'crates' : lk.support, x, top, p.baseY);
  }
  const hot = Math.max(p.glint, p.now);
  if (hot > 0.02) drawGlow(g, x, y, REWARD.glow, R * 2.8, 0.45 * hot);
  const bob = p.high ? Math.sin(c.time * 2 + p.seed) * 0.08 : 0;
  g.save();
  g.translate(x, y);
  g.rotate(bob);
  g.scale(s, s);
  lk.draw(g, c, p.seed);
  // the gold rim: it PAYS (brightens into its beat)
  g.strokeStyle = REWARD.gold;
  g.lineWidth = 3;
  g.globalAlpha = 0.45 + 0.55 * hot;
  g.beginPath();
  g.arc(0, 0, 44, -2.4, -0.7);
  g.stroke();
  g.globalAlpha = 1;
  g.restore();
  if (p.glint > 0.05) star4(g, x + R * 0.6, y - R * 0.9, R * (0.6 + p.glint * 0.8), 0, `rgba(255,232,150,${p.glint})`);
}

/** every look (for the Art Lab skins tab) */
export const BREAKABLE_LOOKS = Object.keys(LOOKS).filter((k) => k !== 'window');
