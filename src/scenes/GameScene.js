// ================================================================
//  PLAYING A LEVEL
//
//  This scene builds the level from its map, runs the game 60 times a
//  second and handles what happens when the panda touches things:
//  collecting, getting hurt, opening doors, checkpoints and winning.
// ================================================================

import Phaser from 'phaser';
import { TILE, GAME_W, GAME_H, STEP, MAX_HEARTS, SCORE, START_LIVES, PLAYER, INK } from '../config.js';
import { splitLevel } from '../levelFormat.js';
import { tileProps } from '../objects.js';
import { Grid, overlaps } from '../game/physics.js';
import { PlayerBody } from '../game/player.js';
import { PlayerView } from '../game/playerView.js';
import { createEntity } from '../game/entities.js';
import { Controls } from '../game/controls.js';
import { Hud } from '../game/hud.js';
import { createBackdrop } from '../game/backdrop.js';
import { DEPTH } from '../game/depth.js';
import * as fx from '../game/fx.js';
import { tileLayers, outlineEdges } from '../art/tileArt.js';
import { artKey } from '../art/index.js';
import { sfx } from '../systems/sfx.js';
import { addScore, bestScore, levelBoard, lastName } from '../systems/scores.js';
import { text, panel, Menu, goTo, dim, onKeyDown } from './ui.js';

const T = TILE;
const LIQUIDS = new Set(['~', 'Q']);

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  /**
   * data.run describes this go at the game:
   *   mode:   'campaign' (all the levels in a row), 'single' (one level) or 'test' (from the designer)
   *   levels: the list of levels, and index: which one we're on
   *   score, lives: carried over from the level before
   */
  init(data) {
    this.run = data.run;
    this.level = this.run.levels[this.run.index];
  }

  create() {
    this._leaving = false;
    this.themeId = this.level.theme;
    this.layout = splitLevel(this.level);
    this.bambooTotal = this.layout.entities.filter((e) => e.char === 'o').length;
    this.lives = this.run.lives;
    this.elapsed = 0;
    this.acc = 0;
    this.state = 'play'; // 'play' | 'paused' | 'dying' | 'won' | 'over'
    this.checkpoint = null;
    this.toastCooldown = 0;
    this.startSnap = { gone: new Set(), tiles: new Map(), score: this.run.score, keys: [], boots: false, bamboo: 0, spawn: null };

    this.backdrop = createBackdrop(this, this.themeId);
    this.controls = new Controls(this);
    this.buildWorld(this.startSnap);
    this.hud = new Hud(this);
    this.addPauseButton();
    this.showBanner();

    onKeyDown(this, (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (e.code === 'KeyM') sfx.toggle();
    });
    this.cameras.main.fadeIn(300, 255, 253, 246);
    if (import.meta.env.DEV) window.__panda = this; // handy for poking at the game from the browser console
  }

  // ---------------------------------------------------------------
  //  Building the level
  // ---------------------------------------------------------------

  /** Build (or rebuild) everything from a snapshot: the level start, or the last checkpoint. */
  buildWorld(snap) {
    this.clearWorld();
    this.grid = new Grid(this.layout.tiles);
    this.tileChanges = new Map(snap.tiles);
    for (const [key, ch] of this.tileChanges) {
      const [cx, cy] = key.split(',').map(Number);
      this.grid.set(cx, cy, ch);
    }
    this.gone = new Set(snap.gone); // ids of things collected, opened or defeated
    this.score = snap.score;
    this.keys = new Set(snap.keys);
    this.bamboo = snap.bamboo;
    this.hearts = MAX_HEARTS;
    this.invulnerable = 0;
    this.drawAllTiles();

    this.entities = [];
    this.projectiles = [];
    for (const spot of this.layout.entities) {
      if (this.gone.has(spot.id)) continue;
      const e = createEntity(this, spot, this.grid);
      if (!e) continue;
      if (spot.char === '!' && this.checkpoint?.id === spot.id) e.raise(true);
      this.entities.push(e);
    }

    const start = this.layout.start;
    const spawn = snap.spawn ?? { x: (start.cx + 0.5) * T, y: (start.cy + 1) * T };
    this.body = new PlayerBody(spawn.x, spawn.y);
    this.body.hasBoots = snap.boots;
    this.view = new PlayerView(this);
    this.view.sync(this.body, 1, 0, 0, 0);

    this.cameras.main.setBounds(0, 0, this.grid.pixelWidth, Math.max(this.grid.pixelHeight, GAME_H));
    this.moveCamera(0, true);
  }

  clearWorld() {
    this.tweens.killAll();
    for (const imgs of this.cellArt?.values() ?? []) for (const img of imgs) img.destroy();
    this.outline?.destroy();
    for (const e of this.entities ?? []) e.destroy();
    for (const p of this.projectiles ?? []) p.remove();
    this.view?.destroy();
    this.banner?.destroy();
    this.toastText?.destroy();
    this.cellArt = new Map();
    this.animated = new Set();
  }

  drawAllTiles() {
    for (let cy = 0; cy < this.grid.h; cy++) {
      for (let cx = 0; cx < this.grid.w; cx++) this.drawCell(cx, cy);
    }
    this.drawOutlines();
  }

  /** (Re)draw the pictures for one tile. */
  drawCell(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.grid.w || cy >= this.grid.h) return;
    const key = `${cx},${cy}`;
    for (const img of this.cellArt.get(key) ?? []) {
      this.animated.delete(img);
      img.destroy();
    }
    const get = (x, y) => this.grid.get(x, y);
    const liquid = LIQUIDS.has(get(cx, cy));
    const imgs = tileLayers(get, cx, cy).map((layer, i) => {
      const img = this.add.image(cx * T, cy * T, artKey(layer.key, this.themeId)).setOrigin(0);
      img.setDepth(liquid ? DEPTH.liquid : i === 0 ? DEPTH.tiles : DEPTH.tileTop);
      if (layer.frames) {
        img.anim = layer;
        img.phase = layer.key.startsWith('fire') ? (cx * 7 + cy * 3) % layer.frames.length : 0;
        this.animated.add(img);
      }
      return img;
    });
    if (imgs.length) this.cellArt.set(key, imgs);
    else this.cellArt.delete(key);
  }

  /** The thick ink line around ground and ice. */
  drawOutlines() {
    this.outline?.destroy();
    const g = this.add.graphics().setDepth(DEPTH.outline);
    const get = (x, y) => this.grid.get(x, y);
    g.lineStyle(5, INK, 1);
    g.fillStyle(INK, 1);
    for (let cy = 0; cy < this.grid.h; cy++) {
      for (let cx = 0; cx < this.grid.w; cx++) {
        for (const [x1, y1, x2, y2] of outlineEdges(get, cx, cy, T)) {
          g.lineBetween(cx * T + x1, cy * T + y1, cx * T + x2, cy * T + y2);
          g.fillRect(cx * T + x1 - 2.5, cy * T + y1 - 2.5, 5, 5); // fill the corners
          g.fillRect(cx * T + x2 - 2.5, cy * T + y2 - 2.5, 5, 5);
        }
      }
    }
    this.outline = g;
  }

  /** A tile changed (door opened, water frozen): remember it and redraw around it. */
  tileChanged(cx, cy, redrawOutline = true) {
    this.tileChanges.set(`${cx},${cy}`, this.grid.get(cx, cy));
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) this.drawCell(cx + dx, cy + dy);
    if (redrawOutline) this.drawOutlines();
  }

  animateTiles(time) {
    for (const img of this.animated) {
      const { frames, fps } = img.anim;
      const frame = frames[(Math.floor((time / 1000) * fps) + img.phase) % frames.length];
      if (img.texture.key !== frame) img.setTexture(frame);
    }
  }

  // ---------------------------------------------------------------
  //  The game loop
  // ---------------------------------------------------------------

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    this.animateTiles(time);
    if (this.state !== 'paused') {
      // Run the game in steady 1/60th-second steps, however fast the screen is.
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        this.tick(STEP);
      }
    }
    this.view.sync(this.body, this.acc / STEP, dt, this.invulnerable, time);
    this.moveCamera(dt);
    this.backdrop.update(this.cameras.main.scrollX, time);
    this.hud.update(this);
    this.toastCooldown = Math.max(0, this.toastCooldown - dt);
  }

  tick(dt) {
    const input = this.controls.read();
    if (this.state === 'play') {
      this.elapsed += dt;
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.stepPanda(dt, input);
    }
    for (const e of this.entities) if (!e.dead) e.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    if (this.state === 'play') this.checkTouches();
    this.entities = this.entities.filter((e) => !e.removed);
    this.projectiles = this.projectiles.filter((p) => !p.removed);
  }

  stepPanda(dt, input) {
    const b = this.body;
    for (const ev of b.step(dt, input, this.grid)) {
      if (ev.type === 'freeze') {
        this.tileChanged(ev.cx, ev.cy);
        fx.puff(this, (ev.cx + 0.5) * T, ev.cy * T + 10, { color: 0xd4f6ff, count: 6, size: 8, spread: 40 });
        sfx.play('freeze');
        continue;
      }
      switch (ev) {
        case 'jump':
          sfx.play('jump');
          this.view.stretch();
          break;
        case 'sandHop':
          sfx.play('sandHop');
          this.view.stretch();
          break;
        case 'land':
          this.view.squash(0.5);
          fx.dust(this, b.centerX, b.bottom, 0.4);
          break;
        case 'bigLand':
          this.view.squash(1);
          fx.dust(this, b.centerX, b.bottom, 1);
          sfx.play('land');
          break;
        case 'bonk':
          sfx.play('bonk');
          break;
        case 'fire':
          this.hurt(1, b.centerX + b.facing * 20);
          break;
        case 'water':
          fx.splash(this, b.centerX, b.bottom - 20);
          this.loseLife('water');
          return;
        case 'sand':
        case 'pit':
          this.loseLife(ev);
          return;
      }
    }
    // Bumped into a door? It opens if we have the right key.
    for (const side of ['left', 'right', 'up', 'down']) {
      const hit = b.hit?.[side];
      if (hit && tileProps(hit.ch).door) this.tryDoor(hit.cx, hit.cy);
    }
  }

  checkTouches() {
    const b = this.body;
    for (const e of this.entities) {
      const box = e.box();
      if (box && overlaps(b, box)) {
        e.touch(this);
        if (this.state !== 'play') return;
      }
    }
    for (const p of this.projectiles) {
      if (!p.removed && overlaps(b, p)) {
        this.hurt(1, p.x + p.w / 2);
        p.remove();
      }
    }
  }

  moveCamera(dt, snap = false) {
    if (!snap && this.state !== 'play' && this.state !== 'won') return;
    const cam = this.cameras.main;
    const b = this.body;
    const lookAhead = b.facing * 140;
    this.look = snap ? lookAhead : this.look + (lookAhead - this.look) * Math.min(1, dt * 2);
    const tx = b.centerX + this.look - GAME_W / 2;
    const ty = b.bottom - GAME_H * 0.62;
    const k = snap ? 1 : Math.min(1, dt * 7);
    cam.setScroll(cam.scrollX + (tx - cam.scrollX) * k, cam.scrollY + (ty - cam.scrollY) * k);
    // Keep the camera inside the level.
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, Math.max(0, this.grid.pixelWidth - GAME_W));
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, Math.max(0, this.grid.pixelHeight - GAME_H));
  }

  // ---------------------------------------------------------------
  //  Things the entities call when the panda touches them
  // ---------------------------------------------------------------

  collect(item) {
    if (item.kind === 'heart' && this.hearts >= MAX_HEARTS) return; // leave it for later
    this.gone.add(item.id);
    switch (item.kind) {
      case 'bamboo':
        this.bamboo++;
        this.addPoints(SCORE.bamboo, item.centerX, item.y);
        sfx.play('bamboo');
        break;
      case 'heart':
        this.hearts++;
        sfx.play('heart');
        break;
      case 'key':
        this.keys.add(item.def.shape);
        sfx.play('key');
        this.toast(`Got the ${item.def.shape} key!`, true);
        break;
      case 'boots':
        this.body.hasBoots = true;
        sfx.play('boots');
        this.toast('Ice boots! No more slipping, and shark water freezes under your feet.', true);
        break;
    }
    item.collected();
  }

  /** Something thrown, like a banana. It hurts the panda if it hits. */
  addProjectile(p) {
    this.projectiles.push(p);
  }

  addPoints(points, x, y) {
    this.score += points;
    if (x !== undefined) fx.floatText(this, x, y, `+${points}`);
  }

  stomp(enemy) {
    this.gone.add(enemy.id);
    enemy.squash();
    this.body.bounce(this.controls.lastJump);
    this.view.stretch();
    this.addPoints(SCORE.stomp, enemy.centerX, enemy.y);
    sfx.play('stomp');
  }

  /** An anvil landed on an enemy. */
  squashEnemy(enemy) {
    this.gone.add(enemy.id);
    enemy.squash();
    this.addPoints(SCORE.stomp, enemy.centerX, enemy.y);
    sfx.play('stomp');
  }

  /** The water around a shark froze solid. */
  sharkFrozen(shark) {
    this.gone.add(shark.id);
    fx.puff(this, shark.finX, shark.surfaceY, { color: 0xd4f6ff, count: 10, size: 10 });
    this.addPoints(SCORE.frozenShark, shark.finX, shark.surfaceY - 30);
    shark.remove();
    this.toast('Shark on ice!');
  }

  hurt(amount, fromX) {
    if (this.state !== 'play' || this.invulnerable > 0) return;
    this.hearts = Math.max(0, this.hearts - amount);
    sfx.play('hurt');
    this.cameras.main.shake(160, 0.006);
    if (this.hearts <= 0) {
      this.loseLife('hurt');
      return;
    }
    this.invulnerable = PLAYER.invulnerable;
    this.body.knockBack(fromX, this.grid);
    this.view.ouch();
  }

  loseLife(reason) {
    if (this.state !== 'play') return;
    this.state = 'dying';
    this.lives -= 1;
    sfx.play(reason === 'water' ? 'splash' : 'die');
    this.view.die(reason);
    this.time.delayedCall(1700, () => {
      if (this.lives <= 0) {
        this.outOfLives();
        return;
      }
      this.buildWorld(this.checkpoint ?? this.startSnap);
      this.state = 'play';
      this.toast(this.lives === 1 ? 'Last life! Careful!' : `${this.lives} lives left`, true);
    });
  }

  tryDoor(cx, cy) {
    const ch = this.grid.get(cx, cy);
    const shape = tileProps(ch).door;
    if (!this.keys.has(shape)) {
      if (this.toastCooldown <= 0) {
        this.toast(`Locked! You need the ${shape} key.`);
        sfx.play('locked');
      }
      return;
    }
    // Open this door block and every block of the same door joined to it.
    const todo = [[cx, cy]];
    const opened = [];
    while (todo.length) {
      const [x, y] = todo.pop();
      if (this.grid.get(x, y) !== ch) continue;
      this.grid.set(x, y, '.');
      opened.push([x, y]);
      todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    for (const [x, y] of opened) {
      this.tileChanged(x, y, false);
      fx.puff(this, (x + 0.5) * T, (y + 0.5) * T, { color: 0xdfae76, count: 5, size: 10 });
    }
    this.drawOutlines();
    sfx.play('door');
  }

  reachCheckpoint(flag) {
    if (this.checkpoint?.id === flag.id) return;
    for (const e of this.entities) if (e !== flag) e.lower?.();
    flag.raise();
    sfx.play('checkpoint');
    fx.sparkle(this, flag.centerX, flag.y);
    this.checkpoint = this.snapshot({ x: flag.footX, y: flag.footY }, flag.id);
    this.toast('Checkpoint!');
  }

  /** Remember how things are now, to come back to if the panda loses a life. */
  snapshot(spawn, id) {
    return {
      id,
      spawn,
      gone: new Set(this.gone),
      tiles: new Map(this.tileChanges),
      score: this.score,
      keys: [...this.keys],
      boots: this.body.hasBoots,
      bamboo: this.bamboo,
    };
  }

  reachGoal(goal) {
    if (this.state !== 'play') return;
    this.state = 'won';
    this.body.vx = 0;
    sfx.play('win');
    this.view.cheer();
    fx.sparkle(this, goal.centerX, goal.y + 20);
    const lines = [];
    const add = (label, points) => {
      lines.push([label, points]);
      this.score += points;
    };
    add('Level clear', SCORE.levelClear);
    add(`Hearts left × ${this.hearts}`, this.hearts * SCORE.perHeartLeft);
    const under = Math.max(0, Math.floor(this.level.par - this.elapsed));
    add(`Time bonus (${under}s under par)`, under * SCORE.perSecondUnderPar);
    if (this.bambooTotal > 0 && this.bamboo === this.bambooTotal) add('All the bamboo!', SCORE.allBamboo);
    this.time.delayedCall(1000, () => this.showLevelComplete(lines));
  }

  // ---------------------------------------------------------------
  //  Screens on top of the game: banner, pause, level complete, out of lives
  // ---------------------------------------------------------------

  showBanner() {
    const total = this.run.levels.length;
    const which = this.run.mode === 'campaign' ? `Level ${this.run.index + 1} of ${total}` : this.run.mode === 'test' ? 'Test play' : 'Single level';
    const lines = [this.level.name, which];
    if (this.level.hint) lines.push(this.level.hint);
    const h = this.level.hint ? 260 : 190;
    const c = this.add.container(GAME_W / 2, 230).setScrollFactor(0).setDepth(DEPTH.overlay);
    c.add(panel(this, 0, 0, 1100, h));
    c.add(text(this, 0, -h / 2 + 60, this.level.name, 64));
    c.add(text(this, 0, -h / 2 + 122, which, 32, { color: '#555555' }));
    if (this.level.hint) c.add(text(this, 0, -h / 2 + 190, this.level.hint, 32, { wrap: 1000 }));
    this.banner = c;
    this.tweens.add({ targets: c, alpha: 0, y: 160, delay: this.level.hint ? 4200 : 2400, duration: 500, onComplete: () => c.destroy() });
  }

  toast(message, important = false) {
    this.toastText?.destroy();
    const t = text(this, GAME_W / 2, 250, message, important ? 46 : 40, { stroke: '#ffffff', strokeThickness: 10, wrap: 1500 })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.toastText = t;
    this.toastCooldown = 1.5;
    this.tweens.add({ targets: t, y: 200, alpha: 0, delay: important ? 1800 : 900, duration: 500, onComplete: () => t.destroy() });
  }

  addPauseButton() {
    const b = text(this, GAME_W / 2 + 130, 50, '❚❚', 36, { stroke: '#ffffff', strokeThickness: 8 })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => this.togglePause());
  }

  /** A paper panel in the middle of the screen with a title, some lines and a menu. */
  overlay(title, lines, items) {
    const parts = [dim(this)];
    const h = 260 + lines.length * 56 + items.length * 84;
    const top = GAME_H / 2 - h / 2;
    parts.push(panel(this, GAME_W / 2, GAME_H / 2, 1000, h).setScrollFactor(0).setDepth(DEPTH.overlay));
    parts.push(text(this, GAME_W / 2, top + 80, title, 80).setScrollFactor(0).setDepth(DEPTH.overlay));
    lines.forEach((line, i) => {
      const [label, value] = Array.isArray(line) ? line : [line, ''];
      const y = top + 170 + i * 56;
      if (value === '') {
        parts.push(text(this, GAME_W / 2, y, label, 38).setScrollFactor(0).setDepth(DEPTH.overlay));
      } else {
        parts.push(text(this, GAME_W / 2 - 400, y, label, 36, { originX: 0 }).setScrollFactor(0).setDepth(DEPTH.overlay));
        parts.push(text(this, GAME_W / 2 + 400, y, String(value), 36, { originX: 1 }).setScrollFactor(0).setDepth(DEPTH.overlay));
      }
    });
    const menu = new Menu(this, GAME_W / 2, top + 200 + lines.length * 56, items, { size: 52, gap: 84, depth: DEPTH.overlay, fixed: true });
    return {
      destroy() {
        menu.destroy();
        for (const p of parts) p.destroy();
      },
    };
  }

  togglePause() {
    if (this.state === 'play') {
      this.state = 'paused';
      this.pauseUi = this.overlay('Paused', ['Arrows/WASD move · Space jumps · Down ducks', 'M turns the sound on and off'], [
        { label: 'Keep playing', action: () => this.togglePause() },
        { label: 'Restart level', action: () => goTo(this, 'Game', { run: { ...this.run, lives: this.lives } }) },
        { label: this.run.mode === 'test' ? 'Back to the designer' : 'Quit to title', action: () => this.quit() },
      ]);
    } else if (this.state === 'paused') {
      this.pauseUi.destroy();
      this.state = 'play';
    }
  }

  quit() {
    if (this.run.mode === 'test') window.location.href = './editor.html';
    else goTo(this, 'Title');
  }

  showLevelComplete(lines) {
    const run = this.run;
    const extra = [];
    if (run.mode !== 'campaign') {
      const board = levelBoard(this.level.id ?? 'test');
      const before = bestScore(board);
      if (run.mode === 'single') addScore(board, lastName() || 'PANDA', this.score);
      if (this.score > before && run.mode === 'single') extra.push('A new best for this level!');
    }
    const shown = [...lines, ['Score', this.score], ...extra];
    let items;
    if (run.mode === 'campaign') {
      const last = run.index + 1 >= run.levels.length;
      items = last
        ? [{ label: 'Finish the adventure!', action: () => goTo(this, 'Results', { score: this.score, victory: true, reached: run.levels.length }) }]
        : [
            { label: 'Next level', action: () => goTo(this, 'Game', { run: { ...run, index: run.index + 1, score: this.score, lives: this.lives } }) },
            { label: 'Quit to title', action: () => goTo(this, 'Title') },
          ];
    } else if (run.mode === 'test') {
      items = [
        { label: 'Back to the designer', action: () => this.quit() },
        { label: 'Play again', action: () => goTo(this, 'Game', { run: { ...run, lives: START_LIVES, score: 0 } }) },
      ];
    } else {
      items = [
        { label: 'Play again', action: () => goTo(this, 'Game', { run: { ...run, lives: START_LIVES, score: 0 } }) },
        { label: 'Choose a level', action: () => goTo(this, 'LevelSelect') },
        { label: 'Title screen', action: () => goTo(this, 'Title') },
      ];
    }
    this.overlay('Level complete!', shown, items);
  }

  outOfLives() {
    this.state = 'over';
    if (this.run.mode === 'campaign') {
      goTo(this, 'Results', { score: this.score, victory: false, reached: this.run.index + 1 });
      return;
    }
    sfx.play('gameOver');
    this.overlay('Out of lives!', [['Score', this.score]], [
      { label: 'Try again', action: () => goTo(this, 'Game', { run: { ...this.run, lives: START_LIVES, score: 0 } }) },
      { label: this.run.mode === 'test' ? 'Back to the designer' : 'Choose a level', action: () => (this.run.mode === 'test' ? this.quit() : goTo(this, 'LevelSelect')) },
    ]);
  }
}
