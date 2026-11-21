// Ember Market — Lantern Thief: the hand-in program (Node 22, stdlib only).
// It stages the entry in /output (or $MAKEFUN_OUTPUT_DIR outside the
// grader): the static game/ folder, the screenshots/ folder, and the
// dossier.json the judge reads, built by the vendored make.fun library.
// Run it locally to check the output before submitting:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The grader runs this program twice and both runs must write the same
// bytes, so start from an empty output directory every time.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
// Screenshots are the entry's face: refuse a silent hand-in with none.
if (!existsSync(join(repoRoot, 'screenshots'))) {
  throw new Error('screenshots/ is missing — take the 3-4 screenshots first');
}
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// The scorer's own caps, from the kit's gate: at most 4 screenshots of
// 256 KiB, at most 993 game files totalling 48 MiB, paths under 1000 bytes,
// and the dossier text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}
