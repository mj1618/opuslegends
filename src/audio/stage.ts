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
 *   stage.setCues(cues)                the level's AUDIO CUES (audio/cues.ts levelAudioCues): world sounds ON the
 *                                      music (`at`: the BIG JIM letters, Big Jim, the finale), sounds on a target's
 *                                      smash / miss, and THE HUSH (`hush(from, to)` / stage.hush()): the record is
 *                                      squeezed into the booth horn for the beat before act 3's drop and slams back
 *                                      full-range on it. Scheduled ~2.5 beats ahead on the audio clock (tempo map),
 *                                      re-armed after every rewind, called off on a death.
 *   stage.mechTelegraph(kind, beat)    act 2: the thrown bottle's whistle / the firebomb's whoosh / the bowling ball's
 *   stage.mechFx(kind)                 rumble one beat ahead; bottle smash, firebomb burst, ball hit
 *
 * Iteration 6 ("feel"):
 *   stage.onToken(beat?)               a collected token SINGS the next note of the vocal melody (audio/tokenMelody.ts):
 *                                      ON its own beat if picked up early, else on the next grid point (<= 70 ms) / now.
 *                                      Returns the pick (+ played = false without samples: Sfx.lum is the fallback)
 *   stage.onWhew(e)                    near-miss (game 'whew'): the audience's quick inhale now, and a rising 'ooOOH'
 *                                      swelling into a cheer from the next beat — called off if you die before it
 *   stage.onCanister(e)                a film canister (game 'canister'): lid clank + reel + a glass arpeggio of the chord
 *   stage.onTheEnd(inS?)               (iteration 7) THE END: the iris has shut, the card burns in -> the projector runs
 *                                      out under the pianist's flourish (audio/mix.ts THE_END_SFX). Game event 'theEnd'
 *   stage.onRank(letter, inS?, fin?)   (iteration 7) the rank stamp SLAMS on the poster -> the stamp + the tier's stab +
 *                                      the house's reaction ON the slam, the finale's applause re-levelled to the billing
 *                                      (POSTER_SFX). Game event 'posterStamp' (the renderer owns the ending's clock and
 *                                      emits both `inS` s ahead). A finisher is never billed D (floored at a WARM C)
 *   stage.onPoster(letter)             the poster scene began (Game): remembers the billing; THE END here only if the
 *                                      renderer never sent 'theEnd' (a level without the finale)
 *   stage.onSign(e)                    (iteration 7) the roof sign: a neon letter FLICKERS ON as SLIM (game 'sign'),
 *                                      pitched up the chord; stage.onTease(e): the hero passed under a canister ('tease')
 *   stage.goonHit(part, beat)          a goon playing `part` (audio/goonParts.ts) was smashed: its overlay FLARES and its
 *                                      stinger lands on the part's next hit. Automatic for the level's jabbers (a strike
 *                                      graded on a jabber's beat); `stage.goons` = each jabber beat's part (for the art)
 *
 * In the game: `StageAudio.forGame(audio, conductor)` + `stage.listen(game.events)` (grade / miss / crowd /
 * stumble / death / smash arrive as game events); Game calls setCrowd(value, true) on spawns and onCheckpoint().
 * Other code (art, HUD) can read `stage.combo` or call these directly; everything is idempotent-safe.
 *
 * Levels: audio/mix.ts (BOOTH, OVERLAY_RULES, GRADE_SFX). Everything goes through the master limiter.
 * The "film" (record + overlays) goes through the booth; the audience and the grade sounds are in the
 * theatre (SFX bus), so they stay full-range even when the film sounds thin.
 */
import type { AudioSystem } from './audioSystem';
import { type Booth, type Squeeze, makeSoftClip } from './booth';
import type { Conductor } from './conductor';
import { type AudioCue, type LevelLike, levelAudioCues, levelFirebombs } from './cues';
import { type GoonPart, PART_STEM, goonPartAt, nextPartHit } from './goonParts';
import { type ChorusLift, type LiftSpan, chorusSpans, inChorus, liftAmount } from './lift';
import { BOOTH, FULL_HOUSE, GOON_FLARE, GRADE_SFX, POSTER_SFX, SIGN_SFX, STAGE_BUS, STAGE_SFX, THE_END_SFX, TOKEN_SFX, type PosterLayer, type StageLayer, type StageSound, boothState, dbToGain } from './mix';
import { CHIME_NOTES, NEON_NOTES, SampleBank, TOKEN_NOTES, type SampleId, type SampleVoice } from './samples';
import { type SongDef, chordAt, mtof } from './song';
import { type TokenPick, TokenMelody, tokenGrid } from './tokenMelody';

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
  /** the hush processor on the record (optional: no hush without it) */
  squeeze?: Squeeze;
  /** the chorus lift on the music bus (optional: no lift without it) */
  lift?: ChorusLift;
  /** SFX bus input (the theatre: not filtered by the booth) */
  sfxOut: AudioNode;
  song: SongDef;
  clock: StageClock;
  /** set the overlay stems for a crowd count, gliding from ctx time `when` (instant: ~now, 50 ms) */
  setOverlays(crowd: number, when: number, instant: boolean): void;
  /** flare an overlay stem from ctx time `when` (a smashed goon's part: Conductor.flareStem); optional */
  flareOverlay?(stem: string, when: number, holdSec: number): void;
}

/** The slice of the gameplay event bus (game/events.ts GameEvents) that StageAudio listens to. */
export interface StageEventSource {
  on(type: 'grade', fn: (e: { grade: 'perfect' | 'great' | 'good'; beat: number; combo: number; verb?: 'jump' | 'strike' }) => void): unknown;
  on(type: 'miss', fn: (e: { beat: number; failKind: string }) => void): unknown;
  on(type: 'crowd', fn: (e: { value: number }) => void): unknown;
  on(type: 'stumble', fn: (e: { beat: number }) => void): unknown;
  on(type: 'death', fn: (e: { beat: number }) => void): unknown;
  on(type: 'smash', fn: (e: { beat: number }) => void): unknown;
}

/** iteration 6's events (game/events.ts 'whew' / 'canister'), read loosely: the audio never needs more than these */
export interface WhewLike {
  kind?: string;
  beat?: number;
  ms?: number;
}
export interface CanisterLike {
  beat?: number;
  index?: number;
}
export type PosterLetter = keyof typeof POSTER_SFX;
/** iteration 7's roof sign (game/events.ts 'sign'), read loosely */
export interface SignLike {
  index?: number;
  letter?: string;
  beat?: number;
}

/** one collected token's timing decision (stage.tokenTrace; measured by src/audio/lab/tokenprobe.mjs) */
export interface TokenTrace {
  /** the token's authored beat (null: a spilled token) */
  own: number | null;
  /** the music's beat when it was picked up (graph beat) */
  pickupBeat: number;
  /** the beat its note sounds on */
  sound: number;
  /** own = ON its own beat (picked up early), fused = now, <= TOKEN_SFX.fuseSec after its own beat (sung as if on it),
   *  grid = the next grid point, now = at once (late, no grid point close) */
  timing: 'own' | 'fused' | 'grid' | 'now';
  midi: number;
  /** what it played against the singer (TokenMelody.pick role) */
  role: string;
  /** the sung note under it (null: between phrases) and how late the token sounds after that note's onset */
  noteBeat: number | null;
  notePitch: number | null;
  lagMs: number | null;
}

/** how far ahead (beats) `at` / `hush` cues are put on the audio clock */
const CUE_LOOKAHEAD = 2.5;

export class StageAudio {
  readonly host: StageHost;
  readonly samples: SampleBank;
  /** consecutive Perfect/Great presses (the bell climbs the chord); reset by a miss, stumble or death */
  combo = 0;
  private crowd = 0;
  private fullHouseArmed = true;
  private lastCheerBeat = -Infinity;
  private lastBoothKey = '';
  /** the chorus lift's spans from the level's `speed` items (null: none, use the song's chorus sections) */
  private levelSpans: LiftSpan[] | null = null;
  /** the level's audio cues (sorted by start beat) */
  private cues: AudioCue[] = [];
  /** `at` / `hush` cues are scheduled up to this beat */
  private horizon = -Infinity;
  private lastTick = -Infinity;
  /** cue sounds on the clock (called off / faded on a death or a rewind) */
  private voices: SampleVoice[] = [];
  /** smash cues already sounded this pass (a strike's grade and its smash both report it) */
  private reacted = new Set<number>();
  /** thrown-object arrival beats whose telegraph is the firebomb whoosh (the rest whistle) */
  private firebombs = new Set<number>();
  /** the token voice's melody (iteration 6) */
  readonly tokens: TokenMelody;
  /** the level's goons (jabber beats) -> the part each plays (audio/goonParts.ts goonPartAt; the art reads this too) */
  readonly goons = new Map<number, GoonPart>();
  /** the last 64 tokens sung (debug / tests: `__game.game.stage.tokenLog`) */
  readonly tokenLog: (TokenPick & { played: boolean })[] = [];
  /** the finale's curtain-call applause voices (the poster re-levels them) */
  private applause: SampleVoice[] = [];
  /** `at` cues whose `tag` is here stay silent (a found canister's tease) */
  readonly skipTags = new Set<string>();
  /** canister tags found since the last checkpoint (a death before the next one un-finds them: Game restores them) */
  private foundSinceCheckpoint: string[] = [];
  /** the ending (iteration 7): THE END played this run / the billing and whether the run finished ('finish' / onPoster) */
  private theEndDone = false;
  private rankDone = false;
  private billing: string | undefined;
  private finisher = true;
  /** ctx time of the final hit (the finale cue), and the ending's stings as played: `sinceHit` s (tests / tokenprobe) */
  private finaleCtx = NaN;
  readonly endingLog: { cue: string; letter?: string; at: number; sinceHit: number }[] = [];

  /** the stage sounds' bus: soft clip (STAGE_BUS) -> the SFX bus */
  private readonly cueOut: AudioNode;

  constructor(host: StageHost) {
    this.host = host;
    this.samples = new SampleBank(host.ctx);
    const clip = makeSoftClip(host.ctx, STAGE_BUS.clipDb);
    clip.output.connect(host.sfxOut);
    this.cueOut = clip.input;
    this.tokens = new TokenMelody(host.song);
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
    // the hush squeezes the record and the stomps/claps stem; the cowbell and shouts overlays stay dry
    c.inserts = { record: audio.squeeze.input, stomps: audio.squeeze.input };
    const stage = new StageAudio({
      ctx: audio.ctx,
      booth: audio.booth,
      squeeze: audio.squeeze,
      lift: audio.lift,
      sfxOut: audio.sfx,
      song: c.song,
      clock,
      setOverlays: (n, when, instant) => c.setCrowdLevel(n, instant, when),
      flareOverlay: (stem, when, holdSec) => void c.flareStem(stem, when, GOON_FLARE.db, holdSec, holdSec),
    });
    c.onBeat((b) => stage.beatTick(b));
    // the chorus lift: its whole envelope goes on the audio clock every time the music (re)starts
    c.onPlay((b) => stage.armLift(b));
    // a pause / quit cuts the music: call off the cue sounds and the hush already on the clock (they re-arm when it
    // plays again). The end screen's fade keeps them (the finale's applause outlives the music).
    c.onStop((mode) => mode === 'cut' && stage.resetSchedule());
    void stage.load();
    return stage;
  }

  /**
   * Subscribe to the gameplay's event bus (game/events.ts): grades, misses of REWARD targets (a missed
   * threat already sounds as its stumble / death), the crowd meter, stumbles and deaths.
   */
  listen(events: StageEventSource): void {
    events.on('grade', (e) => {
      this.onGrade(e.grade, e.beat, e.combo);
      // a graded strike ON a smash cue's target: its sound goes on the PRESS (quantized like the bells), not on the
      // hitbox contact a frame or three later (the KRAK must land on the fill's tom)
      if (e.verb !== 'jump') {
        this.onSmash(e.beat);
        this.onGoonStruck(e.beat);
      }
    });
    events.on('miss', (e) => {
      if (e.failKind === 'none') this.onMiss(e.beat);
      else this.combo = 0;
    });
    events.on('crowd', (e) => this.setCrowd(e.value));
    events.on('stumble', () => this.onStumble());
    events.on('death', () => this.onDeath());
    events.on('smash', (e) => this.onSmash(e.beat));
    events.on('miss', (e) => this.onTargetMissed(e.beat));
    // iteration 6 (game/events.ts): the near-miss and the film canisters
    const loose = events as unknown as { on(type: string, fn: (e: unknown) => void): unknown };
    loose.on('whew', (e) => this.onWhew(e as WhewLike));
    loose.on('canister', (e) => this.onCanister(e as CanisterLike));
    // iteration 7: the ending's two picture beats (emitted by the renderer, `inS` ahead), the finisher's billing, the
    // roof sign's letters, the canister tease
    loose.on('theEnd', (e) => this.onTheEnd((e as { inS?: number }).inS ?? 0));
    loose.on('posterStamp', (e) => {
      const p = e as { inS?: number; letter?: string };
      this.onRank(p.letter ?? this.billing ?? 'B', p.inS ?? 0, this.finisher);
    });
    loose.on('finish', (e) => {
      const f = e as { rank?: { letter?: string }; finisher?: boolean };
      this.finisher = f.finisher ?? true;
      if (f.rank?.letter) this.billing = f.rank.letter;
    });
    loose.on('sign', (e) => this.onSign(e as SignLike));
    loose.on('tease', (e) => this.onTease(e as { beat?: number }));
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
      // a spawn / rewind: whatever the cues put on the clock belongs to the old timeline
      if (instant) {
        this.resetSchedule();
        this.resetEnding();
      }
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
      // (a level cheer on that downbeat — act 3's drop, the finale — already brings the house down)
      const cheerCue = this.cues.some((c) => c.type === 'at' && (c.sound === 'dropCheer' || c.sound === 'finale') && Math.abs(c.beat - bar.beat) <= 1);
      if (!cheerCue) this.play('crowd_cheer_swell', bar.when, GRADE_SFX.cheerDb, { align: true });
      this.lastCheerBeat = Number.isFinite(bar.beat) ? bar.beat : this.lastCheerBeat;
    }
    if (count <= FULL_HOUSE - 4) this.fullHouseArmed = true;
  }

  /**
   * Per music beat (Conductor.onBeat): at FULL HOUSE the audience cheers into the vocal gaps — a swell
   * starting on the phrase's last beat when the singer rests ≥ 1.5 beats (at most one per 2 bars).
   */
  beatTick(beat: number): void {
    this.scheduleCues(beat);
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
    this.tokens.reset();
    for (const t of this.foundSinceCheckpoint) this.skipTags.delete(t);
    this.foundSinceCheckpoint = [];
    this.resetSchedule();
    // the groan: the ooh a touch lower (0.94 = -1 st; it was 0.78 = -4.3 st, a slowed-down "demon" groan) and darker
    this.play('crowd_ooh', this.host.clock.now() + 0.05, GRADE_SFX.groanDb, { rate: GRADE_SFX.groanRate, lp: 1600 });
  }

  /** Checkpoint: projector changeover — a click on the next beat and the cue-dot flare. */
  onCheckpoint(): void {
    this.foundSinceCheckpoint = [];
    const g = this.nextGrid(1, 0.01);
    if (!this.play('film_snap', g.when, GRADE_SFX.clickDb, { lp: 5000 })) this.synthThunk(g.when, 1800);
    this.play('burn_flare', g.when, GRADE_SFX.flareDb, { align: true });
  }

  // ------------------------------------------------------------------ the chorus lift (audio/lift.ts)

  /**
   * The chorus lift's spans: the level's chorus SPEED zones (`speed` items: the gameplay's chorus speed-up, same
   * edges and ramps) when it has them, else the song's `chorus*` sections; one that starts on a hush's release (act 3's
   * drop) steps in ON the downbeat instead of ramping through the hush.
   */
  get liftSpans(): LiftSpan[] {
    const hushEnds = this.cues.filter((c) => c.type === 'hush').map((c) => (c as { to: number }).to);
    return (this.levelSpans ?? chorusSpans(this.host.song)).map((s) => (hushEnds.some((t) => Math.abs(t - s.from) < 0.25) ? { ...s, rampIn: 0 } : s));
  }

  /** 0 (rest) .. 1 (full chorus lift) at `beat`; `inChorus` = a chorus section (the gameplay's flag uses the same spans) */
  liftAt(beat: number): number {
    return liftAmount(this.liftSpans, beat);
  }

  inChorus(beat: number): boolean {
    return inChorus(this.liftSpans, beat);
  }

  /** (Re)schedule the chorus lift on the audio clock: the music (re)started at `fromBeat` (Conductor.onPlay). */
  armLift(fromBeat: number): void {
    const lift = this.host.lift;
    if (!lift) return;
    lift.schedule(this.liftSpans, fromBeat, (b) => this.host.clock.ctxAtBeat(b));
  }

  // ------------------------------------------------------------------ level audio cues (audio/cues.ts)

  /** Replace the level's audio cues (Game: `stage.setCues(levelAudioCues(levelDef, song))`). */
  setCues(cues: readonly AudioCue[], mech: { firebombs?: number[] } = {}): void {
    this.resetSchedule();
    this.cues = [...cues].sort((a, b) => cueStart(a) - cueStart(b));
    this.firebombs = new Set((mech.firebombs ?? []).map((b) => Math.round(b * 100)));
    // a hush may change how a chorus steps in: re-arm the lift if the music is playing
    const gb = this.host.clock.graphBeat();
    if (Number.isFinite(gb)) this.armLift(gb);
  }

  /** The level's audio: its cues (audio/cues.ts levelAudioCues) + the act-2 mechanics' telegraph voices. */
  useLevel(def: LevelLike, song: SongDef): void {
    const zones = (def.items as { type?: string; from?: number; to?: number; rampIn?: number; rampOut?: number }[]).filter((it) => it.type === 'speed' && typeof it.from === 'number' && typeof it.to === 'number');
    this.levelSpans = zones.length ? zones.map((z) => ({ from: z.from as number, to: z.to as number, rampIn: z.rampIn ?? 1, rampOut: z.rampOut ?? 1 })).sort((a, b) => a.from - b.from) : null;
    this.setCues(levelAudioCues(def, song), { firebombs: levelFirebombs(def) });
    // the goons: every jabber plays a part of the song (the art animates it on that part's hits)
    this.goons.clear();
    for (const it of def.items as { type?: string; beat?: number }[]) {
      if (it.type === 'jabber' && typeof it.beat === 'number') this.goons.set(Math.round(it.beat * 100), goonPartAt(song, it.beat));
    }
  }

  /** the cues in effect (read-only) */
  get audioCues(): readonly AudioCue[] {
    return this.cues;
  }

  /**
   * THE HUSH: squeeze the record into the booth horn from beat `from`, release to full range ON beat `to` (e.g.
   * `hush(270.95, 271.95)`: the beat before act 3's drop). A persistent cue: it replays after every rewind.
   */
  hush(from: number, to: number, db?: number): void {
    this.setCues([...this.cues, { type: 'hush', from, to, db }]);
  }

  /** the level ends on the finale stack (Game skips its own finish jingle) */
  get hasFinale(): boolean {
    return this.cues.some((c) => c.type === 'at' && c.sound === 'finale');
  }

  /** Call off everything the cues put on the clock (future: never starts; sounding: 60 ms fade) and re-arm. */
  resetSchedule(): void {
    const now = this.ctx.currentTime;
    for (const v of this.voices) {
      if (v.end <= now) continue;
      try {
        if (v.start > now + 0.002) v.src.stop();
        else {
          v.gain.gain.cancelScheduledValues(now);
          v.gain.gain.setValueAtTime(v.gain.gain.value, now);
          v.gain.gain.linearRampToValueAtTime(0, now + 0.06);
          v.src.stop(now + 0.07);
        }
      } catch {
        /* already stopped */
      }
    }
    this.voices = [];
    this.reacted.clear();
    this.host.squeeze?.cancel();
    this.horizon = -Infinity;
    this.lastTick = -Infinity;
  }

  /** per music beat: put the `at` / `hush` cues of the next CUE_LOOKAHEAD beats on the audio clock */
  private scheduleCues(beat: number): void {
    if (beat < this.lastTick - 0.5) this.resetSchedule(); // the music jumped back without a spawn
    this.lastTick = beat;
    if (this.cues.length === 0) return;
    const from = Math.max(this.horizon, beat - 0.02);
    const to = beat + CUE_LOOKAHEAD;
    if (to <= from) return;
    this.horizon = to;
    const { clock } = this.host;
    for (const c of this.cues) {
      const st = cueStart(c);
      if (st < from) continue;
      if (st >= to) break;
      if (c.type === 'hush') {
        const a = clock.ctxAtBeat(c.from);
        const b = clock.ctxAtBeat(c.to);
        if (Number.isFinite(a) && Number.isFinite(b)) this.host.squeeze?.schedule(a, b, c.db);
      } else if (c.type === 'at' && !(c.tag && this.skipTags.has(c.tag))) {
        this.playSound(c.sound, c.beat, false, true, c.rate);
        if (c.sound === 'finale') this.finaleCtx = clock.ctxAtBeat(c.beat);
      }
    }
    const now = this.ctx.currentTime;
    if (this.voices.length > 24) this.voices = this.voices.filter((v) => v.end > now);
  }

  /**
   * A breakable burst (game `smash` event) or a strike graded on its beat (whichever comes first): its onSmash cue,
   * on the beat if the press was early (≤ 150 ms), else right away. Once per target per pass.
   */
  onSmash(beat: number): void {
    for (const c of this.cues) {
      if (c.type !== 'onSmash' || Math.abs(c.beat - beat) >= 0.03) continue;
      const key = Math.round(c.beat * 100);
      if (this.reacted.has(key)) continue;
      this.reacted.add(key);
      this.playSound(c.sound, c.beat, true);
    }
  }

  /** a strike target passed unhit (game `miss` event): its onMiss cue */
  onTargetMissed(beat: number): void {
    for (const c of this.cues) if (c.type === 'onMiss' && Math.abs(c.beat - beat) < 0.03) this.playSound(c.sound, c.beat, true);
  }

  /**
   * Act 2's telegraphs (Mechanics → Game host), called 1 beat before an arrival: `beat` = the telegraph beat. The
   * thrown bottle whistles down its arc, a firebomb whooshes, a bowling ball rumbles in. False = no samples (use
   * the synth placeholder).
   */
  mechTelegraph(kind: 'whistle' | 'rumble', beat: number): boolean {
    const sound: StageSound = kind === 'rumble' ? 'ballRumble' : this.firebombs.has(Math.round((beat + 1) * 100)) ? 'firebombWhoosh' : 'bottleWhistle';
    return this.playSound(sound, beat, false, false);
  }

  /** Act 2's impacts, now: a bottle bursting, a firebomb going up, the ball hitting the hero. */
  mechFx(kind: string): boolean {
    const sound: StageSound | null = kind === 'shatter' ? 'bottleSmash' : kind === 'ignite' ? 'firebombBurst' : kind === 'ballHit' ? 'ballHit' : null;
    if (!sound) return false;
    const now = this.host.clock.now();
    let ok = false;
    for (const l of STAGE_SFX[sound] as StageLayer[]) ok = !!this.layer(l, now, false) || ok;
    return ok;
  }

  /**
   * Play a STAGE_SFX stack whose beat-0 is `beat` (tempo-mapped; each layer at its own beat offset). `react` = a
   * gameplay reaction (a smash / miss): on the beat if that is ≤ 150 ms away, else right now (layers keep their
   * spacing). Returns true if anything played.
   */
  playSound(sound: StageSound, beat: number, react: boolean, track = true, rate = 1): boolean {
    const layers = STAGE_SFX[sound] as StageLayer[] | undefined;
    if (!layers) return false;
    const { clock } = this.host;
    const now = clock.now();
    const t0 = clock.ctxAtBeat(beat);
    let shift = 0;
    if (react) {
      if (!Number.isFinite(t0) || t0 < now || t0 - now > 0.15) shift = now - (Number.isFinite(t0) ? t0 : now);
    }
    let ok = false;
    for (const l of layers) {
      const t = Number.isFinite(t0) ? clock.ctxAtBeat(beat + (l.beats ?? 0)) + shift : now;
      if (!react && t < now - 0.005) continue; // stale: never late on the music
      const v = this.layer(rate === 1 ? l : { ...l, rate: (l.rate ?? 1) * rate }, Math.max(t, now), track);
      ok = !!v || ok;
    }
    return ok;
  }

  private layer(l: StageLayer, when: number, track: boolean): SampleVoice | null {
    const v = this.samples.playNode(l.id, this.cueOut, when, { gain: dbToGain(l.db), rate: l.rate, lp: l.lp, align: l.align });
    if (v && track) this.voices.push(v);
    if (v && l.id === 'crowd_applause_long') {
      const now = this.ctx.currentTime;
      this.applause = [...this.applause.filter((a) => a.end > now), v];
    }
    return v;
  }

  // ------------------------------------------------------------------ iteration 6: tokens, WHEW, canisters, poster, goons

  /**
   * A token collected: it SINGS (audio/tokenMelody.ts). `beat` = the token's own beat (its authored position, snapped to
   * the triplet/swing grid point within TOKEN_SFX.snapBeats): picked up early (<= TOKEN_SFX.earlySec) it sounds ON that beat; otherwise on the next triplet/swing grid point if that
   * is <= TOKEN_SFX.lateSec away, else now. `played` false = no samples (the caller's synth fallback).
   */
  onToken(beat?: number): TokenPick & { played: boolean; when: number } {
    const { clock, song } = this.host;
    const now = clock.now();
    const gb = clock.graphBeat();
    let q = Number.isFinite(gb) ? gb : (beat ?? 0);
    let when = now;
    let timing: TokenTrace['timing'] = 'now';
    // a token laid a hair off the grid (a jump arc's samples) sings on the grid point it sits on
    const snapped = beat !== undefined ? tokenGrid(beat - 0.5, song.swing).reduce((a, b) => (Math.abs(b - beat) < Math.abs(a - beat) ? b : a)) : NaN;
    const own = Number.isFinite(snapped) && Math.abs(snapped - (beat as number)) <= TOKEN_SFX.snapBeats ? snapped : beat;
    const at = own !== undefined ? clock.ctxAtBeat(own) : NaN;
    let pickAt = NaN;
    if (Number.isFinite(at) && at >= now && at - now <= TOKEN_SFX.earlySec) {
      q = own as number;
      when = at;
      timing = 'own';
    } else if (Number.isFinite(at) && at < now && now - at <= TOKEN_SFX.fuseSec) {
      // picked up just after its own beat: sing NOW as if on it (a doubling <= fuseSec late still fuses with the singer)
      pickAt = own as number;
      timing = 'fused';
    } else if (Number.isFinite(gb)) {
      for (const p of tokenGrid(gb, song.swing)) {
        const t = clock.ctxAtBeat(p);
        if (t >= now + 0.002) {
          if (t - now <= TOKEN_SFX.lateSec) {
            q = p;
            when = t;
            timing = 'grid';
          }
          break;
        }
      }
    }
    const pick = this.tokens.pick(Number.isFinite(pickAt) ? pickAt : q);
    const [sm, id] = TOKEN_NOTES.reduce((a, b) => (Math.abs(b[0] - pick.midi) < Math.abs(a[0] - pick.midi) ? b : a));
    const played = this.play(id, when, TOKEN_SFX.db, { rate: Math.pow(2, (pick.midi - sm) / 12), align: true });
    this.tokenLog.push({ ...pick, played });
    if (this.tokenLog.length > 64) this.tokenLog.shift();
    this.traceToken(beat, gb, q, timing, pick);
    return { ...pick, played, when };
  }

  /** the whole run's token decisions (measurement: src/audio/lab/tokenprobe.mjs reads `stage.tokenTrace`) */
  readonly tokenTrace: TokenTrace[] = [];

  private traceToken(own: number | undefined, gb: number, q: number, timing: TokenTrace['timing'], p: TokenPick): void {
    if (this.tokenTrace.length >= 4000) return;
    const k = this.host.clock;
    const spb = k.secondsPerBeat(q);
    // the sung onset this token sits against: the latest note starting at or before its sound (+ 1/6 beat of anticipation)
    const n = this.tokens.hasMelody ? this.host.song.lane('tokenMelody').prev(q + 1 / 6 + 1e-6) : undefined;
    const sounding = !!n && q < (n.endBeat ?? n.beat) + 1e-6;
    const r3 = (x: number): number => Math.round(x * 1000) / 1000;
    this.tokenTrace.push({
      own: own === undefined ? null : r3(own),
      pickupBeat: r3(gb),
      sound: r3(q),
      timing,
      midi: p.midi,
      role: p.role ?? p.source,
      noteBeat: n && sounding ? r3(n.beat) : null,
      notePitch: n && sounding ? n.pitch : null,
      lagMs: n && sounding ? Math.round((q - n.beat) * spb * 1000) : null,
    });
  }

  /**
   * Near-miss (game 'whew'): the audience's quick inhale NOW, then the relief — a rising 'ooOOH' that swells into a
   * cheer — from the next beat (tracked: a death before it calls it off).
   */
  onWhew(_e: WhewLike = {}): void {
    const now = this.host.clock.now();
    for (const l of STAGE_SFX.whewGasp as StageLayer[]) this.layer(l, now, false);
    const nb = this.nextGrid(1, 0.12);
    for (const l of STAGE_SFX.whewRelief as StageLayer[]) this.layer(l, nb.when, true);
  }

  /** A film canister found: its sting (the chord's arpeggio) on the next swung 8th (<= ~0.2 s), else now. Its tease goes quiet. */
  onCanister(e: CanisterLike = {}): void {
    const { clock, song } = this.host;
    if (typeof e.index === 'number') {
      const tag = `canister${e.index}`;
      if (!this.skipTags.has(tag)) this.foundSinceCheckpoint.push(tag);
      this.skipTags.add(tag);
    }
    const g = this.nextGrid(0.5, 0.01);
    const when = g.when - clock.now() < 0.22 ? g.when : clock.now();
    const b = Number.isFinite(g.beat) ? g.beat : (e.beat ?? 0);
    const root = ((((song.key.root + chordAt(song, b)[0]) % 12) + 12) % 12);
    const sound: StageSound = root === 9 ? 'canisterA' : root === 11 ? 'canisterB' : 'canisterE';
    for (const l of STAGE_SFX[sound] as StageLayer[]) this.layer(l, when, false);
  }

  /** the hero passed UNDER a hidden canister (game 'tease'): the glint answers, falling, on the next swung 8th */
  onTease(_e: { beat?: number } = {}): void {
    const g = this.nextGrid(0.5, 0.01);
    const now = this.host.clock.now();
    const when = g.when - now < 0.22 ? g.when : now;
    const spb = Number.isFinite(g.beat) ? this.host.clock.secondsPerBeat(g.beat) : 0.37;
    for (const l of STAGE_SFX.canisterTease as StageLayer[]) this.layer(l, when + (l.beats ?? 0) * spb, false);
  }

  /**
   * THE ROOF SIGN (game 'sign'): letter `index` of the neon flickers ON (relay clunk + the tube buzzing at pitch): the
   * chord's tones upward from its root, one per letter. ON the strike's beat when the press was early (<= 150 ms), else now.
   */
  onSign(e: SignLike): void {
    const { clock, song } = this.host;
    const beat = typeof e.beat === 'number' ? e.beat : clock.graphBeat();
    const pcs = chordAt(song, Number.isFinite(beat) ? beat : 0).map((t) => (((song.key.root + t) % 12) + 12) % 12);
    // the chord's tones from its root upward, from A3 (the sampled register: A3 C#4 E4 G4 on the roof's A7)
    const root = pcs[0];
    const ladder: number[] = [];
    for (let m = 55; m < 80 && ladder.length < 4; m++) if (pcs.includes(m % 12) && (ladder.length > 0 || m % 12 === root)) ladder.push(m);
    const midi = ladder[Math.max(0, Math.min(ladder.length - 1, e.index ?? 0))] ?? 57;
    const [sm, id] = NEON_NOTES.reduce((a, b) => (Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a));
    const now = clock.now();
    const at = Number.isFinite(beat) ? clock.ctxAtBeat(beat) : NaN;
    const when = Number.isFinite(at) && at > now && at - now < 0.15 ? at : now;
    this.play(id, when, SIGN_SFX.db, { rate: Math.pow(2, (midi - sm) / 12), align: true });
  }

  /**
   * THE END (game 'theEnd', from the renderer: the iris has shut, the card burns in, `inS` s from now): the projector
   * runs the leader out under the pianist's flourish. Once per run.
   */
  onTheEnd(inS = 0): void {
    if (this.theEndDone) return;
    this.theEndDone = true;
    const t0 = this.host.clock.now() + Math.max(0, inS);
    this.posterLayers(THE_END_SFX, t0);
    this.endingLog.push({ cue: 'theEnd', at: t0, sinceHit: Math.round((t0 - this.finaleCtx) * 1000) / 1000 });
  }

  /**
   * THE BILLING (game 'posterStamp', from the renderer: the rank stamp slams `inS` s from now): the stamp's thump + the
   * tier's piano stab ON the slam + the house's reaction, and the finale's curtain-call applause re-levelled to the
   * billing. A finisher is never billed D: floored at C (warm). Once per run.
   */
  onRank(letter: string, inS = 0, finisher = true): void {
    if (this.rankDone) return;
    this.rankDone = true;
    let L = (letter in POSTER_SFX ? letter : 'B') as PosterLetter;
    if (finisher && L === 'D') L = 'C';
    const tier = POSTER_SFX[L];
    const t0 = this.host.clock.now() + Math.max(0, inS);
    this.posterLayers(tier.layers, t0);
    this.endingLog.push({ cue: 'rank', letter: L, at: t0, sinceHit: Math.round((t0 - this.finaleCtx) * 1000) / 1000 });
    const g = dbToGain(tier.applauseDb);
    const now = this.ctx.currentTime;
    for (const v of this.applause) {
      if (v.end <= now) continue;
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      // the house answers the billing with the stamp: swell (S) or settle over ~0.6 s from the slam
      v.gain.gain.setTargetAtTime(v.gain.gain.value * g, Math.max(now, t0 + 0.05), 0.2);
    }
  }

  /**
   * The poster scene began (Game, scene 'end'): remembers the billing. The renderer sends 'theEnd' / 'posterStamp' (the
   * picture's clock); THE END plays here only when it never came (a level without the finale's iris).
   */
  onPoster(letter: string): void {
    this.billing = letter;
    if (!this.theEndDone) this.onTheEnd(0);
  }

  /** a new run: the ending can play again (Game respawns reset the crowd instantly) */
  private resetEnding(): void {
    this.theEndDone = false;
    this.rankDone = false;
    this.finisher = true;
  }

  private posterLayers(layers: readonly PosterLayer[], t0: number): void {
    for (const l of layers) this.play(l.id, t0 + l.at, l.db, { align: l.align });
  }

  /** a strike graded on a goon's beat: that goon's part flares */
  private onGoonStruck(beat: number): void {
    const part = this.goons.get(Math.round(beat * 100));
    if (part) this.goonHit(part, beat);
  }

  /**
   * A goon playing `part` was smashed on `beat`: the part's overlay FLARES (+6 dB for a beat, audible even at a low crowd)
   * and the goon's stinger lands ON the part's next hit (<= 1 beat away; else the next beat).
   */
  goonHit(part: GoonPart, beat: number): void {
    const { clock, song } = this.host;
    const now = clock.now();
    const gb = clock.graphBeat();
    const from = Number.isFinite(gb) ? gb : beat;
    const hit = nextPartHit(song, part, from + 0.02, 1);
    const hb = hit ? hit.beat : Math.ceil(from + 0.02);
    const when = Number.isFinite(gb) ? clock.ctxAtBeat(hb) : now;
    const spb = clock.secondsPerBeat(hb);
    const stem = PART_STEM[part];
    if (stem) this.host.flareOverlay?.(stem, when - 0.01, GOON_FLARE.holdBeats * (Number.isFinite(spb) ? spb : 0.37));
    const sound = `goon${part[0].toUpperCase()}${part.slice(1)}` as StageSound;
    for (const l of (STAGE_SFX[sound] ?? []) as StageLayer[]) {
      const t = Number.isFinite(gb) ? clock.ctxAtBeat(hb + (l.beats ?? 0)) : now;
      this.layer(l, Math.max(now, t), true);
    }
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

const cueStart = (c: AudioCue): number => (c.type === 'hush' ? c.from : c.beat);
