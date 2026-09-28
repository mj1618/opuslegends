# Fun review — Iteration 2 (act 1 on the original recording: edit bars 1–33)

*Reviewer pass against `docs/FUN_RUBRIC.md`, 2026-09-29. Build: HEAD `a2b368e`. Level: `src/level/slice.ts`,
song: `jim_edit` (the original recording, tempo-mapped beat map `assets/audio/jim_edit.beatmap.json`). Bar numbers
below are **edit bars, 1-based** (bar n starts on beat 4(n−1)). The rubric's own tables are 0-based ("bar 7" there =
edit bar 8; block "0-7" = bars 1–8).*

## Verdict

**Iteration 2 fixed what the user complained about, and moved the level into the opposite ditch.** Act 1 is now fair,
busy (0.7 → 1.0 actions per beat), musically placed (92% of lethal threats sit on strong accents, 80% of hops land on the kick), varied by the rubric's numbers (8/8 distinct bars per block, 6 traversal modes, a twist every ≤ 6 bars) and it
looks like a real game: Slim, the red-glow pits, striped DUCK signs, the golden-hour → neon → honky-tonk arc.
The gate is **11/11**.

But it has **no teeth and no skill ceiling**, and its reward loop is **invisible and inaudible**:

- **Nobody dies.** 0 deaths in 13 bot runs from ±40 ms up to **±160 ms + 20 % late presses**. It takes ±220 ms
  jitter (more than half a beat of spread) to die once. Of the 13 lethal threats, only the turnaround lift run
  (bars 32–33) has ever killed a bot.
- **75 % of the level is optional.** A bot that ignores all 84 reward actions still finishes with 0 deaths and
  0 stumbles.
- **Stumbles don't matter.** A bot that walks into all 15 stumble threats finishes too, and the Burn never catches it.
- **Skill doesn't show.** The streak crowd ends at FULL HOUSE (24) whether you hit 100 % Perfect or miss 30 % of the
  targets. The ±40 ms "skilled" bot scores 110/110 Perfect, so a good player has nothing left to chase.

By the numbers this is the round-1 complaint coming back ("boring, no challenge") on a better-dressed level. A skilled
player will clear it first try on autopilot. The only thing it will feel is the lift run.

The screen also under-sells its big moments. The launches, the chorus zoom and the bar-29 walkdown smash are all
there in the data, but on video they read as small. The Burn, our Castle-Rock fire wall, sits off-screen for the whole
run unless you stumble. The chorus plays in the same room at almost the same framing as the pre-chorus.

**Next step (decisive):** spend one short pass putting **teeth, a skill-weighted reward loop and 3 wow moments** into
act 1. Then build **act 2 (bars 34–60)** around the song's best riff (the verse-3 boogie bass) as the **climb up the
Jimperial facade**. Scope at the end.

## How this was measured

- `npm run rubric` (the level data) and `--reports=` for the bot groups. The tool got two improvements in this pass
  (see the last section).
- **17 headless bot runs + 3 probes**, all `--dist=dist-review --out=playtest/out-review-<name>`:

  | Profile | Runs |
  |---|---|
  | autoplay (with video) | 1 |
  | skilled ±40 ms | 3 |
  | default sloppy ±85 + 10 % late | 5 |
  | ±110 + 20 % late | 3 |
  | ±130 (no late) | 3 |
  | ±130 + 20 % late | 2 |
  | ±160 + 20 % late | 2 |
  | ±220 | 1 |
  | ±280 | 1 |
  | every press 60–110 ms late (±40) | 1 |
  | lazy: skip all 84 rewards | 1 |
  | reckless: skip all 15 stumble threats | 1 |
  | forced death + stumble (video) | 1 |

- **Watched:** the autoplay video at 1 fps end to end, and 5 fps sheets of seven windows: intro 1–3, the launch into
  the rooftops 9–11, stop-time 13–16, the honky-tonk entrance 17–19, chorus 23–25, the walkdown and tag 29–31, and the
  turnaround and finish 32–33. Also full-resolution frames at bars 6, 10, 24 and 29, and the death → rewind → count-in
  sequence at bar 27.
- **Read:** `tunables.ts`, `player.ts` (slide), `game.ts` (grades, crowd, signs, launch), `camera.ts`, `director.ts`,
  `mix.ts`, `build.ts`/`dsl.ts` (geometry) and `slice.ts`.
- **Not done:** listening. The Playwright video has no audio, so the mix findings come from `audio/mix.ts`, the
  beat-map overlay calibration and the crowd traces. **A 5-minute listening check by a human is still owed.**

## Rubric scorecard (HEAD)

Blocks: bars 1–8 / 9–16 / 17–24 / 25–33. Gate items in **bold**.

| # | Criterion | Target | Measured | Status |
|---|---|---|---|---|
| **A1** | Reward share | ≥ 60 % (≥ 75 % in 1–16) | 75 % level; 86 / 77 / 71 / 69 % | PASS |
| **A2** | Lethal per bar | ≤ 0.5 verse, ≤ 1 chorus, 0 in 1–6 | 0.13 / 0.38 / 0.25 / 0.78 (adj 0.44); max 2 in a bar; none in 1–6 | PASS |
| A3 | Threats per bar | ≤ 1.5 (≤ 2.5 climax) | 0.38 / 0.75 / 1.0 / 1.22 | PASS |
| **A4** | Lethal on a strong accent | ≥ 90 % | 92 % (100 % with lift-run heads); stumbles on accents 93 % | PASS |
| A5 | 0 deaths at ±130 ms | 0 | 1, 0, 0 (the lift at beat 128) | FAIL (the good kind: it's the only bite) |
| A6 | Threat walls | ≤ 4 | 1 / 2 / 4 / 5 raw, 2 adj | PASS |
| A7 | Safe re-entry after checkpoints | clear | all 5 checkpoints clear | PASS |
| A8 | Teach before threat | 100 % | pits taught by pools (bar 6 → first pit bar 8), lifts by the pool run (bar 19 → bar 32) | PASS |
| **A9** | Sloppy ±85 + 10 % late | ≤ ~2 deaths / 32 bars, 0 in 1–16 | **0, 0, 0, 0, 0**; 1.0 stumbles/run | PASS |
| A10 | Hotspots | ≤ 20 % | no deaths | PASS |
| *A11* | *Teeth (new, informational)* | *a harsh bot dies ≥ 1 / 32 bars; ±85 ≥ 0.25* | *±85: 0 · ±110+20 %: 0 · ±130: 0.32 · ±130+20 %: 0 · ±160+20 %: 0* | ***WARN*** |
| **B1** | Novelty cadence | twist ≤ 8 bars | longest gap 6 bars; last new thing bar 32 (lethal lifts) | PASS |
| **B2/B3** | Repeats | ≤ 2 | 1 / 1 | PASS |
| B4 / B4r / B4h | Distinct bars / rhythms / hand patterns | ≥ 5 / 8 | 8/8 · 6–8 rhythms per block, 21 off-beat actions · 8/8 hand patterns | PASS |
| B5 | Verb balance | ≤ 60 %, lead verb changes | hop 45 → strike 58 → strike 50 → **strike 61 %**; lead changes 1 of 3 | FAIL |
| **B6** | Mode changes | ≤ every 16 bars, ≥ 6 modes | street, launch, rooftops, bar floor, lifts, bar top; 10 changes | PASS (on paper; see problem 4) |
| B7 | Lead lane changes | adjacent differ | kick → vocal → fills → shouts | PASS |
| **C1** | ρ(intensity, energy) | ≥ 0.7 | 0.95 | PASS |
| C2 | Valleys | ≥ 1 | 0 (one rising act; act 2 must open low) | FAIL |
| **C3** | Breather pairs | 1 per 16 bars | 9 pairs | PASS |
| C4 | Sawtooth blocks | ≥ 80 % | 4/4 | PASS |
| C5 | Phrase payoffs | ≥ 50 % | 7/8 (bar 28 has none) | PASS |
| C7 | Camera events | ≥ 1 / 8 bars | 4 / 5 / 3 / 10 (but small: see feel audit) | PASS |
| C8 | Spectacle cadence | a set-piece ≤ every 16 bars | by eye: **no set-piece reads as one** (see problem 4) | FAIL (manual) |
| **D1** | Actions per beat | ≥ 0.5 verse, ≥ 1 chorus | 0.69 / 0.81 / 0.88 / 1.00 | PASS |
| D3 | Emphasis matches the sound | ≥ 80 % | shouts struck 58 % (HUPs are hopped), boom hops 80 %, backbeat strikes 93 % | FAIL (by design; accepted) |
| D5 | Every success pays | 100 % | 28/28 | PASS |
| D6 | Distinct voices | all | not auditable without audio | MANUAL |
| E1 | Runway | ≥ 1.2 s | **1.29 s** (3.5 beats) after the framing fix; 1.46 s in the chorus | PASS |
| E3 | Clutter | ≤ 3 | 1 / 2 / 4 / 4 | FAIL (mild) |
| **Gate** | | | | **11 / 11** |

## Difficulty by player profile

| Profile | Runs | Deaths per run | Stumbles per run | Perfect / Great / Good / Miss | Crowd at the end | What a human like this feels |
|---|---|---|---|---|---|---|
| Autoplay | 1 | 0 | 0 | 100 / 0 / 0 / 0 % | 24 | — |
| **Skilled ±40 ms** | 3 | 0, 0, 0 | 0.33 (the knee-slide, see problem 3) | **99** / 0 / 0 / 1 % | 24, 24, 24 | Cruise control. Nothing to master and no score to chase; the lift run is the only moment of focus |
| **Sloppy ±85 + 10 % late** | 5 | 0 × 5 | 1.0 | 57 / 37 / 3 / 2 % | 24 ×4, 16 | Comfortable. Never in danger |
| ±110 + 20 % late | 3 | 0, 0, 0 | 0.67 | 43 / 39 / 14 / 3 % | 24 ×3 | Still never in danger |
| ±130, no late | 3 | 1, 0, 0 (lift at 128) | 1.33 | 39 / 34 / 24 / 3 % | 24 ×3 | One death, at the lift run |
| ±130 + 20 % late | 2 | 0, 0 | 0.5 | 39 / 32 / 24 / 5 % | 24, 24 | — |
| ±160 + 20 % late | 2 | 0, 0 | 3.5 | 36 / 25 / 26 / 13 % | 24, 24 | Stumbling often, never dying |
| All presses 60–110 ms late (the "no latency calibration" player) | 1 | 0 | 1 | 9 / 46 / 37 / 7 % | 24 | Fine: the windows absorb a mis-set audio latency |
| ±220 | 1 | 1 (gap, bar 16) | 5 | 23 / 23 / 24 / 30 % | 24 | — |
| ±280 | 1 | 1 (gap, bar 16) | 7 | 17 / 14 / 28 / 40 % | 18 | Still near FULL HOUSE with 40 % misses |
| **Lazy** (skips all 84 rewards) | 1 | **0** | **0** | 24 % hit / 76 % miss | 11 | Finishes the level having played a quarter of it |
| **Reckless** (runs into all 15 stumbles) | 1 | **0** | 15 | — | 14 | Stumbles never add up to a death: the Burn never arrives |

**Reading it.**

- **The lethal windows are enormous.** The DSL header says a gapHop is −120/+200 ms. In practice gaps survive ±160 ms
  plus 20 % extra-late presses (up to ~270 ms late), with the jump buffer and ledge assist absorbing the rest. The only
  death at ≤ ±160 ms is a slam lift.
- **The stumble threats bite, but gently.** Spikes, jabbers and low signs produced 1 stumble per sloppy run. Each costs
  ~0.5 beat, 5 re-grabbable tokens, 25 % of the crowd and a 4.6-beat surge back onto the grid. Nothing compounds.
- **The bot only models timing, never reading.** A real first-timer at 160 BPM will stumble more on unfamiliar shapes.
  That argues for keeping the windows generous and **putting the teeth into consequences and combinations** rather than
  into millisecond precision (problem 1).
- **The target band for iteration 3** is the middle between iteration 1 (±85 → 3 deaths per 32 bars, 7 worst case)
  and now (0):

  | Profile | Deaths per 33 bars |
  |---|---|
  | ±85 sloppy | 0.5–1.5 |
  | ±130 | 2–4 |
  | ±40 skilled | 0 |
  | Lazy (skips rewards) | should *lose*: visibly and audibly worse |

## Game-feel audit

| Aspect | Measured / read from code | Verdict |
|---|---|---|
| Input → action | 120 Hz sim; input edges timestamped and applied on their exact step. Strike startup 16 ms. Autoplay exec error mean 2.1 ms, max 4.2 ms. Live audio probe 2.5 ms | Excellent. Protect |
| Hop vs beat spacing | Tap = 0.91 beat of airtime, 91 px apex, ~350 px of travel (1 beat = 384 px), so it lands just before the next beat and chains per beat. Held 1 beat = 1.96 beats / 250 px. Buffer 170 ms, coyote 100 ms | Right for a per-beat pogo. The tap hop is only ~0.65 of Slim's height, which reads quick and low, fine at 160 BPM |
| Strike | Reach 170 px ahead, 250 px tall, active 170 ms, cancellable recovery; breakables take presses from ~−210 to +220 ms. Hitstop 55 ms (90 ms for a Heave), repaid by a 1.35× catch-up | Generous and reliable. The orange crescent is the best-looking effect in the game. Hits on bottles are small sparks with no weight; goons ragdoll nicely |
| Perfect / Great / Good / Miss feedback | Perfect: pitched chime, 12 gold sparks, +2 % zoom + speed lines (strikes). Great: sound + 7 green sparks. **Good: nothing.** **Miss: nothing** except −1 crowd. Grade text only with `?judge=1` | Too quiet. A human can't tell Perfect from Great and gets no signal for a miss. The crowd gives Good the same +1 as Perfect |
| Crowd / reward music | +1 per graded press, −1 per missed target, −25 % per stumble; section caps 10 / 14–16 / 17 / 19 / 24. The overlays reach full at crowd 12 (shouts, stomps); the cowbell is silent below 12 and full at 20. At full the overlays sit −7 / −9 / −14 dB under the record (`mix.ts`) | **Not a skill meter.** 20 of 22 timing runs end at 24. The lazy bot's 11 still puts shouts at −0.5 dB and stomps at −1.5 dB. The only chorus-exclusive layer (cowbell) is −14 dB under a −10.5 LUFS record: effectively inaudible. Our strike SFX is ~6 dB under the record, so stop-time "your hit is the sound" (bars 13–20) is doubtful. *Needs a listen* |
| Death → control | 0.6 s death, rewind card, 4-beat count-in (stick clicks, 4-3-2-1-HEY): **~2.3 s** measured on video (Rayman ~1.5 s) | Good, and on-brand (the rewind). Keep |
| What a death costs | Replay from the last checkpoint: 32 / 64 / 80 / 96 / 120. Worst case: a death at bar 16 replays bars 9–16 (~12 s; +13 s of wall time in the ±220 run). Crowd −25 % | Fair. The 8-bar gap 32 → 64 is the longest; fine if block 2 stays gentle |
| What a stumble costs | ~0.5 beat of knockback, 5 tokens (re-grabbable for 4 beats), −25 % crowd, a 4.6-beat surge. 15 stumbles in a row never kill | Toothless (problem 1) |
| What a missed reward costs | Nothing but −1 crowd, inside a capped meter | Rewards are optional garnish, not the game |
| Knee-slide | Sign spans beat+0.5 … beat+hold−0.12. The standing hurtbox clears it only ~0.057 beat after that. `headroom()` checks physics solids, **not signs** | **Bug-level unfair**: releasing ↓ more than ~23 ms before the note ends stands Slim up into the sign's tail (problem 3) |
| The Burn (chaser) | 2 beats behind = 768 px. The hero sits at 25 % of the screen (~443 world px from the left edge), so the Burn's edge is ~325 px **off-screen** and only shows after a stumble or death | The chase exists only as a hint text ("the film is BURNING behind you"). No pressure, no Castle-Rock flame wall |
| Camera | Zoom 0.95 × framing 1.14. Chorus zoom-out **−7 %** (the review asked for ~−18 %). Accent punches ≤ 4.5 %, snare punches 1 %. Vertical follow on launches works | Alive but timid. On the 5 fps sheets the chorus and verse frames are hard to tell apart |
| Runway | 1.29 s (3.5 beats) in verses, 1.46 s in the chorus; threats are readable (red pits, striped DUCK) | Good |

## Watching it (video notes)

- **Busy?** Moderately. The play band always has something: tokens, bottles on stools, a goon, a pit. The world behind
  is mostly *static* architecture: brown-on-brown buildings and a bottle wall, string lights, and small desaturated
  flyers in the upper screen. The honky-tonk has one bartender and **no patrons, no brawl**. Rayman's screen is busy
  because the *world* moves (jamming enemies, collapsing planks, a dragon). Ours is busy because the *pickups* are dense.
- **Readable?** Yes. This is the art pass's big win.
  - Red-glow pits read instantly.
  - The striped DUCK signs are unmistakable.
  - Goons have red cue tips.
  - Slim's orange pops off every background.

  Weak spots:
  - The bottom ~28 % of the frame is dead space (brick wall + audience silhouettes).
  - The spikes (a bucket of red cues) are ~30 px.
  - The checkpoint slates ("SC. 24") pass right over Slim's strike.
- **Does the world answer the music?** A little:
  - "HEY!" pops in the audience strip.
  - Light shafts and flashes come on accents.
  - The camera punches gently.

  None of it is big enough to feel on the stabs. The walkdown (bar 29), meant as "everyone slams", looks like four
  more bottle hits.
- **Spectacle?**
  - The **bar-9 launch** is the best moment: Slim rises, the sky turns neon, you smash bottles mid-air. But the arc is
    only ~150 px, the rooftops use the street's backdrop, and the drop back to the street at bar 12 is barely visible.
  - The **street → honky-tonk** cut is a hard panel wipe with a HONKY-TONK sign. It reads, but it's a cut, not a
    moment.
  - The **chorus launch onto the bar top** (bar 23) barely changes height or framing.
  - The **turnaround lift run over the red cellar** is the most exciting stretch on video: danger, rhythm and HUP HUP
    HEY together.
- **Does Slim look powerful?** He's ~140 px at 1080p. The strike crescent and the ragdolling goons sell power; the
  targets don't (small bottles, glasses, jugs). He never breaks anything *big*.
- **Transitions:** street → rooftops (launch) is good; rooftops → street is invisible; street → bar is a wipe; bar floor
  → bar top is invisible.
- **Action vocabulary in practice:** varied for the hands, samey for the eyes. **50 of 112 actions are breakables that
  look alike** (bottle, jug or glass on a stool), and strikes are 55 % of all presses (B5).
- **Text:** **12 hint banners in 33 bars** (one every 2.75 bars; the last at bar 32). Act 1 plays as a tutorial from
  start to finish.
- **Ending:** after the last launch Slim runs ~2.5 s through an empty bar before "END OF REEL 1" and the poster. Flat.

## Top problems, ranked by impact on fun

### 1. No teeth: nothing you do (or skip) has consequences (A11, lazy/reckless bots)
**Evidence:**
- 0 deaths from ±40 to ±160 ms + 20 % late.
- Only the bar-32/33 lift run has ever killed at ≤ ±160.
- The lazy bot finishes with 0 damage; the reckless bot takes 15 stumbles and 0 deaths.
- 13 lethal threats, but 12 of them are effectively decorative.

**Fix** (keep the windows human-friendly and add *consequence* and *combination*):
- **The Burn remembers.** Each stumble pulls the Burn 1 beat closer, and it relaxes 0.25 beat per clean bar. It must be
  **visible** (problem 4). Two stumbles close together means caught. Stumbles get a cost without adding one-hit deaths.
- **One real bite per block, at its peak bar:** 8, 16, 24 and 33. These are lethal *pairs* or *combinations*: a gap
  straight into a jabber (bar 16 already does this), a gap on 1 then a lift on 3, or a slide straight out into a gap.
  Each is taught earlier in the act as a single.
- **Tighten gap geometry** so a gapHop's slack is ~−110/+150 ms (widen the pits by ~0.1 beat). Keep A5 as "≤ 1 death
  per 32 bars at ±130".
- **Re-run the bots.**

  | Profile | Target deaths per 33 bars |
  |---|---|
  | ±85 sloppy | 0.5–1.5 |
  | ±130 | 2–4 |
  | ±40 skilled | 0 |

### 2. The reward loop is inaudible and doesn't measure skill (crowd, mix, grades)
**Evidence:**
- Crowd at the end = 24 for 20 of 22 timing runs, including ±220 ms with 30 % misses; 11 for a bot that skipped
  75 % of the game.
- Good = Perfect = +1.
- The overlays saturate at crowd 12, which is reached by bar ~10.
- The cowbell reward layer sits −14 dB under the record.
- Good and Miss have no feedback at all.

**Fix:**
- **Skill-weighted crowd.**

  | Event | Crowd change |
  |---|---|
  | Perfect | +1 |
  | Great | +0.5 |
  | Good | 0 |
  | Miss | −2 |
  | Stumble | −4 |
  | Death | −6 |

  Add a slow decay in bars with no hit. FULL HOUSE should need a near-clean chorus.
- **Make the music audibly follow the crowd.** A "projection booth" filter on the music bus (low-pass/high-pass +
  mono at crowd < 8, fully open at FULL HOUSE) is cheap (BiquadFilter), unmistakable, and doesn't fight the licensed
  record. Push the cowbell and stomps up at FULL HOUSE (−6 dB under, not −14).
- **Visible grades by default:** a small film-lettered stamp ("PERFECT") near Slim and a HUD **combo counter** (xN, reset
  on miss), plus a dull "thunk" SFX on a miss.
- **Poster:** show the combo and the Perfect %, so a skilled player has something to chase.
- Tighten Perfect to ±35 ms, so ±40 players earn Greats sometimes.

### 3. The knee-slide release window is unfair (the #1 stumble for every profile, including skilled)
**Evidence:**
- Low signs cause 8 of the 24 stumbles across the timing profiles.
- They are the *only* failure of the skilled bot: `lowSign@70.16`, bar 18.
- Bar 28 (`lowSign@109.5`) fails too.

Why: the sign spans `beat + 0.5 … beat + hold − 0.12`, but the hurtbox clears it only ~0.057 beat later. Releasing ↓
more than ~23 ms before the held note ends stands Slim up into the sign's tail, because `Player.headroom()` ignores
signs. Humans anticipate releases, so this will feel like a cheat.

**Fix** (`player.ts` + `build.ts`, ~10 lines):
- Treat sign rects as ceilings in `headroom()`, so Slim stays ducked while under a sign.
- End signs at `beat + hold − 0.35`.

### 4. No wow: the set-pieces don't read, and the chase is invisible (C8, B6 by eye, C7 magnitude)
**Evidence:**
- The walkdown smash (bar 29) = four stool-sized jugs.
- Launches rise ~150 px, and the rooftops reuse the street backdrop.
- The bar top (bars 23–26) is invisible as a height.
- The chorus zoom-out is 7 %.
- The Burn stays off-screen for the whole clean run.
- The honky-tonk is empty.

**Fix** (all presentation or data):
- **The Burn on screen:** its glowing edge lives at the screen's left 3–5 % (1.25–1.5 beats behind, or a glow-band proxy
  when farther). It flares on every kick and **lunges on the fills** (bars 4, 8, 12, 20, 30). This is our Castle-Rock
  fire wall: the chase is the level's constant drama.
- **Walkdown = the act's money shot:**
  - four **giant** kegs or crates (2×), stacked, one per quarter
  - splinters and a foam spray
  - 90 ms hitstop
  - 6–8 % zoom punches
  - the whole bar ducking
  - a crowd roar on the E (bar 30 b1)
- **Launches:** bar 9 up to a **250 px** rooftop with a −15 % zoom-out and a sky-flip on the apex, and a visible roof
  edge / fire-escape silhouette. The bar-23 chorus launch lands on a **bar counter that looks like a counter** (bottle
  rows at your feet, patrons ducking).
- **Chorus framing:** a −15 % zoom-out plus a lighting change (key spotlight, warm) so the chorus is visibly a
  different shot from the verse.
- **Honky-tonk life:** a background brawl and patrons who duck, cheer and throw on the HEYs. Goons you strike fly *into
  those patrons* or into the front row (DESIGN 6.1).

### 5. Act 1 is a tutorial from start to finish (12 hints in 33 bars)
**Evidence:** a text banner every 2.75 bars, still running at bar 32. Rayman's music levels teach with zero text,
through placement. The level already teaches safely: pools before pits, the safe lift run, jabbers first as stumbles.

**Fix:**
- Keep 3 icon hints, all in bars 1–4: run, hop/hold, strike.
- Show the rest only *after* a failure at that mechanic ("HOLD ↓" after a sign stumble).

### 6. The eyes see one object: bottles on stools (B5, D3)
**Evidence:** 50 of 112 actions are breakables that look alike; strike leads 3 of 4 blocks, 61 % in the chorus. HUPs
are hopped (58 % of shouts struck).

**Fix:**
- **Give each section its own breakable and one mover:**

  | Section | Breakables | Mover |
  |---|---|---|
  | Street | bottles | hats knocked off Bluffers |
  | Rooftops | neon letters / water-tower valves | — |
  | Bar | kegs | a jukebox |
  | Chorus | — | swinging lamps (pendulums) and **jamming goons** who dance on the backbeat and are harmless unless struck (Rayman's "jamming band": a reward target that moves to the music) |

- Make the rooftop block hop-led (rooftop gaps as *safe* chimney hops, B5).

### 7. Layout: the play band is thin and the lower 28 % of the frame is dead
**Evidence:** at 1080p the ground line sits at ~72 % of the height; below it are brick and audience silhouettes, and the
background is brown-on-brown.

**Fix:**
- Lower `groundFraction` to ~0.66, or make the audience strip *earn* its space: stand-up waves on FULL HOUSE, a thrown
  goon landing in it, big HEY letters. The audience is the streak meter; it should be the loudest thing on screen when
  you're on fire.
- Push the background's value down in the bar (the bottle wall competes with the tokens).

### 8. Small fairness and friction items
- **Checkpoint slates cover the strike:** "SC. nn" is drawn over Slim at bars 24 and 30. Draw it behind him or fade it
  when he's close.
- **The ending runs on empty** for ~2.5 s after the final launch. End the reel on the landing, or (when act 2 exists)
  launch straight into it.
- **E3 clutter reaches 4 threats in the runway** in the blocks 17–24 and 25–33. Acceptable at the chorus peak; don't exceed it in act 2
  before the final chorus.

## Protect this

- **Sync and tempo-map run speed on a live record:**
  - action error ≤ 4 ms
  - live probe 2.5 ms
  - beat map within 5.5 ms per 8 bars
  - holding right = riding the band
- **The economy's shape:** reward-first density, threats on the kick/HEY, pools before pits, a safe lift run before
  the lethal one, clear checkpoint re-entry. Add teeth *on top*; don't remove rewards.
- **The danger language:** red-glow lethal, striped stumble, gold reward. Everything was readable even in the
  320 px thumbnail sheets.
- **The strike crescent and goons ragdolling off**, and HEY popping in the audience.
- **The bar-9 launch into neon** and the **turnaround lift run over the red cellar with HUP HUP HEY**: the two best
  moments. Build act 2's set-pieces in their image.
- **Death → control in ~2.3 s** with the film rewind and a musical count-in.
- **Generous late-side windows:** the all-late (uncalibrated latency) bot cleared with 1 stumble. Keep it that way;
  put the teeth in consequences, not in ms.
- **Tooling:** `npm run rubric` + bot profiles (lazy/reckless via `--miss=<beats>` are cheap and revealing; add them
  to every review).

## Plan-ahead: acts 2 and 3 on the original's structure

The edit (`original_edit.md` §3) gives 53 more bars. Energy per bar (beat map `energy.intensity`):

- verse 3 34–49: .44–.93, peaks at 41 (.93) and 36/39 (.70)
- pre-chorus 50–51: .48 / .82
- chorus 3 52–59: .70–.85
- tag 60: .65
- **breakdown 61–68: .32–.52, then bar 68 = 1.00**
- chorus 4 69–76: .59–.90
- tag 77: .49
- outro 78–85: .54 → .26
- final hit: bar 86 beat 1

The lanes that matter:
- `verseBoogie` bass walks in bars 34/36/38/40 (two bars each)
- fills in almost every bar 34–41
- `bassOut` stop-time 44–47
- sustains at 45, 48, 49, 56, 60–62, 77, 79, 81, 85
- HUP HUP HEY 200–202 (bar 51)
- HEY 209/210 (bar 53) and 218 (bar 55)
- `hookWalkdown` 57–59 and 74–76
- `breakdownPickup` at 62, 63, 65, 68
- the tag (`hookB`) every 2 bars in the outro (78, 80, 82, 84, 86), each answered by a HEY at 317, 325, 333 and 340/341

| Edit bars | Music | Set-piece (DESIGN) | Why it fits the recording |
|---|---|---|---|
| **34–41** | verse 3, **boogie walking bass** | **The building climb**, moved earlier: up the Jimperial facade by fire escapes, **one landing per 2-bar bass walk** (the bass literally climbs). Hops on the walking bass, strikes on the fill accents. **First moving threat: bottles thrown from windows**, shadow-telegraphed and landing on the kick | The song's most riff-like 8 bars, and a vertical mode (B6: ≥ 2 vertical stretches) at the start of the act that C2 says must open low (≈ .44–.70) |
| 42–43 | verse 3 | breather on a landing; checkpoint 41 | — |
| **44–47** | **stop-time (bass out)**, held notes 45, 48 | **"Fill the hole":** X · rest · X big single hits, smashing neon letters and windows on the stops. **Big Jim's first glint**: his aviators in a penthouse window flash on 46 (versePeak). Knee-slide along a gutter on the held note | Stop-time is the recording's own "only your hit is heard" moment (D4); keep it free of threats that need another verb |
| 50–51 | pre-chorus 3, **HUP HUP HEY** 200–202 | the second Hup-Hup-HEY: **the Heave smashes through a window** into the Blacklight Lanes; a launch on 52 b1 | The motto stays rare: once per pre-chorus |
| **52–59** | chorus 3 (A7 climb, HEY 209/210/218, walkdown 57–59) | **Blacklight Lanes brawl:** rolling bowling balls (hop, rumble telegraph) on the kick, **Bluffer pairs on HEY HEY 209/210**, lifts that are pinsetters (the lift rhythm re-skinned = "Elevate"), walkdown = four giant pins | Chorus 3 must top chorus 1: a new combination (lift + strike, ball + jabber), not a new mechanic |
| 60 | tag 3 | breather, checkpoint | — |
| **61–68** | **breakdown vamp** (E, stomp; energy .32–.52; chromatic pickups 62/63/65/68) | **The valley + the Rack.** Reward-heavy **Bench Flips** or catapult arcs on the pickups (the stomp moment, 100 % reward for 4 bars), then the Rack staircase climb in 65–68 with the tension rising | C2's valley, and the only vamp in the song. Nothing lethal in 61–64 |
| **68 b4 → 69 b1** | pickup fill → **chorus 4 downbeat** (energy 1.0) | **The break shot on the "silent" beat → the drop.** The record has no silent beat, so make one: a **tape-stop/film-slip** of the record on 68 b3.5 (the conductor already supports tape-stop), cigarette burns on 68 b1–3, your single KRAK on 68 b4, and the record slams back in on 69 b1 via `play(fromSongTime)` | The film conceit sells the "we stopped the song" trick; it's the level's biggest "I'm performing it" moment |
| **69–74** | chorus 4 (role reversal), **6 bars** before the walkdown | **SIGN FALLS: B-I-G J-I-M topple one letter per downbeat, 69, 70, 71, 72, 73, 74.** Exactly six bars for six letters. Run the tops, knee-slide down each falling letter on the sustains, hop post to post on the HEYs | The domino-per-downbeat maps 1:1 onto the recording |
| 74–76 | hook walkdown | climb the fallen letters to the penthouse; **crash through the glass on 76 b4** | The last "everyone slams" |
| 77 | tag 4 (held note) | **Big Jim's reveal:** the bluff display and crash zoom on the sustain | Energy drops (.49): a spectacle, not a test |
| **78–81** | outro, tag on 78 and 80, HEY answers (317) | **Gauntlet on Big Jim** as call and response: his fists slam (lift rhythm) on the tag, **you answer the HEY with a power shot**, and each crack takes a lens. The hardest 4 bars | The outro's tag is the call; the overlay HEY is the answer |
| 82–85 | outro decays (.49 → .26), tag on 82 and 84, HEY 325 and 333 | **Breath + Iris Out:** pull out to the theatre, sprocket hops, then iris blades as platforms (can't die) | Low energy suits the breath; no new learning after 73 |
| **86 b1** | **final hit** (gang HEY + crash, baked into the edit) | **The iris slams on Big Jim's face** with your power shot on 340 | The edit ends exactly there |

Checkpoints every ~8 bars: 34, 41, 52, 61, 69, 77, 82. Act-level intensity map:

| Bars | Section | Intensity (1–5) |
|---|---|---|
| 34 | verse 3 | 3 (valley start) |
| 41 | verse 3 | 4 (peak) |
| 44–47 | stop-time | 2 |
| 52–59 | chorus 3 | 4 |
| 61–64 | breakdown | 1–2 |
| 65–68 | the Rack | 3 → 4 |
| 69–76 | chorus 4 | 5 |
| 77 | tag 4 | 2 |
| 78–81 | gauntlet | 5 |
| 82–86 | breath + iris | 1 |

The chorus-4 spectacle comes before the hardest bars (78–81), as in Mariachi.

## Recommended next iteration (3): "Teeth, voice and wow in act 1 → act 2 bars 34–60"

**Do first (about 1/3 of the effort; ship to the user for a playtest before act 2 is merged):**

1. **Slide fix** (problem 3).
2. **Teeth** (problem 1):
   - the Burn remembers stumbles and is visible;
   - one lethal combination at each block peak (bars 8, 16, 24, 33);
   - gap slack ~−110/+150 ms.

   Gate with A11 PASS:

   | Profile | Deaths per 33 bars |
   |---|---|
   | ±85 | 0.5–1.5 |
   | ±130 | 2–4 |
   | ±40 | 0 |
3. **Skill-weighted crowd + audible reward** (problem 2):
   - weights P/G/Good/Miss = +1 / +0.5 / 0 / −2;
   - the projection-booth filter;
   - cowbell/stomps up at FULL HOUSE;
   - grade stamps and a combo counter on by default;
   - the combo on the poster.

   Check: the lazy bot must end below crowd 6, and FULL HOUSE needs ≥ 80 % Perfect/Great in the chorus.
4. **Three wow moments on existing beats** (problem 4):
   - the visible Burn with fill lunges;
   - the giant walkdown smash in bar 29;
   - a bigger bar-9 launch plus a −15 % chorus shot with its own lighting.
5. **Cut the hints to 3 icons**, failure-triggered after that (problem 5).

**Then build act 2 (edit bars 34–60, ~40 s)** from the plan-ahead table:
- the facade climb on the boogie bass, with thrown bottles as the first moving threat;
- the stop-time window smashes and Big Jim's glint;
- the pre-chorus Heave through the window;
- the Blacklight Lanes chorus 3 (balls, Bluffer pairs on 209/210, pinsetter lifts, giant-pin walkdown);
- the tag breather.

Act 2 must open *lower* than act 1's end (C2 valley at 34, 44–47) and peak harder than chorus 1 (±85 bot ~1 death per
act). Each section gets its own breakable, and ≤ 2 hints total.

**Defer:** the breakdown/Rack, the drop tape-stop, Sign Falls, Big Jim and the Iris Out (act 3), Little Jims, the D6 SFX
voice audit (do the human listen first), and the results-poster rework beyond the combo line.

## Rubric tool changes in this pass (`playtest/rubric.mjs`)

- **E1 runway now uses the render framing** (`camera.ts` `FRAMING`: zoom ×1.14, hero at 25 %), which is what the player
  actually sees: 1.29 s in verses, not 1.38 s.
- **New informational A11 "Teeth"** (from `--reports`): deaths per 32 bars for the ±85 sloppy group and every harsh
  group (≥ ±130 ms or ≥ 20 % late). WARN when no harsh bot dies ≥ 1 per 32 bars or the sloppy bot dies < 0.25 per 32 bars.
  It is not in the top-10 gate, but the next level pass should turn it green.
- Suggested bot profiles for every future review:
  - `--jitter=40` (skilled)
  - `--sloppy` ×5
  - `--jitter=130`
  - `--jitter=160 --late=0.2`
  - `--late=1 --jitter=40` (uncalibrated latency)
  - lazy: `--miss=<all failKind none beats>`
  - reckless: `--miss=<all stumble beats>`
