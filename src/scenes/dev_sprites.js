// Dev-only sprite viewer: index.html#scene=dev-sprites (&page=N, arrows to flip, Space = toggle bg).
import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { drawText } from '../engine/font.js';
import { drawSprite, frameAt } from '../engine/sprites.js';
import { input } from '../engine/input.js';
import { listSprites } from '../data/sprites/index.js';

const COLS = 5;
const ROWS = 2;
const CELL_W = Math.floor(W / COLS);
const CELL_H = 86;

export class DevSpritesScene {
  enter() {
    this.t = 0;
    this.items = listSprites();
    this.per = COLS * ROWS;
    this.pages = Math.ceil(this.items.length / this.per);
    const p = Number(new URLSearchParams(location.hash.slice(1)).get('page'));
    this.page = Number.isFinite(p) ? Math.min(this.pages - 1, Math.max(0, p)) : 0;
    this.bg = 0;
  }

  update(dt) {
    this.t += dt;
    if (input.pressed('right')) this.page = (this.page + 1) % this.pages;
    if (input.pressed('left')) this.page = (this.page + this.pages - 1) % this.pages;
    if (input.pressed('primary')) this.bg = (this.bg + 1) % 3;
  }

  draw(c) {
    c.fillStyle = [PAL.sky, PAL.grass, PAL.ink][this.bg];
    c.fillRect(0, 0, W, H);
    const txt = this.bg === 2 ? PAL.white : PAL.black;
    const slice = this.items.slice(this.page * this.per, (this.page + 1) * this.per);
    slice.forEach((it, i) => {
      const cx = (i % COLS) * CELL_W + CELL_W / 2;
      const cy = 12 + Math.floor(i / COLS) * CELL_H;
      const f = frameAt(it.frames, this.t, 8);
      const s = Math.min(2, Math.floor(60 / Math.max(f.w, f.h)) || 1);
      drawSprite(c, f, cx, cy + 56, { scale: Math.max(1, s) });
      const [a, ...rest] = it.name.split('.');
      drawText(c, a, cx, cy + 60, { align: 'center', color: txt });
      drawText(c, rest.join('.') + (it.frames.length > 1 ? ` x${it.frames.length}` : ''), cx, cy + 69, { align: 'center', color: txt });
    });
    drawText(c, `${this.page + 1}/${this.pages}`, W - 4, 2, { align: 'right', color: txt });
  }
}
