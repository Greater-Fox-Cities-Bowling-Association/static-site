import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: import.meta.env.PUBLIC_SITE_URL ?? 'https://your-domain.com',
  integrations: [
    sitemap(),
    tailwind(),
  ],
  output: 'static',
});
