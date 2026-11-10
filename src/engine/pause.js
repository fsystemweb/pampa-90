// Pause menu (M9 accessibility): dims the frozen game and offers
//   RESUME (P / Esc / primary / tap)   and   REDUCED FLASH on/off (saved in settings).
// Up / down move the cursor; taps pick a row directly.
// main.js owns the pause state; this module only draws and handles the menu.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from './input.js';
import { drawText } from './font.js';
import { rect } from './draw.js';
import { settings, setSetting } from './settings.js';
import { t } from '../data/strings.js';

const ROWS = [
  { id: 'resume', y: 84 },
  { id: 'flash', y: 100 },
];
const ROW_H = 12;

let sel = 0;
let onResume = () => {};

/** Called when the game is paused by the user. */
export function openPauseMenu(resume) {
  sel = 0;
  onResume = resume;
}

function activate() {
  const id = ROWS[sel].id;
  if (id === 'resume') onResume();
  else if (id === 'flash') setSetting('reducedFlash', !settings.reducedFlash);
}

/** Handle the menu for one step (call only while paused by the user). */
export function updatePauseMenu() {
  if (input.pressed('up')) sel = (sel + ROWS.length - 1) % ROWS.length;
  if (input.pressed('down')) sel = (sel + 1) % ROWS.length;
  if (input.pressed('primary')) activate();
  const tap = input.tap();
  if (tap) {
    const i = ROWS.findIndex((r) => tap.y >= r.y - 2 && tap.y < r.y - 2 + ROW_H + 4);
    if (i >= 0) {
      sel = i;
      activate();
    }
  }
}

export function drawPauseMenu(c) {
  c.globalAlpha = 0.6;
  rect(c, PAL.black, 0, 0, W, H);
  c.globalAlpha = 1;

  const label = (id) => (id === 'flash' ? `${t('ui.flash')}: ${settings.reducedFlash ? t('ui.on') : t('ui.off')}` : t('ui.resumeBtn'));
  drawText(c, t('ui.paused'), W / 2, 60, { align: 'center', color: PAL.yellow, shadow: PAL.black, scale: 2 });
  ROWS.forEach((r, i) => {
    const on = i === sel;
    const text = label(r.id);
    if (on) rect(c, PAL.blueDark, 84, r.y - 2, W - 168, ROW_H + 4);
    drawText(c, (on ? '> ' : '  ') + text, W / 2, r.y + 1, { align: 'center', color: on ? PAL.white : PAL.silver, shadow: PAL.black });
  });
  drawText(c, t('ui.resume'), W / 2, 140, { align: 'center', color: PAL.grey });
}
