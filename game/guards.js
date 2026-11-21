// guards.js — wardens: patrol routes, vision cones blocked by cover, and the
// suspicion ladder (calm -> "?" suspicious -> "!" alarmed -> caught).
// One job: decide what every guard does and whether the thief is seen.

import { moveBody, raycastDistance, segmentBlocked, clamp } from './world.js';

export const GUARD_RADIUS = 14;

// Cone geometry: 26 rays fan out across the guard's field of view; each ray
// stops at the first wall, so stalls and walls genuinely block sight.
export function conePolygon(guard, solids) {
  const rays = 26;
  const pts = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const a = guard.facing - guard.halfAngle + (2 * guard.halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const dist = raycastDistance(guard.x, guard.y, dx, dy, guard.range, solids);
    pts.push({ x: guard.x + dx * dist, y: guard.y + dy * dist });
  }
  return pts;
}

// Can this guard see the player right now? Range, angle and a clear line.
export function guardSeesPlayer(guard, player, solids) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.range) return false;
  if (dist < 26) return true; // bumped into the warden: seen, no debate
  const angle = Math.atan2(dy, dx);
  let diff = angle - guard.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > guard.halfAngle) return false;
  return !segmentBlocked(guard.x, guard.y, player.x, player.y, solids);
}

export function makeGuard(spec) {
  return {
    path: spec.path.map((p) => ({ x: p[0], y: p[1] })),
    waypoint: 1,
    x: spec.path[0][0], y: spec.path[0][1],
    facing: Math.atan2(spec.path[1][1] - spec.path[0][1], spec.path[1][0] - spec.path[0][0]),
    speed: spec.speed, range: spec.range, halfAngle: spec.halfAngle,
    elite: !!spec.elite,
    mode: 'patrol', // patrol | investigate | chase | return
    target: null, // {x,y} the guard is walking toward while investigating
    stepTimer: 0,
    waitTimer: 0,
  };
}

// Move one guard for a frame. `orders` tells it what the detection meter
// wants: {mode, target} — patrol, investigate a last-seen spot, or chase.
// Returns {stepped} for the footstep sound.
export function updateGuard(guard, dt, orders, solids, bounds) {
  const events = { stepped: false };
  let speed = guard.speed;
  let dest = null;
  if (orders.mode === 'chase' && orders.target) {
    guard.mode = 'chase';
    dest = orders.target;
    speed = guard.speed * 1.9;
  } else if (orders.mode === 'investigate' && orders.target) {
    guard.mode = 'investigate';
    dest = orders.target;
    speed = guard.speed * 1.35;
  } else if (guard.mode === 'investigate' || guard.mode === 'chase') {
    guard.mode = 'return';
    dest = guard.path[guard.waypoint];
  } else if (guard.mode === 'return') {
    dest = guard.path[guard.waypoint];
    if (Math.hypot(dest.x - guard.x, dest.y - guard.y) < 8) guard.mode = 'patrol';
  } else {
    dest = guard.path[guard.waypoint];
  }

  if (dest) {
    const dx = dest.x - guard.x;
    const dy = dest.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 4) {
      const step = Math.min(dist, speed * dt);
      const nx = guard.x + (dx / dist) * step;
      const ny = guard.y + (dy / dist) * step;
      const moved = moveBody(guard.x, guard.y, nx - guard.x, ny - guard.y,
        GUARD_RADIUS, solids, bounds);
      guard.x = moved.x; guard.y = moved.y;
      guard.facing = Math.atan2(dy, dx);
      guard.stepTimer -= dt;
      if (guard.stepTimer <= 0) {
        guard.stepTimer = 0.42;
        events.stepped = true;
      }
      if (guard.mode === 'patrol' && dist - step <= 6) {
        guard.waypoint = (guard.waypoint + 1) % guard.path.length;
      }
    } else if (guard.mode === 'investigate') {
      // Reached the suspicious spot: look around, then give up.
      guard.waitTimer += dt;
      guard.facing += dt * 1.6;
      if (guard.waitTimer > 2.2) {
        guard.waitTimer = 0;
        guard.mode = 'return';
      }
    }
  }
  return events;
}

// The global detection meter (0-100). Rises while any guard sees the thief,
// falls when nobody does. Returns the meter and whether the state changed.
export function updateDetection(meter, seeing, player, inShadow, dt) {
  const prev = meter;
  if (seeing.any) {
    let rate = 52 * (1 - seeing.nearestDist / 260);
    rate = Math.max(rate, 22);
    if (player.sneaking) rate *= 0.55;
    else if (player.moving) rate *= 1.35;
    if (inShadow) rate *= 0.35;
    meter = clamp(meter + rate * dt, 0, 100);
  } else {
    meter = clamp(meter - 16 * dt, 0, 100);
  }
  return { meter, crossedUp: band(meter) > band(prev), crossedDown: band(meter) < band(prev) };
}

// Detection bands: 0 calm, 1 suspicious ("?"), 2 alarmed ("!"), 3 caught.
export function band(meter) {
  if (meter >= 100) return 3;
  if (meter >= 75) return 2;
  if (meter >= 40) return 1;
  return 0;
}
