// ================================================================
//  YOUR OWN LEVELS
//  Levels made in the level designer are saved in the browser.
//  To make one part of the real game, use "Download" in the designer
//  and put the file in src/levels/ (see docs/MAKING-LEVELS.md).
// ================================================================

import { load, save, KEYS } from './storage.js';
import { normalizeLevel, slugify } from '../levelFormat.js';

function all() {
  return load(KEYS.myLevels, {});
}

export function listMyLevels() {
  return Object.values(all())
    .map((l) => ({ ...normalizeLevel(l), id: l.id, updated: l.updated ?? 0 }))
    .sort((a, b) => b.updated - a.updated);
}

export function getMyLevel(id) {
  const raw = all()[id];
  return raw ? { ...normalizeLevel(raw), id } : null;
}

/** Save a level. Gives it an id if it doesn't have one yet. Returns the id. */
export function saveMyLevel(level) {
  const levels = all();
  const id = level.id && levels[level.id] ? level.id : `my-${slugify(level.name)}-${Date.now().toString(36)}`;
  levels[id] = { ...normalizeLevel(level), id, updated: Date.now() };
  save(KEYS.myLevels, levels);
  return id;
}

export function deleteMyLevel(id) {
  const levels = all();
  delete levels[id];
  save(KEYS.myLevels, levels);
}

/** The level that's open in the designer right now (used by "Test play"). */
export function saveDraft(level) {
  save(KEYS.draft, level);
}

export function loadDraft() {
  const raw = load(KEYS.draft, null);
  return raw ? { ...normalizeLevel(raw), id: raw.id } : null;
}
