// Level 3 - Targeting (M6, issues #29-#35).
// Behind-the-player 2.5D view: a friend crosses the ball from the left, a shrinking
// timing ring sits on the spot where it lands. Press when the ring is closed:
//   perfect / good  -> scissor kick, then a moving reticle sweeps the goal; press again to lock the aim
//   early / late   -> wild shot over the fence
// The keeper dives to a random side after a reaction delay that depends on the strike.
// 5 shots, 3 goals to pass.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite, frameAt } from '../engine/sprites.js';
import { drawBar, flash, panel } from '../engine/ui.js';
import { rect, line, skyBands } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { t } from '../data/strings.js';
import { after, clamp, ease } from '../engine/tween.js';
import { Juice } from '../engine/juice.js';

const HORIZON = 84;
const POSTS = { l: 124, r: 196 };
const GOAL_TOP = 36;
const AIM_Y = 58;
const SHOTS = 5;
const NEED = 3;
const HIT = { x: 168, y: 150 }; // where the ball lands in front of the player (ground point)
const CROSS = { x: 46, y: 116 }; // where the crosser kicks from
const PLAYER = { x: 160, y: 178 }; // feet, scale 2
const KEEPER_X = 160;
const DIVE = 34;

const RING_WINDOW = 1.0; // seconds the ring takes to close
const PERFECT = 0.07;
const GOOD = 0.16;
const WINDOW_END = 0.25; // no press by now = late

const tri = (p) => { const x = ((p % 2) + 2) % 2; return x <= 1 ? x : 2 - x; };

// pixel ring (outline) for the timing ring
function ring(c, col, cx, cy, r) {
  if (r < 1) return;
  for (let a = 0; a < Math.PI * 2; a += 0.09) {
    rect(c, col, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), 1, 1);
  }
}

export class Level3Scene {
  enter() {
    this.juice = new Juice();
    this.t = 0;
    this.elapsed = 0;
    this.shot = 0; // 0..SHOTS-1
    this.goals = 0;
    this.phase = 'ready';
    this.timer = 0;
    this.T = 1.8;
    this.pressed = false;
    this.rating = null;
    this.power = 0.6;
    this.wild = false;
    this.targetX = 160;
    this.aimT = 0;
    this.flightT = 0.5;
    this.kickT = -10; // global time of the last strike
    this.keeperSide = 1;
    this.keeperDelay = 0.3;
    this.keeperReach = 14;
    this.outcome = null;
    this.popup = null;
    this.popupT = 0;
    this.flashT = 0;
    this.netT = 0;
    this.done = false;
    this.lastResult = null;

    music.play(TRACKS.level3);
    playSfx('select');
    this.startShot();
  }

  /** 0..1 difficulty across the five shots. */
  get ramp() { return this.shot / (SHOTS - 1); }

  startShot() {
    this.phase = 'ready';
    this.timer = 0;
    this.pressed = false;
    this.rating = null;
    this.wild = false;
    this.outcome = null;
    this.T = 1.8 - 0.35 * this.ramp; // seconds from the cross to the landing
    this.keeperReach = 13 + 2 * this.shot;
    this.keeperSide = Math.random() < 0.5 ? -1 : 1;
  }

  update(dt) {
    this.t += dt;
    this.elapsed += dt;
    this.popupT = Math.max(0, this.popupT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.netT = Math.max(0, this.netT - dt);
    if (this.done || scenes.busy) return;
    if (!this.juice.tick(dt)) return;

    switch (this.phase) {
      case 'ready':
        this.timer += dt;
        if (this.timer >= 1.0) this.startCross();
        break;
      case 'cross':
        this.timer += dt;
        if (!this.pressed && (input.pressed('primary') || input.tap())) this.strike(this.timer - this.T);
        else if (!this.pressed && this.timer > this.T + WINDOW_END) this.strike(this.timer - this.T, true);
        break;
      case 'aim':
        this.aimT += dt;
        if (input.pressed('primary') || input.tap()) this.lock();
        else if (this.aimT >= 2.0) this.lock();
        break;
      case 'flight':
        this.timer += dt;
        if (this.timer >= this.flightT) this.resolve();
        break;
      case 'result':
        this.timer += dt;
        if (this.timer >= 1.5) this.nextShot();
        break;
    }
  }

  startCross() {
    this.phase = 'cross';
    this.timer = 0;
    playSfx('select', { pitch: 0.8 });
  }

  /** The player presses: diff = pressTime - landing time (negative = early). */
  strike(diff, auto = false) {
    this.pressed = true;
    let power = 0;
    if (auto || diff > GOOD) {
      this.rating = 'late';
      this.wild = true;
    } else if (diff < -GOOD) {
      this.rating = 'early';
      this.wild = true;
    } else if (Math.abs(diff) <= PERFECT) {
      this.rating = 'perfect';
      power = 1;
    } else {
      this.rating = 'good';
      power = 0.6;
    }
    this.popup = { key: `l3.${this.rating}`, color: this.rating === 'perfect' ? PAL.yellow : this.rating === 'good' ? PAL.teal : PAL.red };
    this.popupT = 1.0;
    this.kickT = this.t;

    if (this.wild) {
      playSfx('blip');
      this.targetX = 300;
      this.flightT = 0.5;
      this.phase = 'flight';
      this.timer = 0;
      this.tauArrival = 0.5;
      return;
    }

    // a clean strike: the keeper reacts to the power of the ball
    this.power = power;
    this.keeperDelay = 0.15 + 0.35 * (1 - power);
    if (power >= 1) {
      this.flashT = 0.12;
      this.juice.hitStop(0.1);
      playSfx('kick', { pitch: 1.2 });
    } else {
      playSfx('kick');
    }
    this.phase = 'aim';
    this.aimT = 0;
  }

  lock() {
    if (this.phase !== 'aim') return;
    this.targetX = 124 + 72 * tri(this.aimT); // where the reticle is now
    this.flightT = this.power >= 1 ? 0.36 : 0.5;
    this.tauArrival = this.aimT + this.flightT;
    this.phase = 'flight';
    this.timer = 0;
    playSfx('select', { pitch: 1.5, vol: 0.6 });
  }

  /** Keeper x at `tau` seconds after the kick. */
  keeperX(tau) {
    if (tau < this.keeperDelay) return KEEPER_X;
    const p = clamp((tau - this.keeperDelay) / 0.3);
    return KEEPER_X + this.keeperSide * DIVE * ease.outQuad(p);
  }

  resolve() {
    let outcome;
    const ax = this.targetX;
    if (this.wild || ax < POSTS.l - 1 || ax > POSTS.r + 1) outcome = 'over';
    else if (Math.abs(ax - POSTS.l) <= 2 || Math.abs(ax - POSTS.r) <= 2) outcome = 'post';
    else outcome = Math.abs(ax - this.keeperX(this.tauArrival)) <= this.keeperReach ? 'saved' : 'goal';

    this.outcome = outcome;
    this.phase = 'result';
    this.timer = 0;
    if (outcome === 'goal') {
      this.goals++;
      this.netT = 0.7;
      this.juice.shake(2, 0.3);
      playSfx('goal');
      this.say('l3.goal', 'l3.cow');
    } else if (outcome === 'saved') {
      playSfx('save');
      this.say('l3.saved');
    } else if (outcome === 'post') {
      playSfx('post');
      this.say('l3.post');
    } else {
      playSfx('fail', { vol: 0.5 });
      this.say('l3.over');
    }
  }

  say(key, extra) {
    this.lastResult = { key, extra };
  }

  nextShot() {
    if (this.shot >= SHOTS - 1) {
      this.finish();
      return;
    }
    this.shot++;
    this.startShot();
  }

  finish() {
    this.done = true;
    const passed = this.goals >= NEED;
    const stars = passed ? Math.max(1, this.goals - 2) : 0; // 3 goals = 1 star, 5 goals = 3 stars
    after(0.8, () => {
      scenes.go('results', { level: 3, stars, time: this.elapsed, passed }, { wipe: passed ? 'iris' : 'dither' });
    });
  }

  // ------------------------------------------------------------ draw
  /** Position of the ball during the cross (t = 0..1). */
  ballAt(p) {
    const x = CROSS.x + (HIT.x - CROSS.x) * p;
    const ground = CROSS.y + (HIT.y - CROSS.y) * p;
    const h = Math.sin(Math.PI * p) * 34;
    return { x, ground, y: ground - h, scale: p < 0.5 ? 1 : 2 };
  }

  draw(c) {
    const [sx, sy] = this.juice.offset();
    c.save();
    c.translate(sx, sy);

    // sky with a few trees on the horizon
    skyBands(c, HORIZON, [PAL.skyHi, PAL.sky]);
    for (const x of [14, 56, 268, 304]) drawSprite(c, SPRITES.run.treeSmall, x, HORIZON + 2, { anchor: 'feet' });

    // converging field: stripes get taller toward the camera
    const edges = [HORIZON, 92, 100, 110, 122, 138, 156, 180];
    edges.forEach((y, i) => rect(c, i % 2 ? PAL.grassDark : PAL.grass, 0, y, W, (edges[i + 1] ?? H) - y));

    // fence lines converging to the goal posts
    for (let s = 0; s <= 1.001; s += 0.25) {
      drawSprite(c, SPRITES.field.fence, lerp(-6, POSTS.l - 2, s), lerp(H, HORIZON + 2, s), { scale: 1 });
      drawSprite(c, SPRITES.field.fence, lerp(W + 6, POSTS.r + 2, s), lerp(H, HORIZON + 2, s), { scale: 1 });
    }
    line(c, PAL.silver, 0, 150, POSTS.l - 2, HORIZON + 4);
    line(c, PAL.silver, W - 1, 150, POSTS.r + 2, HORIZON + 4);

    // goal: net, crossbar and posts (the net ripples after a goal)
    const rip = this.netT > 0 ? Math.round(Math.sin(this.t * 40) * 2) : 0;
    for (let x = POSTS.l; x <= POSTS.r; x += 4) rect(c, PAL.white, x, GOAL_TOP + rip, 1, HORIZON - GOAL_TOP);
    for (let y = GOAL_TOP; y <= HORIZON; y += 4) rect(c, PAL.white, POSTS.l, y, POSTS.r - POSTS.l, 1);
    rect(c, PAL.white, POSTS.l, GOAL_TOP - 1, POSTS.r - POSTS.l + 2, 2);
    drawSprite(c, SPRITES.field.goalPost, POSTS.l, HORIZON + 2, { anchor: 'feet' });
    drawSprite(c, SPRITES.field.goalPost, POSTS.r, HORIZON + 2, { anchor: 'feet' });

    // the keeper: stands, or dives to his side
    const kx = this.keeperNow();
    const diving = Math.abs(kx - KEEPER_X) > 6;
    const keeperSprite = diving ? (kx < KEEPER_X ? SPRITES.keeper.diveL : SPRITES.keeper.diveR) : SPRITES.keeper.stand;
    drawSprite(c, keeperSprite, kx, HORIZON + 2, { anchor: 'feet' });

    // the crosser on the left
    const crossing = this.phase === 'cross' && this.timer < 0.45;
    const friend = crossing ? SPRITES.friend.kick[Math.floor(this.timer * 8) % 3] : SPRITES.friend.front;
    drawSprite(c, friend, CROSS.x - 12, CROSS.y + 4, { anchor: 'feet' });

    // the ball, while crossing, and its shadow on the ground
    if (this.phase === 'cross') {
      const b = this.ballAt(clamp(this.timer / this.T));
      drawSprite(c, SPRITES.ball.shadow, b.x, b.ground, { scale: b.scale });
      drawSprite(c, frameAt(SPRITES.ball.roll, this.t, 14), b.x, b.y, { scale: b.scale });
      this.drawRing(c);
    } else if (this.phase === 'aim') {
      drawSprite(c, SPRITES.ball.shadow, HIT.x, HIT.y, { scale: 2 });
      drawSprite(c, SPRITES.ball.still, HIT.x, HIT.y - 22, { scale: 2 });
    } else if (this.phase === 'flight') {
      this.drawFlight(c);
    }

    // the player from behind (kicks in front when striking)
    const jump = this.jumpHeight();
    const since = this.sinceKick();
    const strike = since >= 0 && since < 0.45; // the scissor kick frames
    const sprite = strike
      ? SPRITES.player.kick[Math.min(2, Math.floor((since / 0.45) * 3))]
      : jump > 0 ? SPRITES.player.jump : SPRITES.player.back;
    drawSprite(c, sprite, PLAYER.x, PLAYER.y - jump, { scale: 2 });

    // reticle while aiming
    if (this.phase === 'aim') this.drawReticle(c);

    this.juice.draw(c);
    c.restore();

    if (this.flashT > 0) flash(c, PAL.white, 0.35);
    this.drawHud(c);
  }

  /** Keeper x on screen: waits at the centre until the strike, then dives. */
  keeperNow() {
    if (!this.pressed) return KEEPER_X;
    return this.keeperX(this.t - this.kickT);
  }

  /** Seconds since the strike, or -1 if none happened this shot. */
  sinceKick() {
    return this.pressed ? this.t - this.kickT : -1;
  }

  /** Height of the player's jump after the strike (a half-sine over 0.5 s). */
  jumpHeight() {
    const since = this.sinceKick();
    if (since < 0 || since > 0.5) return 0;
    return Math.sin((since / 0.5) * Math.PI) * 26;
  }

  drawRing(c) {
    const rem = this.T - this.timer;
    if (rem > RING_WINDOW || rem < -0.2) return;
    const r = Math.max(2, 22 * (rem / RING_WINDOW));
    const perfect = Math.abs(rem) <= PERFECT;
    ring(c, perfect ? PAL.yellow : PAL.white, HIT.x, HIT.y, r);
  }

  drawFlight(c) {
    const p = clamp(this.timer / this.flightT);
    const x = HIT.x + (this.targetX - HIT.x) * ease.outQuad(p);
    const y = (HIT.y - 22) + (AIM_Y - (HIT.y - 22)) * p;
    const scale = p < 0.5 ? 2 : 1;
    drawSprite(c, frameAt(SPRITES.ball.roll, this.t, 16), x, y, { scale });
  }

  drawReticle(c) {
    const x = Math.round(124 + 72 * tri(this.aimT));
    const y = AIM_Y;
    const col = PAL.yellow;
    rect(c, col, x - 5, y - 5, 4, 1);
    rect(c, col, x + 2, y - 5, 4, 1);
    rect(c, col, x - 5, y + 5, 4, 1);
    rect(c, col, x + 2, y + 5, 4, 1);
    rect(c, col, x - 5, y - 5, 1, 4);
    rect(c, col, x + 4, y - 5, 1, 4);
    rect(c, col, x - 5, y + 2, 1, 4);
    rect(c, col, x + 4, y + 2, 1, 4);
  }

  drawHud(c) {
    drawText(c, t('l3.round', { n: this.shot + 1, total: SHOTS }), 8, 16, { color: PAL.white, shadow: PAL.black });
    drawText(c, t('l3.score', { n: this.goals, need: NEED }), W - 8, 8, { align: 'right', color: PAL.white, shadow: PAL.black });
    // shot pips: filled for shots already taken
    for (let i = 0; i < SHOTS; i++) {
      const done = i < this.shot || (i === this.shot && this.phase === 'result');
      rect(c, done ? PAL.yellow : PAL.grey, 8 + i * 8, 28, 6, 4);
    }

    if (this.popup && this.popupT > 0 && this.phase !== 'result') {
      drawText(c, t(this.popup.key), W / 2, 112, { align: 'center', color: this.popup.color, shadow: PAL.black, scale: 1 });
    }
    if (this.phase === 'result' && this.lastResult) {
      const big = this.outcome === 'goal' ? 2 : 1;
      const label = t(this.lastResult.key);
      const w = label.length * 6 * big;
      panel(c, Math.round(W / 2 - w / 2 - 6), 60, w + 12, 14 * big, { fill: PAL.blueDark });
      drawText(c, label, W / 2, 62, { align: 'center', color: this.outcome === 'goal' ? PAL.yellow : PAL.white, shadow: PAL.black, scale: big });
      if (this.lastResult.extra) drawText(c, t(this.lastResult.extra), W / 2, 92, { align: 'center', color: PAL.white, shadow: PAL.black });
    }
    if (this.phase === 'aim') drawBar(c, 8, 170, 304, 4, 1 - this.aimT / 2, { fg: PAL.yellow, border: PAL.grey });
  }
}

const lerp = (a, b, p) => a + (b - a) * p;
