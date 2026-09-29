# The "demonic HEY" fix (playtest note: "the 'hey's are a bit demonic, fix them up")

> **Superseded (iteration 9b).** The user then asked: "just change the 'heys' to more of a hitting sound effect". Every
> shouted HEY / HUP in the game is now a percussive HIT (the strike, the audience layer, the 'shouts' overlay stem, the
> goon stinger, the final hit): `tools/music/instruments/fx_hits.py`, `sfx.py --set=hits`, `tools/music/hit_report.py`;
> see `docs/reviews/audio_checklist.md` items 43–48 and the CLAUDE.md audio notes. The notes below are history.

## Diagnosis (measured)

1. **Overlay stem** (`stems/jim_edit_overlay/shouts.ogg`, `tools/music` `SampledGangShouts`): each HEY stacked 10-16
   layers; ~80 % of the solo layers were ONE performer (Mafon2) resampled N(0, 0.9) st up to ±2.5 st (formants move
   with it). One voice layered at several pitches is the textbook demon-voice effect. Plus reverberant / processed
   group takes ("Hey huge", a stadium chant), a darkening EQ (+1.5 dB 250 Hz, −3 dB shelf at 6 kHz) and a 2.2 s dark
   hall send. Measured at the 20 HEY lane events: centroid 1034 Hz, low-mids 80-500 Hz −4.2 dB vs presence 1-4 kHz,
   tail 0.35-0.8 s after the hit −7.4 dB. Group shouts have no single F0 (pyin voicing ≈ 0); the solo takes sit at
   natural F0 (men 200-300 Hz), so the "growl" is the cloned-pitch stack + darkness + reverb, not one low F0.
2. **Strike HEY** (`src/audio/sfx.ts` `Sfx.hey`, on EVERY strike, 5-6 voices with the crowd / on a heave): a
   formant-filtered sawtooth cluster (196/208/233/262/294/311 Hz = G3 G#3 A#3 C4 D4 D#4, chromatic) sliding down
   2 st. Rendered in Chromium: centroid ~600 Hz, low-mids +5..+6 dB over presence. NOT FIXED YET (below).
3. Also noted: the death groan `crowd_ooh` plays at rate 0.78 (−4.3 st) in `stage.ts onDeath`.

## Done (iteration 8)

- New takes: CC0 group of guys (jukkis111 ×3), women's HEYs (AmeAngelofSin CC-BY, Legnalegna55 CC0), vikuserro "Ey!";
  dropped the growled / screamed / reverberant takes (SAMPLES.md). Every kept take transcribes as "Hey!" (Whisper).
- `SampledGangShouts`: ≤ 8 layers, one take per performer, ~40 % women, ±1 st max (σ 0.45), 0-10 ms spread,
  EQ −2 dB 320 Hz / +2.5 dB 2.8 kHz. Overlay sends: room .14 only (was room .25 + hall .12).
- `build_original.py --stage shouts` re-rendered both overlay stems (+ the final hit). Same level vs the record
  (−5.3 dB broadband, −0.9 dB in 300 Hz-4 kHz at the HEYs). HEY centroid 1034 → 1674 Hz, low-mid/presence −4.2 →
  −11.2 dB, tail −7.4 → −20.2 dB. Comparison: `playtest/out-audio/hey_before_after.mp3` (stem only, before then after).

## Done (iteration 9): the strike HEY, the one-shots, the groan

- `sfx.py --set=voices` (merges into the manifest; `core`/`all` include it): `hey_1..4` = the hero's HEY, ONE
  performer's natural takes (Mafon2 takes 12/17/20/27 of the cache, F0 268/233/250/281 Hz, never resampled), the /h/ +
  0.24 s of vowel + a 70 ms fade (0.32-0.35 s), dry, EQ −2.5 dB 320 Hz / +3 dB 3 kHz / +2 dB shelf 7 kHz; `hey_crowd` =
  the overlay's gang (8 layers) 0.65 s, dry; `hup_1..2` = 3-voice gang (1 group take). Old vs new (file analysis):
  hero centroid 1.8-2.1 kHz → 2.1-2.5 kHz, length 0.46-0.79 s → 0.32-0.35 s; hey_crowd 1.9 → 3.3 kHz, low-mid/presence
  −1.7 → −13.7 dB, 0.95 → 0.65 s.
- `Sfx.hey`: plays `hey_1..4` round-robin (shuffled cycle, never the same take twice running) from StageAudio's bank
  (`SampleBank.forContext`), + `hey_crowd` when the crowd is up, both louder on a Heave's roar (`mix.ts` HEY_SFX); a HEY
  with no lead time starts into the /h/ (`PlayOpts.catchUp`, keeps 12 ms). Synth fallback: one bright unison voice on /e/
  after a noise /h/ (no chromatic stack). `goonShouts` stinger −12 → −15.5 dB (the new gang file is +3.5 LU hotter).
- Groan: `GRADE_SFX.groanRate` 0.78 → 0.94 (−4.3 st → −1 st), low-pass 1.4 → 1.6 kHz.
- Measured in the real graph (`node src/audio/lab/mixlab.mjs --prefix=hey` → `tools/music/hey_report.py`, chorus 1 at
  FULL HOUSE): hero + gang (every strike at crowd ≥ 4) −24.8 LUFS momentary (old synth −23.2), centroid 2.6 kHz (old
  1.7), low-mids 8 dB UNDER presence (old 4 dB over), tail 0.35-0.65 s −35 dB, vowel on the beat ±2 ms (old synth
  +5..+17 ms), −5.7 dB under the music in 1-4 kHz (old −10.6: brighter, more present at the same loudness); the Heave
  roar −20.7 (old −22.7).
