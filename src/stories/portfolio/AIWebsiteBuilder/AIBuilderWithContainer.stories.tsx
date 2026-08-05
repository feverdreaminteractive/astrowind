import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AIBuilderWithContainer from '@/components/AIWebsiteBuilder/AIBuilderWithContainer';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/AIBuilderWithContainer',
  component: AIBuilderWithContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AIBuilderWithContainer>;

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
