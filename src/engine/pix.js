// Pixel-grid toolkit for authoring sprites in code.
// A Grid is a 2D array of single-char palette keys ('.' = transparent).
// Rotation/flip/outline helpers return new grids; rows() gives the string-map
// form that engine/sprites.js draws.

export class Grid {
  constructor(w, h, fill = '.') {
    this.w = w;
    this.h = h;
    this.d = Array.from({ length: h }, () => Array(w).fill(fill));
  }

  static fromRows(rows) {
    const g = new Grid(Math.max(...rows.map((r) => r.length)), rows.length);
    rows.forEach((r, y) => [...r].forEach((c, x) => { g.d[y][x] = c; }));
    return g;
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  get(x, y) { return this.inside(x, y) ? this.d[y][x] : '.'; }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inside(x, y)) this.d[y][x] = c;
    return this;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  /** Filled ellipse centred on (cx, cy). */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Ellipse outline of the given thickness. */
  ring(cx, cy, rx, ry, c, th = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d1 = ((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2;
        const d2 = ((x - cx) / (rx + 0.35 - th)) ** 2 + ((y - cy) / (ry + 0.35 - th)) ** 2;
        if (d1 <= 1 && d2 > 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Straight line; `thick` extends each point horizontally. */
  line(x0, y0, x1, y1, c, thick = 1) {
    const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      for (let k = 0; k < thick; k++) this.set(x + k, y, c);
    }
    return this;
  }

  /** Copy non-transparent pixels of another grid onto this one. */
  blit(g, x = 0, y = 0) {
    for (let j = 0; j < g.h; j++) {
      for (let i = 0; i < g.w; i++) if (g.d[j][i] !== '.') this.set(x + i, y + j, g.d[j][i]);
    }
    return this;
  }

  clone() {
    const g = new Grid(this.w, this.h);
    g.d = this.d.map((r) => [...r]);
    return g;
  }

  flipH() {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.d[y][x] = this.d[y][this.w - 1 - x];
    return g;
  }

  /** Rotate 90 degrees counter-clockwise (top goes to the left). */
  rotCCW() {
    const g = new Grid(this.h, this.w);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.d[this.w - 1 - x][y] = this.d[y][x];
    return g;
  }

  /** Rotate 90 degrees clockwise (top goes to the right). */
  rotCW() {
    const g = new Grid(this.h, this.w);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.d[x][this.h - 1 - y] = this.d[y][x];
    return g;
  }

  /** New grid, 1px bigger on every side, with an outline char around the shape. */
  outline(c = 'o') {
    const g = new Grid(this.w + 2, this.h + 2);
    g.blit(this, 1, 1);
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        if (g.d[y][x] !== '.') continue;
        const filled = (dx, dy) => {
          const v = this.get(x - 1 + dx, y - 1 + dy);
          return v !== '.';
        };
        if (filled(1, 0) || filled(-1, 0) || filled(0, 1) || filled(0, -1)) g.d[y][x] = c;
      }
    }
    return g;
  }

  rows() { return this.d.map((r) => r.join('')); }
}
