import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
// import sitemap from '@astrojs/sitemap';
// Re-enable sitemap once the production domain is set in `site` below.
// import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  // site: 'https://yourdomain.com',  // set your domain here to enable sitemap
  integrations: [
    react(),
    // sitemap(),
  ],
});
