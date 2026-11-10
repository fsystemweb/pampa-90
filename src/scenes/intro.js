// Intro cutscene (~32 s, skippable): five panels with typewriter captions.
//   1. a plane crosses the pampas at sunset
//   2. it lands on the asphalt runway of Santa Rosa airport
//   3. a modest terminal (hut + windsock), a group of locals waiting on the tarmac
//   4. the player steps out with a duffel bag and sees the crowd: "This is my people!"
//   5. the farm of El Marito near Macachín: "Welcome to La Pampa... nothing but sky"
//
// Space / A / tap: finish the caption, then go to the next panel.
// B / X / tap SKIP: jump straight to the first level.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { music } from '../engine/music.js';
import { playSfx } from '../engine/audio.js';
import { drawWipe } from '../engine/transition.js';
import { ease, clamp } from '../engine/tween.js';
import { drawSprite, frameAt } from '../engine/sprites.js';
import { drawPromptText } from '../engine/ui.js';
import { rect, disc, skyBands } from '../engine/draw.js';
import { SPRITES } from '../data/sprites/index.js';
import { TRACKS } from '../data/tracks.js';
import { t } from '../data/strings.js';

// Cinematic layout: thin top bar, picture window, and a black caption area below it.
const TOP = 10;
const PH = 124; // picture height (y 10..134)
const CAP_Y = TOP + PH; // caption area starts here
const CHARS_PER_SEC = 28;
const WIPE = 0.35;

const SKY_EVENING = [PAL.skyDeep, PAL.duskDeep, PAL.dusk, PAL.yellow];
const SKY_SUNSET = [PAL.duskDeep, PAL.dusk, PAL.yellow];

// ---------------------------------------------------------------- shared scenery
// strip surfaces: [edge, body]. Asphalt runway gets white centre marks; dirt track gets none.
const SURFACES = { asphalt: [PAL.ink, PAL.grey], dirt: [PAL.dirtDark, PAL.dirt] };

function ground(c, horizon, { strip = null, surface = 'dirt', dark = false } = {}) {
  rect(c, dark ? PAL.grassDeep : PAL.grassDark, 0, horizon, W, PH - horizon);
  for (let n = 1; n < 7; n++) rect(c, dark ? PAL.treeDark : PAL.grassDeep, 0, horizon + Math.round(n * n * 1.2), W, n > 3 ? 2 : 1);
  if (strip) {
    const [edge, body] = SURFACES[surface];
    rect(c, edge, 0, strip[0], W, strip[1] - strip[0]);
    rect(c, body, 0, strip[0] + 1, W, strip[1] - strip[0] - 2);
    if (surface === 'asphalt') {
      for (let x = 6; x < W; x += 28) rect(c, PAL.white, x, (strip[0] + strip[1]) / 2, 12, 1); // runway centre marks
    }
  }
}

// The crowd: a group of locals behind the airport fence (see props.js), swapping frames to cheer.
function crowd(c, x0, y, pan, cheer = 0, tt = 0) {
  const frames = SPRITES.intro.crowd;
  drawSprite(c, cheer > 0 ? frameAt(frames, tt, 5) : frames[0], x0 + pan, y);
}

// Half-sunk sun: the ground drawn afterwards hides its lower half.
function setSun(c, x, horizon, r) {
  disc(c, PAL.dusk, x, horizon - 2, r + 4);
  disc(c, PAL.white, x, horizon - 2, r);
}

function trees(c, horizon, xs) {
  for (const x of xs) drawSprite(c, SPRITES.run.treeSmall, x, horizon + 2);
}

// ---------------------------------------------------------------- panels
// Each panel: { dur, line, setup(scene), update(scene, dt), draw(scene, c, t) }
const PANELS = [
  { // 1 - plane over the pampas at sunset
    dur: 6,
    line: 'intro.1',
    draw(s, c, tt) {
      const horizon = 94;
      skyBands(c, horizon, SKY_EVENING);
      setSun(c, 232, horizon, 14);
      for (const [bx, by, sp, sc] of [[10, 30, 6, 1], [110, 50, 4, 1], [200, 24, 5, 1]]) {
        const x = ((bx + tt * sp) % (W + 60)) - 36;
        c.globalAlpha = 0.85;
        drawSprite(c, SPRITES.intro.cloud, x, by - 2, { scale: sc });
        c.globalAlpha = 1;
      }
      ground(c, horizon, { dark: true });
      trees(c, horizon, [30, 54, 150, 276, 300]);
      // the plane crosses left -> right, bobbing slightly
      const px = -50 + ease.inOutQuad(clamp(tt / 6)) * (W + 100);
      drawSprite(c, frameAt(SPRITES.intro.plane, tt, 20), px, 50 + Math.sin(tt * 2.2) * 2, { scale: 1 });
      // long shadow gliding over the field
      c.globalAlpha = 0.3;
      rect(c, PAL.black, px - 14, 108, 28, 3);
      c.globalAlpha = 1;
    },
  },

  { // 2 - touchdown on the asphalt runway
    dur: 5.5,
    line: 'intro.2',
    setup(s) { s.puffs = []; s.landed = false; },
    update(s, dt) {
      const tt = s.pt;
      s.planeX = tt < 2.4 ? -30 + (tt / 2.4) * 120 : 90 + ease.outQuad(clamp((tt - 2.4) / 3.2)) * 130;
      s.planeY = tt < 2.4 ? 34 + ease.inQuad(tt / 2.4) * 66 : 100;
      if (tt >= 2.4 && !s.landed) {
        s.landed = true;
        playSfx('land');
      }
      if (s.landed && tt < 5.4 && Math.random() < 0.6) {
        s.puffs.push({ x: s.planeX - 12, y: 104, a: 0, vx: -10 - Math.random() * 14, vy: -6 - Math.random() * 8 });
      }
      for (const p of s.puffs) {
        p.a += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      s.puffs = s.puffs.filter((p) => p.a < 1.2);
    },
    draw(s, c) {
      const horizon = 82;
      skyBands(c, horizon, SKY_EVENING);
      setSun(c, 70, horizon, 12);
      ground(c, horizon, { strip: [96, 112], surface: 'asphalt' });
      trees(c, horizon, [40, 200, 250, 292]);
      for (const p of s.puffs) {
        const k = p.a / 1.2;
        const r = 2 + Math.round(k * 5);
        c.globalAlpha = 0.7 * (1 - k);
        disc(c, PAL.silver, p.x, p.y, r); // tyre smoke
        c.globalAlpha = 1;
      }
      drawSprite(c, frameAt(SPRITES.intro.plane, s.pt, 20), s.planeX, s.planeY + 4, { scale: 1 });
    },
  },

  { // 3 - the modest terminal, the crowd already on the tarmac
    dur: 5.3,
    line: 'intro.3',
    draw(s, c, tt) {
      const horizon = 80;
      skyBands(c, horizon, SKY_SUNSET);
      setSun(c, 280, horizon, 10);
      ground(c, horizon, { strip: [98, 112], surface: 'asphalt' });
      const pan = -tt * 2.5; // slow camera drift
      trees(c, horizon, [20, 96 + pan * 0.3, 250 + pan * 0.3]);
      drawSprite(c, SPRITES.intro.hut, 98 + pan, 102);
      drawSprite(c, frameAt(SPRITES.intro.windsock, tt, 2), 156 + pan, 102);
      crowd(c, 184, 122, pan);
      drawSprite(c, SPRITES.intro.plane[0], 36 + pan, 114, { scale: 1 });
    },
  },

  { // 4 - the player steps out and the crowd cheers
    dur: 8,
    line: 'intro.4',
    draw(s, c, tt) {
      const horizon = 80;
      skyBands(c, horizon, SKY_SUNSET);
      setSun(c, 238, horizon, 18);
      ground(c, horizon, { strip: [94, 122], surface: 'asphalt' });
      drawSprite(c, frameAt(SPRITES.intro.windsock, tt, 2), 292, 120, { scale: 1 });
      drawSprite(c, SPRITES.intro.plane[0], 62, 122, { scale: 2 }); // parked, door side
      // walk from the plane door to the middle of the runway
      const k = ease.inOutQuad(clamp((tt - 1.2) / 2.8));
      const x = 100 + k * 74;
      const walking = tt > 1.2 && tt < 4.0;
      const player = walking ? frameAt(SPRITES.player.run, tt, 5) : SPRITES.player.idle;
      const bob = walking ? Math.abs(Math.sin(tt * 10)) * -1 : 0;
      drawSprite(c, player, x, 120 + bob, { scale: 2 });
      // duffel bag in hand
      drawSprite(c, SPRITES.intro.duffel, x + 16, 112 + bob, { scale: 1 });
      // the crowd, cheering once he is out on the tarmac
      const cheer = tt > 4.2 ? Math.abs(Math.sin((tt - 4.2) * 8)) * 2 : 0;
      crowd(c, 188, 124, 0, cheer, tt);
    },
  },

  { // 5 - the farm near Macachín: silence, a single figure, nothing but sky
    dur: 7.5,
    line: 'intro.5',
    draw(s, c, tt) {
      const horizon = 84;
      skyBands(c, horizon, SKY_SUNSET);
      setSun(c, 96, horizon, 12);
      ground(c, horizon, { strip: [108, 118] }); // dirt track to the house
      trees(c, horizon, [30, 60, 280, 306]);
      drawSprite(c, SPRITES.intro.hut, 214, 116);
      drawSprite(c, SPRITES.player.idle, 128, 122, { scale: 2 });
      drawSprite(c, SPRITES.intro.duffel, 144, 114, { scale: 1 });
    },
  },
];

// ---------------------------------------------------------------- scene
export class IntroScene {
  enter() {
    this.index = 0;
    this.pt = 0; // time in current panel
    this.wipe = null; // { phase: 'out'|'in', t, then }
    this.leaving = false;
    this.skipRect = { x: W - 66, y: TOP + 4, w: 62, h: 12 };
    // dev: index.html#scene=intro&panel=2&t=3 jumps to a panel/time (for screenshots)
    const q = new URLSearchParams(location.hash.slice(1));
    if (q.has('panel')) {
      this.index = Math.min(PANELS.length - 1, Math.max(0, Number(q.get('panel')) || 0));
      this.pt = Number(q.get('t')) || 0;
    }
    music.play(TRACKS.intro);
    this.panel.setup?.(this);
  }

  get panel() { return PANELS[this.index]; }
  get text() { return t(this.panel.line); }
  get shown() { return Math.max(0, (this.pt - 0.3) * CHARS_PER_SEC); }
  get typing() { return this.shown < this.text.length; }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    music.stop(0.6);
    scenes.go('briefing', { level: 1 }, { wipe: 'iris' });
  }

  next() {
    if (this.wipe) return;
    if (this.index >= PANELS.length - 1) {
      this.finish();
      return;
    }
    this.wipe = { phase: 'out', t: 0 };
  }

  update(dt) {
    if (this.leaving || scenes.busy) return;

    if (input.pressed('secondary') || input.tap(this.skipRect)) {
      playSfx('back');
      this.finish();
      return;
    }
    if (!this.wipe && (input.pressed('primary') || input.tap())) {
      if (this.typing) this.pt = this.text.length / CHARS_PER_SEC + 0.3; // complete the caption
      else this.next();
    }

    if (this.wipe) {
      this.wipe.t += dt;
      if (this.wipe.phase === 'out' && this.wipe.t >= WIPE) {
        this.index++;
        this.pt = 0;
        this.panel.setup?.(this);
        this.wipe = { phase: 'in', t: 0 };
      } else if (this.wipe.phase === 'in' && this.wipe.t >= WIPE) {
        this.wipe = null;
      }
    }

    this.pt += dt;
    this.panel.update?.(this, dt);
    // auto-advance when the panel's time is up (and the caption has been read)
    if (!this.wipe && this.pt >= this.panel.dur) this.next();

    // typewriter tick
    const n = Math.floor(this.shown);
    if (n !== this.lastN && this.typing && n % 2 === 0 && this.text[n - 1] !== ' ') playSfx('tick');
    this.lastN = n;
  }

  draw(c) {
    c.fillStyle = PAL.black;
    c.fillRect(0, 0, W, H);
    // picture window (panels draw in 320x124 local space)
    c.save();
    c.translate(0, TOP);
    c.beginPath();
    c.rect(0, 0, W, PH);
    c.clip();
    this.panel.draw(this, c, this.pt);
    c.restore();
    rect(c, PAL.grey, 0, CAP_Y, W, 1);

    // caption (typewriter) in the black area
    drawText(c, this.text, 14, CAP_Y + 9, { maxWidth: W - 28, chars: Math.floor(this.shown), color: PAL.white });

    // panel dots + skip hint
    for (let i = 0; i < PANELS.length; i++) rect(c, i === this.index ? PAL.yellow : PAL.grey, W / 2 - 14 + i * 8, 3, 4, 3);
    const label = t('ui.skip');
    const r = this.skipRect;
    drawPromptText(c, 'secondary', label, r.x, r.y, { color: PAL.white, shadow: PAL.black });

    if (this.wipe) {
      const p = ease.inOutQuad(clamp(this.wipe.t / WIPE));
      drawWipe(c, 'dither', this.wipe.phase === 'out' ? p : 1 - p);
    }
  }
}
