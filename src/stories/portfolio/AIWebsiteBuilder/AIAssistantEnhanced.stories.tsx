import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AIAssistantEnhanced from '@/components/AIWebsiteBuilder/AIAssistantEnhanced';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/AIAssistantEnhanced',
  component: AIAssistantEnhanced,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    project: { name: 'demo-project', files: [] },
    setProject: () => {},
    selectedFile: null,
  },
} satisfies Meta<typeof AIAssistantEnhanced>;

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
