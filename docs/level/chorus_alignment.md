# Chorus alignment + the chorus speed-up (iteration 9)

User playtest feedback (top priority):

- "Have it so that the game speeds up and the music a bit louder just during the chorus."
- "The things you do in the game during the chorus [should] line up with the beat of the music."
- Earlier: "On the chorus there's a strong beat and things should line up with that a bit."

The edit has three choruses (the full song's chorus 2 is cut):

| Chorus | Chorus bars (beats) | Tag (beats) |
|---|---|---|
| chorus 1 | 23-30 (88-120) | 120-124 |
| chorus 3 | 52-59 (204-236) | 236-240 |
| chorus 4 | 69-76 (272-304) | 304-308 |

## 1. The speed-up

- **Level items.** Each chorus has a `speed` item with `from` = the chorus downbeat, `to` = the tag's downbeat, and `mul` = `CHORUS_SPEED` (1.25). The helper is `chorusSpeed()` in `level/dsl.ts`.
- **Ramps.** The speed ramps in with a smoothstep over the beat before the downbeat, so Slim is at full speed ON the downbeat. It ramps back out over the tag's first beat.
- **The mapping.** World x is now `x(beat) = ∫ ppb · m(b) db` (`level/beatx.ts`, `RuntimeLevel.xAt / beatAt / ppbAt`). It replaces `beat × ppb` everywhere a position comes from a beat:
  - the builder
  - token arcs
  - the music line
  - the Burn
  - the bot and the judge's lag
  - mechanics, the renderer and the debug overlay
  - `slack` / `rubric`
- **Run speed.** Run speed is `ppb(beat at the hero) × BPM / 60`. It is sampled half a sim step ahead (the midpoint rule), so the hero doesn't drift off the grid through a ramp.
- **Jumps.** Jumps keep their airtime in beats, so every jump flies 25 % further in px and pits authored in beats keep their timing. The hero's hitbox is smaller in beats at the higher speed, which costs about 5-10 ms per side on a lethal window. The iteration-9 fits absorb that (§3).
- **Camera.** The camera pulls back with the speed: zoom ÷ (1 + 0.6 × (mul − 1)) = ×0.87 at full speed, leading the speed by 2 beats (`cameraZoomAt`, `SPEED_ZOOM`). The runway ahead keeps its time: rubric E1 ≥ 1.21 s everywhere.
- **Presentation hooks.**
  - Polled state: `game.speedMul` (at the hero), `game.chorusK` (0..1 by the song beat, ramps with the speed) and `game.chorus` (the zone).
  - The `chorus` game event fires on each edge.
  - `level.speedZones` lets you schedule ahead on the audio clock. The audio agent's chorus lift reads the zones.
  - Speed lines, the foreground whip and parallax follow the run speed by themselves.
  - The speed layer's `boost` was already 1 in the chorus.

## 2. The measured accent pattern

**Method.** `librosa` onset strength on the full mix, on a < 200 Hz low band, on a 1-5 kHz mid band and on the HPSS percussive part. Each was sampled at every grid position of every chorus bar (all three choruses and their tags: 27 bars), normalised per bar, and cross-checked against the beat-map lanes. The script is re-runnable: `tools/music/.venv/bin/python playtest/chorus_accents.py`.

Onset strength normalised per bar (bar max = 1), mean over bars:

| Position | 1 | &1 | 2 | &2 | 3 | &3 | 4 | &4 |
|---|---|---|---|---|---|---|---|---|
| Chorus, full mix | 0.55 | 0.14 | **0.89** | 0.23 | 0.51 | 0.41 | **0.67** | 0.42 |
| Chorus, low band | 0.80 | 0.30 | 0.92 | 0.35 | 0.75 | 0.55 | 0.71 | 0.49 |
| Chorus, percussive | 0.63 | 0.23 | **0.88** | 0.35 | 0.64 | 0.51 | 0.67 | 0.51 |
| Chorus, RMS (dB below the bar peak) | −1.0 | −7.0 | −0.5 | −6.9 | −1.6 | −5.0 | **−0.3** | −6.6 |
| Verse, full mix (contrast) | 0.58 | 0.21 | 0.71 | 0.30 | 0.70 | 0.48 | 0.61 | 0.37 |

- **The strong beat is the chorus backbeat.** Beat 2 stands clear (0.89) and beat 4 is second (0.67). In the verses, beats 2 and 3 are equal.
- **Lanes.**
  - The kick and stomps are on 1 and 3 (27 / 26 hits).
  - The snare and claps are on 2 and 4 (27 / 25).
  - The gang shouts are on 93 · 94 · 102, 209 · 210 · 218 and 277 · 278 · 286.
- **The three biggest hits of every chorus** fall on beat 2 of chorus bars 2, 5 and 8, at 2.0-2.6 × the chorus's median beat:

  | Chorus | Bar 2, beat 2 | Bar 5, beat 2 | Bar 8, beat 2 |
  |---|---|---|---|
  | chorus 1 | 93 | 105 | 117 |
  | chorus 3 | 209 | 221 | 233 |
  | chorus 4 | 277 | 289 | 301 |

- **The swung "and"s are weak** in the chorus (0.14-0.42). Two exceptions: the band's push on the &3 of bar 2 in choruses 3 and 4 (210.66: 1.4 ×; 278.66: 1.9 ×), and the &4 of bar 8, the push into the tag (119.66, 235.66, 303.66: 1.0-1.2 ×). A strike on 278.66 can't be used: the next strike (279) is only 0.34 beat later, inside the strike's active window, so it fires ~70 ms late.
- **Other exceptions.**
  - The walkdown bar (bar 7) is strongest on 1 (112, 228 and 296: 1.2-1.7) and hits every quarter.
  - The tags peak on their 2 (121, 237: 1.6).
  - Tag 3 also peaks on its fill's &4 (239.66: 1.2).

## 3. The chorus choreography: HOP ON THE KICK, STRIKE ON THE SNARE

- **Hops on 1 and 3.** Every press in a chorus body lands on a quarter note. Hops, jumps and lethal pits go on the kick (1, 3).
- **Strikes on 2 and 4.** Strikes (goons, bats, bottles, lamps) go on the snare (2, 4).
- **The biggest targets on the biggest hits.** The three big hits carry the biggest targets:
  - chorus 1: the jabber on 93, the big lamp on 105, the crate on 117
  - chorus 3: the batted pop on 209, the big pin on 221, the big pin on 233
  - chorus 4: the Bluffer on 277, the big neon on 289, the penthouse glass wall (giant) on 301
- **The resulting groove.** Each bar reads ∪ X ∪ X. The variety comes from what the hop or strike is (pit, launch, slide, lamp, goon, crate, giant) and from the speed.
- **Exceptions (kept on purpose):**
  - the walkdowns (a blow on every quarter)
  - the hook rides and the zip, where you can't hop, so the ride strikes on every beat
  - the knee-slide on the held note (on the snare)
  - the drop / launch downbeats
  - chorus 4's single "and": the whisky glass on 303.66, on the band's push into the tag (bar 8's &4 is an accent in every chorus, 1.0-1.2 ×)
- **What moved.** "and" presses that used to sit in the choruses moved onto the beat or were removed. In chorus 1 alone that was 90.66, 95.66, 98.66, 99.66, 106.66, 107.66, 110.66, 118.66 and 119.66. Choruses 3 and 4 lost 213.66, 223.66, 279.66 and 282.66.
- **Strikes that were on the kick** became hops or were removed: 102 (a jabber), 210 and 226 (pins), 274 (a crate), 278 (the second Bluffer) and 286 (a neon). The ones inside rides stay.
- **The tags** keep the groove at a walk: hop, strike, hop, strike. Tag 3 keeps its fill's &4 big pin.

## 4. Difficulty (the same iteration)

The fits are widened toward about −105/+165 ms (`slack.mjs`).

- **Before:** most lethals were −85..−95 / +150. The tightest were −70 (92, 126, 284) and −80 (106, 208, 294).
- **After:** most lethals are −100..−115 / +155..+165. The exams stay tighter:
  - 92: −95 (chorus 1's peak)
  - 280 and 284: −90 / −95 (chorus 4)
  - 126 (the lifts): −85
- **Also eased:**
  - the second chorus-4 Bluffer (it is a hop now)
  - the fists (`SLAM_TOP` late edge 0.26 → 0.3)
  - the posts (`POST_TOP` ±0.3)
- **Expected deaths** (`slack` physics model, ±130 ms bot) fall from 6.25 to 3.35: per act, 2.0 / 1.4 / 2.8 → 1.0 / 0.8 / 1.6. Act 3 stays the hardest.
