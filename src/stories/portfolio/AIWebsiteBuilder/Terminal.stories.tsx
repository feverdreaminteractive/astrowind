import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Terminal from '@/components/AIWebsiteBuilder/Terminal';
import { withPortfolioTheme } from '../../decorators/ThemeDecorator';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/Terminal',
  component: Terminal,
  decorators: [withPortfolioTheme],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Integrated terminal for running commands in the AI Website Builder.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Terminal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialCommand: '',
  },
};

export const WithOutput: Story = {
  args: {
    initialOutput: [
      '$ npm install',
      'added 125 packages in 3.2s',
      '$ npm run dev',
      'Server running at http://localhost:3000',
    ],
  },
};

export const Running: Story = {
  args: {
    isRunning: true,
    currentCommand: 'npm run build',
  },
};

export const WithError: Story = {
  args: {
    initialOutput: [
      '$ npm run build',
      'Error: Build failed',
      'Module not found: Cannot resolve "./missing-file"',
    ],
    hasError: true,
  },
};