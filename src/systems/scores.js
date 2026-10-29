// ================================================================
//  HIGH SCORES
//  There is one table for the full adventure ("campaign") and one
//  for each single level. Each table keeps the top 10.
// ================================================================

import { load, save, KEYS } from './storage.js';

export const CAMPAIGN = 'campaign';
export const MAX_ENTRIES = 10;

export const levelBoard = (levelId) => `level:${levelId}`;

function allBoards() {
  return load(KEYS.scores, {});
}

export function getBoard(id) {
  return allBoards()[id] ?? [];
}

export function bestScore(id) {
  return getBoard(id)[0]?.score ?? 0;
}

/** Would this score make it onto the table? */
export function qualifies(id, score) {
  const board = getBoard(id);
  return score > 0 && (board.length < MAX_ENTRIES || score > board[board.length - 1].score);
}

/** Add a score. Returns its place on the table (0 = top), or -1 if it didn't make it. */
export function addScore(id, name, score, extra = {}) {
  const boards = allBoards();
  const entry = { name: name.slice(0, 10) || 'PANDA', score, date: new Date().toISOString().slice(0, 10), ...extra };
  const board = [...(boards[id] ?? []), entry].sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  boards[id] = board;
  save(KEYS.scores, boards);
  return board.indexOf(entry);
}

export function lastName() {
  return load(KEYS.name, '');
}

export function rememberName(name) {
  save(KEYS.name, name);
}
