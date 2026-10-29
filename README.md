# Adventures of Square Panda

A 2D platformer starring **Square Panda**, with **Circle Monkey** and **Triangle Shark** from
[Ink Inc Comics](https://inkinc.club). Run, jump and duck through six levels of shark water,
quicksand, fire and falling anvils. Collect keys to open doors, and find the ice boots to walk
on water. It has high scores, and a level designer for making your own levels.

It runs in any web browser, on computers, tablets and phones.

## Start it up

You need [Node.js](https://nodejs.org) (version 18 or newer). Then, in this folder:

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173). Leave `npm run dev` running while you
work: every time you save a file, the game in the browser updates.

| Page | Address |
| --- | --- |
| The game | http://localhost:5173/ |
| The level designer | http://localhost:5173/editor.html |

## How to play

| Do this | Keyboard | Gamepad | Touch screen |
| --- | --- | --- | --- |
| Run | ← → or A D | D-pad / stick | ◀ ▶ buttons |
| Jump (hold for higher) | Space, ↑, W or Z | A | ▲ button |
| Duck (fit through small gaps) | ↓ or S | D-pad down | ▼ button |
| Drop through a bamboo bridge | Duck + Jump | | |
| Pause | Esc or P | | ❚❚ at the top |
| Sound on/off | M | | |

- **Bamboo** is worth points. Collect all of it in a level for a bonus.
- **Circle Monkeys** can be stomped. **Triangle Sharks** are too pointy, so dodge them or drop an anvil on them.
- **Banana Monkeys** throw bananas at head height, so duck!
- **Shark water** costs a life. Sharks leap out when you're above them, and their fin wiggles just before.
- **Quicksand** slows you and pulls you under. Keep jumping to get out.
- **Keys** open the door with the same shape: square, circle or triangle.
- **Ice boots** stop you slipping on ice, and freeze shark water into ice under your feet.
- **Checkpoints** (flags) are where you come back if you lose a life.

## The project, folder by folder

```
src/
  config.js        ← all the numbers: speeds, jump height, points. Start tinkering here!
  objects.js       ← every thing that can go in a level, and its letter
  themes.js        ← level themes (sky, hills, ground colours)
  levelFormat.js   ← reading, checking and saving level files
  levels/          ← the game's levels (.json files, played in name order)
  art/svg/         ← every picture, as an SVG file
  game/            ← how things move and behave
    player.js        the panda's movement (no drawing here)
    playerView.js    how the panda looks (squash, stretch, waddle)
    entities.js      monkeys, sharks, anvils, keys, flags...
    physics.js       moving boxes around without going through walls
    solver.js        the robot that checks a level can be finished
  scenes/          ← the screens: title, choose a level, the game, high scores
  systems/         ← sound effects, high scores, saving your levels
  editor/          ← the level designer
tests/             ← automatic checks (run them with npm test)
docs/              ← guides
```

The game is written in **JavaScript** using **[Phaser](https://phaser.io)**, a library for making
2D games that run in a browser. **[Vite](https://vitejs.dev)** runs the development server and
builds the finished website.

## Guides

- [docs/MAKING-LEVELS.md](docs/MAKING-LEVELS.md): using the level designer, and the level file format.
- [docs/HACKING.md](docs/HACKING.md): ideas for changing the game, from easy to tricky.

## Checks

```bash
npm test
```

This runs the tests in `tests/`. They check the panda moves properly (jump height, ducking, ice,
quicksand...) and that every level in `src/levels/` has no mistakes and can actually be finished.
For that last check, a robot plays each level using the real game code.

## Putting it on the web

```bash
npm run build
```

This makes a `dist/` folder: the whole game as a plain website. Any web host can serve it:

- **GitHub Pages (automatic):** push this project to a GitHub repository, then in the repository go to
  *Settings → Pages* and set *Source* to **GitHub Actions**. The workflow in
  `.github/workflows/deploy.yml` builds and publishes the game every time you push to `main`.
- **Netlify:** drag the `dist/` folder onto https://app.netlify.com/drop.
- **itch.io:** zip the *contents* of `dist/`, upload it as an HTML game, and tick
  "This file will be played in the browser".

High scores and home-made levels are saved in each player's own browser.
