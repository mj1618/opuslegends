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
