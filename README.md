# Pampa '90

8-bit web game: you are the best footballer in the world, mid-1990s, and your preseason is in the middle of La Pampa, Argentina. Intro + 4 short minigames (shaving, resistance, targeting, doctor check).

Vanilla JS (ES modules) + HTML5 Canvas, no build step. See [PLAN.md](PLAN.md).

## Run locally

ES modules need a server (not `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Layout

```
index.html
css/style.css
src/main.js          boot, loop, scaler
src/engine/          input, audio, sprites, scene, text, tween, save
src/scenes/          title, intro, levels, results, ending
src/data/            palette, strings
assets/              shipped assets; assets/sprites/atlas.* is a reference sheet of the code-generated sprites
tools/               export-atlas.sh regenerates the atlas (needs python3 + google-chrome)
reference/           mood/pose reference screenshots (NOT shipped)
```

## Controls

| Action | Keyboard | Gamepad | Touch (landscape) |
|---|---|---|---|
| Move / lanes / aim | Arrows or WASD | D-pad / stick | D-pad |
| Primary (shave, hop, jump, kick, breathe) | Space, Enter or Z | A | A |
| Secondary (dip razor, replay) | B, X or Shift | B | B |
| Pause menu (resume, reduced flash) | P or Esc | Start | II |
| Mute | M | | speaker button |
| Language (EN / ES) | L | | |

- **L1 Shaving:** arrows move the razor, hold primary to cut, B dips a clogged razor, rinse by holding primary and letting go in the green band.
- **L2 Resistance:** primary (or tap) hops, up / down switch lanes.
- **L3 Targeting:** press primary when the ring closes (perfect / good), press again to lock the aim on the sweeping reticle.
- **L4 Doctor check:** hold primary to breathe in, release to breathe out, follow the yellow guide.

Scores (best stars and times) are saved in the browser (localStorage); clearing site data resets them.

## Deploy (GitHub Pages)

The site is fully static. `.github/workflows/pages.yml` publishes `index.html`, `css/`, `src/` and `assets/` on every push to `main` (`reference/` and `tools/` are not shipped). In the repository settings, set Pages → Source to "GitHub Actions".

## Dev helpers

- `index.html#scene=<name>` starts at any scene (e.g. `title`, `dev-ui`).
- `index.html#scene=dev-sprites&page=N` browses every sprite (arrows = page, Space = background).
- `index.html#scene=level3` (or `level1`, `level2`, `level4`, `results`, `ending`) jumps straight to a scene.
- `window.pampa.scenes.current` in the browser console gives the active scene for inspection.
