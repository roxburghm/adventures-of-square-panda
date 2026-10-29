// What gets drawn in front of what. Bigger numbers are nearer the front.
export const DEPTH = {
  sky: -100,
  clouds: -90,
  farHills: -80,
  nearHills: -70,
  tiles: 0,
  tileTop: 1,
  outline: 2,
  items: 5,
  enemies: 6,
  player: 10,
  liquid: 12, // water and quicksand are in front, so you sink INTO them
  leaping: 13, // a shark jumping out of the water
  fx: 20,
  hud: 1000,
  overlay: 2000,
};
