# Act 3 plan: breakdown → final chorus → outro → the final hit (edit bars 61–86)

*The level designer's plan for the climax. It uses the same method as `act1_plan.md` and `act2_plan.md`: bar by bar on
the edit's beat-map lanes (`assets/audio/jim_edit.beatmap.json`, read directly), checked against `docs/FUN_RUBRIC.md`,
DESIGN §5.7 / §6.1–6.3 and the act-3 table in `docs/reviews/iter2.md`. **Plan only, no code yet.** It will live in
`src/level/act3.ts`, joined by `level/index.ts`. That join drops act 2's `finish` on 240 but keeps its flash and shake.*

## Boundaries and what the record gives

Bar *n* starts on beat `4(n−1)` and "&" is +0.66. **The final hit is beat 340 = bar 86 b1.** The record fades from 341
(`stops`) and the ring-out runs to about 345. Act 2 leaves Slim on the Blacklight Lanes deck (h 950 px, the Jimperial's
4th floor) at 240. Its last checkpoint is 236.

| Bars | Section | Energy / bar | Lanes the level uses |
|---|---|---|---|
| 61–68 | breakdown: E vamp (240–272) | .46 .32 .41 .39 .44 .52 .36 **1.00** | **Black Betty stomp** 1 · &2 · 3 (240, 241.66, 242 …), claps 2 & 4, swung cowbell 8ths. **Chromatic pickups** B C D D# → E at 246.67–248, 254.5–256, 262.69–264, 270.5–272. Held C# 243.71. Spoken vocal 246.8–265.5. **Bar 68 fill: &2 269.70, &3 270.70, &4 271.65 (tom, vel .78, the loudest drum hit of the breakdown), 1 271.98** |
| 69–76 | chorus 4, the last (272–304) | .85 .80 **.90** .72 .76 .85 .85 .59 | A7 climb in 69/71/73/74 (A, A, C# &, D, D# &, E). **HEY 277, 278 (bar 70), 286 (bar 72 b3).** Kick 1 & 3, snare 2 & 4. **Hook-A walkdown B 296 · A 297 · G 298 · F# 299 → E 300**, stomps and claps on every beat |
| 77 | tag 4 (304–308) | .49 | **held B 304.0–305.1**, hook B |
| 78–85 | outro (308–340) | .54 .61 .43 .43 .49 .63 .36 .26 | hook B every 2 bars (310, 318, 326, 334), each **answered by a HEY: 317, 325, 333**. Fills: 314.72 / 315.64 (bar 79) and 330.70 / 331.68 (bar 83). Held notes 312.0, 313.62 (1.2 b), 320.07, 336.1 |
| 86 | **final hit 340** | — | gang HEY ×16 + crash + stomps, baked into the edit; the cue lane's `final_hit` |

## The shape (intensity tracks the record; peak-end)

| Bars | Place | Int. | Lethal/bar | Follows | New / twist | Breather |
|---|---|---|---|---|---|---|
| 61–64 | **the Pool Room** | 1–2 (C2 valley) | 0 | stomps | bench see-saws (a launch skin) chained in 64 | 61–62 |
| 65–68 | **the Velvet Casino: THE RACK** | 3 → 4 | 0.5 | kick, then the fill | the rack climb; HUP-HUP-BREAK on the fill's "and"s; **the hush** | 65 |
| 69–75 | **the Roof at sunset: SIGN FALLS** | 5 (the act's lethal peak) | ≤ 1 (69 = 0: the drop lands) | bass climb + shouts | a letter per downbeat; J-hook launch 72; post run 73 | 69, 72 (dip) |
| 75–77 | walkdown busts → penthouse → **Big Jim's reveal** | 4 → 2 | 0 | walkdown, sustain | spectacle | 76–77 |
| 78–83 | **the Gauntlet on Big Jim** (the final exam) | 4 | ≤ 0.6 | hook B call → HEY answer | nothing new: every verb, no chalk marks | 81, 83 |
| 84–86 | **pull-out → iris → FINAL HIT** | 1 (can't die) | 0 | shouts + stomps | spectacle only | whole |

**Where the hardest bars go.** DESIGN §7 put the hardest bars in the outro. On this record the outro is a quiet vamp
(.26–.63) and chorus 4 is the loud part (.72–.90), so rubric C1 wins. Chorus 4 carries the **most lethal** actions.
The gauntlet is the hardest **read**: Big Jim fills the frame, there are no marks, all four verbs appear, and both
Hup-Hup-HEYs carry threats. It is still no deadlier than 0.6 lethal per bar. This keeps the Mariachi order: the
spectacle comes first, then the exam.

**The drop without a silent beat.** The original never stops, so the drop uses the strongest accent instead:
- **The break shot lands on 271.65**, the fill's &4 tom, the loudest drum hit since the tag.
- The fill writes a 1-2-3-Action for us. Slim hops on &2 (269.70) and &3 (270.70), both flagged by cigarette burns, then
  **KRAK** on &4.
- **The drop is 272**: chorus 4's downbeat with the octave-A bass.
- **The hush:** the "silence" is made in the mix, not on the clock. From 270.95 to 271.95 StageAudio forces the record
  into the projection booth (horn band, −12 dB). The overlay stems stay dry, so only the cowbell (271, 271.66) and your
  KRAK are heard. The full record and a FULL HOUSE-style cheer slam back on 272.
- The review suggested a tape-stop and `play(fromSongTime)` instead. That is **rejected**: it breaks the audio-clock
  master, the sim slaving and the checkpoint rewinds. The hush gives the same effect with no sync risk.
- The reel-change conceit makes the hush read as deliberate, not as the "you missed" snag: the picture freezes and the
  changeover dot flares.

## New mechanics (2), with nothing new to learn

Both new mechanics use known verbs. After bar 65 there is **nothing new to learn**, only spectacle and callbacks.

1. **Toppling letters (`topple` item)** are the sign's B-I-G J-I-M.
   - Each letter is 3 storeys of rose neon on steel legs.
   - It pivots forward **on its downbeat** (272, 276, 280, 284, 288, 292). The render animates it over 1 beat and it
     lands as a **bridge on the backbeat**, with a SLAM and a cascade of tube pops.
   - Collision is static: the bridge and its legs (the **posts**) are ordinary platforms. The letter always lands ≥ 1
     beat before the hero's grid position reaches it, so a player who is behind always finds it down.
   - The actions come from what rides on the letters: Bluffers, neon tubes, bottles, posts. The J lands with its hook up
     as a see-saw, a bounce skin.
2. **Big Jim as a boss rig (`bigJim` entity)** is one animated body bound to existing item types. There are no new
   verbs, but the rig must pose to the item beats.

   Fists = `slam` lifts (the knuckle-crack is the rim-clack telegraph) · draped sleeve = a slick run (`lowSign` under
   the Bluffers' jabbing cue line) · gold-chain medallions = `pendulum`s · lapels = `ledge` UP and gaps · **aviators** =
   2 `giant` breakables that crack on the HEY answers · knuckle ring = a spike-type stumble.

   He fills the background layer. Only the bound parts are in the play band, with red edges on the knuckles and the
   chrome lenses (fun risk 6).

**The Rack is not a mechanic.** It is a set-piece built from existing items (ledges, gaps UP, jabbers, pendulum
chandeliers, a `giant` head goon, a bounce pad) plus presentation. Goons pile in one tier per downbeat, always ≥ 1 bar
ahead of the hero, and the frame drops on 268. On the break they scatter like balls into trapdoor pockets. **If the
break is missed, the rack collapses anyway** and the Burn blows the skylight. The launch still fires but gives no bonus,
and the Burn pulls 0.2.

## Callbacks: the final exam (every return is its most advanced form)

| Mechanic (first seen) | Act 3 return |
|---|---|
| Launch (bar 9, 23, 38, 52) | bench see-saws 244, 252 → 254 (a **chain**), **the drop 272**, the J-hook 287 |
| Pendulum (bar 4 signs, lamps) | felt lamps 243, 249 → **chandeliers 259 / 263 / 267: each crack kills a light** → Big Jim's medallions 306, 311, 319, 321 |
| Ledge / gap UP (the act-2 climb) | the rack staircase (258–270.70, +~400 px); the M's humps 294; Big Jim's lapels 316, 324 |
| Bluffers (bar 12; the pairs at 24 and 53) | rack jabs 261 and 265; **the HEY HEY pair 277 / 278** leaping off the falling I; riders 286 and 293 |
| Thrown bottle / rolling ball (act 2) | a bottle from the crown's windows 281 (bat it into the G); a pool ball off a table 250 |
| Slam lifts (bar 19, 32; pinsetters 54) | **Big Jim's fists 308–310**. This is the "concept of delay" payoff: it was his rhythm all along |
| Knee-slide (bar 18, 45, 56) | down his velvet sleeve under a Bluffer cue line, 313.62 |
| Hup-Hup-HEY (bar 22, 33, 51) | 4 times, the motto's finale: **the break** (displaced onto the fill's "and"s), **lens 1** (317), **lens 2** (325), **the final hit** (340) |
| Walkdown giant smash (kegs 29, pins 58) | **four gold Big Jim busts, 296–299**: the refrain's third and last verse |
| Stop-time "only your hit" (bar 44) | the hush under the KRAK |
| The Burn (bar 5) | rises through the rack (lunge 269.70) → Big Jim's backhand (lunges 314.72, 330.70) → retired at 332: it eats his film frame |
| Big Jim's glint (bar 46) | his lenses reflect a tangerine Slim that grows with the climb; it shatters on each crack |

Resting (E3 clutter): firebombs, cradles, pinsetters.

## Bar by bar

Legend: **∪** tap hop · **–** held jump · **X** strike · **═** slide · **R** reward · **S** stumble · **L** lethal
(each with its `GAP_FIT` preset). Heights are px above the street.

### Block 1: THE POOL ROOM, the valley (61–64, beats 240–256). Follows: the stomp. Crowd cap 14 (the booth opens).
| Bar | Music | Actions | Height / mode | World |
|---|---|---|---|---|
| 61 | stomp 1 · &2 · 3, held C# | ∪ 240 R · X 241 R (**a racked triangle of pool balls**: the mini-rack) · ∪ 242 R · X 243 R (felt lamp) · tokens on the C# | 950, felt | act 2's flash on 240 = the reveal; jukeboxes BOOM on each &2 (cosmetic: the world plays the swung stomp) |
| 62 | **.32, the lowest**, pickup → 248 | **bench 244** (launch → 246 onto a table) · X 245 R (brass bar bell, high, mid-arc) · X 247 R (bell) · the pickup = a rising token row B C D D# | 950 → 1030 | the bench's 8-ball hits a jukebox on 245.66 |
| 63 | kick 248, 250 | ∪ 248 R · X 249 R (lamp) · ∪ 250 **S** (a pool ball rolls off a table) · X 251 R (bottle) | 1030 → 950 | — |
| 64 | pickup → 256 | **bench chain**: pad 252 → pad 254 → lands **256 on the rack's first tier** · X 253 R (bell, mid-arc) · pickup tokens on the 2nd arc | 950 → 1010 | **the goons pile in on 252** ahead of you (tier 1): the tension starts |

### Block 2: THE RACK in the Velvet Casino (65–68, beats 256–272). Follows: the kick, then the fill. ◆ 256. Cap 18.
| Bar | Music | Actions | Height | World |
|---|---|---|---|---|
| 65 | .44 | land 256 · X 257 R (chip tower) · ∪ 258 R (ledge UP) · X 259 R (**chandelier 1**) | 1010 → 1065 | casino, 3 chandeliers; tier 2 piles in on 256; the Burn glows up through the trapdoors |
| 66 | .52, pickup → 264 | ∪ 260 R (ledge UP) · X 261 **S** (a racked goon jabs) · – 262 **L** (held jump UP over a hole in the rack, 'std'; pickup tokens on the arc) · X 263 R (**chandelier 2** at the apex) | 1065 → 1180 | tier 3 piles in on 260 |
| 67 | **.36, the inhale** | land 264 · X 265 **S** (goon jab) · ∪ 266 R (ledge UP) · X 267 R (**chandelier 3**: the last light) | 1180 → 1235 | the rack frame's shadow slides over; only the gold head goon glows |
| 68 | **1.00**, fill &2 &3 &4 | ∪ 268 **L** (gap UP onto the apex tier, 'tight': the frame SLAMS on the downbeat) · *269: the audience inhales* · ∪ 269.70 R (HUP, ledge UP) · ∪ 270.70 R (HUP, ledge UP) · **X 271.65 the BREAK** (the head goon: `giant`, 90 ms hitstop repaid) | 1235 → 1350 | burns flare on 269.70 / 270.70 / 271.65, **the hush 270.95–271.95**; KRAK: goons scatter into the pockets; the Burn lunges on 269.70 (so both HUPs are ledges, never stumbles) |

### Block 3: SIGN FALLS on the roof at sunset (69–75, beats 272–300). Follows: the A7 climb + shouts. ◆ 272, ◆ 284. Cap 24.
| Bar | Music | Actions | Letter | World |
|---|---|---|---|---|
| 69 | **THE DROP**, A octave | **launch 272** (the rack's recoil) → lands 274 · X 273 R (the skylight, high) · X 274.66 R (the B's neon, D#) · ∪ 275 R | **B** (the flying frame hits it) | camera **0.72, the widest of the level**; sunset; everything a silhouette except Slim; 0 threats |
| 70 | HEY 277, 278 | ∪ 276 **L** (light-well, 'tight') · X 277 **S** · X 278 **S** (**the Bluffer pair** leaps off the falling I) · ∪ 279 R · X 279.66 R (swung pair) | **I** | flash on each HEY |
| 71 | **.90**, A7 climb | ∪ 280 R (ledge UP onto the fallen I) · X 281 **S** (**bat a bottle** from the crown's window into the G) · ∪ 282 **L** ('std') · X 282.66 R (mid-air neon, D#) | **G** | the crown's windows light 1 beat early |
| 72 | .72 dip, HEY 286 | ∪ 284 R · X 285 R (neon) · X 286 **S** (a Bluffer riding the J) · **the J-hook see-saw 287** (launch → 289) | **J** | ◆ 284 (284–285 clean) |
| 73 | .76 | **X 288 R: in the air, smash the I's cap ON the downbeat, and your shot topples it** · land 289 · **post run** ∪ 290 · ∪ 291 · ∪ 292 **L** (the fallen letters' steel legs over the light-well; isochronous, counts once) | **I** | role reversal: now *you* knock them down |
| 74 | **.85, the chorus peak** | (∪ 292 = the run's end) · X 293 **S** (a Bluffer on the M's hump) · – 294 **L** (held jump UP to the terrace, 'peak' −60/+150) · X 295 R (the M's big neon, mid-jump) | **M** | **the lethal combination** (bar 16's shape: ∪ X – X); the M falls into the terrace as a ramp |
| 75 | **hook A walkdown** | X 296 · X 297 · X 298 · X 299 R: **four GIANT gold Big Jim busts** (2x, `smash` 0–3) | — | setPiece `walkdown`; camera 0.74 + punches; the last sun dips on 299 |

### Block 4: the penthouse, the reveal, THE GAUNTLET (76–83, beats 300–332). ◆ 304, ◆ 320. Chalk marks off.
| Bar | Music | Actions | Big Jim | World |
|---|---|---|---|---|
| 76 | E lands, .59 | X 300 R (the penthouse's **glass wall**, `giant`: crash IN) · ∪ 301 R · ∪ 302 R · X 303 R (decanter) | his back, on the throne of stacked pool tables | fig dark, one cream skylight shaft; breather |
| 77 | **tag 4, held B** | – 304 R (held jump over a table **pocket** = a safe pool; tokens trace his roar) · X 306 R (medallion) · ∪ 307 R (onto his fist) | **THE REVEAL: the bluff display** on the held note: arms flung wide, sleeves flaring, lenses flashing on every beat; crash-zoom until he fills the screen | 0 threats; setPiece `bigJimReveal`; ◆ 304 |
| 78 | hook B | ∪ 308 · ∪ 309 · ∪ 310 **L** (**his fists slam** L-R-L over the burned-out floor; the lift run counts once) · X 311 R (medallion) | the fists | the Burn has eaten the floor |
| 79 | held 313.62, fill | ∪ 312 R (onto his cuff) · ═ 313.62 **S** (slide up the velvet sleeve under the Bluffers' cue line, 1.0 b) · ∪ 315 **L** (HUP: sleeve → lapel gap, 'std') | the sleeve | the Burn lunges on 314.72 = **his backhand** sweeps under you |
| 80 | **HEY 317** | ∪ 316 R (HUP: ledge UP the lapel) · **X 317 R: the LEFT LENS cracks** (phrase → Heave) · ∪ 318 R · X 319 R (medallion) | the left lens | the reflection shatters; a white flare |
| 81 | held 320.07 | – 320 R (over his breast pocket, safe) · X 321 R (the big medallion, high) · ∪ 323 **S** (HUP: his knuckle ring sweeps low) | he reels | ◆ 320 (320–321 clean) |
| 82 | **HEY 325** | ∪ 324 **L** (HUP: lapel → collar gap, 'tight') · **X 325 R: the RIGHT LENS cracks** · ∪ 326 R · X 327 R | the right lens | the bluff collapses |
| 83 | fill &3 &4 | X 328 R (**the gold chain snaps**) · ∪ 329 R · X 330.70 R · X 331.68 R (a fill run through the flying medallions) | he swings at air (the Burn's last lunge) | 0 threats: the exam's cadence |

### Block 5: THE FINALE, can't die (84–86, beats 332–340+). The Burn retires on 332.
| Bar | Music | Actions | World |
|---|---|---|---|
| 84 | **HEY 333**, pickup → 336 | ∪ 332 R (sprocket) · **X 333 R: your HEY knocks BIG JIM off the marquee** · ∪ 334 R · ∪ 335 R (sprockets rising on B C D D#) | **pull-out**: the camera leaves the film; screen, curtains, the audience doing the wave. The picture flattens into a **film strip**, with Big Jim shrunk into one frame pounding its edges. Cut-in: **the usher hangs SLIM CHANCE in the big letters** (the role reversal, told without words) |
| 85 | held B 336 | ∪ 336 R (iris blade 1) · X 337 R (a popcorn bucket thrown by the ex-goons in the front row) · ∪ 338 R (HUP, blade 3) · ∪ 339 R (HUP, blade 4) | **the iris** closes blade by blade (blades = platforms; floors underneath, so a miss only lands lower) |
| 86 | **FINAL HIT 340** | **X 340 R (HEY): the power shot off the last blade as the iris SLAMS shut on Big Jim's face**, a huge tangerine Slim in his cracked lenses. `finish` 340 | black on 340 → the film snaps and flaps → **THE END** burns in (341) → a second iris opens on **Slim's victory pose on the throne of pool tables**, the ex-goons applauding, through the ring-out → **the poster** |

## Economy (the rubric gate for `--bars=61-86`)

| Block | Actions | R / S / L (raw → counted) | Reward | Lethal/bar | Density |
|---|---|---|---|---|---|
| 61–68 | 28 | 22 / 4 / 2 | 79% | 0.25 | 0.9/beat |
| 69–76 | 32 | 21 / 5 / 6 → 4 | 66% | 0.5 | 1.0/beat |
| 77–83 | 27 | 21 / 3 / 5 → 3 | 78% | 0.43 | 0.96/beat |
| 84–86 | 9 | 9 / 0 / 0 | 100% | 0 | — |

- Lethal only on a kick, a HUP or the fill; stumbles on a snare, a HEY or a kick; strikes ≥ 0.66 beat apart; no air
  strike in a hop's descent before a gap; every fit's late side ≥ +150 ms. The teeth come from the early side, the
  Burn and two-stumble combos (277/278, 313.6 → the lunge).
- Novelty (B1) arrives at 61, 64, 65, 68, 69, 72, 73, 75, 77, 78, 80, 84: never more than 4 bars apart.
- Verticality (B6) comes from the rack (+400), the M → terrace (+150) and climbing Big Jim himself (fists → sleeve →
  lapels → lenses, +300).
- C1: re-run ρ over the whole level. The outro's mean intensity (~2.6) sits below chorus 4 (~4.3), as its energy does.
- No new hint prompts. The failure hints reuse pit, lifts, Burn, goon and slide.

## Checkpoints (◆, count-in = the bar before)

- **256**: the rack start, a clean re-entry (the count-in plays the bench chain + pickup).
- **272**: the drop. Respawn on the apex pad and the launch fires on the downbeat, so **every chorus retry replays the
  fill, the hush and the drop**. If a pad respawn misbehaves, move it to 274 on the roof.
- **284**: the second half of the sign (J-I-M) · **304**: Big Jim's reveal, 0 threats · **320**: between the lenses.

`?start=` list for CLAUDE.md: 256, 272, 284, 304, 320.

## Difficulty targets (bots from ◆ 236, through 340)

| Profile | Target |
|---|---|
| autoplay | 0 deaths, 0 stumbles, every action on time, including **271.65** and **340** |
| `--jitter=40` (skilled) | 0 deaths, ≤ 1 stumble; FULL HOUSE by bar 71, held to 340 |
| `--sloppy` ×5 (±85 + 10% late) | **0.5–1.5 deaths per run** (act 2 measured 0.2: the climax must bite); ≤ 1 per 8-bar segment; 0 in 61–67 and 83–86 |
| `--jitter=130` ×3 | 2–5 deaths per run, spread over 276 / 282 / 294 / 315 / 324 (A10: no action in ≥ 3 seeds) |
| `--late=1 --jitter=40` (uncalibrated latency) | ≤ 1 death |
| lazy (skips every reward) | completes; crowd < 6 at 272; no FULL HOUSE; no break bonus; 0–1 Burn catches |
| reckless (skips every stumble) | ≥ 1 Burn catch at the 277/278 pair: proof that stumbles matter |
| first-time human | 2–6 deaths in act 3, none after 332; a skilled player can no-death it |

## Assets

**Entities** (danger class first; `SKINS[kind]`):
- **Pool Room:** pool tables (floors, felt lip); bench see-saw (bounce); racked pool balls, brass bar bell, jukebox
  (reward/background); rolling pool ball (stumble).
- **Rack:** goon heap tiers (terrain: stacked fig vests, red cue tips only on jabbers); the wooden rack frame; the
  **gold head goon** (giant reward); 8-ball chandelier (pendulum); chip tower (breakable).
- **Sign Falls:** **letters B, I, G, J, I, M** (upright → pivot → bridge; rose neon tubes; steel-leg posts); light-well
  pits (lethal red); crown windows (thrown bottles); skylight and **glass wall** (giant glass); **gold busts** ×4
  (giant).
- **Big Jim rig:** velvet pear body, flared sleeves, fists as slam platforms, red knuckle rings, gold chain with
  medallions, **aviators with a live Slim reflection + 2 crack stages**, bluff-display pose, the throne of stacked pool
  tables.
- **Finale:** film strip with sprockets (floors), iris blades ×4 + a closing iris, the usher and marquee cut-in, the THE
  END card, the victory pose on the throne.

**Environments.** New `SkyPreset`s: `poolroom`, `casino`, `sunset`, `dusk`, `penthouse`, `theatre`. New `GroundStyle`s:
`felt`, `rack`, `roof`, `penthouse`, `filmstrip`. The roof's far layer shows 42nd St far below and the honky-tonk's
sign. **No orange** near the play band: the sun is cream, the sky coral and rose.

**Lighting keyframes (beat → state):**

240 felt lamp pools, smoke · 256 casino, 3 chandeliers · 259 / 263 / 267 one light dies per cracked chandelier ·
268 the gold head goon + the Burn's glow only · 271.65 white KRAK flash · **272 cream sun, coral sky, rim-lit Slim** ·
280 rose · 288 fig dusk rising · 296 the last rays on the gold busts · 300 penthouse dark, one skylight shaft ·
304–307 lens blaze on every beat, red knuckles · 317 / 325 crack flares · 332 house lights up amber · 336 iris
vignette · 340 black → THE END → the victory spotlight.

**Camera:** 0.95 (pool room) → 0.88 with a tilt up (rack) → a slow push-in on the head goon at 268 → **0.72 at 272** →
0.74 (287, 296) → 0.9 inside → a crash-zoom on 304 → 0.84 for the gauntlet (runway ≥ 1.2 s, E1) → the theatre
pull-out on 332.

**Set-piece names:** `poolRoom`, `rack`, `rackBreak`, `drop`, `signFalls` (letter index), `penthouse`,
`bigJimReveal`, `gauntlet`, `lensCrack` (0/1), `pullOut`, `marqueeSwap`, `irisOut`, plus the existing `walkdown`.

**SFX, all pitched to E:**
- **Pool Room:** ball-rack clack; bench creak and thunk; jukebox BOOM and bar-bell CLANG (on the &2 stomps and your
  bells).
- **Rack:** pile-up (grunts + wood) per downbeat; chandelier crack + light fizz; frame SLAM; gold-hum riser
  264 → 271.65; cigarette-burn tick ×3; **KRAK** + slow-mo whoosh + ball-scatter clatter.
- **Sign Falls:** skylight burst; steel creak → tube-pop cascade → letter SLAM; bust smash ×4 stepping down B A G F#;
  glass-wall crash.
- **Big Jim:** **bluff roar** on the held B; fist slam (lift slam, lower) with a knuckle-crack telegraph; velvet
  whoosh; backhand whoosh; lens crack ×2 (chrome ring on a chord tone); chain snap + medallion jingle.
- **Finale:** projector pull-out; sprocket ticks; usher card flip; iris blade shhk ×4; **IRIS SLAM** layered 3 dB under
  the baked final hit; film snap + flap loop; THE END sizzle; victory roar.

**Audio code:** `StageAudio.hush(from, to)`, a booth-forced dip on the record only. Crowd caps: 14 at 240, 18 at 256,
24 at 272.

**Poster:** add snipes for "BROKE THE RACK!", lenses 2/2, busts 4/4 and "HELD OVER!" (FULL HOUSE at 340). The key art
is Slim towering over a shrunken Big Jim.

**Code items the implementer adds:** `topple`; the `bigJim` rig; a `chaser` off switch (332); the new sky, ground and
set-piece names; breakable looks `balls`, `bell`, `chips`, `bust`, `lens`.

## Risks and checks

- **Respawn on a launch pad (◆ 272)** is untested. Fallback: ◆ 274.
- **The slide exit into the 315 gap.** Measure it with `node playtest/slack.mjs`. If it is under −110/+150, slide on
  312.0 instead and put a token row on 313.62.
- **The 271.65 break** comes right as the 270.70 hop lands. Check that the strike registers grounded. If not, move the
  last HUP to 270.66.
- **The Burn at the gauntlet.** If it catches more than 30% of the 313.6 stumbles, relax its gap by 0.25 for 78–83.
- **Big Jim's readability:** run `gameshot --gray` on 304–332. Only the knuckles, lenses and bound parts may pop.
- **Checks:**
  - `npm run rubric -- --level=src/level/index.ts#gameLevel --bars=61-86 --reports=<bot dirs>` must pass the gate
    11/11.
  - Autoplay from the cold open must reach 340.
  - Run the mix lab on the hush and the final-hit stack (true peak ≤ −0.17 dBTP).

## As shipped (iteration 4)

Code: `src/level/act3.ts` (`act3Items(h0)` + standalone `act3Level`), joined by `level/index.ts` on act 2's last floor
height (the seam drops act 2's `finish`, keeps its 240 flash). Runtime: `game/mech/act3.ts` (`game.mech.act3`),
`letters.ts`, `bigJim.ts`. Deviations from the tables above, and why:

- **61–64 is the review's CALL AND RESPONSE** (not bench chains): in bars 61 and 63 the goons stomp the Black Betty call
  (1 · &2 · 3) while you hit the claps (2, 4); in 62 and 64 you answer on the call's rhythm (X ∪ X, then ∪ X –). Each
  call stomp lights a gold ring where the answer lands one bar later. 0 threats. One bench see-saw (248 → 250), and a
  held jump onto the rack on 254 lands on ◆256.
- **The Rack ramps 0 → 1 → 1 → 2 lethal per bar** (262 held gap UP, 266 gap UP, 268 frame gap, 270.70 = the second HUP).
  The break shot on 271.65 is a Hup-Hup-HEY: a clean one earns FULL HOUSE on the drop (`crowd { earn }`). The audio
  derives the hush from the strike on the fill's last tom.
- **Sign Falls letters land ≥ 1 beat before the hero reaches their span.** B 274.3–276.1, I 278–280.6, G 282.8–286,
  J 286–287.3 (its hook = the see-saw), I 290.3–292.7 (its legs = the POSTS, each 24 px higher so the ledge assist can't
  walk them), M 295.6–297.5 on the terrace. Their collision is ordinary floor.
- **Bar 70 has ONE Bluffer** (277). The second HEY (278) is a big neon, because of the review's "≤ 1 stumble per bar".
  The reckless bot is still caught at 281 → 286.
- **The walkdown (296–299) is four giant blows on Big Jim** (fist, fist, lapel, jaw). He rises behind the letters from
  290. The glass wall (300) is a giant `glass` that you crash through.
- **The gauntlet (304–332) has no chalk marks.** His first fist slams onto his knee (a reward hop). 309 and 310 are
  lethal. The slide goes up his sleeve (313.62), then two HUP-HUP-HEYs: 315 ∪, 316 gap UP, 317 LEFT LENS, and
  323 knuckle ring (the wind-up is his swing pose), 324 gap UP, 325 RIGHT LENS. His backhands ride the Burn's fill
  lunges.
- **Finale (332–340): the Burn retires (`chaser { off }`).** The crowd floor is 20 from 338 (FULL HOUSE for everyone on
  the final hit). The final hit on 340 is a giant struck as the HEY of the last Hup-Hup-HEY. The `finish` sits at 340.5
  so that strike connects. Slim then runs into the throne (a `block`) and stops for the victory pose. The iris state
  (blades 336–339, SLAM on 340, THE END on 341, reopen on 342) is a function of the beat.
- **Checkpoints** are 256, 272 (the respawn fires the drop launch on release), 284, 304 and 320.

**Lethal windows** (`node playtest/slack.mjs --level=src/level/act3.ts#act3Level --from=240`), all ≥ −85 / +150 ms:
- 262 −90/+150 · 266 −90/+155 · 268 −85/+155 · 270.7 −255/+155 (buffered after the first HUP)
- 276 −185/+165 · 280 −85/+155 · 282 −95/+150 · posts 290 / 291 / 292 −90/+200, −225/+195, −225/+220 · 294 −90/+195
- fists 309 −190/+150, 310 −190/+210 · 316 −255/+160 · 324 −190/+155

The early side is only tight where no hop comes in the half-beat before. Inside the HUP-HUP phrases the jump buffer
catches early presses.

## Iteration 5 changes (fairness sweep + designed teeth)

Driven by `docs/reviews/iter4.md` fixes 2 and 7; checked by `node playtest/slack.mjs --level=src/level/index.ts#gameLevel
--hidden` (every action swept: a reward / stumble press may not kill inside ±150 ms or when skipped).
- **Hidden lethals removed.** 275 is no longer a reward hop (its late landing fell into the 276 well: the 277 loop):
  bar 69 is X (274) · X (275) · tokens, then the well on 276, whose early side is now real (−85). The first fist is
  WALKED onto (no 308 hop: a strike on his pinky ring instead), so 309 is lethal with a real early side (−105/+150).
  324's near lip sits at +0.36 so a late 323 knuckle-ring hop lands on the lapel (323 stays a stumble: −300/+170).
- **Chorus 4 teeth** (−85..−95 early, each after a strike or a landing, so no jump buffer hides them): 280 (onto the I,
  −90), 284 (a NEW light-well past the G: the G now lies 282.75–284.13, bare roof to the J), the **Bluffer pair** on the
  HEYs 277 · 278 (two stumbles two beats apart = the Burn). Tubes on 279.66 and 303.66 keep ≥ 1 action per beat.
- **The gauntlet** gets two lethals after strikes/landings: 312 (off his cuff onto the sleeve, right after the fists:
  309 · 310 · 312) and 318 (after the left-lens HEY, across the lapel notch). 326 stays a reward; 329 is a medallion
  (X X ∪ X X on bar 83). A chip tower on 264 (the Rack's landing) keeps the breakdown ≥ the outro in intensity.
- **Rubric shape (act 3):** breakdown 4.31 · chorus 4 6.63 · outro 4.30 — C1 (ρ = 1) and C2 (1 valley) pass by a hair:
  any new threat in bars 77–86 needs a matching one in 65–68 (and the Rack is at its 0.5 lethal/bar valley cap, 75 %
  rewards), or it breaks C1.
- Pool Room: a 1-bar camera push-in on each call bar (240 → 0.84, 248 → 0.86), back to 0.95 for the answers.

Lethal windows now: 262 −90/+150 · 266 −90/+155 · 268 −90/+155 · 270.7 −255/+155 · 276 −85/+165 · 280 −90/+155 ·
282 −95/+150 · 284 −95/+165 · 290 −90/+200 · 291/292 −225 · 294 −90/+195 · 309 −105/+150 · 310 −190/+210 · 312 −90/+155
· 316 −255/+160 · 318 −85/+160 · 324 −190/+250.
