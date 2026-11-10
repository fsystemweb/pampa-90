// Results screen (M8): shown after every minigame.
//   params: { level, stars: 0..3, time (s), passed: bool }
// Passed -> stars fill in one by one, NEXT (primary) goes on, RETRY (secondary) replays.
// Failed (soft fail) -> TRY AGAIN; primary retries instantly, there is no game over.
// Saves the best stars / time on entry when passed.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText, measure } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { panel, drawStars, drawPromptText, promptLabel } from '../engine/ui.js';
import { rect } from '../engine/draw.js';
import { after } from '../engine/tween.js';
import { nextAfter, LEVELS } from '../data/levels.js';
import { getBest, recordResult } from '../engine/save.js';
import { t } from '../data/strings.js';

export class ResultsScene {
  enter(params = {}) {
    this.level = params.level ?? 1;
    this.def = LEVELS[this.level - 1];
    this.stars = Math.max(0, Math.min(3, params.stars ?? 0));
    this.time = params.time ?? null;
    this.passed = !!params.passed;
    this.t = 0;
    this.shownStars = 0;
    this.leaving = false;

    if (this.passed) {
      this.best = recordResult(this.level, { stars: this.stars, time: this.time });
    } else {
      this.best = getBest(this.level);
    }

    music.stop(0.4);
    after(0.4, () => {
      if (this.passed) playSfx(this.stars >= 3 ? 'win' : 'confirm');
      else playSfx('fail');
    });
    for (let i = 1; i <= this.stars; i++) {
      after(0.6 + i * 0.35, () => {
        this.shownStars = i;
        playSfx('star');
      });
    }
  }

  go(where, opts) {
    if (this.leaving) return;
    this.leaving = true;
    playSfx('confirm');
    scenes.go(where.name, where.params, opts);
  }

  update(dt) {
    this.t += dt;
    if (this.leaving || scenes.busy || this.t < 1.0) return;
    if (input.pressed('primary') || input.tap()) {
      if (this.passed) {
        const [name, params] = nextAfter(this.level);
        this.go({ name, params }, { wipe: 'iris' });
      } else {
        this.go({ name: this.def.scene, params: { level: this.level } }, { wipe: 'dither' });
      }
    } else if (this.passed && input.pressed('secondary')) {
      this.go({ name: this.def.scene, params: { level: this.level } }, { wipe: 'dither' });
    }
  }

  draw(c) {
    rect(c, PAL.ink, 0, 0, W, H);
    rect(c, PAL.grassDeep, 0, 140, W, 40);
    panel(c, 40, 10, W - 80, 156, { fill: PAL.blueDark });

    const title = this.passed ? t('res.title') : t('res.fail');
    drawText(c, title, W / 2, 20, { align: 'center', color: this.passed ? PAL.yellow : PAL.red, shadow: PAL.black, scale: 2 });
    drawText(c, t(this.def.name), W / 2, 42, { align: 'center', color: PAL.white, shadow: PAL.black });

    // stars (filled one by one) and the total
    const sw = 3 * 7 + 2 * 4;
    drawStars(c, Math.round(W / 2 - sw / 2), 58, this.shownStars, 3, { gap: 4, scale: 2 });
    drawText(c, t('res.stars'), W / 2, 84, { align: 'center', color: PAL.silver });

    // this run and the best so far
    const timeTxt = this.time == null ? '--' : `${this.time.toFixed(1)}s`;
    const runLine = this.passed ? `${t('res.time')} ${timeTxt}` : t('res.fail.hint');
    drawText(c, runLine, W / 2, 100, { align: 'center', color: PAL.white });
    if (this.best.stars > 0) {
      const bt = this.best.time == null ? '' : `  ${this.best.time.toFixed(1)}s`;
      drawText(c, `${t('res.best')}: ${'*'.repeat(this.best.stars)}${bt}`, W / 2, 114, { align: 'center', color: PAL.silver });
    }

    // prompts
    const blink = Math.floor(this.t * 2.5) % 2 === 0;
    const centered = (action, label, y, color) => {
      const w = measure(promptLabel(action)) + 6 + 4 + measure(label);
      drawPromptText(c, action, label, Math.round(W / 2 - w / 2), y, { color });
    };
    if (this.t >= 1.0 && blink) centered('primary', this.passed ? t('ui.next') : t('ui.retry'), 138, PAL.white);
    if (this.passed && this.t >= 1.0) centered('secondary', t('ui.retry'), 152, PAL.silver);
  }
}
