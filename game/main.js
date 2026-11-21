// main.js — bootstrap, input, the game loop and the state machine.
// One job: wire every other file together and run the game.

import { LEVELS, BOUNDS } from './levels.js';
import { makePlayer, updatePlayer, playerInShadow, playerNoiseRadius, playerAtExit, throwDecoy } from './player.js';
import { makeGuard, updateGuard, guardSeesPlayer, updateDetection, band } from './guards.js';
import { drawScene, drawOverlay } from './render.js';
import { applyShot } from './shots.js';
import {
  ensureAudio, playPlayerStep, playGuardStep, playSuspicious, playAlarm,
  playHackTick, playHackDone, playDecoy, playCaught, playWin,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const game = {
  screen: 'start', // start | play | levelclear | win | lose
  levelIndex: 0,
  level: null,
  solids: [],
  player: null,
  guards: [],
  decoys: [],
  rings: [],
  detection: 0,
  stealthPct: 100,
  elapsed: 0,
  timeUnseen: 0,
  clockText: '00:00',
  totalClockText: '00:00',
  totalStealthPct: 100,
  timesSpotted: 0,
  statusLine: 'UNSEEN // MOVE WITH WASD',
  lastSeen: null,
  paused: false,
  totalElapsed: 0,
  totalUnseen: 0,
};

const keys = { up: false, down: false, left: false, right: false, sneak: false, hack: false };

function loadLevel(index) {
  game.levelIndex = index;
  game.level = JSON.parse(JSON.stringify(LEVELS[index]));
  game.solids = [...game.level.walls, ...game.level.stalls];
  game.player = makePlayer(game.level.playerStart[0], game.level.playerStart[1], game.level.decoys);
  game.guards = game.level.guards.map(makeGuard);
  game.decoys = [];
  game.rings = [];
  game.detection = 0;
  game.elapsed = 0;
  game.timeUnseen = 0;
  game.clockText = '00:00';
  game.lastSeen = null;
  game.statusLine = 'UNSEEN // ' + game.level.name;
}
game.loadLevel = loadLevel;

function clockTextOf(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function restartAll() {
  game.totalElapsed = 0;
  game.totalUnseen = 0;
  game.timesSpotted = 0;
  loadLevel(0);
  game.screen = 'play';
}

function nextLevel() {
  game.totalElapsed += game.elapsed;
  game.totalUnseen += game.timeUnseen;
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.totalClockText = clockTextOf(game.totalElapsed);
    game.totalStealthPct = game.totalElapsed > 0 ? (game.totalUnseen / game.totalElapsed) * 100 : 100;
    game.screen = 'win';
    playWin();
    return;
  }
  loadLevel(game.levelIndex + 1);
  game.screen = 'play';
}

function update(dt) {
  if (game.screen !== 'play' || game.paused) return;
  game.elapsed += dt;
  game.clockText = clockTextOf(game.elapsed);
  const level = game.level;
  const player = game.player;

  const pev = updatePlayer(player, keys, dt, level, game.solids, BOUNDS, game.decoys);
  if (pev.stepped) {
    playPlayerStep(player.sneaking);
    game.rings.push({ x: player.x, y: player.y, r: 6, t: 0.5, life: 0.5 });
  }
  if (pev.hacked >= 0) {
    playHackDone();
    game.statusLine = 'LANTERN HACKED // ' + (level.lanterns.filter((l) => l.hacked).length) + '/' + level.lanterns.length;
    if (level.lanterns.every((l) => l.hacked)) game.statusLine = 'ALL LANTERNS HACKED // REACH THE GATE';
  } else if (player.hackTarget >= 0 && keys.hack && !player.moving) {
    if (Math.random() < dt * 4) playHackTick();
  }

  // Who sees the thief? (decoy-distracted wardens are looking away)
  const seeing = { any: false, nearestDist: Infinity, seer: null };
  for (const guard of game.guards) {
    const distracted = guard.mode === 'investigate' && guard.decoyTarget;
    if (distracted) continue;
    if (guardSeesPlayer(guard, player, game.solids)) {
      seeing.any = true;
      const d = Math.hypot(player.x - guard.x, player.y - guard.y);
      if (d < seeing.nearestDist) { seeing.nearestDist = d; seeing.seer = guard; }
    }
  }
  if (seeing.any) game.lastSeen = { x: player.x, y: player.y };

  // Footsteps: a walking thief is heard; a sneaking one is not.
  const noiseR = playerNoiseRadius(player);
  let heardBy = null;
  if (noiseR > 0) {
    for (const guard of game.guards) {
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < noiseR + 30) {
        heardBy = guard;
        break;
      }
    }
  }
  if (heardBy && !seeing.any) game.lastSeen = { x: player.x, y: player.y };

  const inShadow = playerInShadow(player, level);
  const det = updateDetection(game.detection, seeing, player, inShadow, dt);
  game.detection = det.meter;
  const b = band(game.detection);
  if (det.crossedUp) {
    game.timesSpotted += 1;
    if (b === 1) { playSuspicious(); game.statusLine = 'SUSPICIOUS — WARDEN INVESTIGATING LAST SEEN SPOT'; }
    if (b === 2) { playAlarm(); game.statusLine = 'ALARMED — BREAK LINE OF SIGHT TO RECOVER'; }
  }
  if (b === 0) {
    game.timeUnseen += dt;
    if (game.statusLine.startsWith('SUSPICIOUS') || game.statusLine.startsWith('ALARMED')) {
      game.statusLine = 'LOST YOU // UNSEEN AGAIN';
    }
  }
  game.stealthPct = game.elapsed > 0 ? (game.timeUnseen / game.elapsed) * 100 : 100;

  // Wardens: chase when alarmed and seeing, investigate the last-seen spot
  // (or a beeping decoy), otherwise patrol their route.
  for (const guard of game.guards) {
    const orders = { mode: 'patrol', target: null };
    const decoyNear = game.decoys.find((d) => Math.hypot(d.x - guard.x, d.y - guard.y) < 280);
    if (decoyNear) {
      orders.mode = 'investigate';
      orders.target = decoyNear;
      guard.decoyTarget = true;
    } else {
      guard.decoyTarget = false;
      if (b === 2 && seeing.any) {
        orders.mode = 'chase';
        orders.target = { x: player.x, y: player.y };
      } else if ((b === 1 || heardBy) && game.lastSeen) {
        orders.mode = 'investigate';
        orders.target = game.lastSeen;
      }
    }
    const gev = updateGuard(guard, dt, orders, game.solids, BOUNDS);
    if (gev.stepped) {
      playGuardStep(guard.x - player.x, guard.y - player.y);
      game.rings.push({ x: guard.x, y: guard.y, r: 8, t: 0.4, life: 0.4 });
    }
  }

  // Decoys beep, then die.
  for (const d of game.decoys) d.t -= dt;
  game.decoys = game.decoys.filter((d) => d.t > 0);
  for (const r of game.rings) r.t -= dt;
  game.rings = game.rings.filter((r) => r.t > 0);

  // Win / lose.
  if (b === 3) {
    game.screen = 'lose';
    playCaught();
    return;
  }
  if (playerAtExit(player, level)) {
    game.screen = 'levelclear';
    playWin();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawScene(ctx, game, now / 1000);
  drawOverlay(ctx, game);
  if (statusEl && game.screen === 'play') {
    statusEl.textContent = `Detection ${Math.round(game.detection)} percent. ${game.statusLine}`;
  }
  requestAnimationFrame(frame);
}

// --- input ---
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  KeyE: 'hack',
};
window.addEventListener('keydown', (e) => {
  ensureAudio();
  if (e.code === 'Space') {
    e.preventDefault();
    if (game.screen === 'start') { game.screen = 'play'; return; }
    if (game.screen === 'levelclear') { nextLevel(); return; }
    if (game.screen === 'play') throwDecoyAtMouse();
    return;
  }
  if (e.code === 'KeyR') {
    if (game.screen === 'win' || game.screen === 'lose') restartAll();
    else if (game.screen === 'play') loadLevel(game.levelIndex);
    return;
  }
  const name = KEYMAP[e.code];
  if (name) { keys[name] = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  const name = KEYMAP[e.code];
  if (name) keys[name] = false;
});

let mouse = { x: 640, y: 360 };
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse = {
    x: ((e.clientX - r.left) / r.width) * 1280,
    y: ((e.clientY - r.top) / r.height) * 720,
  };
});
canvas.addEventListener('mousedown', (e) => {
  ensureAudio();
  const r = canvas.getBoundingClientRect();
  mouse = {
    x: ((e.clientX - r.left) / r.width) * 1280,
    y: ((e.clientY - r.top) / r.height) * 720,
  };
  if (game.screen === 'start') { game.screen = 'play'; return; }
  if (game.screen === 'levelclear') { nextLevel(); return; }
  if (game.screen === 'play') throwDecoyAtMouse();
});

function throwDecoyAtMouse() {
  const d = throwDecoy(game.player, mouse.x, mouse.y, game.level);
  if (d) {
    game.decoys.push(d);
    playDecoy();
    game.statusLine = 'DECOY THROWN // WARDENS INVESTIGATING THE NOISE';
  }
}

// --- boot ---
loadLevel(0);
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  game.screen = 'play';
  applyShot(game, shot);
  game.paused = true; // staged shots hold still for the camera
}
requestAnimationFrame(frame);

// Test handle: the play-test drives the real game through these hooks.
window.__stealth = {
  game,
  warp(x, y) { game.player.x = x; game.player.y = y; },
  setDetection(v) { game.detection = v; },
  keys,
  loadLevel,
  restartAll,
};
