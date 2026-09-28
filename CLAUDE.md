# OpusLegends

A single-level browser rhythm-platformer in the spirit of Rayman Legends' music levels
("Castle Rock" / Black Betty): the hero sprints through a level where jumps, punches,
collectibles and obstacles land on the beats of a fast, upbeat track.

**Sole goal: FUN.** A polished "AAA demo" level with a sick track and unique mechanics.
Every decision is judged by whether it makes the level more fun to play.

## How this repo is worked on (the loop)
- An orchestrator Claude runs iterations; each iteration is ~1 week of human work, delegated
  to sub-agents. After each iteration the orchestrator play-reviews the game for fun and picks
  the next best iteration.
- `docs/ITERATIONS.md` — log of every iteration: goal, what shipped, fun review, next step. Read it first.
- `docs/DESIGN.md` — the current creative bible (song, hero, world, mechanics). Source of truth for creative choices.
- `docs/research/` — raw research / idea pools. Ideas are chosen by: compile many -> filter bad -> pick randomly among good (avoid "mean" ideas).
- `docs/FUN_RUBRIC.md` — researched, measurable criteria for a fun music level. **Every iteration ends with a FUN
  REVIEW** against it (`docs/reviews/iterN.md`): score each criterion from level data, autoplay video/screens and
  sloppy-bot death logs, then rank fixes. The review's top findings pick the next iteration.
- User playtest feedback outranks everything. So far: first "boring, no challenge, nothing going on", then
  "too hard, not dynamic, very repetitive". Aim: Rayman-level — constantly busy and rewarding, fair difficulty,
  a new twist every few bars.
- Music: the game plays the ORIGINAL Jim Croce recording (user-supplied, gitignored under `assets/audio/licensed/`,
  never commit it). Our music pipeline (`tools/music/`) only makes the beat map, overlay reward stems and SFX.

## Sub-agent rules
- Stay inside the scope you were given; don't rewrite systems you weren't asked to touch.
- Keep `npm run build` and `npm run playtest` green before finishing.
- Update the relevant docs (this file's architecture section, DESIGN.md) when you change how things work.
- Commit your work with a clear message when done (unless told otherwise).

## Architecture
Vite + TypeScript (strict), no framework, Canvas 2D, Web Audio. No runtime dependencies.
Logical resolution 1920x1080, letterboxed, rendered at devicePixelRatio (backing store capped at 2880 px wide).
World y grows DOWN; the base ground top is y = 0.

**Time model (the heart of music sync — read `src/game/game.ts` header):**
- `audio/conductor.ts` is the master clock. Song time comes from the AUDIO clock
  (`getOutputTimestamp` → filtered ctx↔performance mapping), never from summed frame deltas.
  It supports a tempo map, beat/bar/cue callbacks, `play(fromSongTime)` (count-ins / checkpoint
  rewinds), tape-stop, and a user latency offset (`[` / `]`, stored in localStorage, `?latency=`).
  **Latency calibration** (iteration 4, `game/calibrate.ts`, `Tun.calib` / `Tun.autoLatency`): the cold open's
  "SYNC THE PROJECTOR" — 8 stick clicks at the song's tempo, tap STRIKE on each; offset = median error of the last 6
  taps vs the click's audible time (the SFX bus is late by the limiter look-ahead only), stored like `[`/`]`. It runs
  on the first STRIKE of a first-ever run (nothing stored; SPACE skips, a skip is stored too), on ↓ in the cold open,
  on X in the pause screen, and with `?calib=1`. In the run, an **auto-drift** nudges the offset by 0.35 × the median
  error of every 16 graded presses (≥ 18 ms bias, ≤ 8 ms per bar line, ±40 ms around the calibrated value).
  `Game.setLatencyMs(ms, store)` sets both the offset and the drift's centre.
  `conductor.outputDelay` = our graph's delay (the booth's 6 ms film delay line + the master limiter's look-ahead,
  measured at load: `AudioSystem.outputDelay`), subtracted from song time.
- **Tempo map everywhere**: the original recording is a live band with one tempo point per beat
  (161.5 → 166.6 BPM, 476 beats; the edit 344). `TempoMap` (`audio/tempoMap.ts`, binary search) converts
  beat ↔ time; nothing may assume a single BPM. Negative beats (count-ins) extrapolate the first tempo.
- The 120 Hz fixed-step sim is *slaved* to song time: each frame it steps until `simTime`
  reaches `conductor.time`; rendering interpolates. When no music plays (title, death) it runs on a
  wall-clock accumulator. Input edges are timestamped and applied on the exact step they belong to.
- Hitstop (contact only) freezes the world but not the music; the lost time ("debt") is repaid by
  simulating slightly faster right after (`Tun.strike.catchUpRate`), so the hero lands back on the beat.
  The Perfect "Freeze" is presentation-only (zoom punch + speed lines), never a sim freeze.
- **Catch-up surge** (`Tun.grooveLock`): holding forward while behind the music line gives up to +15%
  speed until back on the beat grid (~4.7 beats after a stumble). Never pushes ahead.
- Run speed is DERIVED from the tempo map every sim step: `Player.setTempo(spb(worldBeat))` →
  `runSpeed = pixelsPerBeat * BPM(beat) / 60`. Holding right = riding the music (positions stay
  x = beat × ppb; the surge's music line is `timeToBeat(worldTime) × ppb`). `RuntimeLevel.runSpeed` is
  only the start-beat reference (lum arcs are tempo-invariant in beat space).
- **Jump physics are in beats** (`Tun.jump.timeToApexBeats`): every tap ≤ `minHoldBeats` is the same
  ~0.93-beat hop (~92 px); hold 1 beat = ~1.96-beat jump (~250 px), at any tempo.
- **Timing judge** (`game/judge.ts`): each hop/strike PRESS is graded against the nearest intended
  action (Perfect ±33 / Great ±85 / Good ±135 ms, early +10). Grades drive score, feedback, the combo and the
  crowd (`game/crowd.ts`, skill meter → the music reward via `audio/stage.ts`) — never physics.
- **Game events** (`game/events.ts`, iteration 3): `game.events.on(type, fn)` — grade / miss / combo / crowd /
  fullHouse / stumble / death / burn (lunge, pull, caught) / setPiece / smash (giant index) / hint, emitted from
  the fixed-step sim. Pollable state: `game.crowd.{value,count,norm,bigCatch}`, `game.combo` / `comboPeak`
  (consecutive Great+), `game.chaser.{x,gap,lunge,danger,flare}`, `game.setPiece`. Presentation hooks here only.
- **Crowd = skill meter** (`Tun.crowd`): wakes at 8, Perfect +1 · Great +0.5 · Good +0.25 · Miss −2 · stumble −4 ·
  death −6, decays 0.4/beat, section caps (`crowd` items). FULL HOUSE (≥ 20) needs a near-clean chorus. A cap BELOW
  the meter (a new act's verse) never clamps: the excess glides down 1/beat (no FULL HOUSE → 16 cliff at a seam).
  **The drop** (`Game.chorusDrop`): a clean (all Great+) Hup-Hup-HEY in the 8 beats before a chorus cap (≥ 20), or a
  crowd item's `earn` beats graded Great+, fills the house 0.5 beat early so FULL HOUSE lands ON the chorus downbeat.
- **The Burn** (`Tun.chaser`, `Game.updateChaser`): its front sits `gap` beats behind the music line (rest 1.75).
  Every stumble PULLS it 0.75 beat closer, every missed reward 0.2 (after it rises), clean play relaxes it
  (+0.04/beat, +0.06 per hit); it LUNGES 0.3 beat on every drum fill (`fills` lane). Two stumbles close together
  (or a stumble into a fill) = caught. Checkpoints snapshot its gap; a respawn restarts it at rest (1.75, iteration 4:
  was 1.1 → catch-twice loops) and the first stumble after a respawn doesn't pull it (it only flares).
- **Failure hints**: only 3 first-appearance prompts in the level (`hint` items with an `icon`); anything else
  is taught by placement + `Game.FAIL_HINTS`, shown once after the player fails the same thing twice.
- **Mix** (`audio/audioSystem.ts`, `audio/mix.ts`): music (record at unity + overlay stems) → **projection
  booth** (`audio/booth.ts`) ┐ + SFX (+6 dB) → trim (**−4 dB headroom**, cancels the limiter makeup) → soft
  limiter (DynamicsCompressor, −2.5 dB) → tanh soft clip (safety, −0.6 dBFS ceiling: un-oversampled, so it sits low
  enough that act 3's stacked hits stay ≤ ~−0.2 dBTP) → master. The record (+ the stomps/claps stem) enters the
  music bus through the hush's **Squeeze** (`booth.ts`, below; transparent unless a hush is scheduled). The headroom
  keeps the hot record (peaks +0.75 dBFS, −10.5 LUFS) under the limiter so overlays + SFX add on top without
  pumping. Overlay stem buses carry zero-latency EQ + soft clip (`OVERLAY_RULES.eq/clip`).
- **The music is the reward** (`audio/stage.ts` StageAudio, levels in `audio/mix.ts` BOOTH / OVERLAY_RULES /
  GRADE_SFX). Game wires it with `StageAudio.forGame(audio, conductor)` + `stage.listen(game.events)`; API:
  `setCrowd(value, instant?)`, `onGrade(grade, beat, combo?)`, `onMiss(beat)`, `onStumble()`, `onDeath()`,
  `onCheckpoint()`. Crowd moves are quantized to the NEXT BEAT and glide over ~1 beat (setTargetAtTime; filters
  swept in cents via `detune`). Low crowd (3) = the booth: record band-limited 320 Hz–3.4 kHz (4th-order), a
  1.7 kHz horn honk, width 0.2, −3 dB, projector wow+flutter (delay line), clatter + crackle bed; open at 14;
  FULL HOUSE (20) = width ×1.15, overlays up (shouts 0 dB, stomps+claps 0 dB, cowbell +5 dB with presence EQ +
  clip), a cheer swell on the next downbeat and audience swells into vocal gaps. Grades: Perfect = jukebox bell
  on a chord tone (ping-pongs up the chord with the combo), Great = softer/duller bell, Good = silent; a missed
  REWARD = dull thunk on the next swung 8th + the film "snags" (music low-pass dip + 3 % pitch sag); stumble =
  record-scratch warble + audience "ooh"; death = tape-stop + groan; checkpoint = projector click on the beat.
  The film delay line rests at 6 ms: `AudioSystem.outputDelay` (= film + limiter) is the clock's
  `conductor.outputDelay`, and `conductor.ctxTimeAtSongTime` adds `filmDelay` so beat-scheduled SFX land on the
  music. Measured (offline render of the real graph, chorus 1): booth −18.6 LUFS → crowd 10 −15.1 → open −14.3 →
  FULL HOUSE −13.2 (−12.5 with a bell on every beat); overlays vs the record in their own band during their hits:
  cowbell −3.7 dB (700 Hz), claps −2.1 (2 kHz), stomps −4.9 (125 Hz), shouts +5 (they own the gaps); Perfect
  bell −7 LU under the music (+2 dB in its band), Great −11, miss −6, stumble ooh −9, FULL HOUSE cheer −8; limiter
  at FULL HOUSE: 1.9 % of 10 ms blocks > 0.5 dB GR, max 1.35 dB, beat-locked GR modulation 0.18 dB (no pumping);
  true peak ≤ −0.17 dBTP. Re-measure after any mix change: `node src/audio/lab/mixlab.mjs` (below).
- **Level audio cues** (iteration 4, `audio/cues.ts`; the stacks in `audio/mix.ts` STAGE_SFX): Game calls
  `stage.useLevel(levelDef, song)`, which DERIVES the cues from ordinary level items — setPiece `hush` (THE HUSH over
  its `beats`), `drop` (the drop's mega cheer), `windowCrash`, `bigJimReveal` (the bluff roar), `marqueeSwap`;
  `topple` items (the six BIG JIM letters: steel creak ON the downbeat, slam ON the next beat, the slams' clangs walk
  down E D C# B A G = chord tones of their bars); `slam` items in 304–332 (Big Jim's fists, escalating); breakables
  `pin` (giant = a STRIKE), `lens` (cracks escalate to 4), `skylight`, the bar-76 `window` (the glass wall); the
  `finish` near the song's `final_hit` cue (the finale stack ON 340: iris slam, mega cheer half a beat later, film
  run-out on 341, 9 s of curtain-call applause from 342 that outlives the music into the poster; Game then skips its
  finish jingle) — plus an optional explicit `def.audio: AudioCue[]` (`hush(from, to)`, `at(beat, sound)`,
  `onSmash`, `onMiss`). `at`/`hush` cues go on the audio clock ~2.5 beats ahead (tempo map), are re-armed after every
  spawn/rewind (a ◆ 272 retry replays the hush and the drop) and called off on a death or a pause (`conductor.onStop`
  'cut'). `onSmash` sounds fire on the strike's GRADE (press time, on the beat if early, like the bells) or the
  smash, once per pass. **THE HUSH**: the record + stomps/claps crossfade (30 ms in, a 10 ms crossfade centred on the
  release beat) into a fixed mono horn band (320 Hz–3.4 kHz, −12 dB); the cowbell/shouts overlays and every SFX stay
  dry; a strike target inside the window is THE BREAK (`breakKrak` on the hit, `rackCollapse` on a miss). Act 2's
  mechanics sound through `stage.mechTelegraph` (bottle whistle / firebomb whoosh / ball rumble, starting 1 beat
  before the arrival) and `stage.mechFx` (bottle smash, firebomb burst, ball hit). Stage sounds go through their own
  soft clip (`STAGE_BUS`, −10 dBFS pre-bus) so big hits stay loud without stacking peaks on the record. Measured
  (`--prefix=act`, `tools/music/stage_report.py`, clean player at FULL HOUSE): hush depth −11.3 dB (lows −29, horn
  band −8.5, highs −12.6), the KRAK +8.8 dB over the hushed record, the drop slams back +15.3 dB, release/in clicks
  none (−103 dBFS HF); letters' slams −3..−8 dB vs the record, creaks −5..−11; the finale adds +1.8 LU on the hit
  (−11.2 vs −13.0 momentary), our stack −3.7 dB under the baked hit, limiter max 2.7 dB there (2.0 music alone, 2.5
  with the player's strike + bell), applause carrying the tail at −20..−28 LUFS after the record fades; every act
  scene ≤ −0.2 dBTP except rare +0.1 spikes from the synth strike's random HF bursts.
- **Rewinds / count-ins**: a checkpoint rewinds the music 1 bar (`Tun.flow.countInBeats`) with a 35 ms
  pre-rolled fade-in (full gain on the downbeat, no click); stick clicks (`Sfx.sticks`) tick the
  count-in on the recording's own grid (the edit has no pickup: the first count-in is sticks only).
- **Swing** lives in one place: `SongDef.swing` = the swing RATIO (position of the "and" in the beat, 0.5–0.75;
  placeholder 0.67, the original 0.659; beatmap `audio.swingRatio`). Everything on an
  "and" (slam-platform lifts, jabber bows, 8th lum rows) reads it.

**Levels are authored in musical time** (`level/types.ts`, helpers in `level/dsl.ts`):
x = beat × pixelsPerBeat. Obstacles declare an *intended action* `{type:'jump'|'strike'|'slide', beat, hold}`,
which drives the autoplay bot, the timing judge, scansion marks, debug markers, timing stats and playtest
validation; each resolves a `failKind` (death/stumble/none) so `--miss` knows what a skip should cost.
`lumJump` places collectibles along the REAL simulated jump arc (`game/jumpProfile.ts`).
**Reward-first economy (iteration 2):** most actions pay rather than threaten — `breakable` (bottle/crate: strike
on its beat → token burst; `high` = only mid-air), `bounce` pads (automatic LAUNCH that lands on a given beat and
height), raised `floor`s (rooftops, bar top), shallow pools (safe gaps, walk out), slam lifts over a pool (teach);
`lowSign` = knee-slide (hold ↓) on held notes (stumble). Per-section crowd caps (`crowd` items) keep FULL HOUSE for
the chorus; `mode` / `follows` items are design tags read by `npm run rubric` (defaults to the level's songId map).
**Teeth (iteration 3):** pit timing presets in `dsl.ts` (`GAP_FIT`: teach −100/+200 ms for bars 1–16, std
−110/+150, tight −75/+150, peak −60/+150 — the LATE side stays generous for uncalibrated-latency players; a tight
pit must not follow a hop within ~0.5 beat or the jump buffer hides its early side), `slamRun(first, n, top)`
narrower lift tops, `giantKeg` (walkdown: 2x, 80 ms hitstop), high breakables inside a launch ride its arc, and
`setPiece` items ('bigLaunch', 'chorusShot', 'walkdown', act 2's names) for the art/audio.
**`node playtest/slack.mjs`** measures every lethal action's timing window with the real controller (headless,
~2 s), checks every strike target is reachable on its beat and every hop leaves the ground on its beat, and
predicts deaths per bot profile — run it after any geometry change, then confirm with real bots. It runs the act-2
mechanics too (`game/mech`: bottles, balls, hooks, scramble, fall-out); `--stumbles` sweeps every moving threat and
hook ride, `--why` says why a run died, `--trace=a,b` prints the hero's path.
**Act 2 (iteration 4, `docs/level/act2_plan.md`):** the level climbs — `Terrain` in `act2.ts` builds fire-escape
flights (≤ 24 px risers: the 26 px step-up assist walks you up), storey jumps (held, ≤ 150 px: a tap scrambles) and
alleys jumped UP; `camera` items take `ground` (the ground line's screen-y, default 0.66; the climb frames at 0.52 so
the street drops away; `cameraGroundAt`). The act's new verb is the **HOOK RIDE** (`hook` item, `game/mech/hook.ts`):
strike ON the beat to hook a rope / line / cradle and ride its feet `path`; `game.mech.hook` is the ride in progress.
Fairness rule for act 2 (and on): pits ≥ −85/+150 ms, moving threats (bottles: `BAT.grace`, firebombs, balls) ≥ +130.
**Internal names are neutral mechanics** (the skin keeps changing): lum (token), pendulum (swinging
target, strike at the bottom of its 1-bar swing), spike (stumble hazard), gap (lethal pit), slam
platform (solid from the beat to the swung "and"), jabber (enemy: bows on the "and", jabs on the beat),
phrase (Hup-Hup-HEY: hop, hop, strike → Heave), crowd (skill meter), chaser (the Burn, ~1.75 beats behind),
awning (optional high route). The skin (Slim the pool shark, 42nd St → honky-tonk bar) is the art lab's
grindhouse toolkit (`src/art/`, see `src/art/README.md`) wired in by `src/render/`; every gameplay entity is
drawn by one function in `render/entityDraw.ts` (the swap point) in a strict DANGER LANGUAGE: lethal = lacquer
red + hot-edge rim/glow (pits, the Burn) · stumble = ink silhouette with red POINTS (snapped cues, Bluffer cue
tips, low signs) · reward = gold (tokens, pendulums, breakables) · terrain = black edge + cream lip. New entity
kinds: add `SKINS[kind]` (danger class first; `drawKind` gives a generic silhouette in that class until art exists).

```
src/
  main.ts                 bootstrap + rAF loop
  engine/  display.ts     canvas, letterbox, DPR     input.ts   keyboard+gamepad → timestamped edges, Controls
           math.ts        helpers, rng, noise        tween.ts   easing + pooled tweens
           params.ts      URL params
  audio/   conductor.ts   audio-clock master clock   tempoMap.ts   beat<->time (piecewise tempo, per-beat map)
           song.ts        SongDef (beat map, swing, key/harmony, lanes, stems) + defineSong(), loaders,
                          songFromBeatmap(beatmap.json), collectibleNote(), analyzeBeatAlignment()
           lanes.ts       typed lanes: song.lane('snare').between(a, b) / at / next / active / where …
           songs.ts       song catalog: jimEdit (bundled beat map), ?song= selection, licensed-file fallback
           mix.ts         mix levels: overlay-stem curves over the crowd, booth + grade-SFX levels, limiter
           booth.ts       projection-booth film-sound processor on the music bus + overlay bus EQ/clip
           stage.ts       StageAudio: crowd -> booth/overlays/cheers, grade/miss/stumble/death/checkpoint sounds
           cues.ts        level audio cues (hush / at / onSmash / onMiss) derived from level items; STAGE_SFX stacks in mix.ts
           samples.ts     sampled one-shots (assets/audio/sfx, tools/music/sfx.py) with onset alignment
           lab/mixlab.*   offline render of the real audio graph (OfflineAudioContext in headless Chromium)
           placeholderSong.ts  164 BPM E shuffle synth track in the real form (pickup + 32 bars,
                          chorus stab/HEY grid), rendered in 2-bar chunks, + 'shouts' & 'bonus' stems
           sfx.ts         synthesized SFX            audioSystem.ts  AudioContext, buses, master limiter
           syncProbe.ts   AudioWorklet onset probe (live check that music plays where the clock says;
                          on the original it listens to the stomps overlay stem vs its own lanes)
  level/   types.ts       level schema               dsl.ts   authoring helpers (spikeHop, gapHop, gapJump, jabber,
                          pendulum, slamRun, jumpStrike, hupHupHey, awning, lumArc*…) with measured tolerances
           build.ts       LevelDef → RuntimeLevel (collision, entities, action markers, slamState, cues)
           slice.ts       THE LEVEL: act 1 on the edit's grid (bar n = beat 4(n-1)): cold open + bars 1-33
                          (intro, verse 1 on the rooftops, honky-tonk, chorus 1, tag, turnaround). Plan: docs/level/act1_plan.md
           act2.ts        act 2, bars 34-60 (beats 132-240): the climb 0 → 1,620 px up the Jimperial on the boogie bass
                          (flights, ledge hops, storey jumps, alleys jumped UP, the rope hoist), the roof + stop-time (the
                          laundry-line hook, Big Jim's glint, the cradle hoist), the Heave across the well, THE DROP (a
                          1,000 px zip on the chorus downbeat) into the Blacklight Lanes. Plan: docs/level/act2_plan.md
           index.ts       gameLevel = act 1 + act 2 on one world x (THE level Game plays; the act seam lives here)
  game/    game.ts        owns everything: frame loop, time model, run flow (cold open → count-in → run →
                          stumble / death → checkpoint rewind → finish), mechanics, interactions, report
           player.ts      controller: run+surge, hop (beats), strike, stumble (constants in tunables.ts)
           physics.ts     AABB world (+ switchable dynamic solids)    judge.ts  timing grades
           crowd.ts       skill meter (weighted, decays)  autoplay.ts  bot (+ jitter / late / skip / spatial catch-up)
           events.ts      typed gameplay → presentation event bus (grades, combo, crowd, the Burn, set-pieces)
           stats.ts       timing/frame stats         entities.ts  runtime records   jumpProfile.ts  jump arcs
           mech/          act-2 mechanics from level items the builder doesn't know: thrownBottle.ts, rollingBall.ts,
                          hook.ts (hook rides), index.ts (Mechanics: step/reset/beat telegraphs, set-piece cues, hook rides,
                          ledge scramble ≤ 150 px, fall-out)
  render/  renderer.ts    frame orchestration (read-only on game state)      camera.ts  follow, shake, zoom punch,
                          FRAMING (render-only zoom x1.14 so Slim is ~155 px at 1080p, lead 0.25), musicZoom/hitZoom
           music.ts       MusicFeed: song lanes (kick/snare/fills/hooks/shouts/energy...) + sections -> art BeatInfo
           stage.ts       42nd St + Honky-Tonk parallax scenes, lighting keyframes from level `sky` cues (musical
                          time), env split by `ground` cues (doorway), floors / puddles / LETHAL PITS, film pass
           slimDriver.ts  player state -> Slim rig pose (run phase from distance, strike/heave/stumble/dead/respawn/victory)
           director.ts    THE WORLD REACTS: chorus zoom-out, accent punches + flashes, flying bottles/balls, dust
           entityDraw.ts  entity SKINS + danger palette (DANGER/REWARD) + SKINS registry / drawKind fallback
           screens.ts     title marquee, HUD, count-in leader, rewind, end-of-reel poster
           groove.ts      BEAT-REACTIVE HOOKS: groove.pulse(every, decay, phase) / bounce / wave, applyBeatReact(spec)
           particles.ts   pooled SoA particles (game juice)   background.ts / sprites.ts  thin handles kept for game.ts
  art/                    procedural art toolkit + Art Lab (/artlab.html, tab Skins = every entity skin) — src/art/README.md
  debug/   overlay.ts     ?debug=1 overlay           testApi.ts  window.__game
playtest/playtest.mjs     headless autoplay run → video, screenshots, report.json
tools/vite/audioAssets.mjs  serves assets/audio/ at `audio/` (dev/preview) + copies it into builds
playtest/probe.mjs        quick state probe: node playtest/probe.mjs "<query>" <secs> [shot.png|-] [js-expr]
```

**Songs** (`?song=edit|full|placeholder`, default `edit`; `audio/songs.ts`): the game plays the ORIGINAL
recording's 2:04 level edit (`assets/audio/jim_edit.beatmap.json` + `licensed/jim_edit.ogg` + overlay stems
`stems/jim_edit_overlay/{shouts,stomps,cowbell}.ogg`; bar map in `docs/music/original_edit.md` §3). The beat map
is bundled, so level code can import `jimEdit` and query it while authoring. Other beat maps load with
`songFromBeatmap(json, 'audio/')` (schema `opuslegends.beatmap/1`: song.tempo/audioOffset/key/harmony,
audio.swingRatio/files, sections, lanes). `report.shoutAlignment` is only checked when the level's `songId`
equals the song's id (`jim_edit` for the edit).

**Beat-map lanes for level design** (`audio/lanes.ts`, typed): `song.lane(name)` returns a sorted `Lane` with
`between(a, b)` (a ≤ beat < b), `inBar(bar)`, `at(beat, tol)`, `nearest`, `next`/`prev`, `active(beat)` (spans
covering a beat), `where(pred)`, `onBeat(tol)`, `beats()`. Lanes: `kick`/`snare`/`tom` (exact hits; `pos`,
`backbeat`), `fills` (`accents`), `bass`, `bassWalks` (the walkdown/walk-ups: `name`, `notes`), `vocalPhrases`,
`sustains` (held notes: `pitch`, `endBeat`), `melody`, `hooks` (`hookA` title line / `hookB` tag), `bassOut`
(stop-time), `stops`, `energy` (per bar `intensity` 0..1), `cue`, overlay `shouts`/`stomps`/`claps`/`cowbell`,
`splices`. Plus `song.section(name)`, `song.sectionAt(beat)`, `song.energyAt(beat)`, `song.barBeat(bar, beat)`
(edit bar 1 = beat 0). E.g. `jimEdit.lane('snare').between(88, 120).filter((e) => e.backbeat)`.
Beat-reactive art: read `game.groove` in render code, or put a `BeatReactSpec` in level data.
Presentation cues on beats: `{type:'fx', beat, fx:'flash'|'shake'|'zoom'|'bgPulse'}` or `conductor.at(beat, fn)`.

## Running / testing
- `npm install`, then `npm run dev` (http://localhost:5173), `npm run build`, `npm run preview`, `npm run typecheck`.
- **Licensed audio**: the original recording lives in `assets/audio/licensed/` (`jim_edit.ogg/.mp3`,
  `jim_original.ogg/.mp3`) — user-supplied, gitignored, NEVER commit it. Dev/preview serve it at
  `audio/licensed/…`; a build copies it into `<outDir>/audio/licensed/` only if present
  (`OPUS_NO_LICENSED=1` leaves it out, e.g. for public builds without the licence) and writes
  `audio/licensed.json` (the files available). Without it (fresh clone) the game falls back to the synth
  placeholder and shows an on-screen note. The OGG is preferred (the MP3 decodes 25 ms late in decoders
  that ignore its LAME header).
- Controls: hold →/D to run, Space/Z/W/Up hop (tap) / jump (hold), X/J strike (the cue swing; also
  starts the cold open), ↓ in the cold open / X in the pause screen = the projector sync (latency tap test),
  Esc pause, `[`/`]` latency offset, `` ` `` / F1 debug overlay.
  Gamepad: A hop, X/B/RT strike, stick/dpad.
- URL params: `?debug=1` overlay (fps, song/beat, clock, hitboxes, beat grid, green dashed *music line*,
  intended-action markers) · `?start=<beat>` start mid-level (checkpoints: 32, 64, 80, 96, 112, 120; act 2: 132, 164, 196, 220, 236) · `?coldopen=0` ·
  `?autoplay=1` bot plays via the controller · `?jitter=<ms>` / `?late=<p>` / `?sloppy=1` sloppy bot ·
  `?judge=1` timing-grade popups · `?mute=1` · `?latency=<ms>` · `?song=edit|full|placeholder` · `?miss=37,28` bot deliberately skips those
  actions once (stumble/death/respawn test) · `?skip=none|stumble` bot ALWAYS skips rewards (lazy) / stumble
  threats (reckless) · `?probe=1` live audio sync probe · `?device=<ms>` the bot HEARS the audio that late (an
  unreported Bluetooth delay: the latency offset corrects it, like for a human) · `?calib=1` run the projector sync
  (the bot taps it with its device delay + jitter) · `?autolat=0` no in-run latency drift.
- `window.__game`: `state()`, `report()`, `start(beat?)`, `setLatency(ms)`, `debug(on)`, `level`, `game`.
- `npm run playtest` — builds, serves, runs headless Chromium with autoplay, writes `playtest/out/`
  (`playtest.webm`, `shot-XX-beatYY.png` every 2 s, `report.json`). Exits non-zero unless: level completed,
  deaths/stumbles == what the missed actions' failKinds predict (0 normally), every intended action executed,
  action-vs-beat error ≤ 12 ms, hero position vs beat grid ≤ 40 ms, sim drift ≤ 20 ms, live probe ≤ 5 ms,
  beat map vs the recording: median onset offset ≤ 5 ms and worst 8-bar median ≤ 8 ms (robust: a live
  band's laid-back backbeat scatters ~11 ms around the smoothed grid), chorus jabbers on the shout grid
  (when the level is authored for the playing song), no console errors.
  Options: `--debug` (overlay in shots), `--start=<beat>`, `--miss=<beats>`, `--jitter=<ms>`, `--sloppy`
  (completion only; reports deaths per section), `--seed=<n>`, `--song=<id>`, `--out=<dir>` + `--dist=<dir>`
  (private folders for parallel agents; never let two agents share `dist/`), `--no-video`,
  `--headed`, `--no-build`, `--skip=none|stumble` (lazy / reckless bots), `--max-deaths=<n>` (stop early),
  `--device=<ms>` / `--calib` / `--autolat=0` (latency: an uncalibrated-speaker bot, the tap test, no drift);
  sloppy runs print deaths and stumbles per act.
  Report extras: `crowd.trace` (value per bar), `crowd.fullHouseBeats`, `combo`, `burn` (pulls, lunges, min
  margin, catches), `failHints`, `targetGrades` ([beat, grade] per target: split grades by act).
- Art/perf probe on the real GPU at 1920x1080 (no build): `node src/art/lab/gameshot.mjs --out=<dir> [--start=<beat>]
  [--secs=20] [--every=2000] [--gray] [--title] [--end] [--dpr=2] [--query=miss=40]` → PNGs + live fps + renderer JS ms.
  `--gray` = the greyscale+blur readability test. Measured: 60 fps at 1080p DPR 1 and 2, renderer JS ~1-1.7 ms/frame.
- **Mix lab** (ears for agents; needs the licensed recording): `node src/audio/lab/mixlab.mjs [--only=full,booth]
  [--prefix=act3_,act2_] [--out=<dir>]` renders the REAL graph (AudioSystem + Conductor stems + StageAudio) offline for scripted scenarios
  (booth / mid / FULL HOUSE / components / a booth→FULL HOUSE journey with misses + a stumble / a tone click test),
  writes 4-ch float WAVs (master + pre-limiter) to `playtest/out-audio/mixlab/`, then `tools/music/mix_report.py`
  prints `report.json`: LUFS + true peak, limiter GR and its beat-locked modulation (pumping), booth spectrum/width,
  overlays + bells vs the record in their bands, each SFX vs the music, HF clicks. The `act3_*` / `act2_*` scenes play
  the REAL game level's audio cues with a clean player (every breakable struck ON its beat) three ways (mix / `_music`
  / `_cues`, + `_legacy` = iteration 3's sounds only) and `tools/music/stage_report.py` reports each cue sound vs the
  music (broadband + in its own band), the hush (depth, KRAK, drop contrast, click test, release timing) and the
  finale (added loudness, peaks, limiter at the hit, the ring-out tail). The human's listening list:
  `docs/reviews/audio_checklist.md`.
- Review screenshots with the Read tool on the PNGs. Headless software rendering at DPR 2 runs ~30 fps;
  that's SwiftShader fill-rate, not the game (JS render cost is ~0.05 ms/frame; 60 fps with GPU).
