import type { Preview } from '@storybook/react-vite'
import * as React from 'react'
import '../src/styles/global.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0a0a0a',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
    docs: {
      theme: {
        base: 'dark',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen p-8" style={{ backgroundColor: 'oklch(0.09 0.01 265)', color: 'oklch(0.984 0.003 247.858)' }}>
        <Story />
      </div>
    ),
  ],
  globalTypes: {
    theme: {
      defaultValue: 'dark',
    },
  },
};

export default preview;