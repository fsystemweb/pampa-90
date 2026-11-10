// Level 2 - Resistance (M5, issues #25-#28).
// Side-scrolling jog through the pampas. Hop (primary / tap) over things, and
// switch between the two lanes with up (far) / down (near). Cows cross the path:
// a "!" and a MOO bubble warn one second before they arrive. Clean running fills
// the stamina bar; every hit drains it and makes you stumble. Full bar = finish.

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
import { tween, after } from '../engine/tween.js';
import { Juice } from '../engine/juice.js';

const HORIZON = 72;
const LANE_Y = [124, 152]; // far, near (feet line)
const PX = 74; // player's x (feet)
const GOAL = 100; // stamina to finish
const RUN_TIME = 75; // seconds of clean running to finish
const GAIN = GOAL / RUN_TIME; // stamina per second
const HOP_V = 190; // hop launch speed (px/s)
const GRAV = 560;

// fixed parallax layers for the scenery
const TREES_FAR = Array.from({ length: 8 }, (_, i) => i * 70);
const TREES_MID = Array.from({ length: 14 }, (_, i) => i * 40 + 12);
const PERIOD = 560; // both tree rows repeat every 560 px
const wrap = (x) => ((x % PERIOD) + PERIOD) % PERIOD - 40; // -40..520 -> visible strip

export class Level2Scene {
  enter() {
    this.juice = new Juice();
    this.t = 0; // real time
    this.run = 0; // distance run (scroll)
    this.elapsed = 0; // running time (game time)
    this.stamina = 0;
    this.hits = 0;
    this.lane = 1; // start near
    this.laneY = LANE_Y[1];
    this.h = 0; // height above the lane
    this.vh = 0;
    this.stumble = 0;
    this.slow = 0; // puddle drag
    this.obstacles = [];
    this.nextSpawn = 1.6;
    this.dust = 0;
    this.done = false;
    this.msgKey = null;
    this.msgT = 0;
    this.tufts = Array.from({ length: 40 }, () => [Math.random() * W, LANE_Y[0] - 8 + Math.random() * 40]);

    music.play(TRACKS.level2);
    playSfx('select');
  }

  say(key, sec = 1.2) {
    this.msgKey = key;
    this.msgT = sec;
  }

  get airborne() { return this.h > 0.5; }

  /** Scroll speed in px/s (ramps up over the run). */
  get speed() {
    const base = 68 + 52 * Math.min(1, this.elapsed / RUN_TIME);
    const f = (this.stumble > 0 ? 0.35 : 1) * (this.slow > 0 ? 0.6 : 1);
    return base * f;
  }

  update(dt) {
    this.t += dt;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.done || scenes.busy) return;
    if (!this.juice.tick(dt)) return;

    // lane change
    if (input.pressed('up') && this.lane !== 0) this.setLane(0);
    if (input.pressed('down') && this.lane !== 1) this.setLane(1);
    // hop (keyboard / A button / tap on the field)
    if ((input.pressed('primary') || input.tap()) && !this.airborne) {
      this.vh = HOP_V;
      playSfx('jump', { pitch: 1 + Math.random() * 0.05 });
    }

    // height
    if (this.airborne || this.vh !== 0) {
      this.vh -= GRAV * dt;
      this.h += this.vh * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vh = 0;
        if (Math.random() < 0.6) playSfx('land', { vol: 0.5 });
      }
    }

    // timers
    this.stumble = Math.max(0, this.stumble - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.elapsed += dt;
    const sp = this.speed;
    this.run += sp * dt;

    // dust behind the feet
    this.dust += dt;
    if (!this.airborne && this.stumble <= 0 && this.dust > 0.12) {
      this.dust = 0;
      this.juice.emit(PAL.dirt, PX - 8, this.laneY - 1, 2, { speed: 14, life: 0.4, gravity: -10, up: 0.2 });
    }

    // spawn: cows, molehills, puddles (gets busier as the run goes on)
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      this.spawn();
      this.nextSpawn = 2.2 - 0.9 * Math.min(1, this.elapsed / RUN_TIME) + Math.random() * 0.9;
    }

    // move obstacles and resolve encounters
    for (const o of this.obstacles) {
      o.x += (o.kind === 'cow' ? -(sp + 22) : -sp) * dt;
      const y = LANE_Y[o.lane];
      const dist = o.x - PX;
      if (o.kind === 'cow' && !o.warned && dist <= sp * 1.0 && dist > 0) {
        o.warned = true;
        playSfx('moo');
      }
      if (!o.done && o.lane === this.lane && Math.abs(dist) < 18) {
        o.done = true;
        this.collide(o, y);
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -40);

    // stamina: clean running fills it, hits drain it
    if (this.stumble <= 0) this.stamina = Math.min(GOAL, this.stamina + GAIN * dt * (this.slow > 0 ? 0.6 : 1));
    if (this.stamina >= GOAL) this.finish();
  }

  setLane(lane) {
    this.lane = lane;
    tween(this, { laneY: LANE_Y[lane] }, 0.12, { ease: 'outQuad' });
    playSfx('select', { vol: 0.5 });
  }

  spawn() {
    const r = Math.random();
    const kind = r < 0.6 ? 'cow' : r < 0.82 ? 'molehill' : 'puddle';
    this.obstacles.push({ kind, lane: Math.random() < 0.5 ? 0 : 1, x: 340, warned: false, done: false });
  }

  collide(o, y) {
    if (o.kind === 'puddle') {
      this.slow = 1.2;
      playSfx('splash', { vol: 0.5 });
      this.juice.emit(PAL.sky, PX, y - 2, 6, { speed: 30, life: 0.4, gravity: 90 });
      return;
    }
    // a hop clears a cow (high) or a molehill (low)
    const clearance = o.kind === 'cow' ? 20 : 6;
    if (this.h >= clearance) {
      playSfx('blip', { pitch: 1.4 });
      return;
    }
    this.hits++;
    this.stamina = Math.max(0, this.stamina - 8);
    this.stumble = 1.0;
    this.say('l2.hit', 1.4);
    playSfx('hurt');
    this.juice.shake(3, 0.25);
    this.juice.hitStop(0.07);
    this.juice.emit(PAL.dirt, PX, y - 4, 10, { speed: 60, life: 0.5, gravity: 200 });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.say('l2.done', 1.6);
    playSfx('win');
    const stars = this.hits === 0 ? 3 : this.hits <= 2 ? 2 : 1;
    after(1.6, () => {
      scenes.go('results', { level: 2, stars, time: this.elapsed, passed: true }, { wipe: 'iris' });
    });
  }

  // ------------------------------------------------------------ draw
  draw(c) {
    const [sx, sy] = this.juice.offset();
    c.save();
    c.translate(sx, sy);

    // sky, far hills of trees (slow), middle trees, fence line, grass and the dirt path
    skyBands(c, HORIZON, [PAL.skyHi, PAL.sky]);
    const far = this.run * 0.15;
    for (const x0 of TREES_FAR) drawSprite(c, SPRITES.run.tree, wrap(x0 - far), HORIZON + 4, { anchor: 'feet' });
    rect(c, PAL.grassDark, 0, HORIZON, W, 6);
    const mid = this.run * 0.4;
    for (const x0 of TREES_MID) drawSprite(c, SPRITES.run.treeSmall, wrap(x0 - mid), HORIZON + 8, { anchor: 'feet' });
    rect(c, PAL.grass, 0, HORIZON + 4, W, H - HORIZON);

    // wire fence along the far side of the road (posts scroll at 0.7x)
    const fenceX = (this.run * 0.7) % 44;
    for (let x = -44; x < W + 44; x += 44) rect(c, PAL.woodDark, x - fenceX, 96, 2, 14);
    rect(c, PAL.silver, 0, 100, W, 1);
    rect(c, PAL.silver, 0, 104, W, 1);

    // the path: dirt with dashes that scroll with the run
    rect(c, PAL.dirt, 0, 114, W, 52);
    rect(c, PAL.dirtDark, 0, 114, W, 2);
    const dashX = this.run % 16;
    for (let x = -16; x < W + 16; x += 16) rect(c, PAL.dirtDark, x - dashX, 138, 6, 1);
    for (let x = -16; x < W + 16; x += 16) rect(c, PAL.dirtDark, x - dashX + 8, 162, 6, 1);

    // grass tufts scroll at full speed
    const tuftShift = this.run % 320;
    for (const [x0, y0] of this.tufts) {
      const x = ((x0 - tuftShift) % W + W) % W;
      drawSprite(c, SPRITES.run.tuft, x, y0, { anchor: 'tl' });
    }

    // lane markers (subtle) so the two lanes read clearly
    rect(c, PAL.dirtDark, 0, LANE_Y[0] + 1, W, 1);
    rect(c, PAL.dirtDark, 0, LANE_Y[1] + 1, W, 1);

    // obstacles: far-to-near order so the near ones overlap
    const sorted = [...this.obstacles].sort((a, b) => a.lane - b.lane);
    for (const o of sorted) this.drawObstacle(c, o);

    // companion pacer runs ahead in the far lane, the player in the chosen lane
    drawSprite(c, frameAt(SPRITES.playerTrack.run, this.t, 8), PX + 50, LANE_Y[0], { flip: false });
    const bob = this.airborne || this.stumble > 0 ? 0 : (Math.floor(this.t * 12) % 2 ? -1 : 0);
    const frame = this.stumble > 0
      ? SPRITES.playerJog.idle
      : this.airborne
        ? SPRITES.playerJog.jump
        : frameAt(SPRITES.playerJog.run, this.t, 6 + this.speed / 22);
    const blinkOut = this.stumble > 0 && Math.floor(this.t * 12) % 2 === 0;
    if (!blinkOut) drawSprite(c, frame, PX, this.laneY - this.h + bob);

    this.juice.draw(c);
    c.restore();

    this.drawHud(c);
  }

  drawObstacle(c, o) {
    const y = LANE_Y[o.lane];
    if (o.kind === 'cow') {
      drawSprite(c, frameAt(SPRITES.cow.walk, this.t, 6), o.x, y);
      const dist = o.x - PX;
      if (o.warned && dist <= this.speed * 1.0 && dist > 0) {
        // "!" warning and MOO bubble
        drawSprite(c, SPRITES.icons.warn, o.x - 6, y - 30);
        panel(c, o.x - 16, y - 46, 34, 12, { fill: PAL.white, border: PAL.white, outline: PAL.ink });
        drawText(c, t('l2.moo'), o.x + 1, y - 43, { align: 'center', color: PAL.ink });
      }
    } else if (o.kind === 'molehill') {
      drawSprite(c, SPRITES.run.molehill, o.x, y);
    } else {
      drawSprite(c, SPRITES.run.puddle, o.x, y);
    }
  }

  drawHud(c) {
    drawText(c, t('l2.stamina', { n: Math.floor(this.stamina) }), 8, 16, { color: PAL.white, shadow: PAL.black });
    drawBar(c, 8, 26, 120, 7, this.stamina / GOAL, { fg: PAL.teal, segments: 4 });
    if (this.msgT > 0 && this.msgKey) {
      drawText(c, t(this.msgKey), W / 2, 40, { align: 'center', color: PAL.yellow, shadow: PAL.black });
    }
  }
}
