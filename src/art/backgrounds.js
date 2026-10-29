// ================================================================
//  BACKGROUNDS
//
//  The sky, clouds and hills behind each level are drawn with code
//  (circles, triangles and squares, like the Ink Inc characters).
//  Colours come from the theme in src/themes.js.
//  Each layer repeats sideways so it can scroll forever.
// ================================================================

import { GAME_W, GAME_H } from '../config.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A "random" number maker that always gives the same numbers, so the hills don't change.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Draw a shape three times so it wraps around the edges of a repeating picture. */
function wrapped(ctx, width, draw) {
  for (const dx of [-width, 0, width]) {
    ctx.save();
    ctx.translate(dx, 0);
    draw();
    ctx.restore();
  }
}

export function makeSky(theme) {
  const c = canvas(GAME_W, GAME_H);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, GAME_H);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111';
  if (theme.stars) {
    const rnd = seeded(7);
    ctx.fillStyle = '#fff8d6';
    for (let i = 0; i < 90; i++) {
      const r = 1.5 + rnd() * 2.5;
      ctx.fillRect(rnd() * GAME_W, rnd() * GAME_H * 0.6, r, r);
    }
    ctx.beginPath();
    ctx.arc(1560, 190, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#fff3b0';
    ctx.fill();
    ctx.stroke();
  } else {
    // A big round sun, of course.
    ctx.beginPath();
    ctx.arc(1600, 170, 90, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe14d';
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
  return c;
}

/** Square-ish clouds with ink outlines. */
export function makeClouds(theme) {
  const W = GAME_W;
  const H = 520;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rnd = seeded(42);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#111';
  ctx.fillStyle = theme.clouds;
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * W + rnd() * 160;
    const y = 60 + rnd() * 300;
    const w = 160 + rnd() * 140;
    const h = 60 + rnd() * 30;
    wrapped(ctx, W, () => {
      ctx.globalAlpha = 0.9;
      roundRect(ctx, x, y, w, h, 26);
      roundRect(ctx, x + w * 0.2, y - h * 0.55, w * 0.45, h * 0.8, 24);
      ctx.globalAlpha = 1;
    });
  }
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A row of hills. `near` hills are bigger, darker and have ink outlines. */
export function makeHills(theme, near) {
  const W = GAME_W;
  const H = near ? 460 : 620;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rnd = seeded(near ? 99 : 5);
  ctx.fillStyle = near ? theme.near : theme.far;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = near ? 5 : 0;
  const count = near ? 5 : 4;
  for (let i = 0; i < count; i++) {
    const x = (i / count) * W + rnd() * 200;
    const size = (near ? 240 : 320) + rnd() * 160;
    wrapped(ctx, W, () => {
      ctx.beginPath();
      if (theme.hills === 'pointy') {
        ctx.moveTo(x - size, H + 10);
        ctx.lineTo(x, H - size * 1.15);
        ctx.lineTo(x + size, H + 10);
      } else if (theme.hills === 'dunes') {
        ctx.ellipse(x, H, size * 1.4, size * 0.55, 0, Math.PI, 0);
      } else {
        ctx.arc(x, H + size * 0.35, size, Math.PI, 0);
      }
      ctx.closePath();
      ctx.fill();
      if (near) ctx.stroke();
    });
  }
  return c;
}
