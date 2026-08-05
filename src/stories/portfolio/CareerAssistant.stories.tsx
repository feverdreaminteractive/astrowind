import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CareerAssistant from '@/components/CareerAssistant';

const meta = {
  title: 'Portfolio/CareerAssistant',
  component: CareerAssistant,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'An AI-powered career assistant that helps with resume building, interview preparation, and career guidance. Features conversational AI interface and personalized recommendations.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CareerAssistant>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default career assistant interface ready for interaction',
      },
    },
  },
};

export const WithInitialPrompt: Story = {
  args: {
    initialPrompt: 'Help me prepare for a software engineering interview',
  },
  parameters: {
    docs: {
      description: {
        story: 'Career assistant with a pre-filled prompt for interview preparation',
      },
    },
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Career assistant in dark mode theme',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8 min-h-screen">
        <Story />
      </div>
    ),
  ],
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile-responsive view optimized for smaller screens',
      },
    },
  },
};