# Iteration log

## Iteration 0 — Discovery + foundation (done)
- Research: docs/research/reference.md (genre principles), song.md, ideas-A/B/C.md (random-seeded idea pools:
  dictionary-RNG seed words, Special:Random Wikipedia, random Met Museum objects).
- Selection: ideas filtered (F>=4, O>=4, not rejected), then drawn with Python SystemRandom:
  world = Stack Coast, hero = Crabbe the fiddler crab, 7 mechanics, 2 set-pieces, 3 enemies, 2 wild cards.
  Fused by the creative director into docs/DESIGN.md ("Don't Mess With Crabbe"; Big Jim is the bully king crab).
- Song: first a PD draw (Sōran Bushi); then the user chose "You Don't Mess Around with Jim" (Jim Croce), licensing
  cleared by the user. Spin drawn randomly: hard-rock stomp boogie (Black Betty style), instrumental, own production.
  Reference recordings live in reference/ (gitignored, transcription only).
- Engine foundation: Vite+TS Canvas2D, audio-clock Conductor (actions within ~3 ms of beats), controller, beat-authored
  levels, autoplay bot, debug overlay, Playwright playtest.
- Fun review: nothing to judge yet (placeholder test level). Foundation sync is excellent; feel constants unverified by a human.

## Iteration 1 — Vertical slice (in progress)
Parallel: (a) gameplay — Crabbe moveset + cold open & bars 0-32 at provisional 160 BPM; (b) art lab — procedural
Crabbe, entities, Stack Coast world + lighting in src/art/ (artlab.html); (c) music — transcription of the original,
synth palette + mix chain; full arrangement next.

### Theme change: crab coast → CUE-FU (during iteration 1)
- The user rejected the crab/sea-coast theme ("we need something cooler, maybe in line with the song").
- New theme pools: docs/research/themes-D.md and themes-E.md (12 packages each, randomly seeded). Filtered to the
  coolest song-fitting packages, then a random draw picked **CUE-FU** (themes-D §4): a scratched 1973 grindhouse
  kung-fu double feature; Kid Cue (tangerine tracksuit, pool-cue staff) fights up Big Jim's five-storey pool-hall
  pagoda; the theatre audience is the streak meter; iris-out finale on Big Jim.
- docs/DESIGN.md rewritten for CUE-FU. Kept unchanged: the song (164 BPM, E, two-beat shuffle), §4 core rules, all §5
  gameplay rules (reskinned), the 96-bar §7 structure and producer spec. Added cultural-care rules (homage to the film
  craft, no ethnic caricature) as a hard constraint and Fun Risk 6.
- Impact: the art lab's crab/coast assets (src/art/entities, src/art/world) are superseded; gameplay/music unaffected
  apart from names (choir → audience, herring → tokens, Breaker → the Burn) and a humanoid hitbox (48×96 [tune]).

### Design revision: CUE-FU → "SLIM CHANCE" + density rules (during iteration 1)
- User feedback: (1) "ninja doesn't make sense, make it more like a muscly pool shark with tattoos"; (2) playing the
  current build: "the game is really boring, it lacks challenge, and it lacks things going on".
- Hero is now **Slim**, a hulking tattooed 70s pool shark (tangerine bowling shirt, flash-tattoo sleeves, mutton chops,
  cue power-shots, knee-slides). All kung-fu flavour removed. Kept: the 1973 grindhouse film frame, theatre-audience
  meter, iris-out finale, Big Jim, the song, §4 rules and the §7 grid.
- The climb is now Big Jim's building, **the Jimperial**: 42nd St → Honky-Tonk → Blacklight Lanes → Pool Room → Velvet
  Casino (the Rack, broken with a break shot on 72 b4) → Roof (the B-I-G J-I-M sign topples like dominoes) → Penthouse.
- New §4 **Density & challenge** hard rules: ≥1 required action per 2 beats in verses and ≥1 per beat in choruses; zero
  threat only in bars 1–4; mixed verbs; a moving threat per act; high routes; an always-busy screen; difficulty
  targets (first clear 10–20 deaths). §7 now lists minimum required actions per section (~277 total), and a density
  linter for `npm run playtest` is specified. Fun Risk 1 is now "still boring".

## Iteration 1 — gameplay notes
What shipped (autoplay clears it: 0 deaths, 119/119 actions, ≤4 ms off the beat; `--miss` and `--sloppy` pass):
- **Controller**: run with a tempo cap and a +15% catch-up surge. Hop physics are defined in beats: every tap up to
  0.22 beat is the same ~0.93-beat hop, and a 1-beat hold gives a ~1.96-beat jump, at any BPM. Up-forward strike
  (the cue swing) that can cancel its own recovery, so strikes on consecutive beats work. Stumble = knockback +
  i-frames + 5 dropped tokens + crowd −25%. Death = pit or the Burn. Hitbox 56×100 (Slim). Wall-jump is off.
- **Systems**: timing judge (P/G/G ±45/90/135, early +12, grades only), crowd streak meter driving the `shouts` and
  `bonus` stem gains, SFX quantised to the target beat on early presses, cold open (STRIKE starts bar 0), checkpoints
  at bars 9/17/25 with a 0.6 s death and a 1-bar count-in, the chaser from bar 5, scansion marks + bar lines, and
  one swing constant (`SongDef.swing`).
- **Song**: the placeholder is rebuilt to the real form. It's 164 BPM with a shuffle, a pickup plus 32 bars, and the
  chorus stab/HEY grid with stop-time. The chorus hook melody comes from the transcription. It has stems, and a
  beatmap loader (`songFromBeatmap`) makes swapping in the real render a data change.
- **Level** (`level/slice.ts`): bars 1–4 are zero threat. Bars 5–8 alternate hazards on 1 & 3 with dummies on 2 & 4,
  plus an air strike. Verse 1a mixes gaps, spikes, mid-air strikes on high dummies, jabbers and an optional awning
  route. Verse 1b has slam-platform runs (2 → 5 → 8) with hop-strikes. The chorus puts jabbers on every HEY, a
  stop-time line and two Hup-Hup-HEYs (the second hop over a lethal gap).

Tuned (the measurements are in `dsl.ts`):
- Tap hop shortened from 1.0 to 0.93 beat and jump buffer raised to 130 ms. Without this, a late hop followed by an
  early press broke slam-platform chains.
- Slam platforms are solid from −0.42 beat until the swung "and" + 0.08, on a wider board. The visual is "down"
  exactly while the platform is solid.
- Spikes sit at the hop's arc centre (+0.45 beat), giving about ±110 ms of timing slack.
- Jabbers are placed so contact happens 0.42 beat after the strike beat, giving about −220/+135 ms.
- Stumble knockback reduced, so the surge recovers in 4.7 beats (DESIGN wants ≤ 4).
- The Perfect freeze and the air-strike pop never touch the sim: both used to drag the hero off the grid.

Sloppy human (±85 ms jitter + 10% late presses, re-rolled every attempt), 3 seeds: 1, 2 and 7 deaths, almost all in
Verse 1b (slam platforms). Stumbles were 2 per run. ±90 ms jitter clears with 0 deaths; ±110 ms dies in the platform
runs.

Fun assessment (honest):
- Probably fun: the hop-per-beat platform pogo, the chorus's strike-on-every-HEY with the crowd standing up and the
  shouts stem getting louder, and a clean Hup-Hup-HEY.
- Probably not yet:
  - Difficulty spikes where the 8-platform run (bars 22–23) meets sloppy timing.
  - Patterns repeat: "hop, dummy, hop, dummy" in bars 5–8, and jumpStrike used 6 times.
  - Most pendulums are optional, so they read as filler.
  - The screen is still static: no reactive props, background brawls or moving threats yet.
  - The user's own verdicts were "boring" before the density pass and "too hard, repetitive" after it.

Open questions for the redesign:
- Where should the difficulty curve sit? DESIGN §4 rule 7 wants 0–2 deaths in bars 1–24, and the sloppy bot's
  Verse 1b deaths suggest the 8-run is too long for a first encounter.
- Moving threats (sliding bottles/stools, thrown bottles) and an always-busy screen (props, brawlers, debris,
  camera punches on stabs) are specified but not built.
- A density linter (required actions per window, verb mix, max same-verb run) belongs in `npm run playtest`.
- Should the Freeze and the jabber bow bounce (optional high route) become real routes?

## Iteration 1 — outcome + fun review
Shipped: slice (cold open + bars 0-32), Slim art lab (42nd St, bar, film pass, audience; not integrated),
sampled instrument palette, beat map + 2:04 edit of the ORIGINAL recording (user rejected our cover), overlay stems.
User verdicts: "boring/no challenge" → (density raised) → "too hard, not dynamic, very repetitive".
Fun review (docs/reviews/iter1.md, `npm run rubric`): 3/11 gates pass. 67% of actions are threats; 1.4-2.3 lethal/bar;
no breathers; chorus easier than verses; 18/24 bars identical quarter-note patterns; no twist bars 18-31; world
doesn't react to stabs; crowd maxes by bar 8.

## Iteration 2 — "Flip the mix" on the original song (in progress)
Driven by the review's top fixes. Parallel: (a) engine: tempo-map run speed, original edit + beatmap + overlay
stems wired to the crowd, limiter; (b) art integration of src/art into the game; (c) act-1 redesign of bars
1-~33 of the edit: reward-majority actions, sparse lethal threats on accents, sawtooth 8-bar blocks, rhythmic
variety from the original's figures, a twist every 8 bars, height changes, world reactions on every stab.

## Iteration 2 — level notes (act 1 redesign)
Plan: `docs/level/act1_plan.md` (bar-by-bar against the edit's lanes). Level: `src/level/slice.ts`, now on the
edit's grid (beat 0 = song bar 1; bars 1–33, finish on the verse-3 downbeat, beat 132; `songId: 'jim_edit'`).
- **Shape:** 42nd Street intro (teach hop / held jump / strike on bottles; pools before the first pit on bar 8) →
  a springboard LAUNCH onto the neon rooftops (bar 9: step down, alley pit, drop back to the street on the bar-12
  fill) → stop-time "big hits" (long pit on the held note, bar 14) → the honky-tonk (knee-slide on the held note,
  lifts over a pool, fill runs, Hup-Hup-HEY on the walk-up's HUP HUP HEY) → LAUNCH onto the bar top on the chorus
  downbeat → A7-climb cells (hop on D, strike the D#), goons on the record's HEYs, the walkdown smash (a crate on
  every quarter + shakes), the tag breath, the lethal lift run on the turnaround stabs carrying HUP HUP → HEY Heave
  → a last launch through the finish. Checkpoints 32, 64, 80, 96, 120.
- **New mechanics (lean, data-driven):** `breakable` (strike on its beat → token burst, ~±210 ms; `high` variant),
  `bounce` pad (auto-launch solved to land on a beat/height; tokens on the arc), raised floors, shallow pools
  (24 px, walk out; `Tun.jump.ledgeAssist` 18 → 26), `lowSign` + knee-slide, lifts over a pool. Placeholder draws
  in `render/propsDraw.ts`. Lifts: wider solid window (−0.5 … "and"+0.12) and `Tun.jump.bufferTime` 0.13 → 0.17
  (a late hop then an early press no longer loses the press — iteration 1's #1 death cause).
- **Crowd:** per-section caps (10 intro / 14 rooftops / 17 honky-tonk / 19 pre-chorus / 24 chorus) + a missed
  target costs 1. Autoplay trace: 10 by bar 5, 14 by bar 11, 19 on the walk-up, FULL HOUSE only from beat 90.
- **World reactions:** fx on every HEY, fill accent, section start, the walkdown quarters, the turnaround stabs;
  camera zoom-out for the launches/chorus, punch-in on the walkdown.
- **Rubric tool:** a trailing block < 4 bars merges into the previous one (bar 33 is not a section); `mode` /
  `follows` tags feed B6/B7 and the novelty timeline; breakables split into -high/-big like pendulums; the song
  and beat map default to the level's `songId` (`assets/audio/jim_edit.beatmap.json`).

| Rubric (gate items bold) | Iter 1 (review, placeholder grid) | Iter 2 act 1 (edit grid) |
|---|---|---|
| **A1** reward share | 33% (23% in 9–16) | **75%** (86 / 77 / 71 / 69% per block) PASS |
| **A2** lethal / bar | 0.5 / 1.38 / 2.25 / 0.88 | **0.13 / 0.38 / 0.25 / 0.44 adj**, max 2 in a bar, none in 1–6 PASS |
| **A4** lethal on strong accent | 55% | **92%** (100% with lift-run heads) PASS |
| **A9** sloppy ±85 + 10% late | 3.0 deaths / 32 bars, 4 in bars 1–16 | **0 deaths × 5 seeds**, ~1 stumble/run PASS |
| **B1** longest stretch w/o twist | 13 bars | **6 bars** PASS |
| **B2/B3** repeats | 1 / 1 | **1 / 1** PASS |
| **B6** modes | ground+lifts | **street, launch, rooftops, bar-floor, lifts, bar-top; 10 changes** PASS |
| **C1** ρ(intensity, energy) | 0.40 | **0.95** (3.7 → 4.2 → 4.4 → 4.8) PASS |
| **C3** breather pairs | none after bar 4 | **9 pairs** PASS |
| **D1** actions / beat | 0.72 / 0.97 / 1.09 / 0.94 | **0.69 / 0.81 / 0.88 / 1.00** PASS |
| A5 ±130 ms | 29 / 1 / 8 deaths | 1 / 0 / 0 (the turnaround lifts) |
| A10 hotspots | slam lifts 78% of deaths | no deaths |
| B4r plain ♩♩♩♩ bars | 22 of 32, 0 off-beat actions | 7 of 33, 21 off-beat actions |
| C4 sawtooth | 2/4 | 4/4 |
| C7 camera events / 8 bars | 2 / 0 / 0 / 2 | 4 / 5 / 3 / 10 |
| Gate | 3/11 | **11/11** |
Still failing (non-gate): C2 (no valley — one rising act), B5 (strike leads 3 blocks), D3 (HUPs are hopped, not
struck: 58% of shouts struck), E3 (the 4-hop lift run is 4–5 threats in the runway). Harder bots: ±110 + 20% late
0 deaths × 3; autoplay 112/112 Perfect, 0 deaths, all 317 tokens.
Weak spots: probably now *too forgiving* for a skilled player (the bot doesn't model reading, so real first-timers
will stumble more); the bar top barely reads as a height change; the rooftops need art for walls/edges; the tag
and turnaround breakables are placeholder skins; the lift run is the only real skill check.
