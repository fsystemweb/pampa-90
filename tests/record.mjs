// README gameplay GIF: plays a short scripted run in Chromium with Playwright's video
// recorder (640x360 = 2x the game), then ffmpeg scales it to 480x270 and builds a palette GIF.
//   node tests/record.mjs          (npm run record)  -> screenshots/pampa-90.gif
// Needs ffmpeg on the PATH.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT, sleep, startServer, waitBoot, waitScene, goScene } from './lib.mjs';

const TMP = path.join(ROOT, 'screenshots/tmp/video');
const OUT = path.join(ROOT, 'screenshots/pampa-90.gif');
const FPS = 10;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const server = await startServer();
const browser = await chromium.launch();
let video;
try {
  const size = { width: 640, height: 360 };
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: TMP, size } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('pampa90.save', JSON.stringify({ levels: { 1: { stars: 3, time: 24.6 }, 2: { stars: 3, time: 41.2 }, 3: { stars: 2, time: 19.8 }, 4: { stars: 3, time: 35.4 } } })); } catch { /* ignore */ }
    // the touch / mute / fullscreen buttons are DOM overlays: keep them out of the clip
    addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '#fs-btn, #mute-btn, #touch { display: none !important; }';
      document.head.appendChild(st);
    });
  });
  const page = await ctx.newPage();
  video = page.video();
  const t0 = Date.now();
  const marks = [];
  const mark = (label) => marks.push([label, (Date.now() - t0) / 1000]);
  const press = async (key, ms = 60) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };

  await page.goto(server.url);
  await waitBoot(page);
  await waitScene(page, 'title');
  mark('start');
  await sleep(2200);
  await press('Enter');
  await waitScene(page, 'intro');
  await sleep(2600);
  await press('KeyB');
  await waitScene(page, 'briefing');
  await sleep(1600);

  // L1: shave a few strokes
  await goScene(page, 'level1', { level: 1 });
  await sleep(1800);
  await page.keyboard.down('Space');
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) { await page.keyboard.down(k); await sleep(420); await page.keyboard.up(k); }
  await page.keyboard.up('Space');

  // L2: hop over the cows
  await goScene(page, 'level2', { level: 2 });
  await sleep(1500);
  for (let i = 0; i < 5; i++) { await press('Space'); await sleep(600); if (i === 2) await press('ArrowDown'); }

  // L3: timing ring, then aim
  await goScene(page, 'level3', { level: 3 });
  await sleep(1600);
  for (let i = 0; i < 4; i++) { await press('Space'); await sleep(700); }

  // L4: breathe in / out
  await goScene(page, 'level4', { level: 4 });
  await sleep(1500);
  for (let i = 0; i < 3; i++) { await press('Space', 900); await sleep(800); }

  await goScene(page, 'ending');
  await sleep(5600);
  mark('end');
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}

const src = await video.path();
const vf = `fps=${FPS},scale=480:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`;
// skip the blank first second while the page boots
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.0', '-i', src, '-vf', vf, '-loop', '0', OUT]);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
