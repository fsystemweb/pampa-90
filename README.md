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
assets/              final art + audio (shipped)
reference/           mood/pose reference screenshots (NOT shipped)
```
