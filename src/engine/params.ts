/**
 * URL parameters (read once at boot). These are the orchestrator's main review levers:
 *   ?debug=1      debug overlay (fps, song time, hitboxes, beat grid, intended-action markers)
 *   ?start=<beat> start mid-level at a beat (acts as a checkpoint; see Game.startRun)
 *   ?autoplay=1   bot plays the level via the controller using each obstacle's intended action
 *   ?mute=1       silence output (audio clock still runs)
 *   ?latency=<ms> override the audio latency offset (otherwise stored in localStorage)
 *   ?seed=<n>     cosmetic seed
 *   ?probe=1      live audio sync probe (AudioWorklet onset detector on the music bus)
 *   ?miss=<beats> comma-separated beats whose intended action the autoplay bot deliberately skips
 *                 on its FIRST attempt (tests death -> checkpoint respawn -> music rewind)
 */
export interface Params {
  debug: boolean;
  start: number | null;
  autoplay: boolean;
  mute: boolean;
  latencyMs: number | null;
  seed: number;
  /** autoplay: beats to deliberately miss once */
  miss: number[];
  /** live audio sync probe (implied by autoplay) */
  probe: boolean;
  /** Skip the title screen (implied by autoplay). */
  skipTitle: boolean;
}

function readParams(): Params {
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const flag = (k: string) => {
    const v = q.get(k);
    return v !== null && v !== '0' && v !== 'false';
  };
  const num = (k: string): number | null => {
    const v = q.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const autoplay = flag('autoplay');
  return {
    debug: flag('debug'),
    start: num('start'),
    autoplay,
    mute: flag('mute'),
    latencyMs: num('latency'),
    seed: num('seed') ?? 1,
    probe: flag('probe'),
    miss: (q.get('miss') ?? '')
      .split(',')
      .filter((x) => x.trim() !== '')
      .map(Number)
      .filter(Number.isFinite),
    skipTitle: autoplay || flag('skiptitle'),
  };
}

export const params: Params = readParams();
