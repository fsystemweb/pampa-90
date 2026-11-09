// Registers every scene with the scene manager. Unregistered names fall back
// to a "coming soon" stub (see engine/scene.js).
import { scenes } from '../engine/scene.js';
import { TitleScene } from './title.js';
import { DevUiScene } from './dev_ui.js';

scenes.register('title', () => new TitleScene());
scenes.register('dev-ui', () => new DevUiScene()); // dev showcase: index.html#scene=dev-ui
