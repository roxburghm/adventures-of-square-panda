// ================================================================
//  THE LEVEL DESIGNER
//
//  Pick something from the palette on the left and paint it onto the
//  map. Right-click rubs out. "Test play" tries the level in the game.
//
//  The level is kept as a grid of symbols (the same letters as the
//  level files). It's drawn with the game's own pictures, using the
//  same rules as the game (src/art/tileArt.js), so what you see here is
//  what you get in the game.
// ================================================================

import '@fontsource/gloria-hallelujah';
import './editor.css';
import { TILE } from '../config.js';
import { OBJECTS, GROUPS, BY_CHAR } from '../objects.js';
import { THEMES } from '../themes.js';
import { loadAllArt, artKey } from '../art/index.js';
import { tileLayers, outlineEdges } from '../art/tileArt.js';
import { normalizeLevel, validateLevel, levelToJSON, blankLevel, slugify, MIN_WIDTH, MIN_HEIGHT, MAX_WIDTH, MAX_HEIGHT } from '../levelFormat.js';
import { BUILT_IN_LEVELS } from '../levels/index.js';
import { listMyLevels, saveMyLevel, deleteMyLevel, getMyLevel, saveDraft, loadDraft } from '../systems/myLevels.js';
import { checkLevel } from '../game/solver.js';
import { isPhone } from '../systems/device.js';

const $ = (sel) => document.querySelector(sel);
const ZOOMS = [0.25, 0.35, 0.5, 0.65, 0.8, 1];
const UNDO_LIMIT = 200;
const SCREEN_W = 1920 / TILE; // how many tiles fit on one screen of the game

const ed = {
  meta: null, // { id, name, author, theme, par, hint }
  cells: [], // cells[y][x] = symbol
  brush: '#',
  tool: 'draw',
  zoom: 0.5,
  grid: true,
  undo: [],
  redo: [],
  hover: null, // { cx, cy }
  drag: null, // what the mouse is doing right now
  art: null, // name -> canvas
  savedJSON: '', // what the level looked like when it was last saved
};

const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const viewport = $('#viewport');

// ---------------------------------------------------------------
//  The level
// ---------------------------------------------------------------

const width = () => ed.cells[0].length;
const height = () => ed.cells.length;

function currentLevel() {
  return { ...ed.meta, map: ed.cells.map((row) => row.join('')) };
}

function openLevel(level, { asCopy = false } = {}) {
  const clean = normalizeLevel(level);
  ed.meta = {
    id: asCopy ? undefined : level.id,
    name: asCopy ? `${clean.name} (my copy)` : clean.name,
    author: clean.author,
    theme: clean.theme,
    par: clean.par,
    hint: clean.hint,
  };
  ed.cells = clean.map.map((row) => [...row]);
  ed.undo = [];
  ed.redo = [];
  ed.savedJSON = asCopy || !level.id ? '' : levelToJSON(currentLevel());
  fillMetaInputs();
  resizeSizer();
  changed(false);
  viewport.scrollTo({ left: 0, top: viewport.scrollHeight });
}

/** Something changed: redraw, re-check, and keep a draft so nothing is lost. */
function changed(record = true) {
  if (record) saveDraft(currentLevel());
  showProblems();
  showSavedState();
  requestDraw();
}

function snapshotForUndo() {
  ed.undo.push(ed.cells.map((row) => row.join('')));
  if (ed.undo.length > UNDO_LIMIT) ed.undo.shift();
  ed.redo = [];
}

function restore(rows) {
  ed.cells = rows.map((r) => [...r]);
  resizeSizer();
  changed();
}

function undo() {
  if (!ed.undo.length) return;
  ed.redo.push(ed.cells.map((row) => row.join('')));
  restore(ed.undo.pop());
}

function redo() {
  if (!ed.redo.length) return;
  ed.undo.push(ed.cells.map((row) => row.join('')));
  restore(ed.redo.pop());
}

function inside(cx, cy) {
  return cx >= 0 && cy >= 0 && cx < width() && cy < height();
}

/** Put a symbol in a square. Things you can only have one of (start, goal) move instead. */
function setCell(cx, cy, ch) {
  if (!inside(cx, cy) || ed.cells[cy][cx] === ch) return;
  if (BY_CHAR[ch]?.max === 1) {
    for (const row of ed.cells) for (let x = 0; x < row.length; x++) if (row[x] === ch) row[x] = '.';
  }
  ed.cells[cy][cx] = ch;
}

function fillRect(a, b, ch) {
  const [x0, x1] = [Math.min(a.cx, b.cx), Math.max(a.cx, b.cx)];
  const [y0, y1] = [Math.min(a.cy, b.cy), Math.max(a.cy, b.cy)];
  if (BY_CHAR[ch]?.max === 1) return setCell(b.cx, b.cy, ch);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setCell(x, y, ch);
}

function floodFill(cx, cy, ch) {
  const target = ed.cells[cy]?.[cx];
  if (target === undefined || target === ch || BY_CHAR[ch]?.max === 1) return;
  const todo = [[cx, cy]];
  while (todo.length) {
    const [x, y] = todo.pop();
    if (!inside(x, y) || ed.cells[y][x] !== target) continue;
    ed.cells[y][x] = ch;
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/** Change the size. Columns are added/removed on the right, rows at the top (so the ground stays put). */
function resizeLevel(w, h) {
  w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(w) || width()));
  h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(h) || height()));
  if (w === width() && h === height()) return;
  snapshotForUndo();
  let rows = ed.cells.map((row) => (row.length >= w ? row.slice(0, w) : [...row, ...'.'.repeat(w - row.length)]));
  if (h > rows.length) rows = [...Array.from({ length: h - rows.length }, () => [...'.'.repeat(w)]), ...rows];
  else rows = rows.slice(rows.length - h);
  ed.cells = rows;
  resizeSizer();
  changed();
  fillMetaInputs();
}

// ---------------------------------------------------------------
//  Drawing the map
// ---------------------------------------------------------------

let drawQueued = false;
function requestDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    draw();
  });
}

/** The tile symbol at a spot, with things like monkeys swapped for the tile underneath them. */
function tileAt(cx, cy) {
  if (cx < 0 || cx >= width()) return '#';
  if (cy < 0 || cy >= height()) return '.';
  const ch = ed.cells[cy][cx];
  const def = BY_CHAR[ch];
  return def?.entity ? (def.under ?? '.') : ch;
}

function picture(name) {
  return ed.art.get(artKey(name, ed.meta.theme)) ?? ed.art.get(name);
}

function resizeSizer() {
  const cell = TILE * ed.zoom;
  const sizer = $('#sizer');
  sizer.style.width = `${width() * cell}px`;
  sizer.style.height = `${height() * cell}px`;
  $('#zoomLabel').textContent = `${Math.round(ed.zoom * 100)}%`;
  sizeCanvas();
}

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  const cell = TILE * ed.zoom;
  const sizer = $('#sizer');
  sizer.style.width = `${Math.max(w, width() * cell)}px`;
  sizer.style.height = `${Math.max(h, height() * cell)}px`;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  requestDraw();
}

function draw() {
  if (!ed.art) return;
  const dpr = window.devicePixelRatio || 1;
  const z = ed.zoom;
  const cell = TILE * z;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const sx = viewport.scrollLeft;
  const sy = viewport.scrollTop;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vw, vh);
  ctx.translate(-sx, -sy);

  // Sky
  const theme = THEMES[ed.meta.theme];
  const sky = ctx.createLinearGradient(0, 0, 0, height() * cell);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width() * cell, height() * cell);

  const c0 = Math.max(0, Math.floor(sx / cell));
  const c1 = Math.min(width() - 1, Math.ceil((sx + vw) / cell));
  const r0 = Math.max(0, Math.floor(sy / cell));
  const r1 = Math.min(height() - 1, Math.ceil((sy + vh) / cell));

  // Tiles, then ink outlines, then things (monkeys, keys...) on top.
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      for (const layer of tileLayers(tileAt, cx, cy)) {
        const img = picture(layer.key);
        if (img) ctx.drawImage(img, cx * cell, cy * cell, img.width * z, img.height * z);
      }
    }
  }
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1.5, 5 * z);
  ctx.lineCap = 'square';
  ctx.beginPath();
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      for (const [x1, y1, x2, y2] of outlineEdges(tileAt, cx, cy, cell)) {
        ctx.moveTo(cx * cell + x1, cy * cell + y1);
        ctx.lineTo(cx * cell + x2, cy * cell + y2);
      }
    }
  }
  ctx.stroke();
  for (let cy = r0; cy <= Math.min(height() - 1, r1 + 2); cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      const def = BY_CHAR[ed.cells[cy][cx]];
      if (def?.entity) drawThing(def, cx * cell, cy * cell, cell);
    }
  }

  if (ed.grid) drawGrid(c0, c1, r0, r1, cell);

  // How much fits on one screen of the game, from the panda's start.
  const start = findChar('P');
  if (start) {
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(17,17,17,0.35)';
    const left = Math.max(0, Math.min(start.cx + 0.5 - SCREEN_W / 2 + 2, width() - SCREEN_W));
    ctx.strokeRect(left * cell, Math.max(0, height() - 15) * cell, SCREEN_W * cell, 15 * cell);
    ctx.setLineDash([]);
  }

  drawCursor(cell);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#111';
  ctx.strokeRect(0, 0, width() * cell, height() * cell);
}

function drawThing(def, x, y, cell) {
  const img = picture(def.icon);
  if (!img) return;
  const z = ed.zoom;
  const w = img.width * z;
  const h = img.height * z;
  const left = x + (cell - w) / 2;
  if (def.anchor === 'bottom') ctx.drawImage(img, left, y + cell - h, w, h);
  else if (def.anchor === 'top') ctx.drawImage(img, left, y + 4 * z, w, h);
  else ctx.drawImage(img, left, y + (cell - h) / 2, w, h);
}

function drawGrid(c0, c1, r0, r1, cell) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(17,17,17,0.12)';
  ctx.beginPath();
  for (let cx = c0; cx <= c1 + 1; cx++) {
    ctx.moveTo(cx * cell, r0 * cell);
    ctx.lineTo(cx * cell, (r1 + 1) * cell);
  }
  for (let cy = r0; cy <= r1 + 1; cy++) {
    ctx.moveTo(c0 * cell, cy * cell);
    ctx.lineTo((c1 + 1) * cell, cy * cell);
  }
  ctx.stroke();
}

function drawCursor(cell) {
  const h = ed.hover;
  if (!h || !inside(h.cx, h.cy)) return;
  let a = h;
  let b = h;
  if (ed.drag?.tool === 'rect') {
    a = ed.drag.start;
  }
  const x0 = Math.min(a.cx, b.cx);
  const y0 = Math.min(a.cy, b.cy);
  const w = Math.abs(a.cx - b.cx) + 1;
  const hgt = Math.abs(a.cy - b.cy) + 1;
  // A see-through preview of what you're about to paint.
  if (ed.tool !== 'pick' && ed.brush !== '.' && ed.tool !== 'erase' && !(ed.drag?.erasing)) {
    const def = BY_CHAR[ed.brush];
    ctx.globalAlpha = 0.5;
    if (def?.entity) drawThing(def, h.cx * cell, h.cy * cell, cell);
    else {
      for (const layer of tileLayers((x, y) => (x === h.cx && y === h.cy ? ed.brush : tileAt(x, y)), h.cx, h.cy)) {
        const img = picture(layer.key);
        if (img) ctx.drawImage(img, h.cx * cell, h.cy * cell, img.width * ed.zoom, img.height * ed.zoom);
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = ed.tool === 'erase' || ed.drag?.erasing ? '#e5484d' : '#0a8e8e';
  ctx.strokeRect(x0 * cell, y0 * cell, w * cell, hgt * cell);
}

function findChar(ch) {
  for (let cy = 0; cy < height(); cy++) {
    const cx = ed.cells[cy].indexOf(ch);
    if (cx >= 0) return { cx, cy };
  }
  return null;
}

// ---------------------------------------------------------------
//  Mouse and keyboard
// ---------------------------------------------------------------

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const cell = TILE * ed.zoom;
  return {
    cx: Math.floor((e.clientX - rect.left + viewport.scrollLeft) / cell),
    cy: Math.floor((e.clientY - rect.top + viewport.scrollTop) / cell),
  };
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  const at = cellFromEvent(e);
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    ed.drag = { tool: 'pan', x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  if (!inside(at.cx, at.cy)) return;
  const erasing = e.button === 2 || ed.tool === 'erase';
  const ch = erasing ? '.' : ed.brush;
  if (ed.tool === 'pick' && !erasing) {
    selectBrush(ed.cells[at.cy][at.cx]);
    selectTool('draw');
    return;
  }
  snapshotForUndo();
  canvas.setPointerCapture(e.pointerId);
  if (ed.tool === 'fill' && !erasing) {
    floodFill(at.cx, at.cy, ch);
    changed();
    return;
  }
  ed.drag = { tool: ed.tool === 'rect' ? 'rect' : 'draw', start: at, last: at, ch, erasing };
  if (ed.drag.tool === 'draw') {
    setCell(at.cx, at.cy, ch);
    changed();
  }
  requestDraw();
});

canvas.addEventListener('pointermove', (e) => {
  const at = cellFromEvent(e);
  const d = ed.drag;
  if (d?.tool === 'pan') {
    viewport.scrollLeft = d.left - (e.clientX - d.x);
    viewport.scrollTop = d.top - (e.clientY - d.y);
    return;
  }
  if (d?.tool === 'draw' && (at.cx !== d.last.cx || at.cy !== d.last.cy)) {
    // Fill in the squares between mouse moves so fast strokes don't leave gaps.
    const steps = Math.max(Math.abs(at.cx - d.last.cx), Math.abs(at.cy - d.last.cy));
    for (let i = 1; i <= steps; i++) {
      setCell(Math.round(d.last.cx + ((at.cx - d.last.cx) * i) / steps), Math.round(d.last.cy + ((at.cy - d.last.cy) * i) / steps), d.ch);
    }
    d.last = at;
    changed();
  }
  if (!ed.hover || at.cx !== ed.hover.cx || at.cy !== ed.hover.cy) {
    ed.hover = at;
    showWhere();
    requestDraw();
  }
});

function endDrag() {
  const d = ed.drag;
  if (d?.tool === 'rect' && ed.hover) {
    fillRect(d.start, ed.hover, d.ch);
    changed();
  }
  ed.drag = null;
  requestDraw();
}

// Listen on the whole window so letting go of the mouse anywhere finishes a stroke.
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => {
  if (!ed.drag) {
    ed.hover = null;
    showWhere();
    requestDraw();
  }
});

viewport.addEventListener('scroll', requestDraw);
window.addEventListener('resize', sizeCanvas);

// Ctrl + mouse wheel zooms.
viewport.addEventListener(
  'wheel',
  (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1 : -1);
  },
  { passive: false },
);

function zoomBy(step) {
  const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(ed.zoom) + step));
  if (ZOOMS[i] === ed.zoom) return;
  const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / ed.zoom;
  const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / ed.zoom;
  ed.zoom = ZOOMS[i];
  resizeSizer();
  viewport.scrollLeft = centerX * ed.zoom - viewport.clientWidth / 2;
  viewport.scrollTop = centerY * ed.zoom - viewport.clientHeight / 2;
}

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveLevel();
    return;
  }
  if (typing) return;
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if (mod && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    return;
  }
  if (mod) return;
  const tools = { d: 'draw', b: 'draw', r: 'rect', f: 'fill', e: 'erase', i: 'pick' };
  const k = e.key.toLowerCase();
  if (tools[k]) selectTool(tools[k]);
  else if (k === 'g') toggleGrid();
  else if (k === 't') testPlay();
  else if (k === '+' || k === '=') zoomBy(1);
  else if (k === '-') zoomBy(-1);
});

// ---------------------------------------------------------------
//  Palette, tools and the bars
// ---------------------------------------------------------------

function thumbnail(def) {
  const c = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  c.width = 44 * dpr;
  c.height = 44 * dpr;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const draws = [];
  if (def.tile) {
    for (const layer of tileLayers((x, y) => (x === 0 && y === 0 ? def.char : '.'), 0, 0)) draws.push(picture(layer.key));
  } else if (def.under) {
    for (const layer of tileLayers((x, y) => (x === 0 && y === 0 ? def.under : '.'), 0, 0)) draws.push(picture(layer.key));
  }
  for (const img of draws) if (img) g.drawImage(img, 0, 0, img.width * (44 / TILE), img.height * (44 / TILE));
  const icon = def.entity && picture(def.icon);
  if (icon) {
    const s = Math.min(40 / icon.width, 40 / icon.height);
    g.drawImage(icon, 22 - (icon.width * s) / 2, 22 - (icon.height * s) / 2, icon.width * s, icon.height * s);
  }
  if (def.char === '.') {
    g.strokeStyle = '#e5484d';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(8, 8);
    g.lineTo(36, 36);
    g.moveTo(36, 8);
    g.lineTo(8, 36);
    g.stroke();
  }
  return c;
}

function buildPalette() {
  const root = $('#palette');
  root.innerHTML = '';
  for (const group of GROUPS) {
    const heading = document.createElement('h4');
    heading.textContent = group;
    const items = document.createElement('div');
    items.className = 'items';
    for (const def of OBJECTS.filter((o) => o.group === group)) {
      const b = document.createElement('button');
      b.dataset.char = def.char;
      b.title = `${def.name} — ${def.help}`;
      const name = document.createElement('span');
      name.textContent = def.name;
      const kbd = document.createElement('kbd');
      kbd.textContent = def.char;
      b.append(thumbnail(def), name, kbd);
      b.addEventListener('click', () => {
        selectBrush(def.char);
        if (ed.tool === 'erase' || ed.tool === 'pick') selectTool('draw');
      });
      b.addEventListener('mouseenter', () => showInfo(def));
      items.append(b);
    }
    root.append(heading, items);
  }
}

function selectBrush(ch) {
  if (!BY_CHAR[ch]) return;
  ed.brush = ch;
  for (const b of document.querySelectorAll('#palette button')) b.classList.toggle('on', b.dataset.char === ch);
  showInfo(BY_CHAR[ch]);
}

function selectTool(tool) {
  ed.tool = tool;
  for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === tool);
  requestDraw();
}

function toggleGrid() {
  ed.grid = !ed.grid;
  $('#gridToggle').classList.toggle('on', ed.grid);
  requestDraw();
}

function showInfo(def) {
  $('#info').textContent = `${def.name} (${def.char}): ${def.help}`;
}

function showWhere() {
  const h = ed.hover;
  if (!h || !inside(h.cx, h.cy)) {
    $('#where').textContent = '';
    return;
  }
  $('#where').textContent = `x ${h.cx}, y ${h.cy}`;
  const def = BY_CHAR[ed.cells[h.cy][h.cx]];
  if (def && def.char !== '.') showInfo(def);
}

function showProblems() {
  const { errors, warnings } = validateLevel(currentLevel());
  const el = $('#problems');
  el.innerHTML = '';
  const add = (cls, msg) => {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = msg + ' ';
    el.append(s);
  };
  if (!errors.length && !warnings.length) add('ok', '✓ Ready to play');
  for (const m of errors) add('error', `✗ ${m}`);
  for (const m of warnings) add('warning', `⚠ ${m}`);
}

function showSavedState() {
  const saved = ed.savedJSON && ed.savedJSON === levelToJSON(currentLevel());
  $('#saved').textContent = saved ? 'Saved' : 'Not saved yet';
}

function fillMetaInputs() {
  $('#name').value = ed.meta.name;
  $('#author').value = ed.meta.author;
  $('#theme').value = ed.meta.theme;
  $('#par').value = ed.meta.par;
  $('#hint').value = ed.meta.hint;
  $('#width').value = width();
  $('#height').value = height();
}

function bindMetaInputs() {
  const themeSelect = $('#theme');
  for (const [id, t] of Object.entries(THEMES)) themeSelect.append(new Option(t.name, id));
  const bind = (id, key, fn = (v) => v) =>
    $(id).addEventListener('input', (e) => {
      ed.meta[key] = fn(e.target.value);
      changed();
      if (key === 'theme') {
        buildPalette(); // the ground pictures change colour with the theme
        selectBrush(ed.brush);
      }
    });
  bind('#name', 'name');
  bind('#author', 'author');
  bind('#theme', 'theme');
  bind('#par', 'par', (v) => Number(v) || 90);
  bind('#hint', 'hint');
}

// ---------------------------------------------------------------
//  Saving, opening, downloading, test play
// ---------------------------------------------------------------

function saveLevel() {
  ed.meta.id = saveMyLevel(currentLevel());
  ed.savedJSON = levelToJSON(currentLevel());
  changed();
  flash('Saved in this browser. Find it under "Choose a level" in the game.');
}

function flash(message, color = '#0a8e8e', seconds = 2.5) {
  const el = $('#info');
  el.textContent = message;
  el.style.color = color;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => (el.style.color = ''), seconds * 1000);
}

/** Ask the robot (src/game/solver.js) to play the level. */
function checkPossible() {
  const level = currentLevel();
  const { ok, errors } = validateLevel(level);
  if (!ok) {
    flash(`Fix this first: ${errors.join(' ')}`, '#e5484d', 5);
    return;
  }
  flash('🤖 The robot is trying your level…', '#111111', 30);
  setTimeout(() => {
    const result = checkLevel(level, { limit: 80000 });
    if (result.ok) {
      flash(`🤖 Yes! The robot got to the goal in about ${Math.max(1, Math.round(result.seconds))} seconds.`, '#0a8e8e', 8);
    } else {
      flash(
        "🤖 The robot couldn't find a way to the goal. The panda jumps about 3 blocks high and 4 across. (The robot never touches fire, water or quicksand.)",
        '#e5484d',
        12,
      );
    }
  }, 50); // give the page a moment to show the "trying" message
}

function downloadLevel() {
  const level = currentLevel();
  const blob = new Blob([levelToJSON(level)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${slugify(level.name)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('#helpDialog').showModal();
}

function testPlay() {
  const { ok, errors } = validateLevel(currentLevel());
  if (!ok) {
    alert(`Fix this first:\n\n${errors.join('\n')}`);
    return;
  }
  saveDraft(currentLevel());
  window.location.href = './index.html?test=1';
}

function confirmLoseChanges() {
  const unsaved = levelToJSON(currentLevel()) !== ed.savedJSON;
  return !unsaved || confirm('This level has changes that are not saved. Carry on anyway?');
}

function fillOpenDialog() {
  const mine = $('#myList');
  mine.innerHTML = '';
  const levels = listMyLevels();
  if (!levels.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing saved yet. Press Save to keep a level here.';
    mine.append(li);
  }
  for (const level of levels) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = `${level.name}${level.author ? ` by ${level.author}` : ''}`;
    const open = button('Open', () => {
      if (!confirmLoseChanges()) return;
      openLevel(getMyLevel(level.id));
      $('#openDialog').close();
    });
    const del = button('Delete', () => {
      if (!confirm(`Delete "${level.name}" for ever?`)) return;
      deleteMyLevel(level.id);
      fillOpenDialog();
    });
    li.append(name, open, del);
    mine.append(li);
  }
  const builtIn = $('#builtInList');
  builtIn.innerHTML = '';
  BUILT_IN_LEVELS.forEach((level, i) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = `${i + 1}. ${level.name}`;
    li.append(
      name,
      button('Open a copy', () => {
        if (!confirmLoseChanges()) return;
        openLevel(level, { asCopy: true });
        $('#openDialog').close();
      }),
    );
    builtIn.append(li);
  });
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function bindButtons() {
  for (const b of document.querySelectorAll('[data-tool]')) b.addEventListener('click', () => selectTool(b.dataset.tool));
  $('#undo').addEventListener('click', undo);
  $('#redo').addEventListener('click', redo);
  $('#zoomIn').addEventListener('click', () => zoomBy(1));
  $('#zoomOut').addEventListener('click', () => zoomBy(-1));
  $('#gridToggle').addEventListener('click', toggleGrid);
  $('#resize').addEventListener('click', () => resizeLevel(Number($('#width').value), Number($('#height').value)));
  $('#test').addEventListener('click', testPlay);
  $('#check').addEventListener('click', checkPossible);
  $('#save').addEventListener('click', saveLevel);
  $('#download').addEventListener('click', downloadLevel);
  $('#new').addEventListener('click', () => confirmLoseChanges() && openLevel(blankLevel()));
  $('#open').addEventListener('click', () => {
    fillOpenDialog();
    $('#openDialog').showModal();
  });
  $('#import').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !confirmLoseChanges()) return;
    try {
      openLevel(normalizeLevel(await file.text()), { asCopy: false });
      ed.meta.id = undefined;
      flash(`Loaded ${file.name}`);
    } catch {
      alert("That file doesn't look like a Square Panda level.");
    }
  });
}

// ---------------------------------------------------------------
//  Start up
// ---------------------------------------------------------------

/** The designer needs a bigger screen than a phone, so explain that instead of showing a squashed editor. */
function phoneNotice() {
  const note = document.createElement('div');
  note.className = 'phone-note';
  note.innerHTML = `
    <img src="./favicon.svg" alt="" width="110" height="120" />
    <h1 class="hand">The level designer needs a bigger screen</h1>
    <p>Try it on a computer or a tablet. On a phone you can still play every level!</p>
    <a class="hand" href="./index.html">▶ Play the game</a>`;
  document.body.append(note);
}

async function start() {
  if (isPhone()) {
    phoneNotice();
    return;
  }
  bindMetaInputs();
  bindButtons();
  ed.art = await loadAllArt();
  await document.fonts?.ready;
  const params = new URLSearchParams(window.location.search);
  const draft = loadDraft();
  if (params.has('new') || !draft) {
    openLevel(blankLevel());
  } else {
    openLevel(draft);
    // A draft might have unsaved changes; compare with the saved copy if there is one.
    const saved = draft.id ? getMyLevel(draft.id) : null;
    ed.savedJSON = saved ? levelToJSON({ ...saved }) : '';
    ed.meta.id = draft.id;
    showSavedState();
  }
  buildPalette();
  selectBrush('#');
  selectTool('draw');
  $('#gridToggle').classList.toggle('on', ed.grid);
  sizeCanvas();
}

start();
