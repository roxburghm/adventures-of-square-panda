// ================================================================
//  ART
//
//  Every picture in the game is an SVG file in src/art/svg/. SVG is
//  a drawing written as text, so you can open the files in a code
//  editor or a drawing program (Inkscape, Figma, Boxy SVG...).
//
//  The file name is the picture's name: svg/panda.svg is 'panda'.
//  Drop in a new SVG and it can be used straight away by that name.
//
//  Pictures that use colours like var(--dirt) change colour with the
//  level theme (see src/themes.js).
// ================================================================

import { THEMES } from '../themes.js';

const FILES = import.meta.glob('./svg/*.svg', { query: '?raw', import: 'default', eager: true });

/** name -> svg text */
export const SVG = {};
for (const [path, text] of Object.entries(FILES)) {
  SVG[path.split('/').pop().replace('.svg', '')] = text;
}

/** Names of the pictures that change colour with the theme. */
export const THEMED = new Set(Object.keys(SVG).filter((name) => SVG[name].includes('var(--')));

/** The texture name to use for a picture in a theme. */
export function artKey(name, theme) {
  return THEMED.has(name) ? `${name}@${theme}` : name;
}

function withTheme(svg, themeId) {
  const t = THEMES[themeId];
  const vars = `--dirt:${t.dirt};--dirt2:${t.dirt2};--cap:${t.cap};--cap2:${t.cap2}`;
  return svg.replace('<svg ', `<svg style="${vars}" `);
}

/** Draw an SVG onto a canvas. Resolves with the canvas. */
export function svgToCanvas(svgText, scale = 1) {
  const tag = svgText.match(/<svg[^>]*>/)?.[0] ?? '';
  const w = Number(/\swidth="([\d.]+)"/.exec(tag)?.[1] ?? 64);
  const h = Number(/\sheight="([\d.]+)"/.exec(tag)?.[1] ?? 64);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(w * scale);
      canvas.height = Math.ceil(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Could not draw an SVG picture'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  });
}

/** Draw every picture (and every theme colour of the themed ones). Resolves with Map(name -> canvas). */
export async function loadAllArt(scale = 1) {
  const out = new Map();
  const jobs = [];
  for (const [name, text] of Object.entries(SVG)) {
    if (THEMED.has(name)) {
      for (const theme of Object.keys(THEMES)) {
        jobs.push(svgToCanvas(withTheme(text, theme), scale).then((c) => out.set(`${name}@${theme}`, c)));
      }
    } else {
      jobs.push(svgToCanvas(text, scale).then((c) => out.set(name, c)));
    }
  }
  await Promise.all(jobs);
  return out;
}
