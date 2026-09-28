# JIM (stomp arrangement) v1: arrangement notes

**Status: shelved.** The user chose to use the original recording instead of a cover (see
`docs/music/original_edit.md`). The score is kept because it renders in about 75 s and documents the stab/shout grid:

```bash
python3 tools/music/render.py tools/music/songs/jim.py
```

The rendered audio is not committed. The score has no lyrics; melody material is notes only, from
`jim_transcription.json`.

## Summary

| Setting | Value |
|---|---|
| Tempo / feel | 164 BPM, E, triplet shuffle (swing ratio 0.67) |
| Length | 97 bars (pickup bar 0 + bars 1–96, per DESIGN §7), plus a 5.2 s ring-out |
| Duration | 2:27 total. Bar *n* starts at `n × 1.4634 s` from beat 0, which is 0.25 s into the file |
| Master | Stems base + lead + shouts |
| Bonus stem | Optional FULL HOUSE layer, not in the master |
| Stem levels | Stems are exported at master level, so base + lead + shouts sum to the master |

## Deviations from DESIGN §7 (the gameplay grid is unchanged)

| Where | What changed | Why |
|---|---|---|
| Verses (16 bars) | 8 bars E, 4 A7, then B7 A7 E E. The last E bar is the song's pre-chorus walk-up (E E F# G# → A7). | The original has a 2-bar pre-chorus that §7 has no room for. Folding it into the verse lets the chorus arrive on the IV chord the way the original does. The verse's D peak lands on bar 21 / 45 (B7). |
| Verse 2b (41–48) | Harmony is A7 A7 A7 A7 B7 B7 E E-walk-up. | Each call/response pair (41/42, 43/44, 45/46, 47/48) sits on one chord, so the response bar is a literal repeat of the call. |
| 32 b4, 56 b4 | Band stop. Reverb tails ring. | §7 says "silence". Bar 72 b3–4 is the only total silence: reverb returns are muted there too (`stops` lane `total: true`). |
| Chorus C7 | Unison power-chord slams B5, A5, G5 (the G5 held 2 beats), with bass F# on b4. `harmony` gives beat-level power chords here. | The original's walkdown. The beat-level harmony stops pitched SFX from clashing with the slams. |
| 79–80 | The drum fill keeps the HUP HUP HEY shouts. Fill accents land on beats 1, 2 and 3 (`fillAccents` lane). The lead plays hook A over the fill. | §7 only replaces the band. |
| 88 b3–4 | A held E chord, a low roar and the lead's tag pickup replace the C8 drum pickup. | §7 asks for the held chord and roar here. |
| Intro | Extra HEYs on 4 b4 and 8 b4. The lead teases the tag (hook B) in bars 7–8. | Phrase ends; hook recognition in the first 15 s. |
| Stomp break | Chant HEYs on non-slot beats (`phrase: "chant"`). Slot ghosts are quiet versions of the BOOM/CLANG one-shots. | — |
| Build | Harmony E E A7 A7 B7 B7 B7 E. Bar 71 has no kick or bass. | The drop is the first time the low end comes back: +5.7 dB below 120 Hz from bar 71 to bar 73. |
| 89–90 | The riff reprise (ghost only, `noCall`) is one note per beat, on the HEYs. | — |

## Mix numbers (last render, sampled palette)

| Measure | Result |
|---|---|
| Integrated loudness | −14.0 LUFS |
| True peak | −1.0 dBTP |
| PLR | 13 dB |
| Kick punch | 14.5 dB |
| Grid check (`check_grid.py`) | OK: band holes −22 to −36 dB, total silence −76 dB, lead stem empty in 42/44/46/48 |

Section loudness in LUFS:

| intro | verse 1a | verse 1b | chorus 1 | verse 2a | verse 2b | chorus 2 | stomp break | build | final 1 | final 2 | outro | breath | finale |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| −14.8 | −15.6 | −14.6 | −13.3 | −17.6 | −15.9 | −12.7 | −15.2 | −13.7 | −12.6 | −12.2 | −11.8 | −19.5 | −12.5 |

## Known weaknesses

- **The main one:** it does not sound enough like the original. That is why the project switched to the original
  recording.
- The octave-band balance is +4 dB at 1–2 kHz.
- The sampled clap and the IR-cab guitar land 8–26 ms late in the isolated lane check. This only affects visual
  lanes.
