// Humanoid sprite generator. All people (player, friends, keeper, doctor) share
// one rig: figures are posed from joint coordinates on a 22x24 grid, coloured
// from an outfit, then auto-outlined. Everything is original/fictional.
//
// Side view faces RIGHT (flip when drawing). Joint coordinates are in "body
// space" (0..15); OX shifts them to leave room for limbs that swing out.
//
// The hero is a little shorter than everyone else (#106): his figures drop the
// rows in HERO_DROP (one torso row, one thigh row) and slide down to keep the
// feet on the same line, so he stands 2px shorter with the same head.

import { Grid } from '../../engine/pix.js';
import { defineSprite } from '../../engine/sprites.js';
import { PAL } from '../palette.js';

const OX = 3;
const GW = 22;
const GH = 24;
const HERO_DROP = [13, 19]; // grid rows removed from the hero's figures
const HERO_HAIR = PAL.ink; // "black" hair that still reads against the black outline

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
  player: { ...base, hair: HERO_HAIR, drop: HERO_DROP, headband: PAL.yellow },
  // L2 jogging gear: blue windbreaker + navy tracksuit bottoms
  playerJog: {
    ...base, hair: HERO_HAIR, drop: HERO_DROP,
    shirt: PAL.blue, shirtDark: PAL.blueDark, stripe: PAL.teal, stripe2: PAL.white,
    shorts: PAL.ink, shortsDark: PAL.black, long: true, longSleeves: true, headband: PAL.teal,
    shoe: PAL.white, shoeDark: PAL.silver,
  },
  // L4: white top, blue tracksuit pants
  playerTrack: {
    ...base, hair: HERO_HAIR, drop: HERO_DROP,
    stripe: PAL.blue, stripe2: PAL.blue, shorts: PAL.blue, shortsDark: PAL.blueDark,
    long: true, shoe: PAL.white, shoeDark: PAL.silver, headband: PAL.yellow,
  },
  // upside-down abs (#107): white top, blue tracksuit trousers, yellow boots
  playerAbs: {
    ...base, hair: HERO_HAIR, stripe: PAL.blue, stripe2: PAL.blue, shorts: PAL.blue, shortsDark: PAL.blueDark,
    long: true, headband: PAL.yellow,
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

/** Remove the outfit's `drop` rows and slide everything above them down (feet stay put). */
function compact(g, o) {
  if (!o.drop?.length) return g;
  const out = new Grid(g.w, g.h);
  let dy = g.h - 1;
  for (let y = g.h - 1; y >= 0; y--) {
    if (o.drop.includes(y)) continue;
    out.d[dy--] = [...g.d[y]];
  }
  return out;
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
  return compact(g, o);
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
  return compact(g, o);
}

// ---------------------------------------------------------------- prone view (heading push-ups, #108)
const PW = 32; // prone grid
const PH = 20;
const PGROUND = PH - 1; // lowest row: toes and hands rest on it
const P_SHOULDER_X = 21;
/** Thick polyline for near-horizontal limbs: each point fills `th` pixels downwards. */
function band(g, pts, colorAt, th = 2) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
    for (let k = 0; k <= n; k++) {
      const f = k / n;
      const x = x0 + (x1 - x0) * f;
      const y = y0 + (y1 - y0) * f;
      const c = colorAt((i + f) / (pts.length - 1));
      for (let j = 0; j < th; j++) g.set(x, y + j, c);
    }
  }
}

/**
 * Face-down figure, head on the right (facing right), for the heading push-ups.
 * p: { lift: 0..9 (shoulder height above the ground), hands: 'side'|'planted'|'reach',
 *      knee: 0..1 (pull one knee forward, crawl), headDy, mouth }
 * The chest rises (cobra-style explosive push-up) while the hips stay low.
 */
export function proneFigure(o, p) {
  const g = new Grid(PW, PH);
  const lift = p.lift ?? 0;
  const sy = PGROUND - 3 - lift; // shoulder (top of the chest)
  const hipX = 12;
  const hipY = PGROUND - 3 - Math.round(lift * 0.2);
  const SX = P_SHOULDER_X;

  // far arm (darker), drawn first
  const handX = p.hands === 'reach' ? SX + 4 : SX;
  if (p.hands === 'side') band(g, [[SX - 1, sy + 1], [SX - 5, PGROUND - 2], [SX - 8, PGROUND - 1]], armColor(o, true), 1);
  else limb(g, [[SX - 1, sy + 1], [SX - 3 - Math.max(0, 6 - lift) * 0.5, sy + 1 + (PGROUND - sy) * 0.45], [handX - 1, PGROUND]], armColor(o, true));

  // legs: toes on the ground at the left, knees, hips
  const knee = p.knee ?? 0;
  const legC = (dark) => (t) => legColor(o, dark)(1 - t);
  band(g, [[2, PGROUND - 2], [7 + knee * 2, PGROUND - 2 - knee * 2], [hipX, hipY]], legC(true));
  band(g, [[3, PGROUND - 1], [8, PGROUND - 1], [hipX, hipY + 1]], legC(false));
  g.rect(0, PGROUND - 2, 2, 3, 'K'); // shoe soles (toes dug in)
  g.rect(1, PGROUND - 1, 2, 2, 'k');

  // shorts / hips, then the chest as 4px-thick columns from the hips to the shoulders
  g.rect(hipX - 2, hipY, 4, 3, 'c');
  g.rect(hipX - 2, hipY, 4, 1, 'C');
  for (let x = hipX + 1; x <= SX; x++) {
    const f = (x - hipX) / (SX - hipX);
    const y = Math.round(hipY + (sy - hipY) * f);
    g.rect(x, y, 1, 4, 'a');
    g.set(x, y, 'A'); // the back
  }
  const midX = Math.round((hipX + SX) / 2) + 1;
  const midY = Math.round(hipY + (sy - hipY) * ((midX - hipX) / (SX - hipX)));
  g.rect(midX, midY, 1, 4, 'b');
  g.rect(midX + 1, midY, 1, 4, 'y');

  // head (same look as the side view), neck at the shoulders
  const hx = SX + 1;
  const hy = sy - 5 + (p.headDy ?? 0);
  g.rect(SX + 1, sy, 2, 2, 'S');
  g.rect(hx + 1, hy + 1, 5, 5, 's');
  g.set(hx + 6, hy + 4, 's'); // nose
  g.rect(hx, hy, 6, 2, 'h');
  g.rect(hx, hy + 2, 2, 3, 'h');
  if (o.headband) {
    g.rect(hx, hy + 2, 6, 1, 'b');
    g.set(hx - 1, hy + 3, 'b');
  }
  g.set(hx + 2, hy + 4, 'S'); // ear
  g.set(hx + 4, hy + 3, 'e'); // eye
  g.rect(hx + 4, hy + 5, p.mouth === 'open' ? 1 : 2, 1, p.mouth === 'open' ? 'e' : 'S');

  // near arm
  if (p.hands === 'side') band(g, [[SX, sy + 2], [SX - 4, PGROUND - 1], [SX - 7, PGROUND]], armColor(o, false), 1);
  else limb(g, [[SX, sy + 1], [SX - 2 - Math.max(0, 6 - lift) * 0.5, sy + 1 + (PGROUND - sy) * 0.45], [handX, PGROUND]], armColor(o, false));
  return g;
}

export const PRONE_POSES = {
  flat: { lift: 0, hands: 'side' }, // resting on the grass
  load: { lift: 0, hands: 'planted', headDy: 1 }, // chest low, hands set, chin down
  up1: { lift: 3, hands: 'planted', mouth: 'open' }, // explosive push-up: low / mid / high
  up2: { lift: 6, hands: 'planted', mouth: 'open' },
  up3: { lift: 9, hands: 'planted', mouth: 'open' },
  crawl0: { lift: 1, hands: 'reach', knee: 1 },
  crawl1: { lift: 1, hands: 'planted', knee: 0 },
};

// ---------------------------------------------------------------- hanging upside down (abs, #107)
const HW = 34; // hanging grid
const HH = 34;
const KNEE = [14, 9]; // knees hooked over the branch (the sprite's anchor)
export const HANG_CURLS = 8; // curl frames, 0 = hanging straight down, last = chest at the knees
export const HANG_SWING = [-14, -7, 0, 7, 14]; // sway frames: body angle about the knees (degrees)
const dirAt = (a) => [Math.sin(a), Math.cos(a)]; // a = 0 points straight down

/**
 * Hero hanging head down, knees over a branch, ankles tied, hands behind the head.
 * curl 0..1 swings the torso up towards the knees (a crunch); swing rotates the
 * whole hanging body about the knees (degrees).
 */
export function hangFigure(o, curl, swing) {
  const g = new Grid(HW, HH);
  const [kx, ky] = KNEE;
  const al = (swing * Math.PI) / 180;
  const add = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];

  // shins over the branch, boots up and back, rope around the ankles
  const foot = [kx - 5, ky - 6];
  limb(g, [[kx - 1, ky], [foot[0], foot[1] + 1]], () => 'C');
  g.rect(foot[0] - 1, foot[1] - 2, 3, 3, 'k');
  g.rect(foot[0] - 1, foot[1] - 2, 3, 1, 'K');
  g.rect(foot[0] - 1, foot[1] + 1, 3, 1, 'q'); // rope
  g.set(foot[0] + 2, foot[1] + 2, 'q');
  g.set(foot[0] + 3, foot[1] + 3, 'q');

  // thighs hang from the knees to the hips
  const hip = add(KNEE, dirAt(al), 8);
  limb(g, [[kx, ky], hip], () => 'c');
  limb(g, [[kx - 1, ky], [hip[0] - 1, hip[1]]], () => 'C');
  g.rect(kx - 1, ky - 1, 3, 2, 'c'); // knees over the branch

  // torso: curls from straight down (0) to up beside the knees (~140 degrees)
  const a = al + curl * (140 * Math.PI) / 180;
  const d = dirAt(a);
  const n = [Math.cos(a), -Math.sin(a)]; // the chest side
  const sh = add(hip, d, 7);
  for (let i = 0; i <= 10; i++) {
    const p = add(hip, d, (7 * i) / 10);
    g.rect(Math.round(p[0] - 1.5), Math.round(p[1] - 1.5), 4, 4, i < 2 ? 'c' : 'a');
  }
  const mid = add(hip, d, 4);
  g.set(mid[0], mid[1], 'b');
  g.set(mid[0] + n[0], mid[1] + n[1], 'b');

  // head: hair on the crown (away from the neck), face on the chest side
  const c = add(hip, d, 10.5);
  for (let y = Math.floor(c[1] - 3); y <= Math.ceil(c[1] + 3); y++) {
    for (let x = Math.floor(c[0] - 3); x <= Math.ceil(c[0] + 3); x++) {
      const rx = x - c[0];
      const ry = y - c[1];
      if (rx * rx + ry * ry > 8.2) continue;
      const along = rx * d[0] + ry * d[1];
      const side = rx * n[0] + ry * n[1];
      let col = 's';
      if (along > 1.1 || (side < -1.2 && along > -0.6)) col = 'h';
      else if (o.headband && along > 0.3) col = 'b';
      g.set(x, y, col);
    }
  }
  const eye = add(add(c, n, 1.4), d, 0.2);
  g.set(eye[0], eye[1], 'e');
  const mouth = add(add(c, n, 1.6), d, -1.4);
  g.set(mouth[0], mouth[1], 'S');

  // arms: elbows out in front, hands laced behind the head
  const elbow = add(add(sh, n, 4.5), d, 2);
  const hand = add(add(c, n, -1.8), d, -0.5);
  limb(g, [sh, elbow, hand], armColor(o, false));
  return g;
}

function buildHangSet(o) {
  const pal = palFor(o);
  const anchor = [KNEE[0] + 1, KNEE[1] + 1];
  const set = {};
  HANG_SWING.forEach((sw, i) => {
    set[`swing${i}`] = Array.from({ length: HANG_CURLS }, (_, k) => finish(hangFigure(o, k / (HANG_CURLS - 1), sw), pal, anchor));
  });
  return set;
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

// friend's two-hand toss (#108): ball held at the chest, then arms swing up and forward
SIDE_POSES.toss0 = {
  lean: -1,
  armB: [[8, 13], [11, 14]], armF: [[9, 13], [12, 14]],
  legB: { knee: [6, 20], foot: [5, 22] }, legF: { knee: [9, 20], foot: [10, 22] },
};
SIDE_POSES.toss1 = {
  lean: 1,
  armB: [[11, 9], [13, 6]], armF: [[12, 10], [14, 7]],
  legB: { knee: [6, 20], foot: [5, 22] }, legF: { knee: [10, 20], foot: [11, 22] },
  mouth: 'open',
};
SIDE_POSES.catch = {
  armB: [[10, 11], [13, 11]], armF: [[11, 12], [14, 12]],
  legB: { knee: [6, 20], foot: [6, 22] }, legF: { knee: [9, 20], foot: [9, 22] },
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

/** Friend crosser: same moves as the player, plus the two-hand toss and catch (#108). */
function buildFriendSet() {
  const o = OUTFITS.friend;
  const pal = palFor(o);
  const anchor = [OX + 9, GH + 2];
  return {
    ...buildPlayerSet(o),
    toss: ['toss0', 'toss1'].map((n) => finish(sideFigure(o, SIDE_POSES[n]), pal, anchor)),
    catch: finish(sideFigure(o, SIDE_POSES.catch), pal, anchor),
  };
}

/** Prone push-up set: anchor at the shoulders' x on the ground line (outline adds 1px). */
function buildProneSet(o) {
  const pal = palFor(o);
  const anchor = [P_SHOULDER_X + 1, PH + 1];
  const mk = (name) => finish(proneFigure(o, PRONE_POSES[name]), pal, anchor);
  return {
    flat: mk('flat'), load: mk('load'),
    up: [mk('up1'), mk('up2'), mk('up3')],
    crawl: [mk('crawl0'), mk('crawl1')],
  };
}

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
  playerJog: { ...buildPlayerSet(OUTFITS.playerJog, { full: false }), prone: buildProneSet(OUTFITS.playerJog) },
  playerTrack: buildPlayerSet(OUTFITS.playerTrack, { full: false }),
  playerAbs: { hang: buildHangSet(OUTFITS.playerAbs) },
};
