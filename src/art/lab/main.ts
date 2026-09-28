/**
 * OpusLegends ART LAB — gallery + sandbox for src/art (open /artlab.html).
 *
 * Views (tabs): Rig · FX · Lighting · World (greybox, generic framework) · Coast / Stress / Crabbe /
 * Entities (the superseded crab theme, kept as reference + perf test).
 *
 * URL params (used by the screenshot harness src/art/lab/shoot.mjs):
 *   view=<id> · pose=<name> · light=<key> · blend=<0..1 toward the next key> · t=<s> freeze time
 *   gray=1 greyscale+blur readability test · shot=1 hide UI · bpm=160 · slow=0.25 · debug=1 · onion=1
 *   scroll=0 hold the camera (pose buttons drive the hero in world views)
 */
import { BeatSim } from '../core/beat';
import { TintBake } from '../core/bake';
import { spriteCacheStats } from '../core/canvas';
import '../world/greybox'; // registers the 'neutral' light set
import '../grindhouse/lights'; // registers the 'grindhouse' light set
import { LIGHT_KEYS, LightingDirector, activeLightSet, useLights } from '../world/lighting';
import { type LabCtx, VIEWS, type ViewId } from './views';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const g = canvas.getContext('2d', { alpha: false })!;
const q = new URLSearchParams(location.search);
if (q.has('shot')) document.body.classList.add('shot');

let view: ViewId = (q.get('view') as ViewId) ?? 'street';
if (!VIEWS[view]) view = 'street';
useLights(VIEWS[view].lights);

const lab: LabCtx = {
  g,
  sim: new BeatSim(Number(q.get('bpm') ?? 164)),
  light: new LightingDirector(q.get('light') ?? LIGHT_KEYS[0]),
  pose: q.get('pose') ?? 'idle',
  poseStart: 0,
  time: 0,
  dt: 1 / 60,
  paused: false,
  scroll: q.has('scroll') ? Number(q.get('scroll')) : 1,
  thumb: false,
  debug: q.has('debug'),
  onion: q.has('onion'),
};
let timeScale = q.has('slow') ? Number(q.get('slow')) : 1;
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
  if (activeLightSet() !== VIEWS[v].lights) {
    useLights(VIEWS[v].lights);
    lab.light.set(LIGHT_KEYS[Math.min(1, LIGHT_KEYS.length - 1)], 0);
  }
  if (!VIEWS[v].poses.includes(lab.pose)) lab.pose = 'idle';
  buildTabs();
  buildPanel();
}

function setPose(p: string) {
  lab.pose = p;
  lab.poseStart = lab.time;
  buildPanel();
}

function row(): HTMLDivElement {
  const r = document.createElement('div');
  r.className = 'row';
  panel.appendChild(r);
  return r;
}

function buildPanel() {
  panel.innerHTML = '';
  const h = (t: string) => {
    const e = document.createElement('h3');
    e.textContent = t;
    panel.appendChild(e);
  };
  const V = VIEWS[view];
  const help = document.createElement('div');
  help.className = 'hint';
  help.style.marginTop = '0';
  help.textContent = V.help;
  panel.appendChild(help);

  h('Pose');
  const pr = row();
  V.poses.forEach((p, i) => button(pr, p, () => setPose(p), p === lab.pose, `key ${i < 9 ? i + 1 : ['0', '-', '='][i - 9]}`));

  h(`Lighting · set "${activeLightSet()}"`);
  const sel = document.createElement('select');
  for (const k of LIGHT_KEYS) {
    const o = document.createElement('option');
    o.value = k;
    o.textContent = k;
    if (k === lab.light.key) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => lab.light.set(sel.value, 2.5);
  panel.appendChild(sel);
  const sl = document.createElement('input');
  sl.type = 'range';
  sl.min = '0';
  sl.max = String(LIGHT_KEYS.length - 1);
  sl.step = '0.01';
  sl.value = String(Math.max(0, LIGHT_KEYS.indexOf(lab.light.key)));
  sl.oninput = () => {
    const v = Number(sl.value);
    const i = Math.min(LIGHT_KEYS.length - 2, Math.floor(v));
    lab.light.setBlend(LIGHT_KEYS[i], LIGHT_KEYS[i + 1], v - i);
  };
  panel.appendChild(sl);
  const lh = document.createElement('div');
  lh.className = 'hint';
  lh.textContent = 'Slider scrubs smoothly through the whole keyframe arc.';
  panel.appendChild(lh);
  button(row(), 'Auto-cycle', () => {
    autoCycle = !autoCycle;
    buildPanel();
  }, autoCycle);

  h('Music (simulated band)');
  const mr = row();
  for (const bpm of [150, 164, 170]) button(mr, `${bpm}`, () => { lab.sim.bpm = bpm; buildPanel(); }, lab.sim.bpm === bpm);
  button(mr, lab.paused ? 'Play' : 'Pause', () => { lab.paused = !lab.paused; buildPanel(); });
  const tr = row();
  for (const s of [0.1, 0.25, 1]) button(tr, `${s}x`, () => { timeScale = s; buildPanel(); }, timeScale === s, 'time scale (review smears)');

  h('Review');
  const rr = row();
  button(rr, 'Greyscale + blur', () => { canvas.classList.toggle('gray'); buildPanel(); }, canvas.classList.contains('gray'), 'G');
  button(rr, 'Hold camera', () => { lab.scroll = lab.scroll ? 0 : 1; buildPanel(); }, lab.scroll === 0, 'world views: stop scrolling, pose buttons drive the hero');
  button(rr, 'Debug/bones', () => { lab.debug = !lab.debug; buildPanel(); }, lab.debug);
  button(rr, 'Onion', () => { lab.onion = !lab.onion; buildPanel(); }, lab.onion);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.innerHTML =
    'Keys: <kbd>1</kbd>–<kbd>=</kbd> poses · <kbd>Tab</kbd> next view · <kbd>L</kbd> next light · <kbd>G</kbd> grey test · <kbd>Space</kbd> pause · <kbd>S</kbd> slow-mo';
  panel.appendChild(hint);
}

let autoCycle = q.has('cycle');
let cycleT = 0;

window.addEventListener('keydown', (e) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  const i = keys.indexOf(e.key);
  const poses = VIEWS[view].poses;
  if (i >= 0 && i < poses.length) setPose(poses[i]);
  else if (e.key === 'Tab') {
    e.preventDefault();
    const ids = Object.keys(VIEWS) as ViewId[];
    setView(ids[(ids.indexOf(view) + (e.shiftKey ? ids.length - 1 : 1)) % ids.length]);
  } else if (e.key === 'l' || e.key === 'L') {
    lab.light.set(LIGHT_KEYS[(LIGHT_KEYS.indexOf(lab.light.key) + 1) % LIGHT_KEYS.length], 2);
    buildPanel();
  } else if (e.key === 'g' || e.key === 'G') canvas.classList.toggle('gray');
  else if (e.key === 's' || e.key === 'S') {
    timeScale = timeScale === 1 ? 0.25 : 1;
    buildPanel();
  } else if (e.key === ' ') {
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
  return {
    fps,
    avgMs: +avg.toFixed(2),
    p95Ms: +p95.toFixed(2),
    maxMs: +(s[s.length - 1] ?? 0).toFixed(2),
    sprites: c.count,
    cacheMPx: +((c.pixels + TintBake.pixelsTotal) / 1e6).toFixed(1),
    relights: TintBake.composes,
  };
}

function render(dt: number) {
  lab.dt = dt;
  if (autoCycle) {
    cycleT += dt;
    if (cycleT > (q.has('cycle') ? 3.5 : 6)) {
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
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (!lab.paused) lab.time += dt * timeScale;
  render(dt);
  fpsFrames++;
  fpsT += dt;
  if (fpsT >= 0.5) {
    fps = Math.round(fpsFrames / fpsT);
    fpsFrames = 0;
    fpsT = 0;
    const p = perf();
    perfEl.textContent = `${p.fps} fps · draw ${p.avgMs} ms (p95 ${p.p95Ms})\n${p.sprites} sprites · ${p.cacheMPx} MPx cached · ${p.relights} relights`;
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
  // deterministic still: settle lighting, warm caches, render the frozen frame
  lab.time = frozen;
  lab.poseStart = 0;
  TintBake.budget = 99;
  lab.light.update(10);
  // pre-roll so stateful things (particles) have history: simulate the preceding 1.5 s at 60 fps
  const pre = Number(q.get('preroll') ?? 1.5);
  for (let i = Math.round(pre * 60); i >= 0; i--) {
    lab.time = Math.max(0, frozen - i / 60);
    render(1 / 60);
  }
  window.__art = {
    ready: true,
    perf,
    lab,
    bench: (n: number) => {
      samples.length = 0;
      TintBake.budget = 3;
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
