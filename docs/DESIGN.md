# OpusLegends — Creative Bible: "CUE-FU"

Source of truth for creative choices. Research lives in `docs/research/` (principles in `reference.md`, idea pools in
`ideas-A/B/C.md`, theme pools in `themes-D/E.md`). Where this doc gives a number, the number comes from `reference.md`
unless it's marked **[tune]**. **No song lyrics appear in this repo.** We describe the song's structure and story only.
*Lineage:* the crab/sea-coast theme was rejected ("we need something cooler, maybe in line with the song"); CUE-FU
(`themes-D.md` §4) won a random draw among the coolest song-fitting packages. Gameplay (§4, §5 rules, §7) carries over.

---

## 1. Pitch

**Song.** "You Don't Mess Around with Jim" (Jim Croce, 1972) in **our own instrumental arrangement**: a Black-Betty-style
stomp-boogie (floor-tom + cowbell stomp, fuzz riff, honky-tonk piano, gang **"HEY!"/"HUP!"**), **fixed at 164 BPM, E,
two-beat shuffle** (kick 1 & 3, snare 2 & 4, swung 8ths at 0.67; `docs/music/transcription.md`). The story: a bully, Big
Jim, rules the pool hall until an underdog takes him down, and the last chorus flips whose name nobody messes with.

**Pitch.** The level is a scratched **1973 grindhouse kung-fu double feature** on 42nd Street. You're **Kid Cue**, a
skinny drifter with a pool cue for a staff, fighting up **Big Jim's five-storey pool-hall pagoda**, one floor per act.
Every stab is a cue strike and every "HEY!" is you. The theatre audience is your streak meter: play well and they stand
and roar. On the silent beat you smash a goon pyramid, burst onto the roof at sunset for the drop, topple six lacquered
gates like dominoes, climb the tower, and meet Big Jim on his throne of pool tables. On the final hit the projector's
**iris slams shut on his face**.

> **Told to a friend:** "It's a scratched old kung-fu movie. You're a kid in a tangerine tracksuit with a pool cue, every
> 'HEY!' is you whacking a goon, and the cinema audience goes wild the better you play. You break a goon pyramid on the
> silent beat, the drop hits as you burst onto the roof at sunset, gates fall like dominoes, and the boss's sunglasses
> reflect you coming. The iris closes on him on the last beat. Then it prints the movie poster of *your* run."

**Frame.** The marquee's double bill: **BIG JIM'S PAGODA** in huge letters, and under it, tiny, **CUE-FU** starring Kid
Cue (our fictional studio: **Eightball Pictures**). Six **reels** give six acts. The cold open is the dark theatre and the
countdown leader; the finale is the iris-out, the film flapping on the reel, and an usher swapping the billing. **Tone:**
a rowdy midnight-movie brawl: slapstick, swagger, crash zooms and freeze frames, the underdog story told without words.

### Cultural care (hard rules)
A homage to the **craft** of 70s kung-fu cinema and grindhouse exhibition (film texture, choreography, training devices,
the tower of floor-bosses, crash zooms, freeze frames, sunset silhouettes). **Not** an ethnic pastiche.
- No stereotyped accents or "bad English dubbing" jokes. Subtitles are grammatical, florid trash talk; the dub gag is
  melodrama plus **mismatched lip-sync** (mouths flap on after the line ends), applied to everyone equally.
- No laundry, kitchen, wok, abacus, fortune-cookie, rickshaw or conical-hat imagery; no "chop-suey" lettering (type is
  70s grindhouse: condensed grotesques, italic slabs, brush script, wood-type billing).
- The pagoda is a fictional pool-hall tower (NYC neon on a tiered-roof silhouette): no shrines or religious statuary.
  The gong is a musical instrument, never an "exotic" punchline sting.
- No real martial artists, films or studio logos, and no franchise costumes (no yellow jumpsuit with black stripes).
- Everyone is drawn in one flat-silhouette style with minimal faces; Kid Cue can be of any background. A fresh-eyes
  review checks every asset against this list before shipping (Fun Risk 6).

---

## 2. Hero: Kid Cue (the underdog)

### Look (procedural, reads at 100–130 px)
- **Tracksuit:** tangerine `#FF8A1F` (shade `#C45A0E`), **one white stripe** `#FFF6E8` down arm and leg; black slippers
  `#1A1410`. **Headband** cream `#FFF6E8`, two long tails streaming behind with speed (the speed readout).
- **The cue:** 1.4× his height, maple `#E7C48A`, black butt `#2A1E16`. Slung diagonally at idle, spun like a bo staff in
  action. Each cracked dummy ties a **gold tassel** to the butt, so the tassels stack up (the visible trophy pile).
- **Size:** ~124 px tall standing, wide low stance. **Hitbox 48×96, slide 48×40 [tune]** (the engine's current 64×60
  was the crab's). Silhouette: skinny figure + long diagonal line + two flying tails. Nothing else on screen has it.

**Personality:** a broke, cocky drifter who talks with his feet. He bounces on his toes on every beat, flicks his thumb across his nose
on the downbeat, and **bows to every enemy** (on the offbeat, mirroring their fake politeness) before he flattens them.
**Underdog motif:** the skinniest guy in the building, billed in the smallest type, wins with rhythm, not size.

### Animation list
Key poses land **on** the beat. Attacks follow the "short backswing" rule: near-zero wind-up, big follow-through.

| Anim | Notes |
|---|---|
| Idle | Toe bounce on each beat, thumb-flick on beat 1, headband sway, cue twirl every 2 bars |
| Run | Low sprint, cue trailing. Slipper patter on the swung 8ths, dust ticks per footfall |
| Hop / Jump | Stretch on takeoff (0.82×1.22), **scissor-kick tuck** at apex, tails whip. Land squash up to 1.3×0.72 plus a dust puff |
| **Cue Sweep** | Spinning staff strike, low-forward → high overhead up-forward arc. Contact frame on the input. Crescent smear (cream edge, tangerine core) |
| Perfect sweep | **Freeze frame**: 3 frames of hold, 2% zoom-punch, radial speed lines. The movie's own slow-motion replay |
| Heave (end of Hup-Hup-HEY) | Full-body flying sweep; the target goes through a paper wall or off the screen |
| Vault-slide | Plants the cue and slides low on one hip, cue as a rudder, sparks or spray trail |
| Stumble | Spins, clutches his head, jump-cut (2 frames missing). ≤0.4 s |
| Death | Falls out of frame, the audience goes "OOOH", the film **rewinds** (reverse scrub). ≤0.6 s, funny |
| Respawn | Rewind lands on the checkpoint splice; he pops back into his pose on the downbeat |
| Bow pose | Final: bows on the throne of pool tables; the ex-enforcers bow back |

### Verbs: 3 core + 1 mode
The engine's wall-jump is **off** for this level.

| Verb | Input (kbd / pad) | What it does | Sound it layers onto the music |
|---|---|---|---|
| **Run** | hold → / stick | Top speed = tempo (§4) | Dry slipper patter on swung 8ths, quantised, quiet |
| **Hop** | Space or Z / A | Variable jump. Tap ≈ 1-beat hop, hold ≈ 2-beat jump | **Woodblock "tok"**, low, alternating 2 pitches (quantised to the shuffle grid if early) |
| **Cue Sweep** | X / X | Up-forward strike. Hits enemies ahead **and** things above | Kid Cue's **"HEY!"** + a foley whoosh-thwack. The audience doubles the shout when 4+ are standing |
| **Vault-slide** *(mode, from Verse 2)* | hold ↓ / hold ↓ or RT | Low slide. On Slick Runs it's the sustain verb (§5.3) | A **slide-guitar sustain** on the run's pitch. Release = pick-scrape "zzip" |

**Signature: the Freeze.** Every Perfect sweep freezes the frame like a replay, and the nearest audience row leaps up
in a ripple (one seat later per 32nd). You land the move and the house answers.

---

## 3. World: the Pagoda on 42nd Street

The film opens on 42nd Street's marquees. At the end of the block stands **Big Jim's Pagoda**: a five-storey pool-hall
tower whose tiered eaves are strung with neon. **Each storey is a room with its own master**, and each act climbs one.
Outside, the pagoda is always on the horizon; its top window shows **two aviator glints** that flash on every chorus
stab. Indoors, ceiling dust shakes down on the stabs as Big Jim thumps around upstairs.

**Six reels:** 1 **the Street** (marquees, fire escapes, rooftops; bars 1–16) · 2 **Floor 1, the Dojo** (timber, presses,
dummies; 17–32) · 3 **Floor 2, the Bath-House** (steam, jade tile, pools, fogged mirrors, bells; 33–56) · 4 **Floor 3, the
Pool Room** (57–64) → **Floor 4, the Velvet Hall** (65–72) · 5 **the Roof Terrace** at sunset → the tower's outer eaves
(73–88) · 6 **Floor 5, the Throne Room** (89–96).

### Palette

**Sacred colours** are never used for anything else:

| Role | Hex | Used by |
|---|---|---|
| **Hero** | tangerine `#FF8A1F` (+ shade `#C45A0E`), stripe/headband `#FFF6E8` | Kid Cue only |
| **Reward** | gold `#E0B64A`, shine `#FFE08A` | Tokens, tassels, Perfect sparkles, dummy cracks, bell medallions, the keystone glow |
| **Danger** | lacquer red `#B3201B`, hot edge `#FF4A3D` | Weapon tips, snapped-cue spikes, Shadow Double eyes, Big Jim's knuckle rings and fist edges |

**World colours:**

| Group | Colours |
|---|---|
| Film | film black `#1A1410`, faded highlight `#E9D8B4`, projector haze `#F8F1DC` (12%), subtitle cream `#F4EFE2` |
| Street | asphalt `#2B2530`, brick `#6B3A2E`, neon jade `#46D6A0`, neon rose `#E0569B`, marquee bulb `#FFE9C2` |
| Dojo | timber `#8A6A4F`, dark timber `#4E3A2C`, paper wall `#EFE6CF`, iron `#3A3A42` |
| Bath-House | tile jade `#2FA37A`, deep `#0F4A3E`, grout `#9FB8AE`, steam `#DDEFE8`, copper `#B8734A` |
| Pool Room | felt `#1F6B45`, felt shadow `#0E3A26`, lamp pool `#F6E7B0`, walnut `#5A3A26`, smoke `#8C8A7A` |
| Big Jim / Velvet Hall | fig `#5E2B4E`, velvet sheen `#8A4A76`, shadow `#2E1428`, chrome `#C9D3DA` |
| Theatre (frame) | seats/audience `#0D0A08`, curtain `#4A1A20`, house-light amber `#C98A3A` |

### Parallax (back → front, scroll factor)
0. **The theatre** (fixed, screen space, *outside* the film pass): a ~70 px strip of audience silhouettes along the bottom
   (the streak meter, §4), projector haze across the top, curtain edges. Never interactive; the ground stays above it.
1. **Matte-painted sky** (0.05): gradient, sun or moon, the pagoda on the horizon with its aviator glints.
2. **Far** (0.25): skyline, water towers, marquees; later the pagoda's lower roof tiers and the street far below.
3. **Mid** (0.55): room interiors. Paper walls with shadow-play fighters, gongs, lamps, pools, mirrors.
4. **Play** (1.0): floors, beams, presses, benches, gates, eaves, Big Jim himself.
5. **Foreground** (1.3): hanging lanterns, steam wisps, bead curtains, dust. Sparse, never over the play band.

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
| Kid Cue | skinny figure + long diagonal staff + two flying headband tails; the only tangerine |
| Bluff Masters | squat box, wide lapel triangles, flat cap; red staff tip; open jacket = two giant eyespots |
| Shadow Doubles | Kid Cue's exact shape in translucent steam-grey; red eyes and tip |
| Dummies / bells | a cross-shaped post / a bell shape on a rope, gold when struck |
| Big Jim | a pear-shaped velvet mass under two blazing chrome ovals |

**Rules:** sacred colours only for their roles. Background layers lose 30–50% saturation and contrast; **no background hue
within ±12° of tangerine above 55% saturation** near the play band (sunsets are coral and rose, never orange), and world
lacquer is dulled cinnabar `#7E3A30`, never the sacred red. Every walkable top has a 4 px film-black edge + 2 px cream
lip; subtitle platforms are **cream with a black outline** (never yellow, so they never read as reward). Kid Cue gets a
2 px cream rim in dark and silhouette scenes. Steam ≤ 25% opacity over the play band. Nothing interactive in the theatre strip.

### How the world performs the song
**Stomp/kick:** the audience stomps (theatre strip bounces 2 px), ceiling dust drops, presses thud · **cowbell:** hanging
bells and neon letters tick · **snare/claps:** popcorn bursts over the audience, paper walls flex on 2 and 4 · **hats
(swung 8ths):** lanterns sway on the shuffle · **bass:** the gate weaves; balls roll on background felt · **fuzz riff:**
shadow-play fighters behind paper walls perform forms on its accents · **piano:** tokens flash, background racks break
on runs · **"HEY!":** the audience yells and a cream "HEY!" subtitle flashes · **crash:** a cigarette burn flares with a 1%
crash zoom · **downbeat:** shutter dip and the choreographer's bar line (§6.4).

### Lighting arc (one night at the movies)
| Section | Light |
|---|---|
| Cold open | The dark theatre, projector beam haze, countdown leader |
| Intro (1–8) | 42nd Street golden hour, faded ochre sky `#DCC7A0`→`#E9D8B4`, long shadows |
| Verse 1a (9–16) | Neon marquee dusk → night `#2A1E3A`, neon jade and rose, bulbs chasing |
| Verse 1b / Chorus 1 (17–32) | The Dojo: warm lamplight on timber, paper walls glowing |
| Verse 2 / Chorus 2 (33–56) | The Bath-House: jade tile in steam, skylight shafts, pool caustics, fogged mirrors |
| Stomp break (57–64) | The Pool Room: dark, with felt-green light pools under hanging lamps, smoke layers |
| Build (65–72) | The Velvet Hall: fig darkness; lanterns gutter out one per bar until only the gold keystone glows |
| Drop (73–80) | **Bursting onto the roof into a sunset**: coral `#F2856B` → rose `#E8577A`, silhouettes against a cream sun `#FFE9C2` |
| Climb (81–88) | Sunset sinking to fig dusk `#5E2B4E` as you climb; the throne skylight glows above |
| Outro (89–92) | The Throne Room: one cream skylight shaft, dust in the beam, chrome aviators blazing |
| Finale (93–96) | Pull out to the theatre; house lights come up amber; the iris closes |

---

## 4. Core rules

**Speed control: held run + tempo cap + catch-up surge (reference Q1 → B/C hybrid).** 384 px per beat; top run speed
= `384 × BPM / 60` = **1049.6 px/s at 164 BPM**, so holding → keeps you exactly on the grid. **You can never be ahead of
the grid**; when *behind* it (stumble, release), top speed rises **+15%** until you're back. **Why:** Rayman's agency and
"you can really fail" [S7], with the guarantee that obstacles, SFX and marks line up. **Assist:** "Auto-run" toggle.

**Chaser: the Burn.** The film burns through behind you: a bubbling cream-white hole with scorched edges eats the frame
from the left, 2 beats behind the grid; fall 2 beats behind and it takes you. It first appears on bar 5 and changes form
per act (boiling steam in the Bath-House, rising under the goon pile and the climb, Big Jim's backhand in the outro).

**Off-beat behaviour (reference Q2 → B).** Every action *works* off-beat; physics never reads the grade, which only
affects tokens, audience, sparkle and score. Early SFX sound on the next shuffle subdivision (triplet 8th), late ones
immediately. Jump takeoff is never delayed.

**Timing windows** (constant ms, early side +12 ms): **Perfect ±45 · Great ±90 · Good ±135**. Each input resolves to the
nearest unconsumed target. A beat is 366 ms at 164; a swung "and" sits 245 ms after its beat, so windows can overlap.
Playtest Good at ±150 **[tune]**. **Forgiveness:** coyote 100 ms, jump buffer 100 ms **[tune 80–130]**, strike buffer
100 ms, corner correction on.

**Fail state (reference Q3 → C, with A for pits).**
- **Stumble** (snapped-cue spikes, enforcer jabs, Shadow Doubles, low beams, Big Jim's fists): 0.5-beat knockback, 1
  beat of i-frames, 5 tokens dropped (they hover 1 bar to re-grab), audience −25% (min 3). The surge wins the ground back.
- **Death** only from falling out of the frame (street gaps, roof edges, eaves) or being caught by the Burn. **Bars 93–96
  cannot kill you.**

**Checkpoints:** a **splice** every **8 bars** (§7): splicing tape across the frame with a hand-lettered scene number
("SC. 17"). **Respawn in < 1 s** on a bar boundary: the film visibly rewinds and the music restarts 1 bar before the
checkpoint for a count-in (engine `countInBeats: 4`). After **5 deaths** in a segment, offer "Skip ahead" (costs tokens).

**Feedback** is diegetic first. **Perfect:** the Freeze, gold sparkle, pitched chime, audience ripple. **Great:** jade
spark. **Good:** normal sound. **Miss:** no sparkle, never a harsh noise unless it's damage. Hitstop is cosmetic (50–70
ms). A 1% beat-bump zoom on downbeats is separate from trauma shake (accessibility slider). Text popups off by default.

**The audience is the streak meter and the music reward.** +1 person standing per Good-or-better action, +3 for a complete
on-grid Hup-Hup-HEY, cap 24 across the theatre strip. The **shouts stem** runs from −6 dB at 0 standing to full at ≥ 12.
At ≥ 20, **FULL HOUSE**: everyone's up, popcorn flies, the marquee bulbs chase, and the **bonus stem** fades in over 1 bar
(and out over 1 bar below that). Enforcers you knock off the screen land in the front row and join them.

**Runway:** camera lead 30% of screen width at 0.95 zoom ≈ 3.6 beats (≈ 1.32 s at 164); choruses and set-pieces zoom out
10% more. Every hazard has a wind-up sound 1 beat ahead. **Calibration** per reference §2.3 (audio clock, latency
compensation, tap test in pause, bounded auto-cal).

**Score:** **tokens** are the lums: brass pool-hall tokens stamped with an 8-ball. They trace the ideal path, and each
pickup plays the next note of a honky-tonk piano ladder from the current chord. **Cups:** Bronze / Silver / Gold Cue,
then **"Top Billing"** (every token and every dummy); thresholds set after layout **[tune]**.

---

## 5. Mechanics catalogue

The rule for every mechanic: **the object tells you *what*; the choreographer's mark (§6.4) tells you *when*.**

### 5.1 Dummy Crack *(B2 Star Pierce: pendulum targets struck on the beat)*
- **Do:** straw-and-timber **sparring dummies** hang on ropes from beams, awnings and eaves, swinging with a **1-bar
  period**. They reach strike height only at the bottom of the swing, **on the beat**; sweep there to crack them: a
  wooden chime pitched to the chord, a burst of tokens, and a **gold tassel** tied onto your cue.
- **Music:** small dummies on backbeats, **big dummies on chorus stabs**. **Telegraph:** pendulum physics plus a glint
  1 beat before the bottom. A miss just swings past (pure bonus).
- **First:** Intro bars 5–8, the zero-threat strike tutorial. **Escalates:** singles → pairs on "HEY! HEY!" → above
  Stamp Presses (hop + sweep) → on ropes that snap as the gates fall.

### 5.2 Hup-Hup-HEY! *(A-M1 Pyrrhic Double, ∪ ∪ –)*
- **Do:** a three-hit phrase, **hop (∪), hop (∪), SWEEP (–)**: dodge-dodge-strike, the boogie's da-da-DUM (typically
  spike, spike, enforcer or big dummy). All three Good+ = the audience roars it, the sweep becomes a **Heave** (the target
  flies through a paper wall or into the front row, extra hitstop, crash zoom), and the audience gets +3.
- **Music:** every phrase is **quarter, quarter, half (beats 1, 2, 3–4)** with gang **"HUP! HUP! HEY!"**, so ∪ = 1 beat,
  – = 2. **Telegraph:** ∪ ∪ – marks ahead, plus an audience inhale on the beat before.
- **First:** Chorus 1 bars 31–32 with full marks. **Escalates:** single → back-to-back → hop-hop-**SLIDE** on the falling
  gates → no marks on the climb → cracking Big Jim's aviators → **the level's final input** (§6.2).

### 5.3 Slick Run *(B21 Dune Surf Sustain): the Verse-2 mode*
- **Do:** glowing **slick runs** (hot water streaming down sloped jade tile; later the falling gate beams and the frame
  line). **Hold ↓ for the whole run**: Kid Cue vault-slides, collects its token line, and passes under the low steam
  pipes, towel racks and beams that line every run (the physical reason to hold; standing early = head bonk). **Release
  at the lip** (last half-beat) for a kick-out pop, or press hop. Gaps are sized so a late release still clears, lower.
- **Music:** each run is **a held note** (slide-guitar or bass sustain): length = note length, hue = pitch. Your slide
  plays that pitch and your release lands on the rest. **Telegraph:** the length shows 3+ beats ahead; the lip glows.
- **First:** Verse 2 bars 33–40. **Escalates:** 1-bar runs → 2-bar with a mid-run dummy (slide + sweep) → hop-hop-SLIDE
  → the falling gate beams and the frame line.

### 5.4 Stamp Presses *(A-M17 Flying Flats: platforms that slam on the beat)*
- **Do:** the Dojo's giant training presses, iron-shod timber blocks on rails. They **slam down on the beat** (solid
  until the swung "and") and **lift on the offbeat** (intangible). Sets alternate (A on 1 and 3, B on 2 and 4): pogo
  press-to-press with 1-beat hops over the open floor-well.
- **Music:** stomp = down, hat = up; the room breathes. **Telegraph:** a rim **clack 1 beat before** each slam, plus the
  press's shadow sharpening on the floor.
- **First:** Verse 1b bars 17–24. **Escalates:** every beat → mixed 1/2-beat gaps (∪ ∪ – spacing) → enforcers riding
  presses → **"concept of delay" payoff: Big Jim's fists slam and lift in exactly this pattern in the outro.**

### 5.5 Bench Flips *(C-M17 Spoon Catapults: catapult see-saws)*
- **Do:** pool-hall spectator benches balanced on racks as see-saws, loaded with a rack of balls, a sandbag or a dozing
  goon. **Land on the high end** (the kick) and the payload arcs along a dotted preview to hit its target exactly **1 beat
  later** (the backbeat), or 2 for big arcs: **gongs** (floor-tom **BOOM**), **bronze bells** (cowbell **CLANG**),
  enforcers (clears them), or the next bench (chain). A missed bench is just floor; off-beat landing = off-beat BOOM.
- **Music:** kick → backbeat cause-and-effect; you add the stomp break's accents, chains roll *boom-boom-CLANG*.
  **Telegraph:** dotted arc and lit target 2+ beats ahead, plus a bench creak as it comes on screen.
- **First:** Stomp Break bars 57–60. **Escalates:** single → chains of 3 (61–64) → in the build, a goon flung into a goon.

### 5.6 Bell Form *(C-M8 Stalactite Melody + the master's form: riff call-and-response)*
- **Do:** the Bath-House's master (the **Steam Master**, a towel-draped heavyweight in a fig robe) teaches the riff.
  **Call bar:** in the steam behind the pools he strikes a rack of hanging **bronze bells** with a long pole; each glows
  as it rings. **Response bar:** the same bells hang over *your* path at their grid positions; strike each on time with
  the sweep's upward arc or by hopping into it. **Pitch = height:** low notes in sweep reach, high notes need hop +
  sweep, so the contour picks the verb. A missed note leaves a hole, no penalty (the base stem keeps a ghost).
- **Music:** the producer **omits the lead riff in response bars** (§7), so *your* strikes are the riff. **Telegraph:**
  the call bar itself, plus a rim-light 1 beat ahead.
- **First:** Verse 2 bars 41–48. **Escalates:** 4 quarters → 8th-note phrases with a hop between → **no call** in the
  outro (the bell medallions on Big Jim's gold chain, played from memory).

### 5.7 Goon Pile *(C-M22 Log Jam Build: the player causes the drop)*
- **Do:** during the 8-bar build in the Velvet Hall, Big Jim's goons **dogpile into a human pyramid**. **One layer piles
  on per bar** on the downbeat, forming the next, higher step of a rising staircase as you keep running right, while the
  Burn rises below. At the top the **keystone goon** (the one holding everybody up, straining under a roof hatch) glows
  gold at the cap. **Sweep him on bar 72 beat 4**, into the silence: **KRAK**, the whole pile explodes outward in
  slow motion, and **the drop hits on bar 73** as you burst through the hatch onto the roof. If you miss, the pile
  collapses anyway and the Burn blows the hatch, with no bonus.
- **Telegraph:** **cigarette burns**: the changeover dot flashes top-right on 72 b1, b2, b3 (a real projectionist's
  cue); on b4 the reel changes and that's your beat. Layer shadows land 1 beat early. **Appears once:** bars 65–72.

---

## 6. Enemies, set-pieces, wild cards

### 6.1 Enemies and the boss

**Bluff Masters** *(A-E3 Flag-Wavers + deimatic display)*: Big Jim's enforcers
- **Look:** broad, squat men in fig jackets with huge flared lapels and flat caps; short staffs with **lacquer-red** tips.
  Found on floors, presses, benches, gate tops, eaves, and Big Jim's sleeves. They deliver trash-talk subtitles (§6.5).
- **The trick:** **on the offbeat** they **bow politely**, and the flat back is a **bounce platform** (a trampoline pop
  onto an optional high route). **On the beat** they snap up, **fling the jacket open** on a lining painted with two huge
  staring eyespots (a bluff display), and jab. **Telegraph:** a lapel tug and a rising "hup" 1 beat before.
- **Counter:** sweep on the jab beat (cue beats bluff): he's knocked **off the screen into the theatre's front row**, sits
  down and cheers for you. Otherwise the jab hits and you stumble.
- **Escalates:** singles on "HEY!" → pairs on "HEY! HEY!" → feints that bow for 3 beats and jab only on the phrase's
  "HEY!" → on moving presses and benches → the outro line, one per beat, on Big Jim's sleeves.

**Shadow Doubles** *(merge of C-E11 Wax Mimics + B-E4 Echo Robes: echo enemies that replay your last bar)*
- **Look:** Kid Cue's **own silhouette** stepped out of the Bath-House's fogged mirrors: translucent steam-grey `#9FB8AE`,
  tails and cue included, **lacquer-red** eyes and cue tip.
- **Rule:** each Double performs **your previous bar's inputs, one bar later**. Its sounds are your SFX, delayed and
  tile-reverbed (a musical canon), and your previous bar floats above it as marks, so you can *read your own echo*.
  Touching one = stumble; an off-unison sweep passes through the steam.
- **Beat one by unison clash** (Echo Robes): it stands where you'll arrive; sweep on the beat it echo-sweeps (*repeat*
  last bar's rhythm) and the cues meet, **CLACK!**, it bursts into steam. **Or bait it** (Wax Mimics): a Double under a
  rack of snapped cues jumps when you jumped last bar, and gets snagged.
- **Design law:** Doubles are always placed so that *repeating the song's shout pattern* beats them. Follow "HEY! HEY!"
  and you win without maths; get the canon and you can bait them for style.
- **First:** bars 45–48 as harmless reflections in the fogged mirrors, miming you 1 bar late (the "aha"). They block in
  Chorus 2 (bars 49–56), with one cameo in the outro.

**Snapped Cues** *(hazard)*: bundles of splintered cue shafts with lacquer-red tips, on the floor or in hanging racks.
The basic "spike".

**BIG JIM** *(the boss, the payoff of both set-pieces)*: the pool-hall kingpin. A huge pear-shaped frame in a **fig
velvet suit** with flared lapels and curtain-like sleeves, a gold chain of bell medallions, lacquer-red knuckle rings,
and **mirrored aviators that reflect the hero's approach** (a tiny tangerine Kid Cue grows in the lenses as you climb).
He sits on a **throne of stacked pool tables**. **Not a health-bar fight: he is level geometry and spectacle** [S14].
His **bluff display** is the reveal: arms flung wide, sleeves flaring like wings, both lenses flashing like eyespots, a
roar. All puff. He is the glinting window on the horizon, the thumping on every ceiling, the crash-zoom close-up whose
**sleeves are platforms and fists are slam pistons**, and finally the face the iris closes on.

### 6.2 Set-pieces

**SIX GATES** *(A-S2 Arch Falls: toppling dominoes → vertical climb)*: the climax, Final Chorus bars 73–88.

| Bars | What happens |
|---|---|
| 73–78 | You burst onto the pagoda's roof terrace into the sunset. Along the terrace toward the top tower stand six towering **lacquered gateways** (two pillars and a curved roof beam). The drop cracks the first, and they **topple like dominoes, one per bar on the downbeat** (stomp + crash). Each falling beam leaves its pillars standing as **new posts**. Run the gate beams, **slide down each falling beam** on held notes, and hop post-to-post on "HEY!" beats. Enforcers ride the beams; dummy ropes snap. Everyone is a silhouette against the sun except you |
| 79–80 | A **2-bar drum fill**. The last two gates fall on the fill's accents with 1-beat post hops, and the final one smacks into the top tower. Ceiling tiles rain; the aviator glints *twitch* |
| 81 | On the biggest crash, **the film slips the gate**: the picture rolls and the black **frame line** rises under the last falling beam like a lift. It catches you (generous landing zone) and you **slide along it** |
| 82 | The frame line flicks you, and the picture snaps back into register with you on the tower's lowest eave |
| 83–88 | **The vertical climb** up the outer eaves of the top storey. Rising eave-hops on every beat (~100 px gain per beat, camera tilts up); the street shrinks below. Hup-Hup-HEY against enforcers with **no marks**. The Burn rises beneath |
| 88 (summit) | You land on the top eave and the paper walls **rip open**: Big Jim rises from his throne in his **bluff display**, and the camera **crash-zooms** until he fills the screen. Bar 88's sustained chord + roar swell |

**IRIS OUT** *(B-SP7 Screen Fold: the world closes on the boss)*: outro bars 89–96, with Big Jim as the target.

| Bars | What happens |
|---|---|
| 89–90 | **Gauntlet on Big Jim** (in close-up). His two fists slam down and lift in the Stamp Press pattern. You hop fist to fist and run his draped sleeves, with a Bluff Master line (one jab per beat) riding them. The Burn becomes his sweeping backhand. Bell Form reprise with no call on his chain medallions |
| 91–92 | Two **Hup-Hup-HEY** phrases up his lapels (no marks); each final HEY cracks one aviator lens, left then right. He reels. **The hardest 4 bars of the level** (89–92) |
| 93–94 | **Breath.** The camera pulls out of the film: the screen, curtains and the whole audience doing a stand-up wave for you. On screen the picture flattens into a **film strip**; Big Jim is shrunk into a single frame, pounding its edges, while you run the strip's sprocket edge through a shower of tokens and popcorn. A cut-in: an usher on a ladder swaps the billing, so **CUE-FU** is now the big letters. The song's role reversal, told without words |
| 95 | The projector's **iris** starts to close in blades on beats 1–4. Each blade swings in beneath you as a tilted platform; hop blade to blade |
| 96 | The last two blades close on beats 1–2 (HUP, HUP). On **beat 3 (HEY!)** you sweep-leap off the last blade as **the iris slams shut on Big Jim's face** on the final hit |
| After | Black. The film snaps and flaps on the reel. "THE END" burns in. A second iris opens on Kid Cue **bowing on the throne of pool tables**, the ex-enforcers bowing back in tangerine headbands, the audience roaring on the ringing chord. **You cannot die in bars 93–96**: a missed hop lands on a lower blade as a stumble |

**Bookend:** the level *begins* in this same theatre, with the house lights dimming and the countdown leader (§7).

### 6.3 Wild card: Your Poster *(C-X2 Performance Sampler: a unique, shareable results screen)*
The results screen is a **lurid grindhouse one-sheet for CUE-FU, printed from your run**. Key art: Kid Cue frozen in
**your best Perfect's pose** (the actual frame), towering over a shrunken Big Jim. Your route up the pagoda is one painted
action streak: on-grid = clean tangerine brushwork, Perfects = gold starbursts, misses = torn gaps, stumbles = tape
repairs. Tagline from your stats ("34 PERFECT STRIKES! 2 FALLS! ONE CUE!"), billing "starring KID CUE · with BIG JIM ·
and 112 TOKENS", a rating stamp with your cup, a "HELD OVER!" snipe for FULL HOUSE, and print wear (folds, pin holes) seeded
by the run. Title: **DON'T MESS WITH KID CUE**. Every run prints a different poster. **Export PNG** to share.

### 6.4 Wild card: Choreographer's Marks *(A-X4 Scansion: notation marks on the world)*
Upcoming rhythm is marked **on the world** the way a fight choreographer blocks a scene: chalk on timber, tile and roof
slates, gaffer tape on the street. **∪** = 1 beat (usually a hop): a chalk tick. **–** = 2 beats (heave or slide hold): a
chalk bar. **|** = bar line, a tape stroke at every downbeat, always on as a quiet metronome. Marks glow jade on their
beat and fill gold on a Perfect. **They teach, then leave:** full marks at each mechanic's debut, bar lines only on
reprises, **nothing** on the climb and the gauntlet; they return over Shadow Doubles (your echo, written out).
**Cigarette burns** are the one mark outside the world: the film's own changeover countdown before the drop.

### 6.5 Wild card: Trash-Talk Subtitles *(themes-D "slanginess")*
When an enforcer or Big Jim shouts (on the lead's hook phrases), a **cream subtitle bar** appears and holds for 1 bar,
and **you can stand on it**: an optional high route with tokens. The lines are grammatical, florid boasts ("NOBODY
LEAVES THIS HALL STANDING."), and the speaker's mouth keeps flapping for 2 beats after the line ends. **First:** Chorus 1
(C1–C4). Used again in Chorus 2 and on Big Jim's reveal. Pure bonus route; first to be cut (Fun Risk 1).

### 6.6 Adoption ledger (nothing rejected)
| Drawn | Became | Special quality kept |
|---|---|---|
| themes-D §4 CUE-FU | world, hero, boss, film frame | Floor-per-act tower; film pass; audience |
| B-H6 + B7 Lead the Wave | Kid Cue; the Freeze; the audience ripple | The crowd syncs to you |
| B21 Dune Surf | Slick Run (vault-slide) | A hold verb for held notes |
| C-M17 Spoon Catapults | Bench Flips | Delayed kick→backbeat payoff, chains |
| A-M1 Pyrrhic Double | Hup-Hup-HEY! | A 3-hit *phrase* (short-short-long) |
| B2 Star Pierce | Dummy Crack | Pendulum alignment on the beat; visible trophy stack (tassels) |
| C-M22 Log Jam Build | Goon Pile | The player causes the drop |
| C-M8 Stalactite Melody | Bell Form | You play the hook by platforming |
| A-M17 Flying Flats | Stamp Presses → Big Jim's fists | Pistons; the room breathes |
| A-S2 Arch Falls | Six Gates → frame-line lift → eave climb | Domino collapse to a drum fill, launch, vertical climb |
| B-SP7 Screen Fold | Iris Out (and the theatre opening) | The world closes blade-by-blade; leap off as it slams |
| C-E11 + B-E4 | Shadow Doubles (merged) | Replays your last bar; beaten with your own rhythm |
| A-E3 Flag-Wavers | Bluff Masters | Polite on the offbeat, weapon on the beat |
| A-X4 Scansion | Choreographer's Marks + cigarette burns | Diegetic, learnable notation |
| C-X2 Perf. Sampler | Your Poster | Unique, shareable record of your run |

**No rejections.** Shadow Doubles are **on probation** (Fun Risk 2) with a defined fallback.

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
the level is built on the stab/shout grid**, so keep that grid exact.

**Verse template** (16 bars): the verse melody on piano and fuzz lead over the stomp groove, with a turnaround stab +
**"HEY!"** on beat 4 of bars 8 and 16.

### Section-by-section
Times are at 164 BPM from the bar-1 downbeat. ◆ = checkpoint splice.

| # | Bars | Time | Song | Level (reel / floor) | New idea |
|---|---|---|---|---|---|
| 0 | — (+bar 0) | ~4 s | Theatre ambience: projector clatter, audience murmur. The house lights dim on 6 soft stomps; the marquee bills BIG JIM'S PAGODA huge, CUE-FU tiny. **Pressing Strike starts bar 0**: the countdown leader (4-3-2-1 on the beats) as a stomp + cowbell count-in, gang "HEY!" on beat 4 | **Reel 1, the Street**, title card. Kid Cue twirls his cue; three loafers on a stoop wake and cheer; the pagoda glints at the end of the block | Strike = the music's trigger |
| 1 | 1–8 | 0:00 | **Intro.** 1–4: fuzz boogie riff alone (plus stomp). 5–8: + bass, piano, cowbell, full kit. The Burn appears on bar 5 | 42nd Street at golden hour, under the marquees. Token arcs on the riff/piano (1–4). **Dummies** swing on the backbeats from awnings (5–8). **Zero threat** | Tokens; Dummy Crack |
| 2 | 9–16 ◆9 | 0:12 | **Verse 1a** | Neon dusk. Fire escapes and rooftops toward the pagoda gate. Snapped cues and roof gaps, safe version then lethal. **Full marks** | Hop over spikes and gaps |
| 3 | 17–24 ◆17 | 0:23 | **Verse 1b.** The stomp tightens to every beat | **Reel 2, Floor 1: the Dojo.** **Stamp Presses** over the open floor-well | Stamp Presses |
| 4 | 25–32 ◆25 | 0:35 | **Chorus 1** (template) | The Dojo's sparring floor. **Bluff Masters** on the HEY beats (C2, C4), trash-talk subtitle high route (C1–C4), a stop-time enforcer/dummy line (C5–C6), **Hup-Hup-HEY** (C7–C8, full marks). Zoom out. Ceiling dust drops on the stabs | Bluff Masters; Hup-Hup-HEY; subtitles |
| 5 | 33–40 ◆33 | 0:47 | **Verse 2a.** Sparser, tile-wet mix. **Slide-guitar held notes**, 1–2 bars each (bars 33–34, 36–37, 39–40), over a bass sustain. **Full stop on bar 32 beat 4** before the steam | **Reel 3, Floor 2: the Bath-House.** Sloped tile chutes; **Slick Runs** match those held notes | **Vault-slide (mode)** |
| 6 | 41–48 ◆41 | 0:59 | **Verse 2b: call/response.** The riff plays on a bell timbre in bars 41, 43, 45, 47; **the lead riff is omitted in bars 42, 44, 46, 48** (ghost at −18 dB) | **Bell Form** with the Steam Master. Bars 45–48: Shadow Doubles appear as harmless reflections in the fogged mirrors | Bell Form |
| 7 | 49–56 ◆49 | 1:10 | **Chorus 2**, tiled-hall reverb on the shouts. **Bar 56 beat 4: silence** | The great bath hall. **Shadow Doubles** block on the HEY beats, plus enforcers, dummies, a short slide. Bar lines only | Shadow Doubles |
| 8 | 57–64 ◆57 | 1:22 | **Stomp Break** *(added)*: floor-tom + cowbell + handclaps + gang "HEY"s, the Black Betty stomp. **Big accents left as ghosts in the base stem** at the player slots: 57–60 on beat 3 (+60 b1); 61 b2-3-4; 62 b3; 63 b2-3-4; 64 b1 | **Reel 4, Floor 3: the Pool Room.** **Bench Flips** onto gongs (BOOM) and bronze bells (CLANG): singles (57–60), chains (61–64). A breather with agency | Bench Flips |
| 9 | 65–72 ◆65 | 1:34 | **Build** *(added; the showdown, using verse-3 material)*. Tom roll doubles every 2 bars (quarters 65–66 → 8ths → 16ths → roll 71). Riff climbs, and the "HEY!" chant grows each bar. **A big hit on every downbeat.** **Bar 72: b1 HEY!, b2 HEY!, b3–b4 total silence** | **Floor 4: the Velvet Hall.** **Goon Pile** climb, lanterns guttering out. Cigarette burns on 72 b1–b3; sweep the keystone goon on **72 b4** (only your KRAK and "HEY!" are heard) | Goon Pile |
| 10 | 73–80 ◆73 | 1:45 | **FINAL CHORUS, first half. THE DROP on 73 b1** *(the role-reversal chorus)*. Full power, harmony guitar. A gate lands on each downbeat. **Bars 79–80 are a 2-bar drum fill** replacing C7–C8's band | **Reel 5, the Roof Terrace: SIX GATES.** Sunset | (combination) |
| 11 | 81–88 ◆81 | 1:57 | **Final chorus, second half.** **The biggest crash of the song on 81 b1** (frame slip). C7–C8 (87–88) Hup-Hup-HEY ×2. **Bar 88 b3–4: a big sustained chord + low "roar" swell** (Big Jim's bluff) | Frame-line lift → **climb the tower's eaves** (no marks). The throne reveal on 88 | (combination) |
| 12 | 89–92 ◆89 | 2:09 | **Outro gauntlet.** Double-time energy: **"HEY!" on every beat** (89–90), then HUP-HUP-HEY ×2 (91–92) | **Reel 6, Floor 5: the Throne Room.** Fist-piston hops, an enforcer line, the bell riff reprise with no call (his chain), lens cracks. **The hardest 4 bars** | (mastery) |
| 13 | 93–94 | 2:15 | Band drops to **stomp + piano only**: a breath | Pull out to the theatre; the film strip; the marquee swap | — |
| 14 | 95–96 | 2:18 | **Full band.** 95: a hit on every beat (hook fragment). 96: **HUP (b1), HUP (b2), HEY! (b3) = FINAL HIT**, full chord, ring out ~4 s under an audience roar | **Iris Out** on Big Jim. Blades close on 95 b1–4 and 96 b1–2; leap on 96 b3 | Finale (can't die) |

**Total:** 96 bars ≈ 2:20.5 of music at 164 BPM (≈ 2:26 with pickup and tail, ≈ 2:30 with the cold open). There are
11 checkpoints, one every 8 bars.

**How this remaps the song.** Original intro → verse → chorus → verse → chorus → verse → final (role-reversal) chorus
becomes: Intro · Verse 1 (extended to 16 bars) · Chorus 1 · Verse 2 (Bath-House: held notes + call/response) · Chorus 2 ·
**Stomp Break** (added) + **Build** (verse-3 material) · Final chorus ×2 (Six Gates drop, throne reveal) · **Outro**
(added: gauntlet, iris, final hit).

### Deliverables for the music producer
**Stems**, sample-aligned, same length:

| Stem | Contents |
|---|---|
| `base` | Stomp, drums, cowbell, bass, rhythm guitar, piano comping, fx. Includes the stomp-break ghost accents and the −18 dB ghost riff in bars 42/44/46/48 |
| `lead` | Fuzz lead, piano melody, slide sustains, call-bar bells. **Empty in bars 42, 44, 46, 48** |
| `shouts` | All gang "HEY!/HUP!" plus the audience bed. The game scales its volume with the audience meter |
| `bonus` | Harmony lead guitar + extra piano/organ layer, **played through the whole song**. The game fades it in only during FULL HOUSE |

**One-shots** (pitched ones in the song's key/scale). **Voices:** Kid Cue "HEY!" ×3, audience "HEY!" layer, "HUP!" ×2,
audience cheer/roar swells (3 tiers), "OOOH" (death), popcorn pops. **Player:** hop woodblock "tok" (2 pitches);
slide-guitar sustain per degree + release scrape; cue whoosh-thwack; wooden-dummy crack + chime per degree; bell per
riff note; piano token ladder per degree. **World:** gong BOOM, bronze/temple bell CLANG, bench see-saw thunk + creak,
press rim-clack + slam, enforcer wind-up (lapel snap + rising "hup") + jab clack, paper-wall rip, unison CLACK + steam
burst, keystone KRAK + slow-mo whoosh. **Film:** projector clatter loop, countdown-leader beep, cigarette-burn flare,
frame-slip roll (81), the Burn sizzle loop, rewind chatter (respawn), iris slam, film snap + flap-flap loop. **Big Jim:**
bluff roar, fist slam, lens crack. Theatre cold-open ambience loop.

**`beatmap.json` lanes:** beats, bars, sections, key/scale; kick/stomp, snare/clap, cowbell; **shouts** (type + time);
**stops** (silence ranges); **sustains** (start, end, pitch: these become the Slick Runs); **riff notes** (time, pitch,
call/response flag: Bell Form); stomp-break player slots.

---

## 8. Fun risks (top 6) and how we test them

1. **Idea overload: the level becomes a quiz** (7 mechanics, 2 enemies, 2 set-pieces, subtitles and a boss in ~2:20).
   **Test:** 5 fresh players, one blind run each; log deaths per segment, ask "what were the moves?". **Pass:** everyone
   names hop/strike/slide; no segment (gauntlet included) averages > 3 deaths. **Cut order:** subtitle platforms →
   Double bait rule → bench chains → bow-bounce high route → bluff feints. Density goes before any verb does.
2. **Shadow Doubles confuse at 164 BPM** (a one-bar canon is a planning puzzle in a sprint). **Test:** grey-box Chorus 2
   with 5 players. **Pass:** > 70% clear it by the 3rd attempt untold and say "they copy me". **Fallback:** Doubles become
   harmless mirror dancers and Chorus 2 uses enforcers (our one rejection).
3. **The held run feels off-grid, or vertical sections break the grid** (mushy surge; pile and climb trade runway for
   height). **Test:** per-bar grid-offset telemetry (human + autoplay), runway per section. **Pass:** median |offset|
   < 0.1 beat, surge recovery ≤ 4 beats, runway ≥ 1.2 s. **Fix:** auto-run by default; flatter climb or more zoom-out.
4. **"Playing the song" doesn't land** (the hook must survive as an instrumental; synth shouts may sound cheap; a hop
   woodblock may grate; the audience/stem reward may be inaudible). **Test:** blind A/B with vs. without player SFX and
   stem scaling; check missed Bell Form responses and stomp slots don't sound broken. **Pass:** ≥ 3/5 recognise the
   song in the first chorus, ≥ 4/5 prefer "with SFX". **Fix:** louder hook, real-voice shouts, hop → soft kick + whoosh.
5. **Readability at speed and through the film pass** (grain/scratches/weave over a 124 px hero; tangerine vs. sunset and
   marquees; steam; silhouette fights; **Big Jim filling the screen** so hazards hide on his velvet). **Test:** greyscale
   + blur shots per section with the pass on; 0.5 s freeze-frame quiz ("what hurts / what to strike"); 25% thumbnail
   of Kid Cue. **Pass:** ≥ 90% correct. **Fix:** film pass "light" by default, thicker edges and rims (§3), darker velvet
   so only Big Jim's red knuckles and chrome lenses pop.
6. **The homage reads as caricature** (one lazy font, sting or subtitle sours the tone). **Test:** every asset, subtitle
   and SFX checked against §1 "Cultural care", plus two fresh-eyes reviewers: "does anything feel like a stereotype?".
   **Pass:** zero flagged items. **Fix:** replace the item; never argue it through.
