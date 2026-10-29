// ================================================================
//  CHOOSE A LEVEL: the game's levels, then the ones you made.
// ================================================================

import Phaser from 'phaser';
import { GAME_W, GAME_H, START_LIVES, INK } from '../config.js';
import { BUILT_IN_LEVELS } from '../levels/index.js';
import { listMyLevels } from '../systems/myLevels.js';
import { bestScore, levelBoard } from '../systems/scores.js';
import { getTheme } from '../themes.js';
import { createBackdrop } from '../game/backdrop.js';
import { sfx } from '../systems/sfx.js';
import { text, goTo, onKeyDown } from './ui.js';

const COLS = 3;
const CARD_W = 540;
const CARD_H = 190;
const GAP_X = 40;
const GAP_Y = 36;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create() {
    this._leaving = false;
    createBackdrop(this, 'beach');
    text(this, GAME_W / 2, 80, 'Choose a level', 80, { stroke: '#ffffff', strokeThickness: 14 }).setScrollFactor(0).setDepth(10);
    text(this, GAME_W / 2, GAME_H - 50, 'Arrows to pick · Enter to play · Esc to go back', 32, { stroke: '#ffffff', strokeThickness: 8 })
      .setScrollFactor(0)
      .setDepth(10);

    const play = (level) => goTo(this, 'Game', { run: { mode: 'single', levels: [level], index: 0, score: 0, lives: START_LIVES } });
    this.cards = [
      ...BUILT_IN_LEVELS.map((level, i) => ({ title: `${i + 1}. ${level.name}`, sub: getTheme(level.theme).name, level, action: () => play(level) })),
      ...listMyLevels().map((level) => ({ title: level.name, sub: `Made by ${level.author || 'you'}`, level, mine: true, action: () => play(level) })),
      { title: '+ Make a new level', sub: 'Opens the level designer', action: () => (window.location.href = './editor.html?new=1') },
    ];

    const left = GAME_W / 2 - (COLS * CARD_W + (COLS - 1) * GAP_X) / 2 + CARD_W / 2;
    let lastHeading = null;
    let row = 0;
    let col = 0;
    this.cards.forEach((card, i) => {
      const heading = card.mine ? 'Your levels' : card.level ? 'The adventure' : null;
      if (heading && heading !== lastHeading) {
        if (col !== 0) row++;
        col = 0;
        if (lastHeading !== null) row += 0.35;
        lastHeading = heading;
        card.heading = heading;
      }
      card.x = left + col * (CARD_W + GAP_X);
      card.y = 290 + row * (CARD_H + GAP_Y);
      this.drawCard(card, i);
      col++;
      if (col === COLS) {
        col = 0;
        row++;
      }
    });

    this.index = 0;
    this.select(0);
    onKeyDown(this, (e) => this.key(e));
    this.cameras.main.fadeIn(250, 255, 253, 246);
  }

  drawCard(card, i) {
    if (card.heading) {
      text(this, card.x - CARD_W / 2 + 6, card.y - CARD_H / 2 - 28, card.heading, 34, { originX: 0, stroke: '#ffffff', strokeThickness: 8 });
    }
    const theme = card.level ? getTheme(card.level.theme) : null;
    const g = this.add.graphics();
    g.fillStyle(INK, 0.25).fillRoundedRect(card.x - CARD_W / 2 + 10, card.y - CARD_H / 2 + 12, CARD_W, CARD_H, 24);
    g.fillStyle(0xfffdf6, 1).fillRoundedRect(card.x - CARD_W / 2, card.y - CARD_H / 2, CARD_W, CARD_H, 24);
    if (theme) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.near).color, 1);
      g.fillRoundedRect(card.x - CARD_W / 2, card.y - CARD_H / 2, 26, CARD_H, { tl: 24, bl: 24, tr: 0, br: 0 });
    }
    card.frame = this.add.graphics();
    text(this, card.x, card.y - 42, card.title, 40, { wrap: CARD_W - 60 });
    text(this, card.x, card.y + 22, card.sub, 28, { color: '#555555' });
    if (card.level) {
      const best = bestScore(levelBoard(card.level.id));
      text(this, card.x, card.y + 66, best ? `Best: ${best}` : 'Not played yet', 26, { color: best ? '#0a8e8e' : '#999999' });
    }
    const hit = this.add.zone(card.x, card.y, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => this.select(i));
    hit.on('pointerdown', () => this.choose());
  }

  select(i) {
    if (i !== this.index) sfx.play('move');
    this.index = i;
    for (const [j, card] of this.cards.entries()) {
      card.frame.clear();
      card.frame.lineStyle(j === i ? 10 : 5, j === i ? 0xe5484d : INK, 1);
      card.frame.strokeRoundedRect(card.x - CARD_W / 2, card.y - CARD_H / 2, CARD_W, CARD_H, 24);
    }
    // Scroll so the chosen card is on screen.
    const card = this.cards[i];
    const cam = this.cameras.main;
    const target = Math.max(0, card.y - GAME_H / 2 + 60);
    this.tweens.add({ targets: cam, scrollY: card.y + CARD_H / 2 > GAME_H - 110 || cam.scrollY > 0 ? target : 0, duration: 200 });
  }

  choose() {
    sfx.play('select');
    this.cards[this.index].action();
  }

  key(e) {
    const n = this.cards.length;
    const here = this.cards[this.index];
    const nearest = (pred) => {
      let best = -1;
      let bestD = Infinity;
      this.cards.forEach((c, j) => {
        if (!pred(c)) return;
        const d = Math.abs(c.x - here.x) + Math.abs(c.y - here.y) * 0.5;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      });
      return best;
    };
    let next = -1;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') next = (this.index + 1) % n;
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') next = (this.index + n - 1) % n;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') next = nearest((c) => c.y > here.y + 10);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') next = nearest((c) => c.y < here.y - 10);
    else if (['Enter', 'Space', 'NumpadEnter'].includes(e.code)) this.choose();
    else if (e.code === 'Escape') goTo(this, 'Title');
    if (next >= 0) this.select(next);
  }
}
