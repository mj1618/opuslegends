/**
 * Legacy sprite-set handle (Game constructs one and hands it to the Renderer). Art caching now lives in
 * src/art/core/canvas.ts (`sprite()` / `drawSprite()`); this stays empty so game.ts needs no edit.
 */
export type SpriteSet = Record<string, never>;

export function makeSprites(): SpriteSet {
  return {};
}
