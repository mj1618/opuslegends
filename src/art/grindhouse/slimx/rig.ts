/**
 * SLIM REDESIGN — the shared, style-agnostic animation rig (the three candidate painters in this folder draw it).
 *
 * Why a new rig (review of the old `slim.ts`, playtest: "a bit like a bad drawing"):
 *   - the old build was a pencil: legs as long as the torso, arms the same tubes as the legs, a small tank-top lump,
 *     so the "hulking pool shark" read as a skinny kid in an orange vest;
 *   - pure profile: one shoulder, no V, the chest (cream tank / open shirt) never showed;
 *   - poses covered the face (hop = both arms over the head) and had no line of action.
 *
 * This rig: a 3/4 view facing right (near shoulder at the BACK edge, far shoulder peeking at the front — how Streets of
 * Rage / Final Fight draw their brawlers), a V-wedge torso twice the leg length, the head set low and forward between
 * the traps, short powerful legs, gorilla arms, the cue carried on the shoulder like a bat (DESIGN §2). Every pose is
 * authored as WORLD limb angles (0 = hanging down, + = swung forward) or hand targets solved with two-bone IK, so the
 * painters get clean joints and never fight bone-local maths.
 *
 *   const r = solveSlim(state, build)   // joints in character space (feet centre = origin, facing +x, y down)
 */
import { TAU, bump, clamp01, easeOut, easeOutBack, fract, lerp, smooth } from '../../core/math';
import { beatBob, landSquash, squash, strikeU, velocityStretch } from '../../rig/motion';
import { blink } from '../../rig/parts';
import { ik2 } from '../../rig/skeleton';
import type { SlimState } from '../slim';

export type V = [number, number];

/** body proportions (px at scale 1; the whole figure is ~134 px tall standing) */
export interface Build {
  thigh: number;
  shin: number;
  /** ankle height above the sole */
  ankle: number;
  torso: number;
  upper: number;
  fore: number;
  /** torso-local (u up the spine, v forward) anchors */
  shN: V;
  shF: V;
  neck: V;
  /** neck base -> head centre */
  headUp: number;
  /** half the hip width (legs attach at ±hipW along the pelvis line) */
  hipW: number;
  cueLen: number;
}

export const BUILD: Build = {
  thigh: 21,
  shin: 20,
  ankle: 7,
  torso: 50,
  upper: 24,
  fore: 23,
  shN: [43, -19],
  shF: [45, 15],
  neck: [49, 6],
  headUp: 13,
  hipW: 7,
  cueLen: 160,
};

export type EyeKind = 'open' | 'squint' | 'wide' | 'closed' | 'happy' | 'spiral' | 'x' | 'angry';
export type MouthKind = 'smirk' | 'grin' | 'grit' | 'shout' | 'o' | 'wavy';

export interface Face {
  eyes: EyeKind;
  /** -1 worried .. 1 furious */
  brow: number;
  mouth: MouthKind;
  /** mouth open 0..1 (shout / o) */
  open: number;
  /** pupil direction */
  lx: number;
  ly: number;
}

interface ArmFK {
  a: number;
  b: number;
}
interface ArmIK {
  x: number;
  y: number;
  /** +1 elbow down/out, -1 the other way */
  bend: number;
}
type Arm = ArmFK | ArmIK;
interface Leg {
  a: number;
  b: number;
  /** foot angle: 0 flat, + toe down */
  f: number;
}

export interface CueSpec {
  hand: 'N' | 'F';
  /** screen angle of the tip direction (0 = forward, -PI/2 = up) */
  ang: number;
  /** butt -> holding hand */
  grip: number;
  /** the other hand also grips at this distance from the butt (IK) */
  second?: number;
}

export interface Pose {
  root: { x: number; y: number; rot: number; sx: number; sy: number; py: number };
  hip: V;
  /** pelvis line tilt (rad) */
  pel: number;
  /** torso lean (rad, + = forward) */
  torso: number;
  /** head tilt (rad, + = chin down / forward) */
  head: number;
  armN: Arm;
  armF: Arm;
  legN: Leg;
  legF: Leg;
  cue: CueSpec;
  face: Face;
  /** 0..1 bicep flex (near arm) */
  flex: number;
  /** hand shapes */
  openN: boolean;
  openF: boolean;
  /** far arm is swung in front of the chest (draw it over the torso) */
  farFront: boolean;
  /** hair / shirt-tail flow (px back) — speed & air */
  flow: number;
}

export interface Smear {
  kind: 'swing' | 'thrust';
  t: number;
  alpha: number;
}

/** solved joints (character space, before the root transform) */
export interface Rig {
  b: Build;
  pose: Pose;
  hip: V;
  /** torso axis: up + forward unit vectors */
  up: V;
  fw: V;
  hipN: V;
  hipF: V;
  kneeN: V;
  kneeF: V;
  ankN: V;
  ankF: V;
  footN: number;
  footF: number;
  shN: V;
  shF: V;
  elN: V;
  elF: V;
  wrN: V;
  wrF: V;
  /** fist direction (screen angle) */
  handAN: number;
  handAF: number;
  neck: V;
  head: V;
  /** head rotation (screen, 0 = upright) */
  headA: number;
  cue: { butt: V; tip: V; dir: V; ang: number; hand: 'N' | 'F'; second: boolean; gripN?: V; gripF?: V };
  face: Face;
  flex: number;
  smear?: Smear;
  sparks: boolean;
  /** spin / tumble helpers for fx */
  pose2: string;
  t: number;
}

const D = Math.PI / 180;
export const limbDir = (a: number): V => [Math.sin(a), Math.cos(a)];

// ------------------------------------------------------------------------------ helpers

function T(hip: V, torso: number, u: number, v: number): V {
  const up: V = [Math.sin(torso), -Math.cos(torso)];
  const fw: V = [Math.cos(torso), Math.sin(torso)];
  return [hip[0] + up[0] * u + fw[0] * v, hip[1] + up[1] * u + fw[1] * v];
}

function basePose(): Pose {
  return {
    root: { x: 0, y: 0, rot: 0, sx: 1, sy: 1, py: 0 },
    hip: [0, -47],
    pel: 0,
    torso: 0,
    head: 0,
    armN: { a: 0, b: 0 },
    armF: { a: 0, b: 0 },
    legN: { a: 0, b: 0, f: 0 },
    legF: { a: 0, b: 0, f: 0 },
    cue: { hand: 'N', ang: -Math.PI / 2, grip: 30 },
    face: { eyes: 'squint', brow: 0.3, mouth: 'smirk', open: 0, lx: 1, ly: 0 },
    flex: 0,
    openN: false,
    openF: false,
    farFront: false,
    flow: 0,
  };
}

/** periodic Catmull-Rom through keys [phase, ...values] (phase in [0,1), sorted) */
function cyc(keys: number[][], ph: number, idx: number): number {
  const n = keys.length;
  const p = fract(ph);
  let i = n - 1;
  for (let k = 0; k < n; k++) if (keys[k][0] <= p) i = k;
  const k0 = keys[(i - 1 + n) % n];
  const k1 = keys[i];
  const k2 = keys[(i + 1) % n];
  const k3 = keys[(i + 2) % n];
  const t0 = k1[0];
  let t1 = k2[0];
  if (t1 <= t0) t1 += 1;
  let pp = p;
  if (pp < t0) pp += 1;
  const u = (pp - t0) / (t1 - t0);
  const a = k0[idx];
  const b = k1[idx];
  const c = k2[idx];
  const d = k3[idx];
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
}

// run cycle per leg: phase, thigh, shin, foot (deg). 0 = heel strike ahead, 0.2 mid-stance, 0.4 toe-off,
// 0.55 heel kick, 0.72 knee drive, 0.87 reach.
const RUN_LEG = [
  [0.0, 34, 4, -14],
  [0.2, 12, -30, 0],
  [0.4, -34, -26, 36],
  [0.55, -26, -104, 52],
  [0.72, 36, -70, 22],
  [0.87, 56, -8, -6],
];

function runLegs(P: Pose, ph: number, amp = 1): void {
  const L = (p: number): Leg => ({ a: cyc(RUN_LEG, p, 1) * D * amp, b: cyc(RUN_LEG, p, 2) * D * amp, f: cyc(RUN_LEG, p, 3) * D });
  P.legN = L(ph);
  P.legF = L(ph + 0.5);
  P.hip = [0, -44 + 3 * Math.cos(TAU * 2 * (ph - 0.2))];
}

/** hand target that rests the cue on the near shoulder (the bat carry): fist low in front of the chest, clear of the chin */
function carry(P: Pose, lift = 0): void {
  const h = T(P.hip, P.torso, 27 + lift, 2);
  P.armN = { x: h[0], y: h[1], bend: -1 };
  const top = T(P.hip, P.torso, 51 + lift * 0.6, -22);
  // aim from the fist centre (~8 px up the forearm) over the shoulder top
  const ang = Math.atan2(top[1] - (h[1] - 7), top[0] - (h[0] + 2));
  P.cue = { hand: 'N', ang, grip: 22 };
}

// ------------------------------------------------------------------------------ poses

function idle(s: SlimState, P: Pose): void {
  const time = s.time;
  const bp = s.beatPhase ?? fract(time * (164 / 60));
  const beat = s.beat ?? time * (164 / 60);
  const nod = beatBob(bp, 7);
  const q = squash(nod * 0.035);
  P.root.sx = q.sx;
  P.root.sy = q.sy;
  P.hip = [0, -46 + nod * 1.6];
  P.torso = -4 * D + Math.sin(time * 1.3) * 1.2 * D;
  P.head = 6 * D + nod * 6 * D;
  P.pel = -3 * D;
  P.legN = { a: -15 * D, b: -4 * D, f: 0 };
  P.legF = { a: 17 * D, b: 7 * D, f: 0 };
  const in2 = ((beat % 8) + 8) % 8;
  // far hand leans on the cue planted like a walking stick
  const hand: V = [35, -70 + nod * 1.5];
  P.armF = { x: hand[0], y: hand[1], bend: -1 };
  const spin = in2 >= 7.15 ? easeOut((in2 - 7.15) / 0.85) : 0;
  const lean = 7 * D;
  const ang = -Math.PI / 2 + lean;
  const grip = (-hand[1] - 1) / Math.cos(lean);
  P.cue = spin > 0 ? { hand: 'F', ang: ang - spin * TAU, grip: lerp(grip, BUILD.cueLen / 2, Math.min(1, bump(spin, 1) * 1.6)) } : { hand: 'F', ang, grip };
  if (in2 < 4) {
    // bar A: the near arm FLEXES behind his head — bicep peak toward the camera, the fist clear of the face
    const k = in2 < 0.4 ? easeOutBack(in2 / 0.4, 2.2) : in2 > 3.35 ? 1 - smooth((in2 - 3.35) / 0.65) : 1;
    P.flex = k;
    P.armN = { a: lerp(-8, -100, k) * D, b: lerp(10, 176, k) * D + Math.sin(time * 34) * 0.02 * k };
    P.face = { eyes: 'squint', brow: 0.2, mouth: k > 0.5 ? 'grin' : 'smirk', open: 0, lx: 1, ly: 0 };
    P.head = (6 - 6 * k) * D + nod * 5 * D;
  } else {
    // bar B: fist on the hip, shoulder roll on every beat
    const k = smooth(clamp01((in2 - 4) / 0.35));
    const roll = Math.sin(bp * Math.PI) * (1 - bp) * 2.2;
    const h = T(P.hip, P.torso, 10 + roll, -22);
    P.armN = { x: lerp(-12, h[0], k), y: lerp(-40, h[1], k), bend: -1 };
    if (k < 0.5) P.armN = { a: -8 * D, b: 10 * D };
    P.hip[1] += roll * 0.4;
    P.face = { eyes: 'squint', brow: 0.35, mouth: 'smirk', open: 0, lx: 1, ly: 0.1 };
  }
  if (blink(time, 5)) P.face.eyes = P.face.eyes === 'squint' ? 'closed' : P.face.eyes;
}

function run(s: SlimState, P: Pose): void {
  const ph = s.runPhase ?? s.time * 5.5;
  runLegs(P, ph);
  const b16 = Math.cos(TAU * 2 * (ph - 0.2));
  P.torso = 15 * D + b16 * 1.5 * D;
  P.pel = 6 * D;
  P.head = -8 * D - b16 * 2 * D;
  P.root.sx = 1 + b16 * 0.018;
  P.root.sy = 1 - b16 * 0.018;
  carry(P, -b16 * 1.2);
  // far arm pumps against the near leg
  const sw = Math.sin(TAU * ph);
  P.armF = { a: (15 + sw * 58) * D, b: (95 + sw * 50) * D };
  P.face = { eyes: blink(s.time, 5) ? 'closed' : 'angry', brow: 0.55, mouth: 'grit', open: 0, lx: 1, ly: 0 };
  P.flow = 6;
}

function hop(s: SlimState, P: Pose): void {
  const t = Math.max(0, s.poseTime);
  const k = easeOut(clamp01(t / 0.14));
  const v = velocityStretch(s.vy ?? -700, 1 / 3400, 0.16);
  const st = 1 - easeOut(clamp01(t / 0.2));
  P.root.sx = v.sx * (1 - 0.1 * st);
  P.root.sy = v.sy * (1 + 0.12 * st);
  P.root.py = -60;
  P.hip = [0, -50];
  P.torso = 10 * D;
  P.pel = 10 * D;
  P.head = -6 * D;
  // cannonball tuck: near knee drives up, far leg folds under
  P.legN = { a: lerp(-10, 78, k) * D, b: lerp(0, -38, k) * D, f: 18 * D };
  P.legF = { a: lerp(10, 28, k) * D, b: lerp(-10, -96, k) * D, f: 40 * D };
  carry(P, 2);
  P.cue.ang -= 0.12 * k;
  P.armF = { a: lerp(20, 128, k) * D, b: lerp(60, 150, k) * D };
  P.face = { eyes: 'squint', brow: 0.4, mouth: 'grin', open: 0, lx: 1, ly: -0.3 };
  P.flow = 5;
}

function fall(s: SlimState, P: Pose): void {
  const time = s.time;
  const v = velocityStretch(s.vy ?? 700, 1 / 3400, 0.14);
  P.root.sx = v.sx;
  P.root.sy = v.sy;
  P.root.py = -60;
  const w = Math.sin(time * 11);
  P.hip = [0, -49];
  P.torso = 4 * D;
  P.pel = 4 * D;
  P.head = 4 * D;
  // reaching for the ground: near leg down + forward, far leg bent back
  P.legN = { a: (26 + w * 4) * D, b: (6 + w * 3) * D, f: -8 * D };
  P.legF = { a: (-12 - w * 4) * D, b: -48 * D, f: 26 * D };
  carry(P, 3);
  P.cue.ang += 0.1;
  P.armF = { a: (104 + w * 8) * D, b: (128 + w * 10) * D };
  P.openF = true;
  P.face = { eyes: 'open', brow: 0.2, mouth: 'grit', open: 0, lx: 0.8, ly: 0.6 };
  P.flow = -4;
}

function land(s: SlimState, P: Pose): void {
  const t = Math.max(0, s.poseTime);
  const q = landSquash(t, 0.26);
  const k = 1 - easeOut(clamp01(t / 0.26));
  P.root.sx = q.sx;
  P.root.sy = q.sy;
  P.hip = [0, lerp(-46, -35, k)];
  P.torso = lerp(4, 24, k) * D;
  P.pel = 8 * D * k;
  P.head = lerp(4, -12, k) * D;
  P.legF = { a: lerp(16, 64, k) * D, b: lerp(6, -14, k) * D, f: 0 };
  P.legN = { a: lerp(-14, -22, k) * D, b: lerp(-4, -66, k) * D, f: lerp(0, 40, k) * D };
  carry(P, -2 * k);
  P.armF = { a: lerp(20, 36, k) * D, b: lerp(30, 20, k) * D };
  P.face = { eyes: 'squint', brow: 0.5, mouth: 'grit', open: 0, lx: 1, ly: 0.2 };
}

/** the cue's swing: screen angle over strike progress u (0 = low back wind-up, 1 = CONTACT forward-up, 2 = over the shoulder) */
export function swingAng(u: number): number {
  const K = [128, -12, -192];
  const i = Math.max(0, Math.min(1, Math.floor(u)));
  const f = smooth(Math.max(0, Math.min(1, u - i)));
  return lerp(K[i], K[i + 1], f) * D;
}

/** where the hands are along the swing (torso-local u,v) */
export function swingHands(u: number): V {
  // 0: low behind the hip, 1: arms thrown forward, 1.5: high in front of the face, 2: resting on the shoulder
  const K: V[] = [[14, -20], [34, 38], [80, 6], [44, -10]];
  const x = Math.max(0, Math.min(2, u)) * 1.5;
  const i = Math.min(2, Math.floor(x));
  const f = smooth(x - i);
  return [lerp(K[i][0], K[i + 1][0], f), lerp(K[i][1], K[i + 1][1], f)];
}

function strike(s: SlimState, P: Pose, R: { smear?: Smear }): void {
  const t = Math.max(0, s.poseTime);
  const u = strikeU(Math.min(t, 0.2), 2, 0.09, 0.2, 0.42, 1.8);
  const back = smooth((t - 0.2) / 0.24);
  const lean = bump(Math.min(t, 0.34), 0.34) * 0.6 + (t < 0.05 ? 0.4 * (1 - t / 0.05) : 0);
  const moving = (s.speed ?? 0) > 60;
  // the upper body swings; legs keep running, or plant a lunge when standing
  const base = basePose();
  if (moving) run(s, base);
  else idle(s, base);
  if (moving) {
    runLegs(P, s.runPhase ?? 0);
  } else {
    P.hip = [lerp(4, 0, back), lerp(-40, -46, back)];
    P.legF = { a: lerp(58, 17, back) * D, b: lerp(4, 7, back) * D, f: 0 };
    P.legN = { a: lerp(-38, -15, back) * D, b: lerp(-30, -4, back) * D, f: lerp(30, 0, back) * D };
  }
  // torso: thrown forward at contact, opens back as the cue wraps over
  const uu = Math.max(1, u);
  const open = smooth((uu - 1) / 0.8);
  P.torso = lerp(lerp(26, 12, open) * D, base.torso, back);
  P.pel = lerp(10 * D, base.pel, back);
  P.head = lerp(lerp(-10, -4, open) * D, base.head, back);
  const hv = swingHands(uu);
  const hand = T(P.hip, P.torso, hv[0], hv[1]);
  const ang = swingAng(uu);
  if (back > 0.02) {
    // blend the hands and the cue into the next pose's carry
    const tmp = basePose();
    tmp.hip = P.hip;
    tmp.torso = P.torso;
    carry(tmp);
    const bh = tmp.armN as ArmIK;
    const hx = lerp(hand[0], bh.x, back);
    const hy = lerp(hand[1], bh.y, back);
    let a2 = tmp.cue.ang;
    while (a2 - ang > Math.PI) a2 -= TAU;
    while (a2 - ang < -Math.PI) a2 += TAU;
    P.armN = { x: hx, y: hy, bend: -1 };
    P.cue = { hand: 'N', ang: lerp(ang, a2, back), grip: lerp(10, tmp.cue.grip, back), second: back < 0.45 ? 32 : undefined };
    P.armF = back < 0.45 ? { a: 0, b: 0 } : base.armF;
    if (!moving) P.armF = back < 0.45 ? P.armF : { a: 20 * D, b: 40 * D };
  } else {
    P.armN = { x: hand[0], y: hand[1], bend: -1 };
    P.cue = { hand: 'N', ang, grip: 10, second: 32 };
  }
  P.farFront = P.cue.second !== undefined;
  const q = squash(-0.07 * lean);
  P.root.sx = q.sx;
  P.root.sy = q.sy;
  P.face = { eyes: 'angry', brow: 1, mouth: t < 0.3 ? 'shout' : 'grit', open: 1 - smooth((t - 0.15) / 0.15), lx: 1, ly: -0.3 };
  P.flow = 7;
  if (t < 0.2) R.smear = { kind: 'swing', t, alpha: 1 - clamp01(t / 0.2) };
}

function heave(s: SlimState, P: Pose, R: { smear?: Smear }): void {
  const t = Math.max(0, s.poseTime);
  // BREAK SHOT: a full-body lunge, the cue driven straight through
  const k = t < 0.05 ? easeOut(t / 0.05) : 1 - smooth((t - 0.24) / 0.22);
  P.hip = [lerp(0, 12, k), lerp(-46, -34, k)];
  P.torso = lerp(6, 52, k) * D;
  P.pel = lerp(0, 18, k) * D;
  P.head = lerp(0, -46, k) * D;
  P.legF = { a: lerp(17, 72, k) * D, b: lerp(7, 8, k) * D, f: 0 };
  P.legN = { a: lerp(-15, -52, k) * D, b: lerp(-4, -64, k) * D, f: lerp(0, 50, k) * D };
  const hN = T(P.hip, P.torso, lerp(20, 30, k), lerp(-8, 36, k));
  P.armN = { x: hN[0], y: hN[1], bend: -1 };
  P.cue = { hand: 'N', ang: lerp(-80, -6, k) * D, grip: 12, second: k > 0.25 ? 70 : undefined };
  P.farFront = P.cue.second !== undefined;
  P.armF = { a: 60 * D, b: 80 * D };
  const q = squash(-0.1 * k);
  P.root.sx = q.sx;
  P.root.sy = q.sy;
  P.face = { eyes: 'angry', brow: 1, mouth: t < 0.35 ? 'shout' : 'grit', open: 1, lx: 1, ly: 0 };
  P.flow = 10 * k;
  if (t < 0.25) R.smear = { kind: 'thrust', t, alpha: 1 - clamp01(t / 0.25) };
}

function slide(s: SlimState, P: Pose, R: { sparks?: boolean }): void {
  // KNEE-SLIDE: both knees down, shins trailing on the floor, leaning back, cue raised like a guitar
  const w = Math.sin(s.time * 20) * 0.5;
  P.hip = [-2, -31 + w];
  P.torso = -24 * D;
  P.pel = -30 * D;
  P.head = -10 * D;
  P.legN = { a: 50 * D, b: -90 * D, f: 80 * D };
  P.legF = { a: 72 * D, b: -84 * D, f: 80 * D };
  P.armN = { a: 158 * D, b: 176 * D };
  P.cue = { hand: 'N', ang: -62 * D + w * 0.04, grip: 22 };
  P.armF = { a: 96 * D, b: 70 * D };
  P.openF = true;
  P.face = { eyes: 'squint', brow: -0.1, mouth: 'shout', open: 0.8, lx: 1, ly: -0.6 };
  P.flow = 9;
  R.sparks = true;
}

function stumble(s: SlimState, P: Pose): void {
  const t = Math.max(0, s.poseTime);
  const k = clamp01(t / 0.4);
  // knocked back: a tucked backward roll, limbs flung
  P.root.rot = -TAU * easeOut(k);
  P.root.y = -16 * bump(t, 0.4);
  P.root.py = -60;
  P.hip = [0, -46];
  P.torso = 18 * D;
  P.head = 16 * D;
  P.legN = { a: 80 * D, b: -30 * D, f: 20 * D };
  P.legF = { a: 55 * D, b: -80 * D, f: 30 * D };
  P.armN = { a: -150 * D, b: -110 * D };
  P.armF = { a: 150 * D, b: 175 * D };
  P.openN = true;
  P.openF = true;
  P.cue = { hand: 'N', ang: t * 22, grip: 60 };
  P.face = { eyes: 'spiral', brow: -0.6, mouth: 'wavy', open: 0, lx: 0, ly: 0 };
}

function dead(s: SlimState, P: Pose): void {
  const time = s.time;
  const w = Math.sin(time * 22);
  P.root.rot = 0.2 * Math.sin(time * 8);
  P.root.py = -60;
  P.hip = [0, -48];
  P.torso = -8 * D;
  P.head = -14 * D;
  P.legN = { a: (-34 + w * 18) * D, b: -60 * D, f: 40 * D };
  P.legF = { a: (38 - w * 18) * D, b: -20 * D, f: 10 * D };
  P.armN = { a: (-150 + w * 20) * D, b: (-170 + w * 30) * D };
  P.armF = { a: (150 - w * 20) * D, b: (170 - w * 30) * D };
  P.openN = true;
  P.openF = true;
  P.cue = { hand: 'F', ang: -1.2 + time * 9, grip: 80 };
  P.face = { eyes: 'x', brow: -0.8, mouth: 'o', open: 1, lx: 0, ly: 0 };
  P.flow = -8;
}

function victory(s: SlimState, P: Pose): void {
  const bp = s.beatPhase ?? fract(s.time * (164 / 60));
  const b = beatBob(bp, 5);
  P.root.sx = squash(b * 0.04).sx;
  P.root.sy = squash(b * 0.04).sy;
  P.hip = [0, -47 + b * 1.5];
  P.torso = -7 * D;
  P.pel = -4 * D;
  P.head = -14 * D;
  P.legN = { a: -16 * D, b: -4 * D, f: 0 };
  P.legF = { a: 18 * D, b: 6 * D, f: 0 };
  // cue thrust overhead (near hand), far arm double-pumps a bicep
  P.armN = { a: (-172 + b * 6) * D, b: (-178 + b * 4) * D };
  P.cue = { hand: 'N', ang: (-112 - b * 5) * D, grip: 34 };
  P.armF = { a: (88 + b * 6) * D, b: (178 - b * 10) * D };
  P.flex = 1;
  P.farFront = false;
  P.face = { eyes: 'happy', brow: -0.2, mouth: 'grin', open: 0, lx: 1, ly: -0.3 };
}

function respawn(s: SlimState, P: Pose): void {
  idle(s, P);
  const t = Math.max(0, s.poseTime);
  const pop = easeOutBack(clamp01(t / 0.18), 2.6);
  const q = squash((1 - pop) * -0.35);
  const l = t > 0.18 ? landSquash(t - 0.18, 0.25) : { sx: 1, sy: 1 };
  P.root.sx = q.sx * l.sx * (0.6 + 0.4 * pop);
  P.root.sy = q.sy * l.sy * (0.6 + 0.4 * pop);
  P.face = { ...P.face, eyes: t < 0.25 ? 'wide' : 'squint', mouth: 'grin' };
}

// ------------------------------------------------------------------------------ solve

function armJoints(sh: V, arm: Arm, b: Build, bendSign: number): [V, V, number, number] {
  let a: number;
  let c: number;
  if ('x' in arm) {
    const [up, lo] = ik2(sh[0], sh[1], b.upper, b.fore, arm.x, arm.y, arm.bend * bendSign);
    a = Math.PI / 2 - up;
    c = Math.PI / 2 - lo;
  } else {
    a = arm.a;
    c = arm.b;
  }
  const ua = limbDir(a);
  const fa = limbDir(c);
  const el: V = [sh[0] + ua[0] * b.upper, sh[1] + ua[1] * b.upper];
  const wr: V = [el[0] + fa[0] * b.fore, el[1] + fa[1] * b.fore];
  return [el, wr, a, c];
}

function legJoints(hp: V, leg: Leg, b: Build): [V, V] {
  const ta = limbDir(leg.a);
  const sa = limbDir(leg.b);
  const kn: V = [hp[0] + ta[0] * b.thigh, hp[1] + ta[1] * b.thigh];
  const an: V = [kn[0] + sa[0] * b.shin, kn[1] + sa[1] * b.shin];
  return [kn, an];
}

export function slimPose(s: SlimState): { P: Pose; smear?: Smear; sparks: boolean } {
  const P = basePose();
  const R: { smear?: Smear; sparks?: boolean } = {};
  switch (s.pose) {
    case 'idle':
      idle(s, P);
      break;
    case 'run':
      run(s, P);
      break;
    case 'hop':
      hop(s, P);
      break;
    case 'fall':
      fall(s, P);
      break;
    case 'land':
      land(s, P);
      break;
    case 'strike':
      strike(s, P, R);
      break;
    case 'heave':
      heave(s, P, R);
      break;
    case 'slide':
      slide(s, P, R);
      break;
    case 'stumble':
      stumble(s, P);
      break;
    case 'dead':
      dead(s, P);
      break;
    case 'respawn':
      respawn(s, P);
      break;
    case 'victory':
      victory(s, P);
      break;
  }
  if (s.lookX !== undefined || s.lookY !== undefined) {
    const dx = (s.lookX ?? 200) * (s.facing ?? 1);
    const dy = (s.lookY ?? 0) + 100;
    const d = Math.hypot(dx, dy) || 1;
    P.face.lx = dx / d;
    P.face.ly = dy / d;
  }
  return { P, smear: R.smear, sparks: !!R.sparks };
}

export function solveSlim(s: SlimState, b: Build = BUILD): Rig {
  const { P, smear, sparks } = slimPose(s);
  const hip = P.hip;
  const up: V = [Math.sin(P.torso), -Math.cos(P.torso)];
  const fw: V = [Math.cos(P.torso), Math.sin(P.torso)];
  const at = (u: number, v: number): V => [hip[0] + up[0] * u + fw[0] * v, hip[1] + up[1] * u + fw[1] * v];
  const pc = Math.cos(P.pel);
  const ps = Math.sin(P.pel);
  const hipN: V = [hip[0] - pc * b.hipW, hip[1] - ps * b.hipW];
  const hipF: V = [hip[0] + pc * b.hipW, hip[1] + ps * b.hipW];
  const [kneeN, ankN] = legJoints(hipN, P.legN, b);
  const [kneeF, ankF] = legJoints(hipF, P.legF, b);
  const shN = at(b.shN[0], b.shN[1]);
  const shF = at(b.shF[0], b.shF[1]);
  const neck = at(b.neck[0], b.neck[1]);
  const headA = P.torso * 0.5 + P.head;
  const head: V = [neck[0] + Math.sin(headA) * b.headUp + 2, neck[1] - Math.cos(headA) * b.headUp];
  let [elN, wrN, , cN] = armJoints(shN, P.armN, b, 1);
  let [elF, wrF, , cF] = armJoints(shF, P.armF, b, 1);
  // the cue
  const hand = P.cue.hand === 'N' ? wrN : wrF;
  const dir: V = [Math.cos(P.cue.ang), Math.sin(P.cue.ang)];
  // the cue runs through the middle of the fist, not the wrist
  const fa = P.cue.hand === 'N' ? Math.PI / 2 - cN : Math.PI / 2 - cF;
  const handPt: V = [hand[0] + Math.cos(fa) * 8, hand[1] + Math.sin(fa) * 8];
  const butt: V = [handPt[0] - dir[0] * P.cue.grip, handPt[1] - dir[1] * P.cue.grip];
  const tip: V = [butt[0] + dir[0] * b.cueLen, butt[1] + dir[1] * b.cueLen];
  let second = false;
  if (P.cue.second !== undefined) {
    second = true;
    const g2: V = [butt[0] + dir[0] * P.cue.second, butt[1] + dir[1] * P.cue.second];
    const sh2 = P.cue.hand === 'N' ? shF : shN;
    const dd = Math.hypot(g2[0] - sh2[0], g2[1] - sh2[1]) || 1;
    const w2: V = [g2[0] - ((g2[0] - sh2[0]) / dd) * 8, g2[1] - ((g2[1] - sh2[1]) / dd) * 8];
    if (P.cue.hand === 'N') [elF, wrF, , cF] = armJoints(shF, { x: w2[0], y: w2[1], bend: -1 }, b, 1);
    else [elN, wrN, , cN] = armJoints(shN, { x: w2[0], y: w2[1], bend: -1 }, b, 1);
  }
  const fistA = (c: number) => Math.PI / 2 - c;
  const handAN = fistA(cN);
  const handAF = fistA(cF);
  const gripN = P.cue.hand === 'N' || second ? wrN : undefined;
  const gripF = P.cue.hand === 'F' || second ? wrF : undefined;
  return {
    b,
    pose: P,
    hip,
    up,
    fw,
    hipN,
    hipF,
    kneeN,
    kneeF,
    ankN,
    ankF,
    footN: P.legN.f,
    footF: P.legF.f,
    shN,
    shF,
    elN,
    elF,
    wrN,
    wrF,
    handAN,
    handAF,
    neck,
    head,
    headA,
    cue: { butt, tip, dir, ang: P.cue.ang, hand: P.cue.hand, second, gripN, gripF },
    face: P.face,
    flex: P.flex,
    smear,
    sparks,
    pose2: s.pose,
    t: Math.max(0, s.poseTime),
  };
}

/** torso-local -> character space for a solved rig */
export function tAt(r: Rig, u: number, v: number): V {
  return [r.hip[0] + r.up[0] * u + r.fw[0] * v, r.hip[1] + r.up[1] * u + r.fw[1] * v];
}
