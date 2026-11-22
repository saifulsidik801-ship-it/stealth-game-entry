// levels.js — the three night-market levels. One job: level data.
// Playfield is 1600x900 (v3: ~1.56x the v2 floor area — wider streets,
// more room to maneuver). `walls`, `stalls` and `obstacles` are solid
// rects: they block movement AND guard vision (the raycast cone stops at
// them, so the thief can genuinely hide behind a crate stack or a low
// wall). `shadows` are floor zones where the thief is hard to spot
// (detection rises at a third of the rate). `lanterns` are the hack
// objectives; `exit` opens only after every lantern is hacked.
// Guard paths are waypoint loops in open lanes — never through a solid
// (every path was checked against every solid inflated by the guard
// radius, 14). Obstacles create multiple routes and hiding spots, never
// a single forced corridor, and never block a lantern or the exit.

export const BOUNDS = { x: 16, y: 16, w: 1568, h: 868 };
export const PLAY_W = 1600;
export const PLAY_H = 900;

function borderWalls() {
  return [
    { x: 0, y: 0, w: 1600, h: 16 },
    { x: 0, y: 884, w: 1600, h: 16 },
    { x: 0, y: 0, w: 16, h: 900 },
    { x: 1584, y: 0, w: 16, h: 900 },
  ];
}

export const LEVELS = [
  {
    name: 'LEVEL 1 — MARKET ROW',
    tip: 'Learn the patrols. Hack the ember lantern, then slip out the gate.',
    playerStart: [64, 450],
    exit: { x: 1516, y: 420, w: 52, h: 60 },
    decoys: 2,
    walls: borderWalls(),
    stalls: [
      { x: 380, y: 140, w: 130, h: 80, hue: '#b4552d' },
      { x: 380, y: 660, w: 130, h: 80, hue: '#c98a2e' },
      { x: 780, y: 360, w: 140, h: 90, hue: '#7a4a8a' },
      { x: 1150, y: 140, w: 120, h: 80, hue: '#2e7d6b' },
      { x: 1150, y: 660, w: 120, h: 80, hue: '#b4552d' },
    ],
    obstacles: [
      { x: 250, y: 250, w: 64, h: 64, type: 'crates' },
      { x: 560, y: 150, w: 180, h: 28, type: 'wall' },
      { x: 520, y: 730, w: 180, h: 28, type: 'fence' },
      { x: 950, y: 420, w: 90, h: 56, type: 'cart' },
      { x: 1250, y: 250, w: 80, h: 60, type: 'sacks' },
      { x: 1050, y: 560, w: 64, h: 64, type: 'crates' },
      { x: 1450, y: 600, w: 28, h: 150, type: 'wall' },
    ],
    shadows: [
      { x: 90, y: 380, w: 160, h: 140 },
      { x: 700, y: 720, w: 200, h: 110 },
      { x: 1300, y: 380, w: 150, h: 130 },
    ],
    lanterns: [{ x: 865, y: 520 }],
    guards: [
      { path: [[260, 110], [1340, 110]], speed: 55, range: 170, halfAngle: 0.58 },
      { path: [[700, 200], [700, 700]], speed: 50, range: 170, halfAngle: 0.58 },
      { path: [[1340, 800], [260, 800]], speed: 55, range: 170, halfAngle: 0.58 },
    ],
  },
  {
    name: 'LEVEL 2 — LANTERN COURT',
    tip: 'Two lanterns now, and an elite warden with a wider lantern cone.',
    playerStart: [64, 450],
    exit: { x: 1516, y: 420, w: 52, h: 60 },
    decoys: 2,
    walls: borderWalls(),
    stalls: [
      { x: 320, y: 120, w: 150, h: 80, hue: '#b4552d' },
      { x: 700, y: 120, w: 150, h: 80, hue: '#7a4a8a' },
      { x: 1080, y: 120, w: 150, h: 80, hue: '#b4552d' },
      { x: 320, y: 680, w: 150, h: 80, hue: '#c98a2e' },
      { x: 700, y: 680, w: 150, h: 80, hue: '#2e7d6b' },
      { x: 1080, y: 680, w: 150, h: 80, hue: '#c98a2e' },
      { x: 600, y: 400, w: 130, h: 90, hue: '#7a4a8a' },
      { x: 950, y: 400, w: 130, h: 90, hue: '#2e7d6b' },
    ],
    obstacles: [
      { x: 640, y: 300, w: 200, h: 28, type: 'wall' },
      { x: 980, y: 560, w: 200, h: 28, type: 'wall' },
      { x: 240, y: 480, w: 64, h: 64, type: 'crates' },
      { x: 1300, y: 280, w: 90, h: 56, type: 'cart' },
      { x: 700, y: 560, w: 80, h: 60, type: 'sacks' },
      { x: 1240, y: 700, w: 180, h: 28, type: 'fence' },
      { x: 1330, y: 540, w: 64, h: 64, type: 'crates' },
      { x: 200, y: 700, w: 28, h: 140, type: 'wall' },
    ],
    shadows: [
      { x: 70, y: 380, w: 140, h: 130 },
      { x: 1360, y: 380, w: 140, h: 130 },
      { x: 760, y: 760, w: 200, h: 90 },
    ],
    lanterns: [{ x: 470, y: 250 }, { x: 1080, y: 640 }],
    guards: [
      { path: [[220, 240], [1380, 240]], speed: 58, range: 175, halfAngle: 0.58 },
      { path: [[220, 660], [1380, 660]], speed: 58, range: 175, halfAngle: 0.58 },
      { path: [[540, 140], [540, 760]], speed: 52, range: 170, halfAngle: 0.58 },
      { path: [[880, 140], [880, 760]], speed: 66, range: 205, halfAngle: 0.7, elite: true },
    ],
  },
  {
    name: 'LEVEL 3 — GRAND BAZAAR',
    tip: 'Three lanterns, five wardens, two elites. Patience wins the bazaar.',
    playerStart: [64, 450],
    exit: { x: 1516, y: 420, w: 52, h: 60 },
    decoys: 3,
    walls: borderWalls(),
    stalls: [
      { x: 280, y: 110, w: 130, h: 70, hue: '#b4552d' },
      { x: 660, y: 110, w: 130, h: 70, hue: '#c98a2e' },
      { x: 1020, y: 110, w: 130, h: 70, hue: '#7a4a8a' },
      { x: 140, y: 360, w: 120, h: 80, hue: '#2e7d6b' },
      { x: 500, y: 360, w: 120, h: 80, hue: '#b4552d' },
      { x: 860, y: 360, w: 120, h: 80, hue: '#c98a2e' },
      { x: 1220, y: 360, w: 120, h: 80, hue: '#7a4a8a' },
      { x: 280, y: 680, w: 130, h: 70, hue: '#2e7d6b' },
      { x: 660, y: 680, w: 130, h: 70, hue: '#b4552d' },
      { x: 1020, y: 680, w: 130, h: 70, hue: '#c98a2e' },
    ],
    obstacles: [
      { x: 280, y: 250, w: 120, h: 28, type: 'wall' },
      { x: 1000, y: 520, w: 150, h: 28, type: 'wall' },
      { x: 250, y: 520, w: 64, h: 64, type: 'crates' },
      { x: 1300, y: 280, w: 64, h: 64, type: 'crates' },
      { x: 900, y: 640, w: 90, h: 56, type: 'cart' },
      { x: 950, y: 280, w: 80, h: 60, type: 'sacks' },
      { x: 600, y: 760, w: 200, h: 28, type: 'fence' },
      { x: 1250, y: 160, w: 200, h: 28, type: 'fence' },
      { x: 1500, y: 690, w: 28, h: 150, type: 'wall' },
      { x: 560, y: 480, w: 64, h: 64, type: 'crates' },
    ],
    shadows: [
      { x: 70, y: 220, w: 130, h: 110 },
      { x: 1400, y: 220, w: 130, h: 110 },
      { x: 70, y: 560, w: 130, h: 110 },
      { x: 1400, y: 560, w: 130, h: 110 },
      { x: 740, y: 240, w: 130, h: 90 },
    ],
    lanterns: [{ x: 440, y: 280 }, { x: 800, y: 480 }, { x: 1230, y: 540 }],
    guards: [
      { path: [[200, 220], [1400, 220]], speed: 60, range: 180, halfAngle: 0.58 },
      { path: [[1400, 600], [200, 600]], speed: 60, range: 180, halfAngle: 0.58 },
      { path: [[460, 140], [460, 760]], speed: 55, range: 175, halfAngle: 0.58 },
      { path: [[820, 140], [820, 760]], speed: 68, range: 205, halfAngle: 0.7, elite: true },
      { path: [[1180, 140], [1180, 760]], speed: 55, range: 175, halfAngle: 0.58 },
    ],
  },
];
