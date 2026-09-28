/**
 * Input: keyboard + Gamepad API -> a queue of TIMESTAMPED button edges.
 *
 * Timestamps (performance.now() ms) matter for a rhythm game: the Game converts each edge
 * to song time via the Conductor and applies it on the exact fixed simulation step it
 * belongs to (instead of "whenever the next frame happens"), and uses them to measure
 * the player's timing accuracy against the beat.
 */
export type Button = 'left' | 'right' | 'down' | 'jump' | 'strike' | 'start' | 'pause' | 'latUp' | 'latDown' | 'debug';

export const BUTTONS: readonly Button[] = ['left', 'right', 'down', 'jump', 'strike', 'start', 'pause', 'latUp', 'latDown', 'debug'];

export interface InputEdge {
  button: Button;
  down: boolean;
  /** performance.now() timebase, ms */
  time: number;
}

const KEYMAP: Record<string, Button> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyZ: 'jump',
  KeyK: 'jump',
  KeyX: 'strike',
  KeyJ: 'strike',
  Enter: 'start',
  Escape: 'pause',
  KeyP: 'pause',
  BracketRight: 'latUp',
  BracketLeft: 'latDown',
  Backquote: 'debug',
  F1: 'debug',
};

/** Standard-mapping gamepad button indices -> game buttons. */
const PAD_BUTTONS: [number, Button][] = [
  [0, 'jump'], // A / Cross
  [3, 'jump'], // Y / Triangle
  [2, 'strike'], // X / Square
  [1, 'strike'], // B / Circle
  [7, 'strike'], // RT
  [6, 'down'], // LT
  [12, 'jump'], // dpad up
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
  [9, 'start'],
  [8, 'pause'],
];
const STICK_DEAD = 0.45;

export class Input {
  private queue: InputEdge[] = [];
  /** device-level held state (union of keyboard + all pads) */
  private keyHeld = new Set<Button>();
  private padHeld = new Map<Button, boolean>();
  /** any key/button/click this frame (for "press any key" screens) */
  anyPressed = false;
  /** listeners fired synchronously inside the DOM event (needed for audio unlock gestures) */
  private gestureListeners: (() => void)[] = [];

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const b = KEYMAP[e.code];
      if (b) e.preventDefault();
      if (e.repeat) return;
      this.anyPressed = true;
      this.fireGesture();
      if (!b) return;
      if (!this.keyHeld.has(b)) {
        this.keyHeld.add(b);
        this.queue.push({ button: b, down: true, time: e.timeStamp || performance.now() });
      }
    });
    target.addEventListener('keyup', (e) => {
      const b = KEYMAP[e.code];
      if (!b) return;
      e.preventDefault();
      if (this.keyHeld.delete(b)) this.queue.push({ button: b, down: false, time: e.timeStamp || performance.now() });
    });
    target.addEventListener('pointerdown', () => {
      this.anyPressed = true;
      this.fireGesture();
    });
    target.addEventListener('blur', () => {
      // Release everything so keys don't stick when focus is lost.
      const t = performance.now();
      for (const b of this.keyHeld) this.queue.push({ button: b, down: false, time: t });
      this.keyHeld.clear();
    });
  }

  /** Register a callback run inside a user-gesture event (AudioContext.resume needs this). */
  onGesture(fn: () => void): void {
    this.gestureListeners.push(fn);
  }

  private fireGesture(): void {
    for (const fn of this.gestureListeners) fn();
  }

  /** Poll gamepads (call once per animation frame, before draining). */
  pollGamepads(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const now = performance.now();
    const state = new Map<Button, boolean>();
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      for (const [i, b] of PAD_BUTTONS) {
        if (pad.buttons[i]?.pressed) state.set(b, true);
      }
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (ax < -STICK_DEAD) state.set('left', true);
      if (ax > STICK_DEAD) state.set('right', true);
      if (ay > STICK_DEAD + 0.1) state.set('down', true);
    }
    for (const b of BUTTONS) {
      const was = this.padHeld.get(b) ?? false;
      const is = state.get(b) ?? false;
      if (is !== was) {
        this.padHeld.set(b, is);
        // Don't emit a pad edge if the keyboard already holds this button (and vice versa).
        if (!this.keyHeld.has(b)) this.queue.push({ button: b, down: is, time: now });
        if (is) {
          this.anyPressed = true;
          this.fireGesture();
        }
      }
    }
  }

  isHeld(b: Button): boolean {
    return this.keyHeld.has(b) || (this.padHeld.get(b) ?? false);
  }

  /** Take all edges queued since the last drain (chronological). */
  drain(): InputEdge[] {
    const q = this.queue;
    this.queue = [];
    q.sort((a, b) => a.time - b.time);
    return q;
  }

  endFrame(): void {
    this.anyPressed = false;
  }
}

/**
 * The per-simulation-step control state the player controller reads. Produced either
 * from human input edges or from the autoplay bot — the controller can't tell the difference.
 */
export class Controls {
  left = false;
  right = false;
  down = false;
  jump = false;
  strike = false;
  /** edges, valid for exactly one simulation step */
  jumpPressed = false;
  jumpReleased = false;
  strikePressed = false;
  downPressed = false;
  /** song time of the edge that produced *Pressed this step (for timing stats), NaN if none */
  jumpPressTime = NaN;
  strikePressTime = NaN;
  downPressTime = NaN;

  apply(button: Button, down: boolean, songTime: number): void {
    switch (button) {
      case 'left':
        this.left = down;
        break;
      case 'right':
        this.right = down;
        break;
      case 'down':
        if (down && !this.down) {
          this.downPressed = true;
          this.downPressTime = songTime;
        }
        this.down = down;
        break;
      case 'jump':
        if (down && !this.jump) {
          this.jumpPressed = true;
          this.jumpPressTime = songTime;
        }
        if (!down && this.jump) this.jumpReleased = true;
        this.jump = down;
        break;
      case 'strike':
        if (down && !this.strike) {
          this.strikePressed = true;
          this.strikePressTime = songTime;
        }
        this.strike = down;
        break;
      default:
        break;
    }
  }

  clearEdges(): void {
    this.jumpPressed = this.jumpReleased = this.strikePressed = this.downPressed = false;
    this.jumpPressTime = this.strikePressTime = this.downPressTime = NaN;
  }

  reset(): void {
    this.left = this.right = this.down = this.jump = this.strike = false;
    this.clearEdges();
  }
}
