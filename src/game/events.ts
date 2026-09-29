/**
 * GAME EVENTS — the one place presentation (audio, art, HUD) hears what the gameplay did.
 *
 *   game.events.on('grade', (e) => …)   // returns an unsubscribe function
 *
 * Emitted from the fixed-step sim (so they are exact and deterministic); listeners must be cheap and
 * READ-ONLY on game state. State you can also poll every frame instead of listening:
 *   game.crowd.value / .count / .norm / .bigCatch   the skill meter (0..Tun.crowd.max, FULL HOUSE ≥ bigCatchAt)
 *   game.combo / game.comboPeak                     consecutive Great-or-better presses
 *   game.chaser.{x, gap, lunge, danger, flare}      the Burn (see Game.updateChaser)
 *   game.setPiece                                   the active set-piece cue (name, beat, beats) or null
 *
 * Event list:
 *   grade     a press graded Perfect/Great/Good (combo already updated; `heave` = completed Hup-Hup-HEY)
 *   miss      a target passed without a press (reward targets cost the crowd 2 and feed the Burn)
 *   combo     the combo broke (`broken` = the streak that ended, ≥ 1) — increments ride on `grade`
 *   crowd     the crowd value moved (every change; `count` = members standing, `fullHouse` = ≥ bigCatchAt)
 *   fullHouse FULL HOUSE reached (`on: true`) or lost (`on: false`)
 *   stumble   the hero stumbled (`cause` = 'spike@38.45', 'jabber@45', 'lowSign@70.16', 'wall@…')
 *   death     the hero died (`cause` = 'pit' | 'chaser')
 *   burn      the Burn moved on its own: 'lunge' (a drum fill), 'pull' (a stumble / missed reward fed it),
 *             'caught' (it ate the hero)
 *   setPiece  a scripted wow moment starts (level `setPiece` items + gameplay ones: 'launch', 'smash')
 *   smash     a breakable burst (`giant` = the walkdown kegs; `index` = its position in a giant run)
 *   hint      a failure hint was raised (the player failed the same thing twice)
 *   whew      (iteration 6) a NEAR-MISS: the hero survived a lethal by a hair — 'lip' = landed within the last
 *             Tun.whew.ms of a pit's early side (toes on the far lip / a lift's edge), 'coyote' = took off in the last
 *             Tun.whew.ms of the coyote time over a lethal pit (the late side), 'graze' = passed a spike within
 *             Tun.whew.grazePx without touching it. `ms` = the margin left. At most one per Tun.whew.gapBeats.
 *             Presentation: a gasp + a cream puff at (x, y); free tension without deaths
 *   stamp     (iteration 6) the NOTABLE moments worth a stamp (the per-press grade stamps were noise): 'firstPerfect'
 *             (the first Perfect of each 4-bar phrase), 'streak' (combo 10 / 25 / 50 / 100 / every 50), 'heave' (a
 *             completed Hup-Hup-HEY), 'giant' (a giant smash: kegs, pins, busts, lenses, the final hit), 'whew'
 *             (a near-miss), 'canister' (a film canister found). `text` = a suggested caption
 *   canister  (iteration 6) a hidden FILM CANISTER picked up (`found` of `total` this run; one per act, on a high route)
 *   rally     (iteration 7) THE CROWD FORGIVES: `hits` consecutive Great+ presses (or a Heave, `heave`) in a forgiving
 *             stretch (a chorus / the roof's stop-time) refilled the house to FULL HOUSE (a 'fullHouse' on follows with
 *             cause 'rally'). Presentation: the audience jumps back up
 *   sign      (iteration 7) the ROOF SIGN (bars 44-45, the stop-time): a strike on a stop-time hit rewrote one neon letter
 *             — `index` 0..3 of `word` (SLIM), `letter` = the new letter, `lit` = letters rewritten so far this attempt
 *             (poll `game.sign` for the state). A missed hit leaves that letter as it was (BIG JIM's)
 *   tease     (iteration 7) the hero passed UNDER a hidden film canister without taking it — the first time this run
 *             (and only until the player has ever found one): "SOMETHING UP THERE?" (a 'tease' stamp at the canister too)
 *   finish    (iteration 7) the run reached the end: `rank` (the poster's letter, floored at C for a finisher) and
 *             `finisher` true. `game.finalRank` holds it from here on (audio: the rank sting; art: the stamp)
 */
import type { Grade } from './judge';

export interface GameEventMap {
  grade: { grade: Exclude<Grade, 'miss'>; verb: 'jump' | 'strike'; beat: number; errMs: number; combo: number; heave: boolean; x: number; y: number };
  miss: { verb: 'jump' | 'strike'; beat: number; failKind: 'death' | 'stumble' | 'none'; source: string };
  combo: { broken: number; reason: 'good' | 'miss' | 'stumble' | 'death' };
  crowd: { value: number; count: number; norm: number; delta: number; fullHouse: boolean };
  /** `cause` (iteration 7): what filled it — 'drop' (a clean Hup-Hup-HEY into a chorus), 'rally' (the crowd forgives),
   *  'play' (the meter climbed there); omitted when it drops out */
  fullHouse: { on: boolean; beat: number; cause?: 'drop' | 'rally' | 'play' };
  stumble: { cause: string; beat: number };
  death: { cause: string; beat: number };
  /** `threat` 0..1 (iteration 6): how far the Burn is pulled in from its rest (0 = at rest: a lunge there is harmless
   *  and should NOT flare; 1 = a stumble's worth or more). Game only emits 'lunge' with threat > 0 */
  burn: { kind: 'lunge' | 'pull' | 'caught'; beat: number; gap: number; danger: number; threat: number };
  setPiece: { name: string; beat: number; beats: number };
  smash: { beat: number; x: number; y: number; big: boolean; giant: boolean; index: number };
  hint: { key: string; text: string; icon: string };
  whew: { kind: WhewKind; beat: number; x: number; y: number; ms: number };
  stamp: { kind: StampKind; beat: number; x: number; y: number; text: string; combo: number };
  canister: { index: number; found: number; total: number; beat: number; x: number; y: number };
  rally: { beat: number; hits: number; heave: boolean; value: number };
  sign: { index: number; letter: string; word: string; lit: number; beat: number; x: number; y: number };
  tease: { index: number; beat: number; x: number; y: number; text: string };
  finish: { beat: number; rank: import('./rank').RunRank; finisher: boolean };
}

export type WhewKind = 'lip' | 'coyote' | 'graze';
export type StampKind = 'firstPerfect' | 'streak' | 'heave' | 'giant' | 'whew' | 'canister' | 'rally' | 'tease';

export type GameEventType = keyof GameEventMap;
type Listener<K extends GameEventType> = (e: GameEventMap[K]) => void;

export class GameEvents {
  private map: { [K in GameEventType]?: Listener<K>[] } = {};

  on<K extends GameEventType>(type: K, fn: Listener<K>): () => void {
    const list = (this.map[type] ??= []) as Listener<K>[];
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit<K extends GameEventType>(type: K, e: GameEventMap[K]): void {
    const list = this.map[type] as Listener<K>[] | undefined;
    if (!list) return;
    for (const fn of list) {
      try {
        fn(e);
      } catch (err) {
        console.warn(`game event '${type}' listener failed`, err);
      }
    }
  }
}
