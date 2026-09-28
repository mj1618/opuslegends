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
 */
import type { Grade } from './judge';

export interface GameEventMap {
  grade: { grade: Exclude<Grade, 'miss'>; verb: 'jump' | 'strike'; beat: number; errMs: number; combo: number; heave: boolean; x: number; y: number };
  miss: { verb: 'jump' | 'strike'; beat: number; failKind: 'death' | 'stumble' | 'none'; source: string };
  combo: { broken: number; reason: 'good' | 'miss' | 'stumble' | 'death' };
  crowd: { value: number; count: number; norm: number; delta: number; fullHouse: boolean };
  fullHouse: { on: boolean; beat: number };
  stumble: { cause: string; beat: number };
  death: { cause: string; beat: number };
  burn: { kind: 'lunge' | 'pull' | 'caught'; beat: number; gap: number; danger: number };
  setPiece: { name: string; beat: number; beats: number };
  smash: { beat: number; x: number; y: number; big: boolean; giant: boolean; index: number };
  hint: { key: string; text: string; icon: string };
}

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
