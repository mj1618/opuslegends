import type { Plugin } from 'vite';
/** Serves assets/audio/ at `audio/` in dev/preview and copies it (licensed/ only if present) into the build. */
export declare function audioAssets(): Plugin;
