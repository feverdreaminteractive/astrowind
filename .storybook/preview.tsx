import type { Preview } from '@storybook/react-vite'
import * as React from 'react'
import '../src/styles/global.css'
import { theme } from './theme'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
    darkMode: {
      current: 'dark',
    },
    docs: {
      theme,
    },
  },
  decorators: [
    (Story) => (
      <div
        className="dark min-h-screen p-8"
        style={{
          backgroundColor: '#16171b',  /* primary-950 */
          color: '#fafafa',            /* primary-50 */
        }}
      >
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