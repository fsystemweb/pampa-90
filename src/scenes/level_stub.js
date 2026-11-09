// Placeholder for levels that aren't built yet: lets you walk the whole flow
// (briefing -> level -> next briefing -> ... -> ending). Each real level replaces
// its registration in scenes/index.js.
import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { rect } from '../engine/draw.js';
import { nextAfter, LEVELS } from '../data/levels.js';
import { t } from '../data/strings.js';

export class LevelStub {
  constructor(level) { this.level = level; }

  update() {
    if (scenes.busy) return;
    if (input.pressed('primary') || input.tap()) {
      const [name, params] = nextAfter(this.level);
      scenes.go(name, params, { wipe: 'dither' });
    }
  }

  draw(c) {
    rect(c, PAL.ink, 0, 0, W, H);
    drawText(c, t(LEVELS[this.level - 1].name), W / 2, H / 2 - 18, { align: 'center', color: PAL.yellow, scale: 2 });
    drawText(c, 'COMING SOON', W / 2, H / 2 + 6, { align: 'center', color: PAL.white });
    drawText(c, 'PRESS SPACE TO CONTINUE', W / 2, H / 2 + 22, { align: 'center', color: PAL.grey });
  }
}
