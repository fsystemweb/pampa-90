// Dev-only showcase of the UI kit. Open index.html#scene=dev-ui
import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { drawText } from '../engine/font.js';
import { Dialog, panel, drawHearts, drawStars, drawBar, drawPrompt, drawPromptText } from '../engine/ui.js';
import { scenes } from '../engine/scene.js';
import { input } from '../engine/input.js';

export class DevUiScene {
  enter() {
    this.t = 0;
    this.dialog = new Dialog();
    this.dialog.say(['Welcome to La Pampa... nothing but sky.', 'Che, dale! ¡Vamos a entrenar!'], { speaker: 'Doctor' });
  }
  update(dt) {
    this.t += dt;
    this.dialog.update(dt);
    if (!this.dialog.active && input.pressed('primary')) scenes.go('title', null, { wipe: 'dither' });
  }
  draw(c) {
    c.fillStyle = PAL.sky;
    c.fillRect(0, 0, W, H);
    c.fillStyle = PAL.grass;
    c.fillRect(0, 100, W, H - 100);
    drawText(c, 'UI KIT', 8, 6, { color: PAL.ink });
    drawHearts(c, 8, 20, 2, 3);
    drawStars(c, 8, 34, 2, 3);
    drawStars(c, 60, 28, 1, 3, { scale: 2 });
    drawBar(c, 8, 52, 120, 8, (this.t * 0.2) % 1, { segments: 5 });
    drawBar(c, 8, 64, 120, 6, 0.4, { fg: PAL.red });
    panel(c, 150, 12, 160, 60);
    drawText(c, 'PRESEASON READINESS', 156, 18, { color: PAL.yellow });
    drawBar(c, 156, 32, 148, 8, 0.5, { fg: PAL.magenta });
    drawPrompt(c, 'primary', 156, 48);
    drawPrompt(c, 'secondary', 204, 48);
    drawPrompt(c, 'pause', 224, 48, { device: 'pad' });
    drawPrompt(c, 'primary', 262, 48, { device: 'touch' });
    drawPromptText(c, 'primary', 'Shave', 8, 80);
    this.dialog.draw(c);
  }
}
