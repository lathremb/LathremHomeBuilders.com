// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lathrem-home-builders-com.vercel.app',

  // Fully static. The contact form is a Vercel Function in /api, which
  // Vercel serves alongside the build without needing an adapter.
  output: 'static',

  build: {
    // Emit /about.html rather than /about/index.html so every existing URL
    // keeps working. Real inbound links and the sitemap both use .html.
    format: 'file',
  },

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
