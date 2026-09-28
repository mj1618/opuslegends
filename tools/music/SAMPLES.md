# Sample libraries — sources, licences, credits

The sampled instruments (`instruments/sampled.py`) use the recordings below. The raw libraries are downloaded into
`tools/music/samples/` and a trimmed working set is extracted into `tools/music/samples_cache/`. **Both folders are
gitignored. Never commit raw libraries.** Only our rendered mixes (`assets/audio/*.ogg|mp3`) ship.

## Setup (fresh checkout)

```bash
cd tools/music/samples      # create it first
curl -LO https://drumgizmo.org/kits/DRSKit/DRSKit2_1.zip && unzip -q DRSKit2_1.zip             # 2.8 GB zip
curl -LO https://archive.org/download/SalamanderGrandPianoV3/SalamanderGrandPianoV3_OggVorbis.tar.bz2 \
  && tar xjf SalamanderGrandPianoV3_OggVorbis.tar.bz2                                          # 78 MB
mkdir -p cab_ir && curl -L -o cab_ir/science_4x12_irs.zip \
  https://www.scienceamps.com/uploads/4/9/8/9/49897661/science_4x12_irs.zip && (cd cab_ir && unzip -q science_4x12_irs.zip -d science_4x12)
# VCSL: only the percussion folders listed below, from https://github.com/sgossner/VCSL (raw.githubusercontent.com),
#   kept under samples/VCSL/<same path as the repo>
# Freesound: the HQ previews (cdn.freesound.org/previews/..-hq.mp3, no login needed) of the IDs in the table below,
#   saved as samples/freesound/<id>.mp3 plus samples/freesound/manifest.json {id: {user, title, license, page}}
cd .. && python3 instruments/sample_cache.py          # builds samples_cache/ (~2 min, ~300 MB)
```

Without the cache, `Palette(use_samples=...)` prints a warning and falls back to the synthesized instruments.

## Libraries

| Library | Used for | Licence | Credit line |
|---|---|---|---|
| **DRSKit 2.1** — DrumGizmo, <https://drumgizmo.org/wiki/doku.php?id=kits:drskit> | acoustic kit: kick, snare, toms, hi-hat, crash, china, ride. 13-mic multitrack mixed to stereo | **CC-BY 4.0** | "DRSKit" drum kit by DRS / the DrumGizmo team (drumgizmo.org), CC-BY 4.0 |
| **Salamander Grand Piano V3** — Alexander Holm, <https://archive.org/details/SalamanderGrandPianoV3> (OGG version) | piano (Yamaha C5, 8 of 16 velocity layers, sampled every minor third) | **CC-BY 3.0** | "Salamander Grand Piano" by Alexander Holm, CC-BY 3.0 |
| **VCSL** — Versilian Community Sample Library, <https://github.com/sgossner/VCSL> | cowbells, claps, tambourines, shakers, gong, concert bass drum, anvil, clash cymbals | **CC0** | not required. Optional: "Versilian Community Sample Library (VCSL)" |
| **Science Amplification 4x12 IRs**, <https://www.scienceamps.com/irs.html> | guitar cab impulse responses: G12H-75 Creamback, V30, G12H-150; SM57, MD421, N22 mics | free download, no licence text. The IRs are only used to process our own renders and are never redistributed | "Guitar cab IRs: Science Amplification" (courtesy) |

## Gang shouts (Freesound HQ previews, 128 kbps MP3)

Freesound's original files need a login, so we use the public **HQ previews**. They sit under the same licence as the
originals. The shouts are layered, pitch-shifted and EQ'd, so the 128 kbps encode doesn't matter in the mix. Every
take is listed in `instruments/sample_cache.py::SHOUT_TAKES`.

| Freesound ID | Author | Title | Word(s) | Kind | Licence |
|---|---|---|---|---|---|
| 527740 | khenshom | Hey - Men Shouting together | HEY | group | CC0 |
| 57204 | Jace | Men Shouting Hey | HEY | group | CC0 |
| 653386 | letztergeist (Joshua Scott / RJC Studios) | Big Hey (≈8 people) | HEY | group | CC0 |
| 698872 | zvartafaran | Hey huge | HEY | group | CC0 |
| 416507 | pipjmalt | Crowd Chanting HEY | HEY | group | **CC-BY 4.0** |
| 634720 | Mafon2 | Hey hey hey hey hey hey hey (27 takes) | HEY | solo | CC0 |
| 345431 | Artmasterrich | Male_Heyyy_01 | HEY | solo | CC0 |
| 545949 | waveletaudio | Game Character HEY Loud | HEY | solo | **CC-BY 4.0** |
| 179326 | jorickhoofd | Male screams "Hey!" | HEY | solo | **CC-BY 4.0** |
| 368824 | klankbeeld | man screaming HEY breaking voice | HEY, HA | solo | **CC-BY 4.0** |
| 546512 | zein.hg | Hey1 | HEY | solo | **CC-BY 4.0** |
| 86212 | sandyrb | BRRRRR-HEY 01 | HEY | solo | **CC-BY 4.0** |
| 764268 | ShangusBurger (Shane Vincent, GameSoundCon 2024 walla) | Group Marching, Hup 2 3 | HUP (7 group takes) | group | CC0 |
| 613568 | MRdeadH | Hup | HUP | solo | CC0 |
| 353542 | maxmakessounds | hup | HUP | solo | **CC-BY 4.0** |
| 160769 | qubodup (Iwan Gabovitch) | Warrior's Battle Chants/Shouts | HO (12 takes), HA | solo | **CC-BY 4.0**. Required form: "Warrior Battle Chants and Shouts" Copyright 2012 Iwan Gabovitch [http://qubodup.net] |
| 623441 | WelvynZPorterSamples | "HA!" - NO reverb | HA | solo | CC0 |
| 209187 | LukeSharples | Ha | HA | solo | **CC-BY 4.0** |
| 99636 | Tomlija | small crowd yelling 'YEAH' | YEAH | group | **CC-BY 3.0** |
| 621374 | WelvynZPorterSamples | Rowdy Group Hype Yell 1 | YEAH, WHOA | group | CC0 |
| 340363 | (deleted user 5205523) | Male voice "Yeah" | YEAH | solo | CC0 |
| 440035 | theuncertainman | YEAH! - Warcry, British Male | YEAH | solo | **CC-BY 4.0** |
| 543778 | bandooga | Whoa! selection (9 takes) | WHOA | solo | CC0 |

Downloaded but unused (candidates for later): 593436, 345083, 403908, 88401, 257579, 384401 (a 14-person crowd/mob
walla, 2 min, CC0) and 480805 (a small group of men shouting, CC0).

**Gaps.** HEY and HUP have real *group* recordings. HO and HA are built only from solo takes, mostly from one
performer (qubodup), and are thickened by pitch/time variation. WHOA has a single group layer; the other WHOA layers
are nine takes from one performer. A proper gang-vocal session (6–8 people, each word ×4, close and room mics) would
be the upgrade.

## Game credits: required attributions (CC-BY)

```
Drums: "DRSKit" by the DrumGizmo project (drumgizmo.org), CC-BY 4.0
Piano: "Salamander Grand Piano V3" by Alexander Holm, CC-BY 3.0
Shouts (freesound.org, CC-BY): pipjmalt, waveletaudio, jorickhoofd, klankbeeld, zein.hg, sandyrb, maxmakessounds,
  LukeSharples, theuncertainman, Tomlija (CC-BY 3.0), and "Warrior Battle Chants and Shouts" Copyright 2012 Iwan
  Gabovitch [http://qubodup.net], CC-BY 4.0
CC0 thanks: VCSL (Versilian Studios), khenshom, Jace, letztergeist (Joshua Scott / RJC Studios), zvartafaran, Mafon2,
  Artmasterrich, ShangusBurger / Shane Vincent, MRdeadH, WelvynZPorterSamples, bandooga
Guitar cab IRs: Science Amplification
```
