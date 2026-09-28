# Act 1 plan: intro → end of chorus 1 on the ORIGINAL recording (edit bars 1–33)

*Level designer's plan for iteration 2. Written against `assets/audio/jim_edit.beatmap.json` (lanes read directly),
`docs/FUN_RUBRIC.md` and the iteration-1 review (`docs/reviews/iter1.md`). Where DESIGN §4 rule 1 (required-action
density) and the §7 bar map disagree with the rubric, the rubric wins. Implemented in `src/level/slice.ts`.*

## Grid and form (from the edit's beat map)

- **Beat 0 = song bar 1 beat 1.** Bar *n* starts on beat `4(n−1)`. There is no pickup bar in the record: the
  count-in is the game's (4 beats from the cold-open STRIKE). Swing (the "and") = 0.659 → authored as `+0.66`.
- Act 1 = **bars 1–33, beats 0–132**, ending on the verse-3 downbeat (the edit's splice sits at beat 130, inside
  the turnaround, and is inaudible).

| Bars | Section (edit) | Energy (per bar) | What the record gives the level |
|---|---|---|---|
| 1–4 | intro, band only (E) | .26 .57 .43 .54 | kick 1&3, snare 2&4; bar 4 fill (&3 accent, kick on 4) + our HEY overlay on 4 (beat 15) |
| 5–12 | verse 1 front half (E, E7 on 12) | .79 .50 .88 .61 .64 .60 .77 .79 | vocal enters on 5; held notes 19.64 (1 b), **20.66 (2 b)**, 34.67 (1 b); fills bar 8 (&3, 4, &4) + HEY on 31; bar 12 fill (&3, &4, 1); dense swung vocal in 11 |
| 13–20 | verse 1 back half (A7/B7), **stop-time: bass out** 51–54, 56–59, 64–78 | .81 .67 .74 .56 .67 .76 .73 .88 | swung-8th vocal line in 13; held notes 53.96, 63.89 (the high D → **versePeak** on 17 b1), 70.67 (1 b); bar 20 fill on &1, &2, 3 |
| 21–22 | pre-chorus (E), **bass walk-up** E E F# G# → A | .59 .78 | bar 21 fill (&3, 4, &4, 1); HUP 84 · HUP 85 · HEY 86 overlay; vocal line 1 pickup on 87 |
| 23–30 | chorus 1: A7 E7 A7 E7 A7 A7 B7 E | .79 .79 .81 .61 .75 .74 .71 .56 | **A7 climb** each A7 bar (A 1, A 2, C# 2.67, D 3, D# 3.67, E 4); HEY 93, 94, 102; held notes 94.78, 98.12, 102.97, 109.14; **hook-A walkdown** B A G F# on bar 29's quarters → E on 116; bar 30 fill (&3, &4, 1) + hook B |
| 31 | tag (hook B) | **.48** (the dip) | held 1 on beat 1, held note 122.6 |
| 32–33 | turnaround (B7): **piano B stabs on every beat**, bass B quarters | .65 **.93** | HEY 126; fill &3, &4; **HUP 128 · HUP 129 · HEY 130**; vocal pickup 130.67 into verse 3 |

No crash lane exists in this mix; `fills` accents and the overlay `shouts` are the hit points.

## Economy targets (rubric gate)

- ~0.7 actions/beat in the intro, ~0.9 in the verses, ≥ 1/beat in the chorus.
- **Reward share ≥ 75% in bars 1–16, ≥ 60% overall, ≥ 45% in the chorus.** Rewards = bottles/crates (strike →
  token burst), pendulums, token hops and held jumps, pools (safe gaps), bounce launches, lifts over a pool.
- **Lethal ≤ 0.5/bar in intro/verses, ≤ 1/bar in the chorus, 0 in bars 1–6**, and only on beats 1/3 (the kick) or a
  shout. A slam-lift run counts once. **No lethal within 2 beats after a checkpoint.**
- Stumbles (spike, jabber, low sign) ≤ ~6 per 8 bars, always on a drum hit.
- Every 8-bar block is a **sawtooth**: bars 1–2 groove, 3–6 develop, 7–8 peak. The chorus block is the act's peak.
- **No identical bar twice in a row; ≥ 5 distinct bars per 8.** Rhythm comes from the record: swung pairs on the
  fills' "and" accents, held jumps across held vocal notes, slides on held notes, rests in the stop-time, strike runs
  on the walkdown and the piano stabs.

## New pieces (lean, all data-driven, reuse the DSL)

| Piece | Verb | Cost of a miss | Where it lives |
|---|---|---|---|
| **Bottle / crate** (breakable) | X on its beat (also on the swung "and", or up high mid-air) | nothing (no tokens) | reward on snares, stabs, fill accents, the walkdown |
| **Bounce pad** (launch) | automatic when you reach it; aims to land on a beat | — | the "speed portal": up onto the rooftops (bar 9), into the chorus (bar 23), the act's last beat |
| **Raised floors** (rooftops, bar top) | hop down / drop | — | height changes: street → roofs → street → bar floor → bar top → floor |
| **Low sign** | ═ hold ↓ (knee-slide) under it | stumble | held vocal notes (bars 18, 28) |
| **Pool** (safe gap, shallow puddle) | ∪ / – over it | splash, no tokens | teaches every pit before the first lethal one |
| **Lifts over a pool** | ∪ every beat | splash | teaches the lift rhythm (bar 19) before the lethal run (bar 32) |

Lifts are reworked: the solid window is wider, the jump buffer is longer (a late hop followed by an early one no
longer eats the second press), the lethal run is 4 hops split over two bars (≤ 2 lethal per bar), and a checkpoint (the tag, beat 120) sits right
before it.

## Bar-by-bar

Legend: **∪** tap hop · **–** held jump · **X** strike · **═** slide. **R** reward, **S** stumble, **L** lethal.
Beats are absolute; "&" = +0.66. *World* = the presentation cue (fx flash/shake/zoom/bgPulse, sky, camera).

### Block 1 — 42nd Street, golden hour (bars 1–8, beats 0–32). Follows: guitar/kick, then the vocal.
| Bar | Music | Actions | Mode / height | World |
|---|---|---|---|---|
| 1 | band in, kick 1&3 | ∪ 2 R (token arc) · swung token row on the strum | street 0 | hint: run = the beat |
| 2 | kick 1, 3, 4.99 | ∪ 4 R · – 6 R (big arc) | street | hint: tap/hold |
| 3 | snare 2&4 | X 9 R (bottle) · ∪ 10 R · X 11 R (bottle) | street | hint: X smashes bottles on the snare |
| 4 | fill, **HEY 15** | ∪ 12 R · X 13 R · ∪ 14 R · X 15 R (BIG pendulum on the HEY) | street | flash + zoom on 15 |
| 5 | **vocal enters**, kick 3 | X 17 R · ∪ 18 S (first spike, kick) · tokens trace the vocal | street | **the Burn rises** (zoom + shake on 16) |
| 6 | **held note 20.66 → 22.74** | – 20.66 R (held jump across the held note, over a long pool) · X 23 R | street, first pool | — |
| 7 | vocal phrase 2 (energy .88) | ∪ 24 R (pool) · X 25 R · ∪ 26 S (spike) · X 27.66 R (vocal pickup) | street | — |
| 8 | fill &3/4/&4, **HEY 31** | ∪ 28 R · ∪ 30 **L** (first lethal gap, kick) · X 31 R (BIG, HEY) · X 31.66 R (fill &4) | street | flash + zoom 31 · peak |

### Block 2 — the neon rooftops (bars 9–16, beats 32–64). Follows: the vocal melody. ◆ checkpoint 32.
| Bar | Music | Actions | Mode / height | World |
|---|---|---|---|---|
| 9 | held note 34.67 | X 33 R · **LAUNCH** from the pad on 34 (kick) · X 35 R (bottle up high, mid-flight) | street → **launch → roof 150 px** | sky → neon; zoom-out punch on 34 |
| 10 | descending vocal run | X 37 R · ∪ 38 R (hop down to the 90 px roof) · X 39 R | rooftops (step down) | — |
| 11 | dense swung vocal | ∪ 40 **L** (alley gap, kick) · X 40.66 R (swung pair, mid-air) · ∪ 42 S (vent spike) · X 43 R | rooftops | — |
| 12 | E7 fill (&3, &4, 1) | X 45 S (**first jabber**) · ∪ 46 R (drop off the roof) · X 47 R · X 47.66 R | **drop → street** | shake + bgPulse on the fill |
| 13 | stop-time starts, swung-8th vocal | ∪ 48 R · X 49 R (pendulum sign) · ∪ 50 R · X 51 R (bass drops out: your hit is the sound) | street | bgPulse 51 |
| 14 | held note 53.96 | ∪ 52 R · – 54 **L** (first long gap, on the held note and the kick) · X 55 R (high bottle, mid-jump) | street | — |
| 15 | bass out 56–59 | – 56 R (held jump over a pool) · ∪ 58 R · X 59 R (a breather) | street | — |
| 16 | pickup to the high D | ∪ 60 **L** (gap) · X 61 S (jabber) · X 62 R (BIG pendulum) · rest | street | zoom 62 · peak |

### Block 3 — the honky-tonk (bars 17–24, beats 64–96). Follows: stop-time vocal, then the bass walk-up. ◆ 64, ◆ 80.
| Bar | Music | Actions | Mode / height | World |
|---|---|---|---|---|
| 17 | **versePeak** (held D), bass out | X 65 R · – 66 R | bar floor | sky → honky-tonk, timber floor |
| 18 | held note 69.67 | X 69 R · ═ 69.66 S (**first knee-slide** under a low sign, on the held note) · ∪ 71 R | bar floor | hint: hold ↓ |
| 19 | stomp on every beat | ∪ 72 · ∪ 73 · ∪ 74 R (**lifts over a pool**: the safe teach) · X 75 R | **lifts** | hint: hop every beat |
| 20 | fill &1, &2, 3 | ∪ 76 R · X 76.66 R · X 77.66 R · ∪ 78 R (fill run) | bar floor | bgPulse on the fill |
| 21 | pre-chorus fill (&3, 4, &4) | X 81 R · ∪ 82 R · X 82.66 R · X 83.66 R | bar floor | section shift: bgPulse 80 |
| 22 | **walk-up E E F# G#, HUP HUP HEY** | ∪ 84 **L** (gap) · ∪ 85 S (spike) · X 86 S (jabber) = **Hup-Hup-HEY → Heave** · ∪ 87 R | bar floor | pulses on the HUPs, flash on the HEY |
| 23 | **CHORUS: A on the downbeat** | **LAUNCH** on 88 · X 89 R (high bottle) · land on the **bar top (120 px)** · X 90.66 R (D# of the climb) · ∪ 91 S (spike) | **launch → bar top** | camera zoom-out 0.82, flash + shake on 88 |
| 24 | E7, **HEY 93, 94**, fill &4 | ∪ 92 **L** (gap in the counter) · X 93 S (jabber) · X 94 S (jabber) · X 95.66 R | bar top | flash on each HEY · peak |

### Block 4 — chorus body, tag, turnaround (bars 25–33, beats 96–132). Follows: the shouts + stabs. ◆ 96, ◆ 120.
| Bar | Music | Actions | Mode / height | World |
|---|---|---|---|---|
| 25 | A7 climb | X 97 R · ∪ 98 S (spike, D) · X 98.66 R (D#) · X 99.66 R | bar top | — |
| 26 | E7, **HEY 102**, piano stab | ∪ 100 R · X 101 R · X 102 S (jabber) · – 103 R (off the bar top, held note 102.97) | bar top → floor | flash 102 |
| 27 | A7 climb | X 105 R · ∪ 106 **L** (gap) · X 106.66 R · X 107.66 R | floor | — |
| 28 | A7, held note 109.14 | ∪ 108 **L** (gap) straight into ═ 109 S (slide under a sign) · ∪ 110.66 R · X 111 R | floor | — |
| 29 | **hook A walkdown B A G F#** | X 112 · X 113 · X 114 · X 115 R (a line of big crates: everyone slams) | floor | shake + zoom on every quarter |
| 30 | E + fill (&3, &4) | ∪ 116 R · X 117 R · ∪ 118 **L** (gap) · X 118.66 R · X 119.66 R | floor | flash 116 |
| 31 | **tag: the dip** ◆ 120 | X 121 R · ∪ 122 R · X 122.66 R | floor (breather) | — |
| 32 | **piano B stabs on every beat, HEY 126** | X 124 R (crate) · X 125 R · ∪ 126 **L** · ∪ 127 **L** (the lethal lift run starts on the HEY, counts once) | **lifts over the cellar** | bgPulse every stab, flash 126 |
| 33 | **HUP 128 · HUP 129 · HEY 130** | ∪ 128 · ∪ 129 **L** (the last lifts = HUP HUP) · X 130 S (Hup-Hup-HEY → Heave) · last pad on 131 · X 131.66 R (bottle mid-flight) | lifts → floor → **launch** | zoom punches; final flash on 132 |

## Crowd

The streak meter now has a **per-section cap** (level data): 10 in the intro, 16 in the verse, 19 in the
pre-chorus, 24 from the chorus. FULL HOUSE (≥ 20) can only happen in the chorus. A missed target costs one member.

## Checks

- `npm run rubric -- --song=assets/audio/jim_edit.beatmap.json --beatmap=assets/audio/jim_edit.beatmap.json`
- sloppy bot ×5 seeds (±85 ms + 10% late): ≤ 1 death per 8 bars on average, none in bars 1–16; autoplay 0 deaths.

## As shipped (iteration 2)

The tables above are the shipped layout (edited during tuning: the first jabber moved to bar 12 so block 2 opens
low; bar 15 became a breather; the chorus got two more pits (27, 28) so the chorus block is the act's peak; the
lethal lift run moved to the turnaround and carries the record's HUP HUP; strikes are never closer than 0.66 beat).
112 actions: 84 reward / 15 stumble / 13 lethal (75% reward). Checkpoints 32, 64, 80, 96, 120.
Rubric gate 11/11; sloppy bot (±85 ms + 10% late) 0 deaths over 5 seeds; see docs/ITERATIONS.md.
