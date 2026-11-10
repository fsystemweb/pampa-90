// Save data (M8): best stars and best time per level, kept in localStorage.
// Every access is wrapped in try/catch: private modes or blocked storage just
// mean nothing is remembered between visits.
//
//   recordResult(level, { stars, time })  -> keeps the best stars and the best time
//   getBest(level)                         -> { stars, time } (0 / null when never cleared)
//   totalStars()                           -> sum of best stars over all levels

const KEY = 'pampa90.save';

let data = { levels: {} };
try {
  const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (parsed && typeof parsed === 'object' && parsed.levels) data = parsed;
} catch { /* corrupt or unavailable - start fresh */ }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

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

export function totalStars(levelCount = 4) {
  let sum = 0;
  for (let l = 1; l <= levelCount; l++) sum += getBest(l).stars;
  return sum;
}
