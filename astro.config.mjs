// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  /* The real domain. Every <link rel="canonical"> is derived from this in
     Base.astro, so this is the only place it should ever be written.
     Never point it at a deployment preview host: that tells Google the
     preview address is the real site, which is what went wrong before. */
  site: 'https://lathremhomebuilders.com',

  // Fully static. The contact form is a Vercel Function in /api, which
  // Vercel serves alongside the build without needing an adapter.
  output: 'static',

  build: {
    // Emit /about.html rather than /about/index.html so every existing URL
    // keeps working. Real inbound links and the sitemap both use .html.
    format: 'file',
  },

  /* The sitemap is written by scripts/generate-sitemap.mjs after the build,
     not by @astrojs/sitemap. The integration always emits an index plus a
     separate urlset, which for eight pages is indirection with no benefit,
     and it derives URLs from route names while ignoring build.format: 'file'
     so it listed /about for a page served at /about.html. Those URLs 404.
     The script reads the built HTML instead, so it cannot drift. */

  image: {
    // Sharp handles the AVIF/WebP generation at build time.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },

  /* 4338: LT Studio already runs Astro on 4321 (the default) and M1 Off Road
     uses 4330, so this project takes its own port to avoid a collision. */
  server: { port: 4338, host: true },
  preview: { port: 4338, host: true },

  devToolbar: { enabled: false },
});
