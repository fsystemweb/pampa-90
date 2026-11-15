// Shareable score card (issue #91): a 320x180 pixel-art card drawn with the game's own
// font, sprites and palette, scaled up 4x without smoothing, and shared through the
// Web Share API with a download + clipboard fallback.
//
//   drawScoreCard(ctx, summary)  -> draws the card at 320x180 on any 2D context
//   runSummary()                 -> { total, max, rating, levels: [{ name, stars, time }] }
//   shareScoreCard()             -> Promise<'shared' | 'saved' | 'copied' | 'cancelled' | 'failed'>

import { W, H, PLAY_URL, PLAY_URL_SHORT } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { LEVELS, LEVEL_COUNT } from '../data/levels.js';
import { SPRITES } from '../data/sprites/index.js';
import { drawText, measure } from './font.js';
import { drawSprite } from './sprites.js';
import { panel, drawStars, starsWidth } from './ui.js';
import { rect, seam } from './draw.js';
import { getBest } from './save.js';
import { t } from '../data/strings.js';

export const CARD_SCALE = 4;

/** Best stars / time per level from the save file, plus the totals. */
export function runSummary() {
  const levels = LEVELS.map((def) => ({ name: t(def.name), ...getBest(def.id) }));
  const total = levels.reduce((s, l) => s + l.stars, 0);
  const max = LEVEL_COUNT * 3;
  return { total, max, rating: Math.round((total / max) * 3), levels };
}

/** Draw the card (320x180, game pixels) on ctx. */
export function drawScoreCard(c, s = runSummary()) {
  // pampas sky + ground, like the title screen
  rect(c, PAL.skyDeep, 0, 0, W, 34);
  rect(c, PAL.skyHi, 0, 34, W, 40);
  rect(c, PAL.sky, 0, 74, W, 46);
  seam(c, 34, PAL.skyDeep, PAL.skyHi);
  seam(c, 74, PAL.skyHi, PAL.sky);
  rect(c, PAL.grassDark, 0, 120, W, 60);
  for (let x = 0; x < W; x += 32) rect(c, PAL.grass, x, 120, 16, 60);
  rect(c, PAL.grassDeep, 0, 120, W, 1);

  // logo
  const scale = 2;
  const full = measure("PAMPA '90", scale);
  const lx = Math.round((W - full) / 2);
  drawText(c, 'PAMPA', lx, 6, { scale, color: PAL.white, shadow: PAL.blueDark });
  drawText(c, "'90", lx + 6 * 6 * scale, 6, { scale, color: PAL.yellow, shadow: PAL.blueDark });
  rect(c, PAL.teal, lx, 24, full, 1);
  rect(c, PAL.yellow, lx, 26, full, 1);
  rect(c, PAL.magenta, lx, 28, full, 1);

  // player and doctor flank the board
  drawSprite(c, SPRITES.player.front, 34, 150);
  drawSprite(c, SPRITES.doctor.thumbsUp, 286, 150);

  // board: total + rating, then one row per level
  const bx = 66, by = 34, bw = W - 132, bh = 124;
  panel(c, bx, by, bw, bh, { fill: PAL.blueDark });
  drawText(c, t('card.title'), W / 2, by + 6, { align: 'center', color: PAL.white, shadow: PAL.black });
  const big = { gap: 4, scale: 2 };
  drawStars(c, Math.round(W / 2 - starsWidth(3, big) / 2), by + 18, s.rating, 3, big);
  drawText(c, t('card.total', { n: s.total, max: s.max }), W / 2, by + 36, { align: 'center', color: PAL.yellow, shadow: PAL.black });

  rect(c, PAL.ink, bx + 6, by + 48, bw - 12, 1);
  s.levels.forEach((l, i) => {
    const y = by + 56 + i * 16;
    if (i % 2 === 0) rect(c, PAL.blue, bx + 4, y - 4, bw - 8, 15);
    drawText(c, `${i + 1}`, bx + 8, y, { color: PAL.silver });
    drawText(c, l.name, bx + 18, y, { color: PAL.white, shadow: PAL.black });
    const sx = bx + bw - 8 - starsWidth(3);
    const timeTxt = l.time == null ? '--' : `${l.time.toFixed(1)}s`;
    drawText(c, timeTxt, sx - 6, y, { align: 'right', color: PAL.silver, shadow: PAL.black });
    drawStars(c, sx, y, l.stars, 3);
  });

  // play link
  rect(c, PAL.black, 0, H - 16, W, 16);
  const play = `${t('card.play')} ${PLAY_URL_SHORT}`;
  drawText(c, play, W / 2, H - 12, { align: 'center', color: PAL.yellow });
}

/** Render the card on a new canvas, CARD_SCALE times the game resolution. */
export function renderScoreCard(summary = runSummary()) {
  const small = document.createElement('canvas');
  small.width = W;
  small.height = H;
  const sg = small.getContext('2d');
  sg.imageSmoothingEnabled = false; // scaled glyphs / stars stay crisp
  drawScoreCard(sg, summary);
  const big = document.createElement('canvas');
  big.width = W * CARD_SCALE;
  big.height = H * CARD_SCALE;
  const g = big.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(small, 0, 0, big.width, big.height);
  return big;
}

/** Synchronous canvas -> PNG Blob (keeps the share call inside the user gesture). */
function canvasToBlob(canvas) {
  const b64 = canvas.toDataURL('image/png').split(',')[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export function shareText(s = runSummary()) {
  const stars = '★'.repeat(s.rating) + '☆'.repeat(3 - s.rating);
  return t('card.text', { n: s.total, max: s.max, stars });
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share the card: image + text + link through navigator.share when the browser can share
 * files (mobile), text + link when it can only share text, otherwise download the PNG and
 * copy the text + link to the clipboard.
 */
export async function shareScoreCard() {
  const s = runSummary();
  const text = shareText(s);
  const name = 'pampa-90-score.png';
  let blob;
  try {
    blob = canvasToBlob(renderScoreCard(s));
  } catch {
    return 'failed';
  }
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  const withFile = { title: "PAMPA '90", text, url: PLAY_URL, files: file ? [file] : [] };
  const textOnly = { title: "PAMPA '90", text, url: PLAY_URL };

  if (navigator.share) {
    const data = file && navigator.canShare?.(withFile) ? withFile : textOnly;
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
      // NotAllowedError (no user activation, e.g. gamepad) etc.: fall through
    }
  }
  try {
    download(blob, name);
  } catch {
    return (await copy(`${text} ${PLAY_URL}`)) ? 'copied' : 'failed';
  }
  await copy(`${text} ${PLAY_URL}`);
  return 'saved';
}
