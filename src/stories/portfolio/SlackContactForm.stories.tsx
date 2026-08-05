import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SlackContactForm from '@/components/SlackContactForm';

const meta = {
  title: 'Portfolio/SlackContactForm',
  component: SlackContactForm,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A contact form that sends messages directly to Slack. Supports standard form fields and integrates with Slack API for real-time message delivery.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SlackContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default contact form with all standard fields',
      },
    },
  },
};

export const WithCustomStyling: Story = {
  decorators: [
    (Story) => (
      <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Contact form with custom background styling',
      },
    },
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-responsive view of the contact form',
      },
    },
  },
};