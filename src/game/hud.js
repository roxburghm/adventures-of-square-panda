// ================================================================
//  THE HUD: hearts, lives, bamboo, keys, score and time on screen.
// ================================================================

import { GAME_W, FONT, MAX_HEARTS } from '../config.js';
import { DEPTH } from './depth.js';

const SHAPES = ['square', 'circle', 'triangle'];

export class Hud {
  constructor(scene) {
    this.scene = scene;
    const fix = (o) => o.setScrollFactor(0).setDepth(DEPTH.hud);
    const label = (x, y, str, size, originX = 0) =>
      fix(
        scene.add
          .text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color: '#111111', stroke: '#ffffff', strokeThickness: 8, padding: { x: 8, y: 12 } })
          .setOrigin(originX, 0.5),
      );

    this.hearts = [];
    for (let i = 0; i < MAX_HEARTS; i++) this.hearts.push(fix(scene.add.image(56 + i * 50, 54, 'heart')));
    fix(scene.add.image(58, 118, 'panda').setScale(0.55));
    this.lives = label(88, 118, '', 36);
    fix(scene.add.image(200, 118, 'bamboo').setScale(0.7));
    this.bamboo = label(220, 118, '', 36);
    this.keys = SHAPES.map((shape, i) => fix(scene.add.image(58 + i * 54, 182, `key-${shape}`).setVisible(false)));
    this.boots = fix(scene.add.image(58 + 3 * 54, 182, 'boots').setScale(0.9).setVisible(false));

    this.score = label(GAME_W - 40, 54, '', 44, 1);
    this.timer = label(GAME_W / 2, 50, '', 40, 0.5);
    this.last = {};
  }

  /** Only touch the text when a number changes (changing text is slow). */
  set(name, value, apply) {
    if (this.last[name] === value) return;
    this.last[name] = value;
    apply(value);
  }

  update(game) {
    this.set('hearts', game.hearts, (n) => this.hearts.forEach((h, i) => h.setTexture(i < n ? 'heart' : 'heart-empty')));
    this.set('lives', game.lives, (n) => this.lives.setText(`× ${n}`));
    this.set('bamboo', game.bamboo, (n) => this.bamboo.setText(`${n} / ${game.bambooTotal}`));
    this.set('score', game.score, (n) => this.score.setText(`Score ${String(n).padStart(6, '0')}`));
    this.set('time', Math.floor(game.elapsed), (s) => this.timer.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`));
    this.set('keys', [...game.keys].join(), () => SHAPES.forEach((shape, i) => this.keys[i].setVisible(game.keys.has(shape))));
    this.set('boots', game.body.hasBoots, (on) => this.boots.setVisible(on));
  }
}
