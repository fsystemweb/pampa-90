// Level briefing card shown before every level:
//   header (LEVEL n / 4 + name) + "Preseason readiness" bar, animated icon,
//   3 typewriter lines, controls for the device in use, a one-line tip, START prompt.
// Params: { level: 1..4 }

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText, measure } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { playSfx } from '../engine/audio.js';
import { music } from '../engine/music.js';
import { TRACKS } from '../data/tracks.js';
import { tween, after, clamp } from '../engine/tween.js';
import { drawSprite, frameAt } from '../engine/sprites.js';
import { panel, drawBar, promptLabel, drawPromptText } from '../engine/ui.js';
import { rect, disc } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { LEVELS, LEVEL_COUNT } from '../data/levels.js';
import { t } from '../data/strings.js';

const CPS = 44; // typewriter speed
const TEXT_X = 120;
const TEXT_W = W - TEXT_X - 12;
const ICON = { x: 12, y: 48, w: 96, h: 74 };

// ---------------------------------------------------------------- animated icons
// Drawn inside the icon frame (0,0 = frame interior top-left, 92x70).
const ICONS = {
  1(c, tt) { // razor sweeping through foam, bucket below
    disc(c, PAL.white, 46, 26, 17);
    disc(c, PAL.white, 32, 30, 10);
    disc(c, PAL.white, 60, 31, 11);
    const rx = 18 + (Math.sin(tt * 3) * 0.5 + 0.5) * 40;
    rect(c, PAL.skin, Math.round(rx) + 6, 18, 10, 22); // clean stripe left behind
    drawSprite(c, SPRITES.shave.razor, rx, 26, { anchor: 'tl', scale: 2 });
    drawSprite(c, SPRITES.shave.bucketWater, 46, 69, { scale: 1 });
  },
  2(c, tt) { // jogger + a cow passing in the background
    rect(c, PAL.grass, 0, 52, 92, 18);
    rect(c, PAL.dirt, 0, 58, 92, 8);
    const cx = 100 - ((tt * 20) % 130);
    drawSprite(c, frameAt(SPRITES.cow.walk, tt, 6), cx, 54, { flip: true });
    drawSprite(c, frameAt(SPRITES.playerJog.run, tt, 9), 40, 68 + (Math.floor(tt * 9) % 2 ? -1 : 0), { scale: 2 });
    if (Math.floor(tt * 2) % 2 === 0) drawSprite(c, SPRITES.icons.warn, 78, 22);
  },
  3(c, tt) { // kick pose + ball arc
    rect(c, PAL.grass, 0, 56, 92, 14);
    const k = Math.floor(tt * 2.5) % 3;
    drawSprite(c, SPRITES.player.kick[k], 30, 66, { scale: 2 });
    const p = (tt * 0.9) % 1;
    drawSprite(c, SPRITES.ball.roll[Math.floor(tt * 12) % 4], 40 + p * 46, 54 - Math.sin(p * Math.PI) * 38, { scale: 2 });
    drawSprite(c, SPRITES.field.goalPost, 82, 62, { scale: 1 });
  },
  4(c, tt) { // lying player + heartbeat monitor
    rect(c, PAL.grass, 0, 54, 92, 16);
    drawSprite(c, SPRITES.playerTrack.lying, 4, 26, { anchor: 'tl', scale: 2 });
    const ok = Math.floor(tt * 2) % 2 === 0;
    drawSprite(c, ok ? SPRITES.clinic.monitorOk : SPRITES.clinic.monitorOff, 58, 30, { anchor: 'tl' });
    if (ok) drawSprite(c, SPRITES.clinic.cuff, 4, 56, { anchor: 'tl' });
  },
};

// ---------------------------------------------------------------- scene
export class BriefingScene {
  enter(params = {}) {
    this.level = clamp(Math.round(params.level ?? 1), 1, LEVEL_COUNT);
    this.def = LEVELS[this.level - 1];
    this.t = 0;
    this.leaving = false;

    // readiness: finished levels fill the bar; the newest segment animates in
    const to = (this.level - 1) / LEVEL_COUNT;
    this.bar = Math.max(0, (this.level - 2) / LEVEL_COUNT);
    if (this.level > 1) {
      after(0.5, () => {
        tween(this, { bar: to }, 0.9, { ease: 'outCubic' });
        playSfx('star');
      });
    }
    playSfx('select');
    music.play(TRACKS.title); // calm loop between minigames

    // dev: #scene=briefing&level=2&t=5 jumps ahead in time (for screenshots)
    if (params.t > 0) {
      this.t = params.t;
      if (params.t > 2) this.bar = to;
    }
  }

  lines() { return this.def.lines.map((k) => t(k)); }

  /** When (seconds) each bullet starts typing and when everything is done. */
  schedule() {
    let at = 0.5;
    const starts = [];
    for (const text of this.lines()) {
      starts.push(at);
      at += text.length / CPS + 0.25;
    }
    return { starts, end: at };
  }

  update(dt) {
    this.t += dt;
    if (this.leaving || scenes.busy || this.t < 0.25) return;
    if (input.pressed('primary') || input.tap()) {
      const { end } = this.schedule();
      if (this.t < end) {
        this.t = end; // reveal everything first
        return;
      }
      this.leaving = true;
      playSfx('confirm');
      scenes.go(this.def.scene, { level: this.level }, { wipe: 'iris' });
    }
  }

  draw(c) {
    // dimmed grass backdrop
    const tile = SPRITES.tiles.grassDark;
    for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x += 16) drawSprite(c, tile, x, y, { anchor: 'tl' });
    c.globalAlpha = 0.6;
    rect(c, PAL.ink, 0, 0, W, H);
    c.globalAlpha = 1;

    // header: level number, name, readiness bar
    drawText(c, t('ui.level', { n: this.level, total: LEVEL_COUNT }), 36, 6, { color: PAL.yellow, shadow: PAL.black });
    drawText(c, t(this.def.name), 12, 20, { color: PAL.white, shadow: PAL.blueDark, scale: 2 });
    const bx = 196; // leaves room for long (ES) level names at 2x
    drawText(c, t('ui.readiness'), W - 12, 8, { align: 'right', color: PAL.silver });
    drawBar(c, bx, 20, W - 12 - bx - 26, 9, this.bar, { fg: PAL.teal, segments: LEVEL_COUNT });
    drawText(c, `${Math.round(this.bar * 100)}%`, W - 12, 21, { align: 'right', color: PAL.white });

    // icon frame
    panel(c, ICON.x, ICON.y, ICON.w, ICON.h, { fill: PAL.skyHi });
    c.save();
    c.beginPath();
    c.rect(ICON.x + 2, ICON.y + 2, ICON.w - 4, ICON.h - 4);
    c.clip();
    c.translate(ICON.x + 2, ICON.y + 2);
    ICONS[this.level]?.(c, this.t);
    c.restore();

    // typewriter bullets
    const { starts } = this.schedule();
    let y = 50;
    this.lines().forEach((text, i) => {
      const shown = clamp((this.t - starts[i]) * CPS, 0, text.length);
      rect(c, PAL.yellow, TEXT_X - 8, y + 2, 3, 3);
      const n = drawText(c, text, TEXT_X, y, { maxWidth: TEXT_W, chars: Math.floor(shown), color: PAL.white, shadow: PAL.black });
      y += n * 10 + 6;
    });

    // controls for the device in use
    let x = 12;
    const cy = 128;
    for (const [action, labelKey] of this.def.controls) {
      x += drawPromptText(c, action, t(labelKey), x, cy) + 12;
    }

    // tip
    const tip = `${t('ui.tip')}: ${t(this.def.hint)}`;
    drawText(c, tip, 12, 144, { maxWidth: W - 24, color: PAL.yellow, shadow: PAL.black });

    // start prompt
    if (this.t >= this.schedule().end && Math.floor(this.t * 2.5) % 2 === 0) {
      const label = t('ui.start');
      const w = measure(promptLabel('primary')) + 6 + 4 + measure(label);
      drawPromptText(c, 'primary', label, Math.round((W - w) / 2), 166, { color: PAL.white });
    }
  }
}
