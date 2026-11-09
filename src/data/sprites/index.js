// Sprite registry. Every game sprite is generated in code (src/engine/pix.js)
// from small recipes, so there are no image files to load.
//   SPRITES.player.idle / .run[0..3] / .jump / .kick[0..2] / .back / .lying ...
//   frameAt(SPRITES.player.run, time, 10)
import { humans } from './humans.js';

export const SPRITES = { ...humans };

/** Flatten SPRITES into [{ name, frames: [sprite, ...] }] (used by the dev viewer and atlas export). */
export function listSprites(tree = SPRITES, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(tree)) {
    const name = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) out.push({ name, frames: v });
    else if (v && v.rows) out.push({ name, frames: [v] });
    else if (v) out.push(...listSprites(v, name));
  }
  return out;
}
