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
