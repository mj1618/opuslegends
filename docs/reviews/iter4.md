# Fun review: iteration 4 (the complete level, edit bars 1–86, 2:04)

*Reviewer pass against `docs/FUN_RUBRIC.md`, 2026-09-29. Build: HEAD `ee8bf34`. Level: `src/level/index.ts#gameLevel`
(act 1 `slice.ts` + act 2 `act2.ts` + act 3 `act3.ts`), song `jim_edit`. Bar numbers are **edit bars, 1-based** (bar n
starts on beat 4(n−1)). The rubric tool's tables are 0-based: its "block 64-71" is edit bars 65–72. Times are song
time (bar n ≈ (n−1) × 1.5 s).*

## Verdict

**The level is now a complete, busy, varied 2-minute show, and act 3 finally has set-pieces worthy of the song.**
Sign Falls at sunset, the four blows on Big Jim, the glass wall, the Big Jim reveal and the lens cracks are the best
things in the game. Every act passes the rubric gate on its own (11/11 ×3). Slim is never idle for more than 2 beats,
and a new twist arrives at least every 7 bars. The skill ladder works: ±40 ms is 88–92 % Perfect with FULL HOUSE for
155 beats, sloppy ±85 ms gets ~46 beats of it, and ±130 ms gets ~17.

**Three things stop it feeling AAA today:**

1. **The ending doesn't land.** From beat 332 the playfield shrinks into a small screen inside the theatre. From 336
   an octagonal iris closes on it. **The iris is fully shut before 340**, so the FINAL HIT, the song's biggest
   moment and the peak-end the whole level builds to, plays on a **black screen with a soft white dot**. Then come
   a sepia flash, an empty film strip, and "The End". Slim's last strike is never seen (frames below). The HUD (combo
   x296, FULL HOUSE, token count, BAR 86) stays up over "The End" and the victory pose. The victory pose itself is a
   faint double exposure under the title card.
2. **Hidden lethal presses create the reported death loops.** Four actions marked *reward* or *stumble* actually
   kill when pressed late: the reward hop on **275** (+95 ms), the knuckle-ring hop on **323** (+85 ms, labelled a
   stumble), the fist-knee hop on **308** (+145 ms) and the rooftop hop on **59** (+145 ms). They break the
   level's own rule (every lethal late side ≥ +150 ms), are invisible to `slack.mjs` (it sweeps lethal actions
   only) and explain the **277** loop (±160: 8 deaths in one run, 4 in a row from ◆272 on another seed) and the
   **324.6** deaths.
3. **The Burn still has no-escape loops.** A player who misses rewards is caught at **52.6 fourteen times in a
   row**. A player who eats stumbles is caught at **93.5 thirteen times**. Neither gets past act 1. For a first-timer
   who hasn't found X yet, rewards act as threats. A single firebomb stumble on 158 into the bar-40 fill is also a
   catch (two runs).

Also: acts 1–2 each hold one room for ~26 s (honky-tonk bars 16–33, facade bars 34–51), where act 3 changes scene
every 4–8 bars. The Pool Room's call and response can't be seen. An uncalibrated Bluetooth player gets 22 % Perfect
and FULL HOUSE for 24 beats (vs 158 calibrated), because the in-run drift stops at +40 ms.

**Decision: iteration 5 = POLISH, not content.** Land the finale, remove the hidden lethal windows, give the Burn an
assist, fix readability and the HUD, and add mid-act visual beats to the two long rooms. No new mechanics or
sections. **The user has not played iterations 2, 3 or 4. Put this build in front of them now.** Their verdict on
"too hard / not dynamic / repetitive" outranks everything below and should size iteration 5.

## How this was measured

- **Build:** private `--dist=dist-review`; outputs in `playtest/out-review-<name>`.
- **33 headless bot runs over the whole level from the cold open**, plus 10 targeted runs:

  | Profile | Runs |
  |---|---|
  | Autoplay (video, 1 s shots) | 1 |
  | Skilled ±40 | 3 |
  | Sloppy ±85 + 10 % late | 5 |
  | ±130 | 5 (seed 1 with video) |
  | ±160 + 20 % late | 3 |
  | ±160 | 2 |
  | Device +90 ms, calibrated (no jitter) | 3 (seed 1 with video, for the cold open) |
  | Device +90 ms, calibrated, ±40 | 2 |
  | Device +90 ms, uncalibrated (drift only), ±40 | 1 |
  | Lazy (`--skip=none`) | 1 (deterministic) |
  | Reckless (`--skip=stumble`) | 1 (deterministic) |
  | Targeted from ◆272: `--miss=276` | 1 |
  | Targeted from ◆272: ±160 + 20 % late, drift on | 5 |
  | Targeted from ◆272: ±160 + 20 % late, drift off | 3 |
  | Targeted from ◆272: ±130 | 1 |

  23 of the full runs ran concurrently at ~17–23 fps. That is safe because the sim is slaved to the audio clock (max
  sim drift 8.3 ms in every run, bot action error unchanged). It is not safe for video.
- **Rubric:** `npm run rubric -- --level=src/level/index.ts#gameLevel` on the whole level and on `--bars=1-33 / 34-60
  / 61-86`, with all the bot reports (`playtest/out-review-rubric-*`).
- **Slack:** `node playtest/slack.mjs --level=src/level/index.ts#gameLevel --profiles`. Plus a one-off scan with the
  same simulator that sweeps every **non-lethal** action from −300 to +300 ms and reports any that kill (see the
  hidden-lethal table). The scan script was not committed; fix 2 says to fold it into `slack.mjs`.
- **Watched:**
  - The whole autoplay run at **4 fps** (526 frames, 33 contact sheets).
  - Full-resolution frames of every set-piece.
  - A 10 fps sheet of the final hit.
  - The calibration cold open (device-90 run).
  - A ±130 run.
  - `gameshot --start=320 --end` at 1080p on the GPU for the finale and the poster.
- **Not heard.** Every audio item in `docs/reviews/audio_checklist.md` is still unverified by a human.

## The numbers

### Difficulty by profile, per act (deaths per run)

| Profile | Runs | Act 1 (1–33) | Act 2 (34–60) | Act 3 (61–86) | Total | Perfect | FULL HOUSE beats |
|---|---|---|---|---|---|---|---|
| autoplay | 1 | 0 | 0 | 0 | 0 | 100 % | 158 |
| skilled ±40 | 3 | 0, 0, 0 | 0, 0, 0 | 0, 0, 0 | **0** | 88–92 % | 155–158 |
| sloppy ±85 + 10 % late | 5 | 1, 1, 0, 1, 0 (**0.6**) | 1, 0, 0, 1, 0 (**0.4**) | 0, 0, 0, 1, 1 (**0.4**) | **1.4** | 40–49 % | 28–66 (mean 46) |
| ±130 | 5 | 3, 2, 1, 1, 5 (**2.4**) | 0, 1, 4, 1, 2 (**1.6**) | 2, 1, 4, 2, 2 (**2.2**) | **6.2** | 29–34 % | 5–37 (mean 17) |
| ±160 + 20 % late | 3 | 5, 3, 11 | 5, 9, 6 | 6, 13, 15 | 16, 25 (DNF), 32 (DNF) | 22–29 % | 1–15 |
| ±160 | 2 | 4, 5 | 7, 2 | 1, 2 | 12, 9 | 24–25 % | 5–13 |
| device +90, calibrated (±0 / ±40) | 3 + 2 | 0 | 0 | 0 | **0** | 88–100 % | 158 |
| device +90, **uncalibrated** (drift), ±40 | 1 | 0 | 0 | 0 | 0 | **22 %** (61 % Great) | **24** |
| lazy (skips rewards) | 1 | caught at 41.3, then **52.6 ×14**: DNF | — | — | — | — | 0 |
| reckless (eats stumbles) | 1 | caught at 45.4, 86.4, then **93.5 ×13**: DNF | — | — | — | — | 0 |

- The tap test is accurate: it measured 88 / 90 ms for a +90 ms device with ±40 ms tap noise.
- The skill ladder is right. The difficulty curve is not. For the median player (sloppy), act 3 is *not* the hardest
  act (0.4 vs act 1's 0.6), and the ±130 player dies about as often in act 1 as in act 3.
- Act 3's harsh-bot deaths come from the hidden-lethal hops (problem 2), not from designed teeth.
- **Respawn cost:** ~7 s of wall time per death for ±130 (runs take 155–194 s vs 130.5 s). That is 0.6 s death +
  0.2 s fade + a 1-bar count-in + replay from the checkpoint. Checkpoints are ≤ 8 bars apart everywhere. This is good.

### Rubric

| # | Criterion | Act 1 | Act 2 | Act 3 | Whole level |
|---|---|---|---|---|---|
| **Gate** | | **11/11** | **11/11** | **11/11** | 8/11* |
| A1 | Reward share | 74 % | 71 % | 76 % | 74 % |
| A2 | Lethal per bar | ≤ 1 (adj 0.67 chorus) | 0.5 / 0 / 0.73 | 0.5 / 0.63 / 0.4 | *"65–72" 0.88 vs a verse cap |
| A4 | Lethal on a strong accent | 100 % | 100 % | 71–100 % | 93 % |
| A9 | Sloppy clears | 0.6 | 0.4 | 0.4 | 1.4 per level, 0 in bars 1–16 |
| A10 | Hotspots | gap@108 2/5 seeds | Burn 100 % of 2 | 266 / 276 | ±130: **gap@116 ×5**; ±160+late: **gap@276 ×10** |
| A11 | Teeth | PASS | PASS | PASS | ±85 0.52, ±130 2.31 deaths / 32 bars |
| B1 | Longest stretch without a twist | 6 bars | 4 | 7 | 7 |
| B5 | Verb balance | PASS | strike leads 2/3 blocks | strike 58–63 % | FAIL |
| C1 | ρ(intensity, energy) | 0.95 | 0.87 | 1.0 | **0.70** (borderline) |
| C2 | Valleys | **0** | 1 | 1 | 2 (< 3) |
| C4 | Sawtooth | 4/4 | 3/3 | 2/3 | — |
| D1 | Density | 0.69–1.0 / beat | 0.63–1.02 | 0.75–1.0 | — |
| E3 | Clutter (threats in the runway) | 4 | 4 | **5** (post run + M) | — |

\*The whole-level gate fails are mostly an artefact of 8-bar blocks straddling act seams. The Rack + drop fall in a
block the beat map calls "breakdown" and is judged at verse caps (A1, A2). The outro is judged as a chorus: D1 0.96
vs a floor of 1. Two findings are real: **act 1 has no valley (C2)** and the whole-level ρ is only 0.70, because the
three acts each run their own curve.

## Death loops and unfair spots

### Hidden lethal presses (the root cause of the reported loops)

The same controller as `slack.mjs` was run with one press moved from −300 to +300 ms and every other press on the
beat. Only actions **not** marked lethal were swept. These kill:

| Beat | Action (as authored) | Window before it kills | What happens | Loops it explains |
|---|---|---|---|---|
| **275** | reward hop (bar 69 b4) | **−300 / +95 ms** | Its landing (275 + 0.93 beat + lateness) falls past the lip of the **276 light-well** (edge at 276.13) | **the 277 loop**: ±160+late 8× in one run, 4× in a row from ◆272 (seed 22, drift on or off), ±130 2×, sloppy 1× |
| **323** | knuckle-ring hop, labelled **stumble** | **−300 / +85 ms** | A late hop lands in the 324 lapel gap | the **324.6** deaths (±130, ±160, and from ◆272) |
| **308** | hop onto his knee (reward) | −300 / +145 ms | Late → the fist lifts 309/310 | the **310–311** deaths (±160 4×, ±130 from ◆272 2×) |
| **59** | rooftop hop (reward) | −300 / +145 ms | Late → the 60 gap | 60.7 deaths (±130, ±160) |

These break the level's own rule. Worse, the player can't read them: nothing red marks a reward as deadly. Fix 2.

### The Burn loops (caught repeatedly, no escape)

| Where | Who | Evidence | Why |
|---|---|---|---|
| **52.6** (bar 14) | lazy / anyone who doesn't use X | caught 14 times in a row after respawning at ◆32 | missed rewards pull 0.2 each (239 pulls); `caughtBonus` 0.5 beat is less than what one bar of misses feeds it |
| **93.5** (bar 24) | reckless / anyone who can't read the cue racks | caught 13 times in a row from ◆80 | 85 spike + 86 jabber, then the fill; `respawnGraceStumbles` 1 only forgives the first |
| **159.3–159.4** | ±130, sloppy (2 of 10 runs) | a **single** firebomb stumble on 158 → caught | a stumble into a fill lunge = caught. One mistake kills: in practice this is a lethal threat |
| 234.3–234.5 | sloppy, ±160 | ball 232 → ball 234 | two stumbles 2 beats apart (the plan's "≥ 2 beats apart" is not enough with the lunge) |
| 191 (reported) | — | **not reproduced** in 18 full runs (0 deaths in 188–196) | — |

### Designed hotspots (fair, but concentrated)

- **116 (act 1, bar 30, −80/+150):** the ±130 bot's top killer (5 deaths in 5 runs; 3 in a row in seed 5). It is fine as
  teeth, but it is the same pit over and over. Consider moving its tight side to 118.
- **108 (bar 28):** 2 of 5 sloppy seeds.
- **200 / 208 / 216 (act 2 chorus):** ±160 ×3 each.
- **290–292 posts (act 3):** they don't kill real bots (their early sides are buffered). E3 still counts 5 threats in
  view at the post run + M.

## Watching it

### Set-pieces, one line each (autoplay, 4 fps + full-res frames)

| Set-piece | Time | Verdict |
|---|---|---|
| Cold open marquee + calibration leader | 0:00 | **Good.** A BIG JIM marquee, then an 8→1 film-leader countdown ("tap X on every click · the first two are a warm-up · SPACE skips"), then "Projector synced — +90 ms". Clear and on-theme. |
| Bars 1–8 street intro | 0:00–0:11 | Fine. Sepia, tokens on hops, a bottle smash on bar 3, the Burn rises at bar 5 (0:06). It reads, but it is the same composition for 11 s. |
| Big launch (bar 9) | 0:12 | **Good.** A 3-beat flight, the city opens up, neon smashed at the apex. The first wow lands at 12 s. |
| Rooftops (9–15) | 0:13–0:22 | Purple dusk, the jabbers read. |
| Chorus shot (bar 23) | 0:32 | Good. FULL HOUSE bar + cheer; the camera opens. |
| Honky-tonk (16–33) | 0:22–0:48 | **Drags visually.** 26 s in one room (bottle wall, lamp cones, bar top). Only the DUCK sign and the lighting cones change. |
| Walkdown kegs (bar 29) | 0:41 | **Great.** KRAK! SMASH! WHAM! KA-BOOM! with hitstop and a crowd whiteout. |
| Facade reveal / climb (34–41) | 0:48–1:01 | The climb reads as vertical now (fire-escape flights, the street drops away, rope hoist). But bars 34–51 are **26 s of one brick wall with lit windows**. |
| Big Jim's glint (bar 46) | 1:06 | **Good.** A big purple poster of Big Jim with a lens flash. The first time the boss is felt. |
| Window crash + zip drop (51–52) | 1:14 | The crash is **great** (glass shards fill the screen). The zip is a dark silhouette over a black block. The ~1,000 px drop is hard to read as a fall. |
| Blacklight Lanes (52–60) | 1:16–1:28 | **Fixed since iter 3.** Bright purple, disco beams, neon. Pins and balls are small. The "STRIKE! SPARE?" neon slides under the top-left HUD. |
| Pool Room call/response (61–64) | 1:28–1:34 | **Doesn't read.** Green felt, bells and tokens are fine, but the "call" goons are tiny dark background silhouettes, and the gold call rings aren't visible at 1080p. It looks like a quiet corridor, not a duel. |
| The Rack (65–68) | 1:34–1:40 | OK. Velvet casino, chandeliers, HUP HUP HEY chalk, a gold head goon. The "rack of goons" staircase reads as generic steps. **The sunset skyline appears to the right from ~267–268**, a bar before the drop, which spoils the reveal. |
| Break shot + hush + drop (271.65–272) | 1:40 | Good: a WHAM! and the B flying across a pink sky. How it sounds is still unverified. |
| Sign Falls (69–74) | 1:40–1:51 | **Best screen in the game.** Huge neon letters B-I-G-J-I-M pivot and slam against a sunset skyline. One flaw: the landed letters draw as dim outlines *below* the floor line, so it's unclear what is a bridge and what is a well. |
| Walkdown on Big Jim (75) | 1:48 | **Great.** Big Jim rises behind the busts: KA-BOOM / KRAK / SMASH / WHAM on him. |
| Glass wall + reveal (76–77) | 1:50–1:53 | **Great.** He fills the frame, arms flung, fists slamming as platforms. |
| Gauntlet + lens cracks (78–83) | 1:53–2:02 | Good. Fists, sleeve, medallions, KRAK! + white flare on each lens. Slim is tiny beside him, which suits an underdog. |
| Pull-out + marquee swap (84) | 2:01 | The playfield shrinks to ~50 % inside the curtains. The "MEANWHILE, OUT FRONT…" card collides with the combo counter (x292 drawn over it). |
| **Iris + FINAL HIT (85–86)** | 2:03–2:04 | **Broken as a climax.** Beats 336–339 are played in an octagon ~30 % of the screen (Slim ~40 px tall at 1080p). At **340 the screen is black** with a white glow, then a sepia flash and an empty film strip. The strike is never seen. |
| The End + victory pose | 2:05–2:09 | A faint victory pose double-exposed under the "The End" card, with the full HUD still on top. |
| Poster | end | **Good.** "DON'T MESS WITH SLIM!", HELD OVER!, BOX-OFFICE SMASH, a clean stat block, Slim towering over a small Big Jim. |

### Readability, busy-ness, camera, Slim

- **Busy:** yes, everywhere. Tokens are always in view, a strike or hop lands on nearly every beat, and set-piece
  cadence is ~1 per 9 s in act 3. Nothing is empty.
- **Readability:**
  - The danger language holds: red pits with teeth, red points on stumbles, gold rewards.
  - Acts 1–2 are one brown/maroon/purple value range, so pits against dark floors are the weakest read.
  - The Pool Room's green is dark.
  - Slim's orange always pops.
- **Camera:** it moves a lot (launch zooms, chorus shots, climb framing, the 0.72 drop, the crash-zoom on Big Jim).
  The two exceptions are the honky-tonk and facade stretches, where the framing holds still for ~26 s.
- **Transitions:**
  - Act 1 → 2 (out the door, tilt up the facade) and act 2 → 3 (lanes → billiards pan) are smooth.
  - Rack → roof leaks the sunset early.
  - Penthouse → theatre is a pull-out that *shrinks* the action right before the climax.
- **Does Slim feel powerful?** His strikes do: orange arc, starburst, stamp, hitstop on giants, comic words. His size
  (~110–155 px) and the stacked "PERFECT!" stamps over his head make him feel busy rather than mighty. Next to Big
  Jim he is an ant. That works as long as the last shot shows the ant winning, which it currently doesn't.
- **HUD clutter:**
  - Top-left: tokens, targets, crowd bar + "FULL HOUSE!".
  - Top-right: a big combo counter (x296), a "BAR 60" label (0-based: the edit's bar 61) and checkpoint dots.
  - Per-action stamps stack 2–3 deep near Slim.
  - Six hint banners in total (3 in act 1, 3 in act 2: bottles, rope, balls). CLAUDE.md still says "3 in the level".
  - None of it hides the play band, but the BAR label is debug information, and nothing is hidden for the finale.

## Pacing over 2:04

### Timeline (song time, from the autoplay events)

| Time | Bars | Scene | Set-piece | Record energy | Level intensity (rubric) |
|---|---|---|---|---|---|
| 0:00 | 1–8 | street, sepia | the Burn rises (0:06) | .45 | 4 |
| 0:12 | 9–15 | rooftops, dusk | **big launch** (0:12) | .71 | 4.4 |
| 0:22 | 16–21 | honky-tonk | lifts, DUCK sign | .71 | 4.4 |
| 0:32 | 22–33 | honky-tonk, chorus | **chorus shot** (0:32), **walkdown** (0:41) | .72 | 4.9 |
| 0:48 | 34–41 | facade climb | facade reveal, rope hoist (0:55) | .62 | 4.3 |
| 1:01 | 42–51 | the roof, stop-time | **glint** (1:06), cradle | .62 | **2.6 (valley)** |
| 1:14 | 51–60 | Lanes | **window crash + zip** (1:14), pins walkdown (1:23) | .73 | 5.8 |
| 1:28 | 61–64 | Pool Room | call/response | .49 | **~3 (valley)** |
| 1:34 | 65–68 | casino, the Rack | hush + **break shot** (1:40) | .49 → 1.0 | 5.7 |
| 1:40 | 69–75 | sunset roof | **drop, Sign Falls**, J-hook, **Big Jim walkdown** (1:48) | .79 | 6.2 (peak) |
| 1:50 | 76–83 | penthouse, Big Jim | **glass wall, reveal** (1:51), lens cracks | .5 | 3.8 |
| 2:01 | 84–86 | theatre | pull-out, marquee, iris, **final hit** (2:04) | → 1.0 hit | 0 threats |

- **Intensity vs the record:**
  - Each act follows the song (ρ 0.95 / 0.87 / 1.0).
  - Act 1 is flat at 4–4.9 and has **no valley** (C2): the first real rest is 1:01, the roof stop-time.
  - The level's peak is correctly chorus 4 (bars 69–75), and the drop lands on the loudest hit.
- **Novelty:** a twist at least every 7 bars (B1). New mechanics stop after bar 65, as intended.
- **Visual novelty is uneven:**
  - Acts 1–2: 5 scenes in 60 bars, including two 26 s single-room stretches.
  - Act 3: 6 scenes in 26 bars.
  - The **largest set-piece gap is 0:12 → 0:32** (20 s, bars 9–22). The facade stretch 0:48 → 1:06 is 17.5 s with
    only the rope hoist in between.
- **Breathers:** plenty (C3 passes everywhere; the roof stop-time is the level's longest). One exception: bars 21–36
  hold 1 breather pair across the chorus and act seam.
- **Act difficulty curve:**
  - By design, act 3 carries the most lethal actions.
  - In the data it is only the hardest act for harsh bots, and only because of the hidden-lethal hops.
  - For the sloppy player, act 3 is the *easiest* act after act 2, and the gauntlet (304–332) almost never kills
    anyone except through 308 and 323.
  - The triumph is there on screen until 2:02. Then the finale takes it away.
- **What drags:**
  - The honky-tonk verse (bars 16–21) and the facade climb (bars 35–41), both visually.
  - The Pool Room reads as dead air, because its call is invisible.
- **What confuses:**
  - The zip drop (a dark silhouette).
  - The landed-letter outlines below the floor.
  - The finale inset.

## First-time player experience

1. **Cold open.** A marquee plus a small grey controls line: "Hold → run · Space/Z tap = HOP, hold = JUMP · X/J CUE
   SWING…". The first X starts the projector sync, an 8-click film leader (~4 s) that feels part of the show. A
   first-timer gets a quiz before they have played, but it is short, skippable and on-theme. **Keep it.**
2. **First 16 bars:**
   - The count-in's 4-3-2-HEY is big and central.
   - The first prompt ("→ HOLD to run · SPACE hop (hold = big jump)") appears top-centre in small type as the first
     token hop (beat 2) arrives.
   - The first two bars are tokens only, so a late reader loses nothing.
   - The strike prompt follows at bar 3, and the first lethal pit comes at bar 7 on 'teach' windows (0 sloppy deaths
     in bars 1–16 in every run).
   - **Is it exciting within 10 s?** Nearly: the Burn rises at 0:06 and the launch hits at 0:12. The music starts
     band-limited, though. Even a perfect player's crowd stays 8–10 for bars 1–8 and ≤ 14 until bar 21, so the first
     30 s of Jim Croce sound like a tinny projector. Whether that feels charming or broken is audio checklist item 1,
     still unheard.
3. **Hints.**
   - Six first-appearance banners and failure hints after 2 fails. That is fine, and they're short.
   - There is no failure hint for the **hook** (act 2's only new verb) or for the Burn fed by *missed rewards*. The
     lazy bot's only hint is "Hit the beats — every miss feeds the BURN", which doesn't say *which* beats (the X
     targets).
4. **Respawn friction:** ~2.3 s from death to control, then ≤ 8 bars of replay. Good.
   - **Retries at ◆272** replay the fill, hush and drop every time. That is lovely once and cheap by the 5th retry at
     276 (see fix 2).
5. **Checkpoint spacing:** 17 checkpoints, never more than 8 bars (12 s) apart. Good.
6. **Results poster:** clear, funny, on-brand. It needs the finale to earn it.

## Polish gaps (what reads as unfinished)

1. The final hit on black; the HUD over "The End"; the faint victory pose (problem 1).
2. The combo counter drawn over the marquee-swap card (2:01).
3. The "STRIKE! SPARE?" background neon passing under the top-left HUD in the Lanes.
4. "BAR nn" (0-based) in the player HUD.
5. The sunset visible through the casino before the drop (~267–271).
6. Landed letters drawn as outlines under the floor (Sign Falls).
7. The zip drop is a black silhouette.
8. PERFECT stamps stacking over Slim's head.
9. The Pool Room call is invisible.
10. The loading card sat on "THREADING THE PROJECTOR…" for ~8 s under heavy CPU load (0.5 s normally): check the
    real-world load time on a laptop.
11. **Not verified by ear:** the hush, the drop slam, the letter slams, the lens cracks, the finale stack, and the
    booth sound at low crowd (22 checklist items).

## Top problems, ranked by impact on fun

### 1. The climax is invisible: the final hit plays on a black screen (bars 84–86, beats 332–341)
**Evidence:** 10 fps frames of 339.1–341.8. At 339.7 the iris is shut. At 340.0 there is a white glow on black, then
a sepia flash, then an empty film strip. The gameshot at beat 339 shows the play area as an octagon inside a
pulled-back screen (Slim ~40 px). From 336 on, the last Hup-Hup-HEY is played in ~30 % of the screen. The HUD stays up
through "The End".

**Fix:**
- Keep the gameplay **full-frame through 340**. The pull-out can happen *after* the hit (341–343), or keep a light
  vignette only.
- Close the iris **on** the strike, centred on Slim: freeze-frame the swing, KRAK, and Big Jim knocked out of his own
  film frame. Then THE END burns in, the iris reopens on the victory pose at full brightness (no double exposure),
  and the poster follows.
- Hide the HUD from 340 (fade it over 1 beat).
- Put the marquee swap card clear of the combo (or hide the combo from 332).

This is the peak-end of the whole level and is worth most of a week on its own.

### 2. Hidden lethal "reward" presses → the 277 / 311 / 324 death loops (275, 308, 323, 59)
**Evidence:** the hidden-lethal table above. From ◆272, ±160 + 20 % late died at 276.8 **4 times in a row** (seed 22,
drift on and off). In the full runs: 8× in one run. The ±130 runs died at 276.8 and 324.6.

**Fix:**
- **275:** remove the hop (tokens on the ground or a strike on the neon), or pull the well's near lip to ≥ 276.3 so a
  +150 ms late landing still lands on the roof.
- **323:** make the ring a strike or a slide, or move the lapel gap so that a late hop lands short of it (the plan
  says a stumble; it must stay one).
- **308 / 59:** push each landing zone out until the late side is ≥ +150 ms.
- **Tooling:** add a `--hidden` mode to `slack.mjs` that sweeps every non-lethal action and fails if any kills inside
  −150 / +150 ms, and run it in the playtest gate. (The scan here took ~2 min for the whole level.)

### 3. The Burn locks struggling players out (52.6 ×14, 93.5 ×13, single-stumble catches on 158)
**Evidence:** the lazy and reckless runs above; ±130 and sloppy catches at 159.3–159.4 after one firebomb stumble; the
234 pair.

**Fix (an assist, not a nerf for skilled players):**
- After **2 Burn catches in the same checkpoint segment**, missed rewards stop feeding it until the next checkpoint.
- After 3, it rests at 2.5 beats and doesn't lunge.
- A **single** stumble never catches: the fill lunge only closes the gap if you were already pulled. Test: `--skip=none`
  and `--skip=stumble` must finish.
- Make the "burn" failure hint name the verb: "SWING (X) at the gold — every miss feeds the BURN".

Rayman's model is that missing rewards costs score, not life.

### 4. Acts 1–2 hold one scene for ~26 s twice (honky-tonk 16–33, facade 34–51); the largest set-piece gap is 20 s
**Evidence:** the 4 fps sheets 0:22–0:48 and 0:48–1:14 are one composition each. Set-piece gap 0:12 → 0:32.

**Fix:** mid-act visual beats that reuse existing art, not new mechanics:
- **Honky-tonk:** the lights change on the chorus (bar 22: house lights to spotlights, the audience standing up). A
  brawl-cam camera state for bars 24–28.
- **Facade:** a sky and lighting shift at the roof (bar 42: moon out, searchlights), window tenants reacting on the
  stop-time, and a **camera tilt reveal of the street far below** at the storey jump (bar 39).
- **Bar 16:** one small spectacle beat (the honky-tonk door kicked open with a camera punch) to break the 20 s gap.

### 5. The Pool Room call and response can't be seen (bars 61–64)
**Evidence:** full-resolution frames at 1:28–1:31. The goons are ~40 px dark silhouettes behind the tables. No gold
rings are visible.

**Fix:**
- Bring the call goons into the play band's foreground layer, lit by the lamp cones.
- Stomp dust + a gold ring **on the floor where the answer lands**, pulsing on the call beats.
- Add a 1-bar camera push-in on the goons during each call bar.

This is the level's only designed valley and its "you perform the song" moment. It must read.

### 6. Uncalibrated latency players never reach the reward (drift clamps at +40 ms)
**Evidence:** device +90, no tap test, ±40 jitter: 22 % Perfect, 61 % Great, FULL HOUSE 24 beats. The same bot
calibrated gets 94 % Perfect and 158 beats. The drift ended pinned at +40.

**Fix:** when the drift sits at its clamp for 2 bars, open the projector sync at the next checkpoint (one line: "Your
speakers are late — resync?"). Or widen `rangeMs` to ±120 with the same clear-bias rule. The first-run test catches
most players; this catches the ones who skipped it or switched to Bluetooth.

### 7. Act 3's difficulty lives in the wrong places (the median player finds it easiest)
**Evidence:**
- Sloppy deaths per act: 0.6 / 0.4 / 0.4.
- ±130: 2.4 / 1.6 / 2.2.
- After fix 2 removes 275 / 308 / 323, act 3 will get *easier* still.

**Fix:** once the finale and fairness fixes are in, add designed teeth only on big accents in chorus 4, and keep the
early sides tight:
- A tight early side on 280 (−75).
- The 294 terrace at 'peak'.
- One more lethal combination on the HEYs 277/278 (the plan's Bluffer pair, which the reckless bot proved matters).

Target: sloppy act 3 = 0.6–0.8, ±130 = 2.5–3, with nothing hidden.

### 8. The drop's reveal is spoiled, and Sign Falls' floor is ambiguous (bars 67–74)
**Evidence:** frames at beat ~267–271 show the sunset skyline right of the casino. After landing, each letter is drawn
as a dark outline under the floor line (1:41–1:45).

**Fix:**
- Keep the casino wall (or a curtain) closed to the right edge until 272. Open it *on* the drop with the flash.
- Draw landed letters **as** the walkable surface (the neon face on top, cream lip), and keep the wells' red.

### 9. HUD and feedback polish
**Evidence:** BAR label, combo over the marquee card, the Lanes neon under the HUD, stacked stamps.

**Fix:**
- Remove "BAR nn" outside `?debug=1`.
- Stamps: show one at a time (a new one replaces the old) and scale them down at combos ≥ 8; let the bells carry
  Perfect.
- Keep the background signage clear of the HUD boxes.
- Update CLAUDE.md's "3 hints in the level" to 6 (or cut act 2's to 1–2).

### 10. The designed hotspot at 116 (and 108) repeats
**Evidence:** ±130 gap@116 accounts for 5 of 31 deaths across 5 seeds (3 in a row in seed 5). Sloppy gap@108 hit 2 of 5
seeds.

**Fix:** keep the teeth but rotate them. Make 116 'std' (−110) and 118 'tight', so the tight pit isn't the one right
after the walkdown checkpoint (◆112), where a retry lands you on it cold within 1 bar.

## Protect this

- **Sign Falls at sunset**, the **four blows on Big Jim**, the **glass wall**, the **Big Jim reveal** with the fists
  as platforms, the **lens cracks**. This is AAA-feeling spectacle; don't touch the choreography.
- **The walkdown words** (KRAK! SMASH! WHAM! KA-BOOM!) in all three acts. It's the level's signature refrain.
- **The skill-crowd ladder:** ±40 158 FULL HOUSE beats, ±85 ~46, ±130 ~17. The music as the reward is working in the
  numbers.
- **The projector sync:** accurate to ±2 ms of the true delay, on-theme, ~4 s, skippable.
- **Checkpoint cadence + 2.3 s respawn.**
- **Fairness on every *marked* lethal:** all ≥ −70 / +150 ms (slack meter), 0 sloppy deaths in bars 1–16, ±40 never
  dies.
- **The facade climb's verticality** and the **hook** verb. Act 2 is its own act now.
- **The Blacklight Lanes' new lighting.** The chorus is no longer the darkest screen.
- **The poster.**

## Recommended next iteration (iteration 5): "Land it". Polish, not content

The level has all its content: 86 bars, 3 acts, ~20 set-pieces, a boss. What remains is concentrated in a few seconds
and a few presses: the last 8 beats, 4 hidden hops, the Burn's edge cases and 2 long rooms. More content would dilute
it. Scope, in parallel:

1. **Finale (art + audio + gameplay), top priority:** fix 1, plus the victory reveal and the HUD hide. Then listen to
   audio checklist item 21 together with the new picture.
2. **Fairness sweep (gameplay + level):** fixes 2, 3 and 10. Add `slack.mjs --hidden` to the gate. Re-run the ±160
   loops: no action may kill ≥ 3 times in a row for any bot.
3. **Readability + HUD (art):** fixes 5, 8 and 9, and the zip-drop read.
4. **Mid-act visual beats (art/director, no new mechanics):** fix 4.
5. **Latency assist:** fix 6.
6. **Then act 3's designed teeth (fix 7)**, only after 2 lands and is measured.
7. **Human playtest gate:** the user plays the full build (with the audio checklist) *before* iteration 5 is sized
   further. Their words decide whether iteration 6 is difficulty tuning or more spectacle.

Done when: the final hit is visible and full-frame; the lazy and reckless bots finish; no hidden-lethal action exists;
±160 + 20 % late finishes 3/3 seeds with no 3-in-a-row loop; every act gate stays 11/11; and the user has played it.
