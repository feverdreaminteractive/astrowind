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
} satisfies Meta<typeof AIAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInitialMessage: Story = {
  args: {
    initialMessage: 'Help me create a landing page',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};