/**
 * BIG JIM — act 3's boss (docs/level/act3_plan.md "New mechanics" 2). Not a health bar and not a new verb: ONE
 * animated body whose parts are ordinary level items the player already knows —
 *   fists = the `slam` lifts in the gauntlet (308-310) · velvet sleeve = the `lowSign` knee-slide (313.62) ·
 *   gold-chain medallions = `pendulum`s · lapels = ledges and gaps UP · the walkdown's four blows (296-299: fist, fist,
 *   lapel, jaw) and his aviators (317 left, 325 right) = GIANT breakables · the gold chain (328) = a big breakable.
 * This module turns the level's `bigJim` pose keys + what the hero did to those parts into a descriptive state the
 * renderer draws (fields match art/grindhouse/bigjim.ts `BigJimState`). Pure function of the world beat and the
 * breakables' `broken` flags, so checkpoint rewinds replay him exactly.
 *
 *   pose / prev / k   the current pose key, the one it blends from, blend 0..1 (level `bigJim` items, `beats` long)
 *   x, y, scale       world anchor: the middle of his seat (a fixed beat × ppb, or tracking the music line `ahead`
 *                     beats in front during the gauntlet), `scale` 1 ≈ 1150 px tall
 *   visible           0..1 (hidden before the rise, fades in behind the letters)
 *   rise              0..1 during 'rise' (he climbs up behind the sign from below the roof line)
 *   bluff             0..1 the BLUFF DISPLAY (arms flung wide, sleeves flaring) — the reveal on the held B
 *   roar              0..1 mouth open (the reveal's roar, every blow he takes)
 *   blaze             0..1 lens flash on every beat of the reveal
 *   reel, reelDir     0..1 recoil after a blow / a lens crack (head snaps back), which way it tilts
 *   crack             [left, right] lens stage 0 intact · 1 spider-cracked (missed: he still flinches) · 2 shattered
 *   crackBeat         world beat each lens cracked (NaN = not yet)
 *   blows             the walkdown's four blows: hit (true) / missed (false) / pending (null)
 *   swing             0..1 his backhand (rides the Burn's drum-fill lunges 314.72 / 330.70)
 *   fists             per-arm fist positions in WORLD px ([left, right]) while his fists are the slam lifts, else null;
 *                     `down` 1 = slammed (solid) … 0 = raised
 *   chainBeat         world beat the gold chain snapped (NaN = intact)
 *   panic             0..1 defeated → shrunk into one film frame, pounding its edges (the finale)
 *   reflect           0..1 how big the tangerine Slim in his lenses is (grows as the hero climbs him)
 */
import { slamState, type RuntimeLevel } from '../../level/build';
import type { BigJimPose } from '../../level/types';

interface PoseKey {
  beat: number;
  pose: BigJimPose;
  beats: number;
  /** fixed world x, or NaN = track the music line `ahead` beats in front */
  x: number;
  ahead: number;
  y: number;
  scale: number;
}

export interface BigJimFist {
  x: number;
  y: number;
  down: number;
}

export interface BigJimRuntime {
  pose: BigJimPose;
  prev: BigJimPose;
  k: number;
  x: number;
  y: number;
  scale: number;
  visible: number;
  rise: number;
  bluff: number;
  roar: number;
  blaze: number;
  reel: number;
  reelDir: number;
  crack: [number, number];
  crackBeat: [number, number];
  blows: (boolean | null)[];
  swing: number;
  fists: [BigJimFist | null, BigJimFist | null];
  chainBeat: number;
  panic: number;
  reflect: number;
}

const SPB_HOLD = 0.6; // beats a reel / roar takes to decay

export class BigJim {
  readonly state: BigJimRuntime = {
    pose: 'hidden',
    prev: 'hidden',
    k: 1,
    x: 0,
    y: 0,
    scale: 1,
    visible: 0,
    rise: 0,
    bluff: 0,
    roar: 0,
    blaze: 0,
    reel: 0,
    reelDir: 1,
    crack: [0, 0],
    crackBeat: [NaN, NaN],
    blows: [],
    swing: 0,
    fists: [null, null],
    chainBeat: NaN,
    panic: 0,
    reflect: 0,
  };
  private readonly keys: PoseKey[] = [];
  private readonly L: RuntimeLevel;
  /** breakable indices of his bound parts */
  private readonly lenses: number[] = [];
  private readonly blowsIdx: number[] = [];
  private chainIdx = -1;
  private readonly swings: number[];
  private readonly firstBeat: number;
  private readonly lastBeat: number;

  constructor(L: RuntimeLevel, swings: number[]) {
    this.L = L;
    const ppb = L.ppb;
    let x = 0;
    let ahead = 0;
    let y = 0;
    let scale = 1;
    const items = L.def.items.filter((it) => it.type === 'bigJim').sort((a, b) => a.beat - b.beat);
    for (const it of items) {
      if (it.type !== 'bigJim') continue;
      if (it.x !== undefined) {
        x = it.x * ppb;
        ahead = 0;
      } else if (it.ahead !== undefined) {
        x = NaN;
        ahead = it.ahead;
      }
      if (it.h !== undefined) y = -it.h;
      if (it.scale !== undefined) scale = it.scale;
      this.keys.push({ beat: it.beat, pose: it.pose, beats: Math.max(0.01, it.beats ?? 1), x, ahead, y, scale });
    }
    this.firstBeat = this.keys.length ? this.keys[0].beat : Infinity;
    this.lastBeat = this.keys.length ? this.keys[this.keys.length - 1].beat : -Infinity;
    L.breakables.forEach((b, i) => {
      if (b.beat < this.firstBeat - 1e-6) return;
      if (b.look === 'lens') this.lenses.push(i);
      else if (b.look === 'fist' || b.look === 'lapel' || b.look === 'jaw') this.blowsIdx.push(i);
      else if (b.look === 'chain') this.chainIdx = i;
    });
    this.swings = swings.filter((s) => s > this.firstBeat && s < this.lastBeat);
  }

  /** is Big Jim part of this level at all */
  get present(): boolean {
    return this.keys.length > 0;
  }

  step(wb: number): void {
    const s = this.state;
    if (!this.keys.length) return;
    // ---- pose keys
    let i = -1;
    for (let j = 0; j < this.keys.length; j++) if (this.keys[j].beat <= wb) i = j;
    const cur = i >= 0 ? this.keys[i] : this.keys[0];
    const prev = i > 0 ? this.keys[i - 1] : cur;
    const k = i >= 0 ? Math.min(1, (wb - cur.beat) / cur.beats) : 0;
    const e = k * k * (3 - 2 * k);
    s.pose = i >= 0 ? cur.pose : 'hidden';
    s.prev = prev.pose;
    s.k = k;
    const ax = (q: PoseKey) => (Number.isNaN(q.x) ? (wb + q.ahead) * this.L.ppb : q.x);
    s.x = ax(prev) + (ax(cur) - ax(prev)) * e;
    s.y = prev.y + (cur.y - prev.y) * e;
    s.scale = prev.scale + (cur.scale - prev.scale) * e;
    const w = (p: BigJimPose) => (s.pose === p ? e : 0) + (s.prev === p ? 1 - e : 0);
    s.visible = s.pose === 'hidden' ? (s.prev === 'hidden' ? 0 : 1 - e) : s.prev === 'hidden' ? e : 1;
    s.rise = s.pose === 'rise' ? e : s.pose === 'hidden' ? 0 : 1;
    s.bluff = w('bluff');
    s.panic = Math.max(w('defeated') * 0.6, w('framed') + (s.pose === 'framed' ? 0 : 0));
    if (s.pose === 'framed') s.panic = 1;
    // the reveal: lenses blaze on every beat of the held note
    const inBluff = s.pose === 'bluff' || (s.pose === 'fight' && s.prev === 'bluff' && k < 1);
    const ph = wb - Math.floor(wb);
    s.blaze = inBluff ? Math.max(0, 1 - ph * 2.5) : 0;
    s.roar = inBluff ? Math.max(0, 1 - Math.max(0, wb - cur.beat) / 3) : 0;
    // ---- the walkdown's blows (hit / missed / pending) and his reaction to the last one
    let lastHit = -Infinity;
    s.blows = this.blowsIdx.map((bi) => {
      const b = this.L.breakables[bi];
      if (b.broken) {
        lastHit = Math.max(lastHit, b.beat);
        return true;
      }
      return wb > b.beat + 0.5 ? false : null;
    });
    // ---- lenses: shattered when struck, spider-cracked when missed (he still flinches: the HEY lands either way)
    this.lenses.forEach((bi, side) => {
      if (side > 1) return;
      const b = this.L.breakables[bi];
      const done = wb >= b.beat;
      s.crack[side] = b.broken ? 2 : done && wb > b.beat + 0.5 ? 1 : 0;
      s.crackBeat[side] = s.crack[side] > 0 ? b.beat : NaN;
      if (s.crack[side] > 0) lastHit = Math.max(lastHit, b.beat);
    });
    const dr = wb - lastHit;
    s.reel = Math.max(w('reel'), w('reeling'), dr >= 0 && dr < SPB_HOLD ? 1 - dr / SPB_HOLD : 0);
    s.reelDir = lastHit === s.crackBeat[1] ? -1 : 1;
    if (dr >= 0 && dr < SPB_HOLD) s.roar = Math.max(s.roar, 1 - dr / SPB_HOLD);
    // ---- the backhand: rides the Burn's drum-fill lunges during the fight
    s.swing = w('swing');
    for (const b of this.swings) {
      const d = wb - b;
      if (d > -0.35 && d < 0.9) s.swing = Math.max(s.swing, d < 0 ? 1 + d / 0.35 : 1 - d / 0.9);
    }
    // ---- the fists ARE the gauntlet's slam lifts: while they're near, report where they are and whether slammed
    const lifts = this.L.slams.filter((f) => f.beat > this.firstBeat && f.beat < this.lastBeat);
    s.fists = [null, null];
    lifts.forEach((f, j) => {
      if (j > 1 || wb < f.beat - 4 || wb > f.beat + 3) return;
      const st = slamState(f, wb, this.L.swing);
      s.fists[j] = { x: f.solid.x + f.solid.w / 2, y: f.solid.y, down: 1 - st.lift };
    });
    // ---- the chain
    const ch = this.chainIdx >= 0 ? this.L.breakables[this.chainIdx] : null;
    s.chainBeat = ch && (ch.broken || wb > ch.beat + 0.5) ? ch.beat : NaN;
    // ---- Slim's reflection grows as he climbs Big Jim (from the reveal to the last lens)
    const r0 = this.keys.find((q) => q.pose === 'bluff')?.beat ?? this.firstBeat;
    const r1 = this.lenses.length ? this.L.breakables[this.lenses[this.lenses.length - 1]].beat : this.lastBeat;
    s.reflect = Math.max(0, Math.min(1, (wb - r0) / Math.max(1, r1 - r0)));
  }
}
