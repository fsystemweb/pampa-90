// Level 1 - Shaving (M4, issues #20-#24).
// A close-up of the mirror hung on a post. Phase 1: clear the foam with the razor
// (arrows move, hold primary to pull a stroke). Pressing too hard, zig-zagging or
// going on for too long nicks you (3 hearts). A clogged razor stops cutting until
// you dip it in the cup (secondary). Phase 2: rinse in the bucket by holding
// primary and releasing inside the green band, 3 good splashes.
// Soft fail: time out or no hearts left -> results screen with TRY AGAIN.

import { W } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite } from '../engine/sprites.js';
import { drawHearts, drawBar } from '../engine/ui.js';
import { rect, disc, skyBands } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { t } from '../data/strings.js';
import { tween, after, clamp, ease } from '../engine/tween.js';
import { Juice } from '../engine/juice.js';

const GW = 88; // glass canvas (the mirror's opening)
const GH = 104;
const GCX = 44;
const GCY = 52;
const AT = { x: 160, y: 70 }; // mirror anchor = glass centre on screen
const GO = { x: AT.x - GCX, y: AT.y - GCY }; // glass origin on screen
const CUP = { x: 42, y: 176 };
const BUCKET_X = 280;
const BUCKET_REST = 160;
const BUCKET_HIDDEN = 200;
const POUR_SIDE = { start: 0.25, flight: 0.4, total: 1.0 }; // bucket tips, water travels, bucket rights itself
const POUR_FINAL = { start: 0.8, flight: 0.3, total: 2.2 }; // last splash: bucket goes over the head
const HEAD_TOP = { x: GO.x + GCX, y: GO.y + 18 }; // where the water hits the hair
const FINAL_TILT = 1.9;
const FINAL_PIVOT = { x: GO.x + GCX + 13, y: GO.y + 6 }; // bucket pivot when held over the head
const TILT_MAX = 1.2; // radians
const LIFT = 34; // the bucket is raised while pouring

const TIME_LIMIT = 60; // seconds to clean the face
const NEED = 0.95; // coverage needed
const SPEED = 62; // razor px/s
const HEARTS = 3;
const GOOD_SPLASHES = 3;
const GREEN = [0.55, 0.85]; // rinse meter band

// ---------------------------------------------------------------- assets (built once)
let A = null;

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
const inEllipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const px = (g, col, x, y) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
const ellipsePx = (g, col, cx, cy, rx, ry) => {
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) if (inEllipse(x, y, cx, cy, rx, ry)) px(g, col, x, y);
};

function buildAssets() {
  if (A) return A;
  // reflected room: sky, trees, then the face, hair, neck and T-shirt
  const face = canvas(GW, GH);
  const f = face.getContext('2d');
  rect(f, PAL.skyHi, 0, 0, GW, GH);
  rect(f, PAL.sky, 0, 0, GW, 14);
  for (let x = -6; x < GW + 6; x += 12) disc(f, PAL.tree, x, 12, 9);
  rect(f, PAL.grassDark, 0, 88, GW, 16);
  ellipsePx(f, PAL.skin, GCX, 50, 22, 28);
  ellipsePx(f, PAL.skinDark, GCX + 19, 52, 3, 6); // ears
  ellipsePx(f, PAL.skinDark, GCX - 19, 52, 3, 6);
  ellipsePx(f, PAL.woodDark, GCX, 30, 24, 16); // hair
  rect(f, PAL.woodDark, 22, 34, 4, 14);
  rect(f, PAL.woodDark, 62, 34, 4, 14);
  rect(f, PAL.woodDark, 33, 44, 6, 1); // brows
  rect(f, PAL.woodDark, 49, 44, 6, 1);
  rect(f, PAL.ink, 34, 47, 5, 2); // eyes
  rect(f, PAL.ink, 49, 47, 5, 2);
  rect(f, PAL.skinDark, 43, 52, 2, 5); // nose
  rect(f, PAL.skinDark, 40, 63, 8, 2); // mouth
  rect(f, PAL.skin, 36, 74, 16, 30); // neck
  rect(f, PAL.skinDark, 36, 74, 1, 30);
  rect(f, PAL.skinDark, 51, 74, 1, 30);
  rect(f, PAL.white, 12, 96, 64, 8); // T-shirt
  rect(f, PAL.silver, 36, 96, 16, 2); // collar

  // which pixels must end up clean: the lower face and the neck
  const target = new Uint8Array(GW * GH);
  let count = 0;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const onFace = inEllipse(x, y, GCX, 50, 23, 29) && y >= 51; // eyes are at y 47-48: keep them clear
      const onNeck = x >= 35 && x < 53 && y >= 73 && y < 94;
      if (onFace || onNeck) {
        target[y * GW + x] = 1;
        count++;
      }
    }
  }

  // foam template: white with a little silver speckle (drawn fresh per run)
  const foamTpl = canvas(GW, GH);
  const fg = foamTpl.getContext('2d');
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (!target[y * GW + x]) continue;
      px(fg, (x * 7 + y * 13) % 5 === 0 ? PAL.silver : PAL.white, x, y);
    }
  }

  // round mirror opening: everything outside is hidden by the frame anyway
  const mask = canvas(GW, GH);
  const m = mask.getContext('2d');
  ellipsePx(m, '#000', GCX, GCY, 40, 48);

  A = { face, foamTpl, mask, target, targetCount: count };
  return A;
}

// ---------------------------------------------------------------- scene
export class Level1Scene {
  enter() {
    this.assets = buildAssets();
    this.foam = canvas(GW, GH);
    // read back often (coverage check), so keep it on the CPU side
    this.foam.getContext('2d', { willReadFrequently: true }).drawImage(this.assets.foamTpl, 0, 0);
    this.out = canvas(GW, GH);
    this.juice = new Juice();

    this.phase = 'shave'; // shave -> rinse -> done
    this.done = false;
    this.t = 0;
    this.shaveTime = 0;
    this.totalTime = 0;
    this.timeLeft = TIME_LIMIT;
    this.coverage = 0;
    this.coverTimer = 0;

    // razor: rx/ry is the blade's contact point on screen
    this.rx = 160;
    this.ry = 92;
    this.clog = 0;
    this.clogged = false;
    this.dipping = false;
    this.nicks = 0;
    this.flips = 0;
    this.flipT = 0;
    this.lastDir = 0;
    this.stillT = 0;
    this.nickMark = null; // red pixel shown on the skin after a nick
    this.nickT = 0;

    // wind gusts make the mirror jiggle and push the razor
    this.gustT = 0;
    this.gustCooldown = 6 + Math.random() * 4;

    // rinse
    this.bucketY = BUCKET_HIDDEN;
    this.meter = 0;
    this.goodSplashes = 0;
    this.pour = null;

    this.msgKey = null;
    this.msgT = 0;

    music.play(TRACKS.level1);
    playSfx('select');
  }

  say(key, sec = 1.4) {
    this.msgKey = key;
    this.msgT = sec;
  }

  get hearts() { return HEARTS - this.nicks; }

  update(dt) {
    this.t += dt;
    if (this.done && this.pour) { // the final pour keeps playing while the results screen is pending
      this.pour.t += dt;
      this.juice.tick(dt);
    }
    if (this.done || scenes.busy) return;
    if (this.msgT > 0) this.msgT -= dt;
    if (this.nickT > 0) this.nickT -= dt;
    if (!this.juice.tick(dt)) return; // hit-stop: freeze the world briefly

    if (this.gustT > 0) this.gustT -= dt;
    this.gustCooldown -= dt;
    if (this.gustCooldown <= 0) {
      this.gustT = 1.1;
      this.gustCooldown = 7 + Math.random() * 5;
      this.say('l1.wind', 1.2);
      playSfx('swish');
    }

    if (this.phase === 'shave') this.updateShave(dt);
    else if (this.phase === 'rinse') this.updateRinse(dt);
  }

  // ------------------------------------------------------------ shaving
  updateShave(dt) {
    this.shaveTime += dt;
    this.timeLeft = Math.max(0, TIME_LIMIT - this.shaveTime);

    const ax = input.axis('left', 'right');
    const ay = input.axis('up', 'down');
    const drift = this.gustT > 0 ? 18 : 0;

    if (!this.dipping) {
      this.rx = clamp(this.rx + ax * SPEED * dt + drift * dt, 126, 194);
      this.ry = clamp(this.ry + ay * SPEED * dt, 34, 110);
    }

    // dip the razor when clogged
    if (this.clogged && !this.dipping && input.pressed('secondary')) this.dip();

    const holding = input.down('primary') && !this.dipping;
    if (holding && !this.clogged) this.cut(dt, ax, ay);
    else this.stillT = 0;

    // coverage check (cheap: 4 times a second)
    this.coverTimer += dt;
    if (this.coverTimer >= 0.25) {
      this.coverTimer = 0;
      this.coverage = this.measureCoverage();
    }

    if (this.coverage >= NEED) {
      this.enterRinse();
    } else if (this.timeLeft <= 0) {
      this.fail();
    }
  }

  /** The blade cuts the foam under its contact point. */
  cut(dt, ax, ay) {
    const gx = this.rx - GO.x;
    const gy = this.ry - GO.y;
    if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) {
      const g = this.foam.getContext('2d');
      g.globalCompositeOperation = 'destination-out';
      disc(g, '#000', gx, gy, 4);
      g.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.5) this.juice.emit(PAL.white, this.rx, this.ry, 1, { speed: 26, life: 0.35, gravity: 60 });
    }
    this.clog += dt * 16;
    if (this.clog >= 100) {
      this.clog = 100;
      this.clogged = true;
      playSfx('warn');
      this.say('l1.clog', 1.6);
    }
    if (Math.random() < dt * 4) playSfx('scrape', { pitch: 0.9 + Math.random() * 0.2 });

    // zig-zag: sideways direction flips while cutting
    if (ax !== 0) {
      const dir = Math.sign(ax);
      if (this.lastDir !== 0 && dir !== this.lastDir) {
        this.flips++;
        this.flipT = 0.7;
      }
      this.lastDir = dir;
    }
    this.flipT -= dt;
    if (this.flipT <= 0) this.flips = 0;
    if (this.flips >= 3) this.nick();

    // pressing hard: holding the blade still for too long
    if (ax === 0 && ay === 0) {
      this.stillT += dt;
      if (this.stillT > 1.2) {
        this.stillT = 0;
        this.nick();
      }
    } else {
      this.stillT = 0;
    }
  }

  nick() {
    this.flips = 0;
    this.nicks++;
    this.nickMark = { x: this.rx, y: this.ry };
    this.nickT = 0.5;
    this.say('l1.nick', 1.0);
    playSfx('hurt');
    this.juice.shake(2, 0.2);
    this.juice.hitStop(0.06);
    this.juice.emit(PAL.red, this.rx, this.ry, 8, { speed: 50, life: 0.5, gravity: 140 });
    if (this.nicks >= HEARTS) this.fail();
  }

  dip() {
    this.dipping = true;
    playSfx('splash');
    const home = { x: this.rx, y: this.ry };
    tween(this, { rx: CUP.x, ry: CUP.y - 14 }, 0.3, {
      ease: 'outQuad',
      onDone: () => {
        this.clog = 0;
        this.clogged = false;
        after(0.25, () => {
          tween(this, { rx: home.x, ry: home.y }, 0.3, { ease: 'inOutQuad', onDone: () => { this.dipping = false; } });
        });
      },
    });
  }

  measureCoverage() {
    const data = this.foam.getContext('2d').getImageData(0, 0, GW, GH).data;
    const { target, targetCount } = this.assets;
    let clean = 0;
    for (let i = 0; i < target.length; i++) if (target[i] && data[i * 4 + 3] === 0) clean++;
    return clean / targetCount;
  }

  // ------------------------------------------------------------ rinse
  enterRinse() {
    this.phase = 'rinse';
    this.coverage = 1;
    this.say('l1.clean', 1.6);
    playSfx('confirm');
    this.rinseStart = this.shaveTime;
    tween(this, { bucketY: BUCKET_REST }, 0.6, { ease: 'outBack' });
    after(0.7, () => this.say('l1.rinseHint', 2.2));
  }

  updateRinse(dt) {
    if (this.pour) {
      // the bucket is mid-pour: the result lands when the water arrives
      this.pour.t += dt;
      if (!this.pour.landed && this.pour.t >= this.pour.start + this.pour.flight) {
        this.pour.landed = true;
        this.land(this.pour.good);
      }
      if (this.pour.t >= this.pour.total) this.pour = this.pour.final ? this.pour : null;
      return;
    }
    if (input.down('primary')) {
      this.meter = Math.min(1, this.meter + dt / 1.1);
    }
    if (input.released('primary')) {
      const v = this.meter;
      this.meter = 0;
      this.splash(v >= GREEN[0] && v <= GREEN[1]);
    }
  }

  /** Release: tilt the bucket and send the water from its lip. */
  splash(good) {
    const final = good && this.goodSplashes + 1 >= GOOD_SPLASHES;
    this.pour = { t: 0, good, landed: false, final, ...(final ? POUR_FINAL : POUR_SIDE) };
    playSfx('swish');
  }

  /** Where the water ends up: on the face for a good splash, short on the grass for a miss. */
  pourTarget(good) {
    return good ? { x: GO.x + GCX + 6, y: GO.y + 62 } : { x: 214, y: 152 };
  }

  /** Bucket tilt 0..1 over the pour (tips quickly, holds, rights itself). */
  get tilt() {
    if (!this.pour) return 0;
    const { t, start, total, final } = this.pour;
    if (t < start) return ease.outQuad(t / start);
    if (final || t < total - 0.3) return 1;
    return 1 - ease.inOutQuad((t - (total - 0.3)) / 0.3);
  }

  land(good) {
    const tg = this.pour?.final ? HEAD_TOP : this.pourTarget(good);
    this.juice.emit(PAL.sky, tg.x, tg.y, good ? 16 : 8, { speed: 60, life: 0.5, gravity: 180, up: 0.8 });
    if (!good) {
      playSfx('blip');
      this.say('l1.again', 0.9);
      return;
    }
    this.goodSplashes++;
    playSfx('splash');
    this.juice.shake(1, 0.12);
    this.say('l1.rinse', 1.2);
    // each splash washes away a third of the foam; the last one clears it all
    const g = this.foam.getContext('2d');
    g.globalCompositeOperation = 'destination-out';
    if (this.goodSplashes >= GOOD_SPLASHES) g.fillRect(0, 0, GW, GH);
    else g.fillStyle = 'rgba(0,0,0,0.34)', g.fillRect(0, 0, GW, GH);
    g.globalCompositeOperation = 'source-over';
    if (this.goodSplashes >= GOOD_SPLASHES) this.finish();
  }

  // ------------------------------------------------------------ end
  finish() {
    if (this.done) return;
    this.done = true;
    this.totalTime = this.shaveTime;
    const stars = Math.max(1, 3 - this.nicks - (this.shaveTime > 45 ? 1 : 0));
    after(1.0, () => {
      scenes.go('results', { level: 1, stars, time: this.shaveTime, passed: true }, { wipe: 'iris' });
    });
  }

  fail() {
    if (this.done) return;
    this.done = true;
    playSfx('fail');
    after(0.6, () => {
      scenes.go('results', { level: 1, stars: 0, time: this.shaveTime, passed: false }, { wipe: 'dither' });
    });
  }

  // ------------------------------------------------------------ draw
  drawGlass(c, jx, jy) {
    const o = this.out.getContext('2d');
    o.clearRect(0, 0, GW, GH);
    o.drawImage(this.assets.face, 0, 0);
    o.drawImage(this.foam, 0, 0);
    o.globalCompositeOperation = 'destination-in';
    o.drawImage(this.assets.mask, 0, 0);
    o.globalCompositeOperation = 'source-over';
    c.drawImage(this.out, GO.x + jx, GO.y + jy);
  }

  /** Bucket pivot and angle now: beside the face for a normal splash, above the head for the last one. */
  bucketPose() {
    const k = this.tilt;
    const rest = { x: BUCKET_X - 8, y: this.bucketY };
    if (this.pour?.final) {
      const m = ease.inOutQuad(k);
      return { x: rest.x + (FINAL_PIVOT.x - rest.x) * m, y: rest.y + (FINAL_PIVOT.y - rest.y) * m, a: -FINAL_TILT * k };
    }
    return { x: rest.x, y: rest.y - LIFT * k, a: -TILT_MAX * k };
  }

  drawBucket(c) {
    const p = this.bucketPose();
    if (p.a === 0) return drawSprite(c, SPRITES.shave.bucketWater, BUCKET_X, this.bucketY);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.a);
    drawSprite(c, SPRITES.shave.bucketWater, 8, 0);
    c.restore();
  }

  /** Lip of the bucket (its rim's left corner) on screen, at the current pose. */
  lipPos() {
    const p = this.bucketPose();
    const lx = -2;
    const ly = -14;
    return {
      x: p.x + lx * Math.cos(p.a) - ly * Math.sin(p.a),
      y: p.y + lx * Math.sin(p.a) + ly * Math.cos(p.a),
    };
  }

  /** Water from the lip to where it lands. */
  drawStream(c) {
    if (!this.pour) return;
    const { t, good, final, start, flight, total } = this.pour;
    const u = clamp((t - start) / flight, 0, 1.6);
    if (u <= 0) return;
    const a = this.lipPos();
    if (final) {
      // a steady column over the head, then water running down the face and shirt
      const top = HEAD_TOP;
      for (let y = a.y; y < top.y; y += 3) {
        const x = a.x + Math.round(Math.sin(y * 0.9 + t * 30));
        rect(c, (Math.floor(y / 3) + Math.floor(t * 20)) % 3 === 0 ? PAL.white : PAL.sky, Math.round(x - 1), Math.round(y), 3, 3);
      }
      if (this.pour.landed) {
        const run = clamp((t - start - flight) / 0.8, 0, 1);
        for (let i = -3; i <= 3; i++) {
          const x = GO.x + GCX + i * 6;
          const len = Math.round((68 - Math.abs(i) * 4) * run);
          for (let y = 0; y < len; y += 3) rect(c, (y / 3 + i + Math.floor(t * 14)) % 3 === 0 ? PAL.white : PAL.sky, x, top.y + 8 + y, 2, 3);
        }
        if (t < total - 0.2 && Math.random() < 0.8) this.juice.emit(PAL.sky, top.x + (Math.random() * 30 - 15), top.y + 2, 2, { speed: 40, life: 0.4, gravity: 160, up: 0.3 });
      }
      return;
    }
    const b = this.pourTarget(good);
    const col = good ? PAL.skyHi : PAL.sky;
    const head = Math.min(u, 1);
    const tail = Math.max(0, u - 0.6);
    for (let i = 0; i < 18; i++) {
      const f = tail + (head - tail) * (i / 17);
      const x = a.x + (b.x - a.x) * f;
      const y = a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * 18;
      rect(c, i % 3 === 0 ? PAL.white : col, Math.round(x), Math.round(y), 2, 2);
    }
  }

  draw(c) {
    const [sx, sy] = this.juice.offset();
    c.save();
    c.translate(sx, sy);

    // backdrop: pale sky, a row of trees, grass
    skyBands(c, 96, [PAL.sky, PAL.skyHi]);
    for (let x = 0; x < W; x += 18) drawSprite(c, SPRITES.run.treeSmall, x + 4, 112, { anchor: 'feet' });
    rect(c, PAL.grass, 0, 112, W, 68);
    rect(c, PAL.grassDark, 0, 150, W, 30);

    // the post and the mirror hung on it
    const J = this.gustT > 0 ? Math.round(Math.sin(this.t * 34) * 1.5) : 0;
    drawSprite(c, SPRITES.shave.post, 160, 34);
    this.drawGlass(c, J, 0);
    drawSprite(c, SPRITES.shave.mirror, AT.x + J, AT.y);
    drawSprite(c, SPRITES.shave.mirrorShine, AT.x + J, AT.y, { anchor: 'center' });

    // cup on the ground, bucket slides in for the rinse
    drawSprite(c, SPRITES.shave.cupWater, CUP.x, CUP.y);
    this.drawBucket(c);
    this.drawStream(c);

    // the blade: red mark for a nick, plus a clogged tint
    if (this.nickMark && this.nickT > 0) disc(c, PAL.red, this.nickMark.x, this.nickMark.y, 1);
    if (this.phase === 'shave') {
      drawSprite(c, SPRITES.shave.razor, this.rx - 12, this.ry, { anchor: 'feet' });
      if (this.clogged) drawText(c, '!', this.rx + 8, this.ry - 10, { color: PAL.red, shadow: PAL.black });
    }

    this.juice.draw(c);
    c.restore();

    this.drawHud(c);
  }

  drawHud(c) {
    drawHearts(c, 8, 16, this.hearts, HEARTS);
    if (this.phase === 'shave') {
      drawText(c, t('ui.time', { n: Math.ceil(this.timeLeft) }), W - 8, 8, { align: 'right', color: PAL.white, shadow: PAL.black });
      drawText(c, t('l1.cover', { n: Math.floor(this.coverage * 100) }), 8, 30, { color: PAL.white, shadow: PAL.black });
      drawBar(c, 8, 40, 80, 6, this.coverage / NEED, { fg: PAL.teal, segments: 0 });
      drawText(c, `${Math.round(NEED * 100)}%`, 92, 40, { color: PAL.silver, shadow: PAL.black });
    } else if (this.phase === 'rinse') {
      // timing meter: green band in the middle is the good splash
      const x = 100;
      const y = 150;
      const w = 120;
      drawBar(c, x, y, w, 8, this.meter, { fg: PAL.blue });
      rect(c, PAL.yellow, x + Math.round((w - 2) * GREEN[0]), y - 2, 1, 12);
      rect(c, PAL.yellow, x + Math.round((w - 2) * GREEN[1]), y - 2, 1, 12);
      drawText(c, `${this.goodSplashes} / ${GOOD_SPLASHES}`, W - 8, 8, { align: 'right', color: PAL.white, shadow: PAL.black });
    }

    if (this.msgT > 0 && this.msgKey) {
      const blink = this.msgKey === 'l1.clog' && Math.floor(this.t * 6) % 2 === 0;
      if (!blink) drawText(c, t(this.msgKey), W / 2, 120, { align: 'center', color: PAL.yellow, shadow: PAL.black, maxWidth: W - 24 });
    }
  }
}
