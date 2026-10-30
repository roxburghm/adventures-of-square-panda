// ================================================================
//  THE TITLE SCREEN
// ================================================================

import Phaser from 'phaser';
import { GAME_W, GAME_H, TILE, GAME_TITLE, START_LIVES, INK } from '../config.js';
import { createBackdrop } from '../game/backdrop.js';
import { artKey } from '../art/index.js';
import { BUILT_IN_LEVELS } from '../levels/index.js';
import { sfx } from '../systems/sfx.js';
import { isPhone } from '../systems/device.js';
import { text, Menu, goTo } from './ui.js';

const T = TILE;

/** A strip of grassy ground along the bottom of a menu screen. */
export function groundStrip(scene, theme = 'meadow', rows = 2) {
  const top = GAME_H - rows * T;
  for (let x = 0; x < GAME_W; x += T) {
    for (let r = 0; r < rows; r++) scene.add.image(x, top + r * T, artKey('ground', theme)).setOrigin(0);
    scene.add.image(x, top, artKey('cap', theme)).setOrigin(0);
  }
  scene.add.rectangle(0, top - 2.5, GAME_W, 5, INK).setOrigin(0);
  return top;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this._leaving = false;
    this.backdrop = createBackdrop(this, 'meadow');
    const floor = groundStrip(this);

    const [small, big] = GAME_TITLE.split(' of ');
    text(this, GAME_W / 2, 150, `${small} of`, 72);
    const title = text(this, GAME_W / 2, 270, big, 150, { stroke: '#ffffff', strokeThickness: 16 });
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The cast!
    this.panda = this.add.image(360, floor + 4, 'panda').setOrigin(0.5, 1).setScale(2.2);
    this.monkey = this.add.image(620, floor + 4, 'monkey').setOrigin(0.5, 1).setScale(1.6);
    this.shark = this.add.image(GAME_W - 360, floor + 4, 'shark').setOrigin(0.5, 1).setScale(2.1).setFlipX(true);
    this.tweens.add({ targets: this.panda, y: floor - 70, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut', repeatDelay: 500 });
    this.tweens.add({ targets: this.monkey, x: 760, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({ delay: 400, loop: true, callback: () => this.shark.setTexture(this.shark.texture.key === 'shark' ? 'shark-closed' : 'shark') });

    const soundLabel = () => `Sound: ${sfx.muted ? 'off' : 'on'}`;
    const items = [
      {
        label: 'Play the adventure game',
        action: () => goTo(this, 'Game', { run: { mode: 'campaign', levels: BUILT_IN_LEVELS, index: 0, score: 0, lives: START_LIVES } }),
      },
      { label: 'Choose a level', action: () => goTo(this, 'LevelSelect') },
      // The level designer needs a bigger screen than a phone.
      ...(isPhone() ? [] : [{ label: 'Level designer', action: () => (window.location.href = './editor.html') }]),
      { label: 'High scores', action: () => goTo(this, 'Scores') },
    ];
    const sound = items.length;
    items.push({
      label: soundLabel(),
      action: () => {
        sfx.toggle();
        menu.setLabel(sound, soundLabel());
      },
    });
    const menu = new Menu(this, GAME_W / 2, 470, items);

    const help = this.sys.game.device.input.touch
      ? 'Tap a choice to start  ·  In the game, use the buttons on the screen'
      : 'Arrows / WASD to move  ·  Space to jump  ·  Down to duck  ·  Esc to pause';
    text(this, GAME_W / 2, GAME_H - 72, help, 32, {
      color: '#ffffff',
      stroke: '#111111',
      strokeThickness: 8,
    });
    this.cameras.main.fadeIn(300, 255, 253, 246);
  }

  update(time) {
    this.backdrop.update(time * 0.04, time);
    this.monkey.rotation = Math.sin(time / 90) * 0.12;
  }
}
