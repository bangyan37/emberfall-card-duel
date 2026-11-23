// Emberfall — the hand-in program for this entry (Node 22, standard library
// only). The duel itself lives in the game/ folder next to this file as
// static pages a desktop browser opens offline. Running this program copies
// game/ and screenshots/ into the output directory and writes the
// dossier.json the judge reads, built by the kit's own vendored
// buildDossier in vendor/makefun-game.ts (kept byte for byte).
// Away from the grader, point MAKEFUN_OUTPUT_DIR at a folder to rehearse:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To play instead: `node serve.ts`, then visit http://localhost:8080
// and press ENTER to open the duel.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Ship the game tree and the screenshot set exactly as they stand.
mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The dossier, under the scorer's own limits: up to 4 screenshots of at
// most 256 KiB, up to 993 game files and 48 MiB in total, game paths of at
// most 1,000 bytes, and 160 KiB of text sampled per file.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
