// Tiny pixel-sprite helpers: sprites are arrays of strings, one char per pixel,
// mapped to palette colours ('.' or ' ' = transparent).
//
//   const HEART = ['.rr.rr.', 'rrrrrrr', ...];
//   drawMap(ctx, HEART, x, y, { r: PAL.red });
//
// Rendered sprites are cached on an offscreen canvas per (rows, palette).

const cache = new WeakMap(); // rows array -> Map(paletteKey -> canvas)

export function makeSprite(rows, pal) {
  const key = JSON.stringify(pal);
  let byPal = cache.get(rows);
  if (!byPal) cache.set(rows, (byPal = new Map()));
  let cv = byPal.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.max(...rows.map((r) => r.length));
  cv.height = rows.length;
  const g = cv.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  });
  byPal.set(key, cv);
  return cv;
}

/** Draw a string-map sprite. opts: { flip: bool (horizontal), scale: int } */
export function drawMap(ctx, rows, x, y, pal, { flip = false, scale = 1 } = {}) {
  const cv = makeSprite(rows, pal);
  const w = cv.width * scale;
  const h = cv.height * scale;
  if (!flip) {
    ctx.drawImage(cv, Math.round(x), Math.round(y), w, h);
    return;
  }
  ctx.save();
  ctx.translate(Math.round(x) + w, Math.round(y));
  ctx.scale(-1, 1);
  ctx.drawImage(cv, 0, 0, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- sprite objects
// A sprite object is { rows, pal, w, h, ax, ay } where (ax, ay) is the anchor
// (default: bottom-centre, i.e. the feet).

/** Build a sprite object from a pix Grid (or string rows) and a palette. */
export function defineSprite(gridOrRows, pal, anchor) {
  const rows = Array.isArray(gridOrRows) ? gridOrRows : gridOrRows.rows();
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return { rows, pal, w, h, ax: anchor?.[0] ?? Math.floor(w / 2), ay: anchor?.[1] ?? h };
}

/**
 * Draw a sprite object with its anchor at (x, y).
 * opts: { flip, scale, anchor: 'feet' (default) | 'tl' | 'center' }
 */
export function drawSprite(ctx, spr, x, y, { flip = false, scale = 1, anchor = 'feet' } = {}) {
  let ox = spr.ax;
  let oy = spr.ay;
  if (anchor === 'tl') ox = oy = 0;
  else if (anchor === 'center') { ox = spr.w / 2; oy = spr.h / 2; }
  if (flip) ox = spr.w - ox;
  drawMap(ctx, spr.rows, x - ox * scale, y - oy * scale, spr.pal, { flip, scale });
}

/** Pick the frame of an animation (array of sprites) for time t at fps. */
export const frameAt = (frames, t, fps = 8) => frames[Math.floor(t * fps) % frames.length];
