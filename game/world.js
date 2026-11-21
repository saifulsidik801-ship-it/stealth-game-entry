// world.js — geometry the whole game shares: rectangles, line-of-sight and
// movement collision. Everything here is pure math, no drawing, no state.

// A rect is {x, y, w, h}. Point inside, with a small margin for bodies.
export function pointInRect(px, py, r, margin = 0) {
  return px >= r.x - margin && px <= r.x + r.w + margin &&
         py >= r.y - margin && py <= r.y + r.h + margin;
}

// Ray from (x0,y0) along unit (dx,dy), length maxDist. Returns the distance
// to the nearest rect in `solids`, or maxDist when nothing is hit.
export function raycastDistance(x0, y0, dx, dy, maxDist, solids) {
  let best = maxDist;
  for (const r of solids) {
    const t = rayHitsRect(x0, y0, dx, dy, r);
    if (t !== null && t < best) best = t;
  }
  return best;
}

// Slab test: distance along the ray where it first enters the rect, or null.
function rayHitsRect(x0, y0, dx, dy, r) {
  let tMin = 0;
  let tMax = Infinity;
  if (dx === 0) {
    if (x0 < r.x || x0 > r.x + r.w) return null;
  } else {
    let t1 = (r.x - x0) / dx;
    let t2 = (r.x + r.w - x0) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (dy === 0) {
    if (y0 < r.y || y0 > r.y + r.h) return null;
  } else {
    let t1 = (r.y - y0) / dy;
    let t2 = (r.y + r.h - y0) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

// True when the segment (x0,y0)-(x1,y1) touches any solid rect.
export function segmentBlocked(x0, y0, x1, y1, solids) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) return false;
  const dist = raycastDistance(x0, y0, dx / len, dy / len, len, solids);
  return dist < len - 0.001;
}

// Move a circle body (radius) by (dx,dy), sliding along solid rects.
// Returns the new position; never lets the body overlap a solid.
export function moveBody(x, y, dx, dy, radius, solids, bounds) {
  let nx = clamp(x + dx, bounds.x + radius, bounds.x + bounds.w - radius);
  let ny = clamp(y + dy, bounds.y + radius, bounds.y + bounds.h - radius);
  for (const r of solids) {
    if (circleHitsRect(nx, y, radius, r)) nx = pushOutX(nx, y, radius, r, x);
    if (circleHitsRect(nx, ny, radius, r)) ny = pushOutY(nx, ny, radius, r, y);
  }
  return { x: nx, y: ny };
}

function circleHitsRect(cx, cy, radius, r) {
  const nearX = clamp(cx, r.x, r.x + r.w);
  const nearY = clamp(cy, r.y, r.y + r.h);
  const ddx = cx - nearX;
  const ddy = cy - nearY;
  return ddx * ddx + ddy * ddy < radius * radius;
}

function pushOutX(nx, _y, radius, r, oldX) {
  if (oldX <= r.x) return r.x - radius;
  if (oldX >= r.x + r.w) return r.x + r.w + radius;
  return nx;
}

function pushOutY(_x, ny, radius, r, oldY) {
  if (oldY <= r.y) return r.y - radius;
  if (oldY >= r.y + r.h) return r.y + r.h + radius;
  return ny;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Deterministic tiny PRNG so floor speckle and lantern flicker are stable
// between runs (screenshots look the same every time).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
