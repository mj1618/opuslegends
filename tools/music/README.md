# tools/music — score-as-code production pipeline

By default everything is synthesized in numpy/scipy. A song can switch drums, piano, guitar cabs and gang shouts to
**sampled** real recordings, per instrument family (see [Sampled instruments](#sampled-instruments)). A song is a
Python **score**, and one render
produces all of the following from it:

- the mastered track: `.ogg` (Vorbis q6) and `.mp3` (LAME V2), −14 LUFS integrated, ≤ −1 dBTP;
- **stems**: one per bus; the stems sum exactly to the pre-master mix;
- **`beatmap.json`**: beats, bars, sections, harmony and **event lanes**. It is sample-exact by construction
  because the score that drives the audio also drives the map;
- an **objective mix analysis** (JSON + spectrogram PNG), which stands in for ears because the agents can't listen.

```bash
python3 tools/music/render.py tools/music/songs/palette_demo.py        # ~20 s for 31 s of audio
#   --name NAME  --out DIR  --no-stems  --no-encode  --no-analysis
```

Requirements: Python ≥ 3.10 with numpy + scipy (`requirements.txt`), Pillow (spectrogram only),
and `ffmpeg` with libvorbis and libmp3lame. The system python already has these. If you want a venv, put it in
`tools/music/.venv`, which is gitignored.

| Output | Where |
|---|---|
| master | `assets/audio/<name>.ogg`, `assets/audio/<name>.mp3` |
| beat map | `assets/audio/<name>.beatmap.json` |
| stems | `assets/audio/stems/<name>/<bus>.ogg` |
| analysis | `tools/music/reports/<name>.analysis.json`, `<name>.spectrogram.png` |
| float WAVs (master, premaster, stems) | `tools/music/build/<name>/` (gitignored) |

## Layout

```
render.py              CLI: score -> mix -> master -> encode -> beatmap -> analysis
sfx.py                 one-shots for the game (same voices as the song, in its key) + assets/audio/sfx/manifest.json
check_grid.py          verifies a render against its gameplay grid (stops, empty stem bars, stems sum, shout onsets)
build_original.py      the ORIGINAL recording: per-beat tempo map, lanes, the level edit, reward overlays
                       (runs in tools/music/.venv; see "The original recording" below)
original/              beatgrid.py (hit-locked smooth grid), timegrid.py (beat<->time on a per-beat map),
                       lanes.py (drums/bass/vocal/transcription lanes), overlay.py (overlay arrangement)
producer/score.py      the DSL (Score, Section, Track, swing, humanize, automation, stops, markers)
producer/patterns.py   idiomatic figures: boogie_guitar, pump_bass, walking_boogie, piano_boogie_lh,
                       piano_tremolo, piano_gliss, triplet_run, power
producer/mix.py        compressor, true-peak limiter, soft clip, synthesized-IR reverbs, tempo delay,
                       Mixer (track strips, buses = stems, master chain)
producer/loudness.py   BS.1770-4 LUFS / true peak
producer/beatmap.py    beatmap.json emitter
producer/analyze.py    mix analysis + spectrogram
producer/dsp.py        filters, oversampling, waveshapers, noise/STFT synthesis, min-phase FIR, stereo tools
instruments/drums.py   RockKit: kick snare rimshot floortom tom hat openhat crash china ride ridebell
                       cowbell clap stomp
instruments/guitar.py  RhythmGuitar (double-tracked, amp sim) and LeadGuitar (bends/slides/vibrato)
instruments/bass.py    Bass (picked, DI + driven blend)
instruments/keys.py    HonkyTonkPiano, Organ (tonewheel + Leslie)
instruments/vocals.py  GangShouts (HEY/HUP/WHOA/HO/HA/YEAH/OOH), Crowd (cheer/roar)
instruments/fx.py      Bell (temple/stalactite/glass/buoy), SfxKit (gongs, riser, roar, oil drum...) + one-shot
                       recipes (wood, crowd loops, applause, projector/film, whooshes, pool balls, Big Jim)
instruments/base.py    Instrument base (voice cache), Sampler, Layered
instruments/palette.py Palette(use_samples=...): per-song synth <-> sampled switch
instruments/sampled.py SampledKit, SampledPiano, IRRhythmGuitar, IRLeadGuitar, SampledGangShouts
instruments/sample_cache.py  builds samples_cache/ from the raw libraries in samples/ (both gitignored)
SAMPLES.md             sample sources, licences, required credits, setup commands
songs/                 score files (palette_demo.py, jim.py + jim_arrangement_notes.md;
                       jim_transcription.json comes from the transcriber)
```

## The score DSL

```python
from producer.score import Score
from instruments.drums import RockKit
from instruments.guitar import RhythmGuitar

MASTER = dict(target_lufs=-14.0, ceiling_db=-1.0)      # optional, kwargs for Mixer.master

def build() -> Score:
    s = Score("jim", "Jim (stomp arrangement)", bpm=164, key="E2", scale="mixolydian",
              swing_ratio=0.67, pre_roll=0.25, tail=2.5)
    intro = s.section("intro", bars=4, label="Stomp intro", energy=0.4)   # sections are consecutive
    verse = s.section("verse1", bars=16, energy=0.7)

    s.bus("drums", parallel=dict(thresh=-30, ratio=8, attack_ms=1, release_ms=70, mix=0.35),
          comp=dict(thresh=-14, ratio=2.5, attack_ms=8, release_ms=90))
    kit = s.track("drums", RockKit(), bus="drums", gameplay=True, lufs=-17,
                  sends={"room": 0.35}, humanize={"vel": 0.05})
    gtr = s.track("gtr", RhythmGuitar(), bus="guitars", gameplay=True, accent_lane="riff", lufs=-16,
                  eq=[("hp", 75), ("peak", 320, 1.0, -2.5)])

    kit.pattern(intro.start, bars=4, steps=8, stomp="X..xX...", clap="..X...X.", cowbell="XoxoXoxo")
    gtr.seq(verse.start, ">E2+B2:0.5 E2+C#3:0.5/pm E2+B2:0.5/pm ...")
    s.chord(verse.start, "E7")
    s.stop(verse.bar(15, 1), beats=2)          # band stop: silence and a 'stops' lane event
    return s
```

**Time.** Positions are in **beats** (float). Beat 0 is the first downbeat, and the tempo is constant.
`section.start`, `section.bar(i, beat)` and `s.b(bar, beat)` return absolute beats.

**Tracks.** `s.track(name, instrument, bus=..., gameplay=..., lane=..., accent_lane=..., drum_lanes=..., swing=..., humanize=..., **mix)`

| Authoring call | What it does |
|---|---|
| `hit(beat, piece, vel, dur=0.25, **params)` | One unpitched hit: a drum piece, a shout word or a crowd kind. |
| `note(beat, pitch, dur, vel, **params)` | One note. `pitch` is a name (`"E2"`), a MIDI number, or a list for a chord. |
| `pattern(start, bars, steps, **rows)` | Step rows, one per piece. `X` = accent, `x` = normal, `o` = ghost, `1-9` = velocity 0.1–0.9, `.`/`-` = rest. A row string covers one bar and repeats. |
| `seq(start, "tokens")` | Sequential tokens: `[>]PITCH[+PITCH..][:DUR][:VEL][/flags]`. `r:DUR` is a rest. `>` marks a **riff accent**. Returns the next beat. |
| `automate(param, [(beat, value), ...])` | Linear automation. The mixer reads `gain_db`, `pan`, `lpf`, `hpf`. Instruments read their own parameters, e.g. Organ `leslie` (0 slow … 1 fast). |

**Flags and params.**

| Flag | Meaning |
|---|---|
| `pm` | palm mute |
| `mute` | dead-note chug |
| `bend=2`, `bend_at`, `bend_time`, `bend_rel` | bend, in semitones |
| `slide=-2`, `slide_time` | slide |
| `vib` / `vib=0.3`, `vib_rate`, `vib_delay` | vibrato |
| `fall=-5` | pitch fall |
| `let=0.5` | let ring, in seconds |
| `straight` | exempt from swing |
| `gang=3` | extra layered stomps; the first onset stays exact |
| `voices=12`, `stretch=1.3` | shouts |
| `len=0.25` | sounding length in beats, when it differs from the `seq` step |

**Swing.** Pass `swing_ratio` (the position of the off-beat 8th: 0.5 straight, 0.667 triplet shuffle) or `swing`
(an amount, where 1.0 is a triplet shuffle) on the Score. A per-track `swing=` overrides it. Only positions on the
straight 8th/16th grid move. **Triplet positions are never moved**, so write shuffle fills as triplets
(`pattern(..., steps=12)`, `triplet_run`).

**Humanize.** `humanize={"timing_ms": 4, "vel": 0.08}`. Timing jitter is **forbidden on `gameplay=True`
tracks** and raises an error, because it would desync the lanes. Gameplay tracks may humanize velocity only.
Only gameplay tracks export lanes.

**Stops.** `s.stop(beat, beats, kind="stop"|"break", keep=("drums",))` gates every track except the ones in
`keep` to silence (a 12 ms fade into it). Reverb tails keep ringing, and a `stops` lane event is emitted.

**Other score methods.**

| Method | What it does |
|---|---|
| `s.chord(beat, "A7")` | Harmony span. Exported as `song.harmony` in the engine's `ChordSpan` form (tones relative to the key root). |
| `s.mark(lane, beat, **data)` | A free-form marker lane, e.g. `s.mark("cue", b, name="drop")`. |
| `s.bus(name, parallel=..., comp=..., eq=..., gain_db=..., stem=None)` | Bus processing. A bus is a stem unless `stem="base"` routes it (after its reverb returns) into a shared stem, so several processing buses can make one exported stem. |
| `s.stop(beat, beats, keep=(), total=True)` | `total=True` also mutes the bus outputs **including reverb/delay returns** (a dead-silent hole, e.g. before a drop). The lane event gets `total: true`. |
| `s.mute_bus(bus_or_stem, beat, beats, fade_ms=40)` | Hard-mute a bus or a whole stem, post returns (e.g. "lead stem empty in bars 42/44/46/48"). The fade happens before `beat`. No lane event. |
| `s.describe(lane, text, ends=False)` | Lane description in `laneInfo`; `ends=True` adds `endBeat`/`endT` to each event (sustain lanes). |
| `s.chord(...)` at an existing beat | replaces that span (use beat-level labels, e.g. power chords under unison slams). |

**Extra lane fields.** Any event param named `x_<field>` is copied into the event's lane entry as `<field>` (and is
ignored by the instruments): `bell.note(b, "A4", 1, 0.85, x_role="call", x_pair=41)`,
`hey.hit(b, "HEY", 1.0, x_phrase="hup", x_hold=2)`. `pattern(..., params={"cowbell": {"tune": 0.906}})` passes params
to every hit of a piece.

**Song-module options** (read by `render.py` next to `build()` and `MASTER`):

| Name | Meaning |
|---|---|
| `MASTER_STEMS = ("base", "lead", "shouts")` | which stems make the master (default all), e.g. leave out an optional `bonus` layer |
| `STEMS_AT_MASTER_LEVEL = True` | stems get the master chain's linear processing and gain curves (normalisation, mono-below, EQ, glue, limiter; not the soft clip), so the master stems **sum to the master**. If any stem would peak above 0 dBFS, all stems get one common trim, recorded as `audio.files.stemsGainDb` |
| `ENCODE = {"ogg": 5, "mp3": 4, "stems": 4}` | Vorbis q / LAME V (defaults 6 / 2 / 6) |
| `END_FADE_S = 1.6` | identical fade on master and stems at the very end |
| `MELODY_TRACKS = [...]` | tracks counted as "melody" by the salience analysis |

**Mix kwargs on a track.**

| kwarg | Meaning |
|---|---|
| `lufs=-18` | Loudness-based gain staging: pre-fader integrated LUFS of the track's active parts. |
| `gain_db` | Fader gain. |
| `pan` | Pan position. |
| `width` | M/S stereo width. |
| `eq=[("hp",f), ("lp",f), ("peak",f,q,dB), ("ls"/"hs",f,q,dB), ("bp"/"notch",f,q)]` | EQ bands. |
| `comp=dict(thresh, ratio, attack_ms, release_ms, knee, makeup, detector="peak"/"rms")` | Compressor. |
| `sat=1.5` | Saturation. |
| `sends={"room": .3, "plate": .1, "hall": .2, "arena": .2, "delay": .2, "delay:0.5": .1}` | Effect sends. Sends are post-fader and per bus, so each stem carries its own reverb. Reverb sends are high-passed at 180 Hz. |

## Instruments

| Instrument | Synthesis | Knobs |
|---|---|---|
| `RockKit(levels, pans, tune)` | Membranes: modal sines with pitch drop, filtered-noise beater/stick/wires, per-piece saturation and EQ. Metals: 808-style square banks, or modal partials + STFT-shaped noise with frequency-dependent decay, in stereo. **Cowbell**: two detuned band-limited squares (545/818 Hz) into a bandpass, layered with an acoustic modal bell and a stick clank. Open hats are choked by the next hat. | per-event `tune`, `gang` |
| `RhythmGuitar(voicing="crunch"/"fuzz"/"lead", gain, spread, double, bass, mid, treble, presence)` | Additive "modal string" DI (inharmonic partials, pick-position comb, pick noise, palm mute, low→high strum). Pedal pre-EQ, then a **4× oversampled** 2-stage asymmetric tube clipper, tone stack and power-amp clip, then a **minimum-phase cab FIR** (4x12 / 2x12 curves with random cone-breakup ripple). **Double-tracked**: the second take has another cab, ±3 cents and 0–5 ms *late-only* offsets, and is panned hard L/R. | |
| `LeadGuitar(gain, octave_double)` | Same string model with a continuous pitch curve, so bends, slides, vibrato and falls are alias-safe. Lead amp voicing. Add `delay` and `plate` sends. | |
| `Bass(drive, bright)` | Picked modal string (B = 1.2e-4), DI plus an oversampled driven upper band. | |
| `HonkyTonkPiano(detune_cents=11, bright, width, soundboard)` | 1–3 detuned strings per key (the honky-tonk beating), stiff-string inharmonicity, hammer spectrum driven by velocity, two-stage decay, damper, hammer thump and "tack" click. A synthesized soundboard IR is applied at track level, with stereo spread by pitch. | |
| `Organ(drawbars="888500000", perc, drive, leslie, click)` | 9-drawbar tonewheel with foldback and key click, tube drive, and a **two-rotor Leslie** (800 Hz crossover, doppler via modulated delay plus AM, separate horn/drum inertia, two mics). | automate `leslie` |
| `GangShouts(voices=10)` | Glottal source (jitter, shimmer, subharmonic roughness, aspiration) into a **time-varying 5-formant cascade** with word keyframes. The gang is 8–14 voices with different pitches, tract lengths and pans. The onset is **self-calibrated**: the gang envelope reaches 50 % on the beat, and the /h/ is pre-rolled before it. | words: `HEY`, `HUP` (short, lip-closure burst), `WHOA`, `HO`, `HA`, `YEAH`, `OOH` (falling) |
| `Crowd()` | Pink-noise vocal-band roar, 26 synthetic cheering voices, whistles and scattered claps. | `cheer` / `roar`; `dur` = length |
| `Bell(kind)` | Modal bells: `temple` (bowl partials in slowly beating pairs, strong fundamental), `stalactite` (glock bar + soft harmonic body + drip chirp), `glass`, `buoy` (big cast bell + clapper). | per-event `damp` (s after the note: hand-damp the ring) |
| `SfxKit()` | Pieces `gong` (tam-tam with a low E hum and late-blooming highs), `gong_small` (opera gong rising into B4), `gong_boom`, `gong_swell` (rolled crescendo whose hit lands at `dur`), `riser`, `roar`, `oildrum`, `slam`, `krak`, `whale`, `gull`, `clack`, `rim`, `scrape`. | `dur` where it matters |

### Sampled instruments

Real recordings replace the weakest synth parts: drums, piano, guitar cab and gang shouts. They are drop-in
alternatives, with the same event API, pieces/words, lanes and onset conventions. You switch them **per song** with
`Palette`:

```python
from instruments.palette import Palette
P = Palette(use_samples=True)                     # or {"drums", "piano", "cab", "shouts"} subset; False = all synth
kit  = s.track("drums", P.kit(), ...)             # RockKit        -> SampledKit
gtr  = s.track("gtr", P.rhythm_guitar(voicing="crunch", gain=1.1), ...)   # RhythmGuitar -> IRRhythmGuitar
lead = s.track("lead", P.lead_guitar(gain=1.0), ...)                      # LeadGuitar   -> IRLeadGuitar
pno  = s.track("piano", P.piano(), ...)           # HonkyTonkPiano -> SampledPiano(honky=9)
hey  = s.track("shouts", P.shouts(voices=10), ...)                        # GangShouts   -> SampledGangShouts
if not P.sampled("drums"): ...                    # family-specific mix choices
```

- **One-sided kwargs.** Kwargs are passed to whichever class is chosen. Put kwargs that only one side accepts in
  `synth=`/`sampled=`, e.g. `P.piano(sampled=dict(honky=12, bright=4), synth=dict(detune_cents=11))`.
- **Missing cache.** If the cache is missing, sampled families warn and fall back to synth, so a fresh checkout still
  renders. Pass `strict=True` to fail instead.
- **Example.** `songs/palette_demo_sampled.py` renders the palette demo with everything sampled.

| Instrument | Source | Behaviour / knobs |
|---|---|---|
| `SampledKit(levels, pans, tune, synth_layer, kick_sub=0.7)` | DRSKit 2.1 (13 mics mixed to stereo, audience perspective) + VCSL percussion | Pieces: kick snare rimshot sidestick tom tom2 floortom hat halfhat openhat hatfoot crash china ride ridebell · cowbell cowbell2 clap tamb tambshake shaker gong bassdrum anvil clash. 3–6 velocity layers × 3–4 round-robins, never the same take twice in a row. Each piece is **loudness-matched to the RockKit piece** at the same velocity, so existing balances hold, and gets a rock drum EQ (low-mid scoop, click, cymbal air). A sine sub-kick layer adds back the 40–80 Hz the acoustic kick lacks. `stomp` (and any unknown piece) is played by the synth RockKit. `rimshot` is a max-velocity snare because the DRSKit rim samples are cross-sticks (`sidestick`). The open hat is choked by the next hat. Hits are aligned on their perceptual attack. |
| `SampledPiano(honky=0, honky_width, bright=6, width, release)` | Salamander Grand V3 (8 of 16 layers, a sample every minor third, shifted ≤ ±1 st) | `honky` = cents of the honky-tonk chorus: two copies at ±honky/2 cents, 0.3–1.2 ms apart, spread L/R. `Palette.piano()` uses `honky=9`. `bright` is a 2.5 kHz shelf plus a presence peak, because the concert grand is dark in a band. Damper release is scaled by pitch. |
| `IRRhythmGuitar(cabs=("greenback", "v30"), cab_lp=9000, **RhythmGuitar kwargs)` | Science Amplification 4x12 IRs | The same DI, amp and double-tracking as `RhythmGuitar`, but each take goes through a **real cab IR**: L = G12H-75 Creamback (SM57 + MD421), R = V30 (SM57 + N22 ribbon). Presets live in `sampled.CAB_PRESETS`. A single IR name also works. `CAB_EQ` trims 200/500 Hz by 2–2.5 dB and adds 2.5 dB at 2.6 kHz. It uses the `cab_fir` hook in `guitar.amp_chain`. |
| `IRLeadGuitar(cab="greenback", **LeadGuitar kwargs)` | same | The lead through a real cab. |
| `SampledGangShouts(voices=10, spread, group_layers=2, pitch_spread=0.9, synth_blend=0)` | Freesound CC0/CC-BY shout recordings | Words: HEY (5 group + 33 solo takes), HUP (7 group + 2 solo), HO (12 solo), HA (5 solo), YEAH (2 group + 2 solo), WHOA (1 group + 9 solo). Each hit layers 2 real **group** recordings doubled hard L/R and `voices-4` solo takes, each pitch-shifted N(0, 0.9) st, 0–18 ms late and spread across the field. `stretch>1` prefers longer takes and plays ~1 st lower. The onset is self-calibrated like `GangShouts`, so the 50 % envelope point lands on the beat and the beat map's `shouts` lane is unchanged. Other words fall back to the synth gang. `synth_blend` layers the synth gang underneath. |

**Setup.** The raw libraries live in `tools/music/samples/` (several GB) and the trimmed 48 kHz working set lives in
`tools/music/samples_cache/` (~350 MB). Renders only read the cache. Both folders are gitignored. `SAMPLES.md` has the
download commands, and `python3 tools/music/instruments/sample_cache.py [kit perc piano cab shouts] [--force]`
rebuilds the cache in about 3 minutes. **Credit the CC-BY sources in the game credits:** DRSKit, Salamander and the
listed Freesound authors (the block is at the bottom of `SAMPLES.md`).

**Synth vs sampled palette demo.** Same score, same mix settings except that the sampled kit drops the synth kit's
−4 dB 11 kHz shelf. Values below are from `reports/palette_demo*.analysis.json`:

| | synth | sampled |
|---|---|---|
| integrated / true peak | −14.0 LUFS / −2.1 dBTP | −14.0 LUFS / −1.6 dBTP |
| crest factor / PLR | 13.9 / 11.9 dB | 14.5 / 12.4 dB |
| kick punch (master / premaster) | 10.2 / 11.1 dB | **13.4 / 15.8 dB** |
| octave deviation vs rock ref, 125 → 16 k | −2.5 +0.6 +2.2 +3.0 +3.7 +3.4 +0.3 +2.2 | −1.6 +1.0 +3.2 +3.7 +3.9 +2.9 −2.5 −2.5 |
| stereo correlation / S/M | 0.78 / −9.0 dB | 0.69 / −7.3 dB (real overheads/rooms, doubled group shouts) |
| lane onsets p90 | ≤ 4.6 ms | ≤ 3.3 ms (hits aligned on their perceptual attack) |
| flags | none | none |

The first sampled pass was flagged at +6 dB for 500 Hz–2 kHz. The raw multi-mic kit has more boxy low-mids and less
sub than the synth kit, and real 4x12s add about +5 dB at 125–250 Hz. `PIECE_EQ`, the sub-kick and `CAB_EQ` fix
this. The remaining difference is darker top octaves. Add air on the drum bus if a song needs it.

### Generic sampler

`instruments.base.Sampler(zones, base_dir)` plays arbitrary WAV one-shots or multisamples:

- velocity zones;
- round-robin across the files a glob matches;
- pitch-shift from `root`;
- note-off release;
- chord expansion.

`Layered(RockKit(), {"snare": Sampler([...])})` swaps individual pieces for samples and leaves the rest
synthesized.

**Why the `say` voices aren't used:** the macOS licence limits the output of `say` to personal, non-commercial use.
Real recorded shouts are in `SampledGangShouts`.

## Mix chain

1. **Track strip:** instrument → EQ → compressor → saturation → LUFS staging → gain/automation → pan/width
   → lpf/hpf automation → stop gates.
2. **Sends:** post-fader, to that bus's reverbs. The reverbs are synthesized stereo IRs: `room` 0.5 s with dense
   early reflections, `plate` 1.5 s, `hall` 2.2 s and `arena` 2.8 s. Each IR has band-wise decay, early reflections
   and a width control. A tempo-synced ping-pong `delay` is also available.
3. **Bus = stem:** parallel ("New York") compression → compressor → EQ → reverb returns.
4. **Master:**
   1. mono below 100 Hz;
   2. optional EQ;
   3. RMS glue compressor (≈1.5 dB mean gain reduction, after normalising the premaster to −20 LUFS);
   4. 4× oversampled soft clip;
   5. an iterated gain + **look-ahead true-peak limiter** (4× oversampled detection). Its gain is a min-filter
      followed by a box average, so it provably never overshoots.

   The result is −14.0 LUFS, ≤ −1 dBTP. The own BS.1770 meter is cross-checked against ffmpeg `ebur128`.

## beatmap.json (schema `opuslegends.beatmap/1`)

`song` is shaped exactly like `SongDef` in `src/audio/song.ts`, minus `source`:

```ts
import bmUrl from '../../assets/audio/palette_demo.beatmap.json?url';     // or fetch('audio/…') from public/
import oggUrl from '../../assets/audio/palette_demo.ogg?url';
const bm = await (await fetch(bmUrl)).json();
const song: SongDef = { ...bm.song, source: { kind: 'file', url: oggUrl } };
// lanes: bm.lanes.kick / snare / shouts / riff / melody / stops ... (below)
```

```jsonc
{
  "schema": "opuslegends.beatmap/1",
  "generator": "tools/music/render.py tools/music/songs/palette_demo.py",
  "song": {                          // == SongDef minus `source`
    "id", "title", "artist",
    "tempo": [{"beat": 0, "bpm": 164}],
    "beatsPerBar": 4,
    "audioOffset": 0.25,             // seconds into the audio file where beat 0 lands (= pre-roll)
    "lengthBeats": 84,
    "key": {"root": 40, "scale": [0,2,4,5,7,9,10]},
    "harmony": [{"beat": 0, "tones": [0,4,7,10], "name": "E7"}, ...]   // tones: semitones from key.root
  },
  "audio": {
    "sampleRate": 48000, "lengthSamples": N, "durationSec": s,
    "swing": 0.67, "swingRatio": 0.67, "swingAmount": 1.02,   // swing = off-beat 8th position (SongDef.swing)
    "files": {"ogg": {"path", "audioOffset", "decoderLagSamples", "bytes"}, "mp3": {...},
              "stems": {"drums": "assets/audio/stems/<name>/drums.ogg", ...},
              "masterStems": [...], "stemsAtMasterLevel": true, "stemsGainDb": -1.9},   // when configured
    "loudness": {"integratedLufs": -14.0, "truePeakDb": -1.8}
  },
  "sections": [{"name", "label", "startBar", "bars", "startBeat", "endBeat", "t0", "t1", "energy"}],
  "bars":     [{"i", "beat", "t", "sample", "section"}],       // lengthBars + 1 entries
  "beats":    [{"i", "t", "sample", "bar", "beatInBar"}],      // integer beats 0..lengthBeats
  "lanes": {
    "<lane>": [{"beat", "t", "sample", "vel", "grid"?, ...lane fields}]
  },
  "laneInfo": {"<lane>": {"description", "count"}}
}
```

**Event timing fields.**

| Field | Meaning |
|---|---|
| `beat` | The *performed* beat: swung, and exact for gameplay tracks. |
| `grid` | The notated beat. Present only when swing moved it. |
| `t` | Song seconds (`beat * 60/bpm`). This is the Conductor's song time: 0 = beat 0. |
| `sample` | Absolute sample index in the file, `round((t + audioOffset) * sampleRate)`. |
| `vel` | Velocity, 0..1. Filter ghost notes with `vel < 0.5`. |

**Lanes.**

| Lane | Contents | Extra fields |
|---|---|---|
| `kick` | kick + floor stomps; simultaneous hits merged | `pieces`, `accent` |
| `snare` | snare/rimshot | `accent` |
| `floortom`, `tom`, `cowbell`, `crash`, `ride`, `hat`, `clap` | per piece | `accent` |
| `shouts` | gang shouts; `t` = vowel onset | `word` |
| `crowd` | cheers/roars | `kind`, `dur` |
| `riff` | riff accents (`>` notes on the `accent_lane` track) | `pitch` (lowest), `chord`, `dur`, `durBeats`, `pm` |
| `melody` | melody notes from `lane="melody"` tracks | `pitch` (MIDI), `dur`, `durBeats`, `bend`, `slide`, `vib`, `track` |
| `bass` | bass notes | as melody |
| `stops` | silence starts at `t` and lasts `dur` s (`beats`) | `kind` = stop / break |
| custom | anything added with `s.mark()` | whatever was passed |
| any | `x_*` params of the event | the field without `x_` |

**Encoder offsets.** Vorbis carries a pre-skip, and ffmpeg writes the LAME gapless header into the MP3.
Decoders that honour them (ffmpeg, current Chrome/Firefox/Safari) decode both files with **0 lag**. The render
measures this by cross-correlating the decoded file against the master: see `decoderLagSamples`. A decoder that
ignores the LAME header plays the MP3 about 1105 samples late. Prefer the OGG, and use the game's
`analyzeBeatAlignment` debug check to confirm.

## Analysis (`reports/<name>.analysis.json`)

- **Loudness:** integrated, short-term max and range (via our meter and ffmpeg `ebur128`), true peak, crest
  factor, PLR, and per-section LUFS.
- **Spectrum:** octave-band balance against an approximate rock-master reference (±4 dB corridor).
- **Stereo:** per-band correlation (low end must be mono) and S/M ratio.
- **Masking:** per-stem and per-track band share, i.e. who owns each octave.
- **Lane alignment:** each lane re-rendered **one event at a time**, measuring where the envelope reaches 50 %
  of peak (the perceptual attack) against the beat map. There is also a port of the engine's
  `analyzeBeatAlignment` run on the master.
- **Per section:** `section_stem_lufs` and `section_track_lufs` (gated LUFS of each stem/track inside each section)
  and `melody_salience_db` (melody tracks vs. the rest of the master mix in 500 Hz–4 kHz; ≥ 0 dB = the tune sits on
  top). Gated per-track numbers read "level while playing", so a sparse lick shows as loud; use the band shares for
  masking questions.
- **Other:** kick punch (transient rise before and after mastering), tail and pre-roll silence, and guitar
  aliasing above 12 kHz.

`TRACK_DUMP=1 python3 tools/music/render.py ...` also writes `build/<name>/tracks.npz` (every track, float16) for
offline digging. `python3 tools/music/check_grid.py <name>` checks the render against the gameplay grid: band (base
stem) holes inside every stop, total-silence stops in the master, the lead stem empty in the response bars, stems
summing to the master, and shout onsets.

## One-shots (`sfx.py`)

`python3 tools/music/sfx.py [--song songs/jim.py] [--out assets/audio/sfx]` renders the game's one-shots with the
song's own voices (gang shouts, cowbell/woodblock, slide guitar, temple bell, piano, fx recipes) in the song's key, as
mono (or stereo for crowd/gong/ambience) Vorbis q3, and writes `manifest.json` (schema `opuslegends.sfx/1`). Each
entry: `id, file, category, desc, channels, loop?, durationSec, onsetSec, peakDb, loudnessLufs, mixGainDb` and, when
pitched, `midi, note, degree` (index into the key's scale). **`onsetSec`** is the time from the file start to the
perceptual attack (50 % envelope): start the file `onsetSec` early to land it on a beat (shouts pre-roll their /h/ by
50 ms). **`mixGainDb`** is a suggested playback gain against the −14 LUFS master. Loops are exactly periodic.

`flags` lists anything outside targets.

## The original recording (`build_original.py`)

The game plays the 1972 recording, not a cover. `docs/music/original_edit.md` has the edit decision, the bar map,
lane details and the engine notes.

```bash
tools/music/.venv/bin/demucs -n htdemucs_6s -o tools/music/build/original/demucs reference/jim_croce_original.mp3
tools/music/.venv/bin/python tools/music/build_original.py [--stage grid|lanes|full|edit]    # all by default
```

| Stage | What it does |
|---|---|
| `grid` | demucs drum stem, **compensated for demucs' 1105-sample MP3 decode lag**. librosa tracking, then every beat is locked to the drummer's broadband attack. A robust 5-beat local fit gives the tempo map: 476 per-beat points, 161.5 → 166.6 BPM, 93 % of beats within 10 ms of the hits. Writes `reports/jim_original.grid.json` and a click-track mix `build/original/click_check.wav`. |
| `lanes` | Drum hits classified by beat-parity calibration (kick/snare/tom, exact times). Also `fills`, bass notes (pYIN), `bassWalks` (transcription figures snapped to detected onsets), vocal phrases and held notes (no words), transcription `melody`/`hooks`, `bassOut` stop-time and per-bar `energy`. |
| `full` | Renders the reward overlays (`shouts`, `stomps`, `cowbell`) with the sampled palette on the per-beat map. Calibrates their levels against the record, encodes, and writes `assets/audio/jim_original.beatmap.json`. |
| `edit` | Cuts verse 2's block (song bar 33 b3 → 62 b3, inside the identical B7 turnaround) and ends on song bar 115 with our final hit. The overlays are cut the same way. Writes `assets/audio/jim_edit.beatmap.json`. |

**Licensed audio** (the record, its OGG and the edit) goes to `assets/audio/licensed/`, which is gitignored. Never
commit it. The beat maps and overlay stems are ours and are committed.

**Beat-map differences from rendered songs:**

- `song.tempo` has one point per beat.
- `audio.files` = `{mix, shouts, stomps, cowbell}`, with `path` relative to the audio base URL, the shape
  `songFromBeatmap` expects.
- `audio.swing` is the measured off-beat ratio (0.659).
- `bars[].bar` is the song bar number (in the edit, the original song bar).

