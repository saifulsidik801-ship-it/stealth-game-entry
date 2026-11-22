// decor.js — purely visual market dressing: cobbles, rugs, puddles, props,
// banners, torches, shoppers, cats, smoke and particles.
// One job: give render.js deterministic, seeded decoration for a level.
// NOTHING here is solid, seen by guards, or read by any gameplay code:
// guards walk through it, detection ignores it, and the dossier never
// embeds it. All placement is checked clear of solids, shadow zones,
// lanterns, the exit and the player's start, so the stealth readability
// (cones, shadows, objectives) is never covered up.

import { mulberry32 } from './world.js';
import { BOUNDS, PLAY_W, PLAY_H } from './levels.js';

const GOODS = ['fruit', 'fabric', 'pottery', 'lanterns', 'spice', 'bread'];

export function goodsFor(stallIndex) {
  return GOODS[stallIndex % GOODS.length];
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function clearOf(x, y, r, level) {
  for (const s of [...level.walls, ...level.stalls, ...(level.obstacles || [])]) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(y, s.y + s.h));
    if (Math.hypot(x - nx, y - ny) < r) return false;
  }
  for (const s of level.shadows) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(y, s.y + s.h));
    if (Math.hypot(x - nx, y - ny) < r + 6) return false;
  }
  for (const l of level.lanterns) {
    if (Math.hypot(x - l.x, y - l.y) < r + 44) return false;
  }
  const ex = level.exit;
  const nx = Math.max(ex.x, Math.min(x, ex.x + ex.w));
  const ny = Math.max(ex.y, Math.min(y, ex.y + ex.h));
  if (Math.hypot(x - nx, y - ny) < r + 44) return false;
  if (Math.hypot(x - level.playerStart[0], y - level.playerStart[1]) < r + 44) return false;
  for (const g of level.guards) {
    for (let i = 0; i < g.path.length; i++) {
      const a = g.path[i];
      const b = g.path[(i + 1) % g.path.length];
      if (distToSeg(x, y, a[0], a[1], b[0], b[1]) < r + 26) return false;
    }
  }
  return x > BOUNDS.x + 10 && x < BOUNDS.x + BOUNDS.w - 10 &&
         y > BOUNDS.y + 10 && y < BOUNDS.y + BOUNDS.h - 10;
}

const decorCache = new Map();

export function decorFor(levelIndex, level) {
  if (decorCache.has(levelIndex)) return decorCache.get(levelIndex);
  const rnd = mulberry32(7000 + levelIndex * 331);

  // --- cobblestones: a full floor of varied rounded stones ---
  const stones = [];
  for (let gy = 24; gy < PLAY_H - 20; gy += 17) {
    for (let gx = 24 + ((gy / 17) % 2) * 9; gx < PLAY_W - 24; gx += 18) {
      const jx = gx + (rnd() - 0.5) * 5;
      const jy = gy + (rnd() - 0.5) * 5;
      stones.push({ x: jx, y: jy, rx: 7 + rnd() * 3, ry: 5 + rnd() * 2.5, v: rnd() });
    }
  }

  // --- rugs in open floor: many, so the streets read as a lived-in bazaar ---
  const rugs = [];
  const rugCols = [
    ['#7a2e35', '#c98a2e', '#2e5d6b'],
    ['#2e5d3a', '#c98a2e', '#7a2e35'],
    ['#4a2e6b', '#c9a22e', '#2e7d6b'],
  ];
  for (let i = 0; i < 8; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const x = 60 + rnd() * (PLAY_W - 250);
      const y = 60 + rnd() * (PLAY_H - 180);
      const w = 95 + rnd() * 55;
      const h = 52 + rnd() * 22;
      if (clearOf(x + w / 2, y + h / 2, Math.max(w, h) / 2, level)) {
        rugs.push({ x, y, w, h, cols: rugCols[i % rugCols.length], rot: (rnd() - 0.5) * 0.12 });
        break;
      }
    }
  }

  // --- puddles (rain-slick market floor, lantern light shimmers in them) ---
  const puddles = [];
  for (let i = 0; i < 4; i++) {
    for (let tries = 0; tries < 60; tries++) {
      const x = 80 + rnd() * (PLAY_W - 260);
      const y = 80 + rnd() * (PLAY_H - 200);
      if (clearOf(x, y, 52, level)) { puddles.push({ x, y, rx: 46 + rnd() * 22, ry: 15 + rnd() * 8 }); break; }
    }
  }

  // --- props: crates, barrels, baskets, sacks, carts, plants, grass,
  // vases, flat goods-mats — dense, like a real bazaar. Purely visual:
  // guards walk through them, detection ignores them, nothing here is
  // solid, so no path or sightline can ever break. ---
  const kinds = ['crate', 'barrel', 'basket', 'sack', 'crate', 'barrel', 'basket', 'cart', 'plant', 'grass', 'vase', 'mat', 'plant', 'grass', 'basket', 'sack'];
  const props = [];
  for (let i = 0; i < 64; i++) {
    for (let tries = 0; tries < 80; tries++) {
      const x = 40 + rnd() * (PLAY_W - 80);
      const y = 40 + rnd() * (PLAY_H - 80);
      const kind = kinds[i % kinds.length];
      const r = kind === 'cart' ? 46 : kind === 'mat' ? 30 : (kind === 'plant' || kind === 'grass' || kind === 'vase') ? 16 : 22;
      if (clearOf(x, y, r, level)) {
        props.push({ kind, x, y, s: 0.85 + rnd() * 0.4, rot: (rnd() - 0.5) * 0.5, v: rnd() });
        break;
      }
    }
  }

  // --- hanging banners from the top wall: a row of them, wall to wall ---
  const banners = [];
  const bannerHues = ['#a33327', '#2e6b7d', '#7a4a8a', '#b4552d', '#2e7d6b'];
  for (let i = 0; i < 7; i++) {
    banners.push({ x: 140 + i * ((PLAY_W - 280) / 6) + rnd() * 50, hue: bannerHues[i % bannerHues.length], len: 52 + rnd() * 22 });
  }

  // --- hanging lanterns along the bottom wall: small, dim, clearly wall
  // dressing — no post, no HACK label, never mistaken for an objective ---
  const hangLanterns = [];
  for (let i = 0; i < 4; i++) {
    hangLanterns.push({ x: 380 + i * 360 + rnd() * 40, y: 852, phase: rnd() * 9 });
  }

  // --- wall torches (left + right walls) ---
  const torches = [
    { x: 16, y: 180, side: 1 }, { x: 16, y: 450, side: 1 }, { x: 16, y: 680, side: 1 },
    { x: PLAY_W - 16, y: 120, side: -1 }, { x: PLAY_W - 16, y: 300, side: -1 }, { x: PLAY_W - 16, y: 720, side: -1 },
  ];

  // --- shoppers: small cloaked figures wandering slow loops in open lanes ---
  const npcs = [];
  const npcHues = ['#8a6d4a', '#6b7d8a', '#7d5a6e', '#5a7d4a', '#9a7a3a', '#6b5a8a', '#a87d4a', '#4a7d8a', '#8a4a5a'];
  for (let i = 0; i < 9; i++) {
    const loop = [];
    for (let tries = 0; tries < 60 && loop.length < 4; tries++) {
      const x = 70 + rnd() * (PLAY_W - 140);
      const y = 70 + rnd() * (PLAY_H - 140);
      if (clearOf(x, y, 26, level)) loop.push({ x, y });
    }
    if (loop.length >= 3) {
      npcs.push({ loop, speed: 9 + rnd() * 6, phase: rnd() * 20, hue: npcHues[i % npcHues.length], bob: rnd() * 6 });
    }
  }

  // --- cats dozing by stalls ---
  const cats = [];
  for (let i = 0; i < 4; i++) {
    for (let tries = 0; tries < 40; tries++) {
      const s = level.stalls[Math.floor(rnd() * level.stalls.length)];
      const x = s.x + s.w / 2 + (rnd() - 0.5) * (s.w + 60);
      const y = s.y + s.h + 26 + rnd() * 10;
      if (clearOf(x, y, 18, level)) { cats.push({ x, y, phase: rnd() * 9 }); break; }
    }
  }

  // --- dust motes + fireflies in the shadow zones ---
  const dust = [];
  for (let i = 0; i < 110; i++) {
    dust.push({ x: 20 + rnd() * (PLAY_W - 40), y: 20 + rnd() * (PLAY_H - 40), r: 0.8 + rnd() * 1.6, phase: rnd() * 12, drift: 3 + rnd() * 7 });
  }
  const fireflies = [];
  for (const s of level.shadows) {
    for (let i = 0; i < 4; i++) {
      fireflies.push({ x: s.x + 12 + rnd() * (s.w - 24), y: s.y + 12 + rnd() * (s.h - 24), phase: rnd() * 9 });
    }
  }

  // --- smoke sources: food / spice stalls breathe thin smoke ---
  const smoke = [];
  level.stalls.forEach((s, i) => {
    const g = goodsFor(i);
    if (g === 'spice' || g === 'bread' || g === 'fruit') {
      smoke.push({ x: s.x + s.w * (0.25 + rnd() * 0.5), y: s.y + 4 });
    }
  });

  const decor = { stones, rugs, puddles, props, banners, hangLanterns, torches, npcs, cats, dust, fireflies, smoke };
  decorCache.set(levelIndex, decor);
  return decor;
}
