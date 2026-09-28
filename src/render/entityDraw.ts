/**
 * PLACEHOLDER DRAW FUNCTIONS for the vertical slice — one small function per thing, each drawing
 * at a given world position with plain canvas calls. Deliberately simple and isolated so the
 * real art module (src/art/, built separately) can replace them one by one.
 *
 * Skin: a scratched 1970s grindhouse feature (docs/DESIGN.md) — Slim, a muscly tattooed pool shark,
 * fights up 42nd Street into a honky-tonk bar with his pool cue.
 *   HERO = tangerine #FF8A1F (Slim only) · REWARD = gold #E0B64A (brass tokens, dummy cracks)
 *   DANGER = lacquer red #B3201B (snapped-cue tips, Bluff Master staff tips) · film black #1A1410
 * Mechanic -> skin: lums = brass tokens, pendulum targets = sparring dummies (Dummy Crack),
 * spikes = snapped cues, slam platforms = Stamp Presses, jabbers = Bluff Masters (bow on the
 * "and" — the back is a bounce platform — jacket flung open + jab on the beat), crowd = the theatre
 * audience strip, chaser = the Burn, checkpoints = film splices, scansion = choreographer's chalk.
 */
import { VIEW_H, VIEW_W, makeCanvas } from '../engine/display';
import { lerp } from '../engine/math';

export const PAL = {
  heroAccent: '#FF8A1F',
  heroAccentDark: '#C45A0E',
  heroStripe: '#FFF6E8',
  heroInk: '#1A1410',
  gold: '#E0B64A',
  goldDark: '#9C7A22',
  lacquer: '#B3201B',
  filmBlack: '#1A1410',
  film: '#E9D8B4',
  beam: '#F8F1DC',
  jade: '#2FA37A',
  fig: '#5E2B4E',
  subtitle: '#FFE24A',
  wood: '#9A6B45',
  woodDark: '#5A3A24',
  iron: '#3A3A42',
  timber: '#8A6A4F',
  timberDark: '#4E3A2C',
  asphalt: '#2B2530',
  asphaltLine: '#3A3340',
  paper: '#EFE6CF',
  lip: '#F4EFE2',
  shine: '#FFE08A',
  audience: '#0D0A08',
} as const;

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------- the hero

export interface HeroPose {
  /** squash & stretch */
  sx: number;
  sy: number;
  facing: number;
  /** leg cycle phase (footfalls = integer crossings) */
  runPhase: number;
  running: boolean;
  grounded: boolean;
  /** strike animation 0..1 (NaN = idle) */
  strike: number;
  /** idle bob (0..1 on each beat) */
  beatBob: number;
  /** spin 0..1 during a stumble (NaN = none) */
  spin: number;
  /** blink for i-frames */
  hidden: boolean;
  dead: boolean;
  /** speed lines (catch-up surge) */
  surging: boolean;
  /** time (s) for small idle motions */
  t: number;
}

/** Slim at feet-centre (x, y): a muscly, tattooed pool shark, ~130 px tall around a 56x100 hitbox, cue in hand. */
export function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, p: HeroPose): void {
  if (p.hidden) return;
  ctx.save();
  ctx.translate(x, y);
  if (p.surging) {
    ctx.strokeStyle = 'rgba(248,241,220,0.8)';
    ctx.lineWidth = 4;
    for (const [oy, len] of [[-30, 60], [-60, 90], [-90, 50]]) {
      const w = (p.t * 23 + oy) % 1;
      ctx.beginPath();
      ctx.moveTo(-40 - w * 30, oy);
      ctx.lineTo(-40 - w * 30 - len, oy);
      ctx.stroke();
    }
  }
  if (!Number.isNaN(p.spin)) {
    ctx.translate(0, -50);
    ctx.rotate(p.spin * TAU * p.facing);
    ctx.translate(0, 50);
  }
  if (p.dead) {
    ctx.translate(0, -50);
    ctx.rotate(p.t * 10);
    ctx.translate(0, 50);
  }
  ctx.scale(p.sx * p.facing, p.sy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const SKIN = '#D9A07A';
  const INK = PAL.heroInk;

  // legs: dark jeans + boots; stride on the run, tuck in the air
  const ph = p.runPhase * Math.PI;
  for (const side of [-1, 1]) {
    let fx: number;
    let fy: number;
    if (p.running) {
      const s = Math.sin(ph + (side > 0 ? 0 : Math.PI));
      fx = s * 24;
      fy = -Math.max(0, Math.cos(ph + (side > 0 ? 0 : Math.PI))) * 14;
    } else if (!p.grounded) {
      fx = side * 14;
      fy = -22 + side * 8;
    } else {
      fx = side * 16;
      fy = 0;
    }
    const hx = side * 9;
    const hy = -46;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo((hx + fx) / 2 + 4, (hy + fy) / 2);
    ctx.lineTo(fx, fy - 6);
    ctx.stroke();
    ctx.strokeStyle = '#2E3550';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = INK; // boots
    ctx.beginPath();
    ctx.ellipse(fx + 5, fy - 5, 12, 7, 0, 0, TAU);
    ctx.fill();
  }
  // belt
  ctx.fillStyle = INK;
  ctx.fillRect(-20, -52, 40, 8);
  ctx.fillStyle = '#C9B99A';
  ctx.fillRect(-4, -52, 8, 8);

  // torso: broad V in a tangerine tank top (the hero's sacred colour)
  const bob = p.beatBob * 2;
  ctx.fillStyle = PAL.heroAccent;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-18, -50);
  ctx.lineTo(-30, -92 - bob);
  ctx.quadraticCurveTo(0, -104 - bob, 30, -92 - bob);
  ctx.lineTo(18, -50);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SKIN; // neck/chest V
  ctx.beginPath();
  ctx.moveTo(-10, -97 - bob);
  ctx.lineTo(0, -84 - bob);
  ctx.lineTo(10, -97 - bob);
  ctx.closePath();
  ctx.fill();

  // head: square jaw, slicked-back black hair, sideburns
  const hy = -114 - bob;
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-10, hy - 12);
  ctx.lineTo(14, hy - 12);
  ctx.lineTo(16, hy + 6);
  ctx.lineTo(8, hy + 14);
  ctx.lineTo(-8, hy + 12);
  ctx.lineTo(-12, hy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-14, hy - 4);
  ctx.quadraticCurveTo(-12, hy - 22, 8, hy - 20);
  ctx.quadraticCurveTo(20, hy - 18, 17, hy - 9);
  ctx.lineTo(-6, hy - 10);
  ctx.lineTo(-8, hy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(9, hy - 3, 5, 2.5); // brow
  ctx.beginPath();
  ctx.arc(11, hy + 1, 2, 0, TAU);
  ctx.fill();

  // arms + THE CUE: held diagonally at idle; the Cue Swing (power shot) arcs up-forward
  let ang: number;
  if (!Number.isNaN(p.strike)) {
    const k = p.strike;
    const up = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
    const e = 1 - (1 - Math.min(1, up)) ** 3;
    ang = lerp(0.6, -1.8, e);
    if (k < 0.55) {
      const a1 = lerp(0.6, -1.8, Math.min(1, k / 0.3));
      ctx.fillStyle = `rgba(248,241,220,${0.75 * (1 - k / 0.55)})`; // swing smear (cream edge, tangerine core)
      ctx.beginPath();
      ctx.arc(8, -80, 124, 0.65, a1, true);
      ctx.arc(8, -80, 84, a1, 0.65, false);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,138,31,${0.35 * (1 - k / 0.55)})`;
      ctx.beginPath();
      ctx.arc(8, -80, 110, 0.65, a1, true);
      ctx.arc(8, -80, 96, a1, 0.65, false);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ang = 0.6 - p.beatBob * 0.1;
  }
  ctx.save();
  ctx.translate(8, -80);
  ctx.rotate(ang);
  // cue
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.lineTo(118, 0);
  ctx.stroke();
  ctx.strokeStyle = '#E7C48A';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#2A1E16';
  ctx.beginPath();
  ctx.moveTo(-60, 0);
  ctx.lineTo(-30, 0);
  ctx.stroke();
  ctx.strokeStyle = PAL.heroStripe;
  ctx.beginPath();
  ctx.moveTo(110, 0);
  ctx.lineTo(118, 0);
  ctx.stroke();
  // big tattooed forearms + fists on the cue
  for (const hx of [-10, 22]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(hx - 12, 20);
    ctx.lineTo(hx, 0);
    ctx.stroke();
    ctx.strokeStyle = SKIN;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(26,20,16,0.75)'; // tattoo bands
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hx - 10, 12);
    ctx.lineTo(hx - 4, 16);
    ctx.moveTo(hx - 7, 6);
    ctx.lineTo(hx - 1, 10);
    ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(hx, 0, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
  // shoulder caps (muscle) over the tank top
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const sx of [-26, 26]) {
    ctx.beginPath();
    ctx.arc(sx, -88 - bob, 10, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(26,20,16,0.7)'; // shoulder tattoo (a star)
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? 2.5 : 6;
    const a = (k / 10) * TAU - Math.PI / 2;
    ctx.lineTo(26 + Math.cos(a) * r, -88 - bob + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------- the audience (crowd)

/**
 * The theatre audience: film-black silhouettes along the bottom of the frame (SCREEN space).
 * `standing` of `seats` are on their feet (the streak); standing ones cheer on the beat, and a
 * strike sends a wave along the row (`wave` 0..1 = position of the wave, <0 = none). Popcorn
 * pops over them on the backbeat.
 */
export function drawAudience(ctx: CanvasRenderingContext2D, seats: number, standing: number, beat: number, beatPulse: number, backbeat: number, wave: number, full: boolean): void {
  const y0 = VIEW_H + 6;
  const step = VIEW_W / seats;
  for (let i = 0; i < seats; i++) {
    const order = (i * 7) % seats; // spread the standing members along the row
    const up = order < standing;
    const x = step * (i + 0.5) + ((i * 37) % 11) - 5;
    const cheer = up ? beatPulse * (0.6 + (0.4 * ((i * 13) % 3)) / 2) : 0;
    const w = wave < 0 ? 0 : Math.max(0, 1 - Math.abs(wave - i / seats) * 6);
    const rise = up ? 24 + 6 * cheer + 10 * w : 3 * w;
    const h = 40 + ((i * 29) % 8);
    ctx.fillStyle = PAL.audience;
    ctx.beginPath();
    ctx.ellipse(x, y0 - h * 0.3 - rise, 26, h * 0.4, 0, Math.PI, TAU);
    ctx.lineTo(x + 26, y0);
    ctx.lineTo(x - 26, y0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y0 - h * 0.62 - rise, 12, 0, TAU);
    ctx.fill();
    if (up && (cheer > 0.25 || w > 0.3)) {
      ctx.strokeStyle = PAL.audience;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 16, y0 - h * 0.45 - rise);
      ctx.lineTo(x - 22, y0 - h * 0.95 - rise - 6 * cheer);
      ctx.moveTo(x + 16, y0 - h * 0.45 - rise);
      ctx.lineTo(x + 22, y0 - h * 0.95 - rise - 6 * cheer);
      ctx.stroke();
    }
    ctx.strokeStyle = full ? 'rgba(224,182,74,0.6)' : 'rgba(233,216,180,0.25)'; // rim light from the screen
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y0 - h * 0.62 - rise, 12, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    if (up && backbeat > 0.2 && (i + Math.floor(beat)) % 3 === 0) {
      ctx.fillStyle = `rgba(248,241,220,${backbeat})`; // popcorn on the backbeat
      for (let k = 0; k < 3; k++) {
        const px = x + (k - 1) * 10 + Math.sin(i + k) * 5;
        const py = y0 - h - rise - 14 - (1 - backbeat) * 36 - k * 5;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, TAU);
        ctx.fill();
      }
    }
  }
}

/** a small audience head for the HUD */
export function drawAudienceIcon(ctx: CanvasRenderingContext2D, x: number, y: number, cheer: number): void {
  ctx.fillStyle = PAL.film;
  ctx.beginPath();
  ctx.arc(x, y - 12 - cheer * 4, 9, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 16, 12, 0, Math.PI, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------- brass tokens (lums)

/** brass pool-hall token stamped with an 8-ball; spins (x-scale) as it bobs */
export function drawLum(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number, glint: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  const spin = 0.35 + 0.65 * Math.abs(Math.cos(angle * 2 + glint));
  ctx.scale(scale * spin, scale);
  ctx.fillStyle = `rgba(224,182,74,${0.15 + 0.25 * glint})`;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PAL.gold;
  ctx.strokeStyle = PAL.goldDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.filmBlack; // the 8-ball stamp
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(255,224,138,${0.5 + 0.5 * glint})`;
  ctx.beginPath();
  ctx.arc(-6, -7, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------- snapped cues (spikes)

/** a bundle of splintered cue shafts with lacquer-red tips (the basic "spike") */
export function drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y + 22);
  ctx.rotate(rot);
  const s = 1 + 0.1 * pulse;
  ctx.scale(s, s);
  ctx.lineCap = 'round';
  const shafts: [number, number][] = [
    [-0.5, 40],
    [-0.2, 50],
    [0.05, 46],
    [0.3, 52],
    [0.55, 38],
  ];
  for (const [a, len] of shafts) {
    const tx = Math.sin(a) * len;
    const ty = -Math.cos(a) * len;
    ctx.strokeStyle = PAL.filmBlack;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#E7C48A';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = PAL.lacquer; // splintered red tip
    ctx.beginPath();
    ctx.moveTo(tx - 5, ty + 4);
    ctx.lineTo(tx + Math.sin(a) * 12, ty - Math.cos(a) * 12);
    ctx.lineTo(tx + 5, ty + 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PAL.filmBlack; // binding
  ctx.fillRect(-12, -10, 24, 8);
  ctx.restore();
}

// ---------------------------------------------------------------------------- Bluff Master (jabber)

export interface JabberPose {
  /** 0..1 polite bow (offbeat) — the flat back is a bounce platform */
  bow: number;
  /** 0..1 jab (on the beat): jacket flung open (eyespots) + staff thrust */
  jab: number;
  /** wind-up before the jab (lapel tug) */
  windup: number;
  /** leaving (after landing a jab) / flung (struck) */
  flying: boolean;
  dead: boolean;
  rot: number;
  scale: number;
  squash: number;
}

/** Bluff Master at feet-centre (x, y), facing LEFT toward the hero: squat box, flared lapels, flat cap, red-tipped staff. */
export function drawJabber(ctx: CanvasRenderingContext2D, x: number, y: number, g: JabberPose): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(g.scale, g.scale);
  if (g.rot) {
    ctx.translate(0, -50);
    ctx.rotate(g.rot);
    ctx.translate(0, 50);
  }
  ctx.scale(1 + g.squash, 1 - g.squash);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2A1F28'; // legs
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(-10, -36);
  ctx.lineTo(-14, -4);
  ctx.moveTo(10, -36);
  ctx.lineTo(14, -4);
  ctx.stroke();
  const bow = g.dead ? 0 : g.bow * 1.1;
  ctx.save();
  ctx.translate(0, -36);
  ctx.rotate(-bow);
  // squat box body in a fig jacket
  ctx.fillStyle = PAL.fig;
  ctx.strokeStyle = PAL.filmBlack;
  ctx.lineWidth = 4;
  ctx.fillRect(-28, -54, 56, 54);
  ctx.strokeRect(-28, -54, 56, 54);
  const open = g.jab;
  if (open > 0.05) {
    // BLUFF: jacket flung open on a lining with two huge staring eyespots
    ctx.fillStyle = '#E9D8B4';
    ctx.fillRect(-28 - 22 * open, -54, 22 * open, 50);
    ctx.fillRect(28, -54, 22 * open, 50);
    for (const ex of [-12, 12]) {
      ctx.fillStyle = PAL.film;
      ctx.beginPath();
      ctx.arc(ex, -30, 12 * open, 0, TAU);
      ctx.fill();
      ctx.fillStyle = PAL.lacquer;
      ctx.beginPath();
      ctx.arc(ex, -30, 7 * open, 0, TAU);
      ctx.fill();
      ctx.fillStyle = PAL.filmBlack;
      ctx.beginPath();
      ctx.arc(ex - 2, -30, 3.5 * open, 0, TAU);
      ctx.fill();
    }
  } else {
    // wide lapel triangles
    ctx.fillStyle = '#8A4A76';
    ctx.beginPath();
    ctx.moveTo(-6, -54);
    ctx.lineTo(-24, -40);
    ctx.lineTo(-4, -22);
    ctx.closePath();
    ctx.moveTo(6, -54);
    ctx.lineTo(24, -40);
    ctx.lineTo(4, -22);
    ctx.closePath();
    ctx.fill();
  }
  if (g.bow > 0.3) {
    ctx.fillStyle = `rgba(244,239,226,${g.bow})`; // the flat back: a bounce platform
    ctx.fillRect(24, -54, 6, 50);
  }
  // head + flat cap
  ctx.fillStyle = '#C89070';
  ctx.beginPath();
  ctx.arc(-4, -66, 13, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.filmBlack;
  ctx.beginPath();
  ctx.arc(-11, -67, 2.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3A3A42';
  ctx.beginPath();
  ctx.ellipse(-2, -77, 18, 7, -0.1, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(-26, -79, 14, 4);
  if (!g.dead) {
    // short staff with a lacquer-red tip, thrust on the jab
    const jx = -g.jab * 50;
    ctx.strokeStyle = PAL.timberDark;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, -20);
    ctx.lineTo(-74 + jx, -30);
    ctx.stroke();
    ctx.fillStyle = PAL.lacquer;
    ctx.beginPath();
    ctx.arc(-76 + jx, -30, 7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------- sparring dummy (pendulum target)

export function drawPendulumRig(ctx: CanvasRenderingContext2D, pivotX: number, pivotY: number, groundY: number): void {
  ctx.fillStyle = PAL.timberDark; // two posts and a beam (awning / dojo beam)
  for (const dx of [-200, 200]) ctx.fillRect(pivotX + dx - 6, pivotY - 20, 12, groundY - pivotY + 20);
  ctx.fillRect(pivotX - 214, pivotY - 24, 428, 14);
}

/** straw-and-timber sparring dummy on a rope: a cross-shaped post */
export function drawPendulumTarget(ctx: CanvasRenderingContext2D, pivotX: number, pivotY: number, x: number, y: number, r: number, glint: number, bottomGlow: number): void {
  ctx.strokeStyle = '#8A7A60';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY - 10);
  ctx.lineTo(x, y - r * 1.5);
  ctx.stroke();
  const ang = -Math.atan2(x - pivotX, y - pivotY);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (bottomGlow > 0.01) {
    ctx.fillStyle = `rgba(224,182,74,${0.3 * bottomGlow})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = PAL.timber;
  ctx.strokeStyle = PAL.filmBlack;
  ctx.lineWidth = 3;
  ctx.fillRect(-r * 0.4, -r * 1.5, r * 0.8, r * 3); // post
  ctx.strokeRect(-r * 0.4, -r * 1.5, r * 0.8, r * 3);
  ctx.fillRect(-r * 1.4, -r * 0.7, r * 2.8, r * 0.55); // cross arm
  ctx.strokeRect(-r * 1.4, -r * 0.7, r * 2.8, r * 0.55);
  ctx.fillStyle = '#D9C38A'; // straw wrap
  ctx.fillRect(-r * 0.4, -r * 0.1, r * 0.8, r * 0.9);
  ctx.strokeStyle = 'rgba(26,20,16,0.5)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, k * r * 0.22);
    ctx.lineTo(r * 0.4, k * r * 0.22 + 3);
    ctx.stroke();
  }
  ctx.restore();
  if (glint > 0.01) {
    const s = r * (0.6 + glint * 0.9); // star glint: 1 beat before the bottom of the swing
    const gx = x - r * 0.3;
    const gy = y - r * 0.8;
    ctx.fillStyle = `rgba(255,224,138,${glint})`;
    ctx.beginPath();
    ctx.moveTo(gx, gy - s);
    ctx.lineTo(gx + s * 0.18, gy);
    ctx.lineTo(gx, gy + s);
    ctx.lineTo(gx - s * 0.18, gy);
    ctx.closePath();
    ctx.moveTo(gx - s, gy);
    ctx.lineTo(gx, gy + s * 0.18);
    ctx.lineTo(gx + s, gy);
    ctx.lineTo(gx, gy - s * 0.18);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------- Stamp Press (slam platform)

export const SLAM_LIFT_PX = 150;

/** the Dojo's training press: an iron-shod timber block on rails. `lift` 0 = slammed (solid: stand on it). */
export function drawSlamPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lift: number, pitY: number, slam: number): void {
  const oy = -lift * SLAM_LIFT_PX;
  ctx.fillStyle = `rgba(0,0,0,${0.45 * (1 - lift) + 0.1})`; // shadow on the well floor sharpens as it comes down
  ctx.beginPath();
  ctx.ellipse(x + w / 2, pitY + 4, (w / 2) * (1 + lift * 0.4), 10 + lift * 8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PAL.iron; // rails (fixed)
  ctx.fillRect(x + 8, y - 1400, 8, 1400 + h);
  ctx.fillRect(x + w - 16, y - 1400, 8, 1400 + h);
  ctx.save();
  ctx.globalAlpha = 1 - lift * 0.5;
  ctx.translate(0, oy);
  const bh = h + 26; // a heavy block (its top is the platform)
  ctx.fillStyle = PAL.timber;
  ctx.strokeStyle = PAL.filmBlack;
  ctx.lineWidth = 4;
  ctx.fillRect(x, y, w, bh);
  ctx.strokeRect(x, y, w, bh);
  ctx.fillStyle = PAL.iron; // iron shoe + straps
  ctx.fillRect(x, y + bh - 10, w, 10);
  ctx.fillRect(x + w * 0.25 - 4, y, 8, bh);
  ctx.fillRect(x + w * 0.75 - 4, y, 8, bh);
  // 4 px film-black edge + cream lip (walkable top rule); the lip brightens on the slam
  ctx.fillStyle = PAL.filmBlack;
  ctx.fillRect(x, y - 2, w, 4);
  if (lift === 0) {
    ctx.fillStyle = `rgba(244,239,226,${0.8 + 0.2 * slam})`;
    ctx.fillRect(x, y - 4, w, 3);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------- the chaser: the film burns in

export function drawChaser(ctx: CanvasRenderingContext2D, frontX: number, top: number, t: number, yBottom: number): void {
  const left = frontX - 4000;
  ctx.fillStyle = PAL.beam; // burned-through film: blinding projector light
  ctx.fillRect(left, top, frontX - 20 - left, yBottom - top);
  const seg = 28;
  const edge = (yy: number, off: number) => frontX + off + Math.sin(yy * 0.03 + t * 9) * 10 + Math.sin(yy * 0.11 - t * 13) * 7;
  const bands: [number, string, number][] = [
    [-20, 'rgba(255,226,74,0.9)', 26],
    [-2, 'rgba(179,32,27,0.85)', 14],
    [10, 'rgba(26,20,16,0.95)', 14],
  ];
  for (const [off, col, wdt] of bands) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wdt;
    ctx.beginPath();
    for (let yy = top; yy <= yBottom; yy += seg) {
      const ex = edge(yy, off);
      if (yy === top) ctx.moveTo(ex, yy);
      else ctx.lineTo(ex, yy);
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------- film splice (checkpoint)

/** splicing tape across the frame with a hand-lettered scene number ("SC. 17"), world space */
export function drawBeacon(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, lit: boolean, flash: number, scene: string): void {
  ctx.fillStyle = lit ? `rgba(244,239,226,${0.22 + 0.4 * flash})` : 'rgba(244,239,226,0.14)';
  ctx.fillRect(x - 28, y0, 56, y1 - y0);
  ctx.fillStyle = 'rgba(26,20,16,0.35)'; // tape sprocket edge
  for (let yy = y0 - (y0 % 40); yy < y1; yy += 40) {
    ctx.fillRect(x - 26, yy, 8, 14);
    ctx.fillRect(x + 18, yy, 8, 14);
  }
  ctx.save();
  ctx.translate(x, y0 + 260);
  ctx.rotate(-0.08);
  ctx.font = 'bold 34px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = lit ? PAL.filmBlack : 'rgba(26,20,16,0.6)';
  ctx.fillText(scene, 0, 0);
  ctx.restore();
}

/** cigarette-burn changeover dot in the top-right of the frame (flashes on checkpoints) */
export function drawCueDot(ctx: CanvasRenderingContext2D, a: number): void {
  if (a <= 0.01) return;
  ctx.fillStyle = `rgba(248,241,220,${a})`;
  ctx.beginPath();
  ctx.arc(VIEW_W - 150, 190, 30, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------- scansion + bar lines (chalk on the pavement)

/** Scansion mark chalked on the ground: ∪ short / – long. `lit` jade on its beat, `gold` after a Perfect. */
export function drawScansion(ctx: CanvasRenderingContext2D, glyph: 'short' | 'long', x: number, y: number, lit: number, gold: boolean): void {
  const col = gold ? PAL.gold : lit > 0.02 ? `rgba(47,163,122,${0.6 + 0.4 * lit})` : 'rgba(233,216,180,0.85)';
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8 + 2 * lit;
  ctx.beginPath();
  if (glyph === 'short') ctx.arc(x, y - 6, 15, 0.15, Math.PI - 0.15);
  else {
    ctx.moveTo(x - 26, y + 4);
    ctx.lineTo(x + 26, y + 4);
  }
  ctx.stroke();
  if (lit > 0.02 || gold) {
    ctx.strokeStyle = gold ? 'rgba(224,182,74,0.35)' : `rgba(47,163,122,${0.3 * lit})`;
    ctx.lineWidth = 16;
    ctx.stroke();
  }
}

/** bar line: a gaffer-tape stroke on the ground at every downbeat (quiet metronome) */
export function drawBarLine(ctx: CanvasRenderingContext2D, x: number, y: number, pulse: number): void {
  ctx.fillStyle = `rgba(160,160,170,${0.55 + 0.4 * pulse})`;
  ctx.fillRect(x - 5, y + 5, 10, 20 + 6 * pulse);
}

// ---------------------------------------------------------------------------- ground + pit

export function makeGroundTile(style: 'street' | 'timber' = 'street'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(384, 256);
  if (style === 'timber') {
    ctx.fillStyle = PAL.timber; // dojo floorboards
    ctx.fillRect(0, 0, 384, 256);
    ctx.fillStyle = PAL.timberDark;
    for (let y = 0; y < 256; y += 32) ctx.fillRect(0, y, 384, 3);
    for (let y = 0; y < 256; y += 32) ctx.fillRect(((y / 32) % 3) * 128 + 40, y, 3, 32);
  } else {
    ctx.fillStyle = PAL.asphalt; // 42nd Street asphalt + kerb joints
    ctx.fillRect(0, 0, 384, 256);
    ctx.fillStyle = PAL.asphaltLine;
    for (let x = 0; x < 384; x += 96) ctx.fillRect(x, 20, 3, 236);
    for (let y = 20; y < 256; y += 80) ctx.fillRect(0, y, 384, 3);
  }
  return c;
}

/** shallow puddle sitting in a dip of the ground (safe gap) */
export function drawPool(ctx: CanvasRenderingContext2D, x0: number, x1: number, top: number, floorY: number, t: number): void {
  ctx.fillStyle = 'rgba(47,90,110,0.85)';
  ctx.fillRect(x0, top, x1 - x0, floorY - top);
  ctx.fillStyle = 'rgba(248,241,220,0.5)';
  for (let x = x0 + 8; x < x1 - 8; x += 26) ctx.fillRect(x, top + 2 + Math.sin(t * 3 + x * 0.05) * 2, 14, 3);
}

/** the pit under gaps: a film-black void */
export function drawPit(ctx: CanvasRenderingContext2D, x0: number, x1: number, pitY: number, yBottom: number): void {
  const g = ctx.createLinearGradient(0, pitY - 60, 0, pitY + 300);
  g.addColorStop(0, '#2A201A');
  g.addColorStop(1, PAL.filmBlack);
  ctx.fillStyle = g;
  ctx.fillRect(x0, pitY - 60, x1 - x0, yBottom - pitY + 60);
}

// ---------------------------------------------------------------------------- film pass

let vignette: HTMLCanvasElement | null = null;
/** grindhouse film pass: vignette + a couple of flickering vertical scratches (screen space) */
export function drawFilmPass(ctx: CanvasRenderingContext2D, t: number): void {
  if (!vignette) {
    const [c, v] = makeCanvas(VIEW_W / 4, VIEW_H / 4);
    const g = v.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.width * 0.62);
    g.addColorStop(0, 'rgba(26,20,16,0)');
    g.addColorStop(1, 'rgba(26,20,16,0.55)');
    v.fillStyle = g;
    v.fillRect(0, 0, c.width, c.height);
    vignette = c;
  }
  ctx.drawImage(vignette, 0, 0, VIEW_W, VIEW_H);
  const seed = Math.floor(t * 12);
  for (let i = 0; i < 2; i++) {
    const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const f = r - Math.floor(r);
    if (f > 0.55) continue;
    ctx.fillStyle = 'rgba(233,216,180,0.16)';
    ctx.fillRect((f / 0.55) * VIEW_W, 0, 2, VIEW_H);
  }
}
