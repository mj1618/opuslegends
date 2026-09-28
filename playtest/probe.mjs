/**
 * Quick state probe (dev tool): node playtest/probe.mjs "<query>" <seconds> [shot.png|-] [js-expression]
 * Serves dist/ (build first), opens ?<query>, prints __game.state() every second, optional
 * screenshot and a final page.evaluate(js-expression).
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
const root = new URL('..', import.meta.url).pathname;
const server = await preview({ root, logLevel: 'warn', preview: { port: 4175, strictPort: false, open: false } });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', String(e)));
const t0 = Date.now();
await page.goto(base + '?' + (process.argv[2] ?? 'autoplay=1'));
for (let i = 0; i < Number(process.argv[3] ?? 8); i++) {
  await page.waitForTimeout(1000);
  const st = await page.evaluate(() => window.__game && window.__game.state());
  console.log(((Date.now() - t0) / 1000).toFixed(1), JSON.stringify(st));
}
if (process.argv[4] && process.argv[4] !== '-') await page.screenshot({ path: process.argv[4] });
if (process.argv[5]) console.log('[eval]', JSON.stringify(await page.evaluate(process.argv[5])));
await browser.close();
await server.close();
