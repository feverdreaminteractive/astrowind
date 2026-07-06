export const astroStarterTemplate = {
  name: 'astro-starter',
  files: [
    {
      name: 'package.json',
      type: 'file' as const,
      path: '/package.json',
      content: `{
  "name": "astro-project",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/tailwind": "^5.0.0",
    "astro": "^4.0.0",
    "tailwindcss": "^3.0.0"
  }
}`
    },
    {
      name: 'astro.config.mjs',
      type: 'file' as const,
      path: '/astro.config.mjs',
      content: `import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()]
});`
    },
    {
      name: 'src',
      type: 'folder' as const,
      path: '/src',
      children: [
        {
          name: 'pages',
          type: 'folder' as const,
          path: '/src/pages',
          children: [
            {
              name: 'index.astro',
              type: 'file' as const,
              path: '/src/pages/index.astro',
              content: `---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Welcome to Astro">
  <main>
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold mb-4">Welcome to Astro</h1>
      <p class="text-lg mb-4">
        To get started, edit <code class="bg-gray-100 px-2 py-1 rounded">src/pages/index.astro</code>
        and save to reload.
      </p>
      <a href="https://astro.build" class="text-blue-600 hover:underline">
        Learn Astro →
      </a>
    </div>
  </main>
</Layout>`
            },
            {
              name: 'about.astro',
              type: 'file' as const,
              path: '/src/pages/about.astro',
              content: `---
import Layout from '../layouts/Layout.astro';
---

<Layout title="About">
  <main>
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-4xl font-bold mb-4">About</h1>
      <p class="text-lg">This is the about page of your Astro site.</p>
    </div>
  </main>
</Layout>`
            }
          ]
        },
        {
          name: 'layouts',
          type: 'folder' as const,
          path: '/src/layouts',
          children: [
            {
              name: 'Layout.astro',
              type: 'file' as const,
              path: '/src/layouts/Layout.astro',
              content: `---
export interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Astro description" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body>
    <nav class="bg-gray-800 text-white p-4">
      <div class="container mx-auto flex justify-between items-center">
        <a href="/" class="text-xl font-bold">My Site</a>
        <div class="space-x-4">
          <a href="/" class="hover:text-gray-300">Home</a>
          <a href="/about" class="hover:text-gray-300">About</a>
        </div>
      </div>
    </nav>
    <slot />
  </body>
</html>`
            }
          ]
        },
        {
          name: 'components',
          type: 'folder' as const,
          path: '/src/components',
          children: [
            {
              name: 'Card.astro',
              type: 'file' as const,
              path: '/src/components/Card.astro',
              content: `---
export interface Props {
  title: string;
  body: string;
  href?: string;
}

const { href, title, body } = Astro.props;
---

<li class="link-card">
  <a href={href}>
    <h2>
      {title}
      <span>&rarr;</span>
    </h2>
    <p>
      {body}
    </p>
  </a>
</li>

<style>
  .link-card {
    list-style: none;
    display: flex;
    padding: 0.25rem;
    background-color: white;
    background-image: none;
    background-size: 400%;
    border-radius: 0.6rem;
    background-position: 100%;
    transition: background-position 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  }

  .link-card > a {
    width: 100%;
    text-decoration: none;
    line-height: 1.4;
    padding: 1rem 1.3rem;
    border-radius: 0.35rem;
    color: #111;
    background-color: white;
    opacity: 0.8;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    transition: color 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }

  p {
    margin-top: 0.5rem;
    margin-bottom: 0;
    color: #444;
  }

  .link-card:is(:hover, :focus-within) {
    background-position: 0;
    background-image: var(--accent-gradient);
  }

  .link-card:is(:hover, :focus-within) h2 {
    color: rgb(var(--accent));
  }
</style>`
            }
          ]
        },
        {
          name: 'styles',
          type: 'folder' as const,
          path: '/src/styles',
          children: [
            {
              name: 'global.css',
              type: 'file' as const,
              path: '/src/styles/global.css',
              content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: 124, 58, 237;
  --accent-gradient: linear-gradient(45deg, rgb(var(--accent)), #da62c4 30%, white 60%);
}

html {
  font-family: system-ui, sans-serif;
}

code {
  font-family: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
    Bitstream Vera Sans Mono, Courier New, monospace;
}`
            }
          ]
        }
      ]
    },
    {
      name: 'public',
      type: 'folder' as const,
      path: '/public',
      children: [
        {
          name: 'favicon.svg',
          type: 'file' as const,
          path: '/public/favicon.svg',
          content: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
  <path d="M50.4 78.5a75.1 75.1 0 0 0-28.5 6.9l24.2-65.7c.7-2 1.9-3.2 3.4-3.2h29c1.5 0 2.7 1.2 3.4 3.2l24.2 65.7s-11.6-7-28.5-7L67 45.5c-.4-1.7-1.6-2.8-2.9-2.8-1.3 0-2.5 1.1-2.9 2.7L50.4 78.5Zm-1.1 28.2Zm-4.2-20.2c-2 6.6-.6 15.8 4.2 20.2a17.5 17.5 0 0 1 .2-.7 5.5 5.5 0 0 1 5.7-4.5c2.8.1 4.3 1.5 4.7 4.7.2 1.1.2 2.3.2 3.5v.4c0 2.7.7 5.2 2.2 7.4a13 13 0 0 0 5.7 4.9v-.3l-.2-.3c-1.8-5.6-.5-9.5 4.4-12.8l1.5-1a73 73 0 0 0 3.2-2.2 16 16 0 0 0 6.8-11.4c.3-2 .1-4-.6-6l-.8.6-1.6 1a37 37 0 0 1-22.4 2.7c-5-.7-9.7-2-13.2-6.2Z" />
  <style>
    path { fill: #000; }
    @media (prefers-color-scheme: dark) {
      path { fill: #FFF; }
    }
  </style>
</svg>`
        }
      ]
    },
    {
      name: 'tsconfig.json',
      type: 'file' as const,
      path: '/tsconfig.json',
      content: `{
  "extends": "astro/tsconfigs/base",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}`
    },
    {
      name: 'tailwind.config.mjs',
      type: 'file' as const,
      path: '/tailwind.config.mjs',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`
    },
    {
      name: '.gitignore',
      type: 'file' as const,
      path: '/.gitignore',
      content: `# build output
dist/
.output/

# generated types
.astro/

# dependencies
node_modules/

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# environment variables
.env
.env.production

# macOS-specific files
.DS_Store`
    },
    {
      name: 'README.md',
      type: 'file' as const,
      path: '/README.md',
      content: `# Astro Starter Kit

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

\`\`\`
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
\`\`\`

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| \`npm install\`             | Installs dependencies                            |
| \`npm run dev\`             | Starts local dev server at \`localhost:4321\`      |
| \`npm run build\`           | Build your production site to \`./dist/\`          |
| \`npm run preview\`         | Preview your build locally, before deploying     |
| \`npm run astro ...\`       | Run CLI commands like \`astro add\`, \`astro check\` |

## 👀 Want to learn more?

Feel free to check [the documentation](https://docs.astro.build).`
    }
  ]
};