// Level 4 - Doctor check (M7, issues #36-#38).
// Lying on the grass, the doctor watches the monitor. Breathe with the guide:
// hold primary to breathe in (the bar rises), release to breathe out. Staying
// within the guide's band lowers the heart rate; mistiming raises it. Hold the
// calm zone (heart rate <= 70) for 15 s in total to win. Bugs, cow moos and a
// phone ring cause screen noise now and then. No hard fail: if the heart rate
// stays high for too long, the doctor says "again, relax" and the meter resets.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText, measure } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite } from '../engine/sprites.js';
import { drawBar, panel, Dialog } from '../engine/ui.js';
import { rect, line, skyBands } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { t } from '../data/strings.js';
import { after, clamp } from '../engine/tween.js';
import { Juice } from '../engine/juice.js';

const BPM_START = 120;
const BPM_CALM = 70; // the calm zone: heart rate at or below this
const CALM_NEED = 15; // seconds in the calm zone to win
const BREATH_RATE = 1.0; // seconds to fill or empty the lungs
const BAND_EASY = 0.2; // allowed distance from the guide at the start (wide)
const BAND_HARD = 0.12; // ...and after the ramp
const BAND_RAMP = 30; // seconds to go from easy to hard
const HELP_TIME = 8; // seconds the how-to-play panel stays up
const PERIOD = 6; // breathing guide period (s)
const RESET_AFTER = 5; // seconds high before the doctor says "again"
const BAR = { x: 40, y: 166, w: 240, h: 8 };

const guideAt = (time) => 0.5 + 0.3 * Math.sin((time / PERIOD) * Math.PI * 2);
/** Is the guide asking you to breathe in (rising) right now? */
const guideRising = (time) => Math.cos((time / PERIOD) * Math.PI * 2) >= 0;

/** Little triangle: up = breathe in, down = breathe out. */
function arrow(c, col, x, y, up) {
  for (let i = 0; i < 4; i++) rect(c, col, x + (up ? 3 - i : i), y + (up ? i : i), (up ? i : 3 - i) * 2 + 1, 1);
}

export class Level4Scene {
  enter() {
    this.juice = new Juice();
    this.t = 0;
    this.bpm = BPM_START;
    this.breath = 0.5;
    this.calm = 0;
    this.high = 0; // seconds spent above the calm zone since the last reset
    this.resets = 0;
    this.inBand = false;
    this.won = false;
    this.done = false;
    this.nextDistract = 7 + Math.random() * 4;
    this.noiseT = 0;
    this.noiseKind = null;
    this.cloudX = 40;
    this.dialog = new Dialog({ x: 8, y: 40, w: W - 16, h: 26, speed: 40 });
    this.ecg = []; // scrolling ECG samples
    this.ecgT = 0;

    music.play(TRACKS.level4);
    playSfx('select');
  }

  update(dt) {
    this.t += dt;
    this.noiseT = Math.max(0, this.noiseT - dt);
    this.cloudX += dt * 3;
    if (this.done || scenes.busy) return;
    if (!this.juice.tick(dt)) return;

    // the dialog advances on its own (primary / tap complete a line)
    this.dialog.update(dt);

    // breathing: hold to fill the lungs, release to empty them
    if (input.down('primary')) this.breath = Math.min(1, this.breath + dt / BREATH_RATE);
    else this.breath = Math.max(0, this.breath - dt / BREATH_RATE);

    const guide = guideAt(this.t);
    this.inBand = Math.abs(this.breath - guide) <= this.band;
    if (this.inBand) this.bpm -= 9 * dt; // good breathing slows the heart
    else this.bpm += 4 * dt; // mistiming raises it
    this.bpm = clamp(this.bpm, 58, 140);

    if (this.inBand && this.bpm <= BPM_CALM) this.calm += dt;

    // no hard fail: a long high heart rate resets the meter softly
    if (this.bpm > 110) this.high += dt;
    else this.high = Math.max(0, this.high - dt);
    if (this.high >= RESET_AFTER) this.softReset();

    // distractions: bugs, a cow moo or the phone
    this.nextDistract -= dt;
    if (this.nextDistract <= 0) this.distract();

    // ECG trace: one sample per frame-ish, scrolling left
    this.ecgT += dt;
    if (this.ecgT >= 0.03) {
      this.ecgT = 0;
      this.ecg.push(this.heartSample());
      if (this.ecg.length > 40) this.ecg.shift();
    }

    if (this.calm >= CALM_NEED) this.win();
  }

  /** Allowed distance from the guide: wide at first, ramping down so early rounds are gentle. */
  get band() {
    return BAND_EASY + (BAND_HARD - BAND_EASY) * clamp(this.t / BAND_RAMP);
  }

  heartSample() {
    // a small beat every 60/bpm seconds
    const period = 60 / this.bpm;
    const p = (this.t % period) / period;
    if (p < 0.08) return 2;
    if (p < 0.12) return -2;
    if (p < 0.2) return -4 * Math.sin(((p - 0.12) / 0.08) * Math.PI);
    return 0;
  }

  softReset() {
    this.resets++;
    this.high = 0;
    this.bpm = 100;
    this.calm = Math.max(0, this.calm - 3);
    this.dialog.say(t('l4.again')); // soft reset: explicit, friendly, not a failure
  }

  distract() {
    const kinds = [['l4.distract', 'blip'], ['l3.cow', 'moo'], ['l4.phone', 'ring']];
    const [key, sfx] = kinds[Math.floor(Math.random() * kinds.length)];
    this.noiseKind = key;
    this.noiseT = 1.2;
    playSfx(sfx, { vol: 0.8 });
    this.nextDistract = 8 + Math.random() * 4;
  }

  win() {
    if (this.done) return;
    this.done = true;
    this.won = true;
    music.stop(0.6);
    playSfx('win');
    this.dialog.say(t('l4.perfect'));
    const stars = this.resets === 0 ? 3 : this.resets === 1 ? 2 : 1;
    after(3.2, () => {
      scenes.go('results', { level: 4, stars, time: this.t, passed: true }, { wipe: 'iris' });
    });
  }

  // ------------------------------------------------------------ draw
  draw(c) {
    const [sx, sy] = this.juice.offset();
    c.save();
    c.translate(sx, sy);

    // sky, a drifting cloud, the house wall on the right
    skyBands(c, 112, [PAL.sky, PAL.skyHi]);
    drawSprite(c, SPRITES.intro.cloud, (this.cloudX % 360) - 40, 26, { anchor: 'tl' });
    rect(c, PAL.dirt, 232, 60, 88, 52); // wall
    rect(c, PAL.dirtDark, 232, 60, 88, 3); // roof edge
    rect(c, PAL.woodDark, 254, 76, 18, 16); // window
    rect(c, PAL.skyDeep, 256, 78, 14, 12);
    rect(c, PAL.dirtDark, 232, 112, 88, 2);

    // grass
    for (let x = 0; x < W; x += 16) for (let y = 112; y < H; y += 16) drawSprite(c, SPRITES.tiles.grass, x, y, { anchor: 'tl' });

    // the monitor on the grass, with a cable to the cuff on the arm
    const mx = 196;
    const my = 118;
    const monitor = this.bpmColor() === PAL.teal ? SPRITES.clinic.monitorOk : SPRITES.clinic.monitorBad;
    line(c, PAL.ink, 84, 132, mx + 6, my + 22);
    drawSprite(c, monitor, mx, my, { anchor: 'tl' });
    this.drawEcg(c, mx + 4, my + 4);

    // the player lying down, cuff on the arm, the doctor sitting beside him
    drawSprite(c, SPRITES.player.lying, 72, 150);
    drawSprite(c, SPRITES.clinic.cuff, 58, 136, { anchor: 'tl' });
    drawSprite(c, SPRITES.doctor.sit, 128, 150);
    drawSprite(c, SPRITES.clinic.clipboard, 136, 132, { anchor: 'tl' });

    // breathing guide: the yellow tick is where you should be, the teal bar is you
    rect(c, PAL.grassDeep, BAR.x - 2, BAR.y - 2, BAR.w + 4, BAR.h + 4);
    drawBar(c, BAR.x, BAR.y, BAR.w, BAR.h, this.breath, { fg: this.inBand ? PAL.teal : PAL.blue, segments: 0 });
    const gx = BAR.x + 1 + Math.round((BAR.w - 2) * guideAt(this.t));
    // the band: stay inside it (yellow zone around the marker)
    const half = Math.round((BAR.w - 2) * this.band);
    c.save();
    c.globalAlpha = 0.35;
    rect(c, PAL.yellow, Math.max(BAR.x, gx - half), BAR.y, Math.min(BAR.x + BAR.w, gx + half) - Math.max(BAR.x, gx - half), BAR.h);
    c.restore();
    rect(c, PAL.yellow, gx - 1, BAR.y - 4, 3, BAR.h + 8);
    this.drawBreathLabels(c);

    this.juice.draw(c);
    c.restore();

    this.drawNoise(c);
    this.drawHud(c);
    this.dialog.draw(c);
  }

  bpmColor() {
    return this.won || this.bpm <= BPM_CALM ? PAL.teal : PAL.red;
  }

  drawEcg(c, x, y) {
    const col = this.bpmColor();
    this.ecg.forEach((v, i) => rect(c, col, x + i * 0.5, y + 8 + v, 1, 1));
  }

  drawNoise(c) {
    if (this.noiseT <= 0) return;
    // a band of screen noise: short white lines, dimmer with reduced flash
    const n = 26;
    for (let i = 0; i < n; i++) {
      const y = (i * 37 + Math.floor(this.t * 60) * 13) % H;
      const w = 8 + ((i * 53) % 40);
      rect(c, (i % 3) ? PAL.white : PAL.silver, (i * 71) % W, y, w, 1);
    }
    if (this.noiseKind) drawText(c, t(this.noiseKind), W / 2, 150, { align: 'center', color: PAL.yellow, shadow: PAL.black });
  }

  /** Colour + shape + word for what the guide wants and what you are doing. */
  drawBreathLabels(c) {
    const y = 154;
    const gIn = guideRising(this.t);
    const gCol = PAL.yellow;
    arrow(c, gCol, BAR.x, y + 2, gIn);
    drawText(c, t('l4.guide', { s: gIn ? t('l4.in.s') : t('l4.out.s') }), BAR.x + 10, y, { color: gCol, shadow: PAL.black });
    const holding = input.down('primary');
    const col = this.inBand ? PAL.teal : PAL.white;
    const txt = t('l4.you', { s: holding ? t('l4.in.s') : t('l4.out.s') });
    drawText(c, txt, BAR.x + BAR.w, y, { align: 'right', color: col, shadow: PAL.black });
    arrow(c, col, BAR.x + BAR.w - measure(txt) - 10, y + 2, holding);
  }

  drawHud(c) {
    const inCalm = this.bpm <= BPM_CALM;
    drawText(c, t('l4.bpm', { n: Math.round(this.bpm) }), 8, 8, { color: this.bpmColor() === PAL.teal ? PAL.teal : PAL.white, shadow: PAL.black });
    drawText(c, t('l4.target', { n: BPM_CALM }), 8, 18, { color: PAL.silver, shadow: PAL.black });
    // progress of the calm hold: seconds in the calm zone out of the needed total
    drawText(c, t('l4.calm', { a: Math.min(CALM_NEED, this.calm).toFixed(1), b: CALM_NEED }), W - 8, 8, { align: 'right', color: PAL.white, shadow: PAL.black });
    drawBar(c, W - 108, 18, 100, 7, this.calm / CALM_NEED, { fg: PAL.teal, segments: 5 });

    if (!this.done) {
      // one line telling you what to fix right now
      const key = !this.inBand ? 'l4.match' : inCalm ? 'l4.great' : 'l4.lower';
      const col = this.inBand ? PAL.teal : PAL.yellow;
      drawText(c, t(key), W / 2, 30, { align: 'center', color: col, shadow: PAL.black });
    }

    // how to play, up for the first seconds
    if (this.t < HELP_TIME && !this.done) {
      panel(c, 8, 66, 216, 52, { fill: PAL.blueDark });
      drawText(c, t('l4.help'), 14, 72, { maxWidth: 204, color: PAL.white });
    }
  }
}
