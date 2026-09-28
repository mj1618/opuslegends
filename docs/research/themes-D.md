# Theme Pool D: twelve "cool" theme packages for the Jim level

**Why this exists.** The user rejected the crab-on-a-sea-coast theme: "we need something cooler, maybe something in line
with the song". This file offers 12 replacement **theme packages**. Each one keeps the gameplay skeleton in DESIGN.md
§4–§7 and reskins it. The target is **cool**: style, swagger, attitude, and a visual identity a teenager would screenshot.
**No lyrics are quoted anywhere.** The story is described only in outline: a feared bully, Big Jim, rules the pool hall and
the street. An underdog hustler rolls into town and takes him down, and afterwards the newcomer is the one nobody messes with.

**Method.** Following the pool rule (compile many, filter the bad, pick among the good), this pool was seeded from outside
sources so it doesn't drift to the mean (a generic 70s city). Every package names its sources. ~~Struck-through~~
packages are rejected, with a reason.

**Scores (1–5):** **Cool** (swagger, visual identity) · **Fit** (with the song's story and era) · **Fun** (how naturally
the mechanics read) · **Feas** (achievable with procedural Canvas 2D: shapes, gradients, glow, halftone, no hand-painted
sprites).

---

## 0. Sources, and what was taken from each

### Seed words
| Word | What I mined from it |
|---|---|
| **drank** | Busted neon with missing letters that spell accidental slang ("LAST DRANK"). Also the pool-hall bar, and a purple "drank" colour key |
| **livingless** | With no living: broke, no visible means of support. That's the hustler. Also *lifeless*: dead signs, ghost towns, things that come back to life |
| **shoreman** | Longshoremen, waterfronts, sailors' ports, the tattoo parlours near the docks, cargo hooks, cranes |
| **interpone** | To put something between. Layers placed in between (wheat-pasted posters, comic panels), and the underdog who steps between the bully and his victims |
| **slanginess** | Street talk as visuals: onomatopoeia you can stand on, dubbed-movie subtitles, trash talk as physical word-balloons |
| **figgy** | "In full fig" means dressed in full finery, so the hero's glad rags. The "fig" is an old insulting hand gesture. Fig purple `#5E2B4E` |

### Random Wikipedia (5 articles via Special:Random, each followed by one link)
| Random article | Followed link | Taken |
|---|---|---|
| Jean-Gaston Tremblay (self-proclaimed pope) | Apostles of Infinite Love (founder crowned himself after a claimed vision) | **The self-crowned king.** The underdog takes the crown and crowns himself. Used in JACK OF CLUBS and MAIN EVENT |
| Edward Strong the Younger (Wren's master mason) | St Anne's Limehouse (Hawksmoor church, one of the twelve built under the 1711 Act) | Masonry, keystones, pyramid finials on towers. Used for the vertical climbs (CUE-FU's pagoda, BANKED TRACK's arcades) |
| R. A. Hardie (missionary in Korea) | Wonsan (port city and naval base) | The port as a stage: cranes, hatches, cargo. Used in LONGSHORE |
| Henry Kathii (Bishop of Embu) | Bob Beak (bishop) | Mitres and croziers as silhouettes, i.e. a tall hat plus a hooked staff. This became the **hook-staff** strike (LONGSHORE's cargo hook, CUE-FU's cue staff) |
| Symmetry in biology | **Deimatic behaviour** (bluff threat displays, flashing eyespots) | **Big Jim is a bluff display.** The bully puffs up and flashes "eyes" but has no real defence. The feint-then-jab enemies become deimatic, flashing a scary display on the beat. Symmetry itself gave the double-headed face-card boss in JACK OF CLUBS |

### Met Museum
- **439802**: "ObjectID not found", and so were 439780–439830. The nearest live ID in a sweep was **439760, *View in the Colosseum***
  (unknown painter, oil on paper; tags: Arches, Ruins, Rome). Taken: the arena, the tiered crowd, arches as dominoes, and
  the Colosseum's retractable awning (velarium) as a finale that "folds shut". Used in BANKED TRACK.
- **Arbitrary rule: the song's numbers.** The ID is BPM×1000 (164000) or release year×100 (197200), stepping +1 until an
  object exists.
  - **164011: Ralph Rucci, *Dress*, silk and feathers, fall/winter 2007–8.** Taken: plumage as swagger, a coat that
    flares like a display (deimatic again). This became the hero's flaring coat/robe in MAIN EVENT and CUE-FU, and the
    rejected PEACOCK idea folded into others.
  - **197200: Edmé Samson, *Spring*, hard-paste porcelain figurine, 19th century.** The Samson firm was famous for its
    *reproductions* of other factories' porcelain: a hustle in china. Taken: fakes and cons, and a fragile shelf world
    toppling like dominoes. This gave CHINA SHOP (rejected, see #12).

### 1960
Pop art (Warhol's soup cans), Escher's *Ascending and Descending* (the endless stair), Tinguely's self-destroying *Homage
to New York* (a machine built to wreck itself), Nouveau réalisme (real objects as art), Korda's Che photo (the
two-tone icon portrait). *Psycho* and Saul Bass's cut-paper title bars, *The Flintstones* (limited animation), Cassius Clay's
Olympic gold, the Twist. Street style: greasers in Perfecto jackets and pompadours, early mods in slim Italian suits and
skinny ties. Taken: two-tone icon portraits (MAIN EVENT), Bass-style jagged cut-paper bars (JACK OF CLUBS), the Escher stair
(JACK OF CLUBS' climb), a self-wrecking machine (TILT's finale), the Clay-era boxing card (MAIN EVENT), and a greaser
pompadour hero silhouette (TILT).

### Two unusual sources (picked by RNG from a list of 15)
- **Boxing posters / Hatch Show Print** (Nashville letterpress since 1879: hand-set wood type, bold two-colour ink,
  split-fountain rainbow gradients; printed for circuses, wrestlers, the Opry, Elvis). This became MAIN EVENT, and its
  typography leaks into several others.
- **Pinball backglass art** (Roy Parker's ~290 Gottlieb backglasses, late 1930s to mid 1960s; bright reverse-painted glass,
  mixed perspectives funnelling the eye to a centre, score reels, TILT, match number). This became TILT.

---

## Mechanic skeleton (the rows every reskin table fills)
| # | Mechanic (DESIGN.md) |
|---|---|
| M1 | Run right on the beat (+ chaser behind) |
| M2 | Hop (tap/hold) |
| M3 | Strike (was "Claw") |
| M4 | Held slide/skim mode (sustain notes) |
| M5 | Pendulum targets struck on the beat (+ collectibles / "lums") |
| M6 | Platforms that slam down on the beat, lift offbeat |
| M7 | Enemies: friendly feint on the offbeat, jab on the beat |
| M8 | Hop-hop-STRIKE 3-hit phrase |
| M9 | Crowd/streak meter that joins in and raises the music |
| M10 | Riff call-and-response |
| M11 | Catapult see-saws onto percussive targets |
| M12 | Pile-up build, broken on the silent beat before the drop |
| M13 | Toppling-dominoes climax |
| M14 | Vertical climb |
| M15 | Boss: Big Jim as level geometry |
| M16 | Finale: the world folds shut on him |

---

## 1. THE BREAK — a pool hall the size of a city

**Pitch:** a thumb-high hustler runs the length of Big Jim's gigantic pool table, from felt to rails to pockets, and
wins the whole hall with one break shot on the silent beat.

**Hero: "Pocket."** A pool-shark kid the height of a cue ball. White tee, black waistcoat, a **chalk-blue** flat cap,
and a cue three times his height slung across his back like a samurai sword, so the silhouette is a small body plus a
long diagonal line. Chalk-blue hands leave blue prints on everything he strikes.
- **Signature strike, the Masse Jab:** a whip-fast cue thrust forward and up. On a Perfect it leaves a straight chalk
  streak and a *clack* with ball-spin sparks.
- **Why cool:** a tiny guy with a weapon longer than a car, in a world of glossy billiard balls the size of wrecking balls.
  Every hit has the most satisfying sound in the world, ball on ball.

**Big Jim:** the hall's owner, a **giant human** seen in pieces the way a mouse sees a man. There's a gold pinky ring,
a cigar ember like a sun, sunglasses reflecting the table, and a flame-pattern shirt. His **forearm lies across the table
as a bridge**, and his hand is a cue bridge (knuckles you climb). His cue is a building-length hazard that sweeps.
He is geometry: the level's second half is *on* him (forearm, shoulder, the brim of his hat).

**World:** "The Long Table," a 1972 pool hall at night. You run along an endless tournament table under a row of
cone-lit lamps. Behind it are the bar, the jukebox, a fogged window onto 42nd Street, and neon beer signs.
- **Palette:** felt `#0F6B3E` (lit centre `#1E9A5A`, vignette `#06331D`), mahogany rail `#5A2412`, chalk blue `#3FA9F5`,
  lamp light `#FFE9A8`, smoke `#8E8A7A` at 30% alpha, balls: yellow `#F7C21B`, blue `#1F4FBF`, red `#D7261E`, purple
  `#5B2A86`, orange `#F2711C`, maroon `#7A1F2B`, black `#111111`, cue-ball ivory `#F4F0E6`. **Danger = the black 8-ball
  with a hot-pink `#FF2E88` 8.** Reward = chalk-blue.
- **Parallax:** 0 night window, 42nd St marquees blurred (0.05) · 1 bar back-wall with bottles and the jukebox (0.2) ·
  2 hanging lamps in a receding row, cones of smoke-lit light (0.5) · 3 play: felt, rails, pockets, balls (1.0) ·
  4 foreground: Jim's cigar smoke and the edge of a spectator's hat (1.3).
- **Lighting arc:** a warm lamp-pool intro → brighter as lamps flick on per section → a smoky blue-green verse 2 (under the
  table: the "cave") → a red jukebox glow for the build → **every lamp on at the drop** → one lamp swinging at the outro.
- **The world performs the song:** kick = the rack balls jump on the felt · cowbell = the chalk cube tapping the cue tip ·
  snare/claps = balls clacking into each other in the background · hats = the ceiling-fan shadow chopping the lamp light ·
  bass = the lamps swinging · fuzz riff = balls rolling along the rail in sequence · piano = the jukebox's bubble tubes
  rising · "HEY!" = the barflies slapping the bar · crash = the triangle rack hitting the table.

| # | Reskin |
|---|---|
| M1 | Run the felt; **chaser: Jim's cue ball**, a rolling ivory moon behind you |
| M2 | Hop over balls, chalk cubes and pockets (the pits) |
| M3 | Masse Jab with the cue |
| M4 | **Rail-slide:** ride the cushion on your back, a squeaking sustain on held notes |
| M5 | **Lamp-chain pendulums** holding the chalk: strike on the beat for chalk dust and a coin shower. Collectibles are **chips** |
| M6 | **Jim's knuckle-rap**: his fingers drum the felt on the beat (slam), lift offbeat |
| M7 | **Sharks:** two-bit hustlers who offer a friendly handshake (offbeat, a bouncy platform) then jab a cue (beat) |
| M8 | Hop-hop-**SINK**: two ball hops, then a strike that pots the target ball ("HUP HUP HEY" becomes "rattle, rattle, DROP") |
| M9 | **The rail crowd:** barflies stand on the rail and bet on you. More crowd = more "HEY" voices + coins flipping in the air |
| M10 | **Jukebox call:** it plays the riff, and you answer by striking a row of balls that clack the same rhythm |
| M11 | **Cue see-saws:** land on a cue resting on a chalk cube to fling a ball into the spittoon (BOOM) or the brass bell (CLANG) |
| M12 | **The Rack:** Jim racks fifteen giant balls into a triangle during the build. **Break it on the silent beat** (the break shot) |
| M13 | The break sends balls ricocheting into **a row of standing cues like dominoes**, one per downbeat, across the hall |
| M14 | Climb **Jim's arm**: cuff button, elbow, shoulder, hat brim |
| M15 | Jim's arm/hand/hat are the platforms; his cue sweeps (the chaser's final form) |
| M16 | **The table's cloth folds** like a blanket over Jim, and he's sunk into the corner pocket with a final *thunk* |

**Finale:** Jim, shrunk by perspective, drops into the corner pocket; the felt folds over the table like a bedsheet and
the hall's lamps go out one by one, leaving Pocket spinning his cue in the last cone of light.

**Art direction:** glossy spheres as radial gradients with a hard specular dot plus a number disc; felt as a noise-dithered
green with a lamp-cone vignette; smoke as big low-alpha blobs; giant-Jim parts as flat colour blocks with a single rim
light. Zero outlines, everything lit.

**Scores:** Cool 4 · Fit **5** · Fun **5** · Feas **5**. *The safest strong pick: the break-on-the-silent-beat is the
best single mechanic-to-theme match in this file.*

---

## 2. TILT — you're inside the "BIG JIM" pinball machine

**Pitch:** a 1972 electromechanical pinball table called BIG JIM, where you are the hustler who beats the machine,
and on the last beat your initials replace JIM at the top of the high-score list.

**Hero: "Chrome."** A greaser kid with a **polished steel-ball head** (a hard white specular dot, reflecting the
playfield lights), a black leather jacket with an upturned collar, tight jeans, and white sneakers. Silhouette: a round
shiny head with a pompadour-shaped highlight, narrow legs. He leaves a streak of light as he runs.
- **Signature strike, the Flipper Kick:** a leg snaps up like a flipper (a hinged rigid bar, fast in, fast out). On a
  Perfect it sparks and rings a bell score reel ("+1000" rolls on the backglass).
- **Why cool:** pinball is sensory overload by design, with chrome, lights and bells, and every surface bounces. It
  feels like being inside a machine built to be loud.

**Big Jim:** painted on the **backglass** in Roy-Parker-style reverse-glass art: a huge grinning bruiser in a
fig-purple suit, holding a pool cue, with rows of lights for eyes. The backglass is the level's sky and horizon. In the
last act he **comes off the glass** as the table's giant mechanical toy (a moving plastic-and-steel figure, arms on
solenoids) rising at the top of the playfield. His arms are the slam platforms; his cue is the plunger.

**World:** the playfield, tilted 6.5° toward the camera. It's a panorama of lanes, posts, rubber slingshots, pop
bumpers, ramps and ball guides, with the cabinet's side rails as the world edge and the backglass as the sky.
- **Palette:** backglass black `#0B0B14`, playfield cream `#F3E6C4`, lit-insert red `#FF3B30`, amber `#FFB000`, green
  `#29D65B`, blue `#2E7BFF`, rubber white `#FAFAFA`, chrome `#C9D1D9`→`#5B6570` (gradient), Jim fig `#5E2B4E`.
  **Danger = the drain (black) + outlane red.** Reward = amber rollover lights.
- **Parallax:** 0 backglass with Jim's painted scene and lit score reels (0.03) · 1 upper playfield toys and ramps in
  soft focus (0.25) · 2 bumper field (0.6) · 3 play: lanes, posts and slingshots (1.0) · 4 glass reflections sliding by
  (1.2, very faint).
- **Lighting arc:** "attract mode" intro (lights chase idly) → each section lights a new *insert bank* → verse 2 dark
  under-playfield (lit from below through inserts, a "cave") → build: lights strobe in "MULTIBALL READY" chases
  (no full-screen flashes) → drop = **everything lit, multiball** → outro = "GAME OVER" dimming.
- **The world performs the song:** kick = pop bumpers *thump* and flash · cowbell = the knocker (the loud free-game
  bang) · snare = slingshot rubbers kicking · hats = rollover switches clicking in sequence · bass = score reels
  rolling · fuzz riff = light chases running around the table · piano = chime unit notes (EM tables had chimes!) ·
  "HEY!" = the backglass crowd lights flash · crash = the ball hitting the top arch.

| # | Reskin |
|---|---|
| M1 | Run the lanes. **Chaser: the drain**, a gaping black maw that gets closer if you fall behind |
| M2 | Hop posts, lane guides, bumper caps |
| M3 | Flipper Kick |
| M4 | **Wireform ride:** grind a chrome ramp wire on held notes (a shimmering pitched hum) |
| M5 | **Spinners** hanging from wireforms swing as pendulums. Kick on the beat to spin them (clack-clack-clack). Collectibles = **rollover lights** |
| M6 | **Drop targets and kickback posts** slam up and down on solenoids: down on the beat, up offbeat |
| M7 | **Slingshot goons:** painted-on-glass thugs that offer a rubber bumper to bounce on (offbeat), then kick it at you (beat) |
| M8 | Hop-hop-**FLIP** (two bumper bounces, then a flipper kick into the target: "SPECIAL WHEN LIT") |
| M9 | **Bonus multiplier** lights (2x…5x) + a backglass crowd that lights up. At max: **EXTRA BALL** mode, when the bonus stem comes in |
| M10 | **Chime call:** the chime unit plays the riff, and you answer by kicking a row of standup targets |
| M11 | **Saucer see-saws:** land on a hinged gate to launch a ball into the **knocker** or a **bell** |
| M12 | **Multiball lock:** balls pile into the lock during the build; kick the release on the silent beat → **MULTIBALL** drop |
| M13 | **Drop-target banks** fall like dominoes, one per downbeat, across the table |
| M14 | Climb the **plunger lane / upper playfield** wall of posts and ramps |
| M15 | The Big Jim toy: his arms and cue are geometry, and he **nudges the table** (the camera tilts) on stabs |
| M16 | **TILT.** Lights die, then the **backglass slides down over the playfield like a lid**, sealing Jim in. The score reels roll to your score and the high-score list shows your initials over JIM |

**Finale:** Tinguely-style: Jim's toy shakes the machine so hard it TILTs itself. The cabinet's glass lid closes, then
MATCH, and your initials top the list.

**Art direction:** everything is lit inserts. Draw them as rounded shapes with a radial glow and a hot centre; light
chases are a phase offset along a path. Chrome is a two-stop linear gradient plus a specular dot. Backglass Jim uses a
flat-colour paint style with thick black keylines and a halftone dot shadow.

**Scores:** Cool **5** · Fit 4 · Fun **5** · Feas 4. *The initials-over-JIM ending lands the song's name flip without a
single word.*

---

## 3. BONEYARD — the dead-neon graveyard relights for you

**Pitch:** a desert yard of dead neon signs outside a busted highway town. You're a small sign-figure made of light,
every on-beat move relights the graveyard, and the biggest dead sign of all is BIG JIM'S.

**Hero: "Spark."** A walking figure **made of one continuous neon tube** (cyan `#38F2FF`), bent into a hustler
shape: a pork-pie hat, a cue over the shoulder, and a cigarette ember at the lips. It's the old logo from a dead pool
hall's "8-BALL" sign, which pulled itself off the wall. Silhouette: a stick-figure line drawing with a hat and a glowing
aura, reading instantly at any size. When hit, he flickers out and back.
- **Signature strike, the Arc:** he lashes out with a whip of electric arc (a jittery line segment). What he hits
  **relights** in its own colour.
- **Why cool:** glowing tube art on a black desert night is the most screenshot-friendly look there is, and
  "livingless" things coming back to life is a great underdog arc.

**Big Jim:** the colossal rooftop sign **"BIG JIM'S"**, a 1950s roadside giant (a waving neon bruiser with an animated arm, like
a Las Vegas cowboy sign), lying dead and rusted across the back of the yard. As the level goes on, more of his tubes
relight, so he wakes as you do. His sections (hat, grin, waving arm, arrow pointing "POOL") are **huge hinged
panels on steel frames** that you climb and that swing. The pointing arrow is the boss's weapon.

**World:** a desert sign graveyard at dusk → night, with stacked letters, bent arrows, starbursts, broken motel names with
missing letters spelling accidental slang ("LAST DRANK", "EAT", "OTEL", "BAR B Q"), transformer boxes and humming power lines.
- **Palette:** night `#1B1033` → `#0A0614`, dusk horizon `#FF7A59` → `#6B2C5F`, rust `#8C4A2F`, dead tube grey
  `#6D6A75`, neon pink `#FF3EA5`, neon cyan `#38F2FF`, neon amber `#FFB23E`, neon green `#7CFF5B`, hot white core `#FFFFFF`.
  Hero = cyan. **Danger = sputtering red `#FF2A2A` tubes + exposed sparking wires.** Reward = amber bulbs.
- **Parallax:** 0 sky gradient, desert stars, distant highway (0.02) · 1 mesa silhouettes + a dead drive-in screen (0.1) ·
  2 far stacks of letters and sign skeletons (0.3) · 3 near sign piles and power poles (0.6) · 4 play (1.0) · 5 foreground
  dangling wires and tumbleweeds (1.3).
- **Lighting arc:** blue dusk, everything dead and rusty, only Spark lit → verse 1 relights a trail of bulbs behind you →
  chorus: whole signs pop on → verse 2 inside a dead sign's hollow steel belly (the "cave", lit only by you) → build:
  storm, dry lightning, flickering → **drop: the whole yard powers up at once** → outro: Jim's sign fully lit, then
  cut to black one tube at a time.
- **The world performs the song:** kick = transformers *thunk* and every lit tube brightens · cowbell = a loose
  sign-panel clanking on its chain · snare = sparks jump from broken wires · hats = bulb chasers ticking around arrows ·
  bass = the power-line hum pulsing · fuzz riff = a neon arrow animating its chase segments · piano = a starburst
  sign firing its rays one by one · "HEY!" = relit neon crowd figures (old sign mascots: waitresses, cowboys, bowling
  pins) throw their arms up · crash = a transformer blows (a spark fountain).

| # | Reskin |
|---|---|
| M1 | Run the sign-tops. **Chaser: the blackout**, a wall of darkness that swallows everything behind you |
| M2 | Hop letters and arrows |
| M3 | The Arc (relights what it hits) |
| M4 | **Power-line slide:** ride a humming wire on held notes, sparks off your feet (the sustain is the hum's pitch) |
| M5 | **Hanging bulbs on chains** swing as pendulums; arc them on the beat to light them. Collectibles = **loose bulbs** that pop on in the chord's notes |
| M6 | **Flip-letter panels:** big letters that drop flat on the beat, stand up offbeat |
| M7 | **Dead mascots:** a rusty sign-waitress offers a tray (offbeat, a bounce platform) then swings it (beat). Relit, she joins the crowd |
| M8 | Hop-hop-**ARC** onto a sign: it sputters, sputters, then **BLAZES** on |
| M9 | **The relit yard IS the meter.** More combo = more signs lit behind you, and each lit mascot adds a voice |
| M10 | **The arrow sign** chases the riff (on and off in rhythm), and you answer by arcing the bulbs in the same rhythm |
| M11 | **Sign-panel see-saws** launch you (or a bulb) into a **transformer** (BOOM) or an **oil drum** (CLANG) |
| M12 | **Scrap pile-up:** the storm piles the dead letters into a teetering tower that blocks the road. Arc the base on the silent beat, and the tower falls and everything lights at once |
| M13 | **Giant letters of a dead motel name topple like dominoes**, one per downbeat, each relighting as it lands |
| M14 | Climb the **steel lattice** of the BIG JIM'S sign |
| M15 | Jim's sign-body is the terrain; his waving arm is the sweeping chaser; his arrow stabs on stabs |
| M16 | **The sign folds:** his hinged panels close on each other like a flip-sign turning to **CLOSED**, with the neon going out, leaving one small cyan sign: Spark |

**Finale:** the last four bars power the sign off panel by panel and fold it shut, and the only thing lit in the desert is
Spark tipping his hat.

**Art direction:** neon is just two strokes, a thick low-alpha coloured stroke under a thin white core
(`shadowBlur` or additive stroking). Rust panels are flat shapes with noise speckle. The whole look is a black canvas plus
strokes, so it is the cheapest and most striking package to render.

**Scores:** Cool **5** · Fit 4 · Fun 4 · Feas **5**. *The meter-as-the-world-relighting is the clearest crowd feedback in
the pool.*

---

## 4. CUE-FU — 42nd Street kung-fu double feature

**Pitch:** the level is a scratched 1973 grindhouse kung-fu movie. A drifter with a pool cue fights up Big Jim's
five-storey pool-hall pagoda, one floor per act, while the audience cheers.

**Hero: "Kid Cue."** A skinny drifter in a **tangerine tracksuit with one white stripe**, black slippers, a headband whose
tails stream, and a pool cue used as a bo staff. Silhouette: a flying tail of headband plus a long staff, in a wide
fighting stance. Idle: bouncing on his toes, thumb flick to the nose.
- **Signature strike, the Cue Sweep:** a spinning staff strike with a crescent smear. Perfect = the frame freezes for
  3 frames with a **zoom-punch and speed lines**, like the movie's own slow-motion replay.
- **Why cool:** kung-fu cinema is cool in every decade, and a pool-cue staff ties it to the pool hall.

**Big Jim:** the pool-hall kingpin in a **fig-purple velvet suit and mirrored aviators** that reflect the hero's approach.
He has a gold chain and a huge frame, seated on a throne made of pool tables. His hall is **the Pagoda**, a 5-storey
tower (Hawksmoor's pyramid-topped towers crossed with *Game of Death*), where each floor is a room with its own master. He is
geometry at the top: his **giant sleeves drape down as the climb**, and his fists hammer the floor.

**World:** a film projected in a grindhouse. There's scratches, gate weave, reel-change "cigarette burn" dots (used as
beat markers!), and dubbed subtitles in yellow (slanginess: the trash talk appears as **subtitle bars you can stand on**).
Each act is a floor: the Street (42nd St, marquees), the Laundry (steam), the Kitchen (woks), the Pool Room, the Throne.
- **Palette:** faded film `#E9D8B4` highlights, film black `#1A1410`, tangerine `#FF8A1F` (hero only), jade `#2FA37A`,
  lacquer red `#B3201B`, gold `#E0B64A`, fig `#5E2B4E`, subtitle yellow `#FFE24A`, projector-beam haze `#F8F1DC` at 12%.
  **Danger = lacquer red weapon edges.** Reward = gold coins.
- **Parallax:** 0 the theatre itself, a silhouetted audience and the projector beam cutting across the top of the frame
  (fixed, a frame around the game) · 1 painted backdrop sky (0.05) · 2 rooftops/pagoda eaves (0.3) · 3 room interiors
  (0.6) · 4 play (1.0) · 5 hanging lanterns, steam (1.3).
- **Lighting arc:** golden-hour street → neon marquee night → steamy laundry (the "cave") → red kitchen fire (the build)
  → **the drop: a rooftop sunset duel** → throne room lit by a single skylight.
- **The world performs the song:** kick = the audience stomps (the frame shakes 1 px) · cowbell = a gong-tap ·
  snare = popcorn bursts over the audience silhouettes · hats = lanterns swaying on 8ths · bass = the film gate weaving
  in time · fuzz riff = fighters in the background doing kata in rhythm · piano = abacus beads flicking · "HEY!" = the
  audience yells and **dubbed "HAI!" subtitles** flash · crash = a reel-change burn dot.

| # | Reskin |
|---|---|
| M1 | Run the rooftops/rooms. **Chaser: the film burning** (the frame melts from the left) |
| M2 | Hop, with a scissor-kick tuck |
| M3 | Cue Sweep |
| M4 | **Cue vault-slide:** plant the cue and slide on held notes (a pitched squeal) |
| M5 | **Wooden training dummies on ropes** swing as pendulums; strike on the beat to crack them. Collectibles = **fortune coins** |
| M6 | **Stomping weight-presses / temple bells** that slam down on the beat, lift offbeat |
| M7 | **Bluff masters (deimatic):** thugs bow politely offbeat (their back is a platform), then flash a scary mask and jab on the beat |
| M8 | Hop-hop-**HAI!** (two leaps, then a sweep that sends the goon through a paper wall) |
| M9 | **The audience** (silhouettes at the bottom of the frame): more combo = more people standing and cheering, and popcorn flying |
| M10 | **Master's form:** a master demonstrates the riff (a sequence of strikes), and you repeat it on the next bar |
| M11 | **Bench see-saws:** stomp a bench end to flip a gong (BOOM) or a stack of woks (CLANG) |
| M12 | **Goon pile:** twenty thugs dogpile into a human pyramid. Strike it on the silent beat and everyone flies (in slow motion) |
| M13 | **Folding screens / lacquered pillars** fall like dominoes on each downbeat, collapsing the pagoda floor |
| M14 | The **pagoda climb** up the outside eaves, floor by floor |
| M15 | Jim on his throne: his sleeves are platforms, fists are slam-pistons, and his aviators reflect the stage (you see yourself coming) |
| M16 | **IRIS OUT.** The black iris closes on Jim, the film snaps and flaps on the reel, then "THE END", and a second iris opens on Kid Cue bowing |

**Finale:** the projector's iris closes tight around Jim's face like a vice while the audience goes wild; the film jams
and burns through, and the house lights come up.

**Art direction:** flat silhouettes and colour blocks with a film pass (grain noise, vertical scratch lines, slightly
warm tint, 1–2 px gate weave per beat, vignette). The subtitles are text. Smears and speed-lines are simple wedges.

**Scores:** Cool **5** · Fit 4 · Fun **5** · Feas 4. *The strongest "teenager thinks this is awesome" pick. Watch the
risk of looking like a known franchise (no yellow jumpsuit, no named martial artists).*

---

## 5. JACK OF CLUBS — a card sharp beats the King

**Pitch:** the level is a deck of cards dealt across a back-room table. You're the one-eyed Jack, a face card in
profile, and Big Jim is the double-headed King of Clubs.

**Hero: "One-Eyed Jack."** The face card come alive, **always in profile** (a side-scroller's natural silhouette; J♥ and
J♠ are the classic one-eyed jacks). He has a flat card-print body in red and gold robes, a feathered cap (figgy: in full
fig), a curly moustache, and his card border as a thin white outline. When he turns, he flips like a card (a 2D
horizontal scale to 0 and back).
- **Signature strike, the Flick:** throws a **playing card** that spins out ~2 m and snaps back like a yo-yo (a short
  range, with a sharp *thwip*). Perfect = the card sticks in the target like a knife.
- **Why cool:** card throwing is pure swagger, and a flat print character in a flat print world is a strong visual rule.

**Big Jim: the King of Clubs**, a colossal face card **mirror-symmetric head to foot** (symmetry in biology, the two
halves of a court card). His upper half stands on the table while his **upside-down twin half hangs from the ceiling**, so
the boss attacks from both floor and sky. He is a flat giant card, with his club as a mace and his crown as a platform.
The whole boss fight is on the surface of his card.

**World:** a smoky back-room card game drawn as Saul-Bass-style **cut paper**: jagged hand-cut rectangles, pips as
platforms, chip stacks as pillars, fuzzy dice hanging from the ceiling, and a spilled ashtray. Each act is a suit: Hearts
(intro) → Diamonds (verse 1) → Spades (the cave) → Clubs (Jim's court).
- **Palette:** card cream `#F4EBD6`, card red `#C8102E`, ink black `#14110F`, court gold `#E3B23C`, court blue `#2C4F9E`,
  felt `#0D4D3A`, smoke `#5A5550`, fig `#5E2B4E` for the back-of-card pattern. **Danger = black club/spade pips with
  gold edges.** Reward = red diamond pips.
- **Parallax:** 0 smoke and a hanging lamp (0.02) · 1 the players' giant silhouettes around the table: hats, cigars, hands
  (0.15) · 2 fanned hands of cards as a skyline (0.4) · 3 chip stacks and dice (0.7) · 4 play: cards, pips (1.0) · 5
  a hand sweeping chips across (1.3).
- **Lighting arc:** a single warm lamp → the deal (cards flip face-up as you arrive) → Spades act under the table
  (dark, lit by a lighter) → build: the pot grows, smoke thickens → **the drop: the lamp swings and everything is gold** →
  showdown: hard white.
- **The world performs the song:** kick = chip stacks thump down · cowbell = a ring tapping a glass · snare = a card riffle
  shuffle · hats = the dealer's cards snapping onto the felt · bass = the lamp swinging · fuzz riff = a card
  flourish (a card fan opening and closing) · piano = pips on the cards lighting in sequence · "HEY!" = the players slap
  the table · crash = the pot pushed all-in.

| # | Reskin |
|---|---|
| M1 | Run across dealt cards. **Chaser: the dealer's sweep** (a giant hand raking everything off the table) |
| M2 | Hop pips and chip stacks |
| M3 | The Flick (a thrown card) |
| M4 | **Card surf:** ride a sliding card across the felt on held notes (the sustain is a long "shhhh" riffle) |
| M5 | **Fuzzy dice on strings** swing as pendulums; flick them on the beat to roll a number. Collectibles = **chips** that pitch up the chord |
| M6 | **Chip stacks** that slam down on the beat, bounce up offbeat |
| M7 | **Bluffers** (the deuces and treys): cards that show a friendly face offbeat (a platform), then flip to show a spiked back on the beat |
| M8 | Hop-hop-**FLICK** = "call, call, RAISE" (a card sticks in the target) |
| M9 | **The pot:** chips pile up behind you as you play well; the other players lean in, bet on you, and join the "HEY"s |
| M10 | **The dealer's riffle:** the dealer riffles the riff, and you answer by flicking the cards in the same rhythm |
| M11 | **Card-lever see-saws:** land on a bent card to flick a chip into the **glass** (CLINK) or the **ashtray** (CLANG) |
| M12 | **House of cards:** Jim builds a card house during the build. Flick the base card on the silent beat |
| M13 | **The spread:** a whole ribbon-spread deck falls like dominoes, one card per 8th, across the table (a card flourish at the drop) |
| M14 | Climb an **Escher-style card tower** (1960's *Ascending and Descending*: the stair seems endless until the drop) |
| M15 | The King: two halves, floor and ceiling. His crown is a platform, and his club is the slam piston |
| M16 | **The deck squares up and the card box folds shut** on the King, then you (the Jack) are placed on top, **wearing the crown** (the self-crowned king) |

**Finale:** the deck gathers, the box flap tucks in, and the box turns to show a new face on the pack: the Jack, crowned.

**Art direction:** flat cut-paper shapes with slight jitter on the edges (rough polygon vertices), a paper noise texture,
and a hard drop shadow. The court cards are built from simple mirrored geometry (draw half, mirror).

**Scores:** Cool 4 · Fit 4 · Fun 4 · Feas **5**. *Most distinctive boss (the two-halves King). Risk: it reads "casino"
more than "street", which is fixable with the smoky back-room framing.*

---

## 6. FLASH SHEET — a traditional tattoo parlour on the waterfront

**Pitch:** the level runs across the flash sheets pinned on a dockside tattoo parlour wall, drawn in bold "Sailor Jerry"
tradition. The bully is a panther tattoo named JIM, and the hero is a swallow-inked sailor kid.

**Hero: "Swallow."** A young sailor in a **white Dixie-cup cap**, a striped shirt with rolled sleeves, and bell-bottoms,
with a swallow tattoo on each forearm. On a Perfect the tattoos **fly off his arms** as two little swallows. Silhouette: a
round cap, a triangle bell-bottom stance, and big hands.
- **Signature strike, the Anchor Swing:** swings a flash-style anchor on a chain (a thick black arc with a flat red
  highlight).
- **Why cool:** traditional tattoo art is a fully formed, extremely cool graphic language: thick lines, few colours,
  no gradients, attitude built in.

**Big Jim: the Panther.** A huge **crawling-panther tattoo**, the classic design that "crawls" up an arm, claws drawing red
drips, and a banner scroll reading **JIM**. He's a bluff display (deimatic): he puffs up and flashes huge eyes. As
geometry, **he crawls up a giant arm** that is the vertical climb, and his claws dig in as slam platforms.

**World:** a waterfront tattoo parlour at night. The walls are covered in flash sheets, and the level runs across them
sheet by sheet: an Anchors & Ships sheet, a Roses & Daggers sheet, a Snakes sheet (the "cave"), an Eagles sheet, a
Pin-ups & Dice sheet, and finally the arm. The window looks onto a port (shoreman).
- **Palette:** flash red `#D7261E`, flash green `#1E7B4A`, flash yellow `#F5C400`, flash blue `#1C4F8F`, ink black
  `#111111`, paper `#F2E6CC`, skin `#E8B48C`, shadow stipple `#111111`. **Danger = green snakes + red dagger tips.**
  Reward = yellow stars.
- **Parallax:** 0 night port, ship lights (0.05) · 1 parlour wall, framed flash, the neon "TATTOO" sign (0.2) · 2 the
  sheets' edges, pins and tape (0.5) · 3 play: motifs as platforms (1.0) · 4 the artist's hand and the machine buzzing
  across the foreground (1.3).
- **Lighting arc:** paper under a desk lamp → each sheet warmer → the snake sheet at black-light violet → build: the
  machine buzz gets frantic, red → **drop: the sheet under the lamp in full colour, with the red neon sign reflected** →
  outro: the lamp clicks off.
- **The world performs the song:** kick = the ink cups ripple · cowbell = a ship's bell out the window · snare = the
  artist stamps the stencil · hats = the tattoo machine buzzing 16ths · bass = ships' horns · fuzz riff = a snake
  motif slithering along the sheet in rhythm · piano = roses blooming petal by petal · "HEY!" = the sailors in
  the waiting chairs · crash = a flash sheet ripping loose.

| # | Reskin |
|---|---|
| M1 | Run across the motifs. **Chaser: the ink smear** (a wet black wave) |
| M2 | Hop daggers, dice, banner scrolls |
| M3 | Anchor Swing |
| M4 | **Banner slide:** ride a scroll banner on held notes (the banner writes out the sustain as a word) |
| M5 | **Swinging ship lanterns / hanging dice** as pendulums. Collectibles = **stars** (nautical stars) |
| M6 | **Stamping stencils**: the artist's rubber stamp slams down on the beat |
| M7 | **Pin-up girls and sailors** on the flash wink offbeat (a platform), then a hidden dagger flips out on the beat |
| M8 | Hop-hop-**ANCHOR** (a heart-and-dagger target: "MOM" gets inked in the banner) |
| M9 | **The waiting sailors** join in. More combo = more of them singing, and your arms fill up with inked tattoos (visible progress!) |
| M10 | **The machine calls:** the tattoo machine buzzes the riff, and you answer by striking a row of stars |
| M11 | **Anchor see-saws** launch a bottle into a ship's bell (CLANG) or a rum barrel (BOOM) |
| M12 | **The snake coil:** a giant snake tattoo coils tighter during the build. Strike its head on the silent beat |
| M13 | **Pinned flash sheets** fall off the wall like dominoes, one per downbeat, revealing new ones |
| M14 | Climb **the giant arm** the panther crawls up (wrist, elbow, shoulder) |
| M15 | The Panther: his crawling claws are slam platforms, his banner is a bridge, and the blood drips are hazards |
| M16 | **The flash book closes** (a folding portfolio slams), trapping the panther. The last image is Swallow's arm, with a new banner reading NOBODY'S |

**Finale:** the sheet folds in half, then in half again, into a tiny square, and the artist slips it into his pocket.

**Art direction:** closed paths with a 6–8 px black stroke and flat fills; shading by **stippled dots** (a dither of
tiny circles with density per gradient); a few preset motifs built from primitives (anchor, star, dagger, rose, swallow
as simple bezier shapes).

**Scores:** Cool **5** · Fit 3 · Fun 4 · Feas 4. *The strongest graphic rule-set here; the song link (a waterfront
bully) is looser than the pool-hall packages.*

---

## 7. LONGSHORE — the night docks, and Big Jim runs the cranes

**Pitch:** 1974, a container port at night. A new dockhand with a cargo hook runs the stacks, and the boss who runs the
waterfront turns out to be the crane.

**Hero: "Hook."** A dockhand in a **navy peacoat, knit watch cap, and work boots**, with a steel cargo hook (like the
bishop's crozier: tall hat + hooked staff). Silhouette: a stubby cap, broad coat, one long hook.
- **Signature strike, the Hook Rip:** a rising hook swing that hooks targets and yanks them. On a Perfect it throws
  sparks off steel.
- **Why cool:** industrial scale and sodium light. The container port is a giant's Lego set and a great toppling set piece.

**Big Jim:** the waterfront boss who drives the **giant gantry crane**, painted with his name. In the last act, the crane
**stands up like a walking giant** (the gantry legs become legs, the boom becomes an arm, the cab with Jim in it is the
head). His spreader bar is his fist.

**World:** a port at night (Wonsan-like), with stacked containers, straddle carriers, a hull wall, mooring bollards, and
fog.
- **Palette:** night sea `#081826`, fog `#34495E` at 40%, sodium orange `#FF9A1F`, container blue `#3F7FBF`, rust red
  `#A63A24`, teal `#1F8C84`, hazard yellow `#F2C200` (stripes), steel `#7F8C8D`. **Danger = hazard stripes.**
  Reward = sodium light.
- **Parallax, lighting, instruments:** ships' lights and the crane silhouette row (0.1) · container stacks (0.4) ·
  play (1.0) · hanging chains (1.3). Lighting: sodium orange, with a ship-hold dark verse 2 and a sunrise drop. Kick = a
  container dropped, cowbell = a chain on a bollard, hats = the forklift reversing beep, bass = the ship horn, riff = the
  spreader's lights chasing, "HEY!" = the dock crew.

| # | Reskin |
|---|---|
| M1 | Run the container tops. **Chaser: a straddle carrier** |
| M2 | Hop container gaps |
| M3 | Hook Rip |
| M4 | **Cable slide:** hook onto a crane cable and ride it on held notes |
| M5 | **Cargo nets swinging from cranes** as pendulums. Collectibles = **tally tags** |
| M6 | **Pallets on crane cables** that drop on the beat and lift offbeat |
| M7 | **Goons** in hard hats offer a hand up (offbeat), then swing a wrench (beat) |
| M8 | Hop-hop-**HOOK** |
| M9 | **The dock crew** downs tools and joins you; more crew = more voices + the port lights up |
| M10 | **The ship's horn calls** the riff, and you answer by striking bollards |
| M11 | **Plank see-saws** fling crates into the **bell** / **oil drums** |
| M12 | **Container pile-up:** the crane stacks containers into a tower. Hook the base on the silent beat |
| M13 | **Container stacks topple like dominoes** down the quay, one per downbeat |
| M14 | Climb the **crane leg** |
| M15 | The crane-giant Jim: boom arm, legs, cab |
| M16 | **The ship's folding hatch covers** close over the hold with Jim in it (hydraulic folding covers are real) |

**Art direction:** flat rectangles with rust noise; sodium light as a big radial gradient per lamp; fog as layered
translucent bands.

**Scores:** Cool 3 · Fit 3 · Fun 4 · Feas **5**. *Solid dominoes, but it risks "industrial grey" and the pool-hall
story is missing. A middling pick.*

---

## 8. FOUR-COLOR — a 1972 comic book you can punch through

**Pitch:** the level is a bronze-age comic book. You run panel to panel, stand on the sound effects, and the book
literally closes on Big Jim at the end.

**Hero: "Kid Hustle."** A street hero-for-hire in a **denim jacket with a gold star on the back**, a big afro,
bell-bottoms, gold sneakers, and a cue case over his shoulder. Silhouette: a round afro plus flare legs, readable at
40 px. His speed lines are drawn on.
- **Signature strike, the Panel Buster:** a punch that spawns a **KRAK!** onomatopoeia shape (a jagged burst with block
  letters), which stays for 1 beat **as a platform**.
- **Why cool:** comic art is bold, the onomatopoeia is interactive (slanginess you can stand on), and the book closing
  is a built-in "world folds shut".

**Big Jim:** a **double-page-spread villain** in a white suit, fedora and cigar, drawn across two pages. As geometry,
his **splash-page body is the level's last two pages**: his hat brim is a ledge, his tie a ladder, his fist a slam piston.
His **trash-talk balloons** fall on you as solid blocks.

**World:** the comic book as a set. Panels are rooms, gutters are pits, and each act is a page. The pages are interposed:
the camera finds the next panel through the one you're in.
- **Palette:** CMYK: cyan `#00A3E0`, magenta `#E0218A`, yellow `#FFD100`, black `#1A1A1A`, newsprint `#F3E9D2`, with
  misregistration offsets of 2 px. **Danger = magenta-red with jagged edges.** Reward = yellow stars.
- **Layers:** 0 the book's spine and page curl (fixed) · 1 background panels as the skyline (0.2) · 2 the current page (1.0)
  · 3 panel borders and speech balloons (1.0) · 4 page-turn foreground (1.3).
- **Lighting arc:** colour saturation increases per page; night panels in blue duotone; the drop is a full-colour splash.
- **Instruments:** kick = a "THOOM" sound-effect prints, cowbell = a "TONK" balloon, hats = Ben-Day dots pulsing, bass =
  panel borders flexing, riff = speed lines chasing, "HEY!" = crowd balloons, crash = the page turning.

| # | Reskin |
|---|---|
| M1 | Run panel to panel. **Chaser: the page turning** behind you |
| M2 | Hop panel borders and gutters |
| M3 | Panel Buster (makes platforms) |
| M4 | **Speed-line slide** on held notes |
| M5 | **Swinging signs / hanging balloons** as pendulums. Collectibles = **stars** |
| M6 | **Sound-effect blocks** (BAM! BAM!) that stamp down on the beat |
| M7 | **Henchmen** offer a friendly "HEY PAL" balloon (offbeat, a platform), then swing on the beat |
| M8 | Hop-hop-**KRAK!** |
| M9 | **Bystanders** in the panels cheer, their balloons stacking up |
| M10 | **The villain's balloon** says the riff (a rhythm of glyphs), and you answer by punching them in the same rhythm |
| M11 | **See-saws** fling henchmen into trash cans (CLANG) and a mailbox (BOOM) |
| M12 | **Trash-talk pile-up:** Jim's balloons stack into a wall. Punch it on the silent beat |
| M13 | **Panels fall like dominoes**, one per downbeat |
| M14 | Climb a tall vertical **splash panel** |
| M15 | Jim's splash-page body |
| M16 | **The comic book closes.** The back cover shows your hero |

**Art direction:** Ben-Day halftone (tiled circles in a clip path), heavy ink outlines, flat CMYK fills, misregistration.

**Scores:** Cool 4 · Fit 4 · Fun 4 · Feas 4. *Very buildable, and the platform-making strike is a genuinely new
mechanic. Risk: comic-book levels are a familiar trope (Comix Zone).*

---

## 9. MAIN EVENT — the letterpress fight card

**Pitch:** the level is a 1960 Nashville letterpress fight poster being printed. You're the undercard nobody in small
type, climbing the billing to the headliner's slot, and the press closes on Big Jim to print YOUR name.

**Hero: "Kid Nobody."** A bantamweight in a **satin robe with a hood** that flares like plumage when he strikes (the
Rucci feather dress), taped fists, and high-top boxing boots. Silhouette: a hooded robe with flared tails. His name on the
poster is misspelt and tiny at the start.
- **Signature strike, the Jab-Cross:** a two-frame punch. Perfect = the punch prints a burst of **wood-type stars** on
  the poster.
- **Why cool:** boxing posters are bold, the letterpress look is tactile and loud, and climbing the billing is a clear
  underdog story in typography.

**Big Jim:** the heavyweight champ, printed as a **huge two-tone woodcut portrait** (red and black, like the 1960 icon
portrait of Che). He's shirtless with a title belt and a sneer. As geometry, **his portrait is the top half of the
poster**: his shoulders are ledges and his belt is a bridge.

**World:** a poster on the press bed; wood-type letters as platforms (a 20-ft "VS."). Behind, 42nd Street's wheat-pasted
walls, layered and torn, are interposed.
- **Palette:** newsprint `#EFE4C9`, press red `#E0452B`, press black `#1A1A1A`, gold `#D9A441`, **split-fountain rainbow**
  `#E0452B`→`#F2C12E`→`#2E86C1` (the letterpress two-ink blend: a natural gradient). **Danger = solid black type with
  sharp serifs.** Reward = gold stars.
- **Layers:** 0 the pressroom (0.05) · 1 wheatpaste walls (0.3) · 2 the poster (1.0) · 3 the press's inking rollers (1.3).
- **Lighting arc:** dim ink-room → poster edges light up → a darker verse-2 "under the press" → **drop: a fresh
  poster in split-fountain colour** → final: a single bulb.
- **Instruments:** kick = the platen press closing, cowbell = the ring bell, snare = the type locking up, hats = the
  ink rollers, bass = the crowd rumble, riff = letters stamping in sequence, "HEY!" = the fight crowd, crash = the bell.

| # | Reskin |
|---|---|
| M1 | Run across the poster's lines of type. **Chaser: the ink roller** |
| M2 | Hop wood-type letters |
| M3 | Jab-Cross |
| M4 | **Ink slide:** slide through a wet ink stripe on held notes |
| M5 | **Speed bags** as pendulums (hit on the beat). Collectibles = **wood-type stars** |
| M6 | **Wood-type blocks** stamped by the press, down on the beat |
| M7 | **Sparring partners** offer a glove bump (offbeat), then jab (beat) |
| M8 | Hop-hop-**CROSS** (the "one-two-THREE" combination) |
| M9 | **The fight crowd.** Your name gets bigger on the poster as the combo grows (the billing climbs!) |
| M10 | **The trainer's mitts** call the riff, and you answer by punching them |
| M11 | **See-saws** flip a medicine ball into the **ring bell** (DING) or a **bucket** (CLANG) |
| M12 | **The type lock-up:** the build locks letters into a wall. Punch the key on the silent beat |
| M13 | **Letters of the headline** topple like dominoes, one per downbeat |
| M14 | Climb **the billing**, undercard to headliner |
| M15 | Jim's woodcut portrait |
| M16 | **The clamshell platen press closes** on Jim, and reopens printing the poster with YOUR name headlining |

**Art direction:** flat two-colour shapes, ink texture noise, slight misregistration, wood-type block letters, a
split-fountain linear gradient.

**Scores:** Cool 4 · Fit **5** · Fun 4 · Feas **5**. *The press-closing finale is the most literal "folds shut" plus
name-flip in the pool.*

---

## 10. BANKED TRACK — roller derby in a ruined colosseum

**Pitch:** 1975, a roller-derby league plays in a ruined colosseum. The new jammer laps the champion's pack, and Big Jim is
the arena.

**Hero: "Jammer."** A skater with a **star helmet cover** (the jammer's star), knee pads, striped socks, and roller
skates with glowing wheels. Silhouette: a round helmet with a star, a low crouched stance, a speed trail.
- **Signature strike, the Hip Check:** a shoulder/hip slam with a rolling smear.
- **Why cool:** speed, skates, 70s derby jerseys, and a ruined arena.

**Big Jim:** the league's champion blocker, huge, in a **jersey number 1**. As geometry, **the arena is his**: the
banked track wraps around him, and in the finale he stands up out of the arena floor.

**World:** a ruined colosseum with banked track, arches, crowd tiers, and floodlights.
- **Palette:** stone `#C8B79A`, shadow `#6E5E4B`, track maple `#D49A5A`, floodlight white `#FFF6E0`, jersey red
  `#D23A2B`, jersey teal `#1BA8A0`, star gold `#F7C21B`. **Danger = the blockers' red.** Reward = gold stars.
- **Layers:** 0 night sky and floodlights (0.02) · 1 crowd tiers (0.2) · 2 arches (0.5) · 3 play: track (1.0) ·
  4 railing (1.3).
- **Lighting arc:** moonlit ruin, where only the track is lit → floodlight banks switch on section by section → verse 2
  in the undercroft tunnels (the "cave", lit by torches and wheel glow) → build: a red warning-light sweep → **drop: every
  floodlight at once, plus a dust haze** → outro: the awning's shadow creeps over the track.
- **Instruments:** kick = the crowd stomps, cowbell = the whistle, hats = wheels clicking on seams, riff = the pack
  moving in formation, "HEY!" = the crowd, crash = a floodlight bank switching on.

| # | Reskin |
|---|---|
| M1 | Skate the track. **Chaser: the pack** |
| M2 | Hop fallen skaters and gaps |
| M3 | Hip Check |
| M4 | **Crouch-skate** on held notes (a wheel hum) |
| M5 | **Swinging floodlights** as pendulums. Collectibles = **points** |
| M6 | **Arena gates** that drop on the beat |
| M7 | **Blockers** offer a whip (a friendly hand, offbeat), then block (beat) |
| M8 | Hop-hop-**CHECK** |
| M9 | **The crowd** in the tiers rises |
| M10 | **The whistle calls** the riff, and you answer |
| M11 | **See-saw ramps** launch into a **drum** / **bell** |
| M12 | **The pile-up:** a pack pile-up in the turn. Break it on the silent beat |
| M13 | **The arches topple** like dominoes (the Met *View in the Colosseum*) |
| M14 | Climb the **crowd tiers** |
| M15 | Jim is the arena |
| M16 | **The velarium (the retractable awning) folds shut** over the arena |

**Finale:** the canvas velarium sails fold in over the arena one wedge per beat, closing like a fan on Jim standing in
the centre. The last shaft of light falls on the Jammer's star.

**Art direction:** stone as flat blocks with noise, floodlight cones, crowd as tiny rects.

**Scores:** Cool **5** · Fit 3 · Fun **5** · Feas 4. *Great speed and a strong silhouette; the pool hall story isn't there.*

---

## ~~11. HOPPERS — lowrider cruise night~~ (rejected)

**Pitch:** a cruise night on the boulevard where every car hops on hydraulics to the beat: slam-down platforms are the
cars themselves.

**Hero:** a kid on a lowrider bicycle (chrome springs, twisted-spoke wheels). **Big Jim:** a monster car. **World:**
boulevard, murals, sunset. **Finale:** the garage door rolls down.

| # | Reskin |
|---|---|
| M6 | Hydraulic cars, down on the beat, up offbeat (the best M6 in the pool) |
| M1–M5, M7–M16 | Cars and car culture; see the rejection note |

**Scores:** Cool **5** · Fit 2 · Fun 3 · Feas 4.
**Rejected because:** lowrider culture is a specific Chicano cultural tradition that would be borrowed for a Jim Croce
story it has no link to, there is no pool-hall hook, and a hero on foot among cars makes most mechanics awkward. Keep
**hydraulic hop-platforms** as a mechanic idea for any other theme.

---

## ~~12. CHINA SHOP — the porcelain forger~~ (rejected)

**Pitch:** a knock-off porcelain figurine (a Samson copy) hustles its way along the shelves of a collectors' shop, and Big
Jim is a giant porcelain bull.

**Scores:** Cool 2 · Fit 3 · Fun 4 · Feas 4.
**Rejected because:** it fails the user's "cool" test (it reads grandma's cabinet, not swagger). Keep **shelves of
plates toppling like dominoes** as a set-piece idea.

---

## Summary table

| # | Package | Cool | Fit | Fun | Feas |
|---|---|---|---|---|---|
| 1 | THE BREAK (city-sized pool table) | 4 | 5 | 5 | 5 |
| 2 | TILT (BIG JIM pinball) | 5 | 4 | 5 | 4 |
| 3 | BONEYARD (neon graveyard) | 5 | 4 | 4 | 5 |
| 4 | CUE-FU (kung-fu grindhouse) | 5 | 4 | 5 | 4 |
| 5 | JACK OF CLUBS (card sharp) | 4 | 4 | 4 | 5 |
| 6 | FLASH SHEET (tattoo flash) | 5 | 3 | 4 | 4 |
| 7 | LONGSHORE (docks) | 3 | 3 | 4 | 5 |
| 8 | FOUR-COLOR (comic book) | 4 | 4 | 4 | 4 |
| 9 | MAIN EVENT (letterpress fight card) | 4 | 5 | 4 | 5 |
| 10 | BANKED TRACK (derby colosseum) | 5 | 3 | 5 | 4 |
| ~~11~~ | ~~HOPPERS~~ | 5 | 2 | 3 | 4 |
| ~~12~~ | ~~CHINA SHOP~~ | 2 | 3 | 4 | 4 |

**Top of the pool (sum ≥ 18):** THE BREAK (19), TILT (18), BONEYARD (18), CUE-FU (18), MAIN EVENT (18). Per the
CLAUDE.md rule, pick randomly among these. **Hybrids worth considering:** BONEYARD's relighting-as-meter works in any
package, and THE BREAK's rack-break on the silent beat can transplant into TILT or CUE-FU.
