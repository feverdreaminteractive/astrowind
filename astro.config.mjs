// @ts-check
import { defineConfig } from 'astro/config';
import { SITE_URL } from './src/consts';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import react from '@astrojs/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [react(), icon(), sitemap()],
  vite: {
    plugins: [
      tailwindcss(),
      {
        // Serves a pre-built `dist/storybook` snapshot at /storybook during
        // `astro dev`, since Storybook's dev server (npm run storybook) isn't
        // reverse-proxyable here — its static build's asset paths are relative
        // and only resolve correctly when actually served from a subpath, not
        // through a live proxy. Run `npm run build-storybook` to (re)generate
        // the snapshot; it won't hot-reload on component edits like the real
        // Storybook dev server on :6006 does.
        name: 'serve-storybook-static',
        configureServer(server) {
          const storybookDir = path.join(__dirname, 'dist/storybook');
          server.middlewares.use((req, res, next) => {
            if (!req.url || !req.url.startsWith('/storybook')) return next();

            if (req.url === '/storybook') {
              res.statusCode = 302;
              res.setHeader('Location', '/storybook/');
              res.end();
              return;
            }

            if (!fs.existsSync(storybookDir)) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/plain');
              res.end('No Storybook build found at dist/storybook. Run `npm run build-storybook` first.');
              return;
            }

            const urlPath = decodeURIComponent(req.url.replace(/^\/storybook\/?/, '').split('?')[0]) || 'index.html';
            let filePath = path.resolve(storybookDir, urlPath);

            if (!filePath.startsWith(storybookDir)) {
              res.statusCode = 403;
              res.end('Forbidden');
              return;
            }
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
              filePath = path.join(filePath, 'index.html');
            }
            if (!fs.existsSync(filePath)) {
              filePath = path.join(storybookDir, 'index.html');
            }

            res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath)] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
          });
        }
      },
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
