/**
 * Owns the AudioContext and the mixer buses (master -> music / sfx).
 * The context is created eagerly but can only start running after a user gesture
 * (the title screen's "press to start"), unless the browser's autoplay policy allows it
 * (headless playtests launch chromium with --autoplay-policy=no-user-gesture-required).
 */
export class AudioSystem {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly music: GainNode;
  readonly sfx: GainNode;
  private muted: boolean;

  constructor(muted: boolean) {
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music.gain.value = 0.9;
    this.sfx.gain.value = 0.7;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.muted = muted;
    this.master.gain.value = muted ? 0 : 1;
  }

  get running(): boolean {
    return this.ctx.state === 'running';
  }

  /** Call from inside a user-gesture handler. Safe to call repeatedly. */
  unlock(): Promise<void> {
    if (this.ctx.state === 'running') return Promise.resolve();
    return this.ctx.resume().catch(() => undefined);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.01);
  }

  get isMuted(): boolean {
    return this.muted;
  }
}
