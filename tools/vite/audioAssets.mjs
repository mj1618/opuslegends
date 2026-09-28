/**
 * Vite plugin: serves / ships the game's runtime audio (assets/audio/) at the relative URL `audio/…`.
 *
 * assets/audio/ holds the beat maps, overlay stems, one-shots and the LICENSED recording in
 * assets/audio/licensed/ (gitignored: never commit it).
 *   - dev: files are served straight from assets/audio/. A missing file is a real 404 (never the
 *     SPA index.html fallback), so the game can detect a missing licensed recording and fall back.
 *   - build: COPY folders go to <outDir>/audio/; licensed/ is copied only if it exists (fresh
 *     clones don't have it) and can be left out with OPUS_NO_LICENSED=1 (public builds without
 *     the licence).
 *   - preview: serves the built copy; missing /audio/* files are 404s.
 * `audio/licensed.json` = {"files": [...]} lists the licensed files that are actually available
 * (generated on the fly in dev, written at build time), so the game can check for the recording
 * without provoking a 404 (which the browser logs as a console error).
 */
import { cpSync, createReadStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const AUDIO_DIR = join(ROOT, 'assets', 'audio');
const COPY = ['stems/jim_edit_overlay', 'stems/jim_overlay', 'sfx'];
const LICENSED = 'licensed';
const MIME = { '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.json': 'application/json' };

const isFile = (f) => existsSync(f) && statSync(f).isFile();
const MANIFEST = 'licensed.json';
/** licensed files present on disk (none when OPUS_NO_LICENSED is set for a build) */
const licensedFiles = (forBuild) =>
  existsSync(join(AUDIO_DIR, 'licensed')) && !(forBuild && process.env.OPUS_NO_LICENSED)
    ? readdirSync(join(AUDIO_DIR, 'licensed')).filter((f) => /\.(ogg|mp3|wav)$/.test(f)).sort()
    : [];
const relPath = (req) => decodeURIComponent((req.url ?? '/').split('?')[0]);

function notFound(res) {
  res.statusCode = 404;
  res.end('not found');
}

/** @returns {import('vite').Plugin} */
export function audioAssets() {
  let outDir = '';
  let isBuild = false;
  return {
    name: 'opus-audio-assets',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
      isBuild = c.command === 'build';
    },
    configureServer(server) {
      server.middlewares.use('/audio', (req, res, next) => {
        if (relPath(req) === '/' + MANIFEST) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          return void res.end(JSON.stringify({ files: licensedFiles(false) }));
        }
        const file = normalize(join(AUDIO_DIR, relPath(req)));
        if (!file.startsWith(AUDIO_DIR + sep)) return next();
        if (!isFile(file)) return notFound(res);
        res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
        res.setHeader('Content-Length', String(statSync(file).size));
        res.setHeader('Cache-Control', 'no-cache');
        if (req.method === 'HEAD') return void res.end();
        createReadStream(file).pipe(res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/audio', (req, res, next) => {
        if (isFile(normalize(join(outDir, 'audio', relPath(req))))) return next();
        notFound(res);
      });
    },
    closeBundle() {
      // (a dev server also fires closeBundle when it shuts down: only a real build writes files)
      if (!isBuild || !outDir) return;
      for (const d of COPY) {
        const src = join(AUDIO_DIR, d);
        if (existsSync(src)) cpSync(src, join(outDir, 'audio', d), { recursive: true });
      }
      const files = licensedFiles(true);
      mkdirSync(join(outDir, 'audio'), { recursive: true });
      writeFileSync(join(outDir, 'audio', MANIFEST), JSON.stringify({ files }));
      const lic = join(AUDIO_DIR, LICENSED);
      if (files.length) {
        cpSync(lic, join(outDir, 'audio', LICENSED), { recursive: true });
        console.log(`[opus-audio-assets] licensed audio copied into ${join(outDir, 'audio', LICENSED)} (never commit / publish it without the licence)`);
      }
    },
  };
}
