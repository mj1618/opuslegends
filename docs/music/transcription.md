# Transcription: "You Don't Mess Around with Jim" (Jim Croce, 1972)

This is the musical source for our **own instrumental hard-rock stomp arrangement**. It contains only notes, chords,
rhythms and timings. **It has no lyrics, and none may be added.** Sections are named by function only.

- Machine-readable version: `tools/music/songs/jim_transcription.json` (same data plus per-note arrays).
- Primary source: `reference/jim_croce_original.mp3` (1972 original). The references are gitignored and must never be committed.
- Cross-checks: `reference/jim_backing_preview.mp3` (a clean backing track: same form, tempo and chords for bars 1-30), the live cover (key/tempo only), and published chord charts (chords and structure only).

## 1. Summary

| Item | Value |
|---|---|
| Key | **E major / E blues**. The harmony uses dominant 7ths (E, E7, A7, B7). The melody leans on **G natural** (blue 3rd) against G# in the chords, with A# as a blue passing note. Tuned to concert A440 (measured -5 to -10 cents). |
| Meter | **4/4**. The published sheet music is in cut time ("moderately bright in 2", half note about 82). The drums play a two-beat "boom-chick": kick on 1 and 3, snare on 2 and 4. |
| Tempo | **Quarter note about 161.5 BPM at the start, rising to about 166 by the end** (mean 163.9). The band plays live with no click and pushes about 3% over the song. Beat-to-beat jitter is about 6 ms SD. **For our arrangement: a fixed 164 BPM** (or 166 for more drive). |
| Feel | **Shuffle.** Off-beat 8ths land at 0.675 of the beat (ratio about 2.1:1, i.e. triplet swing). In this doc, x.67 means the swung "and" of a beat. |
| Length | 119 bars. Bar 1 beat 1 = 0.14 s. The last full beat is at bar 119 (173.3 s), and a fade from about bar 116 ends near 176 s. |
| Form | Intro 4, then 3 x [Verse 16, Pre-chorus 2, Chorus 8, Tag 1] with a 2-bar B7 turnaround after the first two, then a Breakdown of 8, a final Chorus 8 + Tag 1, and an Outro of 13 (the tag repeats until the fade). |

Bar numbers below are song bars (bar 1 = first downbeat). "Beat 3.67" means the swung "and" of beat 3.

## 2. Form with timestamps

Start times are measured from the beat grid of the original. The BPM column is the local average.

| # | Section | Bars | Count | Start (s) | BPM | Notes |
|---|---|---|---|---|---|---|
| 1 | intro | 1-4 | 4 | 0.14 | 161.0 | Band only: drums, bass, acoustic guitars on E. No vocal. |
| 2 | verse1 | 5-20 | 16 | 6.10 | 162.2 | Vocal enters on bar 5 beat 1. Bars 13-20 = second half (A7/B7), bass mostly tacet (stop-time feel). |
| 3 | prechorus1 | 21-22 | 2 | 29.77 | 164.4 | 2 bars E; bass walk-up E-F#-G# into the chorus A7; vocal pickup into chorus in bar 22. |
| 4 | chorus1 | 23-30 | 8 | 32.69 | 163.6 | 8 bars: A7 E7 A7 E7 A7 A7 B7(walkdown) E. Title-line hook = bars 29-30. |
| 5 | tag1 | 31-31 | 1 | 44.42 | 162.5 | 1 bar E: post-chorus vocal tag hook (pickup from bar 30 beat 3). |
| 6 | turnaround1 | 32-33 | 2 | 45.90 | 165.4 | 2 bars B7, no vocal; bass B-B-B-B then B-B-C#-D# walk-up; piano B-octave stabs. |
| 7 | verse2 | 34-49 | 16 | 48.80 | 163.0 | Same 16-bar harmony as verse 1; vocal pickup at bar 33 beat 3&. Piano enters. Stop-time bars 38-39 and 42-47. |
| 8 | prechorus2 | 50-51 | 2 | 72.37 | 163.3 | 2 bars E, walk-up to A7. |
| 9 | chorus2 | 52-59 | 8 | 75.31 | 162.9 | As chorus 1. |
| 10 | tag2 | 60-60 | 1 | 87.09 | 160.2 | Tag hook. |
| 11 | turnaround2 | 61-62 | 2 | 88.59 | 163.7 | B7 turnaround. |
| 12 | verse3 | 63-78 | 16 | 91.52 | 164.6 | Same harmony; bars 63-70 feature the boogie walking bass (E-E-B-B then E-G#-A-A#-B). Stop-time bars 71-76. |
| 13 | prechorus3 | 79-80 | 2 | 114.85 | 166.4 | 2 bars E, walk-up F-F#-G-G# to A7. |
| 14 | chorus3 | 81-88 | 8 | 117.74 | 163.8 | As chorus 1. |
| 15 | tag3 | 89-89 | 1 | 129.46 | 164.1 | Tag hook, sung higher (up to E4) the third time. |
| 16 | breakdown | 90-97 | 8 | 130.93 | 165.8 | 8 bars E vamp: bass quarters + chromatic pickup B1-C2-D2-D#2 every 2nd bar; vocal is low, speech-like ad-lib (no fixed melody). Bar 97 carries the pickup into chorus 4. |
| 17 | chorus4 | 98-105 | 8 | 142.50 | 164.9 | Final chorus, as chorus 1. |
| 18 | tag4 | 106-106 | 1 | 154.15 | 164.1 | Tag hook. |
| 19 | outro | 107-119 | 13 | 155.61 | 166.3 | E vamp; the tag hook repeats every 2 bars (B3 lands on bars 108,110,...,118); bass walk-ups G#-A-A#-B. Fade from ~bar 116; last beat ~bar 119 (173.3 s), audio silent by ~176 s. |

**Section lengths are regular.** Each verse is 16 bars: 8 bars on E, then 4 A7, B7, A7, B7, A7. Each verse is followed by a
2-bar pre-chorus on E, then the 8-bar chorus, then a 1-bar tag. The whole song has phrase-level symmetry, which makes it easy to lay a level
grid on.

**Texture changes worth mapping to gameplay:**
- **Stop-time in each verse's second half** (bars 13-20, 38-47, 71-76). The bass mostly lays out while the drums and guitars keep going. This makes a natural "lighter" platforming stretch.
- **Walk-ups and walk-downs** are the biggest landmarks: the pre-chorus climb into the chorus, the chorus bar-7 walkdown, and the turnaround climb.
- The **breakdown** (bars 90-97) is an 8-bar vamp on E. It is a good place for a set-piece before the last chorus.
- **Outro:** the tag hook repeats 6 more times over an E vamp. It suits a victory run or a fade.

## 3. Chords, bar by bar

Every chord lasts a whole bar. Passing bass lines are listed separately.

| Bars | 1st | 2nd | 3rd | 4th | Section |
|---|---|---|---|---|---|
| 1-4 | E | E | E | E | intro |
| 5-8 | E | E | E | E | verse 1 |
| 9-12 | E | E | E | **E7** | verse 1 |
| 13-16 | A7 | A7 | A7 | A7 | verse 1 (stop-time) |
| 17-20 | B7 | A7 | B7 | A7 | verse 1 (stop-time) |
| 21-22 | E | E (walk-up) | | | pre-chorus 1 |
| 23-26 | A7 | E7 | A7 | E7 | chorus 1 |
| 27-30 | A7 | A7 | **B7 walkdown** | E | chorus 1 |
| 31 | E | | | | tag 1 |
| 32-33 | B7 | B7 (walk-up) | | | turnaround 1 |
| 34-49 | same as bars 5-20 (E7 on bar 41) | | | | verse 2 |
| 50-51 | E | E (walk-up) | | | pre-chorus 2 |
| 52-59 | A7 E7 A7 E7 A7 A7 B7 E | | | | chorus 2 |
| 60 | E | | | | tag 2 |
| 61-62 | B7 | B7 (walk-up) | | | turnaround 2 |
| 63-78 | same as bars 5-20 (E7 on bar 70) | | | | verse 3 |
| 79-80 | E | E (walk-up) | | | pre-chorus 3 |
| 81-88 | A7 E7 A7 E7 A7 A7 B7 E | | | | chorus 3 |
| 89 | E | | | | tag 3 |
| 90-97 | E x 8 | | | | breakdown |
| 98-105 | A7 E7 A7 E7 A7 A7 B7 E | | | | chorus 4 |
| 106 | E | | | | tag 4 |
| 107-119 | E x 13 (fade) | | | | outro |

**Harmony in one line.** The verse is a blues on E: 8 bars E, 4 bars A7, then B7-A7-B7-A7. The chorus is A7-E7 x2, A7-A7, B7 into E.
It is a IV-I chorus, which is typical of boogie.

**Passing lines** (bass, used as landmarks):
- **Pre-chorus bar 2:** E2 (1), E2 (2), F#2 (3), G#2 (4), then A2. Pre-chorus 3 uses a chromatic F2-F#2-G2-G#2 instead.
- **Chorus bar 7 (the hook):** B2 (1), A2 (2), G2 (3), F#2 (4), then E2. Play it as one B7 bar over a descending bass, not as four chords.
- **Turnaround bar 2:** B1 (1), B1 (2), C#2 (3), D#2 (4), then E2.

## 4. Signature instrumental figures (original)

Notes are listed as (note, beat in bar, duration in beats). Beats 5 and up continue into the next bar.

### Drums
- **Groove:** kick on 1 and 3, snare on 2 and 4, with time kept in quarter notes. Few swung 8ths show up in the drum stem, so it is a light two-beat shuffle.
- **Phrase-end fill** at the end of most 4-bar phrases (bars 4, 8, 12, 20, 30, 32, 33...): an accent on the swung "and" of 3 (3.67), then kick and snare together on 4.
- Confidence: high for kick and snare placement, medium for the fills.

### Bass (the real "riff" carrier of the original)
| Figure | Where | Notes (note, beat, duration) |
|---|---|---|
| Verse pedal | intro, verses 1-2, breakdown | E2 on every quarter. Every 2nd bar adds low approach notes: E2 1, E2 2, E2 3 (0.67), **B1 3.67**, E2 4 (0.67), **B1 4.67** |
| **Boogie climb** (2 bars, x4) | verse 3 bars 63-70 | E2 1, E2 2, B1 3, B1 4 (0.67), D#2 4.67 / E2 5, E2 6 (0.67), G#2 6.67, A2 7 (0.67), A#2 7.67, B2 8 |
| **Chorus A7 climb** | every A7 bar in the chorus | A2 1, A1 2 (0.67), C#2 2.67, D2 3 (0.67), D#2 3.67, then E2 4 |
| Chorus E7 bar | after the A7 bars | E2 1, E2 2 (0.67), G#2 2.67, B2 3, E2 4 (0.67), G2 4.67 (medium confidence) |
| **Hook walkdown** | chorus bar 7 | B2 1, A2 2, G2 3, F#2 4, then E2 on the next 1 |
| Pre-chorus walk-up | pre-chorus bar 2 | E2 1, E2 2, F#2 3, G#2 4, then A2 |
| **B7 turnaround** | bars 32-33, 61-62 | B1 on every beat for 6 beats, then C#2 (beat 7), D#2 (beat 8), then E2 |
| Breakdown pickup | every 2nd bar, bars 90-97 and the outro | E2 1, E2 2, E2 3 (0.67), B1 3.67, C2 4 (0.33), D2 4.33, D#2 4.67, then E2 |

In the second half of each verse (the stop-time) the bass lays out apart from a few root hits.

### Guitars
- Two **strummed acoustic guitars** play a shuffle strum on open chords. There is **no single-note guitar riff** in the original.
  The song's instrumental identity is carried by the bass walks above, the shuffle, and the vocal hooks.
- Voicings detected (backing track matches): E = E2 B2 E3 G#3 B3 E4. E7 adds D (D3 or D4). A7 = A2 E3 G3 C#4 E4 (G4 on top at times). B7 = B2 D#3 A3 B3 F#4.
- Confidence: medium.

### Piano (from about bar 32 on)
- Honky-tonk right hand. It plays B-octave stabs (B2+B3+B4) on each beat of the B7 turnarounds, short E7 fills (E4 G#4 B4 D5) between vocal phrases, and grace-note licks. It is sparse.
- Confidence: medium-low.

### Riffs suggested for our arrangement (derived from the original, NOT literal parts)
- **Stomp riff on E** (from the verse-3 boogie bass; double it an octave up on distorted guitar):
  E2 1 (0.67), E2 1.67, E2 2, B1 3 (0.67), D#2 3.67, E2 4 / E2 5 (0.67), G#2 5.67, A2 6 (0.67), A#2 6.67, B2 7, D3 8 (0.67), B2 8.67.
- **Chorus climb:** the whole band plays A-A(octave down)-C#-D-D# into E in unison on each A7 bar.
- **Hook walkdown:** band unison quarter-note hits on B-A-G-F# into E. This is the obvious "hit" moment, the Castle Rock "everyone slams" beat.
- **Turnaround stabs:** B7 stabs on every beat for 2 bars, then C#-D#. These work as a natural jump or punch cue.

## 5. Vocal melody as notes (for lead guitar or piano)

The melody is written at sounding pitch (male voice, range C#3-D4, almost all between E3 and B3). A lead guitar should play it
an octave up (E4-B4), where it sits in the classic E-blues box. The singer's pitch is speech-like. G3 against G# and A#3
between A and B are **blue notes**: play them as bends (A up toward B, G up toward G#). "Scoop" means slide into the
note from a half step or whole step below.

### 5a. Chorus: canonical melody (high confidence)
This is a hand-checked consensus of all 4 choruses, which agree closely. Use it for every chorus. relBeat 0 = beat 1 of chorus bar 1 (A7).
The chorus bar numbers are 1-9: bars 1-8 are the chorus and bar 9 is the tag. So chorus bar 1 = song bar 23, 52, 81 or 98.

| Chorus bar | Beat | relBeat | Note | Dur | Comment |
|---|---|---|---|---|---|
| pickup (pre-chorus bar 2) | 4.00 | -1.0 | E3 | 0.67 |  |
| pickup (pre-chorus bar 2) | 4.67 | -0.33 | G3 | 0.33 | pickup |
| 1 | 1.00 | 0.0 | A3 | 1.0 | scoop from G3 |
| 1 | 2.00 | 1.0 | G3 | 0.67 |  |
| 1 | 3.00 | 2.0 | A3 | 0.67 |  |
| 1 | 3.67 | 2.67 | G3 | 0.33 |  |
| 1 | 4.00 | 3.0 | B3 | 1.0 | scoop from A3 (bend) |
| 2 | 1.00 | 4.0 | F#3 | 0.67 | phrase end |
| 2 | 3.67 | 6.67 | G#3 | 0.33 | pickup |
| 2 | 4.00 | 7.0 | A3 | 1.0 |  |
| 3 | 1.00 | 8.0 | A3 | 1.0 | scoop from G3 |
| 3 | 2.00 | 9.0 | A3 | 1.0 |  |
| 3 | 3.00 | 10.0 | A3 | 0.67 |  |
| 3 | 3.67 | 10.67 | G3 | 0.33 |  |
| 3 | 4.00 | 11.0 | B3 | 0.67 |  |
| 3 | 4.67 | 11.67 | G3 | 0.33 |  |
| 4 | 1.00 | 12.0 | E3 | 1.0 | slide down from G3; phrase end |
| 4 | 3.67 | 14.67 | G#3 | 0.33 | pickup |
| 4 | 4.00 | 15.0 | A3 | 1.0 |  |
| 5 | 1.00 | 16.0 | A3 | 1.0 | scoop |
| 5 | 3.00 | 18.0 | A3 | 1.0 | scoop |
| 5 | 4.00 | 19.0 | A3 | 0.67 |  |
| 5 | 4.67 | 19.67 | G3 | 0.33 |  |
| 6 | 1.00 | 20.0 | A3 | 0.67 |  |
| 6 | 2.00 | 21.0 | A3 | 0.67 |  |
| 6 | 2.67 | 21.67 | G3 | 0.33 |  |
| 6 | 3.00 | 22.0 | A3 | 0.67 |  |
| 6 | 3.67 | 22.67 | G3 | 0.33 |  |
| 6 | 4.00 | 23.0 | A3 | 0.67 |  |
| 6 | 4.67 | 23.67 | G3 | 0.33 |  |
| 7 | 1.00 | 24.0 | A3 | 0.67 | HOOK A start |
| 7 | 1.67 | 24.67 | B3 | 0.33 | bend up from A#3 |
| 7 | 2.00 | 25.0 | A3 | 0.67 |  |
| 7 | 2.67 | 25.67 | D#3 | 0.33 | low confidence (could be E3) |
| 7 | 3.00 | 26.0 | G3 | 0.67 |  |
| 7 | 3.67 | 26.67 | D#3 | 0.33 | fall from F#3; low confidence |
| 7 | 4.00 | 27.0 | D3 | 0.67 |  |
| 7 | 4.67 | 27.67 | E3 | 0.33 |  |
| 8 | 1.00 | 28.0 | E3 | 0.67 |  |
| 8 | 1.67 | 28.67 | D3 | 0.33 | quick dip |
| 8 | 2.00 | 29.0 | E3 | 1.0 | HOOK A end |
| 8 | 3.00 | 30.0 | G3 | 0.67 | HOOK B (tag) pickup |
| 8 | 3.67 | 30.67 | A3 | 0.33 |  |
| 8 | 4.00 | 31.0 | A3 | 0.67 |  |
| 8 | 4.67 | 31.67 | A#3 | 0.33 | passing, bends into B3 |
| 9 | 1.00 | 32.0 | B3 | 1.0 | scoop from G#3/A3 |
| 9 | 2.00 | 33.0 | A3 | 0.67 |  |
| 9 | 2.67 | 33.67 | G3 | 0.33 |  |
| 9 | 3.00 | 34.0 | A3 | 0.67 |  |
| 9 | 3.67 | 34.67 | G3 | 0.33 |  |
| 9 | 4.00 | 35.0 | G3 | 0.67 |  |
| 9 | 4.67 | 35.67 | E3 | 0.33 | tail, often dropped; HOOK B end |

**Phrase map (chorus):**
| Phrase | relBeats | Chords | Shape |
|---|---|---|---|
| Line 1 | -1 to 4.67 | A7, then E7 | reciting A3/G3, rises to B3, lands on F#3 |
| Line 2 | 6.67 to 13 | A7, then E7 | same shape as line 1, lands lower on E3 |
| Line 3 | 14.67 to 24 | A7 A7 | the longest line: a swung A3-G3 alternation ("A . G A . G A . G") |
| **Line 4 = HOOK A** | 24 to 30 | B7 walkdown, then E | **A3 B3 A3 . G3 . D3 E3, then E3**, over the bass B-A-G-F#-E. This is the title line and the most recognizable phrase of the song. |
| **Tag = HOOK B** | 30 to 36 | E | **G3 A3 A3, then B3 A3 G3 A3 G3 G3**. Sung after every chorus, then 6 more times in the outro. |

### 5b. Verse melody
The verse melody is a patter on reciting tones A3 and B3, with a G3 neighbour note (blue 3rd). It cadences down to E3 at the ends of phrases and
peaks at **D4 on the first B7 bar** (verse bar 13: song bars 17, 46, 75). Each verse has different words, so the rhythms differ, but the
**contour is the same every time**:

| Verse bars | Chord | Phrase shape |
|---|---|---|
| 1-2 | E | starts on beat 1: A3 A#3 A3 B3 A3 G3 A3, then held B3 |
| 3-4 | E | G3 B3 A3 G3 G#3 G3 B3, then A3 B3 (an answer phrase) |
| 5-8 | E, E7 | a longer line on A3/G3 dipping to F#3 E3 D3 mid-way, then back to B3 |
| 9-12 | A7 | pickup on beat 3.67 of the previous bar; a B3 G#3 G3 alternation dipping to F#3 E3 |
| 13-14 | B7, A7 | **peak: D4 held on beat 1**, then B3 A3 G3 falling to E3 |
| 15-16 | B7, A7 | B3 A3 G#3 G3 falling to **E3**, landing on beat 1 of pre-chorus bar 1 |

Full auto-transcribed verse notes follow. The format is `note@bar:beat/duration`, with song bar numbers, and phrases are split at rests of 2/3 of a beat or more. These
come from the isolated vocal, pitch-tracked and snapped to the E-blues scale. Out-of-range octave errors and scoops were
cleaned up. **Confidence is medium**: the rhythm and contour are reliable, while single passing notes (G vs G#, A vs A#) are judgment calls.
For a playable lead line, the arranger may simplify each phrase to its reciting tones.

**Verse 1**

- P1: A3@5:1.00/0.33 A#3@5:1.33/0.67 A3@5:2.00/0.33 B3@5:2.33/0.67 A3@5:3.00/0.67 G3@5:3.67/1.00 A3@5:4.67/1.00 B3@6:1.67/1.33
- P2: G3@7:1.00/0.33 B3@7:1.33/0.67 A3@7:2.00/0.33 G3@7:2.33/0.67 G#3@7:3.00/0.67 G3@7:3.67/1.00 B3@7:4.67/0.33 A3@8:1.00/0.33 B3@8:1.33/0.67
- P3: A3@9:1.00/0.33 A#3@9:1.33/0.67 A3@9:2.00/0.33 A3@9:2.33/1.33 G3@9:3.67/1.00 B3@9:4.67/1.00 A3@10:1.67/0.67 G#3@10:2.33/0.33 G3@10:2.67/0.33 A3@10:3.00/0.67 F#3@10:3.67/0.33 E3@10:4.00/0.33 D3@10:4.33/0.33 A3@11:1.00/0.33 B3@11:1.33/0.33 A3@11:2.00/0.33 G3@11:2.33/0.67 A3@11:3.00/0.33 G#3@11:3.33/0.33 G3@11:3.67/0.33 G#3@11:4.00/0.67 B3@11:4.67/0.33 A3@12:1.00/0.33 A#3@12:1.33/0.33
- P4: A3@12:3.67/0.33 B3@12:4.00/0.33 A3@12:4.67/0.33 B3@13:1.00/0.67 G#3@13:1.67/0.33 G3@13:2.00/0.67 G#3@13:2.67/0.33 G3@13:3.00/0.67 G#3@13:3.67/0.33 G3@13:4.00/0.67 B3@13:4.67/1.00 A3@14:1.67/0.33 B3@14:2.00/0.33 F#3@14:2.33/0.33 F#3@14:2.67/1.33 E3@14:4.00/0.33 C#3@14:4.33/0.33 B3@15:1.00/0.67 G3@15:1.67/0.33 A3@15:2.00/0.33 G#3@15:2.33/0.33 G3@15:2.67/0.33 A3@15:3.00/0.67 G3@15:3.67/1.00 B3@15:4.67/0.33 A3@16:1.00/0.33
- P5: B3@16:3.67/0.33 B3@16:4.00/0.33 A3@16:4.33/0.33 D4@17:1.00/1.00 B3@17:2.00/0.33 B3@17:2.33/0.67 A3@17:3.00/0.33 B3@17:3.33/0.67 A3@17:4.00/0.33 G3@17:4.67/0.33 B3@18:1.00/0.67 A3@18:1.67/0.33 A3@18:2.00/0.33 A3@18:2.33/0.33 A3@18:2.67/1.00 G3@18:3.67/0.33 E3@18:4.00/0.33 E3@18:4.33/0.33 B3@19:1.00/1.00 A3@19:2.00/0.33 G#3@19:2.33/0.33 C#3@19:2.67/0.33 G3@19:3.00/0.33 G#3@19:3.67/0.33 G3@19:4.00/0.67 G3@19:4.67/0.33 E3@20:1.00/0.67
- P6: F#3@20:2.67/0.33 G3@20:3.00/0.67 D3@20:3.67/1.00 E3@20:4.67/0.33 D#3@21:1.00/0.33 E3@21:1.67/0.33

**Verse 2**

- P1: B3@33:3.67/1.00 G#3@34:1.00/0.33 A3@34:1.33/0.33 B3@34:1.67/0.33 A3@34:2.00/0.33 G#3@34:2.33/0.33 G#3@34:2.67/0.33 A3@34:3.00/0.33 G3@34:3.33/0.33 G3@34:3.67/0.33 A3@34:4.00/0.33 G3@34:4.33/0.67 A#3@35:1.00/0.67 E3@35:1.67/0.33 E3@35:2.00/0.33
- P2: E3@35:4.00/0.33 E3@35:4.33/0.33 A3@36:1.00/0.67 G3@36:1.67/0.33 A3@36:2.00/0.33 G#3@36:2.33/0.33 G3@36:2.67/0.33 A3@36:3.00/0.33 F#3@36:3.33/0.33 G3@36:3.67/1.00 A#3@36:4.67/0.67 B3@37:1.33/0.33
- P3: B3@37:4.00/1.00 A3@38:1.00/0.33 B3@38:1.33/0.33 B3@38:1.67/0.33 A3@38:2.00/0.67 G3@38:2.67/0.33 A3@38:3.00/0.33 G#3@38:3.33/0.33 G3@38:3.67/0.33 A3@38:4.00/0.33 G3@38:4.33/0.33 F#3@38:4.67/0.33 B3@39:1.00/0.33 A3@39:1.33/0.33 A3@39:1.67/0.33 A#3@39:2.00/0.67 G3@39:2.67/1.00 E3@39:3.67/0.67 D#3@39:4.33/0.33 G3@40:1.00/0.33 A3@40:1.33/0.33 A3@40:1.67/0.67 A3@40:2.33/0.67 G3@40:3.00/0.67 A3@40:3.67/0.33 G#3@40:4.00/0.33 B3@40:4.67/0.33 A3@41:1.00/0.33 B3@41:1.33/0.33
- P4: B3@41:3.67/0.67 G#3@41:4.33/0.33 B3@41:4.67/1.00 A3@42:2.00/0.33 G3@42:2.33/0.33 A3@42:3.00/0.33 G#3@42:3.33/0.33 G3@42:3.67/0.33 A3@42:4.00/0.33 G#3@42:4.33/0.33 G3@42:4.67/0.33 B3@43:1.00/0.33 G3@43:1.33/0.33 E3@43:1.67/0.67 D3@43:2.33/0.67 D#3@43:3.00/0.67 D3@43:3.67/0.33 E3@43:4.00/0.67 A3@43:4.67/0.33 B3@44:1.00/0.33 A3@44:1.67/0.33 B3@44:2.00/0.67 A3@44:3.00/0.33 G#3@44:3.33/0.33 G3@44:3.67/0.33 A3@44:4.00/0.33 B3@44:4.33/0.33
- P5: B3@45:3.00/1.67 D4@45:4.67/1.00 B3@46:1.67/0.33 B3@46:2.00/0.67 A3@46:2.67/1.00 B3@46:3.67/0.33 G#3@46:4.00/0.67 G3@46:4.67/0.33 B3@47:1.00/0.33 B3@47:1.33/0.33 A3@47:1.67/0.33 B3@47:2.00/0.67 A3@47:2.67/0.67 G#3@47:3.33/0.33 G3@47:3.67/0.33 D#3@47:4.00/0.67 B3@48:1.00/0.33 A#3@48:1.33/0.33 F#3@48:1.67/0.33 A3@48:2.00/0.67 D3@48:2.67/0.33 G3@48:3.00/0.67 A3@48:3.67/1.00 G3@48:4.67/0.33 E3@49:1.00/0.67
- P6: F#3@49:3.00/0.67 E3@49:4.00/0.67

**Verse 3**

- P1: B3@62:3.67/0.67 F#3@62:4.33/0.33 A3@62:4.67/0.33 B3@63:1.00/0.33
- P2: A3@63:2.00/0.33 B3@63:2.33/0.67 A3@63:3.00/0.67 G#3@63:3.67/0.33 A#3@63:4.00/1.00 G#3@64:1.00/0.33 E3@64:1.67/0.33
- P3: E3@64:3.00/0.33 D3@64:3.33/0.33 C#3@64:3.67/0.33 E3@64:4.00/0.67 B3@65:1.00/0.33 G#3@65:1.67/0.33 A3@65:2.00/0.33 G#3@65:2.33/0.33 G3@65:2.67/0.33 A3@65:3.00/0.33 G3@65:3.67/0.33 C#3@65:4.00/0.33 A#3@65:4.67/0.33 D4@66:1.00/0.67 D4@66:2.00/0.33 D4@66:2.33/0.33
- P4: A3@66:3.67/0.33 B3@66:4.00/0.67 B3@67:1.00/0.33 B3@67:1.33/0.33 A3@67:1.67/0.33 B3@67:2.00/0.67 A3@67:2.67/0.67 G#3@67:3.33/0.33 G3@67:3.67/0.33 A3@67:4.00/0.33 G#3@67:4.33/0.33 A3@68:1.00/0.33 A3@68:1.33/0.33 A#3@68:1.67/1.00 B3@68:2.67/0.33 A3@68:3.00/0.33 G3@68:3.33/0.33 E3@68:3.67/0.67
- P5: G#3@69:1.00/0.33 B3@69:1.33/0.67 A3@69:2.00/0.67 A3@69:3.00/0.33 F#3@69:3.67/0.33 F#3@69:4.00/0.33 B3@69:4.67/0.33 G#3@70:1.00/0.33
- P6: G#3@70:3.67/0.33 B3@70:4.00/0.33 A3@70:4.33/0.33 F#3@70:4.67/0.33 B3@71:1.00/0.67 G3@71:1.67/0.33 A3@71:2.00/0.33 A3@71:2.33/0.33 F#3@71:2.67/0.33 A3@71:3.00/0.67 G3@71:3.67/0.67 A#3@71:4.67/0.33
- P7: D#3@72:1.67/0.33 D3@72:2.00/0.33
- P8: A3@73:1.00/0.33 B3@73:1.33/0.67 A3@73:2.00/0.33 G#3@73:2.33/0.33 A3@73:2.67/0.33 A3@73:3.00/0.67 G3@73:3.67/1.00 B3@73:4.67/0.33 A3@74:1.00/0.33 B3@74:1.33/0.33
- P9: B3@74:3.67/1.33 D4@75:1.00/0.33 C#4@75:1.33/0.33 B3@75:1.67/0.67 A3@75:2.33/0.33 B3@75:2.67/0.67 G3@75:3.33/0.33 A3@75:4.00/0.33 G3@75:4.33/0.67 A3@76:1.00/0.67 A3@76:1.67/1.33 A3@76:3.00/0.33 G3@76:3.33/0.33 F#3@76:3.67/0.33 E3@76:4.00/0.33 D#3@76:4.33/0.33 A3@77:1.00/0.33 B3@77:1.33/0.33 A3@77:2.00/0.67 D3@77:2.67/0.33 G3@77:3.00/0.33 G3@77:3.33/0.33 A3@77:3.67/1.00 G3@77:4.67/0.33 E3@78:1.00/0.33 E3@78:1.33/0.33
- P10: G3@78:2.67/1.00 E3@78:3.67/0.33 D3@78:4.00/0.67 E3@78:4.67/1.00

The **breakdown vocal** (bars 90-97) is low and speech-like, with chromatic glides around A2-D3. It has no stable melody, so it
is not transcribed as notes. Tag 3 (bar 89) is sung higher, reaching B3 D4 E4 on beat 1.

### 5c. Hook priority (for the level designer)
1. **Hook A (title line):** chorus bar 7 beat 1 to bar 8 beat 3, together with the bass walkdown. It falls in song bars 29-30, 58-59, 87-88 and 104-105.
2. **Hook B (tag):** chorus bar 8 beat 3 to bar 9. It falls in song bars 30-31, 59-60, 88-89 and 105-106, and then every 2 bars in the outro (the B3 lands on bars 108, 110, 112, 114, 116 and 118).
3. **Chorus line 1** (A7 into E7), the first thing heard in each chorus.
4. **The verse D4 peak** on the first B7 bar of each verse.

## 6. Confidence

| Certain (high) | Probable (medium) | Guessed or low |
|---|---|---|
| Tempo, shuffle ratio and meter; key of E | Exact pitch of quick passing notes in the chorus (Hook A's D#3 might be E3) | Piano parts |
| Section form, bar counts and timestamps (audio, backing track and chord charts agree) | Verse melodies note by note (speech-like, different in each verse) | Breakdown vocal |
| Chord per bar | Guitar voicings | Anything in the fade after bar 116 |
| Bass walks: chorus climb, walkdown, turnaround, verse-3 boogie | Drum fills; the chorus E7-bar bass | Exact ending (it is a fade, not a hit) |
| Kick and snare placement; chorus contour and hook rhythms | | |

## 7. Method (for reproducing this)
- The venv is at `tools/music/.venv` (gitignored), with librosa, demucs, torchcrepe and basic-pitch.
- `demucs -n htdemucs_6s` split the song into vocals, drums, bass, guitar, piano and other stems.
- The beat grid came from librosa beat tracking on the drum stem, snapped to drum onsets. Beat parity was checked with kick and snare band energy, and the downbeats were fixed by where the bass walks resolve.
- The swing ratio is the median off-beat onset phase over guitar, bass, vocal and drum onsets.
- For chords, pYIN pitch tracking of the bass stem gave the roots and CQT chroma of the guitar and piano stems gave the qualities. The result was checked against the backing preview and published charts.
- For the melody, CREPE ("full") ran on the vocal stem. Its output was binned on a triplet grid, segmented at onsets and pitch changes, and snapped to E mixolydian/blues. The chorus was built by hand from all 4 chorus instances aligned bar by bar.
- The working scripts were scratch files and were not kept. The JSON file holds all the results.
