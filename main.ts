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
// bytes, so start from a clean slate for the entry's own outputs every
// time. NOTE: never rmSync the whole output directory — the grader's
// /output can hold entries this program may not delete (e.g. a
// read-only subdirectory left by the harness), and an EACCES from that
// one call kills the whole run with exit code 1. Remove only the three
// outputs this entry owns, and ignore failures: a stale output that
// cannot be removed is overwritten by the copy/write below anyway.
for (const own of ['game', 'screenshots', 'dossier.json']) {
  try {
    rmSync(join(outputDir, own), { recursive: true, force: true });
  } catch {
    // Not ours to delete, or already gone — carry on regardless.
  }
}
try {
  mkdirSync(outputDir, { recursive: true });
} catch {
  // Already exists — carry on regardless.
}

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
console.log('staged game/ + screenshots/ + dossier.json in ' + outputDir);

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}
