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
    plugins: [
      tailwindcss(),
      {
        name: 'webcontainer-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Add headers for WebContainer pages
            if (req.url === '/builder-pro' || req.url === '/test-figma') {
              res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
              res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            }
            next();
          });
        }
      }
    ],
    server: {
      proxy: {
        // Proxy Netlify functions to your deployed site for local development
        '/.netlify/functions': {
          target: 'https://ryanclayton.io',
          changeOrigin: true,
          secure: true,
        },
        // Proxy API calls to your deployed site
        // Temporarily disabled for local testing
        // '/api': {
        //   target: 'https://ryanclayton.io',
        //   changeOrigin: true,
        //   secure: true,
        // }
      }
    }
  },
});
