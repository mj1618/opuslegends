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
 *                 on its FIRST attempt (tests stumble / death -> checkpoint respawn -> music rewind)
 *   ?skip=<kinds> autoplay ALWAYS skips actions of these fail kinds: none (lazy: ignores every reward),
 *                 stumble (reckless: eats every stumble threat) — the "teeth" bots
 *   ?jitter=<ms>  autoplay presses each action at a random offset in [-ms, +ms] (seeded by ?seed):
 *                 validates that the level is fair for human timing (Good window = 135 ms)
 *   ?sloppy=1     = ?jitter=85&late=0.1 (a sloppy human: presses re-rolled every attempt)
 *   ?late=<p>     autoplay: fraction of presses that are an extra 60-110 ms late
 *   ?judge=1      show timing-grade popups (PERFECT / GREAT / GOOD) — off by default per DESIGN
 *   ?coldopen=0   skip the cold open (start straight at the count-in)
 *   ?device=<ms>  autoplay: the bot hears the audio this late (unreported device latency; calibration fixes it)
 *   ?calib=1      run the cold open's projector sync (latency tap test) — the bot taps it too
 *   ?resync=1     autoplay: accept a re-offered projector sync (the auto-drift pinned at its clamp): pause, tap, resume
 *   ?autolat=0    disable the in-run latency auto-drift
 *   ?song=<id>    edit (default: the original recording's level edit) | full (the whole original) |
 *                 placeholder (synth track). Falls back to placeholder if the licensed file is missing.
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
  /** autoplay: fail kinds the bot ALWAYS skips ('none' = a lazy player, 'stumble' = a reckless one) */
  skip: string[];
  /** live audio sync probe (implied by autoplay) */
  probe: boolean;
  /** Skip the title screen (implied by autoplay). */
  skipTitle: boolean;
  /** autoplay timing jitter (ms) */
  jitter: number;
  /** autoplay: probability of an extra late press */
  late: number;
  /** timing-grade text popups */
  judge: boolean;
  /** play the cold open (default true) */
  coldOpen: boolean;
  /** requested song: 'edit' | 'full' | 'placeholder' (raw; see audio/songs.ts parseSongChoice) */
  song: string | null;
  /**
   * autoplay: the bot's unreported audio/device delay (ms) — it HEARS the music this late and presses accordingly,
   * so the latency offset (calibration / auto-drift) corrects it, like a human on a Bluetooth speaker
   */
  device: number;
  /** cold open: run the projector sync (the latency tap test) even if an offset is stored / for the bot */
  calib: boolean;
  /** autoplay: the bot ACCEPTS a re-offered projector sync (pause → tap test → resume), like a player following the prompt */
  resync: boolean;
  /** auto-calibration drift of the latency offset during the run (default on; ?autolat=0 disables) */
  autoLatency: boolean;
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
    skip: (q.get('skip') ?? '').split(',').map((x) => x.trim()).filter(Boolean),
    skipTitle: autoplay || flag('skiptitle'),
    jitter: num('jitter') ?? (flag('sloppy') ? 85 : 0),
    late: num('late') ?? (flag('sloppy') ? 0.1 : 0),
    judge: flag('judge'),
    coldOpen: q.get('coldopen') !== '0',
    song: q.get('song'),
    device: num('device') ?? 0,
    calib: flag('calib'),
    resync: flag('resync'),
    autoLatency: q.get('autolat') !== '0',
  };
}

export const params: Params = readParams();
