// ================================================================
//  CONTROLS
//  Keyboard:  Arrows or WASD to move, Down/S to duck,
//             Space / Up / W / Z to jump.
//  Gamepad:   D-pad or left stick, A to jump.
//  Touch:     on-screen buttons appear on phones and tablets.
// ================================================================

import { GAME_W, GAME_H, FONT, INK } from '../config.js';
import { DEPTH } from './depth.js';

export class Controls {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S',
      space: 'SPACE', z: 'Z',
    });
    this.lastJump = false;
    this.buttons = [];
    // Tests and robots can steer the panda by setting this to { left, right, down, jump }.
    this.override = null;
    if (scene.sys.game.device.input.touch) this.addTouchButtons();
  }

  /** What is the player pressing right now? */
  read() {
    const k = this.keys;
    const pad = this.gamepad();
    const touch = this.readTouch();
    let state = {
      left: k.left.isDown || k.a.isDown || touch.left || pad.left,
      right: k.right.isDown || k.d.isDown || touch.right || pad.right,
      down: k.down.isDown || k.s.isDown || touch.down || pad.down,
      jump: k.space.isDown || k.up.isDown || k.w.isDown || k.z.isDown || touch.jump || pad.jump,
    };
    if (this.override) state = { left: false, right: false, down: false, jump: false, ...this.override };
    state.jumpPressed = state.jump && !this.lastJump;
    this.lastJump = state.jump;
    return state;
  }

  gamepad() {
    const none = { left: false, right: false, down: false, jump: false };
    try {
      const pad = this.scene.input.gamepad?.pad1;
      if (!pad) return none;
      const sx = pad.leftStick?.x ?? 0;
      const sy = pad.leftStick?.y ?? 0;
      return { left: pad.left || sx < -0.4, right: pad.right || sx > 0.4, down: pad.down || sy > 0.6, jump: pad.A || pad.B };
    } catch {
      return none;
    }
  }

  addTouchButtons() {
    const make = (x, y, label, action) => {
      const circle = this.scene.add.circle(x, y, 95, 0xffffff, 0.35).setStrokeStyle(6, INK, 0.6);
      const text = this.scene.add
        .text(x, y, label, { fontFamily: FONT, fontSize: '80px', color: '#111111' })
        .setOrigin(0.5)
        .setAlpha(0.7);
      for (const o of [circle, text]) o.setScrollFactor(0).setDepth(DEPTH.hud);
      this.buttons.push({ x, y, r: 115, action, circle });
    };
    const y = GAME_H - 150;
    make(170, y, '◀', 'left');
    make(400, y, '▶', 'right');
    make(GAME_W - 400, y, '▼', 'down');
    make(GAME_W - 170, y, '▲', 'jump');
  }

  readTouch() {
    const state = { left: false, right: false, down: false, jump: false };
    if (!this.buttons.length) return state;
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r) state[b.action] = true;
      }
    }
    for (const b of this.buttons) b.circle.setFillStyle(0xffffff, state[b.action] ? 0.7 : 0.35);
    return state;
  }
}
