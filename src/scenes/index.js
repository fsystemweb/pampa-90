// Registers every scene with the scene manager. Level scenes are registered as
// level1..levelN in the order of src/data/levels.js.
import { scenes } from '../engine/scene.js';
import { LEVELS } from '../data/levels.js';
import { TitleScene } from './title.js';
import { IntroScene } from './intro.js';
import { BriefingScene } from './briefing.js';
import { Level1Scene } from './level1_shave.js';
import { Level2Scene } from './level2_run.js';
import { HeaderScene } from './level3_header.js';
import { AbsScene } from './level4_abs.js';
import { Level3Scene } from './level5_kick.js';
import { Level4Scene } from './level6_doctor.js';
import { ResultsScene } from './results.js';
import { EndingScene } from './ending.js';
import { DevUiScene } from './dev_ui.js';
import { DevSpritesScene } from './dev_sprites.js';

const LEVEL_SCENES = {
  shave: Level1Scene,
  run: Level2Scene,
  header: HeaderScene,
  abs: AbsScene,
  kick: Level3Scene,
  doctor: Level4Scene,
};

scenes.register('title', () => new TitleScene());
scenes.register('intro', () => new IntroScene());
scenes.register('briefing', () => new BriefingScene());
for (const def of LEVELS) scenes.register(def.scene, () => new LEVEL_SCENES[def.key]());
scenes.register('results', () => new ResultsScene());
scenes.register('ending', () => new EndingScene());
scenes.register('dev-ui', () => new DevUiScene()); // dev showcase: index.html#scene=dev-ui
scenes.register('dev-sprites', () => new DevSpritesScene()); // sprite viewer: index.html#scene=dev-sprites
