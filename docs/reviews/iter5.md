# Fun review: iteration 5 (the polished level, edit bars 1–86, 2:04)

*Reviewer pass, 2026-09-29. Build: HEAD `edc4eed`. Level: `src/level/index.ts#gameLevel`, song `jim_edit` (the original
recording). Bar numbers are **edit bars, 1-based** (bar n starts on beat 4(n−1), ≈ (n−1) × 1.5 s). The rubric tool's
tables are 0-based. This review goes past the rubric, which now passes everywhere. It judges the level the way a
demanding player would, next to Rayman Legends' Castle Rock.*

## Verdict

**This is now a good level. It isn't a great one yet.** The second half is AAA-feeling: the Rack → hush → BREAK → drop
→ Sign Falls → Big Jim run (1:34–1:56) is the best 22 seconds in the game and would hold up in a real demo. Nothing
is broken any more. The finale is visible, the hidden lethals are gone, the Burn can't lock anyone out, and no
stretch is just holding right: no bar outside the finale has fewer than 2 actions, and the max action gap is ~2 beats.

**What still separates it from Castle Rock is feel, not content.** Five issues:

1. **The first 30 seconds undersell the game.** Even a perfect player's crowd sits at 8–14 until bar 22, so the
   record plays thin (the booth) for the whole intro and verse 1. The screen is a beige sepia street with a ~70 px hero
   (at 720p) for 12 s, until the big launch. Castle Rock plays the song at full blast from second one.
2. **The music reward is out of reach for the median first-timer.** A ±130 ms player hears the booth for **61–66 % of
   the run** and gets FULL HOUSE for **6–8 beats** of 340. Sloppy ±85 gets 33–67. The "music is the reward" loop
   works for good players and mostly punishes everyone else.
3. **Slim doesn't feel mighty.**
   - He's small (the chorus zoom-outs make him ~1/12 of screen height).
   - Chorus 1's spotlights bleach his tangerine to yellow-white.
   - A PERFECT! stamp pops on every one of ~300 actions.
   - The hop apex (92 px) is under 2/3 of his height, so hops read as skips.
   - **The final hit doesn't touch Big Jim.** On 340, Slim swings at empty film strip while Big Jim is a small cut-out
     ~450 px away. The boss shrinks from full-screen to a postage stamp in the last 8 beats.
4. **The world doesn't play the song.** Background figures bop and the director pulses, but the goons stand and flex.
   No enemy *is* an instrument, token pickups arpeggiate chords instead of singing the tune, and the foreground layer is
   nearly empty, so the ~1,000 px/s run doesn't *feel* fast.
5. **Difficulty is flat for anyone better than ±100 ms.** Expected deaths per run from `slack.mjs`: sloppy 0.54, spread
   thin across every checkpoint. Nothing from ◆320 on can kill anyone, so the boss gauntlet has no bite. The ±130
   player finds the act-1 chorus (92, 98, 118: −70 pits) and chorus 4 (◆272, 1.5 deaths) the walls.

**Fun score: 7.0 / 10** (time-weighted over the 11 blocks below). Iteration 4 was ~6. Castle Rock is a 9 for me.

**Next iteration: "FEEL", not content.** Hook the first 10 s (music + spectacle), make Slim big and the last hit connect,
cut the noise, make the goons play the song, and put a little bite in chorus 4 (yes to the −75 proposal). Details are
in the top 10 at the end. The user still hasn't played iterations 2–5. That playtest outranks all of this.

## How this was measured

**Build and bot runs.** Private build `--dist=dist-review`; outputs in `playtest/out-review-*`.

| Run | Output | What it gave |
|---|---|---|
| Autoplay, video | `out-review-clean` | 5 fps frames, 22 contact sheets, 15 full-res key frames |
| ±130, seed 1, video | `out-review-j130v` | a run with 6 deaths, to judge fail and respawn |
| Sloppy ±85 + 10 % late, seeds 1–3 | `out-review-sloppy1..3` | deaths, grades, crowd |
| ±130, seeds 1–3 | `out-review-j130-1..3` | deaths, grades, crowd |

**Tools:**
- `slack.mjs --profiles` (the expected-deaths table below).
- `npm run rubric` on the whole level (`out-review-rubric`).
- Crowd traces from every `report.json`.

**Not done:**
- Not heard by a human. This review can't judge the record through the booth by ear. The crowd numbers below are
  facts; how the booth *sounds* is audio checklist item 1, still unheard.
- Not played with hands. Control feel (hitstop, catch-up lurch, hop arc) is inferred from the tunables and the video.

## The numbers

| Profile | Deaths per run (act 1/2/3) | Perfect | FULL HOUSE beats (of 340) | Crowd < 14 (booth-ish) |
|---|---|---|---|---|
| autoplay | 0 | 100 % | 158 | **25 %** (all of bars 1–21) |
| sloppy ±85 + 10 % late ×3 | 1/0/0 · 0 · 0 | 40–47 % | 33–67 | 37–62 % |
| ±130 ×3 | 4/1/1 · 2/2/2 · 0 | 29–33 % | **6–8** | **61–66 %** |
| `slack.mjs` sloppy | 0.54 expected | | | |
| `slack.mjs` ±130 | 6.1 expected (◆272 1.50, ◆80 0.75, ◆96 0.72, ◆256 0.60, **◆320 0.00**) | | | |

- Mean crowd in the first 30 s (bars 1–21): perfect 11.5, sloppy 10.6–11.0, ±130 7.7–8.7. The booth opens at 14.
- **Deaths:**
  - ±130: 92.8 ×2 (the bar-24 HEY pit, −70), 98.7, 118.8/116.7, 127.1, 162.6, 208.7 ×2, 280.6, 310.8, 318.8.
  - Sloppy: one death at 127.8 (the turnaround lift run), stumbles at 130 and 211.
- **Respawn:** death → "REWIND TO THE SPLICE" → 4-3-2-HEY count-in → control in ~2.2 s. You replay 1–3 bars and the
  HUP-HUP-HEY.
- **Crowd after a death:** the crowd resets to the checkpoint's value − 6, so a death mid-chorus takes FULL HOUSE away
  for the rest of that chorus. That hurts more than the death itself (see block 3).
- **Rubric (whole level):**
  - Top-10 gate 10/11 (without bot reports).
  - C2 still 2 valleys, E3 clutter 5 in chorus 4, D3 72 % of shouts struck.
  - Density 0.69–1.0 actions/beat, ρ(intensity, energy) 0.87.

## Moment-to-moment fun log (per block)

*Scores are for a first-time player at roughly ±100 ms, with sound on. Times are song time.*

| # | Bars · time | What you do | How it feels | Fun |
|---|---|---|---|---|
| 1 | **1–8** · 0:00–0:12 | Token hops, bottles on the snare (bar 3), the big pendulum on the HEY (15), a spike, the held jump over the pool (bar 6), the first lethal combination (bar 8: pit → long pit → mid-air sign on the HEY) | **Readable, gentle, beige.** The cold open is charming: the marquee, "reel one", the 4-3-2-HEY leader. Then the same sepia street for 12 s, Slim ~70 px, tokens small, the record thin (crowd 7–10). The Burn rising at 0:06 is the only surprise. Controls respond: the hop leaves on the press and the strike arc is big and orange. No hook yet. | **5** |
| 2 | **9–16** · 0:12–0:24 | **The big launch** (bar 9), rooftops at dusk, first jabber (12), the drop to the street, stop-time "your hit is the sound" (13–15), the bar-16 lethal combination | **The first wow lands at 0:12.** The city opens and the neon smashes at the apex. The rooftops are purple and legible. Stop-time is a good idea, but the crowd is still ≤ 14, so "your hit is the sound" is a quiet bell over a thin record. Flow is good: hop, strike, hop. | **7** |
| 3 | **17–24** · 0:24–0:36 | Door kick into the honky-tonk (+ zoom), the first knee-slide (18), lifts over a pool (19), sign drop, **HUP-HUP-HEY** (22), **chorus-shot launch on 23**, FULL HOUSE on the downbeat, the HEY HEY pits (24) | **The chorus arrival pays.** The drop fills the house on the downbeat and the audience stands. Then the spotlights **bleach Slim to a yellow blob in a brown haze** (frame 0:36–0:47); the pits read, the hero doesn't. The ±130 bot died twice at 92 (the tightest pit in the level, −70). A death here resets the crowd to 9 − 6 = 3, so the whole chorus replays through the booth. | **7** |
| 4 | **25–33** · 0:36–0:49 | Chorus body: pits on the A7 climb, lamps, a gap into a slide (28), **the walkdown kegs KRAK! SMASH! WHAM! KA-BOOM!** (29), tag, the lethal lift run into HUP HUP HEY (32–33) | **Best block of act 1.** The walkdown is the signature refrain, the lift run is rhythmic and scary in a good way, and HEY → launch out the door is a clean act ending. Still dark and murky; the spotlights sweep over everything. | **8** |
| 5 | **34–41** · 0:49–1:01 | The facade climb: fire-escape flights, storey jumps UP, bottles from windows (batted back), the rope hoist (38), the street-reveal tilt, the firebomb, gaps UP on the peak (41) | **Fresh verbs, samey picture.** Climbing reads as vertical and the hook is a real new toy. But it's 12 s of the same brick-and-lit-windows wall. The crowd cap drops to 16 after the chorus, so the record thins again. Two hint banners in 5 bars (bottles, rope) sit across the top of the screen. | **6** |
| 6 | **42–49** · 1:01–1:13 | Roof stop-time: neon letters on the hits, the laundry-line hook over the light well, **Big Jim's glint poster** (46), searchlights, the tenants, the cradle hoist | **The designed valley. It's a breath, but a long one.** Bars 43 and 45 have 2 actions each (the fewest in the level). The glint is a good "the boss is watching" beat. It's the only stretch where a first-timer might ask "is this it?" | **5** |
| 7 | **50–60** · 1:13–1:29 | HUP-HUP-HEY → the goon through the window (**window crash**), **the zip drop** into the Blacklight Lanes, pins on the HEYs, balls to hop, the sweep-bar hook, the slick run, the ball-return launch, the STRIKE!/SPARE? pin walkdown | **Big, busy and fun.** The crash is a great transition. The Lanes are colourful at last, the balls are a fresh threat that moves on the beat, and STRIKE! is a great in-joke on the walkdown. The pins and balls are small and Slim is washed out under the disco beams again. The zip itself still reads as a dark drop. | **8** |
| 8 | **61–68** · 1:29–1:41 | Pool Room call and response (goons now in the foreground, gold floor rings: it **reads**), bench see-saw chain, **the Rack** in the Velvet Casino (chandeliers killed one per bar), the fill's HUP HUP, **THE HUSH → the BREAK** (271.65) | **The best build in the game.** The call and response is the "you perform the song" moment it was meant to be. The Rack tightens and the lights go out one by one. The silent beat and the KRAK is Rayman-grade design. | **8** |
| 9 | **69–76** · 1:41–1:53 | **THE DROP onto the sunset roof**; B-I-G-J-I-M toppling on the downbeats and landing as bridges; the Bluffer pair on HEY HEY; the bottle batted into the G; the J-hook launch; the post run; the M terrace; **four blows on Big Jim's busts** (296–299); the glass wall | **Peak of the level. Protect it.** Every downbeat something huge falls; the letters are floor (the iteration-4 ambiguity is fixed); the walkdown on Big Jim's face is a fist-pump moment. Only flaw: E3 clutter 5 (posts + Bluffers + wells) and Slim is small against the skyline. | **9** |
| 10 | **77–83** · 1:53–2:04 | **Big Jim's reveal** (arms flung, fills the frame), the fists as slam lifts, the velvet sleeve slide, lapel gaps, **the lens cracks** (317, 325), medallions, the fill run | **Spectacle high, stakes low.** The reveal is jaw-dropping and climbing the boss is a great idea. But from ◆320 nothing can kill you, only ±130 dies here at all (0.53 expected from ◆304), and Slim is an ant with small KRAK!s on the lenses. It plays like a victory lap *before* the victory. | **7** |
| 11 | **84–86** · 2:04–2:08+ | Pull-out to the theatre, the marquee swap, the film strip, Big Jim as a cut-out in a frame, the iris blades, **the FINAL HIT (340)**, black + confetti, "The End", the iris opens on the victory pose, the poster | **It lands now, but small.** The hit is visible: rays, WHAM!, the theatre crowd leaps. But Slim is ~50 px under the WHAM burst and **the cue connects with nothing**. Big Jim is flattened *before* the hit, not by it. "The End" holds ~2 s on black; the victory pose on the marquee is lovely; the poster is great. The last 8 beats are trivial input, which is right for a peak-end, but the picture de-escalates. | **6** |

**Weighted (by time): 7.0.** Rising edges: 1→2, 5→7, 8→9. Falling edges: 4→5 (act 2 opens on a samey wall and a
thinner record), 9→10→11 (the peak is at 1:45, and the last 20 s de-escalate visually and in stakes).

### The questions asked

- **Does the first 10 s hook you?** Not yet. The cold open and count-in charm, but 0:00–0:12 is a beige tutorial with a
  thin record. The first wow is at 0:12. Castle Rock's first 10 s are the full band, a fire wall behind you and lums
  singing the riff.
- **Does each act escalate?**
  - Act 1: yes (5 → 7 → 7 → 8).
  - Act 2: yes but it opens low (6 → 5 → 8).
  - Act 3: yes up to 1:53 (8 → 9), then it winds down.
  - The level's peak is correctly chorus 4, but its *end* is quieter than its middle. The peak-end rule wants the last
    hit to be the biggest picture in the game.
- **Any stretch of just holding right?** No. The emptiest bars are 43 and 45 (2 actions each, the roof stop-time) and
  the finale's last bar. The rest never goes more than ~2 beats without an action.
- **Does every set-piece pay off on the accent?** Mostly yes:
  - On the accent: launch 34, chorus shot 88, walkdowns 112–115 / 228–231 / 296–299, the window crash 202, the zip 204,
    the BREAK 271.65, the drop 272, every letter on its downbeat, the lens cracks on the HEYs 317 / 325.
  - Weaker: Big Jim's glint (180, a poster fade-in, not a hit); the marquee swap (333, a card slide); the final hit
    (340, which hits nothing).
- **Controls: responsive and powerful?**
  - Responsive: yes on paper. Execution error ≤ 4 ms, coyote/buffer 100 ms, strike reach 170 px (0.44 beat of
    travel), startup 16 ms.
  - Powerful: half. The strike arc and starburst are strong. The hop (92 px apex, 0.93 beat) is low for a 144 px hero,
    so hops look like skips. Held jumps (250 px) feel good.
  - **Worry (unverified by hand):** a 55 ms hitstop on ~200 contacts, each repaid by a 35 % sim catch-up, means the
    world stops and lurches ~1.5 times a second. Try a build with hitstop only on giants/Heaves/the BREAK and compare
    by hand.
- **Power fantasy?** Medium. Strong beats: the walkdowns, the BREAK and the busts. Weak beats: Slim's size and
  whiteout, the per-action stamps (you're graded, not feared), and a final blow that doesn't land on the boss.
- **Difficulty curve?** See the next section.

## Difficulty: does ±85 almost never dying fit a Castle Rock-style demo?

**Mostly yes, with a small correction.** Castle Rock itself is a low-death level for competent players. Its bite comes
from speed and reading, not tight windows, and its music never punishes you. This game has a *second* difficulty
axis that Castle Rock lacks: the crowd. A sloppy player loses ~2/3 of the FULL HOUSE time (33–67 vs 158 beats). That's
where the ±85 player's "bite" lives, and it's working.

What's missing is **one moment of real tension at the peak**. Right now the sloppy player's 0.54 expected deaths are
smeared across 11 checkpoints (0.02–0.11 each), and the gauntlet from ◆320 to the end is 0.00 for everybody.
Recommendation:

- **Accept the proposal:** 'peak' −75 on **276, 280, 284** (all post-strike or post-landing, no jump buffer to hide the
  early side). Keep 282 at −95 and the 294 terrace at −90. Target: sloppy act 3 ≈ 0.3–0.5 deaths, ±130 ◆272 ≤ 2.0.
- **Balance it:** relax act 1's tightest pit, **92** (−70, the ±130 bot's repeat killer: 2 deaths in a row in seed 1),
  to −80. The act-1 chorus should be the promise, chorus 4 the exam.
- **Keep ◆320 → 340 can't-die**, but give the gauntlet *felt* stakes: the Burn visibly at your heels on the fist run,
  and a near-miss "WHEW" (hero lands within 40 ms of a lip → a cream puff + an audience gasp). Near-misses are free
  tension without deaths.
- **Don't** tighten anything to −60 again. The ±130 player already dies ~6× per run.

## Castle Rock comparison

### What Castle Rock does that we don't

1. **Every sound has a body.** In Castle Rock the lumas, the Lividstone band, the platforms and the cannon shots all
   *are* the song: the instrument you hear is the thing you see. Ours visualizes the song through level timing and
   the director (pulses, flashes, audience). Most set dressing is a static facade, and on average an action lands on
   0.7–1 of each beat's sounds. The kick, snare and HEY are covered; the piano, cowbell, bass walk and guitar mostly
   aren't visible.
2. **The enemies jam.** Castle Rock's enemies bob and play along; the level is a concert you crash. Our goons stand,
   flex and jab. Nobody holds the cowbell, stomps the stomp or plays the piano.
3. **Speed feel.** Rayman's run is fast *and looks* fast: big foreground props whipping past, bright readable
   backgrounds, a large hero. Ours runs ~1,000 px/s but has sparse foreground, dark backgrounds, and a hero that's
   ~1/8–1/12 of screen height.
4. **The lums sing.** Castle Rock's lum lines ride the riff, so collecting them feels like playing the part. Our tokens
   follow jump arcs and chime rising chord tones: pleasant, but not the tune.
5. **The music is at full blast from the start and never degraded.** Ours makes the full record the reward. It's a
   bold idea, but at the moment the first-timer's default soundtrack is the booth.
6. **Replay pull.** Castle Rock has hidden teensie cages off the main line, a lum-score cup, and the **8-bit / "invaded"
   remix** that replays the same map with a new twist. We have a poster with stats and no secrets, rank or alternate
   reel.
7. **Hero legibility.** Rayman is large, bright and always the most saturated thing on screen. Slim is tangerine, but
   the spotlights (chorus 1, the Lanes) bleach him.

### What we do better

1. **Timing depth.** A real judge (Perfect/Great/Good), a combo, a crowd that remixes the record live, and per-player
   latency calibration. Castle Rock has none of this.
2. **Story told by the song's structure.** The hush, the BREAK on the fill's last "and", the drop onto the roof, the
   letters falling on downbeats, the four blows on Big Jim on the walkdown, the lens cracks on the HEYs. Castle Rock
   has no boss and no arc this tight.
3. **Recurring musical motifs.** Hup-Hup-HEY ×7 and the walkdown refrain ×3 (kegs → pins → Big Jim) give the level a
   memory Castle Rock doesn't have.
4. **More places.** 11+ scenes in 2:04 (Castle Rock has ~5 phases), plus a vertical act.
5. **More verbs.** Hop, held jump, strike, slide and the hook ride, all on the beat.
6. **Fairness tooling.** Every lethal window is measured, there are no hidden lethals, and the Burn assist is in.

## Top 10 improvements, ranked by fun per effort

| # | Improvement (concrete) | Fixes | Effort |
|---|---|---|---|
| 1 | **Hook the first 10 s by ear.** Start the crowd at the booth's open point (`Tun.crowd.start` 8 → 14) and floor bars 1–21 at 12, so the record plays full-range from beat 0; the booth becomes the *cost* of misses, not the default. Keep FULL HOUSE (overlays, cheers) as the reward. Then listen to bars 1–8 at crowd 14 vs 8 with the user (checklist item 1). | first impression; the ±130 player hears booth 61–66 % | S (tunables + a listen) |
| 2 | **The final hit connects with Big Jim.** Keep Big Jim full-size in the frame through 339 (no shrink to a cut-out). Stage 338–339 so the last HUPs carry Slim up to his jaw, and on 340 the cue lands **on his face**: 3-frame freeze at contact, a 20 % zoom on Slim, both lenses shatter, and *then* the theatre pull-out and the iris (341+). | the peak-end de-escalates | M (act3Draw + level 336–340) |
| 3 | **Make Slim big and bright.** Chorus zoom-outs 0.76–0.82 → ≥ 0.88 (keep 0.72 only for the 272 drop). Draw Slim *after* the light and bloom layers with his cream rim (spotlights light him, never bleach him). +10 % FRAMING in verses. | power fantasy, readability in chorus 1 / the Lanes | S |
| 4 | **Cut the noise** (see the cut list): stamp only Heaves, giants, combo milestones (×25/×50/×100) and misses, not every Perfect; halve the combo counter; hide the "falls · stumbles" line that appears after the first fail; the Burn stops flaring on fill lunges when you're at rest (only when gap < rest). | "graded, not feared"; the Burn crying wolf | S |
| 5 | **Chorus-4 bite, act-1 relief:** 276 / 280 / 284 at −75; 92 at −80; a near-miss "WHEW" (land ≤ 40 ms from a lip → gasp + cream puff). Re-run `slack --hidden`, then sloppy ×5 and ±130 ×5. | flat difficulty; the ◆320 no-stakes gauntlet feels safer with the WHEW | S |
| 6 | **The goons play the song.** Bluffers/jabbers idle on an instrument lane: cowbell goons tap the swung 8ths (`cowbell` lane), stomp goons stomp on the `stomps` lane, the bar pianist hits the piano stabs on 124–127. When you smash one, its part drops out of the overlay for a beat, then the crowd shouts it back. | "the world doesn't play the song" (CR #1–2) | M (art anim from `game.groove` + lanes; overlay duck) |
| 7 | **Foreground speed layer.** One prop type per scene at parallax 1.4–1.6 (lamp posts, bar stools, fire-escape rails, pinsetters, velvet ropes, chimneys), spaced so one passes on every kick, dark and never over the play band. | speed feel | S–M |
| 8 | **Tokens sing the melody.** When a token's beat falls on a `melody` lane note (± 1/12 beat), its pickup plays *that* pitch (in the lum voice); in the verses (bars 5–15, 35–49) lay token rows on the vocal rhythm instead of free arcs. | CR's lum melody; verses feel emptier than choruses | S–M |
| 9 | **Act 2 opening variety (bars 34–49).** Every 4 bars the facade changes: a lit interior with a card game (36), a laundry-strung courtyard (38–39), the street-reveal tilt again at 41, the tenants cheering you on at the stop-time. Plus one gold "HEY" window per bar that lights on the shout. | the 6 and 5 blocks | M |
| 10 | **Replay hooks.** 3 hidden **film canisters** on optional high routes (e.g. an awning over 56, the J-hook's apex at 288, a lapel shortcut at 316) + a poster **rank** (S/A/B/C from Perfect % × FULL HOUSE beats) + the canisters unlock a **"Midnight Reel"** (the placeholder synth arrangement + blacklight grade) as our "invaded" remix. | replay pull (CR #6) | M–L (do the rank first: S) |

### Cut list (things that add noise without fun)

- **Per-action PERFECT! stamps** (~300 a run). The bells already say it; stamps stack over Slim's head. (Fix 4.)
- **The Burn's flare on every drum-fill lunge when you're safe.** It trains players to ignore the one real threat.
  Flare only when the gap is below rest. (Fix 4.)
- **The in-run death/stumble counter** ("falls 1 · stumbles 1" under the crowd bar). It's on the poster already.
- **Chorus-1 spotlight bloom over the play band** (0:36–0:47). Keep the beams, lose the whiteout. (Fix 3.)
- **The 17 checkpoint clapperboards + white vertical beams.** Keep the clapperboard, drop the full-height beam; it reads
  like a laser gate.
- **Big Jim's shrink into a film cut-out before 340.** Move it after the hit. (Fix 2.)
- **Act 2's third hint banner** (the balls, 211). By bar 53 the player knows "red = hop"; the ball telegraph says the
  rest.

## Protect this

- The Rack → hush → BREAK → drop → Sign Falls → busts → glass wall → reveal run (bars 65–77). Don't touch the
  choreography.
- The walkdown refrain ×3 and Hup-Hup-HEY ×7.
- The Pool Room's readable call and response (fixed this iteration).
- The respawn loop: ~2.2 s from death to control, 1–3 bars of replay, the HUP-HUP-HEY count-in.
- The fairness gate (`slack --hidden`), the Burn assist, the calibration re-offer.
- The poster and the victory pose on the marquee.

## Recommended iteration 6: "FEEL", with the user's playtest first

1. **User playtest of this build** (with the audio checklist). Their words size everything below.
2. **Quick wins (1–2 days):** fixes 1, 3, 4, 5, then measure.
3. **The money shot (art + level):** fix 2.
4. **The world plays the song (art + audio):** fixes 6, 7, 8.
5. **If time:** fix 9 and the rank from fix 10.

**Done when:**
- A perfect player's first 30 s are full-range.
- Slim is never bleached and is ≥ 1/8 of screen height outside the drop.
- The 340 frame shows the cue on Big Jim's face.
- Sloppy act 3 ≈ 0.3–0.5 deaths with no hidden lethals.
- ≥ 3 goon types visibly play a lane.
- The user has played it.
