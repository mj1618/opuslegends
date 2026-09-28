/**
 * MANNEQUIN — the theme-neutral test hero for the rig framework (a wooden artist's mannequin with
 * an expressive face and a stick prop). It exercises everything a real hero needs: a Skeleton,
 * procedural cycles (idle beat-bob, run), keyed clips, volume-preserving squash & stretch,
 * anticipation-free strikes with smear ribbons, secondary motion, expressions, and the standard
 * platformer pose set. Copy this file as the template for the real hero.
 *
 *   drawMannequin(ctx, x, y, state)   // origin = feet centre on the ground, ~110 px tall
 */
import type { Ctx } from '../core/canvas';
import { drawGlow, puff, star4 } from '../core/draw';
import { TAU, bump, clamp01, easeIn, easeOut, easeOutBack, fract, lerp, smooth } from '../core/math';
import { type Clip, sampleClip } from './clip';
import { beatBob, followThrough, landSquash, squash, strikeSmearAlpha, strikeSmearStart, strikeU, velocityStretch } from './motion';
import { type EyeStyle, type Ink, type MouthStyle, blink, brow, capsulePath, cartoonEye, cartoonMouth, gloss, inked, limb } from './parts';
import { type Pose, Skeleton, addPose, blendPose } from './skeleton';
import { drawSmear, speedLines } from './smear';

export type HeroPose =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'strike'
  | 'heave'
  | 'slide'
  | 'stumble'
  | 'dead'
  | 'respawn'
  | 'victory';

export const HERO_POSES: HeroPose[] = ['idle', 'run', 'jump', 'fall', 'land', 'strike', 'heave', 'slide', 'stumble', 'dead', 'respawn', 'victory'];

/** one-shot lengths (s); they hold their last frame after this */
export const HERO_POSE_LEN: Partial<Record<HeroPose, number>> = { land: 0.3, strike: 0.42, heave: 0.6, stumble: 0.45, dead: 0.7, respawn: 0.5 };

export interface HeroState {
  pose: HeroPose;
  poseTime: number;
  time: number;
  beatPhase?: number;
  /** leg cycles (advance by distance / stride) */
  runPhase?: number;
  speed?: number;
  vy?: number;
  facing?: 1 | -1;
  scale?: number;
  squashX?: number;
  squashY?: number;
  lookX?: number;
  lookY?: number;
  /** 0..1 perfect-hit rim flash */
  flash?: number;
  /** debug: draw bones */
  bones?: boolean;
}

export interface HeroSkin {
  wood: string;
  woodShade: string;
  joint: string;
  face: string;
  prop: string;
  propTip: string;
  smear: string;
  smearCore: string;
  ink: Ink;
}

export const MANNEQUIN_SKIN: HeroSkin = {
  wood: '#E2BE8E',
  woodShade: '#B98E62',
  joint: '#9C7250',
  face: '#F0D3AA',
  prop: '#6B4A2E',
  propTip: '#F4F2EC',
  smear: '#FFE0A8',
  smearCore: '#FFFBF0',
  ink: { line: '#1B1726', w: 3 },
};

/** stride (px of travel per leg cycle) */
export const HERO_STRIDE = 192;

const UP = -Math.PI / 2;

/** bones (canvas y down; every bone points along its local +x) */
export const MANNEQUIN_BONES = new Skeleton([
  { name: 'pelvis', x: 0, y: -36, rot: UP, len: 12 },
  { name: 'spine', parent: 'pelvis', x: 12, y: 0, len: 20 },
  { name: 'head', parent: 'spine', x: 24, y: 0, len: 44 },
  // arms hang from the top of the spine (+y in spine space = forward)
  { name: 'armB', parent: 'spine', x: 18, y: -3, rot: Math.PI, len: 17 },
  { name: 'foreB', parent: 'armB', x: 17, y: 0, len: 15 },
  { name: 'armF', parent: 'spine', x: 18, y: 3, rot: Math.PI, len: 17 },
  { name: 'foreF', parent: 'armF', x: 17, y: 0, len: 15 },
  { name: 'prop', parent: 'foreF', x: 17, y: 0, rot: 0, len: 96 },
  // legs
  { name: 'thighB', parent: 'pelvis', x: 0, y: -4, rot: Math.PI, len: 18 },
  { name: 'shinB', parent: 'thighB', x: 18, y: 0, len: 18 },
  { name: 'thighF', parent: 'pelvis', x: 0, y: 4, rot: Math.PI, len: 18 },
  { name: 'shinF', parent: 'thighF', x: 18, y: 0, len: 18 },
]);

/** scratch skeleton for re-sampling earlier strike frames (smears) */
const PROBE = new Skeleton(MANNEQUIN_BONES.defs);

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
  sx: number;
  sy: number;
  rot: number;
  dy: number;
  face: Face;
  /** prop world angle relative to the fore arm */
  smear?: { u0: number; u1: number; alpha: number; strikeT: number };
}

// strike arc: world angle of the front upper arm and the prop, keyed by u (0 wind, 1 contact, 2 overhead)
function strikeArc(u: number): { arm: number; fore: number; prop: number } {
  const K = [
    { arm: 2.2, fore: 0.3, prop: 0.5 },
    { arm: -0.35, fore: -0.1, prop: -0.15 },
    { arm: -1.9, fore: -0.3, prop: -0.4 },
  ];
  const i = Math.max(0, Math.min(1, Math.floor(u)));
  const t = smooth(Math.max(0, Math.min(1, u - i)));
  const A = K[i];
  const B = K[i + 1];
  return { arm: lerp(A.arm, B.arm, t), fore: lerp(A.fore, B.fore, t), prop: lerp(A.prop, B.prop, t) };
}

/** relative rotation for a bone given its desired world angle and its parent's world angle */
const rel = (world: number, parentWorld: number) => world - parentWorld;

// A keyed clip example (victory "pump" on the beat): keys in beats.
const VICTORY: Clip = {
  loop: true,
  length: 1,
  keys: [
    { t: 0, pose: { armF: { rot: -2.6 }, foreF: { rot: -0.3 }, spine: { rot: -0.08 } } },
    { t: 0.15, pose: { armF: { rot: -2.9 }, foreF: { rot: -0.1 }, spine: { rot: -0.14 } }, ease: 'snap' },
    { t: 1, pose: { armF: { rot: -2.6 }, foreF: { rot: -0.3 }, spine: { rot: -0.08 } }, ease: 'inout' },
  ],
};

function frameFor(s: HeroState): Frame {
  const t = Math.max(0, s.poseTime);
  const time = s.time;
  const bp = s.beatPhase ?? fract(time * (160 / 60));
  const bob = beatBob(bp);
  const vy = s.vy ?? 0;
  const f: Frame = {
    pose: {},
    sx: 1,
    sy: 1,
    rot: 0,
    dy: 0,
    face: { eyes: 'normal', lid: 0.15, brow: 0.1, mouth: 'smirk', open: 0, lx: 0.6, ly: 0.1 },
  };
  if (s.lookX !== undefined || s.lookY !== undefined) {
    const dx = (s.lookX ?? 200) * (s.facing ?? 1);
    const dy = (s.lookY ?? 0) + 90;
    const d = Math.hypot(dx, dy) || 1;
    f.face.lx = dx / d;
    f.face.ly = dy / d;
  }
  const P: Pose = f.pose;
  const blinkNow = blink(time, 1);
  switch (s.pose) {
    case 'idle': {
      const sway = Math.sin(time * 1.6);
      const q = squash(bob * 0.05);
      f.sx = q.sx;
      f.sy = q.sy;
      P.pelvis = { y: bob * 2 };
      P.spine = { rot: sway * 0.03 };
      P.head = { rot: -sway * 0.05 + bob * 0.04 };
      P.armB = { rot: 0.15 + sway * 0.05 };
      P.foreB = { rot: -0.3 };
      P.armF = { rot: -0.25 - bob * 0.2 };
      P.foreF = { rot: -0.6 - bob * 0.25 };
      P.prop = { rot: -0.9 };
      P.thighB = { rot: -0.12 };
      P.thighF = { rot: 0.12 };
      P.shinB = { rot: 0.1 + bob * 0.15 };
      P.shinF = { rot: -0.1 - bob * 0.15 };
      f.face.lid = blinkNow ? 1 : 0.18;
      break;
    }
    case 'run': {
      const ph = (s.runPhase ?? time * 5.3) * TAU;
      const b16 = Math.cos(ph * 2);
      f.dy = -3 + b16 * 3;
      P.pelvis = { rot: 0.18 };
      P.spine = { rot: 0.1 + b16 * 0.02 };
      P.head = { rot: -0.25 };
      const sw = Math.sin(ph);
      P.thighF = { rot: -sw * 0.95 };
      P.shinF = { rot: Math.max(0, Math.cos(ph)) * 1.4 + 0.2 };
      P.thighB = { rot: sw * 0.95 };
      P.shinB = { rot: Math.max(0, -Math.cos(ph)) * 1.4 + 0.2 };
      P.armB = { rot: -sw * 0.8 };
      P.foreB = { rot: -1.1 };
      P.armF = { rot: sw * 0.5 - 0.7 };
      P.foreF = { rot: -1.2 };
      P.prop = { rot: -0.2 };
      const q = squash(b16 * 0.03);
      f.sx = q.sx;
      f.sy = q.sy;
      f.face.mouth = 'grin';
      f.face.lid = blinkNow ? 1 : 0.25;
      f.face.brow = 0.25;
      break;
    }
    case 'jump':
    case 'fall': {
      const up = s.pose === 'jump';
      const st = up ? 1 - easeOut(t / 0.22) : 0;
      const v = velocityStretch(vy);
      f.sx = v.sx * (1 - 0.12 * st);
      f.sy = v.sy * (1 + 0.18 * st);
      P.pelvis = { rot: up ? 0.1 : -0.05 };
      P.thighF = { rot: up ? -1.3 : -0.6 + Math.sin(time * 14) * 0.2 };
      P.shinF = { rot: up ? 1.9 : 0.8 };
      P.thighB = { rot: up ? 0.2 : 0.5 + Math.sin(time * 14 + 1) * 0.2 };
      P.shinB = { rot: up ? 1.2 : 0.4 };
      P.armB = { rot: up ? -2.4 : -1.9 + Math.sin(time * 16) * 0.4 };
      P.foreB = { rot: up ? -0.4 : -0.6 };
      P.armF = { rot: up ? -2.0 : -2.3 + Math.sin(time * 16 + 2) * 0.4 };
      P.foreF = { rot: -0.5 };
      P.prop = { rot: -0.3 };
      P.head = { rot: up ? -0.15 : 0.12 };
      f.face = { ...f.face, eyes: up ? 'normal' : 'wide', mouth: up ? 'grin' : 'o', open: 0.7, brow: up ? 0.2 : -0.4, lid: 0 };
      break;
    }
    case 'land': {
      const q = landSquash(t, 0.4);
      f.sx = q.sx;
      f.sy = q.sy;
      const k = 1 - easeOut(t / 0.22);
      P.pelvis = { y: 6 * k };
      P.thighF = { rot: -0.7 * k };
      P.shinF = { rot: 1.2 * k };
      P.thighB = { rot: 0.5 * k };
      P.shinB = { rot: 0.9 * k };
      P.armB = { rot: -1.2 * k };
      P.armF = { rot: -1.0 * k - 0.2 };
      P.foreF = { rot: -0.6 };
      P.prop = { rot: -0.8 };
      f.face = { ...f.face, lid: 0.5 * k, mouth: 'grin' };
      break;
    }
    case 'strike':
    case 'heave': {
      const heave = s.pose === 'heave';
      const tt = heave ? t - 0.08 : t;
      // strike progress u (0 wind-up, 1 contact, 2 overhead); after the follow-through we blend to rest
      const u = heave ? (t < 0.08 ? 0.3 * smooth(t / 0.08) : Math.min(2, 1 + easeOutBack(clamp01(tt / 0.12), 2))) : Math.max(1, strikeU(Math.min(t, 0.2)));
      const back = heave ? smooth((t - 0.4) / 0.2) : smooth((t - 0.2) / 0.22);
      const arc = strikeArc(u);
      const lean = heave ? bump(t, 0.55) : bump(t, 0.3);
      const spineWorld = UP + 0.12 - 0.22 * lean;
      const rest = frameFor({ ...s, pose: 'idle', poseTime: 0 }).pose;
      const act: Pose = {
        pelvis: { rot: 0.12 - 0.1 * lean, y: heave && t < 0.08 ? 6 * smooth(t / 0.08) : -4 * lean },
        spine: { rot: -0.22 * lean },
        armF: { rot: rel(arc.arm, spineWorld) - Math.PI },
        foreF: { rot: arc.fore },
        prop: { rot: arc.prop + followThrough(t - 0.2, 0.15) },
        armB: { rot: heave ? rel(arc.arm + 0.2, spineWorld) - Math.PI : -0.9 * lean },
        foreB: { rot: -0.5 },
        thighF: { rot: -0.6 * lean },
        shinF: { rot: 0.5 * lean },
        thighB: { rot: 0.5 * lean },
        shinB: { rot: 0.3 * lean },
        head: { rot: -0.2 * lean },
      };
      Object.assign(P, back > 0 ? blendPose(act, rest, back) : act);
      const q = squash(heave && t < 0.08 ? 0.15 * smooth(t / 0.08) : -0.07 * lean);
      f.sx = q.sx;
      f.sy = q.sy;
      f.face = { ...f.face, eyes: 'angry', brow: 0.6, mouth: t < 0.35 ? 'shout' : 'smirk', open: 1 - smooth((t - 0.2) / 0.15), lx: 0.9, ly: -0.3 };
      const st = heave ? tt : t;
      if ((!heave || (t > 0.08 && t < 0.3)) && st < 0.2)
        f.smear = { u0: strikeSmearStart(st, u), u1: u, alpha: strikeSmearAlpha(st, heave ? 0.2 : 0.15), strikeT: st };
      break;
    }
    case 'slide': {
      f.dy = 10;
      f.rot = 0;
      P.pelvis = { rot: 1.25, y: 12 };
      P.spine = { rot: -0.2 };
      P.head = { rot: -0.9 };
      P.thighF = { rot: -1.3 };
      P.shinF = { rot: 0.1 };
      P.thighB = { rot: -1.0 };
      P.shinB = { rot: 0.6 };
      P.armB = { rot: -0.6 };
      P.armF = { rot: -2.2 };
      P.foreF = { rot: -0.2 };
      P.prop = { rot: 0.2 };
      f.face = { ...f.face, mouth: 'grin', eyes: 'squint', brow: 0.3 };
      break;
    }
    case 'stumble': {
      f.rot = -TAU * easeOut(clamp01(t / 0.45));
      f.dy = -18 * bump(t, 0.45);
      P.armB = { rot: -2 + Math.sin(t * 40) * 0.5 };
      P.armF = { rot: -1.5 + Math.sin(t * 40 + 1) * 0.5 };
      P.thighF = { rot: -0.8 };
      P.thighB = { rot: 0.6 };
      P.shinF = { rot: 1 };
      f.face = { ...f.face, eyes: 'spiral', mouth: 'wavy', brow: -0.5 };
      break;
    }
    case 'dead': {
      const k = easeIn(clamp01(t / 0.25));
      f.rot = -1.45 * k;
      f.dy = 0;
      P.armB = { rot: -2.8 * k };
      P.armF = { rot: -2.5 * k };
      P.thighF = { rot: -0.3 * k };
      P.shinF = { rot: 0.5 * k };
      P.head = { rot: 0.3 * k };
      P.prop = { rot: 1.2 * k };
      f.face = { ...f.face, eyes: t < 0.15 ? 'wide' : 'x', mouth: 'o', open: 0.6, brow: -0.6 };
      break;
    }
    case 'respawn': {
      const up = easeOutBack(clamp01(t / 0.16), 2.2);
      const land = t > 0.16 ? 1 - easeOut((t - 0.16) / 0.2) : 0;
      f.dy = (1 - up) * 90;
      const q = squash(t < 0.16 ? -0.2 * (1 - t / 0.16) : 0.25 * land);
      f.sx = q.sx;
      f.sy = q.sy;
      P.armB = { rot: -2.6 * (1 - land) };
      P.armF = { rot: -2.4 * (1 - land) };
      f.face = { ...f.face, eyes: 'wide', mouth: 'grin', brow: -0.2 };
      break;
    }
    case 'victory': {
      const clipPose = sampleClip(VICTORY, bp);
      Object.assign(P, addPose({ thighF: { rot: -0.35 }, thighB: { rot: 0.35 }, shinF: { rot: 0.2 }, armB: { rot: 0.5 }, foreB: { rot: -1.9 }, prop: { rot: 0.6 } }, clipPose));
      const q = squash(bob * 0.06);
      f.sx = q.sx;
      f.sy = q.sy;
      f.face = { ...f.face, eyes: 'happy', mouth: 'teeth', brow: -0.2 };
      break;
    }
  }
  return f;
}

// ------------------------------------------------------------------------------ painting

function drawLeg(g: Ctx, sk: Skeleton, thigh: string, shin: string, k: HeroSkin, near: boolean) {
  const [hx, hy] = sk.point(thigh);
  const [kx, ky] = sk.point(shin);
  const [ax, ay] = sk.tip(shin);
  const col = near ? k.wood : k.woodShade;
  limb(g, [hx, hy, kx, ky, ax, ay], 10, col, k.ink);
  // ball joint + shoe block
  g.beginPath();
  g.arc(kx, ky, 5, 0, TAU);
  inked(g, k.joint, { ...k.ink, w: 2 });
  const a = sk.angle(shin) - Math.PI / 2;
  g.save();
  g.translate(ax, ay);
  g.rotate(a);
  capsulePath(g, -3, 0, 6, 11, 1, 5);
  inked(g, near ? k.joint : k.woodShade, k.ink);
  g.restore();
}

function drawArm(g: Ctx, sk: Skeleton, arm: string, fore: string, k: HeroSkin, near: boolean) {
  const [sx, sy] = sk.point(arm);
  const [ex, ey] = sk.point(fore);
  const [hx, hy] = sk.tip(fore);
  limb(g, [sx, sy, ex, ey, hx, hy], 8, near ? k.wood : k.woodShade, k.ink);
  g.beginPath();
  g.arc(ex, ey, 4, 0, TAU);
  inked(g, k.joint, { ...k.ink, w: 2 });
  // mitten hand
  g.beginPath();
  g.arc(hx, hy, 6.5, 0, TAU);
  inked(g, near ? k.wood : k.woodShade, k.ink);
}

function drawProp(g: Ctx, sk: Skeleton, k: HeroSkin) {
  const [x0, y0] = sk.point('prop', -18, 0);
  const [x1, y1] = sk.tip('prop');
  limb(g, [x0, y0, x1, y1], 5, k.prop, k.ink);
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.strokeStyle = k.propTip;
  g.lineWidth = 5;
  g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(x1 - Math.cos(a) * 9, y1 - Math.sin(a) * 9);
  g.lineTo(x1, y1);
  g.stroke();
  g.lineCap = 'round';
}

function drawTorso(g: Ctx, sk: Skeleton, k: HeroSkin) {
  // pelvis block + chest bean in spine space
  sk.apply(g, 'pelvis');
  capsulePath(g, -4, 0, 11, 10, 0, 10);
  inked(g, k.woodShade, k.ink);
  g.restore();
  sk.apply(g, 'spine');
  g.beginPath();
  g.ellipse(9, 0, 17, 15, 0, 0, TAU);
  inked(g, k.wood, k.ink);
  gloss(g, 14, -6, 8, 3.5, 0.3, 0.3);
  // wood grain
  g.strokeStyle = 'rgba(120,80,40,0.25)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-2, -8);
  g.quadraticCurveTo(10, -12, 22, -6);
  g.moveTo(0, 6);
  g.quadraticCurveTo(12, 10, 22, 5);
  g.stroke();
  g.restore();
}

function drawHead(g: Ctx, sk: Skeleton, k: HeroSkin, face: Face, time: number) {
  const [nx, ny] = sk.point('head', -2, 0);
  const [cx, cy] = sk.point('head', 20, 0);
  limb(g, [nx, ny, cx, cy], 7, k.woodShade, k.ink);
  sk.apply(g, 'head');
  // head is drawn upright in its own frame: rotate so local +x (up the neck) becomes screen up
  g.translate(20, 0);
  g.rotate(Math.PI / 2);
  g.beginPath();
  g.ellipse(0, 0, 22, 21, 0, 0, TAU);
  inked(g, k.face, k.ink);
  gloss(g, -8, -10, 8, 4, -0.5, 0.35);
  // face faces +x (forward)
  const ex1 = 4;
  const ex2 = 15;
  const ey = -3;
  const eyes = face.eyes;
  cartoonEye(g, ex1, ey, { r: 5.5, lookX: face.lx, lookY: face.ly, style: eyes, lid: face.lid, lidTilt: face.brow * 0.3, lidColor: k.face, ink: k.ink, time });
  cartoonEye(g, ex2, ey - 1, { r: 5.5, lookX: face.lx, lookY: face.ly, style: eyes, lid: face.lid, lidTilt: -face.brow * 0.3, lidColor: k.face, ink: k.ink, time });
  brow(g, ex1, ey - 9, 9, face.brow, 1, k.ink, 2.6);
  brow(g, ex2, ey - 10, 9, face.brow, -1, k.ink, 2.6);
  cartoonMouth(g, 10, 10, { w: 14, style: face.mouth, open: face.open, ink: k.ink });
  g.restore();
}

/** Draw the mannequin (feet centre at x, y). */
export function drawMannequin(g: Ctx, x: number, y: number, s: HeroState, k: HeroSkin = MANNEQUIN_SKIN): void {
  const f = frameFor(s);
  const sk = MANNEQUIN_BONES;
  const facing = s.facing ?? 1;
  const sc = s.scale ?? 1;
  const t = Math.max(0, s.poseTime);
  g.save();
  g.translate(x, y);
  g.scale(sc * facing, sc);
  if (s.pose === 'run' && Math.abs(s.speed ?? 0) > 60) {
    const ph = (s.runPhase ?? 0) * 2;
    for (let j = 0; j < 3; j++) {
      const age = fract(ph) + j;
      puff(g, -14 - age * 80, -4 - age * 3, 3 + age * 3, 0.5 * (1 - age / 3), '#EDE6D6');
    }
    speedLines(g, -20, -60, 0, 4, 40 + Math.abs(s.speed ?? 0) * 0.04, 70, 'rgba(255,255,255,0.8)', 0.5, Math.floor(s.time * 10));
  }
  const rootSx = f.sx * (s.squashX ?? 1);
  const rootSy = f.sy * (s.squashY ?? 1);
  const dyClip = s.pose === 'respawn' ? f.dy : 0;
  if (s.pose === 'respawn') {
    g.save();
    g.beginPath();
    g.rect(-200, -400, 400, 400);
    g.clip();
  }
  sk.solve(f.pose, { y: s.pose === 'respawn' ? dyClip : f.dy, sx: rootSx, sy: rootSy, rot: f.rot, px: 0, py: f.rot ? -50 : 0 });
  drawArm(g, sk, 'armB', 'foreB', k, false);
  drawLeg(g, sk, 'thighB', 'shinB', k, false);
  drawTorso(g, sk, k);
  drawLeg(g, sk, 'thighF', 'shinF', k, true);
  drawHead(g, sk, k, f.face, s.time);
  drawProp(g, sk, k);
  drawArm(g, sk, 'armF', 'foreF', k, true);
  if (s.pose === 'respawn') g.restore();
  // smear ribbon: re-solve the skeleton at earlier strike progress values
  if (f.smear && f.smear.alpha > 0.01) {
    const probe = PROBE;
    const sm = f.smear;
    drawSmear(
      g,
      (u) => {
        const st = { ...s, poseTime: Math.max(0, sm.strikeT) };
        const fr = frameFor(st);
        const arc = strikeArc(u);
        const spineWorld = UP + 0.12;
        const pose = { ...fr.pose, armF: { rot: rel(arc.arm, spineWorld) - Math.PI }, foreF: { rot: arc.fore }, prop: { rot: arc.prop } };
        probe.solve(pose, { y: fr.dy, sx: rootSx, sy: rootSy });
        const [tx, ty] = probe.tip('prop');
        const [hx, hy] = probe.point('prop', 58, 0);
        return [tx, ty, hx, hy];
      },
      sm.u0,
      sm.u1,
      { color: k.smear, core: k.smearCore, lines: k.smear, alpha: sm.alpha * 0.8, taper: 0.9, coreWidth: 4 },
    );
    if (sm.strikeT < 0.2) {
      const [tx, ty] = sk.tip('prop');
      const kk = sm.strikeT / 0.2;
      drawGlow(g, tx, ty, '#FFF3C4', 50, (1 - kk) * 0.8);
      star4(g, tx, ty, 10 + 24 * easeOut(kk), kk, `rgba(255,255,255,${1 - kk})`);
    }
  }
  if (s.flash && s.flash > 0.01) drawGlow(g, 0, -60, '#FFE08A', 90, s.flash * 0.6);
  if (s.pose === 'land') {
    const kk = clamp01(t / 0.35);
    for (const d of [-1, 1]) puff(g, d * (20 + 60 * easeOut(kk)), -6 - 10 * kk, 5 + 10 * easeOut(kk), (1 - kk) * 0.85, '#EDE6D6');
  }
  if (s.bones) sk.debugDraw(g);
  g.restore();
}
