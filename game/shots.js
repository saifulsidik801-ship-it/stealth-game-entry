// shots.js — deterministic staged states for the screenshots.
// One job: put the live game into a photogenic mid-play moment.
// These are real states of the real game code (the starter does the same
// with shots.json); nothing here is drawn by hand or composited.
// Coordinates are for the v3 playfield (1600x900): every staged position
// was checked to sit in open floor, clear of stalls, obstacles, shadows
// and the exit. Guard spots sit on their patrol lanes, never inside a
// solid.

// game: the live state object from main.js. name: 'cover' | 'suspicious' |
// 'chase' | 'win'. Called once after a level is loaded.
export function applyShot(game, name) {
  const level = game.level;
  game.screen = 'play';
  if (name === 'cover') {
    // Level 1, mid-infiltration: thief beside the central stall, two wardens
    // sweeping with big cones, lantern + locked exit both in frame. The wide
    // room shows off the new obstacle cover (crate stack, low wall, cart).
    game.player.x = 700; game.player.y = 500;
    game.player.facing = 0.5;
    game.guards[0].x = 520; game.guards[0].y = 110; game.guards[0].facing = 0.6;
    game.guards[1].x = 700; game.guards[1].y = 300; game.guards[1].facing = 1.9;
    game.guards[2].x = 1100; game.guards[2].y = 800; game.guards[2].facing = Math.PI;
    game.detection = 35;
    game.stealthPct = 100;
    game.statusLine = 'DECOY ACTIVE // INFILTRATING MARKET ROW';
    game.player.decoysLeft = 2;
    game.elapsed = 47;
    game.clockText = '00:47';
  } else if (name === 'suspicious') {
    // Near-miss: a warden is "?" and walking to the last-seen spot while the
    // thief crouches inside a shadow zone, detection draining. A low wall
    // and a crate stack stand between the thief and the open lane.
    game.player.x = 180; game.player.y = 450;
    game.player.facing = 0;
    game.player.sneaking = true;
    game.guards[1].x = 520; game.guards[1].y = 450; game.guards[1].facing = Math.PI;
    game.guards[1].mode = 'investigate';
    game.guards[1].target = { x: 240, y: 450 };
    game.detection = 62;
    game.stealthPct = 71;
    game.statusLine = 'SUSPICIOUS — WARDEN INVESTIGATING LAST SEEN SPOT';
    game.player.decoysLeft = 1;
    game.elapsed = 96;
    game.clockText = '01:36';
  } else if (name === 'chase') {
    // Level 3, alarmed: an elite warden is "!" and chasing, detection high,
    // thief sprinting for shadow. Shows the recovery window matters.
    game.loadLevel(2);
    game.player.x = 860; game.player.y = 540;
    game.player.facing = Math.PI;
    game.guards[3].x = 820; game.guards[3].y = 380; game.guards[3].facing = 1.57;
    game.guards[3].mode = 'chase';
    game.guards[0].x = 480; game.guards[0].y = 220; game.guards[0].facing = 0;
    game.guards[1].x = 1100; game.guards[1].y = 600; game.guards[1].facing = Math.PI;
    game.detection = 88;
    game.stealthPct = 58;
    game.statusLine = 'ALARMED — BREAK LINE OF SIGHT TO RECOVER';
    game.player.decoysLeft = 1;
    game.elapsed = 154;
    game.clockText = '02:34';
    game.level.lanterns[0].hacked = true;
  } else if (name === 'win') {
    game.totalClockText = '03:41';
    game.totalStealthPct = 87;
    game.timesSpotted = 2;
    game.screen = 'win';
  }
}
