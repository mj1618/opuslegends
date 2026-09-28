# Audio listening checklist (for a human)

*The audio engineer's list. Every item was measured offline (the mix lab), but nothing has been heard. It replaces
the 10-item list in `docs/reviews/iter3.md` ("A human must listen for"), updated for iteration 4: act 2's own
mechanic sounds, the act-3 sound set, THE HUSH before the drop, and THE FINALE on the final hit. Iteration 6 adds
items 23–31: the run now starts at crowd 14 (the record full from beat 0), tokens sing the melody, the near-miss WHEW,
the film canisters, the goons' flares and the poster's rank stings.*

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
| 29 | finish a clean run (`?autoplay=1`) → the poster | **Rank S sting:** a piano run and tremolo chord over the projector running out, the house cheering as the stamp lands, and louder applause | A proud "THE END" |
| 30 | finish a sloppy run (`?sloppy=1&autoplay=1`, or miss a lot yourself) → the poster | **Low-rank stings:** B polite, C a small ta-da and sparse claps, D a deflating "wah wah wah waaah", a lone clap and a cough, and the curtain-call applause dies away | Funny, not insulting. The applause level matches the billing |
| 31 | a full run from `?coldopen=1` | Overall loudness now that the run starts at 14 | The first 30 s don't feel quieter or thinner than the choruses by much (intro −15.2 LUFS vs chorus −13.2) |

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

Things the numbers cannot tell you: whether the hush reads as "on purpose", whether the letters' pitch line is
musical, whether the finale feels *huge* rather than just loud, and whether any of this is fun.
