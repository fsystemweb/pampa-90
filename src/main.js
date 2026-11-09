// Pampa '90 - boot, canvas scaler and fixed-timestep loop.

import { W, H, STEP } from './data/config.js';
import { input, createTouchControls, bindCanvas } from './engine/input.js';
import { scenes } from './engine/scene.js';
import { initDisplay } from './engine/display.js';
import { initAudio, toggleMute } from './engine/audio.js';
import { applyDom, toggleLang } from './data/strings.js';
import './scenes/index.js'; // registers every scene

export { W, H, STEP };

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
// The scene manager owns update/draw; `hooks` stays for low-level overrides.
export const hooks = {
  update: (dt) => scenes.update(dt),
  draw: (c) => scenes.draw(c),
};

let last = performance.now();
let acc = 0;

applyDom();
initAudio();
bindCanvas(canvas, W, H);
createTouchControls();
initDisplay({ onResize: resize, setPause });

// Global actions: pause (P / Esc / touch II), mute (M) and language (L). Scenes can still read them.
function handleGlobalActions() {
  if (input.pressed('pause')) setPause('user', !pauseReasons.has('user'));
  if (input.pressed('mute')) toggleMute();
  if (input.pressed('lang')) toggleLang();
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
    hooks.update(STEP / 1000);
    acc -= STEP;
  }
  hooks.draw(ctx);
}

// Start scene: #scene=name in the URL (handy for dev), otherwise the title.
const startScene = new URLSearchParams(location.hash.slice(1)).get('scene') || 'title';
scenes.go(startScene);

requestAnimationFrame(frame);
