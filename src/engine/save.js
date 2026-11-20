// Save data (M8): best stars and best time per level, kept in localStorage.
// Every access is wrapped in try/catch: private modes or blocked storage just
// mean nothing is remembered between visits.
//
//   recordResult(level, { stars, time })  -> keeps the best stars and the best time
//   getBest(level)                         -> { stars, time } (0 / null when never cleared)
//   totalStars()                           -> sum of best stars over all levels
//
// Shape: { v: VERSION, levels: { [levelNumber]: { stars, time } } }. Levels are keyed by
// their number in src/data/levels.js, so inserting a level needs a migration below that
// moves the later levels' entries up. Saves without `v` are version 1.

const KEY = 'pampa90.save';
const VERSION = 3;

/** MIGRATIONS[n] turns a version-n `levels` map into version n + 1. */
const MIGRATIONS = {
  // v2 (#108): Heading push-ups inserted as level 3 - Targeting 3 -> 4, Doctor check 4 -> 5.
  1: (levels) => renumber(levels, { 3: 4, 4: 5 }),
  // v3 (#107): Upside-down abs inserted as level 4 - Targeting 4 -> 5, Doctor check 5 -> 6.
  2: (levels) => renumber(levels, { 4: 5, 5: 6 }),
};

/** Copy of `levels` with the keys in `map` moved (old -> new); unlisted keys stay. */
function renumber(levels, map) {
  const out = {};
  for (const [k, v] of Object.entries(levels)) if (!(k in map)) out[k] = v;
  for (const [from, to] of Object.entries(map)) {
    if (levels[from]) out[to] = levels[from];
    else if (!(to in map)) delete out[to];
  }
  return out;
}

/** Bring a parsed save up to VERSION. Returns { data, changed }. */
export function migrate(parsed) {
  let v = Number.isInteger(parsed.v) ? parsed.v : 1;
  let levels = parsed.levels;
  const from = v;
  while (v < VERSION && MIGRATIONS[v]) levels = MIGRATIONS[v++](levels);
  return { data: { ...parsed, v: VERSION, levels }, changed: v !== from || parsed.v !== VERSION };
}

let data = { v: VERSION, levels: {} };
let loadedChanged = false;
try {
  const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (parsed && typeof parsed === 'object' && parsed.levels) ({ data, changed: loadedChanged } = migrate(parsed));
} catch { /* corrupt or unavailable - start fresh */ }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}
if (loadedChanged) persist();

export function getBest(level) {
  const e = data.levels[level] || {};
  return { stars: e.stars ?? 0, time: e.time ?? null };
}

export function recordResult(level, { stars = 0, time = null } = {}) {
  const e = data.levels[level] || {};
  const best = {
    stars: Math.max(e.stars ?? 0, stars),
    time: e.time == null ? time : time == null ? e.time : Math.min(e.time, time),
  };
  data.levels[level] = best;
  persist();
  return best;
}

export function totalStars(levelCount) {
  let sum = 0;
  for (let l = 1; l <= levelCount; l++) sum += getBest(l).stars;
  return sum;
}
