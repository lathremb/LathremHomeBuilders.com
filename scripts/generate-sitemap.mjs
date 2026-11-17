/* Writes a single flat dist/sitemap.xml.
 *
 * @astrojs/sitemap always emits an index (sitemap-index.xml) plus a urlset
 * (sitemap-0.xml), which for eight pages is indirection with no benefit: an
 * index exists so a site can split past the 50,000-URL limit. Serving
 * /sitemap.xml then needed a Vercel rewrite, which meant the file Search
 * Console was told about did not actually exist.
 *
 * Routes come from the built HTML rather than a hand-kept list, so the
 * sitemap cannot drift from what was actually deployed. The homepage is the
 * bare origin, matching its canonical tag; every other page keeps the .html
 * it is really served at, because build.format is 'file' and the
 * extensionless URL is a 404.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ORIGIN = 'https://lathremhomebuilders.com';

/* Pages that exist but should never be advertised to a crawler. A redirect
   stub or an error page is not a destination. */
const EXCLUDE = new Set(['404.html', '500.html']);

const isNoIndex = (html) =>
  /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);

const pages = readdirSync(DIST)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => !EXCLUDE.has(f))
  .filter((f) => !isNoIndex(readFileSync(join(DIST, f), 'utf8')))
  .sort();

if (pages.length === 0) {
  console.error('sitemap: no pages found in dist - refusing to write an empty sitemap');
  process.exit(1);
}

const toUrl = (file) =>
  file === 'index.html' ? `${ORIGIN}/` : `${ORIGIN}/${file}`;

const body = pages
  .map((f) => `  <url>\n    <loc>${toUrl(f)}</loc>\n  </url>`)
  .join('\n');

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  body +
  '\n</urlset>\n';

writeFileSync(join(DIST, 'sitemap.xml'), xml);

console.log(
  `sitemap: wrote dist/sitemap.xml with ${pages.length} URL(s), ` +
    `${statSync(join(DIST, 'sitemap.xml')).size} bytes`
);
