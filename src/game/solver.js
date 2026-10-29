// ================================================================
//  CAN THIS LEVEL BE FINISHED?
//
//  A little robot plays the level using the real panda movement code
//  (player.js). It tries running, jumping and ducking in every
//  direction and searches for a way to reach the goal flag, picking up
//  keys and ice boots and opening doors on the way.
//
//  It is careful: it never touches fire, water or quicksand, and it
//  ignores enemies and anvils (you can always dodge or stomp those).
//  So if it says "yes", a careful player can do it too.
// ================================================================

import { TILE } from '../config.js';
import { splitLevel } from '../levelFormat.js';
import { tileProps, DOOR_FOR_SHAPE } from '../objects.js';
import { Grid, overlaps } from './physics.js';
import { PlayerBody } from './player.js';

const T = TILE;
const SHAPES = ['square', 'circle', 'triangle'];
const BOOTS = 8; // bit for "has ice boots" (keys use bits 1, 2 and 4)
const HOLD = 8; // each choice is held for 8 steps (about 1/8 of a second)
const RUN_SPEED = 7 * T;

// Every choice the robot can make: [direction, jump, down]
const CHOICES = [];
for (const dir of [-1, 0, 1]) for (const jump of [false, true]) CHOICES.push([dir, jump, false]);
for (const dir of [-1, 0, 1]) CHOICES.push([dir, false, true]);
CHOICES.push([0, true, true]); // drop through a bamboo bridge

/** A small "smallest first" queue, so the robot always tries the most promising idea next. */
class Queue {
  constructor() {
    this.items = [];
  }

  push(priority, value) {
    const a = this.items;
    a.push([priority, value]);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }

  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top[1];
  }

  get size() {
    return this.items.length;
  }
}

function clone(body) {
  return Object.assign(Object.create(PlayerBody.prototype), body);
}

/**
 * Try to finish a level. Returns { ok, reason, explored }.
 * `limit` stops the search if it takes too long (then ok is false and reason says so).
 */
export function checkLevel(level, { limit = 250000 } = {}) {
  const { tiles, entities, start, goal } = splitLevel(level);
  if (!start || !goal) return { ok: false, reason: 'The level needs a start and a goal.', explored: 0 };

  const doorShapes = new Set();
  for (const row of tiles) for (const ch of row) if (tileProps(ch).door) doorShapes.add(tileProps(ch).door);
  const pickups = entities
    .filter((e) => e.def.entity === 'boots' || (e.def.entity === 'key' && doorShapes.has(e.def.shape)))
    .map((e) => ({
      bit: e.def.entity === 'boots' ? BOOTS : 1 << SHAPES.indexOf(e.def.shape),
      box: { x: e.cx * T + 14, y: e.cy * T + 11, w: 44, h: 50 },
    }));
  const goalBox = { x: goal.cx * T + 14, y: (goal.cy + 1) * T - 104, w: 40, h: 104 };

  // One copy of the map for each set of keys/boots: doors you have the key for are open,
  // and with boots the top of every shark pool counts as ice.
  const grids = new Map();
  const gridFor = (mask) => {
    if (!grids.has(mask)) {
      const g = new Grid(tiles);
      for (let cy = 0; cy < g.h; cy++) {
        for (let cx = 0; cx < g.w; cx++) {
          const p = tileProps(g.get(cx, cy));
          if (p.door && mask & (1 << SHAPES.indexOf(p.door))) g.set(cx, cy, '.');
          if (p.water && mask & BOOTS && !tileProps(g.get(cx, cy - 1)).water) g.set(cx, cy, 'I');
        }
      }
      grids.set(mask, g);
    }
    return grids.get(mask);
  };

  const keyOf = (b, mask) =>
    `${Math.round(b.x / 12)},${Math.round(b.y / 12)},${Math.round(b.vx / 100)},${Math.round(b.vy / 150)},${b.onGround ? 1 : 0},${b.ducking ? 1 : 0},${mask}`;
  // Guess how long is left: head for the nearest key or boots we still need, otherwise the goal.
  const guess = (b, mask) => {
    const targets = pickups.filter((p) => !(mask & p.bit)).map((p) => p.box);
    let best = Infinity;
    for (const t of targets.length ? targets : [goalBox]) {
      best = Math.min(best, Math.hypot(t.x - b.x, (t.y - b.y) * 1.5));
    }
    return best / RUN_SPEED + (targets.length ? 1000 * targets.length : 0);
  };

  const first = new PlayerBody((start.cx + 0.5) * T, (start.cy + 1) * T);
  for (let i = 0; i < 10; i++) first.step(1 / 60, {}, gridFor(0)); // land on the ground
  const queue = new Queue();
  const seen = new Set([keyOf(first, 0)]);
  queue.push(guess(first, 0), { body: first, mask: 0, time: 0 });

  let explored = 0;
  while (queue.size) {
    const node = queue.pop();
    if (++explored > limit) return { ok: false, reason: 'Gave up: it took too long to search.', explored };
    for (const [dir, jump, down] of CHOICES) {
      let body = clone(node.body);
      let mask = node.mask;
      let dead = false;
      for (let i = 0; i < HOLD && !dead; i++) {
        body.hasBoots = !!(mask & BOOTS);
        const input = { left: dir < 0, right: dir > 0, down, jump, jumpPressed: jump && i === 0 };
        for (const ev of body.step(1 / 60, input, gridFor(mask))) {
          if (['water', 'fire', 'sand', 'pit'].includes(ev)) dead = true;
        }
        for (const p of pickups) if (!(mask & p.bit) && overlaps(body, p.box)) mask |= p.bit;
        if (overlaps(body, goalBox)) return { ok: true, explored, seconds: node.time + (i + 1) / 60 };
      }
      if (dead) continue;
      const key = keyOf(body, mask);
      if (seen.has(key)) continue;
      seen.add(key);
      const time = node.time + HOLD / 60;
      queue.push(time + guess(body, mask) * 3, { body, mask, time });
    }
  }
  return { ok: false, reason: "The robot couldn't find a way to the goal.", explored };
}
