// levels.js — the three night-market levels. One job: level data.
// Playfield is 1280x720. `walls` and `stalls` are solid rects: they block
// movement AND guard vision. `shadows` are floor zones where the thief is
// hard to spot (detection rises at a third of the rate). `lanterns` are the
// hack objectives; `exit` opens only after every lantern is hacked.
// Guard paths are waypoint loops in open lanes — never through a solid.

export const BOUNDS = { x: 16, y: 16, w: 1248, h: 688 };

function borderWalls() {
  return [
    { x: 0, y: 0, w: 1280, h: 16 },
    { x: 0, y: 704, w: 1280, h: 16 },
    { x: 0, y: 0, w: 16, h: 720 },
    { x: 1264, y: 0, w: 16, h: 720 },
  ];
}

export const LEVELS = [
  {
    name: 'LEVEL 1 — MARKET ROW',
    tip: 'Learn the patrols. Hack the ember lantern, then slip out the gate.',
    playerStart: [64, 360],
    exit: { x: 1196, y: 330, w: 52, h: 60 },
    decoys: 2,
    walls: borderWalls(),
    stalls: [
      { x: 300, y: 120, w: 120, h: 70, hue: '#b4552d' },
      { x: 300, y: 520, w: 120, h: 70, hue: '#c98a2e' },
      { x: 620, y: 280, w: 130, h: 80, hue: '#7a4a8a' },
      { x: 900, y: 120, w: 110, h: 70, hue: '#2e7d6b' },
      { x: 900, y: 520, w: 110, h: 70, hue: '#b4552d' },
    ],
    shadows: [
      { x: 80, y: 300, w: 150, h: 130 },
      { x: 560, y: 560, w: 180, h: 110 },
      { x: 1020, y: 300, w: 140, h: 120 },
    ],
    lanterns: [{ x: 685, y: 420 }],
    guards: [
      { path: [[220, 90], [1060, 90]], speed: 55, range: 170, halfAngle: 0.58 },
      { path: [[560, 180], [560, 540]], speed: 50, range: 170, halfAngle: 0.58 },
      { path: [[1060, 640], [220, 640]], speed: 55, range: 170, halfAngle: 0.58 },
    ],
  },
  {
    name: 'LEVEL 2 — LANTERN COURT',
    tip: 'Two lanterns now, and an elite warden with a wider lantern cone.',
    playerStart: [64, 360],
    exit: { x: 1196, y: 330, w: 52, h: 60 },
    decoys: 2,
    walls: borderWalls(),
    stalls: [
      { x: 260, y: 100, w: 140, h: 70, hue: '#b4552d' },
      { x: 260, y: 550, w: 140, h: 70, hue: '#c98a2e' },
      { x: 560, y: 100, w: 140, h: 70, hue: '#7a4a8a' },
      { x: 560, y: 550, w: 140, h: 70, hue: '#2e7d6b' },
      { x: 860, y: 100, w: 140, h: 70, hue: '#b4552d' },
      { x: 860, y: 550, w: 140, h: 70, hue: '#c98a2e' },
      { x: 480, y: 300, w: 120, h: 90, hue: '#7a4a8a' },
      { x: 760, y: 300, w: 120, h: 90, hue: '#2e7d6b' },
    ],
    shadows: [
      { x: 60, y: 300, w: 130, h: 120 },
      { x: 1060, y: 300, w: 130, h: 120 },
      { x: 600, y: 600, w: 180, h: 80 },
    ],
    lanterns: [{ x: 430, y: 190 }, { x: 850, y: 510 }],
    guards: [
      { path: [[180, 200], [1100, 200]], speed: 58, range: 175, halfAngle: 0.58 },
      { path: [[180, 520], [1100, 520]], speed: 58, range: 175, halfAngle: 0.58 },
      { path: [[450, 120], [450, 600]], speed: 52, range: 170, halfAngle: 0.58 },
      { path: [[730, 120], [730, 600]], speed: 66, range: 205, halfAngle: 0.7, elite: true },
    ],
  },
  {
    name: 'LEVEL 3 — GRAND BAZAAR',
    tip: 'Three lanterns, five wardens, two elites. Patience wins the bazaar.',
    playerStart: [64, 360],
    exit: { x: 1196, y: 330, w: 52, h: 60 },
    decoys: 3,
    walls: borderWalls(),
    stalls: [
      { x: 220, y: 90, w: 120, h: 60, hue: '#b4552d' },
      { x: 520, y: 90, w: 120, h: 60, hue: '#c98a2e' },
      { x: 820, y: 90, w: 120, h: 60, hue: '#7a4a8a' },
      { x: 120, y: 290, w: 110, h: 70, hue: '#2e7d6b' },
      { x: 420, y: 290, w: 110, h: 70, hue: '#b4552d' },
      { x: 720, y: 290, w: 110, h: 70, hue: '#c98a2e' },
      { x: 1020, y: 290, w: 110, h: 70, hue: '#7a4a8a' },
      { x: 220, y: 540, w: 120, h: 60, hue: '#2e7d6b' },
      { x: 520, y: 540, w: 120, h: 60, hue: '#b4552d' },
      { x: 820, y: 540, w: 120, h: 60, hue: '#c98a2e' },
    ],
    shadows: [
      { x: 60, y: 180, w: 120, h: 100 },
      { x: 1100, y: 180, w: 120, h: 100 },
      { x: 60, y: 480, w: 120, h: 100 },
      { x: 1100, y: 480, w: 120, h: 100 },
      { x: 600, y: 200, w: 120, h: 80 },
    ],
    lanterns: [{ x: 350, y: 200 }, { x: 640, y: 380 }, { x: 960, y: 480 }],
    guards: [
      { path: [[160, 180], [1120, 180]], speed: 60, range: 180, halfAngle: 0.58 },
      { path: [[1120, 480], [160, 480]], speed: 60, range: 180, halfAngle: 0.58 },
      { path: [[380, 120], [380, 600]], speed: 55, range: 175, halfAngle: 0.58 },
      { path: [[680, 120], [680, 600]], speed: 68, range: 205, halfAngle: 0.7, elite: true },
      { path: [[980, 120], [980, 600]], speed: 55, range: 175, halfAngle: 0.58 },
    ],
  },
];
