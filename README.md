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

## Dev helpers

- `index.html#scene=<name>` starts at any scene (e.g. `title`, `dev-ui`).
- `index.html#scene=dev-sprites&page=N` browses every sprite (arrows = page, Space = background).
