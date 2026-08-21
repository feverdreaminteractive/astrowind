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
  args: {
    project: { name: 'my-website', files: [] },
  },
} satisfies Meta<typeof Terminal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithFiles: Story = {
  args: {
    project: {
      name: 'my-website',
      files: [
        { name: 'index.html', type: 'file', path: '/index.html' },
        { name: 'styles.css', type: 'file', path: '/styles.css' },
        { name: 'script.js', type: 'file', path: '/script.js' },
      ],
    },
  },
};
