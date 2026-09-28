# FUN RUBRIC: how a music level has to be built to be fun

*Research for the "why is it boring / too hard / repetitive" problem, 2026-09. Part (a) gives principles with sources.
Part (b) is a **checkable rubric** for the reviewer. Part (c) is the **intensity map** for our 96 bars. Part (d) is a
**pattern vocabulary** that fits our mechanics. It builds on `docs/research/reference.md` (cited as [S#]); new sources
are cited as [F#] (list at the end). Tags: **[obs]** means reconstructed from footage or community knowledge (verify),
and **[rec]** means our own recommendation.*

**The playtest feedback, read through this research.** Round 1 ("boring, no challenge, nothing going on") meant there
were too few on-beat *actions* and events. Round 2 ("too hard, not dynamic, very repetitive") happened because DESIGN §4
rule 1 counts **required** actions, meaning actions that cost a stumble or a death. We raised *threat* density to raise
*action* density. The result was a flat wall of `gapHop / pendulum / spikeHop / pendulum` at one uniform intensity.
Rayman does the opposite: **dense rhythmic actions, most of them rewarding, and sparse threats placed on the biggest
accents, with an intensity curve that follows the song.**

---

## (a) Key principles

### 1. Avoiding repetition while staying readable
- **Consistency plus variation, at three scales.** Mapping guides agree that the same sound should get the same kind of
  pattern, so players can read it. Variation grows with the scale: little within a phrase, more between parts, most
  between song sections [F8]. "Similar but different patterns … in sequence" give variety while keeping familiarity
  [F7]. **Sections that sound different must play differently**: "when the song enters a new section, shift those
  mapping ideas" [F8].
- **Follow a different instrument in each section.** osu!/Beat Saber mappers choose which layer to map (drums, melody,
  vocal) and change it by section [F6][F9]. The Ubisoft pitch for Rayman's music levels was "jump to the beat of a drum,
  punch to the bass line, zip-line during a guitar sustain" [F2]. In Mariachi, lums trace the solo guitar, punches hit
  the guitar accents and jumps hit the main beat [S3].
- **The 1-2-3-Action sentence.** Bernstein's "on your mark, get set, go" pattern (Beethoven's 5th), applied to
  platformer chunks by Rasouli (GDC 2022): the same atom three times, then a different payoff (e.g. jump, jump, jump,
  **hit**). Variants: 1,2 / 1,2 / 1,2,3 **Action** builds more anticipation. He also notes that overusing the pattern
  becomes repetitive, and that the longer the build without the payoff, the more epic the payoff must be [F5]. Most
  4-bar pop phrases already have this shape (statement, repeat, variation, cadence).
- **Kishōtenketsu: introduce, develop, twist, conclude** (Hayashida, via GMTK) [S44][F11]. First show the idea safely,
  then with danger, then with a twist, then as a mastery test. Then **drop it** and move on. Celeste does this for 40+
  mechanics and "builds difficulty from combinations rather than surprise" [F15].
- **How often something new appears (numbers).** Mariachi Madness has ~7 distinct phases in ~2.5 min, so a new phase
  every ~20 s [S3]. Castle Rock has ~6 set-piece ideas (rampart punches, bomb-wrecked planks, dragon fire, chain slides,
  bumper, band finale) in ~2:15 of play (the IGN walkthrough runs 155 s) [F1][F3], so ~1 per 20–25 s. Stereo Madness
  (GD's first level) switches traversal mode cube→ship→cube→ship at 0/30/48/85% of ~90 s, one switch every ~20–30 s
  [F21]. Sayonara Wild Hearts is faster still: some mechanics live for a single 2–3 min song [F18]. Griesemer's "30
  seconds of fun" meant the same core loop replayed **in different situations**, not repeated as is [F20].
  **At 164 BPM, 8 bars = 11.7 s and 16 bars = 23.4 s.** So: a twist every 8 bars, and a new mechanic, mode or
  set-piece about every 16 bars.
- **Constraints are your ally.** JSB's designer gets variety from one mechanic by changing its position, quantity and
  behaviour, not by adding more mechanics [F16].

### 2. Feeling dynamic
- **Intensity follows the song.** Intense parts get denser rhythm, bigger movement and more complex patterns. Calm parts
  get simpler ones [F8][F6]. "Emphasis is relative. If everything is emphasized, nothing is emphasized" [F7]. JSB: when
  the music "goes apeshit", the hazards multiply [F16]. Don't *overmap*, meaning don't place objects on sounds that
  aren't there just to make it harder [F6].
- **Interest curves are sawtooth and fractal.** Schell: a hook, then rising peaks separated by valleys, then a climax
  and resolution. Every sub-part has its own mini curve [F12]. The Level Design Book: "alternate highs and lows",
  "don't try to force the player to be 'on' all the time", and after intensity, low-intensity stretches "feel like
  rewards" [F14]. Flow is the channel between anxiety and boredom (Chen). Our two playtests hit **both walls** [F13].
- **Rests are designed.** Rayman's designers add breaks "a few seconds from the intense running" [S9]. Retold cuts the
  music so "it restarts, you enjoy it even more" [S8]. Mapping guides treat breaks as recovery tied to the music's own
  quiet parts [F9].
- **Hit points and shift points** (film scoring). Sync the big hits and the section changes, not every note. Syncing
  everything becomes "Mickey-Mousing" and feels artificial [F23]. GD creators put "portals on transitions" and use
  "a large movement relative to the movements around" for impact [F10].
- **Speed and space as dynamics.** GD uses short speed bursts for drum hits and long bursts for drops [F10]. Our run
  speed is locked to tempo, so we fake speed with **launches** (a bumper arc that covers 2–4 beats of ground), **camera
  zoom** (a zoom-out reads as faster [S28]), **verticality** (a climb or a fall) and **slides**. Rayman changes locomotion
  mid-song (Gloo Gloo: swim to land; Dragon Slayer: dragons as platforms) [S1].
- **The world reacts to the big moments.** Lightning on cymbal crashes, enemies jamming, platforms exploding on the beat
  [S2][F1]. The climax is a spectacle on the chorus peak, and the hardest skill test comes *after* it (Mariachi)
  [S3]. Peak-end rule: overinvest in one peak and the final 10 s [reference §4].

### 3. Difficulty that's right for a first-time player
- **Density of rhythmic actions ≠ density of lethal threats.** *Verified for Castle Rock:* the wiki says the jamming
  Lividstones and Franckys are "**not harmful and cannot be defeated, except for a few**" on the castle platform, and
  the dragon's fire is "very easy to avoid" [F1]. Gold needs **300 lums** in ~2:15 [F1][F3]. At a Black-Betty tempo
  (~120–130 BPM, ≈ 270–290 beats), that's **≥ 1 reward pickup per beat**. The lethal set is gaps, bomb-wrecked planks,
  a few enemies and the dragon fire, roughly **0.5–1 lethal per bar** (est. [obs]; count it on [F3] to confirm). Rayman
  is one-hit-death, so threats have to be sparse. **The claim to verify therefore holds:** most on-beat actions reward
  you (lums, bursts, bounces), and threats sit on the most prominent accents.
- **The music tells you when.** Obstacles on the beat let "the rhythm help guide you" [S2]. Neuse (Runner): "let the
  tempo of the music guide you" [S20]. Hi-Fi Rush enemies telegraph ≥ 1 beat ahead, often call-and-response, and its
  loop is designed to feel *positive, not punishing* [F17]. If a threat sits where the music has no accent, the player
  has to read it visually at 164 BPM. That is where "too hard" comes from.
- **Readable and fair.** JSB rule 3: "the player needs to know what is coming up (to avoid cheap shots)" [F16].
  Celeste: "make failure cheap and informative" [F15]. Beat Saber reaction time is 500–600 ms at Expert+, 750–1200 ms
  for easier maps [F7]. Our 1.3 s runway is fine, as long as the screen isn't cluttered.
- **Density calibration.** Beat Saber stock maps run Easy 0.8–2.3 notes/s, Normal 1.1–3.4, Hard 1.7–5.2 [F6]. At 164
  BPM, one action per beat is 2.7/s, a Normal/Hard density, which is fine *if most actions are safe*. Lower difficulties
  cut density by ≥ 20% [F6].
- **Teach safely, then threaten.** Rayman's intro is lums only [S3] and uses the "concept of delay" [S9]. JSB
  introduces each new attack where it can't hit you [F16]. Mario introduces the idea without risk, then with risk
  [F11].
- **Forgiveness.** Physics never reads the timing grade [S10][S13]. Coyote time and buffers. Stumble instead of death
  for most hazards (DESIGN §4). Checkpoints every 8 bars with a count-in [S21][S22].
- **Casual clear in a few tries.** Castle Rock is the "gentle" first music level. Later levels (3–5 skulls) get harder
  mainly by *density of the same hazard* (Orchestral Chaos) [S1]. Runner 2's fix for Runner 1 was mid-level
  checkpoints and "a much gentler difficulty curve" [S21].

### 4. Performing the song
- **Every sound on the grid.** Rayman snaps footsteps to 16ths and scales every SFX to the song "to play like a melody"
  [S4]. Lums are pitched notes [S3]. Crashes are cymbals [S2]. Sackboy SFX follow the key [S16].
- **Map actions to instruments consistently** [F9][F8]. In Rayman: jump = drum or main beat, punch = guitar or bass
  accents, slide or zip-line = sustain, crash = cymbal, lums = melody [F2][S3]. For us (DESIGN): hop = stomp/kick, cue
  strike = "HEY!"/stabs, slide = held notes, bench flips = stomp-break accents, bumpers = riff response.
- **Fill the song's holes.** The best "I'm playing it" moments are where the band **stops** and the player's action is
  the only sound: stop-time, call-and-response, the silent beat before the drop (Rhythm Heaven, Patapon [S33][S34]).
  DESIGN already has these (C5–C6, the response bars, 72 b4). They must stay **uncluttered**.

### 5. Castle Rock and Mariachi, reconstructed
Castle Rock [F1][F2][F3] (≈ 2:15 of play, 3 cages, gold 300). Phases come from the wiki; the per-phase detail is **[obs],
verify on [F3]**.

| # | Phase | Player does | Threats | Mode / camera |
|---|---|---|---|---|
| 0 | Cold open on the castle wall | Few steps, quiet. The music starts shortly after [F1] | none | walk |
| 1 | Rampart run, flame wall behind | Lum lines on the riff; hops on the beat; a few Lividstones punched on accents | few; most enemies are harmless jamming band [F1] | run |
| 2 | Cannon section | Cannons fire helicopter bombs that destroy wooden platforms [F1]; you hop plank to plank as they blow on the beat | lethal falls, on the drums | run + collapse |
| 3 | Dragon | A forest dragon breathes fire, "very easy to avoid" [F1] | 1 showcase threat | spectacle |
| 4 | Chains | Slide down chains, zip-lining on the guitar sustain [F1][F2] | ~none | slide (mode change) |
| 5 | Finale | A champibumper launches you into the background; the band pose [F1] | none | launch + band pose |

Takeaways: ~5 traversal or context changes in ~2 min; the hazards are *showcased*; the last ~15 s carry no threat.

Mariachi Madness (4 skulls) [S3]: (1) lums on guitar accents, no threat → (2) punch a row on guitar accents → (3) jump
on the main beat between spiked and safe worms → (4) chain-switching over spiky balls, with lums on a staff → (5) chorus
twist: trumpets shrink you → (6) climax: cannoned by trumpets on the chorus end → (7) final gauntlet: punch a line on
the music. Each phase follows **one instrument**, with a new idea about every 20 s, the spectacle before the hardest
bit, and the verb changing phase to phase.

**Verification protocol for the reviewer:** play [F3] at 0.5×. For each bar, tally reward pickups or bursts, lethal
contacts avoided, the verb, and any set-piece. Fill the same table for our autoplay video and compare.

---

## (b) Checkable rubric

**Definitions** (all computable from `RuntimeLevel.actions` plus level items plus `jim.beatmap.json`):
- *Action* = an intended action. *Threat* = `failKind` `death` (**lethal**) or `stumble`. *Reward action* =
  `failKind: none` with a payoff (pendulum, bumper, bench, lum arc, bounce).
- *Signature* of a bar = the sorted list of (beat offset rounded to 1/6, verb, hold class, hazard kind). Two bars are
  identical if their signatures match.
- *Section* = beatmap `sections`. *Accent lanes* = `kick, floortom, snare, crash, shouts, stops-edges, slots,
  fillAccents` plus riff/stab accents (`gtrRiff` with accent, `riff`, `sustains` starts).
- *Intensity(bar)* = 3·lethal + 1.5·stumble + 0.5·reward actions + 2·[new element] (bar-level). Section intensity is
  the mean of its bars.
- Tooling: **L** = level-data script (a new `playtest/rubric.mjs` that reads the built level and the beatmap), **S** =
  `npm run playtest -- --sloppy --seed=1..5` death/stumble logs, **J** = `--jitter=<ms>` sweeps, **V** = autoplay video
  plus screenshots, reviewed by eye.

### A. Difficulty and fairness (threat budget)
| # | Criterion | Target | How |
|---|---|---|---|
| A1 | **Reward share**: reward actions / all actions | ≥ 60% for the whole level; ≥ 75% in bars 1–16 and the valleys; ≥ 45% even in climaxes | L |
| A2 | **Lethal budget** per bar (section average) | ≤ 0.5 in intro/verses, ≤ 1 in choruses and the build, ≤ 1.5 in 73–92; never > 3 in a single bar; 0 in 1–6 and 93–96 | L |
| A3 | **Threat budget** (lethal + stumble) per bar | ≤ 1.5 average outside climaxes, ≤ 2.5 in climaxes | L |
| A4 | **Threats on accents**: lethal actions whose beat matches an accent-lane onset (±1/12 beat) | ≥ 90% of lethal, ≥ 75% of stumble | L |
| A5 | **Lethal timing slack**: every lethal action survives late/early error | 0 deaths at `--jitter=130` (no late presses) for all lethal outside 89–92; stumbles survive ±110 ms | J |
| A6 | **No threat walls**: consecutive beats that each carry a threat | ≤ 4 (≤ 6 in 73–92). Exception: an *isochronous run* (same verb, same interval, e.g. slam lifts) of ≤ 8 counts as one threat per bar | L |
| A7 | **Safe re-entry**: threats in the first 2 beats after a checkpoint, a launch, a mode change or a camera whip | 0; the first bar after a checkpoint is ≤ section mean intensity | L |
| A8 | **Teach before threat**: the first appearance of each hazard type or mechanic is non-lethal (reward, stumble, or safe pool) | 100%; its first lethal use is ≥ 2 bars later | L (first-occurrence scan) |
| A9 | **Sloppy human clears**: `--sloppy`, seeds 1–5 | mean ≤ 6 deaths for the level; 0 in bars 1–16; ≤ 1 per 8-bar segment (≤ 2 in 73–92); autoplay 0 | S |
| A10 | **No hotspots**: share of sloppy deaths caused by one action | ≤ 20%; any action killing in ≥ 3 of 5 seeds gets reworked | S |

### B. Variety (anti-repetition)
| # | Criterion | Target | How |
|---|---|---|---|
| B1 | **Novelty cadence**: bars between "new things" (new mechanic, hazard type, enemy behaviour, traversal mode, set-piece, or a new *variation operator* from (d) applied to a known one) | a twist ≤ every 8 bars; a brand-new mechanic, mode or set-piece ≤ every 16 bars up to bar 72; nothing new to *learn* after 73 (spectacle only) | L (tag items with `introduces`) + V |
| B2 | **Consecutive repeats**: identical 1-bar signature in a row | ≤ 2 in a row | L |
| B3 | **Phrase repeats**: an identical 2-bar signature within an 8-bar section | ≤ 2 occurrences, and the song's 4th phrase varies (1-2-3-Action) | L |
| B4 | **Diversity**: distinct 1-bar signatures per 8-bar section | ≥ 5 of 8; the most common signature ≤ 8% of all bars | L |
| B5 | **Verb balance**: the largest single-verb share in any 8-bar section | ≤ 60%; the *lead verb* changes between adjacent sections | L |
| B6 | **Traversal mode changes** (ground run, lifts, slide lanes, catapult, vertical climb, falling sign, rides or launches, blades) | a change ≤ every 16 bars; ≥ 6 distinct modes; ≥ 2 vertical stretches | L (mode tag) + V |
| B7 | **Lead instrument**: each section declares the lane it follows | adjacent sections differ; ≥ 5 different lanes used across the level | L (section `follows` tag) |

### C. Dynamics
| # | Criterion | Target | How |
|---|---|---|---|
| C1 | **Intensity follows the song**: Spearman ρ(section intensity, beatmap `energy`) | ≥ 0.7 | L |
| C2 | **Valleys**: sections whose intensity is ≥ 35% below the previous peak | ≥ 3 (verse 2a, stomp break, breath; optionally 81–82) | L |
| C3 | **Breathers**: bars with 0 lethal and ≤ 1 stumble (rewards allowed) | ≥ 2 after every set-piece or section peak; at least one such pair every 16 bars | L |
| C4 | **Sawtooth blocks**: in each 8-bar block, the peak bar falls in bars 6–8 (or on the section's big hit), and bars 1–2 sit below the block mean | ≥ 80% of blocks | L |
| C5 | **Phrase payoff**: 4-bar phrases whose 4th bar carries a *payoff* (big strike or break, launch, HEY phrase, spectacle) | ≥ 50% of phrases, and all section ends | L + V |
| C6 | **Hit and shift points**: section downbeats with a visible shift (sky, ground, camera, mode); crash hits and `stops` with a world reaction | 100% of section starts; ≥ 90% of crashes; every stop is empty except its designed hit | L (fx/camera items vs beatmap) |
| C7 | **Camera choreography**: camera events (zoom, tilt, whip, framing change) | ≥ 1 per 8 bars; widest shot on 73; tightest in the quietest section | L + V |
| C8 | **Spectacle cadence**: set-piece or spectacle beat | ≤ every 16 bars; the biggest on 73 and 96 (peak-end) | V |

### D. Performing the song
| # | Criterion | Target | How |
|---|---|---|---|
| D1 | **Action density** (ALL actions, rewards included): replaces DESIGN §4 rule 1 | ≥ 1 per 2 beats in verses and valleys, ≥ 1 per beat in choruses and climaxes; ≤ 2 per beat anywhere | L |
| D2 | **On the music**: actions on some lane onset (±1/12 beat) / in the section's lead lane | ≥ 95% / ≥ 70% | L |
| D3 | **Emphasis matches the sound**: shouts, stabs and crashes → strike or break; sustains → slide; fills → rapid hops; downbeat hits → launch or land | ≥ 80% of each lane's actions use its mapped verb | L (lane × verb cross-tab) |
| D4 | **Holes filled**: in stop-time, response bars and silences, the player's action is the only foreground sound, and no threat stands there that needs a *different* verb | 100% | L + listen |
| D5 | **Every success pays**: threat actions with a reward attached (lum arc, burst, audience) | 100% | L |
| D6 | **Distinct voices**: each verb and each reward type has its own SFX, quantised to the shuffle grid and pitched to the chord | all | listen |

### E. Readability
| # | Criterion | Target | How |
|---|---|---|---|
| E1 | **Runway**: time a threat is on screen before contact | ≥ 1.2 s (≈ 3.3 beats), plus a 1-beat audio/visual telegraph | L (camera lead) + V |
| E2 | **One shape = one verb**: hazard types needing more than one verb | 0 | L |
| E3 | **Clutter**: distinct threat objects in the forward runway at once | ≤ 3 outside 73–92, ≤ 5 inside | L (sliding window) + V |

**Top-10 gate** (fail any, and the level isn't done): A1, A2, A4, A9, B1, B2/B3, B6, C1, C3, D1.

---

## (c) Intensity map (96 bars, 164 BPM, 1 bar = 1.46 s)
Intensity 1–5. "Lethal/bar" is the section average cap. "Follows" is the lead lane. "New" is the one thing the
section introduces (kishōtenketsu stage in brackets). The ◆ checkpoints stay every 8 bars.
**This replaces DESIGN §4 rule 8 ("the only true breathers are bars 1–4 and 93–94")**. That rule is part of why it
feels flat and hard.

| Bars | Song (energy) | Int. | Lethal/bar | Reward share | Follows | New / twist | Mode · camera | Breather |
|---|---|---|---|---|---|---|---|---|
| 0 | pickup (0.3) | 0 | 0 | — | count-in | title, HEY | idle | — |
| 1–4 | intro a (0.55) | 1 | 0 | 100% | `gtrRiff` → token arcs | run, hop, strike [intro] | ground · 0.95 | whole |
| 5–8 | intro b | 2 | ≤ 0.25 (first gap bar 7) | ≥ 75% | kick (1 & 3) hops | the Burn; spikes (stumble) before gaps [develop] | ground · punch-in on 5 | — |
| 9–16 | verse 1a (0.6) | 2→3 | ≤ 0.5 | ≥ 70% | piano melody (tokens, pendulums) + snare jabs | jabbers (flex-only first, jab from bar 11); awning route; bar 16 HEY payoff | rooftops, up and down steps | 9–10 |
| 17–24 | verse 1b (0.7) | 3 | ≤ 0.5 (a slam run counts once) | ≥ 60% | stomp on every beat | Slam Lifts: first over a shallow pool, then the shaft [intro→develop] | lifts (pogo) · slight zoom-out | 17 |
| 25–32 | chorus 1 (0.85) | 4 (peak 29–32) | ≤ 1 | ≥ 50% | `shouts` (HEY → strike) | Hup-Hup-HEY (C7–8); subtitle platforms; stop-time C5–6 with nothing but your hits | bar brawl · zoom 0.86 | 25 |
| 33–40 | verse 2a (0.45) | **2 (valley)** | ≤ 0.25 | ≥ 80% | `sustains` → Slick Runs | knee-slide mode [intro] | slide lanes · zoom in, blacklight | 33–34 |
| 41–48 | verse 2b (0.6) | 3 | ≤ 0.5 | ≥ 70% | `riff` call/response | Bumper Riff (reward); balls in call bars (stumble); Little Jims mime harmlessly 45–48 [intro] | pinball wall · lock-on framing | 41 |
| 49–56 | chorus 2 (0.9) | 4 | ≤ 1 | ≥ 50% | `shouts` + echo | Little Jims block (echo) [twist]; slides mixed into chorus cells | lanes brawl · zoom 0.86 | 49; 56 b4 silence |
| 57–64 | stomp break (0.7) | **3 (valley for threats)** | ≤ 0.25 | ≥ 85% | `slots` (boom/clang) | Bench Flips: reward-heavy catapults, chains from 61 [intro→develop] | catapult arcs · wide | 57–58 |
| 65–72 | build (0.85) | 3→5 ramp | 0.5 → 1.5 (ramping every 2 bars with the tom roll) | ≥ 50% | tom roll plus the downbeat hit | the Rack, a rising staircase [twist]; 72 b3–4 silence → the single break shot | vertical climb · tilt up | 65 |
| 73–80 | final A (1.0) | 5 (spectacle) | ≤ 1 (73–74 ≤ 0.5: let the drop land) | ≥ 50% | crash on downbeats + shouts | nothing new to learn: Sign Falls dominoes; 79–80 fill → post hops on `fillAccents` | falling sign · widest zoom | 73 (spectacle-first) |
| 81–88 | final B (1.0) | 4→5 | 81–82: 0; 83–88 ≤ 1.5 | ≥ 45% | shouts (Hup-Hup-HEY, no marks) | frame-line ride (breather); tower climb [conclude] | ride → vertical · tilt | **81–82** |
| 89–92 | outro (1.0) | **5 (hardest)** | ≤ 2 | ≥ 40% | HEY on every beat, then HUP-HUP-HEY | mastery test on Big Jim (every verb, no marks) [conclude] | boss close-up | — |
| 93–94 | breath (0.35) | 1 | 0 | 100% | piano + stomp | pull out to the theatre, sprocket hops | film strip · pull-out | whole |
| 95–96 | finale (1.0) | 3 (can't die) | 0 | 100% | hits on every beat, final HEY | iris blades, final shot | blades · iris | — |

Shape check: two sawtooth waves (1–32, 33–56), a reset (57), the build, the drop, then a clear peak at 89–92 and the
peak-end at 96. Valleys come at 33, 57, 81 and 93. Every 16 bars brings a new mode (street → lifts → bar brawl → slide
lanes → pinball → benches → rack → sign → tower → boss → iris).

---

## (d) Pattern vocabulary (for our verbs: hop ∪, held jump –, strike X, slide ═, bounce ^)

**Rhythm cells** (each one names the lane it follows; mix at least 5 per section, per B4):
1. **Stomp four**: ∪ ∪ ∪ ∪ on the stomp (slam lifts, post hops). An isochronous run, safe to make long.
2. **Boom-chick**: ∪ on 1 and 3 (kick) over *rewards or pools*, X on 2 and 4 (snare) at pendulums or bottles.
3. **Swung pair**: ∪ on the beat, then X on the swung "and" (+0.67). Only from Chorus 1 on.
4. **Hup-Hup-HEY**: ∪ ∪ X(–), the level's motto. Keep it for shout phrases only, so it stays special.
5. **Pickup**: X on 4-and into a – on the downbeat (anticipation into the bar).
6. **Stop-time**: X, silence, X, silence. Nothing else on screen needs input.
7. **Call and response**: the world plays a bar (bumpers, Little Jims, audience), then you answer it.
8. **Sustain**: ═ for the note's length, with X on a pendulum mid-slide as a combo.
9. **Fill run**: ∪ on every `fillAccents` hit, with dense token bursts. Mostly reward.
10. **Ladder**: rising platforms, one per beat, whose spacing halves as the tom roll doubles (build).
11. **Launch**: ^ a bumper or bench arc that covers 2–4 beats of ground. This is our "speed portal" for drops and
    section ends.
12. **Groove bar**: a reward-only bar (tokens, pendulums, bouncy bluffer shoulders). A valid breather that still keeps
    the player playing.

**Variation operators**: apply one of these to a known cell to get a twist (feeds B1):
- **Substitute the payload**: same rhythm, different object. Token arc → safe pool → spike → gap, or pendulum → bottle →
  jabber. This is Rayman's harmless-first, lethal-later (the "concept of delay").
- **Augment or diminish**: ∪ ↔ – (tap vs hold), or halve the spacing for one bar at a peak.
- **Displace**: move the cell onto the swung "and" or the backbeat.
- **Invert**: X∪ instead of ∪X. Or mirror the direction of travel (the climb, or sliding down letters).
- **Elevate**: the same rhythm on a staircase, the high route, a lift or a wall. The eyes get something new; the hands
  already know it.
- **Fragment (1-2-3-Action)**: bars 1–2 state and repeat, bar 3 splits into half-length cells, bar 4 is the payoff (a big
  X, a launch, or a break).
- **Combine**: overlap two known mechanics (slide + strike, lift + strike, bench + hop over a ball). Never combine
  *new* mechanics.
- **Remove cues**: drop the chalk marks (climb, gauntlet). Use this only on cells the player has already seen three or
  more times.
- **Reframe**: a camera change (zoom, tilt, close-up on Big Jim) or a lighting change on the same cell.

**Reward objects** (raise action density without raising threat): pendulums, token arcs and rows, bumpers, bench
flips, **breakables on the HEY** (crates, bottles, windows: strike for a burst of tokens; a miss is just a bump),
bluffer-shoulder bounces, subtitle platforms, jukeboxes and bar bells, **safe pools** (a miss costs time, not a life),
audience "HEY" answers.

**Threat ladder** (use the lowest rung that works): (1) a slow-down bump (pool, breakable) → (2) a **stumble** (spike,
jabber, sliding bottle, ball) → (3) **lethal** (gap, shaft, roof edge). Lethal threats sit on kick, crash or HEY accents
and have ≥ −130/+150 ms of slack (A4, A5).

---

## Sources (new in this doc; [S#] = `reference.md`)
- [F1] Rayman Legends Wiki, [Castle Rock](https://rayman-legends.fandom.com/wiki/Castle_Rock) (wikitext via API: harmless jamming enemies "except for a few", cannons and wooden platforms, easy dragon, chains, champibumper; cups 75/150/225/300)
- [F2] VideoGamesBlogger, [Rayman Legends walkthrough](https://www.videogamesblogger.com/2013/08/30/rayman-legends-walkthrough.htm) (quotes Ubisoft's feature text: "jump to the beat of a drum, punch to the bass line … zip-line during a guitar sustain")
- [F3] IGN, [Castle Rock walkthrough video](https://www.youtube.com/watch?v=ty3ABT4_HH4) (155 s including results; use it for the bar-count protocol)
- [F5] T. Rasouli, [1, 2, 3, Action! Inspiring Level Design Pacing From Music (GDC 2022 slides)](https://media.gdcvault.com/GDC+2022/Speaker+Slides/1,2,3+Action+Inspiring+Level+Design+Pacing+from+Music_Rasouli_Taha.pdf)
- [F6] BSMG Wiki, [Basic Mapping](https://bsmg.wiki/mapping/basic-mapping.html) (energy matches sound, no overmapping, NPS by difficulty)
- [F7] BSMG Wiki, [Intermediate Mapping](https://bsmg.wiki/mapping/intermediate-mapping.html) (emphasis is relative, similar-but-different patterns, reaction times)
- [F8] osu! forum, [Mapping Consistency](https://osu.ppy.sh/community/forums/topics/743288)
- [F9] osu! wiki, [osu!mania mapping guide](https://osu.ppy.sh/wiki/en/Guides/osu%21mania_mapping_guide)
- [F10] GD Creator School, [Creating gameplay](https://www.gdcreatorschool.com/docs/guides/gameplay-1/creating-gameplay/) and [Making sync](https://www.gdcreatorschool.com/docs/guides/gameplay-1/making-sync/)
- [F11] Game Maker's Toolkit, [Super Mario 3D World's 4 Step Level Design](https://www.youtube.com/watch?v=dBmIkEvEBtA)
- [F12] Game Studies Wiki, [Interest Curve (Schell)](https://game-studies.fandom.com/wiki/Interest_Curve)
- [F13] J. Chen, [Flow in Games (MFA thesis)](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf)
- [F14] The Level Design Book, [Pacing](https://book.leveldesignbook.com/process/preproduction/pacing)
- [F15] M. Thorson, [Level Design Workshop: Designing Celeste (GDC)](https://gamedesign.gg/watch/designing-celeste/); T. Jun, [How to design breathtaking 2D platformer levels](https://www.tadeasjun.com/blog/2d-level-design/)
- [F16] Game Developer, [How jams become levels in Just Shapes & Beats](https://www.gamedeveloper.com/design/how-jams-become-levels-in-the-co-op-bullet-hell-musical-i-just-shapes-beats-i-)
- [F17] J. Johanas, [Developing Hi-Fi RUSH Backwards and Finding Our Positive Gameplay Loop (GDC 2024)](https://gdcvault.com/play/1034256/Developing-Hi-Fi-RUSH-Backwards); [Hi-Fi Rush overview (telegraphs ≥ 1 beat, call-and-response)](https://indiegamesdevel.com/hi-fi-rush-beat-your-enemies-with-music/)
- [F18] A. Parganiha, [Pop, Pain, and Playability: A Breakdown of Sayonara Wild Hearts](https://medium.com/@thedarkside1602/pop-pain-and-playability-a-breakdown-of-sayonara-wild-hearts-7c50a44789bc); [Simogo interview](https://www.dualshockers.com/wild-hearts-never-die-an-interview-with-sayonara-wild-hearts-developer-simogo/)
- [F20] Engadget, [Half-Minute Halo: an interview with Jaime Griesemer](https://www.engadget.com/2011-07-14-half-minute-halo-an-interview-with-jaime-griesemer.html)
- [F21] Geometry Dash Wiki, [Stereo Madness](https://geometrydash.wiki.gg/wiki/Stereo_Madness)
- [F23] Animation Studies 2.0, [Synchronization and Synchresis: avoiding Mickey-Mousing](https://blog.animationstudies.org/?p=3216)
- Also used: [S1] [S2] [S3] [S4] [S8] [S9] [S10] [S13] [S16] [S20] [S21] [S22] [S28] [S33] [S34] [S44] from `reference.md`.
