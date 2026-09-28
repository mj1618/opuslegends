# Theme Pool E: 12 "cooler" theme packages for "You Don't Mess Around with Jim"

The user rejected the crab-on-a-sea-coast theme: *"we need something cooler, maybe something in line with the song"*.
This pool gives 12 complete **theme packages**. Each one reskins the same gameplay skeleton (DESIGN.md §4–§7). Some
are literal (pool hall, 42nd Street, felt, neon) and some are bold reinterpretations (myth, cosmos, title sequence,
embroidered jacket). Each still tells the song's story: a feared bully owns the hall and the street, an underdog
rolls into town and beats him, and afterwards everyone says the new guy is the one you don't mess with.

**No lyrics appear here.** We describe only the story and the arrangement (164 BPM stomp-boogie shuffle: floor-tom +
cowbell stomp, fuzz rhythm guitar, bass, honky-tonk piano, organ, lead + harmony guitar, slide sustains, bell riff
lane, gang "HEY!" shouts, crowd, risers).

**Scores** (1–5): **Cool** = style, swagger and trailer appeal · **Fit** = echoes the song and its story ·
**Fun** = how well it serves the mechanics · **Feas** = can it be done with procedural Canvas 2D.
~~Struck-through~~ packages are rejected, with the reason given.

**Overlap note.** `themes-D.md` (written in parallel) already covers a city-sized pool hall, 42nd-Street kung-fu, a
card sharp and a pinball machine. I dropped my own kung-fu, card-deck and jukebox drafts to keep the pools
different (they're folded into §13). Where a package here shares ground with D (#1 RACK 'EM), its twist is spelled out.

---

## 0. Sources, and what was taken from each

### Seed words
| Word | Meaning | What I took from it |
|---|---|---|
| **archfelon** | a chief criminal | Big Jim's billing as the ARCHFELON: wanted posters, credits and marquee names (#2, #3, #4) |
| **fluvial** | of rivers | the Alabama River tall tale, raft skims and a real log jam (#8); gravity "rivers" of stars (#7) |
| **coleseed** | rapeseed or cabbage seed; brassica fields | rapeseed-yellow `#F6D32D` fields (#8); "Old King Cole", the merry old tyrant king, feeds the Jim-as-King motifs |
| **sextary** | a Roman liquid measure, about a pint | pint glasses and beer taps as tuned targets; wine kraters and the Cyclops's wine (#6) |
| **unbarrable** | cannot be barred out | roll-down security shutters that can't keep the hero out (#2); music *bars* as literal cell bars; "the kid they couldn't bar" |
| **unvisible** | invisible | blacklight UV, where only fluorescent things exist (#2); Odysseus's "Nobody" trick (#6); the paper-thin edge-on hero (§13) |

### Random Wikipedia (5 articles via Special:Random, each followed by one link)
| Random article | Link followed | What I took |
|---|---|---|
| Labatt Brewing Company | **1976 Philadelphia Flyers–Red Army game** | The "Broad Street Bullies" were a 1970s team famous for intimidation. In that game the visitors **walked off the ice** in protest, and the commentator kept shouting that they were going home. Taken: Jim's goons **walk off in a huff** when your crowd meter maxes; a rough 70s gang name; intimidation as a visual language |
| Astou Ndour-Fall (Spanish-Senegalese center, WNBA) | **Center (basketball)** | The ~7-ft "big man" who guards the paint; the hook shot, the shot-block, and the **"Dream Shake" fake-and-spin**. Taken: #10 BLACKTOP; the feint-then-jab enemy is literally a shake-fake |
| S6 (para-swimming classification) | **Para swimming classification** | Functional classes let very different bodies compete fairly. Taken: an underdog built for skill, not size. The hero's smallness is a *class*, and the carnival booth's weight-class banners in #9 ("FEATHERWEIGHT vs. HEAVYWEIGHT") |
| List of awards received by g.o.d | **g.o.d** (K-pop group) | "Groove Over Dose", "the nation's group", the first idol group to hold 100 concerts. Taken: the crowd meter as a *nation* joining in; the max-meter mode name **"GROOVE OVER"** (without the overdose); stadium-scale crowd payoff |
| Julia Borgström (Swedish cyclist) | **Criterium** | A closed street circuit of short laps. The crowd sees you pass again and again, and a **bell announces the "prime"** (a cash lap). Taken: the cowbell as a prime bell (#9 and #10); laps of the same block where the crowd grows each pass (#2) |

### Met Museum
- **Object 305265** returns "ObjectID not found". So do 305260–305300. The nearest real IDs, from the full object
  list, are **305829–305832**. I used **305829**: Duchenne de Boulogne, *Mécanisme de la physionomie humaine*
  (1854–56, albumen prints). Electrodes on a man's face trigger the "passions" one muscle at a time.
  **Taken:** Big Jim's face as a machine of expressions. Each hit forces a new expression (sneer, doubt, fear), which
  is a readable boss "health bar" with no bar (#3, #9). 305832 (*Napoli Tarantella* photomontage, ca. 1870: dancing,
  guitars) gave the idea of a crowd dancing in cut-out montage (#3).
- **Arbitrary rule: the object ID nearest to the year 1964** → **1963**, *Chandelier*, American, 20th c., cut blown
  glass. **Taken:** crystal pendants as pendulum targets that ring pitched notes (#4, #1); glass that shatters on the drop.
- **Arbitrary rule: the object ID nearest to BPM × 1000 (164000)** → **163998**, *Walking stick*, American or
  European, early 20th c., metal, wood and synthetic (Costume Institute). **Taken:** #2's hero carries a silver-tipped
  swagger cane, and the strike is a cane-snap.

### The year 1964
The Beatles on Ed Sullivan (73 million viewers, screaming crowds); the Ford Mustang launch; **Cassius Clay beats the
feared Sonny Liston**, the defining underdog-beats-the-bully upset of the decade (#9's whole premise); the **Whisky a Go
Go** opens with go-go dancers in cages (#2); the **New York World's Fair**, Unisphere and space-age pavilions (#7);
**Mods vs Rockers** seaside riots in Brighton, with parkas, scooters covered in mirrors, RAF roundels and leather
(#12); the Tokyo Olympics; *Mary Poppins*, *My Fair Lady*, *Bewitched*.

### Two unusual sources
- **Saul Bass title sequences**: white-on-black cut-paper (the arm in *The Man with the Golden Arm*), bars and type
  racing up a building (*North by Northwest*), split, jittering bars (*Psycho*), and stark silhouettes in two or three
  flat colours. **Taken:** #3 wholesale, and the letterbox-bar finale.
- **Sukajan jackets**: satin souvenir jackets made by Japanese craftspeople for US servicemen near Yokosuka, embroidered
  with tigers, dragons, eagles, koi, Mt Fuji and maps. They were often **reversible**, and later became the uniform
  of rebellious working-class youth. **Taken:** #5. The jacket turning inside out is the song's role reversal.

---

## Mechanic skeleton (the rows every reskin table fills)

| # | Mechanic (DESIGN.md) |
|---|---|
| R1 | Run right on the beat (the beat grid made visible) |
| R2 | Hop (tap/hold variable jump) |
| R3 | Strike (was "claw"; up-forward arc) |
| R4 | Held slide/skim mode (hold = held note, passes low ceilings) |
| R5 | Pendulum targets struck at the bottom of the swing, on the beat |
| R6 | Platforms that slam down on the beat and lift on the offbeat |
| R7 | Enemy that feints (friendly/bouncy on the offbeat) then jabs on the beat |
| R8 | Hop-hop-STRIKE 3-hit phrase (∪ ∪ –, "HUP! HUP! HEY!") |
| R9 | Crowd/streak meter that joins in and makes the music louder |
| R10 | Riff call-and-response (the world plays the call; you play the response) |
| R11 | Catapult see-saws; payload hits percussive targets 1 beat later (BOOM / CLANG) |
| R12 | Pile-up build, broken on the silent beat before the drop |
| R13 | Toppling-dominoes climax |
| R14 | Vertical climb |
| R15 | Boss: Big Jim as level geometry |
| R16 | Collectibles ("lums") and chaser |

---

## 1. RACK 'EM: the Hall of Jim *(literal)*

**Pitch.** One long, neon-lit pool hall from the street door to Big Jim's private back table. The rails are the road,
the drop is the break shot, and your name climbs the chalkboard until it's above his.

*Twist on D's "THE BREAK":* this hall is a single room at human scale, not a city. The beat grid is the **diamond
sights on the table rails**, the crowd meter is the **challenge chalkboard**, and the finale is the **rack closing**.

### Hero: "Chalk"
- **Look:** a wiry teen hustler in an oversized newsboy cap, a too-big leather car coat with the sleeves shoved up,
  and **chalk-blue hands** (`#3FA9F5`, sacred: his only colour). A two-piece cue case is slung across his back like a
  rifle.
- **Silhouette (reads at 60 px):** a cap wedge on top and the **long diagonal line of the cue**. It's a slash
  through a small body, like a samurai's sword. Nothing else in the hall draws a clean diagonal.
- **Signature strike, "the Break":** a no-look cue thrust, up-forward, with a **puff of blue chalk** and a hard
  *clack*. On a Perfect he doesn't even turn his head.
- **Why it's cool:** the no-look shot is pure swagger, the cue reads as a blade, and blue chalk smoke is his visual
  signature. You can follow him through any crowd by the blue.

### Big Jim
- **Look:** a mountain in a pinstripe vest, gold rings on every knuckle, a toothpick, a slicked widow's peak and a
  custom ivory cue. He owns the hall and his name is at the top of the chalkboard in letters a foot high.
- **As geometry:** all level long his **shadow** falls across the back wall, huge, cast by the lamp over his table.
  In the boss he **leans over his own table**: his forearm is a sloped bridge, his **"bridge hand"** (fingers splayed on
  the felt) is a set of five finger-pillars, his ivory cue is a 40-beat diagonal ramp, and his rings are pendulum
  targets hanging off a gold chain.

### World
- **Setting:** street door → front tables → the bar → back tables → the stairs → Jim's mezzanine back room.
- **Palette:** felt `#0F6B3A` / deep felt `#083D22`, lamp-cone amber `#FFC857`, haze `#2A2530`, mahogany `#5A2A1B`,
  brass `#C89B3C`, neon red `#FF3B3B`; ball colours yellow `#F5C518`, blue `#1F4FBF`, red `#D7263D`, purple `#5B2A86`,
  orange `#F46036`, green `#1B998B`, maroon `#7A1C2B`, eight-ball `#111111`. **Sacred:** hero chalk blue `#3FA9F5`,
  danger = cue tips chalked red `#FF3B3B`.
- **Parallax:** 0 tin ceiling, ceiling fans, haze · 1 back wall: neon beer-style signs (no brands), cue racks, **the
  challenge chalkboard** · 2 other tables with silhouetted players under lamp cones · 3 play: table rails, felt,
  bar top, stools · 4 foreground: rail-birds' shoulders and hats, a drifting haze curl.
- **Lighting arc:** late-afternoon dust shafts through venetian blinds → neon evening → last call, only lamp cones lit
  → **the drop: every lamp swings at once**, light strobing across the room → the finale: one lamp over Jim's table.
- **The hall performs the song:**

| Instrument | Visual |
|---|---|
| Floor-tom stomp | A rack breaks on a background table and balls scatter |
| Cowbell | The bell over the street door |
| Snare / claps | Balls drop into pockets on the other tables; rail-birds slap the rail |
| Hats | Ceiling-fan blades tick and cue tips twist in chalk |
| Bass | The hanging lamps sway on the bass line |
| Fuzz riff | The neon signs buzz and flicker on the riff's accents |
| Honky-tonk piano | An upright in the corner, its hammers visible through the open front |
| Organ | The neon glow swells |
| Gang "HEY!" | The rail-birds, cue butts stamped on the floor |
| Crash | A ball jumps the table and bounces across the floor |

### Reskin
| # | In RACK 'EM |
|---|---|
| R1 | Run the rails. **Diamond sights inlaid every beat** = the grid; a bar line is a pocket |
| R2 | Hop balls, pockets and stools |
| R3 | The Break (cue thrust) |
| R4 | **Slide the felt**: belly-slide down a table's length under the low lamp shades; the felt's chalk streak is the note |
| R5 | **Swinging billiard lamps** (green glass shades) ring a pitched *tink* when struck at the bottom |
| R6 | **Giant triangle racks** slam onto the felt on the beat (solid) and lift on the offbeat |
| R7 | **Rail-birds**, Jim's cue men. Offbeat: they offer a bridge hand, a bouncy step up. On the beat: a **Dream-Shake** fake and a cue-butt jab |
| R8 | **Two-rail bank**: hop off cushion, hop off cushion, BREAK into the pocket, and the room roars |
| R9 | **The challenge chalkboard**: your chalk name climbs a rung per on-beat action, and the rail-birds drift to your side of the room. At max ("GROOVE OVER"), Jim's goons **walk off in a huff**. Shouts stem up |
| R10 | A lieutenant runs a rack at the back table (**call**: each ball sinks on a riff note). The same balls roll along your rail (**response**): strike each on its note to sink it |
| R11 | **Cue see-saws** balanced on a ball. Land on the butt and the cue ball flies 1 beat later into a **beer keg** (BOOM) or the **brass cash-register bell** (CLANG) |
| R12 | Jim's men build **the Big Rack**, a pyramid of giant balls barring the back room, one row per bar. Break it on the silent beat. **The drop IS the break shot** |
| R13 | Fifteen giant balls carom through the hall, knocking over tables and cue racks **one per bar**; run on the rolling balls |
| R14 | Up the **cue rack and the chalkboard** to the mezzanine; chalk rungs are the ledges |
| R15 | Jim leaning over his table: forearm bridge, finger pillars that slam in the Rack pattern, the cue-ramp, and the eight-ball in his fist |
| R16 | **Chalk cubes** trace the ideal path, playing a piano ladder. Chaser: **the Closing Crew**, stacking chairs on the tables behind you and killing the lights |

**Finale (the world folds shut):** Jim is sunk. You call the shot, the whole hall **tilts like a table**, the walls
fold inward as the rails of a giant **triangle rack**, and the rack snaps shut around Jim on 96 b3. The one lamp over
his table clicks off. Only the hero's blue chalk glow remains, and his name is alone at the top of the board.

**Art direction:** flat felt fields under radial-gradient lamp cones (heavy vignette); balls as circles with a
two-stop specular highlight and a number disc; neon via `shadowBlur` on stroked paths; haze as a few large, slow,
soft sprites; wood grain as noise stripes cached once.

**Scores:** Cool 4 · Fit 5 · Fun 4 · Feas 5

---

## 2. THE DEUCE: 42nd Street under blacklight *(literal 70s)*

**Pitch.** 42nd Street, 1974, 3 a.m., painted as a **blacklight grindhouse poster**. Marquees, chaser bulbs,
fluorescent paint, and a lean hustler with a silver cane who walks this block like he owns it. Soon he does.

### Hero: "Dime"
- **Look:** tall and lean in a **white three-piece suit with wide lapels**, a wide-brim hat with a single feather, and
  a **silver-tipped walking stick** (Met 163998). Under blacklight, only his suit, hat band, cane and grin are
  visible, glowing UV violet-white. The rest of him is *unvisible*.
- **Silhouette:** a hat triangle, long vertical lines and the cane at an angle. It reads as a glowing ghost at 60 px.
- **Signature strike, "Cane Snap":** a twirl-and-flick of the cane with a **UV arc** trailing the tip. On a Perfect he
  catches his hat on the cane afterwards.
- **Why it's cool:** a glowing-white silhouette strutting through black and neon is the most trailer-ready image in
  this pool. The strut is the run animation.

### Big Jim
- **Look:** kingpin of the Deuce. Floor-length fur coat, mirrored aviator shades, a mouthful of gold, rings.
- **As geometry:** his name is the marquee. **"BIG JIM" in 20-ft chaser-bulb letters** on top of the Grand Palace
  grindhouse, visible all level. In the boss he **bursts through the movie screen** as a 10-screen-tall projected
  figure. His fur collar is a ledge climb, his **mirrored shades reflect the hero** (the reflection is where you'll
  land next beat), and his gold-ringed fists slam the marquee.

### World
- **Setting:** subway exit → the block (arcades, grindhouses, pinball parlours, a pool hall upstairs) → the rain →
  the Grand Palace marquee → the roof and billboards.
- **Palette:** ink `#0B0614`, UV violet `#7B2FF7`, fluoro pink `#FF2BD6`, day-glo orange `#FF7A00`, acid yellow
  `#E8FF3A`, UV cyan `#00F0FF`, marquee bulb `#FFD27A`, sodium street `#FF9F1C`, wet asphalt `#1B1830`.
  **Sacred:** hero UV white `#F4EEFF`; danger = acid yellow blades and switch-tips.
- **Parallax:** 0 skyline with **Jim's face on a billboard** · 1 marquees with chaser bulbs · 2 storefronts, go-go
  cages in club windows (Whisky a Go Go, 1964), arcade windows · 3 play: sidewalk, cab roofs, newsstands, marquee
  tops · 4 foreground: subway-grate steam, fire-escape slats.
- **Lighting arc:** sodium-orange dusk → **full blacklight midnight** (only fluorescent paint exists) → 4 a.m. rain, every
  sign doubled in puddles → **the drop: every marquee on the block fires at once** → finale: grey dawn as the neon
  dies, leaving only the hero's glow.
- **The block performs the song:** floor-tom = a subway train passing under the gratings (steam jets up) · cowbell =
  a three-card-monte dealer's bell · snare = go-go dancers kick in their cages · hats = the marquees' chaser bulbs run
  8ths · bass = the neon tubes pulse · fuzz riff = neon lettering **re-draws itself** stroke by stroke · piano =
  pinball machines lighting up in the arcade window · organ = the rain's colour wash · "HEY!" = the sidewalk crowd ·
  crash = a press photographer's flashbulb.

### Reskin
| # | In THE DEUCE |
|---|---|
| R1 | Strut down the sidewalk. **Chaser bulbs** along the marquee edges tick the beats; the bar line is a kerb |
| R2 | Hop cab roofs, hydrants and newsstands |
| R3 | Cane Snap |
| R4 | **Puddle slide**: skid on a rain slick under **roll-down shutters stuck at knee height** (*unbarrable*). The neon reflection strip in the puddle is the held note |
| R5 | Neon "POOL" and "HOTEL" signs swinging on chains; mirror balls in the club doorways |
| R6 | **Marquee letters** slam into their slots on the beat (solid) and lift on the offbeat. The marquee spells words as you cross it |
| R7 | **Monte sharps**: offbeat they fan the cards (a bouncy card-table platform); on the beat they flick a razor-edged card |
| R8 | **Walk-walk-WINK**: two cab-roof hops, then the cane snap knocks the goon's hat off |
| R9 | **The block follows you**: the crowd becomes a parade behind you, and each lap of the block (criterium laps) it's bigger. At max, every marquee changes to **"NOW PLAYING: THE NEW GUY"** |
| R10 | The **pinball window**: the machine plays the riff with bumper flashes (call); giant bumpers in your path (response) |
| R11 | A plank on a **fire hydrant**. Payload: a pinball or a hubcap into a **trash-can lid** (CLANG) or a **subway grate** (BOOM) |
| R12 | **Gridlock**: cabs pile up at the intersection, one layer of honking cabs per bar. Snap the cane on the traffic light on the silent beat. It turns **green** and the drop is the traffic surge |
| R13 | **Marquees topple down the block** like dominoes, one per bar, bulbs popping in cascades |
| R14 | Fire escapes up the Grand Palace facade to the billboard |
| R15 | Jim through the movie screen: fur-collar ledges, mirrored-shade platforms, fists slamming the marquee |
| R16 | **Silver dimes** trace the path. Chaser: **the vice squad's searchlight**, a white beam sweeping from behind |

**Finale:** every storefront on the block drops its **steel roll-down shutter**, one per beat on 95 b1–4 and 96 b1–2.
You hop each as it drops, and on the final HEY the **Grand Palace's shutter slams down on Big Jim**, locking him inside
his own theatre. The marquee above rearranges its letters one last time to show the new guy's name.

**Art direction:** a black base with **additive** fluorescent strokes (`globalCompositeOperation = 'lighter'`); chaser
bulbs are dot arrays driven by the beat; puddle reflections are the sign layer flipped with a low-alpha gradient
mask; results screen as a halftone grindhouse poster.

**Scores:** Cool 5 · Fit 5 · Fun 4 · Feas 4

---

## 3. MAIN TITLE: a Saul Bass opening-credits sequence *(stylistic reinterpretation)*

**Pitch.** The whole level is the **opening credits of a 1970s crime film called *BIG JIM***, in jagged cut paper and
kinetic type. You're the little white paper figure who cuts his way through the credits until they're about you.

### Hero: "and introducing..."
- **Look:** a flat **cut-paper figure**, white with slightly rough scissor edges, angular limbs, and **one red
  accent**: a long scarf that trails horizontally. He carries a paper cue.
- **Silhouette:** sharp angles and the red scarf-stripe. On a two- or three-colour screen he's always the white thing.
- **Signature strike, "the Cut":** a cue slash that **cuts the frame**. A clean diagonal slit opens across the target
  and the two halves slide apart. Enemies aren't knocked back, they are *edited out*.
- **Why it's cool:** every hit is a design moment. The whole level looks like a famous title sequence, and each
  screenshot is a poster.

### Big Jim
- **Look:** a **giant black cut-paper arm** reaching into frame (the *Golden Arm* nod), a fist full of rings, and his
  name in 400-px condensed type: **THE ARCHFELON: BIG JIM**. His face, when shown, is a mosaic of paper shapes that
  **re-arranges between expressions**, like Duchenne's electrified faces (sneer → doubt → fear).
- **As geometry:** the letters of **B-I-G J-I-M** are platforms and walls. His arm is a ramp, his fist the slam
  platform, and his face mosaic in the boss is a climbable wall of shapes that shifts on each strike.

### World
- **Setting:** a series of credit cards: *Starring* → *Music by* → *Photographed by* → *Edited by* → *Produced by* →
  *Directed by*. Each section is a title card with its own two- or three-colour palette and a motif (city grid,
  pool-ball circles, cues as bars, a skyline).
- **Palette per card:** 1 orange `#F26B1D` + black `#111111` + cream `#F3E9D2` · 2 red `#D62828` + black + white · 3
  teal `#1B6F7A` + mustard `#E9B44C` · 4 violet `#4B2E83` + pink `#F28AB2` · 5 green `#2F6B3B` + gold `#E8C547`
  (the felt card) · finale black + white + one red. **Sacred:** the hero is always white `#FFFFFF` with a red scarf;
  danger is always pure black jagged shapes.
- **Parallax:** three stacked paper planes with soft drop shadows (so it reads as physical paper under a rostrum
  camera), kinetic bars sliding across, and a 12 fps "boil" jitter on the edges.
- **Lighting arc:** a palette arc instead of light. Warm cards → cold cards → the build squeezes to black-and-red →
  **the drop inverts the frame** (white paper, black ink) → the finale goes black.
- **The credits perform the song:** floor-tom = **black bars slam into frame** · cowbell = a red dot punches in ·
  snare = a letter snaps into place · hats = dashes scroll past · bass = shapes stretch and squash · fuzz riff =
  **jagged Psycho-style bars** stripe across the screen on each riff note · piano = paper confetti squares · organ =
  a slow colour dissolve between card palettes · "HEY!" = **a crew credit slams in** (a name per shout) · crash = the
  frame shatters into shards.

### Reskin
| # | In MAIN TITLE |
|---|---|
| R1 | Run along **credit bars** that tick in one per beat |
| R2 | Hop gaps between words |
| R3 | The Cut |
| R4 | **Ride a kinetic bar**: crouch on a type-bar sliding under a wall of text. The bar's length = the note |
| R5 | **Paper circles on threads** (pool balls reduced to discs) swing like a Calder mobile |
| R6 | **Letters drop** into the credit line on the beat and lift on the offbeat |
| R7 | **Arrow men**: paper silhouettes whose bodies are arrows. Offbeat: the arrow points away (a bounce step); on the beat it swings round and stabs |
| R8 | hop-hop-**CUT**: the third hit slices the line of text and a credit falls out |
| R9 | **The cast list grows**: each on-beat action adds a name to the scrolling crew credits behind you. Bigger crew = louder shouts. At max, the credits change from *Big Jim's* crew to *yours* |
| R10 | Jim's arm **draws jagged lines** across the frame (call); the same lines cross your path (response). Cut each on its note |
| R11 | A paper see-saw flings a circle into a **black square** (BOOM) or a **red triangle** (CLANG) |
| R12 | The title **B I G  J I M** assembles itself into a wall, one letter per bar. Cut it on the silent beat and the title shatters. The drop is the frame inverting |
| R13 | **Title cards topple** like dominoes, each slapping flat to reveal the next palette |
| R14 | Credits **race up the skyscraper grid** (*North by Northwest*); you climb the gridlines |
| R15 | The giant arm and the shifting face mosaic |
| R16 | **Red dots** trace the path (they become the full stops in the final credits). Chaser: the **black iris** closing in from the left |

**Finale:** the **letterbox bars close**. Black bars slide in from top and bottom on each beat (95 b1–4, 96 b1–2) and
you hop the shrinking band between them. On the final HEY they **slam shut on Big Jim**, leaving one line of white text:
the film's title, re-set in your name. Then THE END.

**Art direction:** 100% flat fills and hard edges, `Path2D` shapes with a small per-frame vertex jitter at 12 fps,
paper drop shadows via an offset dark copy, no gradients except the paper grain. The cheapest package here with the
strongest look.

**Scores:** Cool 5 · Fit 4 · Fun 4 · Feas 5

---

## 4. STRANGER IN TOWN: a spaghetti-western showdown *(genre reinterpretation)*

**Pitch.** The song as a **Leone-style western**. Big Jim runs the saloon, the billiard table and the whole town. A
stranger rides in at noon, and by sundown the town knows his name. Extreme close-ups, widescreen dust, and a pool
cue where the six-gun should be.

### Hero: "the Stranger"
- **Look:** a short, slight drifter in a **long dust-coloured duster**, flat-brimmed hat low over the eyes, poncho
  optional, a thin cheroot. He carries a **cue in a rifle scabbard**.
- **Silhouette:** a hat brim, a flaring duster (it flares on every hop) and the cue across the back. A pure western
  silhouette, readable at any size against a sunset.
- **Signature strike, "the Draw":** a quick-draw of the cue from the scabbard into a thrust, with a ricochet *ping*.
  On a Perfect the camera does a **2-frame snap-zoom to his eyes**.
- **Why it's cool:** the most iconic underdog-rolls-into-town imagery in cinema; the snap-zooms are hitstop with style.

### Big Jim
- **Look:** a huge rancher-boss with a silver-conchoed vest, a ten-gallon hat, a thick moustache, spurs like saw
  blades, and a **gold-plated ivory cue**.
- **As geometry:** in the boss he's shot in **extreme close-up**, as Leone would. His face fills the frame, and you
  run across the **brim of his hat**, hop his moustache and climb his gun belt. His two giant hands slam down on the
  saloon table in the slam/lift pattern.

### World
- **Setting:** the desert road → the town's main street → the saloon (the pool table) → the livery and water tower →
  the rail yard → the showdown in the street at sundown.
- **Palette:** noon sky `#F2C14E` → sunset orange `#E4572E` → blood dusk `#7B1E1E`; adobe `#C98B5B`, dust
  `#E8D2A6`, weathered wood `#6B4A2F`, shadow ink `#2A1A12`, saloon felt `#2F5E3A`, brass `#C9A227`. **Sacred:**
  hero duster-silhouette **black** with a turquoise hat band `#1FB5A8`; danger = silver spur and conch glints `#E6E6E6`
  with red.
- **Parallax:** 0 enormous sun and sky gradient · 1 mesas · 2 the town's false-front buildings · 3 play: boardwalks,
  rooftops, the rail line · 4 foreground: tumbleweeds, a hitching rail, extreme-close-up props (a spur, a bottle)
  sliding past.
- **Lighting arc:** white noon (hard short shadows) → golden afternoon → saloon interior (dark, oil-lamp amber) →
  red sunset build → **the drop: the sun touches the horizon and everything goes silhouette** → dusk showdown.
- **The town performs the song:** floor-tom = the **blacksmith's hammer** and horse hooves · cowbell = the church bell,
  or a triangle on the chuck-wagon · snare = batwing saloon doors · hats = spurs jingling · bass = the windmill
  turning · fuzz riff = a steam train's whistle, the **train's pistons chugging the riff** · honky-tonk piano = the
  saloon piano (literal) · organ = heat shimmer · "HEY!" = the townsfolk on the boardwalks · crash = a stick of
  dynamite in the mine.

### Reskin
| # | In STRANGER IN TOWN |
|---|---|
| R1 | Run the boardwalks; **hitching posts** one per beat; bar lines are shadows of telegraph poles |
| R2 | Hop barrels and water troughs |
| R3 | The Draw |
| R4 | **Slide the bar**: slide along the saloon bar like a thrown shot glass, under the hanging lanterns. Later, slide down the **mine-cart rail** |
| R5 | **Hanging oil lamps** in the saloon; bells on the church; the **saloon sign** swinging on its chains |
| R6 | **Batwing-door flats** and **train-car roofs** that slam and rise with the pistons |
| R7 | **Jim's gunhands**: offbeat, a tip of the hat (the brim is a bounce platform); on the beat, a pistol-whip jab |
| R8 | hop-hop-**DRAW**, a Leone triple-cut: close-up, close-up, extreme close-up on the strike |
| R9 | **The town comes out**: shutters open, townsfolk step onto balconies and the brass band on the bandstand joins in. Max: a church-bell peal and a "GROOVE OVER" gallop. Jim's gunhands **walk out of town** |
| R10 | The **saloon pianist plays the riff** (call); the piano's keys become the floor over the bar (response) |
| R11 | A plank on a barrel flings a whiskey jug into **the church bell** (CLANG) or a **powder keg** (BOOM) |
| R12 | Jim's men **barricade the street** with wagons, bales and barrels, one layer per bar. The silent beat is the **showdown silence before the draw** (the genre's most famous pause). You draw on the silence |
| R13 | The **false-front buildings fall** like stage flats, one per bar, down the main street |
| R14 | Up the **water tower** and the mine's headframe |
| R15 | Jim in extreme close-up: hat brim, moustache, gun belt; the hands slam the table |
| R16 | **Silver dollars** trace the path. Chaser: **a dust storm** rolling in behind |

**Finale:** the **iris closes**. A classic western iris-out shrinks the frame ring by ring on each beat; you hop the
ring edges, and on the final HEY the iris **snaps shut on Big Jim**. The wanted poster flips to show the Stranger's
face and the reward crossed out.

**Art direction:** huge gradient skies, everything else flat silhouette (very cheap and very striking), dust as
particles, snap-zooms via camera scale, film-grain overlay. Letterbox widescreen bars all level.

**Scores:** Cool 5 · Fit 3 (the underdog story fits perfectly; the setting is the West rather than a 70s street) · Fun 4 · Feas 5

---

## 5. REVERSIBLE: the sukajan *(bold reinterpretation)*

**Pitch.** The level is embroidered on the back of a **satin souvenir jacket**. You're the little stitched tiger from
the chest patch, Big Jim is the dragon coiled across the whole back, and at the end **the jacket turns inside out**.

### Hero: "Patch"
- **Look:** a small bipedal **embroidered tiger** in orange and gold thread, stitch direction visible (satin-stitch
  stripes), black thread outline, big stitched paws, a bomber-jacket swagger.
- **Silhouette:** stripes, big paws and a lashing tail. He looks like a patch that came alive and hopped off the chest.
- **Signature strike, "Tiger Swipe":** an up-forward paw swipe that leaves **three glinting gold thread trails**. On
  a Perfect the trails stitch themselves into the fabric and stay as part of the picture.
- **Why it's cool:** satin sheen plus embroidery is a unique, tactile look, and the reversal is the song's ending made
  literal.

### Big Jim
- **Look:** the **dragon** embroidered across the entire back panel: silver and crimson scales, a gold pearl in one
  claw (the eight-ball: a black pearl with a stitched "8"), whiskers of silver thread.
- **As geometry:** his coils are the terrain. You run along his body all level, not knowing it (the "Rock is Big Jim"
  reveal done as fabric). His head sits at the collar. The boss is the collar area: his claws slam, his whiskers
  whip, and his scales are ledges.

### World
- **Setting:** the jacket: chest patch (the start) → the sleeve (Mt Fuji and cherry-blossom embroidery) → the back
  panel (the dragon's domain, with eagles, koi, a stitched map) → the ribbed waistband → the zipper → the collar.
- **Palette:** satin black `#121016`, satin emerald `#0E6B52`, satin crimson `#9E1B32`, gold thread `#E7B84A`, silver
  thread `#CFD6DE`, tiger orange `#F28C28`, rib stripes cream `#EFE6D2` / red `#B3122E` / black. **Reversed side:**
  sky blue satin `#5AA9E6` and cream. **Sacred:** tiger orange is the hero only; danger = silver-thread claw tips on
  crimson.
- **Parallax:** 0 satin base with a **moving sheen band** (a wide soft highlight that slides as the camera moves,
  like light on real satin) · 1 background embroidery motifs (Fuji, blossoms, koi, a stitched map of the Deuce) ·
  2 larger embroidered pieces · 3 play: the stitched path and the dragon's body · 4 foreground: loose threads and
  needle glints.
- **Lighting arc:** the sheen band sweeps across the satin once per bar; black satin (night) → red satin (build) →
  **the drop tears a seam** and the lining shows through → **the reversed blue side** for the finale.
- **The jacket performs the song:** floor-tom = the fabric **thumps** (quilted ripple from the impact point) · cowbell =
  snap buttons pop · snare = a **needle punch** (a new stitch appears) · hats = running-stitch dashes · bass = the
  satin sheen ripples · fuzz riff = the **embroidery machine stitches the riff line** across the back · piano =
  sequins glint · organ = the sheen colour shift · "HEY!" = the little stitched patches (eagles, koi, a skull, a
  rose) all shout · crash = a thread snaps and whips.

### Reskin
| # | In REVERSIBLE |
|---|---|
| R1 | Run along a **stitched path**; each stitch is an 8th, a cross-stitch is the beat |
| R2 | Hop the dragon's coils and embroidered clouds |
| R3 | Tiger Swipe |
| R4 | **Satin glide**: slide along a glossy satin panel (frictionless, the sheen band travels with you) under the dragon's belly |
| R5 | **Zipper pulls and tassels** swinging from the pockets |
| R6 | **Ribbed cuffs and waistband**: the ribs pleat up (solid) on the beat and flatten on the offbeat |
| R7 | **Stitched eagles and cranes**: offbeat they spread their wings (a bouncy step); on the beat they dive and peck |
| R8 | stitch-stitch-**SNAP**: the final swipe snaps a thread and unpicks the enemy |
| R9 | **Patches**: each on-beat action pins a new patch to your side of the jacket (a crowd of patches). At max, the jacket's sleeves **fill with your patches** |
| R10 | The dragon's **scales light up in the riff pattern** (call); you strike the same scales on your path (response) |
| R11 | A **toggle button** on its loop as a see-saw, flinging a sequin into a **brass snap** (CLANG) or the **quilted padding** (BOOM) |
| R12 | The fabric **bunches into pleats**, a fold per bar, as if a hand is crumpling the jacket. Swipe the tight thread on the silent beat; the drop is the fabric springing flat and **the seam tearing open** |
| R13 | Embroidered pagodas and Fuji peaks **unpick and topple** one per bar |
| R14 | Up the **zipper teeth** like a ladder |
| R15 | The dragon at the collar: coils, claws and whiskers |
| R16 | **Sequins** trace the path. Chaser: a **seam ripper** unpicking the stitches behind you |

**Finale:** the jacket **turns inside out**. The reversible side flips over in panels on each beat (95 b1–4, 96 b1–2)
and you hop from panel to panel as each turns. On the final HEY the **zipper zips shut on the dragon**, trapping him
inside. On the new outside, the tiger is embroidered huge across the whole back, and the dragon is a tiny patch on
the sleeve.

**Art direction:** satin as linear gradients with a moving highlight band; embroidery as hatched strokes (many short
parallel lines clipped to shapes), **rendered once to offscreen canvases** and reused; stitched outlines as dashed
strokes. Heavier than the others, so the cache is essential. Treat the postwar souvenir-craft origin as homage, not
costume.

**Scores:** Cool 5 · Fit 3 (a perfect role-reversal ending; no pool hall unless we stitch one in) · Fun 4 · Feas 3

---

## 6. ONE-EYED JIM: black-figure myth *(mythic reinterpretation)*

**Pitch.** The song told as a **Greek myth painted on a vase**. Big Jim is a Cyclops who rules the cave where
everyone drinks, gambles and plays; a small trickster rolls in, calls himself Nobody, and takes the giant down. The
Cyclops's one eye is an **eight-ball**.

### Hero: "Nobody"
- **Look:** a **black-figure** silhouette (black glaze on terracotta) of a small, quick hero: a crested helmet, a round
  shield slung behind, a **spear-length cue**, and incised white lines for detail.
- **Silhouette:** crest, shield disc and spear line. Black-figure *is* silhouette art, designed to read at a distance.
- **Signature strike, "the Lunge":** the classic spear-thrust pose from the pottery, cue thrust up-forward, with a
  meander-pattern trail.
- **Why it's cool:** the look of the Hades / *Hercules* animated films at its most graphic. Animated
  pottery figures are strange and handsome, and "Nobody" is the trickster underdog of all time (*unvisible*: the giant
  can't name who beat him).

### Big Jim
- **Look:** the **Cyclops**: a hulking black figure with a shaggy beard, a club, and a single eye that is a **glossy
  black eight-ball** with a white "8" disc for a pupil. He drinks from a krater (the *sextary* joke: he measures his
  wine by the barrel).
- **As geometry:** he is the cave. His sleeping body forms the hill the town sits on. In the boss, his arms and club
  are platforms, and his eye-ball rolls to track you (it's a pendulum target that swings in its socket, struck at the
  bottom of each swing).

### World
- **Setting:** the painted band of an enormous amphora that **rotates** as you run (the frieze scrolls around the
  vase): harbour → vineyard → the agora → the drinking hall (a **table game with stone balls**: pool, mythic) → the
  cave → the mountain.
- **Palette:** terracotta `#C8612B`, deep terracotta `#9C4220`, black glaze `#140E0B`, incision cream `#F3E3C3`,
  added red `#8E2A1B`, added white `#F5EFE6`, Aegean blue for sea and sky outside the vase `#1F4E79`.
  **Sacred:** the hero's incised lines glow **gold** `#F2C14E`; danger = added-red spikes.
- **Parallax:** 0 the museum-dark sky around the vase, with a spotlight · 1 the vase's curve (subtle cylindrical
  distortion at the screen edges) · 2 the frieze's background band (meander border top and bottom, the **beat
  grid**) · 3 the frieze's figure band (play layer) · 4 foreground: a second vase rim and handle passing in front.
- **Lighting arc:** a gallery spotlight tracks the hero; daylight frieze → night frieze (the glaze swaps: red figure on
  black) → **the drop flips the whole vase from black-figure to red-figure** → the finale's firelit cave.
- **The vase performs the song:** floor-tom = the **Cyclops's footsteps** shake the frieze · cowbell = goat bells ·
  snare = shields clashed · hats = the meander border ticks · bass = the sea waves rolling in the lower band ·
  fuzz riff = **satyrs dancing the riff** in the background band · piano = lyres plucked · organ = the aulos drone ·
  "HEY!" = a chorus of hoplites raising spears · crash = Zeus's lightning.

### Reskin
| # | In ONE-EYED JIM |
|---|---|
| R1 | Run the frieze; **meander-border keys** mark each beat |
| R2 | Hop amphorae and sheep |
| R3 | The Lunge |
| R4 | **Ride the wine**: surf a spilled river of wine (*fluvial* + *sextary*) under low cave roofs |
| R5 | **Hanging oil lamps** and bronze **gongs** on chains |
| R6 | **Columns** that stamp down on the beat and rise on the offbeat, like temple pistons |
| R7 | **Satyrs**: offbeat they offer a wine cup (the rim is a bounce); on the beat they head-butt with their horns |
| R8 | hop-hop-**LUNGE**: the pyrrhic war-dance steps (*dodge, dodge, strike*) that DESIGN.md already borrowed |
| R9 | **The chorus**: a Greek chorus of figures lines up behind you, each painted in as you play well. At max, the **gods on the upper band turn to watch** |
| R10 | A **lyre-player plays the riff** on the upper band (call); the strings stretch across your path (response) |
| R11 | A **plank on a boulder** flings a stone into a **bronze shield** (CLANG) or a **wine barrel** (BOOM) |
| R12 | The Cyclops **stacks boulders** across the cave mouth, one per bar. Strike the keystone on the silent beat and the boulders roll |
| R13 | **Columns topple** like dominoes down the colonnade |
| R14 | Climb the Cyclops's mountain (and then the Cyclops) |
| R15 | Jim the Cyclops: arms, club, and the eight-ball eye |
| R16 | **Olives** (gold glaze) trace the path. Chaser: the **rolling boulder** |

**Finale:** the **vase lid comes down**. The vase's painted bands wrap round and close up band by band on each beat,
you hop each band as it closes, and on the final HEY the **lid slams onto the Cyclops**. The vase turns to show its
other face: the new frieze shows Nobody, crowned.

**Art direction:** black-figure is pure silhouette plus a few incised cream lines (cheap, bold); terracotta
gradient ground; meander borders tiled with `createPattern`; the cylindrical-vase distortion only on the edges (a
cheap horizontal scale ramp). Red-figure flip = swap fill and ground colours.

**Scores:** Cool 5 · Fit 3 (the myth *is* the story; the 70s flavour lives only in the music) · Fun 4 · Feas 5

---

## 7. NINE-BALL NEBULA: the cosmic hustle *(cosmic reinterpretation)*

**Pitch.** The galaxy is a pool table. Big Jim is a bloated striped gas giant who's been pocketing stars into black
holes, and a small comet with a cue of light rolls in to **run the table**.

### Hero: "Halley"
- **Look:** a small bright **comet-kid**: a glowing white-gold core body with stubby limbs, a tiny newsboy cap, and a
  **long streaming ion tail** that trails with speed. Cue of light.
- **Silhouette:** a bright dot plus a long tail. The brightest thing in any frame, so readable at any size.
- **Signature strike, "Light Break":** a thrust of the cue of light, a lens-flare streak and a pool *clack* with
  cosmic reverb.
- **Why it's cool:** glow on black, 1964 World's Fair Space Age optimism (the Unisphere), and pool physics at
  planetary scale.

### Big Jim
- **Look:** a gas giant with **stripes like a 14-ball**, a Great-Red-Spot eye, a crooked grin and rings wearing gold
  like jewellery.
- **As geometry:** his **rings are the boss's run surface** (you run around and across him); his moons are his goons;
  his gravity bends the level (platforms curve toward him). The six black-hole pockets are his.

### World
- **Setting:** the galactic table, from the rim (the cushion = a glowing rail of stars) past Unisphere-like steel
  rings, the asteroid belt, a nebula, a pulsar field and Jim's system, to the corner pocket.
- **Palette:** deep space `#07071A`, nebula magenta `#C724B1`, nebula teal `#1FD1C1`, starlight `#FFFFFF`, comet gold
  `#FFD166`, cosmic felt `#0D3B2E`, rail-star blue `#6CA6FF`. **Sacred:** comet gold is the hero; danger = black-hole
  rims in violet `#8A2BE2`.
- **Parallax:** 0 distant galaxies spinning slowly · 1 nebula clouds · 2 the far table (planets drifting as balls) ·
  3 play: rails, rings, asteroids · 4 foreground: space dust streaks.
- **Lighting arc:** starlight → nebula glow → an eclipse during the build (Jim's shadow) → **the drop is a supernova
  flash** → the finale's pocket-dark.
- **The cosmos performs the song:** floor-tom = **pulsars pulse** · cowbell = satellites ping · snare = meteor
  impacts · hats = stars twinkle on 8ths · bass = **gravity waves ripple the grid** · fuzz riff = constellations
  draw themselves · piano = shooting stars · organ = the nebula's glow · "HEY!" = **the constellations raise their
  arms** · crash = a solar flare.

### Reskin
| # | In NINE-BALL NEBULA |
|---|---|
| R1 | Run a rail of stars, one bright star per beat |
| R2 | Hop between asteroids |
| R3 | Light Break |
| R4 | **Surf the solar wind**: ride a comet trail or a planet's ring (held note), under low asteroid bands |
| R5 | **Moons in orbit** are pendulums (an orbit's lowest point on the beat) |
| R6 | **Asteroids pulled down by gravity pulses** on the beat, released on the offbeat |
| R7 | **Jim's moons**: offbeat they show a lit, smiling face (bounce); on the beat they swing a crater-fist |
| R8 | hop-hop-**BREAK**: two cushion banks and a pocket shot on a planet |
| R9 | **Your tail grows** with every on-beat action and gathers **a constellation choir**. At max, the Milky Way sings |
| R10 | A **pulsar plays the riff** (call); stars in your path answer (response) |
| R11 | An asteroid on a pivot flings a moonlet into a **gong-like planet** (CLANG) or a **gas giant's belly** (BOOM) |
| R12 | Jim **racks the stars** into a triangle, one row per bar, in front of the pocket. Break on the silent beat: **the drop is the Big Bang break shot** |
| R13 | The **planets fall into alignment** and knock into each other like Newton's cradle, one per bar |
| R14 | Up a **space elevator** of Jim's rings |
| R15 | Jim the gas giant: rings, moons, the Great Red Spot |
| R16 | **Stardust** traces the path. Chaser: **a black hole** eating the table behind you |

**Finale:** the **corner pocket closes**. Spacetime folds in panels like a folded star chart, and on the final HEY
Jim drops into the corner pocket and the event horizon **snaps shut** over him. A new constellation forms in the
shape of the comet-kid.

**Art direction:** everything is glow on black (`shadowBlur`, additive blending, radial gradients); planets are
circles with stripes clipped inside; star fields and nebulas pre-rendered once. Very cheap and very pretty.

**Scores:** Cool 4 · Fit 3 · Fun 4 · Feas 5

---

## 8. TALL TALE: the Legend of Big Jim, Alabama *(folk tall-tale reinterpretation)*

**Pitch.** A Southern tall tale as a **pop-up storybook**. Big Jim is a bully as big as the county, lying along the
Alabama River; a riverboat gambler steps off a paddle steamer and cuts him down to size. Every page pops up on the
beat.

### Hero: "the Gambler"
- **Look:** a riverboat gambler kid: a flat-crowned black hat, a string tie, a brocade vest, a long frock coat with
  flapping tails, and a **pool cue carried like a fishing pole**, with a bandanna bundle hung from it.
- **Silhouette:** a hat, coat tails and a pole. Reads like a woodcut.
- **Signature strike, "Cue Crack":** a whip-fast cue flick with a paper-tear sound effect.
- **Why it's cool:** the most "folk tall tale" of the pool, charming with a mean streak, and pop-up paper
  animations are satisfying.

### Big Jim
- **Look:** a Paul-Bunyan-scale bully in overalls, a beard like a forest, a hat that's a hill, and boots that are
  barns.
- **As geometry:** his **sleeping body is the landscape**: the ridge line is his profile, the river runs through his
  beard, and the level crosses his arm like a bridge. He wakes at the climb.

### World
- **Setting:** the paddle steamer → the landing → **coleseed fields** → the cotton gin → the juke joint (with a pool
  table) → the river's log jam → Big Jim's mountain.
- **Palette:** rapeseed yellow `#F6D32D`, red clay `#B5432A`, river green-brown `#4E6B4B`, sky `#8EC5E8`, paper
  cream `#F4EAD5`, woodcut ink `#2B2118`, steamboat white `#F7F4EE`, sunset `#F28C5B`. **Sacred:** the hero's vest
  in `#8B1E3F` wine; danger = ink-black thorns.
- **Parallax:** 0 painted sky page · 1 far hills (Jim's shoulder) · 2 **pop-up paper layers that unfold on the beat**
  as you approach · 3 play: the paper ground · 4 foreground: paper tabs and pull-strips.
- **Lighting arc:** bright page → a thunderstorm page (lightning in woodcut zigzags) → **the drop: the page turns** →
  a firefly night.
- **The book performs the song:** floor-tom = the **paddle wheel** · cowbell = the steamboat bell · snare = a page
  flaps · hats = crickets and fireflies · bass = the river swells · fuzz riff = the **steam calliope** plays it, a steam
  puff per note · piano = the juke joint's upright · organ = the calliope's held chords · "HEY!" = the townsfolk
  (woodcut figures) · crash = a steam whistle.

### Reskin
| # | In TALL TALE |
|---|---|
| R1 | Run fence rails, one post per beat |
| R2 | Hop hay bales and hound dogs |
| R3 | Cue Crack |
| R4 | **Raft ride**: surf a log down the river (*fluvial*) under low bridges |
| R5 | **Lanterns and catfish on lines** swinging from the steamer's deck |
| R6 | **Pop-up tabs** pop up on the beat (solid) and fold flat on the offbeat |
| R7 | **Jim's moonshiner goons**: offbeat a tip of the hat (bounce); on the beat a jug swing |
| R8 | hop-hop-**CRACK** |
| R9 | **The town turns out**: a parade forms, and a **newspaper headline** grows ("STRANGER DEFIES BIG JIM" → "...BEATS BIG JIM") |
| R10 | The **calliope plays the call**; its pipes rise in your path for the response |
| R11 | A plank on a barrel flings a watermelon into a **washtub** (BOOM) or an **anvil** (CLANG) |
| R12 | A **log jam** on the river, one layer per bar (real this time: *fluvial*). Strike the key log on the silent beat |
| R13 | **Cotton bales and pine trees** topple one per bar |
| R14 | Climb Big Jim, who is a mountain |
| R15 | Jim awake: beard forest, overall-strap ledges, boots that stamp |
| R16 | **Silver dollars** trace the path. Chaser: the **flood** |

**Finale:** the **book slams shut on Big Jim**. The pop-up pages fold down one per beat (you hop them), and on the
final HEY the book closes with Jim pressed flat inside. The spine reads the Gambler's name.

**Art direction:** pop-up paper layers (flat fills plus a fold shading gradient), woodcut hatching cached per
element, a cream paper grain overlay.

**Scores:** Cool 3 (charming more than cool) · Fit 4 · Fun 4 · Feas 4

---

## 9. BEAT THE CHAMP: the carnival boxing booth *(1964 upset reinterpretation)*

**Pitch.** A travelling carnival, 1964. The sideshow banners promise "BIG JIM, THE UNBEATABLE". A skinny kid pays a
dime to step into the ring, and the whole midway comes to watch the upset.

### Hero: "Featherweight"
- **Look:** a lanky kid in **too-big satin trunks**, a striped carnival tee, and **huge red boxing gloves** (the
  gloves are the silhouette, as Crabbe's claw was).
- **Silhouette:** two huge round gloves on a thin frame. Instantly readable.
- **Signature strike, "the Uppercut":** an up-forward uppercut (the DESIGN.md strike arc exactly), with a *DING*.
- **Why it's cool:** floating-and-stinging footwork, the 1964 upset energy, and the gloves are a great toy.

### Big Jim
- **Look:** the carnival **strongman-champ**: a handlebar moustache, a leopard singlet, a championship belt and
  **painted-banner muscles**.
- **As geometry:** he's painted on the **30-ft canvas sideshow banners** that line the midway all level. In the boss
  he **tears through his banner** at big-top scale. His face works like Duchenne's electro-portraits: each landed hit
  switches his expression (sneer → doubt → fear → grudging respect).

### World
- **Setting:** the midway at night: striped tents, bulb strings, a Ferris wheel, the shooting gallery, the high
  striker, the freak-show tent ("SEE THE PASSIONS OF BIG JIM"), the boxing booth, the big top.
- **Palette:** tent red `#C8102E`, tent cream `#F5E6C8`, banner teal `#2A9D8F`, banner mustard `#E9C46A`, night navy
  `#14213D`, bulb gold `#FFD166`, sawdust `#C9A66B`. **Sacred:** hero glove red `#FF2E2E`; danger = banner-black
  spikes with gold edges.
- **Parallax:** 0 night sky and fireworks · 1 the Ferris wheel (a car per beat) · 2 the big top and the banner line ·
  3 play: the midway, booth counters, the ring ropes · 4 foreground: crowd heads, popcorn.
- **Lighting arc:** dusk gate → bulb-lit midway → the big top's spotlights → **the drop: every bulb on the midway
  blazes** → dawn tear-down.
- **The carnival performs the song:** floor-tom = the **high striker's mallet** · cowbell = the **high striker's
  bell** (and the prime bell) · snare = shooting-gallery ducks tick · hats = bulb chasers · bass = the Ferris wheel
  turns · fuzz riff = the carousel calliope · piano = the carousel horses bob up and down · organ = the
  calliope's drone · "HEY!" = the barker and the crowd · crash = the human-cannonball cannon.

### Reskin
| # | In BEAT THE CHAMP |
|---|---|
| R1 | Run the midway boardwalk; a **bulb string overhead lights one bulb per beat** |
| R2 | Hop booth counters and bales |
| R3 | The Uppercut |
| R4 | **Helter-skelter slide**: ride the spiral slide down, under tent guy-ropes |
| R5 | **Speed bags and heavy bags** swinging from chains |
| R6 | **Strongman barbells** slam onto their stands on the beat and lift on the offbeat |
| R7 | **Clowns**: offbeat, a balloon (a bouncy platform); on the beat, a **boxing glove on a spring** |
| R8 | **Jab-jab-UPPERCUT**: bob, bob, uppercut |
| R9 | **The betting board**: the odds tick from **100-to-1** toward even, and the crowd piles in. At max, the whole midway shouts your name |
| R10 | The **shooting gallery** (call: the ducks pop up on the riff at the back); the same ducks sweep along your path (response) |
| R11 | **The high striker**: land on the lever and the puck flies up to ring the **bell** 1 beat later (CLANG); the **dunk tank** (SPLASH/BOOM) |
| R12 | A **human pyramid** of Jim's strongmen, one tier per bar. Uppercut the base on the silent beat |
| R13 | The **sideshow banners topple** down the line |
| R14 | Up the **Ferris wheel** and the high-striker tower |
| R15 | Jim torn through his banner: belt ledges, fists that slam, a moustache that whips |
| R16 | **Tickets** trace the path. Chaser: **the carnival packing up**, lights going off behind you |

**Finale:** the **big top collapses**. The tent's panels fold down one per beat, and on the final HEY the canvas
folds shut on Big Jim. The sideshow banner that flips up in its place shows **"THE KID, UNBEATABLE"**.

**Art direction:** painted sideshow-banner style (flat fills, bold outlines, halftone shading); tents are stripe
fills; bulbs are dot arrays; the banners are cached images.

**Scores:** Cool 4 · Fit 3 (the underdog upset fits; the setting isn't the pool hall) · Fun 5 · Feas 4

---

## 10. BLACKTOP: the playground legend *(street-legend reinterpretation)*

**Pitch.** A New York playground court, 1972 summer tournament. Big Jim is a 7-ft center who has ruled the blacktop
for ten years; a small kid from out of town gets winners, and the whole block climbs the fence to watch.

### Hero: "Winners"
- **Look:** a small point guard in tube socks with stripes, short shorts, a big round afro with a headband, and
  high-top sneakers.
- **Silhouette:** afro disc + headband + long socks. Classic and readable.
- **Signature strike, "Swat":** a leaping block-swat, up-forward (the center's move turned against him).
- **Why it's cool:** the 70s playground-legend mythology; the hero is small enough to be an underdog on any court.

### Big Jim
- **Look:** a 7-ft center in a sleeveless jersey, headband, wristbands and a gold chain.
- **As geometry:** his **wingspan is the level**: arms spanning the screen are bridges, his hands are slam platforms,
  and his block is a wall. The climb is up his body to dunk on him.

### World
- **Setting:** the subway station → the street → the court → the fence → the rooftops over the court.
- **Palette:** blacktop `#1F1F24`, court-line white `#F5F5F0`, chain-link grey `#8A8F99`, subway silver `#C0C4CC`,
  graffiti red `#E63946`, graffiti yellow `#FFD60A`, graffiti blue `#2E86DE`, brick `#8C3B2A`, summer haze `#F4A261`.
  **Sacred:** hero sneakers in `#00E5A0`; danger = Jim's crew's gold chains.
- **Parallax:** 0 summer haze skyline · 1 elevated subway line with graffiti trains · 2 brownstones with stoops and
  crowds · 3 play: the court, the fence, car roofs · 4 foreground: the crowd's hands on the fence.
- **Lighting arc:** a noon heat haze → golden hour → street lights on the court at night → **the drop: the court lights
  slam on** → dawn.
- **The block performs the song:** floor-tom = the **ball bouncing** · cowbell = the ice-cream truck bell · snare =
  sneaker squeaks · hats = the chain-link fence rattling · bass = a boombox on a stoop · fuzz riff = the elevated
  train rolling · piano = a hydrant spray · organ = heat haze · "HEY!" = the crowd on the fence · crash = a backboard
  shaking.

### Reskin
| # | In BLACKTOP |
|---|---|
| R1 | Run the court lines, one line per beat |
| R2 | Hop car roofs and trash cans |
| R3 | Swat |
| R4 | **Hydrant slide**: skid through the open hydrant's spray, under the fence's torn bottom |
| R5 | **Chain nets swinging** from the hoops |
| R6 | **Basketballs slam down** as platforms on the beat, rising on the offbeat |
| R7 | **Jim's crew**: offbeat a pass (bounce on the ball); on the beat an elbow |
| R8 | **Crossover, crossover, SWAT** |
| R9 | **The fence**: the crowd climbs the fence as you play well. At max, the whole block is on the fence |
| R10 | **The call-and-response dribble**: a legend dribbles a riff on the court (call), then balls roll to you (response) |
| R11 | A **plank on a trash can** flings a ball into a **backboard** (CLANG) or a **garbage can** (BOOM) |
| R12 | Jim's crew build a **wall of bodies** in the lane. Swat on the silent beat |
| R13 | **Backboards topple** down the street courts |
| R14 | Up the **fence** and the fire escapes |
| R15 | Jim: wingspan, hands, and the dunk |
| R16 | **Sneakers** trace the path. Chaser: **the rain** |

**Finale:** the **fence folds shut on Big Jim**. The chain-link fence panels fold in on each beat, and you hop them.
On the final HEY the last panel closes on him. The court's scorekeeper chalks your name on the wall above his.

**Art direction:** flat blacktop with painted lines; chain-link as a cached `createPattern`; graffiti as bold shapes;
subway cars as simple rectangles with graffiti fills.

**Scores:** Cool 4 · Fit 3 · Fun 4 · Feas 4

---

## ~~11. BREAKER ONE-NINE: the CB convoy~~ *(rejected)*

**Pitch.** A 1970s CB-radio convoy down an Alabama interstate at night. You hop truck to truck; Big Jim is a
monster 18-wheeler with a chrome-grille grin.

- **Hero:** a hitchhiker kid in a trucker cap and aviators; strike = a **CB handset swung on its coiled cord**.
- **Big Jim:** the "Big Jim" hauler; the trailer is a 20-screen-long level, the grille is his mouth, and the stacks
  puff on the beat.
- **World:** night interstate, headlights, **reflector posts every beat**, overpasses, truck-stop neon, fireworks
  stands. Palette: asphalt `#1A1A1D`, headlight `#FFF3B0`, taillight `#FF2D2D`, chrome `#C0C7CE`, sodium `#FF9F1C`,
  CB-display green `#39FF14`. "HEY!" = an **air-horn chorus**.
- **Reskin (short):** R1 reflector posts · R4 slide under trailer beds · R5 swinging CB whip antennas ·
  R6 tailgates · R7 truckers wave then flick cigarettes · R11 a plank on a spare tyre into a **hubcap** (CLANG) and a
  **fuel drum** (BOOM) · R12 a jackknifed pile-up · R13 trucks jackknife in a chain · R14 climb a billboard · R15 the
  rig · finale: the **weigh-station doors** slam shut on the rig.

**Why rejected:** everything moves. The level's `x = beat × px` grid wants a *static* world you run through; a convoy
makes the ground move with the camera, and the speed feeling is lost. The pool-hall and bully story read weakly, and
highway violence reads worse than a pool-hall brawl. Scores: Cool 4 · Fit 2 · Fun 3 · Feas 4

---

## ~~12. PIER '64: Mods vs Rockers~~ *(rejected)*

**Pitch.** Easter 1964, a seaside amusement pier: a mod kid in a parka with an RAF roundel on the back, riding a
scooter with twenty mirrors, against Big Jim, the leather-clad rocker king, over the pier's pool tables.

- **Hero:** parka + roundel target; strike = a **mirror flash** off a scooter mirror.
- **Big Jim:** the rocker king on a giant café-racer motorbike; the pier's big wheel is his.
- **World:** a pier at night, arcades, penny falls, a big wheel. Palette: parka green `#556B2F`, roundel red/white/blue,
  leather black, pier-bulb gold.
- **Reskin (short):** R5 the penny-falls pushers · R6 the scooter's mirrors · R11 penny-falls see-saws · R12 deck
  chairs piled up · R13 the pier's pilings collapse · finale: the pier **folds into the sea**.

**Why rejected:** it's back at the seaside the user just rejected, it's British rather than the song's Alabama / 42nd
Street, and it restages a real-history gang riot. Scores: Cool 4 · Fit 2 · Fun 3 · Feas 4

---

## 13. Folded-in drafts (not full packages)

- **Stacked Deck** (Joker vs the King of Clubs; house of cards) and **Cue-Fu** (70s kung-fu, cue as bo staff):
  both are already covered in `themes-D.md`. Donate: card-flip platforms (face-up = solid on the beat, edge-on =
  intangible on the offbeat); the kung-fu **freeze-frame on a Perfect**; the **folding fan** snapping shut as a finale.
- **Jukebox** (the hero lives inside the pool hall's jukebox): close to D's pinball "TILT". Donate: **bubble-tube
  pilasters** as hat-driven props; the **record-changer stack** as a pile-up.
- **Galvanic** (Duchenne's electrodes as the whole theme): too clinical. Donate: Big Jim's **face-expression machine**
  as a boss "health bar" with no bar (used in #3 and #9).

---

## Summary

| # | Package | One-liner | Cool | Fit | Fun | Feas |
|---|---|---|---|---|---|---|
| 1 | **RACK 'EM** | Human-scale neon pool hall; the drop is the break shot; the rack closes on Jim | 4 | 5 | 4 | 5 |
| 2 | **THE DEUCE** | 42nd Street under blacklight; a white-suited hustler with a cane; shutters slam on Jim | 5 | 5 | 4 | 4 |
| 3 | **MAIN TITLE** | Saul-Bass cut-paper credits; every strike cuts the frame; letterbox bars close on Jim | 5 | 4 | 4 | 5 |
| 4 | **STRANGER IN TOWN** | Leone western; the showdown silence is the silent beat; the iris closes on Jim | 5 | 3 | 4 | 5 |
| 5 | **REVERSIBLE** | Embroidered sukajan: tiger vs dragon; the jacket turns inside out | 5 | 3 | 4 | 3 |
| 6 | **ONE-EYED JIM** | Black-figure vase myth; the Cyclops's eye is an eight-ball; the lid comes down | 5 | 3 | 4 | 5 |
| 7 | **NINE-BALL NEBULA** | Cosmic pool; a comet runs the table; Jim drops into a black-hole pocket | 4 | 3 | 4 | 5 |
| 8 | **TALL TALE** | Alabama pop-up storybook; Jim is the landscape; the book slams shut | 3 | 4 | 4 | 4 |
| 9 | **BEAT THE CHAMP** | 1964 carnival boxing booth; the high striker is the catapult; the big top folds | 4 | 3 | 5 | 4 |
| 10 | **BLACKTOP** | 70s playground legend vs a 7-ft center; the fence folds shut | 4 | 3 | 4 | 4 |
| ~~11~~ | ~~BREAKER ONE-NINE~~ | CB convoy; rejected, the moving ground breaks the beat grid | 4 | 2 | 3 | 4 |
| ~~12~~ | ~~PIER '64~~ | Mods vs Rockers pier; rejected, back to the seaside | 4 | 2 | 3 | 4 |

**Strongest by sum:** THE DEUCE (18), MAIN TITLE (18), RACK 'EM (18), ONE-EYED JIM (17), STRANGER IN TOWN (17).
**Suggested hybrid:** THE DEUCE's world, with RACK 'EM's pool hall as the interior act (the pool hall upstairs on
42nd Street) and MAIN TITLE's cut-paper cards as the frame (the cold open's credits unfold and fold shut at the end).
