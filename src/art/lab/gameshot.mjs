#!/usr/bin/env node
/**
 * In-GAME art probe (no build: Vite dev server). Opens the real game at 1920x1080 DPR 1 with the real GPU
 * (ANGLE/Metal; SOFTWARE=1 for SwiftShader), autoplays, takes screenshots and prints live fps + the
 * renderer's JS cost (renderer.perf()).
 *
 *   node src/art/lab/gameshot.mjs --out=<dir> [--start=<beat>] [--secs=20] [--every=2000] [--gray]
 *        [--title] [--query=k=v&k2=v2] [--dpr=1] [--end]
 *
 *   --gray   readability test: CSS grayscale(1) + blur(4px) on the canvas for every shot (DESIGN fun risk 6)
 *   --title  stay on the title screen (no autoplay start) and shoot it
 *   --end    run to the end screen and shoot it
 *   --eval=<js> print page.evaluate(js) after the run
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const s = a.replace(/^--/, '');
    const i = s.indexOf('=');
    return i < 0 ? [s, true] : [s.slice(0, i), s.slice(i + 1)];
  }),
);
const out = resolve(String(args.out ?? join(root, 'playtest/out-art/gameshot')));
mkdirSync(out, { recursive: true });
const secs = Number(args.secs ?? 20);
const every = Number(args.every ?? 2000);
const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false, hmr: false, watch: null } }); // no HMR: agents share this tree
await server.listen();
const base = server.resolvedUrls.local[0];
const gpu = process.env.SOFTWARE ? [] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browser = await chromium.launch({
  headless: !process.env.HEADED,
  args: [...gpu, '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(args.dpr ?? 1) });
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()));
const q = new URLSearchParams(args.title ? {} : { autoplay: '1' });
if (args.start) q.set('start', String(args.start));
if (args.query) for (const [k, v] of new URLSearchParams(String(args.query))) q.set(k, v);
await page.goto(`${base}?${q}`);
await page.waitForFunction(() => window.__game && (window.__game.state().scene === 'play' || window.__game.state().scene === 'title'), null, { timeout: 30000 });
if (args.gray) await page.addStyleTag({ content: 'canvas{filter:grayscale(1) blur(4px)}' });
const shoot = async (name) => {
  await page.screenshot({ path: join(out, name) });
  console.log('shot', name);
};
if (args.title) {
  await page.waitForTimeout(2500);
  await shoot('title.png');
} else {
  await page.waitForFunction(() => window.__game.state().scene === 'play', null, { timeout: 30000 });
  await page.evaluate(() => window.__game.game.renderer.perf(true));
  const t0 = Date.now();
  let i = 0;
  let next = t0 + 800;
  while (Date.now() - t0 < secs * 1000) {
    const st = await page.evaluate(() => window.__game.state());
    if (st.scene === 'end') break;
    if (Date.now() >= next) {
      await shoot(`g-${String(i).padStart(2, '0')}-beat${Math.round(st.beat ?? 0)}.png`);
      i++;
      next += every;
    }
    await page.waitForTimeout(50);
  }
  const perf = await page.evaluate(() => ({ render: window.__game.game.renderer.perf(false), fps: window.__game.game.frameStats.summary() }));
  console.log('renderer JS ms', JSON.stringify(perf.render));
  console.log('frames', JSON.stringify(perf.fps));
  if (args.eval) console.log('[eval]', JSON.stringify(await page.evaluate(String(args.eval))));
  if (args.end) {
    await page.waitForFunction(() => window.__game.state().scene === 'end', null, { timeout: 180000 });
    await page.waitForTimeout(1500);
    await shoot('end.png');
  }
}
await browser.close();
await server.close();
