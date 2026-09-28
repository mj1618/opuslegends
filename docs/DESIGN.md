# OpusLegends — Creative Bible: "DON'T MESS WITH CRABBE"

Source of truth for creative choices. Research lives in `docs/research/` (principles in `reference.md`,
idea pools in `ideas-A/B/C.md`). Where this doc gives a number, the number comes from `reference.md` unless it's
marked **[tune]**. **No song lyrics appear in this repo.** We describe the song's structure and story only.

---

## 1. Pitch

**Song.** "You Don't Mess Around with Jim" (Jim Croce, 1972), in **our own instrumental arrangement**: a Black-Betty-style
hard-rock stomp-boogie (floor-tom + cowbell stomp, fuzz boogie riff, honky-tonk piano, gang **"HEY!"** shouts), at a
constant 150–170 BPM (producer's call). The song's story: a bully, Big Jim, rules the pool hall until an underdog takes
him down, and the final chorus flips whose name nobody messes with.

**Pitch.** You're **Crabbe**, a cocky fiddler crab with one gigantic claw, on a chalk-and-teal sea-stack coast ruled by
**Big Jim**, a colossal barnacle-crusted king crab, and his pool-cue-jabbing gulls. Every stab in the song is a
claw-snap and every "HEY!" is you; each on-beat move adds a crab to your **choir**, which shouts louder. The run goes
through the erosion cycle (headland → cave → arch → stack → stump). At the climax you crack a keystone on the silent
beat before the drop, the arches fall like dominoes, a whale launches you up the tallest stack, the stack stands up
(it *is* Big Jim), and on the final beat the world folds shut like a sea chart **with Big Jim squashed inside**.

> **Told to a friend:** "Tiny crab, one huge claw, every 'HEY!' is you snapping a bully's gull, and your crab crowd
> gets louder the better you play. The arches fall like dominoes, a whale throws you up a stack that turns out to be
> the giant bully crab, and the whole map folds shut on him on the last beat. Then it shows your run *embroidered*."

**Frame.** The level is a **living six-panel sea chart**: engraved waves, a compass rose, and a margin sea-monster
labelled **BIG JIM**. It unfolds at the start and folds shut at the end. It gives six acts (one per panel) and explains
the painted cut-out look. **Tone:** a rowdy seaside honky-tonk brawl, slapstick, the underdog story told without words.

---

## 2. Hero: Crabbe the fiddler (the underdog)

### Look (procedural, reads at 60–90 px)
- **Carapace:** rounded trapezoid ~70×44 px, ultramarine `#2D3FA6` with a `#4A63D9` top-edge gradient. **Eyes:** two
  stalks (+26 px), white bulbs that swivel toward targets. **Neckerchief:** white/teal stripes, tails flutter with speed.
  **Legs:** 3 thin 2-segment legs per side; tiny minor claw on the left.
- **THE CLAW:** as big as the body (~56×40 px), palm + finger in **Claw Orange `#FF7A1A`**, cream teeth `#FFF1D6`,
  underside `#C4501A`. Folded across the front like a fiddler's bow at idle; raised, it adds ~45 px.
- **Size:** ~84 px tall × ~120 px wide with claw. **Hitbox 64×60** (engine's current 56×104 must shrink). The silhouette
  (asymmetric blob, one huge right pincer, two stalks) is unique on the coast.

### Personality
A show-off courtship dancer and pocket-sized hustler: the coast is a date and Big Jim is a dare. He waves at
*everything* (enemies included) before he snaps them, and his claw bobs on every beat even at idle. **Underdog motif:**
the tiniest thing on the coast wins with rhythm, not size.

### Animation list
Key poses land **on** the beat. Attacks use the "short backswing" rule: near-zero wind-up, big follow-through.

| Anim | Notes |
|---|---|
| Idle | Claw bob on each beat, eyestalk swivel, neckerchief sway |
| Scuttle | Sideways-forward. 6 legs cycle on 8ths, body bob on 16ths, dust ticks per footfall |
| Hop / Jump | Stretch on takeoff (0.78×1.28), legs tuck, eyestalks trail. Land squash up to 1.38×0.62 plus a chalk puff |
| **Claw ("the Wave")** | Claw sweeps low-forward → high overhead in an up-forward arc. Contact frame is on the input. Smear arc plus sparkle |
| Heave (end of Hup-Hup-HEY) | Full-body lunge. Claw overhead; the choir does a "pull" gesture |
| Skim | Flat on the belly like a surfer, legs splayed, claw raised as a sail. Spray ribbon behind |
| Stumble | Spins once, eyes become spirals, herring spill. ≤0.4 s |
| Death | Swallowed by foam; eyestalks bob above the surface, then *bloop*. ≤0.6 s, funny |
| Respawn | Pops out of a sand burrow at the checkpoint beacon on the downbeat |
| Band pose | Claw raised on the final chord on top of the folded chart. The choir plays instruments behind him |

### Verbs: 3 core + 1 mode
The engine's wall-jump is **off** for this level.

| Verb | Input (kbd / pad) | What it does | Sound it layers onto the music |
|---|---|---|---|
| **Scuttle** | hold → / stick | Run. Top speed = tempo (§4) | Dry claw-tip "tik" on 8ths, quantised, quiet |
| **Hop** | Space or Z / A | Variable jump. Tap = ~1-beat hop, hold = ~2-beat jump | **Cowbell "tonk"**, low in the mix, alternating 2 pitches (next-16th quantised if early) |
| **Claw** ("the Wave") | X / X | Up-forward strike. Hits enemies ahead **and** things above | Crabbe's **"HEY!"** plus a snap-crack. The choir doubles it when choir ≥ 4 |
| **Skim** *(mode, from Verse 2)* | hold ↓ / hold ↓ or RT | Belly-slide. On foam ribbons it's the sustain verb (§5.3) | A **slide-guitar sustain** on the ribbon's pitch. Release = pick-scrape "zzip" |

**Signature: the Wave.** Every on-beat claw is also a courtship wave. Nearby crabs raise their claws in a ripple
(one crab later per 32nd), which is B7 "Lead the Wave". You lead and the coast follows.

**Why this set:** the engine already has punch (→ Claw) and slide (→ Skim); three verbs map to three instruments (hop =
cowbell stomp, claw = "HEY!", skim = slide-guitar held notes); Skim arrives in Verse 2 as the twist mode (reference Q6).

---

## 3. World: the Stack Coast

Chalk-white cliffs fall into teal sea. **The level's spine is the erosion cycle, in order:** headland → sea cave →
arch → stack → stump. The player crosses each stage, then *causes* the cycle to happen (Arch Falls).

**Big Jim's Rock**, the tallest stack, is always on the horizon. It's the goal, and it gets closer act by act. Two
claw-shaped crags twitch on the chorus stabs, which is the foreshadowing.

### Palette

**Sacred colours** are never used for anything else:

| Role | Hex | Used by |
|---|---|---|
| **Player** | Claw Orange `#FF7A1A`, carapace `#2D3FA6` | Crabbe only |
| **Reward** | Herring silver `#DDE7EE` + gold glint `#FFD34D`; float sea-glass `#7FE3B0` | Herring, glass floats, Perfect sparkles |
| **Danger** | Urchin black `#1A1420` + **hot magenta `#FF2E88`** | Urchin spines, gull cue-tips, Echo Slicker eyes, Big Jim's spine tips and pincer edges |

**World colours:**

| Group | Colours |
|---|---|
| Chalk | bone `#F2EEE3`, shade `#C9C3B4`, deep shade `#8F8A80`, flint bands `#2A2B33` |
| Sea | shallow `#6FD6C8`, teal `#1FA3B0`, deep `#0E5E6B`, foam `#E8FBF7` |
| Wood / boats | weathered `#8A6A4F`, dark `#4E3A2C`; Big Jim's pennants: oxblood `#7E1F24` + black |
| Big Jim | barnacle ochre `#9A7B55`, shell oxblood `#8C2F2A`, kelp `#3E5B3A` |
| Chart (frame / finale) | parchment `#EFE2C0`, engraving ink `#2B2320`, faded red `#B5523B`, sea wash `#9CC8C0` |

**Rules:** background layers lose 25–45% saturation and gain haze toward the sky; no background uses the sacred magenta
or Claw Orange; the ground always has a dark flint/wood edge line so it never merges with white foam.

### Parallax (back → front, scroll factor)
0. **Sky** (0.0): gradient, sun or moon, and the lighthouse beam sweeping the sky once per bar.
1. **Horizon** (0.08): **Big Jim's Rock**, the fishing fleet, whale spouts.
2. **Far stacks** (0.25): a row of stacks and arches, gull clouds wheeling.
3. **Cliff wall** (0.55): cave mouths with blowhole spray, the lighthouse, nesting-gull ledges, bell buoys.
4. **Play layer** (1.0): chalk paths, boardwalks, boats, the jam, the stacks, Big Jim himself.
5. **Foreground** (1.3): surf spray, kelp, drifting nets and floats. Sparse, never covering the play band.

### How the world performs the song
The world is the band, and background props bump on the beat.

| Instrument | Visual |
|---|---|
| **Floor-tom stomp / kick** | Sea caves *boom*: blowhole spray plumes and cave mouths exhale mist |
| **Cowbell** | Bell buoys clang and tilt in the swell |
| **Snare / handclaps** | Surf crashes on the rocks: foam bursts on 2 and 4 |
| **Hats** | Nesting gulls open their beaks and bob on 8ths; flocks wheel in 16th patterns |
| **Bass** | The sea surface heaves on the bassline; boats and floats bob |
| **Fuzz boogie riff** | Chalk calves off the cliffs, with rock-fall puffs on the riff's accents |
| **Honky-tonk piano** | Herring flash silver as they leap in arcs on piano runs |
| **Gang "HEY!"** | The crab choir, plus fishermen-crabs on the boats hauling nets on every shout |
| **Crash** | Whale spouts; storm lightning as *bolt shapes* (never full-screen strobes) |
| **Bar / downbeat** | The lighthouse beam crosses the camera. Scansion bar-lines on the ground (§6.4) |

### Lighting arc (one day, compressed)
| Section | Light |
|---|---|
| Cold open | Pre-dawn indigo `#1E2450`, peach sliver, lighthouse beam prominent |
| Intro / Verse 1 | Dawn peach→rose `#F7B9A0`/`#FBE3C8`, long gold shadows, chalk glows warm |
| Chorus 1 | Full morning, sky `#8FD3F0` |
| Verse 2 / Chorus 2 (cave) | Cave dark `#10262E`, light shafts through blowholes, water caustics, backlit cave mouth |
| Stomp break / Build | Storm gathers, violet-grey `#4B4E6D` → `#2E3350`, rain, whitecaps, bolt shapes on crashes |
| Final chorus | **The storm tears open on the drop** into a gold-coral sunset `#FFB347`/`#FF7F66` |
| Outro | Dusk `#2B2A55`, first stars; Big Jim silhouetted against the last light |
| Finale | Everything turns to parchment and engraving ink as the world becomes the chart |

---

## 4. Core rules

**Speed control: held run + tempo cap + catch-up surge (reference Q1 → B/C hybrid).**
- 384 px per beat; top scuttle speed = `384 × BPM / 60` (960 px/s at 150, 1024 at 160, 1088 at 170), so holding →
  keeps you exactly on the grid. **You can never be ahead of the grid**; when *behind* it (stumble, release), top speed
  rises **+15%** until you're back.
- **Why:** it keeps Rayman's platformer agency and "you can really fail" [S7], and the engine already derives run speed
  from tempo. The surge fixes option B's drift, giving A/C's guarantee that obstacles, SFX and scansion line up.
  **Assist:** "Auto-scuttle" (option A) is a one-line toggle.

**Chaser: the Breaker.** A curling breaker eats the coast behind you (the cliff edge visibly calves into its foam). It
sits **2 beats behind** the grid; fall 2 beats behind and it takes you. It changes form per act (open-coast breaker,
flooding tide in cave and jam, falling arches, rising surge on the climb, Big Jim's claw sweep) and first rises on bar 5.

**Off-beat behaviour (reference Q2 → B).** Every action *works* off-beat; physics never reads the timing grade. The
grade only affects herring bonus, choir, sparkle and score. SFX: early inputs sound on the next 16th, late ones play
immediately. Jump takeoff is never delayed.

**Timing windows** (constant ms, early side +12 ms): **Perfect ±45 · Great ±90 · Good ±135**. Each input resolves to the
nearest unconsumed target (8ths are 188–200 ms at our tempo, so windows overlap). At ≥ 160 BPM, playtest Good at
±150 **[tune]**. **Forgiveness:** coyote 100 ms, jump buffer 100 ms **[tune 80–130]**, claw buffer 100 ms, corner
correction on.

**Fail state (reference Q3 → C, with A for pits).**
- **Stumble** (urchins, cue-jabs, Echo Slickers, low ceilings, Big Jim's pincers): 0.5-beat knockback, 1 beat of
  i-frames, 5 herring dropped (they hover 1 bar to re-grab), choir −25% (min 3). The surge wins the ground back.
- **Death** only from falling in the sea or being caught by the Breaker. **Bars 93–96 cannot kill you.**

**Checkpoints:** channel-marker beacons every **8 bars** (§7). **Respawn in < 1 s** on a bar boundary: the music rewinds
1 bar before the checkpoint for a 1-bar count-in (engine `countInBeats: 4`). After **5 deaths** in a segment, offer
"Skip ahead" at the cost of that segment's herring (can be turned off).

**Feedback** is diegetic first. **Perfect:** gold sparkle, pitched chime, 1-frame rim-light, choir claw-ripple.
**Great:** teal spark. **Good:** normal sound. **Miss:** no sparkle, and never a harsh noise unless it's damage. Hitstop
is cosmetic only (50–70 ms). A 1% beat-bump zoom on downbeats is separate from trauma shake (which has an accessibility
slider). Text popups are off by default.

**The crab choir is the streak meter and the music reward.** +1 crab per Good-or-better action, +3 for a complete
on-grid Hup-Hup-HEY, cap 24. They scuttle in a band behind Crabbe (20–30 px) and carry snipped floats like lanterns.
The **shouts stem** runs from −6 dB at 0 crabs to full at ≥ 12. At ≥ 20, **"BIG CATCH!" mode**: boats run up bunting
and the **bonus stem** fades in over 1 bar (and out over 1 bar below that).

**Runway:** camera lead 30% of screen width at 0.95 zoom ≈ 3.6 beats (≥ 1.3 s at 160 BPM); choruses and set-pieces
zoom out a further 10%. Every hazard has a wind-up sound 1 beat ahead. **Calibration** per reference §2.3 (audio clock,
latency compensation, tap test in pause, bounded auto-cal on).

**Score:** **herring** are the lums. Leaping silver fish trace the ideal path, and each pickup plays the next note of a
honky-tonk piano ladder from the current chord. **Cups:** Bronze / Silver / Gold Net, then **"Big Catch"** (every herring
and every float); thresholds set after layout **[tune]**.

---

## 5. Mechanics catalogue

The rule for every mechanic: **the object tells you *what*; the scansion mark (§6.4) tells you *when*.**

### 5.1 Glass-Float Snip *(B2 Star Pierce)*
- **Do:** glass fishing floats in rope netting hang on lines between masts, poles and arches, swinging as pendulums with
  a **1-bar period**. They reach claw height only at the bottom of the swing, **on the beat**; claw there to snip. The
  float rings a glass chime pitched to the chord and bursts into herring. A choir crab catches it and carries it
  overhead like a lantern, so the choir becomes a glowing parade (Star Pierce's visible trophy stack).
- **Music:** small floats on backbeats, **big floats on chorus stabs**. **Telegraph:** pendulum physics plus a glint 1
  beat before the bottom. A miss just swings past (pure bonus).
- **First:** Intro bars 5–8, the zero-threat claw tutorial. **Escalates:** singles → pairs on "HEY! HEY!" → above Wave
  Flats (hop + claw) → on lines that snap as arches fall.

### 5.2 Hup-Hup-HEY! *(A-M1 Pyrrhic Double, ∪ ∪ –)*
- **Do:** a three-hit phrase, **hop (∪), hop (∪), CLAW (–)**: the pyrrhic dance's dodge-dodge-strike and the boogie's
  da-da-DUM. Typical layout: urchin, urchin, then a gull or big float. If all three grade Good+, the choir roars it,
  the claw becomes a **Heave** (flips the target high into the background with extra hitstop and camera kick), and
  the choir gets +3.
- **Music:** the producer arranges every phrase as **quarter, quarter, half (beats 1, 2, 3–4)** with gang **"HUP! HUP!
  HEY!"**, so ∪ = 1 beat and – = 2. **Telegraph:** ∪ ∪ – marks ahead, plus a choir inhale on the beat before.
- **First:** Chorus 1 bars 31–32 with full marks. **Escalates:** single → back-to-back → hop-hop-**SKIM** (the – is a held
  ribbon) in Arch Falls → no marks on the climb → heaving Big Jim's eyestalks → **the level's final input** (§6.2).

### 5.3 Foam Skim *(B21 Dune Surf Sustain): the Verse-2 mode*
- **Do:** glowing **foam ribbons** lie on downhill surfaces (wet cave chutes, toppling arch spans, the whale's back).
  **Hold ↓ for the whole ribbon**: Crabbe belly-surfs, collects its herring line, and passes under the low ceilings
  (hanging nets, cave lips) that line every ribbon, which is the physical reason to hold. Standing early = ceiling
  bonk. **Release at the lip** (last half-beat launch zone) for a kick-out pop; pressing hop also works. Gaps after
  ribbons are sized so a late release still clears, just lower.
- **Music:** each ribbon is **a held note** (slide-guitar or bass sustain): length = note length, hue = pitch. Your skim
  plays the slide on that pitch and your release lands on the rest. **Telegraph:** the length shows 3+ beats ahead and
  the lip glows.
- **First:** Verse 2 bars 33–40. **Escalates:** 1-bar ribbons → 2-bar with a mid-ribbon float (skim + claw) →
  hop-hop-SKIM → falling arch spans and the whale's back.

### 5.4 Wave Flats *(A-M17 Flying Flats)*
- **Do:** cut-out boards of the chart's **engraved curly waves**, visibly flat, with a stagehand's pole glimpsed below
  (the chart performing itself). They **slam down on the beat** (solid until the "and") and **lift on the offbeat**
  (intangible). Sets alternate (A on 1 and 3, B on 2 and 4), so you pogo flat-to-flat with 1-beat hops over open sea.
- **Music:** stomp = down, hat = up; the screen breathes with the groove. **Telegraph:** a wooden rim **clack 1 beat
  before** each slam, plus the flat's shadow sharpening on the water.
- **First:** Verse 1 bars 17–24, crossing the surf channel. **Escalates:** every beat → mixed 1/2-beat gaps (∪ ∪ –
  spacing) → gulls riding flats → **"concept of delay" payoff: Big Jim's claws slam and lift in exactly this pattern
  in the outro**, so the player already knows how to cross them.

### 5.5 Wooden-Spoon Catapults *(C-M17 Spoon Catapults)*
- **Do:** giant wooden spoons rest on pivot rocks as see-saws (the booby prize for last place, now the underdog's
  weapon), each with a payload: a herring crate, a huge float, or a dozing gull. **Land on the handle** (the kick) and
  the payload arcs along a dotted preview to hit its target exactly **1 beat later** (the backbeat), or 2 for big
  arcs. Targets: **oil drums** (floor-tom **BOOM**), **bell buoys** (cowbell **CLANG**), gulls ahead (clears them), or
  the next spoon's handle (chain). A missed spoon is just ground; an off-beat landing gives an off-beat BOOM.
- **Music:** kick → backbeat cause-and-effect. You add the stomp break's accents, and chains roll *boom-boom-CLANG*.
  **Telegraph:** dotted arc and lit target 2+ beats ahead, plus a wood creak as the spoon comes on screen.
- **First:** Stomp Break bars 57–60. **Escalates:** single → a chain of 3 (bars 61–64) → in the build, a spoon flings a
  gull into another gull.

### 5.6 Stalactite Melody *(C-M8)*
- **Do:** a *call-and-response* on the boogie riff in the sea cave. **Call bar:** a row of chalk and ice stalactites
  deep in the cave (mid layer) plays the riff itself, each glowing and dripping as it rings (water-bell / high-piano
  tone). **Response bar:** the same notes hang over *your* path at their grid positions; bonk each on time with the
  Claw's upward arc or by hopping into it. **Pitch = height:** low notes hang in claw reach, high notes need hop +
  claw, so the melody's contour picks the verb. Missed notes leave a hole with no penalty (the base stem keeps a
  ghost).
- **Music:** the producer **omits the lead riff in response bars** (§7), so *your* bonks are the riff. **Telegraph:**
  the call bar itself, plus a rim-light 1 beat ahead.
- **First:** Verse 2 bars 41–48. **Escalates:** 4 quarters → 8th-note phrases with a hop between → **no call** on the
  outro reprise (played from memory).

### 5.7 Flotsam Jam *(C-M22 Log Jam Build)*
- **Do:** during the 8-bar build, the storm tide rams flotsam (driftwood, crates, barrels, a capsized boat, snarled
  nets) into the mouth of the Great Arch. **One layer slams in per bar** on the downbeat, forming the next, higher step
  of a rising staircase as you keep running right, while the water (the Breaker's flood form) rises below. At the top
  the **cracked keystone** glows. **Claw it on bar 72 beat 4**, into the silence (your "plunger"): **KRAK**, and **the
  drop hits on bar 73**. The player causes the drop; if you miss, the flood breaks it anyway, with no bonus.
- **Telegraph:** the crack spreads one segment per beat over the last 4 beats like a fuse; layer shadows land 1 beat
  early. **Appears once:** bars 65–72, the bridge into Arch Falls.

---

## 6. Enemies, set-pieces, wild cards

### 6.1 Enemies and the boss

**Cue Gulls** *(A-E3 Flag-Wavers)*: Big Jim's enforcers
- **Look:** stout black-backed gulls in flat caps, on bollards, boat prows, arch tops, wave flats, or Big Jim himself.
  Each holds a pool cue with a **white truce flag** tied on.
- **The trick** (the fake-peace original, kept): **on the offbeat** the truce flag billows toward you, all friendliness,
  and it's a **soft bounce platform** (land on it for a trampoline pop onto an optional high route of herring and
  floats). **On the beat** the gull whips the cue round and **jabs** with a **magenta**-chalked tip and a squawk.
- **Counter:** claw on the jab beat (claw beats cue). The gull is flung into the background and **joins the background
  gull chorus**, waving its truce flag on the offbeat (the world is the band). Otherwise the jab hits and you stumble.
- **Telegraph:** the gull chalks its cue and puffs its chest, with a rising squawk 1 beat before each jab.
- **Escalates:** singles on "HEY!" → pairs on "HEY! HEY!" → feints that wave for 3 beats and jab only on the phrase's
  "HEY!" → gulls on bobbing boats and flats → the outro line, one per beat, on Big Jim's claws.

**Echo Slickers** *(merge of C-E11 Wax Mimics + B-E4 Echo Robes)*
- **Look:** empty yellow oilskin slickers and sou'westers drifting with sleeves flapping; the only face is a pale,
  **wax-sheened mask** with magenta pupils. The sea cave's echo made visible.
- **Rule:** each Slicker performs **your previous bar's inputs, one bar later** (same beats, hops and claws). Its sounds
  are your SFX, delayed and cave-reverbed (a musical canon), and your previous bar floats above it as scansion marks,
  so you can *read your own echo*. Touching one = stumble; an off-unison claw passes through the empty oilskin.
- **Two ways to beat one:**
  - **Unison clash** (Echo Robes' "bait with your own rhythm"): Slickers hang in your path at the beat you'll arrive.
    Claw on the same beat it echo-claws (i.e. *repeat* last bar's rhythm) and the claws meet, **CLACK!** The coat
    collapses and the mask spins away.
  - **Bait into hazards** (Wax Mimics' "compose a safe path"): a Slicker under an icicle cluster jumps when you jumped
    last bar, and gets snagged and torn.
- **Design law:** Slickers are always placed so that *repeating the song's shout pattern* beats them. Players who follow
  "HEY! HEY!" win without doing maths; players who get the canon can bait them for style.
- **First:** bars 45–48 as harmless reflections in cave pools, miming you 1 bar late (the "aha"). They block in Chorus 2
  (bars 49–56), with one cameo in the outro.

**Urchins** *(hazard)*: black spiny balls with magenta tips, on the ground or hanging in nets; the basic "spike".

**BIG JIM** *(the boss, the payoff of both set-pieces)*: a colossal king crab, barnacle-crusted and kelp-draped, with
gull nests on his back, so that asleep he passes for a sea stack. Two gigantic claws (each taller than the screen when
raised), tiny mean eyes on stalks, a driftwood toothpick, magenta spine tips and pincer edges. **Not a health-bar
fight: he is level geometry and spectacle**, the reference's "giant set-piece character that is also the level" [S14].
He appears on the chart at the cold open, as his Rock on the horizon all level, wakes at the summit (bar 88), is the
outro gauntlet's surface, and ends up folded into the chart.

### 6.2 Set-pieces

**ARCH FALLS** *(A-S2)*: the climax, Final Chorus bars 73–88.

| Bars | What happens |
|---|---|
| 73–78 | The drop splits the Great Arch. Down the coast toward Big Jim's Rock, a chain of six arches **topples like dominoes, one per bar on the downbeat** (stomp + crash). Each fallen span leaves its legs standing as **new stacks**. Run the arch tops, **skim down each toppling span** on held notes, and hop pillar-to-pillar on "HEY!" beats. Gulls ride the arch tops, and float lines snap |
| 79–80 | A **2-bar drum fill**. The last two arches fall on the fill's accents with 1-beat pillar hops, and the final one smacks into Big Jim's Rock. The Rock *twitches* |
| 81 | On the crash, **a whale breaches** under the last falling span. It catches you (generous landing zone) and you **skim its back** |
| 82 | The spout launches you onto **Big Jim's Rock** |
| 83–88 | **The vertical climb.** Rising ledge-hops on every beat (~100 px gain per beat, camera tilts up) over barnacle ledges and gull nests chattering the hats. Hup-Hup-HEY against gulls with **no scansion marks**. The surge rises beneath |
| 88 (summit) | You plant your claw on the peak and the "stack" shudders. Two enormous claws rise from the sea on either side and the camera pulls wide into the sunset: **the Rock is Big Jim** |

**SCREEN FOLD FINALE** *(B-SP7)*: outro bars 89–96, with Big Jim as the target.

| Bars | What happens |
|---|---|
| 89–90 | **Gauntlet on Big Jim.** His two claws slam down and lift in the Wave-Flat pattern. You hop claw to claw with a Cue Gull line (one jab per beat) riding them. The Breaker becomes his claw sweep |
| 91–92 | Two **Hup-Hup-HEY** phrases up his face, heaving on his eyestalks (no marks). He reels. This is **the hardest 4 bars of the level** (bars 89–92) |
| 93–94 | The parallax layers slide into one plane. Parchment, engraved rhumb lines and a compass rose sweep in, and the world becomes the six-panel sea chart. **Big Jim is flattened back into his margin sea-monster drawing** and scrabbles at the paper. You run the chart through a herring shower while the whole engraved beach of crabs does the stadium wave for *you*. The song's role reversal, told without words |
| 95 | Panels 1–4 fold shut on beats 1–4. You hop panel-to-panel as each folds beneath you into a tilted platform |
| 96 | Panels 5–6 fold on beats 1–2 (HUP, HUP) as you hop them. On **beat 3 (HEY!)** you claw-leap off the last panel as **the chart slams shut on Big Jim** on the final hit |
| After | Crabbe lands on the folded chart: band pose on the ringing chord, the choir on cowbell and piano, the gulls now waving *orange* flags, and a small fiddler crab waving back at him. **You cannot die in bars 93–96**: a missed hop lands on a lower panel as a stumble |

**Bookend:** the level *begins* with this chart unfolding (§7, cold open).

### 6.3 Wild card: Your Woolwork *(C-X2 Performance Sampler)*
The results screen is the chart reopening with your run **embroidered across it as a sailor's woolwork picture** (the
19th-century sailors' folk art). One panel per act. Your route is one stitched line: on-grid actions are neat satin
stitches, Perfects gold thread, misses knots, stumbles tangles. Herring become tiny silver fish, the choir's peak a
crowd of stitched crabs along the bottom, and Big Jim is stitched squashed in the fold, under a ribbon reading "DON'T
MESS WITH CRABBE" with your cup. Every run stitches a different picture. **Export PNG** to share.

### 6.4 Wild card: Scansion Notation *(A-X4)*
Upcoming rhythm is marked **on the world** in poetic metre: black flint set in the chalk (real chalk has flint bands),
tar on boat hulls, knots in nets. **∪** = short = 1 beat (usually a hop). **–** = long = 2 beats (claw heave or skim
hold). **|** = bar line, a tar stroke on the ground at every downbeat, always on as a quiet metronome. A mark glows teal
on its beat and fills gold on a Perfect. **It teaches, then leaves:** full marks at each mechanic's first appearance,
bar lines only on reprises, **nothing** on the climb and the Big Jim gauntlet. It returns over Echo Slickers (your own
echo, written out).

### 6.5 Adoption ledger (nothing rejected)
| Drawn | Became | Special quality kept |
|---|---|---|
| A-W2 Stack Coast | the erosion-cycle spine; Big Jim's Rock | Caves boom the kick, gulls chatter the hats, lighthouse marks the bar |
| B-H6 Crabbe (+ B7) | underdog hero; the Wave = the claw; the choir | One giant claw; the crowd syncs to you |
| B21 Dune Surf | Foam Skim | A hold verb for held notes |
| C-M17 Spoon Catapults | Wooden-Spoon Catapults | Delayed kick→backbeat payoff, chains (plus the underdog's booby prize) |
| A-M1 Pyrrhic Double | Hup-Hup-HEY! | A 3-hit *phrase* (short-short-long) |
| B2 Star Pierce | Glass-Float Snip | Pendulum alignment on the beat; visible trophy stack |
| C-M22 Log Jam Build | Flotsam Jam | The player causes the drop |
| C-M8 Stalactite Melody | the same, in the sea cave | You play the hook by platforming |
| A-M17 Flying Flats | Wave Flats → Big Jim's claws | Cut-out pistons; the screen breathes |
| A-S2 Arch Falls | the climax, ending on Big Jim's Rock | Domino collapse to a drum fill, whale breach, vertical climb |
| B-SP7 Screen Fold | the finale (and the opening), folding on Big Jim | World folds panel-by-panel; leap off as it slams |
| C-E11 + B-E4 | Echo Slickers (merged) | Replays your last bar; beaten with your own rhythm |
| A-E3 Flag-Wavers | Cue Gulls | Truce flag on the offbeat, weapon on the beat |
| A-X4 Scansion | flint/tar metre marks | Diegetic, learnable notation |
| C-X2 Perf. Sampler | Your Woolwork | Embroidered, unique, shareable record of your run |

**No rejections.** Echo Slickers are **on probation** (Fun Risk 2) with a defined fallback.

---

## 7. Level structure + song spec (for the producer)

**Bar counts are tempo-independent.**
- **Constant tempo, 4/4, 150–170 BPM** (producer's call). The engine derives everything from BPM.
- Times below assume **160 BPM**: bar = 1.500 s, beat = 375 ms, 8th = 187.5 ms.
- 96 bars = **2:24 at 160**, 2:34 at 150, 2:15 at 170.
- **Put key/scale per section in `beatmap.json`**, because all pitched SFX read it. An optional key lift for the final
  chorus is fine if it's recorded there.

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
Times are at 160 BPM from the bar-1 downbeat. 🔦 = checkpoint beacon.

| # | Bars | Time | Song | Level (act / chart panel) | New idea |
|---|---|---|---|---|---|
| 0 | — (+bar 0) | ~4 s | Surf, gulls, bell-buoy ambience. The chart unfolds on 6 soft stomps, and panel 6 shows the BIG JIM sea-monster. **Pressing Claw starts bar 0**: a 4-beat cowbell + stomp count-in, with a gang "HEY!" on beat 4 | **Panel 1, the Beach**, pre-dawn. Crabbe raises his claw, three sleeping crabs wake and wave, and Big Jim's Rock sits on the horizon | Claw = the music's trigger |
| 1 | 1–8 | 0:00 | **Intro.** 1–4: fuzz boogie riff alone (plus stomp). 5–8: + bass, piano, cowbell, full kit. The Breaker rises on bar 5 | Beach, dawn. Herring arcs on the riff/piano (1–4). **Floats** swing on the backbeats (5–8). A crab beach ripples after every on-beat claw. **Zero threat** | Herring; Float Snip |
| 2 | 9–16 🔦9 | 0:12 | **Verse 1a** | **Panel 2, the Headland** clifftop. Urchins and chalk gaps, safe version then lethal. **Full scansion** | Hop over urchins and gaps |
| 3 | 17–24 🔦17 | 0:24 | **Verse 1b.** The stomp tightens to every beat | Down to the surf channel: **Wave Flats** | Wave Flats |
| 4 | 25–32 🔦25 | 0:36 | **Chorus 1** (template) | The harbour, morning. **Cue Gulls** on the HEY beats (C2, C4), a stop-time gull/float line (C5–C6), **Hup-Hup-HEY** (C7–C8, full marks). Zoom out. Big Jim's Rock twitches on the stabs | Cue Gulls; Hup-Hup-HEY |
| 5 | 33–40 🔦33 | 0:48 | **Verse 2a.** Sparser, cave-wet mix. **Slide-guitar held notes**, 1–2 bars each (bars 33–34, 36–37, 39–40), over a bass sustain. **Full stop on bar 32 beat 4** before the cave | **Panel 3, Sea Cave** mouth, then chutes. **Foam Skim** ribbons match those held notes | **Skim (mode)** |
| 6 | 41–48 🔦41 | 1:00 | **Verse 2b: call/response.** The riff plays on a high piano / bell timbre in bars 41, 43, 45, 47; **the lead riff is omitted in bars 42, 44, 46, 48** (ghost at −18 dB) | **Stalactite Melody**. Bars 45–48: Echo Slickers appear as harmless pool reflections | Stalactite Melody |
| 7 | 49–56 🔦49 | 1:12 | **Chorus 2**, cave reverb on the shouts. **Bar 56 beat 4: silence** | The cave's great hall. **Echo Slickers** block on the HEY beats, plus gulls, floats, a short skim. Bar lines only | Echo Slickers |
| 8 | 57–64 🔦57 | 1:24 | **Stomp Break** *(added)*: floor-tom + cowbell + handclaps + gang "HEY"s, the Black Betty stomp. **Big accents left as ghosts in the base stem** at the player slots: 57–60 on beat 3 (+60 b1); 61 b2-3-4; 62 b3; 63 b2-3-4; 64 b1 | **Panel 4, Buoy Ledge** under the Great Arch, storm gathering. **Wooden-Spoon Catapults** onto oil drums (BOOM) and bell buoys (CLANG): singles (57–60), chains (61–64). A breather with agency | Spoon Catapults |
| 9 | 65–72 🔦65 | 1:36 | **Build** *(added; the showdown, using verse-3 melody material)*. Tom roll doubles every 2 bars (quarters 65–66 → 8ths → 16ths → roll 71). Riff climbs, and the "HEY!" chant grows each bar. **A big hit on every downbeat.** **Bar 72: b1 HEY!, b2 HEY!, b3–b4 total silence** | **Flotsam Jam** climb, storm peak. Claw the keystone on **72 b4** (only your KRAK and "HEY!" are heard) | Flotsam Jam |
| 10 | 73–80 🔦73 | 1:48 | **FINAL CHORUS, first half. THE DROP on 73 b1** *(the role-reversal chorus)*. Full power, harmony guitar. The dominoes land on each downbeat. **Bars 79–80 are a 2-bar drum fill** replacing C7–C8's band | **Panel 5, ARCH FALLS.** The storm tears open into sunset | (combination) |
| 11 | 81–88 🔦81 | 2:00 | **Final chorus, second half.** **The biggest crash of the song on 81 b1** (whale). C7–C8 (87–88) Hup-Hup-HEY ×2. **Bar 88 b3–4: a big sustained chord + low "roar" swell** (Big Jim wakes) | Whale → spout → **climb Big Jim's Rock** (no marks). The summit reveal on 88 | (combination) |
| 12 | 89–92 🔦89 | 2:12 | **Outro gauntlet.** Double-time energy: **"HEY!" on every beat** (89–90), then HUP-HUP-HEY ×2 (91–92) | **Panel 6, Big Jim.** Claw-piston hops, a gull line, a stalactite-riff reprise with no call (icicles on his shell), eyestalk heaves. **The hardest 4 bars** | (mastery) |
| 13 | 93–94 | 2:18 | Band drops to **stomp + piano only**: a breath | The world becomes the chart, Big Jim flattened, the stadium wave for Crabbe | — |
| 14 | 95–96 | 2:21 | **Full band.** 95: a hit on every beat (hook fragment). 96: **HUP (b1), HUP (b2), HEY! (b3) = FINAL HIT**, full chord, ring out ~4 s with cheering crabs and gulls | **Screen Fold** on Big Jim. Panels fold on 95 b1–4 and 96 b1–2; leap on 96 b3 | Finale (can't die) |

**Total:** 96 bars ≈ 2:24 of music at 160 BPM (≈ 2:30 with pickup and tail, ≈ 2:34 with the cold open). There are 11
checkpoints, one every 8 bars.

**How this remaps the song.** The original's form is intro → verse → chorus → verse → chorus → verse → final
(role-reversal) chorus. We map it as:

| Original | Our cut |
|---|---|
| Intro | Intro |
| Verse 1 | Verse 1, extended to 16 bars |
| Chorus | Chorus 1 |
| Verse 2 | Verse 2, cave, with held notes and call/response |
| Chorus | Chorus 2 |
| Verse 3 (the fight) | **Stomp Break** (added) + **Build** (verse-3 material) |
| Final chorus | Final chorus ×2 (the Arch Falls drop and Big Jim reveal) |
| — | **Outro** (added: gauntlet, fold, final hit) |

### Deliverables for the music producer
**Stems**, sample-aligned, same length:

| Stem | Contents |
|---|---|
| `base` | Stomp, drums, cowbell, bass, rhythm guitar, piano comping. Includes the stomp-break ghost accents and the −18 dB ghost riff in bars 42/44/46/48 |
| `lead` | Fuzz lead, piano melody, slide sustains. **Empty in bars 42, 44, 46, 48** |
| `shouts` | All gang "HEY!/HUP!". The game scales its volume with the choir |
| `bonus` | Harmony lead guitar + extra piano/organ layer, **played through the whole song**. The game fades it in only during BIG CATCH mode |

**One-shots**, in the song's key/scale: Crabbe "HEY!" (×3 variants), choir "HEY!" layer, "HUP!" (×2); hop cowbell
"tonk" (2 pitches); slide-guitar sustain per scale degree + release scrape; glass float chime per degree; stalactite
bell per riff note; piano herring ladder per degree; oil-drum BOOM and bell-buoy CLANG; gull squawk (rising wind-up +
jab clack); flat telegraph rim-clack; keystone KRAK; whale breach; Breaker roar loop; Big Jim roar + claw slam;
cold-open ambience loop.

**`beatmap.json` lanes:** beats, bars, sections, key/scale; kick/stomp, snare/clap, cowbell; **shouts** (type + time);
**stops** (silence ranges); **sustains** (start, end, pitch: these become the skim ribbons); **riff notes** (time,
pitch, call/response flag); stomp-break player slots.

---

## 8. Fun risks (top 5) and how we test them

1. **Idea overload: the level becomes a quiz.** There are 7 mechanics, 2 enemies, 2 set-pieces and a boss in ~2:24.
   - **Test:** 5 fresh players, one blind run each. Log deaths per segment and ask "what were the moves?".
   - **Pass:** each player names hop/claw/skim; no segment, including the Big Jim gauntlet, averages more than 3
     deaths.
   - **If it fails, cut in this order:** Echo Slicker bait rule → spoon chains → flag-bounce high route → gull feints.
     Density comes out before any verb does.
2. **Echo Slickers are confusing at 150–170 BPM.** The one-bar canon is a planning puzzle in a sprint.
   - **Test:** grey-box Chorus 2 in isolation with 5 players.
   - **Pass:** more than 70% clear it by the 3rd attempt untold, and players describe them as "they copy me".
   - **Fallback:** Slickers become harmless echo dancers (visual/musical canon only) and Chorus 2 uses gulls. That
     would be our one rejection.
3. **The held run feels off-grid, or the vertical sections break the grid.** Surge rubber-banding may feel mushy. The
   jam and climb trade runway for height, and at 170 BPM the runway may drop below 1.2 s.
   - **Test:** telemetry of grid offset per bar (human and autoplay), and measured runway per section.
   - **Pass:** median |offset| < 0.1 beat, surge recovery ≤ 4 beats, runway ≥ 1.2 s everywhere.
   - **If it fails:** make auto-scuttle the default, and lower the climb gradient or add zoom-out.
4. **"Playing the song" doesn't land.** An instrumental must still carry the famous chorus hook, synth "HEY!"s may
   sound cheap, a cowbell on every hop may grate, and the choir/stem reward may be inaudible.
   - **Test:** blind A/B of a run with vs. without player SFX and stem scaling. Check that stalactite response bars and
     stomp slots don't sound broken when missed.
   - **Pass:** at least 3 of 5 recognise the song within the first chorus, and at least 4 of 5 prefer "with SFX".
   - **If it fails:** strengthen the hook in the lead mix, re-record shouts with real voices, and swap the hop cowbell
     for a woodblock.
5. **Readability at speed.** White chalk against white foam; 24 choir crabs plus gulls plus floats around an 84 px
   hero; engraved Wave Flats vs. the sea; and **Big Jim filling the screen** so hazards hide against his shell.
   - **Test:**
     - a greyscale + blur screenshot test per section;
     - a 0.5 s freeze-frame quiz ("point at what hurts / what to claw");
     - a 25%-scale thumbnail check of Crabbe.
   - **Pass:** at least 90% correct in the quiz.
   - **If it fails:** cap the visible choir at 12, thicken ground edge lines, desaturate Big Jim's body so only his
     magenta pincers pop, and give Wave Flats a bright rim.
