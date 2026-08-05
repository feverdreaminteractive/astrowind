import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import WebContainerBuilder from '@/components/AIWebsiteBuilder/WebContainerBuilder';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/WebContainerBuilder',
  component: WebContainerBuilder,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WebContainerBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <div className="dark" style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};
