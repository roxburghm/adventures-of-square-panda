// ================================================================
//  LITTLE EFFECTS: puffs of dust, sparkles, splashes, floating points.
// ================================================================

import { DEPTH } from './depth.js';
import { FONT, INK } from '../config.js';

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/** Round blobs flying out from a spot. */
export function puff(scene, x, y, { color = 0xffffff, count = 8, size = 10, spread = 60, up = 0, duration = 450 } = {}) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const dist = spread * rand(0.5, 1);
    const blob = scene.add.circle(x, y, size * rand(0.6, 1.2), color).setStrokeStyle(3, INK).setDepth(DEPTH.fx);
    scene.tweens.add({
      targets: blob,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist * 0.6 - up,
      scale: 0.2,
      alpha: 0,
      duration: duration * rand(0.8, 1.3),
      ease: 'Quad.easeOut',
      onComplete: () => blob.destroy(),
    });
  }
}

export function dust(scene, x, y, amount = 1) {
  puff(scene, x, y, { color: 0xf2efe6, count: Math.round(4 + amount * 4), size: 7 + amount * 3, spread: 30 + amount * 30, up: 10 });
}

export function sparkle(scene, x, y, color = 0xffe14d) {
  for (let i = 0; i < 7; i++) {
    const star = scene.add.star(x, y, 4, 4, 12, color).setStrokeStyle(2, INK).setDepth(DEPTH.fx);
    const angle = (i / 7) * Math.PI * 2;
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * 55,
      y: y + Math.sin(angle) * 55,
      angle: 180,
      alpha: 0,
      scale: 0.4,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

export function splash(scene, x, y, color = 0x38a8f0) {
  for (let i = 0; i < 12; i++) {
    const drop = scene.add.circle(x + rand(-20, 20), y, rand(5, 10), color).setStrokeStyle(3, INK).setDepth(DEPTH.fx);
    const vx = rand(-220, 220);
    const vy = rand(-700, -350);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 700,
      onUpdate: (tw) => {
        const t = tw.getValue() * 0.7;
        drop.x += vx * 0.016;
        drop.y = y + vy * t + 1400 * t * t;
        drop.alpha = 1 - tw.getValue();
      },
      onComplete: () => drop.destroy(),
    });
  }
}

/** "+100" floating up from a spot. */
export function floatText(scene, x, y, str, color = '#111111') {
  const t = scene.add
    .text(x, y, str, { fontFamily: FONT, fontSize: '34px', color, stroke: '#ffffff', strokeThickness: 6, padding: { x: 6, y: 10 } })
    .setOrigin(0.5)
    .setDepth(DEPTH.fx);
  scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
}

/** A picture that pops bigger and fades away (used when you collect things). */
export function pop(scene, key, x, y) {
  const img = scene.add.image(x, y, key).setDepth(DEPTH.fx);
  scene.tweens.add({ targets: img, y: y - 40, scale: 1.6, alpha: 0, duration: 350, ease: 'Back.easeOut', onComplete: () => img.destroy() });
}
