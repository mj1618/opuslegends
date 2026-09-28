# Fun review: iteration 6 (the FEEL pass, edit bars 1–86, 2:04)

*Reviewer pass, 2026-09-29. Build: HEAD `e8bf87f`. Level: `src/level/index.ts#gameLevel`, song `jim_edit` (the original
recording). Bar numbers are **edit bars, 1-based** (bar n starts on beat 4(n−1), ≈ (n−1) × 1.5 s); the rubric tool's
tables are 0-based. Same method as `iter5.md`: the whole run watched at 5 fps, a run with deaths, bot batches, the
slack meter, the rubric, plus three new checks this time: tokens vs the melody lane, the poster timing, and the rank
per profile.*

## Verdict

**Iteration 6 landed. The level is now good-to-very-good: 7.5 / 10** (iter5 7.0; Castle Rock ≈ 9).

The four FEEL problems from iter5 are mostly fixed:

- **The record plays full from beat 0.** Booth time dropped: autoplay 25 % → 0 %, sloppy 37–62 % → 0–8 %, ±130
  61–66 % → 0–10 %.
- **Slim is big and never bleached.** He's about 1/5 of screen height in verses and about 1/6 in chorus 1, where he
  was 1/12 before. He reads as tangerine under every spotlight.
- **The final hit connects.** A full-frame Big Jim, a white-out, then KNOCKOUT! with the cue on his jaw. It's now the
  second-best picture in the game.
- **The noise is gone.** Stamps fire only on notable moments, the fail counter is removed, and the Burn is quiet at
  rest.

**What still keeps it off 9:**

1. **The first 12 s still look like a tutorial.** It's the same sepia street, and the first wow comes at 0:12.
2. **The roof valley (bars 42–49) is still the weakest stretch.**
3. **The tokens mostly don't sing the chorus tune.** The feature is live, but the level wasn't re-laid for it (see
   "Tokens vs the melody").
4. **One stumble or death in a chorus still costs the whole chorus's FULL HOUSE.** This now matters more, because
   FULL HOUSE is the only music reward left above the full record.

**Ready to show? Yes, to the user, now.** The user hasn't played since iteration 1–2 feedback, and nothing here is
broken. It isn't ready as a public "AAA demo" yet. The top 3 fixes below are about a week of work and would take it to
~8.

## How this was measured

**Build and bot runs.** Private build `--dist=dist-review`; outputs in `playtest/out-review-6*`.

| Run | Output | What it gave |
|---|---|---|
| Autoplay, video | `out-review-6clean` | 5 fps contact sheets (`sheets/`, 27 × 5 s), full-res key frames + the hit at 10 fps (`key/`) |
| ±130, seed 1, video | `out-review-6j130v` | 1 death, 2 stumbles, 2 ledge scrambles: fail, respawn and the crowd cost |
| Sloppy ±85 + 10 % late, seeds 1–3 | `out-review-6sloppy1..3` | deaths, grades, crowd, rank |
| ±130, seeds 2–3; ±160 + 20 % late | `out-review-6j130-2/3`, `-6j160` | the struggling-player end of the rank |
| The poster | `out-review-6poster` | `gameshot.mjs --end` (real GPU, 1080p): the pre-hit frame and the poster |

**Tools:**
- `slack.mjs --profiles`.
- `npm run rubric` on the whole level (`out-review-6rubric`).
- A token-vs-`tokenMelody` scan: the built level's 464 authored tokens, each run through `TokenMelody.pick` with the
  game's grid snapping.

**Not done:** heard by a human, or played with hands. The token melody, WHEW and the goon flares are judged from the
data and from the mix numbers in `CLAUDE.md`, not by ear.

## The numbers

| Profile | Deaths (where) | Perfect | FULL HOUSE beats (ch1/ch3/ch4) | Booth % | Rank |
|---|---|---|---|---|---|
| autoplay | 0 | 100 % | 163 (32/32/32) | 0 | A 89.9 |
| sloppy s1 | 1 (127.8, the lift run again) + 2 stumbles | 40 % | 100 (17/**7**/32) | 8 | B 72.0 |
| sloppy s2 | 0 | 43 % | 127 (5/32/32) | 2 | B 80.1 |
| sloppy s3 | 0 | 47 % | 154 (31/25/32) | 0 | B 83.8 |
| ±130 s1 (video) | 1 (310.8) + 2 stumbles + 2 scrambles | 32 % | 72 (17/**2**/26) | 10 | C 65.1 |
| ±130 s2 | 6 (116.7, 118.8, 208.7 ×2, 280.6, 310.8) | 30 % | 32 (**0**/8/**0**) | 5 | C 47.0 |
| ±130 s3 | 0 | 29 % | 94 (11/32/0) | 0 | B 72.7 |
| ±160 + 20 % late | 15 | 24 % | 29 | 44 | **D 40.2** |

`slack.mjs` expected deaths per run:

| Profile | Expected | Notes |
|---|---|---|
| sloppy | 0.53 | spread 0.02–0.10 over every checkpoint; bars 1–16: 0 |
| ±110 + 20 % late | 4.13 | |
| ±130 | 6.72 | ◆272 1.86, ◆96 0.72, ◆80 0.67, ◆256 0.60, ◆132 0.56, ◆304 0.53, ◆320 0.34 |
| ±160 | 15.4 | |

**Rubric (whole level):**
- Top-10 gate 10/11 (same as iter5; A9 needs bot reports).
- ρ(intensity, energy) 0.87; density 0.63–1.02 actions/beat.
- Still failing: C2 (2 valleys), E3 (clutter 5 in chorus 4), D3 (72 % of shouts struck).

**Findings from the runs:**

- **The chorus-FULL-HOUSE cliff.** In 5 of 7 non-perfect runs, one chorus got ≤ 8 FULL HOUSE beats. Each time it came
  from a single event right before or early in that chorus:
  - a stumble on the first ball (211) plus 2 misses: crowd 21.7 → 14, never back above 17 (sloppy s1);
  - a ledge scramble at 192.8: crowd 15 → 6 at 200, so chorus 3 peaked at 19.9 (±130 s1);
  - a death at 280.6 (±130 s2, chorus 4 = 0).

  The house refills only through the chorus-drop HUP-HUP-HEY. After that, the decay (0.3/beat + 0.04 per member)
  outruns a Good/Great player's gains.
- **The ledge scramble is a silent crowd killer.** Both ±130 s1 scrambles (157.0, 192.8) were followed by 3–5
  consecutive missed actions (158–160, 193–197). No stumble is logged and nothing on screen says why. That's −6 to
  −10 crowd for one sloppy tap. (Bot evidence: a human would keep pressing on the beat. Verify by hand.)
- **Hotspot: the fist run into 310.8** (◆304, pit). 3 of 5 ±130/±160 runs died there. The pits under Big Jim are
  **unlit black voids**: no lacquer red, no hot rim (`key/g116.png`, `g120.png`). They're the only lethal pits in the
  game that break the danger language.
- **WHEW:** 9–21 per struggling run (autoplay 0). Mostly 'lip', clustered in chorus 4 (4 in 276–292). That's about one
  per 8 s, fine as a sound; the stamp is borderline but OK.
- **A failure hint in the boss fight.** The ±130 s1 run's second spike stumble (42, 323) fires the "spike" FAIL_HINT
  at 323.6, in the middle of the Big Jim gauntlet.

## Iter5's top 10: did they land?

| # | iter5 fix | Landed? | New problems? |
|---|---|---|---|
| 1 | Crowd starts at 14, record full from beat 0 | **Yes.** Booth 0 % for autoplay and sloppy, ≤ 10 % at ±130. Crowd sits at 15–16 through act 1's verse. | Thin sound is now rare, so the reward is only FULL HOUSE, and that dies for a whole chorus after one stumble (above). |
| 2 | Final hit connects with Big Jim | **Yes.** He looms in from 335.5, fills the right half of the frame on 339 (`out-review-6poster/g-05-beat339.png`: Slim ~1/3 of the frame height after the push-in). On 340: white-out, negative impact frame, the cue on his jaw, KNOCKOUT!, lens shards, flattened *after* the hit. | The contact frame is a white-out, so the blow reads a frame *late*. KNOCKOUT! sits over his face. Then 3.5 s of "The End" on black before the victory. |
| 3 | Slim big and bright | **Yes.** ~140 px at 720p in verses (was ~70), rim-lit, orange in chorus 1's beams, the Lanes, the sunset. | None. The chorus-4 sunset (pink/maroon) is his lowest-contrast backdrop, still fine. |
| 4 | Cut the noise | **Yes.** Stamps only on the first Perfect of a phrase, 10/25/50/100-in-a-row, Heaves, WHEW. No fail counter. Splice standees instead of beams. The Burn doesn't flare at rest (autoplay: 0 lunges). | The combo counter ("x239 COMBO", top right) is still the biggest HUD element. Hint banners: 2 in bars 1–4, 2 in bars 35–38, and the ball banner at 211 that iter5's cut list dropped is still there. |
| 5 | Chorus-4 bite, act-1 relief, WHEW | **Partly.** 92 → −80 (it no longer appears in any death list). 276/280/284 → −80 (the physics steps in 10 ms; −75 isn't reachable). Gauntlet lethals 326/330 are in, and ◆320 now has 0.34 expected at ±130. | Sloppy still dies about once a run, and not in act 3 (the decision to keep −80 is right). The new bite at 310/326/330 sits on **black, unreadable pits.** |
| 6 | Goons play the song | **Mostly.** The background band plays the record's lanes; Bluffers play `goonPartAt`; a struck jabber's part flares. | Hard to see in motion at gameplay speed. The band is small and in the dark back layer. Nobody in the *foreground* is visibly an instrument. |
| 7 | Foreground speed layer | **Landed, but subtle.** 1.6× silhouettes outside the lane plus margin speed lines at full run. | The screen is not too busy. If anything this layer is too timid to sell speed (barely visible in stills). The busiest frames are chorus 4 (letters + Bluffers + wells, E3 5), still readable. |
| 8 | Tokens sing the melody | **Audio yes, level no.** See below. | Chorus tokens mostly echo the tune 1/3 beat late or play harmony, so the hook isn't audible as a tune. |
| 9 | Act 2 opening variety | **Yes.** The facade changes face every 4 bars: brick, the neon HOTEL JIMPERIAL (pink/teal), iron, the laundry courtyard, the billboard + water tower. Cheering tenants in lit windows on the roof. | The roof block is still low on *play* (density 0.63), whatever the picture does. |
| 10 | Replay hooks | **Yes.** 3 canisters (43, 170, 315), rank S–D with per-tier stamps and stings. | The canisters are near-invisible to a first-timer (the bots find 0/3 without `--hunt`). **D mocks a finisher** (±160: finished, D, "wah wah waaah"). The **rank sting fires ~2.6 s after the hit; the stamp slams at ~7.6 s** (poster at 7.0 + 0.5–0.75 s slam-in). |

### The poster sting timing gap (measured from code)

- The finish is at 340.5. `Tun.flow.finishEndScreenDelay` 2.4 s → `scene = 'end'` → `stage.onPoster(letter)`: the
  flourish plus the rank layer (S mega cheer at +0.72 s … D flop at +0.1 s, sparse claps at +1.9 s) at **~2.6 s after
  the hit**.
- The renderer holds the poster until `ENDING.poster` 7.0 s. The rank stamp slams in at `appear` 0.5–0.75 s, so at
  **~7.6 s**.
- Result: the billing's cheer, or the flop, plays over "The End" and the start of the victory iris (`ENDING.victory`
  3.55 s), about **5 s before the letter appears.** For a D, the flop lands on Slim's victory pose.
- **Fix (S):** split `onPoster` into two calls.
  - `onTheEnd()`: THE END flourish only, at hit + `ENDING.shut` (1.05 s), when the iris closes and "The End" burns in.
  - `onRank(letter)`: the tier layers + the applause re-level, fired from the renderer's poster clock at
    `ENDING.poster + 0.6 s` (the stamp's slam). Game can schedule it at `act3.hitClock + ENDING.poster + 0.6`.

### Tokens vs the melody (does the tune come through?)

Method: the built level's 464 authored tokens (spills excluded), each snapped to the grid as `StageAudio.onToken`
does, then run through `TokenMelody.pick`. Two numbers per section:
- **On-onset**: tokens within ±1/12 beat of a sung note's start, so the token doubles or harmonises the singer in time.
- **Coverage**: sung notes that have a token on them.

| Section | Tokens | On-onset | "Near" (the note began up to 1/3 beat earlier) | Held / chord | Sung notes covered |
|---|---|---|---|---|---|
| verse 1 (bars 5–20) | 100 | **51 %** | 26 | 23 | 43 / 98 (44 %) |
| chorus 1 | 31 | 29 % | **13** | 9 | **9 / 43 (21 %)** |
| verse 3 (34–49) | 97 | 46 % | 25 | 27 | 44 / 104 (42 %) |
| chorus 3 | 48 | 31 % | **20** | 13 | 14 / 43 (33 %) |
| chorus 4 | 38 | 29 % | **16** | 11 | 10 / 43 (23 %) |
| outro | 42 | 38 % | 15 | 11 | 14 / 48 |
| intro, turnaround, breakdown | 67 | ~0 | — | chord arpeggios (no vocal) | — |

**Diagnosis.** The verses mostly sing. Bars 5–6's first phrase (16–19.67) is covered note for note, so the "tokens
sing" idea is heard in the first 10 s.

The choruses don't:
- Chorus tokens sit on the **triplet grid of jump-arc samples**. In chorus 3, 21 tokens are at x.33, 19 at x.66 and
  only 8 on the beat.
- The chorus melody is on the beat and the swung "and" (x.0 / x.67).
- So ~45 % of chorus tokens hit `pick`'s "onset up to 1/3 beat before" rule and sing the note **one triplet (~120 ms)
  after Croce**. That's a flam/echo, not a doubling.
- Most of the rest are harmony (a third above). Only 21–33 % of the tune's notes are ever played.

The hook, "Bad, bad Leroy Brown", never comes out of the tokens as a recognisable line. Castle Rock's lums work because
the *rhythm* of the pickups is the riff's rhythm.

**Fix (S–M, level + a 3-line audio guard):**
1. A DSL helper, `lumSing(from, to, path)`, that puts one token on each `tokenMelody` onset along the hero's path
   (ground height, or the real arc height at that beat). Use it for the chorus hook lines (A7 bars 23, 25, 27, 52, 54,
   56, 69, 71, 73) and the tag hooks (31, 60, 77).
2. In `TokenMelody.pick`, a token more than 1/12 beat *after* a sung onset plays a chord-tone ornament (not the late
   melody note). Late echoes then turn into harmony.

**Target:** chorus coverage ≥ 60 %, "near" ≤ 10 %.

### Is the rank fair per profile?

- autoplay: A 89.9, by design. S needs the canisters.
- sloppy: B 72–84, right.
- ±130: B 72.7 with 0 deaths; C 65 / 47 with 1 / 6 deaths. The median first-timer gets a C "B-MOVIE". Fair, and it
  gives a reason to replay.
- **±160 finisher: D 40 "STRAIGHT TO VIDEO" with the flop sting.** Wrong at the peak-end. Someone who struggled
  through 15 deaths to the end gets mocked right after the best moment in the game.
- **Fix (S):**
  - A finished run floors at C.
  - D only for the pause-menu quit ("walked out").
  - The poster shows "next billing at N pts: +X for tokens / canisters found 0/3" to point the replay.
  - The rank's timing part (27 pts) is steep for Good-heavy players (Good = 0.25). Consider 0.4.

## Moment-to-moment fun log (per block)

*Scores are for a first-time player at roughly ±100 ms, with sound on. Times are song time.*

| # | Bars · time | What changed since iter5 | How it feels now | iter5 → **iter6** |
|---|---|---|---|---|
| 1 | **1–8** · 0:00–0:12 | Full record from beat 0 (crowd 14–16). Slim twice the size. Tokens sing the first vocal phrase (bar 5). Fewer stamps. | **Sounds right, looks the same.** The record is at full blast and the first phrase's tokens double Croce. It's a real hook *by ear*. The picture is still 12 s of one beige street with 2 hint banners across the top. The only visual event is the Burn rising at 0:06, and the first wow (the launch) is still at 0:12. Density 0.69/beat, intensity [2.5 3 3.5 4 4 3 3 9]: flat until the bar-8 combo. | 5 → **6** |
| 2 | **9–16** · 0:12–0:24 | Stop-time now over a full record. Rooftop billboards. | The launch still lands. "Your hit is the sound" now works because the record is full around the gap. Flow is good. | 7 → **7** |
| 3 | **17–24** · 0:24–0:36 | Slim rim-lit in the spotlights (not bleached). 92 at −80. | **The chorus arrival pays and you can see yourself.** The drop fills the house on the downbeat; a spotlight pool follows Slim. The honky-tonk is still murky brown but the hero pops. | 7 → **8** |
| 4 | **25–33** · 0:36–0:49 | The same, readable. | The walkdown kegs, the lift run, HUP HUP HEY out the door. The 127/128 lift run is still the sloppy player's one death (s1). | 8 → **8** |
| 5 | **34–41** · 0:49–1:01 | The facade changes face every 4 bars: brick → neon HOTEL JIMPERIAL → iron. | **Fresh verbs, fresh picture now.** The pink/teal hotel wall is the most colourful shot in act 2. Two hint banners (bottles 36, rope 38) remain. The ledge scramble (157) silently eats 3 actions for a sloppy tap. | 6 → **7** |
| 6 | **42–49** · 1:01–1:13 | Rain, searchlights, the moon, cheering tenants in lit windows, the chimney canister (170), the Big Jim glint poster. | **Prettier, still thin to play.** Density 0.63/beat, intensity 2.9 (the level's lowest). Bars 43 and 45 (rubric 42, 44) are intensity 1: two big neon strikes and a hop. The crowd rests at 15 (no FULL HOUSE in a verse), so the music doesn't lift either. It's a breath that goes on 3 bars too long. | 5 → **6** |
| 7 | **50–60** · 1:13–1:29 | Slim readable in the Lanes. | Window crash → zip drop → the Lanes is still a great run. But this is the chorus most often lost to one mistake (sloppy s1 7 FULL HOUSE beats, ±130 s1 2, ±130 s2 8), from the 192.8 scramble or the 211 ball stumble. | 8 → **8** |
| 8 | **61–68** · 1:29–1:41 | — | The Pool Room call-and-response, the Rack, the hush → BREAK. Still the best build. | 8 → **8** |
| 9 | **69–76** · 1:41–1:53 | Chorus-4 wells at −80. WHEW gasps. | Still the peak: letters falling on downbeats, four blows on the busts. The WHEWs (4 in 276–292 for a ±130 player) add real "phew" tension. | 9 → **9** |
| 10 | **77–83** · 1:53–2:04 | Real lethals (326, 330), the Burn's threat, the shoulder canister (315), Big Jim fills the frame. | **The gauntlet has stakes now.** The fist run is scary, the lens cracks land, the gold chain snaps. Two flaws: the pits under him are **black voids** (3 of 5 struggling runs die at 310.8 into one), and the spike FAIL_HINT can pop at 323 mid-boss. | 7 → **8** |
| 11 | **84–86** · 2:04–2:08+ | **KNOCKOUT on Big Jim's face**, flattened after the hit, the marquee swap, the iris. | **The peak-end finally peaks.** Big Jim looms, Slim is pushed in, the cue lands on his jaw, and the theatre roars. Nits: the impact frame is a white-out (you see the contact one frame late); KNOCKOUT! covers his face; "The End" holds ~2.5 s on black before the victory and the poster needs 7 s; the rank sting is early. | 6 → **8** |

**Weighted (by time): 7.5** (iter5 7.0).
- Rising edges: 1→2, 4→5 (no longer a drop), 10→11 (the ending rises now).
- Remaining falling edge: **5→6**, the roof.
- Blocks still below 7: **bars 1–8 (6)** and **bars 42–49 (6)**. The finale (6 → 8) and the facade (6 → 7) are fixed.

## Redesigns for the blocks still below 7

### Bars 1–8 (6 → target 8): "the film comes to colour"

The ear is fixed; the eye isn't. Keep the gentle teach (no lethals before bar 8). Add spectacle and one early payoff
so the first wow lands at ~0:05 instead of 0:12:

1. **The colour switch on the HEY at beat 15** (bar 4, the first HEY in the record).
   - Bars 1–4 stay sepia: a silent film.
   - The BIG pendulum on 15 is the marquee's master switch. Strike it and the street floods to colour: neon on,
     bulbs chase, the goon band on the stoop starts playing.
   - It's the "Wizard of Oz" cut, on the record's own first HEY, done by the player.
   - Cost: a `sky`/grade cue on 15 plus a `setPiece colorOn` for the art. The facade already has the neon layers.
2. **A mini-launch on bar 8's HEY (31).**
   - Today's combination is pit 28 → long pit 30 → sign mid-air on 31.
   - Make 31's sign a *bounce*: an awning or cab roof that pops Slim ~250 px, landing on 33 on the kick.
   - This is 1-2-3-Action at the block scale (hop, pit, pit → **bounce**), and it previews the big launch on 34.
   - Keep 'teach' timing.
3. **Tokens on the vocal for bars 5–8.** Bars 5–6 are covered. On bars 7–8 (24–31), lay tokens on each
   `tokenMelody` onset (24, 24.33, 25, 25.33, 26, 26.67, 27.67, 28, 28.33) instead of the arc pairs. The first 8 bars
   then *sing the whole first verse line*.
4. **One hint, not two.**
   - Bar 1: "HOLD → · TAP hop · HOLD jump".
   - Bar 3's X prompt: show it on the bottle itself (a gold "X" glyph that pops on the snare), not as a banner.

### Bars 42–49 (6 → target 7.5): "rename the sign" call-and-response

The roof is the verse's stop-time. It's the ideal place for the player's hits to *be* the song, but at 0.63 actions
per beat it's the level's emptiest stretch. Keep it a valley for **threats** (it's C2's only real valley), not for
play:

1. **The roof's neon letters spell BIG JIM's; your stop-time strikes rewrite them to SLIM.**
   - The four big neon strikes (172, 174, 176, 178.66 hook) each knock out one letter.
   - The tenants in the lit windows answer each hit with a shout on the next beat: the `shouts` overlay as a
     call-and-response, like the Pool Room's goons.
   - On the versePeak (180), Big Jim's glint poster **rips down the SLIM sign**. The boss reacts to *you*, and it
     sets up the marquee swap at 333 as a payback.
   - Cost: M (4 letter states + the tenant shout cue + a setPiece). No new verb.
2. **Fill bars 43 and 45 with sung tokens.**
   - Put token rows on the `tokenMelody` onsets for 168–171 and 176–179.
   - Put a swung pair (hop on the beat, strike on the "and") on the held note 178.67, so the laundry-line hook is the
     phrase's payoff rather than its only event.
   - Target: 0.8 actions/beat, still 0 lethal.
3. **Let the house fill on the roof.**
   - Give bars 44–46 (the stop-time) a crowd cap of 20 and an `earn` window (a clean stop-time → FULL HOUSE for 4 bars).
   - The one verse where the record opens up becomes the reward for playing the stop-time cleanly.

## Castle Rock gap now

**Closed since iter5:**
- Music at full blast from second one.
- The hero is big and bright.
- The ending lands.
- Some replay pull (rank + secrets).

**Still open:**
1. **Lums sing the riff in rhythm.** Ours sing where the arcs happen to fall (fix 1 below).
2. **Constant spectacle in the first 15 s.** Castle Rock opens with a fire wall and the full band; ours opens on a
   sepia street.
3. **Enemies you can *see* play** in the foreground. Our band plays in the back layer; the Bluffers' mime is small.
4. **Speed feel.** The speed layer is too faint to register.
5. **A forgiving reward curve.** Castle Rock's lum cup never evaporates; our FULL HOUSE evaporates for a whole chorus
   after one stumble.

## Top 10 remaining improvements, ranked by fun per effort

| # | Improvement (concrete) | Fixes | Effort |
|---|---|---|---|
| 1 | **Forgiving FULL HOUSE in the choruses.** Once the house has been full in a chorus cap (≥ 20), any 4 consecutive Great+ (or a Heave) re-fills it to 20 on the next downbeat ("the crowd forgives"). Hysteresis: FULL HOUSE drops out only below 17. **Don't grade actions during a ledge scramble's recovery** (157, 192.8: 3–5 phantom misses). Target: ±130 and sloppy ≥ 20 FULL HOUSE beats in *every* chorus with ≤ 1 death. | the chorus cliff (5/7 runs lost a whole chorus), the silent scramble | S |
| 2 | **Choruses sing: `lumSing` + the late-echo guard** (see "Tokens vs the melody"). Re-lay the chorus hook bars (23, 25, 27, 52, 54, 56, 69, 71, 73) and tags (31, 60, 77) on `tokenMelody` onsets. Tokens > 1/12 beat after a sung onset play a chord ornament. Target: coverage ≥ 60 %, echo ≤ 10 %. Then listen. | CR's lum melody; fix 8 half-landed | S–M |
| 3 | **Light the gauntlet pits.** The pits under Big Jim (308–312 fist run, 318, 326, 330) get the lethal skin (lacquer red + hot rim + glow) like every other pit. Then relieve the 310.8 hotspot (3/5 struggling runs): 309's early side −105 → −120, or push 312's near lip out 20 px. Re-run `slack --hidden`. | danger language broken at the climax; the hotspot | S |
| 4 | **Poster timing + fair billing.** Split `onPoster` → `onTheEnd` at hit + 1.05 s and `onRank` at poster + 0.6 s (the stamp). A finished run floors at C (D = walked out). Show "next billing at N / canisters 0/3" on the poster. Trim the ending: victory at 2.5 s, poster at 5.0 s. | the 5 s sting gap; D mocking a finisher; replay pull | S |
| 5 | **Bars 1–8: the colour switch on 15 + a bounce on 31** (see redesign). | the first 12 s look like a tutorial | M |
| 6 | **Roof 42–49: "rename the sign"** plus sung tokens on 43/45 and a stop-time FULL HOUSE `earn` (see redesign). | the weakest block; C2 keeps its valley | M |
| 7 | **Kill late noise.** No FAIL_HINTS from ◆304 on (the spike hint at 323 mid-boss). Act-2 hints as on-object glyphs, not banners (bars 36, 38), and cut the ball banner at 211. Halve the "xN COMBO" counter and fade it out between milestones. | stakes-breaking UI at the climax; banner clutter | S |
| 8 | **Sell the speed and the band.** Speed layer: +50 % opacity, one prop per kick in the *lower* foreground band (below the lane), a whoosh on launches. One foreground instrument goon per scene on the play lane's edge (cowbell goon on the bar top in chorus 1, a pin-drummer in the Lanes, the tenants' washboard on the roof) that flares when you strike on its part. | CR #3–4: "the enemies jam", speed feel | S–M |
| 9 | **Canisters a first-timer can find.** A 1-beat gold sparkle trail up the held arc (not just 2 tokens), plus a canister-shaped silhouette on the HUD after the first near miss ("a reel is hidden up high"). Poster: "FILM CANISTERS 0/3 · hold the jump at the chimney". | replay pull; bots find 0/3 on the song line | S |
| 10 | **Chorus 1 / Lanes value contrast.** The honky-tonk chorus is brown haze on brown; lift the floor/lane value and darken the back wall 15 % so pits and Slim separate at a glance (greyscale+blur test `gameshot --gray` on 88–120 and 204–236). | readability in the busiest act-1 stretch | S |

**Not in the list, but first:** the user playtest. Every number here is from bots. Castle Rock-level feel (the hitstop
lurch, hop weight, whether the tokens sound like the tune or like an echo) needs hands and ears:
`docs/reviews/audio_checklist.md` items 1 (the start at 14) and the iteration-6 token and poster items.

## Protect this

- Bars 65–77, untouched: the Rack → hush → BREAK → drop → Sign Falls → busts → glass wall → reveal.
- The new finale: the loom-in from 335.5, KNOCKOUT on the jaw, the flatten after the hit.
- Crowd rest at 14 (full record for everyone). Fix the *chorus* cliff, not the rest level.
- The walkdown refrain ×3, Hup-Hup-HEY ×7, the respawn loop (~2.2 s to control), the fairness gate.
- Notable-only stamps; the Burn quiet at rest.

## Recommended iteration 7: "HEARD AND SEEN"

1. The user plays this build (with the checklist).
2. **Days 1–2:** fixes 1, 3, 4, 7 (all S). Re-run the bot table; target every chorus ≥ 20 FULL HOUSE beats for sloppy
   and ±130 with ≤ 1 death.
3. **Days 2–4:** fix 2 (sung choruses), then a listening pass.
4. **Days 4–6:** fixes 5 and 6 (the two sub-7 blocks), then 8 if there's time.

**Done when:**
- Every block scores ≥ 7.
- Chorus token coverage ≥ 60 %.
- No lethal pit is drawn without the lethal skin.
- The rank sting lands with the stamp.

Expected score after that: **~8.2**.
