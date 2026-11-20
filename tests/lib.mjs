// Shared Playwright helpers for the dev scripts in tests/ (smoke, shot, record).
// The game itself has no build step: these only serve the repo root and drive a browser.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function argVal(name, def) {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
}

/** Serve the repo root with python's static server on a random port. Returns { url, stop }. */
export async function startServer() {
  const port = 8100 + Math.floor(Math.random() * 800);
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}/index.html`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) return { url, stop: () => proc.kill() }; } catch { /* not up yet */ }
    await sleep(100);
  }
  proc.kill();
  throw new Error('static server did not start');
}

/** Wait until the game booted (window.pampa exists and a scene is active). */
export const waitBoot = (page, timeout = 20000) => page.waitForFunction(() => window.pampa?.scenes?.name, null, { timeout });

/** Wait until the active scene is `name` and no wipe is running. */
export async function waitScene(page, name, timeout = 15000) {
  try {
    await page.waitForFunction((n) => window.pampa.scenes.name === n && !window.pampa.scenes.busy, name, { timeout, polling: 50 });
  } catch {
    const cur = await page.evaluate(() => window.pampa?.scenes?.name).catch(() => '?');
    throw new Error(`timed out waiting for scene "${name}" (current: ${cur})`);
  }
}

/** Jump straight to a scene through the scene manager (instant, no wipe). */
export const goScene = (page, name, params = null) =>
  page.evaluate(([n, p]) => window.pampa.scenes.go(n, p, { wipe: 'none' }), [name, params]);

/** Jump to the level with this key (src/data/levels.js), whatever its number. Returns its def. */
export async function goLevel(page, key) {
  const def = await page.evaluate(async (k) => {
    const { LEVELS } = await import('./src/data/levels.js');
    const d = LEVELS.find((l) => l.key === k);
    return d && { id: d.id, scene: d.scene };
  }, key);
  if (!def) throw new Error(`no level with key ${key}`);
  await goScene(page, def.scene, { level: def.id });
  return def;
}

/** Hold primary through the next toss in the heading push-ups and let go just before the ball arrives. */
export async function headerOnce(page, tail = 90) {
  await page.waitForFunction(() => window.pampa.scenes.current.phase === 'flight', null, { polling: 'raf', timeout: 10000 });
  await page.waitForFunction(() => { const s = window.pampa.scenes.current; return (s.elapsed - s.flightT0) / s.flight > 0.45; }, null, { polling: 'raf' });
  await page.keyboard.down('Space');
  await page.waitForFunction(() => { const s = window.pampa.scenes.current; return s.elapsed >= s.flightT0 + s.flight - 0.15; }, null, { polling: 'raf' });
  await page.keyboard.up('Space');
  await sleep(tail);
}

/** Mean / spread / colour count of a PNG, measured in a helper page: catches blank frames. */
export async function analyse(helper, png) {
  return helper.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 160; c.height = 90;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 160, 90);
    const d = g.getImageData(0, 0, 160, 90).data;
    let sum = 0, sum2 = 0;
    const colours = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += l; sum2 += l * l;
      colours.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4));
    }
    const n = d.length / 4, mean = sum / n;
    return { w: img.width, h: img.height, mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), colours: colours.size };
  }, png.toString('base64'));
}

/** Screenshot of just the game canvas. */
export const canvasShot = (page, file) => page.locator('#game').screenshot({ path: file });
