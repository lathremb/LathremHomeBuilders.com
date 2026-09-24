/* Vite emits every asset matched by import.meta.glob, whether a page renders
   it or not. Photo.astro globs the whole photo directory for ergonomics, so
   the build ends up carrying ~13MB of untouched originals that nothing links
   to - the <Picture> tags reference the generated AVIF/WebP/JPEG instead.

   This walks the built HTML, collects every filename actually referenced, and
   deletes the rest from _astro. It only ever removes files whose basename
   appears nowhere in the output, so it cannot break a live reference. */

import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, '_astro');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const textExts = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);
const referenced = walk(DIST)
  .filter((f) => textExts.has(extname(f).toLowerCase()))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

let removed = 0;
let bytes = 0;

for (const entry of readdirSync(ASSETS)) {
  if (referenced.includes(entry)) continue;
  const p = join(ASSETS, entry);
  bytes += statSync(p).size;
  unlinkSync(p);
  removed++;
}

const mb = (bytes / 1024 / 1024).toFixed(1);
console.log(
  removed
    ? `prune: removed ${removed} unreferenced asset(s), ${mb}MB`
    : 'prune: nothing to remove'
);
