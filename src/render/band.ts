/**
 * THE GOON BAND (iteration 6, review iter5 fix 4 — Castle Rock's enemy band): goons PLAYING THE RECORD just behind the
 * play band, each one on its own beat-map lane (render/music.ts MusicFeed.lane):
 *
 *   cowbell goon  clanks on every hit of the `cowbell` overlay (the chorus cowbell: from the first chorus on)
 *   stomper       knee up over the gap, SLAMS on every `stomps` hit
 *   sax goon      leans back and blows through each of the song's `hooks` (the title line, the tag)
 *   pianist       an upright honky-tonk piano, pounding the `piano` accents (the bar, and the pool room)
 *
 * They stand on the floor line behind the lip (their feet hidden by it) at parallax 0.92, one about every 3 beats of
 * run, so one or two are in view at a time. Pure scenery: hazed, lit by the scene, never red, never gold. Hidden over
 * pits and where the act has no floor to stand on (the facade climb, the penthouse, the theatre).
 * Art: art/grindhouse/jammers.ts drawMusician.
 */
import type { BeatInfo } from '../art/core/beat';
import { css, hex, mix } from '../art/core/color';
import { hash } from '../art/core/math';
import { drawGlow } from '../art/core/draw';
import { type JammerColours, type MusicianKind, type MusicianTiming, drawMusician } from '../art/grindhouse/jammers';
import { type Lighting, lit } from '../art/world/lighting';
import { VIEW_H, VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import type { Camera } from './camera';
import type { MusicFeed } from './music';

const F = 0.92;
const LANE: Record<MusicianKind, string> = { cowbell: 'cowbell', stomp: 'stomps', piano: 'piano', sax: 'hooks' };
const VEST: Record<MusicianKind, string> = { cowbell: '#3E5A5E', stomp: '#5E2B4E', piano: '#6B4A34', sax: '#8A7A5A' };
const NO_BAND = new Set(['facade', 'penthouse', 'theatre']);

/**
 * which part the band member in slot k plays: the busiest part around the beat the hero passes him (the pianist where
 * the piano plays, the cowbell where the cowbell overlay plays, the sax on a hook, stomps otherwise) — so the goon you see
 * is the part you hear. (Same idea as audio/goonParts.ts goonPartAt.)
 */
function kindFor(feed: MusicFeed, beat: number, k: number): MusicianKind | null {
  if (hash(k * 13 + 7) < 0.2) return null;
  const a = beat - 4;
  const b = beat + 4;
  if (feed.laneSpan('hooks', beat, beat + 1).covers || feed.laneSpan('hooks', beat - 2, beat + 2).n > 0) return 'sax';
  const piano = feed.laneSpan('piano', a, b).n * 3;
  const cow = feed.laneSpan('cowbell', a, b).n * 1.5;
  const stomp = feed.laneSpan('stomps', a, b).n;
  if (piano >= cow && piano >= stomp && piano > 0) return 'piano';
  if (cow >= stomp && cow > 0) return 'cowbell';
  return stomp > 0 ? 'stomp' : null;
}

export class GoonBand {
  /** the floor line they stand on (world y, damped so steps don't make them jump) */
  private floorY = NaN;
  /** debug: members drawn last frame */
  drawn = 0;

  draw(
    g: CanvasRenderingContext2D,
    game: Game,
    cam: Camera,
    feed: MusicFeed,
    b: BeatInfo,
    envAt: (x: number) => string,
    lightFor: (env: string) => Lighting,
    dt: number,
  ): void {
    const L = game.level;
    const z = cam.rzoom;
    this.drawn = 0;
    const fy = L.surfaceYNear(game.player.x);
    if (!Number.isNaN(fy)) this.floorY = Number.isNaN(this.floorY) ? fy : this.floorY + (fy - this.floorY) * Math.min(1, dt * 6);
    if (Number.isNaN(this.floorY)) return;
    const SP = 3 * L.ppb * F;
    const cx = cam.rx * F;
    const hw = VIEW_W / 2 / z + 300;
    const ys = VIEW_H / 2 + (this.floorY + 14 - cam.ry) * z;
    if (ys < 0 || ys > VIEW_H + 200) return;
    for (let k = Math.floor((cx - hw) / SP); k <= Math.floor((cx + hw) / SP); k++) {
      const lx = k * SP + hash(k + 3) * SP * 0.4;
      const sx = VIEW_W / 2 + (lx - cx) * z;
      if (sx < -200 || sx > VIEW_W + 200) continue;
      const wx = cam.rx + (sx - VIEW_W / 2) / z;
      const env = envAt(wx);
      if (NO_BAND.has(env)) continue;
      // the beat at which the hero passes this member (the camera centre crosses him: cam.x = lx / F, lead ~0.28 screen)
      const passBeat = (lx / F - (0.28 * VIEW_W) / z) / L.ppb;
      const kind = kindFor(feed, passBeat, k);
      if (!kind) continue;
      // stand only where there's floor at about this height (not over a pit / a drop)
      const here = L.floorYAt(wx);
      if (Number.isNaN(here) || Math.abs(here - this.floorY) > 60) continue;
      const Lt = lightFor(env);
      const body = lit(Lt, hex('#2A2024'), 0.55, 0.1);
      const C: JammerColours = {
        body: css(body),
        skin: css(lit(Lt, hex('#9A7462'), 0.7, 0.1)),
        rim: css(mix(body, Lt.rim, 0.85), 1),
        vest: css(lit(Lt, hex(VEST[kind]), 0.9, 0.1)),
      };
      const t = feed.lane(LANE[kind]);
      const m: MusicianTiming = { hit: Number.isFinite(t.since) ? Math.exp(-(t.since * b.spb) / 0.12) : 0, since: t.since, gap: t.gap, active: t.active };
      this.drawn++;
      const dir = kind === 'piano' ? 1 : hash(k + 5) < 0.5 ? 1 : -1;
      const sc = z * (kind === 'piano' ? 1.1 : 1.15);
      // his own little stage light: a soft cone + a pool on the floor (the band is ON)
      g.save();
      g.globalCompositeOperation = 'lighter';
      const cone = g.createLinearGradient(0, ys - 420 * sc, 0, ys);
      cone.addColorStop(0, 'rgba(255,233,196,0)');
      cone.addColorStop(1, `rgba(255,233,196,${0.07 + 0.08 * Math.max(m.hit, m.active)})`);
      g.fillStyle = cone;
      g.beginPath();
      g.moveTo(sx - 30 * sc, ys - 420 * sc);
      g.lineTo(sx + 30 * sc, ys - 420 * sc);
      g.lineTo(sx + 110 * sc, ys);
      g.lineTo(sx - 110 * sc, ys);
      g.closePath();
      g.fill();
      g.restore();
      // the part LIGHTS UP when it plays: a warm pop behind the instrument (cream, never gold)
      const pop = kind === 'sax' ? m.active * (0.5 + 0.5 * Math.exp(-(b.beatPhase * 2 % 1) * 4)) : m.hit;
      if (pop > 0.03) {
        const ix = kind === 'piano' ? 60 : kind === 'stomp' ? 14 : 36;
        const iy = kind === 'stomp' ? -10 : kind === 'piano' ? -110 : -150;
        drawGlow(g, sx + ix * dir * sc, ys + iy * sc, '#FFE9C4', 120 * sc, 0.4 * pop);
      }
      drawMusician(g, sx, ys, sc, kind, m, b, C, dir);
    }
  }
}

/**
 * the part a goon at `beat` plays along to (the Bluffers in the play band): a shout ON the beat = a HEY goon, else the
 * busiest of piano (x3) / cowbell (x1.5) / stomps / claps (x0.9) in the 2 bars around it — the same rule as the audio's
 * audio/goonParts.ts goonPartAt, so the part you see him play is the part that flares when you smash him.
 * Returns the part and the lane that times it.
 */
export function partAt(feed: MusicFeed, beat: number): { part: string; lane: string } {
  const sh = feed.laneSpan('shouts', beat - 0.25, beat + 0.25);
  if (sh.n > 0) return { part: 'shouts', lane: 'shouts' };
  const a = beat - 4;
  const b = beat + 4;
  const c: [string, number][] = [
    ['piano', feed.laneSpan('piano', a, b).n * 3],
    ['cowbell', feed.laneSpan('cowbell', a, b).n * 1.5],
    ['stomps', feed.laneSpan('stomps', a, b).n],
    ['claps', feed.laneSpan('claps', a, b).n * 0.9],
  ];
  c.sort((x, y) => y[1] - x[1]);
  const part = c[0][1] > 0 ? c[0][0] : 'stomps';
  return { part, lane: part };
}
