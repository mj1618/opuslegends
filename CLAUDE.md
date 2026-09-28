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
- Hitstop freezes the world but not the music; the lost time ("debt") is repaid by simulating
  slightly faster right after (`Tun.punch.catchUpRate`), so the hero lands back on the beat.
- **Groove lock** (`Tun.grooveLock`): holding forward while behind the music line gives up to +20%
  speed until back on the beat grid. Never pushes ahead.
- Run speed is DERIVED: `runSpeed = pixelsPerBeat * BPM / 60`. Holding right = riding the music.

**Levels are authored in musical time** (`level/types.ts`, helpers in `level/dsl.ts`):
x = beat × pixelsPerBeat. Obstacles declare an *intended action* `{type:'jump'|'punch'|'slide', beat, hold}`,
which drives the autoplay bot, debug markers, timing stats and playtest validation. `lumJump` places
collectibles along the REAL simulated jump arc (`game/jumpProfile.ts`), so retuning jumps never breaks arcs.
Full jump (hold 1 beat) ≈ 1.96 beats airtime at 150 BPM, tap ≈ 1.15 beats (see debug overlay / report).

```
src/
  main.ts                 bootstrap + rAF loop
  engine/  display.ts     canvas, letterbox, DPR     input.ts   keyboard+gamepad → timestamped edges, Controls
           math.ts        helpers, rng, noise        tween.ts   easing + pooled tweens
           params.ts      URL params
  audio/   conductor.ts   audio-clock master clock   tempoMap.ts   beat<->time (piecewise tempo)
           song.ts        SongDef (beat map, key/harmony), loaders, collectibleNote(), analyzeBeatAlignment()
           placeholderSong.ts  150 BPM E-minor synth track (OfflineAudioContext)
           sfx.ts         synthesized SFX            audioSystem.ts  AudioContext + buses
           syncProbe.ts   AudioWorklet onset probe (live check that music plays where the clock says)
  level/   types.ts       level schema               dsl.ts   authoring helpers (jumpGap, enemy, slideUnder…)
           build.ts       LevelDef → RuntimeLevel (collision world, entities, action markers)
           testLevel.ts   the placeholder level (~45 s)
  game/    game.ts        owns everything: frame loop, time model, run flow, interactions, report
           player.ts      controller (all constants in tunables.ts)   physics.ts  AABB world, moveBody
           autoplay.ts    bot that presses intended actions on their beats   stats.ts  timing/frame stats
           entities.ts    runtime entity records     jumpProfile.ts  simulated jump arcs
  render/  renderer.ts    draws world/HUD/screens    camera.ts  follow, look-ahead, shake, zoom punch
           groove.ts      BEAT-REACTIVE HOOKS: groove.pulse(every, decay, phase) / bounce / wave, applyBeatReact(spec)
           background.ts  cached parallax layers     particles.ts  pooled SoA particles    sprites.ts cached placeholder art
  debug/   overlay.ts     ?debug=1 overlay           testApi.ts  window.__game
playtest/playtest.mjs     headless autoplay run → video, screenshots, report.json
```

Swapping in a real song: add a `SongDef` with `source: {kind:'file', url:'audio/x.ogg'}` (file in `public/`,
relative URL), set `tempo`, `audioOffset` (seconds into the file where beat 0 is), `key`, `harmony`;
point `Game.song` at it; check `report.beatMapAlignment` (≈0 ms means the beat map matches the audio).
Beat-reactive art: read `game.groove` in render code, or put a `BeatReactSpec` in level data.
Presentation cues on beats: `{type:'fx', beat, fx:'flash'|'shake'|'zoom'|'bgPulse'}` or `conductor.at(beat, fn)`.

## Running / testing
- `npm install`, then `npm run dev` (http://localhost:5173), `npm run build`, `npm run preview`, `npm run typecheck`.
- Controls: arrows/WASD, Space/Z/W/Up jump (hold = higher), X/J punch, Down/S slide, Esc pause,
  `[`/`]` latency offset, `` ` `` / F1 debug overlay. Gamepad: A jump, X/B punch, stick/dpad, LT slide.
- URL params: `?debug=1` overlay (fps, song/beat, clock, hitboxes, beat grid, green dashed *music line*,
  intended-action markers) · `?start=<beat>` start mid-level · `?autoplay=1` bot plays via the controller ·
  `?mute=1` · `?latency=<ms>` · `?miss=46,97` bot deliberately misses those actions once (death/respawn test) ·
  `?probe=1` live audio sync probe.
- `window.__game`: `state()`, `report()`, `start(beat?)`, `setLatency(ms)`, `debug(on)`, `level`, `game`.
- `npm run playtest` — builds, serves, runs headless Chromium with autoplay, writes `playtest/out/`
  (`playtest.webm`, `shot-XX-beatYY.png` every 2 s, `report.json`). Exits non-zero unless: level completed,
  deaths == expected, every intended action executed, action-vs-beat error ≤ 12 ms, hero position vs beat
  grid ≤ 40 ms, sim drift ≤ 20 ms, beat map & live probe ≤ 5 ms, no console errors.
  Options: `--debug` (overlay in shots), `--start=<beat>`, `--miss=<beats>`, `--no-video`, `--headed`, `--no-build`.
- Review screenshots with the Read tool on the PNGs. Headless software rendering at DPR 2 runs ~30 fps;
  that's SwiftShader fill-rate, not the game (JS render cost is ~0.05 ms/frame; 60 fps with GPU).
