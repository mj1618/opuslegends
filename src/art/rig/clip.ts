/**
 * Clips: key poses over time (seconds or beats) with per-key easing. Put key poses ON beats:
 * sample with `beatTime` and the pose lands exactly on the music.
 */
import { clamp01, easeIn, easeInOut, easeOut, easeOutBack, smooth } from '../core/math';
import { type Pose, blendPose } from './skeleton';

export type Ease = 'linear' | 'smooth' | 'in' | 'out' | 'inout' | 'back' | 'hold' | 'snap';

export interface Key {
  t: number;
  pose: Pose;
  /** easing INTO this key from the previous one */
  ease?: Ease;
}

export interface Clip {
  keys: Key[];
  loop?: boolean;
  /** clip length (defaults to the last key's t) */
  length?: number;
}

export function ease(e: Ease | undefined, t: number): number {
  switch (e) {
    case 'linear':
      return clamp01(t);
    case 'in':
      return easeIn(t);
    case 'out':
      return easeOut(t);
    case 'inout':
      return easeInOut(t);
    case 'back':
      return easeOutBack(t, 2.2);
    case 'hold':
      return t >= 1 ? 1 : 0;
    case 'snap':
      // anticipation-free: reaches 90% in the first 15% of the segment
      return 1 - Math.pow(1 - clamp01(t), 7);
    default:
      return smooth(t);
  }
}

export function clipLength(c: Clip): number {
  return c.length ?? c.keys[c.keys.length - 1].t;
}

export function sampleClip(c: Clip, t: number): Pose {
  const len = clipLength(c);
  let tt = t;
  if (c.loop && len > 0) tt = ((t % len) + len) % len;
  const k = c.keys;
  if (tt <= k[0].t) return k[0].pose;
  for (let i = 1; i < k.length; i++) {
    if (tt <= k[i].t) {
      const u = (tt - k[i - 1].t) / Math.max(1e-6, k[i].t - k[i - 1].t);
      return blendPose(k[i - 1].pose, k[i].pose, ease(k[i].ease, u));
    }
  }
  if (c.loop) return blendPose(k[k.length - 1].pose, k[0].pose, ease(k[0].ease, (tt - k[k.length - 1].t) / Math.max(1e-6, len - k[k.length - 1].t)));
  return k[k.length - 1].pose;
}
