// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/consts';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [icon(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
