import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://your-domain.com', // TODO: Replace with your site URL
  integrations: [
    sitemap(),
    tailwind(),
  ],
  output: 'static',
});
