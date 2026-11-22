// render.js — everything the eye sees: the HD night market.
// One job: draw the current game state on the canvas.
// The market is BUSY and alive: cobblestone floor, patterned rugs, slick
// puddles, stalls piled with goods, crates and carts, banners, torches,
// wandering shoppers, dozing cats, smoke, dust and fireflies — but the
// stealth readability never bends: orange vision cones, shadow-cover zones,
// lantern objectives and the locked exit stay instantly legible on top.

import { conePolygon, band } from './guards.js';
import { decorFor, goodsFor } from './decor.js';
import { PLAY_W as W, PLAY_H as H } from './levels.js';

// --- the static floor: cobbles + rugs + puddle bases + brick walls,
// painted once per level onto an offscreen canvas, then blitted. ---
const floorCache = new Map();
function floorCanvas(levelIndex, level) {
  if (floorCache.has(levelIndex)) return floorCache.get(levelIndex);
  const decor = decorFor(levelIndex, level);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  // night base
  g.fillStyle = '#0c1220';
  g.fillRect(0, 0, W, H);

  // cobblestones: LARGE, dark, low-contrast stones — a calm floor that
  // stops fighting the gameplay. The value range is narrow and dark, so
  // cones, lanterns and the thief pop against it.
  for (const s of decor.stones) {
    const v = s.v;
    const r = Math.floor(18 + v * 8);
    const gg = Math.floor(22 + v * 10);
    const b = Math.floor(34 + v * 14);
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.beginPath();
    g.ellipse(s.x, s.y, s.rx * 1.5, s.ry * 1.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,220,160,0.03)';
    g.beginPath();
    g.ellipse(s.x - 2, s.y - 2, s.rx * 0.8, s.ry * 0.6, 0, 0, Math.PI * 2);
    g.fill();
  }

  // a unifying night wash over the stones, then faint large-tile seams
  // so the floor reads as big calm slabs, not static noise
  g.fillStyle = 'rgba(8,12,24,0.42)';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,220,160,0.035)';
  g.lineWidth = 1;
  for (let x = 200; x < W; x += 200) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  for (let y = 200; y < H; y += 200) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }

  // patterned rugs
  for (const rug of decor.rugs) {
    g.save();
    g.translate(rug.x + rug.w / 2, rug.y + rug.h / 2);
    g.rotate(rug.rot);
    g.fillStyle = rug.cols[0];
    g.fillRect(-rug.w / 2, -rug.h / 2, rug.w, rug.h);
    g.strokeStyle = rug.cols[1];
    g.lineWidth = 3;
    g.strokeRect(-rug.w / 2 + 7, -rug.h / 2 + 7, rug.w - 14, rug.h - 14);
    g.fillStyle = rug.cols[2];
    for (let i = 0; i < 3; i++) {
      const dx = -rug.w / 4 + (i * rug.w) / 4;
      g.save();
      g.translate(dx, 0);
      g.rotate(Math.PI / 4);
      g.fillRect(-8, -8, 16, 16);
      g.restore();
    }
    g.strokeStyle = rug.cols[1];
    g.lineWidth = 1.5;
    for (let fx = -rug.w / 2 + 4; fx < rug.w / 2; fx += 8) {
      g.beginPath(); g.moveTo(fx, -rug.h / 2 - 5); g.lineTo(fx, -rug.h / 2); g.stroke();
      g.beginPath(); g.moveTo(fx, rug.h / 2); g.lineTo(fx, rug.h / 2 + 5); g.stroke();
    }
    g.restore();
  }

  // puddle bases: dark slick ovals (the shimmer is drawn live)
  for (const p of decor.puddles) {
    g.fillStyle = 'rgba(8,14,28,0.85)';
    g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,160,220,0.25)';
    g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); g.stroke();
  }

  // border walls: deep brick with raised courses, a lit inner edge and
  // a shadow falling into the floor — the walls read as tall, not flat
  g.fillStyle = '#161d2e';
  g.fillRect(0, 0, W, 16); g.fillRect(0, H - 16, W, 16);
  g.fillRect(0, 0, 16, H); g.fillRect(W - 16, 0, 16, H);
  // brick courses: horizontal joints every 8px, vertical joints offset
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = 1;
  for (let y = 8; y < 16; y += 8) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    g.beginPath(); g.moveTo(0, H - y); g.lineTo(W, H - y); g.stroke();
  }
  for (let x = 0; x < W; x += 32) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 8); g.stroke();
    g.beginPath(); g.moveTo(x + 16, 8); g.lineTo(x + 16, 16); g.stroke();
    g.beginPath(); g.moveTo(x, H - 16); g.lineTo(x, H - 8); g.stroke();
    g.beginPath(); g.moveTo(x + 16, H - 8); g.lineTo(x + 16, H); g.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(8, y); g.stroke();
    g.beginPath(); g.moveTo(8, y + 16); g.lineTo(16, y + 16); g.stroke();
    g.beginPath(); g.moveTo(W - 16, y); g.lineTo(W - 8, y); g.stroke();
    g.beginPath(); g.moveTo(W - 8, y + 16); g.lineTo(W, y + 16); g.stroke();
  }
  // raised inner edge: warm highlight on the wall's lip
  g.strokeStyle = 'rgba(255,220,150,0.28)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(16, 17); g.lineTo(W - 16, 17); g.stroke();
  g.beginPath(); g.moveTo(16, H - 17); g.lineTo(W - 16, H - 17); g.stroke();
  g.beginPath(); g.moveTo(17, 16); g.lineTo(17, H - 16); g.stroke();
  g.beginPath(); g.moveTo(W - 17, 16); g.lineTo(W - 17, H - 16); g.stroke();
  // inner shadow falling from the wall onto the floor
  const shT = g.createLinearGradient(0, 16, 0, 34);
  shT.addColorStop(0, 'rgba(0,0,0,0.5)'); shT.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shT; g.fillRect(16, 16, W - 32, 18);
  const shB = g.createLinearGradient(0, H - 16, 0, H - 34);
  shB.addColorStop(0, 'rgba(0,0,0,0.5)'); shB.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shB; g.fillRect(16, H - 34, W - 32, 18);
  const shL = g.createLinearGradient(16, 0, 34, 0);
  shL.addColorStop(0, 'rgba(0,0,0,0.5)'); shL.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shL; g.fillRect(16, 16, 18, H - 32);
  const shR = g.createLinearGradient(W - 16, 0, W - 34, 0);
  shR.addColorStop(0, 'rgba(0,0,0,0.5)'); shR.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shR; g.fillRect(W - 34, 16, 18, H - 32);

  floorCache.set(levelIndex, c);
  return c;
}

// --- the light canvas for the night lighting pass (one per page) ---
let lightCanvas = null;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function npcPos(npc, time) {
  const loop = npc.loop;
  let total = 0;
  const segs = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, start: total });
    total += len;
  }
  let d = (time * npc.speed + npc.phase * 40) % total;
  for (const s of segs) {
    if (d <= s.start + s.len) {
      const t = s.len === 0 ? 0 : (d - s.start) / s.len;
      return {
        x: s.a.x + (s.b.x - s.a.x) * t,
        y: s.a.y + (s.b.y - s.a.y) * t,
        ang: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
      };
    }
  }
  return { x: loop[0].x, y: loop[0].y, ang: 0 };
}

function drawGoods(ctx, type, x, y, w, h, time) {
  // Goods piled on the stall counter, inside the stall rect.
  const cx = x + w / 2;
  const cy = y + h * 0.62;
  if (type === 'fruit') {
    const cols = ['#ff7a2a', '#e33d2e', '#8fbf3f', '#ffb347'];
    for (let i = 0; i < 14; i++) {
      const fx = x + 8 + (i % 7) * ((w - 16) / 6);
      const fy = cy - Math.floor(i / 7) * 11 + 8;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(fx - 2, fy - 2, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'fabric') {
    const cols = ['#c94f6d', '#4f8ac9', '#c9a24f', '#7d4fc9'];
    for (let i = 0; i < 6; i++) {
      const bx = x + 6 + i * ((w - 12) / 6);
      ctx.fillStyle = cols[i % cols.length];
      roundRect(ctx, bx, cy - 16, (w - 12) / 6 - 3, 22, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(bx + 2, cy - 13, (w - 12) / 6 - 7, 3);
    }
  } else if (type === 'pottery') {
    const cols = ['#b5673a', '#7d6b4f', '#9a4a3a', '#c98a5a'];
    for (let i = 0; i < 4; i++) {
      const jx = x + w * (0.16 + i * 0.23);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(jx, cy, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(jx - 4, cy - 19, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(jx - 3, cy - 4, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (type === 'lanterns') {
    for (let i = 0; i < 4; i++) {
      const lx = x + w * (0.16 + i * 0.23);
      const flick = 0.8 + 0.2 * Math.sin(time * 5 + i * 2.1);
      const g = ctx.createRadialGradient(lx, cy - 6, 2, lx, cy - 6, 22);
      g.addColorStop(0, `rgba(255,190,90,${0.5 * flick})`);
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, cy - 6, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,205,110,${0.95 * flick})`;
      ctx.beginPath(); ctx.ellipse(lx, cy - 6, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a5a1a';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx, cy - 16); ctx.lineTo(lx, cy - 24); ctx.stroke();
    }
  } else if (type === 'spice') {
    const cols = ['#d43d1a', '#e8a91c', '#7d9a1a', '#a34a7d'];
    for (let i = 0; i < 6; i++) {
      const sx = x + 8 + i * ((w - 16) / 6);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(sx - 8, cy + 8); ctx.lineTo(sx, cy - 10); ctx.lineTo(sx + 8, cy + 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(sx - 2, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
    }
  } else { // bread
    const cols = ['#c98a3a', '#a86a2a', '#d9a85a'];
    for (let i = 0; i < 6; i++) {
      const bx = x + 8 + i * ((w - 16) / 6);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(bx, cy, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,50,10,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 5, cy - 2); ctx.lineTo(bx + 5, cy - 2); ctx.stroke();
    }
  }
}

const GOODS_LABEL = { fruit: 'FRUIT', fabric: 'SILK', pottery: 'POTS', lanterns: 'LIGHTS', spice: 'SPICE', bread: 'BREAD' };

function drawProp(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  const s = p.s;
  ctx.scale(s, s);
  if (p.kind === 'crate') {
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(11, 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, -11); ctx.lineTo(-11, 11); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.12)';
    ctx.fillRect(-11, -11, 22, 5);
  } else if (p.kind === 'barrel') {
    ctx.fillStyle = '#7a5230';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e1c0c';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -6, 9, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 6, 9, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.14)';
    ctx.beginPath(); ctx.ellipse(-3, -4, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'basket') {
    ctx.fillStyle = '#9a7a3a';
    ctx.beginPath();
    ctx.moveTo(-11, -6); ctx.lineTo(11, -6); ctx.lineTo(8, 9); ctx.lineTo(-8, 9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4218';
    ctx.lineWidth = 1;
    for (let yy = -3; yy < 8; yy += 4) {
      ctx.beginPath(); ctx.moveTo(-10, yy); ctx.lineTo(10, yy); ctx.stroke();
    }
    ctx.fillStyle = '#c94f3a';
    ctx.beginPath(); ctx.arc(-4, -8, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fbf3f';
    ctx.beginPath(); ctx.arc(4, -8, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'plant') {
    // potted plant: terracotta pot + green leaves (local coords, 0,0 = centre)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 10, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a8542a';
    ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.lineTo(6, 11); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d7a34';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 8, -2 + Math.sin(a) * 9, 3.5, 9, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5da347';
    ctx.beginPath(); ctx.ellipse(-3, -11, 3, 7, -0.4, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'grass') {
    // tall grass tuft: thin blades, soft and low
    ctx.strokeStyle = '#4a7a3a';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const bx = -9 + i * 3;
      const lean = (i - 3) * 1.4;
      ctx.beginPath();
      ctx.moveTo(bx, 8);
      ctx.quadraticCurveTo(bx + lean, -2, bx + lean * 1.8, -10 - (i % 3) * 3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6a9a4a';
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(-2, -2, -6, -13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.quadraticCurveTo(3, -2, 8, -12); ctx.stroke();
  } else if (p.kind === 'vase') {
    // tall ceramic vase, glazed blue
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e5d7d';
    ctx.beginPath();
    ctx.moveTo(-5, -12); ctx.lineTo(5, -12); ctx.lineTo(3, -6);
    ctx.quadraticCurveTo(9, 2, 6, 10);
    ctx.lineTo(-6, 10); ctx.quadraticCurveTo(-9, 2, -3, -6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-5, -8, 2.5, 14);
    ctx.fillStyle = '#c9a24f';
    ctx.fillRect(-6, -13, 12, 2.5);
  } else if (p.kind === 'mat') {
    // flat woven mat with goods on it: clearly floor dressing, never solid
    ctx.fillStyle = '#7a5a2e';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6a35';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2); ctx.stroke();
    const cols = ['#ff7a2a', '#e33d2e', '#8fbf3f', '#d43d1a', '#e8a91c'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.arc(-12 + i * 5, -3 + (i % 2) * 6, 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (p.kind === 'sack') {
    ctx.fillStyle = '#a88f68';
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a7350';
    ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(5, -6); ctx.lineTo(2, -13); ctx.lineTo(-2, -13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,15,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.stroke();
  } else { // cart
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(-20, -8, 40, 14);
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-20, -8, 40, 14);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(-16, -14, 32, 7);
    ctx.fillStyle = '#c94f3a';
    ctx.beginPath(); ctx.arc(-8, -16, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fbf3f';
    ctx.beginPath(); ctx.arc(6, -16, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e1c0c';
    ctx.lineWidth = 2;
    for (const wx of [-12, 12]) {
      ctx.beginPath(); ctx.arc(wx, 10, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx - 6, 10); ctx.lineTo(wx + 6, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx, 4); ctx.lineTo(wx, 16); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawObstacle(ctx, o, time) {
  // A soft ground shadow so the obstacle reads as solid and tall.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(o.x + o.w / 2 + 3, o.y + o.h - 2, o.w / 2, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (o.type === 'crates') {
    // Stacked wooden crates: big base crate + a smaller one on top.
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x + o.w, o.y); ctx.lineTo(o.x, o.y + o.h); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let yy = o.y + o.h / 3; yy < o.y + o.h; yy += o.h / 3) {
      ctx.beginPath(); ctx.moveTo(o.x, yy); ctx.lineTo(o.x + o.w, yy); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,220,150,0.12)';
    ctx.fillRect(o.x, o.y, o.w, 7);
    const s2 = Math.min(34, o.w * 0.55);
    ctx.fillStyle = '#7a5530';
    ctx.fillRect(o.x + o.w - s2 - 6, o.y - s2 + 10, s2, s2);
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(o.x + o.w - s2 - 6, o.y - s2 + 10, s2, s2);
    ctx.beginPath();
    ctx.moveTo(o.x + o.w - s2 - 6, o.y - s2 + 10);
    ctx.lineTo(o.x + o.w - 6, o.y + 10);
    ctx.stroke();
  } else if (o.type === 'wall') {
    // Low stone wall: grey-blue bricks in offset courses, a lit cap on
    // top and a shadow falling at its foot, so it reads as tall.
    ctx.fillStyle = '#3a4358';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    const rows = o.h >= 100 ? 5 : 2;
    for (let r = 0; r < rows; r++) {
      const yy = o.y + (r * o.h) / rows;
      ctx.beginPath(); ctx.moveTo(o.x, yy); ctx.lineTo(o.x + o.w, yy); ctx.stroke();
      const off = (r % 2) * 16;
      for (let xx = o.x + off; xx < o.x + o.w; xx += 32) {
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(yy + o.h / rows, o.y + o.h)); ctx.stroke();
      }
    }
    ctx.fillStyle = '#6a7a9a';
    ctx.fillRect(o.x, o.y, o.w, 6);
    ctx.fillStyle = 'rgba(255,230,180,0.22)';
    ctx.fillRect(o.x, o.y + 6, o.w, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(o.x, o.y + o.h - 6, o.w, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, o.y + o.h + 3, o.w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.type === 'fence') {
    // Rope barrier: two posts + two sagging ropes.
    const horizontal = o.w >= o.h;
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 5;
    if (horizontal) {
      for (const px of [o.x + 4, o.x + o.w - 4]) {
        ctx.beginPath(); ctx.moveTo(px, o.y + 2); ctx.lineTo(px, o.y + o.h - 2); ctx.stroke();
      }
      ctx.strokeStyle = '#c9a24f';
      ctx.lineWidth = 2.5;
      for (const ry of [o.y + 8, o.y + o.h - 8]) {
        ctx.beginPath();
        ctx.moveTo(o.x + 4, ry);
        ctx.quadraticCurveTo(o.x + o.w / 2, ry + 7, o.x + o.w - 4, ry);
        ctx.stroke();
      }
    } else {
      for (const py of [o.y + 4, o.y + o.h - 4]) {
        ctx.beginPath(); ctx.moveTo(o.x + 2, py); ctx.lineTo(o.x + o.w - 2, py); ctx.stroke();
      }
      ctx.strokeStyle = '#c9a24f';
      ctx.lineWidth = 2.5;
      for (const rx of [o.x + 8, o.x + o.w - 8]) {
        ctx.beginPath();
        ctx.moveTo(rx, o.y + 4);
        ctx.quadraticCurveTo(rx + 7, o.y + o.h / 2, rx, o.y + o.h - 4);
        ctx.stroke();
      }
    }
  } else if (o.type === 'cart') {
    // Market cart: wooden bed, slatted sides, big spoked wheels, goods.
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(o.x, o.y + 8, o.w, o.h - 18);
    ctx.strokeStyle = '#3d2a14';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(o.x, o.y + 8, o.w, o.h - 18);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(o.x + 4, o.y, o.w - 8, 10);
    ctx.fillStyle = '#c94f3a';
    ctx.beginPath(); ctx.arc(o.x + o.w * 0.3, o.y - 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8fbf3f';
    ctx.beginPath(); ctx.arc(o.x + o.w * 0.6, o.y - 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(o.x + o.w * 0.8, o.y - 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e1c0c';
    ctx.lineWidth = 2;
    for (const wx of [o.x + 14, o.x + o.w - 14]) {
      ctx.beginPath(); ctx.arc(wx, o.y + o.h - 8, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx - 8, o.y + o.h - 8); ctx.lineTo(wx + 8, o.y + o.h - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx, o.y + o.h - 16); ctx.lineTo(wx, o.y + o.h); ctx.stroke();
    }
  } else { // sacks
    const cols = ['#a88f68', '#8a7350', '#b59a72'];
    const spots = [[0.3, 0.62], [0.62, 0.68], [0.46, 0.38]];
    spots.forEach(([fx, fy], i) => {
      const sx = o.x + o.w * fx;
      const sy = o.y + o.h * fy;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(sx, sy, o.w * 0.26, o.h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a7350';
      ctx.beginPath(); ctx.moveTo(sx - 6, sy - o.h * 0.26); ctx.lineTo(sx + 6, sy - o.h * 0.26); ctx.lineTo(sx + 2, sy - o.h * 0.38); ctx.lineTo(sx - 2, sy - o.h * 0.38); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,15,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx - o.w * 0.2, sy - o.h * 0.22); ctx.lineTo(sx + o.w * 0.2, sy - o.h * 0.22); ctx.stroke();
    });
  }
  // thin bright rim so the obstacle reads as cover, not floor
  ctx.strokeStyle = 'rgba(255,220,150,0.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(o.x + 0.5, o.y + 0.5, o.w - 1, o.h - 1);
}

export function drawScene(ctx, game, time) {
  const level = game.level;
  const player = game.player;
  const decor = decorFor(game.levelIndex, level);

  // --- floor (pre-rendered cobbles, rugs, puddles, brick walls) ---
  ctx.drawImage(floorCanvas(game.levelIndex, level), 0, 0);

  // --- puddle shimmer: a thin moving highlight in each puddle ---
  for (const p of decor.puddles) {
    const sh = 0.10 + 0.08 * Math.sin(time * 1.7 + p.x * 0.05);
    ctx.strokeStyle = `rgba(190,220,255,${sh})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx * 0.7, p.ry * 0.55, 0, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,200,120,${sh * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(p.x + 8, p.y + 3, p.rx * 0.4, p.ry * 0.35, 0, Math.PI * 0.1, Math.PI * 0.5);
    ctx.stroke();
  }

  // --- shadow cover zones (safe dark, with tufts + fireflies) ---
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(4,8,20,0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(90,160,220,0.5)';
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(90,160,220,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
    ctx.fillStyle = 'rgba(120,180,235,0.75)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SHADOW COVER', s.x + 8, s.y + 16);
    // dark grass tufts inside the safe dark
    ctx.strokeStyle = 'rgba(60,140,90,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const gx = s.x + 14 + i * ((s.w - 28) / 4);
      const gy = s.y + s.h - 12 - (i % 2) * 8;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 3, gy - 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 3, gy - 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 11); ctx.stroke();
    }
  }

  // --- fireflies drifting in the shadow zones ---
  for (const f of decor.fireflies) {
    const a = 0.25 + 0.6 * Math.abs(Math.sin(time * 1.3 + f.phase));
    ctx.fillStyle = `rgba(190,255,120,${a})`;
    ctx.beginPath();
    ctx.arc(f.x + Math.sin(time * 0.6 + f.phase) * 4, f.y + Math.cos(time * 0.8 + f.phase) * 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- patrol paths: faint dotted rings showing where wardens walk ---
  for (const guard of game.guards) {
    ctx.strokeStyle = 'rgba(255,180,80,0.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(guard.path[0][0], guard.path[0][1]);
    for (let i = 1; i < guard.path.length; i++) ctx.lineTo(guard.path[i][0], guard.path[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const wp of guard.path) {
      ctx.fillStyle = 'rgba(255,180,80,0.20)';
      ctx.beginPath(); ctx.arc(wp[0], wp[1], 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- shoppers + cats (pure atmosphere: never solid, never seen) ---
  for (const npc of decor.npcs) {
    const pos = npcPos(npc, time);
    const bob = Math.sin(time * 3 + npc.bob) * 1.2;
    ctx.fillStyle = npc.hue;
    ctx.beginPath(); ctx.ellipse(pos.x, pos.y + bob, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2118';
    ctx.beginPath(); ctx.arc(pos.x, pos.y - 9 + bob, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = npc.hue;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y + 4 + bob); ctx.lineTo(pos.x + Math.cos(pos.ang) * 8, pos.y + 4 + bob + Math.sin(pos.ang) * 8); ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.5)';
    ctx.beginPath(); ctx.arc(pos.x, pos.y - 9 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const cat of decor.cats) {
    const tail = Math.sin(time * 1.4 + cat.phase) * 5;
    ctx.fillStyle = '#1c1a26';
    ctx.beginPath(); ctx.ellipse(cat.x, cat.y, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cat.x + 7, cat.y - 5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cat.x + 4, cat.y - 9); ctx.lineTo(cat.x + 6, cat.y - 13); ctx.lineTo(cat.x + 8, cat.y - 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1c1a26';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cat.x - 8, cat.y + 2); ctx.quadraticCurveTo(cat.x - 14, cat.y - 4, cat.x - 12 + tail, cat.y - 9); ctx.stroke();
  }

  // --- stalls: wooden counter, striped awning, goods piled high ---
  level.stalls.forEach((s, i) => {
    const goods = goodsFor(i);
    // soft ground shadow so the stall sits ON the floor, not in it
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + s.h + 3, s.w / 2 + 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // warm light spilling from inside the stall
    const sg = ctx.createRadialGradient(s.x + s.w / 2, s.y + s.h * 0.55, 6, s.x + s.w / 2, s.y + s.h * 0.55, s.w * 0.75);
    sg.addColorStop(0, 'rgba(255,175,80,0.20)');
    sg.addColorStop(1, 'rgba(255,175,80,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(s.x - 12, s.y - 6, s.w + 24, s.h + 18);
    // counter body: planks
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(s.x + 3, s.y + 19, s.w - 6, s.h - 22);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    for (let py = s.y + 30; py < s.y + s.h - 4; py += 11) {
      ctx.beginPath(); ctx.moveTo(s.x + 3, py); ctx.lineTo(s.x + s.w - 3, py); ctx.stroke();
    }
    // awning: hue stripes + scalloped edge
    ctx.fillStyle = s.hue;
    ctx.fillRect(s.x, s.y, s.w, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    for (let x = s.x + 8; x < s.x + s.w - 8; x += 22) ctx.fillRect(x, s.y, 10, 16);
    ctx.fillStyle = s.hue;
    for (let x = s.x; x < s.x + s.w; x += 14) {
      ctx.beginPath(); ctx.arc(x + 7, s.y + 16, 7, 0, Math.PI); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(200,220,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    // goods on the counter
    drawGoods(ctx, goods, s.x + 4, s.y + 16, s.w - 8, s.h - 20, time);
    // goods label
    ctx.fillStyle = 'rgba(255,230,170,0.85)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(GOODS_LABEL[goods], s.x + s.w / 2, s.y + s.h - 4);
  });

  // --- obstacles: solid cover that blocks movement AND vision ---
  // Drawn in the same HD style as the stalls: wood, stone, rope, canvas.
  for (const o of level.obstacles || []) drawObstacle(ctx, o, time);

  // --- props: crates, barrels, baskets, sacks, carts ---
  for (const p of decor.props) drawProp(ctx, p, time);

  // --- hanging banners from the top wall ---
  for (const b of decor.banners) {
    const sway = Math.sin(time * 0.6 + b.x * 0.01) * 0.03;
    ctx.save();
    ctx.translate(b.x, 16);
    ctx.rotate(sway);
    ctx.fillStyle = b.hue;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(16, b.len - 12);
    ctx.lineTo(0, b.len); ctx.lineTo(-16, b.len - 12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,150,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(0, b.len * 0.45, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.hue;
    ctx.beginPath(); ctx.arc(0, b.len * 0.45, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // --- wall torches: flickering flames (their light comes from the
  // lighting pass below, so no radial gradient is drawn here) ---
  for (const t of decor.torches) {
    const flick = 0.8 + 0.2 * Math.sin(time * 7 + t.y);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(t.x - 3, t.y - 2, 6, 12);
    const fh = 10 + 3 * Math.sin(time * 9 + t.y * 0.3);
    ctx.fillStyle = `rgba(255,${140 + Math.floor(40 * flick)},40,0.95)`;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 4 - fh);
    ctx.quadraticCurveTo(t.x + 5, t.y - 4, t.x, t.y - 2);
    ctx.quadraticCurveTo(t.x - 5, t.y - 4, t.x, t.y - 4 - fh);
    ctx.fill();
  }

  // --- hanging lanterns along the bottom wall: small, dim wall dressing ---
  for (const hl of decor.hangLanterns || []) {
    const flick = 0.85 + 0.15 * Math.sin(time * 4 + hl.phase);
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hl.x, 884); ctx.lineTo(hl.x, hl.y - 8); ctx.stroke();
    const hg = ctx.createRadialGradient(hl.x, hl.y, 2, hl.x, hl.y, 26);
    hg.addColorStop(0, `rgba(255,190,90,${0.35 * flick})`);
    hg.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hl.x, hl.y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,200,110,${0.9 * flick})`;
    ctx.beginPath(); ctx.ellipse(hl.x, hl.y, 6, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a86a1a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(hl.x, hl.y, 6, 7.5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // --- exit gate: stone arch + portcullis ---
  const exitOpen = level.lanterns.every((l) => l.hacked);
  const ex = level.exit;
  ctx.fillStyle = '#232f4a';
  ctx.fillRect(ex.x - 6, ex.y - 8, 8, ex.h + 8);
  ctx.fillRect(ex.x + ex.w - 2, ex.y - 8, 8, ex.h + 8);
  ctx.fillRect(ex.x - 6, ex.y - 8, ex.w + 12, 10);
  ctx.fillStyle = exitOpen ? 'rgba(55,214,122,0.30)' : 'rgba(214,69,69,0.20)';
  ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
  ctx.strokeStyle = exitOpen ? '#37d67a' : '#ff5a5a';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
  // portcullis bars
  ctx.strokeStyle = exitOpen ? 'rgba(55,214,122,0.8)' : 'rgba(255,122,122,0.85)';
  ctx.lineWidth = 2;
  const barTop = exitOpen ? ex.y + ex.h - 16 : ex.y + 4;
  for (let bx = ex.x + 8; bx < ex.x + ex.w - 4; bx += 10) {
    ctx.beginPath(); ctx.moveTo(bx, barTop); ctx.lineTo(bx, ex.y + ex.h - 2); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(ex.x + 2, ex.y + ex.h / 2); ctx.lineTo(ex.x + ex.w - 2, ex.y + ex.h / 2); ctx.stroke();
  if (!exitOpen) {
    ctx.fillStyle = '#ffd24d';
    ctx.fillRect(ex.x + ex.w / 2 - 5, ex.y + ex.h / 2 - 2, 10, 9);
    ctx.strokeStyle = '#ffd24d';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex.x + ex.w / 2, ex.y + ex.h / 2 - 2, 4, Math.PI, 0); ctx.stroke();
  }
  ctx.fillStyle = exitOpen ? '#37d67a' : '#ff7a7a';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y - 14);
  ctx.fillText(exitOpen ? 'OPEN' : 'LOCKED', ex.x + ex.w / 2, ex.y + ex.h + 16);

  // --- lanterns (objectives): standing paper lanterns on posts ---
  for (const l of level.lanterns) {
    if (l.hacked) {
      ctx.strokeStyle = '#37d67a';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(l.x, l.y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓', l.x, l.y + 6);
      continue;
    }
    const flick = 0.8 + 0.2 * Math.sin(time * 4 + l.x * 0.7);
    // post
    ctx.strokeStyle = '#4a3220';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(l.x, l.y + 12); ctx.lineTo(l.x, l.y + 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l.x, l.y + 26); ctx.lineTo(l.x - 10, l.y + 26); ctx.stroke();
    // glow halo
    const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 34);
    g.addColorStop(0, `rgba(255,200,100,${0.55 * flick})`);
    g.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, 34, 0, Math.PI * 2); ctx.fill();
    // paper body with ribs
    ctx.fillStyle = `rgba(255,190,80,${0.95 * flick})`;
    ctx.beginPath(); ctx.ellipse(l.x, l.y, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a86a1a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(l.x, l.y, 10, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l.x - 10, l.y - 4); ctx.lineTo(l.x + 10, l.y - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l.x - 10, l.y + 4); ctx.lineTo(l.x + 10, l.y + 4); ctx.stroke();
    ctx.fillStyle = '#8a5a1a';
    ctx.fillRect(l.x - 4, l.y - 15, 8, 4);
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HACK [E]', l.x, l.y - 26);
    if (player.hackTarget >= 0 && level.lanterns[player.hackTarget] === l) {
      ctx.strokeStyle = '#35d0c5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * player.hackProgress);
      ctx.stroke();
    }
  }

  // --- LIGHTING PASS: the market falls into night, and warm lamp pools
  // cut holes in the dark. A separate light canvas is filled dark, then
  // radial holes are punched out at every light source (lanterns,
  // torches, hanging lanterns, the open exit, the thief's own glint),
  // so unlit floor goes deep and lit floor glows — depth through light,
  // like the top-ranked entries. ---
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = W; lightCanvas.height = H;
  }
  const lg = lightCanvas.getContext('2d');
  lg.clearRect(0, 0, W, H);
  lg.globalCompositeOperation = 'source-over';
  lg.fillStyle = 'rgba(5,8,18,0.42)';
  lg.fillRect(0, 0, W, H);
  lg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const g = lg.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.55})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lg.fillStyle = g;
    lg.beginPath(); lg.arc(x, y, r, 0, Math.PI * 2); lg.fill();
  };
  for (const l of level.lanterns) {
    if (l.hacked) continue;
    const flick = 0.8 + 0.2 * Math.sin(time * 3 + l.x);
    hole(l.x, l.y, 230, 0.9 * flick);
  }
  for (const t of decor.torches) hole(t.x, t.y, 130, 0.7);
  for (const hl of decor.hangLanterns || []) hole(hl.x, hl.y, 60, 0.5);
  if (exitOpen) hole(level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2, 130, 0.6);
  hole(player.x, player.y, 110, 0.5);
  lg.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);
  // warm tint inside the pools so the light feels golden, not just less dark
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of level.lanterns) {
    if (l.hacked) continue;
    const flick = 0.8 + 0.2 * Math.sin(time * 3 + l.x);
    const wg = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, 200);
    wg.addColorStop(0, `rgba(255,175,80,${0.10 * flick})`);
    wg.addColorStop(1, 'rgba(255,175,80,0)');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.arc(l.x, l.y, 200, 0, Math.PI * 2); ctx.fill();
  }
  for (const t of decor.torches) {
    const wg = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 110);
    wg.addColorStop(0, 'rgba(255,170,60,0.08)');
    wg.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.arc(t.x, t.y, 110, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // --- vision cones (cover-blocked: raycast polygon), soft gradient
  // fill with a glowing edge, drawn OVER the dark so they read as light ---
  for (const guard of game.guards) {
    const poly = conePolygon(guard, game.solids);
    const alarmed = guard.mode === 'chase';
    const grad = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, guard.range);
    if (guard.elite) {
      grad.addColorStop(0, alarmed ? 'rgba(255,60,60,0.55)' : 'rgba(255,120,60,0.45)');
      grad.addColorStop(1, alarmed ? 'rgba(255,60,60,0.12)' : 'rgba(255,120,60,0.06)');
    } else {
      grad.addColorStop(0, alarmed ? 'rgba(255,70,40,0.52)' : 'rgba(255,155,45,0.42)');
      grad.addColorStop(1, alarmed ? 'rgba(255,70,40,0.10)' : 'rgba(255,155,45,0.05)');
    }
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    // glowing edge: a soft outer stroke + a bright inner line
    ctx.save();
    ctx.shadowColor = alarmed ? 'rgba(255,80,50,0.9)' : 'rgba(255,190,90,0.9)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = alarmed ? 'rgba(255,110,70,0.85)' : 'rgba(255,200,120,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = alarmed ? 'rgba(255,90,60,0.18)' : 'rgba(255,180,80,0.18)';
    ctx.lineWidth = 5;
    ctx.stroke();
    // dashed range arc at the cone's far edge
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = alarmed ? 'rgba(255,90,60,0.35)' : 'rgba(255,180,80,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.range, guard.facing - guard.halfAngle, guard.facing + guard.halfAngle);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- decoys ---
  for (const d of game.decoys) {
    ctx.fillStyle = '#ffd24d';
    ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,77,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d.x, d.y, 7 + (3 - d.t) * 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DECOY', d.x, d.y - 14);
  }

  // --- wardens: robed, helmeted, torch in hand — ringed + glowing so
  // they pop against the dark floor, like the top-ranked entries ---
  for (const guard of game.guards) {
    // warm halo + a hard ring around the warden: always readable
    const hg = ctx.createRadialGradient(guard.x, guard.y, 4, guard.x, guard.y, 36);
    hg.addColorStop(0, guard.elite ? 'rgba(255,70,40,0.30)' : 'rgba(255,150,50,0.28)');
    hg.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = guard.elite ? 'rgba(255,60,40,0.9)' : 'rgba(255,170,70,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 20, 0, Math.PI * 2); ctx.stroke();
    // torch glow in hand
    const flick = 0.8 + 0.2 * Math.sin(time * 8 + guard.x);
    const tg = ctx.createRadialGradient(guard.x, guard.y, 2, guard.x, guard.y, 30);
    tg.addColorStop(0, `rgba(255,170,60,${0.22 * flick})`);
    tg.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 30, 0, Math.PI * 2); ctx.fill();
    // robe body + shoulders
    ctx.fillStyle = guard.elite ? '#8a2a1a' : '#7a3a1a';
    ctx.beginPath(); ctx.ellipse(guard.x, guard.y + 2, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = guard.elite ? '#ff5a2a' : '#ff7a1a';
    ctx.beginPath(); ctx.arc(guard.x, guard.y - 2, 10, 0, Math.PI * 2); ctx.fill();
    // helmet + plume
    ctx.fillStyle = '#2a2a33';
    ctx.beginPath(); ctx.arc(guard.x, guard.y - 5, 7, Math.PI, 0); ctx.fill();
    ctx.fillStyle = guard.elite ? '#ff2d2d' : '#c9a24f';
    ctx.beginPath();
    ctx.moveTo(guard.x - 2, guard.y - 11);
    ctx.lineTo(guard.x + 2, guard.y - 11);
    ctx.lineTo(guard.x, guard.y - 18);
    ctx.closePath(); ctx.fill();
    // facing tick + torch flame
    ctx.strokeStyle = '#1a0e00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, guard.y + Math.sin(guard.facing) * 18);
    ctx.stroke();
    const fx = guard.x + Math.cos(guard.facing) * 20;
    const fy = guard.y + Math.sin(guard.facing) * 20;
    ctx.fillStyle = `rgba(255,${150 + Math.floor(50 * flick)},50,0.95)`;
    ctx.beginPath(); ctx.arc(fx, fy - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    if (guard.elite) {
      ctx.strokeStyle = '#ff2d2d';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(guard.x, guard.y, 17, 0, Math.PI * 2); ctx.stroke();
    }
    const mark = guard.mode === 'chase' ? '!' : guard.mode === 'investigate' ? '?' : null;
    if (mark) {
      // big alert bubble with a white rim — readable at a glance
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.arc(guard.x + 2, guard.y - 32, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mark === '!' ? '#ff3b30' : '#ffd24d';
      ctx.beginPath(); ctx.arc(guard.x, guard.y - 34, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(guard.x, guard.y - 34, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#1a0e00';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mark, guard.x, guard.y - 27);
    }
  }

  // --- the thief: hooded, belt lantern glinting — teal ring + glow ---
  ctx.save();
  ctx.shadowColor = 'rgba(53,208,197,0.9)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#35d0c5';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(player.x, player.y, 19, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  const thg = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 40);
  thg.addColorStop(0, 'rgba(53,208,197,0.30)');
  thg.addColorStop(1, 'rgba(53,208,197,0)');
  ctx.fillStyle = thg;
  ctx.beginPath(); ctx.arc(player.x, player.y, 40, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(53,208,197,0.25)';
  ctx.beginPath(); ctx.arc(player.x, player.y, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f8f86';
  ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#35d0c5';
  ctx.beginPath(); ctx.arc(player.x, player.y - 2, 9, 0, Math.PI * 2); ctx.fill();
  // hood point
  ctx.fillStyle = '#1f8f86';
  ctx.beginPath();
  ctx.moveTo(player.x - 7, player.y - 6);
  ctx.lineTo(player.x + Math.cos(player.facing) * 14, player.y + Math.sin(player.facing) * 14);
  ctx.lineTo(player.x + 7, player.y - 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0d2a28';
  ctx.beginPath(); ctx.arc(player.x + Math.cos(player.facing) * 4, player.y + Math.sin(player.facing) * 4 - 2, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#eafffb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.facing) * 18, player.y + Math.sin(player.facing) * 18);
  ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(player.x - 8, player.y + 8, 2.5, 0, Math.PI * 2); ctx.fill();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(53,208,197,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- annotation callouts, top-rank style: HIDDEN over a thief in
  // shadow, WHAT WAS THAT? beside an investigating warden ---
  const inShadow = level.shadows.some((s) => player.x >= s.x && player.x <= s.x + s.w && player.y >= s.y && player.y <= s.y + s.h);
  if (inShadow && game.screen === 'play') {
    const label = 'HIDDEN';
    ctx.font = 'bold 12px monospace';
    const lw = ctx.measureText(label).width + 18;
    const lx = Math.max(70, Math.min(W - 70 - lw, player.x - lw / 2));
    const ly = player.y - 52;
    ctx.fillStyle = 'rgba(6,20,20,0.88)';
    roundRect(ctx, lx, ly, lw, 20, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(53,208,197,0.9)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, lx, ly, lw, 20, 5); ctx.stroke();
    ctx.fillStyle = '#35d0c5';
    ctx.textAlign = 'center';
    ctx.fillText(label, lx + lw / 2, ly + 14);
    ctx.strokeStyle = 'rgba(53,208,197,0.7)';
    ctx.beginPath(); ctx.moveTo(player.x, ly + 20); ctx.lineTo(player.x, player.y - 22); ctx.stroke();
  }
  for (const guard of game.guards) {
    if (guard.mode !== 'investigate') continue;
    const label = 'WHAT WAS THAT?';
    ctx.font = 'bold 12px monospace';
    const lw = ctx.measureText(label).width + 18;
    const lx = Math.max(90, Math.min(W - 90 - lw, guard.x - lw - 40));
    const ly = Math.max(60, guard.y - 92);
    ctx.fillStyle = 'rgba(20,14,4,0.88)';
    roundRect(ctx, lx, ly, lw, 20, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,77,0.9)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, lx, ly, lw, 20, 5); ctx.stroke();
    ctx.fillStyle = '#ffd24d';
    ctx.textAlign = 'center';
    ctx.fillText(label, lx + lw / 2, ly + 14);
    ctx.strokeStyle = 'rgba(255,210,77,0.7)';
    ctx.beginPath(); ctx.moveTo(lx + lw - 6, ly + 18); ctx.lineTo(guard.x, guard.y - 50); ctx.stroke();
  }

  // --- footstep rings ---
  for (const p of game.rings) {
    const age = 1 - p.t / p.life;
    ctx.strokeStyle = `rgba(220,235,255,${0.5 * age})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - age) * 26, 0, Math.PI * 2); ctx.stroke();
  }

  // --- atmosphere: smoke wisps, dust, embers ---
  for (const s of decor.smoke) {
    for (let i = 0; i < 3; i++) {
      const ph = ((time * 0.25 + i / 3) % 1);
      const wy = s.y - ph * 46;
      const wx = s.x + Math.sin(time * 1.2 + i * 2 + s.x) * 6 * ph;
      ctx.fillStyle = `rgba(200,200,210,${0.10 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(wx, wy, 4 + ph * 7, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const d of decor.dust) {
    const dx = d.x + Math.sin(time * 0.12 + d.phase) * d.drift;
    const dy = 20 + ((d.y + time * 2) % (H - 40));
    ctx.fillStyle = `rgba(220,200,160,${0.10 + 0.08 * Math.sin(time + d.phase)})`;
    ctx.beginPath(); ctx.arc(dx, dy, d.r, 0, Math.PI * 2); ctx.fill();
  }
  for (const l of level.lanterns) {
    if (l.hacked) continue;
    for (let i = 0; i < 5; i++) {
      const ph = ((time * 0.4 + i / 5) % 1);
      const ex2 = l.x + Math.sin(i * 2.4 + time) * 8 * ph;
      const ey = l.y - ph * 30;
      ctx.fillStyle = `rgba(255,180,80,${0.5 * (1 - ph)})`;
      ctx.beginPath(); ctx.arc(ex2, ey, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- vignette: the market edges fall into night ---
  const vg = ctx.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 950);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  drawHud(ctx, game, time);
}

function drawHud(ctx, game, time) {
  const level = game.level;
  const hacked = level.lanterns.filter((l) => l.hacked).length;
  const exitOpen = hacked === level.lanterns.length;
  const b = band(game.detection);

  // keep the right-side FIELD NOTES panel in sync (DOM, cheap: only
  // touches the DOM when a value actually changes)
  updateSidePanel(game);

  // top bar with a gold rule
  ctx.fillStyle = 'rgba(6,10,20,0.94)';
  ctx.fillRect(0, 0, W, 36);
  const gold = ctx.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, 'rgba(201,162,47,0)');
  gold.addColorStop(0.5, 'rgba(201,162,47,0.9)');
  gold.addColorStop(1, 'rgba(201,162,47,0)');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 35, W, 1.5);
  ctx.fillStyle = '#35d0c5';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('EMBER MARKET // LANTERN THIEF', 14, 23);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${level.name}   ·   LANTERNS ${hacked}/${level.lanterns.length}   ·   EXIT ${exitOpen ? 'OPEN' : 'LOCKED'}`, W / 2, 23);
  // lantern pips (right of the centered level line, clear of its text)
  for (let i = 0; i < level.lanterns.length; i++) {
    const px = 1060 + i * 18;
    ctx.fillStyle = i < hacked ? '#37d67a' : '#8a6a2a';
    ctx.beginPath(); ctx.ellipse(px, 19, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'right';
  const detColor = b === 0 ? '#37d67a' : b === 1 ? '#ffd24d' : '#ff5a2a';
  ctx.fillStyle = detColor;
  ctx.fillText(`DETECTION ${Math.round(game.detection)}%`, 1230, 23);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, 1240, 13, 110, 10, 4); ctx.fill();
  const dg = ctx.createLinearGradient(1240, 0, 1350, 0);
  dg.addColorStop(0, '#37d67a');
  dg.addColorStop(0.5, '#ffd24d');
  dg.addColorStop(1, '#ff5a2a');
  ctx.fillStyle = dg;
  if (game.detection > 0) {
    roundRect(ctx, 1240, 13, Math.max(6, 110 * (game.detection / 100)), 10, 4); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(1240 + 44, 11, 1, 14);
  ctx.fillRect(1240 + 82, 11, 1, 14);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText(`STEALTH ${Math.round(game.stealthPct)}%`, W - 14, 23);

  // bottom bar: controls + legend + status + win/lose
  ctx.fillStyle = 'rgba(6,10,20,0.94)';
  ctx.fillRect(0, H - 36, W, 36);
  ctx.fillStyle = gold;
  ctx.fillRect(0, H - 36, W, 1.5);
  ctx.fillStyle = '#c8d6ee';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('[WASD] MOVE   [SHIFT] SNEAK (SILENT)   [E] HACK (HOLD)   [SPACE / CLICK] DECOY (' + game.player.decoysLeft + ' LEFT)', 14, H - 20);
  ctx.fillStyle = '#7d8aa5';
  ctx.font = '11px monospace';
  ctx.fillText('● cone = spotted   ▒ shadow = safe   ·   WIN: hack every lantern, reach the gate unseen   ·   LOSE: detection reaches 100%', 14, H - 5);
  ctx.fillStyle = b === 0 ? '#37d67a' : b === 1 ? '#ffd24d' : '#ff5a2a';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('STATUS: ' + game.statusLine, W - 14, H - 20);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = '12px monospace';
  ctx.fillText(`TIME ${game.clockText}   ·   LEVEL ${game.levelIndex + 1}/3`, W - 14, H - 5);
}

// --- the right-side FIELD NOTES panel: cached DOM refs + last values,
// so the canvas HUD can update it without touching the DOM every frame ---
let panelEls = null;
const panelLast = {};

function updateSidePanel(game) {
  if (typeof document === 'undefined') return;
  if (!panelEls) {
    const get = (id) => document.getElementById(id);
    panelEls = {
      detect: get('sp-detect'), alarm: get('sp-alarm'), vis: get('sp-vis'),
      noise: get('sp-noise'), lanterns: get('sp-lanterns'), spotted: get('sp-spotted'),
      stealth: get('sp-stealth'), time: get('sp-time'), goal: get('sp-goal'),
      status: get('sp-status'),
    };
    if (!panelEls.detect) return;
  }
  const level = game.level;
  const player = game.player;
  const b = band(game.detection);
  const detectText = b === 3 ? 'CAUGHT' : b === 2 ? '! ALARMED' : b === 1 ? '? SUSPICIOUS' : 'UNSEEN';
  const detectCls = b >= 2 ? 'bad' : b === 1 ? 'warn' : 'ok';
  const inShadow = level.shadows.some((s) => player.x >= s.x && player.x <= s.x + s.w && player.y >= s.y && player.y <= s.y + s.h);
  const values = {
    detect: detectText,
    alarm: b >= 2 ? 'LOUD' : b === 1 ? 'RISING' : 'QUIET',
    vis: inShadow ? 'IN SHADOW' : 'LIT',
    noise: player.sneaking ? 'SILENT' : player.moving ? 'HEARD' : 'SILENT',
    lanterns: `${level.lanterns.filter((l) => l.hacked).length}/${level.lanterns.length}`,
    spotted: String(game.timesSpotted),
    stealth: `${Math.round(game.stealthPct)}%`,
    time: game.clockText,
    goal: game.exitOpen ? 'ALL LANTERNS HACKED — REACH THE GATE' : 'Hack every lantern, then reach the gate unseen.',
    status: game.statusLine,
  };
  if (panelLast.detect !== detectText) {
    panelEls.detect.textContent = detectText;
    panelEls.detect.className = `p-detect ${detectCls}`;
    panelLast.detect = detectText;
  }
  for (const k of ['alarm', 'vis', 'noise', 'lanterns', 'spotted', 'stealth', 'time', 'goal', 'status']) {
    if (panelLast[k] !== values[k]) {
      panelEls[k].textContent = values[k];
      panelLast[k] = values[k];
    }
  }
}

export function drawOverlay(ctx, game) {
  const screen = game.screen;
  if (screen === 'play') return;
  ctx.fillStyle = 'rgba(4,7,16,0.82)';
  ctx.fillRect(0, 0, W, H);
  // gold double frame
  ctx.strokeStyle = 'rgba(201,162,47,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.strokeStyle = 'rgba(201,162,47,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  // little lanterns along the top frame
  for (let i = 0; i < 7; i++) {
    const lx = 240 + i * ((W - 480) / 6);
    ctx.fillStyle = 'rgba(255,190,80,0.9)';
    ctx.beginPath(); ctx.ellipse(lx, 56, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a5a1a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, 48); ctx.lineTo(lx, 50); ctx.stroke();
  }
  ctx.textAlign = 'center';
  if (screen === 'start') {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 54px monospace';
    ctx.fillText('EMBER MARKET', W / 2, 190);
    ctx.fillStyle = '#35d0c5';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('— LANTERN THIEF —', W / 2, 232);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '16px monospace';
    ctx.fillText('Sneak through the night market. Hack the ember lanterns. Reach the gate unseen.', W / 2, 290);
    ctx.fillStyle = '#c8d6ee';
    ctx.font = '15px monospace';
    ctx.fillText('WASD move · SHIFT sneak (slow + silent) · hold E to hack · SPACE / click throws a decoy', W / 2, 330);
    ctx.fillText('Hide in SHADOW COVER — lantern light and running get you spotted.', W / 2, 358);
    ctx.fillText('A "?" means a warden is suspicious. A "!" means run — or break line of sight.', W / 2, 386);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('WIN: hack every lantern, reach the gate unseen', W / 2, 440);
    ctx.fillStyle = '#ff7a7a';
    ctx.fillText('LOSE: detection reaches 100% and a warden catches you', W / 2, 466);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ CLICK OR PRESS SPACE TO BEGIN ]', W / 2, 530);
  } else if (screen === 'levelclear') {
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('LANTERNS SECURED', W / 2, 280);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '18px monospace';
    ctx.fillText(`${game.level.name} — cleared in ${game.clockText} · stealth ${Math.round(game.stealthPct)}%`, W / 2, 330);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ PRESS SPACE FOR THE NEXT LEVEL ]', W / 2, 400);
  } else if (screen === 'win') {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('THE MARKET IS YOURS', W / 2, 260);
    ctx.fillStyle = '#35d0c5';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('ALL THREE LANTERNS HACKED — YOU WERE NEVER CAUGHT', W / 2, 304);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '18px monospace';
    ctx.fillText(`Total time ${game.totalClockText} · stealth ${Math.round(game.totalStealthPct)}% · spotted ${game.timesSpotted} times`, W / 2, 360);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ PRESS R TO PLAY AGAIN ]', W / 2, 430);
  } else if (screen === 'lose') {
    ctx.fillStyle = '#ff5a2a';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('CAUGHT!', W / 2, 280);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '18px monospace';
    ctx.fillText('A warden found you in the lantern light. The market keeps its secrets.', W / 2, 330);
    ctx.fillText(`${game.level.name} · detection hit 100%`, W / 2, 360);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ PRESS R TO TRY AGAIN ]', W / 2, 430);
  }
}
