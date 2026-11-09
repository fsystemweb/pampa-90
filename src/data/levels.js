// Level order and briefing content. The game is linear: L1 -> L2 -> L3 -> L4 -> ending.
// All text comes from strings.js (keys below).

export const LEVELS = [
  {
    id: 1, scene: 'level1', name: 'l1.name', lines: ['l1.b1', 'l1.b2', 'l1.b3'], hint: 'l1.hint',
    controls: [['move', 'ctl.move'], ['primary', 'ctl.shave'], ['secondary', 'ctl.dip']],
  },
  {
    id: 2, scene: 'level2', name: 'l2.name', lines: ['l2.b1', 'l2.b2', 'l2.b3'], hint: 'l2.hint',
    controls: [['primary', 'ctl.hop']],
  },
  {
    id: 3, scene: 'level3', name: 'l3.name', lines: ['l3.b1', 'l3.b2', 'l3.b3'], hint: 'l3.hint',
    controls: [['primary', 'ctl.jump']],
  },
  {
    id: 4, scene: 'level4', name: 'l4.name', lines: ['l4.b1', 'l4.b2', 'l4.b3'], hint: 'l4.hint',
    controls: [['primary', 'ctl.breathe']],
  },
];

export const LEVEL_COUNT = LEVELS.length;

/** Where to go once `level` is finished: [sceneName, params]. */
export function nextAfter(level) {
  return level >= LEVEL_COUNT ? ['ending', { stars: null }] : ['briefing', { level: level + 1 }];
}
