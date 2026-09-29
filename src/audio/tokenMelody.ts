/**
 * TOKENS SING THE MELODY (iteration 6, review iter5 fix 8 — Castle Rock's lum trick). Every collected token plays
 * the next note of the song's vocal melody, in time with the record, in the token voice (a bright honky-tonk piano +
 * glass-bell sparkle, `token_*` samples) two octaves over the singer, where it sits above his formants.
 *
 *   const tm = new TokenMelody(song);
 *   tm.pick(beat)          -> { midi, source, beat }   the note a token sounding ON `beat` sings
 *
 * The notes come from the beat map's `tokenMelody` lane (tools/music/original/tokens.py), MEASURED against the record:
 * where the singer sits within 35 cents of the melody note the token DOUBLES it (two octaves up); where he bends
 * between semitones (a blue, speech-like delivery: ~40 % of the verse notes), doubling would sound out of tune, so the
 * lane holds a chord tone a third above instead (HARMONY: it follows the tune's contour and can't rub). Choruses get
 * the same part every time (measured across all four).
 *
 * pick(beat):
 *   1. ON a syllable — a melody note whose onset is within 1/6 beat before .. 1/12 beat (~30 ms, where two identical
 *      attacks still fuse) after the token's beat -> that note (double / the lane's harmony). A second token on the
 *      same syllable turns to a chord tone around it (an ornament: a pianist's two-note figure)
 *   2. AFTER a syllable (iteration 7, review iter6 fix 2) — the token sounds later than 1/12 beat into a sung note (a
 *      jump arc's triplet samples 1/3 beat after the syllable, a held note, a late pickup): it ANSWERS instead of
 *      echoing — a chord tone >= a minor third from the note and the singer, alternating between the two nearest on
 *      consecutive tokens (a fill under the held note). Never his note late: measured, 39 % of the singing tokens were
 *      a 120 ms (triplet) or 1/3+ beat echo of the syllable before (src/audio/lab/tokenprobe.mjs)
 *   (iteration 8) in tag 4 + the outro (ANSWER_ONLY) a syllable is never doubled: his ad-libs get a chord tone
 *   3. between phrases / in the singer's rests: CHORD TONES of the bar's chord in the token register, stepping up one
 *      chord tone per token and turning at the top (ping-pong), starting from the chord tone nearest the last note —
 *      an arpeggio of what the band plays, never a random pitch
 * Timing (StageAudio.onToken): a token picked up early sings ON its own beat (the grid it was laid on); picked up
 * <= 40 ms after its own beat it sings at once AS IF on its beat (a doubling still fuses); later, on the next point of
 * the triplet/swing grid if that is <= 70 ms away (it may land ON the next syllable), else at once — answering.
 */
import type { Lane, TokenNote } from './lanes';
import { type SongDef, chordAt } from './song';

export interface TokenPick {
  /** MIDI note of the token voice */
  midi: number;
  /** melody = doubling / harmonising a sung note (the lane's own mode is on `note`), chord = between phrases */
  source: 'melody' | 'chord';
  beat: number;
  note?: TokenNote;
  /** against the singer: double (his note, two octaves up) · harmony (the lane's chord tone a third off him) · ornament
   *  (a second token on the same syllable) · answer (a token sounding after the syllable began: a chord tone, never
   *  his note late) · chord (between phrases) */
  role?: 'double' | 'harmony' | 'ornament' | 'answer' | 'chord';
}

/** the token voice's range (the token_* samples, C5..A6) */
const TOKEN_LO = 72;
const TOKEN_HI = 93;
/** chord-tone register for the between-phrase arpeggio (E5..E6: the melody's own register two octaves up) */
const CHORD_LO = 76;
const CHORD_HI = 88;
/** a note counts as ON the token's beat from this far before its onset .. */
const EARLY = 1 / 6;
/** .. to this far after it (~30 ms: two identical attacks closer than that fuse into one; later reads as a flam/echo) */
const ON_LATE = 1 / 12;
/** a token sounding up to this far after a syllable's onset (a triplet 8th) ANSWERS it (also any time it is held) */
const LATE = 1 / 3;
/**
 * iteration 8 (review iter7 fix 4): sections where the tokens ANSWER ONLY — never double the singer, even ON a syllable.
 * Croce's tag 4 + outro (edit beats 304-344) are scooped, speech-like ad-libs: a syllable the lane would double sings a
 * chord tone >= a minor third from him instead (`ornament`); the lane's harmony notes (already a third off him) and the
 * late answers stay. (Measured, feel_lvltok_act3: outro doubles 25 % → 12 % of act 3's tokens; the remaining 12 % rubs
 * are ad-libs the lane doesn't hold — he sings where it has a rest or a different note: a lane re-measure, not a rule.)
 */
const ANSWER_ONLY = new Set(['tag4', 'outro']);

export class TokenMelody {
  readonly song: SongDef;
  private readonly lane: Lane<TokenNote>;
  private last = NaN;
  private dir = 1;
  private lastBeat = -Infinity;
  private lastNote: TokenNote | undefined;
  private repeat = 0;

  constructor(song: SongDef) {
    this.song = song;
    this.lane = song.lane('tokenMelody');
  }

  /** the song has a measured token part (else: chord tones everywhere) */
  get hasMelody(): boolean {
    return this.lane.length > 0;
  }

  /** forget the streak (a death / rewind) */
  reset(): void {
    this.last = NaN;
    this.dir = 1;
    this.lastBeat = -Infinity;
    this.lastNote = undefined;
    this.repeat = 0;
  }

  /** the note a token sounding ON `beat` sings (see the file comment) */
  pick(beat: number): TokenPick {
    if (beat - this.lastBeat > 2) this.dir = 1;
    this.lastBeat = beat;
    const on = this.melodyAt(beat);
    const after = on ? undefined : this.sungBefore(beat);
    const n = on ?? after;
    if (n) {
      // a second token on the same sung note: a chord tone around it (ON: the two-note figure; AFTER: alternate answers)
      this.repeat = n === this.lastNote ? this.repeat + 1 : 0;
      this.lastNote = n;
      if (after) {
        const midi = this.answer(n, this.repeat, beat);
        this.last = midi;
        return { midi, source: 'melody', beat, note: n, role: 'answer' };
      }
      // ad-libs (ANSWER_ONLY): never his note — a syllable the lane doubles gets a chord tone clear of him instead (the
      // lane's own harmony notes already sit a third off him)
      if (n.mode !== 'harmony' && ANSWER_ONLY.has(this.song.sectionAt(beat)?.name ?? '')) {
        const midi = this.ornament(n);
        this.last = midi;
        return { midi, source: 'melody', beat, note: n, role: 'answer' };
      }
      const orn = this.repeat % 2 === 1;
      const midi = orn ? this.ornament(n) : n.pitch;
      this.last = midi;
      return { midi, source: 'melody', beat, note: n, role: orn ? 'ornament' : n.mode === 'harmony' ? 'harmony' : 'double' };
    }
    this.lastNote = undefined;
    const midi = this.chordStep(beat);
    this.last = midi;
    return { midi, source: 'chord', beat, role: 'chord' };
  }

  /** the lane note a token ON `beat` sings: an onset in [beat - ON_LATE, beat + EARLY] */
  melodyAt(beat: number): TokenNote | undefined {
    if (!this.hasMelody) return undefined;
    const on = this.lane.between(beat - ON_LATE, beat + EARLY + 1e-6);
    return on.length ? on[on.length - 1] : undefined;
  }

  /** the syllable a token at `beat` comes AFTER: an onset in [beat - LATE, beat - ON_LATE), or a note still held */
  sungBefore(beat: number): TokenNote | undefined {
    if (!this.hasMelody) return undefined;
    const prev = this.lane.prev(beat - ON_LATE + 1e-6);
    if (!prev) return undefined;
    // (a token right as a held note ends still answers it: a chord tone could otherwise land on his pitch as it stops)
    return beat - prev.beat <= LATE + 1e-6 || beat <= prev.endBeat + 1e-6 ? prev : undefined;
  }

  /**
   * An ANSWER to a syllable already sung: the chord tones >= 3 semitones from the note's token pitch and >= 2.4 from the
   * singer as a pitch class (a 3rd..6th off his pitch: consonant against a bend), never the note's own pitch class, the
   * `k`-th token on the same note alternating between the two nearest (above first).
   */
  answer(n: TokenNote, k: number, beat = n.beat): number {
    const song = this.song;
    const pcs = new Set(chordAt(song, n.beat).map((t) => (((song.key.root + t) % 12) + 12) % 12));
    const singer = (n.measured ?? n.sung) + 24;
    // the singer may already be on his NEXT syllable while the answer rings (~0.4 beat): clear of that one too
    const nx = this.lane.next(beat - 1e-6);
    const next = nx && nx !== n && nx.beat < beat + 0.4 ? (nx.measured ?? nx.sung) + 24 : NaN;
    // (down to G#4 under the token range: a blue note bent over the chord can leave nothing above it; never the note's
    // own pitch class, not even an octave off — that is still his syllable, late)
    const pc = (c: number): number => ((c % 12) + 12) % 12;
    const range = (ok: (c: number) => boolean): number[] => {
      const out: number[] = [];
      for (let c = Math.max(TOKEN_LO - 4, n.pitch - 9); c <= Math.min(TOKEN_HI, n.pitch + 9); c++) if (pcs.has(pc(c)) && pc(c) !== pc(n.pitch) && ok(c)) out.push(c);
      return out;
    };
    // clear of the singer as a PITCH CLASS (a 7th / 9th off him is a 2nd's rub against a bending voice): >= 2.4 semitones
    const pcd = (c: number, v: number): number => {
      if (!Number.isFinite(v)) return 12;
      const d = (((c - v) % 12) + 12) % 12;
      return Math.min(d, 12 - d);
    };
    let cands = range((c) => Math.abs(c - n.pitch) >= 3 && pcd(c, singer) >= 2.4 && pcd(c, next) >= 2.4);
    if (cands.length === 0) cands = range((c) => Math.abs(c - n.pitch) >= 3 && pcd(c, singer) >= 2.4);
    if (cands.length === 0) cands = range((c) => Math.abs(c - n.pitch) >= 3 && Math.abs(c - singer) >= 2.4);
    if (cands.length === 0) cands = range(() => true);
    if (cands.length === 0) return this.ornament(n);
    cands.sort((a, b) => Math.abs(a - n.pitch) - (a > n.pitch ? 0.1 : 0) - (Math.abs(b - n.pitch) - (b > n.pitch ? 0.1 : 0)));
    return cands[k % Math.min(2, cands.length)];
  }

  /**
   * The chord tone nearest a note's token pitch that is >= 3 semitones from it and >= 2.4 from what the singer sings
   * (measured, else the transcribed note, two octaves up): consonant with the band and clear of the singer's bends.
   */
  ornament(n: TokenNote): number {
    const song = this.song;
    const pcs = new Set(chordAt(song, n.beat).map((t) => (((song.key.root + t) % 12) + 12) % 12));
    const singer = (n.measured ?? n.sung) + 24;
    let best = n.pitch;
    let bestD = Infinity;
    for (let c = Math.max(TOKEN_LO, n.pitch - 9); c <= Math.min(TOKEN_HI, n.pitch + 9); c++) {
      if (!pcs.has(((c % 12) + 12) % 12) || Math.abs(c - n.pitch) < 3 || Math.abs(c - singer) < 2.4) continue;
      const d = Math.abs(c - n.pitch) - (c > n.pitch ? 0.1 : 0);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  /** the chord-tone ladder: one chord tone further (up, turning at the top) from the last token's note */
  private chordStep(beat: number): number {
    const song = this.song;
    const pcs = new Set(chordAt(song, beat).map((t) => (((song.key.root + t) % 12) + 12) % 12));
    const ladder: number[] = [];
    for (let m = CHORD_LO; m <= CHORD_HI; m++) if (pcs.has(m % 12)) ladder.push(m);
    if (ladder.length === 0) return CHORD_LO;
    if (!Number.isFinite(this.last)) {
      this.dir = 1;
      return ladder[0];
    }
    // continue from the chord tone nearest the last note, one step in the current direction
    let i = 0;
    for (let k = 1; k < ladder.length; k++) if (Math.abs(ladder[k] - this.last) < Math.abs(ladder[i] - this.last)) i = k;
    if (ladder[i] === this.last || Math.abs(ladder[i] - this.last) <= 2) {
      if (i + this.dir < 0 || i + this.dir >= ladder.length) this.dir = -this.dir;
      i += this.dir;
    }
    return ladder[Math.max(0, Math.min(ladder.length - 1, i))];
  }
}

/** grid points for a token that has no authored beat of its own: every triplet 8th and the swung "and" */
export function tokenGrid(beat: number, swing: number): number[] {
  const k = Math.floor(beat);
  const pts = [k, k + 1 / 3, k + swing, k + 1, k + 1 + 1 / 3, k + 1 + swing, k + 2];
  return pts.sort((a, b) => a - b);
}
