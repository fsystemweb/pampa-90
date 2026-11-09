// Small pixel-drawing helpers shared by scenes (everything snaps to whole pixels).
import { W } from '../data/config.js';

export const rect = (c, col, x, y, w, h) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

/** Filled pixel disc. */
export function disc(c, col, cx, cy, r) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const hw = Math.round(Math.sqrt(r * r - y * y));
    c.fillRect(Math.round(cx) - hw, Math.round(cy) + y, hw * 2 + 1, 1);
  }
}

/** 1px line. */
export function line(c, col, x0, y0, x1, y1) {
  c.fillStyle = col;
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }
}

/** Dithered seam between two flat colour bands (3 rows ending at y). */
export function seam(c, y, top, bottom) {
  for (let x = 0; x < W; x++) {
    if (x % 4 === 0) rect(c, bottom, x, y - 2, 1, 1);
    if (x % 2 === 0) rect(c, bottom, x, y - 1, 1, 1);
    if (x % 2 === 1) rect(c, top, x, y, 1, 1);
  }
}

/** Sky made of equal flat bands with dithered seams, from 0 to `horizon`. */
export function skyBands(c, horizon, colors) {
  const h = horizon / colors.length;
  colors.forEach((col, i) => rect(c, col, 0, Math.round(i * h), W, Math.ceil(h) + 1));
  for (let i = 1; i < colors.length; i++) seam(c, Math.round(i * h), colors[i - 1], colors[i]);
}
