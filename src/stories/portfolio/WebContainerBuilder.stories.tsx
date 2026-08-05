import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import WebContainerBuilder from '@/components/WebContainerBuilder';

const meta = {
  title: 'Portfolio/WebContainerBuilder',
  component: WebContainerBuilder,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A web-based code editor and builder powered by WebContainers. Enables running Node.js applications directly in the browser with full file system capabilities.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WebContainerBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default WebContainer builder with code editor and preview pane',
      },
    },
  },
};

export const WithStarterTemplate: Story = {
  args: {
    template: 'react-vite',
  },
  parameters: {
    docs: {
      description: {
        story: 'WebContainer initialized with a React + Vite starter template',
      },
    },
  },
};

export const SplitView: Story = {
  args: {
    layout: 'split',
  },
  parameters: {
    docs: {
      description: {
        story: 'Editor and preview in split-screen layout',
      },
    },
  },
};

export const DarkTheme: Story = {
  args: {
    theme: 'dark',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'WebContainer builder with dark theme for the code editor',
      },
    },
  },
};