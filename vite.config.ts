import { defineConfig } from 'vite';
// serves assets/audio/ at `audio/` in dev + preview, copies it into the build (licensed/ only if present)
import { audioAssets } from './tools/vite/audioAssets.mjs';

// `base: './'` makes every asset URL relative, so the built game works when hosted
// from any sub-path (static hosting, artifact pages, GitHub pages, ...).
export default defineConfig({
  base: './',
  plugins: [audioAssets()],
  server: { port: 5173, strictPort: false },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    // artlab.html = the procedural-art gallery/sandbox (src/art/lab)
    rollupOptions: { input: { main: 'index.html', artlab: 'artlab.html' } },
  },
});
