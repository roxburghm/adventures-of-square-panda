// ================================================================
//  THE MOVING BACKGROUND
//  Layers further away scroll slower than near ones (parallax),
//  which makes the world look deep.
// ================================================================

import { GAME_W, GAME_H } from '../config.js';
import { makeSky, makeClouds, makeHills } from '../art/backgrounds.js';
import { getTheme } from '../themes.js';
import { DEPTH } from './depth.js';

function texture(scene, key, draw) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  return key;
}

export function createBackdrop(scene, themeId) {
  const theme = getTheme(themeId);
  const sky = texture(scene, `sky@${themeId}`, () => makeSky(theme));
  const clouds = texture(scene, `clouds@${themeId}`, () => makeClouds(theme));
  const far = texture(scene, `far@${themeId}`, () => makeHills(theme, false));
  const near = texture(scene, `near@${themeId}`, () => makeHills(theme, true));

  const fixed = (o, depth) => o.setOrigin(0, 0).setScrollFactor(0).setDepth(depth);
  const layers = [
    { obj: fixed(scene.add.tileSprite(0, 40, GAME_W, 520, clouds), DEPTH.clouds), speed: 0.06, drift: 12 },
    { obj: fixed(scene.add.tileSprite(0, GAME_H - 620, GAME_W, 620, far), DEPTH.farHills), speed: 0.18, drift: 0 },
    { obj: fixed(scene.add.tileSprite(0, GAME_H - 460, GAME_W, 460, near), DEPTH.nearHills), speed: 0.4, drift: 0 },
  ];
  fixed(scene.add.image(0, 0, sky), DEPTH.sky);

  return {
    update(scrollX, timeMs) {
      for (const l of layers) l.obj.tilePositionX = scrollX * l.speed + (timeMs / 1000) * l.drift;
    },
  };
}
