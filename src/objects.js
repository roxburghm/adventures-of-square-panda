// ================================================================
//  EVERYTHING THAT CAN GO IN A LEVEL
//
//  Levels are drawn with letters and symbols (see src/levels/*.json).
//  This list says what each symbol means. The level designer builds
//  its palette from this list too, so a new entry here shows up there.
//
//  char    the symbol used in level files
//  tile    blocks that are part of the map (ground, water, fire...)
//  entity  things that move or can be picked up (monkeys, keys...)
//  under   the tile left underneath an entity (usually empty air)
//  icon    the picture (a file in src/art/svg without ".svg")
//  anchor  where the picture sits in its square: bottom, center or top
//  max     how many you may place (e.g. only one start)
// ================================================================

export const OBJECTS = [
  // ---------- Terrain ----------
  { char: '.', id: 'empty', name: 'Empty', group: 'Terrain', icon: null,
    help: 'Air. Paint with this to rub things out.' },
  { char: '#', id: 'ground', name: 'Ground', group: 'Terrain', icon: 'ground', tile: { solid: true },
    help: 'Solid ground. Grass grows on top all by itself.' },
  { char: '=', id: 'bridge', name: 'Bamboo bridge', group: 'Terrain', icon: 'platform', tile: { oneWay: true },
    help: 'Jump up through it and land on top. Duck + jump to drop through.' },
  { char: 'I', id: 'ice', name: 'Ice', group: 'Terrain', icon: 'ice', tile: { solid: true, slippery: true },
    help: 'Slippery! Ice boots stop the sliding.' },

  // ---------- Hazards ----------
  { char: '~', id: 'water', name: 'Shark water', group: 'Hazards', icon: 'water-1', tile: { water: true },
    help: 'Falling in is the end of a life. With ice boots it freezes under you.' },
  { char: 'Q', id: 'quicksand', name: 'Quicksand', group: 'Hazards', icon: 'quicksand-1', tile: { quicksand: true },
    help: 'Slows the panda and pulls it under. Keep jumping to get out.' },
  { char: 'F', id: 'fire', name: 'Fire', group: 'Hazards', icon: 'fire-1', tile: { fire: true },
    help: 'Ouch! Costs a heart.' },
  { char: 'A', id: 'anvil', name: 'Falling anvil', group: 'Hazards', icon: 'anvil', entity: 'anvil', anchor: 'top',
    help: 'Hangs from the ceiling and drops when the panda walks underneath. Squashes enemies too!' },
  { char: 'w', id: 'water-shark', name: 'Shark (in water)', group: 'Hazards', icon: 'shark-fin', entity: 'waterShark',
    under: '~', anchor: 'top',
    help: 'Swims in shark water and leaps out at you. Put it on a water square.' },

  // ---------- Enemies ----------
  { char: 'M', id: 'monkey', name: 'Circle Monkey', group: 'Enemies', icon: 'monkey', entity: 'monkey', anchor: 'bottom',
    help: 'Rolls about and chases you when it spots you. Jump on its head!' },
  { char: 'B', id: 'banana-monkey', name: 'Banana Monkey', group: 'Enemies', icon: 'monkey-banana', entity: 'thrower',
    anchor: 'bottom', help: 'Throws bananas at head height. Duck or jump!' },
  { char: '^', id: 'triangle-shark', name: 'Triangle Shark', group: 'Enemies', icon: 'shark', entity: 'landShark',
    anchor: 'bottom', help: 'Too pointy to jump on. Avoid it, or drop an anvil on it.' },

  // ---------- Puzzle ----------
  { char: 's', id: 'key-square', name: 'Square key', group: 'Puzzle', icon: 'key-square', entity: 'key', shape: 'square',
    anchor: 'center', help: 'Opens square doors.' },
  { char: 'S', id: 'door-square', name: 'Square door', group: 'Puzzle', icon: 'door-square',
    tile: { solid: true, door: 'square' }, help: 'Walk into it while holding the square key.' },
  { char: 'c', id: 'key-circle', name: 'Circle key', group: 'Puzzle', icon: 'key-circle', entity: 'key', shape: 'circle',
    anchor: 'center', help: 'Opens circle doors.' },
  { char: 'C', id: 'door-circle', name: 'Circle door', group: 'Puzzle', icon: 'door-circle',
    tile: { solid: true, door: 'circle' }, help: 'Walk into it while holding the circle key.' },
  { char: 't', id: 'key-triangle', name: 'Triangle key', group: 'Puzzle', icon: 'key-triangle', entity: 'key',
    shape: 'triangle', anchor: 'center', help: 'Opens triangle doors.' },
  { char: 'T', id: 'door-triangle', name: 'Triangle door', group: 'Puzzle', icon: 'door-triangle',
    tile: { solid: true, door: 'triangle' }, help: 'Walk into it while holding the triangle key.' },
  { char: 'b', id: 'ice-boots', name: 'Ice boots', group: 'Puzzle', icon: 'boots', entity: 'boots', anchor: 'center',
    help: 'Grip on ice, and freeze shark water into stepping stones.' },

  // ---------- Items ----------
  { char: 'o', id: 'bamboo', name: 'Bamboo', group: 'Items', icon: 'bamboo', entity: 'bamboo', anchor: 'center',
    help: 'Points! Collect them all for a bonus.' },
  { char: '+', id: 'heart', name: 'Heart', group: 'Items', icon: 'heart', entity: 'heart', anchor: 'center',
    help: 'Gives back one heart.' },

  // ---------- Level ----------
  { char: 'P', id: 'start', name: 'Panda start', group: 'Level', icon: 'panda', entity: 'start', anchor: 'bottom',
    max: 1, help: 'Where the panda begins. Every level needs one.' },
  { char: 'G', id: 'goal', name: 'Goal flag', group: 'Level', icon: 'goal', entity: 'goal', anchor: 'bottom', max: 1,
    help: 'Touch it to finish the level. Every level needs one.' },
  { char: '!', id: 'checkpoint', name: 'Checkpoint', group: 'Level', icon: 'flag-down', entity: 'checkpoint',
    anchor: 'bottom', help: 'If the panda loses a life it comes back here.' },
];

export const GROUPS = ['Terrain', 'Hazards', 'Enemies', 'Puzzle', 'Items', 'Level'];

export const BY_CHAR = Object.fromEntries(OBJECTS.map((o) => [o.char, o]));

const NO_TILE = {};

/** What kind of tile is this symbol? (empty object for air and entities) */
export function tileProps(ch) {
  return BY_CHAR[ch]?.tile ?? NO_TILE;
}

/** Which door symbol does a key shape open? */
export const DOOR_FOR_SHAPE = { square: 'S', circle: 'C', triangle: 'T' };
export const KEY_FOR_SHAPE = { square: 's', circle: 'c', triangle: 't' };
