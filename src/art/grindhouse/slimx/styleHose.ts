import type { Ctx } from '../../core/canvas';
import type { Rig } from './rig';
import { paintInk } from './styleInk';
export function paintHose(g: Ctx, r: Rig): void {
  paintInk(g, r);
}
