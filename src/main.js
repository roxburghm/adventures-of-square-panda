// ================================================================
//  ADVENTURES OF SQUARE PANDA
//  This file starts the game. The screens ("scenes") are in src/scenes/.
// ================================================================

import Phaser from 'phaser';
import '@fontsource/gloria-hallelujah';
import { GAME_W, GAME_H } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';
import { ScoresScene } from './scenes/ScoresScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#fffdf6',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true, activePointers: 4 },
  scene: [BootScene, TitleScene, LevelSelectScene, GameScene, ResultsScene, ScoresScene],
});

// While developing, type __game in the browser console to poke at the running game.
if (import.meta.env.DEV) window.__game = game;
