// Upside-down abs (level key "abs", #107).
// The hero hangs head down from a tree branch, ankles tied, hands behind the head.
// HOLD primary to curl up towards the branch, LET GO to lower back down. A rep
// counts when you let go inside the top zone (curl gauge) after starting from the
// bottom. The coach under the tree counts the tempo: a rep released on his count
// is "clean", off the count it still counts but less, and adds a little sway.
// Sloppy reps (let go below the zone) and bouncing (curling again before reaching
// the bottom) and reps faster than the count make the body swing; while swinging the top zone gets narrower.
// Holding at the top or rushing reps fills the burn meter: when full, the hero
// has to hang and rest for a moment. NEED reps before LIMIT seconds, or fail.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite } from '../engine/sprites.js';
import { drawBar, panel } from '../engine/ui.js';
import { rect, disc } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { HANG_CURLS, HANG_SWING } from '../data/sprites/humans.js';
import { t } from '../data/strings.js';
import { levelOf } from '../data/levels.js';
import { after, clamp, lerp } from '../engine/tween.js';
import { Juice } from '../engine/juice.js';

const S = 2; // sprite scale
const GY = 156; // ground
const KX = 150; // where the knees hook over the branch
const BRANCH = { x0: 30, y0: 38, x1: 318, y1: 70 }; // thick diagonal branch (top edge)
const branchY = (x) => BRANCH.y0 + ((x - BRANCH.x0) / (BRANCH.x1 - BRANCH.x0)) * (BRANCH.y1 - BRANCH.y0);
const KY = Math.round(branchY(KX)) + 3;
const COACH_X = 240;
const GAUGE = { x: 206, y: 74, w: 8, h: 56 };

const NEED = 20; // reps
const LIMIT = 75; // seconds
const START_DELAY = 2.0; // before the coach starts counting
const BEAT = [2.6, 1.8]; // seconds between counts, first rep -> last reps
const CLEAN_WIN = 0.24; // a release this close to a count is clean
const UP_RATE = 1 / 0.6; // curl per second while holding
const DOWN_RATE = 1 / 0.5; // ...and while letting go
const BOTTOM = 0.22; // a rep must start from at or below this curl
const ZONE = 0.78; // top zone starts here when still; narrows with the sway
const ZONE_SWAY = 0.15;
const SWAY_DECAY = 0.32; // per second
const BURN_CLEAN = 0.05; // burn added per clean rep
const BURN_OFF = 0.25; // per off-beat rep (rushing)
const MIN_GAP = 0.75; // reps closer than this many counts apart are too fast (no rep)
const BURN_TOP = 0.6; // per second held at the very top
const BURN_REST = 0.12; // recovered per second hanging at the bottom
const REST_TIME = 3.5; // forced rest when the burn bar fills

export class AbsScene {
  enter() {
    this.juice = new Juice();
    this.t = 0;
    this.elapsed = 0;
    this.curl = 0;
    this.armed = true; // reached the bottom since the last rep
    this.reps = 0;
    this.clean = 0;
    this.lastRepT = -10;
    this.sway = 0;
    this.burn = 0;
    this.restT = 0;
    this.topT = 0;
    this.nextBeat = START_DELAY;
    this.lastBeat = -10;
    this.beatN = 0;
    this.bubbleT = 0;
    this.done = false;
    this.msgKey = null;
    this.msgT = 0;
    this.msgCol = PAL.yellow;
    this.helpT = 7;
    this.prevHeld = false;
    // dappled light spots on the grass and in the leaves (fixed)
    this.spots = Array.from({ length: 14 }, (_, i) => [(i * 71 + 13) % W, GY - 34 + ((i * 29) % 40), 4 + (i % 3) * 2]);
    this.leaves = Array.from({ length: 34 }, (_, i) => [(i * 47 + 11) % (W + 20) - 10, 4 + ((i * 23) % 34), 10 + (i % 4) * 3]);

    music.play(TRACKS.abs);
    playSfx('select');
  }

  say(key, sec = 1.1, col = PAL.yellow) {
    this.msgKey = key;
    this.msgT = sec;
    this.msgCol = col;
  }

  get progress() { return this.reps / NEED; }
  get beat() { return lerp(BEAT[0], BEAT[1], Math.min(1, this.reps / (NEED - 4))); }
  get zoneLo() { return Math.min(0.93, ZONE + ZONE_SWAY * this.sway); }

  update(dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.bubbleT > 0) this.bubbleT -= dt;
    if (this.done || scenes.busy) return;
    if (!this.juice.tick(dt)) return;
    this.elapsed += dt;
    if (this.helpT > 0) this.helpT -= dt;

    // the coach's count
    if (this.elapsed >= this.nextBeat) {
      this.lastBeat = this.nextBeat;
      this.nextBeat += this.beat;
      this.beatN++;
      this.bubbleT = 0.45;
      playSfx('blip', { pitch: this.beatN % 2 ? 1 : 0.8, vol: 0.8 });
    }

    const held = input.down('primary') && this.restT <= 0;
    if (this.restT > 0) {
      this.restT -= dt;
      if (this.restT <= 0) this.say('abs.go', 0.8, PAL.white);
    }

    // bouncing: curling again before reaching the bottom
    if (held && !this.prevHeld && !this.armed && this.curl > BOTTOM + 0.15) {
      this.sway = Math.min(1, this.sway + 0.2);
    }
    if (!held && this.prevHeld && this.restT <= 0) this.release();
    this.prevHeld = held;

    this.curl = clamp(this.curl + (held ? UP_RATE : -DOWN_RATE) * dt);
    if (this.curl <= BOTTOM) this.armed = true;

    // burn: holding at the very top, recovering while hanging
    if (held && this.curl >= 1) this.topT += dt;
    else this.topT = 0;
    if (this.topT > 0.35) this.burn += BURN_TOP * dt;
    if (this.curl <= BOTTOM) this.burn -= BURN_REST * dt;
    this.burn = clamp(this.burn);
    if (this.burn >= 1 && this.restT <= 0) this.rest();

    this.sway = Math.max(0, this.sway - SWAY_DECAY * dt);

    if (this.reps >= NEED) this.finish();
    else if (this.elapsed >= LIMIT) this.fail();
  }

  release() {
    if (!this.armed) return; // no rep in progress (bounced)
    if (this.curl < this.zoneLo) {
      // sloppy: let go below the zone
      if (this.curl > 0.35) {
        this.sway = Math.min(1, this.sway + 0.35);
        this.armed = false;
        this.say('abs.low', 0.9, PAL.red);
        playSfx('back', { vol: 0.6 });
      }
      return;
    }
    this.armed = false;
    if (this.elapsed - this.lastRepT < MIN_GAP * this.beat) {
      // faster than the coach counts: no rep, and the body swings
      this.sway = Math.min(1, this.sway + 0.25);
      this.burn = clamp(this.burn + BURN_OFF / 2);
      this.say('abs.fast', 0.9, PAL.red);
      playSfx('back', { vol: 0.6 });
      return;
    }
    this.lastRepT = this.elapsed;
    this.reps++;
    this.helpT = 0;
    const off = Math.min(Math.abs(this.elapsed - this.lastBeat), Math.abs(this.nextBeat - this.elapsed));
    if (off <= CLEAN_WIN) {
      this.clean++;
      this.burn = clamp(this.burn + BURN_CLEAN);
      this.say('abs.clean', 0.8, PAL.yellow);
      playSfx('coin', { vol: 0.7 });
      this.juice.emit(PAL.yellow, KX + 14, KY + 8, 5, { speed: 30, life: 0.35, gravity: 0, up: 0.3 });
    } else {
      this.burn = clamp(this.burn + BURN_OFF);
      this.sway = Math.min(1, this.sway + 0.15);
      this.say('abs.off', 0.8, PAL.white);
      playSfx('step', { vol: 1.5 });
    }
    // leaves shake loose
    this.juice.emit(PAL.tree, KX + (Math.random() * 40 - 20), KY - 4, 2, { speed: 10, life: 0.9, gravity: 30, up: 0 });
  }

  rest() {
    this.restT = REST_TIME;
    this.burn = 0.45;
    this.armed = false;
    this.say('abs.burn', 1.6, PAL.red);
    playSfx('hurt', { vol: 0.6 });
    this.juice.shake(1, 0.2);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.say('abs.done', 1.8);
    playSfx('win');
    const stars = this.clean >= 16 ? 3 : this.clean >= 10 ? 2 : 1;
    after(1.6, () => {
      scenes.go('results', { level: levelOf('abs'), stars, time: this.elapsed, passed: true }, { wipe: 'iris' });
    });
  }

  fail() {
    if (this.done) return;
    this.done = true;
    this.say('abs.fail', 1.8, PAL.red);
    playSfx('fail');
    after(1.6, () => {
      scenes.go('results', { level: levelOf('abs'), stars: 0, time: this.elapsed, passed: false }, { wipe: 'dither' });
    });
  }

  // ------------------------------------------------------------ draw
  draw(c) {
    const [sx, sy] = this.juice.offset();
    c.save();
    c.translate(sx, sy);
    this.drawBackdrop(c);

    // hero: curl frame + sway frame (pendulum)
    const sw = this.sway * 14 * Math.sin(this.t * 3.4);
    let si = 0;
    for (let i = 1; i < HANG_SWING.length; i++) if (Math.abs(HANG_SWING[i] - sw) < Math.abs(HANG_SWING[si] - sw)) si = i;
    const ci = Math.round(this.curl * (HANG_CURLS - 1));
    const shake = this.restT > 0 && Math.floor(this.t * 20) % 4 === 0 ? 1 : 0;
    drawSprite(c, SPRITES.playerAbs.hang[`swing${si}`][ci], KX + shake, KY, { scale: S });
    // the branch in front of the knees, so they read as hooked over it
    this.drawBranch(c, KX - 10, KX + 10);

    // coach under the tree, counting
    drawSprite(c, this.bubbleT > 0 ? SPRITES.friend.jump : SPRITES.friend.idle, COACH_X, GY - 2, { scale: S, flip: true });
    if (this.bubbleT > 0 && this.elapsed < LIMIT) {
      const n = Math.min(NEED, this.reps + 1);
      panel(c, COACH_X - 4, GY - 74, 34, 14, { fill: PAL.white, border: PAL.white, outline: PAL.ink });
      drawText(c, t('abs.count', { n }), COACH_X + 13, GY - 70, { align: 'center', color: PAL.ink });
    }

    this.juice.draw(c);
    c.restore();
    this.drawGauge(c);
    this.drawHud(c);
  }

  drawBranch(c, xa = BRANCH.x0, xb = BRANCH.x1) {
    for (let x = Math.max(BRANCH.x0, xa); x <= Math.min(BRANCH.x1, xb); x++) {
      const y = Math.round(branchY(x));
      const th = Math.round(lerp(9, 5, (x - BRANCH.x0) / (BRANCH.x1 - BRANCH.x0)));
      rect(c, PAL.wood, x, y, 1, th);
      rect(c, PAL.woodDark, x, y + th - 2, 1, 2);
      if ((x * 7) % 13 === 0) rect(c, PAL.woodDark, x, y + 2, 1, 1); // bark
    }
  }

  drawBackdrop(c) {
    // sky through the leaves, low wall + fence, grass
    rect(c, PAL.sky, 0, 0, W, 96);
    rect(c, PAL.skyHi, 0, 0, W, 30);
    // fence and a low brick wall behind the yard
    for (let x = 4; x < W; x += 26) rect(c, PAL.woodDark, x, 80, 2, 16);
    rect(c, PAL.silver, 0, 84, W, 1);
    rect(c, PAL.silver, 0, 89, W, 1);
    rect(c, PAL.dirt, 0, 96, W, 14);
    rect(c, PAL.dirtDark, 0, 96, W, 1);
    for (let y = 100; y < 110; y += 5) {
      rect(c, PAL.dirtDark, 0, y, W, 1);
      for (let x = ((y / 5) % 2) * 6; x < W; x += 12) rect(c, PAL.dirtDark, x, y - 4, 1, 4);
    }
    rect(c, PAL.grassDark, 0, 110, W, H - 110);
    rect(c, PAL.grass, 0, 118, W, H - 118);
    // tree shadow and dappled sunlight on the grass
    c.globalAlpha = 0.35;
    rect(c, PAL.grassDeep, 0, 124, W, 22);
    c.globalAlpha = 1;
    for (const [x, y, r] of this.spots) rect(c, PAL.grass, x - r, y + 12, r * 2, 2);

    // trunk on the left, the long diagonal branch, the canopy with light through it
    rect(c, PAL.wood, 14, 20, 20, GY - 18);
    rect(c, PAL.woodDark, 14, 20, 4, GY - 18);
    rect(c, PAL.woodDark, 28, 60, 2, 30);
    rect(c, PAL.wood, 8, GY - 4, 32, 6);
    this.drawBranch(c);
    for (const [x, y, r] of this.leaves) {
      disc(c, PAL.treeDark, x, y, r);
      disc(c, PAL.tree, x - 2, y - 2, r - 3);
    }
    for (let i = 0; i < 16; i++) {
      const x = (i * 59 + 7) % W;
      const y = 6 + ((i * 31) % 30);
      rect(c, (i + Math.floor(this.t * 0.5)) % 5 === 0 ? PAL.yellow : PAL.grass, x, y, 2, 2); // light through leaves
    }
  }

  drawGauge(c) {
    const { x, y, w, h } = GAUGE;
    panel(c, x - 2, y - 2, w + 4, h + 4, { fill: PAL.ink });
    const zt = y + Math.round((1 - 1) * h);
    const zb = y + Math.round((1 - this.zoneLo) * h);
    rect(c, this.armed ? PAL.tealDark : PAL.grey, x, zt, w, zb - zt);
    const fill = Math.round(this.curl * h);
    const inZone = this.curl >= this.zoneLo;
    rect(c, inZone ? PAL.yellow : PAL.white, x + 2, y + h - fill, w - 4, fill);
    drawText(c, t('abs.top'), x + w + 4, zt, { color: PAL.white, shadow: PAL.black });
  }

  drawHud(c) {
    drawText(c, t('abs.reps', { n: this.reps, need: NEED }), 8, 8, { color: PAL.white, shadow: PAL.black });
    drawBar(c, 8, 18, 110, 6, this.reps / NEED, { fg: PAL.teal, segments: 4 });
    const left = Math.max(0, Math.ceil(LIMIT - this.elapsed));
    const warn = left <= 15 && Math.floor(this.t * 4) % 2 === 0;
    drawText(c, t('ui.time', { n: left }), W - 8, 8, { align: 'right', color: warn ? PAL.red : PAL.white, shadow: PAL.black });
    drawText(c, t('abs.burnLabel'), 8, 156, { color: PAL.white, shadow: PAL.black });
    drawBar(c, 8, 166, 110, 7, this.burn, { fg: this.burn > 0.75 ? PAL.red : PAL.magenta });
    drawText(c, t('abs.cleanN', { n: this.clean }), W - 8, 166, { align: 'right', color: PAL.yellow, shadow: PAL.black });

    if (this.msgT > 0 && this.msgKey) drawText(c, t(this.msgKey), W / 2, 30, { align: 'center', color: this.msgCol, shadow: PAL.black });
    if (this.helpT > 0 && this.reps === 0) {
      panel(c, 36, 108, 160, 38, { fill: PAL.blueDark }); // below the hero, left of the gauge
      drawText(c, t('abs.help'), 116, 113, { align: 'center', color: PAL.white, maxWidth: 148 });
    }
  }
}
