// Tests for how the panda moves. Run them with:  npm test
// They build tiny levels out of letters and check the panda behaves.

import { describe, it, expect } from 'vitest';
import { TILE } from '../src/config.js';
import { Grid } from '../src/game/physics.js';
import { PlayerBody } from '../src/game/player.js';

const T = TILE;
const STEP = 1 / 60;

/** Make a level from rows of letters and put the panda's feet on top of tile (cx, cy). */
function setup(rows, cx, cy) {
  const grid = new Grid(rows);
  const body = new PlayerBody((cx + 0.5) * T, cy * T);
  return { grid, body };
}

function run(body, grid, input, seconds) {
  const events = [];
  let pressed = false;
  for (let t = 0; t < seconds; t += STEP) {
    const jumpPressed = !!input.jump && !pressed;
    pressed = !!input.jump;
    events.push(...body.step(STEP, { left: false, right: false, down: false, jump: false, ...input, jumpPressed }, grid));
  }
  return events;
}

const flat = (width = 60, extra = {}) => {
  const rows = Array.from({ length: 10 }, () => '.'.repeat(width));
  rows.push('#'.repeat(width));
  for (const [y, row] of Object.entries(extra)) rows[y] = row.padEnd(width, '.');
  return rows;
};

describe('Square Panda', () => {
  it('stands on the ground', () => {
    const { grid, body } = setup(flat(), 5, 10);
    run(body, grid, {}, 1);
    expect(body.onGround).toBe(true);
    expect(body.bottom).toBe(10 * T);
  });

  it('jumps a little over 3 tiles high', () => {
    const { grid, body } = setup(flat(), 5, 10);
    run(body, grid, {}, 0.2);
    let top = body.bottom;
    let pressed = false;
    for (let t = 0; t < 1.5; t += STEP) {
      body.step(STEP, { jump: true, jumpPressed: !pressed }, grid);
      pressed = true;
      top = Math.min(top, body.bottom);
    }
    const height = (10 * T - top) / T;
    expect(height).toBeGreaterThan(3.2); // enough to hop onto a wall 3 blocks high
    expect(height).toBeLessThan(3.8);
  });

  it('can clear a 4 tile gap with a run-up, but not a 6 tile one', () => {
    const reach = () => {
      const { grid, body } = setup(flat(), 2, 10);
      // run to full speed, jump at the edge of x = 20 tiles
      let pressed = false;
      let best = 0;
      for (let t = 0; t < 4; t += STEP) {
        const jump = body.centerX > 20 * T;
        body.step(STEP, { right: true, jump, jumpPressed: jump && !pressed }, grid);
        pressed = jump;
        if (jump && body.onGround && body.vy === 0 && t > 0.1 && body.centerX > 20.5 * T) {
          best = body.x;
          break;
        }
      }
      return (best - 20 * T) / T;
    };
    const distance = reach();
    expect(distance).toBeGreaterThan(4);
    expect(distance).toBeLessThan(6);
  });

  it('has to duck to get through a 1 tile high tunnel', () => {
    const rows = flat(30, { 8: '..........##########' }); // ceiling one tile above the floor
    const walk = setup(rows, 3, 10);
    run(walk.body, walk.grid, { right: true }, 2);
    expect(walk.body.x + walk.body.w).toBeLessThanOrEqual(10 * T + 0.5);

    const duck = setup(rows, 3, 10);
    run(duck.body, duck.grid, { right: true, down: true }, 5);
    expect(duck.body.x).toBeGreaterThan(13 * T); // crawling along inside the tunnel
  });

  it('slides on ice, but not with ice boots', () => {
    const icy = flat(80).map((r, y) => (y === 10 ? 'I'.repeat(80) : r));
    const slide = (boots) => {
      const { grid, body } = setup(icy, 5, 10);
      body.hasBoots = boots;
      run(body, grid, { right: true }, 1.5);
      const x = body.x;
      run(body, grid, {}, 3);
      return (body.x - x) / T;
    };
    expect(slide(false)).toBeGreaterThan(8);
    expect(slide(true)).toBeLessThan(2);
  });

  it('falls in shark water without boots, and freezes it with boots', () => {
    const rows = flat(30).map((r, y) => (y === 10 ? '######~~~~~~~~~~~~##########' : r));
    const wet = setup(rows, 3, 10);
    const events = run(wet.body, wet.grid, { right: true }, 3);
    expect(events).toContain('water');

    const dry = setup(rows, 3, 10);
    dry.body.hasBoots = true;
    const events2 = run(dry.body, dry.grid, { right: true }, 3);
    expect(events2).not.toContain('water');
    expect(dry.body.x).toBeGreaterThan(19 * T);
    expect(dry.grid.get(10, 10)).toBe('I');
  });

  it('sinks in deep quicksand but can hop out', () => {
    const rows = flat(30).map((r, y) => (y === 9 ? '..........QQQQQ' : y === 10 ? '##########QQQQQ###########' : r));
    rows.push('#'.repeat(30));
    const stuck = setup(rows, 12, 9);
    const events = run(stuck.body, stuck.grid, {}, 5);
    expect(events).toContain('sand');

    const hop = setup(rows, 12, 9);
    let pressed = false;
    const out = [];
    for (let t = 0; t < 5; t += STEP) {
      const jump = Math.floor(t * 6) % 2 === 0; // mash jump
      out.push(...hop.body.step(STEP, { right: true, jump, jumpPressed: jump && !pressed }, hop.grid));
      pressed = jump;
    }
    expect(out).not.toContain('sand');
    expect(hop.body.x).toBeGreaterThan(16 * T);
  });

  it('lands on bamboo bridges from below and can drop through', () => {
    const rows = flat(20, { 7: '....======' });
    const { grid, body } = setup(rows, 6, 10);
    run(body, grid, { jump: true }, 1.2);
    expect(body.onGround).toBe(true);
    expect(body.bottom).toBe(7 * T);
    run(body, grid, {}, 0.2);
    run(body, grid, { down: true }, 0.1);
    run(body, grid, { down: true, jump: true }, 1);
    expect(body.bottom).toBe(10 * T);
  });
});
