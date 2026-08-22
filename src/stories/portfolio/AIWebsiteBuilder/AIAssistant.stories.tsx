import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AIAssistant from '@/components/AIWebsiteBuilder/AIAssistant';

const meta = {
  title: 'Portfolio/AIWebsiteBuilder/AIAssistant',
  component: AIAssistant,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    project: { name: 'demo-project', files: [] },
    setProject: () => {},
    selectedFile: null,
  },
  decorators: [
    // AIAssistant's root is h-full, which needs a height-bounded ancestor to
    // resolve — without one, its internal overflow-y-auto message list never
    // actually scrolls internally, so the mount-time scrollIntoView() drags
    // the whole Storybook page down instead.
    (Story) => (
      <div style={{ height: '640px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AIAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};