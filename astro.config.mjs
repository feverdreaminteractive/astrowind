// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/consts';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [react(), icon(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
