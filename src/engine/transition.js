// Pixel-crisp scene wipes. `drawWipe(ctx, kind, p)` paints the cover for
// progress p: 0 = nothing covered, 1 = fully black.
//
//   iris   - a circle that closes on a focus point (default: screen centre)
//   dither - ordered 4x4 Bayer dissolve to black

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';

export const WIPES = ['iris', 'dither'];

function iris(ctx, p, fx, fy) {
  const r = (1 - p) * Math.hypot(Math.max(fx, W - fx), Math.max(fy, H - fy));
  ctx.fillStyle = PAL.black;
  if (r <= 0) {
    ctx.fillRect(0, 0, W, H);
    return;
  }
  for (let y = 0; y < H; y++) {
    const dy = y + 0.5 - fy;
    if (Math.abs(dy) >= r) {
      ctx.fillRect(0, y, W, 1);
      continue;
    }
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    const l = Math.round(fx) - hw;
    const rt = Math.round(fx) + hw;
    if (l > 0) ctx.fillRect(0, y, l, 1);
    if (rt < W) ctx.fillRect(rt, y, W - rt, 1);
  }
}

// 4x4 Bayer matrix; a pixel is covered when its value < level (0..16).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const tiles = [];
const patterns = new WeakMap(); // ctx -> CanvasPattern[]

function tile(level) {
  if (!tiles[level]) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const g = c.getContext('2d');
    g.fillStyle = PAL.black;
    for (let i = 0; i < 16; i++) if (BAYER[i] < level) g.fillRect(i % 4, (i / 4) | 0, 1, 1);
    tiles[level] = c;
  }
  return tiles[level];
}

function dither(ctx, p) {
  const level = Math.round(p * 16);
  if (level <= 0) return;
  if (level >= 16) {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  let list = patterns.get(ctx);
  if (!list) patterns.set(ctx, (list = []));
  if (!list[level]) list[level] = ctx.createPattern(tile(level), 'repeat');
  ctx.fillStyle = list[level];
  ctx.fillRect(0, 0, W, H);
}

export function drawWipe(ctx, kind, p, focus) {
  if (p <= 0) return;
  if (kind === 'dither') dither(ctx, p);
  else iris(ctx, p, focus?.x ?? W / 2, focus?.y ?? H / 2);
}
