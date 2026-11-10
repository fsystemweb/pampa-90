// Registers every scene with the scene manager.
import { scenes } from '../engine/scene.js';
import { TitleScene } from './title.js';
import { IntroScene } from './intro.js';
import { BriefingScene } from './briefing.js';
import { Level1Scene } from './level1_shave.js';
import { Level2Scene } from './level2_run.js';
import { Level3Scene } from './level3_kick.js';
import { Level4Scene } from './level4_doctor.js';
import { ResultsScene } from './results.js';
import { EndingScene } from './ending.js';
import { DevUiScene } from './dev_ui.js';
import { DevSpritesScene } from './dev_sprites.js';

scenes.register('title', () => new TitleScene());
scenes.register('intro', () => new IntroScene());
scenes.register('briefing', () => new BriefingScene());
scenes.register('level1', () => new Level1Scene());
scenes.register('level2', () => new Level2Scene());
scenes.register('level3', () => new Level3Scene());
scenes.register('level4', () => new Level4Scene());
scenes.register('results', () => new ResultsScene());
scenes.register('ending', () => new EndingScene());
scenes.register('dev-ui', () => new DevUiScene()); // dev showcase: index.html#scene=dev-ui
scenes.register('dev-sprites', () => new DevSpritesScene()); // sprite viewer: index.html#scene=dev-sprites
