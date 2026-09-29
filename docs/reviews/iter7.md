# Fun review: iteration 7 ("toward 8+", edit bars 1–86, 2:04)

*Reviewer pass, 2026-09-29. Build: iteration 7 (`3234640`, private build `dist-review`). Level `src/level/index.ts#gameLevel`,
song `jim_edit` (the original recording). Bar n starts on beat 4(n−1). Same method as `iter6.md`: the whole autoplay run at
5 fps, runs with deaths, bot batches, the slack meter, the rubric, the token scan, plus the poster and the title on the
real GPU. This time there is also a naive-player pass over the first 60 s.*

## Verdict

**Iteration 7 landed. The level now scores 8.1 / 10.** Iter6 scored 7.5; Castle Rock is about 9.

Every iter6 block that sat below 7 is now at least 7.5. Here is what changed:

- **The FULL HOUSE cliff is gone for sloppy and ±130 players.** They now get 21–40+ FULL HOUSE beats in every chorus.
- **The choruses sing.** Tokens cover 100 % of the sung chorus notes and none of them echo late.
- **The intro has a wow at 0:05.** The film floods to colour on the first HEY.
- **The roof is a moment now.** Your stop-time hits rewrite the neon to SLIM, then Big Jim's poster rips it down.
- **The ending is tight.** The stings land with the picture, and the poster comes up 4.3 s after the hit.

**What still keeps it off 9.** The bots can measure only two of these five.

1. **The weakest players still get the worst music.** At ±160, 36–71 % of the run plays in the booth. Every respawn
   restores the checkpoint's crowd minus 6, so each retry of chorus 4's drop plays at crowd 3, like AM radio.
2. **One 8-bar checkpoint segment (◆272, chorus 4) is a wall for weak players.** It holds 35 % of all deaths from the
   weak bots.
3. **The poster doesn't point to the replay.** `rank.next` is computed but never drawn.
4. **Feel.** Hop weight, the hitstop lurch, whether the tokens sound like the tune, and whether a first-timer sees the
   canister trail. These need hands, eyes and ears.
5. **The outro tokens rub against Croce's ad-libs** (12 % of act-3 tokens in the lab).

**Diminishing returns: yes.** See the last section. The measurable problems left are all small (S). The big unknowns can
only be answered by a human playtest and a listening pass. **The next step should be the user playing this build**, with
one small polish batch (fixes 1–5) before or alongside that.

## How this was measured

| Run | Output (`playtest/out-review-7*`) | What it gave |
|---|---|---|
| Autoplay, video, 1 shot/s | `clean` (`sheets/` 27 × 5 s at 5 fps, `key/` full-res) | the whole run by eye; UI count; the ending |
| ±160 + 20 % late, seeds 1–3 (seed 3 on video) | `j160s1..3` | the reported "16 act-3 deaths" run (seed 1 reproduces it exactly: 3/5/16); the respawn loop on video |
| ±130, seeds 1–3 (seed 1 on video) | `j130s1..3` | the median first-timer |
| Sloppy (±85 + 10 % late), seeds 1–3 | `sloppy1..3` | rubric A9, rank |
| `slack.mjs --profiles`, `--canisters`; `tokens.mjs`; `rubric` | `misc/` | expected deaths, canister windows, tokens vs melody, the gate |
| `gameshot.mjs --end` / `--title` (real GPU, 1080p, 60 fps) | `misc/poster`, `misc/title` | the poster and the title card |

**Not done:** heard or played by a human. Every audio judgement below comes from the mix-lab numbers in
`audio_checklist.md` and the token scan, not from listening.

## The numbers

| Profile | Deaths (act 1/2/3) | Perfect / Miss | FULL HOUSE beats ch1/ch3/ch4 | Booth % of run | Rank |
|---|---|---|---|---|---|
| autoplay | 0 | 100 / 0 % | 32 / 32 / 32 | 0 | A 89.9 (next: S, +2.1, "canisters") |
| sloppy s1 | 0 (1 stumble 278) | 42 / 2 % | 28 / 32 / 26 | 1 | B 81.7 |
| sloppy s2 | 2 (118.8, 276.8) | 45 / 2 % | 25 / 32 / 37 | 2 | B 76.0 |
| sloppy s3 | 0 | 44 / 1 % | 32 / 31 / 32 | 0 | B 83.6 |
| ±130 s1 | 1 / 1 / 3 | 33 / 0 % | 24 / 21 / 66 | 2 | C 63.1 (B in 4.9) |
| ±130 s2 | 2 / 1 / 1 (one Burn catch 234) | 33 / 0 % | 40 / 37 / 32 | 6 | C 65.9 (B in 2.1) |
| ±130 s3 | 2 / 1 / 5 | 29 / 1 % | 31 / 37 / 84 | 4 | C 62.2 (B in 5.8) |
| ±160+20 % s1 | 3 / 5 / **16** | 25 / 19 % | **0** / 4 / 41 | **71** | C 41.9 floored |
| ±160+20 % s2 | 2 / 2 / 3 | 29 / 13 % | 27 / **0** / 8 | **46** | C 42.7 floored |
| ±160+20 % s3 | 3 / 4 / 5 | 29 / 16 % | 6 / 2 / 19 | **36** | C 42.6 floored |

ch4 counts above 32 include replays after a death.

**Slack meter, expected deaths per run:**
- sloppy 0.52.
- ±130 6.45.
- ±160+20 % 15.1, of which **◆272 accounts for 3.71**, the most of any checkpoint.

**Canisters:** all three are reachable and survivable. The held-jump windows are:
- #1 (43): −165/+235 ms
- #2 (170): −210/+230 ms
- #3 (315): −110/+210 ms

The bots find 0/3 without `--hunt`, as designed. The tease ("SOMETHING UP THERE?") fired in 9 of 10 runs.

**Rubric:** the top-10 gate passes 11/11, with ρ(intensity, energy) = 0.89. These still fail:
- **A7:** bar 41's re-entry bar is 3.5 vs a section mean of 3.1, a side effect of the roof's +3 reward actions. Trivial.
- **A10:** 2 sloppy deaths is too few for a statistic.
- **B4r:** chorus 3 has 7 of 11 bars on plain quarters.
- **B5, C2, D3, E3:** as in iter6.

**Doc drift:** `CLAUDE.md` lists an act-3 checkpoint at 284. The level has none (checkpoints are 256, 272, 304, 320).

## Iter6's top 10: did they land?

| # | iter6 fix | Landed? | Evidence / new problems |
|---|---|---|---|
| 1 | Forgiving FULL HOUSE + fair grading after a scramble | **Yes** | Sloppy and ±130 get ≥ 21 FULL HOUSE beats in every chorus (iter6: 5 of 7 runs lost a whole chorus). The ±160 video shows it plainly: death → rewind → count-in → WHEW → **ENCORE!** 1.5 s later → FULL HOUSE again. ±160 still loses choruses (FULL HOUSE 8–10 % of the run), see fix 1 below. |
| 2 | Choruses sing (`lumSing` + no late echo) | **Yes (by data)** | Chorus coverage 129/129 and tags 21/21, 0 % echo. Verses cover 59 %. **Outro coverage is 27 %**, and 38 % of the outro's tokens sit an echo's distance after a syllable (the audio turns them into answers). Needs ears (checklist 35). |
| 3 | Light the gauntlet pits, ease 309 | **Yes** | Red glow between Big Jim's fists (`key/v115.8.jpg`). ◆304 still claims 2–3 deaths per ±160 run (310.3 / 312.6). That's fine for the boss, and ±130 had none there. |
| 4 | Poster timing + fair billing | **Mostly** | Hit → THE END at +1.2 s → victory at +2.4 s → poster at 4.3 s (video 2:07.2 → 2:08.4 → 2:09.6). A finisher is floored at C. **The replay pointer (`rank.next`) isn't drawn**: the ±130 runs are 2–6 pts short of B and the game knows canisters would get them there, but the poster doesn't say so. |
| 5 | Intro: colour burst on 15, bounce on 31 | **Yes** | The sepia street floods to colour on the first HEY at 0:05.6, in the same frame as the first 10-in-a-row stamp. The BOING! cab-roof pop at 0:11.6 previews the big launch. It fires on the beat rather than on the player's strike (see fix 7). |
| 6 | Roof: rename the sign | **Yes, a highlight** | BIG JIM'S → … → SLIM, one letter per stop-time hit. ENCORE!, then FULL HOUSE on the roof, then Big Jim's poster tears the sign down. The in-between words (SIM'S, SLM'S, SLIS) read as gibberish until the last hit (fix 6). |
| 7 | Kill late noise | **Yes** | 2 banners (bar 1 all three verbs, bar 18 the knee-slide). Act 2's teaches are glyphs on the objects. No FAIL_HINT after ◆304. The combo counter is smaller. |
| 8 | Speed layer + a foreground musician | **Partly, can't verify** | Speed streaks behind Slim show in stills. No foreground instrument goon reads at 5 fps. Needs eyes at 60 fps. |
| 9 | Findable canisters | **Yes (signposted)** | Spotlit reel + token trail up the held arc + glints + the tease line (`key/v19.2.jpg`). Whether a human looks up is untested. The poster only lists "found 0/3" and doesn't say how to find them. |
| 10 | Chorus 1 / Lanes contrast | **Yes** | Spotlight pools; Slim pops on the brown bar. Chorus 1 is still the darkest chorus. |

## Findings on the specific questions

### The ±160 run with 16 act-3 deaths: not a fairness bug, but a structural wall

The run is seed 1 of ±160 + 20 % late. It reproduces exactly (3/5/16). Its act-3 deaths break down as:

| Where | Deaths | Notes |
|---|---|---|
| ◆256 (the Rack) | 3 | 263.4, 266.6, 268.6 |
| **◆272 (chorus 4)** | **12** | the 276 well ×7, 284 ×2, 290.7, 291.7, 295.4 |
| ◆320 | 1 | 330.7 |

The report's `deathPresses` event gives the press offsets for the seven deaths at 276:

| | Offsets (ms) |
|---|---|
| Early | −151, −136, −171, **−85, −85** |
| Late | +192 |

The 276 well is −80/+165.

**Verdict: a very bad player, not an unfair pit.** Five of the seven presses were more than 130 ms off. The two at −85 ms
are the intended "−80 exam" edge. It is a tail event: p ≈ 0.3 per attempt, and 7 of 13 attempts died there.

**But the structure turns bad luck into a wall.**
- **One checkpoint, eight lethal presses.** ◆272 covers 32 beats with 8 lethal presses (276, 280, 282, 284, 290–292,
  294), and two of them are −80 exams.
- **The tightest pit comes first.** 276 is 4 beats after the respawn's auto-launch, so a player stuck there replays the
  same 4 seconds.
- **Every retry sounds worse.** Each one restarts the crowd at 3 (`game.ts:603`: snapshot − 6), so the level's biggest
  moment, the drop and Sign Falls, plays in the booth on every retry.
- **It is the hotspot for every weak profile.** Across the 6 ±130/±160 runs, ◆272 holds **21 of 60 deaths (35 %)**. The
  276 well alone holds 9 (15 %).

Fix: fixes 1 and 2 below.

### Act-3 tokens vs the singer (12 % rubs, the outro ad-libs)

**Don't move them and don't silence them.**
- **Why not move them:** the outro tokens are the reward line through the gauntlet. They mark the path over Big Jim's
  fists and lapel, and moving them would change what the player reads.
- **Why not silence them:** the pickup sound is the feedback.

**Fix: make the outro (304–340) answer only.** Every token plays a chord tone at least a minor third from the singer and
never doubles him. This is the rule iter7 already uses for late tokens, applied to the whole range. Croce's outro is
scooped, speech-like ad-libs, which is exactly where the lane's "doubles" rub. It's a range override in
`tokenMelody.ts`, or `mode: 'harmony'` for the outro in `token_lanes.py`. Then re-run the `--prefix=polish` token report.
Target: act-3 rubs ≤ 3 %.

### FULL HOUSE stability per profile

| Profile | FULL HOUSE share of the run | Every chorus ≥ 20 FULL HOUSE beats? | Rallies per run | Booth % |
|---|---|---|---|---|
| autoplay | 50 % | yes | 1 | 0 |
| sloppy | 41–48 % | yes | 1–3 | 0–2 |
| ±130 | 38–43 % | yes | 1–3 | 2–6 |
| ±160 | 8–10 % | no | 3–7 | 36–71 |

Stable for everyone down to ±130; not for ±160. At ±160, rallies do fire (3–7 per run), but deaths at 16–19 % misses
keep dragging the house back down.

### Canister discoverability

The signposting is now good on paper. A spotlit film reel above the path, a token trail up the held arc, four rising
glints, and "SOMETHING UP THERE?" when you run under the first one.

Two gaps:
1. **The poster doesn't say how.** It shows "found 0/3" but never "hold the jump at the chimney".
2. **Only humans can tell us** whether anyone looks up at 161 BPM with 7 things on screen.

### Clutter: first 30 seconds as a naive player

**Always on screen:**
- 4 HUD clusters: tokens "N / 1048", targets "0 / 13", crowd number + bar, and 4 metronome bulbs.
- The Burn's flame edge on the left.
- The audience silhouettes along the bottom.
- The beat marks under the floor.

**Transient text and events in 0:00–0:30:**
- 2 hint banners.
- HEY! subtitles.
- About 6 PERFECT! labels.
- 10 / 25 / 50 IN A ROW stamps, then the xN combo from 10.
- BOING!, the SC. 8 / SC. 15 clapperboards, SOMETHING UP THERE?, and X glyphs on bottles.

The worst frame (`key/v14.4.jpg`, bar 8) has about 9 things to read at once.

A human at ±130 peaks at a combo of 12–14, so they'd see few streak stamps. The stamp noise is mostly an autoplay
artefact, and it's acceptable.

**What does confuse a first-timer is the numbers:**
- **/1048** is an intimidating denominator.
- **0/13** doesn't say what it counts.
- **14** means nothing until FULL HOUSE! appears next to it.
- **The title card's second control line** ("[ / ] audio latency · ` debug overlay") is developer text.

**Over-engineered?** The systems are deep: crowd rest / decay / caps / earn / forgive / rally, the Burn's threat and
assists, judge lag, latency drift. But almost all of it is invisible, which is right. The visible layer is what needs
trimming, and it's about 4 elements (fix 5).

## Fresh eyes: the first 60 seconds of someone who has never seen it

*Times are wall-clock from page load. The song starts around 8 s.*

- **0 s, the title.** A lit marquee says "BIG JIM", with "with SLIM CHANCE" in tiny type. *Smile #0 if they get the joke.*
  "PRESS ANY KEY TO ROLL THE FILM" is clear. The controls line is readable but dense; they skim "Hold → run, Space hop,
  X swing".
- **~3 s, the first key.**
  - On a first-ever run, the first X opens **SYNC THE PROJECTOR: "tap X on every click"**. It's 8 clicks, a clear
    instruction and a clear purpose. It is also a small quiz before any fun. Most players will do it; some will be
    confused about why a platformer wants a rhythm test. SPACE skips it, but nothing on screen says so.
- **~8 s, the street.**
  - The countdown leader 4-3-2-HEY is classic cinema and reads instantly as "get ready". Then a sepia street, the
    record at full volume, one banner: "→ HOLD to run · SPACE hop (hold = jump) · X swing".
  - They understand: hold right, things come at you on the beat. Tokens ping in tune. Bottles have an X glyph on them,
    so "hit that". The red flame edge creeping in on the left reads as "something behind me, don't dawdle" (right).
  - What confuses them: the three numbers top-left, the four bulbs top-right, and why the X strike swings at empty air
    when mistimed.
- **~14 s, the first real smile.** They strike the big 8-ball on the first HEY and **the whole street floods from sepia
  to colour** with a rising "aaah". That's the Wizard-of-Oz cut. It's the best 0–15 s the game has had.
- **~20 s, the second smile.** Pit, pit, then BOING!: the cab roof pops Slim up to smash the big sign on the HEY.
- **~22–35 s, the first feeling of skill.**
  - Rooftop hops land on the kick while tokens sing the verse, and the "SOMETHING UP THERE?" line makes them look up.
  - The first moment they *feel* skilled is probably the chorus drop (bar 23, 0:33 song time, about 0:42 wall-clock): a clean Hup-Hup-HEY
    fills the house and FULL HOUSE! lands on the downbeat. For a ±130 player that works; they also get a WHEW or two on
    lips.
  - If they die at a pit (±130: about 1 per act), they see: the film rewinds ("REWIND TO THE SPLICE"), the leader
    counts in, and they're running again in about 2 s. Cheap and informative.
- **~45–60 s, the honky-tonk.** They know the language now: gold = hit it, red glow = don't fall, the ↓ banner for the
  knee-slide. The spotlight follows them. **Understood by 60 s:** run, hop, jump, swing, and "hitting on the beat makes
  the band bigger". **Still not understood:** what the numbers mean, what the canister is, and what the rank will
  judge.

**Net.** A clean, charming first minute with two real smiles before 0:20, and skill felt by ~0:35. The friction is the
sync quiz before the fun, plus four unexplained numbers.

## Moment-to-moment fun log (per block)

*Scores are for a first-time player at about ±100 ms, sound on. Times are song time.*

| # | Bars · time | What changed in iter7 | How it feels now | iter6 → **iter7** |
|---|---|---|---|---|
| 1 | **1–8** · 0:00–0:12 | Colour burst on 15, sung tokens bars 5–8, one banner, the bar-8 cab-roof BOING | Sepia is now the setup of a gag, not a tutorial look. First wow at 0:05, second at 0:11. Still a teach (0 lethals before bar 7). | 6 → **7.5** |
| 2 | **9–16** · 0:12–0:24 | — | The launch and stop-time over the full record. Unchanged, still good. | 7 → **7** |
| 3 | **17–24** · 0:24–0:36 | Chorus contrast; the chorus-1 hook sung by the tokens | The drop fills the house on the downbeat, and the hook plays in your pickups (by data; unheard). | 8 → **8.5** |
| 4 | **25–33** · 0:36–0:49 | Forgiving house (ENCORE!) | One slip no longer costs the chorus. The 127 lift run is still the sloppy player's one act-1 death. | 8 → **8.5** |
| 5 | **34–41** · 0:49–1:01 | The judge follows the hero after a scramble; act-2 teaches as glyphs | No more phantom misses after a ledge scramble; less banner noise. | 7 → **7.5** |
| 6 | **42–49** · 1:01–1:13 | SLIM sign, FULL HOUSE on the roof (forgive cap 21), +3 actions, sung tokens | **A story beat you cause:** your hits rewrite Big Jim's neon, the house fills, then his poster rips it down. Still the level's calmest play (density 0.72, 0 lethal), but it now reads as a set-piece, not a lull. | 6 → **7.5** |
| 7 | **50–60** · 1:13–1:29 | Forgiving house; sung chorus 3 | Window crash → zip → the Lanes, and chorus 3 is no longer lost to one ball stumble. ◆196 is act 2's weak-player hotspot (200.6 / 208.7: 10 of 60 weak-bot deaths). | 8 → **8.5** |
| 8 | **61–68** · 1:29–1:41 | — | Pool Room, the Rack, hush → BREAK. Protect it. | 8 → **8** |
| 9 | **69–76** · 1:41–1:53 | Sung chorus 4; 280 eased to −95 | Still the peak for a ±100 player. **For ±160 it's the wall** (above): up to 12 retries of a drop heard in the booth. | 9 → **9** (±160: 6) |
| 10 | **77–83** · 1:53–2:04 | Lethal glow on every gauntlet pit; 309 −120 | The danger language holds on the boss, and the fist run reads as scary *and* fair. Outro tokens may rub the ad-libs (by data). | 8 → **8.5** |
| 11 | **84–86** · 2:04–2:10 | Trimmed ending; stings on THE END and the stamp; C is warm | KNOCKOUT → THE END (+1.2 s) → victory (+2.4 s) → poster (+4.3 s): brisk, no dead air. The poster lacks the "how to do better" line. | 8 → **8.5** |

**Weighted by time: 8.1** (iter6 7.5). No block is below 7.5 except bars 9–16 (7), which is solid and unchanged.

## Top 10 remaining improvements, ranked by fun per effort

| # | Improvement (concrete) | Fixes | Effort |
|---|---|---|---|
| 1 | **The house roots for you on a retry.** On respawn, crowd = max(snapshot − 6, `restAt` 14). The record plays full on every retry, and the booth stays the cost *within* an attempt. Also, below 10, `recoverPerBeat` 0.12 → 0.3. Target: ±160 booth 36–71 % → ≤ 20 %. | The weakest player hears the worst music; the drop muffled on every ◆272 retry | S (2 lines + bot rerun) |
| 2 | **Break the ◆272 wall.** Either add a checkpoint after the 284 well (on the fallen G, ~285; move the 286 jabber off the re-entry for A7), or add a mercy rule: after 3 deaths at one checkpoint, that segment's lethal pits get +25 ms early slack (−80 → −105), invisibly. Keep the −80 exam for everyone else. Target: no segment > 20 % of weak-bot deaths. | 35 % of weak deaths in one segment; the 16-death run | S |
| 3 | **Poster replay pointer.** Draw `rank.next` under the stamp: "CULT CLASSIC in 4.9 pts: find a film canister (hold the jump at the chimney)", and always show "film canisters 0/3". | The ±130 player is 2–6 pts from B and doesn't know how to get there; canister discoverability | S |
| 4 | **Outro tokens answer only** (304–340: chord tones ≥ a minor third from the singer, never doubling his ad-libs). Re-measure with `--prefix=polish`. | Act-3 rubs 12 % → ≤ 3 % | S |
| 5 | **First-contact cleanup.** Title: drop "[ / ] audio latency · ` debug overlay" (keep it in pause). Sync screen: add "SPACE: skip". HUD: tokens without "/1048" (the poster has the total), hide targets until the first one cracks, crowd bar + FULL HOUSE! without the raw number. | 4 unexplained numbers; the sync quiz feels like homework | S |
| 6 | **SLIM reads from hit 2.** Each hit lights one letter of SLIM over a dark sign (S · SL · SLI · SLIM), or reads JIM'S → SLIM'S, so the joke lands before the last hit. | SIM'S / SLM'S / SLIS read as gibberish | S (art) |
| 7 | **The colour burst by your hand.** The strike on 15 triggers it; a miss still bursts on 15.5, softer. | "You did that" at the first wow | S |
| 8 | **◆196 check** (act 2's weak-player hotspot: 200.6 / 208.7 took 10 of 60 weak-bot deaths). Use `slack --why` on 200 and 208. If 208's early side after the hook ride is the killer, go −90 → −105. | Act-2 weak-player deaths | S |
| 9 | **Chorus 3 rhythm variety** (B4r: 7 of 11 bars plain quarters, 4 rhythms). Put 2 swung pairs (hop on the beat, strike on the "and") into the Lanes' middle bars. | The one chorus that plays square | M |
| 10 | **Housekeeping:** fix `CLAUDE.md`'s act-3 checkpoint list (no ◆284), and the rubric's A7 roof re-entry (bar 41: move one of the +3 roof rewards off the first bar). | Doc drift, a trivial rubric fail | S |

**Not in the list, but first: the user plays this build.** Use `audio_checklist.md` items 32–38, plus two questions:
- Did you look up at the canister?
- Did the sync screen feel like homework?

## Castle Rock gap now

**Closed since iter6:**
- The lums sing the tune (by data).
- Spectacle in the first 15 s.
- The reward curve forgives (for sloppy and ±130 players).
- A tight ending.

**Still open, and none of it measurable by bots:**
1. **Feel of the verbs:** hop weight, the strike's hitstop lurch, the catch-up surge. Castle Rock's run is effortless.
2. **The band you can see in the foreground.** It isn't legible in stills, so it needs eyes at 60 fps.
3. **Whether the tokens *sound* like the tune** or like a music box on top of the record.
4. **The weak-player experience** (fixes 1–2). This one is measurable, and cheap.

## Protect this

- The colour burst on 15.
- The SLIM sign and the poster rip.
- Bars 65–77 (Rack → hush → BREAK → drop → Sign Falls → busts).
- KNOCKOUT on the jaw.
- The 4.3 s ending.
- The rally/ENCORE forgiveness.
- The 2-banner teach.
- The −80 exams for players who aren't stuck.
- The fairness gate (hidden-lethal sweep).

## Have we hit diminishing returns on autonomous iteration?

**Yes.** Iterations 5–7 each moved the score about 0.5 by fixing things bots and data could see:
- the booth time
- the chorus cliff
- the echoing tokens
- dark pits
- the sting timing
- the empty roof

That list is now nearly exhausted. The remaining measurable items (above) are all S. They're worth one short batch, and
would take the level to about 8.3.

The gap from 8.3 to 9 is **feel and perception**:
- whether a jump feels weighty
- whether the hitstop feels juicy or laggy
- whether the pickups sound like Croce's tune
- whether a first-timer notices the canister
- whether the sync screen annoys
- whether chorus 1 is too dark on a real monitor
- whether 9 things on screen at bar 8 feel busy or alive

None of these has a bot proxy. Our proxies for them (grades, LUFS, rub %) have already been optimised to their targets.

More autonomous iterations would risk polishing the numbers instead of the fun. That is the "over-engineered" trap: the
crowd meter alone now has rest, decay, caps, earn, forgive and rally.

**Recommendation:**
1. Ship fixes 1–5 (about 1–2 days).
2. Stop, and get a human playtest plus the listening checklist.
3. Let that feedback pick iteration 8.
