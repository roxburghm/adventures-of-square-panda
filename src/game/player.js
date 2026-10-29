// ================================================================
//  HOW SQUARE PANDA MOVES
//
//  This is only the "thinking" part of the panda: its box, speed,
//  jumping, ducking, ice, quicksand and so on. The drawing is done in
//  playerView.js. Keeping them apart means we can test the movement
//  without a browser (see tests/player.test.js).
//
//  All the numbers live in PLAYER in src/config.js.
// ================================================================

import { TILE, PLAYER as P } from '../config.js';
import { tileProps } from '../objects.js';
import { moveBody, roomFor, forTilesIn, approach, toCell } from './physics.js';

const T = TILE;

// Work out gravity and jump speed from "how high" and "how long" a jump should be.
export const GRAVITY = ((2 * P.jumpHeight) / P.timeToApex ** 2) * T; // pixels per second per second
export const JUMP_SPEED = ((2 * P.jumpHeight) / P.timeToApex) * T; // pixels per second

const NO_INPUT = { left: false, right: false, down: false, jump: false, jumpPressed: false };

export class PlayerBody {
  /** footX, footY = where the middle of the panda's feet should be. */
  constructor(footX, footY) {
    this.w = P.width;
    this.h = P.height;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left
    this.hasBoots = false;
    this.place(footX, footY);
  }

  place(footX, footY) {
    if (this.ducking) this.h = P.height;
    this.x = footX - this.w / 2;
    this.y = footY - this.h;
    this.prevX = this.x;
    this.prevY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.ducking = false;
    this.surface = null; // the symbol of the tile we're standing on
    this.coyote = 0;
    this.buffer = 0;
    this.dropTimer = 0;
    this.stun = 0;
    this.sandHop = 0;
    this.rising = false;
    this.breath = P.sandBreath;
    this.inSand = false;
    this.underSand = false;
    this.hit = null;
  }

  get centerX() {
    return this.x + this.w / 2;
  }

  get bottom() {
    return this.y + this.h;
  }

  /**
   * One step of physics. `input` is { left, right, down, jump, jumpPressed }.
   * Returns a list of things that happened, like 'jump', 'land', 'water' or {type:'freeze'}.
   */
  step(dt, input, grid) {
    const ev = [];
    const inp = this.stun > 0 ? NO_INPUT : input;
    this.prevX = this.x;
    this.prevY = this.y;
    this.stun = Math.max(0, this.stun - dt);
    this.buffer = inp.jumpPressed ? P.jumpBuffer : Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? P.coyoteTime : Math.max(0, this.coyote - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.sandHop = Math.max(0, this.sandHop - dt);
    this.measureSand(grid);

    // ---- Ducking ----
    const wantDuck = inp.down && this.onGround && !this.inSand;
    if (wantDuck !== this.ducking) this.setDuck(wantDuck, grid);

    // ---- Running ----
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir) this.facing = dir;
    const slippery = this.onGround && tileProps(this.surface).slippery && !this.hasBoots;
    let maxSpeed = P.runSpeed;
    if (this.ducking) maxSpeed *= P.duckSpeed;
    if (this.inSand) maxSpeed *= P.sandSpeed;
    let rate;
    if (slippery) rate = dir ? P.iceAccel : P.iceFriction;
    else if (this.onGround) rate = dir ? P.groundAccel : P.groundFriction;
    else rate = dir ? P.airAccel : P.airFriction;
    if (dir && Math.sign(this.vx) === -dir && !slippery) rate *= 1.6; // turning round is quick (but not on ice!)
    this.vx = approach(this.vx, dir * maxSpeed * T, rate * T * dt);

    // ---- Jumping ----
    if (this.buffer > 0) {
      if (this.ducking && this.onGround && tileProps(this.surface).oneWay) {
        // Duck + jump on a bamboo bridge drops you through it.
        this.buffer = 0;
        this.dropTimer = 0.25;
        this.onGround = false;
        ev.push('drop');
      } else if (this.inSand) {
        if (this.sandHop <= 0) {
          this.vy = -P.sandJump * T;
          this.sandHop = P.sandHopDelay;
          this.buffer = 0;
          this.rising = true;
          ev.push('sandHop');
        }
      } else if ((this.onGround || this.coyote > 0) && (!this.ducking || this.setDuck(false, grid))) {
        this.vy = -JUMP_SPEED;
        this.onGround = false;
        this.coyote = 0;
        this.buffer = 0;
        this.rising = true;
        ev.push('jump');
      }
    }
    // Let go of jump early = smaller jump.
    if (this.rising && !inp.jump && this.vy < 0) {
      this.vy *= P.jumpCut;
      this.rising = false;
    }
    if (this.vy >= 0) this.rising = false;

    // ---- Gravity ----
    if (this.inSand) {
      const sink = P.sandSink * T;
      this.vy = this.vy > sink ? sink : Math.min(sink, this.vy + GRAVITY * P.sandGravity * dt);
    } else {
      const g = this.vy < 0 ? GRAVITY : GRAVITY * P.fallGravity;
      this.vy = Math.min(this.vy + g * dt, P.maxFall * T);
    }

    // ---- Move and bump into things ----
    const wasOnGround = this.onGround;
    const fallSpeed = this.vy;
    const hit = moveBody(this, grid, this.vx * dt, this.vy * dt, { dropThrough: this.dropTimer > 0 });
    this.hit = hit;
    if ((hit.left && this.vx < 0) || (hit.right && this.vx > 0)) this.vx = 0;
    if (hit.up && this.vy < 0) {
      this.vy = 0;
      this.rising = false;
      ev.push('bonk');
    }
    this.onGround = !!hit.down;
    if (hit.down) {
      this.surface = hit.down.ch;
      if (!wasOnGround) ev.push(fallSpeed > 9 * T ? 'bigLand' : 'land');
      this.vy = 0;
    } else {
      this.surface = null;
    }

    // ---- Ice boots freeze the top of shark water ----
    if (this.hasBoots && this.vy >= 0) this.freezeWater(grid, ev);

    // ---- Hazards. We use a box a bit smaller than the panda, so near-misses feel fair. ----
    const ix = this.x + 8;
    const iy = this.y + 10;
    const iw = this.w - 16;
    const ih = this.h - 14;
    let wet = false;
    let burnt = false;
    forTilesIn(grid, ix, iy, iw, ih, (ch, cx, cy) => {
      const p = tileProps(ch);
      if (p.water && iy + ih > cy * T + 16) wet = true;
      if (p.fire && iy + ih > cy * T + 20) burnt = true;
    });
    if (wet) ev.push('water');
    if (burnt) ev.push('fire');

    this.measureSand(grid);
    if (this.underSand) {
      this.breath -= dt;
      if (this.breath <= 0) ev.push('sand');
    } else {
      this.breath = Math.min(P.sandBreath, this.breath + dt);
    }

    if (this.y > grid.pixelHeight + T) ev.push('pit');
    return ev;
  }

  freezeWater(grid, ev) {
    const row = toCell(this.bottom - 0.01);
    if (this.bottom - row * T > T * 0.6) return; // already too deep
    let froze = false;
    for (let cx = toCell(this.x); cx <= toCell(this.x + this.w - 0.01); cx++) {
      const isSurface = tileProps(grid.get(cx, row)).water && !tileProps(grid.get(cx, row - 1)).water;
      if (isSurface) {
        grid.set(cx, row, 'I');
        ev.push({ type: 'freeze', cx, cy: row });
        froze = true;
      }
    }
    if (froze) {
      this.y = row * T - this.h;
      this.vy = 0;
      this.onGround = true;
      this.surface = 'I';
    }
  }

  /** How deep in quicksand are we? */
  measureSand(grid) {
    const cx = toCell(this.centerX);
    let depth = 0;
    for (let cy = toCell(this.y); cy <= toCell(this.bottom - 0.01); cy++) {
      if (grid.props(cx, cy).quicksand) {
        depth += Math.min(this.bottom, (cy + 1) * T) - Math.max(this.y, cy * T);
      }
    }
    this.inSand = depth > 6;
    this.underSand = !!grid.props(cx, toCell(this.y + 2)).quicksand;
  }

  /** Duck down or stand up. Standing up only works if there's room above. */
  setDuck(on, grid) {
    if (on === this.ducking) return true;
    const newH = on ? P.duckHeight : P.height;
    const bottom = this.bottom;
    if (!on && !roomFor(grid, this.x, bottom - newH, this.w, newH)) return false;
    this.h = newH;
    this.y = bottom - newH;
    this.prevY += this.ducking ? -(P.height - P.duckHeight) : P.height - P.duckHeight;
    this.ducking = on;
    return true;
  }

  /** Knocked back after getting hurt by something at fromX. */
  knockBack(fromX, grid) {
    const dir = this.centerX < fromX ? -1 : 1;
    this.setDuck(false, grid);
    this.vx = dir * P.hurtKnockX * T;
    this.vy = -P.hurtKnockY * T;
    this.stun = P.hurtStun;
    this.onGround = false;
    this.rising = false;
  }

  /** Bounce up after stomping on an enemy. Hold jump to bounce higher. */
  bounce(holdingJump) {
    this.vy = -P.stompBounce * T * (holdingJump ? 1.25 : 1);
    this.rising = holdingJump;
    this.onGround = false;
  }
}
