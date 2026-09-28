#!/usr/bin/env node
/**
 * Art-lab screenshot harness (used for visual review of src/art).
 *   node src/art/lab/shoot.mjs [--out=<dir>] "<name>:<query>" ...
 * e.g. node src/art/lab/shoot.mjs "crabbe:view=crabbe&t=1.2" "world-dawn:view=world&light=dawn&t=3"
 * Each shot loads artlab.html?shot=1&<query> in headless Chromium (1920x1080, DPR 1), waits for
 * window.__art.ready, and writes <out>/<name>.png. Add `bench=<frames>` to the query to time that many
 * frames of rendering (JS/CPU ms per frame, printed as JSON; SwiftShader GPU time is not included).
 */
import { mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith('--out='));
const out = outArg ? resolve(outArg.slice(6)) : join(tmpdir(), 'artlab-shots');
const shots = args.filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
// real GPU (ANGLE/Metal) by default — SwiftShader is far too slow for pre-rolled frames; SOFTWARE=1 to force it
const gpu = process.env.SOFTWARE
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const browser = await chromium.launch({ args: gpu });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
for (const s of shots) {
  const i = s.indexOf(':');
  const name = s.slice(0, i);
  const q = s.slice(i + 1);
  await page.goto(`${base}artlab.html?shot=1&${q}`);
  await page.waitForFunction(() => window.__art && window.__art.ready, null, { timeout: 30000 });
  await page.waitForTimeout(250);
  const bench = new URLSearchParams(q).get('bench');
  const perf = await page.evaluate((n) => (n ? window.__art.bench(Number(n)) : window.__art.perf && window.__art.perf()), bench);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(`${name}.png`, perf ? JSON.stringify(perf) : '');
}
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
await server.close();
console.log('out:', out);
