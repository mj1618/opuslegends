/**
 * Background: kept as the tiny handle Game talks to (`background.pulse` from level `fx: 'bgPulse'` cues).
 * The real backgrounds are the art lab's parallax scenes, owned by the renderer's Stage (render/stage.ts);
 * the renderer's Director turns `pulse` into a light bloom.
 */
export class Background {
  /** 0..1 extra flash (fx 'bgPulse'), decayed by Game */
  pulse = 0;

  constructor(_seed: number) {}
}
