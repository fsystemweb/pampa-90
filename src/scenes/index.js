// Registers every scene with the scene manager. Unregistered names fall back
// to a "coming soon" stub (see engine/scene.js).
import { scenes } from '../engine/scene.js';
import { TitleScene } from './title.js';
import { IntroScene } from './intro.js';
import { DevUiScene } from './dev_ui.js';
import { DevSpritesScene } from './dev_sprites.js';

scenes.register('title', () => new TitleScene());
scenes.register('intro', () => new IntroScene());
scenes.register('dev-ui', () => new DevUiScene()); // dev showcase: index.html#scene=dev-ui
scenes.register('dev-sprites', () => new DevSpritesScene()); // sprite viewer: index.html#scene=dev-sprites
