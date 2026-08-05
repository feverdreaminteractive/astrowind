import type { StorybookConfig } from '@storybook-astro/framework';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../src/**/*.astro.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/**/*.astro.stories.mdx"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  framework: {
    name: "@storybook-astro/framework",
    options: {
      renderer: '@storybook-astro/renderer',
    },
  },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@': path.resolve(__dirname, '../src'),
          '@/components': path.resolve(__dirname, '../src/components'),
          '@/lib': path.resolve(__dirname, '../src/lib'),
          '@/styles': path.resolve(__dirname, '../src/styles'),
          '@/consts': path.resolve(__dirname, '../src/consts'),
        },
      },
    };
  },
};

export default config;