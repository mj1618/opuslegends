# The original recording: beat map, lanes, the level edit and reward overlays

The game plays the **original 1972 recording** of "You Don't Mess Around with Jim". The user has cleared its use.
The cover arrangement (`tools/music/songs/jim.py`) is shelved.

**Licensing rule:** the recording and every file derived from it live in `assets/audio/licensed/`, which is
gitignored and must never be committed. That covers:

- `jim_original.mp3` (the source)
- `jim_original.ogg`
- `jim_edit.ogg` and `jim_edit.mp3`

Everything else is ours and is committed: the beat maps, the overlay stems and the one-shots.

This document has no lyrics. Vocal material appears as timing and pitch only.

```bash
tools/music/.venv/bin/demucs -n htdemucs_6s -o tools/music/build/original/demucs reference/jim_croce_original.mp3
tools/music/.venv/bin/python tools/music/build_original.py      # grid -> lanes -> full (overlays) -> edit, ~2 min
```

## 1. Beat map (`assets/audio/jim_original.beatmap.json`)

It is a live band with no click. The tempo pushes from **161.5 BPM** (first 8 bars) to **166.6 BPM** (last 8 bars),
so the beat map is a **per-beat tempo map**. It has 476 tempo points: one per beat, 119 bars × 4.

- Beat 0 is song bar 1, beat 1. It lands at **0.1131 s** in the file (`audioOffset`).
- Time is linear inside each beat, which is exactly what the engine's `TempoMap` builds from these points.

### How the grid is built

The work is in `tools/music/original/beatgrid.py`:

1. **Separate the drums.** demucs (htdemucs_6s) produces a drum stem. demucs decoded the MP3 without honouring
   its gapless header, so its stems were **1105 samples (25.06 ms) late**. The offset is measured by
   cross-correlation and compensated.
2. **Track.** librosa beat tracking (tempo prior 164 BPM) gives a coarse grid. It is numbered consecutively from the
   transcription's anchor, song bar 1.
3. **Lock to the hits.** Every beat is locked to the drummer's hit: the strongest attack within ±45 ms, measured
   at 30 % of its rise on the broadband drum envelope. Band-limited kick envelopes peak 30–50 ms late on this 70s
   kit, so they are not used.
4. **Fit a smooth grid.** The grid is a robust 5-beat local linear fit through the hits. Hits more than 20 ms off
   the fit are dropped as outliers (fills and pushes).

The drummer plays a slightly laid-back backbeat. A grid locked hit-by-hit would make the tempo alternate by about
3 % from beat to beat, which the hero's run speed would feel. The smooth fit keeps beat-to-beat tempo changes
≤ 2.8 %. The exact hit times are kept in the `kick` and `snare` lanes.

### Accuracy (`tools/music/reports/jim_original.grid.json`)

| Check | Result |
|---|---|
| Grid vs. drum hits | **mean 4.2 ms, p90 8.5 ms, 93.3 % of beats within 10 ms**; max 27 ms, on fills |
| Mean offset, beats 1/3 vs. 2/4 | −0.1 / +0.1 ms (no bias) |
| Click track mixed over the song (`build/original/click_check.wav`, for listening) | same as grid vs. drum hits |
| Independent full-mix onsets (librosa spectral flux, backtracked) | median −6 ms |
| The engine's `analyzeBeatAlignment` heuristic on the full mix | mean +9 ms |
| Measured swing (off-beat 8th position) | **0.659** (IQR 0.60–0.71); `audio.swingRatio` |
| Beat-to-beat jitter of the grid | 1.0 ms SD |
| Tuning | A440 within ±8 cents, so pitched SFX stay at A440 |

The two full-mix checks bracket the grid. Strummed guitars and piano speak slightly before the drums, bass and
guitar slightly after.

## 2. Lanes

The full map has these lanes; the edit has the same set, remapped.

| Lane | What it is | Count (full) |
|---|---|---|
| `kick`, `snare` | Every detected hit at its **exact** time: fractional beat, `vel`, `pos` = on / and / trip. Classification is calibrated on the beat parity: kicks are 92 % on beats 1/3 and snares 97 % on 2/4. Snare hits on 2/4 carry `backbeat: true`. | 287 / 290 |
| `tom` | Off-grid tom hits (fills). | 35 |
| `fills` | Bars with off-beat drum accents. `accents` = the hits plus the landing beat. These are the song's phrase-end fills: an accent on the swung "and" of 3, then kick and snare on 4. Bars 4, 8, 12, 20, 30, 32–33, 50–51, 63–72, 80, 89, 97, 108, 112. | 25 |
| `bass` | Bass notes with pitch (pYIN) and length. | 562 |
| `bassWalks` | The song's signature bass figures, placed where the transcription says they occur. Each note is snapped to a detected bass onset (`detected: true`); most notes are confirmed. The figures: chorus A7 climb, E7 figure, **hook walkdown** B-A-G-F#→E, pre-chorus walk-up, B7 turnaround, verse-3 boogie climb, breakdown/outro chromatic pickup. | 48 |
| `vocalPhrases` | Phrase spans (start/end, no words). Verses use the transcription's phrase boundaries. Choruses use the canonical map: line1, line2, line3, hookA, hookB. The breakdown and outro use detection on the vocal stem. | 47 |
| `sustains` | Held vocal notes ≥ ~1 beat (pYIN), with the sung MIDI pitch. Add +12 for a lead-guitar octave. | 33 |
| `melody` | The vocal line as notes (transcription). | 525 |
| `hooks` | `hookA` = the title line over the walkdown (chorus bars 7–8: song bars 29–30, 58–59, 87–88, 104–105). `hookB` = the tag (after each chorus and six times in the outro). `line1`, `versePeak`. | 21 |
| `bassOut` | Stop-time, where the bass lays out. Detected at bars 13–20, 37–48 and 73–76, which matches the transcription. | 10 runs |
| `stops` | Whole-band stops. There are **none** in the original; the edit has one: its ending. | 0 |
| `energy` | One entry per bar: `mixDb`, per-stem dB, drum-hit count and `intensity` 0..1. Follow it for difficulty ramps. | 119 |
| `cue` | Section starts, plus `fade_start` (bar 116). The edit adds `final_hit`. | 20 |
| `shouts`, `stomps`, `claps`, `cowbell` | The **overlay** events (section 4), so levels can put actions on them. | 35 / 249 / 237 / 336 |

**No crash lane.** No crash cymbals can be detected in this mix: the high-band tail varies by less than 7 dB across
the whole song, with nothing at section starts. Use `fills` accents and `cue` for crash-like moments.

## 3. The level edit (`assets/audio/jim_edit.beatmap.json`, audio in `licensed/jim_edit.*`)

The original runs 2:59 with a fade. **The edit runs 2:04.4 to the final hit, plus a ~5 s ring-out: 86 bars, 344 beats,
129.3 s file.**

**The cut: verse 2's block.** Everything from **song bar 33 beat 3 to song bar 62 beat 3** is removed: 116 beats,
29 bars, 42.5 s. That block is verse 2, pre-chorus 2, chorus 2, tag 2 and turnaround 2.

- **Why this join works:** both join points are the second bar of the *identical* B7 turnaround (bass B B C# D# → E,
  piano B stabs). The bass walk-up carries straight on, and verse 3's own vocal pickup (bar 62 b3.67) leads into
  verse 3.
- **The crossfade:** an equal-power crossfade of 24 ms that ends 14 ms before the beat-3 attack, so that attack is
  intact.
- **Seam check:** the spectral change across the seam is 18.1 dB, against a median of 17.8 dB for neighbouring beats.
  Grid vs. drum hits on the edit: mean 4.5 ms, 92 % within 10 ms. The beats around the join are −13 to +5 ms.
- **Why verse 2 and not verse 3:** verse 3 has the walking boogie bass (bars 63–70), the most riff-like part of the
  song and the best gameplay texture. Verse 2 is mostly stop-time.
- **The story still runs** bully → comeback → role reversal.

**The ending.** The edit ends on the outro tag's resolution: **song bar 115 beat 1 = edit bar 86 beat 1 (2:04.44)**.
At that beat:

- The record fades over 0.35 s after one beat.
- Our final hit plays: a gang HEY (16 voices), stomps, kick, crash, clap, cowbell and an audience cheer. It is
  baked into the edit's mix at −6 dB and is also in the overlays.

The original's own fade (bars 116–119) is cut.

### Bar map

The edit's `bars[].bar` field gives the song bar; the audio is `licensed/jim_edit.ogg`.

| Edit bars | Song bars | Section | Time in the file |
|---|---|---|---|
| 1–4 | 1–4 | intro | 0:00.11–0:06.07 |
| 5–20 | 5–20 | verse 1 | 0:06.07–0:29.74 |
| 21–22 | 21–22 | pre-chorus 1 | 0:29.74–0:32.66 |
| 23–30 | 23–30 | chorus 1 (hook A in 29–30) | 0:32.66–0:44.39 |
| 31 | 31 | tag 1 (hook B) | 0:44.39–0:45.86 |
| 32–33 | 32 + 33 b1–2 ‖ 62 b3–4 | turnaround (**splice at edit beat 130**) | 0:45.86–0:48.78 |
| 34–49 | 63–78 | verse 3 (boogie bass 34–41, stop-time 44–47) | 0:48.78–1:12.10 |
| 50–51 | 79–80 | pre-chorus 3 | 1:12.10–1:14.98 |
| 52–59 | 81–88 | chorus 3 (hook A in 58–59) | 1:14.98–1:26.71 |
| 60 | 89 | tag 3 | 1:26.71–1:28.17 |
| 61–68 | 90–97 | breakdown (E vamp: the stomp moment) | 1:28.17–1:39.74 |
| 69–76 | 98–105 | chorus 4, the last (hook A in 75–76) | 1:39.74–1:51.39 |
| 77 | 106 | tag 4 | 1:51.39–1:52.85 |
| 78–85 | 107–114 | outro (the tag every 2 bars) | 1:52.85–2:04.44 |
| 86 | 115 | **final hit on beat 1**, then the ring-out | 2:04.44–2:09.35 |

**Other cuts considered:**

| Option | Result | Why not chosen |
|---|---|---|
| Cut verse 3 instead (song 61–89) | Similar length | Loses the boogie bass. |
| Also drop the breakdown | 1:54 | Loses the song's only vamp, the natural stomp or set-piece moment. |
| Keep the natural fade | 2:13 | The level needs a final hit. |

## 4. Reward overlays (our audio, committed)

The overlays are three stems built on the per-beat map with the sampled palette:

- `stems/jim_overlay/*.ogg` for the full song;
- `stems/jim_edit_overlay/*.ogg` for the edit, cut identically and sample-aligned.

Each beat map's `audio.files` lists the stems next to `mix`, so `songFromBeatmap` loads them as stems.

| Stem | What | Where |
|---|---|---|
| `shouts` | Real group and solo HEY!/HUP! | **Only in the vocal's gaps**, checked for collisions against the melody and the outro tag. Chorus line tails (bars 2 and 4 of each chorus). Pre-chorus walk-ups (HUP HUP HEY). Turnarounds (HEY · HEY / HUP HUP HEY). Intro and verse phrase-ends where free. The outro answers each tag with HEY HEY. |
| `stomps` | Stomps and hand claps | Stomps sit on the drummer's **actual** kick hits and claps on the snare hits. Stop-time bars thin out. Hook-A walkdowns, turnarounds and walk-ups hit every beat. The breakdown gets the Black Betty stomp. |
| `cowbell` | Cowbell tuned to B4 | Quarters in choruses, tags, verse 3 and the outro. Swung 8ths in the breakdown and the last chorus. |

**Levels.** At stem gain 1.0, the overlays sit under the record in the choruses (gated LUFS): shouts −7 dB, stomps
−9 dB, cowbell −14 dB. Each stem is true-peak limited to −1 dBTP. The per-section numbers are in the beat map's
`audio.overlayLevels`. The record is −10.5 LUFS, so the record plus overlays can pass 0 dBFS; see section 5.

## 5. What the engine needs

1. **The tempo map is already supported.** `TempoMap` takes the 476 per-beat points directly. `beatToTime` and
   `timeToBeat` reproduce the grid exactly, and negative beats (count-ins) extrapolate from the first beat's tempo.
2. **Variable run speed.** `runSpeed = pixelsPerBeat * BPM / 60` must become per-frame
   `pixelsPerBeat / tempo.secondsPerBeatAt(beat)`, or x = `timeToBeat(t) * pixelsPerBeat`. Tempo varies from
   160.5 to 167.7 BPM, and by ≤ 2.8 % from beat to beat. Anything derived from a single BPM needs the same change:
   - groove lock / catch-up;
   - jump airtime in beats;
   - hitstop debt;
   - `Tun` values expressed per second.
3. **`songFromBeatmap`.**
   - `audio.files.mix` is the record. The overlays `shouts`, `stomps` and `cowbell` become stems (no `base`, so
     `mix` stays the main source). Paths are relative to the audio base URL, e.g. `audio/` +
     `licensed/jim_edit.ogg`.
   - `audio.swingRatio` is the off-beat ratio (0.659), in [0.5, 0.75]. The ambiguous bare `audio.swing` key is gone
     (old producer maps put the swing *amount*, 1.02, there); the loader accepts it only if it is a valid ratio.
   - Prefer the OGG. The MP3 decodes 1105 samples late in decoders that ignore the LAME header.
4. **Licensed files at runtime.** Serve `assets/audio/licensed/` from `public/` locally (copy or symlink it,
   gitignored). Never commit it and never ship it in public builds without the licence.
5. **The music bus needs a limiter.** Record plus overlays can clip. Add a `DynamicsCompressorNode` or limiter on
   the music bus, or play the record at about −3 dB.
6. **The grid changed.** Beat 0 is song bar 1: the original has no pickup bar, so the count-in is the game's. The
   96-bar level grid in DESIGN §7 must be re-mapped onto the edit's 86 bars; section 3 has the bar map.
