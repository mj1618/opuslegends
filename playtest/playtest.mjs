#!/usr/bin/env node
/**
 * npm run playtest [-- options]
 *
 * Builds the game, serves dist/ with `vite preview`, runs it in headless Chromium with
 * ?autoplay=1 (the bot executes every obstacle's intended action on its beat through the real
 * controller), records a webm video + a screenshot every ~2 s into playtest/out/, and writes
 * playtest/out/report.json (completion, deaths, lums, action-vs-beat timing errors, frame stats,
 * audio clock diagnostics). Exits non-zero if the run fails.
 *
 * Options:
 *   --no-build        reuse the existing dist/
 *   --debug           show the debug overlay in screenshots/video
 *   --start=<beat>    start mid-level
 *   --no-video        skip video recording
 *   --headed          show the browser
 *   --interval=<ms>   screenshot interval (default 2000)
 *   --latency=<ms>    pass a latency offset
 *   --miss=<b1,b2>    bot deliberately skips the action at these beats once -> expects exactly that
 *                     many deaths, then checkpoint respawn + music rewind, then completion
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'playtest', 'out');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const interval = Number(args.interval ?? 2000);
const video = !args['no-video'];

// Thresholds for pass/fail
const MAX_EXEC_ERR_MS = 12; // one 120 Hz step + margin
const MAX_POS_ERR_MS = 40; // hero physically on the beat grid
const MAX_SIM_DRIFT_MS = 20;

function log(...a) {
  console.log('[playtest]', ...a);
}

async function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  if (!args['no-build']) {
    log('building…');
    execSync('npm run build', { cwd: root, stdio: 'inherit' });
  }

  const server = await preview({ root, logLevel: 'warn', preview: { port: 4174, strictPort: false, open: false } });
  const base = server.resolvedUrls?.local?.[0];
  if (!base) throw new Error('vite preview did not report a URL');
  const q = new URLSearchParams({ autoplay: '1' });
  if (args.debug) q.set('debug', '1');
  if (args.start) q.set('start', String(args.start));
  if (args.latency) q.set('latency', String(args.latency));
  const expectedDeaths = args.miss ? String(args.miss).split(',').length : 0;
  if (args.miss) q.set('miss', String(args.miss));
  const url = `${base}?${q}`;
  log('url', url);

  const browser = await chromium.launch({
    headless: !args.headed,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: video ? { dir: outDir, size: { width: 1280, height: 720 } } : undefined,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__game && window.__game.state().scene === 'play', null, { timeout: 20000 });
  log('run started');

  const shots = [];
  let i = 0;
  let state = await page.evaluate(() => window.__game.state());
  const deadline = Date.now() + 120000;
  let nextShot = Date.now();
  while (Date.now() < deadline) {
    if (Date.now() >= nextShot) {
      const name = `shot-${String(i).padStart(2, '0')}-beat${Math.max(0, Math.round(state.beat))}.png`;
      await page.screenshot({ path: join(outDir, name) });
      shots.push(name);
      i++;
      nextShot += interval;
    }
    state = await page.evaluate(() => window.__game.state());
    if (state.scene === 'end') break;
    if (state.loadError) break;
    await page.waitForTimeout(100);
  }
  // final end-screen shot
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, 'shot-end.png') });
  shots.push('shot-end.png');

  const report = await page.evaluate(() => window.__game.report());
  const wallSec = (Date.now() - t0) / 1000;
  await context.close();
  await browser.close();
  await server.close();

  let videoFile = null;
  if (video) {
    const webm = readdirSync(outDir).find((f) => f.endsWith('.webm'));
    if (webm) {
      renameSync(join(outDir, webm), join(outDir, 'playtest.webm'));
      videoFile = 'playtest/out/playtest.webm';
    }
  }

  const failures = [];
  if (!report.completed) failures.push('level not completed');
  if (report.deaths !== expectedDeaths) failures.push(`${report.deaths} death(s) (expected ${expectedDeaths}): ${JSON.stringify(report.deathLog)}`);
  if (report.missedActions.length) failures.push(`missed actions: ${report.missedActions.join(', ')}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);
  if (report.timing.exec.maxAbsMs > MAX_EXEC_ERR_MS) failures.push(`exec timing error ${report.timing.exec.maxAbsMs}ms > ${MAX_EXEC_ERR_MS}`);
  if (report.timing.position.maxAbsMs > MAX_POS_ERR_MS) failures.push(`position error ${report.timing.position.maxAbsMs}ms > ${MAX_POS_ERR_MS}`);
  if (report.clock.maxSimDriftMs > MAX_SIM_DRIFT_MS) failures.push(`sim drift ${report.clock.maxSimDriftMs}ms`);
  if (report.liveAudioProbe && report.liveAudioProbe.n > 20 && report.liveAudioProbe.meanAbsMs > 5) failures.push(`live audio probe: music is ${report.liveAudioProbe.meanMs}ms off the conductor clock`);
  if (report.beatMapAlignment && report.beatMapAlignment.meanAbsMs > 5) failures.push(`beat map vs audio onsets off by ${report.beatMapAlignment.meanMs}ms`);
  if (state.scene !== 'end') failures.push(`timed out in scene ${state.scene}`);

  const full = { ok: failures.length === 0, failures, url, wallSec, video: videoFile, screenshots: shots, consoleErrors, pageErrors, ...report };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(full, null, 2));

  log('------------------------------------------------------------');
  log(`completed ${report.completed}  deaths ${report.deaths}  lums ${report.lums}/${report.lumsTotal}`);
  log(`actions matched ${report.matchedActions}/${report.intendedActions}`);
  log(`timing exec   ${JSON.stringify(report.timing.exec)}`);
  log(`timing pos    ${JSON.stringify(report.timing.position)}`);
  log(`clock         ${JSON.stringify(report.clock)}`);
  log(`beat map      ${JSON.stringify(report.beatMapAlignment)}`);
  log(`live probe    ${JSON.stringify(report.liveAudioProbe && { ...report.liveAudioProbe, note: undefined })}`);
  log(`jumps         ${JSON.stringify(report.jumpAirtimes)}`);
  log(`frames        ${JSON.stringify(report.frames)}`);
  log(`screenshots   ${shots.length} in playtest/out/`);
  if (failures.length) {
    log('FAIL:');
    for (const f of failures) log('  - ' + f);
    process.exit(1);
  }
  log('PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
