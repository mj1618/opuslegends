/**
 * ACT 3 lab view (tab "Act 3"): the climax art on its own, driven by URL params so the screenshot harness can pose it.
 *   act3=jim       Big Jim's rig on the throne:  bluff= roar= reel= crack=L,R reflect= chain= (seconds) panic=
 *   act3=roof      the SUNSET ROOF + the BIG JIM letters:  fall=<letters fallen, fractional = mid-topple>
 *   act3=pool      the Pool Room      act3=casino  the Velvet Casino (dark=<chandeliers out 0..3>)
 *   act3=penthouse the throne room    act3=finale  the theatre pull-out (k=0..1) / iris (iris=0..1) / end (end=<s>)
 * `light=` picks the keyframe as usual (sunset / sunsetRose / dusk / poolroom / velvet / throne / houselights).
 */
import { hit } from '../core/beat';
import { drawBigJim } from '../grindhouse/bigjim';
import { drawLetterLegs, drawRoofFloor, drawSignLetter, makeRoof } from '../grindhouse/roof';
import { drawBallRack, drawBarBell, drawBench, drawFeltFloor, drawJukebox, makePoolRoom } from '../grindhouse/poolroom';
import { drawChandelier, drawChipTower, drawHeadGoon, drawRackFloor, drawRackFrame, makeCasino } from '../grindhouse/casino';
import { drawDecanter, drawGlassWall, drawPenthouseFloor, makePenthouse } from '../grindhouse/penthouse';
import { drawAuditorium, drawFilmstripFloor, drawIris, drawIrisBlade, drawMarqueeCutIn, drawTheEnd, drawVictory, screenRect } from '../grindhouse/finale';
import { drawSlim } from '../grindhouse/slim';
import { FilmPass } from '../fx/film';
import { drawTheatre } from '../grindhouse/theatre';
import type { ArtCamera } from '../world/camera';
import { layerView, pushLayer } from '../world/camera';
import type { ParallaxScene } from '../world/parallax';
import type { LabCtx } from './views';
import { beatDots } from './views';

const q = new URLSearchParams(location.search);
const num = (k: string, d = 0) => (q.has(k) ? Number(q.get(k)) : d);
const film = new FilmPass();

type Maker = (l: LabCtx) => ParallaxScene;
const scenes = new Map<string, ParallaxScene>();
export const ACT3_SCENES: Record<
  string,
  {
    make?: Maker;
    floor?: (g: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, L: import('../world/lighting').Lighting, b: import('../core/beat').BeatInfo) => void;
    world?: (g: CanvasRenderingContext2D, L: import('../world/lighting').Lighting, b: import('../core/beat').BeatInfo, t: number) => void;
  }
> = {};

ACT3_SCENES.roof = { make: (l) => makeRoof(l.light), floor: (g, r, L) => drawRoofFloor(g, r, { light: L }), world: roofLetters };

ACT3_SCENES.pool = {
  make: (l) => makePoolRoom(l.light),
  floor: (g, r, L) => drawFeltFloor(g, r, { light: L }),
  world: (g, L, b) => {
    drawBench(g, 1300, 0, 240, 0, L);
    for (const [x, f] of [
      [1800, drawBallRack],
      [2100, drawBarBell],
    ] as [number, (g: CanvasRenderingContext2D, r: number) => void][]) {
      g.save();
      g.translate(x, -120);
      f(g, 34);
      g.restore();
    }
    drawJukebox(g, 2500, 0, 0.9, L, b, 3);
  },
};
ACT3_SCENES.casino = {
  make: (l) => {
    const c = makeCasino(l.light);
    c.state.dark = num('dark', 0);
    c.state.hush = num('hush', 0);
    return c;
  },
  floor: (g, r, L, b) => drawRackFloor(g, r, { light: L }, b),
  world: (g, L, b, t) => {
    drawChandelier(g, 1500, -900, 0.9, 1, L, b, 1);
    for (let i = 0; i < 3; i++) drawChipTower(g, 1900 + i * 50, -20, 1 + i * 0.3, L, i);
    g.save();
    g.translate(2500, -150);
    drawHeadGoon(g, 70, t, 0.6);
    g.restore();
    drawRackFrame(g, 2500, 0, 1300, num('drop', 0), L, num('burst', 0));
  },
};
ACT3_SCENES.penthouse = {
  make: (l) => {
    const p = makePenthouse(l.light);
    p.state.blaze = num('blaze', 0);
    return p;
  },
  floor: (g, r, L) => drawPenthouseFloor(g, r, { light: L }),
  world: (g, _L, _b, t) => {
    g.save();
    g.translate(1800, -140);
    drawDecanter(g, 34);
    g.restore();
    g.save();
    g.translate(2400, -320);
    drawGlassWall(g, 110, t);
    g.restore();
  },
};

/** the six letters along the roof: `fall` = how many have toppled (fractional = mid-fall) */
function roofLetters(g: CanvasRenderingContext2D, L: import('../world/lighting').Lighting, b: import('../core/beat').BeatInfo, t: number): void {
  const fall = num('fall', 0);
  const word = 'BIGJIM';
  const len = 820;
  for (let i = 0; i < 6; i++) {
    const thick = word[i] === 'I' ? 260 : 520;
    const px = 900 + i * 1150 + (i >= 3 ? 400 : 0);
    const u = Math.max(0, Math.min(1.6, fall - i));
    const ang = u < 1 ? (Math.PI / 2) * u * u : Math.PI / 2 - 0.05 * Math.sin(Math.min(1, (u - 1) / 0.3) * Math.PI);
    const legTop = -260;
    drawLetterLegs(g, px, thick, legTop, 0, L);
    drawSignLetter(g, word[i], { px, py: legTop, len, thick, angle: ang, neon: u < 1 ? 1 - 0.5 * u * (0.5 + 0.5 * Math.sin(t * 60)) : 0, landedT: u >= 1 ? (u - 1) * 0.6 : NaN, time: t, light: L, b });
  }
}

export function drawAct3View(l: LabCtx): void {
  const which = q.get('act3') ?? 'jim';
  if (which === 'jim') return drawJimView(l);
  if (which === 'finale') return drawFinaleView(l);
  const def = ACT3_SCENES[which];
  if (!def?.make) return drawJimView(l);
  let sc = scenes.get(which);
  if (!sc) {
    sc = def.make(l);
    for (const id of (q.get('hide') ?? '').split(',')) if (id) sc.hidden.add(id);
    scenes.set(which, sc);
  }
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  const speed = (384 * l.sim.bpm) / 60;
  const x = (q.has('scroll') ? 0 : t * speed * l.scroll) + num('x', 0);
  const zoom = num('zoom', 0.95);
  const cam: ArtCamera = { x: x + 380, y: num('camy', -250 - 30), zoom: zoom * (1 + hit(b, 'crash', 0.2) * 0.01) };
  const w = film.weave(b);
  g.save();
  g.translate(w.x, w.y);
  sc.drawBack(g, cam, b);
  const v = layerView(cam, 1);
  pushLayer(g, v);
  if (def.floor) {
    const BLOCK = 1536;
    for (let kk = Math.floor(v.x0 / BLOCK) - 1; kk <= Math.floor(v.x1 / BLOCK) + 1; kk++) def.floor(g, { x: kk * BLOCK - 40, y: 0, w: BLOCK * 0.8 + 40, h: 700 }, sc.L, b);
  }
  def.world?.(g, sc.L, b, t);
  if (!q.has('noslim'))
    drawSlim(g, x, 0, { pose: 'run', poseTime: t, time: t, beatPhase: b.beatPhase, beat: b.beat, runPhase: x / 192, speed, vy: 0 });
  g.restore();
  sc.drawFront(g, cam, b);
  g.restore();
  if (!q.has('nofilm')) film.draw(g, b);
  drawTheatre(g, b, { standing: 22, light: sc.L });
  beatDots(g, b, 70, 40);
}

function drawJimView(l: LabCtx): void {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  const L = l.light.current;
  const bg = g.createLinearGradient(0, 0, 0, 1080);
  bg.addColorStop(0, '#07050A');
  bg.addColorStop(1, '#2A1824');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1920, 1080);
  const crack = (q.get('crack') ?? '0,0').split(',').map(Number) as [number, number];
  const cT = num('crackT', NaN);
  drawBigJim(g, num('jx', 960), num('jy', 900), num('s', 0.62), {
    time: t,
    beat: b.beat,
    bluff: num('bluff'),
    roar: num('roar'),
    reel: num('reel'),
    crack,
    crackT: [crack[0] > 0 ? cT : NaN, crack[1] > 0 ? cT : NaN],
    reflect: num('reflect', 0.6),
    blaze: num('blaze') || (num('bluff') > 0.5 ? Math.exp(-b.beatPhase * 3) : 0),
    chainT: q.has('chain') ? num('chain') : NaN,
    panic: num('panic'),
    lift: [num('liftL'), num('liftR')],
    light: L,
    throne: !q.has('nothrone'),
  });
  film.draw(g, b);
  beatDots(g, b, 70, 40);
  void drawSlim;
}

/** finale: k= pull-out (0..1) + marquee= (0..1.4) · iris= (0..1 closing) · end= (s since the final hit) · win= (s) */
function drawFinaleView(l: LabCtx): void {
  const g = l.g;
  const t = l.time;
  const b = l.sim.at(t);
  const L = l.light.current;
  if (q.has('end')) return drawTheEnd(g, num('end'), b);
  if (q.has('win')) {
    drawVictory(g, num('win'), b, (x, y, s) => drawSlim(g, x, y, { pose: 'victory', poseTime: 1, time: t, beatPhase: b.beatPhase, beat: b.beat, scale: s }), L);
    return;
  }
  const k = num('k', 0);
  const sr = screenRect(k);
  // the "film": a stand-in frame (the level's filmstrip floor + Slim + Big Jim small)
  g.save();
  g.beginPath();
  g.rect(sr.x, sr.y, sr.w, sr.h);
  g.clip();
  g.translate(sr.x, sr.y);
  g.scale(sr.s, sr.s);
  const bg = g.createLinearGradient(0, 0, 0, 1080);
  bg.addColorStop(0, '#2A1428');
  bg.addColorStop(1, '#0B0508');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1920, 1080);
  drawFilmstripFloor(g, { x: -40, y: 760, w: 2000, h: 400 }, { light: L }, b);
  drawIrisBlade(g, 1300, 620, 260, -0.2, L);
  drawBigJim(g, 1500, 560, 0.28, { time: t, beat: b.beat, panic: 1, light: L, crack: [2, 2], lod: 0 });
  drawSlim(g, 700, 760, { pose: 'run', poseTime: t, time: t, beatPhase: b.beatPhase, beat: b.beat, runPhase: t * 5, speed: 800 });
  if (q.has('iris')) drawIris(g, 1500, 400, (1 - num('iris')) * 1400, num('iris') * 2);
  g.restore();
  drawAuditorium(g, sr, b, { k, house: k, standing: 24, t });
  if (q.has('marquee')) drawMarqueeCutIn(g, num('marquee'), b, t);
}
