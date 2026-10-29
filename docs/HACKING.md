# Changing the game

Keep `npm run dev` running and the game open in a browser. Every time you save a file the
game reloads, so you see your change straight away. If something breaks, the browser's
developer console (F12, or Cmd+Option+I on a Mac) shows the error and the line it's on.
Run `npm test` now and then to check you haven't broken anything.

## Easy: change some numbers

Everything is in `src/config.js`.

- **Super jump:** set `jumpHeight` in `PLAYER` to `6`.
- **Speedy panda:** set `runSpeed` to `12`.
- **Moon gravity:** make `timeToApex` bigger (like `0.6`) so jumps float.
- **Skating rink:** set `iceFriction` to `0.2`.
- **More lives:** change `START_LIVES`.
- **Points:** change the numbers in `SCORE`.
- **Angry monkeys:** raise `chaseSpeed` in `MONKEY`.

(The tests check things like jump height, so `npm test` will complain if you change those.
That's fine. Update the numbers in `tests/player.test.js` when you've decided what you like.)

## Easy: change how things look

Every picture is an SVG file in `src/art/svg/`. Open one in a code editor and change a colour
(like `fill="#0a8e8e"`, the shark's teal), or open it in a drawing program such as
[Inkscape](https://inkscape.org) or [Boxy SVG](https://boxy-svg.com). Keep the same file name and
roughly the same size (the `width` and `height` at the top).

## Easy: change a sound

Sounds are made from beeps in `src/systems/sfx.js`. Each one is a line like:

```js
jump: () => tone('square', 280, 560, 0.13, 0.1),
```

That means: a `square` wave, sliding from pitch 280 up to 560, lasting 0.13 seconds, at volume 0.1.
Try `'sawtooth'` instead of `'square'`, or swap the pitches so the jump slides down.

## Medium: a new theme

Copy one of the themes in `src/themes.js`, give it a new name (like `candy`) and pick new
colours. Your theme appears in the level designer's theme list.

## Medium: a new pickup

Say you want a **golden bamboo** worth 1000 points.

1. Draw `src/art/svg/golden-bamboo.svg` (copy `bamboo.svg` and change the greens to gold).
2. Add it to `OBJECTS` in `src/objects.js`:
   ```js
   { char: '$', id: 'golden-bamboo', name: 'Golden bamboo', group: 'Items', icon: 'golden-bamboo',
     entity: 'golden', anchor: 'center', help: 'Worth loads of points!' },
   ```
3. In `src/game/entities.js`, at the bottom, add `case 'golden':` next to `case 'bamboo':`.
4. In `src/scenes/GameScene.js`, find `collect(item)` and add:
   ```js
   case 'golden':
     this.addPoints(1000, item.centerX, item.y);
     sfx.play('key');
     break;
   ```

It's now in the level designer's palette, ready to paint.

## Tricky: a new enemy

Look at `class Monkey` in `src/game/entities.js`. Copy it, rename it, and change what it does in
`update()`. A few ideas:

- A **Square Frog** that jumps every two seconds (set `this.vy` to a negative number when it's on the ground).
- A **Circle Bat** that flies in a wave (change `this.y` with `Math.sin`).
- A monkey that only chases you at night.

Then add a letter for it in `src/objects.js` and a `case` for it in `createEntity()`.

## Tricky: bigger ideas

- **Music:** `src/systems/sfx.js` could play a tune by scheduling notes in a loop.
- **Moving platforms:** a new entity that carries the panda (the panda would need to move with it).
- **Online high scores:** scores are saved in each browser. Sharing them needs a server
  (something like Supabase or Firebase) to store them.
- **A boss level** for the end of the adventure!

## How the game runs (for the curious)

1. `src/main.js` starts Phaser with the list of scenes.
2. `BootScene` turns every SVG into a picture Phaser can use, then shows the title.
3. `GameScene` reads the level map, builds the tiles and things, and then 60 times a second:
   - reads the controls,
   - moves the panda (`player.js`) and everything else (`entities.js`),
   - checks what the panda is touching,
   - moves the camera and updates the HUD.
4. The panda's **movement** (`player.js`) is separate from its **drawing** (`playerView.js`).
   That's why the tests, and the robot in `solver.js`, can play the game without a browser.
