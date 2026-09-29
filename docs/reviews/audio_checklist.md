# Audio listening checklist (for a human)

*The audio engineer's list. Every item was measured offline (the mix lab), but nothing has been heard. It replaces
the 10-item list in `docs/reviews/iter3.md` ("A human must listen for"), updated for iteration 4: act 2's own
mechanic sounds, the act-3 sound set, THE HUSH before the drop, and THE FINALE on the final hit. Iteration 6 adds
items 23–31: the run now starts at crowd 14 (the record full from beat 0), tokens sing the melody, the near-miss WHEW,
the film canisters, the goons' flares and the poster's rank stings. Iteration 7 adds items 32–38: the ending's stings
now land WITH the picture (THE END on the iris, the billing on the stamp), a warm C for every finisher, tokens that
answer instead of echoing, the roof's SLIM sign, the colour reel on beat 15 and the canister glints. Iteration 9 adds
items 39–45: the chorus lift (the music louder, brighter and wider in every chorus) and the de-demoned voices (the
hero's strike HEY is now a real recorded shout, the death groan only a semitone down).*

## How to listen (about 20 minutes)

- Use `npm run dev`, then open `http://localhost:5173/?<query>`. The licensed recording must be in
  `assets/audio/licensed/`. Without it you hear the synth placeholder, and this list does not apply.
- Listen twice: once on **headphones**, then on a **TV or Bluetooth speaker**. Small speakers change the answers
  for the sub-heavy items (13, 16, 20).
- Add `&autoplay=1` for a hands-free run, so you can just listen. Play it yourself too, because some items depend on
  your own timing.
- Add `&debug=1` to see the song/beat readout. "Bar n" is the edit's bar: bar n starts on beat 4(n−1). Every
  `start=` below is a checkpoint, and the music starts one bar earlier as the count-in.
- Write a verdict for each item: **good / meh / bad**, plus one line on what you heard. "Bad" items go to the next
  audio pass.

## Acts 1–2 (carried over from iteration 3, updated)

| # | Where | Listen for | Good sounds like |
|---|---|---|---|
| 1 | `?coldopen=1`, the first 8 bars, then `?start=32&autoplay=1&skip=none` (the lazy bot misses every reward) | **Changed (iteration 6):** the crowd starts at 14, so the record plays full-range from beat 0 and the booth is now the *cost* of misses. Listen to the start, then to the booth closing as misses pile up | The start sounds like the record, full and punchy. The booth after misses sounds like an old cinema: charming and deliberate. **Bad:** the booth sounds like a broken speaker or a bug |
| 2 | `?start=32&autoplay=1`, verse 1 | The booth opening up as the crowd climbs | You feel "I did that": fuller low end and width, bar by bar, with no jumps or zipper noise |
| 3 | `?start=80&autoplay=1`, the chorus-1 downbeat (beat 88) | A lift on the drop, even before FULL HOUSE | The chorus hits harder than the pre-chorus |
| 4 | same run, FULL HOUSE (~bar 23–25) | The cheer swell, cowbell and claps coming up | Exciting and "the band got bigger", with Croce's vocal still on top. **Bad:** clutter, or the vocal masked |
| 5 | `?start=96&autoplay=1`, a 20+ combo | Perfect bells ping-ponging up the chord | A jukebox answering the band. **Bad:** a music box on top of the record, or bells out of tune with the chords |
| 6 | `?start=64&autoplay=1&skip=none` (the lazy bot misses every reward) | The miss thunk + the film snag (a pitch sag) three times in a row | Funny, and clearly "you missed". **Bad:** seasick, or it reads as a playback glitch |
| 7 | `?start=32&autoplay=1` (bars 13–20) and `?start=164&autoplay=1` (bars 44–47, stop-time) | Your strike/smash in the holes of the record | Your hit is **the** sound in each hole, landing on the beat |
| 8 | `?start=120&autoplay=1`, the act seam at bar 34 | FULL HOUSE falling to the verse cap as act 2 starts | Reads as a scene change, not a penalty |
| 9 | `?start=132&autoplay=1` (thrown bottles) and `?start=196&autoplay=1` (the firebomb on 201) | **NEW:** each thrown bottle's falling **whistle** (B→E) starts a beat before it arrives, and the firebomb has its own fluttering **whoosh** | You hear it coming a beat early, and whistle ("bat it") vs whoosh ("hop it") is obvious without looking. The bottle **smash** on a stumble, and the firebomb's **FWOOMP** + crackle when it lands |
| 10 | `?start=196&autoplay=1`, bar 51 b3 (beat 202) | **NEW:** the **window crash** of the Heave through the glass | A big pane exploding with shards raining after, landing on the HEY. It should feel like the payoff of Hup-Hup-HEY |
| 11 | `?start=220&autoplay=1` (the Lanes) | **NEW:** the bowling-ball **rumble** (an E hum swelling a beat before each ball), **pin scatter** on pin smashes, and the four giant pins = a **STRIKE** crash (bar 58, beats 228–231) | The rumble is a telegraph you feel, and it clears out of the way on the beat. Pins clatter without chattering over the vocal. The walkdown's four STRIKEs escalate. **Bad:** the rumble smears the kick/bass, or pins turn into noise |
| 12 | anywhere, on a Bluetooth speaker | Latency | The game does not feel late. If it does, note how far off `[` / `]` had to go |

## Act 3 (new)

| # | Where | Listen for | Good sounds like |
|---|---|---|---|
| 13 | `?start=256&autoplay=1`, bar 68: **THE HUSH + THE BREAK SHOT** (beats 270.95–272) | One beat before the drop, the record collapses into a tinny mono horn (−11 dB). The dry **cowbell** keeps ticking (at a high crowd). Your break on the fill's last tom (271.65) is a **KRAK**: cue crack, rack exploding, lamp glass, then the audience **gasps**. On 272 the full record **slams back** with a crowd roar | A deliberate "stop-time" breath: the room holds its breath, your shot is the only thing, then the drop hits like a wall. **Bad:** reads as a dropout, the KRAK flams against the tom (late), a click at the squeeze or the release, or the drop feels *smaller* than before |
| 14 | `?start=256&autoplay=1&miss=271.65` | The break **missed**: the hush still happens, then the rack caves in on its own (a wood crack + thud, no gasp) | Clearly a letdown next to #13, but not an error sound |
| 15 | `?start=272` (die once, or just start there) | The retry: the count-in replays the fill **and the hush**, with no KRAK (the break is before the checkpoint) | Still sounds intentional. **Note:** if the KRAK-less hush feels empty, say so; we can play the collapse there |
| 16 | `?start=272&autoplay=1`, bars 69–74: **SIGN FALLS** | Each BIG JIM letter: a steel **creak** on its downbeat, then a **slam** + tube pops + a dying neon fizz on the next beat. The slams' metal clang walks **down E–D–C#–B–A–G**, a chord tone of each bar | Musical: the slams sit on the backbeats like extra drums, and the falling line is felt, not noticed. The skylight burst on 273 lands with the first slam. **Bad:** clutter over the HEYs (277/278, 286), boomy subs on a TV, or the pitch line sounding out of tune |
| 17 | same run, beat 300 → `?start=304&autoplay=1` | The penthouse **glass wall** caving in (300), then Big Jim's **bluff roar** on the held B (304), a bark then a long roar | A huge shatter that doesn't hurt. A roar that is menacing and comic, sitting under the band's held note |
| 18 | `?start=304&autoplay=1`, beats 309–310 | Big Jim's **fist slams** (E1 sub, escalating) | Earth-shaking on headphones, still present on a laptop. **Bad:** the sub swamps the bass line, or the fists disappear on small speakers |
| 19 | `?start=304&autoplay=1` (317) and `?start=320&autoplay=1` (325) | The two **lens cracks** on the HEY answers, escalating: a crack + web + a chrome ring on E, then a full burst ringing on B | Each crack is the "prize" of its Hup-Hup-HEY, and the second is clearly bigger. **Bad:** the first is too quiet to notice |
| 20 | `?start=320&autoplay=1`, 333–335 | The usher's **marquee clanks** (three, up the E triad) | A small, bright detail, and in tune |
| 21 | `?start=320&autoplay=1`, **THE FINAL HIT (340) → the poster** | The record's gang HEY + crash + stomps with our layers: the **iris slam** (an iron clang on E, just under the record's hit), the **mega cheer** erupting half a beat later, the **film snapping and flapping** off the reel (341), then **curtain-call applause** that keeps going as the music fades and the results poster comes up | HUGE, and still clean: the HEY and the crash stay on top, with no crunch or distortion and no "squashed" pumping. The applause carries you into the poster and thins out (about 9 s). **Bad:** distortion on the hit, the iris masking the HEY, the cheer too early or late, or the applause too loud or too long over the poster |
| 22 | a full run from `?coldopen=1` to the poster, on the TV | Overall loudness through act 3 | No section jumps out as louder or harsher than chorus 1. Act 3's SFX sit "just under the record" |

## Iteration 6 (new): the record from beat 0, tokens that sing, WHEW, canisters, goons, the poster

| # | Where | Listen for | Good sounds like |
|---|---|---|---|
| 23 | `?start=80&autoplay=1`, chorus 1 (bars 23–31) | **Tokens sing the melody.** Each token you collect plays a note of Croce's vocal line two octaves up in a bright honky-tonk piano with a little bell on top. Where he bends a note, the token plays a harmony note instead | You recognise the tune in the pickups, like Castle Rock's lums. It sits under the vocal and answers it. **Bad:** it sounds out of tune against his voice, random, or like a music box on top of the record |
| 24 | `?start=16&autoplay=1` (verse 1) and `?start=132&autoplay=1` (verse 3) | Tokens in the talky verses. About 40 % double the singer; the rest play harmony | Still musical over a speech-like vocal. **Bad:** the doubled notes make his natural pitch drift sound "off" (if so: we can set the verses to harmony only) |
| 25 | `?coldopen=1` bars 1–4 (no vocal) and `?start=236&autoplay=1` (the breakdown, bars 61–68) | Tokens between sung phrases: they climb and fall through the band's chord | A pleasant arpeggio that follows the chords. **Bad:** a random ding |
| 26 | play it yourself, land a jump with your toes on a pit's far lip (or `?sloppy=1&autoplay=1` and wait for a "WHEW!") | **WHEW:** a quick audience gasp on the near-miss, then a rising "ooOOH" that swells into a short cheer on the next beat | Tension, then relief: "they saw that". **Bad:** the gasp sounds like a hiss or wind, or the cheer feels like a reward for sloppy play |
| 27 | the film canisters: bar 43 (act 2, `?start=164`) and bar 79 on Big Jim's shoulder (`?start=304`), taking the high route | **Canister pickup:** a tin lid clank, the reel spinning up and a glass arpeggio of the band's chord | A treasure "you found it!" that is clearly different from a token. In tune with the chord |
| 28 | `?start=80&autoplay=1` (strike the goons) and `?start=120&autoplay=1` (the turnaround, bars 32–33) | **Goons:** strike a goon and its part (the stomps, cowbell or gang HEY) jumps out of the mix for a beat, with its stinger (a bass-drum boom, a cowbell double, a piano glissando) on the part's next hit | The world plays the song and you knocked a player out: a flourish, on the beat. **Bad:** a volume jump that reads as a glitch |
| 29 | finish a clean run (`?autoplay=1`) → the poster | **Replaced by items 32–33** (iteration 7: the stings are split and land on the picture) | |
| 30 | finish a sloppy run → the poster | **Replaced by item 34** (a finisher is never billed D any more) | |
| 31 | a full run from `?coldopen=1` | Overall loudness now that the run starts at 14 | The first 30 s don't feel quieter or thinner than the choruses by much (intro −15.2 LUFS vs chorus −13.2) |

## Iteration 7 (new): stings on the picture, tokens that answer, the SLIM sign, the colour reel, the canister glints

| # | Where | Listen for | Good sounds like |
|---|---|---|---|
| 32 | `?start=320&autoplay=1`, the final hit → **THE END** | The iris slams shut ~1 s after the hit and "THE END" burns in: the projector runs the leader out under a piano run + a tremolo E chord, **with** the card (not 2 s later over black) | The flourish IS the title card: it starts as the iris closes. **Bad:** it feels early (over the white-out) or late (after the card is up) |
| 33 | same run, ~5 s after the hit → **the rank stamp** | The stamp's **thump** + the pianist's chord stab land exactly as the stamp slams onto the poster, then the house reacts (S roar, A cheer, B/C applause) and the curtain-call applause swells or settles to the billing | One hit: you SEE and HEAR the stamp together. **Bad:** a flam between the thump and the slam, or the reaction before the stamp |
| 34 | finish a struggling run (`?jitter=160&late=0.2&autoplay=1`, or play badly and finish) → a **C** | **C is warm:** a soft rolled E6/9 chord, a music-box E on top, real applause that keeps going (no "wah wah", no lone claps) | "Good show, come back": kind, never a joke. The flop is gone for finishers |
| 35 | `?start=80&autoplay=1` (chorus 1), `?start=272&autoplay=1` (chorus 4) | **The tokens sing the hook** ("Bad, bad Leroy Brown") on the singer's syllables, and the extra tokens between syllables (jump arcs, held notes) **answer** with a different chord note instead of repeating his note a triplet late | The tune in the pickups, in time with him; the in-between pickups sound like a pianist filling. **Bad:** any flam / "echo" of his syllable, or answers that sound random |
| 36 | `?start=164&autoplay=1`, bars 44–45 (the roof's stop-time) | **The SLIM sign:** each stop-time strike makes a neon letter flicker on: a relay CLUNK + the tube buzzing up to a steady hum, the four letters climbing the chord (A, C#, E, G) | Satisfying and in tune: "you rewrote the sign". **Bad:** a mains hum that sounds like a fault, or the buzz fighting the record |
| 37 | `?coldopen=1` or `?start=0&autoplay=1`, beat 15 (the first HEY) | **The colour reel:** rising air into the HEY and a soft bloom on it (glass bells up the E chord + the house going "aaah") as the film floods to colour | Subtle magic: the room lights up with the picture. **Bad:** a cheesy whoosh, or it masks the record's HEY |
| 38 | `?start=32&autoplay=1` (canister 1 at the chimney, beat 43) and `?start=164` (170) | **The canister glints:** four tiny glass "tings" climbing the chord on the 4 beats before the held jump's takeoff; if you run under it, a falling "ting-ting" ("up there…"); quiet once found | A treasure whisper that makes you look up. **Bad:** you can't hear it at all, or it clutters the tokens |

## Iteration 9 (new): the chorus lift, the real strike HEY, the softer groan

| # | Where | Listen for | Good sounds like |
|---|---|---|---|
| 39 | `?start=80&autoplay=1`, beats 87–89 (into chorus 1) and 119–122 (out into the tag) | **The chorus lift:** over the beat before the chorus downbeat the whole record swells ~2.5 dB louder, a touch brighter and wider, full ON the downbeat; after the chorus it eases back over one beat | "The band leans in": the chorus is clearly bigger than the verse, without you noticing a fader. **Bad:** a jump or a swell you hear as a volume ride, pumping/breathing on the drums, crunch on the snare/cowbell (the lift's clip), or the tag feeling like a drop-out |
| 40 | a full run, verses 1 and 3 (`?start=32&autoplay=1`, `?start=132&autoplay=1`) | **The verses are 1 dB quieter than before** (the lift's headroom) | The verses still feel full and punchy; your SFX sit a hair more forward. **Bad:** the verses feel limp or small next to the choruses |
| 41 | `?start=256&autoplay=1`, beat 272 (the drop after THE HUSH) | Chorus 4 **steps** into the lift ON the drop (no ramp through the hush) | The drop hits even harder than before (+17.5 dB from the hushed record). **Bad:** a click on the drop, or the hush sounding less deep |
| 42 | `?start=96&autoplay=1&miss=98` (die inside chorus 1) | The respawn count-in + rewind inside a chorus: the music comes back AT the chorus level | No swell from quiet to loud after the respawn, no jump |
| 43 | `?start=32&autoplay=1` (the strikes in bars 13–20) and any chorus | **The hero's strike HEY** is now a real man's shout, four takes alternating (never the same one twice running), short and dry, with the audience's gang behind it | A person, not a machine: natural pitch, varied, bright, ON the beat with the swing. **Bad:** still "demonic" (a growl, a pitch stack), a machine-gun of one sample, too loud or too present over Croce, or a flam against the snare |
| 44 | `?start=196&autoplay=1` (the Heave through the window, beat 202) | The **Heave's roar**: the hero's HEY + the whole house, ~2 dB bigger than a strike | A crowd shouting WITH you. **Bad:** harsh, or a wall of noise |
| 45 | die anywhere (e.g. `?start=96&autoplay=1&miss=98`) | **The death groan** is now only a semitone below the "ooh" (it was 4.3 st down) | A disappointed audience "ohhh". **Bad:** still slowed-down / demonic, or now too cheerful |

## Measured (offline, clean player at FULL HOUSE): what each item should roughly be

Levels are momentary loudness vs the music under the sound. Commands:
`node src/audio/lab/mixlab.mjs --prefix=act` → `tools/music/stage_report.py`.

- **The hush (13):** the record −11.3 dB (lows −29, horn band −8.5, highs −12.6). The KRAK is +8.8 dB over the
  hushed record (≈ the un-hushed record's level). The drop comes back +15.3 dB. No clicks at either edge
  (HF −103 dBFS). The full range is back ≈ at the release beat 271.95, before the drop's kick.
- **Letters (16):** slams −3 to −8 dB, creaks −5 to −11 dB.
- **Big Jim (17–18):** bluff −2.6 dB, fists −3.8 dB (+7..11 dB in the 63 Hz band: check on a TV).
- **Lens cracks (19):** 2nd crack −7 dB. The first crack was −9 dB and has since been raised 3 dB.
- **Glass wall (17):** −8 dB.
- **Finale (21):** +1.8 LU louder on the hit than the record alone. Our stack is −3.7 dB under the baked hit.
  Limiter max 2.7 dB on the hit (2.0 for the record alone, 2.5 with just your strike + bell). True peak −0.5 dBTP.
  The tail: −11 LUFS at 340 → −20 at 347 (the poster) → −28 at 355.
- **Act 2 (9–11):** the whistle/whoosh are −4 dB (+4 dB in their 1 kHz band: they should cut through), the rumble
  −8 dB, pins −12 dB (giant pins −8), the window crash −5 dB.

- **Iteration 6** (`node src/audio/lab/mixlab.mjs --prefix=feel` → `tools/music/feel_report.py`):
  - **The start (1, 31):** crowd 14 intro −15.2 LUFS (the old start at 8: −16.9; at 12: −15.7), −2.3 dBTP, no
    limiting. Verse 1 at 14 with bells −13.4 LUFS, limiter max 0.2 dB. At 14 the stomps sit −3.7 dB under the record
    (63 Hz) and the shouts +3.4 dB in the gaps.
  - **Tokens (23–25):** −10 dB under the music at each token (−3 to −6 dB in its own band), exactly on the grid. The
    real level's tokens against the singer's measured pitch: act 1 has 31 % doubled, the rest consonant harmony or
    chord tones, and 1.5 % rub (60–200 cents from him). Act 3: 6 %, mostly the outro ad-libs. The chorus scene: 0 %.
    The chorus mix gains +0.3 LU, and the limiter stays at FULL HOUSE levels (1.3 % of blocks > 0.5 dB, max 1.2 dB).
  - **WHEW (26):** the gasp and the relief are each −9 dB vs the music (−1 dB in their 1.4 kHz band).
    **Canister (27):** −7 dB (+1 dB in its band).
  - **Goons (28):** the stingers are −10 dB median. The flare adds +5 dB on the stomps and shouts. The cowbell only
    gets +1.5 to +4 dB, because its bus clip is already hot; its tonk stinger carries it.
  - **Poster (29–30):** each sting peaks at −14 to −16 LUFS momentary. The applause 3–6 s after the poster is −27 LUFS
    for S, −31 for A and −38 for D. True peak ≤ −6 dBTP.

- **Iteration 7** (`node src/audio/lab/mixlab.mjs --prefix=polish` → `tools/music/polish_report.py`; the tokens in the REAL
  game: `node src/audio/lab/tokenprobe.mjs` on a `--dist=dist-audio` build):
  - **The ending (32–34):** in game (`stage.endingLog`, 3 bot runs) THE END sounds 0.96–1.04 s after the audio hit (the
    renderer's 0.9 s + the frame it latches the hit), the rank sting 4.91–4.99 s (stamp at 4.85 s); the stamp's thump
    lands −2..0 ms from the slam (lab). Stings (momentary max, 2.5 s): S −13.9, A −15.6, B −17.4, C −17.8 LUFS over a
    −23.4 applause bed; the curtain call 1–4 s after the stamp S −24.5, A −25.2, B −27.7, C −28.1 LUFS (C no longer
    dies away); true peak −1.7 dBTP. Bots' billing now: autoplay A, sloppy B, ±130 C.
  - **Tokens (35):** before (iteration 6 layout, autoplay + sloppy): 39 % of the singing tokens were an echo (sounding
    120 ms — one triplet — or 1/3+ beat after his syllable), chorus coverage 29–37 %. Now (the re-laid `lumSing` choruses
    + the answer rule): **0 echoes** in autoplay / sloppy / ±130 (0 of 529–654 tokens), chorus coverage 94–98 %
    (chorus 4: 83–94 %), verses 53–63 %; pickups land a median 13–23 ms early (sloppy chorus 4: 3 ms); 7 % (autoplay) / 15–19 %
    (±130 / sloppy) come ≤ 40 ms after their beat (sung at once, fused), 0.4 / 2–3 % later (grid / at once: answers). Pitch vs the singer (lab, pYIN): rubs act 1 1.2 %, the
    chorus scene 0 %, act 3 11.8 % (8 of 68: mostly the outro ad-libs and the lane's own doubles where he scoops; answers
    0 of 43 in act 1, 2 of 32 in act 3). Level unchanged: −10.4 dB under the music, chorus mix +0.2 LU.
  - **The sign (36):** each letter −9 dB vs the music (−8.3 max), −4 to −9 dB in its band; no limiting.
  - **The colour reel (37):** whoosh −14 dB (−1.5 dB in its 4 kHz band: heard as air), bloom −14 dB; beats 13–19
    −14.2 LUFS, no limiting, −2.3 dBTP.
  - **Glints (38):** −18 dB vs the music (up to +2 dB in their 1.4–2.8 kHz band: a sparkle, not a line), the tease
    −16 dB.

- **Iteration 9** (`node src/audio/lab/mixlab.mjs --prefix=chorus` → `tools/music/chorus_report.py`; `--prefix=hey` →
  `tools/music/hey_report.py`):
  - **The chorus lift (39–42)**, music only at crowd 14 (LUFS; before the lift in brackets): intro −17.6 (−16.6),
    verse 1 −15.2 (−14.2), pre-chorus −15.0 (−14.0), **chorus 1 −12.3 (−14.1)**, tag −16.3 (−15.5); verse 3 −15.8
    (−14.8), pre-chorus −14.9 (−14.0), **chorus 3 −11.6 (−13.4)**, tag −15.3 (−14.6); breakdown −16.1 (−15.1), **chorus 4
    −11.0 (−12.8)**, tag −15.7 (−15.0), outro −16.1 (−15.1). Chorus over the section before it: +2.7 / +3.3 / +5.1 LU
    (before: −0.1 / +0.6 / +2.3). Width +1 dB side/mid in the choruses. The lift's half-way points land 0.5 beat before
    the downbeat and 0.5 beat after the end (chorus 4 steps ON 272). The whole mix at FULL HOUSE with a bell every beat:
    choruses −10.7 / −10.0 / −9.3 LUFS; limiter > 0.5 dB on 0.7 / 2.0 / 5.2 % of 10 ms blocks (before 2.0 / 3.1 / 4.3),
    beat-locked GR 0.14 / 0.22 / 0.34 dB (before 0.24 / 0.33 / 0.44): less pumping than before. The lift's soft clip
    shaves > 0.5 dB on 0.06 % of samples at crowd 14 and 0.45 % at FULL HOUSE (the stacked overlay + snare peaks), the
    shaved energy −25 dB re the music (listen for crunch here: item 39). True peak ≤ −0.28 dBTP except chorus 4's synth
    strike bursts (+0.08). Tone test through every ramp and the drop's step: no clicks. The hush: −12.0 dB, the KRAK +9.8
    dB over it, the drop +17.5 dB; the finale +1.8 LU on the hit, limiter max 0.6 dB (was 2.7).
  - **The strike HEY (43–44)**, chorus 1 at FULL HOUSE: hero + gang −24.8 LUFS momentary (the old synth −23.2),
    centroid 2.6 kHz (old 1.7), low-mids 8 dB under presence (old 4 dB over), silent 0.35 s after the beat (−35 dB), the
    vowel on the beat ±2 ms (old +5..+17 ms), −5.7 dB under the music in 1–4 kHz (old −10.6); the roar −20.7 (old
    −22.7). **Groan (45):** playback rate 0.78 → 0.94.

Things the numbers cannot tell you: whether the hush reads as "on purpose", whether the letters' pitch line is
musical, whether the finale feels *huge* rather than just loud, and whether any of this is fun.
