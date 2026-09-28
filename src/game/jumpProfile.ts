/**
 * Simulates the REAL player controller on flat ground to get jump trajectories. Used by the
 * level builder (lumJump places collectibles along the actual arc) and the debug overlay
 * (airtime readouts), so tuning the controller never breaks authored arcs.
 */
import { Controls } from '../engine/input';
import { CollisionWorld } from './physics';
import { Player } from './player';
import { Tun } from './tunables';

export interface JumpProfile {
  /** seconds from press to landing */
  airtime: number;
  /** height above ground (px, positive up) sampled every sim step, index = step */
  heights: number[];
  dt: number;
  apex: number;
}

const cache = new Map<string, JumpProfile>();

export function jumpProfile(holdSec: number, runSpeed: number, pixelsPerBeat: number): JumpProfile {
  const key = `${holdSec.toFixed(4)}|${runSpeed}|${pixelsPerBeat}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const dt = 1 / Tun.sim.hz;
  const world = new CollisionWorld();
  world.add({ kind: 'solid', x: -1e6, y: 0, w: 2e6, h: 100 });
  const noop = () => undefined;
  const p = new Player({ jump: noop, land: noop, punch: noop, slide: noop, footstep: noop });
  p.setWorld(world);
  p.spawn(0, 0, runSpeed, pixelsPerBeat);
  const c = new Controls();
  c.right = true;
  p.release(c);
  // settle one step on the ground
  p.step(dt, c, world);
  const heights: number[] = [];
  let t = 0;
  c.apply('jump', true, 0);
  let apex = 0;
  for (let i = 0; i < 2000; i++) {
    if (t >= holdSec && c.jump) c.apply('jump', false, t);
    p.step(dt, c, world);
    c.clearEdges();
    t += dt;
    heights.push(-p.y);
    apex = Math.max(apex, -p.y);
    if (p.grounded && i > 2) break;
  }
  const prof: JumpProfile = { airtime: t, heights, dt, apex };
  cache.set(key, prof);
  return prof;
}

/** Height (px above takeoff ground) `sec` seconds after pressing jump. */
export function heightAt(prof: JumpProfile, sec: number): number {
  // heights[i] is the height after step i+1, i.e. at time (i+1)*dt
  const i = sec / prof.dt - 1;
  const i0 = Math.floor(i);
  if (i0 < 0) return Math.max(0, prof.heights[0] * (sec / prof.dt));
  if (i0 >= prof.heights.length - 1) return 0;
  const f = i - i0;
  return prof.heights[i0] * (1 - f) + prof.heights[i0 + 1] * f;
}
