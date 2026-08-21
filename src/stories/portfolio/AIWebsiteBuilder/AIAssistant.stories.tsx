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
} satisfies Meta<typeof AIAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};