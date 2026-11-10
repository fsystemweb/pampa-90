// Props, environment pieces and tiles for all four levels + the intro.
// Everything is generated in code from small recipes (see engine/pix.js).
// One shared palette so any prop can be recoloured by editing a single char.

import { Grid } from '../../engine/pix.js';
import { defineSprite } from '../../engine/sprites.js';
import { PAL } from '../palette.js';

const P = {
  o: PAL.black, k: PAL.ink, w: PAL.white, W: PAL.silver, g: PAL.grey,
  r: PAL.red, R: '#9a2a20', y: PAL.yellow, Y: PAL.goldDark, G: PAL.gold,
  b: PAL.blue, B: PAL.blueDark, t: PAL.teal, T: PAL.tealDark,
  p: PAL.pink, P: '#c05f8a', n: PAL.wood, N: PAL.woodDark,
  d: PAL.dirt, D: PAL.dirtDark, l: PAL.grass, L: PAL.grassDark, e: PAL.grassDeep,
  f: PAL.tree, F: PAL.treeDark, s: PAL.skin, S: PAL.skinDark,
  c: PAL.skyHi, C: PAL.skyDeep, u: '#a85a32', U: '#7a3a20', m: PAL.magenta,
  z: '#e9dca8', // pale straw / thatch
};

const sprite = (g, { outline = true, anchor } = {}) => defineSprite(outline ? g.outline('o') : g, P, anchor);

// deterministic pseudo-random (tiles must be identical on every load)
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// ---------------------------------------------------------------- ball
function ballGrid(frame) {
  const g = new Grid(8, 8);
  g.ellipse(3.5, 3.5, 3.5, 3.5, 'w');
  const mask = g.clone();
  // black patches slide around the sphere as it rolls
  for (const [px, py] of [[2, 2], [6, 3], [3, 6], [0, 5]]) {
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const x = (px + frame * 2 + i) % 8;
        const y = py + j;
        if (mask.get(x, y) === 'w') g.set(x, y, 'k');
      }
    }
  }
  for (let i = 0; i < 8; i++) if (g.get(i, 7) === 'w') g.set(i, 7, 'W'); // underside shade
  g.set(6, 6, 'W');
  return g;
}

const shadowGrid = () => new Grid(10, 3).ellipse(4.5, 1, 4.5, 1, 'k');

// ---------------------------------------------------------------- L1 shaving
const razorGrid = () => {
  const g = new Grid(18, 6);
  g.rect(0, 2, 9, 2, 'n'); // wooden handle
  g.rect(0, 2, 9, 1, 'N');
  g.rect(9, 1, 7, 3, 'W'); // head
  g.rect(9, 3, 7, 1, 'g');
  g.rect(15, 0, 2, 5, 'g'); // guard bar
  g.rect(16, 4, 1, 1, 'w'); // blade glint
  g.set(2, 3, 'n');
  return g;
};

const cupGrid = (water) => {
  const g = new Grid(10, 9);
  g.rect(1, 2, 8, 6, 'W');
  g.rect(1, 2, 1, 6, 'w');
  g.rect(8, 2, 1, 6, 'g');
  g.rect(2, 7, 6, 1, 'g');
  g.rect(0, 1, 10, 1, 'g'); // rim
  if (water) g.rect(2, 2, 6, 2, 'c');
  g.rect(8, 3, 2, 3, 'g'); // handle
  return g;
};

const bucketGrid = (water) => {
  const g = new Grid(20, 18);
  g.line(3, 6, 6, 1, 'g'); // handle arc
  g.line(6, 1, 13, 1, 'g');
  g.line(13, 1, 16, 6, 'g');
  for (let y = 4; y < 17; y++) {
    const inset = Math.floor((y - 4) / 5);
    g.rect(1 + inset, y, 18 - inset * 2, 1, 'p');
    g.set(1 + inset, y, 'w');
    g.set(18 - inset, y, 'P');
    g.set(17 - inset, y, 'P');
  }
  g.rect(0, 4, 20, 2, 'P'); // rim
  g.rect(0, 4, 20, 1, 'p');
  if (water) {
    g.rect(2, 5, 16, 2, 'c');
    g.rect(4, 5, 4, 1, 'w'); // glint
  } else {
    g.rect(2, 5, 16, 2, 'k');
  }
  g.rect(3, 12, 14, 1, 'P'); // band
  return g;
};

/** Ornate gold mirror frame with a transparent glass opening. */
function mirrorFrame(rx, ry) {
  const w = rx * 2 + 12;
  const h = ry * 2 + 16;
  const g = new Grid(w, h);
  const cx = w / 2 - 0.5;
  const cy = h / 2 + 3;
  g.ellipse(cx, cy, rx + 3, ry + 3, 'G'); // frame body
  const n = 36; // scalloped, wavy edge
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? 4.2 : 3;
    g.ellipse(cx + Math.cos(a) * (rx + r), cy + Math.sin(a) * (ry + r), 2, 2, i % 2 ? 'y' : 'G');
  }
  g.ring(cx, cy, rx + 1.5, ry + 1.5, 'Y', 2); // engraving
  g.ellipse(cx, cy, rx - 4, ry - 4, '.'); // glass opening
  g.ring(cx, cy, rx - 3, ry - 3, 'Y', 2);
  g.ring(cx, cy, rx - 4, ry - 4, 'y', 1);
  // top finial + hanging loop
  g.ellipse(cx, 3, 4, 3, 'y');
  g.ring(cx, 3, 3, 2, 'Y', 1);
  // highlights
  for (let i = 0; i < 6; i++) g.set(cx - rx * 0.7 + i, cy - ry * 0.55 - i * 0.6, 'w');
  return g;
}

/** Diagonal glass shine drawn over the reflection. */
function glassShine(rx, ry) {
  const g = new Grid(rx * 2, ry * 2);
  const m = new Grid(rx * 2, ry * 2).ellipse(rx - 0.5, ry - 0.5, rx - 4, ry - 4, 'w');
  for (const [off, th] of [[10, 3], [18, 1]]) {
    for (let y = 0; y < ry * 2; y++) {
      const x = Math.round(off + (ry * 2 - y) * 0.55);
      for (let k = 0; k < th; k++) if (m.get(x + k, y) === 'w') g.set(x + k, y, 'w');
    }
  }
  return g;
}

const woodPost = (h) => {
  const g = new Grid(9, h);
  g.rect(0, 0, 9, h, 'n');
  g.rect(0, 0, 2, h, 'w'); // light edge
  g.rect(0, 0, 9, 1, 'N');
  g.rect(7, 1, 2, h - 1, 'N');
  for (let y = 5; y < h; y += 9) g.rect(2 + (y % 3), y, 3, 1, 'N'); // grain
  g.set(4, 2, 'N');
  return g;
};

// ---------------------------------------------------------------- L2 running
const tuft = () => Grid.fromRows(['.e.e.', 'e.e.e', 'eLeLe']).clone();
const puddle = () => {
  const g = new Grid(20, 7);
  g.ellipse(9.5, 3, 9.5, 3, 'D');
  g.ellipse(9.5, 3, 8, 2, 'd');
  g.ellipse(9.5, 3, 6, 1.4, 'c');
  g.rect(5, 2, 3, 1, 'w');
  return g;
};
const molehill = () => {
  const g = new Grid(16, 9);
  g.ellipse(7.5, 8, 7.5, 7.5, 'D');
  g.rect(0, 8, 16, 1, '.');
  g.ellipse(7.5, 8, 6, 6, 'd');
  g.rect(0, 8, 16, 1, '.');
  g.ellipse(7.5, 6, 2, 1, 'k'); // hole
  g.rect(3, 4, 2, 1, 'z');
  return g;
};

const tree = (big) => {
  const w = big ? 30 : 16;
  const h = big ? 40 : 22;
  const g = new Grid(w, h);
  const tx = Math.floor(w / 2) - 1;
  g.rect(tx, h - (big ? 14 : 8), 3, big ? 14 : 8, 'N');
  g.rect(tx, h - (big ? 14 : 8), 1, big ? 14 : 8, 'n');
  const r = w / 2 - 1;
  g.ellipse(w / 2 - 0.5, r + 1, r, r, 'F');
  g.ellipse(w / 2 - 0.5, r, r - 1.5, r - 1.5, 'f');
  g.ellipse(w / 2 - 3, r - 2, r / 3, r / 3, 'l'); // sunlit patch
  if (big) {
    g.ellipse(w / 2 + 6, r + 4, 4, 3, 'F');
    g.ellipse(w / 2 - 6, r + 5, 3, 2, 'F');
  }
  return g;
};

// ---------------------------------------------------------------- L3 field
const fence = () => {
  const g = new Grid(20, 30);
  g.rect(0, 0, 3, 30, 'n');
  g.rect(0, 0, 1, 30, 'w');
  g.rect(2, 0, 1, 30, 'N');
  g.rect(0, 0, 3, 1, 'N');
  for (const y of [7, 15, 23]) g.line(3, y, 19, y + 1, 'g');
  g.rect(0, 7, 3, 1, 'g');
  g.rect(0, 15, 3, 1, 'g');
  g.rect(0, 23, 3, 1, 'g');
  return g;
};
const goalPost = () => {
  const g = new Grid(6, 52);
  g.rect(0, 0, 6, 52, 'w');
  g.rect(4, 0, 2, 52, 'W'); // simple chalk-white post
  g.rect(0, 6, 6, 1, 'r');
  g.rect(0, 14, 6, 1, 'r');
  return g;
};

// ---------------------------------------------------------------- intro airport
function windsock(frame) {
  const g = new Grid(26, 40);
  g.rect(1, 0, 2, 40, 'g');
  g.rect(0, 0, 4, 2, 'W');
  const droop = frame ? 1 : 0;
  for (let i = 0; i < 6; i++) {
    const hgt = 7 - Math.floor(i / 2);
    g.rect(4 + i * 3, 1 + droop * Math.floor(i / 2), 3, hgt, i % 2 ? 'w' : 'r');
  }
  g.rect(3, 1, 1, 8, 'W');
  return g;
}

const hut = () => {
  const g = new Grid(52, 36);
  g.rect(3, 12, 46, 24, 'z'); // plastered wall
  g.rect(3, 30, 46, 6, 'd'); // dusty base
  for (let x = 0; x < 52; x++) { // corrugated roof
    const c = x % 4 < 2 ? 'W' : 'g';
    g.rect(x, 3 + (x % 4 === 1 ? 0 : 0), 1, 9, c);
  }
  g.rect(0, 2, 52, 1, 'g');
  g.rect(0, 12, 52, 2, 'k');
  g.rect(10, 17, 12, 19, 'N'); // door
  g.rect(11, 18, 10, 18, 'n');
  g.rect(19, 27, 1, 2, 'y');
  g.rect(28, 17, 15, 10, 'N'); // window
  g.rect(29, 18, 13, 8, 'c');
  g.rect(35, 18, 1, 8, 'N');
  g.rect(29, 21, 13, 1, 'N');
  g.rect(14, 13, 24, 5, 'w'); // sign board
  g.rect(14, 13, 24, 1, 'N');
  g.rect(14, 17, 24, 1, 'N');
  g.rect(16, 15, 5, 2, 'b'); g.rect(24, 15, 5, 2, 'r'); g.rect(31, 15, 5, 2, 'b'); // sign "stripes"
  return g;
};

const plane = (frame) => {
  const g = new Grid(36, 16);
  g.rect(4, 6, 24, 6, 'w'); // fuselage
  g.rect(26, 7, 5, 4, 'w');
  g.rect(28, 6, 3, 1, 'r');
  g.rect(4, 11, 24, 1, 'W');
  g.rect(0, 1, 6, 6, 'b'); // tail fin
  g.rect(2, 7, 5, 2, 'B');
  g.rect(18, 7, 6, 2, 'c'); // cockpit
  g.rect(9, 12, 14, 3, 'W'); // wing
  g.rect(10, 14, 12, 1, 'g');
  g.rect(6, 8, 10, 1, 'r'); // livery stripe
  g.rect(31, 5 + frame, 1, 8 - frame * 2, 'g'); // propeller blur
  g.rect(14, 15, 2, 1, 'k'); g.rect(20, 15, 2, 1, 'k'); // wheels
  return g;
};

const cloud = () => {
  const g = new Grid(36, 12);
  g.ellipse(10, 8, 9, 4, 'w');
  g.ellipse(20, 6, 9, 5, 'w');
  g.ellipse(28, 8, 7, 3.5, 'w');
  g.rect(3, 10, 30, 2, 'W');
  return g;
};

const duffel = () => {
  const g = new Grid(20, 12);
  g.rect(1, 3, 18, 8, 'b');
  g.rect(1, 3, 18, 1, 'B');
  g.rect(1, 10, 18, 1, 'B');
  g.rect(8, 3, 4, 8, 'w'); // stripe
  g.line(4, 3, 7, 0, 'k'); g.line(7, 0, 13, 0, 'k'); g.line(13, 0, 16, 3, 'k'); // strap
  g.rect(0, 5, 1, 4, 'B'); g.rect(19, 5, 1, 4, 'B');
  g.rect(2, 5, 3, 2, 'm');
  return g;
};

// ---------------------------------------------------------------- L4 doctor check
function monitor(state) { // 'ok' green / 'bad' red / 'off'
  const g = new Grid(26, 20);
  g.rect(0, 0, 26, 20, 'g');
  g.rect(0, 0, 26, 2, 'W');
  g.rect(2, 3, 22, 11, 'k'); // screen
  const col = state === 'ok' ? 't' : state === 'bad' ? 'r' : 'g';
  if (state !== 'off') {
    // ECG line
    const ys = [8, 8, 8, 5, 11, 7, 8, 8, 8, 8, 4, 12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8];
    ys.forEach((y, i) => g.set(2 + i, y + 1, col));
    g.rect(2, 3, 5, 1, col);
  }
  g.rect(3, 16, 4, 2, state === 'ok' ? 't' : state === 'bad' ? 'r' : 'k'); // LED
  g.rect(10, 16, 6, 2, 'k'); g.rect(18, 16, 6, 2, 'k'); // buttons
  g.rect(0, 19, 26, 1, 'k');
  return g;
}
const cuff = () => {
  const g = new Grid(16, 10);
  g.rect(0, 1, 16, 8, 'b');
  g.rect(0, 1, 16, 1, 'B');
  g.rect(0, 8, 16, 1, 'B');
  g.rect(10, 3, 5, 4, 'w'); // velcro
  g.rect(2, 4, 4, 2, 'W'); // sensor
  g.rect(15, 4, 1, 2, 'k'); // hose port
  return g;
};
const clipboard = () => {
  const g = new Grid(10, 13);
  g.rect(0, 0, 10, 13, 'n');
  g.rect(1, 2, 8, 10, 'w');
  g.rect(3, 0, 4, 3, 'W');
  for (const y of [4, 6, 8, 10]) g.rect(2, y, 6, 1, 'W');
  return g;
};

// ---------------------------------------------------------------- tiles (no outline, seamless)
function tile(base, speck, speck2, seed, count = 10) {
  const g = new Grid(16, 16, base);
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = 1 + Math.floor(r() * 13);
    const y = 1 + Math.floor(r() * 13);
    g.set(x, y, speck);
    g.set(x, y - 1, speck);
    if (r() > 0.5) g.set(x + 1, y, speck2);
  }
  return g;
}

export const props = {
  ball: {
    roll: [0, 1, 2, 3].map((f) => sprite(ballGrid(f), { anchor: [5, 10] })),
    still: sprite(ballGrid(0), { anchor: [5, 10] }),
    shadow: sprite(shadowGrid(), { outline: false, anchor: [5, 2] }),
  },
  shave: {
    razor: sprite(razorGrid(), { anchor: [0, 3] }),
    cup: sprite(cupGrid(false)),
    cupWater: sprite(cupGrid(true)),
    bucket: sprite(bucketGrid(false)),
    bucketWater: sprite(bucketGrid(true)),
    // both anchored on the centre of the glass so they stack at the same point
    mirror: sprite(mirrorFrame(44, 52), { anchor: [50, 64] }),
    mirrorShine: sprite(glassShine(44, 52), { outline: false, anchor: [44, 52] }),
    post: sprite(woodPost(120), { anchor: [5, 0] }),
  },
  run: {
    tuft: sprite(tuft(), { outline: false }),
    puddle: sprite(puddle()),
    molehill: sprite(molehill()),
    tree: sprite(tree(true), { anchor: [15, 40] }),
    treeSmall: sprite(tree(false), { anchor: [8, 22] }),
  },
  field: {
    fence: sprite(fence(), { anchor: [2, 30] }),
    goalPost: sprite(goalPost(), { anchor: [3, 52] }),
  },
  intro: {
    plane: [0, 1].map((f) => sprite(plane(f))),
    cloud: sprite(cloud(), { outline: false }),
    windsock: [0, 1].map((f) => sprite(windsock(f), { anchor: [2, 40] })),
    hut: sprite(hut(), { anchor: [26, 36] }),
    duffel: sprite(duffel(), { anchor: [10, 12] }),
  },
  clinic: {
    monitorOk: sprite(monitor('ok')),
    monitorBad: sprite(monitor('bad')),
    monitorOff: sprite(monitor('off')),
    cuff: sprite(cuff()),
    clipboard: sprite(clipboard()),
  },
  tiles: {
    grass: sprite(tile('l', 'e', 'L', 7), { outline: false }),
    grassDark: sprite(tile('L', 'e', 'l', 21, 8), { outline: false }),
    dirt: sprite(tile('d', 'D', 'z', 13, 8), { outline: false }),
  },
};
