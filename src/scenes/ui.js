// ================================================================
//  MENU BITS used by all the screens: text, paper panels and menus
//  you can drive with the keyboard, a mouse or a finger.
// ================================================================

import { FONT, INK } from '../config.js';
import { DEPTH } from '../game/depth.js';
import { sfx } from '../systems/sfx.js';

/**
 * Call handler(event) for every key press while this scene is running.
 * Menus and typing use this instead of Phaser's key events, which only look at the keyboard
 * once a frame and can miss two quick taps.
 */
export function onKeyDown(scene, handler) {
  const listener = (e) => {
    if (scene.sys.isActive()) handler(e);
  };
  window.addEventListener('keydown', listener);
  const off = () => window.removeEventListener('keydown', listener);
  scene.events.once('shutdown', off);
  return off;
}

/** Handwritten text, centred on (x, y) unless you say otherwise. */
export function text(scene, x, y, str, size = 48, opts = {}) {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color: opts.color ?? '#111111',
      stroke: opts.stroke ?? '#ffffff',
      strokeThickness: opts.strokeThickness ?? 0,
      align: opts.align ?? 'center',
      padding: { x: 10, y: 16 },
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

/** A sheet of paper with an ink outline and a drop shadow. */
export function panel(scene, x, y, w, h, { fill = 0xfffdf6, radius = 28 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(INK, 0.25);
  g.fillRoundedRect(x - w / 2 + 12, y - h / 2 + 14, w, h, radius);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(6, INK, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

/**
 * A list of choices. Up/Down (or W/S) to move, Enter/Space to choose, Esc for onCancel.
 * items: [{ label, action }]
 */
export class Menu {
  constructor(scene, x, y, items, { size = 56, gap = 88, onCancel = null, depth = 0, fixed = false } = {}) {
    this.scene = scene;
    this.items = items;
    this.index = 0;
    this.onCancel = onCancel;
    this.texts = items.map((item, i) => {
      const t = text(scene, x, y + i * gap, item.label, size).setDepth(depth);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.select(i));
      t.on('pointerdown', () => this.choose(i));
      if (fixed) t.setScrollFactor(0);
      return t;
    });
    this.pointer = text(scene, 0, 0, '▶', size * 0.7).setDepth(depth);
    if (fixed) this.pointer.setScrollFactor(0);
    this.offKeys = onKeyDown(scene, (e) => this.key(e));
    this.select(0, true);
  }

  key(e) {
    if (!this.active()) return;
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.select((this.index + this.items.length - 1) % this.items.length);
    else if (['ArrowDown', 'KeyS'].includes(e.code)) this.select((this.index + 1) % this.items.length);
    else if (['Enter', 'Space', 'KeyZ', 'NumpadEnter'].includes(e.code)) this.choose(this.index);
    else if (e.code === 'Escape' && this.onCancel) this.onCancel();
  }

  active() {
    return this.texts.length && this.texts[0].active;
  }

  select(i, quiet = false) {
    if (i !== this.index && !quiet) sfx.play('move');
    this.index = i;
    this.texts.forEach((t, j) => t.setColor(j === i ? '#e5484d' : '#111111').setScale(j === i ? 1.08 : 1));
    const t = this.texts[i];
    this.pointer.setPosition(t.x - t.width / 2 - 20, t.y);
  }

  choose(i) {
    sfx.play('select');
    this.select(i, true);
    this.items[i].action();
  }

  setLabel(i, label) {
    this.texts[i].setText(label);
    this.select(this.index, true);
  }

  destroy() {
    this.offKeys();
    for (const t of this.texts) t.destroy();
    this.pointer.destroy();
    this.texts = [];
  }
}

/** Fade the screen out, then go to another scene. */
export function goTo(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(250, 255, 253, 246);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

/** A dark see-through layer over the whole screen (for pause and results). */
export function dim(scene, depth = DEPTH.overlay) {
  return scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, INK, 0.45).setOrigin(0).setScrollFactor(0).setDepth(depth);
}
