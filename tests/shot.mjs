// README screenshots: walks the game in Chromium and saves one PNG per key screen to
// screenshots/ (canvas only, 3x the 320x180 resolution), plus the share score card.
//   node tests/shot.mjs            (npm run shots)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, sleep, startServer, waitBoot, waitScene, goScene, goLevel, headerOnce } from './lib.mjs';

const OUT = path.join(ROOT, 'screenshots');
mkdirSync(OUT, { recursive: true });
const server = await startServer();
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('pampa90.save', JSON.stringify({ v: 2, levels: { 1: { stars: 3, time: 24.6 }, 2: { stars: 3, time: 41.2 }, 3: { stars: 2, time: 47.3 }, 4: { stars: 2, time: 19.8 }, 5: { stars: 3, time: 35.4 } } })); } catch { /* ignore */ }
    // the mute / fullscreen buttons are DOM overlays on top of the canvas: keep them out
    addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '#fs-btn, #mute-btn, #touch { display: none !important; }';
      document.head.appendChild(st);
    });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[uncaught]', e.message));
  await page.goto(server.url);
  await waitBoot(page);
  const shot = async (name) => {
    await page.locator('#game').screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('wrote', `screenshots/${name}.png`);
  };
  const press = async (key, ms = 0) => { await page.keyboard.down(key); await sleep(ms || 60); await page.keyboard.up(key); };

  await waitScene(page, 'title');
  await sleep(1500);
  await shot('title');
  await press('Enter');
  await waitScene(page, 'intro');
  await sleep(2600);
  await shot('intro');
  await press('KeyB');
  await waitScene(page, 'briefing');
  await sleep(3500);
  await shot('briefing');

  // each minigame, with a bit of real input so it looks mid-play
  await goLevel(page, 'shave');
  await sleep(2500);
  await page.keyboard.down('Space');
  await page.keyboard.down('ArrowRight'); await sleep(500); await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowDown'); await sleep(400); await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowLeft'); await sleep(500); await page.keyboard.up('ArrowLeft');
  await shot('shaving');
  await page.keyboard.up('Space');

  await goLevel(page, 'run');
  await sleep(3500);
  await press('Space');
  await sleep(220);
  await shot('resistance');

  await goLevel(page, 'header');
  await sleep(600);
  await headerOnce(page);
  await shot('headers');

  await goLevel(page, 'kick');
  await sleep(1700);
  await shot('targeting');

  await goLevel(page, 'doctor');
  await sleep(2500);
  for (let i = 0; i < 3; i++) { await press('Space', 900); await sleep(900); }
  await page.keyboard.down('Space'); await sleep(500);
  await shot('doctor');
  await page.keyboard.up('Space');

  await goScene(page, 'results', { level: 4, stars: 2, time: 19.8, passed: true });
  await sleep(2200);
  await shot('results');
  await goScene(page, 'ending');
  await sleep(4600);
  await shot('ending');

  // the share card, rendered by the game itself
  const dataUrl = await page.evaluate(async () => {
    const m = await import('./src/engine/scorecard.js');
    return m.renderScoreCard().toDataURL('image/png');
  });
  writeFileSync(path.join(OUT, 'scorecard.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote screenshots/scorecard.png');
} finally {
  await browser.close();
  server.stop();
}
