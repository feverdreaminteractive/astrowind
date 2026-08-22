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
  decorators: [
    // AIAssistantEnhanced's root is h-full, which needs a height-bounded
    // ancestor to resolve — without one, its internal overflow-y-auto message
    // list never actually scrolls internally, so the mount-time
    // scrollIntoView() drags the whole Storybook page down instead.
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AIAssistantEnhanced>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <div className="dark" style={{ backgroundColor: '#0a0a0a', height: '100%', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};
