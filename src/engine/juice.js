// Juice helpers shared by the minigames (M9): screen shake, hit-stop and small
// pixel particles. Everything snaps to whole pixels; shake and flashes are
// toned down when reduced-flash is on (settings.reducedFlash).

import { rect } from './draw.js';
import { settings } from './settings.js';

export class Juice {
  constructor() {
    this.shakeAmp = 0;
    this.shakeT = 0;
    this.shakeDur = 0.0001;
    this.stopT = 0; // hit-stop: the world does not advance while > 0
    this.parts = [];
  }

  /** Screen shake. Amplitude in game pixels, dur in seconds. */
  shake(amp, dur = 0.25) {
    const a = settings.reducedFlash ? Math.min(amp, 1) : amp;
    if (a >= this.shakeAmp || this.shakeT <= 0) {
      this.shakeAmp = a;
      this.shakeDur = dur;
      this.shakeT = dur;
    }
  }

  /** Freeze the world for a moment (contact, nicks, goals). */
  hitStop(sec = 0.08) {
    this.stopT = Math.max(this.stopT, sec);
  }

  /** Call once per real frame. Returns true when the world should step. */
  tick(dt) {
    if (this.stopT > 0) {
      this.stopT -= dt;
      this.updateParts(dt);
      return false;
    }
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.updateParts(dt);
    return true;
  }

  /** Current [dx, dy] shake offset in whole pixels. */
  offset() {
    if (this.shakeT <= 0) return [0, 0];
    const k = this.shakeAmp * (this.shakeT / this.shakeDur);
    return [Math.round((Math.random() * 2 - 1) * k), Math.round((Math.random() * 2 - 1) * k)];
  }

  /** Burst of square particles. opts: { speed, life, gravity, size, spread } */
  emit(color, x, y, n = 6, { speed = 40, life = 0.5, gravity = 120, size = 1, up = 0.5 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({
        x, y, color, size,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * up,
        life, age: 0, gravity,
      });
    }
  }

  updateParts(dt) {
    for (const p of this.parts) {
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  }

  draw(c) {
    for (const p of this.parts) rect(c, p.color, p.x, p.y, p.size, p.size);
  }

  clear() {
    this.parts = [];
    this.shakeT = 0;
    this.stopT = 0;
  }
}
