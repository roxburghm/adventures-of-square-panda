// ================================================================
//  HIGH SCORES
// ================================================================

import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { BUILT_IN_LEVELS } from '../levels/index.js';
import { CAMPAIGN, getBoard, levelBoard } from '../systems/scores.js';
import { createBackdrop } from '../game/backdrop.js';
import { text, panel, Menu, goTo } from './ui.js';

/** Draw a table of scores. `highlight` is the row to colour in (or -1). */
export function drawBoard(scene, x, top, board, highlight = -1, rows = 10) {
  if (!board.length) {
    text(scene, x, top + 120, 'No scores yet. Go and set one!', 40, { color: '#555555' });
    return;
  }
  for (let i = 0; i < Math.min(rows, board.length); i++) {
    const e = board[i];
    const color = i === highlight ? '#e5484d' : '#111111';
    const y = top + i * 46;
    text(scene, x - 360, y, `${i + 1}.`, 36, { color, originX: 1 });
    text(scene, x - 330, y, e.name, 36, { color, originX: 0 });
    text(scene, x + 360, y, String(e.score), 36, { color, originX: 1 });
  }
}

export class ScoresScene extends Phaser.Scene {
  constructor() {
    super('Scores');
  }

  create() {
    this._leaving = false;
    createBackdrop(this, 'night');
    panel(this, GAME_W * 0.3, GAME_H / 2 - 10, 980, 840);
    panel(this, GAME_W * 0.77, GAME_H / 2 - 10, 700, 840);

    text(this, GAME_W * 0.3, 190, 'The adventure', 60);
    drawBoard(this, GAME_W * 0.3, 280, getBoard(CAMPAIGN));

    text(this, GAME_W * 0.77, 190, 'Best on each level', 50);
    BUILT_IN_LEVELS.forEach((level, i) => {
      const best = getBoard(levelBoard(level.id))[0];
      const y = 280 + i * 92;
      text(this, GAME_W * 0.77, y, `${i + 1}. ${level.name}`, 34);
      text(this, GAME_W * 0.77, y + 38, best ? `${best.name}  ${best.score}` : '-', 28, { color: '#0a8e8e' });
    });

    new Menu(this, GAME_W / 2, GAME_H - 60, [{ label: 'Back', action: () => goTo(this, 'Title') }], {
      size: 48,
      onCancel: () => goTo(this, 'Title'),
    });
    this.cameras.main.fadeIn(250, 255, 253, 246);
  }
}
