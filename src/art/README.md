# src/art — procedural art toolkit + Art Lab

Everything is drawn procedurally with Canvas 2D (paths, gradients, cached offscreen canvases). No image assets.
Theme: **1973 grindhouse film** — hero **Slim** (hulking tattooed pool shark), 42nd Street + honky-tonk bar,
film pass, theatre audience. The toolkit underneath is theme-agnostic.

## Art Lab
`npm run dev` → **/artlab.html**. Tabs: **Slim** (every pose, strike filmstrip, 25% check) · **42nd St** · **Bar** ·
**Stress** · **Skins** (every gameplay entity skin by danger class + the Bluffer beat cycle) · **Rig** (mannequin rig test) · **FX** · **Lighting** (keyframe board) · **World** (greybox framework demo).
Keys: `1`–`=` poses · `Tab` next view · `L` next light · `G` greyscale+blur readability test · `S` slow-mo · `Space` pause.
Panel: light keyframe dropdown + slider (scrubs the whole arc), auto-cycle, BPM, time scale, hold camera (pose buttons
drive the hero in world views), bones, onion skin. Top-right: fps · JS draw ms (avg/p95) · cached MPx · relights.

URL params (for screenshots): `view= pose= light= blend= t=<s freeze> preroll=<s> gray=1 shot=1 bpm= slow= debug=1 onion=1 scroll=0 cycle=1`.

- `node src/art/lab/shoot.mjs --out=<dir> "name:view=street&light=neon&t=9&preroll=3" ...` → PNGs (headless Chromium, real GPU via ANGLE/Metal; `SOFTWARE=1` for SwiftShader). `bench=<frames>` times rendering.
- `node src/art/lab/perf.mjs street bar stress stress+cycle=1 slim` → live 6 s fps + JS ms per view.

Measured (M5 Pro, 1920×1080, DPR 1): every view 60 fps. JS per frame: street 1.3 ms, bar 0.4 ms, stress (~40 cars and
pedestrians + full-house audience + film + Slim) 1.4 ms, stress while relighting every frame 1.6 ms (max 2.5 ms).
Caches ≈ 25 MPx (TintBake channels; distant layers bake at 0.4–0.6 res).

## In the game (iteration 2)
The toolkit is live in the game through `src/render/` (see CLAUDE.md): `music.ts` fills `BeatInfo` from the song's
beat-map lanes (kick/snare ← `kick`|`stomps`/`snare`|`claps`, riff ← `riff`|`tom`|`fills` accents, piano ← `stabs`|`hooks`,
hey ← `shouts`, crash = section starts + big fills + 8-bar lines, hats = swung 8ths; grid fallback when a lane is missing)
and per-bar `energy` (energy lane `intensity` blended with the section role; `hit()` scales by it, so verses breathe);
`stage.ts` owns `makeStreet`/`makeBar` with one LightingDirector each (level `sky` cues → keyframes, cross-faded over
2 bars in musical time; `ground` cues split the scenes at a doorway); `slimDriver.ts` drives `drawSlim` from the
player; `director.ts` makes the world answer the music (chorus zoom-out, accent zoom-punch + projector flash, flying
bottles / pool balls / hats in the upper screen, dust off the ceiling on the kick); `entityDraw.ts` holds every
gameplay skin; `screens.ts` the marquee title / HUD / poster. Brawlers (bar + a new street brawl) punch on the SNARE.

Readability pass (review fix 7): bar bottle wall and street marquee boards at ~half glow, a play-band value wash behind
the action, a follow-spot + contact shadow under Slim, Slim at 1.1x (~155 px on screen via render-only camera framing).
Greyscale+blur check: `node src/art/lab/gameshot.mjs --gray ...` (in game) or `G` in the lab (Skins tab).

`node src/art/lab/gameshot.mjs --out=<dir> [--start=<beat>] [--secs] [--every] [--gray] [--title] [--end] [--dpr=2]`
runs the REAL game (Vite dev server, GPU, 1920x1080) and prints fps + `renderer.perf()`. Measured (M5 Pro): 60 fps at
DPR 1 and 2 with everything on; renderer JS avg 0.9–1.7 ms, p95 ≤ 2.4 ms.

## Iteration 3 (review iter2 fixes 5, 6, 8 visual halves + act 2)
- **Feedback** (`render/feedback.ts`, on by default): PERFECT / GREAT / GOOD as cached 70s rubber-stamp sprites slammed
  up-and-behind Slim's head (world space, drift out left: never over the lane); the combo as extruded film-title lettering
  under the metronome that grows and heats cream → bulb → gold → neon rose → white-hot (uses `game.combo` when present);
  misses / stumbles / deaths tear a film SCRATCH across the hero (+ a burn hole on stumbles). Grades are diffed from
  `judge.targets` per frame, so rewinds are safe.
- **The Burn** (`render/burn.ts`, screen space after the film pass): always on screen once risen — a glow-band proxy at the
  left 3–5 % when the real Burn is farther back, else drawn where it is. Curling melt edge, blisters, char flakes, sparks;
  pumps on the kick, LUNGES on drum fills (`game.chaser.lunge` / `MusicFeed.fill`), FLARES on stumbles, eats the frame on a
  chaser death. Lethal language (lacquer + hot edge).
- **Moments** (`render/moments.ts`): long launches pull the camera out −16 % and up (`Camera.momentZoom/momentY`) with
  tapered speed lines and searchlights behind the city; GIANT breakables (`Breakable.giant`, walkdowns) get a projector flash,
  radial lines, a KRAK!/SMASH! (STRIKE! for pins) comic stamp, punch, shake and world debris; choruses (and the
  `chorusShot` set-piece, `fx:'shot'` cues) are their own SHOT: bigger pull-out (−13 %, director), a colour gel on the
  background only (rose / violet per 2-bar line), crossing searchlights, a key follow-spot + dark iris on Slim.
- **Breakable families** (`render/breakables.ts`, `pickLook`): street newspaper box / trash can / parking meter · rooftops
  valve wheel / pigeon coop / TV + antenna · bar bottle / neon letter / jug / glass, keg + jukebox (big) · facade window pane
  (`window`) / flower pot · lanes bowling pin. Neutral hints ('bottle', 'crate', 'glass', 'jug') are re-skinned by section;
  explicit family looks win. Each family has its own stand.
- **Jamming goons** (`art/grindhouse/jammers.ts`): `drawJammer` / `JAMMER` — five dances, big move on the backbeat (2 & 4),
  never red/gold. Pinned in the street and bar scenes, in lit facade windows, and the render **jam line**
  (`render/jamline.ts`, parallax 0.85 behind the play band; more join as the energy rises, all of them in a chorus).
- **Act 2 scenes** (built lazily by `Stage`): `facade.ts` — the Jimperial climb (sky, distant skyline, midtown towers 0.18,
  the rooftops + street far BELOW 0.45 that drop away as you climb, the procedural wall 0.92 with light-well gaps, storey
  cornices, windows with silhouettes, fire escapes, drainpipes, vertical "BIG JIM'S" neon blades, laundry lines in front;
  `drawFacadeLedge` floors; `drawThrowWindow` the thrower tell; `drawBigJimGlint`). `lanes.ts` — the Blacklight Lanes (UV
  carpet print, posters, lane boards + monitors, BOWL-O-RAMA neon, disco-ball spots, pin decks + sweep bar on the kick,
  ball returns, the mirror ball; `drawLanesFloor`, `drawRollingBall` with a UV rim so it reads on the dark lane). The Lanes
  scene is authored around its own floor (`Stage.baseY/sceneCam`: the Lanes sit ~950 px up).
- **Lighting keys** (`lights.ts`): `facade → facadeHigh` (blended by camera height: colder and starrier as you climb) and
  `blacklight → blacklightHot` (the chorus). Level presets: sky `facade` / `lanes`, ground `facade` / `lanes`.
- **Act-2 entity skins** (`render/mechDraw.ts`, from `game.mech`): thrown bottle = lacquer-red glass with a dashed red arc
  and a crosshair tightening on the bat point, thrower leaning out of a lit window with the bottle cocked 1 beat before;
  batted = gold with a gold trail; firebomb = burning rag, floor ring, ink + red flame points; bowling balls; the
  pre-chorus window crash (a LANES window that bursts on the HEY); Big Jim's glint.
- Measured (M5 Pro, GPU, 1920×1080): 60 fps (p50 16.7 ms, p95 ≤ 18.4 ms) at DPR 1 and 2 in the chorus, the facade and
  the Lanes; renderer JS avg 0.9–1.7 ms, p95 ≤ 2.4 ms.

## Iteration 4 (act 3 climax + act 2 support)
- **Act 3 scenes** (lazily built by `Stage`, each authored around its own floor via `Stage.baseY`; ground styles → env:
  felt→`poolroom`, rack→`casino`, roof→`roof`, penthouse→`penthouse`, filmstrip→`theatre`; sky presets poolroom / casino
  (`velvet`) / sunset / dusk / penthouse (`throne`) / theatre (`houselights`)):
  - `poolroom.ts` — green damask + walnut wainscot, cue racks, fight posters, a score abacus sliding on the beat, BILLIARDS
    neon, background tables under swinging green lamps (light cones + smoke), players shooting on the kick, jukeboxes that
    BOOM on the kick; floors ARE pool tables (`drawFeltFloor`: rail + diamond sights, pockets, turned legs); `drawBench`
    (see-saw launch skin), `drawBarBell`, `drawBallRack`, `drawJukebox`.
  - `casino.ts` — velvet drapes + gold pilasters, Big Jim's portrait, the JIMPERIAL CASINO bulb marquee, crystal
    chandeliers that die one per crack (`state.dark`), roulette / slots / croupiers, a vignette that closes in; floors =
    THE GOON HEAP (`drawRackFloor`), `drawChandelier` (also the pendulum skin), `drawChipTower`, `drawHeadGoon` (THE
    BREAK), `drawRackFrame` (hangs in, SLAMS, bursts on the break).
  - `roof.ts` — THE SUNSET ROOF (the widest shot): sky + slow god rays + corona, far skyline, a two-depth ROOFTOP SEA
    toward the horizon (neon canyons waking with dusk, a multiply depth grade), the Jimperial's penthouse tower with two
    glints, near water towers / billboards / chimney smoke, pigeons across the sun, an anamorphic flare. Light arc:
    `sunset` (272) → `sunsetRose` (+8 beats) → `dusk` (+16), expanded from one `sky: sunset` cue (`Stage` LIGHT_ARC).
    `drawSignLetter` (3-storey steel box letter, rose neon tubes, chasing bulbs; pivots about its bottom-LEFT corner and
    lies as a bridge whose top is the pivot; tube pops + sparks + dust on the SLAM, dead grey tubes after),
    `drawLetterLegs` (the posts), `drawRoofFloor`, `drawSkylight`.
  - `penthouse.ts` — the throne room: one skylight shaft with dust, a panoramic window on the night city, curtains,
    gold busts, the BJ monogram; `state.blaze` strobes the room on the reveal's beats, `state.crack` flashes on a lens
    crack; `drawPenthouseFloor` (black + gold marble), `drawGlassWall`, `drawDecanter`.
  - `finale.ts` — `makeFilmVoid` (inside the film), `drawAuditorium` (the PULL-OUT hall: gilded proscenium, red
    curtains, house lights up, the audience doing a WAVE on the beat, popcorn on the snare), `drawMarqueeCutIn` (the usher
    swaps BIG JIM for SLIM CHANCE), `drawIris` (9-blade aperture), `drawTheEnd` (black → the film snaps and flaps → THE END
    burns in), `drawVictory` (a second iris opens on Slim on the throne, the ex-goons applauding), `drawFilmstripFloor`,
    `drawIrisBlade`.
- **Big Jim** (`bigjim.ts`, `drawBigJim(g, x, y, s, state)`; s = 1 ≈ 1150 px seat → pompadour, `JIM_NORM`): the fig velvet
  pear with nap sheen + scene rim light, flared satin lapels with gold piping (the gauntlet's ledges), open shirt + chest rug +
  a gold chain of medallions (snaps: `chainT`), curtain BELL SLEEVES with gold braid cuffs, anvil fists with danger-red
  knuckle rings (`drawJimFist` = the slam-lift skin in the penthouse), a pompadour with a skunk streak, mutton chops, a
  horseshoe moustache over a gold-toothed grin, a cigar, and the MIRRORED AVIATORS (`drawJimLens`: the sky reflected + a
  tiny tangerine Slim that grows with `reflect`; crack 1 = spider crack, 2 = shattered with his tiny worried eye). Poses:
  `bluff` (arms flung up, sleeve wings, blazing lenses, roar + shock rings), `roar`, `reel`, `panic`, per-arm `fists`
  targets with rubber-hose two-bone IK (stretches up to 2.4x to reach the play band), `fistHidden`, `throne`. `JIM_PARTS`
  = where his bound parts sit.
- **In the game** (`render/act3Draw.ts`, `Act3Art`, reads `game.mech.act3`): Big Jim behind the play band with BOUND-PART
  ALIGNMENT (on a lens / chain beat his whole body leans so that part sits exactly on its target: he ducks his face into
  the play band on the HEY, the lens target keeps only its gold ring); fists = the gauntlet's slam lifts (arms reach
  down to them); his backhand rides the Burn's lunges; framed in a film frame on screen for the finale; aura rays in the
  reveal. The rack (goons piling in per tier, the frame, the scatter numbered like balls), the letters (legs, topple,
  camera shake on each SLAM), the hush (sepia hold + changeover dot), the finale IRIS aiming at his face and SLAMMING
  on 340, then the ending in SECONDS (`ENDING`: THE END until 3.0 s, victory, the poster waits until 6.2 s). The
  renderer squeezed the whole film into the theatre screen for the PULL-OUT (iteration 5: replaced by the full-frame curtain frame, see below; `drawAuditorium` stays in the lab). Poster: the real tiny
  Big Jim (cracked lenses), snipes HELD OVER! / BROKE THE RACK! / LENSES CRACKED n/2, "THE COMPLETE PICTURE".
- **Act-3 skins in render**: breakable looks balls / bell / chips / headGoon / skylight / letterNeon / fist / lapel / jaw /
  lens / decanter / glasswall / chain / popcorn / finalHit (+ families per env for neutral hints); pendulums = green
  felt lamp (pool room), crystal chandelier (casino), gold BJ medallion (penthouse); bounce pads = bench see-saws (pool
  room, roof); his velvet SLEEVE is the penthouse's knee-slide sign (red cue tips = the stumble points).
- **Act 2**: the climb's terrain above the street is see-through IRON FIRE ESCAPES (`drawFireEscape`: stair treads with a
  stringer + handrail when a span touches a neighbour ≤ 45 px lower/higher, landings with railings, brackets and drop
  ladders; long roofs keep the cornice + a lit brick wall with windows) so the wall and the city stay visible under you;
  hook-ride skins (`mechDraw` `drawHook`: counterweight rope + pulley + sandbag, laundry line with pinned sheets / steep
  zip cable, SPARKLE WINDOW CO. cradle; a gold grab ring the beat before); Big Jim's glint = the real rig in a 3x window
  while the camera stops and tilts up (`Moments.glintK`); the window crash = a full-frame shatter (white pop, cracks
  from the hero, shards flying at the lens). THE BLACKLIGHT LANES at full blast: glowing lane underbody with LANE LIGHTS
  chasing on the 8ths, the ball return, a crowd of bowlers dancing behind a UV rail (arms up on HEY), disco-ball beams
  sweeping + UV floor fog. The chorus gel/iris is dialled down on the sunset roof (`Moments.gelScale`).
- **Projector sync** (`render/calibDraw.ts`): the latency tap test as an ACADEMY FILM LEADER — countdown numbers, the sweep
  wedge per click, tap pips on the rim (12 o'clock = on time), sprocket strip with early/late marks.
- Lab: tab **Act 3** (`act3=jim|roof|pool|casino|penthouse|finale`, `bluff= roar= crack=L,R reflect= chain= panic= fall=
  dark= drop= burst= k= marquee= iris= end= win= hide=<layer ids> nofilm=1`). `gameshot.mjs --end --endwait=<ms>`;
  the art tools' Vite servers run without HMR/watch (other agents edit the tree mid-run).
- Measured (M5 Pro, GPU, 1920×1080): 60 fps in every act-3 scene and the reworked act 2 at DPR 1 and 2 (p50 16.7 ms,
  p95 ≤ 18.4 ms); renderer JS avg 1.0–1.4 ms, p95 ≤ 2.0 ms (one ~25–30 ms spike when a scene is first baked on entry).

## Iteration 5 (polish: review iter4 fixes 1, 8, 9 + the visual halves of 4 and 5)
- **THE FINALE LANDS** (`render/act3Draw.ts`, `art/grindhouse/finale.ts`, `ENDING` in seconds from the final hit): the film
  stays FULL-FRAME through 340 — no more squeeze into a small screen: from the `pullOut` cue (332) red velvet swags + a
  gold-fringed valance creep over the frame's edges (`drawCurtainFrame`) and the MEANWHILE marquee cut-in slides in top
  LEFT (clear of Big Jim's frame); the iris before the hit is a vignette whose blades only creep in at the corners. ON 340:
  the renderer FREEZES the strike (a copy of the finished film frame, taken on the finalHit's contact, ~0.1 s; a late or
  missing swing freezes by 0.22 s), pushes in on it (+16 %, sepia warming), a light burst at the target
  (`drawFinalBurst`: white-out, gold rays, shock ring), Big Jim flattened into a pancake in his film frame with KO stars,
  the house ERUPTS in front of the screen (`drawEruption`: jumping silhouettes, popcorn, confetti cannons, deterministic in
  T), and the iris SLAMS shut on Slim by 0.6 s. THE END burns in faster (black 0.1 s, burn 0.35-1.25 s), dips to black,
  then a clean cut (no double exposure) to the VICTORY (`drawVictory`: the iris opens on Slim at 2.7x on Big Jim's throne,
  a gold/rose sunburst, the follow-spot, a slow push-in, the marquee over the throne now reading SLIM CHANCE in chasing
  bulbs); the poster at 6.6 s. The HUD fades out on 332 and stays off through the poster; no game flash over the burst.
- **The drop's reveal** (`Renderer.drawRevealCurtain`): the casino's velvet drape hangs at the roof's edge (the ground
  cue's x) and hides the sunset until the roof's `sunset` sky cue (272), then flies up in 0.6 beat. **Landed letters** are
  walkable floor: a riveted steel deck with the terrain cream lip along the bridge, the tubes blow on the SLAM and relight
  at half power (no more dead dashed outlines).
- **HUD** (`screens.ts drawHud(…, A)`, `feedback.ts`): two quiet clusters on soft dark plates (left: tokens, targets, the
  audience meter; right: metronome + the combo right under it); "BAR n" only with the debug overlay (1-based); ONE grade
  stamp at a time (the newest knocks the old one away in 90 ms), stamps shrink at combo 8 / 24.
- **Pool Room call and response** (`Act3Art.drawCallGoons / drawCallRings`): a foreground goon per call stomp (1 · &2 · 3,
  from the `stomps` lane inside each `callResponse` window) stands 0.9 beat ahead of Slim under his own lamp cone, knee
  up, STOMP (dust + shock ring), then leaps back out of the lane; each stomp fires a gold shot to the spot the answer lands
  on one bar later, where a gold ring waits and closes like an approach circle onto the target (bell ring / felt ellipse)
  ON its beat, then bursts. The level's call push-ins (`cam`) frame it.
- **Mid-act visual beats** (`render/beats.ts` VisualBeats, from the level's `setPiece` cues — `doorKick signDrop spotlights
  brawl houseLights lightChase streetReveal searchlights tenants` — with a default schedule for any it lacks, + `rain`
  37-42): the honky-tonk doors kicked open (lamp flare + splinters), the BEER sign snapping a chain and CRASHING on its
  cue, house lights down to three follow-spots tracking Slim with the audience standing into the light, a backlit bar
  brawl behind the counter (haymakers on the beat, chairs/bottles on the HEYs via `Director.brawl`), the house lights
  back up; the facade's windows lighting one per beat ahead of Slim, rain + lightning on the climb, the street far below
  (traffic streaks + a siren wash), moon + searchlights on the roof, tenants throwing their windows open to yell.
  Deterministic in the world beat (rewind-safe); gated to their environment.
- **Pre-warm** (`Stage.prewarm`, `Renderer.warm`): during the title / cold open / count-in / pauses, one step per frame
  builds + draws every scene and its floor into a throwaway canvas, allocates the freeze buffer, then draws the whole
  level's play layer window by window. The 20-25 ms first-draw spike (the honky-tonk's first low sign at 66.7) is gone;
  worst in-play frame on a full run ≤ ~8 ms JS.
- Tools (not committed, `playtest/out-art-tools/`): `beatshots.mjs` = beat-exact canvas captures of the real game +
  per-frame renderer ms (`--beats= --after=<s after 340> --expr= --init=`), `sheet.py` contact sheets.

## Iteration 6 ("FEEL": review iter5 fixes 2, 3, 4-visual, 6, 7, 9 + the new game events)
- **THE FINAL HIT CONNECTS** (`render/act3Draw.ts` FINALE + ENDING, `renderer.ts` lock): from 335.5 Big Jim LOOMS in —
  big, roaring on every beat, both fists up — until his face sits ON the final-hit target by ~339.3 (the target's HEY
  star is replaced by a gold ring on his jaw); the camera pushes in (+24 %) for the last Hup-Hup-HEY. On 340: white-out →
  3 film frames in NEGATIVE → the contact frame HELD (hitstop, a jolt on its first frames) with KNOCKOUT!, gold rays, a
  shock ring and his aviators shattering toward the lens (`finale.ts drawLensShatter`); at 0.3 s the live world resumes
  with the camera + Slim LOCKED on the blow (render-only; Slim holds the follow-through, a slow push-in, decaying shake),
  and only NOW does Big Jim react: head snaps back (0.3–0.46 s), squashes into a pancake with KO stars (0.42–0.68 s) and
  is sucked away into a tiny film frame (0.62–1.0 s). The iris shuts at 1.05 s, THE END, victory at 3.55 s, poster 7.0 s.
  No more shrink into a cut-out before the hit. Stamps sit out the finale (only the KNOCKOUT! word).
- **SLIM BIG AND NEVER BLEACHED**: `FRAMING.zoomMul` 1.14 → 1.2 (lead 0.22 keeps the runway ~3.4 beats); the level's
  zoom-outs are squeezed 40 % toward the verse framing on screen (`camera.ts squeezeZoom`; wide shots ≤ 0.7 — the
  finale's pull-out — keep their width); the chorus pull-out is −4.5 % (was −13 %) and sold instead by a slow camera ROLL
  on the 2-bar line (`Camera.musicAngle`) + a push-in punch on each chorus downbeat; launches −10 % (was −16 %). Frame
  order: every LIGHT layer (chorus follow-spot/iris, the honky-tonk spotlights, door blast, projector flashes, crash
  bloom, giant-smash flash: `Moments.drawLight`, `VisualBeats.drawFront`, `Director.drawLight`) is drawn BEFORE Slim, and
  Slim has his own pass (`render/heroPass.ts`): drawn once offscreen, laid down over a soft ink shadow (down-right) and a
  cream rim light (up-left, tinted by the scene's rim) — he pops on any background, spotlights light the room around him.
- **LESS NOISE**: stamps only for the game's notable `stamp` events (first Perfect of a phrase, streak milestones
  "x25 STREAK!", HEAVE!, WHEW!, FILM FOUND!; `feedback.ts`, giants keep their comic word); the Burn's fill lunge and its
  flare scale with `chaser.threat` (at rest a fill is a small pulse); checkpoints are a small SPLICE standee (3 film
  frames + a diagonal strip of splicing tape, the clapper slate beside it) instead of the full-height beam.
- **THE GOONS PLAY THE SONG** (`render/band.ts`, `jammers.ts drawMusician`): a band stands on the floor line behind the
  play band (parallax 0.92, feet behind the lip, its own soft stage cone): cowbell goon (clanks on every `cowbell`
  overlay hit), stomper (knee rises over the gap, SLAMS on `stomps`), sax goon (leans back and blows through each `hooks`
  phrase), upright-piano goon (pounds the `piano` accents). Each member plays the part that is busiest where the hero
  passes him (piano ×3, cowbell ×1.5, stomps; a hook = sax) — the pianists turn up at 124–129. A cream pop behind the
  instrument on each hit. The play-band Bluffers play along too (`JabberPose.part/partHit`, `band.ts partAt`, the audio's
  `goonPartAt` rule): cowbell on the belt that clanks, boot STOMP rings, a HEY! on the gang shouts — the tell stays the
  only red. Timing from `MusicFeed.lane(name)` / `laneSpan` (any beat-map lane, beat-exact).
- **SPEED** (`render/speedLayer.ts`): a foreground whip at parallax 1.6 — per scene one family of dark silhouettes (bar
  stools + chair backs, lamp-post bases + railings, fire-escape rails, velvet-rope stanchions, lane monitors, lamp shades,
  girders, valance swags), 2 beats apart in layer space, only in a bottom band (below the floor line) or a top band
  (well above the hero; none where threats come from above) — never over the lane; a 3-ghost smear at run speed. Faint
  cream speed lines race through the top/bottom margins at full run speed (thicker in a chorus / the catch-up surge).
- **THE FACADE CHANGES FACE EVERY 4 BARS** (`facade.ts FACADE_THEMES`, `setFacadeGrid` from `Stage`): each wing of the
  Jimperial = one 4-bar section (its light well is the seam), cycling red-brick fire escapes → NEON hotel (HOTEL JIMPERIAL
  chasing letters, every window neon, two blades) → soot-black IRON (fire escapes on every other bay, soot streaks) →
  the LAUNDRY COURTYARD (stucco, lines strung across every storey flapping on the hats, flower boxes) → the BILLBOARD face
  (terracotta, a giant painted JIM-COLA ad on scaffolding, a water tower on a setback).
- **New events rendered**: WHEW (near-miss) = a render-only slow-mo flash (cold desaturated edges that spare the star, two
  rings contracting onto Slim, a push-in) + the WHEW! stamp; FILM CANISTER = the gameplay placeholder skin
  (`render/canisterDraw.ts`, glint on the count) + a pickup burst (gold flash, spinning rays, a ring, sprocket confetti)
  + FILM FOUND! stamp; the poster's RANK gets a stamp per billing tier (`render/rankStamp.ts`: S = gold marquee badge with
  chasing bulbs + sunburst, A = laurel wreath + stars, B = buzzing midnight neon, C = crooked pulp stamp with slime drips,
  D = a VHS cassette with a handwritten label and tracking lines).
- Measured (M5 Pro, GPU, 1920×1080 DPR 1, beat-exact capture tool): 60 fps everywhere (p50 16.7 ms, p95 ≤ 18.4 ms);
  renderer JS avg 1.2–1.7 ms, p95 ≤ 2.8 ms (the hero pass + band + speed layer add ~0.3 ms).

## Iteration 7 ("HEARD AND SEEN": review iter6 fixes 3, 4, 5, 6, 7-visual, 8, 9, 10)
- **LETHAL PITS EVERYWHERE** (`stage.ts drawLethalPit`): in a raised scene (the gauntlet on Big Jim, the Lanes, the roof)
  the furnace glow, embers and teeth sat at the kill line hundreds of px under the lip — off screen, a black void. They now
  boil at most 260 px under the lip: every lethal gap reads lacquer red + hot rim + teeth.
- **THE ENDING, TRIMMED** (`act3Draw.ts ENDING`): iris shut 0.9 s → THE END (its card clock ×1.5) → victory 2.35 s →
  poster 4.3 s, the rank stamp lands 0.55 s later (`screens.ts POSTER_STAMP_AT`): hit → stamp 7.6 s → **4.85 s**. Audio
  hooks on `game.events` (emitted by the renderer, which owns the ending's clock; up to `ENDING_LEAD` 50 ms early with
  `inS` = seconds to the moment): **`theEnd` `{ inS, beat }`** when the iris has shut and THE END starts, **`posterStamp`
  `{ inS, letter, tier }`** when the stamp slams (uses `game.finalRank` when present). Measured: 0.85 s + 0.05, 4.82 s + 0.03.
- **THE COLOUR REEL** (`render/intro.ts`): bars 1-4 are a silent film — the background graded heavy sepia, the play layer
  lighter (Slim, drawn after, stays tangerine; tokens keep a gold glint), the band only mimes. On the `colorBurst`
  set-piece (15, the first HEY; fallback 15) a Technicolor wipe (cyan / magenta / yellow fringes + sparkles) floods out
  of the struck pendulum in 0.7 beat with a cream flash and a camera punch, then the saturation is pushed up and eases back
  over 16 beats. **BOING!** (`renderer.ts drawBouncePop`): every bounce pad pops (shock ring, rays); the street's short
  mini-bounce (31) gets the comic word.
- **THE ROOF SIGN** (`render/slimSign.ts`): a rooftop neon on a steel lattice ("BIG" script over J I M 'S box letters,
  rose) drifts across the stop-time at parallax 0.22, over the facade's lit windows. Each hit on a `signLetters` beat
  (judge grade ≠ miss) zaps from the strike to its cell: the rose tube dies, the new letter STUTTERS to life in gold
  (dead tick, on/off slices, steady) with sparks — S L I M; complete = gold bulbs chasing the frame. A miss leaves BIG
  JIM's letter. After Big Jim's glint (+0.5) a cable snaps, the sign swings and drops. Fallback: the stop-time 'neon' crates.
- **SPEED** (`speedLayer.ts`): one slot per beat; a third filled at a cruise, up to 80 % in a sprint (chorus, surge,
  launch: `boost`, fading per slot — no pops), props closer (×1.3 → 1.6), a hot rim on their top edge (they vanished on
  the dark apron), a rim-lit motion-blur streak + 2 ghosts, more/brighter margin lines. **THE FOREGROUND MUSICIAN**: one
  big goon (parallax 1.25, every 24 beats of layer space; not in the penthouse / theatre) rising from the frame's bottom to
  just under the floor line, playing the part that's busiest there on its own lane (`band.ts kindFor` / `LANE`), with a
  footlight glow and the cream pop on each hit; he fades to 0.3 while a pit passes behind him and sits out the sepia.
- **LESS HUD**: the combo title card half again (26-36 px) at 40 % opacity, up full for 1.5 s on streak milestones
  (10 / 25 / 50 / 100 / +50); hint cards smaller and higher; **on-object glyphs** (`RuntimeLevel.glyphs`: an ink badge
  with a gold rim over the breakable / pendulum at its beat, ticking on the beat, flashing gold on it).
- **CHORUS CONTRAST** (bar + Lanes, weighted by the chorus shot): a multiply grade on the background (dark at the top and
  under the floor line, clear around the play band), a warm key light across every floor top, a gold halo under each token.
- **CANISTER TEASE** (`canisterDraw.ts`): from 4 beats before the takeoff to 3 after the pass the canister glints on
  every beat — a gold shaft down to the takeoff spot, a ring breathing out, the star — and above the frame a glinting reel
  badge with an up-arrow hangs at the top edge. 'tease' / 'rally' stamps use the canister / heave cards (tease under it).
- Measured (M5 Pro, GPU, 1920×1080 DPR 1, whole run): 60 fps (p50 16.7, p95 18.3, max 23.6 ms, 0 frames > 25 ms);
  renderer JS avg 1.42 ms, p95 2.1 ms.

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
- `lights.ts` — 'grindhouse' set: `cold golden neon bar facade facadeHigh blacklight blacklightHot poolroom velvet sunset sunsetRose dusk throne houselights`.
- `bigjim.ts`, `poolroom.ts`, `casino.ts`, `roof.ts`, `penthouse.ts`, `finale.ts` — act 3, see "Iteration 4".
- `jammers.ts`, `facade.ts`, `lanes.ts` — see "Iteration 3" above.

`palette.ts` — `CF` (current theme; sacred: tangerine = hero, gold = reward, lacquer red = danger) and the legacy `PAL`.

## Readability rules baked in
Hero: tangerine + film-black ink outline, nothing else uses tangerine; backgrounds are hazed/desaturated by depth via
`lit()`; every walkable top has a dark edge line; background actors are dim silhouettes; the lab's greyscale+blur toggle
(`G`) is the check.

## Danger language (entity skins, `src/render/entityDraw.ts`)
LETHAL = lacquer red `#B3201B` + hot edge `#FF4A3D` (glow/rims), black void, jagged teeth / chevrons — pits, the Burn.
STUMBLE = film-black ink silhouette, red only on POINTS (cue tips, splinters, broken bulbs) — snapped cues, Bluffers,
low signs. REWARD = gold rim/glint the beat before + gold ring on the beat — tokens, pendulum targets (bar sign / pool
lamp / giant 8-ball), breakables (bottle / glass / jug / crate / neon letter). TERRAIN = 4 px black edge + cream lip
(dimmed + dashed when a keg lift is up = not solid). Tangerine = Slim only. `SKINS` + `drawKind()` give any new entity
kind a generic silhouette in its class until bespoke art lands.

## Known weaknesses / next
The goon band stands on a damped floor line (a big step changes it over ~0.2 s); the speed layer has no props on the
theatre / facade tops; the title marquee still uses type for Big Jim (the rig could star there); the roof's sun can sit behind a far tower; the facade's light-well gaps are fixed
by layer x (not aligned to level beats); window-pane breakables stand on a glazier's A-frame; the Bluffer is a single rigid puppet (no rig); the scene
split at the doorway is a hard clip (fine behind the door frame, visible if the camera lingers); flying debris is
screen-space (does not parallax); scene splits between act-3 environments are hard clips (hidden by the KRAK flash / launch,
the drop's curtain); the mid-act beats' background figures are screen-space (no true parallax); the victory throne still
carries Big Jim's BJ crest under the marquee; the roof sign's rip-down happens while the glint holds the camera (mostly
off screen); the chorus grade sits under the light layer, so the bar's beams still haze the room.