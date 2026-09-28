# Fun review: iteration 3 (acts 1 + 2 on the original recording, edit bars 1–60)

*Reviewer pass against `docs/FUN_RUBRIC.md`, 2026-09-29. Build: HEAD `91a0afa`. Level: `src/level/index.ts#gameLevel`
(act 1 `slice.ts` + act 2 `act2.ts`), song `jim_edit`. Bar numbers are **edit bars, 1-based** (bar n starts on beat
4(n−1)). The rubric tool's own tables are 0-based: its "bar 40" is edit bar 41.*

## Verdict

**Iteration 3 fixed act 1's two big holes: it now has teeth and a reward loop you can see.** Skill shows:

| Profile | Perfect | FULL HOUSE | Deaths in act 1 |
|---|---|---|---|
| ±40 ms | 89–96 % | 66 beats | 0 |
| ±85 ms sloppy | ~42 % | 18–30 beats | 0.6 |
| ±130 ms | ~30 % | never | 2.6 |

Skipping the game no longer works either: the lazy and reckless bots are eaten by the Burn at bars 11–12. The Burn is on
screen, the walkdown lands with comic-book KRAK! SMASH! words, the bar-9 launch reveals the city, and the grade stamps
and combo counter make every hit legible.

**Act 2 is the problem.** It is:

- **Harder in the wrong way.** It breaks act 1's own fairness rule: the late side of a lethal window stays ≥ +150 ms.
  An uncalibrated-latency player clears act 1 with 0 deaths (3 of 3 runs), then dies **6–11 times** in act 2. One gutter
  (beat 208) killed one run 8 times.
- **Harsh on stumbles.** The thrown bottles' +70 ms late window produces 83 % of all sloppy-bot stumbles. Those feed
  Burn catches in the climb peak.
- **Act 1 reskinned.** The same skeleton in the same order:

  | # | Beat in the act |
  |---|---|
  | 1 | Launch |
  | 2 | Stop-time |
  | 3 | Safe lifts |
  | 4 | Hup-Hup-HEY into a goon |
  | 5 | Launch into the chorus |
  | 6 | Goons on the HEYs |
  | 7 | Lethal lifts |
  | 8 | DUCK sign |
  | 9 | Four giant smashes on the walkdown |
  | 10 | Tag |

- **Flat and dim on screen.** The "climb" rises 790 px over 12,300 px of run (a ~6 % slope in 50 px steps). The camera
  re-centres every step, so bars 34–49 are 23 s of one composition: a ledge in front of a brick wall. The Blacklight
  Lanes chorus, the level's peak, is its darkest and emptiest screen.

On the rubric the whole 60 bars score **9/11 on the gate**. C1 fails (ρ 0.30: act 2's verse is as intense as act 1's
chorus) and A9 fails (a 3-death Burn loop in bars 40–41).

**Decision:** iteration 4 = **act 3 (the climax, bars 61–86) + a short fairness-and-verticality pass on act 2**, with
the act-2 set-pieces re-choreographed, not just re-tuned. Details at the end. The user has not played iterations 2 or 3.
**Put bars 1–60 in front of them now, in parallel.** Their verdict outranks everything below.

## How this was measured

- **Rubric:** `npm run rubric -- --level=src/level/index.ts#gameLevel` over the whole level and per act (`--bars=1-33`,
  `--bars=34-60`), with `--reports=` for all the bot runs. Output is in `playtest/out-review-rubric-*`.
- **Slack meter:** `node playtest/slack.mjs --level=src/level/index.ts#gameLevel --profiles` (lethal windows with the
  real controller).
- **27 headless bot runs** (`--dist=dist-review --out=playtest/out-review-<name>`):

  | Profile | Runs |
  |---|---|
  | Autoplay (video, 1 s shots) | 1 |
  | Skilled ±40 | 3 |
  | Sloppy ±85 + 10 % late | 5 |
  | ±130 | 5 |
  | ±160 + 20 % late | 1 |
  | Uncalibrated (±40, every press +60–110 ms late) | 3 |
  | Lazy (`--skip=none`) | 3 |
  | Reckless (`--skip=stumble`) | 3 |

  The lazy and reckless bots are deterministic: their three seeds are identical.
- **Watched:** 5 fps contact sheets of 15 windows:

  | Window | Bars |
  |---|---|
  | Launch | 8–10 |
  | Pre-chorus / chorus shot | 21–23 |
  | Walkdown | 27–29 |
  | Act seam | 32–34 |
  | Climb | 35–41, three sheets |
  | Counterweight launch | 37–38 |
  | Stop-time | 43–45 |
  | Big Jim glint | 45–47 |
  | Pre-chorus + window crash | 49–51 |
  | Lanes | 51–53, 54–56, 56–60 |

  Plus full-resolution frames at bars 9, 22, 35, 37, 39, 45, 46, 52, 54 and the end poster.
- **Audio:** `node src/audio/lab/mixlab.mjs --out=playtest/out-review-audio` → `tools/music/mix_report.py`. The mix was
  measured, not listened to.

## Rubric scorecard

Blocks are the rubric's 8-bar blocks. Where the whole-level and per-act runs disagree, both are shown. Gate items are in
**bold**.

| # | Criterion | Act 1 (1–33) | Act 2 (34–60) | Status |
|---|---|---|---|---|
| **A1** | Reward share | 75 % (82 / 75 / 75 / 69) | 68 % (71 / 80 / 60) | PASS |
| **A2** | Lethal per bar | 0.25 / 0.5 / 0.38 / 0.89 (adj 0.56) | 0.5 / **0** / 0.55 (adj 0.36); max 3 in bar 54 | PASS |
| A3 | Threats per bar | 0.5 / 0.88 / 0.88 / 1.22 | 1.25 / 0.63 / 1.64 | PASS |
| **A4** | Lethal on a strong accent | 94 % | 80 % (90 % with lift heads); off-strong: gap-long 153 (bar 39 b2), pinsetter 213 | PASS (act 2 marginal) |
| A5 | 0 deaths at ±130 | ±130 deaths per run: 12, 4, 0, 6, 2 | | FAIL (by design since iter 3; the variance is the issue, see problem 3) |
| **A9** | Sloppy clears | deaths per run 4, 1, 2, 1, 0 (1.6 per 60 bars); 0 in bars 1–16 | sl-1 dies 3× in bars 40–41 | **FAIL** (the ≤ 1-per-block rule) |
| A10 | Hotspots | gap 208 (bar 53) and gap 162 (bar 41) at 25 % each of sloppy deaths; the uncalibrated bot died 11× at beat 208 | | FAIL |
| A11 | Teeth | ±85: 0.85 deaths / 32 bars · ±130: 2.6 · ±160+20 %: 10.7 · uncalibrated: 4.3 | | PASS |
| **B1** | Novelty cadence | longest gap 6 bars | longest gap 6 bars | PASS |
| **B2/B3** | Repeats | 1 / 1 | 1 / 1 | PASS |
| B4 / B4h | Distinct bars / hands | 8/8 per block | 8/8, 8/8, 11/11 | PASS (inside an act; **across acts, see problem 2**) |
| B5 | Verb balance | strike leads **every block of both acts**: 45–65 %, 0 lead-verb changes in 60 bars; 120 of 218 actions are strikes | | FAIL |
| **B6** | Mode changes | 6 modes, 10 changes | 7 modes, 9 changes | PASS on paper ("climb" does not read as vertical) |
| B7 | Lead lane | kick → vocal → fills → shouts | bassWalks → vocal → shouts | PASS |
| **C1** | ρ(intensity, energy) | 0.95 | 0.87 | **whole level 0.30: FAIL** |
| C2 | Valleys | 0 | 1 (stop-time 42–49, intensity 2.9) | FAIL level (first valley at 1:01) |
| **C3** | Breathers | 7 pairs in bars 5–20, **1 pair in 21–36** | 4 pairs | PASS (thin around the act seam) |
| C4 | Sawtooth | 4/4 | 2/3 (the chorus block peaks on bar 54, mid-block) | FAIL |
| C5 | Phrase payoffs | 7/8 | 3/6 (36, 44, 48 lack one) | PASS |
| C6 | Hit / shift points | 6/6 | 2/3 section starts | FAIL (act 2) |
| C7 | Camera events | 4 / 6 / 3 / 10 | 6 / 3 / 11 | PASS (small in practice) |
| C8 | Spectacle | by eye: launch 9, chorus shot 23, walkdown 29 read | glint 46, window crash 51, lanes 52, giant pins 58 read small; see problem 4 | MANUAL: act 2 FAIL |
| **D1** | Actions per beat | 0.69 / 0.88 / 0.88 / 1.0 | 1.06 / 0.78 / 1.02 | PASS |
| D3 | Emphasis matches the sound | shouts struck 50 % | shouts struck 67 % | FAIL (accepted) |
| E1 | Runway | 1.29–1.46 s | 1.34–1.43 s | PASS |
| E3 | Clutter | 4 in the chorus runway | 4 in the lanes | FAIL (mild) |
| **Gate** | | 10/11 | 10/11 | **whole 60 bars 9/11** (C1, A9) |

## Difficulty by player profile, per act

Deaths per run, act 1 / act 2. Stumbles are per run.

| Profile | Runs | Act 1 deaths | Act 2 deaths | Stumbles (act 1 / act 2) | Perfect % | FULL HOUSE beats · crowd at the end | What a human like this feels |
|---|---|---|---|---|---|---|---|
| Autoplay | 1 | 0 | 0 | 0 / 0 | 100 | 67 · 23 | — |
| **Skilled ±40** | 3 | 0, 0, 0 | 0, 0, 0 | 0 / 0 | 91–96 / 89–93 | 66 · 23 | Clean first try. The combo **never breaks** (214/214 in all 3), so the only thing left to chase is Perfect % |
| **Sloppy ±85 + 10 % late** | 5 | 1, 0, 1, 1, 0 (**0.6**) | 3, 1, 1, 0, 0 (**1.0**) | 0.2 / **2.2** (10 of 11 act-2 stumbles are thrown bottles) | 42 / 39 | 18–30 · 16–23 | Act 1 is right on target. Act 2 is noticeably harsher, all of it in two spots: the bars 40–41 Burn loop and the 208 gutter |
| **±130** | 5 | 8, 1, 0, 2, 2 (**2.6**) | 4, 3, 0, 4, 0 (**2.2**) | 0.4 / 3.2 (balls 7, bottles 6, firebombs 3) | 30 / 29 | **0 · 4–13** | Mean on target. One run died **8 times in the act-1 chorus** (early-side pits at 85, 93, 95, 107) |
| ±160 + 20 % late | 1 | 2 | **18, then DNF** (stopped at 20 deaths in bar 41) | 0 / 20 | — | 0 · 3 | Act 1 is survivable; act 2's climb is a Burn wall: 14 catches in bars 35–41 |
| **Uncalibrated** (±40, every press 60–110 ms late) | 3 | **0, 0, 0** | **11, 6, 7** | 0 / 3–14 | 0–3 / 2–3 | **0 · 3 (the booth all game)** | Act 1 is fine; act 2 is a cliff. Gutter 208: 11 of 24 deaths. The Burn after bottle stumbles: 9 more |
| Lazy (skips every reward) | 3 (identical) | ×12 at bars 11–12 | — | — | — | 0 · 3 | Can't finish. **Good: rewards matter now** (a missed reward pulls the Burn 0.2) |
| Reckless (eats every stumble) | 3 (identical) | ×12 at bar 12 | — | 26 | — | 0 · 3 | Can't finish. Good |

What a death costs:

| Run | Wall time vs a clean run (94.8 s) | Per death |
|---|---|---|
| sl-1 | 141 s | ~11.5 s |
| j130-1 | 183 s | ~7.4 s |

**Slack meter (lethal windows, early/late ms)** explains the act-2 cliff:

| | Act 1 | Act 2 |
|---|---|---|
| Late side of every pit | **+150 … +235** (as the iteration-3 rule demands) | **+110 … +125** at 160, 162, 200, 208, 224 (+140 at 153, +175 at 140) |
| Bat window | — | thrown bottle **−210/+70** |
| Early side | chorus pits −60 … −80 (94 is −60, 98 and 106 are −65) | — |

- The act-1 chorus's tight early sides are what kill the ±130 bot in bursts.
- The slack meter predicts physics-only deaths for the uncalibrated profile: 0.00 in act 1 and 0.57 in act 2. The real
  bots die 8× more in act 2, because a late ball hop at 207 compounds into a late gutter hop at 208, and bottle stumbles
  feed the Burn.
- Tool note: slack.mjs lists every `thrown@…` as "strike target unreachable on the beat". Thrown bottles are runtime
  mechanics it doesn't simulate, so this is a false positive.

**Where the deaths are:**

| Act | Where | What |
|---|---|---|
| 1 | bars 22–24 | HUP pit 84, the bar-24 peak pits 92 / 94 |
| 1 | bars 25–28 | tight pits 98, 106, 108 |
| 1 | bars 32–33 | lifts 127–128 |
| 2 | bars 36–41 | the climb: gaps 141, 154, 160; Burn catches 158–163 |
| 2 | bar 51 | HUP gap 200 |
| 2 | bar 53 | gutter 208 |
| 2 | bar 54 | pinsetters |
| 2 | bar 57 | peak gutter 224 |

Bars 1–21 and the whole stop-time block (42–49) never kill anyone below ±160. That's correct.

## Watching it

### Readability

**Good, and the danger language holds in the new act:**

- **Thrown bottles are the best new read.** One beat ahead the window lights and a goon leans out with a red bottle,
  then a dashed arc runs to a red crosshair at the bat point.
- Firebombs get a red ring on the landing spot.
- Pits are red-glow.
- DUCK signs are unmistakable.

**Weak spots:**

- **The lanes' gutters and the pinsetter pit read dark** (dim maroon on black), not the lacquer-red the rest of the
  level trained.
- The pins and the bowling ball are small (~25–30 px at 720p).
- The facade uses the honky-tonk's **striped DUCK sign** as a window-washer's plank. It reads, but it's the same object
  on a building wall.

### Spectacle

**Act 1's wow moments now land:**

- **Bar 9 launch:** the camera lifts with Slim over the neon skyline.
- **Walkdown (bar 29):** giant kegs, KRAK! / SMASH! / WHAM! / KA-BOOM! words, the crowd strip waving, a white flash.
- **The Burn's lunges:** the left edge flares white-hot on the fills, 18 per clean run.

**Act 2's are too small to register:**

- **Big Jim's glint (bar 46)** is a window-sized fig silhouette with an aviator sparkle and a grin: about the size of one
  window. The camera doesn't acknowledge it. It sits in stop-time, a musical hole, the best-timed reveal in the level,
  and it's easy to miss.
- **The window crash (bar 51)** is a goon in a lit doorway, a white puff and a vertical wipe to the Lanes.
- **The counterweight launch (bar 38)** is only visible as a camera hop. The framing snaps back to the same ledge line.
- **The lanes launch (bar 52)** doesn't read as a launch.
- **The giant-pin walkdown (bar 58)** repeats the keg walkdown with STRIKE! / TURKEY! words. Fun, but it's the second
  time.

### Busy-ness and variety for the eyes

- **Act 1 is busy:** street, rooftops, honky-tonk, each with its own props.
- **The facade is busy in a different way.** Silhouettes dance in lit windows and laundry hangs on lines. But:
  - it's **one wall for 16 bars**;
  - the lower 35 % of the frame is black void (no street below, so no height);
  - everything happens on one horizontal line at 2/3 of the screen height.
- **The Lanes are the emptiest scene in the game**, which matters most because they're the chorus:
  - dim purple, three framed posters (planet, bolt, pins), spotlight cones;
  - a thin lane strip, a few small pins, one or two goons;
  - no bowlers, no scoreboard, no glowing lane.

### The facade climb (the specific question): does it feel vertical?

**No.**

| Measure | Value |
|---|---|
| Ascent | 790 px (street → roof ledge) over bars 34–41 = 32 beats = 12,288 px of run |
| Slope | ~6 % |
| Steps | 50 px, a third of Slim's height |
| Springboard (bar 38) | +200 px, the only big rise |

Why the camera erases the rise: it tracks the last ground height (`camera.ts` `targetYForGround`), so each step is
re-centred within ~0.3 s, and the ground line stays at the same screen height the whole time. Nothing on screen shows the
drop: under the ledge there is only black, with no street, no cars, no receding lights. On the contact sheets bars 35 and
41 are indistinguishable except for window colours. **It reads exactly like the screenshots the user complained about:
a walkway along a wall.**

### Camera life

| Moment | Framing |
|---|---|
| Launch reveal | Lively |
| Chorus shot | Lively |
| Walkdown punch-ins | Lively |
| Facade | Holds one framing, apart from the springboard hop |
| Lanes chorus (zoom 0.8 per the plan) | Barely different from the verse on the sheets |

### Does Slim look powerful?

In act 1, yes: the strike crescent, ragdolling goons, and big comic words on the giant smashes. In act 2 he is a small
orange figure against a huge wall, then in a dim room. The bats against thrown bottles are the most "powerful" beat
there, and the batted bottle flies back up small.

### HUD

It helps more than it clutters.

- **The combo counter** (big, top right, `x214`) is readable and motivating.
- **PERFECT! stamps** trail behind Slim, so they don't cover the runway. In air-strike sequences two or three stack over
  his head (bar 46).
- **Crowd:** the number + bar + "FULL HOUSE!" label is clear. The label overlaps the Lanes' STRIKE!/SPARE? poster
  (cosmetic).
- **Text:** 5 hint banners in 60 bars (3 in act 1, 2 in act 2) — fine.
- **Poster bug:** the end poster shows **"BOTTLES & CRATES 102 / 95"**. The count exceeds the total; thrown bottles or
  giants are counted but not in the total. The combo peak isn't on the poster.

## Audio (measured; the mix report)

The offline render of the real graph passes every technical check:

| Check | Measured |
|---|---|
| Limiter at FULL HOUSE | max GR 1.35 dB (1.59 in the journey); beat-locked modulation 0.18 dB (no pumping) |
| True peak | ≤ −0.17 dBTP |
| HF clicks | −62 dBFS worst (−42 dB under the tone) |

**The reward curve is steep and monotonic** (integrated LUFS, chorus 1):

| Crowd state | LUFS |
|---|---|
| Booth (crowd 3) | −18.6 |
| Crowd 10 | −15.1 |
| Open (14) | −14.3 |
| FULL HOUSE | −13.2 |
| FULL HOUSE with a bell on every beat | −12.5 |

The booth is spectrally drastic, not just quieter:

| Band | Booth vs open |
|---|---|
| 63 Hz | −52 dB |
| 125 Hz | −32 dB |
| 250 Hz | −14 dB |
| 5.6 kHz | −14 dB |
| 8 kHz | −17 dB |
| Stereo side (side − mid) | −27 dB, vs −13 dB open |

At FULL HOUSE the overlays sit, each in its own band during its hits:

| Overlay | vs the record |
|---|---|
| Cowbell | −3.7 dB |
| Claps | −2.1 dB |
| Stomps | −4.9 dB |
| Shouts | +5 dB, in the gaps |

Iteration 2's "−14 dB, inaudible cowbell" problem is solved.

Stage SFX vs the music (median):

| Sound | Level |
|---|---|
| Perfect bell | −7.1 dB (max −0.6) |
| Great | −11.2 dB |
| Miss thunk | −6.0 dB |
| Stumble "ooh" | −9.3 dB |
| Checkpoint click | −4.4 dB |
| FULL HOUSE cheer | −7.8 dB |

The hierarchy is sensible: a miss is louder than a Great and quieter than the checkpoint.

**Sanity concerns (from the bot crowd traces, not the lab):**

1. **Most players will hear the booth most of the time.**
   - The crowd starts at 3, so the song's intro plays through a 320 Hz–3.4 kHz horn for everyone.
   - A 100 %-Perfect player is at 10 on bar 9 and 13.6 through verse 1 (capped at 14–15), so the record isn't fully open
     until the pre-chorus.
   - The ±130 player ends at 4–13 and never reaches FULL HOUSE.
   - The uncalibrated player sits at **3 for the whole level**: Goods earn 0, decay is 0.4 per beat.

   This is the risk of "the music is the reward": for a first-time player it can read as *broken audio*, not *a reward
   withheld*.
2. **FULL HOUSE arrives 2–3 bars after the chorus downbeat even for a perfect player.** It lands at beat ~96–100, bar
   25, because the pre-chorus cap is 16 and the meter climbs +0.6 per beat net. The chorus drop, the song's biggest
   natural reward, is never the moment the house fills.
3. **The act seam drops FULL HOUSE → 16 in one bar** (the verse cap at beat 132: 23.9 → 15.6). The overlays pull back
   exactly as a new act starts. That can feel like being punished for entering act 2.
4. **Not covered by the lab:**
   - act 2 (stop-time 44–47, where "your hit is the only sound"; the Lanes chorus);
   - the core verb SFX: strike, smash, giant smash, hop, token pickup vs the record;
   - act 2's whistle and rumble telegraphs, which are still windup/clack placeholders.

**A human must listen for (10 minutes, headphones, then a TV or Bluetooth speaker):**
*(Superseded in iteration 4 by `docs/reviews/audio_checklist.md`: these ten plus act 2's mechanic sounds and act 3,
each with a `?start=` URL and what "good" sounds like.)*

1. The first 8 bars at crowd 3. Does the booth sound like an old projector (charming) or like a bug?
2. Booth → open over verse 1. Is the opening-up noticeable as "I did that"?
3. The chorus 1 downbeat. Is there a lift, even before FULL HOUSE?
4. The FULL HOUSE moment (bar ~25). Cheer + cowbell + claps: exciting or cluttered over Croce's vocal?
5. Perfect bells ping-ponging up the chord over a 20+ combo. Pleasant or a music box on top of the band?
6. The miss thunk + film snag (pitch sag): funny or nauseating when three come in a row?
7. Stop-time bars 13–20 and 44–47. Is the strike/smash SFX actually the foreground sound in the holes?
8. The seam at bar 34. Does the FULL HOUSE → 16 drop read as a scene change or a penalty?
9. Thrown-bottle whistle and ball rumble. Do you *hear* the telegraph 1 beat ahead?
10. Latency. On a Bluetooth speaker, does the game feel late? The uncalibrated bot's numbers say act 2 becomes
    unplayable.

## Pacing across the 60 bars

### Intensity vs song energy

Rubric intensity by 8-bar block (whole-level run):

| Block (bars) | Section | Intensity | Energy |
|---|---|---|---|
| 1–8 | intro | 4.0 | .45 |
| 9–16 | verse 1 | 4.4 | .71 |
| 17–24 | verse 1 | 4.4 | .71 |
| 25–32 | chorus 1 | 4.6 | .72 |
| 33–40 | verse 3 | **4.8** | **.62** |
| 41–48 | verse 3 | **3.4** | .62 |
| 49–56 | chorus 3 | **6.0** | .73 |
| 57–60 | chorus 3 | 3.5 | .73 |

- Act 2's climb (bars 34–41) is **more intense than act 1's chorus** on a quieter part of the song. ρ over 60 bars is
  **0.30**.
- The first real valley (stop-time, bars 42–49) comes at **1:01**. Before it:
  - bars 21–41 are continuous peak material (the pre-chorus, chorus 1, the lethal lift run, straight into bottles and
    alley gaps);
  - they contain **one breather pair in 16 bars**;
  - the act seam (bars 32–35) has no breath at all.
- Rubric's rule: after a section peak, ≥ 2 breather bars.

### Novelty timeline

Something new every ≤ 6 bars in both acts (B1). By act:

| Act | New things |
|---|---|
| 1 | pools (6) · pits (8) · big launch (9) · rooftops · goons (12) · pendulums (13) · honky-tonk (17) · knee-slide (18) · safe lifts (19) · Hup-Hup-HEY (22) · chorus shot + bar top (23) · giant kegs (29) · lethal lifts (32) |
| 2 | facade + thrown bottles (34) · ledges (35) · firebombs (36) · counterweight launch (38) · stop-time big panes (44) · glint (46) · cradles (48) · window crash (51) · lanes + balls (52) · pinsetters (54) · slick run (56) · giant pins (58) |

**The cadence is right, but act 2's list is mostly act 1's list renamed.**

| Act 1 | Act 2 | Same? |
|---|---|---|
| launch (9) | counterweight launch (38) | same verb, less visible |
| stop-time big hits (13–16) | stop-time big panes (44–47) | same |
| knee-slide under DUCK (18, 28) | knee-slide under DUCK (45), slick run (56) | same prop |
| safe lifts over a pool (19) | cradles over a balcony (48) | same |
| HUP pit · HUP spike · HEY goon (22) | HUP gap · HUP firebomb · HEY goon (51) | same hands: `0∪ 1∪ 2X` |
| launch into the chorus (23) | launch into the Lanes (52) | same |
| goons on the HEYs (24, 26) | Bluffers on HEY HEY (53, 55) | same |
| lethal lift run (32–33) | lethal pinsetter run (54) | same |
| 4 giant kegs on the walkdown (29) | 4 giant pins on the walkdown (58) | same |
| — | **thrown bottles (bat), firebombs, rolling balls** | new movers, but firebombs and balls are hop-over-a-thing on the beat, i.e. spikes |

Genuinely new in act 2: batting bottles back (a strike aimed at a *moving* object), ledge hops UP, Big Jim's glint.

### Verb balance

Strike leads every 8-bar block of both acts: 55 % of all 218 actions, **0 lead-verb changes in 60 bars** (B5). Act 2 was
the chance to hand the lead to the hop (a climb is a jumping mechanic) and instead it is 56 / 56 / 60 % strike.

### What drags

- **Bars 42–49 (stop-time, 12 s) are the right valley, but they don't *look* like a change.**
  - Same wall, same ledge, same framing as the climb.
  - The "big panes" are the same easel windows as the climb's small ones.
- **Bars 52–60 (the Lanes)** look like an unlit room after a bright act 1.
- In the hands nothing drags. The screen drags from about 0:50 to 1:28.

### Difficulty curve between acts

| Profile | Act 1 → act 2 |
|---|---|
| Sloppy | 0.6 → 1.0 (ok) |
| ±130 | 2.6 → 2.2 (ok) |
| Uncalibrated | 0 → 8 (cliff) |
| ±160 | 2 → DNF (cliff) |

Both cliffs come from the same cause: act 2's late windows are ~30–40 ms tighter than act 1's, and its stumble threats
are denser (1.25 per bar in bars 34–41) and feed the Burn.

## Game feel

- **Responsiveness: excellent.**
  - Autoplay execution error ≤ 4.2 ms; 218/218 actions on time (214 graded presses).
  - Hop, strike and cancel feel as in iteration 2.
  - The knee-slide auto-crouch works: **0 sign stumbles in 27 runs**.
- **Respawn friction: fine.**
  - A death costs 7–12 s of wall time.
  - 12 checkpoints in 60 bars; the longest segment is 132 → 164 (the climb).
  - The count-in rewind is on-brand.
- **The Burn: fair pressure in act 1, annoying in act 2.**
  - **Act 1:** it is a visible, living fire wall. It lunges on the fills, pulls on stumbles, and eats the lazy and
    reckless bots at bars 11–12. That's the teeth the iteration-2 review asked for.
  - **Act 2, three things make it feel unfair:**
    1. **Respawn gap 1.1 beats (`respawnMinGap`) < rest gap 1.75.** After the Burn kills you, you restart *closer* to
       it. Bars 40–41 hold 2 bat bottles, 2 firebombs, 3 lethal gaps and 3 fill lunges in 12 beats, so one late bat → a
       stumble → one more → caught → respawn closer → caught again. sl-1 died there 3× in a row; ±160 was caught 14×.
    2. **The bottle's +70 ms late window** (a stumble, so a Burn pull) is the stingiest window in the game, on the most
       frequent act-2 threat (7 bottles). It produced 22 of the uncalibrated bot's stumbles.
    3. **Lazy death is a hidden rule.** Skipping bottles (which look like décor at first) kills you at bar 11 through the
       Burn, with only a "burn" failure hint. That's good teeth, but the *reason* must be on screen: the Burn flares and
       the lost token visibly flies into it on each missed reward.
- **Skill ceiling:** the ±40 player never breaks the combo (214/214) and gets 89–96 % Perfect. The combo is a sloppy
  player's goal; skilled players need Perfect streaks or a rank. The poster shows Perfect % but not the combo peak or a
  rank.

## Top problems, ranked by impact on fun

### 1. Act 2 is act 1 again, and the "climb" isn't vertical

Impact: the user's standing complaint, "very repetitive, not dynamic", now at the scale of acts.

**Evidence:**
- The act skeleton table above: 9 of act 2's 12 novelty items are act-1 items re-skinned.
- Strike leads every block.
- Climb: 790 px over 12,300 px, 50 px steps, the camera re-centres, a black void below; bars 34–49 are one composition
  for 23 s.

**Fix (level + art + camera):**
- **Make the climb climb** (bars 34–41), using what the engine already has:
  - **Fire-escape staircases.** The step-up assist is 26 px (`Tun.jump.ledgeAssist`), so a run of 24 px risers every
    ~48 px walks Slim up ~190 px per beat with no input: a visible 25° ascent on the run beats between actions.
  - **Keep the ledge hops for the climbing bass (G# A A# B)** but make each one a storey: +110–120 px. That needs a held
    jump; the hold is the new skill.
  - **Put the two alley gaps on rising diagonals.**
  - **Target +1,600–2,000 px over bars 34–41** (four storeys), not 790.
- **Camera:** during `setPiece climb`:
  - frame the hero lower-left, ground at ~55 % of the screen, so the drop is visible;
  - damp the vertical follow more slowly (the world visibly scrolls down);
  - tilt up 1 beat before each storey.
- **Art:** paint the drop:
  - the street far below (tiny cabs, streetlights), sinking with height;
  - a far-skyline parallax that falls away;
  - the building's corner / edge on screen so you see a *wall*, not a backdrop.

  The facade already chills with height (`stage.ts`). Add the geometry.
- **Replace the reused set-pieces** (keep the rhythm cells, change the object and the verb):

  | Bar | Now | Instead |
  |---|---|---|
  | 45 | the DUCK sign | a sagging **laundry line** Slim slides *under* (new skin) or a flagpole he swings on |
  | 48 | cradles | a **window-washer cradle that rises** two storeys as you hop in it (a ride, B6's "ride" mode, unused so far) |
  | 58 | 4 giant pins | **Slim bowls**: strike a giant ball on 228 and it rolls through **three racks on 229, 230, 231** (one press, three payoffs, the camera tracking the ball). A different verb shape on the same hook |
  | 51 | Hup-Hup-HEY, same hands as bar 22 | a different cell: HUP (held jump up to the sill) · HUP (bat a bottle) · HEY (Heave) |
- **Hand the lead verb to the hop in bars 34–41** (target ≤ 45 % strikes): bottles become the accent, not the bed.

### 2. Act 2 breaks the late-side rule → a difficulty cliff for real players (uncalibrated / ±160)

**Evidence:**
- Uncalibrated: 0 deaths in act 1, then **6–11** in act 2; beat 208 alone killed one run 8 times.
- ±160 + 20 %: 2 deaths, then DNF after 18.
- Slack: every act-2 pit is +110…+125 late (act 1 is ≥ +150); bottles +70.

**Fix (`act2.ts` geometry + `mech/thrownBottle.ts`; re-check with `slack.mjs`):**
- **Every act-2 lethal gets a late side ≥ +150 ms.** Put the teeth on the early side (≈ −90…−100), exactly like act 1.
- **Beat 208 (bar 53):** the ball on 207 plus the gutter on 208 are consecutive tap hops right after the launch landing
  on 206, so a late hop compounds. Move the ball off 207 (bar 52 b4 becomes a pin) or make the 208 gutter a 'teach'
  width.
- **Thrown bottle late window +70 → ≥ +130 ms.** Let the bat still connect while the bottle passes the chest: a later
  `hitAfter`, or a bigger BAT radius on the late side.
- **Bars 40–41:** drop one bottle (157 or 161.66). Peak = lethal gaps on the fill + one bat, not five threats in 12 beats.

### 3. The Burn's death loop and the booth: consequences that feel like bugs

**Evidence:**
- Respawn gap 1.1 < rest 1.75, so the Burn kills you twice in a row: sl-1 3× at bars 40–41, uncal-3 5 catches.
- Uncalibrated and ±130 players spend most of the level at crowd 3–10 (booth / thin).

**Fix (`tunables.ts`, `game.ts`, `mix.ts`):**
- `chaser.respawnMinGap` 1.1 → **1.75**, and the first stumble after a respawn doesn't pull.
- **Crowd start 3 → 8**, so the intro is thin but full-range.
- **Booth only below ~6**, and make it a *dip after a failure* that recovers within 2 bars, not a resting state.
- **Goods earn +0.25**, so a Great/Good player climbs slowly.
- **Latency calibration in the cold open:** "tap Strike on the 4 count-in beats" sets `conductor.latency`. It's cheap,
  and it saves the uncalibrated player from both the act-2 cliff and the permanent booth. The mid-level text tip
  (`latencyTip`, fired at 9.4 s for the late bot) is not enough.
- **Act-1 chorus early sides:** 94 (−60), 98 and 106 (−65) → ≈ −85. These killed ±130 j130-1 six times in bars 24–28.
  Keep the teeth; lose the burst.

### 4. The level's peak looks like its valley (Lanes chorus 52–60) and act 2's set-pieces are small

**Evidence:** the Lanes are the darkest, emptiest screen; the glint is one window; the crash is a puff; the lanes and
counterweight launches don't read. (C8 by eye.)

**Fix (art + director):**
- **Lanes = blacklight at full blast:**
  - glowing lane arrows and gutters in UV lacquer-red;
  - pins in UV white (bigger);
  - a bowling crowd behind a rail that stands on the HEYs;
  - a **scoreboard** counting your strikes;
  - disco-ball spots on the beat;
  - chorus framing 0.76 like the bar-23 chorus shot.
- **Glint at 180** (in the stop-time hole):
  - **stop the camera and tilt up** to the penthouse for 2 beats;
  - scale Big Jim's window 3×;
  - a "ting" sting in the silence;
  - the audience "ooh".
- **Window crash (202):** a full-frame glass shatter over the film frame, a 120 ms freeze-frame (presentation only),
  shards as particles, and the camera **follows Slim through the window** instead of wiping.

### 5. FULL HOUSE misses the chorus downbeat; the act seam takes it away

**Evidence:** a perfect player reaches FULL HOUSE only on bar ~25 (beat 96–100) and again ~bar 53. The verse cap
drops 24 → 16 on the act-2 downbeat.

**Fix (`crowd` items):**
- Pre-chorus cap **19**.
- A clean Hup-Hup-HEY (`perPhrase` +3) crosses 20 **on the HEY**, so FULL HOUSE lands on the chorus downbeat (23, 52)
  for anyone who nails the motto: the song's drop and the game's reward become one moment.
- At the seam, let the crowd decay over bars 34–35 instead of clamping on 132.

### 6. The verb is always "strike" (B5, 60 bars)

**Evidence:** strike leads 8/8 blocks; 120/218 actions.

**Fix:** besides act 2's hop-led climb (problem 1):
- turn 4–6 chorus-3 pins into air-strikes off ball hops (combine);
- make the Lanes' goon pair a slide-into-strike (═ → X), the one combo not used yet.

Target: largest verb ≤ 50 % in bars 34–60.

### 7. The act seam is a hard cut with no breath (bars 31–35)

**Evidence:** bars 21–41 hold 1 breather pair; act 1's lethal lift run flows straight into bottles and gaps; the
street → facade change is a mid-screen vertical wipe with a "FIRE EXIT" label.

**Fix:**
- Bar 33's Heave sends Slim **out through the honky-tonk's front door**.
- Bars 34–35 are a **reveal**: the camera pulls back and tilts up the full height of the Jimperial with Big Jim's
  window glinting at the top (the goal) for 1 bar. Rewards only; the first bottle moves to bar 36.
- A "REEL 2" leader flash on 132 (the reel-change cigarette burn) sells the act break.

### 8. Small, cheap, visible

- **Poster:** fix "BOTTLES & CRATES 102/95"; add combo peak and a rank letter from Perfect % (a skill-ceiling target
  for ±40 players whose combo never breaks).
- **Stamps:** max 1 on screen (the newest replaces the last).
- **Lanes gutters / pinsetter pit:** the lacquer-red rim + glow like every other pit.
- **The rubric's per-act `--bars` A9/A10** use deaths from the whole run, not the act. Filter report deaths by beat
  range.
- **`slack.mjs`:** skip `thrown` targets in the reach check (a false positive).

## Protect this

- **The act-1 difficulty curve:**
  - 0 deaths in bars 1–21 for everyone below ±160;
  - the sloppy bot at 0.6 per act;
  - lethal combos at the block peaks;
  - the late side ≥ +150 ms rule, **extended to act 2, not dropped**.
- **The skill-weighted crowd and the audible booth → FULL HOUSE curve** (6 LU plus a spectral change). Retune where it
  *starts*, not whether it exists.
- **The Burn on screen, lunging on the fills; lazy and reckless play can't finish.**
- **Thrown bottles' telegraph** (a window lights, a goon leans out, a dashed arc, a crosshair): the best readability
  work in the game. Keep the mechanic; loosen its late side.
- **The walkdown money shot** with comic-book impact words. The *idea* stays; the third walkdown (act 3) must change
  form.
- **The knee-slide auto-crouch:** 0 sign stumbles in 27 runs.
- **Stop-time as the act-2 valley:** 0 lethal, intensity 2.9, the glint in the hole. The structure is right; the look
  needs work.
- **Tooling:** `slack.mjs`, the bot profiles, `--bars`, the mix lab. This review took an afternoon because of them.

## Act 3 (edit bars 61–86): what the climax must deliver

The record from here on:

| Edit bars | What | Energy |
|---|---|---|
| 61–67 | breakdown (E vamp, the stomp overlay's Black-Betty moment); bass pickups on 244, 252, 260, 268 | .32–.52: the level's first true valley |
| 68 | fill | **1.00**, the hottest bar of the edit |
| 69–76 | chorus 4, the last (shouts 277, 278, 286; hook-A walkdown 296–300 in bars 75–76) | .72–.90 |
| 77 | tag | |
| 78–85 | outro: hookB tag every 2 bars (302 … 342), HEY HEY answers on 317, 325, 333 | falls .63 → .26 |
| 86 | final hit on beat 340, then a ~5 s ring-out | |

**Already spent**, so it can't be the climax:

| Spent | Times |
|---|---|
| Launch | 5 (bars 9, 23, 33, 38, 52) |
| Four-giant walkdown | 2 |
| Lethal lift run | 2 (+2 safe) |
| DUCK knee-slide | 4 |
| Hup-Hup-HEY → Heave a goon | 2 |
| Stop-time big hits | 2 |
| Spike reskins (firebombs, balls) | 2 |

**Unused and promised by DESIGN:**

- falling platforms (the BIG JIM letters);
- a ride (frame line / cradle);
- call-and-response with the world (rubric cell 7);
- a true vertical climb;
- a boss;
- the iris blades;
- "remove cues" (no chalk marks);
- the break shot;
- a warm, bright palette (the level has been dark purple and brown since bar 17).

**The act-3 map (proposed):**

| Bars | Music | Gameplay | Must deliver |
|---|---|---|---|
| 61–64 | breakdown vamp (.32–.46), stomp overlay | **Call and response** in the Velvet Casino / Pool Room. Big Jim's goons stomp a 1-bar call on the stomp overlay; you answer the same rhythm on bells / table rails the next bar. 0 lethal, reward only; the booth → open in one bar if you answer cleanly | **The level's real valley** (C2) and a *new verb shape*. It must feel like jamming with the band, not surviving |
| 65–68 | breakdown b → the fill (1.00) | **The Rack**: a rising staircase of pool-table rails on the pickup bass (260, 268). The ladder cell: spacing halves into the fill. Lethal ramps 0.5 → 1.5 per bar. **68 b4 (271): the single break shot**: strike the cue ball; the rack explodes | The build the whole level has been missing: a vertical ramp to one press |
| 69–74 | **chorus 4 (.85–.90)**, shouts 277–278, 286 | **The roof at sunset, BIG JIM letters topple one per downbeat: B 272 · I 276 · G 280 · J 284 · I 288 · M 292.** Six bars, six letters: the music fits exactly. Ride each letter as it falls (a new mode: falling platforms), hop to the next on its downbeat, strike the HEYs. FULL HOUSE locked if you enter it clean. Nothing new to learn, only spectacle and the known verbs remixed | **The biggest shot of the level**: the widest zoom, warm cream / coral / rose after 35 s of purple, the crowd strip on its feet |
| 75–76 | hook-A walkdown (B A G F#) | **The third walkdown becomes the payoff:** the four notes are four blows *on Big Jim*: fist, fist, lapel, lens (he has been rising behind the letters since 73) | Change the form of the level's signature, not a third copy |
| 77–82 | tag + outro (hookB every 2 bars, HEY HEY answers) | **Big Jim as call and response:** each tag = his telegraphed swing (1 beat of wind-up); the HEY HEY = your two strikes; cracks: lens L, lens R. **The hardest bars of the level (78–82): no chalk marks, every verb** | Peak-end: skill test *after* the spectacle (Mariachi) |
| 83–85 | outro fade (.36 → .26) | **Can't die** (a miss is a stumble). Iris blades close in on the beats; hop blade to blade; the audience wave | The breath before the end |
| 86 b1 (340) | **final hit** | Power shot off the last blade as **the iris slams shut on Big Jim's face**, then THE END burns in and the poster prints | The single loudest, widest, most final frame of the game |

**Rules for act 3, from acts 1–2's lessons:**

- The late side ≥ +150 ms everywhere.
- Stumbles ≤ 1 per bar.
- The Burn becomes Big Jim's backhand in 78–82, but checkpoint at 69, 77 and 81 (the climax must be replayable in
  ≤ 8 s).
- FULL HOUSE on the chorus-4 downbeat for anyone who clears the break shot.
- One new verb shape per phrase, and no reused prop without a new verb.

## Recommended next iteration (iteration 4): "The Climax + make act 2 its own act"

Run in parallel. Everything else waits.

1. **Act 3 level (bars 61–86)** per the map above: the call-and-response breakdown, the Rack + break shot on 271, the
   BIG JIM letter dominoes on 272–292, the Big Jim walkdown / tag fight, the iris finale on 340. Checkpoints 240, 256,
   272, 288, 304, 324. Targets: sloppy ≤ 1 death, ±130 ≤ 3, uncalibrated ≤ 1, ±40 0, and 0 deaths possible after 332.
2. **Act 2 fairness + re-choreography** (level + gameplay, ~1/3 of a week):
   - late sides ≥ +150;
   - bottle late window ≥ +130;
   - the 207/208 fix; thin bars 40–41;
   - Burn respawn 1.75;
   - the vertical climb geometry (staircases, storey-high held jumps, target +1,600 px);
   - new bar-48 ride, bar-51 cell and bar-58 bowling payoff;
   - hop-led climb (B5).

   Re-run the uncalibrated and ±160 bots: act 2 must not be worse than act 1.
3. **Art:**
   - facade verticality (drop, street below, camera framing for `climb`);
   - Lanes at full blacklight (glow, crowd, scoreboard, red gutters);
   - bigger glint and window crash;
   - act 3's Rack room, sunset roof, six BIG JIM letters, Big Jim himself, iris blades, THE END.
4. **Audio + feel:**
   - crowd start 8, booth only below 6 and as a dip;
   - pre-chorus cap so FULL HOUSE lands on the chorus downbeat;
   - latency tap-calibration in the cold open;
   - mix-lab coverage of act 2 and the verb SFX;
   - act-3 SFX (letter topple crashes on the downbeats, break shot, iris slam, the final hit is in the edit);
   - the poster fix + rank.
5. **User playtest of bars 1–60 before act 3 is built.** Their iteration-2/3 verdict should steer items 1–3.
