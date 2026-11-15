# AGENTS.md

Pampa '90: an 8-bit browser game (intro plus 4 minigames: shaving, resistance, targeting, doctor check) in vanilla JS ES modules on an HTML5 canvas, published on GitHub Pages. `PLAN.md` is the design document.

## Commands
- Run: `python3 -m http.server 8000`, then open http://localhost:8000 (ES modules do not load from `file://`)
- Jump to a scene: open `index.html#scene=level3` (or `title`, `level1`, `level2`, `level4`, `results`, `ending`, `dev-ui`, `dev-sprites`)
- Regenerate the sprite atlas: `tools/export-atlas.sh` (needs python3 and google-chrome)
- Install, build, lint, tests: none exist

## Conventions
- No framework, no dependencies, no build step. `.github/workflows/pages.yml` publishes `index.html`, `css/`, `src/` and `assets/` on every push to `main`; `reference/` and `tools/` are not shipped.
- `src/main.js`: boot, fixed-step loop, scaler. `src/engine/`: input, audio, music, sprites, scene manager, tweens, save. `src/scenes/`: one file per scene, registered in `src/scenes/index.js`. `src/data/`: config, levels, palette, sprites, strings, tracks.
- Internal resolution is 320x180 (`W`, `H` in `src/data/config.js`), scaled by an integer factor; fixed 60 Hz update step.
- Sprites are drawn in code (`src/data/sprites/`) with colors from `src/data/palette.js`. `assets/sprites/atlas.*` is a reference sheet only; the game does not load it.
- All player-facing text lives in `src/data/strings.js` with `en` and `es` entries; add both and use `t('key')`. Capital accented vowels are missing from the bitmap font, so write capitalised text without them.
- `src/data/levels.js` defines the level order and briefings. Keep each level at 90 seconds or less.
- Save data and settings use `localStorage` (`pampa90.save`, `pampa90.settings`); wrap writes in `try` as the existing code does.
- Characters, logos and clothes are original. `reference/` screenshots are art direction only.

## Boundaries
- Always: check a change by playing the affected scene in a browser, with both keyboard and touch controls when input changes.
- Ask first: adding a dependency or build step, changing the save data shape, adding shipped asset files.
- Never: commit secrets or read `.env` files; copy images from `reference/` into shipped files, or use real names, likenesses or trademarks.
