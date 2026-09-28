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
- The 120 Hz fixed-step sim is *slaved* to song time: each frame it steps until `simTime`
  reaches `conductor.time`; rendering interpolates. When no music plays (title, death) it runs on a
  wall-clock accumulator. Input edges are timestamped and applied on the exact step they belong to.
- Hitstop (contact only) freezes the world but not the music; the lost time ("debt") is repaid by
  simulating slightly faster right after (`Tun.strike.catchUpRate`), so the hero lands back on the beat.
  The Perfect "Freeze" is presentation-only (zoom punch + speed lines), never a sim freeze.
- **Catch-up surge** (`Tun.grooveLock`): holding forward while behind the music line gives up to +15%
  speed until back on the beat grid (~4.7 beats after a stumble). Never pushes ahead.
- Run speed is DERIVED: `runSpeed = pixelsPerBeat * BPM / 60`. Holding right = riding the music.
- **Jump physics are in beats** (`Tun.jump.timeToApexBeats`): every tap ≤ `minHoldBeats` is the same
  ~0.93-beat hop (~92 px); hold 1 beat = ~1.96-beat jump (~250 px), at any tempo.
- **Timing judge** (`game/judge.ts`): each hop/strike PRESS is graded against the nearest intended
  action (Perfect ±45 / Great ±90 / Good ±135 ms, early +12). Grades drive score, feedback and the
  crowd (`game/crowd.ts`, streak meter → `shouts`/`bonus` stem gains) — never physics.
- **Swing** lives in one place: `SongDef.swing` = the swing RATIO (position of the "and" in the beat, 0.5–0.75;
  placeholder 0.67, the original 0.659; beatmap `audio.swingRatio`). Everything on an
  "and" (slam-platform lifts, jabber bows, 8th lum rows) reads it.

**Levels are authored in musical time** (`level/types.ts`, helpers in `level/dsl.ts`):
x = beat × pixelsPerBeat. Obstacles declare an *intended action* `{type:'jump'|'strike'|'slide', beat, hold}`,
which drives the autoplay bot, the timing judge, scansion marks, debug markers, timing stats and playtest
validation; each resolves a `failKind` (death/stumble/none) so `--miss` knows what a skip should cost.
`lumJump` places collectibles along the REAL simulated jump arc (`game/jumpProfile.ts`).
**Internal names are neutral mechanics** (the skin keeps changing): lum (token), pendulum (swinging
target, strike at the bottom of its 1-bar swing), spike (stumble hazard), gap (lethal pit), slam
platform (solid from the beat to the swung "and"), jabber (enemy: bows on the "and", jabs on the beat),
phrase (Hup-Hup-HEY: hop, hop, strike → Heave), crowd (streak meter), chaser (the Burn, 2 beats behind),
awning (optional high route). The current skin (Slim the pool shark, 42nd St → honky-tonk bar) is
drawn by small placeholder functions in `render/entityDraw.ts` — the swap point for `src/art/`.

```
src/
  main.ts                 bootstrap + rAF loop
  engine/  display.ts     canvas, letterbox, DPR     input.ts   keyboard+gamepad → timestamped edges, Controls
           math.ts        helpers, rng, noise        tween.ts   easing + pooled tweens
           params.ts      URL params
  audio/   conductor.ts   audio-clock master clock   tempoMap.ts   beat<->time (piecewise tempo)
           song.ts        SongDef (beat map, swing, key/harmony, lanes: shouts/stops, stems), loaders,
                          songFromBeatmap(beatmap.json), collectibleNote(), analyzeBeatAlignment()
           placeholderSong.ts  164 BPM E shuffle synth track in the real form (pickup + 32 bars,
                          chorus stab/HEY grid), rendered in 2-bar chunks, + 'shouts' & 'bonus' stems
           sfx.ts         synthesized SFX            audioSystem.ts  AudioContext + buses
           syncProbe.ts   AudioWorklet onset probe (live check that music plays where the clock says)
  level/   types.ts       level schema               dsl.ts   authoring helpers (spikeHop, gapHop, gapJump, jabber,
                          pendulum, slamRun, jumpStrike, hupHupHey, awning, lumArc*…) with measured tolerances
           build.ts       LevelDef → RuntimeLevel (collision, entities, action markers, slamState, cues)
           slice.ts       THE LEVEL: cold open + bars 0-32 (intro, verse 1a/1b, chorus 1)
  game/    game.ts        owns everything: frame loop, time model, run flow (cold open → count-in → run →
                          stumble / death → checkpoint rewind → finish), mechanics, interactions, report
           player.ts      controller: run+surge, hop (beats), strike, stumble (constants in tunables.ts)
           physics.ts     AABB world (+ switchable dynamic solids)    judge.ts  timing grades
           crowd.ts       streak meter + stem gains  autoplay.ts  bot (+ jitter / late / spatial catch-up)
           stats.ts       timing/frame stats         entities.ts  runtime records   jumpProfile.ts  jump arcs
  render/  renderer.ts    draws world/HUD/screens    camera.ts  follow, look-ahead, shake, zoom punch
           entityDraw.ts  PLACEHOLDER draw functions (hero, audience strip, tokens, spikes, jabbers,
                          pendulums, slam platforms, the Burn, splices, marks, ground, film pass)
           groove.ts      BEAT-REACTIVE HOOKS: groove.pulse(every, decay, phase) / bounce / wave, applyBeatReact(spec)
           background.ts  cached parallax layers     particles.ts  pooled SoA particles    sprites.ts cached placeholder art
  debug/   overlay.ts     ?debug=1 overlay           testApi.ts  window.__game
playtest/playtest.mjs     headless autoplay run → video, screenshots, report.json
playtest/probe.mjs        quick state probe: node playtest/probe.mjs "<query>" <secs> [shot.png|-] [js-expr]
```

Swapping in the real song: `songFromBeatmap(json, 'audio/…/')` turns the producer's beatmap.json
(schema `opuslegends.beatmap/1`: song.tempo/audioOffset/key/harmony, audio.swingRatio/files, sections, lanes)
into a SongDef with stems; point `Game.song` at it; check `report.beatMapAlignment` (≈0 ms) and
`report.shoutAlignment` (every chorus jabber strike sits on a `shouts` lane beat).
Beat-reactive art: read `game.groove` in render code, or put a `BeatReactSpec` in level data.
Presentation cues on beats: `{type:'fx', beat, fx:'flash'|'shake'|'zoom'|'bgPulse'}` or `conductor.at(beat, fn)`.

## Running / testing
- `npm install`, then `npm run dev` (http://localhost:5173), `npm run build`, `npm run preview`, `npm run typecheck`.
- Controls: hold →/D to run, Space/Z/W/Up hop (tap) / jump (hold), X/J strike (the cue swing; also
  starts the cold open), Esc pause, `[`/`]` latency offset, `` ` `` / F1 debug overlay.
  Gamepad: A hop, X/B/RT strike, stick/dpad.
- URL params: `?debug=1` overlay (fps, song/beat, clock, hitboxes, beat grid, green dashed *music line*,
  intended-action markers) · `?start=<beat>` start mid-level (checkpoints: 36, 68, 100) · `?coldopen=0` ·
  `?autoplay=1` bot plays via the controller · `?jitter=<ms>` / `?late=<p>` / `?sloppy=1` sloppy bot ·
  `?judge=1` timing-grade popups · `?mute=1` · `?latency=<ms>` · `?miss=37,28` bot deliberately skips those
  actions once (stumble/death/respawn test) · `?probe=1` live audio sync probe.
- `window.__game`: `state()`, `report()`, `start(beat?)`, `setLatency(ms)`, `debug(on)`, `level`, `game`.
- `npm run playtest` — builds, serves, runs headless Chromium with autoplay, writes `playtest/out/`
  (`playtest.webm`, `shot-XX-beatYY.png` every 2 s, `report.json`). Exits non-zero unless: level completed,
  deaths/stumbles == what the missed actions' failKinds predict (0 normally), every intended action executed,
  action-vs-beat error ≤ 12 ms, hero position vs beat grid ≤ 40 ms, sim drift ≤ 20 ms, beat map & live probe
  ≤ 5 ms, chorus jabbers on the shout grid, no console errors.
  Options: `--debug` (overlay in shots), `--start=<beat>`, `--miss=<beats>`, `--jitter=<ms>`, `--sloppy`
  (completion only; reports deaths per section), `--seed=<n>`, `--out=<dir>` (parallel runs), `--no-video`,
  `--headed`, `--no-build`.
- Review screenshots with the Read tool on the PNGs. Headless software rendering at DPR 2 runs ~30 fps;
  that's SwiftShader fill-rate, not the game (JS render cost is ~0.05 ms/frame; 60 fps with GPU).
