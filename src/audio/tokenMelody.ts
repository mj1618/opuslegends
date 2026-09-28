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
 *   1. a melody note whose onset is within 1/6 beat before .. 1/3 beat after the token's beat -> that note (a token
 *      ON a sung syllable sings it); else a note still sounding at `beat` -> it again (the singer holds it). A second
 *      token on the same note turns to a chord tone around it (>= 3 semitones from the note and the singer) and the
 *      third back: a pianist's two-note figure, so a row of tokens moves with the tune instead of hammering one pitch
 *   2. between phrases / in the singer's rests: CHORD TONES of the bar's chord in the token register, stepping up one
 *      chord tone per token and turning at the top (ping-pong), starting from the chord tone nearest the last note —
 *      an arpeggio of what the band plays, never a random pitch
 * Timing (StageAudio.onToken): a token picked up early sings ON its own beat (the grid it was laid on); a late or
 * loose token sings on the next point of the triplet/swing grid if that is <= 70 ms away, else at once.
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
}

/** the token voice's range (the token_* samples, C5..A6) */
const TOKEN_LO = 72;
const TOKEN_HI = 93;
/** chord-tone register for the between-phrase arpeggio (E5..E6: the melody's own register two octaves up) */
const CHORD_LO = 76;
const CHORD_HI = 88;
/** a note counts as ON the token's beat from this far before its onset .. */
const EARLY = 1 / 6;
/** .. to this far after it (a triplet 8th) */
const LATE = 1 / 3;

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
    const n = this.melodyAt(beat);
    if (beat - this.lastBeat > 2) this.dir = 1;
    this.lastBeat = beat;
    if (n) {
      // a second token on the same sung note (the singer holds / recites it): turn to a chord tone around it and back
      // (a pianist's two-note figure), so a row of tokens moves instead of hammering one pitch
      this.repeat = n === this.lastNote ? this.repeat + 1 : 0;
      this.lastNote = n;
      const midi = this.repeat % 2 === 1 ? this.ornament(n) : n.pitch;
      this.last = midi;
      return { midi, source: 'melody', beat, note: n };
    }
    this.lastNote = undefined;
    const midi = this.chordStep(beat);
    this.last = midi;
    return { midi, source: 'chord', beat };
  }

  /** the lane note for a token ON `beat`: an onset in [beat - LATE, beat + EARLY], else one still sounding */
  melodyAt(beat: number): TokenNote | undefined {
    if (!this.hasMelody) return undefined;
    const on = this.lane.between(beat - LATE, beat + EARLY + 1e-6);
    if (on.length) return on[on.length - 1];
    const prev = this.lane.prev(beat);
    return prev && beat < prev.endBeat - 1e-6 ? prev : undefined;
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
