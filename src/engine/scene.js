// Scene manager.
//
// A scene is a plain object (or class instance) with any of:
//   enter(params)   called when it becomes active
//   update(dt)      fixed step, dt in seconds
//   draw(ctx)       draws the 320x180 frame
//   exit()          called when it is replaced or popped
//   overlay: true   (for pushed scenes) draw the scene underneath as well
//
// Register a factory so each visit gets a fresh scene:
//   scenes.register('title', () => new TitleScene());
//   scenes.go('title');                 replace everything, with a wipe
//   scenes.go('title', params, { wipe: 'dither' | 'iris' | 'none', focus: {x,y}, dur: 0.35 })
//   scenes.push('pause'); scenes.pop(); overlays on top of the current scene
//
// Unregistered names get a "coming soon" stub so the flow can be walked
// end-to-end before every scene exists.

import { W, H } from '../data/config.js';
import { input } from './input.js';
import { drawText } from './font.js';
import { tweens, ease } from './tween.js';
import { drawWipe } from './transition.js';
import { PAL } from '../data/palette.js';

const registry = new Map();
let stack = [];
let trans = null; // { phase: 'out'|'in', t, dur, kind, focus, next }

function swap(name, params) {
  const old = stack;
  stack = [];
  for (let i = old.length - 1; i >= 0; i--) old[i].exit?.();
  tweens.clear();
  stack.push(enter(make(name), params));
}

function enter(scene, params) {
  scene.enter?.(params);
  return scene;
}

function make(name) {
  const factory = registry.get(name);
  return factory ? factory() : stubScene(name);
}

function stubScene(name) {
  return {
    name,
    update() {
      if (input.pressed('primary') || input.pressed('pause')) scenes.go('title', null, { wipe: 'dither' });
    },
    draw(ctx) {
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(0, 0, W, H);
      drawText(ctx, name.toUpperCase(), W / 2, H / 2 - 14, { align: 'center', color: PAL.yellow });
      drawText(ctx, 'COMING SOON', W / 2, H / 2, { align: 'center', color: PAL.white });
      drawText(ctx, 'PRESS SPACE', W / 2, H / 2 + 20, { align: 'center', color: PAL.grey });
    },
  };
}

export const scenes = {
  register(name, factory) {
    registry.set(name, factory);
  },
  has: (name) => registry.has(name),

  /** The active (top) scene, or undefined. */
  get current() {
    return stack[stack.length - 1];
  },
  get stackSize() {
    return stack.length;
  },

  /** True while a wipe is running (scenes can ignore input meanwhile). */
  get busy() {
    return !!trans;
  },

  /**
   * Replace the whole stack with a fresh scene, covering the swap with a wipe.
   * The first scene (nothing to cover) and wipe:'none' switch instantly.
   */
  go(name, params, opts = {}) {
    const wipe = opts.wipe ?? 'iris';
    if (!stack.length || wipe === 'none') {
      trans = null;
      swap(name, params);
      return;
    }
    const dur = opts.dur ?? 0.35;
    if (trans && trans.phase === 'out') {
      trans.next = { name, params }; // retarget a wipe already closing
      return;
    }
    trans = { phase: 'out', t: 0, dur, kind: wipe, focus: opts.focus, next: { name, params } };
  },

  /** Put a scene on top (e.g. pause menu); the one below stops updating. */
  push(name, params) {
    stack.push(enter(make(name), params));
  },

  /** Remove the top scene and resume the one below. */
  pop() {
    const top = stack.pop();
    top?.exit?.();
    return top;
  },

  update(dt) {
    if (trans) {
      trans.t += dt;
      if (trans.phase === 'out' && trans.t >= trans.dur) {
        swap(trans.next.name, trans.next.params);
        trans.phase = 'in';
        trans.t = 0;
      } else if (trans.phase === 'in' && trans.t >= trans.dur) {
        trans = null;
      }
    }
    tweens.update(dt);
    // the outgoing scene is frozen while the wipe closes over it
    if (!trans || trans.phase === 'in') this.current?.update?.(dt);
  },

  draw(ctx) {
    // draw from the highest non-overlay scene upward
    let from = stack.length - 1;
    while (from > 0 && stack[from].overlay) from--;
    for (let i = Math.max(0, from); i < stack.length; i++) stack[i].draw?.(ctx);
    if (trans) {
      const p = ease.inOutQuad(Math.min(1, trans.t / trans.dur));
      drawWipe(ctx, trans.kind, trans.phase === 'out' ? p : 1 - p, trans.focus);
    }
  },
};
