// ================================================================
//  LEVEL FILES
//
//  A level is a little JSON file like this:
//
//  {
//    "name": "Bamboo Meadow",
//    "author": "Square Panda",
//    "theme": "meadow",            <- see src/themes.js
//    "par": 60,                    <- finish faster than this many seconds for bonus points
//    "hint": "Jump with Space!",   <- shown when the level starts (optional)
//    "map": [
//      "...........................",
//      "..P......o.o.o..........G..",
//      "###########################"
//    ]
//  }
//
//  Each letter in "map" is one block. src/objects.js says what each letter means.
//  This file has the helpers that read, check and save levels. They are used by
//  the game AND by the level designer.
// ================================================================

import { BY_CHAR, DOOR_FOR_SHAPE, OBJECTS } from './objects.js';
import { THEMES, DEFAULT_THEME } from './themes.js';

export const MIN_WIDTH = 27; // at least one screen wide
export const MIN_HEIGHT = 15; // at least one screen tall
export const MAX_WIDTH = 500;
export const MAX_HEIGHT = 60;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Tidy up a level (from a file, the designer or a friend) so the game can trust it:
 * every row the same width, no unknown letters, sensible settings.
 */
export function normalizeLevel(raw) {
  const src = (typeof raw === 'string' ? JSON.parse(raw) : raw) ?? {};
  let map = Array.isArray(src.map) ? src.map.map((r) => String(r)) : [];
  map = map.slice(-MAX_HEIGHT); // keep the bottom rows if there are too many

  const width = clamp(Math.max(0, ...map.map((r) => r.length)), MIN_WIDTH, MAX_WIDTH);
  const height = clamp(map.length, MIN_HEIGHT, MAX_HEIGHT);

  const rows = [];
  for (let i = map.length; i < height; i++) rows.push('.'.repeat(width)); // pad with sky on top
  for (const row of map) {
    let clean = '';
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? '.';
      clean += BY_CHAR[ch] ? ch : '.';
    }
    rows.push(clean);
  }

  const level = {
    name: String(src.name || 'Untitled level').slice(0, 40),
    author: String(src.author || '').slice(0, 30),
    theme: THEMES[src.theme] ? src.theme : DEFAULT_THEME,
    par: clamp(Math.round(Number(src.par) || 90), 10, 999),
    hint: String(src.hint || '').slice(0, 160),
    map: rows,
  };
  if (typeof src.id === 'string') level.id = src.id;
  return level;
}

/** Look for mistakes. Errors stop the level being playable, warnings are just advice. */
export function validateLevel(level) {
  const errors = [];
  const warnings = [];
  const count = {};
  for (const row of level.map) for (const ch of row) count[ch] = (count[ch] ?? 0) + 1;

  for (const def of OBJECTS) {
    if (def.max && (count[def.char] ?? 0) > def.max) {
      errors.push(`Only ${def.max} ${def.name} allowed (found ${count[def.char]}).`);
    }
  }
  if (!count.P) errors.push('The level needs a Panda start (P).');
  if (!count.G) errors.push('The level needs a Goal flag (G).');

  for (const [shape, door] of Object.entries(DOOR_FOR_SHAPE)) {
    const key = door.toLowerCase();
    if (count[door] && !count[key]) warnings.push(`There is a ${shape} door but no ${shape} key.`);
    if (count[key] && !count[door]) warnings.push(`There is a ${shape} key but no ${shape} door.`);
  }

  const { start } = splitLevel(level);
  if (start && start.cy === level.map.length - 1) warnings.push('The panda starts on the very bottom row and will fall!');

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Split the map into the solid "tile" layer and a list of entities (things that move or get picked up).
 */
export function splitLevel(level) {
  const tiles = [];
  const entities = [];
  let start = null;
  let goal = null;
  level.map.forEach((row, cy) => {
    const tileRow = [];
    [...row].forEach((ch, cx) => {
      const def = BY_CHAR[ch];
      if (def?.entity) {
        const e = { char: ch, def, cx, cy, id: `${cx},${cy}` };
        entities.push(e);
        if (ch === 'P') start = e;
        if (ch === 'G') goal = e;
        tileRow.push(def.under ?? '.');
      } else {
        tileRow.push(ch);
      }
    });
    tiles.push(tileRow);
  });
  return { tiles, entities, start, goal, width: level.map[0].length, height: level.map.length };
}

/** Turn a level into nice readable JSON, one map row per line. */
export function levelToJSON(level) {
  const { name, author, theme, par, hint, map } = level;
  return JSON.stringify({ name, author, theme, par, hint, map }, null, 2) + '\n';
}

/** A fresh level with a strip of ground, a start and a goal. */
export function blankLevel(width = 60, height = MIN_HEIGHT) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push((y >= height - 2 ? '#' : '.').repeat(width));
  }
  const put = (x, y, ch) => {
    rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
  };
  put(3, height - 3, 'P');
  put(width - 4, height - 3, 'G');
  return normalizeLevel({ name: 'My new level', theme: DEFAULT_THEME, par: 90, map: rows });
}

/** "Shark Beach!" -> "shark-beach" */
export function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'level'
  );
}
