# OpusLegends — Creative Bible: "SLIM CHANCE"

Source of truth for creative choices. Research lives in `docs/research/` (principles in `reference.md`, idea pools in
`ideas-A/B/C.md`, theme pools in `themes-D/E.md`). Where this doc gives a number, the number comes from `reference.md`
unless it's marked **[tune]**. **No song lyrics appear in this repo.** We describe the song's structure and story only.
*Lineage:* crab coast (rejected) → CUE-FU (random draw, `themes-D.md` §4) → user feedback: no kung-fu, a muscly tattooed
pool shark, and a **harder, busier** level. Film frame, audience, iris-out, Big Jim, song, §4 rules and §7 grid carry over.

---

## 1. Pitch

**Song.** "You Don't Mess Around with Jim" (Jim Croce, 1972) in **our own instrumental arrangement**: a Black-Betty-style
stomp-boogie (floor-tom + cowbell stomp, fuzz riff, honky-tonk piano, gang **"HEY!"/"HUP!"**), **fixed at 164 BPM, E,
two-beat shuffle** (kick 1 & 3, snare 2 & 4, swung 8ths at 0.67; `docs/music/transcription.md`). The story: a bully, Big
Jim, rules the pool hall until an underdog takes him down, and the last chorus flips whose name nobody messes with.

**Pitch.** The level is a scratched **1973 grindhouse double feature** on 42nd Street. You're **Slim**, a hulking,
tattooed, broke pool shark (the name is ironic), and you fight your way up **the Jimperial**, Big Jim's neon-crowned
palace of vice: honky-tonk bar, blacklight bowling alley, pool room, velvet casino, rooftop, penthouse. Every stab is a
cue swing and every "HEY!" is you. The theatre audience is your streak meter. On the silent beat you **break a racked
triangle of goons** with one shot, burst onto the roof at sunset for the drop, topple the giant **B-I-G J-I-M** sign
letter by letter, climb to the penthouse, and on the final hit the projector's **iris slams shut on Big Jim's face**.

> **Told to a friend:** "It's a scratched 70s grindhouse movie. You're a massive tattooed pool shark called Slim, every
> 'HEY!' is you cracking a goon with your cue, stuff is exploding everywhere, and the cinema audience goes wild when you
> play well. You break a rack of goons on the silent beat, the drop hits as you smash onto the roof, the BIG JIM sign
> falls like dominoes, and the iris closes on him on the last beat. Then it prints the movie poster of *your* run."

**Frame.** The marquee's double bill: **BIG JIM** in huge letters, and under it, tiny, **SLIM CHANCE** (our fictional
studio: **Eightball Pictures**). Six **reels** give six acts. The cold open is the dark theatre and the countdown leader;
the finale is the iris-out, the film flapping on the reel, and an usher swapping the billing. **Tone:** a rowdy
midnight-movie bar brawl: slapstick, swagger, crash zooms, freeze frames, stuff breaking on every beat. **Guardrails:**
cartoon violence only (no blood), bottles are unlabelled, no drugs or sleaze, tattoos are classic flash (no gang, hate or
brand marks), no real people's likenesses.

---

## 2. Hero: Slim (the underdog)

### Look (procedural, reads at 130–150 px)
- **Build:** a wedge. Huge shoulders and forearms, small head, shaggy 70s hair and **mutton chops**, jeans, boots.
- **Shirt:** a **tangerine bowling shirt** `#FF8A1F` (shade `#C45A0E`) with one cream panel stripe `#FFF6E8`, sleeves
  rolled, worn open over a cream ribbed tank `#F4EFE2`. "SLIM" is stitched over the pocket.
- **Tattoos:** both arms sleeved in **bold traditional flash**: swallow, panther, eagle, dagger-through-heart, an "8-BALL"
  banner. 3 px black linework `#1A1410` filled with faded teal `#3E8C84` and brick `#9A4A3A` (never a sacred colour). They
  react: the swallow flaps on the hats and the panther snarls on every Perfect.
- **The cue:** a two-piece maple cue `#E7C48A` with a black butt `#2A1E16`, carried on the shoulder like a bat. Each
  pendulum he cracks inlays a **gold notch** in the butt (the visible trophy tally).
- **Size:** ~144 px tall, ~90 px wide at the shoulders. **Hitbox 60×100, slide 60×44 [tune]** (the engine's 64×60 was the
  crab's). Silhouette: a V-shaped slab + a long diagonal cue. Nothing else on screen has it.

**Personality:** a quiet hustler who lets the cue talk: shoulder roll on every beat, chalk puff on the downbeat, a grin
when a goon flexes at him. **Underdog motif:** big as he is, he's the broke nobody billed in the smallest type; Big Jim
is bigger, richer and owns the building. Slim wins with rhythm.

### Animation list
Key poses land **on** the beat. Attacks follow the "short backswing" rule: near-zero wind-up, big follow-through.

| Anim | Notes |
|---|---|
| Idle | Shoulder roll each beat, chalk puff on beat 1, cue twirl every 2 bars |
| Run | Heavy stomping sprint, cue on the shoulder, dust and floor-crack ticks per footfall |
| Hop / Jump | Stretch (0.84×1.2), knees tucked, cue overhead. Lands with a squash (1.25×0.78) and a floor-shake puff |
| **Power-Shot** | Big two-handed cue swing, low-forward → high overhead (up-forward arc). Contact frame on the input. Crescent smear with chalk dust |
| Perfect shot | **Freeze frame**: 3 frames of hold, 2% zoom-punch, radial speed lines, the panther tattoo snarls |
| Break (end of Hup-Hup-HEY) | Full-body swing; the target flies through a wall or off the screen |
| Knee-slide | Drops to his knees and slides, cue held level like a guitar, sparks off the floor |
| Stumble | Staggers with little 8-balls orbiting his head. ≤0.4 s |
| Death / respawn | Falls out of frame, audience "OOOH", the film **rewinds** to the splice (≤0.6 s); he re-chalks on the downbeat |
| Victory | Cue across his shoulders, double flex on the throne of pool tables; the ex-goons applaud |

### Verbs: 3 core + 1 mode
The engine's wall-jump is **off** for this level.

| Verb | Input (kbd / pad) | What it does | Sound it layers onto the music |
|---|---|---|---|
| **Run** | hold → / stick | Top speed = tempo (§4) | Heavy boot thuds on beats, quiet |
| **Hop** | Space or Z / A | Variable jump. Tap ≈ 1-beat hop, hold ≈ 2-beat jump | **Woodblock "tok"**, low, alternating 2 pitches (quantised to the shuffle grid if early) |
| **Power-Shot** | X / X | Up-forward cue swing. Hits enemies ahead **and** things above | Slim's **"HEY!"** + a ball-crack THWACK. The audience doubles the shout when 4+ are standing |
| **Knee-slide** *(mode, from Verse 2)* | hold ↓ / hold ↓ or RT | Low slide. On Slick Runs it's the sustain verb (§5.3) | A **slide-guitar sustain** on the run's pitch. Release = pick-scrape "zzip" |

**Signature: the Freeze.** Every Perfect freezes the frame like a replay; the nearest audience row leaps up in a ripple.

---

## 3. World: the Jimperial on 42nd Street

At the end of 42nd Street stands **the Jimperial**: a seedy five-storey palace of vice with a neon crown and a rooftop
sign reading **BIG JIM**. Outside, it is always on the horizon; the penthouse window shows **two aviator glints** that
flash on every chorus stab. Indoors, ceiling dust shakes down on the stabs as Big Jim stomps around upstairs.

**Six reels:** 1 **42nd Street** (marquees, fire escapes, rooftops; bars 1–16) · 2 **the Honky-Tonk** (ground-floor bar;
17–32) · 3 **the Blacklight Lanes** (bowling alley + arcade, the verse-2 "cave"; 33–56) · 4 **the Pool Room** (57–64) →
**the Velvet Casino** (65–72) · 5 **the Roof** at sunset → the penthouse tower (73–88) · 6 **the Penthouse** (89–96).

### Palette

**Sacred colours** are never used for anything else:

| Role | Hex | Used by |
|---|---|---|
| **Hero** | tangerine `#FF8A1F` (+ shade `#C45A0E`), stripe `#FFF6E8` | Slim only |
| **Reward** | gold `#E0B64A`, shine `#FFE08A` | Tokens, cue notches, Perfect sparkles, struck targets, chain medallions, the head goon's glow |
| **Danger** | danger red `#B3201B`, hot edge `#FF4A3D` | Goon cue tips, snapped cues, thrown bottles, Little Jim lenses, Big Jim's knuckle rings and fist edges |

**World colours:**

| Group | Colours |
|---|---|
| Film | film black `#1A1410`, faded highlight `#E9D8B4`, projector haze `#F8F1DC` (12%), subtitle cream `#F4EFE2` |
| Street | asphalt `#2B2530`, brick `#6B3A2E`, neon jade `#46D6A0`, neon rose `#E0569B`, marquee bulb `#FFE9C2` |
| Honky-Tonk | wood `#8A6A4F`, dark wood `#4E3A2C`, dull brass `#8C7440`, bottle green `#2F5A3A`, beer-sign neon jade/rose |
| Blacklight Lanes | UV violet `#2A1650`, UV black `#120C1E`, glow cyan `#3FF0E0`, glow pink `#E04BD0`, lane gloss `#B9A0E0` |
| Pool Room | felt `#1F6B45`, felt shadow `#0E3A26`, lamp pool `#F6E7B0`, walnut `#5A3A26`, smoke `#8C8A7A` |
| Big Jim / Casino / Penthouse | fig `#5E2B4E`, velvet sheen `#8A4A76`, shadow `#2E1428`, chrome `#C9D3DA`, chip teal `#2E7F86` |
| Sunset (roof) | cream sun `#FFE9C2`, coral `#F2856B`, rose `#E8577A`, fig dusk `#5E2B4E`; BIG JIM sign neon in rose |
| Theatre (frame) | seats/audience `#0D0A08`, curtain `#4A1A20`, house-light amber `#C98A3A` |

### Parallax (back → front, scroll factor)
0. **The theatre** (fixed, *outside* the film pass): a ~70 px audience strip along the bottom (the streak meter, §4),
   projector haze across the top, curtain edges. Never interactive; the ground stays above it.
1. **Matte-painted sky** (0.05): gradient, sun or moon, the Jimperial's neon crown with its aviator glints.
2. **Far** (0.25): skyline, water towers, marquees; later the street far below as you climb.
3. **Mid** (0.55): **background brawls** (§4 Density), bartenders, bowlers, card tables, pinball walls, smashed windows.
4. **Play** (1.0): floors, bar tops, lanes, tables, lifts, benches, the sign, Big Jim himself.
5. **Foreground** (1.3): flying debris, hanging lamps, cigarette smoke, bead curtains. Sparse, never over the play band.

### Film pass (post-process on layers 1–5)
**Grain** 3% luminance noise re-rolled at **24 Hz** (film rate; 4 pre-baked tiles cycled) · **scratches** 0–3 vertical 1 px
lines, 3–12 frames each, denser as the Burn closes in · **dust** 0–2 specks per film frame, a hair every ~8 s · **gate
weave** ≤2 px horizontal + ≤1 px vertical **in time with the bassline** (render offset only, never collision) ·
**flicker** 1.5% at 24 Hz plus a 1-frame shutter dip on each downbeat · **grade** blacks lifted to `#1A1410`, warm multiply
`#FFF1DC`, 18% vignette · **cigarette burns**: a 36 px changeover dot top-right for 1 beat (the pre-drop countdown, §5.7,
and crashes). **Accessibility:** "Film damage: full / light / off", plus the shake slider (§4).

### Silhouettes and readability
| Who | Silhouette (must read at 25% scale) |
|---|---|
| Slim | V-shaped slab + long diagonal cue; the only tangerine |
| Bluffers | round-shouldered bruisers in fig vests; double-biceps flex = wide "W" shape; red cue tip |
| Little Jims | half-size Big Jims: fig suit, tiny aviators, gold chain; red lenses |
| Pendulums | lamp / punching bag / 8-ball on a line; gold when struck |
| Big Jim | a pear-shaped velvet mass under two blazing chrome ovals |

**Rules:** sacred colours only for their roles. Background layers lose 30–50% saturation and contrast; **no background hue
within ±12° of tangerine above 55% saturation** near the play band (sunsets are coral and rose, never orange). Background
brawlers are drawn at 50% contrast in the mid layer's palette and **never** use danger red; anything that can hurt you
moves into the play layer with a red edge and a 1-beat telegraph first. Every walkable top has a 4 px film-black edge +
2 px cream lip. Subtitle platforms are **cream with a black outline** (never yellow). Slim gets a 2 px cream rim in dark,
blacklight and silhouette scenes. Nothing interactive sits in the theatre strip.

### How the world performs the song
**Stomp/kick:** the audience stomps, ceiling dust drops, lifts thud · **cowbell:** bar bells and neon letters tick ·
**snare/claps:** popcorn over the audience, background punches land on 2 and 4 · **hats (swung 8ths):** lamps sway,
neon buzzes · **bass:** the gate weaves; balls roll on background felt · **fuzz riff:** background brawlers swing on its
accents · **piano:** tokens flash, the bar piano's keys jump · **"HEY!":** the audience yells, a cream "HEY!" subtitle
flashes · **crash:** a cigarette burn flares, something big breaks (window, chandelier) with a 1–2% crash zoom ·
**downbeat:** shutter dip and the chalk bar line (§6.4).

### Lighting arc (one night at the movies)
| Section | Light |
|---|---|
| Cold open | The dark theatre, projector beam haze, countdown leader |
| Intro (1–8) | 42nd Street golden hour, faded ochre sky `#DCC7A0`→`#E9D8B4`, long shadows |
| Verse 1a (9–16) | Neon marquee dusk → night `#2A1E3A`, neon jade and rose, bulbs chasing |
| Verse 1b / Chorus 1 (17–32) | The Honky-Tonk: amber bar lamps, beer-sign neon, smoke |
| Verse 2 / Chorus 2 (33–56) | The Blacklight Lanes: UV violet dark, glowing lanes, pins and arcade screens |
| Stomp break (57–64) | The Pool Room: felt-green light pools under hanging lamps, smoke layers |
| Build (65–72) | The Velvet Casino: fig darkness; chandeliers gutter out one per bar until only the gold head goon glows |
| Drop (73–80) | **Smashing onto the roof into a sunset**: coral `#F2856B` → rose `#E8577A`, the BIG JIM sign against a cream sun |
| Climb (81–88) | Sunset sinking to fig dusk as you climb; the penthouse glows above |
| Outro (89–92) | The Penthouse: one cream skylight shaft, dust in the beam, chrome aviators blazing |
| Finale (93–96) | Pull out to the theatre; house lights come up amber; the iris closes |

---

## 4. Core rules

**Speed control: held run + tempo cap + catch-up surge (reference Q1 → B/C hybrid).** 384 px per beat; top run speed
= `384 × BPM / 60` = **1049.6 px/s at 164 BPM**, so holding → keeps you exactly on the grid. **You can never be ahead of
the grid**; when *behind* it (stumble, release), top speed rises **+15%** until you're back. **Why:** Rayman's agency and
"you can really fail" [S7], with the guarantee that obstacles, SFX and marks line up. **Assist:** "Auto-run" toggle.

**Chaser: the Burn.** The film burns through behind you: a bubbling cream-white hole with scorched edges eats the frame
from the left. Iteration 9 (user: "the fire shouldn't be stressful"): it is a CALM LOWER BOUNDARY — it rests ~3.5 beats
behind the grid, off screen (a warm glow at the frame's left edge), never lunges, and takes you only if you STALL
(fall ~2.75 beats behind: stop running, stuck at a wall). The set **collapses into it** (bar shelves,
lanes, tables and ceilings fall in behind you). It first appears on bar 5 and changes form per act (rising under the rack
and the climb, Big Jim's backhand in the outro).

**Off-beat behaviour (reference Q2 → B).** Every action *works* off-beat; physics never reads the grade, which only
affects tokens, audience, sparkle and score. Early SFX sound on the next shuffle subdivision (triplet 8th), late ones
immediately. Jump takeoff is never delayed.

**Timing windows** (constant ms, early side +12 ms): **Perfect ±45 · Great ±90 · Good ±135**. Each input resolves to the
nearest unconsumed target. A beat is 366 ms at 164; a swung "and" sits 245 ms after its beat, so windows can overlap.
Playtest Good at ±150 **[tune]**. **Forgiveness:** coyote 100 ms, jump buffer 100 ms **[tune 80–130]**, shot buffer
100 ms, corner correction on.

**Fail state (reference Q3 → C, with A for pits).**
- **Stumble** (snapped cues, goon jabs, thrown bottles, rolling balls, Little Jims, low obstacles, Big Jim's fists):
  0.5-beat knockback, 1 beat of i-frames, 5 tokens dropped (they hover 1 bar), audience −25% (min 3). The surge wins the
  ground back. **Stumbles never kill** (iteration 9: a stumble pulls the Burn only 0.4 beat, never nearer than 2.75
  beats; missed rewards never feed it — Rayman's rule: missing rewards costs score, crowd and music, not life).
- **Death** from falling out of the frame (street gaps, lift shafts, lane gutters over the floor below, roof edges) or
  being caught by the Burn after a stall. **Bars 93–96 cannot kill you.**

**Checkpoints:** a **splice** every **8 bars** (§7): splicing tape across the frame with a hand-lettered scene number
("SC. 17"). **Respawn in < 1 s** on a bar boundary: the film visibly rewinds and the music restarts 1 bar before the
checkpoint for a count-in (engine `countInBeats: 4`). After **5 deaths** in a segment, offer "Skip ahead" (costs tokens).

### Density & challenge (hard rules)
A **required action** is one whose miss costs a stumble or a death (hop a hazard/gap, shoot an attacker, slide under a
low obstacle, stand on a lift on its beat). Optional targets (pendulums, bumpers, tokens) never count.
1. **Required density:** **≥ 1 per 2 beats in verses, stomp break and build; ≥ 1 per beat in choruses, the drop, the
   climb (83–88) and the outro gauntlet.** Per 8 bars: verse ≥ 16, chorus ≥ 32. Checked by a level linter in `npm run playtest`
   that counts intended actions per section **[to build]**.
2. **Zero threat only in bars 1–4.** Stumble hazards from bar 5, **lethal gaps from bar 7**.
3. **Mixed verbs:** from bar 9, no more than 4 consecutive required actions of the same verb; every chorus bar mixes ≥ 2
   verbs; from Verse 2, every 2-bar phrase uses all three (hop, shot, slide). Swung-8th pairs (hop on the beat, shot on
   the "and") appear from Chorus 1.
4. **Moving threats:** every act has one of its own on top of the static ones: thrown bottles (street), stools and
   bottles sliding down the bar (Honky-Tonk), rolling bowling balls (Lanes), flying balls and flipped tables (Pool Room),
   falling chip towers (Casino), swinging sign parts (Roof). Each has a 1-beat audible + visual telegraph.
5. **High routes:** every section has an optional harder route above (bluffer bounces, subtitle bars, lamp rails,
   rafters) with 8th-note spacing, swung hops and double the tokens. Top Billing needs them.
6. **The screen is always busy:** at every moment **≥ 3 beat-reactive elements** move on screen and **≥ 1 event per bar**
   happens (a window smashes, a brawler flies, a lamp falls, a table flips). Background brawls punch on 2 and 4; debris
   flies on crashes; the set collapses into the Burn; the camera punches (1–2%) on stabs and whip-pans on section changes.
7. **Difficulty targets:** a first-time player dies **0–2 times in bars 1–24, 2–4 times in Chorus 1, 10–20 times in a
   first clear** (no segment averaging > 5), and clears in 15–30 min. A skilled player can **no-death it after about an
   hour of practice**. Autoplay stays perfect.
8. **Escalation beats rest:** each 8-bar block peaks in its last 2 bars; the first bar after a checkpoint is one notch
   easier. The only true breathers are bars 1–4 and 93–94, and even those stay busy on screen.

**Feedback** is diegetic first. **Perfect:** the Freeze, gold sparkle, pitched chime, audience ripple. **Great:** jade
spark. **Good:** normal sound. **Miss:** no sparkle, never a harsh noise unless it's damage. Hitstop is cosmetic (50–70
ms). A 1% beat-bump zoom on downbeats is separate from trauma shake (accessibility slider). Text popups off by default.

**The audience is the streak meter and the music reward.** +1 person standing per Good-or-better action, +3 for a complete
on-grid Hup-Hup-HEY, cap 24 across the theatre strip. The **shouts stem** runs from −6 dB at 0 standing to full at ≥ 12.
At ≥ 20, **FULL HOUSE**: everyone's up, popcorn flies, the marquee bulbs chase, and the **bonus stem** fades in over 1 bar
(and out over 1 bar below that). Goons you knock off the screen land in the front row and cheer for you.

**Runway:** camera lead 30% of screen width at 0.95 zoom ≈ 3.6 beats (≈ 1.32 s at 164); choruses and set-pieces zoom out
10% more. Every hazard has a wind-up sound 1 beat ahead. **Calibration** per reference §2.3 (audio clock, latency
compensation, tap test in pause, bounded auto-cal).

**Score:** **tokens** are the lums: brass pool-hall tokens stamped with an 8-ball. They trace the ideal path, and each
pickup SINGS the next note of Croce's vocal melody (iteration 6, Castle Rock's lum trick): a bright honky-tonk piano +
bell two octaves over him, doubling him where he's on pitch and harmonising where he bends, chord tones between phrases
(`audio/tokenMelody.ts`). Lay token rows on the `tokenMelody` lane's onsets and they play the tune. **Cups:** Bronze / Silver / Gold Cue,
then **"Top Billing"** (every token and every pendulum); thresholds set after layout **[tune]**.

---

## 5. Mechanics catalogue

The rule for every mechanic: **the object tells you *what*; the chalk mark (§6.4) tells you *when*.**

### 5.1 Pendulum Shots *(B2 Star Pierce: pendulum targets struck on the beat)*
- **Do:** things hang and swing with a **1-bar period**: bar signs on the street, green-shaded pool lamps, punching bags in
  the back room, **giant eight-ball chandeliers** in the casino. They reach shot height only at the bottom of the swing,
  **on the beat**; shoot there to crack them: a chime pitched to the chord, a token burst, a **gold notch** on your cue.
- **Music:** small ones on backbeats, **big ones on chorus stabs**. **Telegraph:** pendulum physics plus a glint 1 beat
  before the bottom. A miss just swings past (optional, but they often hang over a hazard you must hop anyway).
- **First:** bars 1–4, the zero-threat shot tutorial. **Escalates:** singles → pairs on "HEY! HEY!" → above Slam Lifts
  (hop + shot) → lamps whose cords snap and drop as hazards if you miss → on lines that snap as the sign falls.

### 5.2 Hup-Hup-HEY! *(A-M1 Pyrrhic Double, ∪ ∪ –)*
- **Do:** a three-hit phrase, **hop (∪), hop (∪), POWER-SHOT (–)**: dodge-dodge-strike, the boogie's da-da-DUM (typically
  cue, cue, then a bluffer or chandelier). All three Good+ = the audience roars it, the shot becomes a **Break** (the
  target flies through a wall or into the front row, extra hitstop, crash zoom), and the audience gets +3.
- **Music:** every phrase is **quarter, quarter, half (beats 1, 2, 3–4)** with gang **"HUP! HUP! HEY!"**, so ∪ = 1 beat,
  – = 2. **Telegraph:** ∪ ∪ – marks ahead, plus an audience inhale on the beat before.
- **First:** Chorus 1 bars 31–32 with full marks. **Escalates:** single → back-to-back → hop-hop-**SLIDE** down falling
  letters → no marks on the climb → cracking Big Jim's aviators → **the level's final input** (§6.2).

### 5.3 Slick Runs *(B21 Dune Surf Sustain): the Verse-2 mode*
- **Do:** glowing **slick runs**: freshly oiled bowling lanes, then polished bar tops and felt, then the falling sign
  letters and the frame line. **Hold ↓ for the whole run**: Slim knee-slides, collects its token line, and passes under
  the low obstacles lining every run (pinsetter bars, ball-return hoods, shelves, lamps; standing early = head bonk).
  **Release at the lip** (last half-beat) for a kick-out pop, or press hop; a late release still clears, lower.
  Rolling balls come down some lanes: hop them mid-run.
- **Music:** each run is **a held note** (slide-guitar or bass sustain): length = note length, hue = pitch. Your slide
  plays that pitch and your release lands on the rest. **Telegraph:** the length shows 3+ beats ahead; the lip glows.
- **First:** Verse 2 bars 33–40. **Escalates:** 1-bar runs → 2-bar with a mid-run pendulum (slide + shot) → slide + hop
  over a ball → hop-hop-SLIDE → the falling letters and the frame line.

### 5.4 Slam Lifts *(A-M17 Flying Flats: platforms that slam on the beat)*
- **Do:** the Honky-Tonk's cellar **keg lifts** (later the casino's freight-lift cages): iron platforms that **slam down
  on the beat** (solid until the swung "and") and **shoot up on the offbeat** (gone). Sets alternate (A on 1 and 3, B on
  2 and 4): pogo lift-to-lift with 1-beat hops over the open cellar shaft (lethal).
- **Music:** stomp = down, hat = up; the room breathes. **Telegraph:** a rim **clack 1 beat before** each slam, plus the
  lift's shadow sharpening. **First:** Verse 1b bars 17–24. **Escalates:** every beat → mixed 1/2-beat gaps (∪ ∪ –
  spacing) → bluffers riding lifts → kegs rolling off them → **"concept of delay" payoff: Big Jim's fists slam and lift
  in exactly this pattern in the outro.**

### 5.5 Bench Flips *(C-M17 Spoon Catapults: catapult see-saws)*
- **Do:** pool-hall benches balanced on cue racks as see-saws, loaded with an 8-ball, a spittoon or a dozing goon. **Land
  on the high end** (the kick) and the payload arcs along a dotted preview to hit its target exactly **1 beat later** (the
  backbeat), or 2 for big arcs: **jukeboxes** (floor-tom **BOOM**, they light up), **brass bar bells** (cowbell
  **CLANG**), **goons ahead** (clears them; miss and you must shoot them yourself), or the next bench (chain).
- **Music:** kick → backbeat cause-and-effect; you add the stomp break's accents, chains roll *boom-boom-CLANG*.
  **Telegraph:** dotted arc and lit target 2+ beats ahead, plus a bench creak. **First:** Stomp Break bars 57–60.
  **Escalates:** single → chains of 3 (61–64), with flipped tables and flying balls to hop between benches.

### 5.6 Bumper Riff *(C-M8 Stalactite Melody: riff call-and-response)*
- **Do:** at the arcade end of the Lanes, a wall-sized **pinball machine** plays the riff. **Call bar:** its backglass
  lights and its chime **pop bumpers** ring the riff, each flashing as it sounds, while you hop the balls it fires at
  you. **Response bar:** the same bumpers pop up over *your* path at their grid positions; shoot each on time with the
  cue's upward arc or by hopping into it. **Pitch = height:** low notes in shot reach, high notes need hop + shot. A
  missed bumper leaves a hole, no penalty (the base stem keeps a ghost), but the hazards between them are required.
- **Music:** the producer **omits the lead riff in response bars** (§7), so *your* shots are the riff. **Telegraph:** the
  call bar itself, plus a rim-light 1 beat ahead. **First:** Verse 2 bars 41–48. **Escalates:** 4 quarters → 8th-note
  phrases with a hop between → **no call** in the outro (the medallions on Big Jim's gold chain, from memory).

### 5.7 The Rack *(C-M22 Log Jam Build: the player causes the drop)*
- **Do:** in the Velvet Casino, Big Jim's goons **pile into a giant racked triangle**, one row per bar on the downbeat
  (bars 65–71), as a rising staircase you climb while they swing at you, chip towers topple and the Burn rises below.
  On bar 71 a huge wooden rack frame drops over them. At the apex the **head goon** glows gold. **POWER-SHOT him on bar
  72 beat 4**, into the silence: **KRAK**, the rack **breaks** in slow motion (goons scatter like balls and drop into
  trapdoor "pockets"), and **the drop hits on bar 73** as the recoil blasts you through the skylight onto the roof. If you
  miss, the rack collapses anyway and the Burn blows the skylight, with no bonus.
- **Telegraph:** **cigarette burns**: the changeover dot flashes top-right on 72 b1, b2, b3; on b4 the reel changes and
  that's your beat. Rows cast shadows 1 beat early. **Appears once:** bars 65–72.

---

## 6. Enemies, set-pieces, wild cards

### 6.1 Enemies and the boss

**Bluffers** *(A-E3 Flag-Wavers + deimatic display)*: Big Jim's muscle
- **Look:** round-shouldered bruisers in fig vests and flat caps, cue in hand with a **danger-red** chalked tip. Found on
  floors, bar tops, lifts, benches, sign letters, and Big Jim's sleeves. They deliver trash-talk subtitles (§6.5).
- **The trick:** **on the offbeat** they **flex** (a double-biceps bluff, all show), and their flat shoulders are a
  **bounce platform** onto the high route. **On the beat** they drop the pose and **jab with the cue**. **Telegraph:** a
  neck crack and a rising grunt 1 beat before.
- **Counter:** power-shot on the jab beat. He's knocked **off the screen into the theatre's front row**, sits down and
  cheers for you. Otherwise the jab hits and you stumble.
- **Escalates:** singles on the turnaround "HEY!" (bar 16) → pairs on "HEY! HEY!" → feints that flex for 3 beats and jab
  only on the phrase's "HEY!" → riding lifts and benches → the outro line, one per beat, on Big Jim's sleeves.

**Little Jims** *(merge of C-E11 Wax Mimics + B-E4 Echo Robes: echo enemies that replay your last bar)*
- **Look:** Big Jim's half-size **copycats**: cheap fig suits, tiny aviators with **danger-red** lenses, gold-paint
  chains, cues. They copy everything, including you.
- **Rule:** each Little Jim performs **your previous bar's inputs, one bar later**. Its sounds are your SFX, delayed and
  alley-reverbed (a musical canon), and your previous bar floats above it in chalk, so you can *read your own echo*.
  Touching one = stumble; an off-unison shot glances off.
- **Beat one by unison clash** (Echo Robes): it stands where you'll arrive; shoot on the beat it echo-shoots (*repeat*
  last bar's rhythm) and the cues meet, **CLACK!**, his aviators fly off and he runs. **Or bait it** (Wax Mimics): a
  Little Jim on a lane jumps when you jumped last bar, straight into a rolling ball.
- **Design law:** they're always placed so that *repeating the song's shout pattern* beats them. Follow "HEY! HEY!" and
  you win without maths; get the canon and you can bait them for style.
- **First:** bars 45–48 as harmless figures behind the arcade glass, miming you 1 bar late (the "aha"). They block in
  Chorus 2 (bars 49–56), with one cameo in the outro.

**Hazards:** **snapped cues** (static, red tips), **thrown bottles** (arc from windows and the bar; shadow + whistle
telegraph), **rolling balls** (bowling and pool; rumble 1 beat ahead), **falling lamps and chip towers**.

**BIG JIM** *(the boss, the payoff of both set-pieces)*: owner of the Jimperial. A huge pear-shaped frame in a **fig
velvet suit** with flared lapels and curtain-like sleeves, a gold chain of medallions, danger-red knuckle rings, and
**mirrored aviators that reflect the hero's approach** (a tiny tangerine Slim grows in the lenses as you climb). He sits
on a **throne of stacked pool tables**. **Not a health-bar fight: he is level geometry and spectacle** [S14]. His
**bluff display** is the reveal: arms flung wide, sleeves flaring, both lenses flashing like eyespots, a roar. All puff.
He is the glinting penthouse window on the horizon, the stomping on every ceiling, the crash-zoom close-up whose
**sleeves are platforms and fists are slam pistons**, and finally the face the iris closes on.

### 6.2 Set-pieces

**SIGN FALLS** *(A-S2 Arch Falls: toppling dominoes → vertical climb)*: the climax, Final Chorus bars 73–88.

| Bars | What happens |
|---|---|
| 73–78 | You smash onto the roof into the sunset. Along it stand the six giant neon letters **B-I-G J-I-M**, each three storeys tall on steel legs. The drop cracks the B, and they **topple like dominoes, one letter per bar on the downbeat** (stomp + crash), sparking and popping. Each fallen letter leaves its steel legs as **new posts**. Run the letter tops, **knee-slide down each falling letter** on held notes, and hop post-to-post on "HEY!" beats. Bluffers ride the letters; neon tubes burst as hazards. Everyone is a silhouette against the sun except you |
| 79–80 | A **2-bar drum fill**. Two huge **Big Jim billboards** (his grin and aviators) fall on the fill's accents with 1-beat post hops, and the last one smacks into the penthouse tower. The aviator glints *twitch* |
| 81 | On the biggest crash, **the film slips the gate**: the picture rolls and the black **frame line** rises under the falling billboard like a lift. It catches you (generous landing zone) and you **slide along it** |
| 82 | The frame line flicks you, and the picture snaps back into register with you on the tower's first fire-escape landing |
| 83–88 | **The vertical climb** up the penthouse tower: fire escapes, window-washer cradles and the neon crown's scaffold. Rising hops on every beat (~100 px gain per beat, camera tilts up), bottles thrown down from windows, Hup-Hup-HEY against bluffers with **no marks**. The Burn rises beneath |
| 88 (summit) | You crash through the penthouse glass. Big Jim rises from his throne in his **bluff display**, and the camera **crash-zooms** until he fills the screen. Bar 88's sustained chord + roar swell |

**IRIS OUT** *(B-SP7 Screen Fold: the world closes on the boss)*: outro bars 89–96, with Big Jim as the target.

| Bars | What happens |
|---|---|
| 89–90 | **Gauntlet on Big Jim** (in close-up). His fists slam and lift in the Slam Lift pattern; you hop fist to fist and slide down his draped sleeves, with a bluffer line (one jab per beat) riding them. The Burn becomes his sweeping backhand. Bumper Riff reprise with no call on his chain medallions |
| 91–92 | Two **Hup-Hup-HEY** phrases up his lapels (no marks); each final HEY cracks one aviator lens, left then right. He reels. **The hardest 4 bars of the level** (89–92) |
| 93–94 | **Breath.** The camera pulls out of the film: the screen, curtains and the whole audience doing a stand-up wave for you. On screen the picture flattens into a **film strip**; Big Jim is shrunk into a single frame, pounding its edges, while you hop along the strip's sprocket holes (one per beat) through a shower of tokens and popcorn. A cut-in: an usher on a ladder swaps the billing, so **SLIM CHANCE** is now the big letters. The song's role reversal, told without words |
| 95 | The projector's **iris** starts to close in blades on beats 1–4. Each blade swings in beneath you as a tilted platform; hop blade to blade |
| 96 | The last two blades close on beats 1–2 (HUP, HUP). On **beat 3 (HEY!)** you power-shot off the last blade as **the iris slams shut on Big Jim's face** on the final hit |
| After | Black. The film snaps and flaps on the reel. "THE END" burns in. A second iris opens on Slim in his victory pose on the throne of pool tables, the ex-goons applauding, the audience roaring on the ringing chord. **You cannot die in bars 93–96**: a missed hop lands lower as a stumble |

**Bookend:** the level *begins* in this same theatre, with the house lights dimming and the countdown leader (§7).

### 6.3 Wild card: Your Poster *(C-X2 Performance Sampler: a unique, shareable results screen)*
The results screen is a **lurid grindhouse one-sheet for SLIM CHANCE, printed from your run**. Key art: Slim frozen in
**your best Perfect's pose** (the actual frame), towering over a shrunken Big Jim. Your route up the Jimperial is one
painted action streak: on-grid = clean tangerine brushwork, Perfects = gold starbursts, misses = torn gaps, stumbles =
tape repairs. Tagline from your stats ("34 PERFECT SHOTS! 2 FALLS! ONE CUE!"), billing "starring SLIM · with BIG JIM ·
and 112 TOKENS", a rating stamp with your cup, a "HELD OVER!" snipe for FULL HOUSE, and print wear (folds, pin holes)
seeded by the run. Headline: **DON'T MESS WITH SLIM**. Every run prints a different poster. **Export PNG** to share.
**Replay hooks (iteration 6):** the rating stamp is a RANK — a letter badge + a billing tier (S BOX-OFFICE SMASH ·
A CRITICS' PICK · B CULT CLASSIC · C B-MOVIE · D STRAIGHT TO VIDEO) from how the run sounded (time out of the booth,
FULL HOUSE time), how it was played, the tokens and the falls — and the **3 hidden FILM CANISTERS** (one per act, each at
the apex of a HELD jump where the song only asks for a hop: the chimney smoke on the rooftops, the searchlight over the
roof's water tower, Big Jim's shoulder). They wink on the count before their takeoff and 2 tokens climb the held arc as
the clue; a flawless run without them tops out at A — S needs the secrets.

### 6.4 Wild card: Chalk Marks *(A-X4 Scansion: notation marks on the world)*
Upcoming rhythm is marked **on the world** in cue chalk, the way a hustler marks his shot: on floors, bar tops, lanes,
felt and roof tar. **∪** = 1 beat (usually a hop): a chalk dot. **–** = 2 beats (break or slide hold): a chalk dash.
**|** = bar line, a chalk stroke at every downbeat, always on as a quiet metronome. Marks glow jade on their beat and fill
gold on a Perfect. **They teach, then leave:** full marks at each mechanic's debut, bar lines only on reprises,
**nothing** on the climb and the gauntlet; they return over Little Jims (your echo, written out). **Cigarette burns** are
the one mark outside the world: the film's own changeover countdown before the drop.

### 6.5 Wild card: Trash-Talk Subtitles *(themes-D "slanginess")*
When a bluffer or Big Jim shouts (on the lead's hook phrases), a **cream subtitle bar** appears and holds for 1 bar, and
**you can stand on it**: part of the high route. The lines are florid boasts ("NOBODY LEAVES THIS HALL STANDING."), and
the speaker's mouth keeps flapping for 2 beats after the line ends (bad lip-sync, everyone equally). **First:** Chorus 1
(C1–C4). Again in Chorus 2 and on Big Jim's reveal.

### 6.6 Adoption ledger (nothing rejected)
| Drawn | Became | Special quality kept |
|---|---|---|
| themes-D §4 CUE-FU (reworked) | the film frame, audience, Big Jim, a building to climb | Floor-per-act climb; film pass; audience |
| B-H6 + B7 Lead the Wave | Slim; the Freeze; the audience ripple | The crowd syncs to you |
| B21 Dune Surf | Slick Runs (knee-slide) | A hold verb for held notes |
| C-M17 Spoon Catapults | Bench Flips | Delayed kick→backbeat payoff, chains |
| A-M1 Pyrrhic Double | Hup-Hup-HEY! | A 3-hit *phrase* (short-short-long) |
| B2 Star Pierce | Pendulum Shots | Pendulum alignment on the beat; visible trophy tally (notches) |
| C-M22 Log Jam Build | The Rack | The player causes the drop (a break shot) |
| C-M8 Stalactite Melody | Bumper Riff | You play the hook by platforming |
| A-M17 Flying Flats | Slam Lifts → Big Jim's fists | Pistons; the room breathes |
| A-S2 Arch Falls | Sign Falls → frame-line lift → tower climb | Domino collapse to a drum fill, launch, vertical climb |
| B-SP7 Screen Fold | Iris Out (and the theatre opening) | The world closes blade-by-blade; leap off as it slams |
| C-E11 + B-E4 | Little Jims (merged) | Replays your last bar; beaten with your own rhythm |
| A-E3 Flag-Wavers | Bluffers | A harmless show on the offbeat, weapon on the beat |
| A-X4 Scansion | Chalk Marks + cigarette burns | Diegetic, learnable notation |
| C-X2 Perf. Sampler | Your Poster | Unique, shareable record of your run |

**No rejections.** Little Jims are **on probation** (Fun Risk 2) with a defined fallback.

---

## 7. Level structure + song spec (for the producer)

**Bar counts are tempo-independent.**
- **Constant tempo, 4/4, 164 BPM**, two-beat shuffle (swung 8ths at 0.67). The engine derives everything from BPM.
- At 164: bar = 1.463 s, beat = 366 ms, swung "and" = +245 ms. 96 bars = **2:20.5**.
- **Put key/scale per section in `beatmap.json`**, because all pitched SFX read it (E, dominant/mixolydian colour). An
  optional key lift for the final chorus is fine if it's recorded there.

**File layout:** bar 0 is a 1-bar pickup, then bars 1–96, then the final-chord tail (~4 s). The cold-open ambience is a
separate loop.

**Chorus template** (8 bars, "C1..C8" below; 4 hook lines × 2 bars, played instrumentally by fuzz lead + piano).

| Bar | Beat 1 | Beat 2 | Beat 3 | Beat 4 |
|---|---|---|---|---|
| C1 | hook line 1 (full band) | | | |
| C2 | line 1 tail | | band stab + **HEY!** | stab + **HEY!** |
| C3 | hook line 2 | | | |
| C4 | line 2 tail | | stab + **HEY!** | stab + **HEY!** |
| C5 | **stop-time**: hit + **HEY!** | *silence* (lead solo fills) | hit + **HEY!** | *silence* |
| C6 | **HEY!** | **HEY!** | **HEY!** | **HEY!** *(band back in)* |
| C7 | hook line 4 (punchline) stabs: **HUP!** | **HUP!** | **HEY!** (held 2 beats) | |
| C8 | **HUP!** | **HUP!** | **HEY!** | drum pickup |

Hook line 3 is carried by the lead through the stop-time gaps in C5–C6. **The producer may reshape the melody to fit;
the level is built on the stab/shout grid**, so keep that grid exact. In choruses the shout beats carry the shots and
the in-between beats carry hops and slides, which is how choruses reach ≥ 1 required action per beat.

**Verse template** (16 bars): the verse melody on piano and fuzz lead over the stomp groove, with a turnaround stab +
**"HEY!"** on beat 4 of bars 8 and 16.

### Section-by-section
Times are at 164 BPM from the bar-1 downbeat. ◆ = checkpoint splice. **Req** = minimum required actions (§4 Density).

| # | Bars | Time | Song | Level (reel / place) | Req |
|---|---|---|---|---|---|
| 0 | — (+bar 0) | ~4 s | Theatre ambience: projector clatter, audience murmur. The house lights dim on 6 soft stomps; the marquee bills BIG JIM huge, SLIM CHANCE tiny. **Pressing Shot starts bar 0**: the countdown leader (4-3-2-1 on the beats) as a stomp + cowbell count-in, gang "HEY!" on beat 4 | **Reel 1, 42nd Street**, title card. Slim chalks his cue; a street brawl spills out of a bar behind him; the Jimperial glints at the end of the block | — |
| 1 | 1–8 | 0:00 | **Intro.** 1–4: fuzz boogie riff alone (plus stomp). 5–8: + bass, piano, cowbell, full kit. The Burn appears on bar 5 | Golden hour under the marquees. 1–4: token arcs and swinging bar signs (**zero threat**, shot tutorial). 5–8: snapped cues, first thrown bottles, **first lethal gap on bar 7** | 8 (5–8) |
| 2 | 9–16 ◆9 | 0:12 | **Verse 1a** | Neon dusk: fire escapes and rooftops toward the Jimperial. Gaps, cues, bottles from windows, mixed hop/shot, a bluffer on the bar-16 "HEY!". **Full marks** | 16 |
| 3 | 17–24 ◆17 | 0:23 | **Verse 1b.** The stomp tightens to every beat | **Reel 2, the Honky-Tonk.** **Slam Lifts** over the cellar shaft, bottles sliding down the bar, pendulum lamps over the lifts | 16 |
| 4 | 25–32 ◆25 | 0:35 | **Chorus 1** (template) | Brawl across the bar. **Bluffers** on the HEY beats (C2, C4), subtitle high route (C1–C4), a stop-time bluffer/lamp line (C5–C6), **Hup-Hup-HEY** (C7–C8, full marks). Hops between every shot; stools flying behind. Zoom out | 32 |
| 5 | 33–40 ◆33 | 0:47 | **Verse 2a.** Sparser, alley-reverbed mix. **Slide-guitar held notes**, 1–2 bars each (bars 33–34, 36–37, 39–40), over a bass sustain. **Full stop on bar 32 beat 4** before the Lanes | **Reel 3, the Blacklight Lanes.** **Slick Runs** on oiled lanes match those held notes; pinsetter bars to slide under; rolling balls to hop between runs | **Knee-slide (mode)** · 16 |
| 6 | 41–48 ◆41 | 0:59 | **Verse 2b: call/response.** The riff plays on a bell/chime timbre in bars 41, 43, 45, 47; **the lead riff is omitted in bars 42, 44, 46, 48** (ghost at −18 dB) | **Bumper Riff** at the giant pinball wall: hop fired balls in call bars, shoot bumpers in response bars. Bars 45–48: Little Jims mime you behind the arcade glass | 16 |
| 7 | 49–56 ◆49 | 1:10 | **Chorus 2**, alley reverb on the shouts. **Bar 56 beat 4: silence** | The lanes' brawl. **Little Jims** block on the HEY beats, plus bluffers, balls, short slides. Bar lines only | 32 |
| 8 | 57–64 ◆57 | 1:22 | **Stomp Break** *(added)*: floor-tom + cowbell + handclaps + gang "HEY"s, the Black Betty stomp. **Big accents left as ghosts in the base stem** at the player slots: 57–60 on beat 3 (+60 b1); 61 b2-3-4; 62 b3; 63 b2-3-4; 64 b1 | **Reel 4, the Pool Room.** **Bench Flips** onto jukeboxes (BOOM), bar bells (CLANG) and goons: singles (57–60), chains (61–64), with tables flipping and balls flying between benches | 16 |
| 9 | 65–72 ◆65 | 1:34 | **Build** *(added; the showdown, using verse-3 material)*. Tom roll doubles every 2 bars (quarters 65–66 → 8ths → 16ths → roll 71). Riff climbs, and the "HEY!" chant grows each bar. **A big hit on every downbeat.** **Bar 72: b1 HEY!, b2 HEY!, b3–b4 total silence** | **The Velvet Casino. The Rack** climb, chandeliers guttering, chip towers falling. Cigarette burns on 72 b1–b3; **break the head goon on 72 b4** (only your KRAK and "HEY!" are heard) | 28 |
| 10 | 73–80 ◆73 | 1:45 | **FINAL CHORUS, first half. THE DROP on 73 b1** *(the role-reversal chorus)*. Full power, harmony guitar. A letter lands on each downbeat. **Bars 79–80 are a 2-bar drum fill** replacing C7–C8's band | **Reel 5, the Roof: SIGN FALLS.** Sunset | 32 |
| 11 | 81–88 ◆81 | 1:57 | **Final chorus, second half.** **The biggest crash of the song on 81 b1** (frame slip). C7–C8 (87–88) Hup-Hup-HEY ×2. **Bar 88 b3–4: a big sustained chord + low "roar" swell** (Big Jim's bluff) | Frame-line lift → **climb the penthouse tower** (no marks). The throne reveal on 88 | 30 |
| 12 | 89–92 ◆89 | 2:09 | **Outro gauntlet.** Double-time energy: **"HEY!" on every beat** (89–90), then HUP-HUP-HEY ×2 (91–92) | **Reel 6, the Penthouse.** Fist-piston hops, a bluffer line, the chime riff reprise with no call (his chain), lens cracks. **The hardest 4 bars** | 20 |
| 13 | 93–94 | 2:15 | Band drops to **stomp + piano only**: a breath | Pull out to the theatre; sprocket hops on the film strip; the marquee swap | 8 (can't die) |
| 14 | 95–96 | 2:18 | **Full band.** 95: a hit on every beat (hook fragment). 96: **HUP (b1), HUP (b2), HEY! (b3) = FINAL HIT**, full chord, ring out ~4 s under an audience roar | **Iris Out** on Big Jim. Blades close on 95 b1–4 and 96 b1–2; shot-leap on 96 b3 | 7 (can't die) |

**Total:** 96 bars ≈ 2:20.5 of music at 164 BPM (≈ 2:26 with pickup and tail, ≈ 2:30 with the cold open), ~277
required actions, 11 checkpoints (one every 8 bars).

**How this remaps the song.** Original intro → verse → chorus → verse → chorus → verse → final (role-reversal) chorus
becomes: Intro · Verse 1 (extended to 16 bars) · Chorus 1 · Verse 2 (Lanes: held notes + call/response) · Chorus 2 ·
**Stomp Break** (added) + **Build** (verse-3 material) · Final chorus ×2 (Sign Falls drop, penthouse reveal) · **Outro**
(added: gauntlet, iris, final hit).

### Deliverables for the music producer
**Stems**, sample-aligned, same length:

| Stem | Contents |
|---|---|
| `base` | Stomp, drums, cowbell, bass, rhythm guitar, piano comping, fx. Includes the stomp-break ghost accents and the −18 dB ghost riff in bars 42/44/46/48 |
| `lead` | Fuzz lead, piano melody, slide sustains, call-bar chimes. **Empty in bars 42, 44, 46, 48** |
| `shouts` | All gang "HEY!/HUP!" plus the audience bed. The game scales its volume with the audience meter |
| `bonus` | Harmony lead guitar + extra piano/organ layer, **played through the whole song**. The game fades it in only during FULL HOUSE |

**One-shots** (pitched ones in the song's key/scale). **Voices:** Slim "HEY!" ×3, audience "HEY!" layer, "HUP!" ×2,
audience cheer/roar swells (3 tiers), "OOOH" (death), popcorn pops. **Player:** hop woodblock "tok" (2 pitches);
slide-guitar sustain per degree + release scrape; cue THWACK + ball crack; pendulum crack + chime per degree; pinball
chime per riff note; piano token ladder per degree. **World:** jukebox BOOM, brass bar-bell CLANG, bench thunk + creak,
lift rim-clack + slam, bluffer neck-crack + grunt + jab clack, bottle whistle + smash, ball rumble, glass-window crash,
unison CLACK, rack-break KRAK + slow-mo whoosh, neon-letter topple + tube pops. **Film:** projector clatter loop,
countdown-leader beep, cigarette-burn flare, frame-slip roll (81), the Burn sizzle loop, rewind chatter (respawn), iris
slam, film snap + flap-flap loop. **Big Jim:** bluff roar, fist slam, lens crack. Theatre cold-open ambience loop.

**`beatmap.json` lanes:** beats, bars, sections, key/scale; kick/stomp, snare/clap, cowbell; **shouts** (type + time);
**stops** (silence ranges); **sustains** (start, end, pitch: these become the Slick Runs); **riff notes** (time, pitch,
call/response flag: Bumper Riff); stomp-break player slots.

---

## 8. Fun risks (top 6) and how we test them

1. **Still boring** (the first build was "boring, no challenge, nothing going on"). **Test:** the density linter (§4 rule
   1) on every build, plus 5 fresh players rating each section "boring / fun / too much" and logging deaths per segment.
   **Pass:** linter green; deaths within the §4 rule 7 targets; no section rated "boring" by 2+ players. **Fix:** add
   required actions and moving threats to the flagged section before adding any new mechanic.
2. **Little Jims confuse at 164 BPM** (a one-bar canon is a planning puzzle in a sprint). **Test:** grey-box Chorus 2
   with 5 players. **Pass:** > 70% clear it by the 3rd attempt untold and say "they copy me". **Fallback:** Little Jims
   become harmless mirror dancers and Chorus 2 uses bluffers (our one rejection).
3. **Too hard / idea overload** (7 mechanics, 2 enemies, moving threats, 2 set-pieces and a boss at ≥ 1 action per beat).
   **Pass:** every player names hop/shot/slide; first clear within 20 deaths. **Cut order** (density stays, variety goes):
   Little Jim bait rule → bench chains → subtitle routes → bluffer feints; then Good ±150, stumble chain rule to 3 bars.
4. **The held run feels off-grid, or vertical sections break the grid** (mushy surge; the rack and climb trade runway
   for height). **Test:** per-bar grid-offset telemetry, runway per section. **Pass:** median |offset| < 0.1 beat, surge
   recovery ≤ 4 beats, runway ≥ 1.2 s. **Fix:** auto-run by default; flatter climb or more zoom-out.
5. **"Playing the song" doesn't land** (the hook must survive as an instrumental; synth shouts may sound cheap; a hop
   woodblock may grate; the audience/stem reward may be inaudible). **Test:** blind A/B with vs. without player SFX and
   stem scaling. **Pass:** ≥ 3/5 recognise the song in the first chorus, ≥ 4/5 prefer "with SFX". **Fix:** louder hook,
   real-voice shouts, hop → soft kick + whoosh.
6. **Busy screen kills readability** (brawls, debris and the film pass around a 144 px hero; tangerine vs. sunset;
   blacklight glare; **Big Jim filling the screen**). **Test:** greyscale + blur shots per section with the pass on;
   0.5 s freeze-frame quiz ("what hurts / what to hit"); 25% thumbnail of Slim. **Pass:** ≥ 90% correct. **Fix:** push
   brawlers further back (lower contrast), film pass "light" by default, thicker edges and rims (§3), darker velvet so
   only Big Jim's red knuckles and chrome lenses pop.
