/**
 * Level builder: LevelDef (musical time) -> RuntimeLevel (world pixels, collision, entities).
 * Pure function of (level, tempo, tunables) so it can be rebuilt at any time (e.g. hot reload).
 */
import type { TempoMap } from '../audio/tempoMap';
import type { ActionMarker, Checkpoint, Enemy, FxCue, Hazard, Label, Lum } from '../game/entities';
import { heightAt, jumpProfile } from '../game/jumpProfile';
import { CollisionWorld, type Solid } from '../game/physics';
import { Tun } from '../game/tunables';
import type { LevelDef } from './types';

export interface FloorSpan {
  x0: number;
  x1: number;
  /** top y (world, negative = above base ground) */
  y: number;
}

export interface RuntimeLevel {
  def: LevelDef;
  ppb: number;
  runSpeed: number;
  world: CollisionWorld;
  floors: FloorSpan[];
  platforms: Solid[];
  blocks: Solid[];
  enemies: Enemy[];
  lums: Lum[];
  hazards: Hazard[];
  checkpoints: Checkpoint[];
  finishX: number;
  finishBeat: number;
  fx: FxCue[];
  actions: ActionMarker[];
  labels: Label[];
  /** x extent of authored content */
  minX: number;
  maxX: number;
  /** floor top y at world x (NaN over gaps) */
  floorYAt(x: number): number;
}

const FLOOR_DEPTH = 1400;
const DEFAULT_LUM_H = 62;

export function buildLevel(def: LevelDef, tempo: TempoMap): RuntimeLevel {
  const ppb = def.pixelsPerBeat;
  const bpm = tempo.bpmAtBeat(def.startBeat);
  const runSpeed = (ppb * bpm) / 60;
  const X = (beat: number) => beat * ppb;
  const spb = 60 / bpm;

  // ---------------------------------------------------------------- floor
  const floorFrom = def.startBeat - 16;
  const floorTo = def.endBeat + 32;
  const bounds = new Set<number>([floorFrom, floorTo]);
  for (const it of def.items) {
    if (it.type === 'floor' || it.type === 'gap') {
      bounds.add(it.from);
      bounds.add(it.to);
    }
  }
  const edges = [...bounds].filter((b) => b >= floorFrom && b <= floorTo).sort((a, b) => a - b);
  const floors: FloorSpan[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    const mid = (a + b) / 2;
    let h = 0;
    let hole = false;
    for (const it of def.items) {
      if (it.type === 'floor' && mid > it.from && mid < it.to) h = it.h;
      if (it.type === 'gap' && mid > it.from && mid < it.to) hole = true;
    }
    if (hole) continue;
    const last = floors[floors.length - 1];
    if (last && last.x1 === X(a) && last.y === -h) last.x1 = X(b);
    else floors.push({ x0: X(a), x1: X(b), y: -h });
  }
  const floorYAt = (x: number): number => {
    for (const f of floors) if (x >= f.x0 && x < f.x1) return f.y;
    return NaN;
  };
  const floorYNear = (x: number): number => {
    const y = floorYAt(x);
    if (!Number.isNaN(y)) return y;
    // over a gap: use the nearest floor to the left
    let best = 0;
    for (const f of floors) if (f.x1 <= x) best = f.y;
    return best;
  };

  const world = new CollisionWorld();
  for (const f of floors) world.add({ kind: 'solid', x: f.x0, y: f.y, w: f.x1 - f.x0, h: FLOOR_DEPTH });

  // ---------------------------------------------------------------- items
  const platforms: Solid[] = [];
  const blocks: Solid[] = [];
  const enemies: Enemy[] = [];
  const lums: Lum[] = [];
  const hazards: Hazard[] = [];
  const checkpoints: Checkpoint[] = [];
  const fx: FxCue[] = [];
  const actions: ActionMarker[] = [];
  const labels: Label[] = [];
  let finishBeat = def.endBeat;
  let id = 1;

  const addLum = (beat: number, y: number, note?: number) => {
    lums.push({ id: id++, beat, x: X(beat), y, note, collected: false, collectT: 0, skipped: false });
  };

  // pass 1: geometry (so entity placement below can query surfaces regardless of item order)
  for (const it of def.items) {
    switch (it.type) {
      case 'platform': {
        const th = it.thickness ?? 30;
        const s: Solid = { kind: it.oneWay === false ? 'solid' : 'oneway', x: X(it.from), y: -it.h, w: X(it.to) - X(it.from), h: th };
        platforms.push(s);
        world.add(s);
        break;
      }
      case 'block': {
        const bottom = it.bottom ?? 0;
        const s: Solid = { kind: 'solid', x: X(it.from), y: -it.h, w: X(it.to) - X(it.from), h: it.h - bottom };
        blocks.push(s);
        world.add(s);
        break;
      }
      default:
        break;
    }
  }

  /** topmost walkable surface at x (floor, platform or block); over a pit: nearest floor to the left */
  const surfaceYNear = (x: number): number => {
    const y = world.groundBelow(x, -1e5, 2e5);
    return Number.isNaN(y) ? floorYNear(x) : y;
  };

  // pass 2: entities, actions, cues
  for (const it of def.items) {
    if ('action' in it && it.action) actions.push({ ...it.action, x: X(it.action.beat), source: it.type });
    switch (it.type) {
      case 'enemy': {
        const kind = it.kind ?? 'grunt';
        const w = kind === 'grunt' ? 76 : 70;
        const h = kind === 'grunt' ? 92 : 64;
        // Position so that a punch pressed on `beat` connects early in its active window:
        // left edge sits ~55% of the punch reach ahead of the player's front at the press.
        const left = X(it.beat) + Tun.player.width / 2 + Tun.punch.reach * 0.55;
        const cx = left + w / 2;
        const floorY = surfaceYNear(cx);
        const y = kind === 'flyer' ? floorY - (it.h ?? 190) + h / 2 : floorY;
        enemies.push({
          id: id++,
          kind,
          beat: it.beat,
          homeX: cx,
          homeY: y,
          x: cx,
          y,
          w,
          h,
          alive: true,
          vx: 0,
          vy: 0,
          rot: 0,
          vrot: 0,
          deadTime: 0,
          hitFlash: 0,
          react: it.react ?? { every: 1, kind: 'squash', amount: 0.14, decay: 0.3 },
        });
        break;
      }
      case 'spikes': {
        const x0 = X(it.from);
        const x1 = X(it.to);
        const fy = floorYNear((x0 + x1) / 2);
        const vis = { x: x0, y: fy - 44, w: x1 - x0, h: 44 };
        hazards.push({ id: id++, kind: 'spikes', vis, rect: { x: x0 + 10, y: fy - 30, w: x1 - x0 - 20, h: 30 } });
        break;
      }
      case 'beam': {
        const x0 = X(it.from);
        const x1 = X(it.to);
        const fy = floorYNear((x0 + x1) / 2);
        const clearance = it.h ?? 66;
        const top = fy - 1200;
        const bottom = fy - clearance;
        const vis = { x: x0, y: top, w: x1 - x0, h: bottom - top };
        hazards.push({ id: id++, kind: 'beam', vis, rect: { x: x0 + 8, y: top, w: x1 - x0 - 16, h: bottom - top - 4 } });
        break;
      }
      case 'lum': {
        addLum(it.beat, surfaceYNear(X(it.beat)) - (it.h ?? DEFAULT_LUM_H), it.note);
        break;
      }
      case 'lumRow': {
        const every = it.every ?? 0.5;
        for (let b = it.from; b <= it.to + 1e-6; b += every) addLum(b, surfaceYNear(X(b)) - (it.h ?? DEFAULT_LUM_H));
        break;
      }
      case 'lumJump': {
        const every = it.every ?? 0.25;
        const holdSec = (it.hold ?? 1) * spb;
        const prof = jumpProfile(holdSec, runSpeed, ppb);
        const takeoffY = surfaceYNear(X(it.beat));
        const airBeats = prof.airtime / spb;
        for (let db = it.skipFirst ? every : 0; db < airBeats - every * 0.5; db += every) {
          const hgt = heightAt(prof, db * spb);
          addLum(it.beat + db, takeoffY - hgt - Tun.player.height * 0.55);
        }
        break;
      }
      case 'checkpoint': {
        const x = X(it.beat);
        checkpoints.push({ beat: it.beat, x, y: surfaceYNear(x), reached: false, flash: 0 });
        break;
      }
      case 'finish':
        finishBeat = it.beat;
        break;
      case 'fx':
        fx.push({ beat: it.beat, fx: it.fx, amount: it.amount ?? 1 });
        break;
      case 'label':
        labels.push({ beat: it.beat, x: X(it.beat), text: it.text });
        break;
      default:
        break;
    }
  }
  actions.sort((a, b) => a.beat - b.beat);
  lums.sort((a, b) => a.beat - b.beat);
  enemies.sort((a, b) => a.beat - b.beat);
  checkpoints.sort((a, b) => a.beat - b.beat);

  return {
    def,
    ppb,
    runSpeed,
    world,
    floors,
    platforms,
    blocks,
    enemies,
    lums,
    hazards,
    checkpoints,
    finishX: X(finishBeat),
    finishBeat,
    fx,
    actions,
    labels,
    minX: X(floorFrom),
    maxX: X(floorTo),
    floorYAt,
  };
}

