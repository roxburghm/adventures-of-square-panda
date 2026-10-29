// ================================================================
//  END OF THE ADVENTURE: game over (or you won!), type your name
//  for the high score table.
// ================================================================

import Phaser from 'phaser';
import { GAME_W, GAME_H, START_LIVES } from '../config.js';
import { BUILT_IN_LEVELS } from '../levels/index.js';
import { CAMPAIGN, qualifies, addScore, getBoard, lastName, rememberName } from '../systems/scores.js';
import { createBackdrop } from '../game/backdrop.js';
import { sfx } from '../systems/sfx.js';
import { text, panel, Menu, goTo, onKeyDown } from './ui.js';
import { drawBoard } from './ScoresScene.js';

const MAX_NAME = 10;

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  /** data = { score, victory, reached } */
  init(data) {
    this.result = data;
  }

  create() {
    this._leaving = false;
    const { score, victory, reached } = this.result;
    createBackdrop(this, victory ? 'meadow' : 'night');
    panel(this, GAME_W / 2, GAME_H / 2, 1300, 940);
    text(this, GAME_W / 2, 140, victory ? 'You did it!' : 'Game over', 96);
    text(this, GAME_W / 2, 240, victory ? 'Square Panda finished the whole adventure!' : `You reached level ${reached} of ${BUILT_IN_LEVELS.length}`, 40, {
      color: '#555555',
    });
    text(this, GAME_W / 2, 320, `Score ${score}`, 72);
    sfx.play(victory ? 'win' : 'gameOver');

    if (qualifies(CAMPAIGN, score)) this.askName(score);
    else this.showBoard(-1);
    this.cameras.main.fadeIn(300, 255, 253, 246);
  }

  askName(score) {
    let name = lastName();
    const prompt = text(this, GAME_W / 2, 430, 'A new high score! Type your name:', 44);
    const field = text(this, GAME_W / 2, 530, '', 80, { color: '#e5484d' });
    const help = text(this, GAME_W / 2, 630, 'Press Enter when you are done', 32, { color: '#555555' });
    const render = () => field.setText(`${name}${Math.floor(this.time.now / 400) % 2 ? '_' : ' '}`);
    const blink = this.time.addEvent({ delay: 200, loop: true, callback: render });
    render();

    let stopListening = () => {};
    const finish = () => {
      if (!name.trim()) return;
      stopListening();
      blink.remove();
      for (const o of [prompt, field, help]) o.destroy();
      rememberName(name.trim());
      this.showBoard(addScore(CAMPAIGN, name.trim(), score, { levels: this.result.reached }));
    };
    const onKey = (e) => {
      if (e.key === 'Enter') return finish();
      if (e.key === 'Backspace') name = name.slice(0, -1);
      else if (e.key.length === 1 && /[\w !?'.-]/.test(e.key) && name.length < MAX_NAME) name += e.key.toUpperCase();
      else return;
      sfx.play('type');
      render();
    };
    stopListening = onKeyDown(this, onKey);
    // On phones and tablets there's no keyboard, so tap the name to type it.
    field.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      const typed = window.prompt('Your name for the high score table:', name);
      if (typed != null) {
        name = typed.toUpperCase().slice(0, MAX_NAME);
        finish();
      }
    });
  }

  showBoard(highlight) {
    drawBoard(this, GAME_W / 2, 420, getBoard(CAMPAIGN), highlight, 10);
    new Menu(this, GAME_W / 2, 950, [
      {
        label: 'Play again',
        action: () => goTo(this, 'Game', { run: { mode: 'campaign', levels: BUILT_IN_LEVELS, index: 0, score: 0, lives: START_LIVES } }),
      },
      { label: 'Title screen', action: () => goTo(this, 'Title') },
    ], { size: 46, gap: 64 });
  }
}
