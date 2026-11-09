// Easing functions + a small tween manager.
//
//   tween(sprite, { x: 100, y: 20 }, 0.5, { ease: 'outBack', onDone })
//   after(1.2, () => ...)          one-shot timer
//
// The global manager is advanced by the scene manager every step and cleared
// on scene change, so scenes never have to clean up their own tweens.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

const c1 = 1.70158;
const c3 = c1 + 1;

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
  inCubic: (t) => t ** 3,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2),
  outBack: (t) => 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2,
  inBack: (t) => c3 * t ** 3 - c1 * t * t,
  outBounce: (t) => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  outElastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  /** Stepped easing for chunky 8-bit motion: steps(4) -> 4 discrete positions. */
  steps: (n) => (t) => Math.min(1, Math.floor(t * n) / (n - 1 || 1)),
};

export class Tweens {
  constructor() { this.list = []; }

  /** Tween numeric props of target to the values in `to`. Returns a handle with .cancel(). */
  to(target, to, dur, { ease: e = 'outQuad', delay = 0, onUpdate, onDone } = {}) {
    const fn = typeof e === 'function' ? e : ease[e] || ease.linear;
    const tw = { target, to, dur: Math.max(1e-6, dur), fn, delay, t: 0, from: null, onUpdate, onDone, dead: false,
      cancel() { tw.dead = true; } };
    this.list.push(tw);
    return tw;
  }

  /** Call fn after `sec` seconds. */
  after(sec, fn) {
    return this.to({}, {}, 1e-6, { delay: sec, onDone: fn });
  }

  update(dt) {
    // iterate over a copy: callbacks may add tweens
    for (const tw of [...this.list]) {
      if (tw.dead) continue;
      let step = dt;
      if (tw.delay > 0) {
        tw.delay -= dt;
        if (tw.delay > 0) continue;
        step = -tw.delay; // carry the remainder into the tween itself
        tw.delay = 0;
      }
      if (!tw.from) {
        tw.from = {};
        for (const k in tw.to) tw.from[k] = tw.target[k];
      }
      tw.t += step;
      const p = clamp(tw.t / tw.dur);
      const k = tw.fn(p);
      for (const key in tw.to) tw.target[key] = lerp(tw.from[key], tw.to[key], k);
      tw.onUpdate?.(p);
      if (p >= 1) {
        tw.dead = true;
        tw.onDone?.();
      }
    }
    this.list = this.list.filter((tw) => !tw.dead);
  }

  clear() { this.list.length = 0; }
}

export const tweens = new Tweens();
export const tween = (target, to, dur, opts) => tweens.to(target, to, dur, opts);
export const after = (sec, fn) => tweens.after(sec, fn);
