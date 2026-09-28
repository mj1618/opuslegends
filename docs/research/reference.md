# OpusLegends: Design Reference

*Research compiled for the team, 2026-09. It covers Rayman Legends' music levels, the wider rhythm-action genre, 2D platformer game feel, and short-level pacing. Everything here serves one goal: make our single level FUN.*

**How to read this.** Each section ends with **→ For us**, a list of concrete takeaways. Numbers are given wherever a source has them. Claims tagged **[obs]** come from gameplay observation or community knowledge rather than a written source, so check them against footage before relying on them. Claims tagged **[rec]** are our own recommendations derived from the research, not quotes from anyone. Sources are listed at the end, numbered like **[S12]**.

---

## 0. TL;DR (one screen)

- **The level is the chart.** Rayman's music levels work because obstacles, enemies and lums sit on a beat grid. A player who just runs well and reacts naturally lands on the beat without thinking about "rhythm". The music is a *navigation aid*, not a test [S3][S2].
- **The player performs the song.** Footsteps, lum pickups, punches and jumps make sounds snapped to the music's grid and chosen to fit the song, so good play *sounds* like the song [S4][S16].
- **Be lenient about inputs and generous about rewards.** NecroDancer went from a 20% timing window to effectively 100% plus auto-calibration because demanding accuracy under stress "is just frustrating" [S10]. Hi-Fi Rush syncs attacks to the beat no matter when you press, and pays a bonus for pressing on the beat [S13].
- **Restart friction kills rhythm games.** Bit.Trip Runner sent you back to the level start on any hit and was called "extraordinarily unforgiving". Runner 2 added mid-level checkpoints [S18][S19]. Sayonara Wild Hearts rewinds a few seconds and offers a skip after repeated failure [S22].
- **Structure follows the song.** Quiet intro, then music drops in on a player action. One verb gets taught per phase. The final chorus is the climax, and the ending is a spectacular launch followed by a band pose [S1][S3].
- **Web-specific:** the Web Audio clock is the only trustworthy clock. Latency varies by device (Bluetooth adds 100–300 ms), so calibration is mandatory infrastructure [S30][S31].

---

## 1. Rayman Legends music levels in depth

### 1.1 Origin and production process
- **Origin.** Michel Ancel played a dev build while listening to Trust's "Antisocial" and "immediately, a synergy happened". He told the team to put "as much emphasis as possible on the music/game synchronisation" (sound designer François Dumas) [S4]. That song later became *Dragon Slayer* [S1].
- **Tooling.** Mathieu Pavageau (senior sound programmer) built a music-to-level sync system [S5][S6]. It let the team "write kind of a music sheet which the level designers would be able to use as a grid in order to 'rhythm' their levels" [S4]. **Level designers placed geometry on a musical grid.** That grid is the core technique.
- **Hand-made, iterated heavily.** Ancel: "we did a lot of iterations because it's not so easy to synchronize"; "it's a lot of work", hand-synced between artists and designers [S7]. Composer interviews compare it to syncing music to film [S3].
- **SFX quantization.** In Origins' music world, footstep sounds were "getting snapped on the music's semiquavers beat, resulting in a in-sync rhythm when running" [S4]. Every sound was scaled to fit the composition so the level would "play like a melody" [S4].
- **Genuine failure.** Ancel insisted "you can really fail: you have the feeling that you are still playing a normal game" [S7]. It is a platformer first, not a rhythm game with a platformer skin.
- **Song selection.** Ancel: "If the song is repetitive you are doing the same thing over and over in the game. 'Eye of the Tiger' is perfect because you have events and beat changes. The best is when the song goes up and down or the guitar slides because then the character can slide" [S3]. The 2026 remake (Retold) audio director says they pick instantly recognisable tunes, often one-hit wonders, because "it instantly gives you a smile" [S8].
- **Silence as a tool.** In Retold, the score deliberately cuts out before a section: "Introducing short breaks works even better when it restarts, you enjoy it even more" [S8].

### 1.2 The shared formula
Assembled from wiki descriptions of every level [S1] and the Mariachi Madness breakdown [S3]:

| Element | How it works |
|---|---|
| **Cold open** | Every level starts quiet. The music begins on a *player trigger*: Castle Rock "shortly" after you start, Gloo Gloo when you dive into the water, Dragon Slayer "when the first chain of Lums is collected", Grannies when platforms begin to collapse [S1]. |
| **Chaser** | A "force from behind" appears as soon as the music starts: a large flame in Castle Rock, a "fiery force" in Mariachi, a visible deadly force in Gloo Gloo. "The heroes cannot stop running" [S1]. The player controls movement, but the chaser enforces tempo. |
| **Forward only** | Left-to-right sprint. There is no backtracking and no exploration during the song. |
| **Lums = melody** | Lums sit on guitar accents and along the ideal trajectory. In Mariachi's chain section, lums across 5 chains "seem to be a depiction of the individual notes of the solo guitar", laid out like a musical staff [S3]. Lums also show the path, in this game and in normal Rayman levels [S9]. |
| **Punch = accents** | "Attack that top row of enemies in time with the main accents of the guitars" [S3]. |
| **Jump = main beat** | "Jump onto the main beat of the music to stay on one of the two worms without the spikes" [S3]. |
| **Slide = glissando** | Slides map to long melodic lines and guitar slides [S2][S3]. |
| **Crash = cymbal** | "Drum crashes match the character smashing obstacles", and even "lightning with cymbal clashes" in the background [S2]. |
| **World plays along** | Enemies are "jamming or singing along to the tune" and are mostly harmless set dressing, like a band [S1]. The Black Betty cover replaces the lyrics with enemy gibberish [S8]. |
| **Hazards on beat** | Cannons fire helicopter bombs that destroy wooden platforms. A dragon breathes fire that is "very easy to avoid" [S1]. The level showcases hazards more than it makes them hard. |
| **Ending** | A bumper launches you "into the background on top of a few defeated enemies where they pretend to play an instrument to end the level" (Castle Rock, Grannies) [S1]. The finish is a performance, not a flagpole. |
| **Score** | Lum-count cups. Castle Rock uses bronze 75, silver 150, lucky ticket 225, gold 300. Orchestral Chaos and Mariachi use 150, 300, 450, 600 [S1]. Replay value comes from collecting everything. |
| **Length** | Roughly 2–3 minutes each **[obs]**. |

### 1.3 Level-by-level notes
- **Castle Rock** ("Black Betty" cover, world 1, the first music level, difficulty not rated on wiki): flame chaser, jamming Lividstones and Franckys, cannons that wreck wooden platforms, a forest dragon, chain slides, bumper, band pose [S1]. It's the *gentle* one: lots of showcase, little threat. It is the most loved **[obs]**.
- **Orchestral Chaos** (original composition, 3 skulls): "a bit more difficult than Castle Rock". Players "alternate between jumping and just keep running from platform to platform". There are chains, Darkroots that "appear more often as the players advance", and rain arrives late as a mood shift [S1]. The escalation comes from *density* of the same hazard.
- **Mariachi Madness** ("Eye of the Tiger", 4 skulls). This is the best-documented structure [S3]:
  1. Intro: collect lums on each accented guitar stroke, with no threats. The phase exists to teach the rhythm.
  2. Punch a row of enemies on the guitar accents.
  3. Jump on the main beat between spiked and safe worms.
  4. Chain-switching to dodge spiky balls. Lums are laid out like notes on a 5-line staff.
  5. Chorus with kazoo melody: trumpet enemies, and trumpets that shrink and un-shrink you. This is a **twist mechanic**.
  6. **Climax on the chorus ending**: Rayman is "repeatedly cannoned through the air by those trumpets".
  7. Final gauntlet: "rapidly beat a line of enemies, once again in time with the music". The hardest part comes *after* the spectacle.
- **Gloo Gloo** ("Woo Hoo" by the 5.6.7.8's, 4 skulls): the music starts on diving in. It has a swimming section with a visible force behind you, then a land section with a warship firing bombs, chain-to-chain and platform-to-platform, bouncy flowers, and it ends on a sail [S1]. It changes *locomotion mode* mid-song.
- **Dragon Slayer** ("Antisocial" by Trust, 5 skulls): starts in silence and the music begins on the first lum chain. It uses grapples, stacked Minotaurs to punch, fireworks mushrooms, and alternating rooms. Then comes a wall-run, then dragons used as moving platforms, then dragons chasing and breathing fire near the final bumper [S1]. It escalates to *riding the threat*.
- **Grannies World Tour** (a remix of Origins' "Chasing a Dream"/Livid Dead theme, 3 skulls): **no enemies**, only spikes, bones, pits and mines. Grannies play instruments in the background [S1]. It proves a music level can be pure movement.
- **8-bit editions** (world 6, "Living Dead Party"): the same levels with visual degradation. Castle Rock gets a fish-eye lens, noise and sepia. Orchestral gets TV static covering the whole screen at times. Mariachi and Dragon Slayer get pixellation that intensifies over the stage. Gloo Gloo gets a blue monochrome tint. The final Grannies uses every effect plus an upside-down screen and a screen split into 4ths and 16ths [S1]. The design intent is to make you play by ear [S11]. Reception was split: some players mastered it, others called it "absolutely obnoxious" and said they "couldn't see anything" [S11][S12].
- **Retold (2026 remake)** adds new music levels to "Macarena" (a dancing luchador whose palms are bouncy platforms) and "Can't Touch This" [S8][S14; S14 is a low-reliability fan wiki]. The *big animated set-piece character that is also the level geometry* is a pattern worth stealing.

### 1.4 Speed, stopping, death, checkpoints
- **Speed.** The player runs normally, with no forced auto-run, but the chaser behind moves at the song's tempo. In practice you sprint the whole time **[obs]**. The level is laid out so that a full-speed sprint puts you at each obstacle on the right beat. This is why "the difficulty would be greatly increased if the rhythm didn't help guide you through" [S2].
- **Stopping.** The force catches you and you die [S1]. You cannot stall the song.
- **Death.** You respawn at the last checkpoint and the music resumes in sync from that point **[obs]**. Checkpoints sit roughly every 20–40 s **[obs]**.
- **Off-beat play.** No explicit penalty or judgement text. An off-beat punch still kills and a mistimed jump just follows physics. The level geometry is the only judge **[obs]**.

### 1.5 What players loved and what frustrated them
**Loved**
- "Absolutely impossible not to play without smiling". Reviewers called the execution among the best in any platformer [S15].
- Hearing the song you know, twisted and cartoonish: recognition gives an instant smile [S8].
- The feeling that you are *playing the song*. Every action triggers a musical element [S14][S2].
- The "perfect marriage of music and movement": "no more satisfying a feeling" when you nail it [S2].
- Short, replayable, and fun to master for lum cups [S1].

**Frustrated**
- **Not enough of them.** This was the main review complaint [S15]. Replays give no new reward once the Teensies are collected [S15].
- **The 8-bit visual degradation.** Obscuring the screen reads as artificial difficulty to many players [S11][S12].
- Memorisation-heavy late levels where hazards appear abruptly, forcing trial and error **[obs]**.

### → For us (Rayman)
1. Build the level on a **beat grid** that designers can see in the editor, and snap every placement to it.
2. Give each song phase **one verb** tied to **one instrument**: jump on kick or snare, punch on guitar accents, lums on the melody, slide on glides, crash on cymbals.
3. Start silent. Drop the music on a player action. End with a launch into a band pose.
4. The chaser enforces tempo, so the song never stalls. Death costs a few seconds, not the song.
5. Put the spectacle on the chorus climax and the hardest skill test just after it.
6. Make the world a band: enemies and backgrounds animate on the beat and are mostly harmless.
7. Don't degrade visibility for difficulty. If we want an "ears only" moment, keep it short, fair and optional.

---

## 2. The wider rhythm-action genre

### 2.1 Game-by-game: what to steal and what to avoid

| Game | The hook | Steal | Avoid |
|---|---|---|---|
| **Bit.Trip Runner 1/2/3** | Auto-run. Jump, slide and kick make notes. Power-ups add music layers (Hyper → Mega → Super → Ultra → Extra) [S18]. | Music **layers added as a reward** for good play. Removing moves that overwhelmed playtesters [S19]. "Let the tempo of the music guide you" [S20]. Checkpoints in Runner 2, with a score bonus for jumping *over* them [S21]. | Runner 1's full restart on any hit ("extraordinarily unforgiving") [S18]. |
| **Geometry Dash** | One-touch auto-runner synced to music. Instant restart and an attempt counter. | Instant restart. **Practice mode** with checkpoints [S23]. Visual events on drops. | The music restarts from 0 on every attempt, which makes the intro miserable by attempt 30 **[obs]**. |
| **Crypt of the NecroDancer** | Move on the beat. A missed beat means no move. | Window widened from 20% (100 ms at 120 BPM) to ~100%. **Auto-calibration** by leaky integrator, bounded to ±0.5 beat. Enemies move *on* the beat alongside you. "If the game tells them that they're wrong, in the heat of battle, they get frustrated" [S10]. | Strict windows under stress. |
| **Rift of the NecroDancer** | 3-lane rhythm game where "monsters with unique behaviors" define the rhythm patterns [S24]. | **Enemies as notes.** Each enemy type encodes a rhythm (2 hits, lane hop, and so on), so players read gameplay objects, not notes. Four difficulty tiers. | |
| **Thumper** | "Rhythm violence": a fixed-speed track and an escalating, oppressive score. | **Distinct sound per obstacle type** that telegraphs it. Success sound matches the telegraph sound. The "perfect" timing tier adds extra feedback and rumble. Perfect turns became the high-score skill layer [S25][S26]. | Cascading failures: discordant miss noise can spiral into more misses [S26]. That's fine for "rhythm hell", wrong for our tone. |
| **Sayonara Wild Hearts** | A "pop album video game" with one stick and one button. The level follows the song's ebb and flow. | Level design "plays by the same rules as songwriting" [S27]. On death, **rewind a few seconds** to a checkpoint. **Skip offer** after a few failures, which purists can turn off [S22]. **Simple shapes, distinct colours, strong contrast between danger and reward** at speed [S28]. Spectacle "while not losing the feeling of being in constant control" [S28]. | |
| **Hi-Fi Rush** | A full action game where on-beat inputs amplify attacks. | **Attacks sync to the beat regardless of input; on-beat presses add damage and score** [S13]. The whole world pulses (the cat metronome, the environment). All animation authored at 120 BPM with key poses on beats, then time-scaled to other tempos [S29]. BPM changes create difficulty and variety [S29]. | |
| **Metal: Hellsinger** | Rhythm FPS. The Fury multiplier (2x/4x/8x/16x) adds instrument layers, and **vocals come in only at max** [S32]. | **The best music is the reward.** Layer changes use "delay and smoothing to keep it from being overly jarring" [S32]. Weapons are instruments. | |
| **Patapon** | 4-beat drum commands with call-and-response. The screen border pulses on the beat. A combo triggers **Fever** [S33]. | A peripheral pulse as the metronome (a border or frame). A streak-based power state with a visual and musical payoff. | |
| **Rhythm Heaven** | 60–90 s minigames, each teaching one rhythm concept. Playable with eyes closed [S34]. | **Audio-first cueing**: every action has a unique sound cue *before* it. Call-and-response. One button. Short remixes that combine earlier concepts (Sayonara cites these remixes as influence) [S27]. | |
| **Beat Saber** | Notes fly at you. Note Jump Speed and "half jump duration" set how long a note is visible [S35]. | **Reaction time is a design parameter.** Notes spawn a fixed time ahead. Shorter makes it tense and precise, longer makes it cluttered [S35]. | |
| **Just Shapes & Beats** | Dodge-only bullet hell on the beat. 3 HP per track (6 on bosses). A dash with i-frames [S36]. | **Health instead of one-hit death.** Brief invulnerability after a hit. Checkpoints rewind the song only when *everyone* is broken [S36]. Pink means danger, always. | |
| **Pistol Whip** | Auto-moving VR shooter where enemies appear at choreographed points [S37]. | **Choreographed patterns** of enemy position and timing that feel "intuitive, fun, and repeatable". Beat cues on *everything*: HUD, environment, props, gun distortion, enemy brightness [S37]. | |
| **Sackboy: A Big Adventure** | Platformer music levels to licensed pop. | Songs split into **stems and sections** and re-choreographed around player location. SFX **adapt to the song's key** and sync to beats [S16]. Songs need a set tempo and clear sections [S17]. | |
| **Mario Wonder (Ninji Jump Party)** | Jump every 4th beat to earn coins. After 4 consecutive on-beat jumps "the atmosphere" improves [S38]. | **Small streak payoffs** that change the world. Their dev note: level designers didn't know metre and sound staff didn't know level design, so they swapped roles to learn each other's craft [S38][S39]. | |
| **Sound Shapes** | Collecting notes adds them to the level's loop, so the level *is* a sequencer **[obs]**. | Collectibles that **build the arrangement**. | |
| **Melody's Escape / Spin Rhythm XD** | Tracks generated from any audio (Melody's); a spinning-track rhythm game with generous windows (Spin) **[obs]**. | Intensity drives speed and visuals. | Procedural charts feel generic next to hand-authored ones. |

### 2.2 Timing windows

Real numbers from the genre:

| System | Windows (± ms around the beat) |
|---|---|
| ITG / StepMania | Fantastic 21.5 · Excellent 43 · Great 102 · Decent 135 · Way Off 180 [S40] |
| osu! | 300: 80 − 6·OD · 100: 140 − 8·OD · 50: 200 − 10·OD. At OD5 that is ±50 / ±100 / ±150 [S41] |
| NecroDancer | Initially 20% of the beat (±50 ms at 120 BPM). Final: about the full beat, plus auto-calibration [S10] |
| Hi-Fi Rush | Action happens on the beat regardless; timing only affects bonus [S13] |
| Human A/V sync | Detectability threshold: audio 45 ms early to 125 ms late. Acceptability: +90/−190 ms [S42] |

**Rules [rec]:**
- **Separate "did it work" from "was it on beat".** Whether the jump clears the gap must depend only on physics, coyote time and input buffers, never on a timing grade. The timing grade only affects score, lums, streaks and music layers.
- Proposed grades: **Perfect ±45 ms, Great ±90 ms, Good ±135 ms**, otherwise no bonus. Scale up at tempos above 150 BPM.
- **Asymmetric is fine.** Players tend to press slightly early at high tempo, so give the early side about 10–15 ms more.
- Keep windows **constant in ms, not as a fraction of the beat**, so difficulty doesn't jump with tempo changes.
- Note that a 16th note at 140 BPM is 107 ms. Adjacent 16th-note actions *overlap* at ±90 ms, so resolve each input to the nearest unconsumed target.

### 2.3 Latency and calibration (browser)
- **One clock.** Derive all gameplay time from `AudioContext.currentTime`, the audio hardware clock. Never use frame counts or `setTimeout`. Schedule audio with a lookahead: wake roughly every 25 ms and queue about 100 ms ahead ("A tale of two clocks") [S30][S31].
- **Output latency.** Subtract `ctx.outputLatency` (plus `baseLatency`) where available to know when a sample is *heard*. Bluetooth headphones commonly add 100–300 ms, and no API reports this reliably **[rec]**.
- **Input timestamps.** Use `KeyboardEvent.timeStamp`, which is on the `performance.now()` timeline, mapped to audio time with `ctx.getOutputTimestamp()`. Rendering frames add 8–16 ms of jitter otherwise **[rec]**.
- **Calibration.** Offer an audio tap test ("tap on the click", 8–16 taps, take the median) and a separate visual offset (flash sync) the way NecroDancer does [S10][S43]. Also offer an **auto-calibration** option: a slow leaky average of the player's mean error, bounded (NecroDancer bounded it at ±0.5 beat) [S10].
- **Visuals should show the audible time**: what's drawn should match what's heard, not what's scheduled.
- Players find calibration surprisingly hard [S43]. Make it short, skippable and replayable from the pause menu.

### 2.4 Telegraphing upcoming beats
- **Constant lead time.** Beat Saber treats "reaction time" (ms from spawn to hit) as a first-class parameter [S35]. **[rec]** Keep interactables readable on screen **1.2–2.0 s** before contact, meaning about 2–4 beats at 120–140 BPM. The camera has to show that much runway (see §3.5).
- **Audio pre-cues.** Thumper plays a distinct sound per obstacle type as it appears, which builds muscle memory [S26]. Rhythm Heaven is playable with eyes closed because every action is cued by sound first [S34]. **[rec]** Give each enemy type a wind-up sound one beat before its hit beat.
- **Lums as the racing line.** Lum trails show the path and the timing (§1.2) [S3][S9].
- **Diegetic metronome.** Hi-Fi Rush has its cat and pulsing world [S13]. Patapon has a pulsing screen border [S33]. Pistol Whip puts beat cues in the HUD, floor, props and enemy brightness [S37]. The whole world should bounce on the beat so players can feel it peripherally.
- **Colour language.** Danger, reward, player and neutral must each have a unique colour and shape and stay strongly contrasted at speed [S28]. JSB never breaks "pink = hurts" [S36].
- **Call and response.** Patapon and Rhythm Heaven use this [S33][S34]. An enemy performs a rhythm, then the player answers it. It teaches without text.
- **Teach through safety first.** Rayman's lum-only intro teaches the rhythm before any threat appears [S3]. Show a harmless version of a pattern, then the lethal version (the "concept of delay" in Rayman level design) [S9].

### 2.5 Feedback and layering the player into the music
- **Quantize action SFX to the grid.** Rayman snaps footsteps to 16ths [S4]. **[rec]** If an input is early, schedule its sound on the next 16th. If it's late, play it immediately. Players forgive a sound that is a little early far more than a laggy one.
- **Make SFX pitch-aware.** Sackboy's SFX adapt to the song's key [S16]. **[rec]** Give lum pickups a pitch ladder drawn from the song's scale (for example the chord tones of the current bar), so a lum run plays an arpeggio.
- **Reward with music.** Runner adds layers as the multiplier rises [S18]. Hellsinger holds back the vocals until 16x [S32]. **[rec]** Maybe: the base track always plays, streaks add a lead or vocal stem, and a miss fades it out with smoothing, never a hard cut.
- **Feedback tiers.** Thumper uses success, perfect (extra sound plus rumble) and failure (discordant) [S26]. **[rec]** For us: Perfect gets a sparkle, a pitched "ding" and a 1-frame flash. Good gets the normal sound. Off-beat still works physically but loses the sparkle. **Never punish a miss with a harsh noise** unless it is actual damage.
- **Show the rating diegetically first**: particles, lum colour, character animation. Text popups ("PERFECT!") should be small and optional.

### 2.6 Flow and difficulty ramps
- **One concept per level, or per phase**, introduced then developed then twisted then concluded (kishōtenketsu, Hayashida) [S44]. Rhythm Heaven teaches one or two concepts per 60–90 s game [S34].
- **Escalate density before new verbs.** Orchestral Chaos makes Darkroots "appear more often as the players advance" [S1].
- **Change the locomotion mode for variety.** Gloo Gloo goes from swimming to land. Dragon Slayer adds grapples, a wall-run and riding dragons. Runner 3 adds vehicles and free-movement segments to "break monotony" [S1][S20].
- **Breathing room.** Low-stakes stretches between intense ones [S9]. Put musical breaks before re-entries [S8].
- **Tempo as difficulty.** Hi-Fi Rush raises BPM for harder sections [S29]. Only do this if the song itself changes tempo.
- **Remove verbs that overwhelm.** Runner cut moves after playtesters struggled [S19].

### 2.7 Failure and restart friction
- **Full restart is the classic mistake.** Runner 1 did it and Runner 2 fixed it with checkpoints [S18][S21].
- **Fast rewind.** Sayonara rewinds a few seconds [S22]. **[rec]** Respawn in under 1 s, on a **bar boundary**, with a **1-bar count-in** (the music rewinds to one bar before the checkpoint). The player re-enters the groove before the next obstacle.
- **Skip offer.** Sayonara offers to skip a section after a few failures and lets purists disable the prompt [S22]. **[rec]** After 5 deaths in one section, offer a skip at the cost of that section's score.
- **Health instead of one-hit death.** JSB gives 3 HP with i-frames [S36]. **[rec]** Consider a "stumble" instead of death for minor hazards: lose lums, the chaser gains ground, the music loses a layer. Only pits and the chaser kill.
- **Practice mode** (Geometry Dash) [S23]: player-placed or automatic checkpoints for mastery runs.
- **Honour the song on success.** Hard failure should be rare enough that most first-time players hear most of the song on their first try **[rec]**.

### 2.8 Spectacle moments
- **Launches on drops.** Mariachi's trumpet-cannon climax on the chorus end [S3]. Dragons as platforms in Dragon Slayer [S1].
- **A giant set-piece character that is also the level**: Retold's dancing luchador whose palms are bouncy platforms [S14].
- **Camera moves as music events.** Sayonara's camera follows action "automatically and dynamically". The same movement "will feel radically different depending on how far away the camera is" [S28].
- **Environmental hits on accents**: lightning on cymbal crashes, wind on soft passages [S2].
- **Silence, then the drop.** Retold's music breaks [S8] and Rayman's cold opens [S1].

---

## 3. Game feel ("juice") for 2D platformers

### 3.1 Controller numbers: Celeste (public source)
Celeste's `Player.cs` is public [S45]. It runs at 320×180 with 8 px tiles and 60 fps.

| Constant | Value | Note |
|---|---|---|
| MaxRun | 90 px/s | ≈ 11 tiles/s |
| RunAccel / RunReduce | 1000 / 400 px/s² | Reaches full speed in about 0.09 s. Snappy. |
| AirMult | 0.65 | Air control is 65% of ground control |
| Gravity | 900 px/s² | |
| **HalfGravThreshold** | 40 px/s | While jump is **held** and \|vy\| < 40, gravity × 0.5 (a floaty apex) |
| MaxFall / FastMaxFall | 160 / 240 px/s | Holding down gives a faster fall |
| JumpSpeed | 105 px/s | |
| **VarJumpTime** | 0.2 s | Holding jump keeps the upward speed for up to 0.2 s (variable height) |
| JumpHBoost | 40 px/s | Horizontal kick on jump |
| **JumpGraceTime (coyote)** | **0.1 s** (6 frames) | |
| **Jump buffer** | **0.08 s** (5 frames) | From the full game's input code, widely cited but not in the public file **[obs]** |
| UpwardCornerCorrection | 4 px | Bonk a corner and you get nudged around it |
| Wall-jump reach | ~2 px (super: ~5 px) | From Thorson's thread [S46] |

Derived **[rec]**: a full jump rises about 28 px (≈3.5 tiles) in about 0.36 s. The whole arc takes about 0.7 s.

Other forgiveness from Thorson's thread [S46]: dash corner correction, a semi-solid boost, **lift momentum storage** (jumping off a moving platform adds its speed, kept for a few frames), and stamina refunds.

**Super Meat Boy**: near-instant respawn, very short rooms, and a replay of all deaths at the end, which turns failure into comedy **[obs]**.
**Rayman Origins/Legends**: no public tuning data found. Its feel is heavy acceleration into a fast sprint, a long floaty helicopter descent, and generous ledge grabs **[obs]**.

### 3.2 Jump math tied to the beat (the key trick for us)
From Pittman's GDC talk [S47]: define the jump by **peak height h** and **time to peak t_h**, or by distance to peak x_h at run speed v_x:

```
v0 = 2h / t_h          g = 2h / t_h²
(with x_h = v_x·t_h:)  v0 = 2h·v_x / x_h,   g = 2h·v_x² / x_h²
Falling gravity is usually 1.5–3× the rising gravity for a snappy, less floaty arc.
```

**[rec] Beat-locked jumping.** Choose the airtime *in beats*: for example, a full jump lasts exactly 2 eighth notes (1 beat), and a long jump lasts 2 beats. Then derive t_h and g from the BPM. A jump pressed on a beat then **lands on a beat**, so chained jumps automatically groove. With auto-run speed `v` px/s, define **pixels-per-beat** = `v × 60/BPM` and snap all level geometry to that grid, subdivided into 16ths. This is the Rayman "music sheet as grid" in code form [S4].

Worked example at 140 BPM: beat = 428.6 ms, 16th = 107 ms, bar = 1.714 s. At v = 480 px/s, one beat = 206 px of travel. A 1-beat jump covers 206 px horizontally, t_h = 214 ms. With h = 120 px, g = 2·120/0.214² ≈ 5240 px/s² and v0 ≈ 1120 px/s. That is fast and punchy, suitable for a 1080p render scaled down.

### 3.3 Hitstop in a rhythm game
- In fighting games, hitstop scales with hit strength (Smash: more damage means longer hitlag) [S48]. Typical hitstop is around 4–12 frames at 60 fps **[obs]**.
- **Critical [rec]:** our world position is a function of *song time*. **Never freeze the simulation clock.** Hitstop must be *cosmetic*: freeze the victim sprite and the hero's pose for 40–80 ms, flash white for 1–2 frames, and add a small camera kick, while the level keeps scrolling with the music. Alternatively, make the pause exactly one 16th and speed up to catch up, but that is riskier.
- Use it sparingly: on punches and big crashes, not on lums.

### 3.4 Screen shake norms
- Eiserloh's trauma model [S49]: keep `trauma ∈ [0,1]`. Each hit adds 0.2–0.5. Trauma **decays linearly**. **Shake = trauma² (or ³)**, so trauma 0.3/0.6/0.9 gives 3%/22%/73% shake. In 2D, apply translation plus rotation. Use **Perlin noise, not white noise**. "Camera shake is like salt."
- **[rec]** Max offset around 1–1.5% of screen height, max rotation around 2°, decay about 1.5 trauma/s. Offer an accessibility slider, with 0 allowed.
- **Beat bump [rec]**: a tiny 1–2% zoom pulse or 2–4 px vertical kick on the kick drum. It works as a metronome. Make it separable from damage shake.
- **Camera kick** (Nijman): nudge the camera opposite the action direction on punches [S50].
- Smoothing: `x += (target − x) · k` with k ≈ 0.1 per frame at 60 fps (Eiserloh: 0.01 is slow, 0.1 fast, 0.5 very fast). Horizontal and vertical can differ, and so can up and down [S49]. Scale k by dt.

### 3.5 Camera for an auto-runner
From Keren's taxonomy [S51]: position-locking, camera-window, auto-scroll, forward focus, dual forward focus, platform snapping, lerp smoothing, cue attractors, zoom-to-fit.
- **[rec]** **Lock X to song time, with the hero at 25–35% from the left edge.** That leaves 65–75% of the screen as forward view, which at 206 px/beat on a 1920-wide screen is about 6 beats of look-ahead. This satisfies the 1.2–2 s telegraph rule (§2.4).
- **Y**: platform-snapping plus an asymmetric lerp. Follow falls faster than rises, and don't bob on every jump.
- **Zoom-to-fit and attractors** for set pieces: zoom out 10–20% for the chorus and big launches, zoom in for quiet verses.
- Camera moves should be **timed to bars**: start zooms and pans on downbeats.

### 3.6 Juice checklist
From Nijman's "Art of Screenshake" [S50] and "Juice it or lose it" [S52], adapted:
- [ ] Squash and stretch on jump, land and punch (±15–25%)
- [ ] Dust puffs on land, footstep particles quantized to the 16ths
- [ ] Lum pickup: pop, sparkle, and a pitched note from the chord
- [ ] Hit: flash, cosmetic hitstop, knockback flung into the background (Rayman-style), camera kick
- [ ] **Permanence**: debris, craters and smoke that stay on screen
- [ ] Speed lines and trail at max speed, especially on launches
- [ ] Anticipation frames timed so that **key poses land on the beat**, as Hi-Fi Rush authored at 120 BPM [S29]
- [ ] Enemies and background props bob on the beat (the world is the band)
- [ ] "Meaning": the player can fail, which makes success feel earned [S50]
- [ ] Death animation that is fun to watch and short (<0.6 s)

---

## 4. Making one short demo level memorable

- **Peak-end rule [rec]** (Kahneman): people judge an experience by its peak and its end. Invest disproportionately in **one climax set piece** and **the final 10 seconds**.
- **Level structure = song structure** [S27][S17]. The song needs a set tempo and clear sections [S17]. The Mariachi template [S3]:

| Song section | Level role | Example beat |
|---|---|---|
| Silence / cold open (4–8 s) | Establish the hero and world, then the player triggers the music | Hero lands on the castle wall. The first lum chain starts the song. |
| Intro (8 bars) | Teach the rhythm with **zero threat** | Lums only, on guitar accents |
| Verse 1 | Verb 1 (jump on the snare) | Gaps, safe-then-lethal pattern |
| Pre-chorus | Verb 2 (punch on accents), chaser appears | Enemy row |
| Chorus 1 | Combine the verbs, first spectacle, zoom out | Launch pads on the hook |
| Verse 2 | **Twist** (new mode: slide, wall-run, grapple, shrink) | Gloo Gloo swim-to-land, Mariachi shrink |
| Break / bridge (drop the music or thin it) | Breather; show off the world | Retold's music break; visual-only moment |
| Final chorus | **Climax**: biggest set piece on the biggest hook | Trumpet cannons, riding dragons |
| Outro gauntlet | Hardest skill test, short | Punch line on the accents |
| Final hit | Launch into the background, band pose, results | Castle Rock ending |

- **Length:** Rayman's music levels run about 2–3 min **[obs]**. Rhythm Heaven's games run 60–90 s [S34]. **[rec]** 2:00–2:45 for us: long enough for an arc, short enough to replay at once.
- **Escalation ladder:** density → combination → new mode → spectacle → mastery. Don't introduce a new verb in the climax; the climax *rewards* verbs already learned.
- **One unforgettable "wow".** A giant animated character or set piece that is also the platforming surface (the luchador's palms, riding dragons) [S14][S1].
- **The ending moment** should be a *performance*, not a stop: launch, slow-motion catch, band pose on the final chord, then score cups (lum count, perfects, deaths). Offer "Play again" instantly.
- **Replay hooks:** lum cups (Rayman), streak-based music layers (Runner, Hellsinger), a hidden alternate route, and a "no-hit" or "all-perfect" badge.

---

## 5. Top 15 principles for OpusLegends (ranked by impact on fun)

1. **The level is the chart.** Place every jump, enemy, lum and hazard on a beat grid (pixels-per-beat). Natural, skilled play should land on the beat without the player trying [S4][S2].
2. **Actions are instruments.** Every player action makes a sound snapped to the 16th grid and fitted to the song's key or chord (footsteps, lums as melody, punches as accents), so good play sounds like the song [S4][S16].
3. **Forgive the input, reward the precision.** Physics success must never depend on a timing grade. Use coyote time of 0.1 s and a buffer of 0.08 s. Grades affect only score and music (Perfect ±45 / Great ±90 / Good ±135 ms) [S10][S13][S45].
4. **One clock, calibrated.** All timing derives from the Web Audio clock, compensating for output latency, with a quick tap calibration and optional bounded auto-calibration [S30][S10].
5. **Near-zero restart friction.** Respawn in under 1 s on a bar boundary with a 1-bar count-in. Checkpoints every 8–16 bars. Never restart the whole song for one mistake [S18][S22].
6. **Song structure = level structure.** Cold open, player-triggered drop, a teaching intro, verses that develop, a verse-2 twist, a breather break, a final-chorus climax, an outro gauntlet [S3][S1][S8].
7. **Read it early, read it clearly.** Keep a constant 1.2–2 s of visible runway. Give each hazard a unique shape, colour and wind-up sound one beat ahead. Danger and reward colours are sacred [S35][S26][S28].
8. **Tempo pressure, never a stall.** A chaser or auto-scroll keeps the song flowing. Standing still should be impossible or dangerous [S1].
9. **One verb per phase, then combine.** Teach jump, then punch, then slide, each tied to an instrument. Cut any move playtesters fumble [S44][S19].
10. **Beat-locked jump physics.** Airtime is set in beats (derived from BPM via Pittman's formulas), so jumps pressed on beats land on beats and chains groove [S47].
11. **The world is the band.** Enemies, props, background and camera bump on the beat. That peripheral metronome keeps players in time without UI [S13][S33][S37].
12. **Juice every hit, but keep the music clock sacred.** Squash and stretch, particles, flashes, trauma shake with Perlin noise, and cosmetic hitstop only [S49][S50].
13. **Music is the reward.** Streaks add stems (lead or vocals). Misses fade them out smoothly. The full song at full power is the prize for playing well [S18][S32].
14. **One unforgettable set piece at the climax.** The biggest hook of the song gets the biggest spectacle, a giant character or launch sequence that is also the platforming [S3][S14].
15. **End on a performance.** Launch into the background, band pose on the last chord, cups and stats, instant replay. The last 10 seconds define the memory (peak-end) [S1].

---

## 6. Open design questions (with trade-offs)

### Q1. Who controls speed?
| Option | Pros | Cons |
|---|---|---|
| **A. Pure auto-run** (Runner, Geometry Dash) | Perfect sync guaranteed. Position = f(song time). Trivially correct replays and checkpoints. Simplest to author. | Less "platformer agency". Rhythm is fully prescribed, so it can feel like on-rails QTEs. |
| **B. Player runs, chaser enforces tempo** (Rayman) | A real platformer feel, and Ancel's "you can really fail" [S7]. Allows small speed choices, secret routes and lum detours. | Sync only holds if the player sprints. Each obstacle needs slack of about half a beat. Authoring and QA are harder. |
| **C. Hybrid**: auto-run baseline, with the player able to nudge ±10–15% speed (catch up after a stumble) | Sync mostly guaranteed, with some agency and a comeback mechanic | Needs a "rubber band" back to grid position, or lums and SFX drift off the beat |

*Leaning [rec]: A or C for the first playable, because it is cheaper to make fun and guaranteed on-beat. Revisit B once the core loop is fun.*

### Q2. What happens off-beat?
| Option | Pros | Cons |
|---|---|---|
| **A. Nothing special**: physics only (Rayman) | Zero frustration, pure platformer | Rhythm mastery goes unrewarded, and some players never notice the beat |
| **B. Works, but less reward** (Hi-Fi Rush [S13]) | Accessible. Experts chase Perfects. Feeds score and music layers. | Needs clear but non-nagging feedback |
| **C. Action snaps to the beat**: the attack plays on the next beat or 16th | Always sounds great | Added input latency of up to one 16th feels mushy for **jumps**. Acceptable only for punches. |
| **D. Action fails** (NecroDancer's original design) | Very rhythm-pure | Frustrating under stress; NecroDancer itself retreated from it [S10] |

*Leaning [rec]: B for everything. C only for SFX and the punch impact frame, never for jump takeoff.*

### Q3. Fail states
| Option | Pros | Cons |
|---|---|---|
| **A. One-hit death + checkpoint rewind** (Rayman, Sayonara) | Clear stakes, simple | Death spam in hard spots. Needs very fast respawn. |
| **B. HP (3 hits) + i-frames** (JSB [S36]) | Keeps the song flowing. First-time players hear the whole song. | Lower tension. Players can brute-force. |
| **C. Stumble**: lose lums, a music layer and chaser distance; only pits and the chaser kill | Failure is felt in the music, which is thematically perfect | More systems to build. The chaser distance needs clear UI. |
| **D. No-fail** (score-only) | Maximally accessible | Rhythm games without stakes lose tension. Ancel explicitly wanted real failure [S7]. |

*Leaning [rec]: C with A for pits. Offer B or D as an assist mode.*

### Q4. On death, what does the music do?
Options: rewind to 1 bar before the checkpoint with a count-in [rec]; restart the section from its start (Rayman-style); keep playing while the player respawns downstream (JSB-style). Rewinding keeps sync trivially simple for auto-run. Keeping the music playing is less repetitive, but the player may re-enter mid-phrase.

### Q5. Checkpoint density
Every 8 bars (about 14 s at 140 BPM) is forgiving, every 16 bars is classic, and section boundaries only (~30 s) is Rayman-like. Tighter spacing means more repetition of less content. Consider tighter spacing before the climax and a skip offer after 5 deaths [S22].

### Q6. How many verbs?
Jump alone (Geometry Dash) is the purest. Jump, punch and slide (Runner, Rayman) give musical variety because each maps to an instrument. Adding dash, wall-run or grapple costs teaching time in a 2.5-minute level. *Leaning [rec]: 3 core verbs, plus 1 twist mode (for example grind or swing) for verse 2.*

### Q7. Judgement UI
Diegetic only (particles, colour, sound) keeps the screen clean, Rayman-like. Text popups ("PERFECT") are clear but cluttered and arcade-like. A streak counter plus music layers makes the reward audible. *Leaning [rec]: diegetic plus a small streak meter. Text off by default or subtle.*

### Q8. Adaptive music?
A fixed master track is simplest. Stems (base, lead, vocals or hook) need a song with stems, but deliver the Runner and Hellsinger reward [S18][S32]. Section-level re-arrangement (Sackboy [S16]) is the most flexible and needs the most authoring.

### Q9. Song choice and tempo
A recognisable cover gives the instant smile [S8] but raises licensing issues. An original track is free to shape and can be written *for* the level ([S1] Orchestral Chaos). Either way it needs a **fixed tempo, clear sections and "events and beat changes"** [S3][S17]. A tempo of 110–150 BPM suits running. Too slow feels floaty, and too fast makes 16th-note actions unreadable **[rec]**.

### Q10. Calibration UX
A mandatory calibration screen is accurate but adds friction before the fun. A default offset plus optional calibration is fast, but Bluetooth users suffer. Silent auto-calibration is invisible, but can drift or mislearn early mistakes; bound it as NecroDancer does [S10]. *Leaning [rec]: a smart default, auto-cal on, a one-tap "Calibrate" in pause, and a nudge if mean error exceeds 60 ms.*

### Q11. Difficulty options
Assist options: wider windows, HP mode, slower song (75% speed, pitch-preserved), skip-section. Mastery options: an 8-bit-style "ears only" remix (keep it fair [S11]) and a no-checkpoint run. For a demo, one tuned difficulty plus a quiet assist toggle is probably enough.

### Q12. Level length
Two minutes is replayable but short on arc. Three minutes or more allows two twists but risks fatigue and harder checkpoint pacing. *Leaning [rec]: 2:00–2:45.*

---

## 7. Sources

- [S1] Rayman Legends Wiki (Fandom), level pages via API: [Castle Rock](https://rayman-legends.fandom.com/wiki/Castle_Rock), [Orchestral Chaos](https://rayman-legends.fandom.com/wiki/Orchestral_Chaos), [Mariachi Madness](https://rayman-legends.fandom.com/wiki/Mariachi_Madness), [Gloo Gloo](https://rayman-legends.fandom.com/wiki/Gloo_Gloo), [Dragon Slayer](https://rayman-legends.fandom.com/wiki/Dragon_Slayer), [Grannies World Tour](https://rayman-legends.fandom.com/wiki/Grannies_World_Tour)
- [S2] PS4 Home, [Music and Gameplay in Rayman Legends](https://www.ps4home.com/music-and-gameplay-in-rayman-legends/)
- [S3] A. Pensler, [Deconstructing a Musical Level in Rayman Legends](https://medium.com/game-audio-lookout/deconstructing-a-musical-level-in-rayman-legends-985e9f6c2f4c) (Game Audio Lookout; includes the Ancel quote on song choice)
- [S4] Designing Sound, [Rayman: Fun, sound & music, an interview with François Dumas](https://designingsound.org/2017/12/06/rayman-fun-sound-music-an-interview-with-francois-dumas/)
- [S5] VGMO, [Christophe Héral interview](https://vgmonline.net/christopheheralinterview/)
- [S6] YourClassical, [Christophe Héral and Billy Martin on Rayman Legends](https://www.yourclassical.org/story/2014/03/05/chirstophe-heral-billy-martin-rayman-legends-top-score)
- [S7] Game Rant, [Rayman Legends interview with Michel Ancel](https://gamerant.com/rayman-legends-preview-interview/)
- [S8] TechRadar, ['It instantly gives you a smile…' Rayman Legends Retold audio director](https://www.techradar.com/gaming/it-instantly-gives-you-a-smile-because-you-know-the-track-rayman-legends-retold-audio-director-breaks-down-iconic-music-levels)
- [S9] O. Hadhoud, [Rayman Legends level design analysis part 1](https://omarhadhoud.wordpress.com/2018/06/28/rayman-legends-level-design-analysis-parrt-1/)
- [S10] Game Developer, [Game Design Deep Dive: Finding the beat in Crypt of the NecroDancer](https://www.gamedeveloper.com/audio/game-design-deep-dive-finding-the-beat-in-i-crypt-of-the-necrodancer-i-)
- [S11] PlayStationTrophies forum, [The 8 Bit Levels](https://www.playstationtrophies.org/forum/topic/300794-the-8-bit-levels/)
- [S12] NeoGAF, [LTTP: Rayman Legends 8-bit levels](https://www.neogaf.com/threads/lttp-rayman-legends-8bit-levels-wtf.838181/)
- [S13] Digital Trends, [Hi-Fi Rush director John Johanas interview](https://www.digitaltrends.com/gaming/hi-fi-rush-john-johanas-interview/); GDC, [Developing Hi-Fi RUSH Backwards](https://gdcvault.com/play/1034256/Developing-Hi-Fi-RUSH-Backwards)
- [S14] Rayman Legends Retold fan wiki (low reliability), [Music levels guide](https://raymanlegendsretoldwiki.wiki/music/rayman-legends-retold-music-levels)
- [S15] GodisaGeek, [Rayman Legends review](https://godisageek.com/2013/08/rayman-legends-review/)
- [S16] PlayStation Blog, [The music of Sackboy: A Big Adventure](https://blog.playstation.com/2020/12/14/craftworlds-highest-score-the-music-of-sackboy-a-big-adventure/); GDC, [Sewing a Musical Patchwork](https://gdcvault.com/play/1027224/Sewing-a-Musical-Patchwork-The)
- [S17] PlayStation Blog, [Why Sackboy is a must-play (music levels designed around songs)](https://blog.playstation.com/2023/04/13/platformer-multiplayer-and-music-fans-why-sackboy-a-big-adventure-is-a-must-play/)
- [S18] Wikipedia, [Bit.Trip Runner](https://en.wikipedia.org/wiki/Bit.Trip_Runner)
- [S19] Wikipedia, [Bit.Trip Runner development (moves removed after playtests)](https://en.wikipedia.org/wiki/Bit.Trip_Runner)
- [S20] Thumbsticks, [Designing Runner3: Alex Neuse interview](https://www.thumbsticks.com/designing-runner3-alex-neuse-interview/)
- [S21] Nintendojo, [Runner 2 review (checkpoints)](https://www.nintendojo.com/reviews/review-bit-trip-presents-runner-2-future-legend-of-rhythm-alien)
- [S22] Wikipedia, [Sayonara Wild Hearts](https://en.wikipedia.org/wiki/Sayonara_Wild_Hearts); Destructoid, [review](https://www.destructoid.com/stories/review-sayonara-wild-hearts-567611.phtml)
- [S23] Geometry Dash Wiki, [Practice Mode](https://geometrydash.wiki.gg/wiki/Practice_Mode)
- [S24] Game Rant, [Rift of the NecroDancer interview](https://gamerant.com/rift-of-the-necrodancer-interview-brace-yourself-games/)
- [S25] Game Developer, [How Thumper got its turns on track](https://www.gamedeveloper.com/design/how-i-thumper-i-got-its-turns-on-track); [Thumper GDC 2017 postmortem](https://thumpergame.com/blog/2017/3/18/gdc-2017-thumper-postmortem)
- [S26] SUPERJUMP, [The helpful, harmful sounds of Thumper](https://www.superjumpmagazine.com/the-helpful-harmful-sounds-of-thumper/)
- [S27] Nintendo World Report, [Talking Sayonara Wild Hearts with Simogo](http://www.nintendoworldreport.com/feature/51677/rhythm-heaven-goes-pop-talking-sayonara-wild-hearts-with-simogo)
- [S28] Apple Developer, [Behind the Design: Sayonara Wild Hearts](https://developer.apple.com/news/?id=33kvkagk)
- [S29] Game Anim, [Hi-Fi Rush music-synced animation (CEDEC 2023)](https://www.gameanim.com/2023/09/08/hi-fi-rush-music-synced-animation/)
- [S30] C. Wilson, [A tale of two clocks](https://web.dev/articles/audio-scheduling)
- [S31] MDN, [Web Audio API advanced techniques / scheduling](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- [S32] Game Developer, [How Metal: Hellsinger designed FPS harmonies](https://www.gamedeveloper.com/design/shredding-for-satan-how-i-metal-hellsinger-i-designed-fps-harmonies-in-hell); Xbox Wire, [Fuel the Music](https://news.xbox.com/en-us/2022/09/07/fuel-the-music-in-metal-hellsinger/)
- [S33] Patapon Wiki, [Fever Mode](https://patapon.fandom.com/wiki/Fever_Mode); Wikipedia, [Patapon](https://en.wikipedia.org/wiki/Patapon)
- [S34] Wikipedia, [Rhythm Heaven series](https://en.wikipedia.org/wiki/Rhythm_Heaven_(series))
- [S35] BSMG Wiki, [Intermediate mapping (NJS, HJD, reaction time)](https://bsmg.wiki/mapping/intermediate-mapping.html)
- [S36] JSB Wiki, [Game Mechanics](https://justshapesandbeats.fandom.com/wiki/Game_Mechanics)
- [S37] Road to VR, [Pistol Whip preview](https://roadtovr.com/pistol-whip-preview/); Steam, [Shoot to the beat? (dev comments on beat cues)](https://steamcommunity.com/app/1079800/discussions/0/1640927348815970554/?ctp=3)
- [S38] Super Mario Wiki, [Ninji Jump Party](https://www.mariowiki.com/Ninji_Jump_Party)
- [S39] Nintendo, [Ask the Developer Vol. 11: Super Mario Bros. Wonder](https://www.nintendo.com/en-gb/News/2023/October/Ask-the-Developer-Vol-11-Super-Mario-Bros-Wonder-Chapter-3-2461479.html)
- [S40] ITG Wiki, [StepMania judgements and timing windows](https://itgwiki.dominick.cc/en/software/stepmania-judgements)
- [S41] osu! wiki, [Overall difficulty](https://osu.ppy.sh/wiki/en/Beatmap/Overall_difficulty)
- [S42] Wikipedia, [Audio-to-video synchronization (ITU-R BT.1359)](https://en.wikipedia.org/wiki/Lip_sync_error)
- [S43] Steam guide, [Latency Calibration is Surprisingly Hard](https://steamcommunity.com/sharedfiles/filedetails/?id=3434111928)
- [S44] Game Developer, [The Structure of Fun: learning from Super Mario 3D Land's director](https://www.gamedeveloper.com/design/the-structure-of-fun-learning-from-i-super-mario-3d-land-i-s-director)
- [S45] NoelFB/Celeste, [Player.cs](https://github.com/NoelFB/Celeste/blob/master/Source/Player/Player.cs)
- [S46] Maddy Thorson, [Celeste game-feel thread](https://threadreaderapp.com/thread/1238338574220546049.html) / [Celeste & Forgiveness](https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1)
- [S47] K. Pittman, [Math for Game Programmers: Building a Better Jump (GDC 2016)](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Pittman_Kyle_BuildingABetterJump.pdf)
- [S48] SmashWiki, [Hitlag](https://www.ssbwiki.com/Hitlag); Sakurai, [Thinking about hitstop](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- [S49] S. Eiserloh, [Juicing Your Cameras With Math (GDC 2016)](http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf), [transcript](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt)
- [S50] J. W. Nijman, [The Art of Screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U) ([notes](http://notebook.maryrosecook.com/Theartofscreenshake,JanWillemNijman.html))
- [S51] I. Keren, [Scroll Back: The Theory and Practice of Cameras in Side-Scrollers](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers)
- [S52] M. Jonasson & P. Purho, [Juice it or lose it](https://www.youtube.com/watch?v=Fy0aCDmgnxg)
