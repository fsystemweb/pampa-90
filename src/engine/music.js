// Tiny chiptune tracker/sequencer on top of the shared WebAudio context.
//
// A track:
//   { bpm: 110, channels: [ { wave: 'pulse25', vol: 0.2, notes: 'E5:4 C5:2 R:2 ...' }, ... ] }
//
// Time is counted in 16th-note steps. Note tokens are "NAME:steps" (steps
// defaults to 1): C4, F#3, Bb2 ... or R for a rest. A channel loops on its own
// length, so a 1-bar bass line repeats under a 4-bar melody; the song loops at
// the longest channel.
//
// Waves: pulse12 / pulse25 / pulse50 / triangle / saw
// Noise channel tokens: K kick, S snare, H hat (plus R / :steps)

import { whenAudioReady, getAudio } from './audio.js';

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteFreq(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * 2 ** ((n - 69) / 12);
}

/** "C4:2 R:1 E4" -> { len, events: [{ at, len, note }] } */
export function parseNotes(str) {
  const events = [];
  let at = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [name, l] = tok.split(':');
    const len = l ? Number(l) : 1;
    if (name !== 'R') events.push({ at, len, note: name });
    at += len;
  }
  return { len: at, events };
}

/** Repeat a pattern string n times (authoring helper). */
export const rep = (str, n) => Array(n).fill(str).join(' ');

// ---------------------------------------------------------------- state
let noiseBuf = null;
let pendingTrack = null;
let current = null; // { track, parsed, loopLen, stepDur, nextStep, nextTime, timer, bus, loop }
const waves = new Map();

function pulseWave(ctx, duty) {
  const key = `${ctx.sampleRate}:${duty}`;
  if (waves.has(key)) return waves.get(key);
  const N = 32;
  const real = new Float32Array(N + 1);
  const imag = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  const w = ctx.createPeriodicWave(real, imag);
  waves.set(key, w);
  return w;
}

function voice(a, ch, freq, t0, dur, bus) {
  const { ctx } = a;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  if (ch.wave.startsWith('pulse')) o.setPeriodicWave(pulseWave(ctx, Number(ch.wave.slice(5)) / 100));
  else o.type = ch.wave === 'saw' ? 'sawtooth' : ch.wave;
  o.frequency.value = freq;
  const v = ch.vol ?? 0.2;
  const rel = Math.min(0.03, dur * 0.4);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(v, t0 + 0.004);
  g.gain.setValueAtTime(v, t0 + Math.max(0.005, dur - rel));
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function drum(a, kind, t0, vol, bus) {
  const { ctx } = a;
  if (kind === 'K') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t0);
    o.frequency.exponentialRampToValueAtTime(40, t0 + 0.12);
    g.gain.setValueAtTime(vol * 2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    o.connect(g).connect(bus);
    o.start(t0);
    o.stop(t0 + 0.16);
    return;
  }
  const buf = noiseBuf || (noiseBuf = makeNoise(ctx));
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = kind === 'H' ? 7000 : 1800;
  const g = ctx.createGain();
  const d = kind === 'H' ? 0.04 : 0.12;
  g.gain.setValueAtTime(vol * (kind === 'H' ? 0.7 : 1.4), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f).connect(g).connect(bus);
  s.start(t0, Math.random() * 0.5);
  s.stop(t0 + d + 0.02);
}

function makeNoise(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// Schedule every step that falls inside the look-ahead window.
function pump() {
  const a = getAudio();
  if (!current || !a) return;
  const { ctx } = a;
  const m = current;
  while (m.nextTime < ctx.currentTime + 0.15) {
    const step = m.nextStep;
    for (const ch of m.parsed) {
      const local = step % ch.len;
      const evs = ch.byStep.get(local);
      if (!evs) continue;
      for (const e of evs) {
        const t = Math.max(m.nextTime, ctx.currentTime);
        const dur = e.len * m.stepDur;
        if (ch.def.wave === 'noise') drum(a, e.note, t, ch.def.vol ?? 0.2, m.bus);
        else voice(a, ch.def, noteFreq(e.note), t, dur, m.bus);
      }
    }
    m.nextStep += 1;
    m.nextTime += m.stepDur;
    if (!m.loop && m.nextStep >= m.loopLen) {
      m.nextStep = Infinity; // stop scheduling; timer cleared in stop below
      setTimeout(() => { if (current === m) music.stop(); }, (m.nextTime - ctx.currentTime) * 1000 + 100);
      clearInterval(m.timer);
      return;
    }
  }
}

function start(track, loop) {
  const a = getAudio();
  const parsed = track.channels.map((def) => {
    const p = parseNotes(def.notes);
    const byStep = new Map();
    for (const e of p.events) {
      if (!byStep.has(e.at)) byStep.set(e.at, []);
      byStep.get(e.at).push(e);
    }
    return { def, len: Math.max(1, p.len), byStep };
  });
  const loopLen = Math.max(...parsed.map((c) => c.len));
  // Per-channel lengths must divide the song length to loop cleanly.
  const bus = a.ctx.createGain();
  bus.gain.value = 1;
  bus.connect(a.musicBus);
  current = {
    track, parsed, loopLen, loop, bus,
    stepDur: 60 / track.bpm / 4,
    nextStep: 0,
    nextTime: a.ctx.currentTime + 0.06,
    timer: setInterval(pump, 25),
  };
  pump();
}

export const music = {
  /** Start a track (restarts it only if it's a different one). */
  play(track, { loop = true } = {}) {
    if (current && current.track === track) return;
    music.stop();
    pendingTrack = { track, loop };
    whenAudioReady(() => {
      if (pendingTrack && pendingTrack.track === track) {
        pendingTrack = null;
        start(track, loop);
      }
    });
  },

  /** Stop, with an optional fade-out in seconds. */
  stop(fade = 0) {
    pendingTrack = null;
    const m = current;
    current = null;
    if (!m) return;
    clearInterval(m.timer);
    const a = getAudio();
    if (!a) return;
    const t = a.ctx.currentTime;
    m.bus.gain.cancelScheduledValues(t);
    m.bus.gain.setValueAtTime(m.bus.gain.value, t);
    m.bus.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.03, fade));
    setTimeout(() => m.bus.disconnect(), (fade + 0.2) * 1000);
  },

  get playing() { return !!current || !!pendingTrack; },
};
