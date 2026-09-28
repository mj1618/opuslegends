/**
 * window.__game — test/automation API used by the Playwright playtest and handy in the console.
 *
 *   __game.state()          compact snapshot (scene, song time, beat, player, deaths, lums, finished)
 *   __game.report()         full JSON report (timing errors vs beats, frame stats, clock diagnostics)
 *   __game.start(beat?)     (re)start a run, optionally mid-level
 *   __game.setLatency(ms)   set the audio latency offset
 *   __game.debug(on)        toggle the overlay
 *   __game.level            the level definition (data)
 *   __game.game             the live Game object (for poking around)
 */
import type { Game } from '../game/game';

export interface TestApi {
  state: () => ReturnType<Game['snapshot']>;
  report: () => ReturnType<Game['report']>;
  start: (beat?: number) => void;
  setLatency: (ms: number) => void;
  debug: (on: boolean) => void;
  level: Game['levelDef'];
  game: Game;
}

declare global {
  interface Window {
    __game?: TestApi;
  }
}

export function installTestApi(game: Game): void {
  window.__game = {
    state: () => game.snapshot(),
    report: () => game.report(),
    start: (beat?: number) => {
      void game.audio.unlock();
      game.startRun(beat);
    },
    setLatency: (ms: number) => {
      game.conductor.latency = ms / 1000;
    },
    debug: (on: boolean) => {
      game.debug.enabled = on;
    },
    level: game.levelDef,
    game,
  };
}
