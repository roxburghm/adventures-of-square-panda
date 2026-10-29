// ================================================================
//  HOW SQUARE PANDA LOOKS
//  The panda is a square body and two little feet. It squashes when it
//  lands, stretches when it jumps, waddles when it runs and goes flat
//  when it ducks. All of that is done here by bending one picture.
// ================================================================

import { TILE, PLAYER } from '../config.js';
import { DEPTH } from './depth.js';

const lerp = (a, b, t) => a + (b - a) * t;

export class PlayerView {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(DEPTH.player);
    this.feet = [scene.add.image(-12, 0, 'panda-foot').setOrigin(0.5, 1), scene.add.image(12, 0, 'panda-foot').setOrigin(0.5, 1)];
    this.boots = [scene.add.image(-12, 0, 'boots-foot').setOrigin(0.5, 1), scene.add.image(12, 0, 'boots-foot').setOrigin(0.5, 1)];
    this.body = scene.add.image(0, -6, 'panda').setOrigin(0.5, 1);
    this.container.add([...this.feet, ...this.boots, this.body]);
    this.squashX = 1;
    this.squashY = 1;
    this.walk = 0;
    this.frozen = false; // true while a death / victory animation plays
  }

  /** Move the picture to where the panda's box is. `alpha` blends between physics steps for smoothness. */
  sync(pb, alpha, dt, invulnerable, time) {
    if (this.frozen) return;
    const x = lerp(pb.prevX, pb.x, alpha) + pb.w / 2;
    const y = lerp(pb.prevY, pb.y, alpha) + pb.h;
    this.container.setPosition(x, y);

    const ease = Math.min(1, dt * 12);
    this.squashX += (1 - this.squashX) * ease;
    this.squashY += (1 - this.squashY) * ease;
    let sx = this.squashX;
    let sy = this.squashY;
    if (pb.ducking) {
      sx *= 1.12;
      sy *= (PLAYER.duckHeight - 4) / PLAYER.height;
    }
    const facing = pb.facing;
    this.body.setScale(sx * facing, sy);

    // Feet: step while running, tuck up while in the air.
    const speed = Math.abs(pb.vx) / TILE;
    let bob = 0;
    if (pb.onGround && speed > 0.3) {
      this.walk += dt * (3 + speed * 1.6);
      const a = Math.sin(this.walk * Math.PI);
      this.feet[0].y = -Math.max(0, a) * 7;
      this.feet[1].y = -Math.max(0, -a) * 7;
      this.feet[0].x = -12 + a * 5 * facing;
      this.feet[1].x = 12 - a * 5 * facing;
      bob = Math.abs(a) * 4;
    } else if (!pb.onGround) {
      this.feet[0].y = -3;
      this.feet[1].y = -3;
      this.feet[0].x = -13;
      this.feet[1].x = 13;
    } else {
      this.feet[0].y = 0;
      this.feet[1].y = 0;
      this.feet[0].x = -12;
      this.feet[1].x = 12;
    }
    this.body.y = -6 - bob;
    // Lean into the run, and wobble when sliding on ice.
    const sliding = pb.onGround && pb.surface === 'I' && !pb.hasBoots && speed > 1;
    this.body.rotation = (pb.vx / (PLAYER.runSpeed * TILE)) * 0.08 + (sliding ? Math.sin(time / 60) * 0.05 : 0);

    for (let i = 0; i < 2; i++) {
      this.boots[i].setPosition(this.feet[i].x, this.feet[i].y + 2).setVisible(pb.hasBoots).setFlipX(facing < 0);
      this.feet[i].setVisible(!pb.hasBoots);
    }

    // Flash while invulnerable after getting hurt.
    this.container.alpha = invulnerable > 0 && Math.floor(time / 70) % 2 ? 0.35 : 1;
  }

  squash(amount = 1) {
    this.squashX = 1 + 0.25 * amount;
    this.squashY = 1 - 0.3 * amount;
  }

  stretch() {
    this.squashX = 0.82;
    this.squashY = 1.2;
  }

  ouch() {
    this.body.setTexture('panda-ouch');
    this.scene.time.delayedCall(450, () => this.body.active && this.body.setTexture('panda'));
  }

  /** Lose-a-life animation. */
  die(reason) {
    this.frozen = true;
    this.container.alpha = 1;
    this.body.setTexture('panda-ouch');
    const c = this.container;
    if (reason === 'water' || reason === 'sand') {
      this.scene.tweens.add({ targets: c, y: c.y + TILE * 1.5, duration: reason === 'sand' ? 1200 : 600, ease: 'Quad.easeIn' });
    } else {
      // The classic: hop up, then fall off the screen spinning.
      this.scene.tweens.add({ targets: c, y: c.y - TILE * 1.6, duration: 380, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: c, y: c.y + TILE * 12, delay: 380, duration: 900, ease: 'Quad.easeIn' });
      this.scene.tweens.add({ targets: c, angle: 360 * 1.5, duration: 1280 });
    }
  }

  /** Happy jump when finishing a level. */
  cheer() {
    this.frozen = true;
    this.container.alpha = 1;
    const c = this.container;
    this.scene.tweens.add({ targets: c, y: c.y - TILE * 1.2, duration: 280, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.body, angle: 360, duration: 560, delay: 0 });
  }

  destroy() {
    this.container.destroy();
  }
}
