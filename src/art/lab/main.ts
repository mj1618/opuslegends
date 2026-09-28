/**
 * OpusLegends ART LAB — gallery + sandbox for src/art (open /artlab.html).
 *
 * Views: Crabbe (every pose, big hero + grid), Entities (all entity art in their states),
 * World (scrolling Stack Coast with Crabbe running through props, per lighting keyframe),
 * Stress (world + 30 entities + 24 choir crabs, perf readout).
 *
 * URL params (used by the screenshot harness src/art/lab/shoot.mjs):
 *   view=crabbe|entities|world|stress · pose=<CrabbePose> · light=<LightKey> · blend=<0..1 to next key>
 *   t=<seconds> freeze time · gray=1 greyscale+blur readability test · shot=1 hide UI · bpm=160
 */
import { BeatSim } from '../core/beat';
import { TintBake } from '../core/bake';
import { spriteCacheStats } from '../core/canvas';
import { CRABBE_POSES, type CrabbePose } from '../crabbe';
import { LIGHT_KEYS, type LightKey, LightingDirector } from '../world/lighting';
import { type LabCtx, VIEWS, type ViewId } from './views';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const g = canvas.getContext('2d', { alpha: false })!;
const q = new URLSearchParams(location.search);
const shot = q.has('shot');
if (shot) document.body.classList.add('shot');

const lab: LabCtx = {
  g,
  sim: new BeatSim(Number(q.get('bpm') ?? 160)),
  light: new LightingDirector((q.get('light') as LightKey) ?? 'dawn'),
  pose: (q.get('pose') as CrabbePose) ?? 'idle',
  poseStart: 0,
  time: 0,
  dt: 1 / 60,
  paused: false,
  scroll: q.has('scroll') ? Number(q.get('scroll')) : 1,
  thumb: false,
  debug: q.has('debug'),
};
let view: ViewId = (q.get('view') as ViewId) ?? 'crabbe';
if (q.has('blend')) {
  const a = lab.light.key;
  const i = LIGHT_KEYS.indexOf(a);
  lab.light.setBlend(a, LIGHT_KEYS[(i + 1) % LIGHT_KEYS.length], Number(q.get('blend')));
}
const frozen = q.has('t') ? Number(q.get('t')) : null;
if (q.get('gray')) canvas.classList.add('gray');

// ---------------------------------------------------------------- UI
const tabs = document.getElementById('tabs')!;
const panel = document.getElementById('panel')!;
const perfEl = document.getElementById('perf')!;

function button(parent: HTMLElement, label: string, on: () => void, active = false, title = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.title = title;
  if (active) b.classList.add('on');
  b.onclick = on;
  parent.appendChild(b);
  return b;
}

function buildTabs() {
  tabs.innerHTML = '';
  for (const id of Object.keys(VIEWS) as ViewId[]) button(tabs, VIEWS[id].label, () => setView(id), id === view);
}

function setView(v: ViewId) {
  view = v;
  buildTabs();
  buildPanel();
}

function setPose(p: CrabbePose) {
  lab.pose = p;
  lab.poseStart = lab.time;
  buildPanel();
}

function buildPanel() {
  panel.innerHTML = '';
  const h = (t: string) => {
    const e = document.createElement('h3');
    e.textContent = t;
    panel.appendChild(e);
  };
  h('Crabbe pose');
  const pr = document.createElement('div');
  pr.className = 'row';
  CRABBE_POSES.forEach((p, i) => button(pr, p, () => setPose(p), p === lab.pose, `key ${i < 9 ? i + 1 : ['0', '-', '='][i - 9]}`));
  panel.appendChild(pr);

  h('Lighting');
  const sel = document.createElement('select');
  for (const k of LIGHT_KEYS) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k;
    if (k === lab.light.key) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => lab.light.set(sel.value as LightKey, 2.5);
  panel.appendChild(sel);
  const sl = document.createElement('input');
  sl.type = 'range';
  sl.min = '0';
  sl.max = String(LIGHT_KEYS.length - 1);
  sl.step = '0.01';
  sl.value = String(LIGHT_KEYS.indexOf(lab.light.key));
  sl.oninput = () => {
    const v = Number(sl.value);
    const i = Math.min(LIGHT_KEYS.length - 2, Math.floor(v));
    lab.light.setBlend(LIGHT_KEYS[i], LIGHT_KEYS[i + 1], v - i);
  };
  const lbl = document.createElement('div');
  lbl.className = 'hint';
  lbl.textContent = 'Slider scrubs smoothly through the whole day arc.';
  panel.appendChild(sl);
  panel.appendChild(lbl);
  const cyc = document.createElement('div');
  cyc.className = 'row';
  button(cyc, 'Auto-cycle day', () => {
    autoCycle = !autoCycle;
    buildPanel();
  }, autoCycle);
  panel.appendChild(cyc);

  h('Music');
  const mr = document.createElement('div');
  mr.className = 'row';
  for (const bpm of [150, 160, 170]) button(mr, `${bpm} BPM`, () => { lab.sim.bpm = bpm; buildPanel(); }, lab.sim.bpm === bpm);
  button(mr, lab.paused ? 'Play' : 'Pause', () => { lab.paused = !lab.paused; buildPanel(); });
  panel.appendChild(mr);

  h('Review');
  const rr = document.createElement('div');
  rr.className = 'row';
  button(rr, 'Greyscale + blur', () => { canvas.classList.toggle('gray'); buildPanel(); }, canvas.classList.contains('gray'), 'G');
  button(rr, 'Scroll x0 / x1', () => { lab.scroll = lab.scroll ? 0 : 1; buildPanel(); }, lab.scroll === 0);
  button(rr, 'Debug', () => { lab.debug = !lab.debug; buildPanel(); }, lab.debug);
  panel.appendChild(rr);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.innerHTML =
    'Keys: <kbd>1</kbd>–<kbd>=</kbd> poses · <kbd>Tab</kbd> next view · <kbd>L</kbd> next light · <kbd>G</kbd> grey test · <kbd>Space</kbd> pause';
  panel.appendChild(hint);
  const vi = document.createElement('div');
  vi.className = 'hint';
  vi.textContent = VIEWS[view].help;
  panel.appendChild(vi);
}

let autoCycle = false;
let cycleT = 0;

window.addEventListener('keydown', (e) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  const i = keys.indexOf(e.key);
  if (i >= 0) setPose(CRABBE_POSES[i]);
  else if (e.key === 'Tab') {
    e.preventDefault();
    const ids = Object.keys(VIEWS) as ViewId[];
    setView(ids[(ids.indexOf(view) + 1) % ids.length]);
  } else if (e.key === 'l' || e.key === 'L') {
    const k = LIGHT_KEYS[(LIGHT_KEYS.indexOf(lab.light.key) + 1) % LIGHT_KEYS.length];
    lab.light.set(k, 2);
    buildPanel();
  } else if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('gray');
  else if (e.key === ' ') {
    e.preventDefault();
    lab.paused = !lab.paused;
    buildPanel();
  }
});

// ---------------------------------------------------------------- loop + perf
const samples: number[] = [];
let fpsFrames = 0;
let fpsT = 0;
let fps = 0;
let last = performance.now();

function perf() {
  const s = [...samples].sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  const p95 = s[Math.floor(s.length * 0.95)] ?? 0;
  const c = spriteCacheStats();
  return { fps, avgMs: +avg.toFixed(2), p95Ms: +p95.toFixed(2), sprites: c.count, cacheMPx: +(c.pixels / 1e6).toFixed(1), composes: TintBake.composes };
}

function render(dt: number) {
  lab.dt = dt;
  if (autoCycle) {
    cycleT += dt;
    if (cycleT > 6) {
      cycleT = 0;
      lab.light.set(LIGHT_KEYS[(LIGHT_KEYS.indexOf(lab.light.key) + 1) % LIGHT_KEYS.length], 3);
    }
  }
  lab.light.update(dt);
  TintBake.frame();
  const t0 = performance.now();
  g.setTransform(1, 0, 0, 1, 0, 0);
  VIEWS[view].draw(lab);
  const ms = performance.now() - t0;
  samples.push(ms);
  if (samples.length > 120) samples.shift();
}

function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!lab.paused) lab.time += dt;
  render(dt);
  fpsFrames++;
  fpsT += dt;
  if (fpsT >= 0.5) {
    fps = Math.round(fpsFrames / fpsT);
    fpsFrames = 0;
    fpsT = 0;
    const p = perf();
    perfEl.textContent = `${p.fps} fps · draw ${p.avgMs} ms (p95 ${p.p95Ms})\n${p.sprites} sprites · ${p.cacheMPx} MPx cached · ${p.composes} relights`;
  }
  requestAnimationFrame(loop);
}

buildTabs();
buildPanel();

declare global {
  interface Window {
    __art: { ready: boolean; perf: typeof perf; lab: LabCtx; bench: (frames: number) => ReturnType<typeof perf> };
  }
}

if (frozen !== null) {
  // deterministic still: settle lighting, then render the frozen frame a few times (warm caches)
  lab.time = frozen;
  lab.poseStart = 0;
  for (let i = 0; i < 4; i++) {
    lab.light.update(10);
    TintBake.budget = 99;
    render(1 / 60);
  }
  window.__art = {
    ready: true,
    perf,
    lab,
    bench: (n: number) => {
      samples.length = 0;
      for (let i = 0; i < n; i++) {
        lab.time += 1 / 60;
        render(1 / 60);
      }
      lab.time = frozen;
      render(1 / 60);
      return perf();
    },
  };
} else {
  requestAnimationFrame(loop);
  window.__art = { ready: true, perf, lab, bench: () => perf() };
}
