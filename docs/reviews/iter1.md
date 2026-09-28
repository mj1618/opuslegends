# Fun review — Iteration 1 (vertical slice: cold open + bars 0–32, 164 BPM)

*Reviewer pass against `docs/FUN_RUBRIC.md`, 2026-09-28. Build: `bb53bc3` + working tree. Level: `src/level/slice.ts`,
song: `placeholderSong` (164 BPM shuffle), accent lanes from `assets/audio/jim.beatmap.json` (the shelved stomp
arrangement, same bar grid).*

## Verdict

**The user is right on both counts, and the numbers say why.** The slice is a 28-bar wall of danger (bars 5–32) with
one rhythm. Two thirds of all presses are threats, there is not a single breather bar after bar 4, and the hardest
section (Verse 1b) is harder than the chorus. At the same time the *hands* never get a new rhythm. 0 of 119 actions
sit off the beat, 18 of 24 bars in 9–32 are "one press on each of the four quarter notes", and there are only 6 rest
beats in 96. The hazard vocabulary is fixed by bar 10: gap, spike, pendulum and jabber. After that the only new
things are slam lifts (bar 17) and Hup-Hup-HEY (bar 31). Nothing on screen or in the camera changes between bars 9
and 24. "Too hard", "not dynamic" and "repetitive" are one problem: **uniform high threat, uniform rhythm and
uniform presentation.**

The foundation under it is excellent. Sync is ≤ 4 ms, the controller is tight, the ±50 ms bot clears with 0 deaths
and there is lots of feedback. This is a level-design and presentation problem, not an engine problem.

Rubric top-10 gate: **3 / 11 pass** (B2, B3, B6). B2/B3 pass only because hazard *kinds* rotate. See B4r/B4h.

## How this was measured

- `npm run rubric` (new: `playtest/rubric.mjs`). It loads the real level and song modules through Vite SSR, runs the
  game's own `buildLevel`, and measures every data-computable criterion per 8-bar block. It writes
  `playtest/out/rubric/rubric.{json,md}`. With `-- --reports=<dirs>` it also folds in sloppy-bot `report.json`
  files (A5/A9/A10: deaths per block, deaths by mechanic, hotspots).
- Sloppy bot: 15 headless runs. Default sloppy (±85 ms + 10% late) seeds 1–6. Weaker (±50 + 5%) seeds 1–3. Stronger
  (±110 + 20%) seeds 1–3. `--jitter=130` (no late) seeds 1–3.
- Watched: the autoplay video at 1 fps for the whole run, and 4 fps sheets over bars 5–8, 10–12, 21–23 and 29–32.
  Also full-res screenshots (bars 13 and 29) and the art-lab shots (st5, st6, bar2, slim5).

## Scorecard

Score: 0 = far off, 1 = partial, 2 = meets target. "adj" = an isochronous slam-lift run of ≤ 8 counts as one threat,
per the rubric.

| # | Criterion | Target | Measured (bars 1-8 / 9-16 / 17-24 / 25-32) | Score |
|---|---|---|---|---|
| A1 | Reward share | ≥ 60% level, ≥ 75% bars 1–16 | **33% level**; 65 / **23** / **29** / **23%** | 0 |
| A2 | Lethal per bar | ≤ 0.5 verse, ≤ 1 chorus, 0 in bars 1–6 | 0.5 / **1.38** / **2.25** (adj 1.38) / 0.88; 4 lethal in bars 22 and 23; lethal gaps already in bars 5 and 6 | 0 |
| A3 | Threats per bar | ≤ 1.5 (≤ 2.5 climax) | 1.0 / **3.0** / **3.13** (adj 2.25) / **2.88** | 0 |
| A4 | Lethal on accents | ≥ 90% | 98% on *any* lane onset (trivial: the stomp is on every beat). Only **55% on a strong accent** (boom 1&3 / crash / HEY / stab). Off-accent lethals: gaps at 9.4, 11.2, 12.4, 15.2, 15.4, 25.4, 29.2, 32.4 | 1 |
| A5 | Lethal slack at ±130 ms | 0 deaths | **29, 1, 8 deaths** (slam lifts 34 of 38) | 0 |
| A6 | Threat walls | ≤ 4 consecutive threat beats | 2 / **7** / **13** / **6** (adj 4) | 0 |
| A7 | Safe re-entry | 0 threats in first 2 beats after a checkpoint | spike on beat 37 (bar 9 b2) and on beat 101 (bar 25 b2) | 1 |
| A8 | Teach before threat | first use non-lethal | **Pits:** the level's first hazard (bar 5 b1) is a lethal gap, with no pool first. **Lifts:** first appear lethal (bar 17 b4) | 0 |
| A9 | Sloppy human | ≈ ≤ 2 deaths per 32 bars, 0 in bars 1–16 | deaths/run **7, 1, 2, 2, 5, 1** (mean 3.0 ≈ 9 per 96 bars); 4 deaths in bars 1–16; one run died 6× in 17–24 | 0 |
| A10 | Hotspots | ≤ 20% per action | per action ≤ 11% (pass), but **by mechanic: slam lifts 78% of deaths** | 1 |
| B1 | Novelty cadence | twist ≤ 8 bars, new thing ≤ 16 | **13 bars with nothing new (18→31)**; everything but lifts and HUHH is introduced by bar 10 | 0 |
| B2 | Identical bars in a row | ≤ 2 | 1 everywhere | 2 |
| B3 | 2-bar repeats | ≤ 2 | 1 everywhere | 2 |
| B4 | Distinct bar signatures | ≥ 5/8 | 8/8 everywhere; top signature 6%. **Misleading:** only the hazard kinds rotate | 1 |
| B4r | *Distinct rhythms (onset sets)*, new | ≥ 3, few plain-quarter bars | 5 / **2** / 3 / 3 rhythms; plain ♩♩♩♩ bars 4 / **7** / 5 / 6 of 8; **0 off-beat actions in the slice** | 0 |
| B5 | Verb balance | lead ≤ 60%, lead changes per section | hop 48 / hop 45 / hop 60 / strike 53%; lead verb changes 1 of 3 | 1 |
| B6 | Mode changes | ≤ every 16 bars | ground → lifts (5 bars) → ground. No vertical stretch, no elevation change anywhere | 1 |
| B7 | Lead instrument | declared, varies | not authored | 0 |
| C1 | Intensity ↔ song energy (ρ) | ≥ 0.7 | **ρ = 0.4**: intensity 4.7 → 7.5 → **9.2** → 6.3 against energy 0.55 → 0.6 → 0.7 → **0.85**. The chorus is easier than both verses | 0 |
| C2 | Valleys | ≥ 1 per 32 bars | 0 | 0 |
| C3 | Breathers | a breather pair every 16 bars | **no breather bar at all after bar 4** (28 bars) | 0 |
| C4 | Sawtooth blocks | ≥ 80% | 2/4 (1–8 peaks at bar 5; 9–16 peaks at bar 12) | 1 |
| C5 | Phrase payoff (bar 4 of 4) | ≥ 50% | 4/8 (8, 16, 24, 32 have big stabs; 4, 12, 20, 28 have nothing special) | 2 |
| C6 | Hit & shift points | 100% section starts, ≥ 90% crashes | section starts 3/3; **stabs/crashes with a world reaction 3/18** (no chorus HEY stab has fx) | 1 |
| C7 | Camera events | ≥ 1 per 8 bars | 2 / **0** / **0** / 2 | 0 |
| C8 | Spectacle cadence | ≤ every 16 bars | none. Goons flying off on a strike is the only spectacle | 0 |
| D1 | Action density (all) | ≥ 0.5 verse, ≥ 1 chorus | 0.72 / 0.97 / 1.09 / **0.94** | 1 |
| D2 | On the music | ≥ 95% | 100% on a lane onset (lead lane not tagged) | 1 |
| D3 | Emphasis = sound | ≥ 80% | HEYs struck 78%; **hops on the boom (1&3) 55%**; strikes on backbeat/HEY 72% | 1 |
| D4 | Holes filled | no threat in a stop | **lethal gap in the C5 stop-time silence (beat 117) + spike (119)** | 0 |
| D5 | Every success pays | 100% | 80/80 | 2 |
| D6 | Distinct voices | all | not audited (placeholder SFX) | — |
| E1 | Runway | ≥ 1.2 s | 1.35–1.37 s (3.7 beats) | 2 |
| E2 | One shape = one verb | 0 conflicts | clean | 2 |
| E3 | Clutter | ≤ 3 threats in runway | 3 / **4** / **4** / **5** | 1 |

### Sloppy-bot results

| Bot | Runs | Deaths/run | Deaths by block (sum) | Deaths by mechanic | Stumbles |
|---|---|---|---|---|---|
| ±50 ms + 5% late | 3 | 0, 0, 0 | — | — | 0 |
| **±85 ms + 10% late** (default) | 6 | 7, 1, 2, 2, 5, 1 | 1–8: 2 · 9–16: 2 · **17–24: 14** · 25–32: 0 | slam 14, gap 3, gap-long 1 | 1.8/run (spikes 10 of 11) |
| ±110 ms + 20% late | 3 | 7, 1, 18 | 9–16: 2 · **17–24: 24** | slam 24 | 4/run |
| ±130 ms, no late | 3 | 29, 1, 8 | **17–24: 34** | slam 34 | 7.7/run |

The difficulty is a **cliff, not a slope**. It goes from 0 deaths at ±50 ms to 3 at ±85 ms to 13 at ±130 ms, and the
spread between seeds is bimodal (29 vs 1). The cause is a **death loop**: one slam-lift miss rewinds to bar 17, and
the player must then clear three lethal runs (3, 6 and 9 hops) back to back to reach the next checkpoint. The bot
models only timing, not reading. A human also has to parse 4–5 queued threats per runway (E3) with no breather. So
the human "too hard" is worse than these numbers.

## Top problems, ranked by impact on fun

### 1. The threat economy is inverted: 67% of presses are threats (A1, A2, A3, A6)
**Evidence:** 119 actions: 40 lethal, 40 stumble, 39 reward. Verse 1a has 11 lethal and 13 stumble actions in 8 bars.
Bar 15 is `spike gap spike gap` on four straight beats, and bars 22–23 carry 4 lethal hops each. Rayman's ratio is the
reverse (≥ 1 reward pickup per beat, ~0.5–1 lethal per bar).
**Fix:** keep the density (≈ 1 action per beat) and change the payload.
- **Budget per 8 bars:** verse ≤ 4 lethal and ≤ 6 stumble; chorus ≤ 8 lethal and ≤ 12 stumble. Everything else
  becomes reward: token arcs, pendulums, **breakables on the stabs** (a strike gives a token burst; a miss is only a
  bump), **safe pools** (a miss costs time, not a life), bounces.
- **Lethal only on strong accents:** the boom on 1 or 3, crashes, the walkdown hits. Every gap on beat 2 or 4
  (9.4, 11.2, 12.4, 15.2, 15.4, 25.4, 29.2, 32.4) becomes a pool, a spike or a token arc.
- Gate: `npm run rubric` A1 ≥ 60% and A2 within caps before the build goes to the user.

### 2. No valleys and no curve: the chorus is easier than the verses (C1–C4, C7)
**Evidence:** block intensity runs 4.7 → 7.5 → 9.2 → 6.3 (ρ = 0.4 against song energy). No bar after bar 4 has 0
lethal and ≤ 1 stumble. Checkpoints drop you straight onto a spike (bars 9 and 25, beat 2). There are 0 camera
events in bars 9–24.
**Fix:**
- Author every 8-bar block as a sawtooth. Bars 1–2 are **groove bars** (rewards plus at most one stumble; they double
  as checkpoint re-entry). Bars 3–6 develop. Bars 7–8 peak on the phrase payoff.
- Make the chorus the slice's peak (densest strikes, the zoom, a spectacle beat) and the verse tail its valley.
- Give each block ≥ 1 camera event: a punch-in on the phrase payoff and a real zoom-out (0.8, not 0.86) on the
  chorus.

### 3. One rhythm for 28 bars: quarter notes, no rests, no off-beats (B4r, D3, "repetitive")
**Evidence:** 0 of 119 actions are off the beat. In bars 9–16, 7 of 8 bars are four presses on the four quarters.
There are 6 rest beats in bars 9–32. Hops land on the boom only 55% of the time, so the hands don't track the drums
either. Hand patterns do differ (7–8 per block), which is why B2–B4 pass, but the *feel* is a metronome. That is the
"not dynamic, very repetitive" complaint.
**Fix:** use the (d) rhythm cells and at least 5 per block, driven by the song's own figures (see the audio section).
- **Swung pair:** hop on the beat, then strike on x.67.
- **Pickup:** strike on 4-and into a held jump on 1.
- **Half-note bars:** held jumps as sustains.
- **Rests:** at least 4 rest beats per 8 bars in verses.
- **Fill run** on the phrase-end fill (3.67 → 4).
- Keep hops on the boom and strikes on the backbeat and stabs (D3 ≥ 80%).

### 4. Slam lifts are the death machine (A5, A9, A10, A8)
**Evidence:** they cause 78% of sloppy deaths (14 of 18), 34 of 38 at ±130 ms and 24 of 26 at ±110 ms. The first
appearance is already lethal (bar 17 b4, beat 71). The third run is 9 hops (beats 87–95), over the rubric's
isochronous cap of 8. Three runs share one checkpoint segment, which produces the death loop (29 deaths in one run).
Every hop is a lethal press. Measured slack is ±90 ms, against ±110 ms for spikes.
**Fix:**
- **Introduce** the lifts over a shallow safe pool (a 2-lift run, miss = bump).
- **Develop** with a 4-run over the shaft.
- **Peak** with one 6–8 run ending on a launch or strike payoff.
- Put a checkpoint (or a mid-segment splice) before the lethal run.
- Widen the solid window so a sloppy ±110 ms press survives.
- Tokens or pendulums on the "and" between lifts make the run rewarding, not only survivable.

### 5. Nothing new between bar 18 and bar 31, and no verticality (B1, B6, B7)
**Evidence:**
- The novelty timeline puts every hazard type by bar 10. The last new things are lifts (bar 17) and Hup-Hup-HEY
  (bar 31).
- The optional awning is the only high route, and the bot never takes it (12 of 175 tokens live there).
- The whole slice runs at ground y = 0: there are **no** floor-height changes, steps, roofs or drops. That is a big
  part of why the screen reads as static.
**Fix:** one twist per 8 bars using the variation operators, all cheap on the current engine:
- **Elevate:** rooftop steps up and down on the verse melody.
- **Substitute payload:** pendulum → bottle breakable on the stabs.
- **Displace:** the swung pair in the chorus.
- **Reframe:** the chorus camera.
Tag items with `introduces` / `mode` / `follows` so the rubric can measure B1, B6 and B7 instead of inferring them.

### 6. The world doesn't perform the song (C6, C8, crowd meter)
**Evidence:**
- 15 of 18 stabs/crashes have no world reaction, including every chorus HEY stab.
- The only spectacle is a goon flying off.
- **The streak meter is pegged:** FULL HOUSE by about bar 8 in autoplay, and 5 of 6 sloppy runs end at 24/24. So the
  shouts and bonus stems are at maximum from the first verse on, and the reward music has no dynamics left for the
  chorus.

**Fix:**
- fx/camera punch on every stab and crash (data: `{type:'fx'}` on the lane beats; could be auto-generated from the
  beatmap `crash`/`stabs` lanes).
- A background brawl that punches on 2 and 4 (DESIGN §4 rule 6).
- Rebalance the crowd so FULL HOUSE takes a clean chorus to reach: meter decay per bar, cap by section, verses top
  out at about 16.

### 7. Presentation is stale and flat; the art lab fixes most of it (E3, readability, "nothing going on")
**Evidence (video/screens):**
- The game still shows the **CUE-FU** title card, pagodas and "training dummies".
- The hero is about 80 px tall at 720p.
- The honky-tonk bottle wall sits at the same value as the floor.
- The biggest shapes on screen are the pendulum gallows, which are rewards, so the visual emphasis falls on the
  wrong thing.
- Hazards are small (spikes about 30 px, gaps are thin black notches) and 4–5 of them queue up in the runway at once.
- The chorus looks like the verse.

On the positive side, runway (1.35 s) is fine and hit-sparks and speed lines read well.

**The art lab (st5, st6, bar2, slim5) would fix:**
- Slim at about twice the size with a strong silhouette.
- A lighting arc that marks sections (golden → neon → lamplight).
- Ambient life (pedestrians, cars, bartender, string lights), so the screen is alive when nothing is threatening you.
- The audience strip.
- **Lethal pits that read as lethal** (the red-glow pit in st5).

**Integration risks to handle in the same pass:**
- The art lab has **no hazard or pickup art yet**. It needs a danger palette (one hue family plus a rim for
  anything that hurts, gold for anything that pays) and a greyscale/blur readability check (DESIGN Fun Risk 6).
- The marquee text and the bottle wall are mid-contrast detail right behind the play line. Push them back
  (darker, less saturated).
- The bar2 interior needs floor/back-wall value separation.

### 8. Holes, re-entry and first contact are unfair (D4, A7, A8)
**Evidence:**
- The one moment built for "only your hit is heard" (the C5 stop-time, beats 117/119) holds a **lethal gap** and a
  spike instead of X · silence · X · silence.
- Checkpoints 9 and 25 open with a spike on beat 2.
- The very first hazard of the game (bar 5 b1) is a lethal gap.

**Fix:**
- Leave the stop-time silence empty apart from the designed hits.
- Keep the first 2 beats after every checkpoint threat-free.
- Teach the gap with a pool first (bar 5), with the first lethal gap no earlier than bar 7 (DESIGN §4 rule 2
  already says so).

## Switching to the original recording: what the level must change

The original (live band, E, shuffle 0.675, **161.5 → 166 BPM**, form in `docs/music/transcription.md`) has a
different skeleton from the placeholder. **The slice has to be re-cut to the recording's bars, not re-timed.**

| Original | Bars | What it gives the level |
|---|---|---|
| Intro (band only) | 1–4 | 4 bars, not 8. No pickup bar with a gang HEY: bar 1 b1 is at 0.14 s, so the cold open's STRIKE must start the recording directly, or the count-in must be ours (overlay stem/SFX). Tutorial rewards only. |
| Verse 1, front half (E) | 5–12 | Vocal enters on 5. Boom-chick groove: **hop on 1 and 3, strike on 2 and 4** is the natural cell. First hazards (stumble), pools before gaps. E7 on bar 12 = a phrase payoff. |
| Verse 1, back half (A7/B7, **stop-time: bass tacet**) | 13–20 | The recording's own **valley and "fill the hole" stretch**. Sparse, big single hits where the bass drops out. This is where the current slice puts its *hardest* content (slam lifts 17–24). Move the lifts. |
| Pre-chorus (walk-up E-F#-G#) | 21–22 | A **ladder**: rising steps, one per beat on the walk-up, a launch into the chorus. |
| Chorus 1 | 23–30 | The chorus starts on **bar 23, not 25**. There are **no gang HEYs and no stop-time in the chorus**: the C1–C8 HEY template does not exist in the recording. Strikes follow the real accents instead. The **A7 climb** on every A7 bar (A 1, A 2, C# 2.67, D 3, D# 3.67, E 4) is a swung hop-hop-strike cell and our first off-beat actions. The **walkdown hook** (bar 29: B-A-G-F# quarters) is the "everyone slams" moment: 4 strikes plus the biggest spectacle. |
| Tag | 31 | The title-hook tag, a natural Hup-Hup-HEY or big-stab payoff. |
| Turnaround (B7 piano stabs, C#-D# climb) | 32–33 | A strike on every beat for 6 beats, then a 2-note climb into a launch. The best end-of-slice payoff. |

**Later in the 96-bar plan:**
- Verse 3's **boogie walking bass (63–70)** is the most rhythmic stretch in the song. Use it for the densest reward
  run.
- **Stop-time bars 38–39, 42–47 and 71–76** are the hole-filling spots.
- The **8-bar breakdown vamp (90–97)**, with its chromatic pickup (3.67 · 4 · 4.33 · 4.67) every 2nd bar, replaces the
  stomp-break and build set-piece slot as the pre-final-chorus spectacle.
- **There is no stomp break, no 2-bar drum fill (79–80), no silent beat before a drop, and no final hit.** The
  recording fades over a tag hook repeating every 2 bars (108, 110, …). The iris-out finale must land on a tag hook
  (for example bar 110 or 112) or be carried by our own overlay stem.
- The recording is also **119 bars (~176 s)**, not 96. Decide early whether the level runs to the fade or cuts at a
  tag with an overlay ending.

**Intensity:** a live acoustic band has a much flatter energy curve than the stomp arrangement. The level's own
curve (payload, camera, set-pieces, overlay stems) has to create the peaks. Use the new beatmap's per-section energy
for C1, and treat the chorus walkdown, tag and turnaround as the hit points.

**Engine risks found while reviewing (verify when the beat map lands):**
- `buildLevel` computes `runSpeed` once from `bpmAtBeat(startBeat)` and `player.spawn` keeps it. With 161.5 → 166
  BPM (+2.8%), a speed fixed at the start falls behind by up to ~1.8 beats per 16 bars late in the song, so the
  catch-up surge would be engaged permanently.
  The other way round (a checkpoint at 166, then a slower passage), the hero outruns the grid. Run speed must follow
  the tempo map per beat. Jump physics are already in beats.
- `songFromBeatmap` takes `audio.swing` as the swung-"and" position. The shelved `jim.beatmap.json` stores
  `swing: 1.02` (with `swingRatio: 0.67`). If the new beat map keeps that shape, every swung item lands after the
  next beat. The new builder appears to write the ratio into `swing`; check it.
- `report.shoutAlignment` and the chorus-jabber-on-shout-grid playtest check assume the HEY lane. They need to be
  re-targeted to the new accent lanes (walkdown, climb, stabs), or they will fail or pass vacuously.

## What's already working: protect it

- **Sync and feel.** ≤ 4 ms action error, audio-clock sim, strikes that cancel recovery, hop physics in beats. The ±50
  ms bot clears with 0 deaths, so the timing windows are fair for a decent player. Don't loosen what isn't broken;
  cut the *load* instead.
- **Hit feedback.** Goons ragdolling off the screen on a strike, hit-sparks, speed lines on a Perfect, "HEY!" popping
  out of the audience strip. This is the most fun thing on screen. Build the spectacle on top of it.
- **The strike-on-the-accent loop in the chorus** and a clean **Hup-Hup-HEY** (∪ ∪ X) as the level's motto. Keep it
  rare (tags and payoffs only).
- **Token arcs on the real jump arc** (they make every hop a reward) and the **pendulum-at-the-bottom-of-the-swing**
  target. They are the obvious raw material for the reward half of the economy.
- **Checkpoint splice + count-in respawn** and the **Burn** chaser as a readable pressure source.
- **Runway** (1.35 s, 3.7 beats) and **one shape = one verb** (E2 clean).
- **Tooling:** beat-authored DSL, `--miss`/`--sloppy` bots, and now `npm run rubric`. Use the rubric as a gate.

## Recommended scope for Iteration 2

**Goal: "Re-cut the slice to the original recording (bars 1–33) with a reward-first economy."** It should pass
`npm run rubric` at ≥ 8/11 on the top-10 gate. Sloppy ±85 ms should average ≤ 2 deaths with 0 in bars 1–16, and the
user's next playtest should read as "busy, fair, changes every few bars".

Do first, in order:
1. **Beat map in, tempo-map run speed, swing check** (engine risks above). The level is re-authored against the
   recording's bar grid and sections.
2. **Re-author bars 1–33 to the original form** using the budget and cells above:
   - intro rewards;
   - verse front half: boom-chick hops and strikes with pools before gaps;
   - verse back half (stop-time): sparse big hits, the valley;
   - pre-chorus ladder;
   - chorus: climb cells and walkdown slam;
   - tag payoff; turnaround stabs and a launch.
   Add **breakable stab targets** and **safe pools** (small DSL additions), plus `introduces`/`mode`/`follows` tags.
3. **Slam lifts reworked** per #4. They move out of the stop-time and into the pre-chorus or chorus, as one taught
   2-run and one lethal run of ≤ 6.
4. **Performance pass on hit points:** fx/camera on every walkdown, stab and crash; a chorus zoom-out; sky/lighting
   cues on sections; a crowd meter that can't peg before the chorus.
5. **Art integration** (parallel track): Slim, 42nd Street and the honky-tonk into the game renderer. Drop CUE-FU
   leftovers. Add hazard/pickup art with a danger palette and a greyscale readability check.

Defer: new mechanics (Slick Runs, Bumper Riff, Bench Flips, the Rack), moving threats, Little Jims, extending past bar
33, results poster, D6 SFX voice audit. None of them fixes the three complaints. The three complaints come from the
threat economy, the rhythm and the presentation.

## Notes on the rubric tool (limits to know)

- **A4 "any accent"** is nearly always true (the stomp arrangement's kick/floortom sits on every beat). Judge by the
  *strong*-accent number. Re-run with the original's beat map when it lands (`--beatmap=`).
- **B1/B6/B7** are inferred (kinds, slam platforms, awnings, sky/ground cues) until items carry `introduces`, `mode`
  and `follows` tags.
- **B2–B4** compare full signatures including hazard kind, so they pass while the rhythm is monotone. Read **B4r**
  (rhythms) and **B4h** (hand patterns) alongside them.
- **Death attribution** blames the last lethal action within 2.5 beats before the death position. That is good
  enough for pits and lifts; chaser deaths would need their own cause.
- Section thresholds use the section *name* (intro/verse/chorus/build/…) and absolute bar ranges from the 96-bar map
  (bars 1–6, 73–92). Keep section names meaningful in the new beat map.
