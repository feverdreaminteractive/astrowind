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
} satisfies Meta<typeof PreviewPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    url: 'https://localhost:3000',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithError: Story = {
  args: {
    url: 'https://localhost:3000',
    error: 'Failed to load preview',
  },
};

export const MobileView: Story = {
  args: {
    url: 'https://localhost:3000',
    viewMode: 'mobile',
  },
};

export const TabletView: Story = {
  args: {
    url: 'https://localhost:3000',
    viewMode: 'tablet',
  },
};