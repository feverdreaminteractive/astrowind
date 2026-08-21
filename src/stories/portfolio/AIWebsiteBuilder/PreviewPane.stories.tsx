import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PreviewPane from '@/components/AIWebsiteBuilder/PreviewPane';
import { withPortfolioTheme } from '../../decorators/ThemeDecorator';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/PreviewPane',
  component: PreviewPane,
  decorators: [withPortfolioTheme],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Live preview pane for the AI Website Builder. Shows real-time rendering of generated code.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    project: { name: 'my-website', files: [] },
  },
} satisfies Meta<typeof PreviewPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyProject: Story = {};

export const WithGeneratedSite: Story = {
  args: {
    project: {
      name: 'my-website',
      files: [
        {
          name: 'index.html',
          type: 'file',
          path: '/index.html',
          content: '<html><body><h1>Hello from the preview pane</h1></body></html>',
        },
        {
          name: 'styles.css',
          type: 'file',
          path: '/styles.css',
          content: 'body { font-family: sans-serif; }',
        },
      ],
    },
  },
};
