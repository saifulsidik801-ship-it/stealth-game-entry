// player.js — the thief: movement, sneaking, hacking lanterns, decoys.
// One job: turn keyboard/mouse input into the player's next state.

import { moveBody, pointInRect, clamp } from './world.js';

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 135;
export const SNEAK_SPEED = 72;
export const HACK_TIME = 2.2; // seconds of holding E beside a lantern
export const HACK_RANGE = 52;

export function makePlayer(startX, startY, decoys) {
  return {
    x: startX, y: startY, radius: PLAYER_RADIUS,
    facing: 0, moving: false, sneaking: false,
    hackTarget: -1, hackProgress: 0,
    decoysLeft: decoys,
    stepTimer: 0,
  };
}

// keys: {up,down,left,right,sneak,hack} booleans from input.js state.
// Returns events the main loop turns into sounds/status: {stepped, hacked, decoyThrown}
export function updatePlayer(player, keys, dt, level, solids, bounds, decoys) {
  const events = { stepped: false, hacked: -1, decoyThrown: null };
  let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let my = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  player.moving = moving;
  player.sneaking = keys.sneak && moving;
  const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    player.facing = Math.atan2(my, mx);
    const next = moveBody(player.x, player.y, mx * speed * dt, my * speed * dt,
      player.radius, solids, bounds);
    player.x = next.x; player.y = next.y;
    // Footstep cadence: slow steps while sneaking, brisk steps while walking.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      events.stepped = true;
    }
  }

  // Hacking: hold E beside an unhacked lantern. Moving away or letting go
  // stalls progress; standing still in range fills it.
  let target = -1;
  for (let i = 0; i < level.lanterns.length; i++) {
    const l = level.lanterns[i];
    if (!l.hacked && Math.hypot(player.x - l.x, player.y - l.y) <= HACK_RANGE) {
      target = i;
      break;
    }
  }
  player.hackTarget = target;
  if (target >= 0 && keys.hack && !moving) {
    player.hackProgress += dt / HACK_TIME;
    if (player.hackProgress >= 1) {
      level.lanterns[target].hacked = true;
      player.hackProgress = 0;
      events.hacked = target;
    }
  } else if (player.hackProgress > 0) {
    player.hackProgress = Math.max(0, player.hackProgress - dt * 0.4);
  }
  return events;
}

export function playerInShadow(player, level) {
  for (const s of level.shadows) {
    if (pointInRect(player.x, player.y, s)) return true;
  }
  return false;
}

export function playerNoiseRadius(player) {
  if (!player.moving) return 0;
  return player.sneaking ? 0 : 95; // walking is heard; sneaking is silent
}

export function playerAtExit(player, level) {
  const allHacked = level.lanterns.every((l) => l.hacked);
  return allHacked && pointInRect(player.x, player.y, level.exit);
}

export function throwDecoy(player, tx, ty, level) {
  if (player.decoysLeft <= 0) return null;
  player.decoysLeft -= 1;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const len = Math.hypot(dx, dy) || 1;
  const range = clamp(len, 60, 220);
  const decoy = {
    x: clamp(player.x + (dx / len) * range, 24, 1256),
    y: clamp(player.y + (dy / len) * range, 24, 696),
    t: 3.0, // seconds of beeping before it dies
  };
  return decoy;
}
