// Input abstraction: keyboard, touch zones and gamepad all feed named actions.
// Scenes only ever read actions, never raw keys.
//
//   input.down('primary')      held this step
//   input.pressed('primary')   went down since the previous step
//   input.released('primary')  went up since the previous step
//
// Call input.update() once at the start of every fixed step.

export const ACTIONS = ['left', 'right', 'up', 'down', 'primary', 'secondary', 'pause', 'mute'];

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'primary', Enter: 'primary', KeyZ: 'primary',
  KeyB: 'secondary', KeyX: 'secondary', ShiftLeft: 'secondary', ShiftRight: 'secondary',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
};

const none = () => Object.fromEntries(ACTIONS.map((a) => [a, false]));

const kbd = none();
const touch = none();
const pad = none();
const latch = none(); // taps shorter than one step still register as "pressed"
let cur = none();
let prev = none();
let edgeDown = none();
let edgeUp = none();

const firstInputListeners = [];
let gotFirstInput = false;
function firstInput() {
  if (gotFirstInput) return;
  gotFirstInput = true;
  firstInputListeners.forEach((fn) => fn());
}
/** Run fn on the first user gesture (used to unlock WebAudio). */
export function onFirstInput(fn) {
  if (gotFirstInput) fn();
  else firstInputListeners.push(fn);
}

// ---------------------------------------------------------------- keyboard
window.addEventListener('keydown', (e) => {
  const a = KEYMAP[e.code];
  if (!a) return;
  e.preventDefault();
  firstInput();
  if (!e.repeat) latch[a] = true;
  kbd[a] = true;
});
window.addEventListener('keyup', (e) => {
  const a = KEYMAP[e.code];
  if (!a) return;
  e.preventDefault();
  kbd[a] = false;
});
window.addEventListener('blur', () => ACTIONS.forEach((a) => { kbd[a] = false; }));

// ---------------------------------------------------------------- touch
// Each on-screen button tracks the pointer ids holding it so multi-touch works
// (left thumb on the D-pad, right thumb on A at the same time).
export const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches
  || 'ontouchstart' in window;

const holders = Object.fromEntries(ACTIONS.map((a) => [a, new Set()]));

function press(action, id) {
  holders[action].add(id);
  touch[action] = true;
  latch[action] = true;
  firstInput();
}
function release(action, id) {
  holders[action].delete(id);
  touch[action] = holders[action].size > 0;
}

function makeButton(root, action, label, cls) {
  const b = document.createElement('div');
  b.className = `tbtn ${cls}`;
  b.dataset.action = action;
  b.textContent = label;
  const end = (e) => { release(action, e.pointerId); b.classList.toggle('on', touch[action]); };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    press(action, e.pointerId);
    b.classList.add('on');
  });
  b.addEventListener('pointerup', end);
  b.addEventListener('pointercancel', end);
  b.addEventListener('lostpointercapture', end);
  root.appendChild(b);
  return b;
}

/** Build the translucent on-screen controls (only shown on touch devices). */
export function createTouchControls(parent = document.body) {
  const root = document.createElement('div');
  root.id = 'touch';
  const dpad = document.createElement('div');
  dpad.className = 'dpad';
  makeButton(dpad, 'up', '▲', 'up');
  makeButton(dpad, 'left', '◀', 'left');
  makeButton(dpad, 'right', '▶', 'right');
  makeButton(dpad, 'down', '▼', 'down');
  const acts = document.createElement('div');
  acts.className = 'acts';
  makeButton(acts, 'secondary', 'B', 'b');
  makeButton(acts, 'primary', 'A', 'a');
  root.append(dpad, acts);
  makeButton(root, 'pause', 'II', 'pausebtn');
  parent.appendChild(root);
  root.hidden = !isTouchDevice;
  return root;
}

// ---------------------------------------------------------------- gamepad
function pollGamepad() {
  const g = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
  const b = (i) => !!g?.buttons[i]?.pressed;
  const ax = g?.axes[0] ?? 0;
  const ay = g?.axes[1] ?? 0;
  pad.left = !!g && (b(14) || ax < -0.5);
  pad.right = !!g && (b(15) || ax > 0.5);
  pad.up = !!g && (b(12) || ay < -0.5);
  pad.down = !!g && (b(13) || ay > 0.5);
  pad.primary = b(0);
  pad.secondary = b(1) || b(2);
  pad.pause = b(9);
  pad.mute = false;
  if (g && ACTIONS.some((a) => pad[a])) firstInput();
}

// ---------------------------------------------------------------- per step
export const input = {
  update() {
    pollGamepad();
    prev = cur;
    cur = none();
    edgeDown = none();
    edgeUp = none();
    for (const a of ACTIONS) {
      cur[a] = kbd[a] || touch[a] || pad[a];
      edgeDown[a] = latch[a] || (cur[a] && !prev[a]);
      edgeUp[a] = !cur[a] && prev[a];
      latch[a] = false;
    }
  },
  down: (a) => cur[a],
  pressed: (a) => edgeDown[a],
  released: (a) => edgeUp[a],
  /** -1 / 0 / 1 from a left/right (or up/down) pair. */
  axis: (neg, pos) => (cur[pos] ? 1 : 0) - (cur[neg] ? 1 : 0),
  /** True if any action fired this step (for "press any key"). */
  any: () => ACTIONS.some((a) => edgeDown[a]),
};
