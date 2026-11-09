// Humanoid sprite generator. All people (player, friends, keeper, doctor) share
// one rig: figures are posed from joint coordinates on a 22x24 grid, coloured
// from an outfit, then auto-outlined. Everything is original/fictional.
//
// Side view faces RIGHT (flip when drawing). Joint coordinates are in "body
// space" (0..15); OX shifts them to leave room for limbs that swing out.

import { Grid } from '../../engine/pix.js';
import { defineSprite } from '../../engine/sprites.js';
import { PAL } from '../palette.js';

const OX = 3;
const GW = 22;
const GH = 24;

// ---------------------------------------------------------------- outfits
const base = {
  skin: PAL.skin, skinDark: PAL.skinDark, hair: PAL.woodDark,
  shirt: PAL.white, shirtDark: PAL.silver, stripe: PAL.magenta, stripe2: PAL.yellow,
  shorts: PAL.blue, shortsDark: PAL.blueDark, sock: PAL.teal, sockDark: PAL.tealDark,
  shoe: PAL.yellow, shoeDark: PAL.goldDark, glove: null, long: false, longSleeves: false,
  glasses: false, headband: null, hairStyle: 'short',
};

export const OUTFITS = {
  // the hero: white tee with invented magenta/yellow stripes, blue shorts, yellow boots
  player: { ...base, headband: PAL.yellow },
  // L2 jogging gear: blue windbreaker + navy tracksuit bottoms
  playerJog: {
    ...base, shirt: PAL.blue, shirtDark: PAL.blueDark, stripe: PAL.teal, stripe2: PAL.white,
    shorts: PAL.ink, shortsDark: PAL.black, long: true, longSleeves: true, headband: PAL.teal,
    shoe: PAL.white, shoeDark: PAL.silver,
  },
  // L4: white top, blue tracksuit pants
  playerTrack: {
    ...base, stripe: PAL.blue, stripe2: PAL.blue, shorts: PAL.blue, shortsDark: PAL.blueDark,
    long: true, shoe: PAL.white, shoeDark: PAL.silver, headband: PAL.yellow,
  },
  // L3 friend who crosses the ball: yellow shirt, teal shorts
  friend: {
    ...base, skin: '#c98d62', skinDark: '#9a6644', hair: '#ecd27a',
    shirt: PAL.yellow, shirtDark: PAL.goldDark, stripe: PAL.teal, stripe2: PAL.white,
    shorts: PAL.tealDark, shortsDark: '#0a4f4c', sock: PAL.yellow, sockDark: PAL.goldDark,
    shoe: PAL.white, shoeDark: PAL.silver, headband: null,
  },
  // L3 goalkeeper: teal/green long-sleeve top, black shorts, yellow gloves
  keeper: {
    ...base, skin: '#e0a878', skinDark: '#b07850', hair: PAL.wood,
    shirt: PAL.teal, shirtDark: PAL.tealDark, stripe: PAL.grassDark, stripe2: PAL.yellow,
    shorts: PAL.ink, shortsDark: PAL.black, sock: PAL.tealDark, sockDark: '#0a4f4c',
    shoe: PAL.black, shoeDark: PAL.ink, glove: PAL.yellow, longSleeves: true, headband: null,
  },
  // L4 doctor: white sweatshirt, navy shorts, glasses, grey hair
  doctor: {
    ...base, skin: '#f0c8a0', skinDark: '#c89a78', hair: PAL.silver,
    shirt: PAL.white, shirtDark: PAL.silver, stripe: PAL.white, stripe2: PAL.silver,
    shorts: PAL.blueDark, shortsDark: PAL.ink, sock: PAL.white, sockDark: PAL.silver,
    shoe: PAL.grey, shoeDark: PAL.ink, longSleeves: true, glasses: true, headband: null,
  },
  // teal windbreaker pace-runner (L2 companion)
  runnerTeal: {
    ...base, skin: '#c98d62', skinDark: '#9a6644', hair: PAL.black,
    shirt: PAL.teal, shirtDark: PAL.tealDark, stripe: PAL.white, stripe2: PAL.yellow,
    shorts: PAL.ink, shortsDark: PAL.black, long: true, longSleeves: true,
    shoe: PAL.magenta, shoeDark: PAL.duskDeep,
  },
};

// ---------------------------------------------------------------- palette
function palFor(o) {
  return {
    o: PAL.black, e: PAL.black,
    s: o.skin, S: o.skinDark, h: o.hair,
    a: o.shirt, A: o.shirtDark, b: o.stripe, y: o.stripe2,
    c: o.shorts, C: o.shortsDark, w: o.sock, W: o.sockDark,
    k: o.shoe, K: o.shoeDark, g: PAL.silver, G: o.glove ?? o.skin,
    m: PAL.red, q: PAL.wood, p: PAL.white, t: PAL.skin,
  };
}

// ---------------------------------------------------------------- drawing primitives
/** Draw a 2px-thick limb along a polyline, colouring by progress t (0..1). */
function limb(g, pts, colorAt) {
  let total = 0;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push(d);
    total += d;
  }
  const steps = Math.max(2, Math.ceil(total * 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    let dist = t * total;
    let i = 0;
    while (i < segs.length - 1 && dist > segs[i]) { dist -= segs[i]; i++; }
    const f = segs[i] ? Math.min(1, dist / segs[i]) : 0;
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
    const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
    const c = colorAt(t);
    g.set(x, y, c);
    g.set(x + 1, y, c);
  }
}

const legColor = (o, dark) => (t) => {
  if (o.long) return dark ? 'C' : 'c';
  if (t < 0.32) return dark ? 'C' : 'c';
  if (t < 0.66) return dark ? 'S' : 's';
  return dark ? 'W' : 'w';
};
const armColor = (o, dark) => (t) => {
  if (o.longSleeves) return t < 0.82 ? (dark ? 'A' : 'a') : o.glove ? 'G' : dark ? 'S' : 's';
  if (t < 0.3) return dark ? 'A' : 'a';
  if (t < 0.4) return 'b'; // cuff stripe
  return o.glove && t > 0.8 ? 'G' : dark ? 'S' : 's';
};

function shoe(g, x, y, dark) {
  g.rect(x - 1, y, 4, 2, dark ? 'K' : 'k');
  g.set(x - 1, y + 1, dark ? 'K' : 'k');
}

// ---------------------------------------------------------------- side view
/**
 * Side-view figure facing right.
 * pose: { lean, bob, armB:[elbow,hand], armF:[elbow,hand], legB:{knee,foot}, legF:{knee,foot}, mouth }
 */
export function sideFigure(o, p) {
  const g = new Grid(GW, GH);
  const lean = p.lean ?? 0;
  const bob = p.bob ?? 0;
  const X = (x) => x + OX;
  const pt = ([x, y]) => [X(x), y];

  const arm = (a, shoulderX, dark) => limb(g, [[X(shoulderX + lean), 9 + bob], pt(a[0]), pt(a[1])], armColor(o, dark));
  const leg = (l, hipX, dark) => {
    limb(g, [[X(hipX), 18 + bob], pt(l.knee), [X(l.foot[0]), l.foot[1] - 1]], legColor(o, dark));
    shoe(g, X(l.foot[0]), l.foot[1], dark);
  };

  arm(p.armB, 7, true);
  leg(p.legB, 6, true);

  // torso, shorts, neck
  const tx = X(5 + lean);
  g.rect(tx, 8 + bob, 6, 8, 'a');
  g.rect(tx, 8 + bob, 1, 8, 'A');
  g.rect(tx, 11 + bob, 6, 1, 'b');
  g.rect(tx, 12 + bob, 6, 1, 'y');
  g.rect(X(5), 16 + bob, 6, 3, 'c');
  g.rect(X(5), 16 + bob, 1, 3, 'C');
  g.rect(X(7 + lean), 7 + bob, 2, 1, 'S');

  // head
  const hx = X(5 + lean + (p.headDx ?? 0));
  const hy = 1 + bob + (p.headDy ?? 0);
  g.rect(hx + 1, hy + 1, 5, 5, 's');
  g.set(hx + 6, hy + 4, 's'); // nose
  if (o.hairStyle !== 'bald') {
    g.rect(hx, hy, 6, 2, 'h');
    g.rect(hx, hy + 2, 2, o.hairStyle === 'long' ? 5 : 3, 'h');
    if (o.hairStyle === 'long') g.rect(hx - 1, hy + 3, 1, 4, 'h');
  }
  if (o.headband) {
    g.rect(hx, hy + 2, 6, 1, 'y');
    g.rect(hx, hy + 2, 6, 1, 'b');
    g.set(hx - 1, hy + 3, 'b');
  }
  g.set(hx + 2, hy + 4, 'S'); // ear
  if (o.glasses) g.rect(hx + 3, hy + 3, 3, 1, 'g');
  g.set(hx + 4, hy + 3, 'e'); // eye
  g.rect(hx + 4, hy + 5, p.mouth === 'open' ? 1 : 2, 1, p.mouth === 'open' ? 'e' : 'S');

  leg(p.legF, 8, false);
  arm(p.armF, 8, false);
  p.after?.(g, X);
  return g;
}

// ---------------------------------------------------------------- front / back view
/**
 * Symmetric figure. back=true shows the back of the head.
 * pose: { armL:[elbow,hand], armR:[elbow,hand], legL:{knee,foot}, legR:{knee,foot}, bob, mouth }
 */
export function frontFigure(o, p, back = false) {
  const g = new Grid(GW, GH);
  const bob = p.bob ?? 0;
  const X = (x) => x + OX;
  const pt = ([x, y]) => [X(x), y];

  const arm = (a, sx) => limb(g, [[X(sx), 9 + bob], pt(a[0]), pt(a[1])], armColor(o, false));
  const leg = (l, hx) => {
    limb(g, [[X(hx), 18 + bob], pt(l.knee), [X(l.foot[0]), l.foot[1] - 1]], legColor(o, false));
    shoe(g, X(l.foot[0]), l.foot[1], false);
  };

  leg(p.legL, 5);
  leg(p.legR, 9);

  // torso + shorts (shirt stripes read the same from both sides)
  g.rect(X(4), 8 + bob, 8, 8, 'a');
  g.rect(X(4), 8 + bob, 1, 8, 'A');
  g.rect(X(4), 11 + bob, 8, 1, 'b');
  g.rect(X(4), 12 + bob, 8, 1, 'y');
  if (back) { g.rect(X(7), 9 + bob, 2, 1, 'b'); g.rect(X(7), 10 + bob, 2, 1, 'A'); } // collar/number stub
  g.rect(X(4), 16 + bob, 8, 3, 'c');
  g.rect(X(7), 18 + bob, 2, 1, '.'); // crotch gap
  g.rect(X(7), 7 + bob, 2, 1, 'S');

  // head
  const hx = X(5);
  const hy = 1 + bob;
  g.rect(hx, hy, 6, 6, back ? 'h' : 's');
  if (!back) {
    if (o.hairStyle !== 'bald') {
      g.rect(hx, hy, 6, 2, 'h');
      g.set(hx, hy + 2, 'h');
      g.set(hx + 5, hy + 2, 'h');
    }
    if (o.headband) g.rect(hx, hy + 2, 6, 1, 'b');
    g.set(hx + 1, hy + 3, 'e');
    g.set(hx + 4, hy + 3, 'e');
    if (o.glasses) g.rect(hx, hy + 3, 6, 1, 'g'), g.set(hx + 1, hy + 3, 'e'), g.set(hx + 4, hy + 3, 'e');
    g.rect(hx + 2, hy + 5, 2, 1, p.mouth === 'open' ? 'e' : 'S');
  } else {
    if (o.headband) g.rect(hx, hy + 2, 6, 1, 'b');
    g.rect(hx + 1, hy + 5, 4, 1, 'h');
  }

  arm(p.armL, 2);
  arm(p.armR, 12);
  p.after?.(g, X);
  return g;
}

// ---------------------------------------------------------------- poses
export const SIDE_POSES = {
  stand: {
    armB: [[7, 12], [7, 15]], armF: [[9, 12], [10, 15]],
    legB: { knee: [6, 20], foot: [6, 22] }, legF: { knee: [8, 20], foot: [8, 22] },
  },
  run0: {
    lean: 1,
    armB: [[10, 11], [12, 9]], armF: [[6, 12], [4, 11]],
    legB: { knee: [6, 20], foot: [3, 20] }, legF: { knee: [10, 20], foot: [12, 22] },
  },
  run1: {
    lean: 1, bob: -1,
    armB: [[8, 12], [9, 10]], armF: [[8, 12], [8, 14]],
    legB: { knee: [7, 20], foot: [7, 22] }, legF: { knee: [10, 18], foot: [7, 20] },
  },
  run2: {
    lean: 1,
    armB: [[6, 12], [4, 11]], armF: [[10, 11], [12, 9]],
    legB: { knee: [10, 20], foot: [12, 22] }, legF: { knee: [6, 20], foot: [3, 20] },
  },
  run3: {
    lean: 1, bob: -1,
    armB: [[8, 12], [8, 14]], armF: [[8, 12], [9, 10]],
    legB: { knee: [10, 18], foot: [7, 20] }, legF: { knee: [7, 20], foot: [7, 22] },
  },
  jump: {
    lean: 1,
    armB: [[5, 8], [4, 5]], armF: [[12, 10], [14, 7]],
    legB: { knee: [7, 20], foot: [5, 21] }, legF: { knee: [10, 19], foot: [10, 21] },
    mouth: 'open',
  },
  kick0: { // wind-up: kicking leg swung back
    lean: -1,
    armB: [[4, 11], [2, 13]], armF: [[10, 10], [13, 9]],
    legB: { knee: [8, 20], foot: [9, 22] }, legF: { knee: [6, 20], foot: [2, 19] },
  },
  kick1: { // contact: leg high in front, arms out for balance
    lean: -1,
    armB: [[4, 10], [2, 8]], armF: [[11, 10], [14, 9]],
    legB: { knee: [8, 20], foot: [8, 22] }, legF: { knee: [12, 17], foot: [15, 14] },
    mouth: 'open',
  },
  kick2: { // follow-through
    lean: -2,
    armB: [[3, 10], [1, 8]], armF: [[11, 9], [14, 7]],
    legB: { knee: [8, 20], foot: [8, 22] }, legF: { knee: [12, 15], foot: [14, 11] },
  },
};

// doctor sitting on the grass (facing right; flip to face the other way), holding a clipboard
SIDE_POSES.sit = {
  bob: 3, lean: 1,
  armB: [[9, 16], [11, 17]], armF: [[10, 16], [12, 17]],
  legB: { knee: [10, 19], foot: [11, 22] }, legF: { knee: [11, 21], foot: [14, 22] },
  after: (g, X) => {
    g.rect(X(12), 14, 4, 6, 'q'); // clipboard
    g.rect(X(13), 15, 2, 4, 'p');
    g.rect(X(12), 17, 2, 2, 'S'); // hand over the board
  },
};

export const FRONT_POSES = {
  stand: {
    armL: [[2, 12], [2, 15]], armR: [[13, 12], [13, 15]],
    legL: { knee: [5, 20], foot: [5, 22] }, legR: { knee: [9, 20], foot: [9, 22] },
  },
  jump: {
    armL: [[1, 7], [1, 4]], armR: [[14, 7], [14, 4]],
    legL: { knee: [5, 19], foot: [5, 21] }, legR: { knee: [10, 18], foot: [8, 20] },
    mouth: 'open',
  },
  thumbsUp: {
    armL: [[2, 12], [2, 15]], armR: [[13, 8], [13, 5]],
    legL: { knee: [5, 20], foot: [5, 22] }, legR: { knee: [9, 20], foot: [9, 22] },
    mouth: 'open',
    after: (g, X) => { g.set(X(13), 4, 's'); g.set(X(13), 3, 's'); }, // thumb up
  },
  armsUp: { // used for diving/jumping saves
    armL: [[2, 5], [2, 1]], armR: [[13, 5], [13, 1]],
    legL: { knee: [5, 20], foot: [5, 22] }, legR: { knee: [9, 20], foot: [9, 22] },
    mouth: 'open',
  },
  guard: { // keeper-style ready stance: arms out, knees bent
    armL: [[0, 11], [-1, 14]], armR: [[15, 11], [16, 14]],
    legL: { knee: [4, 20], foot: [4, 22] }, legR: { knee: [10, 20], foot: [10, 22] },
  },
};

// ---------------------------------------------------------------- builders
const finish = (grid, pal, anchor) => defineSprite(grid.outline('o'), pal, anchor);

/** Build the standard set of player-style sprites for an outfit. */
export function buildPlayerSet(outfit, { full = true } = {}) {
  const pal = palFor(outfit);
  const side = (name) => sideFigure(outfit, SIDE_POSES[name]);
  // anchor: feet, centred on the torso (outline adds 1px)
  const anchor = [OX + 9, GH + 2];
  const mk = (g) => finish(g, pal, anchor);
  const set = {
    idle: mk(side('stand')),
    run: ['run0', 'run1', 'run2', 'run3'].map((n) => mk(side(n))),
    jump: mk(side('jump')),
    // lying on the back, head to the left, face up
    lying: finish(side('stand').rotCCW(), pal),
  };
  if (full) {
    set.kick = ['kick0', 'kick1', 'kick2'].map((n) => mk(side(n)));
    set.back = mk(frontFigure(outfit, FRONT_POSES.stand, true));
    set.backJump = mk(frontFigure(outfit, FRONT_POSES.jump, true));
    set.front = mk(frontFigure(outfit, FRONT_POSES.stand, false));
  }
  return set;
}

/** Friend crosser: same moves as the player, plus a throw/cross pose. */
const buildFriendSet = () => buildPlayerSet(OUTFITS.friend);

/** Keeper (front view): ready stance, jump save, and left/right dives (rotated armsUp). */
function buildKeeperSet() {
  const o = OUTFITS.keeper;
  const pal = palFor(o);
  const anchor = [OX + 9, GH + 2];
  const front = (name) => frontFigure(o, FRONT_POSES[name], false);
  return {
    stand: finish(front('stand'), pal, anchor),
    guard: finish(front('guard'), pal, anchor),
    jump: finish(front('armsUp'), pal, anchor),
    diveR: finish(front('armsUp').rotCW(), pal), // toward the keeper's left on screen right
    diveL: finish(front('armsUp').rotCCW(), pal),
  };
}

/** Doctor: standing + sitting (clipboard) in side view, thumbs-up in front view. */
function buildDoctorSet() {
  const o = OUTFITS.doctor;
  const pal = palFor(o);
  const anchor = [OX + 9, GH + 2];
  return {
    stand: finish(sideFigure(o, SIDE_POSES.stand), pal, anchor),
    sit: finish(sideFigure(o, SIDE_POSES.sit), pal, anchor),
    front: finish(frontFigure(o, FRONT_POSES.stand), pal, anchor),
    thumbsUp: finish(frontFigure(o, FRONT_POSES.thumbsUp), pal, anchor),
  };
}

export const humans = {
  friend: buildFriendSet(),
  keeper: buildKeeperSet(),
  doctor: buildDoctorSet(),
  player: buildPlayerSet(OUTFITS.player),
  playerJog: buildPlayerSet(OUTFITS.playerJog, { full: false }),
  playerTrack: buildPlayerSet(OUTFITS.playerTrack, { full: false }),
};
