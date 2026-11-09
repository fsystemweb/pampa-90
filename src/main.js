// Pampa '90 - boot, canvas scaler and fixed-timestep loop.

import { input, createTouchControls } from './engine/input.js';
import { initDisplay } from './engine/display.js';
import { drawText } from './engine/font.js';
import { initAudio, toggleMute, playSfx } from './engine/audio.js';
import { PAL } from './data/palette.js';
import { applyDom, t } from './data/strings.js';

export const W = 320;
export const H = 180;
export const STEP = 1000 / 60; // fixed update step (ms)

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

// ---------------------------------------------------------------- scaler
// Integer scale (in device pixels) so pixels stay crisp; letterboxed by the
// flex-centred #stage. Falls back to a fractional scale on tiny viewports.
export function resize() {
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth * dpr;
  const vh = window.innerHeight * dpr;
  const fit = Math.min(vw / W, vh / H);
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  canvas.style.width = `${(W * scale) / dpr}px`;
  canvas.style.height = `${(H * scale) / dpr}px`;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- pause
// Several independent reasons can pause the game (tab hidden, user, rotate
// overlay...). The loop runs only while no reason is active.
const pauseReasons = new Set();
export function setPause(reason, on = true) {
  const was = isPaused();
  if (on) pauseReasons.add(reason);
  else pauseReasons.delete(reason);
  if (was !== isPaused()) last = performance.now(); // avoid a huge dt on resume
}
export const isPaused = () => pauseReasons.size > 0;

document.addEventListener('visibilitychange', () => setPause('visibility', document.hidden));

// ---------------------------------------------------------------- loop
// Scenes hook in here (scene manager arrives in M1).
export const hooks = {
  update(_dt) {},
  draw(_ctx) {},
};

let last = performance.now();
let acc = 0;

applyDom();
initAudio();
createTouchControls();
initDisplay({ onResize: resize, setPause });

// Global actions: pause (P / Esc / touch II) and mute (M). Scenes can still read them.
function handleGlobalActions() {
  if (input.pressed('pause')) setPause('user', !pauseReasons.has('user'));
  if (input.pressed('mute')) toggleMute();
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(now - last, 250); // clamp spiral of death
  last = now;
  if (isPaused()) {
    acc = 0;
    // keep polling so the user can un-pause
    if (pauseReasons.size === 1 && pauseReasons.has('user')) {
      input.update();
      handleGlobalActions();
    }
    return;
  }
  acc += elapsed;
  while (acc >= STEP) {
    input.update();
    handleGlobalActions();
    if (input.pressed('primary')) playSfx('blip');
    hooks.update(STEP / 1000);
    acc -= STEP;
  }
  hooks.draw(ctx);
}

// Placeholder scene until the scene manager lands.
hooks.draw = (c) => {
  c.fillStyle = PAL.sky;
  c.fillRect(0, 0, W, H);
  drawText(c, t('game.title'), W / 2, 24, { align: 'center', color: PAL.white, shadow: PAL.blueDark });
  drawText(c, 'Welcome to La Pampa... nothing but sky.\nChe, dale! \u00A1A la chacra! \u00BFListo? ma\u00F1ana', W / 2, 60,
    { align: 'center', color: PAL.black });
  drawText(c, 'The quick brown fox jumps over the lazy dog 0123456789', 16, 110, { color: PAL.ink, maxWidth: 288 });
};

requestAnimationFrame(frame);
