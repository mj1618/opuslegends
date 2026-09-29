/**
 * ACT 3 RUNTIME (iteration 4, docs/level/act3_plan.md): the climax's set-piece state for the renderer / audio, plus
 * two gameplay rules. Everything is a pure function of the WORLD beat and what the hero broke, so checkpoint rewinds
 * and hitstop replay it exactly. Owned by `Mechanics` (game.mech.act3); reset/step with it.
 *
 *   call      the breakdown's CALL AND RESPONSE: in a call bar the goons stomp the Black Betty call (1 · &2 · 3, from
 *             the song's `stomps` lane); in the answer bar the hero plays the same rhythm. `stomp` = a 0..1 pulse on
 *             every call stomp, `answer` = true in an answer bar (bells light up on the call's beats)
 *   rack      the Velvet Casino: `tiers` (the goon heap's levels, world px) pile in one per downbeat ≥ 1 bar ahead of
 *             the hero (`k` 0..1), `lights` = chandeliers still lit (each struck — or passed — kills one), `frame` =
 *             the rack frame's slam (1 on the fill's downbeat), `broken` = the BREAK SHOT's result (null pending),
 *             `scatter` 0..1 after the break (the goons fly into the pockets)
 *   letters   the six BIG JIM letters (letters.ts)
 *   bigJim    the boss rig state (bigJim.ts)
 *   iris      the finale: `blades` closed (0..4, one per beat from the irisOut cue), `close` 0..1 (how shut),
 *             `slam` 0..1 (the last blade SLAMS shut on the final hit: 340), `theEnd` 0..1 (the card burns in),
 *             `open` 0..1 (the second iris opens on Slim's victory pose)
 * Rules (read by game.ts):
 *   burnRetired(beat)  the Burn retires on the level's `chaser { off: true }` beat (332): the finale can't kill
 *   crowdFloor(beat)   the crowd can't drop below the level's `crowd { floor }` from its beat (FULL HOUSE for the end)
 */
import { laneBeats, type SongDef } from '../../audio/song';
import type { RuntimeLevel } from '../../level/build';
import { BigJim, type BigJimRuntime } from './bigJim';
import { type ToppleLetter, makeLetters, stepLetter } from './letters';

export type { BigJimRuntime, ToppleLetter };

export interface RackTier {
  x0: number;
  x1: number;
  y: number;
  /** downbeat it piles in on */
  pileBeat: number;
  /** 0..1 piled */
  k: number;
}

export interface Act3State {
  call: { active: boolean; answer: boolean; stomp: number; barBeat: number };
  rack: { active: boolean; tiers: RackTier[]; lights: number; frame: number; broken: boolean | null; breakBeat: number; scatter: number };
  iris: { active: boolean; blades: number; close: number; slam: number; theEnd: number; open: number; beat: number };
}

const window = (L: RuntimeLevel, name: string) => L.setPieces.filter((s) => s.name === name).map((s) => ({ from: s.beat, to: s.beat + s.beats }));

export class Act3 {
  readonly letters: ToppleLetter[];
  readonly bigJim: BigJim;
  readonly state: Act3State = {
    call: { active: false, answer: false, stomp: 0, barBeat: 0 },
    rack: { active: false, tiers: [], lights: 3, frame: 0, broken: null, breakBeat: NaN, scatter: 0 },
    iris: { active: false, blades: 0, close: 0, slam: 0, theEnd: 0, open: 0, beat: NaN },
  };
  private readonly L: RuntimeLevel;
  private readonly calls: { from: number; to: number }[];
  private readonly stomps: number[];
  private readonly rackWin: { from: number; to: number } | null;
  private readonly chandeliers: number[];
  private readonly breakIdx: number;
  private readonly irisWin: { from: number; to: number } | null;
  private readonly endBeat: number;
  private readonly offBeat: number;
  private readonly floors: { beat: number; floor: number }[];

  constructor(L: RuntimeLevel, song?: SongDef) {
    this.L = L;
    this.letters = makeLetters(L);
    this.bigJim = new BigJim(L, song ? laneBeats(song, 'fills') : []);
    this.calls = window(L, 'callResponse');
    this.stomps = song ? laneBeats(song, 'stomps').sort((a, b) => a - b) : [];
    this.rackWin = window(L, 'rack')[0] ?? null;
    const brk = window(L, 'rackBreak')[0];
    this.breakIdx = brk ? L.breakables.findIndex((b) => b.giant && Math.abs(b.beat - brk.from) < 0.05) : -1;
    this.chandeliers = this.rackWin ? L.pendulums.map((p, i) => ({ p, i })).filter(({ p }) => p.beat >= this.rackWin!.from && p.beat < this.rackWin!.to).map(({ i }) => i) : [];
    if (this.rackWin) {
      const b = L.xAt(this.rackWin.to);
      const a2 = L.xAt(this.rackWin.from - 2);
      for (const f of L.floors) {
        if (f.x1 <= a2 || f.x0 >= b) continue;
        const beat0 = L.beatAt(f.x0);
        this.state.rack.tiers.push({ x0: f.x0, x1: f.x1, y: f.y, pileBeat: Math.floor((beat0 - 4) / 4) * 4, k: 0 });
      }
    }
    this.irisWin = window(L, 'irisOut')[0] ?? null;
    this.endBeat = window(L, 'theEnd')[0]?.from ?? L.finishBeat;
    this.offBeat = Math.min(Infinity, ...L.def.items.flatMap((it) => (it.type === 'chaser' && it.off ? [it.beat] : [])));
    this.floors = L.def.items.flatMap((it) => (it.type === 'crowd' && it.floor !== undefined ? [{ beat: it.beat, floor: it.floor }] : [])).sort((a, b) => a.beat - b.beat);
  }

  /** the Burn retires from this beat on (the finale can't kill) */
  burnRetired(beat: number): boolean {
    return beat >= this.offBeat;
  }

  /** the crowd's floor at `beat` (0 = none) */
  crowdFloor(beat: number): number {
    let f = 0;
    for (const c of this.floors) if (beat >= c.beat) f = c.floor;
    return f;
  }

  reset(beat: number): void {
    this.step(beat);
  }

  step(wb: number): void {
    const S = this.state;
    const L = this.L;
    // ---- call and response
    const c = this.calls.find((w) => wb >= w.from && wb < w.to + 4);
    S.call.active = !!c;
    S.call.answer = !!c && wb >= c.to;
    S.call.barBeat = c ? wb - (S.call.answer ? c.to : c.from) : 0;
    S.call.stomp = 0;
    if (c && !S.call.answer) for (const s of this.stomps) if (s >= c.from - 0.01 && s < c.to && wb >= s && wb - s < 0.5) S.call.stomp = Math.max(S.call.stomp, 1 - (wb - s) / 0.5);
    // ---- the rack
    const R = S.rack;
    R.active = !!this.rackWin && wb >= this.rackWin.from - 8 && wb < this.rackWin.to + 2;
    for (const t of R.tiers) t.k = Math.max(0, Math.min(1, wb - t.pileBeat));
    R.lights = this.chandeliers.reduce((n, i) => n - (L.pendulums[i].struck || wb > L.pendulums[i].beat + 0.4 ? 1 : 0), this.chandeliers.length);
    const brk = this.breakIdx >= 0 ? L.breakables[this.breakIdx] : null;
    R.breakBeat = brk ? brk.beat : NaN;
    R.broken = brk ? (brk.broken ? true : wb > brk.beat + 0.3 ? false : null) : null;
    R.scatter = brk && wb >= brk.beat ? Math.min(1, (wb - brk.beat) / 1.5) : 0;
    const fb = this.rackWin ? Math.floor((this.rackWin.to - 4) / 4) * 4 : NaN; // the fill bar's downbeat
    R.frame = wb >= fb && wb < fb + 0.6 ? 1 - (wb - fb) / 0.6 : 0;
    // ---- the letters + Big Jim
    for (const l of this.letters) stepLetter(l, wb);
    this.bigJim.step(wb);
    // ---- the iris finale: a blade per beat from the cue, the SLAM on its last beat (the final hit)
    const I = S.iris;
    const w = this.irisWin;
    I.active = !!w && wb >= w.from - 1;
    if (w) {
      const last = w.to - 1; // the final hit
      I.beat = last;
      I.blades = Math.max(0, Math.min(4, Math.floor(wb - w.from) + 1));
      I.close = wb < w.from ? 0 : wb < last ? 0.15 * Math.min(4, wb - w.from + 1) : 1;
      I.slam = wb < last ? 0 : Math.min(1, (wb - last) / 0.12);
      I.theEnd = Math.max(0, Math.min(1, (wb - (last + 1)) / 1));
      I.open = Math.max(0, Math.min(1, (wb - (last + 2)) / 2));
    }
    void this.endBeat;
  }
}
