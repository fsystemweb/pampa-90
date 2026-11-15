// Ending (M8): the doctor gives a thumbs-up, the stadium lights flash, the stars
// summary is shown, then a small menu: TO THE WORLD CUP / PLAY AGAIN / SHARE.
// Up / down (D-pad, stick) move the cursor, primary (A / tap on a row) picks,
// secondary (B) is a shortcut for PLAY AGAIN. SHARE sends the score card (#91).
// params: none (the total comes from the save file).

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite } from '../engine/sprites.js';
import { flash } from '../engine/ui.js';
import { shareScoreCard } from '../engine/scorecard.js';
import { rect } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { after } from '../engine/tween.js';
import { totalStars } from '../engine/save.js';
import { LEVEL_COUNT } from '../data/levels.js';
import { t } from '../data/strings.js';

const LIGHTS = [[18, 10], [70, 8], [250, 8], [302, 10]];

// menu rows (y in game pixels); tapping a row picks it
const ROWS = [
  { id: 'cup', key: 'end.start', y: 146 },
  { id: 'replay', key: 'end.replay', y: 157 },
  { id: 'share', key: 'end.share', y: 168 },
];
const ROW_H = 10;
const READY = 4.0; // seconds before the menu takes input

export class EndingScene {
  enter() {
    this.t = 0;
    this.total = totalStars(LEVEL_COUNT);
    this.lines = [t('end.1'), t('end.2')];
    this.lineShown = 0;
    this.leaving = false;
    this.sel = 0;
    this.sharing = false;
    this.toast = null;
    this.toastT = 0;
    music.play(TRACKS.ending);
    after(0.8, () => playSfx('goal'));
    after(1.6, () => { this.lineShown = 1; });
    after(3.0, () => { this.lineShown = 2; });
    after(3.8, () => { this.showStars = true; playSfx('win'); });
  }

  update(dt) {
    this.t += dt;
    if (this.toastT > 0) this.toastT -= dt;
    if (this.leaving || scenes.busy || this.t < READY) return;
    if (input.pressed('up')) { this.sel = (this.sel + ROWS.length - 1) % ROWS.length; playSfx('blip'); }
    if (input.pressed('down')) { this.sel = (this.sel + 1) % ROWS.length; playSfx('blip'); }
    const tap = input.tap();
    if (tap) {
      const i = ROWS.findIndex((r) => tap.y >= r.y - 2 && tap.y < r.y - 1 + ROW_H);
      if (i >= 0) { this.sel = i; this.activate(ROWS[i].id); }
    } else if (input.pressed('primary')) this.activate(ROWS[this.sel].id);
    else if (input.pressed('secondary')) this.activate('replay');
  }

  activate(id) {
    if (id === 'cup') {
      this.leaving = true;
      playSfx('start');
      scenes.go('title', null, { wipe: 'iris' });
    } else if (id === 'replay') {
      this.leaving = true;
      playSfx('confirm');
      scenes.go('briefing', { level: 1 }, { wipe: 'dither' });
    } else if (id === 'share' && !this.sharing) {
      // called from the input step right after the key / tap, so the browser still
      // counts it as a user gesture for navigator.share and the clipboard
      this.sharing = true;
      playSfx('select');
      shareScoreCard().then((r) => {
        this.sharing = false;
        if (r === 'cancelled') return;
        this.toast = `share.${r}`;
        this.toastT = 3;
        playSfx(r === 'failed' ? 'fail' : 'coin');
      });
    }
  }

  draw(c) {
    // night stadium
    rect(c, PAL.black, 0, 0, W, H);
    rect(c, PAL.ink, 0, 0, W, 70);
    // stands: rows of coloured dots (crowd)
    for (let row = 0; row < 4; row++) {
      for (let x = 0; x < W; x += 4) {
        const col = (x / 4 + row) % 3 === 0 ? PAL.magenta : (x / 4 + row) % 3 === 1 ? PAL.yellow : PAL.blue;
        rect(c, col, x + (row % 2) * 2, 40 - row * 9, 2, 3);
      }
    }
    // pitch
    rect(c, PAL.grassDark, 0, 110, W, 70);
    for (let x = 0; x < W; x += 32) rect(c, PAL.grass, x, 110, 16, 70);

    // floodlights flashing in turn
    LIGHTS.forEach(([x, y], i) => {
      const on = Math.floor(this.t * 3 + i) % 2 === 0;
      rect(c, on ? PAL.white : PAL.grey, x - 4, y - 3, 8, 4);
    });
    const beat = Math.floor(this.t * 4) % 2 === 0;
    if (this.t > 0.8 && beat) flash(c, PAL.white, 0.12);

    // doctor thumbs up, player beside him
    drawSprite(c, SPRITES.player.front, 116, 138);
    drawSprite(c, SPRITES.doctor.thumbsUp, 196, 138);

    // text panel
    rect(c, PAL.black, 0, 4, W, 16);
    if (this.lineShown >= 1) drawText(c, this.lines[0], W / 2, 8, { align: 'center', color: PAL.white, shadow: PAL.black });
    if (this.lineShown >= 2) drawText(c, this.lines[1], W / 2, 20, { align: 'center', color: PAL.yellow, shadow: PAL.black });

    if (this.showStars) {
      rect(c, PAL.blueDark, 74, 28, 172, 14);
      drawText(c, t('end.total', { n: this.total, max: LEVEL_COUNT * 3 }), W / 2, 32, { align: 'center', color: PAL.yellow, shadow: PAL.black });
    }

    if (this.toastT > 0) {
      rect(c, PAL.black, 60, 44, 200, 12);
      drawText(c, t(this.toast), W / 2, 46, { align: 'center', color: this.toast === 'share.failed' ? PAL.red : PAL.white });
    }

    if (this.t >= READY) {
      const blink = Math.floor(this.t * 2.5) % 2 === 0;
      ROWS.forEach((r, i) => {
        const on = i === this.sel;
        if (on) rect(c, PAL.blueDark, 84, r.y - 2, W - 168, ROW_H + 1);
        const label = (on && blink ? '> ' : '  ') + t(r.key);
        drawText(c, label, W / 2, r.y, { align: 'center', color: on ? PAL.white : PAL.silver, shadow: PAL.black });
      });
    }
  }
}
