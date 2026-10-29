// ================================================================
//  GAME SETTINGS
//  This is the best file to start tinkering with. Change a number,
//  save, and the game in your browser reloads straight away.
// ================================================================

export const GAME_TITLE = 'Adventures of Square Panda';

// The game is drawn on a 1920 x 1080 canvas and then shrunk/stretched to fit the window.
export const GAME_W = 1920;
export const GAME_H = 1080;

// One block in a level is TILE x TILE pixels. 15 blocks fill the screen from top to bottom.
export const TILE = 72;

// The font from inkinc.club.
export const FONT = '"Gloria Hallelujah", cursive';
export const INK = 0x111111;

// The game logic runs at a steady 60 steps per second, whatever the screen does.
export const STEP = 1 / 60;

// ---------------------------------------------------------------
//  Square Panda. Speeds are in TILES per second, so "runSpeed: 7"
//  means the panda can run 7 blocks in one second.
// ---------------------------------------------------------------
export const PLAYER = {
  width: 50,           // size of the panda's hit box in pixels
  height: 76,
  duckHeight: 44,      // when ducking the panda fits through 1-block gaps

  runSpeed: 7,
  groundAccel: 55,     // how quickly the panda speeds up...
  groundFriction: 65,  // ...and slows down
  airAccel: 32,
  airFriction: 10,
  iceAccel: 6,         // ice is slippery! (unless you wear ice boots)
  iceFriction: 1.2,
  duckSpeed: 0.35,     // ducking panda crawls at 35% speed

  jumpHeight: 3.6,     // in tiles (the real jump is a bit lower, about 3.4)
  timeToApex: 0.36,    // seconds to reach the top of a jump
  fallGravity: 1.6,    // falling is faster than rising, it feels snappier
  maxFall: 22,
  jumpCut: 0.45,       // let go of jump early for a little hop
  coyoteTime: 0.1,     // you can still jump just after running off a ledge
  jumpBuffer: 0.12,    // pressing jump just before landing still counts
  stompBounce: 13,     // bounce after jumping on a monkey

  // Quicksand slows you down and pulls you under. Keep jumping to escape!
  sandSpeed: 0.4,
  sandSink: 0.9,
  sandJump: 9,
  sandGravity: 0.45,
  sandHopDelay: 0.3,
  sandBreath: 2.0,     // seconds you can be fully under the sand

  hurtKnockX: 6,
  hurtKnockY: 9,
  hurtStun: 0.3,
  invulnerable: 1.5,   // seconds of flashing after getting hurt
};

export const START_LIVES = 3;
export const MAX_HEARTS = 3;

// ---------------------------------------------------------------
//  Enemies and hazards
// ---------------------------------------------------------------
export const MONKEY = { width: 56, height: 56, speed: 2.2, chaseSpeed: 3.8, seeRange: 6 };
export const THROWER = { range: 10, reload: 2.2, bananaSpeed: 7, bananaHeight: 68 };
export const LAND_SHARK = { width: 64, height: 62, speed: 1.6, chargeSpeed: 3.4, seeRange: 5 };
export const WATER_SHARK = { speed: 2.5, leapHeight: 3.6, senseRange: 2.2, warning: 0.35, rest: 1.6 };
export const ANVIL = { triggerRange: 0.85, shakeTime: 0.4, gravity: 60, respawn: 3, damage: 2 };

// ---------------------------------------------------------------
//  Points
// ---------------------------------------------------------------
export const SCORE = {
  bamboo: 100,
  stomp: 250,
  frozenShark: 400,
  levelClear: 1000,
  perHeartLeft: 200,
  perSecondUnderPar: 20,
  allBamboo: 1000,
};
