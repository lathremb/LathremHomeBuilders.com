// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  /* The real domain. Every <link rel="canonical"> is derived from this in
     Base.astro, and the sitemap integration builds its URLs from it too, so
     this is the only place it should ever be written.
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

  integrations: [
    sitemap({
      /* The integration derives URLs from route names and ignores
         build.format: 'file', so left alone it emits /about for a page that
         is actually served at /about.html. Those URLs 404, which is worse
         than having no sitemap at all. Put the extension back.

         The homepage is the exception: it stays the bare origin, matching
         both the canonical tag and what Google has indexed. */
      serialize(item) {
        const url = new URL(item.url);
        if (url.pathname === '/' || url.pathname.endsWith('.html')) {
          return item;
        }
        url.pathname = url.pathname.replace(/\/$/, '') + '.html';
        item.url = url.href;
        return item;
      },

      /* /index.php is a redirect, not a page. It has no business in a sitemap. */
      filter: (page) => !page.endsWith('/index.php'),
    }),
  ],

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
