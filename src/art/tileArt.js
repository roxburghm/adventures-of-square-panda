// ================================================================
//  WHICH PICTURES MAKE UP A TILE
//
//  Some tiles look different depending on their neighbours: ground
//  gets grass on top when there's sky above it, water and quicksand
//  have a wavy top only at the surface. Both the game and the level
//  designer use these functions, so levels look the same in both.
//
//  `get(cx, cy)` is a function that returns the tile symbol at a spot.
// ================================================================

const TERRAIN = new Set(['#', 'I']);
const GRASS_GROWS_UNDER = new Set(['.', '=', 'F']);

const ANIM = {
  water: ['water-1', 'water-2'],
  sand: ['quicksand-1', 'quicksand-2'],
  deepSand: ['quicksand-deep-1', 'quicksand-deep-2'],
  fire: ['fire-1', 'fire-2', 'fire-3'],
};

const DOORS = { S: 'door-square', C: 'door-circle', T: 'door-triangle' };

/**
 * The pictures for the tile at (cx, cy), bottom layer first.
 * Each is { key, y } plus { frames, fps } if it's animated.
 */
export function tileLayers(get, cx, cy) {
  const ch = get(cx, cy);
  const above = get(cx, cy - 1);
  switch (ch) {
    case '#':
      return GRASS_GROWS_UNDER.has(above) ? [{ key: 'ground' }, { key: 'cap' }] : [{ key: 'ground' }];
    case 'I':
      return [{ key: 'ice' }];
    case '=':
      return [{ key: 'platform' }];
    case '~':
      return above === '~' ? [{ key: 'water-deep' }] : [{ key: 'water-1', frames: ANIM.water, fps: 2.5 }];
    case 'Q':
      return above === 'Q'
        ? [{ key: 'quicksand-deep-1', frames: ANIM.deepSand, fps: 1.2 }]
        : [{ key: 'quicksand-1', frames: ANIM.sand, fps: 1.5 }];
    case 'F':
      return [{ key: 'fire-1', frames: ANIM.fire, fps: 8 }];
    default:
      return DOORS[ch] ? [{ key: DOORS[ch] }] : [];
  }
}

/** Ink lines around the edges of ground and ice: a list of [x1, y1, x2, y2] relative to the tile. */
export function outlineEdges(get, cx, cy, size) {
  const ch = get(cx, cy);
  if (!TERRAIN.has(ch)) return [];
  const edges = [];
  if (get(cx, cy - 1) !== ch) edges.push([0, 0, size, 0]);
  if (get(cx, cy + 1) !== ch) edges.push([0, size, size, size]);
  if (get(cx - 1, cy) !== ch) edges.push([0, 0, 0, size]);
  if (get(cx + 1, cy) !== ch) edges.push([size, 0, size, size]);
  return edges;
}
