// Title screen: pampas morning, windmill, a plane crossing the sky, logo,
// blinking "PRESS START / TAP", language toggle. Music: placeholder theme.

import { W, H } from '../data/config.js';
import { PAL } from '../data/palette.js';
import { input } from '../engine/input.js';
import { drawText, measure } from '../engine/font.js';
import { scenes } from '../engine/scene.js';
import { music } from '../engine/music.js';
import { playSfx } from '../engine/audio.js';
import { TRACKS } from '../data/tracks.js';
import { t, toggleLang } from '../data/strings.js';
import { rect, disc, line, seam } from '../engine/draw.js';

const HORIZON = 112;

// ---------------------------------------------------------------- drawing helpers
function cloud(c, x, y) {
  rect(c, PAL.cloud, x + 5, y, 14, 3);
  rect(c, PAL.cloud, x, y + 3, 28, 4);
  rect(c, PAL.cloud, x + 8, y - 3, 9, 3);
  rect(c, PAL.silver, x + 2, y + 7, 24, 1);
}

function tree(c, x, base, r) {
  rect(c, PAL.woodDark, x - 1, base - r, 2, r);
  disc(c, PAL.treeDark, x, base - r * 2, r);
  disc(c, PAL.tree, x - 1, base - r * 2 - 1, r - 2);
}

function windmill(c, x, time) {
  const hgt = 30;
  const top = HORIZON - hgt;
  // tower
  for (let y = top; y < HORIZON; y++) {
    const hw = 2 + Math.round(((y - top) / hgt) * 3);
    rect(c, PAL.silver, x - hw, y, hw * 2, 1);
    rect(c, PAL.grey, x + hw - 2, y, 2, 1);
  }
  // rotor
  const a0 = time * 1.4;
  for (let i = 0; i < 8; i++) {
    const a = a0 + (i * Math.PI) / 4;
    line(c, i % 2 ? PAL.white : PAL.silver, x, top, x + Math.cos(a) * 11, top + Math.sin(a) * 11);
  }
  disc(c, PAL.ink, x, top, 2);
  // tail vane
  rect(c, PAL.grey, x + 3, top - 1, 9, 1);
  rect(c, PAL.red, x + 9, top - 4, 4, 6);
  // base / water tank
  rect(c, PAL.dirtDark, x - 6, HORIZON - 2, 12, 2);
}

function plane(c, x, y, time) {
  rect(c, PAL.white, x, y, 15, 4); // fuselage
  rect(c, PAL.white, x + 15, y + 1, 2, 3);
  rect(c, PAL.red, x + 12, y, 3, 1); // nose stripe
  rect(c, PAL.blue, x, y - 3, 4, 3); // tail fin
  rect(c, PAL.blueDark, x + 2, y - 1, 4, 1);
  rect(c, PAL.skyDeep, x + 9, y + 1, 3, 1); // cockpit
  rect(c, PAL.silver, x + 4, y + 4, 8, 2); // wing
  rect(c, PAL.grey, x + 5, y + 5, 6, 1);
  const blur = Math.floor(time * 20) % 2;
  rect(c, blur ? PAL.grey : PAL.silver, x + 17, y - 1 + blur, 1, 5);
  // trailing puffs
  for (let i = 1; i <= 4; i++) rect(c, PAL.cloud, x - i * 7 - ((time * 12) % 7), y + 1 + (i % 2), 3, 2);
}

// deterministic grass tufts
const TUFTS = Array.from({ length: 70 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const f = r - Math.floor(r);
  const r2 = Math.sin(i * 78.233) * 12345.678;
  const g = r2 - Math.floor(r2);
  return { x: Math.floor(f * W), y: HORIZON + 3 + Math.floor(g * g * (H - HORIZON - 4)) };
});

function ground(c) {
  rect(c, PAL.grass, 0, HORIZON, W, H - HORIZON);
  // perspective stripes
  for (let n = 1; n < 9; n++) {
    const y = HORIZON + Math.round(n * n * 1.1);
    rect(c, PAL.grassDark, 0, y, W, n > 4 ? 2 : 1);
  }
  // dirt road toward the horizon
  for (let y = HORIZON; y < H; y++) {
    const k = (y - HORIZON) / (H - HORIZON);
    const hw = Math.round(3 + k * 58);
    const cx = W / 2 + Math.round((1 - k) * 18);
    rect(c, PAL.dirt, cx - hw, y, hw * 2, 1);
    rect(c, PAL.dirtDark, cx - hw, y, 1 + (k > 0.5 ? 1 : 0), 1);
    rect(c, PAL.dirtDark, cx + hw - 1, y, 1 + (k > 0.5 ? 1 : 0), 1);
  }
  for (const p of TUFTS) {
    if (Math.abs(p.x - W / 2) < 8 + (p.y - HORIZON) * 0.9) continue; // keep the road clear
    rect(c, PAL.grassDeep, p.x, p.y, 1, 2);
    rect(c, PAL.grassDeep, p.x + 2, p.y + 1, 1, 1);
  }
}

function fence(c) {
  line(c, PAL.woodDark, 0, HORIZON - 3, W, HORIZON - 3);
  line(c, PAL.woodDark, 0, HORIZON - 6, W, HORIZON - 6);
  for (let x = 6; x < W; x += 26) rect(c, PAL.wood, x, HORIZON - 9, 2, 10);
}

// ---------------------------------------------------------------- scene
export class TitleScene {
  enter() {
    this.time = 0;
    this.blink = 0;
    this.leaving = false;
    music.play(TRACKS.title);
  }

  langRect() {
    const w = measure(t('ui.lang')) + 8;
    return { x: W - w - 4, y: H - 15, w, h: 12 };
  }

  start() {
    if (this.leaving || scenes.busy) return;
    this.leaving = true;
    playSfx('start');
    music.stop(0.5);
    scenes.go('intro', null, { wipe: 'iris' });
  }

  update(dt) {
    this.time += dt;
    if (this.leaving || scenes.busy) return;
    const lang = input.tap(this.langRect());
    if (lang) {
      toggleLang();
      playSfx('select');
      return;
    }
    if (input.pressed('primary') || input.tap()) this.start();
  }

  draw(c) {
    const time = this.time;
    // sky bands
    rect(c, PAL.skyDeep, 0, 0, W, 34);
    rect(c, PAL.skyHi, 0, 34, W, 40);
    rect(c, PAL.sky, 0, 74, W, HORIZON - 74);
    seam(c, 34, PAL.skyDeep, PAL.skyHi);
    seam(c, 74, PAL.skyHi, PAL.sky);

    // sun + clouds
    disc(c, PAL.white, 262, 86, 14);
    disc(c, PAL.yellow, 262, 86, 11);
    for (const [bx, by, sp] of [[20, 92, 3], [150, 100, 2], [230, 54, 4]]) {
      cloud(c, ((bx + time * sp) % (W + 60)) - 30, by - (by > 80 ? 30 : 0));
    }

    // distant trees, windmill, fence, ground
    for (const [x, r] of [[56, 5], [72, 4], [118, 5], [196, 4], [290, 6], [306, 4]]) tree(c, x, HORIZON, r);
    windmill(c, 30, time);
    ground(c);
    fence(c);

    // plane
    plane(c, ((time * 26) % (W + 110)) - 70, 22 + Math.round(Math.sin(time * 2) * 2), time);

    // logo
    const scale = 4;
    const full = measure("PAMPA '90", scale);
    const lx = Math.round((W - full) / 2);
    const ly = 30 + Math.round(Math.sin(time * 2.4) * 1.5);
    drawText(c, 'PAMPA', lx, ly, { scale, color: PAL.white, shadow: PAL.blueDark });
    drawText(c, "'90", lx + 6 * 6 * scale, ly, { scale, color: PAL.yellow, shadow: PAL.blueDark });
    rect(c, PAL.teal, lx, ly + 36, full, 2);
    rect(c, PAL.yellow, lx, ly + 39, full, 2);
    rect(c, PAL.magenta, lx, ly + 42, full, 2);
    drawText(c, t('game.subtitle').toUpperCase(), W / 2, ly + 50, { align: 'center', color: PAL.white, shadow: PAL.ink });

    // prompt
    if (Math.floor(time * 2) % 2 === 0) {
      const touch = input.device === 'touch';
      drawText(c, touch ? t('ui.tapStart') : t('ui.pressStart'), W / 2, 146, {
        align: 'center', color: PAL.white, shadow: PAL.black,
      });
    }

    // language toggle
    const r = this.langRect();
    rect(c, PAL.ink, r.x, r.y, r.w, r.h);
    rect(c, PAL.grey, r.x, r.y, r.w, 1);
    drawText(c, t('ui.lang'), r.x + 4, r.y + 2, { color: PAL.white });
  }
}
