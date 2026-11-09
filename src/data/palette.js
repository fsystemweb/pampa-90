// Shared 32-colour palette (PLAN.md §2). Every sprite and draw call should use
// these names so the whole game keeps an authentic limited-palette look.

export const PAL = Object.freeze({
  // neutrals
  black:      '#14121c',
  ink:        '#2b2a3a',
  grey:       '#6b6c7a',
  silver:     '#b4b6c0',
  white:      '#f4f1e8',

  // sky
  sky:        '#bfe3f5', // wash-out sky
  skyHi:      '#8ec8ea',
  skyDeep:    '#4f9ad0',
  dusk:       '#f2a65a', // intro sunset
  duskDeep:   '#c2547a',
  cloud:      '#ffffff',

  // pampas
  grass:      '#a8b04a',
  grassDark:  '#6f8a2e',
  grassDeep:  '#4a6420',
  tree:       '#2f5a2a',
  treeDark:   '#1f3d22',

  // earth & wood
  dirt:       '#b58b62',
  dirtDark:   '#8a6444',
  wood:       '#7a5230',
  woodDark:   '#4e321f',
  gold:       '#e0b83c', // mirror frame
  goldDark:   '#a8801f',

  // skin
  skin:       '#e8b48a',
  skinDark:   '#b9805a',

  // 90s sportswear accents
  blue:       '#2a5bd7',
  blueDark:   '#1c3a8f',
  teal:       '#18b5a8',
  tealDark:   '#0e7a76',
  magenta:    '#d8379b',
  yellow:     '#f7d31f',
  red:        '#d9382b', // nicks, warnings
  pink:       '#f08ab4', // bucket
});

export const COLORS = Object.freeze(Object.values(PAL));
export const COLOR_COUNT = COLORS.length;

// Index helpers for palette-swap / flash effects.
export const NAMES = Object.freeze(Object.keys(PAL));
export const colorAt = (i) => COLORS[((i % COLOR_COUNT) + COLOR_COUNT) % COLOR_COUNT];
