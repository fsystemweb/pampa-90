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
//   scenes.go('title');                 replace everything
//   scenes.push('pause'); scenes.pop(); overlays on top of the current scene
//
// Unregistered names get a "coming soon" stub so the flow can be walked
// end-to-end before every scene exists.

import { W, H } from '../data/config.js';
import { input } from './input.js';
import { drawText } from './font.js';
import { tweens } from './tween.js';
import { PAL } from '../data/palette.js';

const registry = new Map();
let stack = [];

function make(name) {
  const factory = registry.get(name);
  return factory ? factory() : stubScene(name);
}

function stubScene(name) {
  return {
    name,
    update() {
      if (input.pressed('primary') || input.pressed('pause')) scenes.go('title');
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

function enter(scene, params) {
  scene.enter?.(params);
  return scene;
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

  /** Replace the whole stack with a fresh scene. */
  go(name, params) {
    const old = stack;
    stack = [];
    for (let i = old.length - 1; i >= 0; i--) old[i].exit?.();
    tweens.clear();
    stack.push(enter(make(name), params));
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
    tweens.update(dt);
    this.current?.update?.(dt);
  },

  draw(ctx) {
    // draw from the highest non-overlay scene upward
    let from = stack.length - 1;
    while (from > 0 && stack[from].overlay) from--;
    for (let i = Math.max(0, from); i < stack.length; i++) stack[i].draw?.(ctx);
  },
};
