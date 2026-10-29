// ================================================================
//  PHYSICS: moving boxes around a grid of tiles without going through walls.
//
//  Everything that moves (the panda, monkeys, anvils) is a box with
//  x, y (top-left corner, in pixels), w and h. We move a box sideways
//  first, push it out of any wall it hit, then move it up/down and push
//  it out of any floor or ceiling. That's the whole trick!
//
//  No Phaser in this file, so it can be tested on its own (see tests/).
// ================================================================

import { TILE } from '../config.js';
import { tileProps } from '../objects.js';

const EPS = 0.01;

/** The level's tiles, as a grid of symbols. */
export class Grid {
  constructor(rows) {
    this.cells = rows.map((r) => [...r]);
    this.h = this.cells.length;
    this.w = this.cells[0].length;
  }

  /** The symbol at a tile. Outside the level: walls left and right, sky above, nothing below. */
  get(cx, cy) {
    if (cx < 0 || cx >= this.w) return '#';
    if (cy < 0 || cy >= this.h) return '.';
    return this.cells[cy][cx];
  }

  set(cx, cy, ch) {
    if (cx >= 0 && cx < this.w && cy >= 0 && cy < this.h) this.cells[cy][cx] = ch;
  }

  props(cx, cy) {
    return tileProps(this.get(cx, cy));
  }

  get pixelWidth() {
    return this.w * TILE;
  }

  get pixelHeight() {
    return this.h * TILE;
  }
}

export const toCell = (px) => Math.floor(px / TILE);

/**
 * Move a box by (dx, dy) and stop it at walls, floors and ceilings.
 * Returns which sides bumped into something, and the tile it bumped.
 * opts.dropThrough lets the box fall through bamboo bridges.
 */
export function moveBody(box, grid, dx, dy, opts = {}) {
  const hit = { left: null, right: null, up: null, down: null };
  // Big moves are split into small steps so fast things can't skip through thin walls.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (TILE * 0.4)));
  for (let i = 0; i < steps; i++) {
    stepX(box, grid, dx / steps, hit);
    stepY(box, grid, dy / steps, hit, opts);
  }
  return hit;
}

function stepX(b, grid, dx, hit) {
  if (dx === 0) return;
  b.x += dx;
  const top = toCell(b.y);
  const bottom = toCell(b.y + b.h - EPS);
  const cx = dx > 0 ? toCell(b.x + b.w - EPS) : toCell(b.x);
  for (let cy = top; cy <= bottom; cy++) {
    if (grid.props(cx, cy).solid) {
      if (dx > 0) {
        b.x = cx * TILE - b.w;
        hit.right = { cx, cy, ch: grid.get(cx, cy) };
      } else {
        b.x = (cx + 1) * TILE;
        hit.left = { cx, cy, ch: grid.get(cx, cy) };
      }
      return;
    }
  }
}

function stepY(b, grid, dy, hit, opts) {
  if (dy === 0) return;
  const oldBottom = b.y + b.h;
  b.y += dy;
  const left = toCell(b.x);
  const right = toCell(b.x + b.w - EPS);
  if (dy > 0) {
    const cy = toCell(b.y + b.h - EPS);
    const top = cy * TILE;
    for (let cx = left; cx <= right; cx++) {
      const p = grid.props(cx, cy);
      const landsOnBridge = p.oneWay && !opts.dropThrough && oldBottom <= top + 0.5;
      if (p.solid || landsOnBridge) {
        b.y = top - b.h;
        hit.down = { cx, cy, ch: grid.get(cx, cy) };
        return;
      }
    }
  } else {
    const cy = toCell(b.y);
    for (let cx = left; cx <= right; cx++) {
      if (grid.props(cx, cy).solid) {
        b.y = (cy + 1) * TILE;
        hit.up = { cx, cy, ch: grid.get(cx, cy) };
        return;
      }
    }
  }
}

/** Is there room for a box here (no solid tiles in the way)? */
export function roomFor(grid, x, y, w, h) {
  for (let cy = toCell(y); cy <= toCell(y + h - EPS); cy++) {
    for (let cx = toCell(x); cx <= toCell(x + w - EPS); cx++) {
      if (grid.props(cx, cy).solid) return false;
    }
  }
  return true;
}

/** Call fn(symbol, cx, cy) for every tile a box touches. */
export function forTilesIn(grid, x, y, w, h, fn) {
  for (let cy = toCell(y); cy <= toCell(y + h - EPS); cy++) {
    for (let cx = toCell(x); cx <= toCell(x + w - EPS); cx++) {
      fn(grid.get(cx, cy), cx, cy);
    }
  }
}

/** Do two boxes overlap? */
export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Move a number towards a target by at most `step`. */
export function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  return Math.max(value - step, target);
}

/** Something you can stand on? */
export function isFloor(ch) {
  const p = tileProps(ch);
  return !!(p.solid || p.oneWay);
}
