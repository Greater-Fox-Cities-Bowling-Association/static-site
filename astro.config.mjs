import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import path from 'path';
// import sitemap from '@astrojs/sitemap';
// Re-enable sitemap once the production domain is set in `site` below.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'static',
  // site: 'https://yourdomain.com',  // set your domain here to enable sitemap
  integrations: [
    react(),
    // sitemap(),
  ],
  vite: {
    resolve: {
      alias: {
        '@cms': path.resolve(__dirname, 'cms'),
        '@src': path.resolve(__dirname, 'src'),
      },
    },
  },
});
