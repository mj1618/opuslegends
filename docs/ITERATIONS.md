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

## Iteration 2 — outcome + fun review
Shipped: original recording (2:04 edit) + tempo-map run speed + limiter + overlay stems; art integrated (Slim, 42nd St,
honky-tonk, film pass, audience, danger language, world reactions); act 1 (edit bars 1-33) redesigned reward-first.
Review (docs/reviews/iter2.md): gate 11/11, fair + readable + busy, but NO TEETH: no bot dies between ±40 and ±160 ms;
skipping all rewards or eating all stumbles still finishes; crowd hits FULL HOUSE even at 30% misses; skilled bot
99% Perfect → no skill ceiling; Burn off-screen; 12 hint banners feel like a tutorial; 50/112 actions look alike.

## Iteration 3 — Teeth, feedback, wow + act 2 (in progress)
Parallel: (a) act-1 gameplay: knee-slide fix, Burn pressure, lethal combo at each block peak, tighter gaps,
skill-measuring crowd, hints cut to 3; (b) audio: crowd you can hear (thin 'projection booth' filter at low crowd,
cowbell/stomps up at FULL HOUSE), miss/grade sounds; (c) art: grade stamps + combo counter, wow moments (Burn lunges,
giant walkdown smash, bigger launch, chorus shot), per-section breakables, dancing goons, act-2 environments
(building exterior climb, bowling alley); (d) act 2 level (edit bars 34-60) per review plan.
Difficulty targets per 33 bars: sloppy ±85 ms 0.5-1.5 deaths, ±130 ms 2-4, skilled ±40 ms 0.

## Iteration 3 — act 2 notes (level design, edit bars 34-60)
Plan: `docs/level/act2_plan.md` (bar by bar on the lanes). Code: `src/level/act2.ts` (act 2), `src/level/index.ts`
(`gameLevel` = act 1 + act 2 on one world x; drops act 1's finish — its last launch lands ON 133 outside the honky-tonk,
the ground flips timber → facade at the door), `src/game/mech/` (thrown bottles, firebombs, rolling balls, set-piece
cues, ledge scramble, fall-out). Game now plays bars 1-60 and ends on the breakdown downbeat (240). Checkpoints 132,
164, 196, 220, 236.
- **The climb (34-41)** on the boogie bass: ledge hops UP on the climbing bass notes (G# A A# B), alley gaps jumped UP,
  a counterweight-ladder launch two storeys up (0 → 790 px; the Lanes sit at 950), the first MOVING threat: bottles
  thrown from lit windows on a dashed arc to a crosshair, arriving ON the beat (bat them back: −210/+70 ms) and
  firebombs that burst a hop ahead ON the beat. Peak bar 41: two gaps hopped UP on the fill with a bat between.
- **Stop-time (44-47)**: big pane smashes in the holes, a knee-slide on the held note, **Big Jim's first glint** on the
  verse peak (180); safe window-washer cradles on the B pedal (48). **Pre-chorus**: HUP (gap) · HUP (firebomb) · HEY =
  the Heave sends a goon through the big window. **Chorus 3 = the Blacklight Lanes**: launch in, rolling balls, pins,
  a Bluffer pair on HEY HEY 209/210, pinsetter lifts over the gutter (lethal), slick run on the held note, four giant
  pins on the walkdown, tag breath.
- Measured (act 2 from the 132 checkpoint): autoplay cold open → bar 61 0 deaths, 218/218 actions on time; sloppy ±85
  +10% late ×5: deaths 1,0,0,0,0 (0.2/run, pit@224), 0.8 stumbles/run (all thrown bottles); ±130 ×3: 0, 3, 1 (Burn
  catches after firebomb stumbles, gaps 160/200); ±40: 0 deaths, 0 stumbles. `npm run rubric -- --level=src/level/index.ts#gameLevel
  --bars=34-60 --reports=…`: **gate 11/11** (reward 68%, lethal 0.5/0/0.36 adj per bar, C1 ρ 0.87, D1 ≥1/beat in the
  chorus). Non-gate fails: B5 (strike leads every block), E3 (4 threats in the chorus runway), C4 (chorus block not a
  sawtooth: the walkdown + tag are the breath), A10 (1 death = 100% hotspot), A11 WARN (sloppy 0.24/32 bars).
- Rubric tool: `--bars=A-B` judges one act inside the whole level (novelty sees act 1); blocks are named by the
  section covering most of their bars; level-opening rules only apply from bar 1; thrown bottles vs firebombs are
  two kinds.
- Lessons: an air strike during a hop's descent zeroes the fall (airPop 0) → a gap hop on the next beat comes late
  (killed autoplay at 207.66 → 208; now linted out). Strikes < 0.52 beat apart execute late (the active window).
- Open: sloppy ±85 dies less than the 1-2 target (0.2/run) — the bot's uniform jitter only fails on its 10% extra-late
  presses; more teeth should come from Burn tuning / combos, not tighter ms. Art/render: 'facade' / 'lanes' sky + ground
  presets need their lighting keys; audio: dedicated whistle/rumble SFX (currently windup/clack).

## Iteration 3 — act 1 notes (gameplay: teeth, skill-weighted crowd, wow set-pieces)
Driven by `docs/reviews/iter2.md` fixes 1, 2, 3, 5, 7 and the gameplay half of 6. Level table: `docs/level/act1_plan.md`
("As shipped (iteration 3)"). Code: `game/events.ts` (new), `game.ts`, `crowd.ts`, `player.ts`, `tunables.ts`,
`level/{dsl,build,slice,types}.ts`, `playtest/slack.mjs` (new).
- **The Burn remembers** (`Tun.chaser`): a gap behind the music line (rest 1.75 beats); a stumble pulls it 0.75 beat,
  a missed reward 0.2 (once it has risen), clean play relaxes it; it lunges 0.3 beat on every drum fill. Two
  stumbles close together = caught; checkpoints snapshot the gap (respawn ≥ 1.1).
- **Lethal combinations at every block peak** (bars 8, 16, 24, 33), mixed verbs on big accents (see the plan). Pit
  timing presets `GAP_FIT` teach/std/tight/peak: bars 1–16 stay sloppy-safe; the chorus is tight on the EARLY side
  (−60…−80 ms) while the late side stays +150 ms (protects uncalibrated-latency players, per the review). New
  checkpoint 112 (walkdown).
- **Crowd = skill meter**: P +1 / G +0.5 / Good 0 / Miss −2 / stumble −4 / death −6, decay 0.4/beat; judge Perfect
  ±33 (+10 early). **Combo** = consecutive Great+ (`game.combo`). **Events** for audio/art: grade, miss, combo,
  crowd, fullHouse, stumble, death, burn (lunge/pull/caught), setPiece, smash, hint (audio's StageAudio listens).
- **Knee-slide fixed** (auto-crouch under signs + signs end 0.25 beat earlier): 0 sign stumbles in 30+ bot runs.
- **Hidden hover removed**: an air strike used to zero a falling hero's speed (`airPop` 0 → `min(vy, -0)`), which
  delayed landings and let air strikes rescue early jumps; now a true no-op.
- **Hints**: 3 first-appearance prompts; failure hints after 2 fails of the same thing; a one-time "hitting late?
  tune the latency with [ ]" tip when 16 graded presses average ≥ 45 ms off.
- **Wow (gameplay side)**: 3-beat launch to a 250 px roof (~650 px apex) at bar 9, the chorus shot (camera 0.76 +
  `fx shot` + `setPiece chorusShot`), four giant walkdown kegs with a real hitstop. Launch pads now fire at the pad's
  centre so arc tokens/bottles are exact. Ground line 0.72 → 0.66 of the screen (fix 7).
- **Tools**: `node playtest/slack.mjs` (lethal windows with the real controller, strike reach, late takeoffs,
  predicted deaths per profile, `--trace`, `--hold`); bots `--skip=none|stumble`, `--max-deaths`; report adds
  crowd trace, combo, burn stats, fail hints, per-target grades. Rubric: `setPiece` items count as set-piece
  novelty, giant breakables are their own kind.

Measured on act 1 (beats < 132 of the full-level run; `--dist=dist-act1`, rubric on act-1-filtered reports):

| Profile | Runs | Deaths per act 1 | Other |
|---|---|---|---|
| autoplay | 1 | **0** | 100 % Perfect, max exec error 4.2 ms; the full-level playtest PASSES |
| skilled ±40 ms | 5 | **0, 0, 0, 0, 0** | Perfect 92–96 % (Great 4–8 %) — no longer 99 % |
| sloppy ±85 + 10 % late | 7 | **1, 0, 1, 1, 0, 1, 1 (0.71)** | 0 in bars 1–16, ≤ 1 per block per run; FULL HOUSE in 6/7 (late chorus) |
| ±130 | 7 | **8, 1, 0, 2, 2, 2, 2 (2.43, median 2)** | crowd stays 3–13: never FULL HOUSE |
| ±110 + 20 % late / ±160 + 20 % late | 1 / 1 | 0 / 2 | |
| uncalibrated (every press 60–110 ms late, ±40) | 1 | **0** | crowd thin (Goods) → the latency tip |
| lazy (`--skip=none`) | 1 | never finishes | the Burn catches it at bars 11–12 on every retry |
| reckless (`--skip=stumble`) | 1 | never finishes | caught at bar 12 (cue rack 42 + goon 45) on every retry |

Rubric (act 1): **gate 11/11**; **A11 Teeth PASS** (±85: 0.69 deaths/32 bars, ±130: 2.35, ±160+20 %: 1.94); A4 94 %
lethal on strong accents (100 % with lift heads); B1 longest stretch without a twist 6 bars. A5 now FAILS by design
(±130 dies ~2.4×/act). Still failing (non-gate): B5 (strike leads every block), C2 (no valley in one act), D3 (HUPs
are hopped), E3 (4 threats in the chorus runway).
- Watch: the Burn is global — in act 2 the thrown bottles stumble harsh bots close together (±160+20 % was caught 14×
  there in one run, the uncalibrated bot 3×); act 2 may want a gentler `Tun.chaser` or fewer stumbles per bar.
  `gapHop`'s default is now 'std' (−110/+150; was −120/+200). The playtest bot's 10 % late tail is the sloppy
  model's only source of deaths, so the ±85 rate is sensitive to ~10 ms of early-side window.

## Iteration 3 — outcome + fun review
Shipped: act-1 teeth (Burn pressure, block-peak lethal combos, skill crowd, knee-slide fix, hints ≤3, wow moments),
audible crowd reward (projection-booth filter → full-range, overlays up at FULL HOUSE, grade/miss sounds), feedback
stamps + combo counter, per-section breakables, dancing goons, act 2 (bars 34-60: facade climb, bottles/firebombs,
window smash, bowling-alley chorus). Act 3 planned (docs/level/act3_plan.md).
Review (docs/reviews/iter3.md): act 1 WORKS (±40: 0 deaths, ±85: 0.6, ±130: 2.6; ignore-everything bots caught).
Act 2 breaks fairness (late slack 110-125 ms vs act 1's 150+, bottles 70 ms → 6-11 deaths for laggy players),
is act 1 reskinned (9/12 elements), the climb is flat (790 px rise over 12,300 px), bowling chorus darkest screen,
gate 9/11 (intensity corr 0.30, Burn death loop bars 40-41).

## Iteration 4 — Act 3 climax + act 2 made its own (in progress)
Parallel: (a) act 3 build per act3_plan + review; (b) act 2 rework: real verticality, fairness slack, unique
set-pieces; (c) gameplay fixes: Burn respawn distance, crowd start 8, latency calibration in the cold open, act-1
chorus early-press slack, crowd continuity + Hup-Hup-HEY → FULL HOUSE, hop-led blocks, poster count; (d) art: act-3
environments + Big Jim rig + letters + iris, lit bowling alley, glint/window-crash camera moments; (e) audio: act-3 SFX.

## Iteration 4 — act 3 notes (level design, edit bars 61-86)
Plan + "As shipped" deviations: `docs/level/act3_plan.md`. Code: `src/level/act3.ts` (new; `act3Items(h0)` starts on
act 2's last floor height via `level/index.ts`), `game/mech/act3.ts`, `letters.ts`, `bigJim.ts` (new: `game.mech.act3`),
plus small hooks in `mech/index.ts`, `game.ts` and `types.ts` (`topple`, `bigJim`, `chaser { off }`, `crowd { floor }`,
act-3 sky/ground/look/set-piece names). The art agent now owns `render/act3Draw.ts`. It started as my placeholder.
- **The shape.** 61–64 is the POOL ROOM call and response, the level's real valley with 0 threats: the goons stomp the
  Black Betty call and you answer it on its rhythm. 65–68 is THE RACK: a +500 px climb whose lethal count ramps
  0 → 1 → 1 → 2 per bar into the fill, then HUP · HUP · THE BREAK SHOT on the &4 tom (271.65). The audio derives the
  hush from it, and a clean break earns FULL HOUSE on the drop.
- **69–76, SIGN FALLS at sunset.** The rack's recoil launch is the drop (camera 0.72). The BIG JIM letters topple one
  per downbeat and land as bridges ≥ 1 beat ahead of you. Your shot topples the second I. A post run crosses the
  light-well, and the chorus peak is the lethal combination on the M. The third walkdown is four giant blows ON Big
  Jim. Then you crash through his glass wall.
- **77–83, the REVEAL (0 threats) and the GAUNTLET** (no chalk marks). You climb Big Jim: his fists are lethal lifts,
  then a slide up his sleeve, then two HUP-HUP-HEYs that crack his left and right lenses. His backhands ride the fill
  lunges, and his knuckle-ring swing has a 1-beat wind-up.
- **84–86, the FINALE (can't die: the Burn retires on 332).** The pull-out into the theatre, sprockets rising on the
  pickup, iris blades per beat. The crowd is floored to FULL HOUSE from 338. The FINAL HIT (340) is the HEY of the last
  Hup-Hup-HEY: a giant struck as the iris slams. Then THE END, Slim stops at the throne for the victory pose, and the
  poster prints.
- **Measured** (bots from ◆236, dist-act3):
  - Full-level autoplay from the cold open: PASS (0 deaths, act-3 execution ≤ 4 ms).
  - `npm run rubric -- --bars=61-86` with the bot reports: **gate 11/11** (reward 76%, lethal 0.5 / 0.63 / 0.4 adj per
    block, C1 ρ = 1, C2 1 valley, D1 ≥ 1/beat in chorus 4 and the outro).
  - Every lethal window is ≥ −85 / +150 ms (slack.mjs; list in the plan).
  - Skilled ±40: 0 deaths ×6. Sloppy ±85 + 10% late: 0, 0, 1, 0, 0, 0, 0, 0 (≈ 0.1 per run). ±130: 1, 0, 4, 0, 3, 0
    (mostly the Rack, ◆256). Uncalibrated-late: 0–1 (at 276, before its late side was raised to +165).
  - ±160 + 20% late can't finish. Reckless is caught at 281 → 286 (stumbles matter). Lazy is caught by the Burn in the
    Pool Room (skipping every reward feeds it).
- **Misses vs the plan's targets.** Sloppy 1–2 and ±130 3–5 deaths are NOT reachable under the fairness rules. A
  uniform ±85 bot never presses outside −85, and its 10% late tail only fails a window whose late side is ≤ +150
  (~1% per lethal). Any more teeth would have to come from tighter windows, which the review forbids. The phrase HUPs
  and the post run have lenient early sides (the jump buffer after the previous hop). Non-gate rubric fails: B5 (strike
  leads chorus 4), E3 (5 threats in view at the post run + M), C4 (the outro block is not a sawtooth).
- **Tools.** `slack.mjs` now models the FALL-OUT rule (high pits used to look survivable at ±300 ms) and never starts a
  sweep mid-launch. The rubric derives `fillAccents` from `fills[].accents` (the edit's beat map has no such lane).
  Both fixes rode along in other agents' commits.
- **Lessons.** A `gap` beats any `floor` in the builder: split the pit around posts. Static posts ≤ ~0.4 beat apart
  are WALKABLE (26 px ledge assist), so step each one up 24 px. Set-pieces only fire while running, so cue anything
  after the finish from state (the iris is a function of the beat). Presentation must read one consistent state
  (a letter's `landedBeats`, not a separately computed beat).

## Iteration 4 — act 2 notes (level design: the vertical rework, edit bars 34-60)
Plan: `docs/level/act2_plan.md` (rewritten). Code: `src/level/act2.ts`, `src/game/mech/hook.ts` + `mech/index.ts` (hook
rides, bottle bat grace, scramble ≤ 150 px), `camera` items' `ground` (`cameraGroundAt`, `Camera.groundFrac`),
`playtest/slack.mjs` (runs the act-2 mechanics; `--stumbles`, `--why`). Act 2 still ends on 240 on the lane deck (h 950).
- **It climbs.** 0 → 1,620 px in bars 35–41 (review: 790 over 12,300 px of run): fire-escape flights (the 26 px step-up
  assist walks you up 24 px risers, hands free), ledge hops UP on the boogie's climbing notes (on the "and"s), a storey
  jump (held), two alleys jumped UP, the rope hoist. Then the roof (stop-time), the cradle to 1,864, the sill at 1,964,
  and THE DROP: a ~1,000 px zip down into the Lanes on the chorus downbeat (the act is a mountain). Camera `ground`
  0.52 on the climb / 0.5 on the cradle / 0.42 on the zip so the street drops away below.
- **One new verb: the HOOK** (strike ON the beat to hook a rope / laundry line / cradle / cable and ride it; strikes
  work mid-ride). Taught safe 3× (148 hoist, 178.66 the line on the held note, 188 the cradle one step per B), lethal 2×
  in the chorus (204 the zip, 212 the pinsetter's sweep bar). Every act-1 reskin is gone: the knee-slide sign, the safe
  lifts, the `0∪ 1∪ 2X` motto (now `0∪ 1X 2X`: hop to the sill, bat, Heave the goon across the well), the launch into
  the chorus, the HEY-HEY goons, the lethal lift run, the four giant pins (now the walkdown walked DOWN: ∪ X ∪ X over
  two pinsetter pits).
- **Fair.** Every pit −90…−140 / +150…+235 ms; bottles −210 / +145 (was +70: a 70 ms bat grace after the clip),
  firebombs −100 / +145 (flames 0.5 beat, 16×18 core), balls −90 / +140 (0.5 beat, r 16), hooks −130 / +185. Bars
  40–41 thinned (1 stumble + the 2 peak gaps); the 207/208 pair is a pin then the gutter; chorus stumbles ≥ 2 beats
  apart (two close together were a Burn catch loop for ±160). Hop-led climb (14 hops / 3 jumps / 8 strikes); act 2 is
  50% strikes (was 55%).
- **Measured** (bots from ◆132, `dist-act2`, run to the level's end; act-2 deaths only):
  - Full-level autoplay from the cold open: PASS, 0 deaths, 300/300 actions on time.
  - Skilled ±40: 0 (×2). Sloppy ±85 + 10% late: 0, 0, 1, 0, 0 (0.2 per run; iteration 3: 1.0). ±130: 0, 2, 2, 0, 1, 6
    (1.8; the 6 are spread over 6 spots). ±160 + 20% late: 3, 7, finishes (iteration 3: DNF after 18). Uncalibrated
    (every press 60–110 ms late): 0 (iteration 3: 6–11). Lazy: caught at bar 35 (skipped ledge hops scramble and feed
    the Burn). Reckless: caught at bar 48.
  - `npm run rubric -- --level=src/level/index.ts#gameLevel --bars=34-60 --reports=…`: **gate 11/11**; `--bars=1-60`:
    **gate 11/11, C1 ρ 0.88** (was 0.30: verse 3 4.3 / 2.6, chorus 3 5.8 — the Lanes are the act's peak). Non-gate
    fails: B5 (strike leads the stop-time and the chorus blocks, 56–60%), A7 (bar 42's first-bar intensity is its
    novelty bonus; no threats), E3 (4 threats in view in the chorus), A10 (1 sloppy death = 100%).
- **Miss vs the brief's targets.** Sloppy ±85 dies 0.2 per act, not 1–2, and ±130 1.8, not 2–4: under −85/+150 a
  uniform ±85 bot only fails on its 10% extra-late tail (~1% per lethal), and ±130 only on early sides < −130. The
  teeth sit on the early sides (−90…−95 on the peaks) and in the Burn; more would need windows the review forbids.
- **Lessons.** A hook path must stay above the terrain it crosses (a path below a floor top pushes the rider back to
  the floor's edge). Staircase flights + hops: a hop landing on a flight lands early (fine for rewards, never before a
  lethal). The ledge scramble makes a missed reward hop cost time, not a life — and three in a row feed the Burn (the
  lazy bot dies at bar 35). Strikes 0.34 beat apart execute 67 ms late (the active window), so keep them ≥ 0.66 apart.

## Iteration 4 — gameplay fixes
Driven by `docs/reviews/iter3.md` fixes 3, 5, 8 (and the crowd half of 7). Code: `game/{game,crowd,calibrate,tunables,
autoplay,stats}.ts`, `level/slice.ts`, `render/calibDraw.ts` (the card; the art pass reskinned it as a film leader),
`engine/params.ts`, `playtest/{playtest,rubric}.mjs`.
- **The Burn can't kill twice in a row.** Respawn at rest (1.75 beats, was 1.1), the first stumble after a respawn only
  flares it, and after a CATCH it rests 0.5 beat further back until the next checkpoint. Harsh bots (±160 + 20 % late,
  3 runs, whole level): 0–1 catches per run, never two in a row (the review saw 3–14 in bars 40–41).
- **Crowd.** Wakes at 8 (the intro is thin, not the booth horn), Good +0.25. A lowered cap no longer clamps: the act-2
  seam glides 23.9 → 18.3 → 16 over 2 bars instead of dropping in one step. **The drop:** a clean (all Great+)
  Hup-Hup-HEY in the 8 beats before a chorus cap fills the house half a beat early, so FULL HOUSE + its cheer land ON the
  chorus downbeat (88 and 204 for autoplay; act 3's crowd item `earn: [271.65]` does it for the break shot). To keep
  FULL HOUSE a skill state, the meter now decays faster the fuller it is (+0.05/beat per member above 12): FULL HOUSE
  beats over the level: ±40 155–158, sloppy 17–62, ±130 7–37, uncalibrated 22–29.
- **Latency: "SYNC THE PROJECTOR".** A cold-open tap test (8 clicks at the song's tempo, tap X; median of the last 6
  taps vs the click's audible time → `conductor.latency`, stored). It runs on the first STRIKE of a first-ever run,
  on ↓ in the cold open, on X in the pause screen, and with `?calib=1`; SPACE skips (and is remembered). In the run an
  auto-drift nudges the offset toward the player's median error (clear bias only, ≤ 8 ms per bar, ±40 ms). New bot
  model `--device=<ms>`: the bot HEARS the music late, so calibration corrects it like a human. Device +90 ms bots:
  the tap test measures 88 / 90 / 89 ms → 0 deaths and 88–94 % Perfect; without the test the drift walks to +40 ms.
- **Act 1:** the chorus pits that punished early presses (94 −60, 98 / 106 −65 ms) now end sooner (−85 / −90); the
  ±130 teeth moved to a new pit on 116 (bar 30 b1, −80/+150), away from the bars 24–28 burst. Hop-led blocks: 5
  strikes became token hops (13, 23, 65, 81, 121): intro and honky-tonk lead with the hop, rooftops and chorus with the
  strike (B5 PASS, 3/3 lead changes; chorus 58 % strikes). Rubric bars 1–33 with bot reports: **gate 11/11**.
- **Poster:** "bottles & crates" counts smashes + bats once per checkpoint rewind, over totals from the start beat
  (autoplay 119/119, was 102/95); heaves = completed Hup-Hup-HEYs whatever the HEY hits (7/7); best combo line.
- **Tools:** `--device`, `--calib`, `--autolat=0`; sloppy runs print deaths/stumbles per act; the rubric's `--bars`
  counts only that range's deaths (per-act A9/A10/A11).

Measured on the whole level (acts 1–3 as committed at `0861854`, `--dist=dist-fix`; deaths per run, act 1 / 2 / 3):

| Profile | Runs | Act 1 | Act 2 | Act 3 |
|---|---|---|---|---|
| autoplay | 1 | 0 | 0 | 0 (218+ actions on time; the full-level playtest PASSES) |
| skilled ±40 | 3 | 0, 0, 0 | 0, 0, 0 | 0, 0, 0 |
| sloppy ±85 + 10 % late | 5 | 1, 1, 0, 1, 0 (**0.6**) | 0, 0, 0, 1, 0 | 1, 0, 0, 1, 1 |
| ±130 | 3 | 3, 2, 1 (**2.0**) | 0, 1, 4 | 2, 1, 4 |
| device +90 ms, calibrated | 3 | 0, 0, 0 | 0, 0, 0 | 0, 0, 0 |
| device +90 ms, drift only | 3 | 0, 0, 0 | 0, 0, 0 | 0, 1, 0 |
| ±160 + 20 % late | 3 | 5, 3, 11 | 5, 9, 6 | 6, 13, 15 (DNF at 40) |
| lazy (skips rewards) | 1 | caught ×12 at bar 14 | — | — |

- Open (other owners): pit loops for the ±160 bot in act 3 (277 ×8 in one run, 311 / 317 ×4) and the act-2 cradle-miss
  path (a missed cradle → ladder scrambles at 189.8 / 192.3 → Burn catches at 191 for harsh bots). Act 3's ±130 rate
  (2.3 per act) is above act 2's (1.7). The pit on 116 is the ±160 bot's act-1 hotspot (2–4 deaths); fine for ±130.
