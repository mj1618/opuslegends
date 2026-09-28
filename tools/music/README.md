# tools/music — score-as-code production pipeline

Everything is synthesized in numpy/scipy. There are no sample libraries, but one-shot and multisample
WAVs can be added later (see [Samples](#samples-later)). A song is a Python **score**, and one render
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
instruments/vocals.py  GangShouts (HEY/WHOA/HO/HA/YEAH), Crowd (cheer/roar)
instruments/base.py    Instrument base (voice cache), Sampler, Layered
songs/                 score files (palette_demo.py; jim_transcription.json comes from the transcriber)
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
| `s.bus(name, parallel=..., comp=..., eq=..., gain_db=...)` | Bus processing. **Buses are the stems.** |

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
| `GangShouts(voices=10)` | Glottal source (jitter, shimmer, subharmonic roughness, aspiration) into a **time-varying 5-formant cascade** with word keyframes. The gang is 8–14 voices with different pitches, tract lengths and pans. The onset is **self-calibrated**: the gang envelope reaches 50 % on the beat, and the /h/ is pre-rolled before it. | words: `HEY`, `WHOA`, `HO`, `HA`, `YEAH` |
| `Crowd()` | Pink-noise vocal-band roar, 26 synthetic cheering voices, whistles and scattered claps. | `cheer` / `roar`; `dur` = length |

### Samples (later)

`instruments.base.Sampler(zones, base_dir)` plays WAV one-shots or multisamples:

- velocity zones;
- round-robin across the files a glob matches;
- pitch-shift from `root`;
- note-off release;
- chord expansion.

`Layered(RockKit(), {"snare": Sampler([...]), "crash": Sampler([...])})` swaps individual pieces for samples and
leaves the rest synthesized. Example:

```python
Sampler([{"piece": "snare", "glob": "drs/snare_v*_rr*.wav", "vel_lo": 0.0, "vel_hi": 0.6},
         {"piece": "snare", "glob": "drs/snare_hard_*.wav", "vel_lo": 0.6, "vel_hi": 1.0}], base_dir="samples")
Sampler([{"glob": "salamander/C4v10.wav", "root": 60, "lo": 58, "hi": 62}, ...])
```

Put downloaded packs in `tools/music/samples/` and gitignore them. Credit CC-BY packs in the game credits.

**Why the `say` voices aren't used:** the macOS licence limits the output of `say` to personal, non-commercial use.
Real recorded shouts through the `Sampler` (piece = word) are the upgrade path.

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
    "swing": 1.02, "swingRatio": 0.67,
    "files": {"ogg": {"path", "audioOffset", "decoderLagSamples", "bytes"}, "mp3": {...},
              "stems": {"drums": "assets/audio/stems/<name>/drums.ogg", ...}},
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
- **Other:** kick punch (transient rise before and after mastering), tail and pre-roll silence, and guitar
  aliasing above 12 kHz.

`flags` lists anything outside targets.
