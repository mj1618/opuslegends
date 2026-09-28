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
