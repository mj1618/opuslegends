# Slim redesign — notes (WIP, interrupted)

Playtest: "improve the look of the character, it's a little bit like a bad drawing at the moment."
The in-game Slim is UNCHANGED (`src/art/grindhouse/slim.ts`). The candidates exist only in the art lab
(`/artlab.html?view=slimx`, tab "Slim ×3").

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

## Known issues in A (next)
- Run: the far arm pump rises to head height (reads as a punch) — cap the forearm at ~+70 deg over the upper arm.
- Chops still read as a full beard at game scale: widen the clean chin / cheek gap, lighten the chops' top edge.
- Hair still a bit helmet-like: bigger nape flicks, a visible side part.
- Strike: check the follow-through frames at game speed; the smear alpha/width tuning.
- Perf: draw ~0.3-0.5 ms per Slim (lab avg 5.8 ms for ~25 Slims incl. the big one); clip-heavy — measure in game;
  cache the head per expression if needed.

## Next steps
1. Build B and C painters on the same rig (the rig + Sheet make each a ~400-line painter).
2. Render the real 3-way sheet (`view=slimx&layout=poses&style=…` + `layout=world&bg=street|bar`) to compare.png.
3. After the pick: swap `drawSlim` to the chosen painter (keep the `SlimState` contract), check `heroPass.ts`
   box sizes, `SLIM_SCALE`, the poster / title / victory call sites, perf in game.
