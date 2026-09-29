# Slim redesign — notes

Playtest: "improve the look of the character, it's a little bit like a bad drawing at the moment."
**Shipped (iteration 9): direction A (inked comic) is the in-game Slim.** `drawSlim` paints it everywhere (the run, the
title marquee, the end poster); `?slim=old` shows the original capsule rig for comparison. Before/after sheet:
`playtest/out-slim/final.png` (key poses old vs new + the real game in 4 scenes).

## Diagnosis (old rig, `slim.ts`)
- **Proportions:** legs as long as the torso, arms the same tubes as the legs, a small tank-top lump. The "hulking pool
  shark" reads as a skinny kid in an orange vest. Nothing says power (no V, no traps, no big forearms).
- **Pure profile:** one shoulder, no V-wedge, the chest (open shirt / cream tank from DESIGN §2) never shows.
- **One line weight:** every capsule has the same 3 px outline, so every overlap draws a full-weight seam through the
  body. This is the #1 "amateur drawing" tell.
- **Flat colour + blob hands:** one tone per part plus a random shade ellipse, no consistent light; fists are ellipses.
- **Poses cover the face:** hop = both arms over the head, the run carries the cue across the face; no line of action.
- **Off-model vs DESIGN:** a pompadour and a tank top instead of shaggy 70s hair + an open tangerine bowling shirt over a
  cream tank; the cue is not carried on the shoulder like a bat.

## What's built (`src/art/grindhouse/slimx/`)
- `rig.ts` — a new shared, style-agnostic rig: 3/4 view (near shoulder at the back edge, far shoulder peeking at the
  front, like SoR4 brawlers), V-wedge torso ~2.4x the leg length, head set low in the traps, gorilla arms, short legs,
  all 12 poses re-authored as WORLD limb angles or IK hand targets: bat carry on the shoulder, a real run cycle
  (Catmull-Rom keys: contact/mid-stance/toe-off/heel-kick/knee-drive/reach), cannonball hop, confident fall, crouch land,
  strike (contact at t=0, the follow-through wraps the cue back onto the shoulder; legs keep running while moving),
  break-shot heave lunge, knee-slide with the cue raised, tucked back-roll stumble, dead flail, splice respawn, victory.
- `paint.ts` — the **Sheet**: parts as Path2D, painted in two passes (fat silhouette contour for everything, then per
  part a thin part line + hard cel shade from ONE key light + clipped details) = thick outside / thin inside; asymmetric
  muscle segments (`seg`), local frames, brush tapers.
- `styleInk.ts` — **candidate A, inked comic (SoR4)**: ~70 % done. Anatomical arms, scalloped fists with thumb,
  flared jeans + chunky boots, open bowling shirt over the cream tank with the cream panel stripe and belt, feathered 70s
  shag, mutton chops + horseshoe moustache, boxer nose, heavy brow, cached 2-colour flash tattoos (panther, swallow,
  dagger-heart, 8-BALL), 3-tone cel, tapered cue with gold notches.
- `styleHose.ts` / `styleFlat.ts` — **candidates B (rubber-hose, Cuphead × 1973) and C (flat vector, Hi-Fi Rush /
  Sayonara) are NOT started**: placeholders that call A.
- `index.ts` — `drawSlimX(style, ctx, x, y, SlimState)` (same contract as `drawSlim`), smears drawn behind the body,
  fx. Lab: `src/art/lab/slimxViews.ts` (`layout=poses|world`, `bg=street|bar`, keys A/B/C), registered in `views.ts`.
- Sheet so far: `playtest/out-slim/compare.png` (before vs A, A in the street and the bar at in-game scale).

## Known issues in A (as of the WIP commit, all fixed in iteration 9)
- Run: the far arm pump rises to head height (reads as a punch) — cap the forearm at ~+70 deg over the upper arm.
- Chops still read as a full beard at game scale: widen the clean chin / cheek gap, lighten the chops' top edge.
- Hair still a bit helmet-like: bigger nape flicks, a visible side part.
- Strike: check the follow-through frames at game speed; the smear alpha/width tuning.
- Perf: draw ~0.3-0.5 ms per Slim (lab avg 5.8 ms for ~25 Slims incl. the big one); clip-heavy — measure in game;
  cache the head per expression if needed.

## Next steps (WIP plan, superseded)
1. Build B and C painters on the same rig (the rig + Sheet make each a ~400-line painter).
2. Render the real 3-way sheet (`view=slimx&layout=poses&style=…` + `layout=world&bg=street|bar`) to compare.png.
3. After the pick: swap `drawSlim` to the chosen painter (keep the `SlimState` contract), check `heroPass.ts`
   box sizes, `SLIM_SCALE`, the poster / title / victory call sites, perf in game.

## Iteration 9: A finished and shipped
Fixes against the playtest note ("a bit like a bad drawing"), every pose checked at x2-x6 and in game:
- **Face:** the chops read as a full beard → separate sideburn chops (ear → jaw corner) + a drooping moustache, the
  cheek / chin / jaw front clean and lit; boxer nose with a nostril, eye-socket shade, heavier lids and a split brow that
  carries the expression; the jaw squared.
- **Hair:** helmet → choppy shag: layered notches down the back, a lock up at the crown, feathered wings, separate
  sheen clumps flowing from a side part (not a headband), nape flicks that trail with speed.
- **Body:** a bigger camp collar, a scoop-neck tank with collarbone skin + ribbing, pec-shelf spot black, shirt-fold
  brush strokes, shirt tails that flutter; rolled sleeves shortened to the deltoid so the tattooed biceps show (the long
  sleeve read as a shoulder pad); slimmer, longer legs (45 px, flares over heeled boots) = a V, not a barrel; the far
  leg / arm a clear step darker; cel shadows ~2x deeper (the forms turn); a new fist (knuckle ridge, finger creases,
  wrapped thumb) and open hand; the cue's inlay spike removed, a varnish glint.
- **Poses:** run — the far-arm pump capped (fist chest-high at most, was reaching head height = a punch), deeper knee
  drive / heel kick, the carry fist lower and forward; hop — a real tuck (knees to chest in 0.08 s, the stretch capped at
  ~9 %: he never goes pencil-thin); fall — the far fist out front (the raised open hand read as waving); strike — the
  follow-through wraps the cue back over the near shoulder with the hands at the chest (was overhead, covering the
  face), the swing comes up from low-FRONT (no smear under the floor), a cue pointing up-back is drawn behind the head;
  knee-slide — the cue played like a guitar (far hand strums at the hip, near hand on the "neck"); stumble — an "OOF"
  (arched back, arms flung forward, heel up, 8-balls orbiting, DESIGN §2) instead of a full back-roll; dead — a limp
  starfish tumble; victory — bar A fist pump with the cue planted, bar B double flex.
- **FX:** the strike crescent is now a cel-stepped fan (3 nested fans, newest most opaque, hot cream leading edge, ink
  rim) behind the body; the break shot a hard streak + speed lines behind the body and a shock ring in front (the old
  wedge hid the cue).
- **Integration:** `drawSlim` dispatches (`setSlimLook`); `SlimDriver` reads `?slim=old`; the controller's squash is fed
  at 30 % (the rig squashes per pose). Scale: ~140 px rig x 1.1 x framing 1.14 ≈ 170 px at 1080p. Checked in the street
  (sepia + colour), bar, facade climb, sunset roof, lanes, pool room, Big Jim, theatre finale, title, poster: the hero
  pass (ink shadow + cream rim) keeps him off every background; never bleached or muddy under the film pass.
- **Perf:** ~0.15 ms per Slim (Path2D + clip cel passes, tattoos cached); in game 60 fps at 1080p, renderer JS
  1.0-1.7 ms/frame avg (unchanged vs the old rig within noise), no caching of the body needed.
- **Open:** B/C painters never built (A was picked); the near sleeve still reads a little round in the shoulder carry.
