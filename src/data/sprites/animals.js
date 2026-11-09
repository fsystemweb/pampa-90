// Animals + warning icons: Holstein cow (L2 obstacle) with walk cycle,
// plus the "!" warning sign and speech-bubble tail used before a cow arrives.

import { Grid } from '../../engine/pix.js';
import { defineSprite } from '../../engine/sprites.js';
import { PAL } from '../palette.js';

const COW_PAL = {
  o: PAL.black, w: PAL.white, W: PAL.silver, k: '#2b2a3a', p: PAL.pink,
  h: '#e9dca8', d: '#4e4a52', e: PAL.black, y: PAL.yellow, r: PAL.red,
};

/**
 * Holstein cow facing right on a 30x20 grid (feet on the bottom row).
 * legs: x-offsets of [rearNear, rearFar, frontNear, frontFar] feet.
 */
function cowGrid({ legs = [0, 0, 0, 0], headDy = 0, moo = false, bob = 0 } = {}) {
  const g = new Grid(30, 20);

  const leg = (x, dx, far) => {
    g.line(x, 11 + bob, x + dx, 17, far ? 'W' : 'w', 2);
    g.rect(x + dx, 17, 2, 2, 'd');
  };
  // far legs first so near legs overlap them
  leg(10, legs[1], true);
  leg(17, legs[3], true);

  // tail
  g.line(6, 5 + bob, 3, 11 + bob, 'w');
  g.rect(2, 11 + bob, 2, 3, 'k');

  // body
  g.rect(6, 4 + bob, 16, 8, 'w');
  g.set(6, 4 + bob, '.');
  g.set(21, 4 + bob, '.');
  g.set(6, 11 + bob, '.');
  g.set(21, 11 + bob, '.');
  g.rect(7, 11 + bob, 14, 1, 'W'); // belly shade
  // spots
  g.rect(8, 5 + bob, 4, 3, 'k');
  g.rect(9, 8 + bob, 2, 1, 'k');
  g.rect(15, 6 + bob, 5, 4, 'k');
  g.rect(14, 8 + bob, 1, 1, 'k');
  g.rect(12, 9 + bob, 2, 2, 'k');
  // udder
  g.rect(11, 12 + bob, 3, 2, 'p');

  leg(7, legs[0], false);
  leg(19, legs[2], false);

  // neck + head
  const hy = headDy + bob;
  g.rect(20, 3 + hy, 3, 8, 'w');
  g.rect(22, 3 + hy, 6, 6, 'w');
  g.rect(22, 3 + hy, 2, 3, 'k'); // eye patch / ear side
  g.set(24, 5 + hy, 'e'); // eye
  g.rect(26, 6 + hy, 4, 4, 'p'); // snout
  g.set(28, 7 + hy, 'e'); // nostril
  if (moo) g.rect(27, 9 + hy, 3, 1, 'e'); // open mouth
  g.rect(24, 1 + hy, 1, 2, 'h'); // horn
  g.rect(21, 2 + hy, 2, 1, 'k'); // ear
  return g;
}

const cow = (opts) => defineSprite(cowGrid(opts).outline('o'), COW_PAL);

// 4-frame walk: legs swing in opposite pairs, body bobs on the passing frames
const WALK = [
  { legs: [2, -2, -2, 2], bob: 0 },
  { legs: [0, 0, 0, 0], bob: -1 },
  { legs: [-2, 2, 2, -2], bob: 0 },
  { legs: [0, 0, 0, 0], bob: -1 },
];

// ---------------------------------------------------------------- icons
const warnGrid = () => {
  const g = new Grid(11, 10);
  for (let y = 0; y < 10; y++) {
    const hw = Math.floor(y / 2);
    g.rect(5 - hw, y, hw * 2 + 1, 1, 'y');
  }
  g.rect(5, 2, 1, 4, 'e'); // "!"
  g.rect(5, 7, 1, 1, 'e');
  return g;
};

const bubbleTail = () => Grid.fromRows([
  'wwwww..',
  '.wwww..',
  '..www..',
  '...ww..',
  '....w..',
]);

export const animals = {
  cow: {
    stand: cow({}),
    walk: WALK.map((f) => cow(f)),
    moo: cow({ headDy: -2, moo: true }),
  },
  icons: {
    warn: defineSprite(warnGrid().outline('o'), COW_PAL, [6, 12]),
    bubbleTail: defineSprite(bubbleTail().outline('o'), COW_PAL, [0, 0]),
  },
};
