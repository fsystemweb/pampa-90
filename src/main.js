// Pampa '90 - boot, canvas scaler and fixed-timestep loop.

import { input, createTouchControls } from './engine/input.js';
import { initDisplay } from './engine/display.js';

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

createTouchControls();
initDisplay({ onResize: resize, setPause });

// Global pause toggle (P / Esc / touch II). Scenes can still read the action.
function handlePauseAction() {
  if (input.pressed('pause')) setPause('user', !pauseReasons.has('user'));
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
      handlePauseAction();
    }
    return;
  }
  acc += elapsed;
  while (acc >= STEP) {
    input.update();
    handlePauseAction();
    hooks.update(STEP / 1000);
    acc -= STEP;
  }
  hooks.draw(ctx);
}

// Placeholder scene until the scene manager lands.
hooks.draw = (c) => {
  c.fillStyle = '#bfe3f5';
  c.fillRect(0, 0, W, H);
};

requestAnimationFrame(frame);
