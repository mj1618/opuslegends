/**
 * StageAudio — the music IS the reward. One small API for gameplay (and art) to drive everything the
 * player should HEAR about how they're doing:
 *
 *   stage.setCrowd(count, instant?)    the crowd meter -> the projection booth (thin, mono, worn film at a
 *                                      low crowd -> the record as mastered -> wider at FULL HOUSE) + the
 *                                      overlay stems (shouts / stomps+claps / cowbell) + FULL HOUSE cheers.
 *                                      Moves are quantized to the NEXT BEAT and glide over ~1 beat.
 *   stage.onGrade(grade, beat, combo?) Perfect = jukebox bell on a chord tone (climbs the chord with the
 *                                      combo), Great = the same bell softer and duller, Good = nothing,
 *                                      Miss = onMiss. Sounds land ON the target beat when the press was early.
 *   stage.onMiss(beat?)                dull thunk on the next swung 8th + the film snags in the gate
 *   stage.onStumble()                  record-scratch warble on the music + the audience's "ooh"
 *   stage.onDeath()                    (the Conductor's tape-stop) + the audience groans
 *   stage.onCheckpoint()               projector changeover click on the next beat + the cue-dot flare
 *
 * In the game: `StageAudio.forGame(audio, conductor)` + `stage.listen(game.events)` (grade / miss / crowd /
 * stumble / death arrive as game events); Game calls setCrowd(value, true) on spawns and onCheckpoint().
 * Other code (art, HUD) can read `stage.combo` or call these directly; everything is idempotent-safe.
 *
 * Levels: audio/mix.ts (BOOTH, OVERLAY_RULES, GRADE_SFX). Everything goes through the master limiter.
 * The "film" (record + overlays) goes through the booth; the audience and the grade sounds are in the
 * theatre (SFX bus), so they stay full-range even when the film sounds thin.
 */
import type { AudioSystem } from './audioSystem';
import type { Booth } from './booth';
import type { Conductor } from './conductor';
import { BOOTH, FULL_HOUSE, GRADE_SFX, boothState, dbToGain } from './mix';
import { CHIME_NOTES, SampleBank, type SampleId } from './samples';
import { type SongDef, chordAt, mtof } from './song';

export type StageGrade = 'perfect' | 'great' | 'good' | 'miss';

/** Timing source (the Conductor in the game; a scripted clock in the offline mix lab). */
export interface StageClock {
  /** the beat whose grid-aligned sound would start right now on the graph (NaN when the music is stopped) */
  graphBeat(): number;
  /** ctx time at which a sound must start to land ON `beat` of the music (NaN when stopped) */
  ctxAtBeat(beat: number): number;
  /** ctx time for "now" */
  now(): number;
  secondsPerBeat(beat: number): number;
  beatsPerBar: number;
}

export interface StageHost {
  ctx: BaseAudioContext;
  booth: Booth;
  /** SFX bus input (the theatre: not filtered by the booth) */
  sfxOut: AudioNode;
  song: SongDef;
  clock: StageClock;
  /** set the overlay stems for a crowd count, gliding from ctx time `when` (instant: ~now, 50 ms) */
  setOverlays(crowd: number, when: number, instant: boolean): void;
}

/** The slice of the gameplay event bus (game/events.ts GameEvents) that StageAudio listens to. */
export interface StageEventSource {
  on(type: 'grade', fn: (e: { grade: 'perfect' | 'great' | 'good'; beat: number; combo: number }) => void): unknown;
  on(type: 'miss', fn: (e: { beat: number; failKind: string }) => void): unknown;
  on(type: 'crowd', fn: (e: { value: number }) => void): unknown;
  on(type: 'stumble', fn: (e: { beat: number }) => void): unknown;
  on(type: 'death', fn: (e: { beat: number }) => void): unknown;
}

export class StageAudio {
  readonly host: StageHost;
  readonly samples: SampleBank;
  /** consecutive Perfect/Great presses (the bell climbs the chord); reset by a miss, stumble or death */
  combo = 0;
  private crowd = 0;
  private fullHouseArmed = true;
  private lastCheerBeat = -Infinity;
  private lastBoothKey = '';

  constructor(host: StageHost) {
    this.host = host;
    this.samples = new SampleBank(host.ctx);
  }

  /** The game's wiring: the Conductor is the clock, AudioSystem owns the booth and the buses. */
  static forGame(audio: AudioSystem, conductor: Conductor): StageAudio {
    conductor.filmDelay = audio.filmDelay;
    const c = conductor;
    const clock: StageClock = {
      graphBeat: () => c.graphBeat(),
      ctxAtBeat: (b) => c.ctxTimeAtSongTime(c.tempo.beatToTime(b)),
      now: () => audio.ctx.currentTime,
      secondsPerBeat: (b) => c.tempo.secondsPerBeatAt(b),
      beatsPerBar: c.tempo.beatsPerBar,
    };
    const stage = new StageAudio({
      ctx: audio.ctx,
      booth: audio.booth,
      sfxOut: audio.sfx,
      song: c.song,
      clock,
      setOverlays: (n, when, instant) => c.setCrowdLevel(n, instant, when),
    });
    c.onBeat((b) => stage.beatTick(b));
    void stage.load();
    return stage;
  }

  /**
   * Subscribe to the gameplay's event bus (game/events.ts): grades, misses of REWARD targets (a missed
   * threat already sounds as its stumble / death), the crowd meter, stumbles and deaths.
   */
  listen(events: StageEventSource): void {
    events.on('grade', (e) => this.onGrade(e.grade, e.beat, e.combo));
    events.on('miss', (e) => {
      if (e.failKind === 'none') this.onMiss(e.beat);
      else this.combo = 0;
    });
    events.on('crowd', (e) => this.setCrowd(e.value));
    events.on('stumble', () => this.onStumble());
    events.on('death', () => this.onDeath());
  }

  /** Load the sampled one-shots and start the projector bed (best-effort; synth fallbacks otherwise). */
  async load(fetchFn?: typeof fetch): Promise<void> {
    await this.samples.load(undefined, fetchFn);
    const clatter = this.samples.get('projector_loop');
    if (clatter) this.host.booth.setClatter(clatter);
  }

  // ------------------------------------------------------------------ timing helpers

  private get ctx(): BaseAudioContext {
    return this.host.ctx;
  }

  /** ctx time of the next grid point (every `step` beats, swung 8ths when step = 0.5) at least `minAhead` s away */
  private nextGrid(step: number, minAhead = 0.01): { when: number; beat: number } {
    const k = this.host.clock;
    const now = k.now();
    const gb = k.graphBeat();
    if (!Number.isFinite(gb)) return { when: now, beat: NaN };
    const sw = this.host.song.swing;
    const grid = (b: number): number[] => {
      const f = Math.floor(b);
      return step === 0.5 ? [f, f + sw, f + 1, f + 1 + sw, f + 2] : [Math.ceil(b / step) * step, Math.ceil(b / step) * step + step];
    };
    for (const b of grid(gb)) {
      const t = k.ctxAtBeat(b);
      if (t >= now + minAhead) return { when: t, beat: b };
    }
    return { when: now, beat: gb };
  }

  // ------------------------------------------------------------------ crowd -> booth + overlays

  /**
   * The crowd meter changed. The booth and the overlays start gliding on the NEXT beat (bloom and
   * thin alike) and arrive ~1 beat later. `instant` (spawns, rewinds): set now (50 ms), no quantize.
   */
  setCrowd(count: number, instant = false): void {
    const prev = this.crowd;
    this.crowd = count;
    const { booth, clock } = this.host;
    const s = boothState(count);
    const key = `${s.open.toFixed(3)}|${s.house.toFixed(3)}`;
    // no music playing (cold open wake-up, death pause): nothing to glide against, set it now
    if (instant || !Number.isFinite(clock.graphBeat())) {
      const now = clock.now();
      booth.cancel(now);
      booth.setState(s, now, instant ? 0.012 : 0.06);
      this.host.setOverlays(count, now, true);
      this.lastBoothKey = key;
      this.fullHouseArmed = count < FULL_HOUSE;
      return;
    }
    const nb = this.nextGrid(1, 0.02);
    const spb = Number.isFinite(nb.beat) ? clock.secondsPerBeat(nb.beat) : 0.37;
    if (key !== this.lastBoothKey) {
      booth.setState(s, nb.when, (BOOTH.rampBeats * spb) / 4);
      this.lastBoothKey = key;
    }
    this.host.setOverlays(count, nb.when, false);
    // FULL HOUSE: the house comes down on the next downbeat (re-armed once it drops 4 under)
    if (count >= FULL_HOUSE && prev < FULL_HOUSE && this.fullHouseArmed) {
      this.fullHouseArmed = false;
      const bar = this.nextGrid(clock.beatsPerBar, 0.02);
      this.play('crowd_cheer_swell', bar.when, GRADE_SFX.cheerDb, { align: true });
      this.lastCheerBeat = Number.isFinite(bar.beat) ? bar.beat : this.lastCheerBeat;
    }
    if (count <= FULL_HOUSE - 4) this.fullHouseArmed = true;
  }

  /**
   * Per music beat (Conductor.onBeat): at FULL HOUSE the audience cheers into the vocal gaps — a swell
   * starting on the phrase's last beat when the singer rests ≥ 1.5 beats (at most one per 2 bars).
   */
  beatTick(beat: number): void {
    if (this.crowd < FULL_HOUSE) return;
    const phrases = this.host.song.map?.lanes.vocalPhrases;
    if (!phrases || beat - this.lastCheerBeat < 8) return;
    for (let i = 0; i < phrases.length; i++) {
      const end = Number(phrases[i].endBeat ?? phrases[i].beat + (phrases[i].durBeats ?? 0));
      if (!(end >= beat + 1 && end < beat + 2)) continue;
      const next = phrases[i + 1]?.beat ?? Infinity;
      if (next - end < 1.5) return;
      const at = Math.round(end * 2) / 2;
      const tier: SampleId = this.crowd >= 24 ? 'crowd_swell_3' : this.crowd >= 22 ? 'crowd_swell_2' : 'crowd_swell_1';
      this.play(tier, this.host.clock.ctxAtBeat(at), GRADE_SFX.gapCheerDb, { align: true });
      this.lastCheerBeat = at;
      return;
    }
  }

  // ------------------------------------------------------------------ grades

  /**
   * A graded press on the intended action at `beat`. The sound lands ON that beat if the press was
   * early (≤ 150 ms), else right away (a late Perfect is ≤ 45 ms late). `combo`: the gameplay's combo
   * counter if it has one (else this class counts).
   */
  onGrade(grade: StageGrade, beat: number, combo?: number): void {
    if (grade === 'miss') return this.onMiss(beat);
    if (grade === 'good') return;
    this.combo = combo ?? this.combo + 1;
    const { clock } = this.host;
    const now = clock.now();
    const at = clock.ctxAtBeat(beat);
    const when = Number.isFinite(at) && at > now && at - now < 0.15 ? at : now;
    const midi = this.bellNote(beat, this.combo);
    const [sm, id] = CHIME_NOTES.reduce((a, b) => (Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a));
    const rate = Math.pow(2, (midi - sm) / 12);
    if (grade === 'perfect') {
      if (!this.play(id, when, GRADE_SFX.perfectDb, { rate })) this.synthBell(midi, when, 0.05, 0);
    } else if (!this.play(id, when, GRADE_SFX.greatDb, { rate, lp: GRADE_SFX.greatLp, cut: 0.3 })) {
      this.synthBell(midi, when, 0.02, 2200);
    }
  }

  /**
   * The bell's note: chord tones of the harmony at `beat` between E5 and G6, ping-ponging up and down
   * the ladder as the combo grows (a Perfect streak arpeggiates the chord the band is playing).
   */
  bellNote(beat: number, combo: number): number {
    const song = this.host.song;
    const pcs = new Set(chordAt(song, beat).map((t) => (((song.key.root + t) % 12) + 12) % 12));
    const ladder: number[] = [];
    for (let m = 76; m <= 91; m++) if (pcs.has(m % 12)) ladder.push(m);
    if (ladder.length === 0) return 76;
    const n = ladder.length;
    const period = Math.max(1, 2 * n - 2);
    const i = Math.max(0, combo - 1) % period;
    return ladder[i < n ? i : period - i];
  }

  /** Miss: dull muted thunk on the next swung 8th (≤ ~200 ms away) + the film snags in the gate. */
  onMiss(_beat?: number): void {
    this.combo = 0;
    const { clock, booth } = this.host;
    const g = this.nextGrid(0.5, 0.01);
    const when = g.when - clock.now() < 0.22 ? g.when : clock.now();
    if (!this.play('bench_thunk', when, GRADE_SFX.missDb, { rate: 0.75, lp: GRADE_SFX.missLp })) this.synthThunk(when);
    booth.snag(when, Number.isFinite(g.beat) ? clock.secondsPerBeat(g.beat) : 0.37);
  }

  /** Stumble: the film warbles (record-scratch flutter on the music) and the audience goes "ooh". */
  onStumble(): void {
    this.combo = 0;
    const now = this.host.clock.now();
    this.host.booth.warble(now + 0.005);
    this.play('crowd_ooh', now, GRADE_SFX.oohDb);
  }

  /** Death: the Conductor's tape-stop does the music; the audience groans under it. */
  onDeath(): void {
    this.combo = 0;
    this.play('crowd_ooh', this.host.clock.now() + 0.05, GRADE_SFX.groanDb, { rate: 0.78, lp: 1400 });
  }

  /** Checkpoint: projector changeover — a click on the next beat and the cue-dot flare. */
  onCheckpoint(): void {
    const g = this.nextGrid(1, 0.01);
    if (!this.play('film_snap', g.when, GRADE_SFX.clickDb, { lp: 5000 })) this.synthThunk(g.when, 1800);
    this.play('burn_flare', g.when, GRADE_SFX.flareDb, { align: true });
  }

  // ------------------------------------------------------------------ plumbing

  private play(id: SampleId, when: number, db: number, o: { rate?: number; lp?: number; align?: boolean; cut?: number } = {}): boolean {
    return this.samples.play(id, this.host.sfxOut, when, { ...o, gain: dbToGain(db) });
  }

  /** fallback bell (no samples): sine + inharmonic partial */
  private synthBell(midi: number, when: number, vol: number, lp: number): void {
    const ctx = this.ctx;
    const f = mtof(midi);
    const out = ctx.createGain();
    out.gain.value = 1;
    let dest: AudioNode = this.host.sfxOut;
    if (lp) {
      const bq = ctx.createBiquadFilter();
      bq.frequency.value = lp;
      bq.connect(dest);
      dest = bq;
    }
    out.connect(dest);
    for (const [k, v, d] of [[1, vol, 0.5], [2.76, vol * 0.3, 0.25]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f * k;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(v, when + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + d + 0.02);
    }
  }

  /** fallback thunk: a low sine knock under a low-passed noise tick */
  private synthThunk(when: number, f = 110): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 1.6, when);
    o.frequency.exponentialRampToValueAtTime(f, when + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.18, when + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    o.connect(g).connect(this.host.sfxOut);
    o.start(when);
    o.stop(when + 0.15);
  }
}
