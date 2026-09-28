import { defineConfig } from 'vite';

// `base: './'` makes every asset URL relative, so the built game works when hosted
// from any sub-path (static hosting, artifact pages, GitHub pages, ...).
export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: false },
  preview: { port: 4173 },
  build: { target: 'es2022', sourcemap: true },
});
