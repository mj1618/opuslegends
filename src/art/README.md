# src/art — procedural art toolkit + Art Lab

Everything is drawn procedurally with Canvas 2D (paths, gradients, cached offscreen canvases). No image assets.
Theme: **1973 grindhouse film** — hero **Slim** (hulking tattooed pool shark), 42nd Street + honky-tonk bar,
film pass, theatre audience. The toolkit underneath is theme-agnostic.

## Art Lab
`npm run dev` → **/artlab.html**. Tabs: **Slim** (every pose, strike filmstrip, 25% check) · **42nd St** · **Bar** ·
**Stress** · **Rig** (mannequin rig test) · **FX** · **Lighting** (keyframe board) · **World** (greybox framework demo).
Keys: `1`–`=` poses · `Tab` next view · `L` next light · `G` greyscale+blur readability test · `S` slow-mo · `Space` pause.
Panel: light keyframe dropdown + slider (scrubs the whole arc), auto-cycle, BPM, time scale, hold camera (pose buttons
drive the hero in world views), bones, onion skin. Top-right: fps · JS draw ms (avg/p95) · cached MPx · relights.

URL params (for screenshots): `view= pose= light= blend= t=<s freeze> preroll=<s> gray=1 shot=1 bpm= slow= debug=1 onion=1 scroll=0 cycle=1`.

- `node src/art/lab/shoot.mjs --out=<dir> "name:view=street&light=neon&t=9&preroll=3" ...` → PNGs (headless Chromium, real GPU via ANGLE/Metal; `SOFTWARE=1` for SwiftShader). `bench=<frames>` times rendering.
- `node src/art/lab/perf.mjs street bar stress stress+cycle=1 slim` → live 6 s fps + JS ms per view.

Measured (M5 Pro, 1920×1080, DPR 1): every view 60 fps. JS per frame: street 1.3 ms, bar 0.4 ms, stress (~40 cars and
pedestrians + full-house audience + film + Slim) 1.4 ms, stress while relighting every frame 1.6 ms (max 2.5 ms).
Caches ≈ 25 MPx (TintBake channels; distant layers bake at 0.4–0.6 res).

## Integration recipe (per frame)
```ts
import { BeatInfo } from './core/beat';                    // fill from the conductor (tempo-map aware), see below
import { setArtResolution } from './core/canvas';         // once: setArtResolution(backingWidth / 1920)
import { useLights, LightingDirector } from './world/lighting';
import './grindhouse/lights'; useLights('grindhouse');
const light = new LightingDirector('golden');
const street = makeStreet(light);                          // or makeBar(light)
const film = new FilmPass();

street.update(dt);                                         // lighting transitions + relight budget
const w = film.weave(beat);  ctx.save(); ctx.translate(w.x, w.y);      // gate weave (render only)
street.drawBack(ctx, cam, beat);                           // cam = { x, y, zoom } world point at screen centre
ctx.save(); /* camera transform */ drawStreetGround(ctx, rect, { light: light.current, version: light.version });
drawSlim(ctx, x, y, slimState); ctx.restore();
street.drawFront(ctx, cam, beat); ctx.restore();
film.draw(ctx, beat, filmPreset('full'));                  // screen space, after the scene
drawTheatre(ctx, beat, { standing, heroX, perfectT, enforcers, light: light.current });  // outside the film
drawSubtitle(ctx, 'HEY!', { alpha });                      // cream subtitles
```
Section changes: `light.set('neon', 4)` (seconds). World y grows down, ground top y = 0, `SEA_Y` (170) is the "below the
floor" reference used by lower props; `REF_CAM_Y = -250` is the camera y the background layers are authored for.

### BeatInfo (core/beat.ts)
`{ time, beat, beatPhase, bar, barPhase, beatInBar, bpm, spb, since: Record<lane, s>, count: Record<lane, n>, energy }`,
lanes `kick snare hat cowbell crash bass riff piano hey`. The engine fills it from the conductor each frame (tempo map:
`beat`/`beatPhase` from the map, `spb` = current seconds per beat) and from beatmap lanes (`since` = seconds since the
lane's last event, `count` = events so far). Helpers: `hit(b, lane, k)` (decaying 1→0), `pulse(b, every, decay)`.
`BeatSim` fakes a stomp-boogie band for the lab.

## Modules
**core/** `canvas` (sprite cache, `setArtResolution`) · `bake` (**TintBake**: paint white masks per channel once,
`compose(colours)` recolours = relighting; throttled `TintBake.budget` recomposes/frame; `softBlur`) · `color` · `math`
(easing, springs, hash/noise) · `draw` (inkFill, LRU-cached `drawGlow`, `sparkle`, `star4`, `puff`) · `beat`.

**world/** `camera` (ArtCamera, `layerView`, `pushLayer`) · `lighting` (Lighting struct, `registerLights`/`useLights`
keyframe sets, `LightingDirector.set/setBlend/update/version`, `lit(L, material, light, depth)` = key/ambient + haze +
desaturation by depth, `atmos`) · `parallax` (**ParallaxScene**: ordered back/front layers; **stripLayer**: tiling
relightable strip with channels body/shadeL/shadeR/detail/accent/rim/glow (glow = emissive, scales with `L.lamps`),
live `props` at anchors, beat `bump`; **skyLayer**) · `tiledLayer` (+ tiling-aware anchors) · `sky` · `weather` (rain,
lightning bolt shapes) · `greybox` (framework demo + 'neutral' light set) · `paint` (mask helpers).

**rig/** theme-agnostic character rig: `skeleton` (bones, `solve(pose, root)`, `apply(ctx, bone)`, `point/tip/angle`,
`blendPose`, `addPose`, `ik2` two-bone IK) · `clip` (keyed clips with easing incl. `'snap'`) · `motion` (`squash`,
`velocityStretch`, `landSquash`, `strikeU` anticipation-free strike timing, `followThrough`, `SpringValue`, `beatBob`) ·
`smear` (`drawSmear` ribbons, `speedLines`, `ghosts`) · `parts` (inked limbs/capsules/blobs, `cartoonEye` with lids,
blink, spiral/x/happy, `brow`, `cartoonMouth`) · `mannequin` (theme-neutral template hero).

**fx/** `particles` (**Fx** pooled SoA particles: `dust land sparks sparkle ring flash shards confetti smoke streaks`;
`BeatTrigger.on(b, lane, fn)`) · `film` (**FilmPass**: 24 Hz grain tiles, scratches, dust/hair, flicker + downbeat
shutter dip, warm multiply, vignette, bass-synced gate weave ≤2/≤1 px, cigarette-burn cue mark for one beat on crashes;
`filmPreset('full'|'light'|'off')`; `drawSubtitle`, `drawSubtitleBar` (standable cream text), `drawCueMark`).

**life/** `life` (**LifeLayer**: pooled beat-driven background actors; `SpawnRule { kind, every | on: lane, chance,
y, speed, from: 'edge'|'view', max, prefill }`; pinned actors on tiling anchors; `ActorKind { spawn, update, draw }`).

**grindhouse/** (the current theme)
- `slim.ts` — **`drawSlim(ctx, x, y, SlimState)`**, origin = feet centre, ~130 px tall. State: `pose` (`idle run hop
  fall land strike heave slide stumble dead respawn victory`), `poseTime`, `time`, `beatPhase`, `beat`, `runPhase`
  (= distance / `SLIM_STRIDE` 192), `speed`, `vy`, `facing`, `scale`, `squashX/Y`, `lookX/Y`, `perfect` (0..1 radial
  speed-line replay burst), `bones`. One-shot lengths in `SLIM_POSE_LEN`. Strike = big cue swing (contact at t=0,
  crescent smear); heave = power-shot thrust + shock ring; slide = knee-slide with sparks; idle swagger: flex bar, chalk
  bar, cue spin every 2 bars.
- `street.ts` — `makeStreet(light)` (tower on the horizon `towerX/towerScale`, rooftops, marquee facades, pigeons,
  falling letters, crowd, traffic, newspapers, festoon bulbs, steam), `drawStreetGround(ctx, rect, style)`.
- `bar.ts` — `makeBar(light)` (bottle shelves, neon, jukebox, pool tables + lamps, bartender, brawlers, patrons,
  bottles, pool balls), `drawBarFloor(ctx, rect, style)`.
- `theatre.ts` — `drawTheatre(ctx, beat, { standing 0..24, heroX, perfectT, enforcers, light, house })`: audience strip
  (streak meter, FULL HOUSE ≥ 20, kick stomp, popcorn on snare, HEY arms, Perfect ripple), projector haze, curtains.
- `actors.ts` — PEDESTRIAN, TAXI, SEDAN, VAN, PIGEONS, LETTER, NEWSPAPER, BRAWLERS, BOTTLE, POOL_BALL, PATRON.
- `lights.ts` — 'grindhouse' set: `cold golden neon bar poolroom velvet sunset dusk throne houselights`.

`palette.ts` — `CF` (current theme; sacred: tangerine = hero, gold = reward, lacquer red = danger) and the legacy `PAL`.

## Readability rules baked in
Hero: tangerine + film-black ink outline, nothing else uses tangerine; backgrounds are hazed/desaturated by depth via
`lit()`; every walkable top has a dark edge line; background actors are dim silhouettes; the lab's greyscale+blur toggle
(`G`) is the check.

## Known weaknesses / next
No gameplay entities yet for the new theme (tokens, dummies/targets, presses, enforcers, marks, splice checkpoint,
the Burn) and no Big Jim; brawler silhouettes are crude; background actors crowd the play band behind the hero in the
street (tune density / depth per section); the bar needs platform props (bar top, tables, stools) as terrain helpers.
