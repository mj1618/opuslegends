# Audio listening checklist (for a human)

*The audio engineer's list. Every item was measured offline (the mix lab), but nothing has been heard. It replaces
the 10-item list in `docs/reviews/iter3.md` ("A human must listen for"), updated for iteration 4: act 2's own
mechanic sounds, the act-3 sound set, THE HUSH before the drop, and THE FINALE on the final hit.*

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
| 1 | `?coldopen=1`, the first 8 bars | The projection booth. The crowd now starts at 8, so it is thinner but not the full horn | An old cinema's sound, charming and deliberate. **Bad:** sounds like a broken speaker or a bug |
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

Things the numbers cannot tell you: whether the hush reads as "on purpose", whether the letters' pitch line is
musical, whether the finale feels *huge* rather than just loud, and whether any of this is fun.
