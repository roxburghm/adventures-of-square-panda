// Checks every level in src/levels/: is it a proper level, and can it be finished?
// Run with:  npm test

import { describe, it, expect } from 'vitest';
import { BUILT_IN_LEVELS } from '../src/levels/index.js';
import { validateLevel, normalizeLevel, levelToJSON, blankLevel } from '../src/levelFormat.js';
import { checkLevel } from '../src/game/solver.js';

describe('the level file format', () => {
  it('tidies up messy levels', () => {
    const level = normalizeLevel({ map: ['P', '#?#', 'G'] });
    expect(level.map).toHaveLength(15);
    expect(new Set(level.map.map((r) => r.length))).toEqual(new Set([27]));
    expect(level.map[13].slice(0, 3)).toBe('#.#'); // the unknown "?" became sky
  });

  it('survives a save and load', () => {
    const level = blankLevel(40);
    expect(normalizeLevel(levelToJSON(level))).toEqual(level);
  });

  it('spots a missing start or goal', () => {
    const { errors } = validateLevel(normalizeLevel({ map: ['#'] }));
    expect(errors.length).toBe(2);
  });
});

describe('the level-checking robot', () => {
  // "ok: true" means the robot really finished. For impossible levels it searches until
  // it gives up, so we keep those searches short.
  const quick = { limit: 15000 };
  const make = (floor, row12 = '..P.......................G..') => {
    const map = Array.from({ length: 12 }, () => '');
    map.push(row12, floor, floor);
    return normalizeLevel({ map });
  };

  it('can jump a 3 block gap', () => {
    expect(checkLevel(make('##########...################')).ok).toBe(true);
  });

  it('knows a 6 block gap is too far', () => {
    expect(checkLevel(make('##########......#############'), quick).ok).toBe(false);
  });

  it('knows a locked door needs its key', () => {
    const map = Array.from({ length: 11 }, () => '...............#');
    map.push('...............S', '..P............S...G', '#'.repeat(30), '#'.repeat(30));
    expect(checkLevel(normalizeLevel({ map }), quick).ok).toBe(false);
    map[12] = '..P....s.......S...G';
    expect(checkLevel(normalizeLevel({ map })).ok).toBe(true);
  });

  it('needs ice boots to cross a big shark lake', () => {
    const lake = '########~~~~~~~~~~###########';
    expect(checkLevel(make(lake), quick).ok).toBe(false);
    expect(checkLevel(make(lake, '..P.b.....................G..')).ok).toBe(true);
  });
});

describe('the levels in src/levels', () => {
  it('has some levels', () => {
    expect(BUILT_IN_LEVELS.length).toBeGreaterThan(0);
  });

  for (const level of BUILT_IN_LEVELS) {
    describe(level.name, () => {
      it('has no mistakes', () => {
        const { errors, warnings } = validateLevel(level);
        expect(errors).toEqual([]);
        expect(warnings).toEqual([]);
      });

      it('can be finished', () => {
        const result = checkLevel(level);
        expect(result.reason ?? 'ok').toBe('ok');
        expect(result.ok).toBe(true);
      }, 60000);
    });
  }
});
