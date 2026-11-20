// Level order and briefing content. The game is linear: level 1 -> ... -> LEVEL_COUNT -> ending.
// All text comes from strings.js (keys below).
//
// Each level has a stable `key`; its number (`id`, 1-based) and scene name (`level<id>`,
// so index.html#scene=level3 jumps to the third level) follow from its position here.
// Scenes ask for their own number with levelOf(key), so reordering only touches this list
// (plus a save migration in engine/save.js: saves are keyed by level number).

const ORDER = [
  {
    key: 'shave', name: 'l1.name', lines: ['l1.b1', 'l1.b2', 'l1.b3'], hint: 'l1.hint',
    controls: [['move', 'ctl.move'], ['primary', 'ctl.shave'], ['secondary', 'ctl.dip']],
  },
  {
    key: 'run', name: 'l2.name', lines: ['l2.b1', 'l2.b2', 'l2.b3'], hint: 'l2.hint',
    controls: [['primary', 'ctl.hop']],
  },
  {
    key: 'header', name: 'hp.name', lines: ['hp.b1', 'hp.b2', 'hp.b3'], hint: 'hp.hint',
    controls: [['primary', 'ctl.header']],
  },
  {
    key: 'abs', name: 'abs.name', lines: ['abs.b1', 'abs.b2', 'abs.b3'], hint: 'abs.hint',
    controls: [['primary', 'ctl.curl']],
  },
  {
    key: 'kick', name: 'l3.name', lines: ['l3.b1', 'l3.b2', 'l3.b3'], hint: 'l3.hint',
    controls: [['primary', 'ctl.jump']],
  },
  {
    key: 'doctor', name: 'l4.name', lines: ['l4.b1', 'l4.b2', 'l4.b3'], hint: 'l4.hint',
    controls: [['primary', 'ctl.breathe']],
  },
];

export const LEVELS = ORDER.map((def, i) => ({ ...def, id: i + 1, scene: `level${i + 1}` }));

export const LEVEL_COUNT = LEVELS.length;

/** 1-based level number of the level with this key. */
export function levelOf(key) {
  const i = LEVELS.findIndex((d) => d.key === key);
  if (i < 0) throw new Error(`unknown level key ${key}`);
  return i + 1;
}

/** Where to go once `level` is finished: [sceneName, params]. */
export function nextAfter(level) {
  return level >= LEVEL_COUNT ? ['ending', { stars: null }] : ['briefing', { level: level + 1 }];
}
