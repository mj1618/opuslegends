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
 *   --miss=<b1,b2>    bot deliberately skips the action at these beats once. The expected cost of
 *                     each miss comes from the level (action.failKind: death / stumble / none), so the
 *                     run must show exactly those deaths (checkpoint respawn + music rewind) and
 *                     stumbles (knockback, lums drop, surge back onto the grid), then completion.
 *   --jitter=<ms>     bot presses every action at a random offset in [-ms, +ms] ("sloppy human"):
 *                     must still complete with 0 deaths / 0 stumbles (fairness of the timing windows).
 *                     Timing-accuracy thresholds are skipped in jitter and miss runs.
 *   --sloppy          "sloppy human" (jitter 85 ms + 10% late presses, re-rolled every attempt): only
 *                     requires completion; REPORTS deaths/stumbles (is it hard but fair?)
 *   --late=<p>        fraction of presses that are an extra 60-110 ms late
 *   --skip=<kinds>    the bot ALWAYS skips actions of these fail kinds: none (lazy) / stumble (reckless)
 *   --max-deaths=<n>  stop the run after n deaths (for bots that are expected never to finish)
 *   --device=<ms>     the bot HEARS the audio this late (an unreported Bluetooth/TV delay): the latency offset
 *                     (calibration, auto-drift) corrects it like it would for a human. Implies sloppy reporting
 *   --calib           run the cold open's projector sync (latency tap test); the bot taps it (device + jitter)
 *   --autolat=0       disable the in-run latency auto-drift
 *   --seed=<n>        jitter seed
 *   --song=<id>       edit (default) | full | placeholder — passed as ?song= (falls back to the
 *                     placeholder, with an on-screen note, if the licensed recording is missing)
 *   --dist=<dir>      build/serve folder (default dist) — use a private one when agents run in parallel
 *   --out=<dir>       output folder (default playtest/out) — lets several runs go in parallel
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const outDir = args.out ? resolve(root, String(args.out)) : join(root, 'playtest', 'out');
const interval = Number(args.interval ?? 2000);
const video = !args['no-video'];
// --dist=<dir>: build into / serve from a private folder so parallel agents sharing this tree don't clobber dist/
const distDir = args.dist ? String(args.dist) : 'dist';

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
    execSync(`npx tsc --noEmit && npx vite build --outDir ${distDir} --emptyOutDir`, { cwd: root, stdio: 'inherit' });
  }

  const server = await preview({ root, logLevel: 'warn', preview: { port: 4174, strictPort: false, open: false }, build: { outDir: distDir } });
  const base = server.resolvedUrls?.local?.[0];
  if (!base) throw new Error('vite preview did not report a URL');
  const q = new URLSearchParams({ autoplay: '1' });
  if (args.debug) q.set('debug', '1');
  if (args.start) q.set('start', String(args.start));
  if (args.latency) q.set('latency', String(args.latency));
  if (args.miss) q.set('miss', String(args.miss));
  if (args.jitter) q.set('jitter', String(args.jitter));
  if (args.late) q.set('late', String(args.late));
  if (args.sloppy) q.set('sloppy', '1');
  if (args.seed) q.set('seed', String(args.seed));
  if (args.song) q.set('song', String(args.song));
  if (args.skip) q.set('skip', String(args.skip));
  if (args.device) q.set('device', String(args.device));
  if (args.calib) q.set('calib', '1');
  if (args.autolat !== undefined) q.set('autolat', String(args.autolat));
  const sloppy = !!(args.sloppy || args.late || args.skip || args.device);
  const maxDeaths = args['max-deaths'] !== undefined ? Number(args['max-deaths']) : Infinity;
  const strictTiming = !args.miss && !args.jitter && !sloppy;
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
  const deadline = Date.now() + 300000; // the full level edit is ~2:10 of music, plus deaths/rewinds
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
    if (state.deaths >= maxDeaths) break;
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
  const exp = report.expectedFromMisses ?? { deaths: 0, stumbles: 0, detail: [] };
  const expectedDeaths = args['expect-deaths'] !== undefined ? Number(args['expect-deaths']) : exp.deaths;
  const expectedStumbles = args['expect-stumbles'] !== undefined ? Number(args['expect-stumbles']) : exp.stumbles;
  if (!report.completed) failures.push('level not completed');
  if (!sloppy && report.deaths !== expectedDeaths) failures.push(`${report.deaths} death(s) (expected ${expectedDeaths}): ${JSON.stringify(report.deathLog)}`);
  if (!sloppy && report.stumbles !== expectedStumbles) failures.push(`${report.stumbles} stumble(s) (expected ${expectedStumbles}): ${JSON.stringify(report.stumbleLog)}`);
  const missBeats = new Set(String(args.miss ?? '').split(',').filter(Boolean).map(Number));
  const unexpectedMissed = report.missedActions.filter((m) => !missBeats.has(Number(m.split('@')[1])));
  if (strictTiming && unexpectedMissed.length) failures.push(`missed actions: ${unexpectedMissed.join(', ')}`);
  if (report.shoutAlignment && report.shoutAlignment.offShout.length) failures.push(`chorus strikes off the shout grid: ${report.shoutAlignment.offShout.join(', ')}`);
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.join(' | ')}`);
  if (strictTiming && report.timing.exec.maxAbsMs > MAX_EXEC_ERR_MS) failures.push(`exec timing error ${report.timing.exec.maxAbsMs}ms > ${MAX_EXEC_ERR_MS}`);
  if (strictTiming && report.timing.position.maxAbsMs > MAX_POS_ERR_MS) failures.push(`position error ${report.timing.position.maxAbsMs}ms > ${MAX_POS_ERR_MS}`);
  if (report.clock.maxSimDriftMs > MAX_SIM_DRIFT_MS) failures.push(`sim drift ${report.clock.maxSimDriftMs}ms`);
  const lp = report.liveAudioProbe;
  if (lp && lp.n > 20 && (lp.meanAbsMs > 5 || Math.abs(lp.meanMs) > 5)) failures.push(`live audio probe: music is off the conductor clock (mean |err| ${lp.meanAbsMs}ms, median ${lp.p50AbsMs}ms, mean ${lp.meanMs}ms)`);
  // robust: a live recording scatters around its smoothed grid (laid-back backbeat, fills), so judge the
  // median offset and the worst 8-bar median (drift), not the per-beat mean |error|
  const bma = report.beatMapAlignment;
  if (bma && (Math.abs(bma.medianMs) > 5 || bma.blockMedianMaxMs > 8)) failures.push(`beat map vs audio onsets: median ${bma.medianMs}ms, worst 8-bar median ${bma.blockMedianMaxMs}ms`);
  if (state.scene !== 'end') failures.push(`timed out in scene ${state.scene}`);

  const full = { ok: failures.length === 0, failures, url, wallSec, video: videoFile, screenshots: shots, consoleErrors, pageErrors, ...report };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(full, null, 2));

  log('------------------------------------------------------------');
  if (sloppy || args.jitter) {
    const act = (b) => (b < 132 ? 'act1' : b < 240 ? 'act2' : 'act3');
    const count = (list) => list.reduce((m, d) => ((m[act(d.beat)] = (m[act(d.beat)] ?? 0) + 1), m), {});
    log(`sloppy human  deaths by act: ${JSON.stringify(count(report.deathLog))}  stumbles by act: ${JSON.stringify(count(report.stumbleLog))}  latency ${report.clock.latencyOffsetMs} ms (base ${report.clock.latencyBaseMs})`);
  }
  log(`song          ${report.song} (bpm ${report.bpm}, swing ${report.swing})`);
  log(`completed ${report.completed}  deaths ${report.deaths}  stumbles ${report.stumbles}  lums ${report.lums}/${report.lumsTotal}  pendulums ${report.pendulums}/${report.pendulumsTotal}  heaves ${report.heaves}/${report.phrases}`);
  log(`grades        ${JSON.stringify(report.grades)}  crowd ${JSON.stringify(report.crowd)}`);
  if (args.miss) log(`misses        ${JSON.stringify(exp.detail)}  surge recovery (beats) ${JSON.stringify(report.surgeRecoveryBeats)}`);
  log(`shouts        ${JSON.stringify({ ...report.shoutAlignment, note: undefined })}`);
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
