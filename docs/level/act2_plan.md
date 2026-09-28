# Act 2 plan: verse 3 → chorus 3 → tag on the ORIGINAL recording (edit bars 34–60)

*Level designer's plan for iteration 3. Same method as act 1 (`docs/level/act1_plan.md`): written bar by bar against
the edit's beat-map lanes (`assets/audio/jim_edit.beatmap.json`), `docs/FUN_RUBRIC.md` and the iteration-2 review's
act-2 plan (`docs/reviews/iter2.md`). Implemented in `src/level/act2.ts`; joined to act 1 by `src/level/index.ts`.*

## Boundaries (confirmed from `original_edit.md` §3 and the beat map's sections)

| Edit bars | Beats | Section (edit) | Song bars |
|---|---|---|---|
| 34–49 | 132–196 | verse 3 (boogie bass 34–41, stop-time 44–47: `bassOut` 172–174, 178–187) | 63–78 |
| 50–51 | 196–204 | pre-chorus 3 (HUP 200 · HUP 201 · HEY 202; bass D# pedal, walk-up 200–204) | 79–80 |
| 52–59 | 204–236 | chorus 3 (HEY 209, 210, 218; hook-A walkdown 228–232) | 81–88 |
| 60 | 236–240 | tag 3 (fill &3 238.76, &4 239.68, → 240) | 89 |

Act 2 ends on **beat 240 = bar 61 beat 1**, the breakdown downbeat (act 3 starts there). Bar *n* starts on beat
`4(n−1)`; "&" = +0.66.

## The seam (act 1 → act 2)

Act 1's `finish` (beat 132) is dropped by `level/index.ts`; its final flash + shake on 132 stays. Act 1's last
springboard (pad on 131) lands **ON 133** — outside: the ground style flips from the honky-tonk's timber to
`facade` on 132 (the stage draws the bar's front door there), `setPiece: climb` starts, and Slim is on 42nd Street
at the foot of the Jimperial with bottles already coming out of the windows. The world x is continuous (one level,
x = beat × 384). Checkpoints: **132, 164, 196, 220, 236** (every ≤ 8 bars; the tag is one).

## What the record gives act 2 (lanes)

| Bars | Energy | Lanes the level uses |
|---|---|---|
| 34–35 | .49 .44 | `verseBoogie` fig 1: E E B B(D#) · E E **G# A A# B** (137.63, 138, 138.66, 139); snares 133/134/135; fill &4 (135.67) |
| 36–37 | .70 .51 | fig 2: kick 140, 140.94; the climb 145–147 (G# 145.5, A 145.93, A# 146.5, B 147.04); snare-and 146.77 |
| 38–39 | .61 .70 | fig 3: kick 148, 148.98; the climb 153.7–155.02; fill &4 155.61 |
| 40–41 | .63 **.93** | fig 4; **bar 41 = the verse's peak: fill on &1 (160.65), &3 (162.68), 4 (162.96)**, kick-and 161.69 |
| 42–43 | .74 .57 | A7 (bass on A), kick-and 166.63, 170.6, fill-ish 171.67 |
| 44–47 | .66 .52 .63 .62 | **stop-time**: bass out 172–174 and 178–187; held notes 174.67, **178.67 (1.33)**, **184.67 (1.33)**; `versePeak` 180 |
| 48–49 | .56 .66 | **B pedal on every beat** (188–191), A 192–194; held 190.66, 193.67, 195.71 |
| 50 | .48 | no vocal at all; bass D# pedal (the pre-chorus hush) |
| 51 | .82 | walk-up E E F# G# → A + **HUP 200 · HUP 201 · HEY 202**; fill &3 202.66, &4 203.64 |
| 52–57 | .79 .76 .80 .62 .78 .85 | A7 climb each A7 bar (A, C#, D, D#, E); **HEY 209, 210, 218**; held note **222.09 (1.48)** |
| 58 | .70 | **hook-A walkdown** B A G F# on the quarters, stomps every beat |
| 59–60 | .51 .65 | E lands 232, hook B; tag fill 238.76, 239.68, 240 |

## New pieces (typed data; runtime `src/game/mech/`, placeholder draws `src/render/mechDraw.ts`)

| Piece | Item | Verb | Miss | Window (measured) | Telegraph |
|---|---|---|---|---|---|
| **Thrown bottle** (the act's first MOVING threat) | `{type:'thrown', style:'bottle'}` | X ON its beat: bat it back through the window (4 tokens) | stumble (it clocks you ~95 ms after the beat) | −210/+70 ms | the window lights 1 beat before the throw, a goon leans out; dashed arc + red crosshair on the bat point; whistle 1 beat before |
| **Firebomb** | `{type:'thrown', style:'firebomb'}` | ∪ ON its beat: it bursts a hop ahead ON the beat, hop the flames | stumble | ≈ spike (±110 ms) | same window + arc, a red ring where it lands |
| **Ledge hop UP** | `{type:'ledge'}` + floors (`Terrain.up`) | ∪ up a 50 px ledge whose edge is +0.55 beat | reward miss: Slim bonks and **scrambles** up (~0.3 beat lost, no stumble) | −130/+120 ms | the ledge |
| **Gap jumped UP** | `Terrain.gapUp` | – or ∪ over an alley onto a higher fire escape | death (fall-out) | see the table below | red pit |
| **Rolling ball** | `{type:'ball'}` | ∪ ON its beat: it passes under the hop's middle | stumble | ≈ spike | rolls in for 3 beats, rumble 1 beat before |
| Window panes / pins / giant pins | `breakable` looks `window`, `pin`, `giant` | X | tokens | ±200 ms | glint |
| Cradles / pinsetters | `slam` with `h` (lifts high up the building) | ∪ every beat | cradles: a drop to the balcony (safe) · pinsetters: death | pinsetters −110/+120 ms per hop | clack 1 beat before |
| Set-piece cues | `{type:'setPiece'}` `climb`, `bigJimGlint`, `windowCrash`, `lanes` | — | — | — | presentation (art) |

Two climb rules live in `mech/index.ts`: **ledge scramble** (a hero stalled against a 27–110 px ledge pops up it after
0.1 s) and **fall-out** (falling > 420 px below the last ledge = death at once: the pits are high above the street).

### Lethal fits (press-offset windows measured with the real controller, `Terrain` comments)

| Beat | Bar | What | Window |
|---|---|---|---|
| 140 | 36 b1 (kick) | alley gap, held jump UP +60 | −130/+170 |
| 153 | 39 b2 (the figure's kick on 2) | alley gap, held jump UP +80 | −110/+130 |
| 160, 162 | 41 b1, b3 (the fill) | **block peak**: two gaps hopped UP +50 | −100/+110 each |
| 200 | 51 b1 (HUP) | gap (tap) | −110/+110 |
| 208 | 53 b1 (kick) | lane gutter | −110/+110 |
| 212–214 | 54 (A7) | pinsetters over the gutter (3 hops, counts once) | −110/+120 per hop |
| 224 | 57 b1 (kick) | **chorus peak** gutter | −100/+110 |

## Economy targets

Reward share ≥ 60 % (verse blocks ≥ 60 %, chorus ≥ 45 %); lethal ≤ 0.5/bar in the verse, ≤ 1 in the chorus, 0 in the
stop-time block (the valley, C2); every lethal on the kick (beat 1/3), a shout or the fill; stumbles on a drum hit; a
new element every ≤ 8 bars; strikes ≥ 0.66 beat apart (a strike's active window is 186 ms); **never an air strike
during the descent of a hop that is followed by a gap on the next beat** (an air strike zeroes the fall and makes
the next takeoff late — found the hard way at 207.66 → 208). Difficulty: slightly harder than act 1 (sloppy ±85 ms:
~1 death over the act; ±130: 2–5; ±40: 0), a breather after each peak (42–43 after 41; 59–60 after 57–58).

## Bar by bar

Legend: **∪** tap hop · **–** held jump · **X** strike · **═** slide. **R** reward, **S** stumble, **L** lethal.
Heights = px above the street.

### Block 1 — THE CLIMB up the Jimperial's facade (bars 34–41, beats 132–164). Follows: the boogie bass. ◆ 132
| Bar | Music | Actions | Height / mode | World |
|---|---|---|---|---|
| 34 | fig 1, snares 133/134/135 | X 133 R (ground-floor window) · ∪ 134 R (areaway: the pit shape, safe) · X 135 **S (first thrown bottle, bat it on the snare)** · tokens on the fill's & | 0, street | door → facade on 132; hint (1 of 2): bat the bottles |
| 35 | **the bass climbs G# A A# B** | ∪ 136 R (up) · X 137 R · ∪ 138 R (up, A) · X 138.66 R (A#) · ∪ 139 R (up, B) | 0 → 150, **climb** | camera widens (0.86) |
| 36 | fig 2, kick 140 | – 140 **L (first alley gap, jumped UP)** · X 141 R (high bottle mid-air) · X 142 R · ∪ 143 **S (first firebomb)** | 150 → 210 | — |
| 37 | the climb 145–147 | X 144 R · ∪ 145 R (up) · ∪ 146 R (up) · X 146.66 R · ∪ 147 R (up) | 210 → 360 | — |
| 38 | kick 148 | **LAUNCH 148 → 150** (the counterweight ladder: two storeys) · X 149 R (window mid-flight) · X 150.66 R · ∪ 151 R | 360 → 560, launch | zoom-out 0.8 + punch |
| 39 | fig 3 climb | X 152 **S (bat)** · – 153 **L (gap UP)** · X 154 R (high, the A) · X 155.66 R (fill &) | 560 → 640 | — |
| 40 | fig 4 | ∪ 156 R (up) · X 157 **S (bat)** · ∪ 158 **S (firebomb)** · X 159 R · X 159.66 R | 640 → 690 | — |
| 41 | **PEAK .93, fill &1 &3 4** | ∪ 160 **L (gap UP)** · X 160.66 R (fill &1) · X 161.66 **S (bat, kick-and)** · ∪ 162 **L (gap UP)** · X 162.66 R (big window, fill &3) | 690 → 790 | shake, flash on the fill |

### Block 2 — the roof ledge + STOP-TIME (bars 42–49, beats 164–196). Follows: the vocal, then the bass. ◆ 164
| Bar | Music | Actions | Height / mode | World |
|---|---|---|---|---|
| 42 | A7 (after the peak) | swung token row · – 166 R | 790, ledges | breather |
| 43 | kick-and 170.6 | X 169 R (swinging neon letter) · ∪ 170 R · X 170.66 R | 790 | — |
| 44 | **stop-time: bass out** | X 172 R (**big pane**) · rest · X 174 R (big pane) · ∪ 175 R | 790 | bgPulse on each hit: *your hit is the sound* |
| 45 | held note 178.67 | X 176 R (big pane) · X 177.66 **S (bat, snare-and)** · ═ 178.66 **S (knee-slide under a window-washer's plank)** | 790 | — |
| 46 | **versePeak 180** | ∪ 180 R (pop out) · X 181 R (big pane) · X 183 R (big pane) | 790 | **BIG JIM's first glint** in a penthouse window (setPiece 180, 4 beats), flash + zoom 0.84 |
| 47 | held note 184.67 | X 184 R · – 184.66 R (held jump over a recessed balcony, safe) · X 187 **S (bat)** | 790 | — |
| 48 | **B pedal, every beat** | ∪ 188 · ∪ 189 · ∪ 190 R (**window-washer cradles**, safe over a balcony) · X 191 R | 790, cradles | clack 1 beat before |
| 49 | A, held 193.67 | ∪ 192 R (up) · X 193 **S (bat)** · ∪ 194 **S (firebomb)** · X 194.66 R · X 195.66 R | 790 → 840 | — |

### Pre-chorus 3 (bars 50–51, beats 196–204). Follows: the shouts. ◆ 196
| Bar | Music | Actions | Height | World |
|---|---|---|---|---|
| 50 | **no vocal**, D# pedal (.48) | ∪ 196 R · X 197 R · ∪ 198 R (up) · X 199 R | 840 → 890 | the hush before |
| 51 | **HUP 200 · HUP 201 · HEY 202**, walk-up, fill &4 | ∪ 200 **L (gap)** · ∪ 201 **S (firebomb)** · X 202 **S (the goon in front of the big window)** = **Hup-Hup-HEY → the HEAVE sends him THROUGH the glass** · X 203.66 R (shards) | 890 | setPiece windowCrash, flash + shake; ground → `lanes` at 202.5 |

### Chorus 3 — the BLACKLIGHT LANES (bars 52–59, beats 204–236). Follows: the kick, then the shouts. ◆ 220
| Bar | Music | Actions | Height / mode | World |
|---|---|---|---|---|
| 52 | A7 climb, A on the downbeat | **LAUNCH 204 → 206** · X 205 R (pin mid-air) · X 206.66 R (pin, D#) · ∪ 207 **S (first ball, on the E)** | 890 → 950, lanes | zoom 0.8, flash + shake; hint (2 of 2): hop the balls |
| 53 | E7, **HEY 209, 210** | ∪ 208 **L (gutter)** · X 209 **S** · X 210 **S** (**a Bluffer PAIR on the HEY HEY**) · X 211 R · X 211.66 R | 950 | flash on each HEY |
| 54 | A7 | ∪ 212 · ∪ 213 · ∪ 214 **L (PINSETTERS slam on the beat over the gutter)** · X 215 R (E) | pinsetters | — |
| 55 | E7, **HEY 218** | ∪ 216 **S (ball)** · X 217 R · X 218 **S (Bluffer on the HEY)** · ∪ 219 **S (ball)** | lanes | flash 218 |
| 56 | A7, **held 222.09** | X 220 R · X 221 R · ═ 222 **S (SLICK RUN: knee-slide under the pinsetter bar)** · X 223.66 R | slick-run | ◆ 220 |
| 57 | A7 **.85 = the chorus peak** | ∪ 224 **L (peak gutter)** · X 225 **S (Bluffer)** · ∪ 226 **S (ball)** · X 226.66 R | lanes | shake |
| 58 | **hook-A walkdown** B A G F# | X 228 · X 229 · X 230 · X 231 R (**four GIANT pins**, everyone slams) | lanes | shake on every quarter, zoom 0.76 |
| 59 | E lands, hook B | ∪ 232 R · X 233 R · ∪ 234 S (ball) · X 235 R | lanes | the breath; flash 232 |

### Tag 3 (bar 60, beats 236–240). ◆ 236
| Bar | Music | Actions | World |
|---|---|---|---|
| 60 | tag, fill &3 &4 → 240 | ∪ 236 R · X 237 R · ∪ 238 R · X 238.66 R · X 239.66 R (big pin) → **finish 240** (flash + shake) | the breakdown downbeat is act 3's start |

## Checks

- `npm run rubric -- --level=src/level/index.ts#gameLevel --bars=34-60 --reports=<act-2 bot dirs>` (the new `--bars`
  option judges one act inside the whole level; novelty still sees act 1).
- Autoplay from the cold open through bar 60: 0 deaths, every action executed on time.
- Bots from the act-2 checkpoint (`--start=132`): sloppy ×5, ±130 ×3, ±40.

## As shipped (iteration 3)

See `docs/ITERATIONS.md` → "Iteration 3 — act 2 notes" for the measured numbers.
