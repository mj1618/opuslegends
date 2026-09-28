/**
 * CRABBE — procedural rigged fiddler crab (DESIGN §2).
 *
 *   drawCrabbe(ctx, state)
 *
 * Origin = centre of the feet on the ground; y grows down; ~86 px tall (incl. eyestalks) and
 * ~130 px wide with the claw at scale 1 (1920x1080 logical view). Everything is a pure function
 * of the state (no per-instance memory), so the engine can draw him from any snapshot.
 *
 * The drawing is split in two: `crabbeRig(state)` computes a pose (a `CrabRig`), and
 * `drawCrab(ctx, rig, skin)` paints any rig with any skin (choir crabs reuse it via caches).
 */
import { type Ctx } from './core/canvas';
import { TAU, bump, clamp01, easeIn, easeOut, easeOutBack, fract, hash, lerp, smooth, wobble } from './core/math';
import { PAL } from './palette';

export type CrabbePose =
  | 'idle'
  | 'run'
  | 'hop'
  | 'fall'
  | 'land'
  | 'claw'
  | 'heave'
  | 'skim'
  | 'stumble'
  | 'dead'
  | 'respawn'
  | 'bandpose';

export const CRABBE_POSES: CrabbePose[] = [
  'idle',
  'run',
  'hop',
  'fall',
  'land',
  'claw',
  'heave',
  'skim',
  'stumble',
  'dead',
  'respawn',
  'bandpose',
];

/** Natural lengths (s) of the one-shot poses; after this they hold their last frame. */
export const CRABBE_POSE_LEN: Partial<Record<CrabbePose, number>> = {
  land: 0.3,
  claw: 0.42,
  heave: 0.6,
  stumble: 0.4,
  dead: 0.6,
  respawn: 0.5,
};

export interface CrabbeDrawState {
  pose: CrabbePose;
  /** seconds since the pose started */
  poseTime: number;
  /** leg cycles; advance by distance / CRABBE_STRIDE (2 cycles per beat at 384 px/beat) */
  runPhase?: number;
  /** 0..1 position within the current beat (idle claw bob, band pose pump) */
  beatPhase?: number;
  /** global seconds (blinks, flutter, stalk sway) */
  time?: number;
  /** extra engine squash & stretch about the feet (1 = none) */
  squashX?: number;
  squashY?: number;
  facing?: 1 | -1;
  /** eye look target relative to the origin, world px (e.g. next enemy). Omit = look ahead */
  lookX?: number;
  lookY?: number;
  /** horizontal speed px/s (neckerchief flutter, dust, eye trail) */
  speed?: number;
  /** vertical velocity px/s, y down (eyestalk trail in the air) */
  vy?: number;
  scale?: number;
  /** 0..1 Perfect rim-light flash */
  flash?: number;
  alpha?: number;
}

/** px of travel per leg cycle (2 cycles per beat at 384 px/beat) */
export const CRABBE_STRIDE = 192;

// ---------------------------------------------------------------------------------------------
// Skin

export interface CrabSkin {
  body: string;
  bodyTop: string;
  bodyDeep: string;
  leg: string;
  legFar: string;
  claw: string;
  clawHi: string;
  clawUnder: string;
  teeth: string;
  arm: string;
  outline: string;
  kerchief: boolean;
  eyeWhite: string;
  /** big-claw size multiplier */
  clawScale: number;
  /** outline width */
  ow: number;
}

export const CRABBE_SKIN: CrabSkin = {
  body: PAL.carapace,
  bodyTop: PAL.carapaceTop,
  bodyDeep: PAL.carapaceDeep,
  leg: '#34489E',
  legFar: '#243378',
  claw: PAL.claw,
  clawHi: PAL.clawHi,
  clawUnder: PAL.clawUnder,
  teeth: PAL.clawTeeth,
  arm: '#E8661C',
  outline: PAL.outline,
  kerchief: true,
  eyeWhite: '#FFFFFF',
  clawScale: 1,
  ow: 3,
};

// ---------------------------------------------------------------------------------------------
// Rig

type LegMode = 'stand' | 'run' | 'tuck' | 'flail' | 'splay' | 'wide';
type EyeStyle = 'normal' | 'spiral' | 'wide' | 'wink' | 'squint' | 'closed';
type Mouth = 'smirk' | 'shout' | 'o' | 'grin' | 'wavy' | 'flat';

export interface CrabRig {
  /** carapace centre, crab-local */
  bx: number;
  by: number;
  brot: number;
  bsx: number;
  bsy: number;
  /** whole-crab squash about the feet */
  sx: number;
  sy: number;
  /** spin about the carapace centre */
  spin: number;
  /** big claw: wrist position (crab-local), palm angle, gape 0..1 */
  wx: number;
  wy: number;
  pa: number;
  gape: number;
  /** minor claw hand pos (body-local) + angle */
  mx: number;
  my: number;
  ma: number;
  legMode: LegMode;
  legPhase: number;
  legAmp: number;
  crouch: number;
  /** eyestalk trail offset (bulbs), body-local px */
  etx: number;
  ety: number;
  /** extra stalk splay */
  esp: number;
  /** pupil direction, roughly -1..1 */
  lx: number;
  ly: number;
  eyes: EyeStyle;
  lid: number;
  mouth: Mouth;
  mouthOpen: number;
  /** neckerchief tail wind 0..1 */
  wind: number;
  time: number;
}

export const CRAB_REST: CrabRig = {
  bx: 0,
  by: -38,
  brot: 0,
  bsx: 1,
  bsy: 1,
  sx: 1,
  sy: 1,
  spin: 0,
  wx: 40,
  wy: -24,
  pa: -0.62,
  gape: 0.12,
  mx: -34,
  my: 12,
  ma: 2.6,
  legMode: 'stand',
  legPhase: 0,
  legAmp: 1,
  crouch: 0,
  etx: 0,
  ety: 0,
  esp: 0,
  lx: 0.6,
  ly: 0,
  eyes: 'normal',
  lid: 0.3,
  mouth: 'smirk',
  mouthOpen: 0,
  wind: 0.15,
  time: 0,
};

/** shoulder of the big claw, body-local */
const SHOULDER = { x: 22, y: 8 };

/** Claw sweep arc ("the Wave"): u = 0 low-forward (open), 1 up-forward contact (shut), 2 overhead. */
export function crabClawArc(u: number): { wx: number; wy: number; pa: number; gape: number } {
  // polar around the shoulder (crab-local shoulder ≈ (22,-30))
  const K = [
    { a: 0.5, r: 36, pa: 0.35, g: 0.95 },
    { a: -0.8, r: 44, pa: -0.95, g: 0.0 },
    { a: -1.55, r: 58, pa: -1.85, g: 0.12 },
  ];
  const i = Math.max(0, Math.min(1, Math.floor(u)));
  const t = smooth(Math.max(0, Math.min(1, u - i)));
  const A = K[i];
  const B = K[i + 1];
  const a = lerp(A.a, B.a, t);
  const r = lerp(A.r, B.r, t);
  return { wx: 22 + Math.cos(a) * r, wy: -30 + Math.sin(a) * r, pa: lerp(A.pa, B.pa, t), gape: lerp(A.g, B.g, t) };
}

function blendRig(a: CrabRig, b: Partial<CrabRig>, t: number): CrabRig {
  const o = { ...a } as Record<string, unknown>;
  for (const k of Object.keys(b) as (keyof CrabRig)[]) {
    const va = a[k];
    const vb = b[k];
    if (typeof va === 'number' && typeof vb === 'number') o[k] = va + (vb - va) * t;
    else if (t >= 0.5) o[k] = vb;
  }
  return o as unknown as CrabRig;
}

function blinkLid(time: number, base: number): number {
  const period = 3.3;
  const k = Math.floor(time / period);
  const off = hash(k * 7 + 3) * 1.6;
  const tt = time - k * period - off;
  if (tt > 0 && tt < 0.13) return 1;
  // occasional double blink
  if (hash(k) > 0.7 && tt > 0.22 && tt < 0.33) return 1;
  return base;
}

/** Smear info for the claw attack (derived from the state; drawn by drawCrabbe). */
interface ClawFx {
  u0: number;
  u1: number;
  alpha: number;
  spark: number;
  sparkU: number;
}

/** Compute the rig for a draw state. */
export function crabbeRig(s: CrabbeDrawState): { rig: CrabRig; fx: ClawFx | null } {
  const t = Math.max(0, s.poseTime);
  const time = s.time ?? t;
  const bp = s.beatPhase ?? fract(time * (160 / 60));
  const speed = Math.abs(s.speed ?? 0);
  const vy = s.vy ?? 0;
  let r: CrabRig = { ...CRAB_REST, time };
  let fx: ClawFx | null = null;

  // look direction
  if (s.lookX !== undefined || s.lookY !== undefined) {
    const dx = (s.lookX ?? 200) * (s.facing ?? 1);
    const dy = (s.lookY ?? 0) + 60;
    const d = Math.hypot(dx, dy) || 1;
    r.lx = dx / d;
    r.ly = dy / d;
  } else {
    r.lx = 0.75;
    r.ly = 0.1 + Math.sin(time * 0.7) * 0.15;
  }
  r.wind = clamp01(0.12 + speed / 900);
  const beatHit = Math.exp(-bp * 6); // 1 on the beat

  switch (s.pose) {
    case 'idle': {
      const sway = Math.sin(time * 1.7) * 0.5 + Math.sin(time * 0.63) * 0.5;
      r.by += beatHit * 2.2;
      r.bsy = 1 - beatHit * 0.035;
      r.bsx = 1 + beatHit * 0.03;
      r.crouch = beatHit * 0.6;
      // claw bobs + clacks on every beat
      r.wy += -7 * beatHit + 1.5;
      r.wx += 2 * beatHit;
      r.pa += -0.22 * beatHit;
      r.gape = 0.08 + 0.55 * Math.max(0, Math.sin(Math.min(1, bp * 5) * Math.PI));
      r.etx = sway * 3;
      r.ety = beatHit * 2;
      r.brot = sway * 0.02;
      // cocky minor-claw wave every other bar
      const wv = bump(fract(time / 3.0) * 3.0, 0.9);
      r.mx = -36 - wv * 6;
      r.my = 10 - wv * 26;
      r.ma = 2.6 + wv * (1.1 + Math.sin(time * 18) * 0.35);
      r.lid = blinkLid(time, 0.32);
      r.mouth = wv > 0.3 ? 'grin' : 'smirk';
      break;
    }
    case 'run': {
      const ph = s.runPhase ?? time * 5.3;
      const b16 = Math.cos(ph * TAU * 2);
      r.legMode = 'run';
      r.legPhase = ph;
      r.by += -2 + b16 * 2.2;
      r.brot = 0.07 + b16 * 0.01;
      r.bsy = 1 + b16 * 0.025;
      r.bsx = 1 - b16 * 0.02;
      // battering-ram claw, bobbing
      r.wx = 50;
      r.wy = -32 + b16 * 2.5;
      r.pa = -0.3 + Math.sin(ph * TAU * 2) * 0.05;
      r.gape = 0.18;
      r.etx = -5 - speed / 250;
      r.ety = 2 + b16;
      r.esp = 2;
      r.mx = -30;
      r.my = 14 + Math.sin(ph * TAU) * 3;
      r.ma = 2.9;
      r.lid = blinkLid(time, 0.4);
      r.mouth = 'grin';
      break;
    }
    case 'hop': {
      const st = 1 - easeOut(t / 0.2);
      r.sy = 1 + 0.2 * st;
      r.sx = 1 - 0.15 * st;
      r.legMode = 'tuck';
      r.by -= 2;
      r.wx = 44;
      r.wy = -46;
      r.pa = -0.95;
      r.gape = 0.35;
      r.etx = -2;
      r.ety = clamp01(-vy / 900) * 10 + 5 * st;
      r.esp = 3;
      r.mx = -38;
      r.my = 0;
      r.ma = 2.1;
      r.lid = 0.1;
      r.mouth = 'grin';
      r.eyes = 'wide';
      break;
    }
    case 'fall': {
      r.legMode = 'flail';
      r.legPhase = time * 9;
      r.wx = 40 + Math.sin(time * 14) * 3;
      r.wy = -58;
      r.pa = -1.3 + Math.sin(time * 14) * 0.12;
      r.gape = 0.6 + Math.sin(time * 20) * 0.2;
      r.ety = -clamp01(vy / 900) * 12 - 3;
      r.esp = 5;
      r.mx = -42;
      r.my = -14;
      r.ma = 1.7 + Math.sin(time * 16) * 0.4;
      r.lid = 0;
      r.eyes = 'wide';
      r.mouth = 'o';
      r.mouthOpen = 0.8;
      break;
    }
    case 'land': {
      const k = 1 - easeOut(t / 0.22);
      const sq = k * (1 + wobble(t, 4, 9) * 0.3);
      r.sy = 1 - 0.34 * sq;
      r.sx = 1 + 0.36 * sq;
      r.crouch = k;
      r.wy += 8 * k;
      r.wx += 6 * k;
      r.pa += 0.25 * k;
      r.ety = 10 * k;
      r.etx = 0;
      r.esp = 4 * k;
      r.legMode = 'wide';
      r.lid = 0.45 * k;
      r.mouth = 'grin';
      break;
    }
    case 'claw': {
      // anticipation-free: t=0 IS the contact frame, then a big follow-through
      let u: number;
      if (t < 0.09) u = 1 + easeOut(t / 0.09);
      else if (t < 0.2) u = 2 - 0.25 * smooth((t - 0.09) / 0.11);
      else u = 1.75;
      const arc = crabClawArc(u);
      const back = smooth((t - 0.2) / 0.22);
      const w = wobble(t - 0.2, 3, 8) * 0.15;
      r.wx = lerp(arc.wx, CRAB_REST.wx, back);
      r.wy = lerp(arc.wy, CRAB_REST.wy, back);
      r.pa = lerp(arc.pa, CRAB_REST.pa, back) + w;
      r.gape = t < 0.02 ? 0 : lerp(arc.gape, CRAB_REST.gape, back);
      const lean = bump(t, 0.3);
      r.brot = -0.1 * lean;
      r.by -= 5 * lean;
      r.bsy = 1 + 0.07 * lean;
      r.bsx = 1 - 0.05 * lean;
      r.eyes = t < 0.25 ? 'squint' : 'normal';
      r.lid = 0.45;
      r.ly = -0.5;
      r.lx = 0.8;
      r.etx = 2 * lean;
      r.ety = -3 * lean;
      r.mouth = t < 0.32 ? 'shout' : 'smirk';
      r.mouthOpen = 1 - smooth((t - 0.2) / 0.12);
      r.mx = -38;
      r.my = 6;
      r.ma = 2.2;
      r.legMode = 'wide';
      fx = {
        u0: Math.min(u, u * smooth(t / 0.13)),
        u1: u,
        alpha: 1 - clamp01(t / 0.15),
        spark: t,
        sparkU: 1,
      };
      break;
    }
    case 'heave': {
      // crouch 0..0.08, lunge up with claw overhead, hold, settle
      const crouch = t < 0.08 ? smooth(t / 0.08) : 1 - smooth((t - 0.08) / 0.06);
      const lunge = t < 0.08 ? 0 : easeOutBack(clamp01((t - 0.08) / 0.12), 2);
      const settle = smooth((t - 0.4) / 0.2);
      const L = lunge * (1 - settle);
      r.crouch = crouch;
      r.sy = 1 - 0.18 * crouch + 0.16 * L;
      r.sx = 1 + 0.16 * crouch - 0.1 * L;
      r.by -= 10 * L;
      r.brot = -0.18 * L + 0.08 * crouch;
      const u = t < 0.08 ? 0.2 * crouch : Math.min(2, 1 + lunge);
      const arc = crabClawArc(u);
      r.wx = lerp(arc.wx, CRAB_REST.wx, settle);
      r.wy = lerp(arc.wy - 12 * L, CRAB_REST.wy, settle);
      r.pa = lerp(arc.pa, CRAB_REST.pa, settle);
      r.gape = t < 0.08 ? 0.9 : lerp(0.05, CRAB_REST.gape, settle);
      r.mouth = t > 0.06 && t < 0.5 ? 'shout' : 'smirk';
      r.mouthOpen = 1;
      r.eyes = t > 0.06 && t < 0.45 ? 'squint' : 'normal';
      r.lid = 0.4;
      r.ly = -0.7;
      r.etx = -3 * L;
      r.ety = 6 * L;
      r.mx = -40;
      r.my = -6 * L;
      r.ma = 1.6;
      r.legMode = 'wide';
      if (t >= 0.08 && t < 0.3)
        fx = { u0: Math.min(u, u * smooth((t - 0.08) / 0.15)), u1: u, alpha: 1 - clamp01((t - 0.08) / 0.2), spark: t - 0.1, sparkU: 1.6 };
      break;
    }
    case 'skim': {
      const w = Math.sin(time * 22) * 0.5;
      r.legMode = 'splay';
      r.legPhase = time * 3;
      r.by = -20 + w;
      r.bsx = 1.12;
      r.bsy = 0.82;
      r.brot = 0.12;
      r.wx = 20;
      r.wy = -58;
      r.pa = -1.5 + Math.sin(time * 5) * 0.05;
      r.gape = 0.3;
      r.etx = -8;
      r.ety = 12;
      r.esp = 1;
      r.mx = -44;
      r.my = 4;
      r.ma = 3.0;
      r.lid = 0.35;
      r.mouth = 'grin';
      r.wind = 1;
      break;
    }
    case 'stumble': {
      const k = clamp01(t / 0.4);
      r.spin = -TAU * easeOut(k);
      r.by -= 16 * bump(t, 0.4);
      r.eyes = 'spiral';
      r.mouth = 'wavy';
      r.legMode = 'flail';
      r.legPhase = time * 10;
      r.wx = 36 + Math.sin(t * 40) * 4;
      r.wy = -44;
      r.pa = -1.4;
      r.gape = 0.5;
      r.esp = 6;
      r.etx = Math.sin(t * 30) * 4;
      r.ety = 4;
      r.mx = -40;
      r.my = -8;
      r.ma = 1.4;
      break;
    }
    case 'dead': {
      r.eyes = t < 0.12 ? 'wide' : 'normal';
      r.mouth = 'o';
      r.legMode = 'flail';
      r.legPhase = time * 12;
      r.wx = 30;
      r.wy = -70;
      r.pa = -1.6;
      r.gape = 0.7;
      r.lid = 0;
      r.ly = -0.9;
      r.lx = 0.2;
      r.esp = 4;
      break;
    }
    case 'respawn': {
      const up = easeOutBack(clamp01(t / 0.16), 2.2);
      const land = t > 0.16 ? 1 - easeOut((t - 0.16) / 0.2) : 0;
      r.sy = 1 + 0.25 * (1 - clamp01(t / 0.16)) * (t < 0.16 ? 1 : 0) - 0.25 * land * (t > 0.16 ? 1 : 0);
      r.sx = 1 - 0.15 * (t < 0.16 ? 1 - clamp01(t / 0.16) : 0) + 0.25 * land;
      r.eyes = 'wide';
      r.lid = 0;
      r.wx = 44;
      r.wy = lerp(-60, CRAB_REST.wy, smooth((t - 0.2) / 0.25));
      r.pa = lerp(-1.3, CRAB_REST.pa, smooth((t - 0.2) / 0.25));
      r.gape = 0.4;
      r.mouth = 'grin';
      r.ety = 8 * land;
      r.legMode = t < 0.16 ? 'tuck' : 'wide';
      r.by -= 0;
      r.mx = -40;
      r.my = -10 * (1 - land);
      r.ma = 1.8;
      // rise out of the burrow: vertical offset via crouch channel
      r.crouch = land;
      r.bx = 0;
      // pop from below the ground
      r.by += (1 - up) * 70;
      break;
    }
    case 'bandpose': {
      const pump = Math.exp(-bp * 5);
      r.legMode = 'wide';
      r.crouch = 0.5 + pump * 0.5;
      r.by += pump * 3;
      r.wx = 30;
      r.wy = -88 - pump * 5;
      r.pa = -1.45 - pump * 0.12;
      r.gape = 0.25 + pump * 0.4;
      r.brot = -0.06;
      r.mx = -30;
      r.my = 18;
      r.ma = 3.6;
      r.eyes = 'wink';
      r.lid = 0.2;
      r.mouth = 'grin';
      r.ly = -0.2;
      r.lx = -0.9;
      r.etx = 2;
      break;
    }
  }

  // hop/fall eye trail from vertical velocity
  if (s.pose === 'hop' || s.pose === 'fall') {
    r.ety += clamp01(-vy / 1200) * 8 - clamp01(vy / 1200) * 8;
  }
  // blend the one-shot poses back out of their extremes smoothly is handled per pose.
  if (s.pose === 'land' && t > 0.3) r = blendRig(r, { ...CRAB_REST, time }, 1);
  return { rig: r, fx };
}

// ---------------------------------------------------------------------------------------------
// Painting

/** body-local -> crab-local */
function bodyPt(r: CrabRig, x: number, y: number): [number, number] {
  const c = Math.cos(r.brot);
  const sn = Math.sin(r.brot);
  const X = x * r.bsx;
  const Y = y * r.bsy;
  return [r.bx + X * c - Y * sn, r.by + r.crouch * 7 + X * sn + Y * c];
}

const gradCache = new WeakMap<Ctx, Map<string, CanvasGradient>>();
function grad(g: Ctx, key: string, make: () => CanvasGradient): CanvasGradient {
  let m = gradCache.get(g);
  if (!m) gradCache.set(g, (m = new Map()));
  let gr = m.get(key);
  if (!gr) m.set(key, (gr = make()));
  return gr;
}

function seg(g: Ctx, pts: number[], w: number, col: string) {
  g.lineWidth = w;
  g.strokeStyle = col;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.stroke();
}

/** leg geometry (crab-local) for leg i on side sd (+1 = claw/facing side) */
function legPts(r: CrabRig, sd: number, i: number): number[] {
  // hips fan along the lower flank; feet splay wide; knees arch high and outward (crab legs)
  const [hx, hy] = bodyPt(r, sd * (18 + i * 6), 10 - i * 6);
  let fx = sd * (36 + i * 15) * (1 + r.crouch * 0.1);
  let fy = 0;
  let lift = 9 + i * 3 - r.crouch * 5;
  switch (r.legMode) {
    case 'run': {
      // alternating tripods: (L0,R1,L2) vs (R0,L1,R2); stance slides back, swing lifts
      const tri = (i + (sd > 0 ? 1 : 0)) % 2;
      const p = fract(r.legPhase + tri * 0.5 + i * 0.07);
      const stride = 18;
      if (p < 0.5) {
        fx += stride * (0.5 - p * 2);
      } else {
        const u = (p - 0.5) * 2;
        fx += stride * (-0.5 + u);
        fy = -11 * Math.sin(Math.PI * u);
      }
      break;
    }
    case 'tuck':
      fx = hx + sd * (14 + i * 5);
      fy = hy + 14 - i * 2;
      lift = 4;
      break;
    case 'flail': {
      const w = Math.sin(r.legPhase * TAU + i * 1.7 + (sd > 0 ? 1 : 0)) * 8;
      fx = hx + sd * (22 + i * 7) + w * 0.5;
      fy = hy + 16 - i * 4 + w;
      lift = 6;
      break;
    }
    case 'splay':
      fx = sd * (46 + i * 16) + Math.sin(r.legPhase * TAU + i) * 2;
      fy = -2 - i * 3;
      lift = 5;
      break;
    case 'wide':
      fx *= 1.12;
      break;
    default:
      break;
  }
  const kx = hx + (fx - hx) * 0.52 + sd * (3 + r.crouch * 4);
  const ky = Math.min(hy, fy) - lift;
  return [hx, hy, kx, ky, fx, fy];
}

function palmPath(g: Ctx) {
  g.beginPath();
  g.moveTo(-2, -12);
  g.bezierCurveTo(4, -22, 22, -24, 32, -18);
  g.bezierCurveTo(37, -15, 39, -10, 38, -4);
  // fixed finger (pollex) — top edge out to the tip, bottom edge back
  g.bezierCurveTo(46, -3, 56, -4, 64, -1);
  g.bezierCurveTo(62, 6, 52, 14, 36, 19);
  g.bezierCurveTo(24, 23, 6, 22, -1, 14);
  g.bezierCurveTo(-6, 8, -6, -6, -2, -12);
  g.closePath();
}

function dactylPath(g: Ctx) {
  // movable finger, pivot at (34,-12)
  g.beginPath();
  g.moveTo(30, -16);
  g.bezierCurveTo(42, -24, 58, -20, 66, -8);
  g.bezierCurveTo(60, -10, 50, -9, 36, -6);
  g.closePath();
}

function drawBigClaw(g: Ctx, r: CrabRig, k: CrabSkin, o: number) {
  const [sx, sy] = bodyPt(r, SHOULDER.x, SHOULDER.y);
  const wx = r.wx;
  const wy = r.wy + r.crouch * 5;
  // elbow: bend below/outward of the shoulder->wrist line
  const mx = (sx + wx) / 2;
  const my = (sy + wy) / 2;
  const dx = wx - sx;
  const dy = wy - sy;
  const d = Math.hypot(dx, dy) || 1;
  const bend = Math.max(0, 30 - d) * 0.5 + 6;
  const ex = mx + (dy / d) * bend * -1 + 2;
  const ey = my + (-dx / d) * bend * -1 + 4;
  // arm
  seg(g, [sx, sy, ex, ey, wx, wy], 13 + o * 2, k.outline);
  seg(g, [sx, sy, ex, ey, wx, wy], 13, k.arm);
  g.fillStyle = k.clawHi;
  g.beginPath();
  g.arc(ex - 1, ey - 2, 2.2, 0, TAU);
  g.fill();

  g.save();
  g.translate(wx, wy);
  g.rotate(r.pa);
  const cs = k.clawScale;
  g.scale(cs, cs);
  const oo = o / cs;
  // outline pass (palm + dactyl)
  g.save();
  g.translate(34, -12);
  g.rotate(-r.gape * 0.75);
  g.translate(-34, 12);
  dactylPath(g);
  g.restore();
  g.lineWidth = oo * 2;
  g.strokeStyle = k.outline;
  g.stroke();
  palmPath(g);
  g.stroke();

  // dactyl fill
  g.save();
  g.translate(34, -12);
  g.rotate(-r.gape * 0.75);
  g.translate(-34, 12);
  dactylPath(g);
  g.fillStyle = k.claw;
  g.fill();
  // teeth on the dactyl's cutting edge
  g.fillStyle = k.teeth;
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 6.5;
    g.beginPath();
    g.moveTo(x - 2.4, -7.4 + i * 0.3);
    g.lineTo(x, -3.8 + i * 0.3);
    g.lineTo(x + 2.4, -7.2 + i * 0.3);
    g.fill();
  }
  g.fillStyle = k.clawHi;
  g.beginPath();
  g.ellipse(48, -16, 7, 2.2, 0.15, 0, TAU);
  g.fill();
  g.restore();

  // palm fill with gradient (claw-local, cached)
  palmPath(g);
  g.fillStyle = grad(g, 'palm' + k.claw, () => {
    const gr = g.createLinearGradient(0, -22, 0, 22);
    gr.addColorStop(0, k.clawHi);
    gr.addColorStop(0.35, k.claw);
    gr.addColorStop(0.75, k.claw);
    gr.addColorStop(1, k.clawUnder);
    return gr;
  });
  g.fill();
  // underside band
  g.save();
  palmPath(g);
  g.clip();
  g.fillStyle = k.clawUnder;
  g.beginPath();
  g.ellipse(22, 24, 34, 11, -0.08, 0, TAU);
  g.fill();
  // tubercles
  g.fillStyle = 'rgba(160,50,10,0.35)';
  for (let i = 0; i < 7; i++) {
    const x = 6 + ((i * 37) % 26);
    const y = -12 + ((i * 23) % 20);
    g.beginPath();
    g.arc(x, y, 1.5, 0, TAU);
    g.fill();
  }
  g.restore();
  // pollex teeth
  g.fillStyle = k.teeth;
  for (let i = 0; i < 4; i++) {
    const x = 42 + i * 5.5;
    g.beginPath();
    g.moveTo(x - 2.2, -3.4 + i * 0.4);
    g.lineTo(x, -7.2 + i * 0.5);
    g.lineTo(x + 2.2, -3.1 + i * 0.4);
    g.fill();
  }
  // gloss
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(12, -13, 9, 3.4, -0.35, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath();
  g.arc(4, -10, 1.8, 0, TAU);
  g.fill();
  // hinge line
  g.strokeStyle = k.outline;
  g.lineWidth = 1.6 / cs;
  g.beginPath();
  g.moveTo(33, -15);
  g.quadraticCurveTo(36, -10, 37, -5);
  g.stroke();
  g.restore();
}

function drawMinorClaw(g: Ctx, r: CrabRig, k: CrabSkin, o: number) {
  const [bx0, by0] = bodyPt(r, -22, 12);
  const [hx, hy] = bodyPt(r, r.mx, r.my);
  seg(g, [bx0, by0, hx, hy], 5 + o * 2, k.outline);
  seg(g, [bx0, by0, hx, hy], 5, k.leg);
  g.save();
  g.translate(hx, hy);
  g.rotate(r.ma);
  g.beginPath();
  g.ellipse(4, 0, 6, 4, 0, 0, TAU);
  g.moveTo(8, -3);
  g.lineTo(15, -3.5);
  g.lineTo(9, 0);
  g.moveTo(8, 3);
  g.lineTo(14, 3.5);
  g.lineTo(9, 1);
  g.lineWidth = o * 2;
  g.strokeStyle = k.outline;
  g.stroke();
  g.fillStyle = k.bodyTop;
  g.fill();
  g.restore();
}

function carapacePath(g: Ctx) {
  g.beginPath();
  g.moveTo(-35, -14);
  g.bezierCurveTo(-28, -27, 28, -27, 35, -14);
  g.bezierCurveTo(40, -6, 36, 10, 27, 18);
  g.bezierCurveTo(12, 24, -12, 24, -27, 18);
  g.bezierCurveTo(-36, 10, -40, -6, -35, -14);
  g.closePath();
}

function drawEyes(g: Ctx, r: CrabRig, k: CrabSkin, o: number, front: boolean) {
  for (let e = 0; e < 2; e++) {
    const sd = e === 0 ? -1 : 1;
    const [bx0, by0] = bodyPt(r, sd * 10 + 2, -19);
    const swivel = r.lx * 3;
    const ex = bx0 + sd * (4 + r.esp) + r.etx + swivel + (e === 1 ? 2 : 0);
    const ey = by0 - 27 + r.ety + (e === 1 ? -1 : 0);
    const cx = (bx0 + ex) / 2 - r.etx * 0.45;
    const cy = (by0 + ey) / 2 + 2;
    if (!front) {
      g.beginPath();
      g.moveTo(bx0, by0);
      g.quadraticCurveTo(cx, cy, ex, ey + 5);
      g.lineWidth = 5 + o * 2;
      g.strokeStyle = k.outline;
      g.stroke();
      g.lineWidth = 5;
      g.strokeStyle = k.bodyDeep;
      g.stroke();
      continue;
    }
    // bulb
    const R = 7.5;
    g.beginPath();
    g.ellipse(ex, ey, R, R * 1.08, 0, 0, TAU);
    g.fillStyle = k.outline;
    g.lineWidth = o * 2;
    g.strokeStyle = k.outline;
    g.stroke();
    g.fillStyle = k.eyeWhite;
    g.fill();
    const style = r.eyes === 'wink' && e === 0 ? 'closed' : r.eyes;
    if (style === 'spiral') {
      g.strokeStyle = k.outline;
      g.lineWidth = 1.6;
      g.beginPath();
      const rot = r.time * 14 * sd;
      for (let a = 0; a < TAU * 2.2; a += 0.35) {
        const rr = 0.6 + a * 0.42;
        const x = ex + Math.cos(a + rot) * rr;
        const y = ey + Math.sin(a + rot) * rr;
        if (a === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      continue;
    }
    if (style === 'closed') {
      g.strokeStyle = k.outline;
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(ex - 5, ey);
      g.quadraticCurveTo(ex, ey + 4, ex + 5, ey);
      g.stroke();
      // lid colour cap
      g.fillStyle = k.bodyTop;
      g.beginPath();
      g.ellipse(ex, ey - 1, R - 0.5, R * 0.7, 0, Math.PI, TAU);
      g.fill();
      continue;
    }
    const pr = style === 'wide' ? 2.6 : 3.4;
    const px = ex + r.lx * 2.8;
    const py = ey + r.ly * 2.8;
    g.fillStyle = '#111018';
    g.beginPath();
    g.arc(px, py, pr, 0, TAU);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(px - 1.1, py - 1.2, 1.1, 0, TAU);
    g.fill();
    // eyelid (cocky droop, angled toward the facing side)
    let lid = r.lid;
    if (style === 'squint') lid = Math.max(lid, 0.5);
    if (style === 'wide') lid = 0;
    if (lid > 0.02) {
      g.save();
      g.beginPath();
      g.ellipse(ex, ey, R + 0.3, R * 1.08 + 0.3, 0, 0, TAU);
      g.clip();
      g.fillStyle = k.bodyTop;
      const ly = ey - R * 1.1 + lid * R * 2.1;
      const tilt = (style === 'squint' ? 3 : 1.8) * -sd;
      g.beginPath();
      g.moveTo(ex - R - 2, ey - R - 3);
      g.lineTo(ex + R + 2, ey - R - 3);
      g.lineTo(ex + R + 2, ly - tilt);
      g.lineTo(ex - R - 2, ly + tilt);
      g.fill();
      g.strokeStyle = k.outline;
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(ex - R - 2, ly + tilt);
      g.lineTo(ex + R + 2, ly - tilt);
      g.stroke();
      g.restore();
    }
  }
}

function drawMouth(g: Ctx, r: CrabRig, k: CrabSkin) {
  g.save();
  g.translate(r.bx, r.by + r.crouch * 7);
  g.rotate(r.brot);
  g.scale(r.bsx, r.bsy);
  g.strokeStyle = k.outline;
  g.fillStyle = '#2A0E1C';
  g.lineWidth = 2.4;
  const mx = 6;
  const my = 1;
  switch (r.mouth) {
    case 'smirk':
      g.beginPath();
      g.moveTo(mx - 9, my - 1);
      g.quadraticCurveTo(mx + 1, my + 5, mx + 10, my - 3);
      g.stroke();
      g.beginPath();
      g.moveTo(mx + 8.5, my - 5);
      g.quadraticCurveTo(mx + 11, my - 3, mx + 11.5, my - 1);
      g.stroke();
      break;
    case 'grin':
      g.beginPath();
      g.moveTo(mx - 11, my - 3);
      g.quadraticCurveTo(mx, my + 10, mx + 12, my - 4);
      g.quadraticCurveTo(mx, my + 1, mx - 11, my - 3);
      g.fill();
      g.stroke();
      g.fillStyle = '#E86A5E';
      g.beginPath();
      g.ellipse(mx + 1, my + 3, 4, 1.8, 0, 0, TAU);
      g.fill();
      break;
    case 'shout': {
      const h = 6 + 8 * r.mouthOpen;
      g.beginPath();
      g.moveTo(mx - 10, my - 4);
      g.quadraticCurveTo(mx + 1, my - 7, mx + 12, my - 5);
      g.quadraticCurveTo(mx + 11, my - 4 + h, mx + 1, my - 3 + h);
      g.quadraticCurveTo(mx - 9, my - 4 + h, mx - 10, my - 4);
      g.fill();
      g.stroke();
      g.fillStyle = '#E86A5E';
      g.beginPath();
      g.ellipse(mx + 1, my - 3 + h - 2.5, 5, 2.5, 0, 0, TAU);
      g.fill();
      break;
    }
    case 'o':
      g.beginPath();
      g.ellipse(mx, my + 1, 3.5 + r.mouthOpen * 1.5, 4.5 + r.mouthOpen * 2, 0, 0, TAU);
      g.fill();
      g.stroke();
      break;
    case 'wavy':
      g.beginPath();
      g.moveTo(mx - 10, my);
      for (let i = 1; i <= 8; i++) g.lineTo(mx - 10 + i * 2.6, my + (i % 2 ? -2.2 : 2.2));
      g.stroke();
      break;
    case 'flat':
      g.beginPath();
      g.moveTo(mx - 7, my);
      g.lineTo(mx + 8, my - 1);
      g.stroke();
      break;
  }
  g.restore();
}

function drawKerchief(g: Ctx, r: CrabRig, back: boolean) {
  g.save();
  g.translate(r.bx, r.by + r.crouch * 7);
  g.rotate(r.brot);
  g.scale(r.bsx, r.bsy);
  const O = PAL.outline;
  if (back) {
    // tails from the knot on the rear side, streaming behind with speed
    const t = r.time;
    const w = r.wind;
    for (let i = 0; i < 2; i++) {
      const len = 20 + w * 16 - i * 4;
      const ang = 0.9 + i * 0.45 - w * (0.9 + i * 0.25) + Math.sin(t * (8 + w * 16) + i) * (0.08 + w * 0.2);
      const tx = -33 - Math.cos(ang) * len;
      const ty = 10 + Math.sin(ang) * len;
      const cx = -33 - Math.cos(ang - 0.3) * len * 0.55;
      const cy = 10 + Math.sin(ang - 0.3) * len * 0.55 + Math.sin(t * 13 + i) * w * 2.5;
      g.beginPath();
      g.moveTo(-31, 7);
      g.quadraticCurveTo(cx, cy - 3, tx, ty);
      g.quadraticCurveTo(cx + 2, cy + 4, -30, 14);
      g.closePath();
      g.lineWidth = 4.5;
      g.strokeStyle = O;
      g.stroke();
      g.fillStyle = '#F7FBFA';
      g.fill();
      g.strokeStyle = PAL.seaTeal;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-31, 10.5);
      g.quadraticCurveTo(cx + 1, cy + 0.5, tx, ty);
      g.stroke();
    }
    g.restore();
    return;
  }
  // band hugging the lower carapace
  g.beginPath();
  g.moveTo(-33, 4);
  g.quadraticCurveTo(0, 13, 34, 3);
  g.lineTo(31, 11);
  g.quadraticCurveTo(0, 21, -30, 12);
  g.closePath();
  g.lineWidth = 3;
  g.strokeStyle = O;
  g.stroke();
  g.fillStyle = '#F7FBFA';
  g.fill();
  g.save();
  g.clip();
  g.strokeStyle = PAL.seaTeal;
  g.lineWidth = 3.2;
  for (let x = -40; x < 40; x += 8.5) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 7, 22);
    g.stroke();
  }
  g.restore();
  // knot
  g.beginPath();
  g.ellipse(-32, 9.5, 4.5, 4, 0.3, 0, TAU);
  g.lineWidth = 2.5;
  g.strokeStyle = O;
  g.stroke();
  g.fillStyle = '#F7FBFA';
  g.fill();
  g.fillStyle = PAL.seaTeal;
  g.beginPath();
  g.arc(-32, 9.5, 1.6, 0, TAU);
  g.fill();
  g.restore();
}

function drawBody(g: Ctx, r: CrabRig, k: CrabSkin, o: number) {
  g.save();
  g.translate(r.bx, r.by + r.crouch * 7);
  g.rotate(r.brot);
  g.scale(r.bsx, r.bsy);
  carapacePath(g);
  g.lineWidth = o * 2;
  g.strokeStyle = k.outline;
  g.stroke();
  g.fillStyle = grad(g, 'body' + k.body, () => {
    const gr = g.createLinearGradient(0, -26, 0, 22);
    gr.addColorStop(0, k.bodyTop);
    gr.addColorStop(0.45, k.body);
    gr.addColorStop(1, k.bodyDeep);
    return gr;
  });
  g.fill();
  // H-groove + rim shading
  g.strokeStyle = k.bodyDeep;
  g.lineWidth = 2;
  g.globalAlpha = 0.4;
  g.beginPath();
  g.moveTo(-9, -15);
  g.quadraticCurveTo(-6, -8, -10, -2);
  g.moveTo(11, -15);
  g.quadraticCurveTo(8, -8, 12, -2);
  g.moveTo(-7, -9);
  g.lineTo(9, -9);
  g.stroke();
  g.globalAlpha = 1;
  // gloss
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.beginPath();
  g.ellipse(-12, -17, 16, 4.5, -0.12, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(-22, -15, 3, 1.6, -0.4, 0, TAU);
  g.fill();
  // speckles
  g.fillStyle = 'rgba(20,24,80,0.35)';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(-24 + i * 9.5, -4 + ((i * 7) % 5), 1.3, 0, TAU);
    g.fill();
  }
  g.restore();
}

function drawLegs(g: Ctx, r: CrabRig, k: CrabSkin, o: number) {
  const legs: number[][] = [];
  for (let sd = -1; sd <= 1; sd += 2) for (let i = 2; i >= 0; i--) legs.push(legPts(r, sd, i));
  for (const L of legs) seg(g, L, 5.2 + o * 2, k.outline);
  for (let j = 0; j < legs.length; j++) {
    const L = legs[j];
    const far = j < 3; // rear side legs a touch darker
    seg(g, L, 5.2, far ? k.legFar : k.leg);
    // hairline highlight on the upper segment
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(L[0], L[1] - 1.5);
    g.lineTo(L[2], L[3] - 1.5);
    g.stroke();
  }
}

/**
 * Paint a crab rig (crab-local coords; call after translating to the feet). Used by Crabbe and
 * (with other skins) by the choir cache.
 */
export function drawCrab(g: Ctx, r: CrabRig, k: CrabSkin): void {
  const o = k.ow;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (k.kerchief) drawKerchief(g, r, true);
  drawLegs(g, r, k, o);
  drawEyes(g, r, k, o, false);
  drawBody(g, r, k, o);
  drawMouth(g, r, k);
  if (k.kerchief) drawKerchief(g, r, false);
  drawEyes(g, r, k, o, true);
  drawMinorClaw(g, r, k, o);
  drawBigClaw(g, r, k, o);
}

// ---------------------------------------------------------------------------------------------
// Effects (all derived from the state; no memory)

function puff(g: Ctx, x: number, y: number, rad: number, a: number, col = '#F4F0E6') {
  if (a <= 0.01) return;
  g.globalAlpha = a;
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, rad, 0, TAU);
  g.arc(x + rad * 0.8, y + rad * 0.2, rad * 0.7, 0, TAU);
  g.arc(x - rad * 0.7, y + rad * 0.3, rad * 0.6, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
}

function star4(g: Ctx, x: number, y: number, R: number, rot: number, col: string) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? R : R * 0.22;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function clawTip(u: number, wyOff = 0): { tx: number; ty: number; ix: number; iy: number } {
  const a = crabClawArc(u);
  const c = Math.cos(a.pa);
  const s = Math.sin(a.pa);
  return {
    tx: a.wx + c * 66 - s * -4,
    ty: a.wy + wyOff + s * 66 + c * -4,
    ix: a.wx + c * 12,
    iy: a.wy + wyOff + s * 12,
  };
}

function drawSmear(g: Ctx, fx: ClawFx) {
  if (fx.alpha <= 0.01 || fx.u1 - fx.u0 < 0.02) return;
  const N = 14;
  const tips: number[] = [];
  const inn: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = lerp(fx.u0, fx.u1, i / N);
    const p = clawTip(u);
    tips.push(p.tx, p.ty);
    inn.push(p.ix, p.iy);
  }
  // outer glow ribbon
  g.globalAlpha = fx.alpha * 0.85;
  g.fillStyle = PAL.clawHi;
  g.beginPath();
  g.moveTo(tips[0], tips[1]);
  for (let i = 2; i < tips.length; i += 2) g.lineTo(tips[i], tips[i + 1]);
  for (let i = inn.length - 2; i >= 0; i -= 2) {
    // taper toward the start of the arc
    const k = i / (inn.length - 2);
    const x = lerp(tips[i], inn[i], 0.25 + 0.75 * k);
    const y = lerp(tips[i + 1], inn[i + 1], 0.25 + 0.75 * k);
    g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  // hot white core along the tip path
  g.globalAlpha = fx.alpha;
  g.strokeStyle = '#FFF7E8';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(tips[0], tips[1]);
  for (let i = 2; i < tips.length; i += 2) g.lineTo(tips[i], tips[i + 1]);
  g.stroke();
  // speed lines
  g.strokeStyle = PAL.clawHi;
  g.lineWidth = 2;
  for (let j = 1; j <= 3; j++) {
    g.globalAlpha = fx.alpha * (0.8 - j * 0.2);
    g.beginPath();
    for (let i = 0; i < tips.length; i += 2) {
      const k = 0.35 + j * 0.12;
      const x = lerp(tips[i], inn[i], k);
      const y = lerp(tips[i + 1], inn[i + 1], k);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}

function drawSpark(g: Ctx, fx: ClawFx) {
  const t = fx.spark;
  if (t < 0 || t > 0.2) return;
  const p = clawTip(fx.sparkU);
  const k = t / 0.2;
  const R = 10 + 26 * easeOut(k);
  g.globalAlpha = 1 - k;
  star4(g, p.tx + 6, p.ty - 4, R, k * 0.8, '#FFFFFF');
  star4(g, p.tx + 6, p.ty - 4, R * 0.6, 0.4 + k, PAL.claw);
  g.strokeStyle = '#FFF7E8';
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = -0.9 + i * 0.5;
    const r0 = 18 + 30 * easeOut(k);
    const r1 = r0 + 12 * (1 - k);
    g.beginPath();
    g.moveTo(p.tx + 6 + Math.cos(a) * r0, p.ty - 4 + Math.sin(a) * r0);
    g.lineTo(p.tx + 6 + Math.cos(a) * r1, p.ty - 4 + Math.sin(a) * r1);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function drawRunDust(g: Ctx, s: CrabbeDrawState) {
  const speed = Math.abs(s.speed ?? 0);
  if (speed < 60) return;
  const ph = (s.runPhase ?? 0) * 2;
  const a = fract(ph);
  const n = Math.floor(ph);
  for (let j = 0; j < 3; j++) {
    const age = a + j;
    const side = (n - j) % 2 === 0 ? 1 : -1;
    const x = -18 + side * 8 - age * (CRABBE_STRIDE / 2) * 0.9;
    const k = age / 3;
    puff(g, x, -4 - age * 3, 3 + age * 3.2, 0.55 * (1 - k) * Math.min(1, speed / 500));
  }
}

function drawHerringSpill(g: Ctx, t: number) {
  for (let i = 0; i < 3; i++) {
    const vx = (-1 + i) * 120;
    const vy = -300 - i * 40;
    const x = vx * t;
    const y = -40 + vy * t + 900 * t * t;
    const rot = t * 18 * (i - 1 || 1);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = PAL.herring;
    g.strokeStyle = PAL.outline;
    g.lineWidth = 1.8;
    g.beginPath();
    g.ellipse(0, 0, 8, 3.2, 0, 0, TAU);
    g.moveTo(-7, 0);
    g.lineTo(-12, -3.5);
    g.lineTo(-12, 3.5);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
  }
}

function drawFoamMound(g: Ctx, t: number, time: number) {
  const k = easeOut(t / 0.12);
  const blobs: number[] = [];
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 12 * k;
    const r = (9 + (i % 3) * 3 + Math.sin(time * 11 + i * 2.1) * 2) * k * (1 - Math.abs(i - 4) * 0.08);
    blobs.push(x, -r * 0.55, r);
  }
  const path = () => {
    g.beginPath();
    for (let i = 0; i < blobs.length; i += 3) {
      g.moveTo(blobs[i] + blobs[i + 2], blobs[i + 1]);
      g.arc(blobs[i], blobs[i + 1], blobs[i + 2], 0, TAU);
    }
  };
  path();
  g.lineWidth = 5;
  g.strokeStyle = PAL.outline;
  g.stroke();
  g.fillStyle = PAL.foam;
  g.fill();
  g.fillStyle = 'rgba(111,214,200,0.45)';
  g.beginPath();
  g.ellipse(0, 2, 56 * k, 6 * k, 0, 0, TAU);
  g.fill();
  // bubbles
  g.strokeStyle = PAL.outline;
  g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const bt = fract(time * 1.3 + i * 0.21);
    g.globalAlpha = (1 - bt) * k;
    g.beginPath();
    g.arc(-30 + i * 15, -16 - bt * 30, 2 + (i % 3), 0, TAU);
    g.stroke();
  }
  g.globalAlpha = 1;
}

function drawSkimSpray(g: Ctx, time: number) {
  for (let i = 0; i < 9; i++) {
    const p = fract(time * 3.2 + i / 9);
    const x = -50 - p * 90 - i * 3;
    const y = -4 - Math.sin(p * Math.PI) * (18 + (i % 3) * 6);
    puff(g, x, y, 3 + p * 6, (1 - p) * 0.9, '#F2FEFB');
  }
  g.strokeStyle = 'rgba(242,254,251,0.8)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-30, 0);
  g.quadraticCurveTo(-80, -8, -140, 2);
  g.stroke();
}

/** Draw Crabbe at (x, y) = feet centre on the ground. */
export function drawCrabbe(g: Ctx, x: number, y: number, s: CrabbeDrawState, skin: CrabSkin = CRABBE_SKIN): void {
  const { rig, fx } = crabbeRig(s);
  const t = Math.max(0, s.poseTime);
  const time = s.time ?? t;
  const facing = s.facing ?? 1;
  const sc = s.scale ?? 1;
  g.save();
  g.translate(x, y);
  if (s.alpha !== undefined && s.alpha < 1) g.globalAlpha = s.alpha;
  g.scale(sc * facing, sc);

  // ground-attached FX (not squashed)
  if (s.pose === 'run') drawRunDust(g, s);
  if (s.pose === 'skim') drawSkimSpray(g, time);

  const sx = rig.sx * (s.squashX ?? 1);
  const sy = rig.sy * (s.squashY ?? 1);
  g.save();
  g.scale(sx, sy);

  if (s.pose === 'dead') {
    // swallowed by foam: sink, eyestalks bob above, then bloop
    const sink = t < 0.14 ? easeIn(t / 0.14) * 62 : t < 0.42 ? 62 + Math.sin((t - 0.14) * 30) * 4 : 62 + easeIn((t - 0.42) / 0.16) * 50;
    g.save();
    g.beginPath();
    g.rect(-200, -300, 400, 300);
    g.clip();
    g.translate(0, sink);
    drawCrab(g, rig, skin);
    g.restore();
    if (t < 0.6) drawFoamMound(g, t, time);
    if (t > 0.5) {
      const b = (t - 0.5) / 0.15;
      g.globalAlpha = clamp01(1 - b);
      g.strokeStyle = PAL.outline;
      g.fillStyle = 'rgba(232,251,247,0.7)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(4, -18 - b * 16, 6 + b * 8, 0, TAU);
      g.fill();
      g.stroke();
      g.globalAlpha = 1;
    }
  } else if (s.pose === 'respawn') {
    // sand burrow: clip the crab above the ground while emerging
    g.save();
    g.beginPath();
    g.rect(-220, -320, 440, 320 + (t > 0.18 ? 40 : 2));
    g.clip();
    drawCrab(g, rig, skin);
    g.restore();
    const k = clamp01(t / 0.45);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.38;
      const d = 20 + 70 * easeOut(k);
      const px = Math.cos(a) * d;
      const py = Math.sin(a) * d * 0.9 + 140 * k * k;
      puff(g, px, Math.min(-2, py), 5 + 5 * k, (1 - k) * 0.9, '#E9DCC0');
    }
    g.fillStyle = '#D8C8A4';
    g.strokeStyle = PAL.outline;
    g.lineWidth = 2.5;
    g.globalAlpha = 1 - smooth((t - 0.3) / 0.2);
    g.beginPath();
    g.ellipse(0, 0, 40, 8 * (1 - k * 0.5), 0, Math.PI, TAU);
    g.fill();
    g.stroke();
    g.globalAlpha = 1;
  } else if (rig.spin !== 0) {
    const cx = rig.bx;
    const cy = rig.by;
    g.translate(cx, cy);
    g.rotate(rig.spin);
    g.translate(-cx, -cy);
    drawCrab(g, rig, skin);
  } else {
    drawCrab(g, rig, skin);
  }

  if (fx) {
    drawSmear(g, fx);
    drawSpark(g, fx);
  }
  if (s.flash && s.flash > 0.01) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = s.flash * 0.9;
    g.save();
    g.translate(rig.bx, rig.by + rig.crouch * 7);
    g.rotate(rig.brot);
    g.scale(rig.bsx * 1.08, rig.bsy * 1.08);
    carapacePath(g);
    g.strokeStyle = PAL.gold;
    g.lineWidth = 3;
    g.stroke();
    g.restore();
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }
  g.restore();

  // ground FX in front
  if (s.pose === 'land') {
    const k = clamp01(t / 0.35);
    for (let d = -1; d <= 1; d += 2) {
      for (let i = 0; i < 3; i++) {
        const x2 = d * (26 + 70 * easeOut(k) * (1 - i * 0.2));
        puff(g, x2, -6 - 12 * k - i * 3, 5 + 12 * easeOut(k) * (1 - i * 0.25), (1 - k) * 0.85);
      }
    }
  }
  if (s.pose === 'stumble' && t < 0.6) drawHerringSpill(g, t);
  if (s.pose === 'bandpose') {
    const bp = s.beatPhase ?? 0;
    for (let i = 0; i < 4; i++) {
      const a = time * 1.5 + (i * TAU) / 4;
      const px = rig.wx + 40 + Math.cos(a) * 34;
      const py = rig.wy - 40 + Math.sin(a) * 22;
      star4(g, px, py, 5 + 5 * Math.exp(-bp * 4) * (i % 2 ? 1 : 0.6), a, i % 2 ? PAL.gold : '#FFFFFF');
    }
  }
  g.restore();
}

/** Look-up helper for the engine: approximate claw-tip position (crab-local, facing right). */
export function crabbeClawTip(s: CrabbeDrawState): { x: number; y: number } {
  const { rig } = crabbeRig(s);
  const c = Math.cos(rig.pa);
  const sn = Math.sin(rig.pa);
  return { x: (rig.wx + c * 66) * (s.facing ?? 1), y: rig.wy + sn * 66 };
}
