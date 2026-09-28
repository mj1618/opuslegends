/**
 * Choir crabs — the streak meter (DESIGN §4). Small fiddler crabs in four non-sacred shell
 * colours. Every frame is a cached sprite (variant x action x frame), so 24+ cost ~24 drawImage.
 *
 *   drawChoirCrab(ctx, x, y, { variant, action, phase, facing, lantern })
 *   action 'idle' phase=beatPhase · 'run' phase=runPhase · 'wave' phase=0..1 claw raise
 *   'hey' phase=beatPhase (claw up, shouting) · 'pull' phase=0..1 (the Heave's rope pull)
 * Origin = feet centre; ~40 px tall at scale 1.
 */
import { type Ctx, type Sprite, drawSprite, sprite } from '../core/canvas';
import { fract, lerp } from '../core/math';
import { type CrabRig, type CrabSkin, CRABBE_SKIN, crabClawArc, crabbeRig, drawCrab } from '../crabbe';
import { drawFloatBall } from './float';

export type ChoirAction = 'idle' | 'run' | 'wave' | 'hey' | 'pull';

export interface ChoirState {
  variant: number;
  action: ChoirAction;
  phase: number;
  facing?: 1 | -1;
  scale?: number;
  /** 0..1: carries a snipped glass float overhead like a lantern (glow amount) */
  lantern?: number;
  time?: number;
}

const S = 0.46;

const SKINS: CrabSkin[] = [
  mk('#D9B98A', '#EFD6AA', '#A8875A', '#F3E9D2'),
  mk('#3F8F8A', '#63B7AE', '#27615D', '#F2E7D0'),
  mk('#9A5A48', '#BD7C63', '#6B3A2E', '#F0DCC4'),
  mk('#6D6A9C', '#918EC2', '#4A4872', '#F1E6D6'),
];

function mk(body: string, top: string, deep: string, claw: string): CrabSkin {
  return {
    ...CRABBE_SKIN,
    body,
    bodyTop: top,
    bodyDeep: deep,
    leg: body,
    legFar: deep,
    claw,
    clawHi: '#FFFFFF',
    clawUnder: '#C9B79A',
    arm: claw,
    teeth: '#FFFFFF',
    kerchief: false,
    clawScale: 0.72,
    ow: 3.6,
  };
}

const FRAMES: Record<ChoirAction, number> = { idle: 6, run: 6, wave: 6, hey: 4, pull: 6 };

function rigFor(action: ChoirAction, f: number): CrabRig {
  let r: CrabRig;
  switch (action) {
    case 'run':
      r = crabbeRig({ pose: 'run', poseTime: 0, time: 0.5, runPhase: f, speed: 0 }).rig;
      break;
    case 'wave': {
      r = crabbeRig({ pose: 'idle', poseTime: 0, time: 0.5, beatPhase: 0.6 }).rig;
      const a = crabClawArc(lerp(0.2, 1.95, f));
      r.wx = a.wx;
      r.wy = a.wy;
      r.pa = a.pa;
      r.gape = 0.3 + f * 0.3;
      r.mouth = f > 0.5 ? 'grin' : 'smirk';
      r.eyes = f > 0.6 ? 'wide' : 'normal';
      break;
    }
    case 'hey': {
      r = crabbeRig({ pose: 'idle', poseTime: 0, time: 0.5, beatPhase: f }).rig;
      const a = crabClawArc(1.85 + Math.exp(-f * 5) * 0.15);
      r.wx = a.wx;
      r.wy = a.wy - Math.exp(-f * 5) * 6;
      r.pa = a.pa;
      r.gape = 0.5;
      r.mouth = 'shout';
      r.mouthOpen = 1 - f * 0.6;
      r.eyes = 'squint';
      break;
    }
    case 'pull': {
      r = crabbeRig({ pose: 'idle', poseTime: 0, time: 0.5, beatPhase: 0.5 }).rig;
      const a = crabClawArc(lerp(1.9, 0.5, f));
      r.wx = a.wx;
      r.wy = a.wy;
      r.pa = a.pa;
      r.gape = 0.05;
      r.brot = -0.12 * f;
      r.crouch = f;
      r.mouth = 'shout';
      r.mouthOpen = 0.6;
      r.eyes = 'squint';
      break;
    }
    default:
      r = crabbeRig({ pose: 'idle', poseTime: 0, time: 0.5, beatPhase: f }).rig;
      r.mx = -34;
      r.my = 12;
      r.ma = 2.6;
  }
  r.lid = Math.max(0, r.lid - 0.1);
  return r;
}

function frameSprite(variant: number, action: ChoirAction, i: number): Sprite {
  const v = ((variant % SKINS.length) + SKINS.length) % SKINS.length;
  return sprite(`choir:${v}:${action}:${i}`, 104, 84, 46, 72, (g) => {
    g.scale(S, S);
    const n = FRAMES[action];
    const f = action === 'wave' || action === 'pull' ? i / (n - 1) : i / n;
    drawCrab(g, rigFor(action, f), SKINS[v]);
  });
}

/** Pre-build every choir frame (call once at load to avoid first-use hitches). */
export function warmChoir(): void {
  for (let v = 0; v < SKINS.length; v++)
    for (const a of Object.keys(FRAMES) as ChoirAction[]) for (let i = 0; i < FRAMES[a]; i++) frameSprite(v, a, i);
}

export function drawChoirCrab(g: Ctx, x: number, y: number, s: ChoirState): void {
  const n = FRAMES[s.action];
  const p = s.action === 'wave' || s.action === 'pull' ? Math.max(0, Math.min(1, s.phase)) : fract(s.phase);
  const i = s.action === 'wave' || s.action === 'pull' ? Math.round(p * (n - 1)) : Math.floor(p * n) % n;
  const sc = s.scale ?? 1;
  const f = s.facing ?? 1;
  drawSprite(g, frameSprite(s.variant, s.action, i), x, y, 0, sc * f, sc);
  if (s.lantern && s.lantern > 0) {
    const bob = Math.sin((s.time ?? 0) * 6 + s.variant) * 2;
    drawFloatBall(g, x - 2 * f * sc, y - 62 * sc + bob, false, s.lantern, 0);
  }
}
