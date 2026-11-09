// WebAudio engine: master mute + chiptune SFX generated in code (bfxr-style).
// Music (src/engine/music.js) shares the same context via getAudio().
//
// iOS/Safari only allow audio after a user gesture, so the context is created
// and resumed from the first real input event, and again whenever it gets
// suspended (e.g. after the tab was backgrounded).

import { onFirstInput } from './input.js';

const MUTE_KEY = 'pampa90.muted';

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage unavailable */ }

const readyListeners = [];
const muteListeners = new Set();

/** The shared audio objects, or null until the first user gesture. */
export const getAudio = () => (ctx ? { ctx, master, sfxBus, musicBus } : null);

/** Run fn once the context exists (immediately if it already does). */
export function whenAudioReady(fn) {
  if (ctx) fn(getAudio());
  else readyListeners.push(fn);
}

function create() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.6;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(master);

  // 1 s of white noise, reused by every noise SFX.
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  readyListeners.splice(0).forEach((fn) => fn(getAudio()));
  return true;
}

function unlock() {
  if (!ctx && !create()) return;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
}

export function initAudio() {
  onFirstInput(unlock);
  // Safari wants resume() inside a gesture handler; keep trying until running.
  ['pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, () => { if (ctx && ctx.state !== 'running') unlock(); }, true);
  });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  });
}

// ---------------------------------------------------------------- mute
export const isMuted = () => muted;
export function setMuted(on) {
  muted = !!on;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.01);
  muteListeners.forEach((fn) => fn(muted));
}
export const toggleMute = () => setMuted(!muted);
export function onMuteChange(fn) {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

// ---------------------------------------------------------------- synthesis
function tone(wave, f0, f1, t0, dur, vol, bus = sfxBus) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(Math.max(20, f0), t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function noise(t0, dur, vol, { freq = 4000, q = 0.7, type = 'lowpass', bus = sfxBus } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + dur + 0.02);
}

export { tone };

// Each SFX is a list of layers; a layer is either a tone or a noise burst.
//   tone:  { w: wave, f: [from, to], d: seconds, v: volume, at: delay }
//   noise: { n: true, d, v, freq, q, type, at }
// "seq" plays [freq, seconds] notes back to back on one wave.
const SFX = {
  blip:    [{ w: 'square', f: [660, 660], d: 0.04, v: 0.22 }],
  tick:    [{ w: 'square', f: [520, 520], d: 0.02, v: 0.12 }], // typewriter
  select:  [{ w: 'square', f: [440, 880], d: 0.1, v: 0.25 }],
  back:    [{ w: 'square', f: [520, 260], d: 0.1, v: 0.25 }],
  confirm: { seq: [[523, 0.06], [659, 0.06], [784, 0.12]], w: 'square', v: 0.25 },
  start:   { seq: [[392, 0.07], [523, 0.07], [659, 0.07], [784, 0.2]], w: 'square', v: 0.28 },
  jump:    [{ w: 'square', f: [220, 700], d: 0.16, v: 0.22 }],
  land:    [{ n: true, d: 0.06, v: 0.25, freq: 900 }],
  step:    [{ n: true, d: 0.03, v: 0.1, freq: 1400 }],
  hit:     [{ n: true, d: 0.15, v: 0.4, freq: 1800 }, { w: 'square', f: [200, 60], d: 0.15, v: 0.3 }],
  hurt:    [{ w: 'sawtooth', f: [320, 80], d: 0.25, v: 0.3 }],
  coin:    { seq: [[988, 0.06], [1319, 0.22]], w: 'square', v: 0.22 },
  warn:    { seq: [[880, 0.06], [0, 0.05], [880, 0.06]], w: 'square', v: 0.2 },
  splash:  [{ n: true, d: 0.35, v: 0.45, freq: 1500, q: 0.6, type: 'bandpass' }],
  scrape:  [{ n: true, d: 0.09, v: 0.18, freq: 3000, type: 'highpass' }], // razor
  moo:     [{ w: 'sawtooth', f: [210, 120], d: 0.7, v: 0.16 }, { w: 'triangle', f: [105, 60], d: 0.7, v: 0.25 }],
  kick:    [{ n: true, d: 0.08, v: 0.4, freq: 2200 }, { w: 'sine', f: [160, 45], d: 0.12, v: 0.5 }],
  swish:   [{ n: true, d: 0.2, v: 0.25, freq: 2500, q: 1.2, type: 'bandpass' }],
  goal:    { seq: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.35]], w: 'square', v: 0.28 },
  save:    [{ n: true, d: 0.1, v: 0.3, freq: 800 }, { w: 'triangle', f: [300, 200], d: 0.12, v: 0.3 }],
  post:    [{ w: 'triangle', f: [900, 700], d: 0.25, v: 0.35 }, { n: true, d: 0.05, v: 0.3, freq: 3000 }],
  beep:    [{ w: 'sine', f: [1000, 1000], d: 0.12, v: 0.25 }], // heart monitor
  ring:    { seq: [[1200, 0.08], [900, 0.08], [1200, 0.08], [900, 0.08]], w: 'square', v: 0.15 },
  win:     { seq: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], w: 'square', v: 0.28 },
  fail:    { seq: [[392, 0.12], [330, 0.12], [262, 0.3]], w: 'square', v: 0.25 },
  star:    { seq: [[784, 0.08], [1047, 0.18]], w: 'triangle', v: 0.35 },
};
export const SFX_NAMES = Object.keys(SFX);

/** Play a named SFX. opts: { pitch: multiplier, vol: multiplier } */
export function playSfx(name, { pitch = 1, vol = 1 } = {}) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const def = SFX[name];
  if (!def) return;
  const t0 = ctx.currentTime + 0.005;
  if (def.seq) {
    let t = t0;
    for (const [f, d] of def.seq) {
      if (f > 0) tone(def.w, f * pitch, f * pitch, t, d, def.v * vol);
      t += d;
    }
    return;
  }
  for (const l of def) {
    const at = t0 + (l.at || 0);
    if (l.n) noise(at, l.d, l.v * vol, l);
    else tone(l.w, l.f[0] * pitch, l.f[1] * pitch, at, l.d, l.v * vol);
  }
}
