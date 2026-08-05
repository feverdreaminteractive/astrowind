import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SimpleBuilder from '@/components/SimpleBuilder';

const meta = {
  title: 'Portfolio/SimpleBuilder',
  component: SimpleBuilder,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A simplified website builder interface for creating basic web pages. Features drag-and-drop components, visual editing, and real-time preview.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SimpleBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default simple builder with empty canvas',
      },
    },
  },
};

export const WithTemplate: Story = {
  args: {
    template: 'landing-page',
  },
  parameters: {
    docs: {
      description: {
        story: 'Builder initialized with a landing page template',
      },
    },
  },
};

export const BlogTemplate: Story = {
  args: {
    template: 'blog',
  },
  parameters: {
    docs: {
      description: {
        story: 'Builder with blog post template',
      },
    },
  },
};

export const MobilePreview: Story = {
  args: {
    previewMode: 'mobile',
  },
  parameters: {
    docs: {
      description: {
        story: 'Builder in mobile preview mode',
      },
    },
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Builder in read-only mode for viewing without editing',
      },
    },
  },
};