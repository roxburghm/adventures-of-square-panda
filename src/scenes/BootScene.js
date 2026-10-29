// ================================================================
//  STARTING UP: wait for the font, turn the SVG art into textures,
//  then go to the title screen (or straight into a level).
// ================================================================

import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, START_LIVES } from '../config.js';
import { loadAllArt } from '../art/index.js';
import { findLevel } from '../levels/index.js';
import { loadDraft } from '../systems/myLevels.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const loading = this.add.text(GAME_W / 2, GAME_H / 2, 'Loading…', { fontSize: '48px', color: '#111111' }).setOrigin(0.5);
    const fontReady = document.fonts?.load(`64px ${FONT}`).catch(() => null) ?? Promise.resolve();
    Promise.all([fontReady, loadAllArt()]).then(([, art]) => {
      for (const [key, canvas] of art) this.textures.addCanvas(key, canvas);
      loading.destroy();
      this.startFirstScene();
    });
  }

  /**
   * The address bar can ask for a level:
   *   index.html?test=1          plays the level open in the designer
   *   index.html?level=<id>      plays one level
   */
  startFirstScene() {
    const params = new URLSearchParams(window.location.search);
    const one = (mode, level) => ({ run: { mode, levels: [level], index: 0, score: 0, lives: START_LIVES } });
    if (params.has('test')) {
      const draft = loadDraft();
      if (draft) return this.scene.start('Game', one('test', { ...draft, id: draft.id ?? 'draft' }));
    }
    if (params.has('level')) {
      const level = findLevel(params.get('level'));
      if (level) return this.scene.start('Game', one('single', level));
    }
    this.scene.start('Title');
  }
}
