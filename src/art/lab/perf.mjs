#!/usr/bin/env node
/**
 * Art-lab live perf probe: node src/art/lab/perf.mjs [view ...]
 * Opens artlab.html?shot=1&view=<v> LIVE (requestAnimationFrame) in Chromium at 1920x1080, DPR 1,
 * trying the real GPU (ANGLE/Metal) first, lets it run 6 s and prints fps + JS draw ms (avg/p95/max).
 * A view can carry extra params after '+', e.g. `stress+cycle=1` (continuous lighting transitions).
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const views = process.argv.slice(2).length ? process.argv.slice(2) : ['street', 'bar', 'stress', 'slim'];
const server = await createServer({ root, logLevel: 'error', server: { port: 5198, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const gpu = process.env.SOFTWARE ? [] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browser = await chromium.launch({ headless: !process.env.HEADED, args: [...gpu, '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const renderer = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl');
  const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log('renderer:', renderer);
for (const v of views) {
  const [name, extra] = v.split('+');
  await page.goto(`${base}artlab.html?shot=1&view=${name}&light=${name === 'bar' ? 'bar' : 'neon'}${extra ? '&' + extra : ''}`);
  await page.waitForFunction(() => window.__art && window.__art.ready);
  await page.waitForTimeout(6000);
  const p = await page.evaluate(() => window.__art.perf());
  console.log(v.padEnd(9), JSON.stringify(p));
}
await browser.close();
await server.close();
