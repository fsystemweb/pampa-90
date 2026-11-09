// Display helpers: fullscreen toggle, mute button, landscape-only enforcement.

import { isMuted, toggleMute, onMuteChange } from './audio.js';

const root = document.documentElement;

export const fullscreenSupported = !!(root.requestFullscreen || root.webkitRequestFullscreen);
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      screen.orientation?.unlock?.();
    } else {
      await (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      // Best effort: only works in fullscreen on Android Chrome.
      await screen.orientation?.lock?.('landscape').catch(() => {});
    }
  } catch {
    /* denied or unsupported - ignore */
  }
}

/**
 * @param {{onResize: () => void, setPause: (reason: string, on: boolean) => void}} api
 */
export function initDisplay({ onResize, setPause }) {
  // Fullscreen button (hidden where unsupported, e.g. iPhone Safari).
  const btn = document.getElementById('fs-btn');
  if (btn && fullscreenSupported) {
    btn.hidden = false;
    btn.addEventListener('click', toggleFullscreen);
    // Don't let the click leak into the game as a tap.
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  // Mute button (same state as the M key).
  const mute = document.getElementById('mute-btn');
  if (mute) {
    const show = (m) => {
      mute.classList.toggle('off', m);
      mute.setAttribute('aria-pressed', String(m));
    };
    show(isMuted());
    onMuteChange(show);
    mute.addEventListener('click', toggleMute);
    mute.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  const onFs = () => onResize();
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);

  // Pause while the "rotate your phone" overlay is up (touch + portrait).
  const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
  const sync = () => {
    setPause('orientation', portrait.matches);
    onResize();
  };
  portrait.addEventListener?.('change', sync);
  sync();
}
