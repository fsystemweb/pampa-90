// Heading push-ups (level key "header", #108).
// Side view: the hero lies face down on the grass, a friend in front tosses the
// ball at his head. HOLD primary to load the push-up (power bar), RELEASE to
// explode up and head the ball back. Each toss comes at a low, mid or high
// height (marker + ball shadow): the release must catch the ball while the head
// is up, with enough power for that height. Every good header the hero crawls a
// little forward; reach the cones (NEED headers) before LIMIT seconds.
//   perfect: timing in the sweet spot and exactly the right power -> straight back
//            into the friend's hands (quicker next toss) and counts for the stars
//   good:    the header loops back to the friend
//   weak / early / late: the ball gets away and the friend has to fetch it (time)

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite, frameAt } from '../engine/sprites.js';
import { drawBar, panel } from '../engine/ui.js';
import { rect, skyBands } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { t } from '../data/strings.js';
import { levelOf } from '../data/levels.js';
import { after, clamp, lerp, ease } from '../engine/tween.js';
import { Juice } from '../engine/juice.js';

const S = 2; // sprite scale
const HORIZON = 78;
const GY = 152; // ground line: the hero's toes and hands, the friend's feet
const START_X = 70; // hero's shoulders at the start
const STEP = 9; // crawl forward per good header
const NEED = 12; // good headers to reach the cones
const HEAD_DX = 4.5 * S; // head centre from the shoulders
const LINE_X = START_X + NEED * STEP + HEAD_DX; // the cone line: the head reaches it on the last header
const FX = 282; // friend's feet
const HANDS = { dx: -12, dy: -30 }; // friend's hands (ball) from his feet, facing left
const LIMIT = 80; // seconds; not at the cones by then = fail
const BALL_R = 4 * S;

// push-up heights: grid lift of the low / mid / high pose and the power each needs
const LIFT = [3, 6, 9];
const NEED_P = [0.25, 0.5, 0.75];
const LEVEL_KEYS = ['hp.low', 'hp.mid', 'hp.high'];
const LOAD_TIME = 0.75; // seconds to fill the power bar
const FULL_HOLD = 0.6; // seconds at full power before the arms tire
const DRAIN = 0.8; // power lost per second once tired (down to TIRED_MIN)
const TIRED_MIN = 0.3;
// the head is up between UP_FROM and upTo s after the release; sweet spot UP_BEST +- PERFECT_T
const UP_FROM = 0.03;
const UP_TO = [0.4, 0.3]; // window end at the start -> at the end (gets stricter)
const UP_BEST = 0.15;
const PERFECT_T = 0.07;
const FLIGHT = [1.6, 1.1]; // toss flight time, start -> end
const WINDUP = [1.5, 0.9]; // friend's pause before tossing, start -> end (+ up to 0.3 s)

const powerLevel = (p) => (p >= NEED_P[2] ? 2 : p >= NEED_P[1] ? 1 : 0);

export class HeaderScene {
  enter() {
    this.juice = new Juice();
    this.t = 0; // real time
    this.elapsed = 0; // game time (counts towards LIMIT)
    this.x = START_X;
    this.steps = 0;
    this.perfects = 0;
    this.tosses = 0;
    this.misses = 0;
    this.done = false;
    this.msgKey = null;
    this.msgT = 0;
    this.msgCol = PAL.yellow;
    this.helpT = 7; // how-to panel on screen (s), hidden after the first good header

    // push-up state
    this.loading = false;
    this.loadT = 0;
    this.power = 0;
    this.releaseT = -10; // game time of the last release
    this.upLevel = 0; // 0..2: how high that push-up went
    this.crawlT = 0;
    this.crawlWait = 0; // the crawl starts once the push-up is back down
    this.crawlFrom = START_X;

    // ball / friend state
    this.phase = 'ready'; // ready -> flight -> (back | loose) -> ready
    this.phaseT = 1.4;
    this.height = 1;
    this.ball = { x: FX + HANDS.dx, y: GY + HANDS.dy, vx: 0, vy: 0 };
    this.friendX = FX;
    this.friendState = 'hold'; // hold | toss | catch | fetch | return
    this.friendT = 0;
    this.tufts = Array.from({ length: 46 }, (_, i) => [(i * 53) % W, HORIZON + 14 + ((i * 37) % (H - HORIZON - 16))]);

    music.play(TRACKS.header);
    playSfx('select');
  }

  say(key, sec = 1.1, col = PAL.yellow) {
    this.msgKey = key;
    this.msgT = sec;
    this.msgCol = col;
  }

  get progress() { return this.steps / NEED; }
  get upTo() { return lerp(UP_TO[0], UP_TO[1], this.progress); }
  /** Seconds since the last release (how far into the push-up the hero is). */
  get sinceRelease() { return this.elapsed - this.releaseT; }
  get canPush() { return this.crawlT <= 0 && this.sinceRelease > this.upTo + 0.12; }
  get crawling() { return this.crawlT > 0 && this.crawlWait <= 0; }

  head(lift) {
    return { x: this.x + HEAD_DX, y: GY - (6 + lift) * S };
  }

  /** Where the current toss meets the hero's head (just in front of the forehead). */
  get target() {
    const h = this.head(LIFT[this.height]);
    return { x: h.x + 6, y: h.y - 1 };
  }

  update(dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.done || scenes.busy) return;
    if (!this.juice.tick(dt)) return;
    this.elapsed += dt;
    if (this.helpT > 0) this.helpT -= dt;

    this.updatePushUp(dt);
    this.updateCrawl(dt);
    this.updateFriend(dt);
    this.updateBall(dt);

    if (!this.done && this.elapsed >= LIMIT) this.fail();
  }

  // ------------------------------------------------------------ hero
  updatePushUp(dt) {
    const held = input.down('primary');
    if (!this.loading && this.canPush && (input.pressed('primary') || held)) {
      this.loading = true;
      this.loadT = 0;
    }
    if (!this.loading) return;
    this.loadT += dt;
    const tired = this.loadT - LOAD_TIME - FULL_HOLD;
    this.power = tired > 0 ? Math.max(TIRED_MIN, 1 - tired * DRAIN) : Math.min(1, this.loadT / LOAD_TIME);
    if (!held) this.release();
  }

  release() {
    this.loading = false;
    this.releaseT = this.elapsed;
    this.relPower = this.power;
    this.upLevel = powerLevel(this.power);
    this.power = 0;
    playSfx('jump', { pitch: 0.7 + this.upLevel * 0.15 });
    this.juice.emit(PAL.grassDark, this.x - 2, GY - 1, 5, { speed: 30, life: 0.35, gravity: 160 });
    this.juice.emit(PAL.dirt, this.x + 2, GY - 1, 3, { speed: 20, life: 0.3, gravity: 160 });
  }

  updateCrawl(dt) {
    if (this.crawlT <= 0) return;
    if (this.crawlWait > 0) {
      this.crawlWait -= dt;
      return;
    }
    this.crawlT = Math.max(0, this.crawlT - dt);
    const f = 1 - this.crawlT / 0.5;
    this.x = Math.round(lerp(this.crawlFrom, START_X + this.steps * STEP, ease.inOutQuad(f)));
    if (this.crawlT === 0 && this.steps >= NEED) this.finish();
  }

  // ------------------------------------------------------------ friend + ball
  updateFriend(dt) {
    this.friendT += dt;
    const sp = 150;
    if (this.friendState === 'fetch') {
      // wait for the ball to settle a bit, then run to it
      if (this.friendT < 0.35) return;
      const dx = this.ball.x - this.friendX;
      this.friendX += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
      if (Math.abs(this.ball.x - this.friendX) < 6 && Math.abs(this.ball.vx) < 30 && this.ball.y >= this.ballRest - 1) {
        this.friendState = 'return';
        this.friendT = 0;
        playSfx('blip', { pitch: 0.8 });
      }
    } else if (this.friendState === 'return') {
      this.friendX = Math.min(FX, this.friendX + sp * dt);
      this.ball.x = this.friendX + HANDS.dx;
      this.ball.y = GY + HANDS.dy;
      if (this.friendX >= FX) this.ready();
    }
  }

  get ballRest() { return GY - BALL_R; }

  ready() {
    this.phase = 'ready';
    this.friendState = 'hold';
    this.friendT = 0;
    this.phaseT = lerp(WINDUP[0], WINDUP[1], this.progress) + Math.random() * 0.3;
    // first tosses mid height, then low/mid, then anything
    const n = this.tosses;
    this.height = n < 3 ? 1 : this.progress < 0.35 ? (Math.random() < 0.5 ? 0 : 1) : Math.floor(Math.random() * 3);
    this.ball.x = FX + HANDS.dx;
    this.ball.y = GY + HANDS.dy;
  }

  updateBall(dt) {
    const b = this.ball;
    if (this.phase === 'ready') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.toss();
    } else if (this.phase === 'flight') {
      const u = (this.elapsed - this.flightT0) / this.flight;
      const p = this.arc(Math.min(1, u));
      b.x = p.x;
      b.y = p.y;
      if (u >= 1) this.judge();
    } else if (this.phase === 'back') {
      const u = clamp((this.elapsed - this.backT0) / this.backDur);
      const to = { x: FX + HANDS.dx, y: GY + HANDS.dy };
      b.x = lerp(this.backFrom.x, to.x, u);
      b.y = lerp(this.backFrom.y, to.y, u) - this.backArc * 4 * u * (1 - u);
      if (u >= 1) {
        this.friendState = 'catch';
        this.friendT = 0;
        playSfx('blip', { pitch: 1.2 });
        this.phase = 'wait';
        this.phaseT = 0.25;
      }
    } else if (this.phase === 'wait') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) this.ready();
    } else if (this.phase === 'loose') {
      // bouncing and rolling away until the friend picks it up
      if (this.friendState === 'return') return;
      b.vy += 420 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y >= this.ballRest) {
        b.y = this.ballRest;
        if (Math.abs(b.vy) > 40) playSfx('land', { vol: 0.4 });
        b.vy = -Math.abs(b.vy) * 0.45;
        if (Math.abs(b.vy) < 25) b.vy = 0;
        b.vx *= 0.8;
      }
      if (b.y >= this.ballRest - 0.5) b.vx *= Math.pow(0.25, dt);
      b.x = clamp(b.x, 8, W - 8);
    }
  }

  /** Point on the toss arc (u = 0 hands, 1 head; beyond 1 it keeps falling). */
  arc(u) {
    const from = this.from;
    const to = this.target;
    return {
      x: lerp(from.x, to.x, u),
      y: lerp(from.y, to.y, u) - this.arcH * 4 * u * (1 - u),
    };
  }

  toss() {
    this.phase = 'flight';
    this.tosses++;
    this.flightT0 = this.elapsed;
    this.flight = lerp(FLIGHT[0], FLIGHT[1], this.progress);
    this.from = { x: FX + HANDS.dx, y: GY + HANDS.dy };
    this.arcH = 22 + this.height * 4;
    this.friendState = 'toss';
    this.friendT = 0;
    playSfx('swish', { pitch: 0.9 + this.height * 0.1 });
  }

  /** The ball reached the head: decide what happened. */
  judge() {
    const s = this.sinceRelease;
    const releasedForThis = this.releaseT >= this.flightT0 - 0.25;
    let res;
    if (this.loading || !releasedForThis || s < UP_FROM) res = 'late';
    else if (s > this.upTo) res = 'early';
    else if (this.relPower < NEED_P[this.height] - 0.06) res = 'weak';
    else if (Math.abs(s - UP_BEST) <= PERFECT_T && this.upLevel === this.height) res = 'perfect';
    else res = 'good';

    const b = this.ball;
    const h = this.target;
    if (res === 'perfect' || res === 'good') {
      this.steps++;
      this.helpT = 0;
      if (res === 'perfect') this.perfects++;
      this.say(res === 'perfect' ? 'hp.perfect' : 'hp.good', 1.0, res === 'perfect' ? PAL.yellow : PAL.white);
      playSfx('kick', { pitch: res === 'perfect' ? 1.35 : 1.15 });
      if (res === 'perfect') after(0.08, () => playSfx('coin', { vol: 0.6 }));
      this.juice.hitStop(res === 'perfect' ? 0.08 : 0.05);
      this.juice.emit(PAL.white, h.x + 6, h.y, res === 'perfect' ? 8 : 5, { speed: 50, life: 0.3, gravity: 0, up: 0 });
      this.phase = 'back';
      this.backT0 = this.elapsed;
      this.backFrom = { x: b.x, y: b.y };
      this.backDur = res === 'perfect' ? 0.45 : 0.85;
      this.backArc = res === 'perfect' ? 6 : 46;
      this.crawlFrom = this.x;
      this.crawlT = 0.5;
      this.crawlWait = Math.max(0, this.upTo + 0.12 - s);
      return;
    }

    // misses: the ball gets away
    this.misses++;
    this.say(`hp.${res}`, 1.2, PAL.red);
    this.juice.shake(2, 0.2);
    if (res === 'weak') {
      playSfx('save'); // bounces off the shoulders
      b.vx = -70; b.vy = -120;
    } else if (res === 'late') {
      playSfx('hit'); // bonk on the head, still down
      b.y = this.head(0).y - BALL_R;
      b.vx = -55; b.vy = -150;
    } else {
      playSfx('back'); // head already down: the ball flies over him
      b.vx = -95; b.vy = 20;
    }
    this.phase = 'loose';
    this.friendState = 'fetch';
    this.friendT = 0;
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.say('hp.done', 1.8);
    playSfx('win');
    const stars = this.perfects >= 8 ? 3 : this.perfects >= 4 ? 2 : 1;
    after(1.6, () => {
      scenes.go('results', { level: levelOf('header'), stars, time: this.elapsed, passed: true }, { wipe: 'iris' });
    });
  }

  fail() {
    if (this.done) return;
    this.done = true;
    this.loading = false;
    this.say('hp.fail', 1.8, PAL.red);
    playSfx('fail');
    after(1.6, () => {
      scenes.go('results', { level: levelOf('header'), stars: 0, time: this.elapsed, passed: false }, { wipe: 'dither' });
    });
  }

  // ------------------------------------------------------------ draw
  heroSprite() {
    const P = SPRITES.playerJog.prone;
    if (this.crawling) return frameAt(P.crawl, this.t, 8);
    const s = this.sinceRelease;
    if (s >= 0 && s < this.upTo + 0.12) {
      if (s < 0.04 || s > this.upTo) return P.up[0];
      return P.up[this.upLevel];
    }
    return this.loading ? P.load : P.flat;
  }

  draw(c) {
    const [sx, sy] = this.juice.offset();
    c.save();
    c.translate(sx, sy);

    // sky, trees on the horizon, wire fence, grass
    skyBands(c, HORIZON, [PAL.skyHi, PAL.sky]);
    for (let i = 0; i < 9; i++) drawSprite(c, SPRITES.run.treeSmall, 14 + i * 38 + (i % 2) * 9, HORIZON + 2, { anchor: 'feet' });
    drawSprite(c, SPRITES.run.tree, 52, HORIZON + 2);
    drawSprite(c, SPRITES.run.tree, 236, HORIZON + 2);
    rect(c, PAL.grassDark, 0, HORIZON, W, H - HORIZON);
    for (let x = 6; x < W; x += 34) rect(c, PAL.woodDark, x, HORIZON - 9, 2, 12);
    rect(c, PAL.silver, 0, HORIZON - 6, W, 1);
    rect(c, PAL.silver, 0, HORIZON - 2, W, 1);
    // mown stripes, then short grass close to the camera
    for (let i = 0; i < 5; i++) rect(c, i % 2 ? PAL.grass : PAL.grassDark, 0, HORIZON + 4 + i * 16, W, 16);
    rect(c, PAL.grass, 0, GY - 8, W, H - GY + 8);
    for (const [x, y] of this.tufts) drawSprite(c, SPRITES.run.tuft, x, y, { anchor: 'tl' });

    // the cone line (goal), visible from the start
    rect(c, PAL.white, LINE_X - 1, GY - 22, 2, 34);
    drawSprite(c, SPRITES.run.cone, LINE_X, GY - 22);
    drawSprite(c, SPRITES.run.cone, LINE_X, GY + 12, { scale: S });

    // friend (faces left); during a fetch he runs, in the catch he holds the ball
    const F = SPRITES.friend;
    let fs = F.toss[0];
    if (this.friendState === 'toss') fs = this.friendT < 0.2 ? F.toss[1] : F.idle;
    else if (this.friendState === 'catch') fs = F.catch;
    else if (this.friendState === 'fetch' && this.friendT >= 0.35) fs = frameAt(F.run, this.t, 10);
    else if (this.friendState === 'return') fs = frameAt(F.run, this.t, 10);
    else if (this.phase === 'flight' || this.phase === 'back' || this.phase === 'loose') fs = F.idle;
    const fetchFlip = this.friendState === 'fetch' ? this.ball.x < this.friendX : true;
    drawSprite(c, fs, this.friendX, GY - 4, { scale: S, flip: fetchFlip });

    // target marker at the contact point + the ball's shadow
    if (this.phase === 'ready' || this.phase === 'flight') this.drawTarget(c);
    if (this.phase !== 'ready' && this.phase !== 'wait' && this.friendState !== 'return') {
      drawSprite(c, SPRITES.ball.shadow, this.ball.x, GY + 2, { scale: S });
    }

    // hero
    const shake = this.loading && this.loadT > LOAD_TIME + FULL_HOLD ? (Math.floor(this.t * 30) % 2) : 0;
    drawSprite(c, this.heroSprite(), this.x + shake, GY, { scale: S });

    // ball
    const b = this.ball;
    const rolling = this.phase === 'flight' || this.phase === 'back' || this.phase === 'loose';
    const ballSpr = rolling && this.friendState !== 'return' ? frameAt(SPRITES.ball.roll, this.t, 12) : SPRITES.ball.still;
    drawSprite(c, ballSpr, b.x, b.y + BALL_R + S, { scale: S });

    this.juice.draw(c);
    c.restore();
    this.drawHud(c);
  }

  drawTarget(c) {
    const p = this.target;
    const blink = Math.floor(this.t * 6) % 2 === 0;
    const col = blink ? PAL.yellow : PAL.white;
    // brackets around the contact point, then the height label
    const r = BALL_R + 3;
    rect(c, col, p.x - r, p.y - r, 3, 1); rect(c, col, p.x - r, p.y - r, 1, 3);
    rect(c, col, p.x + r - 2, p.y - r, 3, 1); rect(c, col, p.x + r, p.y - r, 1, 3);
    rect(c, col, p.x - r, p.y + r, 3, 1); rect(c, col, p.x - r, p.y + r - 2, 1, 3);
    rect(c, col, p.x + r - 2, p.y + r, 3, 1); rect(c, col, p.x + r, p.y + r - 2, 1, 3);
    drawText(c, t(LEVEL_KEYS[this.height]), p.x + r + 4, p.y - 3, { color: PAL.yellow, shadow: PAL.black });
  }

  drawHud(c) {
    drawText(c, t('hp.count', { n: this.steps, need: NEED }), 8, 8, { color: PAL.white, shadow: PAL.black });
    drawBar(c, 8, 18, 110, 6, this.steps / NEED, { fg: PAL.teal, segments: 4 });
    const left = Math.max(0, Math.ceil(LIMIT - this.elapsed));
    const warn = left <= 15 && Math.floor(this.t * 4) % 2 === 0;
    drawText(c, t('ui.time', { n: left }), W - 8, 8, { align: 'right', color: warn ? PAL.red : PAL.white, shadow: PAL.black });

    // power bar with the low / mid / high marks; the one this toss needs is highlighted
    const bx = 8, by = 166, bw = 110, bh = 7;
    drawText(c, t('hp.power'), bx, by - 10, { color: PAL.white, shadow: PAL.black });
    const showP = this.loading ? this.power : 0;
    drawBar(c, bx, by, bw, bh, showP, { fg: showP >= NEED_P[this.height] ? PAL.yellow : PAL.magenta });
    NEED_P.forEach((p, i) => {
      const x = bx + Math.round(p * bw);
      const on = i === this.height && (this.phase === 'ready' || this.phase === 'flight');
      rect(c, on ? PAL.yellow : PAL.silver, x, by - (on ? 3 : 1), 1, bh + (on ? 5 : 2));
    });

    if (this.msgT > 0 && this.msgKey) {
      drawText(c, t(this.msgKey), W / 2, 34, { align: 'center', color: this.msgCol, shadow: PAL.black, scale: 1 });
    }
    if (this.helpT > 0 && this.steps === 0) {
      panel(c, 70, 46, W - 140, 30, { fill: PAL.blueDark });
      drawText(c, t('hp.help'), W / 2, 51, { align: 'center', color: PAL.white, maxWidth: W - 152 });
    }
  }
}
