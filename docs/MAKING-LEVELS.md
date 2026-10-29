# Making levels

## With the level designer

Open the game and choose **Level designer**, or go to http://localhost:5173/editor.html.

1. Pick something from the palette on the left (ground, monkeys, keys...).
2. Paint it onto the map with the mouse. **Right-click rubs out.**
3. Press **🤖 Can it be done?** and a robot tries to finish your level.
4. Press **▶ Test play** to play it yourself. Pause and choose *Back to the designer* to keep editing.
5. Press **Save** to keep it in this browser. Saved levels appear under *Choose a level → Your levels*.

| Tool | Key | What it does |
| --- | --- | --- |
| ✏️ Draw | D | Paint one square at a time (drag for lots) |
| ▭ Box | R | Drag to fill a rectangle |
| 🪣 Fill | F | Fill a whole area of the same thing |
| 🧽 Rub out | E | Make squares empty again |
| 💧 Pick | I | Click the map to pick up whatever is there |
| Undo / Redo | Ctrl+Z / Ctrl+Y | |
| Zoom | + / − or Ctrl+mouse wheel | |
| Grid lines | G | |
| Move around | scroll, or drag with the middle mouse button (or Alt+drag) | |

The dashed box shows how much of the level fits on one screen.

## Rules of thumb

The panda jumps **about 3 blocks high** and **about 4 blocks across** with a run-up.
Keep most jumps to 2 or 3 blocks so it's fun and not frustrating.

- A gap in the ceiling **1 block high** means the panda has to duck to get through.
- Doors should be part of a wall that reaches the top of the level, otherwise you can jump over them.
- Shark water wider than 4 blocks needs ice boots to cross.
- Quicksand 1 block deep slows you down; 2 blocks deep can swallow you.
- Anvils need something to hang from. They hang from the ceiling above them (or from the sky).
- Put a checkpoint flag halfway through long levels.
- **Par** is the time (in seconds) a good player needs. Finishing faster earns bonus points.

## Adding your level to the game for everyone

**Save** keeps a level only in your browser. To make it part of the game itself:

1. Press **Download**. You get a file like `my-new-level.json`.
2. Move it into `src/levels/`.
3. Rename it so it starts with a number: `07-my-new-level.json`. Levels are played in number order.
4. Run `npm test` to check the robot can finish it.

## The level file format

Levels are plain text, so you can also edit them in a code editor:

```json
{
  "name": "Bamboo Meadow",
  "author": "Square Panda",
  "theme": "meadow",
  "par": 75,
  "hint": "Arrow keys to run, Space to jump. Jump on monkeys!",
  "map": [
    "...........................",
    "..P.....o.o.o..........G...",
    "###########################"
  ]
}
```

- **theme**: `meadow`, `beach`, `snow`, `volcano` or `night` (see `src/themes.js`).
- **map**: one string per row, top row first. Every row is one screen-block tall. Levels are at least
  27 blocks wide and 15 tall; shorter maps get sky added on top.

| Letter | Thing | Letter | Thing |
| --- | --- | --- | --- |
| `.` | Empty sky | `P` | Panda start (exactly one) |
| `#` | Ground | `G` | Goal flag (exactly one) |
| `=` | Bamboo bridge (jump up through it) | `!` | Checkpoint |
| `I` | Ice | `o` | Bamboo (points) |
| `~` | Shark water | `+` | Heart |
| `Q` | Quicksand | `b` | Ice boots |
| `F` | Fire | `s` `c` `t` | Square, circle, triangle **key** |
| `A` | Falling anvil | `S` `C` `T` | Square, circle, triangle **door** |
| `w` | Shark swimming in water | `M` | Circle Monkey |
| `^` | Triangle Shark | `B` | Banana Monkey |

The full list, with what each thing does, is in `src/objects.js`.
