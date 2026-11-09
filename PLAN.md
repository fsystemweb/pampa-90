# PRESEASON — Pampa '90 (videogame name)
8-bit web game · 4 minigames · keyboard + mobile landscape

---

## 1. Brief (level info files)

**Premise.** You are the best soccer player in the world, mid-1990s. You wear colourful 90s sportswear. Before the new season you go to a special preseason in La Pampa, Argentina: countryside, middle of nowhere. You land at a tiny airport (intro sequence).

**Structure.** Intro + 4 short, easy, fun minigames, then a season-start ending.

**Platform.** Web, 8-bit style, polished details. Desktop: keyboard. Mobile: landscape only (show "rotate your phone" overlay in portrait).

| # | Level | Normalized instruction |
|---|-------|------------------------|
| 1 | Shaving | Outdoors, you shave by hand using a razor and an improvised mirror hung on a post/fence. Cover/clear your whole face with the razor. Finish by rinsing your face with water from a bucket. |
| 2 | Resistance | Jog through the pampas countryside to build stamina. From time to time a cow appears on the path and you must dodge it. |
| 3 | Targeting | A friend crosses the ball in. Time a jump when the ball arrives and hit it with a scissor-kick (legs-crossed volley). The ball must score past a friend-goalkeeper. The goal is two fence posts/sticks in a field. |
| 4 | Doctor check | Final level. Lying on the grass, doctor sits beside you with a portable blood-pressure/heart machine. Relax and breathe steadily until the reading goes green. Pass = ready for the season. |

**Clarifications** (I assumed the defaults in bold):
1. Language: **English UI, Argentine-flavoured flavour text (a few "che", "dale")**; Also ES toggle
2. Character/NPC: **original fictional characters** (not real people/brands). Reference images are only mood/pose guides. Sportswear = invented logos (three chevrons → generic stripes).
3. Fail states: **soft-fail** (retry instantly, no game over), 3 stars rating per level.
4. Length: **~5–6 min total**, each level 60–90 s.
5. Persistence: **localStorage** for best stars/times.

---

## 2. What the reference assets tell us (use as art direction)

| Folder | Visual takeaways to translate into pixel art |
|---|---|
| Level 1 | Ornate gold wavy-frame mirror on a wooden post; green trees backdrop; white T-shirt; white foam on jaw/cheek; pink/plastic bucket; water splash arc. |
| Level 2 | Low-angle horizon: pale blue sky, dirt path, tall grass edges, lone dark-green trees; runners in teal/blue 90s windbreakers. Cow not in image → we design it (Holstein black/white). |
| Level 3 | Third-person from behind the player; wire fences with wooden posts converging to goal; flat yellow-green field, tree clumps on horizon; white tee + blue shorts; keeper in teal/green top diving. |
| Level 4 | Lying on grass beside a house wall; doctor in white sweatshirt + navy shorts; arm cuff + small box monitor with cable; blue tracksuit pants. |

Shared palette: wash-out sky `#bfe3f5`, pampas grass `#a8b04a` / `#6f8a2e`, dirt `#b58b62`, tree `#2f5a2a`, white `#f4f1e8`, 90s sport blue `#2a5bd7`, teal `#18b5a8`, magenta/yellow accents for "colourful 90s" clothes.

Note: screenshots contain broadcaster logos and a real person → **do not ship them**. Move to `/reference` (excluded from build).

---

## 3. Tech approach

- **Vanilla JS (ES modules) + HTML5 Canvas 2D**, no framework, no build step (or Vite later only if needed). Deployable as static files (GitHub Pages/Netlify).
- **Internal resolution 320×180** (16:9), scaled by integer factor with `image-rendering: pixelated`; letterboxed to fit any screen. Fixed-timestep loop at 60 Hz.
- **Palette-limited** (≈32 colours) for authentic 8-bit look; optional CRT scanline/vignette CSS toggle.
- **Sprites**: drawn as small PNG sheets (16×16 / 32×32 tiles) or authored as JS string-arrays to avoid image loading; build an `assets/sprites` atlas.
- **Audio**: WebAudio chiptune (square/triangle/noise oscillators) — SFX generated in code (bfxr-style), 1 looping music track per level via tiny tracker/sequencer. Mute toggle (M); audio unlocks on first input.
- **Input abstraction**: actions (`primary`, `left`, `right`, `up`, `down`, `pause`) fed by keyboard, touch zones, and (bonus) gamepad. Each minigame only reads actions → one codebase for both platforms.
- **Mobile landscape**: `orientation` check → overlay in portrait; large translucent on-screen buttons (left thumb: D-pad/slider, right thumb: A button); `touch-action:none`, prevent scroll/zoom; fullscreen button; PWA manifest optional.

### Folder layout
```
/index.html
/css/style.css
/src/main.js            boot, loop, scaler
/src/engine/            input.js audio.js sprites.js scene.js text.js tween.js save.js
/src/scenes/            title.js intro.js level1_shave.js level2_run.js
                        level3_kick.js level4_doctor.js results.js ending.js
/src/data/              palette.js strings.js (all text here → easy manual review/i18n)
/assets/sprites|audio   (final art)
/reference/             original screenshots (not shipped)
```

---

## 4. Game flow

1. **Title screen** — logo, blinking "PRESS START / TAP", mute + fullscreen icons.
2. **Intro cutscene (~25 s, skippable)** — 4 panels: plane flies over pampas at sunset → lands on dirt strip → tiny airport (a hut + windsock + one rusty truck) → player steps out with duffel bag, 90s tracksuit, a *"Welcome to La Pampa… nothing but sky"* line. Typewriter text, chiptune theme.
3. **Level select-less linear flow**: L1 → L2 → L3 → L4, each with a 3-line "briefing" card (icon + controls) before starting. Progress bar of "Preseason readiness" between levels.
4. **Ending** — doctor gives thumbs-up, stadium-flash pixel scene, stars summary, "SEASON START" + replay.

---

## 5. Minigame designs

### L1 — Shaving (precision / coverage)
- **View:** close-up of the mirror (gold wavy frame, pixel face reflected, foam-covered jaw), trees behind.
- **Phase A (optional 5 s):** foam pre-applied; cheeks/chin/neck/upper-lip zones shown as foam mask.
- **Phase B — razor:** move razor with arrows/WASD (touch: drag). Holding `Space/A` pulls the razor down a stroke; foam pixels under blade are erased → coverage %. Goal ≥ 95 % cleared within 60 s.
- **Hazards:** over-pressing/zig-zag fast = nick (red pixel + "ay!" −1 heart; 3 hearts). Razor gets clogged → tap `B` to dip in cup (small mechanic, adds rhythm). Wind gust nudges mirror (mirror jiggles, cursor drifts slightly) for rural humour.
- **Phase C — rinse:** bucket appears; mash/alternate `A` to splash, hold-and-release timing meter; water splash particles clear remaining foam.
- **Score:** coverage, nicks, time → 1–3 stars.
- **Tech:** offscreen foam mask canvas; erase with circle/rect `destination-out`; count cleared pixels each ~10 frames.

### L2 — Resistance (endless-runner, lane dodge)
- **View:** side-scrolling parallax (sky, far trees, fence line, dirt road, grass tufts); player runs in a blue 90s windbreaker; teammate pace-runner in teal behind/ahead as visual companion.
- **Controls:** `Space/Up/tap` = hop (or sidestep); alternately 2 lanes with `Up/Down`. Cows (Holstein pixel art) walk across path; occasional mud puddle / molehill tertiary obstacle, later a dog/hen for variety.
- **Stamina meter:** fills as you run clean; every hit slows you and drains stamina. Reach 100 % (~75 s) to finish. Speed ramps up gradually; "MOO!" speech bubble + warning "!" 1 s before a cow enters.
- **Polish:** footstep dust, breath puffs, day-time sky gradient shifting, bobbing camera, cow SFX.

### L3 — Targeting (timing + aim; the signature move)
- **View:** behind-the-player 2.5D (like the ref): field converges to fence-post goal at the horizon, friend crosser on the left, friend goalkeeper in the posts.
- **Flow:** (1) friend throws/crosses; ball shadow & arc growing toward you; (2) a **timing ring** shrinks around the ball — press `Space/A` to jump when it's in the "sweet zone" (perfect/good/early/late); (3) **bicycle/scissor kick animation** in 6 frames with slow-mo freeze + flash on perfect; (4) while airborne, a **moving aim reticle** across the goal (left–right sweep, 1 s) — second press locks aim (alt: arrow keys steer during the jump).
- **Keeper AI:** dives to a random side with reaction delay based on level of ball power; goal outcomes: GOAL / saved / post / over the fence ("¡a la chacra!").
- **Rounds:** 5 shots, need 3 goals to pass; difficulty ramps (faster crosses, bigger keeper).
- **Polish:** screen shake, crowd-less rural "silence" gag (a cow moos on goal), net = wire fence ripple, replay of final goal in 2× pixel slow-mo.

### L4 — Doctor check (calm, rhythm-breathing)
- **View:** top 3/4 or side: grass, house wall behind, doctor sitting with clipboard, player lying down with arm cuff, small monitor with a pixel heart-rate/BP readout and ECG line.
- **Mechanic:** hold `Space/A` to inhale, release to exhale, following a smooth sine "breath guide" on a bar. Stay within the band to lower the heart rate (BPM falls from ~120 → ≤ 65); mis-timing raises it. Bugs/crickets/cow moos and a phone ring are **distractions** (temporary screen noise) — don't panic.
- **Win:** hold calm zone for 15 s total → monitor beeps green, doctor says "Todo perfecto". Gentle lullaby chiptune, slow clouds overhead.
- **No hard fail:** if BPM too high for long, doctor says "again, relax" and meter resets softly.

---

## 6. Shared systems & polish checklist

- **UI kit:** 8×8 bitmap font (custom), dialog box with typewriter, hearts, star rating, progress bar, button prompts that swap between key glyph and touch glyph.
- **Juice:** screen shake, hit-stop, particles (dust, foam, water, sparkles), easing tweens, blinking text, palette flashes.
- **Transitions:** pixelated iris/dither wipe between scenes.
- **Accessibility:** pause (P/Esc), mute (M), remappable-free simple controls, reduced-flash option, text readable at 320×180 → min 8 px font, colour-blind safe indicators (shape + colour).
- **Tutorials:** one-line hint + animated icon at the start of each level; first 5 s are forgiving.
- **Perf/QA:** 60 fps on mid phones; test Chrome/Firefox/Safari iOS; visibility-change auto-pause; handle devicePixelRatio and resize.
- **Strings centralized** in `src/data/strings.js` so you can review/edit all prompts and instructions in one place (that's the "check manually" item).

---

## 7. Milestones

| M | Deliverable | Est. |
|---|-------------|------|
| 0 | Repo skeleton, canvas scaler, loop, input (kbd+touch), landscape overlay, palette, bitmap font | 0.5 d |
| 1 | Audio engine (SFX + tiny music sequencer), scene manager, title + transitions | 0.5 d |
| 2 | Art pass 1: character, cow, doctor, friend, ball, props (placeholder-quality → final) | 1 d |
| 3 | Intro cutscene | 0.5 d |
| 4 | L1 Shaving playable | 1 d |
| 5 | L2 Running playable | 0.75 d |
| 6 | L3 Scissor kick playable | 1.25 d |
| 7 | L4 Doctor check playable | 0.75 d |
| 8 | Results/ending, save, stars | 0.5 d |
| 9 | Polish: juice, SFX/music, mobile tuning, balance, bug bash | 1 d |


Build order rationale: the engine + L2 (simplest loop) first to validate feel and mobile controls; L3 is the riskiest (timing/animation) so prototype it by M4 in parallel with art.

---

## 8. Decisions

- **Real person / brand likeness** in references → keep character original, invent logos/clothes (stripes, not trademarks).
- **Touch precision in L1/L3** → generous hit windows, drag-follow razor with offset above finger.
- **Audio on iOS** → resume AudioContext on first touch.
- **Scope creep** → each level ≤ 90 s, no menus beyond title/pause.

