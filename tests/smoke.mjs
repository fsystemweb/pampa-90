// Pampa '90 - headless smoke test (Playwright).
//
// Serves the repo root with `python3 -m http.server`, loads the game and walks the whole flow
// with the keyboard: title -> intro -> briefing -> each minigame -> results -> ending -> share.
// Also checks that a save from the 4-level game is migrated (engine/save.js).
// Fails on any console error, uncaught exception or failed request, on a blank frame, or when a
// scene transition does not happen. Also covers: EN + ES at load, mute, pause, the score card
// (Web Share and the download fallback), and touch / landscape / portrait on mobile emulation.
// Every step saves a screenshot to screenshots/tmp/<browser>/.
//
// Usage:
//   node tests/smoke.mjs                                  # Chromium, local folder
//   node tests/smoke.mjs --browsers chromium,firefox,webkit
//   node tests/smoke.mjs --url https://fsystemweb.github.io/pampa-90/   # a deployed build

import { chromium, firefox, webkit, devices } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, sleep, argVal, startServer, waitBoot, waitScene, goScene, analyse, canvasShot } from './lib.mjs';

const ENGINES = { chromium, firefox, webkit };
const BROWSERS = argVal('--browsers', 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
const PLAY_URL = 'https://fsystemweb.github.io/pampa-90/';
let URL = argVal('--url', null);

// Captures navigator.share calls (the PNG is turned into a data URL so the test can check it).
const SHARE_STUB = () => {
  window.__shared = null;
  const read = (f) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
  navigator.canShare = () => true;
  navigator.share = async (data) => {
    const files = await Promise.all((data.files || []).map(async (f) => ({ name: f.name, type: f.type, size: f.size, url: await read(f) })));
    window.__shared = { title: data.title, text: data.text, url: data.url, files };
  };
};

async function runBrowser(name) {
  const problems = [];
  const OUT = path.join(ROOT, 'screenshots/tmp', name);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const args = name === 'chromium' ? ['--autoplay-policy=no-user-gesture-required'] : [];
  const browser = await ENGINES[name].launch({ headless: true, args });
  const helper = await browser.newPage();
  let shotN = 0;

  const watch = (page, tag = '') => {
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`${tag}console.error: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`${tag}uncaught: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`${tag}request failed: ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`${tag}HTTP ${r.status()}: ${r.url()}`); });
  };
  const shot = async (page, label) => {
    const file = path.join(OUT, `${String(++shotN).padStart(2, '0')}-${label}.png`);
    const png = await canvasShot(page, file);
    const a = await analyse(helper, png);
    console.log(`  [${name}] ${label.padEnd(18)} std=${a.std.toFixed(1).padStart(5)} colours=${a.colours}`);
    if (a.std < 6 || a.colours < 6) problems.push(`screenshot "${label}" looks blank (std ${a.std.toFixed(1)}, colours ${a.colours})`);
  };
  const tap = async (page, key) => { await page.keyboard.press(key); await sleep(80); };
  const info = (page) => page.evaluate(() => window.pampa.info());
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  // keep pressing until the scene changes (briefings reveal their text on the first press)
  const pressUntil = async (page, key, scene, tries = 6) => {
    for (let i = 0; i < tries; i++) {
      await page.keyboard.press(key);
      try { await waitScene(page, scene, 1500); return; } catch { /* press again */ }
    }
    await waitScene(page, scene, 3000);
  };

  try {
    // ------------------------------------------------------------ desktop walk-through
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript(SHARE_STUB);
    const page = await ctx.newPage();
    watch(page);
    await page.goto(URL, { waitUntil: 'load' });
    await waitBoot(page);
    await waitScene(page, 'title');
    await sleep(600);
    await shot(page, 'title');

    // integer scaling: 1280x720 fits the 320x180 canvas exactly 4x
    const i0 = await info(page);
    check(i0.canvas.w % 320 === 0 && i0.canvas.h % 180 === 0, `canvas not integer-scaled: ${JSON.stringify(i0.canvas)}`);
    check(i0.lang === 'en', `default language is ${i0.lang}, expected en`);

    // language toggle (L) and back
    await page.keyboard.press('KeyL');
    await sleep(200);
    check((await info(page)).lang === 'es', 'L did not switch to ES');
    await shot(page, 'title-es');
    await page.keyboard.press('KeyL');
    await sleep(100);

    // start: the first key press creates / resumes the AudioContext
    await page.keyboard.press('Enter');
    await waitScene(page, 'intro');
    const a1 = await info(page);
    check(a1.audio !== 'none', 'AudioContext not created on first input');
    if (name === 'chromium') check(a1.audio === 'running', `AudioContext not running after first input (${a1.audio})`);
    await page.keyboard.press('KeyM');
    await sleep(100);
    check((await info(page)).muted, 'M did not mute');
    await page.keyboard.press('KeyM');
    await sleep(100);
    check(!(await info(page)).muted, 'M did not unmute');
    await sleep(1200);
    await shot(page, 'intro');

    // skip the intro (B) -> briefing 1
    await page.keyboard.press('KeyB');
    await waitScene(page, 'briefing');
    await sleep(900);
    await shot(page, 'briefing-1');

    // [stars, time] per level, in the order of src/data/levels.js
    const results = [[3, 21.4], [2, 33.0], [2, 44.0], [3, 47.9], [3, 18.2], [1, 40.5]];
    const levelCount = await page.evaluate(async () => (await import('./src/data/levels.js')).LEVEL_COUNT);
    check(levelCount === results.length, `smoke results cover ${results.length} levels, the game has ${levelCount}`);
    const totalStars = results.reduce((n, [st]) => n + st, 0);
    for (let lvl = 1; lvl <= levelCount; lvl++) {
      await pressUntil(page, 'Enter', `level${lvl}`);
      await sleep(1500);
      // a little real input in every minigame
      await page.keyboard.down('Space');
      await page.keyboard.down('ArrowRight');
      await sleep(400);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('Space');
      await sleep(800);
      await shot(page, `level${lvl}`);
      if (lvl === 1) {
        await page.keyboard.press('KeyP');
        await sleep(200);
        check((await info(page)).paused.includes('user'), 'P did not pause');
        await shot(page, 'pause-menu');
        await page.keyboard.press('KeyP');
        await sleep(200);
        check((await info(page)).paused.length === 0, 'P did not resume');
      }
      // finish the level through the scene manager (with a real wipe)
      const [stars, time] = results[lvl - 1];
      await page.evaluate(([l, s, t]) => window.pampa.scenes.go('results', { level: l, stars: s, time: t, passed: true }, { wipe: 'iris' }), [lvl, stars, time]);
      await waitScene(page, 'results');
      await sleep(1900);
      await shot(page, `results-${lvl}`);
      await pressUntil(page, 'Enter', lvl < levelCount ? 'briefing' : 'ending');
    }

    // ending: wait for the menu, then SHARE (down, down, Enter)
    await sleep(4400);
    await shot(page, 'ending');
    await tap(page, 'ArrowDown');
    await tap(page, 'ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__shared, null, { timeout: 5000 }).catch(() => problems.push('SHARE did not call navigator.share'));
    const shared = await page.evaluate(() => window.__shared);
    if (shared) {
      check(shared.url === PLAY_URL, `share url is ${shared.url}`);
      const want = `${totalStars}/${levelCount * 3}`;
      check(shared.text.includes(want), `share text has no ${want} total: ${shared.text}`);
      const f = shared.files[0];
      check(f && f.type === 'image/png', 'share has no PNG file');
      if (f) {
        const png = Buffer.from(f.url.split(',')[1], 'base64');
        writeFileSync(path.join(OUT, 'scorecard-en.png'), png);
        const a = await analyse(helper, png);
        check(a.w === 1280 && a.h === 720, `score card is ${a.w}x${a.h}, expected 1280x720`);
        check(a.colours > 10, 'score card looks blank');
      }
    }
    await sleep(300);
    await shot(page, 'ending-shared');
    // TO THE WORLD CUP -> title
    await tap(page, 'ArrowUp');
    await tap(page, 'ArrowUp');
    await page.keyboard.press('Enter');
    await waitScene(page, 'title');
    await ctx.close();

    // ------------------------------------------------------------ ES at load + fallback share (download)
    const es = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
    await es.addInitScript(() => {
      try {
        localStorage.setItem('pampa90.lang', 'es');
        // a version-1 save from the 4-level game (no `v`): must be migrated on load
        localStorage.setItem('pampa90.save', JSON.stringify({ levels: { 1: { stars: 3, time: 20.1 }, 2: { stars: 2, time: 31 }, 3: { stars: 1, time: 17.5 }, 4: { stars: 3, time: 38 } } }));
      } catch { /* ignore */ }
      // no Web Share API: force the download + clipboard fallback
      try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch { /* ignore */ }
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });
    const p2 = await es.newPage();
    watch(p2, 'es: ');
    await p2.goto(URL, { waitUntil: 'load' });
    await waitBoot(p2);
    await waitScene(p2, 'title');
    check((await info(p2)).lang === 'es', 'saved language ES not applied at load');
    check((await p2.evaluate(() => document.documentElement.lang)) === 'es', '<html lang> not es at load');
    // save migration (v1 -> v3): Targeting 3 -> 5 and Doctor check 4 -> 6, the new levels 3 and 4 start empty
    const saved = await p2.evaluate(() => JSON.parse(localStorage.getItem('pampa90.save')));
    check(saved?.v === 3 && !saved.levels[3] && !saved.levels[4] && saved.levels[5]?.stars === 1 && saved.levels[6]?.stars === 3 && saved.levels[1]?.stars === 3,
      `old save not migrated: ${JSON.stringify(saved)}`);
    await sleep(500);
    await shot(p2, 'title-es-load');
    await goScene(p2, 'ending');
    await p2.keyboard.press('Space'); // first gesture
    await sleep(4400);
    await shot(p2, 'ending-es');
    const dl = p2.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await tap(p2, 'ArrowDown');
    await tap(p2, 'ArrowDown');
    await p2.keyboard.press('Enter');
    const d = await dl;
    if (!d) problems.push('fallback share did not download the card');
    else {
      check(d.suggestedFilename() === 'pampa-90-score.png', `download name ${d.suggestedFilename()}`);
      await d.saveAs(path.join(OUT, 'scorecard-es.png'));
    }
    await sleep(400);
    await shot(p2, 'ending-es-saved');
    await es.close();

    // ------------------------------------------------------------ mobile (touch, landscape / portrait)
    if (name !== 'firefox') { // Firefox has no isMobile / touch emulation in Playwright
      const dev = name === 'webkit' ? devices['iPhone 13 landscape'] : devices['Pixel 7 landscape'];
      const mob = await browser.newContext({ ...dev });
      await mob.addInitScript(SHARE_STUB);
      const mp = await mob.newPage();
      watch(mp, 'mobile: ');
      await mp.goto(URL, { waitUntil: 'load' });
      await waitBoot(mp);
      await waitScene(mp, 'title');
      check(!(await mp.evaluate(() => document.getElementById('touch').hidden)), 'touch controls hidden on a touch device');
      check(!(await mp.isVisible('#rotate')), 'rotate overlay shown in landscape');
      const vp = mp.viewportSize();
      const c = await info(mp);
      check(c.canvas.w <= vp.width + 0.5 && c.canvas.h <= vp.height + 0.5, `canvas ${c.canvas.w}x${c.canvas.h} overflows ${vp.width}x${vp.height}`);
      check(c.canvas.w >= vp.width * 0.85 || c.canvas.h >= vp.height * 0.85, `canvas ${c.canvas.w}x${c.canvas.h} wastes the ${vp.width}x${vp.height} screen`);
      await sleep(400);
      await shot(mp, 'mobile-title');
      // tap the canvas to start (and unlock audio)
      const box = await mp.locator('#game').boundingBox();
      await mp.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.6);
      await waitScene(mp, 'intro');
      check((await info(mp)).audio !== 'none', 'mobile: AudioContext not created on first tap');
      // portrait: overlay + pause, back to landscape: resumes
      await mp.setViewportSize({ width: vp.height, height: vp.width });
      await sleep(400);
      check(await mp.isVisible('#rotate'), 'rotate overlay not shown in portrait');
      check((await info(mp)).paused.includes('orientation'), 'portrait did not pause the game');
      await mp.screenshot({ path: path.join(OUT, `${String(++shotN).padStart(2, '0')}-mobile-portrait.png`) });
      await mp.setViewportSize(vp);
      await sleep(400);
      check(!(await info(mp)).paused.includes('orientation'), 'landscape did not resume the game');
      // on-screen A button drives a minigame
      await goScene(mp, 'level2', { level: 2 });
      await sleep(1200);
      await mp.locator('#touch .a').tap();
      await sleep(300);
      await shot(mp, 'mobile-level2');
      await mp.screenshot({ path: path.join(OUT, `${String(++shotN).padStart(2, '0')}-mobile-page.png`) });
      // heading push-ups: hold the A button to load, let go to push up
      await goScene(mp, 'level3', { level: 3 });
      await sleep(800);
      const abtn = mp.locator('#touch .a');
      await abtn.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true });
      await sleep(350);
      check(await mp.evaluate(() => window.pampa.scenes.current.loading === true), 'mobile: holding A did not load the push-up');
      await shot(mp, 'mobile-level3-hold');
      await abtn.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true });
      await sleep(100);
      check(await mp.evaluate(() => { const s = window.pampa.scenes.current; return !s.loading && s.releaseT > 0; }), 'mobile: releasing A did not push up');
      // upside-down abs: holding A curls up
      await goScene(mp, 'level4', { level: 4 });
      await sleep(600);
      await abtn.dispatchEvent('pointerdown', { pointerId: 8, pointerType: 'touch', isPrimary: true, bubbles: true });
      await sleep(400);
      check(await mp.evaluate(() => window.pampa.scenes.current.curl > 0.3), 'mobile: holding A did not curl up');
      await shot(mp, 'mobile-level4-hold');
      await abtn.dispatchEvent('pointerup', { pointerId: 8, pointerType: 'touch', isPrimary: true, bubbles: true });
      await goScene(mp, 'level2', { level: 2 });
      await sleep(300);
      // the II button pauses
      await mp.locator('#touch .pausebtn').tap();
      await sleep(200);
      check((await info(mp)).paused.includes('user'), 'touch II did not pause');
      await mp.locator('#touch .pausebtn').tap();
      // ending: tap the SHARE row
      await goScene(mp, 'ending');
      await sleep(4300);
      const b2 = await mp.locator('#game').boundingBox();
      await mp.touchscreen.tap(b2.x + b2.width / 2, b2.y + (172 / 180) * b2.height);
      await mp.waitForFunction(() => window.__shared, null, { timeout: 5000 }).catch(() => problems.push('mobile: tapping SHARE did not share'));
      await shot(mp, 'mobile-ending');
      await mob.close();
    }
  } catch (e) {
    problems.push(`test error: ${e.stack || e.message}`);
  }
  await browser.close();
  return problems;
}

let server = null;
let failed = false;
try {
  if (!URL) { server = await startServer(); URL = server.url; }
  console.log(`smoke: ${URL}  browsers: ${BROWSERS.join(', ')}`);
  for (const b of BROWSERS) {
    if (!ENGINES[b]) { console.error(`unknown browser ${b}`); failed = true; continue; }
    const problems = await runBrowser(b);
    if (problems.length) {
      failed = true;
      console.error(`\n[${b}] SMOKE FAILED:`);
      for (const p of problems) console.error('  - ' + p);
    } else console.log(`[${b}] OK`);
  }
} finally {
  server?.stop();
}
if (!failed) console.log('\nSMOKE OK: no console errors, no uncaught exceptions, every scene renders.');
process.exit(failed ? 1 : 0);
