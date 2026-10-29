// ================================================================
//  THE GAME'S LEVELS
//  Every .json file in this folder is a level. They are played in
//  order of their file names, so start the name with a number:
//    01-bamboo-meadow.json, 02-..., 07-my-cool-level.json
// ================================================================

import { normalizeLevel } from '../levelFormat.js';
import { getMyLevel } from '../systems/myLevels.js';

const FILES = import.meta.glob('./*.json', { eager: true, import: 'default' });

export const BUILT_IN_LEVELS = Object.keys(FILES)
  .sort()
  .map((path) => ({ ...normalizeLevel(FILES[path]), id: path.slice(2, -5), builtIn: true }));

/** Find a level by id: one of the game's levels, or one you made. */
export function findLevel(id) {
  return BUILT_IN_LEVELS.find((l) => l.id === id) ?? getMyLevel(id);
}
