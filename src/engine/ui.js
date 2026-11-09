// UI kit: panel, typewriter dialog, hearts, stars, progress bar, button prompts
// that swap between key / pad / touch glyphs, and the reduced-flash helper.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from './input.js';
import { drawText, measure } from './font.js';
import { drawMap } from './sprites.js';
import { playSfx } from './audio.js';
import { settings } from './settings.js';

const rect = (c, col, x, y, w, h) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

// ---------------------------------------------------------------- panel
/** Bordered box: dark border, light inner line, filled body. */
export function panel(ctx, x, y, w, h, { fill = PAL.ink, border = PAL.white, outline = PAL.black } = {}) {
  rect(ctx, outline, x, y, w, h);
  rect(ctx, border, x + 1, y + 1, w - 2, h - 2);
  rect(ctx, fill, x + 2, y + 2, w - 4, h - 4);
}

// ---------------------------------------------------------------- hearts / stars
const HEART = ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
const STAR = ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', '.y...y.'];
const FULL_HEART = { r: PAL.red, w: PAL.white };
const EMPTY_HEART = { r: PAL.grey, w: PAL.silver };
const FULL_STAR = { y: PAL.yellow };
const EMPTY_STAR = { y: PAL.grey };

/** Row of hearts; `n` of `max` are filled. Returns the drawn width. */
export function drawHearts(ctx, x, y, n, max = 3, gap = 2) {
  for (let i = 0; i < max; i++) drawMap(ctx, HEART, x + i * (7 + gap), y, i < n ? FULL_HEART : EMPTY_HEART);
  return max * 7 + (max - 1) * gap;
}

/** Row of stars; `n` of `max` are filled. */
export function drawStars(ctx, x, y, n, max = 3, { gap = 2, scale = 1 } = {}) {
  for (let i = 0; i < max; i++) {
    drawMap(ctx, STAR, x + i * (7 * scale + gap), y, i < n ? FULL_STAR : EMPTY_STAR, { scale });
  }
  return max * 7 * scale + (max - 1) * gap;
}

// ---------------------------------------------------------------- progress bar
/** value 0..1. Optional `segments` draws tick dividers. */
export function drawBar(ctx, x, y, w, h, value, { fg = PAL.teal, bg = PAL.ink, border = PAL.white, segments = 0 } = {}) {
  rect(ctx, border, x, y, w, h);
  rect(ctx, bg, x + 1, y + 1, w - 2, h - 2);
  const fill = Math.round((w - 2) * Math.min(1, Math.max(0, value)));
  if (fill > 0) {
    rect(ctx, fg, x + 1, y + 1, fill, h - 2);
    if (h > 4) rect(ctx, PAL.white, x + 1, y + 1, fill, 1); // shine
  }
  for (let i = 1; i < segments; i++) rect(ctx, bg, x + Math.round(((w - 2) * i) / segments), y + 1, 1, h - 2);
}

// ---------------------------------------------------------------- button prompts
const KEYBOARD = {
  primary: 'SPACE', secondary: 'B', up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
  pause: 'P', mute: 'M', lang: 'L', move: 'ARROWS',
};
const GAMEPAD = { primary: 'A', secondary: 'B', pause: 'START', move: 'STICK' };
const TOUCH = { primary: 'A', secondary: 'B', pause: 'II', up: '^', down: 'v', left: '<', right: '>', move: 'D-PAD' };

/** Text for an action on the device in use ('SPACE' on keyboard, 'A' on touch / pad). */
export function promptLabel(action, device = input.device) {
  const map = device === 'touch' ? TOUCH : device === 'pad' ? GAMEPAD : KEYBOARD;
  return map[action] ?? KEYBOARD[action] ?? action.toUpperCase();
}

/** Draw a key-cap style glyph for an action. Returns its width. */
export function drawPrompt(ctx, action, x, y, { device } = {}) {
  const label = promptLabel(action, device);
  const w = measure(label) + 6;
  rect(ctx, PAL.grey, x, y + 1, w, 10);
  rect(ctx, PAL.white, x, y, w, 10);
  rect(ctx, PAL.silver, x, y + 9, w, 1);
  drawText(ctx, label, x + 3, y + 1, { color: PAL.ink });
  return w;
}

/** Glyph followed by a label, e.g. [SPACE] Shave. Returns total width. */
export function drawPromptText(ctx, action, text, x, y, { color = PAL.white, shadow = PAL.black } = {}) {
  const w = drawPrompt(ctx, action, x, y);
  drawText(ctx, text, x + w + 4, y + 1, { color, shadow });
  return w + 4 + measure(text);
}

// ---------------------------------------------------------------- dialog
/**
 * Typewriter dialog box at the bottom of the screen.
 *   const d = new Dialog();
 *   d.say(['Welcome to La Pampa...', 'Nothing but sky.'], { speaker: 'Che', onClose })
 *   // each frame: d.update(dt); d.draw(ctx);
 * Space / A / tap completes the current line, then advances.
 */
export class Dialog {
  constructor({ x = 8, y = H - 54, w = W - 16, h = 46, speed = 32 } = {}) {
    Object.assign(this, { x, y, w, h, speed });
    this.queue = [];
    this.line = null;
    this.speaker = null;
    this.shown = 0;
    this.onClose = null;
    this.time = 0;
  }

  get active() { return !!this.line; }
  get typing() { return !!this.line && this.shown < this.line.length; }

  say(lines, { speaker = null, onClose = null } = {}) {
    for (const text of [].concat(lines)) this.queue.push({ text, speaker });
    if (onClose) this.onClose = onClose;
    if (!this.line) this.next();
  }

  next() {
    const n = this.queue.shift();
    if (!n) {
      this.line = null;
      const cb = this.onClose;
      this.onClose = null;
      cb?.();
      return;
    }
    this.line = n.text;
    this.speaker = n.speaker;
    this.shown = 0;
  }

  /** Finish typing, or move on if the line is already complete. */
  advance() {
    if (!this.line) return;
    if (this.typing) this.shown = this.line.length;
    else this.next();
  }

  update(dt) {
    if (!this.line) return;
    this.time += dt;
    if (input.pressed('primary') || input.tap()) this.advance();
    if (this.typing) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.line.length, this.shown + this.speed * dt);
      const after = Math.floor(this.shown);
      if (after > before && after % 2 === 0 && this.line[after - 1] !== ' ') playSfx('tick');
    }
  }

  draw(ctx) {
    if (!this.line) return;
    const { x, y, w, h } = this;
    if (this.speaker) {
      const tw = measure(this.speaker.toUpperCase()) + 10;
      panel(ctx, x + 6, y - 11, tw, 13, { fill: PAL.blueDark });
      drawText(ctx, this.speaker.toUpperCase(), x + 11, y - 8, { color: PAL.yellow });
    }
    panel(ctx, x, y, w, h);
    drawText(ctx, this.line, x + 8, y + 7, { maxWidth: w - 16, chars: Math.floor(this.shown), color: PAL.white });
    if (!this.typing && Math.floor(this.time * 3) % 2 === 0) {
      // blinking "more" arrow
      rect(ctx, PAL.yellow, x + w - 14, y + h - 11, 7, 1);
      rect(ctx, PAL.yellow, x + w - 13, y + h - 10, 5, 1);
      rect(ctx, PAL.yellow, x + w - 12, y + h - 9, 3, 1);
      rect(ctx, PAL.yellow, x + w - 11, y + h - 8, 1, 1);
    }
  }
}

// ---------------------------------------------------------------- flash
/** Full-screen colour flash; automatically toned down when reduced-flash is on. */
export function flash(ctx, color, alpha = 1) {
  const a = settings.reducedFlash ? Math.min(alpha, 0.15) : alpha;
  if (a <= 0) return;
  ctx.globalAlpha = a;
  rect(ctx, color, 0, 0, W, H);
  ctx.globalAlpha = 1;
}
