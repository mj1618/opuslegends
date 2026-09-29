/**
 * THE RANK (iteration 6, review iter5 fix 10: the replay hook): the poster's letter + billing tier, from how the run
 * SOUNDED (time out of the booth + FULL HOUSE time), how it was PLAYED (grade mix), what it COLLECTED (tokens) and how
 * often it FELL (deaths) — plus the hidden film canisters, the only way past a flawless A to an S.
 *
 *   crowd    27  = 9 × (1 − booth time) + 18 × min(1, FULL HOUSE beats / fullHouseRef)
 *   timing   27  = 27 × (Perfect + 0.6 Great + 0.4 Good) / (all graded + misses)   (iteration 7: Good 0.25 → 0.4)
 *   tokens   18  = 18 × tokens / tokens in play
 *   deaths   18  = 18 × max(0, 1 − deaths / deathsZero)
 *   canisters 10 = 10 × found / in play            (a flawless run without them scores ~90: an A)
 *
 * Pure function (the poster, the report and the tests all call it). Thresholds: `RANKS` (score ≥ min).
 *
 * Iteration 7 (review iter6 fix 4, the peak-end): a run that REACHES THE END never gets a D — it floors at C (B-MOVIE);
 * D (STRAIGHT TO VIDEO) is only for a run that didn't finish (walked out). `finisher` says which; `floored` = the floor
 * lifted it; `next` = the next billing up and the points it needs (the poster's replay pointer), with where they'd
 * most cheaply come from (`hint`: 'canisters' while any are unfound, else the weakest part).
 */
export interface RankInput {
  runBeats: number;
  boothBeats: number;
  fullHouseBeats: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
  tokens: number;
  tokensTotal: number;
  deaths: number;
  canisters: number;
  canistersTotal: number;
  finished: boolean;
}

export interface RunRank {
  /** 'S' | 'A' | 'B' | 'C' | 'D' */
  letter: string;
  /** the billing tier stamped on the poster */
  tier: string;
  /** 0..100 */
  score: number;
  parts: { crowd: number; timing: number; tokens: number; deaths: number; canisters: number };
  /** the run reached the end (iteration 7): a finisher is never billed below C */
  finisher: boolean;
  /** the finisher floor lifted the letter (the raw score was a D) */
  floored: boolean;
  /** the next billing up: its letter / tier, the score it needs and how many points short this run was; null at S */
  next: { letter: string; tier: string; min: number; need: number; hint: 'canisters' | 'crowd' | 'timing' | 'tokens' | 'deaths' } | null;
}

/** FULL HOUSE beats worth the crowd score's full FULL HOUSE part (a clean run holds ~160 of 340) */
const FULL_HOUSE_REF = 150;
/** deaths at which the deaths score is gone */
const DEATHS_ZERO = 5;

export const RANKS: readonly { letter: string; tier: string; min: number }[] = [
  { letter: 'S', tier: 'BOX-OFFICE SMASH', min: 92 },
  { letter: 'A', tier: 'CRITICS’ PICK', min: 85 },
  { letter: 'B', tier: 'CULT CLASSIC', min: 68 },
  { letter: 'C', tier: 'B-MOVIE', min: 45 },
  { letter: 'D', tier: 'STRAIGHT TO VIDEO', min: -Infinity },
];

export function rankRun(r: RankInput): RunRank {
  const frac = (a: number, b: number) => (b > 0 ? Math.max(0, Math.min(1, a / b)) : 0);
  const presses = r.perfect + r.great + r.good + r.miss;
  const crowd = 9 * (1 - frac(r.boothBeats, r.runBeats)) * (r.runBeats > 0 ? 1 : 0) + 18 * frac(r.fullHouseBeats, FULL_HOUSE_REF);
  const timing = presses > 0 ? (27 * (r.perfect + 0.6 * r.great + 0.4 * r.good)) / presses : 0;
  const tokens = 18 * frac(r.tokens, r.tokensTotal);
  const deaths = 18 * Math.max(0, 1 - r.deaths / DEATHS_ZERO);
  const canisters = 10 * frac(r.canisters, r.canistersTotal);
  const score = Math.round((crowd + timing + tokens + deaths + canisters) * 10) / 10;
  let ki = RANKS.findIndex((x) => score >= x.min);
  if (ki < 0) ki = RANKS.length - 1;
  // a FINISHER floors at C (B-MOVIE): D is for walking out, never for the one who struggled to the end
  const floorI = RANKS.findIndex((x) => x.letter === 'C');
  const floored = r.finished && ki > floorI;
  if (floored) ki = floorI;
  const k = RANKS[ki];
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const parts = { crowd: r1(crowd), timing: r1(timing), tokens: r1(tokens), deaths: r1(deaths), canisters: r1(canisters) };
  let next: RunRank['next'] = null;
  if (ki > 0) {
    const up = RANKS[ki - 1];
    // where the points are cheapest: unfound canisters first (10 pts for 3 jumps), else the part furthest from its max
    const gaps: [NonNullable<RunRank['next']>['hint'], number][] = [
      ['canisters', 10 - canisters],
      ['crowd', 27 - crowd],
      ['timing', 27 - timing],
      ['tokens', 18 - tokens],
      ['deaths', 18 - deaths],
    ];
    const hint = r.canistersTotal > r.canisters ? 'canisters' : gaps.slice(1).sort((a, b) => b[1] - a[1])[0][0];
    next = { letter: up.letter, tier: up.tier, min: up.min, need: r1(Math.max(0, up.min - score)), hint };
  }
  return { letter: k.letter, tier: k.tier, score, parts, finisher: r.finished, floored, next };
}
