// ================================================================
//  THINGS IN A LEVEL: pickups, enemies, anvils, flags...
//
//  Every thing has a box (x, y, w, h), an update(dt, game) that runs
//  60 times a second, and a touch(game) that runs when the panda
//  touches it. `game` is the GameScene (see scenes/GameScene.js).
//
//  Want a new enemy? Copy Monkey, change it, add it to createEntity()
//  at the bottom, and add a symbol for it in src/objects.js.
// ================================================================

import { TILE, MONKEY, THROWER, LAND_SHARK, WATER_SHARK, ANVIL } from '../config.js';
import { moveBody, overlaps, isFloor, toCell } from './physics.js';
import { GRAVITY } from './player.js';
import { DEPTH } from './depth.js';
import * as fx from './fx.js';
import { sfx } from '../systems/sfx.js';

const T = TILE;

class Entity {
  constructor(scene, spot) {
    this.scene = scene;
    this.spot = spot;
    this.id = spot.id;
    this.def = spot.def;
    this.dead = false; // dead things stop updating
    this.removed = false; // removed things get cleaned up
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get centerY() {
    return this.y + this.h / 2;
  }

  /** The box the panda has to touch. Return null for "can't be touched right now". */
  box() {
    return this.dead ? null : this;
  }

  update(dt, game) {}

  touch(game) {}

  remove() {
    this.dead = true;
    this.removed = true;
    this.destroy();
  }

  destroy() {
    this.sprite?.destroy();
  }
}

// ---------------------------------------------------------------
//  Pickups: bamboo, hearts, keys, ice boots
// ---------------------------------------------------------------
class Pickup extends Entity {
  constructor(scene, spot) {
    super(scene, spot);
    this.kind = spot.def.entity; // 'bamboo' | 'heart' | 'key' | 'boots'
    this.w = 44;
    this.h = 50;
    this.x = spot.cx * T + (T - this.w) / 2;
    this.y = spot.cy * T + (T - this.h) / 2;
    this.baseY = spot.cy * T + T / 2;
    this.sprite = scene.add.image(spot.cx * T + T / 2, this.baseY, spot.def.icon).setDepth(DEPTH.items);
    this.t = (spot.cx * 0.7) % 6;
  }

  update(dt) {
    this.t += dt;
    this.sprite.y = this.baseY + Math.sin(this.t * 3) * 5;
    if (this.kind !== 'bamboo') this.sprite.rotation = Math.sin(this.t * 2) * 0.12;
  }

  touch(game) {
    game.collect(this);
  }

  collected() {
    fx.pop(this.scene, this.def.icon, this.sprite.x, this.sprite.y);
    fx.sparkle(this.scene, this.sprite.x, this.sprite.y, this.kind === 'heart' ? 0xff4d6d : 0xffe14d);
    this.remove();
  }
}

class Goal extends Entity {
  constructor(scene, spot) {
    super(scene, spot);
    this.w = 40;
    this.h = 104;
    this.x = spot.cx * T + 14;
    this.y = (spot.cy + 1) * T - this.h;
    this.sprite = scene.add.image(spot.cx * T + 28, (spot.cy + 1) * T + 2, 'goal').setOrigin(0.25, 1).setDepth(DEPTH.items);
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    this.sprite.scaleX = 1 + Math.sin(this.t * 4) * 0.03;
  }

  touch(game) {
    game.reachGoal(this);
  }
}

class Checkpoint extends Entity {
  constructor(scene, spot) {
    super(scene, spot);
    this.w = 40;
    this.h = 72;
    this.x = spot.cx * T + 16;
    this.y = (spot.cy + 1) * T - this.h;
    this.footX = spot.cx * T + T / 2;
    this.footY = (spot.cy + 1) * T;
    this.sprite = scene.add.image(spot.cx * T + T / 2, (spot.cy + 1) * T, 'flag-down').setOrigin(0.5, 1).setDepth(DEPTH.items);
    this.up = false;
  }

  touch(game) {
    game.reachCheckpoint(this);
  }

  raise(quietly = false) {
    this.up = true;
    this.sprite.setTexture('flag-up');
    if (!quietly) {
      this.sprite.setScale(1, 0.4);
      this.scene.tweens.add({ targets: this.sprite, scaleY: 1, duration: 400, ease: 'Back.easeOut' });
    }
  }

  lower() {
    this.up = false;
    this.sprite.setTexture('flag-down');
  }
}

// ---------------------------------------------------------------
//  Walkers: things that walk along the ground and turn round at walls,
//  cliff edges and hazards.
// ---------------------------------------------------------------
class Walker extends Entity {
  constructor(scene, spot, w, h, key) {
    super(scene, spot);
    this.w = w;
    this.h = h;
    this.x = spot.cx * T + (T - w) / 2;
    this.y = (spot.cy + 1) * T - h;
    this.vx = 0;
    this.vy = 0;
    this.dir = -1;
    this.onGround = false;
    this.killableByAnvil = true;
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1).setDepth(DEPTH.enemies);
    this.t = (spot.cx * 1.3) % 5;
  }

  /** Is the way ahead blocked by a cliff or a hazard? */
  blockedAhead(grid) {
    if (!this.onGround) return false;
    const col = toCell(this.dir > 0 ? this.x + this.w + 4 : this.x - 4);
    const footRow = toCell(this.y + this.h - 1);
    const here = grid.props(col, footRow);
    return !isFloor(grid.get(col, footRow + 1)) || here.fire || here.water || here.quicksand;
  }

  /** Walk at `speed` tiles per second. If `stopAtEdges`, stand still at cliff edges instead of turning. */
  walk(dt, grid, speed, stopAtEdges = false) {
    let moving = true;
    if (this.blockedAhead(grid)) {
      if (stopAtEdges) moving = false;
      else this.dir *= -1;
    }
    this.vx = moving ? this.dir * speed * T : 0;
    this.vy = Math.min(this.vy + GRAVITY * 1.4 * dt, 20 * T);
    const hit = moveBody(this, grid, this.vx * dt, this.vy * dt);
    if (hit.left || hit.right) this.dir *= -1;
    this.onGround = !!hit.down;
    if (hit.down) this.vy = 0;
    if (this.y > grid.pixelHeight + T) this.remove();
  }

  /** Can this enemy see the panda on (about) the same floor? */
  seesPanda(game, range) {
    const p = game.body;
    return (
      game.state === 'play' &&
      Math.abs(p.bottom - (this.y + this.h)) < T * 0.8 &&
      Math.abs(p.centerX - this.centerX) < range * T
    );
  }

  placeSprite(wobble) {
    this.sprite.setPosition(this.centerX, this.y + this.h + 2);
    this.sprite.setFlipX(this.dir < 0);
    this.sprite.rotation = wobble;
  }

  /** Squashed flat (by a stomp or an anvil). */
  squash() {
    this.dead = true;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.25,
      scaleX: 1.3,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeIn',
      onComplete: () => this.remove(),
    });
    fx.puff(this.scene, this.centerX, this.y + this.h, { color: 0xffffff, count: 6 });
  }

  touch(game) {
    const p = game.body;
    const fromAbove = p.vy > 0 && p.prevY + p.h <= this.y + 28;
    if (this.stompable && fromAbove) game.stomp(this);
    else game.hurt(1, this.centerX);
  }
}

/** Circle Monkey: wanders about, and rolls after you when it spots you. Jump on its head! */
class Monkey extends Walker {
  constructor(scene, spot) {
    super(scene, spot, MONKEY.width, MONKEY.height, 'monkey');
    this.stompable = true;
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    const chasing = this.seesPanda(game, MONKEY.seeRange);
    if (chasing) {
      const towards = Math.sign(game.body.centerX - this.centerX);
      if (towards) this.dir = towards;
    }
    this.walk(dt, game.grid, chasing ? MONKEY.chaseSpeed : MONKEY.speed, chasing);
    const rolling = this.vx !== 0;
    this.placeSprite(rolling ? Math.sin(this.t * (chasing ? 20 : 12)) * 0.14 : 0);
    this.sprite.y -= rolling ? Math.abs(Math.sin(this.t * (chasing ? 20 : 12))) * 4 : 0;
  }
}

/** Banana Monkey: stays put and throws bananas at head height. Duck under them or jump over! */
class Thrower extends Walker {
  constructor(scene, spot) {
    super(scene, spot, MONKEY.width, MONKEY.height, 'monkey-banana');
    this.stompable = true;
    this.reload = THROWER.reload * 0.6;
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    this.walk(dt, game.grid, 0);
    const sees = this.seesPanda(game, THROWER.range);
    if (sees) this.dir = Math.sign(game.body.centerX - this.centerX) || this.dir;
    this.reload -= dt;
    if (sees && this.reload <= 0) {
      this.reload = THROWER.reload;
      game.addProjectile(new Banana(this.scene, this.centerX + this.dir * 30, this.y + this.h - THROWER.bananaHeight, this.dir));
      sfx.play('throw');
      this.sprite.setScale(1.15, 0.85);
      this.scene.tweens.add({ targets: this.sprite, scaleX: 1, scaleY: 1, duration: 250 });
    }
    this.placeSprite(Math.sin(this.t * 3) * 0.05);
  }
}

/** Triangle Shark: shuffles about on land. Too pointy to stomp, but an anvil will do it. */
class LandShark extends Walker {
  constructor(scene, spot) {
    super(scene, spot, LAND_SHARK.width, LAND_SHARK.height, 'shark');
    this.stompable = false;
    this.chomp = 0;
  }

  update(dt, game) {
    if (this.dead) return;
    this.t += dt;
    const charging = this.seesPanda(game, LAND_SHARK.seeRange);
    if (charging) this.dir = Math.sign(game.body.centerX - this.centerX) || this.dir;
    this.walk(dt, game.grid, charging ? LAND_SHARK.chargeSpeed : LAND_SHARK.speed, charging);
    this.chomp -= dt;
    if (this.chomp <= 0) {
      this.chomp = charging ? 0.18 : 0.35;
      this.sprite.setTexture(this.sprite.texture.key === 'shark' ? 'shark-closed' : 'shark');
      if (charging && this.sprite.texture.key === 'shark-closed') sfx.play('chomp');
    }
    this.placeSprite(Math.sin(this.t * 8) * 0.06);
  }
}

// ---------------------------------------------------------------
//  Shark in the water: swims back and forth, leaps out when you're above.
// ---------------------------------------------------------------
class WaterShark extends Entity {
  constructor(scene, spot) {
    super(scene, spot);
    this.row = spot.cy;
    this.surfaceY = spot.cy * T + 12;
    this.finX = (spot.cx + 0.5) * T;
    this.dir = 1;
    this.state = 'swim';
    this.rest = 1;
    this.w = 56;
    this.h = 60;
    this.x = this.finX - this.w / 2;
    this.y = this.surfaceY;
    this.fin = scene.add.image(this.finX, this.surfaceY + 18, 'shark-fin').setOrigin(0.5, 1).setDepth(DEPTH.enemies);
    this.sprite = scene.add.image(0, 0, 'shark').setOrigin(0.5, 0.5).setDepth(DEPTH.leaping).setVisible(false);
    this.t = 0;
  }

  box() {
    return this.state === 'leap' && !this.dead ? this : null;
  }

  isWater(grid, px) {
    return !!grid.props(toCell(px), this.row).water;
  }

  update(dt, game) {
    if (this.dead) return;
    const grid = game.grid;
    this.t += dt;
    if (this.state === 'swim') {
      if (!this.isWater(grid, this.finX)) {
        game.sharkFrozen(this);
        return;
      }
      const next = this.finX + this.dir * (WATER_SHARK.speed * T * dt + T * 0.4);
      if (!this.isWater(grid, next)) this.dir *= -1;
      else this.finX += this.dir * WATER_SHARK.speed * T * dt;
      this.fin.setPosition(this.finX, this.surfaceY + 18 + Math.sin(this.t * 4) * 3).setFlipX(this.dir < 0);
      this.rest -= dt;
      const p = game.body;
      const above = p.bottom < this.surfaceY + 4 && this.surfaceY - p.bottom < 7 * T;
      if (this.rest <= 0 && game.state === 'play' && above && Math.abs(p.centerX - this.finX) < WATER_SHARK.senseRange * T) {
        // Shake the fin first, so a quick panda has a chance to get past.
        this.state = 'warn';
        this.timer = WATER_SHARK.warning;
      }
    } else if (this.state === 'warn') {
      this.timer -= dt;
      this.fin.setPosition(this.finX + Math.sin(this.t * 60) * 4, this.surfaceY + 10);
      if (this.timer <= 0) {
        this.state = 'leap';
        this.vy = -Math.sqrt(2 * GRAVITY * WATER_SHARK.leapHeight * T);
        this.leapY = this.surfaceY + 40;
        this.fin.setVisible(false);
        this.sprite.setVisible(true).setFlipX(this.dir < 0);
        fx.splash(this.scene, this.finX, this.surfaceY);
        sfx.play('splash');
      }
    } else if (this.state === 'leap') {
      this.vy += GRAVITY * dt;
      this.leapY += this.vy * dt;
      this.x = this.finX - this.w / 2;
      this.y = this.leapY - this.h / 2;
      this.sprite.setPosition(this.finX, this.leapY);
      this.sprite.rotation = (this.vy < 0 ? -0.5 : 0.5) * (this.dir < 0 ? -1 : 1);
      this.sprite.setTexture(Math.floor(this.t * 8) % 2 ? 'shark' : 'shark-closed');
      if (this.vy > 0 && this.leapY > this.surfaceY + 40) {
        this.state = 'swim';
        this.rest = WATER_SHARK.rest;
        this.sprite.setVisible(false);
        this.fin.setVisible(true);
        fx.splash(this.scene, this.finX, this.surfaceY);
      }
    }
  }

  touch(game) {
    game.hurt(1, this.finX);
  }

  destroy() {
    this.fin.destroy();
    this.sprite.destroy();
  }
}

// ---------------------------------------------------------------
//  Falling anvil: hangs from a chain, wobbles when you're underneath, then drops!
// ---------------------------------------------------------------
class Anvil extends Entity {
  constructor(scene, spot, grid) {
    super(scene, spot);
    this.w = 56;
    this.h = 42;
    this.homeX = spot.cx * T + (T - this.w) / 2;
    this.homeY = spot.cy * T + 22;
    this.x = this.homeX;
    this.y = this.homeY;
    // The chain goes up to the ceiling (or off the top of the screen).
    let top = spot.cy;
    while (top > 0 && !grid.props(spot.cx, top - 1).solid) top--;
    const chainTop = top === 0 ? -T * 3 : top * T;
    this.chain = scene.add
      .tileSprite(spot.cx * T + T / 2, chainTop, 14, this.homeY - chainTop + 4, 'chain')
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.items);
    this.sprite = scene.add.image(0, 0, 'anvil').setOrigin(0.5, 0).setDepth(DEPTH.enemies);
    this.state = 'hang';
    this.timer = 0;
    this.vy = 0;
    this.place();
  }

  place(shake = 0) {
    this.sprite.setPosition(this.centerX + shake, this.y - 2);
  }

  box() {
    return this.state === 'fall' ? this : null;
  }

  pandaUnderneath(game) {
    const p = game.body;
    if (game.state !== 'play' || p.y < this.y + this.h) return false;
    if (Math.abs(p.centerX - this.centerX) > ANVIL.triggerRange * T) return false;
    const col = toCell(this.centerX);
    for (let cy = toCell(this.y + this.h); cy < toCell(p.y); cy++) {
      if (game.grid.props(col, cy).solid) return false;
    }
    return true;
  }

  update(dt, game) {
    switch (this.state) {
      case 'hang':
        if (this.pandaUnderneath(game)) {
          this.state = 'shake';
          this.timer = ANVIL.shakeTime;
          sfx.play('clang');
        }
        break;
      case 'shake':
        this.timer -= dt;
        this.place(Math.sin(this.timer * 80) * 3);
        if (this.timer <= 0) {
          this.state = 'fall';
          this.vy = 0;
        }
        break;
      case 'fall': {
        this.vy += ANVIL.gravity * T * dt;
        const hit = moveBody(this, game.grid, 0, this.vy * dt);
        this.place();
        for (const e of game.entities) {
          if (e !== this && e.killableByAnvil && !e.dead && overlaps(this, e)) game.squashEnemy(e);
        }
        if (hit.down || this.y > game.grid.pixelHeight) this.smash();
        break;
      }
      case 'gone':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'hang';
          this.x = this.homeX;
          this.y = this.homeY;
          this.place();
          this.sprite.setVisible(true).setAlpha(0);
          this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 400 });
        }
        break;
    }
  }

  smash() {
    this.state = 'gone';
    this.timer = ANVIL.respawn;
    this.sprite.setVisible(false);
    fx.puff(this.scene, this.centerX, this.y + this.h, { color: 0x9aa3b2, count: 10, size: 9, spread: 70, up: 20 });
    sfx.play('anvil');
    this.scene.cameras.main.shake(120, 0.004);
  }

  touch(game) {
    game.hurt(ANVIL.damage, this.centerX);
  }

  destroy() {
    this.chain.destroy();
    this.sprite.destroy();
  }
}

// ---------------------------------------------------------------
//  A banana thrown by a Banana Monkey.
// ---------------------------------------------------------------
export class Banana {
  constructor(scene, x, y, dir) {
    this.scene = scene;
    this.w = 26;
    this.h = 26;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.vx = dir * THROWER.bananaSpeed * T;
    this.life = 3.5;
    this.removed = false;
    this.sprite = scene.add.image(x, y, 'banana').setDepth(DEPTH.enemies);
  }

  update(dt, game) {
    this.x += this.vx * dt;
    this.life -= dt;
    this.sprite.setPosition(this.x + this.w / 2, this.y + this.h / 2);
    this.sprite.angle += 720 * dt * Math.sign(this.vx);
    if (this.life <= 0 || game.grid.props(toCell(this.x + this.w / 2), toCell(this.y + this.h / 2)).solid) this.remove();
  }

  remove() {
    this.removed = true;
    this.sprite.destroy();
  }
}

/** Make the right kind of thing for a spot in the level. */
export function createEntity(scene, spot, grid) {
  switch (spot.def.entity) {
    case 'bamboo':
    case 'heart':
    case 'key':
    case 'boots':
      return new Pickup(scene, spot);
    case 'goal':
      return new Goal(scene, spot);
    case 'checkpoint':
      return new Checkpoint(scene, spot);
    case 'monkey':
      return new Monkey(scene, spot);
    case 'thrower':
      return new Thrower(scene, spot);
    case 'landShark':
      return new LandShark(scene, spot);
    case 'waterShark':
      return new WaterShark(scene, spot);
    case 'anvil':
      return new Anvil(scene, spot, grid);
    default:
      return null; // the panda start doesn't need a thing
  }
}
