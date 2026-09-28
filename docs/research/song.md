# Song research: the OpusLegends track

Research date: 2026-09-28. Goal: one Black-Betty-tier track, 120–180 BPM feel, a hook you know instantly, clear
sections (intro, build, drop, break, climax), 2–3.5 min long, legally shippable in a public browser game, with an
exact beat map.

---

## 1. What Rayman Legends did, and why it worked

| Level | Track | What kind of track |
|---|---|---|
| Castle Rock | "Black Betty" (Ram Jam arrangement), re-recorded by the Ubisoft team | Licensed cover |
| Mariachi Madness | "Eye of the Tiger" as a mariachi/kazoo cover | Licensed cover in a joke genre |
| Gloo Gloo | "Woo Hoo" (The 5.6.7.8's) cover | Licensed cover |
| Dragon Slayer | "Antisocial" (Trust) cover | Licensed cover |
| Orchestral Chaos, Grannies World Tour | Originals by Christophe Héral / Billy Martin | Original |
| "8-bit" invaded versions | The same levels with chiptune remixes | Same beat map reused |

Sources: [ps4home: Music and Gameplay in Rayman Legends](https://www.ps4home.com/music-and-gameplay-in-rayman-legends/),
[Wikipedia: Rayman Legends](https://en.wikipedia.org/wiki/Rayman_Legends),
[YourClassical: Héral & Martin interview](https://www.yourclassical.org/story/2014/03/05/chirstophe-heral-billy-martin-rayman-legends-top-score).
The four cover tracks are left off the official OST album. That is the licensing problem we have to avoid.

Lessons we can use:
1. **A famous hook in a surprising genre is the joke and the joy.** Examples are a mariachi "Eye of the Tiger" and a
   kazoo solo. Route (a) does exactly this: a famous public-domain melody played in an unexpected rock, surf or brass style.
2. **Every sound gets a game event.** Punches land on snare and stab hits, jumps on accents, and lum trails follow
   the melody. Crashes throw obstacles at you, and lightning or fire syncs with cymbals and guitar shreds. A song
   with many *distinct, punchy* sounds (brass stabs, tom stomps, drum breaks) is worth more than a dense wall of sound.
3. **Contrast between sections matters more than raw speed.** Black Betty works because of stop-time breaks, a
   stomping build and a long, frantic outro. Tempo changes (accelerandos) and stop-time are great design tools.
4. **One beat map can drive several mixes** (the 8-bit versions). If we produce the song ourselves, we get stems and
   alternate mixes for free.

---

## 2. Legal ground rules

- **The composition and the recording are separate rights.** For a public-domain (PD) piece we must make *our own
  recording*. Commercial or orchestral recordings of Beethoven etc. are still copyrighted. Musopen and other
  explicitly PD/CC0 recordings are the exception.
- **"Double-safe" PD rule:** the composition was first published **before 1 Jan 1931** (US PD as of 2026) **and** the
  composer died **before 1956** (life+70 in the EU/UK). Extra caution:
  - Spain uses life+80 for authors who died before 1987.
  - Mexico uses life+100 for some works.
  - Composers who died before ~1925 are safe almost everywhere.
- **Arrangements are separately copyrightable.** Work only from a pre-1931 score (IMSLP) or a traditional melody.
  Do **not** copy a modern cover's riffs, intros, reharmonisations or added lyrics. Examples to avoid: Dick Dale's
  "Misirlou", the Rednex "Cotton Eye Joe" synths, the Heifetz "Hora Staccato", the Ram Jam "Black Betty" riff.
- **Traditional ≠ unclaimed.** Publishers such as TRO/Folkways registered "adaptations" of many field-recorded work
  songs. "Black Betty" is registered as Huddie Ledbetter, © Folkways Music Publishers
  ([TRO Essex listing](https://www.troessexmusic.com/1/songs/black_betty)). Avoid songs with this kind of claim, or
  arrange strictly from a pre-registration source.
- **CC licences:**
  - CC0 is best.
  - CC-BY is fine with an in-game credit.
  - CC-BY-SA is fine, but the music (and our edits of it) must stay BY-SA.
  - **NC is excluded** because it blocks any later commercial use.
  - The Pixabay Content License is not CC. It allows game use, but some uploaders register tracks with YouTube
    Content ID. That is a moderate risk if players stream the game.
- **Content ID risk:** YouTube sometimes false-flags even original arrangements of PD classics. Keep the project
  files, score and render scripts as proof of authorship. Our unusual arrangements make matches unlikely.
- Lyrics: most candidates are planned as **instrumental with shouted gang-vocal hits at most**. We have no
  singer, and some lyrics (e.g. Ira Gershwin's, or Aloysio de Oliveira's Tico-Tico lyrics) are still protected.

---

## 3. Production feasibility on this machine

**What is installed:**
- Python 3.14 + numpy 2.5 + scipy 1.18.
- ffmpeg, with filters `acompressor`, `alimiter`, `loudnorm`, `afir` (convolution), `ebur128`.
- lame, Node 24, cmake.

**Not installed:**
- fluidsynth. The Homebrew bottle `fluid-synth 2.6.1` is available.
- sfizz. It is not in Homebrew, but `sfizz-render` builds with cmake: https://github.com/sfztools/sfizz-render.
- pedalboard and mido. Both are pip-installable.

Nothing was installed or downloaded during this research.

**Freely licensed sound sources (not yet downloaded, since that needs approval):**

| Source | Licence | Use | Link |
|---|---|---|---|
| VSCO 2 Community Edition | CC0 | Brass (trumpet, trombone, horn, tuba), strings, woodwinds, orchestral percussion; SFZ + WAV, ~3 GB | https://versilian-studios.com/vsco-community/ · https://github.com/sgossner/VSCO-2-CE |
| VCSL (Versilian Community Sample Library) | CC0 | Huge percussion + misc instruments | https://github.com/sgossner/VCSL |
| DrumGizmo MuldjordKit / DRSKit (SFZ ports) | CC-BY 4.0 | Real multisampled acoustic rock kits | https://github.com/sfzinstruments/DrumGizmo.MuldjordKit/ |
| GeneralUser GS | Free for any use incl. commercial output | Quick full-GM sketching via FluidSynth | https://schristiancollins.com/generaluser.php |
| FluidR3_GM / MuseScore_General | MIT | Same | https://musescore.org/en/node/317991 |

**Feasibility test:** see `docs/research/song-tests/`.
- `synth_test.py` is pure numpy/scipy with no samples. It renders 4 bars of "Drunken Sailor" as a stomp-rock
  arrangement at 150 BPM:
  - synthesised kick, snare, hats and crash;
  - Karplus-Strong bass;
  - double-tracked Karplus-Strong power chords through a 2-stage tanh "amp" and a cab EQ;
  - a Karplus-Strong lead line;
  - convolution reverb and a bus compressor.
- It also writes a beat map JSON.
- Output: `drunken_sailor_numpy_test.mp3` (8.4 s, 135 KB) and `drunken_sailor_numpy_test_beatmap.json`.

Measured results:
- Render speed: 8.4 s of audio in **0.5 s CPU**. A full 3-min track is a few seconds to render, so iteration is cheap.
- Loudness: −12.6 LUFS integrated, −1.0 dBTP, loudness range 3.1 LU (dense and loud, rock-like).
- Beat accuracy: detected onsets sit **median 1.5 ms (max 3.9 ms)** from the authored grid. The residual is the
  deliberate ±4 ms humanisation. Autocorrelation tempo is 149.8 vs 150 authored, so the beat map is exact by construction.
- Spectrum:
  - Relative band energy was 20–60 Hz −6.6 dB, 60–250 Hz −6.5 dB, 250–500 Hz −14.9 dB, 0.5–2 kHz −6.1 dB,
    2–4 kHz −7.4 dB, 4–8 kHz −12 dB, 8–16 kHz −16.4 dB.
  - The low end was too heavy, so the MP3 has a 35 Hz high-pass and a 50 Hz cut.
  - The mids are scooped, which is the "metal" tone.
  - The spectrogram shows clean harmonic stacks for the plucked strings and crisp transients on every 8th.
- **Honest quality estimate (from analysis only; nobody has listened yet):**
  - Pure-DSP output will sound like stylised **"chip-rock / garage demo"**.
  - Karplus-Strong gives convincing plucks and bass.
  - The weak spots are fizzy single-stage distortion without a real cab impulse response, and synthetic drums that
    sound more 808 than acoustic kit.
  - **Pure DSP ≈ 2.5/5.**
- **Quality tiers we can realistically reach:**
  1. Pure numpy synthesis: 2–3/5. It is best for styles whose real instruments are simple waveforms: surf/Vox/Farfisa
     organ (square/pulse), chip leads, synth bass, clean reverb-drenched surf guitar.
  2. FluidSynth + GeneralUser GS: 2.5–3/5. Brass, organ and bass are OK; distortion guitar and drums sound "90s MIDI".
  3. **Hybrid (recommended): 3.5–4/5.**
     - A small numpy one-shot/multisample player for CC0/CC-BY samples: DrumGizmo acoustic kit, VSCO 2 brass stabs
       and swells, VCSL percussion.
     - Synthesised organ, bass and surf guitar (Karplus-Strong + spring-reverb model).
     - Better amp simulation: oversampled 2–3 stage clipping and a cab impulse response. We can derive our own IR,
       or use a CC0 one after checking its licence.
     - A real mix bus: parallel drum compression, sidechain duck, limiter, and `loudnorm` to −14 LUFS.
  - Brass-led and surf styles land higher than high-gain guitar styles.

**Choosing a style for how it will sound:** our best-sounding outputs will be **surf rock (organ + clean spring
guitar), brass-band / big-band (VSCO 2 CE brass), ska, polka-punk (accordion ≈ reed synthesis + brass), and
synth-rock**. Modern high-gain metal and acoustic-heavy styles are the hardest to fake convincingly.

---

## 4. Candidates

Legend:
- **Route:** (a) PD composition we arrange and produce; (b) permissive-licence recording; (c) original composition.
- **Quality** is the expected audio quality (1–5) with the recommended hybrid pipeline.
- **Energy** is "Black Betty energy" (1–5): catchiness × drive × hook recognisability.
- Tempos are the suggested arrangement tempo, with notes on the original where relevant.

### Route (a): public-domain compositions we arrange

#### 1. Tico-Tico no Fubá (Zequinha de Abreu, 1917)
- **Route:** (a).
- **Legal:** Published 1917, so US PD. Abreu died 1935, so PD under life+70/80 everywhere. **Instrumental only:**
  Aloysio de Oliveira's lyrics are later and protected. Work from the original score. Evidence:
  [Wikipedia](https://en.wikipedia.org/wiki/Tico-Tico_no_Fub%C3%A1), [IMSLP score](https://imslp.org/wiki/Tico-Tico_no_fub%C3%A1_(Abreu,_Zequinha)),
  [Abreu d. 1935](https://en.wikipedia.org/wiki/Zequinha_de_Abreu), [PD recording on Commons](https://commons.wikimedia.org/wiki/File:Tico_Tico_No_Fuba_by_Zequinha_Abreu_(1917,_Brazilian_Syncopated_Music).opus).
- **Style:** "Choro-punk surf": reverb surf-guitar lead, Farfisa organ, slap-back, brass stabs on the syncopations,
  and a samba/rock hybrid beat (surdo on beat 2 plus a rock snare).
- **Tempo:** 150–160 BPM in 2/4 (felt as 4/4 with a 16th-note melody).
- **Hook:** The chattering run of 16th notes in the A theme. Almost everyone knows it without knowing the name.
- **Structure for choreography:** Choro rondo **A–B–A–C–A**. Each theme is a distinct "zone". The minor A theme is
  the chase, B is the modulating platforming section, and C (major) is the bright bonus area. The final A plus a
  stop-time tag is the climax. Its syncopated accents are perfect punch cues.
- **Production:** Hybrid. Organ and bass are synthesised, the lead is Karplus-Strong surf guitar through a spring
  reverb, drums come from the DrumGizmo kit, and brass stabs from VSCO 2. Tempo map is fixed.
- **Quality:** 4. **Energy:** 5.
- **Risks:**
  - The melody is very dense, so the level must pick accents rather than every note.
  - Carmen Miranda / Ethel Smith arrangements are protected, so don't copy their intros.

#### 2. Dance of the Comedians / Skočná (Smetana, The Bartered Bride, 1866)
- **Route:** (a).
- **Legal:** Smetana died 1884, so PD worldwide. Use the 1866/1870 score (IMSLP). Evidence:
  [Wikipedia: Skočná](https://en.wikipedia.org/wiki/Sko%C4%8Dn%C3%A1).
- **Style:** Surf-rock / big-band chase. It was the unofficial Road Runner theme, which is pure cartoon-chase DNA.
- **Tempo:** ~150–160 BPM in 2/4.
- **Hook:** The syncopated rising brass motif, then the tumbling string runs.
- **Structure:** Several contrasting themes, including a lyrical middle section that can be a breather. It ends
  with a genuine big finish and accelerando, so the climax comes for free.
- **Production:** VSCO 2 brass + synthesised organ + Karplus-Strong guitar doubling the string runs + acoustic kit.
- **Quality:** 4. **Energy:** 5.
- **Risks:** Moderately known ("heard it in cartoons"), less instantly singable than the Can-can. The orchestral
  string runs need re-voicing for guitar and organ.

#### 3. Joshua Fit the Battle of Jericho (African-American spiritual, 19th c.)
- **Route:** (a).
- **Legal:** Traditional, first published in the 1860s–1900s (e.g. Fisk Jubilee Singers). PD. Avoid copying
  specific modern recorded arrangements. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Joshua_Fit_the_Battle_of_Jericho).
- **Style:** **Closest DNA to Black Betty.** It is a traditional African-American tune turned into a minor-key
  blues-rock stomp with a floor-tom groove, a gang-shout hook ("JERICHO!") and a slide-guitar riff.
- **Tempo:** 130–140 BPM.
- **Hook:** The minor call "Joshua fit the battle of Jericho, Jericho, Jericho".
- **Structure:** Call-and-response gives natural punch/response pairs. The payoff "and the walls came tumbling
  down" is a ready-made **destruction set-piece climax** (the castle walls collapse on the beat).
- **Production:** Hybrid. The acoustic kit carries it (stomp and toms); guitar is Karplus-Strong through the amp
  sim; horn swells come from VSCO 2. Vocals: short shouted chants could be recorded by the team or left out.
- **Quality:** 3.5 (distorted guitar is the weak spot). **Energy:** 5.
- **Risks:**
  - Treat a sacred song respectfully, with no parody.
  - Recognisability outside the US/UK is moderate.

#### 4. Hava Nagila (trad. nigun, arr. A. Z. Idelsohn, publ. 1922)
- **Route:** (a).
- **Legal:** Published 1922, so US PD. Idelsohn died 1938, so life+70/80 PD. The Nathanson claim concerns lyrics
  only, and we are instrumental. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Hava_Nagila).
- **Style:** Surf rock in the Dick Dale spirit, but our own arrangement: tremolo-picked Karplus-Strong guitar, organ
  and a driving "horse-beat" drum pattern.
- **Tempo:** Accelerates from ~110 to ~190 BPM.
- **Hook:** The Phrygian-dominant opening phrase; universally known.
- **Structure:** A three-part form that repeats with **a built-in accelerando**, ideal for "level speeds up" design:
  an intro walk, then a run, then a frantic climax.
- **Production:** Hybrid. The beat map is a tempo map with a changing BPM, which is trivial for our renderer.
- **Quality:** 4. **Energy:** 5.
- **Risks:** Heavily associated with weddings and bar mitzvahs (fun, but a strong cultural association). Needs
  respectful treatment.

#### 5. Unter Donner und Blitz / "Thunder and Lightning" Polka (Johann Strauss II, 1868)
- **Route:** (a).
- **Legal:** Strauss II died 1899, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Unter_Donner_und_Blitz).
- **Style:** **Polka-punk** (Gogol Bordello / Russkaja energy): accordion-like reed synth, brass, punk drums and
  timpani-roll "thunder".
- **Tempo:** 160–170 BPM (fast polka).
- **Hook:** The bouncing main theme, punctuated by bass-drum/cymbal "thunder" hits.
- **Structure:** Thunder hits are written into the score, giving natural lightning-strike / obstacle cues. It has a
  clear main theme, trio and da capo, plus a big coda.
- **Production:** VSCO 2 brass + reed synth + acoustic kit.
- **Quality:** 4. **Energy:** 5.
- **Risks:** Fairly well known but not overused in games. A little "Vienna New Year" unless it is punked hard.

#### 6. Galop infernal / "Can-can" (Offenbach, Orphée aux enfers, 1858)
- **Route:** (a).
- **Legal:** Offenbach died 1880, so PD. Evidence: [Wikipedia: Infernal Galop](https://en.wikipedia.org/wiki/Infernal_Galop).
- **Style:** Surf-punk or ska-punk.
- **Tempo:** 165–175 BPM.
- **Hook:** Probably the most recognisable galop in existence.
- **Structure:** Short themes that repeat. It needs arranged sections (drum break, key change) to reach 2.5 min.
  It works well as the **final climax quote** inside a medley.
- **Production:** Hybrid.
- **Quality:** 4. **Energy:** 5.
- **Risks:** Clichéd: comedy and "Moulin Rouge" associations, and used everywhere. Its freshness is low.

#### 7. Kalinka (Ivan Larionov, 1860)
- **Route:** (a).
- **Legal:** Larionov died 1889, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Kalinka_(1860_song)).
- **Style:** Folk-metal / polka-punk: Karplus-Strong balalaika tremolo, brass and double-kick.
- **Tempo:** Refrain accelerates from ~80 to ~200 BPM, then resets.
- **Hook:** "Kalinka, kalinka, kalinka moya", instantly known.
- **Structure:** **The song is literally built from build-ups.** Each refrain speeds up to a frenzy, then drops back
  to slow. That gives repeated "run faster and faster, then breather" cycles, the best native structure of any
  candidate.
- **Production:** Hybrid, with a tempo map.
- **Quality:** 4. **Energy:** 5.
- **Risks:**
  - 2026 optics: strongly associated with Russian military choirs.
  - The accelerando requires gameplay to scale speed. That is a feature, but also an engineering cost.

#### 8. Sōran Bushi (Hokkaido herring-fishing work song, Meiji era)
- **Route:** (a).
- **Legal:** Traditional folk song, PD. The 1991 "Yosakoi Sōran" arrangement is modern and protected, so use the
  traditional melody only. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/S%C5%8Dran_Bushi),
  [origin as net-hauling song](https://hokkaido-labo.com/en/area/all/so-ranbushi).
- **Style:** Taiko-rock / J-rock: taiko ensemble, shamisen-like Karplus-Strong, overdriven guitar, gang shouts.
- **Tempo:** 140–150 BPM.
- **Hook:** The call-and-response work cries **"Yaren sōran sōran… Hai! Hai!"** and "Dokkoisho!". Like Black Betty,
  this is a work song, and those shouts are ready-made **punch cues**.
- **Structure:** Verse / shout-chorus cycles. Taiko breaks can serve as drum-solo sections.
- **Production:** Taiko synthesises well (pitched membrane models) or comes from VCSL. Karplus-Strong shamisen.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:**
  - Less known outside Japan.
  - The shouts need voices (team recordings or synth "hey" samples).

#### 9. What Shall We Do with the Drunken Sailor (sea shanty, ≥1830s)
- **Route:** (a).
- **Legal:** Traditional, PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Drunken_Sailor).
  **Prototyped here** (see §3).
- **Style:** Celtic-punk stomp (Dropkick Murphys-style energy): tin-whistle synth, gang vocals, driving 8ths.
- **Tempo:** 150–170 BPM.
- **Hook:** Instantly known, three chords.
- **Structure:** Verse = chorus melody, so it is **repetitive**. Structure must come from the arrangement: key-up
  modulations, a half-time breakdown and a double-time finale.
- **Production:** Proven feasible in pure DSP. Hybrid gets to ~3.5.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Monotony. Also a meme-level association (the 2021 shanty TikTok craze).

#### 10. When Johnny Comes Marching Home (Patrick Gilmore, 1863)
- **Route:** (a).
- **Legal:** Gilmore died 1892, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/When_Johnny_Comes_Marching_Home).
- **Style:** Minor-key 6/8 stomp-rock / spaghetti-western rock: whip cracks, whistled melody, big toms.
- **Tempo:** 120–132 BPM dotted-quarter (a galloping feel).
- **Hook:** The minor "hurrah, hurrah" melody (the same tune as "The Ants Go Marching").
- **Structure:** Strophic, so it needs arrangement for build and drop. The 6/8 gallop is great for bounding jumps.
- **Production:** Hybrid.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Military / Civil War association. The 6/8 meter feels less "punchy" than 4/4.

#### 11. Light Cavalry Overture, galop section (Franz von Suppé, 1866)
- **Route:** (a).
- **Legal:** Suppé died 1895, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Light_Cavalry_Overture).
- **Style:** Iron-Maiden-style galloping metal plus brass fanfare.
- **Tempo:** ~140 BPM gallop.
- **Hook:** The **opening trumpet fanfare** (a perfect "level start" call), then the cavalry gallop.
- **Structure:** Fanfare, march, gallop, climax. It has a slow lyrical section that could serve as a hub or breather.
- **Production:** VSCO 2 brass is strong here.
- **Quality:** 4. **Energy:** 4.
- **Risks:** Cartoon-classical cliché, and the full overture is 7 min so it needs editing.

#### 12. William Tell Overture, finale (Rossini, 1829)
- **Route:** (a).
- **Legal:** Rossini died 1868, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/William_Tell_Overture).
- **Style:** Surf-metal gallop.
- **Tempo:** ~150 BPM.
- **Hook:** Universally known ("Lone Ranger").
- **Structure:** Fanfare, then the galop theme, then crescendo passages. A great climax.
- **Production:** Hybrid.
- **Quality:** 4. **Energy:** 5.
- **Risks:** One of the most overused pieces in media. Choosing it means "the mean".

#### 13. Twelfth Street Rag (Euday L. Bowman, 1914)
- **Route:** (a).
- **Legal:** Published 1914. Bowman died 1949, so PD in both the US and the EU. Evidence:
  [Wikipedia](https://en.wikipedia.org/wiki/12th_Street_Rag).
- **Style:** Jump-blues / boogie-rock: honky-tonk piano, sax section and a shuffle kit.
- **Tempo:** 150–170 BPM swing.
- **Hook:** The famous **3-against-4 repeating motif**, a gift for syncopated "off-beat jump" gameplay.
- **Structure:** Ragtime strains AABBACCDD give four distinct zones.
- **Production:** Piano (Salamander Grand, CC-BY; needs a download) + VSCO 2 brass + kit.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Can read as "old-timey silent-film". It needs a modern low end.

#### 14. I Got Rhythm (George Gershwin, 1930)
- **Route:** (a).
- **Legal:** The composition entered **US PD on 1 Jan 2026** ([Duke Public Domain Day 2026](https://web.law.duke.edu/cspd/publicdomainday/2026/)).
  George Gershwin died 1937, so the music has been PD in life+70 countries since 2008. **Ira's lyrics are protected
  in the EU until 2054**, so we stay instrumental. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/I_Got_Rhythm).
- **Style:** Big-band / jump-swing at a sprint, with a brass-shout climax.
- **Tempo:** 190–220 BPM swing.
- **Hook:** The 4-note "I got rhythm" motif.
- **Structure:** AABA "rhythm changes": the bridge is a natural contrast zone, and shout choruses make the climax.
- **Production:** Brass-heavy, via VSCO 2 CE.
- **Quality:** 3.5–4. **Energy:** 4.
- **Risks:**
  - Newly PD, so estate and publishers may be touchy. Don't copy Girl Crazy orchestrations.
  - Swing 8ths complicate the beat map (fine for our own production).

#### 15. Ritual Fire Dance (Manuel de Falla, El amor brujo, 1915/1925)
- **Route:** (a).
- **Legal:** Published ≤1925, so US PD. De Falla died 1946, so life+70 PD since 2017. **Spain uses life+80 for
  pre-1987 deaths, making it PD in Spain only from 1 Jan 2027** (3 months away). Evidence:
  [Wikipedia: El amor brujo](https://en.wikipedia.org/wiki/El_amor_brujo),
  [copyright lengths](https://en.wikipedia.org/wiki/List_of_countries%27_copyright_lengths).
- **Style:** Flamenco-metal: trill ostinato on tremolo guitar, heavy riff, cajón.
- **Tempo:** ~140 BPM.
- **Hook:** Trill-and-stab ostinato and the repeated hammer chords at the end.
- **Structure:** The ending, with its hammered repeated chords, is a spectacular boss-hit climax.
- **Production:** Hybrid.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Hook recognisability is medium. Launch after 2027-01-01 to be fully safe.

#### 16. Asturias (Leyenda) (Isaac Albéniz, 1892)
- **Route:** (a).
- **Legal:** Albéniz died 1909, so PD. Arrange from the piano original or Tárrega-era sources, not the Segovia
  transcription. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Asturias_(Leyenda)).
- **Style:** Neo-classical/flamenco metal, a proven rock crossover.
- **Tempo:** 150–170 BPM.
- **Hook:** The pedal-point alternating riff.
- **Structure:** Fast–slow (copla)–fast (ABA). The slow middle is a breather zone.
- **Production:** Guitar-dependent, which is our weakest timbre.
- **Quality:** 3. **Energy:** 4.
- **Risks:** Guitar realism. Also, it is a "guitar-student" classic that reads as serious rather than joyful.

#### 17. Copenhagen Steam Railway Galop (H. C. Lumbye, 1847)
- **Route:** (a).
- **Legal:** Lumbye died 1874, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Copenhagen_Steam_Railway_Galop).
- **Style:** Rockabilly / train-beat rock (the "boom-chicka" train beat).
- **Tempo:** Accelerates from ~100 to ~160 BPM, then decelerates.
- **Hook:** Moderate. The **programme is the hook**: station bell, departure, accelerating chugging, whistle,
  arrival and the conductor's cry.
- **Structure:** **A whole level narrative written into the score**: board the train, accelerate, ride on the roof,
  arrive. Very fresh.
- **Production:** Hybrid. Train SFX (whistle, steam) are synthesisable.
- **Quality:** 3.5. **Energy:** 3.5.
- **Risks:** An unknown tune for most players, so the melody is less catchy than Black Betty.

#### 18. Champagne Galop (H. C. Lumbye, 1845)
- **Route:** (a).
- **Legal:** PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Champagne_Galop).
- **Style:** Ska / party brass.
- **Tempo:** ~150 BPM.
- **Hook:** The **cork pops** written into the score: collectible pops, and "pop" enemies.
- **Structure:** Intro, then galop A/B, then coda.
- **Production:** Brass.
- **Quality:** 4. **Energy:** 3.5.
- **Risks:** Low recognisability, and an alcohol theme (easily reframed as soda).

#### 19. Csárdás (Vittorio Monti, 1904)
- **Route:** (a).
- **Legal:** Monti died 1922, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Cs%C3%A1rd%C3%A1s_(Monti)).
- **Style:** Gypsy-punk: violin lead (the hardest timbre; could be taken by synth or guitar), accordion, brass.
- **Tempo:** Slow lassan, then friss at 160–180 BPM.
- **Hook:** The friss theme is well known.
- **Structure:** A slow intro that **explodes into a fast section**, then a harmonics interlude, then a faster
  finale. Built-in "calm before the run".
- **Production:** Hybrid. A good solo violin is not available as CC0 (VSCO 2 has one, limited), so replace it with
  clarinet or guitar.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Rubato must be straightened. The virtuosic lead could expose synthetic timbre.

#### 20. Hungarian Dance No. 5 (Brahms, 1869)
- **Route:** (a).
- **Legal:** Brahms died 1897, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Hungarian_Dances_(Brahms)).
- **Style:** Balkan-rock / gypsy-rock.
- **Tempo:** Slow–fast alternations, ~140–170 BPM.
- **Hook:** Very recognisable.
- **Structure:** Written-in stop-and-go tempo changes, giving rhythmic "freeze" moments (Rayman-style stops).
- **Production:** Hybrid.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Only 2–3 min with repeats, and a bit "classical".

#### 21. Ciocârlia (trad. Romanian, Angheluș Dinicu, 19th c.) / Romanian Rhapsody No. 1 (Enescu, 1901)
- **Route:** (a).
- **Legal:** Ciocârlia is a traditional/19th-c. tune, PD. Fanfare Ciocărlia and Taraf recordings are protected, so
  don't copy their arrangements. **Enescu died 1955, so life+70 PD from 1 Jan 2026**, and it is US PD (1901/02).
  Evidence: [IMSLP: A. Dinicu](https://imslp.org/wiki/Category:Dinicu,_Anghelu%C8%99),
  [Enescu](https://en.wikipedia.org/wiki/George_Enescu).
- **Style:** Balkan brass-band punk.
- **Tempo:** Accelerating, ~140 to 200 BPM.
- **Hook:** Lark-trill motifs and a wild accelerating hora. Enescu's rhapsody quotes it, which gives us a
  PD "orchestral" intro.
- **Structure:** Free intro, then accelerating hora, then a frenzied finale.
- **Production:** VSCO 2 brass + tuba bass + kit.
- **Quality:** 4. **Energy:** 4.5.
- **Risks:** Hook recognisability is medium in the West. Enescu's PD status is new, so it is safer to arrange from the trad tune.

#### 22. Užičko kolo and other traditional Serbian kolos
- **Route:** (a).
- **Legal:** Traditional dance tunes, PD. Modern Boban/Marko Marković arrangements are protected. **Verify the exact
  tune source** (a pre-1931 publication or a documented traditional origin). Evidence:
  [Balkan brass](https://en.wikipedia.org/wiki/Balkan_brass).
- **Style:** Guča-style trumpet band + electro/punk drums.
- **Tempo:** 150–170 BPM in 2/4.
- **Hook:** Fast trumpet unisons. Recognised from Kusturica films rather than by name.
- **Structure:** Kolos repeat and accelerate. The arrangement adds sections.
- **Production:** Brass-centric, which is our strength.
- **Quality:** 4. **Energy:** 4.5.
- **Risks:** Weaker provenance evidence than the classical pieces. Low name recognition.

#### 23. Üsküdar'a Gider İken / Kâtibim (Ottoman/Balkan traditional, 19th c.)
- **Route:** (a).
- **Legal:** Traditional with disputed origins (Armenian operetta 1883 / Balkan variants). PD. Evidence:
  [Wikipedia: Kâtibim](https://en.wikipedia.org/wiki/K%C3%A2tibim).
- **Style:** **Turkish psych-rock** (Erkin Koray / Altın Gün vibe): fuzz saz-guitar, Farfisa, darbuka + kit.
- **Tempo:** 120–132 BPM.
- **Hook:** A very catchy modal melody known across the Balkans and Middle East.
- **Structure:** Verse-chorus. Psych arrangements allow fuzz-solo breaks and a big wah climax.
- **Production:** Organ and fuzz synthesise well.
- **Quality:** 3.5. **Energy:** 3.5 (groovy more than frantic).
- **Risks:** Mid-tempo, so it is less of a sprint.

#### 24. Hej Sokoły (Polish-Ukrainian, attrib. Tomasz Padura, 19th c.)
- **Route:** (a).
- **Legal:** Author died 1871 / traditional, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Hej,_soko%C5%82y).
- **Style:** Polka-punk / ska singalong.
- **Tempo:** 150–170 BPM (in 3/4 → felt as fast one-in-a-bar, or re-metered to 4/4).
- **Hook:** The huge singalong chorus "Hej, hej, hej sokoły".
- **Structure:** Verse / singalong chorus. The arrangement supplies build and drops.
- **Production:** Brass + reed.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** 3/4 meter (re-metering changes the feel). Regional recognition.

#### 25. Ride of the Valkyries (Wagner, 1856/1870)
- **Route:** (a).
- **Legal:** Wagner died 1883, so PD. Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Ride_of_the_Valkyries).
- **Style:** Symphonic metal gallop.
- **Tempo:** ~ 100 BPM in 9/8 (a galloping triplet feel).
- **Hook:** Enormous.
- **Structure:** A repeating build of brass statements over whirling strings. It needs editing.
- **Production:** VSCO 2 brass.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:** Overused (Apocalypse Now, war memes). The 9/8 triplet feel is awkward for a "beat" game.

#### 26. Entrance of the Gladiators / Dance of the Hours finale (Fučík 1897 / Ponchielli 1876)
- **Route:** (a).
- **Legal:** Fučík died 1916 and Ponchielli died 1886, so both PD. Evidence:
  [Gladiators](https://en.wikipedia.org/wiki/Entrance_of_the_Gladiators), [Dance of the Hours](https://en.wikipedia.org/wiki/Dance_of_the_Hours).
- **Style:** Circus-metal / galop-punk.
- **Tempo:** 150–170 BPM.
- **Hook:** Chromatic circus run, and the famous finale galop.
- **Structure:** March/galop strains.
- **Production:** Brass.
- **Quality:** 4. **Energy:** 4.
- **Risks:** Clown / "Hello Muddah" comedy baggage.

#### 27. Cotton-Eyed Joe (American fiddle tune, pre-1861)
- **Route:** (a).
- **Legal:** Traditional, PD. Avoid everything from Rednex (1994). Evidence: [Wikipedia](https://en.wikipedia.org/wiki/Cotton-Eyed_Joe).
- **Style:** Bluegrass-breakdown rock ("hoedown-metal"): banjo rolls (Karplus-Strong works well), fiddle, stomping kick.
- **Tempo:** 135–150 BPM.
- **Hook:** Known worldwide via Rednex.
- **Structure:** Fiddle AABB. The arrangement adds breakdowns.
- **Production:** Karplus-Strong banjo, synthetic or sampled fiddle.
- **Quality:** 3.5. **Energy:** 4.
- **Risks:**
  - Minstrel-era origins and lyrics, so stay instrumental.
  - Players may "hear" the Rednex version.

#### 28. Black Betty itself (trad. work song, 1933 field recording) *(benchmark, not recommended)*
- **Route:** (a), in theory.
- **Legal:** **High risk.** TRO/Folkways registers "new words and music adaptation by Huddie Ledbetter". The riff
  everyone knows is Bill Bartlett's 1970s arrangement. Evidence: [TRO Essex](https://www.troessexmusic.com/1/songs/black_betty),
  [Wikipedia](https://en.wikipedia.org/wiki/Black_Betty).
- **Tempo:** ≈120 BPM.
- **Quality:** –. **Energy:** 5.
- **Verdict:** Don't. Use it as the yardstick only.

#### 29. Misirlou (trad. Eastern Mediterranean, 1927 recording) *(benched)*
- **Route:** (a).
- **Legal:** The melody predates 1931, but Nicholas Roubanis registered his arrangement in the 1940s, and Dick Dale's
  surf arrangement plus Pulp Fiction make Content ID and publisher claims likely. Evidence:
  [Wikipedia](https://en.wikipedia.org/wiki/Misirlou).
- **Tempo:** ~170 BPM.
- **Energy:** 5.
- **Verdict:** Use **Hava Nagila (#4)** for the same surf-Phrygian thrill with a cleaner status.

### Route (b): permissive-licence recordings

All the Kevin MacLeod tracks below:
- are **CC BY 4.0**;
- need the credit line "Title Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0";
- are licensed per https://incompetech.com/music/royalty-free/licenses/;
- have MP3s that are downloadable (HTTP 200 checked) at `https://incompetech.com/music/royalty-free/mp3-royaltyfree/<Title>.mp3`.

MacLeod sequences his tracks in a DAW, so tempo should be rock-steady. Run a beat-tracker pass after downloading
to confirm the BPM and first-downbeat offset. Metadata below is from incompetech's `pieces.json`.

#### 30. "Ready Aim Fire" (Kevin MacLeod, 2015)
- **Route:** (b).
- **Licence:** CC BY 4.0. [Track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500002).
- **Style:** Rock with organ: "an amped up secret agent or pro wrestler theme with a thick wall of sound and a crazy drummer".
- **Tempo:** 172 BPM. **Length:** 3:37.
- **Hook:** Library-music hook, not iconic.
- **Structure:** Unknown until auditioned.
- **Production:** None.
- **Quality:** 4 (professional mix). **Energy:** 4.
- **Risks:**
  - Widely used in YouTube videos, so it sounds "generic".
  - We cannot restructure it or get stems.

#### 31. "District Four" (Kevin MacLeod, 2016)
- **Route:** (b).
- **Licence:** CC BY 4.0. [Track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600039).
- **Style:** "Deep grooving crazy big percussion"; funk with bass, guitar, organ and percussion.
- **Tempo:** 176 BPM (bonus 165 BPM version). **Length:** 4:08.
- **Hook:** Groove rather than melody.
- **Structure:** **The download includes separated stems**, which allows adaptive layering (drop instruments in breaks).
- **Quality:** 4. **Energy:** 4.
- **Risks:** Not hooky enough for "Black Betty tier".

#### 32. "Surf Shimmy" (Kevin MacLeod, 2017)
- **Route:** (b).
- **Licence:** CC BY 4.0. [Track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700018).
- **Style:** Surf rock: guitar, bass, drums, organ.
- **Tempo:** 170 BPM. **Length:** 2:03 (short).
- **Quality:** 4. **Energy:** 4.
- **Risks:** Short, so it would need looping or an extension. Generic.

#### 33. Other MacLeod tracks
All CC BY 4.0, [licence](https://incompetech.com/music/royalty-free/licenses/). Quality 4, Energy 3–4. Worth
auditioning as the **prototype placeholder track** while the real song is produced.

| Track | Style | Tempo | Length |
|---|---|---|---|
| "Exhilarate" | Rock | 170 BPM | 2:25 |
| "Upbeat Forever" | Ska | 164 BPM | 3:15 |
| "Guts and Bourbon" | Country-rock | 190 BPM | 3:29 |
| "Boogie Party" | Boogie | 178 BPM | 4:32 |
| "Fiddles McGinty" | Celtic | 174 BPM | 3:27 |

#### 34. Loyalty Freak Music – HYPER METAL! album (e.g. "MEGA METAL" 3:08, "MAXI METAL" 2:47)
- **Route:** (b).
- **Licence:** **CC0 1.0**, the best possible. [FMA album](https://freemusicarchive.org/music/Loyalty_Freak_Music/HYPER_METAL_),
  [artist CC0 page](https://loyaltyfreakmusic.com/licence/cc-0/). Also "Ghost Surf Rock" (CC0, 4:07).
- **Tempo / structure:** Not auditioned (the web tools cannot listen).
- **Quality:** ~3 (indie production). **Energy:** ~4.
- **Risks:** Unknown tempo steadiness and hook quality. Needs a listen.

#### 35. Blue Wave Theory – "Skyhawk Beach" / "Frisbeat" (surf rock, edited for games by Iori Branford)
- **Route:** (b).
- **Licence:** **CC BY-SA 4.0**. Credit: '"Skyhawk Beach"… by Blue Wave Theory (bluewavetheory.com). Arranged by
  Iori Branford.' [OpenGameArt](https://opengameart.org/content/blue-wave-theory-surf-rock-edited-for-games).
- **Style:** A real band playing authentic instrumental surf, supplied as intro+loop files.
- **Quality:** 4 (real instruments). **Energy:** 4.
- **Risks:**
  - **Live drummer: tempo drift is likely**, so it needs beat tracking and a variable beat map.
  - The ShareAlike obligation applies to the music.
  - Loop-oriented edits with no big climax.

#### 36. Alexander Nakarada (serpentsoundstudios / CreatorChords) rock & metal catalogue
- **Route:** (b).
- **Licence:** CC BY 4.0 per [serpentsoundstudios licence](https://www.serpentsoundstudios.com/license-metal-rock).
  Check each track, because the licence has moved around between his sites.
- **Quality:** 4. **Energy:** 3–4.
- **Risks:** Needs audition, and the licence terms may differ per track.

Excluded from route (b):
- **The Freak Fandango Orchestra** (great Balkan-punk, but **CC BY-NC**), [FMA](https://freemusicarchive.org/music/The_Freak_Fandango_Orchestra/).
- **Most of Jamendo** (mostly NC, or requires a paid licence), [Jamendo licences](https://www.jamendo.com/legal/licenses).
- **Pixabay** (allowed in games per [Pixabay licence](https://pixabay.com/service/license-summary/), but it is not CC
  and has Content ID claim risk).

### Route (c): original compositions

#### 37. Original "Castle Stomp": Black-Betty-style blues-rock
- **Route:** (c). **Legal:** Ours.
- **Style:** A floor-tom/kick stomp intro, a pentatonic riff in E, gang-chant syllable hook, stop-time breaks and a
  frantic double-time outro.
- **Tempo:** 124 BPM, with a double-time outro at 248.
- **Hook:** Whatever we write. **This is the risk:** a mediocre riff kills it.
- **Structure:** Fully designed around the level: intro, riff A, stop-time break, build, drop, double-time climax.
- **Production:** Hybrid.
- **Quality:** 3.5. **Energy:** 3–5 (depends on songwriting).
- **Risks:** Songwriting quality is uncertain, there is no nostalgia factor, and guitar-centric is our weakest timbre.

#### 38. Original surf-punk / "spy-surf" (Farfisa + tremolo guitar + brass)
- **Route:** (c). **Legal:** Ours.
- **Tempo:** 172 BPM.
- **Hook:** Written to be whistleable.
- **Structure:** Fully bespoke.
- **Production:** Plays exactly to our synthesis strengths.
- **Quality:** 4. **Energy:** 3–4.
- **Risks:** Hook quality, as above.

#### 39. Original Balkan-brass × drum&bass / electro-swing
- **Route:** (c). **Legal:** Ours.
- **Tempo:** 170–175 BPM.
- **Hook:** Brass riff.
- **Structure:** EDM form gives explicit build-ups and drops, the most choreography-friendly form.
- **Production:** VSCO 2 brass + synthesised drums (DnB drums are *supposed* to sound processed).
- **Quality:** 4. **Energy:** 4.
- **Risks:** Hook quality. Also genre fatigue (electro-swing).

#### 40. Hybrid "Galop Medley" (Orchestral-Chaos style): originals + PD quotes
- **Route:** (a)+(c). **Legal:** PD quotes + our glue.
- **Idea:** An original surf-rock riff as the backbone, with sections that quote PD hooks: Light Cavalry fanfare
  (intro), then Dance of the Comedians (chase), then Thunder & Lightning (storm zone), then Can-can (finale).
- **Tempo:** 160 BPM throughout.
- **Structure:** **Every section is a new famous hook.** Great for level zoning.
- **Quality:** 4. **Energy:** 5.
- **Risks:** Can feel like a "classical mix-tape" instead of one song. The glue riff must be strong.

---

## 5. Summary table

| # | Song | Route | Tempo | Quality | Energy | Legal risk |
|---|---|---|---|---|---|---|
| 1 | Tico-Tico no Fubá | a | 150–160 | 4 | 5 | Low (instrumental) |
| 2 | Dance of the Comedians | a | 150–160 | 4 | 5 | Very low |
| 3 | Joshua Fit the Battle of Jericho | a | 130–140 | 3.5 | 5 | Low |
| 4 | Hava Nagila | a | 110→190 | 4 | 5 | Low |
| 5 | Thunder & Lightning Polka | a | 160–170 | 4 | 5 | Very low |
| 6 | Can-can (Galop infernal) | a | 165–175 | 4 | 5 | Very low |
| 7 | Kalinka | a | 80→200 | 4 | 5 | Very low (optics) |
| 8 | Sōran Bushi | a | 140–150 | 3.5 | 4 | Low |
| 9 | Drunken Sailor | a | 150–170 | 3.5 | 4 | Very low |
| 10 | When Johnny Comes Marching Home | a | 120–132 (6/8) | 3.5 | 4 | Very low |
| 11 | Light Cavalry galop | a | 140 | 4 | 4 | Very low |
| 12 | William Tell finale | a | 150 | 4 | 5 | Very low |
| 13 | Twelfth Street Rag | a | 150–170 sw | 3.5 | 4 | Low |
| 14 | I Got Rhythm | a | 190–220 sw | 3.5–4 | 4 | Low–med (new PD, no lyrics) |
| 15 | Ritual Fire Dance | a | 140 | 3.5 | 4 | Low (Spain until 2027) |
| 16 | Asturias | a | 150–170 | 3 | 4 | Very low |
| 17 | Copenhagen Steam Railway Galop | a | 100→160 | 3.5 | 3.5 | Very low |
| 18 | Champagne Galop | a | 150 | 4 | 3.5 | Very low |
| 19 | Monti Csárdás | a | slow→170 | 3.5 | 4 | Very low |
| 20 | Hungarian Dance No. 5 | a | 140–170 | 3.5 | 4 | Very low |
| 21 | Ciocârlia / Romanian Rhapsody 1 | a | 140→200 | 4 | 4.5 | Low |
| 22 | Užičko kolo | a | 150–170 | 4 | 4.5 | Low–med (verify source) |
| 23 | Üsküdar'a Gider İken | a | 120–132 | 3.5 | 3.5 | Low |
| 24 | Hej Sokoły | a | 150–170 | 3.5 | 4 | Low |
| 25 | Ride of the Valkyries | a | ~100 (9/8) | 3.5 | 4 | Very low |
| 26 | Gladiators / Dance of the Hours | a | 150–170 | 4 | 4 | Very low |
| 27 | Cotton-Eyed Joe | a | 135–150 | 3.5 | 4 | Low |
| 28 | Black Betty (trad) | a | 120 | – | 5 | **High** |
| 29 | Misirlou | a | 170 | 4 | 5 | **Medium–high** |
| 30 | MacLeod "Ready Aim Fire" | b | 172 | 4 | 4 | Very low (credit) |
| 31 | MacLeod "District Four" (stems) | b | 176 | 4 | 4 | Very low (credit) |
| 32 | MacLeod "Surf Shimmy" | b | 170 | 4 | 4 | Very low (credit) |
| 33 | Other MacLeod tracks | b | 164–190 | 4 | 3–4 | Very low |
| 34 | Loyalty Freak HYPER METAL! | b | ? | ~3 | ~4 | None (CC0) |
| 35 | Blue Wave Theory surf | b | ? (drift) | 4 | 4 | Low (BY-SA) |
| 36 | Alexander Nakarada rock | b | varies | 4 | 3–4 | Low (verify) |
| 37 | Original "Castle Stomp" | c | 124/248 | 3.5 | 3–5 | None |
| 38 | Original spy-surf | c | 172 | 4 | 3–4 | None |
| 39 | Original Balkan-DnB | c | 172 | 4 | 4 | None |
| 40 | Galop Medley (PD + original glue) | a+c | 160 | 4 | 5 | Very low |

---

## 6. Top 8 (honest ranking)

1. **Tico-Tico no Fubá (surf-rock "choro-punk")**
   - An instantly known, joyful hook that nobody has made a game level from.
   - The rondo form gives ready-made zones, and the syncopated accents are punch cues.
   - Plays to our synthesis strengths: organ, surf guitar, brass. PD status is clean.
2. **Dance of the Comedians (surf/brass chase)**
   - The Road Runner chase music, with contrasting themes and a written-in accelerando finale.
   - The safest choice legally.
3. **Joshua Fit the Battle of Jericho (blues-rock stomp)**
   - The closest to Black Betty's DNA: a trad African-American tune turned into a hard-rock stomp with shout
     responses. "The walls came tumbling down" is a built-in destruction climax.
   - Sits lower only because distorted guitar is our weakest timbre.
4. **Hava Nagila (surf rock, accelerating)**
   - A universal hook with an accelerando built into the song. Everyone speeds up with it.
5. **Thunder & Lightning Polka (polka-punk)**
   - A frantic tempo, with the thunder hits already in the score as hazard cues. Brass-driven, so it sounds good in our pipeline.
6. **Can-can / Galop infernal (surf-punk)**
   - Maximum energy and recognition, but clichéd. Ideal as the **final-climax quote**, or combined with #2 in the
     Galop-Medley format (#40).
7. **Kalinka (folk-metal/polka-punk)**
   - The best native build-up structure (repeated accelerandos), held back by 2026 optics.
8. **Sōran Bushi (taiko-rock)**
   - The "random corner" pick: a real work song whose shouted calls ("Dokkoisho! Hai! Hai!") are literally punch
     cues. Fresh, but less recognisable in the West.

Prototype placeholder while producing: **Kevin MacLeod "Ready Aim Fire" (172 BPM, CC BY 4.0)**, or "District Four",
which comes with stems. Use it to build the beat-sync engine before the real track exists.

---

## 7. Recommended production pipeline ("score as code", hybrid synthesis + CC0 samples)

1. **Arrange in code.** A small Python score DSL, or MIDI via `mido`, defines:
   - a tempo map (including accelerandos);
   - sections (intro / A / B / break / build / drop / climax / outro);
   - per-instrument note lists.
   Work from the pre-1931 IMSLP score or the traditional melody, never from modern covers.
2. **Render in numpy** (proven: 8 s of audio in 0.5 s):
   - Synthesised organ, bass, surf guitar and banjo/shamisen (Karplus-Strong), plus a spring-reverb model.
   - Oversampled multi-stage amp sim + cab impulse response for the dirt.
   - A simple multisample/one-shot player for **VSCO 2 CE brass/percussion (CC0)**, **VCSL (CC0)** and
     **DrumGizmo acoustic kit (CC-BY 4.0)**. These need a one-time download of a few hundred MB, which needs approval.
   - Optional: FluidSynth + GeneralUser GS for quick sketches only.
3. **Mix and master:**
   - Bus compression and parallel drums in numpy.
   - `ffmpeg` `alimiter` + `loudnorm` to about −14 LUFS / −1 dBTP.
   - Export **stems** as well as the full mix, for adaptive layers and 8-bit alt mixes.
4. **Emit `beatmap.json` from the same score.** It holds beats, bars and sections, plus **event lanes** (kick,
   snare, brass stab, riff accents, shouts) so level designers place punches and jumps on real sounds. It is
   sample-exact by construction.
5. **Web delivery:**
   - Ship OGG/Opus + AAC (or MP3) and play through Web Audio.
   - Sync gameplay to `AudioContext.currentTime`, not frame time.
   - **Compensate encoder delay:** MP3/LAME adds ~1105 samples of priming (or measure the offset once per file),
     otherwise the beat map drifts by ~25 ms.
6. **Credits file:** list PD sources (score editions) and CC-BY sample credits (DrumGizmo), and keep render
   scripts as proof of authorship against Content ID.
