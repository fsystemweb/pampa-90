// Ending (M8): the doctor gives a thumbs-up, the stadium lights flash, the stars
// summary is shown, then TO THE WORLD CUP (primary) or PLAY AGAIN (secondary).
// params: none (the total comes from the save file).

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText, measure } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { drawSprite } from '../engine/sprites.js';
import { flash, drawPromptText, promptLabel } from '../engine/ui.js';
import { rect } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { after } from '../engine/tween.js';
import { totalStars } from '../engine/save.js';
import { LEVEL_COUNT } from '../data/levels.js';
import { t } from '../data/strings.js';

const LIGHTS = [[18, 10], [70, 8], [250, 8], [302, 10]];

export class EndingScene {
  enter() {
    this.t = 0;
    this.total = totalStars(LEVEL_COUNT);
    this.lines = [t('end.1'), t('end.2')];
    this.lineShown = 0;
    this.leaving = false;
    music.play(TRACKS.ending);
    after(0.8, () => playSfx('goal'));
    after(1.6, () => { this.lineShown = 1; });
    after(3.0, () => { this.lineShown = 2; });
    after(3.8, () => { this.showStars = true; playSfx('win'); });
  }

  update(dt) {
    this.t += dt;
    if (this.leaving || scenes.busy || this.t < 4.0) return;
    if (input.pressed('primary') || input.tap()) {
      this.leaving = true;
      playSfx('start');
      scenes.go('title', null, { wipe: 'iris' });
    } else if (input.pressed('secondary')) {
      this.leaving = true;
      playSfx('confirm');
      scenes.go('briefing', { level: 1 }, { wipe: 'dither' });
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
    drawSprite(c, SPRITES.player.front, 116, 150);
    drawSprite(c, SPRITES.doctor.thumbsUp, 196, 150);

    // text panel
    rect(c, PAL.black, 0, 4, W, 16);
    if (this.lineShown >= 1) drawText(c, this.lines[0], W / 2, 8, { align: 'center', color: PAL.white, shadow: PAL.black });
    if (this.lineShown >= 2) drawText(c, this.lines[1], W / 2, 20, { align: 'center', color: PAL.yellow, shadow: PAL.black });

    if (this.showStars) {
      rect(c, PAL.blueDark, 74, 28, 172, 14);
      drawText(c, t('end.total', { n: this.total, max: LEVEL_COUNT * 3 }), W / 2, 32, { align: 'center', color: PAL.yellow, shadow: PAL.black });
    }

    if (this.t >= 4.0 && Math.floor(this.t * 2.5) % 2 === 0) {
      const label = t('end.start');
      const w = measure(promptLabel('primary')) + 6 + 4 + measure(label);
      drawPromptText(c, 'primary', label, Math.round(W / 2 - w / 2), 156, { color: PAL.white });
    }
    if (this.t >= 4.0) {
      const label = t('end.replay');
      const w = measure(promptLabel('secondary')) + 6 + 4 + measure(label);
      drawPromptText(c, 'secondary', label, Math.round(W / 2 - w / 2), 168, { color: PAL.silver });
    }
  }
}
