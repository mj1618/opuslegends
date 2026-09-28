/**
 * SLIM — the hero (the name is ironic): a hulking, barrel-chested 1973 pool shark. Tangerine tank
 * top with cream trim (the hero colour: he must pop), huge tattooed arms (bold traditional flash:
 * MOM heart, anchor, eight-ball, dagger + snake), slicked pompadour, mutton chops + horseshoe
 * moustache, rolled-up jeans, boots, chalk-dusted fists, and a pool cue for a weapon.
 * Built on the generic rig framework (src/art/rig): Skeleton + two-bone IK for two-handed grips,
 * volume-preserving squash, strike timing, smear ribbons.
 *
 *   drawSlim(ctx, x, y, state)   // origin = feet centre on the ground; ~130 px tall at scale 1
 *
 * Poses: idle (swagger: heavy nod on the beat; bar A flexes, bar B chalks the cue, the cue spins on
 * the last beat of every 2 bars) · run (stomping) · hop · fall · land · strike (BIG CUE SWING:
 * contact at t=0, huge follow-through crescent) · heave (POWER-SHOT THRUST: lunge + shock ring) ·
 * slide (knee-slide with sparks) · stumble · dead (falls out of frame) · respawn (splice pop) ·
 * victory (flex with the cue overhead).
 */
import type { Ctx } from '../core/canvas';
import { drawGlow, puff, star4 } from '../core/draw';
import { TAU, bump, clamp01, easeOut, easeOutBack, fract, hash, lerp, smooth } from '../core/math';
import { CF } from '../palette';
import { beatBob, landSquash, squash, strikeU, velocityStretch } from '../rig/motion';
import { type EyeStyle, type Ink, type MouthStyle, blink, brow, capsulePath, cartoonEye, cartoonMouth, inked, limb } from '../rig/parts';
import { type Pose, type RootXf, Skeleton, blendPose, ik2 } from '../rig/skeleton';
import { drawSmear, speedLines } from '../rig/smear';

export type SlimPose = 'idle' | 'run' | 'hop' | 'fall' | 'land' | 'strike' | 'heave' | 'slide' | 'stumble' | 'dead' | 'respawn' | 'victory';

export const SLIM_POSES: SlimPose[] = ['idle', 'run', 'hop', 'fall', 'land', 'strike', 'heave', 'slide', 'stumble', 'dead', 'respawn', 'victory'];

export const SLIM_POSE_LEN: Partial<Record<SlimPose, number>> = { land: 0.3, strike: 0.46, heave: 0.5, stumble: 0.4, respawn: 0.45 };

/** px of travel per leg cycle (2 cycles per beat at 384 px/beat) */
export const SLIM_STRIDE = 192;

export interface SlimState {
  pose: SlimPose;
  poseTime: number;
  time: number;
  beatPhase?: number;
  /** float beat (idle swagger cycle) */
  beat?: number;
  runPhase?: number;
  speed?: number;
  vy?: number;
  facing?: 1 | -1;
  scale?: number;
  squashX?: number;
  squashY?: number;
  lookX?: number;
  lookY?: number;
  /** 0..1 PERFECT: radial speed-line burst (the film's slow-mo replay) */
  perfect?: number;
  bones?: boolean;
}

const O = CF.filmBlack;
const INK: Ink = { line: O, w: 3 };
const UP = -Math.PI / 2;

const SKIN = '#C98E68';
const SKIN_SH = '#9A6446';
const DENIM = '#3D5A86';
const DENIM_SH = '#2A3F60';
const CUFF = '#8FA8C8';
const BOOT = '#5A3A24';
const BRASS = '#9A7A3A';
const CHALK = '#8FC8E8';
const TAT = '#1E2A3A';
const TAT_RED = '#7E3A30';
const TAT_JADE = '#2F7A62';

export const SLIM_BONES = new Skeleton([
  { name: 'pelvis', x: 0, y: -42, rot: UP, len: 10 },
  { name: 'spine', parent: 'pelvis', x: 10, y: 0, len: 30 },
  { name: 'head', parent: 'spine', x: 34, y: 0, len: 30 },
  { name: 'armB', parent: 'spine', x: 25, y: -9, rot: Math.PI, len: 24 },
  { name: 'foreB', parent: 'armB', x: 24, y: 0, len: 23 },
  { name: 'armF', parent: 'spine', x: 25, y: 9, rot: Math.PI, len: 24 },
  { name: 'foreF', parent: 'armF', x: 24, y: 0, len: 23 },
  { name: 'thighB', parent: 'pelvis', x: 0, y: -7, rot: Math.PI, len: 21 },
  { name: 'shinB', parent: 'thighB', x: 21, y: 0, len: 21 },
  { name: 'thighF', parent: 'pelvis', x: 0, y: 7, rot: Math.PI, len: 21 },
  { name: 'shinF', parent: 'thighF', x: 21, y: 0, len: 21 },
]);

const CUE_LEN = 172;

interface Cue {
  /** hand holding the cue */
  hand: 'F' | 'B';
  /** WORLD angle of the tip direction */
  angle: number;
  /** distance from the butt to the holding hand */
  grip: number;
  /** other hand also grips at this distance from the butt (IK) */
  second?: number;
}

interface Face {
  eyes: EyeStyle;
  lid: number;
  brow: number;
  mouth: MouthStyle;
  open: number;
  lx: number;
  ly: number;
}

interface Frame {
  pose: Pose;
  root: RootXf;
  face: Face;
  cue: Cue;
  flex: number;
  chalk: number;
  smear?: { t: number; alpha: number; kind: 'swing' | 'thrust' };
  sparks?: boolean;
}

const armRel = (world: number, spineW: number) => world - spineW - Math.PI;

/** strike swing: WORLD angle of the cue over strike progress u (0 = back-low, 1 = contact forward, 2 = wrapped over the shoulder) */
function swingAngle(u: number): number {
  const K = [2.5, -0.15, -2.6];
  const i = Math.max(0, Math.min(1, Math.floor(u)));
  const t = smooth(Math.max(0, Math.min(1, u - i)));
  return lerp(K[i], K[i + 1], t);
}

function frameFor(s: SlimState): Frame {
  const t = Math.max(0, s.poseTime);
  const time = s.time;
  const bp = s.beatPhase ?? fract(time * (164 / 60));
  const beat = s.beat ?? time * (164 / 60);
  const vy = s.vy ?? 0;
  const f: Frame = {
    pose: {},
    root: {},
    face: { eyes: 'squint', lid: 0.35, brow: 0.3, mouth: 'smirk', open: 0, lx: 0.8, ly: 0 },
    cue: { hand: 'B', angle: UP + 0.08, grip: 30 },
    flex: 0,
    chalk: 0,
  };
  if (s.lookX !== undefined || s.lookY !== undefined) {
    const dx = (s.lookX ?? 200) * (s.facing ?? 1);
    const dy = (s.lookY ?? 0) + 100;
    const d = Math.hypot(dx, dy) || 1;
    f.face.lx = dx / d;
    f.face.ly = dy / d;
  }
  const P = f.pose;
  const blinkNow = blink(time, 5);
  switch (s.pose) {
    case 'idle': {
      // heavy nod: knees give on the beat
      const nod = beatBob(bp, 7);
      const q = squash(nod * 0.06);
      f.root = { sx: q.sx, sy: q.sy, y: nod * 2 };
      const roll = Math.sin(time * 1.4) * 0.03;
      P.pelvis = { rot: 0.04 + roll };
      P.spine = { rot: -0.02 - nod * 0.04 };
      P.head = { rot: 0.1 + nod * 0.12 };
      P.thighF = { rot: -0.25 };
      P.shinF = { rot: 0.1 + nod * 0.18 };
      P.thighB = { rot: 0.28 };
      P.shinB = { rot: 0.06 + nod * 0.14 };
      const spineW = UP + 0.02;
      const in2 = ((beat % 8) + 8) % 8;
      if (in2 < 4) {
        // bar A: FLEX — front arm curls up into a bicep peak on beat 1, holds, eases down
        const k = in2 < 0.35 ? easeOutBack(in2 / 0.35, 2) : in2 > 3.3 ? 1 - smooth((in2 - 3.3) / 0.7) : 1;
        f.flex = k;
        P.armF = { rot: armRel(lerp(1.0, 0.3, k), spineW) };
        P.foreF = { rot: lerp(-1.0, -1.35, k) + Math.sin(time * 30) * 0.02 * k };
        f.face = { ...f.face, mouth: k > 0.5 ? 'teeth' : 'smirk', eyes: 'squint', brow: 0.1 };
      } else {
        // bar B: CHALK THE CUE — front hand twists a chalk cube on the tip; blue dust on the beats
        const k = smooth(clamp01((in2 - 4) / 0.3)) * (1 - smooth(clamp01((in2 - 7.3) / 0.4)));
        f.chalk = k * (0.5 + 0.5 * Math.sin(time * 18));
        P.armF = { rot: armRel(lerp(1.0, 0.1, k), spineW) };
        P.foreF = { rot: lerp(-1.0, -1.45, k) };
        f.face = { ...f.face, lx: 0.5, ly: -0.8, eyes: 'normal', lid: 0.45 };
      }
      P.armB = { rot: armRel(1.45, spineW) };
      P.foreB = { rot: -0.55 };
      // cue planted like a staff in the back hand; SPINS on the last beat of every 2 bars
      const spin = in2 >= 7.2 ? easeOut((in2 - 7.2) / 0.8) * TAU : 0;
      f.cue = { hand: 'B', angle: UP + 0.12 - spin, grip: spin > 0 ? 86 : 52 };
      if (!f.flex || f.flex < 0.5) f.face.lid = blinkNow ? 1 : f.face.lid;
      break;
    }
    case 'run': {
      const ph = (s.runPhase ?? time * 5.5) * TAU;
      const b16 = Math.cos(ph * 2);
      f.root = { y: -3 + b16 * 4, ...squash(b16 * 0.04) };
      P.pelvis = { rot: 0.22 };
      P.spine = { rot: 0.12 + b16 * 0.03 };
      P.head = { rot: -0.3 };
      const sw = Math.sin(ph);
      P.thighF = { rot: -sw * 0.95 - 0.1 };
      P.shinF = { rot: Math.max(0, Math.cos(ph)) * 1.5 + 0.2 };
      P.thighB = { rot: sw * 0.95 - 0.1 };
      P.shinB = { rot: Math.max(0, -Math.cos(ph)) * 1.5 + 0.2 };
      const spineW = UP + 0.34;
      P.armF = { rot: armRel(1.05 + sw * 0.7, spineW) };
      P.foreF = { rot: -1.3 };
      P.armB = { rot: armRel(1.9 - sw * 0.35, spineW) };
      P.foreB = { rot: -0.9 };
      f.cue = { hand: 'B', angle: Math.PI - 0.12 + Math.sin(ph * 2) * 0.04, grip: 70 };
      f.face = { ...f.face, mouth: 'teeth', eyes: blinkNow ? 'closed' : 'squint', brow: 0.6 };
      break;
    }
    case 'hop':
    case 'fall': {
      const up = s.pose === 'hop';
      const st = up ? 1 - easeOut(t / 0.22) : 0;
      const v = velocityStretch(vy, 1 / 3200, 0.2);
      f.root = { sx: v.sx * (1 - 0.18 * st), sy: v.sy * (1 + 0.22 * st) };
      const spineW = UP + (up ? 0.05 : -0.05);
      if (up) {
        const k = easeOut(clamp01(t / 0.16));
        P.pelvis = { rot: 0.1 * k };
        P.thighF = { rot: -1.5 * k - 0.2 };
        P.shinF = { rot: 1.8 * k };
        P.thighB = { rot: -0.7 * k + 0.2 };
        P.shinB = { rot: 1.9 * k };
        P.armF = { rot: armRel(-1.2, spineW) };
        P.foreF = { rot: -0.6 };
        P.armB = { rot: armRel(-1.7, spineW) };
        P.foreB = { rot: -0.3 };
        f.cue = { hand: 'F', angle: Math.PI + 0.25, grip: 86, second: 40 };
        f.face = { ...f.face, mouth: 'teeth', eyes: 'squint', brow: 0.5 };
      } else {
        const w = Math.sin(time * 12);
        P.thighF = { rot: -0.6 + w * 0.12 };
        P.shinF = { rot: 0.7 };
        P.thighB = { rot: 0.25 - w * 0.12 };
        P.shinB = { rot: 0.6 };
        P.armF = { rot: armRel(-0.5 + w * 0.2, spineW) };
        P.foreF = { rot: -0.4 };
        P.armB = { rot: armRel(-2.4 - w * 0.2, spineW) };
        P.foreB = { rot: 0.2 };
        f.cue = { hand: 'B', angle: -Math.PI + 0.35 + w * 0.05, grip: 70 };
        f.face = { ...f.face, eyes: 'wide', mouth: 'o', open: 0.7, brow: -0.3, lid: 0 };
      }
      break;
    }
    case 'land': {
      const q = landSquash(t, 0.3);
      const k = 1 - easeOut(t / 0.24);
      f.root = { sx: q.sx, sy: q.sy };
      const spineW = UP + 0.25 * k;
      P.pelvis = { rot: 0.25 * k, y: 9 * k };
      P.thighF = { rot: -1.0 * k - 0.25 };
      P.shinF = { rot: 1.4 * k + 0.1 };
      P.thighB = { rot: 0.7 * k + 0.3 };
      P.shinB = { rot: 1.1 * k };
      P.armF = { rot: armRel(0.9 - 0.9 * k, spineW) };
      P.foreF = { rot: -1.1 };
      P.armB = { rot: armRel(1.6, spineW) };
      P.foreB = { rot: -0.6 };
      f.cue = { hand: 'B', angle: UP + 0.12 + 0.6 * k, grip: 52 };
      f.face = { ...f.face, lid: 0.55 * k, mouth: 'teeth' };
      break;
    }
    case 'strike': {
      // BIG CUE SWING: two hands on the butt, contact (cue forward) AT t=0, huge follow-through over the shoulder
      const u = strikeU(Math.min(t, 0.2), 2, 0.1, 0.2, 0.42, 1.8);
      const back = smooth((t - 0.2) / 0.24);
      const lean = bump(t, 0.34);
      const spineW = UP + 0.18 * lean;
      const act: Pose = {
        pelvis: { rot: 0.14 * lean, y: 6 * lean },
        spine: { rot: 0.04 * lean },
        head: { rot: -0.15 * lean },
        thighF: { rot: -0.9 * lean - 0.2 },
        shinF: { rot: 0.9 * lean + 0.1 },
        thighB: { rot: 0.7 * lean + 0.25 },
        shinB: { rot: 0.1 },
      };
      const a = swingAngle(Math.max(1, u));
      // front hand out along the swing, a little below the cue line
      act.armF = { rot: armRel(a + 0.45, spineW) };
      act.foreF = { rot: -0.25 };
      const idle = frameFor({ ...s, pose: 'idle', poseTime: 0 });
      Object.assign(P, back > 0 ? blendPose(act, idle.pose, back) : act);
      f.cue = back >= 1 ? idle.cue : { hand: 'F', angle: lerp(a, idle.cue.angle - TAU, back), grip: 36, second: back < 0.5 ? 8 : undefined };
      const q = squash(-0.06 * lean);
      f.root = { sx: q.sx, sy: q.sy };
      f.face = { ...f.face, eyes: 'angry', brow: 0.9, mouth: t < 0.3 ? 'shout' : 'smirk', open: 1 - smooth((t - 0.15) / 0.15), lx: 1, ly: -0.2 };
      if (t < 0.2) f.smear = { t, alpha: 1 - clamp01(t / 0.2), kind: 'swing' };
      break;
    }
    case 'heave': {
      // POWER-SHOT THRUST: full-body lunge, cue driven straight through the target (break shot)
      const k = t < 0.05 ? easeOut(t / 0.05) : 1 - smooth((t - 0.22) / 0.2);
      const spineW = UP + 0.45 * k;
      P.pelvis = { rot: 0.4 * k, y: 12 * k };
      P.spine = { rot: 0.05 * k };
      P.head = { rot: -0.45 * k };
      P.thighF = { rot: -1.2 * k - 0.1 };
      P.shinF = { rot: 1.2 * k };
      P.thighB = { rot: 1.0 * k + 0.2 };
      P.shinB = { rot: 0.05 };
      P.armF = { rot: armRel(lerp(0.9, -0.05, k), spineW) };
      P.foreF = { rot: lerp(-1.1, 0, k) };
      f.cue = { hand: 'F', angle: lerp(UP + 0.12, 0.02, k), grip: lerp(52, 120, k), second: k > 0.3 ? lerp(52, 40, k) : undefined };
      const q = squash(-0.1 * k);
      f.root = { sx: q.sx, sy: q.sy };
      f.face = { ...f.face, eyes: 'angry', brow: 1, mouth: t < 0.35 ? 'shout' : 'smirk', open: 1, lx: 1, ly: 0 };
      if (t < 0.25) f.smear = { t, alpha: 1 - clamp01(t / 0.25), kind: 'thrust' };
      break;
    }
    case 'slide': {
      // knee-slide across the bar top / felt: back knee down (sparks), front foot planted,
      // torso upright leaning back, arms flung wide, cue out front
      const pelW = UP - 0.12;
      P.pelvis = { rot: -0.12, y: 20 };
      P.spine = { rot: -0.18 };
      P.head = { rot: 0.05 };
      P.thighF = { rot: 0.2 - pelW - Math.PI };
      P.shinF = { rot: Math.PI / 2 - 0.2 };
      P.thighB = { rot: 1.95 - pelW - Math.PI };
      P.shinB = { rot: Math.PI - 1.95 };
      const spineW = pelW - 0.18;
      P.armF = { rot: armRel(-0.35, spineW) };
      P.foreF = { rot: -0.25 };
      P.armB = { rot: armRel(-2.5, spineW) };
      P.foreB = { rot: 0.3 };
      f.cue = { hand: 'F', angle: -0.3, grip: 60 };
      f.sparks = true;
      f.face = { ...f.face, mouth: 'teeth', eyes: 'squint', brow: 0.4 };
      break;
    }
    case 'stumble': {
      const k = clamp01(t / 0.4);
      f.root = { rot: -TAU * easeOut(k), y: -18 * bump(t, 0.4), py: -60 };
      const spineW = UP;
      P.armB = { rot: armRel(-2.2, spineW) };
      P.foreB = { rot: -2.3 };
      P.armF = { rot: armRel(-1.9, spineW) };
      P.foreF = { rot: -2.4 };
      P.thighF = { rot: -0.8 };
      P.thighB = { rot: 0.6 };
      P.shinF = { rot: 1 };
      f.cue = { hand: 'B', angle: t * 22, grip: 86 };
      f.face = { ...f.face, eyes: 'spiral', mouth: 'wavy', brow: -0.5 };
      break;
    }
    case 'dead': {
      // falls out of the frame, flailing (the engine moves him; the film rewinds)
      const w = Math.sin(time * 24);
      const spineW = UP + 0.2;
      f.root = { rot: 0.2 * Math.sin(time * 9), py: -60 };
      P.armB = { rot: armRel(-2.6 + w * 0.4, spineW) };
      P.foreB = { rot: 0.3 };
      P.armF = { rot: armRel(-2.1 - w * 0.4, spineW) };
      P.foreF = { rot: 0.4 };
      P.thighF = { rot: -1.0 + w * 0.3 };
      P.shinF = { rot: 0.9 };
      P.thighB = { rot: -0.2 - w * 0.3 };
      P.shinB = { rot: 1.2 };
      f.cue = { hand: 'F', angle: -1.2 + time * 9, grip: 86 };
      f.face = { ...f.face, eyes: 'wide', mouth: 'o', open: 1, brow: -0.7, lid: 0 };
      break;
    }
    case 'respawn': {
      const idle = frameFor({ ...s, pose: 'idle', poseTime: 0 });
      Object.assign(P, idle.pose);
      f.cue = idle.cue;
      const pop = easeOutBack(clamp01(t / 0.18), 2.6);
      const q = squash((1 - pop) * -0.35);
      const l = t > 0.18 ? landSquash(t - 0.18, 0.25) : { sx: 1, sy: 1 };
      f.root = { sx: q.sx * l.sx * (0.6 + 0.4 * pop), sy: q.sy * l.sy * (0.6 + 0.4 * pop) };
      f.face = { ...idle.face, eyes: t < 0.25 ? 'wide' : 'squint', mouth: 'teeth' };
      break;
    }
    case 'victory': {
      // cue overhead in the front hand, back arm in a big flex; pumps on the beat
      const b = beatBob(bp, 5);
      const spineW = UP - 0.04;
      f.root = { ...squash(b * 0.05), y: b * 2 };
      P.spine = { rot: -0.06 };
      P.head = { rot: -0.15 };
      P.thighF = { rot: -0.35 };
      P.thighB = { rot: 0.35 };
      P.armB = { rot: armRel(-2.2 - b * 0.15, spineW) };
      P.foreB = { rot: -0.2 };
      P.armF = { rot: armRel(0.35, spineW) };
      P.foreF = { rot: -1.4 - b * 0.1 };
      f.flex = 1;
      f.cue = { hand: 'B', angle: -Math.PI / 2 + 0.2 - b * 0.1, grip: 60 };
      f.face = { ...f.face, eyes: 'happy', mouth: 'teeth', brow: -0.1 };
      break;
    }
  }
  return f;
}

// ------------------------------------------------------------------------------ IK for the second hand

function cueEnds(sk: Skeleton, c: Cue) {
  const [hx, hy] = sk.tip(c.hand === 'F' ? 'foreF' : 'foreB');
  const ca = Math.cos(c.angle);
  const sa = Math.sin(c.angle);
  return { hx, hy, ca, sa, bx: hx - ca * c.grip, by: hy - sa * c.grip, tx: hx + ca * (CUE_LEN - c.grip), ty: hy + sa * (CUE_LEN - c.grip) };
}

function solve(sk: Skeleton, f: Frame): void {
  sk.solve(f.pose, f.root);
  if (f.cue.second === undefined) return;
  const e = cueEnds(sk, f.cue);
  const tx = e.bx + e.ca * f.cue.second;
  const ty = e.by + e.sa * f.cue.second;
  const other = f.cue.hand === 'F' ? 'B' : 'F';
  const arm = other === 'F' ? 'armF' : 'armB';
  const fore = other === 'F' ? 'foreF' : 'foreB';
  const [sx, sy] = sk.point(arm);
  const [up, lo] = ik2(sx, sy, 24, 23, tx, ty, other === 'B' ? -1 : 1);
  const spineW = sk.angle('spine');
  f.pose[arm] = { rot: up - spineW - Math.PI };
  f.pose[fore] = { rot: lo - up };
  sk.solve(f.pose, f.root);
}

// ------------------------------------------------------------------------------ painting

function tattooArm(g: Ctx, upper: boolean, near: boolean) {
  // drawn in limb space: +x along the limb, y across (±8)
  g.save();
  g.lineWidth = 1.4;
  g.strokeStyle = TAT;
  if (upper && near) {
    // MOM heart with a banner
    g.fillStyle = TAT_RED;
    g.beginPath();
    g.moveTo(13, 5);
    g.bezierCurveTo(6, 0, 7, -6, 11, -5);
    g.bezierCurveTo(12, -8, 18, -8, 17, -3);
    g.bezierCurveTo(17, 1, 14, 3, 13, 5);
    g.fill();
    g.stroke();
    g.fillStyle = CF.cream;
    g.fillRect(6, -1.8, 14, 4.2);
    g.strokeRect(6, -1.8, 14, 4.2);
    g.fillStyle = TAT;
    g.font = '700 3.6px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(13, 0.3);
    g.rotate(Math.PI / 2);
    g.restore();
    g.fillText('MOM', 13, 0.4);
  } else if (!upper && near) {
    // anchor
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(4, 0);
    g.lineTo(17, 0);
    g.moveTo(6, -4);
    g.lineTo(6, 4);
    g.moveTo(17, -5);
    g.quadraticCurveTo(21, 0, 17, 5);
    g.stroke();
    g.beginPath();
    g.arc(3, 0, 1.8, 0, TAU);
    g.stroke();
  } else if (upper) {
    // dagger + snake
    g.fillStyle = CF.creamShade;
    g.beginPath();
    g.moveTo(3, -1.5);
    g.lineTo(18, 0);
    g.lineTo(3, 1.5);
    g.closePath();
    g.fill();
    g.stroke();
    g.strokeStyle = TAT_JADE;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(4, 4);
    g.bezierCurveTo(8, -5, 12, 6, 16, -4);
    g.stroke();
  } else {
    // eight-ball
    g.fillStyle = TAT;
    g.beginPath();
    g.arc(12, 0, 5, 0, TAU);
    g.fill();
    g.fillStyle = CF.cream;
    g.beginPath();
    g.arc(12, 0, 2.3, 0, TAU);
    g.fill();
    g.fillStyle = TAT;
    g.font = '700 3.2px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('8', 12, 0.3);
  }
  g.restore();
}

function drawArm(g: Ctx, sk: Skeleton, arm: string, fore: string, near: boolean, flex: number) {
  const [sx, sy] = sk.point(arm);
  const [ex, ey] = sk.point(fore);
  const [hx, hy] = sk.tip(fore);
  const col = near ? SKIN : SKIN_SH;
  // upper arm (bicep bulges with flex)
  const au = Math.atan2(ey - sy, ex - sx);
  const lu = Math.hypot(ex - sx, ey - sy);
  g.save();
  g.translate(sx, sy);
  g.rotate(au);
  capsulePath(g, 0, 0, 8.5, lu, 0, 7);
  inked(g, col, INK);
  g.beginPath();
  g.ellipse(lu * 0.5, -3 - flex * 3, 7 + flex * 3, 5 + flex * 4, 0, 0, TAU);
  g.fillStyle = col;
  g.fill();
  if (flex > 0.3) {
    g.lineWidth = 2;
    g.strokeStyle = O;
    g.beginPath();
    g.ellipse(lu * 0.5, -3 - flex * 3, 7 + flex * 3, 5 + flex * 4, 0, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
  }
  tattooArm(g, true, near);
  g.restore();
  // Popeye forearm: widens toward the wrist
  const af = Math.atan2(hy - ey, hx - ex);
  const lf = Math.hypot(hx - ex, hy - ey);
  g.save();
  g.translate(ex, ey);
  g.rotate(af);
  capsulePath(g, 0, 0, 6.5, lf - 2, 0, 8.5);
  inked(g, col, INK);
  tattooArm(g, false, near);
  // fist, chalk-dusted
  g.beginPath();
  g.ellipse(lf + 4, 0, 8.5, 7.5, 0, 0, TAU);
  inked(g, col, INK);
  g.fillStyle = CHALK;
  g.globalAlpha = 0.55;
  g.beginPath();
  g.ellipse(lf + 7, -3, 4, 2.5, 0.4, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = O;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(lf + 5, -6);
  g.lineTo(lf + 5, 6);
  g.stroke();
  g.restore();
}

function drawLeg(g: Ctx, sk: Skeleton, thigh: string, shin: string, near: boolean) {
  const [hx, hy] = sk.point(thigh);
  const [kx, ky] = sk.point(shin);
  const [ax, ay] = sk.tip(shin);
  const col = near ? DENIM : DENIM_SH;
  limb(g, [hx, hy, kx, ky, ax, ay - 4], 17, col, INK);
  // denim seam
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(hx + 3, hy);
  g.lineTo(kx + 3, ky);
  g.lineTo(ax + 3, ay - 8);
  g.stroke();
  const a = sk.angle(shin) - Math.PI / 2;
  g.save();
  g.translate(ax, ay);
  g.rotate(a);
  // rolled cuff
  g.beginPath();
  g.rect(-10, -12, 20, 6);
  inked(g, CUFF, { line: O, w: 2 });
  // boot
  g.beginPath();
  g.moveTo(-9, -7);
  g.lineTo(8, -7);
  g.quadraticCurveTo(19, -5, 19, 1);
  g.lineTo(19, 3);
  g.lineTo(-10, 3);
  g.closePath();
  inked(g, near ? BOOT : '#3E2818', INK);
  g.fillStyle = '#2A1A10';
  g.fillRect(-10, 0, 29, 3);
  g.restore();
}

function drawTorso(g: Ctx, sk: Skeleton) {
  sk.apply(g, 'pelvis');
  // jeans seat + belt with a brass buckle
  capsulePath(g, -6, 0, 14, 8, 0, 15);
  inked(g, DENIM, INK);
  g.fillStyle = '#2A1A10';
  g.fillRect(7, -15, 5, 30);
  g.fillStyle = BRASS;
  g.fillRect(6.5, 9, 6, 7);
  g.restore();
  sk.apply(g, 'spine');
  // barrel chest in a tangerine tank top (+x up the spine, +y forward)
  g.beginPath();
  g.moveTo(-4, -18);
  g.bezierCurveTo(10, -26, 26, -30, 35, -21);
  g.quadraticCurveTo(40, 0, 34, 26);
  g.bezierCurveTo(26, 35, 12, 33, 2, 24);
  g.quadraticCurveTo(-9, 4, -4, -18);
  g.closePath();
  inked(g, CF.tangerine, INK);
  // shadow side (back) block
  g.save();
  g.clip();
  g.fillStyle = CF.tangerineShade;
  g.beginPath();
  g.ellipse(14, -24, 26, 11, 0.1, 0, TAU);
  g.fill();
  // pec line
  g.strokeStyle = CF.tangerineShade;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(20, 4);
  g.quadraticCurveTo(24, 16, 31, 18);
  g.stroke();
  g.restore();
  // cream trim: neckline + armhole
  g.strokeStyle = CF.cream;
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(34, -2);
  g.quadraticCurveTo(28, 8, 34, 16);
  g.stroke();
  g.beginPath();
  g.arc(25, -6, 8, -0.4, 2.2);
  g.stroke();
  // skin at the neckline + chest hair tuft
  g.fillStyle = SKIN;
  g.beginPath();
  g.moveTo(34, -1);
  g.quadraticCurveTo(29, 8, 34, 15);
  g.lineTo(36, 14);
  g.lineTo(36, 0);
  g.closePath();
  g.fill();
  g.restore();
}

function drawHead(g: Ctx, sk: Skeleton, face: Face, time: number) {
  const [nx, ny] = sk.point('head', -4, 0);
  const [cx, cy] = sk.point('head', 10, 0);
  limb(g, [nx, ny, cx, cy], 17, SKIN_SH, INK);
  sk.apply(g, 'head');
  g.translate(15, 0);
  g.rotate(Math.PI / 2);
  // square-jawed head
  g.beginPath();
  g.moveTo(-12, -12);
  g.quadraticCurveTo(0, -17, 12, -11);
  g.quadraticCurveTo(15, 0, 13, 9);
  g.quadraticCurveTo(8, 16, -2, 15);
  g.quadraticCurveTo(-13, 12, -13, 0);
  g.closePath();
  inked(g, SKIN, INK);
  // ear
  g.beginPath();
  g.ellipse(-4, 1, 3.2, 4.2, 0, 0, TAU);
  inked(g, SKIN_SH, { line: O, w: 1.6 });
  // slicked pompadour (quiff forward) + shine streak
  g.beginPath();
  g.moveTo(-13, 2);
  g.quadraticCurveTo(-16, -14, -4, -20);
  g.quadraticCurveTo(10, -27, 19, -17);
  g.quadraticCurveTo(15, -15, 12, -11);
  g.quadraticCurveTo(0, -14, -8, -9);
  g.lineTo(-8, 1);
  g.closePath();
  inked(g, CF.hair, INK);
  g.strokeStyle = 'rgba(200,210,230,0.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-6, -17);
  g.quadraticCurveTo(4, -23, 14, -18);
  g.stroke();
  // mutton chops down to a horseshoe moustache
  g.fillStyle = CF.hair;
  g.beginPath();
  g.moveTo(-8, -3);
  g.lineTo(-3, -3);
  g.quadraticCurveTo(0, 6, 5, 7);
  g.lineTo(13, 5);
  g.quadraticCurveTo(15, 6, 13, 9);
  g.lineTo(6, 10);
  g.lineTo(6, 16);
  g.lineTo(3, 16);
  g.lineTo(2, 11);
  g.quadraticCurveTo(-6, 10, -8, -3);
  g.closePath();
  g.fill();
  // eye + heavy brow + nose
  cartoonEye(g, 7.5, -4, { r: 3.4, lookX: face.lx, lookY: face.ly, style: face.eyes, lid: face.lid, lidTilt: face.brow * 0.35, lidColor: SKIN, ink: { line: O, w: 1.5 }, time });
  brow(g, 7.5, -9.5, 9, face.brow, 1, INK, 3.4);
  g.strokeStyle = O;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(12.5, -4);
  g.quadraticCurveTo(16.5, 1, 13, 3);
  g.stroke();
  // mouth sits under the moustache
  if (face.mouth !== 'smirk') cartoonMouth(g, 8.5, 12, { w: 8, style: face.mouth, open: face.open, ink: { line: O, w: 1.5 } });
  g.restore();
}

function drawCue(g: Ctx, sk: Skeleton, c: Cue) {
  const e = cueEnds(sk, c);
  g.lineCap = 'round';
  g.strokeStyle = O;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(e.bx, e.by);
  g.lineTo(e.tx, e.ty);
  g.stroke();
  const mx = e.bx + e.ca * 58;
  const my = e.by + e.sa * 58;
  g.strokeStyle = CF.cueButt;
  g.lineWidth = 6.5;
  g.beginPath();
  g.moveTo(e.bx, e.by);
  g.lineTo(mx, my);
  g.stroke();
  g.strokeStyle = CF.cueMaple;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(mx, my);
  g.lineTo(e.tx - e.ca * 9, e.ty - e.sa * 9);
  g.stroke();
  g.lineCap = 'butt';
  g.strokeStyle = CF.cream;
  g.lineWidth = 4.2;
  g.beginPath();
  g.moveTo(e.tx - e.ca * 9, e.ty - e.sa * 9);
  g.lineTo(e.tx - e.ca * 3, e.ty - e.sa * 3);
  g.stroke();
  g.strokeStyle = '#3F7FB8';
  g.lineWidth = 4.6;
  g.beginPath();
  g.moveTo(e.tx - e.ca * 3, e.ty - e.sa * 3);
  g.lineTo(e.tx, e.ty);
  g.stroke();
  g.lineCap = 'round';
}

/** Draw Slim at (x, y) = feet centre on the ground. */
export function drawSlim(g: Ctx, x: number, y: number, s: SlimState): void {
  const f = frameFor(s);
  const sk = SLIM_BONES;
  const facing = s.facing ?? 1;
  const sc = s.scale ?? 1;
  const t = Math.max(0, s.poseTime);
  const speed = Math.abs(s.speed ?? 0);
  g.save();
  g.translate(x, y);
  g.scale(sc * facing, sc);
  const pf = s.perfect ?? 0;
  if (pf > 0.01) {
    g.save();
    g.globalAlpha = pf;
    g.strokeStyle = CF.filmHi;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + 0.1;
      const r0 = 80 + hash(i) * 30;
      const r1 = r0 + 60 + hash(i + 5) * 70;
      g.lineWidth = 2 + (i % 3);
      g.beginPath();
      g.moveTo(Math.cos(a) * r0, -66 + Math.sin(a) * r0);
      g.lineTo(Math.cos(a) * r1, -66 + Math.sin(a) * r1);
      g.stroke();
    }
    g.restore();
  }
  if (s.pose === 'run' && speed > 60) {
    const ph = (s.runPhase ?? 0) * 2;
    for (let j = 0; j < 3; j++) {
      const age = fract(ph) + j;
      puff(g, -18 - age * 86, -4 - age * 3, 4 + age * 3.4, 0.55 * (1 - age / 3), CF.filmHi);
    }
    speedLines(g, -40, -74, 0, 4, 50 + speed * 0.04, 90, CF.filmHi, 0.5, Math.floor(s.time * 10));
  }
  f.root.sx = (f.root.sx ?? 1) * (s.squashX ?? 1);
  f.root.sy = (f.root.sy ?? 1) * (s.squashY ?? 1);
  solve(sk, f);
  const two = f.cue.second !== undefined;
  const cueBehind = f.cue.hand === 'B' && !two;
  if (!two) drawArm(g, sk, 'armB', 'foreB', false, 0);
  if (cueBehind) drawCue(g, sk, f.cue);
  drawLeg(g, sk, 'thighB', 'shinB', false);
  drawTorso(g, sk);
  drawLeg(g, sk, 'thighF', 'shinF', true);
  drawHead(g, sk, f.face, s.time);
  if (two) drawArm(g, sk, 'armB', 'foreB', false, 0);
  if (!cueBehind) drawCue(g, sk, f.cue);
  drawArm(g, sk, 'armF', 'foreF', true, f.flex);
  // chalking: chalk cube on the tip + blue dust
  if (f.chalk > 0.05) {
    const e = cueEnds(sk, f.cue);
    const [hx, hy] = sk.tip('foreF');
    g.fillStyle = '#3F7FB8';
    g.strokeStyle = O;
    g.lineWidth = 1.5;
    g.save();
    g.translate(hx + 4, hy - 6);
    g.rotate(s.time * 10);
    g.fillRect(-4, -4, 8, 8);
    g.strokeRect(-4, -4, 8, 8);
    g.restore();
    const bp = s.beatPhase ?? 0;
    for (let i = 0; i < 4; i++) {
      const u = fract(bp + i * 0.25);
      puff(g, e.tx + 6 + u * 20, e.ty - 8 - u * 24, 2 + u * 5, (1 - u) * 0.8 * f.chalk, CHALK);
    }
  }
  // smears
  if (f.smear && f.smear.alpha > 0.01) {
    const sm = f.smear;
    const e = cueEnds(sk, f.cue);
    if (sm.kind === 'swing') {
      // crescent: cream edge, tangerine core, swept by the cue tip around the grip
      const cx = e.hx;
      const cy = e.hy;
      const R = CUE_LEN - f.cue.grip;
      drawSmear(
        g,
        (u) => {
          const a = swingAngle(u);
          return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a) * R * 0.4, cy + Math.sin(a) * R * 0.4];
        },
        Math.max(0, strikeU(sm.t) - 0.9 - sm.t * 4),
        Math.max(1, strikeU(Math.min(sm.t, 0.2), 2, 0.1, 0.2, 0.42, 1.8)),
        { color: CF.tangerine, core: CF.cream, alpha: sm.alpha, taper: 0.92, coreWidth: 5 },
        18,
      );
    } else {
      // thrust: straight speed wedge along the cue + shock ring at the tip
      g.save();
      g.globalAlpha = sm.alpha;
      g.fillStyle = CF.tangerine;
      g.beginPath();
      g.moveTo(e.tx, e.ty - 3);
      g.lineTo(e.tx - e.ca * 150, e.ty - e.sa * 150 - 12);
      g.lineTo(e.tx - e.ca * 150, e.ty - e.sa * 150 + 12);
      g.lineTo(e.tx, e.ty + 3);
      g.closePath();
      g.fill();
      g.strokeStyle = CF.cream;
      g.lineWidth = 3;
      for (const o of [-9, 0, 9]) {
        g.beginPath();
        g.moveTo(e.tx - 20, e.ty + o);
        g.lineTo(e.tx - 130, e.ty + o * 1.4);
        g.stroke();
      }
      const k = sm.t / 0.25;
      g.lineWidth = 5 * (1 - k);
      g.beginPath();
      g.ellipse(e.tx + 12, e.ty, 14 + 50 * easeOut(k), 22 + 70 * easeOut(k), 0, 0, TAU);
      g.stroke();
      g.restore();
    }
    if (sm.t < 0.14) {
      const k = sm.t / 0.14;
      star4(g, e.tx, e.ty, 12 + 26 * easeOut(k), k * 2, `rgba(255,246,232,${1 - k})`);
      drawGlow(g, e.tx, e.ty, CF.tangerineHi, 70, (1 - k) * 0.7);
    }
  }
  if (f.sparks) {
    const [kx, ky] = sk.point('shinB');
    g.strokeStyle = CF.bulb;
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const u = fract(s.time * 5 + i / 8);
      g.globalAlpha = 1 - u;
      g.beginPath();
      g.moveTo(kx - u * 20, Math.min(-1, ky + 4) - u * 8);
      g.lineTo(kx - u * 60 - hash(i) * 20, Math.min(-1, ky + 4) - u * 30 - hash(i + 2) * 14);
      g.stroke();
    }
    g.globalAlpha = 1;
    drawGlow(g, kx, Math.min(-1, ky + 4), CF.bulb, 30, 0.6);
  }
  if (s.pose === 'land') {
    const k = clamp01(t / 0.35);
    for (const d of [-1, 1]) puff(g, d * (26 + 70 * easeOut(k)), -6 - 12 * k, 6 + 13 * easeOut(k), (1 - k) * 0.85, CF.filmHi);
  }
  if (s.pose === 'respawn' && t < 0.12) {
    g.fillStyle = `rgba(255,246,232,${0.75 * (1 - t / 0.12)})`;
    g.fillRect(-90, -175, 180, 180);
    g.fillStyle = `rgba(26,20,16,${0.8 * (1 - t / 0.12)})`;
    g.fillRect(-130, -95, 260, 3);
  }
  if (s.pose === 'stumble') {
    for (let i = 0; i < 3; i++) {
      const a = s.time * 7 + (i * TAU) / 3;
      star4(g, Math.cos(a) * 26, -140 + Math.sin(a) * 7, 7, a, CF.cream);
    }
  }
  if (pf > 0.01) drawGlow(g, 0, -66, CF.filmHi, 120, pf * 0.35);
  if (s.bones) sk.debugDraw(g);
  g.restore();
}
