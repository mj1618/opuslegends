# Act 2 plan: verse 3 → chorus 3 → tag on the ORIGINAL recording (edit bars 34–60)

*Level designer's plan, iteration 4 (the rework driven by `docs/reviews/iter3.md` fixes 1, 2, 6 and the act-2 parts of
8). Implemented in `src/level/act2.ts`; joined to act 1 and act 3 by `src/level/index.ts`. Iteration 3's version is in
git history (`8dd967a^`).*

**What changed and why.** Iteration 3's act 2 was act 1 reskinned (launch, stop-time, safe lifts, Hup-Hup-HEY, launch
into the chorus, goons on the HEYs, lethal lifts, DUCK sign, four giant smashes, in the same order), its "climb" rose
790 px over 12,300 px of run (a walkway along a wall), and it broke the late-side rule (pits +110…+125 ms, bottles
+70), so an uncalibrated player died 6–11 times in it after a clean act 1. Iteration 4 keeps the rhythm cells and the
bottles' telegraph and changes the shape:

- **It climbs.** 0 → 1,620 px in bars 35–41 (fire-escape flights, ledge hops, storey jumps, alleys jumped up, a
  hoist), up to 1,964 px on the tower's sill by bar 51, then **the chorus drops** ~1,000 px down a cable into the
  Lanes. The act is a mountain: up the verse, the summit in the stop-time (Big Jim's glint), the plunge on the drop.
- **One new verb: the HOOK.** Strike ON the beat to hook the cue over a rope / line / cradle and ride it. It is taught
  safe three times (the hoist 148, the laundry line 178.66, the cradle 188), then tested lethal twice in the chorus
  (the zip 204, the pinsetter's sweep bar 212). No other new mechanic.
- **Every set-piece that copied act 1 is gone** (table at the end).
- **Fair:** every pit ≥ −90/+150 ms, every moving threat ≥ +140 ms late, measured.

## Boundaries

| Edit bars | Beats | Section | Height (px above the street) |
|---|---|---|---|
| 34 | 132–136 | verse 3: the breath, out the door | 0 |
| 35–41 | 136–164 | verse 3: THE CLIMB (boogie bass; the peak is bar 41, .93) | 0 → 1,620 |
| 42–49 | 164–196 | verse 3: the roof + STOP-TIME (bass out 172–174, 178–187), the cradle | 1,620 → 1,864 → 1,924 |
| 50–51 | 196–204 | pre-chorus 3 (HUP 200 · HUP 201 · HEY 202) | 1,924 → 1,964 (the sill) |
| 52–59 | 204–236 | chorus 3: THE DROP + the Blacklight Lanes | 1,964 → **950** (the lane deck) |
| 60 | 236–240 | tag 3 | 950 |

Act 2 ends on **beat 240 on the lane deck, h 950** (`ACT2_END`); act 3 starts from `endHeight()` in `index.ts`.
Checkpoints: **132, 164, 196, 220, 236**. Crowd caps: 16 from bar 36 (the seam's breath lets the crowd glide down
over bars 34–35), 19 at the pre-chorus (a clean Hup-Hup-HEY earns FULL HOUSE on the zip's downbeat), 24 in the chorus.

## New pieces

| Piece | Item | Verb | Miss | Window (slack.mjs) |
|---|---|---|---|---|
| **Hook ride** (`game/mech/hook.ts`) | `{type:'hook', style:'rope'\|'line'\|'cradle', path}` | X ON its beat: the cue hooks, Slim rides the path (feet heights by x); strikes still work while riding, jumps don't | what's under the path: stairs / ladders (reward: nothing but the tokens) or a pit (death) | −100/+185 ms (grab: press in [−0.3, +0.5] beat) |
| Fire-escape flight | `Terrain.stairs(a, b, rise)` (floors, ≤ 24 px risers) | none: the 26 px step-up assist walks you up, hands free | — | — |
| Storey jump | `Terrain.storey(beat, rise)` (`ledge`, hold 1) | – up to 150 px onto the next landing | a tap bonks: the ledge scramble (now ≤ 150 px) pops you up, ~0.5 beat lost | — |
| Camera framing | `camera` item `ground` (screen-y of the ground line, default 0.66) | — | — | 0.52 on the climb, 0.5 on the cradle, 0.42 on the zip (the drop shows) |
| Set-piece cues | `facadeReveal` (132: tilt up to the penthouse), `zipDrop` (204: `h` = the drop) + iteration 3's `climb`, `bigJimGlint`, `windowCrash`, `lanes` | — | — | — |

Retuned (review fix 2): the thrown bottle keeps flying at you, but a swing inside `BAT.grace` (70 ms) of the moment
it clips you still bats it (−215/+145, was +70); firebomb flames `FIRE.at` 0.5, hurt core 16×18 px (−100/+145, was
≈ ±100); balls `BALL.at` 0.5, r 16, 200 px/beat (−90/+145, was −95/+115). The art draws them as big as before.

## Bar by bar

Legend: **∪** tap hop · **–** held jump · **X** strike · **═** slide · **H** hook. **R** reward, **S** stumble,
**L** lethal. Heights = px above the street after the bar.

### Bar 34 — the breath (132–136). ◆ 132
Act 1's last launch lands ON 133 outside the honky-tonk's front door. **Nothing hurts.** X 134 R (a ground-floor
window, the snare) · ∪ 135 R (the basement areaway: the pit shape) · tokens on the fill's "and". `facadeReveal`: the
camera tilts up the Jimperial to Big Jim's penthouse glinting at the top — the goal. Height 0.

### Block 1 — THE CLIMB (bars 35–41, 136–164). Follows: the boogie bass. Hop-led (14 hops, 3 jumps, 8 strikes)
| Bar | Music | Actions | Height |
|---|---|---|---|
| 35 | E E **G# A A# B** (the climbing notes on the "and"s) | ∪ 136 R up onto the fire escape · a flight walks you up · ∪ 137.66 R up (G#) · ∪ 138.66 R up (A) · X 139.66 R (B, a window) | 0 → 324 |
| 36 | fig 2, kick 140 (.70) | **– 140 L the first alley, jumped UP a storey** · X 142 **S the first thrown bottle** (hint) · a flight on 3–4, tokens on the fill | → 602 |
| 37 | the climb 145–147 (.51) | ∪ 144 R up · **– 145 R a storey jump** (held; a tap scrambles) · ∪ 147 R up (A#) | → 842 |
| 38 | kick 148 (.61) | **X 148 R H the counterweight rope hoists you two storeys** (the hook's debut; a miss = take the flight under it; hint) · ∪ 150 R (the landing) · ∪ 151 R up | → 1,190 |
| 39 | the climb 153.7–155 (.70) | ∪ 152 R · ∪ 153 R up (E) · **– 154 L the second alley UP on the A (the boom)** · X 155 R high bottle mid-air · a flight | → 1,420 |
| 40 | fig 4 (.63) | ∪ 156 R up · a flight · ∪ 158 **S the firebomb** · X 159 R | → 1,540 |
| 41 | **PEAK .93**, fill &1 &3 4 | **∪ 160 L gap UP** · X 160.66 R (fill &1) · **∪ 162 L gap UP** · X 162.66 R big window (fill &3), shake + flash | → 1,620 |

Thinned from iteration 3's 5 threats in bars 40–41 (the Burn loop) to 1 stumble + the 2 peak gaps.

### Block 2 — the ROOF + STOP-TIME (bars 42–49, 164–196). Follows: the vocal, then the bass. The valley. ◆ 164
| Bar | Music | Actions | Height |
|---|---|---|---|
| 42 | A7, after the peak | ∪ 164 R onto the roof · tokens · – 166 R through tokens | 1,620 |
| 43 | kick-and 170.6 | X 169 R a swinging neon letter · ∪ 170 R · tokens | |
| 44 | **stop-time** | X 172 R big neon · rest · X 174 R big neon · ∪ 175 R — your hit is the sound | |
| 45 | held note 178.67 | X 176 R big · **X 178.66 R H the laundry line, hooked ON the held note: glide over the light well** (a miss drops you 60 px: scramble out) | |
| 46 | **versePeak 180** | `bigJimGlint` (flash, zoom 0.8) · X 181 R · ∪ 182 R · X 183 R | |
| 47 | held note 184.67 | – 184.66 R over a recessed balcony · X 187 **S bat** | |
| 48 | **B pedal (every beat)** | **X 188 R H the window-washer's CRADLE: +80 on each B (188, 189, 190)** · X 190.66 R a pane on the way up (miss the rope: two 120 px ladders, scramble) | → 1,864 |
| 49 | A, held 195.71 | ∪ 192 R up · ∪ 193 **S firebomb** · X 194 **S bat** · X 195.66 R | → 1,924 |

### Pre-chorus 3 (bars 50–51, 196–204). Follows: the shouts. ◆ 196
| Bar | Music | Actions |
|---|---|---|
| 50 | no vocal, the D# pedal (.48): the hush | ∪ 196 R · X 197 R · ∪ 198 R · X 199.66 R — the Lanes' window glows far below |
| 51 | **HUP 200 · HUP 201 · HEY 202**, fill &3 &4 | **∪ 200 L hop UP to the sill across a gap** · X 201 **S bat** · X 202 **S the goon: the HEAVE sends him across the light well THROUGH the Lanes' window** (`windowCrash`) · ∪ 203 R through the falling glass. Hands `0∪ 1X 2X` (act 1's were `0∪ 1∪ 2X`) |

### Chorus 3 — THE DROP + the BLACKLIGHT LANES (bars 52–59, 204–236). Follows: the kick, then the shouts. ◆ 220
| Bar | Music | Actions |
|---|---|---|
| 52 | A7, the drop (.79) | **X 204 L H THE ZIP: hook the cable on the chorus downbeat and plunge ~1,000 px** through the smashed window (`zipDrop`, camera ground 0.42) · X 205 R, X 206 R neon letters smashed on the way down · lands 206.6 on the lane deck · X 207 R pin |
| 53 | E7, **HEY 209 · HEY 210** | ∪ 208 L gutter (std fit) · X 209 **S** · X 210 **S** — ball-return POPS batted back down the lane on the HEYs · ∪ 211 R |
| 54 | A7 (.80) | **X 212 L H hook the pinsetter's sweep bar over the pit** · X 213 R, X 213.66 R racks smashed mid-ride · ∪ 215 **S ball** (hint) |
| 55 | E7, **HEY 218** | ∪ 216 R · ∪ 217 **S ball** · X 218 **S** the goon bowler on the HEY · X 219 R pin |
| 56 | A7, held 222.09 | ∪ 220 R · X 221 R · **═ 222 S the slick run**: knee-slide down the oiled lane under the sweep bar on the held note · X 223.66 R |
| 57 | A7 **.85 = the chorus peak** | **∪ 224 L the peak gutter** · X 225 **S** goon · X 226 R pin on the ball return as it fires: **the ball-return launch** onto the pinsetter catwalk · X 227 R pin mid-flight |
| 58 | **hook-A walkdown B A G F#** | the walkdown walked DOWN the catwalk: **∪ 228 L hop down over a pinsetter pit (B)** · X 229 R giant rack STRIKE! (A) · **∪ 230 L hop down (G)** · X 231 R giant rack SPARE! (F#) |
| 59 | E lands 232, hook B (.51) | ∪ 232 R · ∪ 233 R · ∪ 234 **S ball** · X 235 R pin — the breath |

### Tag 3 (bar 60, 236–240). ◆ 236
∪ 236 R · ∪ 237 R · ∪ 238 R · X 238.66 R (fill &3) · X 239.66 R big pin (fill &4) → act 3 on 240 (flash + shake).

## Lethal fits (press-offset windows, `node playtest/slack.mjs --level=src/level/act2.ts#act2Level --stumbles`)

| Beat | What | Window | | Beat | What | Window |
|---|---|---|---|---|---|---|
| 140 | alley UP (held, +110) | −220/+235 | | 208 | gutter (std) | −115/+150 |
| 154 | alley UP (held, +110) | −195/+230 | | 212 | hook: the sweep bar | −105/+185 |
| 160, 162 | gaps UP (tap, +40) | −150/+155 | | 224 | peak gutter | −90/+155 |
| 200 | gap UP to the sill (tap) | −145/+150 | | 228, 230 | walkdown pits (down 60) | −205/+155, −100/+155 |
| 204 | hook: THE ZIP | −100/+185 | | | | |

Moving threats: bottles −210…−275/+145, firebombs −100…−270/+145…+150, balls −90…−195/+140…+145.

## Iteration 3 → 4: what replaced the reskins

| Iteration 3 (= act 1 again) | Iteration 4 |
|---|---|
| counterweight LAUNCH (38) | the counterweight ROPE: X hooks it, it hoists you (the hook's debut) |
| DUCK sign knee-slide (45) | the laundry line hooked on the held note |
| safe cradle LIFTS (48) | the cradle HOIST, one step per B on the B pedal |
| Hup-Hup-HEY `0∪ 1∪ 2X` into a goon (51) | `0∪ 1X 2X`: hop up to the sill, bat, Heave him through a window across the well |
| launch into the chorus (52) | THE ZIP down 1,000 px on the chorus downbeat |
| Bluffers on HEY HEY (53) | ball-return pops batted on the HEYs |
| lethal pinsetter LIFTS (54) | the sweep-bar hook over the pinsetter pit (with strikes mid-ride) |
| four giant pins XXXX (58) | the walkdown walked DOWN: ∪ X ∪ X over two pits |

Kept: the thrown bottles (retuned), stop-time big hits, Big Jim's glint, the slick run (the act's one slide), balls.

## Checks

- `node playtest/slack.mjs --level=src/level/act2.ts#act2Level --stumbles` (every window above; `--why` explains a
  death, `--trace=a,b` prints the hero's path).
- `npm run rubric -- --level=src/level/index.ts#gameLevel --bars=34-60 --reports=<act-2 bot dirs>` and `--bars=1-60`.
- Autoplay from 132: 0 deaths, every action on time; bots from 132 (`--start=132`).

Measured results: `docs/ITERATIONS.md` → "Iteration 4 — act 2 notes".
