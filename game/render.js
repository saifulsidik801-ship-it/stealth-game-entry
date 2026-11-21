// render.js — everything the eye sees: floor, stalls, light and shadow,
// vision cones, wardens, the thief, the HUD and the end screens.
// One job: draw the current game state on the canvas.

import { conePolygon, band } from './guards.js';
import { mulberry32 } from './world.js';

const W = 1280;
const H = 720;

const speckleCache = new Map();
function floorSpeckle(levelIndex) {
  if (!speckleCache.has(levelIndex)) {
    const rnd = mulberry32(1000 + levelIndex * 77);
    const dots = [];
    for (let i = 0; i < 260; i++) {
      dots.push({ x: 20 + rnd() * 1240, y: 20 + rnd() * 680, r: 1 + rnd() * 2.2 });
    }
    speckleCache.set(levelIndex, dots);
  }
  return speckleCache.get(levelIndex);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawScene(ctx, game, time) {
  const level = game.level;
  const player = game.player;

  // --- floor ---
  ctx.fillStyle = '#0d1526';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(38,58,96,0.55)';
  ctx.lineWidth = 1;
  for (let x = 80; x < W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x, 704); ctx.stroke();
  }
  for (let y = 80; y < H; y += 80) {
    ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(1264, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,150,200,0.10)';
  for (const d of floorSpeckle(game.levelIndex)) {
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }

  // --- shadow cover zones (safe dark) ---
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(4,8,20,0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(90,160,220,0.5)';
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(120,180,235,0.75)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SHADOW COVER', s.x + 8, s.y + 16);
  }

  // --- warm light pools under unhacked lanterns ---
  for (const l of level.lanterns) {
    if (l.hacked) continue;
    const flick = 0.75 + 0.25 * Math.sin(time * 3 + l.x);
    const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, 110);
    g.addColorStop(0, `rgba(255,179,71,${0.30 * flick})`);
    g.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, 110, 0, Math.PI * 2); ctx.fill();
  }

  // --- vision cones (cover-blocked: raycast polygon) ---
  for (const guard of game.guards) {
    const poly = conePolygon(guard, game.solids);
    const alarmed = guard.mode === 'chase';
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = guard.elite
      ? (alarmed ? 'rgba(255,60,60,0.30)' : 'rgba(255,120,60,0.20)')
      : (alarmed ? 'rgba(255,70,40,0.28)' : 'rgba(255,150,40,0.17)');
    ctx.fill();
    ctx.strokeStyle = alarmed ? 'rgba(255,90,60,0.7)' : 'rgba(255,180,80,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- stalls (cover that blocks sight) ---
  for (const s of level.stalls) {
    ctx.fillStyle = '#1a2438';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = s.hue;
    ctx.fillRect(s.x, s.y, s.w, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let x = s.x + 8; x < s.x + s.w - 8; x += 22) ctx.fillRect(x, s.y, 10, 16);
    ctx.strokeStyle = 'rgba(200,220,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    ctx.fillStyle = 'rgba(255,220,150,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STALL', s.x + s.w / 2, s.y + s.h - 10);
  }

  // --- border walls ---
  ctx.fillStyle = '#232f4a';
  ctx.fillRect(0, 0, W, 16); ctx.fillRect(0, 704, W, 16);
  ctx.fillRect(0, 0, 16, H); ctx.fillRect(1264, 0, 16, H);

  // --- exit gate ---
  const exitOpen = level.lanterns.every((l) => l.hacked);
  ctx.fillStyle = exitOpen ? 'rgba(55,214,122,0.25)' : 'rgba(214,69,69,0.18)';
  ctx.fillRect(level.exit.x, level.exit.y, level.exit.w, level.exit.h);
  ctx.strokeStyle = exitOpen ? '#37d67a' : '#d64545';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(level.exit.x, level.exit.y, level.exit.w, level.exit.h);
  ctx.fillStyle = exitOpen ? '#37d67a' : '#ff7a7a';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(exitOpen ? 'EXIT' : 'EXIT', level.exit.x + level.exit.w / 2, level.exit.y + 26);
  ctx.fillText(exitOpen ? 'OPEN' : 'LOCKED', level.exit.x + level.exit.w / 2, level.exit.y + 42);

  // --- lanterns (objectives) ---
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
    ctx.fillStyle = `rgba(255,190,80,${0.9 * flick})`;
    ctx.beginPath(); ctx.arc(l.x, l.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(l.x, l.y, 17, 0, Math.PI * 2); ctx.stroke();
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

  // --- wardens ---
  for (const guard of game.guards) {
    ctx.fillStyle = guard.elite ? '#ff5a2a' : '#ff7a1a';
    ctx.beginPath(); ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2); ctx.fill();
    if (guard.elite) {
      ctx.strokeStyle = '#ff2d2d';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(guard.x, guard.y, 17, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = '#1a0e00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, guard.y + Math.sin(guard.facing) * 18);
    ctx.stroke();
    const mark = guard.mode === 'chase' ? '!' : guard.mode === 'investigate' ? '?' : null;
    if (mark) {
      ctx.fillStyle = mark === '!' ? '#ff3b30' : '#ffd24d';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mark, guard.x, guard.y - 24);
    }
  }

  // --- the thief ---
  ctx.fillStyle = '#35d0c5';
  ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#eafffb';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(player.facing) * 18, player.y + Math.sin(player.facing) * 18);
  ctx.stroke();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(53,208,197,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(player.x, player.y, 19, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- footstep rings ---
  for (const p of game.rings) {
    const age = 1 - p.t / p.life;
    ctx.strokeStyle = `rgba(220,235,255,${0.5 * age})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (1 - age) * 26, 0, Math.PI * 2); ctx.stroke();
  }

  drawHud(ctx, game, time);
}

function drawHud(ctx, game, time) {
  const level = game.level;
  const hacked = level.lanterns.filter((l) => l.hacked).length;
  const exitOpen = hacked === level.lanterns.length;
  const b = band(game.detection);

  // top bar
  ctx.fillStyle = 'rgba(6,10,20,0.92)';
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = '#35d0c5';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('EMBER MARKET // LANTERN THIEF', 14, 23);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${level.name}   ·   LANTERNS ${hacked}/${level.lanterns.length}   ·   EXIT ${exitOpen ? 'OPEN' : 'LOCKED'}`, 640, 23);
  ctx.textAlign = 'right';
  const detColor = b === 0 ? '#37d67a' : b === 1 ? '#ffd24d' : '#ff5a2a';
  ctx.fillStyle = detColor;
  ctx.fillText(`DETECTION ${Math.round(game.detection)}%`, 1000, 23);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(1010, 13, 110, 10);
  ctx.fillStyle = detColor;
  ctx.fillRect(1010, 13, 110 * (game.detection / 100), 10);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillText(`STEALTH ${Math.round(game.stealthPct)}%`, 1266, 23);

  // bottom bar: controls + status + win/lose
  ctx.fillStyle = 'rgba(6,10,20,0.92)';
  ctx.fillRect(0, 684, W, 36);
  ctx.fillStyle = '#c8d6ee';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('[WASD] MOVE   [SHIFT] SNEAK (SILENT)   [E] HACK (HOLD)   [SPACE / CLICK] DECOY (' + game.player.decoysLeft + ' LEFT)', 14, 700);
  ctx.fillStyle = '#7d8aa5';
  ctx.font = '11px monospace';
  ctx.fillText('WIN: hack every lantern, reach the gate unseen   ·   LOSE: detection reaches 100%', 14, 715);
  ctx.fillStyle = b === 0 ? '#37d67a' : b === 1 ? '#ffd24d' : '#ff5a2a';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('STATUS: ' + game.statusLine, 1266, 700);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = '12px monospace';
  ctx.fillText(`TIME ${game.clockText}   ·   LEVEL ${game.levelIndex + 1}/3`, 1266, 715);
}

export function drawOverlay(ctx, game) {
  const screen = game.screen;
  if (screen === 'play') return;
  ctx.fillStyle = 'rgba(4,7,16,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (screen === 'start') {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 54px monospace';
    ctx.fillText('EMBER MARKET', 640, 190);
    ctx.fillStyle = '#35d0c5';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('— LANTERN THIEF —', 640, 232);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '16px monospace';
    ctx.fillText('Sneak through the night market. Hack the ember lanterns. Reach the gate unseen.', 640, 290);
    ctx.fillStyle = '#c8d6ee';
    ctx.font = '15px monospace';
    ctx.fillText('WASD move · SHIFT sneak (slow + silent) · hold E to hack · SPACE / click throws a decoy', 640, 330);
    ctx.fillText('Hide in SHADOW COVER — lantern light and running get you spotted.', 640, 358);
    ctx.fillText('A "?" means a warden is suspicious. A "!" means run — or break line of sight.', 640, 386);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('WIN: hack every lantern, reach the gate unseen', 640, 440);
    ctx.fillStyle = '#ff7a7a';
    ctx.fillText('LOSE: detection reaches 100% and a warden catches you', 640, 466);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ CLICK OR PRESS SPACE TO BEGIN ]', 640, 530);
  } else if (screen === 'levelclear') {
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('LANTERNS SECURED', 640, 280);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '18px monospace';
    ctx.fillText(`${game.level.name} — cleared in ${game.clockText} · stealth ${Math.round(game.stealthPct)}%`, 640, 330);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ PRESS SPACE FOR THE NEXT LEVEL ]', 640, 400);
  } else if (screen === 'win') {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('THE MARKET IS YOURS', 640, 260);
    ctx.fillStyle = '#35d0c5';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('ALL THREE LANTERNS HACKED — YOU WERE NEVER CAUGHT', 640, 304);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '18px monospace';
    ctx.fillText(`Total time ${game.totalClockText} · stealth ${Math.round(game.totalStealthPct)}% · spotted ${game.timesSpotted} times`, 640, 360);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ PRESS R TO PLAY AGAIN ]', 640, 430);
  } else if (screen === 'lose') {
    ctx.fillStyle = '#ff5a2a';
    ctx.font = 'bold 44px monospace';
    ctx.fillText('CAUGHT!', 640, 280);
    ctx.fillStyle = '#e8eefc';
    ctx.font = '18px monospace';
    ctx.fillText('A warden found you in the lantern light. The market keeps its secrets.', 640, 330);
    ctx.fillText(`${game.level.name} · detection hit 100%`, 640, 360);
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ PRESS R TO TRY AGAIN ]', 640, 430);
  }
}
