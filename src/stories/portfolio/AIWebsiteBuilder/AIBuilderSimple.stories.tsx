import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AIBuilderSimple from '@/components/AIWebsiteBuilder/AIBuilderSimple';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/AIBuilderSimple',
  component: AIBuilderSimple,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AIBuilderSimple>;

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
